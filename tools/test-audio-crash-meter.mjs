import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./scenarios/audio-crash-peak.mjs',import.meta.url),'utf8');
const code=source.match(/const worklet = `([\s\S]*?)`;/)?.[1];
assert.ok(code);
let Type;
const chunks=[], transfers=[];
class Base {constructor(){this.port={postMessage(message,buffers){chunks.push(message);transfers.push(buffers);}};}}
const ctx=vm.createContext({AudioWorkletProcessor:Base,Float32Array,currentFrame:0,
 registerProcessor(_id,type){Type=type;}});
vm.runInContext(code,ctx);
const meter=new Type({processorOptions:{streams:3}}), expected=Array.from({length:3},()=>[]);
for(let quantum=0;quantum<32;quantum++){
 ctx.currentFrame=8192+quantum*128-(quantum===16?128:0);
 const inputs=Array.from({length:3},(_,stream)=>[Float32Array.from({length:128},(_,i)=>stream+quantum+i/128),
 Float32Array.from({length:128},(_,i)=>-stream-quantum-i/128)]);
 for(let s=0;s<3;s++)for(let i=0;i<128;i++)expected[s].push(inputs[s][0][i]||0,inputs[s][1][i]||0);
 assert.equal(meter.process(inputs),true);
}
assert.equal(chunks.length,2);
assert.deepEqual(chunks.map(c=>c.frame),[8192,10112],'retain adverse raw clock labels');
assert.equal(chunks[1].frame===chunks[0].frame+2048,false,'original continuity must reject clock anomaly');
for(let s=0;s<3;s++){
 const pcm=Float32Array.from(chunks.flatMap(c=>Array.from(c.streams[s])));
 assert.deepEqual(Buffer.from(pcm.buffer),Buffer.from(Float32Array.from(expected[s]).buffer));
}
for(let i=0;i<2;i++){
 assert.equal(transfers[i].length,3);
 for(let s=0;s<3;s++)assert.equal(transfers[i][s],chunks[i].streams[s].buffer);
 assert.equal(chunks[i].callbacks.length,16);
}
const singleChunks=[];
class SingleBase {constructor(){this.port={postMessage(message){singleChunks.push(message);}};}}
let SingleType;const single=vm.createContext({AudioWorkletProcessor:SingleBase,Float32Array,currentFrame:0,
 registerProcessor(_id,type){SingleType=type;}});vm.runInContext(code,single);
const mono=new SingleType({processorOptions:{streams:1}});
for(let i=0;i<16;i++){single.currentFrame=i*128;mono.process([[new Float32Array(128).fill(.5)]]);}
assert.equal(singleChunks.length,1);assert.equal(singleChunks[0].streams.length,1);
assert.ok(singleChunks[0].streams[0].every(v=>v===.5),'mono fallback remains exact');
console.log('Atomic native audio meter: routing, exact PCM, transfers, mono and adverse-clock controls pass.');
