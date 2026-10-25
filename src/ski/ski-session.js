// One ski run, from the drop to the pickup (docs/HELI_SKIING.md sections 4 to 6). Pure game rules with no graphics:
// a run id and a wax setting go in, controls go in at the fixed step, events and a read-only view come out, the same
// every time. The helicopter's session starts a run when the pilot steps out on a drop pad and
// ends it at the pickup; this file knows nothing of the helicopter, the save or the Lab.
//
// The zone's own frame (summit-zones.js): the drop pad is the origin, the run falls toward +z, +x is the skier's left.
import {SKI_STEP, createSkier, stepSkier, skierView, skierFingerprint} from './ski-physics.js';
import {createTimedRun, stepTimedRun, timedMedal, createJudgedRun, stepJudgedRun, finishJudgedRun, RUN_KINDS} from './ski-score.js';
import {ghostAt} from './ski-guide.js';
import {skiZone, zoneGuide, medalLimits, judgedConfig, stashAt, atPickup, SUMMIT_PADS, SKI_RUN_IDS} from './runs/summit-zones.js';

export const SKI_SESSION = Object.freeze({
  // Stopping in the pickup circle (slower than this for this long) ends the run.
  stopSpeed: 0.5,
  stopSeconds: 0.5,
  // The group's figures beside the player: the guide's ghost, each guest this many seconds behind and this far to the side.
  guests: Object.freeze([Object.freeze({delay: 1.5, side: -4}), Object.freeze({delay: 3, side: 4}), Object.freeze({delay: 4.5, side: -7}), Object.freeze({delay: 6, side: 7})]),
});

// What the helicopter session needs to know of the runs without reaching into the zones: the three pads (the Summit Run
// world's landing circles), the run ids, which pad each run starts from, its name and its medal limits.
export const SKI_PADS = SUMMIT_PADS;
export {SKI_RUN_IDS};
export const skiRunPad = id => skiZone(id).pad;
export const skiRunName = id => skiZone(id).name;
export const skiRunLimits = id => medalLimits(id);
export const skiRunFingerprint = run => `${run.runId}|${run.t.toFixed(4)}|${skierFingerprint(run.skier)}|${run.started}|${run.finished}`;

const isRunId = id => typeof id === 'string' && Object.hasOwn(RUN_KINDS, id);
const num = value => Number.isFinite(value) ? value : 0;
const clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// Controls are the ski keys: turn -1..1 (D right, A left; in the air, spin), flip -1..1 (W forward, S back; in the air),
// skid, tuck, skate and pop. Anything else is ignored.
export function skiControls(controls) {
  const c = controls && typeof controls === 'object' ? controls : {};
  return {turn: clamp(num(c.turn), -1, 1), flip: clamp(num(c.flip), -1, 1), skid: c.skid === true, tuck: c.tuck === true,
    skate: c.skate === true, pop: c.pop === true};
}

// wax: null, 'right' or 'wrong' (the ski rules' three frictions). group: the guide and guests ski beside the player.
export function createSkiRun({runId, wax = null, group = false} = {}) {
  if (!isRunId(runId)) throw new Error(`Not a ski run: ${runId}`);
  const zone = skiZone(runId), kind = RUN_KINDS[runId], first = zone.line[0], next = zone.line[1];
  const skier = createSkier({x: first.x, z: first.z, heading: Math.atan2(next.x - first.x, next.z - first.z), world: zone,
    wax: wax === 'right' || wax === 'wrong' ? wax : null});
  // Every judged run is also a timed one with no gates, only to know when the start and finish lines are crossed.
  const crossing = kind === 'timed' ? createTimedRun({start: zone.start, finish: zone.finish, gates: zone.gates})
    : kind === 'judged' ? createTimedRun({start: zone.start, finish: zone.finish, gates: []}) : null;
  const guide = kind === 'free' ? null : zoneGuide(runId);
  return {runId, kind, zone, skier, crossing, guide, judged: kind === 'judged' ? createJudgedRun(runId, judgedConfig(runId)) : null,
    group: group === true && guide !== null, wax: skier.wax, t: 0, started: false, finished: false, result: null, stashes: [],
    still: 0, ended: false, out: false};
}

