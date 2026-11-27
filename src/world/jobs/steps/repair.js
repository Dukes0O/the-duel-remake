// TOWN-JOBS-2: the repair step (docs/WASTELAND_TOWN.md sections 7 and 11). Park, get out, and work on each joint in turn with a
// wrench: stand at the joint and hold F until it is done. Pure: no DOM, no Three.js, nothing from app.js; repeatable from what
// the driver did.
//
// Joints are done in order, one marker at a time. Letting go of F, or stepping away, keeps what has been done to that joint:
// a nut half undone is still half undone. A driver who is knocked down gets up at the joint they were on, loses the turns on
// that one joint, and keeps every joint already finished. Nothing else is lost and there is no clock. A step with `rats`
// (src/world/jobs/town-rats.js) brings a gang when the first joint is begun; work stops while a Rat stands near.
//
// Real numbers, and where they come from:
// - A seized pipe union or flange takes a fitter a few minutes with a long wrench. The game's clock runs each joint in
//   `seconds` (2 by default, 1.5 on Easy), as building runs faster than life (section 2: "nothing makes you wait around").
import {stepRats} from '../town-rats.js';

export const REPAIR_RULE = Object.freeze({seconds:2, easySeconds:1.5, jointRadius:3, carRadius:14, stillKmh:1.5});

// What each event sounds like (src/sound-bank.js): the wrench going on is the repair starting, a joint done is the repair
// finished, a knock-down is the repair interrupted, and the last joint is the finished-step chime.
export const REPAIR_CUES = Object.freeze({repairStarted:'repair.start', repairJoint:'repair.complete', repairDown:'repair.interrupted',
  repairDone:'interface.bonus'});

const finite = Number.isFinite;
const spot = value => value?.position ?? value ?? {};
const gap = (a, b) => Math.hypot((a?.x ?? 0) - (spot(b).x ?? 0), (a?.z ?? 0) - (spot(b).z ?? 0));
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** Seconds of holding F that one joint takes at this difficulty. */
export function repairSeconds(step, difficulty = 'medium') {
  return difficulty === 'easy' ? step.easySeconds ?? Math.min(step.seconds ?? REPAIR_RULE.seconds, REPAIR_RULE.easySeconds) : step.seconds ?? REPAIR_RULE.seconds;
}

/** What the screen line asks for in each part of the repair. */
export function repairLine(step, state = {}) {
  const joints = step.joints ?? [], index = state.index ?? 0, left = joints.length - index, noun = step.jointName ?? 'joint';
  if (state.phase === 'drive' || state.phase === undefined) return step.what ?? 'Drive to the ring and stop.';
  if (state.phase === 'exit') return 'Get out and walk to the marker.';
  if (state.stopped === 'rats') return 'Road Rats are shooting. Get them, or wait until they give up.';
  if (left <= 0) return 'That is the last one done.';
  const count = `${(NUMBER[left] ?? String(left)).replace(/^./, letter => letter.toUpperCase())} ${noun}${left === 1 ? '' : 's'} to go.`;
  return state.working ? `Keep holding F. ${count}` : `Walk to the next ${noun} and hold F. ${count}`;
}

