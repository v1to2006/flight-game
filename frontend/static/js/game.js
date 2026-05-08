import { apiRequest } from "./apiClient.js"

const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

canvas.width = 1280
canvas.height = 720

const GAME_WIDTH = canvas.width
const GAME_HEIGHT = canvas.height
const TARGET_FRAME_MS = 500 / 60

const MAP_PAGE = "./map.html"
const SHOP_PAGE = "./shop.html"

const SELECTED_AIRPORT_KEY = "ironSkiesSelectedAirport"

const urlParams = new URLSearchParams(window.location.search)

const selectedAirport = getSelectedAirport()
const airportIdent = selectedAirport?.airportIdent || urlParams.get("airportIdent")
const CURRENT_DIFFICULTY = getDifficultyFromSelectedAirport()

let selectedPlane = null
let gameReady = false
let apiResultMessage = ""
let lastFrameTime = performance.now()

const DIFFICULTY_CONFIGS = {
  easy: {
    timeMin: 170,
    timeMax: 230,
    killsMin: 10,
    killsMax: 15,
    spawnDelayMin: 120,
    spawnDelayMax: 150,
    enemyPool: ["fighter", "heavy"],
  },

  medium: {
    timeMin: 200,
    timeMax: 280,
    killsMin: 15,
    killsMax: 20,
    spawnDelayMin: 120,
    spawnDelayMax: 150,
    enemyPool: ["fighter", "heavy", "fast", "shotgun"],
  },

  hard: {
    timeMin: 230,
    timeMax: 340,
    killsMin: 20,
    killsMax: 30,
    spawnDelayMin: 150,
    spawnDelayMax: 200,
    enemyPool: ["fighter", "heavy", "fast", "shotgun", "rocketHeavy", "stealthRam"],
  },

  miniboss: {
    timeMin: 300,
    timeMax: 360,
    killsMin: 10,
    killsMax: 15,
    spawnDelayMin: 70,
    spawnDelayMax: 100,
    enemyPool: ["fighter", "heavy"],
    hasMiniBoss: true,
  },

  boss: {
    timeMin: 420,
    timeMax: 480,
    killsMin: 15,
    killsMax: 20,
    spawnDelayMin: 50,
    spawnDelayMax: 100,
    enemyPool: ["fighter", "heavy", "fast", "rocketHeavy"],
    hasBoss: true,
  },
}

const ENEMY_TYPES = {
  fighter: {
    type: "fighter",
    width: 64,
    height: 64,
    hp: 2,
    speed: 1.0,
    scoreValue: 100,
    image: "enemy",
    shootDelay: 150,
    bulletSpeed: 4,
    pattern: "single",
  },

  heavy: {
    type: "heavy",
    width: 78,
    height: 78,
    hp: 4,
    speed: 0.8,
    scoreValue: 220,
    image: "enemyHeavy",
    shootDelay: 200,
    bulletSpeed: 2.5,
    pattern: "dual",
  },

  fast: {
    type: "fast",
    width: 48,
    height: 48,
    hp: 1,
    speed: 3,
    scoreValue: 150,
    image: "enemyFast",
    shootDelay: 165,
    bulletSpeed: 5,
    pattern: "single",
  },

  shotgun: {
    type: "shotgun",
    width: 66,
    height: 66,
    hp: 3,
    speed: 1.2,
    scoreValue: 260,
    image: "enemyShotgun",
    shootDelay: 300,
    bulletSpeed: 2.0,
    pattern: "shotgun",
  },

  rocketHeavy: {
    type: "rocketHeavy",
    width: 86,
    height: 86,
    hp: 6,
    speed: 1.5,
    scoreValue: 360,
    image: "enemyRocketHeavy",
    shootDelay: 150,
    bulletSpeed: 3.0,
    pattern: "rocket",
  },

  stealthRam: {
    type: "stealthRam",
    width: 58,
    height: 58,
    hp: 2,
    speed: 3.0,
    scoreValue: 320,
    image: "enemyStealth",
    shootDelay: 9999,
    bulletSpeed: 0,
    pattern: "ram",
    stealth: true,
  },

  miniboss: {
    type: "miniboss",
    width: 150,
    height: 120,
    hp: 150,
    speed: 1.4,
    scoreValue: 2500,
    image: "enemyMiniBoss",
    shootDelay: 75,
    bulletSpeed: 4.8,
    pattern: "miniboss",
    boss: true,
  },

  boss: {
    type: "boss",
    width: 320,
    height: 220,
    hp: 350,
    speed: 1.0,
    scoreValue: 8000,
    image: "enemyBoss",
    shootDelay: 200,
    bulletSpeed: 2,
    pattern: "boss",
    boss: true,
    finalBoss: true,
  },
}

const PLAYER_IMAGE_BY_PLANE_ID = {
  1: "./static/assets/planes/player_fighter1.png",
  2: "./static/assets/planes/player_attacker.png",
  3: "./static/assets/planes/player_interceptor.png",
}

const WEAPON_BY_PLANE_ID = {
  1: {
    weaponType: "single",
    rocketEveryShots: 0,
    autoCannonDelay: 0,
  },

  2: {
    weaponType: "heavy_auto",
    rocketEveryShots: 4,
    autoCannonDelay: 70,
  },

  3: {
    weaponType: "dual_rocket_alt",
    rocketEveryShots: 5,
    autoCannonDelay: 0,
  },
}

const difficultyConfig = DIFFICULTY_CONFIGS[CURRENT_DIFFICULTY] || DIFFICULTY_CONFIGS.easy

const game = {
  score: 0,
  wave: 1,
  kills: 0,
  targetKills: randomInt(difficultyConfig.killsMin, difficultyConfig.killsMax),
  timeLimit: randomInt(difficultyConfig.timeMin, difficultyConfig.timeMax),
  timeLeft: 0,
  startTime: performance.now(),
  state: "loading",
  paused: false,
  endMessage: "",
  enemySpawnTimer: 0,
  enemySpawnDelay: randomInt(difficultyConfig.spawnDelayMin, difficultyConfig.spawnDelayMax),
  rewardGiven: false,
  backendLiberationDone: false,
  backendLiberationLoading: false,

  miniBossStarted: false,
  miniBossDefeated: false,
  waitingForMiniBoss: false,
  miniBossIntroTimer: 0,

  bossStarted: false,
  bossDefeated: false,
  waitingForBoss: false,
  bossIntroTimer: 0,
  bossSecondWarningShown: false,
  bossPhase: 1,
}

game.timeLeft = game.timeLimit

const player = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT - 100,
  width: 64,
  height: 64,
  speed: 6,
  hp: 5,
  maxHp: 5,
  damage: 1,
  planeType: 1,
  weaponType: "single",
  rocketEveryShots: 0,
  autoCannonDelay: 0,
  autoCannonCooldown: 0,
  shotCounter: 0,
  rocketSide: "left",
  shootCooldown: 0,
  shootDelay: 20,
  invincibleTimer: 0,
  invincibleDuration: 70,
}

const bullets = []
const enemyBullets = []
const enemies = []
const explosions = []
const warnings = []
const keys = {}
const menuButtons = []

let musicStarted = false
let currentMusicPath = ""

const AUDIO_BASE = "static/assets/audio/"

const MUSIC_TRACKS = {
  easy: AUDIO_BASE + "easy.wav",
  medium: AUDIO_BASE + "medium.wav",
  hard: AUDIO_BASE + "hard.wav",
  minibossStage: AUDIO_BASE + "easy.wav",
  minibossFight: AUDIO_BASE + "miniboss.wav",
  bossStage: AUDIO_BASE + "hard.wav",
  bossFight: AUDIO_BASE + "finalboss.wav",
}

const ambientMusic = new Audio(getStartingMusicPath())
ambientMusic.loop = true

