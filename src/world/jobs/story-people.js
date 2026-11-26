// Night 2's positions belong to the world job. The renderer can turn a head
// during a conversation while these paths and every other job clock are still.
const PROFILES = [
  // Name, figure, standing height (metres), shoulder width multiplier, walking pace (m/s).
  ['rell', 'rell', 1.78, 1.13, 1.23],
  ['dace', 'dace', 1.58, .88, 1.52],
  ['wim', 'walker-kid-a', 1.16, .97, 1.08],
  ['walker-1', 'walker-a', 1.75, .99, 1.29],
  ['walker-2', 'walker-b', 1.63, 1.05, 1.18],
  ['walker-3', 'walker-c', 1.83, 1.02, 1.36],
  ['walker-4', 'walker-vane', 1.69, .94, 1.26],
  ['walker-5', 'walker-e', 1.73, 1.07, 1.22],
  ['walker-6', 'walker-f', 1.61, 1, 1.15],
  ['walker-7', 'walker-g', 1.81, .98, 1.41],
  ['walker-8', 'walker-h', 1.68, .94, 1.32],
  ['auntie-solder', 'auntie-solder', 1.70, 1, 1.16],
  ['cinder', 'cinder', 1.70, 1, 1.4],
  ['clinker', 'clinker', 1.85, 1.11, 1.37],

  // The Glasshouse, Radio Hill and the Road Rats (OPEN-FIGURES-2).
  ['marigold', 'marigold', 1.64, 1.21, 1.09, 'open-figures-2'],
  ['finch', 'finch', 1.44, .87, 1.46, 'open-figures-2'],
  ['grower-1', 'grower-1', 1.79, 1.04, 1.25, 'open-figures-2'],
  ['grower-2', 'grower-2', 1.61, 1.01, 1.16, 'open-figures-2'],
  ['grower-3', 'grower-3', 1.72, .97, 1.31, 'open-figures-2'],
  ['hetty', 'hetty', 1.69, .96, 1.21, 'open-figures-2'],
  ['bern', 'bern', 1.64, 1.08, 1.18, 'open-figures-2'],
  ['sump', 'sump', 1.81, 1.24, 1.12, 'open-figures-2'],
  ['road-rat-lamp', 'road-rat-lamp', 1.76, .95, 1.24, 'open-figures-2'],
  ['road-rat-lookout', 'road-rat-lookout', 1.85, 1.06, 1.37, 'open-figures-2'],
];

export const STORY_FIGURES = Object.freeze(Object.fromEntries(PROFILES.map(
  ([id, asset, height, width, pace, family], index) => [id, Object.freeze({asset, height, width, pace, index, family})]
)));

// From the gate, Rell occupies the open front of the group. Wim can look
// round her coat, Dace stands towards the hearth side, and the carts have
// room to come between the clusters behind. +z is the group's facing.
const GATE_OFFSETS = [
  [0, .4, 0], [1.35, -.8, -.27], [-.56, -.37, .22],
  [-1.85, -1.52, .43], [-3.43, -2.25, .67], [.72, -1.91, -.12],
  [2.65, -1.66, -.47], [3.51, -2.88, -.73], [-2.54, -3.05, .37],
  [-1.07, -3.87, .11], [2.02, -4.43, -.35],
];

export const HANDCART = Object.freeze({width:.83, length:1.18, axleAhead:1.15, wheelRadius:.34, shaftBack:-.81, bedHeight:.509});
const CARTERS = new Set(['walker-1','walker-3','walker-6','walker-8']);

function placeCart(person) {
  const at = person.position;
  const cart = person.cart ??= {travel:0};
  cart.x = at.x + Math.sin(person.yaw) * HANDCART.axleAhead;
  cart.y = at.y;
  cart.z = at.z + Math.cos(person.yaw) * HANDCART.axleAhead;
  cart.yaw = person.yaw;
}

export function walkerGroupAt(origin, yaw, heightAt = () => origin.y) {
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  return GATE_OFFSETS.map(([east, forward, turn], index) => {
    const x = origin.x + east * cos + forward * sin;
    const z = origin.z - east * sin + forward * cos;
    const id = PROFILES[index][0];
    return {id, position: {x, y: heightAt(x, z), z}, yaw: yaw + turn, cart:CARTERS.has(id)};
  });
}

