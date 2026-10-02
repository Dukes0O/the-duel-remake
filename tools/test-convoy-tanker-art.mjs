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

// Contact topology comes from the actual picked donor, not its envelope or a
// presumed flat bottom face. Export rounding is allowed only within 0.002 m.
const contactPrecision=.002,weldPrecision=1e-7;
const distance=(a,b)=>Math.hypot(...a.map((value,i)=>value-b[i]));
const vector=point=>new THREE.Vector3(...point);
function weldedEdges(faces){
  const vertices=[],edges=new Map();
  const vertexId=point=>{let id=vertices.findIndex(other=>distance(point,other)<=weldPrecision);
    if(id<0){id=vertices.length;vertices.push(point);}return id;};
  for(const face of faces){const ids=face.map(vertexId);
    for(let i=0;i<3;i++){const idsSorted=[ids[i],ids[(i+1)%3]].sort((a,b)=>a-b);
      if(idsSorted[0]!==idsSorted[1])edges.set(idsSorted.join(':'),idsSorted.map(id=>vertices[id]));}}
  return {vertices,edges:[...edges.values()]};
}
async function nativeContactEdges(data){
  const pick=config.sourcePicks.find(row=>row.role==='tank'),source=await original(pick);
  const topology=weldedEdges(facesOf(source.gltf.scene)),minY=Math.min(...topology.vertices.map(point=>point[1]));
  const sourceEdges=topology.edges.filter(edge=>edge.every(point=>Math.abs(point[1]-minY)<=weldPrecision));
  assert.ok(sourceEdges.length,'picked native tank has nonempty genuine minimum contact edges');
  const part=nativePart(data,'tank')[0],instance=data.manifest.sourceInstances.find(row=>row.node===part.row.node);
  assert.equal(instance?.sourceKey,key(pick),'contact lineage uses the picked native tank');
  const matrix=new THREE.Matrix4().fromArray(instance.matrix),actual=weldedEdges(facesOf(part.node));
  const expectedEdges=sourceEdges.map(edge=>edge.map(point=>vector(point).applyMatrix4(matrix).toArray()));
  const edges=expectedEdges.map(edge=>{
    const retained=actual.edges.find(other=>
      (distance(edge[0],other[0])<=contactPrecision&&distance(edge[1],other[1])<=contactPrecision)||
      (distance(edge[0],other[1])<=contactPrecision&&distance(edge[1],other[0])<=contactPrecision));
    assert.ok(retained,'same original minimum contact edge survives fitted native topology');
    return distance(edge[0],retained[0])<=contactPrecision?retained:[retained[1],retained[0]];
  });
  return {sourceEdges,expectedEdges,edges,minY,sourceVertices:topology.vertices.filter(point=>Math.abs(point[1]-minY)<=weldPrecision)};
}
function projectedWeights(face,point){
  const [a,b,c]=face,denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  if(Math.abs(denominator)<1e-12)return null;
  const u=((b[2]-c[2])*(point[0]-c[0])+(c[0]-b[0])*(point[2]-c[2]))/denominator;
  const v=((c[2]-a[2])*(point[0]-c[0])+(a[0]-c[0])*(point[2]-c[2]))/denominator;
  return [u,v,1-u-v];
}
function supportIntervals(edge,faces){
  const rows=[];
  faces.forEach((face,index)=>{
    const normal=vector(face[1]).sub(vector(face[0])).cross(vector(face[2]).sub(vector(face[0]))).normalize();
    if(normal.y<=1e-7)return;
    const start=projectedWeights(face,edge[0]),end=projectedWeights(face,edge[1]);if(!start||!end)return;
    let lo=0,hi=1;
    for(let i=0;i<3;i++){const delta=end[i]-start[i];
      if(Math.abs(delta)<1e-12){if(start[i]<-1e-7)return;}
      else if(delta>0)lo=Math.max(lo,(-1e-7-start[i])/delta);
      else hi=Math.min(hi,(-1e-7-start[i])/delta);}
    if(hi<lo||hi<0||lo>1)return;lo=Math.max(0,lo);hi=Math.min(1,hi);
    const gapAt=t=>{const weights=start.map((value,i)=>value+(end[i]-value)*t);
      return edge[0][1]+(edge[1][1]-edge[0][1])*t-weights.reduce((y,value,i)=>y+value*face[i][1],0);};
    // Both gap functions are affine on this actual triangle. Endpoints and the
    // midpoint prove the entire clipped segment, including cell crossings.
    if([lo,(lo+hi)/2,hi].every(t=>Math.abs(gapAt(t))<=contactPrecision))rows.push({lo,hi,index,normalY:normal.y});
  });
  return rows;
}
function assertEdgeSupport(edges,faces){
  assert.ok(edges.length,'nonempty actual native contact edges');const witnesses=[];
  for(const edge of edges){const intervals=supportIntervals(edge,faces).sort((a,b)=>a.lo-b.lo),boundaries=[0,1,...intervals.flatMap(row=>[row.lo,row.hi])].sort((a,b)=>a-b);
    for(let i=0;i<boundaries.length;i++){
      const t=boundaries[i];assert.ok(intervals.some(row=>t>=row.lo-1e-7&&t<=row.hi+1e-7),
        'whole actual contact edge needs upward native bed triangles within 0.002 m');
      if(i){const mid=(boundaries[i-1]+t)/2;assert.ok(intervals.some(row=>mid>=row.lo-1e-7&&mid<=row.hi+1e-7),
        'native bed coverage cannot contain a gap between triangle cell crossings');}}
    witnesses.push({edge,intervals});
  }
  return witnesses;
}
function strictCrossings(left,right){
  const prepared=faces=>faces.map((face,index)=>{const points=face.map(vector),normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).normalize();
    return {face,index,points,normal,box:new THREE.Box3().setFromPoints(points)};});
  const epsilon=1e-7,result=[],aRows=prepared(left),bRows=prepared(right);
  function planeSlice(points,distances){const hits=[];
    for(let i=0;i<3;i++){const j=(i+1)%3;if(Math.abs(distances[i])<=epsilon)hits.push(points[i].clone());
      if(distances[i]*distances[j]<0)hits.push(points[i].clone().lerp(points[j],distances[i]/(distances[i]-distances[j])));}
    return hits.filter((point,i)=>hits.findIndex(other=>point.distanceTo(other)<=epsilon)===i);}
  for(const a of aRows)for(const b of bRows){if(!a.box.intersectsBox(b.box))continue;
    const aDistances=a.points.map(point=>b.normal.dot(point.clone().sub(b.points[0]))),bDistances=b.points.map(point=>a.normal.dot(point.clone().sub(a.points[0])));
    const straddles=distances=>Math.min(...distances)<-epsilon&&Math.max(...distances)>epsilon;
    if(!straddles(aDistances)||!straddles(bDistances))continue;
    const line=a.normal.clone().cross(b.normal);if(line.lengthSq()<1e-12)continue;line.normalize();
    const aSlice=planeSlice(a.points,aDistances),bSlice=planeSlice(b.points,bDistances);if(aSlice.length<2||bSlice.length<2)continue;
    const values=points=>points.map(point=>point.dot(line));const av=values(aSlice),bv=values(bSlice);
    const lo=Math.max(Math.min(...av),Math.min(...bv)),hi=Math.min(Math.max(...av),Math.max(...bv));
    if(hi-lo>epsilon){const origin=aSlice[0];result.push({leftFace:a.index,rightFace:b.index,length:hi-lo,
      endpoints:[lo,hi].map(value=>origin.clone().addScaledVector(line,value-origin.dot(line)).toArray()),
      planeDistanceExtent:Math.max(...aDistances.map(Math.abs),...bDistances.map(Math.abs))});}}
  return result;
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
  const contacts=await nativeContactEdges(data);
  assertEdgeSupport(contacts.edges,facesOf(bodyNode));
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
check('genuine original minimum edges rest over their complete lengths on native upward bed faces',async()=>{
  const data=await candidate(),contacts=await nativeContactEdges(data),body=facesOf(nativePart(data,'body')[0].node);
  const witnesses=assertEdgeSupport(contacts.edges,body);
  const tankNode=nativePart(data,'tank')[0].node,tankFaces=facesOf(tankNode),crossings=strictCrossings(tankFaces,body);
  const bedIndices=[...new Set(witnesses.flatMap(row=>row.intervals.map(interval=>interval.index)))];
  assert.ok(witnesses.every(row=>row.intervals.length),'real upward bed coverage is nonempty');
  assert.equal(strictCrossings(tankFaces,bedIndices.map(index=>body[index])).length,0,
    'actual supported bed contact is not a strict interior crossing');
  const vertexWitnesses=tankFaces.flat().map(point=>({point,surfaceY:meshSurfaceAt(nativePart(data,'body')[0].node,point[0],point[2])}))
    .filter(row=>row.surfaceY!==null&&row.surfaceY-row.point[1]>contactPrecision)
    .map(row=>({...row,verticalGap:row.surfaceY-row.point[1]})).sort((a,b)=>b.verticalGap-a.verticalGap);
  writeFileSync(join(scratch,'native-contact-crossing-witness.json'),JSON.stringify({sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),contacts,witnesses,crossings,vertexWitnesses},null,2)+'\n');
});
for(const [name,offset] of [['hover',[0,.06,0]],['burial',[0,-.06,0]],['lateral inside body envelope',[.8,0,0]]])
  check('native contact coverage rejects '+name,async()=>{
    const data=await candidate(),contacts=await nativeContactEdges(data),bodyNode=nativePart(data,'body')[0].node;
    // Move a clone of all genuine exported tank faces. Its source-instance
    // matrix follows the same translation; no donor faces are invented.
    const movedNode=nativePart(data,'tank')[0].node.clone(true),translation=new THREE.Matrix4().makeTranslation(...offset);
    movedNode.applyMatrix4(translation);movedNode.updateMatrixWorld(true);
    assert.equal(triangleCount(movedNode),310,'negative fixture retains the complete native picked tank');
    const instance=data.manifest.sourceInstances.find(row=>row.node===nativePart(data,'tank')[0].row.node);
    const movedMatrix=translation.clone().multiply(new THREE.Matrix4().fromArray(instance.matrix));
    const fixture={model:{gltf:{scene:{getObjectByName:name=>name===movedNode.name?movedNode:null}}},
      manifest:{parts:[nativePart(data,'tank')[0].row],sourceInstances:[{...instance,matrix:movedMatrix.toArray()}]}};
    const changed=(await nativeContactEdges(fixture)).edges;
    if(offset[0]){const envelope=boxOf(bodyNode);assert.ok(changed.flat().every(point=>envelope.containsPoint(vector(point))),
      'negative lateral contact endpoints remain inside real transformed body envelope');}
    assert.throws(()=>assertEdgeSupport(changed,facesOf(bodyNode)),/native bed|triangle cell crossings/,
      'actual support precision rejects displaced picked contact geometry');
  });
