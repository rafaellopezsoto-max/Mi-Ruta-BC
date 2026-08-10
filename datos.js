// datos.js
//
// ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS EDITAR.
// Reemplaza el contenido de ejemplo con las rutas, paradas, choferes y
// unidades reales de tu ciudad. El servidor lee este archivo al arrancar
// y llena la base de datos automáticamente.
//
// Cómo conseguir las coordenadas (lat, lng) de cada parada:
//   1. Abre Google Maps.
//   2. Mantén presionado el punto exacto de la parada.
//   3. Aparecen las coordenadas arriba (ej. 32.5283, -117.0187) — cópialas.
//
// Después de editar este archivo, borra la base de datos vieja para que
// se vuelva a crear con tus datos nuevos:
//   rm transporte.db transporte.db-wal transporte.db-shm
//   npm start

module.exports = {

  // ----- RUTAS -----
  // Cada ruta es una lista de paradas EN ORDEN, del inicio al final del recorrido.
  routes: [
    {
      name: 'Ruta 1 - Centro',
      description: 'Centro -> Terminal',
      stops: [
        { name: 'Parada Centro',    lat: 32.5283, lng: -117.0187 },
        { name: 'Parada Hospital',  lat: 32.5210, lng: -117.0250 },
        { name: 'Parada Mercado',   lat: 32.5150, lng: -117.0310 },
        { name: 'Parada Terminal',  lat: 32.5080, lng: -117.0400 },
      ],
    },
    // Copia y pega este bloque para agregar otra ruta:
    // {
    //   name: 'Ruta 2 - Norte',
    //   description: 'Norte -> Centro',
    //   stops: [
    //     { name: 'Parada Norte 1', lat: 0, lng: 0 },
    //     { name: 'Parada Norte 2', lat: 0, lng: 0 },
    //   ],
    // },
  ],

  // ----- CHOFERES -----
  drivers: [
    { name: 'Juan Pérez', phone: '664-000-0000' },
  ],

  // ----- UNIDADES (camiones/combis) -----
  units: [
    { plate: 'ABC-123', capacity: 30 },
  ],

  // ----- ASIGNACIONES ACTIVAS -----
  // Quién maneja qué unidad en qué ruta AHORA MISMO.
  // Usa exactamente los mismos nombres/placas que escribiste arriba.
  assignments: [
    { unitPlate: 'ABC-123', driverName: 'Juan Pérez', routeName: 'Ruta 1 - Centro' },
  ],

};
