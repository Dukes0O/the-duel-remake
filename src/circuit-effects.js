// Scenery a circuit draws for itself, from the `effects`, `hills` and `basins`
// blocks of its definition (docs/CIRCUITS.md section 5.3): a lake with mist
// drifting over it, wooded hills with ski runs cut into them and a ring of
// rounded hills far behind. Presentation only. Nothing here reads or writes race
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
//     `along` axis runs toward +z at angle 0) and carries forest colour with
//     patches of autumn (`colours.forest`, `colours.autumn`) and pale ski runs.
//   kitPlacements[].crowd  true on a `grandstand`: it fills with seated spectators (stand-crowd.js).
//   effects.lift  { s, towers, lines, height, spacing, speed }
//     A chairlift across the road. The towers, cable spans and chairs are kit
//     pieces named in `kitPlacements` (their `ride` field says which); once the
//     kit has loaded the cable is stretched between the tower tops and the chairs
//     ride it. Kit pieces marked `hill` are lifted onto the hill they stand on
//     (`sink` metres into it, so a building has no gap under its walls).
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';
import { trackKitsOf } from './track-kits.js';
import { hillHeight, hillLocal, hillReach, runWeight, shoreFactor } from './circuit-hills.js';
import { addStandCrowds } from './stand-crowd.js';

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
    const point = course.worldAt(lake.s + Math.cos(angle) * reach * shoreFactor(angle) * lake.along, lake.lateral + Math.sin(angle) * reach * shoreFactor(angle) * lake.across);
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
  const material = new THREE.MeshStandardMaterial({ name: 'Lake water', vertexColors: true, transparent: true, roughness: .9, metalness: 0,
    envMapIntensity: .2, depthWrite: false, side: THREE.DoubleSide });
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
  const floor = new THREE.Color(0x3f6a2e), litter = new THREE.Color(0x6e6230), run = new THREE.Color(0xd0e698), runDry = new THREE.Color(0xe0e6a0), mix = new THREE.Color();
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
  const angle = hill.angle ?? 0, cos = Math.cos(angle), sin = Math.sin(angle);
  const positions = [], colourData = [], uvs = [], indices = [], used = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const du = (i / nu * 2 - 1) * hill.along, dv = (j / nv * 2 - 1) * hill.across;
    const x = centre.x + sin * du + cos * dv, z = centre.z + cos * du - sin * dv;
    const near = course.nearest(x, z), rise = backdropRise(hill, du, dv);
    positions.push(x, course.groundAt(near.s, near.lateral).y + .1 + rise, z); uvs.push(x / CROWN_TILE, z / CROWN_TILE);
    // Forest floor in big clumps, autumn where a slow swell is high, speckle from the cell.
    const clump = noise(x * .03, z * .03), swell = noise(x * .012 + 7, z * .012 + 3) + .5 * (noise(x * .04, z * .04) - .5);
    mix.copy(forest[Math.floor(clump * forest.length * .999)]).multiplyScalar(.82 + .36 * hash(Math.round(x / cell), Math.round(z / cell)));
    const turn = smooth((swell - (colours.cut ?? .5)) / .16) * (colours.share ?? .85);
    if (turn > 0) mix.lerp(autumn[Math.floor(noise(x * .011 + 40, z * .011) * autumn.length * .999)], turn * (.6 + .4 * clump));
    const onRun = runWeight(hill, du, dv);
    if (onRun > 0) mix.lerp(run, onRun * .85).multiplyScalar(1 + .8 * onRun);
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
  if (!raised.length && !(lift && towers.length)) return;
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
      kits.setPlacementPose(index, matrix.compose(position, rotation, scale.setScalar(Math.max(.001, grow))));
    }
  };
  registerSceneSystem(group, { animate(seconds) {
    const kits = trackKitsOf(group);
    if (!kits || kits.status !== 'ready') return;
    if (!prepared) { prepared = true; prepare(kits); }
    if (lift && chairs.length) moveChairs(seconds);
  } });
}

export function addCircuitEffects(group, course) {
  const effects = course.def.effects ?? {};
  if (effects.lake) {
    const mesh = lakeMesh(course, effects.lake);
    group.add(mesh);
    if (effects.mist) addMist(group, course, effects.lake, mesh.geometry.userData.level, effects.mist);
  }
  const hills = course.def.hills ?? [], crowns = hills.length || effects.backdrop ? crownTexture() : null;
  hills.forEach((hill, index) => group.add(hillMesh(course, hill, index, crowns)));
  if (effects.backdrop) addBackdrop(group, course, effects.backdrop, crowns);
  if (crowns) registerSceneSystem(group, { dispose() { crowns.dispose(); } });
  addKitMotion(group, course);
  addStandCrowds(group, course);
}
