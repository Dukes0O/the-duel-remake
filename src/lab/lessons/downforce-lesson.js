import {downforceBench} from '../benches/tunnel.js';
import {tunnelPacket, partPicture} from './tunnel-packet.js';
import {downforceDrawing, mountDownforce} from './downforce-animation.js';
const at = (speedMph, wing = 'big') => ({speedMph, wing});
const kg = speed => downforceBench.run(at(speed)).downforceKg.toFixed(1);
export const spec = {
  id: 'downforce', bench: downforceBench,
  words: [['Wing', 'A wing is a shaped blade that turns the air.'], ['Downforce', 'Downforce is air pushing the car down.'], ['Drag', 'Drag is air pushing back and slowing the car.']],
  wonder: 'The back of this fast car stays planted. What holds it down?',
  wordInputs: [at(50), at(100), at(100)],
  worked: [['Read the scale', `At 50 mph the big wing pushes down like ${kg(50)} kg on the scale.`, at(50)],
    ['Double the air speed', `At 100 mph the scale reads ${kg(100)} kg, four times the push.`, at(100)],
    ['The cost', 'The green downforce arrow grows, but the orange drag arrow grows too.', at(100)]],
  controls: [{id: 'speedMph', label: 'Turn fan dial / drag or hold Up and Down', min: 50, max: 100, initial: 50, step: 10, value: 10, drag: true, keyboard: 'vertical', rate: 20},
    {id: 'big', setting: 'wing', label: 'Tilt wing steeply', value: 'big'}, {id: 'small', setting: 'wing', label: 'Tilt wing a little', value: 'small'}, {id: 'flat', setting: 'wing', label: 'Flatten wing', value: 'flat'}],
  classify: r => r.downforceKg > 0 ? 'both' : 'flat',
  answers: [['both', 'More push and drag'], ['flat', 'Least push and drag']],
  answerInputs: {both: at(100), flat: at(100, 'flat')},
  question: 'Does this wing add both push and drag, or neither?',
  examples: [at(50), at(100), at(100, 'flat')],
  prompts: ['Tilt the wing steeply at 50 mph and predict.', 'Keep the wing steep and turn the fan to 100 mph.', 'Flatten the wing for a long straight and predict.'],
  goal: (r, i) => i === 2 ? r.settings.wing === 'flat' : r.settings.wing === 'big' && r.settings.speedMph === [50, 100][i],
  success: 'You saw how the wing trades speed for push on the road.',
  checks: [['Which wing adds grip for fast bends?', [at(100, 'flat'), at(100)], 1],
    ['Which wing loses least top speed on a long straight?', [at(100), at(100, 'flat')], 1]],
  hint: 'The wing or fan is set differently from this run. Set the wing and fan before predicting.',
  plainer: 'Use big at 50 mph, big at 100 mph, then flat.',
  resultHint: r => `The scale reads ${r.downforceKg.toFixed(1)} kg at ${r.settings.speedMph} mph. Try the wing and fan setting Brian asked for.`,
  replay: 'Watch the scale at 50 mph and 100 mph with the same wing.',
  card: 'More wing gives more grip in fast corners and less top speed.',
  picture: partPicture('wing', r => [`${r.settings.speedMph} mph`, `${r.downforceKg.toFixed(1)} kg push`, `${Math.round(r.topSpeedShare * 100)}% top speed`]),
};
export const {definition, hooks} = tunnelPacket(spec, downforceDrawing, mountDownforce);
