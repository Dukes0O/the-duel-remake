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
console.log('Weapon audio: four distinct bounded fire cues; legacy, mute and pause paths pass.');
