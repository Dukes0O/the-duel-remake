import {access, mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {wavFromPcm} from './audio-race.mjs';
import {decodeWav, rms, detectOnset} from '../audio-analysis.mjs';

const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const READY="!!window.__qaApp?.visualReady&&window.__render?.scene.getObjectByName('Rustwall')?.userData.assetStatus==='ready'";

// Test-only fixture and recorder. Production state owns every phase after the
// explicitly recorded placement fixtures; choices use actual DOM controls.
function installCapture(round,quality) {
  const app=window.__qaApp, audio=app.audio, ctx=audio.context;
  if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
      !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage is required');
  const qa={events:[],frames:[],cues:[],tracks:{},start:ctx.currentTime,originalFrame:app.onFrame,
    originalFactory:audio.hiddenRoadVoiceFactory,quality};
  const silent=ctx.createGain();silent.gain.value=0;silent.connect(ctx.destination);qa.silent=silent;
  for(const name of ['mix','vehicle','gate']) {
    const bus=ctx.createGain(),processor=ctx.createScriptProcessor(1024,2,2);
    bus.gain.value=name==='mix'?1:.42;bus.connect(processor);processor.connect(silent);
    const record=qa.tracks[name]={bus,processor,chunks:[],firstPlayback:null,sources:[],sampleOffset:0};
    processor.onaudioprocess=e=>{
      if(record.firstPlayback==null)record.firstPlayback=e.playbackTime;
      const left=e.inputBuffer.getChannelData(0),right=e.inputBuffer.getChannelData(1);
      const count=Math.ceil((left.length-record.sampleOffset)/3),chunk=new Int16Array(count*2);let at=0,i=record.sampleOffset;
      for(;i<left.length;i+=3){chunk[at++]=Math.round(Math.max(-1,Math.min(1,left[i]))*32767);chunk[at++]=Math.round(Math.max(-1,Math.min(1,right[i]))*32767);}
      record.sampleOffset=i-left.length;
      record.chunks.push(chunk);
    };
  }
  const tap=(name,node)=>{if(node){node.connect(qa.tracks[name].bus);qa.tracks[name].sources.push(node);}};
  tap('mix',audio.output||audio.master);tap('gate',audio.hiddenRoadBus);tap('vehicle',audio.vehicleBus);
  if(!qa.tracks.gate.sources.length)throw Error('Production gate audio bus missing');
  audio.hiddenRoadVoiceFactory=cue=>{
    qa.cues.push({...cue,audioTimeSec:ctx.currentTime-qa.start});
    return qa.originalFactory(cue);
  };
  qa.detach=app.duel.onChange((state,event)=>{
    for(const key of ['hiddenRoadDeparted','hiddenRoadPhase','hiddenRoadChoice','hiddenRoadArrived'])
      if(event[key])qa.events.push({kind:key,detail:structuredClone(event[key]),audioTimeSec:ctx.currentTime-qa.start,
        simulationTime:state.hiddenRoadJourney?.elapsedSec});
  });
  app.onFrame=(state,dt)=>{
    qa.originalFrame?.(state,dt);
    const j=state.hiddenRoadJourney;
    qa.frames.push({audioTimeSec:ctx.currentTime-qa.start,phase:j?.phase,phaseElapsedSec:j?.phaseElapsedSec,
      elapsedSec:j?.elapsedSec,gateOpen:j?.gateOpen,speedMph:state.speedMph,revs:state.revs,paused:!!state.paused});
    if(j?.phase==='opening'&&j.phaseElapsedSec>.7&&!qa.costSnapshot)qa.costSnapshot=structuredClone(state);
  };
  qa.motionFrames=[];
  if(round>=2&&quality==='high'){
    const canvas=window.__render.renderer.domElement,stream=canvas.captureStream(30),chunks=[];
    qa.recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8',videoBitsPerSecond:2500000});
    qa.videoDone=new Promise(resolve=>{qa.recorder.onstop=async()=>{
      const bytes=new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer());let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      stream.getTracks().forEach(track=>track.stop());resolve(btoa(binary));
    };});
    qa.recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};qa.recorder.start(250);
    const thumb=document.createElement('canvas');thumb.width=480;thumb.height=270;
    let lastPhase='',lastTime=-1;
    qa.motionTimer=setInterval(()=>{
      const j=app.duel.state.hiddenRoadJourney;if(!j)return;
      const interval=['entering','arrived'].includes(j.phase)?.5:1;
      if(j.phase===lastPhase&&j.phaseElapsedSec-lastTime<interval)return;
      if(j.phase==='arrived'&&j.phaseElapsedSec>1.6)return;
      if(!['opening','entering','arrived'].includes(j.phase))return;
      lastPhase=j.phase;lastTime=j.phaseElapsedSec;
      // The WebGL drawing buffer is discarded after presentation. Read in the
      // same task as this production draw; timing samples run after recording.
      window.__render.renderFrame();thumb.getContext('2d').drawImage(canvas,0,0,480,270);
      const pixels=thumb.getContext('2d').getImageData(0,0,480,270).data;
      let visible=0;for(let p=3;p<pixels.length;p+=4)if(pixels[p])visible++;
      if(visible<1000)throw Error('Motion thumbnail is blank');
      const cam=window.__render.camera,gate=app.duel.course.hiddenRoad.poseAt(app.duel.course.hiddenRoad.length);
      const dx=cam.position.x-gate.x,dz=cam.position.z-gate.z,c=Math.cos(gate.heading),s=Math.sin(gate.heading);
      const local={x:dx*c-dz*s,y:cam.position.y-gate.y,z:dx*s+dz*c};
      if(local.z>=-1.575&&local.z<=5.5&&(Math.abs(local.x)>=4.5||local.y>=7))throw Error('Camera intersects gate structural envelope');
      qa.motionFrames.push({phase:j.phase,phaseElapsedSec:j.phaseElapsedSec,simulationTime:j.elapsedSec,
        recordingTimeSec:ctx.currentTime-qa.start,cameraLocal:local,png:thumb.toDataURL('image/png')});
    },100);
  }
  qa.place=(progress,speed=35,reverse=false)=>{
    const d=app.duel,p=d.course.hiddenRoad.poseAt(progress),angle=p.heading+(reverse?Math.PI:0)-d.course.at(p.s).heading;
    Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,speedMph:speed,
      headingError:Math.atan2(Math.sin(angle),Math.cos(angle)),yawVelocity:0,steerVisual:0,slipAngle:0,
      groundHeight:p.y,airborne:false,airHeight:0,impactTimer:0,pushVelocity:0});
    d.setInput({throttle:0,brake:0,steer:0,boost:false});
  };
  qa.advance=seconds=>{for(let n=0;n<Math.round(seconds*120);n++)app.duel.step(1/120);app.onFrame?.(app.duel.state,seconds);};
  qa.finish=async()=>{
    app.stop();qa.detach();app.onFrame=qa.originalFrame;audio.hiddenRoadVoiceFactory=qa.originalFactory;
    clearInterval(qa.motionTimer);let videoBase64=null;
    if(qa.recorder){qa.recorder.stop();videoBase64=await qa.videoDone;}
    const tracks={};
    for(const [name,record] of Object.entries(qa.tracks)){
      const size=record.chunks.reduce((sum,c)=>sum+c.length,0),all=new Int16Array(size);let offset=0;
      for(const chunk of record.chunks){all.set(chunk,offset);offset+=chunk.length;}
      const bytes=new Uint8Array(all.buffer);let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      tracks[name]={pcmBase64:btoa(binary),frames:size/2,firstPlaybackSec:record.firstPlayback-qa.start,audioStartSec:0};
      for(const source of record.sources)source.disconnect(record.bus);
      record.processor.disconnect();record.bus.disconnect();record.processor.onaudioprocess=null;
    }
    silent.disconnect();return{sampleRate:ctx.sampleRate/3,channels:2,tracks,events:qa.events,cues:qa.cues,frames:qa.frames,
      videoBase64,motionFrames:qa.motionFrames,memoryOnly:true,mixPostLimiter:!!audio.output,
      note:'Real-time production App audio. Vehicle stem taps the actual ducked vehicle bus (engine plus tires and vehicle accents); gate/vehicle stems are pre-limiter at master gain .42. R1 engine-only stem is not directly comparable. Explicit pose fixtures skip the long wash drive.'};
  };
  window.__arrivalQa=qa;
}