if (typeof applySavedMusicVolume === "function") {
  applySavedMusicVolume(ambientMusic)
} else {
  ambientMusic.volume = 0.28
}

currentMusicPath = getStartingMusicPath()

const images = {
  background: loadImage("static/assets/backgrounds/ww2_map.png"),
  player: loadImage("./static/assets/planes/player_fighter1.png"),

  enemy: loadImage("static/assets/planes/enemy_fighter.png"),
  enemyHeavy: loadImage("static/assets/planes/enemy_heavy.png"),
  enemyFast: loadImage("static/assets/planes/enemy_fast.png"),
  enemyShotgun: loadImage("static/assets/planes/enemy_shotgun.png"),
  enemyRocketHeavy: loadImage("static/assets/planes/enemy_rocket_heavy.png"),
  enemyStealth: loadImage("static/assets/planes/enemy_stealth.png"),
  enemyMiniBoss: loadImage("static/assets/planes/miniboss.png"),
  enemyBoss: loadImage("static/assets/planes/final_boss.png"),

  cloud1: loadImage("static/assets/clouds/cloud1.png"),
  cloud2: loadImage("static/assets/clouds/cloud2.png"),
}

const backgroundLayer = {
  y1: 0,
  y2: -GAME_HEIGHT,
  speed: 0.45,
}

const clouds = [
  {
    x: 120,
    y: 80,
    width: 260,
    height: 130,
    speed: 0.35,
    image: "cloud1",
    alpha: 0.24,
  },
  {
    x: 780,
    y: 260,
    width: 320,
    height: 150,
    speed: 0.22,
    image: "cloud2",
    alpha: 0.2,
  },
  {
    x: 430,
    y: -160,
    width: 360,
    height: 170,
    speed: 0.42,
    image: "cloud1",
    alpha: 0.18,
  },
  {
    x: 50,
    y: 520,
    width: 300,
    height: 140,
    speed: 0.28,
    image: "cloud2",
    alpha: 0.16,
  },
]

initGame()
requestAnimationFrame(gameLoop)

async function initGame() {
  if (!airportIdent) {
    game.state = "error"
    game.endMessage = "No airport selected. Return to campaign map."
    return
  }

  try {
    selectedPlane = await loadSelectedPlaneFromBackend()
    applySelectedPlane(selectedPlane)

    game.state = "playing"
    gameReady = true
    game.startTime = performance.now()
    game.timeLeft = game.timeLimit
  } catch (error) {
    console.error(error)
    game.state = "error"
    game.endMessage = error.message || "Failed to load player plane."
  }
}

function getSelectedAirport() {
  const raw = sessionStorage.getItem(SELECTED_AIRPORT_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getDifficultyFromSelectedAirport() {
  const difficultyFromSession = selectedAirport?.gameDifficulty
  const difficultyFromQuery = urlParams.get("difficulty")

  if (difficultyFromSession) return normalizeDifficulty(difficultyFromSession)
  if (difficultyFromQuery) return normalizeDifficulty(difficultyFromQuery)

  return "easy"
}

function normalizeDifficulty(value) {
  const normalized = String(value).toLowerCase()

  if (normalized === "boss") return "boss"
  if (normalized === "miniboss") return "miniboss"
  if (normalized === "hard") return "hard"
  if (normalized === "medium") return "medium"

  return "easy"
}

async function loadSelectedPlaneFromBackend() {
  const data = await apiRequest("/player/planes")

  const planes = Array.isArray(data.planes)
    ? data.planes
    : []

  const selected = planes.find((plane) => plane.selected) || planes[0]

  if (!selected) {
    throw new Error("No owned plane found.")
  }

  return selected
}

function applySelectedPlane(plane) {
  const planeId = Number(plane.planeId)
  const stats = plane.stats ?? plane.baseStats ?? {}

  const weapon = WEAPON_BY_PLANE_ID[planeId] ?? WEAPON_BY_PLANE_ID[1]

  player.planeType = planeId
  player.maxHp = Math.max(1, Math.round(Number(stats.hp ?? 100) / 20))
  player.hp = player.maxHp
  player.speed = Math.max(3, Number(stats.speed ?? 250) / 45)
  player.damage = Math.max(1, Number(stats.damage ?? 20) / 20)
  player.shootDelay = Math.max(4, Math.round(24 / Math.max(0.5, Number(stats.firerate ?? 1))))
  player.weaponType = weapon.weaponType
  player.rocketEveryShots = weapon.rocketEveryShots
  player.autoCannonDelay = weapon.autoCannonDelay

  images.player = loadImage(PLAYER_IMAGE_BY_PLANE_ID[planeId] ?? PLAYER_IMAGE_BY_PLANE_ID[1])
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function loadImage(src) {
  const img = new Image()
  img.src = src
  img.loaded = false

  img.onload = () => {
    img.loaded = true
  }

  img.onerror = () => {
    console.warn("Image not found:", src)
  }

  return img
}

function getStartingMusicPath() {
  if (CURRENT_DIFFICULTY === "miniboss") {
    return MUSIC_TRACKS.minibossStage
  }

  if (CURRENT_DIFFICULTY === "boss") {
    return MUSIC_TRACKS.bossStage
  }

  return MUSIC_TRACKS[CURRENT_DIFFICULTY] || MUSIC_TRACKS.easy
}

function startMusic() {
  if (musicStarted) return

  ambientMusic
    .play()
    .then(() => {
      musicStarted = true
    })
    .catch((error) => {
      console.warn("Music could not start yet:", error)
    })
}

function switchMusic(newPath, volume = 0.32) {
  if (currentMusicPath === newPath) return

  currentMusicPath = newPath

  ambientMusic.pause()
  ambientMusic.currentTime = 0
  ambientMusic.src = newPath
  ambientMusic.loop = true

  if (typeof applySavedMusicVolume === "function") {
    applySavedMusicVolume(ambientMusic)
  } else {
    ambientMusic.volume = volume
  }

  if (musicStarted) {
    ambientMusic.play().catch((error) => {
      console.warn("Music switch failed:", error)
    })
  }
}

window.addEventListener("keydown", (event) => {
  startMusic()

  const key = event.key.toLowerCase()

  if (
    key === " " ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright"
  ) {
    event.preventDefault()
  }

  keys[key] = true

  if (key === "escape" || key === "p") {
    if (game.state === "playing") {
      game.paused = !game.paused
    }
  }

  if ((game.state === "lose" || game.state === "error") && key === "r") {
    restartGame()
  }
})

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false
})

window.addEventListener("click", () => {
  startMusic()
})

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect()

  const scaleX = GAME_WIDTH / rect.width
  const scaleY = GAME_HEIGHT / rect.height

  const mouseX = (event.clientX - rect.left) * scaleX
  const mouseY = (event.clientY - rect.top) * scaleY

  for (const button of menuButtons) {
    const inside =
      mouseX >= button.x &&
      mouseX <= button.x + button.width &&
      mouseY >= button.y &&
      mouseY <= button.y + button.height

    if (inside) {
      button.action()
      return
    }
  }
})

