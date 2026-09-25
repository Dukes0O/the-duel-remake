import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Rebuild the reference from text history; never commit a second audio engine.
// This reference predates imports in audio.js. Stop if given a newer module.
export async function run(context) {
  const ref = process.env.DUEL_AUDIO_BASELINE || 'cf72d9c';
  const legacy = execFileSync('git', ['show', ref + ':src/audio.js'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (/^import /m.test(legacy))
    throw Error('Baseline requires an import-free pre-bank audio.js');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(
    "!!window.__qaApp && !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value",
    'isolated baseline comparison',
    30000,
  );
  await context.evaluate(`window.__baselineResult=null;window.__baselineError=null;(async()=>{
    const Legacy=new Function(${JSON.stringify(legacy.replaceAll('export ', ''))}+';return EngineAudio;')();
    const Current=window.__qaApp.audio.constructor;
    const fetchOriginal=window.fetch.bind(window);
    const assets=['engine-loop','tire-loop','engine-idle','engine-load-low','engine-load-mid','engine-load-high','engine-coast','engine-throttle','engine-lift','engine-shift','catastrophic-blast','ambience-coast','ambience-forest','ambience-stadium'];
    const cached=new Map(await Promise.all(assets.map(async name=>[name,await(await fetchOriginal('/assets/audio/'+name+'.flac')).arrayBuffer()])));
    window.fetch=async (url,...rest)=>{
      const name=String(url).split('/').at(-1).replace(/\\.(wav|flac)$/,'');
      return cached.has(name)?new Response(cached.get(name).slice(0)):fetchOriginal(url,...rest);
    };
    const cases=[
      ['race',null], ['wide',{cameraMode:'wide'}], ['hood',{cameraMode:'hood',tunnel:1}],
      ['events',null], ['gate',null]
    ];
    async function render(Audio,name,environment){
      let clock=0,seed=1989,decodeTail=Promise.resolve();
      const duration=name==='race'?14:5,rate=44100;
      const native=new OfflineAudioContext(2,duration*rate,rate);
      const context=new Proxy(native,{get(target,key){
        if(key==='decodeAudioData')return bytes=>decodeTail=decodeTail.then(()=>target.decodeAudioData(bytes));
        if(key==='state')return 'running';if(key==='currentTime')return clock;
        const value=Reflect.get(target,key,target);
        if(key==='createBufferSource'||key==='createOscillator')return ()=>{
          const node=value.call(target),start=node.start.bind(node),stop=node.stop.bind(node);
          node.start=(time=clock,...rest)=>start(time,...rest);node.stop=(time=clock)=>stop(time);return node;
        };
        return typeof value==='function'?value.bind(target):value;
      }});
      const random=Math.random;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
      const audio=new Audio({flags:{enabled:()=>false}});audio.muted=false;audio._build(context);Math.random=random;
      await Promise.all([audio._samplesPromise,audio._ambiencePromise]);
      if(audio.sampleStatus!=='ready'||audio.ambienceStatus!=='ready')throw Error('Samples missing in '+name);
      const course={groundAt:()=>({x:0,y:0,z:0,heading:0})};
      const events=[{countdown:1},{go:true},{weaponFired:'crossbow'},{shift:2},{weaponFired:'bomb'},
        {combatExplosion:true,qaSide:-1,qaDistance:15},{combatHit:true,hitPosition:{x:20,y:0,z:0}},
        {chickenBonus:true},{jumpLanded:{distance:8}},{propCrushed:{byPlayer:true,strength:.8}},
        {boostStarted:true},{nearMiss:true},{stageResult:{won:true}},{ticket:true},{crash:true,strength:.7},
        {footRepairStarted:true},{footRepairCompleted:true},{footRepairInterrupted:true},{raiderWarning:true},
        {raiderShot:true,hitPosition:{x:-20,y:0,z:10}},{weaponFired:'rpg'},
        {combatExplosion:true,audioWeapon:'rpg',audioImpact:'direct',hitPosition:{x:20,y:0,z:0}}];
      for(let frame=0;frame<duration*60;frame++){
        clock=frame/60;
        const state={car:'falcone_f42',mode:'wasteland',maxArmor:100,status:'racing',paused:false,s:0,lateral:0,
          speedMph:120,revs:.25+.65*(frame%120)/120,gear:2,input:{throttle:1,brake:0},slipAngle:0,
          steerVisual:0,offRoad:false,roughness:0,airborne:false,airHeight:0,impactTimer:0,police:{beep:0,pursuit:null}};
        if(name==='gate'){
          state.status='exploring';state.hiddenRoadJourney={id:1,departed:true,phase:clock<2.4?'arriving':'opening',phaseElapsedSec:clock<2.4?clock:clock-2.4,elapsedSec:clock,controlsLocked:true};
        }
        audio.update(state,{biome:'coast',...environment});
        if(frame%12===0 && events[frame/12])audio.event(events[frame/12],state,course);
      }
      const rendered=await native.startRendering();
      let readRepeatPeak=0;
      for(let ch=0;ch<2;ch++){
        const first=Float32Array.from(rendered.getChannelData(ch)),second=rendered.getChannelData(ch);
        for(let i=0;i<first.length;i++)readRepeatPeak=Math.max(readRepeatPeak,Math.abs(first[i]-second[i]));
      }
      rendered.readRepeatPeak=readRepeatPeak;await native.close?.();return rendered;
    }
    const rows=[];
    try{for(const [name,environment]of cases){
      const old=await render(Legacy,name,environment),now=await render(Current,name,environment),repeat=await render(Legacy,name,environment);
      let repeatPeak=0;for(let ch=0;ch<2;ch++){const a=old.getChannelData(ch),b=repeat.getChannelData(ch);for(let i=0;i<a.length;i++)repeatPeak=Math.max(repeatPeak,Math.abs(a[i]-b[i]));}
      let peak=0,power=0,count=0,peakTime=0,peakChannel=0;
      for(let channel=0;channel<2;channel++){
        const a=old.getChannelData(channel),b=now.getChannelData(channel);
        for(let i=0;i<a.length;i++){const delta=a[i]-b[i];if(Math.abs(delta)>peak){peak=Math.abs(delta);peakTime=i/44100;peakChannel=channel;}power+=delta*delta;count++;}
      }
      rows.push({name,readRepeatPeak:Math.max(old.readRepeatPeak,now.readRepeatPeak),repeatPeak,peakTime,peakChannel,peakDifference:peak,rmsDifference:Math.sqrt(power/count),samples:count});
    }}finally{window.fetch=fetchOriginal;}
    return rows;
  })().then(value=>window.__baselineResult=value,error=>window.__baselineError=String(error));true`);
  await context.waitFor(
    'window.__baselineResult || window.__baselineError',
    'baseline render completed',
    120000,
  );
  const error = await context.evaluate('window.__baselineError');
  if (error) throw Error(error);
  const result = await context.evaluate('window.__baselineResult');
  await writeFile(
    join(context.outputDir, 'baseline-comparison.json'),
    JSON.stringify({ ref, memoryOnlySaves: true, rows: result }, null, 2) +
      '\n',
  );
  console.log(JSON.stringify(result));
  if (result.some((row) => row.peakDifference > 0.000002))
    throw Error('Baseline audio changed; investigate before handoff.');
}
