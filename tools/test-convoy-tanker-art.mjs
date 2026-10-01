import assert from 'node:assert/strict';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {existsSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,cpSync} from 'node:fs';
import {resolve,join,dirname,relative,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Independent tests-first native-art acceptance. No source palette, game art
// score, actual renderer frame budget or human comparison is inferred here.
const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const configPath=join(root,'tools/art/tanker-fit.json');
const config=JSON.parse(readFileSync(configPath,'utf8'));
const catalogPath=join(root,'tools/art/catalog.json');
const catalog=JSON.parse(readFileSync(catalogPath,'utf8'));
const donorPath=join(root,'tools/art/tanker-valve-source.json');
const donor=JSON.parse(readFileSync(donorPath,'utf8'));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const checks=[],check=(name,run)=>checks.push({name,run});
const qa=join(root,'.qa-dist');mkdirSync(qa,{recursive:true});
const scratch=mkdtempSync(join(qa,'tanker-art-tests-'));
const blender=process.env.BLENDER_EXE||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
const recipe=join(root,'tools/blender/convoy-tanker.py');
const consumer=join(root,'src/arena/tanker-model.js');
const records=config.sources.map(pin=>{const row=catalog.assets.find(row=>row.id===pin.catalogId);
  assert.ok(row,'retained approved source record '+pin.catalogId);return row;});
const sourceFiles=[...new Set(records.flatMap(row=>row.files.map(file=>resolve(row.library,file.path))))];
const originalSourceHashes=sourceFiles.map(path=>hash(readFileSync(path)));
const protectedPaths=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
  .filter(path=>path.startsWith('src/')||path.startsWith('public/')||path.startsWith('tools/replays/')||
    /^tools\/test-.*\.mjs$/.test(path)||path==='tools/art/catalog.json'||path==='tools/art/tanker-valve-source.json');
const initialHashes=protectedPaths.map(path=>hash(readFileSync(join(root,path))));
const expectedPicks=[['body','kenney-tanker-car-parts','delivery-flat',2574],
  ['tank','kenney-tanker-tank-parts','detail-tank',310],
  ['valve','kenney-factory-kit','pipe-large-valve',456],
  ['armor-door','kenney-tanker-car-parts','debris-door',68],
  ['armor-drivetrain','kenney-tanker-car-parts','debris-drivetrain',412],
  ['armor-tyre','kenney-tanker-car-parts','debris-tire',288],
  ['armor-panel','kenney-tanker-tank-parts','shipping-container-a',402]];
const key=pick=>pick.catalogId+'/'+pick.path;
const meshList=group=>{const rows=[];group.traverse(node=>{if(node.isMesh)rows.push(node);});return rows;};
function triangles(mesh,matrix=mesh.matrixWorld){
  const g=mesh.geometry,p=g.attributes.position,result=[];
  for(let i=0;i<(g.index?.count??p.count);i+=3)result.push([0,1,2].map(offset=>
    new THREE.Vector3().fromBufferAttribute(p,g.index?g.index.getX(i+offset):i+offset).applyMatrix4(matrix).toArray()));
  return result;
}
const faceKey=face=>face.map(point=>point.map(value=>value.toFixed(4)).join(',')).sort().join('/');
const facesOf=node=>meshList(node).flatMap(mesh=>triangles(mesh));
const triangleCount=node=>facesOf(node).length;
function meshSurfaceAt(node,x,z){
  let top=null;
  for(const [a,b,c] of facesOf(node)){
    const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(denominator)<1e-12)continue;
    const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator;
    const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator,w=1-u-v;
    if(Math.min(u,v,w)<-1e-6||Math.max(u,v,w)>1+1e-6)continue;
    const y=u*a[1]+v*b[1]+w*c[1];if(top===null||y>top)top=y;
  }
  return top;
}

