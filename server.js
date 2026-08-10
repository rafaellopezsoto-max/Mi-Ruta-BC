// server.js
// API REST + WebSocket para rastreo de transporte publico en tiempo real.

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const db = require('./db');
const { estimateEta, nearestStop } = require('./geo');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Si alguien entra a la direccion raiz, mandalo directo a la vista del pasajero
app.get('/', (req, res) => {
  res.redirect('/pasajero.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Ultima posicion conocida de cada unidad, en memoria (rapido de leer).
// La tabla `locations` en SQLite guarda el historial completo.
const lastPosition = {}; // unitId -> { lat, lng, updatedAt }

// ---------- Rutas y paradas ----------

app.get('/api/routes', (req, res) => {
  const routes = db.prepare('SELECT id, name, description FROM routes').all();
  res.json(routes);
});

app.get('/api/routes/:id/stops', (req, res) => {
  const stops = db
    .prepare(
      `SELECT s.id, s.name, s.lat, s.lng, rs.sequence
       FROM route_stops rs JOIN stops s ON s.id = rs.stop_id
       WHERE rs.route_id = ? ORDER BY rs.sequence`
    )
    .all(req.params.id);
  res.json(stops);
});

// "Voy de aqui a alla, ¿cual ruta tomo y cuanto tarda?"
// Estrategia simple para el MVP: para cada ruta, busca la parada mas
// cercana al origen y la mas cercana al destino. Si el destino aparece
// DESPUES del origen en la secuencia de la ruta, es una ruta valida.
// El tiempo total se estima sumando distancias entre paradas intermedias.
app.post('/api/routes/find', (req, res) => {
  const { origin, destination } = req.body;
  if (!origin || !destination) {
    return res.status(400).json({ error: 'Se requiere origin y destination con lat/lng' });
  }

  const routes = db.prepare('SELECT id, name FROM routes').all();
  const results = [];

  for (const route of routes) {
    const stops = db
      .prepare(
        `SELECT s.id, s.name, s.lat, s.lng, rs.sequence
         FROM route_stops rs JOIN stops s ON s.id = rs.stop_id
         WHERE rs.route_id = ? ORDER BY rs.sequence`
      )
      .all(route.id);
    if (stops.length < 2) continue;

    const originNear = nearestStop(origin.lat, origin.lng, stops);
    const destNear = nearestStop(destination.lat, destination.lng, stops);

    const originSeq = stops.find((s) => s.id === originNear.stop.id).sequence;
    const destSeq = stops.find((s) => s.id === destNear.stop.id).sequence;
    if (destSeq <= originSeq) continue; // el destino queda "detras" en esta ruta

    // Suma la distancia tramo por tramo entre la parada de origen y la de destino
    const segment = stops.filter((s) => s.sequence >= originSeq && s.sequence <= destSeq);
    let travelMinutes = 0;
    for (let i = 0; i < segment.length - 1; i++) {
      const { etaMinutes } = estimateEta(
        segment[i].lat, segment[i].lng,
        segment[i + 1].lat, segment[i + 1].lng
      );
      travelMinutes += etaMinutes;
    }

    results.push({
      routeId: route.id,
      routeName: route.name,
      boardAt: originNear.stop.name,
      alightAt: destNear.stop.name,
      walkToBoardKm: originNear.distanceKm,
      walkFromAlightKm: destNear.distanceKm,
      estimatedTravelMinutes: travelMinutes,
    });
  }

  results.sort((a, b) => a.estimatedTravelMinutes - b.estimatedTravelMinutes);
  res.json(results);
});

// ---------- Unidades activas, chofer y ubicacion en tiempo real ----------

// Unidades actualmente en servicio, con su chofer y su ultima posicion
app.get('/api/units/active', (req, res) => {
  const assignments = db
    .prepare(
      `SELECT a.id AS assignment_id, u.id AS unit_id, u.plate, d.name AS driver_name,
              r.id AS route_id, r.name AS route_name
       FROM assignments a
       JOIN units u ON u.id = a.unit_id
       JOIN drivers d ON d.id = a.driver_id
       JOIN routes r ON r.id = a.route_id
       WHERE a.active = 1`
    )
    .all();

  const withPosition = assignments.map((a) => ({
    ...a,
    position: lastPosition[a.unit_id] || null,
  }));
  res.json(withPosition);
});

// El chofer (o su telefono) manda su posicion aqui cada pocos segundos.
app.post('/api/units/:unitId/location', (req, res) => {
  const unitId = Number(req.params.unitId);
  const { lat, lng } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat y lng son requeridos como numeros' });
  }

  lastPosition[unitId] = { lat, lng, updatedAt: new Date().toISOString() };
  db.prepare('INSERT INTO locations (unit_id, lat, lng) VALUES (?, ?, ?)').run(unitId, lat, lng);

  // Encuentra la ruta de esta unidad para avisar solo a quien le interesa
  const assignment = db
    .prepare('SELECT route_id FROM assignments WHERE unit_id = ? AND active = 1')
    .get(unitId);

  if (assignment) {
    io.to(`route-${assignment.route_id}`).emit('location_update', {
      unitId,
      lat,
      lng,
      updatedAt: lastPosition[unitId].updatedAt,
    });
  }

  res.json({ ok: true });
});

// ---------- WebSocket: el pasajero se suscribe a una ruta ----------

io.on('connection', (socket) => {
  socket.on('subscribe_route', (routeId) => {
    socket.join(`route-${routeId}`);
  });
  socket.on('unsubscribe_route', (routeId) => {
    socket.leave(`route-${routeId}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Vista pasajero: http://localhost:${PORT}/pasajero.html`);
  console.log(`Vista chofer:   http://localhost:${PORT}/chofer.html`);
});
