// SCABLANDS-LAND: memory-only Performance pictures for Claude's hill-country review.
// The report records the draw calls and triangles at every view. This is not a frame check.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {LAND} from '../../src/world/scablands-names.js';
import {HILLS} from '../../src/world/scablands-height.js';
import {SCARPS} from '../../src/world/scablands-scarps.js';
import {ROAD_NET} from '../../src/world/scablands-road.js';

const offset = (p, x, z) => ({x: p.x + x, z: p.z + z});
const hill = kind => HILLS.find(item => item.kind === kind);

export function views() {
  const breaks = hill('breaks'), mesa = hill('mesa'), ridge = hill('ridge-top');
  const lookout = hill('lookout'), dune = hill('dune');
  const burn = ROAD_NET.road('burn-road').points.reduce((best, point) =>
    Math.hypot(point.x - breaks.x, point.z - breaks.z) < Math.hypot(best.x - breaks.x, best.z - breaks.z) ? point : best);
  const angle = mesa.rampAngle + Math.PI;
  const side = distance => offset(mesa, Math.cos(angle) * distance, Math.sin(angle) * distance);
  const {a, b} = SCARPS[0].stretches[0];
  const length = Math.hypot(b.x - a.x, b.z - a.z), foot = {x: (a.x + b.x) / 2, z: (a.z + b.z) / 2};
  const bankA = LAND.at('river-3'), bankB = LAND.at('river-4');
  const bankLength = Math.hypot(bankB.x - bankA.x, bankB.z - bankA.z);
  const bed = {x: (bankA.x + bankB.x) / 2, z: (bankA.z + bankB.z) / 2};
  return [
    {name: 'breaks-from-burn-road', from: burn, to: breaks},
    {name: 'mesa-foot', from: side(mesa.radius + mesa.face + 60), to: mesa},
    {name: 'mesa-top', from: mesa, to: side(mesa.radius + 120)},
    {name: 'ridge-way-up', from: offset(ridge, 0, -ridge.radius - 80), to: ridge},
    {name: 'lookout-to-yard', from: lookout, to: LAND.yard},
    {name: 'ships-dunes', from: offset(dune, 0, -dune.radius - 50), to: dune},
    {name: 'scarp-face', from: offset(foot, 60 * (b.z - a.z) / length, -60 * (b.x - a.x) / length), to: foot},
    {name: 'river-bank', from: bed, to: offset(bed, -(bankB.z - bankA.z) / bankLength * 100, (bankB.x - bankA.x) / bankLength * 100)},
  ];
}

const click = (context, selector) => context.evaluate(`(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click();
})()`);
const pause = ms => new Promise(done => setTimeout(done, ms));

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'SCABLANDS-LAND', recipe: 'scablands-hills', quality: 'performance', guideOnly: true, views: []};
  const persist = () => writeFile(join(context.outputDir, 'scablands-hills.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,scablands-realism&harness=scablands-hills');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render', 'memory-only menu', 90000);
    await context.evaluate(`(() => {
      const a = window.__qaApp, select = document.querySelector('#graphics-quality');
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      select.value = 'performance'; select.dispatchEvent(new Event('change', {bubbles: true}));
      a.audio.setMuted(true); a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
    })()`);
    await click(context, '#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 90000);
    await click(context, '[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Hollis note', 30000);
    if (!await context.evaluate('window.__qaApp.profile.story?.ember?.read===true')) await click(context, '[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
    await click(context, '[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Hot Delivery racing', 120000);
    await context.waitFor(`(() => { let root = null; window.__render.scene.traverse(n => { if (n.name === 'The Scablands') root = n; }); return root?.userData.assetStatus === 'ready'; })()`, 'Scablands art', 120000);
    await context.evaluate(`(() => { const style = document.createElement('style'); style.id = 'hills-picture-style'; style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important} canvas.world-hud-minimap,.world-hud-minimap canvas{visibility:hidden !important}'; document.head.appendChild(style); })()`);
    const capture = async name => {
      await pause(2600);
      const picture = await context.screenshot('scablands-hills-' + name);
      const counts = await context.evaluate(`(() => { const info = window.__render.renderer.info.render; return {draws: info.calls, triangles: info.triangles}; })()`);
      report.views.push({name, picture, ...counts});
      console.log(JSON.stringify(report.views.at(-1)));
    };
    for (const view of views()) {
      await context.evaluate(`(() => {
        const a = window.__qaApp, d = a.duel, s = d.state, from = ${JSON.stringify(view.from)}, to = ${JSON.stringify(view.to)};
        const pose = d.course.nearest(from.x, from.z), wrap = v => Math.atan2(Math.sin(v), Math.cos(v));
        s.s = s.prevS = pose.s; s.lateral = s.prevLateral = pose.lateral; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
        s.headingError = wrap(Math.atan2(to.x - from.x, to.z - from.z) - d.course.at(pose.s).heading);
        s.arena.worldJob.job.stepState.ember = 100; a.inspectionCamera = null;
      })()`);
      await context.evaluate('window.__qaApp.advance(1.5)');
      await capture(view.name);
    }
    await context.evaluate(`(() => { document.querySelector('#hills-picture-style').remove(); document.querySelectorAll('body > details').forEach(panel => { panel.style.display = 'none'; }); document.dispatchEvent(new KeyboardEvent('keydown', {code: 'KeyM', bubbles: true, cancelable: true})); })()`);
    await context.waitFor('document.querySelector(".world-hud-map") && !document.querySelector(".world-hud-map").hidden', 'large map', 30000);
    await capture('large-map');
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}
