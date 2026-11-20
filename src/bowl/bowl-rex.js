// Night five: the Scrapasaurus (BOWL-REX-FIGHT; docs/WASTELAND_WORLD.md section 7).
// A two-storey dinosaur of crushed cars on a rail bogie walks round the Bowl on
// rails against the trucks' way round, so it meets the player's truck head on.
// The fight is a set of phases the player can learn:
//
// - walk: it walks the rails towards the car park gate. If the truck is in
//   front of it, it stops to breathe fire at it (a hunt, after its tell).
// - tell, fire: it rears up and its chest glows (the tell) while its aim is
//   already fixed and drawn on the floor; then fire fills that cone. Fire never
//   comes without its tell, and never goes anywhere but the drawn cone.
// - rest: after the fire it breathes where it rests (always the same place on its
//   rails), it drops a junk car on its rails in front of itself and stands with one
//   battery box open. A truck that drives up the car (the Titan's own launch off
//   cars) and comes down on the open box smashes it.
// - lift, throw: at its pen it picks up a junk car and throws it at the spot
//   where the truck was when it picked the car up (a ring on the floor).
// - eat: if a box has been smashed since its last meal it eats the junk car
//   instead, which mends its limp.
// - fallen: three smashed boxes and it falls over: the event is won.
// - gone: after its last rest it walks out through the car park gate: lost.
//
// Rules from seed and inputs alone: no DOM, no graphics, no storage, no
// randomness. The view (bowl-rex-view.js) reads the fight's state and never
// writes it.
import {registerBowlEventRunner, sayBowlLine} from './bowl-night.js';
import {BOWL_GOALS} from './bowl-lines.js';
import {freshDamageZones} from '../sim-common.js';

export const REX_EVENT = 'scrapasaurus';
export const REX_TROPHY = 'show-night-5';
const LEVELS = ['easy', 'medium', 'hard'];
const DEG = Math.PI / 180;

// Design numbers for Claude's review; BOWL-FINISH tunes them in play. Every place
// on the floor (the rails, where it rests, its pen, the gate and how far its fire
// reaches) comes from the course's own data in rexPlaces, so the fight follows the
// floor when the floor changes (BOWL-EXPAND). The numbers here are the model's
// sizes, how long things take, and what a truck in the air does.
export const REX_RULES = Object.freeze({
  // Its body is 11 m long and 3.2 m wide (scrapasaurus.glb), and its fire nozzle
  // is 5 m ahead of its middle. Only its legs and bogie stand on the floor (7.6 m);
  // its head and neck are overhead.
  halfLength: 3.8, halfWidth: 1.6, headAhead: 5, penCars: 8,
  // When it rests it drops a junk car on the floor in front of itself, at the show's
  // launch-car place (features.bowl.launchCars), and the open box is this far past that
  // car: a truck that drives up the car at 30 to 45 mph (the Titan's launch off cars,
  // FUN-TITAN-LAUNCH, unchanged) comes down on its back from 8 to 18 m past it.
  boxPastCar: 13,
  // Each battery box's place along the body, metres towards the head, as in the
  // model (battery-box-1 to battery-box-3). They are smashed in that order.
  boxes: Object.freeze([-1.35, .1, 1.55]),
  // The top of a battery box above the floor: standing, and lowered a little to rest.
  boxTop: Object.freeze({standing: 4.7, resting: 4.2}),
  // A truck in the air over its back (this far along from the open box and across from
  // its rails), no lower than minBelow under the box's top and no more than maxAbove over
  // it, and at or past the top of its jump (rising no faster than maxRiseMps), comes down
  // on the open box.
  catch: Object.freeze({along: 5, across: 3, minBelow: 1.6, maxAbove: 3.6, maxRiseMps: 1}),
  // The flamethrower's cone (src/arsenal/flamethrower.js: 9 m, 15 degrees), larger:
  // where it rests it reaches from its nozzle back past the dropped car and the truck's
  // run-up to it (rexPlaces), and never less than twice the flamethrower's. A hunt
  // reaches a little less far than that.
  fire: Object.freeze({halfAngle: 22 * DEG, minRange: 18, runUp: 8, huntShare: .9,
    stageSec: 2.5, huntSec: 2, huntAngle: 35 * DEG}),
  thrown: Object.freeze({flightSec: 1, hitRadius: 3.5}),
  eatSec: 3, staggerSec: 2, fallSec: 3, bumpCooldownSec: 1,
  // A smashed box makes it limp until it eats; a scorch and a bump slow the truck.
  limp: .7, scorchSpeed: .35, bumpSpeed: .5, bounceMps: 4.5,
  // Easy is slower, with a longer tell, a longer rest and more chances. Its pace is the
  // time it takes to walk once round, so it keeps its rhythm on any size of floor.
  level: Object.freeze({
    easy: Object.freeze({lapSec: 42, tellSec: 3, throwTellSec: 2.5, restSec: 20, huntCooldownSec: 16, rests: 6, hits: 5}),
    medium: Object.freeze({lapSec: 34, tellSec: 2, throwTellSec: 1.8, restSec: 14, huntCooldownSec: 10, rests: 5, hits: 4}),
    hard: Object.freeze({lapSec: 28, tellSec: 1.4, throwTellSec: 1.2, restSec: 11, huntCooldownSec: 7, rests: 5, hits: 3}),
  }),
});

