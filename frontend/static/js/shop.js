import { apiRequest } from "./apiClient.js";

const settingsButton = document.getElementById("settingsButton");

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
    apiStat: "hp",
    levelKey: "hpLevel",
    snakeLevelKey: "hp_level",
  },
  {
    id: "speed",
    apiStat: "speed",
    levelKey: "speedLevel",
    snakeLevelKey: "speed_level",
  },
  {
    id: "fireRate",
    apiStat: "firerate",
    levelKey: "firerateLevel",
    snakeLevelKey: "firerate_level",
  },
  {
    id: "damage",
    apiStat: "damage",
    levelKey: "damageLevel",
    snakeLevelKey: "damage_level",
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
    description: "Strong armored aircraft with powerful damage output.",
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

function tr(key, fallback = key) {
  if (typeof window.t !== "function") {
    return fallback;
  }

  const translated = window.t(key);

  if (!translated || translated === key) {
    return fallback;
  }

  return translated;
}

async function initShop() {
  setupSettingsButton();
  setupUpgradeFlipButton();

  try {
    planeCards.innerHTML = `<p class="shop-loading-text">${tr("loadingShop", "Loading shop...")}</p>`;

    await loadShopData();
    renderShop();
  } catch (error) {
    console.error(error);

    planeCards.innerHTML = "";
    previewName.textContent = tr("shopUnavailable", "Shop unavailable");
    previewDescription.textContent = tr("couldNotLoadShop", "Could not load shop data.");

    showMessage(error.message);
  }
}

function setupSettingsButton() {
  if (!settingsButton) return;

  settingsButton.addEventListener("click", () => {
    sessionStorage.setItem("settingsReturnTo", window.location.href);
    window.location.href = "settings.html";
  });
}

async function loadShopData() {
  const [profileResponse, ownedPlanesResponse, shopPlanesResponse] = await Promise.all([
    apiRequest("/player/profile"),
    apiRequest("/player/planes"),
    apiRequest("/player/planes/shop"),
  ]);

  player = profileResponse.player || profileResponse.profile || profileResponse;

  ownedPlanes =
    ownedPlanesResponse.planes ||
    ownedPlanesResponse.ownedPlanes ||
    ownedPlanesResponse.owned_planes ||
    ownedPlanesResponse ||
    [];

  shopPlanes =
    shopPlanesResponse.planes ||
    shopPlanesResponse.shopPlanes ||
    shopPlanesResponse.shop_planes ||
    shopPlanesResponse ||
    [];

  if (!Array.isArray(ownedPlanes)) ownedPlanes = [];
  if (!Array.isArray(shopPlanes)) shopPlanes = [];

  const selectedPlane = ownedPlanes.find((plane) => plane.selected);

  const currentPlane = ownedPlanes.find(
    (plane) => Number(getPlayerPlaneId(plane)) === Number(getCurrentPlayerPlaneId())
  );

  const fallbackPlane = currentPlane || selectedPlane || ownedPlanes[0] || shopPlanes[0];

  if (!selectedPreviewPlaneId && fallbackPlane) {
    selectedPreviewPlaneId = getPlaneId(fallbackPlane);
  }
}

function renderShop() {
  if (!player) return;

  moneyText.textContent = `${tr("money", "Money")}: ${formatMoney(getPlayerMoney())}`;

  renderPreview();
  renderPlaneCards();
  renderUpgradePanel();
  updateStatsPanelText();

  if (typeof window.applySavedLanguage === "function") {
    window.applySavedLanguage();
    updateStatsPanelText();
  }
}

function renderPreview() {
  const shopPlane = getPreviewShopPlane();

  if (!shopPlane) {
    previewName.textContent = tr("noAircraftFound", "No aircraft found");
    previewDescription.textContent = tr("noAircraftData", "No aircraft data available.");

    statHp.textContent = "-";
    statSpeed.textContent = "-";
    statFireRate.textContent = "-";
    statDamage.textContent = "-";
    statStatus.textContent = "-";
    return;
  }

  const planeId = getPlaneId(shopPlane);
  const ownedPlane = getOwnedPlaneByPlaneId(planeId);
  const ui = getPlaneUiData(shopPlane);

  const stats = getPlaneStatsForDisplay(shopPlane, ownedPlane);
  const multipliers = getPlaneMultipliersForDisplay(ownedPlane);

  const isSelected = ownedPlane && isOwnedPlaneSelected(ownedPlane);

  previewName.textContent = getPlaneName(shopPlane);
  previewImage.src = ui.image;
  previewImage.alt = `${getPlaneName(shopPlane)} preview`;
  previewDescription.textContent = ui.description;

  statHp.textContent = `${formatNumber(stats.hp)} x${formatMultiplier(multipliers.hp)}`;
  statSpeed.textContent = `${formatNumber(stats.speed)} x${formatMultiplier(multipliers.speed)}`;
  statFireRate.textContent = `${formatNumber(stats.firerate)} x${formatMultiplier(multipliers.firerate)}`;
  statDamage.textContent = `${formatNumber(stats.damage)} x${formatMultiplier(multipliers.damage)}`;

  if (isSelected) {
    statStatus.textContent = tr("selected", "Selected");
  } else if (ownedPlane) {
    statStatus.textContent = tr("owned", "Owned");
  } else {
    statStatus.textContent = `${tr("locked", "Locked")} - ${formatMoney(getPlanePrice(shopPlane))}`;
  }
}

function renderPlaneCards() {
  planeCards.innerHTML = "";

  if (shopPlanes.length === 0) {
    planeCards.innerHTML = `<p class="shop-loading-text">${tr("noPlanesFound", "No planes found.")}</p>`;
    return;
  }

  for (const shopPlane of shopPlanes) {
    const planeId = getPlaneId(shopPlane);
    const ownedPlane = getOwnedPlaneByPlaneId(planeId);

    const isOwned = Boolean(ownedPlane);
    const isSelected = ownedPlane && isOwnedPlaneSelected(ownedPlane);

    const price = getPlanePrice(shopPlane);
    const canAfford = Number(getPlayerMoney()) >= Number(price);

    const ui = getPlaneUiData(shopPlane);
    const stats = getPlaneStatsForDisplay(shopPlane, ownedPlane);

    const card = document.createElement("article");
    card.className = "plane-card";

    if (!isOwned) card.classList.add("locked");
    if (isSelected) card.classList.add("selected");

    card.addEventListener("click", () => {
      selectedPreviewPlaneId = planeId;
      renderShop();
    });

    const imageBox = document.createElement("div");
    imageBox.className = "card-image-box";

    const image = document.createElement("img");
    image.src = ui.image;
    image.alt = getPlaneName(shopPlane);

    imageBox.appendChild(image);

    const title = document.createElement("h3");
    title.textContent = getPlaneName(shopPlane);

    const priceElement = document.createElement("p");
    priceElement.className = "card-price";
    priceElement.textContent =
      Number(price) === 0
        ? tr("starterPlane", "Starter plane")
        : `${tr("price", "Price")}: ${formatMoney(price)}`;

    const statsText = document.createElement("p");
    statsText.className = "card-stats";
    statsText.textContent =
      `${tr("hp", "HP")} ${formatNumber(stats.hp)} | ` +
      `${tr("speed", "Speed")} ${formatNumber(stats.speed)} | ` +
      `${tr("damage", "Damage")} ${formatNumber(stats.damage)}`;

    const status = document.createElement("p");
    status.className = "card-status";

    if (isSelected) {
      status.textContent = tr("currentlySelected", "Currently selected");
    } else if (isOwned) {
      status.textContent = tr("owned", "Owned");
    } else if (canAfford) {
      status.textContent = tr("canBePurchased", "Available for purchase");
    } else {
      status.textContent = tr("locked", "Locked");
    }

    const button = document.createElement("button");
    button.className = "card-button";
    button.type = "button";

    if (isSelected) {
      button.textContent = tr("selected", "Selected");
      button.disabled = true;
    } else if (isOwned) {
      button.textContent = tr("select", "Select");
    } else {
      button.textContent = canAfford ? tr("buy", "Buy") : tr("notEnoughMoney", "Not enough money");
      button.disabled = !canAfford;
    }

    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await handlePlaneButtonClick(shopPlane, ownedPlane);
    });

    card.appendChild(imageBox);
    card.appendChild(title);
    card.appendChild(priceElement);
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
    lockedMessage.textContent = tr(
      "buyAircraftBeforeUpgrading",
      "Buy this aircraft before upgrading it."
    );

    upgradeRows.appendChild(lockedMessage);
    return;
  }

  for (const upgrade of UPGRADE_DEFS) {
    const statKey = upgrade.apiStat;

    const level = getUpgradeLevel(ownedPlane, upgrade);
    const multiplier = getUpgradeMultiplier(ownedPlane, statKey);

    const isMaxed = level >= MAX_UPGRADE_LEVEL;
    const upgradePrice = getUpgradePrice(ownedPlane, upgrade);

    const canAfford =
      upgradePrice !== null && Number(getPlayerMoney()) >= Number(upgradePrice);

    const row = document.createElement("div");
    row.className = "upgrade-row";

    const top = document.createElement("div");
    top.className = "upgrade-row-top";

    const name = document.createElement("span");
    name.className = "upgrade-name";
    name.textContent = `${tr(upgrade.id, getUpgradeFallbackName(upgrade.id))} x${formatMultiplier(multiplier)}`;

    const levelText = document.createElement("span");
    levelText.className = "upgrade-level";
    levelText.textContent = `${tr("levelShort", "Lvl")} ${level}/${MAX_UPGRADE_LEVEL}`;

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
    button.type = "button";

    if (isMaxed) {
      button.textContent = tr("maxed", "Maxed");
      button.disabled = true;
    } else if (upgradePrice === null) {
      button.textContent = tr("priceUnavailable", "Price unavailable");
      button.disabled = true;
    } else {
      button.textContent = canAfford
        ? `${tr("upgrade", "Upgrade")} - ${formatMoney(upgradePrice)}`
        : `${tr("need", "Need")} ${formatMoney(upgradePrice)}`;

      button.disabled = !canAfford;
    }

    button.addEventListener("click", async () => {
      await handleUpgradeClick(getPlayerPlaneId(ownedPlane), statKey);
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
      await selectOwnedPlane(getPlayerPlaneId(ownedPlane));

      selectedPreviewPlaneId = getPlaneId(shopPlane);
      showMessage(tr("planeSelected", "Plane selected."), "success");

      await refreshShop();
      return;
    }

    await apiRequest("/player/planes/buy", {
      method: "POST",
      body: JSON.stringify({
        planeId: getPlaneId(shopPlane),
      }),
    });

    await loadShopData();

    const purchasedPlane = getOwnedPlaneByPlaneId(getPlaneId(shopPlane));

    if (purchasedPlane) {
      await selectOwnedPlane(getPlayerPlaneId(purchasedPlane));
    }

    selectedPreviewPlaneId = getPlaneId(shopPlane);

    showMessage(tr("planePurchased", "Plane purchased."), "success");
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

    showMessage(tr("upgradePurchased", "Upgrade purchased."), "success");
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
    statsFlipCard.classList.toggle("flipped", upgradePanelOpen);
    updateStatsPanelText();
  });
}

