import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {CARS} from '../src/config.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {applyArmorDamage} from '../src/combat-armor.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {OLD_SMOKE, createFurnace, stepFurnace, furnaceHit, furnaceSpeed, furnaceHealth,
  furnaceDoorSpot, furnaceGlowingDoor, oldSmokeVentTargets} from '../src/world/jobs/old-smoke.js';
import {worldJobHitTargets, reportWorldJobThingHit} from '../src/arena/modes/world-job.js';
import {SCABLANDS_SOLIDS} from '../src/world/scablands-scene.js';
// The Everburn's lines register when the story's own modules load (the game's screens do it); this test reads them through the job code.
import '../src/story/ember-lines.js';

// WW-BOSS: Old Smoke's furnace chase. The rules live in src/world/jobs/old-smoke.js
// and run without graphics, so this test drives them directly and then through a
// real headless Duel.
let checks = 0;
const check = (value, message) => { assert.ok(value, message); checks++; };
const same = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++; };
const near = (actual, expected, tolerance, message) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message} (got ${actual}, wanted ${expected})`);
  checks++;
};

const chaseStep = EVERBURN_JOBS[5].steps[1];
const def = chaseStep.actor;
const DT = 1 / 120;
const MPH = OLD_SMOKE.mphPerMps;
const fresh = difficulty => createFurnace(def, difficulty);
const forward = f => ({x: Math.sin(f.heading), z: Math.cos(f.heading)});
const right = f => ({x: -Math.cos(f.heading), z: Math.sin(f.heading)});
// A point the given metres from the furnace's centre: along its heading and to its right.
const beside = (f, along, lateral) => ({x: f.x + forward(f).x * along + right(f).x * lateral,
  z: f.z + forward(f).z * along + right(f).z * lateral, y: 0});
// Where a car must be to ram a door: just outside it.
function outsideDoor(f, door, metres = 1.5) {
  const spot = furnaceDoorSpot(f, door);
  const out = door === 'left' ? {x: -right(f).x, z: -right(f).z} : door === 'right' ? right(f) :
    {x: -forward(f).x, z: -forward(f).z};
  return {x: spot.x + out.x * metres, z: spot.z + out.z * metres, y: 0};
}
function run(f, seconds, carFor = () => null) {
  const events = [];
  let effects = {armor: 0, speedCapMph: null, shove: null};
  for (let t = 0; t < seconds - 1e-9; t += DT) {
    const out = stepFurnace(f, DT, {car: carFor(f)});
    events.push(...out.events.map(event => ({...event, atSec: f.timeSec})));
    effects = {armor: effects.armor + out.armor, speedCapMph: out.speedCapMph ?? effects.speedCapMph,
      shove: out.shove ?? effects.shove};
    if (f.fallen || f.escaped) break;
  }
  return {events, effects};
}
// Run until the furnace has this phase (with no car), up to a limit.
function until(f, phase, limitSec = 600) {
  for (let t = 0; t < limitSec && f.phase !== phase; t += DT) stepFurnace(f, DT, {car: null});
  return f.phase === phase;
}

// ---- 1. The path, the legs and the job data -------------------------------------
same(def.legs.map(leg => leg.door), ['left', 'right', 'rear'], 'three legs, one door each, a different side every time');
{
  const f = fresh('medium');
  check(f.legs.every((leg, index) => index === 0 || leg.fromMetres > f.legs[index - 1].fromMetres),
    'the legs follow one another along the path');
  check(f.path.total / OLD_SMOKE.baseSpeed > 200 && f.path.total / OLD_SMOKE.baseSpeed < 250,
    'the whole path takes about four minutes at the base pace');
  const well = def.path[0].position;
  const last = def.path.at(-1).position;
  near(Math.hypot(last.x - well.x, last.z - well.z), 0, 1e-9, 'the path ends at the well it starts from');
  const planes = {x: 412, z: 278};
  const boneyardLeg = f.path.points.slice(7, 11);
  check(boneyardLeg.every(point => Math.abs(point.z - planes.z) > 20 || Math.abs(point.x - planes.x) > 40),
    'the Boneyard leg passes beside the planes, not through them');
}

// EVERBURN-RUN-AT-TOWN: the run goes to Tin Town's gate and home along the road. The path, the three legs
// and the gate's place in the list are exactly the card's table.
{
  const f = fresh('medium'), placeAt = index => [f.path.points[index].x, f.path.points[index].z];
  same(def.path.map(place => [place.position.x, place.position.z]), [[-424, 304], [-450, 40], [-300, -230], [-60, -380],
    [170, -340], [350, -200], [350, 60], [335, 170], [345, 246], [440, 248], [545, 252], [610, 170], [575, 82],
    [430, 70], [230, 150], [0, 230], [-200, 350], [-424, 304]], 'the path is the card\'s list of places');
  same(def.legs.map(leg => [leg.id, leg.fromWaypoint]), [['open-flats', 0], ['boneyard', 7], ['run-back', 16]],
    'the three legs begin at the well, at the Boneyard and at the place (-200, 350)');
  check(def.path[def.gateWaypoint].id === 'tin-town-gate-front' && def.gateWaypoint === 12, 'the furnace stops at the place named tin-town-gate-front, the 13th in the list');
  same(placeAt(def.gateWaypoint), [575, 82], 'the furnace stops in front of the gate, at (575, 82)');
  // Re-recorded: the furnace stops 20 m in front of the gate, at (575, 82), and turns west from there, in place of running
  // up to (575, 62) and back out: the two pieces round the gate are 18.5 m shorter (3,250.6 m and 232.2 s before).
  near(f.path.total, 3232.1, .1, 'the path is about 3,232 m');
  near(f.path.total / OLD_SMOKE.baseSpeed, 230.9, .1, 'the path takes 3 minutes 51 seconds at the base pace');
  near(f.path.total - f.legs[2].fromMetres, 228.7, .1, 'the rear door is fought on the last 229 m');
  check(f.legs[1].fromMetres < f.path.cumulative[def.gateWaypoint] && f.path.cumulative[def.gateWaypoint] < f.legs[2].fromMetres,
    'the gate lies on the Boneyard leg, before the run home');
  // The old loop is gone: no place of the path comes from the old turning points.
  check(!def.path.some(place => /^furnace-(turn|run)-[12]$/.test(place.id)), 'the loop back to the well is gone');
}

// Every straight piece of the path clears every solid in the Scablands by 8 m. The furnace begins at the well and
// rolls into it, so the first and last pieces are allowed to touch the Everburn well's own box and no other.
{
  const distanceToBox = (x, z, solid) => {
    const [cx, , cz] = solid.center, [width, , depth] = solid.size;
    return Math.hypot(Math.max(Math.abs(x - cx) - width / 2, 0), Math.max(Math.abs(z - cz) - depth / 2, 0));
  };
  const points = def.path.map(place => place.position);
  let tightest = Infinity;
  for (let piece = 0; piece < points.length - 1; piece++) {
    const a = points[piece], b = points[piece + 1], length = Math.hypot(b.x - a.x, b.z - a.z);
    for (const solid of SCABLANDS_SOLIDS) {
      if (solid.id === 'everburn-well' && (piece === 0 || piece === points.length - 2)) continue;
      let closest = Infinity;
      for (let metres = 0; metres <= length; metres += .1) {
        const t = metres / length;
        closest = Math.min(closest, distanceToBox(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, solid));
      }
      tightest = Math.min(tightest, closest);
      check(closest >= 8, `piece ${piece + 1} of the path clears ${solid.id} by 8 m (got ${closest.toFixed(1)})`);
    }
  }
  console.log(`Old Smoke: the path's tightest clearance from a solid is ${tightest.toFixed(1)} m`);
}
check(chaseStep.contactRadius === 0 && chaseStep.leashDistance === Infinity,
  'touching the furnace or falling behind never ends the chase');
