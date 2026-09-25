import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {deflateSync, inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const script = join(root, 'tools/blender/rook-p2.py');
const output = join(root, 'art-build/crew/rook-p2');
const clips = ['idle','walk','sprint','jump','knockdown','get-up',
  'aim','fire','reload','repair','enter','exit'];
const crew = ['rook','nell','jax','odessa','cinder','dune','wren','tusk'];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const fileHash = path => sha(readFileSync(join(root,path)));
const rel = path => relative(root,path).replaceAll('\\','/');
const outputNames = {blend:'rook-p2-candidate.blend',glb:'rook-p2-candidate.glb',
  basecolor:'rook-p2-basecolor.png',surface:'rook-p2-surface.png',normal:'rook-p2-normal.png',
  manifest:'candidate-manifest.json'};

function paintFixture() {
  const directory=join(output,'paint-test','inputs');mkdirSync(directory,{recursive:true});
  const source=join(directory,'source.png'),calibration=join(directory,'calibration.json');
  const width=1254,height=1254,stride=width*4;
  const raw=Buffer.alloc(height*(stride+1));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=y*(stride+1)+1+x*4;
    const eye=(Math.hypot((x-490)/48,(y-470)/19)<1)||
      (Math.hypot((x-768)/48,(y-470)/19)<1);
    const mouth=Math.abs(y-770)<10&&Math.abs(x-630)<108;
    const hair=y<185+Math.abs(x-630)*.12;
    const color=eye?[38,42,36]:mouth?[81,45,43]:hair?[51,39,32]:
      [154+Math.floor(x/47)%9,105+Math.floor(y/61)%11,77+Math.floor((x+y)/83)%7];
    raw[at]=color[0];raw[at+1]=color[1];raw[at+2]=color[2];raw[at+3]=255;
  }
  const chunk=(kind,data)=>{
    const type=Buffer.from(kind),body=Buffer.concat([type,data]);
    let crc=0xffffffff;
    for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    const result=Buffer.alloc(12+data.length);result.writeUInt32BE(data.length,0);
    type.copy(result,4);data.copy(result,8);result.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);
    return result;
  };
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;
  const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),
    chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync(source,png);
  const config=structuredClone(JSON.parse(readFileSync(join(root,
    'tools/blender/rook-p2-paint-calibration.json'),'utf8')));
  config.source.path=rel(source);config.source.sha256=sha(png);
  writeFileSync(calibration,JSON.stringify(config,null,2)+'\n');
  return {source:rel(source),sourceHash:sha(png),calibration:rel(calibration),config};
}

function garmentFixture() {
  const directory=join(output,'garment-test','inputs');mkdirSync(directory,{recursive:true});
  const source=join(directory,'source.png'),calibration=join(directory,'calibration.json');
  const width=1024,height=1024,stride=width*4,raw=Buffer.alloc(height*(stride+1));
  const swatches=[[81,105,101],[166,133,92],[104,88,67],[50,43,37]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=y*(stride+1)+1+x*4,quadrant=(y>=512?2:0)+(x>=512?1:0);
    const fold=Math.floor(x/31)%7+Math.floor(y/53)%5;
    const color=swatches[quadrant];
    for(let channel=0;channel<3;channel++)raw[at+channel]=color[channel]+fold;
    // The reviewed cloth source carries translucent alpha; RGB is color data for opaque cloth.
    raw[at+3]=216+(x+y)%35;
  }
  const chunk=(kind,data)=>{
    const type=Buffer.from(kind),body=Buffer.concat([type,data]);let crc=0xffffffff;
    for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)
      crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    const out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length,0);
    type.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);
    return out;
  };
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;
  const bytes=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),
    chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync(source,bytes);
  const sourcePath=rel(source),sourceHash=sha(bytes);
  const config={version:1,method:'quadrant-panel-bake',source:{path:sourcePath,
    sha256:sourceHash,size:[1024,1024],regions:{shirt:[8,8,504,504],
      canvas:[520,8,1016,504],trousers:[8,520,504,1016],leather:[520,520,1016,1016]}},
  targets:{jacket:{source:'shirt',panels:[[528,780,632,992],[648,780,752,992],
      [768,780,872,992],[888,780,992,992]]},
    'vest-left':{source:'canvas'},'vest-right':{source:'canvas'},
    pockets:{source:'canvas'},scarf:{source:'canvas'},pack:{source:'canvas'},
    trousers:{source:'trousers',panels:[[780,276,878,488],[894,276,992,488]]},
    boots:{source:'leather'},gloves:{source:'leather'},straps:{source:'leather'}}};
  writeFileSync(calibration,JSON.stringify(config,null,2)+'\n');
  return {source:sourcePath,sourceHash,calibration:rel(calibration),config};
}

function readGlb(path) {
  const bytes=readFileSync(path);
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  let json,binary;
  for(let offset=12;offset<bytes.length;){
    const length=bytes.readUInt32LE(offset),type=bytes.readUInt32LE(offset+4);
    if(type===0x4e4f534a)json=JSON.parse(bytes.subarray(offset+8,offset+8+length).toString('utf8'));
    if(type===0x004e4942)binary=bytes.subarray(offset+8,offset+8+length);
    offset+=8+length;
  }
  assert.ok(json&&binary,'self-contained candidate GLB');
  return {bytes,json,binary};
}

function rgbaPng(bytes) {
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(bytes[24],8);assert.equal(bytes[25],6,'RGBA PNG atlas');
  const chunks=[];
  for(let offset=8;offset<bytes.length;){
    const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);
    if(kind==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));
    offset+=length+12;
  }
  const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,pixels=Buffer.alloc(height*stride);
  for(let row=0,input=0;row<height;row++){
    const filter=raw[input++];
    for(let x=0;x<stride;x++){
      const left=x>=4?pixels[row*stride+x-4]:0;
      const up=row?pixels[(row-1)*stride+x]:0;
      const upperLeft=row&&x>=4?pixels[(row-1)*stride+x-4]:0;
      const p=left+up-upperLeft;
      const pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-upperLeft);
      const predictor=pa<=pb&&pa<=pc?left:pb<=pc?up:upperLeft;
      const prior=[0,left,up,Math.floor((left+up)/2),predictor][filter];
      assert.notEqual(prior,undefined,'supported PNG scanline filter');
      pixels[row*stride+x]=(raw[input++]+prior)&255;
    }
  }
  return {width,height,pixels};
}

function embeddedBasecolor(asset) {
  const texture=asset.json.materials[0].pbrMetallicRoughness.baseColorTexture;
  const source=asset.json.textures[texture.index].source;
  const image=asset.json.images[source],view=asset.json.bufferViews[image.bufferView];
  assert.equal(image.mimeType,'image/png');
  return rgbaPng(asset.binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength));
}

