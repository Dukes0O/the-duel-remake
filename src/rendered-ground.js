import { farTerrainHeightSampler } from './far-terrain-surface.js';
import { ribbonGroundAt } from './ribbon-ground.js';

// Plant roots can fall between lateral terrain vertices. Read the rendered
// Float32 triangles, not an analytic height on a surface that is not drawn.
// Rows/vertices are built lazily and shared by one course's scenery builders;
// this is construction/contact work, never a per-frame scene scan.
const terrainRows=new WeakMap();
const authoredBounds=new WeakMap();
const authoredRibbon=new WeakMap();
const partialRows=new WeakMap();
const BUCKET=8;
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
// The columns of one ribbon row, shared by the reader below and by terrainGeometry,
// which seeds the rows it has already computed instead of having them built twice.
function rowOffsets(course,s){
  const authored64=course.def.terrainHalfWidth===64&&!course.def.expansion;
  const offsets=course.def.expansion||authored64?[-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]:[-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
  if(course.def.offroad){const width=course.roadHalfWidthAt(s),segments=Math.ceil(width*2);for(let i=0;i<=segments;i++)offsets.push(-width+width*2*i/segments);}
  for(const cut of course.features.shortcuts){
    const center=course.shortcutOffset(cut,s);
    for(const off of[-cut.halfWidth-9,-cut.halfWidth-3,0,cut.halfWidth+3,cut.halfWidth+9])offsets.push(center+off);
    if(course.def.offroad){const segments=Math.ceil(cut.halfWidth*2);for(let i=0;i<=segments;i++)offsets.push(center-cut.halfWidth+cut.halfWidth*2*i/segments);}
  }
  offsets.sort((a,b)=>a-b);
  return offsets;
}
// A ground row is a Float32Array of x, y, z per column, in offset order, so its values are exactly
// the Math.fround'ed positions the terrain buffer holds; `offsets` rides along as a property.
// `points` are the row's drawn Float32 positions, three numbers per offset.
export function seedGroundRow(course,s,offsets,points){
  let rows=terrainRows.get(course.samples);
  if(!rows){rows=new Map();terrainRows.set(course.samples,rows);}
  if(rows.has(s))return;
  const own=rowOffsets(course,s);
  if(own.length===offsets.length&&own.every((off,i)=>off===offsets[i])){points.offsets=offsets;rows.set(s,points);return;}
  // The reader's row has other columns than the drawn one (a chase or city course draws fewer). The columns they
  // share are the same numbers, so keep the drawn row to copy from and work out only the extra columns later.
  let partial=partialRows.get(course.samples);
  if(!partial){partial=new Map();partialRows.set(course.samples,partial);}
  partial.set(s,{offsets,points});
}
function computeRow(course,s){
  const offsets=rowOffsets(course,s),points=new Float32Array(offsets.length*3);
  const drawn=partialRows.get(course.samples)?.get(s);
  let j=0;
  for(let i=0;i<offsets.length;i++){
    const off=offsets[i];
    if(drawn){while(j<drawn.offsets.length&&drawn.offsets[j]<off)j++;}
    if(drawn&&j<drawn.offsets.length&&drawn.offsets[j]===off){points[3*i]=drawn.points[3*j];points[3*i+1]=drawn.points[3*j+1];points[3*i+2]=drawn.points[3*j+2];}
    else{const p=ribbonGroundAt(course,s,off);points[3*i]=p.x;points[3*i+1]=p.y;points[3*i+2]=p.z;}
  }
  points.offsets=offsets;
  return points;
}
function groundRows(course){
  let rows=terrainRows.get(course.samples);
  if(!rows){rows=new Map();terrainRows.set(course.samples,rows);}
  return rows;
}
function rowAt(course,rows,s){
  let row=rows.get(s);
  if(row===undefined){row=computeRow(course,s);rows.set(s,row);}
  return row;
}
// The drawn quads of the authored ribbon, found by world position. Each quad is two triangles
// (a,b,c) and (c,b,d) of two neighbouring rows; a lookup tests only the quads whose box holds
// the point. The answer is a maximum over those triangles, so the order cannot change it.
// Buckets are a dense grid in compressed form (counts, then start offsets): no per-quad objects.
// Height of the point (px,pz) on the triangle through columns ia, ib, ic of rows A, B, C (null if it is outside it).
function triangleHeight(px0,pz0,A,ia,B,ib,C,ic){
  const ax=A[ia],ay=A[ia+1],az=A[ia+2];
  const dx=B[ib]-ax,dz=B[ib+2]-az,ex=C[ic]-ax,ez=C[ic+2]-az,px=px0-ax,pz=pz0-az,det=dx*ez-dz*ex;
  if(Math.abs(det)<1e-9)return null;
  const u=(px*ez-pz*ex)/det,v=(dx*pz-dz*px)/det;
  return u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7?ay+u*(B[ib+1]-ay)+v*(C[ic+1]-ay):null;
}
function buildQuadIndex(course,rows,step){
  const previousRows=[],nextRows=[];
  for(let s=0;s<course.length;s+=step){
    const end=Math.min(s+step,course.length);
    if(end<s+step&&!course.def.ridgeLandform&&course.def.completeTerrainRibbon!==true)break;
    previousRows.push(rowAt(course,rows,s));nextRows.push(rowAt(course,rows,end));
  }
  let quads=0;
  for(let r=0;r<previousRows.length;r++)quads+=nextRows[r].length/3-1;
  const quadRow=new Int32Array(quads),quadColumn=new Int32Array(quads);
  const minX=new Float64Array(quads),maxX=new Float64Array(quads),minZ=new Float64Array(quads),maxZ=new Float64Array(quads);
  let q=0,lowX=Infinity,highX=-Infinity,lowZ=Infinity,highZ=-Infinity;
  for(let r=0;r<previousRows.length;r++){
    const P=previousRows[r],N=nextRows[r],columns=N.length/3;
    for(let i=1;i<columns;i++,q++){
      // a=previous[i-1], b=next[i-1], c=previous[i], d=next[i]; the box of the four corners
      const ax=P[3*i-3],bx=N[3*i-3],cx=P[3*i],dx=N[3*i],az=P[3*i-1],bz=N[3*i-1],cz=P[3*i+2],dz=N[3*i+2];
      let x0=ax,x1=ax,z0=az,z1=az;
      if(bx<x0)x0=bx;else if(bx>x1)x1=bx;if(cx<x0)x0=cx;else if(cx>x1)x1=cx;if(dx<x0)x0=dx;else if(dx>x1)x1=dx;
      if(bz<z0)z0=bz;else if(bz>z1)z1=bz;if(cz<z0)z0=cz;else if(cz>z1)z1=cz;if(dz<z0)z0=dz;else if(dz>z1)z1=dz;
      quadRow[q]=r;quadColumn[q]=i;minX[q]=x0;maxX[q]=x1;minZ[q]=z0;maxZ[q]=z1;
      if(x0<lowX)lowX=x0;if(x1>highX)highX=x1;if(z0<lowZ)lowZ=z0;if(z1>highZ)highZ=z1;
    }
  }
  // A wider bucket only means a few more candidates per lookup; widen until the grid is a modest size.
  let bucket=BUCKET;
  while(quads&&(Math.floor(highX/bucket)-Math.floor(lowX/bucket)+1)*(Math.floor(highZ/bucket)-Math.floor(lowZ/bucket)+1)>1500000)bucket*=2;
  const nx=quads?Math.floor(highX/bucket)-Math.floor(lowX/bucket)+1:1,nz=quads?Math.floor(highZ/bucket)-Math.floor(lowZ/bucket)+1:1;
  const gx=quads?Math.floor(lowX/bucket):0,gz=quads?Math.floor(lowZ/bucket):0;
  const starts=new Int32Array(nx*nz+1);
  // The buckets each quad's box touches: counted, then filled in the same order (a counting sort).
  for(let k=0;k<quads;k++){
    const x1=Math.floor(maxX[k]/bucket)-gx,z1=Math.floor(maxZ[k]/bucket)-gz,z0=Math.floor(minZ[k]/bucket)-gz;
    for(let bx=Math.floor(minX[k]/bucket)-gx;bx<=x1;bx++)for(let bz=z0;bz<=z1;bz++)starts[bx*nz+bz+1]++;
  }
  for(let c=0;c<nx*nz;c++)starts[c+1]+=starts[c];
  const fill=starts.slice(0,nx*nz),members=new Int32Array(starts[nx*nz]);
  for(let k=0;k<quads;k++){
    const x1=Math.floor(maxX[k]/bucket)-gx,z1=Math.floor(maxZ[k]/bucket)-gz,z0=Math.floor(minZ[k]/bucket)-gz;
    for(let bx=Math.floor(minX[k]/bucket)-gx;bx<=x1;bx++)for(let bz=z0;bz<=z1;bz++)members[fill[bx*nz+bz]++]=k;
  }
  return {previousRows,nextRows,quadRow,quadColumn,minX,maxX,minZ,maxZ,bucket,nx,nz,gx,gz,starts,members};
}
export function renderedGroundHeight(course,point,{requireSurface=false}={}){
  const authored64=course.def.terrainHalfWidth===64&&!course.def.expansion;
  const farHeight=course.def.expansion||(authored64&&insideAuthoredFarGrid(course,point))
    ?farTerrainHeightSampler(course)(point.x,point.z):null;
  const visibleHeight=near=>farHeight===null?near:Math.max(near,farHeight);
  const rows=groundRows(course);
  const step=course.def.offroad?2:4;
  const px0=point.x,pz0=point.z;
  if(authored64){
    // Authored hairpins can overlap another ribbon section. Search its actual
    // Float32 row bounds in world space and take the upper drawn triangle.
    let index=authoredRibbon.get(course.samples);
    if(!index){index=buildQuadIndex(course,rows,step);authoredRibbon.set(course.samples,index);}
    let result=farHeight;
    const bx=Math.floor(px0/index.bucket)-index.gx,bz=Math.floor(pz0/index.bucket)-index.gz;
    if(bx>=0&&bz>=0&&bx<index.nx&&bz<index.nz){
      const cell=bx*index.nz+bz,end=index.starts[cell+1];
      for(let m=index.starts[cell];m<end;m++){
        const k=index.members[m];
        if(px0<index.minX[k]||px0>index.maxX[k]||pz0<index.minZ[k]||pz0>index.maxZ[k])continue;
        const P=index.previousRows[index.quadRow[k]],N=index.nextRows[index.quadRow[k]],i=index.quadColumn[k];
        const first=triangleHeight(px0,pz0,P,3*i-3,N,3*i-3,P,3*i),second=triangleHeight(px0,pz0,P,3*i,N,3*i-3,N,3*i);
        if(first!==null)result=result===null?first:Math.max(result,first);
        if(second!==null)result=result===null?second:Math.max(result,second);
      }
    }
    return result??(requireSurface?null:course.groundAt(point.s,point.off).y);
  }
  const start=Math.floor(point.s/step)*step;
  for(const s of[start,start-step,start+step]){
    if(s<0||s+step>course.length)continue;
    const previous=rowAt(course,rows,s),next=rowAt(course,rows,s+step);
    const columns=next.length/3;
    // The column holding the point's own lateral offset almost always holds the
    // point; looking there first finds the same triangle without the full scan.
    if(Number.isFinite(point.off)){
      const {offsets}=previous;let low=0,high=offsets.length;
      while(low<high){const mid=(low+high)>>1;if(offsets[mid]<point.off)low=mid+1;else high=mid;}
      for(let i=Math.max(1,low-1);i<=Math.min(columns-1,low+1);i++){
        const first=triangleHeight(px0,pz0,previous,3*i-3,next,3*i-3,previous,3*i);
        if(first!==null)return visibleHeight(first);
        const second=triangleHeight(px0,pz0,previous,3*i,next,3*i-3,next,3*i);
        if(second!==null)return visibleHeight(second);
      }
    }
    for(let i=1;i<columns;i++){
      const first=triangleHeight(px0,pz0,previous,3*i-3,next,3*i-3,previous,3*i);
      if(first!==null)return visibleHeight(first);
      const second=triangleHeight(px0,pz0,previous,3*i,next,3*i-3,next,3*i);
      if(second!==null)return visibleHeight(second);
    }
  }
  return farHeight??(requireSurface?null:course.groundAt(point.s,point.off).y);
}
