// Smoke over a friend: a storyline of the open Scablands as data (docs/story/open-scablands.md, section 18, "The one
// shape of a storyline's file"). Section 21 writes it for the Road Rats; docs/story/threads/burned-camp.md writes the
// Ash Men's turn of it (card OPEN-WRITE-4), and every line a player reads is here exactly as those pages have it. Card
// OPEN-ASH-FOLD put both turns in this one file on 26 November 2026.
//
// A row that belongs to one turn says so in its `when`. `ASH` ({cast: 'enemy', is: 'ash-men'}) is the Ash Men's turn,
// and `RATS` ({cast: 'enemy', is: 'road-rats'}) is a Road Rats' row that an Ash Men row takes the place of. The false
// trail's drive to the Grey Camp carries `BLAMED`, because in a false trail the enemy is the Road Rats and the Ash Men
// are only blamed. A row with neither belongs to both turns: the bean pods, the pump, the drive home, the drive on,
// raising a party and staying inside the fence.
//
// The Road Rats' scouting, rim, fight and pen are the beats `scout`, `rim`, `alone` and `drain`. The Ash Men's scouting,
// rim, fight, pen and break-out are beats of their own, named `grey-...`, because their missions and places are not the
// Road Rats'. `home`, `rescue` and `gate` are both turns' beats.
//
// The Ash Men can be cast only after their raid on the fourth night of Five Cold Nights (the mark `ash-raid`, which the
// main story is to write). A role cannot yet ask that of one candidate alone, so the cast, the start and the sign here
// are the Road Rats', and the Ash Men's are kept word for word in `notes.ashMenTurn` for the card that joins them.
// Until then every `ASH` row waits. During the act the fifth day is the only day left once the Ash Men are cast, so
// what happens on it is written for that day (IN_ACT), and Old Smoke says how it went at the parley of the fifth night
// (the `parley-` rows of `later`).
const ID = 'burned-camp';
const ASH = {cast: 'enemy', is: 'ash-men'};
const RATS = {cast: 'enemy', is: 'road-rats'};
const BLAMED = {cast: 'blamed'};
// The main story's mark for the Ash Men's raid on the fourth night. Nothing writes it yet, and the Ash Men are cast only
// after it, so a `later` row that needs the Ash Men asks it in place of ASH (`notes.laterWhen`).
const ASH_RAID = {fact: 'mark', id: 'ash-raid'};
const ash = (...more) => (more.length ? {all: [ASH, ...more]} : ASH);
const rats = (...more) => (more.length ? {all: [RATS, ...more]} : RATS);
// A mark; `text` is the sentence it shows on What people remember, written on the first effect that makes it.
const mark = (key, text) => ({type: 'mark', id: `${ID}/${key}`, ...(text ? {text} : {})});
const has = what => ({fact: 'mark', id: `${ID}/${what}`});
const say = (speaker, words, more = {}) => ({speaker, words, ...more});
const onRadio = {radio: true};
const ashFeud = by => ({type: 'feud', of: 'ash-men', by});
const embers = by => ({type: 'stock', stock: 'embers', by});
const embersAtLeast = n => ({fact: 'stock', of: 'embers', atLeast: n});
const embersAre = n => ({fact: 'stock', of: 'embers', is: n});

const GREY_CAMP = 'grey-camp';
const CAMP_PEOPLE = '@camp.people';
const reach = (spot, within = 2.8) => ({reach: ['@camp', spot], within});
// The tracks, the footprints and the bean pods last while the smoke stands (section 21, Scene 2).
const fresh = {not: {nights: 2, since: 'sign'}};
const atCar = reach('parked-car', 8);
const leftCar = {found: 'approached'};
const backAtCar = {all: [atCar, {found: 'approached'}]};
const approach = {reach: '@camp', within: 40};
const rim = (spot, within = 3) => ({reach: ['rats-nest', spot], within});
const rimSpots = ['rim-north', 'rim-middle', 'rim-south'];
const onRim = {any: rimSpots.map(spot => rim(spot, 6))};
const surveyed = {any: ['north-end', 'middle', 'south-end'].map(found => ({found}))};
const nestFound = [
  {type: 'find', site: 'rats-nest'},
  mark('found-rats-nest', "You found the Rats' Nest."),
];
const keeper = {fact: 'made', id: 'tower/crows-step'};
const WALKERS_FRIENDLY = {fact: 'word', of: 'walkers', atLeast: 'Friendly'};
// The fifth day of Five Cold Nights: the last day of the act, with the Long Cold at dusk.
const IN_ACT = {fact: 'night', is: 5};
// What "The runaway" leaves behind (docs/story/threads/runaway.md, section 8).
const BACK_WAY = {fact: 'made', id: 'way/grey-camp-back-way'};
const NAT_HANDED_BACK = {fact: 'mark', id: 'runaway/handed-back'};
const NAT_ASKED = {fact: 'mark', id: 'runaway/asked-his-name'};
const NAT_AT_TIN_TOWN = {any: [{fact: 'mark', id: 'runaway/kept'}, {fact: 'mark', id: 'runaway/paid'},
  {fact: 'mark', id: 'runaway/kept-ahead'}]};
const TALLY_HELPED = {fact: 'mark', id: 'stranded-hauler/helped'};
const DACE_HERE = {any: [{fact: 'mark', id: 'walkers-inside'}, {fact: 'mark', id: 'dace-runner'}]};
// The player was seen looking at the Grey Camp, on the drive or from the rim.
const GREY_SEEN = has('grey-seen');
// The price was raised once a break-out was caught.
const CAUGHT = has('grey-caught');

// The Road Rats' six things to find at the camp: [id, what is there, the thought, when]. The first four are the Road
// Rats' only; the Ash Men's turn has its own four in their place. The bean pods and the pump are both turns'.
const clues = [
  ['frames', 'The glass frames are smashed, and tyre marks run straight down the bean rows.',
    'Somebody drove right through the beans. Nobody who was hungry would have done that.', RATS],
  ['lamp', 'A car lamp lies broken in the ash of the store tent.',
    "This is a lamp off a car, and somebody threw it. That's exactly how Dot's diner was set on fire.", RATS],
  ['tracks', 'Many narrow tyre tracks leave the camp to the south-east.',
    'These tracks are narrow, and there are a lot of them. Those were buggies. A truck would leave tracks twice as wide.', rats(fresh)],
  ['ruts', 'Two deep ruts run beside the tracks, with small footprints between them.',
    'Those ruts are from the water cart, and people were walking beside it. They were taken away alive.', rats(fresh)],
  ['pods', 'A green bean pod lies on the track, and another twenty steps on, and another.',
    "Somebody dropped these one at a time, and they're still fresh. Somebody wanted to be followed.", fresh],
  ['pump', 'The wind pump is still turning.',
    "That's the pump I mended. It's still turning, and there's nobody left here to drink from it."],
];
// Every clue found, where a clue that cannot be found now (gone with the wind, or the other turn's) counts as found.
const allClues = {all: clues.map(([id, , , when]) => when ? {any: [{found: id}, {not: when}]} : {found: id})};
const decide = {any: [allClues, backAtCar]};
const radio = (id, to, words, answer, shows, when) => ({id, to, words, lines: [{speaker: to, radio: true, words: answer}], shows, when});

// Paying Clinker. Embers only, never scrap. When the store holds fewer than he asks, he takes every ember there is and
// calls it paid, because he would rather see Tin Town dark than see it keep one (Kyle, 21 November 2026: "even if it
// causes us to run out").
const pay = asked => [
  {...embers(-asked), when: embersAtLeast(asked)},
  ...Array.from({length: asked - 1}, (_, index) => ({...embers(-(index + 1)), when: embersAre(index + 1)})),
];

