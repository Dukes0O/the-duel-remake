import assert from 'node:assert/strict';
import {test, before, after} from 'node:test';
import {spawn} from 'node:child_process';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {measureLoudness} from './audio/measurements.mjs';
import {ffmpeg} from './audio/codec.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const runDir=join(root,'.evidence',new Date().toISOString().slice(0,10),'AUD-CRASH-PEAK',
  'native-'+new Date().toISOString().replace(/[:.]/g,'-'));
let capture,report,checks=0;
const ok=(value,message)=>{checks++;assert.ok(value,message);};
const eq=(actual,expected,message)=>{checks++;assert.deepEqual(actual,expected,message);};
const db=value=>20*Math.log10(Math.max(1e-12,value));
const tracks=new Map(),measurements=new Map();
function track(row,name='mix') {
  const key=row.name+'/'+name;
  if(!tracks.has(key)){
    const item=row.tracks?.[name]??row.track,bytes=Buffer.from(item.pcmBase64,'base64');
    const pcm=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    tracks.set(key,{...item,pcm});
  }
  return tracks.get(key);
}
function range(item,start,duration){
  const from=Math.max(0,Math.floor((start-item.audioStartSec)*capture.sampleRate))*2;
  const end=Math.min(item.pcm.length,Math.ceil((start+duration-item.audioStartSec)*capture.sampleRate)*2);
  return [from,Math.max(from,end)];
}
function rms(item,start,duration){
  const [from,end]=range(item,start,duration);let power=0;
  for(let i=from;i<end;i++)power+=item.pcm[i]**2;
  return Math.sqrt(power/Math.max(1,end-from));
}
function peak(item,start=0,duration=100){
  const [from,end]=range(item,start,duration);let value=0;
  for(let i=from;i<end;i++)value=Math.max(value,Math.abs(item.pcm[i]));
  return value;
}
function wav(item){
  const pcm=Buffer.from(item.pcm.buffer),wave=Buffer.alloc(44+pcm.length);
  wave.write('RIFF');wave.writeUInt32LE(36+pcm.length,4);wave.write('WAVE',8);
  wave.write('fmt ',12);wave.writeUInt32LE(16,16);wave.writeUInt16LE(3,20);
  wave.writeUInt16LE(2,22);wave.writeUInt32LE(capture.sampleRate,24);
  wave.writeUInt32LE(capture.sampleRate*8,28);wave.writeUInt16LE(8,32);wave.writeUInt16LE(32,34);
  wave.write('data',36);wave.writeUInt32LE(pcm.length,40);pcm.copy(wave,44);return wave;
}
function onset(item,eventTime,threshold){
  const [from,end]=range(item,eventTime-.03,.18);
  for(let i=from;i<end;i+=2)if(Math.max(Math.abs(item.pcm[i]),Math.abs(item.pcm[i+1]))>threshold)
    return item.audioStartSec+i/2/capture.sampleRate-eventTime;
  return null;
}

