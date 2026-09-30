// Fuel Run rules (SCRAPDOME 10). Simulation only; presentation reads this state.
export const FUEL_RULES = Object.freeze({
  deliveriesToWin: 5, timeLimitSec: 180, refillSec: 5,
  pickupMetres: 3.5, depotMetres: 2, innerOffset: -6,
  padFractions: Object.freeze([.16, .36, .57, .81]),
  walkingShare: .7, dropArmor: 25,
  colors: Object.freeze(['#78ceff', '#ffb04d', '#a6de72', '#dba3ff']),
});
const actorFor = (duel, id) => id === 'player' ? duel.state :
  duel.state.opponents.find(actor => actor.arenaId === id);

export function fuelPose(duel, participant) {
  return participant.id === 'player' && duel.state.onFoot && duel.state.fighter
    ? duel.state.fighter : actorFor(duel, participant.id);
}

function newCanister(fuel, pad) {
  const canister = {id: 'fuel-' + (++fuel.serial), s: pad.s,
    lateral: pad.lateral, carriedBy: null};
  fuel.canisters.push(canister);
  pad.canisterId = canister.id;
  pad.refillSec = 0;
}

export function initializeFuelRun(duel) {
  const arena = duel.state.arena;
  if (arena?.mode !== 'fuel-run') return;
  const course = duel.course;
  const pads = FUEL_RULES.padFractions.map((fraction, index) => {
    let s = fraction * course.length;
    // Pads stay on level, open inner floor, away from ramps and junk.
    for (let tries = 0; tries < 40; tries++, s += 3) {
      const at = course.groundAt(s, FUEL_RULES.innerOffset);
      const ramp = course.features.ramps.some(r => s >= r.start - 6 && s <= r.end + 6);
      const junk = (course.features.crushables || []).some(p => Math.hypot(at.x-p.x, at.z-p.z) < 9);
      if (!ramp && !junk) break;
    }
    return {id: 'fuel-pad-' + (index + 1), s: s % course.length,
      lateral: FUEL_RULES.innerOffset, canisterId: null, refillSec: 0};
  });
  const depots = arena.participants.map((participant, index) => {
    participant.fuelDelivered = 0;
    participant.fuelCanisterId = null;
    const slot = arena.spawnSlots[participant.spawnSlot];
    return {participantId: participant.id, team: participant.team,
      color: FUEL_RULES.colors[index], s: slot.s, lateral: slot.lateral};
  });
  arena.fuelRun = {pads, depots, canisters: [], serial: 0};
  for (const pad of pads) newCanister(arena.fuelRun, pad);
}

export function dropFuel(duel, participant, reason) {
  const fuel = duel.state.arena?.fuelRun;
  if (!fuel || !participant?.fuelCanisterId) return false;
  const canister = fuel.canisters.find(c => c.id === participant.fuelCanisterId);
  const pose = fuelPose(duel, participant);
  participant.fuelCanisterId = null;
  if (!canister || !pose) return false;
  Object.assign(canister, {s: pose.s, lateral: pose.lateral, carriedBy: null});
  duel.emit({fuelDrop: {id: canister.id, participantId: participant.id,
    s: canister.s, lateral: canister.lateral, reason}});
  return true;
}

export function noteFuelDamage(duel, participant, removed) {
  if (removed > FUEL_RULES.dropArmor) dropFuel(duel, participant, 'hit');
}

function distance(course, a, b) {
  const p = course.worldAt(a.s, a.lateral), q = course.worldAt(b.s, b.lateral);
  return Math.hypot(p.x - q.x, p.z - q.z);
}

export function fuelGoal(duel, participant, actor, top) {
  const fuel = duel.state.arena.fuelRun, course = duel.course;
  let destination;
  if (participant.fuelCanisterId) destination = fuel.depots.find(d => d.participantId === participant.id);
  else {
    let score = Infinity;
    for (const canister of fuel.canisters) {
      if (canister.carriedBy) continue;
      let cost = distance(course, actor, canister);
      // Collectors choose open fuel rather than fuel beside an active enemy.
      if (participant.brain === 'collector') {
        for (const other of duel.state.arena.participants) {
          if (other === participant) continue;
          const enemy = actorFor(duel, other.id);
          if (!enemy || enemy.combatWrecking) continue;
          cost += Math.max(0, 18 - distance(course, enemy, canister)) * 2;
        }
      }
      if (cost < score) { score = cost; destination = canister; }
    }
  }
  if (!destination) {
    const at = course.worldAt(actor.s + 30, 0);
    return {x: at.x, z: at.z, speedMph: top * .55, boost: false};
  }
  const at = course.worldAt(destination.s, destination.lateral);
  const gap = distance(course, actor, destination);
  return {x: at.x, z: at.z, speedMph: Math.min(top, Math.max(10, gap * 1.7)), boost: false};
}

export function stepFuelRun(duel, dt) {
  const arena = duel.state.arena, fuel = arena?.fuelRun;
  if (!fuel || arena.result) return null;
  for (const pad of fuel.pads) {
    if (pad.canisterId) continue;
    pad.refillSec = pad.refillSec <= dt + 1e-9 ? 0 : pad.refillSec - dt;
    if (pad.refillSec === 0) newCanister(fuel, pad);
  }
  for (const participant of arena.participants) {
    const actor = actorFor(duel, participant.id), pose = fuelPose(duel, participant);
    if (!actor || !pose) continue;
    const down = participant.id === 'player' && duel.state.onFoot && duel.state.fighter?.knockedDown;
    if (actor.combatWrecking || down) {
      dropFuel(duel, participant, down ? 'knockdown' : 'wreck');
      continue;
    }
    if (participant.fuelCanisterId) {
      const carried = fuel.canisters.find(c => c.id === participant.fuelCanisterId);
      if (carried) { carried.s = pose.s; carried.lateral = pose.lateral; }
      const depot = fuel.depots.find(d => d.participantId === participant.id);
      if (depot && distance(duel.course, pose, depot) <= FUEL_RULES.depotMetres &&
          !(pose.airHeight > 1)) {
        const id = participant.fuelCanisterId;
        fuel.canisters = fuel.canisters.filter(c => c.id !== id);
        participant.fuelCanisterId = null;
        participant.fuelDelivered++;
        participant.reactionSec = 0;
        duel.emit({fuelDelivery: {id, participantId: participant.id,
          delivered: participant.fuelDelivered, s: depot.s, lateral: depot.lateral}});
        if (participant.id === 'player') duel._callout('FUEL DELIVERED / ' +
          participant.fuelDelivered + ' OF ' + FUEL_RULES.deliveriesToWin, 2);
        if (participant.fuelDelivered >= FUEL_RULES.deliveriesToWin || arena.phase === 'sudden-death')
          return {reason: arena.phase === 'sudden-death' ? 'sudden-death' : 'fuel',
            winnerId: participant.id};
      }
      continue;
    }
    if (pose.airHeight > 1) continue;
    const canister = fuel.canisters.find(c => !c.carriedBy &&
      distance(duel.course, pose, c) <= FUEL_RULES.pickupMetres);
    if (!canister) continue;
    canister.carriedBy = participant.id;
    participant.fuelCanisterId = canister.id;
    participant.reactionSec = 0;
    const pad = fuel.pads.find(p => p.canisterId === canister.id);
    if (pad) { pad.canisterId = null; pad.refillSec = FUEL_RULES.refillSec; }
    duel.emit({fuelPickup: {id: canister.id, participantId: participant.id,
      s: pose.s, lateral: pose.lateral}});
    if (participant.id === 'player') duel._callout('FUEL ON BOARD', 2);
  }
  return null;
}