check(chaseStep.requiredHits === 3 && def.health === 3, 'three doors, three hits');

// ---- 2. Stoke, glow, slam ---------------------------------------------------------
for (const difficulty of ['easy', 'medium', 'hard']) {
  const f = fresh(difficulty), glow = OLD_SMOKE.glowSec[difficulty];
  const {events} = run(f, OLD_SMOKE.introSec + 4 + glow + 3 + 1);
  const at = type => events.filter(event => event.type === type).map(event => event.atSec);
  const intro = OLD_SMOKE.introSec;
  near(at('stoke')[0], intro, DT * 2, `${difficulty}: the first stoke begins once the opening lines are done`);
  near(at('doorOpen')[0], intro + 4, DT * 2, `${difficulty}: the door opens after the 4-second stoke`);
  near(at('doorSlam')[0], intro + 4 + glow, DT * 2, `${difficulty}: the door stands open for ${glow} seconds then slams`);
  near(at('stoke')[1], intro + 4 + glow + 3, DT * 2, `${difficulty}: the rhythm starts again 3 seconds after the slam`);
  check(events.find(event => event.type === 'stoke').door === 'left', `${difficulty}: the first stoke names the left door`);
}
same([6, 4.5, 3.5], [OLD_SMOKE.glowSec.easy, OLD_SMOKE.glowSec.medium, OLD_SMOKE.glowSec.hard],
  'glow times are 6, 4.5 and 3.5 seconds');
{
  // Only the open door is a target, and its size depends on the difficulty.
  for (const [difficulty, radius] of [['easy', 2], ['medium', 1.2], ['hard', 1.2]]) {
    const f = fresh(difficulty), actor = {id: 'old-smoke-furnace', furnace: f, position: {x: f.x, y: 0, z: f.z}};
    same(oldSmokeVentTargets(actor), [], `${difficulty}: no door is a target during the stoke`);
    check(until(f, 'glow'), `${difficulty}: the door opens`);
    const targets = oldSmokeVentTargets(actor);
    check(targets.length === 1 && targets[0].door === 'left' && targets[0].glowing && targets[0].kind === 'furnace-vent',
      `${difficulty}: only the open door is a target`);
    check(targets[0].radius === radius, `${difficulty}: the door is ${radius} m wide to hit`);
    check(until(f, 'shut'), `${difficulty}: the door slams`);
    same(oldSmokeVentTargets(actor), [], `${difficulty}: a slammed door is no target`);
  }
}

// ---- 3. A door counts only while it glows, and only its own --------------------
{
  const f = fresh('medium');
  run(f, OLD_SMOKE.introSec + .1);
  check(f.phase === 'stoke', 'the furnace begins with a stoke');
  check(!furnaceHit(f, 'left'), 'a hit during the stoke counts for nothing');
  until(f, 'glow');
  check(!furnaceHit(f, 'right') && !furnaceHit(f, 'rear'), 'a hit on the wrong side counts for nothing');
  check(f.hits === 0 && furnaceHealth(f) === 3, 'wrong hits leave the furnace untouched');
  until(f, 'shut');
  check(!furnaceHit(f, 'left'), 'a hit on a shut door counts for nothing');
  until(f, 'glow');
  check(furnaceHit(f, 'left') && f.hits === 1, 'a hit on the open door counts');
  check(!furnaceHit(f, 'left') && f.hits === 1, 'the same door cannot be hit twice');
}

// ---- 4. Each leg uses its own door; three hits end it ------------------------------
for (const difficulty of ['easy', 'medium', 'hard']) {
  const f = fresh(difficulty), doors = [];
  for (let leg = 0; leg < 3; leg++) {
    check(until(f, 'glow'), `${difficulty}: leg ${leg + 1} opens its door`);
    check(f.legIndex === leg, `${difficulty}: the door of leg ${leg + 1} opens on its own ground`);
    doors.push(f.door);
    for (const wrong of ['left', 'right', 'rear'].filter(door => door !== f.door))
      check(!furnaceHit(f, wrong), `${difficulty}: only the door of leg ${leg + 1} counts`);
    check(furnaceHit(f, f.door, 'weapon'), `${difficulty}: leg ${leg + 1} ends on a hit`);
    check(f.hits === leg + 1, `${difficulty}: the hit is counted once`);
  }
  same(doors, ['left', 'right', 'rear'], `${difficulty}: left, right, then rear`);
  check(f.won, `${difficulty}: three hits end it`);
}

