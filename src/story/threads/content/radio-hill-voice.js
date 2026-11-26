// The voice on Radio Hill: a storyline of the open Scablands, as data (docs/story/open-scablands.md section 18).
// Its page is docs/story/threads/radio-hill-voice.md, and every line a player reads is here exactly as the page has it.
// Nothing loads this file yet; OPEN-THREADS will. It names no other storyline, and every mark it writes begins with
// its own id. Conditions and effects are those of section 12. The keys are those of "The one shape of a storyline's
// file" (section 18); what the shape has no key for is kept under `notes`.
//
// How a beat is written here:
//   when       what makes the beat live: 'sign-seen', {reach: place}, {after: beat} or a fact of section 12
//   lines      what is said, in order: {speaker, words}, with radio: true for the car's radio. `as` is the name a
//              bubble shows while the player does not know who is speaking, and `when` a condition that the line needs
//   thoughts   the player's thought bubbles
//   questions  asking costs nothing: {id, to, words, lines, when, shows}
//   explore    things to find by going up to them: {id, what, thought, tells}
//   choices    {id, by, words, plain, thought, hidden, lines, effects, next}; `hidden` is the writer's note of what
//              is kept out of sight, and no player reads it
//   mission    {id, kind, by, minutes, outing, holds, rule, lines, outcomes}; `rule` holds the numbers a builder
//              starts from
//   next       where the beat or the choice leads
const ID = 'radio-hill-voice';
const line = (speaker, words, delivery) => ({speaker, words, ...delivery});
const onRadio = {radio: true};
const hetty = words => line('hetty', words, onRadio);
const hettyHere = words => line('hetty', words);
const bern = words => line('bern', words);
const parrot = words => line('parrot', words, onRadio);
const parrotHere = words => line('parrot', words);
const firstVoice = words => line('hetty', words, {radio: true, as: 'A voice'});
const secondVoice = words => line('parrot', words, {radio: true, as: 'A second voice'});
const you = words => line('you', words);
// A mark; `text` is the sentence it shows on What people remember, and is written on the first effect that makes it.
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text === undefined ? {} : {text})});
const ratsFeud = by => ({type: 'feud', of: 'road-rats', by});
const sisters = change => ({type: 'word', person: 'radio-hill', ...change});
const tested = mark('tested', 'You tested the two voices before you believed either of them.');
const ratsAtWar = {fact: 'feud', of: 'road-rats', atLeast: 'Raiding'};
const notAtWar = {not: ratsAtWar};
// Parrot has her set until it is taken or the peace is made. She cuts in on the climb only for a driver who has not
// already driven out of her Pocket.
const parrotHasSet = {not: {any: [{fact: 'mark', id: `${ID}/took-the-set`}, {fact: 'mark', id: `${ID}/two-voices`}]}};
const parrotCutsIn = {all: [parrotHasSet, {not: {fact: 'mark', id: `${ID}/drove-out`}}]};