function updateStatsPanelText() {
  if (!toggleUpgradeButton || !statsPanelTitle) return;

  if (upgradePanelOpen) {
    toggleUpgradeButton.dataset.i18n = "stats";
    statsPanelTitle.dataset.i18n = "upgradeStats";

    toggleUpgradeButton.textContent = tr("stats", "Stats");
    statsPanelTitle.textContent = tr("upgradeStats", "Upgrade Stats");
  } else {
    toggleUpgradeButton.dataset.i18n = "upgrades";
    statsPanelTitle.dataset.i18n = "aircraftStats";

    toggleUpgradeButton.textContent = tr("upgrades", "Upgrades");
    statsPanelTitle.textContent = tr("aircraftStats", "Aircraft Stats");
  }
}

function getOwnedPlaneByPlaneId(planeId) {
  return ownedPlanes.find((plane) => Number(getPlaneId(plane)) === Number(planeId));
}

function getShopPlaneByPlaneId(planeId) {
  return shopPlanes.find((plane) => Number(getPlaneId(plane)) === Number(planeId));
}

function getPreviewShopPlane() {
  return getShopPlaneByPlaneId(selectedPreviewPlaneId) || shopPlanes[0] || null;
}

function getPlaneUiData(plane) {
  const planeId = Number(getPlaneId(plane));

  if (PLANE_UI_BY_ID[planeId]) {
    return PLANE_UI_BY_ID[planeId];
  }

  const name = String(getPlaneName(plane)).toLowerCase();

  if (name.includes("interceptor") || name.includes("swift")) {
    return PLANE_UI_BY_ID[2];
  }

  if (name.includes("attacker") || name.includes("iron")) {
    return PLANE_UI_BY_ID[3];
  }

  if (name.includes("fighter") || name.includes("hawk")) {
    return PLANE_UI_BY_ID[1];
  }

  return DEFAULT_PLANE_UI;
}