test('candidate path plan is Blender-free, isolated and rejects production destinations', () => {
  const run=spawnSync('python',[script,'--root',root,'--stage','candidate','--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10_000});
  assert.equal(run.status,0,run.stderr||run.stdout);
  const plan=JSON.parse(run.stdout);
  assert.deepEqual(plan.blend,[join(output,outputNames.blend)]);
  assert.deepEqual(plan.glb,[join(output,outputNames.glb)]);
  assert.deepEqual(plan.textures,[outputNames.basecolor,outputNames.surface,outputNames.normal].map(name=>join(output,name)));
  assert.ok(plan.evidence.includes(join(output,outputNames.manifest)));
  for(const unsafe of ['public/assets/models/wasteland/crew','../rook-p2-outside']){
    const reject=spawnSync('python',[script,'--root',root,'--stage','candidate',
      '--output-dir',unsafe,'--paths-only'],{cwd:root,encoding:'utf8',timeout:10_000});
    assert.notEqual(reject.status,0,`${unsafe}: candidate cannot write outside ignored review output`);
  }
});

test('optional face-paint input requires an exact ignored source hash and isolated output before Blender', () => {
  const {source,sourceHash:expected,calibration}=paintFixture();
  assert.equal(fileHash(source),expected,'approved ignored paint source bytes');
  const base=['--root',root,'--stage','candidate','--output-dir',
    'art-build/crew/rook-p2/paint-test/painted','--face-paint',source];
  const run=args=>spawnSync('python',[script,...args,'--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10000});
  const accepted=run([...base,'--face-paint-sha256',expected,'--paint-calibration',calibration]);
  assert.equal(accepted.status,0,accepted.stderr||accepted.stdout);
  const plan=JSON.parse(accepted.stdout);
  assert.equal(plan.glb[0],join(output,'paint-test','painted','rook-p2-candidate.glb'));
  for(const invalid of [base,[...base,'--face-paint-sha256','0'.repeat(64)],
    [...base.slice(0,-1),'public/assets/reference/wasteland-crew-1.png',
      '--face-paint-sha256',expected],
    [...base.slice(0,-1),'art-build/crew/rook-p2/../../../public/assets/reference/wasteland-crew-1.png',
      '--face-paint-sha256',expected]]){
    const result=run(invalid);
    assert.notEqual(result.status,0,'missing/wrong hash or unsafe input rejected before Blender and writes');
  }
  const defaultPlan=run(['--root',root,'--stage','candidate']);
  assert.equal(defaultPlan.status,0,defaultPlan.stderr||defaultPlan.stdout);
  assert.equal(JSON.parse(defaultPlan.stdout).glb[0],join(output,'rook-p2-candidate.glb'),
    'no paint input retains deterministic structural candidate output');
});

test('face-paint calibration validates source identity and ordered landmarks before Blender', () => {
  const {source,sourceHash,calibration,config}=paintFixture();
  assert.equal(config.source.sha256,sourceHash);
  assert.deepEqual(config.target.boundsPx,[16,16,244,244]);
  const base=['--root',root,'--stage','candidate','--face-paint',source,
    '--face-paint-sha256',sourceHash,'--output-dir','art-build/crew/rook-p2/paint-test/painted'];
  const run=path=>spawnSync('python',[script,...base,'--paint-calibration',path,'--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10000});
  const valid=run(calibration);
  assert.equal(valid.status,0,valid.stderr||valid.stdout);
  const fixtures=join(output,'paint-test','inputs');mkdirSync(fixtures,{recursive:true});
  const malformed=join(fixtures,'malformed.json');writeFileSync(malformed,'{');
  const reordered=structuredClone(config);
  reordered.target.landmarks.mouth=[130,210];
  reordered.target.landmarks.chin=[130,193];
  const wrongOrder=join(fixtures,'nonmonotonic.json');
  writeFileSync(wrongOrder,JSON.stringify(reordered));
  const wrongSource=structuredClone(config);wrongSource.source.sha256='0'.repeat(64);
  const wrongSourcePath=join(fixtures,'wrong-source.json');
  writeFileSync(wrongSourcePath,JSON.stringify(wrongSource));
  for(const path of [malformed,wrongOrder,wrongSourcePath,
    'public/assets/reference/wasteland-crew-1.png','../outside.json']){
    assert.notEqual(run(path).status,0,`${path}: malformed, nonmonotonic, mismatched or unsafe calibration rejected`);
  }
});

test('optional face paint changes only the exported face atlas and records exact provenance', () => {
  const {source,sourceHash,calibration}=paintFixture();
  const frozen=Object.fromEntries([...crew.map(id=>`public/assets/models/wasteland/crew/${id}.glb`),
    'tools/blender/crew-fighters.py'].map(path=>[path,fileHash(path)]));
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const control=join(output,'paint-test','control'),painted=join(output,'paint-test','painted');
  const artTrial=join(output,'paint-1','rook-p2-candidate.glb');
  const artTrialHash=existsSync(artTrial)?sha(readFileSync(artTrial)):null;
  const build=(directory,extra=[])=>execFileSync(blender,['-b','--python-exit-code','1',
    '--python',script,'--','--root',root,'--stage','candidate','--output-dir',
    rel(directory),...extra],{cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  build(control);
  build(painted,['--face-paint',source,'--face-paint-sha256',sourceHash,
    '--paint-calibration',calibration]);
  const plain=rgbaPng(readFileSync(join(control,'rook-p2-basecolor.png')));
  const colored=rgbaPng(readFileSync(join(painted,'rook-p2-basecolor.png')));
  assert.deepEqual([plain.width,plain.height,colored.width,colored.height],[1024,1024,1024,1024]);
  let changedFace=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const at=(y*1024+x)*4;
    for(let channel=0;channel<4;channel++){
      if(plain.pixels[at+channel]===colored.pixels[at+channel])continue;
      assert.ok(x>=16&&x<=244&&y>=16&&y<=244,
        `paint changed pixel outside calibrated face chart at ${x},${y}`);
      changedFace++;
    }
  }
  assert.ok(changedFace>1000,`selected source paints substantive distinct facial texels: ${changedFace}`);
  const manifest=JSON.parse(readFileSync(join(painted,'candidate-manifest.json'),'utf8'));
  const face=manifest.paint?.face;
  assert.ok(face,'painted candidate records face provenance');
  assert.equal(face.sourcePath,source);assert.equal(face.sourceSha256,sourceHash);
  assert.equal(face.calibrationPath,calibration);
  assert.equal(face.calibrationSha256,fileHash(calibration));
  assert.deepEqual(face.targetChartBoundsPx,[16,16,244,244]);
  assert.equal(face.method,'piecewise-linear-landmark-bake');
  assert.equal(face.basecolorSha256,sha(readFileSync(join(painted,'rook-p2-basecolor.png'))));
  const embedded=embeddedBasecolor(readGlb(join(painted,'rook-p2-candidate.glb')));
  assert.ok(embedded.pixels.equals(colored.pixels),'actual painted GLB embeds exact authored basecolor pixels');
  for(const [path,expected] of Object.entries(frozen))assert.equal(fileHash(path),expected,
    `${path}: paint trial leaves runtime crew and baseline generator byte-identical`);
  assert.equal(existsSync(artTrial)?sha(readFileSync(artTrial)):null,artTrialHash,
    'synthetic acceptance never rewrites the reviewed paint-1 art trial');
});

test('optional garment paint rejects missing or unsafe input and invalid panel calibration before Blender', () => {
  const {source,sourceHash,calibration,config}=garmentFixture();
  const base=['--root',root,'--stage','candidate','--output-dir',
    'art-build/crew/rook-p2/garment-test/painted','--garment-paint',source];
  const run=extra=>spawnSync('python',[script,...base,...extra,'--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10000});
  const valid=run(['--garment-paint-sha256',sourceHash,'--garment-calibration',calibration]);
  assert.equal(valid.status,0,valid.stderr||valid.stdout);
  assert.equal(JSON.parse(valid.stdout).glb[0],join(output,'garment-test','painted',outputNames.glb));
  for(const bad of [[],['--garment-paint-sha256','0'.repeat(64)],
    ['--garment-paint-sha256',sourceHash,'--garment-calibration','../outside.json']])
    assert.notEqual(run(bad).status,0,'missing/wrong hash or unsafe calibration rejected');
  const unsafe=spawnSync('python',[script,'--root',root,'--stage','candidate',
    '--output-dir','art-build/crew/rook-p2/garment-test/painted',
    '--garment-paint','public/assets/reference/wasteland-crew-1.png',
    '--garment-paint-sha256',sourceHash,'--paths-only'],
  {cwd:root,encoding:'utf8',timeout:10000});
  assert.notEqual(unsafe.status,0,'runtime/public input is rejected');
  const fixtureDir=join(output,'garment-test','inputs');
  const invalids=[
    ['malformed.json','{'],
    ['bad-region.json',JSON.stringify({...config,source:{...config.source,
      regions:{...config.source.regions,shirt:[504,8,8,504]}}})],
    ['overlapping-panels.json',JSON.stringify({...config,targets:{...config.targets,
      trousers:{source:'trousers',panels:[[780,276,878,488],[870,276,992,488]]}}})],
    ['wrong-source.json',JSON.stringify({...config,source:{...config.source,sha256:'0'.repeat(64)}})],
  ];
  for(const [name,contents] of invalids){
    const path=join(fixtureDir,name);writeFileSync(path,contents);
    assert.notEqual(run(['--garment-paint-sha256',sourceHash,'--garment-calibration',rel(path)]).status,0,
      `${name}: invalid garment source/calibration rejected before build`);
  }
  const defaultPlan=spawnSync('python',[script,'--root',root,'--stage','candidate','--paths-only'],
    {cwd:root,encoding:'utf8',timeout:10000});
  assert.equal(defaultPlan.status,0,defaultPlan.stderr||defaultPlan.stdout);
  assert.equal(JSON.parse(defaultPlan.stdout).glb[0],join(output,outputNames.glb),
    'omitted garment input retains default structural build path');
});

test('optional garment source paints only its calibrated roles and embeds exact atlas bytes', () => {
  const garment=garmentFixture(),face=paintFixture();
  const sourceBytes=readFileSync(join(root,garment.source));
  const sourcePixels=rgbaPng(sourceBytes);
  assert.ok(sourcePixels.pixels.some((value,index)=>index%4===3&&value<255),
    'fixture exercises source alpha below fully opaque');
  const frozen=Object.fromEntries([...crew.map(id=>`public/assets/models/wasteland/crew/${id}.glb`),
    'tools/blender/crew-fighters.py'].map(path=>[path,fileHash(path)]));
  const reviewed=['paint-1','paint-2','paint-3','paint-4'].map(name=>
    join(output,name,outputNames.glb));
  const reviewedHashes=reviewed.map(path=>existsSync(path)?sha(readFileSync(path)):null);
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const control=join(output,'garment-test','control'),painted=join(output,'garment-test','painted');
  const faceArgs=['--face-paint',face.source,'--face-paint-sha256',face.sourceHash,
    '--paint-calibration',face.calibration];
  const build=(directory,extra=[])=>execFileSync(blender,['-b','--python-exit-code','1',
    '--python',script,'--','--root',root,'--stage','candidate','--output-dir',
    rel(directory),...faceArgs,...extra],{cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  build(control);
  build(painted,['--garment-paint',garment.source,
    '--garment-paint-sha256',garment.sourceHash,'--garment-calibration',garment.calibration]);
  const plain=rgbaPng(readFileSync(join(control,outputNames.basecolor)));
  const colored=rgbaPng(readFileSync(join(painted,outputNames.basecolor)));
  assert.deepEqual([plain.width,plain.height,colored.width,colored.height],[1024,1024,1024,1024]);
  for(let index=3;index<colored.pixels.length;index+=4)
    assert.equal(colored.pixels[index],255,'painted garment atlas remains fully opaque');
  assert.equal(sha(readFileSync(join(root,garment.source))),garment.sourceHash,
    'paint bake keeps the reviewed input bytes unchanged');
  const manifest=JSON.parse(readFileSync(join(painted,outputNames.manifest),'utf8'));
  const charts=new Map(manifest.asset.charts.map(chart=>[chart.role,chart.boundsPx]));
  const roles=Object.keys(garment.config.targets);
  let changed=0;const perRole=new Map(roles.map(role=>[role,0]));
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const at=(y*1024+x)*4;
    if(plain.pixels.subarray(at,at+4).equals(colored.pixels.subarray(at,at+4)))continue;
    const owner=roles.find(role=>{
      const [x0,y0,x1,y1]=charts.get(role)||[];
      return x>=x0&&x<=x1&&y>=y0&&y<=y1;
    });
    assert.ok(owner,`garment source changed pixel outside owned chart, including face/hair: ${x},${y}`);
    changed++;perRole.set(owner,perRole.get(owner)+1);
  }
  assert.ok(changed>3000,`garment source creates substantive albedo detail: ${changed} pixels`);
  for(const role of roles)assert.ok(perRole.get(role)>20,
    `${role} visibly receives calibrated source pixels: ${perRole.get(role)}`);
  for(const name of [outputNames.surface,outputNames.normal])
    assert.equal(sha(readFileSync(join(control,name))),sha(readFileSync(join(painted,name))),
      `${name}: garment paint changes albedo only`);
  const provenance=manifest.paint?.garments;
  assert.ok(provenance,'painted export records garment input provenance');
  assert.equal(provenance.sourcePath,garment.source);
  assert.equal(provenance.sourceSha256,garment.sourceHash);
  assert.equal(provenance.calibrationPath,garment.calibration);
  assert.equal(provenance.calibrationSha256,fileHash(garment.calibration));
  assert.equal(provenance.basecolorSha256,sha(readFileSync(join(painted,outputNames.basecolor))));
  assert.equal(provenance.method,'quadrant-panel-bake');
  assert.deepEqual(provenance.roles,Object.fromEntries(Object.entries(garment.config.targets)
    .map(([role,target])=>[role,target.source])),
  'manifest records each painted target role and exact source swatch');
  const embedded=embeddedBasecolor(readGlb(join(painted,outputNames.glb)));
  assert.ok(embedded.pixels.equals(colored.pixels),'actual candidate GLB embeds exact garment-painted atlas');
  for(const [path,expected] of Object.entries(frozen))assert.equal(fileHash(path),expected,
    `${path}: optional paint cannot change runtime crew or baseline generator`);
  for(let i=0;i<reviewed.length;i++)assert.equal(
    existsSync(reviewed[i])?sha(readFileSync(reviewed[i])):null,reviewedHashes[i],
    `${reviewed[i]}: synthetic test leaves reviewed art trial unchanged`);
});

test('candidate rebuild exports bounded skinned near/far Rook, painted atlas and twelve deforming clips without altering crew', async () => {
  const frozen = Object.fromEntries([...crew.map(id=>`public/assets/models/wasteland/crew/${id}.glb`),
    'tools/blender/crew-fighters.py'].map(path=>[path,fileHash(path)]));
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  execFileSync(blender,['-b','--python-exit-code','1','--python',script,'--',
    '--root',root,'--stage','candidate'],{cwd:root,timeout:300_000,maxBuffer:20*1024*1024});
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  assert.equal(manifest.stage,'candidate');
  assert.equal(manifest.sourceSha256,fileHash('tools/blender/rook-p2-source.json'));
  assert.equal(manifest.landmarksSha256,fileHash('tools/blender/rook-p2-landmarks.json'));
  assert.equal(manifest.referenceSha256,fileHash('public/assets/reference/wasteland-crew-1.png'));
  assert.equal(manifest.animationDonor.path,'public/assets/models/wasteland/crew/rook.glb');
  assert.equal(manifest.animationDonor.sha256,frozen[manifest.animationDonor.path]);
  assert.deepEqual([...manifest.animationDonor.clipNames].sort(),[...clips].sort());
  const candidatePath=join(output,outputNames.glb);
  assert.equal(manifest.outputs.glb,rel(candidatePath));
  assert.equal(manifest.asset.sha256,sha(readFileSync(candidatePath)));
  const {bytes,json}=readGlb(candidatePath);
  for(const resource of [...(json.images||[]),...(json.buffers||[])])
    assert.ok(!resource.uri||resource.uri.startsWith('data:'),'candidate has no external resource');
  assert.equal(json.materials.length,1,'one shared near/far painted material');
  assert.ok(json.images.length>=2&&json.images.length<=3,'one basecolor/surface atlas set');
  for(const image of json.images){
    assert.equal(image.mimeType,'image/png');
    const view=json.bufferViews[image.bufferView],png=bytes.subarray(
      20+bytes.readUInt32LE(12)+8+(view.byteOffset||0),
      20+bytes.readUInt32LE(12)+8+(view.byteOffset||0)+view.byteLength);
    assert.equal(png.readUInt32BE(16),1024);assert.equal(png.readUInt32BE(20),1024);
  }
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const skins=[];asset.scene.traverse(node=>{if(node.isSkinnedMesh)skins.push(node);});
  assert.deepEqual(skins.map(node=>node.name).sort(),['rook-far','rook-near']);
  assert.deepEqual(skins.map(node=>node.userData.lod).sort(),['far','near']);
  for(const mesh of skins){
    const limit=mesh.userData.lod==='near'?8000:2000;
    const geometry=mesh.geometry,triangles=(geometry.index?.count??geometry.attributes.position.count)/3;
    assert.ok(triangles>500&&triangles<=limit,`${mesh.name}: meaningful exported triangle budget ${triangles}`);
    assert.equal(mesh.material.name,skins[0].material.name,'near and far share material family');
    assert.ok(mesh.skeleton?.bones.length>5,`${mesh.name}: bound skeleton`);
    const weights=geometry.attributes.skinWeight,indices=geometry.attributes.skinIndex,uv=geometry.attributes.uv;
    assert.ok(weights&&indices&&uv,`${mesh.name}: skin weights and exported TEXCOORD_0`);
    let goodUvArea=0,totalArea=0;
    const position=geometry.attributes.position;
    const at=corner=>geometry.index?geometry.index.getX(corner):corner;
    for(let face=0;face<triangles;face++){
      const ids=[at(face*3),at(face*3+1),at(face*3+2)];
      const p=ids.map(id=>new THREE.Vector3().fromBufferAttribute(position,id));
      const surface=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0])).length()/2;
      const u=ids.map(id=>[uv.getX(id),uv.getY(id)]);
      const mapped=Math.abs((u[1][0]-u[0][0])*(u[2][1]-u[0][1])-
        (u[1][1]-u[0][1])*(u[2][0]-u[0][0]))/2;
      totalArea+=surface;if(mapped>1e-8)goodUvArea+=surface;
    }
    assert.ok(goodUvArea/totalArea>.9,`${mesh.name}: visible surface has useful noncollapsed UV area`);
    for(let i=0;i<weights.count;i++){
      const sum=weights.getX(i)+weights.getY(i)+weights.getZ(i)+weights.getW(i);
      assert.ok(Math.abs(sum-1)<.001&&[weights.getX(i),weights.getY(i),weights.getZ(i),weights.getW(i)]
        .every(value=>value>=0),`${mesh.name}: normalized nonnegative four-joint weights`);
    }
  }
  assert.deepEqual(asset.animations.map(clip=>clip.name).sort(),[...clips].sort());
  const near=skins.find(mesh=>mesh.userData.lod==='near');
  for(const clip of asset.animations){
    const mixer=new THREE.AnimationMixer(asset.scene);mixer.clipAction(clip).play();
    const sample=t=>{mixer.setTime(t);asset.scene.updateMatrixWorld(true);near.skeleton.update();
      return Array.from({length:20},(_,i)=>near.getVertexPosition(Math.floor(i*(near.geometry.attributes.position.count-1)/19),new THREE.Vector3()).toArray()).flat();};
    const first=sample(0);
    assert.ok([.23,.61].some(f=>sample(clip.duration*f).some((v,i)=>Math.abs(v-first[i])>.001)),
      `${clip.name}: bound near skin really deforms`);
    mixer.stopAllAction();mixer.uncacheRoot(asset.scene);
  }
  assert.deepEqual(manifest.asset.textureSize,[1024,1024]);
  assert.equal(manifest.asset.uvChannel,'UV0');
  const charts=manifest.asset.charts;
  assert.ok(Array.isArray(charts)&&charts.length>=8,'separate authored garment/face UV charts');
  for(const chart of charts){
    const [x0,y0,x1,y1]=chart.boundsPx;
    assert.ok(x0>=8&&y0>=8&&x1<=1016&&y1<=1016&&x1>x0&&y1>y0);
    assert.ok(chart.areaPx>0&&Array.isArray(chart.seams),`${chart.role}: chart area and seam record`);
  }
  for(let i=0;i<charts.length;i++)for(let j=i+1;j<charts.length;j++){
    const a=charts[i].boundsPx,b=charts[j].boundsPx;
    const gap=Math.max(b[0]-a[2],a[0]-b[2],b[1]-a[3],a[1]-b[3]);
    assert.ok(gap>=16,`${charts[i].role}/${charts[j].role}: 16px between chart interiors`);
  }
  for(const [path,expected] of Object.entries(frozen))assert.equal(fileHash(path),expected,`${path}: baseline bytes preserved`);
});

test('actual near trousers use two broad sewn UV panels with sixteen pixels between interiors', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const mesh=asset.scene.getObjectByName('rook-near'),geo=mesh.geometry,uv=geo.attributes.uv;
  assert.ok(mesh?.isSkinnedMesh&&uv,'inspect actual near trouser UVs');
  const chart=[772,268,1000,496],panels=[[780,276,878,488],[894,276,992,488]];
  assert.equal(panels[1][0]-panels[0][2],16,'two panel interiors have 16-pixel bleed room');
  const ranges=panels.map(()=>({count:0,uMin:Infinity,uMax:-Infinity,vMin:Infinity,
    vMax:-Infinity,triangles:[]}));
  let trouserTriangles=0,unplaced=0;
  for(let corner=0;corner<(geo.index?.count??geo.attributes.position.count);corner+=3){
    const ids=[0,1,2].map(offset=>geo.index?geo.index.getX(corner+offset):corner+offset);
    const u=ids.map(id=>uv.getX(id)*1024),v=ids.map(id=>uv.getY(id)*1024);
    const centerU=u.reduce((a,b)=>a+b,0)/3,centerV=v.reduce((a,b)=>a+b,0)/3;
    if(centerU<chart[0]||centerU>chart[2]||centerV<chart[1]||centerV>chart[3])continue;
    trouserTriangles++;
    const panel=panels.findIndex(([x0,y0,x1,y1])=>u.every(x=>x>=x0&&x<=x1)&&
      v.every(y=>y>=y0&&y<=y1));
    if(panel<0){unplaced++;continue;}
    const range=ranges[panel];range.count++;
    range.triangles.push(ids.map((_,index)=>[u[index],v[index]]));
    range.uMin=Math.min(range.uMin,...u);range.uMax=Math.max(range.uMax,...u);
    range.vMin=Math.min(range.vMin,...v);range.vMax=Math.max(range.vMax,...v);
  }
  assert.ok(trouserTriangles>=200,'substantive exported trouser geometry inspected');
  assert.ok(unplaced/trouserTriangles<.01,
    `trouser UV faces belong to one of two sewn panel interiors: ${unplaced}/${trouserTriangles} unplaced`);
  for(const [index,range] of ranges.entries())assert.ok(range.count>50&&
    range.uMax-range.uMin>75&&range.vMax-range.vMin>170,
  `trouser panel ${index} carries broad continuous leg/crotch UV area: ${range.count} faces, U ${range.uMin.toFixed(1)}..${range.uMax.toFixed(1)}, V ${range.vMin.toFixed(1)}..${range.vMax.toFixed(1)}`);
  for(const [index,range] of ranges.entries()){
    const parent=range.triangles.map((_,i)=>i),find=i=>{
      while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;
    };
    const edges=new Map(),key=vertex=>vertex.map(value=>Math.round(value*100)).join(':');
    for(const [triangleIndex,vertices] of range.triangles.entries())
      for(const [a,b] of [[0,1],[1,2],[2,0]]){
        const edge=[key(vertices[a]),key(vertices[b])].sort().join('/');
        if(edges.has(edge))parent[find(triangleIndex)]=find(edges.get(edge));
        else edges.set(edge,triangleIndex);
      }
    const sizes=new Map();for(let i=0;i<parent.length;i++){
      const group=find(i);sizes.set(group,(sizes.get(group)||0)+1);
    }
    const biggest=Math.max(...sizes.values());
    assert.ok(biggest/range.count>.95,
      `trouser panel ${index} keeps front/back leg columns joined through the crotch in UV space: largest component ${biggest}/${range.count}`);
  }
});

test('actual exported aim keeps vest, pockets, pack and straps bound to torso', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near');
  assert.ok(near?.isSkinnedMesh,'inspect exported skinned near mesh');
  const aim=asset.animations.find(clip=>clip.name==='aim');
  assert.ok(aim&&aim.duration>0,'sample exported aim clip');
  const roles=['vest-left','vest-right','pockets','pack','straps'];
  const charts=manifest.asset.charts.filter(chart=>roles.includes(chart.role));
  assert.deepEqual(charts.map(chart=>chart.role).sort(),roles.sort());
  const geo=near.geometry,uv=geo.attributes.uv,skinIndex=geo.attributes.skinIndex,
    skinWeight=geo.attributes.skinWeight;
  const at=corner=>geo.index?geo.index.getX(corner):corner;
  const owned=new Map(roles.map(role=>[role,new Set()]));
  for(let corner=0;corner<(geo.index?.count??geo.attributes.position.count);corner+=3){
    const ids=[at(corner),at(corner+1),at(corner+2)];
    const x=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3;
    const y=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
    const chart=charts.find(({boundsPx:[x0,y0,x1,y1]})=>x>=x0&&x<=x1&&y>=y0&&y<=y1);
    if(chart)for(const id of ids)owned.get(chart.role).add(id);
  }
  const mixer=new THREE.AnimationMixer(asset.scene);mixer.clipAction(aim).play();
  const sample=t=>{mixer.setTime(t);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    return new Map([...owned].map(([role,ids])=>[role,new Map([...ids].map(id=>
      [id,near.getVertexPosition(id,new THREE.Vector3()).clone()]))]));};
  const neutral=sample(0),posed=sample(aim.duration*.5);
  for(const role of roles){
    const ids=owned.get(role);assert.ok(ids.size>=12,`${role}: substantial exported garment geometry`);
    let armWeight=0,maxMove=0;
    for(const id of ids){
      for(let slot=0;slot<4;slot++){
        const bone=near.skeleton.bones[skinIndex.getComponent(id,slot)];
        if(/^(hand|forearm|upper_arm)\.?[LR]$/.test(bone?.name||''))
          armWeight=Math.max(armWeight,skinWeight.getComponent(id,slot));
      }
      maxMove=Math.max(maxMove,neutral.get(role).get(id).distanceTo(posed.get(role).get(id)));
    }
    assert.ok(armWeight<.05,`${role}: torso garment assigned to arm bone (max weight ${armWeight.toFixed(3)})`);
    assert.ok(maxMove<.30,`${role}: aim stretches torso garment ${maxMove.toFixed(3)}m`);
  }
});

test('actual exported aim does not tear connected jacket armhole edges', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near');
  assert.ok(near?.isSkinnedMesh,'inspect actual exported skinned near mesh');
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const jacket=source.meshes.find(mesh=>mesh.name==='rook-near-jacket');
  assert.ok(jacket,'authored connected jacket source');
  const position=near.geometry.attributes.position;
  const exported=src=>new THREE.Vector3(src[0],src[2],-src[1]);
  const nearest=src=>{
    const target=exported(src);let best=-1,distance=Infinity;
    for(let i=0;i<position.count;i++){
      const d=target.distanceToSquared(new THREE.Vector3().fromBufferAttribute(position,i));
      if(d<distance){distance=d;best=i;}
    }
    assert.ok(distance<1e-6,`source jacket armhole vertex survives export: ${distance}`);
    return best;
  };
  const edges=[[559,561],[558,560],[163,169]];
  const pairs=edges.map(([a,b])=>[nearest(jacket.vertices[a]),nearest(jacket.vertices[b])]);
  const mixer=new THREE.AnimationMixer(asset.scene);
  mixer.clipAction(asset.animations.find(clip=>clip.name==='aim')).play();
  mixer.setTime(0);asset.scene.updateMatrixWorld(true);near.skeleton.update();
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const jacketChart=manifest.asset.charts.find(chart=>chart.role==='jacket').boundsPx;
  const uv=near.geometry.attributes.uv,skinIndex=near.geometry.attributes.skinIndex,
    skinWeight=near.geometry.attributes.skinWeight;
  let sleeveMove=0,lowerCuffMove=0,lowerCuffVertices=0;
  for(let id=0;id<position.count;id++){
    const x=uv.getX(id)*1024,y=uv.getY(id)*1024;
    if(x<jacketChart[0]||x>jacketChart[2]||y<jacketChart[1]||y>jacketChart[3])continue;
    const arm=[0,1,2,3].some(slot=>
      /^(hand|forearm|upper_arm)\.?[LR]$/.test(near.skeleton.bones[skinIndex.getComponent(id,slot)]?.name||'')&&
      skinWeight.getComponent(id,slot)>.5);
    if(!arm)continue;
    const motion=new THREE.Vector3().fromBufferAttribute(position,id).distanceTo(
      near.getVertexPosition(id,new THREE.Vector3()));
    sleeveMove=Math.max(sleeveMove,motion);
    if(position.getY(id)>=1.04&&position.getY(id)<=1.12&&Math.abs(position.getX(id))>.23){
      lowerCuffVertices++;lowerCuffMove=Math.max(lowerCuffMove,motion);
    }
  }
  assert.ok(sleeveMove>.05,`aim must still move jacket sleeves: ${sleeveMove.toFixed(3)}m`);
  assert.ok(lowerCuffVertices>=8&&lowerCuffMove>.05,
    `aim must still move real lower sleeve/cuff fabric: ${lowerCuffVertices} vertices, ${lowerCuffMove.toFixed(3)}m`);
  for(let e=0;e<pairs.length;e++){
    const [a,b]=pairs[e];
    const rest=new THREE.Vector3().fromBufferAttribute(position,a).distanceTo(
      new THREE.Vector3().fromBufferAttribute(position,b));
    const posed=near.getVertexPosition(a,new THREE.Vector3()).distanceTo(
      near.getVertexPosition(b,new THREE.Vector3()));
    assert.ok(rest>.003&&rest<.03,`edge ${e}: short real connected armhole edge`);
    assert.ok(posed/rest<3,`edge ${e}: jacket seam tears ${rest.toFixed(3)}m to ${posed.toFixed(3)}m (${(posed/rest).toFixed(1)}x) at aim start`);
  }
});

test('actual exported aim and get-up do not pull trouser seams onto hand bones', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const mesh=asset.scene.getObjectByName('rook-near'),geo=mesh.geometry;
  assert.ok(mesh?.isSkinnedMesh,'measure actual exported candidate');
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const trousers=source.meshes.find(part=>part.name==='rook-near-trousers');
  assert.ok(trousers.faces.some(face=>face.includes(719)&&face.includes(689)),
    'measured short seam is an actual authored trouser edge');
  const position=geo.attributes.position;
  const nearest=id=>{
    const [x,y,z]=trousers.vertices[id];let index=-1,distance=Infinity;
    for(let vertex=0;vertex<position.count;vertex++){
      const d=Math.hypot(position.getX(vertex)-x,position.getY(vertex)-z,
        position.getZ(vertex)+y);
      if(d<distance){distance=d;index=vertex;}
    }
    assert.ok(distance<.0001,`trouser source vertex ${id} survives GLB export`);
    return index;
  };
  const a=nearest(719),b=nearest(689),rest=new THREE.Vector3().fromBufferAttribute(position,a)
    .distanceTo(new THREE.Vector3().fromBufferAttribute(position,b));
  assert.ok(rest>.005&&rest<.02,'connected trouser seam is a short real edge');
  const chart=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts
    .find(item=>item.role==='trousers').boundsPx;
  const uv=geo.attributes.uv,skinIndex=geo.attributes.skinIndex,skinWeight=geo.attributes.skinWeight;
  const trouserVertices=new Set(),at=corner=>geo.index?geo.index.getX(corner):corner;
  for(let corner=0;corner<(geo.index?.count??position.count);corner+=3){
    const ids=[at(corner),at(corner+1),at(corner+2)];
    const u=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3;
    const v=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
    if(u>=chart[0]&&u<=chart[2]&&v>=chart[1]&&v<=chart[3])
      for(const id of ids)trouserVertices.add(id);
  }
  assert.ok(trouserVertices.size>200,'inspect substantive exported trouser geometry');
  let wrongArm=0;
  for(const id of trouserVertices)for(let slot=0;slot<4;slot++){
    const bone=mesh.skeleton.bones[skinIndex.getComponent(id,slot)];
    if(/^(hand|forearm|upper_arm)[LR]$/.test(bone?.name||''))
      wrongArm=Math.max(wrongArm,skinWeight.getComponent(id,slot));
  }
  for(const [name,time] of [['aim',0],['get-up',.6]]){
    const clip=asset.animations.find(item=>item.name===name),mixer=new THREE.AnimationMixer(asset.scene);
    assert.ok(clip?.duration>=time,`${name} clip exists and covers actual browser sample`);
    mixer.clipAction(clip).play();mixer.setTime(time);
    asset.scene.updateMatrixWorld(true);mesh.skeleton.update();
    if(name==='get-up'){
      let legMotion=0;
      for(const id of trouserVertices)legMotion=Math.max(legMotion,
        new THREE.Vector3().fromBufferAttribute(position,id).distanceTo(
          mesh.getVertexPosition(id,new THREE.Vector3())));
      assert.ok(legMotion>.05,`get-up still moves trouser legs: ${legMotion.toFixed(3)}m`);
    }
    const posed=mesh.getVertexPosition(a,new THREE.Vector3()).distanceTo(
      mesh.getVertexPosition(b,new THREE.Vector3()));
    assert.ok(posed/rest<3,`${name} stretches trouser edge ${rest.toFixed(3)}m to ${posed.toFixed(3)}m (${(posed/rest).toFixed(1)}x)`);
    mixer.stopAllAction();mixer.uncacheRoot(asset.scene);
  }
  assert.ok(wrongArm<.01,`trouser geometry must not bind to arm or hand bones: ${wrongArm.toFixed(3)}`);
});

test('actual exported jacket hem remains joined to trouser waist in aim and get-up', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const mesh=asset.scene.getObjectByName('rook-near'),position=mesh.geometry.attributes.position;
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const jacket=source.meshes.find(part=>part.name==='rook-near-jacket').vertices;
  const trousers=source.meshes.find(part=>part.name==='rook-near-trousers').vertices;
  const nearest=point=>{
    const [x,y,z]=point;let found=-1,distance=Infinity;
    for(let id=0;id<position.count;id++){
      const d=Math.hypot(position.getX(id)-x,position.getY(id)-z,position.getZ(id)+y);
      if(d<distance){distance=d;found=id;}
    }
    assert.ok(distance<.0001,'authored waist vertex survives GLB export');
    return found;
  };
  const pairs=[];
  for(const [j,p] of jacket.entries())if(p[2]<1.058){
    let t=-1,distance=Infinity;
    for(const [i,q] of trousers.entries())if(q[2]>1.000){
      const d=Math.hypot(p[0]-q[0],p[1]-q[1]);
      if(d<distance){distance=d;t=i;}
    }
    if(distance<.055)pairs.push({j,t,a:nearest(p),b:nearest(trousers[t])});
  }
  assert.ok(pairs.length>=50,'sample most of the actual jacket-hem/trouser-top ring');
  const pivot=pairs.find(pair=>pair.j===386&&pair.t===730);
  assert.ok(pivot,'reviewed right-side waist contact exists');
  for(const [name,time] of [['aim',0],['get-up',.6]]){
    const clip=asset.animations.find(item=>item.name===name),mixer=new THREE.AnimationMixer(asset.scene);
    mixer.clipAction(clip).play();mixer.setTime(time);
    asset.scene.updateMatrixWorld(true);mesh.skeleton.update();
    const gaps=pairs.map(pair=>mesh.getVertexPosition(pair.a,new THREE.Vector3()).distanceTo(
      mesh.getVertexPosition(pair.b,new THREE.Vector3()))).sort((a,b)=>a-b);
    const p90=gaps[Math.floor(gaps.length*.9)];
    const pivotGap=mesh.getVertexPosition(pivot.a,new THREE.Vector3()).distanceTo(
      mesh.getVertexPosition(pivot.b,new THREE.Vector3()));
    assert.ok(p90<.08&&pivotGap<.08,
      `${name} keeps jacket/trouser waist contact: p90 ${p90.toFixed(3)}m, right flank ${pivotGap.toFixed(3)}m`);
    mixer.stopAllAction();mixer.uncacheRoot(asset.scene);
  }
});

test('waist has a real overlapping torso and trouser surface around the pelvis', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const core=source.meshes.find(part=>part.name==='rook-near-body-core');
  const trousers=source.meshes.find(part=>part.name==='rook-near-trousers');
  assert.ok(core&&trousers,'measure the authored anatomical core and trousers');
  const directions=[[0,-1],[.707,-.707],[1,0],[0,1],[-1,0]];
  const hits=(part,height,[dx,dy])=>{
    const ray=new THREE.Ray(new THREE.Vector3(0,0,height),
      new THREE.Vector3(dx,dy,0).normalize());
    const distances=[];
    for(const face of part.faces)for(let i=1;i+1<face.length;i++){
      const [a,b,c]=[face[0],face[i],face[i+1]].map(id=>
        new THREE.Vector3(...part.vertices[id]));
      const point=ray.intersectTriangle(a,b,c,false,new THREE.Vector3());
      if(point)distances.push(point.distanceTo(ray.origin));
    }
    return distances.sort((a,b)=>a-b);
  };
  for(const height of [1.000,1.010])for(const [index,direction] of directions.entries()){
    const skin=hits(core,height,direction),cloth=hits(trousers,height,direction);
    assert.ok(skin.length&&cloth.length,
      `actual waist ray ${index} at ${height}m has overlapping anatomical core and trouser surfaces, not exposed background: core ${skin.length}, trousers ${cloth.length}`);
    assert.ok(skin[0]<cloth.at(-1)+.015,
      `waist ray ${index} keeps skin within trouser outer envelope`);
  }
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry;
  assert.ok(near?.isSkinnedMesh,'measure the actual exported candidate waist');
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const roles=new Map([['body-core','skin'],['trousers','trousers']].map(([role,chart])=>
    [role,charts.find(item=>item.role===chart)?.boundsPx]));
  assert.ok([...roles.values()].every(Boolean),'skin and trouser UV ownership is known');
  const positions=geo.attributes.position,uvs=geo.attributes.uv;
  const byRole=new Map([...roles.keys()].map(role=>[role,[]]));
  for(let corner=0;corner<(geo.index?.count??positions.count);corner+=3){
    const ids=[0,1,2].map(offset=>geo.index?geo.index.getX(corner+offset):corner+offset);
    const u=ids.reduce((sum,id)=>sum+uvs.getX(id)*1024,0)/3;
    const v=ids.reduce((sum,id)=>sum+uvs.getY(id)*1024,0)/3;
    for(const [role,[left,top,right,bottom]] of roles){
      if(u>=left&&u<=right&&v>=top&&v<=bottom)
        byRole.get(role).push(ids.map(id=>new THREE.Vector3().fromBufferAttribute(positions,id)));
    }
  }
  const exportedHits=(role,height,[dx,dy])=>{
    const ray=new THREE.Ray(new THREE.Vector3(0,height,0),
      new THREE.Vector3(dx,0,-dy).normalize());
    return byRole.get(role).map(([a,b,c])=>ray.intersectTriangle(a,b,c,false,new THREE.Vector3()))
      .filter(Boolean).map(point=>point.distanceTo(ray.origin));
  };
  for(const height of [1.000,1.010])for(const [index,direction] of directions.entries()){
    const skin=exportedHits('body-core',height,direction);
    const cloth=exportedHits('trousers',height,direction);
    assert.ok(skin.length&&cloth.length,
      `exported waist ray ${index} at ${height}m contains both core and trousers: ${skin.length}/${cloth.length}`);
  }
});

test('connected Rook hair covers the sampled frontal scalp and traced hairline in source and export', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const triangles=[];
  for(const part of source.meshes.filter(part=>part.lod==='near'&&
    (part.role==='body-core'||part.role.startsWith('hair')))){
    for(const face of part.faces)for(let corner=1;corner+1<face.length;corner++)
      triangles.push({role:part.role==='body-core'?'scalp':'hair',
        points:[face[0],face[corner],face[corner+1]].map(id=>part.vertices[id])});
  }
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,uv=geo.attributes.uv,
    position=geo.attributes.position;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const hairChart=charts.find(item=>item.role==='hair').boundsPx;
  const faceChart=charts.find(item=>item.role==='face').boundsPx;
  const at=corner=>geo.index?geo.index.getX(corner):corner;
  const exported=[];
  for(let corner=0;corner<(geo.index?.count??position.count);corner+=3){
    const ids=[at(corner),at(corner+1),at(corner+2)];
    const u=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3;
    const v=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
    const inside=([x0,y0,x1,y1])=>u>=x0&&u<=x1&&v>=y0&&v<=y1;
    if(!inside(hairChart)&&!inside(faceChart))continue;
    exported.push({role:inside(hairChart)?'hair':'scalp',points:ids.map(id=>
      [position.getX(id),-position.getZ(id),position.getY(id)])});
  }
  const frontAt=(faces,height,x)=>{
    let front=Infinity;
    for(const {points} of faces){
      const cuts=[];
      for(const [a,b] of [[points[0],points[1]],[points[1],points[2]],[points[2],points[0]]]){
        if((a[2]-height)*(b[2]-height)>0||Math.abs(a[2]-b[2])<1e-8)continue;
        const t=(height-a[2])/(b[2]-a[2]);
        if(t>=0&&t<=1)cuts.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
      }
      if(cuts.length<2)continue;
      const [a,b]=cuts;
      if((a[0]-x)*(b[0]-x)>0||Math.abs(a[0]-b[0])<1e-8)continue;
      const t=(x-a[0])/(b[0]-a[0]);
      front=Math.min(front,a[1]+t*(b[1]-a[1]));
    }
    return front;
  };
  for(const [label,faces] of [['source',triangles],['exported GLB',exported]])
    for(const height of [1.766,1.82]){
      // Source skull intersections at 1.82m exist through ±.03m; at ±.04m
      // and ±.06m there is no scalp to cover. Keep five real rays at both heights.
      const probes=height===1.82?[-.03,-.015,0,.015,.03]:[-.06,-.03,0,.03,.06];
      let covered=0,center=false,scalpHits=0;
      const scalp=faces.filter(face=>face.role==='scalp');
      const hair=faces.filter(face=>face.role==='hair');
      for(const x of probes){
        const skinY=frontAt(scalp,height,x),hairY=frontAt(hair,height,x);
        if(Number.isFinite(skinY))scalpHits++;
        const contact=Number.isFinite(skinY)&&Number.isFinite(hairY)&&hairY<=skinY-.003;
        if(contact)covered++;
        if(x===0)center=contact;
      }
      assert.equal(scalpHits,5,`${label} at ${height}m: all five calibrated rays hit actual scalp`);
      assert.ok(center&&covered>=4,
        `${label} hair covers frontal scalp at ${height}m hairline/crown: ${covered}/5 probes, center ${center}`);
    }
  const hairMax=Math.max(...source.meshes.filter(part=>part.lod==='near'&&part.role.startsWith('hair'))
    .flatMap(part=>part.vertices.map(vertex=>vertex[2])));
  assert.ok(hairMax<=1.833,'hair crown stays within reference height calibration');
  assert.ok((geo.index?.count??position.count)/3<=8000,'coverage uses approved near triangle budget');
});

