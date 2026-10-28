import {launchBench, TARGET, bestAngle} from '../benches/launch.js';
import {word, moment, question} from './workshop-display.js';
import {launchDrawing, launchPicture, mountLaunch, launchSamples} from './launch-animation.js';

export const readLaunch = input => launchBench.run(input).settings;
export function launchOutcome(input) {
  const r = launchBench.run(input), flag = input.flagM ?? TARGET.rangeM;
  return Math.abs(r.rangeM - flag) <= TARGET.withinM ? 'flag' : r.rangeM < flag ? 'short' : 'past';
}
const airAngle = Math.round(bestAngle(20, {air: true})), lowerAngle = Math.round(bestAngle(20, {air: true, lower: true}));
const rows = [['short', 'Before the flag'], ['flag', 'At the flag'], ['past', 'Past the flag']];
export const definition = {
  id: 'launch', vocabulary: ['launch angle', 'speed', 'distance'],
  wonder: {text: 'The skier landed short of the table. Which way should we point the ramp?', animation: 'wonder', seconds: 3},
  words: [
    word('launch', 'Launch angle', 'Launch angle is how far the ramp points up from level ground.'),
    word('launch', 'Speed', 'Speed is how fast something moves, shown here in mph.'),
    word('launch', 'Distance', 'Distance is how far it travels along the ground, shown in metres.'),
  ],
  worked: [
    moment('Five launches, same speed', 'At the same speed on flat ground with no air, 45 degrees goes furthest.', 'compare', 7),
    moment('Air slows the skier', `With air, the best launch angle here is ${airAngle} degrees. The orange arrow points against the moving skier.`, 'air', 4),
    moment('A lower landing', `With air and a landing 10 m lower, the best angle here is ${lowerAngle} degrees. The skier has longer to fall.`, 'lower', 4),
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: ['Drag the angle dial to 45 degrees and keep the same speed, then place the flag where it will land.', 'Change only the angle and move the flag to predict the distance.', 'Choose your angle, speed and landing flag.'][i],
    success: 'The skier reached your flag.', seconds: 4, animation: 'try',
    controls: [
      {id: 'angleDeg', label: 'Turn ramp angle dial', value: 1, min: 15, max: 75, initial: 45, step: 1, drag: true, keyboard: 'vertical', rate: 15},
      {id: 'speedMs', label: 'Turn speed dial', value: 1, min: 5, max: 24, initial: 20, step: 1, drag: true},
      {id: 'flagM', label: 'Place landing flag', value: 1, min: 0, max: 60, initial: 30, step: 1, drag: true},
    ], prediction: question('Where will the skier land?', 'flag', rows),
  })),
  checks: [
    question('Which launch reaches the furthest flag on flat ground with no air?', 'angle45', [['angle15', '15 degrees'], ['angle45', '45 degrees'], ['angle75', '75 degrees']]),
    question('Which launch reaches the flag with air and a lower landing?', 'lower-best', [['lower-steep', 'Steep ramp'], ['lower-best', 'Lower ramp']]),
  ].map((q, i) => ({...q, animation: i ? 'lower' : 'compare'})),
  challenge: {text: 'About 45 degrees goes furthest on level ground; use a lower angle for a lower landing.',
    title: 'Launch angles',
    try: {support: 'alone', prompt: `Reach the fixed ${TARGET.rangeM} m flag.`, success: 'You reached the target.', seconds: 4, animation: 'challenge',
      controls: [
        {id: 'angleDeg', label: 'Turn ramp angle dial', value: 1, min: 15, max: 75, initial: 45, step: 1, drag: true, keyboard: 'vertical', rate: 15},
        {id: 'speedMs', label: 'Turn speed dial', value: 1, min: 5, max: 24, initial: 20, step: 1, drag: true},
      ], prediction: question('Where will it land against the fixed flag?', 'flag', rows)}},
  hints: {
    picture: {what: 'The skier reached the flag, but your picture showed a different landing. Keep the ramp and flag unchanged and pick At the flag.', plainer: 'The setup is right; choose At the flag.', worked: 'Watch the skier reach the flag, then pick the matching picture.'},
    prediction: {what: 'The skier missed your flag. Move it along the tape to where the skier landed.', plainer: 'Keep the ramp unchanged and put your flag beside the end of the trail.', worked: 'Watch the five trails, then put your flag beside the landing.'},
    target: {what: 'The skier missed the fixed target. Change the angle or speed and try again.', plainer: 'Set 45 degrees and turn the speed dial to 38 mph.', worked: 'Watch how the angle changes the landing, then aim for the fixed flag.'},
  },
};
const animations = {
  wonder: ({time}) => launchDrawing({angleDeg: 75}, time),
  'launch-angle': ({time}) => launchDrawing({angleDeg: 15 + Math.min(time, 4) * 15}, 0),
  speed: ({time}) => launchDrawing({}, time), distance: ({time}) => launchDrawing({}, time),
  compare: ({time}) => launchDrawing({}, time, 'compare'),
  air: ({time}) => launchDrawing({air: 'air', angleDeg: airAngle}, time, 'air'),
  lower: ({time}) => launchDrawing({air: 'air', landing: '10 m lower', angleDeg: lowerAngle}, time, 'lower'),
  try: ({input, time}) => launchDrawing(input, time),
  challenge: ({input, time}) => launchDrawing({...input, flagM: TARGET.rangeM}, time),
};
const pictures = {};
for (const [id, sample] of Object.entries(launchSamples)) {
  pictures[id] = launchPicture(sample); animations[id] = ({time}) => launchDrawing(sample, time);
}
export const hooks = {animations, pictures, mount: mountLaunch,
  evaluate({input, prediction}) {
    const actual = launchOutcome(input), failure = actual === 'flag' ? 'picture' : Object.hasOwn(input, 'flagM') ? 'prediction' : 'target';
    return {passed: prediction === actual && actual === 'flag', actual, failure};
  },
};
