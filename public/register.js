const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("registerEmail").value;
    const password = document.getElementById("registerPassword").value;

    try {
      const res = await fetch("http://localhost:5000/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
            document.getElementById("registerFeedback").innerText ="✅ Registered successfully! Redirecting...";
                setTimeout(() => {
                    window.location.href = "Login.html";
                }, 1500);
    } else {
        document.getElementById("registerFeedback").innerText = data.error;
      }
    } catch (err) {
      console.error(err);
    }
  });
}