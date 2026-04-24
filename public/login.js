import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const loginForm     = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");

const ROLE_REDIRECT = {
  admin:  "AdminDashboard.html",
  worker: "WorkerDashboard.html",
  user:   "Dashboard.html",
};

// Email/Password Login with Auto-Redirect to Verify Page
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginFeedback.textContent = "Logging in…";
    loginFeedback.style.background = "#e9f2ff";
    loginFeedback.style.borderLeftColor = "#2b5fa8";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const userData = userDoc.data();

      // 🔐 CHECK CUSTOM EMAIL VERIFICATION FIELD
      if (!userData || !userData.isEmailVerified) {
        // Store pending info in localStorage for verification page
        localStorage.setItem("pendingUserId", user.uid);
        localStorage.setItem("pendingUserEmail", email);
        
        // Sign them out
        await auth.signOut();
        
        loginFeedback.textContent = "📧 Please verify your email. Redirecting to verification page...";
        loginFeedback.style.background = "#fff3cd";
        loginFeedback.style.borderLeftColor = "#ffc107";
        
        // Auto-redirect to verify page after 2 seconds
        setTimeout(() => {
          window.location.href = "/verify-otp.html";
        }, 2000);
        
        return; // Stop login process
      }

      // Email is verified — proceed with normal login
      const role = userData.role || "user";
      const idToken = await user.getIdToken(true);

      localStorage.clear();
      localStorage.setItem("idToken",   idToken);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId",    user.uid);
      localStorage.setItem("role",      role);

      window.location.href = ROLE_REDIRECT[role] ?? "Dashboard.html";

    } catch (err) {
      console.error("Login error:", err);
      const messages = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found":     "No account found with that email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Please try again later.",
        "auth/invalid-email":      "Please enter a valid email address.",
      };
      loginFeedback.textContent = messages[err.code] ?? "Login failed. Please try again.";
      loginFeedback.style.background = "#f8d7da";
      loginFeedback.style.borderLeftColor = "#dc3545";
    }
  });
}

// Google Sign-In (email is auto-verified by Google)
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const loginFeedback = document.getElementById("loginFeedback");
  if (loginFeedback) {
    loginFeedback.textContent = "Signing in with Google…";
    loginFeedback.style.background = "#e9f2ff";
    loginFeedback.style.borderLeftColor = "#2b5fa8";
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Google users are automatically considered verified
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    let role = "user";

    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        name: user.displayName || "",
        role: "user",
        isEmailVerified: true,  // Google users are pre-verified
        createdAt: new Date(),
        authProvider: "google",
      });
      role = "user";
    } else {
      role = userDoc.data().role;
    }

    const idToken = await user.getIdToken(true);

    localStorage.clear();
    localStorage.setItem("idToken", idToken);
    localStorage.setItem("userEmail", user.email);
    localStorage.setItem("userId", user.uid);
    localStorage.setItem("role", role);

    window.location.href = ROLE_REDIRECT[role] ?? "Dashboard.html";

  } catch (err) {
    console.error("Google sign-in error:", err);
    if (loginFeedback) {
      loginFeedback.textContent = "Google sign-in failed. Please try again.";
      loginFeedback.style.background = "#f8d7da";
      loginFeedback.style.borderLeftColor = "#dc3545";
    }
  }
}

window.signInWithGoogle = signInWithGoogle;