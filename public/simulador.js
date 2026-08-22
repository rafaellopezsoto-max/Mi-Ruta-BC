// simulador.js - Script de Node.js para emular GPS en tiempo real

const SERVER_URL = 'http://localhost:3000'; // O la URL de tu servidor en Render
const UPDATE_INTERVAL_MS = 3000;

const SIMULATED_ROUTES = {
  1: {
    unitId: 1,
    routeId: 1,
    waypoints: [
      { lat: 32.5149, lng: -117.0382 },
      { lat: 32.5100, lng: -117.0350 },
      { lat: 32.5020, lng: -117.0300 },
      { lat: 32.4950, lng: -117.0250 },
      { lat: 32.4880, lng: -117.0200 },
      { lat: 32.4800, lng: -117.0150 }
    ]
  },
  2: {
    unitId: 2,
    routeId: 2,
    waypoints: [
      { lat: 32.3650, lng: -117.0550 },
      { lat: 32.3600, lng: -117.0520 },
      { lat: 32.3550, lng: -117.0500 },
      { lat: 32.3500, lng: -117.0480 },
      { lat: 32.3450, lng: -117.0450 }
    ]
  }
};

const state = {
  1: { currentIndex: 0, direction: 1 },
  2: { currentIndex: 0, direction: 1 }
};

async function sendLocation(unitId, routeId, lat, lng) {
  try {
    const response = await fetch(`${SERVER_URL}/api/units/${unitId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng, routeId })
    });

    if (response.ok) {
      console.log(`[Unidad ${unitId}] GPS enviado -> Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)} (Ruta ${routeId})`);
    } else {
      console.error(`[Unidad ${unitId}] Error del servidor: ${response.status}`);
    }
  } catch (err) {
    console.error(`[Unidad ${unitId}] Error de conexión:`, err.message);
  }
}

function tickUnit(unitId) {
  const sim = SIMULATED_ROUTES[unitId];
  const unitState = state[unitId];
  const currentPoint = sim.waypoints[unitState.currentIndex];

  sendLocation(sim.unitId, sim.routeId, currentPoint.lat, currentPoint.lng);

  unitState.currentIndex += unitState.direction;

  if (unitState.currentIndex >= sim.waypoints.length) {
    unitState.direction = -1;
    unitState.currentIndex = sim.waypoints.length - 2;
  } else if (unitState.currentIndex < 0) {
    unitState.direction = 1;
    unitState.currentIndex = 1;
  }
}

function startSimulation() {
  console.log('🚀 Iniciando simulador de GPS...');
  Object.keys(SIMULATED_ROUTES).forEach((unitId) => {
    tickUnit(unitId);
    setInterval(() => tickUnit(unitId), UPDATE_INTERVAL_MS);
  });
}

startSimulation();
