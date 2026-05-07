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
    label: "HP",
    levelKey: "hpLevel",
    fallbackBasePrice: 400,
  },
  {
    id: "speed",
    label: "Speed",
    levelKey: "speedLevel",
    fallbackBasePrice: 450,
  },
  {
    id: "firerate",
    label: "Fire Rate",
    levelKey: "firerateLevel",
    fallbackBasePrice: 500,
  },
  {
    id: "damage",
    label: "Damage",
    levelKey: "damageLevel",
    fallbackBasePrice: 650,
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

async function initShop() {
  try {
    setupUpgradeFlipButton();

    planeCards.innerHTML = `<p class="shop-loading-text">Loading shop...</p>`;

    await loadShopData();
    renderShop();
  } catch (error) {
    console.error(error);

    planeCards.innerHTML = "";
    previewName.textContent = "Shop unavailable";
    previewDescription.textContent = "Could not load shop data.";

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
  const fallbackPlane = selectedPlane || ownedPlanes[0] || shopPlanes[0];

  if (!selectedPreviewPlaneId && fallbackPlane) {
    selectedPreviewPlaneId = fallbackPlane.planeId;
  }
}

function renderShop() {
  if (!player) return;

  moneyText.textContent = `Money: ${player.money}`;

  renderPreview();
  renderPlaneCards();
  renderUpgradePanel();
}

function renderPreview() {
  const shopPlane = getPreviewShopPlane();

  if (!shopPlane) {
    previewName.textContent = "No aircraft found";
    previewDescription.textContent = "No aircraft data was returned by the API.";

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
    statStatus.textContent = "Selected";
  } else if (ownedPlane) {
    statStatus.textContent = "Owned";
  } else {
    statStatus.textContent = `Locked - ${shopPlane.price}`;
  }
}

function renderPlaneCards() {
  planeCards.innerHTML = "";

  if (shopPlanes.length === 0) {
    planeCards.innerHTML = `<p class="shop-loading-text">No planes found.</p>`;
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
      Number(shopPlane.price) === 0 ? "Starter plane" : `Price: ${shopPlane.price}`;

    const statsText = document.createElement("p");
    statsText.className = "card-stats";
    statsText.textContent =
      `HP ${formatNumber(stats.hp)} | ` +
      `Speed ${formatNumber(stats.speed)} | ` +
      `DMG ${formatNumber(stats.damage)}`;

    const status = document.createElement("p");
    status.className = "card-status";

    if (isSelected) {
      status.textContent = "Currently selected";
    } else if (isOwned) {
      status.textContent = "Owned";
    } else if (canAfford) {
      status.textContent = "Can be purchased";
    } else {
      status.textContent = "Locked";
    }

    const button = document.createElement("button");
    button.className = "card-button";

    if (isSelected) {
      button.textContent = "Selected";
      button.disabled = true;
    } else if (isOwned) {
      button.textContent = "Select";
    } else {
      button.textContent = canAfford ? "Buy" : "Not enough money";
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
    lockedMessage.textContent = "Buy this aircraft before upgrading it.";

    upgradeRows.appendChild(lockedMessage);
    return;
  }

  for (const upgrade of UPGRADE_DEFS) {
    const level = Number(ownedPlane.upgrades?.[upgrade.levelKey] || 0);
    const multiplier = Number(ownedPlane.multipliers?.[upgrade.id] || 1);

    const isMaxed = level >= MAX_UPGRADE_LEVEL;
    const upgradePrice = getUpgradePrice(ownedPlane, upgrade, level);
    const canAfford =
      upgradePrice === null || Number(player.money) >= Number(upgradePrice);

    const row = document.createElement("div");
    row.className = "upgrade-row";

    const top = document.createElement("div");
    top.className = "upgrade-row-top";

    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = `${upgrade.label} x${formatMultiplier(multiplier)}`;

    const levelText = document.createElement("span");
    levelText.className = "upgrade-level";
    levelText.textContent = `Lvl ${level}/${MAX_UPGRADE_LEVEL}`;

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
      button.textContent = "Maxed";
      button.disabled = true;
    } else if (upgradePrice === null) {
      button.textContent = "Upgrade";
      button.disabled = false;
    } else {
      button.textContent = canAfford
        ? `Upgrade - ${upgradePrice}`
        : `Need ${upgradePrice}`;

      button.disabled = !canAfford;
    }

    button.addEventListener("click", async () => {
      await handleUpgradeClick(ownedPlane.playerPlaneId, upgrade.id);
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
      showMessage("Plane selected.", "success");

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

    showMessage("Plane purchased.", "success");
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

    showMessage("Upgrade purchased.", "success");
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
      toggleUpgradeButton.textContent = "Stats";
      statsPanelTitle.textContent = "Upgrade Stats";
    } else {
      statsFlipCard.classList.remove("flipped");
      toggleUpgradeButton.textContent = "Upgrades";
      statsPanelTitle.textContent = "Aircraft Stats";
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
  const directPrice =
    ownedPlane.nextUpgradePrices?.[upgrade.id] ??
    ownedPlane.upgradePrices?.[upgrade.id] ??
    ownedPlane.upgradeCosts?.[upgrade.id];

  if (directPrice !== undefined && directPrice !== null) {
    return Number(directPrice);
  }

  if (currentLevel >= MAX_UPGRADE_LEVEL) {
    return 0;
  }

  return Math.floor(upgrade.fallbackBasePrice * (1 + currentLevel * 0.55));
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

initShop();