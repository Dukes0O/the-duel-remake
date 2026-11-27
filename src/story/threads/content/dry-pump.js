// The dry pump: a thread of the open Scablands, written in full in docs/story/threads/dry-pump.md and in the shape
// of docs/story/open-scablands.md section 18. Nothing loads this file yet; OPEN-THREADS will.
//
// How to read a beat. `lines` are talk bubbles in order, `thoughts` are the player's thought bubbles, `explore` lists
// what can be read by looking, `questions` cost nothing to ask, and `choices` are what the player says (the default)
// or does (`by: 'do'`). `plain` is what anybody could see before choosing and `hidden` is the writer's note of what
// the game keeps to itself; neither is shown as words. `words` and `thought` are shown exactly as written. A role's
// names are put into a line as {camp.leader} and {camp.name}, and into a condition or an effect as '@camp' (the
// site) and '@camp.people' (its people). A draw is named short: the storyline rule puts the id and the night in front.
// `{nights: 2}` on a beat means: live once two hearths have been banked since the thread reached it.
const ID = 'dry-pump';
const say = (speaker, words, more) => ({speaker, words, ...more});
const leader = (words, more) => say('{camp.leader}', words, more);
const penny = (words, more) => say('mr-penny', words, more);
const ashMan = (words, more) => say('ash-man', words, more);
const friend = (words, more) => say('{friend.leader}', words, more);
const onRadio = {radio: true};
const low = {low: true};
// A mark. Its sentence for the page What people remember is `text`, written once, on the first effect that makes it.
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text ? {text} : {})});
const did = what => ({fact: 'mark', id: `${ID}/${what}`});
const campWord = change => ({type: 'word', person: '@camp.people', ...change});

const AT_THE_GLASSHOUSE = {cast: 'camp', is: 'glasshouse'};
const PUMP_WAS_MENDED = {fact: 'mark', id: 'glasshouse/pump-mended'};
// The Walkers have slept in the Dead Mall: the player told them of its roof on the second of the Cold Nights.
const WALKERS_KNOW_THE_MALL = {all: [{fact: 'word', of: 'walkers', atLeast: 'Friendly'},
  {fact: 'mark', id: 'told-walkers-of-mall'}]};
// The friends bring it back when the Walkers know the Mall, and otherwise three times in five.
const FRIENDS_FETCHED = {any: [WALKERS_KNOW_THE_MALL, {fact: 'draw', name: 'friends', chance: .6}]};
const HAS_A_VALVE = {any: [did('took-penny-valve'), did('took-the-spare')]};

const PROMISE = {type: 'promise', id: `${ID}/valve`, person: '@camp.people', dueNights: 3,
  text: 'You promised {camp.name} a brass valve from the Dead Mall within three nights.'};
const PENNY_PROMISE = {type: 'promise', id: `${ID}/penny-valve`, person: 'mr-penny', dueNights: 5,
  text: 'You promised Mr Penny the valve from the shoe shop within five nights.'};

// Said by the Ash Men when the lamps find the player, in the hall or outside the shoe shop.
const SEEN_SHOUT = ashMan("There's somebody in the hall! Turn the lamps on the shops!", {shouted: true});
const BOLTED_DOOR = penny("This door is for staff only, and I have told them so again and again! Go down the corridor and out by the tunnel, and don't stop to thank me.");
const CAUGHT = [
  ashMan("Put that down. It's Old Smoke's, and so is everything else under this roof."),
  ashMan("Old Smoke doesn't keep thieves prisoner, because thieves have to be fed. Walk out by the front doors, and tell Tin Town who owns the Mall."),
];

// Where the camp's fitting leads: the thread's end, by how the valve was got.
const FITTING_END = [
  {when: did('promise-broken'), to: 'late'},
  {when: did('friends-fetched-it'), to: 'friends-fetched'},
  {to: 'water-back'},
];
const FITTING_ENDS = FITTING_END.map(row => row.to);
const KEEP_FITTING_END = FITTING_ENDS.map(to => ({when: {ended: to}, to}));

