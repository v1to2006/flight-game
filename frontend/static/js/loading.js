const loadingQuotes = [
  "I did not have time to write a short loading quote, so I wrote a long one instead.",
  "Pilots do not wait for fear to pass. They fly through it.",
  "I did not have a name anymore; just a number",
  "The sky is not a place for the faint of heart.",
  "Victory is written one flight at a time.",
  "The runway ends where duty begins.",
  "I hate war as only a soldier who has lived it can, only as one who has seen its brutality, its futility, its stupidity.",
  "We are the forgotten ones. We fly into the sun and never come back, and the world counts the planes that didn't return",
  "Theo, I have run out of ammunition. I am going to have to ram this one. Goodbye. We'll see each other in Valhalla.",
  "War is not and adventure. It is a disease. It is like typhus.",
];

function createLoadingScreen() {
  if (document.getElementById("loadingScreen")) return;

  const loading = document.createElement("div");
  loading.id = "loadingScreen";

  loading.innerHTML = `
    <div class="loading-box">
      <p class="loading-small">MISSION TRANSITION</p>
      <h2 class="loading-title" id="loadingTitle">Preparing Mission</h2>

      <div class="loading-propeller"></div>

      <p class="loading-quote" id="loadingQuote"></p>

      <div class="loading-bar">
        <div class="loading-fill" id="loadingFill"></div>
      </div>
    </div>
  `;

  document.body.appendChild(loading);
}

function getRandomLoadingQuote() {
  const index = Math.floor(Math.random() * loadingQuotes.length);
  return loadingQuotes[index];
}

function showLoadingScreen(targetPage, options = {}) {
  createLoadingScreen();

  const loading = document.getElementById("loadingScreen");
  const title = document.getElementById("loadingTitle");
  const quote = document.getElementById("loadingQuote");
  const fill = document.getElementById("loadingFill");

  const duration = options.duration || 2200;
  const loadingTitle = options.title || "Preparing Mission";

  title.textContent = loadingTitle;
  quote.textContent = getRandomLoadingQuote();

  fill.style.transition = "none";
  fill.style.width = "0%";

  loading.classList.add("active");

  setTimeout(() => {
    fill.style.transition = `width ${duration}ms linear`;
    fill.style.width = "100%";
  }, 50);

  setTimeout(() => {
    window.location.href = targetPage;
  }, duration + 200);
}