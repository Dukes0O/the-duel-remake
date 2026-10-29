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
import { drawMap, drawSpeed, INPUT_ENV, main as prepareReview } from '../track-review.mjs';

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

async function buildHairpinBindings() {
  const [{build},{join,resolve},{fileURLToPath}]=await Promise.all([
    import('vite'),import('node:path'),import('node:url'),
  ]);
  const root=resolve(fileURLToPath(new URL('../../',import.meta.url)));
  const entry=join(root,'.qa-dist/hairpin-camera.virtual.js').replaceAll('\\','/');
  const source=path=>JSON.stringify(join(root,path).replaceAll('\\','/'));
  const result=await build({root,configFile:false,logLevel:'silent',plugins:[{
    name:'hairpin-camera-observer',
    resolveId(id){if(id.replaceAll('\\','/')===entry)return '\0hairpin-camera';},
    load(id){if(id==='\0hairpin-camera')return 'export {sweepObstacle} from '+source('src/collision.js')+';'+
      'export {vehicleGroundPoint} from '+source('src/vehicle-surface.js')+';';},
  }],build:{write:false,minify:false,lib:{entry,formats:['es']}}});
  const chunk=(Array.isArray(result)?result[0]:result).output.find(row=>row.type==='chunk');
  if(!chunk)throw Error('Hairpin native observer bindings did not compile.');
  return chunk.code;
}

async function observeHairpinPose(pose) {
  const a=window.__qaApp,d=a.duel,s=d.state,c=d.course,R=window.__review;
  if(a.running||a.autopilot||a.cameraMode!=='chase'||a.inspectionCamera||
      s.status!=='racing'||s.paused||s.onFoot||c.def.id!=='harbour-lights'||s.car!=='falcone_f42')
    throw Error('Native camera observer is outside its ordinary Harbour/F42 fixture.');
  const wanted=c.length+pose.phase;
  Object.assign(s,{s:wanted,prevS:wanted,lateral:0,prevLateral:0,headingError:0,speedMph:0,
    airborne:false,airHeight:0,impactTimer:0});
  R.clearField(wanted);
  const blockers=c.features.obstacles.filter(row=>row.barrier||row.tunnelWall||row.kitSolid||row.trackWall);
  const observations=[];
  for(let frame=0;frame<60;frame++){
    await new Promise(done=>requestAnimationFrame(done));
    const row={frame,errors:[],hits:[]};
    try{
      R.render(1);
      const native=window.__render,ground=window.__hairpinBindings.vehicleGroundPoint(c,s.s,s.lateral);
      const roots=native.scene.children.filter(root=>root.userData?.vehicleKey===s.car&&
        root.position.x===ground.x&&root.position.z===ground.z);
      if(roots.length!==1)throw Error('Actual placed player root is ambiguous or missing: '+roots.length);
      const player=roots[0],target=player.position.clone();target.y+=1.05;
      const camera=native.camera.position.clone(),projected=target.clone().project(native.camera);
      const point=v=>({x:v.x,y:v.y,z:v.z});
      row.camera=point(camera);row.target=point(target);row.projected=point(projected);
      row.playerVisible=player.visible;
      if(![camera.x,camera.y,camera.z,target.x,target.y,target.z,projected.x,projected.y,projected.z].every(Number.isFinite))
        throw Error('Nonfinite native camera/target/projection.');
      for(let index=0;index<blockers.length;index++){
        const obstacle=blockers[index];
        const hit=window.__hairpinBindings.sweepObstacle(target,camera,obstacle,0,
          {halfWidth:0,halfLength:0,height:0,useModelBounds:false});
        if(hit)row.hits.push({index,id:obstacle.id??null,kind:obstacle.kind??null,t:hit.t});
      }
      row.inFrame=player.visible&&Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1&&projected.z>=-1&&projected.z<=1;
    }catch(error){row.errors.push(String(error?.message??error));}
    observations.push(row);
  }
  const settled=observations.at(-1);
  return{...pose,s:wanted,fixture:'controlled geometric pose; not driving',
    blockerCount:blockers.length,observations,
    passed:observations.every(row=>!row.errors.length&&!row.hits.length)&&settled.inFrame===true};
}

