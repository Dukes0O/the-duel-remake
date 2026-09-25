import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join, resolve, sep} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {deflateSync, inflateSync} from 'node:zlib';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const probeDir = join(root, 'art-build/rustwall-p2');
const protectedTiles = new Set([0, 2, 3, 4, 5, 8, 9, 13]);
const loader = new GLTFLoader();
loader.register(() => ({name: 'TEST_LOCAL_TEXTURE',
  loadTexture: () => Promise.resolve(new THREE.Texture())}));

function glb(path) {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF');
  let json, binary;
  for (let offset = 12; offset < bytes.length;) {
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    if (type === 0x4e4f534a) json = JSON.parse(bytes.subarray(offset + 8, offset + 8 + length).toString('utf8'));
    if (type === 0x004e4942) binary = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length;
  }
  assert.ok(json && binary, 'actual exported GLB has JSON and binary geometry');
  const image = index => {
    const item = json.images[index];
    assert.equal(item.mimeType, 'image/png', 'local lossless atlas');
    const view = json.bufferViews[item.bufferView];
    return binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  };
  return {bytes, json, image};
}

function rgbaPng(bytes) {
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert.equal(bytes[24], 8, '8-bit atlas');
  assert.equal(bytes[25], 6, 'RGBA atlas');
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), type = bytes.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * 4;
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0, input = 0; y < height; y++) {
    const filter = raw[input++];
    for (let x = 0; x < stride; x++) {
      const left = x >= 4 ? pixels[y * stride + x - 4] : 0;
      const above = y ? pixels[(y - 1) * stride + x] : 0;
      const upperLeft = y && x >= 4 ? pixels[(y - 1) * stride + x - 4] : 0;
      const p = left + above - upperLeft;
      const pa = Math.abs(p - left), pb = Math.abs(p - above), pc = Math.abs(p - upperLeft);
      const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft;
      const prior = [0, left, above, Math.floor((left + above) / 2), predictor][filter];
      assert.notEqual(prior, undefined, 'supported PNG row filter');
      pixels[y * stride + x] = (raw[input++] + prior) & 255;
    }
  }
  return {width, height, pixels};
}

function steelPaintFixture() {
  const directory=join(root,'art-build/rustwall-p2/test-steel/inputs');
  mkdirSync(directory,{recursive:true});
  const source=join(directory,'source.png'),width=1254,height=1254,stride=width*4;
  const raw=Buffer.alloc(height*(stride+1));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const at=y*(stride+1)+1+x*4,field=Math.min(2,Math.floor(x/(width/3)));
    const rust=(x*7+y*13+field*41)%53;
    raw[at]=[79,101,91][field]+rust;
    raw[at+1]=[63,70,59][field]+Math.floor(rust*.45);
    raw[at+2]=[49,46,43][field]+Math.floor(rust*.23);raw[at+3]=255;
  }
  const chunk=(kind,data)=>{
    const type=Buffer.from(kind),body=Buffer.concat([type,data]);let crc=0xffffffff;
    for(const byte of body){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);
    type.copy(out,4);data.copy(out,8);out.writeUInt32BE((crc^0xffffffff)>>>0,8+data.length);
    return out;
  };
  const header=Buffer.alloc(13);header.writeUInt32BE(width,0);header.writeUInt32BE(height,4);
  header[8]=8;header[9]=6;
  const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),
    chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
  writeFileSync(source,png);
  return {source:'art-build/rustwall-p2/test-steel/inputs/source.png',sha256:hash(png)};
}

function materialImages(asset, name) {
  const material = asset.json.materials.find(item => item.name === name);
  assert.ok(material, `${name} material exists`);
  const index = texture => asset.json.textures[texture.index].source;
  return [material.pbrMetallicRoughness.baseColorTexture,
    material.pbrMetallicRoughness.metallicRoughnessTexture, material.normalTexture]
    .map(texture => rgbaPng(asset.image(index(texture))));
}

