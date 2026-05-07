import { APP_CONFIG } from "./config.js"
import { apiRequest } from "./apiClient.js"

const MAP_PAGE_WIDTH = 1920
const MAP_PAGE_HEIGHT = 1080

const GAME_PAGE = "./game.html"
const SHOP_PAGE = "./shop.html"

const HELSINKI_AIRPORT_IDENT = "EFHK"
const MINIBOSS_AIRPORT_IDENT = "EPKE"
const BOSS_AIRPORT_IDENT = "EDDB"

const DIFFICULTY_MINIBOSS_ID = 4
const DIFFICULTY_BOSS_ID = 5

const ACTIVE_GAME_SESSION_KEY = "ironSkiesActiveGameSessionId"
const SELECTED_AIRPORT_KEY = "ironSkiesSelectedAirport"

const canvas = document.getElementById("mapCanvas")
const ctx = canvas.getContext("2d")

const mapStatus = document.getElementById("mapStatus")
const popup = document.getElementById("airportPopup")

const popupName = document.getElementById("popupName")
const popupType = document.getElementById("popupType")
const popupICAO = document.getElementById("popupICAO")
const popupCountry = document.getElementById("popupCountry")
const popupCoords = document.getElementById("popupCoords")

const primaryButton = document.getElementById("primaryButton")
const closePopupButton = document.getElementById("closePopup")

const refreshMapButton = document.querySelector("[data-refresh-map]")
const backMenuButton = document.querySelector("[data-back-menu]")

const MAP_BOUNDS = {
  minLat: 31,
  maxLat: 72,
  minLon: -24,
  maxLon: 60,
}

const CAMERA = {
  scale: 1,
  minScale: 1,
  maxScale: 5,
  offsetX: 0,
  offsetY: 0,
}

const NODE_TYPES = {
  BASE: "BASE",
  COMBAT: "COMBAT",
  MINIBOSS: "MINIBOSS",
  FINAL_BOSS: "FINAL_BOSS",
}

const ASSET_BASE = "./static/assets/backgrounds"

const mapImage = createImage(`${ASSET_BASE}/ww2map.png`)

const icons = {
  base: createImage(`${ASSET_BASE}/base.png`),
  easy: createImage(`${ASSET_BASE}/easy.png`),
  medium: createImage(`${ASSET_BASE}/medium.png`),
  hard: createImage(`${ASSET_BASE}/hard.png`),
  miniboss: createImage(`${ASSET_BASE}/miniboss.png`),
  boss: createImage(`${ASSET_BASE}/boss.png`),
}

let nodes = []
let selectedNode = null
let gameSessionId = null

let isDragging = false
let hasDragged = false
let dragStart = { x: 0, y: 0 }
let cameraStart = { offsetX: 0, offsetY: 0 }

initMap()

function createImage(src) {
  const image = new Image()
  image.src = src
  return image
}

/* -----------------------------
   API
----------------------------- */

function continueGameSession() {
  return apiRequest("/game/continue")
}

function startNewCampaign() {
  return apiRequest("/game/start", {
    method: "POST",
  })
}

async function getOrCreateCampaign() {
  let data = await continueGameSession()

  if (data.hasActiveGame) {
    return data
  }

  showStatus("NO ACTIVE CAMPAIGN. CREATING NEW CAMPAIGN...")

  await startNewCampaign()

  data = await continueGameSession()

  return data
}

