import {SNOWS, waxBench, GLIDE} from '../benches/wax.js';
import {box, camera, pictureBase} from './workshop-display.js';
import {mountSnow} from './snow-display.js';

export const waxSamples = {
  fast: {snow: 'powder', wax: 'hard'}, slow: {snow: 'powder', wax: 'soft'},
  'hard-cold': {snow: 'powder', wax: 'hard'}, 'soft-cold': {snow: 'powder', wax: 'soft'},
  'hard-wet': {snow: 'wet', wax: 'hard'}, 'soft-wet': {snow: 'wet', wax: 'soft'},
};
export function waxDrawing(input, time, mode = 'single') {
  if (mode === 'cold' && time >= 2) input = {...input, wax: 'hard'};
  if (mode === 'wet' && time >= 2) input = {...input, wax: 'soft'};
  const result = waxBench.run(input), load = result.settings, keys = Object.keys(SNOWS);
  const rows = keys.map((snow, i) => {
    const wax = mode === 'compare' ? SNOWS[snow].wax : load.wax;
    const r = waxBench.run({snow, wax});
    // All tray movement shows the same 100 m timed glide, compressed to fit.
    const progress = Math.min(1, (time * 4 / r.glideS) ** 2);
    return {snow, wax, x: i - 1, z: -.2 + progress * .35, ...r};
  });
  const selected = keys.indexOf(load.snow);
  const objects = [{...box('wax-selector', [0, .9, -.8], [.65, .4, .45], '#edc557', 'waxDial'), opacity: 0}];
  return {input: load, actual: result.right ? 'fast' : 'slow', reading: result.glideS, rows, selected, mode, objects, hideLabels: true,
    camera: camera([-2.3, 1.85, -3.6], [0, .95, 0]),
    captions: rows.map(r => `${SNOWS[r.snow].name} · ${SNOWS[r.snow].celsius} °C\n${r.wax} wax · ${r.glideS.toFixed(2)} s`),
    captionAnchors: rows.map(r => [r.x, .88, .08]), captionOffsets: [[20, -5], [-105, -135], [-255, -35]],
  };
}
export function mountWax(options) {
  return mountSnow(options, 'snow-trays', (machine, d, clock, prop) => {
    const skis = machine.getObjectByName('skis'); if (skis) skis.visible = false;
    for (const [i, wax] of ['hard', 'medium', 'soft'].entries()) prop({id: `block-${wax}`, model: `wax-${wax}`, position: [-1.05 + i * 1.05, .91 + (wax === d.input.wax ? .07 : 0), -.34], scale: .8});
    prop({id: 'selector', model: 'wax-selector', position: [0, .75, -.8], scale: .8});
    prop({id: 'selector-hand', model: 'selector-hand', position: [0, .94, -.8], rotation: [0, ['hard', 'medium', 'soft'].indexOf(d.input.wax) * Math.PI * .6 - .6, 0], scale: .8});
    for (const [i, r] of d.rows.entries()) {
      prop({id: `ski-${i}`, model: 'test-skis', position: [r.x, .94, r.z], scale: .34, rotation: [0, Math.PI / 2, 0]});
      if (clock.previous && i === d.selected) {
        const old = waxBench.run({snow: r.snow, wax: ['hard', 'medium', 'soft'][Math.round(clock.previous.input.waxDial ?? 0)]});
        prop({id: 'last-ski', model: 'test-skis', ghost: true, position: [r.x + .18, .95, -.2 + Math.min(1, (clock.time * 4 / old.glideS) ** 2) * .35], scale: .22, rotation: [0, Math.PI / 2, 0]});
      }
    }
    if (['cold', 'wet', 'wax'].includes(d.mode)) {
      prop({id: 'cutaway', model: d.mode === 'wet' ? 'wet-cutaway' : 'cold-cutaway', position: [-.25, 1.35, .1], scale: .85});
      const model = d.mode === 'wet' ? clock.time < 2 ? 'hard-base' : 'grooved-base' : clock.time < 2 ? 'scratched-base' : 'hard-base';
      prop({id: 'base', model, position: [-.25 + Math.min(.3, clock.time * .1), 1.6, .1], rotation: [.7, 0, 0], scale: .85});
    }
    if (d.mode === 'wonder') {
      for (const [i, wax] of ['hard', 'soft'].entries()) {
        const r = waxBench.run({snow: 'powder', wax});
        prop({id: `racer-${i}`, model: 'skier', position: [-.6 + Math.min(1, (clock.time * 4 / r.glideS) ** 2) * 1.2, 1.05, -.15 + i * .35], scale: .38});
      }
    }
  });
}
export function waxPicture(input) {
  const r = waxBench.run(input);
  return (ctx, w, h) => {
    pictureBase(ctx, w, h);
    ctx.fillStyle = '#dce8ed'; ctx.beginPath(); ctx.moveTo(12, 45); ctx.lineTo(w - 10, 90); ctx.lineTo(w - 10, 110); ctx.lineTo(12, 65); ctx.fill();
    const x = r.right ? 170 : 65;
    ctx.strokeStyle = '#edc557'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(x - 24, 45 + x * .18); ctx.lineTo(x + 24, 45 + x * .18 + 8); ctx.lineTo(x + 31, 45 + x * .18 + 4); ctx.stroke();
    ctx.fillStyle = '#f5f0dc'; ctx.fillText(`${input.wax} · ${SNOWS[input.snow].celsius} °C`, w / 2, 21);
    ctx.fillStyle = '#263330'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(`${GLIDE.distanceM} m · ${r.glideS.toFixed(2)} s`, w / 2, 101);
  };
}
