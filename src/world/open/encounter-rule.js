// OPEN-CHECKPOINTS: geometry and encounter transitions. Cars and captions are requested through the part.
import {LAND} from '../scablands-names.js';
import {ROAD_NET, roadPointFrom} from '../scablands-road.js';
import {NIGHT_2_SITES} from '../jobs/night-2-sites.js';
import {sees} from '../scablands-ways.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {isTrue} from './facts.js';
import {gap} from './checkpoint-rule.js';
import {keepsFeud, nameOf, nameRow} from './register.js';
import {ROAD_GROUPS, ROAD_LINES} from './content/checkpoints.js';

export const ROAD_REQUEST = 'checkpointRoad';
export const ROAD_CUES = {near: 'open.encounter.near', leave: 'open.encounter.leave', hail: 'open.flag.hail'};
const HAIL_RANGE = 60, BREAK_OFF_RANGE = 430;
const {repairRangeMeters: MEND_RANGE, wrenchRepairSeconds: MEND_SECONDS} = COMBAT_TUNING.foot;
const SCRAP_PER_WRECK = 10, MEND_SCRAP = 8, LIFT_SCRAP = 10, TOW_RANGE = 2000;

export function nearestRoadPoint(at) {
  let nearest = null;
  for (const road of ROAD_NET.roads) {
    const position = roadPointFrom(road, at.x, at.z, 0), distance = gap(position, at);
    if (!nearest || distance < nearest.distance) nearest = {road, position, distance};
  }
  return nearest;
}

const offset = (at, heading, along, side = 0) => ({
  x: at.x + Math.sin(heading) * along + Math.cos(heading) * side,
  z: at.z + Math.cos(heading) * along - Math.sin(heading) * side,
});
const bearing = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);
const roadRequest = (action, fields = {}) => ({type: ROAD_REQUEST, action, ...fields});
const cue = (name, position) => roadRequest('cue', {cue: ROAD_CUES[name], position});
const say = (line, text = ROAD_LINES[line]) => ({type: 'say', lineId: 'open/checkpoint/' + line, text});

function convoyGeometry(checkpoint, player, count, stopped) {
  const road = checkpoint.at.road && ROAD_NET.road(checkpoint.at.road);
  const centre = checkpoint.position, heading = player.heading ?? 0;
  const point = metres => road ? roadPointFrom(road, centre.x, centre.z, metres) : offset(centre, heading, metres);
  const ahead = bearing(point(-5), point(5));
  const direction = Math.cos(heading - ahead) >= 0 ? -1 : 1;
  const lane = road ? 5 : 9;
  const pose = (metres, side = lane) => {
    const at = point(metres), yaw = bearing(point(metres - 3 * direction), point(metres + 3 * direction));
    return {...offset(at, yaw, 0, side), heading: yaw};
  };
  return Array.from({length: count}, (_, index) => {
    // Start outside hail range, travel the centre line in the opposing lane, and finish well past the player.
    const startMetres = stopped ? 35 : -direction * (105 + 18 * index);
    const start = pose(startMetres, stopped ? 11 : lane);
    const route = Array.from({length: 45}, (_, n) => pose(startMetres + direction * (n + 1) * 35));
    return {start, route};
  });
}

function ambushStart(at, heading, side, index) {
  const candidates = [70, 90, 115, 145, 180, 220].map(distance =>
    offset(at, heading, distance + 14 * index, side));
  return candidates.find(point => !sees(at, point, {eye:1.8, step:5})) ?? candidates.at(-1);
}

function riderGeometry(at, heading, count, ambush = false) {
  return Array.from({length: count}, (_, index) => {
    const side = (index % 2 ? 1 : -1) * (ambush ? 48 : 16 + 11 * Math.floor(index / 2));
    const start = ambush ? ambushStart(at, heading, side, index) : offset(at, heading, 68 + 19 * index, side);
    const home = offset(at, heading, 2200, side * 3);
    return {start: {...start, heading: bearing(start, at)}, home};
  });
}

