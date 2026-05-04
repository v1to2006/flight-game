
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d")

//hardcoded lentokentät aluksi
const airports = [
  { name: "stockholm", lat: 59.3, lon: 18},
  {name: "helsinki", lat: 60.32, lon: 24.96},
];

const zone1map = new Image();
zone1map.src = '/frontend/static/assets/backgrounds/zone1map.jpg';


// kuvan longitude ja langitude määritetty, erikseen per zone
const zone_1 = {
  minLat: 55.5,
  maxLat: 72,
  minLon: 0,
  maxLon: 40
};

 function FilterAirportsZone(airports, zone){
  return airports.filter (a =>
  a.lat >= zone.minLat &&
  a.lat <= zone.maxLat &&
  a.lon >= zone.minLon &&
  a.lon <= zone.maxLon
  );
}

const minLat = 35;
const maxLat = 70;
const minLon = -10;
const maxLon = 40;

function projektio(lat,lon) {
  const x = (lon - zone_1.minLon ) / (zone_1.maxLon - zone_1.minLon) * canvas.width;
  const y = (zone_1.maxLat - lat) / (zone_1.maxLat - zone_1.minLat) * canvas.height;
  return {x,y};
}

zone1map.onload = () => {
  ctx.drawImage(zone1map, 0, 0, canvas.width, canvas.height);

  for (let a of airports) {
    const {x, y} = projektio(a.lat, a.lon);

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(x,y,5,0, Math.PI * 2);
    ctx.fill();

    ctx.fillText(a.name, x + 6, y)
}
}

console.log(projektio(59.65, 17.92));

