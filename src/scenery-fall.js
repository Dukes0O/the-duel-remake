import * as THREE from 'three';

export function sceneryFallRotation(event, progress, target = new THREE.Quaternion()) {
  const length = Math.hypot(event.directionX, event.directionZ);
  if (!Number.isFinite(length) || length < 1e-6) return target.identity();
  const eased = progress * progress * (3 - 2 * progress);
  return target.setFromAxisAngle(new THREE.Vector3(event.directionZ / length, 0, -event.directionX / length), eased * 1.38);
}

export function makeSignFallSystem(signGroups) {
  const rest = new Map([...signGroups].map(([id, group]) => [id, group.quaternion.clone()]));
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
      if (active.get(event.id) === progress) continue;
      active.set(event.id, progress);
      sceneryFallRotation(event, progress, tilt);
      group.quaternion.copy(tilt).multiply(rest.get(event.id));
    }
    for (const id of active.keys()) if (!seen.has(id)) {
      signGroups.get(id).quaternion.copy(rest.get(id));
      active.delete(id);
    }
  };
}
