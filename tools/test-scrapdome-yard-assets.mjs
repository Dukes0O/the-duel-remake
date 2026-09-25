import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';

const path = new URL('../public/assets/models/wasteland/scrapdome/yard.glb', import.meta.url);
async function asset() {
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii',0,4), 'glTF'); assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const json = JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  for (const resource of [...(json.buffers || []), ...(json.images || [])])
    assert.ok(!resource.uri || resource.uri.startsWith('data:'), 'embedded local resources only');
  assert.ok(json.images?.length, 'painted atlas is embedded');
  assert.ok(json.materials?.length <= 3, 'three painted material sets maximum');
  const loader = new GLTFLoader();
  loader.register(() => ({name: 'TEST_LOCAL_TEXTURE', loadTexture: () => Promise.resolve(new THREE.Texture())}));
  const gltf = await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  gltf.scene.updateMatrixWorld(true); return gltf.scene;
}

test('authored yard has bounded painted geometry and leaves the complete entry corridor clear', async () => {
  const scene = await asset(); let triangles = 0, draws = 0;
  const corridor = new THREE.Box3(new THREE.Vector3(-8,.25,5.5),new THREE.Vector3(8,5,45));
  const bounds = new THREE.Box3();
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const p = mesh.geometry.attributes.position, uv = mesh.geometry.attributes.uv;
    assert.ok(uv && uv.count === p.count, 'every painted surface has authored UVs');
    const indices = mesh.geometry.index;
    const count = indices?.count ?? p.count; triangles += count/3;
    draws += Array.isArray(mesh.material) ? mesh.geometry.groups.length : 1;
    for (let i=0;i<count;i+=3) {
      const points = [0,1,2].map(n => new THREE.Vector3().fromBufferAttribute(p,indices?indices.getX(i+n):i+n).applyMatrix4(mesh.matrixWorld));
      for (const v of points) {
        assert.ok([v.x,v.y,v.z].every(Number.isFinite)); bounds.expandByPoint(v);
        assert.ok(v.y >= -.2 && v.y <= 45 && Math.abs(v.x) <= 210 && v.z >= 5.5 && v.z <= 225,
          'yard is behind gate within planned footprint');
      }
      assert.equal(corridor.intersectsTriangle(new THREE.Triangle(...points)),false,
        'decorative geometry cannot obstruct any current car entering or parking');
    }
  });
  assert.ok(triangles > 1000 && triangles <= 25000, `yard triangles ${triangles}`);
  assert.ok(draws > 0 && draws <= 8, `yard draws ${draws}`);
  const size = bounds.getSize(new THREE.Vector3());
  assert.ok(size.x > 80 && size.z > 80 && size.y > 10, 'yard has spatial depth and tall salvage structures');
});

for (const route of ROUTE_VARIANTS) test(`${route.id}: authored ground contacts stay on existing flat support`, async () => {
  const scene = await asset();
  const course = new Course(COURSE.find(row => row.id === 'pacific-canyon'),route.seed,{hiddenRoad:true});
  const road=course.hiddenRoad, gate=road.poseAt(road.length); let contacts=0;
  scene.traverse(mesh => {
    if (!mesh.isMesh) return;
    const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);
      if(v.y>.3) continue; contacts++;
      const x=gate.x+v.x*Math.cos(gate.heading)+v.z*Math.sin(gate.heading);
      const z=gate.z-v.x*Math.sin(gate.heading)+v.z*Math.cos(gate.heading);
      assert.ok(road.contains(x,z),'authored contact stays inside existing prepared area');
      const near=course.nearest(x,z,gate.s), ground=course.groundAt(near.s,near.lateral);
      assert.ok(Math.abs(ground.y-gate.y)<.3, 'no new ground or floating yard foot');
    }
  });
  assert.ok(contacts>20,'actual grounded structure vertices were checked');
});
