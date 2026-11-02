// WATER-SCREENS: the Water Road's Story card, Story Wall chapters, bars, the yard's Next up, the results tick and the
// water works' stages in the yard (docs/story/wasteland-water-road.md sections 2 and 3). Every chapter says what to do
// with one button; locked chapters show what opens them; nothing shows with the switch off. Memory only.
//   node tools/test-water-screens.mjs
import assert from 'node:assert/strict';
import * as THREE from 'three';

globalThis.__DUEL_QA__ = true;
globalThis.cancelAnimationFrame ??= () => {};
const memory = new Map();
globalThis.localStorage = {get length() { return memory.size; }, key: n => [...memory.keys()][n] ?? null,
  getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, String(v)), removeItem: k => memory.delete(k)};

const {App} = await import('../src/app.js');
const {COURSE} = await import('../src/config.js');
const {Course} = await import('../src/course.js');
const {createFeatureFlags} = await import('../src/feature-flags.js');
const {createProfile, normalizeProfile} = await import('../src/progression.js');
const {WARLORD_LADDER} = await import('../src/warlords.js');
const {storyCardKeys, storyView, storyCardMarkup, storyChooserMarkup} = await import('../src/story/story-ui.js');
const {waterWallMarkup, waterNextUp, waterResultLine} = await import('../src/story/water-ui.js');
const {yardHomeScreen} = await import('../src/screen-yard-home.js');
const {createScrapdomeYard, waterWorksPartVisible} = await import('../src/scrapdome-yard.js');

let checks = 0;
const ok = (value, label) => { assert.ok(value, label); checks++; };
const same = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
const count = (text, pattern) => (text.match(pattern) || []).length;

function freshApp({on = true, beaten = [], rank = 1, read = true, ninth = false} = {}) {
  memory.clear();
  const app = new App();
  app.duel.featureFlags = createFeatureFlags({storage: null, qa: false, overrides: {'water-road': on, 'warlord-nine': ninth}});
  app.audio.unlock = () => {};
  const profile = createProfile();
  profile.wasteland.discoveredGate = true;
  profile.wasteland.xp = {1: 0, 6: 3500, 9: 7000, 12: 11000}[rank] ?? 0;
  for (const id of beaten) profile.wasteland.warlords[id] = {...profile.wasteland.warlords[id], defeated: true};
  if (read) profile.story = {version: 1, water: {read: true}};
  app.profile = normalizeProfile(profile);
  app._saveProfile();
  return app;
}
const intoYard = app => { ok(app.visitWasteland(), 'into the yard'); app.advance(8); ok(app.isYardHomeActive(), 'the yard home is active'); };

