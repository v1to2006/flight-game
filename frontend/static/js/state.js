const DEFAULT_PLAYER_STATE = {
  money: 2500,

  selectedPlane: "fighter",

  unlockedPlanes: ["fighter"],

  completedNodes: [],

  upgrades: {
    hp: 0,
    speed: 0,
    fireRate: 0,
    damage: 0
  }
};

function loadPlayerState() {
  const savedState = localStorage.getItem("flightGameState");

  if (!savedState) {
    savePlayerState(DEFAULT_PLAYER_STATE);
    return structuredClone(DEFAULT_PLAYER_STATE);
  }

  try {
    return JSON.parse(savedState);
  } catch (error) {
    console.warn("Save data was broken. Resetting player state.");
    savePlayerState(DEFAULT_PLAYER_STATE);
    return structuredClone(DEFAULT_PLAYER_STATE);
  }
}

function savePlayerState(state) {
  localStorage.setItem("flightGameState", JSON.stringify(state));
}

function resetPlayerState() {
  savePlayerState(DEFAULT_PLAYER_STATE);
}

function isPlaneUnlocked(planeId) {
  const state = loadPlayerState();
  return state.unlockedPlanes.includes(planeId);
}

function unlockPlane(planeId) {
  const state = loadPlayerState();

  if (!state.unlockedPlanes.includes(planeId)) {
    state.unlockedPlanes.push(planeId);
  }

  savePlayerState(state);
}

function selectPlane(planeId) {
  const state = loadPlayerState();

  if (!state.unlockedPlanes.includes(planeId)) {
    return false;
  }

  state.selectedPlane = planeId;
  savePlayerState(state);
  return true;
}

function spendMoney(amount) {
  const state = loadPlayerState();

  if (state.money < amount) {
    return false;
  }

  state.money -= amount;
  savePlayerState(state);
  return true;
}

function addMoney(amount) {
  const state = loadPlayerState();
  state.money += amount;
  savePlayerState(state);
}

function getUpgradeLevel(upgradeId) {
  const state = loadPlayerState();

  if (!state.upgrades) {
    state.upgrades = {
      hp: 0,
      speed: 0,
      fireRate: 0,
      damage: 0
    };

    savePlayerState(state);
  }

  return state.upgrades[upgradeId] || 0;
}

function upgradeStat(upgradeId) {
  const state = loadPlayerState();
  const upgrade = getUpgradeById(upgradeId);

  if (!upgrade) {
    return false;
  }

  if (!state.upgrades) {
    state.upgrades = {
      hp: 0,
      speed: 0,
      fireRate: 0,
      damage: 0
    };
  }

  const currentLevel = state.upgrades[upgradeId] || 0;

  if (currentLevel >= upgrade.maxLevel) {
    return false;
  }

  const cost = getUpgradeCost(upgradeId);

  if (state.money < cost) {
    return false;
  }

  state.money -= cost;
  state.upgrades[upgradeId] = currentLevel + 1;

  savePlayerState(state);
  return true;
}

function getUpgradeCost(upgradeId) {
  const state = loadPlayerState();
  const upgrade = getUpgradeById(upgradeId);

  if (!upgrade) {
    return 0;
  }

  const level = state.upgrades?.[upgradeId] || 0;

  return Math.floor(upgrade.price * (1 + level * 0.55));
}

function getUpgradeMultiplier(upgradeId) {
  const level = getUpgradeLevel(upgradeId);
  const upgrade = getUpgradeById(upgradeId);

  if (!upgrade) {
    return 1;
  }

  return 1 + level * upgrade.step;
}