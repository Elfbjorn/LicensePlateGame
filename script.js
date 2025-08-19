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

// Main function to load JSON and compute distance
async function checkProximity(stateName, userLat, userLon) {
  const filePath = `state_jsons/${stateName.toLowerCase()}.json`;

  try {
    const response = await fetch(filePath);
    if (!response.ok) throw new Error(`Failed to load ${filePath}: ${response.status}`);
    const data = await response.json();

    const points = extractPoints(data);
    console.log("Parsed points:", points);

    if (points.length === 0) {
      console.error("No valid border points found.");
      return;
    }

    const { miles, point } = getClosestDistance(points, userLat, userLon);
    console.log(`Closest point to ${data.state}:`, point);
    console.log(`Distance: ${miles.toFixed(2)} miles`);
  } catch (err) {
    console.error("Error loading or parsing JSON:", err.message);
  }
}

// Example usage: replace with actual geolocation
const userLat = 39.2673;
const userLon = -76.7983;
checkProximity("Alabama", userLat, userLon);
