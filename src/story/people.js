// The same person has the same ID in each Wasteland story.
// A people (the Walkers) and a person (Rell) are both listed here, because a ledger keeps a word for either.
// src/world/open/register.js says which is which and who belongs to whom.
export const STORY_PEOPLE = Object.freeze({
  walkers: 'The Walkers',
  rell: 'Rell',
  dace: 'Dace',
  wim: 'Wim',
  'auntie-solder': 'Auntie Solder',
  cinder: 'Cinder',
  'ash-men': 'The Ash Men',
  clinker: 'Clinker',
  'deck-folk': 'The Deck Folk',
  dot: 'Dot',
  // The open Scablands (docs/story/open-scablands.md, sections 13, 16 and 21).
  'tin-town': 'Tin Town',
  odessa: 'Odessa',
  moss: 'Moss',
  glasshouse: 'The Glasshouse',
  marigold: 'Marigold',
  finch: 'Finch',
  'radio-hill': 'Radio Hill',
  hetty: 'Hetty',
  bern: 'Bern',
  'bus-ring': 'The Bus Ring',
  'road-rats': 'The Road Rats',
  sump: 'Sump',
  'old-smoke': 'Old Smoke',
  traders: 'The traders',
  travellers: 'Travellers on foot',
  'water-men': 'The water men',   // her name is kept back (docs/story/the-polite-letter.md, chapters 17 and 18)
  'mrs-vane': 'Mrs Vane',
  'captain-imre': 'Captain Imre',
  // The storylines written in full (docs/story/threads/).
  'nan-tallow': 'Nan Tallow',
  gasket: 'Gasket',
  lug: 'Lug',
  'miss-pell': 'Miss Pell',
  parrot: 'Parrot',
  fathom: 'Fathom',
  sprat: 'Sprat',
  kedge: 'Kedge',
  wick: 'Wick',
  slack: 'Slack',   // his own name is Nat, which he gives if he is asked (docs/story/threads/runaway.md)
});

export const FEUD_WORDS = Object.freeze(['Watching', 'Raiding', 'Hunting', 'War party']);
