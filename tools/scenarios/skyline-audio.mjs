import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';
import {measureLoudness} from '../audio/measurements.mjs';
import {createCaptureWitness, inspectCaptureWitness, inspectCaptureStartup, recorderWorkletSource} from '../audio/capture-witness.mjs';

export function inspectSkylineCapture(packet) {
  const reasons = [], clockNotes = [];
  if (!packet.callbacks.length) reasons.push('no recorder callbacks');
  let previous = null;
  for (let i = 0; i < packet.callbacks.length; i++) {
    const row = packet.callbacks[i];
    const expectedFrame = packet.callbacks[0].frame + i * 2048;
    if (row.frame !== expectedFrame) clockNotes.push({callback: i, actualFrame: row.frame, expectedFrame});
    // Any silence before source frame 0 is startup, regardless of callback count.
    // Startup samples are also excluded from the measured stereo PCM.
    if (row.startupFrames) {
      if (previous || row.startupFrames + row.frames !== 2048 ||
          (row.frames && row.identity.sourceStartFrame !== 0))
        reasons.push('invalid witness startup at callback ' + i);
      if (!row.frames) continue;
    }
    if (!previous && row.identity.complete && row.identity.sourceStartFrame !== 0)
      reasons.push('recording missed source frame 0 at callback ' + i);
    if (!row.identity.complete || row.identity.checkedFrames !== row.frames)
      reasons.push('sample witness mismatch at callback ' + i);
    // Callback frame labels describe the clock, not input sample identity.
    // A late delivery alone must never invalidate an otherwise intact buffer.
    if (previous?.identity.complete && row.identity.complete &&
        row.identity.sourceStartFrame !== previous.identity.sourceStartFrame + previous.frames)
      reasons.push('sample witness gap/repeat at callback ' + i + ' (expected source frame ' +
        (previous.identity.sourceStartFrame + previous.frames) + ', got ' + row.identity.sourceStartFrame + ')');
    previous = row;
  }
  if (!previous) reasons.push('no witnessed recorder samples');
  // A delayed timer can jump across an entire lift. That never exercised the
  // blowoff under test; loudness alone cannot diagnose this missed stimulus.
  for (const [start, end] of [[2, 2.5], [4, 4.5]]) {
    if (!packet.rows.some(row => row.throttle === 0 &&
        (row.liftCueTime ?? row.time) >= start && (row.liftCueTime ?? row.time) < end))
      reasons.push('control timer missed throttle lift ' + start + '..' + end + ' s');
  }
  return {disturbed: reasons.length > 0, reasons, clockNotes};
}

export function validateSkylineAudio(packet) {
  if(packet.capture.disturbed) throw Error('capture disturbed, rerun alone: Skyline '+JSON.stringify({
    count:packet.capture.reasons.length,reasons:packet.capture.reasons.slice(0,3)}));
  const releases=packet.cues.filter(row=>row.id==='vehicle.blowoff');
  if(!packet.memoryOnly||!packet.turboStopped||releases.length!==2||
      releases[1].time-releases[0].time<1.2||!packet.rows.some(row=>row.frequency>6000&&row.gain>.001)||
      !packet.loudness.available||packet.loudness.truePeakDbtp>=0)
    throw Error('Skyline native audio isolation, wiring or level check failed: '+JSON.stringify({loudness:packet.loudness,
      memoryOnly:packet.memoryOnly,turboStopped:packet.turboStopped,releases:releases.length}));
}

