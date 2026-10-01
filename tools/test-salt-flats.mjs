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
const sourceRecords=[...new Set([...config.sourcePicks.map(row=>row.catalogId),config.saltPhoto.catalogId])]
  .map(id=>{const row=catalog.assets.find(item=>item.id===id);assert.ok(row,`approved catalog source ${id}`);return row;});
const originals=config.sourcePicks.map(pick=>({...pick,key:`${pick.catalogId}/${pick.path}`,
  file:resolve(sourceRecords.find(row=>row.id===pick.catalogId).library,pick.path)}));
const photoRecord=sourceRecords.find(row=>row.id===config.saltPhoto.catalogId);
const photoFile=resolve(photoRecord.library,config.saltPhoto.path);
function jpegSize(bytes){
  assert.equal(bytes.readUInt16BE(0),0xffd8,'actual JPEG salt source');
  for(let offset=2;offset+9<bytes.length;){
    assert.equal(bytes[offset],0xff,'valid JPEG segment');const marker=bytes[offset+1];
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
      return [bytes.readUInt16BE(offset+7),bytes.readUInt16BE(offset+5)];
    const size=bytes.readUInt16BE(offset+2);assert.ok(size>=2&&offset+size+2<=bytes.length,'complete JPEG segment');offset+=size+2;
  }
  assert.fail('salt photo has measurable original pixel dimensions');
}
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
check('source','the genuine salt photograph remains the approved unchanged 1920 by 1275 input',()=>{
  const bytes=readFileSync(photoFile);assert.equal(hash(bytes),config.saltPhoto.sha256);
  assert.deepEqual(jpegSize(bytes),[1920,1275]);assert.deepEqual(config.saltPhoto.pixels,[1920,1275]);
  assert.equal(config.saltPhoto.tiling,'mirrored-uv');assert.equal(config.saltPhoto.preserveSourcePixels,true);
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
check('native','the salt ground uses the genuine photo and continuous mirrored repetition',async()=>{
  const {model,manifest}=await build(),ground=model.gltf.scene.getObjectByName(manifest.ground?.node);assert.ok(ground?.isMesh);
  const nativeImages=images(model);assert.ok(nativeImages.some(bytes=>hash(bytes)===config.saltPhoto.sha256),'unchanged approved photograph embedded');
  const gltfNode=model.json.nodes.find(node=>node.name===manifest.ground.node);assert.ok(gltfNode?.mesh!==undefined);
  const primitives=model.json.meshes[gltfNode.mesh].primitives;assert.ok(primitives.length);
  for(const primitive of primitives){const texture=model.json.materials[primitive.material]?.pbrMetallicRoughness?.baseColorTexture;
    assert.ok(texture,'salt photo is used on the ground material');const textureRow=model.json.textures[texture.index];
    assert.equal(hash(nativeImages[textureRow.source]),config.saltPhoto.sha256,'ground material uses the actual approved photo, not an unrelated embedded image');
    const sampler=model.json.samplers[textureRow.sampler];
    assert.equal(sampler?.wrapS,33648,'actual exported U uses mirrored repeat');assert.equal(sampler?.wrapT,33648,'actual exported V uses mirrored repeat');}
  const uv=ground.geometry.attributes.uv;assert.ok(uv,'actual repeated ground UVs');
  const u=Array.from({length:uv.count},(_,i)=>uv.getX(i)),v=Array.from({length:uv.count},(_,i)=>uv.getY(i));
  assert.ok(Math.max(...u)-Math.min(...u)>1&&Math.max(...v)-Math.min(...v)>1,'photo repeats across the bowl');
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
});
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
globalThis.cancelAnimationFrame=()=>{};
const flags=(enabled=true,overrides={})=>createFeatureFlags({storage:null,qa:enabled,search:enabled?'?flags=salt-flats':'',
  overrides:{wasteland2:true,'hidden-road':true,scrapdome:true,warlords:true,...overrides}});
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
const publicModes=Object.keys(ARENA_MODES).filter(mode=>mode!=='warlord');
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
check('runtime','default Scrapdome launch remains available below Salt Flats rank and with its dev flag off',async()=>{
  const app=await yard({rank:1,enabled:false});try{assert.equal(app.startArenaEvent(),true);
    assert.equal(app.duel.state.arena.venueId,'scrapdome');assert.equal(app.duel.state.arena.mode,'last-car-rolling');
  }finally{app.dispose?.();}
});
for(const mode of publicModes)check('runtime',`${mode}: a complete Salt Flats round stays physical and repeats its result`,()=>{
  function play(){const duel=new Duel({seed:1989,featureFlags:flags()});
    assert.equal(duel.startArenaEvent({venueId:'salt-flats',mode,car:'falcone_f42',seed:1989,cpuDifficulty:'medium',
      opponents:[{car:'dusthawk_rally'}]}),true,`missing built ${mode} Salt Flats consumer`);
    const rules=ARENA_MODES[mode];assert.ok(Number.isFinite(rules.timeLimitSec)&&Number.isFinite(rules.suddenDeathSec),'built mode has its published round limits');
    const tickLimit=Math.ceil((duel.state.countdown+rules.timeLimitSec+rules.suddenDeathSec+1)*120);
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
let failures=0;const nativeOnly=process.argv.includes('--native-only');
const selected=checks.filter(row=>!nativeOnly||row.group!=='runtime');
for(const {group,name,run}of selected)try{await run();}catch(error){failures++;console.error(`FAIL [${group}] ${name}: ${error.message}`);}
console.log(`Salt Flats${nativeOnly?' native WIP':''}: ${selected.length} checks, ${selected.length-failures} passed, ${failures} failed.`);
if(failures)process.exitCode=1;
