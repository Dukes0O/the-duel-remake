import {stringPeriod} from '../benches/pendulum.js';
import {pendulumDrawing, pendulumReading, pendulumInput, mountPendulum, swingPicture} from './pendulum-animation.js';
import {range, word, question, hint} from './flying-display.js';
const compare = [['faster', 'Faster'], ['slower', 'Slower'], ['same', 'The same']];
const controls = [
  range('lengthM', 'Move the hook · 5 / 15 / 25 m', 5, 25, 15, 10),
  range('weightKg', 'Hang light / heavy weight · kg', 20, 200, 20, 180), range('pull', 'Pull the weight back / let it hang', 0, 1, 1, 1),
];
export const trialPendulum = pendulumInput;
export const definition = {
  id: 'pendulum', vocabulary: ['pendulum', 'swing time', 'length'],
  wonder: {text: 'The helicopter stopped but the car kept moving side to side. Why does it keep swinging?', animation: 'wonder', seconds: 4},
  words: [word('pendulum', 'Pendulum', 'A pendulum is a weight swinging on a string.'), word('pendulum', 'Swing time', 'Swing time is the time for one full swing out and back.'), word('pendulum', 'Length', 'Length is the distance from the hook to the weight.')],
  worked: [
    {name: 'Let all three go', text: 'The short string swings fastest. The long string takes longest to come back.', animation: 'all', seconds: 10},
    {name: 'Change only the weight', text: 'The heavier weight on the same length takes the same swing time. We are comparing small swings.', animation: 'heavy', seconds: 8},
    {name: 'A car on the real cable', text: 'The game also lets its cable stretch and settle. Hover still and count one full swing before setting down.', animation: 'cable', seconds: 8},
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support, controls,
    prompt: i === 0 ? 'Hang the weight on the 5 m string, then pull it back.' : i === 1 ? 'Try a heavier weight on the 15 m string.' : 'Choose any length and weight, pull it back and compare with 15 m.',
    success: 'Your picture matched the timed swing.', seconds: 10, animation: 'try', prediction: question('Compared with a light weight on 15 m, how fast will it swing?', i === 0 ? 'faster' : 'same', compare),
  })),
  checks: [question('Which swings slowest?', 'long', [['short', 'Short'], ['long', 'Long'], ['heavy-short', 'Heavy and short']]),
    question('Which takes the same time as a light weight on 15 m?', 'heavy-medium', [['short', '5 m'], ['heavy-medium', 'Heavy on 15 m'], ['long', '25 m']])],
  challenge: {title: 'Length sets the swing time.', text: 'Hover still and let it settle.'},
  hints: {prediction: hint('Your picture did not match the stopwatch. Choose faster for shorter, slower for longer, or the same for the same length.', 'Use 5 m for faster, 25 m for slower, or 15 m for the same.', 'Watch all three lengths start together, then compare two weights on 15 m.'),
    pull: hint('The weight was hanging still. Pull it back before letting go.', 'Click Pull the weight back, then run it.', 'Watch Brian pull the weight aside and let go.')},
};
const animations = {};
for (const mode of ['wonder', 'pendulum', 'swing-time', 'length', 'all', 'heavy', 'cable']) animations[mode] = ({time}) => pendulumDrawing({weightKg: mode === 'heavy' ? 200 : 20}, time, mode === 'length' ? 'all' : mode);
animations.try = ({time, input}) => pendulumDrawing(trialPendulum(input), time);
const pictures = {};
for (const [id, lengthM, weightKg] of [['short', 5, 20], ['long', 25, 20], ['heavy-short', 5, 200], ['heavy-medium', 15, 200], ['faster', 5, 20], ['slower', 25, 20], ['same', 15, 20]]) {
  pictures[id] = swingPicture(lengthM, weightKg); animations[id] = ({time}) => pendulumDrawing({lengthM, weightKg}, time);
}
export const hooks = {animations, pictures, mount: mountPendulum, evaluate({input, prediction}) {
  const p = trialPendulum(input), r = pendulumReading(p), reference = stringPeriod(15);
  const actual = Math.abs(r.periodS - reference) < .001 ? 'same' : r.periodS < reference ? 'faster' : 'slower';
  return {actual, passed: Boolean(p.pull) && actual === prediction, failure: p.pull ? 'prediction' : 'pull',
    hint: p.pull ? {what: `This ${p.lengthM} m string took ${r.periodS.toFixed(1)} s. Compare with ${reference.toFixed(1)} s for 15 m and choose ${actual === 'same' ? 'the same' : actual}.`, plainer: `Keep this length and choose ${actual === 'same' ? 'the same' : actual}.`} : definition.hints.pull};
}};
