const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");

const mapStatus = document.getElementById("mapStatus");
const popup = document.getElementById("airportPopup");

const popupName = document.getElementById("popupName");
const popupType = document.getElementById("popupType");
const popupICAO = document.getElementById("popupICAO");
const popupCountry = document.getElementById("popupCountry");
const popupCoords = document.getElementById("popupCoords");

const primaryButton = document.getElementById("primaryButton");
const closePopupButton = document.getElementById("closePopup");

const MAP_BOUNDS = {
  minLat: 31,
  maxLat: 72,
  minLon: -24,
  maxLon: 60
};

const CAMERA = {
  scale: 1,
  minScale: 1,
  maxScale: 5,
  offsetX: 0,
  offsetY: 0
};

const NODE_TYPES = {
  COMBAT: "COMBAT",
  FINAL_BOSS: "FINAL_BOSS"
};

const ASSET_BASE = "/frontend/static/assets/backgrounds";

const mapImage = new Image();
mapImage.src = `${ASSET_BASE}/ww2map.png`;

const icons = {
  easy: createImage(`${ASSET_BASE}/easy.png`),
  medium: createImage(`${ASSET_BASE}/medium.png`),
  hard: createImage(`${ASSET_BASE}/hard.png`),
  boss: createImage(`${ASSET_BASE}/boss.png`)
};

let nodes = [];
let selectedNode = null;
let gameSessionId = null;

let isDragging = false;
let hasDragged = false;
let dragStart = { x: 0, y: 0 };
let cameraStart = { offsetX: 0, offsetY: 0 };

const MOCK_GAME_MAP_RESPONSE = {
  gameSessionId: 1,
  occupiedAirports: [
    {
      airportIdent: "EFHK",
      name: "Helsinki Vantaa Airport",
      type: "large_airport",
      isoCountry: "FI",
      municipality: "Helsinki",
      latitude: 60.3172,
      longitude: 24.9633,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "EFOU",
      name: "Oulu Airport",
      type: "medium_airport",
      isoCountry: "FI",
      municipality: "Oulu",
      latitude: 64.9301,
      longitude: 25.3546,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "EFRO",
      name: "Rovaniemi Airport",
      type: "medium_airport",
      isoCountry: "FI",
      municipality: "Rovaniemi",
      latitude: 66.5648,
      longitude: 25.8304,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "ESSA",
      name: "Stockholm Arlanda Airport",
      type: "large_airport",
      isoCountry: "SE",
      municipality: "Stockholm",
      latitude: 59.6519,
      longitude: 17.9186,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "ESGG",
      name: "Gothenburg Landvetter Airport",
      type: "large_airport",
      isoCountry: "SE",
      municipality: "Gothenburg",
      latitude: 57.6628,
      longitude: 12.2798,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "ESMS",
      name: "Malmo Airport",
      type: "medium_airport",
      isoCountry: "SE",
      municipality: "Malmo",
      latitude: 55.5363,
      longitude: 13.3762,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "ENGM",
      name: "Oslo Airport",
      type: "large_airport",
      isoCountry: "NO",
      municipality: "Oslo",
      latitude: 60.1939,
      longitude: 11.1004,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "ENBR",
      name: "Bergen Airport",
      type: "large_airport",
      isoCountry: "NO",
      municipality: "Bergen",
      latitude: 60.2934,
      longitude: 5.2181,
      liberated: false,
      difficulty: { id: 1, name: "EASY" }
    },
    {
      airportIdent: "EKCH",
      name: "Copenhagen Airport",
      type: "large_airport",
      isoCountry: "DK",
      municipality: "Copenhagen",
      latitude: 55.6179,
      longitude: 12.656,
      liberated: false,
      difficulty: { id: 2, name: "MEDIUM" }
    },
    {
      airportIdent: "EETN",
      name: "Tallinn Airport",
      type: "large_airport",
      isoCountry: "EE",
      municipality: "Tallinn",
      latitude: 59.4133,
      longitude: 24.8328,
      liberated: false,
      difficulty: { id: 2, name: "MEDIUM" }
    },
    {
      airportIdent: "EVRA",
      name: "Riga Airport",
      type: "large_airport",
      isoCountry: "LV",
      municipality: "Riga",
      latitude: 56.9236,
      longitude: 23.9711,
      liberated: false,
      difficulty: { id: 2, name: "MEDIUM" }
    },
    {
      airportIdent: "EYVI",
      name: "Vilnius Airport",
      type: "large_airport",
      isoCountry: "LT",
      municipality: "Vilnius",
      latitude: 54.6341,
      longitude: 25.2858,
      liberated: false,
      difficulty: { id: 2, name: "MEDIUM" }
    },
    {
      airportIdent: "EPWA",
      name: "Warsaw Chopin Airport",
      type: "large_airport",
      isoCountry: "PL",
      municipality: "Warsaw",
      latitude: 52.1657,
      longitude: 20.9671,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "EPGD",
      name: "Gdansk Airport",
      type: "large_airport",
      isoCountry: "PL",
      municipality: "Gdansk",
      latitude: 54.3776,
      longitude: 18.4662,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "LKPR",
      name: "Prague Airport",
      type: "large_airport",
      isoCountry: "CZ",
      municipality: "Prague",
      latitude: 50.1008,
      longitude: 14.26,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "EDDH",
      name: "Hamburg Airport",
      type: "large_airport",
      isoCountry: "DE",
      municipality: "Hamburg",
      latitude: 53.6304,
      longitude: 9.9882,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "EDDF",
      name: "Frankfurt Airport",
      type: "large_airport",
      isoCountry: "DE",
      municipality: "Frankfurt",
      latitude: 50.0333,
      longitude: 8.5706,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "EDDM",
      name: "Munich Airport",
      type: "large_airport",
      isoCountry: "DE",
      municipality: "Munich",
      latitude: 48.3538,
      longitude: 11.7861,
      liberated: false,
      difficulty: { id: 3, name: "HARD" }
    },
    {
      airportIdent: "EDDB",
      name: "Berlin Brandenburg Airport",
      type: "large_airport",
      isoCountry: "DE",
      municipality: "Berlin",
      latitude: 52.3514,
      longitude: 13.4939,
      liberated: false,
      difficulty: { id: 4, name: "BOSS" }
    }
  ]
};

function createImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

function showStatus(message) {
  mapStatus.textContent = message;
  mapStatus.classList.remove("hidden");
}

function hideStatus() {
  mapStatus.classList.add("hidden");
}

async function loadImage(image) {
  if (image.complete) return;

  return new Promise((resolve) => {
    image.onload = resolve;
    image.onerror = resolve;
  });
}

async function loadAssets() {
  await Promise.all([
    loadImage(mapImage),
    ...Object.values(icons).map(loadImage)
  ]);
}

function loadMapData() {
  gameSessionId = MOCK_GAME_MAP_RESPONSE.gameSessionId;

  nodes = MOCK_GAME_MAP_RESPONSE.occupiedAirports.map(createNodeFromAirport);
}

function createNodeFromAirport(airport) {
  const worldPosition = projectAirport(airport.latitude, airport.longitude);

  return {
    id: airport.airportIdent,
    worldX: worldPosition.x,
    worldY: worldPosition.y,
    airport,
    type: getNodeType(airport),
    liberated: airport.liberated
  };
}

function getNodeType(airport) {
  if (airport.difficulty.id === 4 || airport.airportIdent === "EDDB") {
    return NODE_TYPES.FINAL_BOSS;
  }

  return NODE_TYPES.COMBAT;
}

function projectAirport(lat, lon) {
  const x =
    ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) *
    canvas.width;

  const y =
    ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) *
    canvas.height;

  return { x, y };
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * CAMERA.scale + CAMERA.offsetX,
    y: worldY * CAMERA.scale + CAMERA.offsetY
  };
}

function screenToWorld(screenX, screenY) {
  return {
    x: (screenX - CAMERA.offsetX) / CAMERA.scale,
    y: (screenY - CAMERA.offsetY) / CAMERA.scale
  };
}

