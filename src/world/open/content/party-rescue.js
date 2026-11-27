// A driver distracts the vehicles while the party opens a pen, then escorts the freed people.
import {distance} from '../site-rule.js';
import {ROAD_REQUEST} from '../encounter-rule.js';
import {roadWay} from '../../scablands-ways.js';

const near = (a, b, metres) => distance(a, b) <= metres;
const addRiders = (mission, starts, target, extra = {}) => ({type: 'riders', id: mission.id, group: mission.enemy,
  vehicles: starts.map(start => ({start: {...start, heading: Math.atan2(target.x - start.x, target.z - start.z)}, home: start})),
  ...extra});
const ring = (place, radius) => ({type: 'marker', place: {...place, radius}});
const clearRiders = id => ({type: ROAD_REQUEST, action: 'clear', id});

export function partyRescue({escortPoint, missionMoment, height}) {
  const convoy = (mission, state, view) => ({type: 'missionConvoy', id: mission.id, truck: mission.rule.carries,
    people: mission.rule.people, allFreed: mission.rule.escortOnly === true, place: {...state.convoy, y: height(view, state.convoy)}});
  return {
    prepare({rule}, place) {
      const {entrance, lookout, pen, drain, chaseTo, home, via, riders, returnRiders} = rule;
      const [start, guardCar, gate, wayOut, turn, finish, bridge] = [entrance, lookout, pen, drain, chaseTo, home, via].map(place);
      const pursuit = riders.slice(0, rule.blocks ? Math.ceil(riders.length / 2) : riders.length).map(place);
      const returning = returnRiders.map(place);
      if ([start, guardCar, gate, wayOut, turn, finish, bridge, ...pursuit, ...returning].some(point => !point)) return null;
      const exit = rule.exitVia ? place(rule.exitVia) : [];
      const path = [start, ...exit, ...(roadWay(bridge, finish, {reach: 1800}) ?? [bridge, finish])];
      const length = path.slice(1).reduce((sum, point, i) => sum + distance(path[i], point), 0);
      return {start, guardCar, gate, wayOut, turn, finish, pursuit, returning, path, length, posts: []};
    },
    begin(mission, route) {
      if (mission.rule.escortOnly) {
        const convoy = escortPoint(route.path, 0);
        return {state: {route, phase: 'escort', escorted: 0, convoy, truck: convoy, speed: 0},
          requests: [ring(convoy, 40)]};
      }
      if (mission.rule.roundTrip) {
        const convoy = escortPoint([...route.path].reverse(), 0);
        return {state: {route, phase: 'outward', escorted: 0, convoy}, requests: [ring(convoy, 40)]};
      }
      return {state: {route, phase: 'approach', elapsed: 0, lured: 0, opening: 0, escorted: 0, sent: false,
        warned: false, holed: false}, requests: [ring(route.start, 40)]};
    },
    step(mission, state, view, dt) {
      const {id, rule} = mission, {route} = state;
      const car = view.carPosition, driver = view.fighter?.position ?? view.player?.position ?? view.player;
      const traffic = view.road?.id === id ? view.road.cars ?? [] : [];
      const requests = [], events = [];
      const next = {...state};
      const finish = (outcome = null, result) => ({state: next, requests, events, outcome, result});
      const caption = (key, text) => requests.push({type: 'say', lineId: id + '/' + key, text});
      const markRiderCount = () => {
        const alive = traffic.filter(row => !row.wrecked).length;
        if (rule.counted && traffic.length && alive !== state.lastCount) {
          next.lastCount = alive;
          caption('buggies/' + state.phase + '/' + alive,
            alive === 1 ? 'There is one buggy left.' : 'There are ' + alive + ' buggies left.');
        }
      };
      const beginEscort = () => {
        next.phase = 'escort';
        next.sent = false;
        next.convoy = next.truck = escortPoint(route.path, 0);
        next.speed = 0;
        requests.push(clearRiders(id), ring(next.convoy, 36));
        if (rule.guide) missionMoment(mission, 'guided', requests, events);
        missionMoment(mission, 'whistle', requests, events, rule.opening === 'rell' ? 'night.whistle' : 'open.pen.chain');
        caption('escort', rule.carries ? 'Ride beside Bess to Tin Town.' : 'Keep the water cart and the growers in your lamps.');
      };
      if (view.combatWrecking && rule.roundTrip) return finish(rule.wrecked);
      if (view.combatWrecking && ['approach', 'lookout', 'chase', 'pen'].includes(state.phase)) {
        const openTime = rule.opensAfter ?? 110;
        const rescued = state.elapsed >= rule.fallBackBefore && rule.opening && rule.people > 1
          ? Math.min(rule.people - 1, Math.floor(rule.people * state.opening / openTime)) : 0;
        return finish(rescued > 0 ? 'some-home' : 'none-home', {rescued});
      }
      if (state.phase === 'approach') {
        if (!view.onFoot && near(car, route.start, 41) && !view.road) {
          next.phase = 'lookout';
          requests.push(addRiders(mission, [route.guardCar], car, {firstCarStanding: true, fightToEnd: true}));
          caption('lookout', 'Wreck the lookout’s buggy.');
        }
      } else if (state.phase === 'lookout') {
        if (traffic.some(row => row.wrecked) || view.missionRoadOutcome?.id === id && view.missionRoadOutcome.outcome === 'won') {
          next.phase = 'chase';
          requests.push(clearRiders(id), ring(route.turn, 100));
          caption('chase', 'Draw the buggies away. Stay ahead of them and keep them close enough to follow.');
        }
      } else if (state.phase === 'chase') {
        if (!next.sent && !view.road && car && (!state.rally || near(car, route.start, 125))) {
          next.sent = true;
          requests.push(addRiders(mission, route.pursuit, car, {fightToEnd: true}));
        }
        markRiderCount();
        if (!state.sent || !car || view.onFoot) return finish();
        next.elapsed += dt;
        const alive = traffic.filter(row => !row.wrecked);
        const defeated = next.defeated = !!(state.defeated || traffic.length > 0 && alive.length === 0 ||
          view.missionRoadOutcome?.id === id && view.missionRoadOutcome.outcome === 'won');
        if (!next.sent || !traffic.length && !defeated) return finish();
        const gap = Math.min(...alive.map(row => distance(car, row)));
        const turning = alive.some(row => !row.fighting || distance(car, row) > rule.chaseWithin);
        if (turning && rule.watches && !next.warned) {
          next.warned = true;
          missionMoment(mission, 'turning', requests, events);
        }
        next.away = turning && !defeated ? (state.away ?? 0) + dt : 0;
        if (next.away >= 5) {
          next.sent = false;
          next.rally = true;
          next.warned = false;
          next.away = 0;
          requests.push(clearRiders(id), ring(route.start, 100));
        }
        const drawing = defeated || gap >= rule.safeGap && gap <= rule.chaseWithin && !turning;
        if (drawing) next.lured += dt;
        const canOpen = drawing && (defeated || !near(car, route.start, 85));
        if (canOpen) {
          const speed = rule.knowsWay ? 1 : .72;
          next.opening += rule.opening ? dt * speed / Math.max(1, rule.guards * .75) : 0;
        }
        if (next.lured >= rule.chaseSeconds) {
          if (rule.opening && next.opening >= (rule.opensAfter ?? 110)) beginEscort();
          else if (!rule.opening) {
            next.phase = 'pen';
            requests.push(clearRiders(id), ring(rule.knowsWay ? route.wayOut : route.gate, 12));
            caption('pen', 'Go back on foot and open the pen with the wrench.');
          }
        }
      } else if (state.phase === 'pen') {
        const place = rule.knowsWay ? route.wayOut : route.gate;
        next.opening = view.onFoot && view.wrench && near(driver, place, 3)
          ? state.opening + dt : 0;
        if (next.opening >= rule.chainSeconds * rule.guards) beginEscort();
      } else if (state.phase === 'escort' || state.phase === 'outward') {
        const outward = state.phase === 'outward';
        const path = outward ? [...route.path].reverse() : route.path;
        const duration = rule.escortSeconds * (rule.carries ? 1 : 3);
        const pace = Math.min(rule.carries ? 12 : 1.5, route.length / duration);
        const gap = rule.carries ? 65 : 36;
        if (near(driver, state.convoy, gap)) next.escorted = Math.min(duration, state.escorted + dt);
        const skip = route.length - pace * duration;
        const half = duration / 2;
        const travel = next.escorted * pace + (next.escorted >= half ? skip : 0);
        const crossing = skip > 0 && state.escorted < half && next.escorted >= half;
        next.convoy = next.truck = escortPoint(path, travel);
        next.speed = next.escorted > state.escorted ? pace : 0;
        if (crossing) {
          const ahead = escortPoint(path, Math.min(route.length, travel + 18));
          requests.push({type: view.onFoot ? 'threadFootPosition' : 'threadCarPosition', place: ahead});
          caption('far-road/' + state.phase, 'You come out together on the other side of the crossing.');
        }
        if (!rule.roundTrip && !next.sent && next.escorted >= half + 2 && !view.road && !crossing) {
          next.sent = true;
          const starts = route.returning.map((_, i) => {
            const p = escortPoint(path, Math.max(0, travel - 35));
            return {...p, x: p.x + Math.cos(p.heading) * (i ? 9 : -9), z: p.z - Math.sin(p.heading) * (i ? 9 : -9)};
          });
          requests.push(addRiders(mission, starts, state.convoy, {escort: id, fightToEnd: true}));
        }
        markRiderCount();
        next.holed ||= !rule.roundTrip && rule.carries && traffic.some(row => !row.wrecked && near(row, state.convoy, 10));
        requests.push(convoy(mission, next, view), ring(next.convoy, 30));
        if (next.escorted >= duration && near(driver, path.at(-1), 55)) {
          if (!outward) return finish(rule.roundTrip ? 'paid' : next.holed ? 'bess-holed' : 'all-home', {rescued: rule.people});
          next.phase = 'escort';
          next.escorted = 0;
        }
      }
      return finish();
    },
    end(mission) {
      return [clearRiders(mission.id), {type: 'missionConvoy', id: mission.id, place: null}, {type: 'marker', place: null}];
    },
  };
}
