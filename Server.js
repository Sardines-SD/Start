const express = require("express");
const cors    = require("cors");
const path    = require("path");
const admin   = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorised – no token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorised – invalid or expired token" });
  }
}

async function getRole(uid) {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? doc.data().role : "user";
}

app.post("/api/requests", requireAuth, async (req, res) => {
  const { category, description } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: "Category and description are required" });
  }
  try {
    const docRef = await db.collection("requests").add({
      userId:      req.user.uid,
      userEmail:   req.user.email,
      category,
      description,
      status:      "pending",
      createdAt:   admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ id: docRef.id, message: "Request submitted successfully" });
  } catch (err) {
    console.error("Error saving request:", err);
    res.status(500).json({ error: "Failed to save request" });
  }
});

app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    const role = await getRole(req.user.uid);
    const canSeeAll = role === "admin" || role === "worker";
    let snapshot;
    if (canSeeAll) {
      snapshot = await db.collection("requests").get();
    } else {
      snapshot = await db.collection("requests").where("userId", "==", req.user.uid).get();
    }
    const requests = snapshot.docs
      .map(doc => ({ firestoreId: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toLocaleDateString("en-ZA") ?? "", _ts: doc.data().createdAt?.toMillis() ?? 0 }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...rest }, i) => ({ ...rest, id: i + 1 }));
    res.json(requests);
  } catch (err) {
    console.error("Error loading requests:", err);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

app.patch("/api/requests/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ["pending", "in-progress", "resolved"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin" && role !== "worker") {
      return res.status(403).json({ error: "Forbidden – workers and admins only" });
    }
    await db.collection("requests").doc(id).update({ status });
    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    const snapshot = await db.collection("users").get();
    const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate().toLocaleDateString("en-ZA") ?? "" }));
    res.json(users);
  } catch (err) {
    console.error("Error loading users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.patch("/api/users/:uid/role", requireAuth, async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;
  const validRoles = ["user", "worker", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role value" });
  }
  try {
    const requesterRole = await getRole(req.user.uid);
    if (requesterRole !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    await db.collection("users").doc(uid).update({ role });
    res.json({ message: `Role updated to ${role}` });
  } catch (err) {
    console.error("Error updating role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
