// The Bowl is its own night venue. Its authored props are derived from the
// course frame so placement is stable across runs and independent of graphics.
export const BOWL_COURSE = Object.freeze({
  id: 'titan-bowl', layoutVersion: 1, theme: 'arena', stage: 16,
  name: 'The Bowl', lengthU: 1280, closed: true, laps: 2, kind: 'arena',
  arena: true, bowl: true, timeOfDay: 'night', hasRadar: false,
  hasRival: false, speedLimitMph: 100,
  sections: [{theme: 'arena', name: 'The Bowl', share: 1}],
});

const line = [
  [0.16, -5.2, 'junkCar', 0x53645b], [0.16, 0, 'junkCar', 0x935143], [0.16, 5.2, 'junkCar', 0x557185],
  [0.31, -5.2, 'junkCar', 0x79644b], [0.31, 0, 'junkCar', 0x6b594e], [0.31, 5.2, 'junkCar', 0x486b60],
  [0.47, -5.2, 'junkCar', 0x8a6248], [0.47, 0, 'junkCar', 0x66717a], [0.47, 5.2, 'junkCar', 0x716749],
  [0.63, -5.2, 'bowlBus', 0x806449], [0.63, 0, 'bowlBus', 0x735648], [0.63, 5.2, 'bowlRv', 0x596b70],
  [0.78, -5.2, 'bowlBurningHeap', 0x49362b], [0.78, 0, 'bowlBurningHeap', 0x49362b], [0.78, 5.2, 'bowlBurningHeap', 0x49362b],
];

export function buildBowlFeatures(course) {
  const {features, length} = course;
  for (const [fraction, rampLength, height] of [[0.12, 42, 3.0], [0.38, 48, 4.2], [0.68, 54, 5.1]])
    features.ramps.push({start: length * fraction, end: length * fraction + rampLength, height});
  for (const [index, [fraction, off, kind, color]] of line.entries()) {
    const s = length * fraction, pose = course.groundAt(s, off);
    features.crushables.push({id: `bowl-crush-${index}`, kind: 'junkCar', sourceKind: kind,
      s, off, ...pose, halfX: kind === 'junkCar' ? 1.06 : 1.42,
      halfZ: kind === 'junkCar' ? 2.25 : 4.2, height: kind === 'junkCar' ? 1.3 : 1.65,
      shape: 'box', color, bowlFire: kind === 'bowlBurningHeap'});
  }
  // Flame locations are data for the Bowl scene presentation; the course
  // simulation never advances or draws them.
  features.flameJets = [0.12, 0.38, 0.68].map((fraction, index) => ({
    id: `bowl-flame-jet-${index}`, s: length * fraction + 8, off: index % 2 ? 16 : -16,
  }));
}
