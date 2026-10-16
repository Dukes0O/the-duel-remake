// The rescue line (docs/HELI_RESCUE.md sections 4 and 5.4): a rescuer riding
// H1's cable as an ordinary load, so the pendulum, drag and set-down rules all
// apply unchanged. This file holds the weights, the speed limits, the
// set-down and hold, the casualty's condition, the handover and the supply
// crates. Pure and repeatable, step 1/120 s like the flight: no clock, no
// randomness. It never touches credits; it hands back the pay for the session
// to use. Run stepRescue before stepCable each step.
import {HELI_STEP, KESTREL, horizontalSpeed} from './heli-flight.js';
import {CABLE, createLoad, hookPoint, hook} from './heli-cable.js';

export const RESCUE = Object.freeze({
  id: 'rescue',
  rescuerKg: 90, casualtyKg: 80, pairKg: 170,
  // Airspeed with anyone on the line: the limit, and the speed Roger warns over.
  speedLimit: 20, warnSpeed: 25,
  // The warning is given again only after the helicopter slows below this.
  warnReset: 24,
  // A bump on the line hurts the casualty one step; harder than 8 m/s, two.
  bumpSpeed: CABLE.hitSpeed, bumpHardSpeed: CABLE.heavyHit,
  // On the medevac skin's stretcher (section 6.1): only above 8 m/s, two
  // steps only above 14.
  stretcherBumpSpeed: CABLE.heavyHit, stretcherHardSpeed: CABLE.wreckHit,
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

// People can get hurt, never killed (section 4.1, Kyle 15 October 2026).
// Every casualty starts unhurt; the rescuer is a professional and is never
// hurt. Pay at the handover by condition: 100%, 60%, 25%.
export const CONDITIONS = Object.freeze(['unhurt', 'hurt', 'badly']);
export const CONDITION_PAY = Object.freeze({unhurt: 1, hurt: 0.6, badly: 0.25});
// Still unhurt when the clock passes two thirds: they get cold, and hurt.
export const COLD_SHARE = 2 / 3;
// A failed rescue: the ground team brings them out badly hurt (section 4.2).
export const FAILED_CONDITION = 'badly';

// One or more steps worse, never past badly hurt.
export function worsen(condition, steps = 1) {
  const at = Math.max(0, CONDITIONS.indexOf(condition));
  return CONDITIONS[Math.min(CONDITIONS.length - 1, at + Math.max(0, Math.floor(steps) || 0))];
}

// The clock: an unhurt casualty becomes hurt once two thirds of the time is
// gone (cold says Roger's "getting cold" line plays). Once only.
export function waitHurt(condition, elapsed, limit) {
  if (condition !== 'unhurt' || !(limit > 0) || !(elapsed >= limit * COLD_SHARE)) return {condition, cold: false};
  return {condition: 'hurt', cold: true};
}

// The hiker in the cabin: an H1 hard landing hurts them one step; a crash
// makes them badly hurt. event is an H1 flight event.
export function cabinHurt(condition, event) {
  if (event?.type === 'crash') return {condition: 'badly', changed: condition !== 'badly'};
  if (event?.type === 'touchdown' && event.result === 'hard') {
    const next = worsen(condition);
    return {condition: next, changed: next !== condition};
  }
  return {condition, changed: false};
}

// What the handover looks and sounds like: they walk, limp beside a
// paramedic, or are carried on a stretcher; Roger says which.
export function handoverOutcome(condition) {
  if (condition === 'badly') return {look: 'stretcher', line: 'heli.radio.rescue.badly'};
  if (condition === 'hurt') return {look: 'limp', line: 'heli.radio.rescue.hurt'};
  return {look: 'walk', line: 'heli.radio.rescue.done'};
}

// Supply crates (section 5.4). Starting masses by destination; RESCUE-SITES
// tunes them to the summit hut's real height. Every number lives here.
export const SUPPLY_CRATES = Object.freeze({
  summitRun: Object.freeze([
    Object.freeze({id: 'food', name: 'Food', massKg: 300}),
    Object.freeze({id: 'medicine', name: 'Medicine', massKg: 200}),
    // Tuned by RESCUE-SITES to the thin air at Summit Run's pickup, below
    // the avalanche (about 3,430 m; the hut yard is 150 m higher): with a full
    // tank the drums do not climb; with half a tank they do, there and at the yard.
    Object.freeze({id: 'fuel', name: 'Fuel drums', massKg: 640}),
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
  // The hut yard: a clear circle of this radius near the summit hut (a
  // "10 m circle", radius as in H1's 12 m landing circle).
  yardRadius: 10,
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
const massOf = who => who === 'pair' ? RESCUE.pairKg : RESCUE.rescuerKg;

// The rescuer fitted at the pad: a load already on the hook, standing where
// the hook hangs, ready to ride the line. who: 'rescuer' alone, or 'pair'
// once the casualty is clipped on.
export function createRescueLine({x = 0, z = 0, heading = 0, ground = null} = {}) {
  const load = createLoad({id: RESCUE.id, massKg: RESCUE.rescuerKg, x, z, heading, ground, restHeight: RESCUE.restHeight});
  return Object.assign(load, {hooked: true, rescue: true, who: 'rescuer', hold: 0, holding: false, overFor: 0,
    condition: 'unhurt', fastWarned: false, done: false, lifted: false, airSpeed: 0, landSpeed: 0, wasOnGround: true});
}

// Sets who is on the line and the mass the cable reads.
export function setLineWho(line, who) {
  line.who = who === 'pair' ? 'pair' : 'rescuer';
  line.massKg = massOf(line.who);
  return line.who;
}

// Anyone on the line: the rescuer rides it home after the handover too, so
// the speed limit and "H does nothing" last until the line is taken off at
// the pad. done marks the handover: the rescue is paid and nothing changes
// the casualty's condition after it.
export const peopleOnLine = line => !!line && !!line.rescue && line.hooked;

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

// A hold forgives a moment over the limits (a wobble near 1.5 m/s or a
// bounce): it resets only after this long over them.
const HOLD_GRACE = 0.25;

// One step of the line, before stepCable moves it. env: {ground, target
// {x, z}, kind 'hoist' | 'avalanche', zones [{x, z, radius}]}. Returns {events}:
//   rescueFast                      airspeed crossed 25 m/s with people aboard
//   holdStarted, holdReset (reason), holdDone, clipped
//   roughSetDown                    the pair came down harder than 1 m/s: one step worse
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
  // How hard the line last came down: its speed on the step before it
  // touched the ground (the cable moves it after this step).
  if (!line.onGround) { line.airSpeed = Math.hypot(line.vx, line.vy, line.vz); if (line.who === 'pair') line.lifted = true; }
  else if (!line.wasOnGround) {
    line.landSpeed = line.airSpeed;
    // Setting the pair down harder than the handover's 1 m/s hurts them one
    // step, unless the cable already counted this touchdown as a ground bump
    // (rescueHit marks it), so one touchdown is never counted twice.
    if (line.who === 'pair' && line.lifted && !line.done && !(line.groundHitSteps > 0) &&
      line.landSpeed > RESCUE.handoverSpeed) {
      line.condition = worsen(line.condition);
      events.push({type: 'roughSetDown', speed: line.landSpeed, condition: line.condition});
    }
  }
  // The ground-bump mark lasts the touchdown it belongs to.
  if (line.groundHitSteps > 0) line.groundHitSteps--;
  line.wasOnGround = line.onGround;
  if (line.done) return {events};
  const still = line.onGround && !line.falling && slide <= RESCUE.setDownSpeed && heliSpeed <= RESCUE.setDownSpeed;

  // Set-down and hold: the rescuer at rest within 3 m of the casualty or beacon.
  const seconds = RESCUE.holds[kind];
  if (line.who === 'rescuer' && target && seconds) {
    const away = Math.hypot(line.x - target.x, line.z - target.z);
    let reason = null;
    if (!line.onGround || line.falling) reason = 'lifted';
    else if (slide > RESCUE.setDownSpeed || heliSpeed > RESCUE.setDownSpeed) reason = 'dragged';
    else if (away > RESCUE.setDownRadius) reason = 'away';
    if (reason && (!line.holding || (line.overFor += dt) >= HOLD_GRACE)) {
      if (line.holding) events.push({type: 'holdReset', reason});
      line.holding = false; line.hold = 0; line.overFor = 0;
    } else if (!reason) {
      if (!line.holding) { line.holding = true; line.hold = 0; events.push({type: 'holdStarted', kind, seconds}); }
      line.overFor = 0;
      line.hold += dt;
      if (line.hold >= seconds - 1e-9) {
        events.push({type: 'holdDone', kind, seconds});
        setLineWho(line, 'pair');
        line.holding = false; line.hold = 0;
        events.push({type: 'clipped', who: 'pair', massKg: line.massKg});
      }
    }
  } else if (line.who === 'pair' && still && line.lifted && line.landSpeed <= RESCUE.handoverSpeed) {
    // Handover: the pair carried and set down gently (1 m/s or less) inside
    // a landing circle. The casualty goes to the paramedics; the rescuer
    // rides the line home.
    const speed = Math.hypot(line.vx, line.vy, line.vz);
    const index = speed <= RESCUE.handoverSpeed ? (zones ?? []).findIndex(zone =>
      Math.hypot(line.x - zone.x, line.z - zone.z) <= (zone.radius ?? RESCUE.handoverRadius)) : -1;
    if (index >= 0 && heliSpeed <= RESCUE.handoverSpeed) {
      line.done = true;
      setLineWho(line, 'rescuer');
      events.push({type: 'handover', zone: index});
    }
  }
  return {events};
}

// An H1 cargoHit event from stepCable for the line: striking terrain, a tree
// or a building faster than 4 m/s with the casualty on it is a bump (the line
// swinging into the helicopter is not): one step worse, two above 8 m/s,
// until the handover. The rescuer alone is never hurt, so a bump before the
// casualty is clipped on changes nothing. With the medevac skin's
// stretcher ({stretcher: true}) a bump starts above 8 m/s and is two steps
// above 14. Returns {bump, steps, condition, event}. Credits are never
// touched here.
export function rescueHit(line, event, {stretcher = false, gear = null} = {}) {
  const none = {bump: false, steps: 0, condition: line?.condition ?? 'unhurt', event: null};
  // The worn stretcher's numbers (heli-skins.js gearStats) win; the base kit
  // has none (null), and the older stretcher flag keeps its own pair.
  const geared = Number.isFinite(gear?.bumpHurtAbove) && Number.isFinite(gear?.bumpTwoStepsAbove);
  const bumpAt = geared ? gear.bumpHurtAbove : stretcher ? RESCUE.stretcherBumpSpeed : RESCUE.bumpSpeed;
  const hardAt = geared ? gear.bumpTwoStepsAbove : stretcher ? RESCUE.stretcherHardSpeed : RESCUE.bumpHardSpeed;
  if (!peopleOnLine(line) || line.done || line.who !== 'pair' || event?.type !== 'cargoHit' || event.with === 'helicopter' ||
    (event.id !== undefined && event.id !== line.id)) return none;
  // A ground hit is this touchdown's whole count: no rough set-down on top.
  if (event.with === 'ground') line.groundHitSteps = 2;
  if (!(event.speed > bumpAt)) return none;
  const steps = event.speed > hardAt ? 2 : 1;
  line.condition = worsen(line.condition, steps);
  return {bump: true, steps, condition: line.condition,
    event: {type: 'rescueBump', speed: event.speed, steps, condition: line.condition}};
}

// The pay by the casualty's condition at the handover: 100%, 60% or 25%,
// rounded to a whole credit, never below 0 and never above the base. A base
// that is not a finite number pays 0; an unknown condition pays as badly hurt.
// A bonus (the medevac skin's stretcher, hoistBonus) is added once, whole, to a
// rescue that pays something; it is not cut by the casualty's condition.
export function rescuePay(basePay, condition, bonus = 0) {
  const base = Number.isFinite(basePay) ? Math.max(0, basePay) : 0;
  const share = Object.hasOwn(CONDITION_PAY, condition) ? CONDITION_PAY[condition] : CONDITION_PAY.badly;
  const extra = base > 0 && Number.isFinite(bonus) && bonus > 0 ? Math.floor(bonus) : 0;
  return Math.min(Math.floor(base), Math.round(base * share)) + extra;
}

// The stretcher's extra pay (gear.hoistPayBonus) for a rescue of this kind:
// hoist rescues only; every other kind, and the base kit, add nothing.
export const hoistBonus = (gear, kind) => kind === 'hoist' && Number.isFinite(gear?.hoistPayBonus) ? Math.max(0, gear.hoistPayBonus) : 0;

// A supply crate on the ground at (x, z), ready to hook, like the lesson
// crate. set: 'summitRun' or 'tremblantSnow'; massKg overrides the table
// (RESCUE-SITES tunes it to the hut's height).
export function createSupplyCrate({id, set = 'summitRun', massKg, x = 0, z = 0, heading = 0, ground = null}) {
  const entry = (SUPPLY_CRATES[set] ?? SUPPLY_CRATES.summitRun).find(crate => crate.id === id);
  if (!entry) throw new Error(`Unknown supply crate: ${id}`);
  const load = createLoad({id: entry.id, massKg: massKg ?? entry.massKg, x, z, heading, ground});
  return Object.assign(load, {supply: true, name: entry.name});
}

// Remember how the crate was last let go (from the cable's released or
// releasedHigh event), so its pay reads this release, not an older one.
export function noteCrateRelease(crate, event) {
  if (event?.type === 'released') crate.releaseDrop = 0;
  else if (event?.type === 'releasedHigh') crate.releaseDrop = event.heightM;
  return crate.releaseDrop ?? 0;
}

// Is this crate down in the yard: unhooked, at rest on the ground, inside
// the yard circle? Returns what cratePay reads: {released, dropMetres}:
// the height of its last release, 0 for a clean one (H1's drop rule).
export function crateResult(crate, yard) {
  const inside = !!yard && Math.hypot(crate.x - yard.x, crate.z - yard.z) <= (yard.radius ?? SUPPLY_PAY.yardRadius);
  const released = !!crate.supply && !crate.hooked && !crate.falling && crate.onGround && inside;
  const drop = crate.releaseDrop ?? 0;
  return {released, dropMetres: released && drop > SUPPLY_PAY.dropFrom ? drop : 0};
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

// ---- the cargo net (supply skin, docs/HELI_WILDLIFE.md section 5.3) ----------
// With the net worn (gear.crates is 2) hooking up takes the nearest two crates
// within 10 m of the hook point in one go. The nearest is the cable's load (the
// pendulum, drag and set-down all apply); the other is carried along with it
// and its weight adds to the load's. The hook limit is unchanged
// (gear.hookLimitKg) and covers the total: if two would be too heavy, only the
// nearest is taken. Each crate is still paid on its own. The base kit hooks one
// crate within the hook's own reach and none of the net is reached.
export const NET_REACH = 10;

// The crates aboard a carrier, the one on the hook first.
export const netCrates = carrier => [carrier, ...(carrier?.netCrates ?? [])];

const flatGap = (at, crate) => Math.hypot(at.x - crate.x, at.z - crate.z);

// Can this crate join the net of a crate already on the hook? It must be a
// supply crate resting on the ground within 10 m of the hook point (hookAt,
// the carrier's own place if not given), there must be room in the net, and
// the weights together must stay under the hook limit. Returns {ok, reason}.
export function canNetCrate(carrier, crate, gear, hookAt = carrier) {
  const aboard = netCrates(carrier), room = Number.isFinite(gear?.crates) ? gear.crates : 1;
  if (!carrier?.supply || !carrier.hooked) return {ok: false, reason: 'Hook a crate first.'};
  if (!crate?.supply || crate === carrier || crate.hooked || aboard.includes(crate)) return {ok: false, reason: 'That is not a crate to net.'};
  if (aboard.length >= room) return {ok: false, reason: 'The net is full.'};
  if (!crate.onGround || crate.falling) return {ok: false, reason: 'The crate must be on the ground.'};
  if (flatGap(hookAt, crate) > NET_REACH) return {ok: false, reason: 'Too far to net.'};
  const limit = Number.isFinite(gear?.hookLimitKg) ? gear.hookLimitKg : KESTREL.hookLimitKg;
  if (aboard.reduce((sum, one) => sum + (one === carrier ? carrier.ownKg ?? carrier.massKg : one.massKg), 0) + crate.massKg > limit)
    return {ok: false, reason: 'Too heavy for the hook.'};
  return {ok: true, reason: null};
}

// Puts the crate in the net: the carrier's mass becomes its own plus the net's.
export function netCrate(carrier, crate, gear, hookAt = carrier) {
  const check = canNetCrate(carrier, crate, gear, hookAt);
  if (!check.ok) return check;
  carrier.ownKg ??= carrier.massKg;
  (carrier.netCrates ??= []).push(crate);
  crate.netted = true;
  crate.hooked = true;
  crate.onGround = false;
  carrier.massKg = carrier.ownKg + carrier.netCrates.reduce((sum, one) => sum + one.massKg, 0);
  return {ok: true, reason: null, massKg: carrier.massKg};
}

// Hooking up on a supply run: the nearest crate within reach goes on the hook
// (the hook's own reach, or 10 m with the net worn), then, with the net, the
// next nearest within 10 m joins it if the weights stay under the hook limit.
// gear is gearStats plus the winch's lineLength if any. Ties go to the crate
// whose id sorts first. Returns {ok, event, carrier, crates} or {ok: false}.
export function hookCrates(heli, crates, gear) {
  const net = (Number.isFinite(gear?.crates) ? gear.crates : 1) >= 2;
  const at = hookPoint(heli, gear);
  const near = [...crates].filter(crate => crate?.supply && !crate.hooked && crate.onGround && !crate.falling)
    .sort((a, b) => flatGap(at, a) - flatGap(at, b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const first = near[0];
  if (!first) return {ok: false};
  const result = hook(heli, first, net ? {...gear, hookReach: NET_REACH} : gear);
  if (!result.ok) return {ok: false};
  if (net && near[1]) netCrate(first, near[1], gear, at);
  return {ok: true, event: result.event, carrier: first, crates: netCrates(first)};
}

// Run after each cable step: the crates in the net hang beside the carrier,
// 1.5 m apart on the side of its heading, with its speed.
export function carryNet(carrier) {
  (carrier?.netCrates ?? []).forEach((crate, i) => {
    const side = (i + 1) * 1.5, c = Math.cos(carrier.heading ?? 0), s = Math.sin(carrier.heading ?? 0);
    Object.assign(crate, {x: carrier.x + c * side, y: carrier.y, z: carrier.z - s * side,
      vx: carrier.vx, vy: carrier.vy, vz: carrier.vz, heading: carrier.heading ?? 0, onGround: carrier.onGround, falling: carrier.falling, hooked: true});
  });
}

// The carrier has been let go and has come to rest: the crates in the net are
// set down beside it, each remembering how it was last let go (the carrier's
// noteCrateRelease), and the carrier is its own weight again. Returns the
// crates set down. Does nothing while the carrier is still hooked or falling.
export function spillNet(carrier) {
  if (!carrier?.netCrates?.length || carrier.hooked || carrier.falling || !carrier.onGround) return [];
  carryNet(carrier);
  const crates = carrier.netCrates;
  for (const crate of crates) {
    Object.assign(crate, {hooked: false, falling: false, onGround: true, netted: false, vx: 0, vy: 0, vz: 0,
      releaseDrop: carrier.releaseDrop ?? 0});
  }
  carrier.netCrates = [];
  carrier.massKg = carrier.ownKg ?? carrier.massKg;
  return crates;
}
