import { APP_CONFIG } from "./config.js"
import { logoutUser } from "./authApi.js"

const canvas = document.getElementById("backgroundCanvas")
const ctx = canvas.getContext("2d")

const video1 = document.getElementById("bgVideo1")
const video2 = document.getElementById("bgVideo2")

const music = document.getElementById("bgMusic")
const audioHint = document.getElementById("audioHint")

let width
let height

const clouds = []
const particles = []
const planes = []

let activeVideo = video1
let nextVideo = video2
let isSwapping = false

/* -----------------------------
   VIDEO SMOOTH LOOP
----------------------------- */

video1.src = "static/assets/videos/PlaneGray.mp4"
video2.src = "static/assets/videos/PlaneGray.mp4"

video1.volume = 0
video2.volume = 0

video1.play().catch(() => {
	console.log("Video autoplay was blocked.")
})

function swapVideos() {
	if (isSwapping) return

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
	if (!activeVideo.duration) return

	const timeLeft = activeVideo.duration - activeVideo.currentTime

	if (timeLeft < 1.25) {
		swapVideos()
	}
}

video1.addEventListener("timeupdate", checkVideoLoop)
video2.addEventListener("timeupdate", checkVideoLoop)

/* -----------------------------
   AUDIO
----------------------------- */

music.volume = 0.28

function enableAudio() {
	music
		.play()
		.then(() => {
			audioHint.classList.add("hidden")
		})
		.catch(() => {
			console.log("Audio not found yet or could not start.")
		})
}

document.addEventListener("click", enableAudio, { once: true })

/* -----------------------------
   CANVAS SIZE
----------------------------- */

function resizeCanvas() {
	width = canvas.width = window.innerWidth
	height = canvas.height = window.innerHeight
}

window.addEventListener("resize", resizeCanvas)
resizeCanvas()

/* -----------------------------
   BACKGROUND OBJECTS
----------------------------- */

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

createClouds()
createParticles()
createPlanes()

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

updateBackground()

/* -----------------------------
   PARALLAX
----------------------------- */

document.addEventListener("mousemove", (event) => {
	const x = (event.clientX / window.innerWidth - 0.5) * 8
	const y = (event.clientY / window.innerHeight - 0.5) * 8

	video1.style.transform = `scale(1.1) translate(${x}px, ${y}px)`
	video2.style.transform = `scale(1.1) translate(${x}px, ${y}px)`
})

/* -----------------------------
   NAVIGATION
----------------------------- */

import { applyMusicVolume } from "./settingsManager.js";

const music = document.getElementById("bgMusic");

applyMusicVolume(music);

/* -----------------------------
   NAVIGATION
----------------------------- */

function goToPage(pageName) {
	showLoadingScreen(pageName, {
		title: "Preparing Mission",
		duration: 2200,
	})
}

function continueGame() {
	const hasSave = localStorage.getItem("ww2PlaneSave")

	if (hasSave) {
		showLoadingScreen("warzone.html", {
			title: "Loading Saved Mission",
			duration: 2300,
		})
	} else {
		alert("No saved game found.")
	}
}

function newGame() {
	const startNew = confirm("Are you sure you want to start a new game?")

	if (startNew) {
		localStorage.setItem("ww2PlaneSave", "new-game-started")

		showLoadingScreen("warzone.html", {
			title: "Preparing New Mission",
			duration: 2300,
		})
	}
}

async function signOut() {
	const confirmSignOut = confirm("Do you want to sign out?")

	if (!confirmSignOut) return

	try {
		await logoutUser()

		showLoadingScreen(APP_CONFIG.routes.login, {
			title: "Ending Session",
			duration: 1800,
		})
	} catch (error) {
		console.error(error)
		alert("Logout failed.")
	}
}

window.goToPage = goToPage
window.continueGame = continueGame
window.newGame = newGame
window.signOut = signOut