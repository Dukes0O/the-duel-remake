// The rules for missions in the open land. Each kind sets up its route and returns the events,
// requests, and outcome of a tick. The runner owns the lifetime and the hold.
import {market} from './market-mission.js';
import {ROAD_REQUEST} from '../encounter-rule.js';
import {distance} from '../site-rule.js';
import {sees} from '../../scablands-ways.js';
import {BRAND_RULE} from '../../jobs/brand-rule.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {nameOf} from '../register.js';
import {rescueByCar} from './rescue-by-car.js';

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

// Named moments keep mission presentation in the authored rows.
function missionMoment(mission, name, requests, events, cue) {
  for (const [index, row] of [...(mission.lines ?? []), ...(mission.thoughts ?? [])].entries()) {
    if (row.moment !== name) continue;
    const text = row.words ? (nameOf(row.speaker) ?? row.speaker) + ': ' + row.words : row.thought;
    requests.push({type: 'say', lineId: mission.id + '/' + name + '/' + index, text});
    if (row.cue) events.push({type: 'threadMissionMoment', id: mission.id, moment: name, cue: row.cue});
  }
  if (cue) events.push({type: 'threadMissionMoment', id: mission.id, moment: name, cue});
}

function stepTimedReach(mission, state, view, dt) {
  const {rule} = mission, {destination, via} = state.route;
  const next = {...state, elapsed: state.elapsed + dt};
  const requests = [], events = [];
  for (const {after, name, cue} of rule.timedMoments ?? []) {
    if (state.elapsed < after && next.elapsed + 1e-9 >= after) missionMoment(mission, name, requests, events, cue);
  }
  if (rule.nearCue && !state.heard && isNear(view.carPosition, destination, rule.nearCue.within)) {
    next.heard = true;
    events.push({type: 'threadMissionMoment', id: mission.id, moment: 'near', cue: rule.nearCue.cue, position: destination});
  }
  const driving = !view.onFoot && view.carPosition;
  const late = rule.arrivalAfter && next.elapsed >= rule.arrivalAfter.seconds;
  const reached = driving && isNear(view.carPosition, destination, late ? rule.arrivalAfter.within ?? rule.within : rule.within);
  const stopped = reached && Math.abs(view.carSpeedMph ?? 0) <= 2;
  next.stoppedFor = stopped ? state.stoppedFor + dt : 0;
  if (reached && (!rule.holdSeconds || next.stoppedFor + 1e-9 >= rule.holdSeconds)) {
    next.followed = true;
    if (!state.followed && via) missionMoment(mission, 'turn-back', requests, events);
  }
  const returned = next.followed && (!via || driving && isNear(view.carPosition, via, rule.viaWithin));
  const timedOut = rule.failure && next.elapsed + 1e-9 >= rule.limitSeconds;
  return {state: next, requests, events, outcome: returned ? (late ? rule.arrivalAfter.outcome : rule.success) : timedOut ? rule.failure : null};
}

// Ordered route moments are optional. Ordinary reach missions keep their lookout/via rules.
function reachMoments(mission, state, view) {
  const {rule} = mission, {moments, recover} = state.route;
  const car = view.carPosition, requests = [], events = [];
  const step = state.momentIndex;
  const spot = moments[step];
  const finish = (next, outcome = null) => ({state: next, requests, events, outcome});
  if (view.onFoot || !car) return finish(state);
  if (view.combatWrecking || (rule.edgeDrop && step > 1 && moments.slice(step - 1, step + 1).some((row, i, remaining) => {
    const next = remaining[i + 1];
    if (!next) return false;
    const dx = next.point.x - row.point.x, dz = next.point.z - row.point.z;
    const span = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((car.x - row.point.x) * dx + (car.z - row.point.z) * dz) / span));
    const onRoute = {x: row.point.x + dx * t, z: row.point.z + dz * t};
    return distance(car, onRoute) > rule.edgeWidth && height(view, onRoute) - height(view, car) >= rule.edgeDrop;
  }))) {
    if (recover) requests.push({type: 'threadCarPosition', place: atGround(view, recover), armour: 0});
    return finish(state, rule.wrecked);
  }
  let warned = state.warned;
  // Allow enough time to hear the warning at the driver's current speed, without skipping the previous marker.
  const lead = step > 0 && step < moments.length - 1
    ? Math.max(7, Math.min(45, Math.abs(view.carSpeedMph ?? 0) * .44704 * (rule.callSecondsBeforeTurn ?? 0))) : 0;
  if (!warned && isNear(car, spot.point, spot.within + lead)) {
    warned = true;
    for (const [i, row] of (mission.lines ?? []).entries()) if (row.moment === spot.id) {
      const speaker = rule.label ?? row.as ?? nameOf(row.speaker) ?? row.speaker;
      requests.push({type: 'say', lineId: mission.id + '/' + spot.id + '/' + i, text: speaker + ': ' + row.words});
      events.push({type: 'threadMissionMoment', id: mission.id, moment: spot.id, cue: row.cue});
    }
  }
  if (!isNear(car, spot.point, spot.within)) return finish({...state, warned});
  if (step === moments.length - 1) return finish({...state, warned}, rule.success ?? 'unseen');
  const upcoming = moments[step + 1];
  requests.push(marker(view, upcoming.point, upcoming.within));
  return finish({...state, momentIndex: step + 1, warned: false});
}

