import { APP_CONFIG } from "./config.js"
import { apiRequest } from "./apiClient.js"
import { getCurrentUser, logoutUser } from "./authApi.js"

const MAP_PAGE = "map.html"

const ACTIVE_GAME_SESSION_KEY = "ironSkiesActiveGameSessionId"
const ACTIVE_GAME_PROGRESS_KEY = "ironSkiesActiveGameProgress"

const canvas = document.getElementById("backgroundCanvas")
const ctx = canvas?.getContext("2d")

const video1 = document.getElementById("bgVideo1")
const video2 = document.getElementById("bgVideo2")

const music = document.getElementById("bgMusic")
const audioHint = document.getElementById("audioHint")

const menuStatus = document.querySelector("[data-menu-status]")
const menuButtons = document.querySelectorAll(".menu-btn")

let width = 0
let height = 0

const clouds = []
const particles = []
const planes = []

let activeVideo = video1
let nextVideo = video2
let isSwapping = false

initMainMenu()

function initMainMenu() {
  setupVideos()
  setupAudio()
  setupCanvas()
  setupBackgroundObjects()
  updateBackground()
  setupParallax()
  loadMenuStatus()
}

/* -----------------------------
   VIDEO
----------------------------- */

function setupVideos() {
  if (!video1 || !video2) return

  video1.src = "static/assets/videos/PlaneGray.mp4"
  video2.src = "static/assets/videos/PlaneGray.mp4"

  video1.volume = 0
  video2.volume = 0

  video1.play().catch(() => {
    console.log("Video autoplay was blocked.")
  })

  video1.addEventListener("timeupdate", checkVideoLoop)
  video2.addEventListener("timeupdate", checkVideoLoop)
}

function swapVideos() {
  if (isSwapping || !activeVideo || !nextVideo) return

  isSwapping = true

  nextVideo.currentTime = 0
  nextVideo.play().catch(() => {
    console.log("Next video could not start.")
  })

  nextVideo.style.opacity = "1"
  activeVideo.style.opacity = "0"

  setTimeout(() => {
    activeVideo.pause()
    activeVideo.currentTime = 0

    const oldActive = activeVideo
    activeVideo = nextVideo
    nextVideo = oldActive

    isSwapping = false
  }, 1300)
}

function checkVideoLoop() {
  if (!activeVideo?.duration) return

  const timeLeft = activeVideo.duration - activeVideo.currentTime

  if (timeLeft < 1.25) {
    swapVideos()
  }
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

  document.addEventListener("click", enableAudio, { once: true })
}

function enableAudio() {
  if (!music) return

  music
    .play()
    .then(() => {
      audioHint?.classList.add("hidden")
    })
    .catch(() => {
      console.log("Audio not found yet or could not start.")
    })
}

/* -----------------------------
   CANVAS
----------------------------- */

function setupCanvas() {
  if (!canvas || !ctx) return

  window.addEventListener("resize", resizeCanvas)
  resizeCanvas()
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth
  height = canvas.height = window.innerHeight
}

/* -----------------------------
   BACKGROUND OBJECTS
----------------------------- */

function setupBackgroundObjects() {
  createClouds()
  createParticles()
  createPlanes()
}

function createClouds() {
  clouds.length = 0

  for (let i = 0; i < 10; i++) {
    clouds.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 80 + Math.random() * 160,
      speed: 0.04 + Math.random() * 0.12,
      opacity: 0.018 + Math.random() * 0.035,
    })
  }
}

function createParticles() {
  particles.length = 0

  for (let i = 0; i < 55; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 1 + Math.random() * 1.8,
      speedY: 0.1 + Math.random() * 0.28,
      opacity: 0.12 + Math.random() * 0.25,
    })
  }
}

function createPlanes() {
  planes.length = 0

  for (let i = 0; i < 4; i++) {
    planes.push({
      x: Math.random() * width,
      y: 80 + Math.random() * (height * 0.48),
      speed: 0.3 + Math.random() * 0.65,
      scale: 0.55 + Math.random() * 0.75,
      opacity: 0.18 + Math.random() * 0.22,
    })
  }
}

