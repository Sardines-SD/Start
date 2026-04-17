import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
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

const loginForm     = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");

const ROLE_REDIRECT = {
  admin:  "AdminDashboard.html",
  worker: "WorkerDashboard.html",
  user:   "Dashboard.html",
};

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginFeedback.textContent = "Logging in…";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user           = userCredential.user;

      // ── Always fetch role fresh from Firestore — never trust a cached value ──
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role    = userDoc.exists() ? userDoc.data().role : "user";
      const idToken = await user.getIdToken(true);

      // Clear old session completely before writing new one
      localStorage.clear();
      localStorage.setItem("idToken",   idToken);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId",    user.uid);
      localStorage.setItem("role",      role);

      // Redirect based on role (all dashboards exist)
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