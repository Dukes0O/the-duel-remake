// Pit roads and fixed-step service (CIRCUITS.md 3.5). No graphics or storage.
import {normalizeTyre, gripFor} from './race-surfaces.js';
import {makeRng} from './rng.js';
import {DRIVE} from './config.js';
import {LAB_TUNE} from './lab/lab-tune.js'; // LAB-TUNE

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
  if(opt.limiterLength!==undefined || opt.limitKph!==undefined){
    if(!Number.isFinite(opt.limiterLength)||opt.limiterLength<=0||opt.limiterLength>lane.exit-lane.entry||
      !Number.isFinite(opt.limitKph)||opt.limitKph<=0)throw Error('An authored pit bay needs a contained length and positive speed.');
    lane.limiterStart=lane.box-opt.limiterLength/2;lane.limiterEnd=lane.box+opt.limiterLength/2;
    lane.limitMph=opt.limitKph/1.609344;
  }
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

// The drawn pavement includes the taper overlap with the main road.
export function pitRoadAt(course, s, off) {
  const lane = course?.pitLane;
  if (!lane) return null;
  const p = course.phase(s);
  if (p < lane.entry || p > lane.exit || Math.abs(off - lane.offsetAt(p)) > lane.width / 2)
    return null;
  return lane;
}
export function pitAt(course, s, off) {
  const lane = pitRoadAt(course, s, off);
  if (!lane) return null;
  // Branch tapers overlap the main road; apply the limiter beyond its edge.
  if (Math.abs(off) <= course.roadHalfWidthAt(course.phase(s))) return null;
  return lane;
}
// The road/service lane stays whole; only opted-in bays limit its speed.
export function pitSpeedLimitAt(course,s,off){
  const lane=pitAt(course,s,off);if(!lane)return null;
  const phase=course.phase(s);
  if(lane.limiterStart!==undefined&&(phase<lane.limiterStart||phase>lane.limiterEnd))return null;
  return lane.limitMph ?? PIT.limitMph;
}

// Automatic drivers that were pushed into the lane follow its line to the exit.
// This only describes a target; it never takes manual input or starts service.
export function pitTransitTarget(course, actor, look = actor.s) {
  if ((!actor.finished && actor.field?.pitChoice?.stop) || actor.pit?.phase === 'servicing') return null;
  const lane = pitAt(course, actor.s, actor.lateral);
  return lane ? {lateral: lane.offsetAt(look), speedMph: pitSpeedLimitAt(course,actor.s,actor.lateral)} : null;
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
  const limit=pitSpeedLimitAt(duel.course,actor.s,actor.lateral);
  const opted=lane.limiterStart!==undefined;
  if (!pit) {
    pit = actor.pit = {phase: 'lane', elapsed: 0, tone: 0, fit: otherTyre(actor.tyre)};
    if(!opted)emit('pit.limiter');
  }
  if(opted){
    if(limit!==null&&!pit.limiterActive)emit('pit.limiter');
    pit.limiterActive=limit!==null;
    if(limit===null)pit.tone=0;
  }
  if(limit!==null){
    pit.tone += dt;
    if (pit.tone >= 1) { pit.tone -= 1; emit('pit.limiter'); }
    actor.speedMph = Math.max(-limit, Math.min(limit, actor.speedMph));
    actor.boosting = false;
  }
  const box = Math.floor(actor.s / duel.course.length) * duel.course.length + pitBox(lane, actor);
  if (pit.phase === 'lane' && !actor.knock && !actor.airborne &&
      Math.abs(actor.s - box) <= 4 && Math.abs(actor.lateral - lane.offsetAt(actor.s)) <= 1.6 &&
      Math.abs(actor.speedMph) < PIT.stopMph) {
    pit.phase = 'servicing';
    pit.elapsed = 0;
    if (player && actor.fuel) pit.service = PIT.serviceSec + LAB_TUNE.fuel.stopSec; // LAB-TUNE: the fuel stop takes 5 s longer
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
  const service = pit.service ?? PIT.serviceSec; // LAB-TUNE
  pit.elapsed = Math.min(service, pit.elapsed + dt);
  if (pit.elapsed + 1e-9 >= service) {
    if (player && actor.fuel) { actor.fuel.leftM = actor.fuel.tankM; actor.fuel.dry = false; } // LAB-TUNE: the tank is full again
    actor.tyre = pit.fit;
    actor.boost = 1;
    pit.phase = 'ready';
    if (actor.field) actor.field.pitServiced = true;
    emit('pit.go');
  }
  return true;
}

export function limitPitSpeed(course, actor) {
  const limit=pitSpeedLimitAt(course,actor.s,actor.lateral);
  if(limit===null)return;
  actor.speedMph = Math.max(-limit, Math.min(limit, actor.speedMph));
  actor.boosting = false;
}
export function pitView(duel) {
  const lane = duel.course?.pitLane, s = duel.state;
  if (!lane || s.status !== 'racing') return null;
  const pit = s.pit, fit = (pit?.fit ?? otherTyre(s.tyre)).toUpperCase();
  if (pit?.phase === 'servicing') return {
    text: `FITTING ${fit} TYRES · ${((pit.service ?? PIT.serviceSec) - pit.elapsed).toFixed(1)} S`, phase: pit.phase, // LAB-TUNE
  };
  if (pit?.phase === 'ready') return {text: 'GO', phase: pit.phase};
  if(pit&&lane.limiterStart!==undefined){
    const limit=pitSpeedLimitAt(duel.course,s.s,s.lateral);
    return {text:`${limit===null?'PIT LANE':`${Math.round(limit*1.609344)} KM/H`} · STOP IN YOUR BOX · ${fit} TYRES`,phase:'lane'};
  }
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
  const span = lane.limiterStart===undefined ? lane.exit-lane.entry : lane.limiterEnd-lane.limiterStart;
  const normal = run.profile.at(lane.box) * DRIVE.mphToWorld;
  const limit=lane.limitMph ?? PIT.limitMph;
  const transit = span / (limit * DRIVE.mphToWorld) - span / Math.max(2, normal);
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
