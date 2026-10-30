// STORY-KOGANE-SAVE: the Kogane Invitation's save (docs/story/kogane-invitation.md section 9). Memory-only.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const {createProfile, normalizeProfile, loadPlayers, savePlayers} = await import('../src/progression.js');
const {CARS} = await import('../src/config.js');
const {storyOf, koganeStep, readKoganeLetter, markKoganeLesson, markKoganeSupplies, markKoganeDuel, markKoganeAna,
  grantKoganeSkyline, normalizeStory, KOGANE_SKYLINE} = await import('../src/story/story-save.js');

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const has = (value, key) => Object.hasOwn(value, key);

const memory = () => {
  const values = new Map();
  return {get length() { return values.size; }, key: i => [...values.keys()][i] ?? null,
    getItem: k => values.get(String(k)) ?? null, setItem: (k, v) => values.set(String(k), String(v)),
    removeItem: k => values.delete(String(k)), clear: () => values.clear()};
};

// Old saves: no story field appears from loading, saving or reading.
const fresh = normalizeProfile({...createProfile(), credits: 1200, futureField: {keep: true}});
ok(!has(fresh, 'story'), 'a loaded old profile has no story');
same(normalizeProfile(fresh), fresh, 'an old profile loads again unchanged');
same(storyOf(fresh), {version: 1, kogane: {}}, 'no story reads as an empty one');
ok(!has(fresh, 'story'), 'reading a story adds nothing');
ok(koganeStep(fresh) === 'invite', 'a fresh player is at the invitation');
const storage = memory();
savePlayers({version: 2, activePlayerId: 'p', players: [{id: 'p', name: 'P', profile: fresh}]}, storage);
ok(!has(loadPlayers(storage).players[0].profile, 'story'), 'a save round trip adds no story');

// The first write creates the field; every writer leaves the profile it was given untouched.
const before = structuredClone(fresh);
const letter = readKoganeLetter(fresh);
ok(letter.ok && letter.changed, 'opening the letter writes');
same(letter.profile.story, {version: 1, kogane: {read: true}}, 'the first write makes the field');
same(fresh, before, 'the writer did not change the profile it was given');
same(letter.profile.futureField, {keep: true}, 'other fields are kept');
const letterAgain = readKoganeLetter(letter.profile);
ok(letterAgain.ok && !letterAgain.changed, 'opening it again changes nothing');
ok(koganeStep(letter.profile) === 'lesson', 'after the letter, the lesson');

// Order is enforced.
const skipSupplies = markKoganeSupplies(letter.profile);
ok(!skipSupplies.ok && !skipSupplies.changed && skipSupplies.profile === letter.profile && skipSupplies.reason, 'supplies wait for the lesson');
const lesson = markKoganeLesson(letter.profile);
ok(lesson.ok && lesson.changed && koganeStep(lesson.profile) === 'supplies', 'the lesson mark moves on to the delivery');
const skipDuel = markKoganeDuel(lesson.profile, 'easy');
ok(!skipDuel.ok && skipDuel.profile === lesson.profile, 'the duel waits for the supplies');
const supplies = markKoganeSupplies(lesson.profile);
ok(supplies.ok && supplies.changed && koganeStep(supplies.profile) === 'duel', 'supplies move on to the duel');
const skipAna = markKoganeAna(supplies.profile);
ok(!skipAna.ok && skipAna.profile === supplies.profile, 'Ana waits for the duel');
ok(!markKoganeDuel(supplies.profile, 'brutal').ok && !markKoganeDuel(supplies.profile, undefined).ok, 'an unknown level is refused');

// Marks only rise: the duel moves easy to medium to hard and never back.
let p = markKoganeDuel(supplies.profile, 'medium');
ok(p.ok && p.changed && p.profile.story.kogane.duel === 'medium', 'a medium win is kept');
const lower = markKoganeDuel(p.profile, 'easy');
ok(lower.ok && !lower.changed && lower.profile === p.profile && lower.profile.story.kogane.duel === 'medium', 'an easy win after medium changes nothing');
const sameLevel = markKoganeDuel(p.profile, 'medium');
ok(sameLevel.ok && !sameLevel.changed, 'the same level again changes nothing');
p = markKoganeDuel(p.profile, 'hard');
ok(p.changed && p.profile.story.kogane.duel === 'hard', 'a hard win raises it');
ok(koganeStep(p.profile) === 'ana', 'after the duel, Ana');
const ana = markKoganeAna(p.profile);
ok(ana.ok && ana.changed && koganeStep(ana.profile) === 'done', 'Ana finishes the chain');
const replay = [readKoganeLetter, markKoganeLesson, markKoganeSupplies, markKoganeAna].map(write => write(ana.profile));
ok(replay.every(r => r.ok && !r.changed && r.profile === ana.profile), 'replaying finished steps changes nothing');
ok(markKoganeDuel(ana.profile, 'easy').changed === false, 'a lower duel win after the end changes nothing');
same(ana.profile.story.kogane, {read: true, lesson: true, supplies: true, duel: 'hard', ana: true}, 'the finished player reads whole');

// The Skyline: just a car id, no copy kept in story.
ok(has(CARS, KOGANE_SKYLINE), 'the Skyline is in the car list in this build');
const owner = {...ana.profile, unlockedCars: [...ana.profile.unlockedCars]};
const granted = grantKoganeSkyline(owner);
ok(granted.ok && granted.changed && granted.owned === false && granted.profile.unlockedCars.includes(KOGANE_SKYLINE), 'the grant adds the car');
same(granted.profile.story, owner.story, 'the grant does not touch story');
ok(!owner.unlockedCars.includes(KOGANE_SKYLINE), 'the grant did not change the profile it was given');
const again = grantKoganeSkyline(granted.profile);
ok(again.ok && !again.changed && again.owned === true && again.profile === granted.profile, 'a player who owns it keeps it, the grant is a no-op');
ok(!has(grantKoganeSkyline(fresh).profile, 'story'), 'the grant adds no story');
const reloaded = normalizeProfile(granted.profile);
ok(reloaded.unlockedCars.includes(KOGANE_SKYLINE), 'the car survives a load');
same(reloaded.story, granted.profile.story, 'a finished story survives a load');