test('actual exported eye landmarks have enough unique face-atlas pixels for paint', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near');
  assert.ok(near?.isSkinnedMesh,'measure real exported eye UV coordinates');
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const core=source.meshes.find(mesh=>mesh.name==='rook-near-body-core');
  const chart=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts
    .find(item=>item.role==='face');
  const position=near.geometry.attributes.position,uv=near.geometry.attributes.uv;
  const landmarkU=id=>{
    const [x,y,z]=core.vertices[id];const found=[];
    for(let i=0;i<position.count;i++){
      const distance=Math.hypot(position.getX(i)-x,position.getY(i)-z,position.getZ(i)+y);
      const u=uv.getX(i)*1024,v=uv.getY(i)*1024;
      if(distance<.0001&&u>=chart.boundsPx[0]&&u<=chart.boundsPx[2]&&
        v>=chart.boundsPx[1]&&v<=chart.boundsPx[3])found.push(u);
    }
    assert.ok(found.length>0,`connected core eye landmark ${id} mapped in actual face chart`);
    assert.ok(Math.max(...found)-Math.min(...found)<2,`eye landmark ${id} has coherent UV`);
    return found.reduce((a,b)=>a+b,0)/found.length;
  };
  const left=landmarkU(214),right=landmarkU(222);
  assert.ok(right-left>=70,`eye landmarks have ${(right-left).toFixed(1)} atlas pixels; need 70 for independent eye paint`);
});