function restartGame() {
  game.score = 0
  game.wave = 1
  game.kills = 0
  game.targetKills = randomInt(difficultyConfig.killsMin, difficultyConfig.killsMax)
  game.timeLimit = randomInt(difficultyConfig.timeMin, difficultyConfig.timeMax)
  game.timeLeft = game.timeLimit
  game.startTime = performance.now()
  game.state = "playing"
  game.paused = false
  game.endMessage = ""
  game.enemySpawnTimer = 0
  game.enemySpawnDelay = randomInt(difficultyConfig.spawnDelayMin, difficultyConfig.spawnDelayMax)
  game.rewardGiven = false
  game.backendLiberationDone = false
  game.backendLiberationLoading = false

  game.miniBossStarted = false
  game.miniBossDefeated = false
  game.waitingForMiniBoss = false
  game.miniBossIntroTimer = 0

  game.bossStarted = false
  game.bossDefeated = false
  game.waitingForBoss = false
  game.bossIntroTimer = 0
  game.bossSecondWarningShown = false
  game.bossPhase = 1

  player.x = GAME_WIDTH / 2
  player.y = GAME_HEIGHT - 100
  player.hp = player.maxHp
  player.shootCooldown = 0
  player.invincibleTimer = 0
  player.shotCounter = 0
  player.rocketSide = "left"
  player.autoCannonCooldown = 0

  apiResultMessage = ""

  bullets.length = 0
  enemyBullets.length = 0
  enemies.length = 0
  explosions.length = 0
  warnings.length = 0
}

function update(dt) {
  if (game.state === "loading" || game.state === "error") {
    updateBackground(dt)
    return
  }

  if (game.state !== "playing") {
    updateExplosions(dt)
    updateWarnings(dt)
    updateBackground(dt)
    return
  }

  if (game.paused) {
    updateWarnings(dt)
    return
  }

  updateTimer()
  updatePlayer(dt)
  updateShooting(dt)
  updateAutoCannon(dt)
  updateBullets(dt)
  updateEnemyBullets(dt)
  updateEnemies(dt)
  updateCollisions()
  updateExplosions(dt)
  updateWarnings(dt)
  updateBackground(dt)
}

function updateTimer() {
  const now = performance.now()
  const elapsed = Math.floor((now - game.startTime) / 1000)

  game.timeLeft = Math.max(0, game.timeLimit - elapsed)

  if (game.timeLeft <= 0 && game.state === "playing") {
    game.state = "lose"
  }
}

function updatePlayer(dt) {
  if (keys["arrowleft"] || keys["a"]) {
    player.x -= player.speed * dt
  }

  if (keys["arrowright"] || keys["d"]) {
    player.x += player.speed * dt
  }

  if (keys["arrowup"] || keys["w"]) {
    player.y -= player.speed * dt
  }

  if (keys["arrowdown"] || keys["s"]) {
    player.y += player.speed * dt
  }

  const halfWidth = player.width / 2
  const halfHeight = player.height / 2

  player.x = Math.max(halfWidth, Math.min(GAME_WIDTH - halfWidth, player.x))
  player.y = Math.max(halfHeight, Math.min(GAME_HEIGHT - halfHeight, player.y))

  if (player.invincibleTimer > 0) {
    player.invincibleTimer -= dt
  }
}

function updateShooting(dt) {
  if (player.shootCooldown > 0) {
    player.shootCooldown -= dt
  }

  if ((keys[" "] || keys["space"]) && player.shootCooldown <= 0) {
    shootBullet()
    player.shootCooldown = player.shootDelay
  }
}

function updateAutoCannon(dt) {
  if (player.weaponType !== "heavy_auto") return

  if (player.autoCannonCooldown > 0) {
    player.autoCannonCooldown -= dt
    return
  }

  const target = findSideEnemyTarget()

  if (!target) return

  const dx = target.x - player.x
  const dy = target.y - player.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return

  const speed = 9

  bullets.push({
    type: "autocannon",
    x: player.x,
    y: player.y - 10,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    width: 5,
    height: 14,
    speed,
    damage: player.damage * 0.8,
  })

  player.autoCannonCooldown = player.autoCannonDelay || 70
}

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i]

    bullet.x += (bullet.vx || 0) * dt
    bullet.y += (bullet.vy || -bullet.speed) * dt

    if (
      bullet.y + bullet.height < 0 ||
      bullet.x < -50 ||
      bullet.x > GAME_WIDTH + 50 ||
      bullet.y > GAME_HEIGHT + 50
    ) {
      bullets.splice(i, 1)
    }
  }
}

function updateEnemyBullets(dt) {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i]

    bullet.x += (bullet.vx || 0) * dt
    bullet.y += (bullet.vy || 0) * dt

    if (
      bullet.y > GAME_HEIGHT + bullet.height ||
      bullet.x < -50 ||
      bullet.x > GAME_WIDTH + 50 ||
      bullet.y < -50
    ) {
      enemyBullets.splice(i, 1)
      continue
    }

    if (rectsCollide(getEnemyBulletRect(bullet), getPlayerRect())) {
      enemyBullets.splice(i, 1)
      createExplosion(bullet.x, bullet.y, 16)
      damagePlayer(bullet.damage || 1)
    }
  }
}

function updateEnemies(dt) {
  if (difficultyConfig.hasMiniBoss) {
    handleMiniBossFlow(dt)
  }

  if (difficultyConfig.hasBoss) {
    handleBossFlow(dt)
  }

  if (difficultyConfig.hasMiniBoss && (game.waitingForMiniBoss || game.miniBossStarted)) {
    updateExistingEnemiesOnly(dt)
    return
  }

  if (difficultyConfig.hasBoss && (game.waitingForBoss || game.bossStarted)) {
    updateExistingEnemiesOnly(dt)
    return
  }

  game.enemySpawnTimer += dt

  if (game.enemySpawnTimer >= game.enemySpawnDelay) {
    spawnEnemy()
    game.enemySpawnTimer = 0
  }

  if (game.kills >= Math.floor(game.targetKills * 0.33)) {
    game.wave = 2
    game.enemySpawnDelay = Math.max(34, difficultyConfig.spawnDelayMin - 5)
  }

  if (game.kills >= Math.floor(game.targetKills * 0.66)) {
    game.wave = 3
    game.enemySpawnDelay = Math.max(28, difficultyConfig.spawnDelayMin - 12)
  }

  updateExistingEnemiesOnly(dt)
}

function updateExistingEnemiesOnly(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i]

    if (enemy.type === "boss") {
      updateBoss(enemy, dt)
    } else if (enemy.type === "miniboss") {
      updateMiniBoss(enemy, dt)
    } else if (enemy.type === "stealthRam") {
      updateStealthRam(enemy, dt)
    } else {
      enemy.y += enemy.speed * dt
      enemy.x += enemy.drift * dt
    }

    if (enemy.stealth && enemy.stealthAlpha < 0.8) {
      enemy.stealthAlpha += 0.006 * dt
    }

    enemy.shootTimer -= dt

    if (
      enemy.pattern !== "ram" &&
      enemy.shootTimer <= 0 &&
      enemy.y > 20 &&
      enemy.y < GAME_HEIGHT - 100
    ) {
      enemyShoot(enemy)
      enemy.shootTimer = enemy.shootDelay + Math.floor(Math.random() * 50)
    }

    if (enemy.x < enemy.width / 2 || enemy.x > GAME_WIDTH - enemy.width / 2) {
      enemy.drift *= -1
    }

    if (
      enemy.y > GAME_HEIGHT + enemy.height ||
      enemy.y < -enemy.height - 80
    ) {
      enemies.splice(i, 1)
    }
  }
}

function handleMiniBossFlow(dt) {
  if (game.miniBossStarted || game.miniBossDefeated) return

  if (game.kills >= game.targetKills && !game.waitingForMiniBoss) {
    game.waitingForMiniBoss = true
    game.miniBossIntroTimer = 120

    enemies.length = 0
    enemyBullets.length = 0
    bullets.length = 0

    createWarning("MINIBOSS APPROACHING", GAME_WIDTH / 2, 205, 120)
  }

  if (game.waitingForMiniBoss) {
    game.miniBossIntroTimer -= dt

    if (game.miniBossIntroTimer <= 0) {
      spawnMiniBoss()
      game.waitingForMiniBoss = false
      game.miniBossStarted = true
      game.wave = "MINIBOSS"
    }
  }
}