// Owned first: the player who already owned the Skyline before any story.
const ownedFirst = normalizeProfile({...createProfile(), unlockedCars: [KOGANE_SKYLINE]});
ok(ownedFirst.unlockedCars.includes(KOGANE_SKYLINE), 'a saved Skyline is kept on load');
ok(grantKoganeSkyline(ownedFirst).owned === true && !grantKoganeSkyline(ownedFirst).changed, 'owned before the story: no change');
ok(!has(ownedFirst, 'story'), 'owning the car does not make a story');

// A newer version is kept exactly, and no step is shown or written.
const newerStory = {version: 2, kogane: {read: true, lesson: 'maybe'}, shape: {x: [1]}};
const newerProfile = normalizeProfile({...createProfile(), story: newerStory});
same(newerProfile.story, newerStory, 'a newer story is kept exactly');
ok(koganeStep(newerProfile) === null, 'a newer story shows no step');
for (const result of [readKoganeLetter(newerProfile), markKoganeLesson(newerProfile), markKoganeSupplies(newerProfile),
  markKoganeAna(newerProfile), markKoganeDuel(newerProfile, 'hard')])
  ok(!result.ok && !result.changed && result.profile === newerProfile && result.reason, 'a newer story is never written');
same(normalizeProfile(newerProfile).story, newerStory, 'a newer story survives another load');

// Unknown names are kept; known flags are checked; a bad duel level is dropped; bad shapes read empty.
const checked = normalizeStory({version: 1, extra: {a: 1}, kogane: {read: 1, lesson: true, duel: 'brutal', later: [1], ana: 'yes'}});
same(checked, {version: 1, extra: {a: 1}, kogane: {read: false, lesson: true, later: [1], ana: false}}, 'unknown names kept, flags checked, bad level dropped');
for (const bad of [null, 7, 'x', [], {}, {version: 1.5}, {version: 0}, {version: 1, kogane: 'no'}])
  same(normalizeStory(bad), {version: 1, kogane: {}}, `a damaged story reads empty: ${JSON.stringify(bad)}`);
const skipped = normalizeProfile({...createProfile(), story: {version: 1, kogane: {supplies: true}}});
same(skipped.story.kogane, {supplies: true}, 'a hand-edited skip is not repaired');
ok(koganeStep(skipped) === 'invite' && !markKoganeAna(skipped).ok && !markKoganeSupplies(normalizeProfile({...createProfile(), story: {version: 1, kogane: {read: true}}})).ok, 'but no writer follows the skip');

// The fixture: a player part way through, with an older player gaining nothing.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/23-story-kogane.json', import.meta.url), 'utf8'));
const store = memory();
store.setItem('the-duel-players-v2', JSON.stringify(fixture.storage['the-duel-players-v2']));
const players = loadPlayers(store).players;
const halfWay = players.find(item => item.id === 'kogane-qa').profile, oldOne = players.find(item => item.id === 'kogane-old').profile;
ok(koganeStep(halfWay) === 'duel', 'the half-way player is at the duel');
same(halfWay.story.kogane.laterStep, {keep: true}, 'an unknown name inside kogane is kept');
ok(halfWay.heli.map.found.includes('kogane-pass-night'), 'the Night version is found');
ok(!halfWay.unlockedCars.includes(KOGANE_SKYLINE), 'the half-way player has no Skyline');
ok(!has(oldOne, 'story'), 'the older player gained no story');
savePlayers(loadPlayers(store), store);
same(loadPlayers(store).players.find(item => item.id === 'kogane-qa').profile.story, halfWay.story, 'the half-way story survives a save and load');
ok(markKoganeDuel(halfWay, 'easy').profile.story.kogane.laterStep.keep === true, 'a write keeps unknown names');
ok(!has(loadPlayers(store).players.find(item => item.id === 'kogane-old').profile, 'story'), 'the older player still has no story after saving');

// The Skyline is released (29 October 2026), so the car is in the ordinary build with no flag asked for. If the car were
// not in the table (a build without it), the grant refuses, and a saved id is dropped as for any unknown car: tested here by
// taking the car out of the table for a moment, since a switch cannot be turned off inside a running process.
{
  const kept = CARS[KOGANE_SKYLINE], profile = createProfile();
  const on = grantKoganeSkyline(profile);
  same([on.ok, on.changed, on.profile === profile], [true, true, false], 'with the car in the build the grant gives it');
  ok(normalizeProfile({...profile, unlockedCars: [KOGANE_SKYLINE]}).unlockedCars.includes(KOGANE_SKYLINE), 'a saved Skyline id is kept');
  delete CARS[KOGANE_SKYLINE];
  try {
    const grant = grantKoganeSkyline(profile);
    same([grant.ok, grant.changed, grant.profile === profile,
      normalizeProfile({...profile, unlockedCars: [KOGANE_SKYLINE]}).unlockedCars.includes(KOGANE_SKYLINE)],
    [false, false, true, false], 'with the car out of the build the grant refuses and a saved id is dropped');
  } finally { CARS[KOGANE_SKYLINE] = kept; }
}
console.log(`Story save: ${checks} checks passed using memory storage.`);
