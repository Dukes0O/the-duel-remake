// Car Crush dresses the same Bowl as the other events. Measurements are lap
// metres and metres to the stand side of the centre line.
export const CAR_CRUSH_DRESSING = 'carCrush';

const CAR = Object.freeze({kind: 'junkCar', sourceKind: 'junkCar', halfX: 1.06, halfZ: 2.25, height: 1.3});
const BUS = Object.freeze({kind: 'junkCar', sourceKind: 'bowlBus', halfX: 1.42, halfZ: 4.2, height: 1.65});

const ROW_OFFSETS = [7.6, 9.85, 12.1, 14.35, 16.6];
const PANCAKES = [
  ['jump-kicker', 49.4, 0],
  ['crush-kicker', 192.4, .13],
  ['table', 231, -8.9],
];
const END_ONE = [[82, -8], [94, 4], [105, -2], [116, 8], [131, 0]];
const COLOURS = [0x53645b, 0x935143, 0x557185, 0x79644b, 0x6b594e];

function addPiece(course, id, s, off, dimensions, color, options = {}) {
  const {angle = 0, stackHeight = 0, ...tags} = options;
  const ground = course.groundAt(s, off);
  course.features.crushables.push({
    id, s, off, ...ground, ...dimensions, color, shape: 'box',
    y: ground.y + stackHeight, heading: ground.heading + angle,
    ...tags, ...(stackHeight ? {bowlStackBase: ground.y} : {}),
  });
}

function dressCarCrush(course) {
  // The original middle lane stays as it was. Moving the five nearest props
  // inward clears the wall face and the line a truck follows without steering.
  for (const prop of course.features.crushables) {
    if (prop.off === 18.2) {
      prop.off = 17.25;
      Object.assign(prop, course.groundAt(prop.s, prop.off));
    }
  }
  ROW_OFFSETS.forEach((off, index) => addPiece(course, `bowl-row-${index}`, 55, off, CAR, COLOURS[index]));
  PANCAKES.forEach(([ramp, s, off], index) =>
    addPiece(course, `bowl-pancake-${index}`, s, off, CAR, COLOURS[index], {bowlPancakeRamp: ramp}));
  END_ONE.forEach(([s, off], index) => addPiece(course, `bowl-end-one-${index}`, s, off, CAR, COLOURS[index]));

  const pile = {bowlCrushGroup: 'bowl-bus-pile', bowlCrushMinMph: 30};
  addPiece(course, 'bowl-bus-pile-0', 251, -2.6, BUS, 0x806449, pile);
  addPiece(course, 'bowl-bus-pile-1', 251, 2.6, BUS, 0x5d6b52, pile);
  addPiece(course, 'bowl-bus-pile-2', 251, 0, BUS, 0x596b70, {
    ...pile, angle: Math.PI / 2, stackHeight: BUS.height,
  });
}

const DRESSINGS = new Map([[CAR_CRUSH_DRESSING, dressCarCrush]]);

export function dressBowlEvent(course) {
  DRESSINGS.get(course.def.bowlDressing)?.(course);
}
