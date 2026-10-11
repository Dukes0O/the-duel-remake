// Scenery a circuit draws for itself, from the `effects` and `hills` blocks of
// its definition (docs/CIRCUITS.md section 5.3): a lake with mist drifting over
// it, and wooded hills with ski runs cut into them. Presentation only. Nothing
// here reads or writes race state, and nothing is placed on the road: the
// circuit's own test checks the footprints against the road.
//
//   effects.lake  { s, lateral, along, across, level, colour }
//     An oval of water `along` and `across` metres each way from a point beside
//     the road, `level` metres above the ground there. It lies at one height,
//     so the shore is where the rising ground meets it. The edge fades out.
//   effects.mist  { count, height, spread }
//     Soft banks of mist over the lake that drift slowly.
//   hills         [{ s, lateral, along, across, height, pines, runs }] (circuit-hills.js)
//   effects.lift  { s, towers, lines, height, spacing, speed }
//     A chairlift across the road. The towers, cable spans and chairs are kit
//     pieces named in `kitPlacements` (their `lift` field says which); once the
//     kit has loaded the cable is stretched between the tower tops and the chairs
//     ride it. Kit pieces marked `hill` are lifted onto the hill they stand on.
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';
import { trackKitsOf } from './track-kits.js';
import { hillHeight, hillLocal, hillReach, runWeight } from './circuit-hills.js';

const TAU = Math.PI * 2;
const smooth = x => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };

// The lake: rings of vertices from the middle out, the outer ring fully clear.
export function lakeGeometry(course, lake) {
  const rings = 12, around = 60, positions = [], colours = [], indices = [];
  const level = course.groundAt(lake.s, lake.lateral).y + lake.level;
  const deep = new THREE.Color(lake.colour ?? 0x35575f), shallow = new THREE.Color(0x5f8584), mix = new THREE.Color();
  for (let ring = 0; ring <= rings; ring++) for (let a = 0; a < around; a++) {
    const reach = ring / rings, angle = a / around * TAU;
    // An uneven shore, not a perfect oval.
    const shore = 1 + .09 * Math.sin(angle * 3 + 1.1) + .05 * Math.sin(angle * 5 + 2.3) + .03 * Math.sin(angle * 9);
    const point = course.worldAt(lake.s + Math.cos(angle) * reach * shore * lake.along, lake.lateral + Math.sin(angle) * reach * shore * lake.across);
    positions.push(point.x, level, point.z);
    mix.copy(deep).lerp(shallow, smooth((reach - .45) / .55));
    colours.push(mix.r, mix.g, mix.b, 1 - smooth((reach - .7) / .3));
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
  const material = new THREE.MeshStandardMaterial({ name: 'Lake water', vertexColors: true, transparent: true, roughness: .06, metalness: .05,
    envMapIntensity: 1.3, depthWrite: false, side: THREE.DoubleSide });
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
  const material = new THREE.SpriteMaterial({ map: texture, color: 0xfff2e0, transparent: true, opacity: .34, depthWrite: false });
  const count = options.count ?? 12;
  for (let i = 0; i < count; i++) {
    // A fixed spread of positions inside the lake, in road terms.
    const angle = (i * 2.399 + .6) % TAU, reach = .25 + .6 * ((i * 0.618) % 1);
    const sprite = new THREE.Sprite(material);
    const width = 38 + (i * 7) % 26, height = 7 + (i * 3) % 5;
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

// A hill: a dome following the ground, dark forest floor, with the ski runs paler.
export function hillGeometry(course, hill) {
  const nu = 44, nv = 44, positions = [], colours = [], indices = [];
  const floor = new THREE.Color(0x5d5a32), litter = new THREE.Color(0x7a5a30), run = new THREE.Color(0xa5a85a), runDry = new THREE.Color(0xb9a460), mix = new THREE.Color();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const du = (i / nu * 2 - 1) * hill.along, dv = (j / nv * 2 - 1) * hill.across;
    const s = hill.s + du, lateral = hill.lateral + dv, rise = hillHeight(hill, du, dv);
    const point = course.worldAt(s, lateral), ground = course.groundAt(s, lateral);
    positions.push(point.x, ground.y + .06 + rise, point.z);
    const patch = .5 + .5 * Math.sin(du * .21 + Math.sin(dv * .13) * 2);
    mix.copy(floor).lerp(litter, .25 + .5 * patch);
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
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function hillMesh(course, hill, index) {
  const material = new THREE.MeshStandardMaterial({ name: 'Wooded hill', vertexColors: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = new THREE.Mesh(hillGeometry(course, hill), material);
  mesh.name = `Wooded hill ${index + 1}`; mesh.receiveShadow = true; mesh.castShadow = true;
  return mesh;
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
    if (piece.lift?.role === 'cable') cables.push({ piece, index });
    if (piece.lift?.role === 'chair') chairs.push({ piece, index });
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
      pose.premultiply(matrix.makeTranslation(0, hillHeight(hill, du, dv), 0));
      kits.setPlacementPose(index, pose);
    }
    cables.forEach(({ piece, index }) => {
      const line = tops[piece.lift.line], a = line[towers.findIndex(({ piece: t }) => t.lateral === piece.lift.a)], b = line[towers.findIndex(({ piece: t }) => t.lateral === piece.lift.b)];
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
      const { line, k, count } = piece.lift, forward = line === 0 ? 1 : -1;
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
  (course.def.hills ?? []).forEach((hill, index) => group.add(hillMesh(course, hill, index)));
  addKitMotion(group, course);
}
