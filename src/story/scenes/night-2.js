// Five Cold Nights, section 4. Only public dialogue, thoughts and prices go to talkScreen.
const line = (speaker, words, delivery) => ({speaker, words, ...delivery});
const auntie = (words, delivery) => line('auntie-solder', words, delivery);
const rell = words => line('rell', words);
const dace = words => line('dace', words);
const cinder = (words, delivery) => line('cinder', words, delivery);
const wim = words => line('wim', words);
const clinker = words => line('clinker', words);
const scene = (...lines) => ({lines});
const stock = by => ({type: 'stock', stock: 'embers', by});
const word = (person, set) => ({type: 'word', person, set});
const walkers = set => word('walkers', set);
const road = by => ({type: 'roadWord', by});
const mark = id => ({type: 'mark', id});
const feud = {type: 'feud', by: 1};
const debt = (id, text) => ({type: 'debt', id, person: 'walkers', text});
const choice = (id, words, effects = [], details) => ({id, words, effects, ...details});
const priced = (id, words, by, effects, details) =>
  choice(id, words, [stock(by), ...effects], {plainStock: 'embers', ...details});
// Auntie Solder stays at the hearth while the player is at the gate, so there she speaks on the radio.
const radio = {radio: true};

export const NIGHT_2_GATE_ENCOUNTER = 'You met at Tin Town’s gate.';

export const NIGHT_2_QUESTIONS = [
  {id: 'why-ember', words: 'Why not just take a light from our hearth?',
    shows: 'Why an ember given is an ember gone',
    lines: [rell("A flame from your hearth would be no good to us. There's nothing out there to burn, not even a stick, so it would die in a minute. An ember keeps burning the whole night through.")]},
  {id: 'where', words: 'Where are you going?',
    shows: 'A road: the Walkers can take Bess over the South Ford on Day 3, if they are Friendly',
    effects: [mark('know-south-ford')],
    lines: [rell("We're going to the salt pans in the south, over the Girder Bridge. If the Ash Men still hold the bridge, we'll go round by the South Ford. We know the way across the ford, and hardly anyone else does.")]},
  {id: 'who-dace', words: "Who's the boy staring at our hearth?",
    shows: 'A tell: the boy keeps looking at the store. It also lets you have a word with him',
    lines: [rell("That's Dace, my sister's boy. He's fourteen, he's quick on his feet and he's always hungry, so I keep an eye on him."),
      dace("I wasn't staring at it. I was only looking.")]},
  {id: 'word-with-dace', words: 'Dace, can I have a word with you?', needs: ['who-dace'],
    effects: [mark('dace-knows-the-count')],
    lines: [line('you', 'Those four embers are all that stands between this whole town and the cold.'),
      dace('Only four? Is that all you have? I thought a town with a fire must be rich.')]},
];

export const NIGHT_2_WASH_CHOICE = choice('drive-riders-off', 'Drive out and run the riders off');

export const NIGHT_2_CHOICES = [
  priced('gift', "Take one. You don't owe us anything for it.", -1,
    [walkers('Friendly'), road(1), mark('gave-rell-an-ember')],
    {thought: 'Word of a kindness travels. I wonder who else is out on that road.'}),
  priced('watch', 'You can have one ember if your people keep watch on our fence for two nights.', -1, [
    walkers('Friendly'), debt('walkers-watch', "The Walkers owe you two nights' watch."), road(1),
  ], {detail: 'Two nights’ watch on your fence'}),
  priced('inside', "I won't give you an ember, but you can all come inside and share our fire.", 0, [
    walkers('Friendly'), mark('walkers-inside'), word('auntie-solder', 'Wary'), road(2), {type: 'shareHearth'},
  ], {detail: 'Eleven more people at your hearth',
    thought: "That's eleven more people to feed and keep warm. Auntie will have something to say about it."}),
  priced('refuse', "I'm sorry, I can't. We only have four embers, and that's four nights of fire for the whole town.", 0,
    [walkers('Cold')], {thought: "I wonder where they'll go now."}),
];

