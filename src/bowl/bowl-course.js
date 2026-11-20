// The Bowl is its own night venue (docs/WASTELAND_WORLD.md section 7): a stadium
// floor 160 m by 90 m between its walls, in proportion to the monster trucks
// (BOWL-EXPAND, docs/board/cards/BOWL-EXPAND.md). The course is a ring round a
// narrow divider, the Spine: two 70 m straights joined by two round ends. The
// ring is as wide as the floor (20 m either side of its centre line), so laps,
// lanes, arena walls and start slots all read it as they read any ring. Jumps,
// banks, the crush line and the show's places are data here, derived from the
// course frame alone, so placement is stable across runs and independent of
// graphics.

// The centre line: two straights and two half circles. Lap distance `s` starts at
// the beginning of the Jump Straight; `off` is minus towards the Spine. Each half
// circle is 73 m round (a radius of 23.24 m), so the lap is 286 m: a whole number of
// the course's 2 m samples, and its last sample meets the first exactly.
export const BOWL_RING = Object.freeze({straight: 70, radius: 73 / Math.PI});
const STRAIGHT = BOWL_RING.straight, RADIUS = BOWL_RING.radius, TURN = Math.PI * RADIUS;
export const BOWL_LENGTH = 2 * STRAIGHT + 2 * TURN;
// A place and the place half a lap on are the same spot on the other side of the Spine.
export const BOWL_HALF_LAP = BOWL_LENGTH / 2;
export const BOWL_ZONES = Object.freeze({
  jumpStraight: Object.freeze([0, STRAIGHT]),
  end1: Object.freeze([STRAIGHT, STRAIGHT + TURN]),
  crushStraight: Object.freeze([STRAIGHT + TURN, 2 * STRAIGHT + TURN]),
  end2: Object.freeze([2 * STRAIGHT + TURN, BOWL_LENGTH]),
});

// The same shape of floor layout as the Scrapdome's (src/arena/venues.js), so the
// arena rules (walls, floor width, floor speed, start slots) read the Bowl's own.
export const BOWL_FLOOR = Object.freeze({
  // A Titan (half width 1.4 m) at the floor edge is 0.5 m from the stand wall's face:
  // each wall piece is 1 m thick, centred 22.4 m out, so its face is 21.9 m out. The
  // Spine's pieces stand 0.1 m further, so that the pieces where a straight meets an
  // end (which grow to close the bend) keep 0.4 m clear too. On the straights the two
  // sides' Spine walls meet in the middle: the Spine is 2.5 m wide.
  floorHalfWidth: 20,
  // Read in every event on the Bowl (src/sim-driving.js _drivingSurface). A Titan at full
  // throttle settles near 50 mph on this floor (its limit is 35 mph and the pull back to it
  // is gentle): the Big Jump then throws it about 45 m for 2 s, into the open end.
  floorSpeedMph: 42, floorSpeedReferenceMph: 200, floorSpeedExponent: .35,
  floorTraction: .95, floorScrub: .02, floorRoughness: .12,
  // The Spine's wall and the wall in front of the stands.
  wallOffset: 22.5,
  outerWallOffset: 22.4,
  rampFractions: Object.freeze([]),
  rampLength: 0,
  rampHeight: 0,
  junk: Object.freeze([]),
  junkSpawnClearance: 6,
  spawnSlots: 8,
  spawnOffset: 6,
});

export const BOWL_COURSE = Object.freeze({
  id: 'titan-bowl', layoutVersion: 3, theme: 'arena', stage: 16,
  // A dirt floor, as the Freestyle Playground's is: `offroad` makes the game hold a truck to
  // the floor's top speed (src/sim-driving.js reads it only off the paved road).
  name: 'The Bowl', lengthU: BOWL_LENGTH, closed: true, laps: 2, kind: 'arena',
  arena: true, offroad: true, bowl: true, bowlRing: BOWL_RING, timeOfDay: 'night', hasRadar: false,
  hasRival: false, speedLimitMph: 100, scrapdome: BOWL_FLOOR,
  sections: [{theme: 'arena', name: 'The Bowl', share: 1}],
});