// The sound each fight event makes (named in BOWL_SOUND_CUES, bowl-lines.js).
export const REX_CUES = Object.freeze({
  tell: 'bowl.rex.roar', fire: 'bowl.rex.fire', fireEnd: 'bowl.rex.fire.end', scorch: 'bowl.rex.scorch',
  boxOpen: 'bowl.rex.box.open', boxClose: 'bowl.rex.box.close', smash: 'bowl.rex.box.smash', bump: 'bowl.rex.bump',
  lift: 'bowl.rex.lift', throw: 'bowl.rex.throw', thrownLand: 'bowl.rex.throw.land', eat: 'bowl.rex.eat',
  fall: 'bowl.rex.fall', gone: 'bowl.rex.gate', drop: 'bowl.rex.drop',
});

const levelOf = name => LEVELS.includes(name) ? name : 'medium';
const wrap = (value, length) => ((value % length) + length) % length;
// Signed distance from b to a round the ring, from -length/2 to length/2.
const along = (a, b, length) => wrap(a - b + length / 2, length) - length / 2;
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// Where the fight happens on a course, from its data (bowl-course.js features.bowl):
// - its rails: features.bowl.rails.lateral (or features.rexRails.off), all the way round;
// - where it rests: the open box boxPastCar beyond the show's first launch-car place
//   along the lap, where it drops a junk car on its rails for the truck to launch off;
// - it comes out from under the stands at the head of the crush line;
// - its pen is beside its rails, past the end of the crush line, halfway to the start line;
// - the car park gate is halfway from the start line to the first ramp.
// Without the show's data the rails run halfway out on the Spine's side and the car
// stands 20 m past the highest ramp.
export function rexPlaces(course) {
  const L = course.length, features = course.features || {}, floor = course.def?.scrapdome || {}, show = features.bowl || {};
  const ramps = [...(features.ramps || [])].sort((a, b) => a.start - b.start);
  const big = ramps.reduce((best, ramp) => !best || ramp.height > best.height ? ramp : best, null) ?? {start: 0, end: 0};
  const rows = (features.crushables || []).map(prop => prop.s);
  const crushStart = show.crush?.firstRowS ?? (rows.length ? Math.min(...rows) : wrap(big.end + L / 3, L));
  const crushEnd = show.crush?.lastRowS ?? (rows.length ? Math.max(...rows) : crushStart);
  const half = Number.isFinite(floor.floorHalfWidth) ? floor.floorHalfWidth : 6;
  const rail = Number.isFinite(show.rails?.lateral) ? show.rails.lateral
    : Number.isFinite(features.rexRails?.off) ? features.rexRails.off : -half / 2;
  const side = Math.sign(rail) || -1;
  const launch = show.launchCars?.[0];
  // It drops the car onto its own rails in front of itself, so a truck that drives up it flies along its back.
  const car = {s: wrap(launch ? launch.s : big.end + 20, L), lateral: rail};
  const stageBoxS = wrap(car.s + REX_RULES.boxPastCar, L);
  // From its nozzle where it rests (the first box's rest) back past the car and the run-up.
  const range = Math.max(REX_RULES.fire.minRange,
    REX_RULES.boxPastCar + REX_RULES.boxes[0] - REX_RULES.headAhead + REX_RULES.fire.runUp);
  const startS = show.start?.s ?? 0;
  return {
    length: L, rail, side, edge: half, car,
    startS: wrap(crushStart - 2, L), stageBoxS,
    penS: wrap(crushEnd + (L - crushEnd + startS) / 2, L), penLateral: side * Math.min(half, Math.abs(rail) + 3.5),
    gateS: wrap(startS + ((ramps[0]?.start ?? 0) - startS) / 2, L),
    range, huntRange: range * REX_RULES.fire.huntShare,
  };
}