async function checkHairpinCamera(context,data) {
  const packet={schema:1,kind:'native-controlled-camera-sweep',course:data.courseId,
    car:data.options.car,seed:data.options.seed,quality:data.options.quality,
    independentOfDriving:true,posePhysicsSteps:0,setup:'existing native start/countdown, separate from geometric sweep',settling:'60 actual RAF turns per controlled pose',
    samples:[],failures:[],complete:false,apexPicture:null,pictureVerdict:'UNREVIEWED'};
  const flush=()=>writeFileSync(join(data.outputDir,'camera-sweep.json'),JSON.stringify(packet,null,2)+'\n');
  const issuesBefore=context.issues.length;
  try{
    if(data.courseId!=='harbour-lights'||data.options.car!=='falcone_f42'||data.options.seed!==1989)
      throw Error('Hairpin observer requires stock Harbour/F42/1989.');
    const bundle=await buildHairpinBindings();
    await context.evaluate(`(async()=>{
      const url=URL.createObjectURL(new Blob([${JSON.stringify(bundle)}],{type:'text/javascript'}));
      try{window.__hairpinBindings=await import(url);}finally{URL.revokeObjectURL(url);}
      window.__review.begin();
    })()`);
    await context.waitFor('window.__review.ready()','actual camera sweep scene',90000);
    await context.evaluate('window.__review.go()');
    const course=await context.evaluate(`(()=>{
      const c=window.__qaApp.duel.course;
      const pieces=c.script.pieces.filter(p=>p.kind==='turn'&&p.name==='Lantern Hairpin');
      if(pieces.length!==1)throw Error('Actual Lantern Hairpin piece missing/ambiguous.');
      return{length:c.length,start:pieces[0].s0,end:pieces[0].s1,features:JSON.stringify(c.features)};
    })()`);
    const corners=data.corners.filter(row=>row.name==='Lantern Hairpin');
    if(corners.length!==1||!Number.isFinite(corners[0].apexS)||corners[0].apexS<course.start||corners[0].apexS>course.end)
      throw Error('Existing named review apex is missing or outside actual Lantern piece.');
    const apex=corners[0].apexS,rows=new Map();
    const add=(value,tag)=>{
      const phase=((value%course.length)+course.length)%course.length;
      if(!rows.has(phase))rows.set(phase,{phase,tags:[]});
      rows.get(phase).tags.push(tag);
    };
    for(let s=0;s<course.length;s+=25)add(s,'full-course-25m');
    add(course.length,'course-end');
    for(let s=course.start-26;s<=course.end+26;s+=1)add(s,'lantern-window-1m');
    add(course.end+26,'lantern-window-end');
    add(apex,'named-review-apex');
    const poses=[...rows.values()].sort((a,b)=>a.phase-b.phase);
    Object.assign(packet,{length:course.length,hairpin:{start:course.start,end:course.end,apex},
      expectedPoses:poses.length,blockerFeaturesReadOnly:true});
    flush();
    for(let index=0;index<poses.length;index++){
      const pose=poses[index];
      try{
        const sample=await context.evaluate(`(${observeHairpinPose.toString()})(${JSON.stringify(pose)})`);
        packet.samples.push(sample);
        if(!sample.passed)packet.failures.push({index,phase:pose.phase,
          frameMisses:sample.observations.filter(row=>row.errors.length||row.hits.length).map(row=>row.frame),
          finalProjection:sample.observations.at(-1)});
        if(pose.tags.includes('named-review-apex')){
          packet.apexPicture=await context.screenshot('lantern-hairpin-apex');
          packet.apexProjection=sample.observations.at(-1);
        }
      }catch(error){
        packet.samples.push({...pose,passed:false,error:String(error?.message??error)});
        packet.failures.push({index,phase:pose.phase,error:String(error?.message??error)});
      }
      if(index%10===0||!packet.samples.at(-1).passed)flush();
    }
    const unchanged=await context.evaluate(`JSON.stringify(window.__qaApp.duel.course.features)===${JSON.stringify(course.features)}`);
    if(!unchanged){packet.blockerFeaturesReadOnly=false;packet.failures.push({error:'Native observer changed course features.'});}
    packet.complete=packet.samples.length===packet.expectedPoses;
    if(!packet.apexPicture)packet.failures.push({error:'No actual apex image was captured.'});
  }catch(error){packet.failures.push({error:String(error?.message??error)});}
  finally{
    packet.browserIssues=context.issues.slice(issuesBefore);
    if(packet.browserIssues.length)packet.failures.push({error:'Native browser issues',count:packet.browserIssues.length});
    packet.geometryPassed=packet.complete&&packet.failures.length===0;
    flush();
  }
  return{file:'camera-sweep.json',geometryPassed:packet.geometryPassed,
    complete:packet.complete,poses:packet.samples.length,expectedPoses:packet.expectedPoses??null,
    failures:packet.failures,apexPicture:packet.apexPicture,pictureVerdict:packet.pictureVerdict};
}

