const express = require("express");
const cors    = require("cors");
const path    = require("path");
const admin   = require("firebase-admin");

// For Azure: Use environment variable
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
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

// ── CREATE REQUEST (with optional image) ─────────────────────────────────────
app.post("/api/requests", requireAuth, async (req, res) => {
  const { category, description, image } = req.body;
  if (!category || !description) {
    return res.status(400).json({ error: "Category and description are required" });
  }

  if (image && image.length > 15 * 1024 * 1024) {
    return res.status(400).json({ error: "Image too large. Please use an image under 10MB." });
  }

  try {
    const requestData = {
      userId:    req.user.uid,
      userEmail: req.user.email,
      category,
      description,
      status:    "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (image && image !== "") {
      requestData.image = image;
    }

    const docRef = await db.collection("requests").add(requestData);
    res.status(201).json({ id: docRef.id, message: "Request submitted successfully" });
  } catch (err) {
    console.error("Error saving request:", err);
    res.status(500).json({ error: "Failed to save request" });
  }
});

// ── GET MY REQUESTS (citizen — own reports only) ──────────────────────────────
app.get("/api/requests/my", requireAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    const snapshot = await db.collection("requests")
      .where("userId", "==", req.user.uid).get();

    let requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        firestoreId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
        _ts:       data.createdAt?.toMillis() ?? 0,
        image:     data.image || null,
      };
    });

    if (status) requests = requests.filter(r => r.status === status);
    if (search) {
      const kw = search.toLowerCase();
      requests = requests.filter(r =>
        (r.description || "").toLowerCase().includes(kw) ||
        (r.category || "").toLowerCase().includes(kw)
      );
    }

    requests = requests
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...rest }, i) => ({ ...rest, id: i + 1 }));

    res.json(requests);
  } catch (err) {
    console.error("Error loading my requests:", err);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// ── GET ALL REQUESTS (admin/worker sees all, user sees own) ──────────────────
app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    const role      = await getRole(req.user.uid);
    const canSeeAll = role === "admin" || role === "worker";
    const { status, search } = req.query;
    let snapshot;

    if (canSeeAll) {
      snapshot = await db.collection("requests").get();
    } else {
      snapshot = await db.collection("requests")
        .where("userId", "==", req.user.uid).get();
    }

    let requests = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        firestoreId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
        _ts:       data.createdAt?.toMillis() ?? 0,
        image:     data.image || null,
      };
    });

    if (status) requests = requests.filter(r => r.status === status);
    if (search) {
      const kw = search.toLowerCase();
      requests = requests.filter(r =>
        (r.description || "").toLowerCase().includes(kw) ||
        (r.category || "").toLowerCase().includes(kw)
      );
    }

    requests = requests
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...rest }, i) => ({ ...rest, id: i + 1 }));

    res.json(requests);
  } catch (err) {
    console.error("Error loading requests:", err);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// ── UPDATE REQUEST STATUS ─────────────────────────────────────────────────────
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

// ── DELETE REQUEST (owner or admin only) ──────────────────────────────────────
app.delete("/api/requests/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    const role = await getRole(req.user.uid);
    if (docSnap.data().userId !== req.user.uid && role !== "admin") {
      return res.status(403).json({ error: "Forbidden – you can only delete your own reports" });
    }

    await docRef.delete();
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error("Error deleting request:", err);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

// ── GET ALL USERS (admin only) ────────────────────────────────────────────────
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

// ── UPDATE USER ROLE (admin only) ─────────────────────────────────────────────
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

// ── DELETE USER (admin only, direct deletion) ────────────────────────────────
app.delete("/api/users/:uid", requireAuth, async (req, res) => {
  const { uid } = req.params;
  
  try {
    const requesterRole = await getRole(req.user.uid);
    if (requesterRole !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    
    if (uid === req.user.uid) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    
    await admin.auth().deleteUser(uid);
    
    const userRequests = await db.collection("requests").where("userId", "==", uid).get();
    const batch = db.batch();
    userRequests.forEach(doc => batch.delete(doc.ref));
    
    const userRef = db.collection("users").doc(uid);
    batch.delete(userRef);
    
    await batch.commit();
    
    console.log(`User ${uid} deleted by admin ${req.user.uid}`);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user: " + err.message });
  }
});

// ── DELETE OWN ACCOUNT (User self-deletion - IMMEDIATE) ──────────────────────
app.delete("/api/me", requireAuth, async (req, res) => {
  const userId = req.user.uid;
  const userEmail = req.user.email;
  const { reason } = req.body;

  try {
    const userRequests = await db.collection("requests").where("userId", "==", userId).get();
    const batch = db.batch();
    userRequests.forEach(doc => batch.delete(doc.ref));
    
    const userRef = db.collection("users").doc(userId);
    batch.delete(userRef);
    
    await batch.commit();
    
    await admin.auth().deleteUser(userId);
    
    console.log(`User ${userEmail} deleted their own account. Reason: ${reason || "Not provided"}`);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("Error deleting own account:", err);
    res.status(500).json({ error: "Failed to delete account: " + err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});