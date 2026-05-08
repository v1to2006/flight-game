const pageMusic = document.getElementById("pageMusic");
const typingElements = document.querySelectorAll(".typing-text");

let splashMusicStarted = false;

function startSplashMusic() {
  if (!pageMusic || splashMusicStarted) return;

  pageMusic.volume = 0.34;

  pageMusic
    .play()
    .then(() => {
      splashMusicStarted = true;
      console.log("Victory splash music started.");
    })
    .catch((error) => {
      console.log("Victory splash music waits for user interaction:", error);
    });
}

function typeText(element, text, speed = 22, startDelay = 0) {
  if (!element) return;

  element.textContent = "";

  setTimeout(() => {
    let index = 0;

    const interval = setInterval(() => {
      if (index >= text.length) {
        clearInterval(interval);
        return;
      }

      element.textContent += text[index];
      index++;
    }, speed);
  }, startDelay);
}

typingElements.forEach((element, index) => {
  const text = element.dataset.text || element.textContent.trim();
  typeText(element, text, 22, 450 + index * 120);
});

window.addEventListener("click", startSplashMusic);
window.addEventListener("keydown", startSplashMusic);
window.addEventListener("pointerdown", startSplashMusic);