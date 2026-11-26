const ID = 'burned-camp';
const mark = (key, text) => ({type: 'mark', id: `${ID}/${key}`, ...(text ? {text} : {})});
const reach = (spot, within = 2.8) => ({reach: ['@camp', spot], within});
const fresh = {not: {nights: 2, since: 'sign'}};
const atCar = reach('parked-car', 8);
const leftCar = {found: 'approached'};
const backAtCar = {all: [atCar, {found: 'approached'}]};
const approach = {reach: '@camp', within: 40};
const keeper = {fact: 'made', id: 'tower/crows-step'};
const clues = [
  ['frames', 'The glass frames are smashed, and tyre marks run straight down the bean rows.',
    'Somebody drove right through the beans. Nobody who was hungry would have done that.'],
  ['lamp', 'A car lamp lies broken in the ash of the store tent.',
    "This is a lamp off a car, and somebody threw it. That's exactly how Dot's diner was set on fire."],
  ['tracks', 'Many narrow tyre tracks leave the camp to the south-east.',
    'These tracks are narrow, and there are a lot of them. Those were buggies. A truck would leave tracks twice as wide.', fresh],
  ['ruts', 'Two deep ruts run beside the tracks, with small footprints between them.',
    'Those ruts are from the water cart, and people were walking beside it. They were taken away alive.', fresh],
  ['pods', 'A green bean pod lies on the track, and another twenty steps on, and another.',
    "Somebody dropped these one at a time, and they're still fresh. Somebody wanted to be followed.", fresh],
  ['pump', 'The wind pump is still turning.',
    "That's the pump I mended. It's still turning, and there's nobody left here to drink from it."],
];
const allClues = {all: clues.map(([id, , , when]) => when ? {any: [{found: id}, {not: when}]} : {found: id})};
const decide = {any: [allClues, backAtCar]};
const falseTrail = {cast: 'blamed'};
const radio = (id, to, words, answer, shows, when) => ({id, to, words, lines: [{speaker: to, radio: true, words: answer}], shows, when});

export default {
  id: ID,
  title: 'Smoke over a friend',
  kind: 'trouble',
  reads: ['stage', 'found', 'word', 'feud', 'night', 'made', 'mark'],
  writes: ['site', 'mark'],
  cast: {
    camp: {from: 'sites', among: ['glasshouse'], where: {all: [{fact: 'stage', is: 'camp'}, {fact: 'found'}, {fact: 'word', atLeast: 'Friendly'}]}},
    enemy: {from: 'groups', among: ['road-rats'], where: {fact: 'feud', atLeast: 'Watching'}, weightBy: 'feud'},
    blamed: {from: 'groups', among: ['ash-men'], apartFrom: ['enemy'], optional: true,
      where: {all: [{cast: 'enemy', is: 'road-rats'}, {fact: 'draw', name: 'false-trail', chance: .3}]}},
  },
  starts: {when: {all: [{fact: 'night', atLeast: 2}, {fact: 'draw', name: 'start', chance: .5}]}},
  sign: {kind: 'smoke', at: '@camp', seenWithin: 3500, lastsNights: 2, nightsNeeded: 2, cue: 'open.smoke.seen'},
  beats: {
    sign: {
      when: 'sign-seen',
      lines: [{speaker: 'you', as: 'The keeper', radio: true, when: keeper,
        words: 'I can see smoke to the north-east, where your bean people live. Six buggies went up that way before dawn, and I counted only five coming back with a cart behind them.'}],
      thoughts: [
        "That smoke is over by {camp.name}, and it's far too thick and dark for a cooking fire.",
        '{camp.leader} burns bean stalks in her stove, and they hardly make any smoke at all.',
      ],
      effects: [{type: 'site', id: '@camp', stage: 'burned'}, mark('burned', '{camp.name} was burned and its people taken.')],
      next: 'clues',
    },
    clues: {
      when: approach,
      explore: [
        {id: 'approached', when: {all: [approach, {not: atCar}]}},
        ...clues.map(([id, what, thought, when]) => ({id, what, thought, tells: what,
          when: when ? {all: [reach(id), when]} : reach(id), effects: [mark(id, what)], cue: 'open.clue.found'})),
      ],
      questions: [
        radio('ash-men', 'cinder', 'Cinder, would the Ash Men burn a camp?',
          "The Ash Men put fires out, and they're proud of it. Burning a whole camp to the ground isn't like them at all. I'd look for somebody who enjoys a blaze.", 'Probably not the Ash Men'),
        radio('captives', 'auntie-solder', 'Auntie, who takes people?',
          "The Road Rats do. They put people to work sorting scrap, and they sell them back to anyone who'll pay. They've a place somewhere in the wreck fields, and I've never wanted to know exactly where.", 'Who, why, and roughly where'),
        radio('buggies', 'moss', 'Moss, what leaves narrow tracks?',
          "Buggies leave narrow tracks. Bess doesn't, and neither do the Ash Men's trucks. If you're following buggies, don't expect to catch them on soft ground.", 'The tracks, confirmed'),
        radio('walkers', 'rell', 'Rell, have your people seen anything?',
          'Six buggies crossed below our camp before first light, heading for the wreck fields, and they were pulling a cart. I thought it was odd, because Rats never carry water.', 'The number, and the cart',
          {fact: 'word', of: 'walkers', atLeast: 'Friendly'}),
        radio('ash', 'cinder', "Cinder, there's ash heaped on the cook fire here.",
          "Put your hand under the ash for me. Is it still warm underneath? If it's stone cold, then somebody tipped that ash onto a fire that was already dead. The Ash Men smother a fire while it's burning. They don't dress up a dead one.", 'The ash was planted', falseTrail),
      ],
      thoughts: [
        {thought: 'The tracks are still fresh, so I could follow them now, before the wind covers them.', when: {all: [decide, fresh]}},
        {thought: "There were six buggies here. If I find them, I'll be finding all six of them at once.", when: decide},
      ],
      choices: [
        {id: 'follow', by: 'go', words: 'Follow the tracks south-east.', plain: 'The bean pods lead that way.',
          thought: 'I only need to look. Nobody said I have to fight.', when: {all: [leftCar, fresh, reach('tracks-away', 22)]},
          effects: [mark('followed-tracks')], next: 'scout'},
        {id: 'home', by: 'go', words: 'Drive home and tell Auntie Solder.', plain: 'The road home is on the map.',
          thought: 'Tin Town ought to hear about this before I do anything.', when: {all: [leftCar, reach('road-home', 40)]},
          effects: [mark('went-home')], next: 'home'},
        {id: 'drive-on', by: 'go', words: 'Drive on.', thought: "It isn't my camp, and I have a town of my own to keep warm.",
          when: {all: [leftCar, {not: {reach: '@camp', within: 150}}]}, effects: [mark('drove-on', 'You saw {camp.name} burned and drove on.')], next: 'left'},
      ],
    },
    scout: {notes: 'OPEN-BURNED-SCOUT builds Scene 3 on this beat.'},
    home: {notes: 'The later hearth card builds Scene 5 on this beat.'},
  },
  ends: ['left', 'taken'],
  ignored: {afterNights: 4, effects: [{type: 'site', id: '@camp', stage: 'burned'}, mark('never-went')], next: 'taken'},
  later: [{id: 'burned-camp/remembered', by: 'dot', when: {fact: 'mark', id: 'burned-camp/never-went'},
    lines: [{speaker: 'dot', words: 'There used to be a camp out past the Ridge that grew beans.'}]}],
};