test('actual near face and asymmetric garment UV interiors do not reuse painted texels', async () => {
  const path=join(output,outputNames.glb);
  assert.ok(existsSync(path),'candidate GLB exists after its source build');
  const {bytes}=readGlb(path),manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near');
  assert.ok(near?.isSkinnedMesh,'test actual exported near skin, not chart metadata alone');
  const geometry=near.geometry,uv=geometry.attributes.uv;
  assert.ok(uv,'near skin has exported UVs');
  const charts=manifest.asset.charts.filter(chart=>['face','vest-left','vest-right','pockets'].includes(chart.role));
  assert.equal(charts.length,4,'face and visible asymmetric garment charts are unique');
  const at=corner=>geometry.index?geometry.index.getX(corner):corner;
  const summaries=new Map(charts.map(chart=>[chart.role,{covered:new Uint8Array(1024*1024),unique:0,overlap:0,triangles:0}]));
  const faces=(geometry.index?.count??uv.count)/3;
  for(let face=0;face<faces;face++){
    // glTF TEXCOORD_0 is already image-top origin after Blender export.
    const points=[0,1,2].map(k=>{const i=at(face*3+k);return [uv.getX(i)*1024,uv.getY(i)*1024];});
    const centroid=[(points[0][0]+points[1][0]+points[2][0])/3,
      (points[0][1]+points[1][1]+points[2][1])/3];
    const chart=charts.find(item=>{const [x0,y0,x1,y1]=item.boundsPx;
      return centroid[0]>=x0&&centroid[0]<=x1&&centroid[1]>=y0&&centroid[1]<=y1;});
    if(!chart)continue;
    const row=summaries.get(chart.role);row.triangles++;
    const [a,b,c]=points;
    const cross=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    if(Math.abs(cross)<1e-5)continue;
    const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(1023,Math.ceil(Math.max(a[0],b[0],c[0])));
    const minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(1023,Math.ceil(Math.max(a[1],b[1],c[1])));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
      const px=x+.5,py=y+.5;
      const w1=((px-a[0])*(c[1]-a[1])-(py-a[1])*(c[0]-a[0]))/cross;
      const w2=((b[0]-a[0])*(py-a[1])-(b[1]-a[1])*(px-a[0]))/cross;
      const w0=1-w1-w2;
      // Keep a gap from shared triangle edges; adjacent faces are not overlap.
      if(Math.min(w0,w1,w2)<.03)continue;
      const index=y*1024+x;
      if(row.covered[index]++)row.overlap++;
      else row.unique++;
    }
  }
  const failures=[];
  for(const [role,row] of summaries){
    assert.ok(row.triangles>0&&row.unique>100,`${role}: substantial exported UV chart`);
    const ratio=row.overlap/(row.unique+row.overlap);
    if(ratio>.005)failures.push(`${role} ${row.overlap}/${row.unique+row.overlap} (${(ratio*100).toFixed(1)}%)`);
  }
  assert.deepEqual(failures,[],`actual face/visible garment UV interiors overlap: ${failures.join('; ')}`);
});

