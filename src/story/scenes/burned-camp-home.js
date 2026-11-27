// Smoke over a friend, Scenes 5–7 (open-scablands.md section 21).
const id = 'burned-camp';
const rats = {cast: 'enemy', is: 'road-rats'};
const ash = {cast: 'enemy', is: 'ash-men'};
const mark = (key, text) => ({type: 'mark', id: id + '/' + key, text});
const has = key => ({fact: 'mark', id: id + '/' + key});
const say = (speaker, words, more) => ({speaker, words, ...more});
const campWord = set => ({type: 'word', person: '@camp.people', set});
const nest = spot => ['rats-nest', spot];
const gate = ['tin-town', 'gate'];
const payBack = [{when: {chose: 'buy-back'}, to: 'bought-back'}, {when: {chose: 'buy-back-embers'}, to: 'bought-back'}, {to: 'freed'}];
const finchHome = {any: ['drain-out', 'broke-out', 'home/finch'].map(has)};
const homeDace = {any: ['walkers-inside', 'dace-runner'].map(id => ({fact: 'mark', id}))};
const helper = (id, person, when, words, offer, pick, job, extra = {}) => ({
  id, person, when, words, offer, pick, job, ...extra,
});

export const RESCUE_HELPERS = [
  helper('rell', 'rell', {fact: 'word', of: 'walkers', atLeast: 'Friendly'}, 'Rell, would you come?',
    "We owe you two nights' watch on your fence. I'll give you one night at their fence instead, with six of my people, and after that we're square. We can get through any drain that a goat can.",
    'Rell, come with your people.', 'pen', {debts: ['walkers-watch', 'gate-watch'], people: 'walkers'}),
  helper('dace', 'dace', homeDace, 'Dace, would you come?',
    "I can get through a drain faster than any of them, because I'm thinner. And I've run away from enough people to know how it's done.",
    'Dace, come with us.', 'pen', {people: 'walkers'}),
  helper('moss', 'moss', undefined, 'Moss, would you bring Bess?',
    "If you ask me to, I'll bring Bess. But if they put a hole in Bess, nobody fetches gas tomorrow, and you'll be the one who explains that to Auntie.",
    'Moss, bring Bess.', 'carry', {people: 'tin-town'}),
  helper('keeper', 'you', {fact: 'made', id: 'tower/crows-step'}, 'Would you watch their road for us?',
    "I can't leave my tower, but I can watch their road for you. I'll tell you the moment the buggies turn round and come back.",
    'Keep watch from your tower.', 'watch', {as: 'The keeper'}),
  helper('tally', 'tally', {fact: 'mark', id: 'stranded-hauler/helped'}, 'Tally, could you help us?',
    'I sell tyres to Sump, so his gate opens for my truck. I could be delivering tyres at dusk tomorrow, very slowly, right in the middle of his gateway.',
    'Tally, block their gate.', 'block', {people: 'traders', debts: ['stranded-hauler/tally-owes']}),
  helper('nat', 'slack', {any: ['kept', 'paid', 'kept-ahead'].map(ending => ({fact: 'mark', id: 'runaway/' + ending}))},
    'Nat, would you show them the way in?', '', 'Nat, show us the way in.', 'guide', {as: 'Nat', ashOnly: true}),
];

const withRats = when => when ? {all: [rats, when]} : rats;
export const homeLines = [
  say('auntie-solder', 'Sit down and tell me all of it. You can start with how many of them there are.'),
  say('cinder', "There are nine people sorting scrap in a pen tonight, and they never did any of us any harm. I'm only saying it out loud so that somebody has said it.", {when: rats}),
  say('auntie-solder', "We also have three embers left, and a fence that needs watching every night. I'm saying that out loud as well.", {when: rats}),
  say('moss', "Bess could carry twelve people in the tank cradle, if they didn't mind the smell of gas. I'm not offering to go. I'm only telling you what Bess is able to do.", {when: rats}),
  say('finch', "Gran will be telling the others that somebody is coming for them. She always says that. I'd like it to be true this time.", {when: withRats(finchHome)}),
];
export const homeQuestions = RESCUE_HELPERS.filter(row => !row.ashOnly).map(row => ({
  id: 'rats-who-' + row.id, to: row.person, when: row.id === 'rell' ? row.when : withRats(row.when), words: row.words,
  lines: [say(row.person, row.offer, row.as && {as: row.as})],
}));
export const nobodyComes = say('auntie-solder', "I've nobody to send with you. I'm not saying that to stop you. I'm saying it so that you know.");
export const homeThoughts = [
  {thought: "Every person I take to the Rats' Nest is a person who won't be on our fence tonight.", when: rats},
  {thought: 'I wonder what Marigold is saying to the others right now about whether anybody is coming.', when: rats},
];
export const homeChoices = [
  {id: 'buy-back', by: 'say', when: rats, words: "We'll buy them back. Sump said himself that he sells people.",
    thought: "He'll take it. I wonder what he'll decide to sell us next.",
    lines: [say('auntie-solder', "I'd expect about three hundred scrap, or three embers.")], next: 'buy-back-drive'},
  {id: 'leave-them', by: 'say', when: rats, words: "We can't do it. Not with three embers left and the fence as it is.",
    thought: 'I wonder how long Marigold will go on telling them that somebody is coming.',
    lines: [
      say('auntie-solder', "No. I don't think we can either, and I've been sitting here wishing I could think otherwise."),
      say('cinder', "I'll remember that we talked about it, at least. That's more than most camps out there would get."),
    ],
    effects: [campWord('Wary'), {type: 'site', id: '@camp', stage: 'empty'},
      mark('left-at-rats-nest', "You left the Glasshouse's people in the Rats' Nest.")], next: 'left'},
];

