// Course closures after a forest fire (docs/HELI_FIRE.md sections 8.1 to 8.5).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLOSURE, BURN_STAGES, SCAR_STAGES, playDayOf, daysSinceBurn, courseClosed, buybackPrice, burnStage,
  burnSmoke, scarLooks, closureCard} from '../src/course-closures.js';
import {createHeli, burnCourse, buyBack, addScar, notePlayDay} from '../src/heli/heli-save.js';
import {createProfile} from '../src/progression.js';

let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const on = {enabled: true};
const profileOn = (day, burnt = {}, extra = {}) => ({...createProfile(), credits: 20_000,
  heli: {...createHeli(), playDay: {last: '2026-10-20', count: day}, burnt, ...extra}});
const burntOn = (burnDay, today, boughtBack = false) => profileOn(today, {'tremblant-woods': {day: burnDay, boughtBack}});

check('the closure numbers match the design', () => {
  assert.deepEqual({...CLOSURE}, {closedDays: 10, buybackStart: 10_000, buybackPerDay: 1_000, healedDay: 60, scarHealedDay: 40});
  assert.deepEqual(BURN_STAGES.map(row => [row.stage, row.from]), [['closed', 0], ['black', 10], ['shoots', 20], ['fireweed', 35], ['healed', 60]]);
  assert.deepEqual(SCAR_STAGES.map(row => [row.stage, row.from]), [['black', 0], ['shoots', 10], ['fireweed', 25], ['healed', 40]]);
});

check('closed for play days 0 to 9, open by itself on day 10', () => {
  for (let days = 0; days < 10; days++) assert.equal(courseClosed(burntOn(4, 4 + days), 'tremblant-woods', undefined, on), true, 'day ' + days);
  assert.equal(courseClosed(burntOn(4, 14), 'tremblant-woods', undefined, on), false);
  assert.equal(courseClosed(burntOn(4, 90), 'tremblant-woods', undefined, on), false);
  assert.equal(courseClosed(burntOn(4, 6), 'tremblant-snow', undefined, on), false, 'Tremblant Snow stays open');
  assert.equal(courseClosed(burntOn(4, 6), 'panorama-ridge', undefined, on), false);
  assert.equal(daysSinceBurn(burntOn(4, 6), 'tremblant-woods'), 2);
  assert.equal(daysSinceBurn(burntOn(4, 6), 'tremblant-snow'), null);
  assert.equal(courseClosed(burntOn(4, 6), 'tremblant-woods', 14, on), false, 'today can be passed in');
  assert.equal(courseClosed(burntOn(4, 99), 'tremblant-woods', 5, on), true);
});

check('buyback costs 10,000 less 1,000 a play day, and nothing once open', () => {
  const prices = Array.from({length: 11}, (_, days) => buybackPrice(burntOn(0, days), 'tremblant-woods', undefined, on));
  assert.deepEqual(prices, [10_000, 9_000, 8_000, 7_000, 6_000, 5_000, 4_000, 3_000, 2_000, 1_000, null]);
  assert.equal(buybackPrice(burntOn(0, 3, true), 'tremblant-woods', undefined, on), null, 'bought back');
  assert.equal(buybackPrice(profileOn(3), 'tremblant-woods', undefined, on), null, 'never burnt');
});

check('the regrowth stages follow the play days since the burn, also after a buyback', () => {
  const at = (days, boughtBack = false) => burnStage(burntOn(100, 100 + days, boughtBack), 'tremblant-woods', undefined, on);
  assert.deepEqual([0, 9, 10, 19, 20, 34, 35, 59, 60, 200].map(days => at(days)),
    ['closed', 'closed', 'black', 'black', 'shoots', 'shoots', 'fireweed', 'fireweed', null, null]);
  assert.deepEqual([0, 9, 10, 20].map(days => at(days, true)), ['black', 'black', 'black', 'shoots']);
  assert.deepEqual([0, 1, 2, 3, 9].map(days => burnSmoke(burntOn(10, 10 + days), 'tremblant-woods', undefined, on)), [true, true, true, false, false]);
  assert.equal(burnStage(profileOn(5), 'tremblant-woods', undefined, on), null);
});

check('scars heal sooner and are drawn cell by cell', () => {
  const scars = [{courseId: 'tremblant-woods', day: 0, cells: [1, 2]}, {courseId: 'tremblant-woods', day: 20, cells: [3]},
    {courseId: 'tremblant-snow', day: 20, cells: [4]}];
  const looks = today => scarLooks(profileOn(today, {}, {scars}), 'tremblant-woods', undefined, on).map(look => [look.stage, [...look.cells]]);
  assert.deepEqual(looks(20), [['shoots', [1, 2]], ['black', [3]]]);
  assert.deepEqual(looks(30), [['fireweed', [1, 2]], ['shoots', [3]]]);
  assert.deepEqual(looks(45), [['fireweed', [3]]]);
  assert.deepEqual(looks(60), []);
});

