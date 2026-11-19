// The one place that names the date of an `.evidence/<date>/` folder (QA-EVIDENCE-DATE-BOUNDARY).
//
// The date is the LAPTOP'S LOCAL calendar date, never the UTC date: Kyle reads these folders by his own calendar, and
// the Blender recipes (Python `date.today()`) already take the local date. A UTC date runs ahead of Pacific time from
// 17:00 until midnight, so a run at 23:56 landed in tomorrow's folder while the round planner named today's.
//
// `DUEL_EVIDENCE_NOW` (a local time such as 2026-11-18T23:56:00, no zone) fixes the clock for tests that start a child
// process; nothing else reads it.
export function evidenceDate(now = clockNow()) {
  const two = number => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`;
}

export function clockNow(env = process.env) {
  if (!env.DUEL_EVIDENCE_NOW) return new Date();
  const fixed = new Date(env.DUEL_EVIDENCE_NOW);
  if (Number.isNaN(fixed.getTime())) throw Error(`DUEL_EVIDENCE_NOW is not a date: ${env.DUEL_EVIDENCE_NOW}`);
  return fixed;
}
