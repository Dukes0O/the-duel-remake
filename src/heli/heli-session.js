// The helicopter mode controller (docs/HELICOPTER.md sections 2, 6 and 9),
// like deep-journey.js for The Deep. Pure game rules with no graphics: the
// app gives it a course loader, the player's car, today's date and a way to
// save the profile; HELI-HOOKS plugs it into the game loop. Same inputs and
// the same profile give the same flight.
import {HELI_STEP, KESTREL, createHeliState, stepHeli, heliReadout, refuelHeli, heliFingerprint} from './heli-flight.js';
import {createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep, wantsControl} from './heli-autopilot.js';
import {CABLE, createLoad, liftCheck, carMassKg, canHook, hook, release, stepCable} from './heli-cable.js';
import {HELI_MONEY, heliOf, buyFuel, setFuel, chargeRepair, repairCost, fuelTruck, notePlayDay,
  placeCar, carAt, countFlight, takeJob as takeJobSave, dropJob as dropJobSave, finishJob} from './heli-save.js';
import {HOME_COURSE, HELI_DESTINATIONS, legFuelKg, bearing, isDestination, dayJobs, jobPay, jobTitle} from './heli-jobs.js';
import {isCourseUnlocked} from '../course-access.js';

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
  // A second parking spot, at least this far from the first, for a
  // customer's car waiting beside the player's own.
  spareApart: 10,
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
  // The customer's car waits here when the player's own car already stands
  // on its usual spot.
  let spare = null;
  search: for (const distance of [HELI_SESSION.parkingDistance, 35, 45]) {
    for (let k = 0; k < 16; k++) {
      const a = (k + 0.5) * Math.PI / 8, x = zone.x + Math.cos(a) * distance, z = zone.z + Math.sin(a) * distance;
      if (Math.hypot(x - parking.x, z - parking.z) < HELI_SESSION.spareApart) continue;
      if (clearCircle(course, ground, x, z, 6, 1)) { spare = {x, z, y: ground.height(x, z), heading: parking.heading}; break search; }
    }
  }
  if (!spare) throw new Error(`No spare parking spot beside the pad at ${courseId}`);
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
  return Object.freeze({courseId, zone: Object.freeze(zone), parking: Object.freeze(parking), spare: Object.freeze(spare), area: Object.freeze(area), startY});
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
  let site = null, world = null, heli = null, phase = 'idle', timer = 0;
  let destination = null, cruiseOffered = false, cruiseTo = null;
  // The cars on this course: the player's own and a customer's. A load is
  // {own, job}: job is the id of the job it belongs to, or null.
  let loads = [];
  // Where the job in hand's car waits when it is not on the cable. Nothing
  // about it is saved: a new visit finds it at its pick-up again.
  let jobCar = null;
  // After the player's own car is set down on an owned course: Race here.
  let offer = null;
  let jobCache = {key: '', job: null};
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
    const carried = loads.find(car => car.hooked) ?? null;
    rememberLoads();
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
      if (carried) {
        // Hanging at its resting stretch (about 5 cm for a car).
        Object.assign(carried, {x: heli.x, y: heli.y - CABLE.length - 0.05, z: heli.z, vx: heli.vx, vy: 0, vz: heli.vz,
          onGround: false, falling: false, heading});
        carried.touching?.clear();
      }
    } else {
      heli = createHeliState({x: site.zone.x, z: site.zone.z, heading: site.parking.heading, fuelKg: fuel, mode,
        altitudeOffset: info.baseAltitude - site.startY, ground: world.ground});
    }
    // Only a car on the cable comes along; the others wait where they are.
    const kept = arriveFrom ? carried : null;
    loads = kept ? [kept] : [];
    if (!kept?.own) { const own = parkedCar(courseId); if (own) loads.push(own); }
    const job = syncJobCar();
    if (job && !kept?.job) { const waiting = waitingJobCar(courseId); if (waiting) loads.push(waiting); }
    phase = 'flying';
    cruiseOffered = false;
    cruiseTo = null;
    offer = null;
    if (autopilot.engaged) setAutopilotTarget(autopilot, destination === courseId ? zoneTarget() : null);
    // A job car on the cable that has come back to its pick-up heads for its drop-off.
    if (kept?.job && job?.id === kept.job && courseId === job.from) aim(job.to);
    emit({type: 'entered', courseId, arrived: !!arriveFrom});
  }

  // The player's car, where it was last set down (home if never moved).
  function parkedCar(courseId) {
    if (!carId || carMassKg(carId) === null) return null;
    if (carAt(save, carId) !== courseId) return null;
    const spot = courseId === HOME_COURSE ? site.parking : site.zone;
    const car = createLoad({id: carId, massKg: carMassKg(carId), x: spot.x, z: spot.z, heading: spot.heading ?? 0, ground: world.ground});
    car.own = true; car.job = null;
    return car;
  }

  // Today's play day, and the job in hand (a job taken on an earlier play
  // day is out of date). Worked out again only when the save's job fields change.
  const playDay = () => heliOf(save).playDay.count;
  function jobInHand() {
    const jobs = heliOf(save).jobs, day = playDay(), key = `${day}|${jobs.day}|${jobs.taken}`;
    if (jobCache.key !== key) {
      jobCache = {key, job: jobs.taken && jobs.day === day ? dayJobs(day).find(job => job.id === jobs.taken) ?? null : null};
    }
    return jobCache.job;
  }
  // Keeps the customer's car in step with the job in hand.
  function syncJobCar() {
    const job = jobInHand();
    if (!job) jobCar = null;
    else if (jobCar?.id !== job.id) jobCar = {id: job.id, courseId: job.from, x: null, z: null, heading: 0};
    return job;
  }
  // The customer's car on this course: at its pick-up spot (the pad's parking
  // spot at home, the landing zone elsewhere), on the spare spot when the
  // player's own car stands there, or wherever it was last left.
  function waitingJobCar(courseId) {
    const job = jobInHand();
    if (!job || jobCar?.id !== job.id || jobCar.courseId !== courseId) return null;
    let spot = jobCar;
    if (jobCar.x === null) {
      const usual = courseId === HOME_COURSE ? site.parking : site.zone;
      spot = loads.some(other => Math.hypot(other.x - usual.x, other.z - usual.z) < 8) ? site.spare : usual;
    }
    const car = createLoad({id: job.carId, massKg: carMassKg(job.carId), x: spot.x, z: spot.z,
      heading: spot.heading || site.parking.heading || 0, ground: world.ground});
    car.own = false; car.job = job.id;
    return car;
  }
  // Remember where the customer's car was left before the course changes.
  function rememberLoads() {
    if (!site) return;
    for (const car of loads)
      if (car.job && !car.hooked && jobCar?.id === car.job) Object.assign(jobCar, {courseId: site.courseId, x: car.x, z: car.z, heading: car.heading});
  }
  // Pick-up first, then drop-off.
  function aimAtJob(job) {
    const pickUp = jobCar?.courseId ?? job.from;
    aim(pickUp !== site.courseId ? pickUp : job.to);
  }
  function aim(courseId) {
    destination = courseId;
    cruiseOffered = false;
    if (autopilot.engaged) setAutopilotTarget(autopilot, autopilotGoal());
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

  const primaryLoad = () => loads.find(car => car.hooked) ?? loads.find(car => car.own) ?? loads[0] ?? null;
  const loadView = car => Object.freeze({id: car.id, x: car.x, y: car.y, z: car.z, heading: car.heading,
    hooked: car.hooked, onGround: car.onGround, own: !!car.own, job: car.job ?? null});

  // A clean release of the job in hand's car inside the drop-off course's
  // landing zone finishes the job and pays. A drop from height pays nothing
  // (the repair is charged when it lands) and the job stays in hand.
  function deliverJob(car, event) {
    const job = jobInHand();
    if (!job || job.id !== car.job || site.courseId !== job.to || event.type !== 'released') return;
    const pay = jobPay(job, mode);
    if (!commit(finishJob(save, job.id, pay, flag)).ok) return;
    jobCar = null;
    car.job = null;
    emit({type: 'jobDone', job, pay});
    emit({type: 'radio', line: 'heli.radio.job.done'});
  }

  const api = {
    start(courseId = HOME_COURSE) {
      if (today) commit(notePlayDay(save, today, flag));
      destination = null;
      enter(courseId);
      const job = jobInHand();
      if (job) aimAtJob(job);
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
          rememberLoads();
          heli = null;
          loads = [];
          destination = null;
          enter(HOME_COURSE);
          storeFuel();
          const job = jobInHand();
          if (job) aimAtJob(job);
        }
        return api.takeEvents();
      }
      if (phase !== 'flying') return api.takeEvents();
      const held = loads.find(car => car.hooked) ?? null;
      const hang = held ? CABLE.length + 1 : 0;
      const ap = autopilotStep(autopilot, heli, controls, {ground: world.ground, hang, load: held, dt});
      handle(ap.events);
      // Every car steps; only the one on the cable pulls on the helicopter.
      let pull;
      for (const car of loads) {
        const cable = stepCable(car, heli, {ground: world.ground, zone: site.zone, fallen}, dt);
        handle(cable.events);
        if (car.hooked || pull === undefined) pull = cable.force;
      }
      handle(stepHeli(heli, ap.commands ? {} : controls, {ground: world.ground, external: pull, commands: ap.commands}, dt));
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
    // landing zone delivers the car there: the player's own car is saved
    // there, and a customer's car at its drop-off finishes the job.
    pressHook() {
      if (phase !== 'flying' || !loads.length) return null;
      const held = loads.find(car => car.hooked);
      if (held) {
        const result = release(held, world.ground);
        if (held.job) result.event.job = held.job;
        emit(result.event);
        const inZone = Math.hypot(held.x - site.zone.x, held.z - site.zone.z) <= site.zone.radius;
        if (held.own && inZone) {
          commit(placeCar(save, carId, site.courseId, flag));
          emit({type: 'delivered', carId, courseId: site.courseId, dropped: result.event.type === 'releasedHigh'});
          offer = isCourseUnlocked(save, site.courseId) ? {courseId: site.courseId, carId} : null;
        } else if (held.job && inZone) deliverJob(held, result.event);
        return result.event;
      }
      // The car nearest the hook; H elsewhere stays quiet.
      const hookAt = {x: heli.x, y: heli.y - CABLE.length, z: heli.z};
      const reach = car => Math.hypot(hookAt.x - car.x, hookAt.z - car.z);
      const load = loads.reduce((best, car) => reach(car) < reach(best) ? car : best);
      if (!liftCheck(load.id).ok) {
        // Only when the hook is over the car.
        if (reach(load) <= CABLE.hookReach && Math.abs(hookAt.y - load.y) <= CABLE.hookHeightSlack + 1)
          emit({type: 'cannotLift', carId: load.id, reason: liftCheck(load.id).reason});
        return null;
      }
      if (!canHook(heli, load)) return null;
      const result = hook(heli, load);
      if (!result.ok) return null;
      if (load.job) result.event.job = load.job;
      emit(result.event);
      if (load.own) offer = null;
      const job = load.job ? jobInHand() : null;
      if (job?.id === load.job) aim(job.to);
      return result.event;
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
      aim(courseId);
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
    // The dispatch board (docs/HELICOPTER.md section 6): "Fly my car" and
    // today's three jobs, each marked taken or done from the save.
    boardJobs() {
      const day = playDay(), jobs = heliOf(save).jobs, sameDay = jobs.day === day;
      const taken = sameDay ? jobs.taken : null, done = sameDay ? jobs.done : [];
      return Object.freeze([
        Object.freeze({id: 'own', own: true, carId, title: 'Fly my car', pay: 0}),
        ...dayJobs(day).map(job => Object.freeze({...job, title: jobTitle(job), payNow: jobPay(job, mode),
          taken: job.id === taken, done: done.includes(job.id)})),
      ]);
    },
    // Jobs are taken at the home pad, on the ground, like the pump. "Fly my
    // car" only clears the destination; a job is saved and the way to its
    // pick-up (or, from the pick-up, its drop-off) is set.
    takeJob(id) {
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      if (id === 'own') { aim(null); return {ok: true, own: true}; }
      const day = playDay(), job = dayJobs(day).find(item => item.id === id);
      if (!job) return {ok: false, reason: "That job is not on today's board."};
      const result = commit(takeJobSave(save, id, day, flag));
      if (!result.ok) return result;
      syncJobCar();
      if (!result.already) {
        const waiting = waitingJobCar(site.courseId);
        if (waiting) loads.push(waiting);
        emit({type: 'jobTaken', job});
        emit({type: 'radio', line: 'heli.radio.job.taken'});
      }
      aimAtJob(job);
      return {ok: true, job};
    },
    // Hand the job in hand back to the board.
    dropJob() {
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      const job = jobInHand();
      const result = commit(dropJobSave(save, flag));
      if (result.ok && result.dropped) {
        jobCar = null;
        loads = loads.filter(car => !car.job || car.hooked);
        for (const car of loads) car.job = null;
        aim(null);
        emit({type: 'jobDropped', job});
      }
      return result;
    },
    // After the player's own car is set down on an owned course: the course
    // and car for the app's raceHere. Hooking the car again takes it back.
    raceHereOffer() {
      return phase === 'flying' && offer && site?.courseId === offer.courseId ? {...offer} : null;
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
    get mode() { return mode; },
    get job() { return jobInHand(); },
    // A read-only picture for the renderer, instruments and tests.
    view() {
      return Object.freeze({
        phase, courseId: site?.courseId ?? null, destination, cruiseOffered, autopilot: autopilot.engaged,
        heli: heli ? Object.freeze({...heli}) : null,
        // load: the car on the cable, else the player's own car, else any
        // other car here. loads: every car on this course.
        load: primaryLoad() ? loadView(primaryLoad()) : null,
        loads: Object.freeze(loads.map(loadView)),
        job: jobInHand(),
        readout: heli ? heliReadout(heli, {loadKg: loads.find(car => car.hooked)?.massKg ?? 0}) : null,
        zone: site?.zone ?? null, parking: site?.parking ?? null, area: site?.area ?? null,
        fade: phase === 'cruise' ? 1 - timer / HELI_SESSION.fadeSeconds : 0,
        fallen: Object.freeze([...fallen]),
      });
    },
    fingerprint() {
      const spot = car => `${car.x.toFixed(6)}|${car.y.toFixed(6)}|${car.z.toFixed(6)}|${car.hooked}`;
      return `${phase}|${site?.courseId}|${heli ? heliFingerprint(heli) : '-'}|` +
        (loads[0] ? spot(loads[0]) : '-') + `|${save.credits}|${heliOf(save).fuelKg}` +
        loads.slice(1).map(car => `|${car.id}|${spot(car)}`).join('');
    },
  };
  return api;
}

export {wantsControl, KESTREL};
