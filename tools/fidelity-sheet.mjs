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
function evidenceDir(family, round) {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return resolve(root, process.env.DUEL_EVIDENCE_DIR || join('.evidence', day, family, `round-${round}`));
}
function summaryPath(family, round) {
  return join(root,'docs','board','looks',family,`round-${round}.jpg`);
}
const family = args.includes('--crew-p2-round') ? 'crew-p2' : args.includes('--crew-round') ? 'crew' : args.includes('--rustwall-round') ? 'rustwall'
  : args.includes('--first-person-round') || args.includes('--first-person-tools-round') ? 'first-person' : 'test-fighter';
const round = Number(value('--crew-p2-round', value('--crew-round', value('--rustwall-round',
  value('--first-person-round', value('--first-person-tools-round', 1))))));
if (args.includes('--paths-only')) {
  const directory = evidenceDir(family, round);
  const name = args.includes('--first-person-tools-round') ? 'sheet-tools' : 'sheet';
  console.log(JSON.stringify({directory, output:join(directory,`${name}.png`),
    manifest:join(directory,`${name}.json`),
    summary:args.includes('--first-person-tools-round') ? null : summaryPath(family,round)}));
  process.exit(0);
}
if (args.includes('--crew-p2-round')) {
  await crewP2Sheet(round);
} else if (args.includes('--rustwall-round')) {
  await rustwallSheet(Number(value('--rustwall-round')));
} else if (args.includes('--first-person-tools-round')) {
  await firstPersonSheet(Number(value('--first-person-tools-round')),true);
} else if (args.includes('--first-person-round')) {
  await firstPersonSheet(Number(value('--first-person-round')));
} else if (args.includes('--crew-round')) {
  await crewSheet(Number(value('--crew-round')));
} else {
const output = resolve(value('--output', join(evidenceDir('test-fighter',1),'sheet.png')));
const capturesPath = resolve(value('--captures', join(evidenceDir('test-fighter',1),'captures.json')));
const captures = JSON.parse(await readFile(capturesPath,'utf8'));
const blender = JSON.parse(await readFile(join(evidenceDir('test-fighter',1),'blender.json'),'utf8'));
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
  blender:rel(join(evidenceDir('test-fighter',1),'blender-'+item.clip+'-'+item.view+'.png')),
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
  '--','--root',root,'--manifest',manifest,'--output',output,
  '--summary',summaryPath('test-fighter',1)],{cwd:root,stdio:'inherit',windowsHide:true});
console.log('Fidelity sheet: '+output);
}