// ---- 4b. The gate: reaching Tin Town, and the gate burning ------------------------
{
  const count = (events, type) => events.filter(event => event.type === type).length;
  for (const difficulty of ['easy', 'medium', 'hard']) {
    // No hits at all: the furnace runs up to the gate with its right door whole, and the gate burns, once.
    const f = fresh(difficulty);
    check(!f.townReached && !f.gateBurnt && f.gateMetres === f.path.cumulative[def.gateWaypoint], `${difficulty}: the gate facts start out false`);
    const first = run(f, f.gateMetres / OLD_SMOKE.baseSpeed - 1);
    check(count(first.events, 'townReached') === 0 && !f.townReached, `${difficulty}: nothing is recorded before the gate`);
    const second = run(f, 4);
    check(f.townReached && f.gateBurnt && count(second.events, 'townReached') === 1 && count(second.events, 'gateBurnt') === 1,
      `${difficulty}: at the gate with the right door whole, the gate burns`);
    check(second.events.find(event => event.type === 'townReached').burnt === true, `${difficulty}: the town event says the gate burnt`);

    // The first two doors broken in time: the furnace runs through the gate at its bolt pace and the gate does not burn.
    const g = fresh(difficulty), events = [];
    for (let leg = 0; leg < 2; leg++) { until(g, 'glow'); furnaceHit(g, g.door); }
    events.push(...run(g, 120).events);
    check(g.metres > g.gateMetres, `${difficulty}: the furnace passed the gate while running at its bolt pace`);
    check(g.townReached && !g.gateBurnt && count(events, 'townReached') === 1 && count(events, 'gateBurnt') === 0,
      `${difficulty}: with the right door broken it reaches the gate and the gate stays whole`);
    check(events.find(event => event.type === 'townReached').burnt === false, `${difficulty}: the town event says the gate did not burn`);
    // Only the right door counts: with just the left door broken the gate still burns.
    const h = fresh(difficulty);
    until(h, 'glow'); furnaceHit(h, h.door);
    const leftOnly = run(h, 200).events;
    check(h.gateBurnt && count(leftOnly, 'gateBurnt') === 1, `${difficulty}: with only the left door broken the gate burns`);
  }
  // Once only: three more laps past the gate set nothing again, and breaking the right door later does not mend the gate.
  const f = fresh('easy');
  const {events} = run(f, 1200);
  check(f.laps >= 3 && count(events, 'townReached') === 1 && count(events, 'gateBurnt') === 1, 'the gate facts are set once, however many laps it runs');
  const late = fresh('easy');
  run(late, late.gateMetres / OLD_SMOKE.baseSpeed + 2);
  const burntBefore = late.gateBurnt;
  while (late.hits < 3) { until(late, 'glow'); furnaceHit(late, late.door); }
  check(burntBefore && late.broken[1] && late.gateBurnt, 'the gate burnt, and breaking the doors afterwards does not mend it');
  // A furnace made without a gate place has no gate facts.
  const bare = createFurnace({path: def.path, legs: def.legs}, 'medium');
  const bareRun = run(bare, 200);
  check(bare.gateMetres === null && !bare.townReached && !bare.gateBurnt && !bareRun.events.some(event => /^(townReached|gateBurnt)$/.test(event.type)),
    'without gateWaypoint the furnace records no gate facts');
  // The same inputs give the same facts.
  const facts = () => { const x = fresh('medium'); const out = run(x, 170); return JSON.stringify([x.townReached, x.gateBurnt, out.events.filter(e => /^(townReached|gateBurnt)$/.test(e.type))]); };
  check(facts() === facts(), 'the gate facts are the same every time');
}

// ---- 5. After a hit: stagger, a plate, a speed-up; always slower than any car ----
{
  const slowestMps = Math.min(...Object.values(CARS).map(car => car.topSpeed)) * .44704;
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const f = fresh(difficulty), factor = OLD_SMOKE.speedUp[difficulty];
    [14, 14 * factor, 14 * factor * factor].forEach((expected, hits) =>
      near(furnaceSpeed(difficulty, hits), expected, 1e-9,
        `${difficulty}: a tenth faster after each hit on Medium and Hard, never on Easy (${hits} hits)`));
    for (let hits = 0; hits <= 3; hits++)
      check(furnaceSpeed(difficulty, hits) * 2 < slowestMps,
        `${difficulty}: after ${hits} hits the furnace is far slower than the slowest car the story allows`);
    until(f, 'glow');
    furnaceHit(f, f.door);
    const events = stepFurnace(f, DT, {car: null}).events;
    check(f.phase === 'stagger' && f.staggerLeft > 1.9, `${difficulty}: it staggers for 2 seconds`);
    check(events.some(event => event.type === 'plateFall') && events.some(event => event.type === 'hit' && event.hit === 1),
      `${difficulty}: a plate falls off with the hit`);
    const before = f.metres;
    run(f, 1);
    near(f.metres - before, furnaceSpeed(difficulty, 1) * OLD_SMOKE.staggerSpeedShare, .2,
      `${difficulty}: it stumbles slowly while it staggers`);
    run(f, 1.1);
    check(f.phase !== 'stagger', `${difficulty}: the stagger ends after 2 seconds`);
    const resumed = f.metres;
    run(f, 1);
    // After a hit it runs for the next leg's ground (Claude, 10 November), and only there drops to its new pace.
    near(f.metres - resumed, OLD_SMOKE.boltSpeed[difficulty], .2, `${difficulty}: after the stagger it runs for the next leg's ground`);
    check(OLD_SMOKE.boltSpeed[difficulty] < slowestMps, `${difficulty}: that run is slower than the slowest car the story allows`);
    check(f.phase === 'idle' && f.door === null, `${difficulty}: no door stokes during the run`);
    const startedRun = f.timeSec;
    while (f.legIndex < 1 && f.timeSec - startedRun < 120) run(f, .5);
    check(f.legIndex === 1 && f.timeSec - startedRun <= 50, `${difficulty}: it reaches the Boneyard ground within 50 seconds of the hit (took ${(f.timeSec - startedRun).toFixed(1)})`);
    run(f, .5);
    const onGround = f.metres;
    run(f, 1);
    near(f.metres - onGround, furnaceSpeed(difficulty, 1), .2, `${difficulty}: on the new ground it runs at its new pace`);
    check(f.phase === 'stoke' && f.door === 'right', `${difficulty}: and the right door begins to stoke`);
  }
  // The roll-in distance is the leg-3 ground, so even that dash is no faster than the slowest car.
  const f = fresh('medium');
  const leg3 = f.path.total - f.legs[2].fromMetres;
  check(leg3 / OLD_SMOKE.rollInSec < slowestMps, 'even the 5-second roll into the well is slower than the slowest car');
}

