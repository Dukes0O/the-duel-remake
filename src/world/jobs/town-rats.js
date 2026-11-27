// TOWN-JOBS-2: Road Rats at a town job (docs/WASTELAND_TOWN.md section 7: "The Rats will try to stop you", "while Rats come at
// you"). One rule, shared by the fence, repair and hold steps. Pure: no DOM, no Three.js, nothing from app.js; no randomness.
//
// A step that names `rats` asks for a roadside gang at a place (the same foot raiders as an escort's ambush: a spawnWave
// request with `ambush`, src/world/jobs/steps/escort.js). While a Rat still stands within `nearMetres` of the player the step's
// work stops: nobody unloads a fence or turns a wrench while they are being shot at. Nothing is lost by it and there is no clock.
// The Rats go one of three ways:
//   - knocked down, by the car (the mode's run-down rule) or by any weapon: a Rat knocked down stays down;
//   - they give up after `giveUpSeconds` of getting nowhere, so a driver who only waits still gets the job done;
//   - the work is finished, and the step sends them away.
// The raiders' own shooting, and their knocking a driver on foot down, are the mode's (src/arena/modes/world-job.js).
export const RATS_RULE = Object.freeze({nearMetres:30, giveUpSeconds:40, easyGiveUpSeconds:15, count:2});

const at = place => place?.position ?? place ?? {};

/** Send a gang away because its work is over: {state, requests}. A gang that never came, or has gone, is left as it is. */
export function dismissRats(state = {}, key) {
  if (state.came !== true || state.gone === true || !key) return {state, requests:[]};
  return {state:{...state, gone:true}, requests:[{type:'clearWave', key:`ambush:${key}`}]};
}

/** How many Rats this gang has at this difficulty: one fewer on Easy, never fewer than one. */
export function ratsCount(rats, difficulty = 'medium') {
  const count = Math.max(1, Math.floor(rats?.count ?? RATS_RULE.count));
  return difficulty === 'easy' ? Math.max(1, rats?.easyCount ?? count - 1) : count;
}

/** The seconds a gang stays before it gives up. */
export function ratsGiveUpSeconds(rats, difficulty = 'medium') {
  return difficulty === 'easy' ? rats?.easyGiveUpSeconds ?? RATS_RULE.easyGiveUpSeconds : rats?.giveUpSeconds ?? RATS_RULE.giveUpSeconds;
}

/**
 * One step of a gang. `state` is the gang's own record ({came, since, gone}) kept by the step under the gang's key; `gang` is
 * {key, place, direction}. Returns {state, stopping, standing, events, requests}: `stopping` is true while a Rat stands near
 * enough to stop the work.
 */
export function stepRats(rats, state = {}, view = {}, dt = 0, gang = {}) {
  const events = [], requests = [];
  if (!rats || !gang.key) return {state, stopping:false, standing:0, events, requests};
  const key = `ambush:${gang.key}`, difficulty = view.difficulty ?? 'medium';
  const next = {came:state.came === true, since:state.since ?? 0, gone:state.gone === true};
  if (next.gone) return {state:next, stopping:false, standing:0, events, requests};
  if (!next.came) {
    next.came = true;
    requests.push({type:'spawnWave', ambush:true, key, n:ratsCount(rats, difficulty), at:gang.place, direction:gang.direction ?? {x:0, z:1}});
    if (rats.lineId) requests.push({type:'say', lineId:rats.lineId});
    events.push({type:'ratsCame', cue:'raider.warning', key:gang.key, callout:'Road Rats! Drive at them, or wait until they give up.'});
    return {state:next, stopping:true, standing:ratsCount(rats, difficulty), events, requests};
  }
  next.since += dt;
  const here = view.fighter?.position ?? view.player?.position ?? {}, near = rats.nearMetres ?? RATS_RULE.nearMetres;
  const gangActors = (view.actors ?? []).filter(actor => String(actor.id).startsWith(`${key}:`));
  const up = gangActors.filter(actor => (actor.health ?? 1) > 0);
  const standing = up.filter(actor => Math.hypot((at(actor).x ?? 0) - (here.x ?? 0), (at(actor).z ?? 0) - (here.z ?? 0)) <= near).length;
  const beaten = gangActors.length > 0 && up.length === 0, gaveUp = next.since >= ratsGiveUpSeconds(rats, difficulty);
  if (beaten || gaveUp || gang.finished) {
    next.gone = true;
    requests.push({type:'clearWave', key});
    if (rats.goneLineId && !gang.finished) requests.push({type:'say', lineId:rats.goneLineId});
    events.push({type:'ratsGone', cue:'rider.breaks-off', key:gang.key, how:beaten ? 'beaten' : gaveUp ? 'gave-up' : 'finished',
      ...(gang.finished ? {} : {callout:beaten ? 'The Rats are down. Carry on.' : 'The Rats have given up. Carry on.'})});
    return {state:next, stopping:false, standing:0, events, requests};
  }
  return {state:next, stopping:standing > 0, standing, events, requests};
}
