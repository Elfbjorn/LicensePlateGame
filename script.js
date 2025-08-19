const stateSelect = document.getElementById("stateSelect");
const submitBtn = document.getElementById("submitBtn");
const result = document.getElementById("result");

// Haversine formula to calculate great-circle distance in miles
function haversine(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth radius in miles
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Filter and sample boundary points to improve performance
function getNearbyPoints(coords, userLat, userLon, sampleRate = 10) {
  const latMin = userLat - 5;
  const latMax = userLat + 5;
  const lonMin = userLon - 5;
  const lonMax = userLon + 5;

  return coords.filter(([lat, lon], index) => {
    return lat >= latMin && lat <= latMax &&
           lon >= lonMin && lon <= lonMax &&
           index % sampleRate === 0;
  });
}

// Calculate minimum distance from user to boundary points
function calculateMinDistance(userLat, userLon, boundaryPoints) {
  let minDist = Infinity;
  boundaryPoints.forEach(([lat, lon]) => {
    const dist = haversine(userLat, userLon, lat, lon);
    if (dist < minDist) minDist = dist;
  });
  return minDist;
}

// Main event handler
submitBtn.addEventListener("click", () => {
  const selectedState = stateSelect.value;
  if (!selectedState) {
    result.textContent = "Please select a state or territory.";
    return;
  }

  if (!navigator.geolocation) {
    result.textContent = "Geolocation not supported.";
    return;
  }

  result.textContent = "Locating...";

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;

    fetch(`state_jsons/${selectedState}.json`)
      .then(res => res.json())
      .then(data => {

        const rawPoints = Array.isArray(data.border_points) ? data.border_points : [];
        const points = rawPoints
          .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
          .map(p => [p.lat, p.lng]); // convert to [lat, lon] format

        
        const nearby = points; // skip filtering for now

        console.log("User location:", latitude, longitude);

        console.log("First boundary point:", nearby[0]);

        
        //const points = Array.isArray(data.coordinates) ? data.coordinates : [];
        //const nearby = getNearbyPoints(points, latitude, longitude, 10);
        const minDistance = calculateMinDistance(latitude, longitude, nearby);
        result.textContent = `Minimum distance to ${selectedState.replace(/_/g, " ")}: ${minDistance.toFixed(1)} miles`;
      })
      .catch(() => {
        result.textContent = "Error loading state boundary data.";
      });

  }, err => {
    result.textContent = `Geolocation error: ${err.message}`;
  });
});