// A point on the centre line, a fraction `t` of the way round from the start.
// The Jump Straight runs from (0, 0) towards +z; the Spine is on its -x side.
export function bowlRingPoint(ring, t) {
  const straight = ring.straight, radius = ring.radius, turn = Math.PI * radius;
  let u = (((t % 1) + 1) % 1) * (2 * straight + 2 * turn);
  if (u < straight) return {x: 0, z: u};
  u -= straight;
  if (u < turn) { const a = u / radius; return {x: -radius + radius * Math.cos(a), z: straight + radius * Math.sin(a)}; }
  u -= turn;
  if (u < straight) return {x: -2 * radius, z: straight - u};
  u -= straight;
  const a = u / radius;
  return {x: -radius - radius * Math.cos(a), z: -radius * Math.sin(a)};
}

// The jumps, all on the straights, no two sharing a stretch of the lap (the jump
// scoring names a jump by where it is along the lap, src/sim-driving.js _jump).
// `off` is the middle of the jump across the floor, `halfWidth` its full-height
// half width and `flank` the width of each dirt side. A mound rises and falls in
// one curve; a table climbs, runs flat and drops.
const RAMPS = [
  {id: 'jump-kicker', name: 'Jump Straight kicker', start: 22, length: 12, height: 1.8, off: 0, halfWidth: 3, flank: 2.2, profile: 'mound'},
  {id: 'big-jump', name: 'Big Jump', start: 43, length: 18, height: 4.5, off: -13, halfWidth: 3.5, flank: 3.5, profile: 'mound'},
  {id: 'crush-kicker', name: 'Crush Straight kicker', start: 22 + BOWL_HALF_LAP, length: 12, height: 1.8, off: 0, halfWidth: 3, flank: 2.2, profile: 'mound'},
  {id: 'table', name: 'the Table', start: 186, length: 22, height: 3.2, off: -13, halfWidth: 3, flank: 3.5, profile: 'table'},
];

// The bowl at each end: from 10 m out the floor curves up to 3.2 m at the wall face,
// rising and falling away over the first and last 10 m of the end.
export const BOWL_BANK = Object.freeze({from: 10, to: 21.9, height: 3.2, ease: 10});

// The Car Crush line on the Crush Straight's stand side grows as it goes: three rows
// of junk cars, then the crushed buses and RV, then the burning stacks. Each vehicle
// has its own faded colour (BOWL-ART-CRUSH round 3).
const ACROSS = [9.4, 13.8, 18.2];
// The line starts 22 m into the straight, so Car Crush starts on the straight itself and a
// truck driven straight ahead meets the line (from a start in the turn it met the wall).
const ROWS = [
  [165, 'junkCar', [0x53645b, 0x935143, 0x557185]],
  [172, 'junkCar', [0x79644b, 0x6b594e, 0x486b60]],
  [179, 'junkCar', [0x8a6248, 0x66717a, 0x716749]],
  [190, ['bowlBus', 'bowlBus', 'bowlRv'], [0x806449, 0x5d6b52, 0x596b70]],
  [203, 'bowlBurningHeap', [0x49362b, 0x49362b, 0x49362b]],
];

const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };

// The middle of the stadium is the middle of the ring.
export function bowlCentre(course) {
  const start = course.worldAt(0, 0), half = course.worldAt(course.length / 2, 0);
  return {x: (start.x + half.x) / 2, y: 0, z: (start.z + half.z) / 2};
}

// A jump's height at a lap distance (phase) and offset, from its own data.
export function bowlRampHeight(ramp, phase, off) {
  if (phase < ramp.start || phase > ramp.end) return 0;
  const across = (Math.abs(off - ramp.off) - ramp.halfWidth) / ramp.flank;
  if (across >= 1) return 0;
  const t = (phase - ramp.start) / (ramp.end - ramp.start);
  const along = ramp.profile === 'table'
    ? (t < .38 ? Math.sin(Math.PI * t / .76) ** 2 : t > .62 ? Math.sin(Math.PI * (1 - t) / .76) ** 2 : 1)
    : Math.sin(Math.PI * t) ** 2;
  return ramp.height * along * (across <= 0 ? 1 : 1 - smooth(across));
}

// The banked ends' height at a lap distance (phase) and offset.
export function bowlBankHeight(phase, off) {
  const bank = BOWL_BANK;
  if (off <= bank.from) return 0;
  for (const [start, end] of [BOWL_ZONES.end1, BOWL_ZONES.end2]) {
    if (phase <= start || phase >= end) continue;
    const ease = smooth(Math.min(phase - start, end - phase) / bank.ease);
    const u = clamp01((off - bank.from) / (bank.to - bank.from));
    return bank.height * u * u * ease;
  }
  return 0;
}

