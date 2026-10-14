import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {wavFromPcm} from './audio-race.mjs';
import {measureLoudness} from '../audio/measurements.mjs';

// One future real memory-only listening packet. No frame budget claim.
export async function run(context) {
  const voicesOff=process.env.DUEL_VEHICLE_VOICES_OFF==='1';
  await context.navigate('/tools/menu-check.html'+(voicesOff?'':'?flags=rival-voices'));
  await context.waitFor("!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",'isolated vehicle mix',30000);
  await context.evaluate(`(async()=>{
    const app=window.__qaApp;
    if(app.duel.featureFlags.enabled('rival-voices')!==${!voicesOff})throw Error('Vehicle voice capture switch mismatch');
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
    const originalDrive=app._driveAutopilot;
    app._driveAutopilot=function(dt){
      originalDrive.call(this,dt);
      const state=this.duel.state;
      if(state.status==='racing'&&state.stageTimeSec>=8&&state.stageTimeSec<12)
        this.duel.setInput({throttle:0,brake:state.stageTimeSec<10?1:0,boost:false});
    };
    const original=app.onFrame;
    app.onFrame=(state,dt)=>{
      original?.(state,dt);
      const voices=[...(app.audio.vehicleVoices||[])];
      rows.push({at:ctx.currentTime-start,status:state.status,throttle:state.input.throttle,brake:state.input.brake,speed:state.speedMph,
        stageTimeSec:state.stageTimeSec,inputPhase:state.stageTimeSec>=8&&state.stageTimeSec<12?(state.stageTimeSec<10?'brake':'lift'):'driver',
        playerEngineLevel:app.audio._playerEngineLevel(),resources:voices.length,
        voices:voices.map(row=>({kind:row.kind,id:row.id,distance:row.distance,pending:!row.voice,fading:row.retiring,
          gain:row.voice?.gain.gain.value,rate:row.voice?.source.playbackRate.value,speedMph:row.actor.speedMph,ownLevel:row.ownLevel,
          panner:row.voice?{panningModel:row.voice.output.input.panningModel,distanceModel:row.voice.output.input.distanceModel,
            refDistance:row.voice.output.input.refDistance,maxDistance:row.voice.output.input.maxDistance,rolloffFactor:row.voice.output.input.rolloffFactor}:null,donor:row.kind==='rival'?'engine-load-high.flac':'engine-loop.flac'}))});
    };
    window.__vehicleMix={chunks,rows,ctx,processor,silent,original,originalDrive};app.start();
  })()`);
  await new Promise(resolve=>setTimeout(resolve,20000));
  const packet=await context.evaluate(`(async()=>{
    const app=window.__qaApp,capture=window.__vehicleMix;app.stop();app.onFrame=capture.original;app._driveAutopilot=capture.originalDrive;
    app.audio.setPaused(true);await new Promise(resolve=>setTimeout(resolve,450));
    app.audio.output.disconnect(capture.processor);capture.processor.disconnect();capture.silent.disconnect();
    const length=capture.chunks.reduce((n,chunk)=>n+chunk.length,0),pcm=new Int16Array(length);let offset=0;
    for(const chunk of capture.chunks){pcm.set(chunk,offset);offset+=chunk.length;}
    const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {rate:capture.ctx.sampleRate,pcm:btoa(binary),rows:capture.rows,remaining:app.audio.vehicleVoices?.size??0,
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  const wave=wavFromPcm(Buffer.from(packet.pcm,'base64'),packet.rate);delete packet.pcm;
  packet.loudness=measureLoudness(wave);packet.humanListeningPending=true;packet.voicesEnabled=!voicesOff;
  packet.inputSchedule={clock:'actual stageTimeSec',brake:[8,10],lift:[10,12],throttle:0,brakeInput:1,driver:'unchanged stock autopilot',seed:1989};
  packet.quiet=packet.rows.filter(row=>row.inputPhase==='brake'||row.inputPhase==='lift');
  packet.near=packet.rows.filter(row=>row.throttle>=.95&&row.voices.some(voice=>!voice.pending&&!voice.fading&&voice.distance<=50));
  packet.far=packet.rows.filter(row=>row.throttle>=.95&&row.voices.some(voice=>!voice.pending&&!voice.fading&&voice.distance>=100));
  await writeFile(join(context.outputDir,voicesOff?'vehicle-mix-off.wav':'vehicle-mix.wav'),wave);
  await writeFile(join(context.outputDir,voicesOff?'vehicle-mix-off.json':'vehicle-mix.json'),JSON.stringify(packet,null,2)+'\n');
  if(!packet.memoryOnly||packet.remaining||packet.rows.some(row=>row.resources>7))throw Error('Native vehicle resource/isolation check failed');
  if(voicesOff){
    if(packet.rows.some(row=>row.resources!==0))throw Error('Voices-off capture allocated vehicle resources');
    return;
  }
  if(!packet.quiet.some(row=>row.voices.some(voice=>!voice.pending&&!voice.fading&&voice.ownLevel>0)))
    throw Error('Actual input-only brake/lift vehicle witness missing');
  if(!packet.near.length||!packet.far.length)throw Error('Native full-throttle near/far witnesses missing; no listening acceptance');
  if(!packet.rows.some(row=>row.voices.some(voice=>voice.kind==='rival'&&!voice.pending))||
    !packet.rows.some(row=>row.voices.some(voice=>voice.kind==='traffic'&&!voice.pending)))throw Error('Native rival or traffic donor missing');
}
