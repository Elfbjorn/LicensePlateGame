const ALL_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "american_samoa", 
  "commonwealth_of_the_northern_mariana_islands", "district_of_columbia", "guam", 
  "puerto_rico", "united_states_virgin_islands", "alberta", "british_columbia", "manitoba",
  "new_brunswick", "newfoundland_and_labrador", "northwest_territories", "nova_scotia",
  "nunavut", "ontario", "prince_edward_island", "quebec", "saskatchewan", "yukon"
];

// States that appear on the main US map
const MAIN_MAP_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "district_of_columbia",
  "alberta", "british_columbia", "manitoba", "new_brunswick", "newfoundland_and_labrador", 
  "northwest_territories", "nova_scotia", "nunavut", "ontario", "prince_edward_island", 
  "quebec", "saskatchewan", "yukon"
];

// Remote territories for sidebar
const REMOTE_TERRITORIES = [
  "american_samoa", 
  "commonwealth_of_the_northern_mariana_islands", 
  "guam", 
  "puerto_rico", 
  "united_states_virgin_islands"
];

// State layers for the map
let stateMapLayers = {};
let currentMap = null;
const stateCache = {};

// Extract lat/lng pairs from GeoJSON coordinates
function extractPoints(data) {
  if (!data.geojson || !data.geojson.coordinates) return [];
  
  const coordinates = data.geojson.coordinates;
  const points = [];
  
  if (data.geojson.type === "Polygon") {
    for (const coord of coordinates[0]) {
      points.push([coord[1], coord[0]]);
    }
  } else if (data.geojson.type === "MultiPolygon") {
    for (const polygon of coordinates) {
      for (const coord of polygon[0]) {
        points.push([coord[1], coord[0]]);
      }
    }
  }
  
  return points;
}

function getClosestDistance(points, userLat, userLon) {
  if (isNaN(userLat) || isNaN(userLon)) return null;
  if (!Array.isArray(points) || points.length === 0) return null;

  let minDistance = Infinity;
  for (const [lat, lon] of points) {
    const dist = haversine(userLat, userLon, lat, lon);
    if (dist < minDistance) minDistance = dist;
  }
  return minDistance * 0.621371; // Convert km to miles
}

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => deg * Math.PI / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function checkProximity(stateName, userLat, userLon) {
  try {
    if (!stateCache[stateName]) {
      const filePath = `state_jsons/${stateName.toLowerCase()}.json`;
      console.log(`Loading ${filePath}...`);
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status}`);
      }
      stateCache[stateName] = await response.json();
      console.log(`Successfully loaded ${stateName}`);
    }
    
    const points = extractPoints(stateCache[stateName]);

     // ADD THIS DEBUGGING
    if (stateName === 'manitoba') {
      console.log('Manitoba raw coordinates (first 5 points):');
      console.log(points.slice(0, 5));
      console.log('User location:', userLat, userLon);
      
      // Check if coordinates look reasonable for Manitoba
      const firstPoint = points[0];
      if (firstPoint) {
        console.log('First Manitoba point:', firstPoint);
        console.log('Manitoba lat range should be ~49-60, lng range should be ~-102 to -89');
      }
    }

    
    if (points.length === 0) {
      throw new Error(`No geographic data available for ${stateName}`);
    }
    
    return getClosestDistance(points, userLat, userLon);
  } catch (error) {
    console.error(`Error in checkProximity for ${stateName}:`, error);
    throw error;
  }
}

// Simple map initialization - just basic map first
async function initializeMap() {
  const mapContainer = document.getElementById('map');
  
  // Clear existing map
  if (currentMap) {
    try {
      currentMap.remove();
      currentMap = null;
      stateMapLayers = {};
    } catch (e) {
      console.log("Error removing existing map:", e);
    }
  }
  
  mapContainer.innerHTML = '';
  
  try {
    console.log("Creating basic map...");
    
    // Create simple map
    currentMap = L.map('map').setView([39.8283, -98.5795], 3);
    
    // Add gray background
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(currentMap);
    
    console.log("Basic map created, loading all states...");
    
    // Load all main map states
    await loadAllStates();
    
  } catch (error) {
    console.error("Error creating map:", error);
    mapContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Map could not be loaded. Check console for errors.</p>';
  }
}

async function loadAllStates() {
  console.log("Loading all main map states:", MAIN_MAP_STATES.length, "states");
  
  // Load states in smaller batches to avoid overwhelming the browser
  const batchSize = 8;
  let loadedCount = 0;
  
  for (let i = 0; i < MAIN_MAP_STATES.length; i += batchSize) {
    const batch = MAIN_MAP_STATES.slice(i, i + batchSize);
    console.log(`Loading batch ${Math.floor(i/batchSize) + 1}: ${batch.join(', ')}`);
    
    await loadStateBatch(batch);
    loadedCount += batch.length;
    
    console.log(`Loaded ${loadedCount}/${MAIN_MAP_STATES.length} states`);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
  console.log("Finished loading all states. Map layers:", Object.keys(stateMapLayers));
  
  // Update colors based on current log
  const log = loadPlateLog();
  updateMapColors(log);
}

async function loadStateBatch(stateNames) {
  for (const stateName of stateNames) {
    try {
      if (!stateCache[stateName]) {
        const filePath = `state_jsons/${stateName.toLowerCase()}.json`;
        const response = await fetch(filePath);
        
        if (!response.ok) {
          console.error(`Failed to load ${stateName}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        stateCache[stateName] = data;
      }
      
      if (stateCache[stateName] && stateCache[stateName].geojson && currentMap) {
        const layer = L.geoJSON(stateCache[stateName].geojson, {
          style: {
            color: "#666",
            weight: 1,
            fillOpacity: 0.7,
            fillColor: "#e9ecef"
          }
        });
        
        layer.addTo(currentMap);
        stateMapLayers[stateName] = layer;
      }
      
    } catch (error) {
      console.error(`Could not load ${stateName}:`, error);
    }
  }
}

