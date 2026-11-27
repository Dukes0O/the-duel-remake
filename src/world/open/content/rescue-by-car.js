// The car can carry one load. Any remaining people wait at the pickup, or walk
// to a meeting place, until the driver finds them on a later trip.
import {distance} from '../site-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

const marker = (view, point, radius) => ({type: 'marker', place: {...point, radius,
  y: (view.missionHeightAt ?? scablandsSurfaceHeightAt)(point.x, point.z)}});

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

  begin({rule}, route, view) {
    const aboard = rule.startLoaded ? Math.min(rule.seats, rule.people) : 0;
    return {state: {route, remaining: rule.people - aboard, aboard, delivered: 0, searchingFor: 0,
      lampAge: rule.lampAge ?? 0, phase: aboard ? 'inbound' : 'pickup'},
      requests: rule.markRoute ? [marker(view, aboard ? route.home : route.pickup,
        aboard ? rule.homeWithin ?? 40 : rule.foundWithinMetres)] : undefined};
  },

  step(mission, state, view, dt) {
    const {id, rule} = mission, {route} = state;
    const next = {...state, lampAge: state.lampAge + dt};
    const events = [], requests = [];
    const finish = outcome => ({state: next, outcome, events, requests});
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
    if (!view.onFoot && distance(view.carPosition, at) <= rule.foundWithinMetres &&
        (rule.loadBelowMph === undefined || Math.abs(view.carSpeedMph ?? 0) <= rule.loadBelowMph)) {
      next.aboard = Math.min(rule.seats, state.remaining);
      next.remaining -= next.aboard;
      next.phase = 'inbound';
      if (rule.pickupMoment) events.push({type: 'threadMissionMoment', id, moment: rule.pickupMoment, position: at});
      if (rule.markRoute) requests.push(marker(view, route.home, rule.homeWithin ?? 40));
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
