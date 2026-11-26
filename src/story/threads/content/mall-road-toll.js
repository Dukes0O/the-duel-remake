// A toll on the Mall Road: a storyline of the open Scablands, written as data (docs/story/open-scablands.md, section 18).
// The page that explains every scene is docs/story/threads/mall-road-toll.md. Every line a player reads is here exactly
// as the page has it, with the cast camp's names put in as {camp.leader}, {camp.name} and {camp.child}.
// Nothing loads this file yet. It names no other storyline: it meets the others only through facts.

const ID = 'mall-road-toll';
const mark = what => ({type: 'mark', id: `${ID}/${what}`});
const marked = what => ({fact: 'mark', id: `${ID}/${what}`});
const stands = who => marked(`stands-${who}`);
const PROMISED = {fact: 'mark', id: 'road-rats/toll-promised'};

// A people's word, as three bands. `who` is a people's id, or a role of the cast written as {role: 'camp'}.
const word = (who, atLeast) => ({fact: 'word', ...(typeof who === 'string' ? {of: who} : who), atLeast});
const friendly = who => word(who, 'Friendly');
const strangers = who => ({all: [word(who, 'Strangers'), {not: word(who, 'Friendly')}]});
const wary = who => ({not: word(who, 'Strangers')});
const CAMP = {role: 'camp'};

// Somebody besides Tin Town has agreed to stand, and two besides Tin Town have.
const ANOTHER = {any: [stands('dot'), stands('camp'), stands('walkers')]};
const others = ['dot', 'camp', 'walkers', 'nan'];
const TWO_OTHERS = {any: others.flatMap((a, i) => others.slice(i + 1).map(b => ({all: [stands(a), stands(b)]})))};

const say = (speaker, words, more = {}) => ({speaker, words, ...more});

