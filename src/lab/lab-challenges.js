// The Lab's six helicopter challenges (docs/LAB.md 4.1 and 4.2, the "Challenge" column), as goals the helicopter
// session checks every step, the way it checks the flying lessons. Pure rules: a challenge is a plain record, and
// `stepChallenge` reads what the session shows it and answers {result, cue, events, reason}. No clock (time is the
// steps given), no chance (the practice fire is seeded), no drawing (`challengeProps` lists what the screen draws).
//
// What the session shows a challenge each step (`view`):
//   courseId        the course the helicopter is on
//   heli            {x, y, z, groundY, onGround, fuelKg, crashed}
//   load            the lab load on the hook ({id, x, y, z, hooked, onGround, restHeight}) or null
//   loadHeight      metres the hooked load hangs above the ground it would rest on (null with no load)
//   patches         the water or retardant that landed this step: [{x, z, litres, radius, retardant?}]
//   events          the session's events this step ({type: 'released' | 'setDown' | 'cargoHit' ...})
//   ringIndex       the drop ring in use, 0 to 3 (the Projectile challenge passes with it)
import {KESTREL} from '../heli/heli-flight.js';
import {FIRE, cellId, spreadStep, applyWater, fireOut} from '../heli/heli-fire.js';
import {clearCircle} from '../heli/heli-search.js';

export const CHALLENGE_IDS = Object.freeze(['lift', 'projectile', 'fire', 'pendulum', 'altitude', 'headings']);

// The numbers of each challenge, from the design table.
export const CHALLENGE_RULES = Object.freeze({
  // The Dusthawk (1,280 kg) on the hook, full tank, hover 10 s with it 2 to 5 m off the ground over the home pad.
  lift: Object.freeze({carId: 'dusthawk_rally', radius: 6, low: 2, high: 5, holdSeconds: 10, fullTankKg: KESTREL.tankKg - 1}),
  // Three buoys with generous hit circles and short-lived feedback at actual landings.
  projectile: Object.freeze({buoys: 3, hitRadius: 10, splashSeconds: 5, scoopKeepOut: 80, apart: 80}),
  // A practice fire of 6 x 3 cells on the lake shore. A steady pilot needs two scoop trips;
  // spread every 70 s gives them time to put it out, with a minute spare before the road (350 s).
  fire: Object.freeze({seconds: 420, spreadEvery: 70, columns: 6, rows: 3, seed: FIRE.courseSeed, shoreGap: 140}),
  // A car carried across Tremblant Woods, set down within 25 m of the target with its swing under 1 m.
  pendulum: Object.freeze({carId: 'falcone_f42', distance: 500, targetRadius: 25, swingMetres: 1}),
  // A 300 kg crate to Summit Run, set down in its landing zone, with at least 30% of the tank left.
  altitude: Object.freeze({crateKg: 300, courseId: 'summit-run', fuelShare: 0.3}),
  // A smoke marker at a set heading (0 north, 90 east) and distance from the home pad; arrow and autopilot off.
  headings: Object.freeze({headingDeg: 70, distanceM: 550, radius: 30, height: 20}),
});

const horizontal = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const compass = deg => ({x: Math.sin(deg * Math.PI / 180), z: Math.cos(deg * Math.PI / 180)});

// ---- where things are ---------------------------------------------------------------------------------------
// Open water, nearest the pad first, with room to scoop (20 m of water each way).
function lakePoints(ground, zone) {
  const water = (x, z) => ground.water?.(x, z) != null, lake = [];
  for (let radius = 60; radius <= 1200; radius += 20) {
    for (let k = 0; k < 36; k++) {
      const a = k * Math.PI / 18, x = Math.round(zone.x + Math.cos(a) * radius), z = Math.round(zone.z + Math.sin(a) * radius);
      if (water(x, z) && water(x + 20, z) && water(x - 20, z) && water(x, z + 20) && water(x, z - 20)) lake.push({x, z, y: ground.water(x, z)});
    }
    if (lake.length >= 80) break;
  }
  return lake;
}
const unit = v => { const length = Math.hypot(v.x, v.z) || 1; return {x: v.x / length, z: v.z / length}; };

