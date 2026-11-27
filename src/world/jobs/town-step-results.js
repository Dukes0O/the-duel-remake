// TOWN-JOBS-2: what a town job's steps report, kept by the step's id until the job ends (src/world/jobs/town-jobs.js turns
// them into the one mission result). Pure: no DOM, no Three.js, nothing from app.js. The World Job mode calls this with each
// step's events, and so does the suite's test driver, so both keep exactly the same record.
export const TOWN_STEP_KINDS = Object.freeze(new Set(['tow', 'repair', 'fence', 'clear', 'hold']));

/** Add what this step's events report to `results` (a plain record by step id) and return it. */
export function keepTownStepResults(results, step, events = []) {
  const kept = results ?? {}, id = step?.id ?? step?.kind ?? 'step';
  for (const event of events) {
    if (event.type === 'haulDelivered') kept[id] = {kind:'haul', good:event.good, deliveredKg:event.deliveredKg, lostKg:event.lostKg,
      pieces:event.pieces, lostPieces:event.lostPieces, sentence:event.sentence};
    else if (event.type === 'douseDone') kept[id] = {kind:'douse', savedIds:event.savedIds, lostIds:event.lostIds, mainSaved:event.mainSaved,
      usedL:event.usedL, sentence:event.sentence};
    else if (event.type === 'rescued') kept[id] = {kind:'rescue', people:(kept[id]?.people ?? 0) + 1};
    else if (event.result) kept[id] = {...event.result};
  }
  return kept;
}
