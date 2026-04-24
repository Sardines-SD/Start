import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebaseConfig.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Get DOM elements
const otpInput = document.getElementById("otpCode");
const verifyBtn = document.getElementById("verifyBtn");
const resendLink = document.getElementById("resendLink");
const messageDiv = document.getElementById("message");
const userEmailSpan = document.getElementById("userEmail");

// Get pending user data from localStorage (set during registration)
const userId = localStorage.getItem("pendingUserId");
const userEmail = localStorage.getItem("pendingUserEmail");

// Display email if available
if (!userId || !userEmail) {
  messageDiv.textContent = "No pending verification found. Please register again.";
  messageDiv.style.background = "#f8d7da";
  messageDiv.style.borderLeftColor = "#dc3545";
  messageDiv.style.padding = "10px";
  messageDiv.style.borderRadius = "6px";
  messageDiv.style.borderLeft = "4px solid #dc3545";
} else {
  userEmailSpan.textContent = userEmail;
}

// Verify OTP button click
verifyBtn.addEventListener("click", async () => {
  const code = otpInput.value.trim();
  
  // Validate input
  if (!code || code.length !== 6) {
    messageDiv.textContent = "Please enter the 6-digit verification code.";
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.borderLeftColor = "#dc3545";
    return;
  }
  
  messageDiv.textContent = "Verifying...";
  messageDiv.style.background = "#e9f2ff";
  messageDiv.style.borderLeftColor = "#2b5fa8";
  
  try {
    // Get the verification document from Firestore
    const verificationRef = doc(db, "emailVerifications", userId);
    const verificationDoc = await getDoc(verificationRef);
    
    // Check if document exists
    if (!verificationDoc.exists()) {
      messageDiv.textContent = "No verification request found. Please register again.";
      messageDiv.style.background = "#f8d7da";
      messageDiv.style.borderLeftColor = "#dc3545";
      return;
    }
    
    const data = verificationDoc.data();
    const now = new Date();
    const expiresAt = data.expiresAt.toDate(); // Convert Firestore timestamp to Date
    
    // Check if code has expired
    if (now > expiresAt) {
      messageDiv.textContent = "Code has expired. Please request a new one.";
      messageDiv.style.background = "#f8d7da";
      messageDiv.style.borderLeftColor = "#dc3545";
      return;
    }
    
    // Check if code matches
    if (data.code !== code) {
      messageDiv.textContent = "Incorrect code. Please try again.";
      messageDiv.style.background = "#f8d7da";
      messageDiv.style.borderLeftColor = "#dc3545";
      return;
    }
    
    // Code is correct — mark user as verified in users collection
    await updateDoc(doc(db, "users", userId), {
      isEmailVerified: true,
      verifiedAt: new Date()
    });
    
    // Delete the verification code document (clean up)
    await deleteDoc(verificationRef);
    
    // Clear pending data from localStorage
    localStorage.removeItem("pendingUserId");
    localStorage.removeItem("pendingUserEmail");
    
    // Success message
    messageDiv.textContent = "✅ Email verified successfully! Redirecting to login...";
    messageDiv.style.background = "#d4edda";
    messageDiv.style.borderLeftColor = "#28a745";
    
    // Redirect to login page after 2 seconds
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
    
  } catch (error) {
    console.error("Verification error:", error);
    messageDiv.textContent = "Verification failed. Please try again.";
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.borderLeftColor = "#dc3545";
  }
});

// Resend OTP link click
resendLink.addEventListener("click", async (e) => {
  e.preventDefault();
  
  messageDiv.textContent = "Sending new code...";
  messageDiv.style.background = "#e9f2ff";
  messageDiv.style.borderLeftColor = "#2b5fa8";
  
  try {
    // Generate new 6-digit code
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set new expiry (15 minutes from now)
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(newExpiresAt.getMinutes() + 15);
    
    // Update Firestore with new code and expiry
    const verificationRef = doc(db, "emailVerifications", userId);
    await updateDoc(verificationRef, {
      code: newCode,
      expiresAt: newExpiresAt,
      createdAt: new Date()
    });
    
    // Log to console for testing
    console.log("=========================================");
    console.log("NEW VERIFICATION CODE FOR:", userEmail);
    console.log("NEW CODE:", newCode);
    console.log("Expires at:", newExpiresAt.toLocaleTimeString());
    console.log("=========================================");
    
    // Send email with new code
    try {
      const emailResponse = await fetch('/api/send-verification-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          code: newCode,
          name: ""
        }),
      });
      
      if (emailResponse.ok) {
        console.log("New verification email sent successfully");
        messageDiv.textContent = "New verification code sent! Check your email.";
        messageDiv.style.background = "#d4edda";
        messageDiv.style.borderLeftColor = "#28a745";
      } else {
        console.error("Failed to send verification email");
        messageDiv.textContent = "Failed to send new code. Please try again.";
        messageDiv.style.background = "#f8d7da";
        messageDiv.style.borderLeftColor = "#dc3545";
      }
    } catch (emailError) {
      console.error("Resend email error:", emailError);
      messageDiv.textContent = "Failed to send code. Please try again.";
      messageDiv.style.background = "#f8d7da";
      messageDiv.style.borderLeftColor = "#dc3545";
    }
    
  } catch (error) {
    console.error("Resend error:", error);
    messageDiv.textContent = "Failed to resend code. Please try again.";
    messageDiv.style.background = "#f8d7da";
    messageDiv.style.borderLeftColor = "#dc3545";
  }
});