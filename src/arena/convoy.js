import {CONVOY_RULES, isConvoyRig} from './modes/convoy-raid.js';
import {warlordFight} from '../warlords/index.js';

// Red handwheel centres from the approved ART-FIT-TANKER GLB recipe, Y-up.
export const CONVOY_VALVE_CENTRES = Object.freeze([
  Object.freeze([1.0031543374, 2.0966249704, -3.1116251945]),
  Object.freeze([-1.0031560063, 2.0966256857, -2.9387415648]),
  Object.freeze([1.0031544566, 2.0966249704, -.7320454717]),
]);
export const CONVOY_ROOF_PLATE = Object.freeze({
  x: -.0000006035, y: 3.02, z: -2.4441381118,
  halfWidth: .69862524, halfLength: 1.24205031,
});

export function convoyPoint(duel, actor, local) {
  const at = duel.course.groundAt(actor.s, actor.lateral);
  const heading = at.heading + (actor.headingError || 0);
  return {x: at.x + local[0] * Math.cos(heading) + local[2] * Math.sin(heading),
    y: at.y + (actor.airHeight || 0) + local[1],
    z: at.z - local[0] * Math.sin(heading) + local[2] * Math.cos(heading)};
}

export function convoyValvePoints(duel, actor) {
  return CONVOY_VALVE_CENTRES.map(local => convoyPoint(duel, actor, local));
}

const validPoint = point => point && ['x', 'y', 'z'].every(axis => Number.isFinite(point[axis]));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function convoyBlastDistance(duel, actor, point) {
  return isConvoyRig(duel, actor) && validPoint(point)
    ? Math.min(...convoyValvePoints(duel, actor).map(at => distance(at, point))) : Infinity;
}

// The tank body cannot be wrecked, so a player hit that misses every valve
// does nothing. Say so, at most once every six seconds, so it never reads
// as a broken weapon.
function noteConvoyBodyHit(duel, convoy, options) {
  if (options.owner !== 'player' || duel.state.stageTimeSec < convoy.bodyHintAfterSec) return;
  convoy.bodyHintAfterSec = duel.state.stageTimeSec + CONVOY_RULES.bodyHintSeconds;
  duel._callout('TANK BODY TAKES NO DAMAGE / HIT THE RED VALVES', 2.4);
}

// Central armor damage calls this after ordinary protection/team checks and
// damage scaling. No point means a body hit: it can shove, never drain armor.
export function damageConvoyValves(duel, actor, damage, source, options = {}) {
  if (!isConvoyRig(duel, actor) || !(damage > 0) || !Number.isFinite(damage)) return 0;
  const convoy = duel.state.arena.convoy;
  if (convoy.finished || convoy.chargePlanted) return 0;
  const point = source === 'ram' ? options.contactPoint : options.hitPosition;
  if (!validPoint(point)) {
    noteConvoyBodyHit(duel, convoy, options);
    return 0;
  }
  if (options.owner) convoy.attackerId = options.owner;
  const points = convoyValvePoints(duel, actor);
  const distances = points.map(at => distance(at, point));
  let indices;
  if (options.blastRadius > 0 && Number.isFinite(options.blastRadius)) {
    indices = distances.flatMap((gap, index) => gap <= options.blastRadius ? [index] : []);
  } else {
    const nearest = distances.indexOf(Math.min(...distances));
    indices = source === 'ram' && distances[nearest] > CONVOY_RULES.ramReach ? [] : [nearest];
  }
  if (!indices.length) noteConvoyBodyHit(duel, convoy, options);
  let removed = 0;
  for (const index of indices) {
    const before = convoy.valves[index];
    const multiplier = warlordFight(duel, actor)?.valveMultiplier?.(duel, actor, index) ?? 1;
    const taken = Math.min(before, damage * multiplier);
    convoy.valves[index] = before - taken;
    removed += taken;
    if (before > 0 && convoy.valves[index] === 0 && options.owner === 'player' &&
        !convoy.playerBroken[index]) {
      convoy.playerBroken[index] = true;
      convoy.playerValvesBroken++;
    }
    if (before > 0 && convoy.valves[index] === 0 && options.owner === 'player')
      duel._callout(`VALVE BROKEN / ${convoy.valves.filter(armor => armor === 0).length} OF ${convoy.valves.length}`, 2);
  }
  if (removed > 0) convoy.attackerId = options.owner || convoy.attackerId;
  if (removed > 0) warlordFight(duel, actor)?.valvesDamaged?.(duel, actor);
  if (removed > 0 && convoy.valves.every(armor => armor === 0)) {
    convoy.boardingLeftSec = CONVOY_RULES.boardingSeconds;
    actor.speedMph = CONVOY_RULES.boardingKph / 1.609344;
    duel.emit({convoyWindow: {open: true, soundCue: 'interface.go'}});
    duel._callout('TANKER SLOWED / BOARD NOW', 3);
  }
  return removed;
}
