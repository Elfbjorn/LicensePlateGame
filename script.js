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

const REMOTE_TERRITORIES = [
  "american_samoa", "commonwealth_of_the_northern_mariana_islands", 
  "guam", "puerto_rico", "united_states_virgin_islands"
];

const CANADIAN_REGIONS = [
  "alberta", "british_columbia", "manitoba", "new_brunswick", "newfoundland_and_labrador",
  "northwest_territories", "nova_scotia", "nunavut", "ontario", "prince_edward_island",
  "quebec", "saskatchewan", "yukon"
];

const MAP_CENTER = [50.0, -100.0];
const MAP_ZOOM = 3;

const THEMES = {
  classic: {
    name: "Classic",
    loggedColor: "#28a745",
    unloggedColor: "#6a6a6a",
    showLegend: true
  },
  random: {
    name: "Random Colors",
    colors: ["#007bff", "#dc3545", "#28a745", "#ffc107", "#6f42c1", "#fd7e14"],
    unloggedColor: "#6a6a6a",
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
    unloggedColor: "#6a6a6a",
    showLegend: false
  }
};

// Global variables
let randomColorAssignments = {};
let stateMapLayers = {};
let currentMap = null;
let currentTheme = 'classic';
const stateCache = {};

function getFlagAssignment(regionName) {
  const seed = regionName.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  if (REMOTE_TERRITORIES.includes(regionName)) {
    return 'blue';
  } else if (CANADIAN_REGIONS.includes(regionName)) {
    const canadaOptions = ['red', 'white'];
    return canadaOptions[seed % canadaOptions.length];
  } else {
    const usOptions = ['red', 'white', 'blue'];
    return usOptions[seed % usOptions.length];
  }
}

function recenterMap() {
  if (currentMap) {
    currentMap.setView(MAP_CENTER, MAP_ZOOM);
  }
}

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

// Share Card Functions
// REPLACE the generateShareCard function with this better version