function clampCamera() {
  const mapWidth = canvas.width * CAMERA.scale;
  const mapHeight = canvas.height * CAMERA.scale;

  const minOffsetX = canvas.width - mapWidth;
  const minOffsetY = canvas.height - mapHeight;

  CAMERA.offsetX = Math.min(0, Math.max(minOffsetX, CAMERA.offsetX));
  CAMERA.offsetY = Math.min(0, Math.max(minOffsetY, CAMERA.offsetY));
}

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawMapBackground();
  drawNodes();
}

function drawMapBackground() {
  if (!mapImage.complete || mapImage.naturalWidth === 0) {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }

  ctx.save();

  ctx.translate(CAMERA.offsetX, CAMERA.offsetY);
  ctx.scale(CAMERA.scale, CAMERA.scale);

  ctx.drawImage(mapImage, 0, 0, canvas.width, canvas.height);

  ctx.restore();
}

function drawNodes() {
  ctx.textAlign = "center";
  ctx.font = "12px 'Press Start 2P'";

  for (const node of nodes) {
    const screenPosition = worldToScreen(node.worldX, node.worldY);

    drawNodeIcon(node, screenPosition);
    drawSelectedRing(node, screenPosition);
    drawNodeLabel(node, screenPosition);
  }
}

function drawNodeIcon(node, position) {
  const icon = getNodeIcon(node);

  if (icon && icon.complete && icon.naturalWidth > 0) {
    ctx.drawImage(icon, position.x - 16, position.y - 16, 32, 32);
    return;
  }

  drawFallbackIcon(node, position);
}

function getNodeIcon(node) {
  if (node.type === NODE_TYPES.FINAL_BOSS) {
    return icons.boss;
  }

  const difficultyName = node.airport.difficulty.name.toLowerCase();

  if (difficultyName === "easy") return icons.easy;
  if (difficultyName === "medium") return icons.medium;
  if (difficultyName === "hard") return icons.hard;

  return icons.easy;
}

