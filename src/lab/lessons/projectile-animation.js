import {projectileBench, stoneDrop, stoneFallAfter, waterTrace, TARGET} from '../benches/projectile.js';
import {object, ball, target, mountMachine, picture, line, dot} from './flying-display.js';
import {withHelicopter} from './flying-helicopter.js';

export const projectileInput = input => ({heightM: 30, speedMs: 10, flagM: TARGET.distanceM, ...input});
// A flag marks a point to the nearest metre, unlike the flying challenge's
// generous buoy ring. Half a metre is the flag handle's measurement precision.
export const FLAG_TOLERANCE_M = .5;
const traces = new Map(), readings = new Map();
export function projectileReading(input) {
  const p = projectileInput(input), key = `${p.heightM}/${p.speedMs}`;
  if (!readings.has(key)) readings.set(key, projectileBench.run(p));
  const r = readings.get(key);
  return {...r, flagM: p.flagM, errorM: r.water.distanceM - p.flagM};
}
export function projectileDrawing(input, time, mode = 'water') {
  const p = projectileInput(input), r = projectileReading(p), compact = mode === 'pair' || mode === 'gravity' || mode === 'arc';
  const flight = compact ? stoneDrop(p.heightM, p.speedMs) : r.water;
  const t = Math.min(compact ? time : time * flight.seconds / 4, flight.seconds), fraction = t / flight.seconds, scale = .1;
  const key = `${p.heightM}/${p.speedMs}`;
  if (!compact && !traces.has(key)) {
    if (traces.size >= 8) traces.delete(traces.keys().next().value);
    traces.set(key, waterTrace(p.heightM, p.speedMs));
  }
  const trace = traces.get(key);
  const at = f => compact ? {distanceM: flight.distanceM * f, heightM: p.heightM * (1 - f * f)} : trace[Math.min(trace.length - 1, Math.round(f * (trace.length - 1)))];
  const current = at(fraction);
  const y = .3 + current.heightM * scale, x = -1.3 + current.distanceM * scale;
  const objects = [ball('parcel', [x, y, .65], .44, '#71c9ff'),
    target('arm-control', [-1.3, .66 + p.heightM * scale, .65], [.7, .7, .6], 'heightM'),
    target('crank-control', [.4, 1.45, -.25], [.5, .8, .6], 'speedMs'),
    object('flag-pole', [-1.3 + p.flagM * scale, .65, .8], [.05, .9, .05], '#f5f0dc', 'flagM'),
    object('flag', [-1.1 + p.flagM * scale, 1.05, .8], [.4, .24, .04], '#edc557', 'flagM')];
  if (compact) objects.push(ball('straight-parcel', [-1.3, y, .65], .44, '#edc557'));
  // Closely spaced bright marks form a thick trail that stays behind each ball.
  for (let i = 0; i <= 100; i++) {
    const f = fraction * i / 100, mark = at(f);
    objects.push(ball(`arc-${i}`, [-1.3 + mark.distanceM * scale, .3 + mark.heightM * scale, .65], .11, '#71c9ff'));
    if (compact) objects.push(ball(`drop-${i}`, [-1.3, .3 + mark.heightM * scale, .65], .11, '#edc557'));
  }
  // Teaching balls and their trails remain visible across the tower braces.
  objects.filter(o => o.shape === 'sphere').forEach(o => { o.inFront = true; });
  const marks = [1, 2, 3].map(s => .3 + (p.heightM - stoneFallAfter(s)) * scale);
  if (mode === 'gravity') marks.forEach((y, i) => objects.push(object(`fall-mark-${i}`, [-1.3, y, .65], [.8, .045, .08], '#edc557')));
  const span = Math.max(2.2, p.heightM * scale + .5);
  const view = {position: [span * .4, span * .45, span * 1.9], target: [0, span * .42, .65]};
  return {input: p, reading: r, mode, time, fraction, objects, camera: view, hideLabels: true,
    platePosition: [-1.3, 1.1, 1],
    labelPositions: mode === 'gravity' ? marks.map(y => [-2.1, y, .65]) : compact ?
      [[-1.9, y - .25, .65], [x + .65, y + .3, .65], [-1.3, .3 + p.heightM * scale + .45, .65]] :
      [[x + .6, y + .3, .65], [-1.3, .3 + p.heightM * scale + .45, .65], [-.8 + p.flagM * scale, .65, .8]],
    labelColours: mode === 'gravity' ? ['#edc557', '#edc557', '#edc557'] : ['#71c9ff', '#edc557', '#f5f0dc'],
    labels: mode === 'gravity' ? [1, 2, 3].map(s => `${s} s: ${Math.round(stoneFallAfter(s))} m fallen`) : compact ?
      [`Both: ${t.toFixed(1)} s`, `${Math.round(p.speedMs / .44704)} mph forward`, `${p.heightM} m high`] :
      [`${t.toFixed(1)} s`, `${p.heightM} m high · ${Math.round(p.speedMs / .44704)} mph`, `Flag ${Math.round(p.flagM)} m · landing ${Math.round(r.water.distanceM)} m`],
    streams: !compact && t >= flight.seconds ? [{medium: 'water', origin: [x, .5, .65], direction: [0, -1, 0], speed: 2, length: .4}] : []};
}
export const mountProjectile = withHelicopter(mountMachine('drop-tower', (machine, d) => {
  machine.scale.setScalar(1);
  machine.position.set(-1.3, 0, .65);
  const carriage = machine.getObjectByName('carriage');
  if (carriage) carriage.position.y = (.3 + d.input.heightM * .1) + .66;
}), d => d.mode === 'wonder' ? [-1.3 + d.reading.water.distanceM * .1 * d.fraction, 2.6, -.6] : null);
export const dropPicture = (release, speed = 10, height = 30) => picture((ctx, w, h) => {
  const r = projectileBench.run({heightM: height, speedMs: speed});
  const buoy = w * .69, start = release === 'before' ? buoy - r.water.distanceM * 3 : release === 'over' ? buoy : buoy + 40;
  ctx.fillStyle = '#c6cabc'; ctx.fillRect(start - 18, 23, 36, 15); line(ctx, start - 30, 19, start + 30, 19);
  ctx.strokeStyle = '#71c9ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(start, 42); ctx.quadraticCurveTo(start + 30, 42, start + r.water.distanceM * 3, h - 24); ctx.stroke();
  dot(ctx, buoy, h - 23, 9, '#edc557');
});
export const landingPicture = (distance, flagM = distance) => picture((ctx, w, h) => {
  const x = w / 2 + Math.sign(distance - flagM) * 55;
  line(ctx, 25, 20, 25, h - 20); dot(ctx, x, h - 30, 8, '#71c9ff');
  const flagX = w / 2;
  line(ctx, flagX, h - 22, flagX, h - 65, '#edc557'); line(ctx, flagX, h - 65, flagX + 18, h - 58, '#edc557', 8);
});
