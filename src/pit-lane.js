// Pit roads and fixed-step service (CIRCUITS.md 3.5). No graphics or storage.
import {normalizeTyre, gripFor} from './race-surfaces.js';
import {makeRng} from './rng.js';
import {DRIVE} from './config.js';

export const PIT = Object.freeze({
  width: 9, limitMph: 60 / 1.609344, stopMph: 5 / 1.609344, serviceSec: 4, taper: 60,
});
const smooth = x => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
export const otherTyre = tyre => normalizeTyre(tyre) === 'summer' ? 'winter' : 'summer';

export function installPitLane(course) {
  const opt = course.def.pitLane;
  if (!opt) return;
  const pieces = course.script.pieces.filter(p => p.name === opt.straight);
  if (pieces.length !== 1 || pieces[0].kind !== 'straight' || pieces[0].length < 200)
    throw new Error('Pit lane requires one named straight at least 200 m long.');
  if (opt.side !== undefined && !['left', 'right'].includes(opt.side))
    throw new Error('Pit side must be left or right.');
  const piece = pieces[0], side = opt.side === 'left' ? 1 : -1;
  // A straight that runs through the start line has its first part at the end of the
  // lap's numbers; the lane then begins just past the line, on the part that follows.
  const first = Math.max(piece.s0, 0);
  const lane = {straight: piece.name, side, width: PIT.width,
    entry: first + 10, exit: piece.s1 - 10, box: (first + piece.s1) / 2};
  lane.offsetAt = s => side * (course.roadHalfWidthAt(s) + 1.3 + PIT.width / 2) *
    Math.min(smooth((course.phase(s) - lane.entry) / PIT.taper),
      smooth((lane.exit - course.phase(s)) / PIT.taper));
  course.pitLane = lane;
  const surface = course.surfaceAt.bind(course), ground = course.groundAt.bind(course);
  const grip = course.gripKindAt.bind(course);
  course.surfaceAt = (s, off = 0) => pitAt(course, s, off)
    ? {...surface(s, off), road: true, mainRoad: true, pitLane: true} : surface(s, off);
  course.groundAt = (s, off = 0) => pitAt(course, s, off) ? course.worldAt(s, off) : ground(s, off);
  course.gripKindAt = (s, off = 0) => pitAt(course, s, off) ? 'asphalt' : grip(s, off);
}

export function pitAt(course, s, off) {
  const lane = course?.pitLane;
  if (!lane) return null;
  const p = course.phase(s);
  if (p < lane.entry || p > lane.exit || Math.abs(off - lane.offsetAt(p)) > lane.width / 2)
    return null;
  // Branch tapers overlap the main road; apply the limiter beyond its edge.
  if (Math.abs(off) <= course.roadHalfWidthAt(p)) return null;
  return lane;
}
// Automatic drivers that were pushed into the lane follow its line to the exit.
// This only describes a target; it never takes manual input or starts service.
export function pitTransitTarget(course, actor, look = actor.s) {
  if ((!actor.finished && actor.field?.pitChoice?.stop) || actor.pit?.phase === 'servicing') return null;
  const lane = pitAt(course, actor.s, actor.lateral);
  return lane ? {lateral: lane.offsetAt(look), speedMph: PIT.limitMph} : null;
}

export function pitBox(lane, actor) {
  const index = actor.field?.index;
  if (!Number.isInteger(index)) return lane.box;
  // Leave the marked player box free, including an eight-car field.
  return lane.box + (index < 3 ? index - 3 : index - 2) * 8;
}

export function stepPitService(duel, actor, dt) {
  const lane = duel.course.pitLane;
  if (!lane) return false;
  const player = actor === duel.state;
  let pit = actor.pit;
  // Contacts run after driving: hold the stopped pose through service.
  if (pit?.phase === 'servicing') {
    actor.s = pit.anchorS;
    actor.lateral = pit.anchorLateral;
    actor.headingError = pit.anchorHeading;
  }
  const inside = pitAt(duel.course, actor.s, actor.lateral);
  const emit = cue => { if (player) duel.emit({pitCue: cue}); };
  if (!inside) {
    if (pit && pit.phase !== 'servicing') actor.pit = null;
    return false;
  }
  if (!pit) {
    pit = actor.pit = {phase: 'lane', elapsed: 0, tone: 0, fit: otherTyre(actor.tyre)};
    emit('pit.limiter');
  }
  pit.tone += dt;
  if (pit.tone >= 1) { pit.tone -= 1; emit('pit.limiter'); }
  actor.speedMph = Math.max(-PIT.limitMph, Math.min(PIT.limitMph, actor.speedMph));
  actor.boosting = false;
  const box = Math.floor(actor.s / duel.course.length) * duel.course.length + pitBox(lane, actor);
  if (pit.phase === 'lane' && !actor.knock && !actor.airborne &&
      Math.abs(actor.s - box) <= 4 && Math.abs(actor.lateral - lane.offsetAt(actor.s)) <= 1.6 &&
      Math.abs(actor.speedMph) < PIT.stopMph) {
    pit.phase = 'servicing';
    pit.elapsed = 0;
    pit.anchorS = actor.s;
    pit.anchorLateral = actor.lateral;
    pit.anchorHeading = actor.headingError;
    emit('pit.wrench');
  }
  if (pit.phase !== 'servicing') return false;
  actor.prevS = actor.s;
  actor.prevLateral = actor.lateral;
  actor.speedMph = 0;
  actor.boosting = false;
  actor.yawVelocity = actor.pushVelocity = actor.reverseHoldSec = 0;
  pit.elapsed = Math.min(PIT.serviceSec, pit.elapsed + dt);
  if (pit.elapsed + 1e-9 >= PIT.serviceSec) {
    actor.tyre = pit.fit;
    actor.boost = 1;
    pit.phase = 'ready';
    if (actor.field) actor.field.pitServiced = true;
    emit('pit.go');
  }
  return true;
}

