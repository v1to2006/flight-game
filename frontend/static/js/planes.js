const UPGRADE_DEFS = {
  hp: {
    id: "hp",
    label: "HP",
    price: 120,
    step: 0,
    maxLevel: 5
  },

  speed: {
    id: "speed",
    label: "Speed",
    price: 100,
    step: 0,
    maxLevel: 5
  },

  fireRate: {
    id: "fireRate",
    label: "Fire Rate",
    price: 200,
    step: 0,
    maxLevel: 5
  },

  damage: {
    id: "damage",
    label: "Damage",
    price: 220,
    step: 0,
    maxLevel: 5
  }
};

function getPlaneList() {
  return Object.values(PLANE_TYPES);
}

function getPlaneById(planeId) {
  return PLANE_TYPES[planeId] || PLANE_TYPES.fighter;
}

function getUpgradeList() {
  return Object.values(UPGRADE_DEFS);
}

function getUpgradeById(upgradeId) {
  return UPGRADE_DEFS[upgradeId];
}