// The Bowl is its own night venue (docs/WASTELAND_WORLD.md section 7). Its floor
// is sized to the authored stadium (tools/blender/bowl-stadium.py): a 94 m by
// 74 m dirt floor with stands along both long sides and the podium in the
// middle. The ring runs round the podium, between a wall on the island and a
// wall in front of the stands, so every ramp, crush row and flame jet stands
// inside the stadium. Props are derived from the course frame, so placement is
// stable across runs and independent of graphics.

// The same shape of floor layout as the Scrapdome's (src/arena/venues.js), so the
// arena rules (walls, floor width, floor speed, start slots) read the Bowl's own.
export const BOWL_FLOOR = Object.freeze({
  // A Titan (half width 1.4 m) at the floor edge is 0.5 m from either wall face.
  floorHalfWidth: 6.5,
  floorSpeedMph: 42, floorSpeedReferenceMph: 200, floorSpeedExponent: .35,
  floorTraction: .95, floorScrub: .02, floorRoughness: .12,
  // The island wall round the podium, and the wall in front of the stands.
  wallOffset: 8.5,
  outerWallOffset: 9,
  rampFractions: Object.freeze([]),
  rampLength: 0,
  rampHeight: 0,
  junk: Object.freeze([]),
  junkSpawnClearance: 6,
  spawnSlots: 8,
  spawnOffset: 3.5,
});

export const BOWL_COURSE = Object.freeze({
  id: 'titan-bowl', layoutVersion: 2, theme: 'arena', stage: 16,
  // 140 m round the middle of the ring: the arena oval (1.3 by 0.8) is then
  // 27.2 m by 16.7 m, so the outer wall reaches 36.7 m and 26.2 m from the
  // stadium's middle, inside its side walls (38.4 m) and front row (26.7 m).
  name: 'The Bowl', lengthU: 140, closed: true, laps: 2, kind: 'arena',
  arena: true, bowl: true, timeOfDay: 'night', hasRadar: false,
  hasRival: false, speedLimitMph: 100, scrapdome: BOWL_FLOOR,
  sections: [{theme: 'arena', name: 'The Bowl', share: 1}],
});

// Two dirt ramps on the first long side: a kicker, then the big one.
// [start, length, height] in metres along the ring.
const RAMPS = [[21, 10, 1.8], [39, 13, 2.6]];

// The Car Crush line on the far long side grows as it goes: three rows of junk
// cars, then the crushed buses and RV, then the burning heap. Each vehicle has
// its own faded colour (BOWL-ART-CRUSH round 3).
const ACROSS = [-4.4, 0, 4.4];
const ROWS = [
  [86, 'junkCar', [0x53645b, 0x935143, 0x557185]],
  [93, 'junkCar', [0x79644b, 0x6b594e, 0x486b60]],
  [100, 'junkCar', [0x8a6248, 0x66717a, 0x716749]],
  [110, ['bowlBus', 'bowlBus', 'bowlRv'], [0x806449, 0x5d6b52, 0x596b70]],
  [121, 'bowlBurningHeap', [0x49362b, 0x49362b, 0x49362b]],
];

// The middle of the stadium is the middle of the ring.
export function bowlCentre(course) {
  const start = course.worldAt(0, 0), half = course.worldAt(course.length / 2, 0);
  return {x: (start.x + half.x) / 2, y: 0, z: (start.z + half.z) / 2};
}

export function buildBowlFeatures(course) {
  const {features} = course, floor = course.def.scrapdome ?? BOWL_FLOOR;
  for (const [start, length, height] of RAMPS) features.ramps.push({start, end: start + length, height});
  let index = 0;
  for (const [s, kinds, colors] of ROWS) for (const [lane, off] of ACROSS.entries()) {
    const kind = Array.isArray(kinds) ? kinds[lane] : kinds, car = kind === 'junkCar';
    features.crushables.push({id: `bowl-crush-${index++}`, kind: 'junkCar', sourceKind: kind,
      s, off, ...course.groundAt(s, off), halfX: car ? 1.06 : 1.42,
      halfZ: car ? 2.25 : 4.2, height: car ? 1.3 : 1.65,
      shape: 'box', color: colors[lane], bowlFire: kind === 'bowlBurningHeap'});
  }
  // A flame jet either side of each ramp's crest: one on top of the stand wall,
  // one on the island wall. They are data for the Bowl view; the simulation
  // never advances or draws them.
  features.flameJets = RAMPS.flatMap(([start, length], ramp) => [1, -1].map(side => ({
    id: `bowl-flame-jet-${ramp}-${side > 0 ? 'stand' : 'island'}`, s: start + length / 2,
    off: side * (side > 0 ? floor.outerWallOffset : floor.wallOffset), wallTop: 1.8,
  })));
}
