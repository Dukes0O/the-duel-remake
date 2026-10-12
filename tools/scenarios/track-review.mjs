// TRACK REVIEW pictures (private port, memory-only saves). Started by
// tools/track-review.mjs, which writes the lap numbers to the file named in
// DUEL_TRACK_REVIEW_INPUT. This scenario then:
//   * draws map.png and speed.png on a canvas from those numbers;
//   * puts the real car at each named point (a short run-up with the test
//     driver so speed, lean and any lift-off are genuine) and photographs the
//     ordinary chase camera, then joins 16 frames into frames.jpg;
//   * restarts the race and photographs the field near the first corner.
// The renderer never changes race state; only this scenario moves the car, and
// only inside its own private browser tab.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawMap, drawSpeed, INPUT_ENV } from '../track-review.mjs';

const entry = '/tools/menu-check.html';

// Page-side canvas helpers, sent as source text so they run inside the browser.
async function pageSheet(spec) {
  const load = url => new Promise((done, fail) => { const img = new Image(); img.onload = () => done(img); img.onerror = () => fail(Error('frame image failed')); img.src = url; });
  const canvas = document.createElement('canvas');
  canvas.width = spec.W; canvas.height = spec.H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0b1114'; ctx.fillRect(0, 0, spec.W, spec.H);
  const top = spec.title ? 46 : 0;
  if (spec.title) {
    ctx.font = 'bold 24px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3'; ctx.fillText(spec.title, 16, 31);
    ctx.font = '14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#9fb3ba'; ctx.textAlign = 'right'; ctx.fillText(spec.note || '', spec.W - 16, 30); ctx.textAlign = 'left';
  }
  const cw = (spec.W - spec.gap * (spec.cols + 1)) / spec.cols, ch = spec.cellH;
  for (let i = 0; i < spec.cells.length; i++) {
    const cell = spec.cells[i], col = i % spec.cols, row = Math.floor(i / spec.cols);
    const x = spec.gap + col * (cw + spec.gap), y = top + spec.gap + row * (ch + spec.gap);
    const img = await load(cell.url);
    ctx.drawImage(img, x, y, cw, ch);
    ctx.fillStyle = 'rgba(8,12,15,0.78)'; ctx.fillRect(x, y + ch - 30, cw, 30);
    ctx.font = 'bold 14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#ffd23f'; ctx.fillText(cell.number, x + 8, y + ch - 10);
    ctx.font = '14px system-ui, Segoe UI, sans-serif'; ctx.fillStyle = '#f2ead3'; ctx.fillText(cell.label, x + 36, y + ch - 10);
    if (cell.right) { ctx.textAlign = 'right'; ctx.fillStyle = '#9fb3ba'; ctx.fillText(cell.right, x + cw - 8, y + ch - 10); ctx.textAlign = 'left'; }
  }
  return canvas.toDataURL(spec.type, spec.quality);
}

function pageDraw(drawSource, W, H, data) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const draw = new Function('return ' + drawSource)();
  draw(canvas.getContext('2d'), W, H, data);
  return canvas.toDataURL('image/png');
}

