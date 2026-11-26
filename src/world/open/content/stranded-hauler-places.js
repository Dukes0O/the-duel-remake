// The Hauler's places and physical choices. The authored story is read, never rewritten.
import hauler from '../../../story/threads/content/stranded-hauler.js';
import {LAND} from '../../scablands-names.js';
import {ROAD_NET, roadPointFrom} from '../../scablands-road.js';
import {nearestOnLine, sliceLine} from '../../scablands-ways.js';
import {OPEN_CHECKPOINTS} from '../checkpoint-rule.js';
import {distance, namedPick} from '../site-rule.js';
import {NIGHT_2_SITES} from '../../jobs/night-2-sites.js';
import {threadRule} from '../../../story/threads/thread-rule.js';

export const HAULER_ID = hauler.id;
export const haulerMarked = (world, mark) => world.ledger.marks.includes(HAULER_ID + '/' + mark);
export function haulerIsTrap(world) {
  const record = world.open.threads[HAULER_ID];
  return !!record && !haulerMarked(world, 'second-truck') && (haulerMarked(world, 'trap-set') ||
    !haulerMarked(world, 'entered/sign') && threadRule(hauler, {world}, record).ask(hauler.beats.sign.effects[0].when));
}
const anchor = LAND.at('tin-town');
const onLand = point => LAND.at('tin-town', point.x - anchor.x, point.z - anchor.z);
export const haulerGate = LAND.at('tin-town', NIGHT_2_SITES.gate.x - anchor.x + 12, NIGHT_2_SITES.gate.z - anchor.z + 18);
const bearing = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export function haulerOffset(at, along, side = 0) {
  return onLand({x: at.x + Math.sin(at.heading) * along + Math.cos(at.heading) * side,
    z: at.z + Math.cos(at.heading) * along - Math.sin(at.heading) * side});
}

function crossingFor(checkpoint) {
  const road = ROAD_NET.road(checkpoint.at.road), centre = checkpoint.position;
  const along = nearestOnLine(road.points, centre.x, centre.z).along;
  const junctions = ROAD_NET.roads.filter(row => row !== road).flatMap(row => [row.points[0], row.points.at(-1)])
    .map(point => nearestOnLine(road.points, point.x, point.z))
    .filter(point => point.distance < 35 && Math.abs(point.along - along) > 250);
  const junction = junctions.sort((a, b) => Math.abs(a.along - along) - Math.abs(b.along - along))[0];
  return junction && {road, centre, along, endAlong: junction.along};
}
const checkpoints = OPEN_CHECKPOINTS.filter(row => {
  if (!row.at.road || !row.who.some(who => who.group === 'traders') || distance(row.position, anchor) <= 1400) return false;
  const crossing = crossingFor(row), length = crossing && Math.abs(crossing.endAlong - crossing.along);
  return length >= 1000 && length <= 2600;
});
let cachedKey, cachedStop;
export function haulerStop(world) {
  const record = world.open.threads[HAULER_ID];
  if (!record) return null;
  const key = world.seed + '/' + record.began + '/' + haulerMarked(world, 'second-truck');
  if (key === cachedKey) return cachedStop;
  const first = namedPick(world.seed, HAULER_ID + '/night-' + record.began + '/checkpoint', checkpoints);
  const second = haulerMarked(world, 'second-truck');
  const checkpoint = second ? namedPick(world.seed, HAULER_ID + '/night-' + record.began + '/checkpoint-again',
    checkpoints.filter(row => row.at.road !== first.at.road)) : first;
  // Only trader stops with a real junction and a short escort road are eligible.
  const {road, centre, along, endAlong} = crossingFor(checkpoint);
  const direction = endAlong > along ? 1 : -1;
  const heading = bearing(roadPointFrom(road, centre.x, centre.z, -direction * 5),
    roadPointFrom(road, centre.x, centre.z, direction * 5));
  const at = {...onLand(centre), heading};
  const truck = {...haulerOffset(at, 0, 10), heading};
  const path = sliceLine(road.points, along, endAlong).map(onLand);
  path[0] = onLand(truck);
  cachedKey = key;
  return cachedStop = {checkpoint: checkpoint.id, road: road.id, truck, path,
    spots: {crest: onLand(roadPointFrom(road, centre.x, centre.z, -direction * 200)),
      verge: onLand(roadPointFrom(road, centre.x, centre.z, -direction * 90)),
      'high-ground': haulerOffset(at, -30, 120), axle: haulerOffset(truck, -2, -2.8),
      behind: haulerOffset(at, 40, 150), passed: onLand(roadPointFrom(road, centre.x, centre.z, direction * 90)),
      back: onLand(roadPointFrom(road, centre.x, centre.z, -direction * 340))},
    starts: [40, 85].map((along, index) => ({...haulerOffset(at, along, 150 + index * 15), heading})),
  };
}

