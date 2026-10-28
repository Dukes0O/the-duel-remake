// Authored Deep zone data, checked before a scene or journey consumes it.
// THE_DEEP 10.1: closed trail, world metres, sideways offsets positive left.
export const ZONE_FORMAT_VERSION = 1;

const CREATURES = new Set(['silver-school', 'reef-fish', 'turtle', 'ray',
  'manta', 'sea-lion', 'otter', 'crab', 'moray', 'grouper', 'reef-shark',
  'jellyfish', 'whale', 'octopus']);
const PEARLS = new Set(['kelp-1', 'kelp-2', 'kelp-3', 'reef-1', 'reef-2',
  'reef-3', 'night-1', 'night-2', 'night-3']);
const LOOK = ['kelp', 'grass', 'rock'];

function invalid(path, reason) {
  throw new TypeError(`Invalid Deep zone: ${path} ${reason}.`);
}
function record(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)))
    invalid(path, 'must be a plain object');
  for (const key of Reflect.ownKeys(value)) {
    if (!keys.includes(key)) invalid(`${path}.${String(key)}`, 'is not a version 1 field');
  }
  return value;
}
function number(value, path, minimum = -Infinity, positive = false) {
  if (!Number.isFinite(value) || value < minimum || (positive && value <= 0))
    invalid(path, positive ? 'must be a finite positive number' :
      minimum === 0 ? 'must be a finite nonnegative number' : 'must be a finite number');
  return value;
}
function slug(value, path, maximum = Infinity) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value))
    invalid(path, 'must be a lowercase slug');
  if (value.length > maximum) invalid(path, 'must be at most 80 characters for persisted discovery');
  return value;
}
function index(value, length, path) {
  if (!Number.isInteger(value) || value < 0 || value >= length)
    invalid(path, 'must be a trail index in bounds');
  return value;
}
function list(value, path, copy) {
  if (!Array.isArray(value)) invalid(path, 'must be an array');
  return Object.freeze(Array.from(value, (item, i) => copy(item, `${path}[${i}]`)));
}
function unique(id, seen, path) {
  if (seen.has(id)) invalid(path, 'must be unique in this list');
  seen.add(id);
  return id;
}

export function defineZone(data) {
  record(data, ['id', 'circuit', 'switch', 'ramp', 'trail', 'places', 'pearls', 'spots', 'finds'], 'zone');
  const id = slug(data.id, 'id', 80), circuit = slug(data.circuit, 'circuit');
  if (data.switch !== 'the-deep') invalid('switch', 'must be the-deep');

  const rampData = record(data.ramp, ['atDistance', 'side', 'length', 'endDepth'], 'ramp');
  if (!['left', 'right'].includes(rampData.side)) invalid('ramp.side', 'must be left or right');
  const ramp = Object.freeze({
    atDistance: number(rampData.atDistance, 'ramp.atDistance', 0),
    side: rampData.side,
    length: number(rampData.length, 'ramp.length', 0, true),
    endDepth: number(rampData.endDepth, 'ramp.endDepth', 0),
  });

  const trail = list(data.trail, 'trail', (value, path) => {
    record(value, ['x', 'z', 'depth', 'width', 'surface', ...LOOK], path);
    if (value.surface !== 'sea-floor') invalid(`${path}.surface`, 'must be sea-floor');
    const point = {
      x: number(value.x, `${path}.x`), z: number(value.z, `${path}.z`),
      depth: number(value.depth, `${path}.depth`, 0),
      width: number(value.width, `${path}.width`, 0, true), surface: value.surface,
    };
    for (const key of LOOK) {
      const amount = Object.hasOwn(value, key) ? number(value[key], `${path}.${key}`, 0) : 0;
      if (amount > 1) invalid(`${path}.${key}`, 'must be between 0 and 1');
      point[key] = amount;
    }
    return Object.freeze(point);
  });
  if (trail.length < 3) invalid('trail', 'needs at least three points');
  // Closure is implicit. A repeated closing point would add a zero-length segment.
  for (let i = 0; i < trail.length; i++) {
    const a = trail[i], b = trail[(i + 1) % trail.length];
    if (a.x === b.x && a.z === b.z) invalid(`trail[${i}] to trail[${(i + 1) % trail.length}]`, 'is a zero-length segment');
  }

  const placeIds = new Set();
  const places = list(data.places, 'places', (value, path) => {
    record(value, ['id', 'name', 'fromIndex', 'toIndex'], path);
    const placeId = unique(slug(value.id, `${path}.id`, 80), placeIds, `${path}.id`);
    if (typeof value.name !== 'string' || !value.name.trim()) invalid(`${path}.name`, 'must be nonempty text');
    return Object.freeze({ id: placeId, name: value.name,
      fromIndex: index(value.fromIndex, trail.length, `${path}.fromIndex`),
      toIndex: index(value.toIndex, trail.length, `${path}.toIndex`) });
  });

  const pearlIds = new Set();
  const pearls = list(data.pearls, 'pearls', (value, path) => {
    record(value, ['id', 'trailIndex', 'offset'], path);
    if (!PEARLS.has(value.id)) invalid(`${path}.id`, 'must be one of the nine pearl ids');
    return Object.freeze({ id: unique(value.id, pearlIds, `${path}.id`),
      trailIndex: index(value.trailIndex, trail.length, `${path}.trailIndex`),
      offset: number(value.offset, `${path}.offset`) });
  });

  const spots = list(data.spots, 'spots', (value, path) => {
    record(value, ['creature', 'trailIndex', 'count'], path);
    if (!CREATURES.has(value.creature)) invalid(`${path}.creature`, 'must be one of the fourteen creature ids');
    if (!Number.isInteger(value.count) || value.count <= 0) invalid(`${path}.count`, 'must be a positive integer');
    return Object.freeze({ creature: value.creature,
      trailIndex: index(value.trailIndex, trail.length, `${path}.trailIndex`), count: value.count });
  });

  const zone = { id, circuit, switch: data.switch, ramp, trail, places, pearls, spots };
  // THE_DEEP 10.1 story additions: optional finds, checked like pearls. A zone
  // without the field loads exactly as it did before.
  if (Object.hasOwn(data, 'finds')) {
    const findIds = new Set();
    zone.finds = list(data.finds, 'finds', (value, path) => {
      record(value, ['id', 'trailIndex', 'offset', 'below'], path);
      const below = Object.hasOwn(value, 'below') ? number(value.below, `${path}.below`) : 0;
      if (below < 0 || below > 10) invalid(`${path}.below`, 'must be between 0 and 10');
      return Object.freeze({ id: unique(slug(value.id, `${path}.id`, 80), findIds, `${path}.id`),
        trailIndex: index(value.trailIndex, trail.length, `${path}.trailIndex`),
        offset: number(value.offset, `${path}.offset`), below });
    });
  }
  return Object.freeze(zone);
}
