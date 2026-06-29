/**
 * Wetterstation – Abruf der Live-Daten.
 * ------------------------------------------------------------
 * Zwei Betriebsarten:
 *   1. Native Android-App: Abruf über die native Brücke window.NativeWetter
 *      (kein Server, kein CORS).
 *   2. Web/Termux: Abruf über das eigene Backend /api/wetter.
 */

/**
 * Ruft die aktuellen Werte der Wetterstation ab.
 * @param {number|string} [stationId] - optionale Stations-ID
 * @returns {Promise<{temperature:number, humidity:number, dewpoint:number|null, time:number|null}>}
 */
export async function ladeWetterdaten(stationId) {
  // --- Variante 1: native Android-App ---
  if (window.NativeWetter && typeof window.NativeWetter.abrufen === 'function') {
    return new Promise((resolve, reject) => {
      // Das native Ergebnis kommt asynchron über diesen Rückruf zurück.
      window.__wetterResolve = (json) => {
        window.__wetterResolve = null;
        try {
          const daten = JSON.parse(json);
          if (daten && daten.error) reject(new Error(daten.error));
          else resolve(daten);
        } catch {
          reject(new Error('Antwort konnte nicht gelesen werden'));
        }
      };
      try {
        window.NativeWetter.abrufen(String(stationId || ''));
      } catch {
        reject(new Error('Nativer Abruf fehlgeschlagen'));
      }
    });
  }

  // --- Variante 2: Web/Termux über das Backend ---
  const query = stationId ? `?id=${encodeURIComponent(stationId)}` : '';
  const antwort = await fetch('/api/wetter' + query);

  if (!antwort.ok) {
    let meldung = 'Abruf fehlgeschlagen (Status ' + antwort.status + ')';
    try {
      const fehler = await antwort.json();
      if (fehler && fehler.error) meldung = fehler.error;
    } catch {
      /* Antwort war kein JSON – Standardmeldung behalten */
    }
    throw new Error(meldung);
  }

  return antwort.json();
}
