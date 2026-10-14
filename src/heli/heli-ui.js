// Kestrel One's instruments and the helicopter's page parts
// (docs/HELICOPTER.md section 8). Drawn in the page like the speedometer.
// Drawing only: it reads the app's helicopter view and log and never
// changes flight state; its buttons call the app's helicopter actions.
import {HELI_DESTINATIONS, HOME_COURSE, legFuelKg} from './heli-jobs.js';
import {HELI_CAMERA_VIEWS} from './heli-camera.js';
import {HELI_RADIO_LINES} from './heli-radio-lines.js';
import {HELI_MONEY} from './heli-save.js';

const fmt = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '-';
const escape = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const NOTICE_SECONDS = 4.5;
const RADIO_SECONDS = 6;

// Plain numbers for each gauge, rounded the way the gauges show them.
export function instrumentReadings(readout) {
  if (!readout) return null;
  const climbFpm = Math.round(readout.climbFpm / 10) * 10;
  let heading = Math.round(readout.headingDeg) % 360;
  if (heading < 0) heading += 360;
  return {
    altitude: `${fmt(readout.altitudeFt)} ft`, altitudeM: `${fmt(readout.altitudeM)} m`,
    height: `${fmt(Math.max(0, readout.heightFt))} ft`, heightM: `${fmt(Math.max(0, readout.heightM), 1)} m`,
    airspeed: `${fmt(readout.airspeedKts)} kt`, airspeedMs: `${fmt(readout.airspeedKts / 1.943844)} m/s`,
    climb: `${climbFpm > 0 ? '+' : ''}${climbFpm} ft/min`, climbMs: `${fmt(readout.climbMs, 1)} m/s`,
    rotor: `${fmt(readout.rotorPct)}%`,
    fuel: `${fmt(readout.fuelKg)} kg`,
    fuelTime: Number.isFinite(readout.fuelMinutes) ? `${fmt(readout.fuelMinutes)} min left` : 'engine off',
    weight: `${fmt(readout.weightKg)} kg`, maxLift: `${fmt(readout.maxLiftKg)} kg`,
    heading: `${String(heading).padStart(3, '0')}`,
    pitch: readout.pitchDeg, roll: readout.rollDeg,
    lowFuel: readout.fuelKg <= 60, lowRotor: readout.rotorPct < 90 && !readout.engine && readout.heightM > 0.1,
    heavy: readout.weightKg > readout.maxLiftKg,
  };
}

// What a session event says on screen, if anything.
export function noticeText(event) {
  const course = id => HELI_DESTINATIONS[id]?.name ?? id;
  switch (event?.type) {
    case 'charged': {
      const what = {hardLanding: 'Hard landing', crash: 'Crash', drop: 'Dropped load', cargoLight: 'Cargo knock',
        cargoHeavy: 'Cargo hit', cargoWreck: 'Cargo wrecked', fuelTruck: 'Fuel truck'}[event.kind] ?? 'Repair';
      return `${what}: ${event.charged} credits${event.forgiven ? ` (${event.forgiven} forgiven)` : ''}`;
    }
    case 'fuelBought': return event.cost ? `Fuel: ${fmt(event.kg, 1)} kg for ${event.cost} credits` : `Fuel: ${fmt(event.kg, 1)} kg, the first tank is free`;
    case 'cruiseRefused': return `Not enough fuel for that leg: it needs ${event.needKg} kg`;
    case 'cannotLift': return event.reason;
    case 'delivered': return `Delivered to ${course(event.courseId)}`;
    case 'hooked': return 'Hooked on';
    case 'entered': return event.arrived ? `${course(event.courseId)}: the landing zone is ahead` : course(event.courseId);
    case 'autopilotOff': return event.reason === 'pilot' ? 'Autopilot off: you have control' : null;
    case 'autopilotOn': return 'Autopilot on';
    default: return null;
  }
}

function horizon(pitch, roll) {
  // Like a real attitude indicator: nose down lifts the horizon (more
  // ground), a right bank turns it the other way. 2 px a degree of pitch.
  const shift = Math.max(-40, Math.min(40, (pitch || 0) * 2));
  return `<div class="heli-horizon" aria-label="Artificial horizon"><div class="heli-horizon-ball"
    style="transform: rotate(${(-(roll || 0)).toFixed(1)}deg) translateY(${(-shift).toFixed(1)}px)"></div><div class="heli-horizon-mark"></div></div>`;
}