// The floor's relief: the higher of a jump and a bank. Nothing rises on the Spine's side
// beyond the floor, where offsets past the Spine fold back over the other straight.
export function bowlReliefAt(course, s, off) {
  if (off < -BOWL_FLOOR.floorHalfWidth) return 0;
  const phase = course.phase(s);
  let height = bowlBankHeight(phase, off);
  for (const ramp of course.features.ramps) height = Math.max(height, bowlRampHeight(ramp, phase, off));
  return height;
}

export function buildBowlFeatures(course) {
  const {features} = course;
  for (const ramp of RAMPS) features.ramps.push({...ramp, end: ramp.start + ramp.length, bowl: true});
  let index = 0;
  for (const [s, kinds, colors] of ROWS) for (const [lane, off] of ACROSS.entries()) {
    const kind = Array.isArray(kinds) ? kinds[lane] : kinds, car = kind === 'junkCar';
    features.crushables.push({id: `bowl-crush-${index++}`, kind: 'junkCar', sourceKind: kind,
      s, off, ...course.groundAt(s, off), halfX: car ? 1.06 : 1.42,
      halfZ: car ? 2.25 : 4.2, height: car ? 1.3 : 1.65,
      shape: 'box', color: colors[lane], bowlFire: kind === 'bowlBurningHeap'});
  }
  // A flame jet either side of each jump's crest: one on the Spine, one on top of the
  // stand wall. They are data for the Bowl view; the simulation never advances or draws them.
  features.flameJets = RAMPS.flatMap((ramp, number) => [1, -1].map(side => ({
    id: `bowl-flame-jet-${number}-${side > 0 ? 'stand' : 'spine'}`, s: ramp.start + ramp.length / 2,
    off: side * (side > 0 ? BOWL_FLOOR.outerWallOffset : BOWL_FLOOR.wallOffset), wallTop: side > 0 ? BOWL_STADIUM.wallHeight : BOWL_STADIUM.spineHeight,
  })));
  // The show's places, for the cards that run events on this floor.
  const firstRow = ROWS[0][0];
  features.bowl = Object.freeze({
    ring: BOWL_RING, length: BOWL_LENGTH, halfLap: BOWL_HALF_LAP, zones: BOWL_ZONES, bank: BOWL_BANK,
    start: Object.freeze({s: 6, lateral: 0}),
    // Car Crush: start at the head of the Crush Straight on the stand side, 20 m from the
    // first row, and run straight down the line.
    crush: Object.freeze({startS: firstRow - 20, lateral: ACROSS[1], firstRowS: firstRow,
      lastRowS: ROWS.at(-1)[0], endS: ROWS.at(-1)[0] + 15, leftS: firstRow - 40}),
    // Freestyle: two parked cars on the Jump Straight's stand side, for the launch off cars.
    launchCars: Object.freeze([Object.freeze({s: 36, lateral: 14, dir: 1}), Object.freeze({s: 48, lateral: 14, dir: 1})]),
    // Side by Side: two mirrored lanes on the centre line, half a lap apart; one lap each.
    lanes: Object.freeze([Object.freeze({s: 6, lateral: 0}), Object.freeze({s: 6 + BOWL_HALF_LAP, lateral: 0})]),
    // The Scrapasaurus walks all the way round, 16.5 m out (on the banks at the ends).
    rails: Object.freeze({lateral: 16.5, start: 0, end: BOWL_LENGTH}),
    // The Spine's wall pieces are 1 m thick and centred 0.74 m from its middle line.
    spine: Object.freeze({halfWidth: RADIUS - BOWL_FLOOR.wallOffset + .5, length: STRAIGHT, height: BOWL_STADIUM.spineHeight}),
  });
}

// The stadium's sizes, shared by the course (flame jet heights) and its view.
export const BOWL_STADIUM = Object.freeze({
  wallHeight: 2.4, fenceHeight: 5, spineHeight: 2.6,
  rows: 40, rowDepth: .9, rowRise: .52, firstRowHeight: 3.2, standGap: 2.2,
  towerHeight: 46,
});
