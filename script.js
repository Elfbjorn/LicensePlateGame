const ALL_STATES = [
  // US States
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "district_of_columbia",
  // US Territories  
  "american_samoa", "commonwealth_of_the_northern_mariana_islands", "guam", 
  "puerto_rico", "united_states_virgin_islands",
  // Canadian Provinces/Territories
  "alberta", "british_columbia", "manitoba", "new_brunswick", "newfoundland_and_labrador",
  "northwest_territories", "nova_scotia", "nunavut", "ontario", "prince_edward_island",
  "quebec", "saskatchewan", "yukon"
];

// States that appear on the main map (US + Canada)
const MAIN_MAP_STATES = [
  "alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware",
  "florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky",
  "louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi",
  "missouri","montana","nebraska","nevada","new_hampshire","new_jersey","new_mexico",
  "new_york","north_carolina","north_dakota","ohio","oklahoma","oregon","pennsylvania",
  "rhode_island","south_carolina","south_dakota","tennessee","texas","utah","vermont",
  "virginia","washington","west_virginia","wisconsin","wyoming", "district_of_columbia",
  // Canadian provinces/territories
  "alberta", "british_columbia", "manitoba", "new_brunswick", "newfoundland_and_labrador",
  "northwest_territories", "nova_scotia", "nunavut", "ontario", "prince_edward_island",
  "quebec", "saskatchewan", "yukon"
];

// Remote territories for sidebar (US only)
const REMOTE_TERRITORIES = [
  "american_samoa", 
  "commonwealth_of_the_northern_mariana_islands", 
  "guam", 
  "puerto_rico", 
  "united_states_virgin_islands"
];

// Canadian provinces/territories
const CANADIAN_REGIONS = [
  "alberta", "british_columbia", "manitoba", "new_brunswick", "newfoundland_and_labrador",
  "northwest_territories", "nova_scotia", "nunavut", "ontario", "prince_edward_island",
  "quebec", "saskatchewan", "yukon"
];

// Geographic center of US + Canada (approximately southern Manitoba/northern North Dakota)
const MAP_CENTER = [50.0, -100.0];
const MAP_ZOOM = 3;

// Theme definitions
const THEMES = {
  classic: {
    name: "Classic",
    loggedColor: "#28a745",
    unloggedColor: "#c8cacc",
    showLegend: true
  },
  random: {
    name: "Random Colors",
    colors: ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6f42c1", "#fd7e14"],
    unloggedColor: "#c8cacc",
    showLegend: false
  },
  flag: {
    name: "Flag Colors",
    us_patterns: {
      red: "#dc3545",
      white: "#ffffff",
      blue: "#1e3a8a",
      red_stripes: "red_white_stripes",
      blue_stars: "blue_with_stars"
    },
    canada_patterns: {
      red: "#ff0000",
      white: "#ffffff",
      red_white: "canada_red_white"
    },
    unloggedColor: "#c8cacc", // Previous color is #e9ecef
    showLegend: false
  }
};

// State assignments for flag theme - US states and territories
const US_FLAG_ASSIGNMENTS = {
  // US States - mix of red, white, blue, stripes, and stars
  "alabama": "red", "alaska": "blue", "arizona": "red", "arkansas": "red_stripes",
  "california": "red", "colorado": "blue", "connecticut": "red_stripes", "delaware": "red_stripes",
  "florida": "red", "georgia": "red_stripes", "hawaii": "blue", "idaho": "blue",
  "illinois": "red_stripes", "indiana": "red_stripes", "iowa": "blue", "kansas": "blue",
  "kentucky": "red", "louisiana": "red", "maine": "red_stripes", "maryland": "red_stripes",
  "massachusetts": "red_stripes", "michigan": "blue", "minnesota": "blue", "mississippi": "red",
  "missouri": "red", "montana": "blue", "nebraska": "blue", "nevada": "blue",
  "new_hampshire": "red_stripes", "new_jersey": "red_stripes", "new_mexico": "red", "new_york": "red_stripes",
  "north_carolina": "red_stripes", "north_dakota": "blue", "ohio": "blue", "oklahoma": "red",
  "oregon": "blue", "pennsylvania": "red_stripes", "rhode_island": "red_stripes", "south_carolina": "red_stripes",
  "south_dakota": "blue", "tennessee": "red", "texas": "red", "utah": "blue",
  "vermont": "red_stripes", "virginia": "red_stripes", "washington": "blue", "west_virginia": "red",
  "wisconsin": "blue", "wyoming": "blue", "district_of_columbia": "blue_stars",
  // US Territories - get US flag colors
  "american_samoa": "blue", "commonwealth_of_the_northern_mariana_islands": "red",
  "guam": "red_stripes", "puerto_rico": "blue", "united_states_virgin_islands": "red"
};

