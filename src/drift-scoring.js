// Pure scoring for a fixed-step driving simulation. It never changes a car,
// race progress, input, wallet or course. Call once per120Hz physics sample.
const MPH_TO_METRES = .44704;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const clean = (n, max = 1e7) => clamp(finite(n), 0, max);
const SETTINGS = Object.freeze({ minSpeedMph: 45, minSlip: .075, maxSlip: .42, maxHeading: .7,
  straightGraceSec: .7, pointsPerMetre: 6, maxPointsPerMetre: 12, multiplierMetres: 180, maxMultiplier: 1.75 });

export function createDriftState({ lapLength = 2880, laps = 2, startS = 0 } = {}) {
  lapLength = clamp(finite(lapLength, 2880), 100, 50000); laps = clamp(Math.floor(finite(laps, 2)), 1, 8);
  const raceLength = lapLength * laps, start = clamp(finite(startS), 0, raceLength);
  return { lapLength, laps, raceLength, visitedTo: start, lastS: start, lastWorld: null,
    bankedScore: 0, chainScore: 0, chainMeters: 0, driftMeters: 0, bestChain: 0,
    multiplier: 1, straightSec: 0, finished: false, lastEvent: null };
}

function stateCopy(state) {
  const next = createDriftState(state);
  const raceLength = next.raceLength;
  next.raceLength = raceLength; next.visitedTo = clean(state.visitedTo, raceLength); next.lastS = clean(state.lastS, raceLength);
  for (const key of ['bankedScore', 'chainScore', 'bestChain']) next[key] = clean(state[key], raceLength * SETTINGS.maxPointsPerMetre);
  next.chainScore = Math.min(next.chainScore, raceLength * SETTINGS.maxPointsPerMetre - next.bankedScore);
  for (const key of ['chainMeters', 'driftMeters']) next[key] = clean(state[key], raceLength);
  next.straightSec = clean(state.straightSec, SETTINGS.straightGraceSec);
  next.multiplier = clamp(finite(state.multiplier, 1), 1, SETTINGS.maxMultiplier);
  next.lastWorld = Number.isFinite(state.lastWorld?.x) && Number.isFinite(state.lastWorld?.z) ? { x: state.lastWorld.x, z: state.lastWorld.z } : null;
  next.finished = state.finished === true; next.lastEvent = null; return next;
}

function lose(next, reason) {
  const points = next.chainScore;
  next.chainScore = 0; next.chainMeters = 0; next.multiplier = 1; next.straightSec = 0;
  if (points > 0) next.lastEvent = { type: 'lost', reason, points };
}

function bank(next) {
  const points = next.chainScore;
  next.bankedScore = Math.min(next.raceLength * SETTINGS.maxPointsPerMetre, next.bankedScore + points);
  next.bestChain = Math.max(next.bestChain, points);
  next.chainScore = 0; next.chainMeters = 0; next.multiplier = 1; next.straightSec = 0;
  if (points > 0) next.lastEvent = { type: 'banked', points };
}

// Exact integral keeps a constant-quality slide independent of update slicing.
function multiplierIntegral(distance) {
  const ramp = SETTINGS.multiplierMetres * (SETTINGS.maxMultiplier - 1), rising = Math.min(ramp, distance);
  return rising + rising * rising / (2 * SETTINGS.multiplierMetres) + Math.max(0, distance - ramp) * SETTINGS.maxMultiplier;
}

