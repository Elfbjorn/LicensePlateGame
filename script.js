const ALL_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "american_samoa", 
  "commonwealth_of_the_northern_mariana_islands", "district_of_columbia", "guam", 
  "puerto_rico", "united_states_virgin_islands"
];

// Extract lat/lng pairs from GeoJSON coordinates
function extractPoints(data) {
  if (!data.geojson || !data.geojson.coordinates) return [];
  
  const coordinates = data.geojson.coordinates;
  const points = [];
  
  // Handle different GeoJSON geometry types
  if (data.geojson.type === "Polygon") {
    // For Polygon, coordinates[0] is the outer ring
    for (const coord of coordinates[0]) {
      points.push([coord[1], coord[0]]); // [lat, lng] - note the swap from [lng, lat]
    }
  } else if (data.geojson.type === "MultiPolygon") {
    // For MultiPolygon, flatten all polygons
    for (const polygon of coordinates) {
      for (const coord of polygon[0]) { // polygon[0] is the outer ring
        points.push([coord[1], coord[0]]); // [lat, lng] - note the swap from [lng, lat]
      }
    }
  }
  
  return points;
}

// Find closest border point
function getClosestDistance(points, userLat, userLon) {
  if (isNaN(userLat) || isNaN(userLon)) {
    console.warn("Invalid user coordinates:", userLat, userLon);
    return null;
  }

  if (!Array.isArray(points) || points.length === 0) return null;

  let minDistance = Infinity;

  for (const [lat, lon] of points) {
    const dist = haversine(userLat, userLon, lat, lon);
    if (dist < minDistance) minDistance = dist;
  }

  // Convert from kilometers to miles
  return minDistance * 0.621371;
}

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Cached JSON loader
const stateCache = {};

