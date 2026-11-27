// A market follows the shared day. It times only leaving the yard and reaching the quarrel.
import {distance} from '../site-rule.js';

const REACH = 2.5;
const EPSILON = 1e-9;
const elapsed = (seconds, limit) => seconds + EPSILON >= limit;
const event = (mission, phase, cue, position) => ({
  type: 'threadMissionPhase', id: mission.id, phase, ...(cue ? {cue, position} : {}),
});

export const market = {
  prepare(mission, place) {
    const {rule, by} = mission;
    if (by !== 'foot' || !(rule?.radius > 0) || !(rule.noon > 0) ||
        !(rule.quarrelDelay >= 0) || !(rule.quarrelSeconds > 0) || !(rule.outsideSeconds > 0)) return null;
    const yard = place(rule.yard), gate = place(rule.gate), quarrel = place(rule.quarrel);
    return yard && gate && quarrel ? {yard, gate, quarrel} : null;
  },

  begin(mission, route) {
    const place = point => ({...point, radius: REACH});
    return {state: {route, phaseSeconds: 0, outside: 0, beat: mission.rule.opening,
      reached: false}, requests: [{type: 'marker', place: place(route.yard)}]};
  },

  continues(mission, beat) {
    return [mission.rule.opening, mission.rule.rider, mission.rule.dispute, mission.rule.glass, mission.rule.close].includes(beat);
  },

  step(mission, state, view, dt, {record, world}) {
    const {rule} = mission;
    const point = view.fighter?.position ?? view.player?.position ?? view.player;
    const inside = view.onFoot && distance(point, state.route.yard) <= rule.radius;
    const beat = record.beat;
    const same = beat === state.beat;
    const next = {...state, beat,
      phaseSeconds: (same ? state.phaseSeconds : 0) + dt, outside: inside ? 0 : state.outside + dt,
      reached: same && state.reached};
    const result = {state: next, events: []};
    if (elapsed(next.outside, rule.outsideSeconds)) return {...result, outcome: 'left'};
    const late = view.partOfDay === 'dusk' || view.partOfDay === 'dark';
    if (beat === rule.opening && (late || view.partOfDay === 'day' && (view.daySeconds ?? view.clockSec) >= rule.noon))
      result.events.push(event(mission, 'noon', rule.bell, next.route.gate));
    if (beat === rule.dispute && elapsed(next.phaseSeconds, rule.quarrelDelay)) {
      if (!same || state.phaseSeconds < rule.quarrelDelay) result.events.push(event(mission, 'voices', rule.voices, next.route.quarrel));
      const time = next.phaseSeconds - rule.quarrelDelay;
      const heated = rule.heatedMarks?.some(mark => world.ledger.marks.includes(mark));
      const limit = rule.quarrelSeconds - (heated ? rule.heatedBy : 0);
      if (inside && elapsed(limit, time) && distance(point, next.route.quarrel) <= REACH)
        next.reached = true;
      if (!next.reached && elapsed(time, limit))
        result.events.push(event(mission, rule.glassAtRisk ? 'glass' : 'missed'));
    }
    if (beat === rule.close && late) result.outcome = 'finished';
    return result;
  },

  end() {
    return [{type: 'marker', place: null}];
  },
};