const PACE_FACTOR = {walk:1, run:3.15, 'push-cart':.72, 'walk-tied':.74, 'carry-lamp':1};
const MOVING = new Set([...Object.keys(PACE_FACTOR), 'carry-frame']);
const RESTING = new Set(['stand', 'sit', 'sleep', 'hoe', 'hands-on-hips', 'lookout', 'hold-ledger']);
const GROWERS = ['grower-1', 'grower-2', 'grower-3'];
const TASK_CAST = {
  hoe:GROWERS, 'walk-tied':GROWERS, 'carry-frame':GROWERS,
  'carry-lamp':['road-rat-lamp'], lookout:['road-rat-lookout'],
  'hold-ledger':['sump'], 'hands-on-hips':['marigold'],
};

export function createStoryPeople(placements) {
  const cast = [], ids = new Set();
  for (const {id, position, yaw = 0, action = 'stand', path, cart, seat, pace, framePartner} of placements) {
    if (!Object.hasOwn(STORY_FIGURES, id) || ids.has(id))
      throw new Error('Unknown or repeated story figure: ' + id);
    if (![position?.x, position?.y, position?.z, yaw].every(Number.isFinite))
      throw new TypeError('A story figure needs a ground position and heading: ' + id);
    ids.add(id);
    const {height, width} = STORY_FIGURES[id];
    const radius = .4 * width * height / 1.7;
    const person = {id, position: {...position}, height, radius, yaw, distance: 0, action: 'stand', seat, pace};
    if (framePartner) person.framePartner = framePartner;
    if (cart) placeCart(person);
    setStoryPersonAction(person, action, path);
    cast.push(person);
  }
  return cast;
}

export function setStoryPersonAction(person, action, path = []) {
  if (!MOVING.has(action) && !RESTING.has(action)) throw new Error('Unknown story action: ' + action);
  if (Object.hasOwn(TASK_CAST, action) && !TASK_CAST[action].includes(person.id))
    throw new Error(person.id + ' has no pose for ' + action);
  if (MOVING.has(action) && (!path.length || !path.every(p => Number.isFinite(p.x) && Number.isFinite(p.z))))
    throw new Error('A moving story figure needs a path in metres.');
  if (action === 'push-cart') placeCart(person);
  person.action = action;
  person.path = MOVING.has(action) ? path : [];
  person.nextPoint = 0;
}

// Return whether any solid changed position. A standing crowd requires no
// grid rebuild. Consuming the unspent distance at corners keeps pace and
// arrival independent of how the game's steps divide the path.
export function advanceStoryPeople(cast, dt, heightAt) {
  let moved = false;
  for (const person of cast) {
    if (!MOVING.has(person.action)) continue;
    // Both ends of a windscreen travel at one pace.
    const usual = STORY_FIGURES[person.id].pace;
    const speed = person.pace ?? (person.action === 'carry-frame' ? .92 : usual * PACE_FACTOR[person.action]);
    let remaining = Math.max(0, dt) * speed;
    while (remaining > 0 && person.nextPoint < person.path.length) {
      const at = person.position, goal = person.path[person.nextPoint];
      const dx = goal.x - at.x, dz = goal.z - at.z, length = Math.hypot(dx, dz);
      if (length === 0) { person.nextPoint++; continue; }
      const step = Math.min(length, remaining);
      at.x += dx * step / length;
      at.z += dz * step / length;
      at.y = heightAt(at.x, at.z, at.y);
      person.yaw = Math.atan2(dx, dz);
      person.distance += step;
      if (person.action === 'push-cart') {
        placeCart(person);
        person.cart.travel += step;
      }
      remaining -= step;
      if (step === length) person.nextPoint++;
      moved = true;
    }
    if (person.nextPoint === person.path.length) setStoryPersonAction(person, 'stand');
  }
  return moved;
}

const shortTurn = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
export function attendTo(person, facing, target, dt) {
  const awake = person.action !== 'sleep';
  const hasTarget = awake && target && Math.hypot(target.x - person.position.x, target.z - person.position.z) > .001;
  const look = hasTarget ? Math.atan2(target.x - person.position.x, target.z - person.position.z) : person.yaw;
  const body = hasTarget && person.action === 'stand' ? look : person.yaw;
  const maxTurn = 4 * Math.max(0, dt);
  facing.yaw += Math.max(-maxTurn, Math.min(maxTurn, shortTurn(body - facing.yaw)));
  const desiredHead = Math.max(-.84, Math.min(.84, shortTurn(look - facing.yaw)));
  facing.headYaw += Math.max(-maxTurn * 1.8, Math.min(maxTurn * 1.8, desiredHead - facing.headYaw));
}
