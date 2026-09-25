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
  const flight = await context.evaluate(`(async()=>{
    const a=window.__qaApp;a.stop();a.audio.unlock();a.audio.setMuted(false);
    await Promise.all([a.audio._samplesPromise,a.audio._ambiencePromise,a.audio._cueBuffersPromise]);
    if(!a.startCampaign({mode:'wasteland',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',seed:1989}))throw Error('Memory race fixture failed');
    a.stop();for(let i=0;i<500&&a.duel.state.status!=='racing';i++)a.duel.step(1/120);
    const state=a.duel.state;state.speedMph=100;state.revs=.9;state.input.throttle=1;
    if(!a.duel.fireWeapon('crossbow'))throw Error('Real bolt launch failed');
    const bolt=state.combat.projectiles.find(p=>p.kind==='crossbow');if(!bolt)throw Error('No real bolt');
    const before=JSON.stringify(state);a._updateAudio();if(JSON.stringify(state)!==before)throw Error('Audio changed race state');
    const voice=a.audio.projectileVoices.get(bolt.id);if(!voice)throw Error('No owned flight voice');
    const x=bolt.x;for(let i=0;i<5;i++)a.duel.step(1/120);a._updateAudio();
    const followed=a.audio.projectileVoices.get(bolt.id)===voice && bolt.x!==x;
    a.audio.setPaused(true);await new Promise(r=>setTimeout(r,100));
    return {followed,remaining:a.audio.projectileVoices.size,active:[...a.audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0),memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value};
  })()`);
  if (
    !flight.followed ||
    flight.remaining ||
    flight.active ||
    !flight.memoryOnly
  )
    throw Error('Real bolt lifecycle failed: ' + JSON.stringify(flight));
  const space = await context.evaluate(`(async()=>{
   const Audio=window.__qaApp.audio.constructor,buffers=window.__qaApp.audio.cueBuffers,rows=[];
   for(const label of ['near','far','approach','recede']){
    const native=new OfflineAudioContext(2,48000*2,48000),a=new Audio({flags:{enabled:()=>true}});
    a._loadSamples=()=>{};a._loadAmbience=()=>{};a._loadCueBuffers=()=>{};a.muted=false;a._build(native);a.cueBuffers=buffers;
    if(label==='near'||label==='far')a._recordedImpact('combat.blast.recorded',{combatExplosion:true,qaDistance:label==='near'?15:400,qaSide:0},{},{});
    else a.mixer.playMoving('weapon.crossbow.flight',buffers['weapon.crossbow.flight'][0],{x:label==='approach'?30:-30,y:0,z:0,vx:-60},{x:0,y:0,z:0});
    const rendered=await native.startRendering(),channels=[rendered.getChannelData(0),rendered.getChannelData(1)],levels=channels.map(c=>Math.sqrt(c.slice(9600,33600).reduce((n,x)=>n+x*x,0)/24000));
    const main=channels[label==='approach'?1:0];let crossings=0;for(let i=9601;i<33600;i++)if(main[i-1]<=0&&main[i]>0)crossings++;
    rows.push({label,left:levels[0],right:levels[1],frequency:crossings*2});
   }return rows;
  })()`);
  if (
    space[1].left >= space[0].left * 0.85 ||
    space[2].right < space[2].left * 1.5 ||
    space[3].left < space[3].right * 1.5 ||
    space[2].frequency <= space[3].frequency * 1.1
  )
    throw Error('Recorded distance/doppler failed: ' + JSON.stringify(space));
  const result = await context.evaluate(`(async()=>{
 const Audio=window.__qaApp.audio.constructor,rate=48000,rows=[],clips=[];
 const ids=['weapon.crossbow.fire','weapon.rpg.fire','combat.blast.recorded','vehicle.crash.recorded','combat.hit-confirm','weapon.ufo.fire','weapon.bomb.fire','weapon.star.fire','raider.shot'];
 const native=new OfflineAudioContext(6,rate*ids.length*3*2,rate),merge=native.createChannelMerger(6);merge.connect(native.destination);
 const destination=native.createGain(),split=native.createChannelSplitter(2);destination.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
 let clock=0;const ctx=new Proxy(native,{get(target,key){if(key==='destination')return destination;if(key==='currentTime')return clock;if(key==='state')return 'running';const value=Reflect.get(target,key,target);if(key==='createBufferSource'){return()=>{const n=value.call(target),start=n.start.bind(n),stop=n.stop.bind(n);n.start=(t=clock,...a)=>start(t,...a);n.stop=(t=clock)=>stop(t);return n;};}return typeof value==='function'?value.bind(target):value;}});
 const audio=new Audio({flags:{enabled:()=>true}});audio.muted=false;audio._build(ctx);await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
 for(const [buses,index] of [[['engine'],2],[['weapons','impacts'],4]]){const gain=native.createGain(),ch=native.createChannelSplitter(2);gain.gain.value=.42;for(const bus of buses)audio.buses[bus].connect(gain);gain.connect(ch);ch.connect(merge,0,index);ch.connect(merge,1,index+1);}
 const state={car:'falcone_f42',status:'racing',paused:false,mode:'wasteland',maxArmor:100,speedMph:160,revs:.95,gear:3,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,offRoad:false,roughness:0,airborne:false,airHeight:0,impactTimer:0,police:{beep:0,pursuit:null}};
 for(let i=0;i<ids.length*3*2*60;i++){clock=i/60;audio.nextBeat=Infinity;audio.update(state,{});if(i%120===30){const n=Math.floor(i/120),id=ids[Math.floor(n/3)],variant=n%3;audio.cueIndices.set(id,variant);if(id==='vehicle.crash.recorded')audio.event({crash:true,strength:.7},state,{});else if(id==='combat.blast.recorded')audio.event({combatExplosion:true,qaDistance:15,qaSide:0},state,{});else audio._playCue(id);rows.push({id,variant:'ABC'[variant],at:clock});}}
 const buffer=await native.startRendering(),mix=buffer.getChannelData(0),engine=buffer.getChannelData(2),effects=buffer.getChannelData(4);
 for(const row of rows){let e=0,w=0;const start=Math.round(row.at*rate),end=start+Math.round(.25*rate);for(let i=start;i<end;i++){e+=engine[i]**2;w+=effects[i]**2;}row.overEngineDb=10*Math.log10(w/e);}
 let peak=0;const pcm=new Int16Array(buffer.length*2);for(let i=0;i<buffer.length;i++)for(let ch=0;ch<2;ch++){const n=buffer.getChannelData(ch)[i];peak=Math.max(peak,Math.abs(n));pcm[i*2+ch]=Math.round(Math.max(-1,Math.min(1,n))*32767);}
 const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {rows,peak,rate,pcm:btoa(binary),voices:[...audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0)};
 })()`);
  const wave = wavFromPcm(Buffer.from(result.pcm, 'base64'), result.rate);
  delete result.pcm;
  result.flight = flight;
  result.space = space;
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
