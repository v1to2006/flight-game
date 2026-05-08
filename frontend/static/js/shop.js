import { apiRequest } from "./apiClient.js";

const moneyText = document.getElementById("moneyText");
const shopMessage = document.getElementById("shopMessage");
const planeCards = document.getElementById("planeCards");

const previewName = document.getElementById("previewName");
const previewImage = document.getElementById("previewImage");
const previewDescription = document.getElementById("previewDescription");

const statHp = document.getElementById("statHp");
const statSpeed = document.getElementById("statSpeed");
const statFireRate = document.getElementById("statFireRate");
const statDamage = document.getElementById("statDamage");
const statStatus = document.getElementById("statStatus");

const toggleUpgradeButton = document.getElementById("toggleUpgradeButton");
const upgradeRows = document.getElementById("upgradeRows");
const statsFlipCard = document.getElementById("statsFlipCard");
const statsPanelTitle = document.getElementById("statsPanelTitle");

const MAX_UPGRADE_LEVEL = 5;

const UPGRADE_DEFS = [
  {
    id: "hp",
    levelKey: "hpLevel",
  },
  {
    id: "speed",
    levelKey: "speedLevel",
  },
  {
    id: "fireRate",
    apiStat: "firerate",
    levelKey: "firerateLevel",
  },
  {
    id: "damage",
    levelKey: "damageLevel",
  },
];

const PLANE_UI_BY_ID = {
  1: {
    image: "./static/assets/planes/player_fighter1.png",
    description: "Balanced starter fighter. Reliable, simple, and easy to control.",
  },
  2: {
    image: "./static/assets/planes/player_interceptor.png",
    description: "Fast aircraft with twin guns and alternating wing rockets.",
  },
  3: {
    image: "./static/assets/planes/player_attacker.png",
    description: "Heavy aircraft with strong armor and powerful damage output.",
  },
};

const DEFAULT_PLANE_UI = {
  image: "./static/assets/planes/player_fighter1.png",
  description: "Military aircraft ready for combat operations.",
};

let player = null;
let ownedPlanes = [];
let shopPlanes = [];

let selectedPreviewPlaneId = null;
let upgradePanelOpen = false;
let isBusy = false;