function getPlaneStatsForDisplay(shopPlane, ownedPlane) {
  const ownedStats = ownedPlane?.stats || ownedPlane?.finalStats || ownedPlane?.final_stats;

  if (ownedStats) {
    return {
      hp: ownedStats.hp || 0,
      speed: ownedStats.speed || 0,
      damage: ownedStats.damage || 0,
      firerate: ownedStats.firerate || ownedStats.fireRate || ownedStats.fire_rate || 0,
    };
  }

  const baseStats = shopPlane.baseStats || shopPlane.base_stats || shopPlane;

  return {
    hp: baseStats.hp || 0,
    speed: baseStats.speed || 0,
    damage: baseStats.damage || 0,
    firerate: baseStats.firerate || baseStats.fireRate || baseStats.fire_rate || 0,
  };
}

function getPlaneMultipliersForDisplay(ownedPlane) {
  const multipliers = ownedPlane?.multipliers || ownedPlane?.upgradeMultipliers || ownedPlane?.upgrade_multipliers;

  return {
    hp: multipliers?.hp || 1,
    speed: multipliers?.speed || 1,
    damage: multipliers?.damage || 1,
    firerate: multipliers?.firerate || multipliers?.fireRate || multipliers?.fire_rate || 1,
  };
}

function getUpgradePrice(ownedPlane, upgrade) {
  const statKey = upgrade.apiStat;
  const uiKey = upgrade.id;

  const priceObjects = [
    ownedPlane.nextUpgradePrices,
    ownedPlane.next_upgrade_prices,
    ownedPlane.upgradePrices,
    ownedPlane.upgrade_prices,
    ownedPlane.upgradeCosts,
    ownedPlane.upgrade_costs,
  ];

  const possiblePrices = [];

  for (const priceObject of priceObjects) {
    if (!priceObject) continue;

    possiblePrices.push(priceObject[statKey]);
    possiblePrices.push(priceObject[uiKey]);
  }

  const price = possiblePrices.find(
    (value) => value !== undefined && value !== null && !Number.isNaN(Number(value))
  );

  return price === undefined ? null : Number(price);
}

