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
    'sleeve-cuff':{source:'shirt'},
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
  assert.ok(perRole.get('sleeve-cuff')>20,
    'new rolled cloth cuff receives the reviewed blue-green shirt swatch in actual atlas pixels');
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

test('hair covers the visible crown as an area in front, both sides and back', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const parts=source.meshes.filter(part=>part.lod==='near'&&
    (part.role==='body-core'||part.role.startsWith('hair')));
  const triangles=[];
  for(const part of parts)for(const face of part.faces)for(let corner=1;corner+1<face.length;corner++)
    triangles.push({hair:part.role.startsWith('hair'),points:[face[0],face[corner],face[corner+1]]
      .map(id=>part.vertices[id])});
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,position=geo.attributes.position,
    uv=geo.attributes.uv;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const chart=name=>charts.find(item=>item.role===name).boundsPx;
  const inside=(pixel,bounds)=>pixel[0]>=bounds[0]&&pixel[0]<=bounds[2]&&
    pixel[1]>=bounds[1]&&pixel[1]<=bounds[3];
  const at=corner=>geo.index?geo.index.getX(corner):corner,exported=[];
  for(let corner=0;corner<(geo.index?.count??position.count);corner+=3){
    const ids=[at(corner),at(corner+1),at(corner+2)];
    const pixel=[ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3,
      ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3];
    const hair=inside(pixel,chart('hair'));
    if(!hair&&!inside(pixel,chart('face'))&&!inside(pixel,chart('skin')))continue;
    exported.push({hair,points:ids.map(id=>[position.getX(id),-position.getZ(id),position.getY(id)])});
  }
  // A projected triangle contributes to the nearest visible surface at each pixel.
  const sample=(triangle,axes,u,v)=>{
    const [a,b,c]=triangle.points.map(point=>[point[axes[0]],point[axes[1]],point[axes[2]]]);
    const determinant=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
    if(Math.abs(determinant)<1e-10)return null;
    const wa=((b[1]-c[1])*(u-c[0])+(c[0]-b[0])*(v-c[1]))/determinant;
    const wb=((c[1]-a[1])*(u-c[0])+(a[0]-c[0])*(v-c[1]))/determinant;
    const wc=1-wa-wb;
    return Math.min(wa,wb,wc)>=-1e-6?wa*a[2]+wb*b[2]+wc*c[2]:null;
  };
  const gaps=[];
  for(const [label,allFaces] of [['source',triangles],['exported GLB',exported]]){
    const faces=allFaces.filter(face=>Math.max(...face.points.map(point=>point[2]))>=1.775&&
      Math.min(...face.points.map(point=>point[2]))<=1.83);
    for(const view of [
    {name:'front',axes:[0,2,1],span:[-.075,.075],nearest:Math.min},
    {name:'back',axes:[0,2,1],span:[-.075,.075],nearest:Math.max},
    {name:'left side',axes:[1,2,0],span:[-.10,.10],nearest:Math.min},
    {name:'right side',axes:[1,2,0],span:[-.10,.10],nearest:Math.max},
    ]){
    let scalpPixels=0,covered=0;
    for(let row=0;row<17;row++)for(let column=0;column<25;column++){
      const u=view.span[0]+(view.span[1]-view.span[0])*(column+.5)/25;
      const z=1.775+.055*(row+.5)/17;
      const scalp=[],hair=[];
      for(const triangle of faces){
        const depth=sample(triangle,view.axes,u,z);
        if(depth!==null)(triangle.hair?hair:scalp).push(depth);
      }
      if(!scalp.length)continue;
      scalpPixels++;
      const nearestScalp=view.nearest(...scalp),nearestHair=hair.length?view.nearest(...hair):null;
      if(nearestHair!==null&&
        (view.nearest===Math.min?nearestHair<=nearestScalp-.003:nearestHair>=nearestScalp+.003))covered++;
    }
    assert.ok(scalpPixels>=40,`${label} ${view.name} projected sample reaches real crown surface`);
    if(covered/scalpPixels<.9)gaps.push(
      `${label} ${view.name} projected hair covers ${covered}/${scalpPixels} scalp pixels`);
    }
  }
  assert.deepEqual(gaps,[],`need 90% crown coverage in each view: ${gaps.join('; ')}`);
});

