import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=wasteland2');
  await context.waitFor(
    "!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'isolated moving audio',
    30000,
  );
  const transitions = await context.evaluate(`(async()=>{
    window.__qaApp.stop();
    const flags={wasteland2:false,'hidden-road':false},Audio=window.__qaApp.audio.constructor;
    const audio=new Audio({flags:{enabled:name=>flags[name]===true}});
    audio._loadSamples=()=>{};audio._loadAmbience=()=>{};audio._loadCueBuffers=()=>{};
    audio.muted=false;audio._build(new AudioContext());await audio.context.resume();
    const oscillator=audio.context.createOscillator(),gain=audio.context.createGain(),meter=audio.context.createAnalyser();
    oscillator.frequency.value=440;gain.gain.value=.08;oscillator.connect(gain);audio.mixer.connect(gain,audio.buses.weapons);audio.output.connect(meter);meter.fftSize=2048;oscillator.start();
    const rows=[];
    for(const [label,combat,gate] of [['off',false,false],['on',true,false],['off-again',false,false],['gate-only',false,true]]){
      flags.wasteland2=combat;flags['hidden-road']=gate;audio._syncMixer();await new Promise(r=>setTimeout(r,120));
      const samples=new Float32Array(2048);meter.getFloatTimeDomainData(samples);
      rows.push({label,grouped:audio.mixer.grouped,rms:Math.sqrt(samples.reduce((n,x)=>n+x*x,0)/samples.length)});
    }
    const routes=audio.mixer.routes.size;oscillator.stop();audio.mixer.disconnect(gain);gain.disconnect();
    const released=audio.mixer.routes.size===routes-1;await audio.context.close();return {rows,released};
  })()`);
  const levels = transitions.rows.map((row) => row.rms);
  if (
    !transitions.released ||
    levels.some((n) => n < 0.01) ||
    Math.max(...levels) / Math.min(...levels) > 1.08 ||
    transitions.rows.map((row) => row.grouped).join(',') !==
      'false,true,false,true'
  )
    throw Error(
      'Live routing transition doubled, silenced or leaked audio: ' +
        JSON.stringify(transitions),
    );
  await writeFile(
    join(context.outputDir, 'routing-transitions.json'),
    JSON.stringify(transitions, null, 2) + '\n',
  );
  const rows = await context.evaluate(`(async()=>{
  const Audio=window.__qaApp.audio.constructor,rows=[];
  for(const [label,x,vx]of [['approach',30,-30],['recede',-30,-30]]){
   let clock=0;
   const native=new OfflineAudioContext(2,88200,44100);
   const context=new Proxy(native,{get(target,key){if(key==='currentTime')return clock;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
   const audio=new Audio({flags:{enabled:()=>true}});audio.muted=false;audio._build(context);
   await Promise.all([audio._samplesPromise,audio._ambiencePromise]);
   const buffer=native.createBuffer(1,44100,44100),samples=buffer.getChannelData(0);
   for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i/44100*2*Math.PI*440);
   const ear={x:0,y:0,z:0},voice=audio.mixer.playMoving('engine.high',buffer,{x,y:0,z:0,vx},ear,{volume:.3,loop:true});
   clock=1.8;voice.stop();
   const rendered=await native.startRendering();
   const channels=[rendered.getChannelData(0),rendered.getChannelData(1)];
   const levels=channels.map(channel=>Math.sqrt(channel.slice(22050,66150).reduce((n,x)=>n+x*x,0)/44100));
   const main=channels[label==='approach'?1:0];let crossings=0;
   for(let i=22051;i<66150;i++)if(main[i-1]<=0&&main[i]>0)crossings++;
   rows.push({label,left:levels[0],right:levels[1],frequency:crossings,voices:audio.mixer.voices.get('engine.high').size,connected:voice.output.input.numberOfOutputs});
  }
  return rows;
 })()`);
  await writeFile(
    join(context.outputDir, 'moving-audio.json'),
    JSON.stringify(rows, null, 2) + '\n',
  );
  console.log(JSON.stringify(rows));
  if (rows[0].right < rows[0].left * 1.5 || rows[1].left < rows[1].right * 1.5)
    throw Error('3D channel direction failed');
  if (rows[0].frequency < 465 || rows[1].frequency > 420)
    throw Error('Moving source doppler failed');
  if (rows.some((row) => row.voices !== 0))
    throw Error('Ended moving voice leaked');
}
