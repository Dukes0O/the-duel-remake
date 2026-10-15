// The rescue line (docs/HELI_RESCUE.md sections 4 and 5.4): a rescuer riding
// H1's cable as an ordinary load, so the pendulum, drag and set-down rules all
// apply unchanged. This file holds the weights, the speed limits, the
// set-down and hold, the bumps, the handover and the supply crates. Pure and
// repeatable, step 1/120 s like the flight: no clock, no randomness. It never
// touches credits; it hands back the pay cuts and the pay for the session to
// use. Run stepRescue before stepCable each step.
import {HELI_STEP, horizontalSpeed} from './heli-flight.js';
import {CABLE, createLoad} from './heli-cable.js';

export const RESCUE = Object.freeze({
  id: 'rescue',
  rescuerKg: 90, casualtyKg: 80, pairKg: 170,
  // Airspeed with anyone on the line: the limit, and the speed Roger warns over.
  speedLimit: 20, warnSpeed: 25,
  // The warning is given again only after the helicopter slows below this.
  warnReset: 24,
  bumpSpeed: CABLE.hitSpeed, bumpCut: 300,
  // The rescuer on the ground within 3 m of the casualty or beacon, with the
  // helicopter and the rescuer both under 1.5 m/s.
  setDownRadius: 3, setDownSpeed: 1.5,
  // Seconds of hold by kind: strapping a driver in, digging out a skier.
  holds: Object.freeze({hoist: 8, avalanche: 12}),
  // Handover: inside a landing circle at 1 m/s or less.
  handoverRadius: CABLE.landingRadius, handoverSpeed: 1,
  // The clip point of a standing rescuer, above the ground.
  restHeight: 1.3,
});

