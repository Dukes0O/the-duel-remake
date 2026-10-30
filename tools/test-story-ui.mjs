// STORY-KOGANE-SCREENS (docs/story/kogane-invitation.md sections 3 and 12): the Story card, the menu button and its
// red dot, the front door entry, the garage panel and plaque, Daichi's lines on the results screen, the Deep log's lead
// line and the Skyline hidden until owned. Plain objects and a tiny stand-in page; memory-only; nothing real is read or
// written. The app's story object is a stub of the shape section 12.1 gives, because the hooks card writes the real one.
// The Skyline car only exists in the game's preview roster, so those checks run again in a fresh process (--preview).
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const preview = process.argv.includes('--preview');
if (preview) {
  globalThis.__DUEL_QA__ = true;
  globalThis.location = {search: '?flags=nissan-skyline'};
}
globalThis.localStorage = {getItem: () => null, setItem() {}};

const {FEATURE_STATES, createFeatureFlags} = await import('../src/feature-flags.js');
const {CARS} = await import('../src/config.js');
const {createProfile} = await import('../src/progression.js');
const ui = await import('../src/story/story-ui.js');
const {KOGANE_SKYLINE} = await import('../src/story/story-save.js');
const {captionText, STORY_LETTER} = await import('../src/story/story-lines.js');
const {screenMarkup, createMenuScreen} = await import('../src/screen-menu.js');
const {createGarageScreen} = await import('../src/screen-garage.js');
const {createArmoryScreen} = await import('../src/screen-armory.js');
const {createLeaderboardScreen} = await import('../src/screen-leaderboard.js');
const {createResultsScreen} = await import('../src/screen-results.js');
const {frontDoorFacts, chooseNextUp, nextUpMarkup, doorList} = await import('../src/menu-front-door.js');
const {shownCars, shownCarIds, isShownCar, wonCars} = await import('../src/earned-cars-ui.js');

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const eq = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const text = html => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/\s+/g, ' ').trim();
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

