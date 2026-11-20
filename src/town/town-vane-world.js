// Mrs Vane's things placed in the land for one town (TOWN-VANE-SCENE): her open kiosks at the town's edge, what she has put up at each
// territory's site for the deeds she holds, and Vane Reach beyond the Dry Dam. Pure: no DOM and no Three.js. The town drive reads it once
// at its start (src/town/town-world.js), so a replay is repeatable from seed, inputs and this layout; the job makes them solid from it, and
// src/town/view/town-vane-scene.js draws the same rows. It changes no rule of hers: the kiosks and deeds are the sim's (src/town/town-vane.js,
// src/town/town-deeds.js), and when the town's water runs clean or a deed is won back, her things are simply not in the next layout.
import {LAND} from '../world/scablands-names.js';
import {scablandsSurfaceHeightAt} from '../world/scablands-ground.js';
import {TOWN_CELL_METRES} from './town-world-data.js';
import {TOWN_DEEDS} from './content/deeds.js';
import {VANE_KIOSK_PITCHES, VANE_KIOSK_REACH, VANE_PIECES, VANE_REACH, VANE_SITE_PLAN, VANE_SITES} from './content/vane-world.js';
import {boxSolids, headingToward, nearestRoadPoint, thingBase, thingPoint, thingSeed} from './town-world-things.js';

const DEED_KINDS = Object.freeze(['road', 'works', 'outpost']);
// Where the town is when it has no buildings yet: the Scrapdome's gate, which the town grows out from.
const TOWN_START = Object.freeze({x: 0, z: -112});
// How far past the town's outermost building its edge is, in metres.
const EDGE_MARGIN = 12;

// One part of vane.glb set down at (x, z), turned by `heading`, on the ground under it.
function placePiece(id, pieceName, x, z, heading, heightAt) {
  const piece = VANE_PIECES[pieceName], thing = {id, x, z, heading};
  const base = thingBase(thing, piece.bounds, heightAt);
  const placed = {...thing, piece: pieceName, base: base.y, buried: base.buried, relief: base.relief};
  return Object.freeze({...placed, solids: Object.freeze(boxSolids(placed, piece.boxes, {base: base.y}))});
}

// The town's footprints in metres: every building and road of the Scablands region, [west, north, east, south].
function townFootprints(town, {roads = true} = {}) {
  return (town?.buildings ?? []).filter(row => row && (row.regionId ?? 'scablands') === 'scablands'
    && Number.isFinite(row.x) && Number.isFinite(row.z) && (roads || !String(row.buildingId ?? '').startsWith('road-'))).map(row => {
    const west = row.x * TOWN_CELL_METRES, north = row.z * TOWN_CELL_METRES;
    return [west, north, west + (row.width ?? 1) * TOWN_CELL_METRES, north + (row.depth ?? 1) * TOWN_CELL_METRES];
  });
}
const nearFootprint = ([west, north, east, south], x, z, reach) =>
  x > west - reach && x < east + reach && z > north - reach && z < south + reach;

// The town's middle and its edge: the mean of its buildings' middles, and the furthest corner from it plus a margin.
export function townEdge(town) {
  const prints = townFootprints(town, {roads: false});
  if (!prints.length) return {x: TOWN_START.x, z: TOWN_START.z, radius: 150};
  let x = 0, z = 0;
  for (const [west, north, east, south] of prints) { x += (west + east) / 2; z += (north + south) / 2; }
  x /= prints.length; z /= prints.length;
  let radius = 0;
  for (const [west, north, east, south] of prints) for (const [cx, cz] of [[west, north], [east, north], [west, south], [east, south]])
    radius = Math.max(radius, Math.hypot(cx - x, cz - z));
  return {x, z, radius: radius + EDGE_MARGIN};
}

