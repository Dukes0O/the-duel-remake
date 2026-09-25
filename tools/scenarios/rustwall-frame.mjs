import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {summarizeFrames} from '../performance-review.js';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const BASELINE='5a994ad1b99f6a90734f960cb89dbd5eb26e6675';
const digest=async path=>createHash('sha256').update(await readFile(join(ROOT,path))).digest('hex');
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const insist=(condition,message)=>{if(!condition)throw Error(message);};

function exactSummary(values,reported,label) {
  const expected=summarizeFrames(values);
  insist(same(expected,reported),`${label} summary differs from ordered samples`);
}
const mean=values=>values.reduce((sum,value)=>sum+value,0)/values.length;
const median=values=>{const ordered=[...values].sort((a,b)=>a-b);
  return ordered[Math.floor((ordered.length-1)*.5)];};

export function validateRustwallFrameReport(report,{role,run,commit}) {
  insist(['baseline','candidate'].includes(role)&&['a1','b','a2'].includes(run),
    'Timing role/run invalid');
  insist(report?.role===role&&report.run===run&&report.commit===commit,
    'Timing report identity differs from requested role/run/commit');
  insist(role!=='baseline'||commit===BASELINE,'Timing baseline is not pinned 5a994ad');
  insist(report.samples===600&&report.warmup===20,'Timing count or warmup differs');
  for(const key of ['renderer','worldSurfaces','course','wallGlb','washGlb'])
    insist(/^[a-f0-9]{64}$/.test(report.hashes?.[key]||''),`Missing ${key} SHA-256`);
  insist(report.scope?.memoryOnlySaves===true&&
    report.scope?.render==='complete production renderFrame',
    'Timing scope must include complete production rendering and memory-only saves');
  for(const quality of ['high','performance'])for(const view of ['wash','approach']) {
    const row=report.quality?.[quality]?.[view],tag=`${quality}/${view}`;
    insist(row&&typeof row==='object',`Missing ${tag}`);
    for(const key of ['rafSamplesMs','renderCpuSamplesMs','mirrorRefreshSamples',
      'frameIds','rafTimestampsMs','drawCallSamples','triangleSamples','canvasPixelSamples'])
      insist(Array.isArray(row[key])&&row[key].length===600,`${tag} ${key} needs 600 ordered samples`);
    insist(Number.isFinite(row.warmEndTimestampMs),`${tag} warm timestamp missing`);
    for(let i=0;i<600;i++){
      const previous=i?row.rafTimestampsMs[i-1]:row.warmEndTimestampMs;
      insist(row.frameIds[i]===i&&row.rafTimestampsMs[i]>previous&&
        Math.abs(row.rafSamplesMs[i]-(row.rafTimestampsMs[i]-previous))<.0001,
        `${tag} RAF sample order or timestamp delta changed at ${i}`);
      insist(Number.isFinite(row.renderCpuSamplesMs[i])&&row.renderCpuSamplesMs[i]>0&&
        typeof row.mirrorRefreshSamples[i]==='boolean'&&
        Number.isFinite(row.drawCallSamples[i])&&row.drawCallSamples[i]>0&&
        Number.isFinite(row.triangleSamples[i])&&row.triangleSamples[i]>0&&
        Number.isFinite(row.canvasPixelSamples[i])&&row.canvasPixelSamples[i]>0,
        `${tag} sample ${i} invalid`);
    }
    insist(row.canvasPixelSamples.every(value=>value===row.canvasPixelSamples[0]),
      `${tag} canvas dimensions changed`);
    insist(Number.isInteger(row.canvas?.width)&&Number.isInteger(row.canvas?.height)&&
      row.canvas.width>0&&row.canvas.height>0&&
      row.canvas.width*row.canvas.height===row.canvasPixelSamples[0]&&
      row.canvas.width===1280&&row.canvas.height===720,
      `${tag} canvas shape changed`);
    exactSummary(row.rafSamplesMs,row.raf,`${tag} RAF`);
    exactSummary(row.renderCpuSamplesMs,row.renderCpu,`${tag} CPU`);
    const refreshed=row.renderCpuSamplesMs.filter((_,i)=>row.mirrorRefreshSamples[i]);
    const reused=row.renderCpuSamplesMs.filter((_,i)=>!row.mirrorRefreshSamples[i]);
    insist(refreshed.length>0&&reused.length>0,`${tag} mirror strata unavailable`);
    exactSummary(refreshed,row.renderCpuByMirror?.refreshed,`${tag} refreshed mirror`);
    exactSummary(reused,row.renderCpuByMirror?.reused,`${tag} reused mirror`);
    insist(Array.isArray(row.camera?.position)&&row.camera.position.length===3&&
      Array.isArray(row.camera?.target)&&row.camera.target.length===3&&
      Number.isFinite(row.camera?.fov)&&
      Array.isArray(row.camera?.projectionMatrix)&&row.camera.projectionMatrix.length===16&&
      Array.isArray(row.camera?.matrixWorld)&&row.camera.matrixWorld.length===16&&
      row.camera.matrixWorld.every(Number.isFinite)&&row.camera.projectionMatrix.every(Number.isFinite),
      `${tag} camera or matrices missing`);
    insist(row.camera.position.every((value,index)=>
      Math.abs(value-row.camera.matrixWorld[12+index])<.001),
      `${tag} camera position and measured matrix differ`);
    insist(row.state?.seed===1989&&row.state.progress===(view==='wash'?350:960)&&
      row.state.stopped===true&&row.state.gateClosed===true&&
      row.state.courseId==='pacific-canyon'&&row.state.routeSeed===1989&&
      row.state.status==='racing'&&row.state.speedMph===0&&
      Number.isFinite(row.state.s)&&Number.isFinite(row.state.lateral)&&
      Number.isFinite(row.state.hiddenRoadLength)&&row.state.hiddenRoadLength>0,
      `${tag} stopped inspection state changed`);
    insist(Math.abs(row.diagnosticMean?.raf-mean(row.rafSamplesMs))<.0001&&
      Math.abs(row.diagnosticMean?.renderCpu-mean(row.renderCpuSamplesMs))<.0001,
      `${tag} diagnostic means differ from raw samples`);
  }
  return report;
}

