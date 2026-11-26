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

// Two real cars on opposite sides can pin a slow car. A broken side or a vertical gap breaks the hold.
export function fightBoxed(car, cars, heading = 0) {
  if (!car || Math.abs(car.speedMph ?? 0) >= 6) return false;
  const sides = new Set();
  for (const other of cars) {
    if (other.wrecked || distance(car, other) > 7.5 || Math.abs((car.y ?? 0) - (other.y ?? 0)) > 3) continue;
    const dx = other.x - car.x, dz = other.z - car.z;
    const side = dx * Math.cos(heading) - dz * Math.sin(heading);
    const ahead = dx * Math.sin(heading) + dz * Math.cos(heading);
    if (Math.abs(side) > 1 && Math.abs(ahead) < 4.5) sides.add(Math.sign(side));
  }
  return sides.has(-1) && sides.has(1);
}

const fight = {
  prepare(mission, place) {
    const at = place(mission.rule?.at);
    const starts = (mission.rule?.riderStarts ?? []).map(place);
    return mission.by === 'car' && at && mission.cars > 0 && starts.length === mission.cars && starts.every(Boolean)
      ? {at, starts, posts: []} : null;
  },
  begin(mission, route) {
    return {state: {route, sent: false, boxed: 0}};
  },
  step(mission, state, view, dt) {
    const {rule} = mission, next = {...state};
    const requests = [];
    if (!next.sent && !view.road) {
      next.sent = true;
      requests.push({type: 'riders', id: mission.id, group: mission.enemy, missionRule: rule,
        vehicles: state.route.starts.map(start => ({start: {...atGround(view, start),
          heading: Math.atan2(view.carPosition.x - start.x, view.carPosition.z - start.z)}, home: state.route.at}))});
    }
    const cars = view.road?.id === mission.id ? view.road.cars : [];
    const result = view.jobEvents?.find(event => event.type === 'riderFight' && event.id === mission.id);
    next.boxed = !view.onFoot && fightBoxed({...view.carPosition, speedMph: view.carSpeedMph}, cars, view.checkpointHeading)
      ? next.boxed + dt : 0;
    const wrecks = cars.filter(car => car.wrecked).length;
    const lost = view.combatWrecking || result && ['lost', 'surrounded'].includes(result.outcome) || next.boxed + 1e-9 >= rule.boxedInSeconds;
    const won = wrecks >= (rule.winWrecks ?? mission.cars) || result?.outcome === 'won';
    const outcome = lost ? 'lost' : won ? 'won' : null;
    next.outcome = outcome;
    return {state: next, outcome, requests,
      events: outcome === 'lost' && rule.recoveryShare ? [{type: 'threadMissionRecoveryPaid', id: mission.id}] : [],
      choices: outcome === 'lost' && rule.recoveryShare ? [{
      id: mission.id + '/recovery', effects: [{type: 'scrap', by: -Math.floor(view.missionScrap * rule.recoveryShare)}],
    }] : []};
  },
  end(mission, state, view) {
    return [{type: 'marker', place: null},
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : []),
      ...(state.outcome === 'lost' ? [{type: ROAD_REQUEST, action: 'mission-loss', id: mission.id}] : [])];
  },
};

export const MISSION_KINDS = Object.freeze({reach: Object.freeze(reach), fight: Object.freeze(fight)});
