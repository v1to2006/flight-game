function getSavedMusicVolume(defaultVolume = 22) {
  const savedVolume = localStorage.getItem("musicVolume");

  if (savedVolume === null) {
    return defaultVolume;
  }

  return Number(savedVolume);
}

function applySavedMusicVolume(audioElement, defaultVolume = 22) {
  if (!audioElement) return;

  const volume = getSavedMusicVolume(defaultVolume);
  audioElement.volume = volume / 100;
}

function getSavedLanguage(defaultLanguage = "en") {
  return localStorage.getItem("gameLanguage") || defaultLanguage;
}