export function createRexFight({difficulty = 'medium', course} = {}) {
  const level = levelOf(difficulty), places = rexPlaces(course), length = places.length;
  return {
    version: 1, level, length, places, phase: 'walk', t: 0, s: places.startS,
    boxes: [false, false, false], hurt: false, rests: 0, hits: 0, penCars: REX_RULES.penCars,
    huntCooldown: REX_RULES.level[level].huntCooldownSec / 2, bumpCooldown: 0,
    // tell and fire: what kind of breath, and where it will go (fixed at the tell's start).
    breath: null, cone: null, scorched: false,
    // lift and throw: where the car will come down (fixed when it is picked up).
    throwAt: null, done: null, tells: 0, fires: 0, atStop: null,
  };
}

export const rexNextBox = fight => fight.boxes.indexOf(false);
export const rexBoxesLeft = fight => fight.boxes.filter(smashed => !smashed).length;
export const rexWalkMps = fight => fight.length / REX_RULES.level[fight.level].lapSec * (fight.hurt ? REX_RULES.limp : 1);
// Where its middle stops to rest so that the next box is at the resting place.
const stageStop = fight => wrap(fight.places.stageBoxS + REX_RULES.boxes[Math.max(0, rexNextBox(fight))], fight.length);
// Where a box is along the ring: the body faces down the ring (towards lower s).
export const rexBoxS = (fight, index) => wrap(fight.s - REX_RULES.boxes[index], fight.length);
export const rexHeadS = fight => wrap(fight.s - REX_RULES.headAhead, fight.length);
// The way the body faces in the world (the course's own heading, turned round).
export const rexFacing = (fight, course) => course.worldAt(rexHeadS(fight), fight.places.rail).heading + Math.PI;
export const rexLastRest = fight => fight.rests >= REX_RULES.level[fight.level].rests;

function inCone(cone, point) {
  const dx = point.x - cone.x, dz = point.z - cone.z, distance = Math.hypot(dx, dz);
  return distance <= cone.range && Math.abs(angleTo(Math.atan2(dx, dz), cone.heading)) <= cone.halfAngle;
}

function startTell(fight, course, kind, aim) {
  const head = course.worldAt(rexHeadS(fight), fight.places.rail);
  fight.phase = 'tell'; fight.t = 0; fight.breath = kind; fight.scorched = false; fight.tells++;
  fight.cone = {x: head.x, z: head.z, heading: aim, halfAngle: REX_RULES.fire.halfAngle,
    range: kind === 'stage' ? fight.places.range : fight.places.huntRange};
  return {type: 'tell', kind, cone: {...fight.cone}};
}

