import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBsGq_-mPlBAfCtEt3J-SzaMQgpKmHye9E",
  authDomain:        "municipality-50ae8.firebaseapp.com",
  projectId:         "municipality-50ae8",
  storageBucket:     "municipality-50ae8.firebasestorage.app",
  messagingSenderId: "904618138528",
  appId:             "1:904618138528:web:f4bd52b683fe6585dd62c5",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Role → correct dashboard (for guards)
const ROLE_REDIRECT = {
  admin:  "AdminDashboard.html",
  worker: "WorkerDashboard.html",
};

// ── Auth guard — users only ───────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.href = "Login.html";
    return;
  }
  const role = localStorage.getItem("role");
  if (role && role !== "user") {
    window.location.href = ROLE_REDIRECT[role] ?? "Login.html";
    return;
  }
  document.getElementById("welcomeMsg").textContent = "Welcome, " + user.email;
  loadRequests();
});

async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

window.logout = async function () {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "Login.html";
};

// ── Submit request ────────────────────────────────────────────────────────────
document.getElementById("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category    = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const feedback    = document.getElementById("requestFeedback");
  feedback.textContent = "Submitting…";

  try {
    const token = await getFreshToken();
    const res   = await fetch("http://localhost:5000/api/requests", {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body:    JSON.stringify({ category, description }),
    });
    if (!res.ok) { const e = await res.json(); feedback.textContent = "❌ " + (e.error ?? "Failed."); return; }
    feedback.textContent = "✅ Request submitted!";
    document.getElementById("requestForm").reset();
    loadRequests();
  } catch {
    feedback.textContent = "❌ Failed to submit. Please try again.";
  }
});

// ── Load own requests only ────────────────────────────────────────────────────
async function loadRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='5'>Loading…</td></tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("http://localhost:5000/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    if (!data.length) { table.innerHTML = "<tr><td colspan='5'>No requests yet.</td></tr>"; return; }
    table.innerHTML = data.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${r.category}</td>
        <td>${r.description}</td>
        <td>${r.status}</td>
        <td>${r.createdAt ?? ""}</td>
      </tr>`).join("");
  } catch {
    table.innerHTML = "<tr><td colspan='5'>❌ Failed to load requests.</td></tr>";
  }
}
