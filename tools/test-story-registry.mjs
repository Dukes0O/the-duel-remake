// STORY-MULTI: more than one story. A throwaway story is registered in memory with data only (its save, its lines and its card), and the
// shared rules are checked on it: the save writes, the caption lookup, the radio, the cards and the chooser. Kogane is checked before,
// during and after, and must read exactly the same. Memory only: no storage, no browser.
import assert from 'node:assert/strict';

const {createProfile, normalizeProfile} = await import('../src/progression.js');
const save = await import('../src/story/story-save.js');
const lines = await import('../src/story/story-lines.js');
const ui = await import('../src/story/story-ui.js');
const {createStoryRadio} = await import('../src/story/story-radio.js');

let checks = 0;
const ok = (condition, label) => { assert.ok(condition, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const throws = (fn, label) => { assert.throws(fn, label); checks++; };

// Kogane as it reads now, to compare with while another story is registered and after it is gone.
const koganeSnapshot = () => {
  const fresh = createProfile();
  const lesson = save.markKoganeLesson(save.readKoganeLetter(fresh).profile);
  return {
    empty: save.storyOf(fresh).kogane,
    steps: [fresh, save.readKoganeLetter(fresh).profile, lesson.profile].map(save.koganeStep),
    written: save.readKoganeLetter(fresh).profile.story.kogane,
    refused: save.markKoganeSupplies(fresh).reason,
    normalized: (({kogane, extra}) => ({kogane, extra}))(save.normalizeStory({version: 1, extra: {a: 1}, kogane: {read: 1, duel: 'brutal', later: [1]}})),
    caption: lines.captionText('story.kogane.daichi.grid'),
    ana: lines.storySequence('kogane', 'ana'),
    card: ui.storyCardMarkup(ui.storyView({available: true, step: 'duel', read: true, skylineOwned: true})),
  };
};
const before = koganeSnapshot();
same(save.registeredStories().map(story => story.key), ['kogane'], 'Kogane is the one registered story today');
same(lines.storyLineKeys(), ['kogane'], 'and the only lines');
same(ui.storyCardKeys(), ['kogane'], 'and the only card');

// ---- The throwaway story: data only -------------------------------------------------------------------------------------
const KEY = 'testroad';
const CAPTION = 'story.testroad.hello';
save.registerStory({
  key: KEY,
  steps: ['note', 'job', 'done'],
  normalize: entry => {
    if (Object.hasOwn(entry, 'read')) entry.read = entry.read === true;
    if (Object.hasOwn(entry, 'jobs')) entry.jobs = Array.isArray(entry.jobs) ? entry.jobs.filter(job => typeof job === 'string') : [];
    return entry;
  },
  stepOf: entry => entry.read !== true ? 'note' : (entry.jobs?.length ?? 0) === 0 ? 'job' : 'done',
  writers: {
    read: entry => entry.read === true ? null : {read: true},
    job: (entry, id) => entry.read !== true ? 'Read the note first.' : (entry.jobs ?? []).includes(id) ? null : {jobs: [...(entry.jobs ?? []), id]},
  },
});
lines.registerStoryLines(KEY, {
  captions: {
    [CAPTION]: {who: 'Tester', where: 'The test', text: 'Hello from a story that was added with data only.', captionOnly: true},
    'story.testroad.bye': {who: 'Tester', where: 'The test', text: 'Goodbye.', captionOnly: true},
  },
  letter: {id: 'story.testroad.letter', text: 'Dear tester, this is a letter.', spoken: false},
  sequences: {end: [CAPTION, 'story.testroad.bye']},
});
ui.registerStoryCard({
  key: KEY,
  switch: 'test-road',
  eyebrow: 'THE TEST ROAD',
  heading: 'A NOTE FOR YOU.',
  letter: lines.storyLetter(KEY).text,
  steps: {
    job: {name: 'The test job', button: 'Start the job', open: 'Do the test job.', locked: 'Read the note first.'},
    done: {name: 'The end', open: 'Nothing more.', locked: 'Do the job first.'},
  },
  footer: () => '<p class="story-prize">THE TEST PRIZE</p>',
});

// 1. Registration is checked and never clashes.
throws(() => save.registerStory({key: 'kogane', steps: ['a'], stepOf: () => 'a'}), 'a second Kogane is refused');
throws(() => save.registerStory({key: 'Bad Key', steps: ['a'], stepOf: () => 'a'}), 'a bad key is refused');
throws(() => save.registerStory({key: 'nosteps', steps: [], stepOf: () => 'a'}), 'a story with no steps is refused');
throws(() => save.registerStory({key: 'nostep', steps: ['a']}), 'a story with no stepOf is refused');
throws(() => lines.registerStoryLines('other', {captions: {'story.kogane.sneaky': {text: 'x'}}}), 'lines may only use their own story\'s ids');
throws(() => lines.registerStoryLines(KEY, {captions: {}}), 'the same lines twice are refused');
throws(() => ui.registerStoryCard({key: 'nosteps', switch: 'x', steps: {}}), 'a card with no steps is refused');
same(save.registeredStories().map(story => story.key), ['kogane', KEY], 'both stories are registered, Kogane first');

// 2. The save: the same rules, with no change to the shared file.
const fresh = createProfile();
same(save.storyOf(fresh), {version: 1, kogane: {}, [KEY]: {}}, 'a player with no story reads every story as empty');
ok(!Object.hasOwn(fresh, 'story') && !Object.hasOwn(save.readKoganeLetter(fresh).profile.story, 'water'), 'reading adds nothing to the profile');
ok(save.storyStepOf(fresh, KEY) === 'note' && save.koganeStep(fresh) === 'invite', 'each story has its own step');
ok(save.storyStepOf(fresh, 'missing') === null, 'a story that is not registered has no step');

const wrote = save.writeStory(fresh, KEY, 'read');
ok(wrote.ok && wrote.changed, 'the first write works');
same(wrote.profile.story, {version: 1, kogane: {}, [KEY]: {read: true}}, 'the first write makes the field, with this story\'s mark only');
ok(!Object.hasOwn(fresh, 'story'), 'the profile given is not changed');
const again = save.writeStory(wrote.profile, KEY, 'read');
ok(again.ok && !again.changed && again.profile === wrote.profile, 'marks only rise: writing it again changes nothing');
const early = save.writeStory(fresh, KEY, 'job', 'a');
ok(!early.ok && !early.changed && early.profile === fresh && early.reason === 'Read the note first.', 'a refused write returns the same profile and the reason');
const job = save.writeStory(wrote.profile, KEY, 'job', 'a');
const job2 = save.writeStory(job.profile, KEY, 'job', 'b');
same(job2.profile.story[KEY], {read: true, jobs: ['a', 'b']}, 'a writer can take its own arguments');
ok(save.writeStory(job2.profile, KEY, 'job', 'a').changed === false, 'a job already won is not written again');
ok(save.storyStepOf(job.profile, KEY) === 'done' && save.koganeStep(job.profile) === 'invite', 'one story moving on leaves the other where it was');
ok(!save.writeStory(fresh, KEY, 'nothing').ok && !save.writeStory(fresh, 'missing', 'read').ok, 'an unknown writer or story is refused');
ok(!save.writeStory(null, KEY, 'read').ok, 'no player is refused');

// Kogane writes keep this story, and this story's writes keep Kogane.
const both = save.readKoganeLetter(job2.profile);
same(both.profile.story[KEY], job2.profile.story[KEY], 'a Kogane write leaves the other story as it was');
same(save.writeStory(both.profile, KEY, 'job', 'c').profile.story.kogane, {read: true}, 'a write to the other story leaves Kogane as it was');

// Unknown names and unknown stories are kept; this story's own names are checked.
const mixed = save.normalizeStory({version: 1, water: {read: true, jobs: ['sal']}, kogane: {read: true, later: 1},
  [KEY]: {read: 1, jobs: ['a', 7], extra: {x: 1}}});
same(mixed, {version: 1, water: {read: true, jobs: ['sal']}, kogane: {read: true, later: 1}, [KEY]: {read: false, jobs: ['a'], extra: {x: 1}}},
  'a story that is not registered survives; names are kept; known names are checked');
const profile = normalizeProfile({...createProfile(), story: {version: 1, kogane: {read: true}, [KEY]: {read: true, jobs: ['a']}}});
same(profile.story[KEY], {read: true, jobs: ['a']}, 'the profile loader keeps a registered story');
same(normalizeProfile(profile).story, profile.story, 'and loads it again unchanged');

// A newer version is kept exactly and never written, for every story.
const newerStory = {version: 2, [KEY]: {read: 'maybe'}, shape: [1]};
const newerProfile = normalizeProfile({...createProfile(), story: newerStory});
same(newerProfile.story, newerStory, 'a newer story is kept exactly');
ok(save.storyStepOf(newerProfile, KEY) === null && save.koganeStep(newerProfile) === null, 'and shows no step in any story');
ok(!save.writeStory(newerProfile, KEY, 'read').ok && !save.readKoganeLetter(newerProfile).ok, 'and is never written');

// 3. The lines: one lookup across stories.
ok(lines.captionText(CAPTION) === 'Hello from a story that was added with data only.', 'the new caption is found');
ok(lines.captionText('story.kogane.daichi.grid') === before.caption, 'and Kogane\'s caption is found as before');
ok(lines.captionText('story.testroad.letter') === null && lines.captionText('story.nowhere.x') === null, 'a letter and an unknown id are not captions');
same(lines.storyLineKeys(), ['kogane', KEY], 'both sets of lines are registered');
same(lines.storySequence(KEY, 'end'), [CAPTION, 'story.testroad.bye'], 'a story\'s sequence is found by key');
ok(lines.storySequence(KEY, 'none') === null && lines.storyLetter('missing') === null, 'a missing sequence or letter is null');

// 4. The radio asks the lookup, not Kogane.
{
  const log = [], timers = [];
  const radio = createStoryRadio({show: (id, text) => log.push('show ' + id), hide: id => log.push('hide ' + id),
    schedule: (callback, ms) => { timers.push(callback); return timers.length; }, cancel: () => {}});
  ok(radio.say(CAPTION) && radio.playing === CAPTION && log[0] === 'show ' + CAPTION, 'the radio plays the new story\'s caption');
  radio.stop();
  ok(radio.saySequence(KEY, 'end') && radio.playing === CAPTION, 'and plays its named sequence in order');
  radio.stop();
  ok(radio.saySequence(KEY, 'none') === false && radio.say('story.nowhere.x') === false, 'an unknown sequence or caption plays nothing');
  radio.dispose();
}

// 5. The cards: one for each story the player can see; a chooser when more than one.
const props = (step, extra = {}) => ({available: true, step, read: true, steps: [], ...extra});
ok(ui.storyView(props('job'), KEY)?.key === KEY && ui.storyView(props('job'), 'missing') === null, 'a view belongs to its story');
const card = ui.storyCardMarkup(ui.storyView(props('job'), KEY));
ok(card.includes('THE TEST ROAD') && card.includes('Dear tester, this is a letter.') && card.includes('Start the job') && card.includes('THE TEST PRIZE'),
  'the new story\'s card is drawn from its data');
ok(!card.includes('Kogane') && !card.includes('Daichi'), 'and carries nothing of Kogane\'s');
ok(ui.storyCardMarkup(ui.storyView({available: true, step: 'duel', read: true, skylineOwned: true})) === before.card, 'Kogane\'s card reads the same as before');
ok(ui.storyGaragePanel(ui.storyView(props('job'), KEY)) === '', 'the Kogane garage panel never shows for another story');

function fakeDocument() {
  const make = () => {
    const listeners = {};
    return {className: '', innerHTML: '', children: [], parent: null, ownerDocument: null,
      addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
      fire(type, event) { for (const fn of listeners[type] ?? []) fn(event); },
      querySelector() { return null; },
      append(child) { child.parent = this; this.children.push(child); },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }};
  };
  const doc = {make, createElement: () => { const el = make(); el.ownerDocument = doc; return el; }};
  return doc;
}
const node = (attr, value = '') => ({hasAttribute: name => name === attr, disabled: false,
  dataset: attr === 'data-story-step' ? {storyStep: value} : attr === 'data-story-choose' ? {storyChoose: value} : {}});
const click = (layer, target) => layer.fire('click', {target: {closest: () => target}});
const stubApp = (switches, byKey) => {
  const calls = [];
  return {calls, _switches: () => ({enabled: name => switches.includes(name)}), duel: {state: {status: 'menu'}},
    storyProps: key => byKey[key], openStory: key => calls.push('open ' + key), startStoryDuel: () => { calls.push('duel'); return true; }};
};
const koganeProps = props('lesson', {steps: [{id: 'lesson', state: 'open'}, {id: 'supplies', state: 'locked'}], read: false});
{
  // One story visible: no chooser, the card opens straight away (as it always did).
  const app = stubApp(['kogane-invitation'], {kogane: koganeProps, [KEY]: props('job')});
  const host = fakeDocument().make(); host.ownerDocument = fakeDocument();
  const story = ui.createStoryUi({host, app});
  ok(ui.storyOn(app) && ui.storyOn(app, 'kogane') && !ui.storyOn(app, KEY), 'the switch of each story is its own');
  ok(story.open() && story.isOpen && host.children[0].innerHTML.includes('THE KOGANE INVITATION') && !host.children[0].innerHTML.includes('story-chooser'), 'one visible story opens its card');
  ok(app.calls.join() === 'open kogane', 'and reads only that story\'s letter');
  story.close();
  same(story.views().map(view => view.key), ['kogane'], 'one story is visible');
}
{
  // Both visible: a chooser, then the chosen card; each story's letter is read only when its own card opens.
  const app = stubApp(['kogane-invitation', 'test-road'], {kogane: koganeProps, [KEY]: props('job')});
  const host = fakeDocument().make(); host.ownerDocument = fakeDocument();
  const moves = [];
  const story = ui.createStoryUi({host, app, actions: {[`${KEY}.job`]: () => moves.push('test job'), job: () => moves.push('plain job')}});
  same(story.views().map(view => view.key), ['kogane', KEY], 'both stories are visible');
  ok(story.view().key === 'kogane' && story.view().message === true, 'the menu button draws from the first story, with a dot if any has a message');
  ok(story.open() && host.children.length === 1 && host.children[0].innerHTML.includes('story-chooser'), 'two visible stories open the chooser');
  ok(host.children[0].innerHTML.includes('data-story-choose="kogane"') && host.children[0].innerHTML.includes(`data-story-choose="${KEY}"`), 'with a button for each');
  ok(app.calls.length === 0, 'the chooser reads no letter');
  click(host.children[0], node('data-story-choose', KEY));
  ok(host.children.length === 1 && host.children[0].innerHTML.includes('THE TEST ROAD') && story.isOpen, 'choosing a story opens its card, and only that one');
  ok(app.calls.join() === 'open testroad', 'and reads that story\'s letter');
  click(host.children[0], node('data-story-step', 'job'));
  ok(!story.isOpen && moves.join() === 'test job', 'a step button runs the action named for its story first');
  ok(story.open(KEY) && host.children[0].innerHTML.includes('THE TEST ROAD'), 'open(key) goes straight to that card');
  host.children[0].fire('keydown', {key: 'Escape', stopPropagation() {}});
  ok(!story.isOpen, 'Escape closes it');
  ok(story.open('kogane') && host.children[0].innerHTML.includes('THE KOGANE INVITATION'), 'and Kogane\'s card opens by key');
  story.dispose();
  ok(host.children.length === 0, 'dispose takes the card off');
  // One story hides: the chooser goes away.
  const alone = stubApp(['test-road'], {kogane: koganeProps, [KEY]: props('job')});
  const aloneHost = fakeDocument().make(); aloneHost.ownerDocument = fakeDocument();
  ok(ui.createStoryUi({host: aloneHost, app: alone}).open() && aloneHost.children[0].innerHTML.includes('THE TEST ROAD') && alone.calls.join() === 'open testroad',
    'only the new story visible: its card opens at once');
  const nothing = stubApp(['kogane-invitation', 'test-road'], {kogane: {available: false}, [KEY]: undefined});
  ok(ui.createStoryUi({host: aloneHost, app: nothing}).open() === false, 'nothing to show: nothing opens');
}
ok(ui.storyChooserMarkup([]) === '', 'no stories, no chooser');
ok(ui.storyChooserMarkup([ui.storyView(props('job'), KEY)]) === '', 'a chooser is only drawn for two or more stories');

// Kogane did not change while the other story was there.
same(koganeSnapshot(), before, 'Kogane reads exactly as before while another story is registered');

// ---- Gone again ---------------------------------------------------------------------------------------------------------
ok(save.unregisterStory(KEY) && lines.unregisterStoryLines(KEY) && ui.unregisterStoryCard(KEY), 'the throwaway story is taken out again');
same(save.registeredStories().map(story => story.key), ['kogane'], 'only Kogane is left');
same(lines.captionText(CAPTION), null, 'its captions are gone');
same(koganeSnapshot(), before, 'and Kogane reads exactly as it did at the start');
same(save.storyOf(createProfile()), {version: 1, kogane: {}}, 'an empty story is Kogane\'s alone again');

console.log(`test-story-registry: ${checks} checks passed`);