// world: {course, ground}; site: the helicopter session's courseSite for this course. Returns the spots a challenge
// needs, or null when this course cannot host it. Everything is worked out from the course alone, so it is the same
// every time.
export function challengeSpots(id, world, site) {
  const {course, ground} = world, zone = site.zone;
  if (id === 'lift' || id === 'altitude') {
    // The load waits where the carrying lesson's crate does: 18 m from the pad, clear and level.
    const spot = site.crate ?? site.spare;
    return spot ? Object.freeze({load: Object.freeze({x: spot.x, z: spot.z, y: spot.y}), zone}) : null;
  }
  if (id === 'pendulum') {
    const spot = site.crate ?? site.spare;
    let target = null;
    search: for (const distance of [CHALLENGE_RULES.pendulum.distance, 550, 450, 600, 400]) {
      for (let k = 0; k < 24; k++) {
        const a = k * Math.PI / 12, x = zone.x + Math.cos(a) * distance, z = zone.z + Math.sin(a) * distance;
        if (clearCircle(course, ground, x, z, CHALLENGE_RULES.pendulum.targetRadius, 3)) { target = {x, z, y: ground.height(x, z), radius: CHALLENGE_RULES.pendulum.targetRadius}; break search; }
      }
    }
    return spot && target ? Object.freeze({load: Object.freeze({x: spot.x, z: spot.z, y: spot.y}), target: Object.freeze(target), zone}) : null;
  }
  if (id === 'headings') {
    const rule = CHALLENGE_RULES.headings, dir = compass(rule.headingDeg);
    const x = zone.x + dir.x * rule.distanceM, z = zone.z + dir.z * rule.distanceM;
    return Object.freeze({marker: Object.freeze({x, z, y: ground.height(x, z)}), headingDeg: rule.headingDeg, distanceM: rule.distanceM, zone});
  }
  if (id === 'fire') {
    // On the home lake's shore, on the pad's side of it: the water is a short hop away, so a bucket's trips can keep up with the
    // fire. The block's near end is lit; its far end is "the road". It never lies in the water.
    const lake = lakePoints(ground, zone);
    if (!lake.length) return null;
    const rule = CHALLENGE_RULES.fire, scoop = lake[0], span = {x: rule.columns * FIRE.cell, z: rule.rows * FIRE.cell};
    const toward = unit({x: zone.x - scoop.x, z: zone.z - scoop.z});
    for (let back = rule.shoreGap; back <= rule.shoreGap + 300; back += 20) {
      const centre = {x: scoop.x + toward.x * back, z: scoop.z + toward.z * back};
      const i0 = Math.floor((centre.x - span.x / 2) / FIRE.cell), j0 = Math.floor((centre.z - span.z / 2) / FIRE.cell);
      let dry = true;
      for (let i = 0; i < rule.columns && dry; i++) for (let j = 0; j < rule.rows && dry; j++) dry = ground.water?.((i0 + i + 0.5) * FIRE.cell, (j0 + j + 0.5) * FIRE.cell) == null;
      if (dry) return Object.freeze({fire: Object.freeze({i0, j0, y: ground.height(centre.x, centre.z)}), scoop: Object.freeze(scoop), zone});
    }
    return null;
  }
  if (id === 'projectile') {
    const rule = CHALLENGE_RULES.projectile, lake = lakePoints(ground, zone);
    // The scoop area is round the water nearest the pad; the buoys keep clear of it and of each other.
    const scoop = lake[0], buoys = [];
    for (const p of lake.slice().sort((a, b) => horizontal(b, scoop) - horizontal(a, scoop) || a.x - b.x || a.z - b.z)) {
      if (horizontal(p, scoop) < rule.scoopKeepOut || buoys.some(b => horizontal(b, p) < rule.apart)) continue;
      buoys.push(p);
      if (buoys.length === rule.buoys) break;
    }
    return buoys.length === rule.buoys ? Object.freeze({buoys: Object.freeze(buoys.map(b => Object.freeze(b))), scoop: Object.freeze(scoop), zone}) : null;
  }
  return null;
}

