// The rules for missions in the open land. Each kind sets up its route and returns the events,
// requests, and outcome of a tick. The runner owns the lifetime and the hold.
import {ROAD_REQUEST} from '../encounter-rule.js';
import {distance} from '../site-rule.js';
import {sees} from '../../scablands-ways.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {nameOf} from '../register.js';

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

const riderResult = (mission, view) => (view.jobEvents ?? []).find(event => event.type === 'riderFight' && event.id === mission.id)?.outcome;
const roadFree = (mission, view) => !view.road || view.road.id === mission.id;
const missionEnd = (mission, state, view) => [
  {type: 'marker', place: null},
  ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : []),
];
function prepareRiders(mission, place) {
  const starts = (mission.rule?.riderStarts ?? []).map(place);
  return starts.length === mission.cars && starts.every(Boolean) ? {starts} : null;
}
function sendRiders(mission, state, view, extra = {}) {
  if (state.sentRiders || !roadFree(mission, view)) return [];
  state.sentRiders = true;
  return [{type: 'riders', id: mission.id, group: mission.enemy, fightToEnd: true,
    firstCarStanding: mission.rule?.firstCarStanding === true, ...extra,
    vehicles: state.route.starts.map(start => ({start: atGround(view, start), home: start}))}];
}

const riderFight = {
  prepare: prepareRiders,
  begin(mission, route) { return {state: {route, sentRiders: false}, requests: []}; },
  step(mission, state, view) {
    const next = {...state}, requests = sendRiders(mission, next, view);
    const result = riderResult(mission, view);
    return {state: next, requests, outcome: view.combatWrecking || result === 'lost' || result === 'surrounded'
      ? 'lost' : result === 'won' ? 'won' : null};
  },
  end: missionEnd,
};

const outrun = {
  prepare: prepareRiders,
  begin(mission, route, view) {
    return {state: {route, start: {...view.carPosition}, elapsed: 0, sentRiders: false}, requests: []};
  },
  step(mission, state, view, dt) {
    const next = {...state, elapsed: state.elapsed + dt}, requests = sendRiders(mission, next, view);
    const result = riderResult(mission, view);
    return {state: next, requests, outcome: view.combatWrecking || result === 'lost' || result === 'surrounded'
      ? 'caught' : result === 'won' || !view.onFoot && next.elapsed >= mission.minutes * 60 &&
        distance(next.start, view.carPosition) >= (mission.rule?.awayMetres ?? 1000) ? 'away' : null};
  },
  end: missionEnd,
};

export function escortPoint(path, metres) {
  let left = metres;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i], span = distance(a, b);
    if (left <= span || i === path.length - 1) {
      const share = span ? Math.min(1, left / span) : 1;
      return {x: a.x + (b.x - a.x) * share, z: a.z + (b.z - a.z) * share,
        heading: Math.atan2(b.x - a.x, b.z - a.z)};
    }
    left -= span;
  }
  return {...path[0], heading: 0};
}
const truckRequest = (mission, state, view) => ({type: 'missionTruck', id: mission.id,
  position: atGround(view, state.truck), heading: state.truck.heading, tyres: state.tyres, speed: state.speed});
const escort = {
  prepare(mission, place) {
    const riders = prepareRiders(mission, place), path = place(mission.rule?.path);
    if (!riders || !Array.isArray(path) || path.length < 2 || path.some(point => !point) ||
        !(mission.rule?.load?.count > 0)) return null;
    return {...riders, path, length: path.slice(1).reduce((sum, point, i) => sum + distance(path[i], point), 0)};
  },
  begin(mission, route, view) {
    const state = {route, elapsed: 0, metres: 0, truck: escortPoint(route.path, 0), speed: 0,
      tyres: mission.rule.load.count, hooks: {}, wrecked: [], moments: [], sentRiders: false};
    return {state, requests: [truckRequest(mission, state, view)]};
  },
  step(mission, state, view, dt) {
    const next = {...state, hooks: {...state.hooks}, wrecked: [...state.wrecked], moments: [...state.moments],
      elapsed: state.elapsed + dt};
    const requests = [], events = [];
    const moment = (name, repeat = false) => {
      if (!repeat && next.moments.includes(name)) return;
      if (!repeat) next.moments.push(name);
      for (const [index, row] of (mission.lines ?? []).entries()) if (row.moment === name) {
        requests.push({type: 'say', lineId: mission.id + '/' + name + '/' + index,
          text: (nameOf(row.speaker) ?? row.speaker) + ': ' + row.words});
        events.push({type: 'threadMissionMoment', id: mission.id, moment: name, cue: row.cue});
      }
    };
    next.speed = 3 + 9 * Math.min(1, next.metres / 1000);
    next.metres = Math.min(next.route.length, next.metres + next.speed * dt);
    next.truck = escortPoint(next.route.path, next.metres);
    if (next.elapsed >= 30) {
      const sent = sendRiders(mission, next, view, {escort: mission.id});
      requests.push(...sent);
      if (sent.length) moment('buggies-seen');
    }
    const cart = {x: next.truck.x - Math.sin(next.truck.heading) * 8,
      z: next.truck.z - Math.cos(next.truck.heading) * 8};
    for (const car of view.road?.id === mission.id ? view.road.cars : []) {
      if (car.wrecked && !next.wrecked.includes(car.id)) { next.wrecked.push(car.id); moment('buggy-wrecked'); }
      const beside = !car.wrecked && car.fighting !== false && distance(car, cart) <= 8 &&
        Math.abs((car.speed ?? next.speed) - next.speed) < 6;
      next.hooks[car.id] = beside ? (next.hooks[car.id] ?? 0) + dt : 0;
      while (next.hooks[car.id] >= 4 && next.tyres > 0) {
        next.hooks[car.id] -= 4;
        next.tyres = Math.max(0, next.tyres - mission.rule.load.lostAtATime);
        moment('tyres-lost', true);
      }
    }
    if (next.route.length - next.metres <= 150) moment('crossing-seen');
    if (next.tyres !== state.tyres || !state.elapsed)
      requests.push({type: 'say', lineId: mission.id + '/load/' + next.tyres, text: 'There are ' + next.tyres + ' tyres on the cart.'});
    requests.push(truckRequest(mission, next, view));
    const outcome = view.combatWrecking ? 'car-wrecked' : next.metres >= next.route.length
      ? next.tyres === mission.rule.load.count ? 'all-kept' : next.tyres > 0 ? 'some-kept' : 'none-kept' : null;
    return {state: next, requests, events, outcome};
  },
  end(mission, state, view) {
    return [...missionEnd(mission, state, view), {type: 'missionTruck', id: mission.id, position: null},
      ...(view.combatWrecking ? [{type: ROAD_REQUEST, action: 'recover-car', at: view.missionHome ?? mission.rule.home}] : [])];
  },
};

export const MISSION_KINDS = Object.freeze({reach: Object.freeze(reach),
  'rider-fight': Object.freeze(riderFight), outrun: Object.freeze(outrun), escort: Object.freeze(escort)});
