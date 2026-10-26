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
  const lean = Math.atan(g), hangingLength = .75 * .55 + .49 * .4;
  const weight = [x + Math.cos(phase) * Math.sin(lean) * hangingLength,
    3.38 * .55 - Math.cos(lean) * hangingLength, z + Math.sin(phase) * Math.sin(lean) * hangingLength];
  const force = arrow('push', g * 80, [x, .85, z], [-Math.cos(phase), 0, -Math.sin(phase)]);
  const drawing = {input: load, actual: gforceOutcome(load), reading: g, phase, r, x, z,
    hideLabels: true, metresPerNewton: .0055,
    forces: [force], objects: [
      {...box('crank', [-1.25, 1.0, .85], [.4, .2, .4], '#edc557', 'speedMph'), opacity: 0},
      {...box('radius-handle', [1.25, 1.0, .85], [.4, .2, .4], '#619dff', 'radiusM'), opacity: 0},
    ],
    props: [{id: 'speed', model: 'speed-wheel', position: [-1.25, .95, .85]},
      {id: 'radius', model: 'radius-wheel', position: [1.25, .95, .85]},
      {id: 'speed-stand', model: 'control-stand', position: [-1.25, 0, .85], scale: .95},
      {id: 'radius-stand', model: 'control-stand', position: [1.25, 0, .85], scale: .95},
      {id: 'driver-weight', model: 'mass-weight', position: weight, scale: .4, rotation: [0, -phase, lean]}],
    captions: [`${load.speedMph} mph · ${load.radiusM} m`, `${g.toFixed(2)} g\n${(g * 80).toFixed(0)} kg sideways for an 80 kg driver`],
    captionAnchors: [[-1.25, 1.0, .85], weight], captionOffsets: [[-140, 25], [35, 30]],
    camera: camera([2.8, 1.9, 3.7], [0, .8, 0]),
  };
  if (mode === 'speed') drawing.graph = {position: [-1.5, 1.9, -.4], size: [1.25, .7, 1], xLabel: 'Time in seconds', yLabel: 'Push in g', maxX: 4, maxY: lateralG(80, 50), points: Array.from({length: 41}, (_, i) => [i / 10, lateralG(i < 20 ? 40 : 80, 50)])};
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
    car.position.set(d.x, .42, d.z); car.rotation.y = -d.phase;
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
