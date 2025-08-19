// Haversine formula to calculate distance in miles
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Extract [lat, lon] pairs from your JSON structure
function extractPoints(data) {
  if (!Array.isArray(data.border_points)) return [];
  return data.border_points
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => [p.lat, p.lng]);
}

// Find the closest border point to the user's location
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
    if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.status}`);
    const data = await response.json();

    const points = extractPoints(data);
    if (points.length === 0) return null;

    const miles = getClosestDistance(points, userLat, userLon);
    return miles;
  } catch (err) {
    console.error("Error loading or parsing JSON:", err.message);
    return null;
  }
}

// Reverse geocode to get city/state
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

// DOM interaction
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");
  const result = document.getElementById("result");

  button.addEventListener("click", async () => {
    const stateName = select.value;
    if (!stateName) {
      result.innerHTML = "<tr><td colspan='3'>Please select a state.</td></tr>";
      return;
    }

    if (!navigator.geolocation) {
      result.innerHTML = "<tr><td colspan='3'>Geolocation not supported.</td></tr>";
      return;
    }

    navigator.geolocation.getCurrentPosition(async pos => {
      const { latitude, longitude } = pos.coords;
      const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);

      const miles = (stateName === currentState)
        ? 0
        : await checkProximity(stateName, latitude, longitude);

      const updatedMap = updateScore(stateName, miles);
      const totalScore = getTotalScore(updatedMap).toFixed(2);

      const displayMiles = (typeof miles === "number") ? miles.toFixed(2) : "N/A";
      const targetLabel = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());


      result.innerHTML = `
      <tr><th>Your location</th><th>Lat/Lng</th><th>Miles from ${targetLabel}</th></tr>
      <tr>
        <td>${label}</td>
        <td>${latitude.toFixed(4)}, ${longitude.toFixed(4)}</td>
        <td>${displayMiles}</td>
      </tr>
      <tr><td colspan="3"><strong>Total Score:</strong> ${totalScore} miles</td></tr>
      `;
    }, err => {
      result.innerHTML = `<tr><td colspan='3'>Geolocation error: ${err.message}</td></tr>`;
    });
  });
});

// Load scoreMap from localStorage or initialize
function loadScoreMap() {
  const raw = localStorage.getItem("scoreMap");
  return raw ? JSON.parse(raw) : {};
}

// Save scoreMap to localStorage
function saveScoreMap(map) {
  localStorage.setItem("scoreMap", JSON.stringify(map));
}

// Update scoreMap with new distance
function updateScore(stateName, miles) {
  const map = loadScoreMap();
  const prev = map[stateName] || 0;
  if (miles > prev) {
    map[stateName] = miles;
    saveScoreMap(map);
  }
  return map;
}

// Calculate total score
function getTotalScore(map) {
  return Object.values(map).reduce((sum, val) => sum + val, 0);
}
