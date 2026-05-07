
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d")
let nodes = [];
let currentNode = null;


//hardcoded lentokentät aluksi
const airports = [
    // FINLAND
  { name: "Helsinki", icao: "EFHK", lat: 60.32, lon: 24.96 },
  { name: "Oulu", icao: "EFOU", lat: 64.93, lon: 25.35 },
  { name: "Rovaniemi", icao: "EFRO", lat: 66.56, lon: 25.83 },

  // ESTONIA / BALTICS
  { name: "Tallinn", icao: "EETN", lat: 59.41, lon: 24.83 },
  { name: "Riga", icao: "EVRA", lat: 56.92, lon: 23.97 },
  { name: "Vilnius", icao: "EYVI", lat: 54.63, lon: 25.28 },

  // SWEDEN
  { name: "Stockholm", icao: "ESSA", lat: 59.65, lon: 17.92 },
  { name: "Gothenburg", icao: "ESGG", lat: 57.66, lon: 12.29 },
  { name: "Malmo", icao: "ESMS", lat: 55.54, lon: 13.37 },

  // NORWAY
  { name: "Oslo", icao: "ENGM", lat: 60.19, lon: 11.1 },
  { name: "Bergen", icao: "ENBR", lat: 60.29, lon: 5.22 },
  { name: "Tromso", icao: "ENTC", lat: 69.68, lon: 18.92 },

  // DENMARK
  { name: "Copenhagen", icao: "EKCH", lat: 55.62, lon: 12.65 },

  // POLAND
  { name: "Warsaw", icao: "EPWA", lat: 52.17, lon: 20.97 },
  { name: "Gdansk", icao: "EPGD", lat: 54.38, lon: 18.47 },
  { name: "Wolfsschanze", icao: "EPKE", lat: 54.05, lon: 21.43 },

  // GERMANY
  { name: "Berlin - Fuhrerbunker", icao: "EDDB", lat: 52.36, lon: 13.5 },
  { name: "Hamburg", icao: "EDDH", lat: 53.63, lon: 9.99 },
  { name: "Frankfurt", icao: "EDDF", lat: 50.03, lon: 8.57 },
  { name: "Munich", icao: "EDDM", lat: 48.35, lon: 11.79 }
];

const zone1map = new Image();
zone1map.src = '/frontend/static/assets/backgrounds/ww2map.png';


// kuvan longitude ja langitude määritetty, erikseen per zone
const zone_1 = {
  minLat: 31,
  maxLat: 72,
  minLon: -24,
  maxLon: 60
};

const NODE_TYPES = {
  HOMEBASE : "HomeBase",
  COMBAT : "Combat",
  SHOP : "Shop",
  MINIBOSS : "MiniBoss",
  FINALBOSS : "FinalBoss"
};

function getNodeCount() {
  return Math.floor(Math.random() * 6) + 10; // antaa nodejen määrän kartalle 10-15
}




function takeAirports (airports, count) {
  return airports
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
}


function projektio(lat,lon) {
  const x = (lon - zone_1.minLon ) / (zone_1.maxLon - zone_1.minLon) * canvas.width;
  const y = (zone_1.maxLat - lat) / (zone_1.maxLat - zone_1.minLat) * canvas.height;
  return {x,y};
}


function difficulty(airport) {


  const medium_c = [
      "Sweden",
      "Estonia",
      "Latvia",
      "Lithuania"
  ];

  const hard_c = [
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

  ctx.drawImage(zone1map, 0, 0, canvas.width, canvas.height);


  for(let node of nodes) {
      //värit eri nodeille
    if (node.type === NODE_TYPES.HOMEBASE) {
      ctx.fillStyle = "cyan";
    }

    else if (node.type === NODE_TYPES.MINIBOSS) {
      ctx.fillStyle = "magenta";
    }

    else if (node.type === NODE_TYPES.FINALBOSS) {
      ctx.fillStyle = "darkred";
    }

    else {

      if (node.difficulty === "easy")
        ctx.fillStyle = "lime";

      else if (node.difficulty === "medium")
        ctx.fillStyle = "orange";

      else
        ctx.fillStyle = "red";
    }


  //piirretään eri pallot
    ctx.beginPath();
    ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
    ctx.fill();

    //nykyisen paikan väri
    if (node === currentNode ) {

      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    let label = `${node.airport.name} (${node.airport.icao})`;

  if (node.type === NODE_TYPES.HOMEBASE)
    label += " [HOMEBASE / SHOP]";

  if (node.type === NODE_TYPES.MINIBOSS)
    label += " [MINIBOSS]";

  if (node.type === NODE_TYPES.FINALBOSS)
    label += " [FINALBOSS]";

    ctx.fillStyle = "white";

    ctx.fillText(
        label,
        node.x + 8,
        node.y
    );
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

  const middle = takeAirports(randompool, count -3);

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

  const rect = canvas.getBoundingClientRect();

  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for (let node of nodes) {
    let d = Math.hypot(mx - node.x, my - node.y);

    if (d < 8) {
      currentNode = node;

      node.discovered = true;

      redraw();

      break;
    }
  }
});




console.log(projektio(59.65, 17.92));