const reach = {
  prepare(mission, place) {
    const {rule = {}, by} = mission;
    if (by === 'car' && (rule.destinations || rule.breakout)) return prepareRoad(rule, place);
    const destination = place(rule.destination);
    const via = (rule.returnTo ?? rule.via) && place(rule.returnTo ?? rule.via);
    const posts = (rule.lookoutSpots ?? []).map(place);
    const starts = (rule.riderStarts ?? []).map(place);
    if (by !== 'car' || !destination || !(rule.within > 0) || ((rule.via || rule.returnTo) && (!via || !(rule.viaWithin > 0))) ||
        posts.length !== (rule.lookouts ?? 0) || posts.some(post => !post) ||
        starts.length !== (rule.riders ?? 0) || starts.some(start => !start) ||
        (posts.length && !(rule.seenAfterSeconds > 0))) return null;
    // Named cue moments belong to timed reach; route moments carry places to visit in order.
    if (!rule.moments?.length || rule.moments.every(moment => typeof moment === 'string'))
      return {destination, via, posts, starts};
    const moments = rule.moments.map(row => ({...row, point: place(row.at)}));
    const recover = rule.recoverAt && place(rule.recoverAt);
    if (moments.some(row => !row.point || !(row.within > 0)) || rule.recoverAt && !recover ||
        (rule.edgeDrop && (!rule.wrecked || !(rule.edgeWidth > 0)))) return null;
    return {destination, via, posts, starts, moments, recover};
  },

  begin(mission, route, view) {
    if (route.road) return beginRoad(mission, route, view);
    const {destination, via, posts, moments} = route;
    if (moments) return {state: {route, momentIndex: 0, warned: false},
      requests: [marker(view, moments[0].point, moments[0].within)]};
    return {
      state: mission.rule.success ? {route, elapsed: 0, stoppedFor: 0, followed: false, heard: false} :
        {route, sight: posts.map(() => 0), followed: !via, seen: false, sentRiders: false},
      requests: [
        ...(posts.length ? [lookoutsRequest(mission, posts.map(post => atGround(view, post)))] : []),
        {type: 'solids', id: mission.id + '/lookouts', solids: posts.filter(post => post.heap).map((post, i) => ({
          id: mission.id + '/heap/' + i, kind: 'wreck', shape: 'box', x: post.x, z: post.z,
          heading: post.heading ?? 0, base: height(view, post), ...post.heap,
        }))},
        ...(mission.rule.marker === false ? [] : [marker(view, via ?? destination, via ? mission.rule.viaWithin : mission.rule.within)]),
      ],
    };
  },

  step(mission, state, view, dt) {
    if (state.route.moments) return reachMoments(mission, state, view);
    if (state.route.road) return stepRoad(mission, state, view, dt);
    const {rule} = mission;
    if (rule.success) return stepTimedReach(mission, state, view, dt);
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
      ...(state.route.road ? [{type: 'missionDestinations', id: mission.id, places: []}] : []),
      {type: 'solids', id: mission.id + '/lookouts', solids: []},
      ...(state.route.posts.length ? [lookoutsRequest(mission, [])] : []),
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : []),
    ];
  },
};

function prepareRoad(rule, place) {
  const destinations = (rule.destinations ?? []).map(row => ({id: row.id, at: place(row.at)}));
  const posts = (rule.lookoutSpots ?? []).map(key => {
    const at = place(key);
    return at && {...at, range: rule.range};
  });
  const starts = (rule.riderStarts ?? []).map(place);
  if ((!rule.breakout && (!destinations.length || !(rule.within > 0) || !(rule.seenAfterSeconds > 0))) ||
      destinations.some(row => !row.at) || posts.some(row => !row) || starts.some(row => !row) || !starts.length) return null;
  return {road: true, destinations, posts, starts};
}

function beginRoad(mission, route, view) {
  const {rule} = mission;
  const posts = rule.escaped ? [] : route.posts;
  const nearest = [...route.destinations].sort((a, b) => distance(view.carPosition, a.at) - distance(view.carPosition, b.at))[0];
  return {state: {route: {...route, posts}, sight: posts.map(() => 0), seen: !!rule.breakout, sentRiders: false, elapsed: 0},
    requests: [
      ...(posts.length ? [lookoutsRequest(mission, posts.map(post => atGround(view, post)))] : []),
      ...(nearest ? [marker(view, nearest.at, rule.within)] : []),
      {type: 'missionDestinations', id: mission.id, places: route.destinations.map(row =>
        ({id: row.id, ...atGround(view, row.at)}))},
    ]};
}

