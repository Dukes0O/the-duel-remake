import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { Course } from '../src/course.js';
import { COURSE, DRIVE } from '../src/config.js';
import { CIRCUITS } from '../src/circuits/index.js';
import { sweepObstacle } from '../src/collision.js';
import { pavedShoulderWidthAt } from '../src/road-surface.js';
import { TRACK_SCRIPT, TrackScriptError, buildTrackScript, buildRacingLine, defineScriptedCourse } from '../src/track-script.js';
import { describeCircuit, drawCircuit } from './track-script.mjs';
import { driveCircuit, passingLateral } from './track-script-drive.mjs';

// P4-TRACK-SCRIPT. The pilot circuit exists only in this file and is never
// added to COURSE outside a test run.
const base = { theme: 'alpine', stage: 90, name: 'Pilot Circuit', closed: true, laps: 2, airborne: true, noTraffic: true,
  hasRival: true, hasRadar: false, speedLimitMph: 65, layoutVersion: 1,
  sections: [{ theme: 'alpine', name: 'Pilot Circuit', share: 1 }] };
const chicane = [['turn', 'R', 30, 50, { name: 'Chicane 1' }], ['turn', 'L', 30, 50, { name: 'Chicane 2' }]];
const PILOT = Object.freeze({ ...base, id: 'pilot-circuit', script: [
  ['straight', 500, { name: 'Start Straight', walls: 'both', width: 16, climb: 4 }],
  ['turn', 'L', 90, 60, { name: 'Bend One', bank: 5 }],
  ['straight', 150, { name: 'Rise', crest: 1.5, walls: 'none' }], ...chicane, ['straight', 150],
  ['turn', 'L', 90, 30, { name: 'Hook' }],
  ['straight', 500, { name: 'Back Straight', climb: -4, width: 12, walls: 'both' }],
  ['turn', 'L', 90, 60, { name: 'Bend Three' }],
  ['straight', 150], ...chicane, ['straight', 150],
  ['turn', 'L', 90, 30, { name: 'Last Corner' }],
] });
const ROUND = { ...base, id: 'round', script: [['straight', 600], ['turn', 'L', 90, 80], ['straight', 300], ['turn', 'L', 90, 80],
  ['straight', 540], ['turn', 'L', 90, 80], ['straight', 330], ['turn', 'L', 90, 80]] };
// Panorama Ridge as drafted in docs/CIRCUITS.md 5.1 (shape only, not added to the game).
const PANORAMA_DRAFT = { ...base, id: 'panorama-draft', name: 'Panorama Ridge (draft)', script: [
  ['straight', 520, { name: 'Pit Straight', width: 15 }], ['turn', 'L', 90, 28, { name: 'Hell Gate' }],
  ['straight', 880, { climb: 55, name: 'Mountain Straight', walls: 'both' }], ['turn', 'R', 40, 110, { climb: 6, name: 'Griffin Bend' }],
  ['straight', 140, { climb: 10 }], ['turn', 'L', 110, 20, { climb: 14, name: 'The Cutting', width: 11 }],
  ['straight', 200, { climb: 16 }], ['turn', 'R', 30, 150, { climb: 6, name: 'Reid Rise' }],
  ['straight', 220, { climb: 8 }], ['turn', 'L', 45, 160, { crest: 2.5, climb: 4, name: 'Summit Park' }],
  ['straight', 160, { name: 'Ridge Top' }], ['turn', 'R', 25, 90, { crest: 3, climb: -12, name: 'Skyline' }],
  ['turn', 'L', 35, 60, { climb: -10, name: 'The Esses 1' }], ['turn', 'R', 35, 60, { climb: -10, name: 'The Esses 2' }],
  ['turn', 'L', 30, 70, { climb: -8, name: 'The Esses 3' }], ['straight', 150, { climb: -20, name: 'The Dipper' }],
  ['turn', 'L', 100, 22, { climb: -4, name: 'Forrest Elbow' }], ['straight', 1150, { climb: -55, name: 'Conrod Straight', width: 16 }],
  ['turn', 'R', 25, 200, { name: 'The Chase' }], ['straight', 60], ['turn', 'L', 15, 220, { name: 'Chase Exit', width: 15 }],
  ['straight', 260], ['turn', 'L', 90, 25, { name: 'Murray Corner' }],
] };

