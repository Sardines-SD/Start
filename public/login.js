import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

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

const loginForm     = document.getElementById("loginForm");
const loginFeedback = document.getElementById("loginFeedback");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    loginFeedback.textContent = "Logging in…";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken        = await userCredential.user.getIdToken();

      localStorage.setItem("idToken",   idToken);
      localStorage.setItem("userEmail", userCredential.user.email);
      localStorage.setItem("userId",    userCredential.user.uid);

      window.location.href = "Dashboard.html";
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

