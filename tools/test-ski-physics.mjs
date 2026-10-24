// The ski rules (docs/HELI_SKIING.md sections 4 and 5, card SKI-RULES): the
// skier's physics, the timed and judged scoring, and the guide's run. All of
// it runs without graphics; the same inputs give the same run.
import assert from 'node:assert/strict';
import {
  SKI, SKI_STEP, airDensity, terminalSpeed, createSkier, stepSkier, advanceSkier, skierView, skierFingerprint,
} from '../src/ski/ski-physics.js';
import {
  SCORE, RUN_KINDS, createTimedRun, stepTimedRun, timedMedal, medalTimes, judgedMedal,
  createJudgedRun, stepJudgedRun, finishJudgedRun,
} from '../src/ski/ski-score.js';
import {GUIDE, guideRun, ghostAt} from '../src/ski/ski-guide.js';
import {FEATURE_STATES} from '../src/feature-flags.js';

const DEG = Math.PI / 180;
let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const near = (actual, expected, tolerance, label) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} not within ${tolerance} of ${expected}`);
  checks++;
};
const within = (actual, expected, share, label) => near(actual, expected, Math.abs(expected) * share, label);

// A long even slope falling toward +z, starting `top` metres above the sea.
const slope = (angleDeg, top = 3000) => ({ground: (x, z) => top - Math.tan(angleDeg * DEG) * z});
const flat = (height = 100) => ({ground: () => height});
// Skiing a run: `seconds` of fixed steps with the controls (a value or a function of the skier).
function ski(skier, world, seconds, controls = {}) {
  const events = [];
  for (let i = 0, n = Math.round(seconds / SKI_STEP); i < n; i++) {
    events.push(...stepSkier(skier, typeof controls === 'function' ? controls(skier) : controls, world));
  }
  return events;
}
const settled = (world, controls, angle = 20) => {
  const skier = createSkier({world});
  ski(skier, world, 100, controls);
  return skier;
};

// The switch exists and is off.
ok(FEATURE_STATES['heli-skiing'] === 'dev', 'the heli-skiing switch is a dev switch');

// ---- Air ---------------------------------------------------------------------
near(airDensity(0), 1.225, 1e-9, 'sea-level air');
near(airDensity(8500), 1.225 / Math.E, 1e-9, 'air thins as e^(-h / 8,500 m)');

// ---- Speed: where drag balances gravity --------------------------------------
{
  const world = slope(20);
  for (const tucked of [false, true]) {
    const skier = settled(world, {tuck: tucked});
    const formula = terminalSpeed({angle: 20 * DEG, height: skier.y, tucked});
    within(skier.speed, formula, 0.02, `a ${tucked ? 'tucked' : 'standing'} fall-line run settles at the speed where drag balances gravity`);
    ok(skier.speed < 100 && skier.speed > 15, `${tucked ? 'tucked' : 'standing'}: ${(skier.speed * 3.6).toFixed(0)} km/h`);
  }
  const stand = settled(world, {}), tuck = settled(world, {tuck: true});
  ok(tuck.speed > stand.speed * 1.3, 'a tuck is faster');
  ok(terminalSpeed({angle: 20 * DEG, height: 4300, tucked: true}) > terminalSpeed({angle: 20 * DEG, height: 0, tucked: true}) * 1.25,
    'the formula says thinner air is faster');
  // The same fall from the summit and from the foot, over the same time.
  const high = createSkier({world: slope(20, 4300)}), low = createSkier({world: slope(20, 0)});
  ski(high, slope(20, 4300), 25, {tuck: true}); ski(low, slope(20, 0), 25, {tuck: true});
  ok(high.speed > low.speed, 'thinner air is faster in the run itself');
  // Wax.
  const right = createSkier({world, wax: 'right'}), wrong = createSkier({world, wax: 'wrong'}), none = createSkier({world});
  for (const skier of [right, wrong, none]) ski(skier, world, 8, {tuck: true});
  ok(right.speed > none.speed && none.speed > wrong.speed, 'right wax is faster than none, wrong wax slower');
}

// ---- Carving -----------------------------------------------------------------
{
  const world = flat();
  // A carve at 60 degrees turns at 8.5 m: a half turn ends a diameter (17 m) from where it began.
  const skier = createSkier({world, speed: 10});
  skier.edge = 60 * DEG;
  const start = {x: skier.x, z: skier.z};
  let steps = 0;
  while (Math.abs(skier.heading) < Math.PI && steps++ < 120 * 20) stepSkier(skier, {turn: 1}, world);
  near(Math.hypot(skier.x - start.x, skier.z - start.z), 17, 0.2, 'a 60 degree carve turns at 8.5 m');
  ok(skier.heading < 0, 'turning right lowers the heading');
  const left = createSkier({world, speed: 10});
  left.edge = -60 * DEG;
  ski(left, world, 1, {turn: -1});
  ok(left.heading > 0, 'turning left raises it');
  // Less edge, wider turn: 17 m x cos(edge).
  const easy = createSkier({world, speed: 10});
  easy.edge = 30 * DEG;
  const from = {x: easy.x, z: easy.z};
  steps = 0;
  while (Math.abs(easy.heading) < Math.PI && steps++ < 120 * 30) stepSkier(easy, {turn: 0.5}, world);
  near(Math.hypot(easy.x - from.x, easy.z - from.z), 2 * 17 * Math.cos(30 * DEG), 0.3, 'a 30 degree carve: radius 17 m x cos(30)');
  // A carve keeps its speed: the same time straight loses just as much.
  const carving = createSkier({world, speed: 12}), straight = createSkier({world, speed: 12});
  carving.edge = 60 * DEG;
  ski(carving, world, 2, {turn: 1}); ski(straight, world, 2, {});
  near(carving.speed, straight.speed, 1e-6, 'a carve keeps its speed');
  // Flat skis go straight; the turn eases in with the edge.
  const level = createSkier({world, speed: 12});
  ski(level, world, 2, {});
  near(level.heading, 0, 1e-9, 'flat skis run straight');
  // A tuck allows no hard turn.
  const tucked = createSkier({world, speed: 12});
  ski(tucked, world, 1, {turn: 1, tuck: true});
  near(tucked.edge, SKI.tuckEdge, 1e-9, 'a tuck holds the edge to 20 degrees');
  // The edge takes a moment to tip.
  const tipping = createSkier({world, speed: 12});
  ski(tipping, world, 0.1, {turn: 1});
  ok(tipping.edge > 0 && tipping.edge < 60 * DEG, 'the skis tip over a quarter of a second');
}

// ---- Skidding, skating and standing still -------------------------------------
{
  const world = flat();
  const skidding = createSkier({world, speed: 15}), coasting = createSkier({world, speed: 15});
  ski(skidding, world, 1, {skid: true}); ski(coasting, world, 1, {});
  near(coasting.speed - skidding.speed, (0.4 - SKI.snowFriction) * 9.81, 0.5, 'a skid slows by 0.4 g in place of the snow\'s 0.05 g');
  ok(skidding.speed < coasting.speed - 3, 'a skid slows');
  const stops = createSkier({world, speed: 15});
  ski(stops, world, 6, {skid: true});
  same(stops.speed, 0, 'a skid brings the skier to a stop');
  // Skating pushes off from a stop, up to 15 km/h and no further.
  const skater = createSkier({world});
  ski(skater, world, 6, {skate: true});
  near(skater.speed, SKI.skateBelow, 1e-9, 'skating reaches 15 km/h and stops pushing');
  const turned = createSkier({world});
  ski(turned, world, 1, {turn: 1});
  ok(turned.heading < -0.3, 'at a standstill the skis can be swung round');
  // Standing on a slope with the skis across it, nothing happens.
  const hill = slope(20);
  const across = createSkier({world: hill, heading: Math.PI / 2});
  ski(across, hill, 5, {});
  ok(across.speed < 1e-6, 'skis across the slope hold the skier');
  // Standing on the slope pointing down it, the skier slides; a skid stops that.
  const holds = createSkier({world: hill});
  ski(holds, hill, 8, {skid: true});
  ok(holds.speed < 1e-6, 'a skid holds the skier on a 20 degree slope');
}

// ---- Jumps, landings and tumbles ----------------------------------------------
// A lip: the approach falls at `a1` degrees to z = 0, then at `a2`. Flat air (50 km up) so the flight is a clean parabola.
const lip = (a1, a2, top = 3000) => {
  const t1 = Math.tan(a1 * DEG), t2 = Math.tan(a2 * DEG);
  return {ground: (x, z) => top - (z < 0 ? t1 * z : t2 * z)};
};
const startOf = (world, speed) => createSkier({world, z: -30, speed});
// How steeply the 20 m/s run off a lip meets its hill, degrees.
const land0 = world => ski(startOf(world, 20), world, 4).find(e => e.type === 'skiLand').angle;
{
  const world = lip(10, 35, 50000);
  const skier = startOf(world, 20);
  let events = [];
  while (skier.grounded) events.push(...stepSkier(skier, {}, world));
  ok(skier.z > -0.5 && skier.z < 1, 'the skier leaves the snow where it falls away, at the lip');
  const at = {x: skier.x, y: skier.y, z: skier.z, vx: skier.vx, vy: skier.vy, vz: skier.vz};
  for (let i = 0; i < 60; i++) stepSkier(skier, {}, world);
  const t = 60 * SKI_STEP;
  near(skier.z, at.z + at.vz * t, 0.02, 'in the air the skier follows the ballistic path (along)');
  near(skier.y, at.y + at.vy * t - 0.5 * 9.81 * t * t, 0.02, 'in the air the skier follows the ballistic path (height)');
}
{
  // A clean landing on a slope that falls away with the jump: slope within 20 degrees of the path.
  const world = lip(10, 35);
  // A hill may state its own window (aerials: 40); absent, it is the usual 20.
  const narrow = {...world, safePathAngle: land0(world) - 1};
  ok(!ski(startOf(narrow, 20), narrow, 4).find(e => e.type === 'skiLand').safe, 'a landing hill can narrow the window: the same landing tumbles');
  const wide = {...world, safePathAngle: 40};
  ok(ski(startOf(wide, 20), wide, 4).find(e => e.type === 'skiLand').safe, 'and widen it');
  const skier = startOf(world, 20);
  const events = ski(skier, world, 4);
  const land = events.find(e => e.type === 'skiLand');
  ok(land?.safe && land.angle <= 20, `a landing on the slope is safe (${land?.angle.toFixed(1)} degrees to the path)`);
  ok(!events.some(e => e.type === 'skiTumble') && skier.tumble === 0, 'and there is no tumble');
  ok(land.airTime > 0.5 && land.distance > 10 && land.height > 1, 'the landing reports the flight');
  ok(skier.speed > 15, 'a safe landing keeps its speed along the snow');
}
{
  // A drop of 6 m onto the flat: the path meets the snow at more than 20 degrees.
  const world = {ground: (x, z) => z < 0 ? 3000 - Math.tan(30 * DEG) * z : 2994};
  const skier = startOf(world, 15);
  const events = [];
  while (!events.some(e => e.type === 'skiLand') && skier.time < 10) events.push(...stepSkier(skier, {}, world));
  const land = events.find(e => e.type === 'skiLand');
  ok(land && !land.safe && land.angle > 20, `a crooked landing is not safe (${land?.angle.toFixed(1)} degrees)`);
  ok(events.filter(e => e.type === 'skiTumble').length === 1 && skier.tumble > 2.5, 'it tumbles');
  // Three seconds, no control, then free; the tumble is the only cost.
  ski(skier, world, 1, {turn: 1, tuck: true});
  ok(skier.edge === 0 && !skier.tucked, 'no control while tumbling');
  ski(skier, world, 2.01, {});
  same(skier.tumble, 0, 'the tumble lasts 3 seconds');
  ski(skier, world, 0.5, {skate: true});
  ok(skier.speed > 0, 'and the skier skis on');
}
{
  // Spins: a whole turn lands clean, half a turn lands backwards.
  const world = lip(10, 35);
  const spin = seconds => {
    const skier = startOf(world, 20);
    const events = ski(skier, world, 4, s => ({turn: !s.grounded && s.air.time < seconds ? 1 : 0}));
    return events.find(e => e.type === 'skiLand');
  };
  const whole = spin(1), half = spin(0.5), none = spin(0);
  ok(whole.safe && Math.abs(whole.spin - 360) < 5, `a whole spin lands clean (${whole.spin.toFixed(0)} degrees)`);
  ok(!half.safe && Math.abs(half.spin - 180) < 5, 'half a spin lands backwards and tumbles');
  ok(none.safe, 'no spin is a clean landing');
  const flipped = startOf(world, 20);
  const events = ski(flipped, world, 4, s => ({flip: !s.grounded && s.air.time < 1 ? 1 : 0}));
  const land = events.find(e => e.type === 'skiLand');
  ok(land.safe && Math.abs(land.flip - 360) < 5 && land.flipMax >= SCORE.wholeRotation, 'a whole flip lands clean');
  const barely = spin(0.95);
  ok(barely.safe, 'a spin finished within 30 degrees is clean');
  const short = spin(0.8);
  ok(!short.safe, 'a spin 72 degrees short is not');
}
{
  // The pop.
  const world = flat();
  const skier = createSkier({world, speed: 8});
  const first = ski(skier, world, 0.05, {pop: true});
  ok(first.some(e => e.type === 'skiPop') && !skier.grounded, 'Space pops off the snow');
  ok(first.filter(e => e.type === 'skiPop').length === 1, 'once for one press');
  const rest = ski(skier, world, 1, {pop: true});
  const land = rest.find(e => e.type === 'skiLand');
  ok(land?.safe && rest.filter(e => e.type === 'skiPop').length === 0, 'a held key pops once; the pop lands clean');
  near(land.height, 2 * 2 / (2 * 9.81), 0.05, 'a pop is 2 m/s: about 0.2 m up');
}

// ---- Events for the sounds -----------------------------------------------------
{
  const world = slope(15);
  const skier = createSkier({world, speed: 12});
  const events = [];
  events.push(...ski(skier, world, 1.5, {turn: 1}));
  ok(events.some(e => e.type === 'skiCarve' && e.on) && skierView(skier, world).carving, 'a hard carve is reported');
  events.push(...ski(skier, world, 1, {skid: true}));
  ok(events.some(e => e.type === 'skiSkid' && e.on) && skierView(skier, world).skidding, 'a skid is reported');
  events.push(...ski(skier, world, 4, {skid: false}));
  ok(events.some(e => e.type === 'skiSkid' && !e.on), 'and its end');
}

// ---- The same run at any frame rate ---------------------------------------------
{
  // Moguls with a lip in them, a different control each second.
  const world = {ground: (x, z) => 3000 - 0.4 * z + 0.6 * Math.sin(z / 5) * Math.cos(x / 4) - (z > 60 ? 3 * (z - 60) : 0)};
  const script = second => [{turn: 1}, {turn: -1, tuck: true}, {skid: true}, {turn: 1}, {pop: true}, {turn: -1}, {flip: 1}, {}][second % 8];
  const runAt = fps => {
    const skier = createSkier({world, x: 1, z: 0, speed: 6});
    const events = [];
    for (let second = 0; second < 12; second++) {
      for (let frame = 0; frame < fps; frame++) events.push(...advanceSkier(skier, script(second), world, 1 / fps));
    }
    return {fingerprint: skierFingerprint(skier), events: events.map(e => e.type).join(',')};
  };
  const a = runAt(30), b = runAt(60), c = runAt(144), d = runAt(30);
  same(b, a, '60 frames a second give the 30 frame run');
  same(c, a, '144 frames a second give it too');
  same(d, a, 'and the same run twice is the same');
  ok(a.events.includes('skiPop') && a.events.includes('skiLand'), 'the run leaves the ground and lands');
}

// ---- Timed runs ------------------------------------------------------------------
// Gates across a line down +z, 10 m apart; each pair of poles 4 m wide, the run going toward +z.
const gate = (z, x = 0, width = 4) => ({left: {x: x - width / 2, z}, right: {x: x + width / 2, z}, dir: {x: 0, z: 1}});
{
  const gates = [gate(10), gate(20, 3), gate(30), gate(40, -3)];
  const run = () => createTimedRun({start: gate(0, 0, 10), finish: gate(50, 0, 20), gates});
  // Skiing down at 10 m/s, `track(z)` the sideways position.
  const race = (track, speed = 10) => {
    const timed = run();
    const events = [];
    let from = {x: track(-1), z: -1};
    for (let z = -1 + speed * SKI_STEP; z < 55; z += speed * SKI_STEP) {
      const to = {x: track(z), z};
      events.push(...stepTimedRun(timed, from, to, SKI_STEP));
      from = to;
    }
    return {timed, events};
  };
  const clean = race(z => z < 15 ? 0 : z < 25 ? 3 : z < 35 ? 0 : -3);
  ok(clean.timed.finished && clean.timed.missed === 0 && clean.timed.passed === 4, 'a clean run passes all four gates');
  near(clean.events.find(e => e.type === 'skiFinish').time, 5.0, 0.02, 'the clock runs from the start line to the finish line');
  same(clean.events.filter(e => e.type === 'skiGate').map(e => e.passed), [true, true, true, true], 'each gate says it was passed');
  const missed = race(z => 0);
  same(missed.timed.missed, 2, 'straight down the middle misses the two gates that are off to the side');
  near(missed.events.find(e => e.type === 'skiFinish').time, 5.0 + 2 * SCORE.gateMiss, 0.02, 'a missed gate adds 5 s each');
  same(missed.events.filter(e => e.type === 'skiGate').map(e => e.passed), [true, false, true, false], 'it says which');
  // Going round a pole: the line crossed beyond the poles.
  const wide = race(z => z > 8 && z < 12 ? 6 : 0);
  ok(wide.timed.missed >= 1 && wide.events.find(e => e.type === 'skiGate' && e.index === 0).passed === false, 'passing outside a pole misses that gate');
  // Backwards through a gate does not count, nor does skiing before the start.
  const timed = run();
  stepTimedRun(timed, {x: 0, z: -1}, {x: 0, z: 1}, SKI_STEP);
  same(timed.started, true, 'crossing the start line starts the clock');
  stepTimedRun(timed, {x: 0, z: 11}, {x: 0, z: 9}, SKI_STEP);
  same(timed.passed, 0, 'a gate crossed backwards is not passed');
  const early = run();
  stepTimedRun(early, {x: 0, z: 9}, {x: 0, z: 11}, SKI_STEP);
  same([early.started, early.passed], [false, 0], 'nothing counts before the start line');
  // Skipped gates are missed when a later one is passed.
  const skipped = run();
  stepTimedRun(skipped, {x: 0, z: -1}, {x: 0, z: 1}, SKI_STEP);
  const skip = stepTimedRun(skipped, {x: 3, z: 19}, {x: 3, z: 21}, SKI_STEP);
  same([skipped.missed, skipped.passed, skip.map(e => e.passed)], [1, 1, [false, true]], 'a gate passed out of order misses the ones skipped');
  same(RUN_KINDS, {slalom: 'timed', gs: 'timed', moguls: 'judged', aerials: 'judged', powder: 'free'}, 'the five run kinds');
}

// ---- Medals --------------------------------------------------------------------------
{
  same(medalTimes(40), {gold: 40, silver: 40 * 1.08, bronze: 40 * 1.18}, 'medal times: the guide, +8%, +18%');
  same([40, 43.19, 47.19, 47.21, 0, NaN].map(time => timedMedal(time, 40)), [3, 2, 1, 0, 0, 0], 'gold at the guide\'s time, silver +8%, bronze +18%, none after');
  same([100, 80, 79.9, 65, 64.9, 50, 49.9, 0].map(judgedMedal), [3, 3, 2, 2, 1, 1, 0, 0], 'judged medals at 80, 65 and 50');
}

// ---- Judged runs ----------------------------------------------------------------------
// A skier view and a landing event, enough for the books.
const view = (edge, speed = 10, grounded = true, tumbling = false) => ({edge, speed, grounded, tumbling});
const landing = (extra = {}) => ({type: 'skiLand', safe: true, angle: 8, height: 3, distance: 12, spin: 360, flip: 0, spinMax: 360, flipMax: 0, airTime: 1, impact: 2, ...extra});
{
  // Moguls: 10 turns planned, 2 jumps, guide 30 s.
  const config = {turnsPlanned: 10, jumps: 2, guideTime: 30};
  const mogul = (turns, landings, seconds) => {
    const run = createJudgedRun('moguls', config);
    for (let i = 0; i < turns; i++) stepJudgedRun(run, view(i % 2 ? -40 : 40), [], 0.1);
    for (const event of landings) stepJudgedRun(run, view(0), [event], 0.1);
    run.clock = seconds;
    return finishJudgedRun(run);
  };
  const best = mogul(10, [landing(), landing({spinMax: 0, spin: 0, flipMax: 400, flip: 400})], 30);
  near(best.total, 100, 1e-9, 'moguls: every turn, two spins and the guide\'s time make 100');
  same(best.medal, 3, 'and a gold');
  const okay = mogul(8, [landing(), landing({spinMax: 0, spin: 0})], 36);
  near(okay.turns, 80, 1e-9, 'moguls: 8 turns of 10 is 80');
  near(okay.air, 75, 1e-9, 'moguls: a spin (100) and a plain clean jump (50) average 75');
  near(okay.speed, 100 * (1 - 6 / 15), 1e-9, 'moguls: 6 s over the guide is 60 on speed');
  near(okay.total, 0.6 * 80 + 0.2 * 75 + 0.2 * 60, 1e-9, 'moguls: turns 60%, air 20%, speed 20%');
  same(okay.medal, 2, 'which is a silver');
  const fell = mogul(10, [landing({safe: false}), landing({safe: false})], 45);
  near(fell.air, 0, 1e-9, 'moguls: a tumble is worth nothing');
  near(fell.speed, 0, 1e-9, 'moguls: one and a half times the guide is 0 on speed');
  // Turns: the same side twice is one turn; slow or airborne skiing is no turn.
  const run = createJudgedRun('moguls', config);
  stepJudgedRun(run, view(40), [], 0.1); stepJudgedRun(run, view(0), [], 0.1); stepJudgedRun(run, view(40), [], 0.1);
  stepJudgedRun(run, view(-40, 1), [], 0.1); stepJudgedRun(run, view(-40, 10, false), [], 0.1);
  same(run.turns, 1, 'turns count on a change of side at speed on the snow');
  stepJudgedRun(run, view(-40), [], 0.1);
  same(run.turns, 2, 'a change of side is a turn');
  assert.throws(() => createJudgedRun('slalom', config), /judged/); checks++;
}
{
  // Aerials: target 8 m high, 30 m long, one whole spin.
  const config = {height: 8, distance: 30, rotations: 1, axis: 'spin'};
  const aerial = event => {
    const run = createJudgedRun('aerials', config);
    stepJudgedRun(run, view(0), event ? [event] : [], 0.1);
    return finishJudgedRun(run);
  };
  const perfect = aerial(landing({height: 8, distance: 30, angle: 0, spin: 360}));
  near(perfect.total, 100, 1e-9, 'aerials: the targets, a whole spin and a soft landing make 100');
  const decent = aerial(landing({height: 4, distance: 15, angle: 10, spin: 360, flip: 45}));
  near(decent.air, 50, 1e-9, 'aerials: half the height and distance is 50 on air');
  near(decent.form, 50 + 25, 1e-9, 'aerials: the spin done is 50, 45 degrees off axis halves the steady 50');
  near(decent.landing, 100 * (1 - SCORE.softLanding * 0.5), 1e-9, 'aerials: a landing 10 degrees steep is softened');
  near(decent.total, 0.2 * 50 + 0.5 * 75 + 0.3 * 80, 1e-9, 'aerials: air 20%, form 50%, landing 30%');
  same(decent.medal, 2, 'a silver');
  const fell = aerial(landing({height: 8, distance: 30, safe: false, angle: 40}));
  near(fell.landing, 0, 1e-9, 'aerials: a tumble scores nothing on landing');
  same(aerial(null).total, 0, 'aerials: no jump, no score');
  const short = aerial(landing({height: 8, distance: 30, angle: 0, spin: 180}));
  near(short.form, 25 + 50, 1e-9, 'aerials: half the planned spin is half the 50');
}

// ---- The guide ------------------------------------------------------------------------
{
  const world = slope(20);
  const straight = Array.from({length: 11}, (_, i) => ({x: 0, z: i * 40}));
  const guide = guideRun({line: straight, world});
  near(guide.time, guide.bestTime / GUIDE.pace, 1e-9, 'the guide skis the best run at 92% pace');
  // The best run on a straight fall line, tucked, skated off, by hand.
  const skier = createSkier({world});
  let steps = 0;
  while (skier.z < 399 && steps++ < 120 * 120) stepSkier(skier, {tuck: true, skate: true}, world);
  within(guide.bestTime, steps * SKI_STEP, 0.02, 'the best run is the tucked run down the line');
  near(guide.maxSide, 0, 1e-6, 'a straight line is skied straight');
  const end = guide.ghost[guide.ghost.length - 1];
  near(end.t, guide.time, 1e-9, 'the ghost ends at the guide\'s time');
  near(end.z, 399, 1.5, 'at the end of the line');
  same(ghostAt(guide, 0).z, 0, 'the ghost starts at the top');
  same(ghostAt(guide, guide.time + 10).z, end.z, 'and waits at the bottom');
  const mid = ghostAt(guide, guide.time / 2);
  ok(mid.z > 100 && mid.z < 300 && Math.abs(mid.speed) > 5, 'and is between, in step with the clock');
  within(mid.speed, guide.ghost.find(point => point.t >= guide.time / 2).speed, 0.2, 'the guide\'s speed is 92% of the best');
  same(medalTimes(guide.time).gold, guide.time, 'the medal times come from the guide\'s time');
  same(guideRun({line: straight, world}), guide, 'the same line gives the same guide');
  // Bendy lines (a slalom's shape): the guide follows them, not the middle.
  const wave = (amplitude, wavelength) => Array.from({length: Math.round(600 / (wavelength / 10)) + 1},
    (_, i) => ({x: amplitude * Math.sin(i * 2 * Math.PI / 10), z: i * wavelength / 10}));
  for (const [amplitude, wavelength] of [[4, 50], [3, 36], [4, 60]]) {
    const bendy = guideRun({line: wave(amplitude, wavelength), world});
    ok(bendy.maxSide < 1, `the guide follows a ${amplitude} m x ${wavelength} m wave (${bendy.maxSide.toFixed(2)} m off at most)`);
    ok(bendy.bestTime > guide.bestTime, 'and the longer line takes longer');
  }
  const swing = guideRun({line: wave(4, 50), world}).ghost.map(point => point.x);
  ok(Math.max(...swing) > 3.5 && Math.min(...swing) < -3.5, 'its track swings the full width of the wave');
  assert.throws(() => guideRun({line: [{x: 0, z: 0}], world}), /two points/); checks++;
}

console.log(`PASS SKI-RULES: the ski physics, scoring and guide (${checks} checks)`);
