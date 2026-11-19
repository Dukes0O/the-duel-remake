import {bankLedgerHearth, beginLedger, recordLedgerChoice, replaceLedgerNight, savedLedger} from './ledger-save.js';
import {replayTelling} from './ledger-replay.js';

// Write the example only on completion. Quit/retry keeps the chapter's
// transient choices out of the profile, and a replay never awards salt twice.
export function settleNight2(profile, chapter) {
  if (!chapter.completed) return {ok: false, profile, changed: false, reason: 'Finish the night before keeping it.'};
  const kept = savedLedger(profile);
  const night = chapter.opening.night;
  const replay = kept && replayTelling(kept, chapter.ledger, night);
  if (replay) return {ok: true, profile, changed: false, replay: {
    expected: JSON.stringify(kept), differences: replay.differences,
  }};
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

// Confirmation is the only replay write. It never goes through first-night pay.
export function keepNight2Replay(profile, chapter, expected) {
  if (!chapter.completed) return {ok: false, profile, changed: false, reason: 'Finish the night before keeping it.'};
  return replaceLedgerNight(profile, chapter.opening.night, chapter.ledger, expected);
}
