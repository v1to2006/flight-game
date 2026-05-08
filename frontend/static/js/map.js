import { APP_CONFIG } from "./config.js"
import { apiRequest } from "./apiClient.js"

const MAP_PAGE_WIDTH = 1920
const MAP_PAGE_HEIGHT = 1080

const GAME_PAGE = "./game.html"
const SHOP_PAGE = "./shop.html"
const START_SPLASH_PAGE = "./startsplash.html"

const HELSINKI_AIRPORT_IDENT = "EFHK"
const MINIBOSS_AIRPORT_IDENT = "EPKE"
const BOSS_AIRPORT_IDENT = "EDDB"

const DIFFICULTY_MINIBOSS_ID = 4
const DIFFICULTY_BOSS_ID = 5

const ACTIVE_GAME_SESSION_KEY = "ironSkiesActiveGameSessionId"
const SELECTED_AIRPORT_KEY = "ironSkiesSelectedAirport"
const HELSINKI_DEFENDED_POPUP_KEY_PREFIX = "ironSkiesHelsinkiDefendedShown:"

const canvas = document.getElementById("mapCanvas")
const ctx = canvas.getContext("2d")

const mapStatus = document.getElementById("mapStatus")
const popup = document.getElementById("airportPopup")
const helsinkiDefendedPopup = document.getElementById("helsinkiDefendedPopup")

const popupName = document.getElementById("popupName")
const popupType = document.getElementById("popupType")
const popupICAO = document.getElementById("popupICAO")
const popupCountry = document.getElementById("popupCountry")
const popupCoords = document.getElementById("popupCoords")

const primaryButton = document.getElementById("primaryButton")
const closePopupButton = document.getElementById("closePopup")
const closeHelsinkiPopupButton = document.getElementById("closeHelsinkiPopup")

const refreshMapButton = document.querySelector("[data-refresh-map]")
const backMenuButton = document.querySelector("[data-back-menu]")

const music = document.getElementById("bgMusic")
const audioHint = document.getElementById("audioHint")

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
let hoveredNode = null
let gameSessionId = null
let shouldShowHelsinkiDefendedPopup = false

let isDragging = false
let hasDragged = false
let dragStart = { x: 0, y: 0 }
let cameraStart = { offsetX: 0, offsetY: 0 }

let musicStarted = false

initMap()

function createImage(src) {
  const image = new Image()
  image.src = src
  return image
}

/* -----------------------------
   AUDIO
----------------------------- */

function setupAudio() {
  if (!music) return

  if (typeof globalThis.applySavedMusicVolume === "function") {
    globalThis.applySavedMusicVolume(music, 28)
  } else {
    music.volume = 0.28
  }

  document.addEventListener("click", enableAudio)
  document.addEventListener("keydown", enableAudio)
}

function enableAudio() {
  if (!music || musicStarted) return

  music
    .play()
    .then(() => {
      musicStarted = true
      audioHint?.classList.add("hidden")
    })
    .catch(() => {
      console.log("Audio waits for user interaction.")
    })
}

/* -----------------------------
   API
----------------------------- */

function continueGameSession() {
  return apiRequest("/game/continue")
}

async function getOrCreateCampaign() {
  const data = await continueGameSession()

  if (data.hasActiveGame) {
    return data
  }

  showStatus("NO ACTIVE CAMPAIGN. OPENING MISSION BRIEFING...")

  window.location.href = START_SPLASH_PAGE

  throw new Error("Redirecting to mission briefing.")
}

