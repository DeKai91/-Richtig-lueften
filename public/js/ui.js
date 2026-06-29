/**
 * UI – Aufbau der Oberfläche und Darstellung der Werte.
 * ------------------------------------------------------------
 * Kümmert sich ausschließlich um das DOM. Die Physik kommt aus calc.js.
 */

import { absoluteFeuchte, taupunkt } from './calc.js';

/** Zahl mit fester Nachkommastelle als deutscher String. */
function formatZahl(wert, nachkomma = 1) {
  if (wert === null || Number.isNaN(wert)) return '–';
  return wert.toFixed(nachkomma).replace('.', ',');
}

/**
 * Erstellt ein Stepper-Eingabefeld: [ − ] [ Eingabe ] [ + ]
 * @returns {{wrapper:HTMLElement, getWert:()=>number, setWert:(v:number)=>void}}
 */
function erstelleStepper({ label, einheit, min, max, step, wert, onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'feld';

  const labelEl = document.createElement('label');
  labelEl.className = 'feld-label';
  labelEl.textContent = `${label} (${einheit})`;

  const stepper = document.createElement('div');
  stepper.className = 'stepper';

  const minus = document.createElement('button');
  minus.type = 'button';
  minus.className = 'stepper-btn';
  minus.textContent = '−';
  minus.setAttribute('aria-label', label + ' verringern');

  const input = document.createElement('input');
  // type="text" + inputmode="decimal": volle Kontrolle über die Eingabe,
  // damit getippte Dezimalwerte (z. B. 22,7) NICHT aufs Raster gerundet werden
  // und das deutsche Komma erlaubt ist.
  input.type = 'text';
  input.className = 'stepper-input';
  input.inputMode = 'decimal';
  input.value = String(wert).replace('.', ',');

  const plus = document.createElement('button');
  plus.type = 'button';
  plus.className = 'stepper-btn';
  plus.textContent = '+';
  plus.setAttribute('aria-label', label + ' erhöhen');

  // Auf gültigen Bereich begrenzen.
  const begrenzen = (v) => Math.min(max, Math.max(min, v));
  // Nachkommastellen der Schrittweite (nur für die +/− Tasten relevant).
  const dezimalstellen = (String(step).split('.')[1] || '').length;

  // Aktuellen Wert lesen (deutsches Komma wird akzeptiert).
  const lesen = () => {
    const v = parseFloat(String(input.value).replace(',', '.'));
    return Number.isNaN(v) ? min : v;
  };

  // Wert anzeigen – mit deutschem Komma, OHNE auf das Raster zu runden.
  const anzeigen = (v) => {
    input.value = String(v).replace('.', ',');
  };

  // +/− Tasten: um eine Schrittweite ändern und sauber runden (gegen 22,69999…).
  const schritt = (richtung) => {
    const neu = begrenzen(lesen() + richtung * step);
    anzeigen(Number(neu.toFixed(dezimalstellen)));
    onChange();
  };

  minus.addEventListener('click', () => schritt(-1));
  plus.addEventListener('click', () => schritt(1));

  // Während des Tippens nur ungültige Zeichen blocken – kein Umformatieren.
  input.addEventListener('beforeinput', (e) => {
    if (e.data && /[^0-9.,-]/.test(e.data)) e.preventDefault();
  });
  input.addEventListener('input', onChange);
  // Beim Verlassen NUR auf den gültigen Bereich begrenzen – getippte Dezimalstellen bleiben erhalten.
  input.addEventListener('blur', () => {
    if (String(input.value).trim() === '') return;
    anzeigen(begrenzen(lesen()));
    onChange();
  });

  stepper.append(minus, input, plus);
  wrapper.append(labelEl, stepper);

  return {
    wrapper,
    getWert: lesen,
    setWert: (v) => anzeigen(begrenzen(v)),
  };
}

/** Erstellt eine kleine Anzeigezeile für einen berechneten Wert. */
function erstelleWertzeile(label) {
  const zeile = document.createElement('div');
  zeile.className = 'wertzeile';
  const name = document.createElement('span');
  name.className = 'wert-name';
  name.textContent = label;
  const wert = document.createElement('span');
  wert.className = 'wert-zahl';
  wert.textContent = '–';
  zeile.append(name, wert);
  return { zeile, wert };
}

/**
 * Erstellt eine vollständige Karte (Innen / Außen / Wetterstation).
 * @param {{titel:string, istWetterstation?:boolean, startTemp:number, startFeuchte:number, onChange:Function}} opt
 */
export function erstelleKarte({ titel, istWetterstation = false, startTemp, startFeuchte, onChange }) {
  const karte = document.createElement('section');
  karte.className = 'karte';

  const h2 = document.createElement('h2');
  h2.className = 'karte-titel';
  h2.textContent = titel;
  karte.append(h2);

  // Eingaben
  const tempStepper = erstelleStepper({
    label: 'Temperatur', einheit: '°C', min: -40, max: 60, step: 0.1, wert: startTemp, onChange,
  });
  const feuchteStepper = erstelleStepper({
    label: 'Rel. Luftfeuchte', einheit: '%', min: 0, max: 100, step: 1, wert: startFeuchte, onChange,
  });
  karte.append(tempStepper.wrapper, feuchteStepper.wrapper);

  // Wetterstation: Button zum Abrufen + Statuszeile
  let abrufButton = null;
  let statusEl = null;
  if (istWetterstation) {
    abrufButton = document.createElement('button');
    abrufButton.type = 'button';
    abrufButton.className = 'abruf-btn';
    abrufButton.textContent = 'Luftdaten abrufen';

    statusEl = document.createElement('p');
    statusEl.className = 'status';

    karte.append(abrufButton, statusEl);
  }

  // Berechnete Werte
  const trenner = document.createElement('div');
  trenner.className = 'trenner';
  const absZeile = erstelleWertzeile('Absolute Feuchte');
  const tauZeile = erstelleWertzeile('Taupunkt');
  karte.append(trenner, absZeile.zeile, tauZeile.zeile);

  /**
   * Liest die Eingaben, berechnet abgeleitete Werte und zeigt sie an.
   * @returns {{temp:number, feuchte:number, abs:number, taupunkt:number}}
   */
  function aktualisiere() {
    const temp = tempStepper.getWert();
    const feuchte = feuchteStepper.getWert();
    const abs = absoluteFeuchte(temp, feuchte);
    const tau = taupunkt(temp, feuchte);
    absZeile.wert.textContent = `${formatZahl(abs)} g/m³`;
    tauZeile.wert.textContent = `${formatZahl(tau)} °C`;
    return { temp, feuchte, abs, taupunkt: tau };
  }

  return {
    element: karte,
    aktualisiere,
    setMesswerte: (temp, feuchte) => {
      tempStepper.setWert(temp);
      feuchteStepper.setWert(feuchte);
    },
    abrufButton,
    setStatus: (text, typ = '') => {
      if (!statusEl) return;
      statusEl.textContent = text;
      statusEl.className = 'status' + (typ ? ' status--' + typ : '');
    },
  };
}

/**
 * Zeigt das Lüftungs-Ergebnis in der großen Ergebniskarte an.
 * @param {HTMLElement} container
 * @param {{ampel:string, delta:number, wasserEntfernt:number, empfehlung:string}} bewertung
 * @param {number} feuchteInnen
 * @param {number} feuchteAussen
 */
export function rendereErgebnis(container, bewertung, feuchteInnen, feuchteAussen) {
  container.className = 'ergebnis ergebnis--' + bewertung.ampel;

  const wasserText =
    bewertung.wasserEntfernt > 0
      ? `Beim Lüften werden etwa <strong>${formatZahl(bewertung.wasserEntfernt)} g</strong> Wasser pro m³ Luft entfernt.`
      : 'Beim Lüften würde derzeit kein Wasser aus der Raumluft entfernt.';

  container.innerHTML = `
    <div class="ergebnis-ampel" aria-hidden="true"></div>
    <div class="ergebnis-inhalt">
      <p class="ergebnis-empfehlung">${bewertung.empfehlung}</p>
      <p class="ergebnis-wasser">${wasserText}</p>
      <div class="ergebnis-werte">
        <div><span>Absolute Feuchte innen</span><strong>${formatZahl(feuchteInnen)} g/m³</strong></div>
        <div><span>Absolute Feuchte außen</span><strong>${formatZahl(feuchteAussen)} g/m³</strong></div>
        <div><span>Differenz</span><strong>${formatZahl(bewertung.delta)} g/m³</strong></div>
      </div>
      <p class="ergebnis-erklaerung">
        Verglichen wird die <em>absolute</em> Luftfeuchtigkeit – also der tatsächliche
        Wassergehalt der Luft. Ist sie außen niedriger als innen, trägt frische Luft
        beim Lüften Feuchtigkeit nach draußen. Die relative Feuchte allein genügt dafür nicht,
        weil kalte Luft bei gleichem Wassergehalt eine höhere relative Feuchte zeigt.
      </p>
    </div>
  `;
}
