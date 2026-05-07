const music = document.getElementById("bgMusic");
const audioHint = document.getElementById("audioHint");

applySavedMusicVolume(music);

/* Sound starts after first click */
document.addEventListener("click", () => {
  music.play()
    .then(() => {
      audioHint.classList.add("hidden");
    })
    .catch(() => {
      console.log("Music not added yet or could not start.");
    });
}, { once: true });

/* Play button */
function playGame() {
  if (typeof showLoadingScreen === "function") {
    showLoadingScreen("login.html", {
      title: "Opening Briefing",
      duration: 2200
    });
  } else {
    document.body.classList.add("fade-out");

    setTimeout(() => {
      window.location.href = "login.html";
    }, 800);
  }
}

/* Particles */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

let width = canvas.width = window.innerWidth;
let height = canvas.height = window.innerHeight;

const particles = [];

for (let i = 0; i < 55; i++) {
  particles.push({
    x: Math.random() * width,
    y: Math.random() * height,
    size: 1 + Math.random() * 2,
    speed: 0.08 + Math.random() * 0.28,
    opacity: 0.15 + Math.random() * 0.35
  });
}

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);

function drawParticles() {
  ctx.clearRect(0, 0, width, height);

  particles.forEach((p) => {
    p.y -= p.speed;

    if (p.y < -10) {
      p.y = height + 10;
      p.x = Math.random() * width;
    }

    ctx.fillStyle = `rgba(255, 220, 150, ${p.opacity})`;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });

  requestAnimationFrame(drawParticles);
}

drawParticles();