// ---- the challenge record ------------------------------------------------------------------------------------
export function createChallenge(id, spots) {
  if (!CHALLENGE_IDS.includes(id)) throw new Error(`Unknown challenge ${id}`);
  const base = {id, spots, elapsed: 0, done: false};
  if (id === 'lift') return {...base, held: 0};
  if (id === 'projectile') return {...base, hit: spots.buoys.map(() => false), splash: null};
  if (id === 'pendulum') return {...base, swing: null, lastSwing: null, lastAt: null};
  if (id === 'altitude') return {...base, setDown: false};
  if (id === 'headings') return {...base};
  // The practice fire: cells at world cell indices (so the bucket's patches land on them), lit at the near end.
  const rule = CHALLENGE_RULES.fire, {i0, j0, y} = spots.fire, cells = new Map();
  for (let i = 0; i < rule.columns; i++) for (let j = 0; j < rule.rows; j++)
    cells.set(cellId(i0 + i, j0 + j), {i: i0 + i, j: j0 + j, x: (i0 + i + 0.5) * FIRE.cell, y, z: (j0 + j + 0.5) * FIRE.cell});
  const start = cellId(i0, j0 + Math.floor(rule.rows / 2));
  return {...base, grid: {cells}, roadColumn: i0 + rule.columns - 1, sinceSpread: 0,
    fire: {id: 'lab-fire', courseId: 'tremblant-woods', seed: rule.seed, startDay: 0, steps: 0, engineSeconds: 0, burning: [[start, FIRE.startPercent]], burnt: [], damp: []}};
}

const columnOf = cell => Math.floor(cell / 1024) - 512;
const reachedRoad = ch => [...ch.fire.burning.map(([cell]) => cell), ...ch.fire.burnt].some(cell => columnOf(cell) >= ch.roadColumn);

