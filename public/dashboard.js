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
import { initAssistant, toggleAssistant } from './assistant.js';


const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const ROLE_REDIRECT = {
  admin:  "AdminDashboard.html",
  worker: "WorkerDashboard.html",
};

//popup message for when an image is too large

function showErrorPopup(message) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  
  const popup = document.createElement('div');
  popup.style.backgroundColor = 'white';
  popup.style.borderRadius = '12px';
  popup.style.padding = '24px';
  popup.style.maxWidth = '400px';
  popup.style.textAlign = 'center';
  popup.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
  
  const messageEl = document.createElement('p');
  messageEl.textContent = message;
  messageEl.style.margin = '0 0 20px 0';
  messageEl.style.fontSize = '16px';
  messageEl.style.color = '#333';
  
  const okBtn = document.createElement('button');
  okBtn.textContent = 'OK';
  okBtn.style.backgroundColor = '#2b5fa8';
  okBtn.style.color = 'white';
  okBtn.style.border = 'none';
  okBtn.style.padding = '10px 24px';
  okBtn.style.borderRadius = '8px';
  okBtn.style.fontSize = '14px';
  okBtn.style.fontWeight = 'bold';
  okBtn.style.cursor = 'pointer';
  
  okBtn.onclick = () => {
    document.body.removeChild(overlay);
  };
  
  popup.appendChild(messageEl);
  popup.appendChild(okBtn);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  const role    = userDoc.exists() ? userDoc.data().role : "user";
  localStorage.setItem("role", role);
  
  // Initialize assistant with user data
  const userName = userDoc.exists() ? userDoc.data().username : null;
  initAssistant(user, userName);

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

// Make toggleAssistant available globally for HTML onclick
window.toggleAssistant = toggleAssistant;

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

// like the function says, it compresses the image since Firebase limits us to 1MB
function compressImage(file, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        let currentQuality = quality;
        let compressed = canvas.toDataURL('image/jpeg', currentQuality);
        
        while (compressed.length > 900 * 1024 && currentQuality > 0.3) {
          currentQuality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', currentQuality);
        }
        
        resolve(compressed);
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

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

document.getElementById("serviceRequestForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const category    = document.getElementById("requestCategory").value;
  const description = document.getElementById("requestDescription").value;
  const imageFile   = document.getElementById("requestImage").files[0];
  const feedback    = document.getElementById("requestFeedback");
  const fileInput   = document.getElementById("requestImage");
  const imagePreview = document.getElementById("imagePreview");
  const previewImg = document.getElementById("previewImg");

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
      try {
        imageBase64 = await compressImage(imageFile, 1024, 0.7);
        
        if (imageBase64 && imageBase64.length > 1.4 * 1024 * 1024) {
          throw new Error("Image too large even after compression");
        }
      } catch (compressError) {
        fileInput.value = '';
        if (imagePreview) imagePreview.classList.remove('show');
        if (previewImg) previewImg.src = '';
        
        showErrorPopup("Your image is too large. Please use a smaller image.");
        feedback.textContent = "";
        return;
      }
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
      
      if (err.error && err.error.includes("Image too large")) {
        fileInput.value = '';
        if (imagePreview) imagePreview.classList.remove('show');
        if (previewImg) previewImg.src = '';
        
        showErrorPopup("Your image is too large. Please use a smaller image.");
        feedback.textContent = "";
        return;
      }
      
      feedback.textContent = err.error ?? "Failed to submit request.";
      feedback.style.background = "#f8d7da";
      feedback.style.borderLeftColor = "#dc3545";
      return;
    }

    feedback.textContent = "Request submitted successfully!";
    feedback.style.background = "#d4edda";
    feedback.style.borderLeftColor = "#28a745";

    document.getElementById("serviceRequestForm").reset();
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
  table.innerHTML = "<tr><td colspan='7'>Loading...";

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
      table.innerHTML = "<tr class='no-requests'><td colspan='7'>No requests found.";
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
    table.innerHTML = "<tr><td colspan='7'>Failed to load requests.";
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
      table.innerHTML = "<tr class='no-requests'><td colspan='7'>No reports found.";
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