// WEAPON-WATER-CANNON: the water cannon's stream (docs/ARSENAL.md sections 1 and 2, docs/WASTELAND_TOWN.md section 7).
// One stream for both places it is fitted, so a player learns one thing: the fire truck's cannon (hold H, from the truck's
// 3,000 L tank, src/arena/modes/world-job.js) and the Armory's car cannon (a weapon slot, a 2 s burst). Pure: no DOM, no
// Three.js, nothing from app.js; it draws no random numbers.
//
// What the stream does, and the counter a child can learn in one race:
// - It is a straight, narrow line of water from the nose, 14 m long. It stops at the first car in it.
// - That car is shoved along the stream, away from the cannon, a little more each moment it stays in the water. The shove
//   one stream gives one car is capped, so the car always keeps its steering and is never thrown about.
// - It never damages anything: no armor, no health, no style hit.
// - It puts out fire by the same rule the Ash Men's thrown ash uses (src/arena/modes/road-riders.js): a burning car stops
//   burning (its flame burn is removed and its `burning` effect ends), and a car spraying a flamethrower has its burst ended,
//   with the flamethrower's own end cue.
// - Counter: steer out of the line of water, or raise a star shield. A shield stops the shove; water still puts a fire out.
//
// Numbers. The fire truck's pump gives 1,000 L a minute (src/town/content/work-vehicles.js). A real jet's push is its mass
// flow times its speed: about 17 kg a second at about 30 m/s is about 500 N, which would barely slide a parked car. The shove
// here is therefore a game number, as the flamethrower's damage is: 7 m/s more each second in the water, never more than
// 4 m/s from one stream, which moves a car about a lane in a 2 s burst. The length and width are chosen to be read at a
// glance: a stream about a car's width, as long as three car lengths. Upgrades only shorten the recharge (section 2).
import {point} from '../combat-actors.js';
import {combatShielded} from '../combat-armor.js';
import {hostile, outOfPlay} from '../combat-teams.js';
import {actorForTarget, targetIdentity} from './targeting.js';
import {addCarAlongPush, setCarEffect} from './car-effects.js';
import {FLAME_RULES} from './flamethrower.js';

export const WATER_RULES = Object.freeze({
  // A burst from the car's cannon, in seconds. The truck's stream lasts for as long as H is held and the tank has water.
  duration: 2,
  // The stream starts at the nose (`noseMetres` ahead of the car's middle) and reaches `range` metres further.
  noseMetres: 2.2, range: 14,
  // Metres either side of the stream's line, and the half width of a car's body, so a car whose side is in the water is hit.
  halfWidth: .6, bodyHalfWidth: 1,
  // The shove: metres a second added each second a car is in the water, and the most one stream adds to one car.
  pushPerSecond: 7, pushLimit: 4,
});

// The sound cues: the stream opening (the bucket's pour, the same recording as the fire truck's town.spray) and a fire put
// out (the hiss of the fire call's town.fire.out). src/sound-bank.js.
export const WATER_CUES = Object.freeze({spray: 'weapon.water.spray', douse: 'weapon.water.douse'});

const EPS = 1e-9;
const cars = duel => [duel.state, ...duel.state.opponents];

/** The stream's start (at the nose) and its direction, from a car's pose. */
export function waterStreamStart(at, heading) {
  return {x: at.x + Math.sin(heading) * WATER_RULES.noseMetres, y: at.y,
    z: at.z + Math.cos(heading) * WATER_RULES.noseMetres, heading};
}

/** How far along the stream a point is, or null when the point is not in the water. */
export function waterStreamReach(start, target) {
  const dx = target.x - start.x, dz = target.z - start.z;
  const sin = Math.sin(start.heading), cos = Math.cos(start.heading);
  const along = dx * sin + dz * cos, side = dx * cos - dz * sin;
  const body = WATER_RULES.bodyHalfWidth;
  if (along < -body - EPS || along > WATER_RULES.range + body + EPS) return null;
  if (Math.abs(side) > WATER_RULES.halfWidth + body + EPS) return null;
  return Math.max(0, along);
}

/** The first car in the stream from this owner, with how far along it is; null when the water reaches nothing. */
export function waterStreamTarget(duel, owner, start) {
  let best = null;
  for (const actor of cars(duel)) {
    if (actor === owner || outOfPlay(duel, actor)) continue;
    const along = waterStreamReach(start, point(duel, actor));
    if (along !== null && (!best || along < best.along)) best = {actor, along};
  }
  return best;
}

