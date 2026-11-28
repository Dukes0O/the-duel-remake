import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {contactFixture} from './warlord-reward.mjs';
import {createCaptureWitness, inspectCaptureWitness, inspectWitnessedChunks}
  from '../audio/capture-witness.mjs';

export const crashRecorderWorkletSource = `class PeakMeter extends AudioWorkletProcessor {
    constructor(options){super();this.count=options?.processorOptions?.streams||1;
      this.data=Array.from({length:this.count},()=>new Float32Array(4096));
      this.at=0;this.first=0;this.callbacks=[];this.witness=new Float32Array(2048);}
    process(inputs){
      const witness=inputs[this.count]?.[0];
      this.callbacks.push({frame:currentFrame,offset:this.at/2,
        lengths:inputs.map(channels=>channels.map(channel=>channel.length))});
      for(let i=0;i<128;i++){
        if(this.at===0)this.first=currentFrame+i;
        this.witness[this.at/2]=witness?.[i]||0;
        for(let stream=0;stream<this.count;stream++){
          const channels=inputs[stream]||[],left=channels[0],right=channels[1]||left;
          this.data[stream][this.at]=left?.[i]??0;
          this.data[stream][this.at+1]=right?.[i]??0;
        }
        this.at+=2;
        if(this.at===4096){
          this.port.postMessage({frame:this.first,pcm:this.data[0],streams:this.data,
            callbacks:this.callbacks,witness:this.witness},[...this.data.map(data=>data.buffer),this.witness.buffer]);
          this.data=Array.from({length:this.count},()=>new Float32Array(4096));
          this.at=0;this.callbacks=[];this.witness=new Float32Array(2048);
        }
      }return true;
    }
  } registerProcessor('duel-crash-peak-meter',PeakMeter);`;