function getUpgradeLevel(ownedPlane, upgrade) {
  return Number(
    ownedPlane.upgrades?.[upgrade.levelKey] ??
    ownedPlane.upgrades?.[upgrade.snakeLevelKey] ??
    ownedPlane[upgrade.levelKey] ??
    ownedPlane[upgrade.snakeLevelKey] ??
    0
  );
}

function getUpgradeMultiplier(ownedPlane, statKey) {
  const multipliers = getPlaneMultipliersForDisplay(ownedPlane);
  return Number(multipliers[statKey] || 1);
}

function getUpgradeFallbackName(upgradeId) {
  const names = {
    hp: "HP",
    speed: "Speed",
    fireRate: "Fire Rate",
    damage: "Damage",
  };

  return names[upgradeId] || upgradeId;
}

function isOwnedPlaneSelected(ownedPlane) {
  if (ownedPlane.selected === true) {
    return true;
  }

  return Number(getPlayerPlaneId(ownedPlane)) === Number(getCurrentPlayerPlaneId());
}

function getPlaneId(plane) {
  return plane?.planeId ?? plane?.plane_id ?? plane?.id;
}

function getPlayerPlaneId(plane) {
  return plane?.playerPlaneId ?? plane?.player_plane_id ?? plane?.ownedPlaneId ?? plane?.owned_plane_id ?? plane?.id;
}

function getCurrentPlayerPlaneId() {
  return player?.currentPlayerPlaneId ?? player?.current_player_plane_id;
}

function getPlayerMoney() {
  return Number(player?.money ?? player?.coins ?? 0);
}

function getPlanePrice(plane) {
  return Number(plane?.price ?? plane?.unlockPrice ?? plane?.unlock_price ?? plane?.cost ?? 0);
}

function getPlaneName(plane) {
  return plane?.name || plane?.planeName || plane?.plane_name || "Aircraft";
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

function formatMoney(value) {
  return Number(value || 0).toLocaleString("en-US");
}

document.addEventListener("DOMContentLoaded", initShop);