test('calibrated scalp paint darkens exported crown without changing eyes or beard', async () => {
  const face=paintFixture(),mask=face.config.target.scalpMask;
  assert.deepEqual(mask?.boundaryPx,[[16,200],[45,145],[75,86],[100,67],[130,66],
    [160,67],[185,86],[215,145],[244,200]],
  'reviewed hairline boundary is committed in the face calibration');
  assert.equal(mask.featherPx,2);
  assert.deepEqual(mask.sourceHairRegionPx,[350,20,900,140]);
  const directory=join(output,'scalp-test','inputs');mkdirSync(directory,{recursive:true});
  const bareCalibration=join(directory,'without-scalp-mask.json');
  const bare=structuredClone(face.config);delete bare.target.scalpMask;
  writeFileSync(bareCalibration,JSON.stringify(bare,null,2)+'\n');
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const build=(directory,calibration)=>execFileSync(blender,['-b','--python-exit-code','1',
    '--python',script,'--','--root',root,'--stage','candidate','--output-dir',rel(directory),
    '--face-paint',face.source,'--face-paint-sha256',face.sourceHash,
    '--paint-calibration',calibration],{cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  const control=join(output,'scalp-test','control'),painted=join(output,'scalp-test','painted');
  build(control,rel(bareCalibration));build(painted,face.calibration);
  const before=rgbaPng(readFileSync(join(control,outputNames.basecolor)));
  const after=rgbaPng(readFileSync(join(painted,outputNames.basecolor)));
  assert.deepEqual([before.width,before.height,after.width,after.height],[1024,1024,1024,1024]);
  const boundary=x=>{
    const points=mask.boundaryPx;
    for(let i=1;i<points.length;i++)if(x<=points[i][0]){
      const [x0,y0]=points[i-1],[x1,y1]=points[i];
      return y0+(y1-y0)*(x-x0)/(x1-x0);
    }
    return points.at(-1)[1];
  };
  let darkened=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const at=(y*1024+x)*4,old=before.pixels.subarray(at,at+4),fresh=after.pixels.subarray(at,at+4);
    if(x<16||x>244||y>boundary(x)+mask.featherPx+1)
      assert.ok(old.equals(fresh),`face feature or other chart changed outside scalp mask at ${x},${y}`);
    else if(y<boundary(x)-mask.featherPx&&fresh[0]<100&&fresh[1]<100&&fresh[2]<100&&
      !old.equals(fresh))darkened++;
  }
  assert.ok(darkened>1000,`real scalp mask paints substantive formerly tan area: ${darkened} pixels`);
  const asset=readGlb(join(painted,outputNames.glb));
  assert.ok(embeddedBasecolor(asset).pixels.equals(after.pixels),
    'candidate GLB embeds the exact scalp-painted atlas');
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const loaded=await loader.parseAsync(asset.bytes.buffer.slice(asset.bytes.byteOffset,
    asset.bytes.byteOffset+asset.bytes.byteLength),'');
  const near=loaded.scene.getObjectByName('rook-near'),position=near.geometry.attributes.position,
    uv=near.geometry.attributes.uv;
  let scalpSamples=0,darkSamples=0;
  for(let i=0;i<position.count;i++){
    const x=Math.floor(uv.getX(i)*1024),y=Math.floor(uv.getY(i)*1024);
    if(position.getY(i)<1.775||position.getY(i)>1.83||x<16||x>244||y<16||y>244)continue;
    const at=(y*1024+x)*4;scalpSamples++;
    if(after.pixels[at]<100&&after.pixels[at+1]<100&&after.pixels[at+2]<100)darkSamples++;
  }
  assert.ok(scalpSamples>=30,'actual exported head has enough upper scalp UV samples');
  assert.ok(darkSamples/scalpSamples>=.9,
    `actual exported crown samples dark hair color: ${darkSamples}/${scalpSamples}`);
});

test('optional hair-chart paint uses the hashed face input without changing face or garments', () => {
  const source=paintFixture(),option='--hair-paint-from-face';
  const chartPaint=source.config.target.hairChartPaint;
  assert.deepEqual(chartPaint,{chart:'hair',boundsPx:[16,772,496,1000],
    sourceRegionPx:[350,20,900,140],method:'bilinear-rgb'},
  'reviewed hair-chart mapping is committed in face calibration');
  const planArgs=['--root',root,'--stage','candidate','--output-dir',
    'art-build/crew/rook-p2/hair-test/rejected','--paths-only',option];
  const missing=spawnSync('python',[script,...planArgs],{cwd:root,encoding:'utf8',timeout:10000});
  assert.notEqual(missing.status,0,'hair-chart opt-in rejects absent face source and SHA before writing');
  assert.ok(!existsSync(join(output,'hair-test','rejected')),
    'rejected hair opt-in creates no output directory');
  const frozen=Object.fromEntries(crew.map(id=>{
    const path=`public/assets/models/wasteland/crew/${id}.glb`;return [path,fileHash(path)];
  }));
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const control=join(output,'hair-test','control'),painted=join(output,'hair-test','painted');
  const build=(directory,extra=[])=>execFileSync(blender,['-b','--python-exit-code','1',
    '--python',script,'--','--root',root,'--stage','candidate','--output-dir',rel(directory),
    '--face-paint',source.source,'--face-paint-sha256',source.sourceHash,
    '--paint-calibration',source.calibration,...extra],
  {cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  build(control);build(painted,[option]);
  const plain=rgbaPng(readFileSync(join(control,outputNames.basecolor)));
  const colored=rgbaPng(readFileSync(join(painted,outputNames.basecolor)));
  assert.deepEqual([plain.width,plain.height,colored.width,colored.height],[1024,1024,1024,1024]);
  let interiorChanged=0,bleedChanged=0;
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const at=(y*1024+x)*4,was=plain.pixels.subarray(at,at+4),now=colored.pixels.subarray(at,at+4);
    const padded=x>=8&&x<=504&&y>=764&&y<=1008;
    const interior=x>=16&&x<=496&&y>=772&&y<=1000;
    if(!padded)assert.ok(was.equals(now),
      `optional hair paint changed face, garment or unrelated atlas pixel ${x},${y}`);
    else if(!was.equals(now)){
      if(interior)interiorChanged++;else bleedChanged++;
    }
    assert.equal(colored.pixels[at+3],255,'hair paint atlas remains fully opaque');
  }
  assert.ok(interiorChanged>1000&&bleedChanged>100,
    `hashed source produces substantial hair chart and eight-pixel bleed: ${interiorChanged}/${bleedChanged}`);
  const manifest=JSON.parse(readFileSync(join(painted,outputNames.manifest),'utf8'));
  assert.deepEqual(manifest.asset.charts.find(item=>item.role==='hair').boundsPx,[16,772,496,1000]);
  assert.deepEqual(manifest.paint?.hair,{
    sourcePath:source.source,sourceSha256:source.sourceHash,
    calibrationPath:source.calibration,calibrationSha256:fileHash(source.calibration),
    sourceRegionPx:[350,20,900,140],chartBoundsPx:[16,772,496,1000],
    basecolorSha256:sha(readFileSync(join(painted,outputNames.basecolor))),
    method:'bilinear-rgb'},'hair opt-in records exact input and atlas provenance');
  assert.ok(embeddedBasecolor(readGlb(join(painted,outputNames.glb))).pixels.equals(colored.pixels),
    'actual candidate GLB embeds the opt-in hair-painted atlas');
  for(const [path,expected] of Object.entries(frozen))assert.equal(fileHash(path),expected,
    `${path}: optional hair paint cannot change runtime crew`);
});

test('scarf has a tapered upper-chest drape below separately layered jaw cloth', () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const named=new Map(source.meshes.filter(part=>part.lod==='near'&&part.role==='scarf')
    .map(part=>[part.name,part]));
  const wrap=named.get('rook-near-scarf-wrap'),middle=named.get('rook-near-scarf-middle-fold'),
    jaw=named.get('rook-near-scarf-jaw-fold'),back=named.get('rook-near-back-scarf');
  assert.ok(wrap&&middle&&jaw&&back,'four independently shaped scarf layers remain');
  const front=part=>part.vertices.filter(([x,y])=>Math.abs(x)<.065&&y<-.09);
  const tip=front(wrap).filter(([, ,z])=>z<1.39);
  assert.ok(tip.length>=3,
    'front scarf descends from neck onto upper chest with real cloth surface, not one hanging point');
  assert.ok(Math.min(...tip.map(([x])=>Math.abs(x)))<.018,
    'lower scarf point reaches the center of the chest');
  const upper=front(wrap).filter(([, ,z])=>z>1.46&&z<1.51);
  assert.ok(upper.length>=4&&Math.max(...upper.map(([x])=>Math.abs(x)))>.055,
    'upper wrap widens at shoulders before tapering to the chest');
  for(const [name,part,range] of [
    ['jaw',jaw,[1.52,1.61]],['middle',middle,[1.46,1.57]],['back',back,[1.38,1.57]],
  ])assert.ok(part.vertices.some(vertex=>vertex[2]>=range[0]&&vertex[2]<=range[1]),
    `${name} layer stays in its measured neck/shoulder band`);
  const triangles=part=>part.faces.reduce((count,face)=>count+face.length-2,0);
  assert.ok([wrap,middle,jaw,back].reduce((total,part)=>total+triangles(part),0)<=328,
    'layered scarf remains inside the reviewed 304+24 triangle allocation');
});

test('authored rolled sleeve cuffs bridge jacket to skin and follow both arm actions', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const cuffs=['left','right'].map(side=>source.meshes.find(part=>part.lod==='near'&&
    part.name===`rook-near-sleeve-cuff-${side}`));
  assert.ok(cuffs.every(part=>part?.role==='sleeve-cuff'),
    'two independent named sleeve-cuff surfaces use their private UV role');
  for(const [index,cuff] of cuffs.entries()){
    const x=cuff.vertices.map(point=>point[0]),y=cuff.vertices.map(point=>point[1]),
      z=cuff.vertices.map(point=>point[2]);
    assert.ok(cuff.faces.reduce((total,face)=>total+face.length-2,0)<=48,
      'each rolled sleeve cuff fits its reviewed triangle allocation');
    assert.ok(Math.min(...z)>=1.06&&Math.max(...z)<=1.11&&
      Math.min(...z)<1.075&&Math.max(...z)>1.09,
    'rolled cloth straddles the measured z1.08 jacket/skin junction');
    assert.ok(Math.max(...x)-Math.min(...x)>.06&&Math.max(...y)-Math.min(...y)>.06&&
      new Set(z.map(value=>value.toFixed(3))).size>=3,
    'cuff has a shaped circumferential return rather than a flat disc');
    assert.ok(index===0?Math.max(...x)<-.19:Math.min(...x)>.19,
      'left and right cuff remain on their matching forearms');
    const jacket=source.meshes.find(part=>part.lod==='near'&&part.name==='rook-near-jacket');
    const skin=source.meshes.find(part=>part.lod==='near'&&
      part.name===`rook-near-forearm-${index?'right':'left'}`);
    const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    for(const [name,surface] of [['jacket',jacket],['skin',skin]]){
      const touching=cuff.vertices.filter(point=>surface.vertices.some(other=>distance(point,other)<.04));
      assert.ok(touching.length>=4,
        `${index?'right':'left'} rolled cuff has at least four real source contacts with ${name}`);
    }
  }
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geometry=near.geometry,
    uv=geometry.attributes.uv,position=geometry.attributes.position,
    skinIndex=geometry.attributes.skinIndex,skinWeight=geometry.attributes.skinWeight;
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const chart=manifest.asset.charts.find(item=>item.role==='sleeve-cuff');
  assert.deepEqual(chart?.boundsPx,[772,520,1000,748],
    'rolled cuff has one private 228px atlas chart');
  const [x0,y0,x1,y1]=chart.boundsPx,ids=[[],[]];
  for(const other of manifest.asset.charts.filter(item=>item.role!=='sleeve-cuff')){
    const [a,b,c,d]=other.boundsPx;
    const gapX=Math.max(a+8-(x1-8),x0+8-(c-8),0);
    const gapY=Math.max(b+8-(y1-8),y0+8-(d-8),0);
    assert.ok(Math.max(gapX,gapY)>=16,
      `cuff chart interior remains at least 16px from ${other.role}`);
  }
  const garmentCalibration=JSON.parse(readFileSync(join(root,
    'tools/blender/rook-p2-garment-calibration.json'),'utf8'));
  assert.equal(garmentCalibration.targets['sleeve-cuff']?.source,'shirt',
    'rolled cuffs share the reviewed blue-green shirt material swatch');
  for(let i=0;i<position.count;i++){
    const x=uv.getX(i)*1024,y=uv.getY(i)*1024;
    if(x<x0||x>x1||y<y0||y>y1)continue;
    assert.ok(x>=x0+8&&x<=x1-8&&y>=y0+8&&y<=y1-8,
      'cuff UVs retain eight-pixel bleed inside their own chart');
    const side=position.getX(i)<0?0:1;
    const wrongSide=side===0?/^(hand|forearm|upper_arm)R$/:/^(hand|forearm|upper_arm)L$/;
    let armWeight=0;
    for(let slot=0;slot<4;slot++){
      const bone=near.skeleton.bones[skinIndex.getComponent(i,slot)]?.name||'';
      assert.ok(!wrongSide.test(bone),`cuff cannot bind the opposite arm: ${bone}`);
      if(/^(forearm|upper_arm)[LR]$/.test(bone))armWeight+=skinWeight.getComponent(i,slot);
    }
    assert.ok(armWeight>.5,'cuff follows its arm rather than torso or pelvis');
    ids[side].push(i);
  }
  assert.ok(ids.every(side=>side.length>=16),'both rolled cuffs survive the joined GLB export');
  const roleIds=(role,side)=>{
    const [a,b,c,d]=manifest.asset.charts.find(item=>item.role===role).boundsPx,found=[];
    for(let id=0;id<position.count;id++){
      const x=uv.getX(id)*1024,y=uv.getY(id)*1024;
      if(x<a||x>c||y<b||y>d||position.getY(id)<.93||position.getY(id)>1.13)continue;
      if(side===0?position.getX(id)<-.19:position.getX(id)>.19)found.push(id);
    }
    return found;
  };
  const jacketIds=[roleIds('jacket',0),roleIds('jacket',1)];
  const skinIds=[roleIds('skin',0),roleIds('skin',1)];
  assert.ok([...jacketIds,...skinIds].every(group=>group.length>=4),
    'exported arm seam has jacket and skin on both sides');
  const mixer=new THREE.AnimationMixer(asset.scene);
  for(const [clipName,time] of [['aim',0],['get-up',.6]]){
    mixer.stopAllAction();mixer.clipAction(asset.animations.find(clip=>clip.name===clipName)).play();
    mixer.setTime(time);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    for(const [side,indices] of ids.entries()){
      const movement=Math.max(...indices.map(id=>near.getVertexPosition(id,new THREE.Vector3())
        .distanceTo(new THREE.Vector3().fromBufferAttribute(position,id))));
      assert.ok(movement>.04,
        `${clipName} moves ${side?'right':'left'} rolled cuff with forearm: ${movement.toFixed(3)}m`);
      for(const [name,surface] of [['jacket',jacketIds[side]],['skin',skinIds[side]]]){
        const posed=surface.map(id=>near.getVertexPosition(id,new THREE.Vector3()));
        const contacts=indices.filter(id=>{
          const cuff=near.getVertexPosition(id,new THREE.Vector3());
          return posed.some(point=>point.distanceTo(cuff)<.045);
        });
        assert.ok(contacts.length>=4,
          `${clipName} ${side?'right':'left'} cuff stays on ${name} seam: ${contacts.length} contacts`);
      }
    }
  }
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

test('Rook has separated skin fingertips attached to both moving gloves', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const gloves=['left','right'].map(side=>source.meshes.find(part=>part.lod==='near'&&
    part.name===`rook-near-glove-${side}`));
  assert.ok(gloves.every(Boolean),'both existing glove palms remain');
  const tips=source.meshes.filter(part=>part.lod==='near'&&part.role==='skin'&&
    part.vertices.some(([, ,z])=>z<.9));
  const triangles=tips.reduce((sum,part)=>sum+part.faces.reduce((n,face)=>n+face.length-2,0),0);
  assert.ok(triangles>0&&triangles<=96,
    `actual exposed fingertip geometry uses the reviewed <=96 triangle allocation: ${triangles}`);
  const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i]));
  for(const [side,glove] of gloves.entries()){
    const parts=tips.filter(part=>part.vertices.some(([x])=>side?x>.2:x<-.2));
    const intervals=[];
    for(const part of parts){
      for(const face of part.faces)for(let i=1;i+1<face.length;i++){
        const triangle=[face[0],face[i],face[i+1]].map(id=>part.vertices[id]);
        const crossings=[];
        for(let edge=0;edge<3;edge++){
          const a=triangle[edge],b=triangle[(edge+1)%3],level=.855;
          if((a[2]-level)*(b[2]-level)>0||a[2]===b[2])continue;
          const t=(level-a[2])/(b[2]-a[2]);
          if(t>=0&&t<=1)crossings.push(a[0]+t*(b[0]-a[0]));
        }
        if(crossings.length>=2&&(side?crossings.some(x=>x>.2):crossings.some(x=>x<-.2)))
          intervals.push([Math.min(...crossings),Math.max(...crossings)]);
      }
    }
    intervals.sort((a,b)=>a[0]-b[0]);
    const silhouette=[];
    for(const interval of intervals){
      const last=silhouette.at(-1);
      if(last&&interval[0]<=last[1]+.003)last[1]=Math.max(last[1],interval[1]);
      else silhouette.push([...interval]);
    }
    assert.ok(silhouette.length>=3,
      `${side?'right':'left'} hand needs three separated projected fingertip silhouettes at z=.855, got ${silhouette.length}`);
    const roots=parts.flatMap(part=>part.vertices).filter(point=>
      (side?point[0]>.2:point[0]<-.2)&&point[2]>=.875&&point[2]<=.91&&
      glove.vertices.some(other=>distance(point,other)<.035));
    assert.ok(roots.length>=3,`${side?'right':'left'} fingertip bases contact glove opening`);
  }
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,
    position=geo.attributes.position,uv=geo.attributes.uv,
    skinIndex=geo.attributes.skinIndex,skinWeight=geo.attributes.skinWeight;
  const chart=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'))
    .asset.charts.find(item=>item.role==='skin').boundsPx;
  const sourceTipVertices=tips.flatMap(part=>part.vertices.filter(([, ,z])=>z<.88));
  const fingerIds=[[],[]];
  for(let id=0;id<position.count;id++){
    const x=position.getX(id),z=position.getY(id);
    if(z>=.88||Math.abs(x)<.2||!sourceTipVertices.some(([sx,sy,sz])=>
      Math.hypot(x-sx,position.getZ(id)+sy,z-sz)<.0001))continue;
    const side=x<0?0:1,u=uv.getX(id)*1024,v=uv.getY(id)*1024;
    assert.ok(u>=chart[0]+8&&u<=chart[2]-8&&v>=chart[1]+8&&v<=chart[3]-8,
      'actual exported fingertip samples uniform skin chart interior, never portrait features');
    let handWeight=0;
    for(let slot=0;slot<4;slot++){
      const bone=near.skeleton.bones[skinIndex.getComponent(id,slot)]?.name||'';
      assert.ok(!new RegExp(`^(hand|forearm)${side?'L':'R'}$`).test(bone),
        'fingertip cannot bind the opposite arm');
      if(bone===`hand${side?'R':'L'}`||bone===`forearm${side?'R':'L'}`)
        handWeight+=skinWeight.getComponent(id,slot);
    }
    assert.ok(handWeight>.8,'fingertip follows its own hand or forearm');
    fingerIds[side].push(id);
  }
  assert.ok(fingerIds.every(ids=>ids.length>=9),'both fingertip silhouettes survive joined export');
  const mixer=new THREE.AnimationMixer(asset.scene);
  for(const [clip,time] of [['aim',0],['get-up',.6]]){
    mixer.stopAllAction();mixer.clipAction(asset.animations.find(action=>action.name===clip)).play();
    mixer.setTime(time);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    for(const ids of fingerIds){
      const motion=Math.max(...ids.map(id=>near.getVertexPosition(id,new THREE.Vector3())
        .distanceTo(new THREE.Vector3().fromBufferAttribute(position,id))));
      assert.ok(motion>.04,`${clip} fingertip follows glove movement: ${motion.toFixed(3)}m`);
    }
  }
});

