// Ski wax (docs/LAB.md 4.3): skis on three snow samples with three waxes, timed down a glide. The friction numbers
// are the ski rules' own (ski-physics.js SKI.wax: 0.045 for the right wax, 0.06 for the wrong one). The game knows
// only "right" and "wrong"; which wax is right for which snow is the lesson (hard for cold, soft for wet).
import {SKI, GRAVITY} from '../../ski/ski-physics.js';
import {choice, makeBench} from './bench-core.js';

export const SNOWS = Object.freeze({powder: Object.freeze({name: 'Dry powder', celsius: -15, wax: 'hard'}),
  cold: Object.freeze({name: 'Cold snow', celsius: -5, wax: 'medium'}), wet: Object.freeze({name: 'Wet snow', celsius: 0, wax: 'soft'})});
export const WAXES = Object.freeze(['hard', 'medium', 'soft']);
// A 10 degree slope, 100 m of glide, from rest, ignoring the air (the same on every sample).
export const GLIDE = Object.freeze({slopeDeg: 10, distanceM: 100});

export function glideSeconds(friction) {
  const slope = GLIDE.slopeDeg * Math.PI / 180, acceleration = GRAVITY * (Math.sin(slope) - friction * Math.cos(slope));
  return Math.sqrt(2 * GLIDE.distanceM / acceleration);
}
const controls = [choice('snow', 'Snow', Object.keys(SNOWS), 'powder'), choice('wax', 'Wax', WAXES, 'hard')];

export const waxBench = makeBench({
  id: 'wax', controls, cues: [],
  run({snow, wax}) {
    const right = SNOWS[snow].wax === wax, friction = right ? SKI.wax.right : SKI.wax.wrong;
    return {snow, wax, right, friction, glideS: glideSeconds(friction), bestGlideS: glideSeconds(SKI.wax.right)};
  },
  goalMet: history => Object.keys(SNOWS).every(snow => history.some(({result}) => result.snow === snow && result.right)),
  facts: () => ({rightFriction: SKI.wax.right, wrongFriction: SKI.wax.wrong, rightS: glideSeconds(SKI.wax.right), wrongS: glideSeconds(SKI.wax.wrong)}),
});
