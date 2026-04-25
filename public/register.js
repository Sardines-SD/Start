import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
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

let isRegistering = false;

onAuthStateChanged(auth, async (user) => {
  if (user && !isRegistering) {
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
    isRegistering = true;

    const username        = document.getElementById("Username").value.trim();
    const email           = document.getElementById("registerEmail").value.trim();
    const ward            = document.getElementById("nativeWard").value.trim();
    const password        = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerPasswordConfirm").value;

    if (!email) {
      registerFeedback.innerHTML = "❌ Email is required.";
      registerFeedback.style.background = "#f8d7da";
      isRegistering = false;
      return;
    }
    if (!ward) {
      registerFeedback.innerHTML = "❌ Ward number is required.";
      registerFeedback.style.background = "#f8d7da";
      isRegistering = false;
      return;
    }
    if (password !== confirmPassword) {
      registerFeedback.innerHTML = "❌ Passwords do not match.";
      registerFeedback.style.background = "#f8d7da";
      isRegistering = false;
      return;
    }
    if (password.length < 6) {
      registerFeedback.innerHTML = "❌ Password must be at least 6 characters.";
      registerFeedback.style.background = "#f8d7da";
      isRegistering = false;
      return;
    }

    registerFeedback.innerHTML = "Checking account...";
    registerFeedback.style.background = "#e9f2ff";

    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      
      if (signInMethods.includes("google.com")) {
        registerFeedback.innerHTML = '🔗 This email is registered with Google. <a href="set-password.html?email=' + encodeURIComponent(email) + '" style="color:#2b5fa8; text-decoration:underline;">Click here to set a password</a> or use "Continue with Google" to sign in.';
        registerFeedback.style.background = "#fff3cd";
        registerFeedback.style.borderLeftColor = "#ffc107";
        isRegistering = false;
        return;
      }
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15);
      
      await setDoc(doc(db, "emailVerifications", user.uid), {
        userId: user.uid,
        email: email,
        code: otpCode,
        expiresAt: expiresAt,
        createdAt: new Date(),
        verified: false
      });

      await setDoc(doc(db, "users", user.uid), {
        username: username || email.split('@')[0],
        email: email,
        ward: ward,
        role: "user",
        isEmailVerified: false,
        providers: ["password"],
        hasPassword: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      localStorage.setItem("pendingUserId", user.uid);
      localStorage.setItem("pendingUserEmail", email);
      
      console.log("VERIFICATION CODE:", otpCode);

      try {
        await fetch('/api/send-verification-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, code: otpCode, name: username })
        });
      } catch (emailError) {
        console.error("Email error:", emailError);
      }
      
      registerFeedback.innerHTML = "✅ Account created! A verification code has been sent to " + email + ". Redirecting...";
      registerFeedback.style.background = "#d4edda";

      await signOut(auth);
      
      setTimeout(() => {
        window.location.href = "/verify-otp.html";
      }, 2000);

    } catch (err) {
      console.error("Registration error:", err);
      
      const messages = {
        "auth/email-already-in-use": "An account with that email already exists. Please login instead.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Password is too weak. Use at least 6 characters.",
        "auth/operation-not-allowed": "Email/password accounts are not enabled.",
      };
      
      registerFeedback.innerHTML = "❌ " + (messages[err.code] ?? "Registration failed. Please try again.");
      registerFeedback.style.background = "#f8d7da";
      isRegistering = false;
    }
  });
}