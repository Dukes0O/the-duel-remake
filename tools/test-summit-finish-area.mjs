import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Course} from '../src/course.js';
import {SUMMIT_RUN} from '../src/circuits/summit-run.js';
import {farTerrainGeometry,worldAtExtended} from '../src/world-surfaces.js';
import {farTerrainHeightSampler} from '../src/far-terrain-surface.js';

const course=new Course(SUMMIT_RUN,1989);
const original=new Course({...SUMMIT_RUN,finishArea:false},1989);
assert.deepEqual(course.samples,original.samples,'the arrival terrace never changes the racing road');
const geometry=farTerrainGeometry(course),before=farTerrainGeometry(original);
const p=geometry.attributes.position,b=before.attributes.position;
const end=course.at(course.length),level=course.groundAt(course.length,0).y-.025;
let flat=0,unchanged=0;
for(let i=0;i<p.count;i++){
  const dx=p.getX(i)-end.x,dz=p.getZ(i)-end.z;
  const along=dx*Math.sin(end.heading)+dz*Math.cos(end.heading);
  const off=dx*Math.cos(end.heading)-dz*Math.sin(end.heading);
  if(along>=0&&along<=120&&Math.abs(off)<=28){
    assert.ok(Math.abs(p.getY(i)-level)<.001,'real car-park vertices are level');flat++;
  }
  if(along<=-56||along>=190||Math.abs(off)>=88){
    assert.equal(p.getY(i),b.getY(i),'ground outside the finish patch stays byte-exact');unchanged++;
  }
}
assert.ok(flat>=20&&unchanged>1000,'the test reaches the actual terrace and surrounding mountain');
const height=farTerrainHeightSampler(course);
for(let along=5;along<=115;along+=10)for(const off of [-24,0,24]){
  const point=worldAtExtended(course,course.length+along,off);
  assert.ok(Math.abs(height(point.x,point.z)-level)<.001,'helicopter queries match the drawn flat run-off');
}
const manifest=JSON.parse(readFileSync(new URL('../public/assets/models/circuits/kits/manifest.json',import.meta.url)));
for(const id of ['summit-hut','observatory']){
  const row=SUMMIT_RUN.kitPlacements.find(row=>row.id===id),asset=manifest.pieces.find(row=>row.id===id);
  assert.ok(Math.min(asset.size[0],asset.size[2])*row.scale>=12,'both buildings are at least 12 m across');
  assert.ok(Math.abs(row.lateral)<=20,'both buildings frame the road');
  assert.ok(course.length-row.s<=25,'both buildings frame the finish line');
}
geometry.dispose();before.dispose();
console.log(`Summit finish: ${flat} level vertices, ${unchanged} unchanged mountain vertices, 36 native height queries and both landmark placements passed.`);