function tr(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

async function initShop() {
  try {
    setupUpgradeFlipButton();

    planeCards.innerHTML = `<p class="shop-loading-text">${tr("loadingShop")}</p>`;

    await loadShopData();
    renderShop();
  } catch (error) {
    console.error(error);

    planeCards.innerHTML = "";
    previewName.textContent = tr("shopUnavailable");
    previewDescription.textContent = tr("couldNotLoadShop");

    showMessage(error.message);
  }
}

async function loadShopData() {
  const [profileResponse, ownedPlanesResponse, shopPlanesResponse] =
    await Promise.all([
      apiRequest("/player/profile"),
      apiRequest("/player/planes"),
      apiRequest("/player/planes/shop"),
    ]);

  player = profileResponse.player || profileResponse.profile || profileResponse;

  ownedPlanes =
    ownedPlanesResponse.planes ||
    ownedPlanesResponse.ownedPlanes ||
    ownedPlanesResponse ||
    [];

  shopPlanes =
    shopPlanesResponse.planes ||
    shopPlanesResponse.shopPlanes ||
    shopPlanesResponse ||
    [];

  if (!Array.isArray(ownedPlanes)) ownedPlanes = [];
  if (!Array.isArray(shopPlanes)) shopPlanes = [];

  const selectedPlane = ownedPlanes.find((plane) => plane.selected);
  const currentPlane = ownedPlanes.find(
    (plane) => Number(plane.playerPlaneId) === Number(player.currentPlayerPlaneId)
  );

  const fallbackPlane = currentPlane || selectedPlane || ownedPlanes[0] || shopPlanes[0];

  if (!selectedPreviewPlaneId && fallbackPlane) {
    selectedPreviewPlaneId = fallbackPlane.planeId;
  }
}

function renderShop() {
  if (!player) return;

  moneyText.textContent = `${tr("money")}: ${player.money}`;

  renderPreview();
  renderPlaneCards();
  renderUpgradePanel();

  if (upgradePanelOpen) {
    toggleUpgradeButton.textContent = tr("stats");
    statsPanelTitle.textContent = tr("upgradeStats");
  } else {
    toggleUpgradeButton.textContent = tr("upgrades");
    statsPanelTitle.textContent = tr("aircraftStats");
  }

  if (typeof window.applySavedLanguage === "function") {
    window.applySavedLanguage();
  }
}

function renderPreview() {
  const shopPlane = getPreviewShopPlane();

  if (!shopPlane) {
    previewName.textContent = tr("noAircraftFound");
    previewDescription.textContent = tr("noAircraftData");

    statHp.textContent = "-";
    statSpeed.textContent = "-";
    statFireRate.textContent = "-";
    statDamage.textContent = "-";
    statStatus.textContent = "-";
    return;
  }

  const ownedPlane = getOwnedPlaneByPlaneId(shopPlane.planeId);
  const ui = getPlaneUiData(shopPlane);

  const stats = getPlaneStatsForDisplay(shopPlane, ownedPlane);
  const multipliers = getPlaneMultipliersForDisplay(ownedPlane);

  const isSelected =
    ownedPlane &&
    Number(ownedPlane.playerPlaneId) === Number(player.currentPlayerPlaneId);

  previewName.textContent = shopPlane.name;
  previewImage.src = ui.image;
  previewImage.alt = `${shopPlane.name} preview`;
  previewDescription.textContent = ui.description;

  statHp.textContent = `${formatNumber(stats.hp)} x${formatMultiplier(multipliers.hp)}`;
  statSpeed.textContent = `${formatNumber(stats.speed)} x${formatMultiplier(multipliers.speed)}`;
  statFireRate.textContent = `${formatNumber(stats.firerate)} x${formatMultiplier(multipliers.firerate)}`;
  statDamage.textContent = `${formatNumber(stats.damage)} x${formatMultiplier(multipliers.damage)}`;

  if (isSelected) {
    statStatus.textContent = tr("selected");
  } else if (ownedPlane) {
    statStatus.textContent = tr("owned");
  } else {
    statStatus.textContent = `${tr("locked")} - ${shopPlane.price}`;
  }
}

function renderPlaneCards() {
  planeCards.innerHTML = "";

  if (shopPlanes.length === 0) {
    planeCards.innerHTML = `<p class="shop-loading-text">${tr("noPlanesFound")}</p>`;
    return;
  }

  for (const shopPlane of shopPlanes) {
    const ownedPlane = getOwnedPlaneByPlaneId(shopPlane.planeId);

    const isOwned = Boolean(ownedPlane);
    const isSelected =
      ownedPlane &&
      Number(ownedPlane.playerPlaneId) === Number(player.currentPlayerPlaneId);

    const canAfford = Number(player.money) >= Number(shopPlane.price);
    const ui = getPlaneUiData(shopPlane);
    const stats = getPlaneStatsForDisplay(shopPlane, ownedPlane);

    const card = document.createElement("article");
    card.className = "plane-card";

    if (!isOwned) card.classList.add("locked");
    if (isSelected) card.classList.add("selected");

    card.addEventListener("click", () => {
      selectedPreviewPlaneId = shopPlane.planeId;
      renderShop();
    });

    const imageBox = document.createElement("div");
    imageBox.className = "card-image-box";

    const image = document.createElement("img");
    image.src = ui.image;
    image.alt = shopPlane.name;

    imageBox.appendChild(image);

    const title = document.createElement("h3");
    title.textContent = shopPlane.name;

    const price = document.createElement("p");
    price.className = "card-price";
    price.textContent =
      Number(shopPlane.price) === 0
        ? tr("starterPlane")
        : `${tr("price")}: ${shopPlane.price}`;

    const statsText = document.createElement("p");
    statsText.className = "card-stats";
    statsText.textContent =
      `${tr("hp")} ${formatNumber(stats.hp)} | ` +
      `${tr("speed")} ${formatNumber(stats.speed)} | ` +
      `${tr("damage")} ${formatNumber(stats.damage)}`;

    const status = document.createElement("p");
    status.className = "card-status";

    if (isSelected) {
      status.textContent = tr("currentlySelected");
    } else if (isOwned) {
      status.textContent = tr("owned");
    } else if (canAfford) {
      status.textContent = tr("canBePurchased");
    } else {
      status.textContent = tr("locked");
    }

    const button = document.createElement("button");
    button.className = "card-button";

    if (isSelected) {
      button.textContent = tr("selected");
      button.disabled = true;
    } else if (isOwned) {
      button.textContent = tr("select");
    } else {
      button.textContent = canAfford ? tr("buy") : tr("notEnoughMoney");
      button.disabled = !canAfford;
    }

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await handlePlaneButtonClick(shopPlane, ownedPlane);
    });

    card.appendChild(imageBox);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(statsText);
    card.appendChild(status);
    card.appendChild(button);

    planeCards.appendChild(card);
  }
}