// One step of dt seconds. Answers {result: 'running' | 'passed' | 'retry', cue, events, reason, ring}.
export function stepChallenge(ch, view, dt = 1 / 120) {
  const out = {result: 'running', cue: null, events: [], reason: null, ring: null};
  if (ch.done) return {...out, result: 'passed'};
  ch.elapsed += dt;
  const pass = () => { ch.done = true; return {...out, result: 'passed'}; };
  const retry = reason => ({...out, result: 'retry', reason});
  const heli = view.heli, events = view.events ?? [];
  if (ch.id === 'lift') {
    const rule = CHALLENGE_RULES.lift, load = view.load;
    const good = !!load && load.hooked && load.id === rule.carId && !load.onGround && view.loadHeight >= rule.low && view.loadHeight <= rule.high &&
      horizontal(heli, ch.spots.zone) <= rule.radius;
    ch.held = good ? ch.held + dt : 0;
    if (ch.held >= rule.holdSeconds) return pass();
  } else if (ch.id === 'projectile') {
    const rule = CHALLENGE_RULES.projectile;
    if (ch.splash && ch.elapsed >= ch.splash.until) ch.splash = null;
    for (const patch of view.patches ?? []) {
      if (!(patch.litres > 0)) continue;
      ch.splash = {kind: 'splash', x: patch.x, z: patch.z, y: patch.y ?? ch.spots.buoys[0].y, until: ch.elapsed + rule.splashSeconds};
      ch.spots.buoys.forEach((buoy, index) => {
        if (ch.hit[index] || horizontal(patch, buoy) > rule.hitRadius) return;
        ch.hit[index] = true;
        out.cue = 'heli.buoy-hit';
        out.events.push({type: 'buoyHit', index});
      });
    }
    if (ch.hit.every(Boolean)) return {...pass(), ring: view.ringIndex ?? 0};
  } else if (ch.id === 'fire') {
    const rule = CHALLENGE_RULES.fire;
    // The bucket's water and retardant go on the practice fire, in the order the real fire takes them.
    if (view.patches?.length) ch.fire = applyWater(ch.fire, ch.grid, view.patches).fire;
    ch.sinceSpread += dt;
    while (ch.sinceSpread >= rule.spreadEvery) { ch.sinceSpread -= rule.spreadEvery; ch.fire = spreadStep(ch.fire, ch.grid, null); }
    if (reachedRoad(ch)) return retry('The fire reached the road.');
    if (fireOut(ch.fire) || ch.elapsed >= rule.seconds) return pass();
  } else if (ch.id === 'pendulum') {
    const rule = CHALLENGE_RULES.pendulum, load = view.load;
    // The swing is how far the car hangs to one side of the helicopter; the last reading before let-go counts, with
    // where the car was (the hook lets go between steps, so the release is read on the next one).
    // Only a car that was on the hook (the Lab's own car, which is all this view ever holds) counts as let go.
    const wasHooked = ch.hookedBefore === true;
    ch.hookedBefore = load?.hooked === true;
    if (load?.hooked) { ch.lastSwing = horizontal(load, heli); ch.lastAt = {x: load.x, z: load.z}; }
    const released = wasHooked && events.find(event => (event.type === 'released' || event.type === 'releasedHigh') && event.id === rule.carId);
    if (released) {
      if (released.type === 'releasedHigh') return retry('Set the car down, do not drop it.');
      if (!ch.lastAt || horizontal(ch.lastAt, ch.spots.target) > rule.targetRadius) return retry('That is not the place: carry it across the woods.');
      if (!(ch.lastSwing < rule.swingMetres)) return retry('The car was still swinging when you let go.');
      ch.swing = ch.lastSwing;
      return pass();
    }
  } else if (ch.id === 'altitude') {
    const rule = CHALLENGE_RULES.altitude;
    if (view.load?.hooked) ch.took = true;
    // Fuel from the truck or the pump after the crate was lifted would hide how much the flight burned.
    if (ch.took && events.some(event => event.type === 'refuelled')) return retry('Refuelling does not count: carry the crate on one tank.');
    if (view.courseId === rule.courseId && events.some(event => event.type === 'setDown' && event.id === 'lab-crate')) ch.setDown = true;
    if (ch.setDown && heli.onGround) {
      if (heli.fuelKg >= KESTREL.tankKg * rule.fuelShare) return pass();
      return retry('Too little fuel left: fly gently, fuel is the lesson of thin air.');
    }
  } else if (ch.id === 'headings') {
    const rule = CHALLENGE_RULES.headings;
    if (!heli.onGround && horizontal(heli, ch.spots.marker) <= rule.radius && heli.y - heli.groundY < rule.height) return pass();
  }
  return out;
}

// What the screen draws for the challenge in hand: buoys with their hits, the smoke marker, the practice fire's cells.
export function challengeProps(ch) {
  if (ch.id === 'projectile') return Object.freeze([
    ...ch.spots.buoys.map((buoy, index) => Object.freeze({kind: 'buoy', x: buoy.x, z: buoy.z, y: buoy.y, radius: CHALLENGE_RULES.projectile.hitRadius, hit: ch.hit[index]})),
    ...(ch.splash ? [Object.freeze({...ch.splash})] : []),
  ]);
  if (ch.id === 'headings') return Object.freeze([Object.freeze({kind: 'smoke', ...ch.spots.marker})]);
  if (ch.id === 'fire') {
    const burning = new Map(ch.fire.burning), burnt = new Set(ch.fire.burnt);
    return Object.freeze([...ch.grid.cells].map(([cell, c]) => Object.freeze({kind: 'fire', x: c.x, z: c.z, y: c.y,
      percent: burning.get(cell) ?? 0, burnt: burnt.has(cell), road: c.i === ch.roadColumn})));
  }
  return Object.freeze([]);
}

// The words and numbers the board shows for the challenge (the screen adds the rest).
export function challengeBriefing(ch) {
  const rule = CHALLENGE_RULES[ch.id];
  if (ch.id === 'headings') return Object.freeze({id: ch.id, headingDeg: ch.spots.headingDeg, distanceM: ch.spots.distanceM, arrow: false, autopilot: false});
  if (ch.id === 'fire') return Object.freeze({id: ch.id, seconds: rule.seconds});
  return Object.freeze({id: ch.id});
}
