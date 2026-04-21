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

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role    = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role);

  if (role === "admin") {
    window.location.href = "AdminDashboard.html";
    return;
  }
  if (role === "worker") {
    window.location.href = "WorkerDashboard.html";
    return;
  }
  if (role !== "user") {
    window.location.href = "index.html";
    return;
  }

  document.getElementById("welcomeMsg").textContent = "Welcome, " + user.email;
  loadRequests();
  setupImagePreview();

  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", loadRequests);
  }
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
    document.getElementById("logoutBtn").style.transform = "translate(120px,50px)";
  } else if (logoutClickCount === 2) {
    // Second click — slide back to original
    document.getElementById("logoutBtn").style.transform = "translate(0px,0px)";
  } else {
    // Third click — actually log out
    await logout();
  }
});


function setupImagePreview() {
  const imageInput = document.getElementById("requestImage");
  const imagePreview = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");

  if (imageInput && imagePreview && previewImg) {
    imageInput.addEventListener("change", function() {
      if (this.files && this.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          previewImg.src = e.target.result;
          imagePreview.classList.add("show");
        };
        reader.readAsDataURL(this.files[0]);
      } else {
        previewImg.src = "";
        imagePreview.classList.remove("show");
      }
    });
  }
}

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

document.addEventListener("keydown", function(e) {
  if (e.key === "Escape") {
    closeImageModal();
  }
});

function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById("serviceRequestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category    = document.getElementById("requestCategory").value;
  const description = document.getElementById("requestDescription").value;
  const imageFile   = document.getElementById("requestImage").files[0];
  const feedback    = document.getElementById("requestFeedback");

  if (!category || !description) {
    feedback.textContent = "Please fill in all required fields.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
    return;
  }

  feedback.textContent = "Submitting...";
  feedback.style.background = "#e9f2ff";
  feedback.style.borderLeftColor = "#2b5fa8";

  try {
    const token = await getFreshToken();
    let imageBase64 = null;

    if (imageFile) {
      imageBase64 = await imageToBase64(imageFile);
    }

    const res = await fetch("/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        category,
        description,
        image: imageBase64
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      feedback.textContent = err.error ?? "Failed to submit request.";
      feedback.style.background = "#f8d7da";
      feedback.style.borderLeftColor = "#dc3545";
      return;
    }

    feedback.textContent = "Request submitted successfully!";
    feedback.style.background = "#d4edda";
    feedback.style.borderLeftColor = "#28a745";

    document.getElementById("serviceRequestForm").reset();
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    if (imagePreview) imagePreview.classList.remove("show");
    if (previewImg) previewImg.src = "";

    loadRequests();

    setTimeout(() => {
      if (feedback.textContent === "Request submitted successfully!") {
        feedback.textContent = "";
        feedback.style.background = "#e9f2ff";
        feedback.style.borderLeftColor = "#2b5fa8";
      }
    }, 3000);

  } catch (error) {
    console.error("Submit error:", error);
    feedback.textContent = "Failed to submit. Please try again.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
  }
});

async function loadRequests() {
  const table = document.getElementById("requestsTableBody");
  table.innerHTML = "<tr><td colspan='7'>Loading...</td></tr>";

  try {
    const token = await getFreshToken();
    const searchValue = document.getElementById("searchInput")?.value.trim() || "";

    let url = "/api/requests";

    if (searchValue) {
      url += `?search=${encodeURIComponent(searchValue)}`;
    }

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    if (!data.length) {
      table.innerHTML = "<tr class='no-requests'><td colspan='7'>No requests found.</td></tr>";
      return;
    }

    table.innerHTML = data.map(r => {
      const hasImage = r.image && r.image !== "" && r.image !== null;
      const imageHtml = hasImage
        ? `<img src="${escapeHtml(r.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(r.image)}')" alt="Proof" title="Click to enlarge">`
        : '<span class="no-image">No image</span>';

      return `
        <tr>
          <td>${escapeHtml(r.id)}</td>
          <td>${escapeHtml(r.category)}</td>
          <td>${escapeHtml(r.description.substring(0, 80))}${r.description.length > 80 ? "..." : ""}</td>
          <td><span class="badge badge-${getStatusClass(r.status)}">${escapeHtml(r.status)}</span></td>
          <td>${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
          <td class="proof-cell">${imageHtml}</td>
          <td>
            <button class="btn-delete"
              onclick="deleteReport('${escapeHtml(r.firestoreId)}', this)">
              Delete
            </button>
          </td>
        </tr>
      `;
    }).join("");

  } catch (error) {
    console.error("Load requests error:", error);
    table.innerHTML = "<tr><td colspan='7'>Failed to load requests.</td></tr>";
  }
}

window.deleteReport = async function (firestoreId, btn) {
  if (!firestoreId) return;
  if (!confirm("Delete this report? This cannot be undone.")) return;

  btn.disabled = true;
  btn.textContent = "Deleting...";

  try {
    const token = await getFreshToken();
    const res = await fetch(`/api/requests/${firestoreId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error ?? "Failed to delete.");
      btn.disabled = false;
      btn.textContent = "Delete";
      return;
    }

    btn.closest("tr").remove();

    const table = document.getElementById("requestsTableBody");
    if (!table.querySelector("tr")) {
      table.innerHTML = "<tr class='no-requests'><td colspan='7'>No reports found.</td></tr>";
    }

  } catch {
    alert("Failed to delete. Please try again.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
};

function getStatusClass(status) {
  const statusLower = (status || "").toLowerCase();
  if (statusLower === "pending") return "pending";
  if (statusLower === "in progress" || statusLower === "in-progress") return "progress";
  if (statusLower === "resolved" || statusLower === "completed") return "resolved";
  return "pending";
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}