async function click(context,text) {
  const point=await context.evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.hidden&&!b.disabled&&b.getBoundingClientRect().width);if(!button)throw Error('Visible button missing: '+${JSON.stringify(text)});const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await context.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await context.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
}

async function imageSheet(context,rows,path,columns,width,height,title) {
  const data=await context.evaluate(`(async()=>{
    const rows=${JSON.stringify(rows)},columns=${columns},w=${width},h=${height};
    const canvas=document.createElement('canvas');canvas.width=columns*w;canvas.height=44+Math.ceil(rows.length/columns)*(h+30);
    const ctx=canvas.getContext('2d');ctx.fillStyle='#111b20';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#f1e5cd';ctx.font='18px sans-serif';ctx.fillText(${JSON.stringify(title)},14,28);
    for(let i=0;i<rows.length;i++){const image=new Image();image.src=rows[i].data;await image.decode();
      const x=i%columns*w,y=44+Math.floor(i/columns)*(h+30),scale=Math.min(w/image.width,h/image.height);
      ctx.drawImage(image,x+(w-image.width*scale)/2,y,image.width*scale,image.height*scale);
      ctx.fillStyle='#eee';ctx.font='15px sans-serif';ctx.fillText(rows[i].label,x+10,y+h+21);
    }return canvas.toDataURL('image/png');})()`);
  await writeFile(path,Buffer.from(data.split(',')[1],'base64'));
}