const broughtHome = [
  {...mark('rode-out', "You rode out with friends and brought the Glasshouse's people home."), when: rats},
  {...mark('rode-out', 'You rode out with friends and brought the people of {camp.name} home from the Grey Camp.'), when: ash},
];
export const rescueOutcomes = {
  'all-home': {
    cue: 'open.rescue.home',
    effects: [campWord('Sworn'), {type: 'feud', of: 'road-rats', by: 1,
      when: {all: [rats, {fact: 'feud', of: 'road-rats', is: 'Watching'}]}},
    {type: 'feud', of: 'ash-men', by: 1, when: ash}, ...broughtHome],
    next: 'gate',
  },
  'some-home': {effects: [
    {...mark('some-home', 'Some of the growers came home. The rest are still in the pen, under twice the guard.'), when: rats},
    {...mark('some-home', 'Some of the people of {camp.name} came home from the Grey Camp, and the rest are still there.'), when: ash},
  ], next: 'home'},
  'none-home': {
    lines: [say('rell', "I brought six people to a drain, and we waited there for a whistle that never came. I'm not angry with you. I'm just not going to do that again in a hurry.", {when: rats}),
      say('rell', "I brought six people to the bottom of a heap of ash, and we waited there for a whistle that never came. I'm not angry with you. I'm just not going to do that again in a hurry.", {when: ash})],
    effects: [
      {...mark('rescue-failed', 'The rescue failed, and nobody came home.'), when: rats},
      {...mark('rescue-failed', 'The rescue at the Grey Camp failed, and nobody came home.'), when: ash},
    ], next: 'home',
  },
  'bess-holed': {
    cue: 'open.rescue.home',
    effects: [campWord('Sworn'), {type: 'feud', of: 'road-rats', by: 1,
      when: {all: [rats, {fact: 'feud', of: 'road-rats', is: 'Watching'}]}},
    {type: 'feud', of: 'ash-men', by: 1, when: ash}, ...broughtHome,
    mark('bess-holed', 'Bess was holed on the way home. The next gas run will bring back less.')],
    next: 'gate',
  },
};

export const partyMission = {
  id: id + '/rescue', kind: 'party-rescue', by: 'car', minutes: 12, outing: true, holds: ['checkpoints', 'signs'],
  enemy: '@enemy', cars: 4,
  rule: {
    entrance: nest('road-top'), lookout: nest('bay-front-1'), pen: nest('pen-gate'), drain: nest('drain-out'),
    chaseTo: 'boneyard', home: gate, via: 'girder-bridge', exitVia: nest('rescue-gully'),
    riders: [2, 3, 4, 5].map(number => nest('bay-front-' + number)),
    returnRiders: [5, 6].map(number => nest('bay-front-' + number)),
    chaseSeconds: 180, fallBackBefore: 60, escortSeconds: 180, chainSeconds: 8,
    chaseWithin: 900, safeGap: 30, wrecked: true, moments: ['whistle', 'turning', 'guided'],
  },
  lines: [
    say('rell', "They're all out, every one of the nine. The old woman wanted to go back for her glass, and I told her no.",
      {when: rats, radio: true, moment: 'whistle'}),
    say('rell', "They're all out, every one of the nine. The old woman wanted to go back for her stove, and I told her no.",
      {when: ash, radio: true, moment: 'whistle'}),
    say('slack', "Down the tip and round the coal heap, the same as always. Nobody even looked at me.",
      {when: ash, radio: true, as: 'Nat', moment: 'guided'}),
    say('you', 'The buggies are turning back toward the pen.', {as: 'The keeper', radio: true, moment: 'turning'}),
  ],
  outcomes: rescueOutcomes,
};

