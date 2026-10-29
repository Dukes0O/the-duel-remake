// Scenery a circuit draws for itself, from the `effects`, `hills` and `basins`
// blocks of its definition (docs/CIRCUITS.md section 5.3): a lake with mist
// drifting over it, wooded hills with ski runs cut into them and a ring of
// rounded hills far behind. Presentation only. Native progress can fade the mist; nothing writes race
// state, and nothing is placed on the road: the circuit's own test checks the
// footprints against the road.
//
//   basins        [{ s, lateral, along, across, surface, depth, bank, blend }] (circuit-hills.js)
//     Digs the ground into a bowl (course.js) for a lake to lie in.
//   effects.lake  { s, lateral, along, across, surface, colour, shallow }
//     The water over the basin of the same outline: an oval `along` and `across`
//     metres each way from a point beside the road, `surface` metres above the
//     road's height at s. It lies flat; the edge fades out into the bank.
//   effects.mist  { count, height, spread, opacity }
//     Soft banks of mist over the lake that drift slowly.
//   hills         [{ s, lateral, along, across, height, pines, runs }] (circuit-hills.js)
//   effects.backdrop  { hills: [{ x, z, along, across, height, angle, runs }], colours }
//     Rounded wooded hills far behind the scenery, in place of the grey peaks.
//     Each stands at a point on the map (x, z), is turned `angle` radians (its
//     `along` axis runs toward +z at angle 0; `drawn: true` stands it on the ground as drawn) and carries forest colour with
//     patches of autumn (`colours.forest`, `colours.autumn`) and pale ski runs.
//   effects.lake.frozen  true: the lake is a frozen sheet (glossy blue-grey ice, snow-white toward the
//     shore, no mist) instead of water; `colour` and `shallow` then colour the ice and the snow on it.
//   hills[].palette  { floor, litter, run, runDry }: the colours of a hill and its ski runs (a winter hill).
//   effects.backdrop.colours.snow  { from, blend, colour, share }: snow lies on the hills above `from`
//     (a share of their height), fading in over `blend`; `share` is how much of the colour it takes.
//   effects.backdrop.colours.patches  [{ colour, from, to, scale, seed, cut, share }]: patches of that colour (dark rock,
//     dark forest) on the band of the slope from `from` to `to` (shares of its height), laid over the snow.
//   effects.plainHills  true: the hills carry only their own colours, without the tile of tree crowns (a snowy hill).
//   effects.skiers  { seed, hill: { count, scale }, backdrop: { count, scale } }
//     Small skiers standing on the ski runs of the hills beside the road and of the far ski mountain
//     (the first backdrop hill that has runs). Still figures, drawn once (circuit-winter.js).
//   effects.birches  { seed, groves, depth: [from, to] }
//     A few bare birches in small groves among the pines, `depth` metres beyond the road edge, off the circuit's
//     `scenery.clear` zones and clear of every planted tree (circuit-winter.js draws them).
//   effects.smoke  { id, local: [x, y, z], count, rise, life, size, wind, opacity }
//     Smoke rising from the kit piece `id` (its own metres, `local` the chimney top).
//   kitPlacements[].crowd  true on a `grandstand`: it fills with seated spectators (stand-crowd.js).
//   effects.lift  { s, towers, lines, height, spacing, speed }
//     A chairlift across the road. The towers, cable spans and chairs are kit
//     pieces named in `kitPlacements` (their `ride` field says which); once the
//     kit has loaded the cable is stretched between the tower tops and the chairs
//     ride it. Kit pieces marked `hill` are lifted onto the hill they stand on
//     (`sink` metres into it, so a building has no gap under its walls).
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';
import { renderedGroundHeight } from './rendered-ground.js';
import { ROAD_SHOULDER_WIDTH } from './config.js';
import { trackKitsOf } from './track-kits.js';
import { hillHeight, hillLocal, hillReach, runWeight, shoreFactor } from './circuit-hills.js';
import { addStandCrowds } from './stand-crowd.js';
import { addSummitFinish } from './summit-finish-view.js';
import { addSkiers, addBirches, addChimneySmoke } from './circuit-winter.js';