async function crewSheet(round) {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('Crew round must be 1..10');
  const base = evidenceDir('crew',round);
  const output = join(base,'sheet.png'), manifest = join(base,'sheet.json');
  const captures = JSON.parse(await readFile(join(base,'captures.json'),'utf8'));
  const hash = async path => createHash('sha256').update(await readFile(join(root,path))).digest('hex');
  const rows = [], sources = {}, assets = {}, crews = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
  const verify = async (path, expected) => {
    const actual = await hash(path);
    if (expected && actual !== expected) throw Error(`Evidence source changed: ${path}`);
    sources[path] = actual;
  };
  for (const id of crews) {
    const blender = JSON.parse(await readFile(join(base,`blender-${id}.json`),'utf8'));
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
    rows,output:relative(root,output).replaceAll('\\','/'),status:'Fidelity review evidence; scores and beta eligibility require independent review'};
  // Exclusive output prevents later rounds from silently replacing evidence.
  await writeFile(manifest,JSON.stringify(provenance,null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  await mkdir(dirname(summaryPath('crew',round)),{recursive:true});
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    '--summary',summaryPath('crew',round)],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('Crew fidelity sheet: '+output);
}

async function firstPersonSheet(round, toolsOnly=false) {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('First-person round must be 1..10');
  const base = evidenceDir('first-person',round);
  const captures = JSON.parse(await readFile(join(base,'captures.json'),'utf8'));
  const blender = JSON.parse(await readFile(join(base,'blender-manifest.json'),'utf8'));
  if (JSON.stringify(captures.camera) !== JSON.stringify(blender.camera)) throw Error('First-person cameras differ');
  const sources = {}, rows = [];
  const verify = async (path, expected) => {
    const actual = createHash('sha256').update(await readFile(join(root,path))).digest('hex');
    if (actual !== expected) throw Error(`Evidence source changed: ${path}`);
    sources[path] = actual;
  };
  for (const asset of [...blender.tools,...blender.hands]) {
    const path = `public/assets/models/wasteland/first-person/${blender.hands.includes(asset) ? 'hands/' : ''}${asset.id}.glb`;
    // A supplement compares retained evidence, even after later assets change.
    // The original full sheet already verified the actual frozen GLBs.
    if (!toolsOnly) await verify(path,asset.files[`${asset.id}.glb`]);
    if (captures.assets[path] !== asset.files[`${asset.id}.glb`]) throw Error('Browser used a different asset: '+path);
  }
  for (const hands of blender.hands) {
    await verify(hands.reference.path,hands.reference.sha256);
    for (const source of hands.captures) {
      const matches = quality => captures.captures.find(item => item.crew===source.crew &&
        item.clip===source.clip && item.time===source.time && item.tool===source.tool && item.quality===quality);
      const high=matches('high'),performance=matches('performance');
      if (!high || !performance) throw Error('Missing matched first-person sample '+source.crew+'/'+source.clip);
      await verify(source.path,source.sha256);await verify(high.path,high.sha256);await verify(performance.path,performance.sha256);
      if (!toolsOnly) rows.push({crew:source.crew,clip:source.clip,time:source.time,view:source.tool,
        crop:hands.reference.crop,reference:hands.reference.path,blender:source.path,high:high.path,performance:performance.path});
    }
  }
  for (const reference of blender.toolReferences || []) await verify(reference.path,reference.sha256);
  for (const [tool,clip,crops] of [
    ['rpg','idle',[[0,0,770,390],[790,360,1536,1024]]],
    ['wrench','wrench-idle',[[0,0,345,1024],[930,0,1536,1024]]],
  ]) {
    const reference=blender.toolReferences?.find(item=>item.path.endsWith(`wasteland-${tool}.png`));
    const source=blender.hands.find(item=>item.id==='rook')?.captures.find(item=>item.clip===clip);
    const matches=quality=>captures.captures.find(item=>item.crew==='rook'&&item.clip===clip&&item.tool===tool&&item.time===source?.time&&item.quality===quality);
    const high=matches('high'),performance=matches('performance');
    if(!reference||!source||!high||!performance)throw Error('Missing retained tool comparison: '+tool);
    for(const [index,crop] of crops.entries()) rows.push({crew:'rook',clip,time:source.time,
      view:`${tool} ${index===0?'shape':'held'} - reference pose differs`,crop,
      reference:reference.path,blender:source.path,high:high.path,performance:performance.path});
  }
  if (blender.hands.length!==8) throw Error('All eight crew are required');
  const outputBase=toolsOnly?'sheet-tools':'sheet';
  const output=join(base,`${outputBase}.png`),manifest=join(base,`${outputBase}.json`);
  await writeFile(manifest,JSON.stringify({round,observationCommit:captures.observationCommit,
    camera:captures.camera,assets:captures.assets,counts:captures.counts,qualities:captures.qualities,
    tile:{width:384,height:216},sources,rows,output:relative(root,output).replaceAll('\\','/'),
    status:'Blender and game poses match. Original crew and tool references use different poses; compare identity, shape, materials and grip only. Independent review decides fidelity.'},null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH || 'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  if (!toolsOnly) await mkdir(dirname(summaryPath('first-person',round)),{recursive:true});
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    ...(toolsOnly ? [] : ['--summary',summaryPath('first-person',round)])],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('First-person fidelity sheet: '+output);
}

async function rustwallSheet(round) {
  if(!Number.isInteger(round)||round<1||round>10)throw Error('Rustwall round must be 1..10');
  const base=evidenceDir('rustwall',round);
  const captures=JSON.parse(await readFile(join(base,'captures.json'),'utf8'));
  const blender=JSON.parse(await readFile(join(base,'blender-manifest.json'),'utf8'));
  const rows=[],sources={};
  const verify=async(path,expected)=>{
    const actual=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
    if(actual!==expected)throw Error('Evidence source changed: '+path);sources[path]=actual;
  };
  await verify(blender.reference.path,blender.reference.sha256);
  for(const [kind,asset] of Object.entries(blender.assets)) {
    await verify(asset.path,asset.sha256);
    if(captures.assets[kind]?.sha256!==asset.sha256)throw Error('Rustwall asset mismatch: '+kind);
  }
  for(const sample of blender.captures) {
    const high=captures.captures.find(item=>item.id===sample.id&&item.quality==='high');
    const performance=captures.captures.find(item=>item.id===sample.id&&item.quality==='performance');
    if(!high||!performance)throw Error('Missing Rustwall quality: '+sample.id);
    for(const game of [high,performance]) {
      if(JSON.stringify(game.camera)!==JSON.stringify(sample.camera)||game.cameraSpace!==sample.cameraSpace||
        game.gateOpen!==(sample.gateOpen||0)||JSON.stringify(game.moduleScale)!==JSON.stringify(sample.moduleScale))
        throw Error('Rustwall matched-pose mismatch: '+sample.id);
      await verify(game.path,game.sha256);
    }
    await verify(sample.path,sample.sha256);
    rows.push({clip:sample.kind,time:sample.gateOpen||0,
      view:sample.id+(sample.kind==='wash'?' - reference context only':''),
      label:`${sample.id} - gate ${(sample.gateOpen||0)*100} percent${sample.kind==='wash'?' - no matching rock reference':''}`,
      crop:sample.referenceCrop,reference:blender.reference.path,blender:sample.path,high:high.path,performance:performance.path});
  }
  const output=join(base,'sheet.png'),manifest=join(base,'sheet.json');
  await writeFile(manifest,JSON.stringify({round,observationCommit:captures.observationCommit,
    assets:captures.assets,reference:blender.reference,tile:{width:384,height:216},rows,sources,
    baseline:captures.baseline,cost:captures.cost,preparedGroundTriangles:captures.preparedGroundTriangles,
    output:relative(root,output).replaceAll('\\','/'),status:'Recorded model/camera comparisons. Reference people do not establish scale; wash reference provides context only. Independent review and measured cost decide fidelity.'},null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  await mkdir(dirname(summaryPath('rustwall',round)),{recursive:true});
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    '--summary',summaryPath('rustwall',round)],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('Rustwall fidelity sheet: '+output);
}

async function crewP2Sheet(round) {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw Error('Crew P2 round must be 1..10');
  const base = evidenceDir('crew-p2', round);
  const captures = JSON.parse(await readFile(join(base, 'captures.json'), 'utf8'));
  const blender = JSON.parse(await readFile(join(base, 'blender-rook.json'), 'utf8'));
  const sources = {}, rows = [], blenderViewHashes = new Set();
  const verify = async (path, expected) => {
    if (typeof path !== 'string' || !/^[a-f0-9]{64}$/.test(expected || ''))
      throw Error('Missing evidence path or SHA256');
    const actual = createHash('sha256').update(await readFile(resolve(root, path))).digest('hex');
    if (actual !== expected) throw Error('Evidence source changed: ' + path);
    sources[path] = actual;
  };
  const candidate = captures.candidate, qa = captures.qa, asset = captures.assets?.rook;
  if (captures.only !== 'rook' || !candidate || !qa || !asset ||
      candidate.path !== asset.path || candidate.sha256 !== asset.sha256 ||
      blender.asset?.path !== asset.path || blender.asset?.sha256 !== asset.sha256 ||
      qa.candidateSha256 !== asset.sha256 ||
      qa.baselineRookSha256 !== candidate.baselineRookSha256)
    throw Error('Rook candidate identity or hash mismatch');
  await verify(asset.path, asset.sha256);
  await verify('public/assets/models/wasteland/crew/rook.glb', qa.baselineRookSha256);
  for (const quality of ['high', 'performance']) {
    if (!Number.isInteger(qa.substitutionRequests?.[quality]) || qa.substitutionRequests[quality] < 1)
      throw Error('Missing positive candidate substitution count: ' + quality);
  }
  const fixed = {position:[0,.96,5], target:[0,.96,0], width:432, height:576};
  for (const [key, expected] of Object.entries(fixed)) {
    if (JSON.stringify(blender.camera?.[key]) !== JSON.stringify(expected) ||
        JSON.stringify(captures.camera?.[key]) !== JSON.stringify(expected))
      throw Error('Rook candidate camera mismatch: ' + key);
  }
  if (blender.camera.verticalFov !== 28 || captures.camera.fov !== 28)
    throw Error('Rook candidate camera FOV mismatch');
  await verify(blender.reference?.path, blender.reference?.sha256);
  for (const [view, yaw] of [['front',0], ['side',Math.PI/2], ['back',Math.PI]]) {
    const select = (items, predicate) => {
      const matches = (items || []).filter(predicate);
      if (matches.length !== 1) throw Error('Missing or duplicate Rook pose: ' + view);
      const sample = matches[0];
      if (sample.time !== .25 || sample.yaw !== yaw) throw Error('Rook pose/time mismatch: ' + view);
      return sample;
    };
    const source = select(blender.captures, item => item.view === view && item.clip === 'idle');
    const game = quality => select(captures.captures, item =>
      item.crew === 'rook' && item.view === view && item.clip === 'idle' && item.quality === quality);
    const high = game('high'), performance = game('performance');
    const crops = blender.reference.crops;
    const matches = Array.isArray(crops) ? crops.filter(item => item.view === view) : [];
    const crop = matches.length === 1 ? matches[0].crop : null;
    if (!Array.isArray(crop) || crop.length !== 4 || crop.some(item => !Number.isInteger(item)) ||
        crop[0] < 0 || crop[1] < 0 || crop[2] <= crop[0] || crop[3] <= crop[1])
      throw Error('Invalid Rook reference crop: ' + view);
    for (const sample of [source, high, performance]) await verify(sample.path, sample.sha256);
    if (blenderViewHashes.has(source.sha256)) throw Error('Duplicate Blender view image: ' + view);
    blenderViewHashes.add(source.sha256);
    rows.push({crew:'rook', clip:'idle', time:.25, view, yaw, crop,
      reference:blender.reference.path, blender:source.path, high:high.path, performance:performance.path});
  }
  const output = join(base, 'sheet.png'), manifest = join(base, 'sheet.json');
  await writeFile(manifest, JSON.stringify({round, observationCommit:captures.observationCommit,
    candidate, qa, assets:{rook:asset}, sources, camera:captures.camera, counts:captures.counts,
    qualities:captures.qualities, rows, output:relative(root,output).replaceAll('\\\\','/'),
    status:'Rook candidate review only. Scores, crowd cost and promotion require independent checks.'
  }, null, 2) + '\n', {flag:'wx'});
  const executable = value('--blender', process.env.BLENDER_PATH ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  await mkdir(dirname(summaryPath('crew-p2', round)), {recursive:true});
  execFileSync(executable, ['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    '--summary',summaryPath('crew-p2',round)], {cwd:root,stdio:'inherit',windowsHide:true});
  console.log('Rook candidate fidelity sheet: ' + output);
}
