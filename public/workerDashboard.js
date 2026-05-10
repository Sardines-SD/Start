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
  // Updated colspan from 10 to 12 (table now has 12 columns)
  table.innerHTML = "<tr><td colspan='12'>Loading...";

  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    const allData = await res.json();
    // Filter to show only requests assigned to this worker
    allRequests = allData.filter(req => req.assignedTo === currentWorkerUid);
    renderTable(allRequests);
  } catch {
    table.innerHTML = "<tr><td colspan='12'>Failed to load requests.";
  }
}

function renderTable(data) {
  const table = document.getElementById("requestsTable");
  if (!data.length) { 
    table.innerHTML = "<tr><td colspan='12'>No requests have been assigned to you yet."; 
    return; 
  }
  
  table.innerHTML = data.map(req => {
    const hasImage = req.image && req.image !== "" && req.image !== null;
    const imageHtml = hasImage 
      ? `<img src="${escapeHtml(req.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(req.image)}')" alt="Proof image" title="Click to enlarge">`
      : '<span class="no-image">No image</span>';
    
    let statusClass = req.status === "in-progress" ? "inprogress" : req.status;
    const priorityBadge = getPriorityBadge(req.priority);
    const assignedByName = req.assignedToName || 'Unknown';
    
    return `
      <table>
        <td class="id-cell">${escapeHtml(req.id)}</td>
        <td class="user-cell">${escapeHtml(req.userEmail ?? "-")}</td>
        <td class="category-cell">${escapeHtml(req.category)}</td>
        <td class="description-cell">${escapeHtml(req.description)}</td>
        <td class="priority-cell">${priorityBadge}</td>
        <td class="assigned-by-cell">${escapeHtml(assignedByName)}</td>
        <td class="ward-cell">${req.ward || '-'}</td>
        <td class="municipality-cell">${req.municipality || '-'}</td>
        <td class="date-cell">${escapeHtml(req.createdAt ?? "-")}</td>
        <td class="status-cell"><span class="badge badge-${statusClass}">${escapeHtml(req.status)}</span></td>
        <td class="proof-cell">${imageHtml}</td>
        <td class="update-cell">
          <select class="status-select" data-id="${escapeHtml(req.firestoreId)}" onchange="updateStatus(this)">
            <option value="">Change...</option>
            <option value="in-progress" ${req.status === "in-progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved"    ${req.status === "resolved"    ? "selected" : ""}>Resolved</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

window.filterRequests = function () {
  const s = document.getElementById("filterStatus").value;
  const c = document.getElementById("filterCategory").value;
  renderTable(allRequests.filter(r => (!s || r.status === s) && (!c || r.category === c)));
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