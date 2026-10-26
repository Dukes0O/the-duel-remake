import {shelfMarkup} from './heli-logbook-ui.js';
// Kestrel One's instruments and the helicopter's page parts
// (docs/HELICOPTER.md section 8). Drawn in the page like the speedometer.
// Drawing only: it reads the app's helicopter view and log and never
// changes flight state; its buttons call the app's helicopter actions.
import {HELI_DESTINATIONS, HELI_DESTINATIONS_WITH_SUMMIT, HOME_COURSE, legFuelKg} from './heli-jobs.js';
import {HELI_CAMERA_VIEWS} from './heli-camera.js';
import {HELI_RADIO_LINES, SKI_RADIO_TEXT} from './heli-radio-lines.js';
import {HELI_MONEY} from './heli-save.js';
import {LESSON_RULES} from './heli-lessons.js';
import {createDispatchBoard, atHomePad} from './heli-board.js';
import {lessonBoardMarkup} from '../lessons/lesson-board.js';
import {isRescueKind} from './heli-missions.js';
// MAP-VIEW: the pilot's map screen.
import {createPilotMapUi, MAP_KEY} from './pilot-map-view.js';
import {placeOfCourse, placeById} from './pilot-map-data.js';
import {createSkiHud, skiBoardMarkup, skiMenuMarkup} from '../ski/ski-view.js'; // SKI-VIEW: the run HUD, the ski box and the run menu
import {CHALLENGE_RULES} from '../lab/lab-challenges.js'; // LAB-VIEW: the numbers the challenge line quotes
import {CARS, COURSE} from '../config.js';
import {isCourseUnlocked} from '../course-access.js';
import {CABLE} from './heli-cable.js';
import {atAnyPad} from './heli-board.js';

export const LESSON_TEXT = Object.freeze({
  liftoff: Object.freeze({name: '1 Lift-off', goal: 'Rise to 3 m and hold her there for 5 seconds.'}),
  hover: Object.freeze({name: '2 Hover', goal: 'Stay inside the circle, 2 to 5 m up, for 10 seconds.'}),
  landing: Object.freeze({name: '3 Landing', goal: 'Land on the H, slow and gentle.'}),
  carry: Object.freeze({name: '4 Carry and set down', goal: 'Hook the crate (H), carry it to the yellow circle, set it down gently and let go (H). Lower until the crate touches, then H.'}),
});

// What a rescue call is called, and why a rescue failed (docs/HELI_RESCUE.md section 3).
const RESCUE_WORDS = Object.freeze({hiker: 'Lost hiker', avalanche: 'Avalanche', hoist: 'Driver off the road', supply: 'Supply run'});
const FAIL_WORDS = Object.freeze({time: 'out of time', crash: 'a crash', left: 'left behind'});
const clockText = seconds => { const whole = Math.max(0, Math.ceil(seconds)); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; };