async function presentationCost() {
  const app=window.__qaApp,render=window.__render,qa=window.__arrivalQa,state=app.duel.state;
  if(!qa.costSnapshot)throw Error('No actual opening snapshot for stationary paired cost');
  const saved=structuredClone(state),rig=render.scene.getObjectByName('Rustwall'),update=rig.userData.updateJourney;
  const hudHook=window.__hiddenRoadUiQa;if(!hudHook)throw Error('QA-only gate HUD hook missing');
  const originalDraw=render.renderer.render;let drawMs=0;
  render.renderer.render=function(...args){const start=performance.now();try{return originalDraw.apply(this,args);}finally{drawMs+=performance.now()-start;}};
  const realRaf=window.requestAnimationFrame.bind(window),dialog=document.querySelector('[data-hidden-road-dialog]');
  try{
  app.stop();Object.assign(state,structuredClone(qa.costSnapshot));app.onFrame?.(state,0);render.renderFrame();
  // Let the outstanding production renderer callback drain, then make exactly
  // one production presentation draw per ordered RAF. No simulation advances.
  window.requestAnimationFrame=()=>0;await new Promise(resolve=>realRaf(resolve));
  const results={};
  for(const enabled of [false,true]){
    hudHook.skipUpdate=!enabled;
    rig.userData.updateJourney=enabled?update:()=>{};
    if(!enabled){const sparks=rig.getObjectByName('Gate guide sparks');if(sparks)sparks.visible=false;dialog.hidden=true;}
    const rows=[];let previous=null;
    for(let i=0;i<132;i++){
      const now=await new Promise(resolve=>realRaf(resolve)),start=performance.now();
      app.onFrame?.(state,0);
      drawMs=0;const stats=render.renderFrame(),cpuMs=performance.now()-start;
      if(i>=12)rows.push({index:i-12,rafMs:now-previous,cpuPresentationMs:cpuMs,cpuRenderMs:drawMs,...stats});previous=now;
    }
    const percentile=(key,f)=>{const values=rows.map(r=>r[key]).sort((a,b)=>a-b);return values[Math.floor((values.length-1)*f)];};
    results[enabled?'enabled':'disabled']={rows,summary:{samples:rows.length,rafP50:percentile('rafMs',.5),rafP95:percentile('rafMs',.95),cpuP50:percentile('cpuPresentationMs',.5),cpuP95:percentile('cpuPresentationMs',.95),cpuRenderP95:percentile('cpuRenderMs',.95),drawCalls:rows.at(-1).drawCalls,triangles:rows.at(-1).triangles},camera:render.camera.position.toArray()};
  }
  return{scope:'Corrected pair: 120 ordered stationary RAF frames per condition after 12 warm-up frames. Identical app.onFrame and ordinary HUD work in both conditions. QA-only hook skips only hiddenRoadUi.update; disabled also removes gate spark update/draw. Same stopped opening pose/camera/scene. CPU includes presentation and render submission, not GPU time. Opening dialog is correctly hidden. No recording/PCM work overlaps.',...results};
  }finally{
    hudHook.skipUpdate=false;render.renderer.render=originalDraw;rig.userData.updateJourney=update;
    window.requestAnimationFrame=realRaf;Object.assign(state,saved);app.onFrame?.(state,0);render.renderFrame();
  }
}

async function key(context,code,keyValue,number) {
  for(const type of ['keyDown','keyUp'])await context.command('Input.dispatchKeyEvent',
    {type,code,key:keyValue,windowsVirtualKeyCode:number});
}