function generateShareCard() {
  const log = loadPlateLog();
  const entries = Object.entries(log);
  
  // Count by category
  let usStates = 0, territories = 0, canada = 0;
  let totalMiles = 0, maxMiles = 0, farthestState = '';
  
  // Track unique locations where plates were spotted
  const spottingLocations = new Set();
  
  entries.forEach(([state, data]) => {
    const miles = data.miles || 0;
    totalMiles += miles;
    
    if (miles > maxMiles) {
      maxMiles = miles;
      farthestState = state.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    
    // Track where you spotted plates
    spottingLocations.add(data.location);
    
    if (REMOTE_TERRITORIES.includes(state)) {
      territories++;
    } else if (CANADIAN_REGIONS.includes(state)) {
      canada++;
    } else {
      usStates++;
    }
  });

  // Better estimated travel calculation
  const uniqueLocations = spottingLocations.size;
  let estimatedTravel;
  
  if (uniqueLocations <= 1) {
    // All plates spotted from one location (like your case)
    estimatedTravel = Math.floor(entries.length * 5); // ~5 miles per plate hunt
  } else if (uniqueLocations <= 3) {
    // A few different locations (local area)
    estimatedTravel = Math.floor(uniqueLocations * 25 + entries.length * 3);
  } else {
    // Multiple locations (road trip)
    estimatedTravel = Math.floor(uniqueLocations * 100 + entries.length * 10);
  }

  // Realistic days calculation
  const days = Math.max(1, Math.floor(entries.length / 3) + Math.floor(uniqueLocations * 0.5));

  return {
    usStates,
    territories,
    canada,
    totalMiles,
    farthestState: farthestState.substring(0, 3).toUpperCase() || 'N/A',
    maxMiles,
    days,
    estimatedTravel,
    uniqueLocations // for debugging
  };
}
function generateShareText() {
  const data = generateShareCard();
  const totalLogged = data.usStates + data.territories + data.canada;
  const completionPercent = Math.round((totalLogged / 69) * 100);
  
  return `🚗 My So Close So Far Progress! 🚗

${completionPercent}% Complete (${totalLogged}/69 regions)
📍 US States: ${data.usStates}/51
🏝️ US Territories: ${data.territories}/5  
🍁 Canada: ${data.canada}/13

🎯 Total Distance: ${data.totalMiles.toLocaleString()} miles
🏁 Farthest Plate: ${data.farthestState}

Join the challenge: ${window.location.href}`;
}

async function shareToFacebook() {
  const text = generateShareText();
  await copyToClipboard(text);
  const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
  window.open(url, '_blank', 'width=600,height=400');
  alert('Caption copied! Paste it when sharing on Facebook.');
}

async function shareToInstagram() {
  const text = generateShareText() + '\n\n#SoClosesoFar #LicensePlateGame #RoadTrip';
  await copyToClipboard(text);
  alert('Caption copied! Take a screenshot of the share card above and post to Instagram with the copied caption.');
  window.open('https://www.instagram.com/', '_blank');
}

async function shareToX() {
  const data = generateShareCard();
  const text = `🚗 My So Close So Far progress: ${Math.round(((data.usStates + data.territories + data.canada) / 69) * 100)}% complete!\n\nFarthest plate: ${data.farthestState} (${data.maxMiles.toLocaleString()} miles!)\n\n${window.location.href}\n\n#SoClosesoFar`;
  await copyToClipboard(text);
  const url = `https://twitter.com/intent/tweet`;
  window.open(url, '_blank', 'width=600,height=400');
  alert('Tweet copied! Paste it when creating your tweet.');
}

async function shareToThreads() {
  const text = generateShareText();
  await copyToClipboard(text);
  window.open('https://www.threads.net/', '_blank');
  alert('Caption copied! Paste it when creating your Threads post.');
}

async function shareToReddit() {
  const data = generateShareCard();
  const totalLogged = data.usStates + data.territories + data.canada;
  const completionPercent = Math.round((totalLogged / 69) * 100);
  
  const redditPost = `## My So Close So Far Challenge Progress! 🚗

${completionPercent}% completion on this license plate spotting game!

| Category | Progress |
|----------|----------|
| 🇺🇸 US States | ${data.usStates}/51 |
| 🏝️ US Territories | ${data.territories}/5 |
| 🍁 Canada | ${data.canada}/13 |

**Farthest plate:** ${data.farthestState} (${data.maxMiles.toLocaleString()} miles away!)

[Try the game here!](${window.location.href})`;

  await copyToClipboard(redditPost);
  window.open('https://www.reddit.com/submit', '_blank');
  alert('Reddit post copied! Paste it when creating your post.');
}

async function copyShareText() {
  const text = generateShareText();
  await copyToClipboard(text);
  alert('Share text copied to clipboard!');
  document.querySelector('.share-modal')?.remove();
}

async function copyToClipboard(text) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}
// REPLACE the createShareCardHTML function with this fixed version

