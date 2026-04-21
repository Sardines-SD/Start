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

document.getElementById("logoutBtn").addEventListener("click", async () => {
  logoutClickCount++;

  if (logoutClickCount === 1) {
    // First click — slide right
    document.getElementById("logoutBtn").style.transform = "translate(120px,80px)";
  } else if (logoutClickCount === 2) {
    // Second click — slide back to original
    document.getElementById("logoutBtn").style.transform = "translate(0px,0px)";
  } else {
    // Third click — actually log out
    await logout();
  }
});


window.switchTab = function (tab) {
  document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("tab-" + tab).classList.add("active");
  if (event && event.target) {
    event.target.classList.add("active");
  }
};

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

async function loadAllRequests() {
  const table = document.getElementById("requestsTable");
  table.innerHTML = "<tr><td colspan='8'>Loading...</td></tr>";

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
    filterRequests();
  } catch {
    table.innerHTML = "<tr><td colspan='8'>Failed to load requests.</td></tr>";
  }
}

function renderRequestsTable(data) {
  const table = document.getElementById("requestsTable");

  if (!data.length) {
    table.innerHTML = "<tr><td colspan='8'>No requests found.</td></tr>";
    return;
  }

  table.innerHTML = data.map(req => {
    const hasImage = req.image && req.image !== "" && req.image !== null;
    const imageHtml = hasImage
      ? `<img src="${escapeHtml(req.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(req.image)}')" alt="Proof image" title="Click to enlarge">`
      : '<span class="no-image">No image</span>';

    const statusClass = req.status === "in-progress" ? "inprogress" : req.status;

    return `
      <tr>
        <td>${escapeHtml(req.id)}</td>
        <td>${escapeHtml(req.userEmail ?? "-")}</td>
        <td>${escapeHtml(req.category)}</td>
        <td>${escapeHtml(req.description)}</td>
        <td>${escapeHtml(req.createdAt ?? "-")}</td>
        <td><span class="badge badge-${statusClass}">${escapeHtml(req.status)}</span></td>
        <td class="proof-cell">${imageHtml}</td>
        <td>
          <select class="status-select" data-id="${escapeHtml(req.firestoreId)}" onchange="updateStatus(this)">
            <option value="">Change...</option>
            <option value="pending" ${req.status === "pending" ? "selected" : ""}>Pending</option>
            <option value="in-progress" ${req.status === "in-progress" ? "selected" : ""}>In Progress</option>
            <option value="resolved" ${req.status === "resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </td>
      </tr>
    `;
  }).join("");
}

function updateStats(data) {
  document.getElementById("totalCount").textContent = data.length;
  document.getElementById("pendingCount").textContent = data.filter(r => r.status === "pending").length;
  document.getElementById("inprogressCount").textContent = data.filter(r => r.status === "in-progress").length;
  document.getElementById("resolvedCount").textContent = data.filter(r => r.status === "resolved").length;
}

window.filterRequests = function () {
  const s = document.getElementById("filterStatus").value;
  const c = document.getElementById("filterCategory").value;
  const q = document.getElementById("searchInput").value.trim().toLowerCase();

  const filtered = allRequests.filter(r => {
    const matchesStatus = !s || r.status === s;
    const matchesCategory = !c || r.category === c;

    const matchesSearch =
      !q ||
      (r.userEmail || "").toLowerCase().includes(q) ||
      (r.category || "").toLowerCase().includes(q) ||
      (r.description || "").toLowerCase().includes(q) ||
      (r.status || "").toLowerCase().includes(q);

    return matchesStatus && matchesCategory && matchesSearch;
  });

  renderRequestsTable(filtered);
};

window.updateStatus = async function (selectEl) {
  const firestoreId = selectEl.dataset.id;
  const newStatus = selectEl.value;
  if (!newStatus) return;

  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/requests/${firestoreId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) throw new Error();

    allRequests = allRequests.map(r =>
      r.firestoreId === firestoreId ? { ...r, status: newStatus } : r
    );

    updateStats(allRequests);
    filterRequests();
  } catch {
    alert("Failed to update status.");
  }
};

async function loadAllUsers() {
  const table = document.getElementById("usersTable");
  table.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

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
      table.innerHTML = "<tr><td colspan='6'>No users found.</td></tr>";
      return;
    }

    table.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.username ?? "-")}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.ward ?? "-")}</td>
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
    table.innerHTML = "<tr><td colspan='6'>Failed to load users.</td></tr>";
  }
}

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
  } catch {
    alert("Failed to update role.");
  }
};

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
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete user: " + error.message);
  }
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}