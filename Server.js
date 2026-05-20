require("dotenv").config();
const fs   = require('fs');
const path = require('path');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');
const express = require("express");
const cors    = require("cors");

const admin   = require("firebase-admin");
const nodemailer = require("nodemailer");

const { canEscalateRequest, validateEscalationReason, buildEscalationPayload } = require("./app.js");

// For Azure: Use environment variable
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("ERROR: FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  process.exit(1);
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function reverseGeocode(lat, lon) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
    );

    const data = await response.json();

    return data.display_name || "Unknown location";
  } catch (err) {
    console.error("Reverse geocoding failed:", err);
    return "Unknown location";
  }
}

const db = admin.firestore();

let wardGeoJSON = null;
try {
  const wardPath = path.join(__dirname, 'public', 'data', 'sa-wards.geojson');
  wardGeoJSON = JSON.parse(fs.readFileSync(wardPath, 'utf8'));
  console.log(`✅ Loaded ${wardGeoJSON.features.length} ward boundaries`);
} catch (err) {
  console.error('❌ Failed to load ward GeoJSON:', err.message);
}

function getWardInfo(lat, lng) {
  if (!wardGeoJSON) return { ward: null, wardNo: null, municipality: null, province: null };
  const pt = point([lng, lat]);
  for (const feature of wardGeoJSON.features) {
    if (booleanPointInPolygon(pt, feature)) {
      return {
        ward:         feature.properties.WardLabel,
        wardNo:       feature.properties.WardNo,
        municipality: feature.properties.Municipali,
        province:     feature.properties.Province,
      };
    }
  }
  return { ward: null, wardNo: null, municipality: null, province: null };
}

// ── HELPER: Calculate distance between two coordinates in meters (Haversine formula) ──
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

// ── EMAIL TRANSPORTER ─────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── NEW: VERIFICATION EMAIL SENDER ────────────────────────────────────────────
async function sendVerificationEmail(toEmail, code, name = "") {
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg, #2b5fa8, #1a3f7a);padding:24px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">Municipal Service Portal</h1>
    </div>
    <div style="padding:32px">
      <h2 style="color:#2b5fa8;margin-top:0">Welcome${name ? ' ' + name : ''}!</h2>
      <p style="color:#374151;font-size:15px">Thank you for registering. Please use the verification code below to complete your registration:</p>
      
      <div style="text-align:center;padding:20px;margin:20px 0">
        <div style="font-size:36px;letter-spacing:10px;font-weight:bold;background:#f0f4f8;padding:15px;border-radius:8px;font-family:monospace;display:inline-block">
          ${code}
        </div>
      </div>
      
      <p style="color:#6b7280;font-size:14px">This code will expire in <strong>15 minutes</strong>.</p>
      <p style="color:#6b7280;font-size:14px">If you didn't create an account, you can safely ignore this email.</p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">Municipal Service Delivery Reporting Portal</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to:      toEmail,
    subject: "Verify Your Email - Municipal Service Portal",
    html,
  });
}

// ── STATUS EMAIL SENDER (existing) ───────────────────────────────────────────
const STATUS_LABELS = {
  "pending":     "Pending",
  "in-progress": "In Progress",
  "resolved":    "Resolved",
};

const STATUS_COLOURS = {
  "pending":     "#f59e0b",
  "in-progress": "#3b82f6",
  "resolved":    "#10b981",
};

async function sendStatusEmail(toEmail, report, newStatus) {
  const label  = STATUS_LABELS[newStatus]  ?? newStatus;
  const colour = STATUS_COLOURS[newStatus] ?? "#6b7280";

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#1d4ed8;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:22px">FixMyCity - Report Update</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px">Hello,</p>
      <p style="color:#374151;font-size:15px">Your report has been updated. Here are the details:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280;width:35%">Category<\/td>
          <td style="padding:10px 14px;color:#111827">${report.category}<\/td>
        <\/tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280">Description<\/td>
          <td style="padding:10px 14px;color:#111827">${report.description}<\/td>
        <\/tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280">New Status<\/td>
          <td style="padding:10px 14px">
            <span style="background:${colour};color:#fff;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600">
              ${label}
            </span>
          <\/td>
        <\/tr>
      <\/table>
      <p style="color:#6b7280;font-size:13px;margin-top:32px">
        You are receiving this email because you submitted a report on FixMyCity.<br>
        Please do not reply to this email.
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">FixMyCity Municipal Portal</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to:      toEmail,
    subject: `Your report status has been updated to: ${label}`,
    html,
  });
}

