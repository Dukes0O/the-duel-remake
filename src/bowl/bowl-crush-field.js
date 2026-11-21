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

  addBusPile(course, 251, 'bowl-bus-pile');
  if (course.def.bowlFloor?.busPiles === 2) addBusPile(course, 269, 'bowl-second-bus-pile');
}

function addBusPile(course, s, id) {
  const pile = {bowlCrushGroup: id, bowlCrushMinMph: 30};
  addPiece(course, `${id}-0`, s, -2.6, BUS, 0x806449, pile);
  addPiece(course, `${id}-1`, s, 2.6, BUS, 0x5d6b52, pile);
  addPiece(course, `${id}-2`, s, 0, BUS, 0x596b70, {
    ...pile, angle: Math.PI / 2, stackHeight: BUS.height,
  });
}

// These pieces exist only while their jump runs. The ramp gives each line
// its direction in the world, even after the course bends around End 1.
function jumpLine(course, type, dressing) {
  const index = course.features.ramps.findIndex(ramp => ramp.id === 'big-jump');
  const ramp = course.features.ramps[index];
  const crest = course.groundAt((ramp.start + ramp.end) / 2, ramp.off);
  const forward = {x: Math.sin(crest.heading), z: Math.cos(crest.heading)};
  const across = {x: forward.z, z: -forward.x};
  const line = {type, rampId: `ramp-${index}`, ramp, crest, forward, across};
  course.features.bowlJump = {...line, ...dressing(line)};
}

const beyond = ({crest, forward, across}, distance, offset = 0) => ({
  x: crest.x + forward.x * distance + across.x * offset,
  z: crest.z + forward.z * distance + across.z * offset,
});

function bowlJumpGround(course, {x, z}) {
  const {s, lateral} = course.nearest(x, z);
  return {...course.groundAt(s, lateral), x, z};
}

function dressLongJump(course) {
  jumpLine(course, 'longJump', line => {
    const buses = Array.from({length: 10}, (_, index) => {
      const distance = 20 + 3 * index, point = beyond(line, distance);
      const {s, lateral} = course.nearest(point.x, point.z);
      const id = `bowl-long-bus-${index + 1}`;
      addPiece(course, id, s, lateral, BUS, COLOURS[index % COLOURS.length], {
        ...point, heading: line.crest.heading + Math.PI / 2,
      });
      return {id, distance, halfDepth: BUS.halfX, halfWidth: BUS.halfZ,
        top: course.features.crushables.at(-1).y + BUS.height};
    });
    return {buses};
  });
}

function dressHighJump(course) {
  jumpLine(course, 'highJump', line => {
    // The plane is in the apex band of the slower and faster jump lines.
    const distance = 18.5, halfWidth = 5.5;
    return {bar: {distance, halfWidth, posts: [-halfWidth, halfWidth].map(side =>
      bowlJumpGround(course, beyond(line, distance, side)))}};
  });
}

const DRESSINGS = new Map([
  [CAR_CRUSH_DRESSING, dressCarCrush],
  ['longJump', dressLongJump],
  ['highJump', dressHighJump],
  ['bestTrick', course => jumpLine(course, 'bestTrick', () => ({}))],
]);

export function dressBowlEvent(course) {
  DRESSINGS.get(course.def.bowlDressing)?.(course);
}
