import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Cover the exact route/terrain/solver code, excluding cosmetic scenery and
// collision indexing. Runtime input keys separately cover complete event
// definitions, seeds, sampled geometry and tunnel placement.
export async function shortcutSourceFingerprint(){
  const read=async file=>(await readFile(new URL('../'+file,import.meta.url),'utf8')).replace(/\r\n/g,'\n');
  const course=await read('src/course.js');
  const section=(start,end)=>{const a=course.indexOf(start),b=end?course.indexOf(end,a):course.length;
    if(a<0||b<=a)throw new Error('Shortcut generation source boundaries changed; review the freshness fingerprint.');return course.slice(a,b);};
  const hash=createHash('sha256');
  hash.update(section('const STEP=','export class Course'));
  hash.update(section('  _height(s){','  _solidScenery(){'));
  hash.update(section('  at(s){','  nearest(x,z,referenceS)'));
  hash.update(section('function buildShortcuts(course)'));
  for(const file of['src/rng.js','src/shortcut-preset-cache.js'])hash.update(file).update(await read(file));
  return hash.digest('hex');
}
