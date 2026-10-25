// DEEP-LOG (docs/THE_DEEP.md 5, 6.4 to 6.6 and 10.1): the sea-life log and the
// pearls, what they pay once, the pages, pearl white after nine, and a true fact
// for each of the 14 creatures. Headless; memory-only.
import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {Duel} from '../src/game.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {buildDeepRamp} from '../src/deep/deep-ramp.js';
import {defineZone} from '../src/deep/deep-zone.js';
import {kelpCoastProvider} from '../src/deep/zones/kelp-coast.js';
import {DEEP_PHONE_LINES} from '../src/deep/deep-phone-lines.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {getPaintState, paintPresetsFor, applyPaint, getPaintAppearance, PAINT_PRESETS} from '../src/paint-presets.js';
import {DEEP_LOG, DEEP_LOG_PAY, DEEP_CREATURES, DEEP_LOG_PAGES, DEEP_PEARLS, createLog, stepLog, recordLogged,
  recordPearl, phoneLineFor, logPage, logCardMarkup, logPicture} from '../src/deep/deep-log.js';

const KMH = 1 / 1.609344;          // one km/h in mph (the car's picture is in mph)
const ON = {enabled: true};
const car = (x, z, speed = 0) => ({x, z, speed});
// A straight trail heading +z: a turtle at index 5 (z 50), a crab at 20 (z 200), pearl kelp-1 at 10 (z 100), 3 m left.
function straight() {
  const trail = Array.from({length: 40}, (_, i) => ({x: 0, z: i * 10, depth: 8, width: 14, surface: 'sea-floor', kelp: 0, grass: 0, rock: 0}));
  return {id: 'kelp-coast', trail, spots: [{creature: 'turtle', trailIndex: 5, count: 2}, {creature: 'crab', trailIndex: 20, count: 4}],
    pearls: [{id: 'kelp-1', trailIndex: 10, offset: 3}]};
}
const hold = (state, where, seconds, dt = 1 / 120) => {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) events.push(...stepLog(state, where, dt));
  return events;
};
const withMoney = (credits = 1000, deep) => ({...createProfile(), credits, ...(deep ? {deep} : {})});

test('the 14 creature ids each carry the true fact and the name from THE_DEEP section 5', () => {
  const ids = Object.keys(DEEP_CREATURES);
  assert.deepEqual(ids.sort(), ['crab', 'grouper', 'jellyfish', 'manta', 'moray', 'octopus', 'otter', 'ray', 'reef-fish',
    'reef-shark', 'sea-lion', 'silver-school', 'turtle', 'whale']);
  const design = readFileSync(new URL('../docs/THE_DEEP.md', import.meta.url), 'utf8');
  const table = design.slice(design.indexOf('## 5. Sea life'), design.indexOf('## 6.'));
  for (const id of ids) {
    const row = table.split('\n').find(line => line.includes('(`' + id + '`'));
    assert.ok(row, id + ' has a row in section 5');
    const cells = row.split('|').map(cell => cell.trim()).filter(Boolean);
    assert.equal(DEEP_CREATURES[id].fact, cells.at(-1), id + ': the card carries the fact column word for word');
    assert.ok(cells[0].startsWith(DEEP_CREATURES[id].name + ' ('), id + ': the card names the creature as section 5 does');
  }
});

test('pages follow section 5 and 6.4: the Kelp Coast has its seven, every creature is on a page, pearls are three a coast', () => {
  assert.deepEqual([...DEEP_LOG_PAGES[0].creatures].sort(), ['crab', 'otter', 'ray', 'sea-lion', 'silver-school', 'turtle', 'whale']);
  assert.deepEqual(new Set(DEEP_LOG_PAGES.flatMap(page => page.creatures)), new Set(Object.keys(DEEP_CREATURES)));
  assert.deepEqual(DEEP_PEARLS, ['kelp-1', 'kelp-2', 'kelp-3', 'reef-1', 'reef-2', 'reef-3', 'night-1', 'night-2', 'night-3']);
  assert.ok(DEEP_LOG_PAGES.every(page => page.pearls.length === 3));
});

