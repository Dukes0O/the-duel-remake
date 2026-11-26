import {MISSION_KINDS} from '../content/mission-kinds.js';
import {dropHold} from '../holds.js';

const kindOf = mission => Object.hasOwn(MISSION_KINDS, mission.kind) ? MISSION_KINDS[mission.kind] : null;

// Closing the arena discards the attempt. The thread's completed story effects are applied
// only on a named outcome, never by this cleanup.
export function abandonOpenMission(open) {
  const active = open?.parts.missions?.active;
  if (!active) return open;
  return {...open, holds: dropHold(open.holds, active.holder),
    parts: {...open.parts, threads: {...open.parts.threads, mission: null}, missions: {}}};
}

export const missionsPart = {
  id: 'missions',
  step(state, {world, view, events, leave}, dt) {
    let {active} = state;
    if (!active) {
      const start = events.find(event => event.type === 'threadMission');
      if (!start) return;
      const {id, holder, mission, route, thread, beat} = start;
      if (leave) return {release: holder, events: [{type: 'threadMissionCancelled', id}]};
      const kind = kindOf(mission);
      const started = kind.begin(mission, route, view);
      active = {id, holder, mission, thread, beat, state: started.state};
      return {state: {active}, requests: started.requests};
    }
    const {id, holder, mission} = active;
    const kind = kindOf(mission);
    const record = world.open.threads[active.thread];
    const interrupted = record?.end || record?.beat !== active.beat || leave || !view.openRoam || view.missionLeaving || view.combatWrecking;
    const next = interrupted ? {state: active.state} : kind.step(mission, active.state, view, dt);
    if (!interrupted && !next.outcome) return {...next, state: {active: {...active, state: next.state}}};
    return {
      state: {}, release: holder,
      events: [...(next.events ?? []), interrupted ?
        {type: 'threadMissionCancelled', id} : {type: 'threadMissionOutcome', id, outcome: next.outcome}],
      requests: [...(next.requests ?? []), ...kind.end(mission, next.state, view)],
    };
  },
};

export function prepareThreadMission(mission, place) {
  return kindOf(mission)?.prepare(mission, place) ?? null;
}
