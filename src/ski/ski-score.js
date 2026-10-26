// Scoring the runs (docs/HELI_SKIING.md section 5). Pure: it reads the
// skier's position and the events of each fixed step and keeps the books. No
// graphics, no clock, no randomness.
//
// Timed runs (slalom, giant slalom): a clock from the start line to the
// finish line and a gate list; a gate missed adds 5 s. Judged runs (moguls,
// aerials): points out of 100 from the parts below. Medals: timed runs from
// the guide's time, judged runs from fixed scores.
//
// Rules the packet leaves to the builder (SKI-RULES, 24 October 2026):
// - A gate is a pair of poles, {left, right}, each {x, z}, and a direction
//   (the way the run goes through it). It is passed when the skier's path
//   crosses the line between the poles going that way. It is missed when the
//   path crosses the same line beyond a pole, or when a later gate is passed
//   first.
// - Turns (moguls): a turn is a change of side, the edge held past 20 degrees
//   on the other side from the last turn, at 3 m/s or more on the snow. The
//   score is the turns made over the turns planned for the zone.
// - Air (moguls): each jump is worth 50 for a clean landing and 50 more for
//   a whole spin or flip (330 degrees or more); a tumble is worth nothing.
// - Speed (moguls): 100 at the guide's time, falling in a line to 0 at one
//   and a half times that.
// - Aerials: air is the jump's height and distance against the zone's
//   targets; form is 50 for the planned rotation done and 50 for steadiness
//   (none of it on the other axis); landing is 100 for a clean one softened
//   by how steeply it met the snow, and 0 for a tumble.
export const SCORE = Object.freeze({
  gateMiss: 5,
  silverSlower: 0.08,
  bronzeSlower: 0.18,
  judgedMedals: Object.freeze({gold: 80, silver: 65, bronze: 50}),
  moguls: Object.freeze({turns: 0.6, air: 0.2, speed: 0.2}),
  aerials: Object.freeze({air: 0.2, form: 0.5, landing: 0.3}),
  turnEdge: 20,
  turnSpeed: 3,
  wholeRotation: 330,
  speedSlack: 1.5,
  steadyMargin: 90,
  softLanding: 0.4,
});

export const RUN_KINDS = Object.freeze({
  slalom: 'timed', gs: 'timed', moguls: 'judged', aerials: 'judged', powder: 'free',
});

const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// Did the step from `a` to `b` cross the line between the poles, and where?
// Returns null, or {along} (0 at the left pole, 1 at the right) and whether
// it went the gate's way.
function crossing(gate, a, b) {
  const lx = gate.left.x, lz = gate.left.z;
  const ex = gate.right.x - lx, ez = gate.right.z - lz;
  const side = p => ex * (p.z - lz) - ez * (p.x - lx);
  const sa = side(a), sb = side(b);
  if (sa === sb || (sa > 0) === (sb > 0) && sa !== 0 && sb !== 0) return null;
  const k = sa / (sa - sb);
  const px = a.x + (b.x - a.x) * k, pz = a.z + (b.z - a.z) * k;
  const along = (ex * (px - lx) + ez * (pz - lz)) / (ex * ex + ez * ez);
  const forward = (b.x - a.x) * gate.dir.x + (b.z - a.z) * gate.dir.z > 0;
  return {along, forward};
}

// A timed run: createTimedRun({start, finish, gates}), then stepTimedRun with
// the skier's position before and after each fixed step. start and finish
// are gates too (their poles are the line's ends).
export function createTimedRun({start, finish, gates}) {
  return {start, finish, gates, next: 0, started: false, finished: false, clock: 0, missed: 0, passed: 0, passes: []};
}

export function stepTimedRun(run, from, to, dt) {
  const events = [];
  if (run.finished) return events;
  if (!run.started) {
    const across = crossing(run.start, from, to);
    if (across?.forward && across.along >= 0 && across.along <= 1) { run.started = true; events.push({type: 'skiStart'}); }
    return events;
  }
  run.clock += dt;
  for (let i = run.next; i < run.gates.length; i++) {
    const across = crossing(run.gates[i], from, to);
    if (!across?.forward) continue;
    if (across.along >= 0 && across.along <= 1) {
      // Gates skipped on the way are missed.
      for (let j = run.next; j < i; j++) miss(run, j, events);
      run.passed++; run.passes[i] = true;
      events.push({type: 'skiGate', index: i, passed: true});
      run.next = i + 1;
      break;
    }
    if (i === run.next) { miss(run, i, events); run.next = i + 1; break; }
  }
  const end = crossing(run.finish, from, to);
  if (end?.forward && end.along >= 0 && end.along <= 1) {
    for (let j = run.next; j < run.gates.length; j++) miss(run, j, events);
    run.next = run.gates.length;
    run.finished = true;
    events.push({type: 'skiFinish', ...timedResult(run)});
  }
  return events;
}

