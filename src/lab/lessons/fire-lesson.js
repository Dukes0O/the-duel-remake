import {TAKES_AWAY} from '../benches/fire.js';
import {fireDrawing, fireInput, fireReading, mountFire, trianglePicture} from './fire-animation.js';
import {range, word, question, hint} from './flying-display.js';
const sides = [['heat', 'Heat'], ['fuel', 'Fuel'], ['air', 'Oxygen']];
const tools = ['water', 'sand', 'cleared strip'];
const controls = [
  {id: 'water', setting: 'putOut', label: 'Tip the water bucket', value: 'water'},
  {id: 'sand', setting: 'putOut', label: 'Tip the sand bucket', value: 'sand'},
  {id: 'rake', setting: 'putOut', label: 'Rake a cleared strip', value: 'cleared strip'},
  range('spray', 'Coat plants ahead / leave them bare', 0, 1, 0, 1),
];
export function trialFire(input) {
  // One tool per trial: change one thing, as the scaffold asks.
  const chosen = Object.keys(input).filter(k => ['water', 'sand', 'rake'].includes(k)).at(-1);
  return fireInput({...input, putOut: chosen ? input[chosen] : 'nothing'});
}
export const definition = {
  id: 'fire', vocabulary: ['heat', 'fuel', 'oxygen', 'fire triangle', 'retardant'],
  wonder: {text: 'Brian shuts the lid and the flames die without water. Why did that work?', animation: 'wonder', seconds: 3},
  words: [word('fire', 'Heat', 'Heat is what makes things hot enough to start burning.'), word('fire', 'Fuel', 'Fuel is anything that can burn.'),
    word('fire', 'Oxygen', 'Oxygen is the part of air a fire needs.'), word('fire', 'Fire triangle', 'The fire triangle means a fire needs heat, fuel and oxygen together.'),
    word('fire', 'Retardant', 'Retardant coats plants so they char instead of burning.')],
  worked: [
    {name: 'Gas off', text: 'Take away heat and the flames die.', animation: 'gas', seconds: 2},
    {name: 'Wood out', text: 'Take away fuel and the flames die.', animation: 'wood', seconds: 2},
    {name: 'Lid on', text: 'Take away oxygen and the flames die.', animation: 'lid', seconds: 2},
    {name: 'Stop the creeping line', text: 'Retardant goes ahead of the fire, where it is going. The game stops new flames at coated plants.', animation: 'retardant', seconds: 7},
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support, controls: [controls[i], ...(i === 2 ? [controls[3]] : [])],
    prompt: i === 0 ? 'Choose the water bucket and predict which side it takes away.' : i === 1 ? 'Choose the sand bucket and predict which side it takes away.' : 'Rake a cleared strip and coat the plants ahead of the fire.',
    success: 'You took away a side and stopped the fire.', seconds: 7, animation: 'try', prediction: question('Which side will your tool take away?', TAKES_AWAY[tools[i]], sides),
  })),
  checks: tools.map(tool => question(`${tool === 'water' ? 'A bucket drop' : tool === 'sand' ? 'A lid' : 'A firebreak'} takes away which side?`, TAKES_AWAY[tool], sides)),
  challenge: {title: 'Take away heat, fuel or air.', text: 'Retardant goes in front.'},
  hints: {tool: hint('This run needs a different tool. Use the tool in Brian’s prompt and compare the triangle.', 'Use water first, sand second, then rake a strip and coat the plants ahead.', 'Watch each tool remove a different side of the triangle.'),
    prediction: hint('The tool took away a different side. Water cools, sand covers, and a cleared strip removes plants.', 'Water takes heat, sand takes oxygen, and the rake takes fuel.', 'Watch each triangle side disappear beside its tool.'),
    coat: hint('The plants ahead are still bare. Put retardant in front of the flames, where they are going.', 'Click Coat plants ahead, then run it again.', 'Watch the pink coat stop the creeping flame.')},
};
const animations = {};
for (const mode of ['wonder', 'heat', 'fuel', 'oxygen', 'fire-triangle', 'retardant', 'gas', 'wood', 'lid']) animations[mode] = ({time}) => fireDrawing({}, time, mode === 'fire-triangle' ? 'triangle' : mode);
animations.try = ({time, input}) => fireDrawing(trialFire(input), time);
const pictures = {};
for (const q of [...definition.tries.map(t => t.prediction), ...definition.checks]) for (const a of q.answers) a.animation = `answer-${a.id}`;
for (const [id] of sides) { pictures[id] = trianglePicture(id); animations[`answer-${id}`] = ({time}) => id === 'air' ? fireDrawing({}, time, 'lid') : fireDrawing({putOut: id === 'heat' ? 'water' : 'cleared strip'}, time); }
export const hooks = {animations, pictures, mount: mountFire, evaluate({tryIndex, input, prediction}) {
  const p = trialFire(input), r = fireReading(p), actual = r.missing[0] ?? 'heat';
  const failure = p.putOut !== tools[tryIndex] ? 'tool' : tryIndex === 2 && !p.spray ? 'coat' : 'prediction';
  return {actual, passed: !r.burning && p.putOut === tools[tryIndex] && (tryIndex !== 2 || Boolean(p.spray)) && actual === prediction, failure};
}};