const gauge = (label, value, extra = '', warn = false) =>
  `<div class="heli-gauge${warn ? ' warn' : ''}"><span>${label}</span><strong>${value}</strong>${extra ? `<small>${extra}</small>` : ''}</div>`;

export function instrumentsMarkup(view, {cameraIndex = 0} = {}) {
  const r = instrumentReadings(view?.readout);
  if (!r) return '';
  return `<div class="heli-instruments" role="group" aria-label="Kestrel One instruments">
    ${gauge('ALTITUDE', r.altitude, r.altitudeM)}${gauge('HEIGHT', r.height, r.heightM)}
    ${gauge('AIRSPEED', r.airspeed, r.airspeedMs)}${gauge('CLIMB', r.climb, r.climbMs)}
    ${horizon(r.pitch, r.roll)}
    ${gauge('HEADING', r.heading)}${gauge('ROTOR', r.rotor, '', r.lowRotor)}
    ${gauge('FUEL', r.fuel, r.fuelTime, r.lowFuel)}${gauge('WEIGHT', r.weight, `most here ${r.maxLift}`, r.heavy)}
  </div>
  <div class="heli-status">
    <span>${view.autopilot ? 'AUTOPILOT ON' : 'AUTOPILOT OFF'} <kbd>P</kbd></span>
    <span>VIEW ${HELI_CAMERA_VIEWS[((cameraIndex % 4) + 4) % 4].toUpperCase()} <kbd>C</kbd></span>
    <span>HOOK <kbd>H</kbd></span>
  </div>`;
}

// Where to fly, the pump at home, and the cruise prompt.
export function controlsMarkup(view, {credits = 0, refuels = 0} = {}) {
  if (!view?.heli) return '';
  const here = view.courseId;
  const onPad = here === HOME_COURSE && view.heli.onGround && view.zone &&
    Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) <= view.zone.radius;
  const buttons = Object.values(HELI_DESTINATIONS).map(place => {
    const leg = place.id === here ? null : legFuelKg(here, place.id);
    const chosen = view.destination === place.id;
    return `<button type="button" class="heli-place${chosen ? ' on' : ''}" data-heli-destination="${place.id}" aria-pressed="${chosen}">${escape(place.name)}${place.id === here ? ' (here)' : leg ? ` · ${leg} kg` : ''}</button>`;
  }).join('');
  // The label changes as fuel burns; it sits in its own span so the panel
  // can update it without rebuilding the buttons under the mouse.
  const label = pumpLabel(view.heli.fuelKg, {credits, refuels});
  const pump = onPad ? `<button type="button" class="heli-pump" data-heli-fuel="fill" ${label.disabled ? 'disabled' : ''}><span class="heli-pump-label">${label.text}</span></button>` : '';
  const destination = view.destination ? HELI_DESTINATIONS[view.destination]?.name : null;
  return `<div class="heli-route" role="group" aria-label="Fly to"><span>FLY TO</span>${buttons}${pump}</div>
    ${view.cruiseOffered ? `<div class="heli-prompt" role="status">Clear of the area. Press <kbd>ENTER</kbd> to cruise to ${escape(destination)}.</div>` : ''}`;
}

// What the pump offers, matching heli-save's buyFuel: the first tank is
// free; later 1.5 credits a kg, rounded up; short of credits it sells
// what they pay for.
export function pumpLabel(fuelKg, {credits = 0, refuels = 0} = {}) {
  // Whole tenths of a kg, rounded the way the save stores the tank.
  const space = Math.max(0, 4000 - Math.round(fuelKg * 10)) / 10;
  if (space < 0.1) return {text: 'TANK FULL', disabled: true};
  if (refuels === 0) return {text: 'FILL UP · FREE FIRST TANK', disabled: false};
  const price = Math.ceil(space * HELI_MONEY.creditsPerKg);
  if (credits >= price) return {text: `FILL UP · ${price} CR`, disabled: false};
  const kg = Math.floor(credits / HELI_MONEY.creditsPerKg * 10) / 10;
  if (kg < 0.1) return {text: 'NO CREDITS FOR FUEL', disabled: true};
  return {text: `BUY ${kg.toFixed(1)} KG · ${Math.ceil(kg * HELI_MONEY.creditsPerKg)} CR`, disabled: false};
}

