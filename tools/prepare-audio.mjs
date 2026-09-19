import fs from 'node:fs';
import {argv} from 'node:process';
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
function process(source,target,peak,{start=0,end=Infinity,loop=true,fadeSeconds=.06,highpass=0,rmsTarget=0,levelWindowSeconds=0,levelGainMax=1.7}={}){let {samples:a,rate}=read(source);
  a=a.slice(Math.floor(start*rate),Math.min(a.length,Math.floor(end*rate)));
  if(a.length<rate*.08)throw Error(`Audio selection is too short: ${target}`);
  const mean=a.reduce((s,v)=>s+v,0)/a.length;a=a.map(v=>v-mean);
  if(highpass){let lastIn=0,lastOut=0;const coefficient=Math.exp(-2*Math.PI*highpass/rate);
    a=a.map(value=>{const out=coefficient*(lastOut+value-lastIn);lastIn=value;lastOut=out;return out;});}
  // Windowed-sinc resampling avoids aliasing the 96 kHz tire recording.
  if(rate!==44100){const ratio=rate/44100,cutoff=Math.min(1,1/ratio)*.94;
    a=Float64Array.from({length:Math.floor(a.length/ratio)},(_,i)=>{const x=i*ratio;let total=0,weight=0;
      for(let k=Math.ceil(x-24);k<=Math.floor(x+24);k++){const d=x-k,z=Math.PI*d*cutoff,w=(Math.abs(z)<1e-8?1:Math.sin(z)/z)*(.5+.5*Math.cos(Math.PI*d/24));total+=a[(k+a.length)%a.length]*w;weight+=w;}return total/weight;});}
  const fade=Math.min(Math.round(fadeSeconds*44100),Math.floor(a.length/5)),n=a.length-(loop?fade:0),out=a.slice(0,n);
  if(loop){for(let i=0;i<fade;i++){const t=i/fade;out[i]=a[n+i]*(1-t)+a[i]*t;}}
  else{for(let i=0;i<fade;i++){const t=i/fade;out[i]*=t;out[n-1-i]*=t;}}
  if(levelWindowSeconds){
    // Circular RMS leveling removes a recorded throttle swell repeating at full
    // speed. The window spans several firing cycles and keeps the seam smooth.
    const half=Math.round(levelWindowSeconds*44100/2),width=half*2+1;
    const reference=Math.sqrt(out.reduce((sum,v)=>sum+v*v,0)/n),gains=new Float64Array(n);
    let power=0;for(let j=-half;j<=half;j++){const value=out[(j+n)%n];power+=value*value;}
    for(let i=0;i<n;i++){
      gains[i]=Math.max(.6,Math.min(levelGainMax,reference/Math.sqrt(Math.max(1e-9,power/width))));
      const remove=out[(i-half+n)%n],add=out[(i+half+1)%n];power+=add*add-remove*remove;
    }
    for(let i=0;i<n;i++)out[i]*=gains[i];
    const leveledMean=out.reduce((sum,v)=>sum+v,0)/n;for(let i=0;i<n;i++)out[i]-=leveledMean;
  }
  const max=out.reduce((m,v)=>Math.max(m,Math.abs(v)),0),rms=Math.sqrt(out.reduce((s,v)=>s+v*v,0)/out.length);
  const gain=Math.min(peak/Math.max(max,1e-8),rmsTarget?rmsTarget/Math.max(rms,1e-8):Infinity);
  const result=out.map(v=>v*gain);write(target,result);
  console.log(`${target}: ${(result.length/44100).toFixed(2)} s, peak ${(max*gain).toFixed(3)}, RMS ${(rms*gain).toFixed(3)}, ${result.length*2+44} bytes`);
}
if(!argv.includes('--ambience-only')){
process('engine-source.wav','engine-loop.wav',.8);
process('tire-squeal.wav','tire-loop.wav',.72);

// Real field recordings, not measured dyno RPM bands. Selections supply different
// load textures; the mixer interpolates them and tunes pitch to the fictional car.
// Sources are CC0 Freesound public HQ previews. Converted mono WAVs are retained
// so rebuilding does not require a decoder, network connection or account.
const engineOptions={fadeSeconds:.12,highpass:38,rmsTarget:.17};
process('v8-rev-source.wav','engine-idle.wav',.76,{...engineOptions,start:.65,end:1.8,rmsTarget:.15,levelWindowSeconds:.09,levelGainMax:2.5});
process('acceleration-source.wav','engine-load-low.wav',.8,{...engineOptions,start:1.7,end:3.2,levelWindowSeconds:.09});
process('acceleration-source.wav','engine-load-mid.wav',.8,{...engineOptions,start:4.3,end:5.7,levelWindowSeconds:.09});
// The rev-blip recording is intentionally not used as a sustained top-speed
// loop: it contains a repeating rise/fall even when the player holds steady RPM.
process('engine-source.wav','engine-load-high.wav',.8,{highpass:38,rmsTarget:.17,fadeSeconds:.06,levelWindowSeconds:.09});
process('v8-rev-source.wav','engine-coast.wav',.74,{...engineOptions,start:6.2,end:7.6,rmsTarget:.14,levelWindowSeconds:.09});
process('v8-rev-source.wav','engine-throttle.wav',.78,{...engineOptions,start:2,end:3.3,loop:false,fadeSeconds:.045});
process('v8-rev-source.wav','engine-lift.wav',.72,{...engineOptions,start:3.85,end:5.1,loop:false,fadeSeconds:.055,rmsTarget:.14});
process('v8-rev-source.wav','engine-shift.wav',.6,{...engineOptions,start:3.95,end:4.24,loop:false,fadeSeconds:.025,rmsTarget:.12});

// Original layered blast: low pressure wave, broadband attack, and debris tail.
let seed=84019;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
let low=0,phase=0;const blast=Float64Array.from({length:44100*4},(_,i)=>{const t=i/44100,n=noise();low+=.07*(n-low);phase+=2*Math.PI*(24+46*Math.exp(-t*7))/44100;
  return Math.sin(phase)*Math.exp(-t*2.8)*.65+n*Math.exp(-t*9)*.65+low*Math.exp(-t*.95)*1.2+(t>.14?n*Math.max(0,Math.sin(t*97))**12*Math.exp(-t*1.7)*.22:0);});
const peak=blast.reduce((m,v)=>Math.max(m,Math.abs(v)),0);write('catastrophic-blast.wav',blast.map(v=>v*.94/peak));
}

// CC0 field recordings. Original public HQ MP3 previews and decoded mono excerpts
// are retained; exact source times and hashes are in assets/audio/AMBIENCE_SOURCES.json.
process('coast-source.wav','ambience-coast.wav',.55,{fadeSeconds:1.25,highpass:75,rmsTarget:.09});
process('forest-source.wav','ambience-forest.wav',.5,{fadeSeconds:1.25,highpass:90,rmsTarget:.08});
process('stadium-source.wav','ambience-stadium.wav',.55,{fadeSeconds:.8,highpass:100,rmsTarget:.11});
