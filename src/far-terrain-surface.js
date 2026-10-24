import { createPolylineIndex } from './polyline-index.js';
import { freestyleSurfaceHeightAt } from './freestyle-course.js';

// Read the exact far-terrain grid and triangle diagonal without allocating a
// render mesh. Null means that quad is omitted beneath the near-road ribbon.
// Shared by scenery grounding; test-terrain checks against the actual buffers.
const surfaceCache = new WeakMap();
const FAR_KEY = 1048576;
export function farTerrainHeightSampler(course) {
  if(surfaceCache.has(course.samples))return surfaceCache.get(course.samples);
  if(course.def.practice){const sample=(x,z)=>freestyleSurfaceHeightAt(course,x,z);surfaceCache.set(course.samples,sample);return sample;}
  const grid=(course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena||course.def.expansion||course.def.terrainHalfWidth===64?16:32,threshold=course.def.arena?18:(course.def.expansion||course.def.terrainHalfWidth===64)?40:(course.def.kind==='chase'||course.def.layout==='city')?50:80;
  const route=course.samples.filter((_,i)=>i%4===0),last=course.samples.at(-1),vertices=new Map();if(route.at(-1)!==last)route.push(last);
  const routeIndex=createPolylineIndex(route);
  const vertex=(i,j)=>{
    const key=i*FAR_KEY+j;if(vertices.has(key))return vertices.get(key);
    const x=i*grid,z=j*grid,{index,t,distanceSq:best}=routeIndex.query(x,z);
    const a=route[index-1],b=route[index],dx=b.x-a.x,dz=b.z-a.z,px=x-a.x-t*dx,pz=z-a.z-t*dz;
    const roadS=a.s+(b.s-a.s)*t,off=Math.sqrt(best)*Math.sign(px*dz-pz*dx);
    // The height is the costly part and a quad too near the road is skipped
    // without it, so each corner computes it only when a sample needs it.
    const result={distance:Math.sqrt(best),height:null,heightAt(){
      return this.height??(this.height=Math.fround((course.farGroundY?course.farGroundY(x,z,roadS,off):course.groundAt(roadS,off).y)-.15));
    }};vertices.set(key,result);return result;
  };
  const sample=(x,z)=>{
    const i=Math.floor(x/grid),j=Math.floor(z/grid),u=x/grid-i,v=z/grid-j;
    const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);
    if(a.distance<=threshold||b.distance<=threshold||c.distance<=threshold||d.distance<=threshold)return null;
    return u+v<=1?a.heightAt()*(1-u-v)+b.heightAt()*u+c.heightAt()*v:b.heightAt()*(1-v)+c.heightAt()*(1-u)+d.heightAt()*(u+v-1);
  };
  surfaceCache.set(course.samples,sample);return sample;
}