test('P2 source-car relief probe preserves car atlases and exports padded, raised source-derived geometry', async () => {
  const blender = process.env.BLENDER_BIN ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  execFileSync(blender, ['-b', '--python-exit-code', '1', '--python',
    'tools/blender/rustwall.py', '--', '--root', root, '--round', '2', '--p2-relief-probe'],
  {cwd: root, timeout: 120000, maxBuffer: 20 * 1024 * 1024});
  const manifest = JSON.parse(readFileSync(join(probeDir, 'relief-probe.json'), 'utf8'));
  assert.deepEqual(manifest.uvRegion, [260, 132, 507, 379]);
  assert.equal(manifest.sources.length, 2);
  for (const source of manifest.sources) {
    assert.ok(source.path.startsWith('public/assets/models/'), 'real local source car');
    assert.equal(hash(readFileSync(join(root, source.path))), source.sha256);
  }
  assert.equal(hash(readFileSync(join(root, manifest.sourceRenderPath))), manifest.sourceRenderSha256,
    'relief really derives from a recorded source-car render');
  const candidate = glb(join(probeDir, 'relief-probe.glb'));
  const old = glb(join(root, 'public/assets/models/wasteland/rustwall/wall.glb'));
  const parsed = await loader.parseAsync(candidate.bytes.buffer.slice(candidate.bytes.byteOffset,
    candidate.bytes.byteOffset + candidate.bytes.byteLength), '');
  const relief = parsed.scene.getObjectByName('source-car-relief');
  const cars = parsed.scene.getObjectByName('welded-car-hulks');
  assert.ok(relief?.isMesh && cars?.isMesh, 'actual relief and source-car geometry both exported');
  assert.equal(relief.userData.sourceRenderSha256, manifest.sourceRenderSha256);
  assert.deepEqual(relief.userData.uvRegion, manifest.uvRegion);
  assert.equal(relief.material.name, cars.material.name, 'relief and cars share the existing hulks atlas draw');
  const depth = new THREE.Box3().setFromObject(relief).getSize(new THREE.Vector3()).z;
  assert.ok(depth > .03 && depth < 2, `relief has shallow non-flat world geometry: ${depth}`);
  const uv = relief.geometry.attributes.uv;
  assert.ok(uv?.count > 12, 'exported relief has mapped surface, not a token quad');
  for (let i = 0; i < uv.count; i++) {
    const x = uv.getX(i) * 512, y = (1 - uv.getY(i)) * 512;
    assert.ok(x >= 260 && x <= 507 && y >= 132 && y <= 379,
      `relief UV ${i} stays within the padded primary 248-square atlas region`);
  }
  const carUv = cars.geometry.attributes.uv;
  for (let i = 0; i < carUv.count; i++) {
    const tile = Math.floor(carUv.getX(i) * 4) + 4 * Math.floor((1 - carUv.getY(i)) * 4);
    assert.ok(protectedTiles.has(tile), `actual car UV ${i} remains in its original tile`);
  }
  const name = 'hulks authored padded atlas';
  const oldAtlases = materialImages(old, name), newAtlases = materialImages(candidate, name);
  for (let atlas = 0; atlas < 3; atlas++) {
    const a = oldAtlases[atlas], b = newAtlases[atlas];
    assert.deepEqual([a.width, a.height, b.width, b.height], [512, 512, 512, 512]);
    for (const tile of protectedTiles) for (let y = 0; y < 128; y++) {
      const row = Math.floor(tile / 4) * 128 + y, column = (tile % 4) * 128;
      const start = (row * 512 + column) * 4, end = start + 128 * 4;
      assert.ok(a.pixels.subarray(start, end).equals(b.pixels.subarray(start, end)),
        `protected tile ${tile} pixels unchanged in color/surface/normal atlas ${atlas}`);
    }
  }
});