const near = (a, b, tolerance, message) => assert.ok(Math.abs(a - b) <= tolerance, `${message ?? ''} ${a} differs from ${b}`);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

test('a closed circuit ends where it began, heading and all', () => {
  const road = buildTrackScript(PILOT), first = road.samples[0], last = road.samples.at(-1);
  near(last.x, first.x, 1e-6); near(last.z, first.z, 1e-6); near(last.y, first.y, 1e-9);
  near(Math.abs(last.heading - first.heading), Math.PI * 2, 1e-9, 'one full turn of heading over a lap');
  near(road.report.turnSumDeg, 360, 1e-9);
  assert.equal(road.closed, true);
  const course = new Course(PILOT, 1989);
  assert.equal(course.length, road.length);
  assert.equal(course.raceLength, road.length * 2);
  // Following the road all the way round never jumps.
  for (let s = 0; s < course.length; s += .5) {
    const a = course.worldAt(s), b = course.worldAt(s + .5);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < .52 && Math.abs(a.y - b.y) < .1, `smooth at ${s}`);
  }
});

test('turns enter and leave tangent, eased by at least 25 m, with the radius they ask for', () => {
  const road = buildTrackScript(PILOT);
  for (const piece of road.pieces.filter(p => p.kind === 'turn')) {
    assert.ok(piece.arcStart - piece.s0 >= TRACK_SCRIPT.minEase - 1e-9, `${piece.name}: ease in is at least 25 m`);
    assert.ok(piece.s1 - piece.arcEnd >= TRACK_SCRIPT.minEase - 1e-9, `${piece.name}: ease out is at least 25 m`);
    const curve = s => {
      const p = ((s % road.length) + road.length) % road.length, i = Math.min(road.count - 1, Math.floor(p / road.step)), u = p / road.step - i;
      return road.samples[i].curvature * (1 - u) + road.samples[i + 1].curvature * u;
    };
    near(curve(piece.s0), 0, 1e-3, `${piece.name}: starts straight`);
    near(curve(piece.s1), 0, 1e-3, `${piece.name}: ends straight`);
    near(Math.abs(curve((piece.arcStart + piece.arcEnd) / 2)), 1 / piece.radius, 1 / piece.radius * .02, `${piece.name}: holds its radius`);
    const halfWay = Math.abs(curve(piece.s0 + (piece.arcStart - piece.s0) / 2));
    near(halfWay, .5 / piece.radius, .5 / piece.radius * .06, `${piece.name}: curvature grows evenly (a clothoid)`);
  }
  // Heading never snaps between neighbouring samples; curvature has no jump.
  let biggest = 0;
  for (let i = 1; i < road.samples.length; i++) {
    const turn = angleDiff(road.samples[i].heading, road.samples[i - 1].heading);
    const expected = (road.samples[i].curvature + road.samples[i - 1].curvature) / 2 * road.step;
    biggest = Math.max(biggest, Math.abs(turn - expected));
    assert.ok(Math.abs(road.samples[i].curvature - road.samples[i - 1].curvature) < road.step * 2 / (25 * 8) + 1e-6, 'no curvature jump');
  }
  assert.ok(biggest < 2e-3, `heading follows curvature (${biggest})`);
  near(road.report.tightestRadius.radius, 30, 0);
});

test('closing a loop changes straights only, at most 15%, and says so', () => {
  const road = buildTrackScript(ROUND);
  assert.ok(road.report.closureGap > 1, 'the turns alone do not close a loop with unequal legs');
  for (const change of road.report.straightChanges) {
    assert.ok(Math.abs(change.percent) <= 15 + 1e-9, 'within 15%');
    near(change.after, change.before * (1 + change.percent / 100), 1e-6);
  }
  const lengths = ROUND.script.filter(piece => piece[0] === 'straight').map(piece => piece[1]);
  const after = road.pieces.filter(piece => piece.kind === 'straight').map(piece => piece.s1 - piece.s0);
  assert.notDeepEqual(after.map(v => +v.toFixed(3)), lengths);
  // Turns stay exact: each keeps its radius and (within the shared out degrees) its angle.
  for (const piece of road.pieces.filter(p => p.kind === 'turn')) near(piece.degrees, 90, .01);
  // The pilot circuit is built so its legs match: nothing needs changing.
  assert.ok(buildTrackScript(PILOT).report.straightChanges.every(change => Math.abs(change.percent) < 1e-6));
});

