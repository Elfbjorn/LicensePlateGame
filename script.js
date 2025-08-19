const locateBtn = document.getElementById("locateBtn");
const locationStatus = document.getElementById("locationStatus");
const stateInfo = document.getElementById("stateInfo");
const plateInput = document.getElementById("plateInput");
const logBtn = document.getElementById("logBtn");
const plateLog = document.getElementById("plateLog");

let currentState = null;

locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = "Geolocation not supported.";
    return;
  }

  locationStatus.textContent = "Locating...";
  navigator.geolocation.getCurrentPosition(success, error);
});

function success(position) {
  const { latitude, longitude } = position.coords;
  locationStatus.textContent = `Lat: ${latitude.toFixed(4)}, Lon: ${longitude.toFixed(4)}`;

  fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
    .then(res => res.json())
    .then(data => {
      const stateName = normalizeState(data.address.state || data.address.region || "");
      currentState = stateName;
      stateInfo.textContent = `You are in: ${stateName}`;
      loadStateData(stateName);
    })
    .catch(() => {
      stateInfo.textContent = "Could not determine state.";
    });
}

function error(err) {
  locationStatus.textContent = `Error: ${err.message}`;
}

function normalizeState(raw) {
  return raw.toLowerCase().replace(/\s+/g, "_").replace(/[^\w]/g, "");
}

function loadStateData(stateKey) {
  fetch(`state_jsons/${stateKey}.json`)
    .then(res => res.json())
    .then(data => {
      stateInfo.textContent += ` (${data.name || "State data loaded"})`;
    })
    .catch(() => {
      stateInfo.textContent += " (No JSON found)";
    });
}

logBtn.addEventListener("click", () => {
  const plate = plateInput.value.trim();
  if (plate) {
    const li = document.createElement("li");
    li.textContent = `${plate} (${currentState || "Unknown State"})`;
    plateLog.appendChild(li);
    plateInput.value = "";
  }
});
