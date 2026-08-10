# App de transporte público — MVP

Prototipo funcional con las 3 cosas que pediste:

1. **Rastreo en tiempo real**: el chofer transmite su GPS y el pasajero ve la unidad moverse en el mapa.
2. **Buscador de ruta**: dado un origen y un destino, la app dice qué ruta tomar y el tiempo estimado.
3. **Nombre del chofer**: cada unidad activa muestra quién la está manejando.

## Cómo correrlo

```bash
npm install
npm start
```

Luego abre:
- `http://localhost:3000/pasajero.html` — vista del pasajero (mapa + ETA)
- `http://localhost:3000/chofer.html` — vista del chofer (transmite su GPS; úsala desde su celular)

El proyecto trae datos de ejemplo (1 ruta, 4 paradas, 1 chofer, 1 unidad) para que puedas probarlo de inmediato.

## Para cargar los datos reales de tu ciudad, solo edita `datos.js`

Es el **único archivo que necesitas tocar**. Ahí escribes tus rutas (en orden, con sus paradas y coordenadas), tus choferes, tus unidades y quién maneja qué ruta ahora mismo. El archivo trae instrucciones y ejemplos comentados.

Después de editarlo:

```bash
rm transporte.db transporte.db-wal transporte.db-shm   # borra la base vieja
npm start                                                # se vuelve a crear con tus datos
```

Si `datos.js` tiene un error (por ejemplo, un nombre de chofer que no coincide con el de una asignación), el servidor te avisa en la consola cuál asignación no pudo cargar, para que la corrijas.

Para probar el rastreo en vivo: abre `chofer.html` en tu celular (o en otra pestaña), escribe el ID numérico de tu unidad (revisa el orden en que la escribiste en `datos.js`, empezando en 1), dale "Iniciar transmisión", y abre `pasajero.html` en otra pestaña — verás el punto moverse.

## Estructura

```
transporte-app/
  datos.js        <- EDITA ESTE con tus rutas, paradas, choferes y unidades
  server.js       API REST + WebSocket (Express + Socket.io)
  db.js           Esquema de la base de datos (SQLite); lee datos.js al arrancar
  geo.js          Cálculo de distancias y ETA (fórmula de Haversine)
  public/
    pasajero.html Mapa en tiempo real + buscador de ruta
    chofer.html   Pantalla simple para que el chofer transmita su GPS
```

## Modelo de datos

- **routes** — las rutas de tu ciudad (ej. "Ruta 1 - Centro")
- **stops** — paradas con lat/lng
- **route_stops** — el orden de las paradas dentro de cada ruta
- **drivers** — choferes
- **units** — las unidades/camiones (placa, capacidad)
- **assignments** — qué chofer maneja qué unidad en qué ruta, ahora mismo
- **locations** — historial de posiciones GPS (útil luego para calcular velocidad real y mejorar el ETA)

## Cómo funciona el ETA

Por ahora usa una velocidad urbana promedio fija (18 km/h, ajustable en `geo.js`) y la distancia en línea recta (Haversine) entre la unidad y la siguiente parada. Es una aproximación razonable para arrancar. Cuando tengas más datos podrás:

- Calcular la velocidad real de cada unidad usando su historial en `locations`.
- Usar la distancia real sobre las calles (con un servicio de rutas como OSRM o Google Directions) en vez de línea recta.

## Siguientes pasos que te recomiendo, en orden

1. **Carga las rutas reales de tu ciudad.** Reemplaza los datos de ejemplo en `db.js` con las paradas y coordenadas reales (puedes sacarlas caminando la ruta con tu celular y anotando lat/lng, o si el gobierno de tu ciudad publica datos GTFS, mucho mejor — pregúntame y te ayudo a importarlos).
2. **Resuelve cómo obtienes el GPS del chofer en la vida real.** Lo más simple para un MVP: el chofer usa `chofer.html` desde su propio celular (funciona en cualquier navegador, no necesita instalar nada). Si más adelante quieres algo más robusto, se puede migrar a una app nativa o un dispositivo GPS dedicado en la unidad.
3. **Agrega autenticación básica para choferes** antes de lanzarlo — ahorita cualquiera podría mandar una ubicación falsa a cualquier `unitId`. Lo mínimo: un código o PIN por chofer al iniciar transmisión.
4. **Considera migrar de SQLite a PostgreSQL** si esperas muchas unidades/usuarios simultáneos — SQLite es perfecto para probar pero tiene límites de escritura concurrente.
5. **Empaqueta el frontend como PWA** (Progressive Web App) para que "ambas" web y móvil sea el mismo código: los pasajeros pueden instalarla en su celular desde el navegador sin pasar por App Store/Google Play. Si más adelante necesitas notificaciones push nativas o funcionar sin internet, ahí sí conviene migrar a React Native o Flutter.

## Nota sobre seguridad y privacidad

Antes de publicar esto, piensa en: no expongas el nombre completo del chofer sin su consentimiento (quizá solo nombre + apellido inicial), limita quién puede mandar ubicaciones (ver punto 3 arriba), y si guardas historial de ubicaciones por mucho tiempo, define una política de cuánto tiempo lo conservas.
