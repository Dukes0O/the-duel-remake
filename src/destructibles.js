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