export default {
  id: ID,
  title: 'The voice on Radio Hill',
  kind: 'find',
  reads: ['found', 'word', 'feud', 'made', 'scrap', 'night', 'mark'],
  writes: ['find', 'word', 'feud', 'made', 'mark', 'scrap', 'promise', 'settle', 'roadWord', 'rumour'],

  // The storyline is tied to Radio Hill and the Pocket, so it names them where it needs them and casts nothing.
  cast: {},

  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .5}]},

  // The call comes only where the hill can see the car, so that what Hetty says she sees is true.
  sign: {kind: 'call', at: 'radio-hill', part: 'dark', lastsNights: 3, cue: 'open.radio.voice'},

  beats: {
    'first-call': {
      when: 'sign-seen',
      lines: [
        // By a named draw the second voice opens the night, and Hetty's call cuts across it.
        {...secondVoice('This is Radio Hill, calling anybody who can hear us. If you can hear me, tell me where you are, and I\'ll guide you in to a fire and a hot meal.'),
          when: {fact: 'draw', name: 'who-calls-first', chance: .5}},
        firstVoice('This is Radio Hill, calling the car with two lamps on the road below us. I can see your lamps from where I\'m sitting. If you can hear me, stop your car where it is, and then I\'ll know.'),
      ],
      thoughts: [
        'Nobody in Tin Town has ever told me about a place called Radio Hill.',
        'Whoever she is, she can see me, and I can\'t see her.',
      ],
      choices: [
        {id: 'stop', by: 'do', words: 'Stop the car', plain: 'A dark road, and nobody on it',
          thought: 'If I stop, somebody out in the dark knows exactly where I am.',
          hidden: 'She answers at once, and she watches for this car from now on.',
          lines: [
            firstVoice('You\'ve stopped! Bern, come and look, the car has stopped.'),
            hetty('My name is Hetty, and my sister and I keep the mast up here. We have the news of every road, and the kettle is on. Look for a red lamp that blinks, high up, and turn your car toward it.'),
          ],
          effects: [mark('stopped-for-hetty', 'You stopped your car on a dark road because a voice asked you to.')],
          next: 'second-voice'},
        {id: 'drive-on', by: 'do', words: 'Keep driving', plain: 'The road ahead',
          thought: 'I\'m not stopping on a dark road because a stranger tells me to.',
          hidden: 'She gives her name all the same. Nothing is lost.',
          lines: [hetty('You didn\'t stop. Well, I wouldn\'t stop for a stranger either. I\'m Hetty, and the red lamp that blinks, high up, is ours. I\'ll be on the air again tomorrow night, in case you change your mind.')],
          next: 'second-voice'},
      ],
      notes: {
        // The line the second voice opens the night with carries this cue.
        lineCue: {secondVoiceOpensTheNight: 'open.radio.second-voice'},
        choices: {stop: {stoppedSeconds: 3}},
      },
    },

    'second-voice': {
      when: {all: [{after: 'first-call'}, {seconds: 20, since: 'first-call'}]},
      cue: 'open.radio.second-voice',
      lines: [
        secondVoice('This is Radio Hill, calling the car on the road. Take no notice of that other station, driver. There are people about tonight who copy our voice to lead cars off the road.'),
        secondVoice('The real hill is the other way, where you\'ll see a white lamp held steady. Come quickly, and tell me where you are now, so that I can guide you in.'),
        hetty('Who is that on my set? I have said those words every night for eleven years, and that is not me saying them.'),
        secondVoice('Do you hear how well she does it, driver? She even sounds cross. Please be careful which of us you believe.'),
        line('keeper', 'I can see both of those lamps from up here. The red one is on a mast, on top of a mesa. The white one is on a pole, and the pole keeps moving about.',
          {radio: true, as: 'The keeper', when: {fact: 'made', id: 'tower/crows-step'}}),
      ],
      thoughts: [
        'There are two of them now, and each one says that the other is lying.',
        'One of them said that she could see my lamps. I don\'t think both of them can.',
        {thought: 'That didn\'t sound like wind. It sounded like an engine ticking over.', when: {asked: 'what-noise'}},
      ],
      // Each test is put to both voices, and both answer.
      questions: [
        {id: 'what-can-you-see', words: 'What can you see from where you are?',
          lines: [
            hetty('I can see the road with you on it, and the glow of your town\'s hearth. I can also see three sets of lamps standing still among the wrecks near that white lamp, and they haven\'t moved all evening.'),
            secondVoice('I can see the whole land from up here, driver. What I can see most clearly is that you\'re wasting time.'),
          ],
          shows: 'The first voice names things that are really there. Three cars are waiting near the white lamp'},
        {id: 'what-colour', words: 'What colour is my car?',
          lines: [
            hetty('I can\'t tell you that, because it\'s dark and you\'re a long way off. I can tell you that your left lamp is dimmer than your right one.'),
            secondVoice('It\'s a very fine car, driver, and that\'s all I need to know. There\'s no time for games tonight.'),
          ],
          shows: 'One of them can see the lamps, and says plainly what she cannot see'},
        {id: 'blink', words: 'Blink your lamp three times for me.',
          lines: [
            hetty('There you are, that was three. Bern says that if I do it again the bulb will go, and it\'s the only one we have.'),
            secondVoice('Ours isn\'t the blinking kind of lamp, driver. A steady light is an honest light.'),
          ],
          shows: 'The red lamp goes dark and then blinks three times. The white lamp does not change. Seen only from ground where both lamps are in view'},
        {id: 'what-noise', words: 'What\'s that noise behind you?',
          lines: [
            hetty('That\'s our generator. It has coughed like that ever since the dust storm, and Bern says it wants a new filter.'),
            secondVoice('That\'s only the wind in the mast, driver.'),
          ],
          shows: 'A hill does not have an engine'},
        {id: 'who-else', words: 'Who else is up there with you?',
          lines: [
            hetty('There\'s only my sister Bern, who mends things. She\'s holding a coil of wire and shaking her head at me.'),
            secondVoice('There\'s a whole friendly camp of us here, with a fire, hot food and room for your car.'),
          ],
          shows: 'The second voice offers more than a hilltop could hold'},
        // Calling home.
        {id: 'ask-auntie', words: 'Auntie, is there a place called Radio Hill?',
          lines: [line('auntie-solder', 'There was a mast on one of the mesas when I was a girl, and it played dance music on Saturdays. I\'d no idea that anybody was still up there. I do know that nobody ever built a mast in a scrap heap.', onRadio)],
          shows: 'A mast stands on high ground'},
        {id: 'ask-cinder', words: 'Cinder, would the Ash Men use a radio?',
          lines: [line('cinder', 'Old Smoke says that a radio is a small fire that talks, so he won\'t have one near him. The Road Rats would use one, though. They\'ll use anything that they can unbolt from a truck.', onRadio)],
          shows: 'Who the liar probably is'},
        {id: 'ask-moss', words: 'Moss, what\'s out there, where that white lamp is?',
          lines: [line('moss', 'There\'s nothing out that way but wrecks stacked in rows, with one way in and no way out. I wouldn\'t take Bess in among them, and I wouldn\'t take your car in either.', onRadio)],
          shows: 'The ground the second bearing leads to'},
        {id: 'ask-rell', words: 'Rell, have your people seen a red lamp at night?',
          when: {fact: 'word', of: 'walkers', atLeast: 'Friendly'},
          lines: [line('rell', 'We carry no radio, but we\'ve walked under that red lamp. Two women live up there, and one of them waved to us for an hour. Nobody waves for an hour if she means you harm.', onRadio)],
          shows: 'The red lamp, vouched for by somebody who has seen it'},
      ],
      // The decision is made by going somewhere.
      choices: [
        {id: 'to-the-red-lamp', by: 'go', words: 'Drive toward the red lamp', plain: 'A red lamp, high up, that blinks',
          thought: 'A lamp on top of a hill is where a mast ought to be.', hidden: 'The foot of the ramp.',
          next: 'ramp'},
        {id: 'to-the-white-lamp', by: 'go', words: 'Drive toward the white lamp', plain: 'A white lamp, low down, held steady',
          thought: 'She did tell me to come quickly.', hidden: 'The Pocket.',
          next: 'pocket'},
        {id: 'home', by: 'go', words: 'Drive home and bank the hearth', plain: 'The road home',
          thought: 'Neither of them is going anywhere tonight, and I can think better by the hearth.',
          hidden: 'Both call again tomorrow night. Nothing is lost by sleeping on it, until the fourth night.'},
      ],
      effects: [mark('heard-two-voices', 'You heard two voices on the radio, and each of them said it was Radio Hill.')],
      notes: {
        // What asking a question makes or says beyond its words: the shape's question has no effects or cue.
        questions: {
          'what-can-you-see': {effects: [tested]},
          'what-colour': {effects: [tested]},
          blink: {cue: 'open.lamp.blink', effects: [tested]},
          'what-noise': {effects: [tested]},
          'who-else': {effects: [tested]},
        },
      },
    },

    ramp: {
      when: {all: [{reach: ['radio-hill', 'ramp-foot']}, {part: 'dark'}]},
      lines: [hetty('The only way up is the ramp, and it has no lamps on it and no wall. I\'ll talk you up it, if you\'ll trust me to. Will you come up?')],
      thoughts: ['I can\'t see the edge of that ramp at all. She says that she can.'],
      choices: [
        {id: 'talk-me-up', words: 'Talk me up. I\'m coming.', plain: 'A dark ramp and a long drop',
          thought: 'If she\'s the liar, this is exactly where she would want me.',
          hidden: 'The climb. A driver who comes up in the dark on Hetty\'s word is Friendly from the first cup.',
          next: 'climb'},
        {id: 'by-day', words: 'I won\'t climb it tonight. I\'ll come back when I can see the edge.', plain: 'The road home',
          hidden: 'By day the ramp is plain and safe, and climbing it is no mission. The sisters are Strangers, as they are for anybody who finds them.'},
      ],
    },

    climb: {
      mission: {id: `${ID}/climb`, kind: 'reach', by: 'car', minutes: 3, holds: ['checkpoints', 'signs'],
        // Starting numbers. Every radio line on the climb is shown under the one label, so that the words tell the voices apart.
        rule: {lampsShowMetres: 12, callSecondsBeforeTurn: 4, easyBrakeSeconds: 2, label: 'The radio', cutInCue: 'open.radio.cut-in'},
        lines: [
          hetty('Driver, the way up starts at the white rock on your left. Take it slowly. I can see your lamps all the way, so I\'ll tell you what\'s coming before you reach it.'),
          hetty('There\'s a bend to your right in a moment, with no wall on the outside of it. Keep close in to the rock.'),
          {...parrot('Keep left here, driver, well out to the left. The rock on your right has fallen away.'), when: parrotCutsIn},
          {...hetty('That wasn\'t me! Keep right, close to the rock. Your left lamp is shining out over nothing at all.'), when: parrotCutsIn},
          {...hetty('Keep to the right here, close to the rock. There\'s nothing on your left but air.'), when: {not: parrotCutsIn}},
          hetty('Now stop where you are. The ledge in front of you is broken, and your lamps won\'t show you the hole until you\'re in it.'),
          hetty('Turn hard to your left and come up the inside. Bern cut that way with a pick, and she\'s very proud of it.'),
          {...parrot('You\'re nearly at the top. Put your foot down for the last rise, or you\'ll roll all the way back.'), when: parrotCutsIn},
          hetty('Please go slowly now. The top is flat for two car lengths, and after that there isn\'t any more top.'),
          hetty('That\'s it, you\'re up. Turn your lamps off before you blind my sister. Welcome to Radio Hill.'),
        ],
        outcomes: {
          up: {
            lines: [
              hettyHere('You trusted a voice you couldn\'t see, all the way up a cliff in the dark. I\'d like to say that I\'d have done the same, but I don\'t think I would have.'),
              bern('She talked you up, and I cut the road. I\'d like that remembered as well.'),
            ],
            effects: [{type: 'find', site: 'radio-hill'}, sisters({set: 'Friendly'}),
              mark('talked-up', 'Hetty talked you up the ramp in the dark, and you did everything she said.')],
            next: 'other-voice',
          },
          'over-the-edge': {
            lines: [
              bern('That\'s the third car that the other voice has put off our ramp this year. You\'re the first driver who was coming to see us, so I\'ll winch you up for nothing.'),
              hettyHere('I\'m so sorry, driver. I said right, and she said left, and you had no way of knowing which of us was which.'),
            ],
            effects: [{type: 'find', site: 'radio-hill'},
              mark('off-the-ramp', 'The other voice put your car off the ramp at Radio Hill.')],
            next: 'other-voice',
          },
        },
      },
      notes: {
        // The place on the climb where each line of the mission is said, in the order of its `lines`. `false` marks the
        // lines that Parrot says to put the car off the ramp.
        lineMoments: [
          {at: 'ramp-foot'},
          {at: 'bend-1'},
          {at: 'bend-2', false: true},
          {at: 'bend-2'},
          {at: 'bend-2'},
          {at: 'broken-ledge'},
          {at: 'broken-ledge'},
          {at: 'last-rise', false: true},
          {at: 'last-rise'},
          {at: 'top'},
        ],
        outcomes: {
          up: {cue: 'open.site.found'},
          'over-the-edge': {cue: 'open.ramp.edge', armour: 0},
        },
      },
    },

    // A player who heard the calls, did not answer them, and came up in daylight.
    'by-day': {
      when: {all: [{reach: 'radio-hill'}, {part: 'day'}, {fact: 'mark', id: `${ID}/heard-two-voices`}, {not: {fact: 'found', site: 'radio-hill'}}]},
      lines: [hettyHere('You came up in daylight, which was very sensible of you. I talked to you for three nights, you know. I\'d begun to think that I was talking to the wind.')],
      effects: [{type: 'find', site: 'radio-hill'}],
      next: 'other-voice',
    },

    pocket: {
      when: {reach: ['the-pocket', 'mouth']},
      explore: [
        {id: 'tracks', what: 'Many narrow tyre tracks go in through the mouth, and none of them comes out again',
          thought: 'A lot of cars have gone in here, and I can\'t see where any of them came out.', tells: 'Buggies, and they are still inside'},
        {id: 'pole', what: 'The white lamp hangs on a pole, and somebody is holding the pole very still',
          thought: 'That lamp isn\'t on a mast. Somebody is standing there holding it up on a pole.', tells: 'There is no mast. There is a Road Rat with a lamp'},
        {id: 'wheels', what: 'Four car wheels are stacked beside the mouth, with the tyres still on them',
          thought: 'Those are good wheels, and nobody throws good wheels away. They came off somebody\'s car.', tells: 'What is taken here'},
        {id: 'heap', what: 'The wrecks stand higher than the car on three sides',
          thought: 'I\'m at the bottom of a heap of wrecks. Nobody would build a radio mast down here.', tells: 'It was never Radio Hill'},
      ].map(thing => ({...thing, cue: 'open.clue.found'})),
      lines: [secondVoice('You\'re so close now, driver. Come on in to the light, where it\'s warm.')],
      thoughts: [
        'She promised a fire and hot food. I can\'t see a fire, and I can\'t smell any smoke.',
        'If I drive in there, the only way out is the way I came in.',
      ],
      choices: [
        {id: 'drive-in', by: 'go', words: 'Drive in to the lamp', plain: 'A white lamp and a narrow mouth',
          thought: 'It could still be a camp. Camps do hide themselves.', hidden: 'The trap is sprung.',
          effects: [{type: 'find', site: 'the-pocket'}],
          next: 'trap'},
        {id: 'back-out', by: 'go', words: 'Back out and drive for the red lamp', plain: 'The red lamp still blinks, far off',
          thought: 'One of those voices could see my lamps. It wasn\'t this one.',
          hidden: 'Parrot knows that her trick has failed, and says so.',
          lines: [secondVoice('Off you go, then. It was worth a try. Give my love to the old girl on the hill, and tell her that she drops her voice at the end of "anybody".')],
          effects: [{type: 'find', site: 'the-pocket'}],
          next: 'ramp'},
        {id: 'wait-dark', by: 'do', words: 'Turn off your lamps and wait at the mouth', when: {any: [{found: 'wheels'}, {found: 'tracks'}]},
          plain: 'Darkness, and the engine off',
          thought: 'She can\'t see me. I\'d like to know what she does when the car doesn\'t come.',
          hidden: 'After twenty seconds she walks out to look, and the player sees who she is.',
          lines: [secondVoice('Driver, are you there? Please answer me. We\'re all so worried about you up here on the hill.')],
          effects: [{type: 'find', site: 'the-pocket'}, mark('saw-parrot', 'You saw who the second voice is.')],
          next: 'ramp'},
      ],
      notes: {
        // The player's thought that comes after the lines of the choice "wait-dark".
        choices: {'wait-dark': {after: {thought: 'That\'s a Road Rat with a radio on a strap, and she\'s doing the voice. There are three buggies behind her with their engines running.'}}},
      },
    },

    trap: {
      when: {after: 'pocket'},
      cue: 'open.trap.sprung',
      // A reason before a fight: she says who they are and what they want before anything moves.
      lines: [
        parrot('That was lovely driving, straight to where I asked you. My name is Parrot, and I do the voices. Those are Sump\'s Rats behind you, and all we want tonight is your wheels.'),
        parrot('Nobody gets hurt in my Pocket. You can step out and walk home in your boots, or you can try for the mouth, and then we\'ll want the scrap in your boot as well.'),
      ],
      thoughts: [
        'Three cars in a place this narrow can\'t all get at me at once.',
        'Wheels can be bought again. I\'m not sure that the whole car can.',
      ],
      choices: [
        {id: 'fight-out', by: 'do', words: 'Fight your way out through the mouth', plain: 'Three buggies and one gap',
          hidden: 'A fight by car, about two minutes. On Easy a pre-teen wins it about five times in ten.',
          next: 'pocket-fight'},
        {id: 'give-up-wheels', by: 'do', words: 'Step out and give up the wheels', plain: 'The car stays, and the player walks',
          hidden: 'The wheels are gone and nothing else. The feud does not move.',
          next: 'wheels-off'},
      ],
    },

    'pocket-fight': {
      mission: {id: `${ID}/pocket-fight`, kind: 'rider-fight', by: 'car', minutes: 2, holds: ['checkpoints', 'signs'],
        rule: {buggies: 3, buggiesAtWar: 5, atWar: ratsAtWar, boxedSeconds: 6, easyWinsInTen: 5, markedGapHalvesKnocks: true},
        lines: [{when: {fact: 'mark', id: `${ID}/stopped-for-hetty`},
          ...hetty('Driver, I can see lamps bunched together among the wrecks, and I think one pair is yours. The buggy on your left has its lamps pointed at the wall. The gap is on that side.')}],
        outcomes: {
          out: {
            lines: [parrot('All right, all right, mind my paint! Go on, then. I\'ll say this for you, driver: nobody has ever driven out of the Pocket before.')],
            effects: [ratsFeud(1), {type: 'scrap', by: 12}, mark('drove-out', 'You drove out of the Pocket with all four wheels.')],
            next: 'after-pocket',
          },
          'boxed-in': {next: 'wheels-off'},
        },
      },
      notes: {
        outcomes: {'boxed-in': {scrapShareLost: 1 / 3}},
      },
    },

    'wheels-off': {
      when: {after: 'trap'},
      cue: 'open.wheels.off',
      lines: [parrotHere('There, that\'s all four of them off, and there isn\'t a scratch on you. I\'d say thank you, but I expect you\'d rather I didn\'t.')],
      // Home as section 14 has it: a friend's tow, which spends a favour, or a trader's lift. Odessa fits wheels at dawn.
      effects: [{type: 'scrap', by: -30}, mark('wheels-taken', 'The Road Rats took your wheels in the Pocket.')],
      next: 'after-pocket',
    },

    'after-pocket': {
      when: {after: 'trap'},
      lines: [hetty('I watched all of that, and I couldn\'t do a thing about it. Will you come up now, and let me say sorry for a voice that wasn\'t mine?')],
      next: 'ramp',
    },

    'other-voice': {
      // On any visit after a banked night, for as long as Parrot still has her set.
      when: {all: [{reach: ['radio-hill', 'hut']}, {nights: 1}, {fact: 'found', site: 'radio-hill'}, parrotHasSet]},
      lines: [
        hettyHere('She was on the air again last night, driver, using my words. A hauler from the Mall Road followed her white lamp, and he walked home without his wheels.'),
        bern('People have begun to say that Radio Hill robs travellers. Nobody will answer a station that robs them.'),
        hettyHere('I waited eleven years for somebody to answer me. I don\'t want the first thing they hear to be a lie in my own voice.'),
      ],
      questions: [
        {id: 'how-long', words: 'How long has she been doing it?',
          lines: [hettyHere('She has been doing it since the spring. At first she only repeated my weather, and I was almost pleased, because it meant that somebody was listening.')],
          shows: 'She began as a listener'},
        {id: 'talk-over', words: 'Can\'t you talk over her?',
          lines: [bern('We can, if Hetty sits at the set from dusk until dawn and never stops. She\'d be no use for anything else, and the generator would drink fuel all night long.')],
          shows: 'Talking over her costs the sisters their nights, and fuel'},
        {id: 'where-from', words: 'Where does she call from?',
          lines: [hettyHere('She calls from a buggy, so it moves about. But the engine behind her voice is always the same one, and after dark it always stands in the Pocket.')],
          shows: 'Where to find her'},
        {id: 'what-she-wants', words: 'What does she want?',
          lines: [hettyHere('She wants wheels, I suppose. But last week she read out all of my news after I\'d gone to bed, and nobody was robbed that night. I\'ve wondered about that ever since.')],
          shows: 'She may like the radio for its own sake'},
      ],
      thoughts: [
        'Hetty wants her own voice back. I don\'t think she wants anybody hurt to get it.',
        'Whatever I do about the second voice, the Road Rats are going to hear of it.',
      ],
      choices: [
        {id: 'take-her-set', words: 'I\'ll go to the Pocket and take her set away from her.', plain: 'Bern says how many buggies are there',
          thought: 'Without a set she can\'t call anybody. Sump will also know exactly who took it.',
          hidden: 'A mission. The Road Rats\' feud rises. The hill gains a second set.',
          next: 'set-asked'},
        {id: 'talk-over-her', words: 'Talk over her every night. I\'ll keep you in fuel for as long as it takes.',
          when: {fact: 'scrap', atLeast: 25}, plain: 'Bern says what it will cost',
          thought: 'That keeps everybody safe, and it means Hetty never sleeps.',
          hidden: 'A promise of fuel. Hetty has no news to give while it lasts. Nothing is settled.',
          lines: [
            bern('The generator drinks a can of fuel a night when the set never rests, and we have nine cans. Bring us a drum from Tin Town before they\'re gone, and we can keep it up.'),
            hettyHere('Then I\'ll sit up every night and say my own words louder than she says them. I shan\'t have any news for you while I\'m doing it, because I can\'t talk and listen at once.'),
          ],
          effects: [{type: 'promise', id: `${ID}/fuel`, person: 'radio-hill', dueNights: 9,
              text: 'You promised Radio Hill a drum of generator fuel within nine nights.'},
            mark('talks-over', 'Hetty talks over the second voice every night, on your fuel.')]},
        {id: 'the-microphone', words: 'Give me the microphone. I\'d like to talk to her myself.', plain: 'Hetty hands it over, frowning',
          thought: 'She copied Hetty all spring before she robbed anybody. Perhaps what she wants is to be listened to.',
          hidden: 'A talk on the air.',
          next: 'on-the-air'},
      ],
      notes: {
        // Asking "where-from" makes this rumour of the Pocket.
        questions: {'where-from': {effects: [{type: 'rumour', site: 'the-pocket'}]}},
      },
    },

    // While Hetty talks over the second voice, this stands in for the news she gives on a visit. A drum from Moss is
    // 25 scrap, carried in the car, and each drum buys nine more nights.
    'talking-over': {
      when: {all: [{reach: ['radio-hill', 'hut']}, {fact: 'mark', id: `${ID}/talks-over`}, parrotHasSet]},
      lines: [hettyHere('I\'ve no news for you, driver. I\'ve spent every night this week talking over that woman, and I haven\'t listened to anything else.')],
      notes: {
        fuel: {drumScrap: 25, nightsADrum: 9, firstDrumGives: [sisters({by: 1})], brokenCosts: [sisters({by: -1})]},
      },
    },

    'set-asked': {
      when: {after: 'other-voice'},
      // A mission is always asked for plainly, by the person who needs it.
      lines: [bern('There are three buggies in the Pocket after dark, and one of them carries her set. I\'d leave your car well back from the mouth, where they can\'t hear its engine. Will you go tonight?')],
      choices: [
        {id: 'go-tonight', words: 'I\'ll go tonight.', hidden: 'The mission begins at dusk. It is the day\'s outing in an act with a clock.',
          next: 'take-set'},
        {id: 'not-yet', words: 'I can\'t go tonight.', hidden: 'Nothing changes. Bern asks again on the next visit.', next: 'other-voice'},
      ],
    },

    'take-set': {
      mission: {id: `${ID}/take-set`, kind: 'heist', by: 'foot', minutes: 4, outing: true, holds: ['checkpoints', 'signs'],
        rule: {carLeftMetres: 200, seenAfterSecondsInLamp: 2, wrenchSeconds: 6, boxedSeconds: 6, cue: 'open.set.taken'},
        lines: [parrotHere('This is Radio Hill, calling anybody who can hear us. There\'s a fire here, and hot food, and room for your car.')],
        outcomes: {
          'out-with-the-set': {
            lines: [
              bern('That\'s a better set than ours, and I shan\'t be telling Hetty so. Now she can listen on one and talk on the other, and heaven help the rest of us.'),
              hettyHere('I\'ve two sets now, so I can listen to the Mall Road and scold my sister at the same time. And nobody on this land will hear a lie in my voice again.'),
            ],
            effects: [sisters({by: 1}), ratsFeud(1), {type: 'made', id: 'radio-hill/second-set'}, {type: 'settle', id: `${ID}/fuel`},
              mark('took-the-set', 'You took Parrot\'s radio out of the Pocket and gave it to Radio Hill.')],
            next: 'second-set',
          },
          // Not a failure: the buggies start, and they can be outrun on the road or fought.
          seen: {
            lines: [line('road-rat', 'There\'s somebody in the Pocket! Parrot, there\'s somebody at your set!', {as: 'A Road Rat'})],
          },
          caught: {
            lines: [parrotHere('You walked all this way to steal a radio from a thief. I admire that, driver, I really do. I\'m still having your wheels.')],
            effects: [{type: 'scrap', by: -30}, mark('wheels-taken')],
            next: 'other-voice',
          },
        },
      },
      notes: {
        outcomes: {caught: {pocketWatch: 2}},
        // The sentence of the mark "wheels-taken", which the beat "wheels-off" makes first and shows.
        marks: {'wheels-taken': 'The Road Rats took your wheels in the Pocket.'},
      },
    },

    'on-the-air': {
      when: {after: 'other-voice'},
      lines: [
        you('Parrot, this is the driver you tried to rob. I\'m sitting on Radio Hill, and I can hear your engine.'),
        parrot('Well, that\'s cheating. Nobody was meant to find the real one. Is the old girl cross with me?'),
        hettyHere('I am extremely cross with you. You have my voice nearly right, and you use it to steal wheels.'),
        parrot('Only nearly right? I\'ve worked at it for months. Sump wants wheels, and the voice gets him wheels. I\'d sooner read the weather, if I\'m honest, but nobody pays me for weather.'),
      ],
      questions: [
        {id: 'would-you-stop', words: 'Would you stop, if you had something better to do?',
          lines: [parrot('I\'d stop tomorrow. I like the set far more than I like the Pocket. But Sump counts wheels, and he\'ll notice when I stop bringing them.')],
          shows: 'She would rather have the radio than the robbing. Sump is in the way'},
        {id: 'what-sump-wants', words: 'What does Sump want most?',
          lines: [parrot('Sump wants to know things before other people know them. He likes to hear who is on which road and what they\'re carrying. Wheels are only what he takes when he doesn\'t know anything better.')],
          shows: 'News is worth more to Sump than wheels'},
      ],
      thoughts: [
        'If she reads the news from this hill, then Sump hears everything that Hetty hears.',
        'If she doesn\'t, she goes on doing the only other thing that she\'s good at.',
      ],
      choices: [
        // While the Road Rats are Raiding or worse she cannot be seen making friends, and she says why: then her
        // refusal is all that is said, and nothing else happens.
        {id: 'read-the-news', words: 'Read the news with Hetty every evening, and leave the white lamp at home.',
          plain: 'Hetty and Bern look at each other',
          thought: 'Then the Road Rats will know the news of every road as soon as the hill does.',
          hidden: 'Two voices on one station. Nobody is robbed by a voice again. The Word on the road rises by one. The hill never warns of the Road Rats\' own riders.',
          lines: [
            {...parrot('Sump says that we\'re at war with your town this week, driver, so I can\'t be seen making friends. Ask me again when he\'s calmed down.'), when: ratsAtWar},
            {...hettyHere('I\'ve talked to nobody for eleven years. I suppose I can put up with talking to a thief, if she keeps to the weather.'), when: notAtWar},
            {...bern('I\'ll be listening to both of them. If the white lamp goes up again, I shall know it before the driver does.'), when: notAtWar},
            {...parrot('Good evening, the Scablands. This is Radio Hill, and so is this. There\'s weather coming in from the west, and nobody at all is going to be robbed tonight.'), when: notAtWar},
          ],
          effects: [{...sisters({by: 1}), when: notAtWar}, {type: 'roadWord', by: 1, when: notAtWar}, {type: 'settle', id: `${ID}/fuel`, when: notAtWar},
            {...mark('two-voices', 'Parrot reads the evening news with Hetty, because you asked her to.'), when: notAtWar}],
          next: [{when: notAtWar, to: 'two-voices'}]},
        {id: 'threaten', words: 'Stop it, or I\'ll come and take your set.',
          thought: 'She knows that I found the hill. She may believe that I can find her.',
          hidden: 'She does not stop. The other two choices stay open, and the Pocket has twice the watch.',
          lines: [parrot('Then you\'ll have to find me first, driver, and I\'ve moved twice while we\'ve been talking.')],
          next: 'other-voice'},
      ],
      notes: {
        choices: {
          'read-the-news': {cue: 'open.news.evening'},
          threaten: {pocketWatch: 2},
        },
      },
    },
  },

  ends: ['second-set', 'two-voices', 'unanswered'],

  // What happens when the sign is never followed: the voices call for three nights, and then the radio is quiet.
  ignored: {
    afterNights: 3,
    next: 'unanswered',
  },

  // Said later by somebody who knows, each only when its fact is true.
  later: [
    {id: 'took-the-set', by: 'road-rats', when: {fact: 'mark', id: `${ID}/took-the-set`},
      lines: [line('road-rat', 'That\'s the car that took Parrot\'s voice box. She hasn\'t said a word to anybody for a week, and Sump says that the quiet is costing him wheels.', {as: 'A Road Rat'})]},
    {id: 'hauler-in-the-wrecks', by: 'dot', when: {fact: 'thread', id: ID, at: 'over'}, at: 'tin-town',
      lines: [line('dot', 'A hauler from the Mall Road followed a voice on his radio in among the wrecks last week. He walked into my diner two days later carrying his own steering wheel, because it was all that they\'d left him.')]},
    {id: 'called-three-nights', by: 'hetty', when: {all: [{fact: 'thread', id: ID, at: 'over'}, {fact: 'found', site: 'radio-hill'}]}, at: 'radio-hill',
      lines: [hettyHere('I called you for three nights, driver, and you never once stopped. I don\'t blame you for it. I only wish that the other voice hadn\'t been the one that people remembered.')]},
  ],

  notes: {
    // The Pocket stands at whichever of its positions is most nearly opposite the hill as seen from Tin Town's gate.
    pocket: {placed: 'opposite-hill'},
    // The call comes where the road is within this many metres of the hill, and only where the hill can see the car.
    sign: {onRoadWithin: 4000, hillSeesCar: true},
    // Where the writer said each row of `later` is heard.
    later: {
      'took-the-set': 'the next checkpoint where the Road Rats are met',
      'hauler-in-the-wrecks': 'at the diner or at the gate, some nights later',
      'called-three-nights': 'her first greeting, when Radio Hill is found by any other way',
    },
  },
};