test('isolated P2 wall and probe embed their own exact authored atlases without changing production', () => {
  const script=join(root,'tools/blender/rustwall.py');
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const production=['wall','wash'].map(name=>join(root,'public/assets/models/wasteland/rustwall',`${name}.glb`));
  const frozen=production.map(path=>hash(readFileSync(path)));
  const cases=[
    {dir:'art-build/rustwall-p2/test-full',flags:['--p2','--skip-renders'],asset:'wall.glb',prefix:'wall'},
    {dir:'art-build/rustwall-p2/test-probe',flags:['--p2-relief-probe'],asset:'relief-probe.glb',prefix:'probe'},
  ];
  for(const check of cases){
    const args=['--root',root,'--round','4',...check.flags,'--output-dir',check.dir];
    const plan=JSON.parse(execFileSync('python',[script,'--',...args,'--paths-only'],
      {cwd:root,encoding:'utf8',timeout:10000}));
    assert.ok(plan.glb.every(path=>path.startsWith(join(root,check.dir))),
      'dry-run output stays in ignored isolated directory');
    execFileSync(blender,['-b','--python-exit-code','1','--python',script,'--',...args],
      {cwd:root,timeout:300000,maxBuffer:20*1024*1024});
    const asset=glb(join(root,check.dir,check.asset));
    const node=asset.json.nodes.find(item=>item.name==='source-car-relief');
    const snapshots=node?.extras?.atlasSnapshots;
    assert.ok(snapshots,'actual exported relief node records own atlas snapshots');
    assert.ok(node.extras.sourceRenderPath&&node.extras.sourceRenderSha256,
      'exported relief records its actual source-car render');
    assert.equal(hash(readFileSync(join(root,node.extras.sourceRenderPath))),
      node.extras.sourceRenderSha256,`${check.asset}: this build's source-car PNG bytes match exported provenance`);
    const embedded=materialImages(asset,'hulks authored padded atlas');
    for(const [index,name] of ['color','surface','normal'].entries()){
      const record=snapshots[name];
      assert.ok(record?.path&&record.sha256,`${name}: snapshot provenance`);
      const snapshot=readFileSync(join(root,record.path));
      assert.equal(hash(snapshot),record.sha256,`${name}: exact authored snapshot hash`);
      const source=rgbaPng(snapshot),mapped=embedded[index];
      assert.deepEqual([source.width,source.height,mapped.width,mapped.height],[512,512,512,512]);
      assert.ok(source.pixels.equals(mapped.pixels),
        `${check.asset}: embedded ${name} pixels equal this build's authored atlas, including relief and protected car tiles`);
    }
    for(let i=0;i<production.length;i++)assert.equal(hash(readFileSync(production[i])),frozen[i],
      `${production[i]} production bytes unchanged by isolated review build`);
  }
  for(const unsafe of ['public/assets/models/wasteland/rustwall','../outside']){
    let rejected=false;
    try{execFileSync('python',[script,'--','--root',root,'--round','4','--p2',
      '--output-dir',unsafe,'--paths-only'],{cwd:root,timeout:10000,stdio:'pipe'});}
    catch{rejected=true;}
    assert.ok(rejected,`${unsafe}: path rejected before Blender import or writes`);
  }
});

