// The helicopter mode controller (docs/HELICOPTER.md sections 2, 6 and 9),
// like deep-journey.js for The Deep. Pure game rules with no graphics: the
// app gives it a course loader, the player's car, today's date and a way to
// save the profile; HELI-HOOKS plugs it into the game loop. Same inputs and
// the same profile give the same flight.
import {HELI_STEP, KESTREL, createHeliState, stepHeli, heliReadout, refuelHeli, heliFingerprint} from './heli-flight.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep, wantsControl} from './heli-autopilot.js';
import {CABLE, createLoad, liftCheck, carMassKg, canHook, hook, release, stepCable} from './heli-cable.js';
import {HELI_MONEY, heliOf, buyFuel, setFuel, chargeRepair, repairCost, fuelTruck, notePlayDay,
  placeCar, carAt, countFlight} from './heli-save.js';
import {HOME_COURSE, HELI_DESTINATIONS, legFuelKg, bearing, isDestination} from './heli-jobs.js';

export const HELI_SESSION = Object.freeze({
  zoneRadius: CABLE.landingRadius,
  areaMargin: 250,
  ceilingAbove: 300,
  arrivalDistance: 1500,
  arrivalHeight: 150,
  arrivalSpeed: 20,
  departAhead: 200,
  fadeSeconds: 1.5,
  crashSeconds: 3,
  parkingDistance: 25,
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// Is a circle on the course open, level ground off the road with nothing
// tall in it?
function clearCircle(course, ground, x, z, radius, flatness) {
  const near = course.nearest(x, z);
  if (Math.abs(near.lateral) < course.roadHalfWidthAt(near.s) + 6 + radius * 0.5) return false;
  const centre = ground.height(x, z);
  let low = centre, high = centre;
  for (let ring = 1; ring <= 2; ring++) for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4, r = radius * ring / 2;
    const y = ground.height(x + Math.cos(a) * r, z + Math.sin(a) * r);
    low = Math.min(low, y); high = Math.max(high, y);
  }
  if (high - low > flatness) return false;
  return ground.near(x, z, radius + 4).every(o => o.top <= centre + 0.5 && o.shape !== 'cone');
}

// The landing zone beside the start line, the home pad's parking spot for
// the car, and the flying area. Chosen the same way every time.
export function courseSite(course, ground, courseId) {
  const radius = HELI_SESSION.zoneRadius;
  let zone = null;
  search: for (const s of [0, 20, -20, 40, -40, 60, -60, 90, -90, 120, -120, 160, -160, 200, -200]) {
    for (const lateral of [30, -30, 40, -40, 50, -50, 65, -65, 80, -80]) {
      const p = course.worldAt(course.phase(s), lateral);
      if (clearCircle(course, ground, p.x, p.z, radius, 1.5)) {
        zone = {x: p.x, z: p.z, y: ground.height(p.x, p.z), radius, s, lateral};
        break search;
      }
    }
  }
  if (!zone) throw new Error(`No clear landing zone beside the start of ${courseId}`);
  let parking = null;
  for (let k = 0; k < 16 && !parking; k++) {
    const a = k * Math.PI / 8, x = zone.x + Math.cos(a) * HELI_SESSION.parkingDistance, z = zone.z + Math.sin(a) * HELI_SESSION.parkingDistance;
    if (clearCircle(course, ground, x, z, 6, 1)) parking = {x, z, y: ground.height(x, z), heading: course.at(0).heading};
  }
  if (!parking) throw new Error(`No parking spot beside the pad at ${courseId}`);
  // The area covers the course, the pad and every arrival point, with a margin.
  const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
  for (const other of Object.keys(HELI_DESTINATIONS)) {
    if (other === courseId) continue;
    const point = arrivalPoint(zone, bearing(courseId, other));
    xs.push(point.x); zs.push(point.z);
  }
  const m = HELI_SESSION.areaMargin;
  const startY = course.at(0).y;
  const area = {minX: Math.min(...xs) - m, maxX: Math.max(...xs) + m, minZ: Math.min(...zs) - m, maxZ: Math.max(...zs) + m,
    ceiling: startY + HELI_SESSION.ceilingAbove};
  return Object.freeze({courseId, zone: Object.freeze(zone), parking: Object.freeze(parking), area: Object.freeze(area), startY});
}

// 1.5 km out from the zone along the way toward another course.
function arrivalPoint(zone, toward) {
  return {x: zone.x + toward.x * HELI_SESSION.arrivalDistance, z: zone.z + toward.z * HELI_SESSION.arrivalDistance};
}

export function insideArea(area, x, y, z) {
  return x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ && y <= area.ceiling;
}

// options: profile, enabled (the helicopter switch), loadCourse(id) ->
// {course, ground}, persist(profile), carId, mode 'assisted'|'real', today
// 'YYYY-MM-DD'.
export function createHeliSession({profile, enabled = false, loadCourse, persist = () => {}, carId = null,
  mode = 'assisted', today = null} = {}) {
  if (enabled !== true) throw new Error('The helicopter switch is off.');
  if (typeof loadCourse !== 'function') throw new Error('createHeliSession needs loadCourse(courseId)');
  const flag = {enabled: true};
  let save = profile;
  let site = null, world = null, heli = null, load = null, phase = 'idle', timer = 0;
  let destination = null, cruiseOffered = false, cruiseTo = null;
  const autopilot = createAutopilot();
  const fallen = new Set();
  const pending = [];

  const commit = result => {
    if (result?.ok && result.profile !== save) { save = result.profile; persist(save); }
    return result;
  };
  const emit = event => { pending.push(event); return event; };
  const charge = (kind, amount) => {
    const result = commit(chargeRepair(save, amount, flag));
    emit({type: 'charged', kind, amount, charged: result.charged ?? 0, forgiven: result.forgiven ?? 0});
  };
  // Store the tank only when it changed, so an unchanged profile is never
  // saved again.
  const storeFuel = () => {
    if (heli && Math.round(heli.fuelKg * 10) / 10 !== heliOf(save).fuelKg) commit(setFuel(save, heli.fuelKg, flag));
  };

  function enter(courseId, {arriveFrom = null} = {}) {
    if (!isDestination(courseId)) throw new Error(`Not a helicopter destination: ${courseId}`);
    world = loadCourse(courseId);
    site = courseSite(world.course, world.ground, courseId);
    const info = HELI_DESTINATIONS[courseId];
    const fuel = heli ? heli.fuelKg : heliOf(save).fuelKg;
    if (arriveFrom) {
      const toward = bearing(courseId, arriveFrom), start = arrivalPoint(site.zone, toward);
      const heading = Math.atan2(site.zone.x - start.x, site.zone.z - start.z);
      heli = createHeliState({x: start.x, z: start.z, heading, fuelKg: fuel, mode, altitudeOffset: info.baseAltitude - site.startY,
        ground: world.ground});
      heli.y = site.zone.y + HELI_SESSION.arrivalHeight;
      heli.onGround = false;
      heli.vx = Math.sin(heading) * HELI_SESSION.arrivalSpeed;
      heli.vz = Math.cos(heading) * HELI_SESSION.arrivalSpeed;
      if (load?.hooked) {
        // Hanging at its resting stretch (about 5 cm for a car).
        Object.assign(load, {x: heli.x, y: heli.y - CABLE.length - 0.05, z: heli.z, vx: heli.vx, vy: 0, vz: heli.vz,
          onGround: false, falling: false, heading});
        load.touching?.clear();
      } else load = null;
    } else {
      heli = createHeliState({x: site.zone.x, z: site.zone.z, heading: site.parking.heading, fuelKg: fuel, mode,
        altitudeOffset: info.baseAltitude - site.startY, ground: world.ground});
      load = null;
    }
    if (!load) load = parkedCar(courseId);
    phase = 'flying';
    cruiseOffered = false;
    cruiseTo = null;
    if (autopilot.engaged) setAutopilotTarget(autopilot, destination === courseId ? zoneTarget() : null);
    emit({type: 'entered', courseId, arrived: !!arriveFrom});
  }

  // The player's car, where it was last set down (home if never moved).
  function parkedCar(courseId) {
    if (!carId || carMassKg(carId) === null) return null;
    if (carAt(save, carId) !== courseId) return null;
    const spot = courseId === HOME_COURSE ? site.parking : site.zone;
    return createLoad({id: carId, massKg: carMassKg(carId), x: spot.x, z: spot.z, heading: spot.heading ?? 0, ground: world.ground});
  }

  const zoneTarget = () => ({x: site.zone.x, z: site.zone.z, groundY: site.zone.y});
  // Leaving toward another course: a point beyond the area's edge.
  function departureTarget() {
    const toward = bearing(site.courseId, destination);
    const a = site.area;
    let t = Infinity;
    if (toward.x > 0) t = Math.min(t, (a.maxX - heli.x) / toward.x); else if (toward.x < 0) t = Math.min(t, (a.minX - heli.x) / toward.x);
    if (toward.z > 0) t = Math.min(t, (a.maxZ - heli.z) / toward.z); else if (toward.z < 0) t = Math.min(t, (a.minZ - heli.z) / toward.z);
    const reach = Math.max(0, t) + HELI_SESSION.departAhead;
    const x = heli.x + toward.x * reach, z = heli.z + toward.z * reach;
    return {x, z, groundY: world.ground.height(x, z)};
  }
  const autopilotGoal = () => !destination ? null : destination === site.courseId ? zoneTarget() : departureTarget();

  // Nobody is stranded: an empty tank on the ground calls the fuel truck,
  // except at the home pad while the pump can still sell a reserve of 60 kg
  // (15% of the tank), so a few credits never buy a sliver that runs dry
  // at once. The first tank there is free.
  function strandedOnGround() {
    if (!heli.onGround || heli.engine || heli.fuelKg > 0) return false;
    if (!onHome()) return true;
    const tank = heliOf(save);
    return tank.refuels > 0 && save.credits < Math.ceil(KESTREL.tankKg * KESTREL.lowFuelShare * HELI_MONEY.creditsPerKg);
  }

  function onHome() {
    return site?.courseId === HOME_COURSE && heli?.onGround &&
      Math.hypot(heli.x - site.zone.x, heli.z - site.zone.z) <= site.zone.radius;
  }

  function crashed(cause) {
    storeFuel();
    charge('crash', HELI_MONEY.crash);
    emit({type: 'crashed', cause});
    phase = 'crashed';
    timer = HELI_SESSION.crashSeconds;
    autopilot.engaged = false;
  }

  function handle(events) {
    for (const event of events) {
      emit(event);
      if (event.type === 'touchdown') {
        storeFuel();
        if (event.result === 'hard') {
          charge('hardLanding', HELI_MONEY.hardLanding);
          emit({type: 'radio', line: 'heli.radio.landing.hard'});
        }
      } else if (event.type === 'crash') crashed(event.cause);
      else if (event.type === 'lowFuel') emit({type: 'radio', line: 'heli.radio.fuel.low'});
      else if (event.type === 'engineOut') { storeFuel(); emit({type: 'radio', line: 'heli.radio.fuel.out'}); }
      else if (event.type === 'drop') {
        charge('drop', repairCost('drop', {dropMetres: event.dropMetres}));
        emit({type: 'radio', line: 'heli.radio.drop'});
      } else if (event.type === 'cargoHit') {
        charge(event.kind, repairCost(event.kind));
        emit({type: 'radio', line: 'heli.radio.cargo.hit'});
      }
    }
  }

  const api = {
    start(courseId = HOME_COURSE) {
      if (today) commit(notePlayDay(save, today, flag));
      destination = null;
      enter(courseId);
      return api.takeEvents();
    },
    // One fixed step. controls: {lift, pitch, roll, yaw}, each -1..1.
    step(controls = {}, dt = HELI_STEP) {
      if (phase === 'cruise') {
        timer -= dt;
        if (timer <= 0) {
          const from = site.courseId;
          destination = cruiseTo;
          enter(cruiseTo, {arriveFrom: from});
          storeFuel();
          commit(countFlight(save, flag));
          emit({type: 'radio', line: 'heli.radio.arrived'});
        }
        return api.takeEvents();
      }
      if (phase === 'crashed') {
        timer -= dt;
        if (timer <= 0) {
          heli = null;
          load = null;
          destination = null;
          enter(HOME_COURSE);
          storeFuel();
        }
        return api.takeEvents();
      }
      if (phase !== 'flying') return api.takeEvents();
      const hang = load?.hooked ? CABLE.length + 1 : 0;
      const ap = autopilotStep(autopilot, heli, controls, {ground: world.ground, hang, load: load?.hooked ? load : null, dt});
      handle(ap.events);
      const cable = load ? stepCable(load, heli, {ground: world.ground, zone: site.zone, fallen}, dt) : null;
      if (cable) handle(cable.events);
      handle(stepHeli(heli, ap.commands ? {} : controls, {ground: world.ground, external: cable?.force, commands: ap.commands}, dt));
      if (phase !== 'flying') return api.takeEvents();
      if (strandedOnGround()) {
        storeFuel();
        const truck = commit(fuelTruck(save, flag));
        refuelHeli(heli, heliOf(save).fuelKg);
        emit({type: 'charged', kind: 'fuelTruck', amount: (truck.charged ?? 0) + (truck.forgiven ?? 0),
          charged: truck.charged ?? 0, forgiven: truck.forgiven ?? 0});
        emit({type: 'radio', line: 'heli.radio.fuel.truck'});
      }
      // The flying area: a destination elsewhere offers the cruise leg;
      // with none the edge holds the helicopter in.
      const a = site.area;
      if (!insideArea(a, heli.x, heli.y, heli.z)) {
        if (destination && destination !== site.courseId) {
          if (!cruiseOffered) {
            cruiseOffered = true;
            emit({type: 'cruiseOffered', to: destination});
            emit({type: 'radio', line: 'heli.radio.cruise.ready'});
          }
        } else {
          heli.x = clamp(heli.x, a.minX, a.maxX); heli.z = clamp(heli.z, a.minZ, a.maxZ); heli.y = Math.min(heli.y, a.ceiling);
          if (heli.x === a.minX || heli.x === a.maxX) heli.vx = 0;
          if (heli.z === a.minZ || heli.z === a.maxZ) heli.vz = 0;
          if (heli.y === a.ceiling) heli.vy = Math.min(0, heli.vy);
        }
      } else if (cruiseOffered) cruiseOffered = false;
      return api.takeEvents();
    },
    // H: hook the load under the hook, or let it go. A clean release in a
    // landing zone delivers the car there.
    pressHook() {
      if (phase !== 'flying' || !load) return null;
      if (load.hooked) {
        const result = release(load, world.ground);
        emit(result.event);
        const inZone = Math.hypot(load.x - site.zone.x, load.z - site.zone.z) <= site.zone.radius;
        if (load.id === carId && inZone) {
          commit(placeCar(save, carId, site.courseId, flag));
          emit({type: 'delivered', carId, courseId: site.courseId, dropped: result.event.type === 'releasedHigh'});
        }
        return result.event;
      }
      if (!liftCheck(load.id).ok && load.id === carId) {
        // Only when the hook is over the car, so H elsewhere stays quiet.
        const hookAt = {x: heli.x, y: heli.y - CABLE.length, z: heli.z};
        if (Math.hypot(hookAt.x - load.x, hookAt.z - load.z) <= CABLE.hookReach && Math.abs(hookAt.y - load.y) <= CABLE.hookHeightSlack + 1)
          emit({type: 'cannotLift', carId, reason: liftCheck(load.id).reason});
        return null;
      }
      if (!canHook(heli, load)) return null;
      const result = hook(heli, load);
      if (result.ok) emit(result.event);
      return result.ok ? result.event : null;
    },
    // P: the autopilot on or off. It flies toward the chosen destination.
    pressAutopilot() {
      if (phase !== 'flying') return false;
      const on = toggleAutopilot(autopilot, heli);
      if (on) setAutopilotTarget(autopilot, autopilotGoal());
      emit({type: on ? 'autopilotOn' : 'autopilotOff', reason: 'pilot'});
      return on;
    },
    // Only while flying: a cruise leg in progress keeps its destination.
    setDestination(courseId) {
      if (phase !== 'flying' || courseId !== null && !isDestination(courseId)) return false;
      destination = courseId;
      cruiseOffered = false;
      if (autopilot.engaged) setAutopilotTarget(autopilot, autopilotGoal());
      return true;
    },
    // Accept the cruise leg: fade out, take the leg's fuel, arrive 1.5 km
    // out from the destination's zone at 150 m.
    acceptCruise() {
      if (phase !== 'flying' || !cruiseOffered || !destination) return false;
      const fuel = legFuelKg(site.courseId, destination);
      if (fuel === null || heli.fuelKg < fuel) {
        emit({type: 'cruiseRefused', to: destination, needKg: fuel});
        emit({type: 'radio', line: 'heli.radio.cruise.refused'});
        return false;
      }
      heli.fuelKg -= fuel;
      cruiseTo = destination;
      phase = 'cruise';
      timer = HELI_SESSION.fadeSeconds;
      emit({type: 'cruise', from: site.courseId, to: destination, fuelKg: fuel});
      return true;
    },
    // Fuel from the pump: only on the home pad, with the engine idling on
    // the ground. Infinity fills the tank (the free first tank).
    buyFuel(kg = Infinity) {
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The pump is at the home pad.'};
      storeFuel();
      const result = commit(buyFuel(save, kg, flag));
      if (result.ok) {
        refuelHeli(heli, heliOf(save).fuelKg);
        emit({type: 'fuelBought', kg: result.kg, cost: result.cost});
      }
      return result;
    },
    // Leave the mode: the fuel left in the tank is kept.
    leave() {
      if (heli && phase !== 'idle') storeFuel();
      phase = 'idle';
      return save;
    },
    takeEvents() { return pending.splice(0); },
    get profile() { return save; },
    get phase() { return phase; },
    get courseId() { return site?.courseId ?? null; },
    get destination() { return destination; },
    get autopilotOn() { return autopilot.engaged; },
    get cruiseOffered() { return cruiseOffered; },
    // A read-only picture for the renderer, instruments and tests.
    view() {
      return Object.freeze({
        phase, courseId: site?.courseId ?? null, destination, cruiseOffered, autopilot: autopilot.engaged,
        heli: heli ? Object.freeze({...heli}) : null,
        load: load ? Object.freeze({id: load.id, x: load.x, y: load.y, z: load.z, heading: load.heading,
          hooked: load.hooked, onGround: load.onGround}) : null,
        readout: heli ? heliReadout(heli, {loadKg: load?.hooked ? load.massKg : 0}) : null,
        zone: site?.zone ?? null, parking: site?.parking ?? null, area: site?.area ?? null,
        fade: phase === 'cruise' ? 1 - timer / HELI_SESSION.fadeSeconds : 0,
        fallen: Object.freeze([...fallen]),
      });
    },
    fingerprint() {
      return `${phase}|${site?.courseId}|${heli ? heliFingerprint(heli) : '-'}|` +
        (load ? `${load.x.toFixed(6)}|${load.y.toFixed(6)}|${load.z.toFixed(6)}|${load.hooked}` : '-') +
        `|${save.credits}|${heliOf(save).fuelKg}`;
    },
  };
  return api;
}

export {wantsControl, KESTREL};
