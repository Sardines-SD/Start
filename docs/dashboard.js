
if (!localStorage.getItem("user")) {
  window.location.href = "Login.html";
}


function logout() {
  localStorage.removeItem("user");
  window.location.href = "Login.html";
}


document.getElementById("requestForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const category = document.getElementById("category").value;
  const description = document.getElementById("description").value;

  try {
    const res = await fetch("http://localhost:5000/api/requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ category, description })
    });

    if (!res.ok) throw new Error();

    document.getElementById("requestFeedback").innerText = "✅ Request submitted!";
    loadRequests();
  } catch {
    document.getElementById("requestFeedback").innerText = "❌ Failed to submit";
  }
});


async function loadRequests() {
  const res = await fetch("http://localhost:5000/api/requests");
  const data = await res.json();

  const table = document.getElementById("requestsTable");
  table.innerHTML = "";

  data.forEach(req => {
    table.innerHTML += `
      <tr>
        <td>${req.id}</td>
        <td>${req.category}</td>
        <td>${req.description}</td>
        <td>${req.status}</td>
      </tr>
    `;
  });
}

loadRequests();