test('rear scarf stays seated on the jacket through production get-up pose', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const scarf=source.meshes.find(part=>part.name==='rook-near-back-scarf');
  const jacket=source.meshes.find(part=>part.name==='rook-near-jacket');
  assert.ok(scarf&&jacket,'measure the two authored surfaces shown by controlled game captures');
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),position=near.geometry.attributes.position,
    uv=near.geometry.attributes.uv;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const idsFor=(vertex,role)=>{
    const [x0,y0,x1,y1]=charts.find(chart=>chart.role===role).boundsPx,found=[];
    for(let id=0;id<position.count;id++){
      const u=uv.getX(id)*1024,v=uv.getY(id)*1024;
      if(u<x0||u>x1||v<y0||v>y1)continue;
      if(Math.hypot(position.getX(id)-vertex[0],position.getY(id)-vertex[2],
        position.getZ(id)+vertex[1])<.0001)found.push(id);
    }
    return found;
  };
  const scarfIds=scarf.vertices.map(vertex=>idsFor(vertex,'scarf'));
  const [x0,y0,x1,y1]=charts.find(chart=>chart.role==='jacket').boundsPx;
  const index=near.geometry.index,at=corner=>index?index.getX(corner):corner,jacketFaces=[];
  for(let corner=0;corner<(index?.count??position.count);corner+=3){
    const ids=[at(corner),at(corner+1),at(corner+2)];
    const u=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3;
    const v=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
    if(u>=x0&&u<=x1&&v>=y0&&v<=y1&&
      ids.some(id=>position.getY(id)>1.34&&position.getZ(id)<-.06))jacketFaces.push(ids);
  }
  assert.ok(scarfIds.every(ids=>ids.length)&&jacketFaces.length>=40,
    'measure actual exported scarf points against upper-back jacket triangles');
  const mixer=new THREE.AnimationMixer(asset.scene);
  const reports=[];
  for(const [clip,time] of [['idle',.25],['get-up',.6]]){
    mixer.stopAllAction();mixer.clipAction(asset.animations.find(action=>action.name===clip)).play();
    mixer.setTime(time);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    const posed=new Map(),point=id=>{
      if(!posed.has(id))posed.set(id,near.getVertexPosition(id,new THREE.Vector3()));
      return posed.get(id);
    };
    const jacketTriangles=jacketFaces.map(ids=>new THREE.Triangle(...ids.map(point)));
    const nearest=new THREE.Vector3();
    const gaps=scarfIds.map(ids=>Math.min(...ids.map(id=>{
      const scarfPoint=point(id);
      return Math.min(...jacketTriangles.map(triangle=>
        scarfPoint.distanceTo(triangle.closestPointToPoint(scarfPoint,nearest))));
    })));
    const ordered=[...gaps].sort((a,b)=>a-b),p90=ordered[Math.floor(.9*(ordered.length-1))];
    reports.push({clip,p90});
  }
  // This is a loose cloth drape, so allow 55mm stand-off: it covers the already seated
  // 22-44mm scarf points plus room for a fold, while excluding the visible 66-69mm free tip.
  // At the 1.83m/578px native calibration, 55mm is about 17px, not a skin-tight seam.
  assert.ok(reports.every(report=>report.p90<.055),
    `rear scarf stays on jacket in both poses: ${reports.map(report=>
      `${report.clip} p90 ${report.p90.toFixed(3)}m`).join('; ')}`);
});

