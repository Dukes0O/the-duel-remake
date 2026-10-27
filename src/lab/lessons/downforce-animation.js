import {downforceBench} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing, arrow, arrowShafts} from './tunnel-model.js';
export const mountDownforce = tunnelMount('downforce');
export function downforceDrawing(result, time, mode) {
  const d = tunnelDrawing(result), s = result.settings;
  d.camera = {position: [-3.2, 1.5, 2.3], target: [0, .9, 0]};
  const flat = downforceBench.run({...s, wing: 'flat'});
  // DownforceKg and drag use the same bench-derived conversion to kg-equivalent.
  const reference = downforceBench.run({speedMph: 100, wing: 'big'});
  const gravity = reference.downforceN / reference.downforceKg;
  const dragKg = result.dragN / gravity;
  d.parts = [{name: 'wing', position: [0, 1.65, 0], rotation: [0, Math.PI / 2, s.wing === 'big' ? .3 : s.wing === 'small' ? .15 : 0], order: 'ZYX'},
    {name: 'scale', position: [0, .15, 0]}, {name: 'wing-stand', position: [0, 0, 0]}];
  d.parts.push({name: 'dial', position: [-1.5, 1.15, .9], rotation: [0, -.85, 0], dial: (s.speedMph - 50) / 50});
  d.cars = mode === 'wonder' ? [{position: [0, .18, -.8], rotation: [0, -Math.PI / 2, 0]}] : [];
  d.labels = [{text: `Wing · ${s.wing}`, position: [0, 2.3, 0]},
    {text: `Scale · ${result.downforceKg.toFixed(1)} kg push`, position: [0, .28, .6], colour: '#56d683'},
    {text: `Fan · ${s.speedMph} mph`, position: [-1.5, 1.65, .9]}];
  d.forces = [arrow('push', result.downforceKg, [.2, 1.65, .2], [0, -1, 0]), arrow('drag', dragKg, [.3, 1.7, .4], [1, 0, 0])];
  d.objects.push({id: 'fan-dial', shape: 'sphere', control: 'speedMph', position: [-1.5, 1.15, .9], size: [.4, .4, .4], opacity: 0},
    {id: 'wing-hinge', control: 'big', position: [1, 1.65, 0], size: [.3, .4, .4], opacity: 0});
  d.streams = [-.4, 0, .4].map(z => ({medium: 'air', origin: [-2.5, 1.7, z], direction: [1, -.07, 0], speed: s.speedMph / 30, length: 5, radius: .12, opacity: .9}));
  // Body drag still exists with a flat wing; it is never drawn as zero.
  d.result = {...result, bodyDragN: flat.dragN};
  return arrowShafts(d, .006);
}
