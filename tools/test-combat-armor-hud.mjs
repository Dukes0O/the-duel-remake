import assert from 'node:assert/strict';
import test from 'node:test';
import {Duel} from '../src/game.js';
import {createHudScreen} from '../src/screen-hud.js';

function hudFor(wasteland2, armor = 40) {
  const duel = new Duel({seed: 1989, featureFlags: {wasteland2}});
  duel.startCampaign({mode: 'wasteland', car: 'falcone_f42'});
  const state = duel.state;
  state.status = 'racing';
  state.countdown = 0;
  if (wasteland2) state.armor = armor;
  const node = () => ({hidden: false, textContent: '', dataset: {}, style: {},
    classList: {toggle() {}}, setAttribute() {}});
  const ui = new Proxy({}, {get: (target, key) => target[key] ??= node()});
  const text = (id, value) => {ui[id].textContent = String(value);};
  const update = createHudScreen({app: {duel, cameraMode: 'chase'}, ui, text,
    time: value => Number(value || 0).toFixed(2),
    clamp: value => Math.max(0, Math.min(1, Number(value) || 0)),
    credits: value => Math.floor(value || 0).toLocaleString(),
    routeMap: {update() {}}});
  update(state);
  return {ui, state, update};
}

test('armored Wasteland shows current and maximum armor in place of crash pips', () => {
  const {ui, state, update} = hudFor(true);
  assert.equal(ui['lives-display'].hidden, true);
  assert.equal(ui['damage-label'].textContent,
    `ARMOR 40 / ${Math.round(state.maxArmor)}`);
  state.combatWrecking = true;
  state.armor = 0;
  update(state);
  assert.equal(ui['damage-label'].textContent,
    `ARMOR 0 / ${Math.round(state.maxArmor)} · RECOVERING`);
});

test('flag-off Wasteland retains major-hit pips and wording', () => {
  const {ui} = hudFor(false);
  assert.equal(ui['lives-display'].hidden, false);
  assert.equal(ui['damage-label'].textContent, '0 MAJOR HITS · AUTO RECOVERY');
  assert.match(ui['lives-display'].innerHTML, /healthy/);
});
