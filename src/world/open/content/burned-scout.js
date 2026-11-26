// OPEN-BURNED-SCOUT owns these placements. The Nest's look and cut ground stay unchanged.
import {LAND} from '../../scablands-names.js';
import {RATS_NEST_LAYOUT} from '../looks/rats-nest-look.js';
import {GLASSHOUSE_LAYOUT} from '../looks/glasshouse-look.js';

export function buildBurnedScout(land = LAND) {
  const nest = land.at('boneyard', -150, -900);
  const at = (east, south) => land.at('boneyard', east - 150, south - 900);
  const lookouts = [
    {id: 'lookout-1', ...at(120, -450), heading: -2.6, halfAngle: Math.PI / 3, range: 850, eye: 4.8,
      heap: {halfX: 3.4, halfZ: 4.8, height: 3}},
    {id: 'lookout-2', ...at(-180, 200), heading: -.7, halfAngle: Math.PI / 3, range: 850, eye: 4.8,
      heap: {halfX: 3.4, halfZ: 4.8, height: 3}},
  ];
  // Leave the bridge by its gentle bank, then follow the dry fold west of the wreck fields.
  const scoutGullyRoute = [
    land.at('girder-bridge'), at(-600, -1600), at(-700, -1300), at(-750, -900),
    at(-750, -600), at(-750, -400), at(-650, -350), at(-450, -300), at(-300, -220),
    at(-180, -145), at(-90, -90), at(-58, -36),
  ];
  const spots = Object.fromEntries(lookouts.map(post => [post.id,
    {...post, x: post.x - nest.x, z: post.z - nest.z}]));
  return {nest, lookouts, spots, scoutGullyRoute};
}

export const BURNED_SCOUT = Object.freeze(buildBurnedScout());
export const scoutGullyRoute = BURNED_SCOUT.scoutGullyRoute;

// Every row stands beside an existing named spot, never inside a parked buggy.
export const SCOUT_RATS = Object.freeze([
  ...Array.from({length: 6}, (_, i) => ({id: `scout-rat-bay-${i + 1}`, figure: 'road-rat-lookout',
    spot: `buggy-${i + 1}`, east: 1.6, south: 0, task: i % 2 ? 'sit' : 'stand'})),
  {id: 'scout-rat-gate', figure: 'road-rat-lamp', spot: 'pen-gate', east: -1.8, south: 1, task: 'stand'},
  {id: 'scout-rat-sump', figure: 'sump', spot: 'sump', east: 0, south: 0, task: 'stand'},
  {id: 'scout-rat-shack', figure: 'road-rat-lookout', spot: 'sump', east: 0, south: 3, task: 'sit'},
  {id: 'scout-rat-fire-1', figure: 'road-rat-lamp', fire: 0, east: -1.7, south: 0, task: 'sit'},
  {id: 'scout-rat-fire-2', figure: 'road-rat-lookout', spot: 'warm-hands', east: 0, south: 0, task: 'stand'},
  {id: 'scout-rat-fire-3', figure: 'road-rat-lamp', fire: 2, east: 0, south: -2, task: 'stand'},
  {id: 'scout-rat-walk-1', figure: 'road-rat-lookout', spot: 'warm-hands', east: 3, south: 2, round: 3},
  {id: 'scout-rat-walk-2', figure: 'road-rat-lamp', spot: 'pen-gate', east: -3, south: 4, round: 3},
]);

export function scoutPeople(posts = [], land = LAND) {
  const {nest} = buildBurnedScout(land), base = land.at('boneyard');
  const rows = SCOUT_RATS.map(row => {
    const spot = row.spot ? RATS_NEST_LAYOUT.spots[row.spot] : RATS_NEST_LAYOUT.fires[row.fire];
    const at = ['boneyard', nest.x - base.x + spot.x + row.east, nest.z - base.z + spot.z + row.south];
    const routine = row.round ? {kind: 'track', loop: false, stops: [
      {at, seconds: 6, task: 'stand'}, {at: [at[0], at[1], at[2] + row.round], seconds: 4, task: 'stand'},
    ]} : {kind: 'post', at, yaw: spot.heading ?? 0, task: row.task};
    return {id: row.id, figure: row.figure, talk: null, routine: {day: routine}};
  });
  return [...rows, ...posts.map((post, i) => ({id: `scout-lookout-${i + 1}`, figure: 'road-rat-lookout', talk: null,
    elevation: post.heap.height, routine: {day: {kind: 'post',
      at: ['boneyard', post.x - base.x + 1.8, post.z - base.z], yaw: post.heading, task: 'stand'}}}))];
}

// Continue the Glasshouse's own tracks from its edge. Pods end at the bridge; tyres go on along the plain road.
export function scoutTrail(camp, land = LAND) {
  const base = land.at('ships-in-sand'), edge = GLASSHOUSE_LAYOUT.spots['tracks-away'];
  const start = land.at('ships-in-sand', camp.x - base.x + edge.x, camp.z - base.z + edge.z);
  const bridge = land.at('girder-bridge');
  const {nest} = buildBurnedScout(land);
  const tracks = [start, bridge, land.at('boneyard', -80, -1450), land.at('boneyard', 30, -1100),
    land.at('boneyard', nest.x - land.at('boneyard').x - 84, nest.z - land.at('boneyard').z + 29)];
  const length = Math.hypot(bridge.x - start.x, bridge.z - start.z);
  const pods = Array.from({length: Math.ceil(length / 15)}, (_, i) => {
    const t = Math.min(1, (i + 1) * 15 / length);
    if (t === 1) return bridge;
    return land.at('ships-in-sand', start.x - base.x + (bridge.x - start.x) * t,
      start.z - base.z + (bridge.z - start.z) * t);
  });
  return {tracks, pods};
}
