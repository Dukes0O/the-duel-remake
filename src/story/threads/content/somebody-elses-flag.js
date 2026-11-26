// Somebody else's flag: a storyline of the open Scablands, written as data (docs/story/open-scablands.md, section 18,
// "The one shape of a storyline's file").
// The page that explains every scene is docs/story/threads/somebody-elses-flag.md. Every line a player reads is here
// exactly as the page has it. The camp's lines are written twice: for the Glasshouse (`when: {cast: 'camp', is: 'glasshouse'}`),
// and for any other camp, with its leader's name put in as {camp.leader}. In a condition or an effect the camp's people are
// '@camp.people' (src/world/open/roles.js).
// Nothing loads this file yet. It names no other storyline: it meets the others only through facts.
// Nobody in it says Mrs Vane's name: her people call her "the Office" (the page says why).

const ID = 'somebody-elses-flag';
// A mark with a sentence is one the player can read on the page What people remember. A mark without one is kept out of sight.
// The sentence is written on the first effect that makes the mark, and only there (the copies are listed in `notes`).
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text ? {text} : {})});
const marked = what => ({fact: 'mark', id: `${ID}/${what}`});
const say = (speaker, words, more = {}) => ({speaker, words, ...more});

const WELL = 'sweet-seep';
const CAMP = {cast: 'camp'};
const CAMP_PEOPLE = '@camp.people';
const scrap = atLeast => ({fact: 'scrap', atLeast});
// The camp is the Glasshouse, or it is any other camp.
const GLASSHOUSE = {cast: 'camp', is: 'glasshouse'};
const OTHER_CAMP = {all: [CAMP, {not: GLASSHOUSE}]};
const WATER_STRUCK = marked('water-struck');
const AT_ODDS = {fact: 'feud', of: 'water-men', atLeast: 'Raiding'};
const HAS_EMBER = {fact: 'stock', of: 'embers', atLeast: 1};
// The player has the price in the car: today's, or the dearer one once water is struck.
const priced = (today, later) => ({any: [{all: [{not: WATER_STRUCK}, scrap(today)]}, {all: [WATER_STRUCK, scrap(later)]}]});
const PRICE_IN_SCRAP = priced(160, 240), PRICE_WITH_EMBER = priced(60, 140);
// What buying the well makes. The sentences are written on the first of the two ways to pay, which comes first in the file.
const bought = withText => [
  {type: 'made', id: `${ID}/hand-pump`, ...(withText ? {text: 'A hand pump stands on the Sweet Seep.'} : {})},
  mark('bought-out', withText ? 'You bought the Sweet Seep back from the water company.' : undefined),
  {type: 'word', person: CAMP_PEOPLE, by: 1, when: CAMP},
];

