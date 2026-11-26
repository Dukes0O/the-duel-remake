// The stranded hauler: a thread of the open Scablands, written in full in docs/story/threads/stranded-hauler.md and
// in the shape of docs/story/open-scablands.md section 18. Nothing loads this file yet; OPEN-THREADS will.
//
// How to read a beat. `lines` are talk bubbles in order, `thoughts` are the player's thought bubbles, `explore` lists
// what can be read by looking, `questions` cost nothing to ask, and `choices` are what the player says (`act: 'say'`)
// or does (`act: 'do'`). `plain` is what anybody could see before choosing and `hidden` is the writer's note of what
// the game keeps to itself; neither is shown as words. `words` and `thought` are shown exactly as written.
const ID = 'stranded-hauler';
const say = (speaker, words, more) => ({speaker, words, ...more});
const tally = (words, more) => say('tally', words, more);
const rat = (words, more) => say('road-rat', words, more);
const onRadio = {radio: true};
const mark = what => ({type: 'mark', id: `${ID}/${what}`});
const did = what => ({fact: 'mark', id: `${ID}/${what}`});
const ratsFeud = atLeast => ({fact: 'feud', of: 'road-rats', atLeast});
// A draw is named short. The storyline rule puts this storyline's id and the night in front of the name.
const draw = (name, chance) => ({fact: 'draw', name, chance});

// The first truck is the trap one time in five, and one more draw is made for each step of the Road Rats' feud:
// about one time in three at Watching, one in two at Raiding and three in five at Hunting. It is asked once, when
// the first truck comes into view, and what it answered is kept as the mark `trap-set`.
const TRAP_DRAWN = {any: [
  draw('trap', .2),
  {all: [ratsFeud('Watching'), draw('trap-watching', .15)]},
  {all: [ratsFeud('Raiding'), draw('trap-raiding', .25)]},
  {all: [ratsFeud('Hunting'), draw('trap-hunting', .25)]},
]};
const TRAP_MET = {any: ['paid-the-trap', 'trap-broken', 'lost-to-the-trap', 'ran-from-the-trap', 'passed-the-trap']
  .map(did)};
const TRAP_LEFT_STANDING = {all: [TRAP_MET, {not: did('trap-broken')}, {not: did('warned-the-road')}]};
const SELLS_TO_RATS = {all: [did('helped'), {not: did('one-gate-only')}]};

// The three questions home by radio that have the same answer whichever truck it is.
const CALLS_HOME = [
  {id: 'ask-moss', asks: 'moss', words: 'Moss, what does a truck look like when it has really broken down?',
    shows: 'What to look for under the engine',
    lines: [say('moss', "It looks like a mess. There'll be tools all over the ground, something dripping underneath and a driver with dirty hands and a bad temper. If the ground is clean and the driver is cheerful, I'd keep driving.", onRadio)]},
  {id: 'ask-auntie', asks: 'auntie-solder', words: 'Auntie, would the Road Rats pretend to be broken down?',
    shows: 'That the trap exists, and that the tracks give it away',
    lines: [say('auntie-solder', "They would, and they do. One of them stands by a car with its bonnet up, and the others wait where you can't see them. Look at where the tracks go before you look at who is waving.", onRadio)]},
  {id: 'ask-dot', asks: 'dot', words: 'Dot, do you know a hauler who carries tyres?',
    when: {fact: 'word', of: 'dot', atLeast: 'Wary'},
    shows: 'The blue door: the one thing the Road Rats cannot copy',
    lines: [say('dot', "That'll be Tally. She brings my flour when she remembers to. Her truck has one blue door, because the red one fell off years ago and she never found another red one. If all the doors match, it isn't her.", onRadio)]},
];

const FIRST_THOUGHTS = [
  "There's a truck stopped up ahead with its bonnet up, and somebody beside it is waving at me.",
  "If that's somebody in real trouble, I might be the only car on this road all day. If it isn't, then I'm exactly who they're waiting for.",
];
const ROAD_THOUGHTS = [
  "If I stop and it's a trap, I'll be standing still with my engine off when it shuts.",
  "If I drive on and it isn't a trap, somebody sits out here for another day, and I'll never find out which it was.",
];

