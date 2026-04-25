import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
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

    loginFeedback.innerHTML = "Logging in…";
    loginFeedback.style.background = "#e9f2ff";
    loginFeedback.style.borderLeftColor = "#2b5fa8";

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user document from Firestore
      let userDoc = await getDoc(doc(db, "users", user.uid));
      let userData = userDoc.data();

      // 🔧 FIX: If user is missing providers or hasPassword fields, add them
      if (!userData || !userData.providers || userData.hasPassword === undefined) {
        const hasPasswordField = true;
        await updateDoc(doc(db, "users", user.uid), {
          providers: ["password"],
          hasPassword: hasPasswordField
        });
        userDoc = await getDoc(doc(db, "users", user.uid));
        userData = userDoc.data();
      }

      // 🔐 CHECK CUSTOM EMAIL VERIFICATION FIELD
      if (!userData || !userData.isEmailVerified) {
        localStorage.setItem("pendingUserId", user.uid);
        localStorage.setItem("pendingUserEmail", email);
        
        await auth.signOut();
        
        loginFeedback.innerHTML = "📧 Please verify your email. Redirecting to verification page...";
        loginFeedback.style.background = "#fff3cd";
        loginFeedback.style.borderLeftColor = "#ffc107";
        
        setTimeout(() => {
          window.location.href = "/verify-otp.html";
        }, 2000);
        
        return;
      }

      const role = userData.role || "user";
      const idToken = await user.getIdToken(true);

      localStorage.clear();
      localStorage.setItem("idToken", idToken);
      localStorage.setItem("userEmail", user.email);
      localStorage.setItem("userId", user.uid);
      localStorage.setItem("role", role);

      window.location.href = ROLE_REDIRECT[role] ?? "Dashboard.html";

    } catch (err) {
      console.error("Login error:", err);
      
      const email = document.getElementById("loginEmail").value.trim();
      
      if (err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        try {
          const signInMethods = await fetchSignInMethodsForEmail(auth, email);
          
          if (signInMethods.includes("google.com")) {
            loginFeedback.innerHTML = '🔗 This email is registered with Google. <a href="set-password.html?email=' + encodeURIComponent(email) + '" style="color:#2b5fa8; text-decoration:underline;">Click here to set a password</a> or use "Continue with Google".';
            loginFeedback.style.background = "#fff3cd";
            loginFeedback.style.borderLeftColor = "#ffc107";
            return;
          }
        } catch (fetchError) {
          console.error("Error checking sign-in methods:", fetchError);
        }
      }
      
      const messages = {
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/user-not-found":     "No account found with that email.",
        "auth/wrong-password":     "Incorrect password.",
        "auth/too-many-requests":  "Too many attempts. Please try again later.",
        "auth/invalid-email":      "Please enter a valid email address.",
      };
      loginFeedback.innerHTML = messages[err.code] ?? "Login failed. Please try again.";
      loginFeedback.style.background = "#f8d7da";
      loginFeedback.style.borderLeftColor = "#dc3545";
    }
  });
}

// Google Sign-In with Account Linking
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const loginFeedback = document.getElementById("loginFeedback");
  if (loginFeedback) {
    loginFeedback.innerHTML = "Signing in with Google…";
    loginFeedback.style.background = "#e9f2ff";
    loginFeedback.style.borderLeftColor = "#2b5fa8";
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    let userDoc = await getDoc(doc(db, "users", user.uid));
    let role = "user";

    if (!userDoc.exists()) {
      const existingUserQuery = await db.collection("users").where("email", "==", user.email).get();
      
      if (!existingUserQuery.empty) {
        const existingUserDoc = existingUserQuery.docs[0];
        const existingData = existingUserDoc.data();
        
        const existingProviders = existingData.providers || ["password"];
        if (!existingProviders.includes("google")) {
          existingProviders.push("google");
        }
        
        await setDoc(doc(db, "users", user.uid), {
          ...existingData,
          uid: user.uid,
          providers: existingProviders,
          hasPassword: existingData.hasPassword || true,
          googleLinkedAt: new Date()
        });
        
        role = existingData.role || "user";
        
        loginFeedback.innerHTML = "✅ Account linked! You can now sign in with either Google or email/password.";
        loginFeedback.style.background = "#d4edda";
        
        userDoc = await getDoc(doc(db, "users", user.uid));
      } else {
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          name: user.displayName || "",
          role: "user",
          providers: ["google"],
          hasPassword: false,
          isEmailVerified: true,
          createdAt: new Date(),
          authProvider: "google"
        });
        role = "user";
      }
    } else {
      const userData = userDoc.data();
      if (!userData.providers || userData.hasPassword === undefined) {
        await updateDoc(doc(db, "users", user.uid), {
          providers: ["google"],
          hasPassword: false
        });
      }
      role = userData.role || "user";
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
      loginFeedback.innerHTML = "Google sign-in failed. Please try again.";
      loginFeedback.style.background = "#f8d7da";
      loginFeedback.style.borderLeftColor = "#dc3545";
    }
  }
}

window.signInWithGoogle = signInWithGoogle;