test('a creature is logged within 6 m of its spot, under 15 km/h, for a second without a break', () => {
  const state = createLog(straight(), {}, ON);
  assert.equal(state.active, true);
  assert.deepEqual(hold(state, car(6.2, 50), 2), [], 'just beyond 6 m logs nothing');
  assert.deepEqual(hold(state, car(5.9, 50, 15.5 * KMH), 2), [], 'at 15.5 km/h logs nothing');
  assert.deepEqual(hold(state, car(5.9, 50, 14.5 * KMH), 0.95), [], 'not yet a second');
  hold(state, car(30, 50), 1 / 120);
  assert.deepEqual(hold(state, car(5.9, 50, 14.5 * KMH), 0.95), [], 'a break starts the second again');
  assert.deepEqual(hold(state, car(5.9, 50, 14.5 * KMH), 0.1), [{deepLogged: {creature: 'turtle'}}]);
  assert.deepEqual(hold(state, car(0, 50), 3), [], 'a logged creature gives no second card');
  assert.deepEqual(hold(state, car(0, 200), 1.01), [{deepLogged: {creature: 'crab'}}]);
});

test('two spots close together each keep their own second, so wobbling between them still logs', () => {
  const zone = straight();
  zone.spots = [{creature: 'turtle', trailIndex: 5, count: 1}, {creature: 'ray', trailIndex: 6, count: 1}];
  const state = createLog(zone, {}, ON), events = [];
  for (let i = 0; i < 240; i++) events.push(...stepLog(state, car(0, i % 2 ? 54.9 : 55.1), 1 / 120));
  assert.deepEqual(events.map(e => e.deepLogged.creature).sort(), ['ray', 'turtle']);
  assert.equal(logCardMarkup(null), '', 'no card for nothing');
});

test('logging measures the fixed spot, never a creature; a save already holding it logs nothing', () => {
  const state = createLog(straight(), {logged: ['turtle']}, ON);
  assert.deepEqual(hold(state, car(0, 50), 2), [], 'already in the save');
  const off = createLog(straight(), {}, {enabled: false});
  assert.equal(off.active, false);
  assert.deepEqual(hold(off, car(0, 50), 2), [], 'the switch off logs nothing');
  assert.deepEqual(stepLog(state, {x: NaN, z: 0, speed: 0}, 1), [], 'a broken car picture logs nothing');
});

test('a pearl is found within 3 m under 15 km/h for a second; it sits at its offset, positive to the left', () => {
  const state = createLog(straight(), {}, ON);
  assert.deepEqual([state.pearls[0].x, state.pearls[0].z], [3, 100]);
  assert.deepEqual(hold(state, car(0, 96.9), 2), [], 'beyond 3 m');
  assert.deepEqual(hold(state, car(3, 102.9, 10 * KMH), 1.01), [{deepPearl: {pearl: 'kelp-1'}}]);
  assert.deepEqual(hold(state, car(3, 100), 2), [], 'found once');
});

