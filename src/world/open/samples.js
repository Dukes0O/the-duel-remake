// Sample worlds for the open Scablands' tests. Every card of the open land is built and checked against these same
// states, so that cards built apart agree when they meet. Each call returns a fresh world; nothing here touches a save.
//
//   sampleWorld('first-night')     Night 2 has just begun: nothing found, nobody met in the open
//   sampleWorld('nothing-found')   the third night, some scrap, the Road Rats raiding, and still nothing found
//   sampleWorld('helped-camp')     the state section 21 of docs/story/open-scablands.md is written for
//   sampleWorld('after-the-smoke') the same, with the Glasshouse burned and the storyline at its camp
import {applyEffects} from './open-effects.js';
import {newWorld} from './open-record.js';

export const SAMPLE_SEED = 1234;

const choices = (world, list) => list.reduce((now, [id, effects]) => applyEffects(now, {id, effects}).world, world);

const builders = {
  'first-night': () => newWorld({seed: SAMPLE_SEED, night: 2, embers: 4, gas: 19, scrap: 60}),

  'nothing-found': () => choices(newWorld({seed: SAMPLE_SEED, night: 3, embers: 3, gas: 12, scrap: 90}), [
    ['sample/rats-raid', [{type: 'feud', of: 'road-rats', by: 1}]],
  ]),

  // The third day of Five Cold Nights. The player found the Glasshouse on the second day and mended its wind pump,
  // so the growers are Friendly and owe one favour. The Walkers are Friendly and owe two nights' watch. The Road Rats
  // are Watching. The Word on the road is 1. Three embers in the store and 140 scrap in the car.
  'helped-camp': () => choices(newWorld({seed: SAMPLE_SEED, night: 3, embers: 3, gas: 12, scrap: 148}), [
    ['sample/walkers-watch', [
      {type: 'word', person: 'walkers', set: 'Friendly'},
      {type: 'roadWord', by: 1},
      {type: 'debt', id: 'gate-watch', person: 'walkers', text: "The Walkers owe you two nights' watch."},
      {type: 'met', person: 'rell', text: 'Rell kept the gate with you.'},
    ]],
    ['sample/glasshouse-found', [
      {type: 'find', site: 'glasshouse'},
      {type: 'met', person: 'glasshouse', text: 'You found the Glasshouse on the second night.'},
    ]],
    ['sample/glasshouse-pump', [
      {type: 'scrap', by: -8},
      {type: 'word', person: 'glasshouse', set: 'Friendly'},
      {type: 'favour', person: 'glasshouse', by: 1},
      {type: 'mark', id: 'glasshouse/pump-mended'},
    ]],
  ]),

  'after-the-smoke': () => choices(builders['helped-camp'](), [
    ['sample/glasshouse-burned', [
      {type: 'site', id: 'glasshouse', stage: 'burned'},
      {type: 'thread', id: 'burned-camp', to: 'clues', cast: {camp: 'glasshouse', enemy: 'road-rats'}},
      {type: 'mark', id: 'burned-camp/burned'},
    ]],
  ]),
};

export const SAMPLE_NAMES = Object.freeze(Object.keys(builders));

export function sampleWorld(name) {
  if (!builders[name]) throw new Error('No sample world is called "' + name + '". There are: ' + SAMPLE_NAMES.join(', ') + '.');
  return builders[name]();
}
