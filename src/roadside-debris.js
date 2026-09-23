import * as THREE from 'three';
import {COMBAT_TUNING} from './wasteland-tuning.js';

// The pool exists before a collision. Its scene objects and GPU resources
// never change during a race; only their transforms and visibility do.
export function createRoadsideDebris() {
  const tuning = COMBAT_TUNING.roadside;
  const group = new THREE.Group();
  group.name = 'Roadside debris pool';
  const flashGeometry = new THREE.IcosahedronGeometry(1, 1);
  const shardGeometry = new THREE.TetrahedronGeometry(1);
  const ringGeometry = new THREE.TorusGeometry(1, .08, 5, 24);
  const fire = new THREE.MeshBasicMaterial({color: 0xffa12e, transparent: true,
    opacity: .85, depthWrite: false});
  const ember = new THREE.MeshBasicMaterial({color: 0xffd77e, transparent: true,
    opacity: .92, depthWrite: false});
  const smoke = new THREE.MeshBasicMaterial({color: 0x39312b, transparent: true,
    opacity: .42, depthWrite: false});
  const scrap = new THREE.MeshStandardMaterial({color: 0x60584c,
    metalness: .68, roughness: .48});
  const slots = Array.from({length: tuning.burstLimit}, (_, slotIndex) => {
    const burst = new THREE.Group();
    burst.name = `Roadside debris ${slotIndex}`;
    burst.visible = false;
    const flash = new THREE.Mesh(flashGeometry, fire);
    flash.position.y = .8;
    const core = new THREE.Mesh(flashGeometry, ember);
    core.position.y = .8;
    const cloud = new THREE.Mesh(flashGeometry, smoke);
    cloud.position.y = 1.2;
    const ring = new THREE.Mesh(ringGeometry, ember);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .16;
    const shards = Array.from({length: 6}, () => {
      const mesh = new THREE.Mesh(shardGeometry, scrap);
      burst.add(mesh);
      return mesh;
    });
    burst.add(flash, core, cloud, ring);
    group.add(burst);
    return {burst, flash, core, cloud, ring, shards};
  });

  function update(state) {
    for (const slot of slots) slot.burst.visible = false;
    if (!state || state.status === 'menu') return;
    const records = state.roadsideBursts || [];
    const now = state.stageTimeSec || 0;
    for (let i = 0; i < records.length; i++) {
      const event = records[i], age = now - event.atTime;
      if (!Number.isFinite(age) || age < 0 || age > tuning.sceneryBurstSeconds) continue;
      const slot = slots[event.serial % slots.length];
      const t = age / tuning.sceneryBurstSeconds;
      slot.burst.visible = true;
      slot.burst.position.set(event.x, event.y, event.z);
      slot.flash.scale.setScalar(.3 + 2.1 * (1 - t));
      slot.core.scale.setScalar(.2 + .9 * (1 - t));
      slot.cloud.scale.setScalar(.25 + 1.8 * t);
      slot.cloud.position.y = 1.1 + t * 2.1;
      slot.ring.scale.setScalar(.25 + 3.1 * t);
      const strength = Math.min(1.5, Math.max(.6, event.impactMph / 100));
      for (let index = 0; index < slot.shards.length; index++) {
        const shard = slot.shards[index];
        const angle = index * Math.PI / 3 + event.serial * .71;
        const radius = (.4 + 3.8 * t) * strength;
        shard.position.set(Math.cos(angle) * radius,
          .45 + Math.sin(Math.PI * t) * (1.1 + index % 3 * .35),
          Math.sin(angle) * radius);
        shard.rotation.set(t * (index + 1) * 5, t * (index + 2) * 3,
          t * (index + 3) * 4);
        shard.scale.setScalar((.32 + index % 2 * .15) * (1 - t * .55));
      }
    }
  }

  return {group, update, resources: {slots, geometries: [flashGeometry,
    shardGeometry, ringGeometry], materials: [fire, ember, smoke, scrap]}};
}