// Supply crates (section 5.4). Starting masses by destination; RESCUE-SITES
// tunes them to the summit hut's real height. Every number lives here.
export const SUPPLY_CRATES = Object.freeze({
  summitRun: Object.freeze([
    Object.freeze({id: 'food', name: 'Food', massKg: 300}),
    Object.freeze({id: 'medicine', name: 'Medicine', massKg: 200}),
    // Tuned by RESCUE-SITES to Summit Run's real climb (start 2,860 m, the hut
    // 720 m higher): with a full tank the drums sink at full lift; with half a
    // tank they climb about 165 m a minute at the start and 60 near the hut.
    Object.freeze({id: 'fuel', name: 'Fuel drums', massKg: 820}),
  ]),
  // The fallback while Summit Run is not a destination: snow has shut the road at Tremblant Snow.
  tremblantSnow: Object.freeze([
    Object.freeze({id: 'food', name: 'Food', massKg: 400}),
    Object.freeze({id: 'medicine', name: 'Medicine', massKg: 500}),
    Object.freeze({id: 'fuel', name: 'Fuel drums', massKg: 900}),
  ]),
});
export const SUPPLY_PAY = Object.freeze({
  perCrate: 300,
  // Released from higher than 1 m (H1's drop rule) counts, but pays this much less.
  highCut: 150, dropFrom: CABLE.dropFrom,
  allCratesBonus: 100,
  // The hut yard: a clear circle this big, found near the summit hut.
  yardRadius: 10,
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const massOf = who => who === 'pair' ? RESCUE.pairKg : RESCUE.rescuerKg;

// The rescuer fitted at the pad: a load already on the hook, standing where
// the hook hangs, ready to ride the line. who: 'rescuer' alone, or 'pair'
// once the casualty is clipped on.
export function createRescueLine({x = 0, z = 0, heading = 0, ground = null} = {}) {
  const load = createLoad({id: RESCUE.id, massKg: RESCUE.rescuerKg, x, z, heading, ground, restHeight: RESCUE.restHeight});
  return Object.assign(load, {hooked: true, rescue: true, who: 'rescuer', hold: 0, holding: false,
    bumps: 0, fastWarned: false, done: false});
}

// Sets who is on the line and the mass the cable reads.
export function setLineWho(line, who) {
  line.who = who === 'pair' ? 'pair' : 'rescuer';
  line.massKg = massOf(line.who);
  return line.who;
}

// Anyone on the line, until the handover.
export const peopleOnLine = line => !!line && !!line.rescue && line.hooked && !line.done;

// H does nothing while people are on the line (a load or a list of loads).
export const hNothing = loads => [].concat(loads ?? []).some(peopleOnLine);

// One fitting at a time: a car, the bucket or the line. loads is everything
// in play at the pad. Returns {ok, reason}.
export function canFitLine(loads) {
  for (const load of [].concat(loads ?? [])) {
    if (!load) continue;
    if (load.rescue) return {ok: false, reason: 'The rescue line is already fitted.'};
    if (load.bucket) return {ok: false, reason: 'Take off the bucket first.'};
    if (load.hooked) return {ok: false, reason: 'Let go of the load first.'};
  }
  return {ok: true, reason: null};
}

// The share of the hold done, 0 to 1, for the digging bar.
export function holdFraction(line, kind) {
  const seconds = RESCUE.holds[kind];
  return seconds ? clamp(line.hold / seconds, 0, 1) : 0;
}

// One step of the line, before stepCable moves it. env: {ground, target
// {x, z}, kind 'hoist' | 'avalanche', zones [{x, z, radius}]}. Returns {events}:
//   rescueFast                      airspeed crossed 25 m/s with people aboard
//   holdStarted, holdReset (reason), holdDone, clipped
//   handover                        the pair set down in a landing circle
export function stepRescue(line, heli, {target = null, kind = null, zones = []} = {}, dt = HELI_STEP) {
  const events = [];
  if (!peopleOnLine(line)) return {events};

  // Speed warning: once per crossing of 25 m/s.
  const air = horizontalSpeed(heli);
  if (air > RESCUE.warnSpeed) {
    if (!line.fastWarned) { line.fastWarned = true; events.push({type: 'rescueFast', speed: air}); }
  } else if (air <= RESCUE.warnReset) line.fastWarned = false;

  const heliSpeed = air;
  const slide = Math.hypot(line.vx, line.vz);
  const still = line.onGround && !line.falling && slide <= RESCUE.setDownSpeed && heliSpeed <= RESCUE.setDownSpeed;

  // Set-down and hold: the rescuer at rest within 3 m of the casualty or beacon.
  const seconds = RESCUE.holds[kind];
  if (line.who === 'rescuer' && target && seconds) {
    const away = Math.hypot(line.x - target.x, line.z - target.z);
    let reason = null;
    if (!line.onGround || line.falling) reason = 'lifted';
    else if (slide > RESCUE.setDownSpeed || heliSpeed > RESCUE.setDownSpeed) reason = 'dragged';
    else if (away > RESCUE.setDownRadius) reason = 'away';
    if (reason) {
      if (line.holding) events.push({type: 'holdReset', reason});
      line.holding = false; line.hold = 0;
    } else {
      if (!line.holding) { line.holding = true; line.hold = 0; events.push({type: 'holdStarted', kind, seconds}); }
      line.hold += dt;
      if (line.hold >= seconds - 1e-9) {
        events.push({type: 'holdDone', kind, seconds});
        setLineWho(line, 'pair');
        line.holding = false; line.hold = 0;
        events.push({type: 'clipped', who: 'pair', massKg: line.massKg});
      }
    }
  } else if (line.who === 'pair' && still) {
    // Handover: set down at rest inside any landing circle.
    const speed = Math.hypot(line.vx, line.vy, line.vz);
    const index = speed <= RESCUE.handoverSpeed ? (zones ?? []).findIndex(zone =>
      Math.hypot(line.x - zone.x, line.z - zone.z) <= (zone.radius ?? RESCUE.handoverRadius)) : -1;
    if (index >= 0 && heliSpeed <= RESCUE.handoverSpeed) {
      line.done = true;
      events.push({type: 'handover', zone: index});
    }
  }
  return {events};
}

// An H1 cargoHit event from stepCable for the line: any hit faster than 4 m/s
// with people on it is a bump. Returns {bump, cut, bumps, event}; cut is the
// pay cut in credits (300). Credits are never touched here.
export function rescueHit(line, event) {
  if (!peopleOnLine(line) || event?.type !== 'cargoHit' || (event.id !== undefined && event.id !== line.id) ||
    !(event.speed > RESCUE.bumpSpeed)) return {bump: false, cut: 0, bumps: line?.bumps ?? 0, event: null};
  line.bumps++;
  return {bump: true, cut: RESCUE.bumpCut, bumps: line.bumps, event: {type: 'rescueBump', speed: event.speed, bumps: line.bumps}};
}

// The pay after the bumps: never below 0.
export const rescuePay = (basePay, bumps) => Math.max(0, Math.round(basePay) - RESCUE.bumpCut * Math.max(0, bumps | 0));

// A supply crate on the ground at (x, z), ready to hook, like the lesson
// crate. set: 'summitRun' or 'tremblantSnow'; massKg overrides the table
// (RESCUE-SITES tunes it to the hut's height).
export function createSupplyCrate({id, set = 'summitRun', massKg, x = 0, z = 0, heading = 0, ground = null}) {
  const entry = (SUPPLY_CRATES[set] ?? SUPPLY_CRATES.summitRun).find(crate => crate.id === id);
  if (!entry) throw new Error(`Unknown supply crate: ${id}`);
  const load = createLoad({id: entry.id, massKg: massKg ?? entry.massKg, x, z, heading, ground});
  return Object.assign(load, {supply: true, name: entry.name});
}

// Is this crate down in the yard: unhooked, at rest on the ground, inside
// the yard circle? Returns what cratePay reads: {released, dropMetres}.
// dropMetres is the height it fell from, 0 for a clean release (H1's drop rule).
export function crateResult(crate, yard) {
  const inside = !!yard && Math.hypot(crate.x - yard.x, crate.z - yard.z) <= (yard.radius ?? SUPPLY_PAY.yardRadius);
  const released = !!crate.supply && !crate.hooked && !crate.falling && crate.onGround && inside;
  return {released, dropMetres: released && crate.dropFrom > SUPPLY_PAY.dropFrom ? crate.dropFrom : 0};
}

// 300 credits a crate set down in the yard, 150 less when it was released
// from higher than 1 m. Nothing for a crate that is not down.
export function cratePay({released, dropMetres = 0}) {
  if (!released) return 0;
  return SUPPLY_PAY.perCrate - (dropMetres > SUPPLY_PAY.dropFrom ? SUPPLY_PAY.highCut : 0);
}

// The whole run: each crate's pay, plus 100 when all are down before the
// clock ends (1,000 for three clean ones). crates: [{released, dropMetres}].
export function supplyPay(crates, {inTime = true, count = 3} = {}) {
  const down = crates.filter(crate => crate.released).length;
  const crateTotal = crates.reduce((sum, crate) => sum + cratePay(crate), 0);
  const bonus = inTime && down >= count ? SUPPLY_PAY.allCratesBonus : 0;
  return {crates: crateTotal, bonus, total: crateTotal + bonus, down};
}
