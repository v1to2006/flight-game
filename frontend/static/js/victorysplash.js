const pageMusic = document.getElementById("pageMusic");

let splashMusicStarted = false;

function startSplashMusic() {
  if (!pageMusic || splashMusicStarted) return;

  pageMusic.volume = 0.32;

  pageMusic
    .play()
    .then(() => {
      splashMusicStarted = true;
      console.log("Splash music started.");
    })
    .catch((error) => {
      console.log("Splash music waits for user interaction:", error);
    });
}

window.addEventListener("click", startSplashMusic);
window.addEventListener("keydown", startSplashMusic);
window.addEventListener("pointerdown", startSplashMusic);