test('a few leftover degrees are shared across the turns; more is an error', () => {
  const close = { ...ROUND, id: 'round-off', script: ROUND.script.map((piece, i) => (i === 1 ? ['turn', 'L', 91.5, 80] : piece)) };
  const road = buildTrackScript(close);
  near(road.report.turnAdjustDeg, -1.5, 1e-9);
  near(road.samples.at(-1).heading - road.samples[0].heading, Math.PI * 2, 1e-9);
  const far = { ...ROUND, id: 'round-far', script: ROUND.script.map((piece, i) => (i === 1 ? ['turn', 'L', 95, 80] : piece)) };
  assert.throws(() => buildTrackScript(far), error => error instanceof TrackScriptError && /add up to 365\.0 degrees/.test(error.message) && /360/.test(error.message));
  // A clockwise circuit adds up to -360.
  const clockwise = { ...ROUND, id: 'round-cw', script: ROUND.script.map(piece => (piece[0] === 'turn' ? ['turn', 'R', ...piece.slice(2)] : piece)) };
  near(buildTrackScript(clockwise).report.turnSumDeg, -360, 1e-9);
});

test('clear errors for a script that cannot be built', () => {
  const build = script => buildTrackScript({ ...base, id: 'bad', script });
  assert.throws(() => build([]), /no pieces/);
  assert.throws(() => build([['straight', 100, { colour: 'red' }]]), /unknown option "colour"/);
  assert.throws(() => build([['loop', 100]]), /must start with 'straight' or 'turn'/);
  assert.throws(() => build([['turn', 'L', 10, 50]]), /too short for a 25 m eased join/);
  assert.throws(() => build([['straight', 100, { walls: 'all' }]]), /walls must be one of/);
  assert.throws(() => build([['straight', 100], ['turn', 'L', 180, 50], ['straight', 100]]), /add up to 180\.0 degrees/);
  // Three quarters of a lap with every leg too far off: closing would need more than 15%.
  const lopsided = [['straight', 100], ['turn', 'L', 90, 50], ['straight', 1000], ['turn', 'L', 90, 50], ['straight', 100], ['turn', 'L', 90, 50], ['straight', 100], ['turn', 'L', 90, 50]];
  assert.throws(() => build(lopsided), /cannot close.*not enough.*Without the limit/s);
});

test('width is a property of the road at every point, and existing courses keep 7 m', () => {
  const road = buildTrackScript(PILOT), course = new Course(PILOT, 1989);
  const startPiece = road.pieces[0], backStraight = road.pieces.find(p => p.name === 'Back Straight');
  near(course.roadHalfWidthAt(startPiece.s0 + 250), 8, 1e-9);
  near(course.roadHalfWidthAt((backStraight.s0 + backStraight.s1) / 2), 6, 1e-9);
  // The change arrives smoothly, not as a step.
  let previous = course.roadHalfWidthAt(0), biggest = 0;
  for (let s = 0; s < course.length; s += .25) { const w = course.roadHalfWidthAt(s); biggest = Math.max(biggest, Math.abs(w - previous)); previous = w; }
  assert.ok(biggest < .06, `width changes gently (${biggest} m per quarter metre)`);
  assert.equal(course.halfWidthAt(100), course.roadHalfWidthAt(100));
  // Driving, contacts, lap checks and the renderer read the same value.
  for (const s of [10, 700, 1500, 2300]) {
    near(course.surfaceAt(s, 0).roadHalfWidth, road.halfWidthAt(s), 1e-12);
    assert.equal(course.surfaceAt(s, road.halfWidthAt(s) - .1).mainRoad, true);
    assert.equal(course.surfaceAt(s, road.halfWidthAt(s) + .1).mainRoad, false);
    near(pavedShoulderWidthAt(course, s), road.halfWidthAt(s), 1e-12);
  }
  // A default road is 14 m wide, exactly the old constant.
  near(new Course(ROUND, 1989).roadHalfWidthAt(333), DRIVE.roadHalfWidth, 1e-12);
  for (const def of COURSE.filter(def => !def.script && !def.arena && !def.offroad)) {
    const old = new Course(def, 1989);
    assert.equal(old.script, null);
    assert.equal(old.step, 8);
    near(old.roadHalfWidthAt(0), 7, 0, `${def.id}: still 7 m`);
  }
  assert.equal(CIRCUITS.length, COURSE.filter(def => def.script).length, 'only registered circuits carry a script');
});

