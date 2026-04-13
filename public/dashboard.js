import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const ROLE_REDIRECT = {
  admin:  "AdminDashboard.html",
  worker: "WorkerDashboard.html",
};

// ── Auth guard — always re-check role from Firestore ─────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "Login.html"; return; }

  // Always read fresh role from Firestore — catches role changes made externally
  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role    = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role); // keep localStorage in sync

  if (role !== "user") {
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
    const res   = await fetch("/api/requests", {
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

// ── Load own requests ─────────────────────────────────────────────────────────
async function loadRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='5'>Loading…</td></tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/requests", {
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