function updateMapColors(log) {
  console.log("Updating map colors for log:", log);
  const loggedStates = new Set(Object.keys(log));
  
  for (const [stateName, layer] of Object.entries(stateMapLayers)) {
    if (layer) {
      const isLogged = loggedStates.has(stateName);
      console.log(`${stateName}: ${isLogged ? 'LOGGED (green)' : 'not logged (gray)'}`);
      
      layer.setStyle({
        fillColor: isLogged ? "#28a745" : "#e9ecef",
        fillOpacity: 0.7,
        color: "#666",
        weight: 2
      });
    }
  }
}

function updateTerritoriesSidebar(log) {
  const territoriesList = document.getElementById("territoriesList");
  if (!territoriesList) {
    console.error("territoriesList element not found");
    return;
  }
  
  const loggedStates = new Set(Object.keys(log));
  
  let html = "";
  for (const territory of REMOTE_TERRITORIES) {
    const isLogged = loggedStates.has(territory);
    const displayName = territory.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const className = isLogged ? "logged" : "not-logged";
    html += `<div class="territory-item ${className}">${displayName}</div>`;
  }
  
  territoriesList.innerHTML = html;
}

// Enhanced geolocation
async function getLocationWithFallback() {
  const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  const strategies = [
    () => new Promise((resolve, reject) => {
      const options = isMobileSafari ? {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 0
      } : {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      };
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    }),
    
    () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 30000
      });
    }),
    
    () => new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 25000,
        maximumAge: 300000
      });
    })
  ];

  for (let i = 0; i < strategies.length; i++) {
    try {
      const position = await strategies[i]();
      if (Math.abs(position.coords.latitude) > 90 || Math.abs(position.coords.longitude) > 180) {
        throw new Error("Invalid coordinates received");
      }
      return position.coords;
    } catch (error) {
      if (i === strategies.length - 1) {
        throw new Error(`All geolocation strategies failed. Last error: ${error.message} (Code: ${error.code})`);
      }
      await new Promise(resolve => setTimeout(resolve, isMobileSafari ? 2000 : 1000));
    }
  }
}