for(const mode of ['both','first','second'])check('native contact coverage rejects removal of '+mode+' supporting bed half',async()=>{
  const data=await candidate(),contacts=await nativeContactEdges(data),body=facesOf(nativePart(data,'body')[0].node);
  const witness=assertEdgeSupport(contacts.edges,body),indices=[...new Set(witness.flatMap(row=>row.intervals.map(interval=>interval.index)))].sort((a,b)=>a-b);
  assert.equal(indices.length,2,'actual contact edges traverse both genuine native bed halves');
  const removed=mode==='both'?indices:[indices[mode==='first'?0:1]],changed=body.filter((face,index)=>!removed.includes(index));
  const bounds=faces=>new THREE.Box3().setFromPoints(faces.flat().map(vector));
  assert.ok(bounds(body).equals(bounds(changed)),'removing actual bed support triangles leaves body envelope unchanged');
  assert.throws(()=>assertEdgeSupport(contacts.edges,changed),/native bed|triangle cell crossings/,
    'complete native edge coverage detects actual missing bed geometry');
});
check('complete picked native tank does not strictly cross complete native truck surfaces',async()=>{
  const data=await candidate(),tank=facesOf(nativePart(data,'tank')[0].node),body=facesOf(nativePart(data,'body')[0].node);
  assert.equal(tank.length,310,'entire picked tank including brackets remains native');
  assert.equal(body.length,2574,'entire picked cab and bed remains native');
  const crossings=strictCrossings(tank,body);
  assert.equal(crossings.length,0,'actual picked tank strictly crosses native truck surfaces: '+crossings.length+
    ' crossings; first '+JSON.stringify(crossings[0]||null));
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

// Independent exact valve-to-tank acceptance. Append only: the complete
// original42-check file, all assertions and its runner remain byte exact.
const valveContactStart=checks.length;
const valveProtectedPaths=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/)
  .filter(path=>path!=='tools/test-convoy-tanker-art.mjs'&&path!=='docs/changes/ART-FIT-TANKER.md');
const valveProtectedHashes=valveProtectedPaths.map(path=>hash(readFileSync(join(root,path))));
function valveSegmentPair(a,b,c,d){
  const u=b.clone().sub(a),v=d.clone().sub(c),w=a.clone().sub(c);
  const aa=u.dot(u),bb=u.dot(v),cc=v.dot(v),dd=u.dot(w),ee=v.dot(w),denominator=aa*cc-bb*bb;
  let s=0,t=0;
  if(aa<=1e-24&&cc<=1e-24)return {distance:a.distanceTo(c),left:a.toArray(),right:c.toArray()};
  if(aa<=1e-24)t=Math.max(0,Math.min(1,ee/cc));
  else if(cc<=1e-24)s=Math.max(0,Math.min(1,-dd/aa));
  else {
    s=denominator>1e-24?Math.max(0,Math.min(1,(bb*ee-cc*dd)/denominator)):0;
    t=(bb*s+ee)/cc;
    if(t<0){t=0;s=Math.max(0,Math.min(1,-dd/aa));}
    else if(t>1){t=1;s=Math.max(0,Math.min(1,(bb-dd)/aa));}
  }
  const left=a.clone().addScaledVector(u,s),right=c.clone().addScaledVector(v,t);
  return {distance:left.distanceTo(right),left:left.toArray(),right:right.toArray()};
}
function valveFaceDistance(left,right){
  let witness={distance:Infinity};
  const update=row=>{if(row.distance<witness.distance)witness=row;};
  const a=left.map(vector),b=right.map(vector),ta=new THREE.Triangle(...a),tb=new THREE.Triangle(...b);
  for(const point of a){
    const q=tb.closestPointToPoint(point,new THREE.Vector3());
    update({distance:point.distanceTo(q),left:point.toArray(),right:q.toArray()});
  }
  for(const point of b){
    const q=ta.closestPointToPoint(point,new THREE.Vector3());
    update({distance:point.distanceTo(q),left:q.toArray(),right:point.toArray()});
  }
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)
    update(valveSegmentPair(a[i],a[(i+1)%3],b[j],b[(j+1)%3]));
  return witness;
}
function valveSurfaceContact(left,right){
  const crossings=strictCrossings(left,right);
  if(crossings.length)return {distance:0,crossings:crossings.length,firstCrossing:crossings[0]};
  // Disjoint/coplanar triangle distance is attained by a vertex/face or edge/
  // edge pair. Strict native skin crossings above cover intersecting interiors.
  let witness={distance:Infinity};
  for(let i=0;i<left.length;i++)for(let j=0;j<right.length;j++){
    const row=valveFaceDistance(left[i],right[j]);
    if(row.distance<witness.distance)witness={...row,leftFace:i,rightFace:j};
  }
  return witness;
}
function valveTranslated(faces,offset){
  return faces.map(face=>face.map(point=>point.map((value,axis)=>value+offset[axis])));
}
const valveBounds=faces=>new THREE.Box3().setFromPoints(faces.flat().map(vector));
function valveEnvelopeOverlap(left,right){
  const a=valveBounds(left),b=valveBounds(right);
  return ['x','y','z'].every(axis=>overlaps(a,b,axis));
}
let valveNativePromise;
function valveNative(){
  if(!valveNativePromise)valveNativePromise=(async()=>{
    const data=await candidate(),pick=config.sourcePicks.find(row=>row.role==='valve');
    const source=await original(pick),faces=facesOf(source.gltf.scene),bounds=valveBounds(faces);
    // Actual selected Factory donor: its two pipe/flange ends are along X.
    // The handwheel/stem is a different negative-Z assembly, not a tank foot.
    const ports=[bounds.min.x,bounds.max.x].map(x=>({
      x,indices:faces.flatMap((face,index)=>face.every(point=>Math.abs(point[0]-x)<=weldPrecision)?[index]:[])
    }));
    const tank=facesOf(nativePart(data,'tank')[0].node);
    const valves=nativePart(data,'valve').map(part=>{
      const instance=data.manifest.sourceInstances.find(row=>row.node===part.row.node);
      assert.equal(instance?.sourceKey,key(pick),'actual valve connection retains original donor identity');
      const matrix=new THREE.Matrix4().fromArray(instance.matrix),actual=facesOf(part.node);
      const mapped=ports.map(port=>{
        const expected=port.indices.map(index=>faces[index].map(point=>vector(point).applyMatrix4(matrix).toArray()));
        const native=expected.map(face=>{
          const retained=actual.find(row=>faceKey(row)===faceKey(face));
          assert.ok(retained,'genuine original pipe-end triangle survives actual fitted output');
          return retained;
        });
        return {sourceX:port.x,sourceIndices:port.indices,faces:native};
      });
      return {node:part.row.node,instance,faces:actual,ports:mapped};
    });
    const tankInstance=data.manifest.sourceInstances.find(row=>row.node===nativePart(data,'tank')[0].row.node);
    const tankMatrix=new THREE.Matrix4().fromArray(tankInstance.matrix);
    // Genuine Source2583/candidate0af1 valve2 DATA fixture relative to its
    // original full native tank. This is a copied positive witness, not a
    // candidate fit prescription. Tank-affine routing keeps these controls
    // valid when the builder fixes the candidate valve poses.
    const referenceRelative=new THREE.Matrix4().fromArray([-0.11084337349397591,0,-1.2803125627449602e-17,0,
      0,0.10823529411764705,0,0,1.3574398255609217e-17,0,-0.10454545454545455,0,
      0.2795180722891566,0.18352941176470586,-0.23068181818181813,1]);
    const copiedMatrix=tankMatrix.clone().multiply(referenceRelative);
    const copied=rows=>rows.map(face=>face.map(point=>vector(point).applyMatrix4(copiedMatrix).toArray()));
    const positive={node:'genuine-source2583-native-valve2-data',faces:copied(faces),
      ports:ports.map(port=>({sourceX:port.x,sourceIndices:port.indices,faces:copied(port.indices.map(index=>faces[index]))}))};
    return {data,pick,sourceBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},sourceFaces:faces,ports,tank,valves,tankMatrix,positive};
  })();
  return valveNativePromise;
}
function valveAttachment(valve,tank){
  const whole=valveSurfaceContact(valve.faces,tank);
  const ports=valve.ports.map(port=>({sourceX:port.sourceX,...valveSurfaceContact(port.faces,tank)}));
  return {whole,ports,attached:whole.distance<=contactPrecision&&ports.some(port=>port.distance<=contactPrecision)};
}
const valveContactEvidence={precision:contactPrecision,valves:[],controls:[]};
check('original valve connection patches are genuine native pipe-flange end triangles',async()=>{
  const native=await valveNative();
  assert.equal(native.sourceFaces.length,456,'complete picked source valve remains native');
  assert.deepEqual(native.ports.map(port=>port.x),[-.5,.5],'measured pipe connection axis is sourceX');
  assert.deepEqual(native.ports.map(port=>port.indices.length),[16,16],'measured two genuine flange-end triangle patches');
  assert.equal(native.valves.length,3);
  assert.ok(native.sourceBounds.min[2]<-.5,'native handwheel extends separately on negativeZ');
  for(const valve of native.valves){
    assert.equal(valve.faces.length,456);
    assert.deepEqual(valve.ports.map(port=>port.faces.length),[16,16]);
  }
});
for(let index=0;index<3;index++){
  check('valve'+index+': actual whole native valve touches or crosses actual native tank skin',async()=>{
    const native=await valveNative(),valve=native.valves[index],witness=valveAttachment(valve,native.tank);
    valveContactEvidence.valves[index]={node:valve.node,matrix:valve.instance.matrix,...witness};
    assert.ok(witness.whole.distance<=contactPrecision,
      valve.node+': no actual native valve/tank contact within .002m: '+JSON.stringify(witness.whole));
  });
  check('valve'+index+': genuine original pipe/flange connection touches or embeds in actual tank skin',async()=>{
    const native=await valveNative(),valve=native.valves[index],witness=valveAttachment(valve,native.tank);
    assert.ok(witness.ports.some(port=>port.distance<=contactPrecision),
      valve.node+': handwheel/body contact cannot replace native pipe connection: '+JSON.stringify(witness.ports));
  });
}
check('genuine copied embedded valve pipe is a positive native attachment control',async()=>{
  const native=await valveNative();
  const valid=native.positive;
  assert.ok(valid,'actual candidate supplies a genuine positive original-pipe contact');
  const witness=valveAttachment(valid,native.tank);
  assert.ok(witness.whole.crossings>0,'real complete source valve crosses actual tank skin');
  assert.ok(witness.ports.some(port=>port.crossings>0),'genuine source pipe patch crosses actual tank skin');
  valveContactEvidence.controls.push({name:'genuine embedded pipe',node:valid.node,...witness});
});
function valveMoved(valve,offset){
  return {...valve,faces:valveTranslated(valve.faces,offset),
    ports:valve.ports.map(port=>({...port,faces:valveTranslated(port.faces,offset)}))};
}
check('copied genuine hovering pipe is rejected while complete native envelopes overlap',async()=>{
  const native=await valveNative(),valid=native.positive;
  assert.ok(valid,'negative starts from actual mounted native pipe');
  // Actual copied six-centimetre Source2583 hover, expressed in the genuine
  // tank donor frame. It does not depend on a candidate's new attachment depth.
  const offset=vector([0,0,-.06/4.4]).applyMatrix4(native.tankMatrix).sub(
    vector([0,0,0]).applyMatrix4(native.tankMatrix)).toArray(),changed=valveMoved(valid,offset);
  assert.equal(changed.faces.length,456,'copy retains complete actual native donor');
  assert.ok(valveEnvelopeOverlap(changed.faces,native.tank),'hover still passes old bounding-envelope overlap');
  const witness=valveAttachment(changed,native.tank);
  assert.equal(witness.attached,false,'actual hovering pipe cannot pass through bounding boxes');
  assert.ok(witness.ports.every(port=>port.distance>contactPrecision),'original mating surfaces are truly disconnected');
  valveContactEvidence.controls.push({name:'copied native hover',offset,...witness});
});
check('copied native lateral disconnection is rejected inside overlapping native envelopes',async()=>{
  const native=await valveNative(),valid=native.positive;
  assert.ok(valid);
  // Genuine copied Source2583 rear-disconnected pose, relative to the tank
  // donor. A later candidate repair cannot silently move this negative fixture.
  const offset=vector([-2.32/4.15,0,0]).applyMatrix4(native.tankMatrix).sub(
    vector([0,0,0]).applyMatrix4(native.tankMatrix)).toArray();
  const changed=valveMoved(valid,offset);
  assert.equal(changed.faces.length,456);
  assert.ok(valveEnvelopeOverlap(changed.faces,native.tank),'genuine rear-pose copy still passes old envelopes');
  const witness=valveAttachment(changed,native.tank);
  assert.equal(witness.attached,false,'actual disconnected lateral pipe cannot pass via an overlapping box');
  assert.ok(witness.whole.distance>contactPrecision,'genuine rear-pose copy has a measured whole-native gap');
  valveContactEvidence.controls.push({name:'copied native lateral',offset,...witness});
});
check('removing only real tank attachment triangles is rejected with unchanged native tank envelope',async()=>{
  const native=await valveNative(),valid=native.positive;
  assert.ok(valid);
  const contactFaces=valid.ports.flatMap(port=>port.faces),removed=[];
  const kept=native.tank.filter((face,index)=>{
    if(valveSurfaceContact(contactFaces,[face]).distance<=contactPrecision){removed.push(index);return false;}
    return true;
  });
  assert.ok(removed.length>0&&kept.length>0,'remove actual native contact support, retain actual remaining tank');
  assert.ok(valveBounds(native.tank).equals(valveBounds(kept)),'contact removal leaves old native tank bounding box exact');
  assert.ok(valveEnvelopeOverlap(valid.faces,kept),'native valve still passes old bounding-envelope overlap');
  const witness=valveAttachment(valid,kept);
  assert.equal(witness.attached,false,'missing native tank support cannot be replaced by its old bounding box');
  assert.ok(witness.ports.every(port=>port.distance>contactPrecision));
  valveContactEvidence.controls.push({name:'removed native tank attachment faces',removed,...witness});
});
check('all unowned source, fit, picks, module, catalog, public, assertions and pins stay byte exact',()=>{
  assert.deepEqual(valveProtectedPaths.map(path=>hash(readFileSync(join(root,path)))),valveProtectedHashes);
  assert.deepEqual(sourceFiles.map(path=>hash(readFileSync(path))),originalSourceHashes);
});
const valveContactVerdicts=[];
for(const {name,run}of checks.slice(valveContactStart))try{
  await run();valveContactVerdicts.push({name,passed:true});
}catch(error){
  valveContactVerdicts.push({name,passed:false,message:error.message,stack:error.stack});
  console.error('FAIL '+name+': '+error.message);
}
const valveContactFailures=valveContactVerdicts.filter(row=>!row.passed).length;
const valveNativeData=await valveNative();
writeFileSync(join(scratch,'valve-contact-witness.json'),JSON.stringify({
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  nativeModel:{bytes:valveNativeData.data.model.bytes.length,sha256:hash(valveNativeData.data.model.bytes)},
  originalValve:{sha256:valveNativeData.pick.sha256,bounds:valveNativeData.sourceBounds,
    pipeAxis:'sourceX',ports:valveNativeData.ports},
  ...valveContactEvidence,verdicts:valveContactVerdicts,
  protectedFiles:valveProtectedPaths.map((path,index)=>({path,sha256:valveProtectedHashes[index]}))
},null,2)+'\n');
console.log('Convoy tanker valve contact: '+valveContactVerdicts.length+' checks, '+
  (valveContactVerdicts.length-valveContactFailures)+' passed, '+valveContactFailures+' failed.');
