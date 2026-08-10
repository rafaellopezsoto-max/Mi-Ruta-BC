// db.js
// Base de datos SQLite embebida. Para produccion real conviene migrar a
// PostgreSQL + PostGIS, pero SQLite es perfecto para arrancar sin
// infraestructura extra.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'transporte.db'));
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL
);

-- Orden de paradas dentro de cada ruta
CREATE TABLE IF NOT EXISTS route_stops (
  route_id INTEGER NOT NULL,
  stop_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  PRIMARY KEY (route_id, stop_id),
  FOREIGN KEY (route_id) REFERENCES routes(id),
  FOREIGN KEY (stop_id) REFERENCES stops(id)
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plate TEXT NOT NULL,
  capacity INTEGER DEFAULT 30
);

-- Que chofer y que unidad estan operando que ruta AHORA MISMO
CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  driver_id INTEGER NOT NULL,
  route_id INTEGER NOT NULL,
  active INTEGER DEFAULT 1,
  started_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id),
  FOREIGN KEY (route_id) REFERENCES routes(id)
);

-- Historial de posiciones GPS (util para calcular velocidad promedio y ETA)
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unit_id INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  recorded_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (unit_id) REFERENCES units(id)
);
`);

// --- Sembrado automático desde datos.js ---
// Todo lo que ves en pantalla sale de un solo lugar: datos.js.
// Si la base de datos ya tiene rutas cargadas, no vuelve a insertar nada
// (así puedes reiniciar el servidor sin duplicar información). Para
// cargar datos.js de nuevo tras editarlo, borra transporte.db y reinicia.
const routeCount = db.prepare('SELECT COUNT(*) AS c FROM routes').get().c;
if (routeCount === 0) {
  const datos = require('./datos');

  const insertRoute = db.prepare('INSERT INTO routes (name, description) VALUES (?, ?)');
  const insertStop = db.prepare('INSERT INTO stops (name, lat, lng) VALUES (?, ?, ?)');
  const linkStop = db.prepare('INSERT INTO route_stops (route_id, stop_id, sequence) VALUES (?, ?, ?)');
  const insertDriver = db.prepare('INSERT INTO drivers (name, phone) VALUES (?, ?)');
  const insertUnit = db.prepare('INSERT INTO units (plate, capacity) VALUES (?, ?)');
  const insertAssignment = db.prepare('INSERT INTO assignments (unit_id, driver_id, route_id) VALUES (?, ?, ?)');

  const routeIdByName = {};
  for (const route of datos.routes || []) {
    const routeId = insertRoute.run(route.name, route.description || '').lastInsertRowid;
    routeIdByName[route.name] = routeId;
    (route.stops || []).forEach((stop, i) => {
      const stopId = insertStop.run(stop.name, stop.lat, stop.lng).lastInsertRowid;
      linkStop.run(routeId, stopId, i + 1);
    });
  }

  const driverIdByName = {};
  for (const driver of datos.drivers || []) {
    driverIdByName[driver.name] = insertDriver.run(driver.name, driver.phone || '').lastInsertRowid;
  }

  const unitIdByPlate = {};
  for (const unit of datos.units || []) {
    unitIdByPlate[unit.plate] = insertUnit.run(unit.plate, unit.capacity || 30).lastInsertRowid;
  }

  for (const a of datos.assignments || []) {
    const unitId = unitIdByPlate[a.unitPlate];
    const driverId = driverIdByName[a.driverName];
    const routeId = routeIdByName[a.routeName];
    if (!unitId || !driverId || !routeId) {
      console.warn(`Aviso: revisa datos.js, no encontré unidad/chofer/ruta para la asignación: ${JSON.stringify(a)}`);
      continue;
    }
    insertAssignment.run(unitId, driverId, routeId);
  }

  console.log(`Datos cargados desde datos.js: ${datos.routes?.length || 0} rutas, ${datos.units?.length || 0} unidades, ${datos.drivers?.length || 0} choferes.`);
}

module.exports = db;
