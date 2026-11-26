// The brand the player carries in "Light the Town" (EVERBURN-REMAKE, job 2): a stick with a head of rag bound in wire,
// burning. Drawn in code. The fighter owns its place; this view never changes the brand's clock, attacks or movement.
import * as THREE from 'three';
import {BRAND_RULE as R} from './jobs/brand-rule.js';
import {createFlameMaterial, createGroundGlowMaterial} from './scrap-look.js';

export function createCarriedBrand() {
  const group = new THREE.Group();
  group.name = 'Carried town brand';
  group.visible = false;
  // The stick: a length of old broom handle, thicker toward the head.
  const stickShape = new THREE.CylinderGeometry(R.brandRadius * 1.15, R.brandRadius * .85, R.brandLength, 7);
  const wood = new THREE.MeshStandardMaterial({color: 0x4f3a27, roughness: 1});
  const stick = new THREE.Mesh(stickShape, wood);
  stick.name = 'Brand stick';
  stick.position.y = R.brandLength / 2;
  // The head: rag wound round the top and bound with wire, black where it has burned, glowing while alight.
  const headShape = new THREE.CylinderGeometry(R.brandRadius * 2.5, R.brandRadius * 1.9, R.brandLength * .22, 8);
  const rag = new THREE.MeshStandardMaterial({color: 0x15110d, roughness: 1, emissive: 0x7a2206, emissiveIntensity: 0});
  const head = new THREE.Mesh(headShape, rag);
  head.name = 'Brand head'; head.position.y = R.brandLength * .42;
  const wireShape = new THREE.TorusGeometry(R.brandRadius * 2.4, R.brandRadius * .22, 4, 10);
  const wire = new THREE.MeshStandardMaterial({color: 0x1d1b19, roughness: .95});
  for (const y of [-.06, .05]) { const ring = new THREE.Mesh(wireShape, wire); ring.rotation.x = Math.PI / 2; ring.position.y = y; head.add(ring); }
  stick.add(head);
  // The flame: two tongues that always face the viewer, standing on the head.
  const flameMaterial = createFlameMaterial(), standing = new THREE.PlaneGeometry(1, 1); standing.translate(0, .5, 0);
  const flame = new THREE.Group();
  flame.name = 'Brand flame'; flame.position.y = R.brandLength * .98;
  const tongues = [0, 1].map(index => {
    const tongue = new THREE.Mesh(standing, flameMaterial);
    tongue.renderOrder = 3; tongue.frustumCulled = false; tongue.position.set(index ? .03 : -.02, index ? .03 : 0, 0);
    flame.add(tongue); return tongue;
  });
  const light = new THREE.PointLight(0xffa64a, 0, R.brandLightRadius);
  light.position.y = R.brandLength;
  // A pool of its light on the ground under it.
  const glowMaterial = createGroundGlowMaterial(), poolShape = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const pool = new THREE.Mesh(poolShape, glowMaterial);
  pool.name = 'The light of the brand on the ground'; pool.renderOrder = 1; pool.scale.setScalar(5);
  group.add(stick, flame, light, pool);
  let seconds = 0;
  return {group,
    update(state, drawnShift) {
      const worldJob = state?.arena?.mode === 'world-job' ? state.arena.worldJob : null;
      const job = worldJob?.job;
      const step = job?.steps?.[job.stepIndex], fighter = state?.fighter;
      const carried = job?.stepState;
      const defenceBrand = worldJob?.threadDefence?.weapons.includes('brand');
      const brandSeconds = defenceBrand ? 15 : carried?.brandSeconds;
      group.visible = Boolean((defenceBrand || step?.brand && carried?.brandsUsed > 0) && state.onFoot &&
        fighter && !fighter.knockedDown);
      const burning = group.visible && brandSeconds > 0;
      light.intensity = burning ? R.brandLightIntensity : 0;
      flame.visible = burning; pool.visible = burning;
      // The rag itself stays black: only a dull glow shows where it burns.
      rag.emissiveIntensity = burning ? .35 : 0;
      if (!group.visible) return;
      const yaw = fighter.yaw || 0;
      // Held on the left, leaving the Hand Flamer on the right.
      group.position.set(fighter.x - Math.cos(yaw) * R.brandHandSide + Math.sin(yaw) * R.brandHandForward,
        fighter.y + R.brandHandHeight,
        fighter.z + Math.sin(yaw) * R.brandHandSide + Math.cos(yaw) * R.brandHandForward);
      group.position.y += drawnShift?.(fighter.x, fighter.z, fighter.groundY ?? fighter.y - (fighter.airHeight || 0), fighter.airHeight > 0 ? fighter.y : undefined, group) ?? 0;
      group.rotation.set(fighter.pitch || 0, yaw, 0, 'YXZ');
      pool.position.y = .06 - R.brandHandHeight;
      // A brand in its last fifteen seconds burns low.
      const share = burning ? Math.min(1, brandSeconds / 15) : 0;
      tongues.forEach((tongue, index) => {
        const lick = .8 + .3 * Math.abs(Math.sin(seconds * (5.1 + index) + index * 2.3));
        tongue.scale.set(R.brandFlameHeight * (.75 - .2 * index) * (.6 + .4 * share), R.brandFlameHeight * (1.55 - .4 * index) * lick * (.5 + .5 * share), 1);
      });
    },
    // The scene's own clock, for the flicker only.
    animate(now) { seconds = now; flameMaterial.uniforms.uTime.value = now; glowMaterial.uniforms.uTime.value = now; },
    dispose() {
      stickShape.dispose(); headShape.dispose(); wireShape.dispose(); standing.dispose(); poolShape.dispose();
      wood.dispose(); rag.dispose(); wire.dispose(); flameMaterial.dispose(); glowMaterial.dispose();
      group.clear(); group.visible = false; light.intensity = 0;
    },
  };
}
