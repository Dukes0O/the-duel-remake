// The car can carry one load. Any remaining people wait at the pickup, or walk
// to a meeting place, until the driver finds them on a later trip.
import {distance} from '../site-rule.js';

export const rescueByCar = {
  prepare({by, rule = {}}, place) {
    const home = place(rule.home), pickup = place(rule.pickup);
    const meeting = rule.meeting && place(rule.meeting.at);
    if (by !== 'car' || !home || !pickup || (rule.meeting && !meeting) ||
        !Number.isInteger(rule.seats) || rule.seats < 1 || !Number.isInteger(rule.people) || rule.people < 1 ||
        !(rule.foundWithinMetres > 0) || !rule.success ||
        (rule.people > rule.seats && (!(rule.searchSeconds > 0) || !(rule.lampSeconds >= 0) || !rule.failure))) return null;
    return {home, pickup, meeting, posts: []};
  },

  begin({rule}, route) {
    const aboard = rule.startLoaded ? Math.min(rule.seats, rule.people) : 0;
    return {state: {route, remaining: rule.people - aboard, aboard, delivered: 0, searchingFor: 0,
      lampAge: rule.lampAge ?? 0, phase: aboard ? 'inbound' : 'pickup'}};
  },

  step(mission, state, view, dt) {
    const {id, rule} = mission, {route} = state;
    const next = {...state, lampAge: state.lampAge + dt};
    const events = [];
    const finish = outcome => ({state: next, outcome, events});
    if (view.combatWrecking && rule.wrecked) return finish(rule.wrecked);
    if (state.phase === 'inbound') {
      if (next.remaining && state.lampAge < rule.lampSeconds && next.lampAge >= rule.lampSeconds && rule.lampOutCue)
        events.push({type: 'threadMissionMoment', id, moment: 'lamp-out', cue: rule.lampOutCue, position: route.pickup});
      if (view.onFoot || distance(view.carPosition, route.home) > (rule.homeWithin ?? 40)) return finish(null);
      next.delivered += next.aboard;
      next.aboard = 0;
      if (!next.remaining) return finish(next.reunion ?? rule.success);
      next.searchingFor = 0;
      next.phase = 'search';
      return finish(null);
    }
    const isSearch = state.phase === 'search';
    const at = isSearch && route.meeting ? route.meeting : route.pickup;
    if (!view.onFoot && distance(view.carPosition, at) <= rule.foundWithinMetres) {
      next.aboard = Math.min(rule.seats, state.remaining);
      next.remaining -= next.aboard;
      next.phase = 'inbound';
      if (isSearch) {
        next.reunion = rule.meeting?.outcome ?? rule.success;
        events.push({type: 'threadRescueReunion', id, outcome: next.reunion});
      }
    } else if (isSearch && !route.meeting) {
      next.searchingFor += Math.max(0, next.lampAge - Math.max(state.lampAge, rule.lampSeconds));
      if (state.lampAge < rule.lampSeconds && next.lampAge >= rule.lampSeconds && rule.lampOutCue)
        events.push({type: 'threadMissionMoment', id, moment: 'lamp-out', cue: rule.lampOutCue, position: at});
      if (next.searchingFor + 1e-9 >= rule.searchSeconds) return finish(rule.failure);
    }
    return finish(null);
  },

  end() {
    return [{type: 'marker', place: null}];
  },
};
