<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Simulador de unidad</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<style>
  :root {
    --ink: #1c2b26;
    --paper: #f4f6f2;
    --line: #d7ddd2;
    --accent: #1f6e4f;
    --accent-dim: #e4efe8;
  }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: var(--paper); color: var(--ink); }
  header { padding: 16px 20px; border-bottom: 1px solid var(--line); }
  header h1 { font-size: 18px; margin: 0 0 2px; font-weight: 700; }
  header span { font-size: 13px; color: #6b756f; }
  .panel { padding: 16px 20px; }
  label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: #6b756f; display: block; margin-bottom: 4px; }
  select, input {
    font: inherit; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--line);
    background: white; width: 100%; margin-bottom: 12px;
  }
  .row { display: flex; gap: 12px; }
  .row > div { flex: 1; }
  button {
    font: inherit; padding: 12px; border-radius: 8px; border: none; cursor: pointer;
    background: var(--accent); color: white; width: 100%; font-weight: 700;
  }
  button.stop { background: #a5423a; }
  button:disabled { background: #b7c2bc; cursor: not-allowed; }
  #map { height: 40vh; width: 100%; }
  #status {
    margin-top: 12px; font-size: 13px; color: #6b756f; background: white;
    border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px;
  }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; background: #999; margin-right: 6px; }
  .dot.live { background: #4ade80; }
</style>
</head>
<body>

<header>
  <h1>Simulador de unidad</h1>
  <span>Mueve una unidad por la ruta automáticamente, sin GPS real ni salir a la calle</span>
</header>

<div class="panel">
  <label for="routeSelect">Ruta</label>
  <select id="routeSelect"></select>

  <div class="row">
    <div>
      <label for="unitId">ID de la unidad</label>
      <input id="unitId" type="number" value="1" min="1" />
    </div>
    <div>
      <label for="speed">Velocidad simulada (km/h)</label>
      <input id="speed" type="number" value="30" min="5" />
    </div>
  </div>

  <button id="toggleBtn">Iniciar simulación</button>
  <div id="status"><span class="dot" id="dot"></span>Detenido</div>
</div>

<div id="map"></div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<script>
const map = L.map('map').setView([32.52, -117.02], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);

let currentStops = [];
let simMarker = null;
let running = false;
let segmentIndex = 0;
let segmentProgress = 0; // 0 a 1 dentro del tramo actual
let tickHandle = null;

const TICK_MS = 1000; // se mueve y manda ubicacion cada segundo

async function loadRoutes() {
  const res = await fetch('/api/routes');
  const routes = await res.json();
  const select = document.getElementById('routeSelect');
  select.innerHTML = routes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  select.addEventListener('change', () => loadStops(select.value));
  if (routes.length) loadStops(routes[0].id);
}

async function loadStops(routeId) {
  stopSimulation();
  const res = await fetch(`/api/routes/${routeId}/stops`);
  currentStops = await res.json();

  map.eachLayer(layer => { if (layer instanceof L.CircleMarker) map.removeLayer(layer); });
  currentStops.forEach(stop => {
    L.circleMarker([stop.lat, stop.lng], { radius: 6, color: '#1f6e4f' }).addTo(map).bindPopup(stop.name);
  });
  if (currentStops.length) {
    map.fitBounds(currentStops.map(s => [s.lat, s.lng]), { padding: [30, 30] });
  }
  segmentIndex = 0;
  segmentProgress = 0;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function lerp(a, b, t) { return a + (b - a) * t; }

async function tick() {
  if (segmentIndex >= currentStops.length - 1) {
    document.getElementById('status').innerHTML = '<span class="dot live"></span>Llegó al final de la ruta';
    stopSimulation();
    return;
  }

  const from = currentStops[segmentIndex];
  const to = currentStops[segmentIndex + 1];
  const speedKmh = Number(document.getElementById('speed').value) || 30;
  const segmentKm = distanceKm(from.lat, from.lng, to.lat, to.lng);
  const segmentSeconds = Math.max((segmentKm / speedKmh) * 3600, 1);
  const step = (TICK_MS / 1000) / segmentSeconds;

  segmentProgress += step;
  if (segmentProgress >= 1) {
    segmentProgress = 0;
    segmentIndex += 1;
  }

  const activeFrom = currentStops[segmentIndex];
  const activeTo = currentStops[Math.min(segmentIndex + 1, currentStops.length - 1)];
  const lat = lerp(activeFrom.lat, activeTo.lat, segmentProgress);
  const lng = lerp(activeFrom.lng, activeTo.lng, segmentProgress);

  if (simMarker) {
    simMarker.setLatLng([lat, lng]);
  } else {
    simMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: '', html: '<div style="background:#2f6fed;width:14px;height:14px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 1px #2f6fed"></div>' })
    }).addTo(map);
  }

  const unitId = document.getElementById('unitId').value;
  const routeId = document.getElementById('routeSelect').value;
  try {
    await fetch(`/api/units/${unitId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, routeId })
    });
    document.getElementById('status').innerHTML =
      `<span class="dot live"></span>Enviando: ${lat.toFixed(5)}, ${lng.toFixed(5)} · entre "${activeFrom.name}" y "${activeTo.name}"`;
  } catch (e) {
    document.getElementById('status').textContent = 'No se pudo enviar la ubicación al servidor';
  }
}

function startSimulation() {
  if (!currentStops.length) { alert('Esta ruta no tiene paradas cargadas'); return; }
  running = true;
  const btn = document.getElementById('toggleBtn');
  btn.textContent = 'Detener simulación';
  btn.classList.add('stop');
  tickHandle = setInterval(tick, TICK_MS);
  tick();
}

function stopSimulation() {
  running = false;
  clearInterval(tickHandle);
  const btn = document.getElementById('toggleBtn');
  btn.textContent = 'Iniciar simulación';
  btn.classList.remove('stop');
  document.getElementById('dot').classList.remove('live');
}

document.getElementById('toggleBtn').addEventListener('click', () => {
  if (running) stopSimulation(); else startSimulation();
});

loadRoutes();
</script>
</body>
</html>