// One fixed step (1/120 s). Returns the events: the skier's (skiPop, skiLand, skiTumble, skiCarve, skiSkid) and the run's
// (skiStart, skiGate, skiFinish, skiResult, skiStash, skiOut, skiPickup).
export function stepSkiRun(run, controls, dt = SKI_STEP) {
  if (run.ended) return [];
  const events = [], zone = run.zone, skier = run.skier;
  const from = {x: skier.x, z: skier.z};
  const stepped = stepSkier(skier, skiControls(controls), zone, dt);
  run.t += dt;
  // The zone is walled in: leaving its edge puts the skier back on it, with no speed into the wall.
  const b = zone.bounds, x = clamp(skier.x, b.minX, b.maxX), z = clamp(skier.z, b.minZ, b.maxZ);
  if (x !== skier.x || z !== skier.z) {
    skier.x = x; skier.z = z;
    if (skier.grounded) skier.y = zone.ground(x, z);
    if (x !== from.x) skier.vx = 0;
    if (z !== from.z) skier.vz = 0;
    if (!run.out) { run.out = true; events.push({type: 'skiOut'}); }
  } else run.out = false;
  events.push(...stepped);
  const view = skierView(skier, zone), to = {x: skier.x, z: skier.z};
  if (run.crossing) {
    const crossed = stepTimedRun(run.crossing, from, to, dt);
    for (const event of crossed) {
      if (event.type === 'skiStart') run.started = true;
      events.push(event);
      if (event.type === 'skiFinish') {
        run.finished = true;
        run.result = run.judged ? judgedResult(run) : timedResult(run, event);
        events.push({type: 'skiResult', ...run.result});
      }
    }
    // The judges watch from the start line until the finish line.
    if (run.judged && run.started && !run.finished) stepJudgedRun(run.judged, view, stepped, dt);
  }
  if (run.kind === 'free' && !skier.tumble) {
    const id = stashAt(run.runId, skier.x, skier.z);
    if (id && !run.stashes.includes(id)) { run.stashes.push(id); events.push({type: 'skiStash', id}); }
  }
  // Stopped in the pickup circle: the run is over.
  if (atPickup(run.runId, skier.x, skier.z) && skier.grounded && skier.tumble === 0 && skier.speed <= SKI_SESSION.stopSpeed) run.still += dt;
  else run.still = 0;
  if (run.still >= SKI_SESSION.stopSeconds - 1e-9) { run.ended = true; events.push({type: 'skiPickup'}); }
  return events;
}

function timedResult(run, finish) {
  const time = finish.time;
  return {kind: 'time', run: run.runId, time, raw: finish.raw, missed: finish.missed, medal: timedMedal(time, run.guide.time)};
}
function judgedResult(run) {
  const score = finishJudgedRun(run.judged);
  return {kind: 'points', run: run.runId, points: score.points, medal: score.medal, air: score.air, form: score.form, landing: score.landing,
    turns: score.turns, speed: score.speed};
}

// The result of a finished timed or judged run, or null (powder never has one).
export const resultOf = run => run.result;

// The guide and four guests beside the player, as figures in the zone's frame: each is the guide's ghost, later and to
// the side. The ghost holds still at its end, so the group waits at the finish.
function groupFigures(run) {
  const at = (delay, side) => {
    const g = ghostAt(run.guide, Math.max(0, run.t - delay));
    const right = {x: Math.cos(g.heading), z: -Math.sin(g.heading)};
    return Object.freeze({x: g.x + right.x * side, y: g.y, z: g.z + right.z * side, heading: g.heading, speed: g.speed});
  };
  return Object.freeze({guide: at(0, 0), guests: Object.freeze(SKI_SESSION.guests.map(guest => at(guest.delay, guest.side)))});
}

// A read-only picture for the drawing and the cards (nothing here changes the run).
export function skiRunView(run) {
  const zone = run.zone, skier = run.skier;
  const limits = medalLimits(run.runId);
  return Object.freeze({
    run: run.runId, name: zone.name, kind: run.kind, pad: zone.pad, world: zone.world, bounds: zone.bounds, pickup: zone.pickup,
    t: run.t, started: run.started, finished: run.finished, ended: run.ended, out: run.out,
    clock: run.crossing ? run.crossing.clock : 0, missed: run.crossing ? run.crossing.missed : 0, passed: run.crossing ? run.crossing.passed : 0,
    nextGate: run.crossing ? run.crossing.next : 0, wax: run.wax,
    skier: Object.freeze({...skierView(skier, zone), grounded: skier.grounded}),
    limits, result: run.result, stashes: Object.freeze([...run.stashes]),
    ghost: run.guide ? Object.freeze(ghostAt(run.guide, run.t)) : null,
    group: run.group ? groupFigures(run) : null,
  });
}
