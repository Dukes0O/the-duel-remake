import {pendulumBench, stringPeriod} from '../benches/pendulum.js';
import {PAD} from '../benches/lift-pad.js';
import {object, ball, target, mountMachine, picture, line, dot, caption} from './flying-display.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {withHelicopter} from './flying-helicopter.js';

export const lengths = [5, 15, 25];
export const pendulumInput = input => ({lengthM: 15, weightKg: 20, pull: 1, ...input});
export const pendulumReading = input => pendulumBench.run({kind: 'string', ...pendulumInput(input)});
const cableSeconds = pendulumBench.run({kind: 'cable', lengthM: 15, weightKg: PAD.carKg}).periodS;
export function pendulumDrawing(input, time, mode = 'try') {
  const p = pendulumInput(input), r = pendulumReading(p);
  const angle = p.pull ? .22 * Math.cos(time * Math.PI * 2 / r.periodS) : 0;
  const cordX = p.lengthM === 5 ? -1.1 : p.lengthM === 25 ? 1.1 : 0;
  const bob = [cordX + .1 * p.lengthM * Math.sin(angle), 2.84 - .1 * p.lengthM * Math.cos(angle), 0];
  const objects = [target('short', [-1.1, 2.84, 0], [.4, .3, .4], 'lengthM'), target('medium', [0, 2.84, 0], [.4, .3, .4], 'lengthM'), target('long', [1.1, 2.84, 0], [.4, .3, .4], 'lengthM'),
    target('weight', [1.4, 2.3, -.4], [.5, .6, .4], 'weightKg'), target('pull', bob, [.6, .6, .6], 'pull')];
  const colours = ['#edc557', '#56d683', '#71c9ff'];
  const labelPositions = [];
  for (let i = 0; i < 3; i++) {
    const length = lengths[i];
    const a = (p.pull ? .22 : 0) * Math.cos(time * Math.PI * 2 / stringPeriod(length));
    const x = (i - 1) * 1.1, end = [x + length * .1 * Math.sin(a), 2.84 - length * .1 * Math.cos(a), .08];
    labelPositions.push([end[0] + (i < 2 ? -.3 : .3), end[1], .08]);
    if (mode !== 'all' && length !== p.lengthM || mode === 'cable' || mode === 'wonder') continue;
    objects.push({...object(`string-${i}`, [(x + end[0]) / 2, (2.84 + end[1]) / 2, .08], [.035, length * .1, .035], colours[i]), rotation: [0, 0, a]});
    objects.push(ball(`weight-${i}`, end, p.weightKg > 100 ? .48 : .34, colours[i]));
  }
  const cableMode = mode === 'cable' || mode === 'wonder';
  return {input: p, reading: r, mode, time,
    camera: cableMode ? {position: [1.4, 2.1, 6.2], target: [0, 1.5, .7]} : {position: [1.2, 1.6, 4.7], target: [0, .95, 0]}, hideLabels: true, objects,
    platePosition: [0, 2.85, .1],
    labelAligns: mode === 'all' ? ['end', 'end', 'start'] : ['start', 'start', 'start'],
    labelColours: mode === 'all' ? colours : [colours[lengths.indexOf(p.lengthM)], '#f5f0dc', '#f5f0dc'],
    labelPositions: mode === 'all' ? labelPositions : cableMode ? [[.7, 1.3, 1], [-.7, 2, 1]] : [[bob[0] + .35, bob[1], 0], [bob[0] + .35, bob[1] + .35, 0], [1.35, 1.5, -.2]],
    labels: mode === 'all' ? lengths.map(l => `${l} m · ${stringPeriod(l).toFixed(1)} s per swing`) :
      mode === 'cable' || mode === 'wonder' ? [`Car on 15 m cable · ${cableSeconds?.toFixed(1)} s`, 'Hover still before setting down'] : [`${p.lengthM} m · ${p.weightKg} kg`, `One swing: ${r.periodS.toFixed(1)} s`, `Clock: ${Math.min(time, r.periodS).toFixed(1)} s`],
    graph: mode === 'all' ? null : {position: [-1.3, 1, -.3], size: [1.1, .65, 1], xLabel: 'Time in seconds', yLabel: 'Swing from centre', maxX: r.periodS, maxY: 2,
      points: Array.from({length: 61}, (_, i) => [i * r.periodS / 60, 1 + Math.cos(i * Math.PI / 30)])}};
}
const mountFrame = mountMachine('pendulum-frame', (machine, d) => {
  machine.scale.setScalar(.5);
  for (const name of ['cord-short', 'cord-medium', 'cord-long', 'cord-medium-heavy']) {
    const cord = machine.getObjectByName(name);
    if (cord) cord.visible = false; // The readable teaching cords replace these tiny bobs.
  }
  const hand = machine.getObjectByName('stopwatch-hand'); if (hand) hand.rotation.z = -d.time * Math.PI / 30;
});
export const mountPendulum = withHelicopter(args => {
  const base = mountFrame(args), car = createUnlockedVehicle({key: 'dusthawk_rally'});
  car.scale.setScalar(.33); args.group.add(car);
  const cable = new args.THREE.Line(new args.THREE.BufferGeometry().setFromPoints([new args.THREE.Vector3(), new args.THREE.Vector3()]), new args.THREE.LineBasicMaterial({color: '#c6cabc'})); args.group.add(cable);
  return {draw(d, clock) {
    base.draw(d, clock); car.visible = cable.visible = d.mode === 'cable' || d.mode === 'wonder';
    if (car.visible) {
      const angle = .22 * Math.cos(clock.time * Math.PI * 2 / cableSeconds) * (d.mode === 'wonder' ? Math.min(2, 1 + clock.time * .2) : Math.exp(-clock.time * .12));
      car.position.set(1.5 * Math.sin(angle), 2.84 - 1.5 * Math.cos(angle), 1);
      const p = cable.geometry.attributes.position; p.setXYZ(0, 0, 2.84, 1); p.setXYZ(1, car.position.x, car.position.y, 1); p.needsUpdate = true; cable.geometry.computeBoundingSphere();
    }
  }, dispose() { base.dispose(); car.removeFromParent(); car.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) m.dispose(); }); cable.removeFromParent(); cable.geometry.dispose(); cable.material.dispose(); }};
}, d => d.mode === 'cable' || d.mode === 'wonder' ? [0, 2.84, 1] : null);
export const swingPicture = (length, weight = 20) => picture((ctx, w, h) => {
  const y = 22, bottom = 25 + length * 2.8;
  line(ctx, w / 2 - 30, y, w / 2 + 30, y); line(ctx, w / 2, y, w / 2 + 20, bottom);
  dot(ctx, w / 2 + 20, bottom, weight > 100 ? 14 : 8);
  caption(ctx, `${length} m · ${weight} kg`, w / 2, h - 3);
});
