// The one picture of the Scablands that both maps are drawn from (SCABLANDS-LAND round 4, slice 4). It is made once, when the
// land is first asked for, from the same data the ground is drawn and driven from, and nothing in it is written by hand:
//   the ground      each point of the land is asked what it is (scablandsDriveAt, the question the car's wheels ask), and is painted in
//                   a muted version of that ground's own colour (GROUND_COLOURS, the table the ground's shader reads);
//   the height      each point is asked how high it is (scablandsHeightAt) and the ground is shaded as a soft relief lit from the
//                   north-west, so that a rise, a hill, a scarp or the dry river's cut shows without any change here;
//   the marks       the dry river, the five crossings, every road of the net, the places and a small plan of what stands in each
//                   (its solid boxes), all read from the land's own tables.
// The ground is a grid of 25 m cells (560 by 400, 224,000 of them). It is worked out in slices (`step`) so that no frame is held up:
// a slice asks about 8 ms worth of rows. Drawing the picture is `src/world/scablands-map.js`.
import {openMapMarks} from './open/map-marks.js';
import {sitePosition} from './open/site-rule.js';
import {SERVICE_LANDMARKS} from './open/building-rule.js';
import {LAND} from './scablands-names.js';
import {SCABLANDS_LAYOUT, SCABLANDS_PLACES} from './scablands.js';
import {DRIVE, RIVER, RIVER_LAND, scablandsDriveAt} from './scablands-regions.js';
import {ROAD_NET} from './scablands-road.js';
import {scablandsHeightAt} from './scablands-height.js';
import {GROUND_COLOURS} from './scablands-ground-look.js';

export const PICTURE_CELL = 25;
// The grounds in the order the picture numbers them (the keys of the table that says how each drives).
export const REGION_KEYS = Object.freeze(Object.keys(DRIVE));
const REGION_INDEX = new Map(Object.entries(DRIVE).map(([key, record], index) => [record, index]));

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const channels = hex => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

// A worn field map is drawn in dusty colours: each ground's own colour moved a share of the way to the paper's.
export const PAPER = channels(0x8c8068);
const MUTE_SHARE = .36;
export const mutedColour = (hex, share = MUTE_SHARE) => channels(hex).map((value, index) => Math.round(value + (PAPER[index] - value) * share));
// What each ground is called on the map, and its colour (a road is drawn as a pale line over the picture as well).
const GROUND_FOR = Object.freeze({road: 'road', 'river-bed-soft': 'river-bed'});
export const REGION_COLOURS = Object.freeze(Object.fromEntries(REGION_KEYS.map(key => {
  const base = GROUND_COLOURS[GROUND_FOR[key] ?? key];
  // Soft sand in the river bed is a shade darker than the bed round it.
  const colour = mutedColour(base, key === 'river-bed-soft' ? .22 : MUTE_SHARE).map(value => key === 'river-bed-soft' ? Math.round(value * .82) : value);
  return [key, Object.freeze(colour)];
})));
export const REGION_NAMES = Object.freeze(Object.fromEntries(REGION_KEYS.map(key => [key, DRIVE[key].name])));
// Beyond the land's rim (the ridge and the wall) the ground is cliff: the picture fades to this rock colour where the land is higher than any hill (100 m and over).
export const RIM_COLOUR = Object.freeze(mutedColour(GROUND_COLOURS.rock, .12).map(value => Math.round(value * .72)));
const RIM_FROM = 100, RIM_TO = 150;

// Relief: lit from the north-west (west is -x, north is -z), the vertical stretched so that a 26 m rise over 460 m shows.
const LIGHT = (() => { const x = -.55, y = .7, z = -.6, length = Math.hypot(x, y, z); return {x: x / length, y: y / length, z: z / length}; })();
// The plain's own roll (about 2 m over 700 m, a slope under 2 percent) is not drawn: only a slope above the dead zone is.
const STRETCH = 9, DEAD_ZONE = .025, RELIEF = 1.05, SHADE_MIN = .5, SHADE_MAX = 1.4;
const FLAT_LIGHT = LIGHT.y;
export function reliefShade(gradientX, gradientZ) {
  const slope = Math.hypot(gradientX, gradientZ), keep = slope > DEAD_ZONE ? (slope - DEAD_ZONE) / slope : 0;
  const nx = -gradientX * keep * STRETCH, nz = -gradientZ * keep * STRETCH, length = Math.hypot(nx, 1, nz);
  const lit = (nx * LIGHT.x + LIGHT.y + nz * LIGHT.z) / length;
  return clamp(1 + RELIEF * (lit / FLAT_LIGHT - 1), SHADE_MIN, SHADE_MAX);
}

