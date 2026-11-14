// The Scablands' road net (SCABLANDS-LAND round 4, slice 2a). Eleven graded roads join the yard, the places and the five crossings
// of the dry river. A road is data: its nodes are points of the land written through its names (src/world/scablands-names.js), and
// its centre line is laid out from them with rounded corners (src/world/scablands-road-geometry.js) so that a car at the road's top
// speed can hold it inside the road's half width. The same data is drawn (src/world/scablands-scene.js), read by the ground
// (scablandsSurfaceAt), by how the ground drives (src/world/scablands-regions.js) and by the ember (src/world/jobs/ember-rule.js),
// so that the picture and the rules cannot disagree.
import {LAND} from './scablands-names.js';
import {layOutRoad, throughVertex, toward, beyond} from './scablands-road-geometry.js';

// Metres from the centre line to each edge of the graded road. The drawn ribbon is 1.2 times as wide (ruts, a berm and its edge).
export const ROAD_HALF_WIDTH = 14;
// How far from the yard a road starts: the yard's own place is not road.
const YARD_CLEAR = 30;
// The tightest corner a road takes. A car at 185 km/h on this ground turns inside the half width at 450 m or more.
const CORNER = 700, TIGHT_CORNER = 450;

// The nodes of every road, from a land. A node is {x, z}; `radius` sets that corner's radius; `through` is a point the road passes.
function roadNodes(land) {
  const {at, between, yard} = land, node = (point, extra = {}) => ({x: point.x, z: point.z, ...extra});
  // A node worked out from others (a start 30 m from the yard, a point on the straight beyond a crossing) is `derived`: it moves with what it is worked out from, not by a share of a place.
  const derived = point => node(point, {derived: true});
  const camp = at('safe-road'), bridge = at('girder-bridge'), wash = at('the-wash'), pipe = at('the-pipe'), ford = at('south-ford');
  // Where each road meets a place: the same approach points the gas runs use, so that a road arrives where its place can be reached.
  const boneyard = at('boneyard', 23, 4), mall = at('dead-mall', 0, -60), well = at('everburn', 96, 24), ships = at('ships-in-sand', -60, 50);
  const ridge = at('ridge', -74, 104), dam = at('dry-dam', 124, 74), ironLine = at('iron-line', 70, 30), town = at('tin-town', -25, 40);
  const nodes = {};

  // The East Road: the yard, the halfway camp (the middle of its first bend), the Girder Bridge on a straight stretch, then round
  // to Tin Town's gate from the south (the gate faces north and south).
  const start = toward(yard, camp, YARD_CLEAR), campVertex = throughVertex(start, camp, bridge, CORNER);
  nodes['east-road'] = [derived(start), node(camp, {through: true, radius: CORNER}), node(bridge), derived(beyond(campVertex, bridge, 1100)),
    node(at('tin-town', -25, 1500), {radius: TIGHT_CORNER}), node(town)];

  // The Boneyard Road: the halfway camp, the Wash (straight across the crossing), the Boneyard.
  nodes['boneyard-road'] = [node(camp), node(wash), derived(beyond(camp, wash, 350)), node(boneyard)];
  // The Tin Road: the Boneyard to the East Road's last stretch, short of Tin Town's gate.
  nodes['tin-road'] = [node(boneyard), node(between('tin-town', 'boneyard', .484, 50, 30)), node(at('tin-town', -25, 300))];
  // The Salt Road: yard, the Pipe, then a fork to the Ships (west) and to the Ridge (east).
  const saltStart = toward(yard, pipe, YARD_CLEAR), fork = beyond(saltStart, pipe, 1100);
  nodes['salt-road'] = [derived(saltStart), node(pipe), derived(fork), node(ships)];
  nodes['ridge-spur'] = [derived(fork), node(ridge)];
  // The Ridge Road comes down the east side of the pan to Tin Town.
  nodes['ridge-road'] = [node(ridge), node(between('tin-town', 'ridge', .469, 125, -75)), node(at('tin-town', -120, -90))];
  nodes['west-road'] = [derived(toward(yard, ironLine, YARD_CLEAR)), node(between('yard', 'iron-line', .5, 0, -300)), node(ironLine)];
  nodes['dam-road'] = [derived(toward(yard, dam, YARD_CLEAR)), node(dam)];
  nodes['burn-road'] = [derived(toward(yard, between('yard', 'everburn', .479, 30, 45), YARD_CLEAR)), node(between('yard', 'everburn', .479, 30, 45)), node(well)];
  nodes['mall-road'] = [derived(toward(yard, mall, YARD_CLEAR)), node(mall)];
  nodes['mall-burn-road'] = [node(mall), node(well)];
  nodes['mall-boneyard-road'] = [node(mall), node(ford), derived(beyond(mall, ford, 300)), node(boneyard)];
  return nodes;
}