function handleBossFlow(dt) {
  if (game.bossStarted || game.bossDefeated) return

  if (game.kills >= game.targetKills && !game.waitingForBoss) {
    game.waitingForBoss = true
    game.bossIntroTimer = 160
    game.bossSecondWarningShown = false

    enemies.length = 0
    enemyBullets.length = 0
    bullets.length = 0

    createWarning("UNKNOWN HEAVY SIGNAL", GAME_WIDTH / 2, 205, 140)
  }

  if (game.waitingForBoss) {
    game.bossIntroTimer -= dt

    if (game.bossIntroTimer <= 80 && !game.bossSecondWarningShown) {
      game.bossSecondWarningShown = true
      createWarning("BOSS APPROACHING", GAME_WIDTH / 2, 205, 100)
    }

    if (game.bossIntroTimer <= 0) {
      spawnBoss()
      game.waitingForBoss = false
      game.bossStarted = true
      game.wave = "BOSS"
    }
  }
}

function updateCollisions() {
  for (let e = enemies.length - 1; e >= 0; e--) {
    const enemy = enemies[e]

    if (rectsCollide(getPlayerRect(), getEnemyRect(enemy))) {
      createExplosion(enemy.x, enemy.y, 36)
      enemies.splice(e, 1)
      damagePlayer(1)
      continue
    }

    for (let b = bullets.length - 1; b >= 0; b--) {
      const bullet = bullets[b]

      if (rectsCollide(getBulletRect(bullet), getEnemyRect(enemy))) {
        bullets.splice(b, 1)
        enemy.hp -= bullet.damage

        createExplosion(bullet.x, bullet.y, bullet.type === "rocket" ? 20 : 10)

        if (enemy.hp <= 0) {
          createExplosion(enemy.x, enemy.y, enemy.boss ? 70 : 34)
          game.score += enemy.scoreValue

          if (enemy.type === "boss" || enemy.finalBoss) {
            game.bossDefeated = true
            createWarning("BOSS DESTROYED", GAME_WIDTH / 2, 205, 150)
          } else if (enemy.type === "miniboss") {
            game.miniBossDefeated = true
            createWarning("MINIBOSS DESTROYED", GAME_WIDTH / 2, 205, 120)
          } else {
            game.kills++
          }

          enemies.splice(e, 1)
        }

        break
      }
    }
  }

  if (difficultyConfig.hasMiniBoss) {
    if (game.miniBossDefeated && !game.rewardGiven) {
      completeMission()
    }

    return
  }

  if (difficultyConfig.hasBoss) {
    if (game.bossDefeated && !game.rewardGiven) {
      completeMission()
    }

    return
  }

  if (game.kills >= game.targetKills && !game.rewardGiven) {
    completeMission()
  }
}

function updateExplosions(dt) {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life -= dt

    if (explosions[i].life <= 0) {
      explosions.splice(i, 1)
    }
  }
}

function updateWarnings(dt) {
  for (let i = warnings.length - 1; i >= 0; i--) {
    warnings[i].life -= dt

    if (warnings[i].life <= 0) {
      warnings.splice(i, 1)
    }
  }
}

function updateBackground(dt) {
  backgroundLayer.y1 += backgroundLayer.speed * dt
  backgroundLayer.y2 += backgroundLayer.speed * dt

  if (backgroundLayer.y1 >= GAME_HEIGHT) {
    backgroundLayer.y1 = backgroundLayer.y2 - GAME_HEIGHT
  }

  if (backgroundLayer.y2 >= GAME_HEIGHT) {
    backgroundLayer.y2 = backgroundLayer.y1 - GAME_HEIGHT
  }

  for (const cloud of clouds) {
    cloud.y += cloud.speed * dt

    if (cloud.y > GAME_HEIGHT + 120) {
      cloud.y = -180
      cloud.x = Math.random() * (GAME_WIDTH - cloud.width)
    }
  }
}

async function completeMission() {
  game.rewardGiven = true
  game.state = "win"
  apiResultMessage = "saved"

  if (!airportIdent) {
    apiResultMessage = "Could not save: missing airport ident."
    return
  }

  game.backendLiberationLoading = true

  try {
    const result = await apiRequest("/game/airports/liberate", {
      method: "POST",
      body: JSON.stringify({
        airportIdent,
      }),
    })

    game.backendLiberationDone = true
    apiResultMessage = result?.message || "Airport liberated."

    if (result?.event?.type === "miniboss_defeated") {
      apiResultMessage = result.event.subtitle || "Miniboss defeated."
    }

    if (result?.gameCompleted) {
      apiResultMessage = result?.ending?.subtitle || "Campaign completed."
    }
  } catch (error) {
    console.error(error)
    game.backendLiberationDone = false
    apiResultMessage = error.message || "Failed to save liberation."
  } finally {
    game.backendLiberationLoading = false
  }
}

function shootBullet() {
  player.shotCounter++

  if (player.weaponType === "single") {
    shootPlayerBullet(
      player.x,
      player.y - player.height / 2 + 8,
      0,
      -11,
      player.damage
    )
    return
  }

  if (player.weaponType === "dual_rocket_alt") {
    shootPlayerBullet(
      player.x - 12,
      player.y - player.height / 2 + 12,
      0,
      -11,
      player.damage
    )

    shootPlayerBullet(
      player.x + 12,
      player.y - player.height / 2 + 12,
      0,
      -11,
      player.damage
    )

    if (
      player.rocketEveryShots > 0 &&
      player.shotCounter % player.rocketEveryShots === 0
    ) {
      shootAlternatingRocket()
    }

    return
  }

  if (player.weaponType === "heavy_auto") {
    shootPlayerBullet(
      player.x - 14,
      player.y - player.height / 2 + 12,
      0,
      -10,
      player.damage
    )

    shootPlayerBullet(
      player.x + 14,
      player.y - player.height / 2 + 12,
      0,
      -10,
      player.damage
    )

    if (
      player.rocketEveryShots > 0 &&
      player.shotCounter % player.rocketEveryShots === 0
    ) {
      shootAlternatingRocket()
    }

    return
  }

  shootPlayerBullet(
    player.x,
    player.y - player.height / 2 + 8,
    0,
    -11,
    player.damage
  )
}

function shootPlayerBullet(x, y, vx, vy, damage) {
  bullets.push({
    type: "bullet",
    x,
    y,
    vx,
    vy,
    width: 6,
    height: 20,
    speed: Math.abs(vy),
    damage,
  })
}

function shootAlternatingRocket() {
  const isLeft = player.rocketSide === "left"
  const sideOffset = isLeft ? -24 : 24
  const rocketSpeed = 8

  let sidePush = 3.0

  if (player.weaponType === "heavy_auto") {
    sidePush = 4.2
  }

  bullets.push({
    type: "rocket",
    x: player.x + sideOffset,
    y: player.y - player.height / 2 + 16,
    vx: isLeft ? -sidePush : sidePush,
    vy: -rocketSpeed,
    width: 12,
    height: 28,
    speed: rocketSpeed,
    damage: player.damage * 3,
  })

  player.rocketSide = isLeft ? "right" : "left"
}

function findSideEnemyTarget() {
  let bestTarget = null
  let bestDistance = Infinity

  for (const enemy of enemies) {
    const isOnSide = Math.abs(enemy.x - player.x) > 140
    const isInFront = enemy.y < player.y

    if (!isOnSide || !isInFront) continue

    const dx = enemy.x - player.x
    const dy = enemy.y - player.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < bestDistance) {
      bestDistance = distance
      bestTarget = enemy
    }
  }

  return bestTarget
}

function chooseEnemyType() {
  const pool = difficultyConfig.enemyPool
  return pool[Math.floor(Math.random() * pool.length)]
}

