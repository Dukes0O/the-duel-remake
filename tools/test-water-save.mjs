// WATER-SAVE: profile.story.water (docs/story/wasteland-water-road.md section 9). Memory only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createProfile, normalizeProfile, loadPlayers, savePlayers} from '../src/progression.js';
import {storyOf, normalizeStory, readKoganeLetter, koganeStep} from '../src/story/story-save.js';
import {WATER_CHAPTERS, WATER_NOTE_COUNT, waterOf, waterChapter, waterChapterDone, waterChapterOpen, waterJobDone,
  waterNotesDue, readWaterNote, markWaterJob, markWaterNotes, markWaterEnd} from '../src/story/water-save.js';
import {WARLORD_LADDER} from '../src/warlords.js';

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const has = (value, key) => Object.hasOwn(value ?? {}, key);
const memory = () => { const data = new Map(); return {getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key)}; };
const beat = (profile, ...ids) => {
  const wasteland = {...profile.wasteland, discoveredGate: true, warlords: {...profile.wasteland.warlords}};
  for (const id of ids) wasteland.warlords[id] = {...wasteland.warlords[id], defeated: true};
  return {...profile, wasteland};
};

// The chapters: the dry well, then one for each warlord in ladder order; the Baron's has no job.
same(WATER_CHAPTERS.map(chapter => chapter.warlordId), [null, ...WARLORD_LADDER], 'chapter n is the n-th warlord on the ladder');
same(WATER_CHAPTERS.map(chapter => chapter.job?.mode ?? null),
  [null, 'wasteland', 'fuel-run', 'bounty-hunt', 'ambush-alley', 'last-car-rolling', 'wasteland', 'convoy-raid', null], 'each job is a mode the player knows');
same(WATER_CHAPTERS[1].job.courses, ['pacific-canyon', 'red-mesa'], 'chapter 1 is on Sal\'s roads');
same(WATER_CHAPTERS[6].job.courses, ['alpine-serpent'], 'chapter 6 is on Alpine Serpent');

// Optional: reading makes nothing; a new player is at chapter 0.
const fresh = createProfile();
ok(!has(fresh, 'story'), 'a new player has no story');
same(waterOf(fresh), {}, 'the Water Road reads as empty');
ok(!has(fresh, 'story'), 'reading adds nothing');
same(waterChapter(fresh), 0, 'a new player starts at the dry well');
ok(waterChapterOpen(fresh, 0) && !waterChapterOpen(fresh, 1), 'only chapter 0 is open');
ok(!markWaterJob(fresh, 'sal').ok, 'no job before the note is read');

// The first write makes the field, with the Water Road's mark only.
const read = readWaterNote(fresh);
ok(read.ok && read.changed, 'reading the note is the first write');
same(read.profile.story, {version: 1, water: {read: true}}, 'the field holds only the Water Road');
ok(!has(fresh, 'story'), 'the profile given is not changed');
ok(!readWaterNote(read.profile).changed, 'reading again changes nothing');
same(waterChapter(read.profile), 1, 'chapter 1 opens');

// Jobs: only for an open chapter, in the order won, never twice.
const salJob = markWaterJob(read.profile, 'sal');
ok(salJob.changed && waterJobDone(salJob.profile, 1), 'Sal\'s job is won as the story\'s job');
same(waterOf(salJob.profile).jobs, ['sal'], 'jobs keep their order');
ok(!markWaterJob(salJob.profile, 'sal').changed, 'never twice');
ok(!markWaterJob(salJob.profile, 'dustmonger').ok, 'a job ahead of the story is refused');
ok(!markWaterJob(salJob.profile, 'blackiron').ok, 'the Baron\'s chapter has no job');
ok(!markWaterJob(salJob.profile, 'nobody').ok, 'an unknown warlord has no job');
same(waterChapter(salJob.profile), 1, 'the job alone does not finish the chapter');

// A chapter is done when its warlord is beaten in the career: read, never copied.
const salDown = beat(salJob.profile, 'sal');
ok(waterChapterDone(salDown, 1) && waterChapter(salDown) === 2, 'beating Sal finishes chapter 1');
same(waterOf(salDown), waterOf(salJob.profile), 'the defeat is not copied into the story');
ok(markWaterJob(salDown, 'dustmonger').changed, 'chapter 2\'s job may now be won');
same(waterNotesDue(salDown), 1, 'one note from V. is due');

// Warlords already beaten count: their jobs are done without playing them.
const veteran = beat(readWaterNote(createProfile()).profile, 'sal', 'dustmonger', 'mirage');
ok([1, 2, 3].every(n => waterChapterDone(veteran, n) && waterJobDone(veteran, n)), 'beaten warlords tick their chapter and job');
same(waterOf(veteran).jobs, undefined, 'nothing is written for them');
same(waterChapter(veteran), 4, 'the story picks up at Gunn');
ok(markWaterJob(veteran, 'gunn').changed, 'Gunn\'s job is the next one');

// Notes: the count only rises, and only up to seven.
const noted = markWaterNotes(salDown, 1);
ok(noted.changed && waterOf(noted.profile).notes === 1, 'one note shown');
ok(!markWaterNotes(noted.profile, 0).changed, 'the count never falls');
ok(!markWaterNotes(noted.profile, WATER_NOTE_COUNT + 1).ok, 'there are only seven notes');
ok(!markWaterNotes(noted.profile, 1.5).ok, 'a count is a whole number');

