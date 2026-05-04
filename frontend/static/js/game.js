const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Canvas käyttää sisäisesti 1280x720 peliresoluutiota
canvas.width = 1280;
canvas.height = 720;

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

const game = {
  score: 0,
  wave: 1,
  kills: 0,
  targetKills: 25,
  timeLimit: 300, // 5 minuuttia sekunteina
  timeLeft: 300,
  startTime: performance.now(),
  state: "playing", // playing, win, lose
  enemySpawnTimer: 0,
  enemySpawnDelay: 70
};

const player = {
  x: GAME_WIDTH / 2,
  y: GAME_HEIGHT - 100,
  width: 64,
  height: 64,
  speed: 6,
  hp: 5,
  maxHp: 5,
  planeType: "fighter",
  shootCooldown: 0,
  shootDelay: 14,

  // Osuman jälkeen hetki suojaa, ettei HP tipu heti monta kertaa
  invincibleTimer: 0,
  invincibleDuration: 70
};

const bullets = [];
const enemyBullets = [];
const enemies = [];
const explosions = [];
const keys = {};

let musicStarted = false;

const ambientMusic = new Audio("../static/assets/audio/Wars.wav");
ambientMusic.loop = true;
ambientMusic.volume = 0.28;

window.addEventListener("keydown", (event) => {
  startMusic();

  const key = event.key.toLowerCase();

  if (
    key === " " ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright"
  ) {
    event.preventDefault();
  }

  keys[key] = true;

  if (game.state !== "playing" && key === "r") {
    restartGame();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.key.toLowerCase()] = false;
});

window.addEventListener("click", () => {
  startMusic();
});

const images = {
  background: loadImage("../static/assets/backgrounds/ww2_map.png"),
  player: loadImage("../static/assets/planes/player_fighter1.png"),
  enemy: loadImage("../static/assets/planes/enemy_fighter.png"),
  enemyHeavy: loadImage("../static/assets/planes/enemy_heavy.png"),
  cloud1: loadImage("../static/assets/clouds/cloud1.png"),
  cloud2: loadImage("../static/assets/clouds/cloud2.png")
};

const backgroundLayer = {
  y1: 0,
  y2: -GAME_HEIGHT,
  speed: 0.45
};

const clouds = [
  {
    x: 120,
    y: 80,
    width: 260,
    height: 130,
    speed: 0.35,
    image: "cloud1",
    alpha: 0.24
  },
  {
    x: 780,
    y: 260,
    width: 320,
    height: 150,
    speed: 0.22,
    image: "cloud2",
    alpha: 0.2
  },
  {
    x: 430,
    y: -160,
    width: 360,
    height: 170,
    speed: 0.42,
    image: "cloud1",
    alpha: 0.18
  },
  {
    x: 50,
    y: 520,
    width: 300,
    height: 140,
    speed: 0.28,
    image: "cloud2",
    alpha: 0.16
  }
];

function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.loaded = false;

  img.onload = () => {
    img.loaded = true;
  };

  img.onerror = () => {
    console.warn("Image not found:", src);
  };

  return img;
}

function startMusic() {
  if (musicStarted) return;

  ambientMusic
    .play()
    .then(() => {
      musicStarted = true;
    })
    .catch(() => {
      console.log("Music waits for user interaction.");
    });
}

function restartGame() {
  game.score = 0;
  game.wave = 1;
  game.kills = 0;
  game.timeLeft = game.timeLimit;
  game.startTime = performance.now();
  game.state = "playing";
  game.enemySpawnTimer = 0;
  game.enemySpawnDelay = 70;

  player.x = GAME_WIDTH / 2;
  player.y = GAME_HEIGHT - 100;
  player.hp = player.maxHp;
  player.shootCooldown = 0;
  player.invincibleTimer = 0;

  bullets.length = 0;
  enemyBullets.length = 0;
  enemies.length = 0;
  explosions.length = 0;
}

function damagePlayer(amount = 1) {
  if (player.invincibleTimer > 0) return;
  if (game.state !== "playing") return;

  player.hp -= amount;
  player.invincibleTimer = player.invincibleDuration;

  createExplosion(player.x, player.y, 22);

  if (player.hp <= 0) {
    player.hp = 0;
    game.state = "lose";
  }
}

