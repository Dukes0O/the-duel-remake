// The rules for missions in the open land. Each kind sets up its route and returns the events,
// requests, and outcome of a tick. The runner owns the lifetime and the hold.
import {ROAD_REQUEST} from '../encounter-rule.js';
import {distance} from '../site-rule.js';
import {sees} from '../../scablands-ways.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

const height = (view, point) => (view.missionHeightAt ?? scablandsSurfaceHeightAt)(point.x, point.z);
const atGround = (view, point) => ({...point, y: height(view, point)});
const marker = (view, point, radius) => ({type: 'marker', place: {...atGround(view, point), radius}});
const lookoutsRequest = (mission, posts) => ({type: 'missionLookouts', id: mission.id, group: mission.enemy, posts});
const isNear = (car, point, radius) => distance(car, point) <= radius;

export function lookoutSees(post, car, heightAt = scablandsSurfaceHeightAt) {
  if (!car) return false;
  if (Number.isFinite(post.heading)) {
    const bearing = Math.atan2(car.x - post.x, car.z - post.z);
    if (Math.cos(bearing - post.heading) < Math.cos(post.halfAngle ?? Math.PI / 3)) return false;
  }
  return sees(post, car, {heightAt, eye: post.eye ?? 1.8, range: post.range ?? Infinity, step: 4});
}

const reach = {
  prepare(mission, place) {
    const {rule = {}, by} = mission;
    const destination = place(rule.destination);
    const via = rule.via && place(rule.via);
    const posts = (rule.lookoutSpots ?? []).map(place);
    const starts = (rule.riderStarts ?? []).map(place);
    if (by !== 'car' || !destination || !(rule.within > 0) || (rule.via && (!via || !(rule.viaWithin > 0))) ||
        posts.length !== (rule.lookouts ?? 0) || posts.some(post => !post) ||
        starts.length !== (rule.riders ?? 0) || starts.some(start => !start) ||
        (posts.length && !(rule.seenAfterSeconds > 0))) return null;
    return {destination, via, posts, starts};
  },

  begin(mission, route, view) {
    const {destination, via, posts} = route;
    return {
      state: {route, sight: posts.map(() => 0), followed: !via, seen: false, sentRiders: false},
      requests: [
        ...(posts.length ? [lookoutsRequest(mission, posts.map(post => atGround(view, post)))] : []),
        {type: 'solids', id: mission.id + '/lookouts', solids: posts.filter(post => post.heap).map((post, i) => ({
          id: mission.id + '/heap/' + i, kind: 'wreck', shape: 'box', x: post.x, z: post.z,
          heading: post.heading ?? 0, base: height(view, post), ...post.heap,
        }))},
        marker(view, via ?? destination, via ? mission.rule.viaWithin : mission.rule.within),
      ],
    };
  },

  step(mission, state, view, dt) {
    const {rule} = mission;
    const {destination, via, posts, starts} = state.route;
    const car = view.carPosition;
    const driving = !view.onFoot && car;
    const next = {...state};
    const requests = [], events = [];
    if (!next.followed && driving && isNear(car, via, rule.viaWithin)) {
      next.followed = true;
      requests.push(marker(view, destination, rule.within));
      if (rule.viaLine) requests.push({type: 'say', lineId: mission.id + '/via', text: rule.viaLine});
    }
    if (!next.seen) {
      next.sight = posts.map((post, index) => lookoutSees(post, car, view.missionHeightAt)
        ? next.sight[index] + dt : 0);
      const watcher = next.sight.findIndex(seconds => seconds + 1e-9 >= rule.seenAfterSeconds);
      if (watcher >= 0) {
        next.seen = true;
        const position = atGround(view, posts[watcher]);
        events.push({type: 'threadMissionSpotted', id: mission.id, position, cue: mission.cue});
        if (rule.seenLine) requests.push({type: 'say', lineId: mission.id + '/spotted', text: rule.seenLine, urgent: true});
      }
    }
    // A passing encounter may still be driving out after the mission took its hold.
    // Send the riders when the road adapter is free so the request cannot be dropped.
    if (next.seen && starts.length && !next.sentRiders && !view.road) {
      next.sentRiders = true;
      requests.push({type: 'riders', id: mission.id, group: mission.enemy,
        vehicles: starts.map(start => ({start: atGround(view, start), home: start}))});
    }
    const reached = next.followed && driving && isNear(car, destination, rule.within);
    const pursuit = next.seen && starts.length &&
      (!state.sentRiders || (view.road?.id === mission.id && view.missionRidersFighting));
    return {state: next, requests, events, outcome: reached && !pursuit ? (next.seen ? 'seen' : 'unseen') : null};
  },

  end(mission, state, view) {
    return [
      {type: 'marker', place: null},
      {type: 'solids', id: mission.id + '/lookouts', solids: []},
      ...(state.route.posts.length ? [lookoutsRequest(mission, [])] : []),
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : []),
    ];
  },
};