function spawnEnemy() {
  const selectedType = chooseEnemyType()
  spawnSpecificEnemy(selectedType, 80 + Math.random() * (GAME_WIDTH - 160), -90)
}

function spawnSpecificEnemy(type, x, y) {
  const data = ENEMY_TYPES[type] || ENEMY_TYPES.fighter

  enemies.push({
    type: data.type,
    x,
    y,
    width: data.width,
    height: data.height,
    hp: data.hp,
    maxHp: data.hp,
    speed: data.speed,
    scoreValue: data.scoreValue,
    image: data.image,
    pattern: data.pattern,
    bulletSpeed: data.bulletSpeed,
    shootTimer: 70 + Math.floor(Math.random() * 80),
    shootDelay: data.shootDelay,
    drift: Math.random() < 0.5 ? -0.45 : 0.45,
    stealth: data.stealth || false,
    stealthAlpha: data.stealth ? 0.25 : 1,
    boss: data.boss || false,
    finalBoss: data.finalBoss || false,
  })
}

function spawnMiniBoss() {
  switchMusic(MUSIC_TRACKS.minibossFight, 0.34)

  const data = ENEMY_TYPES.miniboss

  enemies.push({
    type: data.type,
    x: GAME_WIDTH / 2,
    y: -120,
    width: data.width,
    height: data.height,
    hp: data.hp,
    maxHp: data.hp,
    speed: data.speed,
    scoreValue: data.scoreValue,
    image: data.image,
    pattern: data.pattern,
    bulletSpeed: data.bulletSpeed,
    shootTimer: 90,
    shootDelay: data.shootDelay,
    drift: 1.7,
    boss: true,
    entranceDone: false,
    rocketTimer: 130,
    summonTimer: 90,
  })
}

function spawnBoss() {
  switchMusic(MUSIC_TRACKS.bossFight, 0.36)

  const data = ENEMY_TYPES.boss

  enemies.push({
    type: data.type,
    x: GAME_WIDTH / 2,
    y: -180,
    width: data.width,
    height: data.height,
    hp: data.hp,
    maxHp: data.hp,
    speed: data.speed,
    scoreValue: data.scoreValue,
    image: data.image,
    pattern: data.pattern,
    bulletSpeed: data.bulletSpeed,
    shootTimer: 90,
    shootDelay: data.shootDelay,
    drift: 1.15,
    boss: true,
    finalBoss: true,
    entranceDone: false,
    rocketTimer: 150,
    autoCannonTimer: 95,
  })
}

function updateMiniBoss(enemy, dt) {
  if (!enemy.entranceDone) {
    enemy.y += 1.3 * dt

    if (enemy.y >= 115) {
      enemy.y = 115
      enemy.entranceDone = true
      enemy.summonTimer = 70
    }

    return
  }

  enemy.x += enemy.drift * dt

  if (
    enemy.x < enemy.width / 2 + 40 ||
    enemy.x > GAME_WIDTH - enemy.width / 2 - 40
  ) {
    enemy.drift *= -1
  }

  enemy.rocketTimer -= dt

  if (enemy.rocketTimer <= 0) {
    shootMiniBossRockets(enemy)
    enemy.rocketTimer = 130 + Math.floor(Math.random() * 60)
  }

  enemy.summonTimer -= dt

  if (enemy.summonTimer <= 0) {
    summonMiniBossAdds()
    enemy.summonTimer = 160 + Math.floor(Math.random() * 70)
  }
}

function updateBoss(enemy, dt) {
  if (!enemy.entranceDone) {
    enemy.y += 1.0 * dt

    if (enemy.y >= 120) {
      enemy.y = 120
      enemy.entranceDone = true
      createWarning("FINAL BOSS", GAME_WIDTH / 2, 205, 110)
    }

    return
  }

  enemy.x += enemy.drift * dt

  if (
    enemy.x < enemy.width / 2 + 40 ||
    enemy.x > GAME_WIDTH - enemy.width / 2 - 40
  ) {
    enemy.drift *= -1
  }

  enemy.rocketTimer -= dt

  if (enemy.rocketTimer <= 0) {
    shootBossRockets(enemy)
    enemy.rocketTimer = 130
  }

  enemy.autoCannonTimer -= dt

  if (enemy.autoCannonTimer <= 0) {
    shootBossAutoCannon(enemy)
    enemy.autoCannonTimer = 80
  }
}

function updateStealthRam(enemy, dt) {
  const dx = player.x - enemy.x
  const dy = player.y - enemy.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) {
    enemy.y += enemy.speed * dt
    return
  }

  const vx = (dx / length) * enemy.speed
  const vy = (dy / length) * enemy.speed

  enemy.x += vx * dt
  enemy.y += Math.max(vy, 1.5) * dt
}

function enemyShoot(enemy) {
  if (enemy.pattern === "single") {
    shootEnemyProjectile({
      x: enemy.x,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })
  }

  if (enemy.pattern === "dual") {
    shootEnemyProjectile({
      x: enemy.x - 10,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })

    shootEnemyProjectile({
      x: enemy.x + 10,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })
  }

  if (enemy.pattern === "shotgun") {
    const spread = [-2.4, -1.2, 0, 1.2, 2.4]

    for (const vx of spread) {
      shootEnemyProjectile({
        x: enemy.x,
        y: enemy.y + enemy.height / 2 - 6,
        vx,
        vy: enemy.bulletSpeed,
        type: "bullet",
      })
    }
  }

  if (enemy.pattern === "rocket") {
    shootEnemyProjectile({
      x: enemy.x - 12,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })

    shootEnemyProjectile({
      x: enemy.x + 12,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })

    shootEnemyProjectile({
      x: enemy.x - 22,
      y: enemy.y + enemy.height / 2,
      vx: -2.8,
      vy: 3.8,
      type: "rocket",
      width: 12,
      height: 28,
      damage: 2,
    })

    shootEnemyProjectile({
      x: enemy.x + 22,
      y: enemy.y + enemy.height / 2,
      vx: 2.8,
      vy: 3.8,
      type: "rocket",
      width: 12,
      height: 28,
      damage: 2,
    })
  }

  if (enemy.pattern === "miniboss") {
    shootEnemyProjectile({
      x: enemy.x,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 0,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })

    shootEnemyProjectile({
      x: enemy.x - 26,
      y: enemy.y + enemy.height / 2 - 6,
      vx: -1.4,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })

    shootEnemyProjectile({
      x: enemy.x + 26,
      y: enemy.y + enemy.height / 2 - 6,
      vx: 1.4,
      vy: enemy.bulletSpeed,
      type: "bullet",
    })
  }

  if (enemy.pattern === "boss") {
    const y = enemy.y + enemy.height / 2 - 12

    const shots = [
      { x: enemy.x - 82, vx: -0.7 },
      { x: enemy.x - 48, vx: -0.25 },
      { x: enemy.x + 48, vx: 0.25 },
      { x: enemy.x + 82, vx: 0.7 },
    ]

    for (const shot of shots) {
      shootEnemyProjectile({
        x: shot.x,
        y,
        vx: shot.vx,
        vy: enemy.bulletSpeed,
        type: "bullet",
        damage: 1,
      })
    }
  }
}

function shootEnemyProjectile(options) {
  enemyBullets.push({
    type: options.type || "bullet",
    x: options.x,
    y: options.y,
    vx: options.vx || 0,
    vy: options.vy || 4,
    width: options.width || 7,
    height: options.height || 18,
    damage: options.damage || 1,
  })
}

function shootMiniBossRockets(enemy) {
  shootEnemyProjectile({
    x: enemy.x - 42,
    y: enemy.y + enemy.height / 2,
    vx: -2.2,
    vy: 3.8,
    type: "rocket",
    width: 12,
    height: 28,
    damage: 2,
  })

  shootEnemyProjectile({
    x: enemy.x + 42,
    y: enemy.y + enemy.height / 2,
    vx: 2.2,
    vy: 3.8,
    type: "rocket",
    width: 12,
    height: 28,
    damage: 2,
  })
}

