import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const digest=async path=>createHash('sha256').update(await readFile(join(ROOT,path))).digest('hex');

async function runTiming(context) {
  const role=process.env.GFX_YARD_TIMING_ROLE;
  if (!['baseline','candidate'].includes(role)) throw Error('Timing role must be baseline or candidate');
  const run=process.env.GFX_YARD_TIMING_RUN;
  if (!/^(a1|b|a2)$/.test(run || '')) throw Error('Timing run must be a1, b or a2');
  const sampleCount=Number(process.env.GFX_YARD_TIMING_SAMPLES || 120);
  if(![120,600].includes(sampleCount))throw Error('Timing samples must be 120 or 600');
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  if(role==='baseline' && commit!=='85fe35f0d0537539ec9813c51be31b59292f74a3')
    throw Error('Timing baseline must use pinned pre-card commit 85fe35f');
  const report={role,run,sampleCount,commit,hashes:{ground:await digest('src/world-surfaces.js'),
    renderer:await digest('src/render3d.js')},quality:{},
    scope:'Private memory-only A/B/A scene timing. Full production renderFrame submission; CPU is not GPU time. Same stopped yard route, inspection cameras, viewport and quality.'};
  if(role==='candidate'){
    report.hashes.yardScene=await digest('src/scrapdome-yard.js');
    report.hashes.yardGlb=await digest('public/assets/models/wasteland/scrapdome/yard.glb');
  }
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=hidden-road,wasteland2');
    await context.waitFor("!!window.__qaApp?.visualReady && !!window.__render && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:')",
      'private timing menu',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;app.stop();
      const player=app.addPlayer(${JSON.stringify(`Yard timing ${quality}`)});
      if(!player.ok)throw Error('Memory-only timing profile unavailable');
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
      if(!app._saveProfile())throw Error('Memory-only timing save failed');
      app.setGraphicsQuality(${JSON.stringify(quality)});
      if(!app.visitWasteland())throw Error('Timing yard visit failed');
      app.onFrame?.(app.duel.state);
    })()`);
    await context.waitFor('window.__qaApp.visualReady === true','timing visit vehicle ready',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.advance(8);app.onFrame?.(app.duel.state);window.__render.renderFrame();
      if(app.duel.state.hiddenRoadJourney?.phase!=='arrived')
        throw Error('Timing player did not stop in the yard: '+JSON.stringify({
          status:app.duel.state.status,journey:app.duel.state.hiddenRoadJourney,
          discovery:app.profile?.wasteland?.discoveredGate,car:app.duel.state.car}));
    })()`);
    if(role==='candidate')await context.waitFor(
      "window.__render.scene.getObjectByName('Scrapdome yard')?.userData.assetStatus==='ready'",
      'candidate yard model ready',60000);
    await context.evaluate(`(() => {
      document.body.style.setProperty('visibility','hidden');
      const canvas=window.__render.renderer.domElement;canvas.style.visibility='visible';
      window.__yardTimingRaf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=()=>0;
    })()`);
    report.quality[quality]={};
    for(const view of ['approach','home']){
      report.quality[quality][view]=await context.evaluate(`(async()=>{
        const app=window.__qaApp,r=window.__render,road=app.duel.course.hiddenRoad;
        const gate=road.poseAt(road.length),h=gate.heading;
        const at=(x,y,z)=>[gate.x+x*Math.cos(h)+z*Math.sin(h),gate.y+y,
                            gate.z-x*Math.sin(h)+z*Math.cos(h)];
        app.inspectionCamera=${view==='approach'
          ? '{position:at(0,8,-35),target:at(0,5,55)}'
          : '{position:at(0,4,0),target:at(8,2,60)}'};
        const raf=[],cpu=[],mirror=[],draws=[],triangles=[],pixels=[];
        let previous=null;
        for(let i=0;i<${sampleCount}+21;i++){
          const now=await new Promise(window.__yardTimingRaf);
          const begin=performance.now(),metrics=r.renderFrame();
          const elapsed=performance.now()-begin;
          if(i>20){raf.push(now-previous);cpu.push(elapsed);
            mirror.push(document.querySelector('[data-rear-view-refreshed]')?.dataset.rearViewRefreshed==='true');
            draws.push(metrics.drawCalls);triangles.push(metrics.triangles);
            pixels.push([r.renderer.domElement.width,r.renderer.domElement.height]);}
          previous=now;
        }
        const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);
          return{samples:sorted.length,p50:sorted[Math.floor((sorted.length-1)*.5)],
            p95:sorted[Math.floor((sorted.length-1)*.95)],max:sorted.at(-1),
            over33:sorted.filter(x=>x>33).length};};
        const stratum=refreshed=>{const values=cpu.filter((_,i)=>mirror[i]===refreshed).sort((a,b)=>a-b);
          return{samples:values.length,p50:values[Math.floor((values.length-1)*.5)]??null,
            p95:values[Math.floor((values.length-1)*.95)]??null};};
        return{raf:summary(raf),renderCpu:summary(cpu),rafSamplesMs:raf,renderCpuSamplesMs:cpu,
          mirrorRefreshSamples:mirror,renderCpuByMirror:{refreshed:stratum(true),reused:stratum(false)},
          drawCallSamples:draws,triangleSamples:triangles,canvasPixelSamples:pixels,
          camera:{position:r.camera.position.toArray(),fov:r.camera.fov,
            target:app.inspectionCamera.target},state:{status:app.duel.state.status,
            phase:app.duel.state.hiddenRoadJourney?.phase}};
      })()`);
    }
  }
  await writeFile(join(context.outputDir,`yard-timing-${run}.json`),JSON.stringify(report,null,2)+'\n');
  console.log(`Yard ${role} timing ${run}: two qualities and two stopped views retained.`);
}

