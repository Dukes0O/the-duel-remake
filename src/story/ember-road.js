// The Everburn's screen state (docs/WASTELAND_WORLD.md section 5). Reads the
// save and returns plain display props; the app owns navigation and saving.
import {EMBER_JOBS, emberOf} from './ember-save.js';

export const EMBER_JOB_NAMES = Object.freeze([
  'Hot Delivery', 'Get Out and Walk', 'Run Him Down', 'Slow Ride',
  'The Key Under the Mall', 'The Everburn',
]);
const JOB_NOTES = Object.freeze([
  'Carry Cinder’s ember pot to Tin Town. She lends you a flamethrower for the trip.',
  'Hold F to get out. Light the three forge lamps with Cinder’s Hand Flamer.',
  'Catch the thief through the Boneyard and bring back the bellows.',
  'Keep the Ash Men away from Big Bess on the road to Tin Town.',
  'Park outside the Dead Mall, take the valve key, and get back to your car.',
  'Hold the well while Cinder works, then chase Old Smoke’s furnace.',
]);
const SIDE_JOBS = Object.freeze([
  {id: 'lost-prospector', name: 'Lost Prospector', kind: 'Rescue', note: 'Find two stranded people near the Boneyard and bring them home.'},
  {id: 'survey-flags', name: 'Survey Flags', kind: 'Explore', note: 'Find five old survey flags. One is up on the Ridge.'},
  {id: 'hot-soup', name: 'Hot Soup', kind: 'Delivery', note: 'Carry Auntie Solder’s soup across town without spilling it.'},
]);

export function emberStoryProps(profile, {available = false} = {}) {
  if (!available) return {available: false, step: null, read: false, steps: [], sideJobs: []};
  const ember = emberOf(profile), jobs = ember.jobs ?? [];
  const step = ember.read !== true ? 'read' : EMBER_JOBS.find(id => !jobs.includes(id)) ?? 'done';
  const next = EMBER_JOBS.indexOf(step);
  const steps = EMBER_JOBS.map((id, index) => ({id,
    state: jobs.includes(id) ? 'done' : index === next ? 'open' : 'locked',
    note: jobs.includes(id) ? `${EMBER_JOB_NAMES[index]} is done.` : JOB_NOTES[index],
    button: index === next ? (index === 0 ? 'Go to the back gate' : `Start ${EMBER_JOB_NAMES[index]}`) : '',
  }));
  if (step === 'read') steps[0] = {...steps[0], state: 'open', button: 'Read Hollis’s note'};
  return {available: true, step, read: ember.read === true, steps,
    notes: [], sideJobs: jobs.includes(EMBER_JOBS[1]) ? SIDE_JOBS : [],
    ended: step === 'done' && ember.end === true};
}
