// Haversine formula to calculate distance in miles
function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles

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
  let closestPoint = null;

  for (const [lat, lon] of points) {
    const dist = haversine(userLat, userLon, lat, lon);
    if (dist < minDist) {
      minDist = dist;
      closestPoint = [lat, lon];
    }
  }

  return { miles: minDist, point: closestPoint };
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

    const { miles } = getClosestDistance(points, userLat, userLon);
    return miles;
  } catch (err) {
    console.error("Error loading or parsing JSON:", err.message);
    return null;
  }
}

// DOM interaction
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");
  const result = document.getElementById("result");

  const userLat = 39.2673;
  const userLon = -76.7983;

  button.addEventListener("click", async () => {
    const stateName = select.value;
    if (!stateName) {
      result.textContent = "Please select a state.";
      return;
    }

    const distance = await checkProximity(stateName, userLat, userLon);
    if (typeof distance === "number") {
      result.textContent = `Distance: ${distance.toFixed(2)} miles`;
    } else {
      result.textContent = "Could not calculate distance.";
    }
  });
});
