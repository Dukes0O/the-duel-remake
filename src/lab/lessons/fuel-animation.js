import {fuelBench, FUEL_RIG} from '../benches/tunnel.js';
import {tunnelMount, tunnelDrawing, arrow, arrowShafts} from './tunnel-model.js';
export const mountFuel = tunnelMount('fuel');
export function fuelDrawing(result, time, mode, context = {}) {
  if (mode === 'watch' && context.index === 0) result = fuelBench.run({...result.settings, litres: result.settings.litres * Math.min(1, time / 3)});
  const d = tunnelDrawing(result), full = fuelBench.run({litres: FUEL_RIG.tankLitres});
  const litres = result.settings.litres;
  d.parts = [{name: 'can', position: [0, 1.1, .4], rotation: [0, 0, mode === 'try' && time < 1 ? -.25 : 0], scale: [1.25, 1.25, 1.25], fill: litres / FUEL_RIG.tankLitres}, {name: 'scale', position: [0, .15, .4]}];
  d.labels = [{text: `Jerry can · ${litres} litres`, position: [0, 1.55, .9]},
    {text: `Scale · ${result.fuelKg.toFixed(1)} kg`, position: [0, .6, 1], colour: '#f06464'},
    {text: `0–60 mph · ${result.zeroToSixtyS.toFixed(2)} seconds`, position: [0, 2.4, -.8]}];
  d.cars = [{position: [-1 + Math.min(2, time / result.zeroToSixtyS * 2), .18, -1.1]},
    {position: [-1 + Math.min(2, time / full.zeroToSixtyS * 2), .18, -2.2]}];
  d.forces = [arrow('weight', result.fuelKg, [.7, 1.5, .7], [0, -1, 0])];
  d.objects.push({id: 'pour-can', control: 'litres', position: [0, 1.1, .4], size: [1, 1.5, .7], opacity: 0});
  return arrowShafts(d, .02);
}