test('P2 steel atlas paints distinct full-height pylons and lintel without changing used palette tiles', async () => {
  const asset=glb(join(root,'public/assets/models/wasteland/rustwall/wall.glb'));
  const maps=materialImages(asset,'steel authored padded atlas');
  // Actual exported PNG rows used by GLTFLoader: old steel consumers do not
  // sample upper-right tiles 2/3/6/7 in the current pylon design.
  const unused=new Set([2,3,6,7]);
  const protectedBytes=image=>{
    const parts=[];
    for(let tile=0;tile<16;tile++)if(!unused.has(tile))for(let row=0;row<128;row++){
      const y=Math.floor(tile/4)*128+row,x=(tile%4)*128;
      parts.push(image.pixels.subarray((y*512+x)*4,(y*512+x+128)*4));
    }
    return Buffer.concat(parts);
  };
  const hashes=maps.map(image=>hash(protectedBytes(image)));
  assert.deepEqual(hashes,[
    'ccffe6226080f60d03165f709a0c8ef4c88456a0f068a53244416bad9f1b2bbd',
    'b9403ed1bae65aeed79c3f3671937ecc23e0513a31d043f2bcc15c2c5b878694',
    '955324a3b2cd5e66c1a1fc4e58e9804ff2bf0dcfe893f086867189d51b5f4fbd',
  ],'all previously used steel palette tiles stay byte-identical in color/surface/normal');
  const parsed=await loader.parseAsync(asset.bytes.buffer.slice(asset.bytes.byteOffset,
    asset.bytes.byteOffset+asset.bytes.byteLength),'');
  const strips=[[264,335],[344,415],[424,495]];
  const coverage=[Array(3).fill(0),Array(3).fill(0)];
  const facingCoverage=[Array(3).fill(0),Array(3).fill(0)];
  const blankRange=()=>({uMin:Infinity,uMax:-Infinity,vMin:Infinity,vMax:-Infinity,
    xMin:Infinity,xMax:-Infinity,yMin:Infinity,yMax:-Infinity});
  const ranges=[Array.from({length:3},blankRange),Array.from({length:3},blankRange)];
  const lintel=blankRange();let lintelArea=0, facingLintelArea=0;
  parsed.scene.updateMatrixWorld(true);
  parsed.scene.traverse(mesh=>{
    if(!mesh.isMesh||!['wall-body','scaffold-steel'].includes(mesh.name))return;
    const geo=mesh.geometry,pos=geo.attributes.position,uv=geo.attributes.uv;
    const at=corner=>geo.index?geo.index.getX(corner):corner;
    for(let corner=0;corner<(geo.index?.count??pos.count);corner+=3){
      const ids=[at(corner),at(corner+1),at(corner+2)];
      const p=ids.map(id=>new THREE.Vector3().fromBufferAttribute(pos,id).applyMatrix4(mesh.matrixWorld));
      const x=p.reduce((sum,v)=>sum+v.x,0)/3,y=p.reduce((sum,v)=>sum+v.y,0)/3;
      const z=p.reduce((sum,v)=>sum+v.z,0)/3;
      // The P2 structural pylon front rises from the gate lintel near y8
      // into scaffold steel above the protected 35m wall-body envelope.
      if(Math.abs(x)>=15||y<0||y>46||z>-1.8)continue;
      const area=Math.abs((p[1].x-p[0].x)*(p[2].y-p[0].y)-
        (p[1].y-p[0].y)*(p[2].x-p[0].x))*.5;
      if(area<.01)continue;
      const frontFacing=new THREE.Vector3().subVectors(p[1],p[0])
        .cross(new THREE.Vector3().subVectors(p[2],p[0])).z<0;
      // glTF UVs are already flipped on export; GLTFLoader uses flipY=false.
      // The embedded PNG row sampled by Three is exported TEXCOORD_0.y directly.
      const u=ids.map(id=>uv.getX(id)*512),v=ids.map(id=>uv.getY(id)*512);
      const strip=strips.findIndex(([lo,hi])=>u.every(value=>value>=lo&&value<=hi)&&
        v.every(value=>value>=12&&value<=243));
      if(strip<0)continue;
      if(y>=7&&y<=13&&strip===2){
        lintelArea+=area;
        if(frontFacing)facingLintelArea+=area;
        lintel.uMin=Math.min(lintel.uMin,...u);lintel.uMax=Math.max(lintel.uMax,...u);
        lintel.vMin=Math.min(lintel.vMin,...v);lintel.vMax=Math.max(lintel.vMax,...v);
        continue;
      }
      if(Math.abs(x)<=5||strip===2)continue;
      const side=x<0?0:1,band=y<12?0:y<24?1:2;
      coverage[side][band]+=area;
      if(frontFacing)facingCoverage[side][band]+=area;
      const range=ranges[side][strip];
      range.uMin=Math.min(range.uMin,...u);range.uMax=Math.max(range.uMax,...u);
      range.vMin=Math.min(range.vMin,...v);range.vMax=Math.max(range.vMax,...v);
      range.xMin=Math.min(range.xMin,...p.map(point=>point.x));
      range.xMax=Math.max(range.xMax,...p.map(point=>point.x));
      range.yMin=Math.min(range.yMin,...p.map(point=>point.y));
      range.yMax=Math.max(range.yMax,...p.map(point=>point.y));
    }
  });
  for(let side=0;side<2;side++){
    assert.ok(coverage[side].every(area=>area>20),
      `${side?'right':'left'} pylon front uses painted steel at foot, middle and top: ${JSON.stringify(coverage)}`);
    assert.ok(facingCoverage[side].every(area=>area>20),
      `${side?'right':'left'} painted pylon faces the actual glTF -Z inspection camera at foot, middle and top: ${JSON.stringify(facingCoverage)}`);
    assert.ok(ranges[side].some(range=>{
      const du=range.uMax-range.uMin,dv=range.vMax-range.vMin;
      const dx=range.xMax-range.xMin,dy=range.yMax-range.yMin;
      const aspect=(du/dx)/(dv/dy);
      return du>55&&dv>190&&aspect>.65&&aspect<1.45;
    }),
      `${side?'right':'left'} front maps physical width and full height into one 72×232 atlas field: ${JSON.stringify(ranges[side])}`);
  }
  assert.ok(lintelArea>40&&lintel.uMax-lintel.uMin>50&&lintel.vMax-lintel.vMin>180,
    `front lintel uses the third authored weathered-steel field: ${lintelArea} m²`);
  assert.ok(facingLintelArea>40,
    `painted lintel faces the actual glTF -Z inspection camera: ${facingLintelArea} m²`);
  const painted=maps.map(image=>{
    const colors=new Set();
    for(let y=12;y<=243;y+=3)for(let x=264;x<=495;x+=3){
      const at=(y*512+x)*4;colors.add(image.pixels.subarray(at,at+3).toString('hex'));
    }
    return colors.size;
  });
  assert.ok(painted.every(count=>count>40),`all three steel maps contain authored variation: ${painted}`);
});