// Closed circuits keep the original second-lap fixture. An open road has
// one physical run, so its requested views and run-ups stay on that road.
// A review teleport must not carry an earlier Ardennes view's absolute flight height.
export function resetReviewFlight(state) {
  Object.assign(state,{airborne:false,airHeight:0,prevAirHeight:0,_jumpY:null,_verticalSpeed:0,
    _jumpOrigin:null,_airOrigin:null,airDistance:0,airTime:0});
}

export function reviewPlacementPlan(course,pointS,mph,mphToWorld,length) {
  const run=Math.max(30,Math.min(160,mph*mphToWorld*1.3));
  if(course.closed!==false)return {target:length+pointS,from:length+pointS-run,reportBase:length};
  return {target:pointS,from:Math.max(0,pointS-run),reportBase:0};
}

// The disposable profile the review races with: the course owned and, for a variant, its parent and the unlock it really
// uses (a podium, or the pilot's map record for a secret found from the air). Runs in the page, so it uses nothing outside itself.
export function reviewProfile(profile, {courseId, defaultEventId, fixtureHeli}) {
  const parent = defaultEventId ? [defaultEventId] : [];
  return {...profile, courses: {version: 1, unlocked: [...new Set([...(profile.courses?.unlocked || []), courseId, ...parent])]},
    grandPrixPodiums: [...new Set([...(profile.grandPrixPodiums || []), ...parent])],
    ...(fixtureHeli ? {heli: fixtureHeli} : {})};
}

export async function run(context) {
  let inputPath = process.env[INPUT_ENV];
  if (!inputPath) {
    // A generic sweep has no dedicated wrapper. Generate the normal real lap
    // under the harness-owned evidence directory without invoking a browser.
    const code = await prepareReview(['pacific-canyon', '--no-browser', '--output-dir', context.outputDir]);
    if (code !== 0) throw Error('Track review preparation failed.');
    inputPath = join(context.outputDir, 'review-input.json');
  }
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  const dir = data.outputDir;
  const result = { pack: null, frameErrors: {}, framePoses: {}, browserErrors: [], warnings: [] };
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
    a.profile=(${reviewProfile.toString()})(a.profile,${JSON.stringify({courseId:data.courseId,defaultEventId:data.defaultEventId,fixtureHeli:data.fixtureHeli})});
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
      const course=a.duel.course,plan=(${reviewPlacementPlan.toString()})(course,pointS,mph,M2W,L);
      const {target,from}=plan;
      R.clearField(from);
      s.s=s.prevS=from;s.lateral=s.prevLateral=lateral||0;s.headingError=0;s.speedMph=mph;s.impactTimer=0;s.airHeight=0;
      if(course.def.id==='ardennes-forest')(${resetReviewFlight.toString()})(s);
      a.autopilot=true;let guard=0;
      while(s.s<target&&guard++<600){a.advance(1/60,1/60);if(s.status!=='racing')throw Error('Race stopped during run-up ('+s.status+')');}
      a.autopilot=false;a.duel.setInput({throttle:0,brake:0,steer:0,boost:false});
      R.clearField(target);
      return{s:s.s-plan.reportBase,mph:s.speedMph,air:!!s.airborne,lateral:s.lateral,
        requestedS:pointS,target,runupFrom:from,absoluteS:s.s,coursePhase:course.phase(s.s),closed:course.closed};
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
    result.framePoses[frame.index]=info;
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
  if (process.env.DUEL_HAIRPIN_CAMERA === '1') result.hairpinCamera = await checkHairpinCamera(context, data);
  writeFileSync(join(dir, 'browser-result.json'), JSON.stringify(result, null, 2));
  if (result.hairpinCamera && !result.hairpinCamera.geometryPassed) throw Error('Harbour native camera sweep failed; all misses retained in camera-sweep.json.');
}
