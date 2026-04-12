require('dotenv').config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const admin   = require("firebase-admin");

const serviceAccount = require("./serviceAccountKey.json");

// ── Firebase Admin init ───────────────────────────────────────────────────────
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ── Express setup ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

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

// ── POST /api/requests — submit a new service request ────────────────────────
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

// ── GET /api/requests — load requests ────────────────────────────────────────
// Admin sees ALL requests. Regular users see only their own.
// Sorting is done in JS to avoid needing a Firestore composite index.
const ADMIN_EMAIL =  process.env.ADMIN_EMAIL; // ← change to your admin email

app.get("/api/requests", requireAuth, async (req, res) => {
  try {
    const isAdmin = req.user.email === ADMIN_EMAIL;

    // Use a simple single-field query — no composite index required
    let snapshot;
    if (isAdmin) {
      snapshot = await db.collection("requests").get();
    } else {
      snapshot = await db.collection("requests")
        .where("userId", "==", req.user.uid)
        .get();
    }

    // Sort newest first in JavaScript instead of Firestore
    const requests = snapshot.docs
      .map((doc, i) => ({
        id:          i + 1,
        firestoreId: doc.id,
        ...doc.data(),
        createdAt:   doc.data().createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
        // keep raw timestamp for sorting
        _ts:         doc.data().createdAt?.toMillis() ?? 0,
      }))
      .sort((a, b) => b._ts - a._ts)
      .map(({ _ts, ...rest }, i) => ({ ...rest, id: i + 1 })); // re-number after sort

    res.json(requests);
  } catch (err) {
    console.error("Error loading requests:", err);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