async function loadMapData() {
  const data = await getOrCreateCampaign()

  if (!data.hasActiveGame) {
    throw new Error("Could not create or load active campaign.")
  }

  gameSessionId = data.gameSessionId ?? null

  if (gameSessionId) {
    sessionStorage.setItem(ACTIVE_GAME_SESSION_KEY, String(gameSessionId))
    sessionStorage.setItem("gameSessionId", String(gameSessionId))
  }

  const allAirports = Array.isArray(data.airports)
    ? data.airports
    : []

  const helsinkiAirport = allAirports.find(
    (airport) => airport.airportIdent === HELSINKI_AIRPORT_IDENT
  )

  if (!helsinkiAirport) {
    nodes = []
    throw new Error("Helsinki-Vantaa airport EFHK was not found in campaign data.")
  }

  const helsinkiLiberated = Boolean(helsinkiAirport.liberated)

  if (!helsinkiLiberated) {
    nodes = [
      createNodeFromAirport({
        ...helsinkiAirport,
        liberated: false,
      }),
    ].filter(Boolean)

    showStatus("LIBERATE HELSINKI-VANTAA FIRST.")
    return data
  }

  const baseNode = createNodeFromAirport({
    ...helsinkiAirport,
    liberated: true,
    isBase: true,
  })

  const unliberatedNodes = allAirports
    .filter((airport) => !airport.liberated)
    .map(createNodeFromAirport)
    .filter(Boolean)

  nodes = [
    baseNode,
    ...unliberatedNodes,
  ].filter(Boolean)

  return data
}

/* -----------------------------
   STATUS UI
----------------------------- */

function showStatus(message) {
  mapStatus.textContent = message
  mapStatus.classList.remove("hidden")
}

function hideStatus() {
  mapStatus.classList.add("hidden")
}

/* -----------------------------
   ASSETS
----------------------------- */

async function loadImage(image) {
  if (image.complete) return

  return new Promise((resolve) => {
    image.onload = resolve
    image.onerror = resolve
  })
}

async function loadAssets() {
  await Promise.all([
    loadImage(mapImage),
    ...Object.values(icons).map(loadImage),
  ])
}

/* -----------------------------
   NODES
----------------------------- */

function createNodeFromAirport(airport) {
  const latitude = Number(airport.latitude)
  const longitude = Number(airport.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.warn("Airport skipped because coordinates are invalid:", airport)
    return null
  }

  const worldPosition = projectAirport(latitude, longitude)

  return {
    id: airport.airportIdent,
    worldX: worldPosition.x,
    worldY: worldPosition.y,
    airport: {
      ...airport,
      latitude,
      longitude,
      difficulty: airport.difficulty ?? {
        id: 1,
        name: "EASY",
      },
    },
    type: getNodeType(airport),
    liberated: Boolean(airport.liberated),
    isBase: Boolean(airport.isBase),
  }
}

function getNodeType(airport) {
  if (airport.isBase) {
    return NODE_TYPES.BASE
  }

  const difficultyId = Number(airport?.difficulty?.id ?? 0)

  if (difficultyId === DIFFICULTY_BOSS_ID || airport.airportIdent === BOSS_AIRPORT_IDENT) {
    return NODE_TYPES.FINAL_BOSS
  }

  if (difficultyId === DIFFICULTY_MINIBOSS_ID || airport.airportIdent === MINIBOSS_AIRPORT_IDENT) {
    return NODE_TYPES.MINIBOSS
  }

  return NODE_TYPES.COMBAT
}

function projectAirport(lat, lon) {
  const x =
    ((lon - MAP_BOUNDS.minLon) / (MAP_BOUNDS.maxLon - MAP_BOUNDS.minLon)) *
    MAP_PAGE_WIDTH

  const y =
    ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) *
    MAP_PAGE_HEIGHT

  return { x, y }
}

/* -----------------------------
   CAMERA
----------------------------- */

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * CAMERA.scale + CAMERA.offsetX,
    y: worldY * CAMERA.scale + CAMERA.offsetY,
  }
}

function screenToWorld(screenX, screenY) {
  return {
    x: (screenX - CAMERA.offsetX) / CAMERA.scale,
    y: (screenY - CAMERA.offsetY) / CAMERA.scale,
  }
}