export default {
  id: ID,
  title: 'Smoke over a friend',
  kind: 'trouble',
  reads: ['stage', 'found', 'word', 'feud', 'night', 'made', 'mark', 'stock', 'thread', 'draw', 'promise'],
  writes: ['site', 'mark', 'feud', 'word', 'stock', 'find', 'rumour', 'promise', 'shareHearth'],

  // The Road Rats' cast. A false trail is never laid by the Ash Men: they would not set a fire to put the blame on
  // anybody, so `blamed` is cast only when the enemy is the Road Rats. The Ash Men's enemy row is in `notes.ashMenTurn`.
  cast: {
    camp: {from: 'sites', among: ['glasshouse'], where: {all: [{fact: 'stage', is: 'camp'}, {fact: 'found'}, {fact: 'word', atLeast: 'Friendly'}]}},
    enemy: {from: 'groups', among: ['road-rats'], where: {fact: 'feud', atLeast: 'Watching'}, weightBy: 'feud'},
    blamed: {from: 'groups', among: ['ash-men'], apartFrom: ['enemy'], optional: true,
      where: {all: [{cast: 'enemy', is: 'road-rats'}, {fact: 'draw', name: 'false-trail', chance: .3}]}},
  },
  starts: {all: [{fact: 'night', atLeast: 2}, {fact: 'draw', name: 'start', chance: .5}]},
  sign: {kind: 'smoke', at: '@camp', seenWithin: 3500, lastsNights: 2, nightsNeeded: 2, cue: 'open.smoke.seen'},

  beats: {
    // Scene 1. The smoke is the same in both turns. The keeper saw buggies, or trucks, and during the act the player
    // knows who was out last night.
    sign: {
      when: 'sign-seen',
      lines: [
        {speaker: 'you', as: 'The keeper', radio: true, when: rats(keeper),
          words: 'I can see smoke to the north-east, where your bean people live. Six buggies went up that way before dawn, and I counted only five coming back with a cart behind them.'},
        say('keeper', 'I can see smoke to the north-east, where your bean people live. Two grey trucks went up that way before dawn, and they came back slowly, with people walking behind them on a rope.',
          {as: 'The keeper', radio: true, when: ash(keeper)}),
      ],
      thoughts: [
        "That smoke is over by {camp.name}, and it's far too thick and dark for a cooking fire.",
        '{camp.leader} burns bean stalks in her stove, and they hardly make any smoke at all.',
        {thought: "The Ash Men came over our wall last night. It looks as if they didn't go straight home afterwards.", when: ash(IN_ACT)},
      ],
      effects: [{type: 'site', id: '@camp', stage: 'burned'}, mark('burned', '{camp.name} was burned and its people taken.')],
      next: 'clues',
    },

    // Scene 2. The camp. In the Ash Men's turn four of the six things differ; the bean pods and the pump are both turns'.
    clues: {
      when: approach,
      explore: [
        {id: 'approached', when: {all: [approach, {not: atCar}]}},
        ...clues.map(([id, what, thought, when]) => ({id, what, thought, tells: what,
          when: when ? {all: [reach(id), when]} : reach(id), effects: [mark(id, what)], cue: 'open.clue.found'})),
        {id: 'brazier', when: ASH, cue: 'open.clue.found',
          what: 'A brazier lies on its side by the tents, and the scorch runs from it into the canvas. The glass frames past it are cracked by the heat and nothing more',
          thought: 'That brazier was kicked over, and the fire ran from it into the tents. Nobody threw anything here. There was a struggle.',
          tells: 'The burning was not meant. The growers fought',
          effects: [mark('brazier', 'The fire at {camp.name} began with a brazier that was knocked over in a struggle.')]},
        {id: 'cook-fire', when: ASH, cue: 'open.clue.found',
          what: 'The cook fire is buried under a heap of grey ash, and the stove that stood beside it is gone, pipe and all',
          thought: "Somebody buried the cook fire in ash while it was still alight, and they've taken {camp.leader}'s stove as well. They didn't only come for the people. They came for the fire.",
          tells: 'The Ash Men. They took the camp\'s fire',
          effects: [mark('fire-taken', 'The Ash Men took the fire of {camp.name} as well as its people.')]},
        {id: 'truck-tracks', when: ash(fresh), cue: 'open.clue.found',
          what: 'Two wide tyre tracks leave the camp to the north-east, deep and heavy',
          thought: 'These tracks are wide, and there are only two of them. Those were trucks, and heavy ones. Buggies would have left narrow tracks, and a lot more of them.',
          tells: 'Trucks. Not the Road Rats\' buggies',
          effects: [mark('truck-tracks')]},
        {id: 'footprints', when: ash(fresh), cue: 'open.clue.found',
          what: 'Footprints in a line between the truck tracks, grey with ash in every one',
          thought: "These footprints are all in a line, as if the people were tied together, and every one of them is grey with ash. They were made to walk, so they were taken away alive.",
          tells: 'The growers are captives, on foot',
          effects: [mark('footprints')]},
      ],
      // A question asked the same way in both turns has one id in each turn's row; only one of the two is ever offered.
      questions: [
        radio('ash-men', 'cinder', 'Cinder, would the Ash Men burn a camp?',
          "The Ash Men put fires out, and they're proud of it. Burning a whole camp to the ground isn't like them at all. I'd look for somebody who enjoys a blaze.", 'Probably not the Ash Men', RATS),
        radio('captives', 'auntie-solder', 'Auntie, who takes people?',
          "The Road Rats do. They put people to work sorting scrap, and they sell them back to anyone who'll pay. They've a place somewhere in the wreck fields, and I've never wanted to know exactly where.", 'Who, why, and roughly where', RATS),
        radio('buggies', 'moss', 'Moss, what leaves narrow tracks?',
          "Buggies leave narrow tracks. Bess doesn't, and neither do the Ash Men's trucks. If you're following buggies, don't expect to catch them on soft ground.", 'The tracks, confirmed', RATS),
        radio('walkers', 'rell', 'Rell, have your people seen anything?',
          'Six buggies crossed below our camp before first light, heading for the wreck fields, and they were pulling a cart. I thought it was odd, because Rats never carry water.', 'The number, and the cart',
          rats(WALKERS_FRIENDLY)),
        radio('ash', 'cinder', "Cinder, there's ash heaped on the cook fire here.",
          "Put your hand under the ash for me. Is it still warm underneath? If it's stone cold, then somebody tipped that ash onto a fire that was already dead. The Ash Men smother a fire while it's burning. They don't dress up a dead one.", 'The ash was planted', BLAMED),
        // The Road Rats' question to Cinder, with her answer for the Ash Men's turn.
        {id: 'ash-men', to: 'cinder', words: 'Cinder, would the Ash Men burn a camp?', when: ASH,
          lines: [say('cinder', "The Ash Men put fires out, and they're proud of it, so they'd never set a camp alight on purpose. Look at how the fire began before you decide who it was.", onRadio)],
          shows: 'Not on purpose. Look at the brazier'},
        {id: 'stove', to: 'cinder', words: 'Cinder, why would anybody take a stove?', when: ash({found: 'cook-fire'}),
          lines: [say('cinder', "Because there was fire in it. The Ash Men carry a camp's fire home in a pot and tip it into Old Smoke's furnace, so that nobody else can have it. A camp without its fire is only a place.", onRadio)],
          shows: 'They take a camp\'s fire, and it goes into the furnace'},
        {id: 'captives', to: 'auntie-solder', words: 'Auntie, who takes people?', when: ASH,
          lines: [say('auntie-solder', "The Road Rats take people to sort their scrap, and they sell them back to anyone who'll pay. The Ash Men take people as well, to carry coal for Old Smoke's furnace, and they've never sold anybody back for scrap.", onRadio)],
          shows: 'Two who take people, and the Ash Men do not want scrap'},
        {id: 'trucks', to: 'moss', words: 'Moss, what leaves wide tracks like these?', when: ash({found: 'truck-tracks'}),
          lines: [say('moss', "Trucks leave tracks like that, and apart from Bess the only trucks out there are the Ash Men's. They're slow and heavy, so you'll catch them up if you follow them. Then you'll wish you hadn't.", onRadio)],
          shows: 'The Ash Men\'s trucks, and they can be caught'},
        {id: 'walkers', to: 'rell', words: 'Rell, have your people seen anything?', when: ash(WALKERS_FRIENDLY),
          lines: [say('rell', 'Two grey trucks went past below our camp before first light, heading for the burn. There were people walking behind them on a rope, and one of the trucks had a red glow in the back.', onRadio)],
          shows: 'The way they went, the captives, and the fire in a pot'},
      ],
      thoughts: [
        {thought: 'The tracks are still fresh, so I could follow them now, before the wind covers them.', when: rats(decide, fresh)},
        {thought: "There were six buggies here. If I find them, I'll be finding all six of them at once.", when: rats(decide)},
        {thought: 'The truck tracks are still fresh, so I could follow them now, before the wind covers them.', when: ash(fresh)},
        {thought: "These tracks will take me straight to the Ash Men's own camp, and they never let a truck go anywhere without riders round it.", when: ASH},
      ],
      choices: [
        {id: 'follow', by: 'go', words: 'Follow the tracks south-east.', plain: 'The bean pods lead that way.',
          thought: 'I only need to look. Nobody said I have to fight.', when: rats(leftCar, fresh, reach('tracks-away', 22)),
          effects: [mark('followed-tracks')], next: 'scout'},
        {id: 'home', by: 'go', words: 'Drive home and tell Auntie Solder.', plain: 'The road home is on the map.',
          thought: 'Tin Town ought to hear about this before I do anything.', when: {all: [leftCar, reach('road-home', 40)]},
          effects: [mark('went-home')], next: 'home'},
        {id: 'drive-on', by: 'go', words: 'Drive on.', thought: "It isn't my camp, and I have a town of my own to keep warm.",
          when: {all: [leftCar, {not: {reach: '@camp', within: 150}}]}, effects: [mark('drove-on', 'You saw {camp.name} burned and drove on.')], next: 'left'},
        {id: 'follow-trucks', by: 'go', when: ash(fresh), words: 'Follow the truck tracks north-east',
          plain: 'The tracks are wide and easy to see, and the bean pods lead the same way',
          thought: 'I only need to look. Nobody said I have to fight.',
          hidden: 'The scouting of the Grey Camp begins (Scene 3). It is the day\'s outing',
          effects: [mark('followed-tracks')], next: 'grey-scout'},
        // The false trail: the Road Rats tipped ash on a dead fire, and the player drives to the Grey Camp on the strength of it.
        {id: 'to-grey-camp', by: 'go', when: BLAMED, words: "Drive to the Ash Men's camp",
          plain: 'There is ash heaped on the cook fire',
          thought: "That ash on the fire says the Ash Men did this. Their camp is out on the burn, past the bridge.",
          hidden: 'The day\'s outing, spent on the wrong camp',
          effects: [{type: 'rumour', site: GREY_CAMP}, mark('went-to-grey-camp')], next: 'false-trail'},
      ],
    },

    // Scene 3, the Road Rats. The scouting of the Rats' Nest, by car.
    scout: {
      when: reach('tracks-away', 22),
      mission: {id: `${ID}/scout`, kind: 'reach', by: 'car', minutes: 4, outing: true, holds: ['checkpoints', 'signs'],
        enemy: '@enemy', cars: 2, cue: 'open.lookout.flare',
        rule: {
          seenAfterSeconds: 8, lookouts: 2, riders: 2,
          lookoutSpots: [['rats-nest', 'lookout-1'], ['rats-nest', 'lookout-2']],
          riderStarts: [['rats-nest', 'road-foot'], ['rats-nest', 'road-top']],
          via: 'girder-bridge', viaWithin: 40, destination: ['rats-nest', 'car-hollow'], within: 8,
          viaLine: 'The bean pods end here, but the tyre tracks go on into the wreck fields.',
          seenLine: 'A lookout has sent up a flare. Two buggies are coming.',
        },
        outcomes: {
          seen: {effects: [mark('seen', 'The Road Rats know somebody was looking.')], next: 'rim'},
          unseen: {next: 'rim'},
        },
      },
    },
    // Scene 3, the Road Rats. The rim, on foot.
    rim: {
      when: {any: [rim('car-hollow', 15), onRim]},
      explore: [
        {id: 'north-end', when: rim('rim-north'), cue: 'open.scout.seen',
          what: 'A ring of wrecked cars with a chained gate, and nine people sitting inside it. One of them is small, and looks up.',
          thought: "There are nine of them in that pen, and that's all of the growers. The small one is Finch, and I think he saw me.",
          effects: nestFound},
        {id: 'middle', when: rim('rim-middle'), cue: 'open.scout.seen',
          what: "The Glasshouse's water cart, with glass frames stacked on it.",
          thought: "That's Marigold's cart and Marigold's glass. So it was these people who burned the camp, and now I know it for certain.",
          effects: nestFound},
        {id: 'south-end', when: rim('rim-south'), cue: 'open.scout.seen',
          what: 'Six buggies in a row, about fourteen Rats, and a drain as tall as a man under the east wall of the cutting.',
          thought: "I can count six cars and about fourteen of them. There's also a drain under that wall, and nobody is watching it.",
          effects: [...nestFound, mark('counted-six', 'You counted six cars.'), mark('knows-drain', 'You know the drain.')]},
      ],
      thoughts: [
        {thought: 'I know where they are and how many of them there are. Back at Tin Town, nobody else knows any of it.', when: {found: 'south-end'}},
        {thought: "There are six cars down there, and there's only one of me.", when: {found: 'south-end'}},
      ],
      choices: [
        {id: 'rim-alone', by: 'say', words: 'Drive in now, alone.', plain: 'Six cars.',
          when: {all: [onRim, surveyed]}, thought: "If I'm quick, they won't all get to their cars in time.", next: 'alone'},
        {id: 'rim-drain', by: 'say', words: 'Go in by the drain, on foot.', plain: 'A dark drain, and one guard with a lamp.',
          when: {all: [onRim, {found: 'south-end'}]}, thought: 'Finch is small enough to get through that drain, and so am I.', next: 'drain'},
        {id: 'rim-home', by: 'say', words: 'Slip away home with what you have seen.', plain: 'The road home.',
          when: {all: [onRim, surveyed]}, next: 'home'},
      ],
    },
    alone: {notes: 'OPEN-BURNED-PEN builds the fight alone in Scene 4.'},
    drain: {notes: 'OPEN-BURNED-PEN builds the drain in Scene 4.'},

    // Scene 3b, the false trail: the drive to the Grey Camp, where there is nobody from the camp.
    'false-trail': {
      mission: {id: `${ID}/false-trail`, kind: 'reach', by: 'car', minutes: 4, outing: true, holds: ['checkpoints', 'signs'],
        enemy: '@blamed', cars: 2,
        // The lookouts of the Grey Camp, as on the Ash Men's own scouting: a car in a lookout's view for eight seconds is seen.
        rule: {seenAfterSeconds: 8, lookouts: 2},
        outcomes: {
          seen: {effects: [{type: 'feud', of: '@blamed', by: 1}, mark('grey-seen', 'The Ash Men know that somebody from Tin Town was looking at their camp.')],
            next: 'false-rim'},
          unseen: {next: 'false-rim'},
        },
      },
    },

    'false-rim': {
      when: {all: [BLAMED, {reach: GREY_CAMP}]},
      effects: [{type: 'find', site: GREY_CAMP}],
      explore: [
        {id: 'empty-pen', cue: 'open.scout.seen',
          what: 'The pen, a ring of ash banks, with nobody inside it',
          thought: "The pen is empty, and there's no water cart anywhere. Whoever burned {camp.name}, it wasn't these people.",
          tells: 'The Ash Men did not do it',
          effects: [mark('no-pen', 'You went to the Grey Camp to look for {camp.name}, and nobody from {camp.name} was there.')]},
      ],
      lines: [
        // Said on the car's radio on the way home, if the lookouts saw the car.
        say('clinker', "Good evening, Tin Town. Somebody in your car was looking at my camp this afternoon. If you've lost something, you might have asked at the gate. We will remember that you didn't.",
          {radio: true, when: GREY_SEEN}),
      ],
      thoughts: [
        "The narrow tracks at {camp.name} went the other way, to the south-east. By tomorrow they'll be a day older, and so will the bean pods.",
      ],
      next: 'clues',
      notes: {
        // Clinker's line is said on the drive home, not at the rim. The Rats' Nest is tomorrow's outing (section 21).
        lineMoments: {clinker: 'drivingHome'},
      },
    },

    // Scene 3, the Ash Men. The scouting of the Grey Camp, by car.
    'grey-scout': {
      mission: {id: `${ID}/grey-scout`, kind: 'reach', by: 'car', minutes: 4, outing: true, holds: ['checkpoints', 'signs'],
        enemy: '@enemy', cars: 2,
        // Two lookouts on the slag heaps at the edge of the burn. A car in a lookout's view for eight seconds is seen, as
        // with Old Smoke's furnace. The Ash Men never light a flare: a lookout rings a bell.
        rule: {seenAfterSeconds: 8, lookouts: 2, riders: 2},
        thoughts: [
          {thought: 'Nothing grows out here at all. The ground is black, and it crunches under the tyres.', when: ASH},
        ],
        outcomes: {
          seen: {
            lines: [say('ash-man', 'There is a car on the heap road! Ring it, ring the bell!', {shouted: true, as: 'A lookout'})],
            effects: [ashFeud(1), mark('grey-seen')],
            next: 'grey-rim'},
          unseen: {next: 'grey-rim'},
        },
      },
      notes: {
        missionCue: 'open.ash.bell',
        // Seen: two riders come out to fight. Won or outrun, the scouting goes on, and the Grey Camp has twice the watch
        // from tonight.
        seen: {riders: 2, watchFromTonight: 2},
      },
    },

    // Scene 3, the Ash Men. The rim, on foot.
    'grey-rim': {
      when: ash({reach: GREY_CAMP}),
      effects: [{type: 'find', site: GREY_CAMP}, mark('found-grey-camp', 'You found the Grey Camp.')],
      explore: [
        {id: 'north-end', when: {not: NAT_HANDED_BACK}, cue: 'open.scout.seen',
          what: 'The pen: a ring of ash banks as high as a man\'s chest, with nine people inside it carrying sacks of coal in a line from a heap to the furnace. One of them is small, and looks up',
          thought: "There are nine of them in that pen, and that's all of {camp.name}. They're carrying coal already. The small one is Finch, and I think he saw me.",
          tells: 'Where the growers are, and that they are made to work',
          effects: [mark('saw-the-pen', 'You saw the people of {camp.name} carrying coal in the Grey Camp.')]},
        {id: 'north-end-nat-quiet', when: {all: [NAT_HANDED_BACK, NAT_ASKED]}, cue: 'open.scout.seen',
          what: 'The pen, as above. Beside the coal heap a grey boy with a shovel looks straight up at the rim, and then down again',
          thought: "There are nine of them in that pen, carrying coal. That's Nat on the coal heap. He's seen me, and he's looked away again as if he hadn't.",
          tells: 'The growers, and a boy who will not give the player away',
          effects: [mark('saw-the-pen'), mark('nat-kept-quiet', 'Nat saw you on the rim of the Grey Camp, and said nothing.')]},
        {id: 'north-end-nat', when: {all: [NAT_HANDED_BACK, {not: NAT_ASKED}]}, cue: 'open.scout.seen',
          what: 'The pen, as above. Beside the coal heap a grey boy with a shovel looks straight up at the rim, and points',
          thought: 'There are nine of them in that pen, carrying coal. And the boy on the coal heap is the boy I handed back to Clinker.',
          tells: 'The growers. The boy calls out',
          effects: [mark('saw-the-pen'), ashFeud(1),
            mark('grey-seen')]},
        {id: 'middle', cue: 'open.scout.seen',
          what: "The furnace yard: the furnace on wheels with its doors shut and a red glow underneath them. {camp.leader}'s stove stands beside it, and an old man sits on its step with his eyes shut",
          thought: "That's {camp.leader}'s stove beside the furnace. So it was these people, and now I know it for certain. The old man on the step must be Old Smoke himself.",
          tells: 'Who did it, for certain. Old Smoke is at home',
          effects: [mark('saw-the-stove')]},
        {id: 'back', when: {not: BACK_WAY}, cue: 'open.scout.seen',
          what: 'The gate with two men on it, two grey trucks, about a dozen Ash Men round the furnace, and a long slope of ash at the back of the camp where nobody stands',
          thought: "There are two men on the gate and about a dozen more by the furnace. At the back there's a great slope of ash, and nobody is watching it.",
          tells: 'How many, and the ash tip',
          effects: [mark('knows-ash-tip', 'You know the slope of ash at the back of the Grey Camp, where nobody keeps watch.')]},
        {id: 'back-drawn', when: BACK_WAY, cue: 'open.scout.seen',
          what: 'The gate with two men on it, two grey trucks, about a dozen Ash Men round the furnace, and the ash tip at the back, as Nat drew it',
          thought: "That's the ash tip that Nat drew for me in the hearth. He was right, because nobody is standing anywhere near it. There are two men on the gate and about a dozen by the furnace.",
          tells: 'How many, and the way in that Nat knew',
          effects: [mark('knows-ash-tip')]},
      ],
      lines: [
        // The boy who was handed back without being asked his name calls out when the player looks from the north end.
        say('slack', "There's somebody up on the rim! It's the driver from Tin Town!", {shouted: true, as: 'The boy', when: {found: 'north-end-nat'}}),
      ],
      thoughts: [
        {thought: 'I know where they are and how many of them there are. Back at Tin Town, nobody else knows any of it.', when: ASH},
        {thought: 'There are two trucks and a dozen of them down there, and there is only one of me.', when: ASH},
      ],
      choices: [
        {id: 'grey-drive-in', by: 'go', when: ASH, words: 'Drive in now, alone', plain: 'Two trucks, and a gate with two men on it',
          thought: "If I'm quick, they won't all get to their trucks in time.",
          hidden: 'A fight you are unlikely to win (Scene 4)', next: 'grey-alone'},
        {id: 'grey-ash-tip', by: 'go', when: ash({any: [{found: 'back'}, {found: 'back-drawn'}]}), words: 'Go in down the slope of ash, on foot',
          plain: 'A slope of soft ash, and the furnace doors that open now and then',
          thought: "Nobody watches that slope, because nobody wants to stand in ash up to the knees. That's exactly why I should use it.",
          hidden: 'A creep past the furnace light. A few may be freed. Being caught is being taken', next: 'grey-creep'},
        {id: 'grey-slip-home', by: 'go', when: ASH, words: 'Slip away home with what you have seen', plain: 'The road home',
          hidden: 'The talk at the hearth (Scene 5), with the count and the ash tip known', next: 'home'},
      ],
      notes: {
        // The boy's shout is said the moment the north end is looked from, and it counts as the lookouts seeing the car.
        lineMoments: {slack: 'onFinding:north-end-nat'},
      },
    },

    // Scene 4, the Ash Men. Driving in alone.
    'grey-alone': {
      mission: {id: `${ID}/grey-alone`, kind: 'fight', by: 'car', minutes: 2, holds: ['checkpoints', 'signs'],
        enemy: '@enemy', cars: 4,
        // Two riders at once and two more within twenty seconds. Men on the ash banks throw ash, and ash on the
        // windscreen blinds it for a moment. They box the car in as the riders do today. On Easy about two in ten.
        rule: {firstCars: 2, moreAfterSeconds: 20, boxedInSeconds: 6, ashBlindSeconds: 2},
        outcomes: {
          won: {
            lines: [
              say('clinker', "Stop. That's enough, all of you. Nobody here is going to be hurt over nine bean growers.", {shouted: true}),
              say('clinker', "Take them, then. Their fire is in the furnace now, though, and nothing that goes into the furnace ever comes out again. You've put my count out by nine, and I shall have to write that down. We will remember who did it."),
            ],
            effects: [ashFeud(1), mark('took-them-alone', 'You took the people of {camp.name} out of the Grey Camp by yourself.')],
            next: 'gate'},
          taken: {
            lines: [
              say('clinker', "You drove into a camp that puts lamps out, with your lamps lit. I can't decide whether that was brave or only careless."),
              say('clinker', "There's no need to look so worried. Nobody is ever hurt at the Grey Camp. We are only ever cold. You'll sit in the pen with your friends while I find out what Tin Town thinks you're worth."),
            ],
            effects: [mark('taken-to-grey-camp', 'The Ash Men took you to the Grey Camp.')],
            next: [{when: IN_ACT, to: 'grey-sent-home'}, {to: 'grey-pen'}]},
        },
      },
      notes: {
        // Won: the pen's chain is opened with the wrench, the growers walk out, and the player brings them home at a
        // walking pace (the road home of Scene 6) before Scene 7. Taken: the car is wrecked or boxed in for six seconds.
        outcomeCues: {taken: 'open.taken', won: 'open.pen.chain'},
        // The mission kind `fight` is not built yet; OPEN-BURNED-PEN builds it for the Road Rats' fight alone.
        missionKindBy: 'OPEN-BURNED-PEN',
      },
    },

    // Scene 4, the Ash Men. Going in down the ash tip, on foot.
    'grey-creep': {
      mission: {id: `${ID}/grey-creep`, kind: 'creep', by: 'foot', minutes: 3, holds: ['checkpoints', 'signs'],
        // The furnace doors open each time the coal line reaches them, and the light crosses the yard. Two seconds in it
        // and the player is taken. The pen's way out is a gap closed with an old bedframe, chained to a post: the wrench
        // is held on the chain for eight seconds. Finch and two growers come out with the player; the others are too slow.
        rule: {lightTakesAfterSeconds: 2, doorsShutSeconds: 12, wrenchSeconds: 8, freed: 3},
        lines: [
          say('marigold', "Take the boy and go. I'm too old to climb a heap of ash, and somebody has to stay and keep this lot cheerful.", {low: true, when: ASH}),
        ],
        outcomes: {
          out: {
            lines: [say('finch', "Gran said I had to go if I got the chance. She also said that the grey men aren't cruel, only cold. I think that's worse.")],
            effects: [mark('creep-out', 'You brought Finch and two growers out of the Grey Camp by the slope of ash at the back.'), {type: 'word', person: CAMP_PEOPLE, by: 1}],
            next: 'home'},
          taken: {
            effects: [mark('taken-to-grey-camp')],
            next: [{when: IN_ACT, to: 'grey-sent-home'}, {to: 'grey-pen'}]},
        },
      },
      notes: {outcomeCues: {out: 'open.pen.chain', taken: 'open.taken'}, missionCue: 'open.furnace.door',
        // The mission kind `creep` is not built yet; OPEN-BURNED-PEN builds it for the Road Rats' drain.
        missionKindBy: 'OPEN-BURNED-PEN'},
    },

    // During the act the player cannot sit in the pen through the fifth night. Clinker sends the player home on foot,
    // and keeps the car. Old Smoke speaks of the price at the parley; with no parley, it is paid at dawn after the act.
    'grey-sent-home': {
      when: ash(IN_ACT),
      lines: [
        say('clinker', "Old Smoke wants you at your own gate tonight, so you can walk home before dark. Your car stays here, and so do your friends."),
        say('clinker', "Don't think that you've been let off. You've been sent home, which isn't the same thing at all."),
      ],
      thoughts: ["It's a long walk, and I'll have no car tonight. Whatever comes up the East Road, I'll have to meet it on foot."],
      effects: [mark('car-held', 'The Ash Men kept your car at the Grey Camp on the night of the Long Cold.')],
      next: 'home',
    },

    // Scene 4, the Ash Men. The pen.
    'grey-pen': {
      when: ash({not: IN_ACT}),
      cue: 'open.taken',
      lines: [
        say('marigold', "Oh, it's you. First you mended our pump, and now you've come to carry coal with us. Nobody could say you do things by halves."),
        say('finch', 'I dropped beans all the way here so that somebody could follow us. Did you see them? I ran out of beans at the bridge.'),
        say('marigold', "They want us to carry coal for that furnace all day and half the night. I told the grey man that all I know is how to grow beans. He said beans need warmth as much as anybody, so I might as well learn where it comes from."),
        say('clinker', "Good evening, Tin Town. This is Clinker, Old Smoke's stoker. I have your driver here, and your driver's car as well.", onRadio),
        say('clinker', 'Old Smoke has no use for your scrap. He wants two embers out of your store, carried here in a pot. When he has them, you can have your driver back.', {radio: true, when: {not: CAUGHT}}),
        say('auntie-solder', "You'll have your answer in the morning. If that child comes home cold, you'll have me to answer to, and I can be a great deal colder than you are.", onRadio),
      ],
      questions: [
        {id: 'grey-watch', to: 'finch', words: 'How do they keep watch at night?',
          lines: [say('finch', "They open the furnace doors every time the coal line reaches them, and the whole yard goes bright. Then they shut them again, and it's dark for about as long as it takes to say the alphabet twice. I've counted.")],
          shows: 'The light, and its gap'},
        {id: 'grey-car', to: 'marigold', words: 'Where have they put my car?',
          lines: [say('marigold', "It's by the gate with their trucks, and they've let the air out of all four tyres. You won't be driving it out of here tonight.")],
          shows: 'The car cannot be taken back tonight'},
        {id: 'grey-want', to: 'marigold', words: 'What does Old Smoke want with you?',
          lines: [say('marigold', "He wants hands for his furnace, and now he has nine more pairs of them. He doesn't sell people, the stoker says. He only keeps them warm, and he decides how warm.")],
          shows: 'They are not for sale. The fire is the price'},
      ],
      thoughts: [
        "Auntie will pay to get me back. It will cost her two of our embers, and that's two nights of fire for the whole town.",
        "Finch says the yard is dark for as long as it takes to say the alphabet twice.",
      ],
      choices: [
        {id: 'grey-wait', by: 'say', words: 'Wait for morning', plain: 'The price was said aloud: two embers, carried in a pot',
          thought: 'Two embers is two nights. I wonder what Auntie will have to go without.',
          hidden: 'The ransom is paid. The growers stay in the pen', next: 'grey-ransom'},
        {id: 'grey-break-out', by: 'do', when: {not: CAUGHT}, words: 'Break out tonight, with Finch',
          plain: 'The furnace doors, and the dark between them',
          thought: "If we're caught, the price won't stay at two.",
          hidden: 'A creep on foot. Luck plays no part. Caught, and the price rises to three embers', next: 'grey-break-out'},
        {id: 'grey-offer', by: 'say', words: "Clinker, I'd like to make you an offer myself.",
          plain: 'Clinker likes to watch a light go out',
          thought: "Old Smoke wants fires to go out. Maybe I can give him one that doesn't cost us an ember.",
          hidden: 'A promise in place of the price (below)', next: 'grey-offer'},
      ],
      notes: {
        // After a caught break-out Clinker says the dearer price in place of the line above it.
        caughtPriceLine: 'The price has gone up to three embers, and there are two men on the furnace doors tonight.',
      },
    },

    // Scene 4, the Ash Men. 1. Waiting for morning.
    'grey-ransom': {
      when: ash({chose: 'grey-wait'}),
      cue: 'story.pot.lump-grey',
      lines: [
        say('moss', "I've brought them in the pot, and you can look if you like. Auntie says she carried that pot to the door three times before she let go of it."),
        say('clinker', "Thank you, Tin Town. Watch, now, because this is the part that I like best.", {when: {not: CAUGHT}}),
        say('clinker', "There, they've both gone grey. You see? Everything goes grey in the end, and your driver is off my count.", {when: {not: CAUGHT}}),
        say('clinker', "There, they've all three gone grey. A break-out costs more than a night's sleep, and now your town knows it.", {when: CAUGHT}),
        say('marigold', "Off you go, then. Don't look back at us like that. You came all this way, and that's more than anybody else has done."),
      ],
      effects: [
        ...pay(2).map(effect => ({...effect, when: {all: [{not: CAUGHT}, effect.when]}})),
        ...pay(3).map(effect => ({...effect, when: {all: [CAUGHT, effect.when]}})),
        mark('ransomed-in-fire', 'Tin Town paid the Ash Men in fire to get you back.'),
      ],
      next: 'home',
      notes: {
        // Clinker tips the embers into a bucket of ash in front of Moss and watches them go grey. The car is given back
        // with its tyres pumped up and no armour mended. The growers stay. A store left with one ember or none sends the
        // evening at the hearth to section 23, as the Road Rats' ransom does.
        car: 'returned, with its tyres pumped up',
      },
    },

    // Scene 4, the Ash Men. 2. Breaking out.
    'grey-break-out': {
      when: ash({chose: 'grey-break-out'}),
      mission: {id: `${ID}/grey-break-out`, kind: 'creep', by: 'foot', minutes: 3, holds: ['checkpoints', 'signs'],
        // The player and Finch cross the yard while the doors are shut, and climb the ash tip. Each grower whose place
        // in the coal line they pass can be waved along: three at most, the quickest.
        rule: {lightTakesAfterSeconds: 2, doorsShutSeconds: 12, freedAtMost: 3},
        outcomes: {
          out: {
            lines: [say('finch', 'Gran told me to go if I got the chance. She also said to tell you that she isn\'t cross with you. She said it twice, so I think she\'s a bit cross.')],
            effects: [mark('broke-out', 'You got Finch out of the Grey Camp by the slope of ash at the back.')],
            next: 'home'},
          caught: {
            lines: [say('clinker', "Now that was rude of you, and I'd been so polite about everything. The price has gone up to three embers, and there are two men on the furnace doors tonight.")],
            effects: [mark('grey-caught', 'The Ash Men caught you breaking out of the Grey Camp, and the price went up.')],
            next: 'grey-pen'},
        },
      },
      notes: {
        // Out: they come over the top of the tip onto the burn and walk to the bridge road. If a people owe the player a
        // favour their car is waiting there; otherwise it is a long walk and the day is gone. The car stays with Clinker.
        outcomeCues: {caught: 'open.taken'},
        // The mission kind `creep` is not built yet; OPEN-BURNED-PEN builds it for the Road Rats' break-out.
        missionKindBy: 'OPEN-BURNED-PEN',
      },
    },

    // Scene 4, the Ash Men. 3. The offer: a promise in place of the price.
    'grey-offer': {
      when: ash({chose: 'grey-offer'}),
      lines: [
        say('clinker', "Old Smoke doesn't bargain. He names a price, and people pay it. But he does like to watch a light go out, and I like to watch him enjoy it."),
        say('clinker', "Here's what he would like better than two embers. On one night that he chooses, Tin Town lights no lamps at all, not one, from dusk until dawn. Give me your word on that, and you and your car can go home tonight."),
      ],
      thoughts: ['A town with no lamps lit is a town that anybody can walk into. I wonder which night he would choose.'],
      choices: [
        {id: 'grey-promise', by: 'say', words: 'You have my word. Tin Town will light no lamps on the night he chooses.',
          hidden: 'The player drives home tonight with the car. The promise falls due on a night Old Smoke chooses',
          effects: [{type: 'promise', id: `${ID}/lamps-promised`, person: 'old-smoke', dueNights: 3,
            text: 'You promised the Ash Men that Tin Town would light no lamps on one night of Old Smoke\'s choosing.'}],
          lines: [say('clinker', "Thank you. We will remember that you said it, and we will remember the night that you keep it.")],
          next: 'home'},
        {id: 'grey-no-promise', by: 'say', words: "No. Tin Town doesn't put its lamps out for anybody.",
          lines: [say('clinker', 'Then Tin Town can pay in embers in the morning, the same as everybody else does.')],
          next: 'grey-pen'},
      ],
      notes: {
        // The promise falls due on a night drawn by Old Smoke; three nights is a starting value for the builder.
        // Keeping it: Tin Town's lamps stay dark that night, and the night's raiders (if any) find the store as on the
        // fourth night of Five Cold Nights with no lamp lit. Breaking it: the Ash Men's feud rises by one, and Clinker
        // says so (`later`, clinker-lamps-broken).
        promiseDue: 'drawn by Old Smoke; three nights to start',
      },
    },

    // Scene 5. Home, and the choice. The Ash Men's lines and helpers are here; the Road Rats' are still to be built.
    home: {
      lines: [
        say('cinder', "There are nine people carrying coal for Old Smoke tonight, and they never did any of us any harm. I'm only saying it out loud so that somebody has said it.", {when: ASH}),
        say('auntie-solder', "We also have only a few embers left, and Old Smoke wants every one of them. I'm saying that out loud as well.", {when: ASH}),
        say('moss', "Bess could carry twelve people in the tank cradle, if they didn't mind the smell of gas. But those trucks are as heavy as she is. I'm not offering to go. I'm only telling you what Bess can do.", {when: ASH}),
        say('finch', "Gran will be telling the others that somebody is coming for them. She'll be saying it between sacks of coal. I'd like it to be true this time.",
          {when: ash({any: [has('broke-out'), has('creep-out')]})}),
      ],
      questions: [
        {id: 'who-moss', to: 'moss', words: 'Moss, would you bring Bess?', when: ASH,
          lines: [say('moss', "If you ask me to, I'll bring Bess. But if they throw ash in her holes, nobody fetches gas tomorrow, and you'll be the one who explains that to Auntie.")],
          shows: 'Carry all nine home at once. Bess is at risk'},
        {id: 'who-dace', to: 'dace', words: 'Dace, would you come?', when: ash(DACE_HERE),
          lines: [say('dace', "I can get up a heap of ash faster than any of them, because I'm lighter. And I've run away from enough people to know how it's done.")],
          shows: 'Open the pen, alone and quickly. He may be caught'},
        {id: 'who-keeper', to: 'keeper', words: 'Would you watch their road for us?', when: ash(keeper),
          lines: [say('keeper', "I can't leave my tower, but I can watch their road for you. I'll tell you the moment the trucks turn round and come back.", {as: 'The keeper'})],
          shows: 'A warning during the rescue'},
        {id: 'who-nat', to: 'slack', words: 'Nat, would you show them the way in?', when: ash(NAT_AT_TIN_TOWN),
          lines: [say('slack', "I know every door in the Grey Camp, because I've carried a sack through each one. I'll take your people down the ash tip. If I carry a sack on my back, the men on the gate will think I'm one of them.", {as: 'Nat'})],
          shows: 'Lead the party down the ash tip, so the pen is opened twenty seconds sooner'},
        {id: 'who-tally', to: 'tally', words: 'Tally, could you help us?', when: ash(TALLY_HELPED),
          lines: [say('tally', "The Ash Men don't buy tyres, and they don't buy anything else. Their gate has never opened for my truck, and I'm not going to ask it to.")],
          shows: 'Nothing. The trader\'s truck in the gateway is the Road Rats\' turn only'},
      ],
      thoughts: [
        {thought: 'Every person I take to the Grey Camp is a person who won\'t be on our fence tonight.', when: ASH},
      ],
      choices: [
        {id: 'raise-party', by: 'say', words: "We're going to get them out. Who is coming with me?",
          plain: 'The player picks up to three of those who said yes. Each one\'s favour or debt is spent, and the page says so',
          thought: "I'll owe every one of them something if this goes wrong.",
          hidden: 'The rescue (Scene 6). The fence at home is thinner tonight', next: 'rescue'},
        {id: 'buy-back-embers', by: 'say', when: ASH, words: "We'll buy them back. Old Smoke wants fire, so we'll pay him in fire.",
          plain: 'Auntie Solder says the price she expects: three embers, one for every three growers',
          thought: "That's three nights of fire for nine people. I wonder what Old Smoke will think we'll pay next time.",
          hidden: 'Clinker\'s price goes up for Tin Town from now on',
          lines: [say('auntie-solder', "Old Smoke doesn't sell people for scrap. If we buy them back, it will be with fire, and I'd expect three embers at the least.")],
          next: 'bought'},
        {id: 'cannot', by: 'say', words: "We can't do it. Not with the embers we have and the fence as it is.",
          plain: 'Nothing changes at Tin Town',
          thought: '{camp.leader} will go on telling them that somebody is coming, and I wonder how long she will keep saying it.',
          effects: [{type: 'word', person: CAMP_PEOPLE, by: -1, when: ASH},
            {...mark('left-at-grey-camp', 'You left the people of {camp.name} at the Grey Camp.'), when: ASH}],
          next: 'left'},
      ],
      notes: {
        builds: 'OPEN-BURNED-RESCUE builds the Road Rats\' Scene 5 on this beat.',
        // Auntie Solder's first line and Rell's offer are as section 21 has them. Tally's row of section 21 (her truck in
        // Sump's gateway) is the Road Rats' turn only; in the Ash Men's turn she says why not.
        bothTurns: ['raise-party'],
        // `cannot` is the Road Rats' choice with its words made general. It is one choice for both turns, and
        // OPEN-BURNED-RESCUE adds the Road Rats' effects beside the Ash Men's, each under its `when`.
      },
    },

    // Scene 5, the Ash Men. 2. Bought back, at first light.
    bought: {
      when: ash({chose: 'buy-back-embers'}),
      cue: 'story.pot.lump-grey',
      lines: [
        say('clinker', "Three embers for nine growers. Watch them, please. I always like somebody to watch."),
        say('clinker', "There, they've all gone grey. Nine growers are off my count, and the stove can go back with them, because it never drew properly."),
        say('marigold', "You paid for us with fire, and you haven't much of it. I ought to tell you that you were foolish. I find that I can't."),
      ],
      effects: [...pay(3), {type: 'word', person: CAMP_PEOPLE, set: 'Sworn'},
        mark('bought-back-in-fire', 'Tin Town bought the people of {camp.name} back from the Ash Men with three embers.')],
      next: 'gate',
      notes: {
        // Moss drives the pot out at first light and the player rides beside Bess. The Ash Men's feud stays where it is.
        price: {embers: 3},
      },
    },

    // Scene 6. The rescue. The same three jobs in both turns; what differs is the den, the light and who speaks.
    rescue: {
      when: {chose: 'raise-party'},
      mission: {id: `${ID}/rescue`, kind: 'rescue', by: 'car', minutes: 6, outing: true, holds: ['checkpoints', 'signs'],
        enemy: '@enemy', cars: 4,
        // Draw the riders out by car; open the pen down the ash tip if it is known, or at the gate if not; carry the
        // growers home. Nat, if he leads the party, takes them down the tip, and the pen is opened twenty seconds sooner.
        rule: {chaseRiders: 4, ridersIfSeen: 6, gateGuards: 2, gateGuardsIfSeen: 4, natSoonerSeconds: 20},
        lines: [
          say('rell', "They're all out, every one of the nine. The old woman wanted to go back for her stove, and I told her no.", {radio: true, when: ASH}),
          say('slack', "Down the tip and round the coal heap, the same as always. Nobody even looked at me.", {radio: true, as: 'Nat', when: ash(NAT_AT_TIN_TOWN)}),
        ],
        outcomes: {
          'all-home': {
            effects: [ashFeud(1), {type: 'word', person: CAMP_PEOPLE, set: 'Sworn'},
              mark('rode-out', 'You rode out with friends and brought the people of {camp.name} home from the Grey Camp.')],
            next: 'gate'},
          'some-home': {
            effects: [mark('some-home', 'Some of the people of {camp.name} came home from the Grey Camp, and the rest are still there.')],
            next: 'gate'},
          'none-home': {
            lines: [say('rell', "I brought six people to the bottom of a heap of ash, and we waited there for a whistle that never came. I'm not angry with you. I'm just not going to do that again in a hurry.")],
            effects: [mark('rescue-failed', 'The rescue at the Grey Camp failed, and nobody came home.')],
            next: 'home'},
        },
      },
      notes: {
        // The whistle is Rell's (`night.whistle`), as in section 21. The tower's keeper calls the moment a truck turns
        // for home. Bess holed: "if they throw ash in her holes". The rest of Scene 6 is as section 21.
        outcomeCues: {'all-home': 'night.whistle'},
        // The mission kind `rescue` is not built yet. OPEN-BURNED-RESCUE builds it, and the Road Rats' rule and outcomes
        // beside the Ash Men's.
        missionKindBy: 'OPEN-BURNED-RESCUE',
      },
    },

    // Scene 7. What becomes of the camp. The Ash Men took its fire, so in their turn going home needs one of Tin Town's
    // embers.
    gate: {
      lines: [
        say('marigold', "We've nothing to go back to but a pump and the place where our stove stood. The grey men took our fire, and a camp without a fire isn't a camp. It's only a place where people used to be.", {when: ASH}),
      ],
      choices: [
        {id: 'stay-inside', by: 'say', words: "Stay here with us. There's room inside the fence.",
          plain: 'Nine more people at the hearth',
          hidden: 'As section 21: the hearth burns an extra ember every second night in an act with a clock, and a bean bed is dug by the south fence. The site stays burned',
          lines: [say('marigold', "Inside a fence? I haven't lived inside a fence since I was a girl. Finch, go and find out which side gets the morning sun.")],
          effects: [{type: 'shareHearth'}, mark('stayed-inside', 'The people of {camp.name} came to live inside the fence at Tin Town.')],
          next: [{when: {chose: 'buy-back-embers'}, to: 'bought-back'}, {to: 'freed'}]},
        {id: 'relight', by: 'say', when: ASH, words: "Go home, and take one of our embers to light your fire again.",
          plain: 'One ember out of the store, in a pot',
          thought: "That's one night of fire gone out of our store. It's also one fire burning out there that Old Smoke doesn't own.",
          hidden: 'A pot run to the camp. The site becomes the Glasshouse again, rebuilt. Its people are Sworn. Its fire is one of the lights that can be seen from the gate tower on the fifth night',
          lines: [say('marigold', "You'd give us fire out of your own store? Then the first basket of every crop is yours, and I won't hear any argument about it.")],
          effects: [embers(-1), {type: 'site', id: '@camp', stage: 'rebuilt'}, {type: 'word', person: CAMP_PEOPLE, set: 'Sworn'},
            mark('relit', 'You gave {camp.name} an ember to light its fire again.')],
          next: [{when: {chose: 'buy-back-embers'}, to: 'bought-back'}, {to: 'freed'}]},
        {id: 'seep-relight', by: 'say', when: ash({fact: 'made', id: 'somebody-elses-flag/hand-pump'}),
          words: "There's water at the Sweet Seep now. Take one of our embers and build there.",
          plain: 'The Sweet Seep is on the map. One ember out of the store',
          hidden: 'The growers settle at the well, with Tin Town\'s fire. It is the beginning of an outpost (section 20)',
          lines: [say('marigold', "Beans beside a well that never runs dry, and a fire that somebody gave us instead of taking it. I've dreamed of the first for thirty years, and I never once dreamed of the second.")],
          effects: [embers(-1), {type: 'word', person: CAMP_PEOPLE, set: 'Sworn'},
            mark('moved-to-seep', 'The people of {camp.name} built again at the Sweet Seep, with an ember from Tin Town.')],
          next: [{when: {chose: 'buy-back-embers'}, to: 'bought-back'}, {to: 'freed'}]},
      ],
      notes: {
        // Staying is as section 21 has it, one choice for both turns. Rebuilding with the Road Rats is a load of
        // windscreens (OPEN-BURNED-RESCUE); with the Ash Men the glass mostly stands, and what is missing is fire.
        bothTurns: ['stay-inside'],
      },
    },
  },

  ends: ['freed', 'bought-back', 'left', 'taken'],

  ignored: {afterNights: 4, effects: [{type: 'site', id: '@camp', stage: 'burned'}, mark('never-went')], next: 'taken'},

  // Each `later` row is a row of a person's talk table, which asks only facts of the land. Where a row of the Ash Men's
  // turn asks who was cast or a promise falling due, its `when` asks the land's nearest fact and `notes.laterWhen` keeps
  // the storyline's own condition.
  later: [
    {id: 'burned-camp/remembered', by: 'dot', when: {fact: 'mark', id: 'burned-camp/never-went'},
      lines: [{speaker: 'dot', words: 'There used to be a camp out past the Ridge that grew beans.'}]},
    // Tied back, the next time Clinker names a price for anything.
    {id: 'clinker-paid-fire', by: 'clinker', when: {any: [has('ransomed-in-fire'), has('bought-back-in-fire')]},
      lines: [say('clinker', "Tin Town pays in fire. Everybody on the road knows it now, so I've put my prices up. It seemed only fair to the furnace.")]},
    {id: 'clinker-lamps-broken', by: 'clinker', when: {fact: 'promise', id: 'burned-camp/lamps-promised'},
      lines: [say('clinker', 'Old Smoke chose last night, and he watched your town from the bridge until dawn. Every one of your lamps was lit. We will remember that your word goes out faster than a lamp does.')],
      effects: [ashFeud(1)]},
    // Left at the Grey Camp: some nights later, any trader; and once, on a later drive, Finch on a truck.
    {id: 'trader-coal', by: 'traders', when: has('left-at-grey-camp'),
      lines: [say('trader', "I passed the Grey Camp last week, and the bean woman was carrying coal in a line with the rest of them. She was grey to the elbows. She asked me whether anybody from Tin Town had said anything about her, and I didn't know what to tell her.", {as: 'The trader'})]},
    {id: 'never-went-coal', by: 'traders', when: {all: [ASH_RAID, has('never-went')]},
      lines: [say('trader', "There's a gang of bean growers carrying coal for Old Smoke now. I don't know where he found them, but they don't look as if they were asked.", {as: 'The trader'})]},

    // What the parley of the fifth night reads (docs/story/five-cold-nights.md, section 15). Old Smoke says the player's
    // own story back, and each line is spoken only if its choice was made. One line from the Ash Men's turn, the first
    // that is true.
    {id: 'parley-promise-due', by: 'old-smoke', when: {all: [ASH_RAID, IN_ACT, {fact: 'promise', id: 'burned-camp/lamps-promised'}]},
      lines: [say('old-smoke', 'You promised my stoker that your town would light no lamps on a night of my choosing. I choose tonight.')]},
    {id: 'parley-car-held', by: 'old-smoke', when: {all: [IN_ACT, has('car-held')]},
      lines: [say('old-smoke', "My stoker has your car, and he has your friends. I sent you home tonight because I wanted you at this gate. Don't think for a moment that you were let off.")]},
    {id: 'parley-took-alone', by: 'old-smoke', when: {all: [IN_ACT, has('took-them-alone')]},
      lines: [say('old-smoke', "You drove into my camp alone, and you drove out with nine of my coal gang. I've never liked anybody who does that. I may have to start.")]},
    {id: 'parley-creep', by: 'old-smoke', when: {all: [IN_ACT, {any: [has('creep-out'), has('broke-out')]}]},
      lines: [say('old-smoke', "Somebody went out of my camp down the ash tip and took a boy with them. Nobody has ever left by the ash tip before. I'd have said that nobody would want to.")]},
    {id: 'parley-seen', by: 'old-smoke', when: {all: [ASH_RAID, IN_ACT, GREY_SEEN, {not: has('took-them-alone')}, {not: has('car-held')}]},
      lines: [say('old-smoke', "My lookouts saw somebody from Tin Town on the rim of my camp today. Your bean people are warm at my furnace tonight, which is more than you can say for your own.")]},
    {id: 'parley-left', by: 'old-smoke', when: {all: [ASH_RAID, IN_ACT, {any: [has('drove-on'), has('left-at-grey-camp')]}]},
      lines: [say('old-smoke', 'You knew whose fire I had taken, and you left it with me. So you can count as well as I can.')]},
    {id: 'parley-never-went', by: 'old-smoke', when: {all: [ASH_RAID, IN_ACT, {not: has('followed-tracks')}, {not: has('drove-on')}, {not: GREY_SEEN}]},
      lines: [say('old-smoke', "Nine bean growers are carrying coal at my furnace tonight, and nobody has come asking for them. I thought that you would be the first.")]},
    {id: 'parley-false-trail', by: 'old-smoke', when: {all: [has('went-to-grey-camp'), IN_ACT, GREY_SEEN]},
      lines: [say('old-smoke', "Somebody from your town came looking for a pen at my camp, and there was nobody in it. Whoever burned your bean people, it wasn't me. I don't burn things. I put them out.")]},
  ],

  notes: {
    // The Ash Men's turn as OPEN-WRITE-4 wrote it, kept here until a role can ask a condition of one candidate and the
    // main story writes the mark `ash-raid`. Then the enemy is drawn from both groups, weighted by feud, and the Ash Men
    // only after their raid. Their start adds that the storyline has not begun. Their sign asks one night before an act
    // ends, not two, because in Five Cold Nights it can begin only at the banking after the fourth night's raid. The
    // feud names the Ash Men here, because outside `cast` a condition has no candidate to ask it of.
    ashMenTurn: {
      enemy: {from: 'groups', among: ['ash-men'], where: {all: [{fact: 'feud', of: 'ash-men', atLeast: 'Watching'}, {fact: 'mark', id: 'ash-raid'}]}, weightBy: 'feud'},
      starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: ID, at: 'any'}}, {fact: 'draw', name: 'start', chance: .5}]},
      signNightsNeeded: 1,
    },
    // At the parley, a camp that was given an ember to light its fire again (`burned-camp/relit`, or at the Sweet Seep) is one
    // of the lights seen from the gate tower: "the stove at {camp.name}". A camp whose people live inside the fence is
    // not a light, because no fire was given to it. The `parley-` rows are spoken by the parley of five-cold-nights.md
    // section 15, after the lines it already has, and outside the act they are never said.
    // The storyline's own conditions of the `later` rows that a talk table cannot ask, each said beside the row's `when`.
    // The card that lets the Ash Men be cast puts them back in place of ASH_RAID and the promise.
    laterWhen: {
      'clinker-lamps-broken': {due: 'burned-camp/lamps-promised'},
      'never-went-coal': ASH, 'parley-promise-due': ASH, 'parley-seen': ASH, 'parley-left': ASH, 'parley-never-went': ASH,
      'parley-false-trail': BLAMED,
    },
    parleyLight: {mark: 'burned-camp/relit', name: 'the cook fire at {camp.name}'},
    // The order of the parley rows: the first one that is true is said, and only that one.
    parleyOrder: 'first true',
    // Sounds the Ash Men's turn adds. In hand: open.smoke.seen, open.clue.found, open.scout.seen, open.taken,
    // open.pen.chain, night.whistle, story.pot.lump-grey.
    newCues: {'open.ash.bell': 'A lookout\'s hand bell, rung fast, far off', 'open.furnace.door': 'Heavy iron doors swung open, and a roar of draught'},
  },
};
