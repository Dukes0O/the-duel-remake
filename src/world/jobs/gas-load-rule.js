// Slow Ride's numbers and meeting. State lasts for this job only.
import {burnBarricades} from './barricade.js';

export const GAS_LOAD_RULE = Object.freeze({
  raidShares: Object.freeze([.15, .4, .65, .9]),
  raidSideMetres: 400,
  raidCount: 2,
  easyRaidCount: 1,
  raidRiderSpacingMetres: 8,
  stationSideMetres: 6,
  stationRangeMetres: 12,
  holeSeconds: 3,
  maxHoles: 3,
  leakPerSecond: .5,
  easyLeakPerSecond: .25,
  plugSeconds: 6,
  plugAtHoles: 2,
  flashRangeMetres: 8,
  flashGas: 15,
  flashCooldownSeconds: 2,
  flashVisibleSeconds: .35,
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

// Raiders are ordinary car actors. Only the tank and the raid clocks live here.
export function gasLoadRaids(step, state, view, truck, share, dt) {
  const seconds = Math.max(0, dt), requests = [], events = [];
  const raids = [...(state.gasRaids ?? [])];
  for (const raid of step.gasRaids ?? []) if (share >= raid.share && !raids.includes(raid.id)) {
    raids.push(raid.id);
    events.push({type:'gasRaid', id:raid.id});
  }
  const clocks = {...state.holeClocks};
  let holes = state.holes ?? GAS_LOAD_RULE.startHoles;
  const openings = [];
  let leakingSeconds = holes * seconds;
  for (const def of step.gasRaiders ?? []) {
    const rider = view.actors?.find(actor => actor.id === def.id);
    const active = raids.includes(def.raidId) && def.raidIndex <
      (view.difficulty === 'easy' ? GAS_LOAD_RULE.easyRaidCount : GAS_LOAD_RULE.raidCount);
    if (!active || !rider || rider.health <= 0 || rider.drivenOff ||
        Math.hypot(rider.position.x - truck.position.x, rider.position.z - truck.position.z) > GAS_LOAD_RULE.stationRangeMetres) {
      clocks[def.id] = 0;
      continue;
    }
    const before = clocks[def.id] ?? 0;
    for (let when = GAS_LOAD_RULE.holeSeconds - before; when <= seconds; when += GAS_LOAD_RULE.holeSeconds) openings.push(when);
    clocks[def.id] = (before + seconds) % GAS_LOAD_RULE.holeSeconds;
  }
  for (const when of openings.sort((a, b) => a - b)) {
    if (holes >= GAS_LOAD_RULE.maxHoles) break;
    holes++;
    leakingSeconds += seconds - when;
    events.push({type:'gasLeak', actorId:step.actorId});
  }
  const rate = view.difficulty === 'easy' ? GAS_LOAD_RULE.easyLeakPerSecond : GAS_LOAD_RULE.leakPerSecond;
  return {state:{...state, gasRaids:raids, holeClocks:clocks, holes,
    gas:Math.max(0, (state.gas ?? GAS_LOAD_RULE.start) - rate * leakingSeconds)}, requests, events};
}

export const GAS_FLASH_LINE = "Moss: Not near the tank when she's weeping!";

export function gasLoadFlash(step, state, view, truck, dt) {
  const seconds = Math.max(0, dt), requests = [], events = [];
  let cooldown = Math.max(0, (state.flashCooldown ?? 0) - seconds);
  let visible = Math.max(0, (state.flashVisible ?? 0) - seconds);
  let gas = state.gas ?? GAS_LOAD_RULE.start, flashSaid = state.flashSaid ?? false;
  const player = view.player?.position;
  if (state.holes > 0 && view.playerFlaming && player && cooldown === 0 &&
      Math.hypot(player.x - truck.position.x, player.z - truck.position.z) <= GAS_LOAD_RULE.flashRangeMetres) {
    gas = Math.max(0, gas - GAS_LOAD_RULE.flashGas);
    cooldown = GAS_LOAD_RULE.flashCooldownSeconds;
    visible = GAS_LOAD_RULE.flashVisibleSeconds;
    events.push({type:'gasFlash', actorId:step.actorId});
    if (!flashSaid) requests.push({type:'say', lineId:'gas.flash'});
    flashSaid = true;
  }
  return {state:{...state, gas, flashSaid, flashCooldown:cooldown, flashVisible:visible}, requests, events};
}

// Use the shared escort's stopped command, including a wait at a road block.
// The clock resets when she moves; plugging is six uninterrupted seconds.
export function gasLoadPlug(step, state, speed, dt) {
  const requests = [], events = [];
  let plugging = state.plugging ?? false;
  if (state.holes >= GAS_LOAD_RULE.plugAtHoles && !plugging) {
    plugging = true;
    requests.push({type:'say', lineId:step.restLineId});
  }
  const stopped = plugging || speed === 0;
  const elapsed = state.holes > 0 && stopped ? (state.plugElapsed ?? 0) + Math.max(0, dt) : 0;
  if (state.holes > 0 && elapsed >= GAS_LOAD_RULE.plugSeconds) {
    events.push({type:'gasPlug', actorId:step.actorId});
    return {state:{...state, holes:0, holeClocks:{}, plugging:false, plugElapsed:0}, speed, requests, events};
  }
  return {state:{...state, plugging, plugElapsed:elapsed}, speed:plugging ? 0 : speed, requests, events};
}
