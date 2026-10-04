import {makeRng} from '../../rng.js';
import {createRaidZones} from '../../raiders.js';
import {createFighter, FIGHTER_RULES} from '../../onfoot.js';
import {COMBAT_TUNING} from '../../wasteland-tuning.js';
import {sweepObstacle} from '../../collision.js';

export const AMBUSH_RULES = Object.freeze({
  rank: 12, timeLimitSec: Infinity, suddenDeathSec: 0, maxOpponents: 1,
  waveCounts: Object.freeze([3, 4, 5, 6, 8]), gapSec: 10,
  fortHealth: 300, wearRangeMetres: 10, wearPerSecond: 5,
  repairAmount: 40, repairSeconds: 4, scrapPerWave: 60,
  fullWinScrap: 150, holdPerWave: 5, spawnClearMetres: 60,
});

const BODY = {halfWidth: FIGHTER_RULES.radius,
  halfLength: FIGHTER_RULES.radius, height: FIGHTER_RULES.height};
const SALT = 0x616d6275;
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const native = duel => duel.state.arena?.mode === 'ambush-alley'
  ? duel.state.arena.ambushAlley : null;

function poseAt(course, s, lateral) {
  s = course.phase(s);
  return {...course.groundAt(s, lateral), s, lateral};
}

function clearPose(course, pose, body = BODY, extra = []) {
  return pose.y > FIGHTER_RULES.seaLevel &&
    Math.abs(pose.lateral) <= course.def.scrapdome.wallOffset - body.halfWidth &&
    ![...course.features.obstacles, ...extra].some(obstacle =>
      sweepObstacle(pose, pose, obstacle, pose.heading, body));
}

// The oval has no perfectly straight segment. Its longest low-curvature run
// sits between adjacent curvature peaks; use that run's native sample midpoint.
function straightMidpoint(course) {
  const samples = course.samples.slice(0, -1), count = samples.length;
  const peaks = samples.flatMap((sample, index) => {
    const value = Math.abs(sample.curvature);
    return value > Math.abs(samples[(index + count - 1) % count].curvature) &&
      value >= Math.abs(samples[(index + 1) % count].curvature) ? [index] : [];
  });
  if (!peaks.length) throw new Error('Ambush Alley needs a native low-curvature run.');
  let best = null;
  for (let index = 0; index < peaks.length; index++) {
    const start = samples[peaks[index]].s;
    const end = samples[peaks[(index + 1) % peaks.length]].s;
    const length = course.phase(end - start) || course.length;
    const midpoint = course.phase(start + length / 2);
    const run = samples.filter(sample => course.phase(sample.s - start) < length);
    const low = run.reduce((minimum, sample) =>
      Math.abs(sample.curvature) < Math.abs(minimum.curvature) - 1e-12 ||
      Math.abs(Math.abs(sample.curvature) - Math.abs(minimum.curvature)) <= 1e-12 &&
      Math.abs(sample.s - midpoint) < Math.abs(minimum.s - midpoint) ? sample : minimum);
    if (!best || length > best.length + 1e-9) best = {length, s: low.s};
  }
  return best.s;
}

function scrapCover(course, index, pose, heading) {
  return {id: `ambush-fort-cover-${index + 1}`, kind: 'prop', shape: 'box',
    ambushFort: true, theme: 'arena', s: pose.s, off: pose.lateral,
    x: pose.x, y: pose.y, z: pose.z, heading,
    halfX: 1.06, halfZ: 2.25, height: 1.3};
}

function fortLayout(duel) {
  const course = duel.course;
  if (course.def.id === 'pit') {
    const radius = course.def.pit.pileRadius + 8;
    const cover = Array.from({length: 8}, (_, index) => {
      const s = course.length * (index + .5) / 8;
      const pose = poseAt(course, s, radius - course.def.pit.radius);
      return scrapCover(course, index, pose, pose.heading);
    });
    const fort = {x: 0, y: 0, z: 0, s: 0, lateral: -course.def.pit.radius,
      health: AMBUSH_RULES.fortHealth, maxHealth: AMBUSH_RULES.fortHealth, cover,
      core: course.features.obstacles.find(obstacle => obstacle.id === 'pit-centre-pile')};
    const park = poseAt(course, course.length / 8,
      course.def.pit.pileRadius + 4 - course.def.pit.radius);
    const fighter = poseAt(course, course.length / 8,
      course.def.pit.pileRadius + 6 - course.def.pit.radius);
    return {fort, park, fighter};
  }
  const s = straightMidpoint(course), at = poseAt(course, s, 0);
  const cover = [[-8, -10], [8, -10], [-8, 10], [8, 10]].map(([ds, lateral], index) => {
    const pose = poseAt(course, s + ds, lateral);
    return scrapCover(course, index, pose, pose.heading);
  });
  return {fort: {...at, health: AMBUSH_RULES.fortHealth,
    maxHealth: AMBUSH_RULES.fortHealth, cover},
  park: poseAt(course, s, 5), fighter: poseAt(course, s, 2)};
}

