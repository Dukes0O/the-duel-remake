import assert from 'node:assert/strict';
import {activePlayer, createPlayerRegistry, createProfile, loadPlayers, savePlayers} from '../src/progression.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {applyChoice, bankHearth, causeOf, createLedger, ledgerPageData, recordedTellCause} from '../src/story/ledger.js';
import {bankLedgerHearth, beginLedger, recordLedgerChoice, savedLedger} from '../src/story/ledger-save.js';
import {ledgerPageMarkup, ledgerReplayMarkup, playLedgerChoice} from '../src/story/ledger-ui.js';
import {keepNight2Replay, settleNight2} from '../src/story/night-2-save.js';
import {NIGHT_2_CHOICES, NIGHT_2_EFFECTS} from '../src/story/scenes/night-2.js';
import {pageFunctions, pageSource} from './scenarios/story-night-2.mjs';

const seed = 2381;
const opening = {seed, night: 2, embers: 4};
const scene = (id, effects) => ({id, effects});
const meetDace = scene('meet-dace', [{type: 'met', person: 'dace', text: 'You met at Tin Town’s gate.'}]);
const salt = scene('salt', NIGHT_2_EFFECTS.salt);
const debt = scene('escaped', NIGHT_2_EFFECTS.escaped);
const gift = [NIGHT_2_CHOICES[0], salt, meetDace, debt];
const inside = [NIGHT_2_CHOICES[2], scene('invite-promise', [
  {type: 'promise', id: 'dot-fire', person: 'dot', text: 'You promised Dot a fire by Night 4.', due: 4},
  {type: 'stock', stock: 'gas', by: 7},
  {type: 'made', id: 'watch-bench'},
]), scene('meet-wim', [{type: 'met', person: 'wim', text: 'Wim slept by the hearth.'}])];

function finished(journal, scrap = 0) {
  const ledger = journal.reduce((entry, choice) => applyChoice(entry, choice).ledger, createLedger(opening));
  return {opening, journal, ledger: bankHearth(ledger).ledger, scrap, completed: true};
}

const base = {...createProfile(), credits: 327, story: {version: 1, elsewhere: {kept: 9}}};
const first = settleNight2(base, finished(gift, 10)).profile;
assert.equal(first.wasteland.scrap, 10);
const legacyLedger = structuredClone(savedLedger(first));
const modernHistory = legacyLedger.history;
legacyLedger.history = modernHistory.map(change => {
  // Original v1 recorded only the keys of a debt and an encounter.
  if (change.type !== 'debt' && change.type !== 'met') return change;
  const {before, after, ...legacy} = change;
  return legacy;
});
const old = {...first, story: {...first.story, ledger: legacyLedger}};
const replay = finished(inside, 50);
const bytes = new Map();
const storage = {getItem: key => bytes.get(key) ?? null, setItem: (key, value) => bytes.set(key, value)};
const durableBefore = JSON.stringify(old);
assert(savePlayers(createPlayerRegistry(old), storage));
const diskBefore = [...bytes.values()][0];
const comparing = settleNight2(old, replay);
assert.strictEqual(comparing.profile, old);
assert.equal(comparing.changed, false);
assert.equal(JSON.stringify(old), durableBefore);
assert.equal([...bytes.values()][0], diskBefore);
const reloaded = activePlayer(loadPlayers(storage)).profile;
assert.deepEqual(savedLedger(reloaded), legacyLedger);
assert.equal(keepNight2Replay(old, {...replay, completed: false}, comparing.replay.expected).ok, false);
assert.equal(settleNight2(old, {...replay, completed: false}).replay, undefined);

const replacement = keepNight2Replay(old, replay, comparing.replay.expected);
assert(replacement.ok && replacement.changed);
assert.equal(replacement.profile.credits, 327);
assert.deepEqual(replacement.profile.story.elsewhere, old.story.elsewhere);
assert.deepEqual(replacement.profile.wasteland, old.wasteland, 'no career pay on replacement');
assert.deepEqual({...savedLedger(replacement.profile), version: undefined}, {...replay.ledger, version: undefined});
assert.equal(keepNight2Replay(replacement.profile, replay, comparing.replay.expected).ok, false, 'stale confirmation');
assert.equal(settleNight2(replacement.profile, finished(gift, 10)).profile.wasteland.scrap, 10);
const unpayable = settleNight2(base, finished(inside)).profile;
const reopen = settleNight2(unpayable, finished(gift, 10)).replay;
assert.equal(keepNight2Replay(unpayable, finished(gift, 10), reopen.expected).profile.wasteland.scrap, 0);

