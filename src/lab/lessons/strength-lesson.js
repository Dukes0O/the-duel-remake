import {ARM, MATERIALS, lightestArm, strengthBench} from '../benches/strength.js';
import {strengthResult, strengthSamples, strengthDrawing, strengthPicture, mountStrength} from './strength-animation.js';
import {word, moment, question} from './workshop-display.js';

const outcomes = [['holds', 'Holds'], ['bends', 'Bends'], ['snaps', 'Snaps']];
const choices = question('Will the arm hold, bend or snap?', 'holds', outcomes);
const materialNames = Object.keys(MATERIALS);
export const readStrength = input => ({...strengthBench.run({part: 'hook arm',
  material: materialNames[Math.round(input.materialDial ?? 1)], thicknessMm: input.thicknessMm ?? 30}).settings,
  hanging: input.part === 'hook arm'});
export const definition = {
  id: 'strength', vocabulary: ['strength', 'stiff', 'brittle', 'aluminium', 'steel', 'carbon fibre'],
  wonder: {text: 'This hook arm adds a lot to the load. Can it be lighter and still strong?', animation: 'wonder', seconds: 3},
  words: [
    word('strength', 'Strength', 'Strength is how much load a part can take before it bends or breaks.'),
    word('strength', 'Stiff', 'Stiff means it bends very little.'),
    word('strength', 'Brittle', 'Brittle means it snaps instead of bending.'),
    word('strength', 'Aluminium', 'Aluminium is a light metal that bends before it breaks.'),
    word('strength', 'Steel', 'Steel is a heavy, tough metal that bends before it breaks.'),
    word('strength', 'Carbon fibre', 'Carbon fibre is a light, stiff material that can snap without warning.'),
  ],
  worked: [
    moment('Same weight, different thickness', 'Each bar weighs 1 kg, so the lighter material makes a thicker bar.', 'bars'),
    moment('Keep adding weight', 'Steel bends first in this equal-weight test, then aluminium; carbon fibre stays straight longer, then snaps.', 'bars', 5),
    moment('Choose for the job', `This ${lightestArm().massKg.toFixed(1)} kg carbon fibre arm holds ${ARM.loadKg} kg with room for safety.`, 'holds'),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: ['Turn the material dial to carbon fibre, then thicken the arm until it holds.', 'Find another arm that holds the car.', 'Build the lightest safe arm.'][i],
    success: 'You chose a safe arm for the load.', seconds: 3, animation: 'try',
    controls: [
      {id: 'part', label: `Hang the ${ARM.loadKg} kg test load`, value: 'hook arm'},
      {id: 'materialDial', setting: 'material', values: materialNames, label: 'Turn material dial: Aluminium / Steel / Carbon fibre', value: 1, min: 0, max: 2, initial: 1, step: 1, cycle: true},
      {id: 'thicknessMm', label: 'Turn thickness handle: add 1 mm / start again', value: 1, min: 5, max: 120, initial: 30, step: 1, cycle: true, drag: true, keyboard: 'vertical', rate: 15},
    ], prediction: choices,
  })),
  checks: [
    question(`Which is lightest and still holds ${ARM.loadKg} kg?`, 'check-carbon', [['check-steel', 'Steel'], ['check-carbon', 'Carbon fibre'], ['check-thin', 'Aluminium']]),
    question('Which arm snaps instead of bending?', 'snaps', outcomes),
  ],
  challenge: {text: 'Pick by what the part must do: strong, light or tough.'},
  hints: {
    hang: {what: 'The test load is still on the floor. Hang it from the arm before testing.', plainer: 'Click the car to hang the test load.', worked: 'Watch the car hang from the arm, then try it yourself.'},
    safety: {what: 'It held still, but needs more strength for bumps and swings. Make the arm thicker before flying.', plainer: 'Choose carbon fibre at 50 mm for extra strength as the load moves.', worked: 'Watch the arm hold with extra strength for a moving load.'},
    load: {what: 'The arm gave way under the car. Make it thicker or choose a stronger material.', plainer: 'Choose carbon fibre and turn the thickness handle to 50 mm.', worked: 'Watch the thick carbon fibre arm hold the car, then build it yourself.'},
    heavy: {what: 'It held, but it is heavier than it needs to be. Try carbon fibre, a bit thicker.', plainer: 'Choose carbon fibre at 50 mm to hold the car with less weight.', worked: 'Watch the light arm hold the same load.'},
    prediction: {what: 'The arm did something else. Pick the picture that matches its shape.', plainer: 'A straight arm holds; a drooping arm bends; a split arm snaps.', worked: 'Watch the three shapes, then pick the matching picture.'},
  },
};
const animations = {
  wonder: ({time}) => strengthDrawing({material: 'steel', thicknessMm: 80}, time, 'wonder'),
  strength: ({time}) => strengthDrawing(strengthSamples.bends, time),
  stiff: ({time}) => strengthDrawing(strengthSamples.holds, time),
  brittle: ({time}) => strengthDrawing(strengthSamples.snaps, time),
  aluminium: ({time}) => strengthDrawing({material: 'aluminium', thicknessMm: 65}, time),
  steel: ({time}) => strengthDrawing({material: 'steel', thicknessMm: 80}, time),
  'carbon-fibre': ({time}) => strengthDrawing(strengthSamples.holds, time),
  bars: ({time}) => strengthDrawing(strengthSamples.holds, time, 'bars'),
  try: ({input, time}) => strengthDrawing(readStrength(input), time),
};
const pictures = {};
for (const [id, sample] of Object.entries(strengthSamples)) {
  animations[id] = ({time}) => strengthDrawing(sample, time); pictures[id] = strengthPicture(sample);
}
export const hooks = {animations, pictures, mount: mountStrength,
  evaluate({tryIndex, input, prediction}) {
    const load = readStrength(input), physical = strengthResult(load), arm = physical.arm;
    const actual = load.hanging ? physical.actual : 'holds';
    const light = arm.massKg <= lightestArm().massKg * 1.15;
    const goal = input.part === 'hook arm' && arm.holds && (tryIndex < 2 || light);
    const failure = !load.hanging ? 'hang' : !arm.holds ? actual === 'holds' ? 'safety' : 'load' : !goal ? 'heavy' : 'prediction';
    const hint = {...definition.hints[failure]};
    if (failure === 'heavy') hint.what = `It held, but the arm weighs ${arm.massKg.toFixed(1)} kg. Try a lighter material, a bit thicker.`;
    return {passed: goal && prediction === actual, actual, failure, hint};
  },
};
