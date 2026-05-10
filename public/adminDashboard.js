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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let allRequests = [];
let currentAdminId = null;
let workersList = [];
let selectedRequestId = null;

// Auth guard - always re-check role from Firestore
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role);
  currentAdminId = user.uid;

  if (role === "worker") {
    window.location.href = "WorkerDashboard.html";
    return;
  }
  if (role === "user") {
    window.location.href = "Dashboard.html";
    return;
  }
  if (role !== "admin") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcomeMsg").textContent = "Admin: " + user.email;
  await loadWorkers();
  loadAllRequests();
  loadAllUsers();
});

async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

window.logout = async function () {
  try {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "index.html";
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "index.html";
  }
};

// ── LOGOUT BUTTON ESCAPE ANIMATION ───────────────────────────────────────────
let logoutClickCount = 0;

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutClickCount++;

    if (logoutClickCount === 1) {
      logoutBtn.style.transform = "translate(120px,80px)";
    } else if (logoutClickCount === 2) {
      logoutBtn.style.transform = "translate(0px,0px)";
    } else {
      await logout();
    }
  });
}

// ── TAB SWITCH FUNCTION ─────────────────────────────────────────────────────
window.switchTab = function (tab, btn) {
  const requestsPanel = document.getElementById("tab-requests");
  const usersPanel = document.getElementById("tab-users");
  const analyticsPanel = document.getElementById("tab-analytics");
  
  if (requestsPanel) requestsPanel.classList.remove("active");
  if (usersPanel) usersPanel.classList.remove("active");
  if (analyticsPanel) analyticsPanel.classList.remove("active");
  
  if (tab === "requests") {
    if (requestsPanel) requestsPanel.classList.add("active");
  } else if (tab === "users") {
    if (usersPanel) usersPanel.classList.add("active");
  } else if (tab === "analytics") {
    if (analyticsPanel) analyticsPanel.classList.add("active");
    renderAllReports();
  }
  
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
};

// ── LOAD WORKERS ────────────────────────────────────────────────────────────
async function loadWorkers() {
  try {
    const token = await getFreshToken();
    const res = await fetch("/api/workers", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });
    
    if (res.ok) {
      workersList = await res.json();
      console.log("Workers loaded:", workersList.length);
    } else {
      console.error("Failed to load workers:", res.status);
      workersList = [];
    }
  } catch (error) {
    console.error("Error loading workers:", error);
    workersList = [];
  }
}