// ── ASSIGNMENT EMAIL SENDER (US3) ────────────────────────────────────────────
async function sendAssignmentEmail(toEmail, workerName, request, priority, assignedByName) {
  const priorityLabels = {
    low: "🟢 Low",
    medium: "🟡 Medium",
    high: "🔴 High"
  };
  
  const priorityText = priorityLabels[priority] || "Not set";
  const priorityColor = priority === "high" ? "#dc3545" : (priority === "medium" ? "#ffc107" : "#28a745");
  
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:linear-gradient(135deg, #2b5fa8, #1a3f7a);padding:24px 32px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:22px">New Request Assigned to You</h1>
    </div>
    <div style="padding:32px">
      <p style="color:#374151;font-size:15px">Hello ${workerName},</p>
      <p style="color:#374151;font-size:15px">A new service request has been assigned to you by ${assignedByName}.</p>
      
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280;width:35%">Category<\/td>
          <td style="padding:10px 14px;color:#111827">${request.category}<\/td>
         <\/tr>
        <tr>
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280">Description<\/td>
          <td style="padding:10px 14px;color:#111827">${request.description}<\/td>
         <\/tr>
        <tr style="background:#f9fafb">
          <td style="padding:10px 14px;font-weight:bold;color:#6b7280">Priority<\/td>
          <td style="padding:10px 14px">
            <span style="background:${priorityColor};color:#fff;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600">
              ${priorityText}
            </span>
          <\/td>
         <\/tr>
       <\/table>
      
      <p style="color:#6b7280;font-size:13px;margin-top:32px">
        Please log in to the Worker Dashboard to view and update this request.
      </p>
    </div>
    <div style="background:#f3f4f6;padding:16px 32px;text-align:center">
      <p style="color:#9ca3af;font-size:12px;margin:0">Municipal Service Delivery Portal</p>
    </div>
  </div>`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: `New Request Assigned: ${request.category} (${priorityText})`,
    html,
  });
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── NEW: SEND VERIFICATION EMAIL ENDPOINT ─────────────────────────────────────
app.post("/api/send-verification-email", async (req, res) => {
  const { email, code, name } = req.body;
  
  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }
  
  try {
    await sendVerificationEmail(email, code, name);
    res.json({ success: true, message: "Verification email sent" });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ── US3: DUPLICATE REQUEST DETECTION ───────────────────────────────────────────
app.post("/api/requests/check-duplicate", requireAuth, async (req, res) => {
  const { latitude, longitude, category } = req.body;
  
  if (latitude === undefined || longitude === undefined || !category) {
    return res.status(400).json({ 
      error: "Latitude, longitude, and category are required" 
    });
  }
  
  const RADIUS_METERS = 200;
  const DAYS_WINDOW = 7;
  
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAYS_WINDOW);
    
    const snapshot = await db.collection("requests")
      .where("category", "==", category)
      .get();
    
    const similarRequests = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (data.latitude === undefined || data.longitude === undefined) continue;
      if (data.status === "resolved") continue;
      
      const createdAt = data.createdAt?.toDate();
      if (createdAt && createdAt < cutoffDate) continue;
      
      const distance = calculateDistance(
        latitude, longitude,
        data.latitude, data.longitude
      );
      
      if (distance <= RADIUS_METERS) {
        similarRequests.push({
          id: doc.id,
          category: data.category,
          description: data.description.substring(0, 100),
          status: data.status,
          createdAt: data.createdAt?.toDate().toISOString() || null,
          distance: Math.round(distance),
          userEmail: data.userEmail
        });
      }
    }
    
    if (similarRequests.length > 0) {
      res.json({
        hasDuplicates: true,
        duplicates: similarRequests,
        message: `Found ${similarRequests.length} similar request(s) nearby.`
      });
    } else {
      res.json({
        hasDuplicates: false,
        duplicates: [],
        message: "No similar requests found nearby."
      });
    }
    
  } catch (err) {
    console.error("Duplicate check error:", err);
    res.status(500).json({ error: "Failed to check for duplicates" });
  }
});

// ── GET ALL WORKERS (admin only) ────────────────────────────────────────────
app.get("/api/workers", requireAuth, async (req, res) => {
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    
    const snapshot = await db.collection("users")
      .where("role", "==", "worker")
      .get();
    
    const workers = snapshot.docs.map(doc => ({
      uid: doc.id,
      email: doc.data().email,
      username: doc.data().username || doc.data().email.split('@')[0],
      ward: doc.data().ward || ""
    }));
    
    res.json(workers);
  } catch (err) {
    console.error("Error loading workers:", err);
    res.status(500).json({ error: "Failed to load workers" });
  }
});

// ── ASSIGN REQUEST TO WORKER (admin only) ────────────────────────────────────
app.patch("/api/requests/:id/assign", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { workerUid, priority } = req.body;
  
  if (!workerUid) {
    return res.status(400).json({ error: "Worker UID is required" });
  }
  
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    
    // Get worker details
    const workerDoc = await db.collection("users").doc(workerUid).get();
    if (!workerDoc.exists) {
      return res.status(404).json({ error: "Worker not found" });
    }
    
    const workerData = workerDoc.data();
    const workerEmail = workerData.email;
    const workerName = workerData.username || workerData.email.split('@')[0];
    
    // Get admin name for email
    const adminDoc = await db.collection("users").doc(req.user.uid).get();
    const adminName = adminDoc.exists ? (adminDoc.data().username || req.user.email.split('@')[0]) : "Admin";
    
    // Update the request
    const requestRef = db.collection("requests").doc(id);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    const updateData = {
      assignedTo: workerUid,
      assignedToEmail: workerEmail,
      assignedToName: workerName,
      assignedAt: admin.firestore.FieldValue.serverTimestamp(),
      priority: priority || "medium"
    };
    
    await requestRef.update(updateData);
    
    // Send email to worker
    const requestData = requestDoc.data();
    await sendAssignmentEmail(workerEmail, workerName, requestData, priority || "medium", adminName);
    
    res.json({ message: "Request assigned successfully" });
  } catch (err) {
    console.error("Error assigning request:", err);
    res.status(500).json({ error: "Failed to assign request: " + err.message });
  }
});

// ── UPDATE REQUEST PRIORITY (admin only) ─────────────────────────────────────
app.patch("/api/requests/:id/priority", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  const validPriorities = ["low", "medium", "high"];
  
  if (!validPriorities.includes(priority)) {
    return res.status(400).json({ error: "Invalid priority value. Use low, medium, or high" });
  }
  
  try {
    const role = await getRole(req.user.uid);
    if (role !== "admin") {
      return res.status(403).json({ error: "Forbidden – admins only" });
    }
    
    const requestRef = db.collection("requests").doc(id);
    const requestDoc = await requestRef.get();
    
    if (!requestDoc.exists) {
      return res.status(404).json({ error: "Request not found" });
    }
    
    await requestRef.update({ priority });
    res.json({ message: "Priority updated successfully" });
  } catch (err) {
    console.error("Error updating priority:", err);
    res.status(500).json({ error: "Failed to update priority" });
  }
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
  const { category, description, image, latitude, longitude } = req.body;
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
      status:    'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (latitude !== undefined && longitude !== undefined) {
      requestData.latitude     = latitude;
      requestData.longitude    = longitude;
      const wardInfo           = getWardInfo(latitude, longitude);
      requestData.ward         = wardInfo.ward;
      requestData.wardNo       = wardInfo.wardNo;
      requestData.municipality = wardInfo.municipality;
      requestData.province     = wardInfo.province;
      const address = await reverseGeocode(latitude, longitude);
      requestData.address = address;
    }

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

//Public APi route
app.get("/api/public/requests", async (req, res) => {
  try {
    const snapshot = await db.collection("requests").get();

    const requests = snapshot.docs.map(doc => {
      const data = doc.data();

      return {
        id: doc.id,
        category: data.category || "",
        description: data.description || "",
        status: data.status || "pending",
        ward: data.ward || "",
        municipality: data.municipality || "",
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        createdAt: data.createdAt?.toDate().toLocaleDateString("en-ZA") ?? "",
        escalated: data.escalated || false,
      };
    });

    res.json(requests);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load public requests" });
  }
});

// ── CLAIM REQUEST (worker accepts an admin-assigned request) ──────────────────
app.post("/api/requests/:id/claim", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const role = await getRole(req.user.uid);
    if (role !== "worker") {
      return res.status(403).json({ error: "Forbidden – workers only" });
    }

    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = docSnap.data();

    // Must have been assigned to this specific worker by admin
    if (data.assignedTo !== req.user.uid) {
      return res.status(403).json({ error: "This request was not assigned to you" });
    }

    // Already claimed
    if (data.claimedAt) {
      return res.status(400).json({ error: "You have already accepted this request" });
    }

    await docRef.update({
      status:    "in-progress",
      claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Request accepted successfully" });
  } catch (err) {
    console.error("Error claiming request:", err);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

// ── UNCLAIM REQUEST ───────────────────────────────────────────
// Allows the assigned worker to release a request back to the unassigned pool.
// The request status reverts to "pending" and claimedAt / assignedTo are cleared.
app.post("/api/requests/:id/unclaim", requireAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const role = await getRole(req.user.uid);
    if (role !== "worker") {
      return res.status(403).json({ error: "Forbidden – workers only" });
    }

    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = docSnap.data();

    if (!data.claimedAt) {
      return res.status(400).json({ error: "This request has not been claimed" });
    }
    if (data.assignedTo !== req.user.uid) {
      return res.status(403).json({ error: "You can only release requests you have claimed" });
    }
    if (data.status === "resolved") {
      return res.status(400).json({ error: "Resolved requests cannot be unclaimed" });
    }

    await docRef.update({
      assignedTo:  null,
      claimedAt:   null,
      status:      "pending",
      unclaimedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`Request ${id} released by worker ${req.user.uid}`);
    res.json({ message: "Request released back to the pool" });

  } catch (err) {
    console.error("Error unclaiming request:", err);
    res.status(500).json({ error: "Failed to release request" });
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

    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Report not found" });
    }

    if (docSnap.data().status === "resolved") {
      return res.status(400).json({ error: "This request is resolved and cannot be changed." });
    }

    await docRef.update({ status });

    // ── Send email notification to the reporter ──────────────────────────────
    const report = docSnap.data();
    if (report.userEmail) {
      sendStatusEmail(report.userEmail, report, status)
        .then(() => console.log(`Status email sent to ${report.userEmail} [status: ${status}]`))
        .catch(err  => console.error("Failed to send status email:", err.message));
    }

    res.json({ message: "Status updated successfully" });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── ESCALATE REQUEST (owner only) ─────────────────────────────────────────────
app.post("/api/requests/:id/escalate", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const report = docSnap.data();

    const canEscalate = canEscalateRequest(report, req.user.uid);
    if (!canEscalate.valid) {
      return res.status(403).json({ error: canEscalate.error });
    }

    const reasonValidation = validateEscalationReason(reason);
    if (!reasonValidation.valid) {
      return res.status(400).json({ error: reasonValidation.error });
    }

    const payload = buildEscalationPayload(reason);
    await docRef.update(payload);

    res.json({ message: "Request escalated successfully" });
  } catch (err) {
    console.error("Error escalating request:", err);
    res.status(500).json({ error: "Failed to escalate request" });
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

// ── SUBMIT SATISFACTION FEEDBACK (resident only) ──────────────────────────────
app.post("/api/requests/:id/feedback", requireAuth, async (req, res) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
    return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
  }

  try {
    const docRef  = db.collection("requests").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return res.status(404).json({ error: "Request not found" });
    }

    const data = docSnap.data();

    if (data.userId !== req.user.uid) {
      return res.status(403).json({ error: "Forbidden – only the original requester can leave feedback" });
    }

    if (data.status !== "resolved") {
      return res.status(400).json({ error: "Feedback can only be submitted for resolved requests" });
    }

    if (data.feedbackSubmitted === true) {
      return res.status(400).json({ error: "Feedback has already been submitted for this request" });
    }

    await docRef.update({
      feedbackRating:    Number(rating),
      feedbackComment:   comment || "",
      feedbackSubmitted: true,
      feedbackAt:        admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ message: "Feedback submitted successfully" });
  } catch (err) {
    console.error("Error saving feedback:", err);
    res.status(500).json({ error: "Failed to save feedback" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});