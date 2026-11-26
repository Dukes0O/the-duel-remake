// Lights on the Whites: a storyline of the open Scablands, as data (docs/story/open-scablands.md section 18).
// Its page is docs/story/threads/lights-on-the-whites.md, and every line a player reads is here exactly as the page
// has it. Nothing loads this file yet; OPEN-THREADS will. It names no other storyline, and every mark it writes begins
// with its own id. Conditions and effects are those of section 12. The keys are those of "The one shape of a
// storyline's file" (section 18); what the shape has no key for is kept under `notes`.
//
// It keeps to docs/story/ships-in-the-sand.md: Captain Imre never has anything to report, nobody climbs his mast,
// and nothing is said of the lighthouse or of any ship's log.
//
// How a beat is written here:
//   when       what makes the beat live: 'sign-seen', {reach: place}, {after: beat} or a fact of section 12
//   lines      what is said, in order: {speaker, words}, with radio: true for the car's radio, and `when` for a
//              condition that the line needs
//   thoughts   the player's thought bubbles
//   questions  asking costs nothing: {id, to, words, lines, when, shows}
//   choices    {id, by, words, plain, thought, hidden, lines, effects, next}; `hidden` is the writer's note of what
//              is kept out of sight, and no player reads it
//   mission    {id, kind, by, minutes, holds, rule, lines, thoughts, outcomes}; `rule` holds the numbers a builder
//              starts from
//   next       where the beat, a choice or an outcome leads
const ID = 'lights-on-the-whites';
const line = (speaker, words, delivery) => ({speaker, words, ...delivery});
const onRadio = {radio: true};
const imre = (words, delivery) => line('captain-imre', words, delivery);
const fathom = words => line('fathom', words);
const sprat = words => line('sprat', words);
const kedge = words => line('kedge', words);
const wick = words => line('wick', words);
const you = words => line('you', words);
// A mark; `text` is the sentence it shows on What people remember, and is written on the first effect that makes it.
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text === undefined ? {} : {text})});
const made = id => ({type: 'made', id});
const deckFolk = change => ({type: 'word', person: 'deck-folk', ...change});
const favour = by => ({type: 'favour', person: 'deck-folk', by});
const basketLit = {fact: 'mark', id: `${ID}/lit-the-basket`};
const soundingTaken = {fact: 'mark', id: `${ID}/sounding-taken`};
const spratLed = {fact: 'mark', id: `${ID}/sprat-led`};
const LADDER = 'way/patience-ladder';

