// What every Lab bench shares (docs/LAB.md section 2, "the rule for truth").
// A bench is a pure model the screen can run: no clock, no random, no drawing.
// It exports {id, controls, cues, run(settings) -> result, goalMet(history), facts()}:
// - controls: what the player can change, as plain rows {id, label, unit, min, max, step, value}
//   (numbers) or {id, label, options, value} (choices);
// - run(settings): one run of the experiment on the game's own functions; settings are
//   clamped and snapped to the controls, so any input gives a lawful run;
// - goalMet(history): history is the runs so far as [{settings, result}], oldest first;
// - facts(): the numbers Brian's explanation quotes, computed from the same model, so the
//   words and the bench cannot drift apart (tools/test-lab-benches.mjs checks them).
// - cues: the sounds this bench plays, by id, when LAB-RADIO has made them.

export const control = (id, label, unit, min, max, step, value) => Object.freeze({id, label, unit, min, max, step, value});
export const choice = (id, label, options, value) => Object.freeze({id, label, options: Object.freeze([...options]), value});

const isNumber = row => Array.isArray(row.options) ? false : true;

// Settings the bench can run: unknown keys dropped, numbers clamped and snapped to the step,
// choices limited to their options, missing or junk values replaced by the default.
export function readSettings(controls, settings) {
  const given = settings !== null && typeof settings === 'object' ? settings : {};
  const out = {};
  for (const row of controls) {
    const value = Object.hasOwn(given, row.id) ? given[row.id] : row.value;
    if (!isNumber(row)) { out[row.id] = row.options.includes(value) ? value : row.value; continue; }
    const wanted = Number.isFinite(value) ? value : row.value;
    const snapped = row.min + Math.round((wanted - row.min) / row.step) * row.step;
    out[row.id] = Math.round(Math.max(row.min, Math.min(row.max, snapped)) * 1e9) / 1e9;
  }
  return out;
}

export function makeBench({id, controls, cues = [], run, goalMet, facts}) {
  const frozen = Object.freeze(controls);
  return Object.freeze({
    id, controls: frozen, cues: Object.freeze([...cues]),
    run: settings => { const read = readSettings(frozen, settings); return Object.freeze({settings: read, ...run(read)}); },
    goalMet: history => Array.isArray(history) && history.length > 0 && goalMet(history.filter(row => row && row.result)) === true,
    facts: () => facts(),
  });
}
