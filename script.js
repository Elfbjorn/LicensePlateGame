const stateSelect = document.getElementById("stateSelect");
const submitBtn = document.getElementById("submitBtn");
const result = document.getElementById("result");

// Full list of state/territory filenames (without .json)
const stateFiles = [
  "alabama", "alaska", "american_samoa", "arizona", "arkansas", "california",
  "colorado", "commonwealth_of_the_northern_mariana_islands", "connecticut",
  "delaware", "district_of_columbia", "florida", "georgia", "guam", "hawaii",
  "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new_hampshire", "new_jersey",
  "new_mexico", "new_york", "north_carolina", "north_dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "puerto_rico", "rhode_island",
  "south_carolina", "south_dakota", "tennessee", "texas",
  "united_states_virgin_islands", "utah", "vermont", "virginia",
  "washington", "west_virginia", "wisconsin", "wyoming"
];

// Populate dropdown
stateFiles.forEach(state => {
  const option = document.createElement("option");
  option.value = state;
  option.textContent = state.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  stateSelect.appendChild(option);
});

// Haversine formula for great-circle distance
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

// Filter and sample boundary points for performance
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

  navigator.geolocation.getCurrentPosition(pos => {
    const { latitude, longitude } = pos.coords;

    fetch(`state_jsons/${selectedState}.json`)
      .then(res => res.json())
      .then(data => {
        const points = Array.isArray(data.coordinates) ? data.coordinates : [];
        const nearby = getNearbyPoints(points, latitude, longitude, 10);
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
