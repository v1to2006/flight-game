const PLANE_TYPES = {
fighter: {
  id: "fighter",
  name: "Hawk Fighter",
  price: 0,
  image: "static/assets/planes/player_fighter1.png",
  hp: 5,
  speed: 6,
  shootDelay: 20,
  damage: 1,
  fireRateMultiplier: 1.0,
  weaponType: "single",
  rocketEveryShots: 0,
  description: "Balanced starter fighter. Reliable, simple, and easy to control."
},

interceptor: {
  id: "interceptor",
  name: "Swift Interceptor",
  price: 1200,
  image: "static/assets/planes/player_interceptor.png",
  hp: 4,
  speed: 8,
  shootDelay: 11,
  damage: 1,
  fireRateMultiplier: 1.2,
  weaponType: "dual_rocket_alt",
  rocketEveryShots: 5,
  description: "Fast aircraft with twin guns and alternating wing rockets."
},

attacker: {
  id: "attacker",
  name: "Iron Attacker",
  price: 2200,
  image: "static/assets/planes/player_attacker.png",
  hp: 7,
  speed: 4.5,
  shootDelay: 16,
  damage: 1.3,
  fireRateMultiplier: 0.9,
  weaponType: "heavy_auto",
  rocketEveryShots: 4,
  autoCannonDelay: 70,
  description: "Heavy aircraft with twin guns, rockets, and an automatic side cannon."
}
};

const UPGRADE_DEFS = {
  hp: {
    id: "hp",
    label: "HP",
    price: 400,
    step: 0.15,
    maxLevel: 5
  },

  speed: {
    id: "speed",
    label: "Speed",
    price: 450,
    step: 0.10,
    maxLevel: 5
  },

  fireRate: {
    id: "fireRate",
    label: "Fire Rate",
    price: 500,
    step: 0.12,
    maxLevel: 5
  },

  damage: {
    id: "damage",
    label: "Damage",
    price: 650,
    step: 0.20,
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