function spectralSvg(track,cues) {
  const width=1000,height=340,columns=180,bands=48,n=512,cells=[];
  for(let x=0;x<columns;x++){
    const start=Math.floor(x/columns*track.left.length);
    for(let band=0;band<bands;band++){
      const freq=45*Math.pow(70,band/(bands-1)),k=Math.round(freq*n/track.sampleRate),coefficient=2*Math.cos(2*Math.PI*k/n);
      let a=0,b=0;
      for(let i=0;i<n;i++){const v=(track.left[start+i]||0)*(.5-.5*Math.cos(2*Math.PI*i/(n-1)))+coefficient*a-b;b=a;a=v;}
      const magnitude=Math.sqrt(Math.max(0,a*a+b*b-coefficient*a*b))/n;
      const level=Math.max(0,Math.min(1,(20*Math.log10(Math.max(1e-8,magnitude))+80)/65));
      cells.push(`<rect x="${40+x*920/columns}" y="${25+(bands-1-band)*270/bands}" width="${920/columns+.2}" height="${270/bands+.2}" fill="rgb(${Math.round(15+230*level)},${Math.round(22+142*level)},${Math.round(35+20*level)})"/>`);
    }
  }
  const marks=cues.map(c=>`<line x1="${40+c.audioTimeSec/track.durationSec*920}" x2="${40+c.audioTimeSec/track.durationSec*920}" y1="25" y2="295" stroke="#f3d989" opacity=".35"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#101820"/><text x="40" y="18" fill="white" font-family="sans-serif">Gate stem spectrogram · 45–3150 Hz · lines mark actual cue dispatch</text>${cells.join('')}${marks}<text x="40" y="322" fill="white" font-family="sans-serif">0 to ${track.durationSec.toFixed(2)} seconds · actual recorded PCM</text></svg>`;
}

async function saveAudio(context,directory,quality,recording) {
  const decoded={},tracks={};
  for(const [name,entry] of Object.entries(recording.tracks)){
    const wav=wavFromPcm(Buffer.from(entry.pcmBase64,'base64'),recording.sampleRate,recording.channels);
    const file=`${quality}-${name}.wav`;await writeFile(join(directory,file),wav);
    decoded[name]=decodeWav(wav);tracks[name]={file,sha256:sha(wav),frames:entry.frames,firstPlaybackSec:entry.firstPlaybackSec};
  }
  const {tracks:raw,videoBase64,motionFrames,...metadata}=recording;
  const metrics=Object.fromEntries(Object.entries(decoded).map(([name,track])=>{
    let peak=0;for(const channel of [track.left,track.right])for(const value of channel)peak=Math.max(peak,Math.abs(value));
    return[name,{peak,peakDb:20*Math.log10(Math.max(1e-9,peak)),rms:rms(track,0,track.durationSec),durationSec:track.durationSec}];
  }));
  const onsets=recording.cues.filter((cue,i,rows)=>i===0||cue.audioTimeSec-rows[i-1].audioTimeSec>.25)
    .map(cue=>({...cue,onsetOffsetSec:detectOnset(decoded.gate,cue.audioTimeSec,.12)}));
  const loudness=[];
  for(let t=0;t<decoded.mix.durationSec;t+=.4)loudness.push({timeSec:t,...Object.fromEntries(Object.entries(decoded).map(([name,track])=>[name,20*Math.log10(Math.max(1e-9,rms(track,t,.4)))]))});
  const colors={mix:'#fff',vehicle:'#6bd4ee',gate:'#f5ba63'};
  const paths=Object.keys(colors).map(name=>`<polyline fill="none" stroke="${colors[name]}" points="${loudness.map(row=>`${40+row.timeSec/decoded.mix.durationSec*920},${25+Math.min(80,Math.max(0,-row[name]))/80*270}`).join(' ')}"/>`).join('');
  const plots={loudness:`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="340"><rect width="100%" height="100%" fill="#101820"/><text x="40" y="18" fill="white" font-family="sans-serif">400 ms RMS · white mix · blue vehicle bus · amber gate · 0 to -80 dBFS</text>${paths}</svg>`,
    spectrogram:spectralSvg(decoded.gate,recording.cues)};
  for(const [name,svg] of Object.entries(plots)){
    await writeFile(join(directory,`${quality}-${name}.svg`),svg);
    const png=await context.evaluate(`(async()=>{const image=new Image();image.src='data:image/svg+xml;base64,'+${JSON.stringify(Buffer.from(svg).toString('base64'))};await image.decode();const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=340;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png');})()`);
    await writeFile(join(directory,`${quality}-${name}.png`),Buffer.from(png.split(',')[1],'base64'));
  }
  const summary={...metadata,tracks,metrics,onsets,loudness400ms:loudness,
    scope:'Actual gate sequence, not a whole-race engine/combat sound acceptance. Onsets exclude overlapping cue tails. No subjective listening claim.'};
  await writeFile(join(directory,`${quality}-audio.json`),JSON.stringify(summary,null,2)+'\n');
  if(metrics.mix.peak>Math.pow(10,-1/20)||metrics.gate.rms<.0001)throw Error('Gate capture clipped or silent');
  return{tracks,metrics,cues:recording.cues.length,events:recording.events.length,onsets};
}

async function runMotionSupplement(context,round) {
  const directory=join(ROOT,`docs/board/looks/hidden-road-arrival/round-${round}/motion-supplement`);
  try{await access(join(directory,'report.json'));throw Error('Completed supplement is immutable');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(directory,{recursive:true});
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=hidden-road');
  await context.waitFor('!!window.__qaApp?.visualReady&&!!window.__render','private supplement UI',60000);
  await context.evaluate(`(()=>{const a=window.__qaApp;a.setGraphicsQuality('high');a.startCampaign({mode:'duel',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});a.stop();Object.assign(a.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});document.querySelectorAll('details').forEach(n=>n.style.display='none');a.onFrame?.(a.duel.state);window.__render.renderFrame();})()`);
  await context.waitFor(READY,'supplement gate asset',60000);
  await context.evaluate(`(async()=>{const a=window.__qaApp.audio;a.unlock();a.setMuted(false);await Promise.all([a._samplesPromise,a._ambiencePromise]);})()`);
  await context.evaluate(`(${installCapture.toString()})(${round},'high')`);
  await context.evaluate(`(()=>{const q=window.__arrivalQa,a=window.__qaApp;q.place(149.9,35);q.advance(.1);q.place(a.duel.course.hiddenRoad.length-59.5,45);a.start();})()`);
  await context.waitFor('window.__qaApp.duel.state.hiddenRoadJourney.choiceReady','supplement gate choice',20000);
  await click(context,'Enter the Wasteland');
  await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='arrived'&&window.__qaApp.duel.state.hiddenRoadJourney.phaseElapsedSec>1.65",'supplement inside orbit',10000);
  const recording=await context.evaluate('window.__arrivalQa.finish()');
  if(!recording.videoBase64||recording.motionFrames.length<8)throw Error('Continuous motion evidence missing');
  const video=Buffer.from(recording.videoBase64,'base64');
  await writeFile(join(directory,'high-gate-enter-canvas.webm'),video);
  await imageSheet(context,recording.motionFrames.map(f=>({label:`${f.recordingTimeSec.toFixed(2)}s · ${f.phase} +${f.phaseElapsedSec.toFixed(2)}s`,data:f.png})),join(directory,'high-motion-strip.png'),3,480,270,
    'Continuous gate / Enter recording · canvas only; DOM dialog excluded');
  const report={commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    note:'Only the missing continuous High motion capture and settled legacy HUD view. Original R2 stills, PCM, cost and failed legacy camera image remain unchanged. WebM excludes the DOM dialog. No cost or audio acceptance rerun.',
    video:{path:'high-gate-enter-canvas.webm',sha256:sha(video)},frames:recording.motionFrames.map(({png,...f})=>f)};
  await context.evaluate(`(()=>{const a=window.__qaApp;a.requestNavigation('menu');a.startCampaign({mode:'wasteland',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});a.stop();Object.assign(a.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});a.onFrame?.(a.duel.state);window.__render.renderFrame();})()`);
  await context.waitFor(READY,'settled legacy scene',60000);
  await context.evaluate(`(()=>{const q=window.__arrivalQa;q.place(149.9,35);q.advance(.1);q.advance(1.3);})()`);
  await pause(600);
  report.legacy=await context.evaluate(`(()=>{const a=window.__qaApp,strip=document.querySelector('.weapon-hud'),r={hiddenRoad:a.duel.featureFlags.enabled('hidden-road'),wasteland2:a.duel.featureFlags.enabled('wasteland2'),opacity:Number(getComputedStyle(strip).opacity)};if(!r.hiddenRoad||r.wasteland2||r.opacity>.01)throw Error('Legacy HUD fade failed');return r;})()`);
  const shot=await context.screenshot('legacy-mad-max-departure-settled');
  await writeFile(join(directory,'legacy-mad-max-departure-settled.png'),await readFile(shot));
  await writeFile(join(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('Bounded R2 motion and settled legacy supplement retained.');
}

async function runCostRefinement(context,round){
  const corrected=process.env.EGG_ARRIVAL_CORRECTED==='1';
  if(!corrected)await runMotionSupplement(context,round);
  const relative=`docs/board/looks/hidden-road-arrival/round-${round}${corrected?'/final-correction':''}`;
  const directory=join(ROOT,relative),results={
    commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    audioReuse:'Round 2 audio source and assets are unchanged; reuse its PCM/plots, with no new listening claim.',captures:[]};
  try{await access(join(directory,'cost-and-captures.json'));throw Error('Completed cost evidence is immutable');}catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(directory,{recursive:true});
  async function shot(name){const path=await context.screenshot(name),bytes=await readFile(path);await writeFile(join(directory,`${name}.png`),bytes);results.captures.push({name,path:`${relative}/${name}.png`,sha256:sha(bytes)});}
  for(const quality of ['high','performance']){
    await context.navigate('/tools/menu-check.html?flags=hidden-road');
    await context.waitFor('!!window.__qaApp?.visualReady&&!!window.__render','cost refinement UI',60000);
    await context.evaluate(`(()=>{const a=window.__qaApp;a.setGraphicsQuality(${JSON.stringify(quality)});a.startCampaign({mode:'duel',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});a.stop();a.audio.setMuted(true);Object.assign(a.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});document.querySelectorAll('details').forEach(n=>n.style.display='none');a.onFrame?.(a.duel.state);window.__render.renderFrame();})()`);
    await context.waitFor(READY,'cost refinement gate asset',60000);
    await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state;const place=(progress,speed)=>{const p=d.course.hiddenRoad.poseAt(progress);Object.assign(s,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,speedMph:speed,headingError:p.heading-d.course.at(p.s).heading,groundHeight:p.y,yawVelocity:0,airHeight:0,airborne:false,pushVelocity:0});d.setInput({throttle:0,brake:0,steer:0});};place(149.9,35);for(let i=0;i<12;i++)d.step(1/120);place(d.course.hiddenRoad.length-59.5,45);let i=0,earlyArrival=null;while(!(s.hiddenRoadJourney.phase==='opening'&&s.hiddenRoadJourney.phaseElapsedSec>.75)&&i++<1600){d.step(1/120);if(!earlyArrival&&s.hiddenRoadJourney.phase==='arriving')earlyArrival=structuredClone(s);}if(i>=1600)throw Error('Opening cost fixture failed');window.__arrivalQa={costSnapshot:structuredClone(s),earlyArrival};a.onFrame?.(s,0);window.__render.renderFrame();})()`);
    await shot(`${quality}-opening-refined`);
    results[quality]=await context.evaluate(`(${presentationCost.toString()})()`);
    if(corrected&&quality==='high'){
      results.transitions=await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state,q=window.__arrivalQa,opening=structuredClone(s);const snap=()=>{a.onFrame?.(s,0);window.__render.renderFrame();return{phase:s.hiddenRoadJourney.phase,time:s.hiddenRoadJourney.phaseElapsedSec,camera:window.__render.camera.position.toArray(),car:d.course.worldAt(s.s,s.lateral)};};Object.assign(s,q.earlyArrival);const arrival=snap();Object.assign(s,opening);while(s.hiddenRoadJourney.phase!=='choice')d.step(1/120);a.chooseHiddenRoad('turn-back');d.step(1/120);while(s.hiddenRoadJourney.phaseElapsedSec<.79)d.step(1/120);const before=snap();d.step(1/60);const after=snap();const gap=Math.hypot(...before.camera.map((v,i)=>v-after.camera[i]));if(gap>.5)throw Error('Turn-back camera jumped at blend boundary');return{arrival,before,after,gap};})()`);
      await shot('high-turn-back-transition');
      await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state;Object.assign(s,window.__arrivalQa.earlyArrival);a.onFrame?.(s,0);window.__render.renderFrame();})()`);
      await shot('high-arrival-transition');
    }
  }
  await writeFile(join(directory,'cost-and-captures.json'),JSON.stringify(results,null,2)+'\n');
  const rows=await Promise.all(results.captures.map(async row=>({label:row.name,data:'data:image/png;base64,'+(await readFile(join(ROOT,row.path))).toString('base64')})));
  if(!corrected)rows.push({label:'Legacy Mad Max — actual spur camera',data:'data:image/png;base64,'+(await readFile(join(directory,'motion-supplement/legacy-mad-max-departure-settled.png'))).toString('base64')});
  await imageSheet(context,rows,corrected?join(directory,'contact-sheet.png'):join(ROOT,`docs/board/looks/hidden-road-arrival/round-${round}.png`),3,480,270,'Arrival refinement · actual presentation and spur camera');
  console.log(`Bounded round ${round} presentation/camera refinement retained; round 2 audio reused.`);
}

export async function run(context) {
  const round=Number(process.env.EGG_ARRIVAL_ROUND||1);
  if(process.env.EGG_ARRIVAL_COST_ONLY==='1')return runCostRefinement(context,round);
  if(process.env.EGG_ARRIVAL_SUPPLEMENT==='1')return runMotionSupplement(context,round);
  if(![1,2,3,4,5].includes(round))throw Error('Arrival refinement round must be1..5');
  const relative=`docs/board/looks/hidden-road-arrival/round-${round}`,directory=join(ROOT,relative);
  try{await access(join(directory,'captures.json'));throw Error('Completed arrival evidence is immutable');}
  catch(error){if(error.code!=='ENOENT')throw error;}
  await mkdir(directory,{recursive:true});
  const evidence={round,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim(),
    captures:[],audio:{},controls:[],scope:'One private memory-only scenario. Three named pose fixtures shorten the otherwise unchanged approach. Production simulation, UI and audio run the cinematic.'};
  async function capture(name,quality) {
    const state=await context.evaluate('structuredClone(window.__qaApp.duel.state.hiddenRoadJourney)');
    const path=await context.screenshot(name),bytes=await readFile(path),target=join(directory,`${name}.png`);
    await writeFile(target,bytes);evidence.captures.push({name,quality,path:`${relative}/${name}.png`,sha256:sha(bytes),journey:state});
  }
  for(const quality of ['high','performance']){
    await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
    await context.navigate('/tools/menu-check.html?flags=hidden-road');
    await context.waitFor('!!window.__qaApp?.visualReady&&!!window.__render','private arrival UI',60000);
    await context.evaluate(`(() => {const app=window.__qaApp;app.setGraphicsQuality(${JSON.stringify(quality)});app.startCampaign({mode:'duel',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});app.stop();Object.assign(app.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});document.querySelectorAll('details').forEach(n=>n.style.display='none');app.onFrame?.(app.duel.state);window.__render.renderFrame();})()`);
    await context.waitFor(READY,'loaded gate model',60000);
    await context.evaluate(`(async()=>{const a=window.__qaApp.audio;a.unlock();a.setMuted(false);await Promise.all([a._samplesPromise,a._ambiencePromise]);})()`);
    await context.evaluate(`(${installCapture.toString()})(${round},${JSON.stringify(quality)})`);
    const controls=await context.evaluate(`(() => {const q=window.__arrivalQa,a=window.__qaApp,d=a.duel;q.place(100,25,true);q.advance(.5);if(d.state.status!=='racing'||d.state.hiddenRoadJourney.departed)throw Error('Before-departure return failed');const beforeReturn={status:d.state.status,progress:d.state.hiddenRoadJourney.progress};q.place(149.9,35);q.advance(.1);if(d.state.status!=='exploring')throw Error('Departure fixture did not cross');q.place(d.course.hiddenRoad.length-59.5,45);a.start();return{beforeReturn,fixtures:[100,149.9,d.course.hiddenRoad.length-59.5]};})()`);
    evidence.controls.push({quality,...controls});
    await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='arriving'",'arrival braking',10000);
    await capture(`${quality}-arriving`,quality);
    await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='opening'&&window.__qaApp.duel.state.hiddenRoadJourney.phaseElapsedSec>.7",'opening gate',15000);
    await capture(`${quality}-opening`,quality);
    await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.choiceReady",'gate invitation',10000);
    await capture(`${quality}-choice`,quality);
    if(quality==='high'){
      await key(context,'Escape','Escape',27);
      await context.waitFor('window.__qaApp.duel.state.paused','cinematic pause',3000);
      const frozen=await context.evaluate('window.__qaApp.duel.state.hiddenRoadJourney.elapsedSec');await pause(300);
      if(await context.evaluate('window.__qaApp.duel.state.hiddenRoadJourney.elapsedSec')!==frozen)throw Error('Paused journey clock advanced');
      await capture('high-paused','high');await key(context,'Escape','Escape',27);
      await context.waitFor('!window.__qaApp.duel.state.paused','cinematic resume',3000);
      await context.command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await pause(120);
      await capture('phone-choice','high');
      await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
      await click(context,'Enter the Wasteland');
      await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='arrived'&&window.__qaApp.duel.state.hiddenRoadJourney.phaseElapsedSec>1.4",'inside gate hold',8000);
      await capture('high-arrived','high');
    }else{
      await click(context,'Turn back');
      await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='turned-back'",'outside driving restored',3000);
      await capture('performance-turned-back','performance');
    }
    await pause(250);
    const recording=await context.evaluate('window.__arrivalQa.finish()');
    evidence.audio[quality]=await saveAudio(context,directory,quality,recording);
    if(recording.videoBase64){
      await writeFile(join(directory,'high-gate-enter-canvas.webm'),Buffer.from(recording.videoBase64,'base64'));
      const frames=recording.motionFrames;
      await imageSheet(context,frames.map(f=>({label:`${f.recordingTimeSec.toFixed(2)}s · ${f.phase} +${f.phaseElapsedSec.toFixed(2)}s`,data:f.png})),join(directory,'high-motion-strip.png'),3,480,270,
        'Continuous gate / Enter recording · canvas only; DOM dialog excluded');
      await writeFile(join(directory,'high-motion.json'),JSON.stringify({note:'Frames sampled during the same continuous canvas WebM; DOM dialog is excluded.',frames:frames.map(({png,...f})=>f)},null,2)+'\n');
    }
    if(round>=2)evidence[`${quality}PresentationCost`]=await context.evaluate(`(${presentationCost.toString()})()`);
    await context.evaluate("window.__qaApp.requestNavigation('menu');window.__qaApp.onFrame?.(window.__qaApp.duel.state)");
    await context.waitFor("window.__qaApp.duel.state.status==='menu'",'navigation cleanup',3000);
    const cleaned=await context.evaluate("!window.__qaApp.duel.state.hiddenRoadJourney&&[...document.querySelectorAll('[data-hidden-road-dialog]')].every(n=>n.hidden)");
    if(!cleaned)throw Error('Journey UI survived navigation');
    evidence.controls.push({quality,navigationClean:true});
    if(round>=2&&quality==='high'){
      await context.evaluate(`(()=>{const a=window.__qaApp;a.startCampaign({mode:'wasteland',startStage:0,seed:1989,car:'falcone_f42',difficulty:'casual'});a.stop();Object.assign(a.duel.state,{status:'racing',paused:false,countdown:0,traffic:[],opponents:[],rival:null});a.onFrame?.(a.duel.state);window.__render.renderFrame();})()`);
      await context.waitFor(READY,'legacy Mad Max departure scene',60000);
      const legacy=await context.evaluate(`(()=>{const a=window.__qaApp,q=window.__arrivalQa;q.place(149.9,35);q.advance(.1);q.advance(1.3);a.onFrame?.(a.duel.state);window.__render.renderFrame();const strip=document.querySelector('.weapon-hud');const result={hiddenRoad:a.duel.featureFlags.enabled('hidden-road'),wasteland2:a.duel.featureFlags.enabled('wasteland2'),phase:a.duel.state.hiddenRoadJourney.phase,opacity:Number(getComputedStyle(strip).opacity)};if(!result.hiddenRoad||result.wasteland2||result.opacity>.01)throw Error('Legacy combat strip did not fade with departure');return result;})()`);
      await capture('legacy-mad-max-departure','high');evidence.controls.push({legacyMadMax:legacy});
      await context.evaluate("window.__qaApp.requestNavigation('menu');window.__qaApp.onFrame?.(window.__qaApp.duel.state)");
    }
  }
  await writeFile(join(directory,'captures.json'),JSON.stringify(evidence,null,2)+'\n');
  for(const sheetRound of round===2?[1,2]:[round]){
    const folder=join(ROOT,`docs/board/looks/hidden-road-arrival/round-${sheetRound}`),report=JSON.parse(await readFile(join(folder,'captures.json'),'utf8'));
    const rows=await Promise.all(report.captures.map(async row=>({label:row.name,data:'data:image/png;base64,'+(await readFile(join(ROOT,row.path))).toString('base64')})));
    await imageSheet(context,rows,join(ROOT,`docs/board/looks/hidden-road-arrival/round-${sheetRound}.png`),3,480,270,`Hidden road arrival · round ${sheetRound} · actual browser captures`);
  }
  console.log(`Hidden Road arrival round${round}: ${evidence.captures.length} images and two real-time PCM recordings retained in ${relative}`);
}