function updatePlayer() {
  if (keys["arrowleft"] || keys["a"]) {
    player.x -= player.speed;
  }

  if (keys["arrowright"] || keys["d"]) {
    player.x += player.speed;
  }

  if (keys["arrowup"] || keys["w"]) {
    player.y -= player.speed;
  }

  if (keys["arrowdown"] || keys["s"]) {
    player.y += player.speed;
  }

  const halfWidth = player.width / 2;
  const halfHeight = player.height / 2;

  if (player.x < halfWidth) {
    player.x = halfWidth;
  }

  if (player.x > GAME_WIDTH - halfWidth) {
    player.x = GAME_WIDTH - halfWidth;
  }

  if (player.y < halfHeight) {
    player.y = halfHeight;
  }

  if (player.y > GAME_HEIGHT - halfHeight) {
    player.y = GAME_HEIGHT - halfHeight;
  }

  if (player.invincibleTimer > 0) {
    player.invincibleTimer--;
  }
}

function updateShooting() {
  if (player.shootCooldown > 0) {
    player.shootCooldown--;
  }

  if ((keys[" "] || keys["space"]) && player.shootCooldown <= 0) {
    shootBullet();
    player.shootCooldown = player.shootDelay;
  }
}

function shootBullet() {
  bullets.push({
    x: player.x,
    y: player.y - player.height / 2 + 8,
    width: 6,
    height: 20,
    speed: 11,
    damage: 1
  });
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    bullets[i].y -= bullets[i].speed;

    if (bullets[i].y + bullets[i].height < 0) {
      bullets.splice(i, 1);
    }
  }
}

function shootEnemyBullet(enemy) {
  enemyBullets.push({
    x: enemy.x,
    y: enemy.y + enemy.height / 2 - 6,
    width: 7,
    height: 18,
    speed: enemy.bulletSpeed,
    damage: 1
  });
}

function updateEnemyBullets() {
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const bullet = enemyBullets[i];

    bullet.y += bullet.speed;

    if (bullet.y > GAME_HEIGHT + bullet.height) {
      enemyBullets.splice(i, 1);
      continue;
    }

    if (rectsCollide(getEnemyBulletRect(bullet), getPlayerRect())) {
      enemyBullets.splice(i, 1);
      createExplosion(bullet.x, bullet.y, 16);
      damagePlayer(1);
    }
  }
}

function spawnEnemy() {
  const roll = Math.random();

  let type = "fighter";
  let width = 64;
  let height = 64;
  let hp = 2;
  let speed = 2.4;
  let scoreValue = 100;
  let image = "enemy";

  if (roll > 0.75) {
    type = "heavy";
    width = 78;
    height = 78;
    hp = 4;
    speed = 1.7;
    scoreValue = 220;
    image = "enemyHeavy";
  }

  enemies.push({
    type,
    x: 80 + Math.random() * (GAME_WIDTH - 160),
    y: -80,
    width,
    height,
    hp,
    maxHp: hp,
    speed,
    scoreValue,
    image,
    drift: Math.random() < 0.5 ? -0.45 : 0.45,

    shootTimer: 40 + Math.floor(Math.random() * 80),
    shootDelay: type === "heavy" ? 95 : 125,
    bulletSpeed: type === "heavy" ? 4.2 : 4.8
  });
}

function updateEnemies() {
  game.enemySpawnTimer++;

  if (game.enemySpawnTimer >= game.enemySpawnDelay) {
    spawnEnemy();
    game.enemySpawnTimer = 0;
  }

  // Pienennetään spawn delaytä pelin edetessä
  if (game.kills >= 8) {
    game.wave = 2;
    game.enemySpawnDelay = 55;
  }

  if (game.kills >= 16) {
    game.wave = 3;
    game.enemySpawnDelay = 42;
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];

    enemy.y += enemy.speed;
    enemy.x += enemy.drift;

    enemy.shootTimer--;

    if (enemy.shootTimer <= 0 && enemy.y > 20 && enemy.y < GAME_HEIGHT - 140) {
      shootEnemyBullet(enemy);
      enemy.shootTimer = enemy.shootDelay + Math.floor(Math.random() * 60);
    }

    if (enemy.x < enemy.width / 2 || enemy.x > GAME_WIDTH - enemy.width / 2) {
      enemy.drift *= -1;
    }

    // TÄRKEÄ KORJAUS:
    // Vihollinen joka menee ruudun alareunasta pois EI enää vie HP:tä.
    // Muuten pelaajasta tuntuu, että damage tulee tyhjästä.
    if (enemy.y > GAME_HEIGHT + enemy.height) {
      enemies.splice(i, 1);
    }
  }
}