function indexCover(course, cover) {
  // Course-instance collision only: saved venues and world signatures stay exact.
  course.features.obstacles.push(...cover);
  for (let bucket = 0; bucket < course.bucketCount; bucket++) {
    if (!course.obstacleBuckets.has(bucket)) course.obstacleBuckets.set(bucket, []);
    course.obstacleBuckets.get(bucket).push(...cover);
  }
}

export function ambushSpawnPlan(duel, wave = native(duel)?.wave) {
  const alley = native(duel), course = duel.course;
  if (!alley || !Number.isInteger(wave) || wave < 1 || wave > 5) return null;
  const rng = makeRng((duel.seed ^ SALT ^ Math.imul(wave, 0x45d9f3b)) >>> 0);
  const count = AMBUSH_RULES.waveCounts[wave - 1], groups = [[], []];
  if (course.def.id === 'pit') {
    const turn = rng.range(0, course.length);
    for (let index = 0; index < 24; index++) {
      const pose = poseAt(course, turn + index / 24 * course.length,
        course.def.pit.wallRadius - 9 - course.def.pit.radius);
      if (clearPose(course, pose) && distance(pose, alley.fort) >= AMBUSH_RULES.spawnClearMetres)
        groups[index < 12 ? 0 : 1].push(pose);
    }
  } else {
    for (const [group, direction] of [-1, 1].entries()) {
      const shift = rng.range(0, 8);
      for (const along of [76, 84, 92, 100, 108]) for (const lateral of [0, -5, 5, -9, 9]) {
        const pose = poseAt(course, alley.fort.s + direction * (along + shift), lateral);
        if (clearPose(course, pose) && distance(pose, alley.fort) >= AMBUSH_RULES.spawnClearMetres)
          groups[group].push(pose);
      }
    }
  }
  const fighters = [];
  for (let index = 0; index < count; index++) {
    const group = groups[index % 2];
    const at = group.find(pose => fighters.every(other => distance(pose, other) > 2));
    if (!at) throw new Error('Ambush Alley cannot place its native wave inside this venue.');
    fighters.push({...at, yaw: Math.atan2(alley.fort.x - at.x, alley.fort.z - at.z)});
  }
  const vehicle = duel._vehicleSpec(duel.state.opponents.find(actor =>
    actor.arenaRole === 'ambush-buggy') || duel.state);
  const buggy = wave >= 4 ? groups.flat().find(pose => clearPose(course, pose, vehicle) &&
    fighters.every(other => distance(pose, other) > vehicle.halfLength + 2)) : null;
  if (wave >= 4 && !buggy) throw new Error('Ambush Alley cannot place its native buggy inside this venue.');
  return {wave, fighters, buggy: buggy ? {...buggy} : null};
}

function startWave(duel, wave) {
  const alley = native(duel);
  alley.wave = wave;
  alley.gapLeftSec = 0;
  alley.waveSpawn = ambushSpawnPlan(duel, wave);
  const templates = createRaidZones(duel.course, duel.seed).flatMap(zone => zone.raiders);
  const zones = [0, 1].map(index => ({id: `ambush-${wave}-${index}`,
    s: alley.waveSpawn.fighters[index].s, side: index ? 1 : -1,
    raiders: [], salvage: null, warning: null, warnedLap: duel.state.currentLap,
    nextShotAt: duel.state.stageTimeSec, shotCount: 0, ambushWave: wave}));
  for (const [index, pose] of alley.waveSpawn.fighters.entries()) {
    const raider = {...templates[index % templates.length], ...pose,
      id: `ambush-${wave}-${index}`, ambushWave: wave, firedLap: 0,
      health: COMBAT_TUNING.raider.health, maxHealth: COMBAT_TUNING.raider.health,
      knockedDown: false, knockdownRemaining: 0, knockdownAwarded: false,
      knockdownCounted: false, groundY: pose.y};
    zones[index % 2].raiders.push(raider);
  }
  duel.state.raids = {zones, shots: duel.state.raids?.shots || 0};
  duel.emit({ambushWave: {wave, fighters: alley.waveSpawn.fighters.length,
    buggy: wave >= 4, hitPosition: {x: alley.fort.x, y: alley.fort.y, z: alley.fort.z}}});
}

export function initializeAmbushAlley(duel) {
  const state = duel.state;
  if (state.arena?.mode !== 'ambush-alley' ||
      !['pit', 'salt-flats'].includes(duel.course.def.id)) return false;
  if (state.arena.ambushAlley) return true;
  const {fort, park, fighter} = fortLayout(duel);
  if (!clearPose(duel.course, park, duel._vehicleSpec(state), fort.cover) ||
      !clearPose(duel.course, fighter, BODY, fort.cover) ||
      fort.cover.some(cover => !clearPose(duel.course,
        {...cover, lateral: cover.off}, {halfWidth: cover.halfX,
          halfLength: cover.halfZ, height: cover.height})))
    throw new Error('Ambush Alley fort must clear the native scenery.');
  state.arena.ambushAlley = {wave: 1, completedWaves: 0, gapLeftSec: 0, fort};
  indexCover(duel.course, fort.cover);
  Object.assign(state, {s: park.s, prevS: park.s, lateral: park.lateral,
    prevLateral: park.lateral, headingError: 0, speedMph: 0, gear: 0,
    revs: 0, yawVelocity: 0, pushVelocity: 0, boost: 1, boosting: false});
  state.fighter = {...createFighter(duel.course, state,
    {s: fighter.s, lateral: fighter.lateral}), crewId: state.crewId};
  state.onFoot = true;
  startWave(duel, 1);
  return true;
}

