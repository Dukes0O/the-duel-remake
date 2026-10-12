// Winter life on a circuit's slopes (docs/CIRCUITS.md section 5.3, Tremblant
// Snow): small skiers standing on the ski runs and smoke rising from the lodge
// chimney. Presentation only: nothing here reads or writes race state, and the
// skiers are still figures, not cars or targets.
//
// circuit-effects.js decides where the skiers stand (it knows the hills) and
// hands over a list of spots; this file draws them and the smoke.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { registerSceneSystem } from './scene-systems.js';

const JACKETS = [0xd3262b, 0x1f6fd1, 0xf2b705, 0x1ca25a, 0xe8601c, 0x8b3fc8, 0x16a6c9, 0xe0e4e8];
const TRAVEL_LEAN = .2;

// One skier in metres, feet on the ground, facing +z. Two meshes share the same
// poses: the jacket takes a colour per skier, the rest keeps its own colours.
export function skierGeometry() {
  const part = (geometry, colour, move = [0, 0, 0], turn = [0, 0, 0]) => {
    geometry.rotateX(turn[0]); geometry.rotateZ(turn[2]); geometry.translate(...move);
    const count = geometry.attributes.position.count, tint = new THREE.Color(colour), data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) { data[i * 3] = tint.r; data[i * 3 + 1] = tint.g; data[i * 3 + 2] = tint.b; }
    geometry.setAttribute('color', new THREE.BufferAttribute(data, 3));
    return geometry;
  };
  const gear = [], jacket = [];
  for (const side of [-1, 1]) {
    gear.push(part(new THREE.BoxGeometry(.1, .035, 1.5), 0x1d2228, [side * .14, .02, .12]));
    gear.push(part(new THREE.CylinderGeometry(.075, .085, .78, 6), 0x222d47, [side * .1, .43, 0]));
    jacket.push(part(new THREE.CylinderGeometry(.06, .055, .5, 5), 0xffffff, [side * .27, 1.05, .1], [-.6, 0, side * .12]));
  }
  jacket.push(part(new THREE.CylinderGeometry(.19, .23, .6, 7), 0xffffff, [0, 1.12, 0]));
  gear.push(part(new THREE.SphereGeometry(.105, 7, 5), 0xd6a283, [0, 1.56, .02]));
  gear.push(part(new THREE.SphereGeometry(.125, 7, 5, 0, Math.PI * 2, 0, Math.PI * .55), 0x2c323a, [0, 1.58, .02]));
  const merge = list => { const merged = mergeGeometries(list); list.forEach(item => item.dispose()); merged.computeBoundingSphere(); return merged; };
  return { gear: merge(gear), jacket: merge(jacket) };
}

// spots: [{ x, y, z, yaw, scale, jacket }] in world metres; jacket is an index into the palette.
export function addSkiers(group, spots) {
  if (!spots.length) return;
  const { gear, jacket } = skierGeometry();
  const gearMaterial = new THREE.MeshStandardMaterial({ name: 'Skier gear', vertexColors: true, roughness: .85 });
  const jacketMaterial = new THREE.MeshStandardMaterial({ name: 'Skier jackets', roughness: .75 });
  const gearMesh = new THREE.InstancedMesh(gear, gearMaterial, spots.length), jacketMesh = new THREE.InstancedMesh(jacket, jacketMaterial, spots.length);
  const matrix = new THREE.Matrix4(), position = new THREE.Vector3(), rotation = new THREE.Quaternion(), euler = new THREE.Euler(0, 0, 0, 'YXZ'), scale = new THREE.Vector3(), colour = new THREE.Color();
  spots.forEach((spot, i) => {
    euler.set(TRAVEL_LEAN, spot.yaw, 0);
    rotation.setFromEuler(euler);
    position.set(spot.x, spot.y, spot.z); scale.setScalar(spot.scale);
    matrix.compose(position, rotation, scale);
    gearMesh.setMatrixAt(i, matrix); jacketMesh.setMatrixAt(i, matrix);
    jacketMesh.setColorAt(i, colour.setHex(JACKETS[spot.jacket % JACKETS.length]));
  });
  for (const mesh of [gearMesh, jacketMesh]) { mesh.computeBoundingSphere(); mesh.name = 'Skiers on the slopes'; mesh.castShadow = false; mesh.receiveShadow = false; group.add(mesh); }
  registerSceneSystem(group, { dispose() { gear.dispose(); jacket.dispose(); gearMaterial.dispose(); jacketMaterial.dispose(); } });
}

// A soft round puff, made in code (no image to load).
function puffTexture() {
  const size = 48, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const d = Math.hypot((x + .5) / size - .5, (y + .5) / size - .5) * 2, fade = Math.max(0, 1 - d), alpha = Math.min(1, fade * 1.8);
    const i = (y * size + x) * 4;
    data[i] = 240; data[i + 1] = 243; data[i + 2] = 247; data[i + 3] = Math.round(alpha * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true;
  return texture;
}

// A thin column of smoke rising from one point and leaning with the wind.
// config: { count, rise (m/s), life (s), size: [from, to], wind: [x, z] (m/s), opacity }
// Returns { place(origin), animate(seconds) }: nothing shows until it is placed.
export function addChimneySmoke(group, config = {}) {
  const { count = 12, rise = .9, life = 11, size = [1.1, 4.2], wind = [.7, .3], opacity = .38 } = config;
  const texture = puffTexture(), puffs = [], origin = new THREE.Vector3();
  let placed = false;
  for (let i = 0; i < count; i++) {
    const material = new THREE.SpriteMaterial({ map: texture, color: 0xc4ced8, transparent: true, opacity: 0, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.name = 'Chimney smoke'; sprite.visible = false;
    puffs.push({ sprite, material, phase: i / count, sway: .55 + (i * .37) % .6, turn: i * 2.1 });
    group.add(sprite);
  }
  registerSceneSystem(group, { dispose() { texture.dispose(); puffs.forEach(({ material }) => material.dispose()); } });
  return {
    place(point) { origin.copy(point); placed = true; },
    animate(seconds) {
      if (!placed) return;
      for (const puff of puffs) {
        const age = ((seconds / life + puff.phase) % 1 + 1) % 1, grow = Math.pow(age, .7), time = age * life;
        puff.sprite.visible = true;
        puff.sprite.position.set(origin.x + wind[0] * time + Math.sin(time * puff.sway + puff.turn) * (.2 + age * 1.2),
          origin.y + rise * time, origin.z + wind[1] * time + Math.cos(time * puff.sway * .8 + puff.turn) * (.2 + age * 1.2));
        puff.sprite.scale.setScalar(size[0] + (size[1] - size[0]) * grow);
        puff.material.opacity = opacity * Math.min(1, age * 7) * Math.pow(1 - age, 1.4);
      }
    },
  };
}
