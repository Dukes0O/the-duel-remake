// The road the Hot Delivery job follows, and the one question the ember rule asks of the ground: is this point on a road?
// The road is data: a list of points ({x, z}) and a half width. Everything here takes the points as input and assumes nothing
// about how big the land is, so that the points can move when the land is rebuilt. The same data is drawn as a darker band
// (src/world/scrap-look.js, createGroundLook) so that the picture and the rule cannot disagree.
import {scablandsSurfaceAt} from './scablands-ground.js';
import {LAND} from './scablands-names.js';

// The delivery road, from a land (src/world/scablands-names.js): the yard gate, the halfway camp (the job's safe point), the
// second Ash Men barricade near the Boneyard, round the south side of the scab field, up to Tin Town's gate and in.
export function deliveryRoad(land) {
  const spots = [land.yard, land.at('safe-road'), land.at('ash-barricade-2'), land.at('tin-town', -40, 150),
    land.at('tin-town', -25, 62), land.at('tin-town', -12, 30)];
  return Object.freeze({halfWidth: 14, points: Object.freeze(spots.map(({x, z}) => Object.freeze({x, z})))});
}
export const DELIVERY_ROAD = deliveryRoad(LAND);

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
export const onRoadPoints = (x, z, road = DELIVERY_ROAD) => distanceToRoad(x, z, road.points) <= road.halfWidth;

// The question the ember rule asks: the delivery road, or any other road the land already has (the dirt road round the oval).
export const onScablandsRoad = (x, z, road = DELIVERY_ROAD) => onRoadPoints(x, z, road) || scablandsSurfaceAt(x, z).road === true;