// The arena owner applies this pose to its real preallocated car and marks its
// ambushWave. Missing native entry never becomes a substitute vehicle here.
export function ambushBuggySpawn(duel) {
  const alley = native(duel);
  if (!alley || alley.gapLeftSec > 0 || alley.wave < 4 || duel.state.arena.result) return null;
  if (duel.state.opponents.some(actor => actor.arenaRole === 'ambush-buggy' &&
      actor.ambushWave === alley.wave)) return null;
  return {wave: alley.wave, pose: {...alley.waveSpawn.buggy}};
}

export function ambushBuggyGoal(duel, actor) {
  const alley = native(duel);
  if (!alley || actor.arenaRole !== 'ambush-buggy' || actor.ambushWave !== alley.wave ||
      actor.combatWrecking || actor.finished || alley.gapLeftSec > 0) return null;
  return {x: alley.fort.x, z: alley.fort.z,
    speedMph: duel.course.def.scrapdome.floorSpeedMph, boost: false};
}

export function ambushFortTargets(duel) {
  const alley = native(duel);
  return alley && !duel.state.arena.result ?
    [...alley.fort.cover, ...(alley.fort.core ? [alley.fort.core] : [])] : [];
}

export function ambushRepairTarget(duel, fighter = duel.state.fighter) {
  const alley = native(duel);
  if (!alley || !fighter || alley.fort.health <= 0 || duel.state.arena.result) return null;
  const reach = COMBAT_TUNING.foot.repairRangeMeters;
  return alley.fort.cover.some(cover => distance(fighter, cover) <= reach &&
    Math.abs(fighter.y - cover.y) <= FIGHTER_RULES.height) ? alley.fort : null;
}

export function damageAmbushFort(duel, amount, {source = 'raider', owner = null,
  hitPosition} = {}) {
  const alley = native(duel);
  if (!alley || duel.state.arena.result || duel.state.status !== 'racing' ||
      duel.state.paused || !Number.isFinite(amount) || amount <= 0 || alley.fort.health <= 0) return 0;
  const removed = Math.min(alley.fort.health, amount);
  alley.fort.health -= removed;
  if (source !== 'wear') duel.emit({ambushFortHit: {source, owner, removed,
    health: alley.fort.health, hitPosition: hitPosition ||
      {x: alley.fort.x, y: alley.fort.y, z: alley.fort.z}}});
  return removed;
}

export function stepAmbushAlley(duel, dt) {
  const state = duel.state, alley = native(duel);
  if (!alley || state.arena.result || state.status !== 'racing' || state.paused ||
      !Number.isFinite(dt) || dt <= 0) return null;
  if (alley.fort.health <= 0) return {reason: 'fort-fell', winnerId: 'raiders'};
  if (alley.completedWaves === AMBUSH_RULES.waveCounts.length)
    return {reason: 'waves-survived', winnerId: 'player'};
  if (alley.gapLeftSec > 0) {
    alley.gapLeftSec = alley.gapLeftSec <= dt + 1e-9 ? 0 : alley.gapLeftSec - dt;
    if (alley.gapLeftSec === 0) startWave(duel, alley.wave + 1);
    return null;
  }
  const raiders = state.raids?.zones.flatMap(zone => zone.raiders)
    .filter(raider => raider.ambushWave === alley.wave) || [];
  const alive = raiders.filter(raider => !raider.knockedDown);
  const nearby = alive.filter(raider => distance(raider, alley.fort) <= AMBUSH_RULES.wearRangeMetres);
  damageAmbushFort(duel, nearby.length * AMBUSH_RULES.wearPerSecond * dt, {source: 'wear'});
  if (alley.fort.health <= 0) return {reason: 'fort-fell', winnerId: 'raiders'};
  const buggy = state.opponents.find(actor => actor.arenaRole === 'ambush-buggy' &&
    actor.ambushWave === alley.wave);
  if (raiders.length !== AMBUSH_RULES.waveCounts[alley.wave - 1] || alive.length ||
      alley.wave >= 4 && (!buggy || !buggy.combatWrecking)) return null;
  alley.completedWaves++;
  duel.emit({ambushWaveComplete: {wave: alley.wave, completedWaves: alley.completedWaves}});
  if (alley.completedWaves === AMBUSH_RULES.waveCounts.length)
    return {reason: 'waves-survived', winnerId: 'player'};
  alley.gapLeftSec = AMBUSH_RULES.gapSec;
  return null;
}
