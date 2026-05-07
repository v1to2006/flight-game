const moneyText = document.getElementById("moneyText");
const planeCards = document.getElementById("planeCards");

const previewName = document.getElementById("previewName");
const previewImage = document.getElementById("previewImage");
const previewDescription = document.getElementById("previewDescription");

const statHp = document.getElementById("statHp");
const statSpeed = document.getElementById("statSpeed");
const statFireRate = document.getElementById("statFireRate");
const statDamage = document.getElementById("statDamage");
const statStatus = document.getElementById("statStatus");

const resetButton = document.getElementById("resetButton");

const toggleUpgradeButton = document.getElementById("toggleUpgradeButton");
const upgradeRows = document.getElementById("upgradeRows");
const statsFlipCard = document.getElementById("statsFlipCard");
const statsPanelTitle = document.getElementById("statsPanelTitle");

let selectedPreviewPlaneId = loadPlayerState().selectedPlane;
let upgradePanelOpen = false;

function renderShop() {
  const state = loadPlayerState();

  moneyText.textContent = `Money: ${state.money}`;

  renderPreview(selectedPreviewPlaneId);
  renderPlaneCards(state);
  renderUpgradePanel(state);
}

function renderPreview(planeId) {
  const state = loadPlayerState();
  const plane = getPlaneById(planeId);

  const unlocked = state.unlockedPlanes.includes(plane.id);
  const selected = state.selectedPlane === plane.id;

  const hpMultiplier = getUpgradeMultiplier("hp");
  const speedMultiplier = getUpgradeMultiplier("speed");
  const fireRateMultiplier = getUpgradeMultiplier("fireRate");
  const damageMultiplier = getUpgradeMultiplier("damage");

  const finalHp = Math.round(plane.hp * hpMultiplier);
  const finalSpeed = Number((plane.speed * speedMultiplier).toFixed(1));
  const finalFireRate = Number((plane.fireRateMultiplier * fireRateMultiplier).toFixed(2));
  const finalDamage = Number((plane.damage * damageMultiplier).toFixed(1));

  previewName.textContent = plane.name;
  previewImage.src = plane.image;
  previewDescription.textContent = plane.description;

  statHp.textContent = `${finalHp}  x${hpMultiplier.toFixed(2)}`;
  statSpeed.textContent = `${finalSpeed}  x${speedMultiplier.toFixed(2)}`;
  statFireRate.textContent = `x${finalFireRate.toFixed(2)}`;
  statDamage.textContent = `${finalDamage}  x${damageMultiplier.toFixed(2)}`;

  if (selected) {
    statStatus.textContent = "Selected";
  } else if (unlocked) {
    statStatus.textContent = "Unlocked";
  } else {
    statStatus.textContent = `Locked - ${plane.price}`;
  }
}

function renderPlaneCards(state) {
  planeCards.innerHTML = "";

  const planes = getPlaneList();

  for (const plane of planes) {
    const unlocked = state.unlockedPlanes.includes(plane.id);
    const selected = state.selectedPlane === plane.id;
    const affordable = state.money >= plane.price;

    const card = document.createElement("article");
    card.classList.add("plane-card");

    if (!unlocked) {
      card.classList.add("locked");
    }

    if (selected) {
      card.classList.add("selected");
    }

    card.addEventListener("click", () => {
      selectedPreviewPlaneId = plane.id;
      renderShop();
    });

    const imageBox = document.createElement("div");
    imageBox.classList.add("card-image-box");

    const img = document.createElement("img");
    img.src = plane.image;
    img.alt = plane.name;

    imageBox.appendChild(img);

    const title = document.createElement("h3");
    title.textContent = plane.name;

    const price = document.createElement("p");
    price.classList.add("card-price");
    price.textContent = plane.price === 0 ? "Starter plane" : `Price: ${plane.price}`;

    const hpMultiplier = getUpgradeMultiplier("hp");
    const speedMultiplier = getUpgradeMultiplier("speed");
    const damageMultiplier = getUpgradeMultiplier("damage");

    const finalHp = Math.round(plane.hp * hpMultiplier);
    const finalSpeed = Number((plane.speed * speedMultiplier).toFixed(1));
    const finalDamage = Number((plane.damage * damageMultiplier).toFixed(1));

    const stats = document.createElement("p");
    stats.textContent = `HP ${finalHp} | Speed ${finalSpeed} | DMG ${finalDamage}`;

    const status = document.createElement("p");
    status.classList.add("card-status");

    if (selected) {
      status.textContent = "Currently selected";
    } else if (unlocked) {
      status.textContent = "Unlocked";
    } else if (affordable) {
      status.textContent = "Can be purchased";
    } else {
      status.textContent = "Locked";
    }

    const button = document.createElement("button");
    button.classList.add("card-button");

    if (selected) {
      button.textContent = "Selected";
      button.disabled = true;
    } else if (unlocked) {
      button.textContent = "Select";
    } else {
      button.textContent = affordable ? "Buy" : "Not enough money";
      button.disabled = !affordable;
    }

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      handlePlaneButtonClick(plane.id);
    });

    card.appendChild(imageBox);
    card.appendChild(title);
    card.appendChild(price);
    card.appendChild(stats);
    card.appendChild(status);
    card.appendChild(button);

    planeCards.appendChild(card);
  }
}

