import {bankLedgerHearth, beginLedger, recordLedgerChoice, replaceLedgerNight, savedLedger} from './ledger-save.js';
import {replayTelling} from './ledger-replay.js';
import {NIGHT_2_CHOICES, NIGHT_2_EFFECTS, NIGHT_2_GATE_ENCOUNTER} from './scenes/night-2.js';
import {compactOpenJournal, OPEN_JOURNAL_LIMIT, savedOpenRecord} from '../world/open/open-save.js';

// Slice A journaled encounters and debts by key. Later versions add their
// values, so only the old equivalent authored choices need to supply the text.
function legacyNight2Value({type, key, choiceId, after}) {
  if (after !== undefined) return after;
  if (type === 'met' && choiceId === 'meet-walkers') return NIGHT_2_GATE_ENCOUNTER;
  if (type !== 'debt') return undefined;
  const effects = NIGHT_2_CHOICES.find(choice => choice.id === choiceId)?.effects ?? NIGHT_2_EFFECTS[choiceId];
  const debt = effects?.find(effect => effect.type === type && effect.id === key);
  return debt ? {...debt, owedBy: debt.owedBy ?? debt.person} : undefined;
}

// Write the example only on completion. Quit/retry keeps the chapter's
// transient choices out of the profile, and a replay never awards salt twice.
export function settleNight2(profile, chapter) {
  if (!chapter.completed) return {ok: false, profile, changed: false, reason: 'Finish the night before keeping it.'};
  const kept = savedLedger(profile);
  const night = chapter.opening.night;
  const replay = kept && replayTelling(kept, chapter.ledger, night, legacyNight2Value);
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
  const open = savedOpenRecord(result.profile);
  if (open) {
    const {record, overflow} = compactOpenJournal(open, night, {atBank: true});
    if (record !== open) result.profile = {...result.profile, story: {...result.profile.story, open: record}};
    if (overflow) console.warn('Open journal target exceeded; all progress is kept.',
      {entries: record.journal.length, target: OPEN_JOURNAL_LIMIT});
  }
  if (chapter.scrap) {
    const wasteland = result.profile.wasteland ?? {};
    result.profile = {...result.profile, wasteland: {...wasteland, scrap: (wasteland.scrap ?? 0) + chapter.scrap}};
  }
  return result;
}

// Confirmation is the only replay write. It never goes through first-night pay.
export function keepNight2Replay(profile, chapter, expected) {
  if (!chapter.completed) return {ok: false, profile, changed: false, reason: 'Finish the night before keeping it.'};
  return replaceLedgerNight(profile, chapter.opening.night, chapter.ledger, expected, legacyNight2Value);
}
