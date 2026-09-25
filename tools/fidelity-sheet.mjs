import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve, dirname, relative, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const args = process.argv.slice(2);
const P1_HAND_IDS = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
const P1_SAMPLES = [
  ['idle',.25,'rpg'], ['aim',.25,'rpg'], ['fire',.1,'rpg'],
  ['reload',1.1,'rpg'], ['reload',1.65,'rpg'], ['aim-reload',1.1,'rpg'],
  ['wrench-idle',.25,'wrench'], ['repair',1.12,'wrench'],
];
const P1_CAMERA = {position:[0,0,0],target:[0,0,-1],verticalFov:72,near:.15,width:1280,height:720};
const P1_SHA = /^[a-f0-9]{64}$/i;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const p1Key = item => `${item.clip}|${item.time}|${item.tool}`;
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
const direct = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) {
const family = args.includes('--first-person-p1-round') ? 'first-person-p1' : args.includes('--crew-p2-round') ? 'crew-p2' : args.includes('--crew-round') ? 'crew' : args.includes('--rustwall-p2-round') ? 'rustwall-p2'
  : args.includes('--rustwall-round') ? 'rustwall'
  : args.includes('--first-person-round') || args.includes('--first-person-tools-round') ? 'first-person' : 'test-fighter';
const round = Number(value('--first-person-p1-round', value('--crew-p2-round', value('--crew-round', value('--rustwall-p2-round', value('--rustwall-round',
  value('--first-person-round', value('--first-person-tools-round', 1))))))));
if (args.includes('--paths-only')) {
  const directory = evidenceDir(family, round);
  const name = args.includes('--first-person-tools-round') ? 'sheet-tools' : 'sheet';
  console.log(JSON.stringify({directory, output:join(directory,`${name}.png`),
    manifest:join(directory,`${name}.json`),
    summary:args.includes('--first-person-tools-round') ? null : summaryPath(family,round)}));
  process.exit(0);
}
if (args.includes('--first-person-p1-round')) {
  await firstPersonP1Sheet(round);
} else if (args.includes('--crew-p2-round')) {
  await crewP2Sheet(round);
} else if (args.includes('--rustwall-p2-round')) {
  await rustwallP2Sheet(Number(value('--rustwall-p2-round')));
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

async function rustwallP2Sheet(round) {
  if(!Number.isInteger(round)||round<1||round>10)throw Error('Rustwall P2 round must be 1..10');
  const base=evidenceDir('rustwall-p2',round);
  const captures=JSON.parse(await readFile(join(base,'captures.json'),'utf8'));
  const blender=JSON.parse(await readFile(join(base,'blender-manifest.json'),'utf8'));
  const rows=[],sources={};
  const verify=async(path,expected)=>{
    if(!/^[a-f0-9]{64}$/i.test(expected||''))throw Error('Missing evidence source sha256: '+path);
    const actual=createHash('sha256').update(await readFile(join(root,path))).digest('hex');
    if(actual!==expected)throw Error('Evidence source changed: '+path);
    sources[path]=actual;
    return actual;
  };
  await verify(blender.reference.path,blender.reference.sha256);
  for(const [kind,asset] of Object.entries(blender.assets)) {
    await verify(asset.path,asset.sha256);
    if(captures.assets[kind]?.sha256!==asset.sha256)throw Error('Rustwall P2 asset mismatch: '+kind);
  }
  const contextPath='public/assets/reference/wasteland-art-direction.png';
  const contextCrop=[1010,15,1470,310];
  const contextSha=createHash('sha256').update(await readFile(join(root,contextPath))).digest('hex');
  sources[contextPath]=contextSha;
  const contextReference={path:contextPath,sha256:contextSha,
    crop:contextCrop,scope:'environment-context'};
  if(blender.contextReference && (blender.contextReference.path!==contextPath ||
    blender.contextReference.sha256!==contextReference.sha256 ||
    JSON.stringify(blender.contextReference.crop)!==JSON.stringify(contextCrop)))
    throw Error('Rustwall P2 canyon context provenance mismatch');
  const qualities=['high','performance'],routes=['a','b','c'];
  const pairs=new Set(routes.flatMap(route=>qualities.map(quality=>`${route}:${quality}`)));
  const placement=new Map(),routeCaptures=new Map();
  for(const item of captures.placement||[]) {
    const key=`${item.route}:${item.quality}`;
    if(!pairs.has(key)||placement.has(key))throw Error('Duplicate or unknown route placement: '+key);
    if(!Array.isArray(item.gate)||item.gate.length!==3||!Number.isFinite(item.bankCount))
      throw Error('Invalid route placement: '+key);
    placement.set(key,item);
  }
  if(placement.size!==pairs.size)throw Error('Missing A/B/C route placement');
  for(const item of captures.context||[]) {
    if(item.view!=='approach')continue;
    const key=`${item.route}:${item.quality}`;
    if(!pairs.has(key)||routeCaptures.has(key))throw Error('Duplicate or unknown route context capture: '+key);
    routeCaptures.set(key,item);
  }
  if(routeCaptures.size!==pairs.size)throw Error('Missing A/B/C route context capture');
  for(const item of routeCaptures.values())await verify(item.path,item.sha256);
  const wallIds=['front','depth','driver-approach','open-gate','full-span'];
  if(blender.captures.length!==6 || blender.captures.filter(item=>item.kind==='wall').length!==5 ||
    blender.captures[5]?.id!=='wash-module' || wallIds.some(id=>!blender.captures.some(item=>item.id===id)))
    throw Error('Rustwall P2 requires five matched wall views and one wash context view');
  for(const sample of blender.captures) {
    const high=captures.captures.filter(item=>item.id===sample.id&&item.quality==='high');
    const performance=captures.captures.filter(item=>item.id===sample.id&&item.quality==='performance');
    if(high.length!==1||performance.length!==1)throw Error('Missing or duplicate Rustwall P2 quality: '+sample.id);
    for(const game of [high[0],performance[0]]) {
      if(sample.kind==='wall') {
        if(JSON.stringify(game.camera)!==JSON.stringify(sample.camera)||
          game.cameraSpace!==sample.cameraSpace||game.gateOpen!==(sample.gateOpen||0)||
          JSON.stringify(game.moduleScale)!==JSON.stringify(sample.moduleScale))
          throw Error('Rustwall P2 matched wall pose mismatch: '+sample.id);
      } else if(game.counts?.scope!=='joined bank in the actual wash course') {
        throw Error('Rustwall P2 wash game capture lacks joined-bank scope: '+game.quality);
      }
      await verify(game.path,game.sha256);
    }
    await verify(sample.path,sample.sha256);
    rows.push(sample.kind==='wall'
      ? {clip:'wall',time:sample.gateOpen||0,view:sample.id,
        label:`WALL ${sample.id.toUpperCase()} CAMERA MATCH`,comparisonScope:'numeric-camera-match',
        crop:sample.referenceCrop,reference:blender.reference.path,
        blender:sample.path,high:high[0].path,performance:performance[0].path}
      : {clip:'wash',time:0,view:'wash-module',
        label:'WASH SOURCE MODULE AND GAME JOINED BANK NO CAMERA MATCH',
        comparisonScope:'source-module-vs-runtime-bank',
        columnLabels:['REFERENCE ENVIRONMENT CONTEXT','BLENDER SOURCE MODULE',
          'HIGH GAME JOINED BANK','PERFORMANCE GAME JOINED BANK'],
        crop:contextCrop,reference:contextPath,
        blender:sample.path,high:high[0].path,performance:performance[0].path});
  }
  const output=join(base,'sheet.png'),manifest=join(base,'sheet.json');
  await writeFile(manifest,JSON.stringify({round,observationCommit:captures.observationCommit,
    assets:captures.assets,reference:blender.reference,contextReference,
    tile:{width:384,height:216},rows,sources,
    placement:[...pairs].map(key=>placement.get(key)),
    routeCaptures:[...pairs].map(key=>routeCaptures.get(key)),
    baseline:captures.baseline,cost:captures.cost,preparedGroundTriangles:captures.preparedGroundTriangles,
    output:relative(root,output).replaceAll('\\','/'),
    status:'Five wall views share numeric cameras. Wash reference is environment context; Blender is a source module and game views are joined runtime banks. Visual review and measured cost decide fidelity.'},null,2)+'\n',{flag:'wx'});
  const executable=value('--blender',process.env.BLENDER_PATH||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  await mkdir(dirname(summaryPath('rustwall-p2',round)),{recursive:true});
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    '--summary',summaryPath('rustwall-p2',round)],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('Rustwall P2 fidelity sheet: '+output);
}

export function validateFirstPersonP1Sheet({captures,blender,round,productionHashes}) {
  if (!Number.isInteger(round) || round < 1 || round > 10 ||
      captures?.family !== 'first-person-p1' || blender?.family !== 'first-person-p1' ||
      captures.round !== round || blender.round !== round ||
      blender.scope !== 'Blender source module at authored camera')
    throw Error('First-person P1 family, round or source scope mismatch');
  if (!P1_SHA.test(captures.candidate?.sha256 || '') ||
      captures.candidate.sha256 !== blender.candidateSha256)
    throw Error('First-person P1 candidate hash mismatch');
  if (typeof captures.candidate.path !== 'string' ||
      !/^art-build\/first-person-p1\/(?:[a-z0-9-]+\/)*hands\/rook\.glb$/.test(captures.candidate.path))
    throw Error('First-person P1 candidate must stay in ignored Rook proof output');
  if (!same(captures.camera,P1_CAMERA) || !same(blender.camera,P1_CAMERA))
    throw Error('First-person P1 camera mismatch');
  if (captures.frameStatus !== 'unmeasured') throw Error('First-person P1 cannot infer frame cost from static captures');
  for (const quality of ['high','performance'])
    if (captures.qualities?.[quality]?.candidateRequests !== 1)
      throw Error('First-person P1 needs exactly one candidate fetch in '+quality);
  for (const hashes of [productionHashes,captures.productionBefore,captures.productionAfter]) {
    if (!hashes || Object.keys(hashes).length !== P1_HAND_IDS.length ||
        P1_HAND_IDS.some(id => !P1_SHA.test(hashes[id] || '')))
      throw Error('First-person P1 requires eight production hand hashes');
  }
  if (!same(captures.productionBefore,productionHashes) || !same(captures.productionAfter,productionHashes))
    throw Error('Production hands changed during candidate capture');
  for (const reference of [blender.references?.crew,blender.references?.rpgArm]) {
    if (!reference?.path || !P1_SHA.test(reference.sha256 || '') ||
        !Array.isArray(reference.crop) || reference.crop.length !== 4 ||
        reference.crop.some(n => !Number.isInteger(n)))
      throw Error('First-person P1 reference provenance missing');
  }
  if (!Array.isArray(blender.captures) || blender.captures.length !== P1_SAMPLES.length ||
      !Array.isArray(captures.captures) || captures.captures.length !== P1_SAMPLES.length * 2)
    throw Error('First-person P1 requires eight Blender and sixteen game poses');
  const rows = P1_SAMPLES.map(([clip,time,tool]) => {
    const key = `${clip}|${time}|${tool}`;
    const source = blender.captures.filter(item => p1Key(item) === key);
    const game = quality => captures.captures.filter(item => p1Key(item) === key && item.quality === quality);
    const high = game('high'), performance = game('performance');
    if (source.length !== 1 || high.length !== 1 || performance.length !== 1 ||
        source[0].scope !== 'Blender source module' ||
        high[0].scope !== 'game course' || performance[0].scope !== 'game course')
      throw Error('First-person P1 missing or mislabelled pose '+key);
    for (const image of [source[0],high[0],performance[0]])
      if (!image.path || !P1_SHA.test(image.sha256 || '')) throw Error('First-person P1 pose SHA missing: '+key);
    const reference = tool === 'rpg' ? blender.references.rpgArm : blender.references.crew;
    return {label:`ROOK ${clip.toUpperCase()} ${time} S ${tool.toUpperCase()} MODULE VS GAME COURSE`,
      clip,time,tool,scope:'Blender module vs game course',
      columnLabels:['REFERENCE','BLENDER MODULE','GAME HIGH','GAME PERF'],
      reference:reference.path,crop:reference.crop,blender:source[0].path,
      high:high[0].path,performance:performance[0].path};
  });
  return {rows,candidateSha256:captures.candidate.sha256,camera:captures.camera,productionHashes};
}

async function firstPersonP1Sheet(round) {
  const base = evidenceDir('first-person-p1',round);
  const published = summaryPath('first-person-p1',round);
  try {await readFile(published);throw Error('Published first-person P1 round JPG is immutable');}
  catch (error) {if (error.code !== 'ENOENT') throw error;}
  const captures = JSON.parse(await readFile(join(base,'captures.json'),'utf8'));
  // Reject an incomplete or wrong-family capture before opening any ignored
  // candidate artifact. This also makes the CLI check reproducible from a
  // clean checkout with only a test-owned invalid captures fixture.
  if (captures?.family !== 'first-person-p1' || captures.round !== round)
    throw Error('First-person P1 family, round or source scope mismatch');
  const blender = JSON.parse(await readFile(join(root,
    'art-build/first-person-p1/candidate/evidence/blender-manifest.json'),'utf8'));
  const productionHashes = {};
  for (const id of P1_HAND_IDS) productionHashes[id] = createHash('sha256').update(await readFile(join(root,
    `public/assets/models/wasteland/first-person/hands/${id}.glb`))).digest('hex');
  const plan = validateFirstPersonP1Sheet({captures,blender,round,productionHashes});
  const sources = {};
  const verify = async (path,expected) => {
    if (typeof path !== 'string' || !P1_SHA.test(expected || '')) throw Error('Invalid first-person P1 source');
    const absolute = resolve(root,path);
    const part = relative(root,absolute);
    if (!part || part.startsWith('..') || part.includes(':')) throw Error('First-person P1 source leaves workspace');
    const actual = createHash('sha256').update(await readFile(absolute)).digest('hex');
    if (actual !== expected) throw Error('First-person P1 evidence source changed: '+path);
    sources[path] = actual;
  };
  await verify(captures.candidate.path,captures.candidate.sha256);
  for (const id of P1_HAND_IDS) await verify(`public/assets/models/wasteland/first-person/hands/${id}.glb`,productionHashes[id]);
  for (const item of Object.values(blender.references)) await verify(item.path,item.sha256);
  for (const item of Object.values(blender.tools)) await verify(item.path,item.sha256);
  for (const item of blender.captures) await verify(item.path,item.sha256);
  for (const item of captures.captures) await verify(item.path,item.sha256);
  const output = join(base,'sheet.png'), manifest = join(base,'sheet.json');
  const status = 'Rook first-person candidate only. Blender shows an isolated source module; High and Performance show the game course. Lighting and environment differ. Independent visual and motion review decides fidelity; frame cost is unmeasured here.';
  await writeFile(manifest,JSON.stringify({family:'first-person-p1',round,
    observationCommit:captures.observationCommit,candidate:captures.candidate,
    productionHashes,camera:plan.camera,qualities:captures.qualities,
    references:blender.references,tools:blender.tools,orderedMotion:captures.orderedMotion,
    frameStatus:captures.frameStatus,tile:{width:384,height:216},
    rows:plan.rows,sources,output:relative(root,output).replaceAll('\\','/'),status},null,2)+'\n',{flag:'wx'});
  const executable = value('--blender',process.env.BLENDER_PATH ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe');
  await mkdir(dirname(published),{recursive:true});
  execFileSync(executable,['-b','--python',join(root,'tools/blender/fidelity-sheet.py'),
    '--','--root',root,'--manifest',manifest,'--output',output,
    '--summary',published],{cwd:root,stdio:'inherit',windowsHide:true});
  console.log('First-person P1 fidelity sheet: '+output);
}