test('P2 optional steel paint validates explicit local source and hash before writes', () => {
  const fixture=steelPaintFixture();
  const script=join(root,'tools/blender/rustwall.py');
  const output='art-build/rustwall-p2/test-steel/path-plan';
  const args=['--root',root,'--round','7','--p2','--skip-renders','--output-dir',output];
  const run=extra=>execFileSync('python',[script,'--',...args,...extra,'--paths-only'],
    {cwd:root,encoding:'utf8',timeout:15000,stdio:'pipe'});
  const plan=JSON.parse(run(['--steel-paint',fixture.source,'--steel-paint-sha256',fixture.sha256]));
  assert.ok(plan.glb.every(path=>path.startsWith(join(root,output))),
    'valid explicit paint plans only isolated ignored outputs');
  const badCases=[
    ['--steel-paint',fixture.source],
    ['--steel-paint-sha256',fixture.sha256],
    ['--steel-paint',fixture.source,'--steel-paint-sha256','0'.repeat(64)],
    ['--steel-paint','public/assets/models/wasteland/rustwall/wall.glb',
      '--steel-paint-sha256',fixture.sha256],
    ['--steel-paint','../outside.png','--steel-paint-sha256',fixture.sha256],
  ];
  for(const extra of badCases){
    const rejected=(()=>{try{run(extra);return false;}catch{return true;}})();
    assert.ok(rejected,`invalid optional paint source/hash rejected before Blender or output writes: ${extra}`);
  }
  assert.ok(!existsSync(join(root,output)),
    'paths-only and rejected inputs create no output directory');
});