const source = causeOf(legacyLedger, 'mark', 'dace-kept-watch');
let later = recordLedgerChoice(old, 3, scene('night-3/wim', [
  {type: 'read', fact: 'mark', key: 'dace-kept-watch'},
  {type: 'tell', source: source.index, text: 'Dace kept watch once.', because: 'The gate stayed lit.'},
  {type: 'stock', stock: 'embers', by: 2}, {type: 'settle', id: 'walkers-great-favour'},
  {type: 'mark', id: 'night-3-left-town'},
  {type: 'met', person: 'dace', text: 'Dace left town.'},
])).profile;
later = bankLedgerHearth(later, 3).profile;
later = recordLedgerChoice(later, 4, scene('night-4/toll', [
  {type: 'debt', id: 'bridge', person: 'dot', text: 'Dot owes you a plank.'},
])).profile;
later = bankLedgerHearth(later, 4).profile;
const oldLater = savedLedger(later).history.filter(change => change.night > 2);
const replacingLater = settleNight2(later, replay).replay;
const laterResult = keepNight2Replay(later, replay, replacingLater.expected).profile;
const laterLedger = savedLedger(laterResult);
assert.equal(laterLedger.version, 1);
assert.equal(laterLedger.night, 5);
assert.deepEqual(laterLedger.history.filter(change => change.night > 2), oldLater);
assert.equal(laterLedger.stocks.embers, 3, 'carry the later nights’ actual gains and burns');
assert.equal(laterLedger.stocks.gas, 7);
assert.equal(laterLedger.encounters.dace, 'Dace left town.');
assert(laterLedger.marks.includes('night-3-left-town'));
assert(!laterLedger.marks.includes('dace-kept-watch'));
assert.deepEqual(laterLedger.obligations.map(item => item.id).sort(), ['bridge', 'dot-fire']);
assert.deepEqual(laterLedger.toldBeforeChange, [3, 4]);
assert.match(ledgerPageMarkup(ledgerPageData(laterLedger), String), /Night 3 was told before this changed/);

let independent = beginLedger(base, {...opening, embers: 0}).profile;
independent = recordLedgerChoice(independent, 2, scene('night-2/gas', [{type: 'stock', stock: 'gas', by: 5}])).profile;
independent = bankLedgerHearth(independent, 2).profile;
independent = bankLedgerHearth(independent, 3).profile;
const gasChanged = finished([scene('night-2/gas', [{type: 'stock', stock: 'gas', by: 8}])]);
const gasReplay = settleNight2(independent, gasChanged).replay;
assert.deepEqual(savedLedger(keepNight2Replay(independent, gasChanged, gasReplay.expected).profile).toldBeforeChange, undefined,
  'an independent night did not read the changed gas');

const ordinary = finished([]);
const shareHeat = finished([scene('share-hearth', [{type: 'shareHearth'}])]);
let heated = settleNight2(base, shareHeat).profile;
heated = bankLedgerHearth(heated, 3).profile;
heated = bankLedgerHearth(heated, 4).profile;
const heatReplay = settleNight2(heated, ordinary).replay;
const unheated = keepNight2Replay(heated, ordinary, heatReplay.expected).profile;
assert.deepEqual(savedLedger(unheated).toldBeforeChange, [3], 'only the extra-burn night depended on sharing the hearth');

let settled = settleNight2(base, finished([NIGHT_2_CHOICES[1]])).profile;
settled = recordLedgerChoice(settled, 3, scene('night-3/done-watch', [{type: 'settle', id: 'walkers-watch'}])).profile;
settled = bankLedgerHearth(settled, 3).profile;
const oldSettlement = structuredClone(settled);
for (const item of oldSettlement.story.ledger.history.filter(change => ['debt', 'settle'].includes(change.type))) {
  delete item.before;
  delete item.after;
}
const watch = finished([NIGHT_2_CHOICES[1]]);
const again = settleNight2(oldSettlement, watch).replay;
assert.deepEqual(again.differences, [], 'an identical legacy debt still stands as originally paid');
const stillSettled = savedLedger(keepNight2Replay(oldSettlement, watch, again.expected).profile);
assert.deepEqual(stillSettled.obligations, []);
assert.equal(stillSettled.toldBeforeChange, undefined);
const noWatch = settleNight2(oldSettlement, ordinary).replay;
assert.match(noWatch.differences.find(change => change.key === 'walkers-watch').kept.text, /two nights/);

const oldNarrator = structuredClone(later);
const originalTell = oldNarrator.story.ledger.history.find(change => change.type === 'tell');
const originalCause = originalTell.cause;
delete originalTell.cause;
const oldNarratorCompare = settleNight2(oldNarrator, replay).replay;
const cutCause = keepNight2Replay(oldNarrator, replay, oldNarratorCompare.expected).profile;
const cutLedger = savedLedger(cutCause);
const cutTell = cutLedger.history.find(change => change.type === 'tell');
assert.deepEqual(cutTell, originalTell);
assert.deepEqual(recordedTellCause(cutLedger, cutTell), originalCause);
const restore = settleNight2(cutCause, finished(gift, 10)).replay;
const restored = savedLedger(keepNight2Replay(cutCause, finished(gift, 10), restore.expected).profile);
const restoredTell = restored.history.find(change => change.type === 'tell');
assert.deepEqual(restoredTell, originalTell);
assert.deepEqual(recordedTellCause(restored, restoredTell), originalCause);
assert.equal(causeOf(restored, 'mark', 'dace-kept-watch').choiceId, originalCause.choiceId);

const rawMarkup = ledgerReplayMarkup(comparing.replay, String);
assert.match(rawMarkup, /As it stands.+This time/);
assert.match(rawMarkup, /2 embers in store/);
assert.match(rawMarkup, /3 embers in store/);
assert.match(rawMarkup, /7 gas in store/);
assert.match(rawMarkup, /Keep how it stands.+Keep this time/);
assert.match(ledgerReplayMarkup({...comparing.replay, confirming: true}, String), /The first telling will be forgotten/);
const cues = [];
playLedgerChoice({context: {state: 'running'}, _playCue: cue => cues.push(cue)});
assert.deepEqual(cues, ['story.ledger.choose']);
assert.equal(SOUND_BANK[cues[0]].flag, 'story-choices');
assert(SOUND_BANK[cues[0]].layers.length > 0);
for (const name of Object.keys(pageFunctions)) assert.doesNotThrow(() => new Function('return ' + pageSource(name)));
console.log('PASS story replay pick: v1 save, original bytes, replacement, career pay, later nights and comparison.');