test('a first log pays 50, once; a page pays 250 when its last creature is logged; repeats pay nothing', () => {
  let profile = withMoney(1000, {found: ['kelp-coast']});
  const first = recordLogged(profile, 'turtle', ON);
  assert.equal(first.paid, DEEP_LOG_PAY.creature); assert.equal(first.profile.credits, 1050);
  assert.deepEqual(first.profile.deep.logged, ['turtle']);
  const again = recordLogged(first.profile, 'turtle', ON);
  assert.equal(again.ok, true); assert.equal(again.paid, 0); assert.equal(again.profile, first.profile);
  profile = first.profile;
  for (const id of ['silver-school', 'ray', 'sea-lion', 'otter', 'crab']) {
    const result = recordLogged(profile, id, ON);
    assert.equal(result.paid, 50, id); assert.deepEqual(result.pages, []); profile = result.profile;
  }
  const last = recordLogged(profile, 'whale', ON);
  assert.deepEqual(last.pages, ['kelp-coast']);
  assert.equal(last.paid, DEEP_LOG_PAY.creature + DEEP_LOG_PAY.page);
  assert.equal(last.profile.credits, 1000 + 7 * 50 + 250, 'the whole Kelp Coast page pays 600');
  assert.equal(recordLogged(last.profile, 'whale', ON).paid, 0, 'the page never pays twice');
  assert.equal(recordLogged(withMoney(), 'turtle', {enabled: false}).ok, false, 'the switch off records nothing');
  assert.equal(recordLogged(withMoney(), 'seal', ON).ok, false, 'an unknown id is refused');
});

test('the turtle and the crab count on both of their pages', () => {
  let profile = withMoney(0, {logged: ['reef-fish', 'manta', 'moray', 'grouper', 'reef-shark', 'jellyfish', 'octopus']});
  const turtle = recordLogged(profile, 'turtle', ON);
  assert.deepEqual(turtle.pages, ['wreck-reef']);
  const crab = recordLogged(turtle.profile, 'crab', ON);
  assert.deepEqual(crab.pages, ['night-harbour']);
  assert.equal(crab.profile.credits, 50 + 250 + 50 + 250);
});

test('each pearl pays 150 once; the ninth earns pearl white for every owned car, kept as the save holds it', () => {
  let profile = withMoney(0);
  for (const [index, id] of DEEP_PEARLS.entries()) {
    const result = recordPearl(profile, id, ON);
    assert.equal(result.paid, DEEP_LOG_PAY.pearl, id);
    assert.equal(result.pearlWhite, index === 8, id);
    assert.equal(recordPearl(result.profile, id, ON).paid, 0, id + ' pays once');
    profile = result.profile;
  }
  assert.equal(profile.credits, 9 * 150);
  assert.equal(recordPearl(withMoney(), 'kelp-9', ON).ok, false);
  const before = recordPearl(withMoney(), 'kelp-1', ON).profile;
  assert.ok(!paintPresetsFor(before, 'falcone_f42').some(preset => preset.id === 'pearl_white'), 'not before nine');
  assert.ok(paintPresetsFor(profile, 'falcone_f42').some(preset => preset.id === 'pearl_white'));
  assert.ok(getPaintState(profile, 'stuttgart_959s').owned.includes('pearl_white'), 'for every owned car');
  assert.ok(!getPaintState(profile, 'titan_monster').owned.includes('pearl_white'), 'not for a car the player does not own');
  const applied = applyPaint(profile, 'falcone_f42', 'pearl_white');
  assert.equal(applied.ok, true); assert.equal(applied.cost, 0);
  const reloaded = normalizeProfile(JSON.parse(JSON.stringify(applied.profile)));
  assert.equal(getPaintAppearance(reloaded, 'falcone_f42'), PAINT_PRESETS.pearl_white.appearance, 'kept after a reload');
  const forged = {...before, cosmetics: {falcone_f42: {owned: ['pearl_white'], selected: 'pearl_white'}}};
  assert.equal(getPaintAppearance(forged, 'falcone_f42'), null, 'a forged selection without nine pearls is refused');
});

