import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

// Controlled one-car Web Audio capture. No driving, frame timing or listening claim.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=nissan-skyline');
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'memory-only Skyline audio', 30000);
  await context.evaluate(`(async () => {
    const app=window.__qaApp; app.stop();
    const audio=app.audio; audio.unlock(); audio.setMuted(false); audio.setPaused(false);
    await audio.context.resume();
    await Promise.all([audio._samplesPromise,audio._ambiencePromise]);
    if(audio.sampleStatus!=='ready'||!audio.flags.enabled('nissan-skyline'))throw Error('Skyline audio unavailable');
    const ctx=audio.context, processor=ctx.createScriptProcessor(2048,2,2), silent=ctx.createGain();
    silent.gain.value=0; audio.output.connect(processor); processor.connect(silent); silent.connect(ctx.destination);
    const chunks=[],cues=[],rows=[],start=ctx.currentTime, original=audio._playCue;
    audio._playCue=function(id,...args){cues.push({id,time:ctx.currentTime-start});return original.call(this,id,...args);};
    processor.onaudioprocess=event=>{
      const left=event.inputBuffer.getChannelData(0),right=event.inputBuffer.getChannelData(1),pcm=new Int16Array(left.length*2);
      for(let i=0;i<left.length;i++){pcm[2*i]=Math.round(Math.max(-1,Math.min(1,left[i]))*32767);pcm[2*i+1]=Math.round(Math.max(-1,Math.min(1,right[i]))*32767);}
      chunks.push(pcm);
    };
    const state={car:'nissan_skyline_gtr_r34',status:'racing',paused:false,impactTimer:0,
      speedMph:120,revs:.85,gear:3,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,
      offRoad:false,airborne:false,airHeight:0,police:{beep:0,pursuit:null}};
    const timer=setInterval(()=>{
      const time=ctx.currentTime-start;
      state.input.throttle=(time>=2&&time<2.5)||(time>=4&&time<4.5)?0:1;
      audio.update(state);
      rows.push({time,throttle:state.input.throttle,frequency:audio.turboLoop?.osc.frequency.value,
        gain:audio.turboLoop?.gain.gain.value});
    },16);
    window.__skylineAudio={audio,ctx,processor,silent,chunks,cues,rows,timer,original};
  })()`);
  await new Promise(resolve=>setTimeout(resolve,6200));
  const packet=await context.evaluate(`(() => {
    const c=window.__skylineAudio;clearInterval(c.timer);c.audio.setPaused(true);
    c.audio._playCue=c.original;c.audio.output.disconnect(c.processor);c.processor.disconnect();c.silent.disconnect();
    const pcm=new Int16Array(c.chunks.reduce((n,x)=>n+x.length,0));let offset=0;
    for(const chunk of c.chunks){pcm.set(chunk,offset);offset+=chunk.length;}
    const bytes=new Uint8Array(pcm.buffer);let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {pcm:btoa(binary),rate:c.ctx.sampleRate,cues:c.cues,rows:c.rows,
      turboStopped:!c.audio.turboLoop,memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  const wave=wavFromPcm(Buffer.from(packet.pcm,'base64'),packet.rate);delete packet.pcm;
  packet.loudness=measureLoudness(wave);
  const releases=packet.cues.filter(row=>row.id==='vehicle.blowoff');
  if(!packet.memoryOnly||!packet.turboStopped||releases.length!==2||
      releases[1].time-releases[0].time<1.2||!packet.rows.some(row=>row.frequency>6000&&row.gain>.001)||
      !packet.loudness.available||packet.loudness.truePeakDbtp>=0)
    throw Error('Skyline native audio isolation, wiring or level check failed: '+JSON.stringify(packet.loudness));
  await writeFile(join(context.outputDir,'skyline.wav'),wave);
  await writeFile(join(context.outputDir,'skyline.json'),JSON.stringify(packet,null,2)+'\n');
  console.log('Skyline controlled native audio: '+JSON.stringify(packet.loudness));
}
