// Supplies for the Summit (docs/story/kogane-invitation.md section 8.2): the story's one dispatch job. A crate of race tyres
// and tea-house supplies goes from the home pad to Kogane Pass. Rules only: no graphics, no clock, no randomness.
//
// This file takes the story's state in as arguments and imports nothing outside src/heli/. The session passes the step the
// story is at (`step`) and the story's own writer (`mark`, markKoganeSupplies), so the whole finish is one change to a copy of
// the profile: pay, the day's job list, the Night version found and the story mark all happen, or none of them does.
import {HOME_COURSE, jobPay, jobCleanBonus} from './heli-jobs.js';
import {payForMinutes, deliveryMinutes} from './heli-pay.js';
import {heliOf, finishJob, mapRecordOf, mapBlocked, writeMapRecord} from './heli-save.js';

export const STORY_JOB_ID = 'story-kogane-supplies';
export const STORY_COURSE = 'kogane-pass';
// The Night version of Kogane Pass, found from the air by this delivery (the existing "found from the air" rule opens it).
export const STORY_NIGHT = 'kogane-pass-night';
export const STORY_NIGHT_NAME = 'Kogane Pass Night';
export const STORY_CRATE_KG = 420;
export const STORY_TITLE = 'Supplies for the Summit';
export const STORY_PIN = "Daichi's tea house";
export const STORY_NEWER = 'The helicopter record belongs to a newer version of the game.';

// The job. Pay is read from heli-pay.js live: a delivery from the home pad is leave, hook, carry out, one cruise leg, arrive and
// set down (6 minutes at the race rate). `kind: 'crate'` is what makes the logbook count it as a crate job.
export function storyJob() {
  return Object.freeze({id: STORY_JOB_ID, kind: 'crate', story: 'kogane', from: HOME_COURSE, to: STORY_COURSE, massKg: STORY_CRATE_KG,
    pay: payForMinutes(deliveryMinutes(false)), title: STORY_TITLE, pin: STORY_PIN});
}

// The job on the board, or null. It is offered only when the switch is on, the story is at the delivery step (the letter read
// and the driving lesson passed) and the helicopter's carry lesson is done. `step` is koganeStep(profile).
export function storyOffered({enabled = false, step = null, carryDone = false} = {}) {
  return enabled === true && step === 'supplies' && carryDone === true ? storyJob() : null;
}

// The crate is down inside the landing circle. Returns {ok, profile, paid, bonus, pay, job, found} or {ok: false, reason, profile}
// with the profile exactly as it was. `day` is the play day, `clean` says no repair was charged while the job was in hand.
export function finishStorySupplies(profile, {mode = 'assisted', clean = false, day = null, step = null, mark = null} = {}) {
  const refuse = reason => ({ok: false, reason, profile});
  if (step !== 'supplies' || typeof mark !== 'function') return refuse('The supplies are not the next part of the story.');
  const heli = heliOf(profile);
  if (heli.jobs.taken !== STORY_JOB_ID || heli.jobs.day !== day) return refuse('That is not the job in hand.');
  if (mapBlocked(profile)) return refuse(STORY_NEWER);
  const job = storyJob(), bonus = clean ? jobCleanBonus(job, mode) : 0, pay = jobPay(job, mode) + bonus;
  const paid = finishJob(profile, job.id, pay, {enabled: true});
  if (!paid.ok) return refuse(paid.reason);
  // The Night version, found from the air. A record already at the save's limit cannot take another name: nothing is written.
  const stored = mapRecordOf(paid.profile), already = stored.found.includes(STORY_NIGHT);
  let next = paid.profile;
  if (!already) {
    const written = writeMapRecord(next, {...stored, found: [...stored.found, STORY_NIGHT]});
    if (!written.ok || !written.profile.heli.map.found.includes(STORY_NIGHT)) return refuse(written.reason ?? STORY_NEWER);
    next = written.profile;
  }
  // The mark must really rise now: a story that already has it (a second finish) pays nothing.
  const marked = mark(next);
  if (!marked?.ok || marked.changed !== true) return refuse(marked?.reason || 'The supplies were already delivered.');
  return {ok: true, profile: marked.profile, paid: paid.paid, bonus, pay, job, found: !already};
}