function clampCamera() {
  const mapWidth = MAP_PAGE_WIDTH * CAMERA.scale
  const mapHeight = MAP_PAGE_HEIGHT * CAMERA.scale

  const minOffsetX = canvas.width - mapWidth
  const minOffsetY = canvas.height - mapHeight

  CAMERA.offsetX = Math.min(0, Math.max(minOffsetX, CAMERA.offsetX))
  CAMERA.offsetY = Math.min(0, Math.max(minOffsetY, CAMERA.offsetY))
}

function resetCamera() {
  CAMERA.scale = 1
  CAMERA.offsetX = 0
  CAMERA.offsetY = 0
}

/* -----------------------------
   DRAWING
----------------------------- */

function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  drawMapBackground()
  drawNodes()
}

function drawMapBackground() {
  if (!mapImage.complete || mapImage.naturalWidth === 0) {
    ctx.fillStyle = "#111"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    return
  }

  ctx.save()

  ctx.translate(CAMERA.offsetX, CAMERA.offsetY)
  ctx.scale(CAMERA.scale, CAMERA.scale)

  ctx.drawImage(mapImage, 0, 0, MAP_PAGE_WIDTH, MAP_PAGE_HEIGHT)

  ctx.restore()
}

function drawNodes() {
  ctx.textAlign = "center"
  ctx.font = "12px 'Press Start 2P'"

  for (const node of nodes) {
    const screenPosition = worldToScreen(node.worldX, node.worldY)

    drawNodeIcon(node, screenPosition)
    drawSelectedRing(node, screenPosition)
    drawNodeLabel(node, screenPosition)
  }
}

function drawNodeIcon(node, position) {
  const icon = getNodeIcon(node)

  if (icon && icon.complete && icon.naturalWidth > 0) {
    ctx.save()

    if (node.liberated && !node.isBase) {
      ctx.globalAlpha = 0.45
    }

    const size = node.isBase ? 42 : 34

    ctx.drawImage(icon, position.x - size / 2, position.y - size / 2, size, size)

    ctx.restore()
    return
  }

  drawFallbackIcon(node, position)
}

function getNodeIcon(node) {
  if (node.type === NODE_TYPES.BASE) return icons.base
  if (node.type === NODE_TYPES.MINIBOSS) return icons.miniboss
  if (node.type === NODE_TYPES.FINAL_BOSS) return icons.boss

  const difficultyName = getDifficultyName(node)

  if (difficultyName === "easy") return icons.easy
  if (difficultyName === "medium") return icons.medium
  if (difficultyName === "hard") return icons.hard

  return icons.easy
}

function drawFallbackIcon(node, position) {
  ctx.beginPath()
  ctx.arc(position.x, position.y, node.isBase ? 15 : 10, 0, Math.PI * 2)

  ctx.fillStyle = getNodeColor(node)
  ctx.fill()

  ctx.strokeStyle = "#111"
  ctx.lineWidth = 2
  ctx.stroke()
}

function drawSelectedRing(node, position) {
  if (node !== selectedNode) return

  ctx.strokeStyle = "#ffd24d"
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(position.x, position.y, 24, 0, Math.PI * 2)
  ctx.stroke()
}

function drawNodeLabel(node, position) {
  ctx.save()

  ctx.fillStyle = getNodeColor(node)
  ctx.shadowColor = "black"
  ctx.shadowBlur = 6

  const label = node.isBase ? "BASE" : node.airport.airportIdent ?? "???"

  ctx.fillText(label, position.x, position.y + 38)

  ctx.restore()
}

function getNodeColor(node) {
  if (node.isBase) return "#8aff8a"
  if (node.liberated) return "#aaaaaa"
  if (node.type === NODE_TYPES.MINIBOSS) return "#ff8a00"
  if (node.type === NODE_TYPES.FINAL_BOSS) return "#ff2222"

  const difficultyName = getDifficultyName(node)

  if (difficultyName === "easy") return "#8aff8a"
  if (difficultyName === "medium") return "#ffd24d"
  if (difficultyName === "hard") return "#ff6666"

  return "#ffffff"
}

