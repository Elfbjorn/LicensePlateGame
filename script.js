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

// States that appear on the main US map
const MAIN_MAP_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "district_of_columbia"
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

    // Update the log and table
    const log = updatePlateLog(stateName, label, miles);
    renderTable(log);
    
    // Update the map to show the newly logged state
    updateMapColors(log);
    
    // Update territories sidebar
    updateTerritoriesSidebar(log);

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

// Initialize the US map with all states
async function initializeMap() {
  // Clear existing map if it exists
  const mapContainer = document.getElementById('map');
  
  if (currentMap) {
    try {
      currentMap.remove();
      currentMap = null;
    } catch (e) {
      console.log("Error removing existing map:", e);
    }
  }
  
  mapContainer.innerHTML = '';
  
  try {
    // Create map centered on continental US
    currentMap = L.map('map', {
      zoomControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      dragging: false
    }).setView([39.8283, -98.5795], 4);
    
    // Load and display all state boundaries
    for (const stateName of MAIN_MAP_STATES) {
      try {
        if (!stateCache[stateName]) {
          const filePath = `state_jsons/${stateName.toLowerCase()}.json`;
          const response = await fetch(filePath);
          if (response.ok) {
            stateCache[stateName] = await response.json();
          }
        }
        
        if (stateCache[stateName] && stateCache[stateName].geojson) {
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
        console.warn(`Could not load ${stateName}:`, error);
      }
    }
    
    // Update colors based on current log
    const log = loadPlateLog();
    updateMapColors(log);
    
  } catch (error) {
    console.error("Error creating map:", error);
    mapContainer.innerHTML = '<p style="padding: 20px; text-align: center;">Map could not be loaded</p>';
  }
}

// Update map colors based on logged states
function updateMapColors(log) {
  const loggedStates = new Set(Object.keys(log));
  
  for (const [stateName, layer] of Object.entries(stateMapLayers)) {
    if (layer) {
      const isLogged = loggedStates.has(stateName);
      layer.setStyle({
        fillColor: isLogged ? "#28a745" : "#e9ecef",
        fillOpacity: 0.7,
        color: "#666",
        weight: 1
      });
    }
  }
}

// Update territories sidebar
function updateTerritoriesSidebar(log) {
  const territoriesList = document.getElementById("territoriesList");
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
    .join(