test('P2 outer sections carry two distinct full-height painted masses with broken third bays', async () => {
  const asset=glb(join(root,'public/assets/models/wasteland/rustwall/wall.glb'));
  const parsed=await loader.parseAsync(asset.bytes.buffer.slice(asset.bytes.byteOffset,
    asset.bytes.byteOffset+asset.bytes.byteLength),'');
  parsed.scene.updateMatrixWorld(true);
  const sections=[[-141,-109],[-72,-38],[39.5,70.5],[110.5,142.5]];
  const strips=[[264,335],[344,415],[424,495]];
  for(const [left,right] of sections){
    const painted=strips.map(()=>({area:0,xMin:Infinity,xMax:-Infinity,yMin:Infinity,
      yMax:-Infinity,zMin:Infinity,zMax:-Infinity,uMin:Infinity,uMax:-Infinity,
      vMin:Infinity,vMax:-Infinity}));
    let otherArea=0;
    parsed.scene.traverse(mesh=>{
      if(!mesh.isMesh||mesh.material.name!=='steel authored padded atlas')return;
      const geo=mesh.geometry,pos=geo.attributes.position,uv=geo.attributes.uv;
      const at=corner=>geo.index?geo.index.getX(corner):corner;
      for(let corner=0;corner<(geo.index?.count??pos.count);corner+=3){
        const ids=[at(corner),at(corner+1),at(corner+2)];
        const p=ids.map(id=>new THREE.Vector3().fromBufferAttribute(pos,id)
          .applyMatrix4(mesh.matrixWorld));
        const cx=p.reduce((sum,v)=>sum+v.x,0)/3,cy=p.reduce((sum,v)=>sum+v.y,0)/3;
        if(cx<=left||cx>=right||cy<0||cy>35)continue;
        const signed=((p[1].x-p[0].x)*(p[2].y-p[0].y)-
          (p[1].y-p[0].y)*(p[2].x-p[0].x))*.5;
        const front=new THREE.Vector3().subVectors(p[1],p[0])
          .cross(new THREE.Vector3().subVectors(p[2],p[0])).z<0;
        if(!front||Math.abs(signed)<.01)continue;
        const u=ids.map(id=>uv.getX(id)*512),v=ids.map(id=>uv.getY(id)*512);
        const strip=strips.findIndex(([lo,hi])=>u.every(value=>value>=lo&&value<=hi)&&
          v.every(value=>value>=12&&value<=243));
        if(strip<0){otherArea+=Math.abs(signed);continue;}
        const item=painted[strip];item.area+=Math.abs(signed);
        item.xMin=Math.min(item.xMin,...p.map(q=>q.x));
        item.xMax=Math.max(item.xMax,...p.map(q=>q.x));
        item.yMin=Math.min(item.yMin,...p.map(q=>q.y));
        item.yMax=Math.max(item.yMax,...p.map(q=>q.y));
        item.zMin=Math.min(item.zMin,...p.map(q=>q.z));
        item.zMax=Math.max(item.zMax,...p.map(q=>q.z));
        item.uMin=Math.min(item.uMin,...u);item.uMax=Math.max(item.uMax,...u);
        item.vMin=Math.min(item.vMin,...v);item.vMax=Math.max(item.vMax,...v);
      }
    });
    const substantial=painted.filter(item=>item.area>150);
    assert.ok(substantial.length>=2,
      `outer section ${left}..${right} uses at least two distinct painted steel fields: ${painted.map(item=>item.area.toFixed(1))}`);
    for(const item of substantial){
      const dx=item.xMax-item.xMin,dy=item.yMax-item.yMin;
      const du=item.uMax-item.uMin,dv=item.vMax-item.vMin;
      const aspect=(du/dx)/(dv/dy);
      assert.ok(dx>=8&&dx<=12&&dy>=28&&dy<=35&&du>55&&dv>190&&
        aspect>.65&&aspect<1.45,
        `outer section ${left}..${right} painted panel has physical 9–11m × 30–35m scale and continuous UV: ${JSON.stringify(item)}`);
    }
    assert.ok(otherArea>50,
      `outer section ${left}..${right} retains substantial broken rust/iron sheets beside painted masses: ${otherArea.toFixed(1)}m²`);
    const paintedWidth=substantial.reduce((sum,item)=>sum+item.xMax-item.xMin,0);
    assert.ok(paintedWidth<right-left-2,
      `outer section ${left}..${right} leaves visible dark joints between three unequal masses`);
  }
});

