import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original, low-cost cockpit figure. +Z faces forward; dimensions are metres.
// The concept car has a central driving position rather than a left-hand seat.
export function createDriver({ hero = false, suitColor = 0x244453 } = {}) {
  const driver = new THREE.Group();
  driver.name = 'Helmeted racing driver';
  driver.position.set(hero ? .004 : -.41, hero ? 0 : .08, hero ? .13 : -.37);
  const suit = new THREE.MeshStandardMaterial({ color: suitColor, roughness: .88 });
  const gloves = new THREE.MeshStandardMaterial({ color: 0xe6dfc9, roughness: .8 });
  const helmet = new THREE.MeshPhysicalMaterial({ color: 0xf2eee0, roughness: .22, clearcoat: 1 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x131b24, roughness: .64 });
  const belt = new THREE.MeshStandardMaterial({ color: 0xeb7133, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x9ca6aa, metalness: .8, roughness: .3 });
  const visor = new THREE.MeshPhysicalMaterial({ color: 0x183740, metalness: .65, roughness: .08, clearcoat: 1 });
  const buckets = new Map();
  const sphere = new THREE.SphereGeometry(1, 16, 10), box = new THREE.BoxGeometry(1, 1, 1);
  const add = (geometry, material, position, scale, rotation = [0, 0, 0]) => {
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
    const transformed = geometry.clone().applyMatrix4(matrix), copy = transformed.toNonIndexed();
    transformed.dispose();
    if (!buckets.has(material)) buckets.set(material, []);
    buckets.get(material).push(copy);
  };
  // Reclined shoulders, hips and bent legs sit inside the original bucket seat.
  add(sphere, suit, [0, .83, -.03], [.175, .255, .12], [-.15, 0, 0]);
  add(sphere, suit, [0, .60, .015], [.16, .095, .15]);
  for (const side of [-1, 1]) {
    add(sphere, suit, [side * .083, .57, .21], [.074, .072, .22], [-.11, 0, 0]);
    add(sphere, suit, [side * .082, .43, .46], [.06, .19, .055], [-.58, 0, 0]);
    add(sphere, dark, [side * .081, .29, .59], [.062, .043, .11]);
    add(box, belt, [side * .075, .851, .092], [.038, .385, .017], [-.11, 0, side * .065]);
    add(box, metal, [side * .075, .953, .112], [.052, .043, .022]);
  }
  add(box, belt, [0, .669, .115], [.31, .035, .024]);
  add(box, metal, [0, .687, .135], [.055, .047, .024]);
  add(sphere, dark, [0, 1.087, -.047], [.084, .073, .075]);
  // Helmet and neck form a separate joint so the driver looks into the turn.
  const head = new THREE.Group(); head.position.set(0, 1.205, -.04); driver.add(head);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(.145, 24, 16), helmet);
  shell.scale.set(1, 1.12, 1.04); head.add(shell);
  const faceplate = new THREE.Mesh(new THREE.SphereGeometry(.148, 20, 8, -.93, 1.86, 1.05, .61), visor);
  // Sphere azimuth zero points +Z after a quarter turn.
  faceplate.rotation.y = Math.PI / 2; faceplate.scale.set(1, 1.12, 1.055); head.add(faceplate);
  const chin = new THREE.Mesh(new THREE.BoxGeometry(.18, .057, .046), helmet);
  chin.position.set(0, -.071, .12); head.add(chin);
  const vents = new THREE.Mesh(new THREE.BoxGeometry(.077, .014, .006), dark);
  vents.position.set(0, -.071, .146); head.add(vents);
  const stripe = new THREE.Mesh(new THREE.SphereGeometry(.147, 12, 16, Math.PI / 2 - .085, .17, .08, 2.64), belt);
  stripe.scale.set(1, 1.12, 1.04); head.add(stripe);
  const arms = [];
  const limbGeometry = new THREE.CylinderGeometry(.05, .058, 1, 10);
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(limbGeometry, suit), lower = new THREE.Mesh(limbGeometry, suit);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), gloves);
    hand.scale.set(.045, .055, .044); driver.add(upper, lower, hand);
    arms.push({ side, upper, lower, hand });
  }
  for (const [material, parts] of buckets) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), material); driver.add(mesh);
    parts.forEach(g => g.dispose());
  }
  sphere.dispose(); box.dispose();
  driver.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  driver.userData = { head, arms, wheelCenter: new THREE.Vector3(0, hero ? .898 : 1.02, hero ? .632 : .69), steering: 0 };
  updateDriver(driver, 0);
  return driver;
}

const up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), delta = new THREE.Vector3();
function poseLimb(mesh, from, to) {
  delta.subVectors(to, from); mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.scale.set(1, delta.length(), 1); mesh.quaternion.setFromUnitVectors(up, delta.normalize());
}

export function updateDriver(driver, steering = 0, slip = 0, catastrophic = false) {
  if (!driver) return;
  const data = driver.userData, turn = THREE.MathUtils.clamp(steering, -1, 1) * .7;
  data.steering = turn;
  data.head.rotation.y = -steering * .22 - slip * .25;
  data.head.rotation.z = catastrophic ? -.12 : -steering * .065;
  for (const { side, upper, lower, hand } of data.arms) {
    const angle = (side < 0 ? Math.PI : 0) + turn;
    const dy = Math.sin(angle) * .145;
    hand.position.set(data.wheelCenter.x + Math.cos(angle) * .151, data.wheelCenter.y + dy * .93, data.wheelCenter.z + dy * .369);
    hand.rotation.z = turn;
    a.set(side * .148, 1.005, -.005);
    b.set(side * .207, .825 + side * turn * .048, .30);
    poseLimb(upper, a, b); poseLimb(lower, b, hand.position);
  }
}