test('walls are finite solid barriers one metre outside the edge', () => {
  const course = new Course(PILOT, 1989), road = course.script;
  assert.ok(course.features.walls.length > 100);
  assert.ok(course.features.obstacles.includes(course.features.walls[0]));
  assert.ok(!course.features.barriers.length, 'rails are not drawn for walls');
  for (const wall of course.features.walls) {
    const n = course.nearest(wall.x, wall.z);
    near(Math.abs(n.lateral), road.halfWidthAt(n.s) + TRACK_SCRIPT.wallSetback + TRACK_SCRIPT.wallThickness / 2, .2, `${wall.id}: set back from the edge`);
    assert.ok(Number.isFinite(wall.height) && wall.maxY - wall.minY < 3, 'finite height');
    assert.ok(wall.barrier === true && wall.shape === 'box');
  }
  // Walls are on the chosen pieces only: both sides on the Start Straight, none on the Rise.
  const rise = road.pieces.find(p => p.name === 'Rise');
  assert.equal(rise.walls, 'none');
  assert.ok(!course.features.walls.some(w => w.s > rise.s0 + 5 && w.s < rise.s1 - 5), 'no wall along the Rise');
  assert.ok(course.features.walls.some(w => w.off > 0) && course.features.walls.some(w => w.off < 0), 'both sides on the Start Straight');
  // A grounded car hits one; a car clearing its top does not.
  const wall = course.features.walls.find(w => w.off > 0 && w.s > 200 && w.s < 300), edge = course.groundAt(wall.s, 0);
  const from = course.worldAt(wall.s, 0), to = course.worldAt(wall.s, wall.off + 1);
  const run = height => sweepObstacle({ x: from.x, y: edge.y + height, z: from.z }, { x: to.x, y: edge.y + height, z: to.z }, wall, wall.heading, { height: 1.2 });
  assert.ok(run(0), 'grounded: hit');
  assert.equal(run(4), null, 'airborne above the top: clear');
  // Courses without a script gain no walls.
  assert.equal(new Course(COURSE[0], 1989).features.walls, undefined);
});

test('elevation: climbs, crests, banking and a closed height loop', () => {
  const course = new Course(PILOT, 1989), road = course.script;
  near(road.heightAt(0), road.heightAt(road.length), 1e-9);
  const rise = road.pieces.find(p => p.name === 'Rise'), mid = (rise.s0 + rise.s1) / 2;
  const withoutCrest = new Course({ ...PILOT, id: 'pilot-flat', script: PILOT.script.map(piece => (piece[2]?.crest ? [piece[0], piece[1], { ...piece[2], crest: 0 }] : piece)) }, 1989);
  near(course.at(mid).y - withoutCrest.at(mid).y, 1.5, .05, 'the crest is a 1.5 m bump in the middle');
  near(course.at(rise.s0 + 2).y, withoutCrest.at(rise.s0 + 2).y, 1e-6, 'and nothing at the ends');
  // Leftover climb is spread over the straights and reported.
  const uphill = new Course({ ...ROUND, id: 'uphill', script: ROUND.script.map((piece, i) => (i === 0 ? ['straight', 600, { climb: 6 }] : piece)) }, 1989);
  near(uphill.script.report.elevationLeftover, 6, 1e-9);
  near(uphill.script.heightAt(0), uphill.script.heightAt(uphill.length), 1e-9);
  assert.ok(uphill.script.pieces.filter(p => p.kind === 'straight').some(p => p.climb < 0), 'other straights give the height back');
  // A left turn banked in leans in: the inside (left) edge is lower.
  const bend = road.pieces.find(p => p.name === 'Bend One'), at = (bend.arcStart + bend.arcEnd) / 2;
  const lift = course.worldAt(at, 6).y - course.worldAt(at, -6).y;
  assert.ok(lift < -1, `inside edge lower by ${lift}`);
  near(course.worldAt(at, 0).y, course.at(at).y, 1e-12);
  assert.equal(course.worldAt(rise.s0 + 20, 6).y, course.at(rise.s0 + 20).y);
  // A crest at speed throws the car in the air through the existing crest flight.
  const flight = driveCircuit({ ...PILOT, id: 'pilot-air' }, { cpuDifficulty: 'easy', opponentCount: 0 });
  assert.ok(flight.completed && flight.crashes === 0);
});

