// A plain burning stick for Claude to redraw. The existing fighter owns its
// position; this view never changes the brand clock, attacks or movement.
import * as THREE from 'three';
import {BRAND_RULE as R} from './jobs/brand-rule.js';

export function createCarriedBrand() {
  const group = new THREE.Group();
  group.name = 'Carried town brand';
  group.visible = false;
  const stickShape = new THREE.CylinderGeometry(R.brandRadius, R.brandRadius, R.brandLength, 8);
  const wood = new THREE.MeshStandardMaterial({color: 0x59412c, roughness: 1});
  const stick = new THREE.Mesh(stickShape, wood);
  stick.position.y = R.brandLength / 2;
  const flameShape = new THREE.ConeGeometry(R.brandFlameHeight / 3, R.brandFlameHeight, 8);
  const fire = new THREE.MeshBasicMaterial({color: 0xffad35});
  const flame = new THREE.Mesh(flameShape, fire);
  flame.name = 'Brand flame';
  flame.position.y = R.brandLength + R.brandFlameHeight / 2;
  const light = new THREE.PointLight(0xffb455, 0, R.brandLightRadius);
  light.position.y = R.brandLength;
  group.add(stick, flame, light);
  return {group,
    update(state, drawnShift) {
      const job = state?.arena?.mode === 'world-job' ? state.arena.worldJob?.job : null;
      const step = job?.steps?.[job.stepIndex], fighter = state?.fighter;
      const carried = job?.stepState;
      group.visible = Boolean(step?.brand && carried?.brandsUsed > 0 && state.onFoot &&
        fighter && !fighter.knockedDown);
      light.intensity = group.visible && carried.brandSeconds > 0 ? R.brandLightIntensity : 0;
      flame.visible = light.intensity > 0;
      if (!group.visible) return;
      const yaw = fighter.yaw || 0;
      // Held on the left, leaving Cinder's existing Hand Flamer on the right.
      group.position.set(fighter.x - Math.cos(yaw) * R.brandHandSide + Math.sin(yaw) * R.brandHandForward,
        fighter.y + R.brandHandHeight,
        fighter.z + Math.sin(yaw) * R.brandHandSide + Math.cos(yaw) * R.brandHandForward);
      group.position.y+=drawnShift?.(fighter.x,fighter.z,fighter.groundY??fighter.y-(fighter.airHeight||0),fighter.airHeight>0?fighter.y:undefined,group)??0;
      group.rotation.set(fighter.pitch || 0, yaw, 0, 'YXZ');
    },
    dispose() {
      stickShape.dispose(); flameShape.dispose(); wood.dispose(); fire.dispose();
      group.clear(); group.visible = false; light.intensity = 0;
    },
  };
}
