// Spectators in the kit grandstands (track-kits.js). A circuit marks a
// `grandstand` placement with `crowd: true` and the seats fill with the same
// seated cut-out people the arena stands use (stadium-crowd.js). Presentation
// only: nothing here reads or writes race state.
//
// The people are flat cards, one per seat, parallel to the stand's front, each
// on the tread it sits on with its feet on the tread below. They are placed in
// the stand's own frame once the kit has loaded, so they follow wherever the
// piece actually stands.
import * as THREE from 'three';
import { registerSceneSystem } from './scene-systems.js';
import { trackKitsOf } from './track-kits.js';
import { crowdTexture } from './stadium-crowd.js';

// The seating of a kit piece, in the piece's own metres: the front faces +z, and
// each row is [z, tread height]. `half` is the half-width of the seating.
const SEATING = {
  grandstand: { half: 5.0, rows: [[2.75, 1.91], [2.25, 2.30], [1.75, 2.69], [1.25, 3.09], [.75, 3.48], [.25, 3.87]] },
};
const SPACING = .82, VARIANTS = 8, HEIGHT = 1.62, WIDTH = HEIGHT * .375 * 1.28, FEET = .36;

// A small repeatable stream, so the same seats fill on every machine.
const stream = seed => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Cards for one stand, in the piece's own frame. `fill` is the share of seats taken.
export function standCrowdGeometry(seating, seed = 1, fill = .78) {
  const random = stream(seed), positions = [], uv = [], colours = [], indices = [];
  for (const [z, y] of seating.rows) for (let x = -seating.half; x <= seating.half + 1e-6; x += SPACING) {
    if (random() > fill) continue;
    const variant = Math.floor(random() * VARIANTS), u0 = (variant + .008) / VARIANTS, u1 = (variant + .992) / VARIANTS;
    const centre = x + (random() - .5) * .22, height = HEIGHT * (.94 + random() * .1), tint = .66 + random() * .2;
    const first = positions.length / 3;
    for (const [horizontal, vertical, u, v] of [[-.5, 0, u0, 0], [.5, 0, u1, 0], [-.5, 1, u0, 1], [.5, 1, u1, 1]]) {
      positions.push(centre + horizontal * WIDTH, y - FEET + height * vertical, z);
      uv.push(u, v); colours.push(tint, tint * .97, tint * .93);
    }
    indices.push(first, first + 1, first + 2, first + 2, first + 1, first + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export function addStandCrowds(group, course) {
  const stands = [];
  (course.def.kitPlacements ?? []).forEach((piece, index) => { if (piece.crowd && SEATING[piece.id]) stands.push({ piece, index }); });
  if (!stands.length) return;
  const material = new THREE.MeshStandardMaterial({ name: 'Grandstand spectators', map: crowdTexture(), alphaTest: .55, roughness: 1, side: THREE.DoubleSide, vertexColors: true });
  const crowd = new THREE.Group();
  crowd.name = 'Grandstand spectators';
  group.add(crowd);
  let built = false;
  registerSceneSystem(group, {
    animate() {
      const kits = trackKitsOf(group);
      if (built || !kits || kits.status !== 'ready') return;
      built = true;
      stands.forEach(({ piece, index }, n) => {
        const mesh = new THREE.Mesh(standCrowdGeometry(SEATING[piece.id], 0x5ea7 + n * 101), material);
        mesh.matrixAutoUpdate = false;
        mesh.matrix.copy(kits.getPlacementPose(index));
        mesh.matrixWorldNeedsUpdate = true;
        mesh.name = `Grandstand spectators ${n + 1}`; mesh.receiveShadow = true;
        crowd.add(mesh);
      });
    },
    dispose() { material.dispose(); },
  });
}
