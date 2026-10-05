import {build} from 'vite';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {wavFromPcm} from './audio-race.mjs';
import {ffmpeg} from '../audio/codec.mjs';

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)));
async function helpers() {
  const entry = resolve(root, '.qa-dist/tollkeeper-entry.virtual.js');
  const modules = {
    'src/combat-armor.js': ['applyArmorDamage'],
    'src/arena/convoy.js': ['convoyPoint', 'convoyValvePoints', 'CONVOY_ROOF_PLATE'],
    'src/onfoot.js': ['createFighter'],
  };
  const result = await build({root, configFile: false, logLevel: 'silent', plugins: [{
    name: 'tollkeeper-native-fixture',
    resolveId: id => id === entry ? '\0tollkeeper-fixture' : null,
    load: id => id === '\0tollkeeper-fixture' ? Object.entries(modules).map(([file, names]) =>
      `export {${names.join(',')}} from ${JSON.stringify(resolve(root, file))};`).join('\n') : null,
  }], build: {write: false, minify: false, lib: {entry, name: 'TollkeeperNative', formats: ['iife']}}});
  const output = Array.isArray(result) ? result[0].output : result.output;
  return output.find(item => item.type === 'chunk').code;
}
async function click(context, selector) {
  const at = await context.evaluate(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});
    if(!b||b.disabled)throw Error('Missing Tollkeeper control '+${JSON.stringify(selector)});
    b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2};})()`);
  for (const type of ['mousePressed', 'mouseReleased'])
    await context.command('Input.dispatchMouseEvent', {type, button: 'left', clickCount: 1, ...at});
}
async function ready(context) {
  await context.waitFor(`(()=>{const a=window.__qaApp;a?.onFrame?.(a.duel.state,0);window.__render?.renderFrame();
    return a?.visualReady&&document.querySelector('#renderer-loading')?.hidden;})()`, 'Tollkeeper assets', 60000);
}
async function yard(context, flags, quality) {
  await context.evaluate('window.name=""');
  await context.navigate('/tools/menu-check.html?flags=' + flags + '&harness=tollkeeper-' + quality);
  await context.waitFor('!!window.__qaApp', 'Tollkeeper memory menu', 60000);
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.setGraphicsQuality(${JSON.stringify(quality)});
    if(!window.name.startsWith('__duel_qa_tab_v2:'))throw Error('Memory-only storage missing');
    document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
    a.cpuDifficulty='medium';a.profile.wasteland.discoveredGate=true;a.profile.wasteland.xp=1000000;
    a.profile.wasteland.territories.tollkeeper.hold=100;
    if(!a._saveProfile()||!a.visitWasteland())throw Error('Tollkeeper yard fixture failed');})()`);
  await ready(context);
  await context.evaluate('window.__qaApp.advance(8)'); await ready(context);
  await click(context, '[data-action="yard-territory"]');
}
async function inspection(context, name) {
  await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],at=a.duel.course.groundAt(r.s,r.lateral),h=at.heading+r.headingError;
    const before=JSON.stringify(s.arena);a.inspectionCamera={position:[at.x+Math.cos(h)*14+Math.sin(h)*10,at.y+9,at.z-Math.sin(h)*14+Math.cos(h)*10],target:[at.x,at.y+1.7,at.z]};
    for(let i=0;i<18;i++)window.__render.renderFrame();
    if(JSON.stringify(s.arena)!==before)throw Error('Tanker inspection changed race state');})()`);
  await context.screenshot(name);
  await context.evaluate('delete window.__qaApp.inspectionCamera;window.__render.renderFrame();');
}

async function recordGateAudio(context) {
  await context.evaluate(`(async()=>{
    const app=window.__qaApp,audio=app.audio;
    audio.unlock();audio.setMuted(false);audio.setPaused(false);
    await Promise.all([audio._samplesPromise,audio._ambiencePromise,audio._cueBuffersPromise]);
    const ctx=audio.context;
    if(ctx?.state!=='running'||ctx.sampleRate<44100)throw Error('Native-rate Tollkeeper audio required');
    const silent=ctx.createGain();silent.gain.value=0;silent.connect(ctx.destination);
    const r=window.__tollkeeperAudio={sampleRate:ctx.sampleRate,startedAt:ctx.currentTime,
      profile:JSON.stringify(app.profile),events:[],cues:[],tracks:{},sources:[],silent,sawWindow:false};
    for(const [name,source] of [['mix',audio.output],['warning',audio.buses.impacts],['engine',audio.buses.engine]]){
      const processor=ctx.createScriptProcessor(2048,2,2),track={chunks:[],firstPlayback:null};
      source.connect(processor);processor.connect(silent);r.tracks[name]=track;r.sources.push({source,processor});
      processor.onaudioprocess=event=>{
        if(track.firstPlayback===null)track.firstPlayback=event.playbackTime;
        const left=event.inputBuffer.getChannelData(0),right=event.inputBuffer.getChannelData(1),pcm=new Int16Array(left.length*2);
        for(let i=0;i<left.length;i++){
          pcm[i*2]=Math.round(Math.max(-1,Math.min(1,left[i]))*32767);
          pcm[i*2+1]=Math.round(Math.max(-1,Math.min(1,right[i]))*32767);
        }track.chunks.push(pcm);
      };
    }
    r.originalPlayCue=audio._playCue;
    audio._playCue=function(id,options){const voice=r.originalPlayCue.call(this,id,options);
      if(voice)r.cues.push({id,audioSec:ctx.currentTime-r.startedAt,simSec:app.duel.state.stageTimeSec});return voice;};
    r.unsubscribe=app.duel.onChange((s,event)=>{
      const kind=event.arenaTell?'tell':event.warlordWindow?event.warlordWindow.open?'window':'cooled':null;
      if(!kind)return;if(kind==='window')r.sawWindow=true;
      r.events.push({kind,audioSec:ctx.currentTime-r.startedAt,simSec:s.stageTimeSec,
        seconds:event.arenaTell?.seconds,cue:event.arenaTell?.cue,callout:s.callout,
        gap:s.opponents[0].tollGate.gapCentre,markers:s.arena.markers.filter(m=>m.kind==='light').length});
    });app.start();
  })()`);
  try{
    await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__tollkeeperAudio;
      return r.sawWindow&&a.duel.state.opponents[0].tollGate.stage==='idle'&&
        a.audio.context.currentTime-r.startedAt>=6.5;})()`, 'native gate tell, gap and cooled window', 12000);
  }finally{
    await context.evaluate(`(()=>{const a=window.__qaApp,r=window.__tollkeeperAudio;
      a.stop();r.unsubscribe();a.audio._playCue=r.originalPlayCue;
      for(const {source,processor} of r.sources){source.disconnect(processor);processor.disconnect();processor.onaudioprocess=null;}
      r.silent.disconnect();a.audio.setPaused(true);})()`);
  }
  const result=await context.evaluate(`(()=>{const a=window.__qaApp,r=window.__tollkeeperAudio,tracks={};
    if(JSON.stringify(a.profile)!==r.profile)throw Error('Gate listening changed the memory career');
    if(a.duel.state.status!=='racing'||!r.sawWindow||a.duel.state.opponents[0].tollGate.stage!=='idle')
      throw Error('Gate listening did not complete the native window');
    for(const [name,track] of Object.entries(r.tracks)){
      const pcm=new Int16Array(track.chunks.reduce((n,c)=>n+c.length,0));let at=0;
      for(const chunk of track.chunks){pcm.set(chunk,at);at+=chunk.length;}
      const bytes=new Uint8Array(pcm.buffer);let binary='';
      for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      let peak=0,energy=0;for(const sample of pcm){const v=sample/32768;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
      tracks[name]={pcmBase64:btoa(binary),frames:pcm.length/2,audioStartSec:track.firstPlayback-r.startedAt,
        peak,rms:Math.sqrt(energy/pcm.length)};
    }
    return{sampleRate:r.sampleRate,channels:2,tracks,events:r.events,cues:r.cues,
      liveVoices:[...a.audio.mixer.voices.values()].reduce((n,set)=>n+set.size,0),
      memoryOnly:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:'),
      profileUnchanged:true,listeningApproved:false};})()`);
  const tells=result.events.filter(e=>e.kind==='tell'),windows=result.events.filter(e=>e.kind==='window'),cooled=result.events.filter(e=>e.kind==='cooled');
  if(!result.memoryOnly||result.liveVoices||tells.length!==1||windows.length!==1||cooled.length!==1||
    tells[0].cue!=='arena.toll-gate'||tells[0].callout!=='TOLL GATE!'||
    windows[0].callout!=='CORE LIT. HIT THE REAR VALVE!'||windows[0].markers!==2||
    !(windows[0].gap>=3&&windows[0].gap<=9)||!result.cues.some(c=>c.id==='arena.toll-gate')||
    windows[0].simSec+1/120<tells[0].simSec+tells[0].seconds||cooled[0].simSec+1/120<windows[0].simSec+3)
    throw Error('Native Tollkeeper listening timing, gap, callout or lifecycle failed');
  for(const [name,track] of Object.entries(result.tracks)){
    if(!(track.frames>result.sampleRate*6&&track.frames<result.sampleRate*9&&track.rms>.00001&&track.peak<1))
      throw Error('Silent, clipped or wrong-length native Tollkeeper '+name+' recording');
    const wav=wavFromPcm(Buffer.from(track.pcmBase64,'base64'),result.sampleRate,result.channels);
    track.file='tollkeeper-'+name+'.wav';await writeFile(join(context.outputDir,track.file),wav);
    if(name==='mix'){
      const mp3=ffmpeg(['-i','pipe:0','-codec:a','libmp3lame','-b:a','128k','-f','mp3','pipe:1'],{input:wav});
      result.listeningFile='tollkeeper-mix.mp3';await writeFile(join(context.outputDir,result.listeningFile),mp3);
    }delete track.pcmBase64;
  }
  await writeFile(join(context.outputDir,'tollkeeper-audio.json'),JSON.stringify(result,null,2)+'\n');
  return result;
}