// Controlled one-car Web Audio capture. No driving, frame timing or listening claim.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=nissan-skyline');
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'memory-only Skyline audio', 30000);
  await context.waitFor("window.__qaApp.visualReady && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",
    'Skyline menu assets ready before recording', 60000);
  try {
  await context.evaluate(`(async () => {
    const app=window.__qaApp; app.stop();
    const audio=app.audio; audio.unlock(); audio.setMuted(false); audio.setPaused(false);
    await audio.context.resume();
    await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
    if(audio.sampleStatus!=='ready'||!audio.flags.enabled('nissan-skyline'))throw Error('Skyline audio unavailable');
    const ctx=audio.context, silent=ctx.createGain();
    const url=URL.createObjectURL(new Blob([${JSON.stringify(recorderWorkletSource)}],{type:'text/javascript'}));
    try{await ctx.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
    const processor=new AudioWorkletNode(ctx,'arsenal-native-meter',
      {numberOfInputs:2,numberOfOutputs:1,outputChannelCount:[2]});
    const reference=(${createCaptureWitness.toString()})(ctx.sampleRate);
    const inspectWitness=(${inspectCaptureWitness.toString()});
    const witnessBuffer=ctx.createBuffer(1,reference.length,ctx.sampleRate);witnessBuffer.copyToChannel(reference,0);
    const witness=ctx.createBufferSource();
    witness.buffer=witnessBuffer;witness.connect(processor,0,1);
    audio.output.connect(processor);
    silent.gain.value=0;
    const chunks=[],callbacks=[],cues=[],rows=[],firstBlocks=[],original=audio._playCue;
    const inspectStartup=(${inspectCaptureStartup.toString()});
    const inspectCaptureWitness=inspectWitness;
    let start, startup=null, handshakeDone=false;
    let witnessStarted=false;
    audio._playCue=function(id,...args){cues.push({id,time:ctx.currentTime-start});return original.call(this,id,...args);};
    processor.port.onmessage=event=>{
      const {witness:measured,pcm:stereo,frame}=event.data;
      let startupFrames=0;
      if(!witnessStarted)while(startupFrames<measured.length && measured[startupFrames]===0)startupFrames++;
      if(startupFrames<measured.length)witnessStarted=true;
      if(!handshakeDone)firstBlocks.push({frame,witness:measured});
      const frames=measured.length-startupFrames,pcm=new Int16Array(frames*2);
      callbacks.push({frame,frames,startupFrames,
        deliveredMs:performance.now(),identity:inspectWitness(measured.subarray(startupFrames),reference)});
      for(let i=0;i<frames*2;i++)pcm[i]=Math.round(Math.max(-1,Math.min(1,stereo[startupFrames*2+i]))*32767);
      chunks.push(pcm);
    };
    processor.connect(silent);silent.connect(ctx.destination);
    const settle=async(test,label)=>{const deadline=performance.now()+5000;
      while(!test()){if(performance.now()>deadline)throw Error('capture disturbed, rerun alone: '+label);
        await new Promise(resolve=>setTimeout(resolve,16));}};
    window.__skylineAudio={audio,ctx,processor,silent,witness,chunks,callbacks,cues,rows,original,
      startupPacket:()=>startup??inspectStartup(firstBlocks,reference)};
    // A delivered worklet block proves process() is running before source.start().
    await settle(()=>callbacks.length>0,'Skyline worklet did not run');
    witness.start();
    await settle(()=>witnessStarted,'Skyline witness source frame 0 was not captured');
    startup=inspectStartup(firstBlocks,reference);handshakeDone=true;
    if(!startup.complete)throw Error('capture disturbed, rerun alone: Skyline '+startup.reasons.join('; '));
    start=ctx.currentTime;
    const state={car:'nissan_skyline_gtr_r34',status:'racing',paused:false,impactTimer:0,
      speedMph:120,revs:.85,gear:3,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,
      offRoad:false,airborne:false,airHeight:0,police:{beep:0,pursuit:null}};
    const timer=setInterval(()=>{
      const time=ctx.currentTime-start;
      state.input.throttle=(time>=2&&time<2.5)||(time>=4&&time<4.5)?0:1;
      const cueCount=cues.length;
      audio.update(state);
      const liftCueTime=cues.slice(cueCount).find(cue=>cue.id==='vehicle.blowoff')?.time;
      rows.push({time,throttle:state.input.throttle,liftCueTime,frequency:audio.turboLoop?.osc.frequency.value,
        gain:audio.turboLoop?.gain.gain.value});
    },16);
    window.__skylineAudio.timer=timer;
  })()`);
  } catch(error) {
    const startup=await context.evaluate('window.__skylineAudio?.startupPacket()');
    await writeFile(join(context.outputDir,'skyline-startup.json'),JSON.stringify(startup??null,null,2)+'\n');
    throw error;
  }
  await new Promise(resolve=>setTimeout(resolve,6200));
  const packet=await context.evaluate(`(() => {
    const c=window.__skylineAudio;clearInterval(c.timer);c.audio.setPaused(true);
    c.audio._playCue=c.original;c.audio.output.disconnect(c.processor);
    c.witness.stop();c.witness.disconnect();c.processor.disconnect();c.processor.port.close();c.silent.disconnect();
    const pcm=new Int16Array(c.chunks.reduce((n,x)=>n+x.length,0));let offset=0;
    for(const chunk of c.chunks){pcm.set(chunk,offset);offset+=chunk.length;}
    const bytes=new Uint8Array(pcm.buffer);let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {pcm:btoa(binary),rate:c.ctx.sampleRate,cues:c.cues,rows:c.rows,callbacks:c.callbacks,startup:c.startupPacket(),
      turboStopped:!c.audio.turboLoop,memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  const wave=wavFromPcm(Buffer.from(packet.pcm,'base64'),packet.rate);delete packet.pcm;
  packet.loudness=measureLoudness(wave);
  packet.capture=inspectSkylineCapture(packet);
  await writeFile(join(context.outputDir,'skyline.wav'),wave);
  await writeFile(join(context.outputDir,'skyline.json'),JSON.stringify(packet,null,2)+'\n');
  validateSkylineAudio(packet);
  console.log('Skyline controlled native audio: '+JSON.stringify(packet.loudness));
}
