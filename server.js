/**
 * Richtig Lüften – Backend
 * ------------------------------------------------------------
 * Sehr kleiner Server ohne externe Abhängigkeiten (nur Node-Bordmittel).
 *
 * Aufgaben:
 *   1. Liefert das Frontend aus dem Ordner ./public aus.
 *   2. Stellt den Endpunkt /api/wetter bereit. Dieser ruft serverseitig
 *      die AWEKAS-Wetterstation ab (kein CORS-Problem, da Server-zu-Server)
 *      und liefert vereinfachtes JSON zurück: { temperature, humidity }.
 *
 * Start:  node server.js
 * Aufruf: http://localhost:8080
 */

'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ----------------------------------------------------------------------------
// Zentrale Konfiguration
// ----------------------------------------------------------------------------
const CONFIG = {
  // Port, auf dem die App läuft.
  port: process.env.PORT || 8080,

  // Wetterstation. Die ID stammt aus der AWEKAS-Adresse
  // https://stationsweb.awekas.at/de/10833/home  ->  ID = 10833
  // Kann auch pro Anfrage per ?id=... überschrieben werden.
  stationId: 10833,

  // Basis-URL des (inoffiziellen) AWEKAS-Datenendpunkts.
  // Liefert JSON mit den aktuellen Messwerten der Station.
  awekasBase: 'https://app.awekas.at/v4/api/ajax_data.php',
};

// Verzeichnis mit den statischen Frontend-Dateien.
const PUBLIC_DIR = path.join(__dirname, 'public');

// Zuordnung Dateiendung -> MIME-Type.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ----------------------------------------------------------------------------
// AWEKAS-Daten abrufen
// ----------------------------------------------------------------------------

/**
 * Lädt die aktuellen Messwerte einer AWEKAS-Station.
 * @param {number|string} stationId - die Stations-ID
 * @returns {Promise<{temperature:number, humidity:number, dewpoint:number|null, time:number|null}>}
 */
function ladeWetterstation(stationId) {
  const url = `${CONFIG.awekasBase}?id=${encodeURIComponent(stationId)}&lng=de`;

  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          // Ein realistischer User-Agent, damit die Anfrage nicht abgewiesen wird.
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13) RichtigLueften/1.0',
          Accept: 'application/json',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume(); // Datenstrom verwerfen
          reject(new Error('AWEKAS antwortet mit Status ' + res.statusCode));
          return;
        }

        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const d = json && json.data ? json.data : {};

            // Aus dem umfangreichen JSON nur die benötigten Werte herausziehen.
            const result = {
              temperature: d.temp && typeof d.temp.now === 'number' ? d.temp.now : null,
              humidity: d.hum && typeof d.hum.now === 'number' ? d.hum.now : null,
              dewpoint: d.dew && typeof d.dew.now === 'number' ? d.dew.now : null,
              time: typeof d.data_time === 'number' ? d.data_time : null,
            };

            if (result.temperature === null || result.humidity === null) {
              reject(new Error('Keine Temperatur/Feuchte in der Antwort gefunden'));
              return;
            }
            resolve(result);
          } catch (err) {
            reject(new Error('Antwort konnte nicht als JSON gelesen werden'));
          }
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => req.destroy(new Error('Zeitüberschreitung beim Abruf')));
  });
}

// ----------------------------------------------------------------------------
// Statische Dateien ausliefern
// ----------------------------------------------------------------------------

/**
 * Liefert eine Datei aus dem public-Ordner aus. Schützt vor Pfad-Ausbrüchen.
 */
function serviereDatei(res, urlPfad) {
  // "/" auf index.html abbilden.
  let relativ = urlPfad === '/' ? '/index.html' : urlPfad;
  relativ = decodeURIComponent(relativ.split('?')[0]);

  // Sicheren absoluten Pfad bilden und prüfen, dass er innerhalb von public liegt.
  const absolut = path.join(PUBLIC_DIR, path.normalize(relativ));
  if (!absolut.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Zugriff verweigert');
    return;
  }

  fs.readFile(absolut, (err, inhalt) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Nicht gefunden');
      return;
    }
    const ext = path.extname(absolut).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(inhalt);
  });
}

// ----------------------------------------------------------------------------
// Server
// ----------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const { url, method } = req;

  // API-Endpunkt: aktuelle Wetterstationsdaten.
  if (method === 'GET' && url.startsWith('/api/wetter')) {
    // Optionale ID per Query, sonst die konfigurierte Standard-Station.
    const params = new URLSearchParams(url.split('?')[1] || '');
    const stationId = params.get('id') || CONFIG.stationId;

    try {
      const daten = await ladeWetterstation(stationId);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(daten));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Alles andere: statische Datei.
  serviereDatei(res, url);
});

server.listen(CONFIG.port, () => {
  console.log('Richtig Lüften läuft auf  http://localhost:' + CONFIG.port);
  console.log('Wetterstation-ID:', CONFIG.stationId);
});