test('candidate manifest counts the actual validated near and far GLB triangles', () => {
  const manifest=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8'));
  const {json}=readGlb(join(output,outputNames.glb));
  for(const [name,declared,limit] of [
    ['rook-near',manifest.asset.nearTriangles,8000],
    ['rook-far',manifest.asset.farTriangles,2000],
  ]){
    const node=json.nodes.find(item=>item.name===name&&Number.isInteger(item.mesh));
    assert.ok(node,`${name} is an actual exported drawable`);
    const primitives=json.meshes[node.mesh].primitives;
    assert.ok(primitives.length>0,`${name} has exported geometry`);
    const actual=primitives.reduce((total,primitive)=>{
      const count=primitive.indices===undefined
        ?json.accessors[primitive.attributes.POSITION].count
        :json.accessors[primitive.indices].count;
      assert.equal(count%3,0,`${name} primitive has complete triangles`);
      return total+count/3;
    },0);
    assert.ok(actual>0&&actual<=limit,`${name} respects its exported triangle budget`);
    assert.equal(declared,actual,
      `${name} manifest must count validated GLB triangles after Blender removes duplicate faces`);
  }
});

test('exported vest leaves the traced shirt opening visible from front and quarter', async () => {
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,
    position=geo.attributes.position,uv=geo.attributes.uv,index=geo.index;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const at=corner=>index?index.getX(corner):corner,scale=1.83/578;
  const faces={};
  for(const role of ['vest-left','vest-right']){
    const [x0,y0,x1,y1]=charts.find(chart=>chart.role===role).boundsPx;
    faces[role]=[];
    for(let corner=0;corner<(index?.count??position.count);corner+=3){
      const ids=[at(corner),at(corner+1),at(corner+2)],
        u=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3,
        v=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
      if(u<x0||u>x1||v<y0||v>y1)continue;
      faces[role].push(ids.map(id=>[position.getX(id),-position.getZ(id),position.getY(id)]));
    }
    assert.ok(faces[role].length>=30,`${role} is real exported painted cloth`);
  }
  const section=(role,imageY)=>{
    const z=(641-imageY)*scale,points=[];
    for(const face of faces[role])for(let edge=0;edge<3;edge++){
      const a=face[edge],b=face[(edge+1)%3];
      if((a[2]-z)*(b[2]-z)>0||a[2]===b[2])continue;
      const t=(z-a[2])/(b[2]-a[2]);
      if(t>=0&&t<=1)points.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);
    }
    assert.ok(points.length>=4,`${role} crosses native row ${imageY}`);
    const depth=points.map(point=>point[1]),mid=(Math.min(...depth)+Math.max(...depth))/2;
    const front=points.filter(point=>point[1]<=mid);
    return [112+Math.min(...front.map(point=>point[0]))/scale,
      112+Math.max(...front.map(point=>point[0]))/scale];
  };
  const trace=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-landmarks.json'),'utf8'))
    .views.front.outlines;
  const expected=(name,y)=>{
    const line=trace[name];
    for(let i=1;i<line.length;i++)if(y>=line[i-1][1]&&y<=line[i][1]){
      const a=line[i-1],b=line[i];return a[0]+(b[0]-a[0])*(y-a[1])/(b[1]-a[1]);
    }
    assert.fail(`missing reference ${name} y${y}`);
  };
  const errors=[];
  for(const y of [180,241,269]){
    const left=section('vest-left',y),right=section('vest-right',y);
    const want=[expected('vest-left-outer',y),expected('vest-left-inner',y),
      expected('vest-right-inner',y),expected('vest-right-outer',y)];
    const got=[...left,...right];
    for(let edge=0;edge<4;edge++)if(Math.abs(got[edge]-want[edge])>7)
      errors.push(`y${y} edge${edge} ${got[edge].toFixed(1)} vs ${want[edge].toFixed(1)}`);
    assert.ok(right[0]-left[1]>=.003/scale,`exported teal opening remains at y${y}`);
  }
  assert.deepEqual(errors,[],`exported vest matches front reference: ${errors.join('; ')}`);
  for(const role of ['vest-left','vest-right']){
    const frontY=(low,high)=>Math.min(...faces[role].flatMap(face=>face)
      .filter(([x,,z])=>Math.abs(x)>=.025&&Math.abs(x)<=.13&&z>=low&&z<=high)
      .map(point=>point[1]));
    assert.ok(frontY(1.45,1.55)<=frontY(1.35,1.43)-.01,
      `${role} lapel rises at least 10mm toward front/quarter camera`);
  }
});

