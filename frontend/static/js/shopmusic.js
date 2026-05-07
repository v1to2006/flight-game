let shopMusicStarted = false;

const shopMusic = new Audio("static/assets/audio/shop.wav");
shopMusic.loop = true;

if (typeof applySavedMusicVolume === "function") {
  applySavedMusicVolume(shopMusic);
} else {
  shopMusic.volume = 0.22;
}

function startShopMusic() {
  if (shopMusicStarted) return;

  shopMusic.play()
    .then(() => {
      shopMusicStarted = true;
      console.log("Shop music started.");
    })
    .catch((error) => {
      console.log("Shop music waits for user interaction or file is missing.", error);
    });
}

window.addEventListener("click", startShopMusic);
window.addEventListener("keydown", startShopMusic);