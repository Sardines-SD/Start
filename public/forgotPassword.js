import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getAuth,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./firebaseConfig.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
const feedback = document.getElementById("feedback");

if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("email").value.trim();
        if (!email) {
            feedback.textContent = "Please enter your email address.";
            return;
        }

        feedback.textContent = "Sending password reset email…";

        try {
            await sendPasswordResetEmail(auth, email);
            feedback.textContent = "Password reset email sent. Check your email for instructions.";
            feedback.style.color = "green";
        } catch (err) {
            const messages = {
                "auth/user-not-found": "No account found with that email address.",
                "auth/too-many-requests": "Too many requests. Please try again later.",
                "auth/invalid-email": "Please enter a valid email address.",
            };
            feedback.textContent = messages[err.code] ?? "Unable to send password reset email. Please try again.";
            feedback.style.color = "red";
        }
    });
}