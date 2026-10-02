import {COMBAT_TUNING} from '../wasteland-tuning.js';
import {carBodyPoint} from '../arsenal/hazards.js';
import {actorForTarget, targetIdentity} from '../arsenal/targeting.js';
import {actorBody, startKnock, bodyHeading} from '../vehicle-knock.js';
import {outOfPlay, hostile} from '../combat-teams.js';
import {gearDirection, gearContact, enemyCars, fighterTargets,
  damageGearCar, damageGearFighter} from './contacts.js';
import {launchGearProjectile} from './projectiles.js';
import {signatureFor, crewGearEnabled, GEAR_EPSILON} from './gear.js';

export {crewGearEnabled, crewRpgTiming, signatureFor} from './gear.js';
export {stepGearProjectile} from './projectiles.js';

function ready(duel) {
  return crewGearEnabled(duel) && duel.state.status === 'racing' && !duel.state.paused;
}
export function initializeCrewGear(duel) {
  if (!crewGearEnabled(duel)) {delete duel.state.crewGear; return;}
  const gear = signatureFor(duel.state.crewId);
  duel.state.crewGear = {crewId: duel.state.crewId || 'rook', id: gear.id,
    ammo: gear.capacity, serial: 0, fireHeld: false, turret: null, grapple: null};
}
export function refillCrewGear(duel) {
  if (!crewGearEnabled(duel)) return;
  const user = duel.state.crewGear;
  if (!user) return;
  user.ammo = signatureFor(user.crewId).capacity;
  user.grapple = null;
  user.fireHeld = false;
  if (duel.state.footWeapons) duel.state.footWeapons.ammo = COMBAT_TUNING.foot.rpgAmmo;
}
export function showSignatureGear(duel) {
  const user = duel.state.crewGear;
  if (!user || !duel.state.footWeapons || duel.state.footWeapons.selected !== user.id) return;
  const gear = signatureFor(user.crewId);
  duel.state.footGear = {name: gear.name,
    ammo: user.id === 'rpg' ? duel.state.footWeapons.ammo : user.ammo};
}
export function selectSignatureGear(duel) {
  const state = duel.state, user = state.crewGear, weapons = state.footWeapons;
  if (!ready(duel) || !state.onFoot || !state.fighter || !user || !weapons) return false;
  weapons.selected = user.id;
  weapons.lockTargetIndex = null; delete weapons.lockTargetId;
  weapons.lockSeconds = 0;
  weapons.repairing = false; weapons.repairSeconds = weapons.repairAmount = 0;
  weapons.fireHeld = user.fireHeld = !!state.fighterInput.fire;
  showSignatureGear(duel);
  duel.emit({footGearChanged: user.id});
  return true;
}
export function crewFireImmune(duel, fighter) {
  return crewGearEnabled(duel) && fighter?.crewId === 'cinder';
}
function flamer(duel, fighter, gear, dt) {
  const direction = gearDirection(fighter);
  const inside = at => {
    const dx = at.x - fighter.x, dz = at.z - fighter.z;
    const distance = Math.hypot(dx, dz);
    return distance > 0 && distance <= gear.range &&
      Math.abs(at.y - fighter.y - .85) < 2 &&
      (dx * direction.x + dz * direction.z) / distance >= Math.cos(gear.cone / 2);
  };
  const origin = {x: fighter.x, y: fighter.y + 1, z: fighter.z};
  for (const actor of enemyCars(duel)) {
    const at = carBodyPoint(duel, actor);
    if (inside(at) && gearContact(duel, origin, at, duel.state, {fighters: false})?.actor === actor)
      damageGearCar(duel, actor, gear.carDamage * dt, duel.state);
  }
  for (const target of fighterTargets(duel)) {
    const f = target.fighter, at = {x: f.x, y: f.y + .85, z: f.z};
    if (!crewFireImmune(duel, f) && inside(at) &&
        gearContact(duel, origin, at, duel.state)?.target?.fighter === f)
      damageGearFighter(duel, target, gear.fighterDamage * dt, duel.state);
  }
  fighter.flaming = true;
}
function beginGrapple(duel, user, fighter, gear) {
  const direction = gearDirection(fighter), origin = {x: fighter.x,
    y: fighter.y + COMBAT_TUNING.foot.rpgEyeHeight, z: fighter.z};
  const end = {x: origin.x + direction.x * gear.range,
    y: origin.y + direction.y * gear.range, z: origin.z + direction.z * gear.range};
  const hit = gearContact(duel, origin, end, duel.state, {fighters: false});
  let destination;
  if (hit?.actor) {
    const at = carBodyPoint(duel, hit.actor), ground = duel.course.groundAt(hit.actor.s, hit.actor.lateral);
    if (Math.abs(hit.actor.speedMph || 0) * COMBAT_TUNING.armor.kphPerMph >= gear.maximumKph ||
        Math.hypot(at.x - fighter.x, at.z - fighter.z) > gear.range) return false;
    destination = {kind: 'car', targetId: targetIdentity(duel, hit.actor),
      x: at.x, y: ground.y + (hit.actor.airHeight || 0) + duel._vehicleSpec(hit.actor).height, z: at.z};
  } else if (hit?.obstacle?.kind === 'salvageLedge') {
    const ledge = hit.obstacle;
    if (Math.hypot(ledge.x - fighter.x, ledge.z - fighter.z) > gear.range) return false;
    destination = {kind: 'ledge', x: ledge.x, y: ledge.y + ledge.height, z: ledge.z};
  } else return false;
  user.grapple = {...destination, arrived: false};
  duel.emit({crewGearCue: 'crew.grapple.launch', hitPosition: origin});
  return true;
}
export function stepGearGrapple(duel, dt) {
  const user = duel.state.crewGear, fighter = duel.state.fighter, pull = user?.grapple;
  if (!ready(duel) || !duel.state.onFoot || !fighter || !pull || fighter.knockedDown) return;
  if (pull.kind === 'car') {
    const actor = actorForTarget(duel, pull.targetId);
    if (!actor || outOfPlay(duel, actor)) {user.grapple = null; return;}
    const at = duel.course.groundAt(actor.s, actor.lateral);
    pull.x = at.x; pull.z = at.z;
    pull.y = at.y + (actor.airHeight || 0) + duel._vehicleSpec(actor).height;
  }
  const dx = pull.x - fighter.x, dy = pull.y - fighter.y, dz = pull.z - fighter.z;
  const distance = Math.hypot(dx, dy, dz), move = Math.min(1, 25 * dt / Math.max(distance, GEAR_EPSILON));
  fighter.x += dx * move; fighter.y += dy * move; fighter.z += dz * move;
  const near = duel.course.nearest(fighter.x, fighter.z, fighter.s);
  fighter.s = near.s; fighter.lateral = near.lateral;
  fighter.groundY = fighter.y; fighter.airHeight = fighter.verticalSpeed = 0;
  if (move === 1 && !pull.arrived) {
    pull.arrived = true;
    duel.emit({crewGrappleArrived: pull.kind, targetId: pull.targetId,
      hitPosition: {x: fighter.x, y: fighter.y, z: fighter.z}});
    // CREW-03 consumes this actual roof attachment for charge and shake-off.
    // This gear module only follows the attachment; it creates neither rule.
    if (pull.kind === 'ledge') user.grapple = null;
  }
}
function deployTurret(duel, user, fighter, gear) {
  if (user.turret) return false;
  const near = duel.course.nearest(fighter.x, fighter.z, fighter.s);
  const at = duel.course.groundAt(near.s, near.lateral);
  user.turret = {id: `crew-turret-${duel.state.stageIndex}-${++user.serial}`,
    x: at.x, y: at.y, z: at.z, health: gear.health, maxHealth: gear.health,
    age: 0, shotSeconds: 0, ownerId: 'player'};
  duel.emit({crewGearCue: 'crew.turret.deploy', turret: user.turret, hitPosition: at});
  return true;
}
export function damageGearTurret(duel, turret, amount, attacker) {
  const active = duel.state.crewGear?.turret;
  if (!ready(duel) || turret !== active || !(Number.isFinite(amount) && amount > 0) ||
      !hostile(duel, attacker, duel.state) || !(turret.health > 0)) return 0;
  const removed = Math.min(turret.health, amount);
  turret.health -= removed;
  if (turret.health <= 0) retireTurret(duel);
  return removed;
}
function retireTurret(duel) {
  const user = duel.state.crewGear, turret = user?.turret;
  if (!turret) return;
  user.turret = null;
  duel.state.footWeapons.nextFireAt = duel.state.stageTimeSec + signatureFor(user.crewId).recharge;
  duel.emit({crewGearCue: 'crew.turret.retire', hitPosition: {x: turret.x, y: turret.y, z: turret.z}});
}
export function stepGearDeployables(duel, dt) {
  const user = duel.state.crewGear, turret = user?.turret;
  if (!ready(duel) || !turret || !(dt > 0)) return;
  const gear = signatureFor(user.crewId);
  const liveTime = Math.max(0, Math.min(dt, gear.lifetime - turret.age));
  turret.age += dt; turret.shotSeconds += liveTime;
  while (turret.shotSeconds + GEAR_EPSILON >= gear.cadence) {
    turret.shotSeconds = Math.max(0, turret.shotSeconds - gear.cadence);
    let chosen = null, distance = gear.range + GEAR_EPSILON;
    const candidates = enemyCars(duel).map(actor => ({actor, at: carBodyPoint(duel, actor)}));
    for (const target of fighterTargets(duel)) candidates.push({target,
      at: {x: target.fighter.x, y: target.fighter.y + .85, z: target.fighter.z}});
    for (const candidate of candidates) {
      const range = Math.hypot(candidate.at.x - turret.x, candidate.at.z - turret.z);
      if (range <= gear.range && range < distance) {chosen = candidate; distance = range;}
    }
    if (chosen) {
      const contact = gearContact(duel, {x: turret.x, y: turret.y + .85, z: turret.z}, chosen.at, duel.state);
      if (chosen.actor && contact?.actor === chosen.actor)
        damageGearCar(duel, chosen.actor, gear.carDamage, duel.state);
      else if (chosen.target && contact?.target?.fighter === chosen.target.fighter)
        damageGearFighter(duel, chosen.target, gear.fighterDamage, duel.state);
      turret.targetId = chosen.actor ? targetIdentity(duel, chosen.actor) : chosen.target.fighter.id;
      duel.emit({crewGearCue: 'crew.turret.fire', turret, hitPosition: {x: turret.x, y: turret.y, z: turret.z}});
    }
  }
  if (turret.age + GEAR_EPSILON >= gear.lifetime) retireTurret(duel);
}
function tuskPush(duel, fighter, input) {
  if (!input.forward) return;
  const direction = gearDirection(fighter);
  for (const actor of [duel.state, ...duel.state.opponents]) {
    if (outOfPlay(duel, actor)) continue;
    const body = actorBody(duel, actor);
    if (Math.hypot(body.vx, body.vz) > 1.1) continue;
    const dx = fighter.x - body.x, dz = fighter.z - body.z;
    const across = Math.abs(dx * Math.cos(body.heading) - dz * Math.sin(body.heading));
    const along = Math.abs(dx * Math.sin(body.heading) + dz * Math.cos(body.heading));
    if (across > body.halfWidth + .5 || along > body.halfLength + .5 ||
        dx * direction.x + dz * direction.z > 0) continue;
    startKnock(actor, {vx: Math.sin(fighter.yaw), vz: Math.cos(fighter.yaw), spin: 0,
      severity: 'nudge', heading: bodyHeading(duel, actor), player: actor === duel.state,
      arenaShove: !!duel.state.arena});
  }
}

