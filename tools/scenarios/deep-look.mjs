// The Deep, look test pictures and frame times (card D0 DEEP-LOOK).
//
//   node tools/browser-harness.mjs scenario deep-look
//
// Private port, no saves. Opens tools/deep-look.html (it builds its own scene
// and touches no game state) and, on High quality:
//   * photographs the six fixed views at 1280x720;
//   * joins them into one sheet (look-sheet.jpg, 1280 wide);
//   * measures delivered frame times on High and Performance for every view.
// Everything lands in the harness's .evidence folder; the sheet that is kept
// in Git is copied by hand to docs/board/looks/the-deep/.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const page = quality => `/tools/deep-look.html?quality=${quality}&still=1&clean=1&manual=1`;
const FRAMES = 300;

async function open(context, quality, scale = 1) {
  await context.command('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: scale, mobile: false });
  await context.navigate(page(quality));
  await context.waitFor('!!window.__deepLook && window.__deepLook.ready === true', `The Deep look test page (${quality})`, 90_000);
}

// Joined in the page so no image library is needed.
async function pageSheet(spec) {
  const load = url => new Promise((done, fail) => { const img = new Image(); img.onload = () => done(img); img.onerror = () => fail(Error('view image failed')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = spec.W; canvas.height = spec.H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#05090b'; ctx.fillRect(0, 0, spec.W, spec.H);
  for (let i = 0; i < spec.cells.length; i++) {
    const cell = spec.cells[i], col = i % spec.cols, row = Math.floor(i / spec.cols);
    const x = spec.gap + col * (spec.cw + spec.gap), y = spec.gap + row * (spec.ch + spec.gap);
    ctx.drawImage(await load(cell.url), x, y, spec.cw, spec.ch);
    ctx.fillStyle = 'rgba(4,10,13,0.72)'; ctx.fillRect(x, y + spec.ch - 28, spec.cw, 28);
    ctx.font = 'bold 14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#e8c36a'; ctx.fillText(cell.number, x + 9, y + spec.ch - 9);
    ctx.font = '14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#e6eef0'; ctx.fillText(cell.label, x + 30, y + spec.ch - 9);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9db6bb'; ctx.fillText(cell.right, x + spec.cw - 9, y + spec.ch - 9); ctx.textAlign = 'left';
  }
  return canvas.toDataURL('image/jpeg', spec.quality);
}

export async function run(context) {
  const result = { views: [], frameTimes: { high: [], performance: [] }, info: {} };
  // ---- pictures, High quality ----
  await open(context, 'high');
  result.info.high = await context.evaluate('window.__deepLook.info()');
  const names = await context.evaluate('window.__deepLook.views');
  // First frame: every shader is compiled here, once.
  result.info.firstFrameMs = Math.round(await context.evaluate('(()=>{const t=performance.now();window.__deepLook.showView(1,{frames:1});return performance.now()-t})()'));
  const cells = [];
  for (let index = 1; index <= names.length; index++) {
    const before = context.issues.length;
    const depth = await context.evaluate(`(()=>{const L=window.__deepLook;L.showView(${index},{frames:8});return window.__deepLook.debug.camera.position.y})()`);
    const shot = await context.command('Page.captureScreenshot', { format: 'jpeg', quality: 93, clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 } });
    writeFileSync(join(context.outputDir, `view-${index}.jpg`), Buffer.from(shot.data, 'base64'));
    cells.push({ url: 'data:image/jpeg;base64,' + shot.data, number: String(index), label: names[index - 1], right: `camera ${Math.max(0, -depth).toFixed(0)} m deep` });
    result.views.push({ index, name: names[index - 1], cameraDepthM: Math.max(0, -depth), browserErrors: context.issues.length - before });
    console.log(`View ${index}/${names.length}: ${names[index - 1]}`);
  }
  const spec = { W: 1600, H: 4 + 3 * (448 + 4), cw: 796, ch: 448, cols: 2, gap: 4, cells, quality: 0.92 };
  const sheet = await context.evaluate(`(${pageSheet.toString()})(${JSON.stringify(spec)})`);
  const sheetPath = join(context.outputDir, 'look-sheet.jpg');
  writeFileSync(sheetPath, Buffer.from(sheet.slice(sheet.indexOf(',') + 1), 'base64'));
  context.screenshots.push(sheetPath);

  // ---- frame times: every view, High then Performance, at 1.0 and at the game's 1.6 pixel ratio ----
  for (const [quality, scale] of [['high', 1], ['performance', 1], ['high', 1.6], ['performance', 1.6]]) {
    await open(context, quality, scale);
    const rows = [];
    for (let index = 1; index <= names.length; index++) {
      const row = await context.evaluate(`window.__deepLook.measure(${index}, ${FRAMES})`);
      rows.push({ ...row, pixelRatio: scale });
    }
    result.frameTimes[quality].push(...rows);
    console.log(`${quality} x${scale}: delivered p95 ${rows.map(r => r.frameMsP95.toFixed(1)).join(', ')} ms; GPU p95 ${rows.map(r => r.gpuMsP95 === null ? 'n/a' : r.gpuMsP95.toFixed(1)).join(', ')} ms`);
  }
  result.info.gpu = result.info.high.gpu;
  writeFileSync(join(context.outputDir, 'look-result.json'), JSON.stringify(result, null, 2));
}
