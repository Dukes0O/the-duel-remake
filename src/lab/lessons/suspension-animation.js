import {suspensionBench} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing} from './tunnel-model.js';
export const mountSuspension = tunnelMount('suspension');
const reference = suspensionBench.run({spring: 'stiff', road: 'bumpy'}).bodyShake;
const softShake = suspensionBench.run({spring: 'soft', road: 'bumpy'}).bodyShake;
export function suspensionDrawing(result, time, mode) {
  const d = tunnelDrawing(result), s = result.settings;
  // Pose is an illustration of measured body shake, not a second suspension solver.
  const shake = Math.sin(time * 9) * result.bodyShake / reference * .14;
  d.parts = [{name: 'spring', position: [.6, 1, .1], scale: [.75, .75 + shake, .75]},
    {name: 'tyre', position: [-.65, .7, .1], scale: [.65, .65, .65], rotation: [Math.PI / 2, 0, 0]}];
  d.cars = [{position: [0, 1.55 + shake, -.4], rotation: [0, -Math.PI / 2, Math.sin(time) * result.leanDeg * Math.PI / 180]}];
  if (mode === 'wonder') d.cars.push({position: [0, .18 + Math.sin(time * 9) * softShake / reference * .14, -1.8]});
  d.labels = [{text: `${s.spring} spring · ${result.leanDeg.toFixed(1)} degrees lean`, position: [.4, 1.65, .8]},
    {text: `Tyre light · ${Math.round(result.contactShare * 100)}% contact`, position: [-.8, .6, .75]},
    {text: `${s.road} road`, position: [0, .12, -.8]}];
  d.objects = [{id: 'spring-touch', control: s.spring === 'soft' ? 'stiff' : 'soft', position: [.6, 1.2, .1], size: [.7, 1.6, .7], opacity: 0},
    {id: 'road-touch', control: s.road === 'bumpy' ? 'smooth' : 'bumpy', position: [-.65, .2, .1], size: [1, .3, 1.5], colour: '#55615a'},
    {id: 'contact-light', shape: 'sphere', position: [-.65, .4, .95], size: [.22, .22, .22], colour: (time * 4) % 1 < result.contactShare ? '#56d683' : '#293533'}];
  if (s.road === 'bumpy') for (let i = 0; i < 5; i++) d.objects.push({id: `road-bump-${i}`, shape: 'sphere', position: [-2 + ((time + i) % 5), .13, .1], size: [.45, .18, 1.1], colour: '#666d69'});
  return d;
}