// One fixed step of the fight. truck: {s, lateral, airborne, airHeight, verticalSpeed, speedMph}.
// Returns the events of the step; the runner applies their effects to the truck.
export function stepRexFight(fight, truck, dt, course) {
  const events = [], rules = REX_RULES, level = rules.level[fight.level], L = fight.length, places = fight.places;
  if (fight.done || !(dt > 0)) return events;
  fight.t += dt;
  fight.bumpCooldown = Math.max(0, fight.bumpCooldown - dt);
  const truckAt = course.worldAt(truck.s, truck.lateral);
  const across = truck.lateral - places.rail;
  const air = truck.airborne ? truck.airHeight || 0 : 0;

  switch (fight.phase) {
    case 'walk': {
      fight.huntCooldown = Math.max(0, fight.huntCooldown - dt);
      const step = rexWalkMps(fight) * dt;
      // The stops ahead of it, nearest first: the resting place, its pen, and the gate once its rests are used up.
      const stops = [['pen', places.penS]];
      if (rexLastRest(fight)) stops.push(['gate', places.gateS]);
      else stops.push(['stage', stageStop(fight)]);
      // The stop it is standing at is the one it is leaving.
      const [stop, at, distance] = stops.map(([name, s]) => {
        const ahead = wrap(fight.s - s, L);
        return [name, s, fight.atStop === name && (ahead < 1e-6 || ahead > L - 1e-6) ? L : ahead > L - 1e-6 ? 0 : ahead];
      }).sort((a, b) => a[2] - b[2])[0];
      if (distance <= step + 1e-9) {
        fight.s = wrap(at, L); fight.atStop = stop;
        if (stop === 'gate') { fight.phase = 'gone'; fight.t = 0; fight.done = {won: false, reason: 'gate'}; events.push({type: 'gone'}); break; }
        if (stop === 'stage') { events.push(startTell(fight, course, 'stage', rexFacing(fight, course))); break; }
        // The pen: a junk car to eat if it is hurt, or to throw.
        if (fight.penCars > 0) {
          fight.penCars--;
          fight.t = 0;
          if (fight.hurt) { fight.phase = 'eat'; events.push({type: 'eat'}); }
          else {
            fight.phase = 'lift';
            fight.throwAt = {x: truckAt.x, z: truckAt.z, s: truck.s, lateral: truck.lateral};
            events.push({type: 'lift', at: {...fight.throwAt}});
          }
          break;
        }
        break;
      }
      fight.s = wrap(fight.s - step, L); fight.atStop = null;
      // The hunt: a truck in front of its head draws its fire, after its tell.
      if (fight.huntCooldown <= 0) {
        const head = course.worldAt(rexHeadS(fight), places.rail), facing = rexFacing(fight, course);
        const dx = truckAt.x - head.x, dz = truckAt.z - head.z, bearing = Math.atan2(dx, dz);
        if (Math.hypot(dx, dz) <= places.huntRange && Math.abs(angleTo(bearing, facing)) <= rules.fire.huntAngle)
          events.push(startTell(fight, course, 'hunt', bearing));
      }
      break;
    }
    case 'tell':
      if (fight.t >= level.tellSec) { fight.phase = 'fire'; fight.t = 0; fight.fires++; events.push({type: 'fire', kind: fight.breath, cone: {...fight.cone}}); }
      break;
    case 'fire': {
      if (!fight.scorched && inCone(fight.cone, truckAt)) {
        fight.scorched = true; fight.hits++;
        events.push({type: 'scorch', kind: fight.breath, hits: fight.hits});
      }
      const length = fight.breath === 'stage' ? rules.fire.stageSec : rules.fire.huntSec;
      if (fight.t >= length) {
        events.push({type: 'fireEnd', kind: fight.breath});
        fight.t = 0; fight.cone = null;
        if (fight.breath === 'stage') {
          fight.phase = 'rest'; fight.rests++;
          // It drops a junk car in front of itself to launch off (the runner leaves an unused one where it is).
          events.push({type: 'drop', at: {...places.car}});
          events.push({type: 'boxOpen', box: rexNextBox(fight), last: rexLastRest(fight)});
        } else { fight.phase = 'walk'; fight.huntCooldown = level.huntCooldownSec; }
        fight.breath = null;
      }
      break;
    }
    case 'rest': {
      const box = rexNextBox(fight);
      if (truck.airborne && air >= rules.boxTop.resting - rules.catch.minBelow && air <= rules.boxTop.resting + rules.catch.maxAbove &&
          (truck.verticalSpeed ?? 0) <= rules.catch.maxRiseMps && Math.abs(across) <= rules.catch.across &&
          Math.abs(along(truck.s, rexBoxS(fight, box), L)) <= rules.catch.along) {
        fight.boxes[box] = true; fight.hurt = true; fight.t = 0;
        const left = rexBoxesLeft(fight);
        events.push({type: 'smash', box, left});
        if (!left) { fight.phase = 'fallen'; events.push({type: 'fall'}); }
        else fight.phase = 'stagger';
        break;
      }
      if (fight.t >= level.restSec) { fight.phase = 'walk'; fight.t = 0; events.push({type: 'boxClose', box}); }
      break;
    }
    case 'stagger':
      if (fight.t >= rules.staggerSec) { fight.phase = 'walk'; fight.t = 0; }
      break;
    case 'lift':
      if (fight.t >= level.throwTellSec) { fight.phase = 'throw'; fight.t = 0; events.push({type: 'throw', at: {...fight.throwAt}}); }
      break;
    case 'throw':
      if (fight.t >= rules.thrown.flightSec) {
        const hit = Math.hypot(truckAt.x - fight.throwAt.x, truckAt.z - fight.throwAt.z) <= rules.thrown.hitRadius;
        if (hit) fight.hits++;
        events.push({type: 'thrownLand', hit, hits: fight.hits, at: {...fight.throwAt}});
        fight.throwAt = null; fight.phase = 'walk'; fight.t = 0;
      }
      break;
    case 'eat':
      if (fight.t >= rules.eatSec) { fight.hurt = false; fight.phase = 'walk'; fight.t = 0; events.push({type: 'ate'}); }
      break;
    case 'fallen':
      if (fight.t >= rules.fallSec) fight.done = {won: true, reason: 'fallen'};
      break;
    default:
      break;
  }

  // Its body is solid: a truck that drives into it, or flies into it anywhere but
  // onto the open box, is pushed back out on the stands' side and slowed.
  if (!fight.done && fight.phase !== 'fallen' && fight.phase !== 'gone' && !events.some(event => event.type === 'smash')) {
    // While it rests, a truck coming down from a jump lands on its back.
    const top = fight.phase === 'rest' || fight.phase === 'stagger' ? rules.boxTop.resting - rules.catch.minBelow : rules.boxTop.standing;
    if (fight.bumpCooldown <= 0 && air < top && Math.abs(across) <= rules.halfWidth + 1.5 &&
        Math.abs(along(truck.s, fight.s, L)) <= rules.halfLength + 2) {
      fight.bumpCooldown = rules.bumpCooldownSec;
      // Pushed out towards the middle of the floor, away from its rails.
      events.push({type: 'bump', lateral: places.rail - places.side * (rules.halfWidth + 1.6)});
    }
  }
  if (!fight.done && fight.hits >= level.hits) {
    fight.done = {won: false, reason: 'toasted'};
    events.push({type: 'toasted'});
  }
  return events;
}

