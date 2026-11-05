import * as THREE from 'three';
import {flipbookFrameUVInto} from '../combat-vfx-atlas.js';

const FRAME = {columns: 4, rows: 4};

/** Small seeded plume and clods, aimed along the tool's throw direction. */
export function createDigFx({group, atlasTexture = null, seed = 1} = {}) {
  if (!group?.isGroup) throw new TypeError('Dig effects need a Three.js group.');
  let state = Number.isFinite(seed) ? seed >>> 0 : 1;
  const random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 0x100000000; };
  const material = atlasTexture
    ? new THREE.SpriteMaterial({map: atlasTexture, transparent: true, depthWrite: false, color: 0x9b7954})
    : new THREE.MeshStandardMaterial({color: 0x8e704e, roughness: 1});
  const active = new Set();
  function burst({x, y, z, direction = {x: 0, z: 1}, strength = 1, material: kind = 'topsoil'} = {}) {
    if (![x, y, z, direction?.x, direction?.z, strength].every(Number.isFinite) || strength < 0) throw new TypeError('Dig effect values must be finite.');
    const colour = kind === 'rock' ? 0x77736d : kind === 'gravel' ? 0x82725e : 0x94744f;
    const entries = [];
    for (let i = 0; i < 12; i++) {
      const particleMaterial = material.clone();
      const clod = atlasTexture ? new THREE.Sprite(particleMaterial) : new THREE.Mesh(new THREE.IcosahedronGeometry(.16 + random() * .22, 0), particleMaterial);
      if (atlasTexture) {
        particleMaterial.map = atlasTexture.clone();
        const uv = flipbookFrameUVInto(Math.floor(random() * 16), FRAME, {});
        particleMaterial.map.offset.set(uv.offsetX, uv.offsetY); particleMaterial.map.repeat.set(uv.repeatX, uv.repeatY);
      } else particleMaterial.color.setHex(colour);
      clod.position.set(x, y, z); clod.scale.setScalar(.45 + random() * .8); group.add(clod);
      const speed = strength * (.8 + random() * 2.4), angle = (random() - .5) * .95;
      entries.push({clod, vx: direction.x * speed + Math.sin(angle) * speed, vy: 1.2 + random() * speed, vz: direction.z * speed + Math.cos(angle) * speed, age: 0, life: .45 + random() * .55});
    }
    for (const entry of entries) active.add(entry);
    return entries.length;
  }
  function update(dt) {
    if (!Number.isFinite(dt) || dt < 0) throw new TypeError('Dig effect time must be non-negative.');
    for (const p of active) {
      p.age += dt; p.vy -= 8.5 * dt;
      p.clod.position.x += p.vx * dt; p.clod.position.y += p.vy * dt; p.clod.position.z += p.vz * dt;
      p.clod.scale.multiplyScalar(Math.max(0, 1 - dt * .7));
      if (p.age >= p.life) { group.remove(p.clod); if (!atlasTexture) p.clod.geometry.dispose(); p.clod.material.map?.dispose(); p.clod.material.dispose(); active.delete(p); }
    }
  }
  function dispose() {
    for (const p of active) { group.remove(p.clod); if (!atlasTexture) p.clod.geometry.dispose(); p.clod.material.map?.dispose(); p.clod.material.dispose(); }
    active.clear(); material.dispose();
  }
  return Object.freeze({burst, update, dispose, get particleCount() { return active.size; }});
}