// Canadian flag assignments - red and white only
const CANADA_FLAG_ASSIGNMENTS = {
  "alberta": "red", "british_columbia": "white", "manitoba": "red", "new_brunswick": "white",
  "newfoundland_and_labrador": "red", "northwest_territories": "white", "nova_scotia": "red",
  "nunavut": "white", "ontario": "red", "prince_edward_island": "white",
  "quebec": "red", "saskatchewan": "white", "yukon": "red"
};

// Random color assignments (persistent)
let randomColorAssignments = {};

// State layers for the map
let stateMapLayers = {};
let currentMap = null;
let currentTheme = 'classic';
const stateCache = {};

// Function to recenter map
function recenterMap() {
  if (currentMap) {
    currentMap.setView(MAP_CENTER, MAP_ZOOM);
  }
}

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
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.status}`);
      }
      stateCache[stateName] = await response.json();
    }
    
    const points = extractPoints(stateCache[stateName]);
    if (points.length === 0) {
      throw new Error(`No geographic data available for ${stateName}`);
    }
    
    return getClosestDistance(points, userLat, userLon);
  } catch (error) {
    console.error(`Error in checkProximity for ${stateName}:`, error);
    throw error;
  }
}

// Theme functions
function initializeRandomColors() {
  const saved = localStorage.getItem('randomColorAssignments');
  if (saved) {
    randomColorAssignments = JSON.parse(saved);
    
    // Check if we need to add colors for any missing states/provinces
    const colors = THEMES.random.colors;
    let needsUpdate = false;
    
    for (const state of ALL_STATES) {
      if (!randomColorAssignments[state]) {
        randomColorAssignments[state] = colors[Math.floor(Math.random() * colors.length)];
        needsUpdate = true;
      }
    }
    
    // Save updated assignments if we added new ones
    if (needsUpdate) {
      localStorage.setItem('randomColorAssignments', JSON.stringify(randomColorAssignments));
    }
    
  } else {
    // Generate random color assignments for all states
    const colors = THEMES.random.colors;
    for (const state of ALL_STATES) {
      randomColorAssignments[state] = colors[Math.floor(Math.random() * colors.length)];
    }
    localStorage.setItem('randomColorAssignments', JSON.stringify(randomColorAssignments));
  }
}
function getStateStyle(stateName, isLogged) {
  const theme = THEMES[currentTheme];
  
  if (!isLogged) {
    return {
      fillColor: theme.unloggedColor,
      fillOpacity: 0.7,
      color: "#666",
      weight: 1
    };
  }
  
  let fillColor;
  
  switch (currentTheme) {
    case 'classic':
      fillColor = theme.loggedColor;
      break;
      
    case 'random':
      fillColor = randomColorAssignments[stateName] || theme.colors[0];
      break;
      
    case 'flag':
      // Determine if this is US or Canadian
      if (CANADIAN_REGIONS.includes(stateName)) {
        // Canadian flag colors (red and white)
        const assignment = CANADA_FLAG_ASSIGNMENTS[stateName] || 'red';
        fillColor = theme.canada_patterns[assignment];
      } else {
        // US flag colors (red, white, blue)
        const assignment = US_FLAG_ASSIGNMENTS[stateName] || 'red';
        if (assignment === 'red_stripes') {
          fillColor = "#dc3545"; // Will be styled with stripes
        } else if (assignment === 'blue_stars') {
          fillColor = "#1e3a8a"; // Will be styled with stars
        } else {
          fillColor = theme.us_patterns[assignment] || theme.us_patterns.red;
        }
      }
      break;
  }
  
  return {
    fillColor: fillColor,
    fillOpacity: 0.8,
    color: "#666",
    weight: 1
  };
}

function createSVGPatterns() {
  if (currentTheme !== 'flag') return;
  
  // Remove existing patterns
  const existingSvg = document.querySelector('svg[data-patterns="true"]');
  if (existingSvg) {
    existingSvg.remove();
  }
  
  // Create SVG patterns for flag theme
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.position = "absolute";
  svg.style.width = "0";
  svg.style.height = "0";
  svg.setAttribute("data-patterns", "true");
  
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  
  // US Red and white stripes pattern
  const usStripesPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  usStripesPattern.setAttribute("id", "red-stripes");
  usStripesPattern.setAttribute("patternUnits", "userSpaceOnUse");
  usStripesPattern.setAttribute("width", "20");
  usStripesPattern.setAttribute("height", "20");
  
  const rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect1.setAttribute("width", "20");
  rect1.setAttribute("height", "10");
  rect1.setAttribute("fill", "#dc3545");
  
  const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect2.setAttribute("y", "10");
  rect2.setAttribute("width", "20");
  rect2.setAttribute("height", "10");
  rect2.setAttribute("fill", "#ffffff");
  
  usStripesPattern.appendChild(rect1);
  usStripesPattern.appendChild(rect2);
  
  // US Blue with stars pattern
  const starsPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  starsPattern.setAttribute("id", "blue-stars");
  starsPattern.setAttribute("patternUnits", "userSpaceOnUse");
  starsPattern.setAttribute("width", "30");
  starsPattern.setAttribute("height", "30");
  
  const blueRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  blueRect.setAttribute("width", "30");
  blueRect.setAttribute("height", "30");
  blueRect.setAttribute("fill", "#1e3a8a");
  
  const star = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
  star.setAttribute("points", "15,5 18,12 25,12 20,17 22,24 15,20 8,24 10,17 5,12 12,12");
  star.setAttribute("fill", "#ffffff");
  
  starsPattern.appendChild(blueRect);
  starsPattern.appendChild(star);
  
  // Canadian red and white pattern (vertical stripes like Canadian flag)
  const canadaPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  canadaPattern.setAttribute("id", "canada-red-white");
  canadaPattern.setAttribute("patternUnits", "userSpaceOnUse");
  canadaPattern.setAttribute("width", "30");
  canadaPattern.setAttribute("height", "20");
  
  const canRect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  canRect1.setAttribute("width", "10");
  canRect1.setAttribute("height", "20");
  canRect1.setAttribute("fill", "#ff0000");
  
  const canRect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  canRect2.setAttribute("x", "10");
  canRect2.setAttribute("width", "10");
  canRect2.setAttribute("height", "20");
  canRect2.setAttribute("fill", "#ffffff");
  
  const canRect3 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  canRect3.setAttribute("x", "20");
  canRect3.setAttribute("width", "10");
  canRect3.setAttribute("height", "20");
  canRect3.setAttribute("fill", "#ff0000");
  
  canadaPattern.appendChild(canRect1);
  canadaPattern.appendChild(canRect2);
  canadaPattern.appendChild(canRect3);
  
  defs.appendChild(usStripesPattern);
  defs.appendChild(starsPattern);
  defs.appendChild(canadaPattern);
  svg.appendChild(defs);
  
  document.body.appendChild(svg);
}

function updateMapColors(log) {
  const loggedStates = new Set(Object.keys(log));
  
  for (const [stateName, layer] of Object.entries(stateMapLayers)) {
    if (layer) {
      const isLogged = loggedStates.has(stateName);
      const style = getStateStyle(stateName, isLogged);
      layer.setStyle(style);
    }
  }
  
  // Update legend visibility
  const legend = document.getElementById('mapLegend');
  if (legend) {
    legend.style.display = THEMES[currentTheme].showLegend ? 'block' : 'none';
  }
}

function updateTerritoriesSidebar(log) {
  const territoriesList = document.getElementById("territoriesList");
  if (!territoriesList) return;
  
  const loggedStates = new Set(Object.keys(log));
  
  let html = "";
  for (const territory of REMOTE_TERRITORIES) {
    const isLogged = loggedStates.has(territory);
    const displayName = territory.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const className = isLogged ? "logged" : "not-logged";
    
    // Apply theme colors to territories too
    let style = "";
    if (isLogged) {
      switch (currentTheme) {
        case 'classic':
          style = 'style="background-color: #d4edda; border-color: #28a745;"';
          break;
        case 'random':
          const color = randomColorAssignments[territory] || THEMES.random.colors[0];
          style = `style="background-color: ${color}; border-color: ${color}; color: white;"`;
          break;
        case 'flag':
          // US Territories get US flag colors
          const assignment = US_FLAG_ASSIGNMENTS[territory] || 'blue';
          let bgColor = THEMES.flag.us_patterns[assignment] || THEMES.flag.us_patterns.blue;
          style = `style="background-color: ${bgColor}; border-color: ${bgColor}; color: white;"`;
          break;
      }
    }
    
    html += `<div class="territory-item ${className}" ${style}>${displayName}</div>`;
  }
  
  territoriesList.innerHTML = html;
}

// Simplified map initialization
async function initializeMap() {
  const mapContainer = document.getElementById('map');
  
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
    currentMap = L.map('map').setView(MAP_CENTER, MAP_ZOOM);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(currentMap);
    
    await loadAllStates();
    
  } catch (error) {
    console.error("Error creating map:", error);
    mapContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Map could not be loaded. Check console for errors.</p>';
  }
}

async function loadAllStates() {
  const batchSize = 8;
  let loadedCount = 0;
  
  for (let i = 0; i < MAIN_MAP_STATES.length; i += batchSize) {
    const batch = MAIN_MAP_STATES.slice(i, i + batchSize);
    await loadStateBatch(batch);
    loadedCount += batch.length;
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  
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
          style: getStateStyle(stateName, false)
        });
        
        layer.addTo(currentMap);
        stateMapLayers[stateName] = layer;
      }
      
    } catch (error) {
      console.error(`Could not load ${stateName}:`, error);
    }
  }
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
    const button = document.getElementById("submitBtn");
    button.disabled = true;
    button.textContent = "Processing...";
    
    const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);
    
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
    
    // Recenter map after successful submission
    setTimeout(recenterMap, 500);
    
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
      <tr><td colspan="4"><strong>States not yet logged:</strong> ${missingLabels}</td></tr>
      <tr><td colspan="4"><strong>Total Score:</strong> ${formatNumber(getTotalScore(log))} miles</td></tr>
    </tbody>
  </table>
  `;

  result.innerHTML = html;
}