test('exported hanging pockets stay attached to vest through aim and get-up', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,
    position=geo.attributes.position,uv=geo.attributes.uv,index=geo.index;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const inChart=(id,role)=>{
    const [x0,y0,x1,y1]=charts.find(chart=>chart.role===role).boundsPx;
    const u=uv.getX(id)*1024,v=uv.getY(id)*1024;
    return u>=x0&&u<=x1&&v>=y0&&v<=y1;
  };
  const at=corner=>index?index.getX(corner):corner;
  const faces={};
  for(const side of ['left','right']){
    const role=`vest-${side}`;faces[side]=[];
    for(let corner=0;corner<(index?.count??position.count);corner+=3){
      const ids=[at(corner),at(corner+1),at(corner+2)];
      if(ids.every(id=>inChart(id,role)))faces[side].push(ids);
    }
    assert.ok(faces[side].length>=30,`${side} exported vest surface for pocket contact`);
  }
  const roots={};
  for(const side of ['left','right']){
    const pocket=source.meshes.find(part=>part.name===`rook-near-pocket-${side}`);
    const vest=source.meshes.filter(part=>part.lod==='near'&&part.role===`vest-${side}`)
      .flatMap(part=>part.vertices);
    assert.ok(pocket&&vest.length,'authored pocket and vest contact sources');
    const touching=pocket.vertices.filter(point=>vest.some(other=>
      Math.hypot(...point.map((value,i)=>value-other[i]))<.018));
    roots[side]=touching.map(point=>{
      const ids=[];
      for(let id=0;id<position.count;id++)if(inChart(id,'pockets')&&
        Math.hypot(position.getX(id)-point[0],position.getY(id)-point[2],
          position.getZ(id)+point[1])<.0001)ids.push(id);
      return ids;
    });
    assert.ok(roots[side].length>=3&&roots[side].every(ids=>ids.length),
      `${side} hanging pocket retains at least three exported attachment points`);
  }
  const mixer=new THREE.AnimationMixer(asset.scene);
  for(const [clip,time] of [['idle',.25],['aim',0],['get-up',.6]]){
    mixer.stopAllAction();mixer.clipAction(asset.animations.find(action=>action.name===clip)).play();
    mixer.setTime(time);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    const cache=new Map(),point=id=>{
      if(!cache.has(id))cache.set(id,near.getVertexPosition(id,new THREE.Vector3()));
      return cache.get(id);
    };
    for(const side of ['left','right']){
      const triangles=faces[side].map(ids=>new THREE.Triangle(...ids.map(point)));
      const target=new THREE.Vector3(),gaps=roots[side].map(ids=>Math.min(...ids.map(id=>
        Math.min(...triangles.map(triangle=>
          point(id).distanceTo(triangle.closestPointToPoint(point(id),target)))))));
      assert.ok(Math.max(...gaps)<.04,
        `${clip} ${side} pocket roots stay on vest surface: ${gaps.map(gap=>gap.toFixed(3))}`);
    }
  }
});

