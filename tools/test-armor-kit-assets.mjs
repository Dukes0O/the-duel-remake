import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {CARS} from '../src/config.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['kit-scrapper', 'kit-raider', 'kit-warlord',
  'kit-bull-bar', 'kit-stack-0', 'kit-stack-1',
  'kit-plate-0', 'kit-plate-1', 'kit-plate-2', 'kit-plate-3',
  'kit-cage', 'kit-saw-0', 'kit-saw-1', 'kit-turret-mount',
  'kit-crown', 'kit-full-plating', 'kit-warlord-mount'];

function glbJson(bytes) {
  assert.equal(bytes.readUInt32LE(0), 0x46546c67, 'GLB magic');
  assert.equal(bytes.readUInt32LE(4), 2, 'GLB version');
  assert.equal(bytes.readUInt32LE(8), bytes.length, 'complete GLB length');
  const length = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a, 'JSON first chunk');
  return JSON.parse(bytes.subarray(20, 20 + length).toString('utf8'));
}

test('all nine cars have distinct local fitted kits with UVs and stable tier parts', async () => {
  const hashes = new Set();
  const cars = Object.keys(CARS);
  assert.equal(cars.length, 9);
  for (const car of cars) {
    const bytes = await readFile(join(root, 'public/assets/models/wasteland/kits', `${car}.glb`));
    hashes.add(createHash('sha256').update(bytes).digest('hex'));
    const gltf = glbJson(bytes);
    assert.equal(gltf.asset?.version, '2.0', car);
    const nodes = new Set((gltf.nodes || []).map(node => node.name));
    for (const name of names) assert.ok(nodes.has(name), `${car}: missing ${name}`);
    const primitives = (gltf.meshes || []).flatMap(mesh => mesh.primitives || []);
    assert.ok(primitives.length > 0, `${car}: no visible geometry`);
    let triangles = 0;
    for (const part of primitives) {
      assert.ok(Number.isInteger(part.attributes?.POSITION), `${car}: position`);
      assert.ok(Number.isInteger(part.attributes?.TEXCOORD_0), `${car}: painted UVs`);
      assert.ok(Number.isInteger(part.material), `${car}: material`);
      const accessor = gltf.accessors[part.indices ?? part.attributes.POSITION];
      triangles += accessor.count / 3;
      const position = gltf.accessors[part.attributes.POSITION];
      assert.equal(position.min?.length, 3, `${car}: position bounds`);
      assert.equal(position.max?.length, 3, `${car}: position bounds`);
      for (const value of [...position.min, ...position.max])
        assert.ok(Number.isFinite(value) && Math.abs(value) < 8, `${car}: bounded local fit`);
    }
    assert.ok(triangles > 100 && triangles <= 12000, `${car}: geometry budget ${triangles}`);
    for (const image of gltf.images || []) {
      assert.ok(image.bufferView !== undefined ||
        (typeof image.uri === 'string' && !/^(?:https?:|data:|\/)/i.test(image.uri)),
      `${car}: image must be embedded or locally relative`);
    }
    for (const buffer of gltf.buffers || [])
      assert.ok(!buffer.uri || !/^(?:https?:|data:|\/)/i.test(buffer.uri),
        `${car}: buffer must be embedded or locally relative`);
  }
  assert.equal(hashes.size, cars.length, 'each car needs fitted, distinct geometry');
});

test('painted armor shells and breakable plates retain usable UV area after batching', async () => {
  for (const car of Object.keys(CARS)) {
    const bytes=await readFile(join(root,'public/assets/models/wasteland/kits',`${car}.glb`));
    const gltf=glbJson(bytes);
    const bin=bytes.subarray(28+bytes.readUInt32LE(12));
    function element(accessorIndex,index) {
      const a=gltf.accessors[accessorIndex], view=gltf.bufferViews[a.bufferView];
      const width={SCALAR:1,VEC2:2,VEC3:3}[a.type];
      const size={5121:1,5123:2,5125:4,5126:4}[a.componentType];
      const offset=(view.byteOffset||0)+(a.byteOffset||0)+index*(view.byteStride||width*size);
      return Array.from({length:width},(_,i)=>a.componentType===5126?bin.readFloatLE(offset+i*size):
        size===1?bin.readUInt8(offset+i):size===2?bin.readUInt16LE(offset+i*size):bin.readUInt32LE(offset+i*size));
    }
    for(const name of ['kit-full-plating','kit-plate-0','kit-plate-1','kit-plate-2','kit-plate-3']) {
      const parent=gltf.nodes.findIndex(n=>n.name===name);
      assert.ok(parent>=0,`${car}: ${name}`);
      let area=0,painted=0;
      const visit=index=>{
        const node=gltf.nodes[index];
        for(const part of gltf.meshes?.[node.mesh]?.primitives||[]) {
          const pos=part.attributes.POSITION, uv=part.attributes.TEXCOORD_0;
          const count=gltf.accessors[part.indices??pos].count;
          for(let i=0;i<count;i+=3) {
            const ids=[i,i+1,i+2].map(n=>part.indices===undefined?n:element(part.indices,n)[0]);
            const [a,b,c]=ids.map(n=>element(pos,n));
            const ab=b.map((v,k)=>v-a[k]),ac=c.map((v,k)=>v-a[k]);
            const triangle=Math.hypot(ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0])/2;
            const [u,v,w]=ids.map(n=>element(uv,n));
            const uvArea=Math.abs((v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0]));
            area+=triangle;
            if(uvArea>1e-10)painted+=triangle;
          }
        }
        for(const child of node.children||[])visit(child);
      };
      visit(parent);
      assert.ok(area>0 && painted/area>=.8,
        `${car} ${name}: only ${(painted/area*100).toFixed(1)}% of surface has noncollapsed painted UVs`);
    }
  }
});
