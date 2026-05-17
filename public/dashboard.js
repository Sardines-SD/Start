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
let issueMap    = null;
let issueMarker = null;
let activeFeedbackId = null;
let selectedRating   = 0;

// US3: Flag to bypass duplicate check when user clicks "Submit Anyway"
let bypassDuplicateCheck = false;

// STAR LABELS for feedback modal
const STAR_LABELS = {
  1: "😞 Poor - Very dissatisfied",
  2: "😐 Fair - Below expectations",
  3: "🙂 Good - Satisfactory",
  4: "😊 Very Good - Above expectations",
  5: "🌟 Excellent - Exceeded expectations"
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


function initIssueMap() {
  if (issueMap) return;

  // Centered on Johannesburg
  issueMap = L.map('issueMap').setView([-26.2041, 28.0473], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(issueMap);

  // Search box — queries Nominatim restricted to Johannesburg area
  const searchInput  = document.getElementById('mapSearchInput');
  let   debounceTimer = null;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const query = searchInput.value.trim();
      if (query.length < 3) return;
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Johannesburg, South Africa')}&format=json&limit=1`
        );
        const results = await res.json();
        if (results.length > 0) {
          issueMap.setView([parseFloat(results[0].lat), parseFloat(results[0].lon)], 14);
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }, 500);
  });

  // Near Me — only pans the map, does NOT set the pin
  document.getElementById('nearMeBtn').addEventListener('click', () => {
    if (!navigator.geolocation) return alert('Geolocation not supported.');
    navigator.geolocation.getCurrentPosition(
      (pos) => issueMap.setView([pos.coords.latitude, pos.coords.longitude], 14),
      ()    => alert('Could not get your location.')
    );
  });

  // Click to place/move pin
  issueMap.on('click', (e) => placePin(e.latlng.lat, e.latlng.lng));
}

function placePin(lat, lng) {
  if (issueMarker) issueMap.removeLayer(issueMarker);

  issueMarker = L.marker([lat, lng], { draggable: true }).addTo(issueMap);

  issueMarker.on('dragend', (e) => {
    const pos = e.target.getLatLng();
    updateLocationFields(pos.lat, pos.lng);
  });

  updateLocationFields(lat, lng);
}

