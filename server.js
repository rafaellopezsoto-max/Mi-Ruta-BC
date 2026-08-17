// server.js
// API REST + WebSocket para rastreo de transporte publico en tiempo real.

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');
const { estimateEta, nearestStop } = require('./geo');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Candado del panel de administracion ----------
function requireAdminAuth(req, res, next) {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) {
    return res.status(500).send('Panel no configurado: falta ADMIN_USER/ADMIN_PASS en las variables de entorno.');
  }
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) {
    res.set('WWW-Authenticate', 'Basic realm="Mi Ruta Admin"');
    return res.status(401).send('Autenticación requerida');
  }
  const decoded = Buffer.from(encoded, 'base64').toString('utf8');
  const sep = decoded.indexOf(':');
  const reqUser = decoded.slice(0, sep);
  const reqPass = decoded.slice(sep + 1);
  if (reqUser === user && reqPass === pass) return next();
  res.set('WWW-Authenticate', 'Basic realm="Mi Ruta Admin"');
  return res.status(401).send('Credenciales incorrectas');
}

app.get('/admin.html', requireAdminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.redirect('/pasajero.html');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const lastPosition = {};
const lastKnownRoute = {};

// ---------- Rutas y paradas ----------

app.get('/api/routes', (req, res) => {
  const routes = db
    .prepare('SELECT id, name, description, color, vehicle_label, fares_json FROM routes')
    .all()
    .map(r => ({ ...r, fares: JSON.parse(r.fares_json || '[]') }));
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
    if (destSeq <= originSeq) continue;

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

// ---------- Analitica propia (sin terceros, sin datos personales) ----------

app.post('/api/events', (req, res) => {
  const { type, view, routeId, unitId, sessionId } = req.body;
  if (!type) {
    return res.status(400).json({ error: 'type es requerido' });
  }
  db.prepare(
    'INSERT INTO events (event_type, view, route_id, unit_id, session_id) VALUES (?, ?, ?, ?, ?)'
  ).run(type, view || null, routeId ? Number(routeId) : null, unitId ? Number(unitId) : null, sessionId || null);
  res.json({ ok: true });
});

app.get('/api/stats/summary', requireAdminAuth, (req, res) => {
  const totalsByType = db
    .prepare('SELECT event_type, COUNT(*) AS count FROM events GROUP BY event_type ORDER BY count DESC')
    .all();

  const pageViewsByView = db
    .prepare(`SELECT view, COUNT(*) AS count FROM events WHERE event_type = 'page_view' GROUP BY view`)
    .all();

  const uniqueSessions = db
    .prepare('SELECT COUNT(DISTINCT session_id) AS count FROM events WHERE session_id IS NOT NULL')
    .get().count;

  const routePopularity = db
    .prepare(
      `SELECT r.name AS route_name, COUNT(*) AS count
       FROM events e JOIN routes r ON r.id = e.route_id
       WHERE e.event_type = 'route_selected'
       GROUP BY e.route_id ORDER BY count DESC`
    )
    .all();

  const boardings = db.prepare(`SELECT COUNT(*) AS count FROM events WHERE event_type = 'unit_boarded'`).get().count;
  const gpsUsed = db.prepare(`SELECT COUNT(*) AS count FROM events WHERE event_type = 'gps_located'`).get().count;

  const recentEvents = db
    .prepare('SELECT event_type, view, route_id, unit_id, created_at FROM events ORDER BY id DESC LIMIT 30')
    .all();

  res.json({ totalsByType, pageViewsByView, uniqueSessions, routePopularity, boardings, gpsUsed, recentEvents });
});

// ---------- Buscar direccion (disponible pero no usado por pasajero.html) ----------

app.get('/api/geocode', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) {
    return res.status(400).json({ error: 'Falta la direccion a buscar (parametro q)' });
  }
  try {
    const params = new URLSearchParams({
      format: 'json',
      q,
      countrycodes: 'mx',
      viewbox: '-117.10,32.30,-116.90,32.56',
      bounded: '1',
      limit: '5',
    });
    const nominatimRes = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        'User-Agent': 'MiRutaBC/1.0 (proyecto escolar de transporte publico, Rosarito BC)',
      },
    });
    if (!nominatimRes.ok) {
      return res.status(502).json({ error: 'No se pudo consultar el geocodificador' });
    }
    const results = await nominatimRes.json();
    res.json(
      results.map(r => ({
        displayName: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      }))
    );
  } catch (err) {
    console.error('Error de geocodificacion:', err);
    res.status(500).json({ error: 'Error interno al buscar la direccion' });
  }
});

// ---------- Unidades activas, chofer y ubicacion en tiempo real ----------

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

  const routesById = {};
  db.prepare('SELECT id, name FROM routes').all().forEach(r => { routesById[r.id] = r.name; });

  const withPosition = assignments.map((a) => {
    const liveRouteId = lastKnownRoute[a.unit_id] || a.route_id;
    return {
      ...a,
      route_id: liveRouteId,
      route_name: routesById[liveRouteId] || a.route_name,
      position: lastPosition[a.unit_id] || null,
    };
  });
  res.json(withPosition);
});

app.post('/api/units/:unitId/location', (req, res) => {
  const unitId = Number(req.params.unitId);
  const { lat, lng, routeId } = req.body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat y lng son requeridos como numeros' });
  }

  lastPosition[unitId] = { lat, lng, updatedAt: new Date().toISOString() };
  db.prepare('INSERT INTO locations (unit_id, lat, lng) VALUES (?, ?, ?)').run(unitId, lat, lng);

  let activeRouteId = routeId ? Number(routeId) : null;
  if (!activeRouteId) {
    const assignment = db
      .prepare('SELECT route_id FROM assignments WHERE unit_id = ? AND active = 1')
      .get(unitId);
    activeRouteId = assignment ? assignment.route_id : null;
  } else {
    lastKnownRoute[unitId] = activeRouteId;
  }

  if (activeRouteId) {
    io.to(`route-${activeRouteId}`).emit('location_update', {
      unitId,
      lat,
      lng,
      routeId: activeRouteId,
      updatedAt: lastPosition[unitId].updatedAt,
    });
  }

  res.json({ ok: true, routeId: activeRouteId });
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
  console.log(`Mi Ruta+ corriendo en http://localhost:${PORT}`);
  console.log(`Vista pasajero: http://localhost:${PORT}/pasajero.html`);
  console.log(`Vista chofer:   http://localhost:${PORT}/chofer.html`);
});