// ---- 6. A miss never loses; the Hard rule ------------------------------------------
for (const difficulty of ['easy', 'medium']) {
  const f = fresh(difficulty);
  const {events} = run(f, 1200);
  check(!f.escaped && !f.fallen && !f.won, `${difficulty}: twenty minutes of misses never lose`);
  check(events.some(event => event.type === 'turnAround') && f.laps >= 3, `${difficulty}: it turns round at the well and keeps going`);
  check(events.filter(event => event.type === 'doorSlam').length >= 10, `${difficulty}: its door keeps opening and slamming`);
  check(!events.some(event => event.type === 'escaped'), `${difficulty}: it never escapes`);
}
{
  const f = fresh('hard');
  const {events} = run(f, 1200);
  const escaped = events.find(event => event.type === 'escaped');
  check(escaped && f.escaped, 'Hard: finishing the whole path with a door unbroken is an escape');
  check(escaped.atSec > 200 && escaped.atSec < 260, 'Hard: the escape comes after about four minutes');
  const second = fresh('hard');
  run(second, 10);
  until(second, 'glow');
  furnaceHit(second, second.door);
  const later = run(second, 1200);
  check(later.events.some(event => event.type === 'escaped'), 'Hard: one hit is not enough to stop it escaping');
  const won = fresh('hard');
  for (let leg = 0; leg < 3; leg++) { until(won, 'glow'); furnaceHit(won, won.door); }
  const finish = run(won, 30);
  check(!won.escaped && won.fallen && finish.events.some(event => event.type === 'fell'),
    'Hard: three hits roll it into the well, not away');
}

// ---- 7. The end: it turns for the well and rolls in after 5 seconds -------------
for (const [difficulty, armor] of [['easy', 0], ['medium', 15], ['hard', 20]]) {
  const f = fresh(difficulty);
  for (let leg = 0; leg < 3; leg++) { until(f, 'glow'); furnaceHit(f, f.door); }
  const well = def.path[0].position;
  same(stepFurnace(f, DT, {car: null}).events.map(event => event.type).includes('rollIn'), true, `${difficulty}: it turns for the well`);
  check(furnaceHealth(f) === 1, `${difficulty}: the job is not ended until the furnace has fallen in`);
  run(f, 4.8, () => ({x: well.x + 10, y: 0, z: well.z}));
  check(!f.fallen, `${difficulty}: it is still rolling before 5 seconds`);
  const { events, effects } = run(f, .5, () => ({x: well.x + 10, y: 0, z: well.z}));
  check(f.fallen && events.some(event => event.type === 'fell'), `${difficulty}: it falls in 5 seconds after the third hit`);
  check(furnaceHealth(f) === 0, `${difficulty}: the job can end once it has fallen in`);
  near(effects.armor, armor, 1e-9, `${difficulty}: a car near the well loses ${armor} armour`);
  const far = fresh(difficulty);
  for (let leg = 0; leg < 3; leg++) { until(far, 'glow'); furnaceHit(far, far.door); }
  same(run(far, 6, () => ({x: well.x + 200, y: 0, z: well.z})).effects.armor, 0, `${difficulty}: a car well clear loses nothing`);
}

// ---- 8. Cinders ----------------------------------------------------------------------
{
  const f = fresh('medium');
  run(f, 12);
  check(f.cinders.length > 5, 'the furnace leaves a trail of cinders');
  check(f.cinders.every(cinder => cinder.age < OLD_SMOKE.cinder.lifeSec), 'cinders last 5 seconds');
  const burning = (difficulty, seconds) => {
    const furnace = fresh(difficulty);
    run(furnace, 12);
    const onTrail = furnace.cinders[0];
    const total = {armor: 0, cap: null};
    for (let t = 0; t < seconds; t += DT) {
      const out = stepFurnace(furnace, DT, {car: {x: furnace.cinders[0].x, y: 0, z: furnace.cinders[0].z}});
      total.armor += out.armor; total.cap = out.speedCapMph ?? total.cap;
    }
    return {...total, onTrail};
  };
  const easy = burning('easy', 3), medium = burning('medium', 3), hard = burning('hard', 3);
  check(easy.armor === 0 && easy.cap > furnaceSpeed('easy', 0) * MPH, 'Easy: cinders only slow the car, to near the furnace pace');
  check(medium.armor > 10 && medium.cap === null, 'Medium: cinders cost armour');
  check(hard.armor > medium.armor, 'Hard: cinders cost more armour');
  const clear = fresh('medium');
  run(clear, 12);
  const free = run(clear, 3, furnace => beside(furnace, 0, 12));
  check(free.effects.armor === 0 && free.effects.speedCapMph === null, 'a car off the trail is untouched');
}