// Her open kiosks: each on the free pitch nearest the town's edge on the side of its brown street. A pitch is free when no building or
// road of the town is within the kiosk's reach of it and no earlier kiosk stands there; one that is inside the edge is used only when no
// pitch outside it is free.
function placeKiosks(town, heightAt) {
  const kiosks = (town?.vane?.kiosks ?? []).filter(row => row && row.open === true && typeof row.id === 'string');
  if (!kiosks.length) return [];
  const edge = townEdge(town), prints = townFootprints(town), taken = new Set(), out = [];
  const taps = town?.utilities?.taps ?? [];
  for (const kiosk of kiosks) {
    const tap = taps.find(row => row?.id === kiosk.streetId && Number.isFinite(row.x) && Number.isFinite(row.z));
    const angle = tap && Math.hypot(tap.x - edge.x, tap.z - edge.z) > 1 ? Math.atan2(tap.z - edge.z, tap.x - edge.x)
      : thingSeed(Number(town.seed) || 0, kiosk.id) / 2 ** 32 * Math.PI * 2;
    const target = {x: edge.x + Math.cos(angle) * edge.radius, z: edge.z + Math.sin(angle) * edge.radius};
    let best = -1, score = Infinity;
    VANE_KIOSK_PITCHES.forEach(([x, z], index) => {
      if (taken.has(index) || prints.some(row => nearFootprint(row, x, z, VANE_KIOSK_REACH))) return;
      const inside = Math.hypot(x - edge.x, z - edge.z) < edge.radius ? 10_000 : 0;
      const value = Math.hypot(x - target.x, z - target.z) + inside;
      if (value < score) { score = value; best = index; }
    });
    // Every pitch is taken or built over: the kiosk is open in the town's books but has no stand in the land.
    if (best < 0) continue;
    taken.add(best);
    const [x, z] = VANE_KIOSK_PITCHES[best];
    const piece = placePiece(kiosk.id, 'kiosk', x, z, headingToward(x, z, edge.x, edge.z, VANE_PIECES.kiosk.front), heightAt);
    out.push(Object.freeze({...piece, streetId: kiosk.streetId ?? null, pitch: best}));
  }
  return out;
}

// What she has put up at each territory's site, one set of parts for each deed of that territory she holds.
function placeSites(town, land, heightAt) {
  const items = town?.deeds?.items ?? {}, prints = townFootprints(town), out = [];
  for (const site of VANE_SITES) {
    const held = DEED_KINDS.filter(kind => TOWN_DEEDS.some(deed => deed.territoryId === site.territoryId && deed.kind === kind
      && items[deed.id]?.ownerId === 'vane'));
    if (!held.length) continue;
    const at = land.at(...site.at), road = nearestRoadPoint(at.x, at.z);
    const frame = {x: at.x, z: at.z, heading: headingToward(at.x, at.z, road.x, road.z, '-z')};
    const pieces = [];
    for (const kind of held) VANE_SITE_PLAN[kind].forEach((plan, index) => {
      const point = thingPoint(frame, plan.at[0], plan.at[1]);
      // A part the town has built over is left out: her things never stand in the town's own buildings or roads.
      if (prints.some(row => nearFootprint(row, point.x, point.z, 8))) return;
      pieces.push(Object.freeze({...placePiece(`vane-${site.territoryId}-${kind}-${index + 1}`, plan.piece, point.x, point.z,
        frame.heading + (plan.turn ?? 0) * Math.PI / 2, heightAt), deedKind: kind}));
    });
    out.push(Object.freeze({territoryId: site.territoryId, ...frame, road: Object.freeze({...road}), held: Object.freeze(held),
      pieces: Object.freeze(pieces)}));
  }
  return out;
}

// Vane Reach: her white tower beyond the Dry Dam, its front toward the dam. It has stood there since the Long Dry, so it is in every town.
export function placeVaneReach({land = LAND, heightAt = scablandsSurfaceHeightAt} = {}) {
  const at = land.at(...VANE_REACH.at), dam = land.place('dry-dam');
  return placePiece('vane-reach', 'tower', at.x, at.z, headingToward(at.x, at.z, dam.x, dam.z, VANE_PIECES.tower.front), heightAt);
}

// Everything of hers for a town: {kiosks, sites, reach, solids}.
export function townVaneWorld(town = null, {land = LAND, heightAt = scablandsSurfaceHeightAt} = {}) {
  const kiosks = Object.freeze(placeKiosks(town, heightAt)), sites = Object.freeze(placeSites(town, land, heightAt));
  const reach = placeVaneReach({land, heightAt});
  const solids = [...kiosks.flatMap(row => row.solids), ...sites.flatMap(site => site.pieces.flatMap(piece => piece.solids)), ...reach.solids];
  return Object.freeze({kiosks, sites, reach, solids: Object.freeze(solids)});
}
