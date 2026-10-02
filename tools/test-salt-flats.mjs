import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, lstatSync, writeFileSync} from 'node:fs';
import {dirname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {ARENA_MODES, ARENA_RULES} from '../src/arena/arena-event.js';
import {ARENA_VENUES, SCRAPDOME_VENUE, spawnSlots, venueCurvatureRatio} from '../src/arena/venues.js';
import {floorLimit, worldPose} from '../src/arena/arena-floor.js';
import {createFeatureFlags, FEATURE_STATES} from '../src/feature-flags.js';
import {rankForXp} from '../src/notoriety.js';
import {arenaYardPanel} from '../src/screen-arena.js';
import {createProfile} from '../src/progression.js';
import {disposeTree} from '../src/world.js';

// The default includes every source, native and runtime consumer check. Native
// WIP can use --native-only; it is not the card's passing acceptance or merge gate.
// Visual wear/white-bowl/heat-shimmer and <=10% actual High/Performance frame cost
// require matched game captures. No synthetic timing or mesh label claims those.
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const configPath=join(root,'tools/art/salt-flats-fit.json');
const config=JSON.parse(readFileSync(configPath,'utf8'));
const catalog=JSON.parse(readFileSync(join(root,'tools/art/catalog.json'),'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[],check=(group,name,run)=>checks.push({group,name,run});
const qaHome=join(root,'.qa-dist');mkdirSync(qaHome,{recursive:true});
const scratch=mkdtempSync(join(qaHome,'salt-flats-tests-'));
const blender=process.env.BLENDER_EXE||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
const recipe=join(root,'tools/blender/salt-flats.py');
const sourceRecords=[...new Set(config.sourcePicks.map(row=>row.catalogId))]
  .map(id=>{const row=catalog.assets.find(item=>item.id===id);assert.ok(row,`approved catalog source ${id}`);return row;});
const originals=config.sourcePicks.map(pick=>({...pick,key:`${pick.catalogId}/${pick.path}`,
  file:resolve(sourceRecords.find(row=>row.id===pick.catalogId).library,pick.path)}));
const protectedPaths=execFileSync('git',['ls-files','public'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
  .concat(['tools/art/catalog.json','tools/replays/expected-fingerprints.json','tools/replays/combat-fingerprints.json',
    'tools/replays/hidden-road-ordinary.json','tools/test-world-composition.mjs']);
const initialHashes=protectedPaths.map(path=>hash(readFileSync(join(root,path))));
const sourceFiles=sourceRecords.flatMap(row=>row.files.map(file=>resolve(row.library,file.path)));
const initialSourceHashes=sourceFiles.map(path=>hash(readFileSync(path)));
const loader=new GLTFLoader();
loader.register(()=>({name:'SALT_TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
const meshList=group=>{const found=[];group.traverse(node=>{if(node.isMesh)found.push(node);});return found;};
async function asset(path){
  const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',0,4),'glTF','actual native GLB');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'complete native export');
  let json,binary;
  for(let offset=12;offset<bytes.length;){const size=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4);
    assert.ok(offset+8+size<=bytes.length,'complete GLB chunk');const chunk=bytes.subarray(offset+8,offset+8+size);
    if(kind===0x4e4f534a)json=JSON.parse(chunk.toString('utf8'));if(kind===0x004e4942)binary=chunk;offset+=size+8;}
  assert.ok(json&&binary,'exported native geometry');
  for(const resource of [...(json.buffers||[]),...(json.images||[])])
    assert.ok(!resource.uri||resource.uri.startsWith('data:'),'runtime candidate has no external resources');
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);return {json,binary,gltf};
}
function triangles(mesh,matrix=mesh.matrixWorld){
  const geometry=mesh.geometry,positions=geometry.attributes.position,result=[];
  for(let at=0;at<(geometry.index?.count??positions.count);at+=3)
    result.push([0,1,2].map(k=>new THREE.Vector3().fromBufferAttribute(positions,
      geometry.index?geometry.index.getX(at+k):at+k).applyMatrix4(matrix).toArray()));
  return result;
}
const triangleKey=triangle=>triangle.map(point=>point.map(value=>value.toFixed(5)).join(',')).sort().join('/');
const geometryFingerprint=model=>hash(JSON.stringify(meshList(model.gltf.scene).map(mesh=>({name:mesh.name,
  triangles:triangles(mesh).map(triangleKey).sort()})).sort((a,b)=>a.name.localeCompare(b.name))));
function images(model){return (model.json.images||[]).map(image=>{
  if(image.uri)return Buffer.from(image.uri.split(',')[1],'base64');const view=model.json.bufferViews[image.bufferView];
  assert.ok(view,'embedded image buffer view');return model.binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);});}
let sourceGeometry;
function inspectOriginals(){
  if(sourceGeometry)return sourceGeometry;
  const input=join(scratch,'originals.json'),script=join(scratch,'inspect-originals.py'),report=join(scratch,'native-originals.json');
  writeFileSync(input,JSON.stringify(originals));
  writeFileSync(script,`import bpy,json,sys\nfrom pathlib import Path\nargs=sys.argv[sys.argv.index('--')+1:]\nrows=json.loads(Path(args[0]).read_text())\nresult={}\nfor row in rows:\n bpy.ops.wm.read_factory_settings(use_empty=True)\n path=Path(row['file'])\n if path.suffix=='.blend': bpy.ops.wm.open_mainfile(filepath=str(path),use_scripts=False)\n elif path.suffix=='.fbx': bpy.ops.import_scene.fbx(filepath=str(path))\n else: bpy.ops.import_scene.gltf(filepath=str(path))\n faces=[]\n for obj in sorted((o for o in bpy.context.scene.objects if o.type=='MESH'),key=lambda o:o.name):\n  obj.data.calc_loop_triangles()\n  for face in obj.data.loop_triangles:\n   points=[]\n   for index in face.vertices:\n    p=obj.matrix_world@obj.data.vertices[index].co\n    points.append([p.x,p.z,-p.y])\n   faces.append(points)\n result[row['key']]=faces\nPath(args[1]).write_text(json.dumps(result)+'\\n')\n`);
  execFileSync(blender,['-b','--disable-autoexec','--python-exit-code','1','--python',script,'--',input,report],
    {cwd:root,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  sourceGeometry=JSON.parse(readFileSync(report,'utf8'));return sourceGeometry;
}
function runRecipe(output,extra=[]){
  assert.ok(existsSync(recipe),'missing actual Salt Flats source-validation and native-build recipe');
  return execFileSync(blender,['-b','--disable-autoexec','--python-exit-code','1','--python',recipe,'--',
    '--root',root,'--output-dir',output,'--fit-config',configPath,'--seed',String(config.seed),...extra],
    {cwd:root,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024});
}
let buildPromise;
function build(){
  if(!buildPromise)buildPromise=(async()=>{const output=join(scratch,'candidate');runRecipe(output);
    return {output,model:await asset(join(output,'venue.glb')),manifest:JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'))};})();
  return buildPromise;
}
let privateLibrary;
function copiedLibrary(){
  if(privateLibrary)return privateLibrary;privateLibrary=join(scratch,'negative-source-library');
  for(const record of sourceRecords)for(const file of record.files){const target=join(privateLibrary,record.id,file.path);
    mkdirSync(dirname(target),{recursive:true});cpSync(resolve(record.library,file.path),target);}
  return privateLibrary;
}
function rejectSourceMutation(recordId,relative,changed){
  assert.ok(existsSync(recipe),'missing actual Salt Flats source-validation and native-build recipe');
  const library=copiedLibrary(),file=join(library,recordId,relative),original=readFileSync(file),output=mkdtempSync(join(scratch,'reject-'));
  try{writeFileSync(file,changed(original));let error;
    try{runRecipe(output,['--validate-sources','--source-library',library]);}catch(caught){error=caught;}
    assert.ok(error,'changed or unapproved licensed source must be rejected');
    assert.ok(!existsSync(join(output,'venue.glb')),'invalid source never becomes a substitute venue');
  }finally{writeFileSync(file,original);}
}
for(const record of sourceRecords)check('source',`${record.id}: actual approved CC0 source bytes and licence are pinned`,()=>{
  assert.equal(record.license,'CC0-1.0');assert.match(record.sourcePage,/^https:\/\//);
  for(const file of record.files){const bytes=readFileSync(resolve(record.library,file.path));
    assert.equal(hash(bytes),file.sha256,`${record.id}/${file.path} actual hash`);
    if(file.bytes!==undefined)assert.equal(bytes.length,file.bytes,`${file.path} actual byte count`);
    if(/License\.txt$|license-evidence\.txt$|source-page\.html$/i.test(file.path))
      assert.match(bytes.toString('utf8'),/CC0|publicdomain\/zero|Creative Commons Zero/i,'cached primary licence evidence');}
});
check('source','the picked plain Bus and nine original geometries are independently native',()=>{
  assert.deepEqual(config.sourcePicks.map(row=>row.model),['sedan','debris-door','debris-drivetrain','debris-tire',
    'shipping-container-a','shipping-container-b','crane','crane-magnet','Bus']);
  assert.equal(originals.filter(row=>row.catalogId==='quaternius-public-transport').length,1,'SchoolBus is not the pick');
  const actual=inspectOriginals();assert.deepEqual(originals.map(row=>actual[row.key].length),[2032,68,412,288,402,402,564,172,1530]);
});
check('source','generated salt settings keep an explicit seed and bounded native atlas',()=>{
  assert.equal(config.saltGround.generator,'seeded');assert.equal(config.saltGround.seed,config.seed);
  assert.ok(config.saltGround.pixels.every(value=>Number.isSafeInteger(value)&&value>0&&value<=2048));
});
check('source','actual source validation accepts the approved cache without exporting a venue',()=>{
  const output=join(scratch,'source-validation');runRecipe(output,['--validate-sources']);
  assert.ok(!existsSync(join(output,'venue.glb')),'source validation does not pretend to be a native consumer');
});
check('source','actual source validation rejects an empty cache before export',()=>{
  assert.ok(existsSync(recipe),'missing actual Salt Flats source-validation and native-build recipe');
  const library=join(scratch,'empty-library'),output=join(scratch,'empty-rejected');mkdirSync(library);
  assert.throws(()=>runRecipe(output,['--validate-sources','--source-library',library]));
  assert.ok(!existsSync(join(output,'venue.glb')),'no missing-source substitute');
});
check('source','actual source validation rejects changed model bytes',()=>rejectSourceMutation('kenney-car-kit',
  'unpacked/Models/GLB format/sedan.glb',bytes=>{const copy=Buffer.from(bytes);copy[copy.length-1]^=1;return copy;}));
check('source','actual source validation rejects changed licence evidence',()=>rejectSourceMutation('kenney-factory-kit',
  'unpacked/License.txt',()=>Buffer.from('CC BY-NC. Commercial reuse is not granted.\n')));
check('source','actual source validation rejects legitimate but unpicked SchoolBus geometry in the Bus slot',()=>
  rejectSourceMutation('quaternius-public-transport','blend/Bus.blend',()=>readFileSync(resolve(
    sourceRecords.find(row=>row.id==='quaternius-public-transport').library,'blend/SchoolBus.blend'))));
check('native','new venue exports actual self-contained geometry into private lane scratch',async()=>{
  const {output,model}=await build();assert.ok(output.startsWith(qaHome+sep));assert.ok(meshList(model.gltf.scene).length);
  const walk=folder=>{for(const name of readdirSync(folder)){const path=join(folder,name);assert.ok(!lstatSync(path).isSymbolicLink());
    if(lstatSync(path).isDirectory())walk(path);else assert.ok(resolve(path).startsWith(output+sep),'output containment');}};walk(output);
});
for(const family of ['kenney-car-kit','kenney-city-kit-industrial','kenney-factory-kit','quaternius-public-transport'])
  check('native',`${family}: fitted output contains actual original source triangles`,async()=>{
    const {model,manifest}=await build(),native=inspectOriginals();const rows=manifest.sourceInstances?.filter(row=>row.sourceKey.startsWith(family+'/'));
    assert.ok(rows?.length,'picked family is visible native geometry, not a provenance label');let compared=0;
    for(const row of rows){const mesh=model.gltf.scene.getObjectByName(row.node);assert.ok(mesh?.isMesh,'source target mesh exists');
      const faces=triangles(mesh),source=native[row.sourceKey];assert.ok(source,'only a picked model supplies source geometry');
      assert.equal(row.matrix?.length,16);assert.ok(row.matrix.every(Number.isFinite));const matrix=new THREE.Matrix4().fromArray(row.matrix);
      assert.ok(Number.isInteger(row.triangleStart)&&row.triangleStart>=0);assert.ok(row.sourceTriangleIndices?.length);
      for(const [offset,index]of row.sourceTriangleIndices.entries()){assert.ok(Number.isInteger(index)&&index>=0&&index<source.length,'real original face');
        const face=faces[row.triangleStart+offset];assert.ok(face,'declared face exists in real GLB');
        for(const point of source[index].map(p=>new THREE.Vector3(...p).applyMatrix4(matrix).toArray()))
          assert.ok(face.some(vertex=>point.every((value,axis)=>Math.abs(value-vertex[axis])<=1e-4)),
            'native candidate face matches actual transformed original vertices');compared++;}}
    assert.ok(compared>0);
  });
check('native','ground geometry realizes the authored 300 by 200 metre salt bowl target',async()=>{
  const {model,manifest}=await build(),ground=model.gltf.scene.getObjectByName(manifest.ground?.node);assert.ok(ground?.isMesh,'real salt ground mesh');
  const size=new THREE.Box3().setFromObject(ground).getSize(new THREE.Vector3());
  // The recipe authors the nominal target. Physics/scene placement may have an
  // irregular edge; no new gameplay range is inferred from the word "about".
  assert.ok(Math.abs(size.x-config.targetSizeMetres.width)<.01&&Math.abs(size.z-config.targetSizeMetres.depth)<.01,
    `nominal salt ground ${size.x} by ${size.z} metres`);
  assert.ok(triangles(ground).length>0,'ground is real geometry');
});
check('native','original bright pack palettes do not survive in fitted output',async()=>{
  const {model}=await build();const originals=sourceRecords.flatMap(row=>row.files.filter(file=>file.path.endsWith('Textures/colormap.png'))
    .map(file=>file.sha256));for(const bytes of images(model))assert.ok(!originals.includes(hash(bytes)),'no unchanged source colour palette');
});
check('native','real venue has two ramps, salvage cover, crane, plain derelict bus and stacked boundary parts',async()=>{
  const {model,manifest}=await build();assert.ok(Array.isArray(manifest.features));
  const counts=kind=>manifest.features.filter(row=>row.kind===kind);assert.equal(counts('ramp').length,2);
  for(const kind of ['salvage-cover','crane','bus','tyre-wall','container-wall'])assert.ok(counts(kind).length,`actual ${kind} geometry`);
  for(const feature of manifest.features){const mesh=model.gltf.scene.getObjectByName(feature.node);
    assert.ok(mesh?.isMesh&&triangles(mesh).length>0,`${feature.kind} has actual exported triangles`);}
  const rows=manifest.sourceInstances.filter(row=>row.sourceKey.endsWith('/blend/Bus.blend'));
  assert.ok(rows.length,'plain Bus topology supplies the bus');
  assert.ok(!manifest.sourceInstances.some(row=>row.sourceKey.includes('SchoolBus')),'unpicked school bus never substituted');
});
check('native','solid cover and boundary geometry fits its declared collision envelope',async()=>{
  const {model,manifest}=await build();let checked=0;
  for(const feature of manifest.features.filter(row=>['salvage-cover','bus','tyre-wall','container-wall'].includes(row.kind))){
    const collider=feature.collision;assert.ok(collider,'physical cover/boundary has a collision envelope');
    assert.equal(collider.center?.length,3);assert.equal(collider.halfExtents?.length,3);
    assert.ok([...collider.center,...collider.halfExtents,collider.heading].every(Number.isFinite));
    assert.ok(collider.halfExtents.every(value=>value>0));const cosine=Math.cos(collider.heading),sine=Math.sin(collider.heading);
    const mesh=model.gltf.scene.getObjectByName(feature.node);
    for(const triangle of triangles(mesh))for(const point of triangle){const dx=point[0]-collider.center[0],dz=point[2]-collider.center[2];
      assert.ok(Math.abs(cosine*dx-sine*dz)<=collider.halfExtents[0]+.002&&
        Math.abs(point[1]-collider.center[1])<=collider.halfExtents[1]+.002&&
        Math.abs(sine*dx+cosine*dz)<=collider.halfExtents[2]+.002,'actual solid geometry stays in its declared physical envelope');checked++;}}
  assert.ok(checked>0);
});
check('native','the actual native layout repeats from seed and inputs',async()=>{
  const first=await build(),output=join(scratch,'repeat');runRecipe(output);const second=await asset(join(output,'venue.glb'));
  assert.equal(geometryFingerprint(second),geometryFingerprint(first.model),'actual exported geometry repeats');
  const manifest=JSON.parse(readFileSync(join(output,'manifest.json'),'utf8'));
  assert.deepEqual(manifest.features,first.manifest.features,'same physical features and positions');
  assert.deepEqual(manifest.sourceInstances,first.manifest.sourceInstances,'same original source transformations');
  assert.deepEqual(manifest.ground,first.manifest.ground,'fixed generated salt metadata and image hashes repeat');
  const groundImages=model=>{
    const node=model.json.nodes.find(row=>row.name==='salt-flats-ground');
    const material=model.json.materials[model.json.meshes[node.mesh].primitives[0].material];
    return [material.pbrMetallicRoughness.baseColorTexture,material.normalTexture].map(texture=>{
      assert.ok(texture,'native generated salt has its embedded color and crust normal textures');
      return hash(images(model)[model.json.textures[texture.index].source]);
    });
  };
  assert.deepEqual(groundImages(second),groundImages(first.model),'actual embedded generated ground bytes repeat');
});
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.cancelAnimationFrame=()=>{};
const flags=(enabled=true,overrides={})=>createFeatureFlags({storage:null,qa:enabled,search:enabled?'?flags=salt-flats':'',
  overrides:{wasteland2:true,'hidden-road':true,scrapdome:true,warlords:true,'fuel-run':true,...overrides}});
const xpAtRank=rank=>Array.from({length:rank-1},(_,i)=>400+150*i).reduce((sum,value)=>sum+value,0);
async function yard({rank=9,discovered=true,enabled=true,overrides={}}={}){
  const {App}=await import('../src/app.js');memory.clear();const app=new App();app.duel.featureFlags=flags(enabled,overrides);
  app.audio.unlock=()=>{};app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:discovered,rank,xp:xpAtRank(rank)}};
  assert.equal(rankForXp(app.profile.wasteland.xp),rank);assert.equal(app._saveProfile(),true,'synthetic profile only');
  if(discovered){app.duel.featureFlags=flags(enabled,{...overrides,wasteland2:true});
    assert.equal(app.visitWasteland(),true);app.advance(8);assert.equal(app.isYardHomeActive(),true);
    app.duel.featureFlags=flags(enabled,overrides);}
  return app;
}
const publicModes=['last-car-rolling','fuel-run']; // Claude's 2 October released Salt scope.
// Additive tests first against the current pure yard-panel seam. venueId is
// the settled selected-venue input; a returned Salt choice must be a real button.
function panelProfile(rank=9,discovered=true){
  const profile=createProfile();Object.assign(profile.wasteland,{rank,xp:xpAtRank(rank),discoveredGate:discovered});
  return profile;
}
function venueButtons(markup){
  return [...markup.matchAll(/<button\b[^>]*data-arena-venue="([^"]+)"[^>]*>[\s\S]*?<\/button>/g)]
    .map(match=>({id:match[1],markup:match[0]}));
}
for(const mode of publicModes){
  for(const options of [{rank:8,enabled:true},{rank:9,enabled:false}]){
    check('runtime',`${mode}: pure yard panel hides locked Salt choice ${JSON.stringify(options)}`,()=>{
      const profile=panelProfile(options.rank),featureFlags=flags(options.enabled),before=JSON.stringify(profile);
      const markup=arenaYardPanel({profile,featureFlags,mode,venueId:'salt-flats'});
      assert.equal(venueButtons(markup).some(button=>button.id==='salt-flats'),false,'locked Salt is absent from actual venue buttons');
      assert.ok(markup.includes('ENTER THE SCRAPDOME'),'locked selection keeps the existing entry label');
      assert.equal(markup.includes('ENTER THE SALT FLATS'),false,'locked Salt never advertises entry');
      assert.equal(JSON.stringify(profile),before,'pure panel preserves the synthetic named profile');
    });
  }
  check('runtime',`${mode}: pure rank-nine yard panel exposes both actual venue buttons`,()=>{
    const profile=panelProfile(),before=JSON.stringify(profile);
    const markup=arenaYardPanel({profile,featureFlags:flags(),mode});
    const buttons=venueButtons(markup);
    assert.deepEqual(buttons.map(button=>button.id).sort(),['salt-flats','scrapdome'],'eligible choice uses both real venue buttons');
    assert.match(markup,/role="group"[^>]*aria-label="Arena venue"/,'venue selection is an accessible native group');
    assert.match(buttons.find(button=>button.id==='scrapdome').markup,/aria-pressed="true"/,'default venue remains selected');
    assert.match(buttons.find(button=>button.id==='salt-flats').markup,/aria-pressed="false"/,'Salt is not selected by default');
    assert.ok(markup.includes('ENTER THE SCRAPDOME'),'default label stays exact');
    assert.equal(JSON.stringify(profile),before,'pure panel never changes rank or discovery');
  });
  check('runtime',`${mode}: pure selected-Salt panel shows actual selection and entry label`,()=>{
    const profile=panelProfile(),before=JSON.stringify(profile);
    const markup=arenaYardPanel({profile,featureFlags:flags(),mode,venueId:'salt-flats'});
    assert.ok(markup.includes('ENTER THE SALT FLATS'),'selected Salt has the actual entry label in both built modes');
    const buttons=venueButtons(markup);
    assert.match(buttons.find(button=>button.id==='salt-flats')?.markup||'',/aria-pressed="true"/,'selected Salt is pressed');
    assert.match(buttons.find(button=>button.id==='salt-flats')?.markup||'',/class="[^"]*\bon\b/,'selected Salt has the native choice-on state');
    assert.match(buttons.find(button=>button.id==='scrapdome')?.markup||'',/aria-pressed="false"/,'old venue is not selected');
    assert.ok(markup.includes(mode==='fuel-run'?'FUEL RUN · FIRST TO FIVE':'LAST CAR ROLLING · EVERY CAR FOR ITSELF'),'venue selection keeps the real chosen mode');
    assert.equal(JSON.stringify(profile),before,'selected venue rendering is pure');
  });
  check('runtime',`${mode}: native Duel rejects Salt with its dev flag off without mutation`,()=>{
    const duel=new Duel({seed:1989,featureFlags:flags(false)}),before=JSON.stringify(duel.state);
    assert.equal(duel.featureFlags.enabled('fuel-run'),true,'Fuel remains on for the native Salt-off control');
    assert.equal(duel.startArenaEvent({venueId:'salt-flats',mode,car:'falcone_f42',seed:1989,
      opponents:[{car:'dusthawk_rally'}]}),false,'native known Salt launch requires its actual dev switch');
    assert.equal(JSON.stringify(duel.state),before,'rejected native launch preserves current state');
  });
}
check('runtime','Salt Flats has its own dev switch and never appears as a racing circuit',()=>{
  assert.equal(FEATURE_STATES['salt-flats'],'dev','new venue remains dev before review/release');
  assert.equal(createFeatureFlags({storage:null,qa:false}).enabled('salt-flats'),false);
  assert.equal(flags().enabled('salt-flats'),true,'private QA can enable the real dev flag');
  assert.equal(COURSE.some(row=>row.id==='salt-flats'),false,'venue is not a main-menu circuit');
});
check('runtime','the registered second venue is physically seeded and has two usable ramps and clear spawns',()=>{
  const venue=ARENA_VENUES['salt-flats'];assert.ok(venue,'missing registered Salt Flats venue consumer');
  assert.notEqual(venue,SCRAPDOME_VENUE);const course=new Course(venue,1989);assert.equal(course.features.ramps.length,2);
  assert.ok(venueCurvatureRatio(course)<1,'physical floor cannot fold over itself');
  const slots=spawnSlots(course);assert.ok(slots.length>=4);
  for(const slot of slots){assert.equal(course.jumpAt(slot.s),0,'spawn is not on a ramp');assert.ok(Math.abs(slot.lateral)<course.def.scrapdome.floorHalfWidth);}
  for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++){
    const a=course.worldAt(slots[i].s,slots[i].lateral),b=course.worldAt(slots[j].s,slots[j].lateral);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=ARENA_RULES.spawnClearMetres,'existing arena spawn-clearance rule');}
  assert.deepEqual(new Course(venue,1989).features,course.features,'actual physics repeats from seed');
});
for(const options of [{rank:8},{discovered:false},{enabled:false},{overrides:{scrapdome:false}},{overrides:{wasteland2:false}}])
  check('runtime',`public Salt Flats launch rejects ${JSON.stringify(options)}`,async()=>{
    const app=await yard(options);try{const before=JSON.parse(JSON.stringify({state:app.duel.state,profile:app.profile}));
      assert.equal(app.startArenaEvent({venueId:'salt-flats',mode:'last-car-rolling'}),false,'locked venue cannot silently launch the default Scrapdome');
      assert.deepEqual(JSON.parse(JSON.stringify({state:app.duel.state,profile:app.profile})),before,'rejected launch does not mutate player or event');
    }finally{app.dispose?.();}
  });
check('runtime','rank nine and discovery enable the selected venue through the actual public launcher',async()=>{
  const app=await yard();try{assert.equal(app.startArenaEvent({venueId:'salt-flats',mode:'last-car-rolling'}),true);
    assert.equal(app.duel.state.arena.venueId,'salt-flats','selection reaches the actual event/course');
    assert.equal(app.duel.course.def.id,'salt-flats');assert.equal(app.profile.activeRace,null,'venue never becomes a race save');
  }finally{app.dispose?.();}
});
for(const request of [{venueId:'not-a-venue',mode:'last-car-rolling'},{venueId:'salt-flats',mode:'not-a-mode'}])
  check('runtime',`public launcher rejects unknown selection ${JSON.stringify(request)}`,async()=>{
    const app=await yard();try{const before=JSON.stringify(app.duel.state);assert.equal(app.startArenaEvent(request),false);
      assert.equal(JSON.stringify(app.duel.state),before,'invalid selection never falls back silently');
    }finally{app.dispose?.();}
  });
check('runtime','Fuel Run uses its legitimate dev flag independently of Salt Flats',()=>{
  assert.equal(FEATURE_STATES['fuel-run'],'dev','Fuel Run remains dev before review/release');
  assert.equal(createFeatureFlags({storage:null,qa:false}).enabled('fuel-run'),false);
  assert.equal(flags().enabled('fuel-run'),true,'private native fixtures explicitly enable the existing Fuel flag');
  assert.equal(flags(false).enabled('salt-flats'),false,'Salt can be disabled independently');
  assert.equal(flags(false).enabled('fuel-run'),true,'off-Salt rejection keeps Fuel enabled');
});
for(const options of [{rank:8},{discovered:false},{enabled:false},{overrides:{scrapdome:false}},
  {overrides:{wasteland2:false}},{overrides:{'fuel-run':false}}])
  check('runtime',`public Salt Flats Fuel Run rejects ${JSON.stringify(options)}`,async()=>{
    const app=await yard(options);try{
      if(options.enabled===false)assert.equal(app.duel.featureFlags.enabled('fuel-run'),true,'Fuel stays enabled in off-Salt control');
      const before=JSON.parse(JSON.stringify({state:app.duel.state,profile:app.profile}));
      assert.equal(app.startArenaEvent({venueId:'salt-flats',mode:'fuel-run'}),false,
        'locked Salt Fuel entry cannot silently launch the default venue');
      assert.deepEqual(JSON.parse(JSON.stringify({state:app.duel.state,profile:app.profile})),before,
        'rejected Fuel launch preserves native state and named profile');
    }finally{app.dispose?.();}
  });
check('runtime','rank nine and discovery launch Salt Fuel Run through the actual App',async()=>{
  const app=await yard();try{
    assert.equal(app.duel.featureFlags.enabled('fuel-run'),true,'genuine Fuel dev flag is enabled');
    assert.equal(app.startArenaEvent({venueId:'salt-flats',mode:'fuel-run'}),true);
    assert.equal(app.duel.state.arena.venueId,'salt-flats','public Fuel selection reaches the requested venue');
    assert.equal(app.duel.state.arena.mode,'fuel-run','public Fuel selection reaches the implemented rules');
    assert.equal(app.duel.course.def.id,'salt-flats');
    assert.equal(app.profile.activeRace,null,'arena entry never becomes a race save');
  }finally{app.dispose?.();}
});
for(const mode of publicModes)check('runtime',`${mode}: Salt rank-nine availability is independent of ordinary arena entry`,async()=>{
  const app=await yard({rank:8});try{
    assert.equal(app.startArenaEvent({venueId:'scrapdome',mode}),true,'existing venue still admits the same mode below Salt rank');
    assert.equal(app.duel.state.arena.venueId,'scrapdome');
    assert.equal(app.duel.state.arena.mode,mode);
  }finally{app.dispose?.();}
});
for(const request of [{venueId:'not-a-venue',mode:'fuel-run'}])
  check('runtime',`Fuel public launcher rejects unknown venue ${JSON.stringify(request)}`,async()=>{
    const app=await yard();try{const before=JSON.stringify(app.duel.state);
      assert.equal(app.startArenaEvent(request),false,'unknown Fuel venue never falls back silently');
      assert.equal(JSON.stringify(app.duel.state),before);
    }finally{app.dispose?.();}
  });
check('runtime','default Scrapdome launch remains available below Salt Flats rank and with its dev flag off',async()=>{
  const app=await yard({rank:1,enabled:false});try{assert.equal(app.startArenaEvent(),true);
    assert.equal(app.duel.state.arena.venueId,'scrapdome');assert.equal(app.duel.state.arena.mode,'last-car-rolling');
  }finally{app.dispose?.();}
});
for(const mode of publicModes)check('runtime',`${mode}: a complete Salt Flats round stays physical and repeats its result`,()=>{
  function play(){const duel=new Duel({seed:1989,featureFlags:flags()});
    assert.equal(duel.startArenaEvent({venueId:'salt-flats',mode,car:'falcone_f42',seed:1989,cpuDifficulty:'medium',
      opponents:[{car:'dusthawk_rally'}]}),true,`missing built ${mode} Salt Flats consumer`);
    const rules=ARENA_MODES[mode];
    if(mode==='fuel-run'){
      assert.equal(rules.timeLimitSec,180,'released Fuel Run uses its exact 180 s round');
      assert.equal(rules.suddenDeathSec,Infinity,'released Fuel tie ends only on the next delivery');
    }else assert.ok(Number.isFinite(rules.timeLimitSec)&&Number.isFinite(rules.suddenDeathSec),'built mode has its published round limits');
    // Independently reviewed migration: Infinity is a genuine game rule.
    // This finite observation watchdog fails a nonfinishing test; it never
    // writes arena limits, forces a result or supplies a game time limit.
    const observationSec=mode==='fuel-run'?600:rules.timeLimitSec+rules.suddenDeathSec;
    const tickLimit=Math.ceil((duel.state.countdown+observationSec+1)*120);
    const trace=[],events=[];duel.onChange((_state,event)=>{if(event.arenaWreck||event.arenaResult)events.push(event);});
    for(let tick=0;tick<tickLimit&&duel.state.status!=='arena_result';tick++){
      duel.setInput({throttle:.75,brake:0,steer:.08,boost:false});duel.step(1/120);
      for(const actor of [duel.state,...duel.state.opponents]){
        const at=worldPose(duel,actor);assert.ok([actor.s,actor.lateral,actor.speedMph,at.x,at.z].every(Number.isFinite));
        assert.ok(Math.abs(actor.lateral)<=floorLimit(duel)+1e-6,'player and CPUs remain inside the physical venue');}
      if(tick%120===119)trace.push({phase:duel.state.arena.phase,clock:duel.state.arena.clockSec,
        actors:[duel.state,...duel.state.opponents].map(actor=>({s:actor.s,lateral:actor.lateral,speed:actor.speedMph})),
        participants:duel.state.arena.participants.map(row=>({id:row.id,wrecks:row.wrecks,wrecked:row.wrecked}))});}
    assert.equal(duel.state.arena.venueId,'salt-flats');assert.equal(duel.state.status,'arena_result','public mode finishes through its actual rules');
    assert.ok(duel.state.arena.result,'completed round has a genuine result');return {trace,events,result:duel.state.arena.result};}
  assert.deepEqual(play(),play(),'actual seeded rule/results trace repeats');
});
check('runtime','actual game scene consumes native source geometry without altering arena state',async()=>{
  const file=join(root,'src/arena/venues/salt-flats.js');assert.ok(existsSync(file),'missing Salt Flats native scene consumer');
  const api=await import('../src/arena/venues/salt-flats.js');assert.equal(typeof api.createSaltFlatsScene,'function');
  const {model}=await build(),venue=ARENA_VENUES['salt-flats'];assert.ok(venue);const course=new Course(venue,1989);
  const before=JSON.stringify(course.features),untouched=new Course(venue,1989);
  const scene=api.createSaltFlatsScene(course,{loadAsset:async()=>model.gltf});
  try{assert.equal(await scene.ready,true,'actual native venue loads');scene.group.updateMatrixWorld(true);
    const actual=meshList(scene.group);assert.ok(actual.length,'native scene is attached');
    for(const source of meshList(model.gltf.scene))assert.ok(actual.some(mesh=>mesh.geometry===source.geometry),
      'source geometry reaches actual game presentation instead of being replaced by proxies');
    assert.equal(JSON.stringify(course.features),before,'rendering never changes collision or rules');
    assert.deepEqual(Array.from({length:4},()=>course.rng.float()),Array.from({length:4},()=>untouched.rng.float()),'presentation never consumes simulation RNG');
  }finally{disposeTree(scene.group);scene.dispose?.();}
});
function scrapdomeControls(){
  const course=new Course(SCRAPDOME_VENUE,1989);
  const physicalSha256=hash(JSON.stringify({venue:SCRAPDOME_VENUE,samples:course.samples,
    features:course.features,spawns:spawnSlots(course)}));
  const duel=new Duel({seed:1989,featureFlags:flags()});
  assert.equal(duel.startArenaEvent({car:'falcone_f42',seed:1989,cpuDifficulty:'medium',
    opponents:[{car:'dusthawk_rally'}]}),true);
  const trace=[];
  for(let tick=0;tick<8*120;tick++){
    duel.setInput({throttle:.75,brake:0,steer:.08,boost:false});duel.step(1/120);
    if(tick%120===119)trace.push({status:duel.state.status,phase:duel.state.arena.phase,clock:duel.state.arena.clockSec,
      actors:[duel.state,...duel.state.opponents].map(actor=>({s:actor.s,lateral:actor.lateral,
        speed:actor.speedMph,heading:actor.headingError,armor:actor.armor,airborne:actor.airborne})),
      participants:duel.state.arena.participants.map(row=>({id:row.id,wrecks:row.wrecks,wrecked:row.wrecked}))});
  }
  return {physicalSha256,traceSha256:hash(JSON.stringify(trace)),
    ordinaryReplayFileSha256:hash(readFileSync(join(root,'tools/replays/expected-fingerprints.json')))};
}
const controlsPath=join(root,'tools/replays/salt-flats-controls.json');

// Changed fit inputs must preserve Kyle's selected model/catalog/path binding.
// These use real, hash-valid cached sources; byte substitution alone cannot
// expose a mislabeled source whose own catalog pin is perfectly valid.
function rejectChangedPick({name,catalogId,path,triangles,validateOnly}){
  const row=catalog.assets.find(item=>item.id===catalogId);
  const pin=row?.files.find(item=>item.path===path);
  assert.ok(pin,`native negative fixture exists in the actual catalog: ${catalogId}/${path}`);
  const original=resolve(row.library,path);
  assert.equal(hash(readFileSync(original)),pin.sha256,'negative uses genuine unchanged source bytes');
  const changed=structuredClone(config),pick=changed.sourcePicks.find(item=>item.model==='Bus');
  assert.ok(pick,'the settled plain Bus slot exists');
  Object.assign(pick,{catalogId,path,sha256:pin.sha256,triangles});
  const fit=join(scratch,`${name}-fit.json`),output=join(scratch,`${name}-output`);
  writeFileSync(fit,JSON.stringify(changed,null,2)+'\n');
  assert.ok(!existsSync(output),'private output starts absent');
  let rejected=false,log='';
  try{log=execFileSync(blender,['-b','--disable-autoexec','--python-exit-code','1','--python',recipe,'--',
    '--root',root,'--output-dir',output,'--fit-config',fit,'--seed',String(config.seed),
    ...(validateOnly?['--validate-sources']:[])],
    {cwd:root,encoding:'utf8',timeout:240000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
  }catch(error){
    assert.equal(error.status,1,'a native recipe rejection, rather than missing executable or timeout');
    rejected=true;log=String(error.stdout||'')+'\n'+String(error.stderr||'');
  }
  writeFileSync(join(scratch,`${name}-verdict.json`),JSON.stringify({model:pick.model,catalogId,path,
    triangles,validateOnly,rejected,outputExists:existsSync(output),
    glbExists:existsSync(join(output,'venue.glb')),log},null,2)+'\n');
  assert.ok(rejected,`native ${validateOnly?'source validation':'export'} accepted unpicked ${catalogId}/${path} as Bus (${triangles} triangles)`);
  assert.ok(!existsSync(output),'wrong selected source is rejected before any output directory or export');
  assert.match(log,/picked|selected|approved.*native|plain Bus|source.*(?:selection|binding)/i,
    'native rejection identifies the selected-source contract');
}
check('source','changed fit cannot label genuine SchoolBus as the selected plain Bus during validation',()=>
  rejectChangedPick({name:'changed-fit-schoolbus-validation',catalogId:'quaternius-public-transport',
    path:'blend/SchoolBus.blend',triangles:1782,validateOnly:true}));
check('source','changed fit cannot export genuine unpicked SchoolBus geometry under a Bus label',()=>
  rejectChangedPick({name:'changed-fit-schoolbus-export',catalogId:'quaternius-public-transport',
    path:'blend/SchoolBus.blend',triangles:1782,validateOnly:false}));
check('source','changed fit cannot bind the Bus label to another selected pack and its genuine sedan',()=>
  rejectChangedPick({name:'changed-fit-bus-catalog-validation',catalogId:'kenney-car-kit',
    path:'unpacked/Models/GLB format/sedan.glb',triangles:2032,validateOnly:true}));
check('control','existing Scrapdome physical geometry and real seeded driving/rule trace stay exact',()=>{
  assert.ok(existsSync(controlsPath),'independently captured current Scrapdome control fixture');
  const expected=JSON.parse(readFileSync(controlsPath,'utf8'));
  assert.deepEqual(scrapdomeControls(),expected.scrapdome,'new venue cannot alter the current venue or ordinary replay pins');
});
check('control','all current runtime art, old assertions/replay pins and licensed originals remain unchanged',()=>{
  assert.deepEqual(protectedPaths.map(path=>hash(readFileSync(join(root,path)))),initialHashes);
  assert.deepEqual(sourceFiles.map(path=>hash(readFileSync(path))),initialSourceHashes);
});
if(process.argv.includes('--capture-controls')){
  assert.ok(!existsSync(controlsPath),'capture creates the new control once; never regenerates an existing pin');
  const capturedCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  writeFileSync(controlsPath,JSON.stringify({version:1,capturedCommit,
    scope:'Unmodified Scrapdome physical features/spawns and eight-second actual 120 Hz LCR trace; no old fingerprints regenerated.',
    scrapdome:scrapdomeControls()},null,2)+'\n');
  console.log('Salt Flats: independent existing-venue controls captured once.');process.exit(0);
}
// Generated-ground acceptance replaces the active photo assertions under
// Kyle's written 1 October decision; driving and native donor checks stay exact.
check('ground-config','the salt ground uses a fixed generator seed and no active photograph input',()=>{
  assert.ok(Number.isSafeInteger(config.seed),'venue has an explicit repeatable seed');
  assert.equal(config.saltPhoto,undefined,'retired salt photo must be removed from the active ground configuration');
  assert.equal(config.saltGround?.generator,'seeded','ground is selected as generated salt');
  assert.equal(config.saltGround?.seed,config.seed,'generated salt uses the fixed venue seed');
});
check('native','generated ground excludes the retired photo and mirrored samplers',async()=>{
  const {model,manifest}=await build();
  assert.equal(manifest.ground.generator,'seeded','native export identifies generated salt');
  assert.equal(manifest.ground.seed,config.saltGround.seed,'native ground uses the settled fixed seed');
  const retired=catalog.assets.find(row=>row.id==='marina-salt-crystals-beach').files
    .find(row=>row.path==='salt-crystals-on-beach-textures.jpg').sha256;
  const nativeImages=images(model);
  assert.ok(nativeImages.every(bytes=>hash(bytes)!==retired),'retired photo is absent from the native venue');
  const node=model.json.nodes.find(row=>row.name===manifest.ground.node);assert.ok(node?.mesh!==undefined);
  for(const primitive of model.json.meshes[node.mesh].primitives){
    const texture=model.json.materials[primitive.material]?.pbrMetallicRoughness?.baseColorTexture;
    assert.ok(texture,'generated ground uses a genuine embedded salt texture');
    const row=model.json.textures[texture.index];assert.ok(nativeImages[row.source]?.length);
    const sampler=model.json.samplers?.[row.sampler];
    assert.notEqual(sampler?.wrapS,33648,'ground does not mirror the generated U texture');
    assert.notEqual(sampler?.wrapT,33648,'ground does not mirror the generated V texture');
  }
  // Tone, crust, grain, tyre dust and visible repeat are judged in game captures.
});
let failures=0;const nativeOnly=process.argv.includes('--native-only');
const entryOnly=process.argv.includes('--entry-only');
const roundsOnly=process.argv.includes('--rounds-only');
const groundConfigOnly=process.argv.includes('--ground-config-only');
const selected=checks.filter(row=>roundsOnly?row.group==='runtime'&&/a complete Salt Flats/.test(row.name):entryOnly?row.group==='runtime'&&!/a complete Salt Flats|actual game scene/.test(row.name):groundConfigOnly?['ground-config','control'].includes(row.group):!nativeOnly||row.group!=='runtime');
for(const {group,name,run}of selected)try{await run();}catch(error){failures++;console.error(`FAIL [${group}] ${name}: ${error.message}`);}
console.log(`Salt Flats${nativeOnly?' native WIP':''}: ${selected.length} checks, ${selected.length-failures} passed, ${failures} failed.`);
if(failures)process.exitCode=1;
if(groundConfigOnly||entryOnly||roundsOnly)process.exit(failures?1:0);

// Independent ARENA-06 geometry acceptance. Append only: preserve every byte
// of the independent geometry checks; approved Fuel entry/rule additions above
// are recorded in ARENA-06.md. Native triangles are
// the oracle; no sine/sine-squared recipe or private Course helper is copied.
const geometryCheckStart=checks.length;
const physicalTolerance=.002; // two millimetres covers exported float precision.
function registeredSaltCourse(){
  const venue=ARENA_VENUES['salt-flats'];
  assert.ok(venue,'geometry acceptance requires the actual registered Salt Flats Course');
  return new Course(venue,config.seed);
}
function meshSurfaceAt(meshes,x,z){
  let height=null;
  for(const mesh of meshes)for(const [a,b,c] of triangles(mesh)){
    const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
    if(Math.abs(denominator)<1e-12)continue; // vertical faces provide no driving surface.
    const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator;
    const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator,w=1-u-v;
    // Include the authored triangle edges despite float rotation round-off.
    if(Math.min(u,v,w)<-1e-6||Math.max(u,v,w)>1+1e-6)continue;
    const y=u*a[1]+v*b[1]+w*c[1];if(height===null||y>height)height=y;
  }
  return height;
}
function measuredRamp(model,feature){
  const mesh=model.gltf.scene.getObjectByName(feature.node);
  assert.ok(mesh?.isMesh,`${feature.id}: native ramp geometry exists`);
  const box=new THREE.Box3().setFromObject(mesh),center=box.getCenter(new THREE.Vector3());
  const stations=[...new Set(triangles(mesh).flat().map(p=>p[2]))].sort((a,b)=>a-b);
  return {mesh,box,center,stations};
}
function actualSurfaceAt(course,x,z,label){
  const nearest=course.nearest(x,z),world=course.worldAt(nearest.s,nearest.lateral);
  const ground=course.groundAt(nearest.s,nearest.lateral);
  assert.ok([nearest.s,nearest.lateral,world.x,world.z,ground.x,ground.y,ground.z].every(Number.isFinite),
    `${label}: real physical mapping stays finite`);
  assert.ok(Math.hypot(world.x-x,world.z-z)<=physicalTolerance,
    `${label}: nearest/world mapping misses native position by ${Math.hypot(world.x-x,world.z-z)} m`);
  assert.ok(Math.hypot(ground.x-x,ground.z-z)<=physicalTolerance,
    `${label}: groundAt samples a different native world position`);
  return ground;
}
function compareNativeHeight(course,meshes,x,z,label){
  const expected=meshSurfaceAt(meshes,x,z);
  assert.notEqual(expected,null,`${label}: actual triangle oracle has a surface`);
  const actual=actualSurfaceAt(course,x,z,label);
  assert.ok(Math.abs(actual.y-expected)<=physicalTolerance,
    `${label}: groundAt height ${actual.y} differs from actual native triangle height ${expected}`);
}
check('native','geometry oracle reads both native ramps at stations and inside real triangles',async()=>{
  const {model,manifest}=await build(),ramps=manifest.features.filter(row=>row.kind==='ramp');
  assert.equal(ramps.length,2);
  for(const feature of ramps){
    const {mesh,box,center,stations}=measuredRamp(model,feature);
    assert.ok(stations.length>3,'actual export has enough stations to test a profile rather than only its crest');
    assert.ok(Math.abs(box.max.x-box.min.x-feature.profile.width)<=physicalTolerance);
    assert.ok(Math.abs(box.max.z-box.min.z-feature.profile.length)<=physicalTolerance);
    assert.ok(Math.abs(center.x-feature.profile.center[0])<=physicalTolerance);
    assert.ok(Math.abs(center.z-feature.profile.center[2])<=physicalTolerance);
    for(const z of stations)assert.notEqual(meshSurfaceAt([mesh],center.x,z),null,'native station intersects a real triangle');
    const quarter=stations[Math.floor((stations.length-1)/4)],height=meshSurfaceAt([mesh],center.x,quarter);
    assert.ok(height>0&&height<box.max.y,'actual quarter station lies below the native crest and above the floor');
    for(const face of triangles(mesh)){
      const centroid=new THREE.Vector3();for(const p of face)centroid.add(new THREE.Vector3(...p));centroid.divideScalar(3);
      assert.ok(Math.abs(meshSurfaceAt([mesh],centroid.x,centroid.z)-centroid.y)<1e-5,
        'actual triangle interpolation oracle agrees with actual mesh triangle centroid');
    }
  }
});
check('native','geometry oracle measures the native ground origin, bounds and exact ramp footprints',async()=>{
  const {model,manifest}=await build(),ground=model.gltf.scene.getObjectByName(manifest.ground.node);
  const bounds=new THREE.Box3().setFromObject(ground),center=bounds.getCenter(new THREE.Vector3());
  assert.ok(Math.hypot(center.x,center.z)<=physicalTolerance,'native 300 by 200 ground is centered at the authored origin');
  for(const [x,z]of [[center.x,center.z],[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.max.z]])
    assert.ok(Math.abs(meshSurfaceAt([ground],x,z))<=physicalTolerance,'actual native ground triangles provide the flat floor');
  assert.equal(meshSurfaceAt([ground],bounds.max.x+1,center.z),null,'triangle oracle does not invent ground outside the actual mesh');
  for(const feature of manifest.features.filter(row=>row.kind==='ramp')){
    const {mesh,box,center:at}=measuredRamp(model,feature),quarter=box.min.z+(box.max.z-box.min.z)/4;
    for(const x of [box.min.x,at.x,box.max.x])assert.ok(meshSurfaceAt([mesh],x,quarter)>0,'native ramp edge/center has actual positive height');
    for(const x of [box.min.x-.05,box.max.x+.05,at.x+(box.max.x-box.min.x)]){
      assert.equal(meshSurfaceAt([mesh],x,quarter),null,'actual native ramp footprint ends at its eight-metre width');
      assert.ok(Math.abs(meshSurfaceAt([ground,mesh],x,quarter))<=physicalTolerance,'just-outside and eight-metre-side witnesses remain on actual salt floor');
    }
  }
});
check('native','geometry oracle measures actual cover and boundary meshes against native collision envelopes',async()=>{
  const {model,manifest}=await build();let measured=0;
  for(const feature of manifest.features.filter(row=>['salvage-cover','bus','crane','tyre-wall','container-wall'].includes(row.kind))){
    const mesh=model.gltf.scene.getObjectByName(feature.node),envelope=feature.collision;
    assert.ok(mesh?.isMesh&&envelope,'actual visible solid mesh has its native physical envelope');
    const [x,y,z]=envelope.center,cosine=Math.cos(envelope.heading),sine=Math.sin(envelope.heading);
    const low=[Infinity,Infinity,Infinity],high=[-Infinity,-Infinity,-Infinity];
    for(const face of triangles(mesh))for(const point of face){
      const dx=point[0]-x,dz=point[2]-z,local=[cosine*dx-sine*dz,point[1]-y,sine*dx+cosine*dz];
      for(let i=0;i<3;i++){low[i]=Math.min(low[i],local[i]);high[i]=Math.max(high[i],local[i]);}
    }
    for(let i=0;i<3;i++){
      assert.ok(Math.abs(low[i]+high[i])<=physicalTolerance,'declared native envelope stays centered on actual visible mesh');
      const measuredHalf=(high[i]-low[i])/2,padding=envelope.halfExtents[i]-measuredHalf;
      assert.ok(padding>=-1e-6&&padding<=physicalTolerance+1e-6,
        feature.id+': actual mesh and native collision envelope differ only by export margin');
    }
    measured++;
  }
  assert.ok(measured>=5,'native controls measure every solid feature family including the crane');
});
for(const id of ['salt-ramp-1','salt-ramp-2']){
  check('runtime',`${id}: registered groundAt matches all actual native ramp stations`,async()=>{
    const {model,manifest}=await build(),course=registeredSaltCourse();
    const feature=manifest.features.find(row=>row.id===id),{mesh,center,stations}=measuredRamp(model,feature);
    for(const z of stations)compareNativeHeight(course,[mesh],center.x,z,`${id}/station ${z}`);
  });
  check('runtime',`${id}: registered groundAt matches mid-segment and triangle-interpolated heights`,async()=>{
    const {model,manifest}=await build(),course=registeredSaltCourse();
    const feature=manifest.features.find(row=>row.id===id),{mesh,center,stations}=measuredRamp(model,feature);
    for(let i=1;i<stations.length;i++)compareNativeHeight(course,[mesh],center.x,
      (stations[i-1]+stations[i])/2,`${id}/mid-segment ${i}`);
    for(const face of triangles(mesh)){
      const at=new THREE.Vector3();for(const p of face)at.add(new THREE.Vector3(...p));at.divideScalar(3);
      compareNativeHeight(course,[mesh],at.x,at.z,`${id}/actual triangle centroid`);
    }
  });
  check('runtime',`${id}: registered groundAt respects native center, sides, edges and outside footprint`,async()=>{
    const {model,manifest}=await build(),course=registeredSaltCourse();
    const feature=manifest.features.find(row=>row.id===id),{mesh,box,center}=measuredRamp(model,feature);
    const ground=model.gltf.scene.getObjectByName(manifest.ground.node),width=box.max.x-box.min.x;
    for(const z of [box.min.z+(box.max.z-box.min.z)/4,center.z]){
      for(const x of [center.x,center.x-width/4,center.x+width/4,box.min.x,box.max.x,
        box.min.x-.05,box.max.x+.05,center.x+width,center.x-width])
        compareNativeHeight(course,[ground,mesh],x,z,`${id}/footprint x=${x} z=${z}`);
    }
    for(const z of [box.min.z-.05,box.max.z+.05])
      compareNativeHeight(course,[ground,mesh],center.x,z,`${id}/outside ramp end`);
  });
}
check('runtime','registered Course mapping preserves the actual native ground origin and footprint coordinates',async()=>{
  const {model,manifest}=await build(),course=registeredSaltCourse();
  const ground=model.gltf.scene.getObjectByName(manifest.ground.node),bounds=new THREE.Box3().setFromObject(ground);
  const center=bounds.getCenter(new THREE.Vector3());
  // Coordinate/height acceptance only: this does not decide which portions of
  // the rectangular bowl are playable or invent an inner-Heap exclusion.
  for(const [x,z]of [[center.x,center.z],[bounds.min.x+1,center.z],[bounds.max.x-1,center.z],
    [center.x,bounds.min.z+1],[center.x,bounds.max.z-1]])
    compareNativeHeight(course,[ground],x,z,`native ground coordinate ${x},${z}`);
});
check('runtime','registered Course declared floor samples stay inside the real native ground envelope',async()=>{
  const {model,manifest}=await build(),course=registeredSaltCourse();
  const ground=model.gltf.scene.getObjectByName(manifest.ground.node),ramps=manifest.features
    .filter(row=>row.kind==='ramp').map(row=>model.gltf.scene.getObjectByName(row.node));
  const bounds=new THREE.Box3().setFromObject(ground);
  for(const sample of course.samples){
    const halfWidth=course.roadHalfWidthAt(sample.s);
    assert.ok(Number.isFinite(halfWidth)&&halfWidth>0,'native Course declares a real floor width');
    for(const lateral of [-halfWidth*.95,0,halfWidth*.95]){
      const at=course.worldAt(sample.s,lateral),expected=meshSurfaceAt([ground,...ramps],at.x,at.z);
      assert.ok(at.x>=bounds.min.x-physicalTolerance&&at.x<=bounds.max.x+physicalTolerance&&
        at.z>=bounds.min.z-physicalTolerance&&at.z<=bounds.max.z+physicalTolerance,
        `declared drivable sample ${sample.s}/${lateral} lies outside actual native salt ground`);
      assert.notEqual(expected,null,'declared floor has actual visible native triangles under it');
      const actual=course.groundAt(sample.s,lateral);
      assert.ok(Math.abs(actual.y-expected)<=physicalTolerance,'declared driving surface agrees with native ground/ramp triangles');
    }
  }
});
for(const kind of ['salvage-cover','bus','crane','tyre-wall','container-wall']){
  check('runtime',`${kind}: native visible collision envelopes reach actual Course buckets and swept contacts`,async()=>{
    const {sweepObstacle}=await import('../src/collision.js');
    const {model,manifest}=await build(),course=registeredSaltCourse();
    const features=manifest.features.filter(row=>row.kind===kind);assert.ok(features.length);
    for(const feature of features){
      const envelope=feature.collision;assert.ok(envelope,'native solid feature has its actual exported collision envelope');
      const [x,y,z]=envelope.center,[halfX,halfY,halfZ]=envelope.halfExtents;
      const obstacle=course.features.obstacles.find(row=>Math.hypot(row.x-x,row.z-z)<=physicalTolerance&&
        Math.abs(row.halfX-halfX)<=physicalTolerance&&Math.abs(row.halfZ-halfZ)<=physicalTolerance);
      assert.ok(obstacle,`${feature.id}: actual Course has the collider at the native envelope, not shifted generic junk`);
      assert.ok(Math.abs((obstacle.heading||0)-envelope.heading)<=physicalTolerance,'native collider orientation is retained');
      const low=obstacle.minY??obstacle.y,high=obstacle.maxY??(obstacle.y+obstacle.height);
      assert.ok(Math.abs(low-(y-halfY))<=physicalTolerance&&Math.abs(high-(y+halfY))<=physicalTolerance,
        `${feature.id}: native collider vertical envelope is retained`);
      const mapped=actualSurfaceAt(course,x,z,`${feature.id}/native collider center`);
      const nearest=course.nearest(mapped.x,mapped.z);
      assert.ok(course.obstaclesNear(nearest.s).includes(obstacle),`${feature.id}: actual obstacle buckets expose native cover`);
      const body={halfWidth:.01,halfLength:.01,height:.1};
      const from={x:x-halfX-2,y,z},to={x,y,z},hit=sweepObstacle(from,to,obstacle,0,body);
      assert.ok(hit,`${feature.id}: native sweep actually hits the declared visible envelope`);
      const contactX=from.x+(to.x-from.x)*hit.t;
      assert.ok(Math.abs(contactX-(x-halfX-body.halfWidth))<=physicalTolerance,
        `${feature.id}: native contact occurs at the visible envelope edge`);
      const missFrom={...from,z:z+halfZ+.5},missTo={...to,z:z+halfZ+.5};
      assert.equal(sweepObstacle(missFrom,missTo,obstacle,0,body),null,
        `${feature.id}: steering outside native envelope misses actual cover`);
    }
  });
}
const geometrySelected=checks.slice(geometryCheckStart).filter(row=>!nativeOnly||row.group!=='runtime');
let geometryFailures=0;
for(const {group,name,run}of geometrySelected)try{await run();}catch(error){
  geometryFailures++;console.error(`FAIL [geometry/${group}] ${name}: ${error.message}`);
}
console.log(`Salt Flats geometry${nativeOnly?' native WIP':''}: ${geometrySelected.length} checks, ${geometrySelected.length-geometryFailures} passed, ${geometryFailures} failed; ${nativeOnly?checks.length-geometryCheckStart-geometrySelected.length:0} registered-Course checks excluded.`);
if(geometryFailures)process.exitCode=1;