function stepRoad(mission, state, view, dt) {
  const {id, rule} = mission, {route} = state;
  const next = {...state, elapsed: state.elapsed + dt};
  const requests = [], events = [];
  const car = view.carPosition;
  if (!next.seen) {
    const seenAfter = view.greyWithAsh ? rule.ashGreyCarSeconds ?? rule.seenAfterSeconds : rule.seenAfterSeconds;
    next.sight = route.posts.map((post, index) => lookoutSees(post, car, view.missionHeightAt) ? state.sight[index] + dt : 0);
    const seen = next.sight.findIndex(seconds => seconds + 1e-9 >= seenAfter);
    if (seen >= 0) {
      next.seen = true;
      events.push({type: 'threadCue', id, position: atGround(view, route.posts[seen]), cue: rule.seenCue});
    }
  }
  if (car && next.seen && !next.sentRiders && (!view.road || (rule.breakout && view.road.outcome === 'surrounded'))) {
    next.sentRiders = true;
    if (rule.breakout) next.elapsed = 0;
    const starts = rule.breakout ? route.starts.map((entry, index) => {
      const angle = (view.checkpointHeading ?? 0) + 2 * Math.PI * index / route.starts.length;
      return {...entry, x: car.x + Math.sin(angle) * 28, z: car.z + Math.cos(angle) * 28};
    }) : route.starts;
    requests.push({type: 'riders', id, group: mission.enemy, replaceSurround: rule.breakout, box: rule.boxedSeconds && {seconds: rule.boxedSeconds, cars: 2},
      vehicles: starts.map(start => ({
        start: atGround(view, {...start, heading: Math.atan2(car.x - start.x, car.z - start.z)}),
        home: start,
      }))});
  }
  const result = view.missionRoadOutcome?.id === id && view.missionRoadOutcome.outcome;
  const boxed = view.missionRoadHeldSeconds + 1e-9 >= rule.boxedSeconds;
  const blocked = view.combatWrecking || boxed || result === 'lost' || result === 'surrounded';
  let outcome = null;
  if (rule.breakout) {
    if (blocked || state.sentRiders && next.elapsed >= 60) outcome = 'lost';
    else if (result === 'won' || (state.sentRiders && !view.road)) outcome = 'won';
  } else if (blocked) {
    outcome = 'surrounded';
  } else if (!view.onFoot && (!next.seen || state.sentRiders && !view.missionRidersFighting)) {
    outcome = route.destinations.find(row => isNear(car, row.at, rule.within))?.id ?? null;
  }
  return {state: next, requests, events, outcome};
}

// A search's only mutable facts are the clock, the current hiding place and
// how long each lamp has held an unbroken view of the person being searched for.
const search = {
  prepare(mission, place) {
    const {by, rule} = mission;
    const places = Object.fromEntries(Object.entries(rule.places ?? {}).map(([id, key]) => [id, place(key)]));
    const order = (rule.order ?? []).map(id => places[id]);
    const entries = (rule.entrances ?? []).map(place);
    if (by !== 'foot' || !places[rule.hiding] || !order.length || order.some(at => !at) ||
        entries.length !== 2 || entries.some(at => !at) || !(rule.searchers > 0) ||
        !(rule.secondsEachPlace > 0) || !(rule.foundAfterSecondsInLamp > 0)) return null;
    return {places, order, entry: entries[(rule.delay ?? 0) > 0 ? 1 : 0]};
  },
  begin(mission, route, view) {
    const {hiding, whistle, whistleSecondsBefore} = mission.rule;
    return {state: {route, hiding, elapsed: 0, sight: Array(mission.rule.searchers).fill(0),
      carrying: false, interact: !!view.interact, warned: !whistle || whistleSecondsBefore <= 0, visited: -1},
    requests: [{type: 'searchCast', id: mission.id, target: atGround(view, route.places[hiding]), lamps: []},
      marker(view, route.places[hiding], 4)]};
  },
  step(mission, state, view, dt) {
    const {id, rule} = mission, {route} = state;
    const {places, order, entry} = route;
    const next = {...state, elapsed: state.elapsed + dt, interact: !!view.interact};
    const player = view.fighter?.position ?? view.player?.position ?? view.player;
    const requests = [], events = [];
    const call = (cue, position) => events.push({type: 'threadCue', id, cue, position: atGround(view, position)});
    const activeAt = (rule.delay ?? 0) + (rule.whistle ? rule.whistleSecondsBefore : 0);
    if (!next.warned) {
      call(rule.whistleCue, entry);
      next.warned = true;
    }
    const time = next.elapsed - activeAt;
    const stage = Math.min(order.length, Math.max(-1, Math.floor(time / rule.secondsEachPlace)));
    const cleared = rule.order.slice(0, Math.max(stage, 0));
    const shelter = [rule.notSearched, ...cleared].filter(key => places[key]);
    if (view.onFoot && player && next.interact && !state.interact) {
      if (next.carrying) {
        const home = shelter.find(key => distance(player, places[key]) <= 4);
        if (home) { next.carrying = false; next.hiding = home; }
      } else if (next.hiding !== rule.notSearched && distance(player, places[next.hiding]) <= 5) {
        next.carrying = true;
      }
    }
    const target = next.carrying && player ? player : places[next.hiding];
    const lights = stage >= 0 && stage < order.length ? order.slice(stage, stage + 1).flatMap((goal, index) => {
      const from = order[stage + index - 1] ?? entry;
      const share = Math.min(1, (time % rule.secondsEachPlace) / Math.min(18, rule.secondsEachPlace / 2));
      const heading = Math.atan2(goal.x - from.x, goal.z - from.z);
      return next.sight.map((_, i) => {
        const side = (i - (next.sight.length - 1) / 2) * 4;
        return atGround(view, {x: from.x + (goal.x - from.x) * share + Math.cos(heading) * side - Math.sin(heading) * 4,
          z: from.z + (goal.z - from.z) * share - Math.sin(heading) * side - Math.cos(heading) * 4,
          heading, range: 13, halfAngle: Math.PI / 4});
      });
    }) : [];
    if (stage > state.visited && lights.length) {
      call(rule.lampCue, lights[0]);
      next.visited = stage;
    }
    const inShelter = !next.carrying && next.hiding === rule.notSearched;
    // Count only time during the current lamp interval, including the first tick after a shutter opens.
    const litFor = stage >= 0 ? Math.min(dt, Math.max(0, time % rule.secondsEachPlace)) : 0;
    next.sight = next.sight.map((seconds, i) => !inShelter && lights[i] && lookoutSees(lights[i], target, view.missionHeightAt)
      ? (stage === state.visited ? seconds : 0) + litFor : 0);
    requests.push({type: 'searchCast', id, target: atGround(view, target), lamps: lights});
    const safe = next.carrying ? cleared[0] : next.hiding;
    if (safe && (safe !== state.hiding || next.carrying !== state.carrying || stage !== state.visited))
      requests.push(marker(view, places[safe], 4));
    const found = next.sight.some(seconds => seconds + 1e-9 >= rule.foundAfterSecondsInLamp);
    return {state: next, requests, events, outcome: found ? 'found' : stage === order.length ? 'not-found' : null};
  },
  end(mission) {
    return [{type: 'marker', place: null}, {type: 'searchCast', id: mission.id, target: null, lamps: []}];
  },
};