function drawFallbackIcon(node, position) {
  ctx.beginPath();
  ctx.arc(position.x, position.y, 10, 0, Math.PI * 2);

  ctx.fillStyle = getNodeColor(node);
  ctx.fill();

  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSelectedRing(node, position) {
  if (node !== selectedNode) return;

  ctx.strokeStyle = "#ffd24d";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(position.x, position.y, 22, 0, Math.PI * 2);
  ctx.stroke();
}

function drawNodeLabel(node, position) {
  ctx.fillStyle = getNodeColor(node);
  ctx.shadowColor = "black";
  ctx.shadowBlur = 6;
  ctx.shadowBlur = 0;
}

function getNodeColor(node) {
  if (node.liberated) return "#aaaaaa";
  if (node.type === NODE_TYPES.FINAL_BOSS) return "#ff4444";

  const difficultyName = node.airport.difficulty.name.toLowerCase();

  if (difficultyName === "easy") return "#8aff8a";
  if (difficultyName === "medium") return "#ffd24d";
  if (difficultyName === "hard") return "#ff6666";

  return "#ffffff";
}

function openAirportPopup(node) {
  selectedNode = node;

  popupName.textContent = node.airport.name.toUpperCase();
  popupType.textContent = getPopupTypeText(node);
  popupICAO.textContent = `ICAO: ${node.airport.airportIdent}`;
  popupCountry.textContent = `COUNTRY: ${node.airport.isoCountry}`;
  popupCoords.textContent = `LAT ${node.airport.latitude} | LON ${node.airport.longitude}`;

  setupPrimaryButton(node);

  popup.classList.remove("hidden");
  redraw();
}

function getPopupTypeText(node) {
  if (node.liberated) {
    return "LIBERATED";
  }

  if (node.type === NODE_TYPES.FINAL_BOSS) {
    return "FINAL BOSS";
  }

  return `COMBAT - ${node.airport.difficulty.name}`;
}

function setupPrimaryButton(node) {
  primaryButton.disabled = false;

  if (node.liberated) {
    primaryButton.textContent = "LIBERATED";
    primaryButton.disabled = true;
    primaryButton.onclick = null;
    return;
  }

  primaryButton.textContent =
    node.type === NODE_TYPES.FINAL_BOSS
      ? "START FINAL BATTLE"
      : "START COMBAT";

  primaryButton.onclick = () => startCombat(node);
}

function startCombat(node) {
  sessionStorage.setItem("gameSessionId", gameSessionId);
  sessionStorage.setItem("selectedAirportIdent", node.airport.airportIdent);
  sessionStorage.setItem("selectedAirportName", node.airport.name);
  sessionStorage.setItem("selectedAirportDifficulty", node.airport.difficulty.name);

  console.log("START COMBAT:", node.airport);

  // Later:
  // window.location.href = `/frontend/combat.html?airportIdent=${node.airport.airportIdent}`;
}

function closePopup() {
  popup.classList.add("hidden");
  selectedNode = null;
  redraw();
}

function getCanvasMousePosition(event) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function getClickedNode(event) {
  const mouse = getCanvasMousePosition(event);

  return nodes.find((node) => {
    const position = worldToScreen(node.worldX, node.worldY);
    const distance = Math.hypot(mouse.x - position.x, mouse.y - position.y);

    return distance < 30;
  });
}

function zoomAtMouse(event) {
  event.preventDefault();

  const mouse = getCanvasMousePosition(event);
  const worldBeforeZoom = screenToWorld(mouse.x, mouse.y);

  const zoomDirection = event.deltaY < 0 ? 1 : -1;
  const zoomFactor = zoomDirection > 0 ? 1.15 : 0.85;

  const newScale = Math.min(
    CAMERA.maxScale,
    Math.max(CAMERA.minScale, CAMERA.scale * zoomFactor)
  );

  CAMERA.scale = newScale;

  CAMERA.offsetX = mouse.x - worldBeforeZoom.x * CAMERA.scale;
  CAMERA.offsetY = mouse.y - worldBeforeZoom.y * CAMERA.scale;

  clampCamera();
  redraw();
}

function startDragging(event) {
  isDragging = true;
  hasDragged = false;

  dragStart = getCanvasMousePosition(event);

  cameraStart = {
    offsetX: CAMERA.offsetX,
    offsetY: CAMERA.offsetY
  };

  canvas.classList.add("dragging");
  canvas.setPointerCapture(event.pointerId);
}

function dragMap(event) {
  if (!isDragging) return;

  const mouse = getCanvasMousePosition(event);

  const deltaX = mouse.x - dragStart.x;
  const deltaY = mouse.y - dragStart.y;

  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
    hasDragged = true;
  }

  CAMERA.offsetX = cameraStart.offsetX + deltaX;
  CAMERA.offsetY = cameraStart.offsetY + deltaY;

  clampCamera();
  redraw();
}

function stopDragging(event) {
  if (!isDragging) return;

  isDragging = false;
  canvas.classList.remove("dragging");

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  if (hasDragged) {
    return;
  }

  const clickedNode = getClickedNode(event);

  if (!clickedNode) {
    closePopup();
    return;
  }

  openAirportPopup(clickedNode);
}

canvas.addEventListener("wheel", zoomAtMouse, { passive: false });
canvas.addEventListener("pointerdown", startDragging);
canvas.addEventListener("pointermove", dragMap);
canvas.addEventListener("pointerup", stopDragging);
canvas.addEventListener("pointercancel", stopDragging);

closePopupButton.addEventListener("click", closePopup);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopup();
  }
});

async function initMap() {
  showStatus("LOADING MAP...");

  await loadAssets();

  if (!mapImage.complete || mapImage.naturalWidth === 0) {
    showStatus("MAP IMAGE NOT FOUND");
  }

  loadMapData();

  if (nodes.length === 0) {
    showStatus("NO OCCUPIED AIRPORTS FOUND");
    redraw();
    return;
  }

  hideStatus();
  redraw();
}

initMap();