// Nothing a player reads may hold an em dash or a developer word. (The dashes are written as codes so this file has none.)
const DASHES = new RegExp('[' + String.fromCharCode(0x2014, 0x2013) + ']');
const DEVELOPER = /\b(null|undefined|NaN|JSON|API|flag|flags|switch|boolean|payload|profile|debug|storage|object|string|true|false|todo)\b|\[object|\{\{|\$\{/i;
const clean = (words, label) => {
  ok(!DASHES.test(words), `${label}: no dash`);
  ok(!DEVELOPER.test(words), `${label}: no developer words (${words.match(DEVELOPER)?.[0]})`);
  ok(words.length > 0, `${label}: has words`);
};

// The shape of section 12.1, as the game will give it.
const STEP_IDS = ['lesson', 'supplies', 'duel', 'ana'];
function props(step, extra = {}) {
  const at = step === 'done' ? 4 : Math.max(0, STEP_IDS.indexOf(step));
  return {available: true, step, read: step !== 'invite', fireClosed: false, skylineOwned: false, lead: false,
    steps: STEP_IDS.map((id, index) => ({id, state: index < at ? 'done' : index === at ? 'open' : 'locked', note: '', button: ''})), ...extra};
}
const stub = (flagNames, storyProps) => {
  const flags = Object.fromEntries(flagNames.map(name => [name, true]));
  const calls = [];
  return {flags, calls, _switches: () => ({enabled: name => flags[name] === true}), duel: {state: {status: 'menu'}}, player: {name: 'Tester'}, profileSaved: true,
    storyProps: () => storyProps, openStory() { calls.push('open'); }, startStoryDuel() { calls.push('duel'); }};
};

// A tiny stand-in page: enough for the card's mount, click and close.
function fakeDocument() {
  const make = () => {
    const listeners = {};
    const element = {className: '', innerHTML: '', hidden: false, children: [], parent: null, inserted: [], dot: null,
      ownerDocument: null,
      addEventListener(type, fn) { (listeners[type] ??= []).push(fn); },
      fire(type, event) { for (const fn of listeners[type] ?? []) fn(event); },
      querySelector(selector) { return selector === '.story-dot' ? this.dot : null; },
      append(child) { child.parent = this; this.children.push(child); },
      insertAdjacentHTML(where, html) { this.inserted.push(html); },
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; },
      focus() {}};
    return element;
  };
  const doc = {createElement: () => { const el = make(); el.ownerDocument = doc; return el; }, make};
  return doc;
}
const target = (attr, value) => ({hasAttribute: name => name === attr, dataset: attr === 'data-story-step' ? {storyStep: value} : {}, disabled: false});
const click = (layer, node) => layer.fire('click', {target: {closest: () => node}});

// 1. The switch ---------------------------------------------------------------------------------
eq(FEATURE_STATES['kogane-invitation'], 'dev', 'the switch is declared and starts as dev');
ok(!createFeatureFlags({storage: null, qa: false}).enabled('kogane-invitation'), 'and is off in the game');
ok(!createFeatureFlags({storage: null, qa: true}).enabled('kogane-invitation'), 'and off in unnamed QA');

// 2. Switch off: nothing shows --------------------------------------------------------------------
{
  const open = props('lesson', {lead: true, skylineOwned: true});
  const app = stub([], open);
  eq(ui.storyOn(app), false, 'off');
  const base = {choices: {car: 'falcone_f42', cpuDifficulty: 'easy', difficulty: 'casual', startStage: 0}, arrow: '', sound: true, escapeHTML};
  ok(!screenMarkup(base).includes('story'), 'the menu markup has no story anywhere');
  // The front door ignores the story unless the game hands it over.
  const facts = frontDoorFacts({profile: createProfile(), flags: app._switches()});
  eq(facts.story, null, 'no story fact by default');
  ok(chooseNextUp(facts).kind !== 'story', 'no Next up entry');
  ok(!screenMarkup({...base, frontDoor: {facts}}).includes('story'), 'the front door has no story either');
  // The menu adds no button and the card never opens.
  const root = fakeDocument().make(); const host = fakeDocument().make();
  root.ownerDocument = host.ownerDocument;
  const stage = fakeDocument().make();
  root.querySelector = id => id === '#heli-visit' ? root : id === '#stage' ? stage : null;
  createMenuScreen({app, choices: {car: 'falcone_f42'}, ui: {}, profile: createProfile, credits: String, escapeHTML, text() {}, root, coursePreview: {}, time: String});
  eq(root.inserted, [], 'no Story button is added');
  // The garage, with the stub saying a story is open.
  const garage = createGarageScreen({app, profile: () => ({...createProfile()}), credits: String, escapeHTML, getGarageCar: () => 'falcone_f42', getGarageMessage: () => '',
    arrow: '', action: (label, verb) => `<button data-action="${verb}">${label}</button>`, clamp: value => Math.max(0, Math.min(1, value))});
  const html = garage();
  ok(!/KOGANE|story-|Daichi/i.test(html), 'the garage shows no panel, plaque or lead');
  // The results screen.
  const results = createResultsScreen({app, profile: createProfile, credits: String, escapeHTML, time: String, arrow: ''});
  const state = {status: 'stage_result', stageIndex: 0, mode: 'duel', cpuDifficulty: 'medium', difficulty: 'casual',
    results: {won: true, story: ui.STORY_RACE_MARK, storyCar: KOGANE_SKYLINE}};
  ok(!/Daichi|NEW CAR/.test(results(state)), 'the results screen shows no story');
  // The views and cards are empty too.
  eq(ui.storyCardMarkup(null), '', 'no card for no story');
}

// 3. The Story card: each step's state and button --------------------------------------------------
{
  const view = step => ui.storyView(props(step));
  const card = step => ui.storyCardMarkup(view(step));
  const stepHtml = (html, id) => html.match(new RegExp(`<li class="story-step[^>]*data-step="${id}">.*?</li>`))[0];
  // The letter comes first, every time, word for word.
  for (const step of ['invite', 'lesson', 'supplies', 'duel', 'ana', 'done']) {
    const words = text(card(step));
    ok(words.includes(STORY_LETTER.text.slice(0, 60)) && words.includes('Come and race me down the mountain!'), `${step}: the letter is on the card`);
    ok(card(step).indexOf('story-letter') < card(step).indexOf('story-steps'), `${step}: letter then steps`);
    ok(card(step).includes('data-story-close'), `${step}: a close button`);
    clean(words, `${step} card`);
  }
  // Step states and buttons.
  let html = card('invite');
  eq((html.match(/is-open/g) ?? []).length, 1, 'the letter step: the first part is the open one');
  ok(stepHtml(html, 'lesson').includes('is-open') && stepHtml(html, 'lesson').includes('Start the lesson'), 'lesson open: "Start the lesson"');
  for (const id of ['supplies', 'duel', 'ana']) ok(stepHtml(html, id).includes('is-locked') && !stepHtml(html, id).includes('<button'), `${id} locked, no button`);
  html = card('supplies');
  ok(stepHtml(html, 'lesson').includes('is-done') && !stepHtml(html, 'lesson').includes('<button'), 'lesson done: ticked, no button');
  ok(stepHtml(html, 'supplies').includes('Go to the helipad') && stepHtml(html, 'supplies').includes('is-open'), 'supplies open: "Go to the helipad"');
  ok(text(stepHtml(html, 'duel')).includes('Fly the supplies to the tea house first.'), 'duel locked: says what to do first');
  ok(text(stepHtml(html, 'ana')).includes('Win the Night Duel first.'), 'Ana locked: says what to do first');
  ok(text(stepHtml(card('lesson'), 'supplies')).includes('Finish Brian\'s Hairpin Lesson first'), 'supplies locked: says what to do first');
  html = card('duel');
  ok(stepHtml(html, 'duel').includes('Race Daichi') && stepHtml(html, 'duel').includes('data-story-step="duel"') && stepHtml(html, 'duel').includes('start-button'), 'duel open: "Race Daichi"');
  html = card('ana');
  ok(stepHtml(html, 'duel').includes('is-done'), 'duel done');
  ok(stepHtml(html, 'ana').includes('is-open') && !stepHtml(html, 'ana').includes('<button'), 'Ana open: only her words, no button');
  html = card('done');
  ok(STEP_IDS.every(id => stepHtml(html, id).includes('is-done') && !stepHtml(html, id).includes('<button')), 'finished: four ticks, no buttons');
  ok(text(stepHtml(html, 'ana')).includes(captionText('story.kogane.ana.call')) && text(stepHtml(html, 'ana')).includes(captionText('story.kogane.ana.lead').slice(0, 40)),
    'Ana\'s message is shown once she has called');
  // The game's own words and button labels win over the defaults.
  const custom = ui.storyCardMarkup(ui.storyView(props('lesson', {steps: [
    {id: 'lesson', state: 'open', note: 'Brian is waiting on the Kogane road.', button: 'Begin'},
    {id: 'supplies', state: 'locked', note: 'Finish Brian\'s flying lessons at the helipad first.', button: ''}]})));
  ok(custom.includes('Brian is waiting on the Kogane road.') && custom.includes('<span>Begin</span>') && custom.includes('flying lessons at the helipad first'), 'notes and button words from the game');
  // Missing steps are filled in from the step the player is on.
  const bare = ui.storyView({available: true, step: 'duel', read: true});
  eq(bare.steps.map(step => step.state), ['done', 'done', 'open', 'locked'], 'steps default from the current step');
  // The prize.
  ok(text(card('lesson')).includes('Nissan Skyline GT-R R34'), 'the prize is named');
  ok(text(ui.storyCardMarkup(ui.storyView(props('duel', {skylineOwned: true})))).includes('You already own one.'), 'an owner is told the story still plays');
  // A save from a newer game: the game says nothing is available, and nothing shows.
  eq(ui.storyView({available: false, step: null, read: false, steps: []}), null, 'unavailable: no view');
  eq(ui.storyView({available: true, step: null}), null, 'a newer save has no step: no view');
  eq(ui.storyView(undefined), null, 'no object: no view');
  eq(ui.storyGaragePanel(null) + ui.storyLeadLine(null), '', 'and no panel or lead');
}

// 4. The closed-by-fire message ---------------------------------------------------------------------
{
  const closed = days => ui.storyCardMarkup(ui.storyView(props('lesson', {fireClosed: days})));
  let html = closed({days: 3});
  ok(text(html).includes('Kogane Pass is closed after the fire and opens again in 3 play days.'), 'closed for N play days');
  ok(text(closed({days: 1})).includes('opens again in 1 play day.'), 'one play day');
  ok(text(closed(2)).includes('in 2 play days'), 'a plain number works too');
  ok(text(closed(true)).includes('Kogane Pass is closed after the fire.') && !/in \d/.test(text(closed(true))), 'closed with no count');
  ok(/data-story-step="lesson" disabled/.test(html), 'the lesson waits while the road is closed');
  const duel = ui.storyCardMarkup(ui.storyView(props('duel', {fireClosed: {days: 4}})));
  ok(/data-story-step="duel" disabled/.test(duel), 'the duel waits too');
  const supplies = ui.storyCardMarkup(ui.storyView(props('supplies', {fireClosed: {days: 4}})));
  ok(!/data-story-step="supplies" disabled/.test(supplies), 'the flight does not wait');
  ok(!text(ui.storyCardMarkup(ui.storyView(props('lesson')))).includes('closed after the fire'), 'open road: no message');
  clean(text(html), 'closed card');
}

// 5. The card on screen: open, read the letter, buttons, close --------------------------------------
{
  const doc = fakeDocument(), host = doc.make(); host.ownerDocument = doc;
  const current = props('invite');
  const app = stub(['kogane-invitation'], current);
  app.openStory = () => { app.calls.push('open'); current.read = true; };
  const moves = [];
  const changes = [];
  const story = ui.createStoryUi({host, app, actions: {lesson: () => moves.push('lesson'), supplies: () => moves.push('supplies')}, onChange: () => changes.push(1)});
  ok(!story.isOpen, 'closed to begin with');
  eq(story.open(), true, 'opens');
  ok(story.isOpen && host.children.length === 1, 'the card is on the stage');
  eq(app.calls, ['open'], 'opening it reads the letter');
  ok(host.children[0].className.includes('modal-layer') && host.children[0].innerHTML.includes('Start the lesson'), 'the card shows the open step');
  click(host.children[0], target('data-story-step', 'lesson'));
  eq(moves, ['lesson'], 'the lesson button goes to the lessons');
  ok(!story.isOpen && host.children.length === 0, 'and the card closes');
  current.step = 'supplies'; current.steps = props('supplies').steps;
  story.open(); click(host.children[0], target('data-story-step', 'supplies'));
  eq(moves, ['lesson', 'supplies'], 'the helipad button goes to the helipad');
  current.step = 'duel'; current.steps = props('duel').steps;
  story.open(); click(host.children[0], target('data-story-step', 'duel'));
  ok(app.calls.includes('duel') && !story.isOpen, '"Race Daichi" starts the story race');
  story.open(); click(host.children[0], target('data-story-close'));
  ok(!story.isOpen, 'close button');
  story.open(); host.children[0].fire('keydown', {key: 'Escape', stopPropagation() {}});
  ok(!story.isOpen, 'Escape closes it');
  const disabled = target('data-story-step', 'duel'); disabled.disabled = true;
  story.open(); click(host.children[0], disabled);
  ok(story.isOpen, 'a waiting button does nothing');
  story.dispose();
  ok(changes.length > 3, 'the menu is told when the card opens or closes');
  // Not from a race, not with the switch off, not with nothing to show.
  const racing = stub(['kogane-invitation'], props('lesson')); racing.duel.state.status = 'racing';
  eq(ui.createStoryUi({host, app: racing}).open(), false, 'never over a race');
  eq(ui.createStoryUi({host, app: stub([], props('lesson'))}).open(), false, 'never with the switch off');
  eq(ui.createStoryUi({host, app: stub(['kogane-invitation'], {available: false})}).open(), false, 'never with nothing to show');
}

// 6. The menu button and its red dot ---------------------------------------------------------------------
{
  const button = {hidden: true, dot: {hidden: true}, querySelector(selector) { return selector === '.story-dot' ? this.dot : null; }};
  ui.syncStoryButton(button, ui.storyView(props('invite')));
  ok(!button.hidden && !button.dot.hidden, 'unread letter: button and red dot');
  ui.syncStoryButton(button, ui.storyView(props('lesson')));
  ok(!button.hidden && button.dot.hidden, 'letter read, no message: button, no dot');
  ui.syncStoryButton(button, ui.storyView(props('ana')));
  ok(!button.hidden && !button.dot.hidden, 'Ana waiting: red dot');
  ui.syncStoryButton(button, ui.storyView(props('done')));
  ok(!button.hidden && button.dot.hidden, 'all done: button, no dot');
  ui.syncStoryButton(button, null);
  ok(button.hidden && button.dot.hidden, 'nothing to show: both hidden');
  ui.syncStoryButton(null, null); checks++;
  const markup = ui.storyButtonMarkup();
  ok(markup.includes('id="story-visit"') && markup.includes('data-story-open') && markup.includes(' hidden>') && markup.includes('class="story-dot"'), 'the button markup');
  clean(text(markup), 'button words');

  // With the switch on, createMenuScreen adds the button beside the helipad, opens the card from any [data-story-open], keeps the dot in step.
  const doc = fakeDocument(), root = doc.make(), stage = doc.make(), anchor = doc.make();
  root.ownerDocument = doc; stage.ownerDocument = doc;
  const added = doc.make(); added.hidden = true; added.dot = {hidden: true}; added.querySelector = function (s) { return s === '.story-dot' ? this.dot : null; };
  root.querySelector = id => id === '#heli-visit' ? anchor : id === '#story-visit' ? added : id === '#stage' ? stage : null;
  const current = props('invite'); const app = stub(['kogane-invitation'], current);
  app.openStory = () => { current.read = true; };
  const refs = {};
  createMenuScreen({app, choices: {car: 'falcone_f42'}, ui: refs, profile: createProfile, credits: String, escapeHTML, text() {}, root, coursePreview: {}, time: String});
  eq(anchor.inserted.length, 1, 'one Story button added');
  ok(anchor.inserted[0].includes('id="story-visit"'), 'beside the helipad');
  ok(refs['story-visit'] === added, 'and known to the menu');
  root.fire('click', {target: {closest: () => null}});
  ok(stage.children.length === 0, 'other clicks do nothing');
  root.fire('click', {target: {closest: selector => selector === '[data-story-open]' ? {} : null}});
  ok(stage.children.length === 1, 'any [data-story-open] opens the card on the stage');
  ok(!added.hidden && added.dot.hidden, 'reading the letter took the dot away');
}

// 7. The front door ------------------------------------------------------------------------------------
{
  const flags = {enabled: () => false};
  const facts = story => frontDoorFacts({profile: createProfile(), flags, story});
  eq(facts(null).story, null, 'no story');
  eq(facts({available: false, step: 'lesson', read: true}).story, null, 'not available');
  eq(facts({available: true, step: 'done', read: true}).story, null, 'finished: nothing to point at');
  eq(facts({available: true, step: null, read: false}).story, null, 'newer save: nothing');
  for (const step of ['invite', 'lesson', 'supplies', 'duel', 'ana']) {
    const f = facts(props(step));
    const next = chooseNextUp({...f, course: null});
    eq([next.kind, next.attr], ['story', 'data-story-open'], `${step}: a Next up entry that opens the card`);
    const html = nextUpMarkup(next);
    ok(html.includes('data-story-open') && !html.includes('data-action'), `${step}: markup`);
    eq(html.includes('story-dot'), step === 'invite' || step === 'ana', `${step}: the red dot shows only while there is a message`);
    clean(text(html), `${step} Next up`);
  }
  eq(chooseNextUp({...facts(props('lesson')), labLesson: {name: 'Lift and weight'}}).kind, 'lab', 'a Lab lesson still comes first');
  eq(chooseNextUp({...facts(props('lesson')), course: {name: 'High Country'}}).kind, 'story', 'the story comes before a new course');
  const screen = screenMarkup({choices: {car: 'falcone_f42', cpuDifficulty: 'easy', difficulty: 'casual', startStage: 0}, arrow: '', sound: true, escapeHTML,
    frontDoor: {facts: facts(props('invite'))}});
  ok(screen.includes('id="fd-next"') && screen.includes('data-story-open') && screen.includes('story-dot'), 'the front door markup carries it');
  eq(doorList(facts(props('invite'))).length, 8, 'still eight doors');
}

// 8. Daichi on the results screen -------------------------------------------------------------------------
{
  const html = (result, flagsOn = ['kogane-invitation']) => {
    const app = stub(flagsOn, null);
    const screen = createResultsScreen({app, profile: createProfile, credits: String, escapeHTML, time: String, arrow: ''});
    return screen({status: 'stage_result', stageIndex: 0, mode: 'duel', cpuDifficulty: 'medium', difficulty: 'casual', results: result});
  };
  const mark = ui.STORY_RACE_MARK;
  const win = html({won: true, story: mark, storyCar: KOGANE_SKYLINE});
  ok(win.includes('story-car-card') && win.includes('NEW CAR') && /won from Daichi Mori/i.test(win), 'a win: the new-car card');
  ok(text(win).includes(captionText('story.kogane.daichi.win')), 'a win: Daichi\'s winning line');
  ok(win.includes('earned-car-results'), 'the headline takes the compact size so the buttons stay on screen');
  const owned = html({won: true, story: mark, storyOwned: true});
  ok(!owned.includes('story-car-card') && text(owned).includes(captionText('story.kogane.daichi.owned')), 'a win with the car already owned: the kind line, no card');
  const lose = html({won: false, story: mark});
  ok(text(lose).includes(captionText('story.kogane.daichi.lose')) && !lose.includes('story-car-card'), 'a loss: his line');
  ok(lose.includes('data-action="restart"') && lose.includes('data-action="menu"'), 'a loss keeps the usual buttons');
  ok(!/Daichi/.test(html({won: true, story: mark})), 'a win with no car and no owner note says nothing');
  ok(!/Daichi|story-car-card/.test(html({won: true, storyCar: KOGANE_SKYLINE})), 'a race without the story mark shows nothing');
  ok(!/Daichi|story-car-card/.test(html({won: true, story: mark, storyCar: KOGANE_SKYLINE}, [])), 'switch off: nothing');
  for (const [label, output] of [['win', win], ['owned', owned], ['loss', lose]])
    clean(text(ui.storyResultMarkup(JSON.parse(JSON.stringify({won: label !== 'loss', story: mark, storyCar: label === 'win' ? KOGANE_SKYLINE : undefined, storyOwned: label === 'owned'})), {on: true})), `${label} story lines`);
}

// 9. The garage panel, the plaque and the Deep log lead (words only) ------------------------------------------------
{
  const panel = view => ui.storyGaragePanel(ui.storyView(props(view)));
  for (const step of ['invite', 'lesson', 'supplies', 'duel']) {
    const html = panel(step);
    ok(html.includes('THE KOGANE INVITATION') && html.includes('Nissan Skyline GT-R R34') && html.includes('data-story-open'), `${step}: the garage panel names the prize`);
    clean(text(html), `${step} garage panel`);
  }
  eq(panel('ana') + panel('done'), '', 'no panel once the duel is won');
  ok(text(ui.storyGaragePanel(ui.storyView(props('duel', {skylineOwned: true})))).includes('You already own one'), 'an owner is told');
  eq(ui.storyLeadLine(ui.storyView(props('done'))), '', 'no lead until Ana logs it');
  const lead = ui.storyLeadLine(ui.storyView(props('done', {lead: true})));
  ok(text(lead) === 'LEAD: Lake Kogane. A long dark shape on the lake bed. Not dived yet.', 'the lead line, word for word');
  ok(ui.storyLeadLine(ui.storyView(props('done', {lead: 'LEAD: Somewhere else.'}))).includes('Somewhere else.'), 'the game may word it');
  const won = (level, extra = {}) => ({...createProfile(), story: {version: 1, kogane: {read: true, lesson: true, supplies: true, ...(level ? {duel: level} : {}), ...extra}}});
  eq(ui.skylinePlaque(won('easy'), {car: KOGANE_SKYLINE}).includes('Won from Daichi Mori, Kogane Pass at night'), true, 'plaque after the win');
  eq(ui.skylinePlaque(won(null), {car: KOGANE_SKYLINE}), '', 'no plaque before the win');
  eq(ui.skylinePlaque(createProfile(), {car: KOGANE_SKYLINE}), '', 'no plaque for a player with no story');
  eq(ui.skylinePlaque(won('hard'), {car: 'falcone_f42'}), '', 'no plaque on another car');
  eq(ui.skylinePlaque(won('hard'), {car: KOGANE_SKYLINE, on: false}), '', 'no plaque with the switch off');
  eq(ui.skylinePlaque({...createProfile(), story: {version: 2, kogane: {duel: 'hard'}}}, {car: KOGANE_SKYLINE}), '', 'no plaque from a newer game\'s story');
  clean(text(ui.skylinePlaque(won('easy'), {car: KOGANE_SKYLINE})), 'plaque');
}

// 10. Every screen word in the sources: no dash -------------------------------------------------------------------------
for (const path of ['../src/story/story-ui.js', '../src/story/story-ui.css', '../tools/test-story-ui.mjs']) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  ok(!DASHES.test(source), `${path}: no em dash`);
}

// 11. The Skyline: hidden until owned, shown after (needs the preview roster, so a fresh process runs these) --------------
if (!preview) {
  eq(CARS[KOGANE_SKYLINE], undefined, 'the car is not in the game\'s roster while its own switch is off');
  const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--preview'], {encoding: 'utf8'});
  process.stdout.write(run.stdout);
  process.stderr.write(run.stderr);
  assert.equal(run.status, 0, 'the preview roster checks pass');
} else {
  ok(CARS[KOGANE_SKYLINE], 'the preview roster has the Skyline');
  const owned = {...createProfile(), unlockedCars: [...createProfile().unlockedCars, KOGANE_SKYLINE]};
  const flagsOn = ['kogane-invitation', 'nissan-skyline'];
  const garageFor = (profile, car, names = flagsOn, storyProps = props('duel')) => {
    const app = stub(names, storyProps);
    return createGarageScreen({app, profile: () => profile, credits: String, escapeHTML, getGarageCar: () => car, getGarageMessage: () => '',
      arrow: '', action: (label, verb) => `<button data-action="${verb}">${label}</button>`, clamp: value => Math.max(0, Math.min(1, value))})();
  };
  // Lists.
  // NISSAN-SKYLINE-GTR-R34-V6: the Skyline is a prize on every list, whatever the story switch says (it was listed with the switch off before).
  ok(!shownCarIds(false).includes(KOGANE_SKYLINE) && !shownCarIds(true).includes(KOGANE_SKYLINE) && !shownCars(true).some(([id]) => id === KOGANE_SKYLINE), 'the Skyline is on no list');
  eq(isShownCar(KOGANE_SKYLINE, false), false, 'isShownCar hides it');
  eq(isShownCar('falcone_f42', false), true, 'and other cars are unaffected');
  eq(wonCars(createProfile()).length, 0, 'wonCars: nothing for a player without it');
  eq(wonCars(owned).map(([id]) => id), [KOGANE_SKYLINE], 'wonCars: the Skyline for an owner');
  // The garage.
  let html = garageFor(createProfile(), 'falcone_f42');
  ok(!html.includes(`data-garage-car="${KOGANE_SKYLINE}"`), 'garage: hidden until owned');
  ok(html.includes('THE KOGANE INVITATION') && html.includes('Win the Night Duel against Daichi Mori'), 'garage: the prize panel while the story is open');
  html = garageFor(owned, 'falcone_f42');
  ok(html.includes(`data-garage-car="${KOGANE_SKYLINE}"`) && html.includes('Nissan Skyline GT-R R34'), 'garage: shown once owned');
  ok(html.includes('OWNED') || html.includes('MAXED'), 'garage: marked as owned');
  ok(!html.includes('Won from Daichi Mori'), 'garage: no plaque on another car\'s page');
  const wonProfile = {...owned, story: {version: 1, kogane: {read: true, lesson: true, supplies: true, duel: 'easy'}}};
  html = garageFor(wonProfile, KOGANE_SKYLINE, flagsOn, props('ana'));
  ok(html.includes('Won from Daichi Mori, Kogane Pass at night'), 'garage: the plaque on the Skyline\'s page after the win');
  ok(!html.includes('THE KOGANE INVITATION'), 'garage: the prize panel is gone once it is won');
  html = garageFor(owned, KOGANE_SKYLINE, flagsOn, props('duel'));
  ok(!html.includes('Won from Daichi Mori'), 'garage: an owner who has not won has no plaque');
  html = garageFor(wonProfile, KOGANE_SKYLINE, ['nissan-skyline'], props('ana'));
  ok(html.includes(`data-garage-car="${KOGANE_SKYLINE}"`) && !html.includes('Won from') && !html.includes('KOGANE'), 'garage: switch off, an owned Skyline is like any owned car');
  html = garageFor(createProfile(), 'falcone_f42', ['nissan-skyline'], props('duel'));
  ok(!html.includes(`data-garage-car="${KOGANE_SKYLINE}"`), 'garage: switch off, an unowned Skyline is still not listed');
  // The Deep log lead line sits in the sea-life log.
  const deepApp = stub(flagsOn, props('done', {lead: true}));
  deepApp.getDeepDiscovery = () => ({enabled: true, kit: true, found: [], hintsShown: []});
  html = createGarageScreen({app: deepApp, profile: () => createProfile(), credits: String, escapeHTML, getGarageCar: () => 'falcone_f42', getGarageMessage: () => '',
    arrow: '', action: () => '', clamp: value => Math.max(0, Math.min(1, value))})();
  ok(html.includes('deep-log-lead') && html.includes('LEAD: Lake Kogane.'), 'the Deep log carries the lead line');
  deepApp.storyProps = () => props('done');
  ok(!createGarageScreen({app: deepApp, profile: () => createProfile(), credits: String, escapeHTML, getGarageCar: () => 'falcone_f42', getGarageMessage: () => '',
    arrow: '', action: () => '', clamp: value => Math.max(0, Math.min(1, value))})().includes('LEAD: Lake Kogane.'), 'and not before Ana logs it');
  // The menu car picker.
  const picker = (profile, listed = true) => {
    const app = stub(flagsOn, props('duel'));
    const options = shownCarIds(false).filter(id => listed || id !== KOGANE_SKYLINE).map(value => ({value, remove() { options.splice(options.indexOf(this), 1); }}));
    const doc = fakeDocument(), root = doc.make(); root.ownerDocument = doc;
    const select = {options, value: '', append(option) { options.push({value: option.value}); }};
    const choices = {car: 'falcone_f42'}, words = {};
    createMenuScreen({app, choices, ui: {'car-select': select, 'driver-select': {innerHTML: '', value: ''}, 'entry-reward': {}}, profile: () => profile,
      credits: String, escapeHTML, text: (key, value) => { words[key] = String(value); }, root, coursePreview: {}, time: String, onEntryReward() {}}).updateMenuCar();
    return {values: options.map(option => option.value), words};
  };
  ok(!picker(createProfile()).values.includes(KOGANE_SKYLINE), 'menu: hidden until owned');
  ok(picker(owned).values.includes(KOGANE_SKYLINE), 'menu: stays once owned');
ok(picker(owned, false).values.includes(KOGANE_SKYLINE), 'menu: joins the picker once owned');
  const pickerMenu = picker(createProfile());
  ok(pickerMenu.words['garage-count'].startsWith('01 / '), 'menu: the count stays in step');
  // NISSAN-SKYLINE-GTR-R34-V6: the armory, the scores and the rival picker follow the same rule, whatever the story switch says.
  const armoryFor = (profile, switches = flagsOn) => createArmoryScreen({profile: () => profile, credits: String, escapeHTML, getGarageMessage: () => '', getArmoryCar: () => 'falcone_f42',
    kitsEnabled: () => true, featureFlags: stub(switches, null)._switches(), action: () => ''}).yardContent();
  const carOptions = html => [...html.matchAll(/<option value="([a-z0-9_]+)"/g)].map(match => match[1]);
  for (const switches of [flagsOn, ['nissan-skyline']]) {
    ok(!carOptions(armoryFor(createProfile(), switches)).includes(KOGANE_SKYLINE), 'armory: no Skyline for a player without it');
    ok(carOptions(armoryFor(owned, switches)).includes(KOGANE_SKYLINE), 'armory: the Skyline for an owner');
  }
  const scoresFor = (profile, switches = flagsOn) => {
    const app = stub(switches, null); app.profile = profile; app.player = {id: 'p1', name: 'Tester'}; app.getMenuSeed = () => 1; app.getMenuRouteLabel = () => 'Route'; app.leaderboard = {entries: []};
    return createLeaderboardScreen({app, boardFilter: {stage: 0, car: '', driverId: 'club', mode: '', laps: 2}, escapeHTML, credits: String, time: String})();
  };
  for (const switches of [flagsOn, ['nissan-skyline']]) {
    ok(!carOptions(scoresFor(createProfile(), switches)).includes(KOGANE_SKYLINE), 'scores: no Skyline in the car list for a player without it');
    ok(carOptions(scoresFor(owned, switches)).includes(KOGANE_SKYLINE), 'scores: the Skyline for an owner');
  }
  ok(!screenMarkup({choices: {car: 'falcone_f42'}, arrow: '', sound: true, escapeHTML, earnedCars: false}).includes(`value="${KOGANE_SKYLINE}"`), 'menu picker markup: no Skyline');
  eq(shownCars(false).filter(([, car]) => car.price > 0 || car.unlockRequirement).some(([id]) => id === KOGANE_SKYLINE), false, 'EARNABLE CARS does not count the Skyline');
  // The rival picker: the story sets Daichi itself, so the player's own picker offers the Skyline only to an owner.
  const rivalPicker = (profile, rival) => {
    const app = stub(flagsOn, props('duel'));
    const options = shownCarIds(false).map(value => ({value, remove() { options.splice(options.indexOf(this), 1); }}));
    const carSelect = {options, value: '', append(option) { options.push({value: option.value}); }};
    const rivalOptions = [{value: 'match'}, ...shownCars(false).map(([value]) => ({value}))];
    rivalOptions.forEach(option => { option.remove = function () { rivalOptions.splice(rivalOptions.indexOf(this), 1); }; });
    const rivalSelect = {options: rivalOptions, value: '', append(option) { rivalOptions.push({value: option.value, remove() { rivalOptions.splice(rivalOptions.indexOf(this), 1); }}); }};
    const doc = fakeDocument(), root = doc.make(); root.ownerDocument = doc;
    const choices = {car: 'falcone_f42', ...(rival ? {rival} : {})};
    createMenuScreen({app, choices, ui: {'car-select': carSelect, 'rival-car': rivalSelect, 'driver-select': {innerHTML: '', value: ''}, 'entry-reward': {}}, profile: () => profile,
      credits: String, escapeHTML, text() {}, root, coursePreview: {}, time: String, onEntryReward() {}}).updateMenuCar();
    return {values: rivalOptions.map(option => option.value), choices};
  };
  ok(!rivalPicker(createProfile()).values.includes(KOGANE_SKYLINE), 'rival picker: no Skyline for a player without it');
  ok(rivalPicker(owned).values.includes(KOGANE_SKYLINE), 'rival picker: the Skyline for an owner');
  eq(rivalPicker(createProfile(), {car: KOGANE_SKYLINE, driverId: 'club', upgradeLevel: 0}).choices.rival.car, 'match', 'a saved Skyline rival falls back to match for a player without it');
  eq(rivalPicker(owned, {car: KOGANE_SKYLINE, driverId: 'club', upgradeLevel: 0}).choices.rival.car, KOGANE_SKYLINE, 'and is kept for an owner');  // The results card names the real car.
  const results = createResultsScreen({app: stub(flagsOn, null), profile: createProfile, credits: String, escapeHTML, time: String, arrow: ''});
  const winHtml = results({status: 'stage_result', stageIndex: 0, mode: 'duel', cpuDifficulty: 'medium', difficulty: 'casual',
    results: {won: true, story: ui.STORY_RACE_MARK, storyCar: KOGANE_SKYLINE}});
  ok(winHtml.includes(CARS[KOGANE_SKYLINE].name.toUpperCase()), 'results: the card uses the car\'s own name');
}

console.log(`Story screens: ${checks} checks passed${preview ? ' (preview roster)' : ''}.`);
