// The runaway: a storyline of the open Scablands, as data (docs/story/open-scablands.md section 18).
// Its page is docs/story/threads/runaway.md, and every line a player reads is here exactly as the page has it.
// Nothing loads this file yet; OPEN-THREADS will. It names no other storyline, and every mark it writes begins with
// its own id. Conditions and effects are those of section 12. The keys are those of "The one shape of a storyline's
// file" (section 18); what the shape has no key for is kept under `notes`.
//
// It keeps to what docs/story/five-cold-nights.md says of Clinker and Old Smoke. Clinker's own boy, who comes to the
// gate on the fifth night, is a different and younger child.
//
// How a beat is written here:
//   when       what makes the beat live: 'sign-seen', {reach: place}, {after: beat} or a fact of section 12
//   lines      what is said, in order: {speaker, words}, with radio: true or low: true, `as` for the name a bubble
//              shows, and `when` for a condition that the line needs
//   thoughts   the player's thought bubbles
//   questions  asking costs nothing: {id, to, words, lines, when, shows}
//   explore    things to find by going up to them: {id, what, thought, tells}
//   mend       one thing mended on the spot
//   choices    {id, by, words, plain, thought, hidden, lines, effects, next}; `hidden` is the writer's note of what
//              is kept out of sight, and no player reads it
//   mission    {id, kind, by, minutes, outing, holds, rule, lines, thoughts, outcomes}; `rule` holds the numbers a
//              builder starts from
//   next       where the beat, a choice or an outcome leads
const ID = 'runaway';
const line = (speaker, words, delivery) => ({speaker, words, ...delivery});
const onRadio = {radio: true};
const low = {low: true};
// The boy's bubble reads "The boy" until he has given the name the Ash Men call him, and "Nat" once he has given his own.
const boy = (words, delivery) => line('slack', words, delivery);
const nat = words => line('slack', words, {as: 'Nat'});
const clinker = words => line('clinker', words);
const auntie = (words, delivery) => line('auntie-solder', words, delivery);
const cinder = (words, delivery) => line('cinder', words, delivery);
const moss = words => line('moss', words);
const rell = words => line('rell', words);
const oldSmoke = words => line('old-smoke', words);
const trader = words => line('trader', words, {as: 'The trader'});
// A mark; `text` is the sentence it shows on What people remember, and is written on the first effect that makes it.
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text === undefined ? {} : {text})});
const has = what => ({fact: 'mark', id: `${ID}/${what}`});
const ashFeud = by => ({type: 'feud', of: 'ash-men', by});
const embers = by => ({type: 'stock', stock: 'embers', by});
const walkersInside = {fact: 'mark', id: 'walkers-inside'};
const walkersFriendly = {fact: 'word', of: 'walkers', atLeast: 'Friendly'};
const LIED = mark('lied-to-clinker', 'You told Clinker that there was no boy in Tin Town.');
const BACK_WAY = 'way/grey-camp-back-way';
// The boy has not been sent out of Tin Town, so he is still there.
const inTinTown = {not: {any: [has('sent-on'), has('sent-alone')]}};

// The drawing in the ash, said at Tin Town's hearth or, for a boy who was driven out, in the dirt at his haven.
const THE_DRAWING = [
  nat('This is the furnace yard, and this is the pen, with banks of ash all the way round it. The gate has two men on it, day and night.'),
  nat('But here, at the back, is the tip where we threw the ash. Nobody watches it, because nobody wants to stand in it. I carried a sack down that tip every day for three years, and I could walk it in the dark.'),
];
const DRAWN = [{type: 'made', id: BACK_WAY}, {type: 'rumour', site: 'grey-camp'},
  mark('drew-the-camp', 'The runaway drew you the Grey Camp in the ash of your own hearth.')];
// The same effects at the haven, where the sentence of the mark is already given.
const DRAWN_AGAIN = [{type: 'made', id: BACK_WAY}, {type: 'rumour', site: 'grey-camp'}, mark('drew-the-camp')];

