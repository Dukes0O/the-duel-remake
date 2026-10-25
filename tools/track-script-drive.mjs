// Drives an authored circuit headless with the built-in test driver (the demo
// autopilot in src/app.js) through the real Duel rules, memory-only saves.
// Used by the track script tests and each circuit's own test.
import {createFeatureFlags} from '../src/feature-flags.js';
import { App } from '../src/app.js';
import { COURSE, DEFAULT_CPU_DIFFICULTY, DRIVE, steerForYaw } from '../src/config.js';
import { DEFAULT_DRIVER } from '../src/drivers.js';
import {pitTransitTarget} from '../src/pit-lane.js';
import {tunedGrip} from '../src/lab/lab-tune.js';

// The stock demo driver (src/app.js) judges a corner from three points ahead
// of the car, which is not enough to brake for a hairpin at the end of a long
// straight. This driver steers the same way, through the same physics, but
// takes its line and speed from the circuit's racing line and speed profile,
// scaled to the car's grip (the profile is for the grip .82 reference car) and a skill factor.
export function useRacingLine(app, skill = .95) {
  app._driveAutopilot = function lineDriver() {
    const d = this.duel, st = d.state, course = d.course, line = course.racingLine;
    if (st.status === 'ticket') { d.ackTicket(); return; }
    if (st.status !== 'racing') return;
    if (st.impactTimer > 0) { d.setInput({ throttle: 0, brake: 0, steer: 0, boost: false }); return; }
    if (!d.diff.autoShift) d.setInput({ shiftUp: st.revs > .95, shiftDown: st.revs < .48 && st.gear > 0 });
    const v = Math.max(0, st.speedMph) * DRIVE.mphToWorld, halfWidth = course.roadHalfWidthAt(st.s);
    const transit = pitTransitTarget(course, st, st.s + Math.max(12, v * .45));
    let targetLat = transit?.lateral ?? line.offsetAt(st.s + Math.max(12, v * .45));
    for (const other of transit ? [] : st.opponents || []) {
      const ahead = d.relativeS(other.s, st.s) - st.s;
      if (ahead > -10 && ahead < 28 + v * .8 && Math.abs(other.lateral - targetLat) < 2.8) {
        targetLat = passingLateral(st.lateral, other.lateral, halfWidth);
        break;
      }
    }
    const headingTarget = Math.atan((targetLat - st.lateral) * 2.5 / Math.max(15, v));
    const look = course.at(st.s + v * .18);
    const desiredYaw = look.curvature * v + (headingTarget - st.headingError) * 6;
    const surface = d._drivingSurface(st.s, st.lateral);
    // The profile is for a car of grip 1; speed in a corner goes with the square root of grip. A tuned car's grip
    // depends on speed (the wing), so the driver takes the grip it has at the speed the line asks for.
    const lineMph = line.speedAt(st.s) * skill / DRIVE.mphToWorld, grip = d.car.tune ? tunedGrip(d.car, lineMph, 0) : d.car.grip;
    const target = Math.min(surface.speedLimit, d.car.topSpeed * .97,
      transit?.speedMph ?? line.speedAt(st.s) * skill * Math.sqrt(grip / .82 * (surface.traction || 1)) / DRIVE.mphToWorld);
    const brake = st.speedMph > target + 3 ? Math.min(1, (st.speedMph - target) / 14) : 0;
    const steer = steerForYaw(desiredYaw, {speedMph:st.speedMph,grip:d.car.tune ? tunedGrip(d.car, st.speedMph, brake) : d.car.grip,traction:surface.traction,car:d.car,brake:brake,tyreSlip:st.tyreSlipRules===true&&!st.airborne&&st.speedMph>=0});
    d.setInput({ throttle: st.speedMph < target ? 1 : 0, brake, steer, boost: false });
  };
}
const clampTo = (value, limit) => Math.max(-limit, Math.min(limit, value));

// Keep passing on the player's existing side when a rival crosses the road
// centre. The old centre-based choice jumped 6.8 m and reversed full steering.
export const passingLateral = (playerLateral, rivalLateral, halfWidth) =>
  clampTo(rivalLateral + (playerLateral >= rivalLateral ? 3.4 : -3.4), halfWidth - 1.8);