function renderUpgradePanel(state) {
  if (!upgradeRows) return;

  upgradeRows.innerHTML = "";

  const upgrades = getUpgradeList();

  for (const upgrade of upgrades) {
    const level = getUpgradeLevel(upgrade.id);
    const cost = getUpgradeCost(upgrade.id);
    const multiplier = getUpgradeMultiplier(upgrade.id);
    const isMaxed = level >= upgrade.maxLevel;
    const canAfford = state.money >= cost;

    const row = document.createElement("div");
    row.classList.add("upgrade-row");

    const top = document.createElement("div");
    top.classList.add("upgrade-row-top");

    const name = document.createElement("span");
    name.classList.add("upgrade-name");
    name.textContent = `${upgrade.label} x${multiplier.toFixed(2)}`;

    const levelText = document.createElement("span");
    levelText.classList.add("upgrade-level");
    levelText.textContent = `Lvl ${level}/${upgrade.maxLevel}`;

    top.appendChild(name);
    top.appendChild(levelText);

const bar = document.createElement("div");
bar.classList.add("upgrade-segment-bar");

for (let i = 0; i < upgrade.maxLevel; i++) {
  const segment = document.createElement("div");
  segment.classList.add("upgrade-segment");

  if (i < level) {
    segment.classList.add("filled");
  }

  bar.appendChild(segment);
}

    const button = document.createElement("button");
    button.classList.add("upgrade-buy-button");

    if (isMaxed) {
      button.textContent = "Maxed";
      button.disabled = true;
    } else {
      button.textContent = canAfford ? `Upgrade - ${cost}` : `Need ${cost}`;
      button.disabled = !canAfford;
    }

    button.addEventListener("click", () => {
      const success = upgradeStat(upgrade.id);

      if (!success) {
        alert("Not enough money or upgrade is already maxed.");
        return;
      }

      renderShop();
    });

    row.appendChild(top);
    row.appendChild(bar);
    row.appendChild(button);

    upgradeRows.appendChild(row);
  }
}

function handlePlaneButtonClick(planeId) {
  const state = loadPlayerState();
  const plane = getPlaneById(planeId);

  const unlocked = state.unlockedPlanes.includes(plane.id);

  if (unlocked) {
    selectPlane(plane.id);
    selectedPreviewPlaneId = plane.id;
    renderShop();
    return;
  }

  const purchaseSuccessful = spendMoney(plane.price);

  if (!purchaseSuccessful) {
    alert("Not enough money.");
    return;
  }

  unlockPlane(plane.id);
  selectPlane(plane.id);
  selectedPreviewPlaneId = plane.id;

  renderShop();
}

if (toggleUpgradeButton && statsFlipCard && statsPanelTitle) {
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

if (resetButton) {
  resetButton.addEventListener("click", () => {
    resetPlayerState();
    selectedPreviewPlaneId = loadPlayerState().selectedPlane;
    renderShop();
  });
}

if (upgradeRows) {
  upgradeRows.addEventListener(
    "wheel",
    (event) => {
      const isScrollingUp = event.deltaY < 0;
      const isScrollingDown = event.deltaY > 0;

      const atTop = upgradeRows.scrollTop <= 0;
      const atBottom =
        upgradeRows.scrollTop + upgradeRows.clientHeight >= upgradeRows.scrollHeight - 1;

      // Jos listan sisällä voi vielä scrollata, estetään sivun scrollaus
      if ((isScrollingUp && !atTop) || (isScrollingDown && !atBottom)) {
        event.preventDefault();
        upgradeRows.scrollTop += event.deltaY;
      }

      // Jos ollaan ihan ylhäällä/alhaalla, voit halutessa estää silti sivun scrollin:
      if ((isScrollingUp && atTop) || (isScrollingDown && atBottom)) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

renderShop();