async function processLocation(latitude, longitude, stateName) {
  try {
    console.log(`Processing location: ${latitude}, ${longitude} for ${stateName}`);
    
    const button = document.getElementById("submitBtn");
    button.disabled = true;
    button.textContent = "Processing...";
    
    const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);
    console.log(`Location: ${label}, Current state: ${currentState}`);
    
    const miles = (stateName === currentState) ? 0 : await checkProximity(stateName, latitude, longitude);
    
    if (typeof miles !== "number") {
      throw new Error("Could not calculate distance to selected state");
    }

    const log = updatePlateLog(stateName, label, miles);
    renderTable(log);
    updateMapColors(log);
    updateTerritoriesSidebar(log);

    const stateLabel = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    alert(`Success! You are ${formatNumber(miles)} miles from ${stateLabel}.`);
    
    document.getElementById("stateSelect").value = "";
    
  } catch (error) {
    console.error("Error processing location:", error);
    throw error;
  }
}

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
    const coordMatch = locationInput.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        await processLocation(lat, lng, stateName);
        return;
      }
    }

    const coords = await geocodeAddress(locationInput);
    await processLocation(coords.lat, coords.lng, stateName);
    
  } catch (error) {
    alert("Could not find that location. Please try again with a different format.");
    console.error("Manual location error:", error);
  }
}

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

function loadPlateLog() {
  const raw = localStorage.getItem("plateLog");
  return raw ? JSON.parse(raw) : {};
}

function savePlateLog(log) {
  localStorage.setItem("plateLog", JSON.stringify(log));
}

function updatePlateLog(stateName, locationLabel, miles) {
  const log = loadPlateLog();
  const prev = log[stateName];
  if (!prev || miles > prev.miles) {
    log[stateName] = { location: locationLabel, miles };
    savePlateLog(log);
  }
  return log;
}

function formatNumber(num) {
  return Math.round(num).toLocaleString();
}

function getTotalScore(log) {
  return Object.values(log).reduce((sum, entry) => sum + entry.miles, 0);
}

function renderTable(log) {
  const result = document.getElementById("result");
  const entries = Object.entries(log).sort(([a], [b]) => a.localeCompare(b));

  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const loggedCount = Object.keys(log).length;
  const totalCount = ALL_STATES.length;

  if (progressBar) progressBar.value = loggedCount;
  if (progressText) progressText.textContent = `${loggedCount} of ${totalCount} plates logged`;

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
      <tr><td colspan="4"><strong>Plates not yet logged:</strong> ${missingLabels}</td></tr>
      <tr><td colspan="4"><strong>Total Score:</strong> ${formatNumber(getTotalScore(log))} miles</td></tr>
    </tbody>
  </table>
  `;

  result.innerHTML = html;
}

// Main interaction
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing app...");
  
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");

  // Initialize the map and territories sidebar
  console.log("Initializing map...");
  initializeMap();
  
  console.log("Updating territories sidebar...");
  updateTerritoriesSidebar(loadPlateLog());

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

    button.disabled = true;
    button.textContent = "Getting location...";

    try {
      const position = await getLocationWithFallback();
      await processLocation(position.latitude, position.longitude, stateName);
    } catch (error) {
      console.error("All geolocation methods failed:", error);
      
      const isMobileSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      let errorMessage = "Automatic location detection failed.";
      
      if (isMobileSafari) {
        if (error.message.includes("Code: 1")) {
          errorMessage += "\n\nLocation access was denied. Please:\n1. Go to iOS Settings > Privacy & Security > Location Services\n2. Make sure Location Services is ON\n3. Find Safari and set it to 'While Using App'\n4. Reload this page and try again";
        } else if (error.message.includes("Code: 2")) {
          errorMessage += "\n\nLocation unavailable. Please:\n1. Make sure you have a good GPS/cellular signal\n2. Try moving to an area with better reception\n3. Make sure Location Services is enabled in iOS Settings";
        } else if (error.message.includes("Code: 3")) {
          errorMessage += "\n\nLocation request timed out. This often happens indoors or with poor signal.";
        }
      }
      
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
      button.disabled = false;
      button.textContent = "Submit";
    }
  });

  document.getElementById("resetBtn").addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the entire log? This cannot be undone.")) {
      localStorage.removeItem("plateLog");
      const emptyLog = {};
      renderTable(emptyLog);
      updateMapColors(emptyLog);
      updateTerritoriesSidebar(emptyLog);
    }
  });

  document.getElementById("result").addEventListener("click", e => {
    if (e.target.classList.contains("removeBtn")) {
      const state = e.target.getAttribute("data-state");
      const log = loadPlateLog();
      delete log[state];
      savePlateLog(log);
      renderTable(log);
      updateMapColors(log);
      updateTerritoriesSidebar(log);
    }
  });

  // Initial render
  console.log("Rendering initial table...");
  renderTable(loadPlateLog());
  
  console.log("App initialization complete");
});