function summonMiniBossAdds() {
  spawnSideAdd("fighter", "left")
  spawnSideAdd("fighter", "right")

  createWarning("REINFORCEMENTS", GAME_WIDTH / 2, 205, 90)
}

function spawnSideAdd(type, side) {
  const data = ENEMY_TYPES[type] || ENEMY_TYPES.fighter

  enemies.push({
    type: data.type,
    x: side === "left" ? 45 : GAME_WIDTH - 45,
    y: 180 + Math.random() * 160,
    width: data.width,
    height: data.height,
    hp: data.hp,
    maxHp: data.hp,
    speed: 1.25,
    scoreValue: data.scoreValue,
    image: data.image,
    pattern: data.pattern,
    bulletSpeed: data.bulletSpeed,
    shootTimer: 60 + Math.floor(Math.random() * 50),
    shootDelay: data.shootDelay,
    drift: side === "left" ? 1.9 : -1.9,
    stealth: false,
    stealthAlpha: 1,
    summoned: true,
  })
}

function shootBossRockets(enemy) {
  const rocketY = enemy.y + enemy.height / 2 - 10

  const rockets = [
    { x: enemy.x - 92, vx: -3.2 },
    { x: enemy.x - 38, vx: -1.4 },
    { x: enemy.x + 38, vx: 1.4 },
    { x: enemy.x + 92, vx: 3.2 },
  ]

  for (const rocket of rockets) {
    shootEnemyProjectile({
      x: rocket.x,
      y: rocketY,
      vx: rocket.vx,
      vy: 3.8,
      type: "rocket",
      width: 13,
      height: 30,
      damage: 2,
    })
  }
}

function shootBossAutoCannon(enemy) {
  const dx = player.x - enemy.x
  const dy = player.y - enemy.y
  const length = Math.sqrt(dx * dx + dy * dy)

  if (length === 0) return

  const speed = 6.2

  shootEnemyProjectile({
    x: enemy.x,
    y: enemy.y + enemy.height / 2 - 5,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    type: "autocannon",
    width: 7,
    height: 22,
    damage: 1,
  })
}

function damagePlayer(amount = 1) {
  if (player.invincibleTimer > 0) return
  if (game.state !== "playing") return

  player.hp -= amount
  player.invincibleTimer = player.invincibleDuration

  createExplosion(player.x, player.y, 22)

  if (player.hp <= 0) {
    player.hp = 0
    game.state = "lose"
  }
}

function createWarning(text, x, y, life = 90) {
  warnings.push({
    text,
    x,
    y,
    life,
    maxLife: life,
  })
}

function createExplosion(x, y, size) {
  explosions.push({
    x,
    y,
    size,
    life: 24,
    maxLife: 24,
  })
}

function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function getPlayerRect() {
  return {
    x: player.x - 10,
    y: player.y - 14,
    width: 20,
    height: 28,
  }
}

function getEnemyRect(enemy) {
  return {
    x: enemy.x - enemy.width * 0.22,
    y: enemy.y - enemy.height * 0.22,
    width: enemy.width * 0.44,
    height: enemy.height * 0.44,
  }
}

function getBulletRect(bullet) {
  return {
    x: bullet.x - bullet.width / 2,
    y: bullet.y,
    width: bullet.width,
    height: bullet.height,
  }
}

function getEnemyBulletRect(bullet) {
  return {
    x: bullet.x - 3,
    y: bullet.y + 3,
    width: 6,
    height: bullet.height - 6,
  }
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  menuButtons.length = 0

  drawBackground()
  drawClouds()
  drawBullets()
  drawEnemies()
  drawEnemyBullets()
  drawPlayer()
  drawExplosions()
  drawWarnings()
  drawCanvasUI()
  drawBossHpBar()

  if (game.state === "loading") {
    drawOverlayBox("LOADING", "Preparing aircraft...")
  }

  if (game.paused && game.state === "playing") {
    drawPauseMenu()
  }

  if (game.state === "win") {
    drawWinScreen()
  }

  if (game.state === "lose") {
    drawLoseScreen()
  }

  if (game.state === "error") {
    drawErrorScreen()
  }
}

function drawBackground() {
  if (images.background.loaded) {
    drawCoverImage(images.background, 0, backgroundLayer.y1, GAME_WIDTH, GAME_HEIGHT)
    drawCoverImage(images.background, 0, backgroundLayer.y2, GAME_WIDTH, GAME_HEIGHT)

    ctx.fillStyle = "rgba(15, 26, 36, 0.35)"
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
  } else {
    drawFallbackMap()
  }
}

function drawCoverImage(img, x, y, w, h) {
  const imageRatio = img.width / img.height
  const canvasRatio = w / h

  let drawWidth
  let drawHeight
  let offsetX
  let offsetY

  if (imageRatio > canvasRatio) {
    drawHeight = h
    drawWidth = h * imageRatio
    offsetX = (w - drawWidth) / 2
    offsetY = 0
  } else {
    drawWidth = w
    drawHeight = w / imageRatio
    offsetX = 0
    offsetY = (h - drawHeight) / 2
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight)
}

function drawFallbackMap() {
  ctx.fillStyle = "#1b2024"
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  ctx.strokeStyle = "rgba(232, 225, 208, 0.12)"
  ctx.lineWidth = 2

  for (let i = -200; i < GAME_WIDTH + 200; i += 140) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + 220, GAME_HEIGHT)
    ctx.stroke()
  }

  for (let y = 0; y < GAME_HEIGHT; y += 110) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(GAME_WIDTH, y + 55)
    ctx.stroke()
  }
}

function drawClouds() {
  for (const cloud of clouds) {
    ctx.save()
    ctx.globalAlpha = cloud.alpha

    const img = images[cloud.image]

    if (img && img.loaded) {
      ctx.drawImage(img, cloud.x, cloud.y, cloud.width, cloud.height)
    } else {
      drawFallbackCloud(cloud)
    }

    ctx.restore()
  }
}

function drawFallbackCloud(cloud) {
  ctx.fillStyle = "rgba(232, 225, 208, 0.3)"
  ctx.beginPath()
  ctx.ellipse(cloud.x + cloud.width * 0.35, cloud.y + cloud.height * 0.5, cloud.width * 0.3, cloud.height * 0.22, 0, 0, Math.PI * 2)
  ctx.ellipse(cloud.x + cloud.width * 0.55, cloud.y + cloud.height * 0.45, cloud.width * 0.34, cloud.height * 0.26, 0, 0, Math.PI * 2)
  ctx.ellipse(cloud.x + cloud.width * 0.7, cloud.y + cloud.height * 0.55, cloud.width * 0.25, cloud.height * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawBullets() {
  for (const bullet of bullets) {
    if (bullet.type === "rocket") {
      drawRocket(bullet)
    } else if (bullet.type === "autocannon") {
      drawAutoCannonBullet(bullet)
    } else {
      drawNormalBullet(bullet)
    }
  }
}

function drawNormalBullet(bullet) {
  ctx.fillStyle = "rgba(255, 220, 120, 0.35)"
  ctx.fillRect(bullet.x - bullet.width, bullet.y - 2, bullet.width * 2, bullet.height + 4)

  ctx.fillStyle = "#f4f0e8"
  ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height)

  ctx.fillStyle = "#ffcc66"
  ctx.beginPath()
  ctx.moveTo(bullet.x, bullet.y - 6)
  ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + 2)
  ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + 2)
  ctx.closePath()
  ctx.fill()
}

