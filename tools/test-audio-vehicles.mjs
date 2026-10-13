import assert from 'node:assert/strict';
import {EngineAudio} from '../src/audio.js';
import {SoundMixer,spatialMotion} from '../src/sound-mixer.js';
import {SOUND_BANK,CAR_VOICES} from '../src/sound-bank.js';
import {App} from '../src/app.js';
import {FEATURE_STATES} from '../src/feature-flags.js';

let checks=0;
const check=(value,label)=>{assert(value,label);checks++;};
const equal=(value,wanted,label)=>{assert.deepEqual(value,wanted,label);checks++;};
class Param {
  constructor(value=0){this.value=value;this.calls=[];}
  setValueAtTime(value,time){assert(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.calls.push(['set',value,time]);}
  setTargetAtTime(value,time,constant){assert(Number.isFinite(value)&&Number.isFinite(time)&&constant>0);this.value=value;this.calls.push(['target',value,time,constant]);}
  linearRampToValueAtTime(value,time){assert(Number.isFinite(value)&&Number.isFinite(time));this.value=value;this.calls.push(['ramp',value,time]);}
  cancelScheduledValues(time){this.calls.push(['cancel',time]);}
}
class Node {
  constructor(context,type){this.context=context;this.type=type;this.connections=[];context.nodes.push(this);}
  connect(node){this.connections.push(node);return node;}
  disconnect(){this.connections=[];}
  start(){this.started=this.context.currentTime;}
  stop(at=this.context.currentTime){this.stopAt=at;}
}
class Context {
  constructor(){this.currentTime=0;this.state='running';this.nodes=[];}
  createGain(){const n=new Node(this,'gain');n.gain=new Param(1);return n;}
  createBufferSource(){const n=new Node(this,'source');n.playbackRate=new Param(1);return n;}
  createPanner(){const n=new Node(this,'panner');for(const axis of ['X','Y','Z'])n['position'+axis]=new Param();return n;}
  advance(seconds){this.currentTime+=seconds;for(const n of this.nodes)if(!n.ended&&n.stopAt!=null&&n.stopAt<=this.currentTime){n.ended=true;n.onended?.();}}
}
const flags={on:true,enabled(name){return name==='rival-voices'&&this.on;}};
const actor=(s,id,car='falcone_f42')=>({s,lateral:0,speedMph:60,revs:.5,...(id?{id}:{}),car});
const course={def:{},themeAt:()=> 'coast',groundAt(s,lateral){return {x:lateral,y:0,z:s,heading:0};}};
const listener={x:0,y:1.3,z:0,heading:0,vx:0,vy:0,vz:0};
const state={status:'racing',paused:false,opponents:[actor(50,'b'),actor(50,'a'),actor(90,'c'),actor(150,'d')],traffic:[actor(20),actor(40),actor(60),actor(80),actor(100)]};
const owner={_switches:()=>flags};
const snapshot=()=>App.prototype._vehicleAudioSnapshot.call(owner,state,course,listener);
check(FEATURE_STATES['rival-voices']==='dev','new rival voices stay dev');
const before=JSON.stringify(state),selected=snapshot();
equal(selected.rivals.map(row=>row.id),['a','b','c'],'three nearest rivals tie by authored id');
equal(selected.traffic.map(row=>row.id),['0','1','2','3'],'four traffic retain original spawn identity');
check(selected.stage===course&&selected.rivals[0].actor===state.opponents[1],'private actual stage and actor references');
equal(JSON.stringify(state),before,'snapshot never mutates simulation');
state.traffic.reverse();
equal(snapshot().traffic.map(row=>row.id),['0','1','2','3'],'distance sorting cannot reassign original spawn indices');
state.traffic.reverse();
state.opponents[0].wrecked={};state.traffic[0].alive=false;
check(!snapshot().rivals.some(row=>row.id==='b')&&!snapshot().traffic.some(row=>row.id==='0'),'wrecked and dead actors are absent');
delete state.opponents[0].wrecked;delete state.traffic[0].alive;
state.opponents.push(actor(251,'outside'));check(!snapshot().rivals.some(row=>row.id==='outside'),'250m radius is enforced');
state.opponents.pop();
const motion=spatialMotion({x:20,z:0,vx:-30},{x:0,z:0});
check(motion.x>0&&motion.rate>1,'actual approach and right-side projection');
check(spatialMotion({x:-20,z:0,vx:-30},{x:0,z:0}).rate<1,'actual recession slows rate');

function audioFixture(){
  const ctx=new Context(),audio=new EngineAudio({flags});audio.muted=false;audio.context=ctx;
  const master=ctx.createGain();audio.master=master;audio.mixer=new SoundMixer(ctx,master,{enabled:false,voiceEnabled:true});
  audio.engineGain=ctx.createGain();audio.engineGain.gain.value=.2;
  const sample=(volume,buffer)=>({gain:{gain:new Param(volume)},source:{buffer}});
  audio.samples={loadHigh:sample(.4,{duration:5,name:'high'}),engine:sample(.1,{duration:5,name:'fallback'})};
  return {audio,ctx};
}
let {audio,ctx}=audioFixture();
const update=()=>audio._updateVehicleVoices(state,{vehicles:snapshot(),listener});
update();
equal(audio.vehicleVoices.size,7,'three rivals plus four traffic have seven actual reservations');
check([...audio.vehicleVoices].every(row=>row.voice),'available donors create real moving voices');
const playerLevel=audio._playerEngineLevel();
for(const row of audio.vehicleVoices){
  const cue=SOUND_BANK[row.kind==='rival'?'vehicle.rival-engine':'vehicle.traffic-engine'];
  equal(row.voice.gain.gain.calls.find(call=>call[0]==='ramp')?.[1],playerLevel*cue.volume,'gain follows current player engine level');
  equal(row.voice.gain.gain.calls.find(call=>call[0]==='ramp')?.[2],.4,'fade-in is .4 seconds');
  check(row.voice.source.buffer===audio.samples[row.kind==='rival'?'loadHigh':'engine'].source.buffer,'actual existing donor buffer is reused');
}
const first=[...audio.vehicleVoices].find(row=>row.kind==='rival');
const originalRate=first.voice.source.playbackRate.value;
first.actor.car='banshee_muscle';update();
check(Math.abs(first.voice.source.playbackRate.value-originalRate*CAR_VOICES.banshee_muscle.pitch)<1e-12,'actual per-car pitch changes only its moving rate');
const muscleRate=first.voice.source.playbackRate.value;first.actor.revs=.8;audio.engineGain.gain.value=.1;update();
check(first.voice.source.playbackRate.value>muscleRate,'actual actor revs update moving playback');
const graphs=ctx.nodes.filter(n=>n.type==='source').length;update();equal(ctx.nodes.filter(n=>n.type==='source').length,graphs,'stable identities never duplicate loops');
const old=state.opponents[1];state.opponents[1]=actor(5,'a');update();
check([...audio.vehicleVoices].some(row=>row.actor===old&&row.retiring),'same-id actor replacement retires old actual actor');
equal(ctx.nodes.filter(n=>n.type==='source').length,graphs,'replacement never allocates source eight during fade');
ctx.advance(.4);update();
equal(audio.vehicleVoices.size,7,'ended fade frees one bounded replacement slot');
check([...audio.vehicleVoices].some(row=>row.actor===state.opponents[1]&&!row.retiring),'replacement binds actual new reference');
state.opponents[1].wrecked={};update();check([...audio.vehicleVoices].some(row=>row.actor===state.opponents[1]&&row.retiring),'wreck fades its own voice');
ctx.advance(.4);delete state.opponents[1].wrecked;update();
audio.setPaused(true);ctx.advance(.001);equal(audio.vehicleVoices.size,0,'pause disposes actual sources and graphs');

const pendingFixture=audioFixture();audio=pendingFixture.audio;ctx=pendingFixture.ctx;audio.samples={};
let resolve;audio._samplesPromise=new Promise(done=>{resolve=done;});update();equal(audio.vehicleVoices.size,7,'pending donors reserve seven slots');
audio.setPaused(true);audio.setPaused(false);audio.samples=pendingFixture.audio.samples={loadHigh:{source:{buffer:{duration:5}}},engine:{source:{buffer:{duration:5}}}};resolve();
await Promise.resolve();await Promise.resolve();
equal(ctx.nodes.filter(n=>n.type==='source').length,0,'pause/resume cannot resurrect late donor callbacks');
equal(audio.vehicleVoices.size,0,'canceled pending reservations drain');

for(const reason of ['muted','off','menu','stage']){
  ({audio,ctx}=audioFixture());flags.on=true;state.status='racing';update();
  if(reason==='muted')audio.setMuted(true);
  if(reason==='off')flags.on=false;
  if(reason==='menu')state.status='menu';
  if(reason==='stage')audio.event({stageLoaded:0},state,course);
  update();ctx.advance(.001);
  equal(audio.vehicleVoices.size,0,reason+' releases voice resources');
}
flags.on=true;state.status='racing';
const legacyCtx=new Context(),legacy=new SoundMixer(legacyCtx,legacyCtx.createGain(),{enabled:true});
const oldVoice=legacy.playMoving('engine.high',{duration:1},{x:0,z:0},listener,{volume:.3,loop:true});
equal(oldVoice.gain.gain.value,SOUND_BANK['engine.high'].volume*.3,'original moving gain default exact');
oldVoice.stop();equal(oldVoice.source.stopAt,.04,'original moving stop stays .04s');
legacyCtx.advance(.04);equal(oldVoice.source.connections.length,0,'original moving cleanup exact');
// Exercise the actual App update seam, including its existing listener.
let environment;
const appOwner={...owner,duel:{state:{...state,s:0,lateral:0,speedMph:60,airHeight:0},course,
  deepEnvironment:()=>({})},cameraMode:'chase',deepAudio:{update(){}},audio:{update(st,env){environment=env;}},
  _vehicleAudioSnapshot:App.prototype._vehicleAudioSnapshot};
const untouched=JSON.stringify(appOwner.duel.state);
App.prototype._updateAudio.call(appOwner);
check(environment.vehicles.rivals.length<=3&&environment.vehicles.traffic.length<=4,'actual App audio path supplies bounded snapshot');
equal(JSON.stringify(appOwner.duel.state),untouched,'actual App audio path preserves all state bytes');
check(environment.listener.vz>0&&environment.listener.y===1.3,'actual existing listener motion is retained');
flags.on=false;App.prototype._updateAudio.call(appOwner);check(!Object.hasOwn(environment,'vehicles'),'flag-off App adds no snapshot field');flags.on=true;

// Every late donor completion must retain its reservation until completion.
for(const reason of ['mute','stage','off','actor','wreck','dispose']){
  ({audio,ctx}=audioFixture());audio.samples={};
  let finish;audio._samplesPromise=new Promise(done=>{finish=done;});update();
  equal(audio.vehicleVoices.size,7,reason+' starts with seven pending reservations');
  const pendingActors=[...audio.vehicleVoices];
  if(reason==='mute'){audio.setMuted(true);audio.setMuted(false);}
  if(reason==='stage')audio.event({stageLoaded:1},state,course);
  if(reason==='off'){flags.on=false;update();flags.on=true;}
  if(reason==='actor')state.opponents=state.opponents.map(row=>({...row}));
  if(reason==='wreck')for(const row of pendingActors)row.actor.wrecked={};
  if(reason==='dispose'){audio.setPaused(true);ctx.state='closed';}
  if(['actor','wreck'].includes(reason))update();
  equal(audio.vehicleVoices.size,7,reason+' cannot reuse canceled pending budget early');
  audio.samples={loadHigh:{source:{buffer:{duration:5}}},engine:{source:{buffer:{duration:5}}}};finish();
  await Promise.resolve();await Promise.resolve();
  if(reason==='actor'){
    check([...audio.vehicleVoices].every(row=>row.kind==='traffic'),'only unchanged traffic can bind after rival replacement');
  }else equal(ctx.nodes.filter(n=>n.type==='source').length,0,reason+' discards every stale completion');
  for(const row of pendingActors)delete row.actor.wrecked;
  audio.setPaused(true);ctx.advance(.001);
  equal(audio.vehicleVoices.size,0,reason+' pending/active cleanup drains');
}
flags.on=true;state.status='racing';
({audio,ctx}=audioFixture());update();
state.traffic[0].s=300;update();
const fading=[...audio.vehicleVoices].find(row=>row.actor===state.traffic[0]);
check(fading.retiring&&fading.voice.source.stopAt===ctx.currentTime+.4,'leaving range holds actual .4s stop');
audio.setPaused(true);ctx.advance(.001);equal(audio.vehicleVoices.size,0,'pause also ends already-fading resources');
state.traffic[0].s=20;
check(SOUND_BANK['vehicle.rival-engine'].priority<SOUND_BANK['engine.high'].priority&&
  SOUND_BANK['vehicle.traffic-engine'].priority<SOUND_BANK['vehicle.rival-engine'].priority,'bank priorities are below player, rivals above traffic');
check(!SOUND_BANK['vehicle.rival-engine'].file&&!SOUND_BANK['vehicle.traffic-engine'].file,'voice cues add no asset or load path');
({audio,ctx}=audioFixture());audio.samples={};
let donorReady;audio._samplesPromise=new Promise(done=>{donorReady=done;});update();
const previousOpponents=state.opponents;state.opponents=previousOpponents.map(row=>({...row}));
audio.samples={loadHigh:{source:{buffer:{duration:5}}},engine:{source:{buffer:{duration:5}}}};donorReady();
await Promise.resolve();await Promise.resolve();
check([...audio.vehicleVoices].every(row=>row.kind==='traffic'),'late bind checks actual current spawn array even before next audio frame');
audio.setPaused(true);ctx.advance(.001);
({audio,ctx}=audioFixture());audio.samples={};
let movedReady;audio._samplesPromise=new Promise(done=>{movedReady=done;});update();
audio._updateVehicleVoices(state,{vehicles:snapshot(),listener:{...listener,x:20,vx:10}});
audio.samples={loadHigh:{source:{buffer:{duration:5}}},engine:{source:{buffer:{duration:5}}}};movedReady();
await Promise.resolve();await Promise.resolve();
check([...audio.vehicleVoices].every(row=>row.voice.output.input.positionX.value<0),'pending bind follows the latest real listener position');
audio.setPaused(true);ctx.advance(.001);
({audio,ctx}=audioFixture());
audio.samples.loadHigh.body={gain:{gain:new Param(.3)}};audio.samples.loadHigh.intake={gain:{gain:new Param(.15)}};
equal(audio._playerEngineLevel(),Math.sqrt(.2**2+.4**2+.1**2+.3**2+.15**2),'current main/body/intake and synth gains define the actual reference');
update();
const graphResources=()=>ctx.nodes.filter(node=>node.type==='source'&&node.started!=null&&!node.ended).length;
equal(graphResources(),7,'actual live source graph starts at cap seven');
for(let tick=0;tick<6;tick++){
  state.opponents=state.opponents.map(row=>({...row}));update();
  check(graphResources()<=7&&audio.vehicleVoices.size<=7,'repeated real identity replacement never allocates an eighth graph or reservation');
  ctx.advance(.4);update();
}
audio.setPaused(true);ctx.advance(.001);equal(graphResources(),0,'all actual source graphs end after cleanup');
console.log(`Vehicle audio: ${checks} controlled snapshot, moving-loop and resource checks passed; native mix/listening remain pending.`);