// Called after the native fixed-time fighter movement. RPG and wrench keep
// their existing path; this returns true only when signature fire is selected.
export function stepSignatureGear(duel, dt) {
  const state = duel.state, user = state.crewGear, fighter = state.fighter, weapons = state.footWeapons;
  if (!ready(duel) || !state.onFoot || !user || !fighter || !weapons || !(dt > 0)) return false;
  const gear = signatureFor(user.crewId), input = state.fighterInput;
  const wasFlaming = fighter.flaming === true;
  fighter.flaming = false;
  if (user.crewId === 'tusk' && !fighter.knockedDown) tuskPush(duel, fighter, input);
  const selected = weapons.selected === gear.id && gear.id !== 'rpg';
  fighter.gearMagnification = selected && gear.id === 'marksman' && input.aim ? gear.magnification : 1;
  if (gear.id === 'hand-flamer' && (!selected || !input.fire || fighter.knockedDown))
    user.ammo = Math.min(gear.capacity, user.ammo + gear.refill * dt);
  if (!selected) {
    if (wasFlaming) duel.emit({crewGearCue: 'crew.flamer.stop', hitPosition: fighter});
    user.fireHeld = !!input.fire; return false;
  }
  const available = !fighter.knockedDown && !(fighter.bailTumbleSeconds > 0);
  if (gear.id === 'hand-flamer') {
    if (available && input.fire && user.ammo > 0) {
      const burn = Math.min(dt, user.ammo);
      if (!user.fireHeld) duel.emit({crewGearCue: 'crew.flamer.start', hitPosition: fighter});
      flamer(duel, fighter, gear, burn); user.ammo = Math.max(0, user.ammo - burn);
    }
  } else if (available && input.fire && !user.fireHeld &&
      state.stageTimeSec + GEAR_EPSILON >= weapons.nextFireAt && (user.ammo === null || user.ammo > 0)) {
    let fired;
    if (gear.id === 'grapple') fired = beginGrapple(duel, user, fighter, gear);
    else if (gear.id === 'scrap-turret') fired = deployTurret(duel, user, fighter, gear);
    else fired = !!launchGearProjectile(duel, fighter, gear, ++user.serial);
    if (fired) {
      if (user.ammo !== null) user.ammo--;
      weapons.lastFireAt = state.stageTimeSec;
      weapons.nextFireAt = state.stageTimeSec + (gear.recharge || gear.reload || .3);
      duel.emit({footWeaponFired: gear.id, crewGearCue: `crew.${gear.id}.fire`, hitPosition: fighter});
    }
  }
  if (wasFlaming && !fighter.flaming)
    duel.emit({crewGearCue: 'crew.flamer.stop', hitPosition: fighter});
  user.fireHeld = !!input.fire;
  showSignatureGear(duel);
  return true;
}