// Water puts out fire on a car: the flamethrower's lingering burn, and a flamethrower burst the car is firing.
function douseCar(duel, actor, owner) {
  const combat = duel.state.combat, id = targetIdentity(duel, actor);
  let doused = false;
  if (combat?.flameBurns?.[id]) {
    delete combat.flameBurns[id];
    setCarEffect(actor, 'burning', {duration: 0});
    doused = true;
  }
  for (const burst of combat?.flameBursts ?? []) {
    if (burst.ownerId !== id || burst.age + EPS >= FLAME_RULES.duration) continue;
    // The burst ends this step; stepFlamethrowers says its own end cue and removes it.
    burst.age = FLAME_RULES.duration;
    burst.doused = true;
    doused = true;
  }
  if (doused) {
    const at = point(duel, actor);
    duel.emit({arsenalCue: WATER_CUES.douse, actor, owner, waterDoused: id, hitPosition: {x: at.x, y: at.y, z: at.z}});
  }
  return doused;
}

// The shove, along the stream, written as the car's sideways and along-the-road push (src/arsenal/car-effects.js), so the
// driving code moves the car with every other push and damps it in the same way.
function shove(duel, actor, heading, amount) {
  const roadHeading = point(duel, actor).heading;
  const wx = Math.sin(heading) * amount, wz = Math.cos(heading) * amount;
  actor.pushVelocity = (actor.pushVelocity || 0) + wx * Math.cos(roadHeading) - wz * Math.sin(roadHeading);
  addCarAlongPush(actor, wx * Math.sin(roadHeading) + wz * Math.cos(roadHeading));
}

/**
 * One step of a stream of water from `owner`, starting at `start` ({x, y, z, heading}). `stream.pushed` keeps how much this
 * stream has shoved each car, so the cap holds over the whole stream. Returns the car hit (or null) and whether a fire went out.
 * Never damages: nothing here calls the armor or health rules.
 */
export function sprayWater(duel, owner, stream, dt, start, {shielded = combatShielded} = {}) {
  if (!(dt > 0)) return {hit: null, doused: false, reach: WATER_RULES.range};
  const target = waterStreamTarget(duel, owner, start);
  if (!target) return {hit: null, doused: false, reach: WATER_RULES.range};
  const {actor} = target, id = targetIdentity(duel, actor);
  const doused = douseCar(duel, actor, owner);
  stream.pushed ??= {};
  if (hostile(duel, owner, actor) && !shielded(duel, actor)) {
    const given = stream.pushed[id] ?? 0;
    const amount = Math.min(WATER_RULES.pushPerSecond * dt, WATER_RULES.pushLimit - given);
    if (amount > EPS) {
      shove(duel, actor, start.heading, amount);
      stream.pushed[id] = given + amount;
    }
  }
  return {hit: actor, doused, reach: target.along};
}

/** The car cannon: a burst of `WATER_RULES.duration` seconds. One stream per car at a time. */
export function startWaterCannon(duel, owner, level = 0) {
  const combat = duel.state.combat;
  if (!combat || !owner || outOfPlay(duel, owner)) return null;
  combat.waterStreams ||= [];
  const ownerId = targetIdentity(duel, owner);
  if (combat.waterStreams.some(stream => stream.ownerId === ownerId)) return null;
  const stream = {id: ++combat.serial, ownerId, level, age: 0, reach: WATER_RULES.range, pushed: {}};
  combat.waterStreams.push(stream);
  const at = point(duel, owner);
  duel.emit({arsenalCue: WATER_CUES.spray, actor: owner, stream, hitPosition: {x: at.x, y: at.y, z: at.z}});
  return stream;
}

/** Each fixed step: every car cannon's stream sprays, then ends after its burst. */
export function stepWaterCannons(duel, dt, options = {}) {
  const combat = duel.state.combat;
  if (!combat?.waterStreams?.length || !(dt > 0)) return;
  for (const stream of combat.waterStreams) {
    const owner = actorForTarget(duel, stream.ownerId);
    const live = !owner || outOfPlay(duel, owner) ? 0 : Math.min(dt, Math.max(0, WATER_RULES.duration - stream.age));
    if (live > 0) {
      const at = point(duel, owner);
      const result = sprayWater(duel, owner, stream, live, waterStreamStart(at, at.heading + (owner.headingError || 0)), options);
      stream.reach = result.reach;
      stream.hitId = result.hit ? targetIdentity(duel, result.hit) : null;
    }
    stream.age += dt;
  }
  combat.waterStreams = combat.waterStreams.filter(stream => stream.age + EPS < WATER_RULES.duration &&
    !outOfPlay(duel, actorForTarget(duel, stream.ownerId)));
}