if(valveContactFailures)process.exitCode=1;


// Additive round2 build scale. Claude approved about11m long/3.5m tall;
// Director made those exact reproducible build targets at existing .002m
// export precision. These are presentation targets, not race/body physics or
// a width, triangle, draw, material-brightness or renderer-frame budget.
const tankerScaleStart=checks.length;
const tankerScaleTargets=Object.freeze({length:11,height:3.5,precision:contactPrecision});
const tankerScaleEvidence={targets:tankerScaleTargets};
async function measuredTankerScale(){
  const data=await candidate(),scene=data.model.gltf.scene;
  scene.updateMatrixWorld(true);
  const bounds=boxOf(scene),size=bounds.getSize(new THREE.Vector3());
  assert.ok(!bounds.isEmpty(),'scale measures the complete loaded native assembly');
  assert.ok(size.toArray().every(value=>Number.isFinite(value)&&value>0),'actual complete native dimensions');
  const receipt={min:bounds.min.toArray(),max:bounds.max.toArray(),
    width:size.x,height:size.y,length:size.z,sha256:hash(data.model.bytes),bytes:data.model.bytes.length};
  tankerScaleEvidence.actual=receipt;return receipt;
}
check('round2 full native assembly length is11m within existing export precision',async()=>{
  const measured=await measuredTankerScale();
  assert.ok(Math.abs(measured.length-tankerScaleTargets.length)<=tankerScaleTargets.precision,
    'complete native tanker length '+measured.length+'m differs from approved11m build target by '+
    Math.abs(measured.length-tankerScaleTargets.length)+'m; tolerance remains.002m');
});
check('round2 full native assembly height is3.5m within existing export precision',async()=>{
  const measured=await measuredTankerScale();
  assert.ok(Math.abs(measured.height-tankerScaleTargets.height)<=tankerScaleTargets.precision,
    'complete native tanker height '+measured.height+'m differs from approved3.5m build target by '+
    Math.abs(measured.height-tankerScaleTargets.height)+'m; tolerance remains.002m');
});
const tankerScaleVerdicts=[];
for(const {name,run}of checks.slice(tankerScaleStart))try{
  await run();tankerScaleVerdicts.push({name,passed:true});
}catch(error){
  tankerScaleVerdicts.push({name,passed:false,message:error.message,stack:error.stack});
  console.error('FAIL '+name+': '+error.message);
}
const tankerScaleFailures=tankerScaleVerdicts.filter(row=>!row.passed).length;
writeFileSync(join(scratch,'round2-scale-witness.json'),JSON.stringify({
  sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  ...tankerScaleEvidence,verdicts:tankerScaleVerdicts,
  scope:'Native build dimensions only; actual renderer car-size/material/art/frame comparison pending.'
},null,2)+'\n');
console.log('Convoy tanker round2 scale: '+tankerScaleVerdicts.length+' checks, '+
  (tankerScaleVerdicts.length-tankerScaleFailures)+' passed, '+tankerScaleFailures+' failed.');