function miss(run, index, events) {
  run.missed++; run.passes[index] = false;
  events.push({type: 'skiGate', index, passed: false});
}

export function timedResult(run) {
  return {raw: run.clock, missed: run.missed, time: run.clock + run.missed * SCORE.gateMiss};
}

// Medal 0..3 (none, bronze, silver, gold) for a timed run against the guide's time.
export function timedMedal(time, guideTime) {
  if (!(time > 0) || !(guideTime > 0)) return 0;
  if (time <= guideTime) return 3;
  if (time <= guideTime * (1 + SCORE.silverSlower)) return 2;
  if (time <= guideTime * (1 + SCORE.bronzeSlower)) return 1;
  return 0;
}

export function medalTimes(guideTime) {
  return {gold: guideTime, silver: guideTime * (1 + SCORE.silverSlower), bronze: guideTime * (1 + SCORE.bronzeSlower)};
}

// Medal 0..3 for a judged score out of 100.
export function judgedMedal(points) {
  return pointsMedal(points, SCORE.judgedMedals);
}

function pointsMedal(points, m) {
  return points >= m.gold ? 3 : points >= m.silver ? 2 : points >= m.bronze ? 1 : 0;
}

// ---- Judged runs -----------------------------------------------------------

// config: {turnsPlanned, jumps, guideTime} for moguls; {height, distance,
// rotations (whole turns planned), axis ('spin' or 'flip')} for aerials.
export function createJudgedRun(kind, config) {
  if (kind !== 'moguls' && kind !== 'aerials') throw new Error(`Not a judged run: ${kind}`);
  return {kind, config, clock: 0, turns: 0, side: 0, landings: [], done: false};
}

// One fixed step: the skier's view and the step's events.
export function stepJudgedRun(run, view, events, dt) {
  if (run.done) return;
  run.clock += dt;
  if (run.kind === 'moguls' && view.grounded && !view.tumbling && view.speed >= SCORE.turnSpeed) {
    const side = view.edge > SCORE.turnEdge ? 1 : view.edge < -SCORE.turnEdge ? -1 : 0;
    if (side !== 0 && side !== run.side) { run.turns++; run.side = side; }
  }
  for (const event of events) if (event.type === 'skiLand') run.landings.push(event);
}

export function finishJudgedRun(run) {
  run.done = true;
  return judgedScore(run);
}

function moguls(run) {
  const {turnsPlanned, jumps, guideTime} = run.config;
  const turns = 100 * clamp(run.turns / turnsPlanned, 0, 1);
  const jumpsDone = run.landings.slice(0, jumps);
  let air = 0;
  for (const landing of jumpsDone) {
    if (!landing.safe) continue;
    air += 50 + (Math.max(landing.spinMax, landing.flipMax) >= SCORE.wholeRotation ? 50 : 0);
  }
  air /= Math.max(1, jumps);
  const speed = guideTime > 0
    ? 100 * clamp(1 - (run.clock - guideTime) / (guideTime * (SCORE.speedSlack - 1)), 0, 1) : 0;
  const w = SCORE.moguls;
  return {turns, air, speed, total: w.turns * turns + w.air * air + w.speed * speed};
}

function aerials(run) {
  const {height, distance, rotations, axis} = run.config;
  const landing = run.landings[0];
  if (!landing) return {air: 0, form: 0, landing: 0, total: 0};
  const air = 100 * clamp(0.5 * landing.height / height + 0.5 * landing.distance / distance, 0, 1);
  const main = Math.abs(axis === 'flip' ? landing.flip : landing.spin);
  const side = Math.abs(axis === 'flip' ? landing.spin : landing.flip);
  const done = 50 * clamp(main / (360 * rotations), 0, 1);
  const steady = 50 * clamp(1 - side / SCORE.steadyMargin, 0, 1);
  const form = done + steady;
  const soft = landing.safe ? 100 * (1 - SCORE.softLanding * clamp(landing.angle / 20, 0, 1)) : 0;
  const w = SCORE.aerials;
  return {air, form, landing: soft, total: w.air * air + w.form * form + w.landing * soft};
}

export function judgedScore(run) {
  const parts = run.kind === 'moguls' ? moguls(run) : aerials(run);
  return {...parts, points: Math.round(parts.total * 10) / 10, medal: pointsMedal(parts.total, run.config.medals ?? SCORE.judgedMedals)};
}