function getDifficultyName(node) {
  return String(node?.airport?.difficulty?.name ?? "easy").toLowerCase()
}

/* -----------------------------
   POPUP
----------------------------- */

function openAirportPopup(node) {
  selectedNode = node

  popupName.textContent = String(node.airport.name ?? "Unknown Airport").toUpperCase()
  popupType.textContent = getPopupTypeText(node)
  popupICAO.textContent = `ICAO: ${node.airport.airportIdent}`
  popupCountry.textContent = `COUNTRY: ${node.airport.isoCountry} | ${node.airport.municipality ?? "UNKNOWN"}`
  popupCoords.textContent = `LAT ${node.airport.latitude.toFixed(4)} | LON ${node.airport.longitude.toFixed(4)}`

  setupPrimaryButton(node)

  popup.classList.remove("hidden")
  redraw()
}

function getPopupTypeText(node) {
  if (node.isBase) {
    return "BASE - SHOP AND UPGRADES"
  }

  if (node.type === NODE_TYPES.FINAL_BOSS) {
    return "FINAL BATTLE - BERLIN"
  }

  if (node.type === NODE_TYPES.MINIBOSS) {
    return "MINIBOSS - WOLFSSCHANZE"
  }

  return `COMBAT - ${String(node.airport.difficulty.name).toUpperCase()}`
}

function setupPrimaryButton(node) {
  primaryButton.disabled = false

  if (node.isBase) {
    primaryButton.textContent = "OPEN SHOP"
    primaryButton.onclick = () => {
      window.location.href = SHOP_PAGE
    }
    return
  }

  primaryButton.textContent =
    node.type === NODE_TYPES.FINAL_BOSS
      ? "START FINAL BATTLE"
      : node.type === NODE_TYPES.MINIBOSS
        ? "START MINIBOSS"
        : "START COMBAT"

  primaryButton.onclick = () => startCombat(node)
}

function startCombat(node) {
  const difficulty = getGameDifficultyFromAirport(node.airport)

  const selectedAirport = {
    gameSessionId,
    airportIdent: node.airport.airportIdent,
    name: node.airport.name,
    type: node.airport.type,
    isoCountry: node.airport.isoCountry,
    municipality: node.airport.municipality,
    latitude: node.airport.latitude,
    longitude: node.airport.longitude,
    difficulty: node.airport.difficulty,
    gameDifficulty: difficulty,
  }

  sessionStorage.setItem(SELECTED_AIRPORT_KEY, JSON.stringify(selectedAirport))
  sessionStorage.setItem(ACTIVE_GAME_SESSION_KEY, String(gameSessionId))

  sessionStorage.setItem("gameSessionId", String(gameSessionId))
  sessionStorage.setItem("selectedAirportIdent", node.airport.airportIdent)
  sessionStorage.setItem("selectedAirportName", node.airport.name)
  sessionStorage.setItem("selectedAirportDifficulty", difficulty)

  window.location.href =
    `${GAME_PAGE}?airportIdent=${encodeURIComponent(node.airport.airportIdent)}&difficulty=${encodeURIComponent(difficulty)}`
}

function getGameDifficultyFromAirport(airport) {
  const difficultyId = Number(airport?.difficulty?.id ?? 1)
  const name = String(airport?.difficulty?.name ?? "easy").toLowerCase()

  if (difficultyId === DIFFICULTY_BOSS_ID || airport.airportIdent === BOSS_AIRPORT_IDENT) return "boss"
  if (difficultyId === DIFFICULTY_MINIBOSS_ID || airport.airportIdent === MINIBOSS_AIRPORT_IDENT) return "miniboss"
  if (name === "hard") return "hard"
  if (name === "medium") return "medium"

  return "easy"
}

function closePopup() {
  popup.classList.add("hidden")
  selectedNode = null
  redraw()
}

function closePopupWithoutRedraw() {
  popup.classList.add("hidden")
  selectedNode = null
}

/* -----------------------------
   INPUT
----------------------------- */

