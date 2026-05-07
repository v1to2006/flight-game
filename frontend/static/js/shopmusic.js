let shopMusicStarted = false;

const shopMusic = new Audio("../static/assets/audio/shop.wav");
shopMusic.loop = true;
shopMusic.volume = 0.22;

function startShopMusic() {
  if (shopMusicStarted) return;

  shopMusic
    .play()
    .then(() => {
      shopMusicStarted = true;
    })
    .catch(() => {
      console.log("Shop music waits for user interaction.");
    });
}

window.addEventListener("click", () => {
  startShopMusic();
});

window.addEventListener("keydown", () => {
  startShopMusic();
});