export const NIGHT_2_SCENES = {
  hearth: scene(
    auntie('Come and get warm. This hearth is the only fire in Tin Town, and every night it burns up one ember to keep going.'),
    auntie("I counted the store twice, hoping I'd got it wrong. There are four embers left, so we have four nights of fire, and then the hearth goes out."),
    cinder('Big Bess, our tanker, goes out for gas at first light. My kiln can bake one new ember from every twenty units of gas that Bess brings home.'),
    cinder('So the more gas Bess brings back, the more nights of fire the town gets. Until Bess is back, every ember we give away is a night we lose.'),
    {...auntie("That's the gate bell. Nobody has rung it for so long that I'd forgotten we had one."), cue: 'town.gate.bell'},
    auntie("You carried the fire in last night, so whoever is at the gate is yours to answer. Off you go, and I'll keep an eye on the soup."),
  ),
  gate: {
    ...scene(
      rell("My name is Rell. We raked salt out past the ships until our well went sour, and we've been walking for nine days since then."),
      rell("We saw your smoke last night. It's the first hearth smoke we've seen since we set out, so here we are, being a nuisance."),
      wim("Is that your car? It's very dirty."),
      rell("That's Wim. She says whatever she sees, and we've given up trying to stop her."),
      rell("I'm not asking to come inside your fence. All I'm asking for is one ember. We'll camp out at the Wash, and we'll be gone within a week."),
      cinder("There are eleven of them, and I can only see blankets on those carts for about six. It's going to freeze tonight.", {low: true}),
      auntie("Just remember that we only have four embers, and that's four nights of fire. I'm not telling you what to do. I'm only reminding you.", radio),
    ),
    questions: NIGHT_2_QUESTIONS,
    thoughts: ["If I give one away, we only have three nights of fire left, and Bess hasn't even gone for gas yet.",
      "I wonder what will happen to eleven people out in the cold if I don't help them."],
    choices: NIGHT_2_CHOICES,
  },
  gift: scene(
    rell("You want nothing for it? Then I'll set my own price. I always pay what I owe, and anyone on the road will tell you so."),
    auntie('That was kind of you, and soft. I hope we can afford it.', radio),
    cinder("Being soft gets talked about, though. By noon tomorrow, everyone on the road will know this town shares its fire."),
    wim('Thank you for the hot rock.'),
  ),
  salt: scene(dace("Rell sent you that salt to pay for the ember. I kept watch on your gate all night too, even though nobody asked me to. I fell asleep near the end, but that part doesn't count.")),
  theft: scene(auntie("Wake up! Somebody has taken two embers out of the store in the night, and my good ladle with them!")),
  caught: {
    ...scene(dace("They're not for me! One ember isn't enough to keep eleven people warm, and you know it. Wim has been coughing ever since we passed the ships.")),
    choices: [
      priced('take-dace-to-rell', "Give me the embers. Then we're going to find Rell.", 2,
        [walkers('Sworn'), mark('dace-runner')]),
      priced('keep-secret', 'Keep one ember and give me the other, and Rell never needs to hear about this.', 1, [mark('dace-secret')]),
      priced('send-away', "Hand them both over. Then start walking, and don't come back this way.", 2,
        [walkers('Wary'), mark('dace-sent-away')]),
    ],
  },
  'take-dace-to-rell': scene(rell("Dace will carry your water for a month to pay this back, and he'll look you in the eye every time he does it.")),
  'send-away': scene(rell('Dace is my boy to punish, not yours. You had no right to send him off into the dark on his own.')),
  escaped: scene(rell("Dace put two of your embers on our fire before I knew where they came from, and they've burned away. I can't give them back, and I have nothing worth two embers. So I owe you whatever you ask of me, once.")),
  watch: scene(
    rell('A trade suits me better than a gift. People remember a gift wrong, but everybody remembers the terms of a trade.'),
    rell("Dace, you're on their fence tonight. You keep an eye on the dark, and I'll keep an eye on you."),
    dace('Why does it have to be me?'),
    rell("Because you'll be awake all night anyway, staring at things."),
  ),
  whistle: scene({...dace("There's a man by your pump lamp, grey with ash from head to foot. He's counting something on his fingers."), cue: 'night.whistle'}),
  'scout-stopped': scene(dace('Did you see him run? I spotted him first, so make sure you tell Rell that I spotted him first.')),
  'scout-escaped': scene(dace("He was counting your lamps, and now he's gone over the wall to tell somebody how many you have.")),
  inside: scene(
    auntie('Eleven more people inside my fence? Where are they all going to sleep, on top of the lamps?', radio),
    rell("We'll sleep wherever you put us and work wherever you point us. And we won't touch your soup, though we could smell it from the gate."),
    auntie("Then I suppose I'd better put more water in the soup.", radio),
    wim('The soup smells nice. Is it for sharing?'),
    auntie('It seems it is now.', radio),
  ),
  lamp: scene(cinder('The Walkers are bedding down by the pump, and the lamp there is dark. Take a brand from the hearth, a stick with its end alight, and go and light that lamp for them.')),
  'at-hearth': scene(auntie("Don't say a word about the shawl. The child was cold, that's all.")),
  refuse: {
    ...scene(
      rell("Four nights of fire for a whole town. If I had your sums, I'd say the same thing."),
      rell("Dace, Wim, get the carts. We're walking on."),
      wim("But there's a fire right there."),
      rell('I know there is. Come on.'),
    ),
    choices: [
      choice('tell-mall', "The Dead Mall still has a roof. It's seven kilometres from here, to the south-west.",
        [walkers('Wary'), mark('told-walkers-of-mall')]),
      choice('say-nothing', 'Say nothing'),
    ],
  },
  'tell-mall': scene(rell("A roof is worth knowing about, and it's worth more to us than you'd think. We'll rest at the Wash tonight and make for the Mall in the morning.")),
  tower: {
    ...scene(clinker("Cold out here, isn't it? The fire-keepers shut you out. Old Smoke keeps a fire for everyone, as long as everyone comes to him. Come and be warm, and bring what you know about the footpaths.")),
    thoughts: ['Their camp is dark and cold, and one of the riders keeps circling it with its headlights on, so that nobody can slip away.'],
    choices: [
      choice('watch-clinker', 'Stay on the tower and watch'),
      priced('carry-ember', 'Carry one ember out to the Walkers now', -1, []),
    ],
  },
  'walkers-refuse-clinker': {thoughts: ["Rell spits in the sand at Clinker's feet, and the Walkers pull their carts away from the riders, out into the dark."]},
  'walkers-go-with-clinker': {thoughts: ["The Walkers pack their carts and follow Clinker's riders up the East Road, towards Old Smoke's fire."]},
  delivery: scene(rell('You took your time over that sum, but you got the right answer in the end. Thank you.'),
    clinker('We will remember who it was that lit a fire for strays.')),
  'wash-fight-won': scene(rell("You wouldn't give us fire, but you came out in the cold to fight for us. I don't understand you, but I'll be thinking about you.")),
};