function getCanvasMousePosition(event) {
  const rect = canvas.getBoundingClientRect()

  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  }
}

function getClickedNode(event) {
  const mouse = getCanvasMousePosition(event)

  return nodes.find((node) => {
    const position = worldToScreen(node.worldX, node.worldY)
    const distance = Math.hypot(mouse.x - position.x, mouse.y - position.y)

    return distance < 34
  })
}

function zoomAtMouse(event) {
  event.preventDefault()

  const mouse = getCanvasMousePosition(event)
  const worldBeforeZoom = screenToWorld(mouse.x, mouse.y)

  const zoomFactor = event.deltaY < 0 ? 1.15 : 0.85

  CAMERA.scale = Math.min(
    CAMERA.maxScale,
    Math.max(CAMERA.minScale, CAMERA.scale * zoomFactor)
  )

  CAMERA.offsetX = mouse.x - worldBeforeZoom.x * CAMERA.scale
  CAMERA.offsetY = mouse.y - worldBeforeZoom.y * CAMERA.scale

  clampCamera()
  redraw()
}

function startDragging(event) {
  isDragging = true
  hasDragged = false

  dragStart = getCanvasMousePosition(event)

  cameraStart = {
    offsetX: CAMERA.offsetX,
    offsetY: CAMERA.offsetY,
  }

  canvas.classList.add("dragging")
  canvas.setPointerCapture(event.pointerId)
}

function dragMap(event) {
  if (!isDragging) return

  const mouse = getCanvasMousePosition(event)

  const deltaX = mouse.x - dragStart.x
  const deltaY = mouse.y - dragStart.y

  if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
    hasDragged = true
  }

  CAMERA.offsetX = cameraStart.offsetX + deltaX
  CAMERA.offsetY = cameraStart.offsetY + deltaY

  clampCamera()
  redraw()
}

function stopDragging(event) {
  if (!isDragging) return

  isDragging = false
  canvas.classList.remove("dragging")

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }

  if (hasDragged) {
    return
  }

  const clickedNode = getClickedNode(event)

  if (!clickedNode) {
    closePopup()
    return
  }

  openAirportPopup(clickedNode)
}

/* -----------------------------
   EVENTS
----------------------------- */

canvas.addEventListener("wheel", zoomAtMouse, { passive: false })
canvas.addEventListener("pointerdown", startDragging)
canvas.addEventListener("pointermove", dragMap)
canvas.addEventListener("pointerup", stopDragging)
canvas.addEventListener("pointercancel", stopDragging)

closePopupButton.addEventListener("click", closePopup)

refreshMapButton.addEventListener("click", () => {
  refreshMap()
})

backMenuButton.addEventListener("click", () => {
  window.location.href = APP_CONFIG.routes.mainMenu
})

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopup()
  }

  if (event.key.toLowerCase() === "r") {
    refreshMap()
  }
})

/* -----------------------------
   INIT
----------------------------- */

async function initMap() {
  showStatus("LOADING MAP...")

  canvas.width = MAP_PAGE_WIDTH
  canvas.height = MAP_PAGE_HEIGHT

  await loadAssets()

  if (!mapImage.complete || mapImage.naturalWidth === 0) {
    showStatus("MAP IMAGE NOT FOUND")
  }

  await refreshMap()
}

async function refreshMap() {
  try {
    showStatus("LOADING CAMPAIGN DATA...")

    resetCamera()
    closePopupWithoutRedraw()

    await loadMapData()

    if (nodes.length === 0) {
      showStatus("NO AIRPORTS FOUND")
      redraw()
      return
    }

    if (nodes.length === 1 && nodes[0].airport.airportIdent === HELSINKI_AIRPORT_IDENT && !nodes[0].isBase) {
      redraw()
      return
    }

    hideStatus()
    redraw()
  } catch (error) {
    console.error(error)
    showStatus(error.message || "FAILED TO LOAD MAP DATA")
    redraw()
  }
}