if(tankerScaleFailures)process.exitCode=1;

// Claude's final round tests measure the loaded target and beacon geometry.
// Material colour, weathering, stripes and readability are judged in pictures.
const finalRoundStart=checks.length;
check('round3 native red handwheels are about .6m across and face outward',async()=>{
  const data=await candidate();
  for(const {row,node} of nativePart(data,'valve')){
    const wheels=meshList(node).filter(mesh=>(Array.isArray(mesh.material)?mesh.material:[mesh.material])
      .some(material=>material.name==='hazard-red-controls'));
    assert.ok(wheels.length,row.node+': loaded native handwheel geometry');
    const bounds=new THREE.Box3();for(const wheel of wheels)bounds.union(boxOf(wheel));
    const size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.y>=.5&&size.y<=.7&&size.z>=.5&&size.z<=.7,
      row.node+': actual outward handwheel must span about .6m in Y and Z; measured '+JSON.stringify(size.toArray()));
    assert.ok(size.x<=.15,row.node+': actual handwheel plane must face outward, not along the rig; thickness '+size.x+'m');
  }
});
check('round3 two loaded amber beacon assemblies are about .4m tall',async()=>{
  const data=await candidate(),lamps=nativePart(data,'warning-lamp');
  assert.equal(lamps.length,2,'two actual amber beacon assemblies');
  for(const {row,node} of lamps){const size=boxOf(node).getSize(new THREE.Vector3());
    assert.ok(size.y>=.35&&size.y<=.5,
      row.node+': actual .4m beacon plus short post must remain between .35m and .5m; measured '+size.y+'m');}
});
check('round3 both native beacons occupy the boarding plate front corners',async()=>{
  const data=await candidate(),plate=boxOf(nativePart(data,'boarding-plate')[0].node);
  const span=plate.getSize(new THREE.Vector3()),center=plate.getCenter(new THREE.Vector3());
  const positions=nativePart(data,'warning-lamp').map(({node})=>boxOf(node).getCenter(new THREE.Vector3()));
  assert.ok(positions.some(point=>point.x<center.x)&&positions.some(point=>point.x>center.x),
    'one actual beacon on each side of the native plate');
  for(const point of positions){
    assert.ok(Math.abs(point.x-center.x)>=span.x*.3,
      'native beacon must sit toward its plate side edge, not near the center');
    assert.ok(point.z>=plate.min.z+span.z*.7&&point.z<=plate.max.z+.1,
      'native beacon must sit toward the plate front edge, not its center');
  }
});

