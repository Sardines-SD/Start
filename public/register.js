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

let isRegistering = false;  // Flag to prevent auto-redirect during registration

// Check if user is already logged in - if yes, redirect to appropriate dashboard
onAuthStateChanged(auth, async (user) => {
  if (user && !isRegistering) {  // Only redirect if NOT in registration process
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
    isRegistering = true;  // Prevent auto-redirect

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
      isRegistering = false;
      return;
    }
    if (!ward) {
      registerFeedback.textContent = "❌ Ward number is required.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      isRegistering = false;
      return;
    }
    if (password !== confirmPassword) {
      registerFeedback.textContent = "❌ Passwords do not match.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      isRegistering = false;
      return;
    }
    if (password.length < 6) {
      registerFeedback.textContent = "❌ Password must be at least 6 characters.";
      registerFeedback.style.background = "#f8d7da";
      registerFeedback.style.borderLeftColor = "#dc3545";
      isRegistering = false;
      return;
    }

    registerFeedback.textContent = "Creating account...";
    registerFeedback.style.background = "#e9f2ff";
    registerFeedback.style.borderLeftColor = "#2b5fa8";

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiry to 15 minutes from now
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      
      // Save OTP to emailVerifications collection
      await setDoc(doc(db, "emailVerifications", user.uid), {
        userId: user.uid,
        email: email,
        code: otpCode,
        expiresAt: expiresAt,
        createdAt: new Date(),
        verified: false
      });

      // Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: username || email.split('@')[0],
        email: email,
        ward: ward,
        role: "user",
        isEmailVerified: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Store pending user info in localStorage for verification page
      localStorage.setItem("pendingUserId", user.uid);
      localStorage.setItem("pendingUserEmail", email);
      
      // Log OTP to console for testing
      console.log("=========================================");
      console.log("VERIFICATION CODE FOR:", email);
      console.log("CODE:", otpCode);
      console.log("Expires at:", expiresAt.toLocaleTimeString());
      console.log("=========================================");

      // Send email with OTP
      try {
        const emailResponse = await fetch('/api/send-verification-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            code: otpCode,
            name: username || email.split('@')[0]
          }),
        });
        
        if (emailResponse.ok) {
          console.log("Verification email sent successfully");
        } else {
          console.error("Failed to send verification email");
        }
      } catch (emailError) {
        console.error("Email sending error:", emailError);
      }
      
      registerFeedback.textContent = "✅ Account created! A verification code has been sent to " + email + ". Redirecting to verification page...";
      registerFeedback.style.background = "#d4edda";
      registerFeedback.style.borderLeftColor = "#28a745";

      // Sign out the user so they can't access dashboard
      await signOut(auth);
      
      // Redirect to OTP verification page
      setTimeout(() => {
        window.location.href = "/verify-otp.html";
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
      isRegistering = false;
    }
  });
}