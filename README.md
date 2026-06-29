# Richtig Lüften

Kleine, lokal laufende Webanwendung, die **physikalisch korrekt** anhand der
**absoluten Luftfeuchtigkeit** beurteilt, ob Lüften sinnvoll ist.

- Drei Karten: **Innen**, **Außen**, **Wetterstation** (eigenständig)
- Automatische Berechnung von absoluter Luftfeuchte und Taupunkt (Magnus-Formel)
- Ampel-Bewertung (grün / gelb / rot) inkl. „X g Wasser pro m³"
- Live-Abruf einer AWEKAS-Wetterstation
- Einstellungs-Menü (⚙) für Grenzwerte und Stations-ID
- Als App auf dem Handy installierbar (PWA)

## Aufbau

```
richtig-lueften/
├── server.js            Backend (nur Node-Bordmittel, keine Abhängigkeiten)
│                         – liefert das Frontend aus
│                         – ruft die AWEKAS-Station serverseitig ab (/api/wetter)
└── public/
    ├── index.html
    ├── css/styles.css
    ├── js/
    │   ├── calc.js       Physik/Berechnungen (reine Funktionen)
    │   ├── weather.js    Datenabruf vom Backend
    │   ├── settings.js   Einstellungen (localStorage)
    │   ├── ui.js         Oberfläche / DOM
    │   └── app.js        Verdrahtung
    ├── manifest.webmanifest
    ├── sw.js             Service Worker (Installierbarkeit)
    └── icon.svg
```

## Starten (PC, zum Testen)

Node.js installiert? Dann:

```bash
node server.js
```

Dann im Browser öffnen: <http://localhost:8080>

## Auf dem Android-Handy ausführen (Termux)

1. **Termux** installieren (F-Droid oder Play Store).
2. Node.js installieren:
   ```bash
   pkg update && pkg install nodejs
   ```
3. Diesen Ordner `richtig-lueften` aufs Handy kopieren (z. B. nach
   `~/storage/shared/richtig-lueften`, vorher einmalig `termux-setup-storage`).
4. In den Ordner wechseln und starten:
   ```bash
   cd ~/storage/shared/richtig-lueften
   node server.js
   ```
5. Im Handy-Browser öffnen: <http://localhost:8080>
6. Optional über das Browser-Menü **„Zum Startbildschirm hinzufügen"** → läuft
   dann wie eine eigene App.

> Warum ein kleines Backend? Der Browser darf aus Sicherheitsgründen (CORS)
> fremde Seiten nicht direkt auslesen. `server.js` holt die Stationsdaten
> serverseitig und reicht nur Temperatur + Feuchte ans Frontend weiter.

## Konfiguration

- **Stations-ID & Grenzwerte:** im laufenden Programm über das Zahnrad ⚙.
- **Standard-Station (serverseitig):** in `server.js` ganz oben unter `CONFIG.stationId`.
  Die ID stammt aus der AWEKAS-Adresse, z. B.
  `https://stationsweb.awekas.at/de/10833/home` → ID = `10833`.

## Datenquelle

Die App nutzt den öffentlichen Live-Datenpunkt von AWEKAS
(`app.awekas.at/v4/api/ajax_data.php?id=<ID>&lng=de`). Kein Konto, keine
Kosten. Falls AWEKAS diesen Endpunkt ändert, muss nur `ladeWetterstation()`
in `server.js` angepasst werden.

## Erweiterbar

Vorbereitet für: mehrere Stationen, automatische Aktualisierung, Speicherung
der letzten Werte, URL-Parameter, Home Assistant, MQTT, PWA.