const NAMES = Object.freeze({
  'east-road': 'The East Road', 'boneyard-road': 'The Boneyard Road', 'tin-road': 'The Tin Road', 'salt-road': 'The Salt Road',
  'ridge-spur': 'The Salt Road to the Ridge', 'ridge-road': 'The Ridge Road', 'west-road': 'The West Road', 'dam-road': 'The Dam Road',
  'burn-road': 'The Burn Road', 'mall-road': 'The Mall Road', 'mall-burn-road': 'The Mall to the Everburn', 'mall-boneyard-road': 'The Mall to the Boneyard',
});

// A cell index over the segments of every road, so that "is this point on a road" asks only the segments nearby (a car asks it
// every step). Cells are 256 m; a segment is listed in every cell its half-width neighbourhood touches.
const CELL = 256;
const cellKey = (i, j) => i * 100003 + j;

// The road net for a land: {roads, road(id), nearest(x, z)}.
export function roadNet(land) {
  const roads = Object.entries(roadNodes(land)).map(([id, nodes]) => {
    const laid = layOutRoad(nodes, {radius: CORNER});
    return Object.freeze({id, name: NAMES[id], halfWidth: ROAD_HALF_WIDTH, points: Object.freeze(laid.points.map(({x, z}) => Object.freeze({x, z}))),
      length: laid.length, minRadius: laid.minRadius, nodes: Object.freeze(nodes.map(({x, z, derived}) => Object.freeze({x, z, derived: derived === true})))});
  });
  const byId = new Map(roads.map(road => [road.id, road]));
  const cells = new Map();
  for (const road of roads) {
    for (let index = 0; index + 1 < road.points.length; index++) {
      const a = road.points[index], b = road.points[index + 1], reach = road.halfWidth + 2;
      const i0 = Math.floor((Math.min(a.x, b.x) - reach) / CELL), i1 = Math.floor((Math.max(a.x, b.x) + reach) / CELL);
      const j0 = Math.floor((Math.min(a.z, b.z) - reach) / CELL), j1 = Math.floor((Math.max(a.z, b.z) + reach) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
        const key = cellKey(i, j);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push({road, index});
      }
    }
  }
  // The road under (x, z): {road, distance, along} for the nearest road within its half width, or null.
  const nearest = (x, z) => {
    const list = cells.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!list) return null;
    let best = null;
    for (const {road, index} of list) {
      const a = road.points[index], b = road.points[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
      const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
      const distance = Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
      if (distance <= road.halfWidth && (!best || distance < best.distance)) best = {road, distance, index, t};
    }
    return best;
  };
  return Object.freeze({roads: Object.freeze(roads), road: id => byId.get(id), nearest});
}

export const ROAD_NET = roadNet(LAND);
// The road Hot Delivery follows.
export const EAST_ROAD = ROAD_NET.road('east-road');

// Distance in metres from (x, z) to the nearest stretch of a line of points.
export function distanceToRoad(x, z, points) {
  let best = Infinity;
  for (let index = 0; index + 1 < points.length; index++) {
    const a = points[index], b = points[index + 1], dx = b.x - a.x, dz = b.z - a.z, length = dx * dx + dz * dz;
    const t = length > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length)) : 0;
    best = Math.min(best, Math.hypot(x - a.x - t * dx, z - a.z - t * dz));
  }
  if (points.length === 1) best = Math.hypot(x - points[0].x, z - points[0].z);
  return best;
}

// True when the point lies within the road's half width of its line.
export const onRoadPoints = (x, z, road) => distanceToRoad(x, z, road.points) <= road.halfWidth;

// The question the ground asks: is this point on any road of the net? (Cheap: it asks the cell the point is in.)
export const onScablandsRoad = (x, z, net = ROAD_NET) => net.nearest(x, z) !== null;
// Distance in metres from (x, z) to the nearest road of the net, searched everywhere (for a check, not for a frame).
export function distanceToNet(x, z, net = ROAD_NET) {
  let best = Infinity;
  for (const road of net.roads) best = Math.min(best, distanceToRoad(x, z, road.points));
  return best;
}