/* -----------------------------
   DRAWING
----------------------------- */

function drawCloud(cloud) {
  ctx.save()

  ctx.globalAlpha = cloud.opacity
  ctx.fillStyle = "white"

  ctx.beginPath()
  ctx.arc(cloud.x, cloud.y, cloud.size * 0.35, 0, Math.PI * 2)
  ctx.arc(cloud.x + cloud.size * 0.25, cloud.y + 10, cloud.size * 0.28, 0, Math.PI * 2)
  ctx.arc(cloud.x - cloud.size * 0.25, cloud.y + 12, cloud.size * 0.25, 0, Math.PI * 2)
  ctx.arc(cloud.x + cloud.size * 0.05, cloud.y - 18, cloud.size * 0.3, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawParticle(particle) {
  ctx.save()

  ctx.globalAlpha = particle.opacity
  ctx.fillStyle = "#f3d58a"

  ctx.beginPath()
  ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

function drawPlane(plane) {
  ctx.save()

  ctx.translate(plane.x, plane.y)
  ctx.scale(plane.scale, plane.scale)

  ctx.globalAlpha = plane.opacity
  ctx.fillStyle = "rgba(0, 0, 0, 1)"

  ctx.beginPath()
  ctx.moveTo(40, 0)
  ctx.lineTo(-32, -8)
  ctx.lineTo(-44, 0)
  ctx.lineTo(-32, 8)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(2, 0)
  ctx.lineTo(-22, -32)
  ctx.lineTo(-6, -32)
  ctx.lineTo(16, 0)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(2, 0)
  ctx.lineTo(-22, 32)
  ctx.lineTo(-6, 32)
  ctx.lineTo(16, 0)
  ctx.closePath()
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(-30, 0)
  ctx.lineTo(-46, -17)
  ctx.lineTo(-36, 0)
  ctx.lineTo(-46, 17)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function updateBackground() {
  if (!ctx) return

  ctx.clearRect(0, 0, width, height)

  clouds.forEach((cloud) => {
    cloud.x += cloud.speed

    if (cloud.x - cloud.size > width) {
      cloud.x = -cloud.size
      cloud.y = Math.random() * height
    }

    drawCloud(cloud)
  })

  planes.forEach((plane) => {
    plane.x += plane.speed

    if (plane.x > width + 130) {
      plane.x = -150
      plane.y = 80 + Math.random() * (height * 0.48)
      plane.opacity = 0.18 + Math.random() * 0.22
      plane.scale = 0.55 + Math.random() * 0.75
    }

    drawPlane(plane)
  })

  particles.forEach((particle) => {
    particle.y -= particle.speedY

    if (particle.y < -10) {
      particle.y = height + 10
      particle.x = Math.random() * width
    }

    drawParticle(particle)
  })

  requestAnimationFrame(updateBackground)
}

/* -----------------------------
   PARALLAX
----------------------------- */

function setupParallax() {
  document.addEventListener("mousemove", (event) => {
    if (!video1 || !video2) return

    const x = (event.clientX / window.innerWidth - 0.5) * 8
    const y = (event.clientY / window.innerHeight - 0.5) * 8

    video1.style.transform = `scale(1.1) translate(${x}px, ${y}px)`
    video2.style.transform = `scale(1.1) translate(${x}px, ${y}px)`
  })
}

/* -----------------------------
   API
----------------------------- */

function getGameStatus() {
  return apiRequest("/game/status")
}

function continueGameSession() {
  return apiRequest("/game/continue")
}

function startGameSession() {
  return apiRequest("/game/start", {
    method: "POST",
  })
}

function getPlayerProfile() {
  return apiRequest("/player/profile")
}

async function loadMenuStatus() {
  try {
    const [currentUser, gameStatus, profile] = await Promise.all([
      getCurrentUser(),
      getGameStatus(),
      getPlayerProfile(),
    ])

    const username = currentUser?.user?.username ?? "Pilot"
    const money = profile?.player?.money ?? 0

    if (!gameStatus.hasActiveGame) {
      setMenuStatus(`${username} | Money: ${money} | No active campaign. Continue will create one.`)
      return
    }

    const liberated = gameStatus.liberatedAirports ?? 0
    const total = gameStatus.totalAirports ?? 0
    const remaining = gameStatus.remainingAirports ?? 0

    setMenuStatus(`${username} | Money: ${money} | Campaign: ${liberated}/${total} liberated | ${remaining} remaining`)
  } catch (error) {
    console.error(error)
    setMenuStatus("Could not load command status.")
  }
}

/* -----------------------------
   NAVIGATION
----------------------------- */

function goToPage(pageName) {
  navigateWithLoading(pageName, {
    title: "Preparing Mission",
    duration: 1800,
  })
}

async function continueGame() {
  setMenuLoading(true)
  setMenuStatus("Checking active campaign...")

  try {
    const continueResult = await continueGameSession()

    if (continueResult.hasActiveGame) {
      saveActiveGame(continueResult)

      navigateWithLoading(MAP_PAGE, {
        title: "Loading Campaign",
        duration: 1800,
      })

      return
    }

    setMenuStatus("No active campaign found. Creating new campaign...")

    const startResult = await startGameSession()
    saveActiveGame(startResult)

    navigateWithLoading(MAP_PAGE, {
      title: "Creating Campaign",
      duration: 1800,
    })
  } catch (error) {
    console.error(error)
    setMenuStatus(error.message || "Could not continue campaign.")
    alert(error.message || "Could not continue campaign.")
  } finally {
    setMenuLoading(false)
  }
}

async function newGame() {
  const startNew = confirm("Start a new campaign? Your old active campaign will be abandoned.")

  if (!startNew) return

  setMenuLoading(true)
  setMenuStatus("Creating new campaign...")

  try {
    const result = await startGameSession()
    saveActiveGame(result)

    navigateWithLoading(MAP_PAGE, {
      title: "Preparing New Campaign",
      duration: 1800,
    })
  } catch (error) {
    console.error(error)
    setMenuStatus(error.message || "Could not start new campaign.")
    alert(error.message || "Could not start new campaign.")
  } finally {
    setMenuLoading(false)
  }
}

async function signOut() {
  const confirmSignOut = confirm("Do you want to sign out?")

  if (!confirmSignOut) return

  setMenuLoading(true)

  try {
    await logoutUser()

    sessionStorage.clear()

    navigateWithLoading(APP_CONFIG.routes.login, {
      title: "Ending Session",
      duration: 1800,
    })
  } catch (error) {
    console.error(error)
    alert(error.message || "Logout failed.")
  } finally {
    setMenuLoading(false)
  }
}

function navigateWithLoading(pageName, options) {
  if (typeof globalThis.showLoadingScreen === "function") {
    globalThis.showLoadingScreen(pageName, options)
    return
  }

  window.location.href = pageName
}

function saveActiveGame(result) {
  if (result?.gameSessionId) {
    sessionStorage.setItem(ACTIVE_GAME_SESSION_KEY, String(result.gameSessionId))
    sessionStorage.setItem("gameSessionId", String(result.gameSessionId))
  }

  const progress = result?.progress ?? {
    occupiedAirportsCount: result?.occupiedAirportsCount,
  }

  sessionStorage.setItem(ACTIVE_GAME_PROGRESS_KEY, JSON.stringify(progress))
}

function setMenuLoading(isLoading) {
  menuButtons.forEach((button) => {
    button.disabled = isLoading
  })
}

function setMenuStatus(message) {
  if (!menuStatus) return

  menuStatus.textContent = message
}

window.goToPage = goToPage
window.continueGame = continueGame
window.newGame = newGame
window.signOut = signOut