// Repeatable, bounded browser samples. These measure delivered RAF intervals,
// not GPU time. Keep the tab visible and do not change scene or quality mid-run.
import {createPhaseDiagnostics} from '../src/phase-diagnostics.js';
import {startRenderProfile} from './render-profile.js';
export function summarizeFrames(values) {
  const ordered=[...values].sort((a,b)=>a-b);
  if(!ordered.length||ordered.some(value=>!Number.isFinite(value)||value<=0))throw new Error('Expected positive frame intervals.');
  const round=value=>Math.round(value*100)/100;
  const percentile=fraction=>ordered[Math.ceil(ordered.length*fraction)-1];
  return {frames:ordered.length,p50:round(percentile(.5)),p95:round(percentile(.95)),max:round(ordered.at(-1)),over33ms:ordered.filter(value=>value>1000/30).length};
}

export function installPerformanceReview(app,view,nav,{hudSource='custom callback'}={}) {
  const button=document.createElement('button');button.textContent='Measure frame pacing';nav.append(button);
  const panel=document.createElement('details');panel.style.cssText='position:fixed;right:12px;bottom:12px;max-width:430px;max-height:45vh;overflow:auto;z-index:5;padding:12px;background:#081317ee;color:white;font:12px monospace';
  const title=document.createElement('summary');title.textContent='Performance samples (none)';panel.append(title);
  const result=document.createElement('pre');result.id='performance-results';result.style.whiteSpace='pre-wrap';panel.append(result);document.body.append(panel);
  const reports=[],events=new AbortController();let raf=0,timeout=0,active=false,diagnostics=null,passProfile=null,disposed=false;
  const key=()=>[view.dataset.worldBuilds,view.dataset.edgeSmoothing,view.dataset.vehicleKey,view.dataset.vehicleAsset,view.dataset.warmupStatus,view.clientWidth,view.clientHeight,window.devicePixelRatio,app.running,app.cameraMode,app.lightingMood,app.duel.state.status,app.duel.state.paused,app.autopilot,app.audio.muted,app.audio.context?.state,app.audio.sampleStatus,app.audio.ambienceStatus,JSON.stringify(app.inspectionCamera)].join(':');
  const cancel=reason=>{cancelAnimationFrame(raf);clearTimeout(timeout);diagnostics?.stop();if(app.frameDiagnostics===diagnostics)app.frameDiagnostics=null;passProfile?.cancel();passProfile=null;active=false;button.disabled=false;button.textContent='Measure frame pacing';if(reason)title.textContent=reason;};
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)cancel('Sample cancelled: tab became hidden');},{signal:events.signal});
  window.addEventListener('pagehide',()=>cancel(),{signal:events.signal});
  button.onclick=()=>{
    if(active||disposed)return;
    if(document.hidden){title.textContent='Show this tab before measuring';return;}
    if(!app.running||!window.__render?.composer||view.dataset.vehicleAsset!=='ready'||['scheduled','compiling'].includes(view.dataset.warmupStatus)){title.textContent='Wait for the scene to load and the game loop to run before measuring';return;}
    active=true;button.disabled=true;button.textContent='Measuring 120 frames…';
    diagnostics=createPhaseDiagnostics();app.frameDiagnostics=diagnostics;
    try{passProfile=startRenderProfile(window.__render);}catch{cancel('Pass profiling is unavailable on this renderer');return;}
    const signature=key(),intervals=[],label=`${app.duel.course?.def.id||'menu'} @ ${Math.round(app.duel.state.s)}m`,quality=view.dataset.edgeSmoothing==='true'?'High':'Performance';
    const startScale=Number(view.dataset.resolutionScale)||1;
    const gl=window.__render.renderer.getContext(),gpuInfo=gl.getExtension('WEBGL_debug_renderer_info');
    const gpu=gpuInfo?gl.getParameter(gpuInfo.UNMASKED_RENDERER_WEBGL):'not exposed by browser';
    let previous=null,warmup=30;
    timeout=setTimeout(()=>cancel('Sample cancelled: exceeded 30 seconds'),30000);
    const sample=now=>{
      if(!active)return;
      if(key()!==signature){cancel('Sample cancelled: scene, motion, audio or quality changed');return;}
      if(previous!==null){if(warmup){warmup--;if(!warmup)diagnostics.start({afterTimestamp:now,hud:hudSource});}else intervals.push(now-previous);}
      previous=now;
      if(intervals.length===120){
        diagnostics.stop();const phaseTiming=diagnostics.summary(),passTiming=passProfile.stop();passProfile=null;
        reports.push({scene:label,quality,viewport:`${view.clientWidth}x${view.clientHeight}`,dpr:window.devicePixelRatio,gpu,pipeline:view.dataset.renderPipeline,startScale,endScale:Number(view.dataset.resolutionScale)||1,renderPixelRatio:Number(view.dataset.renderPixelRatio)||null,rearView:view.dataset.rearView||'off',rearViewResolution:view.dataset.rearViewResolution||null,...summarizeFrames(intervals),phaseTiming,passTiming,drawCalls:Number(view.dataset.drawCalls),triangles:Number(view.dataset.triangles),worldBuildMs:Number(view.dataset.worldBuildMs),worldReadyMs:Number(view.dataset.worldReadyMs),rendererSetupMs:Number(view.dataset.rendererSetupMs),visualReadyMs:Number(view.dataset.visualReadyMs),firstFrameMs:Number(view.dataset.firstFrameMs),warmupStatus:view.dataset.warmupStatus,warmupSubmitMs:Number(view.dataset.warmupSubmitMs),warmupWaitMs:Number(view.dataset.warmupWaitMs),geometries:Number(view.dataset.geometries),textures:Number(view.dataset.textures),shaderPrograms:Number(view.dataset.shaderPrograms)||null});
        if(reports.length>12)reports.shift();
        result.textContent=JSON.stringify(reports,null,2);title.textContent=`Performance samples (${reports.length}) · last p95 ${reports.at(-1).p95} ms`;cancel();
      }else raf=requestAnimationFrame(sample);
    };
    raf=requestAnimationFrame(sample);
  };
  return {dispose(){if(disposed)return;disposed=true;cancel();events.abort();button.onclick=null;button.remove();panel.remove();}};
}
