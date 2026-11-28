// HOME-GROUND-4: connect the home rule's poses to the existing Rat hit bodies.
// No save, timer, raid outcome or random choice belongs to this adapter.
import {createRaidZones} from '../../raiders.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {homeTowerPose} from '../../world/open/home-raid-rule.js';
import {buildingDoor} from '../../world/open/home-rule.js';
import {selectFootGear} from '../../onfoot-weapons.js';
import {DRIVE} from '../../config.js';
import {wrapHeading} from '../../offroad-physics.js';

// Borrowed rig only: the machine solver owns its tracks. The car keeps contacts, entry and exit, and its HUD.
export function prepareHomeDrillControls(duel, world, input) {
  if (world.definition.id !== 'open-roam' || world.vehicle?.id !== 'drill' ||
      duel.featureFlags?.enabled?.('home-ground') !== true || duel.state.onFoot) return false;
  world.homeDrillKeys = {KeyW: input.throttle > 0, KeyS: input.brake > 0,
    KeyA: input.steer < 0, KeyD: input.steer > 0, Space: input.boost === true, KeyB: world.homeDrillToggle === true};
  world.homeDrillToggle = false;
  Object.assign(input, {throttle: 0, brake: 0, steer: 0, boost: false});
  Object.assign(duel.state, {speedMph: 0, pushVelocity: 0, reverseHoldSec: 0, boost: 0});
  return true;
}

export function syncHomeGround(duel, world) {
  const state = duel.state, home = world.open?.parts.home;
  if (!home?.on) return;
  if (!state.onFoot && !state.combatWrecking && world.vehicle?.id === 'drill' && home.drillRig) {
    const pose = home.drillRig.machine, near = duel.course.nearest(pose.x, pose.z, state.s);
    Object.assign(state, {s: near.s, lateral: near.lateral,
      headingError: wrapHeading(pose.heading - duel.course.at(near.s).heading), speedMph: pose.speedMps / DRIVE.mphToWorld,
      groundHeight: scablandsSurfaceHeightAt(pose.x, pose.z)});
  }
  const raid = home.raid;
  if (world.homeRaidZone && world.homeRaidZone.id !== raid?.id) {
    const old = world.homeRaidZone;
    state.raids.zones = state.raids.zones.filter(zone => zone !== old);
    world.actors = world.actors.filter(actor => !old.raiders.includes(actor));
    delete world.homeRaidZone;
  }
  if (raid && !world.homeRaidZone) {
    const zone = createRaidZones(duel.course, world.open.world.seed)[0];
    const prototype = zone.raiders[0];
    Object.assign(zone, {id: raid.id, warning: null, salvage: null, nextShotAt: Infinity, warnedLap: state.currentLap});
    zone.raiders = raid.riders.map(row => ({...prototype, id: row.id, ambushKey: raid.id,
      homeRaid: true, health: row.health, knockedDown: false, knockdownRemaining: 0,
      knockdownCounted: true, knockdownAwarded: true}));
    // A home raid leaves its loot to HOME-GROUND-4B. These bodies supply only combat contacts.
    state.raids ??= {zones: [], shots: 0};
    state.raids.zones.push(zone);
    world.actors.push(...zone.raiders);
    world.homeRaidZone = zone;
  }
  if (raid) for (const row of raid.riders) {
    const actor = world.homeRaidZone.raiders.find(body => body.id === row.id);
    const {x, z} = row.position, y = scablandsSurfaceHeightAt(x, z), near = duel.course.nearest(x, z);
    Object.assign(actor, {x, y, z, yaw: row.yaw, s: near.s, lateral: near.lateral,
      health: Math.min(actor.health, row.health), knockedDown: row.health <= 0 || row.fled});
    delete actor.groundY;
  }
  const fighter = state.onFoot ? state.fighter : null;
  if (fighter && (home.tower || world.homeTower)) {
    const pose = home.tower ? homeTowerPose(home.tower) : buildingDoor(world.homeTower.row);
    const y = home.tower ? pose.y : scablandsSurfaceHeightAt(pose.x, pose.z);
    const near = duel.course.nearest(pose.x, pose.z, fighter.s);
    Object.assign(fighter, {x: pose.x, y, z: pose.z, groundY: y, s: near.s, lateral: near.lateral,
      airHeight: 0, verticalSpeed: 0, speed: 0});
    if (home.tower && !world.homeTower) selectFootGear(duel, 1);
  }
  world.homeTower = home.tower;
}
