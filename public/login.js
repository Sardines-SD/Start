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

// Email/Password Login
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginFeedback.textContent = "Logging in…";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user           = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role    = userDoc.exists() ? userDoc.data().role : "user";
      const idToken = await user.getIdToken(true);

      localStorage.clear();
      localStorage.setItem("idToken",   idToken);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId",    user.uid);
      localStorage.setItem("role",      role);

      window.location.href = ROLE_REDIRECT[role] ?? "Dashboard.html";

    } catch (err) {
      const messages = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found":     "No account found with that email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Please try again later.",
        "auth/invalid-email":      "Please enter a valid email address.",
      };
      loginFeedback.textContent =
        messages[err.code] ?? "Login failed. Please try again.";
    }
  });
}

// Google Sign-In
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const loginFeedback = document.getElementById("loginFeedback");
  if (loginFeedback) loginFeedback.textContent = "Signing in with Google…";

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore
    const userDoc = await getDoc(doc(db, "users", user.uid));
    
    let role = "user";

    if (!userDoc.exists()) {
      // New user — create Firestore document with default role "user"
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        name: user.displayName || "",
        role: "user",
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

    // Redirect based on role
    window.location.href = ROLE_REDIRECT[role] ?? "Dashboard.html";

  } catch (err) {
    console.error("Google sign-in error:", err);
    if (loginFeedback) {
      loginFeedback.textContent = "Google sign-in failed. Please try again.";
    }
  }
}

// Attach to window for HTML button to access
window.signInWithGoogle = signInWithGoogle;