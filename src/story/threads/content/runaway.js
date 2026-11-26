// The runaway: a storyline of the open Scablands, as data (docs/story/open-scablands.md section 18).
// Its page is docs/story/threads/runaway.md, and every line a player reads is here exactly as the page has it.
// Nothing loads this file yet; OPEN-THREADS will. It names no other storyline, and every mark it writes begins with
// its own id. Conditions and effects are those of section 12.
//
// It keeps to what docs/story/five-cold-nights.md says of Clinker and Old Smoke. Clinker's own boy, who comes to the
// gate on the fifth night, is a different and younger child.
//
// How a beat is written here:
//   when       what makes the beat live: 'sign-seen', {reach: place}, {after: beat} or a fact of section 12
//   lines      what is said, in order: {speaker, words}, with radio: true or low: true, `as` for the name a bubble
//              shows, and `when` for a fact that the line needs
//   thoughts   the player's thought bubbles
//   questions  asking costs nothing: {id, words, lines, shows}; `needs` lists facts, or questions already asked
//   explore    things to find by going up to them: {id, what, thought, tells}
//   choices    {id, words (said) or does (done), plain, thought, hidden, effects, next}; `hidden` is the writer's
//              note of what is kept out of sight, and no player reads it
//   mission    the id of a job, with its `holds` and its `outcomes` on the beat, as section 18 has them; `job` holds
//              the step kind and the numbers a builder starts from
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
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, text});
const has = what => ({fact: 'mark', id: `${ID}/${what}`});
const to = beat => ({type: 'thread', id: ID, to: beat});
const end = name => ({type: 'thread', id: ID, end: name});
const ashFeud = by => ({type: 'feud', of: 'ash-men', by});
const embers = by => ({type: 'stock', stock: 'embers', by});
const walkersInside = {fact: 'mark', id: 'walkers-inside'};
const walkersFriendly = {fact: 'word', of: 'walkers', atLeast: 'Friendly'};
const LIED = mark('lied-to-clinker', 'You told Clinker that there was no boy in Tin Town.');
const BACK_WAY = 'way/grey-camp-back-way';

// The drawing in the ash, said at Tin Town's hearth or, for a boy who was driven out, in the dirt at his haven.
const THE_DRAWING = [
  nat('This is the furnace yard, and this is the pen, with banks of ash all the way round it. The gate has two men on it, day and night.'),
  nat('But here, at the back, is the tip where we threw the ash. Nobody watches it, because nobody wants to stand in it. I carried a sack down that tip every day for three years, and I could walk it in the dark.'),
];
const DRAWN = [{type: 'made', id: BACK_WAY}, {type: 'mark', id: 'rumour/grey-camp'},
  mark('drew-the-camp', 'The runaway drew you the Grey Camp in the ash of your own hearth.')];

