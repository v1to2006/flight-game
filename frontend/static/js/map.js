
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d")
let nodes = [];
let currentNode = null;

let zoom = 1.6;
let offsetX = -400;
let offsetY = 20;


const icons = {
  easy: new Image(),
  medium: new Image(),
  hard: new Image(),
  miniboss: new Image(),
  boss: new Image(),
  homebase: new Image()
}

icons.easy.src ="/static/assets/backgrounds/easy.png";
icons.medium.src="/static/assets/backgrounds/medium.png";
icons.hard.src="/static/assets/backgrounds/hard.png";
icons.miniboss.src = "/static/assets/backgrounds/miniboss.png";
icons.boss.src = "/static/assets/backgrounds/boss.png";
icons.homebase.src = "/static/assets/backgrounds/base.png"


//hardcoded lentokentät aluksi
const airports = [

  { name: "Helsinki", icao: "EFHK", lat: 60.32, lon: 24.96 },
  { name: "Oulu", icao: "EFOU", lat: 64.93, lon: 25.35 },
  { name: "Rovaniemi", icao: "EFRO", lat: 66.56, lon: 25.83 },

  { name: "Tallinn", icao: "EETN", lat: 59.41, lon: 24.83 },
  { name: "Riga", icao: "EVRA", lat: 56.92, lon: 23.97 },
  { name: "Vilnius", icao: "EYVI", lat: 54.63, lon: 25.28 },

  { name: "Stockholm", icao: "ESSA", lat: 59.65, lon: 17.92 },
  { name: "Gothenburg", icao: "ESGG", lat: 57.66, lon: 12.29 },
  { name: "Malmo", icao: "ESMS", lat: 55.54, lon: 13.37 },

  { name: "Oslo", icao: "ENGM", lat: 60.19, lon: 11.1 },
  { name: "Bergen", icao: "ENBR", lat: 60.29, lon: 5.22 },
  { name: "Tromso", icao: "ENTC", lat: 69.68, lon: 18.92 },

  { name: "Copenhagen", icao: "EKCH", lat: 55.62, lon: 12.65 },

  { name: "Warsaw", icao: "EPWA", lat: 52.17, lon: 20.97 },
  { name: "Gdansk", icao: "EPGD", lat: 54.38, lon: 18.47 },
  { name: "Wolfsschanze", icao: "EPKE", lat: 54.05, lon: 21.43 },

  { name: "Berlin - Fuhrerbunker", icao: "EDDB", lat: 52.36, lon: 13.5 },
  { name: "Hamburg", icao: "EDDH", lat: 53.63, lon: 9.99 },
  { name: "Frankfurt", icao: "EDDF", lat: 50.03, lon: 8.57 },
  { name: "Munich", icao: "EDDM", lat: 48.35, lon: 11.79 }
];

const zone1map = new Image();
zone1map.src = '/static/assets/backgrounds/ww2map.png';


// Kuvan määritelmät langitude + longitude
const zone_1 = {
  minLat: 31,
  maxLat: 72,
  minLon: -24,
  maxLon: 60
};
//base node tyypit pelissä
const NODE_TYPES = {
  HOMEBASE : "HomeBase",
  COMBAT : "Combat",
  SHOP : "Shop",
  MINIBOSS : "MiniBoss",
  FINALBOSS : "FinalBoss"
};

//nodejen määrä kartalla
function getNodeCount() {
  return Math.floor(Math.random() * 6) + 10; // antaa nodejen määrän kartalle 10-15
}


function takeAirports (airports, count) {
  return airports
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
}

// longitude ja langitude muutetaan x ja y
function projektio(lat,lon) {
  const x = ((lon - zone_1.minLon ) / (zone_1.maxLon - zone_1.minLon)) * canvas.width * zoom + offsetX;
  const y = ((zone_1.maxLat - lat) / (zone_1.maxLat - zone_1.minLat)) * canvas.height * zoom + offsetY;
  return {x,y};
}


function difficulty(airport) {

  const medium_c = [ //database filteröintiä varten
      "Sweden",
      "Estonia",
      "Latvia",
      "Lithuania"
  ];

  const hard_c = [ //databaseen
      "Poland",
      "Germany"
  ];

  if (
      airport.icao === "EPKE" ||
      airport.icao === "EDDB" ||
      airport.icao.startsWith("ED") ||
      airport.icao.startsWith("EP")
  ) {
        return "hard";
  }

  if (
      airport.icao.startsWith("ES") ||
      airport.icao.startsWith("EV") ||
      airport.icao.startsWith("EY") ||
      airport.icao.startsWith("EV") ||
      airport.icao.startsWith("EG") ||
      airport.icao.startsWith("EN")
  ) {
    return "medium";
  }

 return "easy";
}

function tooClose(a, selected, minDistancekm = 500) {

  for (let s of selected) {

    const dx = a.lon - s.lon;
    const dy = a.lat - s.lat;

    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistancekm / 111) {
      return true;
    }
  }

  return false;
}



function createNodes(airports) {

  return airports.map((a, i) => {

    const { x, y } = projektio(a.lat, a.lon);

    return {
      id: i,
      x,
      y,
      airport: a,
      type: NODE_TYPES.COMBAT,
      difficulty: difficulty(a),
      discovered: false
    };
  });
}


