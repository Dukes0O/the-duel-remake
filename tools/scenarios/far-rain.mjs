// FAR-RAIN: the rain's arrival, seen. A memory-only browser walk for Claude's look review, and NOT a frame check
// (AGENTS.md rule 8). It drives into a world job on the Scablands (Hot Delivery), stops the car, and starts the far side's
// rain there from dry through the QA handle (window.__rain), holding the rain's own clock. Then it plays the arrival
// forward in even steps and takes a picture at each moment, from the driver's seat and from the chase camera, on High and
// on Performance: the first drop, ten seconds in, and full rain (everything settled, puddles too). It first takes the
// same four views dry, for comparison, and records the draw calls and triangles of every picture.
// The report is `far-rain.json` in the scenario's output folder. With FAR_RAIN_SHEET=1 it also makes the comparison sheet
// of the High pictures at `docs/board/looks/far-rain/round-1.jpg` (JPEG, 500 KB at most).
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {Script} from 'node:vm';
import {RAIN_LOOK} from '../../src/render/rain-look.js';

const A = RAIN_LOOK.arrival;
const SETTLED = Math.max(A.dropsFullAt, A.fallFullAt, A.greyFullAt, A.wetFullAt, A.puddlesFullAt, A.soundFullAt) + 5;
export const MOMENTS = Object.freeze([
  {name: 'first-drop', at: A.firstDropAt + .4},
  {name: 'ten-seconds', at: 10},
  {name: 'full-rain', at: SETTLED},
]);
const CAMERAS = ['hood', 'chase'], QUALITIES = ['high', 'performance'];
const SHEET_ROUND = 1;

const evaluate = (context, expression) => { new Script(expression); return context.evaluate(expression); };
const click = (context, selector) => evaluate(context, `(() => {
  const button = document.querySelector(${JSON.stringify(selector)});
  if (!button || button.hidden || button.disabled) throw Error('Missing ' + ${JSON.stringify(selector)});
  button.click(); return true;
})()`);
const pause = ms => new Promise(done => setTimeout(done, ms));

async function setQuality(context, quality) {
  await evaluate(context, `(() => { const select = document.querySelector('#graphics-quality');
    select.value = ${JSON.stringify(quality)}; select.dispatchEvent(new Event('change', {bubbles: true})); return true; })()`);
}

// Keep the car parked where it stands, then let the frames settle and the wet ground finish laying.
async function settle(context, {rain}) {
  await evaluate(context, `(() => { const s = window.__qaApp.duel.state; s.speedMph = 0; s.yawVelocity = 0; s.pushVelocity = 0;
    window.__qaApp.duel.setInput({throttle: 0, brake: 1, steer: 0}); return true; })()`);
  if (rain) await context.waitFor('(() => { const r = window.__rain.status(); return r.tiles > 0 && r.tilesReady === r.tiles; })()',
    'the wet ground laid all round', 120000);
  await pause(1500);
}

