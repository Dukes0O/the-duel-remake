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

function normalizeEmber(ember) {
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
  },
});

export const emberOf = profile => storyIsNewer(profile) ? {} : storyOf(profile)[EMBER_KEY] ?? {};

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
