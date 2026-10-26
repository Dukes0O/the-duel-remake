// The helicopter mode controller (docs/HELICOPTER.md sections 2, 6 and 9),
// like deep-journey.js for The Deep. Pure game rules with no graphics: the
// app gives it a course loader, the player's car, today's date and a way to
// save the profile; HELI-HOOKS plugs it into the game loop. Same inputs and
// the same profile give the same flight.
import {HELI_STEP, KESTREL, GRAVITY, heliMass, availableThrust, createHeliState, stepHeli, heliReadout, refuelHeli, heliFingerprint} from './heli-flight.js';
import {AUTOPILOT, createAutopilot, toggleAutopilot, setAutopilotTarget, autopilotStep, wantsControl} from './heli-autopilot.js';
import {CABLE, createLoad, liftCheck, carMassKg, canHook, hookRefusal, hook, release, stepCable, createWinch, reelWinch, lineLengthOf} from './heli-cable.js';
import {HELI_MONEY, heliOf, buyFuel, setFuel, chargeRepair, repairCost, fuelTruck, notePlayDay,
  DIRT_KINDS, placeCar, carAt, countFlight, takeJob as takeJobSave, dropJob as dropJobSave, finishJob, finishLesson as finishLessonSave} from './heli-save.js';
import {HOME_COURSE, destinationsFor, legFuelKg, bearing, isDestination, dayJobs, jobPay, jobTitle, recoveryJob, recoveryJobOf, recoveryTitle, finishRecovery,
  wreckFor, returnLoadJob, returnLoadTitle, finishReturnLoad} from './heli-jobs.js';
import {isCourseUnlocked} from '../course-access.js';
import {LESSON_RULES, LESSON_ORDER, SKIP_MARKS, lessonOpen, createLesson, stepLesson, carryGuidance} from './heli-lessons.js';
import {CRATE} from './heli-cable.js';
import {BUCKET, RETARDANT_LITRES, createBucket, stepBucket, setBucketWater, bucketHit, bucketWords, bucketHolds, aimPoint, aimLocked, aimRingRadius, bucketReading} from './heli-bucket.js';
import {heliUpgrades, heliUpgradesOf, ownedLabUpgrades, chooseLabLine, CHALLENGE_IDS, CHALLENGE_RULES, challengeSpots, createChallenge, stepChallenge,
  challengeProps, challengeBriefing, passLabChallenge, labChallengeOpen, labChallengesDone,
  aerialsOpen, waxKitOwned, skiWaxFor, snowOfDay, WAXES, waxSetting, waxRunResult} from '../lab/lab-heli.js';
import {createSkiRun, stepSkiRun, skiRunView, skiRunFingerprint, SKI_PADS, SKI_RUN_IDS, skiRunPad, skiRunName, skiRunLimits} from '../ski/ski-session.js';
import {makeRng} from '../rng.js';
import {bucketDamageOf, damageBucket as damageBucketSave, repairBucket as repairBucketSave, FIRE_MONEY, missionsOf, setMissions,
  skiOf, recordRun as recordSkiRun, findStash as findSkiStash} from './heli-save.js';
import {createFireRun, fireWorld} from './heli-fire-run.js';
import {callOf, rescueOf, rescueConditions, isRescueKind, tickRescue, finishRescue, failRescue, clockLeft, duskOf, rescueLimit,
  peoplePay, dropSummitCall, SUMMIT_COURSE, DUSK_SECONDS} from './heli-missions.js';
import {RESCUE, CONDITIONS, createRescueLine, setLineWho, peopleOnLine, hNothing, canFitLine, holdFraction, stepRescue, rescueHit, cabinHurt,
  handoverOutcome, createSupplyCrate, noteCrateRelease, crateResult, cratePay, supplyPay, hoistBonus, hookCrates, carryNet, spillNet, NET_REACH} from './heli-rescue.js';
import {hikerSpots, pickHiker, hikerSpotted, hikerWalk, slideSpots, pickSlide, beaconSignal, hoistSpots, pickHoist, supplyYard, supplyPickup,
  crateSpots, SEARCH, searchNight, heatContacts} from './heli-search.js';
import {SKINS, skinsOf, skinRows, skinOffer, earnSkins, buySkin, wearSkin, washHelicopter, gearStats, grimeOf, WASH, addDirt, settleFlightDirt,
  createFlightDirt, addFlightTime, addLanding, addDip, addDrop} from './heli-skins.js';
import {planSurvey, createSurveyRun, stepSurvey, surveyPercent, canReport, surveyName, heatAnimals} from './heli-survey.js';
import {surveyJobOf, surveyTitle, finishSurvey} from './heli-jobs.js';
import {cameraViewsFor} from './heli-camera.js';
import {cruiseSeconds} from './heli-fire.js';
import {fuelPadAt, placeOfCourse} from './pilot-map-data.js';
import {SECRET_SIGNS, SPOT, TABLE_ID, TABLE_CALL, TABLE_FOUND_TEXT, createSpotter, stepSpotter, noteFound, noteSeen, legPassesTable, claimTable,
  createTableWorld, mapOf} from './map-secrets.js';
import {sampleCourse, detectCorners, nameFeatures, namedPieces} from '../track-analysis.js';
import {courseClosed} from '../course-closures.js';

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
  // Where a fitted bucket is laid out, to the helicopter's right (H2 Fire).
  bucketBeside: 6,
});
// Heli-skiing (docs/HELI_SKIING.md sections 3 and 6): the group of a guide and four guests weighs 475 kg aboard; the job pays
// 1,200 (Real a quarter more) and is offered on one play day in three; a drop pad is the 12 m circle the Summit world has;
// above this height the thin-air line plays when the collective is at its top and the helicopter still sinks.
export const HELI_SKIING = Object.freeze({groupKg: 475, guests: 4, groupPay: 1200, groupOneDayIn: 3, padRadius: 12, thinAirMetres: 3500,
  seed: 0x534b4947, dropId: 'ski-drop'});
// How far above the highest obstacle the autopilot stops over a rescue's
// search area, debris area or cliff spot (docs/HELI_RESCUE.md section 7).
const RESCUE_HOVER = 40;

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
// the car, and the flying area. Chosen the same way every time. summitRun:
// the Summit Run switch, which adds that destination's arrival point to the
// area (and lets Summit Run itself be a course here). summitRescue: Summit Run's
// switch together with the rescue switch; Summit Run's ceiling is then 300 m above
// the ground under the helicopter (never lower than the usual one), so the pickup
// and the summit hut can be reached (see ceilingAt).
// The ocean's surface, metres (the same level as src/coastal-water.js; a test keeps them equal).
export const SEA_LEVEL = -15;

export function courseSite(course, ground, courseId, {summitRun = false, summitRescue = false, pilotMap = false, table = false} = {}) {
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
  // Lesson 4: the crate waits 18 m from the pad, clear of both parking
  // spots, and its circle is a clear, level 10 m circle about 200 m out.
  let crate = null;
  for (let k = 0; k < 16 && !crate; k++) {
    const a = (k + 0.25) * Math.PI / 8, x = zone.x + Math.cos(a) * 18, z = zone.z + Math.sin(a) * 18;
    if (Math.hypot(x - parking.x, z - parking.z) < 9 || Math.hypot(x - spare.x, z - spare.z) < 9) continue;
    if (clearCircle(course, ground, x, z, 3, 1)) crate = {x, z, y: ground.height(x, z)};
  }
  let target = null;
  search: for (const distance of [200, 220, 180, 240, 160]) {
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12, x = zone.x + Math.cos(a) * distance, z = zone.z + Math.sin(a) * distance;
      if (clearCircle(course, ground, x, z, LESSON_RULES.carry.radius, 2)) { target = {x, z, y: ground.height(x, z), radius: LESSON_RULES.carry.radius}; break search; }
    }
  }
  if (courseId === HOME_COURSE && (!crate || !target)) throw new Error('No room for the carrying lesson at the home pad');
  // The area covers the course, the pad and every arrival point, with a margin.
  const xs = course.samples.map(p => p.x), zs = course.samples.map(p => p.z);
  for (const other of Object.keys(destinationsFor({summitRun, pilotMap, table}))) {
    if (other === courseId) continue;
    const point = arrivalPoint(zone, bearing(courseId, other, {summitRun, pilotMap, table}));
    xs.push(point.x); zs.push(point.z);
  }
  const m = HELI_SESSION.areaMargin;
  const startY = course.at(0).y;
  const area = {minX: Math.min(...xs) - m, maxX: Math.max(...xs) + m, minZ: Math.min(...zs) - m, maxZ: Math.max(...zs) + m,
    ceiling: startY + HELI_SESSION.ceilingAbove,
    ...(summitRescue === true && courseId === 'summit-run' ? {aboveGround: HELI_SESSION.ceilingAbove} : {})};
  return Object.freeze({courseId, zone: Object.freeze(zone), parking: Object.freeze(parking), spare: Object.freeze(spare), area: Object.freeze(area), startY,
    crate: crate && Object.freeze(crate), carryTarget: target && Object.freeze(target)});
}

// 1.5 km out from the zone along the way toward another course.
function arrivalPoint(zone, toward) {
  return {x: zone.x + toward.x * HELI_SESSION.arrivalDistance, z: zone.z + toward.z * HELI_SESSION.arrivalDistance};
}

// The top of the flying area over a spot: the flat ceiling, or, where the area
// carries `aboveGround` (Summit Run with rescues on), that many metres over the
// ground there when that is higher. H1's thin-air thrust rule still decides how
// high the helicopter can actually climb.
export function ceilingAt(area, x, z, ground = null) {
  return area.aboveGround && ground ? Math.max(area.ceiling, ground.height(x, z) + area.aboveGround) : area.ceiling;
}

export function insideArea(area, x, y, z, ground = null) {
  return x >= area.minX && x <= area.maxX && z >= area.minZ && z <= area.maxZ && y <= ceilingAt(area, x, z, ground);
}

