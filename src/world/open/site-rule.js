import {namedThrow} from '../../story/ledger.js';
import {LAND} from '../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {sees} from '../scablands-ways.js';
import {isTrue} from './facts.js';
import {BUS_RING} from './content/market-day-places.js';
import {landSite, RADIO_HILL} from './content/sites.js';
import {siteNeed, mendedMark, deliveredMark, brokenMark} from './content/needs.js';

// Keep placement keyed to the land, and everything that happens in it keyed to the save.
export function namedPick(seed, name, rows) {
  return rows.find((row, index) => namedThrow({seed}, name, (index + 1) / rows.length)) ?? null;
}

export function sitePosition(siteId, landSeed) {
  const site = landSite(siteId);
  const where = site && namedPick(landSeed, 'open/site/' + siteId, site.where);
  return where ? LAND.at(...where.at) : null;
}

export const distance = (a, b) => a && b ? Math.hypot(a.x - b.x, a.z - b.z) : Infinity;

export function canFindSite(site, point, position, onFoot) {
  return distance(point, position) <= site.foundWithin && sees(point, position, {
    heightAt: scablandsSurfaceHeightAt, eye: onFoot ? 1.65 : 1.8, range: site.foundWithin, step: 4,
  });
}

export function localSitePoint(siteId, landSeed, offset) {
  const origin = sitePosition(siteId, landSeed);
  const x = origin.x + offset.x, z = origin.z + offset.z;
  return {x, z, y: scablandsSurfaceHeightAt(x, z)};
}

export function bearing(from, to) {
  const words = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return words[(8 + Math.round(Math.atan2(to.x - from.x, from.z - to.z) * 4 / Math.PI)) % 8];
}

export function visitNeed(site, world) {
  const {seed, ledger} = world;
  // An unfinished promise keeps its place until it is settled.
  const needs = site.needs.map(siteNeed);
  const promised = needs.find(need => isTrue({fact: 'promise', id: need.id}, world));
  if (promised) return promised;
  const eligible = needs.filter(need => (need.kind === 'mend' ? [mendedMark(need.id)] :
    [deliveredMark(need.id), brokenMark(need.id)]).every(id => !isTrue({fact: 'mark', id}, world)));
  // Retain the offer if the player returns on the same night after doing (or declining) it.
  const prefix = 'open/need-offered/';
  const offer = ledger.history.find(change => change.night === ledger.night &&
    change.type === 'mark' && change.key.startsWith(prefix + site.id + '/'));
  if (offer) return eligible.find(need => need.id === offer.key.slice(prefix.length, offer.key.lastIndexOf('/'))) ?? null;
  return namedPick(seed, 'open/need/' + site.id + '/night-' + ledger.night, eligible);
}

export function radioHillSolids() {
  return RADIO_HILL.structures
    .filter(row => row.height > .9)
    .map(row => ({...row, id: 'radio-hill-' + row.id}));
}

// Interaction spots from the merged Glasshouse layout, kept as plain data so the rules do not import its renderer.
const GLASSHOUSE_SPOTS = {
  pump: {x: 4.5, z: -7.8}, cart: {x: 7.6, z: -7.2}, tent: {x: 12.7, z: 3.8},
  stove: {x: .2, z: 10}, frames: {x: .5, z: 1.1}, marigold: {x: -6.4, z: 8.1},
  'hoe-1': {x: -10.5, z: -2.2}, 'hoe-2': {x: -5.5, z: 2.2}, 'hoe-3': {x: -3, z: -4.4},
  'frame-1': {x: -10, z: -4.4}, 'frame-2': {x: -7, z: -2.2}, 'frame-3': {x: -4, z: 0},
  'tent-west': {x: 11.5, z: 3.8}, 'frames-west': {x: -.7, z: 1.1}, 'row-end': {x: 1, z: -2.2},
  'car-stop': {x: -9, z: 19},
};
const SPOTS = {glasshouse: GLASSHOUSE_SPOTS, 'radio-hill': RADIO_HILL.spots, 'bus-ring': BUS_RING.spots};

export function siteSpot(siteId, landSeed, spot) {
  const offset = SPOTS[siteId]?.[spot];
  return offset ? localSitePoint(siteId, landSeed, offset) : null;
}