export default {
  id: ID,
  title: 'The runaway',
  kind: 'stranger',
  reads: ['feud', 'stock', 'word', 'made', 'mark', 'night'],
  writes: ['feud', 'stock', 'word', 'made', 'mark', 'scrap', 'rumour'],

  // Tied to Tin Town, and the boy is always the same boy, so both are named as they are. The haven is whichever
  // Friendly people the player drives him to. It is cast when the player arrives there and not when the storyline
  // starts, and a storyline with no haven to cast still begins: the boy can be hidden, kept, paid for or handed back.
  cast: {
    haven: {from: 'peoples', where: {fact: 'word', atLeast: 'Friendly'}, among: ['walkers', 'deck-folk', 'glasshouse', 'radio-hill', 'bus-ring'],
      optional: true, late: true},
  },

  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .35}]},

  // A stranger who does not come to the gate: he is already inside, and the sign is what he has left out of place.
  sign: {kind: 'stranger', at: 'tin-town', part: 'day'},

  beats: {
    prints: {
      when: 'sign-seen',
      explore: [
        {id: 'footprints', what: 'Small grey footprints lead from the west fence to Bess\'s shed, close together',
          thought: 'These are prints of ash, and they\'re no bigger than mine. Whoever made them was walking on tiptoe.',
          tells: 'A child, from the Ash Men'},
        {id: 'wire', what: 'The bottom wire of the west fence has been lifted and hooked up on a nail',
          thought: 'Somebody small came in under here, and then hooked the wire up neatly again afterwards.',
          tells: 'The way in. Careful, and not a raider'},
        {id: 'bowl', what: 'The washed bowl is upside down on Bess\'s step, drying',
          thought: 'A thief would have kept the bowl, but this one cleaned it and left it where we would find it.',
          tells: 'Not a thief'},
        {id: 'handprint', what: 'A grey handprint is on the shed door, at the height of the player\'s own shoulder',
          thought: "The ash in that print is still loose, so whoever made it hasn't left yet.",
          tells: 'He is inside'},
      ].map(thing => ({...thing, cue: 'open.clue.found'})),
      next: 'shed',
    },

    shed: {
      when: {reach: ['tin-town', 'yard']},
      cue: 'open.runaway.found',
      lines: [
        boy('Don\'t shout. Please don\'t shout. If you shout, the cook will ring the bell, and then everybody will know where I am.', {as: 'The boy'}),
        boy("They call me Slack, and I'm a stoker's boy from the Grey Camp. I mean that I was one, until I ran away two nights ago.", {as: 'The boy'}),
        boy("I only took one bowl of soup, and I washed it afterwards. I'll go as soon as it's dark again, because I only needed somewhere to be that wasn't outside."),
      ],
      thoughts: [
        'He\'s holding that tyre lever like a club, and his hands are shaking so much that he can hardly keep hold of it.',
        'Moss is taking Bess out within the hour. After that there\'ll be nothing in this shed to hide behind.',
        {thought: 'If Clinker comes for him, he\'ll come to our gate, and he won\'t come by himself.', slot: 'before'},
        {thought: 'He carried one hot coal to somebody who was cold. That\'s the very thing that our hearth is for.', slot: 'before'},
      ],
      // A thing to mend on the spot (design section 16).
      mend: {id: `${ID}/west-wire`, wrenchSeconds: 6, scrap: 2,
        effects: [{type: 'scrap', by: -2}, mark('wire-mended', 'You mended the wire that the runaway came in under.')]},
      questions: [
        {id: 'why-run', words: 'Why did you run away?',
          lines: [boy("An old woman on the coal gang was coughing all night at the cold end of the camp, so I carried her one hot coal in a tin. Clinker saw the glow of it. In the Grey Camp, any fire that leaves the furnace counts as stolen, even if it's only one coal.")],
          shows: 'What he did: he shared fire'},
        {id: 'what-happens', words: 'What happens to somebody who does that?', when: {asked: 'why-run'},
          lines: [boy("Clinker makes you watch your coal go out, and then you stand by a cold grate all night while everybody else is warm, so that you learn. I've seen it done to other people, and I didn't wait for it to be done to me.")],
          shows: 'What he ran from. Nobody is hurt at the Grey Camp, and somebody is always cold'},
        {id: 'what-he-does', words: 'What does a stoker\'s boy do?',
          lines: [boy('I carry coal to the furnace and ash away from it, all day and half the night. I know every door in the Grey Camp, because I\'ve carried a sack through each one of them.')],
          shows: 'What he knows'},
        {id: 'will-they-come', words: 'Will they come looking for you?',
          lines: [boy("Clinker will, because he's the stoker and I'm one of the things that he counts. He counts everything that he has, every evening, and he has never once let the number go down.")],
          shows: 'Clinker will come, and soon'},
        {id: 'how-in', words: 'How did you get in here?',
          lines: [boy("I came under your west fence, where the bottom wire is loose, and I hooked it up again behind me. You ought to mend it properly, because I wasn't the first one to find it.")],
          shows: 'A tell: he gives away a weakness for nothing. A thing to mend: the wire'},
        {effects: [mark('asked-his-name', 'You asked the Ash Men\'s runaway what his name was, and he told you.')], id: 'his-name', words: 'Is Slack your real name?',
          lines: [boy("Slack is the dust at the bottom of the coal heap, the part that's no use to anybody. It's what they call you when you're small. My name was Nat before I went grey, and nobody has asked me for it in three years.")],
          shows: 'His name. From this answer on, his bubble reads Nat'},
      ],
      choices: [
        {id: 'hide', words: 'Stay out of sight. I\'ll find you a better place than this to hide.', plain: 'Nobody else knows yet',
          thought: "If nobody knows he's here, then nobody has to lie about him, except me.",
          hidden: 'Hiding him. Clinker comes at dusk.',
          next: 'hiding'},
        {id: 'tell-auntie', words: 'Come with me. Auntie Solder ought to hear this from you.', plain: 'The whole town will know by noon',
          thought: "She'll feed him first and shout afterwards, or at least I think that's the order she'll do it in.",
          hidden: 'The hearth, and then hiding him or not, as the player chooses.',
          next: 'hearth'},
        {id: 'drive-him-out', words: 'You can\'t stay here. Get in the car, and I\'ll take you to somebody who can keep you.', plain: 'The gate, and the road',
          thought: 'Wherever I take him, Clinker\'s trouble goes there with him.',
          hidden: 'The road out, by day. It is the day\'s outing.',
          next: 'road-out'},
      ],
      effects: [mark('found-him', 'You found a boy from the Ash Men hiding in Bess\'s shed.')],
      notes: {
        // Bess's shed is a building. Use the yard until storyline reach can name buildings.
        reach: ['tin-town', 'bess-shed'],
        // The wire is mended on the spot once the question "how-in" has been asked.
        mendOfferedWith: {question: 'how-in'},
      },
    },

    hearth: {
      when: {all: [{reach: ['tin-town', 'hearth']}, {after: 'shed'}]},
      lines: [
        auntie('So this is who washed my bowl. Sit down, child, and stop standing as if somebody were about to hit you. Nobody hits anybody at my hearth.'),
        cinder('I\'ve known Clinker for thirty years, and he has never once let go of anything that he had counted. He\'ll be at our gate by dusk.'),
        auntie("We have two embers, a fence with a hole in it, and now a boy that the Ash Men want back. I'm not complaining about any of it, but I am counting."),
        moss("He folded all the sacks, and I'd keep him for that alone."),
        {...auntie('Whatever you say at that gate tonight, the rest of us will say it too. So think about it before dusk, and not while he\'s standing in front of you.'), slot: 'after'},
      ],
      questions: [
        {id: 'a-spy', words: 'Cinder, could he be a spy?',
          lines: [cinder("He could be, because Old Smoke has sent people to count our lamps before now. But a spy doesn't wash the bowl, and he doesn't tell you where your fence is weak.")],
          shows: 'Probably not a trick'},
        {id: 'what-would-you-do', words: 'Auntie, what would you do?',
          lines: [auntie("I'd feed him, and I already have. What happens after that isn't a cook's question. You found him, so whoever comes to the gate about him is yours to answer.")],
          shows: 'The answer at the gate is the player\'s'},
        {id: 'what-he-wants', words: 'What do you want to happen to you?',
          lines: [boy('I want to be somewhere that Clinker can\'t count me. I don\'t mind where it is. I can carry coal and keep a fire in, and I don\'t eat much.')],
          shows: 'He asks for very little'},
      ],
      effects: [{type: 'mark', id: `${ID}/town-knows`}],
      next: ['hiding', 'road-out', 'gate'],
    },

    // The choice is made by walking him somewhere. Each place has somebody who finds out, and says so in passing.
    hiding: {
      when: {after: 'shed'},
      choices: [
        {id: 'in-the-shed', by: 'go', words: "Leave him in Bess's shed, where he is",
          lines: [moss('I\'m not hiding anybody. I\'m only washing a truck, very slowly, in front of this door.')],
          effects: [{type: 'mark', id: `${ID}/hidden`}, {type: 'mark', id: `${ID}/in-the-shed`}],
          next: 'gate'},
        {id: 'in-the-loft', by: 'go', words: 'Hide him in the loft over the forge',
          lines: [line('odessa', 'There\'s a boy in my loft, and he has sorted my bolts by size. I haven\'t seen him, and I haven\'t seen the bolts either.')],
          effects: [{type: 'mark', id: `${ID}/hidden`}, {type: 'mark', id: `${ID}/in-the-loft`}],
          next: 'gate'},
        {id: 'in-the-woodpile', by: 'go', words: 'Hide him in the woodpile by the kiln',
          lines: [cinder('That woodpile has started breathing. I shan\'t be burning anything from the left-hand end of it for a day or two.')],
          effects: [{type: 'mark', id: `${ID}/hidden`}, {type: 'mark', id: `${ID}/in-the-woodpile`}],
          next: 'gate'},
        {id: 'among-the-walkers', by: 'go', words: 'Hide him among the Walkers', when: walkersInside,
          lines: [rell("Ash washes off, so put a salt coat on him and he's one of mine. I'll count twelve where I used to count eleven.")],
          effects: [{type: 'mark', id: `${ID}/hidden`}, {type: 'mark', id: `${ID}/among-the-walkers`}],
          next: 'gate'},
      ],
      notes: {
        // Where the searchers look for him, first to last; the Walkers' camp is never searched.
        choices: {
          'in-the-shed': {searched: 1},
          'in-the-loft': {searched: 2},
          'in-the-woodpile': {searched: 3},
          'among-the-walkers': {searched: 0,
            questions: [
              {id: 'wim-secret', words: 'Rell, can Wim keep a secret?',
                lines: [rell('Wim says whatever she sees, as you know. I\'ll take her down to the Wash to look for shells until the grey men have gone home.')],
                shows: 'Wim is out of the way. If it is not asked, she speaks at the gate'},
            ]},
        },
      },
    },

    gate: {
      when: {all: [{reach: ['tin-town', 'gate']}, {part: 'dusk'}, {after: 'shed'}]},
      cue: 'story.gate.bell',
      lines: [
        clinker("Good evening, fire-keepers. My count is one short tonight, and the one I'm missing is a grey boy about so high, who answers to Slack."),
        clinker('His prints go under your west wire, and they don\'t come out again. I\'m not here to raid you. I\'m here to fetch what belongs to Old Smoke, and then I shall go home to my supper.'),
        auntie('That man has never once come to this gate to give us anything. Mind what you say to him, because he\'ll remember every word of it.', onRadio),
      ],
      questions: [
        {id: 'if-he-goes-back', words: 'What will happen to him if he goes back?',
          lines: [clinker('He\'ll carry coal, the same as before. He\'ll also stand by a cold grate for one night, to learn what he took from the rest of us. Nobody is ever hurt at the Grey Camp. We are only ever cold.')],
          shows: 'What handing him back means'},
        {id: 'why-one-boy', words: 'Why do you want one small boy so badly?',
          lines: [clinker('Because if one walks out and is kept, then ten walk out. Old Smoke\'s fire needs forty pairs of hands, and I have counted every pair.')],
          shows: 'Why Clinker cannot let it go. Keeping the boy will be answered'},
        {id: 'what-wrong', words: 'What did he do that was so wrong?',
          lines: [clinker("He carried fire out of the furnace and gave it away. It was only one coal, but it's always one coal to begin with, and after that it's a whole town like yours.")],
          shows: 'How Clinker sees Tin Town'},
        {id: 'his-worth', words: 'What is he worth to you?',
          lines: [clinker('Old Smoke doesn\'t sell people. But the furnace is owed four winters of that boy\'s work, and two embers would warm it as well as he would. Put them down here, where I can watch them go out.')],
          shows: 'The price: two embers. It opens the third choice'},
      ],
      thoughts: [
        'If I say that he isn\'t here and Clinker finds him, Clinker will never believe another word that Tin Town says.',
        'If I hand him back, Clinker will go home content, and the boy will spend the night standing by a cold grate.',
        {thought: 'He didn\'t argue, and he didn\'t believe me. He\'ll come back tonight, and he won\'t knock.', slot: 'after', when: {chose: 'no-boy'}},
      ],
      // The first four choices are for when the boy is in Tin Town, and the last three for when he was driven out by
      // day. The player cannot say that there was no boy then, because the prints are there.
      choices: [
        {id: 'no-boy', words: 'There\'s no boy here. Those prints must be somebody else\'s.', when: has('hidden'),
          plain: 'Clinker looks at the fence for a long time',
          thought: 'I\'ve never told a lie to anybody\'s face at this gate before.',
          hidden: 'He does not believe it. The search, tonight.',
          lines: [clinker('Then you won\'t mind if I don\'t believe you. I count very carefully, and my count says that he went under your wire and stayed there. Good night, fire-keepers.')],
          effects: [LIED],
          next: 'search-asked'},
        {id: 'keep', words: 'He\'s here, and he\'s staying. He came to our fire by himself.', when: inTinTown, plain: 'The riders start their engines',
          thought: "Now the Ash Men know, and nobody has had to lie, but they'll be back.",
          hidden: 'The feud rises one step. The boy is safe inside. Nobody searches. In an act with a clock the Ash Men come over the wall a night sooner; out of one, their cars come to fight more often at checkpoints for three banked nights.',
          lines: [
            clinker('So Tin Town keeps what belongs to Old Smoke, and says so at its own gate. We will remember who it was that kept what we had counted.'),
            auntie('Well, that\'s said now, and it can\'t be unsaid. Bring the boy to the hearth. If we\'re to be raided for him, he can at least eat properly first.', onRadio),
          ],
          effects: [ashFeud(1), mark('kept', 'You kept the Ash Men\'s runaway, and you said so to Clinker\'s face.')],
          next: 'kept'},
        {cue: 'story.pot.lump-grey', id: 'pay', words: 'Here are two embers. Count them, and then count him as gone.',
          when: {all: [{asked: 'his-worth'}, {fact: 'stock', of: 'embers', atLeast: 2}, inTinTown]}, plain: 'The count falls by two',
          thought: 'That\'s two nights of the whole town\'s fire, for one boy who doesn\'t eat much.',
          hidden: 'The boy is free and clear, and the feud does not move. Tin Town has shown that it pays.',
          lines: [
            clinker('There, they\'ve both gone grey. The boy is paid for, and I\'ll take him off my count. You see how simple it is, when a town knows how to pay?'),
            auntie('That\'s two embers for a boy who washes bowls. I\'ve made worse bargains than that, and so have you. Don\'t tell Cinder what it cost until I\'ve given her some soup.', onRadio),
          ],
          effects: [embers(-2), mark('paid', 'You paid Clinker two embers for the runaway.')],
          next: 'paid'},
        {id: 'hand-back', words: 'Take him. He\'s yours.', when: inTinTown, plain: 'The boy walks out through the gate',
          hidden: 'The feud cools one step, and never below Watching. What the boy knows goes back with him.',
          lines: [
            boy('It\'s all right. I knew that I\'d have to go back in the end. Thank you for the soup.'),
            clinker('You see? You do understand us. What has been counted goes back to where it was counted. Good night, fire-keepers.'),
            cinder('He\'ll stand by a cold grate tonight, and he\'ll carry coal again tomorrow. I\'m not saying that you were wrong. I\'m only saying what happens next.', low),
          ],
          effects: [ashFeud(-1), mark('handed-back', 'You handed the runaway back to Clinker at your own gate.')],
          next: 'handed-back'},
        {id: 'tell-where', words: 'He was here this morning. I drove him to {haven.name}.', when: has('sent-on'), plain: 'Clinker looks along the road',
          thought: "It's the truth, but I wonder what the truth is going to cost {haven.leader}.",
          hidden: 'Clinker goes there. That people are visited by three cars of Ash Men, and they think one word less of the player.',
          lines: [clinker('Thank you. That is the first useful thing that anybody has said to me today. I shall go and ask them for him, as politely as I have asked you.')],
          effects: [{type: 'word', person: '@haven', by: -1}, mark('told-where', 'You told Clinker where the runaway had gone.')],
          next: 'sent-on'},
        // When nobody would take him.
        {id: 'tell-the-road', words: 'He was here this morning. I left him on the Boneyard road.', when: has('sent-alone'), plain: 'Clinker looks along the road',
          thought: 'It\'s the truth, and it tells Clinker exactly where to look.',
          hidden: 'The riders go down the Boneyard road. The draw for how the road treated him is made at three chances in four of the worse.',
          lines: [clinker('Thank you. A boy on foot on the Boneyard road will not have gone far. That is the first useful thing that anybody has said to me today.')],
          effects: [mark('told-where')],
          next: 'sent-on'},
        {id: 'not-telling', words: 'He was here, and he\'s gone. I\'m not telling you where.', when: {not: inTinTown}, plain: 'The riders start their engines',
          thought: "He can't search the whole of the Scablands, or at least I hope that he can't.",
          hidden: 'The feud rises one step. Nobody is visited.',
          lines: [clinker('Then I shall look everywhere, and I shall begin with the people that you are fond of. We will remember who it was that sent us looking.')],
          effects: [ashFeud(1)],
          next: 'sent-on'},
      ],
      notes: {
        rule: {riderCars: 3, riderCarsWhenRaiding: 5},
        choices: {
          'no-boy': {
            // Among the Walkers, with Wim not taken to the Wash: she speaks, and the choice goes back to keeping him or handing him over.
            wimSpeaks: {when: {all: [has('among-the-walkers')], notAsked: 'wim-secret'},
              lines: [
                line('wim', 'That boy has a salt coat on, but he\'s grey underneath it.'),
                clinker('Thank you, little one. You\'re the first honest person that I\'ve met at this gate.'),
              ],
              effects: [mark('wim-told', 'Clinker heard the truth from Wim after he had heard a lie from you.')],
              thenOnly: ['keep', 'hand-back']},
          },
          'tell-the-road': {drawWorse: {name: 'road-alone', chance: .25}},
        },
      },
    },

    'search-asked': {
      when: {all: [{after: 'gate'}, {part: 'dark'}]},
      // A mission is always asked for plainly.
      lines: [auntie('They\'ll come over the west wall tonight, where the wire was lifted, and they\'ll look in every place that a boy could fit. Will you stay up and keep him ahead of them?')],
      choices: [
        {id: 'stay-up', words: 'I\'ll stay up with him.', next: 'search'},
        {id: 'his-chance', words: 'He\'ll have to take his chance.',
          hidden: 'A named draw, weighted by where he was hidden. The player sleeps through it and hears at dawn.',
          next: 'search-slept'},
      ],
      notes: {
        choices: {'his-chance': {draw: {name: 'search-unwatched', foundChanceBySearchOrder: {0: 0, 1: .9, 2: .6, 3: .4}}}},
      },
    },

    search: {
      mission: {id: `${ID}/the-search`, kind: 'onfoot', by: 'foot', minutes: 4, holds: ['checkpoints', 'signs'],
        rule: {searchers: 2, order: ['in-the-shed', 'in-the-loft', 'in-the-woodpile'], secondsEachPlace: 60, foundAfterSecondsInLamp: 2,
          wireMendedDelaySeconds: 60, whistleSecondsBefore: 20, whistleWhen: walkersFriendly, notSearched: 'among-the-walkers',
          lampCue: 'open.search.lamp', whistleCue: 'night.whistle'},
        lines: [boy('The one with the quick lamp found a cat in a coal sack once, from right across the yard. Don\'t look at where I am, because he watches where people look.', low)],
        outcomes: {
          'not-found': {
            lines: [clinker('My two found nothing, and they are good at finding. So either there\'s no boy, or you hide things better than you fence them. I shall write him down as lost on the road.')],
            effects: [mark('kept-ahead', 'You kept the runaway ahead of Clinker\'s lamps for a whole night.')],
            next: 'hidden',
          },
          found: {next: 'found'},
        },
      },
    },

    // The player slept through the search. Said at dawn.
    'search-slept': {
      mission: {id: `${ID}/slept-through-search`, partOf: `${ID}/the-search`, outcomes: {
        'not-found': {next: 'hidden'},
        found: {effects: [ashFeud(1), mark('found-in-search')], next: 'taken'},
      }},
      when: {all: [{after: 'search-asked'}, {part: 'dawn'}]},
      lines: [
        {...clinker('My two found nothing, and they are good at finding. So either there\'s no boy, or you hide things better than you fence them. I shall write him down as lost on the road.'), when: {not: has('found-in-search')}},
        {...auntie('They found him in the night, and he went back over the wall between the two of them. Clinker called down that this town tells lies. I couldn\'t think of anything to shout back.'), when: has('found-in-search')},
      ],
    },

    found: {
      when: {after: 'search'},
      cue: 'open.search.found',
      // A reason before a fight: Clinker says who they are and why, from the wall, before anything is done.
      lines: [clinker('So there was a boy after all. I asked you politely, and you looked me in the face and lied. We will remember that this town tells lies.')],
      choices: [
        {id: 'stand-aside', by: 'do', words: 'Stand aside', plain: 'The boy climbs the wall between the two of them',
          hidden: 'The feud rises one step, for the lie.',
          lines: [boy('Don\'t fight them for me. They\'d only come back with more, and then it would be your lamps.')],
          effects: [ashFeud(1), mark('found-in-search', 'Clinker\'s searchers found the boy that you said was not there.')],
          next: 'taken'},
        {id: 'stand-in-front', by: 'do', words: 'Stand in front of him', plain: 'Two searchers, and two more coming over the wall',
          hidden: 'A fight on foot with the brand and the Hand Flamer, as in the raid. Fire turns them, and when two are driven out the rest go. The feud rises two steps.',
          lines: [clinker('You would burn my people over one coal boy? Then you\'re keeping a fire for him after all. That is exactly how it begins.')],
          effects: [ashFeud(2), mark('found-in-search'),
            mark('fought-for-him', 'You fought Clinker\'s people for the runaway.')],
          next: 'wall-fight'},
      ],
    },

    'wall-fight': {
      mission: {id: `${ID}/the-wall-fight`, kind: 'defend', by: 'foot', minutes: 2, holds: ['checkpoints', 'signs'],
        rule: {searchers: 4, searchersWhenRaiding: 6, drivenOutEndsIt: 2, weapons: ['brand', 'hand-flamer']},
        outcomes: {won: {next: 'kept'}, lost: {next: 'taken'}},
      },
    },

    'road-out': {
      when: {all: [{after: 'shed'}, {part: 'day'}]},
      lines: [
        auntie("That's a kind thing to do, but it's the gas run that pays for it. Bess stays in her shed today, so tonight we'll burn an ember, and there won't be a new one baked to take its place.", onRadio),
        // A reason before a fight: he says who is on the road, and why, before the gate opens.
        boy('Clinker\'s riders will be sitting where the roads leave your town. They look into every car when somebody has run. If they see me, they\'ll want me back, and they won\'t ask you twice.'),
      ],
      // Where he can go. The player chooses by driving there, and a people is on the map as a haven only while its
      // word is Friendly or better. The Walkers are a haven only while they are camped outside the fence.
      mission: {id: `${ID}/the-road-out`, kind: 'reach', by: 'car', minutes: 3, outing: true, holds: ['checkpoints', 'signs'],
        rule: {riderCarsAtFirstFork: 2, lookedIntoWithinMetres: 60, lookedIntoAfterSeconds: 8, ashGreyCarSeconds: 16,
          boxedSeconds: 6, seenCue: 'open.riders.seen'},
        outcomes: {
          // The haven is the people he is driven to; what each says is in the beat "arrived".
          walkers: {cast: {haven: 'walkers'}, next: 'arrived'},
          'deck-folk': {cast: {haven: 'deck-folk'}, next: 'arrived'},
          // Any found camp whose people are Friendly.
          glasshouse: {cast: {haven: 'glasshouse'}, next: 'arrived'},
          'radio-hill': {cast: {haven: 'radio-hill'}, next: 'arrived'},
          'bus-ring': {cast: {haven: 'bus-ring'}, next: 'arrived'},
          // No people is Friendly: the Boneyard road, with a blanket and a loaf. How the road treats him is a named
          // draw, said later by a trader. These effects stand in for those of "arrived". Clinker still comes to the gate
          // at dusk.
          nobody: {
            lines: [boy('I\'ll follow the road until it stops. Roads always go somewhere, don\'t they? That\'s what they\'re for.')],
            effects: [mark('sent-alone', 'You drove the runaway to the Boneyard road and left him there with a blanket.')],
            next: 'gate',
          },
          // The riders look into the car and surround it.
          surrounded: {next: 'surrounded'},
        },
      },
      notes: {
        havens: {
          walkers: {unless: walkersInside},
          nobody: {draw: {name: 'road-alone', chance: .5, worseBy: 'the Ash Men\'s feud'}},
        },
      },
    },

    // He is driven to a haven: its leader says what is said there, and then the boy says goodbye.
    arrived: {
      lines: [
        {...rell('You\'ve brought me a stoker\'s boy? We\'ve no fire for him to stoke, so he\'ll have to learn to rake salt. But he walks quietly and he washes bowls. I\'ve taken on worse.'), when: {cast: 'haven', is: 'walkers'}},
        {...line('captain-imre', 'The Deck Folk can always use another hand, and he need never go ashore again. He will be entered in the log under whatever name he chooses. We have nothing to report.'), when: {cast: 'haven', is: 'deck-folk'}},
        {...line('{haven.leader}', 'He can stay, if he works. We\'ve nothing here that the grey men want, and we\'d like to keep it that way. He\'s to keep his head down whenever there\'s dust on the road.'),
          when: {all: [{not: {cast: 'haven', is: 'walkers'}}, {not: {cast: 'haven', is: 'deck-folk'}}]}},
        boy('Nobody has ever driven me anywhere before, because I always walked, with a sack on my back. Thank you for the lift, and for the soup.'),
        {...boy('And thank you for asking what my name was. I\'d nearly forgotten that I had one.'), when: has('asked-his-name')},
      ],
      effects: [mark('sent-on', 'You drove the runaway out of Tin Town to {haven.name}.')],
      next: 'gate',
    },

    // The riders have the car boxed in on the road.
    surrounded: {
      lines: [clinker('Hand the boy down to me, and then you can drive home with all four of your wheels.')],
      choices: [
        {id: 'open-the-door', by: 'do', words: 'Open the door',
          effects: [mark('taken-on-the-road', 'Clinker\'s riders took the runaway out of your car.')],
          next: 'taken'},
        {id: 'break-out', by: 'do', words: 'Try to break out',
          hidden: 'A second minute against four riders. Win, and the drive goes on with the feud one step higher. Lose, and the car is wrecked, the boy is taken, and the player is towed home.'},
      ],
      notes: {
        choices: {
          'break-out': {
            won: [ashFeud(1)],
            lost: [mark('taken-on-the-road', 'Clinker\'s riders took the runaway out of your car.')],
            lostNext: 'taken',
          },
        },
      },
    },

    // The first morning after he is safe at Tin Town: kept in the open, paid for, or hidden through the search.
    'what-he-leaves': {
      when: {all: [
        {after: ['gate', 'wall-fight', 'found', 'search', 'search-slept']}, {after: ['kept', 'paid', 'hidden']},
        {reach: ['tin-town', 'hearth']}, {part: 'dawn'},
      ]},
      lines: [
        {...auntie('I\'m not shouting "Slack" across my own hearth. It sounds like something that has gone wrong with a rope. What did your mother call you?'), when: {not: has('asked-his-name')}},
        {...boy('She called me Nat. Nobody has asked me that since I went grey.'), when: {not: has('asked-his-name')}},
        {...auntie('The driver tells me that your name is Nat. Then it\'s Nat at this hearth, and I\'ll hear no more about coal dust.'), when: has('asked-his-name')},
        ...THE_DRAWING,
        cinder('He banks a kiln better than I do, and I\'ve no intention of telling him so. He can stay at my fire for as long as he likes.'),
      ],
      cue: 'open.ash.drawn',
      effects: DRAWN,
      // The storyline's end stays what the gate made it.
      next: [{when: {ended: 'paid'}, to: 'paid'}, {when: {ended: 'hidden'}, to: 'hidden'}, {to: 'kept'}],
    },

    // A boy who was driven to a haven makes the same drawing there, in the dirt, on the player's next visit.
    'drawn-at-the-haven': {
      when: {all: [{after: ['gate', 'arrived']}, {after: 'sent-on'}, {reach: '@haven'}, {not: {fact: 'made', id: BACK_WAY}}]},
      lines: THE_DRAWING,
      cue: 'open.ash.drawn',
      effects: DRAWN_AGAIN,
      next: 'sent-on',
    },
  },

  ends: ['kept', 'paid', 'hidden', 'handed-back', 'sent-on', 'taken', 'gone'],

  // What happens when the prints are never followed: at dark he goes back under the wire by himself.
  ignored: {
    when: {part: 'dark'},
    effects: [mark('left', 'A boy hid in Tin Town for a day, and left again before anybody spoke to him.')],
    next: 'gone',
  },

  // Said later by somebody who knows, each only when its fact is true.
  later: [
    {id: 'price-up', by: 'clinker', when: has('paid'),
      lines: [clinker("You paid two embers for a coal boy without even arguing, so I've put my prices up for Tin Town. It seemed only fair to the furnace.")]},
    {id: 'who-told', by: '{haven.leader}', when: has('told-where'),
      lines: [line('{haven.leader}', 'Three cars of grey men came here asking for the boy, and they knew exactly whose door to knock on. He hid, and they left. I\'d like to know who told them.')]},
    {id: 'road-was-kind', by: 'traders', when: {all: [has('sent-alone'), {fact: 'draw', name: 'road-alone', chance: .5}]},
      lines: [trader('I gave a grey boy a ride as far as the Rail Halt last week. He washed my windscreen without being asked. He said that somebody in Tin Town had given him a blanket.')]},
    {id: 'road-was-not-kind', by: 'traders', when: {all: [has('sent-alone'), {not: {fact: 'draw', name: 'road-alone', chance: .5}}]},
      lines: [trader('I saw the Ash Men stop a boy on the Boneyard road last week. He had a Tin Town blanket round his shoulders. They let him keep the blanket.')]},
    // What Old Smoke says of it when he says the player's own story back, one line by the ending.
    {id: 'smoke-kept', by: 'old-smoke', when: has('kept'),
      lines: [oldSmoke('You kept my coal boy, and you told Clinker so to his face. Nobody has said no to Clinker\'s face in years. He hasn\'t stopped talking about it since.')]},
    {id: 'smoke-lied', by: 'old-smoke', when: {all: [has('lied-to-clinker'), {not: has('found-in-search')}]},
      lines: [oldSmoke('My stoker lost a boy under your wire, and you told him that there was no boy. I keep fire, and you keep secrets. I couldn\'t tell you which of us is the warmer for it.')]},
    {id: 'smoke-found', by: 'old-smoke', when: has('found-in-search'),
      lines: [oldSmoke("You lied to my stoker's face, and then my people found the boy behind your lie, so your town tells lies. Tell me why I should believe one word that you say to me tonight.")]},
    {id: 'smoke-paid', by: 'old-smoke', when: has('paid'),
      lines: [oldSmoke('You paid two embers for a boy who was worth less than one. I let both of them go grey, and I still think that I had the better of the bargain.')]},
    {id: 'smoke-handed-back', by: 'old-smoke', when: has('handed-back'),
      lines: [oldSmoke('You gave my boy back when you were asked for him. That was correct. What is mine comes back to me, and you knew it without being told.')]},
    {id: 'smoke-sent-on', by: 'old-smoke', when: {any: [has('sent-on'), has('sent-alone')]},
      lines: [oldSmoke('You sent my boy down the road to somebody else\'s fire, so that the trouble would be theirs and not yours. I\'ve done the same with trouble all my life.')]},
    // While the boy is in Tin Town.
    {id: 'clinker-on-the-bridge', by: 'clinker', when: {any: [has('hidden'), has('town-knows')]},
      lines: [clinker('A boy of mine went under somebody\'s wire two nights ago. If it was your wire, I shall be at your gate by dusk. You might think about that while you drive.')]},
    {id: 'raiders-lamp-order', by: 'slack', when: {any: [has('kept'), has('paid'), has('kept-ahead')]},
      lines: [nat('They\'ll go for the pump lamp next, and after that the forge yard. It\'s always the same order, because Clinker made us learn it.')]},
    {id: 'clinkers-own-boy', by: 'slack', when: {any: [has('kept'), has('paid'), has('kept-ahead')]},
      lines: [nat('That\'s Clinker\'s own boy. He isn\'t lying to you. He has never been allowed to say enough words at once to make a lie out of them.')]},
    {id: 'at-the-gate-same-dusk', by: 'clinker', when: {all: [has('left'), {part: 'dusk'}]}, at: ['tin-town', 'gate'],
      lines: [clinker('His prints go under your wire, and then they come out again, so he took your soup and went on. You were lucky, fire-keepers. Good night.')]},
    {id: 'bowl-washer-caught', by: 'auntie-solder', when: has('left'), at: ['tin-town', 'hearth'],
      lines: [auntie('A trader tells me that the Ash Men caught a runaway boy on the Boneyard road. That will be the one who washed my bowl. I\'d have given him a second bowl, if he had only knocked.')]},
  ],

  notes: {
    // The haven is cast when the player arrives there.
    haven: {castWhen: 'the player arrives'},
    // The sign is the boy's leaving things out of place; it stands for a day, and two of the town say so in passing.
    sign: {
      lastsDays: 1,
      lines: [
        {at: 'bess-shed', ...moss('Somebody slept in Bess\'s shed last night. Whoever it was folded the sacks up afterwards, which is more than I ever do.')},
        {at: 'hearth', ...auntie('Somebody had a bowl of my soup in the night, and then washed the bowl. Nobody in this town has ever washed a bowl without being told to.')},
      ],
    },
    // Where the writer said each row of `later` is heard.
    later: {
      'price-up': 'the next time Clinker names a price for anything',
      'who-told': 'the next visit to the people who took him in',
      'road-was-kind': 'a trader, some nights later, when nobody would take him and the road was kind',
      'road-was-not-kind': 'a trader, some nights later, when nobody would take him and the road was not kind',
      'smoke-kept': 'when Old Smoke says the player\'s story back',
      'smoke-lied': 'when Old Smoke says the player\'s story back',
      'smoke-found': 'when Old Smoke says the player\'s story back',
      'smoke-paid': 'when Old Smoke says the player\'s story back',
      'smoke-handed-back': 'when Old Smoke says the player\'s story back',
      'smoke-sent-on': 'when Old Smoke says the player\'s story back',
      'clinker-on-the-bridge': 'when Clinker is met on the Girder Bridge before he has come to the gate',
      'raiders-lamp-order': 'when raiders come over the wall for the lamps',
      'clinkers-own-boy': 'when Clinker\'s own boy comes to the gate',
      'at-the-gate-same-dusk': 'at the gate, at dusk the same day',
      'bowl-washer-caught': 'at the hearth, some nights later',
    },
    laterExtras: {'smoke-found': {fourFiresNeeded: true}},
  },
};
