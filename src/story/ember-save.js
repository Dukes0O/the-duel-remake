// The Everburn's optional save marks. Pure profile operations; loading alone
// does not add the story, and earning never mutates the profile it receives.
import {getProfileWeapons, getSavedProfileWeapons} from '../weapon-upgrades.js';
import {registerStory, storyIsNewer, storyOf, writeStory} from './story-save.js';

export const EMBER_KEY = 'ember';
export const EMBER_JOBS = Object.freeze([
  'hot-delivery', 'get-out-and-walk', 'run-him-down',
  'slow-ride', 'key-under-the-mall', 'the-everburn',
]);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

// RUN-GAS: the Ash Men's feud with the player's town, 1 to 4, and how many gas runs have arrived. A save that has neither
// reads as Raiding and 0; a damaged value is repaired to the same. Only a saved value is checked, so an older save is read
// exactly as before and loading never adds either name.
export const EMBER_FEUD_WORDS = Object.freeze(['Watching', 'Raiding', 'Hunting', 'War party']);
export const EMBER_FEUD_START = 2;
export const EMBER_RUN_ROADS = Object.freeze(['long', 'boneyard']);
const validFeud = value => Number.isSafeInteger(value) && value >= 1 && value <= EMBER_FEUD_WORDS.length;
const validRuns = value => Number.isSafeInteger(value) && value >= 0;

function normalizeEmber(ember) {
  if (Object.hasOwn(ember, 'feud') && !validFeud(ember.feud)) ember.feud = EMBER_FEUD_START;
  if (Object.hasOwn(ember, 'runs') && !validRuns(ember.runs)) ember.runs = 0;
  if (Object.hasOwn(ember, 'read')) ember.read = ember.read === true;
  if (Object.hasOwn(ember, 'end')) ember.end = ember.end === true;
  if (Object.hasOwn(ember, 'jobs')) ember.jobs = Array.isArray(ember.jobs)
    ? ember.jobs.filter((id, index, list) => typeof id === 'string' && id && list.indexOf(id) === index)
    : [];
  return ember;
}

registerStory({
  key: EMBER_KEY,
  steps: ['read', ...EMBER_JOBS, 'end'],
  normalize: normalizeEmber,
  stepOf: ember => ember.read !== true ? 'read'
    : EMBER_JOBS.find(id => !(ember.jobs ?? []).includes(id)) ?? 'end',
  writers: {
    read: ember => ember.read === true ? null : {read: true},
    job: (ember, id) => {
      const index = EMBER_JOBS.indexOf(id);
      if (ember.read !== true) return 'Read Hollis\'s note first.';
      if (index < 0) return 'That Everburn job is not in this story.';
      if (index > 0 && !(ember.jobs ?? []).includes(EMBER_JOBS[index - 1]))
        return 'Finish the earlier Everburn job first.';
      return (ember.jobs ?? []).includes(id) ? null : {jobs: [...(ember.jobs ?? []), id]};
    },
    end: ember => ember.read !== true ? 'Read Hollis\'s note first.'
      : !EMBER_JOBS.every(id => (ember.jobs ?? []).includes(id))
        ? 'Finish all six Everburn jobs first.' : ember.end === true ? null : {end: true},
    // A gas run arrived by this road: the feud moves one step (up for the Boneyard road, down for the long road, within
    // Watching and War party) and the count of runs rises by one.
    run: (ember, road) => {
      if (!EMBER_RUN_ROADS.includes(road)) return 'That road is not on the map.';
      if (!EMBER_JOBS.every(id => (ember.jobs ?? []).includes(id))) return 'Finish all six Everburn jobs first.';
      const feud = emberFeudOf(ember), runs = emberRunsOf(ember);
      return {feud: Math.max(1, Math.min(EMBER_FEUD_WORDS.length, feud + (road === 'boneyard' ? 1 : -1))), runs: runs + 1};
    },
  },
});

export const emberOf = profile => storyIsNewer(profile) ? {} : storyOf(profile)[EMBER_KEY] ?? {};

// The feud (1 to 4) and the runs arrived (0 or more) in an Everburn entry; missing or damaged values read as Raiding and 0.
function emberFeudOf(ember) { return validFeud(ember?.feud) ? ember.feud : EMBER_FEUD_START; }
function emberRunsOf(ember) { return validRuns(ember?.runs) ? ember.runs : 0; }
export const emberFeud = profile => emberFeudOf(emberOf(profile));
export const emberRuns = profile => emberRunsOf(emberOf(profile));
export const emberFeudWord = feud => EMBER_FEUD_WORDS[(validFeud(feud) ? feud : EMBER_FEUD_START) - 1];

// A run arrived by `road` ('long' or 'boneyard'). Pure: the profile it is given is never changed. The result says the feud
// before and after, so the screens can tell when it has just reached War party. A run that does not arrive writes nothing,
// so nothing calls this for one.
export function applyArrivedRun(profile, road) {
  const before = emberFeud(profile);
  const written = writeStory(profile, EMBER_KEY, 'run', road);
  const after = written.ok ? emberFeud(written.profile) : before;
  return {...written, feudBefore: before, feudAfter: after, runs: written.ok ? emberRuns(written.profile) : emberRuns(profile),
    reachedWarParty: written.ok && before < EMBER_FEUD_WORDS.length && after === EMBER_FEUD_WORDS.length};
}

function grantJobReward(profile, jobId) {
  // A save from a newer Wasteland build belongs to that build. Never edit or
  // downgrade its career schema while applying this older reward path.
  if (Number.isSafeInteger(profile?.wasteland?.version) && profile.wasteland.version > 1) return profile;
  if (jobId === EMBER_JOBS[2]) {
    const saved = getSavedProfileWeapons(profile);
    if (!getProfileWeapons(profile).unlocked.includes('flamethrower')) {
      const weapons = {...saved, unlocked: [...saved.unlocked, 'flamethrower'],
        levels: {...saved.levels, flamethrower: saved.levels.flamethrower ?? 0}};
      return {...profile, wasteland: {...profile.wasteland, version: 1, weapons}};
    }
  }
  if (jobId === EMBER_JOBS[5]) {
    const current = object(profile.wasteland?.crew) ? profile.wasteland.crew : {};
    const unlocked = Array.isArray(current.unlocked) ? current.unlocked : [];
    if (!unlocked.includes('cinder')) return {...profile, wasteland: {
      ...profile.wasteland, version: 1,
      crew: {...current, unlocked: [...unlocked, 'cinder']},
    }};
  }
  return profile;
}

// Marks a completed job and applies its permanent reward once. Job 1's
// temporary flamethrower is supplied by the job loadout and never saved here.
export function markEmberJob(profile, jobId) {
  if (Number.isSafeInteger(profile?.wasteland?.version) && profile.wasteland.version > 1)
    return {ok: false, changed: false, profile, reason: 'This career needs a newer game build.'};
  const marked = writeStory(profile, EMBER_KEY, 'job', jobId);
  if (!marked.ok) return marked;
  const rewarded = grantJobReward(marked.profile, jobId);
  return {...marked, profile: rewarded, changed: marked.changed || rewarded !== marked.profile};
}

export const markEmberRead = profile => writeStory(profile, EMBER_KEY, 'read');
export const markEmberEnd = profile => writeStory(profile, EMBER_KEY, 'end');