export function compareRustwallFrameRuns(a1,b,a2) {
  validateRustwallFrameReport(a1,{role:'baseline',run:'a1',commit:a1.commit});
  validateRustwallFrameReport(b,{role:'candidate',run:'b',commit:b.commit});
  validateRustwallFrameReport(a2,{role:'baseline',run:'a2',commit:a2.commit});
  insist(a1.commit===a2.commit&&a1.commit!==b.commit,
    'A1/A2 must be the same pinned baseline and B a candidate commit');
  for(const key of ['wallGlb','washGlb'])
    insist(a1.hashes[key]===a2.hashes[key],`${key} differs between baseline runs`);
  for(const key of ['renderer','worldSurfaces','course'])
    insist(a1.hashes[key]===b.hashes[key]&&a1.hashes[key]===a2.hashes[key],
      `${key} source differs across A/B/A`);
  const result={baselineCommit:a1.commit,candidateCommit:b.commit,quality:{}};
  for(const quality of ['high','performance']){
    result.quality[quality]={};
    for(const view of ['wash','approach']){
      const base1=a1.quality[quality][view],candidate=b.quality[quality][view],
        base2=a2.quality[quality][view];
      for(const key of ['camera','state'])
        insist(same(base1[key],candidate[key])&&same(base1[key],base2[key]),
          `${quality}/${view} ${key} differs across A/B/A`);
      insist(base1.canvasPixelSamples[0]===candidate.canvasPixelSamples[0]&&
        base1.canvasPixelSamples[0]===base2.canvasPixelSamples[0]&&
        same(base1.canvas,candidate.canvas)&&same(base1.canvas,base2.canvas),
        `${quality}/${view} canvas pixels differ across A/B/A`);
      insist(same(base1.mirrorRefreshSamples,candidate.mirrorRefreshSamples)&&
        same(base1.mirrorRefreshSamples,base2.mirrorRefreshSamples),
        `${quality}/${view} mirror refresh schedule differs across A/B/A`);
      const ratio=(key,percentile)=>[base1,base2].map(base=>
        candidate[key][percentile]/base[key][percentile]);
      result.quality[quality][view]={
        cpu:{p50:ratio('renderCpu','p50'),p95:ratio('renderCpu','p95')},
        raf:{p50:ratio('raf','p50'),p95:ratio('raf','p95')},
        drawCalls:{delta:[base1,base2].map(base=>median(candidate.drawCallSamples)-median(base.drawCallSamples))},
        triangles:{delta:[base1,base2].map(base=>median(candidate.triangleSamples)-median(base.triangleSamples))},
        baselineDrift:{cpuP95:base2.renderCpu.p95/base1.renderCpu.p95,
          rafP95:base2.raf.p95/base1.raf.p95},
      };
    }
  }
  return result;
}