async function updateLocationFields(lat, lng) {
  document.getElementById('issueLatitude').value  = lat;
  document.getElementById('issueLongitude').value = lng;

  const tag = document.getElementById('locationTag');
  tag.textContent = `📍 Pinned: ${lat.toFixed(5)}, ${lng.toFixed(5)} — looking up address...`;
  tag.classList.add('visible');

  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    tag.textContent = `📍 ${data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}`;
  } catch {
    tag.textContent = `📍 Location pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

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


// ── Apply saved dark mode preference ──
  const pref = (userDoc.exists() && userDoc.data().darkMode != null)
    ? userDoc.data().darkMode
    : localStorage.getItem('darkMode') === 'true';
  document.body.classList.toggle('dark-mode', pref);
  localStorage.setItem('darkMode', pref);
  const dmBtn = document.getElementById('darkModeToggle');
  if (dmBtn) dmBtn.innerHTML = pref ? '☀️' : '🌙';



  document.getElementById("welcomeMsg").textContent = "Welcome, " + user.email;
  loadRequests();
  setupImagePreview();
  initIssueMap();

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
    document.getElementById("logoutBtn").style.transform = "translate(120px,80px)";
  } else if (logoutClickCount === 2) {
    // Second click — slide back to original
    document.getElementById("logoutBtn").style.transform = "translate(0px,0px)";
  } else {
    // Third click — actually log out
    await logout();
  }
});

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

// ============================================================
// US3: DUPLICATE REQUEST DETECTION FUNCTIONS
// ============================================================

async function checkForDuplicates(category, latitude, longitude) {
  try {
    const token = await getFreshToken();
    const res = await fetch("/api/requests/check-duplicate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        category: category,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      })
    });
    
    if (!res.ok) {
      console.warn("Duplicate check failed, proceeding with submission");
      return { hasDuplicates: false };
    }
    
    return await res.json();
  } catch (error) {
    console.error("Duplicate check error:", error);
    return { hasDuplicates: false };
  }
}

function showDuplicateModal(duplicates) {
  const modal = document.getElementById("duplicateModal");
  const duplicateList = document.getElementById("duplicateList");
  const duplicateMessage = document.getElementById("duplicateMessage");
  
  if (!modal) return;
  
  duplicateMessage.textContent = `We found ${duplicates.length} similar request(s) nearby. Do you still want to submit?`;
  
  duplicateList.innerHTML = duplicates.map(d => `
    <div style="background:#f8f9fa; padding:10px; margin-bottom:8px; border-radius:8px; border-left:4px solid #f59e0b;">
      <div><strong>📅 ${new Date(d.createdAt).toLocaleDateString()}</strong></div>
      <div><strong>📍 ${d.distance}m away</strong></div>
      <div><strong>Status:</strong> ${d.status}</div>
      <div><strong>Description:</strong> ${escapeHtml(d.description.substring(0, 80))}${d.description.length > 80 ? '...' : ''}</div>
    </div>
  `).join("");
  
  modal.classList.add("open");
}

window.closeDuplicateModal = function() {
  const modal = document.getElementById("duplicateModal");
  if (modal) {
    modal.classList.remove("open");
  }
};

// US3: Set up the "Submit Anyway" button - simply trigger form submission again with bypass flag
function setupSubmitAnywayButton() {
  const submitAnywayBtn = document.getElementById("submitAnywayBtn");
  if (submitAnywayBtn) {
    // Remove any existing listeners
    const newBtn = submitAnywayBtn.cloneNode(true);
    submitAnywayBtn.parentNode.replaceChild(newBtn, submitAnywayBtn);
    
    newBtn.addEventListener("click", async () => {
      console.log("Submit Anyway clicked - bypassing duplicate check");
      // Set flag to bypass duplicate check
      bypassDuplicateCheck = true;
      // Close the modal
      closeDuplicateModal();
      // Trigger the form submission again (will skip duplicate check because flag is true)
      const form = document.getElementById("serviceRequestForm");
      const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
      form.dispatchEvent(submitEvent);
      // Reset flag after a short delay (give time for submission to process)
      setTimeout(() => {
        bypassDuplicateCheck = false;
      }, 1000);
    });
  }
}

// Call this when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSubmitAnywayButton);
} else {
  setupSubmitAnywayButton();
}

// ============================================================
// END OF US3 FUNCTIONS
// ============================================================

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

  const latitude  = document.getElementById('issueLatitude').value;
  const longitude = document.getElementById('issueLongitude').value;

  if (!latitude || !longitude) {
    feedback.textContent = 'Please pin the location of the issue on the map.';
    feedback.style.background = '#f8d7da';
    feedback.style.borderLeftColor = '#dc3545';
    document.getElementById('issueMap').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // US3: Skip duplicate check if user clicked "Submit Anyway"
  if (!bypassDuplicateCheck) {
    feedback.textContent = "Checking for duplicates...";
    feedback.style.background = "#e9f2ff";
    feedback.style.borderLeftColor = "#2b5fa8";
    
    const duplicateCheck = await checkForDuplicates(category, latitude, longitude);
    
    if (duplicateCheck.hasDuplicates && duplicateCheck.duplicates.length > 0) {
      // Show warning modal with duplicate list
      showDuplicateModal(duplicateCheck.duplicates);
      feedback.textContent = "";
      return;
    }
  } else {
    console.log("Bypassing duplicate check (Submit Anyway clicked)");
  }

  // Proceed with submission
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
        image: imageBase64,
        latitude:  parseFloat(latitude),
        longitude: parseFloat(longitude),
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

    if (issueMarker) {
      issueMap.removeLayer(issueMarker);
      issueMarker = null;
    }
    document.getElementById('issueLatitude').value  = '';
    document.getElementById('issueLongitude').value = '';
    document.getElementById('locationTag').classList.remove('visible');

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
  table.innerHTML = "<tr><td colspan='9'>Loading...";

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
      table.innerHTML = "<tr class='no-requests'><td colspan='9'>No requests found.";
      return;
    }
table.innerHTML = data.map(r => {
  const hasImage = r.image && r.image !== "" && r.image !== null;
  const imageHtml = hasImage
    ? `<img src="${escapeHtml(r.image)}" class="proof-image" onclick="event.stopPropagation(); openImageModal('${escapeHtml(r.image)}')" alt="Proof" title="Click to enlarge">`
    : '<span class="no-image">No image</span>';

  // Build feedback cell
  const isResolved = r.status === 'resolved';
  let feedbackCell = '';
  if (!isResolved) {
    feedbackCell = '<td>—</td>';
  } else if (r.feedbackSubmitted) {
    const stars = '★'.repeat(r.feedbackRating || 0) + '☆'.repeat(5 - (r.feedbackRating || 0));
    feedbackCell = `<td><span class="feedback-given" title="${escapeHtml(r.feedbackComment || '')}">${stars}</span></td>`;
  } else {
    feedbackCell = `<td><button class="btn-rate" onclick="openFeedbackModal('${escapeHtml(r.firestoreId)}')">Rate ⭐</button></td>`;
  }

  return `
    <tr>
      <td>${escapeHtml(r.id)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>${escapeHtml(r.description.substring(0, 80))}${r.description.length > 80 ? "..." : ""}</td>
      <td>${r.ward || '—'}</td>
      <td>${r.municipality || '—'}</td>
      <td>${escapeHtml(r.address || '-')}</td>
      <td>
        ${r.latitude && r.longitude
          ? `<a href="https://maps.google.com/?q=${r.latitude},${r.longitude}" target="_blank">View Map</a>`
          : '-'}
      </td>
      <td><span class="badge badge-${getStatusClass(r.status)}">${escapeHtml(r.status)}</span></td>
      ${feedbackCell}
      <td>${r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</td>
      <td class="proof-cell">${imageHtml}</td>
      <td>
        <button class="btn-delete" onclick="deleteReport('${escapeHtml(r.firestoreId)}', this)">
          Delete
        </button>
      </td>
    </tr>
  `;
}).join("");

  } catch (error) {
    console.error("Load requests error:", error);
    table.innerHTML = "<tr><td colspan='9'>Failed to load requests.";
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
      table.innerHTML = "<tr class='no-requests'><td colspan='9'>No reports found.";
    }

  } catch {
    alert("Failed to delete. Please try again.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
};


// ── FEEDBACK MODAL ────────────────────────────────────────────────────────────
window.openFeedbackModal = function(firestoreId) {
const starLabel = document.getElementById('starLabel');
if (starLabel) starLabel.textContent = '';
  activeFeedbackId = firestoreId;
  selectedRating   = 0;
  updateStarDisplay(0);
  document.getElementById('feedbackComment').value   = '';
  document.getElementById('feedbackError').style.display = 'none';
  document.getElementById('feedbackFormSection').style.display  = 'block';
  document.getElementById('feedbackThankyouSection').style.display = 'none';
  document.getElementById('feedbackModalOverlay').classList.add('open');
};

window.closeFeedbackModal = function() {
  document.getElementById('feedbackModalOverlay').classList.remove('open');
  activeFeedbackId = null;
  selectedRating   = 0;
};

window.selectStar = function(value) {
  selectedRating = value;
  updateStarDisplay(value);
 const starLabel = document.getElementById('starLabel');
  if (starLabel) {
    starLabel.textContent = STAR_LABELS[value];
    starLabel.style.color = '#f59e0b';
  }

  // Trigger bounce on the clicked star and all filled stars
  const stars = document.querySelectorAll('#starRow span');
  stars.forEach((star, i) => {
    if (i < value) {
      star.classList.remove('star-pop');
      // Force reflow so the animation re-triggers even on re-click
      void star.offsetWidth;
      star.classList.add('star-pop');
    }
  });
};

function updateStarDisplay(value) {
  const stars = document.querySelectorAll('#starRow span');
  stars.forEach((star, i) => {
    star.classList.toggle('active', i < value);
    star.style.color = i < value ? '#f59e0b' : '#d1d5db';
  });
}

// Hover effects for stars
document.addEventListener('DOMContentLoaded', () => {
  const starRow = document.getElementById('starRow');
  if (!starRow) return;
  starRow.querySelectorAll('span').forEach((star, i, arr) => {
    star.addEventListener('mouseenter', () => {
      arr.forEach((s, j) => {
        s.style.color = j <= i ? '#f59e0b' : '#d1d5db';
      });
    });
    star.addEventListener('mouseleave', () => {
      updateStarDisplay(selectedRating);
    });
  });
});

window.submitFeedback = async function() {
  const errEl = document.getElementById('feedbackError');
  if (!selectedRating) {
    errEl.textContent = 'Please select a star rating before submitting.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';

  const comment = document.getElementById('feedbackComment').value.trim();
  const submitBtn = document.querySelector('.btn-feedback-submit');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const token = await getFreshToken();
    const res   = await fetch(`/api/requests/${activeFeedbackId}/feedback`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ rating: selectedRating, comment }),
    });

    if (!res.ok) {
      const err = await res.json();
      errEl.textContent  = err.error ?? 'Failed to submit feedback.';
      errEl.style.display = 'block';
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Submit Feedback';
      return;
    }

    // Show thank-you state
    document.getElementById('feedbackFormSection').style.display    = 'none';
    document.getElementById('feedbackThankyouSection').style.display = 'block';
    showToast('✅ Feedback saved — thank you!');

    // Refresh the table row in the background after a short delay
    setTimeout(() => {
      loadRequests();
    }, 1800);

  } catch (err) {
    errEl.textContent  = 'Network error. Please try again.';
    errEl.style.display = 'block';
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Submit Feedback';
  }
};

function showToast(message = '✅ Feedback saved!', duration = 3000) {
  const toast = document.getElementById('feedbackToast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}

// Close modal on overlay click
document.getElementById('feedbackModalOverlay')?.addEventListener('click', function(e) {
  if (e.target === this) closeFeedbackModal();
});

// US3: Close duplicate modal on overlay click
document.getElementById('duplicateModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeDuplicateModal();
});

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