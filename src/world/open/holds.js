// Holds (docs/story/open-scablands.md, section 15). A mission holds the checkpoints and the signs while it runs, so
// that nothing else happens on its road. A system runs only while nobody holds it. Two missions can each hold the
// checkpoints, and they stay off until both have let go. A hold is never saved.
//
// The list of holds is plain data that the caller keeps; every function returns a new list.
import {HOLD_SYSTEMS} from './register.js';

export const NO_HOLDS = Object.freeze([]);
// What every job holds unless its definition says otherwise.
export const USUAL_HOLDS = Object.freeze(['checkpoints', 'signs']);

function systemsOf(systems) {
  for (const system of systems) if (!HOLD_SYSTEMS.includes(system)) throw new TypeError('Unknown system to hold: ' + system);
  return Object.freeze([...new Set(systems)]);
}

// What a job holds, from its definition: `holds: [...]` when it says, nothing for a job of the one step `roam`,
// and the checkpoints and the signs for every other job. So a writer cannot forget the hold.
export function holdsOfJob(definition) {
  if (Array.isArray(definition?.holds)) return systemsOf(definition.holds);
  const steps = definition?.steps ?? [];
  if (steps.length === 1 && steps[0]?.kind === 'roam') return NO_HOLDS;
  return USUAL_HOLDS;
}

// The holder takes these systems. Taking again replaces what the same holder held.
export function takeHold(holds, holder, systems = USUAL_HOLDS) {
  if (typeof holder !== 'string' || !holder) throw new TypeError('A hold needs a holder.');
  const rest = holds.filter(hold => hold.holder !== holder), kept = systemsOf(systems);
  return Object.freeze(kept.length ? [...rest, Object.freeze({holder, systems: kept})] : rest);
}

export function dropHold(holds, holder) {
  return Object.freeze(holds.filter(hold => hold.holder !== holder));
}

export function isHeld(holds, system) {
  if (!HOLD_SYSTEMS.includes(system)) throw new TypeError('Unknown system: ' + system);
  return holds.some(hold => hold.systems.includes(system));
}

export const holdersOf = (holds, system) => holds.filter(hold => hold.systems.includes(system)).map(hold => hold.holder);