function updateCollisions() {
  for (let e = enemies.length - 1; e >= 0; e--) {
    const enemy = enemies[e];

    // Pelaaja törmää viholliseen
    if (rectsCollide(getPlayerRect(), getEnemyRect(enemy))) {
      createExplosion(enemy.x, enemy.y, 36);
      enemies.splice(e, 1);
      damagePlayer(1);
      continue;
    }

    for (let b = bullets.length - 1; b >= 0; b--) {
      const bullet = bullets[b];

      if (rectsCollide(getBulletRect(bullet), getEnemyRect(enemy))) {
        bullets.splice(b, 1);
        enemy.hp -= bullet.damage;

        createExplosion(bullet.x, bullet.y, 10);

        if (enemy.hp <= 0) {
          createExplosion(enemy.x, enemy.y, 34);
          game.score += enemy.scoreValue;
          game.kills++;
          enemies.splice(e, 1);
        }

        break;
      }
    }
  }

  if (game.kills >= game.targetKills) {
    game.state = "win";
  }
}

function rectsCollide(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// Pelaajan osuma-alue on pieni keskiosa.
// Tämä tekee pelistä reilumman, eikä siipien reunat ota osumaa.
function getPlayerRect() {
  return {
    x: player.x - 10,
    y: player.y - 14,
    width: 20,
    height: 28
  };
}

// Vihollisen osuma-alue on myös pienempi kuin koko sprite.
function getEnemyRect(enemy) {
  return {
    x: enemy.x - enemy.width * 0.22,
    y: enemy.y - enemy.height * 0.22,
    width: enemy.width * 0.44,
    height: enemy.height * 0.44
  };
}

function getBulletRect(bullet) {
  return {
    x: bullet.x - bullet.width / 2,
    y: bullet.y,
    width: bullet.width,
    height: bullet.height
  };
}

// Vihollisluodin osuma-alue on hieman pienempi kuin näkyvä luoti.
function getEnemyBulletRect(bullet) {
  return {
    x: bullet.x - 3,
    y: bullet.y + 3,
    width: 6,
    height: bullet.height - 6
  };
}

function createExplosion(x, y, size) {
  explosions.push({
    x,
    y,
    size,
    life: 24,
    maxLife: 24
  });
}

function updateExplosions() {
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].life--;

    if (explosions[i].life <= 0) {
      explosions.splice(i, 1);
    }
  }
}

function updateBackground() {
  backgroundLayer.y1 += backgroundLayer.speed;
  backgroundLayer.y2 += backgroundLayer.speed;

  if (backgroundLayer.y1 >= GAME_HEIGHT) {
    backgroundLayer.y1 = backgroundLayer.y2 - GAME_HEIGHT;
  }

  if (backgroundLayer.y2 >= GAME_HEIGHT) {
    backgroundLayer.y2 = backgroundLayer.y1 - GAME_HEIGHT;
  }

  for (const cloud of clouds) {
    cloud.y += cloud.speed;

    if (cloud.y > GAME_HEIGHT + 120) {
      cloud.y = -180;
      cloud.x = Math.random() * (GAME_WIDTH - cloud.width);
    }
  }
}

function updateTimer() {
  const now = performance.now();
  const elapsed = Math.floor((now - game.startTime) / 1000);
  game.timeLeft = Math.max(0, game.timeLimit - elapsed);

  if (game.timeLeft <= 0 && game.state === "playing") {
    game.state = "lose";
  }
}

function update() {
  if (game.state !== "playing") {
    updateExplosions();
    updateBackground();
    return;
  }

  updateTimer();
  updatePlayer();
  updateShooting();
  updateBullets();
  updateEnemyBullets();
  updateEnemies();
  updateCollisions();
  updateExplosions();
  updateBackground();
}

function draw() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground();
  drawClouds();
  drawBullets();
  drawEnemies();
  drawEnemyBullets();
  drawPlayer();
  drawExplosions();
  drawCanvasUI();

  if (game.state === "win") {
    drawEndScreen("MISSION COMPLETE", "Paina R aloittaaksesi uudelleen");
  }

  if (game.state === "lose") {
    drawEndScreen("MISSION FAILED", "Paina R yrittääksesi uudelleen");
  }
}

