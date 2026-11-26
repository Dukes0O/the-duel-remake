// Dace goes looking: a thread of the open Scablands, written in full in docs/story/threads/dace-goes-looking.md and
// in the shape of docs/story/open-scablands.md section 18. Nothing loads this file yet; OPEN-THREADS will.
//
// How to read a beat. `lines` are talk bubbles in order, `thoughts` are the player's thought bubbles, `explore` lists
// what can be read by looking, `questions` cost nothing to ask, and `choices` are what the player says (the default)
// or does (`by: 'do'`). `plain` is what anybody could see before choosing and `hidden` is the writer's note of what
// the game keeps to itself; neither is shown as words. `words` and `thought` are shown exactly as written. A role's
// names are put into a line as {site.name} and {site.leader}, and into a condition or an effect as '@site' (the
// site) and '@site.people' (its people). `{nights: 2}` on a beat means: live once two hearths have been banked since
// the thread reached it. A draw is named short: the storyline rule puts the id and the night in front of it.
const ID = 'dace-goes-looking';
const say = (speaker, words, more) => ({speaker, words, ...more});
const dace = (words, more) => say('dace', words, more);
const rell = (words, more) => say('rell', words, more);
const moss = (words, more) => say('moss', words, more);
const auntie = (words, more) => say('auntie-solder', words, more);
const you = words => say('you', words);
const onRadio = {radio: true};
// A mark. Its sentence for the page What people remember is `text`, written once, on the first effect that makes it.
const mark = (what, text) => ({type: 'mark', id: `${ID}/${what}`, ...(text ? {text} : {})});
const did = what => ({fact: 'mark', id: `${ID}/${what}`});
const draw = (name, chance) => ({fact: 'draw', name, chance});
const all = (...facts) => ({all: facts});
const any = (...facts) => ({any: facts});
const not = fact => ({not: fact});
// The same lines, each said only when `when` is true.
const under = (when, lines) => lines.map(line => ({...line, when}));
// An effect that happens only when `when` is true.
const onlyWhen = (when, effect) => ({...effect, when});

// ---- What the player's choices do to his road ----
// His luck is drawn once, on the morning he leaves, and kept as marks, so that it is the same boy on every load and
// the log at the hearth agrees with what happened two nights before. Each draw is an effect with its draw in `when`.
const ROLLS = [
  // The long hill, at noon on the first day: the engine boils three times in five, unless the radiator was mended.
  onlyWhen(draw('hill', .6), mark('hill-unkind')),
  // The stones, that afternoon: a tyre goes one time in two. With the spare mended, he changes the wheel and goes on.
  onlyWhen(draw('stones', .5), mark('tyre-goes')),
  // Riders at a crossing on the way home, at noon on the second day: two times in five, and more when the Road Rats
  // are Raiding.
  onlyWhen(any(draw('riders', .4), all({fact: 'feud', of: 'road-rats', atLeast: 'Raiding'}, draw('riders-raiding', .2))),
    mark('riders-come')),
  // A boy told to hide from flags spends half a day behind wrecks, and one time in two still reaches the place.
  onlyWhen(draw('in-time', .5), mark('in-time')),
];
// Left to wait a night with nobody telling him to stay, he starts walking home one time in two.
const WALK_ROLL = onlyWhen(all(not(did('told-stay')), draw('walks', .5)), mark('walked'));

const TRUSTED = did('told-trust');
const TOLD_TO_HIDE = did('told-hide');
const TOLD_TO_STAY = did('told-stay');
const WITHOUT_LEAVE = did('took-it-in-the-night');
const HILL_IS_UNKIND = did('hill-unkind');
const BOILED = all(not(did('radiator-mended')), HILL_IS_UNKIND);
const TYRE_GOES = did('tyre-goes');
const FLAT_AND_NO_SPARE = all(not(did('spare-mended')), TYRE_GOES);
// The first trouble stops him where it happens, unless he was told that he would know what to do. Then he limps on.
const STOPPED_ON_THE_HILL = all(BOILED, not(TRUSTED));
const STOPPED_ON_THE_STONES = all(not(STOPPED_ON_THE_HILL), FLAT_AND_NO_SPARE, not(TRUSTED));
const REACHED_THE_PLACE = all(not(STOPPED_ON_THE_HILL), not(STOPPED_ON_THE_STONES));
const OUT_OF_TIME = all(TOLD_TO_HIDE, not(did('in-time')));
const STOOD_ON_IT = all(REACHED_THE_PLACE, not(OUT_OF_TIME));
const SAW_IT_FROM_A_RIDGE = all(REACHED_THE_PLACE, OUT_OF_TIME);
// He limped there on a boiling engine or a flat tyre, and cannot get back by dusk.
const STRANDED_AT_THE_PLACE = all(TRUSTED, any(BOILED, FLAT_AND_NO_SPARE));
// A boy who was told to hide is never found by the riders.
const RIDERS_COME = did('riders-come');
const PICKUP_TAKEN = all(REACHED_THE_PLACE, not(STRANDED_AT_THE_PLACE), not(TOLD_TO_HIDE), RIDERS_COME);
const HOME_BY_HIMSELF = all(REACHED_THE_PLACE, not(STRANDED_AT_THE_PLACE), not(PICKUP_TAKEN));
const TROUBLE_ON_THE_FIRST_DAY = any(STOPPED_ON_THE_HILL, STOPPED_ON_THE_STONES);
const CALLS_AT_NOON_AND_DUSK = did('radio-check');
const HAS_A_RADIO = did('radio-mended');
const WALKED = did('walked');

