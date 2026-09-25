import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { wavFromPcm } from './audio-race.mjs';
import { measureLoudness } from '../audio/measurements.mjs';
export async function run(context) {
  await context.navigate('/tools/audio/listening.html');
  await context.waitFor('!!window.__listeningBooth', 'voice booth', 30000);
  const booth = await context.evaluate(
    `(async()=>{document.querySelector('#cue-A').value='gatekeeper.welcome';const b=window.__listeningBooth;await b.play('A');await new Promise(r=>setTimeout(r,3500));const live=b.audio.context.state;await b.stop();return {live,duration:b.audio.cueBuffers['gatekeeper.welcome']?.duration};})()`,
  );
  if (booth.live !== 'running' || booth.duration < 4)
    throw Error('Booth cut the approved line short');
  await context.navigate('/tools/menu-check.html?flags=hidden-road');
  await context.waitFor(
    '!!window.__qaApp?.visualReady && !!window.__render',
    'actual gate presentation',
    60000,
  );
  const arrival = await context.evaluate(`(async()=>{
    const a=window.__qaApp;a.stop();a.audio.unlock();a.audio.setMuted(false);
    await Promise.all([a.audio._samplesPromise,a.audio._ambiencePromise,a.audio._cueBuffersPromise]);
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)throw Error('Memory-only storage missing');
    const calls=[],original=a.audio._playCue.bind(a.audio);
    a.audio._playCue=(id,options)=>{if(id==='gatekeeper.welcome')calls.push({id,time:a.audio.context.currentTime});return original(id,options);};
    if(!a.duel.startHiddenRoadVisit({playerId:a.player.id,car:'falcone_f42',seed:1989}))throw Error('Visit fixture failed');
    a.audio.updateHiddenRoad(a.duel.state);a.onFrame?.(a.duel.state,0);
    const caption=document.querySelector('[data-gatekeeper-subtitle]');
    const ducked=a.audio.mixer.ducks.some(d=>d.kind==='voice');
    const initial={phase:a.duel.state.hiddenRoadJourney.phase,visible:!caption.hidden,text:caption.textContent};
    for(let i=0;i<10;i++)a.audio.updateHiddenRoad(a.duel.state);
    a.duel.state.paused=true;for(let i=0;i<4;i++)a.audio.updateHiddenRoad(a.duel.state);
    a.duel.state.paused=false;a.audio.updateHiddenRoad(a.duel.state);
    for(let i=0;i<366;i++)a.duel.step(1/120);a.onFrame?.(a.duel.state,0);
    document.querySelectorAll('details').forEach(n=>n.style.display='none');
    return {initial,ducked,count:calls.length,enteringVisible:!caption.hidden,phase:a.duel.state.hiddenRoadJourney.phase};
  })()`);
  if (
    arrival.count !== 1 ||
    !arrival.ducked ||
    arrival.initial.phase !== 'opening' ||
    !arrival.initial.visible ||
    !arrival.enteringVisible ||
    arrival.phase !== 'entering'
  )
    throw Error(
      'Arrival voice/subtitle lifecycle failed: ' + JSON.stringify(arrival),
    );
  await context.screenshot('gatekeeper-subtitle');
  const measured = await context.evaluate(`(async()=>{
    const Audio=window.__qaApp.audio.constructor,rate=48000,duration=5;
    const native=new OfflineAudioContext(6,rate*duration,rate),merge=native.createChannelMerger(6);merge.connect(native.destination);
    const destination=native.createGain(),split=native.createChannelSplitter(2);destination.connect(split);split.connect(merge,0,0);split.connect(merge,1,1);
    let clock=0;const ctx=new Proxy(native,{get(target,key){if(key==='destination')return destination;if(key==='currentTime')return clock;if(key==='state')return 'running';const value=Reflect.get(target,key,target);if(key==='createBufferSource'){return()=>{const node=value.call(target),start=node.start.bind(node),stop=node.stop.bind(node);node.start=(time=clock,...args)=>start(time,...args);node.stop=(time=clock)=>stop(time);return node;};}return typeof value==='function'?value.bind(target):value;}});
    const audio=new Audio({flags:{enabled:()=>true}});audio.muted=false;audio._build(ctx);await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
    for(const [bus,index] of [['engine',2],['voice',4]]){
      const high=native.createBiquadFilter(),low=native.createBiquadFilter(),gain=native.createGain(),channels=native.createChannelSplitter(2);
      high.type='highpass';high.frequency.value=350;low.type='lowpass';low.frequency.value=4000;gain.gain.value=.42;
      audio.buses[bus].connect(high);high.connect(low);low.connect(gain);gain.connect(channels);channels.connect(merge,0,index);channels.connect(merge,1,index+1);
    }
    const state={car:'falcone_f42',status:'racing',paused:false,mode:'wasteland',maxArmor:100,speedMph:160,revs:.95,gear:3,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,offRoad:false,roughness:0,airborne:false,airHeight:0,impactTimer:0,police:{beep:0,pursuit:null}};
    for(let i=0;i<duration*60;i++){clock=i/60;audio.nextBeat=Infinity;audio.update(state,{biome:'coast'});if(i===30)audio._playCue('gatekeeper.welcome');}
    const buffer=await native.startRendering(),mix=buffer.getChannelData(0),engine=buffer.getChannelData(2),voice=buffer.getChannelData(4);
    let peak=0,voicePower=0,enginePower=0,windows=0;const chunk=Math.round(rate*.2);
    for(let start=Math.round(.5*rate);start<4.5*rate;start+=chunk){let v=0,e=0;for(let i=start;i<Math.min(start+chunk,buffer.length);i++){v+=voice[i]**2;e+=engine[i]**2;}if(Math.sqrt(v/chunk)>.004){voicePower+=v;enginePower+=e;windows++;}}
    const pcm=new Int16Array(buffer.length*2);for(let i=0;i<buffer.length;i++)for(let ch=0;ch<2;ch++){const n=buffer.getChannelData(ch)[i];peak=Math.max(peak,Math.abs(n));pcm[i*2+ch]=Math.round(Math.max(-1,Math.min(1,n))*32767);}
    const bytes=new Uint8Array(pcm.buffer);let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {rate,peak,windows,speechOverEngineDb:10*Math.log10(voicePower/enginePower),pcm:btoa(binary)};
  })()`);
  const wave = wavFromPcm(Buffer.from(measured.pcm, 'base64'), measured.rate);
  delete measured.pcm;
  const loudness = measureLoudness(wave);
  await writeFile(join(context.outputDir, 'gatekeeper-context.wav'), wave);
  await writeFile(
    join(context.outputDir, 'gatekeeper-audio.json'),
    JSON.stringify(
      { booth, arrival, measured, loudness, humanListeningPending: true },
      null,
      2,
    ) + '\n',
  );
  if (
    measured.windows < 5 ||
    measured.speechOverEngineDb < 6 ||
    measured.peak >= 1
  )
    throw Error(
      'Voice full-throttle contrast/headroom failed: ' +
        JSON.stringify(measured),
    );
  console.log(JSON.stringify({ booth, arrival, measured, loudness }));
}