function drawBackground() {
  if (images.background.loaded) {
    drawCoverImage(images.background, 0, backgroundLayer.y1, GAME_WIDTH, GAME_HEIGHT);
    drawCoverImage(images.background, 0, backgroundLayer.y2, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "rgba(15, 26, 36, 0.35)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    drawFallbackMap();
  }
}

function drawCoverImage(img, x, y, w, h) {
  const imageRatio = img.width / img.height;
  const canvasRatio = w / h;

  let drawWidth;
  let drawHeight;
  let offsetX;
  let offsetY;

  if (imageRatio > canvasRatio) {
    drawHeight = h;
    drawWidth = h * imageRatio;
    offsetX = (w - drawWidth) / 2;
    offsetY = 0;
  } else {
    drawWidth = w;
    drawHeight = w / imageRatio;
    offsetX = 0;
    offsetY = (h - drawHeight) / 2;
  }

  ctx.drawImage(img, x + offsetX, y + offsetY, drawWidth, drawHeight);
}

function drawFallbackMap() {
  ctx.fillStyle = "#1b2024";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "rgba(232, 225, 208, 0.12)";
  ctx.lineWidth = 2;

  for (let i = -200; i < GAME_WIDTH + 200; i += 140) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 220, GAME_HEIGHT);
    ctx.stroke();
  }

  for (let y = 0; y < GAME_HEIGHT; y += 110) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y + 55);
    ctx.stroke();
  }
}

function drawClouds() {
  for (const cloud of clouds) {
    ctx.save();
    ctx.globalAlpha = cloud.alpha;

    const img = images[cloud.image];

    if (img && img.loaded) {
      ctx.drawImage(img, cloud.x, cloud.y, cloud.width, cloud.height);
    } else {
      drawFallbackCloud(cloud);
    }

    ctx.restore();
  }
}

function drawFallbackCloud(cloud) {
  ctx.fillStyle = "rgba(232, 225, 208, 0.3)";
  ctx.beginPath();
  ctx.ellipse(
    cloud.x + cloud.width * 0.35,
    cloud.y + cloud.height * 0.5,
    cloud.width * 0.3,
    cloud.height * 0.22,
    0,
    0,
    Math.PI * 2
  );
  ctx.ellipse(
    cloud.x + cloud.width * 0.55,
    cloud.y + cloud.height * 0.45,
    cloud.width * 0.34,
    cloud.height * 0.26,
    0,
    0,
    Math.PI * 2
  );
  ctx.ellipse(
    cloud.x + cloud.width * 0.7,
    cloud.y + cloud.height * 0.55,
    cloud.width * 0.25,
    cloud.height * 0.18,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawBullets() {
  for (const bullet of bullets) {
    ctx.fillStyle = "rgba(255, 220, 120, 0.35)";
    ctx.fillRect(
      bullet.x - bullet.width,
      bullet.y - 2,
      bullet.width * 2,
      bullet.height + 4
    );

    ctx.fillStyle = "#E8E1D0";
    ctx.fillRect(
      bullet.x - bullet.width / 2,
      bullet.y,
      bullet.width,
      bullet.height
    );

    ctx.fillStyle = "#ffcc66";
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y - 6);
    ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + 2);
    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnemyBullets() {
  for (const bullet of enemyBullets) {
    ctx.fillStyle = "rgba(255, 60, 35, 0.35)";
    ctx.fillRect(
      bullet.x - bullet.width,
      bullet.y - 2,
      bullet.width * 2,
      bullet.height + 4
    );

    ctx.fillStyle = "#ff5a36";
    ctx.fillRect(
      bullet.x - bullet.width / 2,
      bullet.y,
      bullet.width,
      bullet.height
    );

    ctx.fillStyle = "#ffcc66";
    ctx.beginPath();
    ctx.moveTo(bullet.x, bullet.y + bullet.height + 6);
    ctx.lineTo(bullet.x - bullet.width / 2, bullet.y + bullet.height - 2);
    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height - 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    const img = images[enemy.image];

    if (img && img.loaded) {
      ctx.save();

      // Viholliset ovat alaspäin, sprite käännetään 180 astetta
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.PI);
      ctx.drawImage(
        img,
        -enemy.width / 2,
        -enemy.height / 2,
        enemy.width,
        enemy.height
      );

      ctx.restore();
    } else {
      drawFallbackEnemy(enemy);
    }

    drawEnemyHpBar(enemy);
  }
}

function drawFallbackEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(Math.PI);

  ctx.fillStyle = enemy.type === "heavy" ? "#8B2E1F" : "#556B2F";
  ctx.strokeStyle = "#0F1A24";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, -32);
  ctx.lineTo(-16, 24);
  ctx.lineTo(0, 36);
  ctx.lineTo(16, 24);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#333";
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-48, 18);
  ctx.lineTo(48, 18);
  ctx.lineTo(14, 0);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawEnemyHpBar(enemy) {
  const barWidth = enemy.width;
  const barHeight = 5;
  const x = enemy.x - barWidth / 2;
  const y = enemy.y - enemy.height / 2 - 12;

  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x, y, barWidth, barHeight);

  ctx.fillStyle = "#8B2E1F";
  ctx.fillRect(x, y, barWidth * (enemy.hp / enemy.maxHp), barHeight);
}

