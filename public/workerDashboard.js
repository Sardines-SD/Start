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

let allRequests = [];

// ── Auth guard — workers only ─────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user || !user.emailVerified) {
    window.location.href = "Login.html";
    return;
  }
  const role = localStorage.getItem("role");
  if (role === "admin")  { window.location.href = "AdminDashboard.html"; return; }
  if (role === "user")   { window.location.href = "Dashboard.html";      return; }
  if (role !== "worker") { window.location.href = "Login.html";          return; }

  document.getElementById("welcomeMsg").textContent = "Welcome, " + user.email;
  loadAllRequests();
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

// ── Load all requests ─────────────────────────────────────────────────────────
async function loadAllRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("http://localhost:5000/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    allRequests = await res.json();
    renderTable(allRequests);
  } catch {
    table.innerHTML = "<tr><td colspan='7'>❌ Failed to load requests.</td></tr>";
  }
}

// ── Render table ──────────────────────────────────────────────────────────────
function renderTable(data) {
  const table = document.getElementById("requestsTable");
  if (!data.length) { table.innerHTML = "<tr><td colspan='7'>No requests found.</td></tr>"; return; }

  table.innerHTML = data.map(req => `
    <tr>
      <td>${req.id}</td>
      <td>${req.userEmail ?? "—"}</td>
      <td>${req.category}</td>
      <td>${req.description}</td>
      <td>${req.createdAt ?? "—"}</td>
      <td>
        <span class="badge badge-${req.status === "in-progress" ? "inprogress" : req.status}">
          ${req.status}
        </span>
      </td>
      <td>
        <select class="status-select" data-id="${req.firestoreId}" onchange="updateStatus(this)">
          <option value="">Change…</option>
          <option value="pending"     ${req.status === "pending"     ? "selected" : ""}>Pending</option>
          <option value="in-progress" ${req.status === "in-progress" ? "selected" : ""}>In Progress</option>
          <option value="resolved"    ${req.status === "resolved"    ? "selected" : ""}>Resolved</option>
        </select>
      </td>
    </tr>`).join("");
}

// ── Filter ────────────────────────────────────────────────────────────────────
window.filterRequests = function () {
  const s = document.getElementById("filterStatus").value;
  const c = document.getElementById("filterCategory").value;
  renderTable(allRequests.filter(r =>
    (!s || r.status === s) && (!c || r.category === c)
  ));
};

// ── Update status ─────────────────────────────────────────────────────────────
window.updateStatus = async function (selectEl) {
  const firestoreId = selectEl.dataset.id;
  const newStatus   = selectEl.value;
  if (!newStatus) return;

  try {
    const token = await getFreshToken();
    const res   = await fetch(`http://localhost:5000/api/requests/${firestoreId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body:    JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error();
    allRequests = allRequests.map(r =>
      r.firestoreId === firestoreId ? { ...r, status: newStatus } : r
    );
    window.filterRequests();
  } catch {
    alert("❌ Failed to update status. Please try again.");
  }
};
