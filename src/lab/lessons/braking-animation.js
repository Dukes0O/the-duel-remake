import {brakingBench, BRAKE_RIG} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing, arrow, arrowShafts} from './tunnel-model.js';
export const mountBraking = tunnelMount('braking');
export function brakingDrawing(result, time, mode) {
  const d = tunnelDrawing(result), fifty = brakingBench.run({...result.settings, speedMph: 50});
  const hundred = brakingBench.run({...result.settings, speedMph: 100});
  const comparison = mode === 'watch' || mode === 'wonder';
  const rows = comparison ? [fifty, hundred] : [result];
  const progress = Math.min(1, time / (mode === 'try' ? 2 : 3)), travel = 1 - (1 - progress) ** 2;
  const roadScale = Math.max(hundred.stopMetres, result.stopMetres);
  d.cars = rows.map((r, i) => ({position: [-1.2 + travel * (r.stopMetres / roadScale) * 2.4, .18, i ? -.65 : .85], rotation: [0, Math.PI / 2 + (r.rearSlides ? progress * .4 : 0), progress < 1 ? -.035 : 0], order: 'ZYX'}));
  d.parts = [{name: 'brake', position: [1.7, 1.35, 0], scale: [.65, .65, .65], rotation: [Math.PI / 2, 0, time * .25]}];
  d.parts.push({name: 'dial', position: [-1.5, 1.15, 1.1], rotation: [0, .8, 0], dial: (result.settings.speedMph - 20) / 130});
  d.labels = rows.map((r, i) => ({text: `${r.settings.speedMph} mph · ${r.stopMetres.toFixed(1)} metres`, position: [0, .25, i ? -1.3 : .2], colour: i ? '#619dff' : '#edc557'}));
  d.labels.push({text: `Brake disc · ${result.settings.frontShare}% front`, position: [1.2, 2, 0]});
  d.forces = rows.flatMap((r, i) => {
    const at = d.cars[i].position, front = BRAKE_RIG.staticFront + (r.frontLoadShare - BRAKE_RIG.staticFront) * Math.min(1, progress * 4);
    return [arrow('weight', front, [at[0] + .65, 1.3, at[2] + .25], [0, -1, 0]), arrow('weight', 1 - front, [at[0] - .65, 1.3, at[2] + .25], [0, -1, 0])];
  });
  d.objects.push({id: 'balance-lever', control: 'frontShare', position: [1.6, 1.65, 1.1], size: [.08, .6, .08], rotation: [0, 0, (result.settings.frontShare - 65) / 50], colour: '#c8b665'},
    {id: 'speed-dial', shape: 'sphere', control: 'speedMph', position: [-1.5, 1.15, 1.1], size: [.4, .4, .4], opacity: 0});
  return arrowShafts(d, 1.3);
}
