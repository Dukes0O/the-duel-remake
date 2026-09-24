import {combatArmorEnabled} from './combat-armor.js';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import {crewPerks} from './crew.js';

const T = COMBAT_TUNING.foot;
const EPSILON = 1e-8;
const GEAR = Object.freeze({1: 'rpg', 2: 'wrench'});
const length = (x, y, z) => Math.hypot(x, y, z);

function showGear(state) {
  const weapons = state.footWeapons;
  state.footGear = weapons.selected === 'wrench'
    ? {name: 'WRENCH', ammo: null}
    : {name: 'LONGHORN RPG', ammo: weapons.ammo};
}

export function initializeFootWeapons(duel) {
  const state = duel.state;
  if (!combatArmorEnabled(duel)) {
    delete state.footWeapons;
    delete state.footGear;
    return;
  }
  state.footWeapons = {
    selected: 'rpg', ammo: T.rpgAmmo, nextFireAt: 0, serial: 0,
    lockTargetIndex: null, lockSeconds: 0, fireHeld: false,
    repairing: false, repairSeconds: 0, repairAmount: 0,
    repairBlockedUntilRelease: false,
    lastHealth: null, lastArmor: state.armor,
    lastX: null, lastZ: null,
  };
  showGear(state);
}

export function resetFootWeaponUser(duel) {
  const state = duel.state, weapons = state.footWeapons;
  if (!weapons || !state.fighter) return;
  weapons.lockTargetIndex = null;
  weapons.lockSeconds = 0;
  weapons.fireHeld = false;
  weapons.repairing = false;
  weapons.repairSeconds = weapons.repairAmount = 0;
  weapons.repairBlockedUntilRelease = !!state.fighterInput.fire;
  weapons.lastHealth = state.fighter.health;
  weapons.lastArmor = state.armor;
  weapons.lastX = state.fighter.x;
  weapons.lastZ = state.fighter.z;
  showGear(state);
}

export function selectFootGear(duel, slot) {
  const state = duel.state, weapons = state.footWeapons;
  const selected = GEAR[slot];
  if (!state.onFoot || !weapons || !selected ||
      state.status !== 'racing' || state.paused) return false;
  if (weapons.selected === selected) return true;
  const repairWasInterrupted = weapons.repairBlockedUntilRelease;
  weapons.selected = selected;
  weapons.lockTargetIndex = null;
  weapons.lockSeconds = 0;
  weapons.repairing = false;
  weapons.repairSeconds = weapons.repairAmount = 0;
  weapons.repairBlockedUntilRelease = repairWasInterrupted &&
    !!state.fighterInput.fire;
  weapons.fireHeld = !!state.fighterInput.fire;
  showGear(state);
  duel.emit({footGearChanged: selected});
  return true;
}

function aimDirection(fighter) {
  const yaw = fighter.yaw || 0, pitch = fighter.pitch || 0;
  return {x: Math.sin(yaw) * Math.cos(pitch),
    y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch)};
}

function viableTarget(actor) {
  return actor && !actor.finished && !actor.crushed && !actor.combatWrecking &&
    Number.isFinite(actor.s) && Number.isFinite(actor.lateral);
}

function aimedCar(duel, fighter, direction) {
  let chosen = null, best = Infinity;
  const eyeY = fighter.y + T.rpgEyeHeight;
  const lockRange=T.rpgLockRange *
    (crewPerks(fighter.crewId).lockRangeMultiplier || 1);
  duel.state.opponents.forEach((actor, index) => {
    if (!viableTarget(actor)) return;
    const point = duel.course.groundAt(actor.s, actor.lateral);
    const dx = point.x - fighter.x, dy = point.y + 1 - eyeY,
      dz = point.z - fighter.z;
    const distance = length(dx, dy, dz);
    if (!(distance > 0) || distance > lockRange) return;
    const alignment = (dx * direction.x + dy * direction.y +
      dz * direction.z) / distance;
    if (alignment < Math.cos(T.rpgLockConeRadians)) return;
    const score = (1 - alignment) * lockRange + distance * 0.001;
    if (score < best) {best = score; chosen = index;}
  });
  return chosen;
}

function advanceLock(duel, fighter, weapons, input, dt, direction) {
  const target = input.aim ? aimedCar(duel, fighter, direction) : null;
  if (target === null) {
    weapons.lockTargetIndex = null;
    weapons.lockSeconds = 0;
  } else if (target === weapons.lockTargetIndex) {
    weapons.lockSeconds = Math.min(T.rpgLockSeconds, weapons.lockSeconds + dt);
  } else {
    weapons.lockTargetIndex = target;
    weapons.lockSeconds = Math.min(T.rpgLockSeconds, dt);
  }
}