// ---- 9. The shoulder ------------------------------------------------------------------
{
  // A furnace with its first door already broken has no door to open on this ground, so none glows.
  const calm = difficulty => {
    const f = fresh(difficulty);
    f.hits = 1; f.broken[0] = true;
    return f;
  };
  for (const [difficulty, armor] of [['easy', 10], ['medium', 20], ['hard', 20]]) {
    const f = calm(difficulty);
    // 4.5 seconds: this furnace is running for the next ground, and must still be on its first straight when the check below reads its heading.
    const {events, effects} = run(f, 4.5, furnace => beside(furnace, 0, 4.5));
    const warn = events.find(event => event.type === 'shoveWarning'), shove = events.find(event => event.type === 'shove');
    near(warn.atSec, 3, DT * 2, `${difficulty}: the chimney leans after 3 seconds beside the furnace`);
    near(shove.atSec - warn.atSec, 1.2, DT * 2, `${difficulty}: the swerve comes 1.2 seconds after the horn`);
    check(shove.side === 1 && effects.shove.armor === armor, `${difficulty}: the shove costs ${armor} armour (half as much on Easy)`);
    const out = effects.shove;
    check(out.x * right(f).x + out.z * right(f).z > .99, `${difficulty}: the shove goes sideways, away from the furnace`);
    check(events.filter(event => event.type === 'shove').length === 1, `${difficulty}: one shove, then a 3-second rest`);
  }
  const dropBack = run(calm('medium'), 6, furnace => (furnace.timeSec < 3.5 ? beside(furnace, 0, 4.5) : beside(furnace, -12, 4.5)));
  check(dropBack.events.some(event => event.type === 'shoveWarning') && !dropBack.events.some(event => event.type === 'shove'),
    'dropping back during the horn avoids the shove');
  const crossOver = run(calm('medium'), 6, furnace => beside(furnace, 0, furnace.timeSec < 2.5 ? 4.5 : -4.5));
  check(!crossOver.events.some(event => event.type === 'shove'), 'crossing over starts the count again');
  const far = run(calm('medium'), 10, furnace => beside(furnace, -12, 4.5));
  check(far.events.length === 0 || !far.events.some(event => event.type === 'shoveWarning'), 'a car behind the furnace is never shoved');
  const open = fresh('medium');
  until(open, 'glow');
  const rammer = run(open, .5, furnace => outsideDoor(furnace, 'left'));
  check(open.hits === 1 && !rammer.events.some(event => event.type === 'shoveWarning'), 'the glowing door is the place to be, not a place to be shoved from');
}

// ---- 10. Ramming the open door counts; ramming anything else does not ------------
{
  for (const door of ['left', 'right', 'rear']) {
    const f = fresh('easy');
    f.hits = ['left', 'right', 'rear'].indexOf(door);
    f.metres = f.legs[f.hits].fromMetres + 1;
    f.legIndex = f.hits;
    until(f, 'glow');
    check(f.door === door, `leg ${f.hits + 1} opens its ${door} door`);
    const wrongSide = door === 'left' ? 'right' : door === 'right' ? 'left' : 'right';
    run(f, .05, furnace => outsideDoor(furnace, wrongSide));
    check(f.hits === (['left', 'right', 'rear'].indexOf(door)), `a car on the wrong side of the furnace does not count (${door})`);
    run(f, .05, furnace => outsideDoor(furnace, door));
    check(f.hits === (['left', 'right', 'rear'].indexOf(door)) + 1, `a car ramming the open ${door} door counts`);
  }
  const f = fresh('medium');
  const shutRam = run(f, 2, furnace => outsideDoor(furnace, 'left'));
  check(f.hits === 0 && shutRam.events.every(event => event.type !== 'hit'), 'ramming a door during the stoke counts for nothing');
}

// ---- 11. The same inputs give the same chase (the rules alone) --------------------
{
  const play = () => {
    const f = fresh('medium'), log = [];
    for (let t = 0; t < 400; t += DT) {
      const door = furnaceGlowingDoor(f);
      const car = door && t % 20 > 8 ? outsideDoor(f, door) : beside(f, -14, 6);
      log.push(...stepFurnace(f, DT, {car}).events.map(event => ({...event, atSec: +f.timeSec.toFixed(4)})));
      if (f.fallen) break;
    }
    return JSON.stringify({log, hits: f.hits, x: f.x, z: f.z, metres: f.metres, laps: f.laps});
  };
  check(play() === play(), 'the same inputs give the same events, in the same order, at the same times');
}

// ---- 12. A real headless Duel ----------------------------------------------------------
const flags = {'hidden-road': true, arsenal: true, 'arsenal-wave3': true, 'warlord-cards': true, 'crew-gear': true};
const FURNACE_ID = 'old-smoke-furnace';
const wrap = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const well = def.path[0].position;

function startDuel(seed, difficulty, {fullJob = false, carAt = {x: well.x + 12, z: well.z + 6}} = {}) {
  const duel = new Duel({seed, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  const job = {...EVERBURN_JOBS[5], seed, steps: fullJob ? EVERBURN_JOBS[5].steps : [chaseStep]};
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed,
    cpuDifficulty: difficulty, opponents: [], weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job}), true,
  'the chase starts in a real headless Duel');
  const at = duel.course.nearest(carAt.x, carAt.z);
  Object.assign(duel.state, {s: at.s, lateral: at.lateral, speedMph: 0, headingError: 0, yawVelocity: 0});
  return duel;
}
const furnaceOf = duel => duel.state.arena.worldJob.actors.find(actor => actor.id === FURNACE_ID);
const carPoint = duel => duel.course.groundAt(duel.state.s, duel.state.lateral);
function tick(duel, input = {throttle: 0, brake: 0, steer: 0, boost: false, interact: false}) {
  if (duel.state.status === 'racing') duel.setInput(input);
  else duel.setInput({throttle: 0, brake: 0, steer: 0, boost: false, interact: false});
  duel.step(DT);
}
function waitUntil(duel, test, limitSec, input) {
  for (let t = 0; t < limitSec / DT && !test(); t += 1) { tick(duel, input); if (duel.state.status === 'arena_result') break; }
  return test();
}

// A scripted young driver for Easy. It reads only what the player sees: the furnace, its
// next door (the arrow) and the glow. It waits behind and beside the furnace, outside the
// cinders, then rams the open door. It never fires a weapon.
function youngDriver(duel) {
  const state = duel.state, actor = furnaceOf(duel);
  if (!actor) return {throttle: 0, brake: 1, steer: 0, boost: false, interact: false};
  const f = actor.furnace, car = carPoint(duel);
  const door = f.door ?? actor.nextDoor ?? 'rear';
  const out = door === 'left' ? {x: -right(f).x, z: -right(f).z} : door === 'right' ? right(f) : {x: -forward(f).x, z: -forward(f).z};
  const open = f.phase === 'glow' || (f.phase === 'stoke' && f.phaseSec > 2.5);
  let target;
  if (open) {
    const spot = furnaceDoorSpot(f, door);
    target = {x: spot.x + out.x * 1.2, z: spot.z + out.z * 1.2};
  } else {
    const wait = door === 'rear' ? right(f) : out;
    target = {x: f.x - forward(f).x * 14 + wait.x * 6, z: f.z - forward(f).z * 14 + wait.z * 6};
  }
  const dx = target.x - car.x, dz = target.z - car.z, gap = Math.hypot(dx, dz);
  const turn = wrap(Math.atan2(dx, dz) - (car.heading + (state.headingError || 0)));
  const furnaceMph = furnaceSpeed(f.difficulty, f.hits) * MPH;
  const want = clamp(furnaceMph + gap * 1.5, 0, furnaceMph + 40);
  const speed = state.speedMph || 0, cap = Math.abs(turn) > 1.2 ? Math.min(want, 25) : want;
  return {throttle: speed < cap ? 1 : 0, brake: speed > cap + 3 ? 1 : 0, steer: clamp(-turn * 2, -1, 1), boost: false, interact: false};
}