// QA only: native AudioWorklet meters read the final runtime output. Float32
// samples are transferred unchanged; values outside [-1,1] are never clipped.
async function captureNative(contactSource, recorder) {
  const sleep = ms => new Promise(done => setTimeout(done, ms));
  // Capture lengths are counted in audio time. A busy laptop can let the audio
  // clock fall behind the wall clock, so each capture window waits on the audio
  // clock it measures, never on a timer. The cap only stops a stuck context.
  const untilAudioTime = async (ctx, time) => {
    const give = Date.now() + 15000;
    while (ctx.currentTime < time && Date.now() < give) await sleep(10);
  };
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
  const worklet = recorder.worklet;
  const url = URL.createObjectURL(new Blob([worklet], {type:'text/javascript'}));
  try {await context.audioWorklet.addModule(url);} finally {URL.revokeObjectURL(url);}
  async function meters(nodes, ctx = context) {
    const reference = recorder.createWitness(ctx.sampleRate);
    const witnessBuffer = ctx.createBuffer(1, reference.length, ctx.sampleRate);
    witnessBuffer.copyToChannel(reference, 0);
    const source = ctx.createBufferSource(); source.buffer = witnessBuffer;
    const entries = Object.entries(nodes);
    const tracks = Object.fromEntries(entries.map(([name]) => [name, {chunks: [], reference, sampleRate: ctx.sampleRate}]));
    const tap = new AudioWorkletNode(ctx, 'duel-crash-peak-meter',
      {numberOfInputs: entries.length + 1, numberOfOutputs: 1, outputChannelCount: [2],
        processorOptions: {streams: entries.length}});
    tap.connect(ctx.destination);
    tap.port.onmessage = event => {
      const packet = event.data;
      for (let i = 0; i < entries.length; i++) tracks[entries[i][0]].chunks.push({
        frame: packet.frame, pcm: packet.streams[i], witness: packet.witness, callbacks: packet.callbacks});
    };
    entries.forEach(([, node], index) => node.connect(tap, 0, index));
    source.connect(tap, 0, entries.length);
    let stopped = false;
    const stop = () => {
      if (stopped) return; stopped = true;
      source.stop(); source.disconnect();
      for (const [, node] of entries) node.disconnect(tap);
      tap.disconnect(); tap.port.close();
    };
    for (const track of Object.values(tracks)) track.stop = stop;
    const deadline = Date.now() + 5000;
    try {
      while (!Object.values(tracks).every(track => track.chunks.length)) {
        if (Date.now() >= deadline) throw Error('capture disturbed, rerun alone: crash worklet did not run');
        await sleep(10);
      }
      const sourceStartFrame = Math.ceil((ctx.currentTime + .05) * ctx.sampleRate / 128) * 128;
      for (const track of Object.values(tracks)) track.sourceStartFrame = sourceStartFrame;
      source.start(sourceStartFrame / ctx.sampleRate);
      while (!Object.values(tracks).every(track => {
        const capture = recorder.inspectChunks(track.chunks, sourceStartFrame, reference, recorder.inspectWitness);
        if (capture.reasons.some(reason => reason !== 'no witnessed source samples'))
          throw Error('capture disturbed, rerun alone: crash startup ' + capture.reasons.join('; '));
        return capture.complete;
      })) {
        if (Date.now() >= deadline) throw Error('capture disturbed, rerun alone: crash witness source frame 0 not captured');
        await sleep(10);
      }
      return tracks;
    } catch (error) { stop(); throw error; }
  }
  async function meter(node, ctx = context) { return (await meters({single: node}, ctx)).single; }
  function encode(track, began) {
    const {chunks, reference, sourceStartFrame, sampleRate} = track;
    const capture = recorder.inspectChunks(chunks, sourceStartFrame, reference, recorder.inspectWitness);
    if (!capture.complete) throw Error('capture disturbed, rerun alone: crash ' + capture.reasons.join('; '));
    const kept = capture.chunks.filter(chunk => chunk.sampleFrame !== null);
    const first = kept[0].sampleFrame + kept[0].startupFrames;
    const length = kept.reduce((sum, chunk) => sum + chunk.pcm.length - chunk.startupFrames * 2, 0);
    const pcm = new Float32Array(length), witness = new Float32Array(length / 2);
    let at = 0;
    for (const chunk of kept) {
      pcm.set(chunk.pcm.subarray(chunk.startupFrames * 2), at);
      witness.set(chunk.witness.subarray(chunk.startupFrames), at / 2);
      at += chunk.pcm.length - chunk.startupFrames * 2;
    }
    const base64 = values => {
      const bytes = new Uint8Array(values.buffer); let binary = '';
      for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
      return btoa(binary);
    };
    return {pcmBase64: base64(pcm), witnessBase64: base64(witness), frames: length / 2,
      audioStartSec: first / sampleRate - began, firstFrame: first,
      chunkFrames: chunks.map(chunk => chunk.frame), chunkCallbacks: chunks.map(chunk => chunk.callbacks),
      clockNotes: capture.clockNotes, witnessDiagnostic: recorder.inspectWitness(witness, reference), contiguous: capture.complete};
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
    const tracks=await meters({mix:audio.output,engine:audio.buses.engine,
      impacts:audio.buses.impacts});
    const began=context.currentTime;
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
    app.start();await untilAudioTime(context,began+3.2);app.stop();app.onFrame=null;
    for(const track of Object.values(tracks))track.stop();
    await sleep(40);
    rows.push({name,began,contactAt:contactAt-began,stressAt:stressAt==null?null:stressAt-began,
      physical,frames,events:events.filter(e=>e.time>=began).map(e=>({...e,time:e.time-began})),
      cues:cues.filter(e=>e.time>=began).map(e=>({...e,time:e.time-began})),
      tracks:Object.fromEntries(Object.entries(tracks).map(([key,t])=>[key,encode(t,began)]))});
    app.returnToMenu();
  }
  // Native safe-signal reference: quiet, known audio goes through the complete
  // graph, with no engine updates and no guessed limiter API.
  const quiet = new audio.constructor({flags:audio.flags});
  quiet.muted=false;quiet._build(new AudioContext({sampleRate:context.sampleRate}));
  await quiet.context.resume();await Promise.all([quiet._samplesPromise,quiet._ambiencePromise]);
  const qctx=quiet.context,qurl=URL.createObjectURL(new Blob([worklet],{type:'text/javascript'}));
  try{await qctx.audioWorklet.addModule(qurl);}finally{URL.revokeObjectURL(qurl);}
  const tone=qctx.createOscillator(),level=qctx.createGain();
  tone.frequency.value=997;level.gain.value=.01;tone.connect(level);level.connect(quiet.master);
  // Released a6523ea output reference, rendered by the same native context.
  // It is a behavior baseline, not a required repair topology or limiter API.
  const referenceMaster=qctx.createGain(),referenceOutput=qctx.createDynamicsCompressor();
  referenceMaster.gain.value=.42;referenceOutput.threshold.value=-18;
  referenceOutput.knee.value=16;referenceOutput.ratio.value=4;
  level.connect(referenceMaster);referenceMaster.connect(referenceOutput);
  const quietMeter = await meter(quiet.output, qctx), referenceMeter = await meter(referenceOutput, qctx);
  const qbegan=qctx.currentTime;tone.start();await untilAudioTime(qctx,qbegan+1.1);tone.stop();
  quietMeter.stop();referenceMeter.stop();await sleep(40);
  referenceOutput.disconnect();
  const quietTrack=encode(quietMeter,qbegan),referenceTrack=encode(referenceMeter,qbegan);await qctx.close();
  // The actual pause API fades the complete output and clears owned voices.
  const paused=await meter(audio.output),pausedStart=context.currentTime;
  audio.setPaused(true);await untilAudioTime(context,pausedStart+.35);paused.stop();await sleep(40);
  const cleanup={paused:audio.paused,projectileVoices:audio.projectileVoices.size,
    mixerVoices:[...audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0),hiddenRoadVoices:audio.hiddenRoadVoices.size,
    track:encode(paused,pausedStart)};
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
  const recorder = '{createWitness:(' + createCaptureWitness.toString() + '),inspectWitness:(' +
    inspectCaptureWitness.toString() + '),inspectChunks:(' + inspectWitnessedChunks.toString() +
    '),worklet:' + JSON.stringify(crashRecorderWorkletSource) + '}';
  const result=await context.evaluate('('+captureNative.toString()+')('+JSON.stringify(contactFixture)+','+recorder+')');
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
