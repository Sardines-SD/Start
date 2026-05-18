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
import { firebaseConfig } from './firebaseConfig.js';

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let allRequests = [];
let currentWorkerUid = null;

// ── Auth guard — always re-check role from Firestore ─────────────────────────
onAuthStateChanged(auth, async (user) => {
  // If no user is logged in, redirect to index.html (Login page)
  if (!user) { 
    window.location.href = "index.html"; 
    return; 
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role    = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role);
  currentWorkerUid = user.uid;

  // Role-based redirects
  if (role === "admin") { 
    window.location.href = "AdminDashboard.html"; 
    return; 
  }
  if (role === "user") { 
    window.location.href = "Dashboard.html"; 
    return; 
  }
  if (role !== "worker") { 
    window.location.href = "index.html"; 
    return; 
  }

  document.getElementById("welcomeMsg").textContent = "Welcome, " + user.email;
  loadAllRequests();
});

async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

// ── Logout function - redirects to index.html (Login page) ───────────────────
window.logout = async function () {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "index.html";
};

// ── LOGOUT BUTTON ESCAPE ANIMATION ───────────────────────────────────────────
let logoutClickCount = 0;

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    logoutClickCount++;

    if (logoutClickCount === 1) {
      // First click — slide right
      logoutBtn.style.transform = "translate(120px,50px)";
    } else if (logoutClickCount === 2) {
      // Second click — slide back to original
      logoutBtn.style.transform = "translate(0px,0px)";
    } else {
      // Third click — actually log out
      await logout();
    }
  });
}

// ── Priority Badge Helper Function ───────────────────────────────────────────
function getPriorityBadge(priority) {
  if (!priority) return '<span class="badge badge-pending">Not set</span>';
  
  const priorityMap = {
    low: { class: 'priority-low', label: 'Low' },
    medium: { class: 'priority-medium', label: 'Medium' },
    high: { class: 'priority-high', label: 'High' }
  };
  
  const p = priorityMap[priority] || { class: 'badge-pending', label: priority };
  return `<span class="badge ${p.class}">${p.label}</span>`;
}

async function loadAllRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='13'>Loading...";

  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const allData = await res.json();
    // Only requests assigned to this worker
    allRequests = allData.filter(req => req.assignedTo === currentWorkerUid);
    renderTable(allRequests);
  } catch {
    table.innerHTML = "<tr><td colspan='13'>Failed to load requests.";
  }
}

function renderTable(data) {
  // Split into: assigned-but-not-yet-claimed vs claimed/active
  const pending = data.filter(r => !r.claimedAt);
  const active  = data.filter(r =>  r.claimedAt);

  renderPendingTable(pending);
  renderActiveTable(active);
}

function buildRow(req, showClaimBtn) {
  const hasImage = req.image && req.image !== "" && req.image !== null;
  const imageHtml = hasImage
    ? `<img src="${escapeHtml(req.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(req.image)}')" alt="Proof image" title="Click to enlarge">`
    : '<span class="no-image">No image</span>';

  const statusClass    = req.status === "in-progress" ? "inprogress" : req.status;
  const priorityBadge  = getPriorityBadge(req.priority);
  const assignedByName = req.assignedToName || 'Admin';

  const dueDateCell = `<td class="due-date-cell">${escapeHtml(req.dueDate || '-')}</td>`;
  const actionCell = showClaimBtn
    ? `<td class="update-cell">
        <button class="btn-claim" data-id="${escapeHtml(req.firestoreId)}" onclick="claimRequest(this)">
          Accept
        </button>
       </td>`
    : `<td class="update-cell">
        <select class="status-select" data-id="${escapeHtml(req.firestoreId)}" onchange="updateStatus(this)">
          <option value="">Change...</option>
          <option value="in-progress" ${req.status === "in-progress" ? "selected" : ""}>In Progress</option>
          <option value="resolved"    ${req.status === "resolved"    ? "selected" : ""}>Resolved</option>
        </select>
        ${req.status !== "resolved"
          ? `<button class="btn-unclaim" data-id="${escapeHtml(req.firestoreId)}" onclick="unclaimRequest(this)" title="Release this request back to the pool" style="margin-top:6px;display:block;width:100%;font-size:12px;padding:4px 8px;background:#f8d7da;color:#721c24;border:1px solid #f5c6cb;border-radius:4px;cursor:pointer;">
               Release
             </button>`
          : ''}
       </td>`;

  return `
    <tr>
      <td class="id-cell">${escapeHtml(req.id)}</td>
      <td class="user-cell">${escapeHtml(req.userEmail ?? "-")}</td>
      <td class="category-cell">${escapeHtml(req.category)}</td>
      <td class="description-cell">${escapeHtml(req.description)}</td>
      <td class="priority-cell">${priorityBadge}</td>
      <td class="assigned-by-cell">${escapeHtml(assignedByName)}</td>
      <td class="ward-cell">${req.ward || '-'}</td>
      <td class="municipality-cell">${req.municipality || '-'}</td>
      <td class="date-cell">${escapeHtml(req.createdAt ?? "-")}</td>
      ${dueDateCell}
      <td class="status-cell"><span class="badge badge-${statusClass}">${escapeHtml(req.status)}</span></td>
      <td class="proof-cell">${imageHtml}</td>
      ${actionCell}
    </tr>
  `;
}

