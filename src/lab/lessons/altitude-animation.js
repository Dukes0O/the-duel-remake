import {altitudeBench, SITES} from '../benches/altitude.js';
import {GRAVITY} from '../benches/lift-pad.js';
import {camera, object, ball, target, mountMachine, picture, line, dot, caption} from './flying-display.js';
import {withHelicopter} from './flying-helicopter.js';

export const siteIds = Object.keys(SITES);
export const altitudeInput = (input, index = 0) => ({siteIndex: index, loadKg: 2800, ...input});
export function altitudeReading(input) {
  const p = altitudeInput(input), site = siteIds[p.siteIndex];
  const stand = altitudeBench.run({site}), r = {...stand, liftKg: stand.aloftLiftKg};
  return {...r, loadKg: p.loadKg, outcome: Math.abs(r.liftKg - p.loadKg) <= 25 ? 'hover' : r.liftKg > p.loadKg ? 'up' : 'down'};
}
export function altitudeDrawing(input, time, mode = 'try') {
  const p = altitudeInput(input), r = altitudeReading(p), scale = .0003 / GRAVITY;
  const rise = r.outcome === 'up' ? Math.min(.4, time * .12) : r.outcome === 'hover' ? .1 * Math.min(1, time) : 0;
  const origin = [0, 1.222 + rise, 0];
  const forces = [{kind: 'lift', newtons: r.liftKg * GRAVITY, origin, direction: [0, 1, 0], displayValue: r.liftKg, displayUnit: 'kg', headWidth: .28, headLength: .28, inFront: true},
    {kind: 'weight', newtons: p.loadKg * GRAVITY, origin, direction: [0, -1, 0], displayValue: p.loadKg, displayUnit: 'kg', headWidth: .28, headLength: .28, inFront: true}];
  const objects = [target('height-selector', [1.0075, 1.0725, .52], [.5, .6, .4], 'siteIndex'), target('load-selector', [0, .4, .3], [1, .6, .8], 'loadKg')];
  for (const f of forces) objects.push({...object(`shaft-${f.kind}`, [0, f.origin[1] + f.direction[1] * f.newtons * scale / 2, 0], [.13, Math.max(.001, f.newtons * scale - .12), .13], f.kind === 'lift' ? '#56d683' : '#f06464'), inFront: true});
  // A transparent jar is a teaching outline; its particles count the same
  // air share used by the flight rules, rather than implying empty space.
  objects.push({...object('air-jar', [-2.2, 1.7, 0], [.9, 1.5, .9], '#71c9ff'), opacity: .14});
  for (let i = 0; i < Math.round(36 * r.gameShare); i++) objects.push(ball(`air-${i}`, [-2.2 + Math.sin(i * 13 + time) * .32, 1.1 + (i * .173 + time * .1) % 1.2, Math.cos(i * 7) * .32], .065, '#c4eddf'));
  return {input: p, reading: r, rise, time, mode, objects, forces, metresPerNewton: scale, camera: camera(2), hideLabels: true,
    labels: [`${SITES[r.site].name} · ${r.altitudeM.toLocaleString('en')} m`, `Can lift ${Math.round(r.liftKg).toLocaleString('en')} kg`, `Load ${p.loadKg.toLocaleString('en')} kg`],
    streams: [{medium: 'air', origin: [0, 1.8 + rise, 0], direction: [0, -1, 0], speed: 3 * r.gameShare, length: 1.5, radius: .8}]};
}
const mountStand = mountMachine('rotor-stand', (machine, d, clock) => {
  machine.visible = d.mode !== 'wonder';
  machine.position.y = d.rise;
  const rotor = machine.getObjectByName('rotor'); if (rotor) rotor.rotation.y = clock.time * 5;
  const needle = machine.getObjectByName('thrust-needle'); if (needle) needle.rotation.z = -Math.PI / 2 * d.reading.liftShare;
});
export const mountAltitude = withHelicopter(args => {
  const base = mountStand(args), weights = args.models.get('weights-and-cans').clone(true);
  args.group.add(weights);
  return {draw(d, clock) {
    if (!d.input) { base.draw(d, clock); weights.visible = false; return; }
    base.draw(d, clock); weights.visible = d.mode !== 'wonder';
    weights.position.set(-.2, .15 + d.rise, .1); weights.rotation.set(0, 0, 0);
    weights.scale.setScalar(.32 * Math.cbrt(d.input.loadKg / 1000));
  }, dispose() { base.dispose(); weights.removeFromParent(); }};
}, d => d.mode === 'wonder' ? [0, .5 + d.rise, 0] : null);
export const altitudePicture = (siteIndex, loadKg = 2800, outcome) => picture((ctx, w, h) => {
  const r = altitudeReading({siteIndex, loadKg});
  const y = outcome === 'up' || !outcome && r.outcome === 'up' ? 45 : outcome === 'hover' || !outcome && r.outcome === 'hover' ? 66 : h - 42;
  ctx.fillStyle = '#c8cebf'; ctx.fillRect(w / 2 - 25, y, 50, 17); line(ctx, w / 2 - 40, y - 7, w / 2 + 40, y - 7);
  line(ctx, w / 2 + 40, y, w / 2 + 40, y - r.liftKg * .012, '#56d683', 7);
  caption(ctx, `${SITES[siteIds[siteIndex]].name}`, w / 2, h - 4);
  for (let i = 0; i < Math.round(14 * r.gameShare); i++) dot(ctx, 18 + i % 3 * 9, 22 + Math.floor(i / 3) * 12, 2, '#c4eddf');
});