function createShareCardHTML(data) {
  const totalLogged = data.usStates + data.territories + data.canada;
  const completionPercent = Math.round((totalLogged / 69) * 100);
  const usPercent = Math.round((data.usStates / 51) * 100);
  const territoryPercent = Math.round((data.territories / 5) * 100);
  const canadaPercent = Math.round((data.canada / 13) * 100);

  // Format all numbers properly
  const formattedTotalMiles = Math.round(data.totalMiles).toLocaleString();
  const formattedMaxMiles = Math.round(data.maxMiles).toLocaleString();
  const formattedEstTravel = Math.round(data.estimatedTravel).toLocaleString();

  return `
    <div class="share-card" style="width: 400px; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); overflow: hidden; margin: 20px auto; font-family: 'Segoe UI', Roboto, Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; position: relative;">
        <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">So Close, So Far</h2>
        <p style="margin: 0; opacity: 0.9; font-size: 16px;">${completionPercent}% Complete • ${formattedTotalMiles} Miles</p>
        <div style="position: absolute; bottom: 5px; right: 10px; font-size: 10px; color: rgba(255,255,255,0.7);">LicensePlateGame.com</div>
      </div>
      
      <div style="padding: 20px;">
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; font-weight: 500;">
            <span>US States</span><span>${data.usStates}/51</span>
          </div>
          <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; background: #28a745; border-radius: 4px; width: ${usPercent}%; transition: width 0.3s ease;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; font-weight: 500;">
            <span>US Territories</span><span>${data.territories}/5</span>
          </div>
          <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; background: #007bff; border-radius: 4px; width: ${territoryPercent}%; transition: width 0.3s ease;"></div>
          </div>
        </div>
        
        <div style="margin-bottom: 15px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; font-weight: 500;">
            <span>Canada</span><span>${data.canada}/13</span>
          </div>
          <div style="height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden;">
            <div style="height: 100%; background: #dc3545; border-radius: 4px; width: ${canadaPercent}%; transition: width 0.3s ease;"></div>
          </div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; padding: 0 20px 20px 20px;">
        <div style="text-align: center; padding: 15px 10px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">${data.farthestState}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500;">Farthest</div>
        </div>
        <div style="text-align: center; padding: 15px 10px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">${formattedMaxMiles}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500;">Max Miles</div>
        </div>
        <div style="text-align: center; padding: 15px 10px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">${data.days}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500;">Days</div>
        </div>
        <div style="text-align: center; padding: 15px 10px; background: #f8f9fa; border-radius: 8px;">
          <div style="font-size: 24px; font-weight: 700; color: #2c3e50; margin-bottom: 4px;">${formattedEstTravel}</div>
          <div style="font-size: 12px; color: #666; font-weight: 500;">Est. Traveled</div>
        </div>
      </div>
      
      <div style="padding: 15px 20px; background: #f8f9fa; text-align: center; border-top: 1px solid #e9ecef;">
        <a href="#" style="color: #667eea; text-decoration: none; font-weight: 600; font-size: 14px;">Start Your Journey →</a>
      </div>
    </div>
  `;
}
function showShareModal() {
  const data = generateShareCard();
  const shareCardHTML = createShareCardHTML(data);
  
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="background: white; border-radius: 16px; max-width: 500px; max-height: 90vh; overflow-y: auto; position: relative;">
      <div style="padding: 20px; text-align: center; border-bottom: 1px solid #e9ecef;">
        <h3 style="margin: 0; color: #2c3e50;">Share Your Progress</h3>
        <button onclick="this.closest('.share-modal').remove()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
      </div>
      
      <div style="padding: 20px;">
        ${shareCardHTML}
        
        <div style="margin: 20px 0; text-align: center;">
          <h4 style="margin-bottom: 15px; color: #2c3e50;">Choose Platform:</h4>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <button onclick="shareToFacebook()" style="background: #1877f2; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fab fa-facebook-f"></i> Facebook</button>
            <button onclick="shareToInstagram()" style="background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%); color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fab fa-instagram"></i> Instagram</button>
            <button onclick="shareToX()" style="background: #000000; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fab fa-x-twitter"></i> X</button>
            <button onclick="shareToThreads()" style="background: #000000; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fab fa-threads"></i> Threads</button>
            <button onclick="shareToReddit()" style="background: #ff4500; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fab fa-reddit-alien"></i> Reddit</button>
            <button onclick="copyShareText()" style="background: #6c757d; color: white; border: none; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600;"><i class="fas fa-clipboard"></i> Copy Text</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  modal.className = 'share-modal';
  document.body.appendChild(modal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Social Media Sharing Functions


function fallbackCopyText(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    document.execCommand('copy');
    alert('Share text copied to clipboard!');
    document.querySelector('.share-modal')?.remove();
  } catch (err) {
    alert('Copy failed. Here\'s your share text:\n\n' + text);
  }
  
  document.body.removeChild(textArea);
}

// ADD THESE FUNCTIONS AFTER COMBINING PARTS 1 AND 2

// Theme and Map Functions
function initializeRandomColors() {
  const saved = localStorage.getItem('randomColorAssignments');
  if (saved) {
    randomColorAssignments = JSON.parse(saved);
    const colors = THEMES.random.colors;
    let needsUpdate = false;
    
    for (const state of ALL_STATES) {
      if (!randomColorAssignments[state]) {
        randomColorAssignments[state] = colors[Math.floor(Math.random() * colors.length)];
        needsUpdate = true;
      }
    }
    
    if (needsUpdate) {
      localStorage.setItem('randomColorAssignments', JSON.stringify(randomColorAssignments));
    }
  } else {
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
      const assignment = getFlagAssignment(stateName);
      if (CANADIAN_REGIONS.includes(stateName)) {
        fillColor = theme.canada_patterns[assignment] || theme.canada_patterns.red;
      } else {
        fillColor = theme.us_patterns[assignment] || theme.us_patterns.blue;
      }
      break;
    default:
      fillColor = theme.loggedColor || "#28a745";
  }
  
  return {
    fillColor: fillColor,
    fillOpacity: 0.8,
    color: "#333",
    weight: 2
  };
}

function createSVGPatterns() {
  if (document.getElementById('mapPatterns')) return;
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = 'mapPatterns';
  svg.style.position = 'absolute';
  svg.style.width = '0';
  svg.style.height = '0';
  document.body.appendChild(svg);
  
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);
  
  const stripesPattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  stripesPattern.id = 'red_white_stripes';
  stripesPattern.setAttribute('patternUnits', 'userSpaceOnUse');
  stripesPattern.setAttribute('width', '10');
  stripesPattern.setAttribute('height', '10');
  
  const rect1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect1.setAttribute('width', '10');
  rect1.setAttribute('height', '5');
  rect1.setAttribute('fill', '#dc3545');
  stripesPattern.appendChild(rect1);
  
  const rect2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect2.setAttribute('y', '5');
  rect2.setAttribute('width', '10');
  rect2.setAttribute('height', '5');
  rect2.setAttribute('fill', '#ffffff');
  stripesPattern.appendChild(rect2);
  
  defs.appendChild(stripesPattern);
}