export async function run(context) {
  const role=process.env.EGG_RUSTWALL_FRAME_ROLE,run=process.env.EGG_RUSTWALL_FRAME_RUN;
  insist(['baseline','candidate'].includes(role),'Set EGG_RUSTWALL_FRAME_ROLE');
  insist((role==='candidate'&&run==='b')||(role==='baseline'&&['a1','a2'].includes(run)),
    'Set matching EGG_RUSTWALL_FRAME_RUN');
  const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim();
  insist(role!=='baseline'||commit===BASELINE,'Timing baseline must be pinned 5a994ad');
  const report={role,run,commit,samples:600,warmup:20,
    hashes:{renderer:await digest('src/render3d.js'),
      worldSurfaces:await digest('src/world-surfaces.js'),course:await digest('src/course.js'),
      wallGlb:await digest('public/assets/models/wasteland/rustwall/wall.glb'),
      washGlb:await digest('public/assets/models/wasteland/rustwall/wash.glb')},
    quality:{},scope:{render:'complete production renderFrame',raf:'ordered delivered frames',
      mirror:'refreshed and reused passes',memoryOnlySaves:true}};
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=hidden-road');
    await context.waitFor("!!window.__qaApp?.visualReady&&!!window.__render&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:')",
      'private Rustwall timing menu',60000);
    await context.evaluate(`(() => {
      const app=window.__qaApp;app.setGraphicsQuality(${JSON.stringify(quality)});
      app.startCampaign({mode:'duel',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});
      app.stop();Object.assign(app.duel.state,{status:'racing',countdown:0,paused:false,
        speedMph:0,traffic:[],opponents:[],rival:null});
      app.inspectionCamera=null;app.onFrame?.(app.duel.state);window.__render.renderFrame();
      document.querySelectorAll('details').forEach(panel=>panel.open=false);
    })()`);
    await context.waitFor(`(() => {const r=window.__render,a=window.__qaApp;
      r.renderFrame();const wall=r.scene.getObjectByName('Rustwall');
      if(wall?.userData.assetStatus==='failed')throw Error(wall.userData.loadErrors.join('; '));
      return !!a.visualReady&&wall?.userData.assetStatus==='ready';})()`,
      'loaded Rustwall timing course',60000);
    await context.evaluate(`(() => {
      document.body.style.setProperty('visibility','hidden');
      window.__render.renderer.domElement.style.visibility='visible';
      window.__rustwallFrameRaf=window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame=()=>0;
    })()`);
    report.quality[quality]={};
    for(const [view,progress] of [['wash',350],['approach',960]]){
      report.quality[quality][view]=await context.evaluate(`(async () => {
        const app=window.__qaApp,r=window.__render,d=app.duel,p=d.course.hiddenRoad.poseAt(${progress}),h=p.heading;
        Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,
          speedMph:0,headingError:h-d.course.at(p.s).heading,groundHeight:null,
          airHeight:0,airborne:false,terrainPitch:null,terrainRoll:null});
        app.inspectionCamera={position:[p.x-Math.sin(h)*7,p.y+3,p.z-Math.cos(h)*7],
          target:[p.x+Math.sin(h)*60,p.y+8,p.z+Math.cos(h)*60]};
        r.camera.position.fromArray(app.inspectionCamera.position);
        r.scene.getObjectByName('Rustwall').userData.setGateOpen(0);
        app.onFrame?.(d.state);r.renderFrame();
        const rafSamplesMs=[],renderCpuSamplesMs=[],mirrorRefreshSamples=[],
          frameIds=[],rafTimestampsMs=[],drawCallSamples=[],triangleSamples=[],canvasPixelSamples=[];
        let previous=null,warmEndTimestampMs=null;
        const camera={position:r.camera.position.toArray(),target:app.inspectionCamera.target,
          fov:r.camera.fov,projectionMatrix:r.camera.projectionMatrix.toArray(),
          matrixWorld:r.camera.matrixWorld.toArray()};
        const canvas={width:r.renderer.domElement.width,height:r.renderer.domElement.height};
        const state={seed:d.state.seed,progress:${progress},stopped:!app.running,
          gateClosed:r.scene.getObjectByName('Rustwall').getObjectByName('gate-panel')?.position.y<8,
          courseId:d.course.def.id,routeSeed:d.course.seed,status:d.state.status,
          speedMph:d.state.speedMph,s:d.state.s,lateral:d.state.lateral,
          hiddenRoadLength:d.course.hiddenRoad.length};
        for(let i=0;i<620;i++){
          const now=await new Promise(window.__rustwallFrameRaf),begin=performance.now();
          const metrics=r.renderFrame(),cpu=performance.now()-begin;
          if(!r.camera.matrixWorld.elements.every((value,index)=>Math.abs(value-camera.matrixWorld[index])<.0001)||
             !r.camera.projectionMatrix.elements.every((value,index)=>Math.abs(value-camera.projectionMatrix[index])<.0001)||
             r.renderer.domElement.width!==canvas.width||r.renderer.domElement.height!==canvas.height||
             d.state.s!==state.s||d.state.speedMph!==state.speedMph||d.state.status!==state.status)
            throw Error('Rustwall timing camera, canvas or stopped state changed during sampling');
          if(i===19)warmEndTimestampMs=now;
          if(i>=20){const index=i-20;frameIds.push(index);rafTimestampsMs.push(now);
            rafSamplesMs.push(now-previous);renderCpuSamplesMs.push(cpu);
            mirrorRefreshSamples.push(document.querySelector('[data-rear-view-refreshed]')?.dataset.rearViewRefreshed==='true');
            drawCallSamples.push(metrics.drawCalls);triangleSamples.push(metrics.triangles);
            canvasPixelSamples.push(r.renderer.domElement.width*r.renderer.domElement.height);}
          previous=now;
        }
        return{rafSamplesMs,renderCpuSamplesMs,mirrorRefreshSamples,frameIds,rafTimestampsMs,
          warmEndTimestampMs,drawCallSamples,triangleSamples,canvasPixelSamples,
          canvas,camera,state};
      })()`);
      const row=report.quality[quality][view];
      row.raf=summarizeFrames(row.rafSamplesMs);
      row.renderCpu=summarizeFrames(row.renderCpuSamplesMs);
      row.renderCpuByMirror={refreshed:summarizeFrames(row.renderCpuSamplesMs.filter((_,i)=>row.mirrorRefreshSamples[i])),
        reused:summarizeFrames(row.renderCpuSamplesMs.filter((_,i)=>!row.mirrorRefreshSamples[i]))};
      row.diagnosticMean={raf:mean(row.rafSamplesMs),renderCpu:mean(row.renderCpuSamplesMs)};
    }
  }
  insist(await digest('public/assets/models/wasteland/rustwall/wall.glb')===report.hashes.wallGlb&&
    await digest('public/assets/models/wasteland/rustwall/wash.glb')===report.hashes.washGlb,
    'Rustwall timing assets changed during sampling');
  validateRustwallFrameReport(report,{role,run,commit});
  await writeFile(join(context.outputDir,`rustwall-frame-${run}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(`Rustwall ${role} ${run}: 600 ordered frames, two qualities and two stopped course views.`);
}
