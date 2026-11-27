// Market Day uses the yard's existing gates, sheds and people. Positions are relative to the named land.
import {LAND} from '../../scablands-names.js';
// The hearth, gate, pump and Walkers' camp reuse the Night 2 yard. Dot's other post is at her outpost door.
export const MARKET_PLACES = Object.freeze({
  yard: LAND.at('tin-town', 11, 11),
  hearth: LAND.at('tin-town', 27.25, 7.375),
  gate: LAND.at('tin-town', -22.85, 52.6),
  diner: LAND.at('boneyard', -804.71, -157.73),
  'beside-the-gate': LAND.at('tin-town', -31.35, 48.6),
  'the-pump': LAND.at('tin-town', -11, -34.75),
  'the-sunny-wall': LAND.at('tin-town', -12, -23),
  'the-forge-wall': LAND.at('tin-town', -12, -30),
  'bess-shed': LAND.at('tin-town', 22, 35),
  news: LAND.at('tin-town', 3, -21),
  walkers: LAND.at('tin-town', -601, 250),
});

export const MARKET_HOME = Object.freeze({
  'deck-folk': LAND.at('ships-in-sand', 25, 18),
  'ash-men': LAND.at('everburn', 35, 10),
  'road-rats': LAND.at('boneyard', -150, -864),
  'water-men': LAND.at('dry-dam', 23, 12),
  seaview: LAND.at('dead-mall', -22, 16),
});

// Like the lookout cast, these named people can reuse figures already in the game.
export const MARKET_FIGURES = Object.freeze({
  dot: 'walker-2', gasket: 'walker-6', lug: 'road-rat-lamp',
  'captain-imre': 'walker-4', 'old-smoke': 'clinker', 'mrs-vane': 'walker-4', 'mr-penny': 'walker-8',
});

export const MARKET_GUESTS = Object.freeze(['first', 'second', 'third']);
export const BUS_RING = Object.freeze({meeting: 'workbench'});