/** Matched art views only. The yard-home scenario owns purchase/UI acceptance. */
export async function run(context) {
  if(process.env.GFX_YARD_TIMING_ROLE)return runTiming(context);
  const round = Number(process.env.GFX_YARD_ROUND || 1);
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('Yard round must be 1..10');
  const report = {round, scope:'Private memory-only first-visit yard; actual selected Falcone car and production renderer.', captures:[]};
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for (const quality of ['high','performance']) {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,wasteland2');
    await context.waitFor("!!window.__qaApp?.visualReady && !!window.__render && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value && window.name.startsWith('__duel_qa_tab_v2:')",
      'private Scrapdome menu',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.stop();
      const player=app.addPlayer(${JSON.stringify(`Scrapdome review ${quality}`)});
      if(!player.ok)throw Error('Could not create memory-only review player');
      app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};
      if(!app._saveProfile())throw Error('Memory-only review save failed');
      app.setGraphicsQuality(${JSON.stringify(quality)});
      if(!app.visitWasteland())throw Error('Yard visit failed');
      app.onFrame?.(app.duel.state);
    })()`);
    await context.waitFor('window.__qaApp.visualReady === true','visit vehicle ready',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.advance(8);app.onFrame?.(app.duel.state);window.__render.renderFrame();
      if(!app.isYardHomeActive())throw Error('Yard home did not arrive: '+app.duel.state.hiddenRoadJourney?.phase);
      document.querySelectorAll('details').forEach(panel=>{if(panel.querySelector('summary')?.textContent.includes('MENU QA'))panel.style.display='none';});
    })()`);
    await context.waitFor("window.__render.scene.getObjectByName('Scrapdome yard')?.userData.assetStatus==='ready'",
      'painted Scrapdome model',60000);
    await context.evaluate("window.__qaApp.onFrame?.(window.__qaApp.duel.state);window.__render.renderFrame()");
    await context.screenshot(`${quality}-home`);
    report.captures.push({quality,view:'home',name:`${quality}-home.png`});
    await context.evaluate(`(() => {
      const app=window.__qaApp,road=app.duel.course.hiddenRoad,p=road.poseAt(road.length),h=p.heading;
      const at=(x,y,z)=>[p.x+x*Math.cos(h)+z*Math.sin(h),p.y+y,p.z-x*Math.sin(h)+z*Math.cos(h)];
      app.inspectionCamera={position:at(0,21,12),target:at(0,5,120)};
      app.onFrame?.(app.duel.state);window.__render.renderFrame();
    })()`);
    await context.screenshot(`${quality}-board`);
    report.captures.push({quality,view:'board',name:`${quality}-board.png`});
  }
  await writeFile(join(context.outputDir,'scrapdome-review.json'),JSON.stringify(report,null,2)+'\n');
  console.log(`Scrapdome round ${round}: ${report.captures.length} matched High/Performance views retained.`);
}