function drawRocket(bullet) {
  ctx.save()

  ctx.translate(bullet.x, bullet.y)

  const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2
  ctx.rotate(angle)

  ctx.fillStyle = "rgba(255, 90, 40, 0.35)"
  ctx.fillRect(-bullet.width, 0, bullet.width * 2, bullet.height)

  ctx.fillStyle = "#7a2118"
  ctx.fillRect(-bullet.width / 2, 0, bullet.width, bullet.height)

  ctx.fillStyle = "#ffcc66"
  ctx.beginPath()
  ctx.moveTo(0, -8)
  ctx.lineTo(-bullet.width / 2, 3)
  ctx.lineTo(bullet.width / 2, 3)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = "rgba(255, 120, 30, 0.65)"
  ctx.beginPath()
  ctx.moveTo(0, bullet.height + 8)
  ctx.lineTo(-5, bullet.height)
  ctx.lineTo(5, bullet.height)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawAutoCannonBullet(bullet) {
  ctx.save()

  ctx.translate(bullet.x, bullet.y)

  const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2
  ctx.rotate(angle)

  ctx.fillStyle = "rgba(120, 200, 255, 0.35)"
  ctx.fillRect(-bullet.width, -bullet.height / 2, bullet.width * 2, bullet.height)

  ctx.fillStyle = "#4F6D7A"
  ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height)

  ctx.restore()
}

function drawEnemyBullets() {
  for (const bullet of enemyBullets) {
    if (bullet.type === "rocket") {
      drawEnemyRocket(bullet)
    } else {
      drawEnemyNormalBullet(bullet)
    }
  }
}

function drawEnemyNormalBullet(bullet) {
  ctx.fillStyle = "rgba(255, 60, 35, 0.35)"
  ctx.fillRect(bullet.x - bullet.width, bullet.y - 2, bullet.width * 2, bullet.height + 4)

  ctx.fillStyle = "#ff5a36"
  ctx.fillRect(bullet.x - bullet.width / 2, bullet.y, bullet.width, bullet.height)

  ctx.fillStyle = "#ffcc66"
  ctx.beginPath()
  ctx.moveTo(bullet.x, bullet.y + bullet.height + 6)
  ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height - 2)
  ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height - 2)
  ctx.closePath()
  ctx.fill()
}

function drawEnemyRocket(bullet) {
  ctx.save()

  ctx.translate(bullet.x, bullet.y)

  const angle = Math.atan2(bullet.vy, bullet.vx) + Math.PI / 2
  ctx.rotate(angle)

  ctx.fillStyle = "rgba(255, 60, 35, 0.35)"
  ctx.fillRect(-bullet.width, 0, bullet.width * 2, bullet.height)

  ctx.fillStyle = "#7a2118"
  ctx.fillRect(-bullet.width / 2, 0, bullet.width, bullet.height)

  ctx.fillStyle = "#ffcc66"
  ctx.beginPath()
  ctx.moveTo(0, bullet.height + 8)
  ctx.lineTo(-bullet.width / 2, bullet.height - 3)
  ctx.lineTo(bullet.width / 2, bullet.height - 3)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawEnemies() {
  for (const enemy of enemies) {
    const img = images[enemy.image]

    ctx.save()

    if (enemy.stealth) {
      ctx.globalAlpha = enemy.stealthAlpha
    }

    if (img && img.loaded) {
      ctx.translate(enemy.x, enemy.y)
      ctx.rotate(Math.PI)
      ctx.drawImage(img, -enemy.width / 2, -enemy.height / 2, enemy.width, enemy.height)
    } else {
      drawFallbackEnemy(enemy)
    }

    ctx.restore()

    if (!enemy.stealth || enemy.stealthAlpha > 0.45) {
      drawEnemyHpBar(enemy)
    }
  }
}

function drawFallbackEnemy(enemy) {
  ctx.save()
  ctx.translate(enemy.x, enemy.y)
  ctx.rotate(Math.PI)

  if (enemy.type === "heavy" || enemy.type === "rocketHeavy" || enemy.type === "boss" || enemy.type === "miniboss") {
    ctx.fillStyle = "#7a2118"
  } else if (enemy.type === "fast") {
    ctx.fillStyle = "#4F6D7A"
  } else if (enemy.type === "shotgun") {
    ctx.fillStyle = "#d6ad62"
  } else if (enemy.type === "stealthRam") {
    ctx.fillStyle = "rgba(180, 180, 200, 0.55)"
  } else {
    ctx.fillStyle = "#556B2F"
  }

  ctx.strokeStyle = "#0F1A24"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.moveTo(0, -32)
  ctx.lineTo(-16, 24)
  ctx.lineTo(0, 36)
  ctx.lineTo(16, 24)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#333"
  ctx.beginPath()
  ctx.moveTo(-14, 0)
  ctx.lineTo(-48, 18)
  ctx.lineTo(48, 18)
  ctx.lineTo(14, 0)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawEnemyHpBar(enemy) {
  const barWidth = enemy.width
  const barHeight = 5
  const x = enemy.x - barWidth / 2
  const y = enemy.y - enemy.height / 2 - 12

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
  ctx.fillRect(x, y, barWidth, barHeight)

  ctx.fillStyle = "#7a2118"
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), barHeight)
}

function drawPlayer() {
  ctx.save()

  if (player.invincibleTimer > 0) {
    ctx.globalAlpha = player.invincibleTimer % 10 < 5 ? 0.35 : 1
  }

  if (images.player.loaded) {
    ctx.drawImage(
      images.player,
      player.x - player.width / 2,
      player.y - player.height / 2,
      player.width,
      player.height
    )
  } else {
    drawFallbackPlayer()
  }

  ctx.restore()
}

function drawFallbackPlayer() {
  const x = player.x
  const y = player.y

  ctx.fillStyle = "#f4f0e8"
  ctx.strokeStyle = "#0F1A24"
  ctx.lineWidth = 3

  ctx.beginPath()
  ctx.moveTo(x, y - 32)
  ctx.lineTo(x - 14, y + 20)
  ctx.lineTo(x, y + 34)
  ctx.lineTo(x + 14, y + 20)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#9A9A8E"
  ctx.beginPath()
  ctx.moveTo(x - 12, y + 2)
  ctx.lineTo(x - 48, y + 18)
  ctx.lineTo(x - 12, y + 24)
  ctx.lineTo(x + 12, y + 24)
  ctx.lineTo(x + 48, y + 18)
  ctx.lineTo(x + 12, y + 2)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
}

