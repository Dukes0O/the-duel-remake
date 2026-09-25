import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {inflateSync} from 'node:zlib';
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
      node.extras.sourceRenderSha256,'source-car render bytes match exported provenance');
    const embedded=materialImages(asset,'hulks authored padded atlas');
    for(const [index,name] of ['color','surface','normal'].entries()){
      const record=snapshots[name];
      assert.ok(record?.path&&record.sha256,`${name}: snapshot provenance`);
      const snapshot=readFileSync(join(root,record.path));
      assert.equal(hash(snapshot),record.sha256,`${name}: exact authored snapshot hash`);
      const source=rgbaPng(snapshot),mapped=embedded[index];
      assert.deepEqual([source.width,source.height,mapped.width,mapped.height],[512,512,512,512]);
      assert.ok(source.pixels.equals(mapped.pixels),
        `${check.asset}: embedded ${name} pixels equal that build's authored atlas, including relief and protected car tiles`);
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