// ---- the runner on Show Night --------------------------------------------

// What Big Mo says for each fight event: the first time only for a lesson,
// every time for what the player must do now.
const SAY = {
  tell: [['rex.tell', true]], scorch: [['rex.scorch', true]], bump: [['rex.bump', true]],
  lift: [['rex.lift', true]], eat: [['rex.eat', true]], gone: [['rex.gone', false]], toasted: [['rex.toasted', false]],
};

export const rexFightOf = night => night?.event?.type === REX_EVENT ? night.event.rex ?? null : null;

// The junk car it drops in front of itself is ordinary parked traffic, as Freestyle's
// launch cars are: the Titan's launch off cars (FUN-TITAN-LAUNCH) is not touched. A car
// still standing there unused stays; a crushed one is replaced. The race counts the
// truck's distance on from lap to lap, so the car stands at its place on the lap the
// truck will come to next, and while the box is open a car the truck has driven past
// moves on to the next lap's place.
function nextAhead(duel, place) {
  const s = duel.state, L = duel.course.length;
  let at = s.s - (((s.s - place) % L) + L) % L;
  if (at < s.s + 1) at += L;
  return at;
}
function dropJunkCar(duel, at) {
  const s = duel.state;
  s.traffic ||= [];
  const standing = s.traffic.find(car => car.bowlRexCar && car.alive !== false && !car.crushed);
  if (standing) { keepJunkCarAhead(duel, at); return false; }
  const place = nextAhead(duel, at.s);
  s.traffic.push({s: place, prevS: place, lateral: at.lateral, prevLateral: at.lateral, dir: 1, speedMph: 0, headingError: 0,
    pushVelocity: 0, car: 'falcone_f42', alive: true, damageZones: freshDamageZones(), damageCooldown: 0,
    bowlParked: true, bowlRexCar: true});
  return true;
}
// Parked traffic eases towards its road lane (sim-rival.js _traffic); the junk car stays where it was dropped.
function keepJunkCarAhead(duel, at) {
  const car = duel.state.traffic?.find(other => other.bowlRexCar && other.alive !== false && !other.crushed);
  if (!car) return;
  if (car.s < duel.state.s - 8) car.s = car.prevS = nextAhead(duel, at.s);
  car.lateral = car.prevLateral = at.lateral; car.headingError = 0; car.speedMph = 0;
}