const PUMP_LABEL = /<span class="heli-pump-label">[^<]*<\/span>/;

export function createHeliUi({host, app}) {
  const doc = host.ownerDocument, section = doc.createElement('section');
  section.className = 'heli-panel';
  section.hidden = true;
  section.setAttribute('aria-label', 'Kestrel One');
  section.innerHTML = '<div class="heli-top"></div><div class="heli-controls"></div><div class="heli-notices" aria-live="polite"></div><div class="heli-radio" aria-live="polite" hidden></div>';
  host.append(section);
  const top = section.querySelector('.heli-top'), controls = section.querySelector('.heli-controls');
  const notices = section.querySelector('.heli-notices'), radio = section.querySelector('.heli-radio');
  let seenLog = null, shown = [], radioLine = null, lastTop = '', lastControls = '', lastNotices = '', disposed = false;
  const click = event => {
    const place = event.target.closest('[data-heli-destination]');
    if (place) { app.heliSetDestination?.(place.dataset.heliDestination); place.blur(); return; }
    const pump = event.target.closest('[data-heli-fuel]');
    if (pump) {
      const result = app.heliBuyFuel?.();
      if (result && !result.ok && result.reason) shown.push({text: result.reason, until: performance.now() / 1000 + NOTICE_SECONDS});
      pump.blur();
    }
  };
  section.addEventListener('click', click);
  const set = (node, html, last) => { if (html !== last) node.innerHTML = html; return html; };

  return {
    update(now = performance.now() / 1000) {
      if (disposed) return null;
      const view = app.duel?.state?.status === 'heli' ? app.heliView?.() : null;
      section.hidden = !view;
      if (!view) { shown = []; radioLine = null; seenLog = null; return null; }
      // New events since the last frame become notices and radio subtitles.
      const log = app.heliLog || [];
      if (log !== seenLog) {
        const seen = new Set(seenLog || []);
        for (const event of log.filter(e => !seen.has(e))) {
          const text = noticeText(event);
          if (text) shown.push({text, until: now + NOTICE_SECONDS});
          if (event.type === 'radio' && HELI_RADIO_LINES[event.line]) radioLine = {text: HELI_RADIO_LINES[event.line].text, until: now + RADIO_SECONDS};
          if (event.type === 'crashed') radioLine = {text: HELI_RADIO_LINES['heli.radio.crash'].text, until: now + RADIO_SECONDS};
        }
        seenLog = log;
      }
      shown = shown.filter(item => item.until > now).slice(-3);
      const tank = app.profile?.heli;
      lastTop = set(top, instrumentsMarkup(view, {cameraIndex: app.heliCamera || 0}), lastTop);
      const controlsHtml = controlsMarkup(view, {credits: app.profile?.credits ?? 0, refuels: tank?.refuels ?? 0});
      if (controlsHtml.replace(PUMP_LABEL, '') === lastControls.replace(PUMP_LABEL, '')) {
        // Same span, new words: a press on the label is never lost.
        const span = controls.querySelector('.heli-pump-label');
        const words = controlsHtml.match(PUMP_LABEL)?.[0].replace(/<[^>]+>/g, '');
        if (span && words !== undefined && span.textContent !== words) span.textContent = words;
        lastControls = controlsHtml;
      } else lastControls = set(controls, controlsHtml, lastControls);
      lastNotices = set(notices, shown.map(item => `<p>${escape(item.text)}</p>`).join(''), lastNotices);
      const speaking = radioLine && radioLine.until > now;
      radio.hidden = !speaking;
      if (speaking && radio.dataset.text !== radioLine.text) { radio.dataset.text = radioLine.text; radio.innerHTML = `<b>RADIO</b> ${escape(radioLine.text)}`; }
      return view;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      section.removeEventListener('click', click);
      section.remove();
    },
  };
}