test('braking boards, kerbs and runoff', () => {
  const course = new Course(PILOT, 1989), road = course.script;
  const hook = road.pieces.find(p => p.name === 'Hook'), bend = road.pieces.find(p => p.name === 'Bend One');
  assert.deepEqual(road.boards.filter(b => b.piece === hook.index).map(b => b.distance).sort((a, b) => b - a), [150, 100, 50].filter(d => d <= 150));
  for (const board of road.boards) {
    assert.equal(road.pieceAt(board.s).kind, 'straight', 'boards stand on straight road');
    assert.equal(board.side, -road.pieces[board.piece].dir, 'on the outside of the corner');
    assert.ok(road.pieces[board.piece].radius < 40);
    const start = road.pieces[board.piece].s0, distance = ((start - board.s) % road.length + road.length) % road.length;
    near(distance, board.distance, 1e-6);
  }
  assert.ok(!road.boards.some(b => b.piece === bend.index), 'no boards before a 60 m radius turn');
  assert.ok(road.kerbs.some(k => k.piece === hook.index && k.side === hook.dir && k.kind === 'apex'), 'kerb on the inside of the turn');
  assert.ok(road.kerbs.every(k => road.pieces[k.piece].kind === 'turn'));
  // Walls leave no runoff; open road has 12 m.
  near(road.runoffAt(100, 1), 0, 0); near(road.runoffAt(road.pieces.find(p => p.name === 'Rise').s0 + 20, 1), TRACK_SCRIPT.runoff, 0);
  // A switch of boards: false turns them off, true turns them on.
  const forced = buildTrackScript({ ...PILOT, id: 'pilot-boards', script: PILOT.script.map(piece => (piece[4]?.name === 'Hook' ? [...piece.slice(0, 4), { ...piece[4], boards: false }] : piece)) });
  assert.ok(!forced.boards.some(b => b.piece === hook.index));
});

test('racing line: outside, apex, outside, inside the road minus 1.5 m; speeds follow curvature and braking', () => {
  const course = new Course(PILOT, 1989), road = course.script, line = course.racingLine;
  for (let i = 0; i <= line.count; i++) {
    assert.ok(Math.abs(line.offset[i]) <= road.halfWidthAt(i * line.step) - TRACK_SCRIPT.lineMargin + 1e-9, 'inside the margin');
    assert.ok(line.speed[i] <= line.cornerSpeed[i] + 1e-9 && line.speed[i] > 0);
  }
  for (const piece of road.pieces.filter(p => p.name === 'Hook' || p.name === 'Bend One')) {
    const apex = line.offsetAt(piece.s0 + (piece.s1 - piece.s0) * TRACK_SCRIPT.apexShare);
    assert.ok(apex * piece.dir > 4, `${piece.name}: the apex is on the inside (${apex})`);
    assert.ok(line.offsetAt(piece.s0 - 1) * piece.dir < -1, `${piece.name}: arrives from the outside`);
    assert.ok(line.offsetAt(piece.s1 + 1) * piece.dir < -1, `${piece.name}: leaves to the outside`);
  }
  const hook = road.pieces.find(p => p.name === 'Hook');
  assert.ok(line.speedAt(hook.s0 + (hook.s1 - hook.s0) * .55) + 3 < line.speedAt(hook.s0 - 60), 'slow at the apex, faster before it');
  // Braking is never harder than the profile's limit and acceleration never faster.
  for (let i = 1; i <= line.count; i++) {
    const a = line.speed[i - 1], b = line.speed[i];
    assert.ok(Math.abs(b * b - a * a) / 2 <= Math.max(line.dynamics.brake, line.dynamics.accel) * 3 + 1e-6, 'speed changes no faster than the car can');
  }
  // Reference dynamics can be replaced for another car.
  // A grippier, quicker-turning car holds more speed (yaw rate now limits a corner as well as grip).
  const quick = buildRacingLine(road, { ...line.dynamics, lateralAccel: 40, yawRate: 2.5 });
  assert.ok(quick.speedAt(hook.s0 + 60) > line.speedAt(hook.s0 + 60));
});

