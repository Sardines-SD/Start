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

document.getElementById("logoutBtn").addEventListener("click", async () => {
  logoutClickCount++;

  if (logoutClickCount === 1) {
    // First click — slide right
    document.getElementById("logoutBtn").style.transform = "translate(120px,50px)";
  } else if (logoutClickCount === 2) {
    // Second click — slide back to original
    document.getElementById("logoutBtn").style.transform = "translate(0px,0px)";
  } else {
    // Third click — actually log out
    await logout();
  }
});

async function loadAllRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='8'>Loading…</tr>";
  try {
    const token = await getFreshToken();
    const res   = await fetch("/api/requests", {
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
    });
    if (!res.ok) throw new Error();
    allRequests = await res.json();
    renderTable(allRequests);
  } catch {
    table.innerHTML = "<tr><td colspan='8'>❌ Failed to load requests.</table>";
  }
}

function renderTable(data) {
  const table = document.getElementById("requestsTable");
  if (!data.length) { 
    table.innerHTML = "<tr><td colspan='8'>No requests found.</tr>"; 
    return; 
  }
  
  table.innerHTML = data.map(req => {
    const hasImage = req.image && req.image !== "" && req.image !== null;
    const imageHtml = hasImage 
      ? `<img src="${escapeHtml(req.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(req.image)}')" alt="Proof image" title="Click to enlarge">`
      : '<span class="no-image">No image</span>';
    
    let statusClass = req.status === "in-progress" ? "inprogress" : req.status;
    
    return `
      <tr>
        <td>${escapeHtml(req.id)}</td>
        <td>${escapeHtml(req.userEmail ?? "—")}</td>
        <td>${escapeHtml(req.category)}</td>
        <td>${escapeHtml(req.description)}</td>
        <td>${escapeHtml(req.createdAt ?? "—")}</td>
        <td><span class="badge badge-${statusClass}">${escapeHtml(req.status)}</span></td>
        <td class="proof-cell">${imageHtml}</td>
        <td>
          <select class="status-select" data-id="${escapeHtml(req.firestoreId)}" onchange="updateStatus(this)">
            <option value="">Change…</option>
            <option value="pending"     ${req.status === "pending"     ? "selected" : ""}>Pending</option>
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
    alert("❌ Failed to update status. Please try again.");
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

// ── Helper: Escape HTML to prevent XSS ─────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}