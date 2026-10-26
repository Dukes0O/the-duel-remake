import {pendulumBench, stringPeriod} from '../benches/pendulum.js';
import {PAD} from '../benches/lift-pad.js';
import {camera, target, mountMachine, picture, line, dot, caption} from './flying-display.js';
import {createUnlockedVehicle} from '../../unlock-vehicles.js';
import {withHelicopter} from './flying-helicopter.js';

export const lengths = [5, 15, 25];
export const pendulumInput = input => ({lengthM: 15, weightKg: 20, pull: 1, ...input});
export const pendulumReading = input => pendulumBench.run({kind: 'string', ...pendulumInput(input)});
const cableSeconds = pendulumBench.run({kind: 'cable', lengthM: 15, weightKg: PAD.carKg}).periodS;
export function pendulumDrawing(input, time, mode = 'try') {
  const p = pendulumInput(input), r = pendulumReading(p);
  const angle = p.pull ? .22 * Math.cos(time * Math.PI * 2 / r.periodS) : 0;
  const cordX = p.lengthM === 5 ? -1.04 : p.lengthM === 25 ? 1.04 : 0;
  const bob = [cordX + .13 * p.lengthM * Math.sin(angle), 3.692 - .13 * p.lengthM * Math.cos(angle), 0];
  return {input: p, reading: r, mode, time, camera: camera(3.2), hideLabels: true,
    objects: [target('short', [-1.04, 3.692, 0], [.4, .3, .4], 'lengthM'), target('medium', [0, 3.692, 0], [.4, .3, .4], 'lengthM'), target('long', [1.04, 3.692, 0], [.4, .3, .4], 'lengthM'),
      target('weight', [1.4, 2.3, -.4], [.5, .6, .4], 'weightKg'), target('pull', bob, [.45, .45, .45], 'pull')],
    labels: mode === 'all' ? lengths.map(l => `${l} m · ${stringPeriod(l).toFixed(1)} s per swing`) :
      mode === 'cable' || mode === 'wonder' ? [`Car on 15 m cable · ${cableSeconds?.toFixed(1)} s`, 'Hover still before setting down'] : [`${p.lengthM} m · ${p.weightKg} kg`, `One swing: ${r.periodS.toFixed(1)} s`, `Clock: ${Math.min(time, r.periodS).toFixed(1)} s`],
    graph: mode === 'all' ? null : {position: [3, 4.3, -.5], size: [1.8, 1, 1], xLabel: 'Time in seconds', yLabel: 'Swing from centre', maxX: r.periodS, maxY: 2,
      points: Array.from({length: 61}, (_, i) => [i * r.periodS / 60, 1 + Math.cos(i * Math.PI / 30)])}};
}
const mountFrame = mountMachine('pendulum-frame', (machine, d) => {
  const p = d.input;
  for (const [i, name] of ['cord-short', 'cord-medium', 'cord-long', 'cord-medium-heavy'].entries()) {
    const cord = machine.getObjectByName(name); if (!cord) continue;
    const length = lengths[i] ?? p.lengthM;
    const car = d.mode === 'cable' || d.mode === 'wonder';
    cord.visible = !car && (d.mode === 'all' ? i < 3 : p.weightKg > 100 ? i === 3 : length === p.lengthM && i < 3);
    if (i === 3) { cord.scale.y = p.lengthM / 15; cord.position.x = p.lengthM === 5 ? -1.6 : p.lengthM === 25 ? 1.6 : 0; }
    const period = d.mode === 'cable' || d.mode === 'wonder' ? cableSeconds : stringPeriod(length);
    cord.rotation.z = (p.pull ? .22 : 0) * Math.cos(d.time * Math.PI * 2 / period) * (d.mode === 'wonder' ? Math.min(2, 1 + d.time * .2) : 1);
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
      car.position.set(3 * Math.sin(angle), 4.5 - 3 * Math.cos(angle), 1);
      const p = cable.geometry.attributes.position; p.setXYZ(0, 0, 4.5, 1); p.setXYZ(1, car.position.x, car.position.y + .35, 1); p.needsUpdate = true; cable.geometry.computeBoundingSphere();
    }
  }, dispose() { base.dispose(); car.removeFromParent(); car.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) m.dispose(); }); cable.removeFromParent(); cable.geometry.dispose(); cable.material.dispose(); }};
}, d => d.mode === 'cable' || d.mode === 'wonder' ? [0, 4.25, 1] : null);
export const swingPicture = (length, weight = 20) => picture((ctx, w, h) => {
  const y = 22, bottom = 25 + length * 2.8;
  line(ctx, w / 2 - 30, y, w / 2 + 30, y); line(ctx, w / 2, y, w / 2 + 20, bottom);
  dot(ctx, w / 2 + 20, bottom, weight > 100 ? 14 : 8);
  caption(ctx, `${length} m · ${weight} kg`, w / 2, h - 3);
});