const RADIO_HILL_HEARS = {fact: 'word', of: 'radio-hill', atLeast: 'Friendly'};
const THE_STONES = {id: 'the-stones', to: 'rell', words: 'Rell, how do I find a Walker who is on foot?',
  shows: 'How to follow Dace if he has left the truck',
  lines: [rell("He'll leave our mark: three stones in a row, with the smallest one pointing the way he went. Every Walker does it without thinking. Look for the stones before you look for the boy.")]};
const SQUARE = [
  you("We're square, Dace."),
  dace("That's good. I'm going to go and tell Wim that I'm square. She won't know what it means, and I'm going to tell her anyway."),
];
// How the story closes at the hearth, by what happened. The rows are exclusive, so that each is said on its own.
const FOUND_ALONE = all(HOME_BY_HIMSELF, STOOD_ON_IT);
const SEEN_ALONE = all(HOME_BY_HIMSELF, SAW_IT_FROM_A_RIDGE);
const FETCHED_AND_FOUND = all(not(HOME_BY_HIMSELF), STOOD_ON_IT);
const FETCHED = all(not(HOME_BY_HIMSELF), not(STOOD_ON_IT));
// He takes the pickup in the night one time in two, or one in five if the player asked him straight out.
const TAKES_IT = any(all(did('asked-about-the-key'), draw('takes-it-asked', .2)),
  all(not(did('asked-about-the-key')), draw('takes-it', .5)));