function baitTracks(start) {
  return [-1, 1].flatMap(side => Array.from({length: 10}, (_, index) => {
    const heading = start.heading + side * .65;
    return {...offset(start, heading, -index * 2.3, side * 2.2), heading};
  }));
}

export function startEncounter(checkpoint, number, draw, player) {
  const id = 'checkpoint/' + checkpoint.id + '/crossing-' + number;
  const {kind, group, count, bait} = draw;
  const vehicles = kind === 'fight' ? riderGeometry(player, player.heading ?? 0, count) :
    convoyGeometry(checkpoint, player, count, kind === 'trouble');
  const at = vehicles[0].start;
  const encounter = {id, group, phase: kind, bait, scout: draw.scout, at};
  const requests = [roadRequest('start', {id, group, phase: kind, scout: draw.scout, vehicles,
    tracks: bait ? baitTracks(at) : [],
    displayGroup: bait ? 'traders' : group}), cue('near', at)];
  if (kind === 'fight') requests.push(say(group + '-fight'));
  return {encounter, requests};
}

function leaving(encounter, requests = [], choices = []) {
  return {encounter: {...encounter, phase: 'leaving'}, choices,
    requests: [...requests, roadRequest('leave', {id: encounter.id}), cue('leave', encounter.at)]};
}

function provoked(encounter, cars) {
  const {id, group, bait, at} = encounter;
  const innocent = !keepsFeud(group);
  const choices = innocent ? [{id: id + '/attack', effects: [
    {type: 'mark', id: id + '/attacked-' + group}, {type: 'roadWord', by: 1},
  ]}] : [];
  const requests = [];
  if (innocent) requests.push(say('civilian-hit', nameOf(group) + ': ' + ROAD_LINES['civilian-hit']));
  if (bait) requests.push(say('bait'));
  requests.push(roadRequest('fight', {id, group, vehicles: bait ? riderGeometry(at, at.heading, 2, true) : [], bait}));
  if (!cars.length && !bait) return leaving(encounter, requests, choices);
  return {encounter: {...encounter, phase: 'fight'}, choices, requests};
}

function passing(encounter, view, cars) {
  const car = cars.find(candidate => gap(view.player, candidate) <= HAIL_RANGE);
  const {group, identified, hailed, told, id} = encounter;
  if (!car || (identified && !view.interact)) return {encounter};
  const requests = [], next = {...encounter};
  if (!identified) {
    requests.push(say('flag-' + group, 'The flag belongs to ' + nameOf(group) + '.'));
    next.identified = true;
  }
  if (view.interact && !view.interactWasHeld && !hailed) {
    next.hailed = true;
    requests.push(cue('hail', car));
    if (group === 'traders' || group === 'travellers') requests.push(say(group + '-hail'));
  } else if (view.interact && !view.interactWasHeld && hailed && !told && group === 'traders') {
    next.told = true;
    requests.push(say('tin-town'));
    return {encounter: next, requests, choices: [{id: id + '/told', effects: [
      {type: 'mark', id: 'checkpoint/trader-heard-of-tin-town'},
    ]}]};
  }
  return {encounter: next, requests};
}

function trouble(encounter, context, dt, cars) {
  const {view} = context;
  const {at, group, id} = encounter;
  const near = gap(view.player, cars[0] ?? at);
  if (encounter.bait && ((view.onFoot && near <= MEND_RANGE) || (near <= 9 && view.interact))) {
    return provoked(encounter, cars);
  }
  const greeted = encounter.greeted || near <= 16;
  const requests = !encounter.greeted && greeted && !encounter.bait ? [say('trouble')] : [];
  const time = !encounter.bait && view.onFoot && view.wrench && near <= MEND_RANGE ? (encounter.mending ?? 0) + dt : 0;
  if (time + 1e-9 >= MEND_SECONDS) return leaving(encounter, [say('mended')], [{id: id + '/mended', effects: [
    {type: 'scrap', by: MEND_SCRAP}, {type: 'favour', person: group, by: 1},
    {type: 'mark', id: 'checkpoint/helped-' + group},
  ]}]);
  return {encounter: {...encounter, greeted, mending: time}, requests};
}