// `def` may be an event already in COURSE (found by id) or a definition that is
// added to COURSE for the length of the run only (tests, never the game).
export function driveCircuit(def, { car = 'falcone_f42', difficulty = 'casual', cpuDifficulty = DEFAULT_CPU_DIFFICULTY,
  fps = 60, seed = 1989, maxSeconds = 1200, opponentCount = 1, driver = 'line', skill = .95, tyre = null, flags = [], onTick, tune = null, mode = 'duel', stopAfterLaps = 0 } = {}) {
  if(!Array.isArray(flags)||flags.some(flag=>!['tyre-slip','lab-tuning','grand-prix'].includes(flag))) throw Error('Unsupported driver flags.');
  const added = !COURSE.includes(def) && !COURSE.some(item => item.id === def.id);
  if (added) COURSE.push(def);
  try {
    const memory = new Map();
    globalThis.localStorage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, String(value)), removeItem: key => memory.delete(key) };
    const app = new App();
    if(flags.length) app.duel.featureFlags=createFeatureFlags({storage:null,qa:false,search:'',overrides:Object.fromEntries(flags.map(flag=>[flag,true]))});
    const stageIndex = COURSE.findIndex(item => item.id === def.id);
    // The Duel is started directly: a new circuit has no shop price yet, and
    // the course access rules have their own suites.
    app._refreshPlayer();
    app.seed = seed; app.cpuDifficulty = cpuDifficulty;
    app.duel.startCampaign({ mode, car, difficulty, cpuDifficulty, driverId: DEFAULT_DRIVER, startStage: stageIndex, seed,
      opponentCount, playerId: app.player.id, upgrades: {}, ...(tyre ? { tyre } : {}), ...(tune ? { tune } : {}) });
    app.autopilot = true;
    app._scriptedCrashDone = true; // skip the demo's deliberate shoulder visit
    if (driver === 'line' && app.duel.course.racingLine) useRacingLine(app, skill);
    const d = app.duel, facts = { crashes: 0, boundaryResets: 0, checkpointResets: 0, finite: true, topMph: 0, minMphAfterStart: Infinity, stuckSeconds: 0, maxStuckSeconds: 0, lapEdge: [], lapMinMph: [] };
    d.onChange((state, event) => {
      if (event.crash) facts.crashes++;
      if (event.boundaryReset) facts.boundaryResets++;
      if (event.checkpointReset) facts.checkpointResets++;
    });
    let frames = 0;
    const observe = d.step.bind(d);
    d.step = dt => {
      observe(dt);
      const s = d.state;
      if (s.status !== 'racing') return;
      facts.finite &&= [s.s, s.lateral, s.speedMph, s.headingError].every(Number.isFinite);
      facts.topMph = Math.max(facts.topMph, s.speedMph);
      if (s.stageTimeSec > 8) {
        facts.minMphAfterStart = Math.min(facts.minMphAfterStart, s.speedMph);
        facts.stuckSeconds = s.speedMph < 3 ? facts.stuckSeconds + dt : 0;
        facts.maxStuckSeconds = Math.max(facts.maxStuckSeconds, facts.stuckSeconds);
      }
      // How far the car's centre strays past the road edge on each lap (negative: inside).
      // A car whose centre is within a metre of the edge is touching a wall there.
      const lap = Math.min(s.completedLaps, 99), edge = Math.abs(s.lateral) - d.course.roadHalfWidthAt(s.s);
      facts.lapEdge[lap] = Math.max(facts.lapEdge[lap] ?? -Infinity, edge);
      facts.lapMinMph[lap] = Math.min(facts.lapMinMph[lap] ?? Infinity, s.speedMph);
      onTick?.(s, d);
    };
    while (!['stage_result', 'gameover', 'complete'].includes(d.state.status) && frames++ < fps * maxSeconds && !(stopAfterLaps && d.state.completedLaps >= stopAfterLaps)) app.advance(1 / fps, 1 / fps);
    const s = d.state;
    return { ...facts, status: s.status, completed: s.results?.completed === true, won: s.results?.won === true,
      laps: s.completedLaps, lapTimes: [...(s.lapTimes || [])], timeSec: s.results?.timeSec ?? s.stageTimeSec,
      bestLap: s.lapTimes?.length ? Math.min(...s.lapTimes) : null, endS: s.s, endLateral: s.lateral };
  } finally {
    if (added) COURSE.splice(COURSE.findIndex(item => item.id === def.id), 1);
  }
}

export const lapTime = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
