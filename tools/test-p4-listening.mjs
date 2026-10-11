// Partial listening eligibility is distinct from the unchanged whole-race gate.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as listening from './audio/p4-listening.mjs';

assert.equal(typeof listening.inspectP4PartialRecording, 'function', 'Strict partial-prefix inspector is missing');
const inspect = listening.inspectP4PartialRecording;
let checks = 0;
const check = (name, run) => {run();checks++;console.log('PASS '+name);};
function fixture() {
  const frames = 512, start = 1024, pcmByStem = {};
  for(const name of ['mix','engine','interface']) {
    const bytes = Buffer.alloc(frames * 8);
    for(let i=0;i<frames*2;i++)bytes.writeFloatLE(.05*Math.sin(i*.03),i*4);
    pcmByStem[name]=bytes;
  }
  const sourceWave = Buffer.alloc(44 + frames * 8);
  sourceWave.write('RIFF');sourceWave.writeUInt32LE(sourceWave.length-8,4);sourceWave.write('WAVEfmt ',8);
  sourceWave.writeUInt32LE(16,16);sourceWave.writeUInt16LE(3,20);sourceWave.writeUInt16LE(2,22);
  sourceWave.writeUInt32LE(48000,24);sourceWave.writeUInt32LE(48000*8,28);
  sourceWave.writeUInt16LE(8,32);sourceWave.writeUInt16LE(32,34);sourceWave.write('data',36);
  sourceWave.writeUInt32LE(frames*8,40);pcmByStem.mix.copy(sourceWave,44);
  const segments = [0,1].map(index => {
    const startFrame=start+index*256,endFrame=startFrame+256,tracks={};
    for(const name of ['mix','engine','interface'])tracks[name]={startFrame,endFrame,frames:256,
      identity:{complete:true,sourceStartFrame:0,checkedFrames:256}};
    return {index,sampleRate:48000,startFrame,endFrame,tracks};
  });
  return {recording:{status:'incomplete',sampleRate:48000,startFrame:start,endFrame:start+frames,segments},
    functional:{memoryOnly:true,simulationEdits:false,syntheticResults:false,controlAdapter:{saveCalls:0}},
    harness:{scenario:'p4-audio',passed:false,memoryOnlySaves:true,error:'Missing native frames'},sourceWave,pcmByStem};
}
check('valid independent-identity prefix remains explicitly incomplete',()=>{
  const f=fixture(),v=inspect(f);
  assert.equal(v.completeRace,false);assert.equal(v.wholeHarnessPassed,false);assert.equal(v.verifiedPrefix,true);
  assert.equal(v.frames,512);assert.equal(v.sampleRate,48000);assert.equal(v.channels,2);
  assert.equal(v.durationSec,512/48000);
  assert.equal(v.sourcePcmSha256,createHash('sha256').update(f.pcmByStem.mix).digest('hex'));
});
const reject=(name,mutate)=>check(name,()=>{const f=fixture();mutate(f);assert.throws(()=>inspect(f));});
reject('complete captures require the original whole-pass mode',f=>f.recording.status='complete');
reject('failed whole capture cannot be relabelled passed',f=>f.harness.passed=true);
reject('missing failure identity rejected',f=>delete f.harness.error);
reject('non-memory harness rejected',f=>f.harness.memoryOnlySaves=false);
reject('different scenario rejected',f=>f.harness.scenario='other');
reject('non-memory functional source rejected',f=>f.functional.memoryOnly=false);
reject('simulation edits rejected',f=>f.functional.simulationEdits=true);
reject('synthetic results rejected',f=>f.functional.syntheticResults=true);
reject('adapter writes rejected',f=>f.functional.controlAdapter.saveCalls=1);
reject('missing independent identity rejected',f=>delete f.recording.segments[0].tracks.mix.identity);
reject('failed independent identity rejected',f=>f.recording.segments[0].tracks.mix.identity.complete=false);
reject('short identity coverage rejected',f=>f.recording.segments[0].tracks.engine.identity.checkedFrames--);
reject('missing retained stem rejected',f=>delete f.pcmByStem.interface);
reject('gap between verified segments rejected',f=>f.recording.segments[1].startFrame++);
reject('overlapping verified segments rejected',f=>f.recording.segments[1].startFrame--);
reject('cross-stem boundary mismatch rejected',f=>f.recording.segments[0].tracks.interface.endFrame++);
reject('wrong segment rate rejected',f=>f.recording.segments[0].sampleRate=44100);
reject('fractional native boundary rejected',f=>f.recording.startFrame+=.5);
reject('missing recording end coverage rejected',f=>f.recording.endFrame++);
reject('extra retained PCM is never trimmed',f=>f.pcmByStem.engine=Buffer.concat([f.pcmByStem.engine,Buffer.alloc(8)]));
reject('missing retained PCM is never filled',f=>f.pcmByStem.engine=f.pcmByStem.engine.subarray(8));
reject('wrong source rate rejected',f=>f.sourceWave.writeUInt32LE(44100,24));
reject('wrong source channel count rejected',f=>f.sourceWave.writeUInt16LE(1,22));
reject('wrong source encoding rejected',f=>f.sourceWave.writeUInt16LE(1,20));
reject('wrong bit depth rejected',f=>f.sourceWave.writeUInt16LE(16,34));
reject('truncated source WAV rejected',f=>f.sourceWave=f.sourceWave.subarray(0,-1));
reject('WAV/retained PCM mismatch rejected',f=>f.pcmByStem.mix.writeFloatLE(.9,0));
reject('non-finite verified native samples rejected',f=>f.pcmByStem.engine.writeFloatLE(NaN,0));
reject('empty verified segments rejected',f=>f.recording.segments=[]);
console.log(`P4 partial listening: ${checks} prefix eligibility checks passed; no encoder or native capture ran.`);
