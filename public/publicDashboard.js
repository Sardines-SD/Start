let map = null;
let allMarkers = [];
let allRequestsData = [];
let currentDisplayMode = "latest"; // "latest" or "all"

function initMap() {
  map = L.map("publicMap").setView([-26.2041, 28.0473], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);
}

async function loadPublicRequests() {
  const table = document.getElementById("publicRequestsTable");

  try {
    const res = await fetch("/api/public/requests");

    if (!res.ok) {
      throw new Error("Failed to load public requests");
    }

    allRequestsData = await res.json();

    updateStats(allRequestsData);
    renderMarkers(allRequestsData);
    
    // Set up filter checkbox listener
    const hideResolvedCheckbox = document.getElementById("hideResolvedCheckbox");
    if (hideResolvedCheckbox) {
      hideResolvedCheckbox.addEventListener("change", () => {
        renderMarkers(allRequestsData);
      });
    }
    
    // Set up pagination button listeners
    const showLatestBtn = document.getElementById("showLatestBtn");
    const showAllBtn = document.getElementById("showAllBtn");
    
    if (showLatestBtn) {
      showLatestBtn.addEventListener("click", () => {
        currentDisplayMode = "latest";
        renderTable(allRequestsData);
      });
    }
    
    if (showAllBtn) {
      showAllBtn.addEventListener("click", () => {
        currentDisplayMode = "all";
        renderTable(allRequestsData);
      });
    }
    
    // Initial render
    renderTable(allRequestsData);

  } catch (error) {
    console.error(error);
    table.innerHTML = `
      <tr>
        <td colspan="6">Failed to load public requests.<\/td>
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
  // Clear existing markers
  if (allMarkers.length > 0) {
    allMarkers.forEach(marker => map.removeLayer(marker));
    allMarkers = [];
  }

  // Check if we should hide resolved requests
  const hideResolved = document.getElementById("hideResolvedCheckbox")?.checked || false;

  // Filter requests if hideResolved is true
  let requestsToShow = requests;
  if (hideResolved) {
    requestsToShow = requests.filter(req => req.status !== "resolved");
  }

  // Add markers for filtered requests
  requestsToShow.forEach(req => {
    if (!req.latitude || !req.longitude) return;

    // Choose marker color based on status
    let markerColor = "#3b82f6"; // default blue for in-progress
    if (req.status === "pending") markerColor = "#f59e0b"; // orange
    if (req.status === "resolved") markerColor = "#10b981"; // green

    // Create custom marker icon with color
    const customIcon = L.divIcon({
      html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [16, 16],
      className: "custom-marker"
    });

    const marker = L.marker([req.latitude, req.longitude], { icon: customIcon }).addTo(map);

    marker.bindPopup(`
      <strong>${escapeHtml(req.category || "Unknown")}</strong><br>
      Status: <span class="badge badge-${getStatusClass(req.status)}">${escapeHtml(req.status || "pending")}</span><br>
      Ward: ${escapeHtml(req.ward || "Unknown")}<br>
      Municipality: ${escapeHtml(req.municipality || "Unknown")}<br>
      Date: ${escapeHtml(req.createdAt || "-")}
    `);

    allMarkers.push(marker);
  });
}

function renderTable(requests) {
  const table = document.getElementById("publicRequestsTable");
  const tableInfo = document.getElementById("tableInfo");

  if (!requests.length) {
    table.innerHTML = `
      <tr>
        <td colspan="6">No public requests found.<\/td>
      </tr>
    `;
    if (tableInfo) tableInfo.textContent = "";
    return;
  }

  // Sort requests by date (newest first)
  const sortedRequests = [...requests].sort((a, b) => {
    const dateA = new Date(a.createdAt);
    const dateB = new Date(b.createdAt);
    return dateB - dateA;
  });

  // Determine which requests to show
  let requestsToShow = sortedRequests;
  let infoText = "";
  
  if (currentDisplayMode === "latest" && sortedRequests.length > 5) {
    requestsToShow = sortedRequests.slice(0, 5);
    infoText = ` Showing latest 5 of ${sortedRequests.length} requests. Click "Show All" to view all.`;
  } else if (currentDisplayMode === "latest") {
    infoText = ` Showing all ${sortedRequests.length} requests (less than 5 total).`;
  } else {
    infoText = ` Showing all ${sortedRequests.length} requests. Click "Show Latest 5" to see only the most recent.`;
  }
  
  if (tableInfo) tableInfo.textContent = infoText;

  table.innerHTML = requestsToShow.map(req => `
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
  if (!text) return "-";
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

// Initialize
initMap();
loadPublicRequests();