export function hasSiteServices(stage) {
  return ['camp', 'outpost', 'town', 'rebuilt'].includes(stage);
}

function trackPose(stops, seconds, pace, action) {
  const pairs = stops.map((stop, index) => {
    const next = stops[(index + 1) % stops.length];
    return {stop, next, travel: distance(stop.point, next.point) / (stop.move === 'carry-frame' ? .92 : pace)};
  });
  const duration = pairs.reduce((total, pair) => total + pair.stop.seconds + pair.travel, 0);
  let remaining = duration > 0 ? seconds % duration : 0;
  for (const {stop, next, travel} of pairs) {
    const yaw = Math.atan2(next.point.x - stop.point.x, next.point.z - stop.point.z);
    if (remaining <= stop.seconds) return {point: stop.point, yaw, action: stop.action ?? 'stand'};
    remaining -= stop.seconds;
    if (remaining <= travel && travel > 0) {
      const share = remaining / travel;
      return {point: {x: stop.point.x + (next.point.x - stop.point.x) * share,
        z: stop.point.z + (next.point.z - stop.point.z) * share}, yaw, action: stop.move ?? action, distance: seconds * pace};
    }
    remaining -= travel;
  }
  return {point: stops[0].point, yaw: 0, action: 'stand'};
}

export function residentPose(person, world, {partOfDay = 'day', routineTime = 0, site, arrivedAt = 0} = {}, pace = 1.2) {
  const {landSeed} = world.open;
  const at = spot => siteSpot(person.home, landSeed, spot);
  const camp = landSite(person.home);
  const home = camp.meeting;
  const routine = person.routine[partOfDay] ?? person.routine.day;
  let pose;
  const waiting = !isTrue({fact: 'mark', id: 'open/met/' + person.home}, world);
  const wary = isTrue({fact: 'word', of: person.home, atMost: 'Wary'}, world);
  const friendly = isTrue({fact: 'word', of: person.home, atLeast: 'Friendly'}, world);
  if (site === person.home && person.id === camp.leader && (waiting || wary || friendly)) {
    const post = at(home);
    const step = at(camp.meeting === 'marigold' ? 'car-stop' : 'lookout');
    const yaw = Math.atan2(step.x - post.x, step.z - post.z);
    const elapsed = Math.max(0, routineTime - arrivedAt);
    const share = friendly ? Math.min(1, elapsed * pace / distance(post, step)) : 0;
    pose = {point: {x: post.x + (step.x - post.x) * share, z: post.z + (step.z - post.z) * share},
      yaw, action: share > 0 && share < 1 ? 'walk' : 'stand', distance: elapsed * pace};
  } else if (site === person.home && waiting) {
    const post = routine.at ?? routine.stops?.[0].at ?? routine.around;
    const point = at(post[1]), leader = at(home);
    pose = {point, yaw: Math.atan2(leader.x - point.x, leader.z - point.z), action: 'stand'};
  } else if (routine.kind === 'post') {
    pose = {point: at(routine.at[1]), yaw: 0, action: routine.action};
  } else if (routine.kind === 'track') {
    const stops = routine.stops.map(stop => ({point: at(stop.at[1]), seconds: stop.seconds, action: stop.action, move: stop.move}));
    pose = trackPose(stops, routineTime, pace, routine.action);
  } else {
    const origin = at(routine.around[1]), {radius, pause} = routine;
    const stops = Array.from({length: 5}, (_, index) => {
      const angle = namedPick(world.seed, 'open/wander/' + person.id + '/angle/' + index,
        [0, Math.PI / 2, Math.PI, Math.PI * 1.5]);
      const seconds = namedPick(world.seed, 'open/wander/' + person.id + '/pause/' + index, pause);
      const reach = radius * (index + 1) / 5;
      return {point: {x: origin.x + Math.cos(angle) * reach, z: origin.z + Math.sin(angle) * reach}, seconds};
    });
    pose = trackPose(stops, routineTime, pace, 'walk');
  }
  const {x, z} = pose.point;
  return {position: {x, y: scablandsSurfaceHeightAt(x, z), z}, yaw: pose.yaw,
    action: pose.action, distance: pose.distance ?? 0};
}