test("Ana's lines: the otter line the first time, the log line for the others, the page line for the Kelp Coast", () => {
  const log = id => ({deepLogged: {creature: id}});
  const first = (paid, pages = []) => ({ok: true, recorded: true, paid, pages});
  assert.deepEqual(phoneLineFor(log('ray'), first(50)), ['deep.ana.log']);
  assert.deepEqual(phoneLineFor(log('otter'), first(50)), ['deep.ana.otter']);
  assert.deepEqual(phoneLineFor(log('whale'), first(300, ['kelp-coast'])), ['deep.ana.log', 'deep.ana.page']);
  assert.deepEqual(phoneLineFor(log('turtle'), first(300, ['wreck-reef'])), ['deep.ana.log'], 'the page line names the Kelp Coast');
  assert.deepEqual(phoneLineFor(log('ray'), recordLogged(recordLogged(withMoney(), 'ray', ON).profile, 'ray', ON)), [], 'nothing for a repeat');
  const capped = recordPearl({...withMoney(), credits: 1e9}, 'kelp-1', ON);
  assert.equal(capped.paid, 0);
  assert.deepEqual(phoneLineFor({deepPearl: {pearl: 'kelp-1'}}, capped), ['deep.ana.pearl'], 'a wallet at the cap is paid nothing but Ana still speaks');
  assert.deepEqual(phoneLineFor({deepPearl: {pearl: 'kelp-2'}}, first(150)), ['deep.ana.pearl']);
  assert.deepEqual(phoneLineFor({deepPearl: {pearl: 'reef-1'}}, first(150)), [], 'the pearl line speaks of abalone');
  for (const id of ['deep.ana.log', 'deep.ana.otter', 'deep.ana.page', 'deep.ana.pearl']) assert.ok(DEEP_PHONE_LINES[id], id + ' is recorded');
});

test('the garage page: a row per coast found, grey shapes with no fact until found, and the pearl count', () => {
  assert.deepEqual(logPage(withMoney()).rows, [], 'no coast found, no rows');
  const page = logPage(withMoney(0, {found: ['kelp-coast'], logged: ['otter', 'turtle'], pearls: ['kelp-1', 'reef-2']}));
  assert.deepEqual(page.rows.map(row => row.coast), ['kelp-coast']);
  assert.deepEqual(page.rows[0].creatures.filter(item => item.found).map(item => item.id), ['turtle', 'otter']);
  assert.equal(page.rows[0].pearls, 1); assert.equal(page.pearls, 2); assert.equal(page.pearlTotal, 9);
  const known = logCardMarkup('turtle', {found: true}), unknown = logCardMarkup('turtle', {found: false});
  assert.ok(known.includes('Green turtle') && known.includes(DEEP_CREATURES.turtle.fact) && known.includes('/assets/deep/log/turtle.webp'));
  assert.ok(!unknown.includes('Green turtle') && !unknown.includes('seagrass') && unknown.includes('deep-log-unknown'), 'a grey shape tells nothing');
  assert.equal(logPicture('otter'), null, 'the otter has no accepted model yet');
  for (const id of Object.keys(DEEP_CREATURES).filter(id => id !== 'otter'))
    assert.ok(readFileSync(new URL('../public' + logPicture(id), import.meta.url)).length > 500, id + ' has its picture');
});

test('the real Kelp Coast: its seven creatures and three pearls can all be logged by driving to them, on every route', () => {
  for (const route of ROUTE_VARIANTS) {
    const duel = new Duel({seed: route.seed, deepProviders: [], featureFlags: {'the-deep': true}});
    duel.startCampaign({seed: route.seed, car: 'falcone_f42', mode: 'duel', deepKit: true, opponentCount: 1, fieldSize: 2, fieldSeed: route.seed, playerId: 'node-qa'});
    const zone = defineZone(kelpCoastProvider(buildDeepRamp(duel.course)));
    const state = createLog(zone, {}, ON), events = [];
    for (const point of [...state.spots, ...state.pearls]) events.push(...hold(state, car(point.x, point.z, 5 * KMH), 1.05));
    assert.deepEqual(new Set(events.filter(e => e.deepLogged).map(e => e.deepLogged.creature)), new Set(DEEP_LOG_PAGES[0].creatures), route.id);
    assert.deepEqual(events.filter(e => e.deepPearl).map(e => e.deepPearl.pearl).sort(), ['kelp-1', 'kelp-2', 'kelp-3'], route.id);
    assert.equal(DEEP_LOG.holdSeconds, 1);
  }
});