test('reverse builds the same road backwards', () => {
  const forward = buildTrackScript(PILOT), back = buildTrackScript({ ...PILOT, id: 'pilot-reverse', reverse: true });
  near(back.length, forward.length, 1e-6);
  assert.equal(back.report.reverse, true);
  // Same shape, driven the other way: pieces in reverse order with turns flipped.
  const turns = road => road.pieces.filter(p => p.kind === 'turn').map(p => `${p.name}:${p.dir}:${p.radius}`);
  assert.deepEqual(turns(back), turns(forward).reverse().map(text => { const [name, dir, radius] = text.split(':'); return `${name}:${-dir}:${radius}`; }));
  assert.equal(back.pieces[0].name, 'Last Corner');
  // Height is the mirror image: climbs negated.
  for (const share of [0, .05, .2, .4, .6, .8, .95]) near(back.heightAt(back.length * share), forward.heightAt(forward.length * (1 - share)), 1e-3, `height at ${share}`);
  // The shape is rigid: distances between points match.
  const point = (road, s) => road.samples[Math.round(s / road.step)];
  for (const [p, q] of [[.05, .4], [.2, .85], [.5, .95]]) {
    const a = forward.length * p, b = forward.length * q;
    const f1 = point(forward, a), f2 = point(forward, b), r1 = point(back, forward.length - a), r2 = point(back, forward.length - b);
    near(Math.hypot(f1.x - f2.x, f1.z - f2.z), Math.hypot(r1.x - r2.x, r1.z - r2.z), .05, 'same shape');
  }
  // Boards are rebuilt for the new direction: the hairpin-type corners now carry boards before them.
  for (const board of back.boards) assert.equal(board.side, -back.pieces[board.piece].dir);
  assert.ok(back.boards.length > 0 && back.kerbs.length === forward.kerbs.length);
  // Walls swap sides with the direction.
  const leftOnly = { ...base, id: 'left-walls', script: ROUND.script.map((p, i) => (i === 0 ? ['straight', 600, { walls: 'left' }] : p)) };
  assert.ok(buildTrackScript(leftOnly).walls.every(w => w.side === 1));
  assert.ok(buildTrackScript({ ...leftOnly, reverse: true }).walls.every(w => w.side === -1));
});

test('the start line can sit part way along a straight', () => {
  const moved = buildTrackScript({ ...PILOT, id: 'pilot-moved', scriptStart: 80 }), plain = buildTrackScript(PILOT);
  near(moved.length, plain.length, 1e-9);
  near(moved.heightAt(0), plain.heightAt(80), 1e-6);
  near(moved.halfWidthAt(0), plain.halfWidthAt(80), 1e-9);
  assert.equal(moved.pieceAt(0).name, 'Start Straight');
  assert.ok(moved.pieces[0].s0 < 0 && moved.pieces[0].s1 > 0, 'the first piece straddles the line');
  near(moved.samples.at(-1).heading - moved.samples[0].heading, Math.PI * 2, 1e-9);
  near(moved.samples.at(-1).x, moved.samples[0].x, 1e-6);
  const course = new Course({ ...PILOT, id: 'pilot-moved', scriptStart: 80 }, 1989);
  assert.ok(course.features.walls.some(w => w.s < 40) && course.features.walls.some(w => w.s > course.length - 40), 'walls run through the line');
});

test('point to point: an open road with one lap', () => {
  const def = { ...base, id: 'open-road', closed: false, laps: 3, script: [['straight', 400, { climb: 10 }], ['turn', 'L', 90, 60], ['straight', 300], ['turn', 'R', 45, 120, { climb: -3 }], ['straight', 500]] };
  const road = buildTrackScript(def), course = new Course(def, 1989);
  assert.equal(road.closed, false);
  assert.equal(course.closed, false);
  assert.equal(course.raceLength, course.length, 'one lap whatever the definition says');
  assert.equal(road.report.straightChanges.length, 0, 'nothing is stretched');
  near(road.heightAt(road.length), road.heightAt(0) + 7, 1e-9);
  assert.equal(course.phase(-20), 0); assert.equal(course.phase(course.length + 50), course.length);
  const end = course.worldAt(course.length), n = course.nearest(end.x, end.z);
  near(n.s, course.length, .05);
  const there = course.worldAt(450, 2), found = course.nearest(there.x, there.z);
  near(found.s, 450, .05); near(found.lateral, 2, 1e-6);
  assert.ok(Math.hypot(end.x, end.z) > 500, 'start and finish are different places');
  assert.ok(course.features.checkpoints.some(c => c.kind === 'finish' && c.s === course.length));
  assert.ok(course.racingLine.speedAt(0) > 0 && course.racingLine.speedAt(course.length) > 0);
});

