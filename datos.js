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

// datos.js
//
// PILOTO: Blvd. Benito Juárez, Playas de Rosarito
//
// Es una sola calle, no una ruta con paradas fijas: el pasajero se puede
// subir desde cualquier punto del bulevar. Por eso los "stops" de aquí no
// son paradas oficiales, son puntos de referencia reales sobre la calle
// (Oxxos, cruces conocidos) que sirven para calcular el ETA y para que el
// pasajero elija su destino aproximado al subirse.
//
// Como el camión recorre el bulevar en ambos sentidos a lo largo del día,
// se definen DOS rutas con los mismos puntos en orden inverso. El chofer
// elige en cuál sentido va desde chofer.html (no está fijo en la base de
// datos), así que las "assignments" de abajo solo definen quién maneja
// qué unidad para efectos de mostrar el nombre del chofer — la dirección
// real se decide en vivo.

module.exports = {

  routes: [
    {
      name: 'Blvd. Benito Juárez → Tijuana',
      description: 'Sentido sur a norte: Rosarito Beach Hotel → Pabellón Rosarito',
      stops: [
        { name: 'Rosarito Beach Hotel',                          lat: 32.336164, lng: -117.054541 },
        { name: 'Hotel Festival Plaza',                          lat: 32.337533, lng: -117.055190 },
        { name: 'Pueblo Plaza',                                  lat: 32.338398, lng: -117.055672 },
        { name: 'OXXO Avante',                                   lat: 32.341738, lng: -117.057171 },
        { name: 'Palacio Royal (restaurante)',                   lat: 32.353781, lng: -117.059915 },
        { name: 'OXXO Lienzo Charro',                            lat: 32.360743, lng: -117.059002 },
        { name: "OXXO Villa Floresta (frente a McDonald's)",     lat: 32.364380, lng: -117.059861 },
        { name: 'OXXO Cristal',                                  lat: 32.369290, lng: -117.060404 },
        { name: 'Pabellón Rosarito',                             lat: 32.377808, lng: -117.059502 },
      ],
    },
    {
      name: 'Blvd. Benito Juárez → Rosarito',
      description: 'Sentido norte a sur: Pabellón Rosarito → Rosarito Beach Hotel',
      stops: [
        { name: 'Pabellón Rosarito',                             lat: 32.377808, lng: -117.059502 },
        { name: 'OXXO Cristal',                                  lat: 32.369290, lng: -117.060404 },
        { name: "OXXO Villa Floresta (frente a McDonald's)",     lat: 32.364380, lng: -117.059861 },
        { name: 'OXXO Lienzo Charro',                            lat: 32.360743, lng: -117.059002 },
        { name: 'Palacio Royal (restaurante)',                   lat: 32.353781, lng: -117.059915 },
        { name: 'OXXO Avante',                                   lat: 32.341738, lng: -117.057171 },
        { name: 'Pueblo Plaza',                                  lat: 32.338398, lng: -117.055672 },
        { name: 'Hotel Festival Plaza',                          lat: 32.337533, lng: -117.055190 },
        { name: 'Rosarito Beach Hotel',                          lat: 32.336164, lng: -117.054541 },
      ],
    },
  ],

  drivers: [
    { name: 'Juan Pérez', phone: '661-000-0000' },
  ],

  units: [
    { plate: 'ABC-123', capacity: 30 },
  ],

  // Asignación por defecto (solo para mostrar el nombre del chofer ligado
  // a la unidad). La dirección real la elige el chofer en vivo desde
  // chofer.html, así que esto es solo el punto de partida.
  assignments: [
    { unitPlate: 'ABC-123', driverName: 'Juan Pérez', routeName: 'Blvd. Benito Juárez → Tijuana' },
  ],

};
