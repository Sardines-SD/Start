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
import { firebaseConfig } from "./firebaseConfig.js";

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

    if (password !== confirmPassword) {
      registerFeedback.textContent = "❌ Passwords do not match.";
      return;
    }
    if (password.length < 6) {
      registerFeedback.textContent = "❌ Password must be at least 6 characters.";
      return;
    }

    registerFeedback.textContent = "Creating account...";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user           = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        username,
        email,
        ward,
        role:      "user",
        createdAt: serverTimestamp(),
      });

      registerFeedback.textContent = "✅ Registered successfully! Redirecting...";
      setTimeout(() => {
        window.location.href = "index.html";
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