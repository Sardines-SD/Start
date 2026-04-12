import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBsGq_-mPlBAfCtEt3J-SzaMQgpKmHye9E",
  authDomain:        "municipality-50ae8.firebaseapp.com",
  projectId:         "municipality-50ae8",
  storageBucket:     "municipality-50ae8.firebasestorage.app",
  messagingSenderId: "904618138528",
  appId:             "1:904618138528:web:f4bd52b683fe6585dd62c5",
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

const registerForm     = document.getElementById("registerForm");
const registerFeedback = document.getElementById("registerFeedback");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username        = document.getElementById("Username").value.trim();
    const email           = document.getElementById("registerEmail").value.trim();
    const ward            = document.getElementById("nativeWard").value.trim();
    const password        = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("registerPasswordCornfirm").value;

    // ── Validation ────────────────────────────────────────────────────────────
    if (password !== confirmPassword) {
      registerFeedback.textContent = "❌ Passwords do not match.";
      return;
    }
    if (password.length < 6) {
      registerFeedback.textContent = "❌ Password must be at least 6 characters.";
      return;
    }

    registerFeedback.textContent = "Creating account…";

    try {
      // 1. Create user in Firebase Auth — password is hashed automatically
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user           = userCredential.user;

      // 2. Save extra profile info to Firestore users collection
      await setDoc(doc(db, "users", user.uid), {
        username,
        email,
        ward,
        role:      "user",   // to make someone admin: change this to "admin" in Firestore Console
        createdAt: serverTimestamp(),
      });

      registerFeedback.textContent = "✅ Registered successfully! Redirecting…";
      setTimeout(() => {
        window.location.href = "Login.html";
      }, 1500);

    } catch (err) {
      const messages = {
        "auth/email-already-in-use": "An account with that email already exists.",
        "auth/invalid-email":        "Please enter a valid email address.",
        "auth/weak-password":        "Password is too weak. Use at least 6 characters.",
      };
      registerFeedback.textContent =
        "❌ " + (messages[err.code] ?? "Registration failed. Please try again.");
    }
  });
}