async function checkProximity(stateName, userLat, userLon) {
  try {
    console.log(`Checking proximity for ${stateName}...`);
    
    if (!stateCache[stateName]) {
      const filePath = `state_jsons/${stateName.toLowerCase()}.json`;
      console.log("Fetching:", filePath);

      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status} ${response.statusText}`);
      }
      
      const jsonData = await response.json();
      stateCache[stateName] = jsonData;
      console.log(`Cached data for ${stateName}:`, jsonData);
    }
    
    const points = extractPoints(stateCache[stateName]);
    console.log(`Extracted ${points.length} points for ${stateName}`);
    
    if (points.length === 0) {
      console.warn(`No valid points found for ${stateName}`);
      throw new Error(`No geographic data available for ${stateName}`);
    }
    
    const distance = getClosestDistance(points, userLat, userLon);
    console.log(`Calculated distance for ${stateName}: ${distance} miles`);
    
    return distance;
  } catch (error) {
    console.error(`Error in checkProximity for ${stateName}:`, error);
    throw error; // Re-throw to let the caller handle it
  }
}

// Enhanced geolocation with mobile Safari specific handling
async function getLocationWithFallback() {
  // Mobile Safari specific detection
  const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  const strategies = [
    // Strategy 1: Mobile Safari optimized - very basic request
    () => new Promise((resolve, reject) => {
      const options = isMobileSafari ? {
        enableHighAccuracy: false, // Mobile Safari often fails with high accuracy
        timeout: 15000, // Longer timeout for mobile
        maximumAge: 0
      } : {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      };
      
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    }),
    
    // Strategy 2: Very permissive settings for mobile
    () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 20000, // Very long timeout
        maximumAge: 30000 // Allow slightly cached position
      });
    }),
    
    // Strategy 3: Last resort - accept any cached position
    () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 300000 // Accept 5-minute old position
      });
    })
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      console.log(`Trying geolocation strategy ${i + 1}${isMobileSafari ? ' (Mobile Safari mode)' : ''}...`);
      const position = await strategies[i]();
      console.log(`Strategy ${i + 1} succeeded:`, position.coords.latitude, position.coords.longitude);
      
      // Validate coordinates
      if (Math.abs(position.coords.latitude) > 90 || Math.abs(position.coords.longitude) > 180) {
        throw new Error("Invalid coordinates received");
      }
      
      return position.coords;
    } catch (error) {
      console.log(`Strategy ${i + 1} failed:`, error.message, error.code);
      if (i === strategies.length - 1) {
        throw new Error(`All geolocation strategies failed. Last error: ${error.message} (Code: ${error.code})`);
      }
      // Longer delay between attempts on mobile
      await new Promise(resolve => setTimeout(resolve, isMobileSafari ? 2000 : 1000));
    }
  }
}

// Process location coordinates
async function processLocation(latitude, longitude, stateName) {
  try {
    console.log("Processing location:", latitude, ",", longitude, "for state:", stateName);
    
    // Clear any previous error states
    const button = document.getElementById("submitBtn");
    button.disabled = true;
    button.textContent = "Processing...";
    
    const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);
    console.log("Location label:", label, ", Current state:", currentState);

    const miles = (stateName === currentState)
      ? 0
      : await checkProximity(stateName, latitude, longitude);

    if (typeof miles !== "number") {
      throw new Error("Could not calculate distance to selected state");
    }

    // Get the geojson for map rendering
    const geoJson = stateCache[stateName]?.geojson || null;
    
    // Update the map
    renderMap(latitude, longitude, geoJson);

    // Update the log and table
    const log = updatePlateLog(stateName, label, miles);
    renderTable(log);

    // Show success message
    const stateLabel = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    alert(`Success! You are ${formatNumber(miles)} miles from ${stateLabel}.`);
    
    // Reset the form
    document.getElementById("stateSelect").value = "";
    
  } catch (error) {
    console.error("Error processing location:", error);
    throw error;
  }
}

// Handle manual location input
async function handleManualLocation(stateName) {
  const locationInput = prompt(
    "Enter your location:\n\n" +
    "Examples:\n" +
    "• New York, NY\n" +
    "• 10001\n" +
    "• 40.7128, -74.0060"
  );
  
  if (!locationInput) return;

  try {
    // Check if input looks like coordinates (lat, lng)
    const coordMatch = locationInput.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        await processLocation(lat, lng, stateName);
        return;
      }
    }

    // Otherwise, try to geocode the address
    const coords = await geocodeAddress(locationInput);
    await processLocation(coords.lat, coords.lng, stateName);
    
  } catch (error) {
    alert("Could not find that location. Please try again with a different format.");
    console.error("Manual location error:", error);
  }
}

// Geocode an address to coordinates
async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
    
    const data = await response.json();
    if (data.length === 0) {
      throw new Error("Location not found");
    }
    
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  } catch (error) {
    throw new Error(`Failed to geocode address: ${error.message}`);
  }
}

// Reverse geocode
async function getLocationLabel(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || "";
    const state = data.address?.state || data.address?.region || "";
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

// Format number with commas (e.g., 1234 -> 1,234)
function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

function getTotalScore(log) {
  return Object.values(log).reduce((sum, entry) => sum + entry.miles, 0);
}

// Render table
function renderTable(log) {
  const result = document.getElementById("result");
  const entries = Object.entries(log).sort(([a], [b]) => a.localeCompare(b));

  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const loggedCount = Object.keys(log).length;
  const totalCount = ALL_STATES.length;

  progressBar.value = loggedCount;
  progressText.textContent = `${loggedCount} of ${totalCount} plates logged`;

  let html = `
    <table>
      <thead>
        <tr>
          <th>License Plate</th>
          <th>Your Location</th>
          <th style="text-align: right;">Miles</th>
          <th>&nbsp;</th>
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
        <td style="text-align: right;">${formatNumber(miles)}</td>
        <td><button class="removeBtn" data-state="${state}">X</button></td>
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
      <tr><td colspan="3"><strong>Total Score:</strong> ${formatNumber(getTotalScore(log))} miles</td></tr>
    </tbody>
  </table>
  `;

  result.innerHTML = html;
}

// Main interaction
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");

  button.addEventListener("click", async () => {
    const stateName = select.value;
    if (!stateName) {
      alert("Please select a state first.");
      return;
    }

    if (!navigator.geolocation) {
      alert("Geolocation not supported by this browser.");
      return;
    }

    // Show loading state
    button.disabled = true;
    button.textContent = "Getting location...";

    // Try multiple geolocation strategies
    try {
      const position = await getLocationWithFallback();
      await processLocation(position.latitude, position.longitude, stateName);
    } catch (error) {
      console.error("All geolocation methods failed:", error);
      
      // Check if we're on mobile Safari for better error messages
      const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      let errorMessage = "Automatic location detection failed.";
      
      // Add specific error messages for common mobile Safari issues
      if (isMobileSafari) {
        if (error.message.includes("Code: 1")) {
          errorMessage += "\n\nLocation access was denied. Please:\n1. Go to iOS Settings > Privacy & Security > Location Services\n2. Make sure Location Services is ON\n3. Find Safari and set it to 'While Using App'\n4. Reload this page and try again";
        } else if (error.message.includes("Code: 2")) {
          errorMessage += "\n\nLocation unavailable. Please:\n1. Make sure you have a good GPS/cellular signal\n2. Try moving to an area with better reception\n3. Make sure Location Services is enabled in iOS Settings";
        } else if (error.message.includes("Code: 3")) {
          errorMessage += "\n\nLocation request timed out. This often happens indoors or with poor signal.";
        }
      }
      
      // Offer manual location input as fallback
      const useManual = confirm(
        errorMessage + "\n\nWould you like to enter your location manually?\n\n" +
        "You can enter either:\n" +
        "• City, State (e.g., 'New York, NY')\n" +
        "• ZIP code (e.g., '10001')\n" +
        "• Latitude, Longitude (e.g., '40.7128, -74.0060')"
      );
      
      if (useManual) {
        try {
          await handleManualLocation(stateName);
        } catch (manualError) {
          console.error("Manual location failed:", manualError);
          alert("Failed to process manual location. Please try again.");
        }
      }
    } finally {
      // Always reset button state
      button.disabled = false;
      button.textContent = "Submit";
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the entire log? This cannot be undone.")) {
      localStorage.removeItem("plateLog");
      renderTable({});
    }
  });

  document.getElementById("result").addEventListener("click", e => {
    if (e.target.classList.contains("removeBtn")) {
      const state = e.target.getAttribute("data-state");
      const log = loadPlateLog();
      delete log[state];
      savePlateLog(log);
      renderTable(log);
    }
  });

  // Initial render
  renderTable(loadPlateLog());
});

function renderMap(userLat, userLon, stateGeoJson) {
  // Clear existing map if it exists
  const mapContainer = document.getElementById('map');
  
  // Completely destroy any existing Leaflet map instance
  if (window.currentMap) {
    try {
      window.currentMap.remove();
      window.currentMap = null;
    } catch (e) {
      console.log("Error removing existing map:", e);
    }
  }
  
  // Clear the container HTML
  mapContainer.innerHTML = '';
  
  // Add a small delay to ensure DOM is ready
  setTimeout(() => {
    try {
      const map = L.map('map').setView([userLat, userLon], 6);
      
      // Store reference for cleanup
      window.currentMap = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.marker([userLat, userLon]).addTo(map)
        .bindPopup("You are here")
        .openPopup();

      if (stateGeoJson) {
        L.geoJSON(stateGeoJson, {
          style: {
            color: "#3498db",
            weight: 2,
            fillOpacity: 0.1
          }
        }).addTo(map);
      }
    } catch (error) {
      console.error("Error creating map:", error);
      mapContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Map could not be loaded</p>';
    }
  }, 100);
}
