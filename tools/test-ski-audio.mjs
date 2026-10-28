// SKI-AUDIO: real event routing and loop lifecycle, without graphics or storage.
import assert from 'node:assert/strict';
import {SKI_CUES, skiEventCue, skiBeds} from '../src/ski/ski-lines.js';
import {SOUND_BANK} from '../src/sound-bank.js';
import {createHeliAudio} from '../src/heli/heli-audio.js';
// test-reads: src/app.js src/ski/ski-lines.js src/heli/heli-audio.js public/assets/audio/ski/

for (const [id, cue] of Object.entries(SKI_CUES)) {
  assert.equal(SOUND_BANK[id], cue);
  assert.equal(cue.flag, 'heli-skiing');
}
for (const [event, id] of [
  [{type: 'skiGate', passed: true}, 'ski.gate'], [{type: 'skiGate', passed: false}, null],
  [{type: 'skiPop'}, 'ski.pop'], [{type: 'skiLand', safe: true}, 'ski.land'],
  [{type: 'skiLand', safe: false}, 'ski.land.hard'], [{type: 'skiTumble'}, 'ski.tumble'],
  [{type: 'skiStash'}, null], [{type: 'radio', line: 'ski.radio.clear'}, null],
]) assert.equal(skiEventCue(event), id);
const run = {skier: {speed: 10, grounded: true, carving: true}};
const slow = skiBeds(run), fast = skiBeds({skier: {...run.skier, speed: 25}});
for (const id of ['ski.carve', 'ski.wind']) {
  assert(fast[id].gain > slow[id].gain);
  assert(fast[id].rate > slow[id].rate);
}
assert.equal(slow['ski.skid'].gain, 0);
assert(skiBeds({skier: {...run.skier, carving: false, skidding: true}})['ski.skid'].gain > 0);
assert.equal(skiBeds({skier: {...run.skier, grounded: false}})['ski.carve'].gain, 0);
assert(skiBeds(run, 1)['ski.powder'].gain > 0);
assert.equal(skiBeds(run, 0)['ski.powder'].gain, 0);
for (const bed of Object.values(skiBeds(null))) assert.equal(bed.gain, 0);

const param = () => ({value: 0, setValueAtTime(v) {this.value = v;},
  setTargetAtTime(v) {this.value = v;}, cancelScheduledValues() {}});
const sources = [];
const node = () => ({gain: param(), frequency: param(), playbackRate: param(),
  connect() {}, disconnect() {}, start() {sources.push(this);}, stop() {this.stopped = true;}});
const context = {state: 'running', currentTime: 0, destination: node(), createGain: node,
  createBiquadFilter: node, createBufferSource: node,
  decodeAudioData: async () => ({duration: 4})};
const audio = {context, master: node(), flags: {enabled: () => true}};
const requests = [];
const heli = createHeliAudio({audio, autoRadio: false, fetchImpl: async url => {
  requests.push(url); return {ok: true, arrayBuffer: async () => new ArrayBuffer(1)};
}});
await heli.load(Object.keys(SKI_CUES));
const before = sources.length;
heli.play('ski.step-out');
heli.event({type: 'skiPop'});
heli.event({type: 'skiLand', safe: false});
assert.equal(sources.length, before + 3, 'step-out, pop and hard landing reach playback');
heli.update({}, {ski: {run}});
const loops = sources.filter(s => s.loop);
assert.equal(loops.length, 2, 'carve and wind beds start');
heli.update({}, {ski: {run}});
assert.equal(sources.filter(s => s.loop).length, 2, 'beds persist without restarting each frame');
heli.event({type: 'skiPickup'});
assert(loops.every(s => s.stopped), 'pickup releases every ski loop');
heli.update({}, {ski: {run}});
const pauseLoops = sources.filter(s => s.loop && !s.stopped);
audio.paused = true;
heli.update({}, {ski: {run}});
assert(pauseLoops.every(s => s.stopped), 'pause releases ski loops');
audio.paused = false;
audio.flags.enabled = name => name === 'helicopter';
const count = sources.length;
heli.play('ski.step-out');
heli.event({type: 'skiPop'});
heli.update({}, {ski: {run}});
assert.equal(sources.length, count, 'disabled ski switch cannot play ski sounds');
heli.dispose();
console.log('SKI-AUDIO event, switch, speed and lifecycle checks passed');
