import {lateralG} from '../benches/gforce.js';
import {word, moment, question} from './workshop-display.js';
import {G_BASE, readGforce, gforceOutcome, gforceSamples, gforceDrawing, mountGforce, gforcePicture} from './gforce-animation.js';

const predictions = [['more', 'More push'], ['less', 'Less push'], ['same', 'The same']];
export const definition = {
  id: 'gforce', vocabulary: ['g-force', '1 g', 'radius'],
  wonder: {text: 'In a fast corner the driver leans hard against the door. What is pushing him?', animation: 'wonder', seconds: 3},
  words: [
    word('gforce', 'G-force', 'G-force is the push you feel in a turn.'),
    word('gforce', '1 g', '1 g is a push as strong as your own weight.', 'one-g'),
    word('gforce', 'Radius', 'Radius is the distance from the middle of the turn to the car.'),
  ],
  worked: [
    moment('Start with a steady turn', `At ${G_BASE.speedMph} mph round ${G_BASE.radiusM} m, the push is ${lateralG(40, 50).toFixed(2)} g.`, 'same'),
    moment('Double the speed', 'Twice the speed makes four times the push, so the arrow grows four times.', 'double-speed', 4),
    moment('Make the turn tighter', 'Half the radius makes twice the push, and the hanging weight leans farther.', 'half-radius', 4),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: ['Turn the speed crank once to make more push.', 'Make less push than the first steady turn.', 'Find a turn with the same push as the first steady turn.'][i],
    success: 'You matched the turn to your picture.', animation: 'try', seconds: 3,
    controls: [
      {id: 'speedMph', label: 'Turn speed crank: add 20 mph / start again', value: 20, min: 20, max: 80, initial: 40, step: 20, cycle: true},
      {id: 'radiusM', label: 'Move car along arm: add 25 m / start again', value: 25, min: 25, max: 100, initial: 50, step: 25, cycle: true},
    ], prediction: question('Compared with 40 mph round 50 m, how much push?', ['more', 'less', 'same'][i], predictions),
  })),
  checks: [
    question('Which corner pushes hardest?', 'fast-tight', [['fast-tight', 'Fast and tight'], ['slow-tight', 'Slow and tight'], ['fast-wide', 'Fast and wide']]),
    question('Which turn gives four times the first push?', 'more', predictions),
  ],
  challenge: {text: 'Twice the speed, four times the push.'},
  hints: {turn: {
    what: 'The push did not match the picture. Change the speed or how tight the turn is.',
    plainer: 'For more push go faster or move in; for less go slower or move out.',
    worked: 'Watch the speed double and the arrow grow four times, then try again.',
  }},
};
const animations = {
  wonder: ({time}) => gforceDrawing(gforceSamples['fast-tight'], time),
  'g-force': ({time}) => gforceDrawing(G_BASE, time),
  'one-g': ({time}) => gforceDrawing({speedMph: 40, radiusM: lateralG(40, 1)}, time),
  radius: ({time}) => gforceDrawing({speedMph: 40, radiusM: time < 2 ? 50 : 25}, time),
  'double-speed': ({time}) => gforceDrawing({speedMph: time < 2 ? 40 : 80, radiusM: 50}, time, 'speed'),
  'half-radius': ({time}) => gforceDrawing({speedMph: 40, radiusM: time < 2 ? 50 : 25}, time),
  try: ({input, time}) => gforceDrawing(readGforce(input), time),
};
const pictures = {};
for (const [id, load] of Object.entries(gforceSamples)) { pictures[id] = gforcePicture(load); animations[id] = ({time}) => gforceDrawing(load, time); }
export const hooks = {animations, pictures, mount: mountGforce,
  evaluate({tryIndex, input, prediction}) {
    const load = readGforce(input), g = lateralG(load.speedMph, load.radiusM), actual = gforceOutcome(load);
    const wanted = ['more', 'less', 'same'][tryIndex], goal = actual === wanted;
    const change = wanted === 'more' ? 'Carry more speed through a tighter turn.' : wanted === 'less' ? 'Slow down or make the turn wider.' : 'Return to 40 mph and 50 m.';
    return {passed: goal && prediction === actual, actual, failure: 'turn', hint: {
      what: `You reached ${g.toFixed(2)} g. ${goal ? 'Keep this turn and choose its matching picture.' : change}`,
      plainer: goal ? `Keep ${load.speedMph} mph and ${load.radiusM} m, then choose ${actual} push.` : change,
    }};
  },
};
