const map = L.map("publicMap").setView([-26.2041, 28.0473], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

async function loadPublicRequests() {
  const table = document.getElementById("publicRequestsTable");

  try {
    const res = await fetch("/api/public/requests");

    if (!res.ok) {
      throw new Error("Failed to load public requests");
    }

    const requests = await res.json();

    updateStats(requests);
    renderTable(requests);
    renderMarkers(requests);

  } catch (error) {
    console.error(error);
    table.innerHTML = `
      <tr>
        <td colspan="6">Failed to load public requests.</td>
      </tr>
    `;
  }
}

function updateStats(requests) {
  document.getElementById("totalRequests").textContent = requests.length;
  document.getElementById("pendingRequests").textContent =
    requests.filter(r => r.status === "pending").length;
  document.getElementById("inProgressRequests").textContent =
    requests.filter(r => r.status === "in-progress").length;
  document.getElementById("resolvedRequests").textContent =
    requests.filter(r => r.status === "resolved").length;
}

function renderMarkers(requests) {
  requests.forEach(req => {
    if (!req.latitude || !req.longitude) return;

    const marker = L.marker([req.latitude, req.longitude]).addTo(map);

    marker.bindPopup(`
      <strong>${escapeHtml(req.category || "Unknown")}</strong><br>
      Status: ${escapeHtml(req.status || "pending")}<br>
      Ward: ${escapeHtml(req.ward || "Unknown")}<br>
      Municipality: ${escapeHtml(req.municipality || "Unknown")}<br>
      Date: ${escapeHtml(req.createdAt || "-")}
    `);
  });
}

function renderTable(requests) {
  const table = document.getElementById("publicRequestsTable");

  if (!requests.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6">No public requests found.</td>
      </tr>
    `;
    return;
  }

  table.innerHTML = requests.map(req => `
    <tr>
      <td>${escapeHtml(req.category || "-")}</td>
      <td>${escapeHtml(shorten(req.description || "-", 80))}</td>
      <td>${escapeHtml(req.ward || "Unknown")}</td>
      <td>${escapeHtml(req.municipality || "Unknown")}</td>
      <td>
        <span class="badge badge-${getStatusClass(req.status)}">
          ${escapeHtml(req.status || "pending")}
        </span>
      </td>
      <td>${escapeHtml(req.createdAt || "-")}</td>
    </tr>
  `).join("");
}

function getStatusClass(status) {
  if (status === "in-progress") return "in-progress";
  if (status === "resolved") return "resolved";
  return "pending";
}

function shorten(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

loadPublicRequests();