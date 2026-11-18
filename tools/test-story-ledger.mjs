// STORY-LEDGER, rules and the real Story Wall. Every profile here is in memory.
import assert from 'node:assert/strict';
import {applyChoice, bankHearth, causeOf, createLedger, FEUD_WORDS, ledgerPageData, namedThrow, plainStockChange} from '../src/story/ledger.js';
import {bankLedgerHearth, beginLedger, recordLedgerChoice, savedLedger} from '../src/story/ledger-save.js';
import {STORY_PEOPLE} from '../src/story/people.js';
import {EMBER_FEUD_WORDS} from '../src/story/ember-save.js';
import {createProfile, normalizeProfile} from '../src/progression.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {SOUND_BANK} from '../src/sound-bank.js';

const opening = {night: 2, embers: 4, gas: 19, seed: 1234};
const initial = createLedger(opening);
const gift = {
  id: 'night-2/watch', plainStock: 'embers',
  effects: [
    {type: 'stock', stock: 'embers', by: -1},
    {type: 'word', person: 'walkers', by: 1},
    {type: 'roadWord', by: 1},
    {type: 'debt', id: 'gate-watch', person: 'walkers', text: "The Walkers owe you two nights' watch."},
    {type: 'promise', id: 'dot-fire', person: 'dot', text: 'You promised Dot three embers by the fourth night.', due: 4},
    {type: 'met', person: 'rell', text: 'Dace! You’re on the fence tonight.'},
    {type: 'mark', id: 'walkers-watch'},
  ],
};
for (const [embers, after] of [[0, 0], [1, 0], [5, 4]]) {
  assert.deepEqual(plainStockChange(createLedger({...opening, embers}), gift), {stock: 'embers', before: embers, after});
}
assert.equal(plainStockChange(initial, {effects: [{type: 'roadWord', by: 1}]}), null);
assert.equal(plainStockChange(initial, {...gift, plainStock: 'roadWord'}), null);
assert.deepEqual(plainStockChange(initial, {plainStock: 'gas', effects: []}), {stock: 'gas', before: 19, after: 19});

const bought = applyChoice(initial, gift);
assert.deepEqual(initial, createLedger(opening), 'rules preserve their input');
assert.deepEqual(bought.ledger.words, {walkers: 'Friendly'});
assert.deepEqual(bought.changes.map(change => change.type), gift.effects.map(effect => effect.type));
for (const [index, change] of bought.changes.entries())
  assert.deepEqual(causeOf(bought.ledger, change.type, change.key), {index, choiceId: gift.id, night: 2});
assert.deepEqual(applyChoice(bought.ledger, gift), {ledger: bought.ledger, changes: []}, 'replayed choice');
assert.deepEqual(FEUD_WORDS, EMBER_FEUD_WORDS);
const limits = applyChoice(bought.ledger, {
  id: 'limits', effects: [
    {type: 'stock', stock: 'gas', by: -21}, {type: 'stock', stock: 'gas', by: 2},
    {type: 'roadWord', by: 15}, {type: 'word', person: 'walkers', by: -15},
    {type: 'word', person: 'rell', set: 'Sworn'}, {type: 'feud', by: 12}, {type: 'made', id: 'tower'},
    {type: 'settle', id: 'gate-watch'},
  ],
}).ledger;
assert.equal(limits.stocks.gas, 2);
assert.equal(limits.roadWord, 5);
assert.equal(limits.feud, 'War party');
assert.equal(limits.words.walkers, 'Cold');
assert.deepEqual(limits.made, ['tower']);
assert.equal(limits.obligations.length, 1);
assert.deepEqual(bought.ledger.obligations.map(item => item.owedBy), ['walkers', 'player']);
const capped = applyChoice(limits, {id: 'back', effects: [
  {type: 'word', person: 'walkers', by: 10}, {type: 'roadWord', by: -10}, {type: 'feud', by: -10},
]}).ledger;
assert.equal(capped.roadWord, 0);
assert.equal(capped.words.walkers, 'Sworn');
assert.equal(capped.feud, 'Watching');
assert.deepEqual(ledgerPageData(bought.ledger), {
  embers: 3, gas: 19, nights: 3,
  people: [{name: STORY_PEOPLE.rell, last: 'Dace! You’re on the fence tonight.'}],
  obligations: gift.effects.filter(e => ['debt', 'promise'].includes(e.type)).map(e => e.text),
  consequences: [],
});
assert.throws(() => applyChoice(initial, {id: 'bad', effects: [{type: 'met', person: 'nobody', text: 'Hello.'}]}));

