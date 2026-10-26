import {brakingBench} from '../benches/tunnel.js';
import {tunnelPacket, partPicture} from './tunnel-packet.js';
import {brakingDrawing, mountBraking} from './braking-animation.js';
const at = (speedMph, frontShare = 70) => ({speedMph, frontShare});
const m = speed => brakingBench.run(at(speed)).stopMetres.toFixed(1);
export const spec = {
  id: 'braking', bench: brakingBench,
  words: [['Stopping distance', 'Stopping distance is the road a car uses while its brakes slow it to a stop.'], ['Weight shift', 'Weight shift is braking putting more of the car\'s weight onto its front tyres.'], ['Brake balance', 'Brake balance is how much work the front and back brakes do.']],
  wonder: 'The car stops before the line at 50 mph, then passes it at 100 mph. Why?',
  wordInputs: [at(50), at(50), at(50, 50)],
  worked: [['Two starting speeds', `At 50 mph the car uses ${m(50)} metres; at 100 mph it uses ${m(100)} metres.`, at(100)],
    ['Watch the front tyres', 'Braking shifts weight toward the front tyres, so they can do more of the work.', at(50)],
    ['Too much at the back', 'Too much back brake makes the back tyres slide in this rig.', at(50, 50)]],
  controls: [{id: 'speedMph', label: 'Turn speed dial / drag or hold Up and Down', min: 20, max: 150, initial: 50, step: 10, value: 10, cycle: true, drag: true, keyboard: 'vertical', rate: 20},
    {id: 'frontShare', label: 'Move brake lever toward front / back', min: 40, max: 90, initial: 60, step: 5, value: 5, cycle: true}],
  classify: r => r.rearSlides ? 'slide' : r.settings.speedMph <= 50 ? 'short' : 'long',
  answers: [['short', 'Short stop, steady'], ['long', 'Long stop, steady'], ['slide', 'Back slides']],
  answerInputs: {short: at(50), long: at(100), slide: at(50, 50)},
  question: 'Where will it stop, and will its back slide?',
  examples: [at(50), at(100), at(50, 50)],
  prompts: ['Move the brake lever to 70 percent front at 50 mph.', 'Keep 70 percent front and choose 100 mph.', 'Choose 50 mph and put half the braking at the back.'],
  goal: (r, i) => i === 2 ? r.rearSlides && r.settings.speedMph === 50 : !r.rearSlides && r.settings.speedMph === [50, 100][i],
  success: 'You matched the stop and the back tyres to your picture.',
  checks: [['Which car makes the shortest steady stop?', [at(100), at(50), at(50, 50)], 1],
    ['Which car needs four times the stopping distance?', [at(50), at(100)], 1]],
  hint: 'The back slid or the speed was wrong for this run. Move the brake balance forward for a steady stop.',
  plainer: 'Use 70 percent front for a steady stop, and 50 percent to see the back slide.',
  resultHint: r => `The car used ${r.stopMetres.toFixed(1)} metres and its back ${r.rearSlides ? 'slid' : 'stayed steady'}. Move the lever or speed dial for this run.`,
  replay: 'Compare the two stopping distances, then watch the back slide with half the brake at the rear.',
  card: 'Twice the speed means four times the stopping distance.',
  picture: partPicture('brake', r => [`${r.settings.speedMph} mph`, `${r.stopMetres.toFixed(1)} metres`, r.rearSlides ? 'Back slides' : 'Steady stop']),
};
export const {definition, hooks} = tunnelPacket(spec, brakingDrawing, mountBraking);
