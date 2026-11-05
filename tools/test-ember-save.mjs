// WW-SAVE: memory-only story and world progress.
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createProfile, loadPlayers, normalizeProfile, savePlayers} from '../src/progression.js';
import {getProfileWeapons} from '../src/weapon-upgrades.js';
import {emberOf, markEmberRead, markEmberJob, markEmberEnd} from '../src/story/ember-save.js';
import {normalizeWorld, rememberWorldFound, worldOf} from '../src/world/world-save.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const has = (value, key) => Object.hasOwn(value ?? {}, key);
const memory = () => { const data = new Map(); return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key)}; };

// Reads are views: a legacy career gains neither story nor world fields.
const fresh = createProfile();
same(emberOf(fresh), {}, 'an empty ember story reads as empty');
same(worldOf(fresh), {}, 'an empty world reads as empty');
ok(!has(fresh, 'story') && !has(fresh, 'world'), 'reading does not add optional save fields');

// Story marks rise and keep unknown names on normalize and write.
const read = markEmberRead(fresh);
ok(read.ok && read.changed, 'reading the note is saved once');
same(read.profile.story, {version: 1, ember: {read: true}}, 'first write creates only the Everburn entry');
ok(!markEmberRead(read.profile).changed, 'reading twice changes nothing');
let marked = markEmberJob(read.profile, 'hot-delivery');
marked = markEmberJob(marked.profile, 'get-out-and-walk');
marked = markEmberJob(marked.profile, 'run-him-down');
ok(marked.ok && marked.changed, 'job marks are saved by id');
marked = markEmberJob(marked.profile, 'run-him-down');
ok(!marked.changed, 'earning a job twice changes nothing');
const unknown = {...marked.profile, story: {...marked.profile.story, ember: {...marked.profile.story.ember, jobs: ['run-him-down', 'future-job'], mystery: {keep: true}}}};
same(emberOf(unknown).jobs, ['run-him-down', 'future-job'], 'unknown job names survive reading');
same(emberOf({...unknown, story: {...unknown.story, ember: {...unknown.story.ember, read: false}}}).read, false,
  'normalization checks known marks without adding unknowns');
const older = markEmberJob(unknown, 'hot-delivery');
same(older.profile.story.ember.jobs, ['run-him-down', 'future-job', 'hot-delivery'], 'a write never drops later job marks');
let allJobs = read.profile;
for (const id of ['hot-delivery', 'get-out-and-walk', 'run-him-down', 'slow-ride', 'key-under-the-mall', 'the-everburn'])
  allJobs = markEmberJob(allJobs, id).profile;
const ended = markEmberEnd(allJobs);
ok(ended.changed && !markEmberEnd(ended.profile).changed, 'the ending mark is saved once');
same(emberOf({...read.profile, story: {version: 2, ember: {read: true, jobs: ['future']}}}), {},
  'a newer story is not shown by this build');

// A lent weapon belongs to the current job only. It never changes the profile.
const beforeLoan = JSON.stringify(read.profile);
const loaned = markEmberJob(read.profile, 'hot-delivery');
same(JSON.stringify(read.profile), beforeLoan, 'finishing a job with a loaned flamethrower does not mutate the given profile');
ok(!getProfileWeapons(read.profile).unlocked.includes('flamethrower'), 'the loan is not an earned unlock');
ok(loaned.changed, 'finishing job 1 records the story mark');

// Job 3 earns the flamethrower through the saved weapon list; job 6 earns Cinder through crew ownership.
let career = read.profile;
for (const id of ['hot-delivery', 'get-out-and-walk', 'run-him-down']) career = markEmberJob(career, id).profile;
ok(getProfileWeapons(career).unlocked.includes('flamethrower'), 'job 3 unlocks the flamethrower through profile weapons');
const afterFlamer = career;
career = markEmberJob(career, 'run-him-down').profile;
same(career, afterFlamer, 'earning the flamethrower twice changes nothing');
for (const id of ['slow-ride', 'key-under-the-mall', 'the-everburn']) career = markEmberJob(career, id).profile;
ok(career.wasteland.crew.unlocked.includes('cinder'), 'job 6 adds Cinder to the existing crew unlock list');
const afterCinder = career;
career = markEmberJob(career, 'the-everburn').profile;
same(career, afterCinder, 'earning Cinder twice changes nothing');
{
  const future = {...read.profile, wasteland: {...read.profile.wasteland, version: 2}};
  const result = markEmberJob(future, 'run-him-down');
  ok(!result.ok && !result.changed, 'a future Wasteland career refuses an older reward write');
  same(result.profile.wasteland.version, 2, 'the future career version is preserved');
}

// World discoveries are an additive union and keep unknown fields and names.
const worldBase = {...createProfile(), world: {found: ['old-place', 'mystery-find'], later: {keep: 1}}};
const worldNormalized = normalizeWorld(worldBase.world);
same(worldNormalized.found, ['old-place', 'mystery-find'], 'world normalization keeps unknown discoveries');
const found = rememberWorldFound(worldBase, 'tin-town');
same(found.world.found, ['old-place', 'mystery-find', 'tin-town'], 'world finds only grow');
same(rememberWorldFound(found, 'old-place'), found, 'finding the same place twice changes nothing');
same(found.world.later, {keep: 1}, 'unknown world data survives a discovery');
same(normalizeWorld({found: ['tin-town', 'tin-town', 3, 'future-place']}).found,
  ['tin-town', 'future-place'], 'normalization removes invalid and duplicate ids');

// Legacy fixtures have no new keys; a memory-only load/save round-trip preserves them.
{
  const fixtures = readdirSync(new URL('./fixtures/saves/', import.meta.url))
    .filter(name => name.endsWith('.json')).sort();
  for (const name of fixtures) {
    const fixture = JSON.parse(readFileSync(new URL(`./fixtures/saves/${name}`, import.meta.url), 'utf8'));
    const storage = memory();
    const key = 'the-duel-players-v2';
    storage.setItem(key, JSON.stringify(fixture.storage[key]));
    const loaded = loadPlayers(storage);
    const first = loaded.players.map(player => normalizeProfile(player.profile));
    savePlayers(loaded, storage);
    const reloaded = loadPlayers(storage);
    same(reloaded.players.map(player => player.profile), first, `${name} load/save round-trips unchanged`);
  }
}

console.log(`test-ember-save: ${checks} checks passed`);