function applyToTruck(duel, event) {
  const s = duel.state, rules = REX_RULES;
  if (event.type === 'drop') dropJunkCar(duel, event.at);
  if (event.type === 'scorch') { s.speedMph *= rules.scorchSpeed; s.boosting = false; }
  if (event.type === 'thrownLand' && event.hit) { s.speedMph *= rules.scorchSpeed; s.boosting = false; }
  if (event.type === 'bump') {
    const places = duel.state.bowlNight?.event?.rex?.places;
    s.lateral = s.prevLateral = (places?.side ?? -1) > 0 ? Math.min(s.lateral, event.lateral) : Math.max(s.lateral, event.lateral);
    s.speedMph *= rules.bumpSpeed; s.pushVelocity = 0;
  }
  if (event.type === 'smash' && s.airborne) {
    // The truck comes down on the box and bounces off it, on over its back.
    const ground = duel.course.groundAt(s.s, s.lateral).y;
    if (Number.isFinite(s._jumpY)) s._jumpY = Math.max(s._jumpY, ground + rules.boxTop.resting + .2);
    s._verticalSpeed = Math.max(s._verticalSpeed || 0, rules.bounceMps);
  }
}

registerBowlEventRunner(REX_EVENT, {
  place(duel, night) {
    const s = duel.state, show = duel.course.features?.bowl?.start, start = show?.s ?? 0, lateral = show?.lateral ?? 0;
    s.s = s.prevS = start; s.lateral = s.prevLateral = lateral;
    s.nextLapGate = duel._lapGates.filter(gate => gate <= start).length;
    night.event.rex = createRexFight({difficulty: night.cpuDifficulty, course: duel.course});
  },
  target: () => REX_RULES.boxes.length,
  goal(night) {
    const fight = rexFightOf(night);
    return fight ? BOWL_GOALS.scrapasaurus({phase: fight.phase, left: rexBoxesLeft(fight), last: rexLastRest(fight)}) : '';
  },
  step(duel, night, dt) {
    const s = duel.state, fight = night.event.rex;
    const events = stepRexFight(fight, {s: s.s, lateral: s.lateral, airborne: !!s.airborne,
      airHeight: s.airHeight || 0, verticalSpeed: s._verticalSpeed || 0, speedMph: s.speedMph}, dt, duel.course);
    keepJunkCarAhead(duel, fight.places.car);
    for (const event of events) {
      applyToTruck(duel, event);
      duel.emit({bowlRex: {...event, cue: REX_CUES[event.type] ?? null}});
      for (const [id, once] of SAY[event.type] ?? []) sayBowlLine(duel, id, {once});
      if (event.type === 'boxOpen') sayBowlLine(duel, event.last ? 'rex.rest.last' : 'rex.rest');
      if (event.type === 'smash') sayBowlLine(duel, `rex.smash.${3 - event.left}`);
      if (event.type === 'ate') sayBowlLine(duel, 'rex.ate', {once: true});
    }
    if (!fight.done) return null;
    return {won: fight.done.won, reason: fight.done.reason, boxes: 3 - rexBoxesLeft(fight), hits: fight.hits};
  },
});

// The beaten Scrapasaurus stands in the yard's car park. Read from the save
// only: winning night five gives its trophy (settleShowNight).
export function rexInTheYard(profile) {
  return Array.isArray(profile?.bowl?.trophies) && profile.bowl.trophies.includes(REX_TROPHY);
}
