import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const registerForm     = document.getElementById("registerForm");
const registerFeedback = document.getElementById("registerFeedback");

// Check if user is already logged in - if yes, redirect to appropriate dashboard
onAuthStateChanged(auth, async (user) => {
  if (user) {
    // User is already logged in, redirect to appropriate dashboard
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : "user";
    
    if (role === "admin") {
      window.location.href = "AdminDashboard.html";
    } else if (role === "worker") {
      window.location.href = "WorkerDashboard.html";
    } else {
      window.location.href = "Dashboard.html";
    }
  }
});

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username        = document.getElementById("Username").value.trim();
    const email           = document.getElementById("registerEmail").value.trim();
    const ward            = document.getElementById("nativeWard").value.trim();
    const password        = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerPasswordConfirm").value;

    // Validation
    if (!email) {
      registerFeedback.textContent = "❌ Email is required.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      return;
    }
    if (!ward) {
      registerFeedback.textContent = "❌ Ward number is required.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      return;
    }
    if (password !== confirmPassword) {
      registerFeedback.textContent = "❌ Passwords do not match.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      return;
    }
    if (password.length < 6) {
      registerFeedback.textContent = "❌ Password must be at least 6 characters.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      return;
    }

    registerFeedback.textContent = "Creating account...";
    registerFeedback.style.background = "#e9f2ff";
    registerFeedback.style.borderLeftColor = "#2b5fa8";

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user           = userCredential.user;

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username || email.split('@')[0], // Use email prefix if no username
        email: email,
        ward: ward,
        role: "user",  // Default role for new registrations
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Success message
      registerFeedback.textContent = "✅ Registration successful! Redirecting to login...";
      registerFeedback.style.background = "#d4edda";
      registerFeedback.style.borderLeftColor = "#28a745";

      // Sign out the user so they can log in fresh
      await signOut(auth);
      
      // Redirect to Login page (index.html) after 2 seconds
      setTimeout(() => {
        window.location.href = "index.html";
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      
      const messages = {
        "auth/email-already-in-use": "An account with that email already exists. Please login instead.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
        "auth/operation-not-allowed": "Email/password accounts are not enabled. Please contact support.",
      };
      
      registerFeedback.textContent = "❌ " + (messages[err.code] ?? "Registration failed. Please try again.");
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
    }
  });
}