// ── RENDER REQUEST LIST (LEFT PANEL) ────────────────────────────────────────
function renderRequestList() {
  const container = document.getElementById("requestList");
  const searchTerm = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";
  const categoryFilter = document.getElementById("filterCategory")?.value || "";

  let filtered = allRequests.filter(r => {
    const matchesSearch = !searchTerm || 
      (r.userEmail || "").toLowerCase().includes(searchTerm) ||
      (r.category || "").toLowerCase().includes(searchTerm) ||
      (r.description || "").toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || r.status === statusFilter;
    const matchesCategory = !categoryFilter || r.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No requests found.</div>';
    return;
  }

  container.innerHTML = filtered.map(req => {
    const priorityClass = req.priority === 'high' ? 'priority-high' : (req.priority === 'medium' ? 'priority-medium' : 'priority-low');
    const priorityText = req.priority ? req.priority.toUpperCase() : 'Not set';
    const statusClass = req.status === 'pending' ? 'badge-pending' : (req.status === 'in-progress' ? 'badge-inprogress' : 'badge-resolved');
    
    return `
      <div class="request-item ${selectedRequestId === req.firestoreId ? 'selected' : ''}" data-id="${req.firestoreId}">
        <div class="request-title">
          <span class="request-id">#${escapeHtml(req.id)}</span>
          <span class="badge ${priorityClass}">${priorityText}</span>
        </div>
        <div class="request-category"><strong>${escapeHtml(req.category)}</strong></div>
        <div class="request-desc">${escapeHtml(req.description.substring(0, 80))}${req.description.length > 80 ? '...' : ''}</div>
        <div class="request-meta">
          <span>👤 ${escapeHtml(req.userEmail?.split('@')[0] || '-')}</span>
          <span class="badge ${statusClass}">${escapeHtml(req.status)}</span>
          <span>📅 ${escapeHtml(req.createdAt || '-')}</span>
        </div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".request-item").forEach(el => {
    el.addEventListener("click", () => {
      const id = el.dataset.id;
      selectRequest(id);
    });
  });
}

// ── SELECT AND DISPLAY REQUEST DETAILS (RIGHT PANEL) ────────────────────────
async function selectRequest(firestoreId) {
  selectedRequestId = firestoreId;
  renderRequestList();

  const request = allRequests.find(r => r.firestoreId === firestoreId);
  if (!request) return;

  const hasImage = request.image && request.image !== "" && request.image !== null;
  const imageHtml = hasImage 
    ? `<img src="${escapeHtml(request.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(request.image)}')" alt="Proof image" title="Click to enlarge">`
    : '<span class="no-image">No image uploaded</span>';

  const feedbackHtml = request.status === 'resolved' && request.feedbackSubmitted
    ? `<span class="feedback-stars">${'★'.repeat(request.feedbackRating || 0)}${'☆'.repeat(5 - (request.feedbackRating || 0))}</span> ${request.feedbackComment ? `<br><small>${escapeHtml(request.feedbackComment)}</small>` : ''}`
    : request.status === 'resolved' ? '<span class="no-image">Awaiting feedback</span>' : '<span class="no-image">Not resolved yet</span>';

  const workerOptions = workersList.map(w => 
    `<option value="${w.uid}" ${request.assignedTo === w.uid ? 'selected' : ''}>${escapeHtml(w.username || w.email)}</option>`
  ).join('');

  // Priority dropdown with "— Select Priority —" as default
  const priorityOptions = `
    <option value="" ${!request.priority ? 'selected' : ''}> Select Priority </option>
    <option value="low" ${request.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
    <option value="medium" ${request.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
    <option value="high" ${request.priority === 'high' ? 'selected' : ''}>🔴 High</option>
  `;

  const detailCard = document.getElementById("detailCard");
  detailCard.innerHTML = `
    <h2>Request #${escapeHtml(request.id)} Details</h2>
    
    <div class="info-row">
      <div class="label">User:</div>
      <div class="info-value">${escapeHtml(request.userEmail || '-')}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Category:</div>
      <div class="info-value">${escapeHtml(request.category)}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Description:</div>
      <div class="info-value">${escapeHtml(request.description)}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Ward / Municipality:</div>
      <div class="info-value">${request.ward || 'Unknown'} / ${request.municipality || 'Unknown'}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Address:</div>
      <div class="info-value">${escapeHtml(request.address || 'Not available')}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Location:</div>
      <div class="info-value">${request.latitude && request.longitude ? `<a href="https://maps.google.com/?q=${request.latitude},${request.longitude}" target="_blank">📍 View on Google Maps</a>` : 'Not available'}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Proof Image:</div>
      <div class="info-value">${imageHtml}</div>
    </div>
    
    <div class="info-row">
      <div class="label">Citizen Feedback:</div>
      <div class="info-value">${feedbackHtml}</div>
    </div>
    
    <div class="controls">
      <select id="statusSelect-${firestoreId}">
        <option value="pending" ${request.status === "pending" ? "selected" : ""}>Pending</option>
        <option value="in-progress" ${request.status === "in-progress" ? "selected" : ""}>In Progress</option>
        <option value="resolved" ${request.status === "resolved" ? "selected" : ""}>Resolved</option>
      </select>
      
      <select id="prioritySelect-${firestoreId}">
        ${priorityOptions}
      </select>
      
      <select id="workerSelect-${firestoreId}">
        <option value="">Assign to Worker...</option>
        ${workerOptions}
      </select>
      
      <button onclick="saveRequestChanges('${firestoreId}')">Save Changes</button>
    </div>
  `;
}

// ── SAVE REQUEST CHANGES ─────────────────────────────────────────────────────
window.saveRequestChanges = async function(firestoreId) {
  const statusSelect = document.getElementById(`statusSelect-${firestoreId}`);
  const prioritySelect = document.getElementById(`prioritySelect-${firestoreId}`);
  const workerSelect = document.getElementById(`workerSelect-${firestoreId}`);
  
  const newStatus = statusSelect ? statusSelect.value : null;
  const newPriority = prioritySelect ? prioritySelect.value : null;
  const workerUid = workerSelect ? workerSelect.value : null;
  
  try {
    const token = await getFreshToken();
    
    if (newPriority && newPriority !== "") {
      const priorityRes = await fetch(`/api/requests/${firestoreId}/priority`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!priorityRes.ok) throw new Error("Priority update failed");
    }
    
    if (newStatus) {
      const statusRes = await fetch(`/api/requests/${firestoreId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!statusRes.ok) throw new Error("Status update failed");
    }
    
    if (workerUid) {
      const assignPriority = newPriority && newPriority !== "" ? newPriority : "medium";
      const assignRes = await fetch(`/api/requests/${firestoreId}/assign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ workerUid: workerUid, priority: assignPriority }),
      });
      if (!assignRes.ok) {
        const err = await assignRes.json();
        throw new Error(err.error || "Assignment failed");
      }
      alert("Request assigned successfully! Worker has been notified by email.");
    } else {
      alert("Changes saved successfully!");
    }
    
    await loadAllRequests();
    await loadAllUsers();
    selectRequest(firestoreId);
  } catch (error) {
    console.error("Save error:", error);
    alert("Failed to save changes: " + error.message);
  }
};

// ── UPDATE STATS CARDS ──────────────────────────────────────────────────────
function updateStats(data) {
  document.getElementById("totalCount").textContent = data.length;
  document.getElementById("pendingCount").textContent = data.filter(r => r.status === "pending").length;
  document.getElementById("inprogressCount").textContent = data.filter(r => r.status === "in-progress").length;
  document.getElementById("resolvedCount").textContent = data.filter(r => r.status === "resolved").length;
}

// ── LOAD ALL REQUESTS ───────────────────────────────────────────────────────
async function loadAllRequests() {
  try {
    const token = await getFreshToken();
    const res = await fetch("/api/requests", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    if (!res.ok) throw new Error();

    allRequests = await res.json();
    updateStats(allRequests);
    renderRequestList();
  } catch (error) {
    console.error("Error loading requests:", error);
    document.getElementById("requestList").innerHTML = '<div class="empty-state">Failed to load requests.</div>';
  }
}

// ── FILTER EVENT LISTENERS ──────────────────────────────────────────────────
const searchInput = document.getElementById("searchInput");
const filterStatus = document.getElementById("filterStatus");
const filterCategory = document.getElementById("filterCategory");

if (searchInput) searchInput.addEventListener("input", () => renderRequestList());
if (filterStatus) filterStatus.addEventListener("change", () => renderRequestList());
if (filterCategory) filterCategory.addEventListener("change", () => renderRequestList());

// ── LOAD ALL USERS (MANAGE USERS TAB) ───────────────────────────────────────
async function loadAllUsers() {
  const table = document.getElementById("usersTable");
  if (!table) return;
  
  table.innerHTML = "<td><td colspan='7'>Loading...";

  try {
    const token = await getFreshToken();
    const res = await fetch("/api/users", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    if (!res.ok) throw new Error();

    const users = await res.json();
    document.getElementById("userCount").textContent = users.length;

    if (!users.length) {
      table.innerHTML = "<tr><td colspan='7'>No users found.";
      return;
    }

    table.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.username ?? "-")}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${u.ward || '-'}</td>
        <td>${u.municipality || '-'}</td>
        <td><span class="badge badge-${escapeHtml(u.role)}">${escapeHtml(u.role)}</span></td>
        <td>
          <select class="role-select" data-uid="${escapeHtml(u.uid)}" onchange="updateRole(this)">
            <option value="">Change...</option>
            <option value="user" ${u.role === "user" ? "selected" : ""}>User</option>
            <option value="worker" ${u.role === "worker" ? "selected" : ""}>Municipal Worker</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>Admin</option>
          </select>
        </td>
        <td>
          <button class="delete-user-btn" onclick="deleteUserDirect('${escapeHtml(u.uid)}', '${escapeHtml(u.email)}')" ${u.uid === currentAdminId ? 'disabled' : ''}>
            ${u.uid === currentAdminId ? 'Cannot delete self' : 'Delete'}
          </button>
        </td>
      </tr>
    `).join("");
  } catch {
    table.innerHTML = "<tr><td colspan='7'>Failed to load users.";
    document.getElementById("userCount").textContent = "Error";
  }
}

// ── UPDATE USER ROLE ────────────────────────────────────────────────────────
window.updateRole = async function (selectEl) {
  const uid = selectEl.dataset.uid;
  const newRole = selectEl.value;
  if (!newRole) return;

  if (!confirm(`Change this user's role to "${newRole}"?`)) {
    selectEl.value = "";
    return;
  }

  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/users/${uid}/role`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ role: newRole }),
    });

    if (!res.ok) throw new Error();

    alert("Role updated. The user will see the change on their next login.");
    loadAllUsers();
    loadWorkers();
  } catch {
    alert("Failed to update role.");
  }
};

// ── DELETE USER DIRECT ──────────────────────────────────────────────────────
window.deleteUserDirect = async function (uid, email) {
  if (uid === currentAdminId) {
    alert("You cannot delete your own account.");
    return;
  }

  if (!confirm(`WARNING: Are you sure you want to permanently delete user "${email}"? This action CANNOT be undone!`)) {
    return;
  }

  const passwordConfirm = prompt(`Type "DELETE" to confirm deletion of ${email}:`);
  if (passwordConfirm !== "DELETE") {
    alert("Deletion cancelled. Type DELETE to confirm.");
    return;
  }

  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/users/${uid}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Delete failed");
    }

    alert(`User "${email}" has been permanently deleted.`);
    loadAllUsers();
    loadAllRequests();
    loadWorkers();
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete user: " + error.message);
  }
};

// ── IMAGE MODAL FUNCTIONS ───────────────────────────────────────────────────
window.openImageModal = function (imageSrc) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  if (modal && modalImg && imageSrc) {
    modalImg.src = imageSrc;
    modal.style.display = "block";
  }
};

window.closeImageModal = function () {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.style.display = "none";
  }
};

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeImageModal();
  }
});

// ── ESCAPE HTML (FIXED: HANDLES 0 CORRECTLY) ────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS MODULE
// ══════════════════════════════════════════════════════════════════════════════

// ── HELPER: parse a date from request data ──────────────────────────────────
function parseRequestDate(req) {
  // Prefer resolvedAt for resolved requests (Firestore Timestamp or ISO string)
  const raw = req.createdAt;
  if (!raw) return null;
  // Handle Firestore Timestamp objects serialised as {_seconds, _nanoseconds}
  if (raw && typeof raw === "object" && raw._seconds) {
    return new Date(raw._seconds * 1000);
  }
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

function parseResolvedDate(req) {
  const raw = req.resolvedAt;
  if (!raw) return null;
  if (raw && typeof raw === "object" && raw._seconds) {
    return new Date(raw._seconds * 1000);
  }
  const d = new Date(raw);
  return isNaN(d) ? null : d;
}

// ── RESOLUTION TIME in days ──────────────────────────────────────────────────
function resolutionDays(req) {
  if (req.status !== "resolved") return null;
  const created = parseRequestDate(req);
  const resolved = parseResolvedDate(req);
  if (!created || !resolved) return null;
  const diff = (resolved - created) / (1000 * 60 * 60 * 24);
  return Math.max(0, parseFloat(diff.toFixed(1)));
}

// ── RENDER ALL REPORTS ───────────────────────────────────────────────────────
function renderAllReports() {
  renderReport1();
  renderReport2();
  renderReport3();
}

// ── REPORT 1: Volume & Avg Resolution Time by Category ──────────────────────
function getReport1Data() {
  const categories = {};
  allRequests.forEach(req => {
    const cat = req.category || "Unknown";
    if (!categories[cat]) categories[cat] = { total: 0, resolvedDays: [] };
    categories[cat].total++;
    const days = resolutionDays(req);
    if (days !== null) categories[cat].resolvedDays.push(days);
  });

  return Object.entries(categories).map(([cat, d]) => ({
    category: cat,
    total: d.total,
    avgDays: d.resolvedDays.length
      ? parseFloat((d.resolvedDays.reduce((a, b) => a + b, 0) / d.resolvedDays.length).toFixed(1))
      : 0,
    resolvedCount: d.resolvedDays.length,
  })).sort((a, b) => b.total - a.total);
}

function renderReport1() {
  const container = document.getElementById("report1Chart");
  if (!container) return;

  const data = getReport1Data();
  if (!data.length) {
    container.innerHTML = '<div class="empty-chart">No request data available.</div>';
    return;
  }

  const maxTotal = Math.max(...data.map(d => d.total), 1);
  const maxDays  = Math.max(...data.map(d => d.avgDays), 1);
  const CHART_H  = 180; // px

  container.innerHTML = data.map(d => {
    const volH  = Math.max(4, Math.round((d.total / maxTotal)  * CHART_H));
    const dayH  = Math.max(4, Math.round((d.avgDays / maxDays) * CHART_H));
    return `
      <div class="bar-group">
        <div class="bar-pair">
          <div class="bar bar-volume" style="height:${volH}px;" title="${d.total} requests">
            <span class="bar-value-label">${d.total}</span>
          </div>
          <div class="bar bar-time" style="height:${dayH}px;" title="${d.avgDays} avg days">
            <span class="bar-value-label">${d.avgDays}d</span>
          </div>
        </div>
        <div class="bar-label">${escapeHtml(d.category)}</div>
      </div>`;
  }).join("");
}

window.exportReport1CSV = function () {
  const data = getReport1Data();
  const rows = [
    ["Category", "Total Requests", "Resolved Count", "Avg Resolution Days"],
    ...data.map(d => [d.category, d.total, d.resolvedCount, d.avgDays])
  ];
  downloadCSV(rows, "report1_volume_resolution.csv");
};

// ── REPORT 2: Worker Performance ─────────────────────────────────────────────
function getReport2Data() {
  const periodVal = document.getElementById("workerPeriodSelect")?.value || "30";
  const now = new Date();
  let cutoff = null;
  if (periodVal !== "all") {
    cutoff = new Date(now.getTime() - parseInt(periodVal) * 24 * 60 * 60 * 1000);
  }

  // Only resolved requests within the period
  const relevant = allRequests.filter(req => {
    if (req.status !== "resolved") return false;
    if (!cutoff) return true;
    const resolvedDate = parseResolvedDate(req) || parseRequestDate(req);
    return resolvedDate && resolvedDate >= cutoff;
  });

  // Map worker uid -> stats
  const workerMap = {};
  relevant.forEach(req => {
    const wid = req.assignedTo || "__unassigned__";
    if (!workerMap[wid]) workerMap[wid] = { resolved: 0, totalDays: 0, dayCount: 0 };
    workerMap[wid].resolved++;
    const days = resolutionDays(req);
    if (days !== null) { workerMap[wid].totalDays += days; workerMap[wid].dayCount++; }
  });

  // Enrich with worker names
  return Object.entries(workerMap).map(([uid, stats]) => {
    const worker = workersList.find(w => w.uid === uid);
    const name = uid === "__unassigned__"
      ? "Unassigned"
      : (worker ? (worker.username || worker.email) : uid);
    const avgDays = stats.dayCount
      ? parseFloat((stats.totalDays / stats.dayCount).toFixed(1))
      : "—";
    return { uid, name, resolved: stats.resolved, avgDays };
  }).sort((a, b) => b.resolved - a.resolved);
}

window.renderReport2 = function () {
  const container = document.getElementById("report2Table");
  if (!container) return;

  const data = getReport2Data();
  if (!data.length) {
    container.innerHTML = '<div class="empty-chart">No resolved requests in this period.</div>';
    return;
  }

  const maxResolved = Math.max(...data.map(d => d.resolved), 1);

  container.innerHTML = `
    <table class="worker-table">
      <thead><tr>
        <th>Worker</th>
        <th>Requests Resolved</th>
        <th>Avg Resolution Time</th>
      </tr></thead>
      <tbody>
        ${data.map(d => `
          <tr>
            <td>${escapeHtml(d.name)}</td>
            <td>
              <span class="perf-bar-bg">
                <span class="perf-bar-fill" style="width:${Math.round((d.resolved/maxResolved)*100)}%"></span>
              </span>
              ${d.resolved}
            </td>
            <td>${d.avgDays === "—" ? "—" : d.avgDays + " days"}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
};

window.exportReport2CSV = function () {
  const data = getReport2Data();
  const rows = [
    ["Worker", "Requests Resolved", "Avg Resolution Days"],
    ...data.map(d => [d.name, d.resolved, d.avgDays])
  ];
  downloadCSV(rows, "report2_worker_performance.csv");
};

// ── REPORT 3: Custom Filtered Summary ────────────────────────────────────────
function getReport3Data() {
  const fromVal = document.getElementById("r3DateFrom")?.value;
  const toVal   = document.getElementById("r3DateTo")?.value;
  const catVal  = document.getElementById("r3Category")?.value || "";

  const fromDate = fromVal ? new Date(fromVal + "T00:00:00") : null;
  const toDate   = toVal   ? new Date(toVal   + "T23:59:59") : null;

  const filtered = allRequests.filter(req => {
    const created = parseRequestDate(req);
    if (fromDate && created && created < fromDate) return false;
    if (toDate   && created && created > toDate)   return false;
    if (catVal && req.category !== catVal) return false;
    return true;
  });

  const resolved = filtered.filter(r => r.status === "resolved");
  const pending  = filtered.filter(r => r.status === "pending");
  const inprog   = filtered.filter(r => r.status === "in-progress");

  const daysList = resolved.map(r => resolutionDays(r)).filter(d => d !== null);
  const avgRes   = daysList.length
    ? parseFloat((daysList.reduce((a,b)=>a+b,0) / daysList.length).toFixed(1))
    : null;

  // Breakdown by category if "All Categories" selected
  const catBreakdown = {};
  filtered.forEach(r => {
    const c = r.category || "Unknown";
    if (!catBreakdown[c]) catBreakdown[c] = { total: 0, resolved: 0 };
    catBreakdown[c].total++;
    if (r.status === "resolved") catBreakdown[c].resolved++;
  });

  return { filtered, resolved, pending, inprog, avgRes, catBreakdown };
}

window.renderReport3 = function () {
  const container = document.getElementById("report3Summary");
  if (!container) return;

  const { filtered, resolved, pending, inprog, avgRes, catBreakdown } = getReport3Data();

  if (!filtered.length) {
    container.innerHTML = '<div class="empty-chart">No requests match the selected filters.</div>';
    return;
  }

  const breakdownRows = Object.entries(catBreakdown)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, d]) => `
      <tr>
        <td>${escapeHtml(cat)}</td>
        <td>${d.total}</td>
        <td>${d.resolved}</td>
        <td>${d.total > 0 ? Math.round((d.resolved/d.total)*100) + "%" : "—"}</td>
      </tr>`).join("");

  container.innerHTML = `
    <div class="custom-summary">
      <div class="summary-stat"><h4>${filtered.length}</h4><p>Total Matching</p></div>
      <div class="summary-stat"><h4>${pending.length}</h4><p>Pending</p></div>
      <div class="summary-stat"><h4>${inprog.length}</h4><p>In Progress</p></div>
      <div class="summary-stat"><h4>${resolved.length}</h4><p>Resolved</p></div>
      <div class="summary-stat"><h4>${avgRes !== null ? avgRes + "d" : "—"}</h4><p>Avg Resolution</p></div>
    </div>
    <table class="worker-table" style="margin-top:20px;">
      <thead><tr>
        <th>Category</th><th>Total</th><th>Resolved</th><th>Resolution Rate</th>
      </tr></thead>
      <tbody>${breakdownRows}</tbody>
    </table>`;
};

window.exportReport3CSV = function () {
  const { filtered } = getReport3Data();
  const rows = [
    ["ID", "Category", "Status", "Priority", "User Email", "Ward", "Municipality", "Created At", "Resolved At", "Resolution Days"],
    ...filtered.map(r => [
      r.id || r.firestoreId,
      r.category,
      r.status,
      r.priority || "",
      r.userEmail || "",
      r.ward || "",
      r.municipality || "",
      r.createdAt || "",
      r.resolvedAt || "",
      resolutionDays(r) ?? ""
    ])
  ];
  downloadCSV(rows, "report3_custom_summary.csv");
};

// ── CSV DOWNLOAD UTILITY ──────────────────────────────────────────────────────
function downloadCSV(rows, filename) {
  const csv = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? "").replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n")
        ? `"${str}"`
        : str;
    }).join(",")
  ).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}