export function stepEncounter(encounter, context, dt, held) {
  const {view} = context, {id, group, phase} = encounter;
  const cars = view.road?.id === id ? view.road.cars : [];
  const seen = cars.some(car => car.visible);
  if (phase === 'leaving') return seen ? {encounter} : {encounter: null, requests: [roadRequest('clear', {id})]};
  const result = view.jobEvents?.find(event => event.type === 'riderFight' && event.id === id);
  if (result?.outcome === 'won') {
    const effects = [];
    if (result.wrecks > 0) effects.push({type: 'scrap', by: SCRAP_PER_WRECK * result.wrecks});
    if (keepsFeud(group)) effects.push({type: 'feud', of: group, by: 1});
    return leaving(encounter, [], [{id: id + '/won', effects}]);
  }
  if (held) {
    // A passing convoy keeps its route. A fighter gives up its target and drives away.
    return leaving(encounter, phase === 'fight' ? [say('break-off')] : []);
  }
  if (phase === 'fight') {
    if (result?.outcome === 'lost' || result?.outcome === 'surrounded' ||
        (!view.combatWrecking && cars.length && cars.every(car => gap(view.player, car) > BREAK_OFF_RANGE))) {
      return leaving(encounter);
    }
    return {encounter};
  }
  if (cars.some(car => car.hitByPlayer)) return provoked(encounter, cars);
  if (cars.length && cars.every(car => gap(view.player, car) > BREAK_OFF_RANGE || car.routeDone)) {
    return leaving(encounter);
  }
  return phase === 'trouble' ? trouble(encounter, context, dt, cars) : passing(encounter, view, cars);
}

const lossCost = scrap => Math.min(40, Math.floor(scrap / 4));
export function stepRecovery(recovery, context, camps, serial) {
  const {view, world} = context;
  if (recovery?.phase === 'waiting-dawn') return view.hearthBanked ? {recovery: null,
    requests: [roadRequest('recover-car', {at: LAND.at('yard', 0, 16)})]} : {recovery};
  if (!recovery && !view.combatWrecking) return {recovery: null};
  if (!recovery) {
    const id = 'checkpoint/night-' + world.ledger.night + '/recovery-' + serial;
    const at = view.carPosition;
    const friend = [...camps, {people: 'tin-town', position: LAND.at('tin-town')}]
      .filter(camp => gap(camp.position, at) <= TOW_RANGE && isTrue({all: [
        {fact: 'word', of: camp.people, atLeast: 'Friendly'},
        {fact: 'favour', of: camp.people, atLeast: 1},
      ]}, world)).sort((a, b) => gap(a.position, at) - gap(b.position, at))[0];
    const effects = [{type: 'scrap', by: -lossCost(world.scrap)}];
    if (friend) {
      effects.push({type: 'favour', person: friend.people, by: -1});
      return {recovery: {phase: 'towed'}, choices: [{id, effects}],
        requests: [say('tow', nameOf(nameRow(friend.people).leader) + ': ' + ROAD_LINES.tow),
          roadRequest('recover-car', {at: NIGHT_2_SITES.car})]};
    }
    const road = nearestRoadPoint(at).position;
    return {recovery: {phase: 'walk', id, road}, choices: [{id, effects}],
      requests: [say('walk'), roadRequest('walk'), {type:'marker', place:{...road, radius:4}}]};
  }
  if (recovery.phase === 'towed') return {recovery: null};
  if (recovery.phase === 'walk' && view.onFoot && gap(view.player, recovery.road) <= 16) {
    return {recovery: {...recovery, phase: 'lift'}, requests: [say('lift')]};
  }
  if (recovery.phase === 'lift' && view.interact && !view.interactWasHeld && gap(view.player, recovery.road) <= 16) {
    return {recovery: {phase: 'waiting-dawn'}, choices: [{id: recovery.id + '/lift', effects: [
      {type: 'scrap', by: -LIFT_SCRAP},
    ]}], requests: [roadRequest('lift', {at: NIGHT_2_SITES.hearthFront.position})]};
  }
  return {recovery};
}