async function loadAllStates() {
  const log = loadPlateLog();
  const loggedStates = new Set(Object.keys(log));
  const statesToLoad = MAIN_MAP_STATES.slice();
  
  const batchSize = 8;
  
  for (let i = 0; i < statesToLoad.length; i += batchSize) {
    const batch = statesToLoad.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (stateName) => {
      try {
        if (!stateCache[stateName]) {
          const response = await fetch(`state_jsons/${stateName}.json`);
          if (!response.ok) throw new Error(`Failed to load ${stateName}`);
          stateCache[stateName] = await response.json();
        }
        
        const geoJsonData = stateCache[stateName];
        if (geoJsonData && geoJsonData.geojson) {
          const isLogged = loggedStates.has(stateName);
          const style = getStateStyle(stateName, isLogged);
          
          const layer = L.geoJSON(geoJsonData.geojson, {
            style: style,
            onEachFeature: (feature, layer) => {
              const displayName = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              layer.bindPopup(`<strong>${displayName}</strong><br>${isLogged ? 'Found!' : 'Not found yet'}`);
            }
          });
          
          if (currentMap) {
            layer.addTo(currentMap);
            stateMapLayers[stateName] = layer;
          }
        }
      } catch (error) {
        console.error(`Failed to load state ${stateName}:`, error);
      }
    }));
    
    if (i + batchSize < statesToLoad.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
}

function updateMapColors(log) {
  const loggedStates = new Set(Object.keys(log));
  
  for (const [stateName, layer] of Object.entries(stateMapLayers)) {
    if (layer && currentMap && currentMap.hasLayer(layer)) {
      const isLogged = loggedStates.has(stateName);
      const style = getStateStyle(stateName, isLogged);
      layer.setStyle(style);
      
      // SAFE popup update - check if popup exists first
      const displayName = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      const popupContent = `<strong>${displayName}</strong><br>${isLogged ? 'Found!' : 'Not found yet'}`;
      
      if (layer.getPopup()) {
        layer.getPopup().setContent(popupContent);
      } else {
        // Create popup if it doesn't exist
        layer.bindPopup(popupContent);
      }
    }
  }
}

