const express = require("express");
const cors    = require("cors");
const path    = require("path");
const admin   = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Firebase Admin init ───────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── Middleware: verify Firebase token ─────────────────────────────────────────
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

// ── Helper: get role from Firestore ──────────────────────────────────────────
async function getRole(uid) {
  const doc = await db.collection("users").doc(uid).get();
  return doc.exists ? doc.data().role : "user";
}

// =============================================================================
// REQUESTS
// =============================================================================

// ── POST /api/requests — any logged-in user submits a request ─────────────────
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

// ── GET /api/requests — users see own, workers/admins see all ─────────────────
app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    const role = await getRole(req.user.uid);
    const canSeeAll = role === "admin" || role === "worker";

    let snapshot;
    if (canSeeAll) {
      snapshot = await db.collection("requests").get();
    } else {
      snapshot = await db.collection("requests")
        .where("userId", "==", req.user.uid)
        .get();
    }

    const requests = snapshot.docs
      .map(doc => ({
        firestoreId: doc.id,
        ...doc.data(),
        createdAt:   doc.data().createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
        _ts:         doc.data().createdAt?.toMillis() ?? 0,
      }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...rest }, i) => ({ ...rest, id: i + 1 }));

    res.json(requests);
  } catch (err) {
    console.error("Error loading requests:", err);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// ── PATCH /api/requests/:id — workers and admins can update status ────────────
app.patch("/api/requests/:id", requireAuth, async (req, res) => {
  const { id }     = req.params;
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

// =============================================================================
// USERS — admin only
// =============================================================================

// ── GET /api/users — admin sees all registered users ─────────────────────────
app.get("/api/users", requireAuth, async (req, res) => {
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    const snapshot = await db.collection("users").get();
    const users    = snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
    }));
    res.json(users);
  } catch (err) {
    console.error("Error loading users:", err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

// ── PATCH /api/users/:uid/role — admin changes a user's role ─────────────────
app.patch("/api/users/:uid/role", requireAuth, async (req, res) => {
  const { uid }  = req.params;
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

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000 ;
app.listen(PORT, () => {
  
  console.log(`Server running on port ${PORT}`)  
});