export function haulerPlaces(world) {
  const stop = haulerStop(world);
  if (!stop) return {};
  return {sign: stop.truck, tally: stop.truck, 'hauler-axle': stop.spots.axle,
    'hauler-crossing': stop.path.at(-1), 'hauler-starts': stop.starts, 'hauler-path': stop.path,
    ...Object.fromEntries(stop.starts.map((point, i) => ['hauler-rider-' + i, point]))};
}

export function haulerAtGate(world) {
  if (!haulerMarked(world, 'gate-open')) return false;
  const parted = world.open.journal.find(row => row.type === 'thread' && row.key === HAULER_ID && row.after?.beat === 'parted');
  return !!parted && world.ledger.night > parted.night && (world.ledger.night - parted.night - 1) % 3 === 0;
}

export function haulerVisitor(world, seconds = 0) {
  const stop = haulerStop(world);
  if (!stop) return null;
  if (haulerAtGate(world)) return {...haulerGate, heading: stop.truck.heading};
  const road = ROAD_NET.road(stop.road);
  const point = roadPointFrom(road, road.points[0].x, road.points[0].z, (seconds * 8) % road.length);
  const ahead = roadPointFrom(road, point.x, point.z, 5);
  return {...onLand(point), heading: bearing(point, ahead)};
}

export function haulerReading(beat, item, context, state, dt) {
  const {world, view} = context, stop = haulerStop(world);
  const spot = beat.notes?.exploreSpots?.[item.id];
  if (!spot || !stop) return false;
  const point = view.player?.position ?? view.player;
  const close = distance(point, stop.spots[spot]) <= 28 && (spot !== 'high-ground' || view.onFoot);
  state.reading ??= {};
  const last = state.reading[spot];
  if (last?.at !== context.seconds) state.reading[spot] = {at: context.seconds, seconds: close ? (last?.seconds ?? 0) + dt : 0};
  return state.reading[spot].seconds + 1e-9 >= 2;
}

export function haulerAction(option, context) {
  const {world, view} = context, record = world.open.threads[HAULER_ID], stop = haulerStop(world);
  if (!stop || view.onFoot || !view.carPosition) return false;
  const car = view.carPosition, speed = Math.abs(view.speedKmh ?? 0);
  if (record.beat.endsWith('-road')) {
    if (option.id === 'stop') return distance(car, stop.truck) <= 35 && speed < 4;
    if (option.id === 'drive-past') return distance(car, stop.spots.passed) <= 55 && speed >= 15;
    if (option.id === 'turn-back') return false; // Driving away leaves the truck there until its two nights end.
    if (option.id === 'come-round-behind') return distance(car, stop.spots.behind) <= 35;
  }
  if (record.beat === 'trap-shut') {
    if (option.id === 'pay') return view.interact && speed < 4;
    if (option.id === 'fight') return distance(car, stop.spots.behind) < 125 && speed > 10;
    if (option.id === 'run') return distance(car, stop.truck) > 65 && distance(car, stop.spots.back) < 280;
  }
  if (record.beat === 'ridge') {
    if (option.id === 'ride-with-her') return distance(car, haulerOffset(stop.truck, 22)) < 22 && speed > 2;
    if (option.id === 'own-way') return distance(car, stop.truck) > 180;
  }
  return false;
}

export function haulerPeople(world, view) {
  if (!view.checkpointsEnabled) return [];
  const record = world.open.threads[HAULER_ID], stop = haulerStop(world);
  if (!record || !stop) return [];
  const gate = haulerAtGate(world);
  const roadside = !record.end && ['sign', 'hauler-road', 'hauler', 'owing', 'ridge', 'trap-road', 'trap-shut'].includes(record.beat);
  if (!gate && !roadside) return [];
  const trap = haulerIsTrap(world);
  const point = gate ? haulerGate : haulerOffset(stop.truck, 0, -3.5);
  const day = {kind: 'post', at: ['tin-town', point.x - anchor.x, point.z - anchor.z], task: 'stand'};
  return [{id: trap && !gate ? 'road-rat' : 'tally', figure: trap && !gate ? 'road-rat-lookout' : 'marigold',
    home: 'tin-town', routine: {day}, talk: gate && record.end ? 'tally' : null}];
}

export function haulerMission(mission, world) {
  const stop = haulerStop(world);
  return {...mission, rule: {...mission.rule, destination: 'hauler-crossing', path: 'hauler-path',
    home: haulerGate,
    riderStarts: stop.starts.map((_, i) => 'hauler-rider-' + i),
    firstCarStanding: world.open.threads[HAULER_ID].beat === 'trap-from-behind',
    load: {what: 'tyres', count: 40, lostAtATime: 10}, beginAt: stop.truck}};
}
