import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";
/*const firebaseConfig = {
  apiKey:            "AIzaSyBsGq_-mPlBAfCtEt3J-SzaMQgpKmHye9E",
  authDomain:        "municipality-50ae8.firebaseapp.com",
  projectId:         "municipality-50ae8",
  storageBucket:     "municipality-50ae8.firebasestorage.app",
  messagingSenderId: "904618138528",
  appId:             "1:904618138528:web:f4bd52b683fe6585dd62c5",
};
*/

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ── Auth guard ────────────────────────────────────────────────────────────────
// Waits for Firebase to confirm the session before doing anything.
// If no user is signed in, redirect to login immediately.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "Login.html";
    return;
  }
  // Always refresh the token (tokens expire after 1 hour)
  const freshToken = await user.getIdToken(true);
  localStorage.setItem("idToken", freshToken);
  loadRequests();
});

// ── Helper: attach token to every API call ────────────────────────────────────
function authHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `Bearer ${localStorage.getItem("idToken")}`,
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────
window.logout = async function () {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "Login.html";
};

// ── Submit a new service request ──────────────────────────────────────────────
document.getElementById("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const category    = document.getElementById("category").value;
  const description = document.getElementById("description").value;
  const feedback    = document.getElementById("requestFeedback");

  feedback.textContent = "Submitting…";

  try {
    const res = await fetch("http://localhost:5000/api/requests", {
      method:  "POST",
      headers: authHeaders(),
      body:    JSON.stringify({ category, description }),
    });

    if (!res.ok) throw new Error();

    feedback.textContent = "✅ Request submitted!";
    document.getElementById("requestForm").reset();
    loadRequests();
  } catch {
    feedback.textContent = "❌ Failed to submit. Please try again.";
  }
});

// ── Load and display requests ─────────────────────────────────────────────────
async function loadRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='4'>Loading…</td></tr>";

  try {
    const res  = await fetch("http://localhost:5000/api/requests", {
      headers: authHeaders(),
    });
    const data = await res.json();

    if (!data.length) {
      table.innerHTML = "<tr><td colspan='4'>No requests yet.</td></tr>";
      return;
    }

    table.innerHTML = data.map(req => `
      <tr>
        <td>${req.id}</td>
        <td>${req.category}</td>
        <td>${req.description}</td>
        <td>${req.status}</td>
      </tr>
    `).join("");
  } catch {
    table.innerHTML = "<tr><td colspan='4'>❌ Failed to load requests.</td></tr>";
  }
}
