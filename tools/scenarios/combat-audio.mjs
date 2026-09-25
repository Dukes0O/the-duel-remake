import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { wavFromPcm } from './audio-race.mjs';
import { measureLoudness } from '../audio/measurements.mjs';
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(
    "!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'isolated combat audio',
    30000,
  );
  const result = await context.evaluate(`(async()=>{
 const Audio=window.__qaApp.audio.constructor,rate=48000,rows=[],clips=[];
 const ids=['weapon.crossbow.fire','weapon.rpg.fire','combat.blast.recorded','vehicle.crash.recorded','combat.hit-confirm','weapon.ufo.fire','weapon.bomb.fire','weapon.star.fire','raider.shot'];
 const native=new OfflineAudioContext(6,rate*ids.length*3*2,rate),merge=native.createChannelMerger(6);merge.connect(native.destination);
 const destination=native.createGain(),split=native.createChannelSplitter(2);destination.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 let clock=0;const ctx=new Proxy(native,{get(target,key){if(key==='destination')return destination;if(key==='currentTime')return clock;if(key==='state')return 'running';const value=Reflect.get(target,key,target);if(key==='createBufferSource'){return()=>{const n=value.call(target),start=n.start.bind(n),stop=n.stop.bind(n);n.start=(t=clock,...a)=>start(t,...a);n.stop=(t=clock)=>stop(t);return n;};}return typeof value==='function'?value.bind(target):value;}});
 const audio=new Audio({flags:{enabled:()=>true}});audio.muted=false;audio._build(ctx);await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
 for(const [buses,index] of [[['engine'],2],[['weapons','impacts'],4]]){const gain=native.createGain(),ch=native.createChannelSplitter(2);gain.gain.value=.42;for(const bus of buses)audio.buses[bus].connect(gain);gain.connect(ch);ch.connect(merge,0,index);ch.connect(merge,1,index+1);}
 const state={car:'falcone_f42',status:'racing',paused:false,mode:'wasteland',maxArmor:100,speedMph:160,revs:.95,gear:3,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,offRoad:false,roughness:0,airborne:false,airHeight:0,impactTimer:0,police:{beep:0,pursuit:null}};
 for(let i=0;i<ids.length*3*2*60;i++){clock=i/60;audio.nextBeat=Infinity;audio.update(state,{});if(i%120===30){const n=Math.floor(i/120),id=ids[Math.floor(n/3)],variant=n%3;audio.cueIndices.set(id,variant);audio._playCue(id);rows.push({id,variant:'ABC'[variant],at:clock});}}
 const buffer=await native.startRendering(),mix=buffer.getChannelData(0),engine=buffer.getChannelData(2),effects=buffer.getChannelData(4);
 for(const row of rows){let e=0,w=0;const start=Math.round(row.at*rate),end=start+Math.round(.25*rate);for(let i=start;i<end;i++){e+=engine[i]**2;w+=effects[i]**2;}row.overEngineDb=10*Math.log10(w/e);}
 let peak=0;const pcm=new Int16Array(buffer.length*2);for(let i=0;i<buffer.length;i++)for(let ch=0;ch<2;ch++){const n=buffer.getChannelData(ch)[i];peak=Math.max(peak,Math.abs(n));pcm[i*2+ch]=Math.round(Math.max(-1,Math.min(1,n))*32767);}
 const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {rows,peak,rate,pcm:btoa(binary),voices:[...audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0)};
 })()`);
  const wave = wavFromPcm(Buffer.from(result.pcm, 'base64'), result.rate);
  delete result.pcm;
  result.loudness = measureLoudness(wave);
  result.humanListeningPending = true;
  await writeFile(join(context.outputDir, 'combat-context.wav'), wave);
  await writeFile(
    join(context.outputDir, 'combat-audio.json'),
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result));
  if (result.peak >= 1 || result.rows.some((row) => row.overEngineDb < 6))
    throw Error('Combat full-throttle headroom or 6 dB contrast failed');
}
