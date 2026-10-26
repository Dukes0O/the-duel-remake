import {lateralG} from '../benches/gforce.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {box, camera, arrow, thickArrows, mountMachine, pictureBase, pictureArrow} from './workshop-display.js';

export const G_BASE = Object.freeze({speedMph: 40, radiusM: 50});
export const readGforce = input => ({...G_BASE, ...input});
export function gforceOutcome(input) {
  const g = lateralG(input.speedMph, input.radiusM), base = lateralG(G_BASE.speedMph, G_BASE.radiusM);
  return Math.abs(g - base) < 1e-9 ? 'same' : g > base ? 'more' : 'less';
}
export const gforceSamples = {
  more: {speedMph: 80, radiusM: 50}, less: {speedMph: 20, radiusM: 50}, same: G_BASE,
  'fast-tight': {speedMph: 80, radiusM: 25}, 'slow-tight': {speedMph: 40, radiusM: 25}, 'fast-wide': {speedMph: 80, radiusM: 100},
};
export function gforceDrawing(input, time, mode = 'turn') {
  const load = readGforce(input), g = lateralG(load.speedMph, load.radiusM);
  const phase = time * load.speedMph / 80, r = load.radiusM / 50;
  const x = Math.cos(phase) * r, z = Math.sin(phase) * r;
  const force = arrow('push', g * 80, [x, 1.65, z], [-Math.cos(phase), 0, -Math.sin(phase)]);
  const drawing = {input: load, actual: gforceOutcome(load), reading: g, phase, r, x, z,
    hideLabels: true, metresPerNewton: .004,
    forces: [force], objects: [
      box('crank', [-1.4, 1.05, 1], [.12, .6, .12], '#edc557', 'speedMph', [0, 0, -load.speedMph / 80]),
      box('radius-handle', [r, 1.25, .45], [.3, .2, .3], '#619dff', 'radiusM'),
    ],
    captions: [`${load.speedMph} mph · ${load.radiusM} m`, `${g.toFixed(2)} g\n${(g * 80).toFixed(0)} kg sideways for an 80 kg driver`],
    camera: camera([2.7, 3.2, 5.5], [0, 1.3, 0]),
  };
  if (mode === 'speed') drawing.graph = {position: [-1.8, 2.9, -.7], size: [1.8, 1.01, 1], xLabel: 'Time in seconds', yLabel: 'Push in g', maxX: 4, maxY: lateralG(80, 50), points: Array.from({length: 41}, (_, i) => [i / 10, lateralG(i < 20 ? 40 : 80, 50)])};
  return thickArrows(drawing);
}
export function mountGforce(options) {
  let car;
  return mountMachine(options, 'turning-arm', (machine, d, clock, own, {group}) => {
    machine.scale.setScalar(.55);
    const arm = machine.getObjectByName('arm'); if (arm) { arm.rotation.y = -d.phase; arm.scale.x = d.r / (3 * .55); }
    const plumb = machine.getObjectByName('plumb');
    if (plumb) { plumb.rotation.set(0, -d.phase, Math.atan(d.reading)); plumb.position.set(d.x / .55, 3.38, d.z / .55); }
    if (!car) { car = createUnlockedVehicle({key: 'banshee_muscle'}); car.scale.setScalar(.22); group.add(car); own.push(car); }
    car.position.set(d.x, 1.05, d.z); car.rotation.y = -d.phase;
    if (car.userData.driver) car.userData.driver.rotation.z = -Math.min(.6, Math.atan(d.reading) * .4);
  });
}
export function gforcePicture(load) {
  const g = lateralG(load.speedMph, load.radiusM);
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    ctx.strokeStyle = '#91a69c'; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(115, 80, load.radiusM < 50 ? 48 : 80, 28, 0, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.fillStyle = '#d97b3d'; ctx.fillRect(102, 49, 49, 25);
    pictureArrow(ctx, 126, 42, -Math.min(93, g * 23), 0);
    ctx.fillStyle = '#f5f0dc'; ctx.fillText(`${load.speedMph} mph · ${load.radiusM} m`, w / 2, 116);
  };
}
