import {rangeOf, launchBench, TARGET, bestAngle, launchDragAcceleration} from '../benches/launch.js';
import {box, camera, pictureBase, pictureArrow} from './workshop-display.js';
import {mountSnow} from './snow-display.js';

export const MPH = 2.2369362920544;
const SCALE = .072, ORIGIN = [-1.7, 1.12, 0];
export const launchSamples = {
  short: {angleDeg: 75}, flag: {angleDeg: 45, speedMs: 17}, past: {angleDeg: 45},
  angle15: {angleDeg: 15, flagM: rangeOf(45, 20).rangeM},
  angle45: {angleDeg: 45, flagM: rangeOf(45, 20).rangeM}, angle75: {angleDeg: 75, flagM: rangeOf(45, 20).rangeM},
  'lower-best': {angleDeg: bestAngle(20, {air: true, lower: true}), air: 'air', landing: '10 m lower'},
  'lower-steep': {angleDeg: 75, air: 'air', landing: '10 m lower'},
};
const lowerFlag = launchBench.run(launchSamples['lower-best']).rangeM;
for (const id of ['lower-best', 'lower-steep']) launchSamples[id].flagM = lowerFlag;
export function launchTrace(input) {
  const settings = launchBench.run(input).settings, points = [];
  const result = rangeOf(settings.angleDeg, settings.speedMs, {air: settings.air === 'air', lower: settings.landing === '10 m lower', points});
  return {...result, settings, points};
}
const at = p => [ORIGIN[0] + p[0] * SCALE, ORIGIN[1] + p[1] * SCALE, 0];
const colours = ['#e3aa66', '#70bfd2', '#f3d651', '#b8a1e3', '#eb927e'];
export function launcherPose(angleDeg) {
  const angle = angleDeg * Math.PI / 180, scale = .35;
  return [ORIGIN[0] + 1.5 * scale - 2.48 * scale * Math.cos(angle), ORIGIN[1] - 1.3 * scale - 2.48 * scale * Math.sin(angle), 0];
}
export function launchDrawing(input, time, mode = 'single') {
  const result = launchTrace(input), load = result.settings, flag = input.flagM ?? TARGET.rangeM;
  const angles = mode === 'compare' ? [15, 30, 45, 60, 75] : [load.angleDeg];
  const traces = angles.map(angleDeg => launchTrace({...load, angleDeg}));
  const trails = traces.map((r, i) => ({id: `arc-${i}`, colour: colours[i], points: r.points.filter(p => p[2] <= Math.max(0, time - i * .65) * 2).map(at)}));
  const active = mode === 'compare' ? Math.min(4, Math.floor(time / .65)) : 0;
  const trace = traces[active], progress = Math.max(0, time - active * .65) * 2;
  const p = trace.points.filter(p => p[2] <= progress).at(-1) ?? trace.points[0], position = at(p);
  const before = trace.points[Math.max(0, trace.points.indexOf(p) - 1)], dx = p[0] - before[0], dy = p[1] - before[1];
  const angle = progress === 0 ? load.angleDeg * Math.PI / 180 : Math.atan2(dy, dx);
  const speed = p[2] > before[2] ? Math.hypot(dx, dy) / (p[2] - before[2]) : load.speedMs;
  const direction = [Math.cos(angle), Math.sin(angle), 0], forces = [];
  if (progress < trace.seconds) {
    forces.push({kind: 'push', newtons: speed, origin: position, direction, headLength: .3, headWidth: .3, inFront: true});
    // Speed and drag have different units: normalize drag to a readable .7 m
    // arrow at 20 m/s, preserving the real rule's speed-squared changes.
    if (load.air === 'air') forces.push({kind: 'drag', newtons: launchDragAcceleration(speed) / launchDragAcceleration(20) * 20, origin: position, direction: direction.map(v => -v), headLength: .28, headWidth: .28, inFront: true});
  }
  const pose = launcherPose(angles[active]);
  const objects = [box('angle-dial', [pose[0] - .315, pose[1] + .665, .119], [.5, .5, .3], '#edc557', 'angleDeg'),
    box('speed-dial', [pose[0] - .441, pose[1] + .35, -.385], [.25, .25, .2], '#edc557', 'speedMs'),
    box('flag-target', [ORIGIN[0] + flag * SCALE, (load.landing === 'level' ? 1.12 : .4) + .6, .35], [.35, .8, .4], '#edc557', 'flagM')];
  objects.forEach(o => { o.opacity = 0; });
  for (const [i, f] of forces.entries()) {
    const length = f.newtons * .035;
    objects.push({...box(`arrow-${i}`, position.map((v, j) => v + f.direction[j] * length / 2), [length * .8, .09, .09], f.kind === 'drag' ? '#f0a148' : '#56d683', null, [0, 0, angle + (f.kind === 'drag' ? Math.PI : 0)]), inFront: true});
  }
  return {input: {...load, angleDeg: angles[active], flagM: flag}, actual: result.rangeM, reading: result.rangeM, mode, position, angle,
    objects, forces, trails, hideLabels: true, metresPerNewton: .035,
    camera: camera([2.3, 2.4, -5.4], [.3, 1.35, 0]),
    captions: [`Launcher · ${mode === 'compare' ? angles[active] : load.angleDeg}°\n${Math.round(load.speedMs * MPH)} mph`,
      `${mode === 'compare' ? angles[active] : load.angleDeg}° landing\n${trace.rangeM.toFixed(1)} m`, `Flag · ${flag.toFixed(1)} m`],
    captionAnchors: [[-1.7, 1.1, .3], at(trace.points.at(-1)), [ORIGIN[0] + flag * SCALE, load.landing === 'level' ? 1.75 : 1.03, .35]],
    captionOffsets: [[-180, 15], [10, -65], [-60, 8]],
  };
}
export function mountLaunch(options) {
  return mountSnow(options, 'launcher-ramp', (machine, d, clock, prop) => {
    machine.rotation.y = Math.PI / 2; machine.scale.setScalar(.35);
    machine.position.set(...launcherPose(d.input.angleDeg));
    const arm = machine.getObjectByName('ramp-arm'); if (arm) arm.rotation.x = (45 - d.input.angleDeg) * Math.PI / 180;
    prop({id: 'skier', model: 'skier', position: d.position, rotation: [0, 0, d.angle], scale: .27});
    const floor = d.input.landing === 'level' ? ORIGIN[1] : ORIGIN[1] - .72;
    prop({id: 'platform', model: 'landing-platform', position: [-1.7, floor - .04, 0]});
    prop({id: 'tape', model: 'landing-tape', position: [-1.7, floor, .1], scale: 1});
    prop({id: 'flag', model: 'landing-flag', position: [-1.7 + d.input.flagM * SCALE, floor, .35], scale: .7});
    if (clock.previous) {
      const old = launchTrace(clock.previous.input);
      const points = old.points.filter(p => p[2] <= clock.previous.time * 2).map(p => { const a = at(p); a[2] = -.13; return a; });
      d.trails.push({id: 'previous', colour: '#b4cfda', opacity: .35, points});
    }
  });
}
export function launchPicture(input) {
  const trace = launchTrace(input), flag = input.flagM ?? TARGET.rangeM;
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    const sx = x => 20 + x / 65 * (w - 40), sy = y => 102 - y * 2;
    ctx.strokeStyle = '#d5cfb7'; ctx.beginPath(); ctx.moveTo(12, 105); ctx.lineTo(w - 10, 105); ctx.stroke();
    ctx.strokeStyle = '#edc557'; ctx.lineWidth = 5; ctx.beginPath();
    trace.points.forEach((p, i) => { if (i) ctx.lineTo(sx(p[0]), sy(p[1])); else ctx.moveTo(sx(p[0]), sy(p[1])); }); ctx.stroke();
    ctx.strokeStyle = '#ef7a59'; ctx.beginPath(); ctx.moveTo(sx(flag), 105); ctx.lineTo(sx(flag), 57); ctx.lineTo(sx(flag) + 18, 65); ctx.stroke();
    pictureArrow(ctx, 20, 100, Math.cos(trace.settings.angleDeg * Math.PI / 180) * 32, -Math.sin(trace.settings.angleDeg * Math.PI / 180) * 32);
    ctx.fillStyle = '#f5f0dc'; ctx.fillText(`${trace.settings.angleDeg.toFixed(0)}° · ${trace.rangeM.toFixed(1)} m`, w / 2, 23);
  };
}