const defend = {
  prepare({by, rule = {}}, place) {
    const at = place(rule.at), entries = (rule.entries ?? []).slice(0, rule.count).map(place);
    if (by !== 'foot' || !at || !Number.isInteger(rule.count) || rule.count < rule.drivenOutEndsIt ||
        !(rule.drivenOutEndsIt > 0) || !rule.weapons?.length || entries.length !== rule.count ||
        entries.some(entry => !entry)) return null;
    return {at, entries};
  },
  begin(mission, route, view) {
    return {state: {route, driven: [], elapsed: 0},
      requests: [{type: 'missionDefence', id: mission.id, entries: route.entries.map(entry => atGround(view, entry)),
        weapons: mission.rule.weapons}]};
  },
  step(mission, state, view, dt) {
    const {rule, id} = mission;
    const elapsed = state.elapsed + dt;
    const fighter = view.fighter?.position;
    const standing = (view.actors ?? []).filter(actor => actor.id.startsWith(id + '/') && !state.driven.includes(actor.id));
    const driven = standing.filter(actor => view.onFoot && ((rule.weapons.includes('brand') && view.brandSwing &&
        distance(fighter, actor.position) <= BRAND_RULE.swingRadius) ||
      (rule.weapons.includes('hand-flamer') && view.handFlamerHits?.includes(actor.id))));
    const approached = standing.filter(actor => !driven.includes(actor));
    const throwsAsh = view.onFoot && approached.some(actor => distance(actor.position, fighter) <= 2.2) &&
      elapsed >= (state.nextThrow ?? 0);
    const next = {...state, elapsed, driven: [...state.driven, ...driven.map(actor => actor.id)],
      nextThrow: throwsAsh ? elapsed + 1.5 : state.nextThrow};
    const requests = [
      ...driven.map(actor => ({type: 'retreatMissionFighter', id: actor.id, to: state.route.at})),
      ...approached.filter(() => fighter).map(actor => ({type: 'moveBrandAsh', id: actor.id, place: fighter})),
      ...(throwsAsh ? [{type: 'missionAsh'}] : []),
    ];
    const events = throwsAsh ? [{type: 'threadCue', id, cue: 'world.ash.throw', position: fighter}] : [];
    const lost = !view.onFoot || view.fighter?.knockedDown || elapsed >= mission.minutes * 60;
    return {state: next, requests, events, outcome: next.driven.length >= rule.drivenOutEndsIt ? 'won' : lost ? 'lost' : null};
  },
  end(mission, state) {
    const retreatTo = state.driven.length >= mission.rule.drivenOutEndsIt ? state.route.at : undefined;
    return [{type: 'missionDefence', id: mission.id, entries: [], retreatTo}];
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
  const escape = mission.rule?.escape && place(mission.rule.escape);
  return starts.length === mission.cars && starts.every(Boolean) && (!mission.rule?.escape || escape)
    ? {starts, ...(escape ? {escape} : {})} : null;
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
  begin(mission, route, view) {
    return {state: {route, sentRiders: false}, requests: route.escape ? [marker(view, route.escape, mission.rule.escapeWithin)] : []};
  },
  step(mission, state, view) {
    const {rule = {}} = mission;
    const next = {...state}, requests = sendRiders(mission, next, view, rule.boxedInSeconds ? {missionRule: rule} : {});
    const result = riderResult(mission, view);
    const lost = view.combatWrecking || result === 'lost' || result === 'surrounded';
    const escaped = !view.onFoot && state.route.escape && isNear(view.carPosition, state.route.escape, rule.escapeWithin);
    const outcome = lost ? rule.wrecked ?? 'lost' : result === 'won' || escaped ? rule.success ?? 'won' : null;
    if (!lost || !rule.recoveryShare) return {state: next, requests, outcome};
    requests.push({type: ROAD_REQUEST, action: 'mission-loss', id: mission.id});
    return {state: next, requests, outcome, events: [{type: 'threadMissionRecoveryPaid', id: mission.id}],
      choices: [{id: mission.id + '/recovery', effects: [{type: 'scrap', by: -Math.floor(view.missionScrap * rule.recoveryShare)}]}]};
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
const truckRequest = (mission, state, view) => ({type: 'solids', id: mission.id + '/truck', solids: [
  {id: mission.id + '/truck', kind: 'wreck', shape: 'box', x: state.truck.x, z: state.truck.z,
    halfX: 1.5, halfZ: 4, height: 3.4, base: height(view, state.truck), heading: state.truck.heading},
]});
function walkingEscortRoute(rule, place) {
  const start = place(rule.pickup), home = place(rule.home);
  return start && home && rule.stretches > 0 && rule.secondsEach > 0 && rule.followersLoseLampsMetres > 0
    ? {start, home, path: [start, home], posts: []} : null;
}

function stepWalkingEscort(mission, state, view, dt) {
  const {rule} = mission, {route} = state;
  const requests = [], events = [];
  const car = view.carPosition;
  const stopped = car && !view.onFoot && Math.abs(view.carSpeedMph ?? 0) <= 2;
  const gap = distance(car, state.walkers);
  const withinLamps = car && !view.onFoot && gap <= rule.followersLoseLampsMetres;
  const next = {...state};
  if (!withinLamps && !state.lampsLost && !rule.guide)
    missionMoment(mission, 'lamps-lost', requests, events);
  next.lampsLost = !withinLamps;
  // Each playable stretch is walked at about two knots; the long middle is passed over.
  const stretch = rule.secondsEach, total = rule.stretches * stretch;
  const length = distance(route.start, route.home);
  const pace = Math.min(1, length / total);
  if (withinLamps || rule.guide) next.walked = Math.min(total, state.walked + dt);
  const middle = (length - total * pace) / Math.max(1, rule.stretches - 1);
  const passed = Math.min(rule.stretches - 1, Math.floor((next.walked + 1e-9) / stretch));
  const metBeforeSkip = state.walked < stretch && next.walked + 1e-9 >= stretch && rule.stretches > 1;
  if (metBeforeSkip) {
    missionMoment(mission, 'between-stretches', requests, events);
    missionMoment(mission, 'second-stretch', requests, events);
  }
  const along = next.walked * pace + passed * middle;
  next.walkers = escortPoint(route.path, along);
  if (metBeforeSkip) requests.push({type: 'threadCarPosition', place: escortPoint(route.path, along + 6)});
  if (passed && stopped && view.interact && gap <= (rule.pickupWithin ?? 8)) next.riderPickedUp = true;
  const arrived = next.walked + 1e-9 >= total && isNear(car, route.home, rule.homeWithin ?? 40);
  if (arrived && rule.usesTheNight) events.push({type: 'threadMissionUsedNight', id: mission.id});
  return {state: next, requests, events, outcome: arrived ? (next.riderPickedUp ? rule.success : rule.walkedIn) : null};
}

const escort = {
  prepare(mission, place) {
    if (mission.rule?.stretches) return walkingEscortRoute(mission.rule, place);
    const riders = prepareRiders(mission, place), path = place(mission.rule?.path);
    if (!riders || !Array.isArray(path) || path.length < 2 || path.some(point => !point) ||
        !(mission.rule?.load?.count > 0)) return null;
    return {...riders, path, length: path.slice(1).reduce((sum, point, i) => sum + distance(path[i], point), 0)};
  },
  begin(mission, route, view) {
    if (mission.rule.stretches) return {state: {route, walkers: route.start, walked: 0, lampsLost: false, riderPickedUp: false}};
    const state = {route, elapsed: 0, metres: 0, truck: escortPoint(route.path, 0), speed: 0,
      tyres: mission.rule.load.count, hooks: {}, wrecked: [], moments: [], sentRiders: false};
    return {state, requests: [truckRequest(mission, state, view)]};
  },
  step(mission, state, view, dt) {
    if (mission.rule.stretches) return stepWalkingEscort(mission, state, view, dt);
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
      requests.push({type: 'say', lineId: mission.id + '/load/' + next.tyres,
        text: 'There are ' + next.tyres + ' ' + (mission.rule.load.what ?? 'items') + ' on the cart.'});
    requests.push(truckRequest(mission, next, view));
    const outcome = view.combatWrecking ? 'car-wrecked' : next.metres >= next.route.length
      ? next.tyres === mission.rule.load.count ? 'all-kept' : next.tyres > 0 ? 'some-kept' : 'none-kept' : null;
    return {state: next, requests, events, outcome};
  },
  end(mission, state, view) {
    if (mission.rule.stretches) return missionEnd(mission, state, view);
    return [...missionEnd(mission, state, view), {type: 'solids', id: mission.id + '/truck', solids: []},
      ...(view.combatWrecking && (view.missionHome ?? mission.rule.home)
        ? [{type: ROAD_REQUEST, action: 'recover-car', at: view.missionHome ?? mission.rule.home}] : [])];
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
    return {state: {route, sent: false, boxed: 0},
      requests: mission.rule.poleFallsAtKmh ? [marker({}, route.at, mission.rule.startWithin)] : []};
  },
  step(mission, state, view, dt) {
    const {rule} = mission, next = {...state};
    const requests = [];
    const strike = rule.poleFallsAtKmh && !state.poleDown && !view.onFoot && isNear(view.carPosition, state.route.at, rule.startWithin) &&
      (view.speedKmh ?? Math.abs(view.carSpeedMph ?? 0) * 1.609344) >= rule.poleFallsAtKmh;
    if (strike) next.poleDown = true;
    if (!next.sent && (!rule.poleFallsAtKmh || next.poleDown) && !view.road && view.carPosition) {
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
    const paid = outcome === 'lost' && rule.recoveryShare;
    const bounty = outcome === 'won' && rule.bountyPerWreck * Math.max(wrecks, result?.wrecks ?? 0);
    return {state: next, outcome, requests,
      events: [
        ...(paid ? [{type: 'threadMissionRecoveryPaid', id: mission.id}] : []),
        ...(strike ? [{type: 'threadMissionPoleDown', id: mission.id,
          position: atGround(view, state.route.at), cue: rule.poleCue}] : []),
      ],
      choices: paid ? [{
        id: mission.id + '/recovery', effects: [{type: 'scrap', by: -Math.floor(view.missionScrap * rule.recoveryShare)}],
      }] : bounty ? [{id: mission.id + '/wrecks', effects: [{type: 'scrap', by: bounty}]}] : []};
  },
  end(mission, state, view) {
    return [{type: 'marker', place: null},
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : []),
      ...(state.outcome === 'lost' ? [{type: ROAD_REQUEST, action: 'mission-loss', id: mission.id}] : [])];
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
    const {destination, pickup, retreat, eject, cover, lamps, riders, delivery} = rule;
    const target = place(destination);
    const stations = (lamps ?? []).map(({at, ...lamp}) => ({...lamp, position: place(at)}));
    const starts = (riders ?? []).map(place);
    if (!target || !(rule.within > 0) || stations.some(lamp => !lamp.position || !(lamp.turnsIn > 0)) ||
        starts.some(start => !start) || [pickup, retreat, eject, cover, delivery].some(at => at && !place(at))) return null;
    return {destination: target, pickup: pickup && place(pickup), retreat: retreat && place(retreat),
      eject: eject && place(eject), cover: cover && place(cover), lamps: stations, starts,
      ...(delivery ? {delivery: place(delivery)} : {})};
  },

  begin(mission, route, view) {
    return {state: {route, elapsed: mission.elapsed ?? 0, exposure: 0, litFor: 0, seen: !!mission.alarmed,
      carrying: false, sentRiders: false, distance: 0, wrench: 0},
    requests: [marker(view, route.pickup ?? route.destination, mission.rule.within),
      ...(route.delivery ? [lookoutsRequest(mission, route.starts.map(point => atGround(view, point)))] : [])]};
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

    if (route.delivery && (view.combatWrecking || ['lost', 'surrounded'].includes(riderResult(mission, view)))) {
      if (rule.recovery) requests.push({type: ROAD_REQUEST, action: 'mission-loss', id: mission.id});
      return finish(rule.caught);
    }
    if (state.delivering)
      return finish(!view.onFoot && isNear(view.fighter?.position ?? view.player?.position ?? view.player, route.delivery, rule.deliveryWithin)
        ? (state.carrying ? rule.success : rule.escape) : null);
    const point = view.fighter?.position ?? view.player?.position ?? view.player;
    if (!point || !view.onFoot) {
      if (route.delivery && point && isNear(point, route.destination, rule.within * 2) && (state.carrying || state.seen)) {
        next.delivering = true;
        requests.push(marker(view, route.delivery, rule.deliveryWithin));
      }
      return finish(null);
    }
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
    if (route.delivery && next.seen) {
      if (!state.seen) events.push({type: 'threadMissionAlert', id: mission.id, outcome: 'seen'});
      const riders = sendRiders(mission, next, view, {fightToEnd: false});
      if (riders.length) requests.push(lookoutsRequest(mission, []), ...riders);
      const cars = view.road?.id === mission.id ? view.road.cars : [];
      const heading = Math.atan2((view.carPosition?.x ?? point.x) - point.x, (view.carPosition?.z ?? point.z) - point.z);
      next.boxed = fightBoxed({...point, speedMph: 0}, cars, heading) ? (state.boxed ?? 0) + dt : 0;
      if (next.boxed + 1e-9 >= rule.boxedInSeconds) {
        if (rule.recovery) requests.push({type: ROAD_REQUEST, action: 'mission-loss', id: mission.id});
        return finish(rule.caught);
      }
      if (!state.seen && !next.carrying) requests.push(marker(view, route.destination, rule.within));
    }
    if (rule.caught && (next.exposure + 1e-9 >= rule.caughtSeconds ||
      (next.carrying && route.lamps.some(lamp => isNear(point, lamp.position, 1.2))))) {
      if (route.eject) requests.push({type: 'threadFootPosition', place: route.eject});
      return finish(rule.caught);
    }
    if (rule.escape && next.seen && isNear(point, route.retreat, rule.within)) return finish(rule.escape);
    const byPickup = route.pickup && !state.carrying && isNear(point, route.pickup, rule.within);
    if (rule.pickupWrenchSeconds)
      next.pickupWrench = byPickup && view.wrench ? (state.pickupWrench ?? 0) + dt : 0;
    if (byPickup && (rule.pickupWrenchSeconds ? next.pickupWrench + 1e-9 >= rule.pickupWrenchSeconds : view.interact)) {
      next.carrying = true;
      requests.push(marker(view, route.destination, rule.within));
      events.push({type: 'threadMissionPickup', id: mission.id});
      if (rule.pickupCue) events.push({type: 'threadCue', id: mission.id, cue: rule.pickupCue});
    }
    const returned = (!route.pickup || next.carrying) && isNear(point, route.destination, rule.within);
    next.wrench = returned && view.wrench ? state.wrench + dt : 0;
    if (returned && route.delivery) {
      next.delivering = true;
      requests.push(marker(view, route.delivery, rule.deliveryWithin));
      return finish(null);
    }
    if (returned && (!rule.wrenchSeconds || next.wrench + 1e-9 >= rule.wrenchSeconds))
      return finish(next.seen ? rule.spotted : rule.success);
    return finish(null);
  },

  end(mission, state, view) {
    return [{type: 'marker', place: null},
      ...(state.route.delivery ? [lookoutsRequest(mission, [])] : []),
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : [])];
  },
};

export const lookoutHeading = (post, turnsIn, seconds) => (post.heading ?? 0) + seconds / turnsIn * Math.PI * 2;

// A circling lamp watches a continuous stretch of a drive. A gap in the beam resets the clock.
const lookout = {
  prepare({rule, by}, place) {
    const via = place(rule.via), destination = place(rule.destination);
    const posts = rule.lookoutSpots.map(place), starts = rule.riderStarts.map(place);
    return by === 'car' && via && destination && posts.every(Boolean) && starts.every(Boolean) &&
      rule.within > 0 && rule.viaWithin > 0 && rule.seenAfterSeconds > 0 && rule.turnsIn > 0
      ? {via, destination, posts, starts} : null;
  },
  begin(mission, route, view) {
    return {state: {route, elapsed: 0, sight: 0, followed: false, sent: false, seen: false},
      requests: [marker(view, route.via, mission.rule.viaWithin),
        lookoutsRequest(mission, route.posts.map(post => atGround(view, post)))]};
  },
  step(mission, state, view, dt) {
    const {rule} = mission, {via, destination, posts, starts} = state.route;
    const next = {...state, elapsed: state.elapsed + dt};
    const car = !view.onFoot && view.carPosition;
    const requests = [], events = [];
    if (!state.followed && car && isNear(car, via, rule.viaWithin)) {
      next.followed = true;
      requests.push(marker(view, destination, rule.within));
    }
    if (rule.pursuit && view.combatWrecking) return {state: next, outcome: rule.wrecked};
    if (rule.pursuit && !state.sent && !view.road && car) {
      next.sent = true;
      requests.push({type: 'riders', id: mission.id, group: mission.enemy,
        vehicles: starts.map(start => ({start: atGround(view, start), home: start}))});
    }
    if (!state.seen && posts.length) {
      // Sample the sweep at short intervals even when a headless tick spans many seconds.
      const samples = Math.max(1, Math.ceil(dt / .125)), span = dt / samples;
      for (let i = 0; i < samples; i++) {
        const time = state.elapsed + (i + .5) * span;
        const watching = posts.find(post => lookoutSees({...post, heading: lookoutHeading(post, rule.turnsIn, time),
          halfAngle: rule.coneDegrees * Math.PI / 360}, car, view.missionHeightAt));
        next.sight = watching ? next.sight + span : 0;
        if (next.sight + 1e-9 >= rule.seenAfterSeconds && watching) {
          next.seen = true;
          events.push({type: 'threadCue', id: mission.id, position: atGround(view, watching), cue: mission.cue});
          return {state: next, requests, events, outcome: 'seen'};
        }
      }
    }
    const reached = next.followed && car && isNear(car, destination, rule.within);
    return {state: next, requests, events, outcome: reached ? 'not-seen' : null};
  },
  end(mission, _state, view) {
    return [{type: 'marker', place: null}, lookoutsRequest(mission, []),
      ...(view.road?.id === mission.id ? [{type: ROAD_REQUEST, action: 'leave', id: mission.id}] : [])];
  },
};

const SQUEEZE_RATE = 3;
const SQUEEZE_LINE_WIDTH = 5;
const SQUEEZE_BLOCK_RADIUS = 4;
const approach = (distance, speed, dt) => Math.max(0, distance - speed * dt);
const lateralPoint = (at, side) => ({...at,
  x: at.x + Math.cos(at.heading) * side, z: at.z - Math.sin(at.heading) * side});

function squeezeActors(mission, state, view) {
  const carts = state.carts.map(cart => ({...atGround(view, lateralPoint(cart.at, cart.offset)), car: cart.car}));
  const riders = state.riders.map(rider => {
    const cart = state.carts[rider.target];
    const point = lateralPoint(cart.at, cart.offset + rider.side * rider.gap);
    return {...atGround(view, point), heading: cart.at.heading + rider.side * Math.PI / 2};
  });
  const solids = [...carts, ...riders].map((row, i) => ({id: mission.id + '/' + i,
    kind: 'prop', shape: 'box', x: row.x, z: row.z, base: row.y, heading: row.heading,
    halfX: 1.05, halfZ: 2.35, height: 1.65}));
  return [lookoutsRequest(mission, [...carts, ...riders]), {type: 'solids', id: mission.id, solids}];
}

const squeeze = {
  prepare({by, rule}, place) {
    const at = place(rule.at), passage = place(rule.passage);
    const carts = rule.carts.map(cart => ({...cart, at: typeof cart.at?.x === 'number' ? cart.at : place(cart.at)}));
    return by === 'car' && at && passage && carts.length >= 2 && carts.every(cart => cart.at) &&
      rule.standing >= 3 && rule.outOfLineSeconds > 0 && rule.promiseMetres > 0 ? {at, passage, carts, posts: []} : null;
  },
  begin(mission, route, view) {
    const {rule} = mission;
    const carts = [...route.carts].sort((a, b) => Number(b.promise) - Number(a.promise) || Number(b.priority) - Number(a.priority))
      .map(cart => ({...cart, offset: 0, outside: 0, kept: cart.promise}));
    const riders = Array.from({length: 2 + (rule.warned ? rule.extraCarsIfWarned : 0)}, (_, index) => ({
      target: Math.min(carts.length - 1, Math.floor(index / 2)), side: index % 2 ? 1 : -1, gap: 26 + 6 * (index % 2),
    }));
    const state = {route, carts, riders, elapsed: 0, offered: false, stayed: false, weapons: {...view.missionWeapons}};
    return {state, requests: squeezeActors(mission, state, view)};
  },
  step(mission, state, view, dt) {
    const {rule} = mission;
    const weapons = {...view.missionWeapons};
    const finish = (outcome, next, requests = [], events = []) => ({state: {...next, weapons}, outcome,
      requests, events, result: {kept: next.carts.filter(cart => cart.kept).map(cart => cart.id),
        broken: next.carts.filter(cart => cart.promise && !cart.kept).map(cart => cart.id)}});
    if (view.missionShot || Object.entries(weapons).some(([id, time]) => time > (state.weapons[id] ?? 0) + 1e-6))
      return finish('shooting-first', state);
    if (view.combatWrecking) return finish('broke', {...state,
      carts: state.carts.map(cart => ({...cart, kept: false}))});
    const choice = view.jobEvents?.find(event => event.type === 'talkChoice' && event.scene === mission.id + '/offer');
    const accepted = choice?.id === mission.id + '/drive-through';
    if (accepted || state.accepted) {
      const crossed = !view.onFoot && isNear(view.carPosition, state.route.passage, rule.offerWithin / 3);
      return finish(crossed ? 'sold' : null, {...state, accepted: true},
        accepted ? [marker(view, state.route.passage, rule.offerWithin / 3)] : []);
    }
    const stayed = state.stayed || choice?.id === mission.id + '/stay';
    if (state.offered && !stayed) return finish(null, state);
    const elapsed = state.elapsed + dt;
    const car = !view.onFoot && view.carPosition;
    const riders = state.riders.map(rider => {
      const cart = state.carts[rider.target];
      const mid = lateralPoint(cart.at, cart.offset + rider.side * Math.max(3, rider.gap / 2));
      const blocked = distance(mid, car) <= SQUEEZE_BLOCK_RADIUS;
      return {...rider, gap: blocked ? 10 : Math.max(4, approach(rider.gap, 7, dt)), blocked};
    });
    const carts = state.carts.map((cart, index) => {
      const pressure = riders.filter(rider => rider.target === index && !rider.blocked && rider.gap < 9);
      // The buggies steer the threatened cart toward the bucket from either side.
      const defended = riders.some(rider => rider.target === index && rider.blocked);
      const offset = pressure.length && !defended ? Math.min(12, cart.offset + SQUEEZE_RATE * dt) : approach(cart.offset, 5, dt);
      const outside = offset <= SQUEEZE_LINE_WIDTH ? 0 : cart.outside + Math.min(dt,
        cart.offset > SQUEEZE_LINE_WIDTH ? dt : (offset - SQUEEZE_LINE_WIDTH) / SQUEEZE_RATE);
      const kept = cart.kept && (!pressure.length || distance(car, lateralPoint(cart.at, offset)) <= rule.promiseMetres);
      return {...cart, offset, outside, kept};
    });
    const displaced = carts.find(cart => cart.outside + 1e-9 >= rule.outOfLineSeconds);
    const next = {...state, carts, riders, elapsed, stayed};
    const requests = squeezeActors(mission, next, view);
    if (displaced) return finish('broke', {...next,
      carts: carts.map(cart => ({...cart, kept: cart.id === displaced.id ? false : cart.kept}))}, requests);
    if (!state.offered && elapsed >= rule.offerAfter) {
      next.offered = true;
      return finish(null, next, requests, [{type: 'threadMissionOffer', id: mission.id}]);
    }
    const hold = rule.holdSeconds - (rule.standing - 3) * rule.lessForEachBeyondThree;
    return finish(elapsed >= hold ? 'held' : null, next, requests);
  },
  end(mission) {
    return [lookoutsRequest(mission, []), {type: 'solids', id: mission.id, solids: []}, {type: 'marker', place: null}];
  },
};

// An ordered drive ends at the last stop. Each stop can play authored lines, thoughts and a cue.
const drive = {
  prepare({by, rule = {}}, place) {
    if (by !== 'car' || !rule.success || !rule.moments?.length) return null;
    const moments = rule.moments.map(row => ({...row, point: place(row.at)}));
    if (moments.some(row => !row.id || !row.point || !(row.within > 0)) ||
        new Set(moments.map(row => row.id)).size !== moments.length) return null;
    return {moments, posts: []};
  },
  begin(mission, route, view) {
    const {point, within} = route.moments[0];
    return {state: {route, index: 0}, requests: [marker(view, point, within)]};
  },
  step(mission, state, view) {
    const {rule, id} = mission;
    if (view.combatWrecking && rule.wrecked) return {state, outcome: rule.wrecked};
    const {moments} = state.route;
    const stop = moments[state.index];
    if (view.onFoot || !isNear(view.carPosition, stop.point, stop.within)) return {state};
    const requests = [], events = [{type: 'threadMissionMoment', id, moment: stop.id, position: stop.point}];
    missionMoment(mission, stop.id, requests, events, stop.cue);
    const next = moments[state.index + 1];
    if (next) requests.push(marker(view, next.point, next.within));
    return {state: {...state, index: state.index + 1}, requests, events, outcome: next ? null : rule.success};
  },
  end() {
    return [{type: 'marker', place: null}];
  },
};

export const MISSION_KINDS = Object.freeze({
  reach: Object.freeze(reach),
  onfoot: Object.freeze(search),
  defend: Object.freeze(defend),
  'rider-fight': Object.freeze(riderFight),
  outrun: Object.freeze(outrun),
  escort: Object.freeze(escort),
  fight: Object.freeze(fight),
  heist: Object.freeze(heist),
  market: Object.freeze(market),
  lookout: Object.freeze(lookout),
  squeeze: Object.freeze(squeeze),
  rescue: Object.freeze(rescueByCar),
  drive: Object.freeze(drive),
});
