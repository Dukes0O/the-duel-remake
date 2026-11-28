// HOME-GROUND-4: connect the home rule's poses to the existing Rat hit bodies.
// No save, timer, raid outcome or random choice belongs to this adapter.
import {createRaidZones} from '../../raiders.js';
import {scablandsSurfaceHeightAt} from '../../world/scablands-ground.js';
import {homeTowerPose} from '../../world/open/home-raid-rule.js';
import {buildingDoor, powerStrength, outsideGarlic} from '../../world/open/home-rule.js';
import {LAND_SITES} from '../../world/open/content/sites.js';
import {sitePosition} from '../../world/open/site-rule.js';
import {SCABLANDS_PLACES} from '../../world/scablands.js';
import {stepMover, FOOT_GRADE} from '../../world/scablands-movers.js';
import {selectFootGear} from '../../onfoot-weapons.js';
import {DRIVE} from '../../config.js';
import {wrapHeading} from '../../offroad-physics.js';

// Borrowed rig only: the machine solver owns its tracks. The car keeps contacts, entry and exit, and its HUD.
export function prepareHomeDrillControls(duel, world, input) {
  if (world.definition.id !== 'open-roam' || !['drill', 'excavator'].includes(world.vehicle?.id) ||
      duel.featureFlags?.enabled?.('home-ground') !== true || duel.state.onFoot) return false;
  world.homeDrillKeys = {...(world.vehicle.id === 'excavator' ? input.homeDiggerKeys : {}), KeyW: input.throttle > 0, KeyS: input.brake > 0,
    KeyA: input.steer < 0, KeyD: input.steer > 0, Space: input.boost === true, KeyB: world.homeDrillToggle === true};
  world.homeDrillToggle = false;
  Object.assign(input, {throttle: 0, brake: 0, steer: 0, boost: false});
  Object.assign(duel.state, {speedMph: 0, pushVelocity: 0, reverseHoldSec: 0, boost: 0});
  return true;
}

export function syncHomeGround(duel, world, dt = 0) {
  const state = duel.state, home = world.open?.parts.home;
  if (!home?.on) {
    if (state.fighter) delete state.fighter.homeIronStrength;
    return;
  }
  world.updateHomeGround?.(world.open.world.open.home);
  if (state.fighter) state.fighter.homeIronStrength = powerStrength(home.powers?.ironBeets);
  const defender = state.onFoot && state.fighter;
  const garlic = defender && !defender.knockedDown ? powerStrength(home.powers?.stinkGarlic) : 0;
  if (garlic > 0 && dt > 0) for (const actor of world.actors ?? []) {
    if (actor.homeRaid || actor.knockedDown || actor.health <= 0 || !Number.isFinite(actor.x)) continue;
    const aim = outsideGarlic(actor, actor, defender, garlic, 3, dt);
    if (aim === actor) continue;
    const moved = stepMover(actor, aim, {radius: .4, grade: FOOT_GRADE, grid: world.solidGrid});
    const near = duel.course.nearest(moved.x, moved.z, actor.s);
    Object.assign(actor, {x: moved.x, y: moved.y, z: moved.z, groundY: moved.y, s: near.s, lateral: near.lateral,
      yaw: Math.atan2(moved.x - defender.x, moved.z - defender.z)});
    if (actor.search) actor.search = {...actor.search, phase: 'returning', last: null};
  }
  // Existing no-fog, through-cover lights make living raiders readable in the dark.
  const sight = defender && !defender.knockedDown ? powerStrength(home.powers?.nightCarrots) : 0;
  const marks = sight > 0 ? [...(world.actors ?? []).filter(actor => !actor.knockedDown && actor.health > 0)
    .map(actor => ({id: actor.id, x: actor.x, y: actor.y + 1, z: actor.z, raider: true})),
    ...LAND_SITES.map(site => ({id: site.id, ...sitePosition(site.id, world.open.world.open.landSeed)})),
    ...SCABLANDS_PLACES]
    .filter(row => Number.isFinite(row.x) && Math.hypot(row.x - defender.x, row.z - defender.z) <= 1500 * sight)
    .map(row => ({id: 'home-sight/' + row.id, kind: 'light', x: row.x, z: row.z,
      y: row.y ?? scablandsSurfaceHeightAt(row.x, row.z) + 2, radius: row.raider ? 1.3 : 3})) : [];
  if (state.arena) state.arena.markers = [...(state.arena.markers ?? []).filter(row => !String(row.id).startsWith('home-sight/')), ...marks];
  const machine = world.vehicle?.id === 'excavator' ? home.digger?.machine : world.vehicle?.id === 'drill' ? home.drillRig?.machine : null;
  if (!state.onFoot && !state.combatWrecking && machine) {
    const pose = machine, near = duel.course.nearest(pose.x, pose.z, state.s);
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
