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

export const NIGHT_2_GATE_ENCOUNTER = 'You met at Tin Town’s gate.';

export const NIGHT_2_QUESTIONS = [
  {id: 'why-ember', words: 'Why not take a light from our hearth?',
    shows: 'Why an ember given is an ember gone',
    lines: [rell("A light's no good to us. There's nothing to burn out here, not a stick. It's the ember we need. It burns the night through.")]},
  {id: 'where', words: 'Where are you going?',
    shows: 'A road: the Walkers can take Bess over the South Ford on Day 3, if they are Friendly',
    effects: [mark('know-south-ford')],
    lines: [rell('The south pans, over the Girder Bridge. If the Ash Men still hold it, round by the South Ford. We know the ford. Nobody else bothers to.')]},
  {id: 'who-dace', words: "Who's the boy staring at my hearth?",
    shows: 'A tell: the boy keeps looking at the store. It also lets you have a word with him',
    lines: [rell("Dace. My sister's boy. He's quick, he's hungry and he's fourteen. I watch him."), dace("I wasn't staring. I was looking.")]},
  {id: 'word-with-dace', words: 'Dace. A word.', needs: ['who-dace'],
    effects: [mark('dace-knows-the-count')],
    lines: [line('you', "It's four embers between a whole town and the cold."), dace('Four? Is that all? I thought you were rich.')]},
];

export const NIGHT_2_CHOICES = [
  priced('gift', 'Take one. No terms.', -1,
    [walkers('Friendly'), road(1), mark('gave-rell-an-ember')],
    {thought: 'Kindness travels. I wonder who else is on that road.'}),
  priced('watch', "One ember, for two nights' watch on our fence.", -1, [
    walkers('Friendly'), debt('walkers-watch', "The Walkers owe you two nights' watch."), road(1),
  ], {detail: 'Two nights’ watch on your fence'}),
  priced('inside', 'Not an ember. Come inside. Share ours.', 0, [
    walkers('Friendly'), mark('walkers-inside'), word('auntie-solder', 'Wary'), road(2), {type: 'shareHearth'},
  ], {detail: 'Eleven more people at your hearth', thought: 'Eleven more mouths. Auntie will have something to say.'}),
  priced('refuse', "I can't. Four embers, four nights.", 0, [walkers('Cold')],
    {thought: "I wonder where they'll go."}),
];