export const soloEscort = {
  when: {reach: ['rats-nest', 'road-top'], within: 85},
  mission: {...partyMission, id: id + '/alone-home', outing: false,
    rule: {...partyMission.rule, escortOnly: true, carries: false, people: 9},
    lines: [], outcomes: {
      'all-home': {cue: 'open.rescue.home', effects: [campWord('Sworn')], next: 'gate'},
    },
  },
};
export const buyBackDrive = {
  when: {all: [{nights: 1}, {reach: gate, within: 100}]},
  mission: {id: id + '/price-drive', kind: 'party-rescue', by: 'car', minutes: 6, outing: true,
    holds: ['checkpoints', 'signs'], rule: {...partyMission.rule, roundTrip: true, carries: true, people: 0, wrecked: 'turned-back'},

    outcomes: {paid: {next: 'buy-back-ransom'}, 'turned-back': {next: 'buy-back-drive'}}},
};
export const buyBackRansom = {
  cue: 'open.ransom.paid',
  lines: [
    say('sump', "Nine growers, one water cart and a stack of glass. I'll even throw in the cart for nothing, because it squeaks. It's always a pleasure doing business with Tin Town."),
    say('marigold', "You paid for us as if we were sacks of flour. I ought to be offended. I find that I'm not offended at all."),
  ],
  // The drawn and scaled price is supplied by the runtime before this entry is applied.
  effects: [campWord('Sworn'), {type: 'feud', of: 'road-rats', by: -3}, mark('bought-back', "Tin Town bought the Glasshouse's people back from the Road Rats.")],
  next: 'gate',
};
export const gateRoadRats = say('marigold', "We've nothing to go back to except broken glass and a pump. It's a good pump, mind you. Somebody mended it properly.", {when: rats});
export const seepShared = {fact: 'made', id: 'sweet-seep/well-shared'};
export const campChoices = [
  {id: 'rebuild', by: 'say', when: rats, words: "We'll help you build it again.",
    lines: [say('marigold', "You'd haul glass across the Scablands for a few rows of beans? Then you'll have the first basket of every crop, and I won't hear any argument about it.")],
    effects: [{type: 'promise', id: id + '/haul-glass', person: 'marigold', dueNights: 1,
      text: 'You promised to haul a load of windscreens from the Boneyard to the Glasshouse.'}], next: 'haul-glass'},
  {id: 'move-to-seep', by: 'say', when: withRats(seepShared), words: "There's water at the Sweet Seep now. Why not build there?",
    lines: [say('marigold', "Beans beside a well that never runs dry. I've been dreaming about that for thirty years, and I never once thought to ask anybody for it.")],
    effects: [{type: 'find', site: 'sweet-seep'}, {type: 'site', id: 'sweet-seep', stage: 'outpost'},
      {type: 'site', id: '@camp', stage: 'empty'}, mark('moved-to-seep', 'The Glasshouse growers settled at the Sweet Seep.')],
    next: payBack},
];
export const glassHaul = {
  when: {reach: gate, within: 100},
  mission: {id: id + '/windscreens', kind: 'reach', by: 'car', minutes: 6, outing: true, holds: ['checkpoints', 'signs'],
    rule: {destination: 'boneyard', within: 45, returnTo: '@camp', viaWithin: 50, success: 'delivered'},
    outcomes: {delivered: {effects: [{type: 'settle', id: id + '/haul-glass'}, {type: 'site', id: '@camp', stage: 'rebuilt'},
      campWord('Sworn'), mark('rebuilt', 'You hauled windscreens from the Boneyard and rebuilt the Glasshouse.')], next: payBack}}},
};

export const raisedPriceLine = say('sump', "I've put my prices up. I had to, after Tin Town paid three hundred for nine bean growers without even arguing. Everybody on the road heard about that.");
export const leftTrader = {id: 'trader-bolts', by: 'tally', when: has('left-at-rats-nest'),
  lines: [say('tally', "I saw the bean woman at the Rats' Nest last week. She was sorting bolts into tins. She asked me whether anybody from Tin Town had said anything about her, and I didn't know what to tell her.", {as: 'The trader'})]};
