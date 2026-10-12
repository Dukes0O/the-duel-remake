import { farTerrainHeightSampler } from './far-terrain-surface.js';
import { ribbonGroundAt } from './ribbon-ground.js';

// Plant roots can fall between lateral terrain vertices. Read the rendered
// Float32 triangles, not an analytic height on a surface that is not drawn.
// Rows/vertices are built lazily and shared by one course's scenery builders;
// this is construction/contact work, never a per-frame scene scan.
const terrainRows=new WeakMap();
const authoredBounds=new WeakMap();
const authoredRibbon=new WeakMap();
function insideAuthoredFarGrid(course,point){
  let bounds=authoredBounds.get(course.samples);
  if(!bounds){
    const route=course.samples.filter((_,i)=>i%4===0);
    if(route.at(-1)!==course.samples.at(-1))route.push(course.samples.at(-1));
    const grid=16,extent=1100;
    const xs=route.map(p=>p.x),zs=route.map(p=>p.z);
    const minX=Math.floor((Math.min(...xs)-extent)/grid)*grid;
    const minZ=Math.floor((Math.min(...zs)-extent)/grid)*grid;
    bounds={minX,minZ,maxX:minX+Math.ceil((Math.max(...xs)+extent-minX)/grid)*grid,
      maxZ:minZ+Math.ceil((Math.max(...zs)+extent-minZ)/grid)*grid};
    authoredBounds.set(course.samples,bounds);
  }
  return point.x>=bounds.minX&&point.x<bounds.maxX&&point.z>=bounds.minZ&&point.z<bounds.maxZ;
}
export function renderedGroundHeight(course,point,{requireSurface=false}={}){
  const authored64=course.def.terrainHalfWidth===64&&!course.def.expansion;
  const farHeight=course.def.expansion||(authored64&&insideAuthoredFarGrid(course,point))
    ?farTerrainHeightSampler(course)(point.x,point.z):null;
  const visibleHeight=near=>farHeight===null?near:Math.max(near,farHeight);
  let rows=terrainRows.get(course.samples);
  if(!rows){rows=new Map();terrainRows.set(course.samples,rows);}
  const step=course.def.offroad?2:4;
  const row=s=>{
    if(rows.has(s))return rows.get(s);
    const offsets=course.def.expansion||authored64?[-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]:[-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
    if(course.def.offroad){const width=course.roadHalfWidthAt(s),segments=Math.ceil(width*2);for(let i=0;i<=segments;i++)offsets.push(-width+width*2*i/segments);}
    for(const cut of course.features.shortcuts){
      const center=course.shortcutOffset(cut,s);
      for(const off of[-cut.halfWidth-9,-cut.halfWidth-3,0,cut.halfWidth+3,cut.halfWidth+9])offsets.push(center+off);
      if(course.def.offroad){const segments=Math.ceil(cut.halfWidth*2);for(let i=0;i<=segments;i++)offsets.push(center-cut.halfWidth+cut.halfWidth*2*i/segments);}
    }
    offsets.sort((a,b)=>a-b);
    const points=offsets.map(off=>{const p=ribbonGroundAt(course,s,off);return{x:Math.fround(p.x),y:Math.fround(p.y),z:Math.fround(p.z)};});
    rows.set(s,points);return points;
  };
  const height=(a,b,c)=>{
    const dx=b.x-a.x,dz=b.z-a.z,ex=c.x-a.x,ez=c.z-a.z,px=point.x-a.x,pz=point.z-a.z,det=dx*ez-dz*ex;
    if(Math.abs(det)<1e-9)return null;
    const u=(px*ez-pz*ex)/det,v=(dx*pz-dz*px)/det;
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7?a.y+u*(b.y-a.y)+v*(c.y-a.y):null;
  };
  if(authored64){
    // Authored hairpins can overlap another ribbon section. Search its actual
    // Float32 row bounds in world space and take the upper drawn triangle.
    let cells=authoredRibbon.get(course.samples);
    if(!cells){
      cells=[];
      for(let s=0;s+step<=course.length;s+=step){
        const previous=row(s),next=row(s+step),points=[...previous,...next];
        cells.push({previous,next,minX:Math.min(...points.map(p=>p.x)),
          maxX:Math.max(...points.map(p=>p.x)),minZ:Math.min(...points.map(p=>p.z)),
          maxZ:Math.max(...points.map(p=>p.z))});
      }
      authoredRibbon.set(course.samples,cells);
    }
    let result=farHeight;
    for(const cell of cells){
      if(point.x<cell.minX||point.x>cell.maxX||point.z<cell.minZ||point.z>cell.maxZ)continue;
      const {previous,next}=cell;
      for(let i=1;i<next.length;i++){
        for(const value of [height(previous[i-1],next[i-1],previous[i]),
          height(previous[i],next[i-1],next[i])])
          if(value!==null)result=result===null?value:Math.max(result,value);
      }
    }
    return result??(requireSurface?null:course.groundAt(point.s,point.off).y);
  }
  const start=Math.floor(point.s/step)*step;
  for(const s of[start,start-step,start+step]){
    if(s<0||s+step>course.length)continue;
    const previous=row(s),next=row(s+step);
    for(let i=1;i<next.length;i++){
      const first=height(previous[i-1],next[i-1],previous[i]);
      if(first!==null)return visibleHeight(first);
      const second=height(previous[i],next[i-1],next[i]);
      if(second!==null)return visibleHeight(second);
    }
  }
  return farHeight??(requireSurface?null:course.groundAt(point.s,point.off).y);
}
