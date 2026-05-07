const music = document.getElementById("bgMusic");
const audioHint = document.getElementById("audioHint");
const video = document.getElementById("bgVideo");

applySavedMusicVolume(music);

/* Audio starts after first click */
document.addEventListener("click", () => {
  music.play()
    .then(() => {
      audioHint.classList.add("hidden");
    })
    .catch(() => {
      console.log("Music missing or blocked.");
    });
}, { once: true });

/* Return button */
function returnToMenu() {
  if (typeof showLoadingScreen === "function") {
    showLoadingScreen("mainMenu.html", {
      title: "Returning to Base",
      duration: 1800
    });
  } else {
    document.body.classList.add("fade-out");

    setTimeout(() => {
      window.location.href = "mainMenu.html";
    }, 500);
  }
}

/* Small parallax movement */
document.addEventListener("mousemove", (event) => {
  const x = (event.clientX / window.innerWidth - 0.5) * 8;
  const y = (event.clientY / window.innerHeight - 0.5) * 8;

  video.style.transform = `scale(1.1) translate(${x}px, ${y}px)`;
});

/* Canvas particles and plane silhouettes */
const canvas = document.getElementById("creditsCanvas");
const ctx = canvas.getContext("2d");

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const particles = [];
const planes = [];

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

function createParticles() {
  particles.length = 0;

  for (let i = 0; i < 65; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 1 + Math.random() * 2,
      speed: 0.08 + Math.random() * 0.28,
      opacity: 0.12 + Math.random() * 0.28
    });
  }
}

function createPlanes() {
  planes.length = 0;

  for (let i = 0; i < 3; i++) {
    planes.push({
      x: Math.random() * width,
      y: 90 + Math.random() * (height * 0.45),
      speed: 0.25 + Math.random() * 0.55,
      scale: 0.5 + Math.random() * 0.65,
      opacity: 0.15 + Math.random() * 0.18
    });
  }
}

function drawParticle(p) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = "#f3d58a";
  ctx.fillRect(p.x, p.y, p.size, p.size);
  ctx.restore();
}

function drawPlane(plane) {
  ctx.save();

  ctx.translate(plane.x, plane.y);
  ctx.scale(plane.scale, plane.scale);

  ctx.globalAlpha = plane.opacity;
  ctx.fillStyle = "black";

  ctx.beginPath();
  ctx.moveTo(40, 0);
  ctx.lineTo(-32, -8);
  ctx.lineTo(-44, 0);
  ctx.lineTo(-32, 8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-22, -32);
  ctx.lineTo(-6, -32);
  ctx.lineTo(16, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(2, 0);
  ctx.lineTo(-22, 32);
  ctx.lineTo(-6, 32);
  ctx.lineTo(16, 0);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.lineTo(-46, -17);
  ctx.lineTo(-36, 0);
  ctx.lineTo(-46, 17);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function animateCanvas() {
  ctx.clearRect(0, 0, width, height);

  particles.forEach((p) => {
    p.y -= p.speed;

    if (p.y < -10) {
      p.y = height + 10;
      p.x = Math.random() * width;
    }

    drawParticle(p);
  });

  planes.forEach((plane) => {
    plane.x += plane.speed;

    if (plane.x > width + 130) {
      plane.x = -150;
      plane.y = 90 + Math.random() * (height * 0.45);
      plane.scale = 0.5 + Math.random() * 0.65;
      plane.opacity = 0.15 + Math.random() * 0.18;
    }

    drawPlane(plane);
  });

  requestAnimationFrame(animateCanvas);
}

createParticles();
createPlanes();
animateCanvas();