function renderUpgradePanel() {
  upgradeRows.innerHTML = "";

  const ownedPlane = getOwnedPlaneByPlaneId(selectedPreviewPlaneId);

  if (!ownedPlane) {
    const lockedMessage = document.createElement("p");
    lockedMessage.className = "upgrade-empty-message";
    lockedMessage.textContent = tr("buyAircraftBeforeUpgrading");

    upgradeRows.appendChild(lockedMessage);
    return;
  }

  for (const upgrade of UPGRADE_DEFS) {
    const statKey = upgrade.apiStat || upgrade.id;

    const level = Number(ownedPlane.upgrades?.[upgrade.levelKey] || 0);
    const multiplier = Number(ownedPlane.multipliers?.[statKey] || 1);

    const isMaxed = level >= MAX_UPGRADE_LEVEL;
    const upgradePrice = getUpgradePrice(ownedPlane, upgrade);
    const canAfford =
      upgradePrice !== null && Number(player.money) >= Number(upgradePrice);

    const row = document.createElement("div");
    row.className = "upgrade-row";

    const top = document.createElement("div");
    top.className = "upgrade-row-top";

    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = `${tr(upgrade.id)} x${formatMultiplier(multiplier)}`;

    const levelText = document.createElement("span");
    levelText.className = "upgrade-level";
    levelText.textContent = `${tr("levelShort")} ${level}/${MAX_UPGRADE_LEVEL}`;

    top.appendChild(name);
    top.appendChild(levelText);

    const bar = document.createElement("div");
    bar.className = "upgrade-segment-bar";

    for (let i = 0; i < MAX_UPGRADE_LEVEL; i++) {
      const segment = document.createElement("div");
      segment.className = "upgrade-segment";

      if (i < level) {
        segment.classList.add("filled");
      }

      bar.appendChild(segment);
    }

    const button = document.createElement("button");
    button.className = "upgrade-buy-button";

    if (isMaxed) {
      button.textContent = tr("maxed");
      button.disabled = true;
    } else if (upgradePrice === null) {
      button.textContent = tr("upgrade");
      button.disabled = false;
      button.textContent = "Price unavailable";
      button.disabled = true;
    } else {
      button.textContent = canAfford
        ? `${tr("upgrade")} - ${upgradePrice}`
        : `${tr("need")} ${upgradePrice}`;

      button.disabled = !canAfford;
    }

    button.addEventListener("click", async () => {
      await handleUpgradeClick(ownedPlane.playerPlaneId, statKey);
    });

    row.appendChild(top);
    row.appendChild(bar);
    row.appendChild(button);

    upgradeRows.appendChild(row);
  }
}

async function handlePlaneButtonClick(shopPlane, ownedPlane) {
  if (isBusy) return;

  try {
    setBusy(true);

    if (ownedPlane) {
      await selectOwnedPlane(ownedPlane.playerPlaneId);

      selectedPreviewPlaneId = shopPlane.planeId;
      showMessage(tr("planeSelected"), "success");

      await refreshShop();
      return;
    }

    await apiRequest("/player/planes/buy", {
      method: "POST",
      body: JSON.stringify({
        planeId: shopPlane.planeId,
      }),
    });

    await loadShopData();

    const purchasedPlane = getOwnedPlaneByPlaneId(shopPlane.planeId);

    if (purchasedPlane) {
      await selectOwnedPlane(purchasedPlane.playerPlaneId);
    }

    selectedPreviewPlaneId = shopPlane.planeId;

    showMessage(tr("planePurchased"), "success");
    await refreshShop();
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(false);
  }
}

async function selectOwnedPlane(playerPlaneId) {
  return apiRequest("/player/planes/select", {
    method: "POST",
    body: JSON.stringify({
      playerPlaneId,
    }),
  });
}

async function handleUpgradeClick(playerPlaneId, stat) {
  if (isBusy) return;

  try {
    setBusy(true);

    await apiRequest("/player/planes/upgrade", {
      method: "POST",
      body: JSON.stringify({
        playerPlaneId,
        stat,
      }),
    });

    showMessage(tr("upgradePurchased"), "success");
    await refreshShop();
  } catch (error) {
    showMessage(error.message);
  } finally {
    setBusy(false);
  }
}

async function refreshShop() {
  await loadShopData();
  renderShop();
}

