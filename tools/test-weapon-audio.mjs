import assert from 'node:assert/strict';
import {EngineAudio} from '../src/audio.js';

class Param {
  constructor(value = 0) { this.value=value;this.events=[]; }
  setValueAtTime(value,time) { this.value=value;this.events.push([time,value]); }
  linearRampToValueAtTime(value,time) { this.setValueAtTime(value,time); }
  exponentialRampToValueAtTime(value,time) { this.setValueAtTime(value,time); }
}
class Node {
  constructor(kind) { this.kind=kind;this.connections=[]; }
  connect(target) { this.connections.push(target);return target; }
  disconnect() { this.connections=[]; }
  start(time=0) { this.started=time; }
  stop(time=0) { this.stopped=time; }
}
class Context {
  constructor() { this.currentTime=0;this.state='running';this.nodes=[]; }
  make(kind,parameters={}) {
    const node=new Node(kind);
    for(const [key,value] of Object.entries(parameters))node[key]=new Param(value);
    this.nodes.push(node);return node;
  }
  createGain() { return this.make('gain',{gain:1}); }
  createOscillator() { return this.make('oscillator',{frequency:440}); }
  createBufferSource() { return this.make('noise',{playbackRate:1}); }
  createBiquadFilter() { return this.make('filter',{frequency:350,Q:1}); }
  createStereoPanner() { return this.make('panner',{pan:0}); }
}
const makeAudio=()=>{
  const audio=new EngineAudio(),context=new Context();
  audio.context=context;audio.master=context.createGain();audio.noiseBuffer={kind:'shared-noise'};
  return {audio,context};
};
const cue=(weapon,state={mode:'wasteland',maxArmor:100})=>{
  const {audio,context}=makeAudio();
  audio.event({weaponFired:weapon},state);
  const voices=context.nodes.filter(node=>['oscillator','noise'].includes(node.kind));
  return {audio,context,voices,signature:voices.map(node=>
    `${node.kind}:${node.type||''}:${node.frequency?.events[0]?.[1]||0}:${node.stopped.toFixed(3)}`).join('|')};
};

const cues=Object.fromEntries(['ufo','bomb','crossbow','star'].map(weapon=>[weapon,cue(weapon)]));
assert.equal(new Set(Object.values(cues).map(item=>item.signature)).size,4,
  'four Wasteland weapons have distinct source, pitch and duration patterns');
assert.deepEqual(Object.fromEntries(Object.entries(cues).map(([weapon,item])=>
  [weapon,item.voices.length])),{ufo:5,bomb:2,crossbow:3,star:4});
for(const [weapon,{context,voices}] of Object.entries(cues)){
  assert.ok(voices.some(node=>node.started===0),`${weapon} starts with its fire event`);
  assert.ok(voices.every(node=>Number.isFinite(node.stopped)&&node.stopped<=.5),
    `${weapon} ends quickly and releases its sources`);
  assert.ok(context.nodes.filter(node=>node.kind==='gain').every(node=>
    node.gain.events.every(([,value])=>Number.isFinite(value)&&value>=0&&value<=.19)),
    `${weapon} has a bounded, click-free gain envelope`);
}
for(const [weapon,note] of Object.entries({ufo:760,bomb:130,crossbow:440,star:980})){
  for(const state of [{mode:'wasteland'},{mode:'duel',maxArmor:100}]){
    const {voices}=cue(weapon,state);
    assert.equal(voices.length,1,`${weapon} retains the legacy flag-off/ordinary voice`);
    assert.equal(voices[0].type,'triangle');
    assert.equal(voices[0].frequency.events[0][1],note);
  }
}
for(const blocked of ['muted','paused']){
  const {audio,context}=makeAudio();audio[blocked]=true;
  audio.event({weaponFired:'bomb'},{mode:'wasteland',maxArmor:100});
  assert.equal(context.nodes.length,1,`${blocked} suppresses weapon fire`);
}

const footState={mode:'wasteland',maxArmor:100,s:0,lateral:0,headingError:0};
const course={groundAt:()=>({x:0,y:0,z:0,heading:0})};
const footCue=event=>{
  const {audio,context}=makeAudio();
  audio.event(event,footState,course);
  const voices=context.nodes.filter(node=>['oscillator','noise'].includes(node.kind));
  return {context,voices,signature:voices.map(node=>
    `${node.kind}:${node.type||''}:${node.frequency?.events[0]?.[1]||0}:${node.stopped.toFixed(3)}`).join('|')};
};
const footEvents={
  launch:{weaponFired:'rpg',footWeaponFired:'rpg'},
  impact:{combatExplosion:true,audioWeapon:'rpg',audioImpact:'direct',hitPosition:{x:20,y:0,z:10}},
  splash:{combatExplosion:true,audioWeapon:'rpg',audioImpact:'splash',hitPosition:{x:20,y:0,z:10}},
  repairStart:{footRepairStarted:true},
  repairComplete:{footRepairCompleted:true},
  repairInterrupt:{footRepairInterrupted:true},
  raiderWarning:{raiderWarning:true},
  raiderShot:{raiderShot:true,hitPosition:{x:-20,y:0,z:10}},
};
const footCues=Object.fromEntries(Object.entries(footEvents).map(([name,event])=>[name,footCue(event)]));
assert.equal(new Set(Object.values(footCues).map(item=>item.signature)).size,8,
  'foot combat and ambush cues have distinct source, pitch and duration patterns');
for(const [name,{context,voices}] of Object.entries(footCues)){
  assert.ok(voices.length>0&&voices.some(node=>node.started===0),`${name} starts with its event`);
  assert.ok(voices.every(node=>Number.isFinite(node.stopped)&&node.stopped<=.3),
    `${name} is short and releases its sources`);
  assert.ok(context.nodes.filter(node=>node.kind==='gain').every(node=>
    node.gain.events.every(([,value])=>Number.isFinite(value)&&value>=0&&value<=.17)),
    `${name} has a bounded, click-free gain envelope`);
}
assert.ok(footCues.impact.context.nodes.some(node=>node.kind==='panner'&&node.pan.value>0),
  'RPG impact pans toward the hit');
assert.ok(footCues.raiderShot.context.nodes.some(node=>node.kind==='panner'&&node.pan.value<0),
  'raider shot pans toward the shooter');
for(const event of Object.values(footEvents)){
  const {audio,context}=makeAudio();
  audio.event(event,{mode:'duel',maxArmor:100,s:0,lateral:0},course);
  if(event.weaponFired)assert.equal(context.nodes.filter(node=>node.kind==='oscillator').length,1,
    'ordinary weapon identity remains a single legacy tone');
  else if(!event.combatExplosion)assert.equal(context.nodes.length,1,
    'Wasteland-only foot and raider events stay silent in ordinary racing');
}
console.log('Weapon audio: eight foot/raider cue variants and four car cues are distinct and bounded; ordinary, mute and pause paths pass.');
