import {COMBAT_TUNING} from './wasteland-tuning.js';

// Destruction decisions are deterministic and independent of the renderer.
// Callers keep course features immutable; a stage records only changed IDs.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const roadside = COMBAT_TUNING.roadside;

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

export function roadsideScenery(obstacle, impactMph, topSpeedMph) {
  if (!obstacle || !Number.isFinite(impactMph) || !Number.isFinite(topSpeedMph) ||
      topSpeedMph <= 0 || impactMph < roadside.minimumImpactMph) return null;
  const cactus = obstacle.kind === 'tree' && obstacle.theme === 'desert';
  const smallTree = obstacle.kind === 'tree' && obstacle.theme !== 'desert' &&
    (obstacle.scale ?? 1) <= 1.1;
  const sign = obstacle.signSupport === true;
  if (!cactus && !smallTree && !sign) return null;
  const thresholdMph = topSpeedMph * roadside.thresholdFraction;
  return {
    id: sceneryIdentity(obstacle),
    kind: cactus ? 'cactus' : smallTree ? 'tree' :
      obstacle.id?.startsWith('turn-chevron-') ? 'chevron' : 'sign',
    outcome: impactMph >= thresholdMph ? 'obliterate' : 'knock',
    thresholdMph,
    speedLossMph: roadsideSpeedCost(impactMph),
  };
}

export function roadsideSpeedCost(impactMph) {
  return clamp(impactMph * roadside.speedCostFraction,
    roadside.minimumSpeedCostMph, roadside.maximumSpeedCostMph);
}

export function roadsideTrafficDecision({impactMph, topSpeedMph} = {}) {
  if (!Number.isFinite(impactMph) || !Number.isFinite(topSpeedMph) ||
      topSpeedMph <= 0) return {wreck: false, thresholdMph: 0};
  const thresholdMph = topSpeedMph * roadside.thresholdFraction;
  const wreck = impactMph >= thresholdMph;
  return {wreck, outcome: wreck ? 'obliterate' : 'knock', thresholdMph};
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

export function startRoadsideTraffic(actor, {atTime = 0, outcome, side = 1,
  impactMph = 0, targetLateral} = {}) {
  if (!actor || actor.roadsideMotion || !actor.alive) return false;
  const direction = Math.sign(side) || 1;
  actor.roadsideMotion = {
    outcome, atTime, age: 0, originS: actor.s, originLateral: actor.lateral,
    originHeading: actor.headingError || 0, direction,
    forwardDrift: (actor.dir || 1) * Math.min(12, Math.abs(actor.speedMph || 0) * .12),
    lateralDistance: Number.isFinite(targetLateral) ? targetLateral - actor.lateral :
      direction * (roadside.trafficKnockDistance + Math.min(2, impactMph * .012)),
    visible: true,
  };
  actor.alive = false;
  actor.speedMph = 0;
  actor.pushVelocity = 0;
  return true;
}

export function stepRoadsideTraffic(actor, dt) {
  const motion = actor?.roadsideMotion;
  if (!motion || !Number.isFinite(dt) || dt <= 0) return;
  motion.age += dt;
  const high = motion.outcome === 'obliterate';
  const duration = high ? roadside.trafficBurstSeconds : roadside.trafficKnockSeconds;
  const fraction = clamp(motion.age / duration, 0, 1);
  const eased = fraction * fraction * (3 - 2 * fraction);
  actor.prevS = actor.s;
  actor.prevLateral = actor.lateral;
  actor.s = motion.originS + motion.forwardDrift * eased;
  actor.lateral = motion.originLateral + motion.lateralDistance * eased;
  actor.headingError = motion.originHeading + motion.direction * (high ? .7 : .35) * eased;
  actor.airHeight = high ? Math.sin(Math.PI * fraction) * 1.3 : 0;
  motion.visible = !high || motion.age < roadside.trafficVisibleSeconds;
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
  wreck.roll = wreck.side * Math.min(wreck.rollLimit ?? 1.05, wreck.age * (1 + Math.abs(wreck.spinVelocity) * .5));
}