check('round3 roof paint uses one dedicated non-repeating plate texture',async()=>{
  const data=await candidate(),node=data.model.json.nodes.find(row=>row.name==='tanker-boarding-plate');
  const primitives=data.model.json.meshes[node.mesh].primitives;
  assert.equal(primitives.length,1,'native roof stays one complete donor mesh and draw');
  const material=data.model.json.materials[primitives[0].material];
  const texture=data.model.json.textures[material.pbrMetallicRoughness.baseColorTexture.index];
  assert.equal(data.model.json.images[texture.source].name,'tanker-dark-roof-and-warning-border',
    'plate has its own continuous steel center and warning border mapping');
  const plate=nativePart(data,'boarding-plate')[0].node;
  for(const mesh of meshList(plate)){
    const uv=mesh.geometry.attributes.uv;
    const values=Array.from({length:uv.count},(_,i)=>[uv.getX(i),uv.getY(i)]);
    assert.ok(values.every(([u,v])=>u>=0&&u<=1&&v>=0&&v<=1),'single plate texture stays inside its full UV square');
    assert.ok(Math.max(...values.map(row=>row[1]))-Math.min(...values.map(row=>row[1]))>.99,
      'plate border and middle use the full texture height, not one strip of a shared atlas');
  }
});
check('round3 loaded lamps stay saturated amber when lit and turn fully off on recovery',async()=>{
  const api=await moduleApi(),data=await candidate();
  const result=api.createTankerModel({loadAsset:async()=>(await asset(join(data.output,config.outputs.model))).gltf});
  await result.ready;
  result.setValveHealth(Object.freeze([0,0,0]));
  for(const {row} of nativePart(data,'warning-lamp')){
    const node=result.group.getObjectByName(row.node);
    for(const mesh of meshList(node))for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
      assert.ok(material.emissive.r>material.emissive.g&&material.emissive.g>material.emissive.b,
        'lit glass retains amber hue');
      assert.ok(material.emissiveIntensity>0&&material.emissiveIntensity<=2,
        'amber emission does not clip into the former cream-white lamp');
      assert.ok(material.emissiveMap,'native post mask keeps only beacon glass emissive');
    }
  }
  result.setValveHealth(Object.freeze([75,75,75]));
  assert.ok(lampValues(result.group,data.manifest).every(value=>value===0),'recovered lamps have no emission');
  result.dispose();
});

const finalRoundVerdicts=[];
for(const {name,run} of checks.slice(finalRoundStart))try{
  await run();finalRoundVerdicts.push({name,passed:true});
}catch(error){finalRoundVerdicts.push({name,passed:false,message:error.message});console.error('FAIL '+name+': '+error.message);}
const finalRoundFailures=finalRoundVerdicts.filter(row=>!row.passed).length;
writeFileSync(join(scratch,'round3-native-verdict.json'),JSON.stringify({verdicts:finalRoundVerdicts},null,2)+'\n');
console.log('Convoy tanker final round: '+finalRoundVerdicts.length+' checks, '+(finalRoundVerdicts.length-finalRoundFailures)+' passed, '+finalRoundFailures+' failed.');
if(finalRoundFailures)process.exitCode=1;