export default {
  id: ID,
  title: 'Dace goes looking',
  kind: 'need',

  reads: ['word', 'mark', 'debt', 'found', 'feud', 'made', 'night'],
  writes: ['find', 'word', 'scrap', 'mark', 'rumour'],

  // Dace is himself, so he is no role: his id is written where the role was.
  cast: {
    // A place nobody has shown the player, and not an enemy's den: a camp, a well site, a ruin or a lookout (the
    // kinds are under `notes`).
    site: {from: 'sites', where: {not: {fact: 'found'}}},
  },

  // The Walkers live inside the fence or are Friendly; Dace owes the player; and he was never sent away.
  starts: {all: [
    {fact: 'night', atLeast: 2},
    any({fact: 'mark', id: 'walkers-inside'}, {fact: 'word', of: 'walkers', atLeast: 'Friendly'}),
    // He owes: he was caught with the embers and taken to Rell, or his secret was kept, or he reached the Wash with
    // them (the Walkers' great favour), or any later debt of his own.
    any({fact: 'mark', id: 'dace-runner'}, {fact: 'mark', id: 'dace-secret'},
      {fact: 'debt', id: 'walkers-great-favour'}, {fact: 'debt', person: 'dace'}),
    not({fact: 'mark', id: 'dace-sent-away'}),
    not({fact: 'thread', id: ID, at: 'any'}),
    draw('start', .5),
  ]},

  // A person's words: Dace's request. He waits by the old pickup in the forge yard for three mornings. He asks for
  // two days, so in an act with a clock the director does not begin this with fewer than two nights left.
  sign: {kind: 'words', by: 'dace', at: ['tin-town', 'forge-yard'], seenWithin: 30, lastsNights: 3, nightsNeeded: 2},

  beats: {
    sign: {
      when: 'sign-seen',
      thoughts: [
        "Somebody has pulled the cover off Moss's old pickup, and Dace is sitting on its roof as if he owned it.",
        "He's been watching me all the way across the yard. He wants something, and he's been working up to it.",
      ],
      next: 'asking',
    },

    asking: {
      notes: {
        when: {reach: 'dace'},
        questionEffects: {'take-it-anyway': [mark('asked-about-the-key')]},
      },
      lines: [
        dace("I've been waiting for you. I want to ask you for something, and I've practised it, so please let me get to the end."),
        dace("I owe you, and I'm tired of it. Everybody in my family pays what they owe, and I'm the only one who's still paying."),
        dace("I've carried your town's water every day since that night, and I'll carry it for the rest of the month. It still won't feel paid.",
          {when: {fact: 'mark', id: 'dace-runner'}}),
        dace("You kept quiet about those embers when you didn't have to. I think about that every time Rell looks at me.",
          {when: {fact: 'mark', id: 'dace-secret'}}),
        dace("On the walk here I saw something, a long way off the road. Rell wouldn't stop for it, and I've thought about it every night since."),
        dace("Lend me this pickup for two days. I'll go and find out what it is, and whatever I find is yours. Then we're square, and I'll have done it by myself."),
        dace("Moss says I can have the pickup if you say so. Rell says I can go if you say so. Auntie Solder says it's nothing to do with her. So it's you."),
      ],
      questions: [
        {id: 'what-he-saw', to: 'dace', words: 'Dace, what did you see?',
          shows: 'He will not say, because he wants it to be his',
          lines: [dace("I don't know what it was, and that's why I want to go. If I tell you any more, you'll drive out and find it yourself in that car, and then I'll still owe you.")]},
        {id: 'can-he-drive', to: 'dace', words: 'Dace, can you drive?',
          shows: 'He has hardly driven at all',
          lines: [dace('Moss let me drive Bess round the yard twice. I only hit the water barrel once, and it was empty. A pickup is smaller than Bess, so it must be easier.')]},
        {id: 'the-pickup', to: 'moss', words: "Moss, what's wrong with the pickup?",
          shows: 'The three things that can be mended',
          lines: [moss("There are three things, and I'll tell you all of them. Her radiator weeps, so she boils on a long hill. Her spare wheel is flat and bald. Her radio hisses and does nothing else. I never mended her, because I had Bess.")]},
        {id: 'the-price', to: 'moss', words: 'Moss, what would it cost to mend her?', when: {asked: 'the-pickup'},
          shows: 'The prices, and that there may not be scrap for all three',
          lines: [moss("It's eight scrap for the radiator, six for the spare and ten for the radio, and your own hands on the wrench. Mend what you can afford. I'd start with whatever frightens you most.")]},
        {id: 'rell-wants', to: 'rell', words: 'Rell, do you want him to go?',
          shows: 'Rell will not decide it for the player',
          lines: [rell("He walked nine days across the salt, and he kept Wim's feet moving the whole way. I was raking salt on my own at twelve. I don't like it and I won't stop it, and that's all the blessing he'll get from me.")]},
        THE_STONES,
        {id: 'auntie-thinks', to: 'auntie-solder', words: 'Auntie, what do you think?',
          shows: 'What waits at home if it goes wrong',
          lines: [auntie("I'm not saying a word. I said a word about the Walkers at the gate, and look how wrong I was. But if that boy isn't back by dusk on the second day, I shall have several words, and you'll hear all of them.", onRadio)]},
        {id: 'the-key', to: 'dace', words: 'Dace, why do you keep looking at that key?',
          shows: 'A tell: the key hangs on a nail by the forge door, and he knows exactly where',
          lines: [dace("I wasn't looking at it. I was only seeing where it was.")]},
        {id: 'take-it-anyway', to: 'dace', words: 'Dace, if I say no, will you take it anyway?', when: {asked: 'the-key'},
          shows: 'Out of sight, it makes him less likely to take the pickup if he is refused',
          lines: [dace("I thought about it for most of last night. Then I thought about what taking things has cost me already, and I decided to ask you. I'd like that to count for something.")]},
      ],
      thoughts: [
        "He's fourteen, he has driven twice round a yard, and that pickup hasn't left this one in years.",
        "He walked nine days to get here. I wonder what it does to somebody, to be told that he can't go any further.",
      ],
      choices: [
        {id: 'yes', words: "All right. You can have two days. Let's get this truck fit to go first.",
          plain: 'The pickup leaves the yard with Dace in it',
          thought: "Whatever happens to him out there, I'm the one who said yes.",
          hidden: 'The getting ready. Then a named draw for each trouble on his road',
          effects: [mark('let-him-go', 'You let Dace take the old pickup out alone for two days.')],
          lines: [dace("You said yes. I had a whole other speech ready for when you said no. I'll save it for something else.")],
          next: 'ready'},
        {id: 'together', words: "You can go, but I'm coming with you. We'll take my car.",
          plain: "The day's outing, spent on Dace's errand",
          thought: "He'd be safe with me. I'm not sure that safe is what he asked for.",
          hidden: 'A day\'s drive together. The place is found. He still thinks that he owes',
          effects: [mark('went-together', 'You and Dace went looking together, in your car.')],
          lines: [dace("Then it's you who'll have found it, and I'll have sat beside you and watched. I'll come, because I want to see it. But I'll still owe you afterwards, and we'll both know it.")],
          next: 'together'},
        {id: 'no', words: "No. You're not going on your own, and you're not going in that truck.",
          plain: 'The pickup stays under its cover',
          thought: 'I wonder whether he heard no, or only heard not yet.',
          hidden: 'A named draw: he may take it in the night, with nothing mended and nothing said',
          effects: [mark('refused', 'Dace asked you for the old pickup, and you said no.')],
          lines: [
            dace("All right. You're the one I owe, so you're the one who says."),
            rell('He took that too quietly. When that boy goes quiet, I count the carts.', {low: true}),
          ],
          next: 'key'},
      ],
    },

    // ---- Yes: getting the truck ready ----
    // The beat of the writer's `ready` is four beats here: the mending, the radio check, the telling and the leaving.

    ready: {
      when: {after: 'asking'},
      notes: {
        // Said after each mend, in the order of `mends`; the radio's mend has a cue.
        afterMend: {
          radiator: [dace("Is that all it was? It's a hole the size of a pea, and she's sat in this yard for years because of it.")],
          spare: [moss("That's a tyre with air in it. She hasn't had one of those to spare for longer than I've had Bess.")],
          radio: [auntie("Who is that on the old pickup's set? I haven't heard that set since before the fire went out. Tell the boy that it works both ways, and that I'm listening.", onRadio)],
        },
        mendCue: {radio: 'open.pickup.radio'},
      },
      // Three things to mend at the pickup, in any order, for as long as the scrap lasts.
      mends: [
        {id: `${ID}/radiator`, what: 'The radiator weeps.', wrenchSeconds: 10, scrap: 8, effects: [mark('radiator-mended')]},
        {id: `${ID}/spare`, what: 'The spare wheel is flat and bald.', wrenchSeconds: 8, scrap: 6, effects: [mark('spare-mended')]},
        {id: `${ID}/radio`, what: 'The radio hisses and does nothing else.', wrenchSeconds: 12, scrap: 10, effects: [mark('radio-mended')]},
      ],
      next: [{when: HAS_A_RADIO, to: 'radio-check'}, {to: 'telling'}],
    },

    // Only with the radio mended.
    'radio-check': {
      when: HAS_A_RADIO,
      choices: [
        {id: 'call-twice-a-day', words: 'Call me at noon and at dusk, both days.',
          plain: 'He calls four times. A call can come in the middle of anything',
          thought: "If he calls and he's in trouble, I'll have to choose what to drop.",
          hidden: 'When trouble comes the player knows at once, and knows where',
          effects: [mark('radio-check')],
          lines: [dace("You want me to call at noon and at dusk? That isn't going on my own. That's going on a string. All right, I'll call. But I'm going to say that there's nothing to report, in a very bored voice.")],
          next: 'telling'},
        {id: 'radio-if-needed', words: "The radio is there if you need it.",
          plain: 'He calls only if he has to',
          hidden: 'He calls at dusk, when he has already tried everything else',
          lines: [dace("I won't need it. But I'll know where it is.")],
          next: 'telling'},
      ],
    },

    telling: {
      lines: [dace("Rell tells me nine things every morning, and by noon I can't remember any of them. Tell me one thing, and I'll keep it.")],
      thoughts: ["I can only give him one thing to carry. Whatever I leave out, he'll have to find out for himself."],
      choices: [
        {id: 'tell-hide', words: "If you see a flag you don't know, get off the road and wait until it's gone.",
          plain: 'He will hide from strangers',
          thought: 'Hiding takes time, and he only has two days.',
          hidden: 'Riders never find him. One time in two he runs out of time in sight of the place',
          effects: [mark('told-hide', "You told Dace to get off the road when he saw a flag he didn't know.")],
          lines: [dace("Get off the road and wait. I can do that. I'm good at not being seen. You'd know.")],
          next: 'leaving'},
        {id: 'tell-stay', words: 'If the truck stops, stay with the truck.',
          plain: 'He will not walk off',
          thought: "A truck is easy to find. A boy on foot isn't.",
          hidden: 'If he has to be fetched, he is where the truck is',
          effects: [mark('told-stay', 'You told Dace to stay with the truck.')],
          lines: [dace("Stay with the truck. Do I stay even if it's on fire? All right, I won't if it's on fire. Otherwise I stay.")],
          next: 'leaving'},
        {id: 'tell-trust', words: "You walked nine days to get here. You'll know what to do.",
          plain: 'Nothing to keep, except that somebody trusted him',
          thought: "It isn't advice at all. I'm not sure why it feels like the most important one.",
          hidden: 'He goes all the way to the place, whatever happens to the truck. He is not careful',
          effects: [mark('told-trust', 'You told Dace that he would know what to do.')],
          lines: [dace("That isn't a thing to remember. No, wait, it is. I'll keep it.")],
          next: 'leaving'},
      ],
    },

    // His luck is drawn here, once, as the effects below.
    leaving: {
      cue: 'open.pickup.started',
      lines: [
        rell('Here\'s a blanket and two days of water. You slept nine nights on the salt with no fire, so one night in a cab with a roof on it is a holiday.'),
        rell("Be back by dusk on the second day, Dace. I'm not going to say it twice."),
        dace('You said it at breakfast as well.'),
        say('wim', 'Is Dace allowed to drive? He hit a barrel.'),
        dace('The barrel was empty!'),
      ],
      thoughts: ["The pickup pulls to the left, and he's already steering against it. He looked back at the gate once, and he didn't wave."],
      effects: ROLLS,
      next: 'away',
    },

    // ---- Two days ----

    // Nothing of his road is shown. The player's own days go on, and these are heard on the radio. A trouble call
    // comes at once when a check was agreed, at dusk when the radio is only there if needed, and at once in either
    // case when Radio Hill is Friendly, because the sisters pass it on.
    away: {
      when: {after: ['leaving', 'night-after']},
      notes: {
        // For each line below, in order: its id, and the moment it is said and its cue where the writer gave them.
        // The last line is said after any of the four trouble calls, so that the map can show a circle 600 metres
        // across.
        lineMoments: [
          {id: 'first-noon', at: 'noon on the first day', cue: 'open.pickup.call'},
          {id: 'first-dusk', at: 'dusk on the first day', cue: 'open.pickup.call'},
          {id: 'second-noon', at: 'noon on the second day', cue: 'open.pickup.call'},
          {id: 'call-hill', cue: 'open.pickup.call'},
          {id: 'call-stones', cue: 'open.pickup.call'},
          {id: 'call-riders', cue: 'open.pickup.call'},
          {id: 'call-place', cue: 'open.pickup.call'},
          {id: 'call-where'},
        ],
        relayed: {when: all(HAS_A_RADIO, RADIO_HILL_HEARS, not(CALLS_AT_NOON_AND_DUSK)),
          note: 'The sisters of Radio Hill hear the old set and pass the call on at once, as if a check had been agreed.'},
      },
      lines: [
        dace("It's noon, and this is Dace. There's nothing to report. That was my bored voice. Did it sound bored?",
          {...onRadio, when: all(CALLS_AT_NOON_AND_DUSK, not(TROUBLE_ON_THE_FIRST_DAY))}),
        dace("It's dusk, and I've stopped for the night. I can see more stars from here than I can from Tin Town. There's nothing to report. Tell Rell that I ate.",
          {...onRadio, when: all(CALLS_AT_NOON_AND_DUSK, not(TROUBLE_ON_THE_FIRST_DAY))}),
        dace("It's noon, and I've found it. I'm not telling you what it is on the radio, because anybody could be listening. I'm coming home.",
          {...onRadio, when: all(CALLS_AT_NOON_AND_DUSK, HOME_BY_HIMSELF, STOOD_ON_IT)}),
        dace("It's Dace. I'm all right, so don't start by asking me that. The truck has boiled over on the long hill, and I've given it all of my drinking water. It's still dry, and now so am I.",
          {...onRadio, when: all(HAS_A_RADIO, STOPPED_ON_THE_HILL)}),
        dace("It's Dace. A tyre has gone on the stones, and the spare is as flat as the one that went. I'm sitting on the bonnet. I'm not in a hurry. The sun is, though.",
          {...onRadio, when: all(HAS_A_RADIO, STOPPED_ON_THE_STONES)}),
        dace("It's Dace, and I have to be quick. There are buggies behind me with a flag I don't know. I'm going to leave the truck and get into the rocks. Look for the stones.",
          {...onRadio, low: true, when: all(HAS_A_RADIO, PICKUP_TAKEN)}),
        dace("It's Dace. I found it, and I'm standing on it. The truck got me here and it won't get me back, so I'm not going to be home by dusk. Don't tell Rell the last part first.",
          {...onRadio, when: all(HAS_A_RADIO, STRANDED_AT_THE_PLACE)}),
        dace("I'm on the road that we walked in by, about a morning's drive from the gate. I've tied my blanket to the aerial, so look for something red.",
          {...onRadio, when: HAS_A_RADIO}),
      ],
      next: [
        {when: HOME_BY_HIMSELF, to: 'hearth'},
        {when: HAS_A_RADIO, to: 'call'},
        {to: 'late'},
      ],
    },

    // He has called, and he needs fetching.
    call: {
      notes: {when: {call: 'trouble'}},
      thoughts: [
        "He says he's all right, and he's said it first, which is what people do when they aren't sure.",
        "If I go now, I leave what I'm doing. If I wait for morning, he's out there tonight by himself.",
      ],
      choices: [
        {id: 'go-now', by: 'do', words: 'Leave what you are doing and drive to him',
          plain: 'Whatever today\'s outing was, it goes on without the player. On a gas run, Moss takes Bess on alone',
          thought: "Whatever I was doing can wait. He can't wait for very long.",
          hidden: 'The fetch, today. Bess comes home with more holes',
          next: 'search'},
        {id: 'at-first-light', words: "Sit tight, Dace. I'll come at first light.",
          plain: 'He spends the night out, with the truck',
          thought: 'He has a blanket and a cab. He walked here with less than that.',
          hidden: "The fetch is tomorrow's outing. If nobody told him to stay with the truck, he may start walking",
          effects: [mark('left-until-morning'), WALK_ROLL],
          lines: [dace("I'll wait for first light, then. I'll be here. I mean, I'll be somewhere, and it will be here.", onRadio)],
          next: 'search'},
      ],
    },

    // No radio. Dusk on the second day, at the hearth, and the gate has not opened.
    late: {
      when: {nights: 2},
      notes: {at: 'hearth'},
      lines: [
        rell("He said dusk on the second day. It's dusk on the second day, and that gate hasn't moved."),
        auntie("I said I'd have several words if this happened. I find that I've only the one, and it's go."),
      ],
      thoughts: [
        'Nobody knows where he is. All I know is which road he took, and that the pickup pulls to the left.',
        'It will be dark in an hour, and tracks are hard to read by lamplight.',
      ],
      choices: [
        {id: 'go-tonight', by: 'do', words: 'Drive out after him now',
          plain: 'Night, and one set of tracks',
          thought: "Every hour that I wait is an hour that he's out there wondering whether anybody is coming.",
          hidden: 'A search by lamplight. The stones are harder to see',
          next: 'search'},
        {id: 'go-at-dawn', words: "I'll go at first light.",
          plain: 'Rell picks up her stick',
          thought: "I'll find him faster by daylight. I hope he knows that somebody is coming.",
          hidden: 'Rell walks out tonight, and is not on the fence. He spends a third night out, and may have walked',
          effects: [mark('left-until-morning'), mark('rell-walked', 'Rell walked out in the dark to look for Dace.'), WALK_ROLL],
          lines: [rell("Then I'll start walking now, and you can pick me up on the road in the morning. I'm not angry with you. I just can't sit.")],
          next: 'search'},
      ],
    },

    // ---- The fetch ----

    search: {
      when: {after: ['call', 'late', 'night-after']},
      notes: {
        // What he says when he is found: one of these, by what stopped him, in the order of the mission's first five
        // lines. How he gets home, as the writer put it.
        foundHome: {
          'on-the-hill': 'Mend the radiator where it stands, for its seconds and its scrap, and fill it from the car\'s can. He drives home behind the car.',
          'on-the-stones': 'He rides home in the car. The pickup is left, and Moss fetches it with Bess the next morning.',
          'in-the-rocks': 'He rides home in the car. The pickup stands at the Rats\' Nest.',
          'at-the-place': 'By which fault it was: the radiator is mended there, or the pickup is left for Moss.',
          walking: 'He rides home in the car from wherever the stones end.',
        },
        // The road home, with the checkpoints left armed. When he never reached the place, the map shows a rumour's
        // circle for it (section 16): the last of the effects below.
        outcomeThen: {'car-wrecked': 'towed-home'},
      },
      mission: {id: `${ID}/fetch`, kind: 'rescue', holds: ['signs'], minutes: 8,
        lines: [
          dace("I gave her all my water, and she drank the lot and wanted more. I've been sitting under her since noon. I'd like it known that I didn't cry. I thought about it.",
            {when: STOPPED_ON_THE_HILL}),
          dace("I got the wheel off by myself. Then I found out that the spare was flat as well, so I put the first one back on. It took me all afternoon, and it didn't help at all.",
            {when: STOPPED_ON_THE_STONES}),
          dace("They took the truck and left me my boots, because my boots were too small for any of them. I didn't tell them anything. They didn't ask me anything, but I wouldn't have.",
            {when: PICKUP_TAKEN}),
          dace("I got here. I couldn't get back again, but I got here. Look at it. I found that.",
            {when: STRANDED_AT_THE_PLACE}),
          dace("I thought nobody knew where I was, so I started walking home. I put the stones down every time I turned. I didn't think anybody would know to look for them.",
            {when: all(WALKED, not(any(STOPPED_ON_THE_HILL, STOPPED_ON_THE_STONES, PICKUP_TAKEN, STRANDED_AT_THE_PLACE)))}),
          dace("Is this how fast you always go? I thought the pickup was fast. The pickup isn't fast, is it?"),
          dace("It's still out there, further along that road than I got. Give me your map, and I'll show you how far I'd come.",
            {when: not(REACHED_THE_PLACE)}),
        ],
        outcomes: {
          'brought-home': {effects: [mark('fetched-home', 'Dace took the old pickup out alone, and you went and brought him home.')], next: 'hearth'},
          'car-wrecked': {effects: [mark('fetched-home'), mark('pickup-left-out')], next: 'hearth'},
        }},
      explore: [
        {id: 'his-tracks', cue: 'open.clue.found',
          what: 'One set of tyre tracks on the road he took.',
          thought: 'These are his tracks. The left one is deeper all the way along, because the pickup pulls that way and he leans on the wheel to stop it.',
          tells: 'Which fork he took'},
        {id: 'red-blanket', cue: 'open.scout.seen', when: any(TOLD_TO_STAY, not(WALKED)),
          what: 'Something red on an aerial, a long way off.',
          thought: "There's something red tied to an aerial out there. That's Rell's blanket, so that's the pickup.",
          tells: 'Where the truck is'},
        {id: 'three-stones', cue: 'open.clue.found', when: any(PICKUP_TAKEN, WALKED),
          what: 'Three stones in a row at the side of the road.',
          thought: 'Somebody has put three stones in a row here, and the smallest one points up that gully.',
          tells: 'The way he went on foot, for a player who asked Rell what the stones mean'},
      ],
      questions: [
        {...THE_STONES, lines: THE_STONES.lines.map(line => ({...line, ...onRadio}))},
        {id: 'ask-keeper', to: 'keeper', words: 'Keeper, did a pickup go by your tower?',
          when: {fact: 'made', id: 'tower/crows-step'},
          shows: 'Which fork he took, without reading the tracks',
          lines: [say('keeper', 'A pickup went by yesterday morning, pulling to the left the whole way. It took the north fork, and I never saw it come back.', onRadio)]},
      ],
      // What was found, by what stopped him. When he never reached the place, the map shows a rumour's circle for it.
      effects: [
        onlyWhen(STOPPED_ON_THE_STONES, mark('pickup-left-out', 'The old pickup was left out on the road, and Moss had to fetch it.')),
        onlyWhen(PICKUP_TAKEN, mark('pickup-taken', "The Road Rats have Moss's old pickup.")),
        onlyWhen(not(REACHED_THE_PLACE), {type: 'rumour', site: '@site'}),
      ],
    },

    // ---- The hearth, and the log ----

    hearth: {
      notes: {
        when: {at: 'hearth'},
        // The lines after the first are the log, said in this order. Each entry is said when its condition is true,
        // and an entry with no condition always. The lines after the log are how the story closes: the first of the
        // four rows whose condition is true, written here as four exclusive conditions.
        closesIds: ['found-alone', 'seen-alone', 'fetched-and-found', 'fetched'],
      },
      cue: 'open.pickup.home',
      lines: [
        dace('Walkers keep a road in their heads. You say one thing for each part of the day, and you say it over until it stays. This is mine.'),
        dace("Before the first morning, I took the truck without asking. I'm putting that first, so that nobody can say I left it out.",
          {when: WITHOUT_LEAVE}),
        dace("On the first morning, I found out that the pickup pulls to the left. I've decided that she's meant to."),
        dace('At noon on the first day, the long hill made the engine tick like a beetle, and nothing came out of it. You mended the right thing.',
          {when: did('radiator-mended')}),
        dace("At noon on the first day, the long hill made the engine steam like a kettle, and then it stopped steaming. I don't know why. I said thank you to it.",
          {when: all(not(did('radiator-mended')), not(HILL_IS_UNKIND))}),
        dace("At noon on the first day, the engine boiled over on the long hill and drank all my water. That's where you found me, so you know the rest of that day.",
          {when: STOPPED_ON_THE_HILL}),
        dace('At noon on the first day, the engine boiled over on the long hill. I let it cool down, and then I went on in little runs, a hundred breaths at a time. It took until dark.',
          {when: all(BOILED, TRUSTED)}),
        dace('That afternoon, a tyre went bang on the stones. I changed the wheel by myself, and it only took me three tries.',
          {when: all(not(STOPPED_ON_THE_HILL), did('spare-mended'), TYRE_GOES)}),
        dace('That afternoon, the stones were as sharp as rakes, and I drove over them as if they were eggs. Nothing went bang.',
          {when: all(not(STOPPED_ON_THE_HILL), not(TYRE_GOES))}),
        dace('That afternoon, a tyre went bang on the stones, and the spare was flat too. I sat on the bonnet and I stayed with the truck, like you said.',
          {when: all(STOPPED_ON_THE_STONES, TOLD_TO_STAY)}),
        dace("That afternoon, a tyre went bang on the stones, and the spare was flat too. That's where the truck stopped, and I've told you what I did after that.",
          {when: all(STOPPED_ON_THE_STONES, not(TOLD_TO_STAY))}),
        dace("That afternoon, a tyre went bang on the stones. I drove on with it flat, very slowly, and it made a noise like Auntie's ladle in a pot.",
          {when: all(not(STOPPED_ON_THE_HILL), FLAT_AND_NO_SPARE, TRUSTED)}),
        // Not said when he was fetched on the first day, before he had slept anywhere.
        dace('On the first night, I slept in the cab. The windows froze on the inside, and I drew Wim on one of them with my finger. She was gone by morning.',
          {when: any(not(TROUBLE_ON_THE_FIRST_DAY), did('left-until-morning'), not(HAS_A_RADIO))}),
        dace("On the second morning, I found it. I'm not going to tell you what it is, because you'll have to come and see. I stood in the middle of it for a while, because I was the first.",
          {when: STOOD_ON_IT}),
        dace("On the second morning, I saw it from a ridge, a long way off. I'd spent too long hiding from flags to go down to it, and I'd promised dusk. I can show you where to stand.",
          {when: SAW_IT_FROM_A_RIDGE}),
        dace("At noon on the second day, I saw a flag I didn't know, so I got off the road and sat behind a wreck, the way you told me. Six buggies went past. I counted them twice.",
          {when: all(REACHED_THE_PLACE, not(STRANDED_AT_THE_PLACE), TOLD_TO_HIDE, RIDERS_COME)}),
        dace("At noon on the second day, buggies came up behind me, so I left the truck and got into the rocks. They took the truck. I put down three stones and waited, and I'm not proud of that part.",
          {when: PICKUP_TAKEN}),
        dace("At dusk on the second day, I got home, and so did the truck. I'd like it remembered that I didn't hit anything. I hit one thing, but it was already broken.",
          {when: HOME_BY_HIMSELF}),
        dace("The last part is that you came for me. I'll say that part every time I tell this, so you needn't worry that I'll leave it out.",
          {when: not(HOME_BY_HIMSELF)}),
        // How it closes.
        dace("That's all of it. The place is yours, like I said it would be. I don't owe you anything now, and I'd like you to say so out loud.",
          {when: FOUND_ALONE}),
        ...under(FOUND_ALONE, [
          ...SQUARE,
          rell("You trusted my boy with a truck and two days. I don't know yet whether that was wise. I do know that it was trust, and Walkers don't forget that."),
          auntie("He came back, he brought the truck back, and he found something. I had several words ready, and it seems that I shan't need them. I'll keep them for another day."),
        ]),
        dace("That's all of it. I didn't stand on it, so I don't know whether it counts. But I can put you on the ridge where I stood, and you can see it from there.",
          {when: SEEN_ALONE}),
        ...under(SEEN_ALONE, [
          ...SQUARE,
          rell("You trusted my boy with a truck and two days. I don't know yet whether that was wise. I do know that it was trust, and Walkers don't forget that."),
        ]),
        dace("That's all of it. I found it, and then you found me. I think that makes us square, but you'd better say so, because I can't tell any more.",
          {when: FETCHED_AND_FOUND}),
        ...under(FETCHED_AND_FOUND, [
          ...SQUARE,
          rell("You let him go, and then you went and got him. Both of those were yours to do, and you did both. I've nothing to add to that."),
        ]),
        ...under(FETCHED, [
          dace("That's all of it. I still owe you, and now I owe you for coming to get me as well. I'm going to stop counting soon, because the numbers are getting silly."),
          rell("You let him go, and then you went and got him. Both of those were yours to do, and you did both. I've nothing to add to that."),
          auntie("I had several words ready for you. I've decided to feed the boy first and say them afterwards, and by then I expect I'll have forgotten most of them."),
        ]),
      ],
      effects: [
        onlyWhen(FOUND_ALONE, {type: 'find', site: '@site'}),
        onlyWhen(FOUND_ALONE, mark('site-found-by-dace', 'Dace found {site.name} by himself, and gave it to you.')),
        onlyWhen(FOUND_ALONE, mark('square', 'Dace has paid what he owed you, and you said so out loud.')),
        onlyWhen(FOUND_ALONE, {type: 'word', person: 'walkers', by: 1}),
        onlyWhen(SEEN_ALONE, {type: 'rumour', site: '@site'}),
        onlyWhen(SEEN_ALONE, mark('site-seen-by-dace', 'Dace saw {site.name} from a ridge, and showed you where to stand.')),
        onlyWhen(SEEN_ALONE, mark('square')),
        onlyWhen(SEEN_ALONE, {type: 'word', person: 'walkers', by: 1}),
        onlyWhen(FETCHED_AND_FOUND, {type: 'find', site: '@site'}),
        onlyWhen(FETCHED_AND_FOUND, mark('site-found-by-dace')),
        onlyWhen(FETCHED_AND_FOUND, mark('square')),
      ],
      next: [
        {when: FOUND_ALONE, to: 'found-alone'},
        {when: SEEN_ALONE, to: 'found-alone'},
        {when: FETCHED_AND_FOUND, to: 'fetched'},
        {to: 'fetched'},
      ],
    },

    // ---- "I'm coming with you" ----

    together: {
      when: {after: 'asking'},
      notes: {
        // The moment each mission line is said, in the order of `lines`.
        lineMoments: [{at: 'the first fork'}, {at: 'the place'}, {at: 'the gate, at dusk'}],
      },
      mission: {id: `${ID}/together`, kind: 'drive', holds: ['checkpoints', 'signs'], minutes: 6,
        lines: [
          dace('Go left where the wires come down. I saw it from the other side, so everything is backwards. Give me a minute.'),
          dace('There it is. I knew it was something. You found it, though. I only pointed.'),
          rell("You kept him safe, and I'm grateful for it. He'll ask you again, you know. They always ask again.")]},
      effects: [{type: 'find', site: '@site'}],
      next: 'found-together',
    },

    // ---- No ----

    key: {
      when: {after: 'asking'},
      thoughts: [
        'The key to the pickup is hanging on a nail by the forge door. He looked at it before he walked away.',
        "I could put that key in my pocket. He'd see that it was gone, and he'd know why.",
      ],
      choices: [
        {id: 'take-the-key', by: 'do', words: 'Take the key off its nail',
          plain: 'An empty nail, where he will see it',
          thought: "If I take it, I'm telling him that I think he's still a thief.",
          hidden: 'He cannot take the pickup. He knows what the empty nail means',
          effects: [mark('key-taken', 'You said no to Dace, and then you took the key off its nail.')], next: 'night-after'},
        {id: 'leave-the-key', by: 'do', words: 'Leave the key where it is',
          plain: 'The key on its nail',
          thought: "If I leave it, I'm trusting him with the thing I just told him he couldn't have.",
          hidden: 'A named draw: he takes the pickup in the night, or he does not', next: 'night-after'},
      ],
    },

    // The night after: what he did, by the key, and by a draw: one time in two, or one in five if the player asked
    // him straight out. The first row whose condition is true.
    'night-after': {
      when: {nights: 1},
      next: [
        {when: did('key-taken'), to: 'key-was-taken'},
        {when: TAKES_IT, to: 'he-took-it'},
        {to: 'he-stayed'},
      ],
    },

    'key-was-taken': {
      lines: [
        dace('You took the key. I asked you, and you said no, and I said all right. Then you took the key anyway.'),
        dace("I wasn't going to take it. Now I'll never be able to show you that."),
      ],
      next: 'stayed',
    },

    'he-took-it': {
      cue: 'open.pickup.gone',
      lines: [
        moss("The old pickup is gone, and so is the key, and so is the boy. I'd be angry, but I showed him where the choke was, so I've only myself to blame."),
        rell("He'll have gone back the way we came. He has a night's start, in a truck that boils, with nothing mended and nobody told. I'm not asking you to go. I'm telling you that I'm going."),
      ],
      thoughts: ["I said no so that he'd be safe. He's out there now with nothing mended, and nobody has told him anything."],
      effects: [mark('took-it-in-the-night', 'You said no, and Dace took the old pickup in the night.'), ...ROLLS],
      choices: [
        {id: 'go-after-him', by: 'do', words: 'Drive out after him now',
          plain: "The day's outing. One set of tracks, half a night old",
          thought: "He's had half a night's start, and I know which way the pickup pulls.",
          next: 'search'},
        {id: 'wait-for-him', by: 'do', words: 'Wait for dusk tomorrow',
          plain: 'Rell has already gone, on foot',
          thought: 'He may come back by himself. Rell came nine days on foot, and he is her nephew.',
          effects: [mark('rell-walked')], next: 'away'},
      ],
    },

    'he-stayed': {
      lines: [
        dace("I'm still here, and so is the truck. I looked at that key twice in the night. I thought you'd want to know that I only looked."),
        rell('You left the key on its nail. I saw that, and so did he. It did him more good than the truck would have.'),
      ],
      effects: [mark('he-stayed', 'Dace looked at the key twice in the night, and left it where it was.'),
        {type: 'word', person: 'walkers', by: 1}],
      next: 'stayed',
    },
  },

  ends: ['found-alone', 'fetched', 'found-together', 'stayed', 'never-asked'],

  // What happens when the sign is never followed: the player does not speak to Dace in the three mornings he waits.
  ignored: {
    effects: [mark('never-asked')],
    next: 'never-asked',
  },

  // Lines said later, once each, when the condition is true.
  later: [
    {id: 'he-spoke-for-you', by: '{site.leader}', at: '@site',
      when: did('site-found-by-dace'),
      lines: [say('{site.leader}', 'A boy in a pickup found us two days ago. He said that a car would come after him, and that whoever was in it could be trusted. He also knocked over our water butt.')],
      effects: [mark('spoke-for-you', 'Dace told the people of {site.name} that you could be trusted.'),
        {type: 'word', person: '@site.people', set: 'Friendly'}]},
    {id: 'moss-fetches-the-pickup', by: 'moss',
      when: did('pickup-left-out'),
      lines: [moss("I'm taking Bess out to bring the old pickup home before somebody strips her. That makes Bess late for gas today. I'm not complaining. I'm only telling you where the morning went.")]},
    {id: 'the-rats-have-the-pickup', by: 'sumps-rider',
      when: did('pickup-taken'),
      lines: [say('sumps-rider', "Sump has a pickup that pulls to the left, and he says it came from Tin Town. He'll sell it back for thirty scrap. He says that's cheap, because nobody else wants it.")]},
    // What happens when the sign is never followed: Rell says so some nights later.
    {id: 'rell-on-dace-waiting', by: 'rell',
      when: did('never-asked'),
      lines: [rell("Dace waited by that old truck for three mornings to ask you something. He won't tell me what it was. He's put the cover back on it, and he's carrying water again.")]},
  ],

  notes: {
    // The kinds of site the role `site` may be cast from.
    siteKinds: ['camp', 'well', 'ruin', 'lookout'],
    ignoredWhat: 'Dace puts the cover back on the pickup and goes back to carrying water. He does not ask again.',
    // Where each `later` row is said, in the writer's words.
    laterWhere: {
      'he-spoke-for-you': "the place, on the player's first visit, if it is a camp",
      'moss-fetches-the-pickup': 'the yard, the next morning',
      'the-rats-have-the-pickup': 'the next Road Rats met at a checkpoint',
      'rell-on-dace-waiting': 'the gate, some nights later',
    },
    // The row 'he-spoke-for-you' is said only when the site cast is a camp: {cast: 'site', kind: 'camp'}.
    laterWhen: {'he-spoke-for-you': {cast: 'site', kind: 'camp'}},
  },
};