function drawPlayer() {
  ctx.save();

  // Osuman jälkeen pelaaja vilkkuu
  if (player.invincibleTimer > 0) {
    ctx.globalAlpha = player.invincibleTimer % 10 < 5 ? 0.35 : 1;
  }

  if (images.player.loaded) {
    ctx.drawImage(
      images.player,
      player.x - player.width / 2,
      player.y - player.height / 2,
      player.width,
      player.height
    );
  } else {
    drawFallbackPlayer();
  }

  ctx.restore();
}

function drawFallbackPlayer() {
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 36, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#E8E1D0";
  ctx.strokeStyle = "#0F1A24";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x, y - 32);
  ctx.lineTo(x - 14, y + 20);
  ctx.lineTo(x, y + 34);
  ctx.lineTo(x + 14, y + 20);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#9A9A8E";
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 2);
  ctx.lineTo(x - 48, y + 18);
  ctx.lineTo(x - 12, y + 24);
  ctx.lineTo(x + 12, y + 24);
  ctx.lineTo(x + 48, y + 18);
  ctx.lineTo(x + 12, y + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#4F6D7A";
  ctx.beginPath();
  ctx.ellipse(x, y - 2, 7, 12, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawExplosions() {
  for (const explosion of explosions) {
    const progress = explosion.life / explosion.maxLife;
    const radius = explosion.size * (1 - progress + 0.25);

    ctx.save();
    ctx.globalAlpha = progress;

    ctx.fillStyle = "#ffcc66";
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8B2E1F";
    ctx.beginPath();
    ctx.arc(explosion.x, explosion.y, radius * 0.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawCanvasUI() {
  const minutes = Math.floor(game.timeLeft / 60);
  const seconds = game.timeLeft % 60;
  const timeText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  ctx.fillStyle = "rgba(15, 26, 36, 0.72)";
  ctx.fillRect(20, 20, 360, 118);

  ctx.strokeStyle = "#C2B280";
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 360, 118);

  ctx.fillStyle = "#E8E1D0";
  ctx.font = "22px Arial";
  ctx.fillText(`Score: ${game.score}`, 40, 55);
  ctx.fillText(`Time: ${timeText}`, 40, 85);
  ctx.fillText(`Wave: ${game.wave}`, 40, 115);

  ctx.fillText(`Kills: ${game.kills}/${game.targetKills}`, 200, 55);

  drawHpBar(200, 82, 140, 18);
}

function drawHpBar(x, y, width, height) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.fillRect(x, y, width, height);

  ctx.fillStyle = "#8B2E1F";
  ctx.fillRect(x, y, width * (player.hp / player.maxHp), height);

  ctx.strokeStyle = "#E8E1D0";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  ctx.fillStyle = "#E8E1D0";
  ctx.font = "14px Arial";
  ctx.fillText(`HP ${player.hp}/${player.maxHp}`, x + 36, y + 14);
}

function drawEndScreen(title, subtitle) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.68)";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "#C2B280";
  ctx.lineWidth = 4;
  ctx.strokeRect(GAME_WIDTH / 2 - 280, GAME_HEIGHT / 2 - 115, 560, 230);

  ctx.fillStyle = "#E8E1D0";
  ctx.font = "46px Arial";
  ctx.textAlign = "center";
  ctx.fillText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30);

  ctx.font = "22px Arial";
  ctx.fillText(`Final Score: ${game.score}`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
  ctx.fillText(subtitle, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60);

  ctx.textAlign = "left";
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();