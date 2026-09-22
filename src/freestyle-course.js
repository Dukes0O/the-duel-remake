// Original, untimed quarry playground. Surface definitions are shared by the
// rendered terrain and driving physics; no invisible launch impulses.
export const FREESTYLE_COURSE=Object.freeze({
  id:'titan-freestyle',name:'Titan Freestyle Playground',theme:'arena',stage:15,
  layout:'freestyle-quarry',layoutVersion:2,layoutSeed:1989,lengthU:1280,
  closed:true,laps:2,kind:'arena',arena:true,practice:true,offroad:true,airborne:true,
  requiredCar:'titan_monster',hasRival:false,hasRadar:false,speedLimitMph:100,
  defaultMood:'golden',sections:[{theme:'arena',name:'Quarry Playground',share:1}],
});
const layouts=new WeakMap();
const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
export const FREESTYLE_DRAG=Object.freeze({startX:100,endX:4100,runoutEndX:4700,halfWidth:16,z:0});
export function onFreestyleDrag(x,z){return x>=0&&x<=FREESTYLE_DRAG.runoutEndX&&Math.abs(z)<=FREESTYLE_DRAG.halfWidth;}

export function freestyleLayout(course){
  if(layouts.has(course))return layouts.get(course);
  const mound=(id,s,off,halfX,halfZ,height)=>({id,s,off,...course.worldAt(s,off),halfX,halfZ,height});
  const mounds=[mound('warmup-jump',180,0,16,27,3.4),mound('cross-table',460,-35,20,34,5.8),
    mound('big-air',770,0,18,38,8.2),mound('summit-climb',1030,-65,42,48,44)];
  const xs=course.samples.map(p=>p.x),zs=course.samples.map(p=>p.z);
  const result={mounds,bounds:{minX:Math.min(...xs)-180,maxX:Math.max(...xs)+180,minZ:Math.min(...zs)-180,maxZ:Math.max(...zs)+180}};
  layouts.set(course,result);return result;
}

export function freestyleHeightAt(course,x,z){
  let height=0;
  for(const mound of freestyleLayout(course).mounds){
    const dx=x-mound.x,dz=z-mound.z,c=Math.cos(mound.heading),s=Math.sin(mound.heading);
    const across=(c*dx-s*dz)/mound.halfX,along=(s*dx+c*dz)/mound.halfZ;
    if(Math.abs(across)>=1||Math.abs(along)>=1)continue;
    const flank=mound.id==='summit-climb'?Math.cos(across*Math.PI*.5)**2:1-smooth((Math.abs(across)-.58)/.42);
    height=Math.max(height,mound.height*Math.cos(along*Math.PI*.5)**2*flank);
  }
  return height;
}

// Match the two-metre render grid's triangle diagonal exactly, including at
// sharp mound shoulders. Driving, wheel support and mesh bases share this.
export function freestyleSurfaceHeightAt(course,x,z){
  const step=2,x0=Math.floor(x/step)*step,z0=Math.floor(z/step)*step;
  const u=(x-x0)/step,v=(z-z0)/step,a=freestyleHeightAt(course,x0,z0),b=freestyleHeightAt(course,x0+step,z0),c=freestyleHeightAt(course,x0,z0+step);
  if(u+v<=1)return a+(b-a)*u+(c-a)*v;
  const d=freestyleHeightAt(course,x0+step,z0+step);return d+(c-d)*(1-u)+(b-d)*(1-v);
}

export function buildFreestyleFeatures(course){
  const f=course.features,layout=freestyleLayout(course);
  f.practiceMounds=layout.mounds;
  for(const mound of layout.mounds.slice(0,3))f.ramps.push({start:mound.s-mound.halfZ,end:mound.s+mound.halfZ,height:mound.height,off:mound.off,halfWidth:mound.halfX});
  for(const [row,s,off]of[[0,305,-7],[1,585,-28],[2,865,8]])for(let i=0;i<4;i++){
    const distance=s+i*5.7,p=course.groundAt(distance,off);
    f.crushables.push({id:`practice-salvage-${row}-${i}`,kind:'junkCar',s:distance,off,...p,halfX:1.06,halfZ:2.25,height:1.30,shape:'box',color:[0x5c7367,0x8b5144,0x637a8f][row]});
  }
  // A progressive line makes capability limits readable: crawl the low stones,
  // then attempt the large tipping boulder. All are ordinary rock obstacles.
  for(const [i,height]of[.42,.65,.95,1.35,1.85,2.6,4.8].entries()){
    const s=620+i*8.5,off=-48,halfX=2.3+height*.27,halfZ=2.6+height*.25,p=course.groundAt(s,off);
    const rock={s,off,theme:'arena',scale:[halfX,height,halfZ],angle:0,radiusX:halfX,radiusZ:halfZ};
    f.rocks.push(rock);f.obstacles.push({id:`practice-rock-${i}`,kind:'rock',s,off,...p,halfX,halfZ,height,heading:p.heading,shape:'ellipse',theme:'arena',source:rock});
  }
  f.practiceStructures=[];
  for(const [index,s]of[60,430,835].entries()){
    const off=57,p=course.groundAt(s,off),stand={id:`practice-stand-${index}`,kind:'building',s,off,...p,halfX:7.5,halfZ:22,height:6,shape:'box',theme:'arena'};
    f.practiceStructures.push(stand);f.obstacles.push(stand);
  }
  for(let i=0;i<30;i++){
    if(i%10<2)continue; // Large access gaps, not an invisible arena boundary.
    const s=i/30*course.length,off=36,p=course.groundAt(s,off);
    const block={id:`practice-block-${i}`,kind:'prop',s,off,...p,halfX:.6,halfZ:3.2,height:1.1,shape:'box',theme:'arena',practiceBlock:true};
    f.practiceStructures.push(block);f.obstacles.push(block);
  }
  for(let i=0;i<10;i++){
    let s=i/10*course.length,off=137+(i%3)*12;
    const p=course.groundAt(s,off),halfX=43+i%3*7,halfZ=78+i%2*12,height=34+i%4*8;
    // Retain the original climbable training massif, clear of the runway and
    // neighboring hills. Preserve its orientation and support geometry.
    if(i===0){p.x=360;p.z=-240;const pose=course.nearest(p.x,p.z);s=pose.s;off=pose.lateral;}
    // Keep the outward-facing drag-strip entrance and its shoulders open.
    if(p.x+Math.hypot(halfX,halfZ)>0&&Math.abs(p.z)<Math.hypot(halfX,halfZ)+45)continue;
    const mountain={id:`practice-quarry-${i}`,kind:'mountain',s,off,...p,halfX,halfZ,height,scale:[halfX,height,halfZ],shape:'ellipse',theme:'arena'};
    f.mountains.push(mountain);f.obstacles.push(mountain);
  }
  // Include every quarry rim in the detailed ground, even at an oval corner.
  for(const mountain of f.mountains){const r=Math.hypot(mountain.halfX,mountain.halfZ)+8;
    layout.bounds.minX=Math.min(layout.bounds.minX,mountain.x-r);layout.bounds.maxX=Math.max(layout.bounds.maxX,mountain.x+r);
    layout.bounds.minZ=Math.min(layout.bounds.minZ,mountain.z-r);layout.bounds.maxZ=Math.max(layout.bounds.maxZ,mountain.z+r);}
}
