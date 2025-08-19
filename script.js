const ALL_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming"
];

// Haversine formula
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract lat/lng pairs
function extractPoints(data) {
  if (!Array.isArray(data.border_points)) return [];
  return data.border_points
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => [p.lat, p.lng]);
}

// Find closest border point
function getClosestDistance(points, userLat, userLon) {
  let minDist = Infinity;
  for (const [lat, lon] of points) {
    const dist = haversine(userLat, userLon, lat, lon);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// Load JSON and compute distance
async function checkProximity(stateName, userLat, userLon) {
  const filePath = `state_jsons/${stateName.toLowerCase()}.json`;
  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}`);
    const data = await response.json();
    const points = extractPoints(data);
    if (points.length === 0) return null;
    return getClosestDistance(points, userLat, userLon);
  } catch (err) {
    console.error("Error loading JSON:", err.message);
    return null;
  }
}

// Reverse geocode
async function getLocationLabel(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const city = data.address.city || data.address.town || data.address.village || "";
    const state = data.address.state || data.address.region || "";
    return { label: `${city}, ${state}`, stateName: state.toLowerCase().replace(/\s+/g, "_") };
  } catch (err) {
    console.warn("Reverse geocoding failed:", err.message);
    return { label: "Unknown location", stateName: "" };
  }
}

// Load plate log
function loadPlateLog() {
  const raw = localStorage.getItem("plateLog");
  return raw ? JSON.parse(raw) : {};
}

// Save plate log
function savePlateLog(log) {
  localStorage.setItem("plateLog", JSON.stringify(log));
}

// Update log with max score
function updatePlateLog(stateName, locationLabel, miles) {
  const log = loadPlateLog();
  const prev = log[stateName];
  if (!prev || miles > prev.miles) {
    log[stateName] = { location: locationLabel, miles };
    savePlateLog(log);
  }
  return log;
}

// Render table
function renderTable(log) {
  const result = document.getElementById("result");
  const entries = Object.entries(log)
    .sort(([a], [b]) => a.localeCompare(b));

  let html = `
    <table>
      <thead>
        <tr>
          <th>License Plate</th>
          <th>Your Location</th>
          <th>Number of Miles</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [state, { location, miles }] of entries) {
    const label = state.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    html += `
      <tr>
        <td>${label}</td>
        <td>${location}</td>
        <td>${miles.toFixed(0)}</td>
      </tr>
    `;
  }

  const loggedStates = new Set(Object.keys(log));
  const missingStates = ALL_STATES.filter(s => !loggedStates.has(s));
  const missingLabels = missingStates
    .map(s => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()))
    .join(", ");

  html += `
      <tr><td colspan="3"><strong>States not yet logged:</strong> ${missingLabels}</td></tr>
    </tbody>
  </table>
  `;

  result.innerHTML = html;
}

// Main interaction
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");

  button.addEventListener("click", () => {
    const stateName = select.value;
    if (!stateName) return;

    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;

      const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);

      const miles = (stateName === currentState)
        ? 0
        : await checkProximity(stateName, latitude, longitude);

      if (typeof miles !== "number") {
        alert("Could not calculate distance.");
        return;
      }

      const log = updatePlateLog(stateName, label, miles);
      renderTable(log);
    }, err => {
      alert("Geolocation error: " + err.message);
    });
  });

  // Initial render
  renderTable(loadPlateLog());
});