// options: profile, enabled (the helicopter switch), loadCourse(id) ->
// {course, ground}, persist(profile), carId, mode 'assisted'|'real', today
// 'YYYY-MM-DD'. rescueEnabled (H4 Rescue, docs/HELI_RESCUE.md): the rescue
// switch; rescues ring through the fire engine, so they need fireEnabled too.
// summitRunEnabled: the Summit Run switch; Summit Run is a fourth destination
// only with it on (docs/HELI_RESCUE.md section 5.5).
// H3 Wildlife and skins (docs/HELI_WILDLIFE.md): skinsEnabled is the heli-skins
// switch (paint shop, gear, dirt, the wash) and wildlifeEnabled the wildlife
// switch (the count on the board). labEnabled is the lab switch (docs/LAB.md 4.1): the Lab's bought upgrades then
// act in flight, at the hook, in the bucket and on the aim ring; with it off, or nothing bought, every result is
// what it was. secretCourses (MAP-SECRETS, docs/PILOT_MAP.md section 5): the ids of the secret courses whose own switches are on;
// only with the pilot's map on, a sign for each is on its course to be found from the air, and the Table appears on the map after
// the leg that passes it. wildlife is src/wildlife.js (pass `import *
// as wildlife`; the helicopter rules may not import it) and surveyStand(courseId,
// world) gives the count's `canStand(x, z)` for a course, or null. With both
// switches off, or left out, every result is what it was.
// drivingLessonAt(courseId, carId) (DRIVE-LESSON-HELIPAD, docs/DRIVING_LESSONS.md
// 12.6): the app's answer to "which driving lesson is next on this course for
// this car", {id, name} or null; left out (the driving-lessons switch off),
// "Lesson here" is never offered.
export function createHeliSession({profile, enabled = false, loadCourse, persist = () => {}, carId = null,
  mode = 'assisted', today = null, fireEnabled = false, playerName = 'Player', loadFireCourse = null, rescueEnabled = false,
  summitRunEnabled = false, skinsEnabled = false, wildlifeEnabled = false, wildlife = null, surveyStand = null, labEnabled = false,
  drivingLessonAt = null, pilotMapEnabled = false, secretCourses = [], heliSkiingEnabled = false} = {}) {
  if (enabled !== true) throw new Error('The helicopter switch is off.');
  if (typeof loadCourse !== 'function') throw new Error('createHeliSession needs loadCourse(courseId)');
  const flag = {enabled: true};
  const summitOn = summitRunEnabled === true;
  // Heli-skiing needs Summit Run (its pads and runs are there). With it off nothing below runs and every result is what it was.
  const skiOn = heliSkiingEnabled === true && summitOn;
  // The pilot's map (docs/PILOT_MAP.md): every place a destination, the map's legs, dearer fuel pads, jobs between
  // owned destinations and scouting. With it off, left out, every answer is what it was.
  const pilotOn = pilotMapEnabled === true;
  // The Table joins the destinations once the pilot has seen it (a getter, since the save changes).
  const dflag = pilotOn ? {summitRun: summitOn, pilotMap: true, get table() { return tableKnown(); }} : {summitRun: summitOn};
  const skinOn = skinsEnabled === true, sflag = {enabled: skinOn};
  const wildOn = wildlifeEnabled === true, wildFlag = {enabled: wildOn, summitRun: summitOn};
  const placesNow = () => destinationsFor(dflag);
  let save = profile;
  // The pilot's map record, read again only when the save changes.
  let mapMemo = {save: null, map: null};
  const mapNow = () => { if (mapMemo.save !== save) mapMemo = {save, map: mapOf(save)}; return mapMemo.map; };
  const tableKnown = () => pilotOn && mapNow().seen.includes(TABLE_ID);
  const secretIds = pilotOn && Array.isArray(secretCourses) ? SECRET_SIGNS.filter(sign => secretCourses.includes(sign.id)).map(sign => sign.id) : [];
  const spotter = createSpotter();
  let tableWorld = null;
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
  // The lesson running now, and the events it has not read yet.
  let lesson = null, lessonEvents = [], retryAfterCrash = null;
  // The Lab's helicopter challenge in hand (docs/LAB.md 4.1), the events and drops it has not read yet.
  let challenge = null, challengeEvents = [], challengePatches = [], challengeDestination = null;
  // Heli-skiing: the ski drop or group job in hand ({kind, id, skied}), the group aboard, the run in hand and what the pilot chose for it.
  let skiFlight = null, groupAboard = false, skiRun = null, skiMeta = null, thinAirSaid = false, lastSkiPad = null;
  const autopilot = createAutopilot();
  const fallen = new Set();
  const pending = [];
  // H3 skins: the winch's reeled length, the flight's dirt tally, the note on
  // the board for a newly earned coat, and the count in hand (nothing here is saved).
  const winch = createWinch();
  let flightDirt = createFlightDirt(), dirtBank = 0, skinNote = null;
  let surveyTaken = null, surveyRun = null, scareSaidAt = -Infinity;
  let hookHeld = false, hookReeled = false;
  const heldLoad = () => loads.find(car => car.hooked && !car.netted) ?? null;
  // The worn skin's gear numbers, or null for stock paint and the switch off
  // (the rules read null as the base kit). Worked out again only when the save changes.
  let gearCache = {save: null, gear: null};
  const gearNow = () => {
    if (!skinOn) return null;
    if (gearCache.save !== save) gearCache = {save, gear: skinsOf(save).worn === 'stock' ? null : Object.freeze(gearStats(save, sflag))};
    return gearCache.gear;
  };
  // The gear plus the winch's line for the hook calls; null when no gear is worn.
  // The Lab's upgrades (docs/LAB.md 4.1), read from the save: null with the lab switch off or nothing bought,
  // which every rule reads as the helicopter as it always was. Worked out again only when the save changes.
  const labFlags = Object.freeze({enabled: name => name === 'lab'});
  const STOCK_UP = heliUpgrades(null);
  let labCache = {save: undefined, up: null};
  const labNow = () => {
    if (labEnabled !== true) return null;
    if (labCache.save !== save) {
      const up = heliUpgradesOf(save);
      labCache = {save, up: Object.keys(STOCK_UP).every(key => up[key] === STOCK_UP[key]) ? null : Object.freeze(up)};
    }
    return labCache.up;
  };
  // What the flight state carries (thrust, empty mass, thin-air scale), or null when all three are stock.
  const flightUpgrades = () => {
    const up = labNow();
    const lab = up && (up.thrustFactor !== STOCK_UP.thrustFactor || up.emptyMassKg !== STOCK_UP.emptyMassKg || up.altitudeScaleM !== STOCK_UP.altitudeScaleM) ? up : null;
    // The group aboard is weight like any other: the empty mass grows by theirs (the same override the Lab's light frame uses).
    if (!groupAboard) return lab;
    const base = lab ?? STOCK_UP;
    return Object.freeze({...base, emptyMassKg: base.emptyMassKg + HELI_SKIING.groupKg});
  };
  const liftLimit = () => labNow()?.hookLimitKg;
  const labLine = () => labNow()?.lineLengthM ?? CABLE.length;
  // The gear plus the winch's line for the hook calls, with the Lab's hook limit and cable when owned; null when no gear is worn and nothing is owned.
  const hookGear = () => {
    const gear = gearNow(), worn = gear && gear.reelSpeed > 0 ? {...gear, lineLength: winch.length} : gear, up = labNow();
    if (!up) return worn;
    const reeling = worn?.reelSpeed > 0;
    return {...worn, hookLimitKg: Math.max(Number.isFinite(worn?.hookLimitKg) ? worn.hookLimitKg : KESTREL.hookLimitKg, up.hookLimitKg),
      ...(!reeling && up.lineLengthM !== CABLE.length ? {lineLength: up.lineLengthM} : {})};
  };

  const commit = result => {
    if (result?.ok && result.profile !== save) {
      save = result.profile; persist(save);
      // Bought or chosen on the pad: a helicopter standing on the ground takes the new numbers now; one in the air keeps its own.
      if (labEnabled === true && heli?.onGround) {
        const up = flightUpgrades();
        if (up) heli.upgrades = Object.freeze({thrustFactor: up.thrustFactor, emptyMassKg: up.emptyMassKg, altitudeScaleM: up.altitudeScaleM});
        else delete heli.upgrades;
      }
    }
    return result;
  };
  const emit = event => { pending.push(event); if (lesson) lessonEvents.push(event); if (challenge) challengeEvents.push(event); return event; };
  // H2 Fire (docs/HELI_FIRE.md): only with the forest-fire switch on. Each
  // course's fire grid is built once from its own course model at the
  // helicopter's seed (loadFireCourse), never from the course being flown,
  // so building one never moves the visit.
  if (fireEnabled === true && typeof loadFireCourse !== 'function') throw new Error('Forest fires need loadFireCourse(courseId)');
  const fireWorlds = new Map();
  const fireWorldOf = id => {
    if (!fireWorlds.has(id)) { const loaded = loadFireCourse(id); fireWorlds.set(id, fireWorld(loaded, courseSite(loaded.course, loaded.ground, id, siteFlag))); }
    return fireWorlds.get(id);
  };
  // H4 Rescue: each course's site facts (no fire grid needed), worked out once.
  const rescueOn = rescueEnabled === true && fireEnabled === true;
  const rflag = {rescue: rescueOn};
  // Summit Run's rescues (SUMMIT-HELI-RESCUES) need both switches: only then does its ceiling follow the ground.
  const siteFlag = pilotOn ? {summitRun: summitOn, summitRescue: summitOn && rescueOn, pilotMap: true} : {summitRun: summitOn, summitRescue: summitOn && rescueOn};
  // The Table's own area has the arrival point toward every place, itself being on the map by then.
  const siteFlagOf = courseId => courseId === TABLE_ID ? {...siteFlag, table: true} : siteFlag;
  // A call or rescue stored at Summit Run, met with the Summit switch off, is dropped quietly (RESCUE-SUMMIT-TUNE).
  {
    const stored = missionsOf(save), kept = dropSummitCall(stored, {rescue: rescueOn, summitRun: summitOn});
    if (kept !== stored) commit(setMissions(save, kept, flag));
  }
  const siteWorlds = new Map();
  const siteWorldOf = id => {
    if (fireWorlds.has(id)) return fireWorlds.get(id);
    if (!siteWorlds.has(id)) {
      const loaded = loadFireCourse(id);
      siteWorlds.set(id, {course: loaded.course, ground: loaded.ground, site: courseSite(loaded.course, loaded.ground, id, siteFlag)});
    }
    return siteWorlds.get(id);
  };
  // The courses each rescue kind can happen on now: the packet's rows, kept to
  // those where the course really has the place (a course with none gets none).
  let rescueRows = null;
  const READY = {
    hiker: id => { const w = siteWorldOf(id); return hikerSpots(w.course, w.ground, w.site).length > 0; },
    avalanche: id => { const w = siteWorldOf(id); return slideSpots(w.course, w.ground).length > 0; },
    hoist: id => { const w = siteWorldOf(id); return hoistSpots(w.course, w.ground).length > 0; },
    supply: id => {
      const w = siteWorldOf(id), home = siteWorldOf(HOME_COURSE), pickup = supplyPickup(w.course, w.ground);
      // Summit Run's crates wait at its own pickup; Tremblant Snow's wait at the home pad.
      if (pickup) return !!supplyYard(w.course, w.ground) && crateSpots(w.course, w.ground, pickup).length >= 3;
      return !!supplyYard(w.course, w.ground) && crateSpots(home.course, home.ground, home.site.zone).length >= 3;
    },
  };
  const rescueCourses = () => {
    if (!rescueRows) rescueRows = Object.fromEntries(Object.entries(rescueConditions({summitRun: summitOn})).map(([kind, ids]) =>
      [kind, ids.filter(id => isDestination(id, dflag) && READY[kind](id))]));
    return rescueRows;
  };
  const fire = fireEnabled === true ? createFireRun({getSave: () => save, commit, emit, world: fireWorldOf, playerName, today,
    owns: id => isCourseUnlocked(save, id), rescue: rescueOn, rescueCourses}) : null;
  const fireFlag = {enabled: fireEnabled === true};
  const bucketLoad = () => loads.find(car => car.bucket) ?? null;
  // The aim ring, worked out 20 times a second; the lock tick plays when it turns on.
  let ring = null, aimCount = 0, dropWater = [];
  function aimStep(bucket) {
    if (aimCount++ % 6 !== 0) return;
    const point = bucket.water > 0 ? aimPoint(bucket, {ground: world.ground, wind: fire?.windNow() ?? null}) : null;
    const locked = !!point && aimLocked(point, (x, z) => fire?.burningAt(site.courseId, x, z) ?? false);
    if (locked && !ring?.locked) emit({type: 'cue', id: 'heli.aim.lock'});
    ring = point ? Object.freeze({x: point.x, y: point.y, z: point.z, radius: aimRingRadius(labNow()?.ringIndex ?? 0), locked}) : null;
  }
  const lessonsDone = () => heliOf(save).lessons;
  const charge = (kind, amount) => {
    const result = commit(chargeRepair(save, amount, flag));
    emit({type: 'charged', kind, amount, charged: result.charged ?? 0, forgiven: result.forgiven ?? 0});
  };
  // Store the tank only when it changed, so an unchanged profile is never
  // saved again.
  const storeFuel = () => {
    if (heli && Math.round(heli.fuelKg * 10) / 10 !== heliOf(save).fuelKg) commit(setFuel(save, heli.fuelKg, flag));
  };

  // The sea (docs/PILOT_MAP.md section 4). On a course that draws an ocean the ground is
  // never below its surface, and touching the water is a crash, not a landing. Only with
  // the pilot's map on; otherwise the course is exactly what the loader gave.
  let seaGround = null;
  function loadWorld(courseId) {
    seaGround = null;
    if (courseId === TABLE_ID) return (tableWorld ??= createTableWorld());
    const loaded = loadCourse(courseId);
    if (!pilotOn || !loaded.course.sections?.some(section => section.theme === 'coast')) return loaded;
    seaGround = loaded.ground;
    return {...loaded, ground: Object.freeze({...loaded.ground, height: (x, z) => Math.max(loaded.ground.height(x, z), SEA_LEVEL)})};
  }
  const overSea = (x, z) => seaGround !== null && seaGround.height(x, z) < SEA_LEVEL;

  function enter(courseId, {arriveFrom = null} = {}) {
    dropWater = [];
    hookHeld = false; hookReeled = false;
    if (!isDestination(courseId, dflag)) throw new Error(`Not a helicopter destination: ${courseId}`);
    const carried = heldLoad();
    rememberLoads();
    world = loadWorld(courseId);
    site = courseSite(world.course, world.ground, courseId, siteFlagOf(courseId));
    const info = placesNow()[courseId];
    rehydrateSkiGroup(courseId, !!arriveFrom);
    const fuel = heli ? heli.fuelKg : heliOf(save).fuelKg;
    if (arriveFrom) {
      const toward = bearing(courseId, arriveFrom, dflag);
      // Summit Run with rescues on: the leg ends over the start area's landing circle, hovering, so an
      // autopilot started on arrival clears the cliff the usual arrival point sits behind (RESCUE-SUMMIT-ARRIVAL).
      const overZone = courseId === SUMMIT_COURSE && siteFlag.summitRescue === true;
      const start = overZone ? {x: site.zone.x, z: site.zone.z} : arrivalPoint(site.zone, toward);
      const heading = overZone ? Math.atan2(-toward.x, -toward.z) : Math.atan2(site.zone.x - start.x, site.zone.z - start.z);
      const arriveSpeed = overZone ? 0 : HELI_SESSION.arrivalSpeed;
      heli = createHeliState({x: start.x, z: start.z, heading, fuelKg: fuel, mode, altitudeOffset: info.baseAltitude - site.startY,
        ground: world.ground, upgrades: flightUpgrades()});
      heli.y = site.zone.y + HELI_SESSION.arrivalHeight;
      heli.onGround = false;
      heli.vx = Math.sin(heading) * arriveSpeed;
      heli.vz = Math.cos(heading) * arriveSpeed;
      if (carried) {
        // Hanging at its resting stretch (about 5 cm for a car).
        Object.assign(carried, {x: heli.x, y: heli.y - (carried.lineLength ?? CABLE.length) - 0.05, z: heli.z, vx: heli.vx, vy: 0, vz: heli.vz,
          onGround: false, falling: false, heading});
        carried.touching?.clear();
        carryNet(carried);
      }
    } else {
      heli = createHeliState({x: site.zone.x, z: site.zone.z, heading: site.parking.heading, fuelKg: fuel, mode,
        altitudeOffset: info.baseAltitude - site.startY, ground: world.ground, upgrades: flightUpgrades()});
    }
    // Only a car on the cable comes along; the others wait where they are.
    const kept = arriveFrom ? carried : null;
    loads = kept ? [kept, ...(kept.netCrates ?? [])] : [];
    if (!kept?.own) { const own = parkedCar(courseId); if (own) loads.push(own); }
    const job = syncJobCar();
    if (job && !kept?.job) { const waiting = waitingJobCar(courseId); if (waiting) loads.push(waiting); }
    phase = 'flying';
    cruiseOffered = false;
    cruiseTo = null;
    offer = null;
    layCrates();
    if (lesson) endLesson();
    layReturnCrate();
    // Leaving the course ends a Lab challenge, except Air and altitude, which is the flight to Summit Run with its crate.
    if (challenge && !(challenge.id === 'altitude' && kept?.labLoad)) endChallenge('left');
    if (autopilot.engaged) setAutopilotTarget(autopilot, destination === courseId ? zoneTarget() : null);
    // A job car on the cable that has come back to its pick-up heads for its drop-off.
    if (kept?.job && job?.id === kept.job && courseId === job.from) aim(job.to);
    surveyArrived();
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
  // The pilot's map (section 4): the day's jobs may name any destination the player owns. The
  // owned list is worked out again only when the save changes; with the map off there are no options.
  let ownedMemo = {save: null, list: []};
  function jobOptions() {
    if (!pilotOn) return undefined;
    if (ownedMemo.save !== save) ownedMemo = {save, list: Object.keys(destinationsFor(dflag)).filter(id => isCourseUnlocked(save, id))};
    return {pilotMap: true, owned: ownedMemo.list};
  }
  // With the rescue switch on, the car recovery job (section 5.3) can be the
  // job in hand too, while its wreck is still on the board.
  function jobInHand() {
    const heli = heliOf(save), jobs = heli.jobs, day = heli.playDay.count, recovery = rescueOn ? recoveryJob(heli.missions?.wreck, day) : null;
    const key = `${day}|${jobs.day}|${jobs.taken}|${recovery?.id ?? ''}${pilotOn ? `|${jobOptions().owned.join(',')}` : ''}`;
    if (jobCache.key !== key) {
      const taken = jobs.taken && jobs.day === day ? jobs.taken : null;
      jobCache = {key, job: taken ? dayJobs(day, jobOptions()).find(job => job.id === taken) ?? (recovery?.id === taken ? recovery : null) : null};
    }
    return jobCache.job;
  }
  // Keeps the customer's car in step with the job in hand.
  function syncJobCar() {
    const job = jobInHand();
    if (!job) jobCar = null;
    // A recovery job's car waits where the wreck lies, on the slope.
    else if (jobCar?.id !== job.id) jobCar = {id: job.id, courseId: job.from, x: job.x ?? null, z: job.z ?? null, heading: 0};
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
    // Any later change of destination (a job taken or dropped) is the pilot's own: the heading flight keeps nothing to give back.
    challengeDestination = null;
    destination = courseId;
    cruiseOffered = false;
    if (autopilot.engaged) setAutopilotTarget(autopilot, autopilotGoal());
  }

  const zoneTarget = () => ({x: site.zone.x, z: site.zone.z, groundY: site.zone.y});
  // Leaving toward another course: a point beyond the area's edge.
  function departureTarget() {
    const toward = bearing(site.courseId, destination, dflag);
    const a = site.area;
    let t = Infinity;
    if (toward.x > 0) t = Math.min(t, (a.maxX - heli.x) / toward.x); else if (toward.x < 0) t = Math.min(t, (a.minX - heli.x) / toward.x);
    if (toward.z > 0) t = Math.min(t, (a.maxZ - heli.z) / toward.z); else if (toward.z < 0) t = Math.min(t, (a.minZ - heli.z) / toward.z);
    const reach = Math.max(0, t) + HELI_SESSION.departAhead;
    const x = heli.x + toward.x * reach, z = heli.z + toward.z * reach;
    return {x, z, groundY: world.ground.height(x, z)};
  }
  // On the fire's course with the bucket and the call answered, and no other
  // destination (docs/HELI_FIRE.md section 9): empty, to the lake, stopping
  // 25 m above the water; with water, to the upwind side of the hot edge,
  // stopping 40 m above the trees. Scooping and pouring stay the pilot's.
  function fireGoal() {
    const bucket = bucketLoad(), info = fire?.view(heli);
    // Home as the destination (left after a cruise leg) is no other destination.
    if ((destination && destination !== site.courseId) || !bucket || !info?.call?.answered || info.call.kind !== 'fire' || info.courseId !== site.courseId) return null;
    const hover = AUTOPILOT.hoverAbove + (bucket.lineLength ?? CABLE.length) + BUCKET.hang;
    if (bucket.water <= 1) {
      const lake = world.course.def?.basins?.[0];
      if (!lake) return null;
      const middle = world.course.worldAt(world.course.phase(lake.s), lake.lateral), surface = world.ground.water(middle.x, middle.z);
      return surface === null ? null : {x: middle.x, z: middle.z, groundY: surface + 25 - hover};
    }
    if (!info.target) return null;
    const wind = fire.windNow(), x = info.target.x - wind.toward.x * 12, z = info.target.z - wind.toward.z * 12;
    return {x, z, groundY: world.ground.highest(x, z, 10) + 40 - hover};
  }
  // Metres the load on the cable hangs below the skids (cable plus load).
  const hangOf = held => held ? (held.lineLength ?? CABLE.length) + (held.bucket ? BUCKET.hang : held.rescue ? RESCUE.restHeight : 1) : 0;
  // A hover 40 m above the highest ground, tree or rock within `radius` of a
  // place, whatever hangs on the cable (docs/HELI_RESCUE.md section 7).
  function hoverAbove(x, z, radius) {
    const hover = AUTOPILOT.hoverAbove + hangOf(heldLoad());
    return {x, z, groundY: world.ground.highest(x, z, radius) + RESCUE_HOVER - hover};
  }
  // With a rescue in hand (H4, section 7): to the search area's centre, the
  // debris area or the cliff spot, then to the handover circle with people
  // aboard. Searching, setting the rescuer down and landing stay the pilot's:
  // the autopilot only brings the helicopter to the area and hovers there.
  function rescueGoal() {
    if (!rescueOn || !live || !rsite || !heli || (destination && destination !== site.courseId)) return null;
    const r = live, here = site.courseId === r.courseId;
    if (r.kind === 'supply') return null;
    if (r.stage === 'carry') return here || site.courseId === HOME_COURSE ? zoneTarget() : null;
    if (!here) return null;
    if (r.kind === 'hiker' && r.stage === 'fly') return hoverAbove(rsite.lastSeen.x, rsite.lastSeen.z, 12);
    if (r.kind === 'hiker' && r.stage === 'found' && !rsite.aboard) return hoverAbove(rsite.clearing.x, rsite.clearing.z, rsite.clearing.radius);
    if (r.kind === 'avalanche' && (r.stage === 'fly' || r.stage === 'found')) return hoverAbove(rsite.slide.x, rsite.slide.z, 12);
    if (r.kind === 'hoist' && r.stage === 'fly') return hoverAbove(rsite.driver.x, rsite.driver.z, 12);
    return null;
  }
  // The car recovery job in hand: to the car on the slope, then (hooked) the
  // usual way to the landing zone.
  function recoveryGoal() {
    const job = rescueOn && heli ? jobInHand() : null;
    if (job?.kind !== 'recovery' || live || site.courseId !== job.from || (destination && destination !== site.courseId)) return null;
    const car = loads.find(item => item.job === job.id);
    return car && !car.hooked ? hoverAbove(car.x, car.z, 12) : null;
  }
  // The hold beside the casualty is the pilot's: the autopilot keeps the
  // hover where it is rather than flying anywhere else.
  const searchHold = () => rescueOn && !!live && !!rsite && !!heli && site.courseId === live.courseId &&
    (live.kind === 'avalanche' || live.kind === 'hoist') && live.stage === 'hold';
  const specialGoal = () => fireGoal() ?? rescueGoal() ?? recoveryGoal();
  const autopilotGoal = () => specialGoal() ?? (searchHold() || !destination ? null : destination === site.courseId ? zoneTarget() : departureTarget());
  // The fire's goal moves with the fire: checked once a second.
  let goalCount = 0, firing = false;
  function refreshFireGoal() {
    if (!fire || !autopilot.engaged || goalCount++ % 120 !== 0) return;
    const goal = specialGoal(), now = autopilot.target;
    if (goal && (!now || Math.hypot(goal.x - now.x, goal.z - now.z) > 5 || Math.abs(goal.groundY - now.groundY) > 2)) { setAutopilotTarget(autopilot, goal); firing = true; }
    // The fire is out (or the bucket off): back to the usual goal.
    else if (!goal && firing) {
      firing = false;
      setAutopilotTarget(autopilot, autopilotGoal());
      if (!autopilot.target && searchHold()) { autopilot.holdY = heli.y; autopilot.holdHeading = heli.heading; }
    }
  }

  // Nobody is stranded: an empty tank on the ground calls the fuel truck,
  // except at the home pad while the pump can still sell a reserve of 60 kg
  // (15% of the tank), so a few credits never buy a sliver that runs dry
  // at once. The first tank there is free.
  function strandedOnGround() {
    if (!heli.onGround || heli.engine || heli.fuelKg > 0) return false;
    if (!pumpHere()) return true;
    const tank = heliOf(save);
    return tank.refuels > 0 && save.credits < Math.ceil(KESTREL.tankKg * KESTREL.lowFuelShare * (padPrice() ?? HELI_MONEY.creditsPerKg));
  }

  function onHome() {
    return site?.courseId === HOME_COURSE && heli?.onGround &&
      Math.hypot(heli.x - site.zone.x, heli.z - site.zone.z) <= site.zone.radius;
  }

  // Summit Run's rescues: the lodge's fuel trucks stand inside the start area's landing circle and at the
  // pickup, for the supply run and the avalanche alike (a crew stages fuel near the scene). Each sells
  // fuel at the pump's price to a helicopter on the ground inside its circle, and always for pay.
  const standCache = new Map();
  const standAt = (circle, ground) => {
    const x = circle.x + circle.radius * 0.75;
    return Object.freeze({circle, truck: Object.freeze({x, z: circle.z, y: ground.height(x, circle.z)})});
  };
  function summitStands() {
    if (!live || (live.kind !== 'supply' && live.kind !== 'avalanche') || live.courseId !== SUMMIT_COURSE || site?.courseId !== live.courseId) return [];
    if (!standCache.has(site.courseId)) {
      const pickup = supplyPickup(world.course, world.ground);
      standCache.set(site.courseId, Object.freeze([standAt(site.zone, world.ground), ...(pickup ? [standAt(pickup, world.ground)] : [])]));
    }
    return standCache.get(site.courseId);
  }
  function atTruck() {
    return !!heli?.onGround && summitStands().some(({circle}) => Math.hypot(heli.x - circle.x, heli.z - circle.z) <= circle.radius);
  }
  // The pilot's map's fuel pads (docs/PILOT_MAP.md section 4): a pump at Harbour Lights, Pacific
  // Canyon and Alpine Serpent, for a helicopter on the ground inside the landing circle like the
  // home pump, at the pad's own price in credits a kg. Null anywhere else (the home pad's and
  // Summit's truck's prices are the pump's 1.5).
  function padPrice() {
    if (!pilotOn || !heli?.onGround || !site || site.courseId === HOME_COURSE) return null;
    const pad = fuelPadAt(placeOfCourse(site.courseId)?.id);
    if (!pad || pad.truck || Math.hypot(heli.x - site.zone.x, heli.z - site.zone.z) > site.zone.radius) return null;
    return pad.pricePerKg;
  }
  const pumpHere = () => onHome() || atTruck() || padPrice() !== null;

  // The pilot's map secrets (docs/PILOT_MAP.md section 5; rules in map-secrets.js).
  // The signs that can be found here now: on this course, their switch on, not found yet.
  const signsHere = () => !pilotOn || !site ? [] : SECRET_SIGNS.filter(sign =>
    sign.course === site.courseId && secretIds.includes(sign.id) && !mapNow().found.includes(sign.id));
  function spotterStep(dt) {
    const found = stepSpotter(spotter, heli, world.ground, signsHere(), dt);
    if (!found) return;
    const noted = noteFound(save, found.id);
    if (!noted.ok) return;   // a record this game must not write over: nothing is found
    commit(noted);
    emit({type: 'secretFound', id: found.id, name: found.name, text: isCourseUnlocked(save, found.course)
      ? `Found from the air: ${found.name}. It is in your course list now.`
      : `Found from the air: ${found.name}. It joins your course list once you own ${placesNow()[found.course]?.name ?? found.course}.`});
  }
  // The leg that passes the Table brings Roger's call on arrival, once; the Table can then be chosen like any destination.
  function tableCall(from, to) {
    if (!pilotOn || mapNow().seen.includes(TABLE_ID)) return;
    if (!legPassesTable(placeOfCourse(from)?.id ?? from, placeOfCourse(to)?.id ?? to)) return;
    const noted = noteSeen(save, TABLE_ID);
    if (!noted.ok) return;
    commit(noted);
    emit({type: 'tableSpotted', line: TABLE_CALL.line, text: TABLE_CALL.text});
    emit({type: 'radio', line: TABLE_CALL.line});
  }
  // The first landing in the Table's circle: the logbook, 500 credits, once.
  function tableLanded(event) {
    if (!pilotOn || site?.courseId !== TABLE_ID || event.result === 'crash') return;
    if (Math.hypot(heli.x - site.zone.x, heli.z - site.zone.z) > site.zone.radius) return;
    const claim = claimTable(save);
    if (!claim.ok || claim.already) return;
    commit(claim);
    emit({type: 'tableFound', pay: claim.paid, text: TABLE_FOUND_TEXT});
  }
  // What the screen needs of the secrets: the signs on this course still to be found (for the art to draw) and the hover so far.
  function secretsView() {
    const signs = signsHere();
    return Object.freeze({signs: Object.freeze(signs.map(sign => Object.freeze({id: sign.id, name: sign.name, x: sign.x, z: sign.z}))),
      spotting: spotter.id === null ? null : Object.freeze({id: spotter.id, fraction: Math.min(1, spotter.seconds / SPOT.seconds)}),
      found: Object.freeze([...mapNow().found]), table: mapNow().table});
  }

  function crashed(cause) {
    hookHeld = false; hookReeled = false;
    storeFuel();
    settleDirt();
    // A crash ends a Lab challenge try; the usual repair is all it costs.
    if (challenge) endChallenge('crashed');
    // A crash in a lesson means try again: it starts over on the pad.
    if (lesson) {
      retryAfterCrash = lesson.id;
      emit({type: 'lessonRetry', lesson: lesson.id});
      emit({type: 'radio', line: 'heli.radio.retry'});
    }
    charge('crash', HELI_MONEY.crash);
    if (skiFlight) endSkiFlight();
    emit({type: 'crashed', cause});
    crashRescue();
    phase = 'crashed';
    timer = HELI_SESSION.crashSeconds;
    autopilot.engaged = false;
  }

  function handle(events) {
    for (const event of events) {
      emit(event);
      if (event.type === 'liftoff') { fire?.liftoff({lesson: !!lesson}); rescueLifted(); }
      if (event.type === 'touchdown') {
        tableLanded(event);
        fire?.landed();
        rescueTouched(event);
        storeFuel();
        landedDirt();
        if (event.result === 'hard') {
          charge('hardLanding', HELI_MONEY.hardLanding);
          emit({type: 'radio', line: 'heli.radio.landing.hard'});
        }
      } else if (event.type === 'crash') crashed(event.cause);
      else if (event.type === 'lowFuel') emit({type: 'radio', line: 'heli.radio.fuel.low'});
      else if (event.type === 'engineOut') { storeFuel(); emit({type: 'radio', line: 'heli.radio.fuel.out'}); }
      else if (event.type === 'drop') {
        // A supply crate dropped from height costs pay instead of a repair (section 5.4).
        if (!crateLoads().some(crate => crate.id === event.id)) charge('drop', repairCost('drop', {dropMetres: event.dropMetres}));
        emit({type: 'radio', line: 'heli.radio.drop'});
      } else if (event.type === 'cargoHit') {
        charge(event.kind, repairCost(event.kind));
        emit({type: 'radio', line: 'heli.radio.cargo.hit'});
      }
    }
  }

  function bucketCableEvents(bucket, events) {
    for (const event of events) {
      if (event.type === 'cargoHit') {
        const damage = bucketHit(bucket, event);
        const stored = commit(damageBucketSave(save, damage, fireFlag));
        emit({...event, type: 'bucketHit'});
        if (stored.worse) { emit({type: 'bucketDamaged', damage}); fire?.bucketEvent({type: 'bucketDamaged', damage}); }
      } else if (event.type === 'treeDown') emit(event);
      else if (!['cargoHit', 'drop'].includes(event.type)) emit({...event, bucket: true});
    }
  }

  const carLoads = () => loads.filter(car => !car.bucket && !car.rescue && !car.supply);
  const primaryLoad = () => carLoads().find(car => car.hooked) ?? carLoads().find(car => car.own) ?? carLoads()[0] ?? null;
  const carryGuidanceNow = () => {
    const crate = loads.find(car => car.crate);
    return crate ? carryGuidance(lesson, crate, world.ground.height(crate.x, crate.z)) : null;
  };
  const loadView = car => Object.freeze({id: car.id, x: car.x, y: car.y, z: car.z, heading: car.heading,
    ...(car.returnJob ? {returnJob: car.returnJob} : {}),
    hooked: car.hooked, onGround: car.onGround, own: !!car.own, job: car.job ?? null});

  // A clean release of the job in hand's car inside the drop-off course's
  // landing zone finishes the job and pays. A drop from height pays nothing
  // (the repair is charged when it lands) and the job stays in hand.
  function deliverJob(car, event) {
    const job = jobInHand();
    if (!job || job.id !== car.job || site.courseId !== job.to || event.type !== 'released') return;
    // The recovery job pays through RESCUE-ENGINE's finishRecovery, which also
    // clears the wreck, so it can never pay twice.
    if (job.kind === 'recovery') {
      const paid = commit(finishRecovery(save, {enabled: true, mode}));
      if (!paid.ok) return;
      commit(dropJobSave(save, flag));
      jobCar = null;
      car.job = null;
      emit({type: 'jobDone', job, pay: paid.paid, recovery: true});
      emit({type: 'radio', line: 'heli.radio.job.done'});
      return;
    }
    const pay = jobPay(job, mode);
    if (!commit(finishJob(save, job.id, pay, flag)).ok) return;
    jobCar = null;
    car.job = null;
    emit({type: 'jobDone', job, pay});
    emit({type: 'radio', line: 'heli.radio.job.done'});
  }

  // ---- lessons (docs/HELICOPTER.md section 7) ----
  const crateLoad = () => {
    const spot = site.crate;
    const crate = createLoad({id: CRATE.id, massKg: CRATE.massKg, x: spot.x, z: spot.z, heading: 0, ground: world.ground});
    crate.own = false; crate.job = null; crate.crate = true;
    return crate;
  };
  // One lesson-crate model at a time. An onward delivery makes room for
  // this pad's crate immediately, without requiring another visit.
  function layReturnCrate() {
    if (!site || live?.kind === 'supply') return;
    const job = returnLoadJob(playDay(), site.courseId, dflag);
    if (!job || heliOf(save).returnLoads?.[job.from] === job.day || loads.some(load => load.crate) || !site.crate) return;
    const crate = crateLoad();
    crate.massKg = job.massKg;
    crate.returnJob = job;
    loads.push(crate);
  }
  // The crate goes with the lesson, even off the cable.
  function endLesson() {
    loads = loads.filter(car => !car.crate);
    lesson = null;
    lessonEvents = [];
  }
  function stepLessonNow(dt) {
    const crate = loads.find(car => car.crate) ?? null;
    const picture = {heli, load: crate};
    const events = lessonEvents.splice(0);
    const result = stepLesson(lesson, picture, events, dt);
    if (result.radio) emit({type: 'radio', line: result.radio});
    if (result.result === 'passed') {
      const id = lesson.id;
      if (!lessonsDone()[id]) commit(finishLessonSave(save, id, flag));
      endLesson();
      emit({type: 'lessonPassed', lesson: id});
      fire?.lessonPassed();
    } else if (result.result === 'retry') {
      emit({type: 'lessonRetry', lesson: lesson.id, ...(result.reason ? {reason: result.reason} : {})});
      if (lesson.id === 'carry') {
        loads = loads.filter(car => !car.crate);
        loads.push(crateLoad());
      }
    }
  }
  // ---- the Lab's helicopter challenges (docs/LAB.md 4.1, src/lab/lab-challenges.js) ----
  // A try starts on the home pad with the helicopter on the ground. The loads it uses are `labLoad`s, removed with it.
  const WATER_CHALLENGES = ['projectile', 'fire'];
  function layLabLoad(id, spot) {
    const car = id === 'altitude'
      ? Object.assign(createLoad({id: 'lab-crate', massKg: CHALLENGE_RULES.altitude.crateKg, x: spot.x, z: spot.z, heading: 0, ground: world.ground}), {crate: true})
      : createLoad({id: CHALLENGE_RULES[id].carId, massKg: carMassKg(CHALLENGE_RULES[id].carId), x: spot.x, z: spot.z, heading: site.parking.heading ?? 0, ground: world.ground});
    car.own = false; car.job = null; car.labLoad = true;
    return car;
  }
  // The heading flight hides the pilot's arrow; it comes back as it was unless the pilot changed it meanwhile.
  function giveBackArrow(id) {
    const kept = challengeDestination;
    challengeDestination = null;
    if (id === 'headings' && destination === null && kept !== null) aim(kept);
  }
  function endChallenge(why) {
    if (!challenge) return false;
    const id = challenge.id;
    loads = loads.filter(car => !car.labLoad);
    challenge = null; challengeEvents = []; challengePatches = [];
    giveBackArrow(id);
    if (why) emit({type: 'challengeStopped', challenge: id, why});
    return true;
  }
  function beginChallenge(id) {
    const spots = challengeSpots(id, world, site);
    if (!spots) return {ok: false, reason: 'This challenge has no room here.'};
    challenge = createChallenge(id, spots);
    challengeEvents = []; challengePatches = [];
    if (id === 'lift' || id === 'pendulum' || id === 'altitude') loads.push(layLabLoad(id, spots.load));
    // No arrow and no autopilot for the heading flight.
    if (id === 'headings') { autopilot.engaged = false; const kept = destination; aim(null); challengeDestination = kept; }
    emit({type: 'challengeStarted', challenge: id});
    return {ok: true};
  }
  function stepChallengeNow(dt) {
    const held = loads.find(car => car.labLoad && car.hooked) ?? null;
    const events = challengeEvents.splice(0), patches = challengePatches.splice(0);
    if (challenge.id === 'projectile') for (const patch of patches) patch.y = world.ground.highest(patch.x, patch.z, 0);
    const loadHeight = held ? Math.max(0, held.y - (held.restHeight ?? CABLE.restHeight) - world.ground.height(held.x, held.z)) : null;
    const view = {courseId: site.courseId, heli: {x: heli.x, y: heli.y, z: heli.z, groundY: heli.groundY, onGround: heli.onGround, fuelKg: heli.fuelKg},
      load: held, loadHeight, patches, events, ringIndex: labNow()?.ringIndex ?? 0};
    const id = challenge.id, result = stepChallenge(challenge, view, dt);
    if (result.cue) emit({type: 'cue', id: result.cue});
    for (const event of result.events) emit(event);
    if (result.result === 'passed') {
      commit(passLabChallenge(save, id, result.ring ?? undefined));
      endChallenge(null);
      emit({type: 'challengePassed', challenge: id});
    } else if (result.result === 'retry') {
      emit({type: 'challengeRetry', challenge: id, reason: result.reason});
      // Start over on the pad: new loads, a fresh fire, the same buoys.
      loads = loads.filter(car => !car.labLoad);
      challenge = null; challengeEvents = []; challengePatches = [];
      giveBackArrow(id);
      if (id !== 'altitude' || site.courseId === HOME_COURSE) beginChallenge(id);
    }
  }
  // ---- heli-skiing (docs/HELI_SKIING.md; SKI-HELI) ----
  // The group of a guide and four guests, the ski drop, the runs from a drop pad and the pickup. All of it needs the heli-skiing
  // switch and Summit Run: with either off none of it runs, shows in the view or changes a result.
  const skiFlags = Object.freeze({enabled: name => name === 'lab' ? labEnabled === true : name === 'helicopter' || name === 'heli-skiing'});
  const skiGroupId = day => `ski${day}`;
  const skiGroupDay = day => makeRng((HELI_SKIING.seed ^ (Number.isSafeInteger(day) && day >= 0 ? day : 0)) >>> 0).int(0, HELI_SKIING.groupOneDayIn - 1) === 0;
  // A helicopter standing on the ground takes the group's weight on or off at once; one in the air keeps its own.
  function refreshUpgrades() {
    if (!heli) return;
    const up = flightUpgrades();
    if (up) heli.upgrades = Object.freeze({thrustFactor: up.thrustFactor, emptyMassKg: up.emptyMassKg, altitudeScaleM: up.altitudeScaleM});
    else delete heli.upgrades;
  }
  function endSkiFlight() {
    skiFlight = null;
    if (groupAboard) { groupAboard = false; refreshUpgrades(); }
  }
  // The group job still taken in the save finds its group waiting at the home pad again on a new visit (nothing about it is saved).
  function rehydrateSkiGroup(courseId, arriving) {
    if (!skiOn || arriving) return;
    const jobs = heliOf(save).jobs, day = playDay(), id = skiGroupId(day);
    if (courseId === HOME_COURSE && jobs.day === day && jobs.taken === id && skiGroupDay(day)) { skiFlight = {kind: 'group', id, skied: false}; groupAboard = true; }
    else { skiFlight = null; groupAboard = false; }
  }
  // The flying area with the ceiling raised over the mountain while a ski drop or the group job is in hand (the same
  // rule the rescues use): the three pads are inside the area's width already, only the height was short.
  let areaCache = {base: null, area: null};
  function areaNow() {
    const base = site.area;
    if (!skiOn || !skiFlight || site.courseId !== SUMMIT_COURSE || base.aboveGround) return base;
    if (areaCache.base !== base) areaCache = {base, area: Object.freeze({...base, aboveGround: HELI_SESSION.ceilingAbove})};
    return areaCache.area;
  }
  // The drop pad under the helicopter, or null.
  function skiPadHere() {
    if (!skiOn || phase !== 'flying' || !heli?.onGround || site?.courseId !== SUMMIT_COURSE) return null;
    for (const [name, pad] of Object.entries(SKI_PADS)) if (Math.hypot(heli.x - pad.x, heli.z - pad.z) <= HELI_SKIING.padRadius) return name;
    return null;
  }
  const skiSay = line => emit({type: 'radio', line: `ski.radio.${line}`});
  function skiPadStep() {
    const pad = skiPadHere();
    if (pad === lastSkiPad) return;
    lastSkiPad = pad;
    if (pad && skiFlight) { emit({type: 'skiPad', pad}); skiSay('drop'); }
  }
  // "Thin air up here": the first time the collective is at its top and the helicopter still sinks, high on the mountain.
  function thinAirStep(lift) {
    if (!skiFlight || thinAirSaid || heli.onGround || !(lift >= 0.99) || !(heli.vy < 0) || heli.y + heli.altitudeOffset < HELI_SKIING.thinAirMetres) return;
    thinAirSaid = true;
    skiSay('thin-air');
  }
  // The group, flown home and set down on the home pad after the run: pays once through the job save.
  function deliverSkiGroup() {
    const pay = jobPay({pay: HELI_SKIING.groupPay}, mode), id = skiFlight.id;
    if (!commit(finishJob(save, id, pay, flag)).ok) return;
    emit({type: 'skiGroupDone', pay});
    skiSay('group.done');
    endSkiFlight();
    aim(null);
  }
  // Stepping out on a drop pad: the helicopter stays where it is, untouched (no fuel is burnt), and the ski zone takes over.
  function startSkiRun(runId, setting, meta) {
    autopilot.engaged = false;
    skiRun = createSkiRun({runId, wax: setting, group: skiFlight.kind === 'group'});
    skiMeta = meta;
    if (groupAboard) { groupAboard = false; refreshUpgrades(); }
    phase = 'skiing';
  }
  // The result of a finished run goes to the save: the best, the medal and its pay.
  function settleSkiResult(result) {
    const done = commit(recordSkiRun(save, result.run, result.kind === 'time' ? {time: result.time, medal: result.medal} : {points: result.points, medal: result.medal}, flag));
    if (done.ok) emit({type: 'skiRecorded', run: result.run, medal: result.medal, paid: done.paid, improved: done.improved, raised: done.raised});
    // The Lab's wax challenge: finish the slalom with the right wax for the day's snow.
    if (skiMeta?.challenge === 'wax' && result.kind === 'time') {
      const outcome = waxRunResult({day: skiMeta.day, pick: skiMeta.pick, time: result.time});
      if (outcome.pass) { commit(passLabChallenge(save, 'wax')); emit({type: 'waxChallengePassed'}); }
      else emit({type: 'waxChallengeFailed', reason: outcome.reason});
    }
  }
  function skiStepNow(controls, dt) {
    for (const event of stepSkiRun(skiRun, controls, dt)) {
      emit(event);
      if (event.type === 'skiResult') settleSkiResult(event);
      else if (event.type === 'skiStash') {
        const found = commit(findSkiStash(save, event.id, flag));
        emit({type: 'skiStashPaid', id: event.id, paid: found.paid ?? 0, found: found.found === true});
      } else if (event.type === 'skiPickup') climbIn(false);
    }
    return api.takeEvents();
  }
  // Back in the helicopter at the pickup pad: a new helicopter on the ground there with the same fuel, the group aboard again
  // (it skied down too). fetched: the run was left, so the helicopter came for the pilot.
  function climbIn(fetched) {
    const pad = SKI_PADS.pickup, fuel = heli.fuelKg, heading = heli.heading, finished = skiRun?.finished === true;
    // The group is aboard again (they skied down too), but the job is paid only for a run with a result: leaving a run, or
    // reaching the pickup without crossing the finish line, is no run. A free drop is done with any run.
    if (skiFlight?.kind === 'group') { groupAboard = true; if (finished) skiFlight.skied = true; }
    else if (skiFlight) skiFlight.skied = true;
    heli = createHeliState({x: pad.x, z: pad.z, heading, fuelKg: fuel, mode, altitudeOffset: placesNow()[SUMMIT_COURSE].baseAltitude - site.startY,
      ground: world.ground, upgrades: flightUpgrades()});
    skiRun = null; skiMeta = null;
    phase = 'flying';
    lastSkiPad = 'pickup';
    // A run ended by the pilot reaching the pickup has already told the ski module's `skiPickup`; a left run says it here.
    if (fetched) emit({type: 'skiPickup', fetched: true});
    skiSay(fetched ? 'fetch' : 'pickup');
    // The way home is set for the pilot.
    if (skiFlight) aim(HOME_COURSE);
  }
  // Something else in hand: a lesson, a Lab challenge, a rescue, or a load on the hook.
  const skiBusy = () => lesson ? 'Finish the lesson first.' : challenge ? 'Finish the challenge first.' : live ? 'Finish the rescue first.'
    : loads.some(car => car.hooked) ? 'Set the load down first.' : null;
  const skiBlocking = () => !heli?.onGround || phase !== 'flying' ? 'Heli-skiing starts on the ground.' : null;

  // The pump opens with lesson 3 (the first tank is always free, and a
  // nearly empty tank can always be filled); the dispatch board too; cars
  // can be carried after lesson 4.
  const pumpOpen = () => lessonsDone().landing || heliOf(save).refuels === 0 || (heli?.fuelKg ?? 0) <= KESTREL.tankKg * KESTREL.lowFuelShare;

  // ---- H4 Rescue (docs/HELI_RESCUE.md sections 3.4, 4, 5 and 7) ----
  // Only with the rescue switch (and the fire engine that rings the calls).
  // The rescue in hand is `live`: the save's record with its clock kept
  // exactly (the save keeps tenths). It is written to the save when something
  // changes and every 10 s. Where it happens (`rsite`) is picked from the
  // rescue's own seed, so the same save gives the same rescue. Leaving the
  // helicopter with a rescue in hand, or finding one stored at the start of a
  // visit, fails it (section 3.4); a crash fails it too.
  const CRATE_IDS = ['food', 'medicine', 'fuel'];
  const lineLoad = () => loads.find(car => car.rescue) ?? null;
  const crateLoads = () => loads.filter(car => car.supply);
  const say = line => emit({type: 'radio', line});
  const cue = id => emit({type: 'cue', id});
  let live = null, rsite = null, rdirty = false, rbank = 0, rend = null, tickSecond = null, duskSaid = false;
  let lineFirstSaid = false, setDownSaid = false;
  // Brian's two lines are for a new rescuer: only until the first person is saved.
  const newRescuer = () => (missionsOf(save).rescued ?? 0) === 0;

  function pickSites(r) {
    const w = siteWorldOf(r.courseId);
    if (r.kind === 'hiker') {
      const picked = pickHiker(hikerSpots(w.course, w.ground, w.site), r.seed);
      return picked && {hiker: picked.hiker, lastSeen: picked.lastSeen, clearing: picked.clearing, spotted: false, since: 0,
        walk: {x: picked.hiker.x, z: picked.hiker.z, arrived: false}, aboard: false, landedGood: false};
    }
    if (r.kind === 'avalanche') {
      const picked = pickSlide(slideSpots(w.course, w.ground), r.seed, w.ground);
      return picked && {slide: picked.slide, beacon: picked.beacon, heard: false, beep: 0, signal: null};
    }
    if (r.kind === 'hoist') {
      const picked = pickHoist(hoistSpots(w.course, w.ground), r.seed, w.ground);
      // The car carries the id the recovery job later offers (the same seeded pick).
      return picked && {driver: picked.driver, car: Object.freeze({...picked.car, carId: wreckFor({seed: r.seed, courseId: r.courseId, x: 0, z: 0, day: 0}).carId})};
    }
    const yard = supplyYard(w.course, w.ground), pickup = supplyPickup(w.course, w.ground);
    // Summit Run: the crates and the lodge's fuel truck wait at the pickup on its road (docs/HELI_RESCUE.md 5.4).
    if (pickup) {
      const spots = crateSpots(w.course, w.ground, pickup);
      const truck = Object.freeze({x: pickup.x + pickup.radius * 0.75, z: pickup.z, y: w.ground.height(pickup.x + pickup.radius * 0.75, pickup.z)});
      return yard && spots.length >= 3 ? {yard, pickup, truck, spots, results: [null, null, null]} : null;
    }
    const home = siteWorldOf(HOME_COURSE), spots = crateSpots(home.course, home.ground, home.site.zone);
    return yard && spots.length >= 3 ? {yard, spots, results: [null, null, null]} : null;
  }

  // The crates wait at the home pad's spots (or, at Summit Run, at its pickup) until they are down in the yard.
  function layCrates() {
    if (!live || live.kind !== 'supply' || !rsite || site.courseId !== (rsite.pickup ? live.courseId : HOME_COURSE)) return;
    CRATE_IDS.forEach((id, i) => {
      if (live.crates[i] === 2 || loads.some(car => car.supply && car.id === id)) return;
      // Like the lesson crate, not a car and not a job's: the hook code reads both.
      loads.push(Object.assign(createSupplyCrate({id, set: rsite.pickup ? 'summitRun' : 'tremblantSnow', x: rsite.spots[i].x, z: rsite.spots[i].z, heading: 0, ground: world.ground}),
        {own: false, job: null}));
    });
  }

  // The rescuer on a line left from the last rescue is ready for the next.
  function renewLine() {
    const line = lineLoad();
    if (!line || !line.done) return;
    Object.assign(line, {done: false, hold: 0, holding: false, overFor: 0, lifted: false, condition: 'unhurt', fastWarned: false});
    setLineWho(line, 'rescuer');
  }

  // The call was answered: the rescue begins.
  function beginRescueSite() {
    const r = rescueOf(missionsOf(save), rflag);
    if (!r || live) return;
    live = {...r, crates: [...r.crates]};
    // The supply run owns the hook. Stow this pad's idle return crate so
    // it cannot intercept H and redirect the mission; carried cargo stays.
    if (live.kind === 'supply') loads = loads.filter(load =>
      !(load.returnJob?.from === site.courseId && !load.hooked));
    rsite = pickSites(live);
    rdirty = false; rbank = 0; rend = null; tickSecond = null; duskSaid = false;
    renewLine();
    layCrates();
  }

  const writeLive = () => { commit(setMissions(save, {...missionsOf(save), rescue: live}, flag)); rdirty = false; rbank = 0; };
  function setStage(stage) { if (live && live.stage !== stage) { live = {...live, stage}; rdirty = true; } }
  function setCrate(index, value) { live = {...live, crates: live.crates.map((c, i) => i === index ? value : c)}; rdirty = true; }
  function noteCondition(index) { if (live && index > live.condition) { live = {...live, condition: index}; rdirty = true; } }
  const lineIndex = line => Math.max(0, CONDITIONS.indexOf(line.condition));

  // A rescue is over: the person is handed on, so the rescuer rides home with nothing left to do.
  function clearRescue() {
    live = null; rsite = null; rend = null; rdirty = false; rbank = 0; tickSecond = null; duskSaid = false;
    const line = lineLoad();
    if (line) { line.done = true; line.holding = false; line.hold = 0; setLineWho(line, 'rescuer'); }
    loads = loads.filter(car => !car.supply);
    layReturnCrate();
  }

  // A crash fails the rescue only with people aboard or on the line (section 3.4). Before the pickup it
  // goes on, with H1's crash repair as usual; a crate that was on the line is back at the pad.
  function crashRescue() {
    if (!live) return;
    if (peopleOnLine(lineLoad()) || (live.kind === 'hiker' && rsite?.aboard === true)) { failRescueNow('crash'); return; }
    if (live.crates.includes(1)) { live = {...live, crates: live.crates.map(c => c === 1 ? 0 : c)}; rdirty = true; }
    if (rsite?.landedGood) rsite.landedGood = false;
  }

  // Out of time, a crash, or leaving: the ground team brings them out badly hurt (section 4.2).
  function failRescueNow(reason) {
    if (!live) return;
    const r = live, down = r.kind === 'supply' && rsite ? rsite.results.filter(Boolean).reduce((sum, result) => sum + cratePay(result), 0) : 0;
    fire?.flush();   // engine time so far belongs to the spell that is ending
    writeLive();
    const failed = commit(failRescue(save, {reason, cratePay: down, enabled: true}));
    if (failed.ok) {
      emit({type: 'rescueFailed', kind: r.kind, courseId: r.courseId, reason, clockSeconds: r.clockSeconds, charged: failed.charged,
        forgiven: failed.forgiven, cratePaid: failed.cratePaid, crashRepair: failed.crashRepair});
      say(failed.line);
    }
    clearRescue();
  }

  // The handover, or the last crate: pay by condition, then the person is in the paramedics' hands.
  function finishRescueNow() {
    if (!live) return;
    const r = live, people = r.kind !== 'supply';
    const pay = people ? peoplePay(r, hoistBonus(gearNow(), r.kind)) : supplyPay(rsite.results, {inTime: true}).total;
    fire?.flush();
    writeLive();
    const done = commit(finishRescue(save, {pay, site: r.kind === 'hoist' && rsite ? {x: rsite.car.x, z: rsite.car.z} : null, enabled: true}));
    if (!done.ok) { clearRescue(); return; }
    const outcome = people ? handoverOutcome(CONDITIONS[r.condition]) : {look: null, line: 'heli.radio.supply.done'};
    emit({type: 'rescueDone', kind: r.kind, courseId: r.courseId, paid: done.paid, condition: r.condition, look: outcome.look,
      clockSeconds: r.clockSeconds, firstBadge: done.firstBadge, rescued: done.rescued});
    say(outcome.line);
    if (done.firstBadge) cue('heli.badge');
    clearRescue();
    earnNow();
  }

  // Simulated seconds on the clock (a step, or a cruise leg's flying time).
  function runClock(seconds) {
    const tick = tickRescue({rescue: live}, seconds, {...rflag, gear: gearNow()});
    live = tick.missions.rescue;
    if (tick.cold) {
      rdirty = true;
      const line = lineLoad();
      if (line && !line.done && lineIndex(line) < live.condition) line.condition = CONDITIONS[live.condition];
      say('heli.radio.rescue.cold');
    }
    return tick.expired;
  }

  function lineEvent(event) {
    emit(event);
    if (event.type === 'rescueFast') say('heli.radio.rescue.fast');
    else if (event.type === 'holdStarted') {
      setStage('hold');
      if (event.kind === 'avalanche') cue('heli.snow.dig');
      if (newRescuer() && !setDownSaid) { setDownSaid = true; say('heli.radio.line.setdown'); }
    } else if (event.type === 'holdReset') { say('heli.radio.rescue.steady'); setStage(rsite?.heard ? 'found' : 'fly'); }
    else if (event.type === 'clipped') { setStage('carry'); cue('heli.rescue.clip'); say('heli.radio.rescue.clipped'); }
    else if (event.type === 'roughSetDown') { noteCondition(CONDITIONS.indexOf(event.condition)); say('heli.radio.rescue.bump'); }
    else if (event.type === 'handover' && live && !rend) rend = 'handover';
  }

  // The line before the cable moves it: warnings, the hold at the casualty, the handover.
  function lineStep(line, dt) {
    const r = live, near = !!r && !!rsite && site.courseId === r.courseId;
    const target = near && r.kind === 'hoist' ? rsite.driver : near && r.kind === 'avalanche' ? rsite.beacon : null;
    const zones = r && (site.courseId === HOME_COURSE || site.courseId === r.courseId) ? [site.zone] : [];
    for (const event of stepRescue(line, heli, {target, kind: target ? r.kind : null, zones}, dt).events) lineEvent(event);
  }

  // A bump on the line hurts the casualty and costs no repair (section 4.1).
  function lineCableEvents(line, events) {
    for (const event of events) {
      if (event.type === 'cargoHit') {
        const hit = rescueHit(line, event, {gear: gearNow()});
        if (hit.bump) { emit(hit.event); noteCondition(lineIndex(line)); say('heli.radio.rescue.bump'); }
      } else if (event.type === 'treeDown') emit(event);
      else if (event.type !== 'drop') emit({...event, rescue: true});
    }
  }

  function hikerStep(dt) {
    const h = rsite;
    if (!h.spotted) {
      if (!hikerSpotted(heli, h.hiker, world.ground)) return;
      h.spotted = true; h.since = 0;
      setStage('found');
      cue('heli.flare');
      say('heli.radio.hiker.spotted');
      emit({type: 'hikerSpotted', x: h.hiker.x, z: h.hiker.z});
    } else if (!h.aboard) {
      h.since += dt;
      h.walk = hikerWalk(h.hiker, h.clearing, h.since);
      // The hiker climbs in when they have walked over and the helicopter has landed well in the clearing.
      if (h.walk.arrived && heli.onGround && h.landedGood && Math.hypot(heli.x - h.clearing.x, heli.z - h.clearing.z) <= h.clearing.radius) {
        h.aboard = true;
        setStage('carry');
        emit({type: 'hikerAboard'});
      }
    }
  }

  function beaconStep(dt) {
    const a = rsite, signal = beaconSignal(heli, a.beacon);
    a.signal = signal;
    if (live.stage === 'carry' || !signal.heard) { a.beep = 0; return; }
    if (!a.heard) { a.heard = true; if (live.stage === 'fly') setStage('found'); say('heli.radio.beacon.signal'); }
    a.beep -= dt;
    if (a.beep <= 0) { a.beep = signal.interval; emit({type: 'cue', id: 'heli.beacon.beep', pitch: signal.pitch}); }
  }

  function crateStep() {
    const a = rsite, onYard = site.courseId === live.courseId;
    for (const car of crateLoads()) {
      const i = CRATE_IDS.indexOf(car.id);
      if (i < 0 || live.crates[i] === 2) continue;
      if (car.hooked) { if (live.crates[i] !== 1) setCrate(i, 1); continue; }
      const result = onYard ? crateResult(car, a.yard) : null;
      if (result?.released) {
        a.results[i] = result;
        setCrate(i, 2);
        emit({type: 'crateDown', id: car.id, pay: cratePay(result)});
        if (live.crates.every(c => c === 2)) rend = rend ?? 'supply'; else say('heli.radio.supply.crate');
      } else if (live.crates[i] === 1) setCrate(i, 0);
    }
    setStage(live.crates.includes(1) ? 'carry' : 'fly');
  }

  // A touchdown: the hiker in the cabin, and the hiker's pick-up and handover.
  function rescueTouched(event) {
    if (!live || live.kind !== 'hiker' || !rsite) return;
    if (!rsite.aboard) { if (site.courseId === live.courseId) rsite.landedGood = event.result !== 'hard'; return; }
    const hurt = cabinHurt(CONDITIONS[live.condition], event);
    if (hurt.changed) noteCondition(CONDITIONS.indexOf(hurt.condition));
    const zone = site.zone, here = site.courseId === HOME_COURSE || site.courseId === live.courseId;
    if (here && event.result !== 'crash' && Math.hypot(heli.x - zone.x, heli.z - zone.z) <= zone.radius) rend = rend ?? 'handover';
  }
  const rescueLifted = () => { if (rsite && rsite.landedGood) rsite.landedGood = false; };

  // After the helicopter and the cable have moved: the places, the clock, then how it ends.
  // The clock runs first, so a frame that sees both the time running out and a
  // handover is a failure (the engine's finishRescue does not check the clock).
  function rescueStep(dt) {
    if (!live) return;
    const r = live, here = !!rsite && site.courseId === r.courseId;
    if (here && r.kind === 'hiker') hikerStep(dt);
    else if (here && r.kind === 'avalanche') beaconStep(dt);
    if (r.kind === 'supply' && rsite) crateStep();
    const expired = runClock(dt);
    if (expired) { failRescueNow('time'); return; }
    if (rend) { finishRescueNow(); return; }
    // Dark falls at the plain clock; the searchlight only lengthens the search into the night.
    const left = clockLeft(live, gearNow());
    if (live.kind === 'hiker' && !duskSaid && clockLeft(live) <= DUSK_SECONDS) { duskSaid = true; say('heli.radio.hiker.dusk'); }
    if (left <= 60) { const second = Math.ceil(left); if (second !== tickSecond) { tickSecond = second; cue('heli.clock.tick'); } }
    rbank += dt;
    if (rdirty || rbank >= 10) writeLive();
  }

  // What the panel needs (section 7): the clock, the kind, the stage, the place.
  const bearingTo = (x, z) => ({x, z, distance: Math.hypot(x - heli.x, z - heli.z),
    bearing: (Math.atan2(x - heli.x, z - heli.z) * 180 / Math.PI + 360) % 360});
  function rescueView(fireInfo) {
    const line = lineLoad(), call = callOf(missionsOf(save), rflag);
    const waiting = call && isRescueKind(call.kind) && !call.answered ? Object.freeze({kind: call.kind, courseId: call.courseId,
      courseName: placesNow()[call.courseId]?.name ?? null, answerLeft: fireInfo?.answerLeft ?? 0}) : null;
    let active = null;
    if (live) {
      const r = live, here = !!rsite && site?.courseId === r.courseId, gear = gearNow(), left = clockLeft(r, gear);
      let target = null, sites = null, refuelFirst = false;
      if (rsite && heli) {
        if (r.kind === 'hiker' && here) {
          target = rsite.spotted ? bearingTo(rsite.clearing.x, rsite.clearing.z) : {...bearingTo(rsite.lastSeen.x, rsite.lastSeen.z), radius: SEARCH.areaRadius};
          sites = Object.freeze({lastSeen: rsite.lastSeen, clearing: rsite.clearing, hiker: rsite.spotted ? Object.freeze({...rsite.walk}) : null,
            flareLeft: rsite.spotted ? Math.max(0, SEARCH.flareSeconds - rsite.since) : 0, aboard: rsite.aboard});
        } else if (r.kind === 'avalanche' && here) {
          target = bearingTo(rsite.slide.x, rsite.slide.z);
          const stands = summitStands();
          sites = Object.freeze(stands.length ? {slide: rsite.slide, beacon: rsite.beacon, pickup: stands[1]?.circle ?? null, truck: stands[1]?.truck ?? null,
            zoneTruck: stands[0].truck, atTruck: atTruck()} : {slide: rsite.slide, beacon: rsite.beacon});
        } else if (r.kind === 'hoist' && here) {
          target = bearingTo(rsite.driver.x, rsite.driver.z);
          sites = Object.freeze({driver: rsite.driver, car: rsite.car});
        } else if (r.kind === 'supply') {
          const crateAt = rsite.pickup ? (here ? rsite.pickup : null) : (site?.courseId === HOME_COURSE ? rsite.spots[0] : null);
          const goal = r.crates.includes(1) ? (here ? rsite.yard : null) : crateAt;
          target = goal ? bearingTo(goal.x, goal.z) : null;
          if (here) sites = Object.freeze(rsite.pickup ? {yard: rsite.yard, pickup: rsite.pickup, truck: rsite.truck, zoneTruck: summitStands()[0]?.truck ?? null, spots: rsite.spots, atTruck: atTruck()} : {yard: rsite.yard});
          else if (site?.courseId === HOME_COURSE) sites = Object.freeze({spots: rsite.spots});
        }
      }
      // Summit has a planned fuel stop beside the slide. Below it, budget the
      // climb to the slide and that truck; above it, budget pickup and handover.
      // Use the flight model's thin-air thrust and full departure fuel/load to
      // estimate burn, with a minute for approaches and the hold. Guidance only:
      // the autopilot never routes through a truck.
      let refuelStop = null;
      if (here && r.kind === 'avalanche' && r.courseId === SUMMIT_COURSE && r.stage !== 'carry') {
        const slide = rsite.slide, zone = site.zone, pickup = summitStands()[1]?.circle;
        const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
        const below = pickup && distance(heli, zone) < distance(heli, pickup);
        const end = below ? pickup : zone;
        const top = Math.max(heli.y, world.ground.height(slide.x, slide.z) + 80);
        const planned = {...heli, y: top, fuelKg: 330, vx: 0, vz: 20};
        const collective = Math.min(1, (heliMass(planned) + 170) * GRAVITY / availableThrust(planned, 80));
        const burn = KESTREL.burnIdle + KESTREL.burnPerCollective * collective;
        const seconds = (distance(heli, slide) + distance(slide, end)) / 20
          + Math.max(0, top - heli.y) / AUTOPILOT.maxClimb + 60;
        refuelFirst = heli.fuelKg < seconds * burn;
        refuelStop = below ? 'start' : 'pickup';
        if (refuelFirst) {
          const truckCircle = below ? zone : pickup;
          if (truckCircle) target = bearingTo(truckCircle.x, truckCircle.z);
        }
      }
      const signal = r.kind === 'avalanche' && here && rsite.signal ? Object.freeze({heard: rsite.signal.heard, bar: rsite.signal.bar,
        interval: rsite.signal.interval, pitch: rsite.signal.pitch}) : null;
      // Carrying people: the way to a handover circle (the pad here, or the rescue course's own).
      if (rsite && heli && r.kind !== 'supply' && r.stage === 'carry')
        target = site && (site.courseId === HOME_COURSE || here) ? bearingTo(site.zone.x, site.zone.z) : null;
      active = Object.freeze({kind: r.kind, id: r.id, courseId: r.courseId, courseName: placesNow()[r.courseId]?.name ?? null,
        stage: r.stage, condition: r.condition, conditionName: CONDITIONS[r.condition], here,
        clockSeconds: r.clockSeconds, limit: rescueLimit(r.kind, gear, r.courseId), left, orange: left <= 60, dusk: duskOf(r),
        ...(r.kind === 'avalanche' && r.courseId === SUMMIT_COURSE ? {refuelFirst, refuelStop} : {}),
        crates: Object.freeze([...r.crates]), cratesDown: r.crates.filter(c => c === 2).length, target, signal, sites});
    }
    return Object.freeze({
      line: line ? Object.freeze({who: line.who, condition: line.condition, holding: line.holding === true, hold: live ? holdFraction(line, live.kind) : 0,
        done: line.done === true, onGround: line.onGround, x: line.x, y: line.y, z: line.z}) : null,
      crates: Object.freeze(crateLoads().map(crate => Object.freeze({id: crate.id, x: crate.x, y: crate.y, z: crate.z, heading: crate.heading,
        hooked: crate.hooked, onGround: crate.onGround}))),
      call: waiting, active,
      // Where the autopilot is flying (a rescue's area, the cliff spot, the handover circle), or null.
      goal: autopilot.engaged && autopilot.target ? Object.freeze({...autopilot.target}) : null,
      // The course's ground height, so the drawing can stand people and snow blocks on the terrain.
      ground: world?.ground ? (x, z) => world.ground.height(x, z) : null});
  }


  // ---- H3 skins, dirt and the wash (docs/HELI_WILDLIFE.md sections 5 to 7) ----
  // Only with the heli-skins switch. Earning, buying and wearing are the
  // rules of heli-skins.js; this is where the session asks for them, charges
  // once through the save and says it. Dirt is looks only.
  const SKIN_TICK = 0.5;
  const SCARE_SAY_GAP = 30;
  const needSkins = () => skinOn ? null : {ok: false, reason: 'Skins are not available yet.'};
  const atPad = () => phase === 'flying' && onHome();

  // The distance to the nearest burning cell from any of the points, or null.
  function burningDistance(points) {
    const info = fire?.view(null);
    if (!info?.burning?.length || info.courseId !== site.courseId) return null;
    let best = Infinity;
    for (const point of points) for (const cell of info.burning) best = Math.min(best, Math.hypot(point.x - cell.x, point.z - cell.z));
    return best;
  }
  // Water on the fire: a drop within 30 m of a burning cell soots the helicopter.
  function waterOnFire(patches) {
    if (skinOn) flightDirt = addDrop(flightDirt, burningDistance(patches));
    fire?.water(site.courseId, patches);
  }
  // Whole levels from the flight so far go on the saved dirt; part intervals carry on.
  function settleDirt() {
    if (!skinOn) return;
    const {gains, rest} = settleFlightDirt(flightDirt);
    flightDirt = rest;
    if (!DIRT_KINDS.some(kind => gains[kind] > 0)) return;
    const result = addDirt(save, gains, sflag);
    commit(result);
    if (result.ok && result.hint) say('heli.radio.wash.hint');
  }
  // A landing: dust or mud off the pad, then the flight's dirt is settled.
  function landedDirt() {
    if (!skinOn) return;
    const onPad = Math.hypot(heli.x - site.zone.x, heli.z - site.zone.z) <= site.zone.radius;
    flightDirt = addLanding(flightDirt, site.courseId, {onPad});
    settleDirt();
  }
  // Every half second of flying: engine time and where it was spent (the
  // courses by the sea are not destinations yet, so nothing is over the sea),
  // and any skin newly earned.
  function skinStep(dt) {
    dirtBank += dt;
    if (dirtBank < SKIN_TICK - 1e-9) return;
    const seconds = dirtBank;
    dirtBank = 0;
    earnNow();
    if (heli.engine !== true) return;
    flightDirt = addFlightTime(flightDirt, seconds, {courseId: site.courseId, height: heli.y - world.ground.height(heli.x, heli.z),
      overSea: false, fireDistance: burningDistance([heli])});
  }
  // The fifth mission of a kind gives its skin (missions done before H3 count).
  function earnNow() {
    if (!skinOn) return;
    const result = earnSkins(save, sflag);
    if (!result.ok || !result.earned.length) return;
    commit(result);
    const names = result.earned.map(kind => SKINS[kind].name);
    skinNote = `New coat of paint: ${names.join(', ')}. Wear it at the paint shop.`;
    for (const kind of result.earned) emit({type: 'skinEarned', kind, name: SKINS[kind].name, first: result.first});
    if (result.first) say('heli.radio.skin.earned');
  }
  // The skin a fit button offers in the same click (section 5.2): the bucket
  // goes with the fire service coat; the rescue line with medevac for a hoist
  // and search and rescue for a search; the count with the wildlife coat.
  function lineOfferKind() {
    const call = callOf(missionsOf(save), rflag), kind = live?.kind ?? (call && isRescueKind(call.kind) ? call.kind : null);
    const wanted = kind === 'hoist' ? ['medevac'] : kind === 'hiker' || kind === 'avalanche' ? ['rescue'] : ['medevac', 'rescue'];
    return wanted.find(skin => skinOffer(save, skin)) ?? null;
  }
  function fitOffers() {
    return Object.freeze({bucket: skinOffer(save, 'fire'), line: lineOfferKind(), survey: skinOffer(save, 'wildlife')});
  }
  function wearOffered(kind) {
    if (skinOn && kind && skinOffer(save, kind)) api.wearPaint(kind);
  }
  // A fit that also wears the matching coat when asked: the fit's own answer is kept.
  const fitted = (wear, kind, result) => { if (wear === true && result.ok) wearOffered(typeof kind === 'function' ? kind() : kind); return result; };

  // ---- the wildlife count (section 4) ----
  // Taken at the pad from the board; the run lives only in this visit and
  // starts clean whenever the helicopter is on the course (leaving the
  // course or taking another job drops it).
  function dropSurvey(reason) {
    if (!surveyTaken) return;
    const job = surveyTaken;
    surveyTaken = null; surveyRun = null;
    emit({type: 'surveyDropped', jobId: job.id, reason});
  }
  function startSurveyRun() {
    const a = site.area, m = HELI_SESSION.areaMargin;
    const plan = planSurvey(surveyTaken, {site: {minX: a.minX + m, maxX: a.maxX - m, minZ: a.minZ + m, maxZ: a.maxZ - m},
      canStand: typeof surveyStand === 'function' ? surveyStand(site.courseId, world) : null, wildlife});
    surveyRun = createSurveyRun(plan);
    scareSaidAt = -Infinity;
  }
  // On entering a course: the count in hand starts here, or it is dropped.
  function surveyArrived() {
    surveyRun = null;
    if (!surveyTaken) return;
    const today = surveyJobOf(save, wildFlag);
    if (!today || today.id !== surveyTaken.id) { dropSurvey('over'); return; }
    if (surveyTaken.courseId !== site.courseId) { dropSurvey('left'); return; }
    startSurveyRun();
  }
  function surveyStepNow(dt, gear) {
    const run = surveyRun, agl = heli.y - world.ground.height(heli.x, heli.z);
    const events = stepSurvey(run, {dt, x: heli.x, z: heli.z, agl}, gear);
    // Two animals in one step tick the panel one after the other.
    let counted = run.count - events.filter(event => event.type === 'count').length;
    for (const event of events) {
      if (event.type === 'count') { emit({type: 'surveyCount', id: event.id, count: ++counted, percent: surveyPercent(run)}); cue('heli.survey.click'); }
      else if (event.type === 'scare') {
        emit({type: 'surveyScare', id: event.id});
        if (run.time - scareSaidAt >= SCARE_SAY_GAP) { scareSaidAt = run.time; say('heli.radio.survey.scared'); }
      } else if (event.type === 'rare') { emit({type: 'surveyRare', id: event.id}); say('heli.radio.survey.rare'); }
    }
  }
  function takeSurvey(job, {wear = false} = {}) {
    if (!lessonsDone().landing) return {ok: false, reason: 'Finish lesson 3, landing, to open the dispatch board.'};
    if (jobInHand()) return {ok: false, reason: 'Finish or drop your car job first.'};
    if (surveyTaken?.id === job.id) return {ok: true, already: true, job};
    surveyTaken = job;
    surveyRun = null;
    emit({type: 'surveyTaken', job});
    say('heli.radio.survey.taken');
    if (job.courseId === site.courseId) { startSurveyRun(); aim(null); } else aim(job.courseId);
    if (wear) wearOffered('wildlife');
    return {ok: true, job};
  }

  const api = {
    start(courseId = HOME_COURSE) {
      hookHeld = false; hookReeled = false;
      skiRun = null; skiMeta = null; thinAirSaid = false; lastSkiPad = null;
      const noted = today ? commit(notePlayDay(save, today, flag)) : null;
      // A rescue found stored was left in hand: it cannot be resumed (section 3.4).
      if (rescueOn && rescueOf(missionsOf(save), rflag)) { live = {...rescueOf(missionsOf(save), rflag)}; failRescueNow('left'); }
      fire?.start({newDay: noted?.newDay === true});
      destination = null;
      enter(courseId);
      // A call is due on the next flight: work out where rescues can happen now, at the start of the visit, not in mid-air.
      if (rescueOn) { const m = missionsOf(save); if (m.seed !== 0 && m.need > 0 && m.count >= m.need && !m.call && !m.rescue) rescueCourses(); }
      // A new pilot hears the opening: welcome and the controls.
      if (courseId === HOME_COURSE && LESSON_ORDER.every(id => !lessonsDone()[id])) {
        emit({type: 'radio', line: 'heli.radio.welcome'});
        emit({type: 'radio', line: 'heli.radio.controls'});
        emit({type: 'openingOffered'});
      }
      const job = jobInHand();
      if (job) aimAtJob(job);
      earnNow();
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
          tableCall(from, site.courseId);
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
          if (retryAfterCrash) { const id = retryAfterCrash; retryAfterCrash = null; api.startLesson(id); }
        }
        return api.takeEvents();
      }
      if (phase === 'skiing') return skiStepNow(controls, dt);
      if (phase !== 'flying') return api.takeEvents();
      const gear = gearNow();
      // The medevac coat acts on H when it is let go, and only if the winch was
      // not used while it was held (see hookKey): a tap hooks or releases.
      if (hookHeld && controls.pour !== true) {
        hookHeld = false;
        if (!hookReeled) api.pressHook();
      }
      const held = heldLoad();
      // The medevac winch (docs/HELI_WILDLIFE.md section 7): with H held, W (lift
      // up) reels the line in and S (lift down) pays it out, or controls.reel (-1
      // in, +1 out). The keys are the winch's while it reels, so they do not also
      // raise or lower the helicopter, and the hook does not act on H.
      let flightControls = controls;
      if (gear?.reelSpeed > 0) {
        const hooking = controls.pour === true && !bucketLoad();
        const explicit = Number.isFinite(controls.reel) && controls.reel !== 0 ? Math.sign(controls.reel) : 0;
        const reel = explicit || (hooking && controls.lift ? -Math.sign(controls.lift) : 0);
        if (reel !== 0) hookReeled = true;
        if (hooking && !explicit && controls.lift) flightControls = {...controls, lift: 0};
        reelWinch(winch, gear, reel, dt, held);
      }
      const hang = hangOf(held);
      refreshFireGoal();
      // With people on the line the autopilot holds the line speed limit too (section 7).
      if (rescueOn && autopilot.engaged && Number.isFinite(autopilot.speed) && autopilot.speed > RESCUE.speedLimit && hNothing(loads)) autopilot.speed = RESCUE.speedLimit;
      const ap = autopilotStep(autopilot, heli, flightControls, {ground: world.ground, hang, load: held, dt,
        ceiling: (x, z) => ceilingAt(areaNow(), x, z, world.ground)});
      handle(ap.events);
      // Every car steps; only the one on the cable pulls on the helicopter.
      let pull;
      for (const car of loads) {
        if (car.netted) continue;   // a crate in the net rides with its carrier
        if (car.bucket) {
          const poured = stepBucket(car, {ground: world.ground, wind: fire?.windNow() ?? null, pour: controls.pour === true}, dt);
          for (const event of poured.events) {
            emit(event);
            if (event.type === 'bucketDip' && skinOn) flightDirt = addDip(flightDirt);
            if (event.type === 'bucketDamaged') commit(damageBucketSave(save, event.damage, fireFlag));
            fire?.bucketEvent(event);
          }
          // A drop reaches the fire as a whole, once all its water has landed.
          if (challenge && WATER_CHALLENGES.includes(challenge.id)) challengePatches.push(...poured.patches); else dropWater.push(...poured.patches);
          if (dropWater.length && !car.pouring && !car.parcels.length) { waterOnFire(dropWater); dropWater = []; }
          aimStep(car);
        }
        if (car.rescue) lineStep(car, dt);
        const cable = stepCable(car, heli, {ground: world.ground, zone: site.zone, fallen}, dt);
        if (car.bucket) bucketCableEvents(car, cable.events);
        else if (car.rescue) lineCableEvents(car, cable.events);
        else handle(cable.events);
        if (car.netCrates?.length) { carryNet(car); spillNet(car); }
        if (car.hooked || pull === undefined) pull = cable.force;
      }
      const flown = stepHeli(heli, ap.commands ? {} : flightControls, {ground: world.ground, external: pull, commands: ap.commands}, dt);
      // Touching the sea, however gently, is a crash.
      handle(heli.onGround && overSea(heli.x, heli.z)
        ? [...flown.filter(event => event.type !== 'touchdown' && event.type !== 'crash'), {type: 'crash', cause: 'sea'}] : flown);
      if (phase !== 'flying') return api.takeEvents();
      rescueStep(dt);
      if (pilotOn) spotterStep(dt);
      if (skinOn) skinStep(dt);
      if (surveyRun) surveyStepNow(dt, gear);
      fire?.step({dt, engine: heli.engine === true, aboveGround: heli.y - world.ground.height(heli.x, heli.z), lesson: !!lesson});
      if (lesson) stepLessonNow(dt);
      if (challenge) stepChallengeNow(dt);
      if (strandedOnGround()) {
        storeFuel();
        const truck = commit(fuelTruck(save, flag));
        refuelHeli(heli, heliOf(save).fuelKg);
        if (challenge) challengeEvents.push({type: 'refuelled'});
        emit({type: 'charged', kind: 'fuelTruck', amount: (truck.charged ?? 0) + (truck.forgiven ?? 0),
          charged: truck.charged ?? 0, forgiven: truck.forgiven ?? 0});
        emit({type: 'radio', line: 'heli.radio.fuel.truck'});
      }
      if (skiOn) {
        skiPadStep();
        thinAirStep(flightControls.lift);
        if (skiFlight?.kind === 'group' && skiFlight.skied && groupAboard && onHome()) deliverSkiGroup();
        else if (skiFlight?.kind === 'drop' && skiFlight.skied && onHome()) { endSkiFlight(); aim(null); emit({type: 'skiDropDone'}); }
      }
      // The flying area: a destination elsewhere offers the cruise leg;
      // with none the edge holds the helicopter in.
      const a = areaNow();
      if (!insideArea(a, heli.x, heli.y, heli.z, world.ground)) {
        if (destination && destination !== site.courseId) {
          if (!cruiseOffered) {
            cruiseOffered = true;
            emit({type: 'cruiseOffered', to: destination});
            emit({type: 'radio', line: 'heli.radio.cruise.ready'});
          }
        } else {
          heli.x = clamp(heli.x, a.minX, a.maxX); heli.z = clamp(heli.z, a.minZ, a.maxZ);
          const top = ceilingAt(a, heli.x, heli.z, world.ground);
          heli.y = Math.min(heli.y, top);
          if (heli.x === a.minX || heli.x === a.maxX) heli.vx = 0;
          if (heli.z === a.minZ || heli.z === a.maxZ) heli.vz = 0;
          if (heli.y === top) heli.vy = Math.min(0, heli.vy);
        }
      } else if (cruiseOffered) cruiseOffered = false;
      return api.takeEvents();
    },
    // H: hook the load under the hook, or let it go. A clean release in a
    // landing zone delivers the car there: the player's own car is saved
    // there, and a customer's car at its drop-off finishes the job.
    pressHook() {
      if (phase !== 'flying' || !loads.length) return null;
      // A fitted bucket or rescue line keeps the hook busy; H says so when a
      // load is near enough to be meant (H with the bucket also pours).
      if (bucketLoad()) return refuseHook('bucket');
      // H does nothing while people are on the line (section 4).
      if (rescueOn && hNothing(loads)) return refuseHook('rescueLine');
      const held = heldLoad();
      if (held) {
        const result = release(held, world.ground);
        if (lesson?.id === 'carry' && held.crate)
          result.event.crateRelease = Object.freeze({x: held.x, z: held.z, onGround: held.onGround});
        if (held.job) result.event.job = held.job;
        if (held.supply) noteCrateRelease(held, result.event);
        emit(result.event);
        const inZone = Math.hypot(held.x - site.zone.x, held.z - site.zone.z) <= site.zone.radius;
        if (held.own && inZone) {
          commit(placeCar(save, carId, site.courseId, flag));
          emit({type: 'delivered', carId, courseId: site.courseId, dropped: result.event.type === 'releasedHigh'});
          offer = isCourseUnlocked(save, site.courseId) && !courseClosed(save, site.courseId, undefined, fireFlag) ? {courseId: site.courseId, carId} : null;
        } else if (held.job && inZone) deliverJob(held, result.event);
        else if (held.returnJob && inZone && site.courseId === held.returnJob.to && result.event.type === 'released') {
          const paid = commit(finishReturnLoad(save, held.returnJob, mode, dflag));
          if (paid.ok) {
            emit({type: 'jobDone', job: held.returnJob, pay: paid.paid});
            emit({type: 'radio', line: 'heli.radio.job.done'});
            loads = loads.filter(load => load !== held);
            layReturnCrate();
          }
        }
        return result.event;
      }
      // The car nearest the hook; H elsewhere stays quiet. The worn gear sets the
      // hook's reach and, on the medevac skin, the length of the line.
      const gear = hookGear(), hookReach = Number.isFinite(gear?.hookReach) ? gear.hookReach : CABLE.hookReach;
      const hookAt = {x: heli.x, y: heli.y - lineLengthOf(gear), z: heli.z};
      const reach = car => Math.hypot(hookAt.x - car.x, hookAt.z - car.z);
      const load = loads.reduce((best, car) => car.netted || (!best.netted && reach(best) <= reach(car)) ? best : car);
      // The lesson crate is not a car; the hook limit still applies to it.
      if (!load.crate && !load.supply && !liftCheck(load.id, liftLimit()).ok) {
        // Only when the hook is over the car.
        if (reach(load) <= hookReach && Math.abs(hookAt.y - load.y) <= CABLE.hookHeightSlack + 1)
          emit({type: 'cannotLift', carId: load.id, reason: liftCheck(load.id, liftLimit()).reason});
        return null;
      }
      if (!load.crate && !load.supply && !lessonsDone().carry) {
        if (reach(load) <= hookReach && Math.abs(hookAt.y - load.y) <= CABLE.hookHeightSlack + 1)
          emit({type: 'cannotLift', carId: load.id, reason: 'Finish lesson 4, carry and set down, before carrying cars.'});
        return null;
      }
      // The cargo net takes the nearest two crates in one go (heli-rescue.js hookCrates).
      let result, hooked = load;
      if (load.supply && gear?.crates >= 2) {
        const netted = hookCrates(heli, crateLoads(), gear);
        if (!netted.ok) return refuseHook();
        result = netted; hooked = netted.carrier;
      } else {
        if (!canHook(heli, load, gear)) return refuseHook();
        result = hook(heli, load, gear);
        if (!result.ok) return null;
      }
      if (gear?.reelSpeed > 0) hooked.lineLength = winch.length;
      else if (labLine() !== CABLE.length) hooked.lineLength = labLine();
      // Back to the plain line: a car that was last hung at the long one must not keep it.
      else if (labEnabled === true) delete hooked.lineLength;
      if (hooked.job) result.event.job = hooked.job;
      emit(result.event);
      if (hooked.returnJob) aim(hooked.returnJob.to);
      if (hooked.own) offer = null;
      const job = hooked.job ? jobInHand() : null;
      if (job?.id === hooked.job) aim(job.to);
      return result.event;
    },
    // The H key going down (what the game calls). On every coat but medevac it is
    // pressHook at once, exactly as it always was. With the medevac coat it only
    // notes that H is held: letting go hooks or releases, unless W or S reeled
    // the winch in the meantime.
    hookKey() {
      if (!(gearNow()?.reelSpeed > 0)) return api.pressHook();
      if (phase !== 'flying') return null;
      hookHeld = true; hookReeled = false;
      return null;
    },
    // Focus lost, a crash or a new visit: an H that is still down is forgotten, so
    // it can never read as a tap later.
    cancelHook() { hookHeld = false; hookReeled = false; },
    // P: the autopilot on or off. It flies toward the chosen destination.
    pressAutopilot() {
      if (phase !== 'flying') return false;
      if (challenge?.id === 'headings') return false;
      const on = toggleAutopilot(autopilot, heli);
      if (on) setAutopilotTarget(autopilot, autopilotGoal());
      emit({type: on ? 'autopilotOn' : 'autopilotOff', reason: 'pilot'});
      return on;
    },
    // Only while flying: a cruise leg in progress keeps its destination.
    setDestination(courseId) {
      if (phase !== 'flying' || courseId !== null && !isDestination(courseId, dflag)) return false;
      if (challenge?.id === 'headings') return false;
      aim(courseId);
      return true;
    },
    // Accept the cruise leg: fade out, take the leg's fuel, arrive 1.5 km
    // out from the destination's zone at 150 m.
    acceptCruise() {
      if (phase !== 'flying' || !cruiseOffered || !destination) return false;
      const fuel = legFuelKg(site.courseId, destination, dflag);
      if (fuel === null || heli.fuelKg < fuel) {
        emit({type: 'cruiseRefused', to: destination, needKg: fuel});
        emit({type: 'radio', line: 'heli.radio.cruise.refused'});
        return false;
      }
      heli.fuelKg -= fuel;
      fire?.cruise(fuel);
      if (skinOn) { flightDirt = addFlightTime(flightDirt, cruiseSeconds(fuel), {}); settleDirt(); }
      // The leg flying time runs the rescue clock too.
      if (live && runClock(cruiseSeconds(fuel))) failRescueNow('time');
      cruiseTo = destination;
      phase = 'cruise';
      timer = HELI_SESSION.fadeSeconds;
      emit({type: 'cruise', from: site.courseId, to: destination, fuelKg: fuel});
      return true;
    },
    // Fuel from the pump: only on the home pad, with the engine idling on
    // the ground. Infinity fills the tank (the free first tank).
    buyFuel(kg = Infinity) {
      if (phase !== 'flying' || !pumpHere()) return {ok: false, reason: 'The pump is at the home pad.'};
      if (!pumpOpen()) return {ok: false, reason: 'Finish lesson 3, landing, to use the pump.'};
      storeFuel();
      // The free first tank is the home pad's: at the Summit truck fuel is always paid, and
      // the pilot's free tank at the pad is left for the pad.
      const freeTank = heliOf(save).refuels === 0 && !onHome();
      const price = padPrice(), priced = price === null ? flag : {...flag, pricePerKg: price};
      let bought = freeTank ? buyFuel({...save, heli: {...heliOf(save), refuels: 1}}, kg, priced) : buyFuel(save, kg, priced);
      if (freeTank && bought.ok) bought = {...bought, profile: {...bought.profile, heli: {...heliOf(bought.profile), refuels: 0}}};
      const result = commit(bought);
      if (result.ok) {
        refuelHeli(heli, heliOf(save).fuelKg);
        if (challenge) challengeEvents.push({type: 'refuelled'});
        emit({type: 'fuelBought', kg: result.kg, cost: result.cost});
        fire?.refuel();
      }
      return result;
    },
    // The dispatch board (docs/HELICOPTER.md section 6): "Fly my car" and
    // today's three jobs, each marked taken or done from the save.
    boardJobs() {
      const day = playDay(), jobs = heliOf(save).jobs, sameDay = jobs.day === day;
      const recovery = rescueOn ? recoveryJobOf(save, {enabled: true}) : null, count = wildOn ? surveyJobOf(save, wildFlag) : null;
      const taken = sameDay ? jobs.taken : null, done = sameDay ? jobs.done : [];
      return Object.freeze([
        Object.freeze({id: 'own', own: true, carId, title: 'Fly my car', pay: 0}),
        ...dayJobs(day, jobOptions()).map(job => Object.freeze({...job, title: jobTitle(job), payNow: jobPay(job, mode),
          taken: job.id === taken, done: done.includes(job.id)})),
        // After a hoist rescue the driver's car waits on the slope (section 5.3): shown with the day's jobs.
        ...(recovery ? [Object.freeze({...recovery, recovery: true, title: recoveryTitle(recovery), payNow: jobPay(recovery, mode),
          taken: recovery.id === taken, done: false})] : []),
        // The wildlife count, on its own line below the car jobs (section 4).
        ...(count ? [Object.freeze({...count, survey: true, title: surveyTitle(count), payNow: count.pay, taken: surveyTaken?.id === count.id, done: false})] : []),
      ]);
    },
    // Jobs are taken at the home pad, on the ground, like the pump. "Fly my
    // car" only clears the destination; a job is saved and the way to its
    // pick-up (or, from the pick-up, its drop-off) is set.
    takeJob(id, options = {}) {
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      // One thing at a time: a ski drop or the group job in hand keeps the board's other jobs off (and their arrows).
      if (skiFlight) return {ok: false, reason: 'Finish or drop the ski flight first.'};
      const count = wildOn ? surveyJobOf(save, wildFlag) : null;
      if (count && id === count.id) return takeSurvey(count, options);
      if (id === 'own') { dropSurvey('other'); aim(null); return {ok: true, own: true}; }
      if (!lessonsDone().landing) return {ok: false, reason: 'Finish lesson 3, landing, to open the dispatch board.'};
      const day = playDay(), recovery = rescueOn ? recoveryJobOf(save, {enabled: true}) : null;
      const job = dayJobs(day, jobOptions()).find(item => item.id === id) ?? (recovery?.id === id ? recovery : null);
      if (!job) return {ok: false, reason: "That job is not on today's board."};
      const result = commit(takeJobSave(save, id, day, flag));
      if (!result.ok) return result;
      dropSurvey('other');
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
      if (surveyTaken) { dropSurvey('dropped'); aim(null); return {ok: true, dropped: true, survey: true}; }
      const job = jobInHand();
      const result = commit(dropJobSave(save, flag));
      if (result.ok && result.dropped) {
        if (skiFlight?.kind === 'group') endSkiFlight();
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
    // The Lab's challenges (docs/LAB.md 4.1): the rows for the board, and start or end the try in hand.
    challengeBoard() {
      return Object.freeze(CHALLENGE_IDS.map(id => Object.freeze({id, open: labEnabled === true && labChallengeOpen(save, id).open && (!WATER_CHALLENGES.includes(id) || !!fire),
        active: challenge?.id === id, done: labEnabled === true && labChallengesDone(save)[id] === true})));
    },
    startChallenge(id) {
      if (labEnabled !== true) return {ok: false, reason: 'The Lab is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'Challenges start on the home pad.'};
      if (!CHALLENGE_IDS.includes(id)) return {ok: false, reason: 'That is not a challenge.'};
      const open = labChallengeOpen(save, id);
      if (!open.open) return {ok: false, reason: open.note};
      if (lesson) return {ok: false, reason: 'Finish the lesson first.'};
      if (groupAboard) return {ok: false, reason: 'Set the group down first.'};
      // The bucket on the hook is fine for the two water challenges and the heading flight; the others need a free hook.
      const free = id === 'projectile' || id === 'fire' || id === 'headings' ? loads.every(car => !car.hooked || car.bucket) : loads.every(car => !car.hooked);
      if (!free) return {ok: false, reason: loads.some(car => car.hooked && car.bucket) ? 'Take the bucket off first.' : 'Set the load down first.'};
      if (WATER_CHALLENGES.includes(id) && !fire) return {ok: false, reason: 'Forest fires are not available yet.'};
      if (id === 'lift' && heli.fuelKg < CHALLENGE_RULES.lift.fullTankKg) return {ok: false, reason: 'Fill the tank first.'};
      if (id === 'altitude' && !placesNow()[CHALLENGE_RULES.altitude.courseId]) return {ok: false, reason: 'Summit Run is not open yet.'};
      endChallenge(null);
      return beginChallenge(id);
    },
    stopChallenge() { return endChallenge('stopped'); },
    // ---- heli-skiing (SKI-HELI) ----
    // The board's two ski entries at the home pad: the free drop at Summit Run and, one play day in three, the group job.
    // Null while the switch is off, Summit Run is not owned or the landing lesson is not done. boardJobs() is not changed.
    skiBoard() {
      if (!skiOn || !isCourseUnlocked(save, SUMMIT_COURSE) || !lessonsDone().landing) return null;
      const day = playDay(), jobs = heliOf(save).jobs, sameDay = jobs.day === day, id = skiGroupId(day);
      const group = skiGroupDay(day) ? Object.freeze({id, title: 'Heli-ski group at Summit Run', pay: HELI_SKIING.groupPay, payNow: jobPay({pay: HELI_SKIING.groupPay}, mode),
        guests: HELI_SKIING.guests, kg: HELI_SKIING.groupKg, taken: sameDay && jobs.taken === id, done: sameDay && jobs.done.includes(id)}) : null;
      return Object.freeze({drop: Object.freeze({id: HELI_SKIING.dropId, title: 'Heli-ski drop at Summit Run', pay: 0, taken: skiFlight?.kind === 'drop'}), group});
    },
    // The free drop: your own run. It sets the way to Summit Run and raises the ceiling there.
    takeSkiDrop() {
      if (!api.skiBoard()) return {ok: false, reason: 'Heli-skiing is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      if (skiFlight?.kind === 'drop') return {ok: true, already: true};
      if (skiFlight) return {ok: false, reason: 'Finish or drop the group job first.'};
      const busy = skiBusy();
      if (busy) return {ok: false, reason: busy};
      const jobs = heliOf(save).jobs;
      if (jobs.day === playDay() && jobs.taken) return {ok: false, reason: 'Finish or drop the job you have first.'};
      dropSurvey('other');
      skiFlight = {kind: 'drop'};
      aim(SUMMIT_COURSE);
      emit({type: 'skiDropTaken'});
      return {ok: true};
    },
    // The group job: a guide and four guests board at the home pad (475 kg) and are flown to a drop pad of your choice.
    takeSkiGroup() {
      const board = api.skiBoard();
      if (!board) return {ok: false, reason: 'Heli-skiing is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      if (!board.group) return {ok: false, reason: 'There is no group today.'};
      if (skiFlight?.kind === 'group') return {ok: true, already: true};
      if (skiFlight) return {ok: false, reason: 'Finish or drop the ski drop first.'};
      const busy = skiBusy();
      if (busy) return {ok: false, reason: busy};
      dropSurvey('other');
      const taken = commit(takeJobSave(save, board.group.id, playDay(), flag));
      if (!taken.ok) return taken;
      skiFlight = {kind: 'group', id: board.group.id, skied: false};
      groupAboard = true;
      refreshUpgrades();
      aim(SUMMIT_COURSE);
      emit({type: 'skiGroupTaken', pay: board.group.payNow});
      skiSay('group.call');
      return {ok: true};
    },
    // Hands the ski drop, or the group job, back at the home pad.
    dropSkiFlight() {
      if (!skiOn) return {ok: false, reason: 'Heli-skiing is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The dispatch board is at the home pad.'};
      if (!skiFlight) return {ok: true, dropped: false};
      if (skiFlight.kind === 'group') commit(dropJobSave(save, flag));
      endSkiFlight();
      aim(null);
      emit({type: 'skiFlightDropped'});
      return {ok: true, dropped: true};
    },
    // On a drop pad with a ski flight in hand: the runs that start from this pad, the day's snow (never which wax it wants),
    // and the picks open now: the Wax kit's, and the Lab's wax challenge on the slalom.
    skiOffers() {
      const pad = skiPadHere();
      if (!pad || !skiFlight) return null;
      const day = playDay(), ski = skiOf(save), snow = snowOfDay(day), kit = waxKitOwned(save, skiFlags);
      const challenge = labEnabled === true && labChallengeOpen(save, 'wax').open ? Object.freeze({id: 'wax', run: 'slalom'}) : null;
      const runs = SKI_RUN_IDS.filter(id => skiRunPad(id) === pad && (id !== 'aerials' || aerialsOpen(save, skiFlags)) && !(skiFlight.kind === 'group' && id === 'powder'))
        .map(id => Object.freeze({id, name: skiRunName(id), best: ski.best[id] ?? null, medal: ski.medal[id] ?? 0, limits: skiRunLimits(id)}));
      return Object.freeze({pad, runs: Object.freeze(runs), snow: Object.freeze({id: snow.snow, name: snow.name, celsius: snow.celsius}),
        kit, waxes: kit || challenge ? WAXES : null, challenge, group: skiFlight.kind === 'group'});
    },
    // Step out and ski. wax: hard, medium or soft with the Wax kit; challenge 'wax' (the slalom only) is the Lab's wax run,
    // judged on the pick. The helicopter waits where it is; stopping in the pickup circle brings the pilot back aboard.
    skiStepOut(runId, options) {
      const {wax = null, challenge = null} = options ?? {};
      const offers = api.skiOffers();
      if (!offers) return {ok: false, reason: skiBlocking() ?? 'Land on a drop pad with a ski drop or the group job in hand.'};
      if (!offers.runs.some(run => run.id === runId)) return {ok: false, reason: 'That run does not start from this pad.'};
      if (loads.some(car => car.hooked)) return {ok: false, reason: 'Set the load down first.'};
      const day = playDay();
      let setting = null;
      if (challenge !== null) {
        if (challenge !== 'wax' || runId !== 'slalom' || !offers.challenge) return {ok: false, reason: 'That challenge does not start here.'};
        if (!WAXES.includes(wax)) return {ok: false, reason: 'Pick a wax first.'};
        setting = waxSetting(wax, day);
      } else if (wax !== null) {
        if (!offers.kit) return {ok: false, reason: 'Choosing a wax needs the Wax kit.'};
        if (!WAXES.includes(wax)) return {ok: false, reason: 'That is not a wax.'};
        setting = skiWaxFor(save, skiFlags, day, wax);
      }
      startSkiRun(runId, setting, {challenge, pick: wax, day, pad: offers.pad});
      emit({type: 'skiStepOut', run: runId, pad: offers.pad, pick: wax});
      emit({type: 'cue', id: 'ski.step-out'});
      skiSay('clear');
      return {ok: true};
    },
    // Start the run again from the drop (the helicopter fetches the pilot: no fuel, no charge).
    restartSkiRun() {
      if (phase !== 'skiing' || !skiRun) return {ok: false, reason: 'There is no run to restart.'};
      skiRun = createSkiRun({runId: skiRun.runId, wax: skiRun.wax, group: skiRun.group});
      emit({type: 'skiRestart', run: skiRun.runId});
      return {ok: true};
    },
    // Leave the run: the helicopter comes for the pilot at the pickup.
    leaveSkiRun() {
      if (phase !== 'skiing' || !skiRun) return {ok: false, reason: 'There is no run to leave.'};
      climbIn(true);
      return {ok: true};
    },
    // Beside Race here: the next open driving lesson on the course the car was set
    // down on. It lives and dies with the Race here offer (hooking the car again, or
    // leaving, withdraws both).
    lessonHereOffer() {
      const here = typeof drivingLessonAt === 'function' ? api.raceHereOffer() : null;
      const lesson = here && drivingLessonAt(here.courseId, here.carId);
      return lesson ? {...here, lessonId: lesson.id, name: lesson.name} : null;
    },
    // The instructor's board: every lesson, open, done or running.
    lessonBoard() {
      const done = lessonsDone();
      return Object.freeze(LESSON_ORDER.map(id => Object.freeze({id, open: lessonOpen(done, id) || done[id], done: done[id],
        active: lesson?.id === id})));
    },
    // Start (or retake) a lesson: on the ground at the home pad.
    startLesson(id) {
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'Lessons start on the home pad.'};
      if (groupAboard) return {ok: false, reason: 'Set the group down first.'};
      const done = lessonsDone();
      if (!LESSON_ORDER.includes(id) || !(lessonOpen(done, id) || done[id])) return {ok: false, reason: 'That lesson is not open yet.'};
      if (id === 'carry' && loads.some(car => car.hooked && !car.labLoad)) return {ok: false, reason: 'Set the load down first.'};
      if (lesson) endLesson();
      if (challenge) endChallenge('stopped');
      lesson = createLesson(id, {spot: {x: site.zone.x, z: site.zone.z}, target: site.carryTarget});
      lessonEvents = [];
      if (id === 'carry') {
        loads.push(crateLoad());
        // Paint follows the terrain. Keep drawing samples out of courseSite's
        // rule data and build them only when this lesson needs its circle.
        const target = site.carryTarget;
        const surface = Object.freeze([target.radius - .35, target.radius].flatMap(radius =>
          Array.from({length: 65}, (_, i) => world.ground.height(target.x + Math.cos(i * Math.PI / 32) * radius,
            target.z - Math.sin(i * Math.PI / 32) * radius) - target.y)));
        lesson.target = Object.freeze({...target, surface});
      }
      aim(null);
      emit({type: 'lessonStarted', lesson: id});
      return {ok: true};
    },
    stopLesson() {
      // Stopping during the wait after a crash also cancels the retry.
      retryAfterCrash = null;
      if (!lesson) return false;
      endLesson();
      emit({type: 'lessonStopped'});
      return true;
    },
    // Skipping the opening marks lessons 1 and 2 done.
    skipOpening() {
      for (const id of SKIP_MARKS) if (!lessonsDone()[id]) commit(finishLessonSave(save, id, flag));
      if (lesson && SKIP_MARKS.includes(lesson.id)) endLesson();
      emit({type: 'openingSkipped'});
      return true;
    },
    // ---- H2 Fire: the radio and the bucket (docs/HELI_FIRE.md sections 5 and 9) ----
    // R: answer a waiting call, in the air or on the ground.
    pressRadio() {
      if (phase !== 'flying') return false;
      const answered = fire ? fire.pressRadio() : false;
      if (answered && rescueOn) beginRescueSite();
      // With no call waiting, R reports the wildlife count in hand to Sarah.
      if (!answered && surveyRun) return api.reportCount().ok === true;
      return answered;
    },
    // Later on a waiting rescue call, said at once (the board second button).
    declineCall() {
      if (!rescueOn || phase !== 'flying') return false;
      return fire.declineCall();
    },
    // ---- H4 Rescue: the rescue line at the pad (section 4) ----
    // Fit the line on the home pad ground: free, one fitting at a time.
    fitRescueLine({wear = false} = {}) {
      if (!rescueOn) return {ok: false, reason: 'Rescues are not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The rescue line is at the home pad.'};
      if (lineLoad()) return fitted(wear, lineOfferKind, {ok: true, already: true});
      if (lesson) return {ok: false, reason: 'Finish the lesson first.'};
      const fit = canFitLine(loads);
      if (!fit.ok) return {ok: false, reason: fit.reason};
      // Laid out beside the helicopter on its left, clear of the body, so the cable is slack until it lifts.
      const side = HELI_SESSION.bucketBeside;
      loads.push(createRescueLine({x: heli.x - Math.cos(heli.heading) * side, z: heli.z + Math.sin(heli.heading) * side,
        heading: heli.heading, ground: world.ground}));
      renewLine();
      emit({type: 'rescueLineFitted'});
      if (newRescuer() && !lineFirstSaid) { lineFirstSaid = true; say('heli.radio.line.first'); }
      return fitted(wear, lineOfferKind, {ok: true});
    },
    takeOffRescueLine() {
      const line = lineLoad();
      if (!line) return {ok: true, already: true};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The rescue line comes off at the home pad.'};
      if (line.who === 'pair' && !line.done) return {ok: false, reason: 'Hand the casualty over first.'};
      loads = loads.filter(car => !car.rescue);
      emit({type: 'rescueLineRemoved'});
      return {ok: true};
    },
    // Fit the bucket on the home pad's ground: free, never with a car on the cable.
    fitBucket({wear = false} = {}) {
      if (!fire) return {ok: false, reason: 'Forest fires are not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The bucket is at the home pad.'};
      if (bucketLoad()) return fitted(wear, 'fire', {ok: true, already: true});
      if (lineLoad()) return {ok: false, reason: 'Take off the rescue line first.'};
      if (loads.some(car => car.hooked)) return {ok: false, reason: 'Set the car down first.'};
      if (lesson) return {ok: false, reason: 'Finish the lesson first.'};
      // Laid out on the ground beside the helicopter, clear of its body, so
      // the cable is slack until the helicopter lifts it.
      const side = HELI_SESSION.bucketBeside, x = heli.x + Math.cos(heli.heading) * side, z = heli.z - Math.sin(heli.heading) * side;
      const fitting = createBucket({damage: bucketDamageOf(save), x, z, heading: heli.heading, ground: world.ground, litres: labNow()?.bucketLitres});
      if (labLine() !== CABLE.length) fitting.lineLength = labLine();
      loads.push(fitting);
      emit({type: 'bucketFitted'});
      fire.bucketFitted();
      return fitted(wear, 'fire', {ok: true});
    },
    takeOffBucket() {
      if (!bucketLoad()) return {ok: true, already: true};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The bucket comes off at the home pad.'};
      loads = loads.filter(car => !car.bucket);
      emit({type: 'bucketRemoved'});
      return {ok: true};
    },
    // The Lab's pad menu (docs/LAB.md 4.1). What it offers: whether the Retardant tank is owned, the loads and the lines.
    get lab() {
      const owned = labEnabled === true ? ownedLabUpgrades(save) : {};
      return Object.freeze({on: labEnabled === true, retardant: owned.retardant === true, longCable: owned['long-cable'] === true,
        line: labLine(), lines: Object.freeze(owned['long-cable'] === true ? [15, 25] : [15]), contents: bucketLoad()?.contents ?? 'water'});
    },
    // Fill the bucket on the home pad with retardant (once the tank is owned) or back to water. Retardant is 600 litres,
    // filled only here; a lake never refills it, and it is a water bucket again once emptied.
    loadBucket(kind) {
      if (labEnabled !== true) return {ok: false, reason: 'The Lab is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The bucket is filled at the home pad.'};
      const bucket = bucketLoad();
      if (!bucket) return {ok: false, reason: 'Fit the bucket first.'};
      if (bucket.pouring || bucket.parcels.length) return {ok: false, reason: 'Wait for the water to land.'};
      if (kind === 'retardant') {
        if (ownedLabUpgrades(save).retardant !== true) return {ok: false, reason: 'Buy the Retardant tank in the Lab first.'};
        if (!(bucketHolds(bucket) > 0)) return {ok: false, reason: 'The bucket is ruined; repair it first.'};
        bucket.contents = 'retardant';
        setBucketWater(bucket, Math.min(RETARDANT_LITRES, bucketHolds(bucket)));
        emit({type: 'bucketLoaded', kind});
        return {ok: true, litres: bucket.water};
      }
      if (kind !== 'water') return {ok: false, reason: 'Load water or retardant.'};
      if (bucket.contents !== 'retardant') return {ok: true, litres: bucket.water, already: true};
      delete bucket.contents; setBucketWater(bucket, 0);
      emit({type: 'bucketLoaded', kind});
      return {ok: true, litres: bucket.water};
    },
    // The line for the next car: 15 m, or 25 m once Long cable is owned. Chosen on the pad with nothing on the hook.
    chooseLine(metres) {
      if (labEnabled !== true) return {ok: false, reason: 'The Lab is not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'The line is chosen at the home pad.'};
      if (loads.some(car => car.hooked && !car.bucket)) return {ok: false, reason: 'Set the car down first.'};
      const result = commit(chooseLabLine(save, metres, labFlags));
      if (result.ok) for (const car of loads) if (car.bucket) { if (labLine() !== CABLE.length) car.lineLength = labLine(); else delete car.lineLength; }
      return result.ok ? {ok: true, line: labLine()} : result;
    },
    // Repair at the pad: takes what the player has and forgives the rest.
    repairBucket() {
      if (!fire) return {ok: false, reason: 'Forest fires are not available yet.'};
      if (phase !== 'flying' || !onHome()) return {ok: false, reason: 'Repairs are at the home pad.'};
      const result = commit(repairBucketSave(save, fireFlag));
      if (result.ok && result.repaired) {
        const bucket = bucketLoad();
        if (bucket) { bucket.damage = 0; bucket.massKg = BUCKET.emptyKg + bucket.water; }
        emit({type: 'charged', kind: 'bucket', amount: result.charged + result.forgiven, charged: result.charged, forgiven: result.forgiven});
      }
      return result;
    },
    bucketRepairCost() { return FIRE_MONEY.bucketRepair[bucketDamageOf(save)]; },
    // ---- H3 skins: the paint shop at the home pad (section 5.2) ----
    // What the board shows: every coat with its tally and price, what is worn,
    // the grime and the wash. Null with the heli-skins switch off.
    paintShop() {
      if (!skinOn) return null;
      const worn = skinsOf(save).worn, wallet = Number.isFinite(save.credits) ? save.credits : 0, grime = grimeOf(save);
      const stock = Object.freeze({kind: 'stock', name: SKINS.stock.name, tally: 0, need: null, owned: true, worn: worn === 'stock', fresh: false,
        price: null, buy: false, canAfford: false});
      const rows = skinRows(save).map(row => Object.freeze({...row, buy: !row.owned && !(row.need !== null && row.tally >= row.need),
        canAfford: wallet >= row.price}));
      return Object.freeze({rows: Object.freeze([stock, ...rows]), worn, grime, dirt: dirtLevels(), note: skinNote, offers: fitOffers(),
        wash: Object.freeze({cost: WASH.cost, grime, can: grime > 0 && wallet >= WASH.cost, hint: grime > WASH.hintAbove})});
    },
    // Buy a coat sooner: the whole price once, or nothing (heli-skins.js buySkin).
    buyPaint(kind) {
      if (needSkins()) return needSkins();
      if (!atPad()) return {ok: false, reason: 'The paint shop is at the home pad.'};
      earnNow();
      const result = buySkin(save, kind, sflag);
      if (!result.ok) return result;
      commit(result);
      emit({type: 'skinBought', kind, name: SKINS[kind].name, price: result.price});
      return result;
    },
    // Wear an owned coat or the stock paint; a new coat is fresh (dirt back to 0).
    wearPaint(kind) {
      if (needSkins()) return needSkins();
      if (!atPad()) return {ok: false, reason: 'The paint shop is at the home pad.'};
      // Changing coats would change the gear, and the searchlight's clock, mid-rescue.
      if (live) return {ok: false, reason: 'Finish the rescue first.'};
      earnNow();
      const result = wearSkin(save, kind, sflag);
      if (!result.ok) return result;
      commit(result);
      if (!result.already) {
        // A new coat brings its own gear: the winch starts again at the plain line.
        winch.length = CABLE.length;
        for (const car of loads) delete car.lineLength;
        skinNote = null;
        emit({type: 'skinWorn', kind, freshCoat: result.freshCoat, fadeSeconds: HELI_SESSION.fadeSeconds});
      }
      return result;
    },
    // The wash: 100 credits at the home pad, on the ground; all four dirts back to 0.
    washHelicopter() {
      if (needSkins()) return needSkins();
      if (!atPad()) return {ok: false, reason: 'The wash is at the home pad.'};
      const result = washHelicopter(save, {enabled: true, onGround: heli.onGround === true});
      if (!result.ok) return result;
      commit(result);
      emit({type: 'washed', price: result.price});
      cue('heli.wash');
      say('heli.radio.wash.done');
      return result;
    },
    // ---- the wildlife count: the report to Sarah (section 4) ----
    // R with no call waiting, or the board's Report button. Pays once by how
    // near the estimate is; it needs a quarter of the square covered.
    reportCount() {
      if (!wildOn || phase !== 'flying' || !surveyRun) return {ok: false, reason: 'There is no count to report.'};
      const run = surveyRun, result = finishSurvey(save, run, wildFlag);
      if (!result.ok) return result;
      commit(result);
      const r = result.report;
      surveyTaken = null; surveyRun = null;
      emit({type: 'surveyDone', jobId: r.jobId, estimate: r.estimate, truth: r.truth, count: r.count, share: r.share, band: r.band,
        paid: result.paid, rare: r.rare});
      say(r.line);
      earnNow();
      return {ok: true, paid: result.paid, report: r};
    },
    get lesson() { return lesson ? {id: lesson.id, held: lesson.held, target: lesson.target, spot: lesson.spot} : null; },
    // Leave the mode: the fuel left in the tank is kept.
    leave() {
      // Leaving with a rescue in hand is a failure (section 3.4).
      failRescueNow('left');
      endChallenge(null);
      hookHeld = false; hookReeled = false;
      if (dropWater.length && site) { waterOnFire(dropWater); dropWater = []; }
      fire?.flush();
      if (heli && phase !== 'idle') storeFuel();
      if (heli && phase !== 'idle') settleDirt();
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
    // The worn gear's numbers (null for stock paint and the switch off) and how many
    // camera views C cycles through: the TV coat adds the nose camera as a fifth.
    get gear() { return gearNow(); },
    get cameraCount() { return cameraViewsFor(gearNow()).length; },
    get job() { return jobInHand(); },
    // A read-only picture for the renderer, instruments and tests.
    view() {
      const fireInfo = fire?.view(heli) ?? null;
      return Object.freeze({
        phase, courseId: site?.courseId ?? null, destination: challenge?.id === 'headings' ? null : destination, cruiseOffered, autopilot: autopilot.engaged,
        heli: heli ? Object.freeze({...heli}) : null,
        // load: the car on the cable, else the player's own car, else any
        // other car here. loads: every car on this course.
        load: primaryLoad() ? loadView(primaryLoad()) : null,
        loads: Object.freeze(carLoads().map(loadView)),
        bucket: bucketView(),
        fire: fireInfo,
        season: fire?.season() ?? null,
        ...(skinOn ? {skins: skinsView()} : {}),
        ...(wildOn ? {survey: surveyView()} : {}),
        job: jobInHand(),
        ...(site?.courseId !== HOME_COURSE ? {returnLoad: returnBoardView()} : {}),
        lesson: lesson ? Object.freeze({id: lesson.id, held: lesson.held, spot: lesson.spot, target: lesson.target,
          guidance: carryGuidanceNow()}) : null,
        ...(challenge ? {challenge: Object.freeze({id: challenge.id, elapsed: challenge.elapsed, briefing: challengeBriefing(challenge), props: challengeProps(challenge)})} : {}),
        crate: site?.crate ?? null,
        readout: heli ? heliReadout(heli, {loadKg: loads.find(car => car.hooked)?.massKg ?? 0}) : null,
        zone: site?.zone ?? null, parking: site?.parking ?? null, area: site ? areaNow() : null,
        fade: phase === 'cruise' ? 1 - timer / HELI_SESSION.fadeSeconds : 0,
        fallen: Object.freeze([...fallen]),
        ...(rescueOn ? {rescue: rescueView(fireInfo)} : {}),
        // The places the player can fly to; named only with Summit Run on, which adds the fourth.
        ...(summitOn || pilotOn ? {destinations: Object.freeze(Object.keys(placesNow()))} : {}),
        ...(pilotOn ? {scout: scoutView(), secrets: secretsView()} : {}),
        ...(skiOn ? {ski: skiView()} : {}),
      });
    },
    // The ring under the load the hook is near (FIX-HELI-HOOK). Kept out of
    // view() so the view's shape, and the fingerprints made of it, stay as they were;
    // the app adds it for the drawing.
    hookGuide: hookGuideView,
    fingerprint() {
      const spot = car => `${car.x.toFixed(6)}|${car.y.toFixed(6)}|${car.z.toFixed(6)}|${car.hooked}`;
      return `${phase}|${site?.courseId}|${heli ? heliFingerprint(heli) : '-'}|` +
        (loads[0] ? spot(loads[0]) : '-') + `|${save.credits}|${heliOf(save).fuelKg}` +
        loads.slice(1).map(car => `|${car.id}|${spot(car)}`).join('') + (skiRun ? `|ski|${skiRunFingerprint(skiRun)}` : '');
    },
  };
  function returnBoardView() {
    const job = returnLoadJob(playDay(), site?.courseId, dflag);
    if (!job) return null;
    return Object.freeze({...job, title: returnLoadTitle(job), payNow: jobPay(job, mode),
      done: heliOf(save).returnLoads?.[job.from] === job.day});
  }
  // The ski part of the view (only with heli-skiing on): the flight in hand, the group aboard, the pad under the helicopter
  // and the run being skied.
  // The run's picture without the verdict on the wax: the pick is shown, never whether it was right (the Lab's challenge).
  function skiRunInView() {
    const {wax, ...rest} = skiRunView(skiRun);
    return Object.freeze({...rest, pick: skiMeta?.pick ?? null});
  }
  function skiView() {
    return Object.freeze({flight: skiFlight ? Object.freeze({kind: skiFlight.kind, id: skiFlight.id ?? null, skied: skiFlight.skied === true}) : null,
      group: groupAboard, pad: skiPadHere(), run: skiRun ? skiRunInView() : null});
  }
  // What H would do to the nearest load now, without doing it (FIX-HELI-HOOK):
  // the load nearest the hook within CABLE.guideReach sideways, the gear's
  // numbers H would hook it with, why H would not hook it (null when it
  // would) and ready (H hooks it now). Null with no load that near.
  function hookAim() {
    if (phase !== 'flying' || !heli) return null;
    const gear = hookGear(), net = gear?.crates >= 2;
    const hookAt = {x: heli.x, z: heli.z};
    const reach = car => Math.hypot(hookAt.x - car.x, hookAt.z - car.z);
    let load = null;
    for (const car of loads) {
      if (car.bucket || car.rescue || car.hooked || car.netted || car.falling) continue;
      if (!load || reach(car) < reach(load)) load = car;
    }
    if (!load || reach(load) > CABLE.guideReach) return null;
    const opts = net && load.supply ? {...gear, hookReach: NET_REACH} : gear;
    const refusal = hookRefusal(heli, load, opts);
    const limitKg = Number.isFinite(gear?.hookLimitKg) ? gear.hookLimitKg : KESTREL.hookLimitKg;
    const barred = !!bucketLoad() || rescueOn && hNothing(loads) || !(load.massKg <= limitKg) ||
      !load.crate && !load.supply && (!liftCheck(load.id, liftLimit()).ok || !lessonsDone().carry);
    return {load, refusal, ready: !refusal && !barred};
  }
  // A failed H press: the reason given (the bucket or the line), else what
  // the hook still needs, as a hookRefused event the panel words and sounds.
  // Quiet (null) when no load is near enough to be meant.
  function refuseHook(reason = null) {
    const aim = hookAim();
    const why = reason ? {reason} : aim?.refusal;
    if (!aim || !why || why.reason === 'hooked') return null;
    const event = {type: 'hookRefused', reason: why.reason, id: aim.load.id, ...(why.metres ? {metres: why.metres} : {})};
    emit(event);
    return event;
  }
  // The ring on the ground under the load the hook is near: green when H hooks it now.
  function hookGuideView() {
    const aim = hookAim();
    if (!aim) return null;
    return Object.freeze({id: aim.load.id, x: aim.load.x, z: aim.load.z, y: world.ground.height(aim.load.x, aim.load.z), ready: aim.ready});
  }

  // Scouting (docs/PILOT_MAP.md section 3): over a course the player owns, the names and places of its
  // corners, for the view to write on the ground. Numbered corners without a name of their own keep their
  // number. Worked out once for each course; null where the course is not owned (or nothing is flying).
  const scoutCache = new Map();
  function scoutView() {
    if (!site || !heli || !world || !isCourseUnlocked(save, site.courseId)) return null;
    if (!scoutCache.has(site.courseId)) {
      let corners = [];
      try {
        const found = detectCorners(sampleCourse(world.course));
        nameFeatures({corners: found, crests: [], straight: null, pieces: namedPieces(world.course), length: world.course.length});
        corners = found.map(c => Object.freeze({number: c.number, name: c.name ?? null, label: c.label ?? String(c.number), x: c.x, z: c.z}));
      } catch { corners = []; }
      scoutCache.set(site.courseId, Object.freeze({courseId: site.courseId, corners: Object.freeze(corners)}));
    }
    return scoutCache.get(site.courseId);
  }
  function bucketView() {
    const bucket = bucketLoad();
    if (!bucket) return null;
    return Object.freeze({x: bucket.x, y: bucket.y, z: bucket.z, heading: bucket.heading, water: bucket.water, holds: bucketHolds(bucket),
      damage: bucket.damage, words: bucketWords(bucket), pouring: bucket.pouring, filling: bucket.filling,
      parcels: Object.freeze(bucket.parcels.map(p => Object.freeze({x: p.x, y: p.y, z: p.z}))),
      aim: bucket.water > 0 ? ring : null,
      ...(bucket.contents ? {contents: bucket.contents} : {}),
      // The fire service coat's gauge (litres on the panel) and drop sight (a dot
      // at the ring's exact centre); absent on every other coat.
      ...(gearNow() ? {reading: bucketReading(bucket, gearNow()), sight: gearNow().dropSight === true && bucket.water > 0 && ring ? Object.freeze({x: ring.x, z: ring.z}) : null} : {})});
  }

  const dirtLevels = () => Object.freeze(Object.fromEntries(DIRT_KINDS.map(kind => [kind, heliOf(save).dirt?.[kind] ?? 0])));
  // What the renderer and instruments need of the coat: which is worn, how
  // dirty, the gear's numbers, the winch's line, the heat camera's contacts and
  // the searchlight's night (SKIN-VIEW draws them).
  function skinsView() {
    const worn = skinsOf(save).worn, gear = gearNow();
    let heat = [];
    if (gear?.heatRange > 0 && heli && live && rsite && site?.courseId === live.courseId) {
      const at = point => point && Object.freeze({x: point.x, z: point.z, y: world.ground.height(point.x, point.z)});
      const people = live.kind === 'hiker' ? {hiker: at(rsite.spotted ? rsite.walk : rsite.hiker)}
        : live.kind === 'hoist' ? {driver: at(rsite.driver)} : live.kind === 'avalanche' ? {skier: at(rsite.beacon)} : {};
      heat = heatContacts({x: heli.x, y: heli.y, z: heli.z}, people, gear).map(contact => Object.freeze(contact));
    }
    const night = live?.kind === 'hiker' ? searchNight(live.clockSeconds, rescueLimit('hiker'), gear) : null;
    return Object.freeze({worn, look: SKINS[worn].look, dirt: dirtLevels(), grime: grimeOf(save), gear: Object.freeze(gearStats(save, sflag)),
      line: gear?.reelSpeed > 0 ? winch.length : null, heat: Object.freeze(heat), night: night && Object.freeze(night), note: skinNote});
  }
  function surveyView() {
    const job = surveyJobOf(save, wildFlag);
    if (!job) return null;
    const base = {jobId: job.id, courseId: job.courseId, species: job.species, name: surveyName(job.species), title: surveyTitle(job),
      taken: surveyTaken?.id === job.id, active: !!surveyRun};
    if (!surveyRun || !heli) return Object.freeze({...base, count: 0, percent: 0, canReport: false, rare: false, square: null, target: null,
      animals: Object.freeze([]), heat: Object.freeze([])});
    const run = surveyRun, square = run.plan.square, agl = heli.y - world.ground.height(heli.x, heli.z);
    return Object.freeze({...base, count: run.count, percent: surveyPercent(run), canReport: canReport(run), rare: run.rareSeen,
      square: Object.freeze({...square}), target: Object.freeze(bearingTo(square.cx, square.cz)),
      animals: Object.freeze(run.animals.map(a => Object.freeze({id: a.id, role: a.role, x: a.x, z: a.z, counted: a.counted}))),
      heat: Object.freeze(heatAnimals(run, {x: heli.x, z: heli.z, agl}, gearNow()).map(animal => Object.freeze(animal)))});
  }

  return api;
}

export {wantsControl, KESTREL};