export function stepRepair(step, state, view, dt = 0) {
  const joints = step.joints ?? [], difficulty = view.difficulty ?? 'medium';
  const car = view.player?.position ?? {}, walker = view.fighter?.position ?? car;
  const kmh = Math.abs(finite(view.speedKmh) ? view.speedKmh : 0);
  const next = {phase:state.phase ?? (step.carPlace ? 'drive' : 'exit'), index:state.index ?? 0, turn:state.turn ?? 0, working:false,
    stopped:null, downs:state.downs ?? 0, begun:state.begun === true, said:state.said ?? [], reported:state.reported === true, rats:state.rats ?? {}};
  const events = [], requests = [];
  const say = lineId => { if (lineId) requests.push({type:'say', lineId}); };
  const done = next.index >= joints.length;

  if (next.phase === 'drive') {
    requests.push({type:'marker', place:step.carPlace});
    if (view.onFoot || (kmh < REPAIR_RULE.stillKmh && gap(car, step.carPlace) <= (step.carPlace?.radius ?? REPAIR_RULE.carRadius))) next.phase = 'exit';
  }
  if (next.phase === 'exit') {
    if (view.onFoot || step.requiresExit === false) next.phase = 'work';
    else { requests.push({type:'marker', place:joints[next.index] ?? step.carPlace}); say(step.exitCarLineId); }
  }
  if (next.phase === 'work') {
    const joint = joints[next.index];
    let ratsStop = false;
    if (step.rats && next.begun) {
      const gang = stepRats(step.rats, next.rats, view, dt, {key:step.rats.id ?? step.id ?? 'repair', place:step.rats.place ?? joints[0], finished:done});
      next.rats = gang.state; ratsStop = gang.stopping;
      events.push(...gang.events); requests.push(...gang.requests);
    }
    if (view.fighter?.knockedDown && !done) {
      // Down: the turns on this joint are lost, the finished joints are kept, and the driver gets up where they fell.
      if (!state.down) {
        next.downs += 1; next.turn = 0;
        events.push({type:'repairDown', cue:REPAIR_CUES.repairDown, index:next.index, callout:'You are knocked down. Get up and start that one again.'});
        say(step.downLineId);
      }
      next.down = true;
      if (joint) requests.push({type:'marker', place:joint});
    } else if (joint) {
      requests.push({type:'marker', place:joint});
      const atJoint = (view.onFoot || step.requiresExit === false) && gap(walker, joint) <= (joint.radius ?? step.radius ?? REPAIR_RULE.jointRadius);
      // On Easy standing at the joint is enough: the wrench turns without F held.
      const turning = atJoint && !ratsStop && (view.interact === true || difficulty === 'easy' && step.easyNoHold !== false);
      if (atJoint && ratsStop) next.stopped = 'rats';
      if (turning) {
        if (!next.begun) { next.begun = true; events.push({type:'repairStarted', cue:REPAIR_CUES.repairStarted, index:next.index}); say(step.startedLineId); }
        next.working = true;
        next.turn += dt;
        if (next.turn >= repairSeconds(step, difficulty)) {
          events.push({type:'repairJoint', cue:REPAIR_CUES.repairJoint, id:joint.id ?? null, index:next.index, left:joints.length - next.index - 1});
          say(step.jointLineIds?.[next.index] ?? step.jointLineId);
          next.index += 1; next.turn = 0; next.working = false;
          const share = next.index / joints.length;
          for (const cue of step.sayAt ?? []) if (finite(cue.progress) && share >= cue.progress && !next.said.includes(cue.lineId)) {
            next.said = [...next.said, cue.lineId];
            say(cue.lineId);
          }
        }
      }
    }
  }
  const complete = next.index >= joints.length;
  if (complete && !next.reported) {
    next.reported = true;
    const sentence = next.downs === 0 ? `You fixed all ${NUMBER[joints.length] ?? joints.length} ${step.jointName ?? 'joint'}s.`
      : `You fixed all ${NUMBER[joints.length] ?? joints.length} ${step.jointName ?? 'joint'}s, and got knocked down ${next.downs === 1 ? 'once' : `${next.downs} times`}.`;
    events.push({type:'repairDone', cue:REPAIR_CUES.repairDone, joints:joints.length, downs:next.downs, sentence,
      result:{kind:'repair', joints:joints.length, downs:next.downs, sentence}});
  }
  requests.push({type:'gauge', id:step.id ?? 'repair', label:`${step.jointName ?? 'joint'}s done`, value:Math.min(next.index, joints.length), total:joints.length,
    share:joints.length ? Math.min(1, (next.index + (next.turn / repairSeconds(step, difficulty))) / joints.length) : 1});
  return {state:next, complete, events, requests};
}