// The end: only after the Baron, once.
ok(!markWaterEnd(veteran).ok, 'no end before the Baron');
const finished = beat(readWaterNote(createProfile()).profile, ...WARLORD_LADDER);
same(waterChapter(finished), WATER_CHAPTERS.length, 'a finished player is past chapter 8');
same(waterNotesDue(finished), 7, 'all seven notes are due');
ok(WATER_CHAPTERS.slice(1, 8).every(chapter => waterJobDone(finished, chapter.n)), 'every job is ticked');
const ended = markWaterEnd(finished);
ok(ended.changed && waterOf(ended.profile).end === true, 'the end lines are marked');
ok(!markWaterEnd(ended.profile).changed, 'once');

// Only the Water Road is written: Kogane, other stories and unknown names stay exactly as saved.
{
  const both = {...createProfile(), story: {version: 1, kogane: {read: true, later: 1}, laterStory: {keep: [1]}}};
  const out = readWaterNote(both).profile.story;
  same(out.kogane, both.story.kogane, 'Kogane is untouched');
  same(out.laterStory, both.story.laterStory, 'an unknown story is kept');
  const kogane = readKoganeLetter(createProfile()).profile;
  ok(!has(kogane.story, 'water'), 'a Kogane write does not add the Water Road');
  same(koganeStep(readWaterNote(kogane).profile), koganeStep(kogane), 'Kogane\'s step is the same after a Water Road write');
}

// Normalizing: saved names are checked, absent names stay absent, unknown names are kept.
{
  const odd = normalizeStory({version: 1, water: {read: 'yes', end: 1, jobs: ['sal', 'sal', 3, 'gratian-nine'], notes: 99, keep: {a: 1}}}).water;
  same(odd, {read: false, end: false, jobs: ['sal', 'gratian-nine'], notes: 99, keep: {a: 1}}, 'checked and kept (a higher count from a later build stays)');
  same(readWaterNote({...createProfile(), story: {version: 1, water: {notes: 9}}}).profile.story.water.notes, 9, 'a write never lowers a saved count');
  same(normalizeStory({version: 1, water: {notes: -1}}).water, {}, 'a broken count is dropped');
  same(normalizeStory({version: 1, water: {jobs: 'sal'}}).water, {jobs: []}, 'a broken job list reads as none');
  ok(!has(normalizeStory({version: 1, kogane: {}}), 'water'), 'loading does not add the Water Road');
}

// A newer game's story is kept exactly and never written.
{
  const newer = {...beat(createProfile(), 'sal'), story: {version: 2, water: {read: true, future: 1}}};
  ok(!readWaterNote(newer).ok && !markWaterJob(newer, 'sal').ok && !markWaterNotes(newer, 1).ok && !markWaterEnd(newer).ok, 'every writer refuses');
  same(waterChapter(newer), null, 'no chapter is shown');
  for (const bare of [{...createProfile(), story: {version: 2}}, {...createProfile(), story: {version: 3, water: null}}]) {
    ok(!markWaterJob(bare, 'sal').ok && !waterChapterDone(bare, 0) && !waterJobDone(bare, 1), 'a newer story without a Water Road entry is refused, not a crash');
    same(markWaterEnd(bare).reason, 'This story belongs to a newer version of the game.', 'and says why');
  }
  same(normalizeProfile(newer).story, newer.story, 'the newer story is kept exactly');
}

// The fixture: a player part way along, a Kogane-only player and an older player.
{
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/24-story-water.json', import.meta.url), 'utf8'));
  const store = memory();
  store.setItem('the-duel-players-v2', JSON.stringify(fixture.storage['the-duel-players-v2']));
  const players = loadPlayers(store).players, of = id => players.find(item => item.id === id).profile;
  const half = of('water-qa');
  same(waterChapter(half), 3, 'the half-way player is at Mother Mirage');
  ok(waterJobDone(half, 1) && waterJobDone(half, 2) && !waterJobDone(half, 3), 'jobs: Sal won, Dustmonger by his defeat, Mirage still to do');
  same(half.story.water.laterMark, {keep: true}, 'an unknown name inside the Water Road is kept');
  same(half.story.laterStory, {keep: [1, 2]}, 'an unknown story is kept');
  ok(!has(of('water-kogane-only').story, 'water'), 'a Kogane-only player gains no Water Road on load');
  ok(!has(of('water-old'), 'story'), 'the older player gains no story');
  savePlayers(loadPlayers(store), store);
  same(loadPlayers(store).players.find(item => item.id === 'water-qa').profile.story, half.story, 'the story survives a save and load');
  ok(!has(loadPlayers(store).players.find(item => item.id === 'water-kogane-only').profile.story, 'water'), 'and saving adds no Water Road either');
}

// Nothing outside story.water is written by the story.
{
  const before = beat(readWaterNote(createProfile()).profile, 'sal');
  const after = markWaterNotes(markWaterJob(before, 'dustmonger').profile, 1).profile;
  same({...after, story: null}, {...before, story: null}, 'scrap, XP, hold and warlord records are untouched');
}

console.log(`test-water-save: ${checks} checks passed`);
