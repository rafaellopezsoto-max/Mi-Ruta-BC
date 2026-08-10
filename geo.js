// geo.js
// Calculos de distancia (formula de Haversine) y estimacion de tiempo de llegada.

const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

// Velocidad promedio urbana por defecto si aun no tenemos suficientes
// datos historicos del vehiculo (ajusta segun tu ciudad).
const DEFAULT_SPEED_KMH = 18;

// Dado un punto (unidad) y un punto destino (parada), regresa distancia
// en km y minutos estimados de llegada.
function estimateEta(unitLat, unitLng, targetLat, targetLng, speedKmh = DEFAULT_SPEED_KMH) {
  const distanceKm = haversineKm(unitLat, unitLng, targetLat, targetLng);
  const minutes = (distanceKm / speedKmh) * 60;
  return { distanceKm: Number(distanceKm.toFixed(2)), etaMinutes: Math.round(minutes) };
}

// Encuentra la parada mas cercana a un punto dado (para "estoy aqui, cual
// es mi parada" y para el buscador de rutas).
function nearestStop(lat, lng, stops) {
  let best = null;
  let bestDist = Infinity;
  for (const stop of stops) {
    const d = haversineKm(lat, lng, stop.lat, stop.lng);
    if (d < bestDist) {
      bestDist = d;
      best = stop;
    }
  }
  return { stop: best, distanceKm: Number(bestDist.toFixed(2)) };
}

module.exports = { haversineKm, estimateEta, nearestStop, DEFAULT_SPEED_KMH };