async function picture(context, name) {
  const file = await context.screenshot(name);
  const frame = await evaluate(context, `(() => { const info = window.__render.renderer.info;
    return {draws: info.render.calls, triangles: info.render.triangles, rain: window.__rain?.status() ?? null}; })()`);
  return {name, file, ...frame};
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const report = {card: 'FAR-RAIN', recipe: 'far-rain', guideOnly: true, headed: context.headed === true, moments: MOMENTS, pictures: []};
  const persist = () => writeFile(join(context.outputDir, 'far-rain.json'), JSON.stringify(report, null, 2) + '\n');
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards,far-rain&harness=far-rain');
    await context.waitFor('window.__qaApp?.duel.state.status==="menu" && !!window.__render && !!window.__rain', 'memory-only menu with the rain handle', 180000);
    await evaluate(context, `(() => {
      const a = window.__qaApp;
      if (!window.name.startsWith('__duel_qa_tab_v2:') || !Object.getOwnPropertyDescriptor(window, 'localStorage')?.value) throw Error('Memory-only fixture required');
      a.audio.setMuted(true);
      a.profile = {...a.profile, wasteland: {...a.profile.wasteland, version: 1, discoveredGate: true}}; a._saveProfile();
      return true;
    })()`);
    await setQuality(context, 'high');
    await click(context, '#wasteland-visit');
    await context.waitFor('window.__qaApp?.isYardHomeActive?.()', 'Scablands yard', 300000);
    await click(context, '[data-action="yard-cards"]');
    await context.waitFor('document.querySelector(".ember-wall")', 'Hollis note on the Story Wall', 30000);
    await click(context, '[data-ember-step="read"]');
    await context.waitFor('window.__qaApp.profile.story?.ember?.read===true', 'Hollis note read');
    await click(context, '[data-ember-step="hot-delivery"]');
    await context.waitFor('window.__qaApp?.duel.state.arena?.mode==="world-job" && window.__qaApp.duel.state.status==="racing" && window.__qaApp.visualReady', 'Hot Delivery racing', 300000);
    await context.waitFor(`(() => { let root = null; window.__render.scene.traverse(n => { if (n.name === 'The Scablands') root = n; });
      return root?.userData.assetStatus === 'ready'; })()`, 'the Scablands art', 300000);
    // Only the 3D view is in the pictures: the HUD and captions are hidden.
    await evaluate(context, `(() => { const style = document.createElement('style'); style.textContent = 'body *{visibility:hidden !important} canvas{visibility:visible !important}'; document.head.appendChild(style); return true; })()`);
    // Dry, for comparison.
    for (const quality of QUALITIES) {
      await setQuality(context, quality);
      for (const camera of CAMERAS) {
        await evaluate(context, `window.__qaApp.setCamera(${JSON.stringify(camera)})`);
        await settle(context, {rain: false});
        report.pictures.push({moment: 'dry', camera, quality, ...await picture(context, `far-rain-dry-${camera}-${quality}`)});
        await persist();
      }
    }
    // The rain, from dry, its clock held between pictures.
    await evaluate(context, `window.__rain.start('far-side')`);
    let clock = 0;
    for (const moment of MOMENTS) {
      const status = await evaluate(context, `window.__rain.advance(${moment.at - clock})`);
      clock = moment.at;
      if (!status.wanted) throw Error('The rain was refused: ' + JSON.stringify(status));
      if (moment.name === 'first-drop' && status.beads !== 1) throw Error('The first picture should show a single drop: ' + status.beads);
      for (const quality of QUALITIES) {
        await setQuality(context, quality);
        for (const camera of CAMERAS) {
          await evaluate(context, `window.__qaApp.setCamera(${JSON.stringify(camera)})`);
          await settle(context, {rain: true});
          const shot = await picture(context, `far-rain-${moment.name}-${camera}-${quality}`);
          report.pictures.push({moment: moment.name, at: moment.at, camera, quality, ...shot});
          console.log(JSON.stringify({moment: moment.name, camera, quality, draws: shot.draws, triangles: shot.triangles, beads: shot.rain?.beads}));
          await persist();
        }
      }
    }
    await evaluate(context, 'window.__rain.stop()');
    if (process.env.FAR_RAIN_SHEET === '1') report.sheet = await makeSheet(context, report.pictures.filter(row => row.quality === 'high' && row.moment !== 'dry'));
    await persist();
  } catch (error) {
    report.failure = error.message; await persist(); throw error;
  }
}

// The sheet: the six High pictures, a row per camera and a column per moment, each named, as a JPEG of 500 KB or less.
async function makeSheet(context, rows) {
  const cell = {width: 640, height: 360}, columns = MOMENTS.length, lines = CAMERAS.length;
  const ordered = CAMERAS.flatMap(camera => MOMENTS.map(moment => rows.find(row => row.camera === camera && row.moment === moment.name)));
  await evaluate(context, 'window.__sheet = {images: []}');
  for (const row of ordered) {
    if (!row) throw Error('The sheet is missing a picture.');
    const base64 = (await readFile(row.file)).toString('base64');
    await context.evaluate(`(async () => { const image = new Image(); image.src = 'data:image/png;base64,${base64}'; await image.decode(); window.__sheet.images.push(image); return true; })()`);
  }
  const names = ordered.map(row => `${row.moment}, ${row.camera === 'hood' ? 'driver’s seat' : 'chase camera'}`);
  const data = await evaluate(context, `(() => {
    const names = ${JSON.stringify(names)}, cell = ${JSON.stringify(cell)}, canvas = document.createElement('canvas');
    canvas.width = cell.width * ${columns}; canvas.height = cell.height * ${lines};
    const g = canvas.getContext('2d');
    window.__sheet.images.forEach((image, index) => {
      const x = (index % ${columns}) * cell.width, y = Math.floor(index / ${columns}) * cell.height;
      g.drawImage(image, x, y, cell.width, cell.height);
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(x, y + cell.height - 22, cell.width, 22);
      g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(names[index], x + 8, y + cell.height - 7);
    });
    for (let quality = .86; quality >= .4; quality -= .06) {
      const url = canvas.toDataURL('image/jpeg', quality);
      if (url.length * .75 <= 480000) return url;
    }
    return canvas.toDataURL('image/jpeg', .4);
  })()`);
  const buffer = Buffer.from(data.split(',')[1], 'base64');
  if (buffer.length > 500 * 1024) throw Error('The sheet is over 500 KB: ' + buffer.length);
  const folder = new URL('../../docs/board/looks/far-rain/', import.meta.url);
  await mkdir(folder, {recursive: true});
  const target = new URL(`round-${SHEET_ROUND}.jpg`, folder);
  await writeFile(target, buffer);
  return {file: `docs/board/looks/far-rain/round-${SHEET_ROUND}.jpg`, bytes: buffer.length};
}