async function loadMapData() {
  shouldShowHelsinkiDefendedPopup = false

  const data = await getOrCreateCampaign()

  if (!data.hasActiveGame) {
    throw new Error("No active campaign found.")
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

  shouldShowHelsinkiDefendedPopup = shouldOpenHelsinkiDefendedPopup(gameSessionId)

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
   STORY POPUP
----------------------------- */

function getHelsinkiDefendedPopupKey(sessionId) {
  return `${HELSINKI_DEFENDED_POPUP_KEY_PREFIX}${sessionId}`
}

function shouldOpenHelsinkiDefendedPopup(sessionId) {
  if (!sessionId) return false

  const key = getHelsinkiDefendedPopupKey(sessionId)

  return localStorage.getItem(key) !== "true"
}

function openHelsinkiDefendedPopup() {
  if (!gameSessionId || !helsinkiDefendedPopup) return

  const key = getHelsinkiDefendedPopupKey(gameSessionId)

  localStorage.setItem(key, "true")
  helsinkiDefendedPopup.classList.remove("hidden")
}

function closeHelsinkiDefendedPopup() {
  helsinkiDefendedPopup?.classList.add("hidden")
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
  drawNodeAuras()
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

function drawNodeAuras() {
  for (const node of nodes) {
    const position = worldToScreen(node.worldX, node.worldY)

    drawNodeAura(node, position)
  }
}

function drawNodes() {
  for (const node of nodes) {
    const position = worldToScreen(node.worldX, node.worldY)

    drawNodeIcon(node, position)
    drawNodeMarkerRing(node, position)
  }
}

function drawNodeAura(node, position) {
  const color = getNodeColor(node)
  const isHovered = node === hoveredNode
  const isSelected = node === selectedNode

  const radius =
    getNodeBaseSize(node) / 2 +
    (isHovered ? 15 : isSelected ? 11 : 7)

  ctx.save()

  ctx.globalAlpha = isHovered || isSelected ? 0.58 : 0.26
  ctx.shadowColor = color
  ctx.shadowBlur = isHovered || isSelected ? 32 : 18

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawNodeIcon(node, position) {
  const icon = getNodeIcon(node)
  const color = getNodeColor(node)

  const isHovered = node === hoveredNode
  const isSelected = node === selectedNode

  const baseSize = getNodeBaseSize(node)
  const size = baseSize + (isHovered ? 10 : isSelected ? 6 : 0)

  ctx.save()

  if (node.liberated && !node.isBase) {
    ctx.globalAlpha = 0.45
  }

  ctx.shadowColor = color
  ctx.shadowBlur = isHovered || isSelected ? 20 : 10

  if (icon && icon.complete && icon.naturalWidth > 0) {
    ctx.drawImage(icon, position.x - size / 2, position.y - size / 2, size, size)
  } else {
    drawFallbackIcon(node, position, size / 2)
  }

  ctx.restore()
}

function drawFallbackIcon(node, position, radius) {
  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)

  ctx.fillStyle = getNodeColor(node)
  ctx.fill()

  ctx.strokeStyle = "#0b0b0d"
  ctx.lineWidth = 3
  ctx.stroke()
}

function drawNodeMarkerRing(node, position) {
  const isHovered = node === hoveredNode
  const isSelected = node === selectedNode

  if (!isHovered && !isSelected && node.type !== NODE_TYPES.BASE && node.type !== NODE_TYPES.MINIBOSS && node.type !== NODE_TYPES.FINAL_BOSS) {
    return
  }

  const color = getNodeColor(node)
  const radius = getNodeBaseSize(node) / 2 + (isHovered || isSelected ? 17 : 11)

  ctx.save()

  ctx.strokeStyle = isSelected ? "#fff0a8" : color
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.shadowColor = color
  ctx.shadowBlur = isHovered || isSelected ? 18 : 8

  ctx.beginPath()
  ctx.arc(position.x, position.y, radius, 0, Math.PI * 2)
  ctx.stroke()

  if (node.type === NODE_TYPES.MINIBOSS || node.type === NODE_TYPES.FINAL_BOSS) {
    drawTargetBrackets(position, radius + 7, color)
  }

  ctx.restore()
}

function drawTargetBrackets(position, radius, color) {
  const length = 12

  ctx.strokeStyle = color
  ctx.lineWidth = 2

  ctx.beginPath()

  ctx.moveTo(position.x - radius, position.y - length)
  ctx.lineTo(position.x - radius, position.y + length)

  ctx.moveTo(position.x + radius, position.y - length)
  ctx.lineTo(position.x + radius, position.y + length)

  ctx.moveTo(position.x - length, position.y - radius)
  ctx.lineTo(position.x + length, position.y - radius)

  ctx.moveTo(position.x - length, position.y + radius)
  ctx.lineTo(position.x + length, position.y + radius)

  ctx.stroke()
}

function getNodeBaseSize(node) {
  if (node.type === NODE_TYPES.BASE) return 46
  if (node.type === NODE_TYPES.FINAL_BOSS) return 44
  if (node.type === NODE_TYPES.MINIBOSS) return 42

  return 34
}

function getNodeHitRadius(node) {
  if (node.type === NODE_TYPES.BASE) return 34
  if (node.type === NODE_TYPES.FINAL_BOSS) return 36
  if (node.type === NODE_TYPES.MINIBOSS) return 35

  return 30
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

function getNodeColor(node) {
  if (node.isBase) return "#8aff8a"
  if (node.liberated) return "#aaaaaa"
  if (node.type === NODE_TYPES.MINIBOSS) return "#ff9f2e"
  if (node.type === NODE_TYPES.FINAL_BOSS) return "#ff2f2f"

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

  popup.dataset.nodeType = node.type.toLowerCase().replace("_", "-")

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
  delete popup.dataset.nodeType
  redraw()
}

function closePopupWithoutRedraw() {
  popup.classList.add("hidden")
  selectedNode = null
  delete popup.dataset.nodeType
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

function getNodeAtCanvasPosition(x, y) {
  let closestNode = null
  let closestDistance = Infinity

  for (const node of nodes) {
    const position = worldToScreen(node.worldX, node.worldY)
    const distance = Math.hypot(x - position.x, y - position.y)
    const hitRadius = getNodeHitRadius(node)

    if (distance <= hitRadius && distance < closestDistance) {
      closestNode = node
      closestDistance = distance
    }
  }

  return closestNode
}

function getNodeFromEvent(event) {
  const mouse = getCanvasMousePosition(event)

  return getNodeAtCanvasPosition(mouse.x, mouse.y)
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

function handlePointerMove(event) {
  if (isDragging) {
    dragMap(event)
    return
  }

  const nextHoveredNode = getNodeFromEvent(event)

  if (nextHoveredNode === hoveredNode) return

  hoveredNode = nextHoveredNode

  canvas.classList.toggle("node-hover", Boolean(hoveredNode))

  redraw()
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

  const clickedNode = getNodeFromEvent(event)

  if (!clickedNode) {
    closePopup()
    return
  }

  hoveredNode = clickedNode
  openAirportPopup(clickedNode)
}

function clearHover() {
  if (!hoveredNode) return

  hoveredNode = null
  canvas.classList.remove("node-hover")
  redraw()
}

/* -----------------------------
   EVENTS
----------------------------- */

canvas.addEventListener("wheel", zoomAtMouse, { passive: false })
canvas.addEventListener("pointerdown", startDragging)
canvas.addEventListener("pointermove", handlePointerMove)
canvas.addEventListener("pointerup", stopDragging)
canvas.addEventListener("pointercancel", stopDragging)
canvas.addEventListener("pointerleave", clearHover)

closePopupButton.addEventListener("click", closePopup)
closeHelsinkiPopupButton?.addEventListener("click", closeHelsinkiDefendedPopup)

refreshMapButton.addEventListener("click", () => {
  refreshMap()
})

backMenuButton.addEventListener("click", () => {
  window.location.href = APP_CONFIG.routes.mainMenu
})

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePopup()
    closeHelsinkiDefendedPopup()
  }

  if (event.key.toLowerCase() === "r") {
    refreshMap()
  }
})

/* -----------------------------
   INIT
----------------------------- */

async function initMap() {
  setupAudio()

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
    closeHelsinkiDefendedPopup()

    hoveredNode = null
    canvas.classList.remove("node-hover")

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

    if (shouldShowHelsinkiDefendedPopup) {
      openHelsinkiDefendedPopup()
    }
  } catch (error) {
    console.error(error)
    showStatus(error.message || "FAILED TO LOAD MAP DATA")
    redraw()
  }
}