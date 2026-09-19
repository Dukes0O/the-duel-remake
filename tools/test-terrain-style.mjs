import assert from 'node:assert/strict';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {terrainStyleAt} from '../src/terrain-style.js';
import {terrainGeometry} from '../src/world.js';

let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
for(const def of COURSE){
  const course=new Course(def,1989);
  for(const section of course.sections){
    for(const s of [section.start,section.start+50,section.start+100,section.end]){
      const style=terrainStyleAt(course,s);
      check(Math.abs(style.weights.reduce((a,b)=>a+b,0)-1)<1e-9,'Terrain textures keep a normalized brightness');
      check(style.weights.every(w=>w>=0&&w<=1),'Texture blend has valid proportions');
    }
    const a=terrainStyleAt(course,section.start-.001),b=terrainStyleAt(course,section.start+.001);
    check(a.weights.every((value,index)=>Math.abs(value-b.weights[index])<1e-6),'No texture jump across an environment boundary or lap seam');
    check(['r','g','b'].every(axis=>Math.abs(a.color[axis]-b.color[axis])<1e-6),'No colour jump across an environment boundary or lap seam');
  }
  const geometry=terrainGeometry(course,false),weights=geometry.attributes.biomeWeights;
  check(weights.count===geometry.attributes.position.count,'Every rendered terrain vertex has blend weights');
  for(let i=0;i<weights.count;i+=29){
    check(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)-1)<1e-6,'Rendered interpolation remains normalized');
  }
  geometry.dispose();
}
console.log(`Terrain style: ${checks} continuous biome and rendered vertex checks passed.`);