// ---- The Story card on the main menu ------------------------------------------------------------------------------------
ok(storyCardKeys().includes('water') && storyCardKeys().includes('kogane'), 'the Water Road has a card beside Kogane\'s');
{
  const app = freshApp({read: false});
  const view = storyView(app.storyProps('water'), 'water');
  ok(view && view.message === true, 'an unread note shows the red dot');
  const markup = storyCardMarkup(view);
  ok(markup.includes('THE WATER ROAD') && markup.includes('Driver, the well is dry.'), 'Hollis\'s note is the letter');
  same(count(markup, /data-story-step=/g), 0, 'before the note is read no chapter has a button');
  ok(markup.includes('Read Hollis&#39;s note first.'), 'chapter 1 says what to do first');
  app.openStory('water');
  const after = storyCardMarkup(storyView(app.storyProps('water'), 'water'));
  same(count(after, /data-story-step=/g), 1, 'then exactly one button: the open chapter\'s');
  ok(/data-story-step="sal"[^>]*><span>Race on Sal&#39;s road</.test(after), 'chapter 1: Race on Sal\'s road');
  ok(/<progress max="100" value="0"/.test(after) && after.includes('4 more wins on Sal&#39;s road open the fight.'), 'with the hold bar and its words');
  same(storyChooserMarkup([storyView(app.storyProps('water'), 'water'), {key: 'kogane', message: false}]).includes('THE WATER ROAD'), true, 'the chooser offers the Water Road');
}

// ---- A later chapter from the menu: a fight or a Scrapdome game goes to the yard; notes from V. show -----------------------
{
  const app = freshApp({beaten: WARLORD_LADDER.slice(0, 4)});
  const view = storyView(app.storyProps('water'), 'water');
  const markup = storyCardMarkup(view);
  ok(/data-story-step="kettle"[^>]*><span>Go to the yard</.test(markup), 'chapter 5 from the menu: Go to the yard');
  same(view.notes.length, 4, 'four notes from V. after four chapters');
  ok(markup.includes('Kettle Kingpin sits on a boiler'), 'the latest note is on the card');
  same(count(markup, /class="story-step is-done"/g), 5, 'chapters 0 to 4 are ticked');
  same(count(markup, /class="story-step is-locked"/g), 3, 'chapters 6 to 8 are locked');
}

// ---- The Story Wall in the yard: the same chapters, each open one with its button -----------------------------------------
{
  const app = freshApp({beaten: WARLORD_LADDER.slice(0, 4)});
  intoYard(app);
  const props = app.storyProps('water');
  const wall = waterWallMarkup(props);
  same(count(wall, /data-water-step=/g), 1, 'one button on the wall');
  ok(wall.includes('data-water-step="kettle"><span>Start Last Car Rolling<'), 'in the yard the job starts here');
  ok(wall.includes('Beat Kettle Kingpin first.'), 'the next chapter says what opens it');
  const yard = yardHomeScreen({profile: app.profile, playerName: 'A', escapeHTML, panel: 'cards', featureFlags: app.duel.featureFlags,
    arenaMarkup: '<div>arena</div>', warlordsAvailable: true, water: props});
  ok(yard.includes('THE WATER ROAD') && yard.includes('THE ROAD REMEMBERS'), 'the Story Wall shows the Water Road above the warlord cards');
  const home = yardHomeScreen({profile: app.profile, playerName: 'A', escapeHTML, panel: 'home', featureFlags: app.duel.featureFlags,
    arenaMarkup: '<div>arena</div>', warlordsAvailable: true, water: props});
  ok(home.includes('Next up: Chapter 5 · The boiler.') && home.includes('data-water-step="kettle"'), 'the yard\'s Next up names the chapter and its button');
  same(waterNextUp(app.storyProps('water')).text.startsWith('Next up: Chapter 5'), true, 'the same words as the wall');
}

// ---- Switch off: nothing shows, the yard is exactly as before ---------------------------------------------------------------
{
  const app = freshApp({on: false, beaten: ['sal']});
  intoYard(app);
  const props = app.storyProps('water');
  same(props.available, false, 'no Water Road props');
  same(waterWallMarkup(props), '', 'no wall section');
  same(waterNextUp(props), null, 'no Next up');
  for (const panel of ['home', 'career', 'cards']) {
    const args = {profile: app.profile, playerName: 'A', escapeHTML, panel, featureFlags: app.duel.featureFlags, arenaMarkup: '<div>arena</div>', warlordsAvailable: true};
    same(yardHomeScreen({...args, water: props}), yardHomeScreen(args), `${panel}: the yard is the same as without the story`);
  }
  same(app.waterYardStage(), null, 'no water works stage');
  same(storyView(app.storyProps('water'), 'water'), null, 'no card');
}

// ---- The results tick ---------------------------------------------------------------------------------------------------
same(waterResultLine({waterJob: 'dustmonger'}), 'Water Road: chapter 2 job done. The pump coughs into life.', 'a won job');
same(waterResultLine({waterChapter: 'blackiron'}), 'Water Road: chapter 8, The Cistern, is done. Water runs into the camp, and Vesper joins your crew.', 'a chapter done');
same(waterResultLine({}), '', 'nothing else');

// ---- The water works in the 3D yard ---------------------------------------------------------------------------------------
same([0, 1, 2, 3, 4, 5, 6, 7, 8].map(stage => waterWorksPartVisible('pipe-patched', stage)), [false, true, true, true, true, true, true, true, true], 'the pipe is patched from chapter 1');
same([0, 4, 5].map(stage => [waterWorksPartVisible('boiler-cold', stage), waterWorksPartVisible('boiler-lit', stage)]), [[true, false], [true, false], [false, true]], 'the boiler lights at chapter 5');
same([0, 3, 7, 8].map(stage => [1, 2, 3, 4, 5, 6, 7, 8].filter(level => waterWorksPartVisible(`tower-water-${level}`, stage))), [[], [3], [7], [8]], 'one water level at a time');
ok(waterWorksPartVisible('tower', 0) && waterWorksPartVisible('well', 8), 'the always-there parts always show');
{
  const course = new Course(COURSE.find(row => row.id === 'pacific-canyon'), 1989, {hiddenRoad: true});
  const yardScene = new THREE.Group();
  const works = new THREE.Group(); works.name = 'water-works';
  for (const name of ['well', 'tower', 'pipe-cut', 'pipe-patched', 'boiler-cold', 'boiler-lit', 'tower-water-1', 'tower-water-8', 'tap-running']) {
    const part = new THREE.Group(); part.name = name; works.add(part);
  }
  const waterScene = new THREE.Group(); waterScene.add(works);
  let waterLoads = 0;
  const yard = createScrapdomeYard(course, {loadAsset: async () => ({scene: yardScene}), loadWaterWorks: async () => { waterLoads++; return {scene: waterScene}; }});
  await yard.ready;
  same(waterLoads, 0, 'the water works never load until the story asks');
  yard.setWaterStage(null);
  same(waterLoads, 0, 'not while it is off either');
  yard.setWaterStage(1);
  await new Promise(resolve => setTimeout(resolve, 0));
  same(waterLoads, 1, 'they load once when a stage is asked for');
  const part = name => waterScene.getObjectByName(name).visible;
  ok(waterScene.visible && part('pipe-patched') && !part('pipe-cut') && part('tower-water-1') && !part('tower-water-8') && !part('tap-running'), 'stage 1 shows the patched pipe and the first water');
  same([waterScene.position.x, waterScene.position.z], [-4, 31], 'placed on open ground in the yard');
  yard.setWaterStage(8);
  ok(part('boiler-lit') && part('tower-water-8') && part('tap-running') && !part('tower-water-1'), 'stage 8: the tower full and the tap running');
  yard.setWaterStage(null);
  ok(!waterScene.visible, 'hidden when the story is off');
  same(waterLoads, 1, 'still one load');
}

// ---- The app's stage: warlord chapters done in order ---------------------------------------------------------------------
same(freshApp({read: false}).waterYardStage(), 0, 'a new story: the dry well');
same(freshApp({beaten: ['sal', 'dustmonger']}).waterYardStage(), 2, 'two warlords: stage 2');
same(freshApp({beaten: WARLORD_LADDER}).waterYardStage(), 8, 'all eight: stage 8');
same(freshApp({read: false, beaten: ['sal', 'dustmonger', 'mirage']}).waterYardStage(), 3, 'a returning player whose note is unread still sees their progress');

// ---- Chapter 9: Magnus the Magnet (WARLORD-NINE) ---------------------------------------------------------------------------
{
  const eight = WARLORD_LADDER.slice(0, WARLORD_LADDER.indexOf('blackiron') + 1);
  const off = freshApp({beaten: eight}).storyProps('water');
  same([off.step, off.steps.length, off.ninth], ['done', 9, false], 'with his switch off the road ends with the Baron, as before');
  const app = freshApp({beaten: eight, ninth: true});
  const menu = app.storyProps('water');
  same([menu.step, menu.steps.length], ['magnus', 10], 'with his switch on, chapter 9 is next after the Baron');
  const nine = menu.steps.at(-1);
  same([nine.state, nine.button, nine.action?.type, nine.bar], ['open', 'Go to the yard', 'yard', null], 'from the menu, chapter 9 goes to the yard; no hold bar');
  ok(nine.note.includes('Magnus the Magnet') && nine.note.includes('Salt Flats'), 'its words name him and his hideout');
  intoYard(app);
  const wall = waterWallMarkup(app.storyProps('water'));
  ok(/data-water-step="magnus"[^>]*><span>Fight Magnus the Magnet</.test(wall), 'the Story Wall\'s one button fights him');
  ok(wall.includes('9 · The ninth warlord'), 'the chapter is named');
  same(app.waterYardStage(), 8, 'the tower stays full: chapter 9 adds nothing to the water works');
  const done = freshApp({beaten: [...eight, 'magnus'], ninth: true}).storyProps('water');
  same([done.step, done.ninth], ['done', true], 'beating Magnus finishes the road');
  ok(waterWallMarkup(done).includes('Magnus is back in his scrapyard'), 'and the wall says he is sulking, with a rematch');
}

console.log(`test-water-screens: ${checks} checks passed`);