function playChase(seed, difficulty, maxSec = 700, driver = youngDriver) {
  const duel = startDuel(seed, difficulty);
  const cues = new Set(), callouts = [];
  duel.onChange((_state, event) => {
    if (event.arenaTell?.cue) cues.add(event.arenaTell.cue);
  });
  for (let n = 0; n < maxSec / DT && duel.state.status !== 'arena_result'; n++) {
    tick(duel, duel.state.status === 'racing' ? driver(duel) : undefined);
    const stoke = duel.state.arena.worldJob.furnaceLog?.at(-1);
    if (stoke?.type === 'stoke' && callouts.at(-1)?.atSec !== stoke.tSec) callouts.push({atSec: stoke.tSec, text: duel.state.callout});
  }
  const worldJob = duel.state.arena.worldJob;
  return {duel, cues, callouts, won: worldJob.job.done && duel.state.arena.result?.reason === 'job-complete',
    log: worldJob.furnaceLog, secs: duel.state.stageTimeSec};
}

{
  // The world-job hooks: only the open door is hit-able, and hits are counted by the furnace's rules.
  const duel = startDuel(5, 'medium', {carAt: {x: 0, z: -200}});
  check(waitUntil(duel, () => furnaceOf(duel)?.furnace.phase === 'stoke', 10), 'the furnace begins to stoke');
  same(worldJobHitTargets(duel).filter(target => target.kind === 'furnace-vent'), [], 'a shut door is not offered as a target');
  const aShut = {id: `${FURNACE_ID}:door-left`, actorId: FURNACE_ID, kind: 'furnace-vent', door: 'left', damage: 1};
  reportWorldJobThingHit(duel, aShut);
  tick(duel);
  check(furnaceOf(duel).furnace.hits === 0 && furnaceOf(duel).health === 3, 'a weapon hit on a door that is still shut counts for nothing');
  check(waitUntil(duel, () => furnaceOf(duel)?.furnace.phase === 'glow', 10), 'the door opens');
  const open = worldJobHitTargets(duel).filter(target => target.kind === 'furnace-vent');
  check(open.length === 1 && open[0].door === 'left' && open[0].glowing, 'the world-job hook offers only the glowing door');
  const near = Math.hypot(open[0].position.x - furnaceOf(duel).position.x, open[0].position.z - furnaceOf(duel).position.z);
  check(near > 2 && near < 3.5, 'the left door sits on the furnace\'s flank');
  reportWorldJobThingHit(duel, {...open[0], door: 'right', id: `${FURNACE_ID}:door-right`, damage: 1});
  tick(duel);
  check(furnaceOf(duel).furnace.hits === 0, 'a weapon hit on the wrong side counts for nothing');
  // The combat code reports every touched door with damage 1, exactly like this.
  reportWorldJobThingHit(duel, {...open[0], damage: open[0].kind === 'furnace-vent' ? 1 : undefined});
  tick(duel);
  check(furnaceOf(duel).furnace.hits === 1 && furnaceOf(duel).health === 2, 'a weapon hit on the open door counts once');
  check(worldJobHitTargets(duel).filter(target => target.kind === 'furnace-vent').length === 0, 'the door is shut again after a hit');
  check(duel.state.arena.worldJob.job.stepIndex === 0 && !duel.state.arena.result, 'one hit does not end the job');
}

for (const difficulty of ['easy', 'medium', 'hard']) {
  // A car that never goes near cannot lose, on any difficulty, however long the furnace runs.
  const duel = startDuel(7, difficulty, {carAt: {x: 0, z: -200}});
  waitUntil(duel, () => duel.state.stageTimeSec > 330, 340);
  const log = duel.state.arena.worldJob.furnaceLog;
  check(!duel.state.arena.result && duel.state.status === 'racing', `${difficulty}: misses alone never end the job`);
  check(!duel.state.combatWrecking && furnaceOf(duel).health === 3, `${difficulty}: nothing was hit and nothing was lost`);
  check(log.some(event => event.type === 'doorSlam' && event.reason === 'missed'), `${difficulty}: the missed door slammed shut`);
  if (difficulty === 'hard') {
    check(log.some(event => event.type === 'escaped') && log.some(event => event.type === 'restart' && event.reason === 'escaped'),
      'Hard: it escaped with a door unbroken, and the chase started again at the well');
    const restart = log.find(event => event.type === 'restart');
    check(furnaceOf(duel).furnace.metres <= (duel.state.stageTimeSec - restart.tSec) * 14 + 5,
      'Hard: the furnace set off again from the start of its path');
  } else {
    check(!log.some(event => event.type === 'escaped' || event.type === 'restart'), `${difficulty}: it turns round and carries on, never escaping`);
  }
}