before(async()=>{
  await mkdir(runDir,{recursive:true});
  // Recipe only: preserve the existing harness while giving this suite its own
  // build, profile, port and logs. The standard test always runs native Chrome.
  let harness=await readFile(join(root,'tools/browser-harness.mjs'),'utf8');
  const substitutions=[
    ["resolve(fileURLToPath(new URL('../', import.meta.url)))",JSON.stringify(resolve(root))],
    ["'tools/vite-qa.config.js'",JSON.stringify(join(runDir,'vite.config.mjs'))],
    ["join(PROJECT_ROOT, '.qa-dist', 'tools', 'menu-check.html')","join("+JSON.stringify(runDir)+", 'build', 'tools', 'menu-check.html')"],
  ];
  for(const [from,to]of substitutions){if(!harness.includes(from))throw Error('Private harness recipe anchor changed: '+from);harness=harness.replaceAll(from,to);}
  await writeFile(join(runDir,'harness.mjs'),harness);
  const plugin=new URL('./build-version-plugin.mjs',import.meta.url).href;
  const config="import {defineConfig} from "+JSON.stringify(new URL('../node_modules/vite/dist/node/index.js',import.meta.url).href)+";\n"+
    "import {buildVersionPlugin} from "+JSON.stringify(plugin)+";\n"+
    "export default defineConfig({root:"+JSON.stringify(resolve(root))+
    ",plugins:[buildVersionPlugin()],define:{__DUEL_QA__:'true'},build:{outDir:"+JSON.stringify(join(runDir,'build'))+
    ",emptyOutDir:true,rollupOptions:{input:{menu:"+JSON.stringify(join(root,'tools/menu-check.html'))+"}}},server:{hmr:false}});\n";
  await writeFile(join(runDir,'vite.config.mjs'),config);
  const log=[];
  const code=await new Promise((done,reject)=>{
    const child=spawn(process.execPath,[join(runDir,'harness.mjs'),'scenario','audio-crash-peak','--output-dir',runDir],
      {cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    for(const stream of [child.stdout,child.stderr])stream.on('data',bytes=>log.push(bytes));
    child.once('error',reject);child.once('exit',done);
  });
  await writeFile(join(runDir,'browser.log'),Buffer.concat(log));
  if(code!==0)throw Error('Native capture infrastructure failed: '+Buffer.concat(log).toString().slice(-5000));
  capture=JSON.parse(await readFile(join(runDir,'capture.json'),'utf8'));
  report=JSON.parse(await readFile(join(runDir,'report.json'),'utf8'));
  for(const row of capture.rows){
    const bytes=wav(track(row)),metric=measureLoudness(bytes);
    measurements.set(row.name,metric);
    await writeFile(join(runDir,row.name+'.wav'),bytes);
    // Rebuildable inspection images, not a listening score or stored game asset.
    ffmpeg(['-y','-i',join(runDir,row.name+'.wav'),'-lavfi','showspectrumpic=s=960x360:legend=1',
      '-frames:v','1',join(runDir,row.name+'-spectrum.png')]);
    ffmpeg(['-y','-i',join(runDir,row.name+'.wav'),'-lavfi','showwavespic=s=960x240:split_channels=1',
      '-frames:v','1',join(runDir,row.name+'-wave.png')]);
  }
  await writeFile(join(runDir,'measurements.json'),JSON.stringify(Object.fromEntries(measurements),null,2)+'\n');
  console.log('Native audio evidence: '+runDir);
},{timeout:120000});

test('native final-output capture is private, memory-only and error-free',()=>{
  eq(capture.nativeContext,true,'real AudioContext; no fake audio peak pass');
  eq(capture.memoryOnlySaves,true,'localStorage and backup storage were isolated before App import');
  ok(report.port>=5191&&report.port!==5174,'private ephemeral QA port excludes the live port');
  eq(report.issues,[],'native browser has no errors');
  ok(capture.sampleRate>=44100,'native full-band rate supports true-peak measurement');
});
test('the recorded runtime output is the final complete game path',()=>{
  for(const [key,value]of Object.entries(capture.graph))eq(value,true,'actual graph control: '+key);
});

for(const name of ['non-fuel-contact','fuel-contact','six-blast-overlap']){
  test(name+': actual swept simulation contact caused the recorded impact',()=>{
    const row=capture.rows.find(r=>r.name===name);
    ok(row.physical?.removed>0,'actual collision caused real armor damage');
    ok(row.events.some(e=>e.kind==='vehicleSmash'&&e.source==='native-simulation'),'native vehicleSmash event present');
    const cue=row.cues.find(c=>c.id==='vehicle.crash-impact');
    ok(cue,'existing crash-impact cue was dispatched');
    ok(Math.abs(cue.time-row.contactAt)<=.03,'actual impact cue dispatch is within 30 ms of contact');
    if(name==='non-fuel-contact')eq(row.events.filter(e=>e.kind.startsWith('fuel')),[],'baseline requires no Fuel cues');
    if(name==='fuel-contact')ok(row.events.some(e=>e.kind==='fuelDrop'),'real carried Fuel was dropped by the native contact');
    if(name==='six-blast-overlap'){
      ok(row.stressAt!=null&&Math.abs(row.stressAt-row.contactAt)<.03,'six marked QA blasts overlap the real hit');
      ok(row.events.some(e=>e.kind==='weaponFired'),'overlap includes actual native weapon fire');
      ok(row.cues.filter(c=>c.id.startsWith('combat.blast')&&Math.abs(c.time-row.stressAt)<.01).length>=6,
        'six actual blast voices were dispatched in the overlap window');
    }
  });
  test(name+': FINAL Float32 output sample peak is at most -1 dBFS',()=>{
    const row=capture.rows.find(r=>r.name===name),item=track(row),actual=db(peak(item));
    console.log(name+' sample peak: '+actual.toFixed(3)+' dBFS');
    ok(actual<=-1,name+': actual final sample peak '+actual.toFixed(3)+' dBFS exceeds -1 dBFS');
  });
  test(name+': FINAL output oversampled true peak is at most -1 dBTP',()=>{
    const metric=measurements.get(name);
    ok(metric.available,'native output has enough actual signal for FFmpeg EBU R128 measurement');
    console.log(name+' true peak: '+metric.truePeakDbtp.toFixed(2)+' dBTP');
    ok(metric.truePeakDbtp<=-1,name+': actual final true peak '+metric.truePeakDbtp.toFixed(2)+' dBTP exceeds -1 dBTP');
  });
  test(name+': the engine remains audible under the contact and impact contrast is retained',()=>{
    const row=capture.rows.find(r=>r.name===name),engine=track(row,'engine'),impacts=track(row,'impacts');
    ok(row.frames.some(f=>f.time<row.contactAt&&f.throttle===1&&f.speedMph>40),
      'native pre-contact engine is running under full throttle');
    const bed=rms(engine,row.contactAt,.25),hit=rms(impacts,row.contactAt,.25);
    ok(bed>1e-4,'actual engine stem still carries an audible-range signal during the hit');
    const contrast=db(hit/bed);
    ok(contrast>=6,'actual impact/engine stem contrast '+contrast.toFixed(2)+' dB must remain at least 6 dB');
    const mixContrast=db(rms(track(row),row.contactAt,.25)/(bed*.42));
    ok(mixContrast>=6,'final output retains impact contrast against the simultaneously measured engine');
  });
  test(name+': captured final impact onset is within 30 ms of its native event',()=>{
    const row=capture.rows.find(r=>r.name===name),mix=track(row);
    const floor=peak(mix,row.contactAt-.25,.15),delay=onset(mix,row.contactAt,Math.max(.01,floor*2));
    ok(delay!==null,'final output contains a distinguishable native impact onset');
    ok(Math.abs(delay)<=.03,'final output onset '+(delay*1000).toFixed(2)+' ms exceeds 30 ms target');
  });
  test(name+': native meter receives continuous unclipped Float32 blocks',()=>{
    for(const [key,item]of Object.entries(rowOf(name).tracks)){
      eq(item.contiguous,true,key+' AudioWorklet input timeline has no missing blocks');
      ok(item.frames>capture.sampleRate*3,'actual '+key+' capture spans more than three seconds');
      ok(track(rowOf(name),key).pcm.every(Number.isFinite),'native '+key+' samples are finite');
    }
  });
}
function rowOf(name){return capture.rows.find(r=>r.name===name);}

test('safe quiet audio preserves the existing signal through the complete runtime output',()=>{
  const item=track({name:'quiet',track:capture.quiet.track}),amplitude=peak(item,.2,.6);
  const reference=track({name:'quiet-reference',track:capture.quiet.referenceTrack});
  const expected=peak(reference,.2,.6);
  ok(amplitude>0,'native quiet signal reaches the actual final output');
  ok(Math.abs(db(amplitude/expected))<=.1,'safe quiet peak gain changed by '+db(amplitude/expected).toFixed(3)+' dB; blanket attenuation is not a fix');
  const expectedRms=rms(reference,.2,.6),actualRms=rms(item,.2,.6);
  ok(Math.abs(db(actualRms/expectedRms))<=.1,'safe quiet RMS gain changed by '+db(actualRms/expectedRms).toFixed(3)+' dB');
});
test('actual pause and dispose clean up owned audio without final-output leakage',()=>{
  const c=capture.cleanup;
  eq(c.paused,true,'actual pause API applied');
  eq(c.projectileVoices,0,'owned projectile voices cleared');
  eq(c.mixerVoices,0,'owned mixer voices stopped');
  eq(c.hiddenRoadVoices,0,'owned hidden-road voices cleared');
  eq(c.contextClosed,true,'actual App dispose closes its native audio context');
  const item=track({name:'paused',track:c.track});
  ok(peak(item,.25,.07)<.001,'paused final output fades below -60 dBFS');
});
after(()=>console.log('Audio crash peak: '+checks+' acceptance checks reached; human listening, space, variety and loop seams remain unmeasured.'));
