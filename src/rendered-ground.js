import { farTerrainHeightSampler } from './far-terrain-surface.js';

// Plant roots can fall between lateral terrain vertices. Read the rendered
// Float32 triangles, not an analytic height on a surface that is not drawn.
// Rows/vertices are built lazily and shared by one course's scenery builders;
// this is construction/contact work, never a per-frame scene scan.
const terrainRows=new WeakMap();
export function renderedGroundHeight(course,point){
  const farHeight=course.def.expansion?farTerrainHeightSampler(course)(point.x,point.z):null;
  const visibleHeight=near=>farHeight===null?near:Math.max(near,farHeight);
  let rows=terrainRows.get(course.samples);
  if(!rows){rows=new Map();terrainRows.set(course.samples,rows);}
  const step=course.def.offroad?2:4;
  const row=s=>{
    if(rows.has(s))return rows.get(s);
    const offsets=course.def.expansion?[-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]:[-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
    if(course.def.offroad){const width=course.roadHalfWidthAt(s),segments=Math.ceil(width*2);for(let i=0;i<=segments;i++)offsets.push(-width+width*2*i/segments);}
    for(const cut of course.features.shortcuts){
      const center=course.shortcutOffset(cut,s);
      for(const off of[-cut.halfWidth-9,-cut.halfWidth-3,0,cut.halfWidth+3,cut.halfWidth+9])offsets.push(center+off);
      if(course.def.offroad){const segments=Math.ceil(cut.halfWidth*2);for(let i=0;i<=segments;i++)offsets.push(center-cut.halfWidth+cut.halfWidth*2*i/segments);}
    }
    offsets.sort((a,b)=>a-b);
    const points=offsets.map(off=>{const p=course.groundAt(s,off);return{x:Math.fround(p.x),y:Math.fround(p.y),z:Math.fround(p.z)};});
    rows.set(s,points);return points;
  };
  const height=(a,b,c)=>{
    const dx=b.x-a.x,dz=b.z-a.z,ex=c.x-a.x,ez=c.z-a.z,px=point.x-a.x,pz=point.z-a.z,det=dx*ez-dz*ex;
    if(Math.abs(det)<1e-9)return null;
    const u=(px*ez-pz*ex)/det,v=(dx*pz-dz*px)/det;
    return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7?a.y+u*(b.y-a.y)+v*(c.y-a.y):null;
  };
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
  return farHeight??course.groundAt(point.s,point.off).y;
}
