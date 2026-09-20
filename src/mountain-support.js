import {buildMountainSurface, mountainPlacement} from './mountain-surface.js';

// One small local triangle grid per shared silhouette, and one coarse feature
// grid per immutable Course. Queries allocate no geometry and test only nearby
// triangles. Float32 instance matrices match InstancedMesh.setMatrixAt exactly.
const variants=new Map(),courses=new WeakMap(),GRID=32,CELL=256;
function silhouette(variant){
  if(variants.has(variant))return variants.get(variant);
  const {positions,indices}=buildMountainSurface(variant),cells=Array.from({length:GRID*GRID},()=>[]);
  for(let t=0;t<indices.length;t+=3){
    let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;
    for(let i=0;i<3;i++){const n=indices[t+i]*3;x0=Math.min(x0,positions[n]);x1=Math.max(x1,positions[n]);z0=Math.min(z0,positions[n+2]);z1=Math.max(z1,positions[n+2]);}
    for(let z=cell(z0);z<=cell(z1);z++)for(let x=cell(x0);x<=cell(x1);x++)cells[z*GRID+x].push(t);
  }
  const result={positions,indices,cells};variants.set(variant,result);return result;
}
const cell=value=>Math.max(0,Math.min(GRID-1,Math.floor((value+1)*.5*GRID)));
function indexCourse(course){
  if(courses.has(course))return courses.get(course);
  const grid=new Map(),counts=new Map(),themes=new Set(course.sections.map(section=>section.theme));
  for(const feature of course.features.mountains){
    if(feature.theme==='arena'&&!course.def.practice||!themes.has(feature.theme))continue;
    const count=counts.get(feature.theme)||0;counts.set(feature.theme,count+1);
    const entry={feature,variant:count%4,matrix:null},reach=Math.hypot(feature.halfX,feature.halfZ);
    for(let z=Math.floor((feature.z-reach)/CELL);z<=Math.floor((feature.z+reach)/CELL);z++)for(let x=Math.floor((feature.x-reach)/CELL);x<=Math.floor((feature.x+reach)/CELL);x++){
      const key=`${x}:${z}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(entry);
    }
  }
  courses.set(course,grid);return grid;
}
function matrixAt(course,entry){
  if(entry.matrix)return entry.matrix;
  const p=mountainPlacement(course,entry.feature),y=Math.sin(p.heading/2),w=Math.cos(p.heading/2),yy=y*(y+y),wy=w*(y+y);
  return entry.matrix=new Float32Array([(1-yy)*p.sx,-wy*p.sx,wy*p.sz,(1-yy)*p.sz,p.x,p.y,p.z,p.sy]);
}

export function sampleMountainSupport(course,x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))return null;
  const entries=indexCourse(course).get(`${Math.floor(x/CELL)}:${Math.floor(z/CELL)}`);
  let top=null;
  for(const entry of entries||[]){
    const f=entry.feature,reach=Math.max(f.halfX,f.halfZ)+.01;
    if(Math.abs(x-f.x)>reach||Math.abs(z-f.z)>reach)continue;
    const m=matrixAt(course,entry),dx=x-m[4],dz=z-m[6],det=m[0]*m[3]-m[1]*m[2];
    const lx=(dx*m[3]-dz*m[2])/det,lz=(dz*m[0]-dx*m[1])/det;
    if(Math.abs(lx)>1.000001||Math.abs(lz)>1.000001||lx*lx+lz*lz>1.000002)continue;
    const {positions:p,indices,cells}=silhouette(entry.variant);
    for(const t of cells[cell(lz)*GRID+cell(lx)]){
      const a=indices[t]*3,b=indices[t+1]*3,c=indices[t+2]*3;
      const abx=p[b]-p[a],abz=p[b+2]-p[a+2],acx=p[c]-p[a],acz=p[c+2]-p[a+2],qx=lx-p[a],qz=lz-p[a+2],den=abx*acz-abz*acx;
      const u=(qx*acz-qz*acx)/den,v=(abx*qz-abz*qx)/den;
      if(u< -1e-7||v< -1e-7||u+v>1.0000001)continue;
      const height=(p[a+1]+u*(p[b+1]-p[a+1])+v*(p[c+1]-p[a+1]))*m[7]+m[5];
      if(top===null||height>top)top=height;
      break;
    }
  }
  return top;
}