test('the same script builds the same road every time, and the seed never moves it', () => {
  const a = new Course(PILOT, 1), b = new Course(JSON.parse(JSON.stringify(PILOT)), 987654);
  assert.equal(hash(a.samples), hash(b.samples));
  assert.equal(hash(a.features.walls), hash(b.features.walls));
  assert.equal(hash(Array.from(a.racingLine.speed)), hash(Array.from(b.racingLine.speed)));
  assert.equal(defineScriptedCourse(PILOT).lengthU, a.length);
  assert.ok(Object.isFrozen(defineScriptedCourse(PILOT)));
});

test('the road of every existing course is unchanged', () => {
  // Pin the road the released courses draw: this hash was taken before the
  // track script work and must not change (replays pin the physics on top).
  const text = COURSE.filter(def => !def.script).map(def => {
    const course = new Course(def, 1989);
    return `${def.id}:${course.length}:${course.samples.length}:${hash(course.samples)}:${course.features.obstacles.length}`;
  });
  assert.ok(text.length >= 15);
  assert.equal(hash(text), EXISTING_COURSES_HASH);
});

test('the test driver completes laps on the pilot circuit without a crash or getting stuck', () => {
  const run = driveCircuit(PILOT, { cpuDifficulty: 'medium' });
  assert.ok(run.finite && run.completed && run.laps === 2, JSON.stringify(run));
  assert.equal(run.crashes, 0); assert.equal(run.boundaryResets, 0); assert.equal(run.checkpointResets, 0);
  assert.ok(run.maxStuckSeconds < 1);
  assert.ok(run.lapTimes.every(t => t > 45 && t < 80), run.lapTimes.join(', '));
  // Reverse too.
  const back = driveCircuit({ ...PILOT, id: 'pilot-circuit-reverse', reverse: true }, { cpuDifficulty: 'medium' });
  assert.ok(back.completed && back.crashes === 0 && back.maxStuckSeconds < 1, JSON.stringify(back));
});

test('Panorama Ridge as drafted does not close; the tool says by how much', () => {
  assert.throws(() => buildTrackScript(PANORAMA_DRAFT), error => error instanceof TrackScriptError
    && /ends 275\.\d m from where it started/.test(error.message) && /piece 1 \+35%/.test(error.message));
  // The same draft with the turn sum corrected is still a loop the maker can inspect.
  const sums = PANORAMA_DRAFT.script.filter(p => p[0] === 'turn').reduce((t, p) => t + (p[1] === 'L' ? 1 : -1) * p[2], 0);
  assert.equal(sums, 360);
});

test('the picture and the report tool', () => {
  const text = describeCircuit(PILOT);
  assert.match(text, /Pilot Circuit/); assert.match(text, /tightest radius\s+30 m/); assert.match(text, /highest grade/);
  const png = drawCircuit(PILOT, { width: 900, height: 650 }).png();
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.readUInt32BE(16), 900); assert.equal(png.readUInt32BE(20), 650);
});

const EXISTING_COURSES_HASH = '4464c3ec8a537cdb0420f8f69a2a1a47111e0bd9bc1f5e1333fa3130368dd460';

test('test-driver passing side follows the player rather than flipping at the road centre', () => {
  // Long Left's rival crossed zero while the player was already to its right.
  // Choosing by the rival's road side changed the target by 6.8 m under braking.
  assert.ok(Math.abs(passingLateral(2.25, .01, 7.5) - passingLateral(2.25, -.01, 7.5)) < .021);
  assert.ok(passingLateral(2.25, .01, 7.5) > .01);
  assert.ok(passingLateral(2.25, -.01, 7.5) > -.01);
  assert.ok(Math.abs(passingLateral(-2.25, .01, 7.5) - passingLateral(-2.25, -.01, 7.5)) < .021);
  assert.ok(passingLateral(-2.25, .01, 7.5) < .01);
  assert.ok(passingLateral(-2.25, -.01, 7.5) < -.01);
  assert.equal(passingLateral(6, 5, 7.5), 5.7, 'right road margin stays 1.8 m');
  assert.equal(passingLateral(-6, -5, 7.5), -5.7, 'left road margin stays 1.8 m');
});
