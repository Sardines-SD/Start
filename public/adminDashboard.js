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
  
  if (requestsPanel) requestsPanel.classList.remove("active");
  if (usersPanel) usersPanel.classList.remove("active");
  
  if (tab === "requests") {
    if (requestsPanel) requestsPanel.classList.add("active");
  } else if (tab === "users") {
    if (usersPanel) usersPanel.classList.add("active");
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