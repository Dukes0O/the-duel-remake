import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {EngineAudio} from '../src/audio.js';
import {App} from '../src/app.js';
import {CARS,COURSE} from '../src/config.js';

let checks=0,commands=0;
const check=(condition,message)=>{assert(condition,message);checks++;};
function decodeWav(bytes){
  assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');let format,pcm;
  for(let p=12;p+8<=bytes.length;){const size=bytes.readUInt32LE(p+4),name=bytes.toString('ascii',p,p+4);if(name==='fmt ')format={type:bytes.readUInt16LE(p+8),channels:bytes.readUInt16LE(p+10),rate:bytes.readUInt32LE(p+12),bits:bytes.readUInt16LE(p+22)};if(name==='data')pcm=bytes.subarray(p+8,p+8+size);p+=8+size+(size%2);}
  assert(format&&pcm);assert.equal(format.type,1);assert.equal(format.channels,1);assert([16,24].includes(format.bits));const width=format.bits/8;
  return {...format,samples:Float32Array.from({length:pcm.length/width},(_,i)=>pcm.readIntLE(i*width,width)/2**(format.bits-1))};
}
const readWav=file=>decodeWav(fs.readFileSync(new URL(`../public/assets/audio/${file}`,import.meta.url)));
const envelopeSwing=(data,rate=44100)=>{const window=Math.round(rate*.1),rms=[];for(let i=0;i+window<=data.length;i+=window){let sum=0;for(let j=i;j<i+window;j++)sum+=data[j]**2;rms.push(Math.sqrt(sum/window));}return 20*Math.log10(Math.max(...rms)/Math.max(1e-9,Math.min(...rms)));};
class Param {
  constructor(value=0){this.value=value;}
  set value(value){assert(Number.isFinite(value),'finite audio parameter');this.current=value;commands++;}
  get value(){return this.current;}
  setValueAtTime(value,time){assert(Number.isFinite(time));this.value=value;}
  setTargetAtTime(value,time,constant){assert(Number.isFinite(time)&&constant>0);this.lastTimeConstant=constant;this.value=value;}
  linearRampToValueAtTime(value,time){this.setValueAtTime(value,time);}
  exponentialRampToValueAtTime(value,time){assert(value>0);this.setValueAtTime(value,time);}
  cancelScheduledValues(time){assert(Number.isFinite(time));}
}
class Node {
  constructor(context,type){this.context=context;this.type=type;this.connections=[];context.nodes.push(this);}
  connect(destination){assert(destination);this.connections.push(destination);return destination;}
  disconnect(){this.connections=[];}
  start(time=this.context.currentTime){this.started=time;}
  stop(time=this.context.currentTime){this.stopAt=time;}
}
class MockContext {
  constructor(){this.nodes=[];this.currentTime=0;this.sampleRate=44100;this.state='running';this.destination={};}
  node(type,params){const node=new Node(this,type);for(const [name,value] of Object.entries(params))node[name]=new Param(value);return node;}
  createGain(){return this.node('gain',{gain:1});}
  createBiquadFilter(){return this.node('filter',{frequency:350,Q:1});}
  createDelay(){return this.node('delay',{delayTime:0});}
  createOscillator(){return this.node('oscillator',{frequency:440});}
  createBufferSource(){return this.node('source',{playbackRate:1});}
  createDynamicsCompressor(){return this.node('compressor',{threshold:-24,knee:30,ratio:12});}
  createBuffer(channels,length,sampleRate){const data=Array.from({length:channels},()=>new Float32Array(length));return {duration:length/sampleRate,sampleRate,length,numberOfChannels:channels,getChannelData:index=>data[index]};}
  async decodeAudioData(arrayBuffer){
    const decoded=decodeWav(Buffer.from(arrayBuffer)),buffer=this.createBuffer(decoded.channels,decoded.samples.length,decoded.rate);buffer.getChannelData(0).set(decoded.samples);return buffer;
  }
  advance(seconds){this.currentTime+=seconds;for(const node of this.nodes){const natural=node.type==='source'&&!node.loop&&node.buffer&&node.started!=null?node.started+node.buffer.duration/node.playbackRate.value:Infinity;const end=node.stopAt??natural;if(!node.ended&&end<=this.currentTime){node.ended=true;node.onended?.();}}}
}
globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
async function makeAudio(failed=new Set()){
  globalThis.fetch=async url=>{const file=url.split('/').at(-1);if(failed.has(file)||failed.has('*'))throw Error('simulated download failure');const bytes=fs.readFileSync(new URL(`../public/assets/audio/${file}`,import.meta.url));return {ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};};
  const audio=new EngineAudio(),context=new MockContext();audio._build(context);await new Promise(setImmediate);return {audio,context};
}
const state=(overrides={})=>({car:'falcone_f42',status:'racing',paused:false,impactTimer:0,speedMph:200,revs:1,input:{throttle:1,brake:0},slipAngle:0,steerVisual:0,offRoad:false,roughness:0,airborne:false,airHeight:0,police:{beep:0,pursuit:null},...overrides});
const {audio,context}=await makeAudio();check(audio.sampleStatus==='ready','all eleven runtime recordings loaded');
check(audio.ambienceStatus==='ready'&&Object.keys(audio.ambience).length===3,'all three local ambience recordings decode');
const ambientSources=Object.values(audio.ambience).map(layer=>layer.source),sourceCount=context.nodes.length;
await audio._loadAmbience();check(context.nodes.length===sourceCount&&Object.values(audio.ambience).every((layer,index)=>layer.source===ambientSources[index]),'repeated loading cannot duplicate ambience buffers or loop voices');
check(Object.values(audio.ambience).every(layer=>layer.source.loop&&layer.source.playbackRate.value===1&&layer.gain.connections.includes(audio.master)&&!layer.gain.connections.includes(audio.vehicleBus)),'one unpitched voice per ambience stays outside vehicle reflections');
check(new EngineAudio().context===null&&new EngineAudio().ambienceStatus==='locked','ambience does not initialize before the existing gesture unlock');
audio.update(state({speedMph:0,input:{throttle:0,brake:0}}),{biome:'coast'});const openCoast=audio.ambience.coast.gain.gain.value;
check(openCoast===.18&&audio.ambience.alpine.gain.gain.value===0&&audio.ambience.arena.gain.gain.value===0,'coast selects only quiet surf');
audio.update(state(),{biome:'coast'});check(audio.ambience.coast.gain.gain.value<openCoast*.6,'high speed and throttle reduce exterior ambience below the engine');
audio.update(state({speedMph:0,input:{throttle:0,brake:0}}),{biome:'coast',tunnel:1});check(audio.ambience.coast.gain.gain.value<openCoast*.13,'tunnels attenuate exterior recordings');
audio.update(state(),{biome:'alpine'});check(audio.ambience.coast.gain.gain.value===0&&audio.ambience.alpine.gain.gain.value>0&&Object.values(audio.ambience).every(layer=>layer.gain.gain.lastTimeConstant===.65),'section transitions crossfade using a shared short time constant');
audio.update(state(),{biome:'alpine',night:true});check(audio.ambience.alpine.gain.gain.value===0,'night routes do not play the daytime forest recording');
audio.update(state(),{biome:'arena'});check(audio.ambience.arena.gain.gain.value>0&&audio.ambience.alpine.gain.gain.value===0,'stadium crowd plays only in the arena');
for(const biome of ['desert','city',undefined]){audio.update(state(),{biome});check(Object.values(audio.ambience).every(layer=>layer.gain.gain.value===0),'unsupported sections fade to silence without invented recording attribution');}
audio.update(state({paused:true}),{biome:'arena'});check(audio.master.gain.value===0&&Object.values(audio.ambience).every(layer=>layer.gain.gain.value===0),'pause silences all ambient loops');
audio.update(state(),{biome:'arena'});audio.setMuted(true);check(audio.master.gain.value===0,'mute gates ambient recordings through the shared master');audio.setMuted(false);
audio.update(state({status:'menu'}),{biome:'arena'});check(Object.values(audio.ambience).every(layer=>layer.gain.gain.value===0),'returning to menu fades the previous race ambience');
const ambientManifest=JSON.parse(fs.readFileSync(new URL('../public/assets/audio/AMBIENCE_SOURCES.json',import.meta.url)));
for(const asset of ambientManifest.sources){
  const original=fs.readFileSync(new URL(`../public/assets/audio/${asset.original}`,import.meta.url));check(createHash('sha256').update(original).digest('hex')===asset.sha256,`${asset.original}: downloaded source is preserved byte for byte`);
  const {samples,rate,bits}=readWav(asset.runtime),diffs=new Float32Array(samples.length-1);let peak=0,power=0;for(let i=0;i<samples.length;i++){peak=Math.max(peak,Math.abs(samples[i]));power+=samples[i]**2;if(i)diffs[i-1]=Math.abs(samples[i]-samples[i-1]);}diffs.sort();
  const seam=Math.abs(samples[0]-samples.at(-1));check(rate===44100&&bits===16&&samples.length/rate>=7,`${asset.runtime}: bounded nontrivial PCM loop`);
  check(peak<=.551&&Math.sqrt(power/samples.length)>.01,`${asset.runtime}: audible PCM with conservative peak headroom`);
  check(seam<=diffs[Math.floor(diffs.length*.99)]*1.25,`${asset.runtime}: loop boundary is not an exceptional sample jump`);
}
const rates=[];
for(const car of Object.keys(CARS)){
  const st=state({car});for(let n=0;n<180;n++){context.advance(1/60);audio.update(st);}
  const rate=audio.samples.loadHigh.source.playbackRate.value,gain=audio.samples.loadHigh.gain.gain.value;rates.push(rate);
  for(let n=0;n<90;n++){context.advance(1/60);audio.update(st);const voices=['engine','idle','loadLow','loadMid','loadHigh','coast'].filter(key=>audio.samples[key].gain.gain.value>.001);assert.deepEqual(voices,['loadHigh']);assert(Math.abs(audio.samples.loadHigh.gain.gain.value-gain)<1e-6);assert.equal(audio.samples.loadHigh.source.playbackRate.value,rate);}
  check(rate>=.65&&rate<=1.4,`${car} has bounded steady high-speed pitch`);
  check(audio.engineGain.gain.value===0,`${car} has no synthesized overlay with samples loaded`);
  check(audio.samples.loadHigh.filter.frequency.value<=3000,`${car} avoids excessive top-band brightness`);
}
check(new Set(rates).size===7,'each car has a distinct stable voicing');
const seamRows=[];
for(const [file,limit] of [['engine-idle.wav',6],['engine-load-low.wav',2],['engine-load-mid.wav',2],['engine-load-high.wav',2],['engine-coast.wav',4],['engine-loop.wav',4],['tire-loop.wav',3]]){
  const decoded=readWav(file),x=decoded.samples,diffs=Array.from({length:x.length-1},(_,i)=>Math.abs(x[i+1]-x[i])).sort((a,b)=>a-b),seam=Math.abs(x[0]-x.at(-1)),swing=envelopeSwing(x);
  check(decoded.rate===44100&&decoded.bits===16,`${file} runtime PCM format`);
  check(x.every(value=>Math.abs(value)<1),`${file} has no clipped samples`);
  check(seam<=diffs[Math.floor(diffs.length*.99)]*1.25,`${file} seam is not an exceptional sample jump`);
  check(swing<=limit,`${file} has bounded repeated loudness variation`);seamRows.push(`${file}: seam ${seam.toFixed(5)}, 100ms swing ${swing.toFixed(2)}dB`);
}
let maximumBlendSwing=0;
for(const car of Object.keys(CARS))for(const targetRpm of [.31,.545,.735,1]){
  const st=state({car,revs:(targetRpm-.18)/.82});for(let i=0;i<100;i++){context.advance(1/60);audio.update(st);}
  const layers=['idle','loadLow','loadMid','loadHigh'].map(key=>audio.samples[key]).filter(layer=>layer.gain.gain.value>.001),rendered=new Float32Array(44100*6);
  for(const layer of layers){const x=layer.source.buffer.getChannelData(0),rate=layer.source.playbackRate.value,gain=layer.gain.gain.value;for(let i=0;i<rendered.length;i++){const position=i*rate,index=Math.floor(position),fraction=position-index;rendered[i]+=(x[index%x.length]*(1-fraction)+x[(index+1)%x.length]*fraction)*gain;}}
  const swing=envelopeSwing(rendered);maximumBlendSwing=Math.max(maximumBlendSwing,swing);check(swing<7,`${car} steady PCM mix avoids deep beating`);check(rendered.every(value=>Math.abs(value)<1),`${car} steady PCM mix has headroom`);
}
for(const file of ['engine-source.wav','v8-rev-source.wav','acceleration-source.wav','tire-squeal.wav']){const decoded=readWav(file);check(decoded.samples.length>decoded.rate/2&&decoded.samples.some(value=>Math.abs(value)>.01),`${file} source PCM decodes to non-silent samples`);}
for(const revs of [0,.12,.4,.7,1,1.15])for(const throttle of [0,1]){context.advance(.1);audio.update(state({car:'viper_proto',revs,input:{throttle,brake:0}}));for(const key of ['engine','idle','loadLow','loadMid','loadHigh','coast'])check(audio.samples[key].source.playbackRate.value<=1.4,`${key} rate capped throughout rev/load changes`);}
audio.update(state({input:{throttle:1,brake:1},slipAngle:.3}));check(audio.samples.squeal.gain.gain.value>0,'asphalt sliding uses recorded squeal');
audio.update(state({input:{throttle:1,brake:1},slipAngle:.3}),{looseSurface:true});check(audio.samples.squeal.gain.gain.value===0&&audio.gravel.gain.gain.value>0,'rally dirt uses gravel without asphalt squeal');
audio.update(state({airborne:true,airHeight:2,offRoad:true,input:{throttle:1,brake:1},slipAngle:.3}),{looseSurface:true});check(audio.samples.squeal.gain.gain.value===0&&audio.gravel.gain.gain.value===0&&audio.tires.gain.gain.value===0,'airborne tires are quiet');
audio.update(state(),{tunnel:1});check(audio.tunnelWet.gain.value===.09,'tunnel reflections remain subtle');check(audio.tunnelTaps.every(tap=>tap.delay.delayTime.value<=.14),'reflections use fixed short delays');
check(audio.samples.loadHigh.gain.connections.includes(audio.vehicleBus)&&audio.samples.squeal.gain.connections.includes(audio.vehicleBus),'engine and tire recordings feed reflection bus');
audio.update(state(),{tunnel:0});check(audio.tunnelWet.gain.value===0,'open road has no reflections');
audio.update(state({police:{beep:0,pursuit:{active:true,gapU:650}}}));const far=audio.sirenGain.gain.value;
audio.update(state({police:{beep:0,pursuit:{active:true,gapU:10}}}));check(audio.sirenGain.gain.value>far&&audio.sirenGain.gain.value<=.064,'nearby police sound louder within bounded gain');check(audio.sirenHarmony.frequency.value===audio.siren.frequency.value*1.5,'original siren has two controlled voices');
audio.update(state({police:{beep:0,pursuit:{active:true,gapU:10,distanceU:650}}}));check(audio.sirenGain.gain.value===far,'siren uses physical distance across shortcuts');
audio.update(state());check(audio.sirenGain.gain.value===0,'inactive pursuit silences siren');
audio.event({shift:2});check([...audio.activeShots].at(-1).gain.connections.includes(audio.vehicleBus),'shift accents receive vehicle reflections');
audio.event({jumpLanded:{distance:40}});check(context.nodes.at(-1).connections.includes(audio.vehicleBus),'landing thump uses vehicle bus');
const beforeRivalCrush=context.nodes.length;audio.event({propCrushed:{id:'rival-crush',byPlayer:false,strength:.8}});check(context.nodes.length===beforeRivalCrush,'rival crushes do not play the close player impact');const beforePlayerCrush=context.nodes.length;audio.event({propCrushed:{id:'player-crush',byPlayer:true,strength:.8}});const crushSource=context.nodes.slice(beforePlayerCrush).find(node=>node.type==='source');check(crushSource.buffer===audio.noiseBuffer&&crushSource.playbackRate.value===.72,'player crush reuses the original collision-noise source at lower rate');check(crushSource.stopAt-context.currentTime<=.27,'crush impact is brief and bounded');check(!context.nodes.slice(beforePlayerCrush).some(node=>node.buffer===audio.samples.explosion),'crush sound cannot trigger the fatal explosion recording');
audio.update(state({paused:true}),{tunnel:1,looseSurface:true});check(audio.master.gain.value===0&&audio.tunnelWet.gain.value===0,'pause silences master and tunnel send');check([...audio.activeShots].every(shot=>shot.stopping),'pause stops recorded transients');
context.advance(.1);check(audio.activeShots.size===0,'stopped transients disconnect and leave no active voices');
audio.update(state());audio.setMuted(true);const before=context.nodes.length;audio.event({crash:'rock',explosion:true});check(audio.master.gain.value===0&&context.nodes.length===before,'muting suppresses event sounds');audio.setMuted(false);
const partial=await makeAudio(new Set(['engine-load-high.wav']));partial.context.advance(.1);partial.audio.update(state());check(partial.audio.sampleStatus==='fallback'&&partial.audio.samples.engine.gain.gain.value>0,'missing high band uses original recorded fallback');
const absentAmbience=await makeAudio(new Set(['ambience-coast.wav']));absentAmbience.context.advance(.1);absentAmbience.audio.update(state(),{biome:'coast'});check(absentAmbience.audio.ambienceStatus==='partial'&&absentAmbience.audio.sampleStatus==='ready'&&absentAmbience.audio.samples.loadHigh.gain.gain.value>0,'missing ambience cannot degrade loaded engine or tires');
const missing=await makeAudio(new Set(['*']));missing.audio.update(state());check(missing.audio.sampleStatus==='fallback'&&missing.audio.engineGain.gain.value>0,'all asset failures retain synthetic engine');
const app=new App();const stage=COURSE.findIndex(item=>item.sections?.some(section=>section.theme==='alpine')&&!item.requiredCar);app.duel.startCampaign({startStage:stage});const tunnel=app.duel.course.features.tunnels[0];assert(tunnel);let forwarded;app.audio.update=(_state,environment)=>{forwarded=environment;};app.duel.state.s=tunnel.start+30;app.duel.state.lateral=0;app._updateAudio();check(forwarded.tunnel===1,'App forwards actual tunnel interior');app.duel.state.s+=app.duel.course.length;app._updateAudio();check(forwarded.tunnel===1,'second physical lap keeps tunnel sound');app.duel.state.lateral=tunnel.width+3;app._updateAudio();check(forwarded.tunnel===0,'outside a tunnel wall does not add tunnel sound');
check(forwarded.biome===app.duel.course.themeAt(app.duel.state.s)&&forwarded.night===false,'App forwards actual wrapped section biome and daylight state');
const nightStage=COURSE.findIndex(item=>item.timeOfDay==='night'&&!item.requiredCar);app.duel.startCampaign({startStage:nightStage});app._updateAudio();check(forwarded.night===true&&forwarded.biome===app.duel.course.themeAt(0),'night course forwards its actual ambience metadata');
console.log(seamRows.join('\n'));console.log(`Six-second PCM mixes at three band transitions and full speed across all seven cars: maximum 100ms envelope swing ${maximumBlendSwing.toFixed(2)}dB.`);
console.log(`Audio/PCM: ${checks} checks passed; ${commands.toLocaleString()} finite automation commands. Actual PCM decoded; no listening claim.`);
