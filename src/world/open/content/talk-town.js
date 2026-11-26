import {validateTalkScene} from '../../../story/talk.js';
import {FRIEND_WORDS} from '../register.js';
import {checkSentence, checkTalkRow, requireSound} from '../check-tables.js';

export const WAITING_LINE = 'We can talk when you come back.';

const greetings = {
  'auntie-solder': [
    ["The hearth is for the town. You can warm your hands, and then you can find something useful to do.", 'The water pail is by the door.'],
    ["I'm counting the embers again tonight. I count them more often when you've been near the store.", 'Leave the lid down when you pass it.'],
    ["You're the one who carried the fire in. I haven't made up my mind about you yet, so mind the soup.", 'The bowl with the crack is mine.'],
    ["Come and sit by the hearth for a minute. You look as if you've been out in the wind all day.", "I'll put another spoon in the pot."],
    ["There you are. I've kept a bowl of soup warm for you, and I don't do that for just anybody.", 'Sit close before the wind gets in.'],
  ],
  cinder: [
    ["I've nothing to say to you today. The kiln and I are both busy.", 'Keep clear of the door, please.'],
    ["I keep one lump back from every batch now. I never used to feel that I needed to.", "I have to know what's in the bin before I go home."],
    ["Mind the kiln door, because it's hotter than it looks. I say that to everybody once.", 'You can feel it from this side.'],
    ["The kiln is drawing well today. If you stand here for a moment, you can feel the heat through the door.", "There's a good batch in there if the wind holds."],
    ["I'd trust you with the kiln, and I've never said that to anyone before. Please don't tell Auntie that I said it.", "You're welcome to watch me bank it tonight."],
  ],
  rell: [
    ['Let us mind our own camp today.', "We've got enough to do."],
    ["I'll hear you out, but keep your voice down.", 'The little ones have only just settled.'],
    ["We've put the carts by the pump.", 'Give us a shout if they are in your way.'],
    ["There's room on the bench if you want to sit.", "I've got water enough for two cups."],
    ['You can count on me at the fence tonight.', "I don't forget who made room for us."],
  ],
  dace: [
    ['I put it back where I found it.', 'You can go and see for yourself.'],
    ['Rell told me to stay by the pump.', "I'm staying right here."],
    ["I'm learning to mend the cart wheel.", 'The trick is to get it straight before you knock the pin in.'],
    ['I can carry that if you want.', "It's easier with two of us."],
    ['Tell me when you need somebody to run to the gate.', "I'll get there before the bell stops."],
  ],
  wim: [
    ["I'm waiting for Rell.", 'She said to stay where she could see me.'],
    ["I'm keeping this seat for Dace.", 'There is another one by the pail.'],
    ['I found a blue stone by the pump.', 'It looks darker when you wet it.'],
    ['I saved you the smooth stone.', 'See how it shines when you wash it.'],
    ['You can sit here with me.', "It's where the warm air comes through."],
  ],
};
const marks = {
  'auntie-solder': ['gave-rell-an-ember', "I hear the Walkers have a fire at the Wash tonight. That was our ember, and I still think it was the right thing to do, most of the time."],
  rell: ['walkers-inside', 'I still wake up expecting to hear wind through the cart cloth. Your fence keeps it out.'],
  dace: ['walkers-inside', 'I heard the gate shut and thought it meant we had to go. It was a good thing to be wrong about.'],
  wim: ['walkers-inside', "Auntie gave me a bowl all to myself. It doesn't even have a crack."],
};
const entries = [];
function row(person, key, needs, words, afterChoice) {
  const scene = 'open/town/' + person + '/' + key;
  const lines = words.map(text => ({speaker: person, words: text}));
  entries.push({id: scene, lines, choices: [], autoAdvance: true});
  return {id: scene, scene, needs, afterChoice, once: key === 'night-2'};
}

export const TOWN_TALK = Object.freeze(Object.fromEntries(Object.entries(greetings).map(([person, byWord]) => {
  const mark = marks[person];
  const first = mark ? [row(person, 'night-2', {fact: 'mark', id: mark[0]}, [mark[1]])] : [
    row(person, 'night-2', {fact: 'night', atLeast: 2},
      ["The Walkers' camp is dark tonight. I can see it from the kiln roof, and I wish that I couldn't."], 'refuse'),
  ];
  const of = ['rell', 'dace', 'wim'].includes(person) ? 'walkers' : person;
  return [person, requireSound([...first, ...FRIEND_WORDS.map((word, index) =>
    row(person, word.toLowerCase(), {fact: 'word', of, is: word}, byWord[index]))], checkTalkRow, person + ' talk')];
})));

export const TOWN_SCENES = Object.freeze(Object.fromEntries(requireSound(entries, scene => {
  validateTalkScene(scene);
  return [...scene.lines, ...scene.choices].flatMap(line => checkSentence(line.words));
}, 'Tin Town scenes').map(({id, ...scene}) => [id, scene])));