export default {
  id: ID,
  title: 'A toll on the Mall Road',
  kind: 'feud',
  reads: ['feud', 'mark', 'found', 'stage', 'word', 'night', 'draw', 'thread'],
  writes: ['feud', 'scrap', 'find', 'site', 'word', 'favour', 'promise', 'settle', 'met', 'roadWord', 'mark'],

  cast: {
    gate: {site: 'sumps-gate', at: {road: 'mall-road', share: .855}},
    enemy: {group: 'road-rats'},
    camp: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'camp'}]}, nearest: 'gate', optional: true},
  },

  starts: {all: [
    {fact: 'night', atLeast: 3},
    {not: {fact: 'thread', id: ID, at: 'any'}},
    {any: [PROMISED, {all: [{fact: 'feud', of: 'road-rats', atLeast: 'Watching'}, {fact: 'draw', name: 'start', chance: .35}]}]},
  ]},

  sign: {kind: 'out-of-place', at: 'gate', seenWithin: 600, lastsNights: 6, cue: 'open.toll.seen'},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: [
        "Those wrecks weren't lying across the road the last time I drove this way. Somebody has dragged them there on purpose.",
        "There's only one gap, and it has a pole across it. This pass is the only way through these hills that a truck can use.",
      ],
      found: {within: 160, effects: [{type: 'find', site: 'sumps-gate'},
        {type: 'met', person: 'road-rats', text: "You found Sump's Gate across the Mall Road on the {night} night."}]},
      next: 'gate',
    },

    gate: {
      when: {reach: 'gate'},
      lines: [
        say('sump', "Good morning, and welcome to my road. Until four days ago it was only a road, and now it's a road with somebody looking after it.", {when: {not: PROMISED}}),
        say('sump', "The price is two scrap a wheel. You have four wheels, so that comes to eight scrap, and I'll lift the pole for you myself.", {when: {not: PROMISED}}),
        say('sump', "There you are! I've been telling everybody that Tin Town would be along to pay, and here you are, right on time.", {when: PROMISED}),
        say('sump', "That's eight scrap, and it's the first of the five you promised me. I'm keeping count on the gatepost so that neither of us forgets.", {when: PROMISED}),
      ],
      questions: [
        {id: 'who-will-not-pay', to: 'sump', words: "What happens to people who don't pay?",
          lines: [say('sump', "Then they don't go through. If they try to go through anyway, my lads take their wheels and leave them the scrap. Four wheels are worth a lot more than eight scrap, so you can see which choice is the clever one.")],
          effects: [mark('price-heard')]},
        {id: 'why-this-road', to: 'sump', words: 'Why did you pick this road?',
          lines: [say('sump', "Because it has a pass in it. People can drive round most places on a road, but a pass is a door, and I've wanted a door of my own for years.")]},
        {id: 'who-else-pays', to: 'sump', words: 'Who else is paying you?',
          lines: [say('sump', "The candle woman pays, and so does the pie van. The pie woman called me a name that I'd never heard before, and I'm having it painted on the gate.")]},
        {id: 'another-way', to: 'sump', words: 'Is there another way through?',
          lines: [say('sump', "There are the Breaks, if you enjoy climbing. I lost a buggy up there in the spring, and I still don't know which hill it's lying on.")]},
        {id: 'nan-hello', to: 'nan-tallow', words: 'Walk up to the candle van', by: 'go',
          lines: [say('nan-tallow', "I'm Nan Tallow, and I sell candles. I've paid a toll on every road I ever drove, to one lot of robbers or another, and I've hated every one of them.")]},
        {id: 'why-pay', to: 'nan-tallow', needs: ['nan-hello'], words: 'Why do you pay him?',
          lines: [say('nan-tallow', "I pay because I have one van, and he has nine buggies. I'd stop paying him tomorrow if I thought I wouldn't be the only one who stopped.")],
          effects: [mark('nan-asked')]},
      ],
      thoughts: [
        "Eight scrap isn't much to pay today. I wonder what the price will be once everybody has got used to paying it.",
        'Sump has three buggies by the fire and one more up on the hill. I can only see one of me.',
      ],
      choices: [
        {id: 'pay', by: 'do', words: 'Put eight scrap in the bucket',
          thought: "It's cheaper than a fight, and I'll be through in a minute.", next: 'paying'},
        {id: 'round', by: 'go', words: 'Turn off the road and climb into the Breaks',
          thought: "His lads lost a buggy up there. I think I'm a better driver than his lads are.", next: 'round'},
        {id: 'break', by: 'do', words: 'Drive at the pole',
          thought: 'If I knock that pole down, it will only stay down for as long as I keep winning.', next: 'break'},
        {id: 'home', by: 'go', words: 'Turn round and drive home',
          thought: "Nan said she'd stop paying if she weren't the only one. I wonder how many other people would say the same.",
          thoughtNeeds: marked('nan-asked'), next: 'hearth'},
      ],
    },

    // Every crossing that is paid for. The count of payments is kept as marks, because the vocabulary has no counter.
    paying: {
      when: {choice: 'pay'},
      cues: ['open.toll.bucket', 'open.toll.pole'],
      steps: [
        {when: {not: marked('paid-once')}, effects: [{type: 'scrap', by: -8}, mark('paid-once')]},
        {when: {all: [marked('paid-once'), {not: marked('paid-twice')}]}, effects: [{type: 'scrap', by: -8}, mark('paid-twice')]},
        {when: {all: [marked('paid-twice'), {not: marked('paid-three')}]}, effects: [{type: 'scrap', by: -8}, mark('paid-three')],
          lines: [say('sump', "I'm putting the price up to three scrap a wheel from next week. Everybody has stopped complaining about two, and that tells me two was too cheap.")]},
        {when: {all: [marked('paid-three'), {not: marked('paid-four')}]}, effects: [{type: 'scrap', by: -12}, mark('paid-four')]},
        {when: marked('paid-four'), effects: [{type: 'scrap', by: -12}, mark('paid-five'), mark('road-taxed'), {type: 'roadWord', by: 1},
            {type: 'settle', id: 'road-rats/toll-promised', when: PROMISED}],
          lines: [say('sump', "That makes five times, and I've enjoyed every one of them. You're my best customer, and I tell everybody so. They all pay a little quicker when they hear that Tin Town does.")],
          end: 'paid'},
      ],
      lines: [say('sump', "Thank you kindly. You see how easy that was? Nobody shouted, and nobody lost a wheel. I do like a customer who can count.", {when: {not: marked('paid-once')}})],
      next: 'gate',
      tiedBack: {when: marked('paid-five'), by: 'dot',
        lines: [say('dot', "My flour comes up the Mall Road, and it costs me three scrap a wheel before it's even a pie. Sump tells everyone that Tin Town pays without a word, so the rest of us look mean if we argue.")]},
    },

    round: {
      mission: `${ID}/round`, holds: ['checkpoints', 'signs'], minutes: 4,
      lookout: {seenAfterSeconds: 8, cue: 'open.toll.lookout'},
      explore: [
        {id: 'lost-buggy', cue: 'open.clue.found',
          thought: "This must be the buggy that Sump lost in the spring. Its engine is still in it, and nobody else knows it's here.",
          needs: {not: marked('buggy-stripped')},
          choices: [
            {id: 'strip', by: 'do', words: 'Strip it with the wrench', wrenchSeconds: 10,
              thought: 'Nobody would ever know who took them.', effects: [{type: 'scrap', by: 14}, mark('buggy-stripped')]},
            {id: 'tell-sump', by: 'go', words: 'Leave it, and tell Sump where it is',
              thought: 'He treats everything as a deal. Finding his buggy for him ought to be worth something.',
              effects: [mark('buggy-told'), {type: 'favour', person: 'road-rats', by: 1}],
              lines: [say('sump', "You found my buggy, and you came and told me when you could have stripped it? Nobody has ever done me a favour that I didn't have to pay for first. I owe you one now, and I always write down what I owe.")]},
            {id: 'leave-buggy', by: 'go', words: 'Leave it and say nothing', effects: []},
          ]},
      ],
      outcomes: {
        'not-seen': {effects: [mark('knows-the-round')], next: 'gate'},
        seen: {
          lines: [say('sumps-rider', "Sump says the hills are his as well, because they're standing next to his road. That will be eight scrap for the pass and eight more for making us climb.")],
          choices: [
            {id: 'pay-double', by: 'do', words: 'Pay sixteen scrap', effects: [{type: 'scrap', by: -16}, mark('knows-the-round')]},
            {id: 'outrun', by: 'go', words: 'Outrun them over the hills', effects: [mark('knows-the-round')]},
            {id: 'fight-on-the-slope', by: 'do', words: 'Fight two buggies on the slope', effects: [mark('knows-the-round')]},
          ],
          next: 'gate'},
        wrecked: {effects: [{type: 'scrap', share: -.5}], next: 'gate'},
      },
      // Told to Rell at her camp, on any later day, when the Walkers are Friendly or better.
      tell: {to: 'rell', needs: {all: [marked('knows-the-round'), friendly('walkers'), {not: marked('walkers-shown')}]},
        words: 'Tell Rell about the way through the hills',
        lines: [say('rell', "A way through the hills that only feet can use? That's the first road anybody ever found that suits us better than it suits everyone else. Thank you. I'll remember who showed it to us.")],
        effects: [mark('walkers-shown'), {type: 'favour', person: 'walkers', by: 1}]},
    },

    break: {
      mission: `${ID}/break`, holds: ['checkpoints', 'signs'], minutes: 3,
      fight: {group: 'road-rats', cars: 4, poleFallsAtKmh: 50, cue: 'open.toll.gate-down', boxedInSeconds: 6},
      outcomes: {
        won: {
          lines: [
            say('sump', "All right, all right, that's enough! You've made your point, and you've made it all over my gate. Take your road back, if it matters that much to you."),
            say('sump', "I had a fair price and a good pole, and you've cost me three buggies. I write down everything that I'm owed, and you've just gone to the top of the page."),
            say('nan-tallow', "I'm not going to thank you until I've seen whether he comes back. If he hasn't come back in a week, I'll bring you a box of candles."),
          ],
          effects: [{type: 'site', id: 'sumps-gate', stage: 'empty'}, {type: 'feud', of: 'road-rats', by: 1}, mark('gate-broken'), mark('road-free'),
            {...mark('promise-broken'), when: PROMISED}, {type: 'feud', of: 'road-rats', by: 1, when: PROMISED}, {type: 'roadWord', by: 1, when: PROMISED}],
          end: 'broken',
          tiedBack: [
            {by: 'sumps-rider', at: 'checkpoint',
              lines: [say('sumps-rider', "That's the car that knocked down the gate! Sump says we're to collect the toll from you wherever we find you now, because the whole road is a gate as far as you're concerned.")]},
            {by: 'nan-tallow', when: marked('promise-broken'),
              lines: [say('nan-tallow', "I heard that Tin Town gave Sump its word, and then knocked his gate down. I'm glad the gate has gone. I'd still like to know whether your word is only good while it's cheap.")]},
          ]},
        lost: {
          lines: [
            say('sump', "That was a silly thing to do, and I'd been so pleasant to you. I'm taking half the scrap in this car for my pole. That isn't robbery. It's the bill for the damage."),
            say('sump', "Your car doesn't come through my gate again, at any price. If Tin Town wants this road, Tin Town can send somebody with thirty scrap in a bucket to tell me it's sorry."),
          ],
          effects: [{type: 'scrap', share: -.5}, {type: 'feud', of: 'road-rats', by: 1}, mark('road-closed')],
          next: 'closed'},
      },
    },

    // The gate is shut to the player's car. The way round and the stand are still open, and so is the sorry bucket.
    closed: {
      when: marked('road-closed'),
      choices: [
        {id: 'sorry-bucket', by: 'do', words: 'Carry thirty scrap to the gate in a bucket, and say sorry',
          effects: [{type: 'scrap', by: -30}, mark('road-taxed')], next: 'gate'},
        {id: 'round-again', by: 'go', words: 'Turn off the road and climb into the Breaks', next: 'round'},
        {id: 'home-again', by: 'go', words: 'Turn round and drive home', next: 'hearth'},
      ],
    },

    hearth: {
      when: {reach: 'hearth'},
      lines: [
        say('auntie-solder', 'With the Ash Men sitting on the bridge, that road is the only other way we have to the west. Now Sump wants paying every time one of our wheels turns on it.'),
        say('auntie-solder', 'A toll lasts exactly as long as people go on paying it. If nobody on that road pays him on the same morning, all he owns is a heap of wrecks and a pole.'),
        say('moss', "He can't take the wheels off everybody at once, because he hasn't enough lads to do it. He can take them off anyone who turns up alone, though, and he will."),
        say('auntie-solder', "Tin Town will stand in that road, and you can tell people so. You'll need two more besides us before it's worth trying. Go and ask them to their faces. Nobody comes out for a message."),
      ],
      thoughts: ["If I ask somebody and they say no, they'll still know what we're planning to do."],
      effects: [mark('stands-tin-town')],
      next: 'visits',
    },

    // The round of visits. Each is a talk where that person's own day has put them, in any order, on any day.
    visits: {
      when: stands('tin-town'),
      talks: [
        {id: 'ask-dot', to: 'dot', words: 'Will you stand with us at the gate, Dot?', answers: [
          {when: friendly('dot'), effects: [mark('stands-dot')],
            lines: [say('dot', "I'll bring the van, and I'll bring a tray of pies as well, because people stand a great deal longer with something hot in their hands. Tell me the morning and I'll be there.")]},
          {when: strangers('dot'),
            lines: [say('dot', "I'd like to, and I'm frightened to. That van is my whole living, and it has four wheels he could take. I'll come if you promise me your car stays beside my van from start to finish.")],
            choices: [
              {id: 'promise-dot', words: 'You have my word. My car stays beside your van.', effects: [mark('stands-dot'),
                {type: 'promise', id: `${ID}/guard-dot`, person: 'dot', text: "You promised Dot that your car would stay beside her van at Sump's Gate."}]},
              {id: 'no-promise-dot', words: "I can't promise that, Dot.", effects: []},
            ]},
          {when: wary('dot'),
            lines: [say('dot', "No. I don't park my van in front of the Road Rats for people I can't rely on. I'd sooner pay Sump his eight scrap, because at least I know what I'm getting for it.")]},
        ]},
        {id: 'ask-camp', to: '{camp.leader}', needs: {cast: 'camp'}, words: 'Will your people stand with us at the gate?', answers: [
          {when: word(CAMP, 'Sworn'), effects: [mark('stands-camp'), mark('camp-two-carts')],
            lines: [say('{camp.leader}', "We'll come, and we'll bring both carts. You don't need to promise us anything. You've kept every promise you ever made here, and that's why we're coming.")]},
          {when: {all: [friendly(CAMP), {not: word(CAMP, 'Sworn')}]},
            lines: [say('{camp.leader}', "We've only the one cart, and it's the water cart. If he takes its wheels, nine people go thirsty. I'll bring it if you give me your word that your car stays right beside it.")],
            choices: [
              {id: 'promise-camp', words: 'You have my word. My car stays beside your cart.', effects: [mark('stands-camp'),
                {type: 'promise', id: `${ID}/guard-camp`, person: '{camp}', text: "You promised {camp.name} that your car would stay beside its cart at Sump's Gate."}]},
              {id: 'no-promise-camp', words: "I can't promise that.", effects: []},
            ]},
          {when: strangers(CAMP),
            lines: [say('{camp.leader}', "We don't know you well enough for that. You're asking us to put our cart in front of the Road Rats on your say alone. Come back when we know you better.")]},
          {when: wary(CAMP), effects: [{...mark('sump-warned'), when: {fact: 'draw', name: 'sold', chance: .5}}],
            lines: [say('{camp.leader}', "No. And I'd think hard about who else you ask, because not everybody on this road wishes Tin Town well.")]},
        ]},
        {id: 'ask-walkers', to: 'rell', needs: friendly('walkers'), words: 'Will the Walkers stand with us at the gate?', answers: [
          {effects: [mark('stands-walkers')],
            lines: [say('rell', "We walk, so he charges us by the cart, and we have three carts and nothing in them worth two scrap. We'll stand with you. My people are very good at standing about in the cold.")]},
        ]},
        {id: 'ask-nan', to: 'nan-tallow', words: 'Will you stand with us at the gate?', answers: [
          {when: ANOTHER, effects: [mark('stands-nan')],
            lines: [say('nan-tallow', "There are two of you already? Truly? Then I'm the third, and I shan't be the last. I told you I'd stop paying the day I wasn't the only one.")]},
          {when: {not: ANOTHER},
            lines: [say('nan-tallow', "Ask me again when you have somebody else. One van and one car aren't a refusal. They're two people about to lose their wheels.")]},
        ]},
      ],
      // Auntie Solder asks at the hearth once Tin Town and two others have agreed.
      call: {to: 'auntie-solder', needs: TWO_OTHERS,
        lines: [say('auntie-solder', "That's enough of us to try it. I can send word tonight, and everybody will be at the pass at first light. Once I've sent it, we can't call them back. Shall I send it?")],
        choices: [
          {id: 'send-word', words: "Send it. We'll stand at first light.",
            thought: 'Every one of them is only coming because I asked them to.', next: 'stand'},
          {id: 'not-yet', words: 'Not yet. I want to ask somebody else first.', next: 'visits'},
        ]},
    },

    stand: {
      mission: `${ID}/stand`, holds: ['checkpoints', 'signs'], minutes: 6, at: 'first-light', cue: 'open.toll.horns',
      lines: [
        say('sump', "Well, isn't this a lovely queue! I've never had so many customers at once. Who is going to be first?"),
        say('you', 'Nobody in this line is paying you today, Sump. Nobody is paying you tomorrow either.'),
        say('sump', "I can count every scrap that I'm not being paid this morning. I can also count the wheels in this line, and I have lads here who'd enjoy taking every one of them."),
      ],
      // The squeeze. Numbers are starting values for the builder and for Claude's drive.
      squeeze: {holdSeconds: 180, lessForEachBeyondThree: 30, outOfLineSeconds: 6, promiseMetres: 30, extraCarsIfWarned: 2,
        firstTarget: ['a cart the player promised to stay beside', "Nan Tallow's van"],
        warned: {when: marked('sump-warned'),
          lines: [say('sump', 'I knew that you were coming this morning. Somebody at {camp.name} sold me the day for one free crossing. That was a very good price, and I\'d have paid three.')]},
        shootingFirst: {next: 'break', extraCars: 2}},
      offer: {afterSeconds: 60,
        lines: [say('sump', "You're the one I could do business with. Drive through now and your car goes free on my road for ever. Leave the rest of them here, and they can each decide for themselves.", {low: true})],
        thoughts: ['Every car and cart behind me came here because I asked them to come.'],
        choices: [
          {id: 'drive-through', by: 'do', words: 'Drive through the gap', thought: "I'd never have to pay him again.",
            effects: [mark('drove-through-alone'), mark('road-taxed'),
              {type: 'word', person: 'dot', by: -1, when: stands('dot')},
              {type: 'word', person: '{camp}', by: -1, when: stands('camp')},
              {type: 'word', person: 'walkers', by: -1, when: stands('walkers')}],
            end: 'sold',
            tiedBack: {by: '{camp.leader}', when: stands('camp'),
              lines: [say('{camp.leader}', "We waited in that road until the sun was right up, and then we paid him, one cart at a time. {camp.child} asked me why you'd driven off without us. I told him I'd let you answer that yourself.")]}},
          {id: 'stay', by: 'do', words: 'Stay where you are', thought: 'He only made me that offer because the line is holding.',
            lines: [
              say('you', "They came because I asked them, Sump. I'm staying where I am."),
              say('sump', "That's a pity. I do hate it when somebody turns down a bargain."),
            ]},
        ]},
      outcomes: {
        held: {
          lines: [
            say('sump', "All right. I can do the sum as well as any of you, and there's no toll in it. So here's a different offer, and you can all hear this one."),
            say('sump', "A road wants looking after. For one scrap a cart, my lads keep this pass clear, tow anybody who breaks down in it, and see off the Ash Men if they come sniffing. It isn't a toll. It's a wage."),
            say('dot', "I didn't get out of bed before dawn to haggle with him. We came here to pay nothing, and nothing is what I mean to pay.", {when: stands('dot')}),
            say('nan-tallow', "One scrap, and a tow when my axle goes? I've paid a lot more than that for a lot less. I'd take it and be glad.", {when: stands('nan')}),
            say('{camp.leader}', "If we pay him a wage, he'll be here every day, and so will his buggies. If we don't, he'll be somewhere else, and we won't know where.", {when: stands('camp')}),
          ],
          thoughts: ["They're all looking at me. Whatever I say now, some of them will think I chose wrongly."],
          choices: [
            {id: 'no-wage', words: 'No toll and no wage. The road was free before you came.',
              thought: "He'll go somewhere, and he won't be in a good mood when he gets there.",
              lines: [say('sump', "Then you can have your free road, and all the holes in it. Don't come looking for me the day somebody worse than me finds this pass empty.")],
              effects: [{type: 'site', id: 'sumps-gate', stage: 'empty'}, {type: 'feud', of: 'road-rats', by: 1}, mark('road-free'),
                {type: 'word', person: 'dot', by: 1, when: stands('dot')},
                {type: 'word', person: '{camp}', by: 1, when: stands('camp')},
                {type: 'word', person: 'walkers', by: 1, when: stands('walkers')}],
              end: 'refused'},
            {id: 'wage', words: "One scrap a cart, and you keep the pass. That's a fair wage.",
              thought: 'I wonder what Sump does with a road once he has one.',
              cue: 'open.toll.tally',
              lines: [
                say('sump', "Now that is a deal! I told the lads that Tin Town could be reasoned with. You won't see a wreck on this road that we didn't put there ourselves."),
                say('dot', "So we stood in the cold for an hour to pay him less. I'll pay it, because I said I'd stand with you. I shan't pretend that I like it.", {when: stands('dot')}),
              ],
              effects: [mark('sump-keeps-the-pass'), mark('road-taxed'),
                {type: 'word', person: '{camp}', by: 1, when: stands('camp')},
                {type: 'word', person: 'walkers', by: 1, when: stands('walkers')}],
              end: 'kept'},
          ],
          // A promise kept comes off the page, and that people are up one word more.
          kept: [
            {when: {all: [stands('dot'), strangers('dot')]}, effects: [{type: 'settle', id: `${ID}/guard-dot`}, {type: 'word', person: 'dot', by: 1},
              {type: 'met', person: 'dot', text: "You stayed beside Dot's van, as you said you would."}]},
            {when: {all: [stands('camp'), {not: marked('camp-two-carts')}]}, effects: [{type: 'settle', id: `${ID}/guard-camp`}, {type: 'word', person: '{camp}', by: 1},
              {type: 'met', person: '{camp}', text: "You stayed beside {camp.name}'s cart, as you said you would."}]},
          ]},
        broke: {
          lines: [
            say('sump', "There, that's one of you paid. One is all a toll ever needs. Tomorrow it will be two of you, and by the end of the week you'll all be telling each other it was never worth the fuss."),
            say('sump', "As for Tin Town, my gate is shut to you until I've had thirty scrap and an apology, and I want the apology first."),
          ],
          // The people whose cart was pushed out, if the player had promised to stay beside it, go down one word.
          effects: [mark('road-closed'), mark('promise-broken')],
          end: 'closed'},
      },
    },
  },

  ends: ['paid', 'broken', 'refused', 'kept', 'sold', 'closed', 'stands'],

  // What happens when the sign is never followed: the gate becomes part of the land.
  ignored: {
    afterNights: 6,
    effects: [mark('road-taxed')],
    end: 'stands',
    told: {by: 'dot',
      lines: [say('dot', "Pies are a scrap dearer from today, and you can blame the Mall Road for it. Somebody ought to have done something about that gate in its first week, while it was still only a pole.")]},
  },
};