function pngPixelHash(bytes){
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return null;
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20),depth=bytes[24],type=bytes[25];
  const channels={0:1,2:3,3:1,4:2,6:4}[type];
  if(depth!==8||!channels||bytes[28]!==0)return null;
  const chunks=[];let palette,alpha;
  for(let at=8;at+12<=bytes.length;){const length=bytes.readUInt32BE(at),kind=bytes.toString('ascii',at+4,at+8),data=bytes.subarray(at+8,at+8+length);
    assert.equal(data.length,length,'actual embedded PNG chunk');if(kind==='IDAT')chunks.push(data);if(kind==='PLTE')palette=data;if(kind==='tRNS')alpha=data;at+=length+12;}
  const scan=inflateSync(Buffer.concat(chunks)),stride=width*channels,rows=Buffer.alloc(stride*height);
  assert.equal(scan.length,(stride+1)*height,'actual PNG pixels are complete');
  const paeth=(a,b,c)=>{const p=a+b-c,da=Math.abs(p-a),db=Math.abs(p-b),dc=Math.abs(p-c);return da<=db&&da<=dc?a:db<=dc?b:c;};
  for(let y=0;y<height;y++){const filter=scan[y*(stride+1)];assert.ok(filter<=4,'actual PNG filter');
    for(let x=0;x<stride;x++){const a=x>=channels?rows[y*stride+x-channels]:0,b=y?rows[(y-1)*stride+x]:0,c=y&&x>=channels?rows[(y-1)*stride+x-channels]:0;
      rows[y*stride+x]=(scan[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
  const rgba=Buffer.alloc(width*height*4);
  for(let i=0;i<width*height;i++){const at=i*channels,out=i*4;
    if(type===3){const index=rows[at];assert.ok(palette&&index*3+2<palette.length,'actual PNG palette entry');rgba[out]=palette[index*3];rgba[out+1]=palette[index*3+1];rgba[out+2]=palette[index*3+2];rgba[out+3]=alpha?.[index]??255;}
    else if(type===0||type===4){rgba[out]=rgba[out+1]=rgba[out+2]=rows[at];rgba[out+3]=type===4?rows[at+1]:255;}
    else {rgba[out]=rows[at];rgba[out+1]=rows[at+1];rgba[out+2]=rows[at+2];rgba[out+3]=type===6?rows[at+3]:255;}}
  return hash(Buffer.concat([Buffer.from(width+'x'+height+':'),rgba]));
}
async function asset(path){
  const bytes=readFileSync(path);assert.equal(bytes.toString('ascii',0,4),'glTF','actual native GLB');
  assert.equal(bytes.readUInt32LE(4),2);assert.equal(bytes.readUInt32LE(8),bytes.length,'complete native export');
  let json,binary;
  for(let offset=12;offset<bytes.length;){const length=bytes.readUInt32LE(offset),kind=bytes.readUInt32LE(offset+4);
    assert.ok(offset+8+length<=bytes.length,'complete GLB chunk');const data=bytes.subarray(offset+8,offset+8+length);
    if(kind===0x4e4f534a)json=JSON.parse(data.toString('utf8'));if(kind===0x004e4942)binary=data;offset+=length+8;}
  assert.ok(json&&binary,'real native binary geometry');
  const loader=new GLTFLoader();
  // Texture pixels are validated as real encoded bytes below. This local
  // adapter avoids browser image decoding and external fetches in headless Node.
  loader.register(()=>({name:'TANKER_TEST_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true);return {bytes,json,binary,gltf};
}
const originalModels=new Map();
async function original(pick){
  if(!originalModels.has(key(pick))){const row=records.find(row=>row.id===pick.catalogId);
    originalModels.set(key(pick),asset(resolve(row.library,pick.path)));}
  return originalModels.get(key(pick));
}
function runRecipe(output,{fit=configPath,buildRoot=root,validate=false}={}){
  assert.ok(existsSync(recipe),'native tanker build recipe missing');
  const args=['-b','--disable-autoexec','--python-exit-code','1','--python',recipe,'--',
    '--root',buildRoot,'--output-dir',output,'--fit-config',fit,'--seed',String(config.seed)];
  if(validate)args.push('--validate-sources');
  const result=spawnSync(blender,args,{cwd:root,encoding:'utf8',timeout:240000,maxBuffer:12*1024*1024,windowsHide:true});
  const label=relative(scratch,output).split(sep).join('-')||'build';
  writeFileSync(join(scratch,label+'.log'),JSON.stringify({args,status:result.status,error:result.error?.message})+'\n'+result.stdout+'\n'+result.stderr);
  assert.equal(result.error,undefined,result.error?.message);
  return result;
}
let candidatePromise;
function candidate(){
  if(!candidatePromise)candidatePromise=(async()=>{
    const output=join(scratch,'candidate'),result=runRecipe(output);
    assert.equal(result.status,0,'native tanker fitting must complete: '+result.stderr);
    const model=await asset(join(output,config.outputs.model));
    const manifest=JSON.parse(readFileSync(join(output,config.outputs.manifest),'utf8'));
    return {output,model,manifest};})();
  return candidatePromise;
}
function nativePart(data,role){
  const rows=data.manifest.parts.filter(row=>row.role===role);assert.ok(rows.length,'actual native '+role+' parts');
  return rows.map(row=>{const node=data.model.gltf.scene.getObjectByName(row.node);
    assert.ok(node&&meshList(node).length,'part names actual native mesh geometry: '+row.node);return {row,node};});
}
const boxOf=node=>new THREE.Box3().setFromObject(node);
const overlaps=(a,b,axis)=>a.min[axis]<=b.max[axis]+.002&&b.min[axis]<=a.max[axis]+.002;
function worldSnapshot(group){group.updateMatrixWorld(true);return meshList(group).map(node=>({name:node.name,matrix:node.matrixWorld.toArray(),faces:triangles(node)}));}
async function moduleApi(){assert.ok(existsSync(consumer),'native tanker presentation consumer missing');
  const api=await import(pathToFileURL(consumer).href);assert.equal(typeof api.createTankerModel,'function');return api;}
function watchResources(group){
  const resources=new Set();for(const mesh of meshList(group)){
    resources.add(mesh.geometry);for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      resources.add(mat);for(const value of Object.values(mat))if(value?.isTexture)resources.add(value);}}
  const counts=new Map([...resources].map(resource=>[resource,0]));
  for(const resource of resources)resource.addEventListener('dispose',()=>counts.set(resource,counts.get(resource)+1));
  return counts;
}
function lampValues(group,manifest){
  const parts=manifest.parts.filter(row=>row.role==='warning-lamp');assert.ok(parts.length>=2,'actual loaded warning lamps remain plural');
  return parts.flatMap(row=>{const node=group.getObjectByName(row.node);assert.ok(node,'loaded lamp '+row.node);
    return meshList(node).flatMap(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(material=>
      material.emissive.getHex()===0?0:material.emissiveIntensity));});
}

check('small fit input pins only Kyle approved A and settled rigid configuration',()=>{
  assert.equal(config.version,1);assert.equal(config.card,'ART-FIT-TANKER');assert.ok(readFileSync(configPath).length<16000);
  assert.deepEqual(config.sourcePicks.map(p=>[p.role,p.catalogId,p.model,p.triangles]),expectedPicks);
  assert.deepEqual([config.rig.articulated,config.rig.trailer,config.rig.openingHatch],[false,false,false]);
  assert.equal(config.rig.valves,3);assert.equal(config.rig.valveArmor,150);
  assert.deepEqual(config.outputs,{model:'tanker.glb',manifest:'manifest.json'});
});
for(const pin of config.sources)check(pin.catalogId+': actual retained CC0 archive/licence/palette pins remain exact',()=>{
  const row=records.find(row=>row.id===pin.catalogId);
  assert.equal(pin.license,'CC0-1.0');assert.equal(pin.author,'Kenney');assert.equal(pin.sourcePage,row.sourcePage);
  for(const file of pin.files){assert.deepEqual(row.files.find(f=>f.path===file.path),file);
    const bytes=readFileSync(resolve(row.library,file.path));assert.equal(hash(bytes),file.sha256);assert.equal(bytes.length,file.bytes);}
  const licence=readFileSync(resolve(row.library,'unpacked/License.txt'),'utf8');assert.match(licence,/Creative Commons Zero, CC0/);
});
for(const pick of config.sourcePicks)check(pick.model+': genuine native source triangles and approved source bytes',async()=>{
  const record=records.find(row=>row.id===pick.catalogId),file=record.files.find(row=>row.path===pick.path);
  assert.equal(pick.sha256,file.sha256);assert.equal(pick.license,'CC0-1.0');
  const model=await original(pick);assert.equal(hash(model.bytes),pick.sha256);assert.equal(triangleCount(model.gltf.scene),pick.triangles);
  assert.ok(facesOf(model.gltf.scene).every(face=>face.every(point=>point.every(Number.isFinite))));
  assert.ok(!model.json.skins?.length&&!model.json.animations?.length,'approved donor is rigid actual source');
  if(pick.role==='valve')assert.deepEqual({path:pick.path,triangles:pick.triangles},donor.source.model);
});
check('bounded Blender validation accepts approved sources without emitting a candidate',()=>{
  const output=join(scratch,'validate'),result=runRecipe(output,{validate:true});
  assert.equal(result.status,0,'approved pinned sources validate: '+result.stderr);
  assert.equal(existsSync(join(output,config.outputs.model)),false,'source validation does not install or export art');
});
for(const [role,catalogId,model] of [['body','kenney-tanker-car-parts','truck-flat'],['body','kenney-tanker-car-parts','truck'],
  ['tank','kenney-tanker-tank-parts','detail-tank-large'],['valve','kenney-factory-kit','crane']]){
  for(const validate of [true,false])check('reject genuine unpicked '+model+' before '+(validate?'validation':'export'),()=>{
    const fit=structuredClone(config),record=catalog.assets.find(row=>row.id===catalogId);
    const file=record.files.find(row=>row.path.endsWith('/'+model+'.glb')),inspection=record.inspection.find(row=>row.model===model);
    Object.assign(fit.sourcePicks.find(row=>row.role===role),{catalogId,model,path:file.path,sha256:file.sha256,triangles:inspection.triangles});
    const name=role+'-'+model+'-'+validate,fitFile=join(scratch,name+'.json');writeFileSync(fitFile,JSON.stringify(fit));
    const output=join(scratch,name),result=runRecipe(output,{fit:fitFile,validate});
    assert.equal(result.status,1,'genuine unpicked source must be rejected');
    assert.match(result.stderr+result.stdout,/approved|picked|selected|source binding/i,'rejection identifies the approved source contract');
    assert.equal(existsSync(join(output,config.outputs.model)),false,'unpicked source creates no labelled substitute');
  });
}
for(const changed of ['valve','licence'])check('changed actual copied '+changed+' bytes rejected before export',()=>{
  const home=join(scratch,'changed-'+changed);mkdirSync(join(home,'tools/art'),{recursive:true});
  const copy=structuredClone(catalog),factory=copy.assets.find(row=>row.id==='kenney-factory-kit');
  const sourceHome=join(scratch,'private-factory-'+changed);
  for(const file of factory.files){const target=join(sourceHome,file.path);mkdirSync(dirname(target),{recursive:true});cpSync(resolve(factory.library,file.path),target);}
  factory.library=sourceHome;
  const copiedDonor=structuredClone(donor);copiedDonor.source.library=sourceHome;
  writeFileSync(join(home,'tools/art/catalog.json'),JSON.stringify(copy));writeFileSync(join(home,'tools/art/tanker-valve-source.json'),JSON.stringify(copiedDonor));
  const intactOutput=join(home,'intact-validation'),intact=runRecipe(intactOutput,{buildRoot:home,validate:true});
  assert.equal(intact.status,0,'same intact copied source fixture validates before changing actual bytes');
  assert.equal(existsSync(join(intactOutput,config.outputs.model)),false,'intact validation emits no runtime art');
  const name=changed==='valve'?'unpacked/Models/GLB format/pipe-large-valve.glb':'unpacked/License.txt';
  const path=join(sourceHome,name),bytes=readFileSync(path);bytes[Math.floor(bytes.length/2)]^=1;writeFileSync(path,bytes);
  const output=join(home,'candidate'),result=runRecipe(output,{buildRoot:home});
  assert.equal(result.status,1,'changed actual original must be rejected');assert.match(result.stderr+result.stdout,/changed|hash|SHA|original|source/i);
  assert.equal(existsSync(join(output,config.outputs.model)),false,'changed copied donor produces no candidate');
});
check('actual generated GLB is self-contained, finite and one rigid truck',async()=>{
  const {model,manifest}=await candidate();assert.equal(manifest.card,'ART-FIT-TANKER');assert.equal(manifest.seed,config.seed);
  assert.ok(Array.isArray(manifest.parts)&&manifest.parts.length);assert.ok(Array.isArray(manifest.sourceInstances)&&manifest.sourceInstances.length);
  assert.ok(!model.json.skins?.length&&!model.json.animations?.length,'no articulated trailer, hatch or skeleton');
  for(const resource of [...(model.json.images||[]),...(model.json.buffers||[])])assert.equal(resource.uri,undefined,'self-contained runtime GLB');
  for(const mesh of meshList(model.gltf.scene)){assert.ok(mesh.geometry.attributes.position.count>0);
    assert.ok(triangles(mesh).every(face=>face.every(point=>point.every(Number.isFinite))),'real finite fitted geometry');}
  assert.equal(nativePart({model,manifest},'body').length,1);assert.equal(nativePart({model,manifest},'tank').length,1);
  assert.equal(nativePart({model,manifest},'valve').length,3);
  assert.ok(!manifest.parts.some(row=>/trailer|hitch|opening-hatch/.test(row.role)),'settled rigid scope');
});
check('every fitted donor face has genuine native lineage, including three complete valves',async()=>{
  const data=await candidate(),named=new Set();
  for(const instance of data.manifest.sourceInstances){
    const pick=config.sourcePicks.find(pick=>key(pick)===instance.sourceKey);assert.ok(pick,'only picked donor keys enter fitted art');
    const node=data.model.gltf.scene.getObjectByName(instance.node);assert.ok(node,'lineage identifies real output geometry');
    assert.equal(instance.matrix.length,16);assert.ok(instance.matrix.every(Number.isFinite));
    const matrix=new THREE.Matrix4().fromArray(instance.matrix);assert.ok(Math.abs(matrix.determinant())>1e-9,'real noncollapsed native fit transform');
    const source=await original(pick),available=new Map();
    for(const mesh of meshList(source.gltf.scene))for(const face of triangles(mesh,new THREE.Matrix4().multiplyMatrices(matrix,mesh.matrixWorld))){
      const faceId=faceKey(face);available.set(faceId,(available.get(faceId)||0)+1);}
    const actual=facesOf(node);assert.ok(actual.length,'native instance contains actual donor triangles');
    for(const face of actual){const id=faceKey(face);assert.ok(available.get(id)>0,instance.node+': output face has native donor lineage');available.set(id,available.get(id)-1);}
    if(['body','tank','valve'].includes(pick.role))assert.equal(actual.length,pick.triangles,'full approved rigid donor retained');
    else if(actual.length!==pick.triangles)assert.equal(instance.trimmed,true,'trimmed salvage subset must be explicitly labelled');
    for(const mesh of meshList(node)){assert.ok(!named.has(mesh),'native mesh has one unambiguous source instance');named.add(mesh);}
  }
  const lampMeshes=new Set(nativePart(data,'warning-lamp').flatMap(part=>meshList(part.node)));
  for(const mesh of meshList(data.model.gltf.scene))assert.ok(named.has(mesh)||lampMeshes.has(mesh),'only small warning lamps may be authored accessory geometry');
  for(const part of nativePart(data,'valve')){
    const row=data.manifest.sourceInstances.find(row=>row.node===part.row.node);
    assert.equal(row?.sourceKey,key(config.sourcePicks.find(pick=>pick.role==='valve')),'each of three actual valves uses verified Factory donor');
  }
  for(const part of [...nativePart(data,'armor'),...nativePart(data,'boarding-plate')]){
    const row=data.manifest.sourceInstances.find(row=>row.node===part.row.node),pick=config.sourcePicks.find(pick=>key(pick)===row?.sourceKey);
    assert.ok(pick?.role.startsWith('armor-'),'armor and plate reuse approved existing salvage faces');
  }
});
check('grounded native truck carries its tank, valve attachments and raised roof plate coherently',async()=>{
  const data=await candidate(),body=boxOf(nativePart(data,'body')[0].node),tank=boxOf(nativePart(data,'tank')[0].node);
  const all=boxOf(data.model.gltf.scene),size=all.getSize(new THREE.Vector3());
  assert.ok(Math.abs(body.min.y)<=.02&&Math.abs(all.min.y)<=.02,'actual truck meets native local ground without floating or burial');
  assert.ok(size.z>size.x&&size.y>0,'single grounded truck has a coherent long vehicle envelope');
  for(const axis of ['x','z'])assert.ok(tank.min[axis]>=body.min[axis]-.002&&tank.max[axis]<=body.max[axis]+.002,'actual tank fits the native cab/bed footprint');
  assert.ok(tank.min.y>body.min.y&&tank.min.y<body.max.y,'tank support feet overlap the actual truck bed envelope');
  const bodyNode=nativePart(data,'body')[0].node,tankNode=nativePart(data,'tank')[0].node;
  const feet=facesOf(tankNode).filter(face=>face.every(point=>Math.abs(point[1]-tank.min.y)<=.002));
  assert.ok(feet.length,'actual native tank has retained bottom support-foot triangles');
  for(const foot of feet){
    const center=foot.reduce((point,p)=>point.add(new THREE.Vector3(...p)),new THREE.Vector3()).divideScalar(3);
    const support=meshSurfaceAt(bodyNode,center.x,center.z);
    assert.notEqual(support,null,'actual truck bed provides visible geometry under the native tank feet');
    assert.ok(Math.abs(center.y-support)<=.05,'native tank feet rest on actual bed triangles without a floating or buried gap');
  }
  const plate=boxOf(nativePart(data,'boarding-plate')[0].node);
  assert.ok(plate.max.y>tank.max.y&&plate.min.y<=tank.max.y+.05,'boarding plate is visibly raised and attached at the actual tank roof');
  for(const axis of ['x','z'])assert.ok(plate.min[axis]>=tank.min[axis]-.002&&plate.max[axis]<=tank.max[axis]+.002,'safe roof boarding footprint');
  for(const part of nativePart(data,'valve')){const box=boxOf(part.node);
    assert.ok(['x','y','z'].every(axis=>overlaps(box,tank,axis)),'native valve envelope touches its actual tank attachment');}
  for(const part of nativePart(data,'armor')){const box=boxOf(part.node);
    assert.ok([body,tank].some(host=>['x','y','z'].every(axis=>overlaps(box,host,axis))),'actual salvage armor attaches to cab/bed or tank');}
  for(const part of nativePart(data,'warning-lamp')){const box=boxOf(part.node);
    assert.ok(['x','y','z'].every(axis=>overlaps(box,plate,axis)),'warning lamp is physically attached to the raised plate');}
});
check('fitted native materials do not retain original source atlases or material palette',async()=>{
  const {model}=await candidate(),sourcePalettes=new Set(),sourcePixels=new Set();
  for(const row of records)for(const file of row.files.filter(file=>file.path.endsWith('/Textures/colormap.png'))){
    const bytes=readFileSync(resolve(row.library,file.path));sourcePalettes.add(file.sha256);sourcePixels.add(pngPixelHash(bytes));}
  for(const image of model.json.images||[]){assert.equal(image.uri,undefined);const view=model.json.bufferViews[image.bufferView];assert.ok(view,'actual embedded image bytes');
    const bytes=model.binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);assert.ok(bytes.length);
    assert.ok(!sourcePalettes.has(hash(bytes)),'bright original source palette does not survive fitting');
    const pixels=pngPixelHash(bytes);if(pixels)assert.ok(!sourcePixels.has(pixels),'re-encoding an unchanged native PNG palette does not count as fitting');}
  const originalMaterials=new Set();for(const pick of config.sourcePicks){const source=await original(pick);
    for(const material of source.json.materials||[])originalMaterials.add(JSON.stringify(material));}
  assert.ok(model.json.materials.length,'actual worn replacement materials');
  for(const material of model.json.materials){assert.ok(!originalMaterials.has(JSON.stringify(material)),'original material is replaced rather than copied');
    assert.ok(material.pbrMetallicRoughness,'actual runtime material supports the fitting');}
});
check('native counts and byte report match actual geometry without inventing a frame or art budget',async()=>{
  const {model,manifest}=await candidate(),meshes=meshList(model.gltf.scene);
  const draws=meshes.reduce((sum,mesh)=>sum+(mesh.geometry.groups.length||1),0);
  assert.equal(manifest.stats.triangles,triangleCount(model.gltf.scene));assert.equal(manifest.stats.meshes,meshes.length);
  assert.equal(manifest.stats.draws,draws);assert.equal(manifest.stats.bytes,model.bytes.length);
  const target=JSON.parse(readFileSync(join(root,'tools/size-targets.json'),'utf8')).runtimeFileBytes;
  console.log('Tanker measured native artifact: '+JSON.stringify({...manifest.stats,runtimeFileByteTarget:target,targetIsAdvisory:true}));
});
check('same seed repeats actual fitted geometry, parts, transforms and materials',async()=>{
  const first=await candidate(),output=join(scratch,'repeat'),result=runRecipe(output);assert.equal(result.status,0);
  const second=await asset(join(output,config.outputs.model)),manifest=JSON.parse(readFileSync(join(output,config.outputs.manifest),'utf8'));
  assert.deepEqual(worldSnapshot(second.gltf.scene),worldSnapshot(first.model.gltf.scene));
  assert.deepEqual(second.json.materials,first.model.json.materials);assert.deepEqual(second.json.images,first.model.json.images);
  assert.deepEqual(manifest.parts,first.manifest.parts);assert.deepEqual(manifest.sourceInstances,first.manifest.sourceInstances);
  assert.deepEqual(manifest.stats,first.manifest.stats);
});
check('real loaded model lamps follow every valve combination and recovery without changing geometry or inputs',async()=>{
  const api=await moduleApi(),data=await candidate();let loaded;
  const result=api.createTankerModel({loadAsset:async()=>{loaded=await asset(join(data.output,config.outputs.model));return loaded.gltf;}});
  assert.ok(result.group?.isGroup&&result.ready?.then&&typeof result.dispose==='function'&&typeof result.setValveHealth==='function');
  await result.ready;assert.ok(meshList(result.group).length,'actual native art is attached');
  const snapshot=worldSnapshot(result.group);
  assert.ok(lampValues(result.group,data.manifest).every(value=>value===0),'healthy initial valves leave lamps off');
  const lampMeshes=new Set(data.manifest.parts.filter(row=>row.role==='warning-lamp').flatMap(row=>meshList(result.group.getObjectByName(row.node))));
  const otherMaterials=()=>meshList(result.group).filter(mesh=>!lampMeshes.has(mesh)).flatMap(mesh=>
    (Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(mat=>({color:mat.color.getHex(),emissive:mat.emissive.getHex(),intensity:mat.emissiveIntensity,roughness:mat.roughness})));
  const untouchedMaterials=otherMaterials();
  for(let bits=0;bits<8;bits++){
    const health=Object.freeze([0,1,2].map(index=>bits&(1<<index)?0:150));result.setValveHealth(health);
    const values=lampValues(result.group,data.manifest);assert.ok(values.every(value=>bits===7?value>0:value===0),'warning lamps light only after all three real valves break');
    assert.deepEqual(worldSnapshot(result.group),snapshot,'presentation cannot articulate, open a hatch or move source geometry');
    assert.deepEqual(otherMaterials(),untouchedMaterials,'valve presentation lights only the warning lamp materials');
    assert.deepEqual(health,[0,1,2].map(index=>bits&(1<<index)?0:150),'caller valve health remains read-only');
  }
  result.setValveHealth(Object.freeze([-1,0,-20]));assert.ok(lampValues(result.group,data.manifest).every(value=>value>0));
  result.setValveHealth(Object.freeze([75,75,75]));assert.ok(lampValues(result.group,data.manifest).every(value=>value===0),'half-armor recovery turns warning lamps back off');
  result.dispose();
});
check('loaded native geometries, materials and textures dispose exactly once',async()=>{
  const api=await moduleApi(),data=await candidate();let loaded,resources;
  const result=api.createTankerModel({loadAsset:async()=>{loaded=await asset(join(data.output,config.outputs.model));resources=watchResources(loaded.gltf.scene);return loaded.gltf;}});
  await result.ready;assert.ok(resources.size>0,'track actual loaded native resource ownership');
  result.dispose();result.dispose();assert.ok([...resources.values()].every(count=>count===1),'every actual native owned resource released exactly once');
  assert.equal(meshList(result.group).length,0,'retired native model detaches');
});
check('disposing before actual native load completes retires the late model instead of attaching it',async()=>{
  const api=await moduleApi(),data=await candidate(),loaded=await asset(join(data.output,config.outputs.model));
  const resources=watchResources(loaded.gltf.scene);let release;
  const promise=new Promise(resolve=>{release=resolve;}),result=api.createTankerModel({loadAsset:()=>promise});
  result.setValveHealth(Object.freeze([0,0,0]));result.dispose();release(loaded.gltf);await result.ready;result.dispose();
  assert.equal(meshList(result.group).length,0,'late native geometry never revives disposed truck');
  assert.ok([...resources.values()].every(count=>count===1),'late actual native resources retire once');
});
check('native presentation reads supplied health without save access or extra network requests',async()=>{
  const storageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),originalFetch=globalThis.fetch;
  let storageAccess=0,networkAccess=0;
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){storageAccess++;throw Error('presentation attempted storage access');}});
  globalThis.fetch=()=>{networkAccess++;throw Error('presentation attempted extra network request');};
  try{
    const api=await moduleApi(),data=await candidate();
    const result=api.createTankerModel({loadAsset:async()=>{const native=await asset(join(data.output,config.outputs.model));return native.gltf;}});
    await result.ready;result.setValveHealth(Object.freeze([0,0,0]));result.setValveHealth(Object.freeze([75,75,75]));result.dispose();
    assert.deepEqual([storageAccess,networkAccess],[0,0],'presentation stays read-only outside its supplied native asset loader');
  }finally{
    if(storageDescriptor)Object.defineProperty(globalThis,'localStorage',storageDescriptor);else delete globalThis.localStorage;
    globalThis.fetch=originalFetch;
  }
});
check('loader failure exposes no successful native stand-in and remains disposable',async()=>{
  const api=await moduleApi(),failure=new Error('synthetic native loader failure');
  const result=api.createTankerModel({loadAsset:()=>Promise.reject(failure)});
  await assert.rejects(result.ready,/synthetic native loader failure/);assert.equal(meshList(result.group).length,0,'missing native art is not a finished primitive substitute');
  result.dispose();result.dispose();
});
check('current runtime art, simulation, old assertions, replay pins, catalogue and licensed sources remain exact',()=>{
  assert.deepEqual(protectedPaths.map(path=>hash(readFileSync(join(root,path)))),initialHashes);
  assert.deepEqual(sourceFiles.map(path=>hash(readFileSync(path))),originalSourceHashes);
});

let failed=0;const verdicts=[];
for(const {name,run} of checks)try{await run();verdicts.push({name,passed:true});}catch(error){
  failed++;verdicts.push({name,passed:false,message:error.message,stack:error.stack});console.error('FAIL '+name+': '+error.message);}
writeFileSync(join(scratch,'verdict.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checks:checks.length,failed,verdicts},null,2)+'\n');
console.log('Convoy tanker art: '+checks.length+' checks, '+(checks.length-failed)+' passed, '+failed+' failed.');
console.log('Private raw native/test evidence: '+scratch);
if(failed)process.exitCode=1;
