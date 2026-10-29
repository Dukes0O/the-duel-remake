// C5: verified field recordings, circular crossfade, and static loudness match.
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {ffmpeg} from './codec.mjs';
import {loadCatalog, libraryRoot, sha256, addCatalogEntry} from './sourcing.mjs';
import {measureLoudness} from './measurements.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const RATE = 48000, SECONDS = 25, SEAM = RATE;
export const KOGANE_AUDIO = Object.freeze({
  evening: {cue:'ambience.kogane', file:'ambience-kogane.flac', source:'670520'},
  night: {cue:'ambience.kogane-night', file:'ambience-kogane-night.flac', source:'734642'},
  bell: {cue:'landmark.shrine-bell', file:'landmark-shrine-bell.flac', source:'350616'},
});

function source(id, sourceRoot) {
  const row = loadCatalog().sounds.find(row => row.source === 'freesound' && row.key === id);
  if (!row || !/CC0/.test(row.license)) throw Error('Missing CC0 source '+id);
  const candidates = [join(sourceRoot,row.file),join(libraryRoot(),row.file)];
  const path = candidates.find(existsSync);
  if (!path || sha256(readFileSync(path)) !== row.sha256) throw Error('Missing or changed source '+id);
  return {row,path};
}

function pcmFlac(samples) {
  const pcm = Buffer.alloc(samples.length*4);
  samples.forEach((v,i) => pcm.writeFloatLE(v,i*4));
  return ffmpeg(['-f','f32le','-ar',String(RATE),'-ac','1','-i','pipe:0',
    '-c:a','flac','-sample_fmt','s16','-f','flac','pipe:1'],{input:pcm});
}

export function buildKogane(sourceRoot = resolve(ROOT,'.qa-dist/kogane-c5-sources')) {
  const target = measureLoudness(readFileSync(join(ROOT,'public/assets/audio/ambience-forest.flac'))).integratedLufs
    + 20*Math.log10(.15/.14);
  const stream = source('584269',sourceRoot), forest = source('609952',sourceRoot);
  const results = [];
  for (const [name,recipe] of Object.entries(KOGANE_AUDIO)) {
    const main = source(recipe.source,sourceRoot);
    let samples;
    if (name === 'bell') {
      const raw = ffmpeg(['-i',main.path,'-af','asetrate=28800,aresample=48000,lowpass=f=1800,volume=0.55',
        '-ac','1','-ar',String(RATE),'-f','f32le','pipe:1']);
      samples = Array.from({length:raw.length/4},(_,i)=>raw.readFloatLE(i*4));
      // The source strike is very quiet; bring its peak to .7 so the cue volume sets how soft it plays.
      const top = samples.reduce((p,v)=>Math.max(p,Math.abs(v)),0);
      samples = samples.map(v=>v*.7/top);
    } else {
      const args = [main.path,stream.path,forest.path].flatMap(path => ['-stream_loop','-1','-i',path]);
      const raw = ffmpeg([...args,'-filter_complex',
        '[0:a]atrim=start=3,asetpts=PTS-STARTPTS[a];[1:a]atrim=start=4,asetpts=PTS-STARTPTS[b];'+
        '[2:a]atrim=start=10,asetpts=PTS-STARTPTS[c];'+
        '[a][b][c]amix=inputs=3:weights=0.6 0.25 0.15:normalize=0,highpass=f=160,lowpass=f=7000',
        '-t',String(SECONDS),'-ac','1','-ar',String(RATE),'-f','f32le','pipe:1']);
      const count = raw.length/4;
      samples = Array.from({length:count-SEAM},(_,i)=>raw.readFloatLE(i*4));
      for(let i=0;i<SEAM;i++) {
        const t=i/SEAM;
        samples[i]=raw.readFloatLE((count-SEAM+i)*4)*(1-t)+samples[i]*t;
      }
      const level = measureLoudness(pcmFlac(samples)).integratedLufs;
      const gain = 10**((target-level)/20);
      samples = samples.map(v=>v*gain);
      const peak = samples.reduce((p,v)=>Math.max(p,Math.abs(v)),0);
      if(peak > .95)throw Error('Kogane ambience needs a reviewed crest adjustment');
    }
    const bytes = pcmFlac(samples), path = join(ROOT,'public/assets/audio',recipe.file);
    mkdirSync(join(ROOT,'public/assets/audio'),{recursive:true});
    writeFileSync(path,bytes);
    const loudness = measureLoudness(bytes);
    const record = {source:'mix',key:recipe.cue,cue:recipe.cue,license:'CC0 1.0',author:'The Duel',
      file:'public/assets/audio/'+recipe.file,sha256:sha256(bytes),bytes:bytes.length,
      processing:{script:'tools/audio/build-kogane.mjs',recipe:{
        sources:name==='bell'?[main.row.key]:[main.row.key,stream.row.key,forest.row.key],
        rate:RATE,channels:1,duration:samples.length/RATE,circularCrossfadeSeconds:name==='bell'?0:1,
        gain:name==='bell'?null:.14,targetLufs:name==='bell'?null:target,
        eveningToNight:'course light path, dusk .55 to night 1',bell:'one near-torii strike per race'},
        loudness}};
    addCatalogEntry(record);
    results.push({cue:recipe.cue,bytes:bytes.length,loudness});
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  console.log(JSON.stringify(buildKogane(process.argv[2] ? resolve(process.argv[2]) : undefined),null,2));
