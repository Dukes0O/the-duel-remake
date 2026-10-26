import {projectileBench, TARGET} from '../benches/projectile.js';
import {projectileInput, projectileReading, projectileDrawing, mountProjectile, dropPicture, landingPicture, FLAG_TOLERANCE_M} from './projectile-animation.js';
import {range, word, question, hint} from './flying-display.js';

const landing = projectileBench.run({heightM: 30, speedMs: 10}).water.distanceM;
const wonderLanding = projectileBench.run({heightM: 30, speedMs: 20}).water.distanceM;
const choices = [['short', 'Before the flag'], ['hit', 'At the flag'], ['past', 'Past the flag']];
const release = [['before', 'Before the buoy'], ['over', 'Over the buoy'], ['after', 'After the buoy']];
export const definition = {
  id: 'projectile', vocabulary: ['gravity', 'forward speed', 'arc'],
  wonder: {text: 'The water missed the buoy and splashed far beyond it. Why did it land over there?', animation: 'wonder', seconds: 4},
  words: [word('projectile', 'Gravity', 'Gravity is the pull that makes things fall faster every second.'),
    word('projectile', 'Forward speed', 'Forward speed is how fast the parcel moves sideways when you let go.'),
    word('projectile', 'Arc', 'An arc is the curved path a falling parcel follows.')],
  worked: [
    {name: 'Two parcels, one clock', text: 'Without air, both parcels fall for the same time. The one with forward speed lands ahead.', animation: 'pair', seconds: 4},
    {name: 'Further each second', text: 'Gravity makes each second of fall longer than the last. Watch the distance marks grow.', animation: 'gravity', seconds: 3},
    {name: 'Now try water', text: 'Water slows in air in this game. The water arc and its landing mark use that same rule.', animation: 'water', seconds: 4},
  ],
  tries: ['guided', 'prompted', 'alone'].map((support, i) => ({support,
    prompt: i === 0 ? 'Turn the flag handle to the landing mark, then drop the water.' : i === 1 ? 'Raise the arm or turn the trolley crank, then place your flag.' : 'Choose a height and speed, then place the flag where the water will land.',
    success: 'Your flag matched the water landing.', seconds: 4, animation: 'try',
    controls: [range('heightM', 'Raise the drop arm / lower it · m', 10, 60, 30, 5),
      range('speedMs', 'Turn the trolley crank / slow it', 0, 30, 10, 1), range('flagM', 'Move the flag · drag along the sand · m', 0, 80, TARGET.distanceM, 1, {drag: true})],
    prediction: question('Where will the water land beside your flag?', 'hit', choices),
  })),
  checks: [question('Where should she let go to hit the buoy?', 'before', release), question('At twice the forward speed, where should she let go?', 'before', release)],
  challenge: {title: 'Let go before the target.', text: 'It keeps your forward speed.'},
  hints: {miss: hint('The water missed your flag. Move the flag to the landing mark or change the trolley speed.', 'Put the flag at the blue landing mark, then pick At the flag.', 'Watch the water keep moving forward after it leaves the tower.'),
    prediction: hint('The landing did not match your picture. Compare the splash with the flag and choose again.', 'Pick Before, At or Past to match the splash.', 'Watch the flag beside the water landing.')},
};
const animations = Object.fromEntries(['wonder', 'gravity', 'forward-speed', 'arc', 'pair', 'water'].map(mode => [mode, ({time}) => projectileDrawing({heightM: mode === 'gravity' ? 60 : 30, speedMs: mode === 'wonder' ? 20 : 10, flagM: mode === 'wonder' ? wonderLanding / 2 : TARGET.distanceM}, time, mode)]));
animations.try = ({time, input}) => projectileDrawing(input, time);
const pictures = {short: landingPicture(landing - 10, landing), hit: landingPicture(landing, landing), past: landingPicture(landing + 10, landing)};
for (const [id] of release) { pictures[id] = dropPicture(id); animations[id] = ({time}) => projectileDrawing({flagM: id === 'before' ? landing : id === 'over' ? 0 : -10}, time); }
for (const [id, flagM] of [['short', landing + 10], ['hit', landing], ['past', landing - 10]]) animations[id] = ({time}) => projectileDrawing({flagM}, time);
export const hooks = {animations, pictures, mount: mountProjectile, evaluate({input, prediction}) {
  const p = projectileInput(input), r = projectileReading(p), actual = Math.abs(r.errorM) <= FLAG_TOLERANCE_M ? 'hit' : r.errorM < 0 ? 'short' : 'past';
  const failure = actual === 'hit' ? 'prediction' : 'miss';
  return {actual, passed: actual === 'hit' && prediction === actual, failure,
    hint: actual !== 'hit' ? {what: `It landed ${Math.round(Math.abs(r.errorM))} m ${r.errorM < 0 ? 'before' : 'past'} your flag. Move the flag to ${Math.round(r.water.distanceM)} m or turn the speed crank.`, plainer: `Set the flag to ${Math.round(r.water.distanceM)} m and pick At the flag.`} : definition.hints.prediction};
}};
