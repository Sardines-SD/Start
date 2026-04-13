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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let allRequests = [];

// ── Auth guard — always re-check role from Firestore ─────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "Login.html"; return; }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role    = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role);

  if (role === "worker") { window.location.href = "WorkerDashboard.html"; return; }
  if (role === "user")   { window.location.href = "Dashboard.html";       return; }
  if (role !== "admin")  { window.location.href = "Login.html";           return; }

  document.getElementById("welcomeMsg").textContent = "Admin: " + user.email;
  loadAllRequests();
  loadAllUsers();
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

window.switchTab = function (tab) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  event.target.classList.add("active");
};

// ── Requests ──────────────────────────────────────────────────────────────────
async function loadAllRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='7'>Loading…</td></tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    allRequests = await res.json();
    updateStats(allRequests);
    renderRequestsTable(allRequests);
  } catch {
    table.innerHTML = "<tr><td colspan='7'>❌ Failed to load requests.</td></tr>";
  }
}

function renderRequestsTable(data) {
  const table = document.getElementById("requestsTable");
  if (!data.length) { table.innerHTML = "<tr><td colspan='7'>No requests found.</td></tr>"; return; }
  table.innerHTML = data.map(req => `
    <tr>
      <td>${req.id}</td>
      <td>${req.userEmail ?? "—"}</td>
      <td>${req.category}</td>
      <td>${req.description}</td>
      <td>${req.createdAt ?? "—"}</td>
      <td><span class="badge badge-${req.status === "in-progress" ? "inprogress" : req.status}">${req.status}</span></td>
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

function updateStats(data) {
  document.getElementById("totalCount").textContent      = data.length;
  document.getElementById("pendingCount").textContent    = data.filter(r => r.status === "pending").length;
  document.getElementById("inprogressCount").textContent = data.filter(r => r.status === "in-progress").length;
  document.getElementById("resolvedCount").textContent   = data.filter(r => r.status === "resolved").length;
}

window.filterRequests = function () {
  const s = document.getElementById("filterStatus").value;
  const c = document.getElementById("filterCategory").value;
  renderRequestsTable(allRequests.filter(r => (!s || r.status === s) && (!c || r.category === c)));
};

window.updateStatus = async function (selectEl) {
  const firestoreId = selectEl.dataset.id;
  const newStatus   = selectEl.value;
  if (!newStatus) return;
  try {
    const token = await getFreshToken();
    const res   = await fetch(`/api/requests/${firestoreId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body:    JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error();
    allRequests = allRequests.map(r => r.firestoreId === firestoreId ? { ...r, status: newStatus } : r);
    updateStats(allRequests);
    window.filterRequests();
  } catch {
    alert("❌ Failed to update status.");
  }
};

// ── Users ─────────────────────────────────────────────────────────────────────
async function loadAllUsers() {
  const table = document.getElementById("usersTable");
  table.innerHTML = "<tr><td colspan='5'>Loading…</td></tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/users", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const users = await res.json();
    document.getElementById("userCount").textContent = users.length;
    if (!users.length) { table.innerHTML = "<tr><td colspan='5'>No users found.</td></tr>"; return; }
    table.innerHTML = users.map(u => `
      <tr>
        <td>${u.username ?? "—"}</td>
        <td>${u.email}</td>
        <td>${u.ward ?? "—"}</td>
        <td><span class="badge badge-${u.role}">${u.role}</span></td>
        <td>
          <select class="role-select" data-uid="${u.uid}" onchange="updateRole(this)">
            <option value="">Change…</option>
            <option value="user"   ${u.role === "user"   ? "selected" : ""}>User</option>
            <option value="worker" ${u.role === "worker" ? "selected" : ""}>Municipal Worker</option>
            <option value="admin"  ${u.role === "admin"  ? "selected" : ""}>Admin</option>
          </select>
        </td>
      </tr>`).join("");
  } catch {
    table.innerHTML = "<tr><td colspan='5'>❌ Failed to load users.</td></tr>";
  }
}

window.updateRole = async function (selectEl) {
  const uid     = selectEl.dataset.uid;
  const newRole = selectEl.value;
  if (!newRole) return;
  if (!confirm(`Change this user's role to "${newRole}"?`)) { selectEl.value = ""; return; }
  try {
    const token = await getFreshToken();
    const res   = await fetch(`/api/users/${uid}/role`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body:    JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error();
    alert("✅ Role updated. The user will see the change on their next login.");
    loadAllUsers();
  } catch {
    alert("❌ Failed to update role.");
  }
};