// The plans of the places: each solid box of the scene (id, place, centre, half extents, heading), as a footprint on the ground.
export function placePlans(places, solids) {
  const plans = new Map(places.map(place => [place.id, []]));
  for (const solid of solids ?? []) {
    const box = solid.collision ?? {center: solid.center, halfExtents: solid.size?.map(value => value / 2), heading: 0};
    if (!box?.center || !box.halfExtents) continue;
    const x = box.center[0], z = box.center[2];
    let owner = solid.placeId && plans.has(solid.placeId) ? solid.placeId : null;
    if (!owner) {
      let best = 320;
      for (const place of places) { const away = Math.hypot(place.x - x, place.z - z); if (away < best) { best = away; owner = place.id; } }
    }
    if (owner) plans.get(owner).push(Object.freeze({id: solid.id ?? null, x, z, width: box.halfExtents[0] * 2, depth: box.halfExtents[2] * 2, heading: box.heading ?? 0}));
  }
  return plans;
}

// The marks of the land: everything that is a line, a point or a footprint rather than a ground. Read from the tables, not typed.
// At merge the laptop supplies OPEN-SITES's sitePosition in place of these two approved first positions.
const firstPositions = {
  glasshouse: LAND.at('ships-in-sand', 2000, 700),
  'radio-hill': LAND.at('tin-town', -2245, -992),
};

// OPEN-SITES joined on 25 November: a site stands where the land's seed puts it; the first positions remain only for a
// site whose row gives none.
export function landMarks({base, world, serviceSheds, positionOf = (id, landSeed) => sitePosition(id, landSeed) ?? firstPositions[id], ...options} = {}) {
  const fixed = base ?? fixedLandMarks(options);
  if (!world) return fixed;
  const {sites, rumours, driven} = openMapMarks(world, positionOf);
  const extraPlaces = sites.map(site => ({...site, label: site.name, flatRadius: 60, plan: []}));
  const services = serviceSheds ? SERVICE_LANDMARKS.filter(({person}) => world.ledger.encounters?.[person]) : [];
  return {...fixed, places: [...fixed.places, ...extraPlaces], rumours, driven, services};
}

function fixedLandMarks({land = LAND, places = SCABLANDS_PLACES, net = ROAD_NET, river = RIVER_LAND, solids = []} = {}) {
  const plans = placePlans(places, solids);
  const camp = land.at('safe-road');
  return Object.freeze({
    roads: Object.freeze(net.roads.map(road => Object.freeze({id: road.id, name: road.name, halfWidth: road.halfWidth, length: road.length, points: road.points}))),
    river: Object.freeze({name: 'The Dry River', points: river.line.points, length: river.line.length, bedWidth: RIVER.bedHalfWidth * 2, lipWidth: RIVER.lipHalfWidth * 2}),
    crossings: Object.freeze(river.crossings.map(crossing => Object.freeze({id: crossing.id, name: crossing.name, kind: crossing.kind, x: crossing.x, z: crossing.z}))),
    places: Object.freeze([
      Object.freeze({id: land.yard.id, name: land.yard.name, x: land.yard.x, z: land.yard.z, flatRadius: 60, plan: Object.freeze([])}),
      ...places.map(place => Object.freeze({id: place.id, name: place.name, x: place.x, z: place.z, flatRadius: place.flatRadius, plan: Object.freeze(plans.get(place.id) ?? [])})),
    ]),
    camps: Object.freeze([Object.freeze({id: 'safe-road', name: 'Halfway Camp', x: camp.x, z: camp.z})]),
  });
}