export default {
  id: ID,
  title: 'The runaway',
  kind: 'stranger',
  reads: ['feud', 'stock', 'word', 'made', 'mark', 'night'],
  writes: ['feud', 'stock', 'word', 'made', 'mark', 'scrap'],

  cast: {
    // Tied to Tin Town, and the boy is always the same boy, so both are named as they are. The haven is whichever
    // Friendly people the player drives him to. It is cast when the player arrives there and not when the storyline
    // starts, and a storyline with no haven to cast still begins: the boy can be hidden, kept, paid for or handed back.
    haven: {from: 'peoples', where: {fact: 'word', atLeast: 'Friendly'}, among: ['walkers', 'deck-folk', 'glasshouse', 'radio-hill', 'bus-ring'],
      castWhen: 'the player arrives', optional: true},
  },

  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .35}]},

  // A stranger who does not come to the gate: he is already inside, and the sign is what he has left out of place.
  sign: {kind: 'stranger', at: 'tin-town', part: 'day', lastsDays: 1,
    lines: [
      {at: 'bess-shed', ...moss('Somebody slept in Bess\'s shed last night. Whoever it was folded the sacks up afterwards, which is more than I ever do.')},
      {at: 'hearth', ...auntie('Somebody had a bowl of my soup in the night, and then washed the bowl. Nobody in this town has ever washed a bowl without being told to.')},
    ]},

  beats: {
    prints: {
      when: 'sign-seen',
      explore: [
        {id: 'footprints', what: 'Small grey footprints lead from the west fence to Bess\'s shed, close together',
          thought: 'These are prints of ash, and they\'re no bigger than mine. Whoever made them was walking on tiptoe.',
          tells: 'A child, from the Ash Men'},
        {id: 'wire', what: 'The bottom wire of the west fence has been lifted and hooked up on a nail',
          thought: 'Somebody small came in under here, and then hooked the wire up neatly behind them.',
          tells: 'The way in. Careful, and not a raider'},
        {id: 'bowl', what: 'The washed bowl is upside down on Bess\'s step, drying',
          thought: 'A thief would have kept the bowl. This one cleaned it and left it where we would find it.',
          tells: 'Not a thief'},
        {id: 'handprint', what: 'A grey handprint is on the shed door, at the height of the player\'s own shoulder',
          thought: 'The ash in that print is still loose. Whoever made it hasn\'t left.',
          tells: 'He is inside'},
      ].map(thing => ({...thing, cue: 'open.clue.found'})),
      next: 'shed',
    },

    shed: {
      when: {reach: 'tin-town', at: 'bess-shed'},
      cue: 'open.runaway.found',
      lines: [
        boy('Don\'t shout. Please don\'t shout. If you shout, the cook will ring the bell, and then everybody will know where I am.', {as: 'The boy'}),
        boy('They call me Slack. I\'m a stoker\'s boy from the Grey Camp. I mean that I was one, until two nights ago.', {as: 'The boy'}),
        boy('I only took one bowl of soup, and I washed it. I\'ll go as soon as it\'s dark again. I only needed to be somewhere that wasn\'t outside.'),
      ],
      thoughts: [
        'He\'s holding that tyre lever like a club, and his hands are shaking so much that he can hardly keep hold of it.',
        'Moss is taking Bess out within the hour. After that there\'ll be nothing in this shed to hide behind.',
      ],
      questions: [
        {id: 'why-run', words: 'Why did you run away?',
          lines: [boy('An old woman on the coal gang was coughing all night at the cold end of the camp, so I carried her one hot coal in a tin. Clinker saw the glow. Fire that leaves the furnace is stolen, even one coal.')],
          shows: 'What he did: he shared fire'},
        {id: 'what-happens', words: 'What happens to somebody who does that?', needs: ['why-run'],
          lines: [boy('Clinker makes you watch your coal go out. Then you stand by a cold grate all night while everybody else is warm, so that you learn. I\'ve seen it done. I didn\'t wait to have it done to me.')],
          shows: 'What he ran from. Nobody is hurt at the Grey Camp, and somebody is always cold'},
        {id: 'what-he-does', words: 'What does a stoker\'s boy do?',
          lines: [boy('I carry coal to the furnace and ash away from it, all day and half the night. I know every door in the Grey Camp, because I\'ve carried a sack through each one of them.')],
          shows: 'What he knows'},
        {id: 'will-they-come', words: 'Will they come looking for you?',
          lines: [boy('Clinker will. He\'s the stoker, and I\'m his to count. He counts everything that he has, every evening, and he has never once let the number go down.')],
          shows: 'Clinker will come, and soon'},
        {id: 'how-in', words: 'How did you get in here?',
          lines: [boy('I came under your west fence, where the bottom wire is loose. I hooked it up again behind me. You ought to mend it properly, because I wasn\'t the first one to find it.')],
          shows: 'A tell: he gives away a weakness for nothing. A thing to mend: the wire',
          // A thing to mend on the spot (design section 16).
          need: {id: `${ID}/west-wire`, kind: 'mend', wrenchSeconds: 6, scrap: 2,
            gives: [{type: 'scrap', by: -2}, mark('wire-mended', 'You mended the wire that the runaway came in under.')]}},
        {id: 'his-name', words: 'Is Slack your real name?',
          lines: [boy('Slack is the dust at the bottom of the coal heap, the part that\'s no use to anybody. It\'s what they call you when you\'re small. My name was Nat, before I went grey. Nobody has asked me for it in three years.')],
          shows: 'His name. From this answer on, his bubble reads Nat',
          effects: [mark('asked-his-name', 'You asked the Ash Men\'s runaway what his name was, and he told you.')]},
      ],
      choices: [
        {id: 'hide', words: 'Stay out of sight. I\'ll find you a better place than this to hide.', plain: 'Nobody else knows yet',
          thought: 'If nobody knows, then nobody has to lie about him. Nobody except me.',
          hidden: 'Hiding him. Clinker comes at dusk.',
          effects: [to('hiding')]},
        {id: 'tell-auntie', words: 'Come with me. Auntie Solder ought to hear this from you.', plain: 'The whole town will know by noon',
          thought: 'She\'ll feed him first and shout afterwards. At least, I think that\'s the order.',
          hidden: 'The hearth, and then hiding him or not, as the player chooses.',
          effects: [to('hearth')]},
        {id: 'drive-him-out', words: 'You can\'t stay here. Get in the car, and I\'ll take you to somebody who can keep you.', plain: 'The gate, and the road',
          thought: 'Wherever I take him, Clinker\'s trouble goes there with him.',
          hidden: 'The road out, by day. It is the day\'s outing.',
          effects: [to('road-out')]},
      ],
      // The two thoughts that come before the choice.
      before: {thoughts: [
        'If Clinker comes for him, he\'ll come to our gate, and he won\'t come by himself.',
        'He carried one hot coal to somebody who was cold. That\'s the very thing that our hearth is for.',
      ]},
      effects: [mark('found-him', 'You found a boy from the Ash Men hiding in Bess\'s shed.')],
    },

    hearth: {
      when: {reach: 'tin-town', at: 'hearth', after: 'shed'},
      lines: [
        auntie('So this is who washed my bowl. Sit down, child, and stop standing as if somebody were about to hit you. Nobody hits anybody at my hearth.'),
        cinder('I\'ve known Clinker for thirty years, and he has never once let go of anything that he had counted. He\'ll be at our gate by dusk.'),
        auntie('We have two embers, a fence with a hole in it, and now a boy that the Ash Men want back. I\'m not complaining. I\'m only counting.'),
        moss('He folded the sacks. I\'d keep him for that alone.'),
      ],
      questions: [
        {id: 'a-spy', words: 'Cinder, could he be a spy?',
          lines: [cinder('He could be. Old Smoke has sent people to count our lamps before now. But a spy doesn\'t wash the bowl, and he doesn\'t tell you where your fence is weak.')],
          shows: 'Probably not a trick'},
        {id: 'what-would-you-do', words: 'Auntie, what would you do?',
          lines: [auntie('I\'d feed him, and I have. After that it isn\'t a cook\'s question. You carried the fire in, so whoever comes to the gate about him is yours to answer.')],
          shows: 'The answer at the gate is the player\'s'},
        {id: 'what-he-wants', words: 'What do you want to happen to you?',
          lines: [boy('I want to be somewhere that Clinker can\'t count me. I don\'t mind where it is. I can carry coal and keep a fire in, and I don\'t eat much.')],
          shows: 'He asks for very little'},
      ],
      closing: [auntie('Whatever you say at that gate tonight, the rest of us will say it too. So think about it before dusk, and not while he\'s standing in front of you.')],
      // The player may hide him, leave him at the hearth in plain sight, or drive him out.
      effects: [{type: 'mark', id: `${ID}/town-knows`}],
      next: ['hiding', 'road-out', 'gate'],
    },

    // The choice is made by walking him somewhere. Each place has somebody who finds out, and says so in passing.
    hiding: {
      when: {after: 'shed'},
      choices: [
        {id: 'in-the-shed', does: 'Bess\'s shed, where he is', searched: 1,
          lines: [moss('I\'m not hiding anybody. I\'m only washing a truck, very slowly, in front of this door.')]},
        {id: 'in-the-loft', does: 'The loft over the forge', searched: 2,
          lines: [line('odessa', 'There\'s a boy in my loft, and he has sorted my bolts by size. I haven\'t seen him, and I haven\'t seen the bolts either.')]},
        {id: 'in-the-woodpile', does: 'The woodpile by the kiln', searched: 3,
          lines: [cinder('That woodpile has started breathing. I shan\'t be burning anything from the left-hand end of it for a day or two.')]},
        {id: 'among-the-walkers', does: 'Among the Walkers', needs: [walkersInside], searched: 0,
          lines: [rell('Ash washes off. Put a salt coat on him and he\'s one of mine, and I\'ll count twelve where I used to count eleven.')],
          questions: [
            {id: 'wim-secret', words: 'Rell, can Wim keep a secret?',
              lines: [rell('Wim says whatever she sees, as you know. I\'ll take her down to the Wash to look for shells until the grey men have gone home.')],
              shows: 'Wim is out of the way. If it is not asked, she speaks at the gate'},
          ]},
      ].map(place => ({...place, effects: [{type: 'mark', id: `${ID}/hidden`}, {type: 'mark', id: `${ID}/${place.id}`}, to('gate')]})),
    },

    gate: {
      when: {reach: 'tin-town', at: 'gate', part: 'dusk', after: 'shed'},
      cue: 'story.gate.bell',
      rule: {riderCars: 3, riderCarsWhenRaiding: 5},
      lines: [
        clinker('Good evening, fire-keepers. My count is one short tonight. He\'s a boy, grey, about so high, and he answers to Slack.'),
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
          lines: [clinker('He carried fire out of the furnace and gave it away. It was one coal. It\'s always one coal to begin with, and after that it\'s a town like yours.')],
          shows: 'How Clinker sees Tin Town'},
        {id: 'his-worth', words: 'What is he worth to you?',
          lines: [clinker('Old Smoke doesn\'t sell people. But the furnace is owed four winters of that boy\'s work, and two embers would warm it as well as he would. Put them down here, where I can watch them go out.')],
          shows: 'The price: two embers. It opens the third choice'},
      ],
      thoughts: [
        'If I say that he isn\'t here and Clinker finds him, Clinker will never believe another word that Tin Town says.',
        'If I hand him back, Clinker goes home content. I wonder what the boy will be thinking about tomorrow night, beside a cold grate.',
      ],
      // When the boy is in Tin Town.
      choices: [
        {id: 'no-boy', words: 'There\'s no boy here. Those prints must be somebody else\'s.', needs: [has('hidden')],
          plain: 'Clinker looks at the fence for a long time',
          thought: 'I\'ve never told a lie to anybody\'s face at this gate before.',
          hidden: 'He does not believe it. The search, tonight.',
          lines: [clinker('Then you won\'t mind if I don\'t believe you. I count very carefully, and my count says that he went under your wire and stayed there. Good night, fire-keepers.')],
          after: {thought: 'He didn\'t argue, and he didn\'t believe me. He\'ll come back tonight, and he won\'t knock.'},
          // Among the Walkers, with Wim not taken to the Wash: she speaks, and the choice goes back to keeping him or handing him over.
          wimSpeaks: {when: {all: [has('among-the-walkers')], notAsked: 'wim-secret'},
            lines: [
              line('wim', 'That boy has a salt coat on, but he\'s grey underneath it.'),
              clinker('Thank you, little one. You\'re the first honest person that I\'ve met at this gate.'),
            ],
            effects: [mark('wim-told', 'Clinker heard the truth from Wim after he had heard a lie from you.')],
            thenOnly: ['keep', 'hand-back']},
          effects: [LIED, to('search-asked')]},
        {id: 'keep', words: 'He\'s here, and he\'s staying. He came to our fire by himself.', plain: 'The riders start their engines',
          thought: 'Now they know, and nobody has had to lie. They\'ll also be back.',
          hidden: 'The feud rises one step. The boy is safe inside. Nobody searches. In an act with a clock the Ash Men come over the wall a night sooner; out of one, their cars come to fight more often at checkpoints for three banked nights.',
          lines: [
            clinker('So Tin Town keeps what belongs to Old Smoke, and says so at its own gate. We will remember who it was that kept what we had counted.'),
            auntie('Well, that\'s said now, and it can\'t be unsaid. Bring the boy to the hearth. If we\'re to be raided for him, he can at least eat properly first.', onRadio),
          ],
          effects: [ashFeud(1), mark('kept', 'You kept the Ash Men\'s runaway, and you said so to Clinker\'s face.'), end('kept')]},
        {id: 'pay', words: 'Here are two embers. Count them, and then count him as gone.',
          needs: ['his-worth', {fact: 'stock', of: 'embers', atLeast: 2}], plain: 'The count falls by two',
          thought: 'That\'s two nights of the whole town\'s fire, for one boy who doesn\'t eat much.',
          hidden: 'The boy is free and clear, and the feud does not move. Tin Town has shown that it pays.',
          cue: 'story.pot.lump-grey',
          lines: [
            clinker('There, they\'ve both gone grey. The boy is paid for, and I\'ll take him off my count. You see how simple it is, when a town knows how to pay?'),
            auntie('That\'s two embers for a boy who washes bowls. I\'ve made worse bargains than that, and so have you. Don\'t tell Cinder what it cost until I\'ve given her some soup.', onRadio),
          ],
          effects: [embers(-2), mark('paid', 'You paid Clinker two embers for the runaway.'), end('paid')]},
        {id: 'hand-back', words: 'Take him. He\'s yours.', plain: 'The boy walks out through the gate',
          hidden: 'The feud cools one step, and never below Watching. What the boy knows goes back with him.',
          lines: [
            boy('It\'s all right. I knew that I\'d have to go back in the end. Thank you for the soup.'),
            clinker('You see? You do understand us. What has been counted goes back to where it was counted. Good night, fire-keepers.'),
            cinder('He\'ll stand by a cold grate tonight, and he\'ll carry coal again tomorrow. I\'m not saying that you were wrong. I\'m only saying what happens next.', low),
          ],
          effects: [ashFeud(-1), mark('handed-back', 'You handed the runaway back to Clinker at your own gate.'), end('handed-back')]},
      ],
      // When the boy was driven out by day. The player cannot say that there was no boy, because the prints are there.
      choicesWhenSentOn: [
        {id: 'tell-where', words: 'He was here this morning. I drove him to {haven.name}.', needs: [has('sent-on')], plain: 'Clinker looks along the road',
          thought: 'It\'s the truth. I wonder what the truth is going to cost {haven.leader}.',
          hidden: 'Clinker goes there. That people are visited by three cars of Ash Men, and they think one word less of the player.',
          lines: [clinker('Thank you. That is the first useful thing that anybody has said to me today. I shall go and ask them for him, as politely as I have asked you.')],
          effects: [{type: 'word', person: '@haven', by: -1}, mark('told-where', 'You told Clinker where the runaway had gone.'), end('sent-on')]},
        // When nobody would take him.
        {id: 'tell-the-road', words: 'He was here this morning. I left him on the Boneyard road.', needs: [has('sent-alone')], plain: 'Clinker looks along the road',
          thought: 'It\'s the truth, and it tells Clinker exactly where to look.',
          hidden: 'The riders go down the Boneyard road. The draw for how the road treated him is made at three chances in four of the worse.',
          lines: [clinker('Thank you. A boy on foot on the Boneyard road will not have gone far. That is the first useful thing that anybody has said to me today.')],
          drawWorse: {name: 'road-alone', chance: .25},
          effects: [mark('told-where', 'You told Clinker where the runaway had gone.'), end('sent-on')]},
        {id: 'not-telling', words: 'He was here, and he\'s gone. I\'m not telling you where.', plain: 'The riders start their engines',
          thought: 'He can\'t search the whole of the Scablands. I hope that he can\'t.',
          hidden: 'The feud rises one step. Nobody is visited.',
          lines: [clinker('Then I shall look everywhere, and I shall begin with the people that you are fond of. We will remember who it was that sent us looking.')],
          effects: [ashFeud(1), end('sent-on')]},
      ],
    },

    'search-asked': {
      when: {after: 'gate', part: 'dark'},
      // A mission is always asked for plainly.
      lines: [auntie('They\'ll come over the west wall tonight, where the wire was lifted, and they\'ll look in every place that a boy could fit. Will you stay up and keep him ahead of them?')],
      choices: [
        {id: 'stay-up', words: 'I\'ll stay up with him.', effects: [to('search')]},
        {id: 'his-chance', words: 'He\'ll have to take his chance.',
          hidden: 'A named draw, weighted by where he was hidden. The player sleeps through it and hears at dawn.',
          draw: {name: 'search-unwatched', foundChanceBySearchOrder: {0: 0, 1: .9, 2: .6, 3: .4}},
          effects: [to('search-slept')]},
      ],
    },

    search: {
      mission: `${ID}/the-search`, holds: ['checkpoints', 'signs'],
      job: {kind: 'onfoot', by: 'foot', minutes: 4,
        rule: {searchers: 2, order: ['in-the-shed', 'in-the-loft', 'in-the-woodpile'], secondsEachPlace: 60, foundAfterSecondsInLamp: 2,
          wireMendedDelaySeconds: 60, whistleSecondsBefore: 20, whistleWhen: walkersFriendly, notSearched: 'among-the-walkers',
          lampCue: 'open.search.lamp', whistleCue: 'night.whistle'},
        lines: [boy('The one with the quick lamp found a cat in a coal sack once, from right across the yard. Don\'t look at where I am, because he watches where people look.', low)],
      },
      outcomes: {
        'not-found': {
          lines: [clinker('My two found nothing, and they are good at finding. So either there\'s no boy, or you hide things better than you fence them. I shall write him down as lost on the road.')],
          effects: [mark('kept-ahead', 'You kept the runaway ahead of Clinker\'s lamps for a whole night.'), end('hidden')],
        },
        found: {effects: [to('found')]},
      },
    },

    // The player slept through the search. Said at dawn.
    'search-slept': {
      when: {after: 'search-asked', part: 'day'},
      lines: [
        {...clinker('My two found nothing, and they are good at finding. So either there\'s no boy, or you hide things better than you fence them. I shall write him down as lost on the road.'), when: {not: has('found-in-search')}},
        {...auntie('They found him in the night, and he went back over the wall between the two of them. Clinker called down that this town tells lies. I couldn\'t think of anything to shout back.'), when: has('found-in-search')},
      ],
      outcomes: {
        'not-found': {effects: [end('hidden')]},
        found: {effects: [ashFeud(1), mark('found-in-search', 'Clinker\'s searchers found the boy that you said was not there.'), end('taken')]},
      },
    },

    found: {
      when: {after: 'search'},
      cue: 'open.search.found',
      // A reason before a fight: Clinker says who they are and why, from the wall, before anything is done.
      lines: [clinker('So there was a boy after all. I asked you politely, and you looked me in the face and lied. We will remember that this town tells lies.')],
      choices: [
        {id: 'stand-aside', does: 'Stand aside', plain: 'The boy climbs the wall between the two of them',
          hidden: 'The feud rises one step, for the lie.',
          lines: [boy('Don\'t fight them for me. They\'d only come back with more, and then it would be your lamps.')],
          effects: [ashFeud(1), mark('found-in-search', 'Clinker\'s searchers found the boy that you said was not there.'), end('taken')]},
        {id: 'stand-in-front', does: 'Stand in front of him', plain: 'Two searchers, and two more coming over the wall',
          hidden: 'A fight on foot with the brand and the Hand Flamer, as in the raid. Fire turns them, and when two are driven out the rest go. The feud rises two steps.',
          lines: [clinker('You would burn my people over one coal boy? Then you\'re keeping a fire for him after all. That is exactly how it begins.')],
          effects: [ashFeud(2), mark('found-in-search', 'Clinker\'s searchers found the boy that you said was not there.'),
            mark('fought-for-him', 'You fought Clinker\'s people for the runaway.'), to('wall-fight')]},
      ],
    },

    'wall-fight': {
      mission: `${ID}/the-wall-fight`, holds: ['checkpoints', 'signs'],
      job: {kind: 'defend', by: 'foot', minutes: 2,
        rule: {searchers: 4, searchersWhenRaiding: 6, drivenOutEndsIt: 2, weapons: ['brand', 'hand-flamer']},
      },
      outcomes: {won: {effects: [end('kept')]}, lost: {effects: [end('taken')]}},
    },

    'road-out': {
      when: {after: 'shed', part: 'day'},
      lines: [
        auntie('That\'s a kind thing to do, and it\'s the gas run that pays for it. Bess stays in her shed today, and tonight burns an ember that nobody has baked.', onRadio),
        // A reason before a fight: he says who is on the road, and why, before the gate opens.
        boy('Clinker\'s riders will be sitting where the roads leave your town. They look into every car when somebody has run. If they see me, they\'ll want me back, and they won\'t ask you twice.'),
      ],
      mission: `${ID}/the-road-out`, holds: ['checkpoints', 'signs'],
      job: {kind: 'reach', by: 'car', minutes: 3, outing: true,
        rule: {riderCarsAtFirstFork: 2, lookedIntoWithinMetres: 60, lookedIntoAfterSeconds: 8, ashGreyCarSeconds: 16,
          boxedSeconds: 6, seenCue: 'open.riders.seen'},
        // Where he can go. The player chooses by driving there, and a people is on the map as a haven only while its
        // word is Friendly or better. The Walkers are a haven only while they are camped outside the fence.
        havens: {
          walkers: {unless: walkersInside,
            lines: [rell('You\'ve brought me a stoker\'s boy? We\'ve no fire for him to stoke, so he\'ll have to learn to rake salt. But he walks quietly and he washes bowls. I\'ve taken on worse.')]},
          'deck-folk': {
            lines: [line('captain-imre', 'The Deck Folk can always use another hand, and he need never go ashore again. He will be entered in the log under whatever name he chooses. We have nothing to report.')]},
          // Any found camp whose people are Friendly.
          otherwise: {
            lines: [line('{haven.leader}', 'He can stay, if he works. We\'ve nothing here that the grey men want, and we\'d like to keep it that way. He\'s to keep his head down whenever there\'s dust on the road.')]},
          // No people is Friendly: the Boneyard road, with a blanket and a loaf. How the road treats him is a named
          // draw, said later by a trader.
          nobody: {
            lines: [boy('I\'ll follow the road until it stops. Roads always go somewhere, don\'t they? That\'s what they\'re for.')],
            draw: {name: 'road-alone', chance: .5, worseBy: 'the Ash Men\'s feud'},
            // These stand in for the effects of `arrived` below. Clinker still comes to the gate at dusk.
            effects: [mark('sent-alone', 'You drove the runaway to the Boneyard road and left him there with a blanket.'), to('gate')]},
      },
      surround: {
        lines: [clinker('Hand the boy down to me. Then you can drive home with all four of your wheels.')],
        choices: [
          {id: 'open-the-door', does: 'Open the door',
            effects: [mark('taken-on-the-road', 'Clinker\'s riders took the runaway out of your car.'), end('taken')]},
          {id: 'break-out', does: 'Try to break out',
            hidden: 'A second minute against four riders. Win, and the drive goes on with the feud one step higher. Lose, and the car is wrecked, the boy is taken, and the player is towed home.',
            won: [ashFeud(1)],
            lost: [mark('taken-on-the-road', 'Clinker\'s riders took the runaway out of your car.'), end('taken')]},
        ],
      },
      },
      outcomes: {
        arrived: {
          lines: [
            boy('Nobody ever drove me anywhere before. I always walked, with a sack on my back. Thank you for the lift, and for the soup.'),
            {...boy('And thank you for asking what my name was. I\'d nearly forgotten that I had one.'), when: has('asked-his-name')},
          ],
          effects: [mark('sent-on', 'You drove the runaway out of Tin Town to {haven.name}.'), to('gate')],
        },
      },
    },

    // The first morning after he is safe at Tin Town: kept in the open, paid for, or hidden through the search.
    'what-he-leaves': {
      when: {reach: 'tin-town', at: 'hearth', part: 'day', afterBankedNight: true, any: [has('kept'), has('paid'), has('kept-ahead')]},
      lines: [
        {...auntie('I\'m not shouting "Slack" across my own hearth. It sounds like something that has gone wrong with a rope. What did your mother call you?'), when: {not: has('asked-his-name')}},
        {...boy('She called me Nat. Nobody has asked me that since I went grey.'), when: {not: has('asked-his-name')}},
        {...auntie('The driver tells me that your name is Nat. Then it\'s Nat at this hearth, and I\'ll hear no more about coal dust.'), when: has('asked-his-name')},
        ...THE_DRAWING,
        cinder('He banks a kiln better than I do, and I\'ve no intention of telling him so. He can stay at my fire for as long as he likes.'),
      ],
      cue: 'open.ash.drawn',
      effects: DRAWN,
    },

    // A boy who was driven to a haven makes the same drawing there, in the dirt, on the player's next visit.
    'drawn-at-the-haven': {
      when: {reach: '@haven', afterBankedNight: true, all: [has('sent-on'), {not: has('taken-on-the-road')}, {not: {fact: 'made', id: BACK_WAY}}]},
      lines: THE_DRAWING,
      cue: 'open.ash.drawn',
      effects: DRAWN,
    },
  },

  // Said later by somebody who knows, each only when its fact is true.
  tiedBack: [
    {when: has('paid'), where: 'the next time Clinker names a price for anything',
      lines: [clinker('You paid two embers for a coal boy without even arguing. So I\'ve put my prices up for Tin Town. It seemed only fair to the furnace.')]},
    {when: has('told-where'), where: 'the next visit to the people who took him in',
      lines: [line('{haven.leader}', 'Three cars of grey men came here asking for the boy, and they knew exactly whose door to knock on. He hid, and they left. I\'d like to know who told them.')]},
    {when: {all: [has('sent-alone'), {fact: 'draw', name: 'road-alone', chance: .5}]}, where: 'a trader, some nights later, when nobody would take him and the road was kind',
      lines: [trader('I gave a grey boy a ride as far as the Rail Halt last week. He washed my windscreen without being asked. He said that somebody in Tin Town had given him a blanket.')]},
    {when: {all: [has('sent-alone'), {not: {fact: 'draw', name: 'road-alone', chance: .5}}]}, where: 'a trader, some nights later, when nobody would take him and the road was not kind',
      lines: [trader('I saw the Ash Men stop a boy on the Boneyard road last week. He had a Tin Town blanket round his shoulders. They let him keep the blanket.')]},
    // What Old Smoke says of it when he says the player's own story back, one line by the ending.
    {when: has('kept'), where: 'when Old Smoke says the player\'s story back',
      lines: [oldSmoke('You kept my coal boy, and you told Clinker so to his face. Nobody has said no to Clinker\'s face in years. He hasn\'t stopped talking about it since.')]},
    {when: {all: [has('lied-to-clinker'), {not: has('found-in-search')}]}, where: 'when Old Smoke says the player\'s story back',
      lines: [oldSmoke('My stoker lost a boy under your wire, and you told him that there was no boy. I keep fire, and you keep secrets. I couldn\'t tell you which of us is the warmer for it.')]},
    {when: has('found-in-search'), where: 'when Old Smoke says the player\'s story back', fourFiresNeeded: true,
      lines: [oldSmoke('You lied to my stoker\'s face, and then my people found the boy behind your lie. So your town tells lies. Tell me why I should believe one word that you say to me tonight.')]},
    {when: has('paid'), where: 'when Old Smoke says the player\'s story back',
      lines: [oldSmoke('You paid two embers for a boy who was worth less than one. I let both of them go grey, and I still think that I had the better of the bargain.')]},
    {when: has('handed-back'), where: 'when Old Smoke says the player\'s story back',
      lines: [oldSmoke('You gave my boy back when you were asked for him. That was correct. What is mine comes back to me, and you knew it without being told.')]},
    {when: {any: [has('sent-on'), has('sent-alone')]}, where: 'when Old Smoke says the player\'s story back',
      lines: [oldSmoke('You sent my boy down the road to somebody else\'s fire, so that the trouble would be theirs and not yours. I\'ve done the same with trouble all my life.')]},
    // While the boy is in Tin Town.
    {when: {any: [has('hidden'), has('town-knows')]}, where: 'when Clinker is met on the Girder Bridge before he has come to the gate',
      lines: [clinker('A boy of mine went under somebody\'s wire two nights ago. If it was your wire, I shall be at your gate by dusk. You might think about that while you drive.')]},
    {when: {any: [has('kept'), has('paid'), has('kept-ahead')]}, where: 'when raiders come over the wall for the lamps',
      lines: [nat('They\'ll go for the pump lamp next, and after that the forge yard. It\'s always the same order, because Clinker made us learn it.')]},
    {when: {any: [has('kept'), has('paid'), has('kept-ahead')]}, where: 'when Clinker\'s own boy comes to the gate',
      lines: [nat('That\'s Clinker\'s own boy. He isn\'t lying to you. He has never been allowed to say enough words at once to make a lie out of them.')]},
  ],

  ends: ['kept', 'paid', 'hidden', 'handed-back', 'sent-on', 'taken', 'gone'],

  // What happens when the prints are never followed: at dark he goes back under the wire by himself.
  ignored: {
    after: {days: 1},
    effects: [mark('left', 'A boy hid in Tin Town for a day, and left again before anybody spoke to him.'), end('gone')],
    later: [
      {by: 'clinker', where: 'at the gate, at dusk the same day',
        lines: [clinker('His prints go under your wire, and then they come out again. So he took your soup and went on. You were lucky, fire-keepers. Good night.')]},
      {by: 'auntie-solder', where: 'at the hearth, some nights later',
        lines: [auntie('A trader tells me that the Ash Men caught a runaway boy on the Boneyard road. That will be the one who washed my bowl. I\'d have given him a second bowl, if he had only knocked.')]},
    ],
  },
};