export function stepDrift(state, sample, dt) {
  const next = stateCopy(state || {});
  if (next.finished || sample?.paused === true) return next;
  if (!sample || !Number.isFinite(dt) || dt <= 0 || dt > .25) { lose(next, 'invalid'); return next; }
  const { prevS, s, from, to, speedMph, slipAngle, headingError, yawVelocity } = sample;
  const values = [prevS, s, from?.x, from?.z, to?.x, to?.z, speedMph, slipAngle, headingError, yawVelocity];
  const invalidStatusNumber = ['impactTimer', 'airHeight'].some(key => sample[key] != null && (!Number.isFinite(sample[key]) || sample[key] < 0));
  if (!values.every(Number.isFinite) || invalidStatusNumber || Math.max(Math.abs(from.x), Math.abs(from.z), Math.abs(to.x), Math.abs(to.z)) > 1e7) { lose(next, 'invalid'); return next; }
  const previous = clamp(prevS, 0, next.raceLength), current = clamp(s, 0, next.raceLength);
  const progress = current - previous, distance = Math.hypot(to.x - from.x, to.z - from.z);
  const freshProgress = Math.max(0, current - Math.max(previous, next.visitedTo));
  const discontinuous = Math.abs(previous - next.lastS) > .1 || next.lastWorld && Math.hypot(from.x - next.lastWorld.x, from.z - next.lastWorld.z) > .1;
  next.visitedTo = Math.max(next.visitedTo, current); next.lastS = current; next.lastWorld = { x: to.x, z: to.z };
  const possibleDistance = Math.max(0, speedMph) * MPH_TO_METRES * dt * 1.15 + .08;
  const invalidMove = speedMph < 0 || speedMph > 400 || distance > possibleDistance || progress > possibleDistance * 4 + .1;
  const legal = sample.mainRoad === true || sample.preparedRoute === true;
  const reason = sample.hit === true ? 'hit' : sample.reset === true || discontinuous || invalidMove ? 'reset' :
    sample.status !== 'racing' || (sample.impactTimer || 0) > 0 ? 'inactive' : sample.airborne === true || (sample.airHeight || 0) > .03 ? 'airborne' :
    !legal ? 'offroad' : progress < -.001 || Math.cos(headingError) <= 0 ? 'reverse' : null;
  if (reason) { lose(next, reason); return next; }

  const slip = Math.abs(slipAngle);
  if (slip > SETTINGS.maxSlip || Math.abs(headingError) > SETTINGS.maxHeading || Math.abs(yawVelocity) > 2.5) { lose(next, 'uncontrolled'); return next; }
  const controlled = slip >= SETTINGS.minSlip && speedMph >= SETTINGS.minSpeedMph;
  // Consume all visited progress, even on straight or illegal driving. Resetting
  // and revisiting the same segment never provides a second scoring budget.
  const scoredMetres = progress > .000001 ? Math.min(distance * freshProgress / progress, freshProgress) : 0;
  if (!controlled || scoredMetres <= .000001) {
    const stableStraight = slip < SETTINGS.minSlip && speedMph >= 20 && progress > .000001 && distance > .000001;
    if (stableStraight) next.straightSec += dt;
    if (next.straightSec + 1e-9 >= SETTINGS.straightGraceSec) bank(next);
    return next;
  }
  const quality = .65 + .35 * clamp((slip - SETTINGS.minSlip) / .15, 0, 1);
  const growth = multiplierIntegral(next.chainMeters + scoredMetres) - multiplierIntegral(next.chainMeters);
  const points = Math.min(scoredMetres * SETTINGS.maxPointsPerMetre, SETTINGS.pointsPerMetre * quality * growth);
  next.chainScore = Math.min(next.raceLength * SETTINGS.maxPointsPerMetre - next.bankedScore, next.chainScore + points);
  next.chainMeters += scoredMetres; next.driftMeters += scoredMetres; next.straightSec = 0;
  next.multiplier = Math.min(SETTINGS.maxMultiplier, 1 + next.chainMeters / SETTINGS.multiplierMetres);
  return next;
}

export function finishDrift(state, { completed = false } = {}) {
  const next = stateCopy(state || {});
  if (next.finished) return next;
  if (completed === true) bank(next); else lose(next, 'unfinished');
  next.finished = true; return next;
}

export function breakDrift(state, reason = 'hit') {
  const next = stateCopy(state || {});
  if (!next.finished) lose(next, reason === 'reset' ? 'reset' : 'hit');
  return next;
}

export const DRIFT_SCORING = SETTINGS;
