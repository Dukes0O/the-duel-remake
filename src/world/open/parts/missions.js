import {MISSION_KINDS} from '../content/mission-kinds.js';
import {dropHold} from '../holds.js';

const kindOf = mission => Object.hasOwn(MISSION_KINDS, mission.kind) ? MISSION_KINDS[mission.kind] : null;

// Closing the arena discards the attempt. The thread's completed story effects are applied
// only on a named outcome, never by this cleanup.
export function abandonOpenMission(open) {
  const active = open?.parts.missions?.active;
  const journey = open?.parts.threads?.journey;
  if (!active && !journey) return open;
  const holds = dropHold(open.holds, active?.holder ?? journey.holder);
  const threads = {...open.parts.threads, mission: null};
  if (journey) {
    delete threads.dryPump;
    delete threads.journey;
  }
  return {...open, holds, parts: {...open.parts, threads, missions: {}}};
}

export const missionsPart = {
  id: 'missions',
  step(state, {world, view, events, leave, seconds}, dt) {
    let {active} = state;
    if (!active) {
      const start = events.find(event => event.type === 'threadMission');
      if (!start) return;
      const {id, holder, mission, route, thread, beat, keepHold, runAfterEnd} = start;
      if (leave) return {release: holder, events: [{type: 'threadMissionCancelled', id}]};
      const kind = kindOf(mission);
      const started = kind.begin(mission, route, view);
      active = {id, holder, mission, thread, beat, keepHold, runAfterEnd, state: started.state};
      return {state: {active}, requests: started.requests};
    }
    const {id, holder, mission} = active;
    const kind = kindOf(mission);
    const record = world.open.threads[active.thread];
    const current = kind.continues ? kind.continues(mission, record?.beat) : record?.beat === active.beat;
    const interrupted = (record?.end && !active.runAfterEnd) || !current || leave || !view.openRoam || view.missionLeaving ||
      (view.combatWrecking && !active.state.route?.road &&
        !['fight', 'rider-fight', 'outrun', 'escort', 'squeeze'].includes(mission.kind) && !mission.rule?.wrecked && !mission.rule?.recovery);
    const next = interrupted ? {state: active.state} : kind.step(mission, active.state, {...view, missionScrap: world.scrap}, dt, {record, world, seconds});
    if (next.events) next.events = next.events.map(event => ({...event, seconds}));
    if (!interrupted && !next.outcome) return {...next, state: {active: {...active, state: next.state}}};
    return {
      state: {}, ...(!active.keepHold ? {release: holder} : {}),
      choices: next.choices,
      events: [...(next.events ?? []), interrupted ?
        {type: 'threadMissionCancelled', id} : {type: 'threadMissionOutcome', id, outcome: next.outcome, ...(next.result ? {result: next.result} : {}),
          ...(mission.kind === 'heist' && next.state.seen && mission.cue ? {alarmPlayed: true} : {})}],
      requests: [...(next.requests ?? []), ...kind.end(mission, next.state, view)],
    };
  },
};

export function inheritThreadMission(mission, parent) {
  if (!mission.partOf) return mission;
  if (mission.partOf !== parent?.id || parent.partOf) return null;
  const {kind, by, rule, enemy} = parent;
  return {...mission, kind: mission.kind ?? kind, by: mission.by ?? by,
    rule: {...rule, ...mission.rule}, enemy: mission.enemy ?? enemy};
}

export function prepareThreadMission(mission, place) {
  return kindOf(mission)?.prepare(mission, place) ?? null;
}
