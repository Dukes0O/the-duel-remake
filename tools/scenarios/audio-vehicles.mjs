import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

// One future real memory-only listening packet. No frame budget claim.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=rival-voices');
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",'isolated vehicle mix',30000);
  await context.evaluate(`(async()=>{
    const app=window.__qaApp;
    if(!app.duel.featureFlags.enabled('rival-voices'))throw Error('Vehicle voice dev opt-in missing');
    app.stop();app.audio.unlock();app.audio.setMuted(false);
    await Promise.all([app.audio._samplesPromise,app.audio._ambiencePromise]);
    if(app.audio.sampleStatus!=='ready'||app.audio.context.state!=='running')throw Error('Real engine donors unavailable');
    const ctx=app.audio.context,processor=ctx.createScriptProcessor(2048,2,2),silent=ctx.createGain();
    silent.gain.value=0;app.audio.output.connect(processor);processor.connect(silent);silent.connect(ctx.destination);
    const chunks=[],rows=[],start=ctx.currentTime;
    processor.onaudioprocess=event=>{
      const l=event.inputBuffer.getChannelData(0),r=event.inputBuffer.getChannelData(1),chunk=new Int16Array(l.length*2);
      for(let i=0;i<l.length;i++){chunk[2*i]=Math.round(Math.max(-1,Math.min(1,l[i]))*32767);chunk[2*i+1]=Math.round(Math.max(-1,Math.min(1,r[i]))*32767);}
      chunks.push(chunk);
    };
    if(!app.startCampaign({startStage:0,mode:'duel',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',opponentCount:4,seed:1989}))throw Error('Native memory race failed');
    app.autopilot=true;
    const original=app.onFrame;
    app.onFrame=(state,dt)=>{
      original?.(state,dt);
      const voices=[...(app.audio.vehicleVoices||[])];
      rows.push({at:ctx.currentTime-start,status:state.status,throttle:state.input.throttle,speed:state.speedMph,
        playerEngineLevel:app.audio._playerEngineLevel(),resources:voices.length,
        voices:voices.map(row=>({kind:row.kind,id:row.id,distance:row.distance,pending:!row.voice,fading:row.retiring,
          gain:row.voice?.gain.gain.value,rate:row.voice?.source.playbackRate.value,donor:row.kind==='rival'?'engine-load-high.flac':'engine-loop.flac'}))});
    };
    window.__vehicleMix={chunks,rows,ctx,processor,silent,original};app.start();
  })()`);
  await new Promise(resolve=>setTimeout(resolve,20000));
  const packet=await context.evaluate(`(async()=>{
    const app=window.__qaApp,capture=window.__vehicleMix;app.stop();app.onFrame=capture.original;
    app.audio.setPaused(true);await new Promise(resolve=>setTimeout(resolve,450));
    app.audio.output.disconnect(capture.processor);capture.processor.disconnect();capture.silent.disconnect();
    const length=capture.chunks.reduce((n,chunk)=>n+chunk.length,0),pcm=new Int16Array(length);let offset=0;
    for(const chunk of capture.chunks){pcm.set(chunk,offset);offset+=chunk.length;}
    const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {rate:capture.ctx.sampleRate,pcm:btoa(binary),rows:capture.rows,remaining:app.audio.vehicleVoices.size,
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  const wave=wavFromPcm(Buffer.from(packet.pcm,'base64'),packet.rate);delete packet.pcm;
  packet.loudness=measureLoudness(wave);packet.humanListeningPending=true;
  packet.near=packet.rows.filter(row=>row.throttle>=.95&&row.voices.some(voice=>!voice.pending&&!voice.fading&&voice.distance<=50));
  packet.far=packet.rows.filter(row=>row.throttle>=.95&&row.voices.some(voice=>!voice.pending&&!voice.fading&&voice.distance>=100));
  await writeFile(join(context.outputDir,'vehicle-mix.wav'),wave);
  await writeFile(join(context.outputDir,'vehicle-mix.json'),JSON.stringify(packet,null,2)+'\n');
  if(!packet.memoryOnly||packet.remaining||packet.rows.some(row=>row.resources>7))throw Error('Native vehicle resource/isolation check failed');
  if(!packet.near.length||!packet.far.length)throw Error('Native full-throttle near/far witnesses missing; no listening acceptance');
  if(!packet.rows.some(row=>row.voices.some(voice=>voice.kind==='rival'&&!voice.pending))||
    !packet.rows.some(row=>row.voices.some(voice=>voice.kind==='traffic'&&!voice.pending)))throw Error('Native rival or traffic donor missing');
}
