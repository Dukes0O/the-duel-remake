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
function installCapture() {
  const app=window.__qaApp, audio=app.audio, ctx=audio.context;
  if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value||
      !window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage is required');
  const qa={events:[],frames:[],cues:[],tracks:{},start:ctx.currentTime,originalFrame:app.onFrame,
    originalFactory:audio.hiddenRoadVoiceFactory,quality:app.graphicsQuality};
  const silent=ctx.createGain();silent.gain.value=0;silent.connect(ctx.destination);qa.silent=silent;
  for(const name of ['mix','engine','gate']) {
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
  tap('mix',audio.output||audio.master);tap('gate',audio.hiddenRoadBus);tap('engine',audio.engineGain);
  for(const key of ['idle','loadLow','loadMid','loadHigh','coast','engine']){
    const layer=audio.samples[key];for(const node of [layer?.gain,layer?.body?.gain,layer?.intake?.gain])tap('engine',node);
  }
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
  };
  qa.place=(progress,speed=35,reverse=false)=>{
    const d=app.duel,p=d.course.hiddenRoad.poseAt(progress),angle=p.heading+(reverse?Math.PI:0)-d.course.at(p.s).heading;
    Object.assign(d.state,{s:p.s,prevS:p.s,lateral:p.lateral,prevLateral:p.lateral,speedMph:speed,
      headingError:Math.atan2(Math.sin(angle),Math.cos(angle)),yawVelocity:0,steerVisual:0,slipAngle:0,
      groundHeight:p.y,airborne:false,airHeight:0,impactTimer:0,pushVelocity:0});
    d.setInput({throttle:0,brake:0,steer:0,boost:false});
  };
  qa.advance=seconds=>{for(let n=0;n<Math.round(seconds*120);n++)app.duel.step(1/120);app.onFrame?.(app.duel.state,seconds);};
  qa.finish=()=>{
    app.stop();qa.detach();app.onFrame=qa.originalFrame;audio.hiddenRoadVoiceFactory=qa.originalFactory;
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
      memoryOnly:true,mixPostLimiter:!!audio.output,note:'Real-time production App audio; gate/engine stems are pre-limiter at master gain .42. Explicit pose fixtures skip the long wash drive.'};
  };
  window.__arrivalQa=qa;
}

async function click(context,text) {
  const point=await context.evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.hidden&&!b.disabled&&b.getBoundingClientRect().width);if(!button)throw Error('Visible button missing: '+${JSON.stringify(text)});const r=button.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  await context.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});
  await context.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
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
  const {tracks:raw,...metadata}=recording;
  const metrics=Object.fromEntries(Object.entries(decoded).map(([name,track])=>{
    let peak=0;for(const channel of [track.left,track.right])for(const value of channel)peak=Math.max(peak,Math.abs(value));
    return[name,{peak,peakDb:20*Math.log10(Math.max(1e-9,peak)),rms:rms(track,0,track.durationSec),durationSec:track.durationSec}];
  }));
  const onsets=recording.cues.filter((cue,i,rows)=>i===0||cue.audioTimeSec-rows[i-1].audioTimeSec>.25)
    .map(cue=>({...cue,onsetOffsetSec:detectOnset(decoded.gate,cue.audioTimeSec,.12)}));
  const loudness=[];
  for(let t=0;t<decoded.mix.durationSec;t+=.4)loudness.push({timeSec:t,...Object.fromEntries(Object.entries(decoded).map(([name,track])=>[name,20*Math.log10(Math.max(1e-9,rms(track,t,.4)))]))});
  const colors={mix:'#fff',engine:'#6bd4ee',gate:'#f5ba63'};
  const paths=Object.keys(colors).map(name=>`<polyline fill="none" stroke="${colors[name]}" points="${loudness.map(row=>`${40+row.timeSec/decoded.mix.durationSec*920},${25+Math.min(80,Math.max(0,-row[name]))/80*270}`).join(' ')}"/>`).join('');
  const plots={loudness:`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="340"><rect width="100%" height="100%" fill="#101820"/><text x="40" y="18" fill="white" font-family="sans-serif">400 ms RMS · white mix · blue engine · amber gate · 0 to -80 dBFS</text>${paths}</svg>`,
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

export async function run(context) {
  const round=Number(process.env.EGG_ARRIVAL_ROUND||1);
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
    await context.evaluate(`(${installCapture.toString()})()`);
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
      await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='arrived'",'inside gate hold',8000);
      await capture('high-arrived','high');
    }else{
      await click(context,'Turn back');
      await context.waitFor("window.__qaApp.duel.state.hiddenRoadJourney.phase==='turned-back'",'outside driving restored',3000);
      await capture('performance-turned-back','performance');
    }
    await pause(250);
    const recording=await context.evaluate('window.__arrivalQa.finish()');
    evidence.audio[quality]=await saveAudio(context,directory,quality,recording);
    await context.evaluate("window.__qaApp.requestNavigation('menu');window.__qaApp.onFrame?.(window.__qaApp.duel.state)");
    await context.waitFor("window.__qaApp.duel.state.status==='menu'",'navigation cleanup',3000);
    const cleaned=await context.evaluate("!window.__qaApp.duel.state.hiddenRoadJourney&&[...document.querySelectorAll('[data-hidden-road-dialog]')].every(n=>n.hidden)");
    if(!cleaned)throw Error('Journey UI survived navigation');
    evidence.controls.push({quality,navigationClean:true});
  }
  await writeFile(join(directory,'captures.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(`Hidden Road arrival round${round}: ${evidence.captures.length} images and two real-time PCM recordings retained in ${relative}`);
}
