// Still plates and ladders for climbing on foot (SHIPS-DECKS, docs/story/ships-in-the-sand.md section 6): the decks of the three
// ships at Deck Town, the top of Patience's mast and the three landings of the lighthouse stairs. A plate is a flat outline at one
// height; a ladder joins the ground or one plate to the next. One press of F at a ladder's foot takes the fighter to its top (and
// at its top, back down to its foot), the way the Iron Mule's roof plates take a rider up (MULE-RAILS, src/world/jobs/steps/board.js),
// except that these plates never move. A fall keeps the step's place and puts the fighter on the ground beside the ship.
//
// Heights are the job data's own (ships-in-the-sand.md section 5): a place's `y` on a deck or a stair is the height of its plate.
// Positions are in the job's frame, x east and z south, the same numbers the job's places use. Pure: no DOM, no Three.js.

const TAU = Math.PI * 2;
const point = (x, z) => Object.freeze({x, z});

// A deck: a rectangle `length` long along `heading` (radians from +z toward +x) and `beam` wide, centred on (x, z).
function hull(x, z, heading, length, beam) {
  const ux = Math.sin(heading), uz = Math.cos(heading), vx = -uz, vz = ux, a = length / 2, b = beam / 2;
  return Object.freeze([point(x + ux * a + vx * b, z + uz * a + vz * b), point(x + ux * a - vx * b, z + uz * a - vz * b),
    point(x - ux * a - vx * b, z - uz * a - vz * b), point(x - ux * a + vx * b, z - uz * a + vz * b)]);
}
// A landing or a crow's nest: a regular polygon of `sides` around (x, z).
function round(x, z, radius, sides = 8) {
  return Object.freeze(Array.from({length: sides}, (_, i) => point(x + Math.sin(i / sides * TAU) * radius, z + Math.cos(i / sides * TAU) * radius)));
}
// A point on a ship, `along` its length and `across` its beam (positive to the right of its heading), as world x and z.
function onShip(ship, along, across) {
  const ux = Math.sin(ship.heading), uz = Math.cos(ship.heading);
  return point(ship.x + ux * along - uz * across, ship.z + uz * along + ux * across);
}

// The three ships and the lighthouse, where they lie. Patience lies from her log toward her mast.
const GOOD_HOPE = Object.freeze({id: 'good-hope', x: -45, z: -415, heading: Math.PI / 2, length: 32, beam: 7});
const MARIGOLD = Object.freeze({id: 'marigold', x: 45, z: -440, heading: Math.PI / 2, length: 28, beam: 6.5});
const PATIENCE = Object.freeze({id: 'patience', x: 8.5, z: -466, heading: Math.atan2(7, 8), length: 34, beam: 8});
const LIGHTHOUSE = Object.freeze({id: 'lighthouse', x: 170, z: -394.5});

const plate = (id, structure, y, outline) => Object.freeze({id, structure, y, outline});
export const DECK_PLATES = Object.freeze([
  plate('good-hope-deck', 'good-hope', 4, hull(GOOD_HOPE.x, GOOD_HOPE.z, GOOD_HOPE.heading, GOOD_HOPE.length, GOOD_HOPE.beam)),
  plate('marigold-deck', 'marigold', 4, hull(MARIGOLD.x, MARIGOLD.z, MARIGOLD.heading, MARIGOLD.length, MARIGOLD.beam)),
  plate('patience-deck', 'patience', 4, hull(PATIENCE.x, PATIENCE.z, PATIENCE.heading, PATIENCE.length, PATIENCE.beam)),
  plate('patience-mast-top', 'patience', 18, round(12, -462, 1.6)),
  plate('stairs-landing-1', 'lighthouse', 8, round(LIGHTHOUSE.x, LIGHTHOUSE.z, 4.5)),
  plate('stairs-landing-2', 'lighthouse', 16, round(LIGHTHOUSE.x, LIGHTHOUSE.z, 4.5)),
  plate('lamp-room', 'lighthouse', 24, round(LIGHTHOUSE.x, LIGHTHOUSE.z, 3.5)),
]);

// `from` is a plate id or 'ground'; the foot stands on `from`, the top on `to`. Each foot is a step clear of the next place, so
// arriving at the top never takes a log without the player walking to it.
const ladder = (id, structure, from, to, foot, top, radius = 1.6) => Object.freeze({id, structure, from, to, foot, top, radius});
export const DECK_LADDERS = Object.freeze([
  ladder('good-hope-side', 'good-hope', 'ground', 'good-hope-deck', onShip(GOOD_HOPE, 4, 5.5), onShip(GOOD_HOPE, 4, 2.2)),
  ladder('marigold-side', 'marigold', 'ground', 'marigold-deck', onShip(MARIGOLD, -4, 5.3), onShip(MARIGOLD, -4, 2)),
  ladder('patience-side', 'patience', 'ground', 'patience-deck', onShip(PATIENCE, -9, 6), onShip(PATIENCE, -9, 2.8)),
  ladder('patience-mast', 'patience', 'patience-deck', 'patience-mast-top', onShip(PATIENCE, 5.3, -1.4), point(12, -462)),
  ladder('stairs-1', 'lighthouse', 'ground', 'stairs-landing-1', point(170, -391.5), point(173.2, -394.5)),
  ladder('stairs-2', 'lighthouse', 'stairs-landing-1', 'stairs-landing-2', point(173.2, -396.5), point(166.8, -394.5)),
  ladder('stairs-3', 'lighthouse', 'stairs-landing-2', 'lamp-room', point(166.8, -396.5), point(170, -395)),
]);

