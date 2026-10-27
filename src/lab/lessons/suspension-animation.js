import {suspensionBench} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing} from './tunnel-model.js';
export const mountSuspension = tunnelMount('suspension');
const comparison = ['soft', 'stiff'].map(spring => suspensionBench.run({spring, road: 'bumpy'}));
const reference = comparison[1].bodyShake;
const softShake = comparison[0].bodyShake;
export function suspensionDrawing(result, time, mode, context = {}) {
  const d = tunnelDrawing(result), s = result.settings;
  if (mode === 'watch' && context.index === 1) {
    d.cars = comparison.map((r, i) => ({position: [i ? 1.1 : -1.1, .55 + Math.sin(time * 9) * r.bodyShake / reference * .14, 0],
      rotation: [0, -Math.PI / 2, Math.sin(time) * r.leanDeg * Math.PI / 180]}));
    d.labels = [{text: 'Soft · less shake, more lean', position: [-1.1, 1.5, 0]},
      {text: 'Stiff · more shake, less lean', position: [1.1, 1.5, 0]}];
    for (let i = 0; i < 5; i++) d.objects.push({id: `road-bump-${i}`, shape: 'sphere', position: [-2 + ((time + i) % 5), .13, 0], size: [.45, .18, 1.1], colour: '#666d69'});
    return d;
  }
  // Pose is an illustration of measured body shake, not a second suspension solver.
  const shake = Math.sin(time * 9) * result.bodyShake / reference * .14;
  d.parts = [{name: 'spring', position: [.6, 1, .1], scale: [.75, .75 + shake, .75]},
    {name: 'tyre', position: [-.65, .7, .1], scale: [.65, .65, .65], rotation: [Math.PI / 2, 0, 0]}];
  d.cars = [{position: [0, 1.55 + shake, -.4], rotation: [0, -Math.PI / 2, Math.sin(time) * result.leanDeg * Math.PI / 180]}];
  if (mode === 'wonder') d.cars.push({position: [0, .18 + Math.sin(time * 9) * softShake / reference * .14, -1.8]});
  d.labels = [{text: `${s.spring} spring · ${result.leanDeg.toFixed(1)} degrees lean`, position: [.4, 1.65, .8]},
    {text: `${s.road} road`, position: [0, .12, -.8]}];
  d.objects = [{id: 'spring-touch', control: s.spring === 'soft' ? 'stiff' : 'soft', position: [.6, 1.2, .1], size: [.7, 1.6, .7], opacity: 0},
    {id: 'road-touch', control: s.road === 'bumpy' ? 'smooth' : 'bumpy', position: [-.65, .2, .1], size: [1, .3, 1.5], colour: '#55615a'}];
  if (s.road === 'bumpy') for (let i = 0; i < 5; i++) d.objects.push({id: `road-bump-${i}`, shape: 'sphere', position: [-2 + ((time + i) % 5), .13, .1], size: [.45, .18, 1.1], colour: '#666d69'});
  return d;
}
