import fs from 'node:fs';
const dir=new URL('../public/assets/audio/',import.meta.url);
function read(name){const b=fs.readFileSync(new URL(name,dir));let i=12,format,samples;
  while(i+8<=b.length){const id=b.toString('ascii',i,i+4),len=b.readUInt32LE(i+4);
    if(id==='fmt ')format={type:b.readUInt16LE(i+8),channels:b.readUInt16LE(i+10),rate:b.readUInt32LE(i+12),bits:b.readUInt16LE(i+22)};
    if(id==='data')samples=b.subarray(i+8,i+8+len);i+=8+len+(len%2);}
  if(format?.type!==1||format.channels!==1||![16,24].includes(format.bits)||!samples)throw Error('Expected mono PCM WAV');
  const bytes=format.bits/8,a=Float64Array.from({length:samples.length/bytes},(_,i)=>samples.readIntLE(i*bytes,bytes)/(2**(format.bits-1)));
  return {samples:a,rate:format.rate};
}
function write(name,a,rate=44100){const b=Buffer.alloc(44+a.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(a.length*2,40);
  for(let i=0;i<a.length;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,a[i]))*32767),44+i*2);fs.writeFileSync(new URL(name,dir),b);}
function process(source,target,peak){let {samples:a,rate}=read(source);
  const mean=a.reduce((s,v)=>s+v,0)/a.length;a=a.map(v=>v-mean);
  // Windowed-sinc resampling avoids aliasing the 96 kHz tire recording.
  if(rate!==44100){const ratio=rate/44100,cutoff=Math.min(1,1/ratio)*.94;
    a=Float64Array.from({length:Math.floor(a.length/ratio)},(_,i)=>{const x=i*ratio;let total=0,weight=0;
      for(let k=Math.ceil(x-24);k<=Math.floor(x+24);k++){const d=x-k,z=Math.PI*d*cutoff,w=(Math.abs(z)<1e-8?1:Math.sin(z)/z)*(.5+.5*Math.cos(Math.PI*d/24));total+=a[(k+a.length)%a.length]*w;weight+=w;}return total/weight;});}
  const fade=Math.min(2646,Math.floor(a.length/10)),n=a.length-fade,out=a.slice(0,n);
  for(let i=0;i<fade;i++){const t=i/fade;out[i]=a[n+i]*(1-t)+a[i]*t;}
  const max=out.reduce((m,v)=>Math.max(m,Math.abs(v)),0);const result=out.map(v=>v*peak/Math.max(max,1e-8));write(target,result);
  console.log(`${target}: ${(result.length/44100).toFixed(2)} s, peak ${peak}, ${result.length*2+44} bytes`);
}
process('engine-source.wav','engine-loop.wav',.8);
process('tire-squeal.wav','tire-loop.wav',.72);

// Original layered blast: low pressure wave, broadband attack, and debris tail.
let seed=84019;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
let low=0,phase=0;const blast=Float64Array.from({length:44100*4},(_,i)=>{const t=i/44100,n=noise();low+=.07*(n-low);phase+=2*Math.PI*(24+46*Math.exp(-t*7))/44100;
  return Math.sin(phase)*Math.exp(-t*2.8)*.65+n*Math.exp(-t*9)*.65+low*Math.exp(-t*.95)*1.2+(t>.14?n*Math.max(0,Math.sin(t*97))**12*Math.exp(-t*1.7)*.22:0);});
const peak=blast.reduce((m,v)=>Math.max(m,Math.abs(v)),0);write('catastrophic-blast.wav',blast.map(v=>v*.94/peak));