test('actual near face unwrap is continuous and separate painted islands keep sixteen texels of bleed room', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteLength),'');
  const geometry=asset.scene.getObjectByName('rook-near')?.geometry;
  assert.ok(geometry?.attributes.uv,'measure the actual exported near UV islands');
  const uv=geometry.attributes.uv,index=geometry.index;
  const at=corner=>index?index.getX(corner):corner;
  const charts=manifest.asset.charts.filter(chart=>
    ['face','vest-left','vest-right','pockets','jacket','hair'].includes(chart.role));
  const facesByRole=new Map(charts.map(chart=>[chart.role,[]]));
  for(let face=0;face<(index?.count??uv.count)/3;face++){
    const points=[0,1,2].map(corner=>{const id=at(face*3+corner);
      return [uv.getX(id)*1024,uv.getY(id)*1024];});
    const x=points.reduce((sum,p)=>sum+p[0],0)/3,y=points.reduce((sum,p)=>sum+p[1],0)/3;
    const role=charts.find(chart=>{const [x0,y0,x1,y1]=chart.boundsPx;
      return x>=x0&&x<=x1&&y>=y0&&y<=y1;})?.role;
    if(role)facesByRole.get(role).push(points);
  }
  const failures=[];
  for(const [role,faces] of facesByRole){
    assert.ok(faces.length>10,`${role}: actual exported chart has faces; counts=${JSON.stringify(
      Object.fromEntries([...facesByRole].map(([name,rows])=>[name,rows.length])))}`);
    const parent=Int32Array.from({length:faces.length},(_,i)=>i);
    const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
    const edges=new Map();
    const key=p=>`${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    for(let face=0;face<faces.length;face++)for(let side=0;side<3;side++){
      const ends=[key(faces[face][side]),key(faces[face][(side+1)%3])].sort();
      const edge=ends.join('|');
      if(edges.has(edge))parent[find(face)]=find(edges.get(edge));
      else edges.set(edge,face);
    }
    const islands=new Map();
    for(let face=0;face<faces.length;face++){
      const id=find(face),bounds=islands.get(id)||[Infinity,Infinity,-Infinity,-Infinity];
      for(const [x,y] of faces[face]){
        bounds[0]=Math.min(bounds[0],x);bounds[1]=Math.min(bounds[1],y);
        bounds[2]=Math.max(bounds[2],x);bounds[3]=Math.max(bounds[3],y);
      }
      islands.set(id,bounds);
    }
    const boxes=[...islands.values()];
    if(role==='face'&&boxes.length!==1)failures.push(`face has ${boxes.length} disconnected UV islands`);
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
      const a=boxes[i],b=boxes[j];
      const dx=Math.max(0,b[0]-a[2],a[0]-b[2]);
      const dy=Math.max(0,b[1]-a[3],a[1]-b[3]);
      const gap=Math.hypot(dx,dy);
      if(gap<16)failures.push(`${role} islands ${i}/${j} only ${gap.toFixed(1)}px apart`);
    }
  }
  assert.ok(failures.length===0,
    `exported UV seams lack space for 8px bleed: ${failures.length} failures; ${failures.slice(0,8).join('; ')}`);
});