function drawExplosions() {
  for (const explosion of explosions) {
    const progress = explosion.life / explosion.maxLife
    const radius = explosion.size * (1 - progress + 0.25)

    ctx.save()
    ctx.globalAlpha = progress

    ctx.fillStyle = "#ffcc66"
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = "#7a2118"
    ctx.beginPath()
    ctx.arc(explosion.x, explosion.y, radius * 0.55, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

function drawWarnings() {
  for (const warning of warnings) {
    const progress = warning.life / warning.maxLife

    ctx.save()
    ctx.globalAlpha = progress > 0.25 ? 1 : progress * 4

    const pulse = Math.sin(warning.life * 0.25) > 0 ? 1 : 0.45
    const boxWidth = 220
    const boxHeight = 44

    const safeX = Math.max(
      boxWidth / 2 + 12,
      Math.min(GAME_WIDTH - boxWidth / 2 - 12, warning.x)
    )

    ctx.fillStyle = `rgba(139, 46, 31, ${pulse})`
    ctx.fillRect(safeX - boxWidth / 2, warning.y - boxHeight / 2, boxWidth, boxHeight)

    ctx.strokeStyle = "#f4f0e8"
    ctx.lineWidth = 2
    ctx.strokeRect(safeX - boxWidth / 2, warning.y - boxHeight / 2, boxWidth, boxHeight)

    ctx.fillStyle = "#f4f0e8"
    ctx.font = "18px Arial"
    ctx.textAlign = "center"
    ctx.fillText(warning.text, safeX, warning.y + 6)

    ctx.textAlign = "left"
    ctx.restore()
  }
}

function drawCanvasUI() {
  const minutes = Math.floor(game.timeLeft / 60)
  const seconds = game.timeLeft % 60
  const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`

  ctx.fillStyle = "rgba(15, 26, 36, 0.72)"
  ctx.fillRect(20, 20, 480, 162)

  ctx.strokeStyle = "#d6ad62"
  ctx.lineWidth = 2
  ctx.strokeRect(20, 20, 480, 162)

  ctx.fillStyle = "#f4f0e8"
  ctx.font = "20px Arial"
  ctx.fillText(`Airport: ${airportIdent || "UNKNOWN"}`, 40, 52)
  ctx.fillText(`Score: ${game.score}`, 40, 82)
  ctx.fillText(`Time: ${timeText}`, 40, 112)
  ctx.fillText(`Difficulty: ${CURRENT_DIFFICULTY}`, 40, 142)

  ctx.fillText(`Kills: ${game.kills}/${game.targetKills}`, 270, 82)

  const planeName = selectedPlane?.name ?? "Loading plane"
  ctx.fillText(`Plane: ${planeName}`, 270, 112)

  drawHpBar(270, 132, 170, 18)
}

function drawHpBar(x, y, width, height) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
  ctx.fillRect(x, y, width, height)

  ctx.fillStyle = "#7a2118"
  ctx.fillRect(x, y, width * (player.hp / player.maxHp), height)

  ctx.strokeStyle = "#f4f0e8"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = "#f4f0e8"
  ctx.font = "14px Arial"
  ctx.fillText(`HP ${player.hp}/${player.maxHp}`, x + 48, y + 14)
}

function drawBossHpBar() {
  const boss = enemies.find((enemy) => enemy.boss || enemy.type === "boss" || enemy.type === "miniboss")

  if (!boss) return

  const barWidth = boss.type === "boss" ? 760 : 620
  const barHeight = boss.type === "boss" ? 26 : 22
  const x = GAME_WIDTH / 2 - barWidth / 2
  const y = 28

  ctx.fillStyle = "rgba(0, 0, 0, 0.7)"
  ctx.fillRect(x, y, barWidth, barHeight)

  ctx.fillStyle = "#7a2118"
  ctx.fillRect(x, y, barWidth * (boss.hp / boss.maxHp), barHeight)

  ctx.strokeStyle = "#f4f0e8"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, barWidth, barHeight)

  ctx.fillStyle = "#f4f0e8"
  ctx.font = boss.type === "boss" ? "17px Arial" : "16px Arial"
  ctx.textAlign = "center"

  const label = boss.type === "boss"
    ? `HEAVY STEALTH BOMBER - PHASE ${game.bossPhase}`
    : "MINIBOSS"

  ctx.fillText(label, GAME_WIDTH / 2, y + 18)
  ctx.textAlign = "left"
}

function drawPauseMenu() {
  drawOverlayBox("PAUSED", "The sortie is waiting for your command.")

  const buttonX = GAME_WIDTH / 2 - 130
  const startY = GAME_HEIGHT / 2 - 60
  const buttonW = 260
  const buttonH = 48
  const gap = 14

  drawMenuButton("Resume", buttonX, startY, buttonW, buttonH, () => {
    game.paused = false
  })

  drawMenuButton("Restart", buttonX, startY + (buttonH + gap), buttonW, buttonH, () => {
    restartGame()
  })

  drawMenuButton("Shop", buttonX, startY + (buttonH + gap) * 2, buttonW, buttonH, () => {
    window.location.href = SHOP_PAGE
  })

  drawMenuButton("Back to Map", buttonX, startY + (buttonH + gap) * 3, buttonW, buttonH, () => {
    goToMap()
  })
}

function drawLoseScreen() {
  drawOverlayBox("MISSION FAILED", "Something went wrong. Try again or return to map.")

  const buttonX = GAME_WIDTH / 2 - 140
  const startY = GAME_HEIGHT / 2 - 48
  const buttonW = 280
  const buttonH = 50
  const gap = 15

  drawMenuButton("Restart", buttonX, startY, buttonW, buttonH, () => {
    restartGame()
  })

  drawMenuButton("Back to Map", buttonX, startY + buttonH + gap, buttonW, buttonH, () => {
    goToMap()
  })
}

function drawWinScreen() {
  const isFinalBoss = CURRENT_DIFFICULTY === "boss"
  const isMiniBoss = CURRENT_DIFFICULTY === "miniboss"

  const title = isFinalBoss
    ? "FINAL TARGET DESTROYED"
    : isMiniBoss
      ? "MINIBOSS DESTROYED"
      : "MISSION COMPLETE"

  const subtitle = isFinalBoss
    ? "Berlin command aircraft is destroyed. This is it... VICTORY!"
    : isMiniBoss
      ? "Wolfsschanze has been neutralized."
      : "Objective complete."

  drawOverlayBox(title, subtitle)

  ctx.fillStyle = game.backendLiberationDone ? "#8aff8a" : "#f2d27c"
  ctx.font = "20px Arial"
  ctx.textAlign = "center"
  ctx.fillText(apiResultMessage || "Saving liberation...", GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10)
  ctx.fillText(`Final Score: ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 25)
  ctx.textAlign = "left"

  const buttonX = GAME_WIDTH / 2 - 140
  const buttonY = GAME_HEIGHT / 2 + 70
  const buttonW = 280
  const buttonH = 55

  drawMenuButton("Continue", buttonX, buttonY, buttonW, buttonH, () => {
    goToMap()
  })
}

function drawErrorScreen() {
  drawOverlayBox("ERROR", game.endMessage || "Unknown error.")

  const buttonX = GAME_WIDTH / 2 - 140
  const buttonY = GAME_HEIGHT / 2 + 55
  const buttonW = 280
  const buttonH = 55

  drawMenuButton("Back to Map", buttonX, buttonY, buttonW, buttonH, () => {
    goToMap()
  })
}

function drawOverlayBox(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.72)"
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

  ctx.fillStyle = "rgba(10, 14, 20, 0.92)"
  ctx.fillRect(GAME_WIDTH / 2 - 330, GAME_HEIGHT / 2 - 190, 660, 380)

  ctx.strokeStyle = "#d6ad62"
  ctx.lineWidth = 4
  ctx.strokeRect(GAME_WIDTH / 2 - 330, GAME_HEIGHT / 2 - 190, 660, 380)

  ctx.fillStyle = "#f4f0e8"
  ctx.textAlign = "center"

  ctx.font = "48px Arial"
  ctx.fillText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 115)

  ctx.font = "20px Arial"
  ctx.fillText(subtitle, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 76)

  ctx.textAlign = "left"
}

function drawMenuButton(text, x, y, width, height, action) {
  menuButtons.push({
    x,
    y,
    width,
    height,
    action,
  })

  ctx.fillStyle = "rgba(47, 55, 64, 0.95)"
  ctx.fillRect(x, y, width, height)

  ctx.strokeStyle = "#d6ad62"
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)

  ctx.fillStyle = "#f4f0e8"
  ctx.font = "22px Arial"
  ctx.textAlign = "center"
  ctx.fillText(text, x + width / 2, y + height / 2 + 8)
  ctx.textAlign = "left"
}

function goToMap() {
  window.location.href = MAP_PAGE
}

function gameLoop(currentTime = performance.now()) {
  const dt = Math.min((currentTime - lastFrameTime) / TARGET_FRAME_MS, 2.5)
  lastFrameTime = currentTime

  update(dt)
  draw()

  requestAnimationFrame(gameLoop)
}