import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let userData = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  currentUser = user;
  
  const userDoc = await getDoc(doc(db, "users", user.uid));
  userData = userDoc.exists() ? userDoc.data() : {};
  
  // Check if user has no ward
  const hasNoWard = !userData.ward || userData.ward === "";
  
  if (hasNoWard) {
    document.getElementById("warningBanner").style.display = "block";
  }
  
  loadProfileData();
});

window.goBack = function () {
  window.location.href = "Dashboard.html";
};

async function loadProfileData() {
  document.getElementById("profileEmail").value = currentUser.email || "";
  document.getElementById("profileUsername").value = userData.username || "";
  document.getElementById("profileWard").value = userData.ward || "";
  document.getElementById("profileRole").value = userData.role || "user";
  document.getElementById("profileProvider").value = userData.provider || "email/password";
  
  if (userData.createdAt) {
    const date = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
    document.getElementById("profileCreatedAt").value = date.toLocaleDateString();
  } else {
    document.getElementById("profileCreatedAt").value = "Unknown";
  }
}

document.getElementById("profileForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const username = document.getElementById("profileUsername").value.trim();
  const ward = document.getElementById("profileWard").value;
  const feedback = document.getElementById("profileFeedback");
  
  if (!ward) {
    feedback.textContent = "Please enter your ward number.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
    return;
  }
  
  // Validate ward is a number
  const wardNumber = parseInt(ward);
  if (isNaN(wardNumber) || wardNumber <= 0) {
    feedback.textContent = "Please enter a valid ward number (e.g., 73).";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
    return;
  }
  
  feedback.textContent = "Saving...";
  feedback.style.background = "#e9f2ff";
  feedback.style.borderLeftColor = "#2b5fa8";
  
  try {
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      username: username || currentUser.email.split('@')[0],
      ward: wardNumber,
      updatedAt: new Date()
    });
    
    feedback.textContent = "✅ Profile updated successfully!";
    feedback.style.background = "#d4edda";
    feedback.style.borderLeftColor = "#28a745";
    
    setTimeout(() => {
      window.location.href = "Dashboard.html";
    }, 1500);
    
  } catch (error) {
    console.error("Update error:", error);
    feedback.textContent = "Failed to update profile. Please try again.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
  }
});