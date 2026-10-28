import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {terrainGeometry,farTerrainGeometry} from '../src/world-surfaces.js';
import {farTerrainHeightSampler} from '../src/far-terrain-surface.js';
import {trackSnapshotPose} from '../src/track-analysis.js';

const course=new Course(SUMMIT_RUN,1989);
const original=new Course({...SUMMIT_RUN,scenery:{...SUMMIT_RUN.scenery,continuousGround:false}},1989);
const features=JSON.stringify(course.features);
assert.deepEqual(course.samples,original.samples,'repair preserves the entire road');
assert.deepEqual(course.features,original.features,'repair preserves physical scenery and collisions');
const near=terrainGeometry(course),far=farTerrainGeometry(course),backing=farTerrainHeightSampler(course);
assert.equal(JSON.stringify(course.features),features,'building the hillside never changes race features');
for(let s=0;s<course.length;s+=2){
  const width=course.roadHalfWidthAt(s);
  for(const off of [-width,0,width]){
    const p=course.groundAt(s,off);
    assert.ok(backing(p.x,p.z)<p.y,`backing stays below main road at ${s}/${off}`);
  }
  for(const cut of course.features.shortcuts){
    if(s<cut.start||s>cut.end)continue;
    for(const delta of [-cut.halfWidth,0,cut.halfWidth]){
      const p=course.groundAt(s,course.shortcutOffset(cut,s)+delta);
      assert.ok(backing(p.x,p.z)<p.y,`backing stays below ${cut.id} at ${s}/${delta}`);
    }
  }
}
// These rays looked through the missing hillside into distant terrain.
const pose=trackSnapshotPose(course,{snapshotS:5620,camera:{up:2.5,ahead:90}});
const camera=new THREE.PerspectiveCamera(58,960/540,.1,10000);
camera.position.copy(pose.position);camera.lookAt(pose.target.x,pose.target.y,pose.target.z);camera.updateMatrixWorld();
const meshes=[near,far].map(g=>new THREE.Mesh(g,new THREE.MeshBasicMaterial()));
for(const mesh of meshes)mesh.updateMatrixWorld();
const ray=new THREE.Raycaster();
for(const [x,y] of [[320,170],[370,180],[395,185]]){
  ray.setFromCamera(new THREE.Vector2(x/480-1,1-y/270),camera);
  assert.ok(ray.intersectObjects(meshes)[0]?.distance<300,'visible local hillside closes the old opening');
}
// No new vertical terrain face may stand through a road centre, including
// the snowy approach where an outer hairpin ribbon folds across the road.
for(let s=0;s<course.length;s+=4){
  const p=course.groundAt(s,0);
  ray.set(new THREE.Vector3(p.x,p.y+.1,p.z),new THREE.Vector3(0,1,0));
  ray.far=2;
  assert.equal(ray.intersectObjects(meshes).length,0,`terrain leaves headroom at ${s}`);
}
console.log('Summit ground gaps: local hillside support, main/branch clearance, headroom and unchanged physics passed.');