export default {
  id: ID,
  title: 'The dry pump',
  kind: 'need',

  reads: ['found', 'stage', 'word', 'favour', 'mark', 'night'],
  writes: ['word', 'favour', 'feud', 'site', 'promise', 'settle', 'mark', 'met'],

  cast: {
    // Any found camp that still stands and whose people have not turned against the player.
    camp: {from: 'sites', where: {all: [{fact: 'found'}, {fact: 'stage', is: 'camp'},
      {fact: 'word', atLeast: 'Strangers'}]}},
    // A people who owe the player, and are not the camp's own. Left empty when nobody owes.
    friend: {from: 'peoples', where: {fact: 'favour', atLeast: 1}, apartFrom: ['camp'], optional: true},
  },

  starts: {all: [
    {fact: 'night', atLeast: 2},
    {not: {fact: 'thread', id: ID, at: 'any'}},
    {fact: 'draw', name: 'start', chance: .5},
  ]},

  // A person's words: the request is the first row of the leader's talk table. What is seen on the way in is a pump
  // that turns over a dry trough. The need stands for four nights, which is as long as the camp's water lasts.
  sign: {kind: 'words', by: '{camp.leader}', at: '@camp', seenWithin: 60, lastsNights: 4, cue: 'open.pump.dry'},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: [
        "The pump is turning, but the trough under it is dry, and they're sharing out water from a barrel with a cup.",
        "Nobody shares out water with a cup unless they're counting how much is left.",
      ],
      next: 'asking',
    },

    asking: {
      when: {reach: '@camp'},
      // Two thoughts of this beat wait on a condition that the day's clock names, and the shape has no word for it.
      notes: {
        thoughtsWhen: [
          {when: 'outing-costs-the-gas-run',
            thought: "If I go to the Mall today, Bess stays in the yard, and tonight's ember burns with nothing baked to replace it."},
          {when: 'outing-is-free',
            thought: "The Mall is a long way from anybody who could help me, and I'd be going into it for somebody else's water."},
        ],
      },
      lines: [
        leader("You've come on a bad day, and you may be the one good thing in it. Our pump has stopped bringing up water. It turns as well as it ever did, but nothing comes up with it."),
        say('marigold', "The pump you mended is turning beautifully. It just isn't bringing anything up with it, and beans can't drink the sound of a pump.",
          {when: {all: [AT_THE_GLASSHOUSE, PUMP_WAS_MENDED]}}),
        leader('We pulled the pipe up out of the ground this morning. The valve at the bottom of it has cracked right across, and here it is.'),
        leader("It's made of brass, and nobody has made anything out of brass since the sea went. The only ones left are under the Dead Mall, in the room where the fountain's pumps were."),
        leader("I'm asking you to go there and bring one back. I know what a day is worth to you, and I'm asking you anyway."),
      ],
      questions: [
        {id: 'what-valve', words: 'What does the valve do?',
          shows: 'What is being fetched, and why nothing else will do',
          lines: [leader("It sits at the bottom of the pipe, under the water, and it lets the water come up but won't let it fall back down. With a crack in it, the pump lifts the same cupful all day and never gets it to the top.")]},
        {id: 'how-long', words: 'How long will your water last?',
          shows: 'How long a promise can wait',
          lines: [
            leader("We have two barrels and what's in the trough. That's four days of drinking, if nobody washes and nothing gets watered."),
            say('marigold', "The beans won't last four days, though. They'll last two at most, because people can go thirsty and complain about it, but beans just die.",
              {when: AT_THE_GLASSHOUSE}),
          ]},
        {id: 'why-not-you', words: "Why can't you go yourselves?",
          shows: 'Somebody keeps a watch in the Mall',
          lines: [leader("We've a handcart and no car, and it's two days there and back on foot. People say that lamps move about inside that place at night, and none of us knows how to creep past a lamp without being seen.")]},
        {id: 'if-nobody', words: 'What will you do if nobody goes?',
          shows: 'What is lost if the player says no',
          lines: [leader("Then we load the cart and walk to wherever there's water, and this place goes back to the sand. We've done that before, and I'd hoped we had finished doing it.")]},
      ],
      thoughts: [
        'They have four days of water, and nobody else out here even knows that their pump is dry.',
      ],
      choices: [
        {id: 'go-today', words: "I'll go to the Mall for it today.",
          plain: "In an act with a clock, it is the day's outing: Bess does not go for gas",
          thought: "This costs me a whole day that I'd have spent on embers, so I'd better come back with it.",
          hidden: 'The trip',
          effects: [mark('asked')],
          lines: [leader("Then take the cracked one with you, so that you can hold it up against whatever you find and match the size. A valve that's a finger too wide is no more use than no valve at all.")],
          next: 'mall-outside'},
        {id: 'promise', words: "I'll fetch it, but I can't go today. You'll have it within three nights.",
          plain: 'A promise goes on the page with its night. Their water lasts four days',
          thought: 'A promise is easy to make this morning, but I wonder how it will look on the third night.',
          hidden: "Breaking it costs a word, said to the player's face. At the Glasshouse the beans die on the second day",
          effects: [mark('asked'), PROMISE],
          lines: [leader("I'll hold you to three nights. I'll tell the others that it's a promise, so that they stop looking at the cart. Take the cracked one with you, so that you can match the size.")],
          next: 'promised'},
        {id: 'send-friends', words: "I know some people who owe me. I'll ask them to go.",
          when: {cast: 'friend'},
          plain: 'What they owe is spent, and the page says so. They go on foot and are back at the second dawn',
          thought: "They'd be keeping my promise for me, in a place that none of us knows.",
          hidden: 'A named draw, three in five. Sure when they have slept in the Mall. The way in is theirs, and not the player\'s',
          effects: [mark('asked'), mark('sent-friends', 'You sent friends to the Dead Mall in your place.'),
            {type: 'favour', person: '@friend', by: -1}],
          lines: [
            leader("I don't mind whose hands it comes in, but I'll mind very much if it doesn't come at all."),
            friend("We owe you, and this is a fair way to pay it. We'll walk to the Mall for your friends and be back at the second dawn. After that, you and I are square.", onRadio),
            say('rell', "You told us once that the Dead Mall still had a roof, and we slept under it for two nights. There's an old man there who keeps a door the grey men have never found. He'll open it to us.",
              {...onRadio, when: {all: [{cast: 'friend', is: 'walkers'}, WALKERS_KNOW_THE_MALL]}}),
          ],
          next: 'friends-away'},
        {id: 'refuse', words: "I'm sorry, but I can't spare a day for it.",
          plain: 'Nothing changes at Tin Town',
          thought: "I wonder where they'll walk to, when the barrels are empty.",
          hidden: 'Their word falls by one. They leave on the fifth day, and somebody speaks of it later',
          effects: [mark('asked'),
            mark('refused', '{camp.name} asked you to fetch a valve for their dry pump, and you said no.'),
            campWord({by: -1})],
          lines: [leader('I thought you might say that, and I asked anyway. You have a town of your own to keep, so go on home and mind the road.')],
          next: 'left-dry'},
      ],
    },

    // The promise stands. Going to the Mall on any of the three days is the trip below. When the promise falls due
    // and is not kept, it leads to `promise-broken`.
    promised: {
      when: {after: 'asking'},
      choices: [
        {id: 'go-now', by: 'do', words: 'Drive to the Dead Mall', plain: "The day's outing", next: 'mall-outside'},
      ],
      next: [{when: {due: `${ID}/valve`}, to: 'promise-broken'}],
    },

    'promise-broken': {
      when: {reach: '@camp'},
      lines: [leader("You said three nights, and I told the others that it was a promise. I shan't ever tell them that about anybody again.")],
      effects: [mark('promise-broken', 'You promised {camp.name} a valve, and did not bring it in time.'),
        campWord({by: -1}), {type: 'settle', id: `${ID}/valve`}],
      // They have one day of water left, and the cart is half loaded. The valve can still be fetched today.
      choices: [
        {id: 'go-late', by: 'do', words: 'Drive to the Dead Mall', plain: 'The cart is half loaded',
          thought: "It's later than I said it would be, but it isn't too late yet.",
          hidden: 'The trip, a day late', next: 'mall-outside'},
        {id: 'leave-it', by: 'do', words: 'Drive home', plain: 'Nothing',
          hidden: 'The camp leaves on the fifth day', next: 'left-dry'},
      ],
    },

    // Two of the four days are gone. The player can still go. The friends fetch it when the Walkers know the Mall,
    // and otherwise by a draw.
    'friends-away': {
      when: {nights: 2},
      lines: [
        friend("Here's your valve. An old man under that place made every one of us sign a book before he'd part with it. We're square now, and I'd like it said that we were quick.",
          {when: FRIENDS_FETCHED}),
        friend("We got as far as the lamps and no further, and I'm sorry. We've paid what we owed you in walking, but your friends still have no valve.",
          {when: {not: FRIENDS_FETCHED}}),
      ],
      effects: [
        {...mark('took-penny-valve', "The valve came out of Mr Penny's own pump, because he offered it."), when: FRIENDS_FETCHED},
        {...mark('friends-fetched-it', 'Your friends brought a valve back from the Dead Mall.'), when: FRIENDS_FETCHED},
        {...mark('friends-came-back-empty', 'Your friends came back from the Dead Mall with nothing.'),
          when: {not: FRIENDS_FETCHED}},
      ],
      next: [{when: FRIENDS_FETCHED, to: 'fitting'}, {to: 'promised'}],
    },

    // ---- The Dead Mall ----

    'mall-outside': {
      when: {reach: 'dead-mall'},
      notes: {
        exploreSpots: {'east-front': 'the east front', 'north-side': 'the north side', 'south-side': 'the south side'},
      },
      mission: {id: `${ID}/mall`, kind: 'heist', holds: ['checkpoints', 'signs'], minutes: 12},
      // The first thought of the beat is the lettering over the doors.
      thoughts: [
        "The letters over the doors say SEAVIEW. There hasn't been a sea to view from here for thirty years.",
        'I have to go in on foot, and whatever I bring out is going to be heavy.',
        "The front doors are the short way to the middle of the building, but they're also where the lamps are.",
      ],
      explore: [
        {id: 'east-front', cue: 'open.scout.seen',
          what: 'The glass doors are gone. Two grey trucks stand beside them, and inside a light moves slowly across the floor.',
          thought: "Those are Ash Men's trucks, grey to the wheels, and there's a lamp moving about inside. This is one of Old Smoke's places, and somebody is awake in it.",
          tells: 'Who keeps the watch, and that the front is watched'},
        {id: 'north-side', cue: 'open.scout.seen',
          what: 'The sand has drifted to the top of the wall, and part of the roof has fallen in.',
          thought: "The sand goes right up to the roof on this side, and there's a hole where the roof fell in. I could slide down inside, but I couldn't climb back up that slope carrying anything heavy.",
          tells: 'A way in that is not a way out'},
        {id: 'south-side', cue: 'open.scout.seen',
          what: 'Four lorries are nose-down in the sand in a row, pointing at the wall.',
          thought: "Those lorries were all driving down under the building when the sand caught them. There must be a door down there, but it's buried to the top.",
          tells: 'A third way exists, and cannot be used from outside'},
      ],
      questions: [
        {id: 'ask-cinder', to: 'cinder', words: 'Cinder, why would the Ash Men be in the Dead Mall?',
          shows: 'The lamps are on the ground floor, and nobody watches from above',
          lines: [say('cinder', "Old Smoke stores things there that he doesn't want burned or stolen. His people will have lamps on the ground floor. I never heard of them looking up, though, so I'd come at them from above.", onRadio)]},
        {id: 'ask-rell', to: 'rell', words: 'Rell, did your people ever reach the Dead Mall?',
          when: WALKERS_KNOW_THE_MALL,
          shows: 'The whole way to the door, from somebody who has walked it',
          lines: [say('rell', "We slept in it for two nights, after you told us it had a roof. An old man under the fountain keeps a door that the grey men have never found. Go in by the roof, come down the stairs that don't move any more, and knock on the door marked STAFF ONLY.", onRadio)]},
      ],
      choices: [
        {id: 'front-doors', by: 'do', words: 'Walk in by the front doors',
          plain: 'Two lamps sweeping the hall',
          thought: "It's the short way, and I can see where both of the lamps are.",
          hidden: 'The whole width of the hall, in the lamps\' light. Being seen brings the alarm', next: 'hall'},
        {id: 'roof', by: 'do', words: 'Climb the sand and go in by the roof',
          plain: 'A slope of sand going down into the dark',
          thought: "Nobody watches a roof, but I'll have to find another way out.",
          hidden: 'The gallery, above the lamps. There is no way back up', next: 'gallery'},
        {id: 'tunnel', by: 'do', words: 'Go in by the delivery tunnel and knock twice',
          when: did('mall-way-in'),
          plain: 'A door in the south wall, behind the lorries',
          hidden: 'The corridor and the pump room, past nobody', next: 'penny'},
      ],
    },

    gallery: {
      when: {reach: ['dead-mall', 'gallery']},
      explore: [
        {id: 'footprints', cue: 'open.clue.found',
          what: 'A ring of footprints in the sand, all the way round the gallery.',
          thought: "Somebody walks round this gallery, always the same way, and steps in the same footprints every time. They're small, careful steps, and there's only one set of them.",
          tells: 'One person lives here who is not an Ash Man'},
        {id: 'over-the-rail', cue: 'open.scout.seen',
          what: 'The hall below: a dry fountain, two lamps on stands, two Ash Men on stools, and a door behind the fountain.',
          thought: "There's the fountain, bone dry, with two Ash Men on stools beside it, turning their lamps. The door behind it says STAFF ONLY, and it's the only door they never point a lamp at.",
          tells: 'Where to go, and where the lamps do not'},
        {id: 'dead-stairs', cue: 'open.clue.found',
          what: 'An escalator, stopped, going down into the hall.',
          thought: 'The moving stairs stopped moving thirty years ago, but they still go down. They come out behind the fountain, in the dark between the two lamps.',
          tells: 'The way down'},
      ],
      next: 'hall',
    },

    // The fountain hall. Two lamps turn, each with a cone of light. A lamp on the player for two seconds is a shout.
    hall: {
      when: {reach: ['dead-mall', 'hall']},
      thoughts: [{when: {chose: 'front-doors'},
        thought: 'The fountain is in the middle of the hall, and the only door near it says STAFF ONLY. The pump room must be through there, on the far side of both lamps.'}],
      mission: {id: `${ID}/mall/hall`, partOf: `${ID}/mall`,
        outcomes: {
          'not-seen': {next: 'penny'},
          seen: {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT, BOLTED_DOOR],
            effects: [mark('seen-in-the-mall', 'The Ash Men saw you in the Dead Mall.'),
              mark('door-found', 'The Ash Men know that there is a door behind the fountain.'),
              {type: 'feud', of: 'ash-men', by: 1}],
            // The player reaches the door and Mr Penny bolts it. The talk below is held in the corridor, and the shoe
            // shop is closed to the player for today.
            next: 'penny'},
          'ran-out': {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT],
            effects: [mark('seen-in-the-mall'), {type: 'feud', of: 'ash-men', by: 1}],
            next: 'road-out'},
        }},
    },

    penny: {
      when: {reach: ['dead-mall', 'staff-door']},
      notes: {
        // The book is signed after his second line, with the cue open.mall.book.
        signing: {after: 1, cue: 'open.mall.book', thought: 'The name above mine in his book was written thirty years ago.',
          effects: [mark('signed-the-book'),
            {type: 'met', person: 'mr-penny', text: 'You met Mr Penny under the Dead Mall, and signed his book.'}]},
      },
      lines: [
        penny("Come in quickly, please, and mind the step. I'm afraid the Seaview Centre is closed. We close at nine, and it has been after nine for thirty years.", low),
        penny("My name is Mr Penny, and I'm the night watchman. You'll be a contractor, because customers never use this door, and contractors sign the book."),
        penny("That's a number four foot valve, and it's cracked across the seat. You've come to the right building. I have a pump room, and I know every valve in it by its number."),
        penny("There were two number fours in this building. One of them is at the bottom of my own pipe, in the tank under the fountain, and it's how I make my tea."),
        penny("The other was on that shelf until last winter. The grey gentlemen carried it upstairs, along with a great many other things that weren't theirs. It's in the old shoe shop now, where they keep their store."),
        penny("You may have mine. A camp full of people needs it more than one old man needs tea. I can let a bucket down into the tank on a rope instead. It's thirty-one steps down and thirty-one up, and I've counted them before."),
      ],
      questions: [
        {id: 'why-here', words: 'Why are you still here?',
          shows: 'Who he is',
          lines: [penny("Somebody has to lock up, and I have the keys. I did write and ask to be relieved. The office hasn't answered yet, but the post has been slow since the sea went.")]},
        {id: 'grey-men', words: 'Who are the grey men upstairs?',
          shows: 'What he thinks of them',
          lines: [penny("They call themselves the Ash Men. They came in by the front doors, so I counted them as customers. I've told them twice that we're closed, and they've stayed, so now I count them as shoplifters.")]},
        {id: 'do-they-know', words: "Don't they know that you're here?", when: {asked: 'grey-men'},
          shows: 'Why the corridor is safe',
          lines: [penny("They've never found this door. In all my years of customers, hardly anybody has looked up, and nobody at all has looked behind a sign that says STAFF ONLY.")]},
        {id: 'the-lamps', words: 'How do they move their lamps?',
          shows: 'The gap: a count of twenty',
          lines: [penny("They turn their lamps the way a tired man stirs soup, slowly and always the same way round. Between one lamp leaving the shoe shop and the other arriving, I can count to twenty, and I've never needed more than fifteen to get across.")]},
        {id: 'way-out', words: 'Is there another way out?',
          shows: 'The way out, and the way in for next time',
          lines: [penny("Staff and contractors use the delivery tunnel. It runs from the end of this corridor to the lorry ramp on the south side. The ramp door is barred on the inside, which is why nobody has ever found it from the outside.")]},
      ],
      thoughts: [
        "He's offering me his own water as if it were nothing. I don't think it's nothing to him.",
        "The other valve is upstairs in the lamplight. If they see me taking it, I could lose the valve and the day as well.",
      ],
      choices: [
        {id: 'take-his', words: "Thank you. I'll take the one from your pipe.",
          plain: 'His tap stops. He said how he will manage',
          thought: "He'd be climbing thirty-one steps down and thirty-one up with a full bucket, at his age.",
          hidden: 'He hauls his water by hand from now on, and it shows when he is next met',
          lines: [penny('Then bring your wrench. I did that collar up myself thirty years ago, and I did it up properly, so it will take both of us.')],
          next: 'his-pipe'},
        {id: 'fetch-the-spare', words: "Keep yours. I'll go up and get the other one.",
          when: {not: did('door-found')},
          plain: 'Two lamps, and a count of twenty',
          thought: "It was his before it was theirs. I'd only be taking it back.",
          hidden: 'The shoe shop',
          lines: [penny("I hoped you'd say that, and I'd never have asked it of you. The shoe shop is the third door on the left from the top of my stairs, and the valve is on the counter beside the till. You'll have a count of twenty between the lamps, so try to be back behind this door by fifteen.")],
          next: 'shoe-shop'},
        {id: 'take-neither', words: "I'm sorry, but I can't take your water, and I can't get past those lamps.",
          plain: 'Nothing is taken',
          thought: "I'll have to tell them at the camp that there was a valve, and that I left it there.",
          hidden: 'The day is spent, and the camp is still dry',
          lines: [penny("There's no shame in that. I've been not getting past those lamps myself since last winter. Come back if you change your mind, because I'm here every night, and every day as well.")],
          next: 'tunnel'},
      ],
    },

    'his-pipe': {
      when: {after: 'penny'},
      // Hold the wrench on the pipe's collar for ten seconds while he lifts.
      mend: {id: `${ID}/penny-pipe`, wrenchSeconds: 10, scrap: 0, cue: 'open.valve.taken',
        after: [penny('There it is. Wrap it in this cloth, and don\'t knock the seat. I shall have one last cup of tea out of the kettle, and then I shall start counting steps.')],
        effects: [mark('took-penny-valve')]},
      choices: [
        {id: 'promise-the-spare', words: "I'll come back for the other one, and bring it down to you.",
          when: {not: did('door-found')},
          plain: 'A promise goes on the page: five nights',
          thought: "That's another day I'm promising away, and I haven't finished this one yet.",
          hidden: "Keeping it is another trip to the shoe shop, and in an act with a clock it is another day's outing",
          effects: [PENNY_PROMISE, mark('promised-penny')],
          lines: [penny("That's very civil of you. I'll enter it in the book as work outstanding. I ought to tell you that the book has a great deal of work outstanding in it.")],
          next: 'tunnel'},
        {id: 'say-nothing', words: 'Say nothing', plain: 'Nothing', next: 'tunnel'},
      ],
    },

    // Across the back of the hall to the third shop, and back with something heavy.
    'shoe-shop': {
      when: {reach: ['dead-mall', 'shoe-shop']},
      explore: [
        {id: 'ash-store', cue: 'open.clue.found',
          what: 'Sacks of ash to the ceiling, and rolls of wet blanket.',
          thought: "They've stacked sacks of ash in here right up to the ceiling, and rolls of wet blanket beside them. This is everything they use for putting fires out.",
          tells: 'What the Ash Men keep here',
          effects: [mark('saw-the-ash-store', 'You saw where the Ash Men keep their ash and their wet blankets.')]},
        {id: 'the-valve', cue: 'open.valve.taken',
          what: 'A brass valve on the counter, beside the till.',
          thought: "It's heavier than it looks. I can't run with this, so I'll have to stop behind the fountain and let a lamp go by.",
          tells: 'The way back is slower than the way there'},
      ],
      mission: {id: `${ID}/mall/shoe-shop`, partOf: `${ID}/mall`,
        outcomes: {
          'not-seen': {
            lines: [penny("You were back by fourteen, and I counted every one. You'd have made a very good night watchman, and I don't say that to contractors.")],
            effects: [mark('took-the-spare', "You took a brass valve back from the Ash Men's store in the Dead Mall.")],
            next: 'tunnel'},
          seen: {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT, BOLTED_DOOR],
            effects: [mark('took-the-spare'), mark('seen-in-the-mall'), mark('door-found'),
              {type: 'feud', of: 'ash-men', by: 1}],
            next: 'tunnel'},
          caught: {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT, ...CAUGHT],
            effects: [mark('seen-in-the-mall'),
              mark('caught-in-the-mall', 'The Ash Men caught you in their store and put you out of the Dead Mall.'),
              {type: 'feud', of: 'ash-men', by: 1}],
            // Put out by the front doors with nothing. The day is spent.
            next: 'came-home-empty'},
        }},
    },

    tunnel: {
      when: {reach: ['dead-mall', 'tunnel-door']},
      cue: 'open.mall.bar',
      lines: [
        penny("This is the contractors' way, so remember where it comes out. Next time, knock twice on this door, so that I know it isn't a customer."),
        penny('If that camp of yours has any tea, you might mention that the Seaview Centre has run rather short.'),
      ],
      thoughts: ["So that's the way in. It's a door behind four dead lorries, and nobody has looked at it for thirty years."],
      effects: [mark('mall-way-in', 'You know the way into the Dead Mall by the delivery tunnel.')],
      next: [{when: HAS_A_VALVE, to: 'road-out'}, {to: 'came-home-empty'}],
    },

    // Round the building to the car, and away. If the alarm was raised, two grey trucks come round the wall.
    'road-out': {
      when: {reach: ['dead-mall', 'car-park']},
      notes: {
        outcomeThen: {wrecked: 'towed-home'},
      },
      mission: {id: `${ID}/mall/road-out`, partOf: `${ID}/mall`,
        outcomes: {
          clear: {when: {not: did('seen-in-the-mall')}, next: [{when: HAS_A_VALVE, to: 'fitting'}, {to: 'came-home-empty'}]},
          outrun: {next: [{when: HAS_A_VALVE, to: 'fitting'}, {to: 'came-home-empty'}]},
          wrecked: {
            lines: [ashMan("That brass is going back on Old Smoke's counter. You can keep the car, or what's left of it.")],
            effects: [mark('valve-lost-on-the-road', 'The Ash Men took the valve back on the road.')],
            next: 'came-home-empty'},
        }},
    },

    // The day is spent and there is no valve. Mr Penny's own is still offered tomorrow, and the tunnel is known if
    // the player left by it. The camp's four days go on counting.
    'came-home-empty': {
      when: {after: ['penny', 'shoe-shop', 'road-out', 'tunnel']},
      thoughts: ["I spent the whole day on it, and their pump is as dry as it was this morning."],
      next: 'promised',
    },

    // ---- The camp again ----

    fitting: {
      when: {reach: '@camp'},
      // Hold the wrench on the foot of the pipe for twelve seconds. Then the pump is worked, and water comes.
      mend: {id: `${ID}/fit-the-valve`, wrenchSeconds: 12, scrap: 0, cue: 'open.pump.water',
        after: [
          leader("Listen to that. That's the sound of nobody having to pack the cart."),
          say('marigold', "Finch, stop grinning at the trough and go and water the beans. They've listened to that pump for two days, and they deserve some of what it brings up.",
            {when: AT_THE_GLASSHOUSE}),
          leader("You spent a whole day on water that you'll never drink. People here will be telling that to their children, and the first cup is yours."),
          leader("Where did you find it? We'd heard that the grey men had cleared that place out."),
        ],
        effects: [mark('water-back', 'You fetched a valve from the Dead Mall, and {camp.name} has water again.'),
          {type: 'settle', id: `${ID}/valve`}]},
      // The camp's word rises to Friendly when the promise was broken, and to Sworn otherwise.
      effects: [
        {...campWord({set: 'Friendly'}), when: did('promise-broken')},
        {...campWord({set: 'Sworn'}), when: {not: did('promise-broken')}},
      ],
      choices: [
        {id: 'tell-of-penny', words: 'An old man who lives under the Mall gave me the one out of his own pump.',
          when: did('took-penny-valve'),
          plain: 'The truth, and all of it',
          hidden: 'The camp takes on part of what the valve cost',
          effects: [mark('penny-has-friends', '{camp.name} carries water to Mr Penny, because you told them whose valve it was.')],
          lines: [leader("Then somebody we've never met is hauling a bucket tonight so that we don't have to, and we can't have that. Our cart will stop at his door with a barrel, every time it goes out.")]},
        {id: 'tell-half', words: 'I found it in the pump room.',
          when: did('took-penny-valve'),
          plain: 'Nothing',
          thought: "That's true, as far as it goes.",
          hidden: 'Nobody carries water to Mr Penny'},
        {id: 'tell-of-the-store', words: "I took it back from the Ash Men's store.",
          when: did('took-the-spare'),
          plain: 'The truth',
          lines: [leader("You took it from under Old Smoke's lamps, for us? Sit down, because you're not driving anywhere until you've had something to eat.")]},
      ],
      // The thread's end is named here.
      next: FITTING_END,
    },

    // Only for a player who took Mr Penny's own valve and promised him the other. A second trip, by the tunnel.
    'penny-owed': {
      when: {all: [{after: 'fitting'}, {after: FITTING_ENDS}, did('promised-penny'), {reach: ['dead-mall', 'tunnel-door']}]},
      mission: {id: `${ID}/second-trip`, kind: 'heist', holds: ['checkpoints', 'signs'], minutes: 6,
        lines: [penny("That was two knocks, so it's a contractor. I've kept your page of the book open, and the kettle has been very patient.")],
        outcomes: {
          'brought-down': {
            lines: [penny("You came back with it. I'll strike that out of the book, then. I've never struck anything out of the book before, and I find that I rather like it.")],
            effects: [mark('took-the-spare'),
              mark('penny-valve-returned', 'You brought Mr Penny the other valve, and his tap runs again.'),
              {type: 'settle', id: `${ID}/penny-valve`}],
            next: KEEP_FITTING_END},
          'seen-and-brought-down': {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT, BOLTED_DOOR,
              penny("You came back with it. I'll strike that out of the book, then. I've never struck anything out of the book before, and I find that I rather like it.")],
            effects: [mark('took-the-spare'), mark('penny-valve-returned'), mark('seen-in-the-mall'), mark('door-found'),
              {type: 'feud', of: 'ash-men', by: 1}, {type: 'settle', id: `${ID}/penny-valve`}],
            next: KEEP_FITTING_END},
          caught: {
            cue: 'open.mall.alarm', lines: [SEEN_SHOUT, ...CAUGHT],
            effects: [mark('seen-in-the-mall'), mark('caught-in-the-mall'), {type: 'feud', of: 'ash-men', by: 1}],
            next: KEEP_FITTING_END},
          broken: {
            when: {due: `${ID}/penny-valve`}, lines: [penny("I've left it in the book as work outstanding, like most things in the book. Please don't look so troubled, because I'm very used to waiting.")],
            effects: [mark('penny-promise-broken', 'You promised Mr Penny a valve, and did not bring it.'),
              {type: 'word', person: 'mr-penny', by: -1}, {type: 'settle', id: `${ID}/penny-valve`}],
            next: KEEP_FITTING_END},
        }},
    },

    // Nobody brought a valve. On the fifth day the camp loads its cart.
    'left-dry': {
      when: {nights: 4, since: 'asking'},
      effects: [mark('left-dry', '{camp.name} packed its cart and left, because its pump was dry.'),
        {type: 'site', id: '@camp', stage: 'empty'}],
      next: 'gone',
    },
  },

  ends: ['water-back', 'friends-fetched', 'late', 'gone', 'fetched-it-themselves'],

  // What happens when the sign is never followed: the player does not visit the camp while the need stands.
  ignored: {
    effects: [mark('fetched-it-themselves')],
    next: 'fetched-it-themselves',
  },

  // Lines that tie a consequence back to its choice. Each is said once, by the person its row names, some nights
  // after its condition became true.
  later: [
    {id: 'the-hearth-that-night', by: 'auntie-solder',
      when: did('water-back'),
      lines: [say('auntie-solder', "So Bess sat in the yard all day, and tonight's ember burns with nothing baked to replace it. I'm told there's a whole camp with water to drink tonight that wouldn't have had any. I've decided not to be cross until tomorrow.")]},
    {id: 'penny-and-the-bucket', by: 'mr-penny', at: ['dead-mall', 'tunnel-door'],
      when: {all: [did('took-penny-valve'), {not: did('penny-has-friends')}, {not: did('penny-valve-returned')}]},
      lines: [penny('I manage very well, thank you. The bucket and I have come to an understanding. It does the first twenty steps, and I do the rest rather slowly.')]},
    {id: 'penny-and-the-cart', by: 'mr-penny', at: ['dead-mall', 'tunnel-door'],
      when: did('penny-has-friends'),
      lines: [penny("A cart came to the tunnel door with a barrel of water and a twist of tea. I've entered it in the book under deliveries, and it's the first delivery in thirty years.")]},
    {id: 'the-ash-store', by: 'cinder',
      when: did('saw-the-ash-store'),
      lines: [say('cinder', "So that's where they keep it all. If that store ever got wet, the Ash Men would have nothing to throw for a week. I'm not suggesting anything. I'm only thinking out loud.")]},
    {id: 'they-walked-south', by: 'trader',
      when: did('left-dry'),
      lines: [say('trader', "I met a line of people on the road with a handcart, heading south for the pans. They told me their pump had failed, and that somebody with a car had been to see them, too. I didn't like to ask who.")]},
    // What happens when the sign is never followed: the camp says so on the next visit.
    {id: 'the-camp-went-themselves', by: '{camp.leader}', at: '@camp', when: did('fetched-it-themselves'),
      lines: [leader("The pump failed a while back. Three of us walked to the Dead Mall for a valve in the end, and it cost us nine days and most of our feet. You weren't to know. I only wish that you had.")]},
  ],

  notes: {
    ignoredWhat: 'The three strongest of the camp walk to the Dead Mall themselves. Mr Penny gives them his own valve. They are nine days about it.',
    // Where each `later` row is said, in the writer's words. The first row also waits on the day's clock: it is said
    // only when the trip was made in an act with a clock, which the shape has no condition for.
    laterWhere: {
      'the-hearth-that-night': 'the hearth, the night of the trip, in an act with a clock',
      'penny-and-the-bucket': 'the tunnel door, on any later visit',
      'penny-and-the-cart': 'the tunnel door, on any later visit',
      'the-ash-store': 'the hearth',
      'they-walked-south': 'the gate, or a road, by any trader',
      'the-camp-went-themselves': 'the camp, on the next visit',
    },
    laterWhen: {'the-hearth-that-night': 'outing-costs-the-gas-run'},
  },
};