const TAU = Math.PI * 2;
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// The water: rings of vertices from the middle out, the outer ring fully clear.
// It reaches a little past the shore so no gap shows where the bank meets it.
export const lakeLevel = (course, lake) => course.worldAt(lake.s, 0).y + lake.surface;
export function lakeGeometry(course, lake) {
  const rings = 14, around = 72, positions = [], colours = [], indices = [];
  const level = lakeLevel(course, lake);
  const deep = new THREE.Color(lake.colour ?? 0x0d3640), shallow = new THREE.Color(lake.shallow ?? 0x2d6b66), mix = new THREE.Color();
  for (let ring = 0; ring <= rings; ring++) for (let a = 0; a < around; a++) {
    const reach = ring / rings * 1.05, angle = a / around * TAU;
    const outline = shoreFactor(angle, lake.orientation);
    const point = course.worldAt(lake.s + Math.cos(angle) * reach * outline * lake.along, lake.lateral + Math.sin(angle) * reach * outline * lake.across);
    positions.push(point.x, level, point.z);
    // Deep blue-green in the middle, paler over the shallows, with long streaks of wind on it.
    const streak = .5 + .5 * Math.sin(angle * 7 + reach * 9) * Math.sin(reach * 5 + angle * 2);
    mix.copy(deep).lerp(shallow, smooth((reach - .55) / .45) * .85 + streak * .1);
    colours.push(mix.r, mix.g, mix.b, 1 - smooth((reach - .93) / .12));
  }
  for (let ring = 0; ring < rings; ring++) for (let a = 0; a < around; a++) {
    const b = (a + 1) % around, i = ring * around + a, j = ring * around + b, k = (ring + 1) * around + a, l = (ring + 1) * around + b;
    indices.push(i, k, j, j, k, l);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData.level = level;
  return geometry;
}

function lakeMesh(course, lake) {
  // Ice is matte here: a low sun on a glossy sheet gives a warm glare that hides its blue.
  const material = lake.frozen
    ? new THREE.MeshLambertMaterial({ name: 'Frozen lake', vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({ name: 'Lake water', vertexColors: true, transparent: true, roughness: .9, metalness: 0, envMapIntensity: .2, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(lakeGeometry(course, lake), material);
  mesh.name = 'Lake'; mesh.receiveShadow = true; mesh.renderOrder = 1;
  return mesh;
}

// One soft white blob as a texture, made in code (no image to load).
function mistTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot((x + .5) / size - .5, (y + .5) / size - .5) * 2;
    const alpha = Math.pow(1 - smooth(d), 1.6);
    const i = (y * size + x) * 4;
    data[i] = 255; data[i + 1] = 247; data[i + 2] = 235; data[i + 3] = Math.round(alpha * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
  return texture;
}

// Banks of mist: wide, low sprites that face the camera and slide slowly across the water.
function addMist(group, course, lake, level, options) {
  const texture = mistTexture(), banks = [];
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xfff0dc, transparent: true, opacity: options.opacity ?? .22, depthWrite: false });
  const count = options.count ?? 12;
  for (let i = 0; i < count; i++) {
    // A fixed spread of positions inside the lake, in road terms.
    const angle = (i * 2.399 + .6) % TAU, reach = .25 + .6 * ((i * 0.618) % 1);
    const sprite = new THREE.Sprite(material);
    const width = (38 + (i * 7) % 26) * lake.along / 190, height = 7 + (i * 3) % 5;
    sprite.scale.set(width, height, 1);
    sprite.name = 'Lake mist';
    banks.push({ sprite, s: lake.s + Math.cos(angle) * reach * lake.along * (options.spread ?? .85), lateral: lake.lateral + Math.sin(angle) * reach * lake.across * (options.spread ?? .85),
      y: level + (options.height ?? 1.6) + (i % 3) * .55, speed: .015 + (i % 5) * .004, phase: i * 1.7, swing: 10 + (i % 4) * 4 });
    group.add(sprite);
  }
  const place = seconds => {
    for (const bank of banks) {
      const drift = Math.sin(seconds * bank.speed + bank.phase) * bank.swing;
      const point = course.worldAt(bank.s + drift, bank.lateral + Math.cos(seconds * bank.speed * .7 + bank.phase) * bank.swing * .5);
      bank.sprite.position.set(point.x, bank.y + Math.sin(seconds * .1 + bank.phase) * .15, point.z);
    }
  };
  place(0);
  registerSceneSystem(group, { animate: place, dispose() { texture.dispose(); material.dispose(); } });
}

// Ardennes's authored dry-land banks use the same soft texture as lake mist.
// Ground anchors are measured once. Native lap progress only changes opacity;
// the scene graph owns and disposes every material and the shared texture.
function addValleyMist(group, course, entries) {
  if (!Array.isArray(entries) || !entries.length || entries.length > 8)
    throw Error('Valley mist needs one to eight authored banks.');
  const banks = [];
  for (const bank of entries) {
    if (![bank.s, bank.lateral, bank.along, bank.across, bank.count, bank.height, bank.opacity, bank.fadeEnd].every(Number.isFinite) ||
        bank.s < 0 || bank.s > course.length || Math.abs(bank.lateral) > 256 || bank.along <= 0 || bank.along > 160 || bank.across <= 0 || bank.across > 100 ||
        !Number.isSafeInteger(bank.count) || bank.count < 1 || bank.count > 32 || bank.height < 0 || bank.height > 40 ||
        bank.opacity < 0 || bank.opacity > .5 || bank.fadeEnd <= 0 || bank.fadeEnd > 1 ||
        !Number.isSafeInteger(bank.colour) || bank.colour < 0 || bank.colour > 0xffffff)
      throw Error('Valley mist has invalid authored bounds.');
  }
  const texture = mistTexture();
  for (const bank of entries) {
    const material = new THREE.SpriteMaterial({map: texture, color: bank.colour,
      transparent: true, opacity: bank.opacity, depthWrite: false});
    for (let i = 0; i < bank.count; i++) {
      const angle = i * 2.399 + .6, reach = .2 + .7 * ((i * .618) % 1);
      const s = course.phase(bank.s + Math.cos(angle) * reach * bank.along);
      const lateral = bank.lateral + Math.sin(angle) * reach * bank.across;
      const point = course.groundAt(s, lateral);
      const height = renderedGroundHeight(course, {...point, s, off: lateral}, {requireSurface: true});
      if (!Number.isFinite(height)) throw Error('Valley mist has no actual rendered ground.');
      const sprite = new THREE.Sprite(material);
      sprite.name = 'Ardennes valley mist';
      sprite.position.set(point.x, height + bank.height, point.z);
      sprite.scale.set(34 + i % 4 * 7, 7 + i % 3 * 2, 1);
      sprite.userData.valleyAnchor = Object.freeze({s, lateral, height: bank.height});
      group.add(sprite);
    }
    banks.push({material, opacity: bank.opacity, fadeEnd: bank.fadeEnd});
  }
  let previous = -1;
  registerSceneSystem(group, {sync(state) {
    const progress = state?.status === 'menu' || (state?.s ?? 0) < 0 ? 0 : Math.max(0, Math.min(1,
      (state?.completedLaps ?? 0) + course.phase(state?.s ?? 0) / course.length));
    if (progress === previous) return;
    previous = progress;
    for (const bank of banks) bank.material.opacity = bank.opacity * (1 - smooth(progress / bank.fadeEnd));
  }});
}

// The Red Water stream. The water is the circuit's existing water (src/circuit-water.js) lying in the dug
// channel of the two `basins` named by `spec.basins`; this adds what makes the channel read as a stream: a
// darker, glossier wet bank `spec.bank` metres wide along each shore, a few rocks at the waterline and tufts
// of reed. All of it stands on the actual drawn ground and stays clear of the road and its shoulders. Drawing
// only: no water of its own, no grip, no reset rule, and nothing from the course's random stream.
const STREAM_STATIONS = 96;
function addStream(group, course, spec) {
  if (![spec.s, spec.width, spec.reach, spec.bank ?? 1].every(Number.isFinite) || spec.s < 0 || spec.s > course.length ||
      spec.width <= 0 || spec.width > 12 || spec.reach <= 20 || spec.reach > 128 || (spec.bank ?? 1) <= 0 || (spec.bank ?? 1) > 3 ||
      !Number.isSafeInteger(spec.colour) || spec.colour < 0 || spec.colour > 0xffffff ||
      !Array.isArray(spec.basins) || !spec.basins.length)
    throw Error('Stream needs bounded authored dimensions.');
  const basins = spec.basins.map(id => (course.def.basins ?? []).find(basin => basin.id === id));
  if (basins.some(basin => !basin)) throw Error('Stream names a basin the course does not have.');
  const bank = spec.bank ?? 1, roadEdge = ROAD_SHOULDER_WIDTH + .5;
  // A point on the actual drawn ground, or null where it would lie on the road or its shoulder.
  const onGround = (s, lateral) => {
    const point = course.worldAt(s, lateral), nearest = course.nearest(point.x, point.z, spec.s);
    if (nearest.distance <= course.roadHalfWidthAt(nearest.s) + roadEdge) return null;
    const height = renderedGroundHeight(course, {...point, s: nearest.s, off: nearest.lateral}, {requireSurface: true});
    if (!Number.isFinite(height)) throw Error('Stream has no actual rendered ground.');
    return [point.x, height, point.z];
  };
  // The shore of a basin as the water draws it (`lakeGeometry`), with the way out of the water.
  const shore = basin => Array.from({length: STREAM_STATIONS}, (_, k) => {
    const angle = k / STREAM_STATIONS * TAU, factor = shoreFactor(angle);
    const out = [Math.cos(angle) / basin.along, Math.sin(angle) / basin.across], length = Math.hypot(...out);
    return {s: basin.s + Math.cos(angle) * factor * basin.along, lateral: basin.lateral + Math.sin(angle) * factor * basin.across,
      ds: out[0] / length, dl: out[1] / length};
  });
  // The same simple hash everywhere: no random generator is drawn from.
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const positions = [], colours = [], indices = [], rocks = [], reeds = [], tint = new THREE.Color(spec.colour);
  basins.forEach((basin, index) => {
    const ring = shore(basin), level = lakeLevel(course, basin);
    const edge = ring.map(point => [onGround(point.s, point.lateral), onGround(point.s + point.ds * bank, point.lateral + point.dl * bank)]);
    // Only where the ground really is dug down to the water: toward the road the channel fades out into undug field.
    const wet = edge.map(([at]) => !!at && Math.abs(at[1] - level) <= .2);
    for (let k = 0; k < ring.length; k++) {
      const a = edge[k], b = edge[(k + 1) % ring.length];
      if (!wet[k] || !wet[(k + 1) % ring.length] || !a[0] || !a[1] || !b[0] || !b[1]) continue;
      const first = positions.length / 3;
      // Wet at the waterline, fading to dry ground at the outer edge so it reads as a damp bank, not an edging.
      for (const [point, alpha] of [[a[0], .9], [a[1], 0], [b[0], .9], [b[1], 0]]) {
        positions.push(point[0], point[1] + .04, point[2]); colours.push(tint.r, tint.g, tint.b, alpha);
      }
      indices.push(first, first + 2, first + 1, first + 1, first + 2, first + 3);
      const seed = index * 1000 + k;
      // A rock now and then, half in the water and half on the bank; a clump of reed more often.
      if (hash(seed) < .13) rocks.push({s: ring[k].s - ring[k].ds * .25, lateral: ring[k].lateral - ring[k].dl * .25, seed});
      if (hash(seed + .5) < .42) reeds.push({s: ring[k].s + ring[k].ds * (.2 + .9 * hash(seed + .7)),
        lateral: ring[k].lateral + ring[k].dl * (.2 + .9 * hash(seed + .7)), seed});
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  // Wet earth: darker than the dry bank and glossy, so it shines where the water has just been.
  const material = new THREE.MeshStandardMaterial({name: 'Red-brown stream', vertexColors: true, transparent: true, depthWrite: false,
    roughness: .4, metalness: 0, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
  const mesh = new THREE.Mesh(geometry, material); mesh.name = 'Ardennes red-brown stream';
  mesh.receiveShadow = true; group.add(mesh);
  const ground = rows => rows.map(row => ({...row, at: onGround(row.s, row.lateral)})).filter(row => row.at);
  addStreamStones(group, ground(rocks), hash);
  addStreamReeds(group, ground(reeds), hash);
}

// The same rock and granite picture as the course's boulders, small and rounded by the water.
function addStreamStones(group, rows, hash) {
  if (!rows.length) return;
  const map = new THREE.TextureLoader().load('/assets/textures/alpine-granite.png');
  map.colorSpace = THREE.SRGBColorSpace; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2, 2); map.anisotropy = 8;
  const material = new THREE.MeshStandardMaterial({color: 0x8c8a84, map, bumpMap: map, bumpScale: .24, roughness: .8});
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), material, rows.length);
  stones.name = 'Ardennes stream rocks'; stones.castShadow = true; stones.receiveShadow = true;
  const object = new THREE.Object3D();
  rows.forEach((row, i) => {
    object.position.set(row.at[0], row.at[1] + .05, row.at[2]);
    object.scale.set(.3 + .35 * hash(row.seed + 1), .16 + .14 * hash(row.seed + 2), .3 + .35 * hash(row.seed + 3));
    object.rotation.set(0, hash(row.seed + 4) * TAU, 0); object.updateMatrix(); stones.setMatrixAt(i, object.matrix);
  });
  group.add(stones);
}

// Clumps of bent blades, dark at the root and pale green at the tip, the same blades the meadow tufts use.
function addStreamReeds(group, rows, hash) {
  if (!rows.length) return;
  const v = [], c = [];
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4, x = Math.sin(a), z = Math.cos(a), h = .4 + (i % 4) * .16;
    for (const [px, py, pz] of [[-z * .035, 0, x * .035], [z * .035, 0, -x * .035], [x * .12 + z * .02, h * .6, z * .12 - x * .02],
        [-z * .035, 0, x * .035], [x * .12 + z * .02, h * .6, z * .12 - x * .02], [x * .3, h, z * .3]]) {
      v.push(px, py, pz); c.push(.16 + py * .22, .26 + py * .3, .1 + py * .08);
    }
  }
  const blades = new THREE.BufferGeometry();
  blades.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); blades.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  blades.computeVertexNormals();
  const reeds = new THREE.InstancedMesh(blades, new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, side: THREE.DoubleSide}), rows.length);
  reeds.name = 'Ardennes stream reeds'; reeds.receiveShadow = true;
  const object = new THREE.Object3D();
  rows.forEach((row, i) => {
    object.position.set(row.at[0], row.at[1] - .02, row.at[2]);
    object.scale.setScalar(.6 + .6 * hash(row.seed + 5)); object.rotation.set(0, hash(row.seed + 6) * TAU, 0);
    object.updateMatrix(); reeds.setMatrixAt(i, object.matrix);
  });
  group.add(reeds);
}

// A tile of tree crowns seen from far off, in grey, made in code (no image to load):
// round tops with a lit side and dark gaps between them. A hill multiplies its colour
// by it, so the forest has crowns whatever colour it has turned. Nothing without a
// canvas (a test) has one, and a hill without it is plain colour.
const CROWN_TILE = 64;
function crownTexture() {
  if (typeof document === 'undefined') return null;
  const size = 512, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, 0, size, size);
  let seed = 0x5eed1;
  const random = () => { seed = (seed + 0x6D2B79F5) | 0; let v = Math.imul(seed ^ (seed >>> 15), 1 | seed); v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v; return ((v ^ (v >>> 14)) >>> 0) / 4294967296; };
  for (let i = 0; i < 380; i++) {
    const x = random() * size, y = random() * size, r = 11 + random() * 15, light = 150 + random() * 90;
    for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
      if (x + dx + r < 0 || x + dx - r > size || y + dy + r < 0 || y + dy - r > size) continue;
      const g = ctx.createRadialGradient(x + dx - r * .3, y + dy - r * .35, r * .1, x + dx, y + dy, r);
      g.addColorStop(0, `rgb(${light},${light},${light})`); g.addColorStop(.7, `rgb(${light * .62 | 0},${light * .62 | 0},${light * .62 | 0})`); g.addColorStop(1, 'rgba(60,60,60,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

// A hill: a dome following the ground, dark forest floor, with the ski runs paler.
export function hillGeometry(course, hill) {
  const nu = 72, nv = 64, positions = [], colours = [], uvs = [], indices = [];
  const palette = hill.palette ?? {};
  const floor = new THREE.Color(palette.floor ?? 0x3f6a2e), litter = new THREE.Color(palette.litter ?? 0x6e6230), run = new THREE.Color(palette.run ?? 0xd0e698), runDry = new THREE.Color(palette.runDry ?? 0xe0e6a0), mix = new THREE.Color();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const du = (i / nu * 2 - 1) * hill.along, dv = (j / nv * 2 - 1) * hill.across;
    const s = hill.s + du, lateral = hill.lateral + dv, rise = hillHeight(hill, du, dv);
    const point = course.worldAt(s, lateral), ground = course.groundAt(s, lateral);
    positions.push(point.x, ground.y + .06 + rise, point.z); uvs.push(point.x / CROWN_TILE, point.z / CROWN_TILE);
    const patch = .5 + .5 * Math.sin(du * .21 + Math.sin(dv * .13) * 2);
    mix.copy(floor).lerp(litter, .1 + .35 * patch);
    const onRun = runWeight(hill, du, dv);
    if (onRun > 0) mix.lerp(runDry.clone().lerp(run, .5 + .5 * Math.sin(dv * .31 + du * .17)), onRun * .92);
    colours.push(mix.r, mix.g, mix.b);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    const inside = [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]].some(([x, y]) => hillReach(hill, (x / nu * 2 - 1) * hill.along, (y / nv * 2 - 1) * hill.across) < 1);
    if (inside) indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function hillMesh(course, hill, index, crowns) {
  const material = new THREE.MeshStandardMaterial({ name: 'Wooded hill', vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    ...(crowns ? { map: crowns, color: 0xffffff } : {}) });
  if (crowns) material.color.setScalar(1.7);
  const mesh = new THREE.Mesh(hillGeometry(course, hill), material);
  mesh.name = `Wooded hill ${index + 1}`; mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
}

// Hills far behind the scenery: the same rounded shape as a hill beside the
// road, but turned about its middle and standing on the far ground (the height
// the far terrain has there). Forest colour with autumn patches and pale runs.
// A little value noise from the position, so the same hill looks the same.
const hash = (x, z) => { const v = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return v - Math.floor(v); };
const noise = (x, z) => {
  const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
};

// A broader, gentler shape than a hill beside the road: wide shoulders and a rounded top.
const backdropRise = (hill, du, dv) => {
  const reach = hillReach(hill, du, dv);
  if (reach >= 1) return 0;
  const uneven = 1 + .09 * Math.sin(du * .017 + dv * .009) + .06 * Math.sin(dv * .023 - du * .011);
  // The far ground is drawn in coarse triangles that can rise a few metres above where it is
  // measured, so the hill stands a little proud of it, easing to nothing at its foot.
  return hill.height * Math.pow(.5 * (1 + Math.cos(Math.PI * reach)), 1.3) * uneven + 4 * smooth((1 - reach) / .25);
};

export function backdropGeometry(course, hill, colours = {}) {
  const cell = hill.cell ?? 12, nu = Math.ceil(hill.along * 2 / cell), nv = Math.ceil(hill.across * 2 / cell);
  const forest = (colours.forest ?? [0x2f4a2a, 0x3b5a2d, 0x27412a]).map(c => new THREE.Color(c));
  const autumn = (colours.autumn ?? [0xb4631c, 0x9b3a24, 0xc59a2c]).map(c => new THREE.Color(c));
  const run = new THREE.Color(colours.run ?? 0xcbd08e), mix = new THREE.Color(), centre = hill;
  const patches = (colours.patches ?? []).map(item => ({ ...item, colour: new THREE.Color(item.colour) }));
  const cover = colours.snow ? { ...colours.snow, colour: new THREE.Color(colours.snow.colour ?? 0xe8eff5) } : null;
  const angle = hill.angle ?? 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const positions = [], colourData = [], uvs = [], indices = [], used = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const du = (i / nu * 2 - 1) * hill.along, dv = (j / nv * 2 - 1) * hill.across;
    const x = centre.x + sin * du + cos * dv, z = centre.z + cos * du - sin * dv;
    const near = course.nearest(x, z), rise = backdropRise(hill, du, dv);
    // `hill.drawn: true` stands the hill on the ground as it is drawn, which beyond the first band can lie metres
    // above the course's own ground (Kogane Pass's far shore); without it the hill is exactly as before.
    const floor = hill.drawn ? renderedGroundHeight(course, { x, z, s: near.s, off: near.lateral })
      : course.farGroundY ? course.farGroundY(x, z, near.s, near.lateral) : course.groundAt(near.s, near.lateral).y;
    positions.push(x, floor + .1 + rise, z); uvs.push(x / CROWN_TILE, z / CROWN_TILE);
    // Forest floor in big clumps, autumn where a slow swell is high, speckle from the cell.
    const clump = noise(x * .03, z * .03), swell = noise(x * .012 + 7, z * .012 + 3) + .5 * (noise(x * .04, z * .04) - .5);
    mix.copy(forest[Math.floor(clump * forest.length * .999)]).multiplyScalar(.82 + .36 * hash(Math.round(x / cell), Math.round(z / cell)));
    const turn = smooth((swell - (colours.cut ?? .5)) / .16) * (colours.share ?? .85);
    if (turn > 0) mix.lerp(autumn[Math.floor(noise(x * .011 + 40, z * .011) * autumn.length * .999)], turn * (.6 + .4 * clump));
    // Snow lies on the high ground (a little noise keeps its edge uneven).
    if (cover) mix.lerp(cover.colour, smooth((rise / hill.height - cover.from + (clump - .5) * .12) / (cover.blend ?? .25)) * (cover.share ?? 1));
    // Patches of another colour on a band of the slope (dark rock, dark forest): noise decides where they lie.
    for (const item of patches) {
      const high = rise / hill.height, band = smooth((high - item.from) / .1) * (1 - smooth((high - item.to) / .1));
      mix.lerp(item.colour, smooth((noise(x * (item.scale ?? .02) + (item.seed ?? 0), z * (item.scale ?? .02)) - item.cut) / .12) * band * (item.share ?? 1));
    }
    const onRun = runWeight(hill, du, dv);
    if (onRun > 0) mix.lerp(run, onRun * .85).multiplyScalar(1 + (cover ? .12 : .8) * onRun);
    colourData.push(mix.r, mix.g, mix.b);
    used.push(hillReach(hill, du, dv));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (used[a] < 1 || used[b] < 1 || used[c] < 1 || used[d] < 1) indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colourData, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addBackdrop(group, course, backdrop, crowns) {
  const material = new THREE.MeshStandardMaterial({ name: 'Wooded backdrop hills', vertexColors: true, roughness: 1, metalness: 0,
    ...(crowns ? { map: crowns } : {}) });
  if (crowns) material.color.setScalar(1.7);
  backdrop.hills.forEach((hill, index) => {
    const mesh = new THREE.Mesh(backdropGeometry(course, hill, backdrop.colours), material);
    mesh.name = `Backdrop hill ${index + 1}`; mesh.receiveShadow = false; mesh.castShadow = false;
    group.add(mesh);
  });
  registerSceneSystem(group, { dispose() { material.dispose(); } });
}

// Where the kit pieces move once they have loaded (track-kits.js hands out
// poses, nothing else). The cable, the chairs and anything on a hill.
const CABLE_LENGTH = 12, CHAIR_HANGER = 2.6;
const RIGHT = new THREE.Vector3(1, 0, 0), UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(0, 0, 1);

function addKitMotion(group, course) {
  const placements = course.def.kitPlacements ?? [], lift = course.def.effects?.lift;
  const raised = [], cables = [], chairs = [], towers = [];
  placements.forEach((piece, index) => {
    if (piece.hill !== undefined) raised.push({ piece, index });
    if (piece.id === 'chairlift-tower') towers.push({ piece, index });
    if (piece.ride?.role === 'cable') cables.push({ piece, index });
    if (piece.ride?.role === 'chair') chairs.push({ piece, index });
  });
  const smokeAt = course.def.effects?.smoke, smoke = smokeAt && placements.some(piece => piece.id === smokeAt.id) ? addChimneySmoke(group, smokeAt) : null;
  if (!raised.length && !(lift && towers.length) && !smoke) return;
  let prepared = false, tops = null;
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3(1, 1, 1), roll = new THREE.Quaternion();
  const tangent = lift ? course.at(lift.s).heading : 0;
  const along = new THREE.Vector3(Math.sin(tangent), 0, Math.cos(tangent));

  // Tower tops for each cable line, from where the towers actually stand.
  const prepare = kits => {
    tops = lift ? lift.lines.map(ds => towers.map(({ index }) => {
      const base = kits.getPlacementPose(index), at = new THREE.Vector3().setFromMatrixPosition(base);
      return at.addScaledVector(along, ds).add(new THREE.Vector3(0, lift.height, 0));
    })) : null;
    for (const { piece, index } of raised) {
      const hill = course.def.hills[piece.hill], [du, dv] = hillLocal(hill, piece.s, piece.lateral);
      const pose = kits.getPlacementPose(index);
      pose.premultiply(matrix.makeTranslation(0, hillHeight(hill, du, dv) - (piece.sink ?? 0), 0));
      kits.setPlacementPose(index, pose);
    }
    cables.forEach(({ piece, index }) => {
      const line = tops[piece.ride.line], a = line[towers.findIndex(({ piece: t }) => t.lateral === piece.ride.a)], b = line[towers.findIndex(({ piece: t }) => t.lateral === piece.ride.b)];
      const direction = new THREE.Vector3().subVectors(b, a), length = direction.length();
      rotation.setFromUnitVectors(RIGHT, direction.normalize());
      position.addVectors(a, b).multiplyScalar(.5).y -= .12;
      kits.setPlacementPose(index, matrix.compose(position, rotation, scale.set(length / CABLE_LENGTH, 1, 1)));
    });
  };
  // A point on a cable line and its direction, `along` metres across from the first tower.
  const onLine = (line, distance, out) => {
    const first = towers[0].piece.lateral;
    for (let i = 0; i + 1 < line.length; i++) {
      const a = towers[i].piece.lateral - first, b = towers[i + 1].piece.lateral - first;
      if (distance <= b || i + 2 === line.length) return out.lerpVectors(line[i], line[i + 1], Math.max(0, Math.min(1, (distance - a) / (b - a))));
    }
    return out;
  };
  const point = new THREE.Vector3(), ahead = new THREE.Vector3();
  const moveChairs = seconds => {
    const kits = trackKitsOf(group), total = towers.at(-1).piece.lateral - towers[0].piece.lateral;
    for (const { piece, index } of chairs) {
      const { line, k, count } = piece.ride, forward = line === 0 ? 1 : -1;
      const travel = ((k * total / count + forward * seconds * lift.speed) % total + total) % total;
      onLine(tops[line], travel, point); onLine(tops[line], Math.min(total, travel + 1), ahead);
      const heading = Math.atan2((ahead.x - point.x) * forward, (ahead.z - point.z) * forward);
      rotation.setFromAxisAngle(UP, heading);
      roll.setFromAxisAngle(FORWARD, .05 * Math.sin(seconds * 1.3 + k * 1.9));
      rotation.multiply(roll);
      // Chairs shrink away at the ends of the line rather than popping out.
      const grow = smooth(Math.min(travel, total - travel) / 8);
      position.copy(point); position.y -= CHAIR_HANGER * grow;
      kits.setPlacementPose(index, matrix.compose(position, rotation, scale.setScalar(Math.max(.001, grow))), false);
    }
    kits.refresh();
  };
  registerSceneSystem(group, { animate(seconds) {
    const kits = trackKitsOf(group);
    if (!kits || kits.status !== 'ready') return;
    if (!prepared) {
      prepared = true; prepare(kits);
      // The chimney top, in the world, once the lodge stands where it will stay.
      if (smoke) smoke.place(new THREE.Vector3(...smokeAt.local).applyMatrix4(kits.getPlacementPose(placements.findIndex(piece => piece.id === smokeAt.id))));
    }
    if (lift && chairs.length) moveChairs(seconds);
    smoke?.animate(seconds);
  } });
}

// Where the skiers stand: on the runs of a hill, down the slope toward its foot, each a little off the
// middle of the run and turned a little across it. A stream of its own keeps every other choice the same.
export function skierSpots(course, config) {
  let seed = config.seed ?? 0x5c1e5;
  const random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const spots = [];
  const along = (hill, count, scale, place) => {
    const runs = hill.runs ?? [], total = runs.reduce((sum, run) => sum + Math.hypot(run.to[0] - run.from[0], run.to[1] - run.from[1]), 0);
    for (let n = 0; n < count && total > 0; n++) {
      let pick = random() * total, run = runs[0];
      for (const item of runs) { pick -= Math.hypot(item.to[0] - item.from[0], item.to[1] - item.from[1]); if (pick <= 0) { run = item; break; } }
      const t = .06 + random() * .88, ex = run.to[0] - run.from[0], ey = run.to[1] - run.from[1], length = Math.hypot(ex, ey) || 1;
      const side = (random() - .5) * run.width * .6, du = run.from[0] + ex * t - ey / length * side, dv = run.from[1] + ey * t + ex / length * side;
      if (hillReach(hill, du, dv) > .97) continue;
      const here = place(du, dv), ahead = place(du + ex / length * 3, dv + ey / length * 3);
      spots.push({ x: here.x, y: here.y, z: here.z, yaw: Math.atan2(ahead.x - here.x, ahead.z - here.z) + (random() - .5) * .7,
        scale: scale * (.92 + random() * .2), jacket: Math.floor(random() * 64) });
    }
  };
  const near = config.hill;
  if (near) (course.def.hills ?? []).forEach(hill => along(hill, near.count ?? 30, near.scale ?? 1, (du, dv) => {
    const s = hill.s + du, lateral = hill.lateral + dv, point = course.worldAt(s, lateral);
    return { x: point.x, z: point.z, y: course.groundAt(s, lateral).y + hillHeight(hill, du, dv) };
  }));
  const far = config.backdrop, ski = far && course.def.effects?.backdrop?.hills.find(hill => hill.runs?.length);
  if (ski) {
    const cos = Math.cos(ski.angle ?? 0), sin = Math.sin(ski.angle ?? 0);
    along(ski, far.count ?? 40, far.scale ?? 3, (du, dv) => {
      const x = ski.x + sin * du + cos * dv, z = ski.z + cos * du - sin * dv, found = course.nearest(x, z);
      return { x, z, y: course.groundAt(found.s, found.lateral).y + .1 + backdropRise(ski, du, dv) };
    });
  }
  return spots;
}

export function birchSpots(course, config) {
  let seed = config.seed ?? 0xb1c4;
  const random = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const [near, far] = config.depth ?? [14, 34], zones = course.def.scenery?.clear ?? [], spots = [];
  const ranges=config.ranges;
  if(ranges&&(!Array.isArray(ranges)||!ranges.length||ranges.some(range=>
    !Number.isFinite(range.from)||!Number.isFinite(range.to)||range.from<0||range.to>course.length||range.to<=range.from)))
    throw Error('Birch groves need bounded authored ranges.');
  for (let grove = 0, tries = 0; grove < (config.groves ?? 14) && tries < 400; tries++) {
    const range=ranges?.[grove%ranges.length];
    const s = range?range.from+random()*(range.to-range.from):random() * course.length, side = random() < .5 ? -1 : 1, lateral = side * (course.roadHalfWidthAt(s) + near + random() * (far - near));
    const phase = course.phase(s);
    if (zones.some(zone => phase >= zone.s0 - 12 && phase <= zone.s1 + 12 && lateral >= zone.from - 12 && lateral <= zone.to + 12)) continue;
    const found = course.worldAt(s, lateral), road = course.nearest(found.x, found.z);
    const piece = course.script?.pieceAt(road.s);
    if (piece?.kind === 'turn' && Math.sign(road.lateral) === piece.dir) continue;
    grove++;
    for (let i = 0, count = 3 + Math.floor(random() * 3); i < count; i++) {
      const ds = (random() - .5) * 14, dl = (random() - .5) * 10;
      if(range&&(s+ds<range.from||s+ds>range.to))continue;
      const point = course.worldAt(s + ds, lateral + dl), nearest = course.nearest(point.x, point.z);
      if (nearest.distance < course.roadHalfWidthAt(nearest.s) + 12) continue;
      if (course.features.trees.some(tree => Math.hypot(tree.x - point.x, tree.z - point.z) < 2.2 * (tree.scale ?? 1))) continue;
      spots.push({ x: point.x, z: point.z, y: course.groundAt(s + ds, lateral + dl).y, yaw: random() * Math.PI * 2, scale: .8 + random() * .55 });
    }
  }
  return spots;
}

export function addCircuitEffects(group, course) {
  const effects = course.def.effects ?? {};
  if (effects.valleyMist) addValleyMist(group, course, effects.valleyMist);
  if (effects.stream) addStream(group, course, effects.stream);
  if (effects.lake) {
    const mesh = lakeMesh(course, effects.lake);
    group.add(mesh);
    if (effects.mist) addMist(group, course, effects.lake, mesh.geometry.userData.level, effects.mist);
  }
  const hills = course.def.hills ?? [], crowns = (hills.length || effects.backdrop) && !effects.plainHills ? crownTexture() : null;
  hills.forEach((hill, index) => group.add(hillMesh(course, hill, index, crowns)));
  if (effects.backdrop) addBackdrop(group, course, effects.backdrop, crowns);
  if (crowns) registerSceneSystem(group, { dispose() { crowns.dispose(); } });
  addKitMotion(group, course);
  if (effects.skiers) addSkiers(group, skierSpots(course, effects.skiers));
  if (effects.birches) addBirches(group, birchSpots(course, effects.birches));
  addStandCrowds(group, course);
  addSummitFinish(group, course);
}
