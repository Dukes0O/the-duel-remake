import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {deflateSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const clone = value => structuredClone(value);
const p1 = 'art-build/first-person-p1/candidate/hands/rook.glb';
const p2 = 'art-build/first-person-p2/candidate/hands/rook.glb';
const camera = {position:[0,0,0],target:[0,0,-1],verticalFov:72,near:.15,width:1280,height:720};
const poses = [
  ['idle',.25,'rpg'],['aim',.25,'rpg'],['fire',.10,'rpg'],
  ['reload',1.10,'rpg'],['reload',1.65,'rpg'],['aim-reload',1.10,'rpg'],
  ['wrench-idle',.25,'wrench'],['repair',1.12,'wrench'],
];
const handIds = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
const productionHashes = Object.fromEntries(handIds.map(id => [id,
  hash(readFileSync(join(root,`public/assets/models/wasteland/first-person/hands/${id}.glb`)))]));
const ref = (path,crop) => ({path,sha256:hash(readFileSync(join(root,path))),crop});
const stamp = n => n.toString(16).padStart(64,'0');

function reviewFixture() {
  const sha = productionHashes.rook;
  const blender = {
    family:'first-person-p2',round:1,scope:'Blender source module at authored camera',
    candidateSha256:sha,camera:clone(camera),
    references:{
      crew:ref('public/assets/reference/wasteland-crew-1.png',[0,40,510,675]),
      rpgArm:ref('public/assets/reference/wasteland-rpg.png',[790,338,1536,1024]),
    },
    tools:Object.fromEntries(['rpg','wrench'].map(tool => [tool,{
      path:`public/assets/models/wasteland/first-person/${tool}.glb`,
      sha256:hash(readFileSync(join(root,`public/assets/models/wasteland/first-person/${tool}.glb`))),
    }])),
    captures:poses.map(([clip,time,tool],i) => ({
      path:`art-build/first-person-p2/candidate/evidence/blender-${i}.png`,
      sha256:stamp(i+1),clip,time,tool,crew:'rook',scope:'Blender source module',
    })),
  };
  const captures = {
    family:'first-person-p2',round:1,candidate:{path:p2,sha256:sha},
    camera:clone(camera),productionBefore:clone(productionHashes),
    productionAfter:clone(productionHashes),
    toolsBefore:Object.fromEntries(['rpg','wrench'].map(tool=>[tool,blender.tools[tool].sha256])),
    toolsAfter:Object.fromEntries(['rpg','wrench'].map(tool=>[tool,blender.tools[tool].sha256])),
    qualities:{high:{candidateRequests:1},performance:{candidateRequests:1}},
    captures:poses.flatMap(([clip,time,tool],i) =>
      ['high','performance'].map((quality,j) => ({
        path:`.evidence/first-person-p2/round-1/${quality}-${i}.png`,
        sha256:stamp(20+2*i+j),clip,time,tool,quality,scope:'game course',
      }))),
    orderedMotion:[],frameStatus:'unmeasured',
  };
  return {captures,blender,round:1,productionHashes:clone(productionHashes)};
}

test('P2 proof selector is explicit and keeps P1 defaults and contact mode separate', async () => {
  const scenario = await import('./scenarios/first-person-polish.mjs');
  assert.equal(typeof scenario.selectFirstPersonProof,'function');
  const base=scenario.selectFirstPersonProof({});
  assert.deepEqual(base,{family:'first-person-p1',round:1,
    candidateRoot:'art-build/first-person-p1',defaultCandidatePath:p1,
    blenderManifestPath:'art-build/first-person-p1/candidate/evidence/blender-manifest.json'});
  const selected=scenario.selectFirstPersonProof({p2Round:'2'});
  assert.deepEqual(selected,{family:'first-person-p2',round:2,
    candidateRoot:'art-build/first-person-p2',defaultCandidatePath:p2,
    blenderManifestPath:'art-build/first-person-p2/candidate/evidence/blender-manifest.json'});
  for(const invalid of [
    {p1Round:'1',p2Round:'2'},{p2Round:'0'},{p2Round:'11'},{p2Round:'banana'},
    {p2Round:'1',contactOnly:true},
  ])assert.throws(()=>scenario.selectFirstPersonProof(invalid),/round|selector|contact|conflict|p1|p2/i);
});

test('P2 candidate realpath cannot alias P1, public, or an outside GLB', async () => {
  const scenario=await import('./scenarios/first-person-polish.mjs');
  const production=join(root,'public/assets/models/wasteland/first-person/hands/rook.glb');
  const dir=join(root,'art-build/first-person-p2/test-path');
  const good=join(dir,'rook.glb');
  mkdirSync(dir,{recursive:true});
  writeFileSync(good,readFileSync(production));
  try {
    const selected=await scenario.validateFirstPersonCandidatePath({
      root,candidatePath:good,productionPath:production,family:'first-person-p2'});
    assert.equal(selected.absolute,good);
    assert.equal(selected.sha256,productionHashes.rook);
    for(const bad of [production,join(root,p1),join(root,'art-build/first-person-p2/../first-person-p1/candidate/hands/rook.glb')])
      await assert.rejects(()=>scenario.validateFirstPersonCandidatePath({
        root,candidatePath:bad,productionPath:production,family:'first-person-p2'}),
        /production|outside|ignored|missing|ENOENT|exist/i);
  } finally {rmSync(good,{force:true});}
});

test('P2 review paths are separate, read-only, and reject mixed round selectors', () => {
  const tool=join(root,'tools/fidelity-sheet.mjs');
  const before=existsSync(join(root,'docs/board/looks/first-person-p1/round-1.jpg'))
    ?hash(readFileSync(join(root,'docs/board/looks/first-person-p1/round-1.jpg'))):null;
  const result=spawnSync(process.execPath,[tool,'--first-person-p2-round','1','--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(result.status,0,result.stderr||result.stdout);
  const plan=JSON.parse(result.stdout);
  assert.match(plan.directory.replaceAll('\\','/'),/\/\.evidence\/[^/]+\/first-person-p2\/round-1$/);
  assert.equal(plan.output,join(plan.directory,'sheet.png'));
  assert.equal(plan.manifest,join(plan.directory,'sheet.json'));
  assert.equal(plan.summary,join(root,'docs/board/looks/first-person-p2/round-1.jpg'));
  assert.equal(existsSync(plan.output),false);
  const mixed=spawnSync(process.execPath,[tool,'--first-person-p1-round','1',
    '--first-person-p2-round','1','--paths-only'],{cwd:root,encoding:'utf8',timeout:10000});
  assert.notEqual(mixed.status,0,'mixed P1/P2 selectors must reject before any write');
  assert.equal(existsSync(join(root,'docs/board/looks/first-person-p1/round-1.jpg'))
    ?hash(readFileSync(join(root,'docs/board/looks/first-person-p1/round-1.jpg'))):null,before);
});

test('P2 sheet joins eight exact Rook poses with separate source and game provenance', async () => {
  const sheet=await import('./fidelity-sheet.mjs');
  assert.equal(typeof sheet.validateFirstPersonP2Sheet,'function');
  const fixture=reviewFixture();
  const result=sheet.validateFirstPersonP2Sheet(fixture);
  assert.equal(result.rows.length,8);
  assert.deepEqual(result.rows.map(row=>[row.clip,row.time,row.tool]),poses);
  assert.equal(result.candidateSha256,productionHashes.rook);
  assert.deepEqual(result.camera,camera);
  assert.deepEqual(result.productionHashes,productionHashes);
  for(const row of result.rows) {
    assert.equal(row.scope,'Blender module vs game course');
    assert.deepEqual(row.columnLabels,['REFERENCE','BLENDER MODULE','GAME HIGH','GAME PERF']);
    assert.ok(row.blender && row.high && row.performance);
  }
});

test('P2 sheet rejects P1 reuse, changed asset, missing pose, and false swap evidence', async () => {
  const {validateFirstPersonP2Sheet:validate}=await import('./fidelity-sheet.mjs');
  assert.equal(typeof validate,'function');
  const input=reviewFixture();
  const bad=[];
  let v=clone(input);v.captures.family='first-person-p1';bad.push(v);
  v=clone(input);v.blender.family='first-person-p1';bad.push(v);
  v=clone(input);v.captures.candidate.path=p1;bad.push(v);
  v=clone(input);v.captures.candidate.sha256=stamp(999);bad.push(v);
  v=clone(input);v.blender.camera.near=.2;bad.push(v);
  v=clone(input);v.captures.qualities.performance.candidateRequests=0;bad.push(v);
  v=clone(input);v.captures.qualities.high.candidateRequests=2;bad.push(v);
  v=clone(input);v.captures.productionAfter.rook=stamp(999);bad.push(v);
  v=clone(input);delete v.captures.toolsBefore.wrench;bad.push(v);
  v=clone(input);v.captures.toolsAfter.rpg=stamp(999);bad.push(v);
  v=clone(input);v.captures.toolsBefore.wrench=stamp(999);bad.push(v);
  v=clone(input);v.blender.captures[0].path=
    'art-build/first-person-p1/candidate/evidence/blender-0.png';bad.push(v);
  v=clone(input);v.captures.captures[0].path=
    '.evidence/first-person-p1/round-1/high-0.png';bad.push(v);
  v=clone(input);v.captures.captures.pop();bad.push(v);
  for(const invalid of bad)
    assert.throws(()=>validate(invalid),/p2|family|candidate|hash|camera|pose|capture|quality|swap|request|production|mismatch|path/i);
});

test('frame assessor rejects invented proof families with otherwise valid A1/B/A2 evidence', async () => {
  const {assessFirstPersonP1FrameCost:assess}=await import('./scenarios/first-person-polish.mjs');
  const values=n=>Array(600).fill(n);
  const branch=(name,quality)=>({
    branch:name,asset:name==='B'?{kind:'candidate',path:p1,sha256:stamp(7)}:
      {kind:'production',path:'public/assets/models/wasteland/first-person/hands/rook.glb',
        sha256:productionHashes.rook},
    candidateRequests:name==='B'?1:0,observedQuality:quality,
    courseSignature:'same-course',poseSignature:'same-pose',warmFrames:30,
    renderFrameCalls:630,nativeRafTicks:630,rafSamplesMs:values(16),
    renderCpuSamplesMs:values(8),drawCallSamples:values(80),
    triangleSamples:values(10000),textureCountSamples:values(30),
    handsVisibleSamples:values(true),toolVisibleSamples:values(true),
  });
  const reports=['high','performance'].map(quality=>({quality,
    branches:['A1','B','A2'].map(name=>branch(name,quality))}));
  const options={reports,candidateSha256:stamp(7),productionSha256:productionHashes.rook};
  assert.equal(assess(options).passed,true,'valid P1 family remains the control');
  assert.equal(assess({...options,family:'first-person-fake'}).passed,false,
    'an unrecognized proof family cannot inherit a valid P1 frame verdict');
});

function syntheticTriptych() {
  const size=1254,row=size*3+1,raw=Buffer.alloc(row*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const at=y*row+1+x*3,base=[[201,43,173],[34,196,47],[208,181,35]][Math.floor(x/418)];
    for(let c=0;c<3;c++)raw[at+c]=base[c]+((x+y)%11);
  }
  const table=Array.from({length:256},(_,i)=>{for(let n=0;n<8;n++)
    i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
  const chunk=(name,bytes)=>{
    const header=Buffer.from(name),body=Buffer.concat([header,bytes]),out=Buffer.alloc(body.length+8);
    out.writeUInt32BE(bytes.length,0);body.copy(out,4);
    let crc=0xffffffff;for(const b of body)crc=table[(crc^b)&255]^(crc>>>8);
    out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;
  };
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=2;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),
    chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);
}

test('P2 paint and output path planning reject unsafe identities before a build', () => {
  const dir=join(root,'art-build/first-person-p2/test-cloth');
  mkdirSync(dir,{recursive:true});
  const input=join(dir,'triptych.png'),output=join(dir,'candidate');
  writeFileSync(input,syntheticTriptych());
  const generator=join(root,'tools/blender/first-person-gear.py');
  const command=(more)=>spawnSync('python',[generator,'--','--root',root,'--round','1',
    '--p2-rook','--output-dir',output,'--paths-only',...more],
    {cwd:root,encoding:'utf8',timeout:10000});
  const valid=command(['--p2-paint',input,'--p2-paint-sha256',hash(readFileSync(input))]);
  assert.equal(valid.status,0,valid.stderr||valid.stdout);
  const plan=JSON.parse(valid.stdout);
  assert.equal(plan.mode,'p2-rook');
  assert.equal(plan.candidateGlb,join(output,'hands/rook.glb'));
  assert.equal(plan.manifest,join(output,'manifest.json'));
  assert.equal(existsSync(output),false,'paths-only cannot write candidate output');
  for(const bad of [
    ['--p2-paint',input],
    ['--p2-paint',input,'--p2-paint-sha256','0'.repeat(64)],
    ['--output-dir',join(root,'public/assets/p2'),'--p2-paint',input,
      '--p2-paint-sha256',hash(readFileSync(input))],
  ])assert.notEqual(command(bad).status,0,'unsafe P2 source/output identity must reject');
  assert.equal(existsSync(output),false,'rejected path cannot create output');
});

async function loadMesh(path) {
  const bytes=readFileSync(path),loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,
    bytes.byteOffset+bytes.byteLength),'');
  let mesh;asset.scene.traverse(node=>{if(node.isSkinnedMesh&&
    node.name==='rook_sleeves_gloves_fingers')mesh=node;});
  assert.ok(mesh,'actual Rook skinned hand mesh is required');
  return mesh;
}
const centerlines={
  R:{elbow:[.35,-.43,-.27],wrist:[.205,-.285,-.48]},
  L:{elbow:[-.35,-.43,-.39],wrist:[.075,-.285,-.82]},
};
const angularDistance=(a,b)=>Math.abs(((a-b+540)%360)-180);
function sleeveSamples(mesh,side) {
  const {elbow,wrist}=centerlines[side],axis=wrist.map((n,i)=>n-elbow[i]);
  const pos=mesh.geometry.attributes.position;
  const uv=mesh.geometry.attributes.uv, samples=[];
  for(let i=0;i<pos.count;i++) {
    const px=uv.getX(i)*1024,py=uv.getY(i)*1024;
    if(px<16||px>240||py<776||py>1016)continue;
    const p=[pos.getX(i),pos.getY(i),pos.getZ(i)];
    const t=(p[2]-elbow[2])/axis[2];
    if(t<-.02||t>.9)continue;
    const sign=side==='R'?1:-1;
    const cx=elbow[0]+axis[0]*t+sign*.015*Math.sin(t*Math.PI);
    const cy=elbow[1]+axis[1]*t+.012*Math.sin(t*Math.PI);
    const dx=p[0]-cx,dy=p[1]-cy;
    const radius=Math.hypot(dx,dy),angle=(Math.atan2(dy,dx)*180/Math.PI+360)%360;
    if(radius>.14||radius<.01)continue;
    samples.push({t,angle,radius,p});
  }
  assert.ok(samples.length>100,`${side} sleeve needs measured exported cloth vertices`);
  return samples;
}
function radial(samples,t,angle) {
  const ring=samples.filter(v=>Math.abs(v.t-t)<.025);
  assert.ok(ring.length>=16,`exported sleeve missing t=${t} ring`);
  const keys=new Map();
  for(const v of ring)keys.set(Math.round(v.angle*1000),v);
  const ordered=[...keys.values()].sort((a,b)=>a.angle-b.angle);
  assert.ok(ordered.length>=16,`exported sleeve t=${t} ring lacks angular coverage`);
  const target=(angle+360)%360;
  for(let i=0;i<ordered.length;i++) {
    const left=ordered[i],right=ordered[(i+1)%ordered.length];
    const a=left.angle,b=right.angle+(i===ordered.length-1?360:0);
    const x=target<a?target+360:target;
    if(x>=a&&x<=b) {
      assert.ok(b-a<=30,`exported sleeve has a wide angular gap at t=${t}`);
      const f=(x-a)/(b-a);
      return left.radius*(1-f)+right.radius*f;
    }
  }
  assert.fail(`exported sleeve cannot interpolate t=${t} angle=${angle}`);
}
const clothUv=(uv,i)=>{const x=uv.getX(i)*1024,y=uv.getY(i)*1024;
  return x>=16&&x<=240&&y>=776&&y<=1016;};
const keyPoint=p=>p.map(v=>Math.round(v*10000)).join(',');
function protectedRecords(mesh) {
  const geometry=mesh.geometry,{position,uv,skinIndex,skinWeight}=geometry.attributes;
  const records=new Set();
  for(let i=0;i<position.count;i++) {
    if(clothUv(uv,i))continue;
    const point=[position.getX(i),position.getY(i),position.getZ(i)];
    const tex=[uv.getX(i),uv.getY(i)];
    const joints=Array.from({length:4},(_,j)=>skinIndex.getComponent(i,j));
    const weights=Array.from({length:4},(_,j)=>Math.round(skinWeight.getComponent(i,j)*10000));
    records.add([...point.map(v=>Math.round(v*100000)),...tex.map(v=>Math.round(v*100000)),
      ...joints,...weights].join(','));
  }
  return [...records].sort();
}
function frozenClothRecords(mesh,side) {
  const {elbow,wrist}=centerlines[side],axis=wrist.map((v,i)=>v-elbow[i]);
  const {position,uv,skinIndex,skinWeight}=mesh.geometry.attributes,records=new Set();
  for(let i=0;i<position.count;i++) {
    if(!clothUv(uv,i))continue;
    const point=[position.getX(i),position.getY(i),position.getZ(i)];
    const t=(point[2]-elbow[2])/axis[2];
    if(!(t<.015||Math.abs(t-.28)<.02||t>=.81))continue;
    records.add([...point.map(v=>Math.round(v*100000)),
      Math.round(uv.getX(i)*100000),Math.round(uv.getY(i)*100000),
      ...Array.from({length:4},(_,j)=>skinIndex.getComponent(i,j)),
      ...Array.from({length:4},(_,j)=>Math.round(skinWeight.getComponent(i,j)*10000))].join(','));
  }
  return [...records].sort();
}
function clothEdgeIncidence(mesh) {
  const {position,uv}=mesh.geometry.attributes,index=mesh.geometry.index;
  const edges=new Map();
  for(let f=0;f<index.count;f+=3) {
    const ids=[index.getX(f),index.getX(f+1),index.getX(f+2)];
    if(!ids.every(id=>clothUv(uv,id)))continue;
    for(let j=0;j<3;j++) {
      const a=ids[j],b=ids[(j+1)%3];
      const ak=keyPoint([position.getX(a),position.getY(a),position.getZ(a)]);
      const bk=keyPoint([position.getX(b),position.getY(b),position.getZ(b)]);
      const key=[ak,bk].sort().join('|');
      edges.set(key,(edges.get(key)||0)+1);
    }
  }
  assert.ok(edges.size>100,'cloth seam check needs actual exported sleeve faces');
  return edges;
}
function assertSleeveShape(old,next,side,outer,boundary,inner) {
  const p1samples=sleeveSamples(old,side),p2samples=sleeveSamples(next,side);
  const surplus=(t,a)=>radial(p2samples,t,a)-radial(p1samples,t,a);
  const bulge=surplus(.40,outer),gather=surplus(.60,outer);
  const ridge=Math.max(surplus(.69,outer),surplus(.77,outer));
  assert.ok(bulge>=.012,`${side} outer elbow added only ${(bulge*1000).toFixed(1)} mm`);
  assert.ok(bulge-gather>=.006,`${side} has no localized gathered waist after broad elbow`);
  assert.ok(ridge-gather>=.008,`${side} diagonal ridge does not recover after gather`);
  assert.ok(Math.abs(surplus(.40,boundary))<=.004,
    `${side} seam boundary moved with the bulge instead of tapering`);
  assert.ok(Math.abs(surplus(.40,inner))<=.004,
    `${side} whole circumference swelled rather than a sewn outer panel`);
  assert.ok(Math.abs(surplus(.82,outer))<=.003,
    `${side} changed the frozen cuff and hand contact zone`);
}

test('actual P2 sleeves form broad localized sewn volume versus the P1 recipe', async () => {
  const base=join(root,'art-build/first-person-p2/test-cloth');
  const input=join(base,'triptych.png');
  const p1out=join(root,'art-build/first-person-p1/test-p2-baseline');
  const p1input=join(root,'art-build/first-person-p1/test-p2-triptych.png');
  const p2out=join(base,'p2');
  mkdirSync(base,{recursive:true});
  writeFileSync(input,syntheticTriptych());
  mkdirSync(dirname(p1input),{recursive:true});
  writeFileSync(p1input,readFileSync(input));
  const paintHash=hash(readFileSync(input));
  const generator=join(root,'tools/blender/first-person-gear.py');
  const blender=process.env.BLENDER_BIN||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const before=clone(productionHashes);
  const build=(mode,out)=>spawnSync(blender,['-b','--python-exit-code','1','--python',
    generator,'--','--root',root,'--round','1',mode,'--output-dir',out,
    mode==='--p1-rook'?'--p1-paint':'--p2-paint',
    mode==='--p1-rook'?p1input:input,
    mode==='--p1-rook'?'--p1-paint-sha256':'--p2-paint-sha256',paintHash,'--skip-renders'],
  {cwd:root,encoding:'utf8',timeout:300000,maxBuffer:16*1024*1024});
  const p1build=build('--p1-rook',p1out);
  assert.equal(p1build.status,0,p1build.error?.message||p1build.stderr||p1build.stdout);
  const old=await loadMesh(join(p1out,'hands/rook.glb'));
  assert.throws(()=>assertSleeveShape(old,old,'R',120,40,300),
    /outer elbow added only 0\.0 mm/,
    'the same actual P1 geometry must fail the P2 broad-volume oracle');
  const p2build=build('--p2-rook',p2out);
  assert.equal(p2build.status,0,p2build.error?.message||p2build.stderr||p2build.stdout);
  for(const id of handIds)assert.equal(hash(readFileSync(join(root,
    `public/assets/models/wasteland/first-person/hands/${id}.glb`))),before[id],
    `P2 proof changed production ${id}`);
  const next=await loadMesh(join(p2out,'hands/rook.glb'));
  assert.deepEqual(protectedRecords(next),protectedRecords(old),
    'P2 sleeve construction changed protected hand, wrap, glove, skin UV or weights');
  const edges=clothEdgeIncidence(next);
  assert.equal([...edges.values()].filter(n=>n>2).length,0,
    'shared sewn seam or mixed ring transition has more than two incident faces');
  for(const [side,outer,boundary,inner] of [
    ['R',120,40,300],['L',40,125,220]]) {
    assert.deepEqual(frozenClothRecords(next,side),frozenClothRecords(old,side),
      `${side} first/.28/.82 and later cloth positions, UV or skin weights changed`);
    assertSleeveShape(old,next,side,outer,boundary,inner);
  }
});