// Where each ground is widest: the middle of the biggest stretches of it, found on a coarse grid of 100 m blocks. A road is not a
// ground to name, and the soft sand in the bed is the bed.
function regionLabels(region, width, height, cell, x0, z0) {
  const BLOCK = 4, bw = Math.floor(width / BLOCK), bh = Math.floor(height / BLOCK), block = BLOCK * cell;
  const kinds = REGION_KEYS.map(key => GROUND_FOR[key] === 'road' ? -1 : REGION_KEYS.indexOf(GROUND_FOR[key] ?? key));
  const roadIndex = REGION_KEYS.indexOf('road');
  const coarse = new Int8Array(bw * bh), counts = new Uint16Array(REGION_KEYS.length);
  for (let bj = 0; bj < bh; bj++) for (let bi = 0; bi < bw; bi++) {
    counts.fill(0);
    for (let j = 0; j < BLOCK; j++) for (let i = 0; i < BLOCK; i++) { const index = region[(bj * BLOCK + j) * width + bi * BLOCK + i]; if (index !== roadIndex) counts[kinds[index]]++; }
    let best = 0; for (let k = 1; k < counts.length; k++) if (counts[k] > counts[best]) best = k;
    coarse[bj * bw + bi] = counts[best] > 0 ? best : -1;
  }
  // Components of one ground, and each cell's distance to the edge of its component (steps of a block, by two sweeps).
  const comp = new Int32Array(bw * bh).fill(-1), sizes = [], kindOf = [];
  const stack = [];
  for (let start = 0; start < comp.length; start++) {
    if (comp[start] >= 0 || coarse[start] < 0) continue;
    const id = sizes.length; let size = 0; stack.push(start); comp[start] = id;
    while (stack.length) {
      const at = stack.pop(); size++;
      const ai = at % bw, aj = (at - ai) / bw;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const i = ai + di, j = aj + dj;
        if (i < 0 || j < 0 || i >= bw || j >= bh) continue;
        const next = j * bw + i;
        if (comp[next] < 0 && coarse[next] === coarse[start]) { comp[next] = id; stack.push(next); }
      }
    }
    sizes.push(size); kindOf.push(coarse[start]);
  }
  const depth = new Float32Array(bw * bh);
  const edge = (i, j, id) => i < 0 || j < 0 || i >= bw || j >= bh || comp[j * bw + i] !== id;
  for (let at = 0; at < depth.length; at++) { const i = at % bw, j = (at - i) / bw; depth[at] = comp[at] < 0 ? 0 : (edge(i - 1, j, comp[at]) || edge(i + 1, j, comp[at]) || edge(i, j - 1, comp[at]) || edge(i, j + 1, comp[at])) ? 1 : 1e6; }
  const relax = (at, other, cost) => { if (depth[other] + cost < depth[at]) depth[at] = depth[other] + cost; };
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) { const at = j * bw + i; if (i) relax(at, at - 1, 1); if (j) relax(at, at - bw, 1); if (i && j) relax(at, at - bw - 1, 1.4); if (j && i + 1 < bw) relax(at, at - bw + 1, 1.4); }
  for (let j = bh - 1; j >= 0; j--) for (let i = bw - 1; i >= 0; i--) { const at = j * bw + i; if (i + 1 < bw) relax(at, at + 1, 1); if (j + 1 < bh) relax(at, at + bw, 1); if (i + 1 < bw && j + 1 < bh) relax(at, at + bw + 1, 1.4); if (j + 1 < bh && i) relax(at, at + bw - 1, 1.4); }
  const best = new Map();
  for (let at = 0; at < depth.length; at++) {
    const id = comp[at]; if (id < 0) continue;
    if (!best.has(id) || depth[at] > depth[best.get(id)]) best.set(id, at);
  }
  const labels = [], taken = new Map();
  const ordered = [...best.entries()].sort((a, b) => sizes[b[0]] - sizes[a[0]]);
  for (const [id, at] of ordered) {
    const key = REGION_KEYS[kindOf[id]], deep = depth[at] * block;
    // A patch of ground is named when it is at least 2 km2 and 200 m from its own edge; each ground is named in at most three places.
    if (sizes[id] * block * block < 2e6 || deep < 200 || (taken.get(key) ?? 0) >= 3) continue;
    taken.set(key, (taken.get(key) ?? 0) + 1);
    const i = at % bw, j = (at - i) / bw;
    labels.push(Object.freeze({key, name: REGION_NAMES[key], x: x0 + (i + .5) * block, z: z0 + (j + .5) * block, depth: deep, area: sizes[id] * block * block}));
  }
  return Object.freeze(labels);
}