// Main interaction
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const themeSelect = document.getElementById("themeSelect");

  // Initialize themes
  initializeRandomColors();
  
  // Load saved theme
  const savedTheme = localStorage.getItem('selectedTheme');
  if (savedTheme && THEMES[savedTheme]) {
    currentTheme = savedTheme;
    themeSelect.value = currentTheme;
  }

  // Initialize the map and territories sidebar
  initializeMap();
  updateTerritoriesSidebar(loadPlateLog());

  // Theme change handler
  themeSelect.addEventListener("change", () => {
    currentTheme = themeSelect.value;
    localStorage.setItem('selectedTheme', currentTheme);
    
    // Create SVG patterns if needed
    createSVGPatterns();
    
    // Update all colors
    const log = loadPlateLog();
    updateMapColors(log);
    updateTerritoriesSidebar(log);
  });

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

  resetBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to reset the entire log? This cannot be undone.")) {
      localStorage.removeItem("plateLog");
      const emptyLog = {};
      renderTable(emptyLog);
      updateMapColors(emptyLog);
      updateTerritoriesSidebar(emptyLog);
      
      // Recenter map after reset
      setTimeout(recenterMap, 500);
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
  renderTable(loadPlateLog());
  
  // Create initial SVG patterns
  createSVGPatterns();
});
