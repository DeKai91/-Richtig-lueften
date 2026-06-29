/**
 * Berechnungen – physikalische Formeln rund um Luftfeuchtigkeit.
 * ------------------------------------------------------------
 * Reine Funktionen ohne Seiteneffekte. Keine DOM-Zugriffe.
 * Grundlage ist die Magnus-Formel.
 */

// Magnus-Koeffizienten (gültig über Wasser, ca. -45 °C bis +60 °C, WMO-Satz).
const MAGNUS_A = 17.62;
const MAGNUS_B = 243.12; // °C
const E0 = 6.112; // hPa – Sättigungsdampfdruck bei 0 °C

/**
 * Sättigungsdampfdruck der Luft.
 * Das ist der maximale Wasserdampfdruck bei der gegebenen Temperatur.
 * @param {number} tempC - Temperatur in °C
 * @returns {number} Sättigungsdampfdruck in hPa
 */
export function saettigungsdampfdruck(tempC) {
  return E0 * Math.exp((MAGNUS_A * tempC) / (MAGNUS_B + tempC));
}

/**
 * Tatsächlicher Dampfdruck der Luft.
 * @param {number} tempC - Temperatur in °C
 * @param {number} relFeuchte - relative Luftfeuchtigkeit in % (0..100)
 * @returns {number} Dampfdruck in hPa
 */
export function dampfdruck(tempC, relFeuchte) {
  return (relFeuchte / 100) * saettigungsdampfdruck(tempC);
}

/**
 * Absolute Luftfeuchtigkeit – die tatsächliche Wassermenge pro Kubikmeter Luft.
 * Dies ist der entscheidende Wert für die Lüftungsbewertung, weil er
 * (anders als die relative Feuchte) temperaturunabhängig vergleichbar ist.
 * @param {number} tempC - Temperatur in °C
 * @param {number} relFeuchte - relative Luftfeuchtigkeit in % (0..100)
 * @returns {number} absolute Luftfeuchtigkeit in g/m³
 */
export function absoluteFeuchte(tempC, relFeuchte) {
  const e = dampfdruck(tempC, relFeuchte); // hPa
  // Hergeleitet aus dem idealen Gasgesetz; 216.7 fasst die Konstanten zusammen.
  return (216.7 * e) / (tempC + 273.15);
}

/**
 * Taupunkttemperatur – Temperatur, bei der die Luft mit dem aktuellen
 * Wasserdampf gesättigt wäre (relative Feuchte = 100 %).
 * Umkehrung der Magnus-Formel.
 * @param {number} tempC - Temperatur in °C
 * @param {number} relFeuchte - relative Luftfeuchtigkeit in % (0..100)
 * @returns {number} Taupunkt in °C
 */
export function taupunkt(tempC, relFeuchte) {
  // Schutz vor log(0) bei 0 % Feuchte.
  const rh = Math.max(relFeuchte, 0.0001);
  const alpha = Math.log(rh / 100) + (MAGNUS_A * tempC) / (MAGNUS_B + tempC);
  return (MAGNUS_B * alpha) / (MAGNUS_A - alpha);
}

/**
 * Lüftungsbewertung anhand der Differenz der absoluten Feuchte.
 *
 * @param {number} feuchteInnen - absolute Feuchte innen in g/m³
 * @param {number} feuchteAussen - absolute Feuchte außen in g/m³
 * @param {{gruenAb:number, rotUnter:number}} grenzen - Schwellenwerte in g/m³
 * @returns {{
 *   ampel: 'gruen'|'gelb'|'rot',
 *   delta: number,            // feuchteInnen - feuchteAussen (g/m³)
 *   wasserEntfernt: number,   // g/m³, die das Lüften netto austrägt (>= 0)
 *   empfehlung: string
 * }}
 */
export function lueftungsbewertung(feuchteInnen, feuchteAussen, grenzen) {
  // Positiv = innen feuchter als außen = Lüften trägt Feuchtigkeit nach draußen.
  const delta = feuchteInnen - feuchteAussen;

  let ampel;
  let empfehlung;

  if (delta >= grenzen.gruenAb) {
    ampel = 'gruen';
    empfehlung = 'Lüften lohnt sich.';
  } else if (delta >= grenzen.rotUnter) {
    ampel = 'gelb';
    empfehlung = 'Lüften bringt nur einen geringen Effekt.';
  } else {
    ampel = 'rot';
    empfehlung = 'Nicht lüften.';
  }

  return {
    ampel,
    delta,
    wasserEntfernt: Math.max(0, delta),
    empfehlung,
  };
}