export const NIGHT_2_SCENES = {
  hearth: scene(
    auntie('Four embers. Four nights. I counted twice, in case I was being unkind.'),
    cinder("Bess goes for gas at first light. Twenty of gas bakes one ember. Do the sum, then don't tell me the answer."),
    {...auntie("That's the gate bell. I forgot we had a gate bell."), cue: 'town.gate.bell'},
    auntie("Your pot, your fire, your visitors. Off you go. I'll mind the soup."),
  ),
  gate: {
    ...scene(
      rell("I'm Rell. We raked salt out past the ships till the well went sour. Nine days walking since."),
      rell('We saw smoke last night. First hearth smoke on this road in a year. So here we are, being a nuisance.'),
      wim("Is that your car? It's very dirty."),
      rell("That's Wim. She says what she sees. We've stopped trying to cure it."),
      rell("I'm not asking to come in. One ember. We camp at the Wash and we're gone in a week."),
      cinder('Eleven people. Blankets for about six. It freezes tonight.', {low: true}),
      auntie("And we have four nights of fire. I'm only saying. I'm not saying anything.", {radio: true}),
    ),
    questions: NIGHT_2_QUESTIONS,
    thoughts: ["If I give one, that's three nights. And Bess isn't back yet.",
      "I wonder what happens to eleven people out there if I don't."],
    choices: NIGHT_2_CHOICES,
  },
  gift: scene(
    rell("No terms. Then I'll set my own. Rell pays what she owes. Ask anyone."),
    auntie('Soft.'),
    cinder('Soft travels, though. The whole road will know by noon.'),
    wim('Thank you for the hot rock.'),
  ),
  salt: scene(dace("I was keeping watch. Nobody asked. I fell asleep at the end. That bit doesn't count.")),
  theft: scene(auntie("The store! Somebody's had two embers out of my store, and my good ladle!")),
  caught: {
    ...scene(dace("It's not for me! One ember for eleven people. You try it. Wim's been coughing since the ships.")),
    choices: [
      priced('take-dace-to-rell', "Give them here. We're going to see Rell.", 2,
        [walkers('Sworn'), mark('dace-runner')]),
      priced('keep-secret', 'Keep one. Give me the other. Rell never hears of this.', 1, [mark('dace-secret')]),
      priced('send-away', 'Hand them over. Then start walking, and not this way.', 2,
        [walkers('Wary'), mark('dace-sent-away')]),
    ],
  },
  'take-dace-to-rell': scene(rell("He'll carry your water for a month. And he'll look at you while he does it.")),
  'send-away': scene(rell('He was mine to punish. Not yours.')),
  escaped: scene(rell("Two of yours are ash in my fire. I can't unburn them. I owe you two embers and I haven't one. So I owe you whatever you ask, once.")),
  watch: scene(
    rell('A trade. Good. I like a trade better than a gift. Gifts get remembered wrong.'),
    rell("Dace! You're on the fence tonight. Watch the dark, and I'll watch you."),
    dace('Why me?'),
    rell("Because you'd be awake anyway, looking at things."),
  ),
  whistle: scene({...dace("There's a man by your pump lamp. Grey all over. He's counting on his fingers."), cue: 'night.whistle'}),
  'scout-stopped': scene(dace('Did you see him run? I saw him first. Say I saw him first.')),
  'scout-escaped': scene(dace("He was counting your lamps. He's gone to tell somebody how many.")),
  inside: scene(
    auntie('Eleven. In my alleys. Where do they sleep, on the lamps?'),
    rell("We sleep where we're put and we work where we're pointed. And we don't touch other people's soup."),
    auntie('Who told you about the soup?'),
    wim('It smells nice. Is it for sharing?'),
    auntie('It is now, apparently.'),
  ),
  lamp: scene(cinder("They'll want light by that pump. Take a brand from the hearth.")),
  'at-hearth': scene(auntie("Don't.")),
  refuse: {
    ...scene(
      rell("Four nights. With your sums I'd say the same."),
      rell("Dace. Wim. Carts. We're walking."),
      wim("But there's a fire just there."),
      rell('There is. Come on.'),
    ),
    choices: [
      choice('tell-mall', 'The Dead Mall has a roof. Seven kilometres, south-west.',
        [walkers('Wary'), mark('told-walkers-of-mall')]),
      choice('say-nothing', 'Say nothing'),
    ],
  },
  'tell-mall': scene(rell("That's worth knowing. That's worth more than you think.")),
  tower: {
    ...scene(clinker('Cold, are you? Shut out by the fire-keepers? Old Smoke keeps a fire for everyone. He just keeps it himself. Come and be warm. And bring what you know about the footpaths.')),
    choices: [
      choice('watch-clinker', 'Watch'),
      choice('drive-riders-off', 'Drive out and run the riders off', [], {disabled: 'Available when the Wash fight is ready'}),
      priced('carry-ember', 'Carry one ember out to them, now', -1, []),
    ],
  },
  'walkers-refuse-clinker': {thoughts: ['Rell spits in the sand and walks for the Mall.']},
  'walkers-go-with-clinker': {thoughts: ['They go with Clinker.']},
  delivery: scene(rell('You count slow. But you count.'), clinker("We'll remember who lights fires for strays")),
  'wash-fight-won': scene(rell("You wouldn't warm us but you'd fight for us. I don't understand you. I'll think about you, though.")),
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
};

export const NIGHT_2_LATER = {
  unseenScout: cinder('They knew which lamp. Somebody counted. Nobody was on our fence the night those people came, were they?'),
  daceRunner: 'On the last night Dace carries a brand and relights one lamp for you.',
  daceSecret: "Because you kept Dace's secret.",
  daceSentAway: 'Dace is seen riding with Clinker. On the last night the Ash Men know which of your lamps is weakest.',
  walkersInside: 'In a raid the Walkers relight one smothered lamp. Auntie Solder comes round when a Walker mends something of hers.',
};

export function night2Count(embers) {
  const count = ['No', 'One', 'Two', 'Three', 'Four'][embers] ?? String(embers);
  return scene(auntie(`${count} ${embers === 1 ? 'ember' : 'embers'}. Bess at first light. Try to come back with more gas than holes.`));
}