check('the menu card shows days left, the price and what is short', () => {
  const card = closureCard(burntOn(4, 7), 'tremblant-woods', undefined, {...on, credits: 6_550, name: 'Tremblant Woods'});
  assert.deepEqual([card.closed, card.daysLeft, card.price, card.short], [true, 7, 7_000, 450]);
  assert.deepEqual([...card.lines], ['Closed: burnt in a forest fire.', 'Reopens in 7 play days.']);
  assert.equal(card.refusal, 'Tremblant Woods is closed after a forest fire.');
  const last = closureCard(burntOn(4, 13), 'tremblant-woods', undefined, {...on, credits: 99_999});
  assert.deepEqual([last.lines[1], last.price, last.short], ['Reopens in 1 play day.', 1_000, 0]);
  const reopened = closureCard(burntOn(4, 14), 'tremblant-woods', undefined, on);
  assert.deepEqual([reopened.closed, reopened.reopened, [...reopened.lines]], [false, true, ['Reopened after the fire.']]);
  assert.equal(closureCard(burntOn(4, 15), 'tremblant-woods', undefined, on), null, 'the reopening note shows one play day');
  assert.equal(closureCard(burntOn(4, 14, true), 'tremblant-woods', undefined, on), null, 'a course bought back has no reopening day');
  assert.equal(closureCard(profileOn(3), 'tremblant-woods', undefined, on), null);
});

check('with the switch off nothing is closed or burnt, whatever the save says', () => {
  const profile = {...burntOn(4, 6), heli: {...burntOn(4, 6).heli, scars: [{courseId: 'tremblant-woods', day: 5, cells: [1]}]}};
  for (const enabled of [false, undefined, 'yes', 1]) {
    assert.equal(courseClosed(profile, 'tremblant-woods', undefined, {enabled}), false);
    assert.equal(buybackPrice(profile, 'tremblant-woods', undefined, {enabled}), null);
    assert.equal(burnStage(profile, 'tremblant-woods', undefined, {enabled}), null);
    assert.equal(burnSmoke(profile, 'tremblant-woods', undefined, {enabled}), false);
    assert.deepEqual(scarLooks(profile, 'tremblant-woods', undefined, {enabled}), []);
    assert.equal(closureCard(profile, 'tremblant-woods', undefined, {enabled}), null);
  }
  assert.deepEqual(profile.heli.burnt, {'tremblant-woods': {day: 4, boughtBack: false}}, 'the save keeps its data');
});

check('each player has their own closures', () => {
  const fixture = JSON.parse(readFileSync(new URL('./fixtures/saves/11-heli-fire.json', import.meta.url), 'utf8'));
  const [fire, other] = fixture.storage['the-duel-players-v2'].players.map(player => player.profile);
  assert.equal(courseClosed(fire, 'panorama-ridge', undefined, on), true);
  assert.equal(buybackPrice(fire, 'panorama-ridge', undefined, on), 7_000);
  assert.equal(courseClosed(other, 'panorama-ridge', undefined, on), false, "one player's burnt course is open for the other");
});

check('damaged or missing fields read as open', () => {
  for (const heli of [undefined, null, 7, [], {}, {burnt: null}, {burnt: []}, {burnt: {'tremblant-woods': null}},
    {burnt: {'tremblant-woods': {day: -1}}}, {burnt: {'tremblant-woods': {day: 'x'}}}, {burnt: {'tremblant-woods': {day: 1.5}}}]) {
    const profile = {...createProfile(), heli};
    assert.equal(courseClosed(profile, 'tremblant-woods', 3, on), false, JSON.stringify(heli));
    assert.equal(burnStage(profile, 'tremblant-woods', 3, on), null);
    assert.deepEqual(scarLooks(profile, 'tremblant-woods', 3, on), []);
  }
  assert.equal(playDayOf(null), 0);
  assert.equal(playDayOf({heli: {playDay: {count: 12}}}), 12);
});

check('burning, buying back, scars and healing work through the save helpers', () => {
  let profile = burnCourse(profileOn(4), 'tremblant-woods', 4, on).profile;
  assert.equal(courseClosed(profile, 'tremblant-woods', undefined, on), true);
  profile = {...profile, credits: 9_999};
  const short = buyBack(profile, 'tremblant-woods', on);
  assert.deepEqual([short.ok, short.reason, short.profile], [false, 'You need 1 more credit.', profile]);
  profile = {...profile, credits: 10_000};
  const bought = buyBack(profile, 'tremblant-woods', on);
  assert.deepEqual([bought.ok, bought.price, bought.profile.credits], [true, 10_000, 0]);
  assert.equal(courseClosed(bought.profile, 'tremblant-woods', undefined, on), false, 'buying back reopens it at once');
  assert.equal(burnStage(bought.profile, 'tremblant-woods', undefined, on), 'black');
  assert.equal(buyBack(bought.profile, 'tremblant-woods', on).ok, false, 'an open course cannot be bought');
  assert.equal(buyBack(profileOn(4), 'tremblant-woods', {enabled: false}).ok, false);
  // A new play day forgets a burn at 60 days and a scar at 40.
  let healed = addScar(burnCourse(profileOn(10), 'tremblant-woods', 0, on).profile, 'tremblant-woods', 25, [5, 6], on).profile;
  healed = {...healed, heli: {...healed.heli, playDay: {last: '2026-10-20', count: 59}}};
  const day60 = notePlayDay(healed, '2026-10-21', on).profile;
  assert.deepEqual([day60.heli.playDay.count, day60.heli.burnt, day60.heli.scars.length], [60, {}, 1]);
  const scarHealed = notePlayDay({...day60, heli: {...day60.heli, playDay: {last: '2026-10-21', count: 64}}}, '2026-10-22', on).profile;
  assert.deepEqual(scarHealed.heli.scars, []);
  const kept = notePlayDay({...healed, heli: {...healed.heli, playDay: {last: '2026-10-20', count: 50}}}, '2026-10-21', on).profile;
  assert.deepEqual(Object.keys(kept.heli.burnt), ['tremblant-woods']);
});

console.log(`Course closures: ${checks} groups passed.`);