const writeDataUrl = (path, url) => writeFileSync(path, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
const jpegUrl = base64 => 'data:image/jpeg;base64,' + base64;

async function shot(context, quality = 86) {
  const result = await context.command('Page.captureScreenshot', { format: 'jpeg', quality, captureBeyondViewport: false });
  return result.data;
}

// Browser errors raised since `before` belong to the frame just taken. They are
// moved out of the harness list into review.json so the pictures still arrive.
function takeIssues(context, before) {
  return context.issues.splice(before).map(issue => `${issue.kind}: ${issue.text}`);
}

export async function run(context) {
  const data = JSON.parse(readFileSync(process.env[INPUT_ENV], 'utf8'));
  const dir = data.outputDir;
  const result = { pack: null, frameErrors: {}, browserErrors: [], warnings: [] };
  const flags = data.options.flags.length ? `flags=${data.options.flags.join(',')}&` : '';

  // --- map and speed trace (canvas only) ---
  const mapData = { title: data.title, subtitle: data.subtitle, points: data.points, start: data.mapStart, corners: data.corners,
    crests: data.crests, topMph: data.topMph, minMph: data.minMph };
  const speedData = { title: data.title + ': test-driver lap', subtitle: data.subtitle, lapNote: data.lapNote, lapTime: data.lapTime, length: data.length,
    samples: data.samples, corners: data.corners, crests: data.crests, topMph: data.topMph, topAtS: data.topAtS, heights: data.heights, gradeText: data.gradeText };
  await context.navigate(`${entry}?${flags}harness=track-review`);
  await context.waitFor('!!window.__qaApp', 'review menu page', 60_000);
  writeDataUrl(join(dir, data.files.map), await context.evaluate(`(${pageDraw.toString()})(${JSON.stringify(drawMap.toString())},1700,1000,${JSON.stringify(mapData)})`));
  writeDataUrl(join(dir, data.files.speed), await context.evaluate(`(${pageDraw.toString()})(${JSON.stringify(drawSpeed.toString())},1700,900,${JSON.stringify(speedData)})`));
  context.screenshots.push(join(dir, data.files.map), join(dir, data.files.speed));

  // --- the real race ---
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio?.setMuted?.(true);a.setGraphicsQuality(${JSON.stringify(data.options.quality)});
    if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage missing');
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    a.profile={...a.profile,courses:{version:1,unlocked:[...new Set([...(a.profile.courses?.unlocked||[]),${JSON.stringify(data.courseId)}])]}};
    if(!a._saveProfile())throw Error('Review fixture could not be saved in temporary storage');})()`);
  // Helpers that live in the page. Targets sit on the second lap so a run-up
  // across the start line never finishes the race.
  await context.evaluate(`(()=>{
    const a=window.__qaApp,L=${data.length},M2W=${data.mphToWorld};
    const R=window.__review={};
    R.begin=()=>{
      // The browser may order courses differently from the headless run (a circuit behind a switch is placed by its stage
      // number), so the index from the headless run is only the first guess; the course is found by its id.
      const begin=i=>a.startCampaign({startStage:i,seed:${data.options.seed},mode:'duel',car:${JSON.stringify(data.options.car)},difficulty:'casual',cpuDifficulty:'medium'${data.winterTyre?",tyre:'winter'":''}})&&a.duel.course?.def?.id===${JSON.stringify(data.courseId)};
      if(!begin(${data.courseIndex})&&!Array.from({length:32},(_,i)=>i).some(begin))
        throw Error('The course would not start in the browser (is its switch off? pass --flags).');
      a.autopilot=false;a._scriptedCrashDone=true;a.setCamera('chase');a.stop();
      const hud=document.querySelector('#race-hud');if(hud)hud.style.visibility='hidden';
    };
    R.ready=()=>{a.onFrame?.(a.duel.state,0);window.__render?.renderFrame();return a.visualReady&&document.querySelector('#renderer-loading')?.hidden;};
    R.render=n=>{const s=a.duel.state;for(let i=0;i<n;i++){a.onFrame?.(s,1/60);window.__render.renderFrame();}};
    R.go=()=>{const s=a.duel.state;for(let i=0;i<900&&s.status!=='racing';i++)a.advance(1/60,1/60);if(s.status!=='racing')throw Error('The race did not leave the countdown ('+s.status+')');};
    R.clearField=s0=>{const s=a.duel.state;for(const t of s.traffic||[]){t.s=s0+L/2;}for(const o of s.opponents||[]){o.s=o.prevS=s0+L/2;}if(s.rival){s.rival.s=s.rival.prevS=s0+L/2;}};
    R.place=(pointS,mph,lateral)=>{
      const s=a.duel.state;if(s.status!=='racing')throw Error('Race is not running ('+s.status+')');
      const target=L+pointS,run=Math.max(30,Math.min(160,mph*M2W*1.3)),from=target-run;
      R.clearField(from);
      s.s=s.prevS=from;s.lateral=s.prevLateral=lateral||0;s.headingError=0;s.speedMph=mph;s.impactTimer=0;s.airHeight=0;
      a.autopilot=true;let guard=0;
      while(s.s<target&&guard++<600){a.advance(1/60,1/60);if(s.status!=='racing')throw Error('Race stopped during run-up ('+s.status+')');}
      a.autopilot=false;a.duel.setInput({throttle:0,brake:0,steer:0,boost:false});
      R.clearField(target);
      return{s:s.s-L,mph:s.speedMph,air:!!s.airborne,lateral:s.lateral};
    };
  })()`);
  await context.evaluate('window.__review.begin()');
  await context.waitFor('window.__review.ready()', 'review race scene', 90_000);

  const frames = [];
  for (const frame of data.frames) {
    const before = context.issues.length;
    let info;
    if (frame.kind === 'grid') {
      await context.evaluate('window.__review.render(24)');
      info = { s: 0, mph: 0, air: false };
    } else {
      if (frame.index === 1) await context.evaluate('window.__review.go()');
      info = await context.evaluate(`window.__review.place(${frame.s},${frame.mph},${frame.lateral ?? 0})`);
      await context.evaluate('window.__review.render(16)');
    }
    const image = await shot(context);
    writeFileSync(join(dir, data.files.frameFolder, frame.file), Buffer.from(image, 'base64'));
    const errors = takeIssues(context, before);
    if (errors.length) { result.frameErrors[frame.index] = errors; result.browserErrors.push(`frame ${frame.index + 1} (${frame.label}): ${errors.join(' | ')}`); }
    frames.push({ frame, image, info });
    console.log(`Frame ${frame.index + 1}/${data.frames.length}: ${frame.label} at ${Math.round(frame.s)} m${errors.length ? ' (BROWSER ERROR)' : ''}`);
  }
  const cells = frames.map(({ frame, image, info }) => ({
    url: jpegUrl(image), number: String(frame.index + 1).padStart(2, '0'), label: frame.label,
    right: frame.kind === 'grid' ? '0 m' : `${Math.round(frame.s)} m  ${Math.round(info.mph)} mph${info.air ? '  AIRBORNE' : ''}`,
  }));
  const rows = Math.ceil(cells.length / 4);
  const spec = { W: 2560, H: 46 + 6 + rows * (400 + 6), cols: 4, gap: 6, cellH: 400, title: `${data.title}: ${cells.length} frames, ordinary chase camera`,
    note: `${data.options.quality} quality, ${data.options.car}. Speed and line are the test driver's.`, cells, type: 'image/jpeg', quality: 0.88 };
  writeDataUrl(join(dir, data.files.frames), await context.evaluate(`(${pageSheet.toString()})(${JSON.stringify(spec)})`));
  context.screenshots.push(join(dir, data.files.frames));

  // --- the field near the first corner ---
  if (data.hasField && data.firstCorner) {
    const before = context.issues.length, corner = data.firstCorner;
    await context.evaluate('window.__review.begin()');
    await context.waitFor('window.__review.ready()', 'pack scene', 90_000);
    const pack = await context.evaluate(`(()=>{
      const R=window.__review,a=window.__qaApp,s=a.duel.state,L=${data.length};
      R.go();a.autopilot=true;
      // Drive with the test driver until the player is 70 m from the corner's entry, at most 10 s of racing (a few seconds after the start).
      const entry=${corner.entryS},startT=s.stageTimeSec;let capped=false;
      while(true){
        const phase=((s.s%L)+L)%L,gap=((entry-phase)%L+L)%L;
        if(gap<70&&s.s>40)break;
        if(s.stageTimeSec-startT>10){capped=true;break;}
        a.advance(1/60,1/60);if(s.status!=='racing')break;
      }
      const endStatus=s.status;
      a.autopilot=false;a.duel.setInput({throttle:0,brake:0,steer:0,boost:false});
      R.render(20);
      return{endStatus,cornerEntryS:entry,timeSec:+(s.stageTimeSec-startT).toFixed(1),playerS:+(s.s%L).toFixed(0),capped,cars:(s.opponents||[]).length+1,
        gaps:(s.opponents||[]).map(o=>+(o.s-s.s).toFixed(1))};
    })()`);
    const chase = await shot(context);
    // A second view from above and behind, framing everyone in the field.
    await context.evaluate(`(()=>{
      const a=window.__qaApp,d=a.duel,s=d.state,c=d.course;
      const actors=[s,...(s.opponents||[])].filter(x=>x&&Number.isFinite(x.s));
      const pos=actors.map(x=>c.groundAt(x.s,x.lateral||0));
      const mid=pos.reduce((m,p)=>({x:m.x+p.x/pos.length,y:m.y+p.y/pos.length,z:m.z+p.z/pos.length}),{x:0,y:0,z:0});
      const lead=Math.max(...actors.map(x=>x.s)),tail=Math.min(...actors.map(x=>x.s));
      const h=c.groundAt(s.s,0).heading,back=Math.max(26,(lead-tail)*0.9+22);
      a.inspectionCamera={position:[mid.x-Math.sin(h)*back,mid.y+13+(lead-tail)*0.12,mid.z-Math.cos(h)*back],target:[mid.x+Math.sin(h)*10,mid.y+0.5,mid.z+Math.cos(h)*10]};
      window.__review.render(16);})()`);
    const overview = await shot(context);
    await context.evaluate('delete window.__qaApp.inspectionCamera');
    const errors = takeIssues(context, before);
    if (errors.length) result.browserErrors.push(`pack: ${errors.join(' | ')}`);
    const cellHeight = Math.round((2560 - 18) / 2 * 800 / 1280);
    const packSpec = { W: 2560, H: 46 + 6 + cellHeight + 6, cols: 2, gap: 6, cellH: cellHeight, title: `${data.title}: the field at the first corner`,
      note: `${pack.cars} cars`, type: 'image/png', quality: 1, cells: [
        { url: jpegUrl(chase), number: 'A', label: `Chase camera before corner ${corner.number}${corner.name ? ' ' + corner.name : ''}`, right: `player at ${pack.playerS} m` },
        { url: jpegUrl(overview), number: 'B', label: `The field (${pack.cars} cars) from above and behind`, right: `race time ${pack.timeSec} s${pack.capped ? `, stopped at the 10 s limit; the corner is at ${pack.cornerEntryS} m` : ''}` },
      ] };
    writeDataUrl(join(dir, data.files.pack), await context.evaluate(`(${pageSheet.toString()})(${JSON.stringify(packSpec)})`));
    context.screenshots.push(join(dir, data.files.pack));
    result.pack = { corner: corner.number, ...pack };
  } else {
    result.warnings.push(data.hasField ? 'No corner found, so no pack picture.' : 'This course has no computer racers, so no pack picture.');
  }
  writeFileSync(join(dir, 'browser-result.json'), JSON.stringify(result, null, 2));
}
