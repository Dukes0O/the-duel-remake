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
if (args.includes('--first-person-round')) {
  await firstPersonSheet(Number(value('--first-person-round')));
} else if (args.includes('--crew-round')) {
  await crewSheet(Number(value('--crew-round')));
} else {
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
}


async function crewSheet(round) {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('Crew round must be 1..10');
  const base = `docs/board/looks/crew/round-${round}`;
  const output = resolve(root, `${base}.png`), manifest = resolve(root, `${base}.json`);
  const captures = JSON.parse(await readFile(join(root,base,'captures.json'),'utf8'));
  const hash = async path => createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const rows = [], sources = {}, assets = {}, crews = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
  const verify = async (path, expected) => {
    const actual = await hash(path);
    if (expected && actual !== expected) throw Error(`Evidence source changed: ${path}`);
    sources[path] = actual;
  };
  for (const id of crews) {
    const blender = JSON.parse(await readFile(join(root,base,`blender-${id}.json`),'utf8'));
    const asset = captures.assets[id];
    await verify(asset.path,asset.sha256);
    if (blender.files[`${id}.glb`] !== asset.sha256) throw Error(`${id}: Blender/browser asset mismatch`);
    assets[id] = asset;
    await verify(blender.reference.path,blender.reference.sha256);
    if (JSON.stringify(blender.camera.position)!==JSON.stringify(captures.camera.position) ||
        JSON.stringify(blender.camera.target)!==JSON.stringify(captures.camera.target) ||
        blender.camera.verticalFov!==captures.camera.fov ||
        blender.camera.width!==captures.camera.width || blender.camera.height!==captures.camera.height)
      throw Error(`${id}: cameras are not matched`);
    for (const view of ['front','side','back']) {
      const source = blender.captures.find(item=>item.view===view&&item.clip==='idle');
      const high = captures.captures.find(item=>item.crew===id&&item.view===view&&item.clip==='idle'&&item.quality==='high');
      const performance = captures.captures.find(item=>item.crew===id&&item.view===view&&item.clip==='idle'&&item.quality==='performance');
      if (!source || !high || !performance || high.time!==source.time || performance.time!==source.time ||
          high.yaw!==source.yaw || performance.yaw!==source.yaw) throw Error(`${id}/${view}: unmatched pose/time`);
      const crop = blender.reference.crops.find(item=>item.view===view)?.crop;
      if (!crop || crop.length!==4 || crop.some(item=>!Number.isInteger(item)) ||
          crop[0]<0 || crop[1]<0 || crop[2]<=crop[0] || crop[3]<=crop[1]) throw Error('Invalid reference crop');
      await verify(source.path,source.sha256);await verify(high.path,high.sha256);await verify(performance.path,performance.sha256);
      rows.push({crew:id,clip:'idle',time:source.time,view,yaw:source.yaw,crop,
        reference:blender.reference.path,blender:source.path,high:high.path,performance:performance.path});
    }
  }
  const provenance = {round,observationCommit:captures.observationCommit,assets,sources,
    camera:captures.camera,qualities:captures.qualities,counts:captures.counts,
    rows,output:`${base}.png`,status:'Fidelity review evidence; scores and beta eligibility require independent review'};
  // Exclusive output prevents later rounds from silently replacing evidence.
  await writeFile(manifest,JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('Crew fidelity sheet: '+output);
}

async function firstPersonSheet(round) {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('First-person round must be 1..10');
  const base = `docs/board/looks/first-person/round-${round}`;
  const captures = JSON.parse(await readFile(join(root,base,'captures.json'),'utf8'));
  const blender = JSON.parse(await readFile(join(root,base,'blender-manifest.json'),'utf8'));
  if (JSON.stringify(captures.camera) !== JSON.stringify(blender.camera)) throw Error('First-person cameras differ');
  const sources = {}, rows = [];
  const verify = async (path, expected) => {
    const actual = createHash('sha256').update(await readFile(join(root,path))).digest('hex');
    if (actual !== expected) throw Error(`Evidence source changed: ${path}`);
    sources[path] = actual;
  };
  for (const asset of [...blender.tools,...blender.hands]) {
    const path = `public/assets/models/wasteland/first-person/${blender.hands.includes(asset) ? 'hands/' : ''}${asset.id}.glb`;
    await verify(path,asset.files[`${asset.id}.glb`]);
    if (captures.assets[path] !== sources[path]) throw Error('Browser used a different asset: '+path);
  }
  for (const hands of blender.hands) {
    await verify(hands.reference.path,hands.reference.sha256);
    for (const source of hands.captures) {
      const matches = quality => captures.captures.find(item => item.crew===source.crew &&
        item.clip===source.clip && item.time===source.time && item.tool===source.tool && item.quality===quality);
      const high=matches('high'),performance=matches('performance');
      if (!high || !performance) throw Error('Missing matched first-person sample '+source.crew+'/'+source.clip);
      await verify(source.path,source.sha256);await verify(high.path,high.sha256);await verify(performance.path,performance.sha256);
      rows.push({crew:source.crew,clip:source.clip,time:source.time,view:source.tool,
        crop:hands.reference.crop,reference:hands.reference.path,blender:source.path,high:high.path,performance:performance.path});
    }
  }
  for (const reference of blender.toolReferences || []) await verify(reference.path,reference.sha256);
  if (blender.hands.length!==8) throw Error('All eight crew are required');
  const output=resolve(root,`${base}.png`),manifest=resolve(root,`${base}.json`);
  await writeFile(manifest,JSON.stringify({round,observationCommit:captures.observationCommit,
    camera:captures.camera,assets:captures.assets,counts:captures.counts,qualities:captures.qualities,
    tile:{width:384,height:216},sources,rows,output:`${base}.png`,
    status:'Matched first-person evidence. References show crew identity, not first-person pose ground truth; independent review decides fidelity.'},null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH || 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('First-person fidelity sheet: '+output);
}