export const DECK_RULE = Object.freeze({
  // How far below its plate the fighter may be before that counts as a fall (a jump lands back on the plate).
  fallDrop: 1,
  // How close a job place's `y` must be to a plate's height to stand on it.
  heightTolerance: .05,
});

// The sound of each climbing event, played through the arena's tells: the thump the Iron Mule's roof boarding already uses
// (crew.boarding.mount in src/audio.js).
export const DECK_CUES = Object.freeze({climbed: 'vehicle.landing', climbedDown: 'vehicle.landing', fell: 'vehicle.landing'});

// Where the lighthouse lamp burns: in the lamp room, two metres over its floor. The night storm's beam sweeps from here.
export const LIGHTHOUSE_LAMP = Object.freeze({x: LIGHTHOUSE.x, y: 26, z: LIGHTHOUSE.z});

const plateById = new Map(DECK_PLATES.map(item => [item.id, item]));
export const deckPlate = id => plateById.get(id) ?? null;

// Even-odd test of a point against a closed outline.
export function insideOutline(outline, x, z) {
  let inside = false;
  for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
    const a = outline[i], b = outline[j];
    if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

// The height of the plate `plateId` under (x, z), or null off its outline. The walk (src/onfoot.js) reads it while the fighter
// stands on a plate, which the mode keeps as `fighter.deckPlate`.
export function deckFloorHeightAt(plateId, x, z) {
  const found = deckPlate(plateId);
  return found && insideOutline(found.outline, x, z) ? found.y : null;
}

// The plate a job place stands on: the one whose outline holds it at its own height. Null for a place on the ground.
export function plateForPlace(place, plates = DECK_PLATES) {
  const at = place?.position ?? place;
  if (!at) return null;
  return plates.find(item => Math.abs(item.y - (at.y ?? 0)) <= DECK_RULE.heightTolerance && insideOutline(item.outline, at.x, at.z)) ?? null;
}

// Where the fighter lands after falling from a plate: the foot of the ladder from the ground up that ship.
export function groundBeside(plateId) {
  const structure = deckPlate(plateId)?.structure;
  return DECK_LADDERS.find(item => item.structure === structure && item.from === 'ground')?.foot ?? null;
}

const flat = (a, b) => Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.z ?? 0) - (b?.z ?? 0));

// The ladder end within reach of the fighter on their level: a foot to go up, or a top to come down. Null when none is.
export function ladderWithin(level, position, ladders = DECK_LADDERS) {
  let best = null, bestGap = Infinity;
  for (const item of ladders) {
    for (const [end, on, goes, to] of [['foot', item.from, 'up', item.to], ['top', item.to, 'down', item.from]]) {
      if (on !== level) continue;
      const gap = flat(position, item[end]);
      if (gap <= item.radius && gap < bestGap) { best = {ladder: item, goes, to, at: item[end === 'foot' ? 'top' : 'foot']}; bestGap = gap; }
    }
  }
  return best;
}

// The first ladder end to walk to, from `level`, on the way to the plate `target` ('ground' for the ground). Null when already
// there or when no ladders join them. A breadth-first walk over the ladders; the table is small.
export function routeToLevel(level, target, ladders = DECK_LADDERS) {
  if (level === target) return null;
  const seen = new Set([level]), queue = [[level, null]];
  while (queue.length) {
    const [here, first] = queue.shift();
    for (const item of ladders) {
      for (const [from, to, end] of [[item.from, item.to, item.foot], [item.to, item.from, item.top]]) {
        if (from !== here || seen.has(to)) continue;
        const step = first ?? end;
        if (to === target) return step;
        seen.add(to);
        queue.push([to, step]);
      }
    }
  }
  return null;
}

// One tick of climbing for an on-foot step with `climbs: true`. `state.plate` is the plate the fighter stands on (null on the
// ground) and `state.fHeld` whether F was down last tick, so one press climbs one ladder. Returns the new climbing state and the
// events for the mode: `roofBoard` (MULE-RAILS's event: put the fighter at this position, standing on that height) after a climb,
// and `fell` with `deckGround` (put the fighter on the ground at this x and z) after a fall. A fall keeps every place reached.
export function stepDeckClimb(state, view) {
  const fighter = view.fighter, at = fighter?.position ?? fighter;
  const press = view.interact === true && state.fHeld !== true;
  const events = [];
  let plate = state.plate ?? null;
  if (plate && at) {
    const standing = deckPlate(plate);
    const off = !standing || !insideOutline(standing.outline, at.x, at.z) || (at.y ?? standing.y) < standing.y - DECK_RULE.fallDrop;
    if (off || fighter?.knockedDown) {
      const ground = groundBeside(plate);
      events.push({type: 'fell', plateId: plate}, {type: 'deckGround', position: ground ? {x: ground.x, z: ground.z} : {x: at.x, z: at.z}});
      plate = null;
    }
  }
  if (press && at && !events.length) {
    const reach = ladderWithin(plate ?? 'ground', at);
    if (reach) {
      const height = reach.to === 'ground' ? null : deckPlate(reach.to).y;
      events.push(height === null
        ? {type: 'deckGround', position: {x: reach.at.x, z: reach.at.z}, ladderId: reach.ladder.id}
        : {type: 'roofBoard', position: {x: reach.at.x, y: height, z: reach.at.z}, ladderId: reach.ladder.id});
      events.push({type: reach.goes === 'up' ? 'climbed' : 'climbedDown', ladderId: reach.ladder.id, plateId: reach.to === 'ground' ? null : reach.to});
      plate = reach.to === 'ground' ? null : reach.to;
    }
  }
  return {state: {plate, fHeld: view.interact === true}, events};
}