function updateLegendVisibility() {
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
          const assignment = getFlagAssignment(territory);
          let bgColor = THEMES.flag.us_patterns[assignment] || THEMES.flag.us_patterns.blue;
          style = `style="background-color: ${bgColor}; border-color: ${bgColor}; color: white;"`;
          break;
      }
    }
    
    html += `<div class="territory-item ${className}" ${style}>${displayName}</div>`;
  }
  
  territoriesList.innerHTML = html;
}

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
    mapContainer.innerHTML = '<p style="padding: 20px; text-align: center; color: red;">Map could not be loaded. Please refresh the page.</p>';
  }
}

async function processLocation(latitude, longitude, stateName) {
  try {
    const { label, stateName: currentState } = await getLocationLabel(latitude, longitude);
    
    const miles = (stateName === currentState)
      ? 0
      : await checkProximity(stateName, latitude, longitude);
    
    if (miles === null) {
      throw new Error(`Could not calculate distance to ${stateName}`);
    }
    
    const log = updatePlateLog(stateName, label, miles);
    renderTable(log);
    updateMapColors(log);
    updateTerritoriesSidebar(log);
    
    setTimeout(recenterMap, 500);
    
    const displayName = stateName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    alert(`${displayName} logged! Distance: ${Math.round(miles)} miles from ${label}`);
    
  } catch (error) {
    console.error("Error processing location:", error);
    alert(`Error: ${error.message}`);
  }
}

async function handleManualLocation(stateName) {
  const locationInput = prompt(
    "Enter your location:\n\n" +
    "• City, State (e.g., 'New York, NY')\n" +
    "• ZIP code (e.g., '10001')\n" +
    "• Latitude, Longitude (e.g., '40.7128, -74.0060')"
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

// Main Event Listeners and Initialization
document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("stateSelect");
  const button = document.getElementById("submitBtn");
  const resetBtn = document.getElementById("resetBtn");
  const themeSelect = document.getElementById("themeSelect");

  // Initialize themes and map
  initializeRandomColors();
  createSVGPatterns();
  initializeMap();

  // Theme selector
  if (themeSelect) {
    const savedTheme = localStorage.getItem('selectedTheme');
    if (savedTheme && THEMES[savedTheme]) {
      currentTheme = savedTheme;
      themeSelect.value = savedTheme;
    }

    themeSelect.addEventListener('change', async (e) => {
      currentTheme = e.target.value;
      localStorage.setItem('selectedTheme', currentTheme);
      
      const log = loadPlateLog();
      updateMapColors(log);
      updateTerritoriesSidebar(log);
      updateLegendVisibility();
    });
  }

  button.addEventListener("click", async () => {
    const stateName = select.value;
    if (!stateName) return;

    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    button.disabled = true;
    button.textContent = "Getting location...";

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const { latitude, longitude } = position.coords;
      await processLocation(latitude, longitude, stateName);

    } catch (error) {
      console.error("Geolocation error:", error);
      
      let errorMessage = "Location access failed.";
      
      if (error.code === 1) {
        errorMessage += " Please enable location permissions for this website.";
      } else if (error.code === 2) {
        errorMessage += " Location unavailable. Please check your GPS/internet connection.";
      } else if (error.code === 3) {
        errorMessage += " Location request timed out.";
      }

      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        if (error.message.includes("Code: 1")) {
          errorMessage += "\n\nFor iOS Safari:\n1. Go to Settings > Privacy & Security\n2. Make sure Location Services is ON\n3. Find Safari and set it to 'While Using App'\n4. Reload this page and try again";
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

  // Add Share button after progress bar
  const progressContainer = document.getElementById("progressContainer");
  if (progressContainer) {
    const shareButton = document.createElement('button');
    shareButton.textContent = 'Share Progress';
    shareButton.style.cssText = `
      margin-top: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      width: 100%;
    `;
    shareButton.addEventListener('click', showShareModal);
    progressContainer.appendChild(shareButton);
  }

  // Initial render
  const initialLog = loadPlateLog();
  renderTable(initialLog);
  updateTerritoriesSidebar(initialLog);
  updateLegendVisibility();
});
