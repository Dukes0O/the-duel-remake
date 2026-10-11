// Draws what a track script adds to the road: surface overlays (gravel, packed
// snow, ice, deep snow) and braking and ICE boards. Drawing only: the driving
// code reads the same positions from the Course and nothing here changes state.
import * as THREE from 'three';
import { strip, worldAtExtended } from './world-surfaces.js';
import { SURFACES } from './race-surfaces.js';
import { addCircuitEffects } from './circuit-effects.js';

const OVERLAY = {
  gravel: { color: 0x8c775a, roughness: 1, metalness: 0, lift: .046, tracks: false },
  snow: { color: 0xe3e9ee, roughness: .93, metalness: 0, lift: .047, tracks: true },
  ice: { color: 0x9db6c6, roughness: .07, metalness: .18, lift: .048, tracks: false, emissive: 0x16222c },
  'deep-snow': { color: 0xf1f5f8, roughness: 1, metalness: 0, lift: .16, tracks: false },
};

// Runs of one surface along the road: stretches from the script, then patches.
export function surfaceRuns(course) {
  const runs = [], script = course.script;
  let open = null;
  for (const piece of script.pieces) {
    if (piece.surface !== 'asphalt') {
      if (open && open.kind === piece.surface && Math.abs(open.s1 - piece.s0) < 1e-6) open.s1 = piece.s1;
      else { open = { kind: piece.surface, s0: piece.s0, s1: piece.s1, from: -Infinity, to: Infinity }; runs.push(open); }
    } else open = null;
  }
  for (const patch of course.features.surfacePatches ?? []) runs.push({ kind: patch.kind, s0: patch.s0, s1: patch.s1, from: patch.from ?? -Infinity, to: patch.to ?? Infinity });
  return runs;
}

function overlayMaterial(kind) {
  const look = OVERLAY[kind];
  return new THREE.MeshStandardMaterial({ name: `${SURFACES[kind].name} road`, color: look.color, roughness: look.roughness, metalness: look.metalness,
    emissive: look.emissive ?? 0x000000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
}

function plateTexture(text, background, ink) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 80;
  const ctx = canvas.getContext?.('2d');
  if (!ctx) return null;
  ctx.fillStyle = background; ctx.fillRect(0, 0, 128, 80);
  ctx.strokeStyle = ink; ctx.lineWidth = 5; ctx.strokeRect(5, 5, 118, 70);
  ctx.fillStyle = ink; ctx.font = 'bold 46px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 42);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addBoards(group, course) {
  const boards = course.features.boards ?? [];
  if (!boards.length) return;
  const post = new THREE.BoxGeometry(.1, 1.9, .1), plate = new THREE.BoxGeometry(1.5, .95, .06);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x4a4d50, roughness: .8, metalness: .3 });
  const materials = new Map();
  const materialFor = board => {
    const text = board.kind === 'ice' ? 'ICE' : String(board.distance), key = text;
    if (!materials.has(key)) {
      const ice = board.kind === 'ice', texture = plateTexture(text, ice ? '#1d4f7a' : '#f2c400', ice ? '#ffffff' : '#111111');
      materials.set(key, new THREE.MeshStandardMaterial(texture ? { map: texture, roughness: .6 } : { color: ice ? 0x1d4f7a : 0xf2c400, roughness: .6 }));
    }
    return materials.get(key);
  };
  for (const board of boards) {
    const off = board.side * (course.roadHalfWidthAt(board.s) + 2.4), p = course.groundAt(board.s, off);
    const mast = new THREE.Mesh(post, postMaterial), face = new THREE.Mesh(plate, materialFor(board));
    mast.position.set(p.x, p.y + .95, p.z);
    face.position.set(p.x, p.y + 1.95, p.z);
    // Face the oncoming car: the plate's front looks back along the road.
    mast.rotation.y = face.rotation.y = p.heading + Math.PI;
    group.add(mast, face);
  }
}

// The walls: one instanced box per solid segment, the same boxes a car hits.
function addWalls(group, course) {
  const walls = course.features.walls ?? [];
  if (!walls.length) return;
  const material = new THREE.MeshStandardMaterial({ color: 0xaeada6, roughness: .92, metalness: 0 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, walls.length);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), position = new THREE.Vector3(), scale = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  walls.forEach((wall, i) => {
    const height = wall.maxY - wall.minY;
    rotation.setFromAxisAngle(up, wall.heading);
    position.set(wall.x, wall.minY + height / 2, wall.z);
    scale.set(wall.halfX * 2, height, wall.halfZ * 2 - .1);
    mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
  });
  mesh.name = 'track-walls'; mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh);
}

// Kerbs: red and white blocks two metres long on the edge of the road.
function addKerbs(group, course) {
  const kerbs = course.features.kerbs ?? [];
  if (!kerbs.length) return;
  const build = parity => {
    const positions = [], indices = [];
    for (const kerb of kerbs) {
      const first = Math.ceil(kerb.s0 / 2), last = Math.floor(kerb.s1 / 2);
      for (let block = first; block < last; block++) {
        if (((block % 2) + 2) % 2 !== parity) continue;
        const a = block * 2, b = a + 2, edge = s => course.roadHalfWidthAt(s);
        const corners = [[a, kerb.side * (edge(a) - kerb.width)], [a, kerb.side * edge(a)], [b, kerb.side * (edge(b) - kerb.width)], [b, kerb.side * edge(b)]]
          .map(([s, off]) => worldAtExtended(course, s, off));
        const base = positions.length / 3;
        for (const p of corners) positions.push(p.x, p.y + .05, p.z);
        indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
        indices.push(base, base + 2, base + 1, base + 2, base + 3, base + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    return geometry;
  };
  for (const [parity, color] of [[0, 0xc9332a], [1, 0xe8e6df]]) {
    const mesh = new THREE.Mesh(build(parity), new THREE.MeshStandardMaterial({ color, roughness: .75, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }));
    mesh.name = 'track-kerbs'; mesh.receiveShadow = true; group.add(mesh);
  }
}

export function addTrackScriptScene(group, course) {
  for (const run of surfaceRuns(course)) {
    const look = OVERLAY[run.kind];
    if (!look) continue;
    const left = s => Math.max(run.from, -course.roadHalfWidthAt(s)), right = s => Math.min(run.to, course.roadHalfWidthAt(s));
    const mesh = new THREE.Mesh(strip(course, left, right, look.lift, run.s0, run.s1), overlayMaterial(run.kind));
    mesh.receiveShadow = true; mesh.name = `surface-${run.kind}`;
    group.add(mesh);
    if (look.tracks) {
      // Two pairs of darker wheel tracks, tyre-worn into the snow.
      const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x8e979d, roughness: 1, transparent: true, opacity: .55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, depthWrite: false });
      let narrowest = Infinity;
      for (let s = run.s0; s <= run.s1; s += 8) narrowest = Math.min(narrowest, course.roadHalfWidthAt(s));
      for (const centre of [-4.25, -2.55, 2.55, 4.25].filter(value => Math.abs(value) + .5 < narrowest)) {
        const track = new THREE.Mesh(strip(course, s => centre - .3, s => centre + .3, look.lift + .006, run.s0, run.s1), trackMaterial);
        track.name = 'snow-tracks'; group.add(track);
      }
    }
  }
  addWalls(group, course);
  addKerbs(group, course);
  addBoards(group, course);
  addCircuitEffects(group, course);
}