{
  // Only a wrecked car loses: the chase starts again from its own beginning.
  const duel = startDuel(9, 'medium', {fullJob: true, carAt: {x: well.x + 40, z: well.z}});
  const worldJob = duel.state.arena.worldJob;
  worldJob.job = {...worldJob.job, stepIndex: 1, stepState: {}};
  check(waitUntil(duel, () => furnaceOf(duel)?.furnace.metres > 200, 40), 'the furnace runs off from the well');
  const before = furnaceOf(duel).furnace;
  check(before.metres > 200, 'it has gone some way');
  duel.state.armor = 5;
  applyArmorDamage(duel, duel.state, 'fixed', {owner: 'test', amount: 50});
  check(duel.state.combatWrecking === true, 'the car is wrecked');
  tick(duel);
  const heldAt = furnaceOf(duel).furnace.metres;
  waitUntil(duel, () => !duel.state.combatWrecking, 10);
  tick(duel);
  const again = furnaceOf(duel).furnace;
  check(worldJob.furnaceLog.some(event => event.type === 'restart' && event.reason === 'wrecked'), 'a wreck restarts the chase');
  check(heldAt - before.metres < 20, 'the furnace waits while the car is wrecked');
  check(again.metres < 20 && again.hits === 0, 'the chase starts again from its own beginning, at the well');
  check(worldJob.job.stepIndex === 1 && !worldJob.job.done && !duel.state.arena.result,
    'the job is not lost and the three waves are not played again');
  check(!worldJob.job.events.some(event => event.type === 'waveRestarted') && worldJob.spawnedWaveKeys.length === 0,
    'no wave was started again');
}

{
  // After the third hit nothing can lose the job: a car by the well loses armour but is never wrecked.
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const duel = startDuel(11, difficulty, {carAt: {x: well.x + 6, z: well.z}});
    const furnace = furnaceOf(duel);
    waitUntil(duel, () => !!furnaceOf(duel), 10);
    for (const door of ['left', 'right', 'rear']) { furnaceOf(duel).furnace.phase = 'glow'; furnaceOf(duel).furnace.door = door; furnaceHit(furnaceOf(duel).furnace, door); }
    check(furnaceOf(duel).furnace.won, `${difficulty}: three hits won it`);
    duel.state.armor = 4;
    waitUntil(duel, () => duel.state.arena.result !== null && duel.state.arena.result !== undefined, 12);
    check(!duel.state.combatWrecking && duel.state.armor >= 1, `${difficulty}: after the third hit the car near the well is never wrecked`);
    check(duel.state.arena.result?.reason === 'job-complete' && duel.state.arena.result.winnerId === 'player',
      `${difficulty}: the job is won when the furnace falls into the well`);
    if (difficulty === 'easy') check(duel.state.armor === 4, 'Easy: the fall costs no armour');
    else check(duel.state.armor === 1, `${difficulty}: the fall takes armour down to the last point but no further (armour ${duel.state.armor})`);
    void furnace;
  }
}

{
  // Easy: the young driver wins 8 in 10 across ten seeds, by ramming alone.
  let wins = 0, first = null;
  for (let seed = 1; seed <= 10; seed++) {
    const result = playChase(seed, 'easy');
    if (result.won) wins++;
    first ??= result;
  }
  check(wins >= 8, `a young driver on Easy wins at least 8 chases in 10 (won ${wins})`);
  console.log(`Old Smoke: the young driver on Easy won ${wins} of 10 chases`);
  const log = first.log;
  same(log.filter(event => event.type === 'hit').map(event => event.door), ['left', 'right', 'rear'], 'the Easy chase breaks the left, right then rear doors');
  check(log.filter(event => event.type === 'hit').every(event => event.source === 'ram'), 'every hit was a ram: no weapon was fired');
  check(!log.some(event => event.type === 'shove' || event.type === 'restart'), 'the young driver was never shoved or wrecked');
  const stokes = first.callouts.filter(item => /DOOR OPENING/.test(item.text));
  check(stokes.length >= 3 && /LEFT/.test(stokes[0].text), 'Easy shows an arrow naming the side where the next door will open');
  check(first.duel.state.armor === first.duel.state.maxArmor, 'Easy cinders cost no armour');
  // Easy has no speed-up.
  check(furnaceSpeed('easy', 2) === furnaceSpeed('easy', 0), 'Easy: no speed-up');

  // The same seed and inputs give the same chase, twice.
  const a = playChase(4, 'medium'), b = playChase(4, 'medium');
  const summary = r => JSON.stringify({log: r.log, secs: r.secs, armor: r.duel.state.armor, car: carPoint(r.duel), won: r.won});
  check(summary(a) === summary(b), 'the same seed and inputs give the same chase in a real Duel');
  check(a.won, 'a careful Medium driver wins too');
  const cueNames = [...first.cues, ...a.cues];
  for (const cue of ['arena.tell', 'gate.latch', 'combat.hit-confirm', 'combat.explosion'])
    check(cueNames.includes(cue), `the cue ${cue} plays (stoke, door open, hit, fall into the well)`);
  for (const cue of ['arena.tell', 'gate.latch', 'vehicle.landing', 'combat.hit-confirm', 'arena.toll-gate', 'combat.explosion'])
    check(SOUND_BANK[cue], `the cue ${cue} already exists in the sound bank`);
}

{
  // The slam and the horn also play their cues in a real Duel.
  const duel = startDuel(13, 'medium', {carAt: {x: 0, z: -200}});
  const cues = new Set();
  duel.onChange((_state, event) => { if (event.arenaTell?.cue) cues.add(event.arenaTell.cue); });
  // The first stoke begins after the three opening lines (6.7 s), so the first slam comes at about 15.2 s on Medium.
  waitUntil(duel, () => duel.state.stageTimeSec > 16, 24);
  check(cues.has('vehicle.landing') && cues.has('arena.tell') && cues.has('gate.latch'), 'a missed door plays stoke, door open and slam');
  const shoulder = startDuel(14, 'medium', {carAt: {x: well.x + 8, z: well.z + 10}});
  const horn = new Set();
  shoulder.onChange((_state, event) => { if (event.arenaTell?.cue) horn.add(event.arenaTell.cue); });
  // Sit beside the furnace while no door is open: the horn sounds and the car is shoved.
  const furnaceAt = () => furnaceOf(shoulder);
  waitUntil(shoulder, () => !!furnaceAt(), 5);
  const f = furnaceAt().furnace;
  f.hits = 1; f.broken[0] = true;
  const armorBefore = shoulder.state.armor;
  // The test places the car beside the furnace each tick (this checks the rule, not the driving).
  const keepBeside = () => {
    const target = beside(furnaceAt().furnace, 0, 4.5), onRoad = shoulder.course.nearest(target.x, target.z);
    Object.assign(shoulder.state, {s: onRoad.s, lateral: onRoad.lateral, headingError: 0, speedMph: 0});
    tick(shoulder);
  };
  for (let n = 0; n < 8 / DT && !horn.has('arena.toll-gate'); n++) keepBeside();
  check(horn.has('arena.toll-gate'), 'sitting beside the furnace sounds the horn');
  for (let n = 0; n < 2 / DT && shoulder.state.armor > armorBefore - 15; n++) keepBeside();
  check(shoulder.state.armor <= armorBefore - 15, 'the shove costs armour on Medium');
  check(shoulder.state.knock || shoulder.state.arena.worldJob.furnaceLog.some(event => event.type === 'shove'),
    'the furnace swerves into the car and shoves it');
}

