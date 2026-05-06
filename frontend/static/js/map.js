
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d")
let nodes = [];
let currentNode = null;


//hardcoded lentokentät aluksi
const airports = [
  { name: "Helsinki", icao: "EFHK", lat: 60.32, lon: 24.96 },
  { name: "Stockholm", icao: "ESSA", lat: 59.65, lon: 17.92 },
  { name: "Oslo", icao: "ENGM", lat: 60.19, lon: 11.1 },
  { name: "Copenhagen", icao: "EKCH", lat: 55.92, lon: 12.65 },
  { name: "Riga", icao: "EVRA", lat: 56.92, lon: 23.97 },
  { name: "Tallinn", icao: "EETN", lat: 59.41, lon: 24.83 },
  { name: "Bergen", icao: "ENBR", lat: 60.29, lon: 5.22 },
  { name: "Tromso", icao: "ENTC", lat: 69.68, lon: 18.92 },
  { name: "Oulu", icao: "EFOU", lat: 64.93, lon: 25.35 }
];

const zone1map = new Image();
zone1map.src = '/frontend/static/assets/backgrounds/zone1map.jpg';


// kuvan longitude ja langitude määritetty, erikseen per zone
const zone_1 = {
  minLat: 55.7,
  maxLat: 72,
  minLon: -2.5,
  maxLon: 42.5
};

const NODE_TYPES = {
  START : "Start",
  EXIT : "Exit",
  COMBAT : "Combat",
  SHOP : "Shop"
};

function getNodeCount() {
  return Math.floor(Math.random() * 6) + 10; // antaa nodejen määrän kartalle 10-15
}


function drawConnections(nodes) {
  ctx.strokeStyle = "white";

  for (let node of nodes) {
    for (let id of node.connections) {
      let target = nodes.find(n => n.id === id);

      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
    }
  }
}

function takeAirports (airports, count) {
  return airports
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
}


 function FilterAirportsZone(airports, zone){
  return airports.filter (a =>
  a.lat >= zone.minLat &&
  a.lat <= zone.maxLat &&
  a.lon >= zone.minLon &&
  a.lon <= zone.maxLon
  );
}


function projektio(lat,lon) {
  const x = (lon - zone_1.minLon ) / (zone_1.maxLon - zone_1.minLon) * canvas.width;
  const y = (zone_1.maxLat - lat) / (zone_1.maxLat - zone_1.minLat) * canvas.height;
  return {x,y};
}

function createNodes(airports) {
  return airports.map((a, i) => {
    const {x, y} = projektio(a.lat, a.lon);

    return {
      id: i,
      x,
      y,
      airport: a,
      type: NODE_TYPES.COMBAT,
      difficulty: "easy",
      connections: [],
      discovered: false
    };
  });
}

function distance (a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function connectNodes(nodes) {
  for (let node of nodes) {
    let candidates = nodes.filter(n => n.x < node.x) // Oikealta vasemmalle liikkuminen

    let neighbors = candidates
        .sort((a, b) => distance(node, a) - distance(node,b))
        .slice(0, 2);

    node.connections = neighbors.map(n => n.id);
  }
}

function redraw() {
  ctx.drawImage(zone1map, 0, 0, canvas.width, canvas.height);

  drawConnections(nodes);

  for(let node of nodes) {
    if (node === currentNode) ctx.fillStyle = "yellow";
    else if (currentNode.connections.includes(node.id)) ctx.fillStyle = "white";
    else ctx.fillStyle = "red";

    if (node.type === "Start") ctx.fillStyle = "green";
    if (node.type === "Exit") ctx.fillStyle = "purple";

    ctx.beginPath();
    ctx.arc(node.x, node.y, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(
        `${node.airport.name} (${node.airport.icao})`,
        node.x + 8,
        node.y
    );
  }

}



zone1map.onload = () => {

  //luodaan nodeja
  const count = getNodeCount();
  const selected = takeAirports(airports, count)

  nodes = createNodes(selected);

  //oikealta vasemmalle polku
  nodes.sort((a, b) => b.x - a.x);
  connectNodes(nodes);


  //hardcoded aloitus helsingistä
  let startNode = nodes.find(n => n.airport.icao === "EFHK")
  if (!startNode) startNode = nodes[0];


  startNode.type = NODE_TYPES.START;
  startNode.discovered = true;
  currentNode = startNode;

  //exit node
  let exitNode = nodes[nodes.length -1];
  exitNode.type = NODE_TYPES.EXIT;

  redraw();
};

canvas.addEventListener("click", (e) => {
  if (!currentNode) return;

  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  for(let node of nodes) {
    let d = Math.hypot(mx - node.x, my - node.y);

    if (d < 8) {
      if(currentNode.connections.includes(node.id))
        currentNode = node;
        redraw();
    }
  }
});




console.log(projektio(59.65, 17.92));

