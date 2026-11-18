// Slow Ride's numbers and meeting. State lasts for this job only.
import {burnBarricades} from './barricade.js';

export const GAS_LOAD_RULE = Object.freeze({
  start: 100,
  startHoles: 0,
  speedKmh: 32,
  carStartBehindMetres: 60,
  carStartSideMetres: 0,
  meetingSideMetres: 6,
  meetingRadiusMetres: 6,
  stoppedKmh: 1,
  blockShares: Object.freeze([.25, .5, .75]),
  blockBurnSeconds: 4,
  blockStopMetres: 25,
  blockRestartSeconds: 8,
  hardKnockKmh: 20,
  blockRiderAlertMetres: 80,
  riderBehindMetres: 12,
});

// Called by the shared escort, with distance along its own path. The mover
// gets a speed cap for this tick, so it cannot overshoot the stopping point.
export function gasLoadBlocks(step, state, view, along, dt) {
  const burning = burnBarricades(step.barriers, state, view.thingsHit ?? [], dt, GAS_LOAD_RULE.blockBurnSeconds);
  const cleared = new Set([...(state.clearedBlocks ?? []), ...burning.burntBarricades]);
  for (const block of step.blocks ?? []) {
    if (block.car && (view.carContacts ?? []).some(hit => hit.id === block.id && hit.kmh >= GAS_LOAD_RULE.hardKnockKmh)) cleared.add(block.id);
  }
  const standing = step.blocks?.find(block => !cleared.has(block.id) && block.metres >= along);
  let stoppedBlock = state.stoppedBlock ?? null;
  let restartLeft = state.blockRestartLeft ?? 0;
  let speed = step.speed;
  if (stoppedBlock && cleared.has(stoppedBlock)) {
    restartLeft = Math.max(0, restartLeft - ((state.clearedBlocks ?? []).includes(stoppedBlock) ? Math.max(0, dt) : 0));
    if (restartLeft === 0) stoppedBlock = null;
  }
  if (stoppedBlock) speed = 0;
  else if (standing) {
    const left = Math.max(0, standing.metres - GAS_LOAD_RULE.blockStopMetres - along);
    speed = dt > 0 ? Math.min(speed, left / dt) : left === 0 ? 0 : speed;
    if (left === 0) {
      stoppedBlock = standing.id;
      restartLeft = GAS_LOAD_RULE.blockRestartSeconds;
    }
  }
  return {state: {...state, burntBarricades: burning.burntBarricades, barrierHeat: burning.barrierHeat,
    clearedBlocks: [...cleared], stoppedBlock, blockRestartLeft: restartLeft}, speed, events: burning.events};
}

export const GAS_LOAD_LINES = Object.freeze({
  'gas.meeting.1': "Moss: Forge is lit and the bellows are home. All she wants now is gas, and Bess is full of it.",
  'gas.meeting.2': "Moss: Ash Men would sooner see it soak into the sand. They'll block the road and go for her tank.",
  'gas.meeting.3': "Moss: Go ahead and open the road. I can't stop her and start her for nothing.",
});

// Return null once the existing escort may move. Captions use the shared queue.
export function gasLoadMeeting(step, state, view) {
  if (state.gasLoaded) return null;
  const requests = [{type: 'follow', path: step.path, speed: 0},
    {type: 'marker', place: step.meeting}];
  const here = view.player?.position, there = step.meeting.position;
  const stopped = !view.onFoot && Math.abs(view.speedKmh ?? 0) < GAS_LOAD_RULE.stoppedKmh;
  if (!state.gasMeeting && here && stopped &&
      Math.hypot(here.x - there.x, here.z - there.z) <= GAS_LOAD_RULE.meetingRadiusMetres) {
    requests.push(...[...Object.keys(GAS_LOAD_LINES), 'story.ember.moss.1'].map(lineId => ({type: 'say', lineId})));
    return {state: {...state, gasMeeting: true}, complete: false, requests};
  }
  if (state.gasMeeting && !(state.lineQueue?.length) && !(state.lineRemaining > 0)) return null;
  return {state, complete: false, requests};
}