{
  // EVERBURN-RUN-AT-TOWN: reaching the gate plays a cue and a line in a real Duel, and a burnt gate is remembered for the job.
  for (const rightDoorBroken of [false, true]) {
    const duel = startDuel(21, 'medium', {carAt: {x: 0, z: -200}});
    const cues = new Set(), seen = [];
    duel.onChange((_state, event) => { if (event.arenaTell?.cue) cues.add(event.arenaTell.cue); });
    waitUntil(duel, () => !!furnaceOf(duel), 5);
    const furnace = furnaceOf(duel).furnace, worldJob = duel.state.arena.worldJob;
    furnace.metres = furnace.gateMetres - .5;
    if (rightDoorBroken) { furnace.hits = 2; furnace.broken[0] = true; furnace.broken[1] = true; }
    for (let n = 0; n < 2 / DT; n++) { tick(duel); if (duel.state.callout) seen.push(duel.state.callout); }
    const log = worldJob.furnaceLog.filter(event => event.type === 'townReached' || event.type === 'gateBurnt');
    check(cues.has('arena.toll-gate'), `${rightDoorBroken ? 'broken' : 'whole'} right door: reaching the gate sounds the horn`);
    if (rightDoorBroken) {
      check(!cues.has('weapon.flame.start') && !worldJob.gateBurnt && log.length === 1, 'the gate stays whole: no flame cue and no memory of a fire');
      check(seen.includes('Auntie Solder: That is close enough, Smoke. Look at the state of you. Go home.'), 'Auntie Solder tells Old Smoke to go home');
    } else {
      check(cues.has('weapon.flame.start') && worldJob.gateBurnt && log.length === 2, 'the gate burns: the flame cue plays and the job remembers the fire');
      check(seen.includes('Auntie Solder: He has set the gate alight! We will mend it. You stop that furnace.'), 'Auntie Solder says the gate is alight');
      worldJob.furnaceLog.length = 0;
    }
  }
  check(SOUND_BANK['arena.toll-gate'] && SOUND_BANK['weapon.flame.start'], 'both gate cues already exist in the sound bank');
  // The chase opens with Old Smoke's two lines and Cinder's, one after another, and the old line is not played.
  const duel = startDuel(22, 'medium', {fullJob: true, carAt: {x: 0, z: -200}});
  const worldJob = duel.state.arena.worldJob, heard = [];
  worldJob.job = {...worldJob.job, stepIndex: 1, stepState: {}};
  for (let n = 0; n < 16 / DT; n++) { tick(duel); if (duel.state.callout && heard.at(-1) !== duel.state.callout) heard.push(duel.state.callout); }
  same(heard.filter(text => text !== 'GO. MAKE IT COUNT.').slice(0, 3), ['Old Smoke: Fire is mine. Everything goes grey in the end.',
    'Old Smoke: If I cannot have the fire, nobody has it. I am going to put out your forge.',
    'Cinder: He is heading for Tin Town! When a door glows, hit it!'], 'the chase opens with three lines in the card\'s order');
  check(!heard.some(text => text.includes('He\'s running!')), 'the old chase line is never played');
  check(worldJob.furnaceLog.find(event => event.type === 'stoke').tSec > 6.6, 'the first door stokes only after the third line has played');
}

{
  // Job 3 in a real Duel: the catch is noted for the scene, Cinder's line shows, and the job ends after it.
  const seed = 31, duel = new Duel({seed, featureFlags: flags});
  duel.state.wastelandGateDiscovered = true;
  assert.equal(duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed, cpuDifficulty: 'medium', opponents: [],
    weaponLoadout: ['bomb', 'crossbow', 'star'], arsenalRank: 9, job: {...EVERBURN_JOBS[2], seed}}), true, 'job 3 starts in a real headless Duel');
  const worldJob = duel.state.arena.worldJob, heard = [];
  // The car waits 30 m from the thief's start: inside the leash, out of reach.
  const start = duel.course.nearest(394, 304);
  Object.assign(duel.state, {s: start.s, lateral: start.lateral, speedMph: 0, headingError: 0, yawVelocity: 0});
  const watch = () => { if (duel.state.callout && heard.at(-1) !== duel.state.callout) heard.push(duel.state.callout); };
  for (let n = 0; n < 8 / DT && !worldJob.actors.length; n++) { tick(duel); watch(); }
  // Let the opening line finish first: a catch while a line is still showing ends the job without the closing line.
  for (let n = 0; n < 4 / DT; n++) { tick(duel); watch(); }
  check(worldJob.actors.length === 1 && worldJob.wonAtSec === undefined, 'the thief is on the road and nothing is caught yet');
  worldJob.actors[0].health = 0;
  let caughtAt = null;
  for (let n = 0; n < 1 / DT; n++) { tick(duel); watch(); if (caughtAt === null && worldJob.wonAtSec !== undefined) caughtAt = duel.state.stageTimeSec; }
  check(caughtAt !== null && Math.abs(worldJob.wonAtSec - caughtAt) < .1, 'the job notes when the catch happened, for the furnace sighting');
  check(!duel.state.arena.result && heard.includes('Cinder: He was taking the bellows to the furnace. There it goes, out the far end.'),
    'Cinder\'s line shows and the job waits for it');
  worldJob.actors[0].health = 20;
  waitUntil(duel, () => !!duel.state.arena.result, 5);
  check(duel.state.arena.result?.reason === 'job-complete' && duel.state.arena.result.winnerId === 'player',
    'the job is won after the line, even if the thief has rolled on');
}

console.log(`Old Smoke: furnace chase rules passed (${checks} checks)`);