// The picture. `driveAt` and `heightAt` default to the land's own; a test may hand it others. `solids` are the scene's boxes.
export function createLandPicture({cell = PICTURE_CELL, driveAt = scablandsDriveAt, heightAt = scablandsHeightAt, halfWidth = SCABLANDS_LAYOUT.halfWidth,
  halfDepth = SCABLANDS_LAYOUT.halfDepth, marks = landMarks()} = {}) {
  const width = Math.round(halfWidth * 2 / cell), height = Math.round(halfDepth * 2 / cell);
  const x0 = -halfWidth, z0 = -halfDepth;
  const pixels = new Uint8ClampedArray(width * height * 4), region = new Uint8Array(width * height), heights = new Float32Array(width * height);
  const shade = new Float32Array(width * height).fill(1), rim = new Float32Array(width * height);
  const paper = [...PAPER.map(value => Math.round(value * .8)), 255];
  for (let at = 0; at < width * height; at++) pixels.set(paper, at * 4);
  let rowsDone = 0, paintedRows = 0, finished = false, spentMs = 0, labels = [];

  const paint = (index) => {
    const base = REGION_COLOURS[REGION_KEYS[region[index]]], k = shade[index], w = rim[index], at = index * 4;
    for (let c = 0; c < 3; c++) pixels[at + c] = Math.round((base[c] * k) * (1 - w) + RIM_COLOUR[c] * k * w);
    pixels[at + 3] = 255;
  };
  const surveyRow = j => {
    const z = z0 + (j + .5) * cell;
    for (let i = 0; i < width; i++) {
      const x = x0 + (i + .5) * cell, index = j * width + i;
      region[index] = REGION_INDEX.get(driveAt(x, z)) ?? 0; heights[index] = heightAt(x, z);
      const at = index * 4, base = REGION_COLOURS[REGION_KEYS[region[index]]];
      pixels[at] = base[0]; pixels[at + 1] = base[1]; pixels[at + 2] = base[2]; pixels[at + 3] = 255;
    }
  };
  const shadeRow = j => {
    const above = Math.max(0, j - 1), below = Math.min(height - 1, j + 1);
    for (let i = 0; i < width; i++) {
      const index = j * width + i, left = Math.max(0, i - 1), right = Math.min(width - 1, i + 1);
      const gx = (heights[j * width + right] - heights[j * width + left]) / ((right - left) * cell), gz = (heights[below * width + i] - heights[above * width + i]) / ((below - above) * cell);
      shade[index] = reliefShade(gx, gz);
      rim[index] = smooth((heights[index] - RIM_FROM) / (RIM_TO - RIM_FROM));
      paint(index);
    }
  };
  // Works for about `budgetMs`; returns true once the whole picture is made. The ground is surveyed row by row (it shows at once,
  // unshaded), then the relief is laid over it a row at a time.
  const step = (budgetMs = 8, clock = () => performance.now()) => {
    if (finished) return true;
    const began = clock();
    while (clock() - began < budgetMs) {
      if (rowsDone < height) surveyRow(rowsDone++);
      else if (paintedRows < height) shadeRow(paintedRows++);
      else { labels = regionLabels(region, width, height, cell, x0, z0); finished = true; break; }
    }
    spentMs += clock() - began;
    return finished;
  };
  const picture = {
    cell, width, height, x0, z0, pixels, region, heights, shade, rim, marks,
    get done() { return finished; },
    get progress() { return (rowsDone + paintedRows) / (height * 2); },
    get spentMs() { return spentMs; },
    get labels() { return labels; },
    step,
    // Makes the whole picture at once (a test, a tool). Returns the milliseconds it took.
    build(clock = () => performance.now()) { const began = clock(); while (!step(1e9, clock)); return clock() - began; },
    pixelOf(x, z) { return {i: clamp(Math.floor((x - x0) / cell), 0, width - 1), j: clamp(Math.floor((z - z0) / cell), 0, height - 1)}; },
    regionAt(x, z) { const {i, j} = picture.pixelOf(x, z); return REGION_KEYS[region[j * width + i]]; },
    colourAt(x, z) { const {i, j} = picture.pixelOf(x, z), at = (j * width + i) * 4; return [pixels[at], pixels[at + 1], pixels[at + 2]]; },
    heightAtPixel(x, z) { const {i, j} = picture.pixelOf(x, z); return heights[j * width + i]; },
    rimAt(x, z) { const {i, j} = picture.pixelOf(x, z); return rim[j * width + i]; },
    shadeAt(x, z) { const {i, j} = picture.pixelOf(x, z); return shade[j * width + i]; },
  };
  return picture;
}
