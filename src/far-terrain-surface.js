import { createPolylineIndex } from './polyline-index.js';
import { freestyleSurfaceHeightAt } from './freestyle-course.js';
import { summitFinishGround } from './summit-finish-ground.js';

// Read the exact far-terrain grid and triangle diagonal without allocating a
// render mesh. Null means that quad is omitted beneath the near-road ribbon.
// Shared by scenery grounding; test-terrain checks against the actual buffers.
const surfaceCache = new WeakMap();
// The far-terrain geometry computes every grid corner anyway, with these same formulas. It hands the grid over here
// (seedFarTerrain), so a lookup reads the corner it needs instead of working it out again. Corners outside the
// grid, or lookups made before the geometry exists, are worked out as before.
const seededGrid = new WeakMap();
export function seedFarTerrain(course, grid, firstColumn, firstRow, columns, rows, heights, distances) {
  seededGrid.set(course.samples, { grid, firstColumn, firstRow, columns, rows, heights, distances });
}
const FAR_KEY = 1048576;
const roadCaps = new WeakMap();
// The continuous backing must stay below every road crossing its coarse cells.
// Scatter the unchanged road samples onto neighbouring grid corners once.
export function farTerrainCornerHeight(course,x,z,s,off,grid) {
  let height=(course.farGroundY?course.farGroundY(x,z,s,off):course.groundAt(s,off).y)-.15;
  if(!course.def.scenery?.continuousGround)return summitFinishGround(course,x,z,height);
  let caps=roadCaps.get(course.samples);
  if(!caps){
    caps=new Map();const radius=grid*Math.SQRT2+8;
    const capAround=p=>{
      for(let i=Math.ceil((p.x-radius)/grid);i<=Math.floor((p.x+radius)/grid);i++)
        for(let j=Math.ceil((p.z-radius)/grid);j<=Math.floor((p.z+radius)/grid);j++){
          if(Math.hypot(i*grid-p.x,j*grid-p.z)>radius)continue;
          const key=i*FAR_KEY+j;
          caps.set(key,Math.min(caps.get(key)??Infinity,p.y-.4));
        }
    };
    for(const p of course.samples){
      capAround(p);
      for(const cut of course.features.shortcuts){
        if(p.s<cut.start||p.s>cut.end)continue;
        capAround(course.groundAt(p.s,course.shortcutOffset(cut,p.s)));
      }
    }
    roadCaps.set(course.samples,caps);
  }
  return summitFinishGround(course,x,z,Math.min(height,caps.get(Math.round(x/grid)*FAR_KEY+Math.round(z/grid))??Infinity));
}
export function farTerrainHeightSampler(course) {
  if(surfaceCache.has(course.samples))return surfaceCache.get(course.samples);
  if(course.def.practice){const sample=(x,z)=>freestyleSurfaceHeightAt(course,x,z);surfaceCache.set(course.samples,sample);return sample;}
  const grid=(course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena||course.def.expansion||course.def.terrainHalfWidth===64?16:32,threshold=course.def.arena?18:(course.def.expansion||course.def.terrainHalfWidth===64)?40:(course.def.kind==='chase'||course.def.layout==='city')?50:80;
  const route=course.samples.filter((_,i)=>i%4===0),last=course.samples.at(-1),vertices=new Map();if(route.at(-1)!==last)route.push(last);
  const routeIndex=createPolylineIndex(route);
  const vertex=(i,j)=>{
    const key=i*FAR_KEY+j;if(vertices.has(key))return vertices.get(key);
    const seeded=seededGrid.get(course.samples);
    if(seeded&&seeded.grid===grid){
      const column=i-seeded.firstColumn,row=j-seeded.firstRow;
      if(column>=0&&row>=0&&column<seeded.columns&&row<seeded.rows){
        const k=row*seeded.columns+column,result={distance:seeded.distances[k],height:seeded.heights[k],heightAt(){return this.height;}};
        vertices.set(key,result);return result;
      }
    }
    const x=i*grid,z=j*grid,{index,t,distanceSq:best}=routeIndex.lookup(x,z);
    const a=route[index-1],b=route[index],dx=b.x-a.x,dz=b.z-a.z,px=x-a.x-t*dx,pz=z-a.z-t*dz;
    const roadS=a.s+(b.s-a.s)*t,off=Math.sqrt(best)*Math.sign(px*dz-pz*dx);
    // The height is the costly part and a quad too near the road is skipped
    // without it, so each corner computes it only when a sample needs it.
    const result={distance:Math.sqrt(best),height:null,heightAt(){
      return this.height??(this.height=Math.fround(farTerrainCornerHeight(course,x,z,roadS,off,grid)));
    }};vertices.set(key,result);return result;
  };
  const sample=(x,z)=>{
    const i=Math.floor(x/grid),j=Math.floor(z/grid),u=x/grid-i,v=z/grid-j;
    // Inside the geometry's own grid the four corners are plain array reads (the same numbers, no objects).
    const seeded=seededGrid.get(course.samples);
    if(seeded&&seeded.grid===grid){
      const column=i-seeded.firstColumn,row=j-seeded.firstRow;
      if(column>=0&&row>=0&&column+1<seeded.columns&&row+1<seeded.rows){
        const k=row*seeded.columns+column,n=k+seeded.columns,distances=seeded.distances,heights=seeded.heights;
        if(!course.def.scenery?.continuousGround&&(distances[k]<=threshold||distances[k+1]<=threshold||distances[n]<=threshold||distances[n+1]<=threshold))return null;
        return u+v<=1?heights[k]*(1-u-v)+heights[k+1]*u+heights[n]*v:heights[k+1]*(1-v)+heights[n]*(1-u)+heights[n+1]*(u+v-1);
      }
    }
    const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);
    if(!course.def.scenery?.continuousGround&&(a.distance<=threshold||b.distance<=threshold||c.distance<=threshold||d.distance<=threshold))return null;
    return u+v<=1?a.heightAt()*(1-u-v)+b.heightAt()*u+c.heightAt()*v:b.heightAt()*(1-v)+c.heightAt()*(1-u)+d.heightAt()*(u+v-1);
  };
  surfaceCache.set(course.samples,sample);return sample;
}
