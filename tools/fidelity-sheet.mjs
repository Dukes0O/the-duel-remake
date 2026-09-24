import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve, dirname, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
function value(name, fallback) {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
}
const output = resolve(value('--output', join(root,'docs/board/looks/test-fighter/round-1.png')));
const capturesPath = resolve(value('--captures', join(root,'docs/board/looks/test-fighter/captures.json')));
const captures = JSON.parse(await readFile(capturesPath,'utf8'));
const blender = JSON.parse(await readFile(join(root,'docs/board/looks/test-fighter/blender.json'),'utf8'));
const rel = path => relative(root, resolve(root, path)).replaceAll('\\','/');
const directory = dirname(output);
await mkdir(directory,{recursive:true});
const sourceReference = 'public/assets/reference/wasteland-crew-1.png';
const rows = captures.captures.filter(item => item.quality === 'high').map(item => ({
  clip:item.clip, time:item.time, view:item.view, yaw:item.yaw,
  reference:sourceReference,
  // The source shows standing front, side and back only. It is deliberately
  // repeated beside motion samples, never presented as motion ground truth.
  crop: {front:[0,40,207,710],side:[210,40,340,710],back:[343,40,534,710]}[item.view],
  blender:'docs/board/looks/test-fighter/blender-'+item.clip+'-'+item.view+'.png',
  high:rel(item.path),
  performance:rel(captures.captures.find(other => other.quality === 'performance' &&
    other.clip === item.clip && other.view === item.view).path),
}));
if (rows.length !== 9) throw Error('Need front, side and back for idle, walk and knockdown in both qualities.');
const assetHash = createHash('sha256').update(await readFile(join(root,'public/assets/models/wasteland/test-fighter.glb'))).digest('hex');
const provenance = {
  assetHash,
  observationCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  reference:{path:sourceReference,subject:'left Rook triplet',motionReference:false},
  blender:rows.map(row=>row.blender),
  high:rows.map(row=>row.high),
  performance:rows.map(row=>row.performance),
  camera:{...blender.camera, knockdownTarget:'[sin(yaw)*0.90, 0.9, cos(yaw)*0.90]; camera offset [0,0,5]'},
  clip:'idle', time:.25, poses:rows.map(({clip,time,view,yaw})=>({clip,time,view,yaw})),
  counts:{assetTriangles:blender.triangles,materials:blender.materials,textureSets:0,...captures.counts},
  qualities:captures.qualities,loadErrors:captures.loadErrors,
  rows,output:rel(output),
  status:'GFX-00 pipeline evidence only; no crew fidelity score or beta promotion',
};
const manifest=output.replace(/\.png$/i,'.json');
if(manifest===output)throw Error('--output must be a PNG path');
await writeFile(manifest,JSON.stringify(provenance,null,2)+'\n');
const executable=value('--blender',process.env.BLENDER_PATH ||
  'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
  '--','--root',root,'--manifest',manifest,'--output',output],{cwd:root,stdio:'inherit',windowsHide:true});
console.log('Fidelity sheet: '+output);