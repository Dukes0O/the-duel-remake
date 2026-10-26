import {fireBench, TAKES_AWAY, practiceFire} from '../benches/fire.js';
import {object, ball, target, mountMachine, picture, line, caption} from './flying-display.js';

export const fireInput = input => ({putOut: 'nothing', spray: 0, ...input});
const toolReadings = new Map(['nothing', 'water', 'sand', 'cleared strip'].map(putOut => [putOut, fireBench.run({putOut})]));
export const fireReading = input => toolReadings.get(fireInput(input).putOut);
// All spread poses are snapshots of the game's seeded fire, never a painted
// claim that a strip works. There is no per-frame spread simulation.
export const fireRuns = Object.fromEntries(['open', 'cleared', 'treated'].map(mode => [mode, Array.from({length: 15}, (_, steps) => practiceFire({steps, details: true, cleared: mode === 'cleared', treated: mode === 'treated'}))]));
export function fireDrawing(input, time, mode = 'try') {
  const p = fireInput(input), r = fireReading(p), used = time >= 1.2;
  const removed = (mode === 'lid' || mode === 'wonder') && used ? 'air' : mode === 'gas' && used ? 'heat' : mode === 'wood' && used ? 'fuel' : used ? TAKES_AWAY[p.putOut] : null;
  const burning = mode === 'triangle' || mode === 'heat' || mode === 'fuel' || mode === 'oxygen' || !removed;
  const objects = [target('water-bucket', [-1.04, .23, -.4875], [.32, .46, .32], 'water'), target('sand-bucket', [-.715, .23, -.65], [.32, .46, .32], 'sand'),
    target('rake', [-1.24, .5, -.78], [.25, 1, .3], 'rake'), target('spray-handle', [.94, .5, .13], [.4, .8, .4], 'spray')];
  const sides = [
    ['heat', [0, 2, .1], [1.3, .09, .09], 0, '#f06464'],
    ['fuel', [-.32, 2.55, .1], [.09, 1.3, .09], -.52, '#edc557'],
    ['air', [.32, 2.55, .1], [.09, 1.3, .09], .52, '#71c9ff'],
  ];
  for (const [name, pos, size, angle, colour] of sides) {
    if (name !== removed) objects.push({...object(`triangle-${name}`, pos, size, colour), rotation: [0, 0, angle], inFront: true});
  }
  if (burning) for (let i = 0; i < 18; i++) {
    const phase = (time * .8 + i * .137) % 1;
    objects.push(ball(`flame-${i}`, [Math.sin(i * 7) * .4 * (1 - phase), .35 + phase * 1.3, Math.cos(i * 13) * .35], .24 * (1 - phase) + .05, i % 2 ? '#ef762a' : '#f4c24b'));
  }
  if (used && p.putOut === 'sand') {
    objects.push({...ball('sand-cover', [0, .34, 0], 1, '#c9ae79'), size: [1, .07, 1]});
    for (let i = 0; i < 18; i++) {
      const fall = (time * 1.4 + i * .173) % 1;
      objects.push(ball(`sand-grain-${i}`, [-.35 * (1 - fall) + Math.sin(i * 7) * .08, 1.3 - fall, Math.cos(i * 11) * .1], .035, '#d8bf8c'));
    }
  }
  const spread = mode === 'retardant' || p.putOut === 'cleared strip' && used;
  const run = fireRuns[mode === 'retardant' || p.spray ? 'treated' : spread ? 'cleared' : 'open'][Math.min(14, Math.floor(time * 2))];
  if (spread) for (const c of run.cells) {
    const id = (c.i + 512) * 1024 + c.j + 512;
    const lit = run.burning.some(([cell]) => cell === id), treated = (mode === 'retardant' || p.spray) && c.i === 4;
    objects.push(object(`forest-${id}`, [-2 + c.i * .45, .18, 1.5 + c.j * .28], [.38, lit ? .5 : .12, .22], lit ? '#ef762a' : treated ? '#dc7277' : '#608355'));
  }
  return {input: p, reading: r, removed, mode, used, burning, time, objects,
    camera: {position: [-2.2, 3.2, 5], target: [0, .8, 0]}, hideLabels: true,
    labelColours: mode === 'fuel' ? ['#edc557'] : mode === 'oxygen' ? ['#71c9ff'] : ['#f06464', '#edc557', '#71c9ff'],
    labels: mode === 'retardant' ? ['Retardant coats plants ahead', 'The creeping flame stops at the pink strip'] : mode === 'heat' ? ['Heat · enough to start burning'] : mode === 'fuel' ? ['Fuel · wood can burn'] : mode === 'oxygen' ? ['Oxygen · air reaches the fire'] : ['Heat · red', 'Fuel · yellow', 'Oxygen in air · blue'],
    streams: used && p.putOut === 'water' ? [{medium: 'water', origin: [-.8, 1.6, 0], direction: [.5, -1, 0], speed: 3, length: 1.4}] :
      mode === 'retardant' ? [{medium: 'water', origin: [0, 1.3, 2], direction: [0, -1, 0], speed: 2, length: 1}] : mode === 'oxygen' ? [{medium: 'air', origin: [-1.3, .7, 0], direction: [1, 0, 0], speed: 1.2, length: 1.3}] : []};
}
export const mountFire = mountMachine('fire-pit', (machine, d) => {
  const lid = machine.getObjectByName('lid');
  if (lid) { lid.visible = d.removed === 'air' && d.input.putOut !== 'sand'; lid.position.set(.85, .62, 0); }
  const logs = machine.getObjectByName('logs'); if (logs) logs.visible = d.removed !== 'fuel';
});
export const trianglePicture = side => picture((ctx, w, h) => {
  const points = [[w * .5, 16], [w * .23, h - 30], [w * .77, h - 30]];
  const names = ['fuel', 'heat', 'air'], colours = ['#edc557', '#f06464', '#71c9ff'];
  points.forEach((p, i) => { const b = points[(i + 1) % 3]; line(ctx, ...p, ...b, names[i] === side ? '#64736a' : colours[i], 7); if (names[i] === side) { const x = (p[0] + b[0]) / 2, y = (p[1] + b[1]) / 2; line(ctx, x - 10, y - 10, x + 10, y + 10, '#f5f0dc'); line(ctx, x - 10, y + 10, x + 10, y - 10, '#f5f0dc'); } });
  caption(ctx, side === 'air' ? 'Oxygen' : side[0].toUpperCase() + side.slice(1), w / 2, h - 4);
});
