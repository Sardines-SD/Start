import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  deleteUser as firebaseDeleteUser,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserRole = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));
  currentUserRole = userDoc.exists() ? userDoc.data().role : "user";
  currentUser = user;

  document.getElementById("welcomeMsg").textContent = "Delete Account - " + user.email;
});

window.goBack = function () {
  if (currentUserRole === "admin") {
    window.location.href = "AdminDashboard.html";
  } else if (currentUserRole === "worker") {
    window.location.href = "WorkerDashboard.html";
  } else {
    window.location.href = "Dashboard.html";
  }
};

async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(true);
}

document.getElementById("deleteAccountForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const confirmEmail = document.getElementById("confirmEmail").value.trim();
  const deleteReason = document.getElementById("deleteReason").value.trim();
  const feedback = document.getElementById("deleteFeedback");

  const user = auth.currentUser;
  if (!user) {
    feedback.textContent = "❌ You must be logged in.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
    return;
  }

  if (confirmEmail !== user.email) {
    feedback.textContent = "❌ Email confirmation does not match your account email.";
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
    return;
  }

  const deleteConfirm = prompt(`⚠️ WARNING: This will permanently delete your account and ALL your data!\n\nType "DELETE" to confirm permanent deletion:`);
  if (deleteConfirm !== "DELETE") {
    alert("Deletion cancelled. Type DELETE to confirm.");
    return;
  }

  feedback.textContent = "Deleting account...";
  feedback.style.background = "#e9f2ff";
  feedback.style.borderLeftColor = "#2b5fa8";

  try {
    const token = await getFreshToken();
    const res = await fetch("/api/me", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ reason: deleteReason || "No reason provided" }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Deletion failed");
    }

    feedback.textContent = "✅ Your account has been permanently deleted. Redirecting...";
    feedback.style.background = "#d4edda";
    feedback.style.borderLeftColor = "#28a745";

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);

  } catch (error) {
    console.error("Delete error:", error);
    feedback.textContent = "❌ Failed to delete account: " + error.message;
    feedback.style.background = "#f8d7da";
    feedback.style.borderLeftColor = "#dc3545";
  }
});