export function limitPitSpeed(course, actor) {
  if (!pitAt(course, actor.s, actor.lateral)) return;
  actor.speedMph = Math.max(-PIT.limitMph, Math.min(PIT.limitMph, actor.speedMph));
  actor.boosting = false;
}
export function pitView(duel) {
  const lane = duel.course?.pitLane, s = duel.state;
  if (!lane || s.status !== 'racing') return null;
  const pit = s.pit, fit = (pit?.fit ?? otherTyre(s.tyre)).toUpperCase();
  if (pit?.phase === 'servicing') return {
    text: `FITTING ${fit} TYRES · ${(PIT.serviceSec - pit.elapsed).toFixed(1)} S`, phase: pit.phase,
  };
  if (pit?.phase === 'ready') return {text: 'GO', phase: pit.phase};
  if (pit) return {text: `60 KM/H · STOP IN YOUR BOX · ${fit} TYRES`, phase: 'lane'};
  let approach = lane.entry - duel.course.phase(s.s);
  // A lane just past the start line is approached across the line, at the end of the lap.
  if (approach < 0 && lane.entry < 200) approach += duel.course.length;
  return approach >= 0 && approach <= 200 ? {text: `PIT → ${fit} TYRES`, phase: 'approach'} : null;
}

// Existing tyre/grip/top-speed table over remaining pieces versus extra pit
// transit plus the actual four seconds. Pure estimate, held on racer state.
export function pitEstimate(duel, actor, run) {
  const course = duel.course, lane = course.pitLane, fit = otherTyre(actor.tyre);
  if (!lane) return {saved: 0, suits: false};
  const speed = (piece, tyre) => {
    const g = gripFor(piece.surface, tyre, run.spec);
    const normal = run.profile.at((piece.s0 + piece.s1) / 2);
    return Math.max(2, Math.min(normal * Math.sqrt(g.grip) * g.topShare,
      g.topSpeedMph ?? Infinity)) * DRIVE.mphToWorld;
  };
  let benefit = 0;
  const laps = course.closed ? Math.max(1, duel.state.lapsTotal - actor.completedLaps) : 1;
  for (let lap = 0; lap < laps; lap++) {
    for (const piece of course.script.pieces) {
      const start = lap ? piece.s0 : Math.max(lane.exit, piece.s0);
      const distance = Math.max(0, piece.s1 - start);
      benefit += distance / speed(piece, actor.tyre) - distance / speed(piece, fit);
    }
  }
  const span = lane.exit - lane.entry, normal = run.profile.at(lane.box) * DRIVE.mphToWorld;
  const transit = span / (PIT.limitMph * DRIVE.mphToWorld) - span / Math.max(2, normal);
  const next = course.script.pieces.find(p => p.s1 > lane.exit && p.surface !== 'asphalt');
  const suits = !!next && speed(next, fit) > speed(next, actor.tyre);
  return {saved: benefit - Math.max(0, transit) - PIT.serviceSec, suits};
}
export function choosePit(duel, actor, run) {
  const estimate = pitEstimate(duel, actor, run), difficulty = duel.state.cpuDifficulty;
  // Separate seeded stream leaves ordinary field choices unchanged.
  const rng = makeRng(((duel.state.fieldSeed ?? duel.state.seed) ^ 0x504954 ^
    ((actor.field.index + 1) * 2654435761)) >>> 0);
  const nia = actor.racerId === 'nia_frost' && normalizeTyre(actor.tyre) === 'summer';
  const stay = nia && rng.float() < .4, roll = rng.float();
  if (difficulty === 'hard') return {...estimate, stop: estimate.saved > 0};
  return {...estimate, stop: estimate.suits && !stay && (difficulty === 'easy' || roll < .75)};
}
