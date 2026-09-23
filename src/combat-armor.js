import {COMBAT_TUNING} from './wasteland-tuning.js';

const T = COMBAT_TUNING.armor;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function maxArmorForMass(mass) {
  const safeMass = Number.isFinite(mass) && mass > 0 ? mass : T.referenceMass;
  return T.base * clamp(Math.sqrt(safeMass / T.referenceMass),
    T.minimumMassScale, T.maximumMassScale);
}

export function armorDamageFor(source, {
  level = 0, distanceFraction = 0, relativeKph = 0,
  spiked = false,
} = {}) {
  const upgrade = 1 + clamp(level, 0, T.maximumWeaponLevel) * T.upgradePerLevel;
  switch (source) {
    case 'crossbow': return T.crossbow * upgrade;
    case 'bomb': return T.bomb * (1 - clamp(distanceFraction, 0, 1)) * upgrade;
    case 'rocket': return T.rocket * upgrade;
    case 'rpg-direct': return T.rpgDirect * upgrade;
    case 'rpg-splash': return T.rpgSplash * upgrade;
    case 'ram': return relativeKph > T.ramThresholdKph
      ? Math.min(T.maximumRamDamage, relativeKph * T.ramDamagePerKph *
        (spiked ? T.spikedRamMultiplier : 1)) * upgrade
      : 0;
    case 'scenery': return T.scenery;
    default: return 0;
  }
}

export function combatArmorEnabled(duel) {
  return duel.state.mode === 'wasteland' && !!duel.state.combat &&
    duel.featureFlags?.enabled('wasteland2') === true;
}

export function initializeCombatArmor(duel) {
  // A new stage starts new unordered car-pair contact incidents.
  duel._combatRamIncidents = combatArmorEnabled(duel) ? new Set() : null;
  if (!duel._combatRamIncidents) return;
  for (const actor of [duel.state, ...duel.state.opponents]) {
    actor.maxArmor = maxArmorForMass(duel._vehicleSpec(actor).mass);
    actor.armor = actor.maxArmor;
    actor.combatWrecking = false;
    actor.combatWreckTimer = 0;
    actor.combatWreckSite = null;
  }
}

export function combatShielded(duel, actor) {
  const state = duel.state;
  if (actor === state) return state.combat.shield > 0 || state.invulnerableSec > 0;
  if (actor === state.rival) return state.combat.rivalShield > 0;
  return (actor.combatShield || 0) > 0;
}

function startCombatWreck(duel, actor, source) {
  const state = duel.state;
  const player = actor === state;
  const opponentIndex = player ? -1 : state.opponents.indexOf(actor);
  const point = duel.course.groundAt(actor.s, actor.lateral);
  actor.armor = 0;
  actor.combatWrecking = true;
  actor.combatWreckTimer = T.wreckDuration;
  actor.impactTimer = T.wreckDuration;
  actor.combatWreckSite = {
    s: actor.s, lateral: actor.lateral, headingError: actor.headingError || 0,
  };
  actor.speedMph = 0;
  actor.pushVelocity = 0;
  actor.boosting = false;
  if (player) {
    state.impactTimer = state.impactDuration = T.wreckDuration;
    state.impactStrength = 1;
    state.impactSide = Math.sign(state.lateral) || 1;
    state.crashFlash = T.wreckFlashSeconds;
    state.invulnerableSec = Math.max(state.invulnerableSec,
      T.wreckDuration + T.recoveryGraceSeconds);
    duel._callout('WRECKED / RECOVERING', T.wreckDuration);
  }
  const hitPosition = {x: point.x, y: point.y, z: point.z};
  duel.emit({combatWreck: true, victim: player ? 'player' : 'rival',
    ...(player ? {} : {opponentIndex}), source, hitPosition});
  if (source !== 'bomb') duel.emit({combatExplosion: true, hitPosition});
}

export function applyArmorDamage(duel, actor, source, options = {}) {
  const state = duel.state;
  if (!combatArmorEnabled(duel) ||
      actor !== state && !state.opponents.includes(actor) ||
      actor.finished || actor.crushed || actor.combatWrecking ||
      combatShielded(duel, actor)) return 0;
  const base = armorDamageFor(source, options);
  const factor = options.self ? T.maximumSelfDamageFraction : 1;
  const damage = Math.min(T.maximumHitDamage, Math.max(0, base * factor));
  if (!(damage > 0)) return 0;
  const removed = Math.min(Math.max(0, actor.armor), damage);
  actor.armor = Math.max(0, actor.armor - damage);
  if (actor.armor === 0) startCombatWreck(duel, actor, source);
  return removed;
}

export function applyRamArmorDamage(duel, actor, relativeMph, options = {}) {
  return applyArmorDamage(duel, actor, 'ram',
    {...options, relativeKph: Math.max(0, relativeMph) * T.kphPerMph});
}

export function applySceneryArmorDamage(duel, actor) {
  return applyArmorDamage(duel, actor, 'scenery');
}

export function completeCombatRecovery(duel, actor, {alreadyReset = false} = {}) {
  if (!actor.combatWrecking) return false;
  if (!alreadyReset) duel._safeReset(actor, actor.combatWreckSite);
  actor.armor = actor.maxArmor * T.recoveryArmorFraction;
  actor.combatWrecking = false;
  actor.combatWreckTimer = 0;
  actor.impactTimer = 0;
  actor.combatWreckSite = null;
  actor.combatTerrainIncident = null;
  actor.speedMph = T.recoverySpeedMph;
  actor.damageCooldown = Math.max(actor.damageCooldown || 0, T.recoveryGraceSeconds);
  actor.contactCooldown = Math.max(actor.contactCooldown || 0, T.recoveryGraceSeconds);
  const player = actor === duel.state;
  const opponentIndex = player ? -1 : duel.state.opponents.indexOf(actor);
  duel.emit({combatRecovered: true, victim: player ? 'player' : 'rival',
    ...(player ? {} : {opponentIndex})});
  return true;
}