function renderPendingTable(data) {
  const section = document.getElementById("pendingAcceptanceSection");
  const table   = document.getElementById("pendingAcceptanceTable");
  if (!section || !table) return;

  if (!data.length) {
    section.style.display = "none";
    return;
  }
  section.style.display = "block";
  table.innerHTML = data.map(r => buildRow(r, true)).join("");
}

function renderActiveTable(data) {
  const table = document.getElementById("requestsTable");
  if (!data.length) {
    table.innerHTML = "<tr><td colspan='13'>No active requests yet.";
    return;
  }
  table.innerHTML = data.map(r => buildRow(r, false)).join("");
}

window.claimRequest = async function (btn) {
  const firestoreId = btn.dataset.id;
  if (!confirm("Accept this request? It will be marked as In Progress.")) return;

  btn.disabled    = true;
  btn.textContent = "Accepting...";

  try {
    const token = await getFreshToken();
    const res   = await fetch(`/api/requests/${firestoreId}/claim`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed");
    }

    // Update local state and re-render
    allRequests = allRequests.map(r =>
      r.firestoreId === firestoreId ? { ...r, claimedAt: new Date().toISOString(), status: "in-progress" } : r
    );
    renderTable(allRequests);
  } catch (err) {
    alert("Failed to accept request: " + err.message);
    btn.disabled    = false;
    btn.textContent = "Accept";
  }
};

// ── US3 Sprint 4: Release (unclaim) a previously accepted request ─────────────
window.unclaimRequest = async function (btn) {
  const firestoreId = btn.dataset.id;

  if (!confirm("Release this request? It will return to the unassigned pool and your progress will be cleared.")) return;

  btn.disabled    = true;
  btn.textContent = "Releasing...";

  try {
    const token = await getFreshToken();
    const res   = await fetch(`/api/requests/${firestoreId}/unclaim`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to release request");
    }

    // Remove from local state (it's no longer assigned to this worker) and re-render
    allRequests = allRequests.filter(r => r.firestoreId !== firestoreId);
    renderTable(allRequests);

    // Show brief confirmation banner
    const banner = document.createElement("div");
    banner.textContent = "Request released back to the pool.";
    banner.style.cssText = "position:fixed;top:16px;right:16px;background:#d4edda;color:#155724;border:1px solid #c3e6cb;padding:10px 18px;border-radius:6px;font-size:14px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.15)";
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 3000);

  } catch (err) {
    alert("Could not release request: " + err.message);
    btn.disabled    = false;
    btn.textContent = "Release";
  }
};

window.filterRequests = function () {
  const s = document.getElementById("filterStatus").value;
  const c = document.getElementById("filterCategory").value;
  const active = allRequests.filter(r => r.claimedAt && (!s || r.status === s) && (!c || r.category === c));
  renderActiveTable(active);
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
    window.filterRequests();
  } catch {
    alert("Failed to update status. Please try again.");
  }
};

// ── Image Modal Functions ─────────────────────────────────────────────────────
window.openImageModal = function(imageSrc) {
  const modal = document.getElementById("imageModal");
  const modalImg = document.getElementById("modalImage");
  if (modal && modalImg && imageSrc) {
    modalImg.src = imageSrc;
    modal.style.display = "block";
  }
};

window.closeImageModal = function() {
  const modal = document.getElementById("imageModal");
  if (modal) {
    modal.style.display = "none";
  }
};

// Close modal with Escape key
document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeImageModal();
  }
});

// ── Helper: Escape HTML to prevent XSS (FIXED: handles 0 correctly) ───────────
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}