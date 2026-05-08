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
      console.log("Story splash music started.");
    })
    .catch((error) => {
      console.log("Story splash music waits for user interaction:", error);
    });
}

function typeText(element, text, speed = 24, startDelay = 0) {
  if (!element) return;

  element.textContent = "";

  setTimeout(() => {
    let index = 0;

    const interval = setInterval(() => {
      element.textContent += text[index];
      index++;

      if (index >= text.length) {
        clearInterval(interval);
      }
    }, speed);
  }, startDelay);
}

typingElements.forEach((element, index) => {
  const text = element.dataset.text || element.textContent.trim();
  typeText(element, text, 22, 550 + index * 150);
});

window.addEventListener("click", startSplashMusic);
window.addEventListener("keydown", startSplashMusic);
window.addEventListener("pointerdown", startSplashMusic);