test('exported rear drape follows jacket and satchel in aim and get-up', async () => {
  const source=JSON.parse(readFileSync(join(root,'tools/blender/rook-p2-source.json'),'utf8'));
  const drape=source.meshes.find(part=>part.lod==='near'&&part.role==='pack'&&
    Math.max(...part.vertices.map(point=>point[2]))>1.5&&
    Math.min(...part.vertices.map(point=>point[2]))<1.2);
  const satchel=source.meshes.find(part=>part.name==='rook-near-pack');
  const jacket=source.meshes.find(part=>part.name==='rook-near-jacket');
  assert.ok(drape&&satchel&&jacket,'rear fabric connects shoulder to retained satchel');
  const {bytes}=readGlb(join(output,outputNames.glb));
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,
    position=geo.attributes.position,uv=geo.attributes.uv;
  const charts=JSON.parse(readFileSync(join(output,outputNames.manifest),'utf8')).asset.charts;
  const idsFor=(vertex,role)=>{
    const [x0,y0,x1,y1]=charts.find(chart=>chart.role===role).boundsPx,found=[];
    for(let id=0;id<position.count;id++){
      const u=uv.getX(id)*1024,v=uv.getY(id)*1024;
      if(u<x0||u>x1||v<y0||v>y1)continue;
      if(Math.hypot(position.getX(id)-vertex[0],position.getY(id)-vertex[2],
        position.getZ(id)+vertex[1])<.0001)found.push(id);
    }
    return found;
  };
  const upper=drape.vertices.filter(point=>point[2]>1.47).map(point=>idsFor(point,'pack'));
  const lower=drape.vertices.filter(point=>point[2]<1.2).map(point=>idsFor(point,'pack'));
  const jacketIds=jacket.vertices.filter(point=>point[1]>.05&&point[2]>1.38)
    .flatMap(point=>idsFor(point,'jacket'));
  const satchelIds=satchel.vertices.flatMap(point=>idsFor(point,'pack'));
  assert.ok(upper.length>=3&&lower.length>=3&&
    [...upper,...lower].every(ids=>ids.length)&&jacketIds.length>=20&&satchelIds.length>=20,
  'actual GLB retains upper/lower drape and its two support surfaces');
  const mixer=new THREE.AnimationMixer(asset.scene);
  for(const [clip,time] of [['idle',.25],['aim',0],['get-up',.6]]){
    mixer.stopAllAction();mixer.clipAction(asset.animations.find(action=>action.name===clip)).play();
    mixer.setTime(time);asset.scene.updateMatrixWorld(true);near.skeleton.update();
    const point=id=>near.getVertexPosition(id,new THREE.Vector3());
    for(const [label,roots,target,limit] of [
      ['upper',upper,jacketIds,.08],['lower',lower,satchelIds,.055],
    ]){
      const attached=target.map(point),gaps=roots.map(ids=>Math.min(...ids.map(id=>
        Math.min(...attached.map(other=>point(id).distanceTo(other))))));
      assert.ok(Math.min(...gaps)<limit&&
        [...gaps].sort((a,b)=>a-b)[Math.floor(.8*(gaps.length-1))]<limit,
        `${clip} ${label} rear drape stays on ${label==='upper'?'jacket':'satchel'}: ${gaps}`);
    }
  }
});