const invite = {id: 'night-2/take-in', effects: [{type: 'shareHearth'}]};
const crowded = applyChoice(bought.ledger, invite).ledger;
const first = bankHearth(crowded);
assert.equal(first.burned, 1);
assert.equal(first.ledger.night, 3);
assert.deepEqual(first.due, []);
const second = bankHearth(first.ledger);
assert.equal(second.burned, 2);
assert.equal(second.ledger.stocks.embers, 0);
assert.deepEqual(second.due, []);
const fourth = bankHearth(second.ledger);
assert.equal(fourth.burned, 0);
assert.deepEqual(fourth.due.map(p => p.id), ['dot-fire']);
assert.deepEqual(bankHearth(fourth.ledger).due, []);
assert.deepEqual(causeOf(first.ledger, 'stock', 'embers'),
  {index: crowded.history.length, night: 2, choiceId: 'bank/2'});

const source = causeOf(crowded, 'shareHearth');
const tell = {id: 'night-3/count', effects: [{
  type: 'tell', source: source.index, text: 'We burn more wood with eleven people inside.',
  because: 'It began the night you opened the gate.',
}]};
assert.equal(ledgerPageData(crowded).nights, 3, 'the hidden burn is not given away on the page');
const revealed = applyChoice(first.ledger, tell).ledger;
assert.equal(ledgerPageData(revealed).nights, 1, 'two embers left and the next night costs two');
assert.deepEqual(ledgerPageData(revealed).consequences, [{text: tell.effects[0].text, because: tell.effects[0].because}]);
assert.equal(revealed.history[revealed.history.at(-1).source].choiceId, invite.id);
const answer = namedThrow(crowded, 'night-2/dace', .5);
assert.equal(typeof answer, 'boolean');
assert.equal(namedThrow(revealed, 'night-2/dace', .5), answer);
assert.deepEqual(new Set(Array.from({length: 32}, (_, seed) =>
  namedThrow(createLedger({...opening, seed}), 'night-2/dace', .5))), new Set([true, false]));

const original = normalizeProfile({...createProfile(), story: {version: 1, kogane: {read: true}, ember: {feud: 4, custom: 3}, future: {notes: ['keep']}}});
const originalStory = JSON.stringify(original.story);
assert.equal(savedLedger(original), null);
assert.equal(Object.hasOwn(original.story, 'ledger'), false);
assert.equal(Object.hasOwn(normalizeProfile(original).story, 'ledger'), false);
const started = beginLedger(original, opening);
assert.ok(started.ok && started.changed);
const played = recordLedgerChoice(started.profile, 2, gift);
assert.ok(played.ok && played.changed);
assert.equal(recordLedgerChoice(played.profile, 2, gift).changed, false);
assert.equal(JSON.stringify(original.story), originalStory);
assert.equal(savedLedger(played.profile).stocks.embers, 3);
const roundTrip = normalizeProfile(JSON.parse(JSON.stringify(played.profile)));
assert.deepEqual(savedLedger(roundTrip), savedLedger(played.profile));
const {ledger, ...rest} = roundTrip.story;
assert.equal(JSON.stringify(rest), originalStory);
const done = bankLedgerHearth(roundTrip, 2);
assert.equal(savedLedger(done.profile).night, 3);
assert.equal(bankLedgerHearth(done.profile, 2).ok, false);
for (const profile of [
  {story: {version: 2}}, {story: {version: 0, other: {a: 1}}},
  {story: {version: 1, ledger: 'new-format'}}, {story: {version: 1, ledger: {version: 2, spare: 5}}},
]) {
  const before = JSON.stringify(profile);
  assert.equal(savedLedger(profile), null);
  assert.equal(beginLedger(profile, opening).profile, profile);
  for (const result of [beginLedger(profile, opening), recordLedgerChoice(profile, 2, gift), bankLedgerHearth(profile, 2)]) {
    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.equal(result.profile, profile);
  }
  assert.equal(JSON.stringify(profile), before);
}
const switches = qa => createFeatureFlags({storage: null, qa, search: '?flags=story-choices'});
const profile = {...roundTrip, wasteland: {...roundTrip.wasteland, discoveredGate: true}};
const render = (panel, qa) => yardHomeScreen({panel, profile, featureFlags: switches(qa), playerName: 'Tester', escapeHTML: s => String(s).replace(/</g, '&lt;')});
assert.ok(render('cards', true).includes('data-action="yard-ledger"'));
assert.ok(!render('cards', false).includes('data-action="yard-ledger"'));
assert.match(render('ledger', true), /Enough for 3 nights/);
assert.match(render('ledger', true), /Dace! You’re on the fence tonight/);
assert.doesNotMatch(render('ledger', true), /Friendly|Watching|walkers-watch|night-2\/watch/);
assert.doesNotMatch(render('ledger', false), /id="ledger-title"/);
assert.equal(SOUND_BANK['story.ledger.open'].flag, 'story-choices');
console.log('test-story-ledger: choice effects, visibility, luck, hearth, save round-trip and Story Wall passed');