export default {
  id: ID,
  title: 'The stranded hauler',
  kind: 'stranger',

  reads: ['feud', 'word', 'made', 'found', 'stage', 'mark', 'night'],
  writes: ['word', 'debt', 'settle', 'scrap', 'feud', 'roadWord', 'mark', 'met'],

  cast: {
    hauler: {from: 'persons', is: 'tally'},
    // A site nobody has shown the player, for Tally's free piece of news. Left empty when every site is found.
    rumoured: {from: 'sites', where: {not: {fact: 'found'}}, optional: true},
    // A found camp that has been burned, by anybody. Left empty when there is none.
    burned: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'burned'}]}, optional: true},
  },

  starts: {all: [
    {fact: 'night', atLeast: 2},
    {not: {fact: 'thread', id: ID, at: 'any'}},
    draw('start', .4),
  ]},

  // A thing out of place, come across on a drive: a truck with its bonnet up, standing in for the draw of a
  // checkpoint that traders come to. After a trap the director draws for the sign again, at another such checkpoint,
  // and then it is the hauler.
  sign: {kind: 'thing', what: 'a truck stopped with its bonnet up and somebody waving',
    at: {checkpoint: {who: 'traders'}}, seenWithin: 400, lastsNights: 2, cue: 'open.hauler.seen',
    again: {when: {all: [TRAP_MET, {not: did('helped')}]}, at: {checkpoint: {who: 'traders', not: 'the first'}},
      afterNights: 2}},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: FIRST_THOUGHTS,
      // A player who has met the trap thinks of it when the second truck comes into view.
      moreThoughts: [{when: TRAP_MET,
        thought: 'The last time I stopped for a raised bonnet, there were two buggies waiting behind the hill.'}],
      next: [
        {when: {any: [TRAP_MET, {not: TRAP_DRAWN}]}, to: 'hauler-road'},
        {to: 'trap-road', effects: [mark('trap-set')]},
      ],
    },

    // ---- The trap ----

    'trap-road': {
      when: {near: 'sign', within: 220},
      explore: [
        {id: 'waving', from: 'crest', cue: 'open.scout.seen',
          what: 'A man beside the truck waves both arms without stopping, and looks behind him.',
          thought: "He hasn't stopped waving since I came over the hill, and he keeps glancing back at that rise behind him.",
          tells: 'He is watching for somebody'},
        {id: 'load', from: 'crest', cue: 'open.scout.seen',
          what: 'The cover over the back of the truck lies flat.',
          thought: "The cover on the back of that truck is lying flat. Whatever he's doing out here, he isn't hauling anything.",
          tells: 'It is not a working truck'},
        {id: 'ground', from: 'verge', cue: 'open.scout.seen',
          what: 'The bonnet is up. The ground under the engine is dry, and no tools are out.',
          thought: "The bonnet is up, but the ground under it is dry and there isn't a single tool lying out. Nobody has been working on that engine.",
          tells: 'Nothing is broken'},
        {id: 'doors', from: 'verge', cue: 'open.scout.seen',
          what: 'Both doors are the same rusty red. A square of fresh paint covers something on one of them.',
          thought: "Somebody has painted over a mark on that door, and the paint is still shiny. Old trucks out here don't get fresh paint for no reason.",
          tells: 'A flag or a mark has been hidden'},
        {id: 'tracks', from: 'verge', cue: 'open.scout.seen',
          what: 'Two sets of narrow tyre tracks leave the road and go round behind a rise.',
          thought: "Two sets of narrow tracks leave the road here and go round behind that rise. There's nothing behind it to drive to.",
          tells: 'Buggies are waiting out of sight'},
        {id: 'behind', from: 'high-ground', cue: 'open.scout.seen',
          what: 'Two buggies behind the rise with their engines running, and their drivers standing on the seats.',
          thought: "There are two buggies behind the rise with their engines running. That truck isn't broken down at all. It's a trap for whoever stops to help.",
          tells: 'All of it, for certain', effects: [mark('saw-the-trap-first')]},
      ],
      questions: [
        ...CALLS_HOME,
        {id: 'ask-rell', asks: 'rell', words: 'Rell, have your people seen a truck on this road?',
          when: {fact: 'word', of: 'walkers', atLeast: 'Friendly'},
          shows: 'The truck was not there yesterday',
          lines: [say('rell', 'We walked that road at noon yesterday, and there was no truck on it then. Be careful. Nobody breaks down in the very hour that you happen to come along.', onRadio)]},
        {id: 'ask-keeper', asks: 'keeper', words: 'Keeper, can you see the truck on this road from your tower?',
          when: {fact: 'made', id: 'tower/crows-step'},
          shows: 'The buggies, without leaving the car',
          lines: [say('keeper', "I can see that truck from up here, and I can see two buggies sitting behind the hill beside it. I'd turn round, if I were you.", onRadio)],
          effects: [mark('saw-the-trap-first')]},
        {id: 'warn-the-road', asks: 'auntie-solder', words: "Auntie, there's a trap on the road out here. Can anybody be warned?",
          when: did('saw-the-trap-first'),
          shows: 'A way to spoil the trap without fighting it',
          lines: [say('auntie-solder', "I'll tell Dot, and Dot will tell every carter who stops for pie. By tonight there won't be a soul on that road who slows down for a raised bonnet.", onRadio)],
          effects: [mark('warned-the-road')]},
      ],
      thoughts: ROAD_THOUGHTS,
      choices: [
        {id: 'stop', act: 'do', words: 'Drive up and stop beside the truck',
          plain: 'The man who is waving',
          thought: "Nobody else is going to stop. I've seen for myself how empty this road is.",
          hidden: 'The trap shuts', next: 'trap-shut'},
        {id: 'drive-past', act: 'do', words: 'Drive past without slowing down',
          plain: 'The open road beyond the truck',
          thought: "I can't mend every truck in the Scablands, and I have a town to get home to.",
          hidden: 'The buggies come out too late to catch a car at speed', next: 'trap-passed'},
        {id: 'turn-back', act: 'do', words: 'Turn round and go back the way you came',
          plain: 'The road behind',
          hidden: 'Nothing happens today. The truck is there again tomorrow', next: 'trap-road'},
        {id: 'come-round-behind', act: 'do', words: 'Go round behind the rise and reach the buggies first',
          when: did('saw-the-trap-first'),
          plain: 'Two buggies, with their drivers standing on the seats',
          thought: "They're Road Rats, and they're waiting to rob whoever stops to help. If I leave them here, the next car that stops will belong to somebody kinder than me.",
          hidden: 'A fight begun on the player\'s terms, with one buggy caught standing', next: 'trap-from-behind'},
      ],
    },

    'trap-shut': {
      when: {near: 'sign', within: 40},
      cue: 'open.trap.sprung',
      lines: [
        rat('Thank you for stopping. Hardly anybody does these days, and it gets lonely standing out here.'),
        rat("There's nothing wrong with this truck. There are two buggies behind that rise, and there's nothing wrong with them either."),
        rat('Sump says that anybody soft enough to stop is soft enough to pay. Put forty scrap down on the road, and you can drive home on all four wheels.'),
      ],
      thoughts: [
        'I stopped to help him, and he was waiting for somebody exactly like me.',
        "The buggies haven't come over the rise yet, and the road behind me is still open.",
      ],
      choices: [
        {id: 'pay', act: 'do', words: 'Put forty scrap down on the road',
          plain: 'He named the price aloud: forty scrap',
          thought: "It's only scrap. But he'll remember that this car stops, and that it pays.",
          hidden: 'The Road Rats ask this car for more next time, and say why',
          effects: [{type: 'scrap', by: -40}, mark('paid-the-trap')],
          lines: [rat("That's very handsome of you. I'll tell Sump that Tin Town has lovely manners. Mind how you go, and do stop again.")],
          next: 'between'},
        {id: 'fight', act: 'do', words: 'Drive straight at the rise and fight',
          plain: 'Two buggies and one slow truck',
          thought: "They have to come over that rise one at a time, and I'm already moving.",
          hidden: 'A fight won about six times in ten on Easy', next: 'trap-fight'},
        {id: 'run', act: 'do', words: 'Reverse out and run for it',
          plain: 'The open road behind',
          thought: "Nobody ever robbed a car that they couldn't catch.",
          hidden: 'A chase of about a minute. The trap stays where it is', next: 'trap-run'},
      ],
    },

    'trap-fight': {
      mission: `${ID}/trap-fight`, kind: 'rider-fight', holds: ['checkpoints', 'signs'], minutes: 2,
      enemy: 'road-rats', cars: 2,
      outcomes: {
        won: {
          lines: [rat("All right, that's enough! You've made your point, and you've made it all over two good buggies. Sump is going to hear about this, and he won't hear it kindly.")],
          effects: [{type: 'feud', of: 'road-rats', by: 1}, {type: 'scrap', by: 30}, {type: 'roadWord', by: 1},
            mark('trap-broken')],
          next: 'between'},
        lost: {
          lines: [rat("Well, there you are. You could have paid forty and kept your car in one piece. I'll take the forty anyway, and I'll take a little more for the trouble.")],
          effects: [{type: 'scrap', by: -60}, mark('lost-to-the-trap')],
          then: 'towed-home', next: 'between'},
      },
    },

    'trap-from-behind': {
      mission: `${ID}/trap-from-behind`, kind: 'rider-fight', holds: ['checkpoints', 'signs'], minutes: 2,
      enemy: 'road-rats', cars: 2, firstCarStanding: true,
      outcomes: {
        won: {
          lines: [rat("Nobody ever comes round the back! That isn't how this works at all!")],
          effects: [{type: 'feud', of: 'road-rats', by: 1}, {type: 'scrap', by: 30}, {type: 'roadWord', by: 1},
            mark('trap-broken')],
          next: 'between'},
        lost: {
          lines: [rat("You came all the way round the back to lose your car to us. I'd have taken forty scrap at the front and said thank you.")],
          effects: [{type: 'scrap', by: -60}, mark('lost-to-the-trap')],
          then: 'towed-home', next: 'between'},
      },
    },

    'trap-run': {
      mission: `${ID}/trap-run`, kind: 'outrun', holds: ['checkpoints', 'signs'], minutes: 1,
      enemy: 'road-rats', cars: 2,
      lines: [rat("Come back any time! We're here most days!", {shouted: true})],
      outcomes: {
        away: {effects: [mark('ran-from-the-trap')], next: 'between'},
        caught: {
          lines: [rat("Well, there you are. You could have paid forty and kept your car in one piece. I'll take the forty anyway, and I'll take a little more for the trouble.")],
          effects: [{type: 'scrap', by: -60}, mark('lost-to-the-trap')],
          then: 'towed-home', next: 'between'},
      },
    },

    'trap-passed': {
      // Twenty seconds of two buggies in the mirror, and then an empty road.
      thoughts: ["Two buggies came out from behind that rise as I went by. They were waiting there for whoever stopped."],
      effects: [mark('passed-the-trap')],
      next: 'between',
    },

    // The thread waits here for the director to draw the sign again.
    between: {when: {sign: 'again'}, next: 'sign'},

    // ---- The hauler ----

    'hauler-road': {
      when: {reach: '@hauler', within: 220},
      explore: [
        {id: 'waving', from: 'crest', cue: 'open.scout.seen',
          what: 'A woman beside the truck waves once, and sits down again in its shade.',
          thought: "She waved once and then sat down again in the shade of the truck. Somebody who has been waiting a long time doesn't waste the effort.",
          tells: 'She has been there a long while'},
        {id: 'load', from: 'crest', cue: 'open.scout.seen',
          what: 'A cart behind the truck is stacked with tyres, roped down.',
          thought: "There are tyres roped down on the cart behind that truck, a great stack of them. That's a hauler's load, and it's worth a lot to somebody.",
          tells: 'It is a working truck'},
        {id: 'ground', from: 'verge', cue: 'open.scout.seen',
          what: 'A dark patch of oil under the truck, and tools laid out in a row on a cloth.',
          thought: "There's a dark patch of oil under the truck, and tools laid out in a row on a cloth. Somebody has really been trying to mend it.",
          tells: 'Something is broken'},
        {id: 'doors', from: 'verge', cue: 'open.scout.seen',
          what: 'One door of the truck is blue. The rest of it is red.',
          thought: 'One door of that truck is blue and the rest of it is red. Whoever owns it mends things with whatever turns up.',
          tells: 'Nothing, unless Dot was asked. Then it is Tally for certain'},
        {id: 'tracks', from: 'verge', cue: 'open.scout.seen',
          what: 'A line of footprints goes from the truck to a rise and comes back.',
          thought: "A line of footprints goes off towards the rise and comes back again. I can't tell from here whether she went to look for help or to talk to somebody.",
          tells: 'Nothing for certain. It is there to be doubted'},
        {id: 'behind', from: 'high-ground', cue: 'open.scout.seen',
          what: 'Sand, and one line of footprints.',
          thought: "There's nothing behind the rise except sand and her own footprints. Whoever she is, she really is stuck out here by herself.",
          tells: 'All of it, for certain'},
      ],
      questions: [
        ...CALLS_HOME,
        {id: 'ask-rell', asks: 'rell', words: 'Rell, have your people seen a truck on this road?',
          when: {fact: 'word', of: 'walkers', atLeast: 'Friendly'},
          shows: 'The truck has been there since yesterday',
          lines: [say('rell', "We passed a truck with its bonnet up at noon yesterday. We had nothing to mend it with, so we left the woman a bottle of water. If she's still sitting there today, then her trouble is real.", onRadio)]},
        {id: 'ask-keeper', asks: 'keeper', words: 'Keeper, can you see the truck on this road from your tower?',
          when: {fact: 'made', id: 'tower/crows-step'},
          shows: 'That nobody else is near it',
          lines: [say('keeper', "That truck has been sitting there since yesterday morning. I've watched one woman walk round it about forty times, and nobody else has come near it.", onRadio)]},
      ],
      thoughts: ROAD_THOUGHTS,
      choices: [
        {id: 'stop', act: 'do', words: 'Drive up and stop beside the truck',
          plain: 'The woman who waved',
          thought: "Nobody else is going to stop. I've seen for myself how empty this road is.",
          hidden: 'Tally, and her truck', next: 'hauler'},
        {id: 'drive-past', act: 'do', words: 'Drive past without slowing down',
          plain: 'The open road beyond the truck',
          thought: "I can't mend every truck in the Scablands, and I have a town to get home to.",
          hidden: 'She counts the car as it goes by. She is gone in two days, and she remembers',
          effects: [mark('drove-past-her'), {type: 'word', person: 'tally', set: 'Wary'}],
          next: 'left-on-the-road'},
        {id: 'turn-back', act: 'do', words: 'Turn round and go back the way you came',
          plain: 'The road behind',
          hidden: 'Nothing happens today. She is there tomorrow, and not the day after', next: 'hauler-road'},
      ],
    },

    hauler: {
      when: {reach: '@hauler', within: 40},
      lines: [
        tally("Somebody put the word round that a raised bonnet means Road Rats. It was good advice. It has also kept me sitting here for two days.",
          {when: did('warned-the-road')}),
        tally('You stopped. Four cars have gone past me since yesterday morning, and every one of them speeded up when it saw me.'),
        tally("My name is Tally, and this old thing is Patience. She's called Patience because that's what you need to drive her."),
        tally("The shaft that turns her back wheels has dropped off its bolts. I can lift it into place, or I can do up the bolts. I can't do both, because I only have the two hands."),
        tally("I don't need a part, and I don't need a tow. I need one more person for about as long as it takes to boil an egg."),
      ],
      questions: [
        {id: 'why-nobody', words: 'Why has nobody stopped for you?',
          shows: 'What the trap is, for a player who has never met it',
          lines: [tally("The Road Rats play broken-down on these roads. One of them stands by a raised bonnet, and two more wait behind a hill. So now nobody stops for anybody, and I can't even say that they're wrong.")]},
        {id: 'what-load', words: 'What are you carrying?',
          shows: 'She sells to the Road Rats',
          lines: [tally('I have forty tyres, six sacks of salt and one sack of seed beans. The tyres are for a man called Sump, who has never waited patiently for anything in his life.')]},
        {id: 'sell-to-rats', words: 'Do you really sell tyres to the Road Rats?', needs: ['what-load'],
          shows: 'Who she is',
          lines: [tally("I sell tyres to anybody who has wheels. If I only sold to people I liked, I'd have starved in my first year. I'm not proud of it, and I'm not ashamed of it either.")]},
        {id: 'two-days', words: 'How have you lasted two days out here?',
          shows: 'She is tougher than she looks',
          lines: [tally("Some people on foot left me a bottle of water, and I've been drinking it a capful at a time. Don't look at me like that. I've been thirstier than this, and for longer.")]},
        {id: 'the-rise', words: 'Why did you walk up to that rise?', when: {explored: 'tracks'},
          shows: 'What the footprints were',
          lines: [tally("I went up there to see whether there was a road with anybody on it. There wasn't. Then I came back down and felt sorry for myself, which took most of the afternoon.")]},
      ],
      // The mend is done, not said: hold the wrench on the shaft's bolts for twelve seconds while she lifts.
      mend: {id: `${ID}/drive-shaft`, wrenchSeconds: 12, scrap: 0, cue: 'open.hauler.mended',
        during: [tally("I've got her. Do the top bolt first, and don't be gentle with it.")],
        after: [tally("That's her whole again. Listen to that engine. She sounds dreadful, and she always has, so that's all right.")],
        effects: [{type: 'met', person: 'tally', text: 'You met Tally on the road, when her truck had broken down.'},
          {type: 'word', person: 'tally', set: 'Friendly'},
          {type: 'debt', id: `${ID}/tally-owes`, person: 'tally', text: 'Tally owes you for mending her truck.'},
          mark('helped')]},
      next: 'owing',
    },

    owing: {
      when: {after: 'hauler'},
      lines: [
        tally("I carry the news as well, and I carry it for nothing, because it's the only load that weighs nothing."),
        tally("I don't like owing, and I never have. I pay in goods or in news, whichever you're short of. Where do I find you?"),
        tally("Before you answer, you should know how a hauler works. What I hear at one gate, I tell at the next. That's true at your gate, and it's true at Sump's."),
      ],
      questions: [
        {id: 'if-you-stopped', words: 'What would happen if you stopped selling to Sump?',
          shows: 'What the second answer would cost',
          lines: [tally("He'd ask who told me to, and I'm a poor liar. Then he'd be short of tyres and long on temper, and both of those would be pointed at whoever I named.")]},
      ],
      thoughts: [
        'A hauler at our gate would mean tyres and salt, and news from every road she drives.',
        'She also drives to the Road Rats every month, and she has just told me that she carries news for nothing.',
      ],
      choices: [
        {id: 'gate', act: 'say', words: "Come to Tin Town's gate. We'll buy from you.",
          plain: 'A trader at the gate. She said herself where the news goes',
          thought: 'Whatever she hears at our gate, Sump may hear a week later.',
          hidden: 'The Word on the road rises by one after her first visit. Her truck still passes Sump\'s gate',
          effects: [mark('gate-open')],
          lines: [tally("So you're from Tin Town, where the fire is. I've been meaning to find out whether that was true. Look for me at your gate at first light, and bring your scrap.")],
          next: 'ridge'},
        {id: 'one-gate', act: 'say', words: "Come to Tin Town's gate, but only if you stop selling to the Road Rats.",
          plain: 'A trader at the gate, and a quarrel that she has to carry to Sump',
          thought: "I'm asking her to give up her best customer because of something I said.",
          hidden: 'The Road Rats\' feud rises by one. They are a car short at checkpoints. Her truck no longer passes Sump\'s gate',
          effects: [mark('gate-open'), mark('one-gate-only'), {type: 'feud', of: 'road-rats', by: 1}],
          lines: [tally("Then that's forty tyres a month I have to sell somewhere else. I'll do it, because you stopped when nobody else would. But you've bought yourself a quarrel, and I'm the one who has to deliver it.")],
          next: 'ridge'},
        {id: 'no-debt', act: 'say', words: "You don't owe me anything. Get your load home.",
          plain: 'Nothing changes at Tin Town',
          hidden: 'What she owes stays owed. She asks again the next time she is met on a road',
          lines: [tally("Everybody owes somebody. It's the only thing that keeps these roads open. I'll write it down anyway, and one day you'll be glad that I did.")],
          next: 'ridge'},
      ],
    },

    ridge: {
      when: {after: 'owing'},
      lines: [
        tally("Wait a moment. There's one more thing, and I should have said it before you picked up that wrench."),
        tally("Two buggies have been sitting on that ridge since noon. They're Road Rats, but they aren't here on Sump's business. Sump pays me for tyres. Those two would rather have the tyres and keep the pay."),
        tally("I didn't tell you sooner because I thought you'd drive off. Patience is slow until she's warm. I only need company as far as the crossing, where there are other people on the road."),
      ],
      thoughts: [
        "She kept that back until the truck was mended. I'd probably have kept it back too.",
        "It's two kilometres to the crossing, at the speed of a truck that sounds like that.",
      ],
      choices: [
        {id: 'ride-with-her', act: 'do', words: 'Pull out in front of Patience and ride with her to the crossing',
          plain: 'Two buggies on the ridge. In an act with a clock, it is the day\'s outing',
          thought: 'I stopped for her once already. It would be strange to stop halfway.',
          hidden: 'The escort', next: 'escort'},
        {id: 'own-way', act: 'do', words: 'Drive on your own way',
          plain: 'Your own road, and the day still yours',
          thought: "I mended her truck, and that's what I stopped to do.",
          hidden: 'A named draw decides whether the two buggies take her tyres', next: 'alone'},
      ],
    },

    escort: {
      mission: `${ID}/escort`, kind: 'escort', holds: ['checkpoints', 'signs'], minutes: 4,
      enemy: 'road-rats', cars: 2, truck: 'patience', load: {what: 'tyres', count: 40, lostAtATime: 10},
      lines: [
        tally("Here they come, down off the ridge. They won't shoot at Patience, because they want what she's carrying. Keep them away from the cart.",
          {...onRadio, at: 'buggies-seen'}),
        tally("That's ten of my tyres rolling about in the road. I counted them on, and I can count them off.",
          {...onRadio, at: 'tyres-lost', cue: 'open.tyres.lost'}),
        tally("That one won't be hooking anybody's tyres for a while. There's still the other one.",
          {...onRadio, at: 'buggy-wrecked'}),
        tally("I can see the crossing, and I can see carts on it. They'll turn back now. Rats never rob anybody where it might be watched.",
          {...onRadio, at: 'crossing-seen'}),
      ],
      outcomes: {
        'all-kept': {
          lines: [tally("An hour ago I owed you for one thing, and now I owe you for two. I don't enjoy owing, so you can expect to see a lot of me.")],
          effects: [{type: 'word', person: 'tally', set: 'Sworn'}, mark('load-saved')], next: 'parted'},
        'some-kept': {
          lines: [
            tally('They got some of them, and you kept the rest. This morning I expected to lose every tyre and the truck as well, so I\'m calling this a good day.'),
            tally("An hour ago I owed you for one thing, and now I owe you for two. I don't enjoy owing, so you can expect to see a lot of me."),
          ],
          effects: [{type: 'word', person: 'tally', set: 'Sworn'}, mark('load-saved')], next: 'parted'},
        'none-kept': {
          lines: [tally("They've left me the salt and the beans, because salt is heavy and beans are dull. Don't look so sorry. You stayed, and that's the part I'll remember.")],
          effects: [mark('load-lost')], next: 'parted'},
        'car-wrecked': {
          lines: [tally('Hook your car on behind the cart. Patience has pulled worse things than that, and I did say that I pay what I owe.')],
          effects: [{type: 'settle', id: `${ID}/tally-owes`}, mark('load-lost'), mark('towed-by-patience')],
          next: 'parted'},
      },
    },

    alone: {
      when: {after: 'ridge'},
      // Nothing is seen. She says how it went at the gate, or when she is next met on a road.
      outcomes: {
        robbed: {when: draw('alone', .5), effects: [mark('load-lost')],
          later: [tally("They took the tyres half an hour after you left. I'm not blaming you. You mended my truck, and nobody mended theirs.")],
          next: 'parted'},
        through: {
          later: [tally("Those two followed me for a kilometre and then lost their nerve. I'd like to think it was the look on my face.")],
          next: 'parted'},
      },
    },

    parted: {
      when: {after: ['escort', 'alone']},
      next: [
        {when: {all: [did('gate-open'), did('one-gate-only')]}, to: 'gate', end: 'one-gate-only'},
        {when: did('gate-open'), to: 'gate', end: 'at-the-gate'},
        {to: 'her-own-way'},
      ],
    },

    // At Tin Town's gate, at first light, after the next banked night. From then on she comes every third dawn.
    gate: {
      when: {all: [did('gate-open'), {banked: 1}]},
      cue: 'open.hauler.horn',
      lines: [
        tally("Good morning, Tin Town. I've tyres, salt, seed and parts, and none of it is cheap. I'm not a cheat, though, and those are two different things."),
        tally('The first piece of news is always free. After that, you pay for it with a cup of something hot.'),
        say('auntie-solder', "A trader at my gate, and nobody on fire. I'd forgotten what an ordinary morning was like. Tell her the tea is free if the gossip is good.", onRadio),
      ],
      service: {id: 'trade', by: 'tally', at: 'tin-town-gate', sells: ['parts', 'seed', 'salt', 'wood'],
        price: 'scrap, by the thing; a quarter off at Friendly and half off at Sworn'},
      questions: [
        {id: 'free-news', words: "What's the free piece of news?", when: {cast: 'rumoured'},
          shows: 'A circle on the map where a site is said to be',
          lines: [tally("Here's the free one. There's a place called {rumoured.name} that hardly anybody knows about. I've drawn you where it is, as near as I can, and my drawing is better than my truck.")],
          // The map shows a rumour's circle for the site cast as `rumoured` (section 16).
          rumour: '@rumoured', effects: [mark('told-of-a-site')]},
        {id: 'what-she-saw', words: 'Did you see anything at {burned.name}?', when: {cast: 'burned'},
          shows: 'They were taken alive, and her cart tracks are explained',
          lines: [
            tally("I came through there the morning after, to sell them salt. I saw the tracks of a lot of cars going out one way, and a cart's ruts in the middle of them, with footprints beside it."),
            tally("People who walk beside a cart were alive when they left. I'm sorry about my own tracks in the ash. I had to turn Patience round in it."),
          ],
          effects: [mark('saw-a-camp-in-ashes')]},
        {id: 'rats-road', words: 'Where are the Road Rats working this week?', when: SELLS_TO_RATS,
          shows: 'What her trade with Sump is good for',
          lines: [tally("Sump's people have their raised bonnet out again this week. If you see a truck by the road with doors that match, keep your foot down.")],
          effects: [mark('knows-the-rats-road')]},
      ],
      // Said once each, on a later visit, when its condition is true.
      later: [
        {when: {all: [did('load-saved'), SELLS_TO_RATS]},
          lines: [tally("I told Sump what his two boys got up to on that ridge. He was very shocked. Then he took the price of ten tyres out of their share, so he wasn't as shocked as all that.")]},
        {when: {all: [did('gate-open'), SELLS_TO_RATS]},
          lines: [tally('Sump asked me whether it was true about the fire at Tin Town. I said that it was, because it is. I did tell you how a hauler works.')],
          effects: [{type: 'roadWord', by: 1}, mark('sump-knows-of-the-fire')]},
      ],
    },

    // Lines that tie a consequence back to its choice. Each is said once, by the first person its row names who is
    // there to say it, some nights after its condition became true.
    afterwards: {
      when: 'any-time',
      rows: [
        {id: 'rats-remember-the-payer', by: 'sumps-rider', at: 'the next Road Rats met at a checkpoint',
          when: did('paid-the-trap'),
          lines: [say('sumps-rider', "We know that car. That's the one that stops for a raised bonnet and pays without any fuss. Sump says we're to ask it for fifty this time.")]},
        {id: 'somebody-else-was-robbed', by: 'dot', at: "Dot's diner, or on the radio",
          when: {all: [TRAP_LEFT_STANDING, {fact: 'word', of: 'dot', atLeast: 'Wary'}]},
          lines: [say('dot', "A salt carter walked in here last night with empty pockets and sore feet. He'd stopped for a truck with its bonnet up. You drive that road, don't you? I don't suppose you saw it.")]},
        {id: 'somebody-else-was-robbed-auntie', by: 'auntie-solder', at: 'the hearth',
          when: {all: [TRAP_LEFT_STANDING, {not: {fact: 'word', of: 'dot', atLeast: 'Wary'}}]},
          lines: [say('auntie-solder', "A salt carter came to the gate last night on foot, with nothing left in his pockets. He'd stopped for a truck with its bonnet up. You were out on that road. Did you see it?")]},
        {id: 'tally-on-the-road', by: 'tally', at: 'a road, when her truck passes and is hailed',
          when: {all: [did('helped'), {not: did('gate-open')}]},
          lines: [tally("It's you again. I still have you written down, and it itches. Is there a gate I can pay you at yet?")],
          reopens: 'owing'},
      ],
    },
  },

  ends: ['at-the-gate', 'one-gate-only', 'her-own-way', 'left-on-the-road', 'ambush-survived'],

  // What happens when the sign is never followed.
  ignored: {
    // A trap that nobody goes near stays until the checkpoint rests, and somebody else stops for it. The thread
    // goes on to the hauler's truck all the same.
    trap: {
      what: 'The trap stays on that road until the checkpoint rests. Somebody else stops for it.',
      rows: ['somebody-else-was-robbed', 'somebody-else-was-robbed-auntie'],
      next: 'between',
    },
    hauler: {
      what: 'Tally sits by her truck for two days. On the third some people on foot help her lift the shaft, and she drives on two days late.',
      effects: [mark('never-stopped-for-her')],
      // She is a trader who only drives by from then on. If the car went past her, she is Wary and says so.
      rows: [
        {by: 'tally', at: 'a road, when her truck passes and is hailed', when: did('drove-past-her'),
          lines: [tally('I know that car. It went past me on the road while I was sitting under my truck. I counted it, because I had nothing else to count.')]},
        {by: 'dot', at: "Dot's diner", when: {fact: 'word', of: 'dot', atLeast: 'Wary'},
          lines: [say('dot', "Tally was two days late with my flour. She says she sat by a broken truck and counted the cars going past. She didn't say whose cars they were. She looked as if she could have.")]},
      ],
      // An ambush survived, if the trap was met first; otherwise she was left on the road.
      end: [{when: TRAP_MET, is: 'ambush-survived'}, {is: 'left-on-the-road'}],
    },
  },

  // The sentence the page What people remember shows for each mark.
  marks: {
    [`${ID}/trap-set`]: null,
    [`${ID}/saw-the-trap-first`]: "You saw the Road Rats' trap before it saw you.",
    [`${ID}/warned-the-road`]: "You warned the road about the Road Rats' trap.",
    [`${ID}/paid-the-trap`]: 'You stopped for a trap on the road, and paid the Road Rats to let you go.',
    [`${ID}/trap-broken`]: "You broke the Road Rats' trap on the road.",
    [`${ID}/lost-to-the-trap`]: 'You stopped for a trap on the road, and the Road Rats wrecked your car.',
    [`${ID}/ran-from-the-trap`]: 'You stopped for a trap on the road, and got away from it.',
    [`${ID}/passed-the-trap`]: 'You drove past a truck with its bonnet up, and it was a trap.',
    [`${ID}/drove-past-her`]: 'You drove past a truck with its bonnet up, and it was not a trap.',
    [`${ID}/never-stopped-for-her`]: null,
    [`${ID}/helped`]: 'You stopped for a stranger on the road and mended her truck.',
    [`${ID}/gate-open`]: "You asked Tally to trade at Tin Town's gate.",
    [`${ID}/one-gate-only`]: 'Tally stopped selling tyres to the Road Rats because you asked her to.',
    [`${ID}/load-saved`]: "You rode beside Tally's truck and kept the Road Rats off her load.",
    [`${ID}/load-lost`]: "The Road Rats took Tally's tyres.",
    [`${ID}/towed-by-patience`]: 'Tally towed your car home behind her cart.',
    [`${ID}/told-of-a-site`]: null,
    [`${ID}/saw-a-camp-in-ashes`]: 'Tally told you what she saw at a camp that had been burned.',
    [`${ID}/knows-the-rats-road`]: null,
    [`${ID}/sump-knows-of-the-fire`]: "Sump knows about Tin Town's fire. Tally told him, as she said she would.",
  },
};
