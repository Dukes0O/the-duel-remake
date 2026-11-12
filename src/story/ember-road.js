// The Everburn's screen state (docs/WASTELAND_WORLD.md section 5). Reads the
// save and returns plain display props; the app owns navigation and saving.
import {EMBER_JOBS, EMBER_FEUD_WORDS, EMBER_RUN_ROADS, emberOf, emberFeud, emberFeudWord, emberRuns} from './ember-save.js';

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

// RUN-GAS: how things stand with the Ash Men, one sentence for each word of the feud (docs/board/cards/RUN-GAS.md).
export const EMBER_FEUD_SENTENCES = Object.freeze([
  'The Ash Men are watching the Boneyard road.', 'The Ash Men are raiding the Boneyard road.',
  'The Ash Men are hunting Big Bess.', 'The Ash Men have gathered a war party.',
]);
export const emberFeudSentence = feud => EMBER_FEUD_SENTENCES[emberFeudWordIndex(feud)];
const emberFeudWordIndex = feud => EMBER_FEUD_WORDS.indexOf(emberFeudWord(feud));

// `runs`: the gas run is wanted (the scablands-runs switch is on). `runPay`: what each road pays now, {long, boneyard}.
export function emberStoryProps(profile, {available = false, runs = false, runPay = {}} = {}) {
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
  const props = {available: true, step, read: ember.read === true, steps,
    notes: [], sideJobs: jobs.includes(EMBER_JOBS[1]) ? SIDE_JOBS : [],
    ended: step === 'done' && ember.end === true};
  // The gas run: shown only with its switch on and the sixth job won. It never finishes, so it never carries a tick.
  if (runs === true && EMBER_JOBS.every(id => jobs.includes(id))) {
    const feud = emberFeud(profile);
    props.run = {feud, word: emberFeudWord(feud), sentence: emberFeudSentence(feud), runs: emberRuns(profile),
      roads: EMBER_RUN_ROADS.map(id => ({id, name: id === 'long' ? 'LONG ROAD' : 'BONEYARD ROAD', pay: runPay[id] ?? null}))};
  }
  return props;
}