const fmt = (value, digits = 0) => Number.isFinite(value) ? value.toFixed(digits) : '-';
const escape = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const NOTICE_SECONDS = 4.5;
const RADIO_SECONDS = 6;
// A failed H press says what to fix in one line for two seconds (FIX-HELI-HOOK);
// a newer one replaces it. The session chose the reason; this only words it.
export const HOOK_HINT_SECONDS = 2;
export function hookHintText(event) {
  switch (event?.reason) {
    case 'bucket': return 'Take the bucket off at the pad';
    case 'rescueLine': return 'Take the rescue line off at the pad';
    case 'slowDown': return 'Slow down';
    case 'lower': return `Lower ${event.metres} m`;
    case 'higher': return `Higher ${event.metres} m`;
    case 'closer': return 'Closer';
    default: return null;
  }
}

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
  // MAP-VIEW: the map's places (Pacific Canyon, the Table...) have names too.
  const course = id => HELI_DESTINATIONS_WITH_SUMMIT[id]?.name ?? placeOfCourse(id)?.name ?? placeById(id)?.name ?? id;
  switch (event?.type) {
    case 'charged': {
      const what = {hardLanding: 'Hard landing', crash: 'Crash', drop: 'Dropped load', cargoLight: 'Cargo knock',
        cargoHeavy: 'Cargo hit', cargoWreck: 'Cargo wrecked', fuelTruck: 'Fuel truck', bucket: 'Bucket repair'}[event.kind] ?? 'Repair';
      return `${what}: ${event.charged} credits${event.forgiven ? ` (${event.forgiven} forgiven)` : ''}`;
    }
    case 'fuelBought': return event.cost ? `Fuel: ${fmt(event.kg, 1)} kg for ${event.cost} credits` : `Fuel: ${fmt(event.kg, 1)} kg, the first tank is free`;
    case 'cruiseRefused': return `Not enough fuel for that leg: it needs ${event.needKg} kg`;
    case 'cannotLift': return event.reason;
    case 'delivered': return `Delivered to ${course(event.courseId)}`;
    case 'hooked': return 'Hooked on';
    // The pilot's map secrets (MAP-SECRETS): a sign found from the air, Roger's call about the Table, the logbook.
    case 'secretFound': case 'tableSpotted': return event.text;
    case 'tableFound': return `${event.text} (${event.pay} credits)`;
    case 'hookRefused': return hookHintText(event);
    case 'entered': return event.arrived ? `${course(event.courseId)}: the landing zone is ahead` : course(event.courseId);
    case 'autopilotOff': return event.reason === 'pilot' ? 'Autopilot off: you have control' : null;
    case 'autopilotOn': return 'Autopilot on';
    case 'lessonPassed': return `Lesson passed: ${LESSON_TEXT[event.lesson]?.name ?? event.lesson}`;
    case 'lessonRetry': return event.reason ?? 'Not quite: have another go';
    case 'openingSkipped': return 'Lessons 1 and 2 marked done';
    case 'jobTaken': return 'Job taken';
    case 'jobDone': return `Job done: ${event.pay} credits`;
    // H2 Fire.
    case 'fireCall': return `Fire reported at ${course(event.courseId)}`;
    case 'fireAnswered': return 'Fire call answered';
    case 'bucketFitted': return 'Bucket fitted: hold H to pour';
    case 'bucketRemoved': return 'Bucket off';
    case 'bucketDamaged': return ['', 'Bucket dented: it leaks', 'Bucket torn: it leaks fast', 'Bucket ruined'][event.damage] ?? null;
    case 'fireOut': return `Fire out: ${event.paid.toLocaleString('en-US')} credits${event.firstBadge ? ' and the firefighter badge' : ''}`;
    case 'fireLost': return `The woods are lost: ${course(event.courseId)} is closed`;
    // H4 Rescue.
    case 'rescueCall': return `${RESCUE_WORDS[event.kind] ?? 'Rescue'} reported at ${course(event.courseId)}`;
    case 'rescueAnswered': return 'Rescue call answered';
    case 'rescueLater': return 'Put off: another crew may take it';
    case 'rescueTaken': return 'Another crew took the call';
    case 'rescueLineFitted': return 'Rescue line fitted';
    case 'rescueLineRemoved': return 'Rescue line off';
    case 'holdReset': return {lifted: 'Hold restarted: the rescuer lifted off. Lower gently onto the ground.',
      dragged: 'Hold restarted: moving too fast. Stop over the casualty and hold steady.',
      away: 'Hold restarted: too far away. Set the rescuer within 3 m of the casualty.'}[event.reason] ?? 'Hold restarted: set the rescuer down beside the casualty and stop.';
    case 'hikerSpotted': return 'Flare sighted';
    case 'hikerAboard': return 'Hiker aboard';
    case 'crateDown': return `Crate down: ${event.pay} credits`;
    case 'rescueDone': return `Rescue done: ${event.paid.toLocaleString('en-US')} credits${event.firstBadge ? ' and the rescue badge' : ''}`;
    case 'rescueFailed': return `Rescue failed, ${FAIL_WORDS[event.reason] ?? 'it is over'}${event.charged ? `: ${event.charged} credits` : ''}`;
    // SKI-VIEW: heli-skiing.
    case 'skiDropTaken': return 'Ski drop taken: fly to a drop pad at Summit Run';
    case 'skiGroupTaken': return `The group is aboard: ${event.pay.toLocaleString('en-US')} credits when they are home`;
    case 'skiGroupDone': return `Group home: ${event.pay.toLocaleString('en-US')} credits`;
    case 'skiFlightDropped': return 'Ski flight handed back';
    case 'skiStashPaid': return event.found ? `Untouched powder: ${event.paid} credits` : null;
    case 'waxChallengePassed': return 'Lab: the wax run is passed';
    case 'waxChallengeFailed': return `Lab wax run: ${event.reason}`;
    // LAB-VIEW: the Lab's challenges (docs/LAB.md 4.1).
    case 'challengeStarted': return `Challenge started: ${CHALLENGE_NAMES[event.challenge] ?? event.challenge}`;
    case 'challengePassed': return `Challenge passed: ${CHALLENGE_NAMES[event.challenge] ?? event.challenge}. See the Lab shop.`;
    case 'challengeRetry': return `Not yet: ${event.reason ?? 'try again'}`;
    case 'challengeStopped': return 'Challenge stopped';
    case 'buoyHit': return 'Buoy hit';
    default: return null;
  }
}

