import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contactFixture} from './warlord-reward.mjs';

// QA only: native AudioWorklet meters read the final runtime output. Float32
// samples are transferred unchanged; values outside [-1,1] are never clipped.
async function captureNative(contactSource) {
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  const old = window.__qaApp;
  old.stop(); old.audio.setPaused(true);
  const app = new old.constructor(); window.__qaApp = app;
  const audio = app.audio;
  const edges = [], connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...rest) {
    edges.push([this, destination]); return connect.call(this, destination, ...rest);
  };
  try {audio.unlock();} finally {AudioNode.prototype.connect = connect;}
  audio.setMuted(false); audio.setPaused(false);
  await audio.context.resume();
  await Promise.all([audio._samplesPromise, audio._ambiencePromise]);
  if (audio.sampleStatus !== 'ready' || audio.ambienceStatus !== 'ready')
    throw Error('Actual runtime audio samples were not decoded.');
  const context = audio.context;
  const reach = (start, end, omit) => {
    const seen = new Set(), queue = [start];
    while (queue.length) {
      const node = queue.shift();
      if (node === omit || seen.has(node)) continue;
      if (node === end) return true;
      seen.add(node);
      for (const [a,b] of edges) if (a === node) queue.push(b);
    }
    return false;
  };
  const graph = {
    finalOutputIsNode: audio.output instanceof AudioNode,
    masterReachesFinal: reach(audio.master, audio.output),
    finalReachesDestination: reach(audio.output, context.destination),
    noUnmeteredMasterBypass: !reach(audio.master, context.destination, audio.output),
    nativeContext: context instanceof AudioContext,
  };
  const worklet = `class PeakMeter extends AudioWorkletProcessor {
    constructor(){super();this.data=new Float32Array(4096);this.at=0;this.first=0;}
    process(inputs){
      const channels=inputs[0]||[],left=channels[0],right=channels[1]||left;
      for(let i=0;i<128;i++){
        if(this.at===0)this.first=currentFrame+i;
        this.data[this.at++]=left?.[i]||0;this.data[this.at++]=right?.[i]||0;
        if(this.at===this.data.length){
          this.port.postMessage({frame:this.first,pcm:this.data},[this.data.buffer]);
          this.data=new Float32Array(4096);this.at=0;
        }
      }return true;
    }
  } registerProcessor('duel-crash-peak-meter',PeakMeter);`;
  const url = URL.createObjectURL(new Blob([worklet], {type:'text/javascript'}));
  try {await context.audioWorklet.addModule(url);} finally {URL.revokeObjectURL(url);}
  function meter(node) {
    const chunks = [], tap = new AudioWorkletNode(context, 'duel-crash-peak-meter',
      {numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]}), silent=context.createGain();
    silent.gain.value=0; tap.connect(silent);silent.connect(context.destination);
    tap.port.onmessage = event => chunks.push(event.data);
    node.connect(tap);
    return {chunks, stop(){node.disconnect(tap);tap.disconnect();silent.disconnect();tap.port.close();}};
  }
  function encode(chunks, began) {
    const first=chunks[0]?.frame ?? 0;
    const length=chunks.reduce((sum,c)=>sum+c.pcm.length,0),pcm=new Float32Array(length);
    let at=0;
    for(const chunk of chunks){pcm.set(chunk.pcm,at);at+=chunk.pcm.length;}
    const bytes=new Uint8Array(pcm.buffer);let binary='';
    for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
    return {pcmBase64:btoa(binary),frames:length/2,audioStartSec:first/context.sampleRate-began,
      firstFrame:first,contiguous:chunks.every((c,i)=>!i||c.frame===chunks[i-1].frame+2048)};
  }
  const events=[],cues=[];
  const originalPlay=audio._playCue;
  audio._playCue=function(id,...args){cues.push({id,time:context.currentTime});return originalPlay.call(this,id,...args);};
  const detach=app.duel.onChange((state,event)=>{
    for(const kind of ['vehicleSmash','fuelPickup','fuelDrop','fuelDelivery','weaponFired'])
      if(event[kind]!=null)events.push({kind,time:context.currentTime,payload:structuredClone(event[kind]),source:'native-simulation'});
  });
  const rows=[];
  app.profile.wasteland.discoveredGate=true;
  app.profile.wasteland.rank=6;app.profile.wasteland.xp=3500;
  if(!app._saveProfile()||!app.visitWasteland())throw Error('Memory-only discovered yard failed.');
  app.advance(8);
  if(!app.isYardHomeActive())throw Error('Actual yard entry failed.');
  const contact=eval('('+contactSource+')');
  for(const name of ['non-fuel-contact','fuel-contact','six-blast-overlap']){
    app.stop();
    if(!app.isYardHomeActive()){
      if(!app.visitWasteland())throw Error('Memory-only yard reentry failed.');
      app.advance(8);
    }
    if(!app.startArenaEvent({mode:name==='fuel-contact'?'fuel-run':'last-car-rolling',opponents:3}))
      throw Error('Actual arena event start failed: '+name);
    app.advance(3.1);app.stop();
    const state=app.duel.state;
    state.combat.aiTimer=state.combat.pickupTimer=Infinity;
    for(const part of state.arena.participants)if(part.id!=='player'){
      const car=state.opponents.find(a=>a.arenaId===part.id);
      car.combatWrecking=true;car.combatWreckTimer=100000;part.wreckCounted=true;
    }
    const place=name==='fuel-contact'?state.arena.fuelRun.pads[0]:{s:79.8,lateral:-6};
    Object.assign(state,{s:place.s,prevS:place.s,lateral:place.lateral,prevLateral:place.lateral,
      speedMph:45,headingError:0,yawVelocity:0,pushVelocity:0,knock:null,tumble:null,
      airborne:false,airHeight:0,groundHeight:null,armor:1000,maxArmor:1000,invulnerableSec:0});
    app.keys.KeyW=true;app.autopilot=false;app._scriptedCrashDone=true;
    app.start();await sleep(700);app.stop();await sleep(250);
    const began=context.currentTime,tracks={mix:meter(audio.output),engine:meter(audio.buses.engine),
      impacts:meter(audio.buses.impacts)};
    let struck=false,contactAt=null,physical=null,stressAt=null;
    const frames=[];
    app.onFrame=()=>{
      frames.push({time:context.currentTime-began,throttle:state.input.throttle,revs:state.revs,speedMph:state.speedMph});
      if(struck||context.currentTime-began<1)return;
      struck=true;contactAt=context.currentTime;
      if(name==='fuel-contact'&&!state.arena.participants.find(p=>p.id==='player').fuelCanisterId)
        throw Error('Native Fuel pickup did not produce a carrier before contact.');
      const beforeEvents=events.length;
      physical=contact(null,60);
      physical.events=events.slice(beforeEvents);
      if(name==='six-blast-overlap'){
        stressAt=context.currentTime;
        for(let i=0;i<6;i++)audio.event({combatExplosion:true,qaStress:true,qaSide:0,qaDistance:0},state,app.duel.course);
        if(!app.duel.fireWeapon('crossbow'))throw Error('Actual stress weapon launch failed.');
      }
    };
    app.start();await sleep(3200);app.stop();app.onFrame=null;
    for(const track of Object.values(tracks))track.stop();
    await sleep(40);
    rows.push({name,began,contactAt:contactAt-began,stressAt:stressAt==null?null:stressAt-began,
      physical,frames,events:events.filter(e=>e.time>=began).map(e=>({...e,time:e.time-began})),
      cues:cues.filter(e=>e.time>=began).map(e=>({...e,time:e.time-began})),
      tracks:Object.fromEntries(Object.entries(tracks).map(([key,t])=>[key,encode(t.chunks,began)]))});
    app.returnToMenu();
  }
  // Native safe-signal reference: quiet, known audio goes through the complete
  // graph, with no engine updates and no guessed limiter API.
  const quiet = new audio.constructor({flags:audio.flags});
  quiet.muted=false;quiet._build(new AudioContext({sampleRate:context.sampleRate}));
  await quiet.context.resume();await Promise.all([quiet._samplesPromise,quiet._ambiencePromise]);
  const qctx=quiet.context,qurl=URL.createObjectURL(new Blob([worklet],{type:'text/javascript'}));
  try{await qctx.audioWorklet.addModule(qurl);}finally{URL.revokeObjectURL(qurl);}
  const qchunks=[],referenceChunks=[],tap=new AudioWorkletNode(qctx,'duel-crash-peak-meter',
    {numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]}),silent=qctx.createGain();
  silent.gain.value=0;tap.connect(silent);silent.connect(qctx.destination);
  tap.port.onmessage=e=>qchunks.push(e.data);quiet.output.connect(tap);
  const tone=qctx.createOscillator(),level=qctx.createGain();
  tone.frequency.value=997;level.gain.value=.01;tone.connect(level);level.connect(quiet.master);
  // Released a6523ea output reference, rendered by the same native context.
  // It is a behavior baseline, not a required repair topology or limiter API.
  const referenceMaster=qctx.createGain(),referenceOutput=qctx.createDynamicsCompressor();
  referenceMaster.gain.value=.42;referenceOutput.threshold.value=-18;
  referenceOutput.knee.value=16;referenceOutput.ratio.value=4;
  level.connect(referenceMaster);referenceMaster.connect(referenceOutput);
  const referenceTap=new AudioWorkletNode(qctx,'duel-crash-peak-meter',
    {numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
  referenceOutput.connect(referenceTap);referenceTap.connect(silent);
  referenceTap.port.onmessage=e=>referenceChunks.push(e.data);
  const qbegan=qctx.currentTime;tone.start();await sleep(1100);tone.stop();
  quiet.output.disconnect(tap);tap.disconnect();silent.disconnect();tap.port.close();await sleep(40);
  referenceOutput.disconnect();referenceTap.disconnect();referenceTap.port.close();
  const quietTrack=encode(qchunks,qbegan),referenceTrack=encode(referenceChunks,qbegan);await qctx.close();
  // The actual pause API fades the complete output and clears owned voices.
  const pausedStart=context.currentTime,paused=meter(audio.output);
  audio.setPaused(true);await sleep(350);paused.stop();await sleep(40);
  const cleanup={paused:audio.paused,projectileVoices:audio.projectileVoices.size,
    mixerVoices:[...audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0),hiddenRoadVoices:audio.hiddenRoadVoices.size,
    track:encode(paused.chunks,pausedStart)};
  detach();audio._playCue=originalPlay;app.dispose();await sleep(50);
  cleanup.contextClosed=context.state==='closed';
  return {schema:1,sampleRate:context.sampleRate,channels:2,memoryOnlySaves:
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
    !!window.__qaMemoryBackupStore,nativeContext:graph.nativeContext,graph,rows,
    quiet:{inputPeak:.01,baselineSource:'a6523ea086c8354a236f942509a48871026fee08',
      track:quietTrack,referenceTrack},cleanup,
    limitations:['No human ratings or listening claim','Space, variety and loop seams not measured',
      'Six-blast overlap is a marked QA audio stress dispatch; car contacts and Fuel events are native']};
}

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=fuel-run');
  await context.waitFor("!!window.__qaApp&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'memory-only native audio entry',30000);
  const result=await context.evaluate('('+captureNative.toString()+')('+JSON.stringify(contactFixture)+')');
  result.actualRecorder = await actualRecorderProbe(context);
  await writeFile(join(context.outputDir,'capture.json'),JSON.stringify(result)+'\n');
  console.log('Native final-output Float32 capture: '+result.rows.length+' cases, '+result.sampleRate+' Hz.');
}


// Build this QA-only entry in the test's ignored private directory. Importing
// the real class and recorder together keeps the actual EngineAudio instance;
// every observed runtime/native method still runs unchanged.
export function nativeRecorderEntry() {
  return `import {EngineAudio} from '/src/audio.js';
const edges=[],processors=[],nativeConnect=AudioNode.prototype.connect;
const nativeProcessor=AudioContext.prototype.createScriptProcessor;
const nativeBuild=EngineAudio.prototype._build;
AudioNode.prototype.connect=function(destination,...rest){
  edges.push([this,destination]);return nativeConnect.call(this,destination,...rest);
};
AudioContext.prototype.createScriptProcessor=function(...args){
  const node=nativeProcessor.apply(this,args);processors.push(node);return node;
};
EngineAudio.prototype._build=function(...args){
  const result=nativeBuild.apply(this,args);window.__recorderAudioInstance=this;return result;
};
window.__recorderGraph=()=>{
  const audio=window.__recorderAudioInstance,processor=processors[0];
  const reachable=(start,end,omit)=>{const seen=new Set(),queue=[start];
    while(queue.length){const node=queue.shift();if(node===omit||seen.has(node))continue;
      if(node===end)return true;seen.add(node);
      for(const [from,to]of edges)if(from===node)queue.push(to);
    }return false;
  };
  return {nativeContext:audio?.context instanceof AudioContext,
    finalIsActualNode:audio?.output instanceof AudioNode,
    processors:processors.length,
    finalReachesDestination:reachable(audio?.output,audio?.context?.destination),
    mixRoutedFromFinal:reachable(audio?.output,processor),
    masterBypassesFinalIntoMix:reachable(audio?.master,processor,audio?.output)};
};
window.__recorderCleanup=async()=>{
  const audio=window.__recorderAudioInstance;await audio?.context?.close();
  EngineAudio.prototype._build=nativeBuild;
  AudioContext.prototype.createScriptProcessor=nativeProcessor;
  AudioNode.prototype.connect=nativeConnect;
  return audio?.context?.state==='closed';
};
await import('/tools/audio-race-check.js');
`;
}

export async function actualRecorderProbe(context) {
  const page=join(context.outputDir,'recorder-probe.html');
  const relativePath=page.replaceAll('\\','/').split('/.evidence/')[1];
  if(!relativePath)throw Error('Recorder QA page must be in the card evidence directory.');
  await context.navigate('/.evidence/'+relativePath);
  await context.waitFor('!!window.__audioQaReady','actual existing native race recorder',30000);
  const started=await context.evaluate('window.__audioQaStart()');
  await new Promise(done=>setTimeout(done,350));
  const graph=await context.evaluate('window.__recorderGraph()');
  const finished=await context.evaluate('window.__audioQaFinish()');
  const contextClosed=await context.evaluate('window.__recorderCleanup()');
  return {...graph,memoryOnly:started.storageIsMemory&&finished.memoryOnlySaves,
    sampleRate:finished.sampleRate,mixFrames:finished.tracks.mix.frames,
    contextClosed};
}
