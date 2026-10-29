// Pure measurement helpers copied from the existing measured circuit checks.
// Runtime geometry/functions are supplied by the selected source, including history.
const CELL=8, ROAD_LIFT=.035, SHOULDER_LIFT=.018;
const EXTRA_FOOT={'ski-lodge':[16,11],'wooden-dock':[3,7],'autumn-tree':[1,1],
  'autumn-tree-golden':[1,1],'autumn-tree-copper':[1,1],'start-gantry':null,
  'braking-board-150':[1,.12],'braking-board-100':[1,.12],'braking-board-50':[1,.12]};

export function indexTriangles(geometry){
  const position=geometry.attributes.position,index=geometry.index,bins=new Map();
  for(let i=0;i<index.count;i+=3){
    const corners=[0,1,2].map(k=>{const v=index.getX(i+k);return[position.getX(v),position.getY(v),position.getZ(v)];});
    const xs=corners.map(c=>c[0]),zs=corners.map(c=>c[2]);
    for(let z=Math.floor(Math.min(...zs)/CELL);z<=Math.floor(Math.max(...zs)/CELL);z++)
      for(let x=Math.floor(Math.min(...xs)/CELL);x<=Math.floor(Math.max(...xs)/CELL);x++){
        const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(corners);
      }
  }
  geometry.dispose();return bins;
}
export function drawnHeight(bins,x,z){
  let best=null;
  for(const[a,b,c]of bins.get(Math.floor(x/CELL)+','+Math.floor(z/CELL))??[]){
    const det=(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
    if(Math.abs(det)<1e-9)continue;
    const u=((x-a[0])*(c[2]-a[2])-(z-a[2])*(c[0]-a[0]))/det;
    const v=((b[0]-a[0])*(z-a[2])-(b[2]-a[2])*(x-a[0]))/det;
    if(u< -1e-7||v< -1e-7||u+v>1+1e-7)continue;
    const y=a[1]+u*(b[1]-a[1])+v*(c[1]-a[1]);
    if(best===null||y>best)best=y;
  }
  return best;
}
export function roadTriangles(course,runtime){
  return indexTriangles(runtime.surfaces.strip(course,s=>-course.roadHalfWidthAt(s),s=>course.roadHalfWidthAt(s),ROAD_LIFT));
}
export function checkGround(course,runtime){
  const {surfaces,effects,hills,rendered,footprints,config}=runtime,def=course.def;
  const surfacesToRead=[['near ground',surfaces.terrainGeometry(course)],['far ground',surfaces.farTerrainGeometry(course)]];
  (def.hills??[]).forEach((hill,i)=>surfacesToRead.push(['hill '+(i+1),effects.hillGeometry(course,hill)]));
  (def.effects?.backdrop?.hills??[]).forEach((hill,i)=>surfacesToRead.push(['backdrop hill '+(i+1),effects.backdropGeometry(course,hill,def.effects.backdrop.colours)]));
  if(def.effects?.lake)surfacesToRead.push(['lake',effects.lakeGeometry(course,def.effects.lake)]);
  const drawn=surfacesToRead.map(([name,g])=>[name,indexTriangles(g)]),spans=[];
  let roadSamples=0,objects=0;
  for(let s=0;s<course.length;s+=2){
    const half=course.roadHalfWidthAt(s),places=[];
    for(let k=0;k<=8;k++)places.push([-half+2*half*k/8,ROAD_LIFT]);
    for(const side of[-1,1])for(const share of[.2,.6,1])places.push([side*(half+config.ROAD_SHOULDER_WIDTH*share),SHOULDER_LIFT]);
    for(const[lateral,lift]of places){
      roadSamples++;const at=course.worldAt(s,lateral),surface=at.y+lift;
      for(const[name,bins]of drawn){
        const height=drawnHeight(bins,at.x,at.z);
        if(height===null||height<surface-1e-3)continue;
        const last=spans.findLast(row=>row.surface===name);
        if(last&&s-last.endS<=4){last.endS=s;last.over=Math.max(last.over,height-surface);}
        else spans.push({kind:'ground-over-road',surface:name,startS:s,endS:s,over:height-surface});
      }
    }
  }
  // Object checks use exactly near/far/hill triangles, as the existing guard.
  const objectGround=drawn.filter(([name])=>name==='near ground'||name==='far ground'||/^hill /.test(name));
  const ground=(x,z)=>Math.max(...objectGround.map(([,bin])=>drawnHeight(bin,x,z)??-Infinity));
  const issues=[...spans],lake=def.effects?.lake,water=lake?effects.lakeLevel(course,lake):null;
  for(const piece of def.kitPlacements??[]){
    const kit=footprints[piece.id],foot=kit?[kit.width,kit.depth]:EXTRA_FOOT[piece.id];
    if(!foot||piece.ride)continue;objects++;
    const scale=Array.isArray(piece.scale)?piece.scale:Array(3).fill(piece.scale??1),at=course.groundAt(piece.s,piece.lateral);
    let base=runtime.kits?.kitBaseHeight ? runtime.kits.kitBaseHeight(course,piece,{min:{x:-foot[0]/2,z:-foot[1]/2},max:{x:foot[0]/2,z:foot[1]/2}}) : rendered.renderedGroundHeight(course,{...at,s:piece.s,off:piece.lateral},{requireSurface:true})+(piece.lift??0);
    if(piece.hill!==undefined){const hill=def.hills[piece.hill];base+=hills.hillHeight(hill,...hills.hillLocal(hill,piece.s,piece.lateral))-(piece.sink??0);}
    const heading=at.heading+(piece.heading??0),hx=foot[0]*scale[0]/2,hz=foot[1]*scale[2]/2,under=[];
    for(const[a,b]of[[0,0],[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]])
      under.push(ground(at.x+Math.cos(heading)*a*hx+Math.sin(heading)*b*hz,at.z-Math.sin(heading)*a*hx+Math.cos(heading)*b*hz));
    const common={id:piece.id,s:piece.s,lateral:piece.lateral};
    if(piece.id==='wooden-dock'){
      if(Math.abs(base-water)>.4)issues.push({kind:'dock-grounding',...common,distance:base-water,limit:.4});
      continue;
    }
    const lowest=Math.min(...under),highest=Math.max(...under);
    if(!Number.isFinite(lowest))continue;
    const limit=((kit?.width>=4&&kit.depth<1)||piece.id==='chairlift-tower') ? .45 : .3;
    if(base-lowest>limit)issues.push({kind:'floating-object',...common,float:base-lowest,limit});
    if(highest-base>1.5)issues.push({kind:'sunken-object',...common,sink:highest-base,limit:1.5});
  }
  return{issues,roadSamples,objects};
}

const BARRIERS=new Set(['armco-white','stone-retaining-wall','armco','tyre-wall','catch-fence','concrete-wall','pit-wall']);
export function barrierCases(course){
  const placements=course.def.kitPlacements??[],pieces=course.script?.pieces??[];
  if(course.def.id==='tremblant-woods'){
    const named=name=>pieces.find(row=>row.name===name);
    const middle=(piece,share=.5)=>piece.s0+(piece.s1-piece.s0)*share;
    const fenceSide=(s0,s1)=>Math.sign(placements.find(row=>row.id==='catch-fence'&&row.s>s0&&row.s<s1).lateral);
    return[['Beaver Hairpin, tyre wall',middle(named('Beaver Hairpin'),.4),-named('Beaver Hairpin').dir],
      ['Ridge Corner, tyre wall',middle(named('Ridge Corner')),-named('Ridge Corner').dir],
      ['Pine Drop, armco',middle(named('Pine Drop')),-named('Pine Drop').dir],
      ['Lakeside Plunge, armco',middle(named('Lakeside Plunge')),-named('Lakeside Plunge').dir],
      ['Lodge Bend, armco',middle(named('Lodge Bend')),-named('Lodge Bend').dir],
      ['Final Turn, armco',middle(named('Final Turn')),-named('Final Turn').dir],
      ['The Spur, catch fence',1770,fenceSide(1700,1809)],
      ['Timber Straight, catch fence',named('Timber Straight').s0+60,fenceSide(named('Timber Straight').s0,named('Timber Straight').s0+140)]];
  }
  const drawn=placements.filter(row=>BARRIERS.has(row.id));
  return drawn.filter((row,index)=>index%Math.max(1,Math.ceil(drawn.length/8))===0)
    .slice(0,8).map(row=>[row.id,row.s,Math.sign(row.lateral)]);
}
export function barrierFace(course,s,side,footprints,contact=null){
  const placements=(course.def.kitPlacements??[]).filter(row=>BARRIERS.has(row.id)&&Math.sign(row.lateral)===side);
  if(!placements.length)throw Error('No drawn barrier on probe side');
  const contactIndex=/^kit-solid-(\d+)-/.exec(contact?.obstacleId??'');
  const indexed=contactIndex&&course.def.kitPlacements[Number(contactIndex[1])];
  const piece=indexed&&BARRIERS.has(indexed.id)?indexed:
    placements.reduce((best,row)=>Math.abs(row.s-s)<Math.abs(best.s-s)?row:best);
  const scale=Array.isArray(piece.scale)?piece.scale:Array(3).fill(piece.scale??1),foot=footprints[piece.id];
  const depth=foot.depth*scale[2],result={id:piece.id,gap:Math.abs(piece.lateral)-course.roadHalfWidthAt(piece.s)-depth/2};
  if(!contact)return result;
  const ground=course.groundAt(piece.s,piece.lateral),heading=ground.heading+(piece.heading??0);
  const axes=[{x:Math.cos(heading),z:-Math.sin(heading),half:foot.width*scale[0]/2},
    {x:Math.sin(heading),z:Math.cos(heading),half:depth/2}];
  const axis=axes.reduce((best,row)=>Math.abs(row.x*contact.normal.x+row.z*contact.normal.z)>
    Math.abs(best.x*contact.normal.x+best.z*contact.normal.z)?row:best);
  const sign=Math.sign(axis.x*contact.normal.x+axis.z*contact.normal.z)||1;
  const normal={x:axis.x*sign,z:axis.z*sign},face={x:ground.x+normal.x*axis.half,z:ground.z+normal.z*axis.half};
  const cs=Math.cos(contact.heading),sn=Math.sin(contact.heading),gaps=[];
  for(const width of [-1,1])for(const length of [-1,1]){
    const x=contact.centre.x+width*contact.halfWidth*cs+length*contact.halfLength*sn;
    const z=contact.centre.z-width*contact.halfWidth*sn+length*contact.halfLength*cs;
    gaps.push((x-face.x)*normal.x+(z-face.z)*normal.z);
  }
  return {...result,contactId:contact.obstacleId,bodyFaceGap:Math.min(...gaps),face,normal};
}


function insideBox(point,box){
  const dx=point.x-box.x,dz=point.z-box.z,c=Math.cos(box.heading??0),s=Math.sin(box.heading??0);
  return Math.abs(dx*c-dz*s)<box.halfX&&Math.abs(dx*s+dz*c)<box.halfZ;
}
export function observeBarrierPassages(before,after,boxes,collision,entries){
  const passed=[];
  for(const box of boxes){
    const wasInside=insideBox(before,box),isInside=insideBox(after,box);
    if(isInside){
      if(!wasInside&&!entries.has(box))entries.set(box,before);
      continue;
    }
    const entry=entries.get(box)??before;
    entries.delete(box);
    if(insideBox(entry,box))continue;
    const hit=collision.sweepObstacle(entry,after,box,after.heading??0,
      {halfWidth:0,halfLength:0,height:0,useModelBounds:false});
    if(hit&&hit.t>0&&hit.t<1)passed.push(box);
  }
  return passed;
}