test('garment UV-edge finish requires a hash-verified source before any output', () => {
  const folder=join(output,'garment-finish-test','rejected');
  const invoke=extra=>spawnSync('python',[script,'--root',root,'--stage','candidate',
    '--output-dir',rel(folder),'--paths-only','--garment-finish',...extra],
  {cwd:root,encoding:'utf8',timeout:10000});
  const missing=invoke([]);
  assert.notEqual(missing.status,0,'finish cannot run without selected garment source and SHA');
  assert.ok(!existsSync(folder),'rejected finish creates no output folder');
  const garment=garmentFixture();
  const bad=invoke(['--garment-paint',garment.source,
    '--garment-paint-sha256','0'.repeat(64),'--garment-calibration',garment.calibration]);
  assert.notEqual(bad.status,0,'wrong garment source hash rejects finish before Blender');
  assert.ok(!existsSync(folder),'bad source hash creates no output folder');
  const config=structuredClone(garment.config);
  config.finish={version:1,method:'source-boundary-uv-ink',
    targetRoles:['vest-left','vest-right','pockets','pack'],edgeWidthPx:4,
    edgeDarken:.72,wearWidthPx:2,wearLiftRgb:[10,8,5],
    trousers:{saturation:.62,value:.91}};
  const calibration=join(output,'garment-finish-test','inputs','calibration.json');
  mkdirSync(join(output,'garment-finish-test','inputs'),{recursive:true});
  writeFileSync(calibration,JSON.stringify(config,null,2)+'\n');
  const valid=invoke(['--garment-paint',garment.source,
    '--garment-paint-sha256',garment.sourceHash,'--garment-calibration',rel(calibration)]);
  assert.equal(valid.status,0,valid.stderr||valid.stdout);
  assert.equal(JSON.parse(valid.stdout).glb[0],join(folder,outputNames.glb),
    'valid finish plans only an isolated ignored candidate');
  assert.ok(!existsSync(folder),'valid paths-only finish performs no writes');
});