export default {
  id: ID,
  title: 'Lights on the Whites',
  kind: 'find',
  reads: ['word', 'stock', 'made', 'night', 'mark', 'found'],
  writes: ['word', 'favour', 'stock', 'find', 'made', 'mark', 'rumour'],

  // Tied to the salt pan and the three ships, which are named as they are, and to the buoy, which stands where the
  // land's seed puts it. The storyline casts nothing.
  cast: {},

  starts: {all: [{fact: 'night', atLeast: 2}, {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .4}]},

  // Four lamps in a line, drawn where the boat's crew truly are: six tenths of the way from the ships to the buoy.
  // Unseen, the storyline goes back on the shelf.
  sign: {kind: 'lights', at: 'bell-buoy', part: 'dark', seenWithin: 3000, lastsNights: 1, cue: 'open.lamps.seen'},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: [
        'Those are lamps, four of them in a line, and they\'re moving. Nobody lives out on the salt.',
        'They\'re a long way from the road already, and they\'re getting farther from it.',
      ],
      questions: [
        {id: 'ask-auntie', words: 'Auntie, who would carry lamps on the Whites at night?',
          lines: [line('auntie-solder', 'Somebody is carrying lamps on the Whites at this hour? The salt rakers only ever worked by day. Whoever is out there, they don\'t come from any town that I know.', onRadio)],
          shows: 'Nobody from Tin Town\'s side'},
        {id: 'ask-cinder', words: 'Cinder, could it be the Ash Men?',
          lines: [line('cinder', 'It isn\'t the Ash Men. They put lamps out wherever they find them, and they would never carry four of their own in a row.', onRadio)],
          shows: 'Not an enemy'},
        {id: 'ask-moss', words: 'Moss, have you ever driven on the pan?',
          lines: [line('moss', 'I took Bess across it once, and it took me half a day to find the road again. It\'s the same in every direction out there, flat and white. Don\'t follow anything on to it unless you know your way back.', onRadio)],
          shows: 'The danger is the way back'},
        {id: 'ask-rell', words: 'Rell, do your people rake salt by night?',
          when: {fact: 'word', of: 'walkers', atLeast: 'Friendly'},
          lines: [line('rell', 'My people raked that salt for twenty years, and we never once worked it after dark. At night the cold makes the pan smoke, and you can\'t see your own cart. Lamps in a line like that belong to the ship people.', onRadio)],
          shows: 'The haze is coming. Who they are'},
        {id: 'ask-hetty', words: 'Hetty, have you heard anything from the salt?',
          when: {fact: 'word', of: 'radio-hill', atLeast: 'Friendly'},
          lines: [line('hetty', "The ships were on the air an hour ago, asking one another whether the boat was back yet. I didn't know that they had a boat, and I can't think what use a boat would be to them out there.", onRadio)],
          shows: 'The ships are missing somebody'},
      ],
      // The decision is made by going somewhere.
      choices: [
        {id: 'follow', by: 'go', words: 'Leave the road and follow the lamps', plain: 'Four lamps, far off, and no road toward them',
          thought: 'If I\'m quick, I can reach them while I can still see their lamps.',
          hidden: 'Out on the salt. One lamp goes out as the car leaves the road.',
          next: 'salt'},
        {id: 'ask-the-ships', by: 'go', words: 'Drive on to the ships and ask', plain: 'The ships\' rail, a kilometre or two ahead',
          thought: 'The ship people can see the whole pan from their masts. Somebody up there must know who that is.',
          hidden: 'Under the ships. The lamps do not wait.',
          next: 'ships'},
        {id: 'drive-on', by: 'do', words: 'Drive on', plain: 'Nothing',
          thought: 'Whoever they are, they chose to walk out there. It\'s nothing to do with Tin Town.',
          effects: [mark('drove-on', 'You saw lamps far out on the salt at night, and drove on.')],
          next: 'passed-by'},
      ],
    },

    ships: {
      when: {reach: 'ships-in-sand'},
      lines: [
        imre('Ahoy there, the car. This is the Deck Folk, and it is the evening watch. The sounding boat is away on the salt, and she is one watch overdue. We have nothing to report.',
          {when: {fact: 'word', of: 'deck-folk', atLeast: 'Wary'}}),
        // A promise to the Deck Folk was broken.
        imre('This is the Deck Folk, and it is the evening watch. We have a note in the log about you, and it is underlined. The sounding boat is overdue. That is all that I have to say to you.',
          {when: {not: {fact: 'word', of: 'deck-folk', atLeast: 'Wary'}}}),
      ],
      questions: [
        {id: 'shore-party', words: 'Have you lost a shore party?',
          lines: [imre("The Deck Folk do not go ashore, so we have no shore parties to lose. To us the salt is not the shore but the sea, and what is out on it tonight is a boat's crew, late home. Our boat is a handcart.")],
          shows: 'Who they are: four of the Deck Folk, on foot, with a cart'},
        {id: 'sounding-boat', words: 'What is a sounding boat?',
          lines: [imre("Once a year we send a boat's crew down the old channel to take the depth of the sea at the last buoy. The depth has been nil every year since we touched bottom, but it still has to be written down.")],
          shows: 'Why they went'},
        {id: 'why-not-look', words: 'Why don\'t you go and look for them?',
          lines: [imre('We have only the one boat, and she is the one that is missing. I have four hands left aboard, and one of them is the cook.')],
          shows: 'Nobody else is coming'},
        {id: 'your-lamp', words: 'Why can\'t they see your lamp?',
          lines: [imre('Our riding light is an oil lamp, and the haze swallows it. In fog this ship used to burn a fire basket at her masthead, and a boat could steer home by it from the far buoy. We have had nothing to put in the basket since the spring.')],
          shows: 'Why they are lost. An ember would bring them home'},
        {effects: [{type: 'rumour', site: 'bell-buoy'}], id: 'which-way', words: 'Which way did they go?',
          lines: [imre('They went down the old channel, straight out from our bow. The last buoy has a bell on it, and the bell still rings whenever the wind gets up.')],
          shows: 'A rumour: the circle for the Bell Buoy'},
      ],
      thoughts: [
        'An ember in that basket would burn all night, and they could see it from anywhere on the salt.',
        'It would also be one night of Tin Town\'s fire, burning on top of somebody else\'s ship.',
      ],
      choices: [
        {next: ['salt', 'home-by-the-basket'], cue: 'open.basket.lit', id: 'give-ember', words: 'Put this ember in your fire basket.',
          when: {all: [{fact: 'stock', of: 'embers', atLeast: 1}, {asked: 'your-lamp'}]},
          plain: 'The count falls by one. A bucket comes down on a line',
          thought: 'That\'s a night of our own fire gone, and I\'ll have to explain it to Auntie.',
          hidden: 'The basket burns at the masthead all night. The crew can see it and walk home by it, whether the player goes out or not.',
          lines: [imre('The fire basket is lit at the masthead, with fire from Tin Town. I have written that down, and I have written down who brought it. We have nothing to report.')],
          effects: [{type: 'stock', stock: 'embers', by: -1}, favour(1),
            mark('lit-the-basket', 'You gave the ships an ember for their fire basket, to bring a boat\'s crew home.')]},
        {id: 'follow', by: 'go', words: 'Leave the road and follow the lamps', plain: 'The lamps, fewer and farther than before',
          thought: "I have lamps on my car, and they'll have to be enough to find them by.",
          hidden: 'Out on the salt. A second lamp has gone out while the player was talking.',
          next: 'salt'},
        {id: 'drive-home', by: 'go', words: 'Drive home', plain: 'The road home',
          thought: "He keeps saying that there's nothing to report, so perhaps there really isn't.",
          when: {not: basketLit},
          effects: [mark('heard-and-left', 'You heard that a boat\'s crew was lost on the salt, and you drove home.')],
          next: 'passed-by'},
      ],
    },

    salt: {
      mission: {id: `${ID}/out-on-the-salt`, kind: 'reach', by: 'car', holds: ['checkpoints', 'signs'],
        rule: {seconds: 90, marker: false, searchSecondsAfterLastLamp: 120, foundWithinMetres: 70, moments: ['first-lamp-out', 'haze-down', 'last-lamp-out']},
        thoughts: [
          {thought: 'There were four lamps when I left the road. I can only count three of them now.', moment: 'first-lamp-out'},
          {thought: "Everything has gone white and soft at the edges, and I can't tell where the salt stops and the air begins.", moment: 'haze-down'},
          {thought: 'Now there are only two lamps.', moment: 'haze-down'},
          {thought: 'The last lamp has gone out, and there\'s nothing out here now but white. I could drive past them ten metres away and never know it.', moment: 'last-lamp-out'},
        ],
        outcomes: {
          found: {effects: [mark('found-the-crew', 'You followed four lamps out on to the salt at night, and found the ships\' boat\'s crew.')], next: 'crew'},
          // The crew walk in at dawn when the haze lifts, or before midnight by the basket if it is burning.
          lost: {effects: [mark('lost-the-lamps', 'You followed the lamps on to the salt and lost them in the haze.')],
            next: [{when: basketLit, to: 'home-by-the-basket'}, {to: 'in-at-dawn'}]},
        },
      },
    },

    crew: {
      when: {after: 'salt'},
      lines: [
        {...fathom('Ahoy, the car. This is the sounding boat of the Patience, and they call me Fathom. We are not lost, but we are waiting for our mark to show.'), when: {not: basketLit}},
        {...sprat('We are lost. We\'ve passed that same crack in the salt five times, and I counted them.'), when: {not: basketLit}},
        {...fathom('Ahoy, the car. This is the sounding boat of the Patience, and they call me Fathom. Our mark has just come up bright at the masthead, so we were never lost, only slow.'), when: basketLit},
        {...sprat('We were lost until a minute ago. We passed that same crack in the salt five times, and I counted them.'), when: basketLit},
        kedge('I put my foot through the crust an hour ago, and my ankle has swelled up like a fender. I\'m the reason that we\'re slow, driver, and I\'m sorry for it.'),
        wick('We had four lamps when we left the ship, and we have two now. I wouldn\'t trust either of them to last until morning.'),
      ],
      questions: [
        {id: 'what-mark', words: 'What mark are you waiting for?',
          lines: [fathom("We are waiting for the riding light at the Patience's masthead, because a boat steers home by it. It was there at sunset, but then the haze came up, and we have not seen it since.")],
          shows: 'They cannot find the ship without a light to walk toward'},
        {id: 'what-for', words: 'What did you come out here for?',
          lines: [fathom('We came to take the depth of the sea at the bell buoy, as we do every year. There is a sounding in the log for every year since we touched bottom. Tonight\'s is the only one that has not been taken.')],
          shows: 'The sounding matters to them. It opens the fourth choice'},
        {id: 'how-far', words: 'How far is the buoy?', when: {asked: 'what-for'},
          lines: [wick('The buoy is a kilometre farther out, on the side away from the ship. We turned back when Kedge went through the crust, and that was when we lost the light.')],
          shows: 'Where the buoy is, and that it lies away from home'},
        {id: 'sprat-knows', words: 'Sprat, do you know the way back?',
          lines: [sprat("The wind was on my left cheek all the way out, so it ought to be on my right cheek going home. I said so an hour ago, but I'm not rated to navigate, so nobody wrote it down.")],
          shows: 'The child knows the way. It opens the second choice'},
        {id: 'kedge-walk', words: 'Kedge, can you walk at all?',
          lines: [kedge('I can hop, driver, and I weigh as much as the cart does. I wouldn\'t want to be the hand who had to hold me up for the length of the channel.')],
          shows: 'Kedge has to ride'},
      ],
      thoughts: [
        'My car has two spare seats, and there are four of them.',
        'If I drive away with two, the other two are alone out here with one lamp, and I\'ll have to find this place again.',
      ],
      choices: [
        {id: 'two-trips', words: 'Kedge and Sprat, get in. I\'ll come back for the other two.', plain: 'Two seats, and the haze',
          thought: 'Every bit of this salt looks the same. I hope that I can find this bit twice.',
          hidden: 'Two trips. The two who are left wait where they are, with Wick\'s lamp.',
          lines: [
            fathom('Take Kedge and the child, driver. Wick and I will stay with the boat, because nobody leaves a boat with nobody in it.'),
            sprat("I've never been in a car before. Does it go faster than a ship? I suppose everything goes faster than our ship, really."),
            wick('Look for one lamp on a pole when you come back. If you can\'t see it, that\'s because it has gone out, and then I don\'t know how you\'ll find us.'),
          ],
          next: 'two-trips'},
        {id: 'sprat-leads', words: 'Kedge and Wick, get in. Sprat, walk Mr Fathom home by the wind, and I\'ll meet you on the way.',
          when: {asked: 'sprat-knows'}, plain: 'The child stays out in the cold',
          thought: 'She\'s the smallest and the coldest of them, and she\'s the only one who knows the way.',
          hidden: 'Two trips, and the two on foot walk the true line home. Nobody has to be found. The lamp they carry is not trimmed.',
          lines: [
            fathom('You want me to be led home by the ship\'s boy? I was taking soundings on this sea before she was born.'),
            you('She noticed which way the wind was blowing, Mr Fathom, and nobody else did.'),
            fathom('That is true, and I don\'t enjoy it. Sprat, take the head of the line, and call out your bearing as you go.'),
            sprat('The wind is on my right cheek, and the bearing is home. Follow me, Mr Fathom, and please keep up.'),
          ],
          effects: [mark('sprat-led', 'You told the ships\' crew to follow a child who knew the way, and she brought them home.')],
          next: 'two-trips'},
        {id: 'walk-in', words: 'Everybody walks in together behind my lamps, and Kedge can ride in the car.', plain: 'Fathom says how slow it will be',
          thought: 'It will take half the night, and nobody will be left behind.',
          hidden: 'The walk in. It uses up the night.',
          lines: [
            fathom('Then all hands will walk together, astern of the car. Driver, go slowly, because a boat\'s crew on foot makes about two knots, and a knot is not very much.'),
            kedge("So I'm cargo tonight, am I? I've been called worse things. Mind the bumps, driver, because every one of them goes straight up my leg."),
            // With Sprat at its head the line walks true even when it loses the car's lamps.
            {...fathom('Sprat, you say that you know the way, so walk at the head of the line, where I can watch you being right.'), when: {asked: 'sprat-knows'}},
          ],
          next: 'walk-in'},
        {id: 'sounding-first', words: 'Mr Fathom, get in. We\'ll take your sounding first.',
          when: {all: [{asked: 'what-for'}, {not: soundingTaken}]}, plain: 'The buoy is farther out, away from the ships',
          thought: 'It\'s only a number in a book, and the number is nought. It matters more to him than his feet do.',
          hidden: 'The Bell Buoy, while the lamp at the cart burns down. Then this choice again.',
          lines: [fathom('You would drive me out to the buoy? Driver, that is the handsomest thing that anybody has offered this ship in years. Wick, mind the lamp. I shall be back as soon as the lead is down.')],
          next: 'buoy'},
      ],
      notes: {
        // Who rides in the car, who is left, and what the ones left behind do.
        choices: {
          'two-trips': {riders: ['kedge', 'sprat'], left: ['fathom', 'wick'], leftBehind: 'wait'},
          'sprat-leads': {riders: ['kedge', 'wick'], left: ['sprat', 'fathom'], leftBehind: 'walk-the-true-line'},
          'walk-in': {riders: ['kedge']},
        },
      },
    },

    buoy: {
      mission: {id: `${ID}/the-bell-buoy`, kind: 'reach', by: 'car', minutes: 2, holds: ['checkpoints', 'signs'],
        rule: {marker: false, metresOut: 1000, bellHeardMetres: 400, holdSeconds: 20, bellCue: 'open.buoy.bell'},
        outcomes: {
          sounded: {
            cue: 'open.site.found', lines: [fathom('By the mark, it is nought. The depth of the sea at the bell buoy is no fathoms and no feet. Thank you, driver. That is one sounding for every year since we touched bottom, and every one of them agrees.')],
            effects: [{type: 'find', site: 'bell-buoy'},
              mark('sounding-taken', 'You drove the ships\' leadsman out to the bell buoy, so that the year\'s sounding was taken.')],
            next: 'crew',
          },
        },
      },
      notes: {
        // What the outcome "sounded" says and shows beyond its lines and effects.
        outcomes: {
          sounded: {
            thoughts: ['He walked out here in the cold to measure a sea that isn\'t there, and he\'s pleased with the answer.'],
            questions: [
              {id: 'why-measure', words: 'Why do you still measure it?',
                lines: [fathom('Because one year the answer will not be nought, driver. The Deck Folk mean to be the first people to know it.')],
                shows: 'Why the Deck Folk keep the watch'},
            ],
            // If the lamp at the cart has gone out and Sprat was asked, she has turned the cart to point home, and she shouts.
            backAtTheCart: [{...sprat('We\'re over here, driver! The lamp went out, so I\'ve been shouting every time I counted to twenty.'), when: {asked: 'sprat-knows'}}],
          },
        },
      },
    },

    'two-trips': {
      mission: {id: `${ID}/two-trips`, kind: 'rescue', by: 'car', minutes: 3, holds: ['checkpoints', 'signs'],
        rule: {seats: 2, home: 'ships-in-sand', marker: false, lampSeenMetres: 1500, searchSeconds: 120, foundWithinMetres: 70,
          drivenGroundOnMap: true},
        outcomes: {
          found: {
            lines: [
              wick('There\'s the car! I told you that it would come back, Mr Fathom. I told you so twice.'),
              fathom('You told me four times, Wick, and I agreed with you each time.'),
            ],
            next: 'all-hands-home',
          },
          // Sprat is leading Fathom home: they are met on the line between the cart and the ships, with or without a lamp.
          'met-on-the-way': {
            when: spratLed, lines: [sprat('There you are, driver. We\'ve come about half of the way, and Mr Fathom has only argued with me twice.')],
            next: 'all-hands-home',
          },
          // The basket is burning: whoever was left is walking toward it, and is met on the same line.
          'met-by-the-basket': {when: basketLit, next: 'all-hands-home'},
          'not-found': {next: 'two-at-dawn'},
        },
      },
    },

    'walk-in': {
      mission: {id: `${ID}/the-walk-in`, kind: 'escort', by: 'car', holds: ['checkpoints', 'signs'],
        rule: {stretches: 2, secondsEach: 60, followersLoseLampsMetres: 120, withSpratLeading: 'the line keeps walking the true way', usesTheNight: true, moments: ['lamps-lost', 'second-stretch']},
        lines: [
          {...wick('Driver, slow down! We\'ve lost your lamps, and Sprat has stopped walking.'), moment: 'lamps-lost'},
          {...sprat('I\'m not tired. I\'m only resting my feet, one at a time.'), moment: 'second-stretch'},
        ],
        // The player may stop and take Sprat into the car. If she is left to walk, she comes in last and coldest.
        outcomes: {
          'all-in': {next: 'all-hands-home'},
          'sprat-walked': {effects: [{type: 'mark', id: `${ID}/sprat-walked-in`}], next: 'all-hands-home'},
        },
      },
      notes: {
        between: {text: 'They walk for a long time. The haze closes in behind them, and nobody says very much.'},
      },
    },

    'all-hands-home': {
      when: {reach: 'ships-in-sand'},
      cue: 'open.crew.aboard',
      lines: [
        imre('The sounding boat has returned with all hands aboard. I shall write that she was brought in by a car, because it is true, and this log has seen stranger things.'),
        imre("The Deck Folk do not bring strangers aboard, but you are not a stranger now. There is a ladder on the Patience's quarter, and it will be down whenever you come. We have nothing to report."),
        kedge('Thank you for the ride, driver. Next year somebody else can be the one who goes through the crust.'),
        {...fathom('The depth at the bell buoy is nil. The log is complete, Captain, and it was this driver who took me there to complete it.'), when: soundingTaken},
        {...imre("No sounding was taken this year. I have left the line blank, and it is the first blank line in the book. I don't blame you for it, and I have only written down what happened."), when: {not: soundingTaken}},
        {...imre('Sprat is rated navigator\'s mate from this watch. She brought a boat\'s crew home by the wind on her cheek, and I have seen ships\' masters do worse with a compass.'), when: spratLed},
        {...sprat('Does a navigator\'s mate still have to scrub the galley?'), when: spratLed},
        {...imre('Yes, she does.'), when: spratLed},
        {...wick('The child walked every step of it and never once complained. I\'ve put her feet in a bucket of warm water, and she fell asleep with them in it.'),
          when: {fact: 'mark', id: `${ID}/sprat-walked-in`}},
      ],
      // Standing with a people in trouble is one word, or Sworn: here Sworn when their sounding was taken as well.
      effects: [deckFolk({by: 1}), favour(1), made(LADDER),
        mark('all-hands-home', 'You brought all four of the ships\' boat\'s crew in off the salt.'),
        {...deckFolk({set: 'Sworn'}), when: soundingTaken}],
    },

    // The player lit the basket and did not go out, or went out and lost them. Said on the radio, wherever the car is.
    'home-by-the-basket': {
      when: {all: [basketLit, {not: {fact: 'made', id: LADDER}}]},
      lines: [imre('This is the Deck Folk, calling the car from Tin Town. The sounding boat returned at six bells with all hands aboard, steering by your fire. The ladder on the Patience\'s quarter is down for you. We have nothing to report.', onRadio)],
      effects: [deckFolk({by: 1}), made(LADDER)],
    },

    'two-at-dawn': {
      when: {reach: 'ships-in-sand'},
      lines: [
        imre('Two hands came in by car, and two walked in at first light by themselves. They are cold, and they are aboard. I have nothing more to report.'),
        fathom('You said that you would come back for us, driver. I am sure that you meant to.'),
      ],
      effects: [mark('two-at-dawn', 'You brought two of the boat\'s crew in, and the other two walked in at dawn.')],
    },

    // The player followed the lamps and lost them, with no basket burning. Said the next time the car passes under the ships.
    'in-at-dawn': {
      when: {reach: 'ships-in-sand'},
      lines: [imre('This is the Deck Folk, and it is the forenoon watch. The sounding boat came in at first light under her own power. Her crew are cold, and the ship\'s boy has been put to bed with her feet in a bucket. We have nothing to report.')],
    },

    // On any later day, once the ladder is down. On foot, with nothing to lose.
    aboard: {
      when: {all: [{after: ['all-hands-home', 'two-at-dawn', 'in-at-dawn']}, {reach: ['ships-in-sand', 'patience-ladder']}, {fact: 'made', id: LADDER}, {nights: 1}]},
      lines: [
        sprat('The Captain says that the ladder is down for you whenever you come. I\'m to show you the ship, and I\'m not to let you touch the mast, because the mast is his.'),
        {...wick('We kept your ember going in the galley stove after the basket was done with it. There has been hot soup aboard every night since, for the first time since the spring. Sit down and have a bowl.'), when: basketLit},
        {...wick('The galley is still cold, so all that I can offer you is ship\'s biscuit. It\'s older than Sprat, and it\'s a good deal harder than she is.'), when: {not: basketLit}},
        fathom("This is the channel, with its three buoys, and the bell buoy is the last of them. I drew the map from the soundings, and I've added the place where Kedge went through the crust, so that nobody else has to do it."),
        imre('The Deck Folk owe you a watch, driver. We can keep one for you from the masthead, looking in one direction. Tell me which way you would like us to look.'),
      ],
      explore: [{id: `${ID}/fathoms-chart`, effects: [{type: 'find', site: 'bell-buoy'}]}],
      choices: [
        {id: 'watch-salt-road', words: 'Watch the Salt Road for me.', plain: 'The road to the yard and the Pipe',
          hidden: 'Cars that come at a checkpoint on that road are on the small map a minute early, and they come less often.',
          lines: [imre('Then it shall be the Salt Road. The masthead lookout will call you when there are riders on it. I shall go on having nothing to report.')],
          effects: [favour(-1), made('watch/ships-salt-road')],
          next: 'watch-kept'},
        {id: 'watch-ridge-road', words: 'Watch the road to the Ridge for me.', plain: 'The road across the pan to the Ridge',
          hidden: 'The same, on that road.',
          lines: [imre('Then it shall be the road to the Ridge. The masthead lookout will call you when there are riders on it. I shall go on having nothing to report.')],
          effects: [favour(-1), made('watch/ships-ridge-road')],
          next: 'watch-kept'},
        {id: 'watch-the-salt', words: 'Watch the salt itself, in case anybody else is lost on it.', plain: 'The whole white pan',
          hidden: 'No road is watched. Any sign that rises on the pan is called to the player at once, and nobody is ever lost on the Whites for a whole night again.',
          lines: [imre('Then it shall be the salt, which is what I had hoped you would say. The masthead lookout will call you if a lamp or a smoke shows on it. I shall go on having nothing to report.')],
          effects: [favour(-1), made('watch/ships-salt-pan')],
          next: 'watch-kept'},
      ],
      notes: {
        // Where in the ship each line is said (a count from the first line, which is 0), and where the chart lies.
        lineMoments: [{line: 1, at: 'galley'}, {line: 2, at: 'galley'}, {line: 3, at: 'chart-table'}, {line: 4, at: 'bridge-wing'}],
        finds: {[`${ID}/fathoms-chart`]: {at: 'chart-table'}},
      },
    },
  },

  ends: ['watch-kept', 'all-hands-home', 'home-by-the-basket', 'two-at-dawn', 'in-at-dawn', 'passed-by'],

  // What happens when the lamps were seen and not followed: the four walk in at dawn, and somebody says so later.
  ignored: {
    afterNights: 1,
    effects: [mark('drove-on')],
    next: 'passed-by',
  },

  // Said later by somebody who knows, each only when its fact is true.
  later: [
    {id: 'logged-without-comment', by: 'captain-imre', when: {fact: 'mark', id: `${ID}/heard-and-left`}, at: 'ships-in-sand',
      lines: [imre('This is the Deck Folk, and it is the evening watch. A car stopped under our bow last week, asked its questions and went home to bed. I have logged it without comment. We have nothing to report.')]},
    {id: 'one-more-ember', by: 'captain-imre', when: basketLit,
      lines: [imre('You have put one ember in our fire basket already, and it is in the log. Give us one more for the galley, and the ships\' watch is yours.')]},
    {id: 'something-on-the-salt', by: 'deck-folk', when: {fact: 'made', id: 'watch/ships-salt-pan'},
      lines: [line('masthead-lookout', 'This is the masthead, calling the car from Tin Town. There is something showing out on the salt tonight. The Captain says that it is nothing to report, but I thought that you would want to know.',
        {radio: true, as: 'The masthead lookout'})]},
    {id: 'walked-in-at-dawn', by: 'traders', when: {fact: 'mark', id: `${ID}/drove-on`},
      lines: [line('trader', 'The ship people lost a boat\'s crew on the salt for a whole night last week. All four of them walked in at dawn, white to the knees and too cold to speak. The old captain still says that he has nothing to report, but he says it more quietly now.',
        {as: 'The trader'})]},
  ],

  notes: {
    // Where the lamps are drawn, and what the storyline does when they are not seen.
    sign: {toward: 'ships-in-sand', shareOfTheWayBack: .4, lamps: 4, seenFromRoads: ['salt-road', 'ridge-spur'], unseen: 'back-on-the-shelf'},
    // The salt haze: starting numbers for the builder and for Claude's drive. It changes no rule but sight.
    haze: {look: 'dust-night', colour: 'white', beam: false, downAfterSecondsOffRoad: 60, sightMetres: 70,
      handLampMetres: 1500, carLampsToWalkersMetres: 120, fireBasketMetres: 4000, mapMarkers: false,
      cue: 'open.haze.down'},
    lamps: {seen: 4, whenFound: 2, secondsEach: 150, secondsEachWithoutWick: 110, outCue: 'open.lamp.out'},
    // Where the writer said each row of `later` is heard.
    later: {
      'logged-without-comment': 'the next time the car stops below the ships',
      'one-more-ember': 'when Captain Imre next asks embers for the ships\' watch',
      'something-on-the-salt': 'when any sign rises on the salt pan',
      'walked-in-at-dawn': 'at the gate or on the road, some nights later',
    },
  },
};
