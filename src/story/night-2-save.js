import {bankLedgerHearth, beginLedger, recordLedgerChoice, savedLedger} from './ledger-save.js';

// Write the example only on completion. Quit/retry keeps the chapter's
// transient choices out of the profile, and a replay never awards salt twice.
export function settleNight2(profile, chapter) {
  const kept = savedLedger(profile);
  if (kept) return {profile, changed: false, kept};
  let result = beginLedger(profile, chapter.opening);
  if (!result.ok) return {...result, profile};
  for (const choice of chapter.journal) {
    result = recordLedgerChoice(result.profile, chapter.opening.night, choice);
    if (!result.ok) return {...result, profile};
  }
  result = bankLedgerHearth(result.profile, chapter.opening.night);
  if (!result.ok) return {...result, profile};
  if (chapter.scrap) {
    const wasteland = result.profile.wasteland ?? {};
    result.profile = {...result.profile, wasteland: {...wasteland, scrap: (wasteland.scrap ?? 0) + chapter.scrap}};
  }
  return result;
}