function launchRpg(duel, weapons, fighter, dt, direction) {
  const state = duel.state;
  if (weapons.ammo <= 0 || state.stageTimeSec + EPSILON < weapons.nextFireAt ||
      state.combat.projectiles.length >= COMBAT_TUNING.projectileLimit) return false;
  const movingX = weapons.lastX == null ? 0 : (fighter.x - weapons.lastX) / dt;
  const movingZ = weapons.lastZ == null ? 0 : (fighter.z - weapons.lastZ) / dt;
  const serial = ++weapons.serial;
  const targetIndex = weapons.lockSeconds + EPSILON >= T.rpgLockSeconds
    ? weapons.lockTargetIndex : null;
  const lockRangeMultiplier = Math.min(1.25, Math.max(1,
    crewPerks(fighter.crewId).lockRangeMultiplier || 1));
  state.combat.projectiles.push({
    kind: 'rpg', owner: 'player', id: `rpg-${state.stageIndex}-${serial}`,
    x: fighter.x + direction.x * T.rpgMuzzleOffset,
    y: fighter.y + T.rpgEyeHeight + direction.y * T.rpgMuzzleOffset,
    z: fighter.z + direction.z * T.rpgMuzzleOffset,
    launchX: fighter.x, launchZ: fighter.z,
    vx: direction.x * T.rpgSpeed + movingX,
    vy: direction.y * T.rpgSpeed,
    vz: direction.z * T.rpgSpeed + movingZ,
    age: 0,
    splashRadius: T.rpgSplashRadius *
      (crewPerks(fighter.crewId).blastRadiusMultiplier || 1),
    targetIndex,
    lifetimeSeconds: targetIndex === null ? T.rpgLifetimeSeconds
      : T.rpgLifetimeSeconds * lockRangeMultiplier,
  });
  weapons.ammo--;
  weapons.lastFireAt = state.stageTimeSec;
  weapons.nextFireAt = state.stageTimeSec + T.rpgReloadSeconds;
  showGear(state);
  duel.emit({weaponFired: 'rpg', footWeaponFired: 'rpg'});
  return true;
}

function carDistance(duel, fighter) {
  const car = duel.course.groundAt(duel.state.s, duel.state.lateral);
  return length(fighter.x - car.x, fighter.y - car.y, fighter.z - car.z);
}

function stepWrench(duel, weapons, fighter, input, dt, hit) {
  const state = duel.state;
  const repairSeconds=T.wrenchRepairSeconds /
    (crewPerks(fighter.crewId).repairRateMultiplier || 1);
  if (!input.fire) {
    if (weapons.repairing) duel.emit({footRepairInterrupted: true});
    weapons.repairing = false;
    weapons.repairSeconds = weapons.repairAmount = 0;
    weapons.repairBlockedUntilRelease = false;
    return;
  }
  if (hit || fighter.knockedDown || state.combatWrecking ||
      carDistance(duel, fighter) > T.repairRangeMeters) {
    if (weapons.repairing) duel.emit({footRepairInterrupted: true});
    weapons.repairing = false;
    weapons.repairBlockedUntilRelease = true;
    return;
  }
  if (weapons.repairBlockedUntilRelease ||
      !(state.armor < state.maxArmor)) return;
  if (!weapons.repairing) {
    weapons.repairing = true;
    weapons.repairSeconds = weapons.repairAmount = 0;
    duel.emit({footRepairStarted: true});
  }
  const restored = Math.min(T.wrenchRepairAmount - weapons.repairAmount,
    T.wrenchRepairAmount / repairSeconds * dt,
    state.maxArmor - state.armor);
  if (restored > 0) {
    state.armor += restored;
    weapons.repairAmount += restored;
  }
  weapons.repairSeconds += dt;
  if (weapons.repairSeconds + EPSILON >= repairSeconds ||
      weapons.repairAmount + EPSILON >= T.wrenchRepairAmount ||
      state.armor + EPSILON >= state.maxArmor) {
    weapons.repairing = false;
    weapons.repairBlockedUntilRelease = true;
    duel.emit({footRepairCompleted: true, armorRestored: weapons.repairAmount});
  }
}

export function stepFootWeapons(duel, dt) {
  const state = duel.state, fighter = state.fighter, weapons = state.footWeapons;
  if (!state.onFoot || !fighter || !weapons || !combatArmorEnabled(duel) ||
      state.status !== 'racing' || state.paused || !(dt > 0)) return;
  const input = state.fighterInput;
  const hit = fighter.knockedDown ||
    weapons.lastHealth !== null && fighter.health < weapons.lastHealth - EPSILON ||
    state.armor < weapons.lastArmor - EPSILON;
  const direction = aimDirection(fighter);
  if (weapons.selected === 'rpg' && !fighter.knockedDown &&
      !(fighter.bailTumbleSeconds > 0)) {
    advanceLock(duel, fighter, weapons, input, dt, direction);
    if (input.fire && !weapons.fireHeld)
      launchRpg(duel, weapons, fighter, dt, direction);
  } else {
    weapons.lockTargetIndex = null;
    weapons.lockSeconds = 0;
    if (weapons.selected === 'wrench') stepWrench(duel, weapons, fighter,
      input, dt, hit || fighter.bailTumbleSeconds > 0);
  }
  weapons.fireHeld = !!input.fire;
  weapons.lastHealth = fighter.health;
  weapons.lastArmor = state.armor;
  weapons.lastX = fighter.x;
  weapons.lastZ = fighter.z;
}
