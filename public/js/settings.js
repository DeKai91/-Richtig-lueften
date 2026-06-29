/**
 * Einstellungen – Speichern/Laden der Konfiguration im Browser (localStorage).
 * ------------------------------------------------------------
 * Konfigurierbar sind die Ampel-Grenzwerte und die Stations-ID.
 */

const STORAGE_KEY = 'richtig-lueften-settings';

// Standardwerte. Die Grenzwerte beziehen sich auf die Differenz der
// absoluten Feuchte (innen - außen) in g/m³.
const STANDARD = {
  gruenAb: 1.0, // ab dieser Differenz lohnt sich Lüften deutlich (grün)
  rotUnter: 0.0, // unterhalb davon (außen feuchter) -> nicht lüften (rot)
  stationId: 10833, // AWEKAS-Station
};

/**
 * Lädt die gespeicherten Einstellungen oder liefert die Standardwerte.
 * @returns {{gruenAb:number, rotUnter:number, stationId:number}}
 */
export function ladeEinstellungen() {
  try {
    const roh = localStorage.getItem(STORAGE_KEY);
    if (!roh) return { ...STANDARD };
    const gespeichert = JSON.parse(roh);
    // Mit den Standardwerten zusammenführen, falls Felder fehlen.
    return { ...STANDARD, ...gespeichert };
  } catch {
    return { ...STANDARD };
  }
}

/**
 * Speichert die Einstellungen dauerhaft im Browser.
 * @param {{gruenAb:number, rotUnter:number, stationId:number}} einstellungen
 */
export function speichereEinstellungen(einstellungen) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(einstellungen));
}

export { STANDARD };
