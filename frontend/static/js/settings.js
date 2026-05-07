const music = document.getElementById("bgMusic");
const audioHint = document.getElementById("audioHint");
const volumeSlider = document.getElementById("musicVolume");
const volumeValue = document.getElementById("volumeValue");
const languageSelect = document.getElementById("languageSelect");

const translations = {
  en: {
    smallTitle: "SYSTEM CONFIGURATION",
    title: "SETTINGS",
    subtitle: "Adjust your cockpit preferences before takeoff.",
    musicVolume: "Music Volume",
    musicText: "Control the background music volume.",
    language: "Language",
    languageText: "Choose the interface language.",
    tutorialTitle: "Controls",
    moveText: "Move aircraft",
    shootText: "Shoot"
  },

  fi: {
    smallTitle: "JÄRJESTELMÄASETUKSET",
    title: "ASETUKSET",
    subtitle: "Säädä ohjaamon asetukset ennen lentoonlähtöä.",
    musicVolume: "Musiikin äänenvoimakkuus",
    musicText: "Säädä taustamusiikin äänenvoimakkuutta.",
    language: "Kieli",
    languageText: "Valitse käyttöliittymän kieli.",
    tutorialTitle: "Ohjaimet",
    moveText: "Liikuta lentokonetta",
    shootText: "Ammu"
  },

  ru: {
    smallTitle: "СИСТЕМНЫЕ НАСТРОЙКИ",
    title: "НАСТРОЙКИ",
    subtitle: "Настройте параметры кабины перед взлётом.",
    musicVolume: "Громкость музыки",
    musicText: "Настройте громкость фоновой музыки.",
    language: "Язык",
    languageText: "Выберите язык интерфейса.",
    tutorialTitle: "Управление",
    moveText: "Движение самолёта",
    shootText: "Стрельба"
  }
};

const savedVolume = localStorage.getItem("musicVolume");
const savedLanguage = localStorage.getItem("gameLanguage") || "en";

let currentVolume = savedVolume !== null ? Number(savedVolume) : 22;

volumeSlider.value = currentVolume;
volumeValue.textContent = `${currentVolume}%`;
music.volume = currentVolume / 100;

languageSelect.value = savedLanguage;
applyLanguage(savedLanguage);

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

volumeSlider.addEventListener("input", () => {
  currentVolume = Number(volumeSlider.value);

  music.volume = currentVolume / 100;
  volumeValue.textContent = `${currentVolume}%`;

  localStorage.setItem("musicVolume", currentVolume);
});

languageSelect.addEventListener("change", () => {
  const selectedLanguage = languageSelect.value;

  localStorage.setItem("gameLanguage", selectedLanguage);
  applyLanguage(selectedLanguage);
});

function applyLanguage(language) {
  const dictionary = translations[language] || translations.en;

  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;

    if (dictionary[key]) {
      element.textContent = dictionary[key];
    }
  });
}

function returnToPreviousPage() {
  const returnTarget = sessionStorage.getItem("settingsReturnTo");

  sessionStorage.removeItem("settingsReturnTo");

  if (returnTarget) {
    if (typeof showLoadingScreen === "function") {
      showLoadingScreen(returnTarget, {
        title: "Returning",
        duration: 1200
      });
    } else {
      window.location.href = returnTarget;
    }

    return;
  }

  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "mainMenu.html";
}