test('opt-in garment finish inks actual exported seams and changes only owned albedo charts', async () => {
  const garment=garmentFixture(),config=structuredClone(garment.config);
  config.finish={version:1,method:'source-boundary-uv-ink',
    targetRoles:['vest-left','vest-right','pockets','pack'],edgeWidthPx:4,
    edgeDarken:.72,wearWidthPx:2,wearLiftRgb:[10,8,5],
    trousers:{saturation:.62,value:.91}};
  const folder=join(output,'garment-finish-test');mkdirSync(join(folder,'inputs'),{recursive:true});
  const calibration=join(folder,'inputs','calibration.json');
  writeFileSync(calibration,JSON.stringify(config,null,2)+'\n');
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const common=['-b','--python-exit-code','1','--python',script,'--','--root',root,
    '--stage','candidate','--garment-paint',garment.source,
    '--garment-paint-sha256',garment.sourceHash,'--garment-calibration',rel(calibration)];
  const control=join(folder,'control'),finished=join(folder,'finished');
  const build=(target,extra=[])=>execFileSync(blender,[...common,'--output-dir',rel(target),...extra],
    {cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  build(control);build(finished,['--garment-finish']);
  const plain=rgbaPng(readFileSync(join(control,outputNames.basecolor)));
  const inked=rgbaPng(readFileSync(join(finished,outputNames.basecolor)));
  const manifest=JSON.parse(readFileSync(join(finished,outputNames.manifest),'utf8'));
  const charts=new Map(manifest.asset.charts.map(chart=>[chart.role,chart.boundsPx]));
  const targets=[...config.finish.targetRoles,'trousers'];
  const changedByRole=new Map(targets.map(role=>[role,0]));
  for(let y=0;y<1024;y++)for(let x=0;x<1024;x++){
    const at=(y*1024+x)*4;
    assert.equal(inked.pixels[at+3],255,'finished basecolor stays opaque');
    if(plain.pixels.subarray(at,at+4).equals(inked.pixels.subarray(at,at+4)))continue;
    const owner=targets.find(role=>{
      const [x0,y0,x1,y1]=charts.get(role)||[];
      return x>=x0&&x<=x1&&y>=y0&&y<=y1;
    });
    assert.ok(owner,`finish altered face, hair or unrelated chart at ${x},${y}`);
    changedByRole.set(owner,changedByRole.get(owner)+1);
  }
  for(const role of targets)assert.ok(changedByRole.get(role)>100,
    `${role} has substantial real atlas change: ${changedByRole.get(role)}`);
  for(const name of [outputNames.surface,outputNames.normal])
    assert.equal(sha(readFileSync(join(control,name))),sha(readFileSync(join(finished,name))),
      `${name} remains byte-identical to plain garment paint`);
  const glb=readGlb(join(finished,outputNames.glb)),{bytes}=glb;
  assert.ok(embeddedBasecolor(glb).pixels.equals(inked.pixels),
    'finished GLB embeds exact authored basecolor');
  const loader=new GLTFLoader();
  loader.register(()=>({name:'TEST_LOCAL_TEXTURE',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
  const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  const near=asset.scene.getObjectByName('rook-near'),geo=near.geometry,
    pos=geo.attributes.position,uv=geo.attributes.uv,index=geo.index,at=corner=>index?index.getX(corner):corner;
  const boundaryChanged=new Map(config.finish.targetRoles.map(role=>[role,{sampled:0,changed:0}]));
  const exportedBoundaries=new Map();
  for(const role of config.finish.targetRoles){
    const [x0,y0,x1,y1]=charts.get(role),edges=new Map();
    for(let corner=0;corner<(index?.count??pos.count);corner+=3){
      const ids=[at(corner),at(corner+1),at(corner+2)];
      const u=ids.reduce((sum,id)=>sum+uv.getX(id)*1024,0)/3,
        v=ids.reduce((sum,id)=>sum+uv.getY(id)*1024,0)/3;
      if(u<x0||u>x1||v<y0||v>y1)continue;
      for(let edge=0;edge<3;edge++){
        const pair=[ids[edge],ids[(edge+1)%3]];
        const key=pair.map(id=>[pos.getX(id),pos.getY(id),pos.getZ(id)]
          .map(value=>Math.round(value*100000)).join(',')).sort().join('|');
        const row=edges.get(key)||{count:0,ids:pair};row.count++;edges.set(key,row);
      }
    }
    exportedBoundaries.set(role,[...edges.values()].filter(edge=>edge.count===1)
      .map(edge=>edge.ids.map(id=>[uv.getX(id)*1024,uv.getY(id)*1024])));
    for(const edge of edges.values()){
      if(edge.count!==1)continue;
      const x=Math.round(edge.ids.reduce((sum,id)=>sum+uv.getX(id)*512,0));
      const y=Math.round(edge.ids.reduce((sum,id)=>sum+uv.getY(id)*512,0));
      if(x<x0+8||x>x1-8||y<y0+8||y>y1-8)continue;
      const row=boundaryChanged.get(role);row.sampled++;
      let changed=false;
      for(let dy=-2;dy<=2&&!changed;dy++)for(let dx=-2;dx<=2;dx++){
        const px=x+dx,py=y+dy,offset=(py*1024+px)*4;
        if(!plain.pixels.subarray(offset,offset+3).equals(inked.pixels.subarray(offset,offset+3)))
          changed=true;
      }
      if(changed)row.changed++;
    }
    const row=boundaryChanged.get(role);
    assert.ok(row.sampled>=8&&row.changed>=Math.max(4,row.sampled*.1),
      `${role} ink follows exported one-face UV edges: ${row.changed}/${row.sampled}`);
  }
  assert.deepEqual(manifest.paint?.finish,{
    method:config.finish.method,calibrationSha256:fileHash(rel(calibration)),
    sourceBasecolorSha256:sha(readFileSync(join(control,outputNames.basecolor))),
    basecolorSha256:sha(readFileSync(join(finished,outputNames.basecolor))),
    targetRoles:config.finish.targetRoles,pathCount:manifest.paint.finish.pathCount,
    paths:manifest.paint.finish.paths,
    edgeWidthPx:4,edgeDarken:.72,wearWidthPx:2,wearLiftRgb:[10,8,5],
    trousers:{saturation:.62,value:.91}},'finish records calibrated edge and trouser recipe');
  assert.ok(manifest.paint.finish.pathCount>10,'manifest records real traced UV boundary paths');
  const paths=manifest.paint.finish.paths;
  assert.ok(Array.isArray(paths)&&paths.length===manifest.paint.finish.pathCount,
    'every recorded seam path has reviewable endpoints');
  let matched=0;
  for(const path of paths){
    assert.ok(config.finish.targetRoles.includes(path.role)&&
      typeof path.mesh==='string'&&path.mesh.length>0,
    'finished path names its owning garment role and mesh');
    const [x0,y0,x1,y1]=charts.get(path.role);
    for(const point of [path.fromPx,path.toPx])assert.ok(Array.isArray(point)&&point.length===2&&
      point.every(Number.isFinite)&&point[0]>=x0+8&&point[0]<=x1-8&&
      point[1]>=y0+8&&point[1]<=y1-8,
    'recorded seam endpoints stay in their padded role chart');
    const close=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<=1;
    if(exportedBoundaries.get(path.role).some(edge=>
      close(edge[0],path.fromPx)&&close(edge[1],path.toPx)||
      close(edge[1],path.fromPx)&&close(edge[0],path.toPx)))matched++;
  }
  assert.ok(matched>=Math.max(10,paths.length*.25),
    `recorded seam paths correspond to actual exported cloth boundary edges: ${matched}/${paths.length}`);
});