function redraw() {

  ctx.drawImage(
      zone1map,
      offsetX,
      offsetY,
      canvas.width * zoom,
      canvas.height * zoom,
  );

  ctx.textAlign = "center";
  ctx.font = " 12px 'Press Start 2P'"



  for (let node of nodes) {

    let icon;

    if (node.type === NODE_TYPES.HOMEBASE) {
      icon = icons.homebase;
    }

    else if (node.type === NODE_TYPES.MINIBOSS) {
      icon = icons.miniboss;
    }

    else if (node.type === NODE_TYPES.FINALBOSS) {
      icon = icons.boss;
    }

    else {

      if (node.difficulty === "easy")
        icon = icons.easy;

      else if (node.difficulty === "medium")
        icon = icons.medium;

      else
        icon = icons.hard;
    }

    ctx.drawImage(
        icon,
        node.x - 16,
        node.y - 16,
        32,
        32
    );

    //nykyisen paikan väri

    if (node === currentNode) {

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (node.type === NODE_TYPES.HOMEBASE)
      ctx.fillStyle = "#4cc9ff";
    else if (node.type === NODE_TYPES.MINIBOSS)
      ctx.fillStyle = "#ff66ff";
    else if (node.type === NODE_TYPES.FINALBOSS)
      ctx.fillStyle = "#ff4444";
    else if (node.difficulty === "easy")
      ctx.fillStyle = "#8aff8a";
    else if (node.difficulty === "medium")
      ctx.fillStyle = "#ffd24d";

    else
      ctx.fillStyle = "#ff6666";

    ctx.shadowColor = "black";
    ctx.shadowBlur = 6;


    ctx.fillText(
        node.airport.name.toUpperCase(),
        node.x,
        node.y - 22
    );
    ctx.shadowBlur = 0;
  }
}

function openAirportPopup(node) {

  const popup =
      document.getElementById("airportPopup")

  popup.classList.remove("hidden")

  document.getElementById("popupName")
    .innerText = node.airport.name.toUpperCase();

//popupin tyyppi

    let typeText = "";

    if (node.type === NODE_TYPES.HOMEBASE)
      typeText = "HOMEBASE";
    else if (node.type === NODE_TYPES.MINIBOSS)
      typeText = "MINIBOSS";
    else if (node.type === NODE_TYPES.FINALBOSS)
      typeText = "FINAL BOSS";

  else
    typeText =
        `COMBAT - ${node.difficulty.toUpperCase()}`

  document.getElementById("popupType")
      .innerText = typeText;

  //ICAO

  document.getElementById("popupCoords")
      .innerText =
      `LAT ${node.airport.lat} I LON ${node.airport.lon}`;

  const primarybutton =
      document.getElementById("primaryButton");

  if (node.type === NODE_TYPES.HOMEBASE) {

    primarybutton.innerText = "OPEN SHOP";

    primarybutton.onclick = () => {

      console.log("OPEN SHOP")
      // TÄNNE VOI LISÄTÄ KAUPPA SCENEN
    };
  }

  else {

    primarybutton.innerText = "START COMBAT";

    primarybutton.onclick = () => {

      console.log(
          "START COMBAT",
          node.airport.name
      );

      // COMBAT SCENE TÄNNE
    }
  }



}







zone1map.onload = () => {

  //luodaan nodeja
  const count = getNodeCount();

  const randompool = airports.filter ( a =>
      a.icao !== "EPKE" &&
      a.icao !== "EDDB" &&
      a.icao !== "EFHK"
  );

  let middle = [];

  const shuffled = [...randompool]
      .sort(() => Math.random() - 0.5);

  for (let airport of shuffled) {

    if (middle.length >= count - 3)
      break;

    if (!tooClose(airport,middle)) {
      middle.push(airport);
    }
  }

  const helsinki = airports.find (a => a.icao === "EFHK");
  const berlin = airports.find (a => a.icao === "EDDB");
  const miniboss = airports.find (a => a.icao === "EPKE");

  const selected = [
      helsinki,
      berlin,
      miniboss,
      ...middle
  ]

  nodes = createNodes(selected);


  let helsinkiNode = nodes.find(n => n.airport.icao === "EFHK");

  helsinkiNode.type = NODE_TYPES.HOMEBASE;
  helsinkiNode.isHomeBase = true;

  currentNode = helsinkiNode;

  let minibossNode = nodes.find(n => n.airport.icao ==="EPKE");

  minibossNode.type = NODE_TYPES.MINIBOSS;

  let berlinNode = nodes.find(n => n.airport.icao ==="EDDB");

  berlinNode.type = NODE_TYPES.FINALBOSS;


  redraw();
};

canvas.addEventListener("click", (e) => {

  console.log("clicked")

  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const mx = (e.clientX - rect.left) * scaleX;
  const my = (e.clientY - rect.top) * scaleY;

  for (let node of nodes) {

    let d = Math.hypot(mx - node.x, my - node.y);

    console.log(node.airport.name, d);

    if (d < 30) {
      openAirportPopup(node);
      break;
    }
  }
});

document.getElementById("closePopup")
    .addEventListener("click",() => {

      document.getElementById("airportPopup")
          .classList.add("hidden");
});


console.log(projektio(59.65, 17.92));