export const NIGHT_2_EFFECTS = {
  salt: [mark('dace-kept-watch')],
  theft: [stock(-2)],
  escaped: [debt('walkers-great-favour', 'The Walkers owe you a great favour.')],
  'unseen-scout': [feud, mark('unseen-night-2-scout')],
  'scout-escaped': [feud, mark('night-2-lamps-counted')],
  'walkers-refuse-clinker': [mark('walkers-refused-clinker')],
  'walkers-go-with-clinker': [feud, mark('walkers-with-clinker'), mark('ash-men-know-footpaths'), mark('ash-men-know-south-ford')],
  'carry-ember': [walkers('Friendly'), mark('changed-mind-in-night')],
  'wash-fight-won': [walkers('Strangers'), feud],
  'wash-car-towed': [mark('wash-car-towed-at-dawn')],
  // STORY-NIGHT-2-FLOW: Ash Men on foot who reach the camp take it. The Walkers are driven off and their word drops one step.
  'wash-camp-taken': [mark('wash-camp-taken'), {type: 'word', person: 'walkers', by: -1}],
};

export const NIGHT_2_LATER = {
  unseenScout: cinder('They went straight for our weakest lamp, so somebody must have counted them. Nobody was keeping a proper watch on our fence the night the Walkers came, were they?'),
  daceRunner: 'On the last night Dace carries a brand and relights one lamp for you.',
  daceSecret: "This happened because you kept Dace's secret.",
  daceSentAway: 'Dace is seen riding with Clinker. On the last night the Ash Men know which of your lamps is weakest.',
  walkersInside: 'In a raid the Walkers relight one smothered lamp. Auntie Solder comes round when a Walker mends something of hers.',
};

const COUNT_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

// Auntie banks the hearth for tonight before she speaks, so the count is what is left for the nights to come.
export function night2Count(embers) {
  const count = COUNT_WORDS[embers] ?? String(embers);
  const store = embers === 0 ? "I've banked the hearth for tonight, and that was our last ember. Unless Bess brings gas home, the hearth goes out tomorrow."
    : `I've banked the hearth for tonight, and that leaves ${count} ${embers === 1 ? 'ember' : 'embers'} in the store, so we have ${count} more ${embers === 1 ? 'night' : 'nights'} of fire.`;
  return scene(auntie(`${store} Bess goes out for gas in the morning. Try to bring Bess home with more gas in the tank than holes in it.`));
}
