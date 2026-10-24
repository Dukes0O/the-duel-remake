// LAB-ART: palette and the gauge used by several benches.
import * as THREE from 'three';
import { C, Part, fbm, lerpColor } from './lab-kit.mjs';

export const STEEL = 0x56646d, YELLOW = 0xc9a227, RED = 0x9a2a22, IRON = 0x3a3d3f, ALU = 0xb5b8ba, WOOD = 0x7a5b36, BRASS = 0xa07a2a, GREEN = 0x4a5a42, PAPER = 0xe8e2cf;

// A point in a flat fitting that faces +Z, turned by `yaw` about Y, at (x, y, z).
export const placeAt = (x, y, z, yaw, dx, dy, dz) => { const c = Math.cos(yaw), s = Math.sin(yaw); return [x + dx * c + dz * s, y + dy, z - dx * s + dz * c]; };

// A round gauge: bezel, face, ticks and a glass cover. Its needle is a separate
// part (see `needle`) so a viewer can swing it.
export function gauge(part, { x, y, z, r = .15, yaw = 0, ticks = 21, sweep = 4.2 }) {
  const at = (dx, dy, dz) => placeAt(x, y, z, yaw, dx, dy, dz);
  part.add('solid', new THREE.TorusGeometry(r, r * .1, 6, 24), at(0, 0, 0), [0, yaw, 0], [1, 1, 1], () => C(BRASS).multiplyScalar(.8));
  part.add('solid', new THREE.CircleGeometry(r * .95, 24), at(0, 0, .002), [0, yaw, 0], [1, 1, 1], (p) => lerpColor(C(PAPER), C(0xb9b19a), fbm(p, 20, 7) * .8));
  for (let i = 0; i < ticks; i++) {
    const theta = -sweep / 2 + sweep * i / (ticks - 1), major = i % 5 === 0;
    part.add('solid', new THREE.BoxGeometry(r * .035, r * (major ? .2 : .11), .004), at(Math.sin(theta) * r * .78, Math.cos(theta) * r * .78, .006), [0, yaw, -theta], [1, 1, 1], () => C(0x1a1816));
  }
  part.add('glass', new THREE.CircleGeometry(r * .95, 24), at(0, 0, .014), [0, yaw, 0], [1, 1, 1], () => C(0xdde7e8));
}
export function needle(name, x, y, z, length, yaw = 0, hex = 0xb02a22) {
  const part = new Part(name, [x, y, z]), at = (dx, dy, dz) => placeAt(x, y, z, yaw, dx, dy, dz);
  part.add('solid', new THREE.BoxGeometry(length * .05, length, .004), at(0, length * .38, .01), [0, yaw, 0], [1, 1, 1], () => C(hex));
  part.add('solid', new THREE.CylinderGeometry(length * .1, length * .1, .012, 10).rotateX(Math.PI / 2), at(0, 0, .01), [0, yaw, 0], [1, 1, 1], () => C(0x2a2a2a));
  return part;
}