// `partOf` scenes inherit the parent's lamps and timing. Each scene supplies its own targets
// and outcome names, so the rule can serve another heist without knowing its storyline.
export function heistLampPose(lamp, seconds) {
  const heading = (seconds / lamp.turnsIn + lamp.phase) * Math.PI * 2 + (lamp.offset ?? 0);
  return {...lamp, heading};
}

const heist = {
  prepare({rule}, place) {
    const {destination, pickup, retreat, eject, cover, lamps, riders} = rule;
    const target = place(destination);
    const stations = (lamps ?? []).map(({at, ...lamp}) => ({...lamp, position: place(at)}));
    const starts = (riders ?? []).map(place);
    if (!target || !(rule.within > 0) || stations.some(lamp => !lamp.position || !(lamp.turnsIn > 0)) ||
        starts.some(start => !start) || [pickup, retreat, eject, cover].some(at => at && !place(at))) return null;
    return {destination: target, pickup: pickup && place(pickup), retreat: retreat && place(retreat),
      eject: eject && place(eject), cover: cover && place(cover), lamps: stations, starts};
  },

  begin(mission, route, view) {
    return {state: {route, elapsed: mission.elapsed ?? 0, exposure: 0, litFor: 0, seen: !!mission.alarmed,
      carrying: false, sentRiders: false, distance: 0, wrench: 0},
    requests: [marker(view, route.pickup ?? route.destination, mission.rule.within)]};
  },

  step(mission, state, view, dt) {
    const {rule} = mission;
    const {route} = state;
    const next = {...state, elapsed: state.elapsed + dt};
    const requests = [], events = [];
    const finish = outcome => ({state: next, requests, events, outcome});
    if (rule.road) {
      if (view.combatWrecking || (view.jobEvents ?? []).some(event => event.type === 'riderFight' &&
          event.id === mission.id && ['lost', 'surrounded'].includes(event.outcome))) return finish(rule.wrecked);
      if (view.onFoot || !view.carPosition) return finish(null);
      if (!state.seen) return finish(rule.success);
      if (!state.sentRiders && !view.road) {
        next.sentRiders = true;
        next.lastCar = view.carPosition;
        requests.push({type: 'riders', id: mission.id, group: mission.enemy,
          vehicles: route.starts.map(start => ({start: atGround(view, start), home: start}))});
      }
      if (state.sentRiders) {
        next.lastCar = view.carPosition;
        next.distance += distance(state.lastCar, view.carPosition);
      }
      return finish(next.distance >= rule.pursuitMetres ? rule.spotted : null);
    }

    const point = view.fighter?.position ?? view.player?.position ?? view.player;
    if (!view.onFoot || !point) return finish(null);
    // The rim blocks the cones. No exposure accumulates in the staff corridor.
    const covered = route.cover && isNear(point, route.cover, rule.coverRadius);
    const inLight = !covered && !isNear(point, route.destination, rule.within) && route.lamps.some(lamp => {
      const {heading} = heistLampPose(lamp, state.elapsed + dt / 2);
      const at = {...lamp.position, heading, range: rule.range, halfAngle: rule.coneDegrees * Math.PI / 360};
      return lookoutSees(at, point, view.missionHeightAt);
    });
    next.litFor = inLight ? state.litFor + dt : 0;
    next.exposure += inLight ? dt : 0;
    next.seen ||= next.litFor + 1e-9 >= rule.seenSeconds;
    if (!state.seen && next.seen && mission.cue) events.push({type: 'threadCue', id: mission.id, cue: mission.cue});
    if (rule.caught && (next.exposure + 1e-9 >= rule.caughtSeconds ||
      (next.carrying && route.lamps.some(lamp => isNear(point, lamp.position, 1.2))))) {
      if (route.eject) requests.push({type: 'threadFootPosition', place: route.eject});
      return finish(rule.caught);
    }
    if (rule.escape && next.seen && isNear(point, route.retreat, rule.within)) return finish(rule.escape);
    if (route.pickup && !next.carrying && isNear(point, route.pickup, rule.within) && view.interact) {
      next.carrying = true;
      requests.push(marker(view, route.destination, rule.within));
      events.push({type: 'threadMissionPickup', id: mission.id});
    }
    const returned = (!route.pickup || next.carrying) && isNear(point, route.destination, rule.within);
    next.wrench = returned && view.wrench ? state.wrench + dt : 0;
    if (returned && (!rule.wrenchSeconds || next.wrench + 1e-9 >= rule.wrenchSeconds))
      return finish(next.seen ? rule.spotted : rule.success);
    return finish(null);
  },

  end(mission, _state, view) {
    return [{type: 'marker', place: null},
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : [])];
  },
};

export const MISSION_KINDS = Object.freeze({reach: Object.freeze(reach), heist: Object.freeze(heist)});
