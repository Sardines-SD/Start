import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userEmailSpan = document.getElementById("userEmail");
const newPasswordInput = document.getElementById("newPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const setPasswordBtn = document.getElementById("setPasswordBtn");
const messageDiv = document.getElementById("message");

// Get email from URL parameter or localStorage
const urlParams = new URLSearchParams(window.location.search);
const email = urlParams.get("email") || localStorage.getItem("pendingGoogleEmail");

if (!email) {
  messageDiv.textContent = "No email provided. Please go back and try again.";
  messageDiv.style.background = "#f8d7da";
} else {
  userEmailSpan.textContent = email;
}

setPasswordBtn.addEventListener("click", async () => {
  const newPassword = newPasswordInput.value.trim();
  const confirmPassword = confirmPasswordInput.value.trim();
  
  if (!newPassword || newPassword.length < 6) {
    messageDiv.textContent = "Password must be at least 6 characters.";
    messageDiv.style.background = "#f8d7da";
    return;
  }
  
  if (newPassword !== confirmPassword) {
    messageDiv.textContent = "Passwords do not match.";
    messageDiv.style.background = "#f8d7da";
    return;
  }
  
  messageDiv.textContent = "Setting password...";
  messageDiv.style.background = "#e9f2ff";
  
  try {
    // Sign in with Google to verify ownership
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    if (user.email !== email) {
      messageDiv.textContent = "Please sign in with the correct Google account.";
      messageDiv.style.background = "#f8d7da";
      return;
    }
    
    // Call backend to set password
    const response = await fetch('/api/set-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: newPassword })
    });
    
    if (!response.ok) {
      throw new Error("Failed to set password");
    }
    
    // Update Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const existingData = userDoc.data();
    const providers = existingData.providers || [];
    
    if (!providers.includes("password")) {
      providers.push("password");
    }
    
    await updateDoc(doc(db, "users", user.uid), {
      providers: providers,
      hasPassword: true,
      updatedAt: new Date()
    });
    
    messageDiv.textContent = "✅ Password set successfully! You can now log in with email/password or Google.";
    messageDiv.style.background = "#d4edda";
    
    // Clear stored data
    localStorage.removeItem("pendingGoogleEmail");
    
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    
  } catch (error) {
    console.error("Set password error:", error);
    messageDiv.textContent = "Failed to set password. Please try again.";
    messageDiv.style.background = "#f8d7da";
  }
});