function setupUpgradeFlipButton() {
  if (!toggleUpgradeButton || !statsFlipCard || !statsPanelTitle) return;

  toggleUpgradeButton.addEventListener("click", () => {
    upgradePanelOpen = !upgradePanelOpen;

    if (upgradePanelOpen) {
      statsFlipCard.classList.add("flipped");
      toggleUpgradeButton.textContent = tr("stats");
      statsPanelTitle.textContent = tr("upgradeStats");
    } else {
      statsFlipCard.classList.remove("flipped");
      toggleUpgradeButton.textContent = tr("upgrades");
      statsPanelTitle.textContent = tr("aircraftStats");
    }
  });
}

function getOwnedPlaneByPlaneId(planeId) {
  return ownedPlanes.find((plane) => Number(plane.planeId) === Number(planeId));
}

function getShopPlaneByPlaneId(planeId) {
  return shopPlanes.find((plane) => Number(plane.planeId) === Number(planeId));
}

function getPreviewShopPlane() {
  return getShopPlaneByPlaneId(selectedPreviewPlaneId) || shopPlanes[0] || null;
}

function getPlaneUiData(plane) {
  if (PLANE_UI_BY_ID[plane.planeId]) {
    return PLANE_UI_BY_ID[plane.planeId];
  }

  const name = String(plane.name || "").toLowerCase();

  if (name.includes("interceptor") || name.includes("swift")) {
    return {
      image: "./static/assets/planes/player_interceptor.png",
      description: "Fast aircraft with twin guns and alternating wing rockets.",
    };
  }

  if (name.includes("attacker") || name.includes("iron")) {
    return {
      image: "./static/assets/planes/player_attacker.png",
      description: "Heavy aircraft with strong armor and powerful damage output.",
    };
  }

  if (name.includes("fighter") || name.includes("hawk")) {
    return {
      image: "./static/assets/planes/player_fighter1.png",
      description: "Balanced starter fighter. Reliable, simple, and easy to control.",
    };
  }

  return DEFAULT_PLANE_UI;
}

function getPlaneStatsForDisplay(shopPlane, ownedPlane) {
  if (ownedPlane?.stats) {
    return {
      hp: ownedPlane.stats.hp,
      speed: ownedPlane.stats.speed,
      damage: ownedPlane.stats.damage,
      firerate: ownedPlane.stats.firerate,
    };
  }

  return {
    hp: shopPlane.baseStats?.hp || 0,
    speed: shopPlane.baseStats?.speed || 0,
    damage: shopPlane.baseStats?.damage || 0,
    firerate: shopPlane.baseStats?.firerate || 0,
  };
}

function getPlaneMultipliersForDisplay(ownedPlane) {
  return {
    hp: ownedPlane?.multipliers?.hp || 1,
    speed: ownedPlane?.multipliers?.speed || 1,
    damage: ownedPlane?.multipliers?.damage || 1,
    firerate: ownedPlane?.multipliers?.firerate || 1,
  };
}

function getUpgradePrice(ownedPlane, upgrade, currentLevel) {
  const statKey = upgrade.apiStat || upgrade.id;

  const directPrice =
    ownedPlane.nextUpgradePrices?.[statKey] ??
    ownedPlane.nextUpgradePrices?.[upgrade.id] ??
    ownedPlane.upgradePrices?.[statKey] ??
    ownedPlane.upgradePrices?.[upgrade.id] ??
    ownedPlane.upgradeCosts?.[statKey] ??
    ownedPlane.upgradeCosts?.[upgrade.id];

  if (directPrice !== undefined && directPrice !== null) {
    return Number(directPrice);
  }

  if (price === undefined || price === null) {
    return null;
  }

  return Number(price);
}

function showMessage(message, type = "error") {
  if (!shopMessage) return;

  shopMessage.textContent = message;
  shopMessage.classList.remove("hidden", "success", "error");
  shopMessage.classList.add(type);

  window.clearTimeout(showMessage.timeoutId);

  showMessage.timeoutId = window.setTimeout(() => {
    shopMessage.classList.add("hidden");
  }, 3500);
}

function setBusy(value) {
  isBusy = value;
  document.body.classList.toggle("is-busy", value);
}

function formatNumber(value) {
  const numberValue = Number(value || 0);

  if (Number.isInteger(numberValue)) {
    return String(numberValue);
  }

  return numberValue.toFixed(2);
}

function formatMultiplier(value) {
  return Number(value || 1).toFixed(2);
}

document.addEventListener("DOMContentLoaded", initShop);