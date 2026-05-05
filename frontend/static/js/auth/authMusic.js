const music = document.getElementById("bgMusic");
const audioHint = document.getElementById("audioHint");

if (music && audioHint) {
  music.volume = 0.18;

  document.addEventListener("click", () => {
    music.play()
      .then(() => {
        audioHint.classList.add("hidden");
      })
      .catch(() => {
        console.log("Music could not start or file is missing.");
      });
  }, { once: true });
}