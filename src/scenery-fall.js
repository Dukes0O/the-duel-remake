import * as THREE from 'three';
import {COMBAT_TUNING} from './wasteland-tuning.js';

export function sceneryFallRotation(event, progress, target = new THREE.Quaternion()) {
  const length = Math.hypot(event.directionX, event.directionZ);
  if (!Number.isFinite(length) || length < 1e-6) return target.identity();
  const eased = progress * progress * (3 - 2 * progress);
  return target.setFromAxisAngle(new THREE.Vector3(event.directionZ / length, 0, -event.directionX / length), eased * 1.38);
}

export function makeSignFallSystem(signGroups) {
  const rest = new Map([...signGroups].map(([id, group]) => [id, group.quaternion.clone()]));
  const restPositions = new Map([...signGroups].map(([id, group]) => [id, group.position.clone()]));
  const active = new Map(), seen = new Set(), tilt = new THREE.Quaternion();
  return state => {
    seen.clear();
    const now = Number.isFinite(state?.stageTimeSec) ? state.stageTimeSec : 0;
    const events = state?.status === 'menu' ? [] : state?.brokenScenery || [];
    for (const event of events) {
      if (event.kind !== 'sign' || seen.has(event.id)) continue;
      const group = signGroups.get(event.id);
      if (!group || !Number.isFinite(event.atTime)) continue;
      seen.add(event.id);
      const progress = THREE.MathUtils.clamp((now - event.atTime) / .55, 0, 1);
      const key = `${progress}:${event.outcome || ''}`;
      if (active.get(event.id) === key) continue;
      active.set(event.id, key);
      sceneryFallRotation(event, progress, tilt);
      group.quaternion.copy(tilt).multiply(rest.get(event.id));
      group.position.copy(restPositions.get(event.id));
      if (event.outcome === 'knock') {
        const eased = progress * progress * (3 - 2 * progress);
        group.position.x += event.directionX * COMBAT_TUNING.roadside.sceneryKnockDistance * eased;
        group.position.z += event.directionZ * COMBAT_TUNING.roadside.sceneryKnockDistance * eased;
      }
      group.visible = event.outcome !== 'obliterate' ||
        now - event.atTime < COMBAT_TUNING.roadside.sceneryVisibleSeconds;
    }
    for (const id of active.keys()) if (!seen.has(id)) {
      signGroups.get(id).quaternion.copy(rest.get(id));
      signGroups.get(id).position.copy(restPositions.get(id));
      signGroups.get(id).visible = true;
      active.delete(id);
    }
  };
}
