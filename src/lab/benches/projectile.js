// Projectile motion (docs/LAB.md 4.1): a drop tower over a sand pit. The water is the bucket's own
// parcel model (heli-bucket.js aimPoint, which also draws the aim ring); the stone is the same fall
// with no air, which is what a heavy compact thing does over these heights.
import {GRAVITY, HELI_STEP} from '../../heli/heli-flight.js';
import {BUCKET, DROP_AIM_RINGS, aimPoint, createBucket, stepBucket} from '../../heli/heli-bucket.js';
import {control, makeBench} from './bench-core.js';

// The buoy-style target of the bench: 24 m ahead, hit within the largest ring.
export const TARGET = Object.freeze({distanceM: 24, radiusM: DROP_AIM_RINGS[0]});

const controls = [
  control('heightM', 'Height', 'm', 10, 60, 1, 30),
  control('speedMs', 'Forward speed', 'm/s', 0, 30, 1, 10),
];

// Where a parcel let go from this height, moving forward at this speed, lands (the bucket's own model).
export function waterDrop(heightM, speedMs) {
  const hit = aimPoint({x: 0, y: heightM + BUCKET.hang, z: 0, vx: 0, vy: 0, vz: speedMs, water: 0}, {dt: HELI_STEP});
  return hit ? {distanceM: hit.z, seconds: hit.seconds, fallM: hit.fall} : null;
}
export function stoneDrop(heightM, speedMs) {
  const seconds = Math.sqrt(2 * heightM / GRAVITY);
  return {distanceM: speedMs * seconds, seconds, fallM: heightM};
}
// Teaching follows an actual water parcel, with the very same integration as
// the aim ring and challenge. Cache this short trace in the animation, not per frame.
export function waterTrace(heightM, speedMs) {
  const bucket = createBucket();
  bucket.parcels = [{x: 0, y: heightM, z: 0, vx: 0, vy: 0, vz: speedMs, litres: BUCKET.parcelLitres, from: heightM}];
  const rows = [{seconds: 0, distanceM: 0, heightM}];
  for (let t = HELI_STEP; t < 40; t += HELI_STEP) {
    const {patches} = stepBucket(bucket, {}, HELI_STEP), p = bucket.parcels[0];
    rows.push({seconds: t, distanceM: p?.z ?? patches[0].z, heightM: Math.max(0, p?.y ?? 0)});
    if (!p) break;
  }
  return rows;
}
// How far a thing has fallen after this many seconds: a stone (no air) and a water parcel.
export const stoneFallAfter = seconds => GRAVITY * seconds * seconds / 2;
export function waterFallAfter(seconds) {
  let low = 0, high = 300;
  for (let i = 0; i < 40; i++) { const mid = (low + high) / 2; (waterDrop(mid, 0).seconds < seconds ? low = mid : high = mid); }
  return (low + high) / 2;
}

export const projectileBench = makeBench({
  id: 'projectile', controls, cues: ['lab.splash'],
  run({heightM, speedMs}) {
    const water = waterDrop(heightM, speedMs), stone = stoneDrop(heightM, speedMs);
    return {water, stone, waterShorterByM: stone.distanceM - water.distanceM,
      miss: Math.abs(water.distanceM - TARGET.distanceM), target: TARGET, hit: Math.abs(water.distanceM - TARGET.distanceM) <= TARGET.radiusM};
  },
  goalMet: history => history.some(({result}) => result.hit),
  facts: () => ({
    stoneFallM: [1, 2, 3].map(stoneFallAfter),
    waterFallM: [1, 2, 3].map(waterFallAfter),
    waterTopSpeedMs: BUCKET.fallSpeed,
  }),
});
