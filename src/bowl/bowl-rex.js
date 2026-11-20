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
// - rest: after the fire it has breathed at the big ramp, it crouches to cool
//   down with one battery box open, always at the same place just past the big
//   ramp. A truck that comes down on the open box from a jump smashes it.
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
  // How far past the big ramp's lip the open box sits: where a truck that left
  // the lip at 28 to 38 mph (the floor's own speeds) comes down from its highest point.
  restPastRamp: 5,
  // Each battery box's place along the body, metres towards the head, as in the
  // model (battery-box-1 to battery-box-3). They are smashed in that order.
  boxes: Object.freeze([-1.35, .1, 1.55]),
  // The top of a battery box above the floor: standing, and crouched to rest.
  boxTop: Object.freeze({standing: 4.7, resting: 2.6}),
  // A truck in the air within this much of the open box, at least this high, no more than
  // maxAbove over the box's top, and at or past the top of its jump (rising no faster than
  // maxRiseMps), comes down on it.
  catch: Object.freeze({along: 3.5, across: 2.4, minAir: 1.5, maxAbove: 2.6, maxRiseMps: 1}),
  // The flamethrower's cone (src/arsenal/flamethrower.js: 9 m, 15 degrees), larger:
  // at the ramp it reaches from its nozzle back past the foot of the big ramp
  // (rexPlaces), and never less than twice the flamethrower's. A hunt reaches a
  // little less far than that.
  fire: Object.freeze({halfAngle: 22 * DEG, minRange: 18, pastRamp: 5, huntShare: .9,
    stageSec: 2.5, huntSec: 2, huntAngle: 35 * DEG}),
  thrown: Object.freeze({flightSec: 1, hitRadius: 3.5}),
  eatSec: 3, staggerSec: 2, fallSec: 3, bumpCooldownSec: 1,
  // A smashed box makes it limp until it eats; a scorch and a bump slow the truck.
  limp: .7, scorchSpeed: .35, bumpSpeed: .5, bounceMps: 4.5,
  // Easy is slower, with a longer tell, a longer rest and more chances.
  level: Object.freeze({
    easy: Object.freeze({walkMps: 4, tellSec: 3, throwTellSec: 2.5, restSec: 12, huntCooldownSec: 16, rests: 6, hits: 5}),
    medium: Object.freeze({walkMps: 5, tellSec: 2, throwTellSec: 1.8, restSec: 8, huntCooldownSec: 10, rests: 5, hits: 4}),
    hard: Object.freeze({walkMps: 6, tellSec: 1.4, throwTellSec: 1.2, restSec: 6, huntCooldownSec: 7, rests: 4, hits: 3}),
  }),
});

// The sound each fight event makes (named in BOWL_SOUND_CUES, bowl-lines.js).
export const REX_CUES = Object.freeze({
  tell: 'bowl.rex.roar', fire: 'bowl.rex.fire', fireEnd: 'bowl.rex.fire.end', scorch: 'bowl.rex.scorch',
  boxOpen: 'bowl.rex.box.open', boxClose: 'bowl.rex.box.close', smash: 'bowl.rex.box.smash', bump: 'bowl.rex.bump',
  lift: 'bowl.rex.lift', throw: 'bowl.rex.throw', thrownLand: 'bowl.rex.throw.land', eat: 'bowl.rex.eat',
  fall: 'bowl.rex.fall', gone: 'bowl.rex.gate',
});

const levelOf = name => LEVELS.includes(name) ? name : 'medium';
const wrap = (value, length) => ((value % length) + length) % length;
// Signed distance from b to a round the ring, from -length/2 to length/2.
const along = (a, b, length) => wrap(a - b + length / 2, length) - length / 2;
const angleTo = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// Where the fight happens on a course, from its data: the floor's width, its ramps
// and its crush line (bowl-course.js). A course may name the rails itself
// (features.rexRails: {off}); otherwise they run halfway out on the island side.
// - the open box rests just past the big ramp's lip (the highest ramp);
// - it comes out from under the stands at the head of the crush line;
// - its pen is past the end of the crush line, halfway to the start line;
// - the car park gate is halfway from the start line to the first ramp.
export function rexPlaces(course) {
  const L = course.length, features = course.features || {}, floor = course.def?.scrapdome || {};
  const ramps = [...(features.ramps || [])].sort((a, b) => a.start - b.start);
  const big = ramps.reduce((best, ramp) => !best || ramp.height > best.height ? ramp : best, null) ?? {start: 0, end: 0};
  const rows = (features.crushables || []).map(prop => prop.s);
  const crushStart = rows.length ? Math.min(...rows) : wrap(big.end + L / 3, L);
  const crushEnd = rows.length ? Math.max(...rows) : crushStart;
  const half = Number.isFinite(floor.floorHalfWidth) ? floor.floorHalfWidth : 6;
  const rail = Number.isFinite(features.rexRails?.off) ? features.rexRails.off : -half / 2;
  // From its nozzle at the ramp (the first box's rest) back past the ramp's foot.
  const range = Math.max(REX_RULES.fire.minRange, (big.end - big.start) + REX_RULES.restPastRamp +
    REX_RULES.boxes[0] - REX_RULES.headAhead + REX_RULES.fire.pastRamp);
  return {
    length: L, rail, edge: half,
    startS: wrap(crushStart - 2, L), stageBoxS: wrap(big.end + REX_RULES.restPastRamp, L),
    penS: wrap(crushEnd + (L - crushEnd) / 2, L), gateS: wrap((ramps[0]?.start ?? 0) / 2, L),
    rampStart: big.start, rampEnd: big.end, range, huntRange: range * REX_RULES.fire.huntShare,
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
export const rexWalkMps = fight => REX_RULES.level[fight.level].walkMps * (fight.hurt ? REX_RULES.limp : 1);
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
          events.push({type: 'boxOpen', box: rexNextBox(fight), last: rexLastRest(fight)});
        } else { fight.phase = 'walk'; fight.huntCooldown = level.huntCooldownSec; }
        fight.breath = null;
      }
      break;
    }
    case 'rest': {
      const box = rexNextBox(fight);
      if (truck.airborne && air >= rules.catch.minAir && air <= rules.boxTop.resting + rules.catch.maxAbove &&
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
    // While it crouches, a truck coming down from a jump lands on its back.
    const top = fight.phase === 'rest' || fight.phase === 'stagger' ? rules.catch.minAir : rules.boxTop.standing;
    if (fight.bumpCooldown <= 0 && air < top && Math.abs(across) <= rules.halfWidth + 1.5 &&
        Math.abs(along(truck.s, fight.s, L)) <= rules.halfLength + 2) {
      fight.bumpCooldown = rules.bumpCooldownSec;
      events.push({type: 'bump', lateral: places.rail + rules.halfWidth + 1.6});
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

function applyToTruck(duel, event) {
  const s = duel.state, rules = REX_RULES;
  if (event.type === 'scorch') { s.speedMph *= rules.scorchSpeed; s.boosting = false; }
  if (event.type === 'thrownLand' && event.hit) { s.speedMph *= rules.scorchSpeed; s.boosting = false; }
  if (event.type === 'bump') {
    s.lateral = s.prevLateral = Math.max(s.lateral, event.lateral);
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
    const s = duel.state, start = 0, lateral = 4.5;
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