export async function run(context) {
  const native = await helpers();
  await context.command('Emulation.setDeviceMetricsOverride',
    {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await yard(context, 'salt-flats,crew-gear', 'high');
  await context.evaluate(`(()=>{const a=window.__qaApp;
    if(document.querySelector('[data-warlord="tollkeeper"]')||a.startWarlordFight('tollkeeper'))
      throw Error('Default-off dev fight appeared or started through the actual router');})()`);
  await context.screenshot('tollkeeper-default-off-territory');
  for (const quality of ['high', 'performance']) {
    await yard(context, 'tollkeeper,salt-flats,crew-gear', quality);
    await context.evaluate(native + ';window.__tollkeeperNative=TollkeeperNative;');
    await click(context, '[data-warlord="tollkeeper"]'); await ready(context);
    await context.evaluate(`(()=>{const s=window.__qaApp.duel.state;
      if(s.status!=='warlord_intro'||s.arena.mode!=='warlord'||s.arena.format!=='convoy-raid')
        throw Error('Actual territory action did not start the Warlord charge format');})()`);
    await context.screenshot(quality + '-tollkeeper-intro');
    await click(context, '[data-action="warlord-begin"]'); await ready(context);
    if(process.env.TOLLKEEPER_AUDIO_REVIEW==='1'){
      await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(2.5);a.duel.state.combat.aiTimer=Infinity;})()`);
      return recordGateAudio(context);
    }
    await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(3.1);const s=a.duel.state,r=s.opponents[0];
      s.combat.aiTimer=Infinity;for(const p of s.arena.participants)p.protectedSec=0;
      s.s=s.prevS=r.s-28;s.lateral=s.prevLateral=r.lateral;s.headingError=0;s.invulnerableSec=0;
      a.onFrame?.(s,0);window.__render.renderFrame();
      if(r.tollGate?.stage!=='tell'||!window.__render.scene.getObjectByName('convoy-tanker')?.visible)
        throw Error('Native moving tanker or gate tell missing');})()`);
    await context.screenshot(quality + '-tollkeeper-tell');
    await context.evaluate(`(()=>{const a=window.__qaApp;a.advance(.9);const s=a.duel.state;
      if(s.opponents[0].tollGate.stage!=='window'||s.arena.markers.filter(m=>m.kind==='light').length!==2)
        throw Error('Native gate window or two gap lights missing');a.onFrame?.(s,0);window.__render.renderFrame();})()`);
    await context.screenshot(quality + '-tollkeeper-gap');
    await inspection(context, quality + '-tollkeeper-core-lamps');
    await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],n=window.__tollkeeperNative;
      n.applyArmorDamage(a.duel,r,'fixed',{owner:'player',amount:1000,hitPosition:n.convoyValvePoints(a.duel,r)[2]});
      a.advance(1/120);if(s.arena.warlordPhase!==2||s.status!=='racing')throw Error('Real broken valve did not start phase two');
      r.tollGate.nextGateSec=Infinity;
      n.applyArmorDamage(a.duel,r,'bomb',{owner:'player',damageMultiplier:100,hitPosition:n.convoyValvePoints(a.duel,r)[0],blastRadius:20});
      a.advance(1/120);if(s.arena.convoy.valves.some(v=>v!==0))throw Error('Real valves did not open boarding');
      a.onFrame?.(s,0);window.__render.renderFrame();})()`);
    await context.screenshot(quality + '-tollkeeper-boarding-window');
    await context.evaluate(`(()=>{const a=window.__qaApp,s=a.duel.state,r=s.opponents[0],n=window.__tollkeeperNative,p=n.CONVOY_ROOF_PLATE,
      at=n.convoyPoint(a.duel,r,[p.x,p.y,p.z]),ground=a.duel.course.groundAt(r.s,r.lateral);
      window.__tollkeeperScrapBefore=s.arena.result?null:a.profile.wasteland.scrap;
      window.__tollkeeperSettledBefore=a.profile.wasteland.settledResults.length;
      s.onFoot=true;s.fighter=n.createFighter(a.duel.course,s,{s:r.s,lateral:r.lateral});
      Object.assign(s.fighter,{x:at.x,z:at.z,y:at.y+.02,groundY:ground.y,airHeight:at.y-ground.y+.02,verticalSpeed:-3});
      a.duel.setFighterInput({fire:true});for(let i=0;i<372;i++)a.duel.step(1/120);
      if(s.status!=='arena_result'||s.arena.result.reason!=='charge'||s.arena.mode!=='warlord'||
        !s.arena.result.settlementSaved||s.arena.result.scrapEarned!==1440||
        a.profile.wasteland.scrap-window.__tollkeeperScrapBefore!==1440||
        a.profile.wasteland.settledResults.length!==window.__tollkeeperSettledBefore+1||
        !a.profile.wasteland.territories.tollkeeper.claimed)
        throw Error('The actual rooftop charge or one-time Warlord payment failed');a.onFrame?.(s,0);})()`);
    await context.screenshot(quality + '-tollkeeper-charge-win');
    console.log(quality + ' Tollkeeper actual router, gate, lamps, phase and boarding charge controls passed');
  }
}