// LAB-VIEW: the Lab challenges' names, and the line shown while one is on (what to do, and how it is going).
const CHALLENGE_NAMES = Object.freeze({lift: 'Lift and weight', projectile: 'Projectile motion', fire: 'Fire triangle', pendulum: 'Pendulums',
  altitude: 'Air and altitude', headings: 'Headings and maps'});
export function challengeGoal(challenge) {
  const id = challenge?.id, rule = CHALLENGE_RULES[id];
  if (!rule) return '';
  switch (id) {
    case 'lift': return `Hover with the ${CARS[rule.carId]?.name ?? 'car'} on the hook for ${rule.holdSeconds} s, ${rule.low} to ${rule.high} m up, over the pad.`;
    case 'projectile': return `Hit the ${rule.buoys} buoys on the lake with water drops (within ${rule.hitRadius} m): ${(challenge.props ?? []).filter(p => p.hit).length}/${rule.buoys}.`;
    case 'fire': return `Keep the practice fire off the road for ${rule.seconds} s: ${Math.max(0, Math.ceil(rule.seconds - challenge.elapsed))} s to go.`;
    case 'pendulum': return `Carry the ${CARS[rule.carId]?.name ?? 'car'} ${rule.distance} m to the target. Set it down within ${rule.targetRadius} m, swinging under ${rule.swingMetres} m.`;
    case 'altitude': return `Fly the ${rule.crateKg} kg crate to Summit Run and land with ${Math.round(rule.fuelShare * 100)}% of the fuel left.`;
    case 'headings': return `Fly heading ${String(Math.round(challenge.briefing?.headingDeg ?? rule.headingDeg)).padStart(3, '0')} for ${Math.round(challenge.briefing?.distanceM ?? rule.distanceM)} m to the smoke. No arrow, no autopilot.`;
    default: return '';
  }
}
export function challengeMarkup(view) {
  if (!view?.challenge) return '';
  return `<div class="heli-challenge" role="group" aria-label="Lab challenge"><span>${escape((CHALLENGE_NAMES[view.challenge.id] ?? 'Challenge').toUpperCase())}</span>` +
    `<p>${escape(challengeGoal(view.challenge))}</p><button type="button" data-heli-challenge="stop">Stop the challenge</button></div>`;
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

// H2 Fire on the instruments (docs/HELI_FIRE.md sections 6.1 and 9): the
// answer prompt while a call rings, the fire line (bearing and distance to
// the nearest burning edge, share out, wind) and the bucket in words.
export function fireLineMarkup(view) {
  // A rescue call rings through the fire engine; the rescue line below says it.
  const fire = view?.fire && !(view.fire.call && isRescueKind(view.fire.call.kind)) ? view.fire : null, parts = [];
  if (fire?.call && !fire.call.answered && fire.answerLeft > 0)
    parts.push(`<span class="heli-fire-call"><b>FIRE CALL</b> <kbd>R</kbd> answer now · ${Math.ceil(fire.answerLeft)} s</span>`);
  else if (fire?.call && !fire.call.answered) parts.push('<span class="heli-fire-call">FIRE CALL WAITING <kbd>R</kbd></span>');
  else if (fire?.call) {
    const wind = fire.wind.speed < 1 ? 'wind light' : `wind ${fire.wind.name} ${Math.round(fire.wind.speed)}`;
    const where = fire.target && fire.courseId === view.courseId
      ? `FIRE ${String(Math.round(fire.target.bearing) % 360).padStart(3, '0')}° ${(fire.target.distance / 1000).toFixed(1)} km`
      : `FIRE AT ${escape((fire.courseName ?? '').toUpperCase())}`;
    parts.push(`<span class="heli-fire-line">${where} · ${fire.shareOut}% out · ${wind}</span>`);
  }
  if (view?.bucket) parts.push(`<span class="heli-bucket-words${view.bucket.aim?.locked ? ' locked' : ''}">Bucket: ${escape(view.bucket.words)}</span>`);
  return parts.length ? `<div class="heli-fire">${parts.join('')}</div>` : '';
}

// H4 Rescue on the instruments (docs/HELI_RESCUE.md section 7): the answer
// prompt while a call rings, the mission line under the compass (bearing and
// distance, the clock, orange in its last minute), the beacon's signal bar,
// the dig or hold bar, and the crates delivered. Nothing without the rescue view.
export function rescueLineMarkup(view) {
  const rescue = view?.rescue, parts = [];
  if (!rescue) return '';
  const call = rescue.call;
  if (call && rescue.active == null) {
    const what = `${escape(RESCUE_WORDS[call.kind] ?? 'Rescue')} at ${escape(call.courseName ?? 'the mountain')}`;
    parts.push(call.answerLeft > 0
      ? `<span class="heli-rescue-call"><b>RESCUE CALL</b> ${what} · <kbd>R</kbd> answer now · ${Math.ceil(call.answerLeft)} s</span>`
      : `<span class="heli-rescue-call">RESCUE CALL WAITING · ${what} <kbd>R</kbd></span>`);
  }
  const a = rescue.active;
  if (a) {
    const where = a.target && a.here
      ? `${a.refuelFirst ? 'FUEL TRUCK' : 'RESCUE'} ${String(Math.round(a.target.bearing) % 360).padStart(3, '0')}° ${(a.target.distance / 1000).toFixed(1)} km`
      : `RESCUE AT ${escape((a.courseName ?? '').toUpperCase())}`;
    parts.push(`<span class="heli-rescue-line${a.orange ? ' late' : ''}">${where} · ${clockText(a.left)}</span>`);
    if (a.refuelFirst) parts.push('<span class="heli-rescue-refuel">Refuel at the truck first</span>');
    else if (a.refuelStop === 'start') parts.push('<span class="heli-rescue-refuel">Refuel again at the pickup truck near the slide before the return flight.</span>');
    const instruction = a.refuelFirst ? null
      : a.stage === 'carry' && a.kind !== 'supply' ? 'Carry to the landing circle. Set down at 1 m/s or slower for the paramedics.'
      : (a.kind === 'avalanche' || a.kind === 'hoist') && !rescue.line ? 'Fit the rescue line at the home pad before flying to the casualty.'
      : !a.here ? `Fly to ${escape(a.courseName ?? 'the rescue course')}.`
      : a.kind === 'hiker' ? (a.sites?.hiker ? 'Land in the marked clearing. Wait for the hiker to walk over and board.' : 'Search the circle below 120 m. Fly parallel passes about 120 m apart; watch for an orange flare.')
      : a.kind === 'avalanche' ? 'Follow the faster beacon beeps. Fly down until the rescuer rests within 3 m of the beacon; stop and hold for 12 seconds.'
      : a.kind === 'hoist' ? 'Fly down until the rescuer rests within 3 m of the driver; stop and hold for 8 seconds.'
      : a.kind === 'supply' ? `${a.courseId === 'summit-run' ? 'Thin air: target 230 kg for food/medicine, 190 kg for fuel drums. ' : ''}H hooks a crate. Lower it onto the marked yard, then press H to let go. Deliver all three.` : null;
    if (instruction) parts.push(`<span class="heli-rescue-instruction">${instruction}</span>`);
    if (a.kind === 'supply') parts.push(`<span class="heli-rescue-crates">CRATES ${a.cratesDown}/${a.crates.length}</span>`);
    if (a.kind === 'avalanche' && a.here && a.stage !== 'carry') {
      const signal = a.signal;
      parts.push(signal?.heard
        ? `<span class="heli-rescue-signal"><em>BEACON</em><b><i style="width:${Math.round(signal.bar * 100)}%"></i></b></span>`
        : '<span class="heli-rescue-signal none"><em>BEACON</em> NO SIGNAL</span>');
    }
    const line = rescue.line;
    if (line?.holding && line.hold > 0)
      parts.push(`<span class="heli-rescue-hold"><em>${a.kind === 'avalanche' ? 'DIGGING' : 'HOLD STEADY'}</em><b><i style="width:${Math.round(line.hold * 100)}%"></i></b></span>`);
    if (a.kind !== 'supply' && a.condition > 0) parts.push(`<span class="heli-rescue-hurt${a.condition > 1 ? ' badly' : ''}">${a.condition > 1 ? 'BADLY HURT' : 'HURT'}</span>`);
  }
  return parts.length ? `<div class="heli-rescue">${parts.join('')}</div>` : '';
}

// How dark the light is (0 to 1): the hiker's last 3 minutes, drawing only.
export const duskShare = view => Math.max(0, Math.min(1, view?.rescue?.active?.dusk ?? 0));

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
    <span>${view.bucket ? 'POUR (hold)' : 'HOOK'} <kbd>H</kbd></span>${view.secrets !== undefined ? `<span>MAP <kbd>${MAP_KEY}</kbd></span>` : ''}
  </div>${fireLineMarkup(view)}${rescueLineMarkup(view)}`;
}

// HELI-LANDED: read-only arrival eligibility, shared by the panel and its actions.
export function landedArrival(view, profile = null) {
  if (!atAnyPad(view) || Math.hypot(view.heli.vx ?? 0, view.heli.vy ?? 0, view.heli.vz ?? 0) > CABLE.setDownSpeed ||
      view.lesson || view.challenge || view.job || view.rescue?.active || view.fire?.cells > 0 ||
      view.ski?.flight || view.ski?.run || view.survey?.taken) return null;
  const car = view.loads?.find(load => load.own && load.onGround && !load.hooked);
  const unavailable = new Set(view.loads?.filter(load => load.hooked || !load.onGround).map(load => load.id));
  return {courseId: view.courseId, carId: car?.id ?? Object.entries(profile?.heli?.carsAt ?? {}).find(([id, courseId]) => courseId === view.courseId && !unavailable.has(id))?.[0] ?? null};
}

export function arrivalMarkup(view, jobs = [], profile = null) {
  const arrival = landedArrival(view, profile);
  if (!arrival) return '';
  const place = HELI_DESTINATIONS_WITH_SUMMIT[arrival.courseId] ??
    COURSE.find(course => course.id === arrival.courseId) ?? placeOfCourse(arrival.courseId) ?? placeById(arrival.courseId);
  const localJobs = jobs.filter(job => !job.own && !job.done && !job.taken && (job.from ?? job.courseId) === arrival.courseId);
  const words = arrival.carId ? `Your ${CARS[arrival.carId]?.name ?? arrival.carId} is parked here.` :
    localJobs.length ? `Jobs here: ${localJobs.map(job => job.title).join('; ')}` : 'Nothing waiting here today';
  const canRace = COURSE.some(course => course.id === arrival.courseId) && (!profile || isCourseUnlocked(profile, arrival.courseId));
  const crate = view.returnLoad;
  const board = !crate ? '' : crate.done ? 'Nothing more today. The board fills again tomorrow.' :
    `${crate.title} · ${crate.massKg} kg · ${crate.payNow} credits. ${crate.sender} Hook the crate beside the pad to take it.`;
  return `<div class="heli-lessons heli-arrival" role="group" aria-label="Landed at ${escape(place?.name ?? arrival.courseId)}">
    <span>LANDED AT ${escape((place?.name ?? arrival.courseId).toUpperCase())}</span><p>${escape(words)}</p>
    ${board ? `<p>${escape(board)}</p>` : ''}
    <button type="button" data-heli-arrival="race" ${canRace ? '' : 'disabled'}>Race here</button>
    <button type="button" data-heli-arrival="shutdown">Shut down</button>${!canRace ? `<p>${COURSE.some(course => course.id === arrival.courseId) ? 'Unlock this course in the main menu to race here.' : 'There is no race course here.'}</p>` : ''}</div>`;
}

// Where to fly, the pump at home, and the cruise prompt.
export function controlsMarkup(view, {credits = 0, refuels = 0} = {}) {
  if (!view?.heli) return '';
  const here = view.courseId;
  const onPad = here === HOME_COURSE && view.heli.onGround && view.zone &&
    Math.hypot(view.heli.x - view.zone.x, view.heli.z - view.zone.z) <= view.zone.radius;
  // The places to fly to: the session's own list when it gives one (Summit Run on), else the usual three.
  const places = Array.isArray(view.destinations) ? view.destinations.map(id => HELI_DESTINATIONS_WITH_SUMMIT[id]).filter(Boolean) : Object.values(HELI_DESTINATIONS);
  const buttons = places.map(place => {
    const leg = place.id === here ? null : legFuelKg(here, place.id);
    const chosen = view.destination === place.id;
    return `<button type="button" class="heli-place${chosen ? ' on' : ''}" data-heli-destination="${place.id}" aria-pressed="${chosen}">${escape(place.name)}${place.id === here ? ' (here)' : leg ? ` · ${leg} kg` : ''}</button>`;
  }).join('');
  // The label changes as fuel burns; it sits in its own span so the panel
  // can update it without rebuilding the buttons under the mouse.
  const atTruck = view.heli.onGround && view.rescue?.active?.sites?.atTruck === true;
  const label = pumpLabel(view.heli.fuelKg, {credits, refuels: atTruck ? Math.max(1, refuels) : refuels});
  const pump = onPad || atTruck ? `<button type="button" class="heli-pump" data-heli-fuel="fill" ${label.disabled ? 'disabled' : ''}><span class="heli-pump-label">${label.text}</span></button>` : '';
  const truckTarget = atTruck ? `<label class="heli-fuel-target">Tank target
    <select data-heli-fuel-target aria-label="Fuel tank target">
      ${[190, 230, 330, 360, 400].map(kg => `<option value="${kg}"${kg === 330 ? ' selected' : ''}>${kg} kg</option>`).join('')}
    </select></label><button type="button" data-heli-fuel="target">REFUEL TO TARGET</button>` : '';
  const destination = view.destination ? HELI_DESTINATIONS_WITH_SUMMIT[view.destination]?.name : null;
  // MAP-VIEW: with the pilot's map on, the route panel also opens it (the view carries `secrets` only then).
  const mapButton = view.secrets !== undefined ? `<button type="button" class="heli-map-open" data-heli-map="open">PILOT'S MAP <kbd>${MAP_KEY}</kbd></button>` : '';
  return `<div class="heli-route" role="group" aria-label="Fly to"><span>FLY TO</span>${buttons}${mapButton}${pump}${truckTarget}</div>
    ${view.cruiseOffered ? `<div class="heli-prompt" role="status">Clear of the area. Press <kbd>ENTER</kbd> to cruise to ${escape(destination)}.</div>` : ''}${challengeMarkup(view)}`;
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

// The instructor's board on the home pad, or the lesson running now.
// driving (DRIVE-LESSON-HELIPAD): {rows, notes} from the app, the same Driving rows the menu's
// board shows; left out, the board is exactly the helicopter's own.
export function lessonsMarkup(view, board, {opening = false, driving = null, lab = false} = {}) {
  if (!view?.heli) return '';
  if (view.lesson) {
    const rules = LESSON_RULES[view.lesson.id], text = LESSON_TEXT[view.lesson.id];
    // The bar's width is set in place each frame (holdShare), so the panel
    // and its Stop button are not rebuilt while the bar moves.
    const guidance = view.lesson.guidance;
    const crate = guidance ? `<p class="heli-carry-guidance">${guidance.ready ? 'On the mark. Press H to let go.' : `Crate: ${Math.round(guidance.distance)} m from the centre · ${Math.round(guidance.height)} m up`}</p>` : '';
    const hold = rules?.holdSeconds ? '<div class="heli-lesson-hold"><span></span></div>' : '';
    return `<div class="heli-lessons heli-lesson-on" role="group" aria-label="Lesson"><span>LESSON ${escape(text.name.toUpperCase())}</span>
      <p>${escape(text.goal)}</p>${crate}${hold}<button type="button" data-heli-lesson="stop">Stop the lesson</button></div>`;
  }
  if (!atHomePad(view) || !board?.length) return '';
  const rows = board.map(item => ({group: 'Helicopter', id: item.id, name: LESSON_TEXT[item.id].name, open: item.open, done: item.done}));
  const drivingRows = driving?.rows?.length ? driving.rows : [];
  const notes = drivingRows.length ? (driving.notes ?? []).map(note => `<p class="heli-lesson-note">${escape(note)}</p>`).join('') : '';
  return `<div class="heli-lessons" role="group" aria-label="Instructor"><span>INSTRUCTOR</span>${lessonBoardMarkup([...rows, ...drivingRows], {action: 'data-heli-lesson'})}${notes}${
    opening ? '<button type="button" class="heli-skip" data-heli-lesson="skip">Skip the opening (marks lessons 1 and 2 done)</button>' : ''}${
    lab ? '<button type="button" class="heli-lab-door" data-heli-lab="door">The Lab: benches, challenges and the shop →</button>' : ''}</div>`; // LAB-VIEW: the Lab door
}

// How far through a lesson's hold the pilot is, 0 to 1.
export function holdShare(view) {
  const seconds = LESSON_RULES[view?.lesson?.id]?.holdSeconds;
  return seconds ? Math.min(1, Math.max(0, view.lesson.held / seconds)) : 0;
}

export function createHeliUi({host, app}) {
  const doc = host.ownerDocument, section = doc.createElement('section');
  section.className = 'heli-panel';
  section.hidden = true;
  section.setAttribute('aria-label', 'Kestrel One');
  section.innerHTML = '<div class="heli-top"></div><div class="heli-side"><div class="heli-shelf-host"></div><div class="heli-arrival-host"></div><div class="heli-ski-host"></div><div class="heli-controls"></div><div class="heli-lessons-host"></div><div class="heli-board-host" hidden></div></div><div class="heli-notices" aria-live="polite"></div><div class="heli-radio" aria-live="polite" hidden></div>';
  host.append(section);
  const top = section.querySelector('.heli-top'), controls = section.querySelector('.heli-controls');
  const notices = section.querySelector('.heli-notices'), radio = section.querySelector('.heli-radio');
  let seenLog = null, shown = [], radioLine = null, lastTop = '', lastControls = '', lastNotices = '', disposed = false;
  const lessonsHost = section.querySelector('.heli-lessons-host');
  const arrivalHost = section.querySelector('.heli-arrival-host');
  let lastArrival = '', lastShelf = '';
  const shelf = section.querySelector('.heli-shelf-host');
  const boardHost = section.querySelector('.heli-board-host');
  const board = createDispatchBoard({root: boardHost, app});
  let pilotMap = null; // MAP-VIEW: made the first time the view carries the pilot's map (never with the switch off)
  let lastLessons = '';
  // SKI-VIEW: the ski box (home pad) and run menu (drop pads) at the top of the side panel, and the run HUD (made on the
  // first ski event or frame on skis).
  const skiHost = section.querySelector('.heli-ski-host');
  let skiHud = null, skiWax = null, lastSki = '';
  const hud = () => skiHud ??= createSkiHud({host, app});
  // The wax picked here goes with a run only with the Wax kit; the Lab's wax run always takes it.
  const skiAction = button => {
    const {skiBoard: boardAction, skiRun, skiWax: wax, skiChallenge} = button.dataset;
    if (wax) { skiWax = skiWax === wax ? null : wax; return null; }
    if (boardAction) return app.heliSki?.(boardAction === 'drop' ? 'drop' : boardAction === 'group' ? 'group' : 'handBack');
    if (skiRun) return app.heliSki?.('stepOut', skiRun, {wax: app.heliSession?.skiOffers?.()?.kit ? skiWax : null});
    if (skiChallenge) return app.heliSki?.('stepOut', 'slalom', {wax: skiWax, challenge: skiChallenge});
    return null;
  };
  const lessonAction = action => {
    const session = app.heliSession;
    if (!session) return;
    // A Driving row starts the driving lesson, from the pad, through the app (the helicopter visit ends).
    const driving = action.startsWith('start:') ? app.heliDrivingBoard?.()?.rows.find(row => row.id === action.slice(6)) : null;
    const result = driving ? app.heliStartDriving(driving.id) : action === 'stop' ? session.stopLesson() : action === 'skip' ? session.skipOpening()
      : action.startsWith('start:') ? session.startLesson(action.slice(6)) : null;
    if (result && result.ok === false && result.reason) shown.push({text: result.reason, until: performance.now() / 1000 + NOTICE_SECONDS});
    if (app.heliSession === session) app._heliEvents?.(session.takeEvents());
  };
  const click = event => {
    if (event.target.closest('[data-logbook-dismiss]')) { app.heliSession?.dismissRank(); return; }
    const paint = event.target.closest('[data-logbook-paint]');
    if (paint) { app.heliSession?.wearLogbookPaint(paint.dataset.logbookPaint); return; }

    const arrivalButton = event.target.closest('[data-heli-arrival]');
    if (arrivalButton) { app.heliLanded?.(arrivalButton.dataset.heliArrival); return; }
    const skiButton = event.target.closest('[data-ski-board],[data-ski-run],[data-ski-wax],[data-ski-challenge]');
    if (skiButton) {
      const result = skiAction(skiButton);
      if (result && result.ok === false && result.reason) shown.push({text: result.reason, until: performance.now() / 1000 + NOTICE_SECONDS});
      skiButton.blur();
      return;
    }
    const lessonButton = event.target.closest('[data-heli-lesson]');
    if (lessonButton) { lessonAction(lessonButton.dataset.heliLesson); lessonButton.blur(); return; }
    if (event.target.closest('[data-heli-map]')) { app.setHeliMap?.(true); event.target.closest('[data-heli-map]').blur(); return; } // MAP-VIEW
    const place = event.target.closest('[data-heli-destination]');
    if (place) { app.heliSetDestination?.(place.dataset.heliDestination); place.blur(); return; }
    // LAB-VIEW: the Lab door leaves the helipad for the Lab; the challenge line's Stop button ends a challenge.
    const door = event.target.closest('[data-heli-lab]');
    if (door) { app.labFromHeli?.(); return; }
    const stopChallenge = event.target.closest('[data-heli-challenge]');
    if (stopChallenge) { app.heliSession?.stopChallenge?.(); app._heliEvents?.(app.heliSession?.takeEvents?.() ?? []); return; }
    const pump = event.target.closest('[data-heli-fuel]');
    if (pump) {
      const target = pump.dataset.heliFuel === 'target' ? Number(controls.querySelector('[data-heli-fuel-target]')?.value) : null;
      const fuel = app.heliView?.()?.heli?.fuelKg ?? 0;
      if (target !== null && target - fuel < 0.1) {
        shown.push({text: `The tank already has ${fmt(fuel)} kg. Choose a higher target.`, until: performance.now() / 1000 + NOTICE_SECONDS});
        pump.blur(); return;
      }
      const kg = target === null ? Infinity : target - fuel;
      const result = app.heliBuyFuel?.(kg);
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
      if (view?.secrets !== undefined) (pilotMap ??= createPilotMapUi({host, app})).update(view); else pilotMap?.update(view); // MAP-VIEW
      section.hidden = !view;
      if (!view) { shown = []; radioLine = null; seenLog = null; skiHud?.update(null, now); return null; }
      // New events since the last frame become notices and radio subtitles.
      const log = app.heliLog || [];
      if (log !== seenLog) {
        const seen = new Set(seenLog || []);
        for (const event of log.filter(e => !seen.has(e))) {
          const text = noticeText(event);
          if (event.type.startsWith('ski')) hud().event(event);
          if (text && event.type === 'hookRefused') {
            shown = shown.filter(item => !item.hint);
            shown.push({text, until: now + HOOK_HINT_SECONDS, hint: true});
          } else if (text) shown.push({text, until: now + NOTICE_SECONDS});
          if (event.type === 'radio') {
            const text = SKI_RADIO_TEXT[event.line] ?? HELI_RADIO_LINES[event.line]?.text;
            if (text) radioLine = {text, until: now + RADIO_SECONDS};
          }
          if (event.type === 'crashed') radioLine = {text: HELI_RADIO_LINES['heli.radio.crash'].text, until: now + RADIO_SECONDS};
        }
        seenLog = log;
      }
      shown = shown.filter(item => item.until > now).slice(-3);
      lastShelf = set(shelf, shelfMarkup(view), lastShelf);
      const tank = app.profile?.heli;
      // Dusk over the hiker's last 3 minutes: the panel's dimming layer (CSS), set only when it falls.
      const dusk = duskShare(view);
      if (dusk > 0) { section.dataset.dusk = 'on'; section.style.setProperty('--heli-dusk', dusk.toFixed(3)); }
      else if (section.dataset.dusk) { delete section.dataset.dusk; section.style.removeProperty('--heli-dusk'); }
      // SKI-VIEW: on skis the instruments, routes, lessons and board give way to the run HUD.
      if (arrivalHost) lastArrival = set(arrivalHost, arrivalMarkup(view, app.heliSession?.boardJobs?.() ?? [], app.profile), lastArrival);
      const skiing = view.phase === 'skiing';
      (skiing ? hud() : skiHud)?.update(view, now);
      top.hidden = skiing; controls.hidden = skiing; lessonsHost.hidden = skiing;
      const offers = !skiing ? app.heliSession?.skiOffers?.() ?? null : null;
      if (offers) hud().snow = offers.snow;
      else skiWax = null;
      const skiBox = skiing ? '' : offers ? skiMenuMarkup(offers, {wax: skiWax})
        : !view.lesson && atHomePad(view) ? skiBoardMarkup(app.heliSession?.skiBoard?.() ?? null, view.ski?.flight ?? null) : '';
      if (skiBox) hud(); // its stylesheet styles the box too
      if (skiHost) lastSki = set(skiHost, skiBox, lastSki);
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
      const lessonBoard = app.heliSession?.lessonBoard?.() ?? [];
      lastLessons = set(lessonsHost, lessonsMarkup(view, lessonBoard, {opening: lessonBoard.length > 0 && lessonBoard.every(item => !item.done),
        driving: !view.lesson && atHomePad(view) ? app.heliDrivingBoard?.() ?? null : null, lab: app.labAvailable?.() === true}), lastLessons);
      const bar = lessonsHost.querySelector('.heli-lesson-hold span');
      if (bar) { const width = `${(holdShare(view) * 100).toFixed(0)}%`; if (bar.style.width !== width) bar.style.width = width; }
      // The dispatch board opens with lesson 3 and hides while a lesson runs.
      if (!view.lesson && !skiing && app.profile?.heli?.lessons?.landing) board.render(); else boardHost.hidden = true;
      const speaking = radioLine && radioLine.until > now;
      radio.hidden = !speaking;
      if (speaking && radio.dataset.text !== radioLine.text) { radio.dataset.text = radioLine.text; radio.innerHTML = `<b>RADIO</b> ${escape(radioLine.text)}`; }
      return view;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      section.removeEventListener('click', click);
      board.dispose();
      pilotMap?.dispose(); // MAP-VIEW
      skiHud?.dispose();
      section.remove();
    },
  };
}
