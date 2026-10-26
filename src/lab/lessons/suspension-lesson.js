import {suspensionBench} from '../benches/tunnel.js';
import {tunnelPacket, partPicture} from './tunnel-packet.js';
import {suspensionDrawing, mountSuspension} from './suspension-animation.js';
const at = (spring, road = 'bumpy') => ({spring, road});
const soft = suspensionBench.run(at('soft')), stiff = suspensionBench.run(at('stiff'));
export const spec = {
  id: 'suspension', bench: suspensionBench,
  words: [['Spring', 'A spring is a coil that lets a wheel move without moving the whole car as much.'], ['Soft', 'Soft means the coil bends more easily.'], ['Stiff', 'Stiff means the coil is harder to bend.'], ['Body roll', 'Body roll is the car leaning in a bend.']],
  wonder: 'One car shakes much more over these bumps. What is different?',
  wordInputs: [at('soft'), at('soft'), at('stiff'), at('soft', 'smooth')],
  worked: [['Bumps', 'Soft springs pass less shaking into the car; stiff springs pass more.', at('soft')],
    ['The tyre light', `Soft keeps contact ${Math.round(soft.contactShare * 100)} percent of the time; stiff keeps contact ${Math.round(stiff.contactShare * 100)} percent here.`, at('stiff')],
    ['The bend', `Soft springs lean ${soft.leanDeg.toFixed(1)} degrees here; stiff ones lean ${stiff.leanDeg.toFixed(1)} degrees.`, at('stiff', 'smooth')]],
  controls: [{id: 'soft', setting: 'spring', label: 'Fit soft coil spring', value: 'soft'}, {id: 'stiff', setting: 'spring', label: 'Fit stiff coil spring', value: 'stiff'},
    {id: 'bumpy', setting: 'road', label: 'Roll the bumpy road under the wheel', value: 'bumpy'}, {id: 'smooth', setting: 'road', label: 'Roll the smooth road under the wheel', value: 'smooth'}],
  classify: r => r.leanDeg > (soft.leanDeg + stiff.leanDeg) / 2 ? 'gentle' : 'shaky',
  // Two questions use distinct pairs, but the frame needs a stable answer set.
  answers: [['gentle', 'Gentler ride / more lean'], ['shaky', 'More shake / less lean']],
  answerInputs: {gentle: at('soft'), shaky: at('stiff')},
  question: 'Will this spring give a gentler ride or more shake?',
  examples: [at('soft'), at('stiff'), at('soft', 'smooth')],
  prompts: ['Fit soft springs and roll the bumpy road.', 'Try stiff springs on the same bumps.', 'Try soft springs on the smooth road and compare lean.'],
  goal: (r, i) => i === 0 ? r.settings.spring === 'soft' && r.settings.road === 'bumpy' : i === 1 ? r.settings.spring === 'stiff' && r.settings.road === 'bumpy' : r.settings.road === 'smooth',
  success: 'You compared the car\'s shaking and how much it leans.',
  checks: [['Which springs give a gentler ride on bumps?', [at('stiff'), at('soft')], 1],
    ['Which springs let the car lean less in a bend?', [at('soft', 'smooth'), at('stiff', 'smooth')], 1]],
  hint: 'That spring and road are a different comparison. Change the coil or the road and run again.',
  plainer: 'Try soft on bumps, stiff on bumps, then both on smooth road.',
  resultHint: r => `These ${r.settings.spring} springs lean ${r.leanDeg.toFixed(1)} degrees in the bend. Change the spring or the road for Brian's comparison.`,
  replay: 'Compare the soft and stiff springs on bumps, then in a bend.',
  challenge: 'Try the other spring on the smooth road to finish all four comparisons.',
  card: 'Soft for bumps; stiff leans less on smooth fast roads.',
  picture: partPicture('spring', r => [`${r.settings.spring} spring`, `${r.leanDeg.toFixed(1)} degrees lean`, `${Math.round(r.contactShare * 100)}% contact`]),
};
export const {definition, hooks} = tunnelPacket(spec, suspensionDrawing, mountSuspension);