export default {
  id: ID,
  title: "Somebody else's flag",
  kind: 'rival',
  reads: ['found', 'stage', 'made', 'word', 'feud', 'stock', 'scrap', 'night', 'mark'],
  writes: ['made', 'word', 'favour', 'debt', 'feud', 'stock', 'scrap', 'roadWord', 'mark'],

  // The well is one place and the rival is one group, so neither is a role: the Sweet Seep and the water men are named.
  cast: {
    camp: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'camp'}, {fact: 'word', atLeast: 'Friendly'}]}, nearest: WELL, optional: true},
  },

  starts: {all: [
    {fact: 'night', atLeast: 4},
    {fact: 'found', site: WELL},
    {not: {fact: 'made', id: `${ID}/hand-pump`}},
    {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .4},
  ]},

  sign: {kind: 'thing', at: WELL, seenWithin: 2500, cue: 'open.flag.seen'},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: [
        "That's where the Sweet Seep is. There was nothing there except reeds and birds when I found it.",
        "Somebody has put up a tower since then, and there's a white flag on the top of it.",
      ],
      effects: [mark('tower-seen', 'The water company has put a tower on the Sweet Seep.')],
      next: 'site',
    },

    site: {
      when: {reach: WELL},
      cue: 'open.flag.drill',
      effects: [{type: 'met', person: 'water-men', text: 'You met Miss Pell of the water company at the Sweet Seep.'}],
      lines: [
        // Who stands at the rope.
        say('marigold', "We fill the cart here whenever the wind drops and our pump stands still. It holds forty cans. That woman says forty cans is a hundred and sixty scrap, and I haven't got sixteen.", {when: GLASSHOUSE}),
        say('{camp.leader}', "We've always filled our cans here in the dry weeks. Now there's a rope round it and a price on a board, and we haven't the scrap to pay it.", {when: OTHER_CAMP}),
        say('traveller', "I've drunk from this seep every time I've crossed the grey. Today there's a rope round it, and a woman with a list.", {when: {not: CAMP}}),
        say('miss-pell', "Good morning. This site is being improved by the water company. May I ask whether you're here as a customer or as a member of the public?", {when: {not: AT_ODDS}}),
        say('miss-pell', "I'm Miss Pell, and I'm the surveyor. I'm required to tell you that the rope is there for your safety, although it's really there for ours.", {when: {not: AT_ODDS}}),
        say('miss-pell', "I know your car. The Office keeps a file on Tin Town, and I've been told to read you only the short cards.", {when: AT_ODDS}),
        // The finder's fee: one more card, read before the player leaves the table.
        say('miss-pell', "There's a card I have to read to you, because our tracks say that you were here first. The Office pays a finder's fee of ten scrap. You only have to sign that you found the site and showed it to nobody else.", {when: {not: marked('took-the-fee')}}),
        say('miss-pell', "The driller tells me we'll strike proper water in two days. Everything about this site costs more from that morning, so if you have business with us, I'd bring it soon.", {when: {not: WATER_STRUCK}}),
      ],
      thoughts: [
        {thought: "It's ten scrap for something I've already done. It's also my name on their paper, saying that I led them here.", when: {not: marked('took-the-fee')}},
        "They haven't hurt anybody. All they've done is put a rope round the water and a price on it.",
        "I found this place, and I drove away from it. I wonder whether there'd be a rope here now if I'd left a mark.",
      ],
      explore: [
        {id: 'peg', cue: 'open.clue.found', effects: [mark('peg-read')],
          thought: "The date on this peg is the day after I was here. They didn't find this place. They followed my tyre marks to it."},
        {id: 'reeds', cue: 'open.clue.found', effects: [mark('reeds-seen')],
          thought: 'The birds were how I found the water. Nobody is going to find it that way again.'},
        {id: 'board', cue: 'open.clue.found', effects: [mark('board-read')],
          thought: "That's four scrap for a can of water that cost nothing a week ago."},
        {id: 'stakes', cue: 'open.clue.found', effects: [mark('stakes-seen')],
          thought: "There are enough stakes on that truck for three more fences. They don't mean to stop at this one."},
      ],
      questions: [
        {id: 'whose-water', words: 'Whose water is this?',
          lines: [say('miss-pell', "It belongs to whoever improves it, and we're improving it. Before we came, it was a wet patch with birds on it.")]},
        {id: 'found-first', words: 'I found this place before you did.',
          lines: [say('miss-pell', "I'm sure you did, and I expect you enjoyed it. You didn't mark it, drill it or fence it, though, and my forms don't have a box for looking.")]},
        {id: 'what-charge', words: 'What will you charge for it?',
          lines: [say('miss-pell', "It's four scrap a can to begin with. The Office looks at every price once a month, and I've never known it to look at one and make it smaller.")]},
        {id: 'cannot-pay', words: "What about people who can't pay?",
          lines: [say('miss-pell', "Then they can have the water they had before we drilled, which was a puddle. I'm sorry. I don't write the cards. I only read them out.")]},
        {id: 'who-for', words: 'Who do you work for?',
          lines: [say('miss-pell', "I work for the Office. The Office works for a lady I've never met, who sends her instructions on very nice paper. I'm told that she's always polite.")]},
      ],
      choices: [
        {id: 'take-the-fee', by: 'do', when: {not: marked('took-the-fee')}, words: 'Sign for the fee', thought: 'Nobody is hurt by ten scrap.',
          effects: [{type: 'scrap', by: 10}, mark('took-the-fee', 'You took ten scrap from the water company for finding the Sweet Seep.')]},
        {id: 'leave-the-card', by: 'do', when: {not: marked('took-the-fee')}, words: 'Leave the card on the table', effects: []},
        {id: 'share', by: 'do', when: {all: [CAMP, {not: AT_ODDS}]}, words: 'Ask Miss Pell what it would take to share the water',
          thought: "She reads everything off a card. Maybe there's a card for sharing.", next: 'schedule'},
        {id: 'buy', by: 'do', words: 'Ask Miss Pell what the whole site would cost',
          thought: 'I wonder what the Office thinks a well is worth.', next: 'price'},
        {id: 'drive-at-the-rope', by: 'do', words: 'Drive at the rope',
          thought: 'Those pickups are heavier than my car, and there are two of them.', next: 'fight'},
        {id: 'drive-away', by: 'go', words: 'Drive away', thought: 'It was never mine. All I did was find it.'},
      ],
      notes: {
        // The first three lines are those of the people at the rope. The finder's fee is read before the player leaves the
        // table, and the driller's line is the last.
        lineMoments: {atTheRope: 'first', fee: 'beforeLeaving', driller: 'last'},
      },
    },

    schedule: {
      when: {chose: 'share'},
      cue: 'open.flag.card',
      lines: [
        say('miss-pell', "There is a card for that, and it's called a Prior Use Schedule. If people drew water here before the improvement, and somebody signs to say so, those people may go on drawing it free, up to a fixed number of cans."),
        say('miss-pell', 'It needs two signatures. One is from somebody who drew the water. The other is from somebody who will answer for them, and that would be you, signing for Tin Town.'),
        say('marigold', "You want me to sign a paper to drink water that I've been drinking for thirty years? I'll sign it, because beans can't wait for me to feel better about it. I'd like somebody to remember that I didn't enjoy it.", {when: GLASSHOUSE}),
        say('{camp.leader}', "I'll sign it, because my people have to drink. I'd like it remembered that nobody asked us before the rope went up.", {when: OTHER_CAMP}),
      ],
      thoughts: [{thought: "If I sign, Marigold's people drink for nothing. I'd also be writing down that this water belongs to the company.", when: GLASSHOUSE}],
      questions: [
        {id: 'what-signing', words: 'What exactly am I signing?',
          lines: [say('miss-pell', "You're signing that Tin Town recognises the improvement of this site by the water company. In plain words, you're agreeing that it's ours, and we're agreeing to be generous about it.")]},
        {id: 'how-many-cans', words: 'How many cans is that?',
          lines: [say('miss-pell', "It's forty cans a week for each camp that signs, which is one cartload. Anybody who isn't on the schedule pays at the board.")]},
      ],
      choices: [
        {cue: 'open.flag.stamp', id: 'sign', by: 'do', words: 'Sign the schedule, for Tin Town',
          thought: "It's only a signature. It may also be the one thing here that's still true next year.",
          effects: [mark('signed', 'Tin Town signed that the Sweet Seep is the water company\'s, and {camp.name} draws from it free.'),
            {type: 'favour', person: CAMP_PEOPLE, by: 1}],
          lines: [
            say('miss-pell', "Thank you. That's the first schedule I've filled in all year. Most people shout at me, and there isn't a card for shouting."),
            say('marigold', "That's forty cans a week, and my name on a company's paper. Well, the beans will drink. I'll save you the first basket, and I'll try not to think about the paper.", {when: GLASSHOUSE}),
            say('{camp.leader}', "Forty cans a week will keep us. I'd sooner have had the seep the way it was, but I'll take the water.", {when: OTHER_CAMP}),
          ],
          next: 'shared'},
        {id: 'pen-down', by: 'do', words: 'Put the pen down', thought: {thought: 'Then Marigold pays four scrap a can, or goes without.', when: GLASSHOUSE}, next: 'site'},
      ],
      notes: {
        // The lines of the camp's leader are said when the camp is asked to sign.
        lineMoments: {asked: 'last'},
      },
    },

    price: {
      when: {chose: 'buy'},
      lines: [
        say('miss-pell', "The Office sells anything, and there's a card for that as well. The tower, the fence, the forms and the survey come to a hundred and sixty scrap today. From the morning we strike water, they come to two hundred and forty."),
        say('miss-pell', 'I\'m also told that Tin Town makes a kind of coal that burns all night. The Office would count one of those as a hundred scrap, and I think it would sooner have one than not.', {when: HAS_EMBER}),
      ],
      thoughts: ["I haven't that much scrap in the car. An ember would cover what I'm short, and an ember is a night of fire."],
      questions: [
        {id: 'what-for-it', words: 'What do I get for it?',
          lines: [say('miss-pell', 'You get the bore, a hand pump and the ground inside the rope. We take the drill, the flag and the price board away with us. What you do with a hole full of water afterwards is your own affair.')]},
        {id: 'come-back', words: 'Will you come back?',
          lines: [say('miss-pell', "We won't come back to this site. The Office never goes back to a site that it has sold. It simply looks for the next one, and it does look.")]},
      ],
      next: 'hearth',
      notes: {
        // Starting values for the builder. A quarter more when the water men are already at odds with Tin Town.
        costs: {beforeWater: 160, afterWater: 240, emberCountsAs: 100, moreWhenAtOdds: .25},
      },
    },

    hearth: {
      when: {all: [{chose: 'buy'}, {reach: ['tin-town', 'hearth']}]},
      lines: [
        say('auntie-solder', "You want to buy a well that isn't ours, from people who didn't dig it, with scrap that we haven't got. I'll lend you sixty from the town's tin, and I shall want to know who is paying it back."),
        say('cinder', "Don't offer them an ember until you've counted the store. That's a night of fire going out through the gate in a pot, and it won't come back as water.", {when: HAS_EMBER}),
        // The camp's offer, if its leader is asked.
        say('marigold', "We've no scrap worth the name. We can pay you in beans, a basket at every picking until you say it's enough. I know that isn't what the white trucks want, so it will have to be what you want.", {when: GLASSHOUSE}),
        say('{camp.leader}', "We've no scrap to give you. We can pay you back in work and in what we make, a little at a time, until you say it's enough.", {when: OTHER_CAMP}),
      ],
      effects: [{type: 'scrap', by: 60}, mark('till-lent'),
        {type: 'debt', id: `${ID}/town-tin`, person: 'auntie-solder', owedBy: 'player', text: "You owe Auntie Solder sixty scrap from the town's tin."},
        {...mark('beans-offered'), when: CAMP},
        {type: 'debt', id: `${ID}/beans`, person: CAMP_PEOPLE, text: '{camp.name} owes you a basket of beans at every picking.', when: GLASSHOUSE}],
      next: 'carry',
      notes: {
        // The last two lines and the last two effects are the camp's offer, made when its leader is asked.
        spotLabel: 'the hearth', lineMoments: {offer: 'asked'},
      },
    },

    // Carrying the price back to the site. It holds nothing, so the road's own danger is its point (section 15).
    carry: {
      mission: {kind: 'reach', id: `${ID}/carry-the-price`, by: 'car', holds: []},
      next: 'table',
    },

    table: {
      when: {reach: WELL},
      choices: [
        {cue: 'open.flag.stamp', id: 'pay-scrap', by: 'do', when: PRICE_IN_SCRAP, words: 'Pay it all in scrap',
          thought: "That's everything I have, and sixty of it is the town's.",
          effects: [{type: 'scrap', by: -160, when: {not: WATER_STRUCK}}, {type: 'scrap', by: -240, when: WATER_STRUCK}, ...bought(true)],
          next: 'sold'},
        {cue: 'open.flag.stamp', id: 'pay-ember', by: 'do', when: {all: [HAS_EMBER, PRICE_WITH_EMBER]}, words: 'Pay sixty scrap and one ember',
          thought: "That's a night of fire, and Cinder told me to count first.",
          effects: [{type: 'scrap', by: -60, when: {not: WATER_STRUCK}}, {type: 'scrap', by: -140, when: WATER_STRUCK},
            {type: 'stock', stock: 'embers', by: -1}, mark('ember-paid'), {type: 'roadWord', by: 1}, ...bought(false)],
          next: 'sold'},
        {id: 'cannot-pay-it', by: 'do', words: 'Tell her that you cannot pay it', next: 'site'},
      ],
    },

    sold: {
      when: marked('bought-out'),
      cue: 'open.flag.down',
      lines: [
        say('miss-pell', "Thank you. I'll write this up as a sale, and the Office does like a sale. You've been a pleasure to deal with, and I don't get to write that very often."),
        say('finch', "They've left the pump! Gran said they'd take everything that wasn't nailed down, and they've left the only thing that matters.", {when: GLASSHOUSE}),
        say('{camp.leader}', "They've left a pump on it, and no rope. I didn't think anybody would do that for us.", {when: OTHER_CAMP}),
      ],
      next: 'bought',
    },

    fight: {
      cue: 'open.flag.horn',
      mission: {
        id: `${ID}/drive-them-off`, kind: 'fight', by: 'car', minutes: 3, holds: ['checkpoints', 'signs'],
        // Two heavy pickups that shove and box in, and do not shoot. Won when one is wrecked.
        enemy: 'water-men', cars: 2,
        rule: {shoot: false, boxedInSeconds: 6},
        lines: [say('miss-pell', "I'm required to read you this card before anything happens. \"The company regrets any damage that may shortly occur to your vehicle.\" I am sorry about this. It isn't personal.")],
        outcomes: {
          won: {
            cue: 'open.flag.down', lines: [
              say('miss-pell', 'That will do. Stop the drill, please, and bring down the flag. I shall have to write this up as an incident, and the Office reads every incident twice.'),
              say('marigold', "They've gone, and they've taken their price board with them. The Seep is still here. The reeds will take a year to grow back, but beans are patient, and so am I.", {when: GLASSHOUSE}),
              say('{camp.leader}', "They've gone, and the water is still here. I hope that it was worth making an enemy for.", {when: OTHER_CAMP}),
            ],
            effects: [{type: 'feud', of: 'water-men', by: 1}, {type: 'roadWord', by: 1}, {type: 'word', person: CAMP_PEOPLE, by: 1, when: CAMP},
              mark('driven-off', 'You drove the water company off the Sweet Seep.')],
            next: 'driven-off'},
          lost: {
            lines: [say('miss-pell', "I did read you the card. We'll tow you as far as the road. There's a recovery charge, and I'm afraid it's half of whatever is in the car. I'll write you a receipt for it.")],
            // The recovery charge is half the scrap in the car (section 15).
            effects: [{type: 'feud', of: 'water-men', by: 1}, {type: 'roadWord', by: 1},
              mark('towed-off', 'The water company towed you off the Sweet Seep, and its tower still stands.')],
            next: 'beaten'},
        },
      },
    },
  },

  ends: ['shared', 'bought', 'driven-off', 'beaten', 'stays'],

  // What happens when the sign is never followed, or the player drives away: the water men keep the well.
  ignored: {
    afterNights: 3, afterChoice: {id: 'drive-away', times: 1},
    effects: [mark('company-keeps-it', 'The water company keeps the Sweet Seep.')],
    next: 'stays',
  },

  // What somebody says afterwards.
  later: [
    {id: 'finch-fee', by: 'finch', when: {all: [{chose: 'take-the-fee'}, GLASSHOUSE]},
      lines: [say('finch', "Gran says the water company paid you for finding our water. She says it was ten scrap. I told her you wouldn't have taken it, and she told me to ask you myself.")]},
    {id: 'camp-fee', by: '{camp.leader}', when: {all: [{chose: 'take-the-fee'}, OTHER_CAMP]},
      lines: [say('{camp.leader}', "I heard that the water company paid you for finding our water. I'd like to hear you say whether that's true.")]},
    {id: 'trader-signed', by: 'trader', when: {chose: 'sign'},
      lines: [say('trader', "I paid four scrap a can at the Sweet Seep last week. The woman at the table told me that Tin Town had signed for it. I said that didn't sound like Tin Town, and she showed me the paper.")]},
    {id: 'card-thanks', by: 'printed-card', when: marked('bought-out'), at: ['tin-town', 'board'],
      lines: [say('printed-card', 'The water company thanks Tin Town for its custom, and looks forward to serving it again at another site. Kind regards, the Office.')]},
    {id: 'card-incident', by: 'printed-card', when: {any: [marked('driven-off'), marked('towed-off')]}, at: ['tin-town', 'board'],
      lines: [say('printed-card', 'The water company gives notice that it has recorded an incident at site 14, and that it has instructed its people to take an interest in Tin Town. Kind regards, the Office.')]},
    {id: 'marigold-fence', by: 'marigold', when: {all: [marked('company-keeps-it'), GLASSHOUSE]},
      lines: [say('marigold', "The Sweet Seep has a wire fence round it now, and a woman with a list. We buy ten cans a week, and the beans get whatever is left when the people have drunk. I don't suppose you ever go out that way.")]},
    {id: 'camp-fence', by: '{camp.leader}', when: {all: [marked('company-keeps-it'), OTHER_CAMP]},
      lines: [say('{camp.leader}', 'The seep we used has a wire fence round it now, and a price. We buy what we can and go short of the rest.')]},
    {id: 'dot-water-sold', by: 'dot', when: {all: [marked('company-keeps-it'), {not: CAMP}]},
      lines: [say('dot', "Somebody is selling water out of a can in the west, at six scrap a time, from a hole that used to be free. I don't know who found it for them, and I hope it wasn't anybody I feed.")]},
  ],

  notes: {
    // On the sign: the lamps lit at the site, its name on the map, and what happens two banked nights after the tower appears
    // (the drill strikes water, and everything at the site costs more).
    sign: {
      lamps: 2,
      mapName: 'The Sweet Seep (somebody is drilling here)',
      struck: {afterNights: 2, effects: [mark('water-struck')]},
    },
  },
};
