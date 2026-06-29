/**
 * App – verdrahtet Oberfläche, Berechnung, Einstellungen und Datenabruf.
 * ------------------------------------------------------------
 */

import { erstelleKarte, rendereErgebnis } from './ui.js';
import { lueftungsbewertung } from './calc.js';
import { ladeWetterdaten } from './weather.js';
import { ladeEinstellungen, speichereEinstellungen } from './settings.js';

// Aktuelle Einstellungen (Grenzwerte + Stations-ID).
let einstellungen = ladeEinstellungen();

// ----------------------------------------------------------------------------
// Karten anlegen
// ----------------------------------------------------------------------------
const kartenContainer = document.getElementById('karten');
const ergebnisContainer = document.getElementById('ergebnis');

// Diese Funktion wird bei jeder Eingabeänderung aufgerufen.
function berechneAlles() {
  const innen = kartenInnen.aktualisiere();
  const aussen = kartenAussen.aktualisiere();
  kartenStation.aktualisiere(); // eigenständige Karte, fließt nicht in die Bewertung ein

  const bewertung = lueftungsbewertung(innen.abs, aussen.abs, {
    gruenAb: einstellungen.gruenAb,
    rotUnter: einstellungen.rotUnter,
  });
  rendereErgebnis(ergebnisContainer, bewertung, innen.abs, aussen.abs);
}

const kartenInnen = erstelleKarte({
  titel: 'Innen', startTemp: 21, startFeuchte: 55, onChange: berechneAlles,
});
const kartenAussen = erstelleKarte({
  titel: 'Außen', startTemp: 15, startFeuchte: 70, onChange: berechneAlles,
});
const kartenStation = erstelleKarte({
  titel: 'Wetterstation', istWetterstation: true, startTemp: 18, startFeuchte: 65, onChange: berechneAlles,
});

kartenContainer.append(kartenInnen.element, kartenAussen.element, kartenStation.element);

// ----------------------------------------------------------------------------
// Wetterstation abrufen
// ----------------------------------------------------------------------------
kartenStation.abrufButton.addEventListener('click', async () => {
  kartenStation.setStatus('Daten werden abgerufen …', 'laden');
  kartenStation.abrufButton.disabled = true;
  try {
    const daten = await ladeWetterdaten(einstellungen.stationId);
    kartenStation.setMesswerte(daten.temperature, daten.humidity);
    berechneAlles();
    const zeit = daten.time ? new Date(daten.time * 1000).toLocaleTimeString('de-DE') : null;
    kartenStation.setStatus(zeit ? `Aktualisiert um ${zeit} Uhr` : 'Daten übernommen', 'ok');
  } catch (err) {
    kartenStation.setStatus('Fehler: ' + err.message, 'fehler');
  } finally {
    kartenStation.abrufButton.disabled = false;
  }
});

// ----------------------------------------------------------------------------
// Einstellungen (Dialog)
// ----------------------------------------------------------------------------
const dialog = document.getElementById('einstellungen');
const formGruen = document.getElementById('opt-gruen');
const formRot = document.getElementById('opt-rot');
const formStation = document.getElementById('opt-station');

document.getElementById('einstellungen-oeffnen').addEventListener('click', () => {
  // Aktuelle Werte ins Formular übernehmen.
  formGruen.value = einstellungen.gruenAb;
  formRot.value = einstellungen.rotUnter;
  formStation.value = einstellungen.stationId;
  dialog.showModal();
});

document.getElementById('einstellungen-speichern').addEventListener('click', (e) => {
  e.preventDefault();
  einstellungen = {
    gruenAb: parseFloat(String(formGruen.value).replace(',', '.')) || 0,
    rotUnter: parseFloat(String(formRot.value).replace(',', '.')) || 0,
    stationId: parseInt(formStation.value, 10) || einstellungen.stationId,
  };
  speichereEinstellungen(einstellungen);
  dialog.close();
  berechneAlles();
});

document.getElementById('einstellungen-abbrechen').addEventListener('click', (e) => {
  e.preventDefault();
  dialog.close();
});

// ----------------------------------------------------------------------------
// Erststart
// ----------------------------------------------------------------------------
berechneAlles();

// Service Worker nur in der Web-Version registrieren (nicht in der nativen App,
// und nur über http/https – nicht über file://). Optional.
if (!window.NativeWetter && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    /* Ohne Service Worker funktioniert die App trotzdem. */
  });
}