test('P2 explicit steel paint records exact actual-export source and three atlas fields', () => {
  const fixture=steelPaintFixture();
  const blender=process.env.BLENDER_BIN||'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  const output='art-build/rustwall-p2/test-steel/painted';
  const production=['wall','wash'].map(name=>join(root,'public/assets/models/wasteland/rustwall',`${name}.glb`));
  const frozen=production.map(path=>hash(readFileSync(path)));
  const target=resolve(root,output);
  assert.ok(target.startsWith(resolve(probeDir)+sep),
    'test cleanup target resolves strictly inside ignored P2 art-build');
  rmSync(target,{recursive:true,force:true});
  execFileSync(blender,['-b','--python-exit-code','1','--python','tools/blender/rustwall.py',
    '--','--root',root,'--round','7','--p2','--skip-renders','--output-dir',output,
    '--steel-paint',fixture.source,'--steel-paint-sha256',fixture.sha256],
  {cwd:root,timeout:300000,maxBuffer:20*1024*1024});
  const asset=glb(join(root,output,'wall.glb'));
  const steel=asset.json.nodes.find(node=>node.name==='scaffold-steel');
  assert.ok(steel,'actual exported steel geometry exists');
  assert.equal(steel.extras?.steelPaintInput,'generated-source');
  assert.equal(steel.extras?.steelPaintSourcePath,fixture.source);
  assert.equal(steel.extras?.steelPaintSourceSha256,fixture.sha256);
  assert.equal(hash(readFileSync(join(root,steel.extras.steelPaintSourcePath))),fixture.sha256);
  assert.deepEqual(steel.extras?.steelPaintAtlasRects,
    [[264,12,335,243],[344,12,415,243],[424,12,495,243]]);
  const authored=rgbaPng(readFileSync(join(root,fixture.source)));
  const embedded=materialImages(asset,'steel authored padded atlas')[0];
  assert.deepEqual([authored.width,authored.height,embedded.width,embedded.height],
    [1254,1254,512,512]);
  for(let strip=0;strip<3;strip++){
    let difference=0,samples=0;
    for(let y=0;y<232;y++)for(let x=0;x<72;x++){
      const x0=strip*418+Math.floor(x*418/72),x1=strip*418+Math.floor((x+1)*418/72);
      const y0=Math.floor(y*1254/232),y1=Math.floor((y+1)*1254/232);
      const sum=[0,0,0],count=(x1-x0)*(y1-y0);
      for(let sy=y0;sy<y1;sy++)for(let sx=x0;sx<x1;sx++){
        const at=(sy*1254+sx)*4;
        for(let channel=0;channel<3;channel++)sum[channel]+=authored.pixels[at+channel];
      }
      const at=((12+y)*512+264+strip*80+x)*4;
      for(let channel=0;channel<3;channel++){
        difference+=Math.abs(embedded.pixels[at+channel]-sum[channel]/count);
        samples++;
      }
    }
    assert.ok(difference/samples<3,
      `paint strip ${strip}: embedded sampled color derives from the selected source, mean RGB error ${(difference/samples).toFixed(2)}`);
  }
  for(let i=0;i<production.length;i++)assert.equal(hash(readFileSync(production[i])),frozen[i],
    'isolated paint review build leaves production wall/wash bytes unchanged');
});
