// Destruction decisions are deterministic and independent of the renderer.
// Callers keep course features immutable; a stage records only changed IDs.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function sceneryIdentity(obstacle) {
  return obstacle?.signSupport && obstacle.id?.startsWith('road-sign-')
    ? obstacle.id.split('-post-')[0] : obstacle?.id;
}

export function breakableScenery(obstacle, impactMph, {mode, enabled} = {}) {
  if (!enabled || mode !== 'wasteland' || !obstacle || !Number.isFinite(impactMph)) return null;
  if (obstacle.kind === 'tree' && obstacle.theme !== 'desert' && (obstacle.scale ?? 1) <= 1.1) {
    if (impactMph < 14) return null;
    const scale = obstacle.scale ?? 1;
    return {id: obstacle.id, kind: 'tree', speedLossMph: 12 + 7 * scale};
  }
  if (obstacle.signSupport && impactMph >= 7) {
    return {id: sceneryIdentity(obstacle), kind: obstacle.id?.startsWith('turn-chevron-') ? 'chevron' : 'sign', speedLossMph: 5};
  }
  return null;
}

// The energy needed to total a traffic car rises with its mass. A heavy player
// car can send light traffic away at a lower closing speed, but a parking-speed
// touch remains a shove. This rule never decides the player's own crash.
export function trafficDestruction({enabled = false, mode, impactMph, playerTopSpeedMph, playerMass = 1450, targetMass = 1450} = {}) {
  if (!enabled || mode !== 'wasteland' || ![impactMph, playerTopSpeedMph, playerMass, targetMass].every(Number.isFinite)) {
    return {wreck: false, impulse: 0};
  }
  const massRatio = Math.sqrt(clamp(targetMass / Math.max(1, playerMass), .35, 3));
  const thresholdMph = clamp(playerTopSpeedMph * .24 * massRatio, 22, 72);
  const wreck = impactMph >= thresholdMph;
  return {wreck, thresholdMph, impulse: wreck ? clamp(4 + (impactMph - thresholdMph) * .075, 4, 19) : 0};
}

export function startTrafficWreck(actor, {atTime = 0, impulse = 0, side = 1} = {}) {
  if (!actor || actor.wrecked) return false;
  const kick = clamp(Number.isFinite(impulse) ? impulse : 0, 0, 19);
  const direction = Math.sign(side) || 1;
  actor.alive = false;
  actor.wrecked = {
    atTime, age: 0, side: direction,
    lateralVelocity: direction * (.35 + kick * .8),
    forwardVelocity: (actor.dir || 1) * Math.max(0, actor.speedMph || 0) * .44704 * .35,
    verticalVelocity: 1.1 + kick * .42,
    spinVelocity: direction * (.45 + kick * .12),
  };
  actor.airHeight = 0;
  actor.damageZones = {front: 3.5, rear: 3.5, left: 3.5, right: 3.5};
  actor.speedMph = 0;
  actor.pushVelocity = 0;
  return true;
}

export function stepTrafficWreck(actor, dt) {
  const wreck = actor?.wrecked;
  if (!wreck || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, .05);
  actor.prevS = actor.s;
  actor.prevLateral = actor.lateral;
  wreck.age += dt;
  actor.lateral += wreck.lateralVelocity * dt;
  actor.s += wreck.forwardVelocity * dt;
  actor.headingError = (actor.headingError || 0) + wreck.spinVelocity * dt;
  wreck.lateralVelocity *= Math.exp(-2.7 * dt);
  wreck.forwardVelocity *= Math.exp(-2.2 * dt);
  wreck.spinVelocity *= Math.exp(-2.3 * dt);
  actor.airHeight = Math.max(0, wreck.verticalVelocity * wreck.age - 4.9 * wreck.age * wreck.age);
  wreck.roll = wreck.side * Math.min(1.05, wreck.age * (1 + Math.abs(wreck.spinVelocity) * .5));
}
