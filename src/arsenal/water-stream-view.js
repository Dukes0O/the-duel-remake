// WEAPON-WATER-CANNON: how a stream of water looks, drawn the same wherever it comes from, so a player learns one thing: the
// fire truck's cannon on flames or on a car (src/town/view/work-vehicle-view.js) and the Armory's car cannon in a fight
// (src/combat-scene.js). It is TOWN-FIRE-JOB's jet, moved here unchanged: pale blue drops along a low arc from the nozzle to
// where the water lands, moving out along it and spreading as they go. View only: it reads points and never changes race state.
import * as THREE from 'three';

export const WATER_STREAM_LOOK = Object.freeze({drops: 36, dropRadius: .28, colour: 0xd8ecff, opacity: .55,
  // The arc rises by this share of its length, at most `maxRise` metres; drops move out at `speed` lengths a second.
  rise: .18, maxRise: 6, speed: 1.6, nearScale: .6, farScale: 2.2});

/** One stream's drawing. `draw(scene, from, to, clock)` shows it between two world points; `hide()` hides it. */
export function createWaterStreamView({name = 'water-stream', layer = null} = {}) {
  const look = WATER_STREAM_LOOK;
  let mesh = null;
  const drop = new THREE.Object3D();
  function draw(scene, from, to, clock = 0) {
    if (!mesh) {
      mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(look.dropRadius, 6, 4),
        new THREE.MeshBasicMaterial({color: look.colour, transparent: true, opacity: look.opacity, depthWrite: false}), look.drops);
      mesh.name = name; mesh.frustumCulled = false;
      if (layer !== null) mesh.layers.set(layer);
    }
    if (!mesh.parent) scene.add(mesh);
    mesh.visible = true;
    const length = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z), rise = Math.min(look.maxRise, length * look.rise);
    for (let index = 0; index < look.drops; index++) {
      const share = ((index / look.drops) + clock * look.speed) % 1;
      drop.position.set(from.x + (to.x - from.x) * share, from.y + (to.y - from.y) * share + rise * 4 * share * (1 - share),
        from.z + (to.z - from.z) * share);
      drop.scale.setScalar(look.nearScale + share * (look.farScale - look.nearScale));
      drop.updateMatrix();
      mesh.setMatrixAt(index, drop.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function hide() { if (mesh) mesh.visible = false; }
  function remove() { mesh?.removeFromParent(); }
  function dispose() { remove(); mesh?.geometry.dispose(); mesh?.material.dispose(); mesh = null; }
  return {draw, hide, remove, dispose, get mesh() { return mesh; }};
}
