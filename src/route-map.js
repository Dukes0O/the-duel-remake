import {freestyleLayout,FREESTYLE_DRAG} from './freestyle-course.js';

// A fixed circuit overview. Geometry and static canvas layers are cached per Course.
const BRANCH_COLORS=['#62dabc','#b99aff'];
export const PRACTICE_MAP_LEGEND=Object.freeze([
  Object.freeze({kind:'jump',label:'Jumps',color:'#ffce75',description:'Gold triangles mark jump mounds'}),
  Object.freeze({kind:'climb',label:'Climb',color:'#c2a5f2',description:'Violet peaks mark the climbing hill'}),
  Object.freeze({kind:'rocks',label:'Rocks',color:'#8bc8dd',description:'Blue diamonds mark the rock garden'}),
  Object.freeze({kind:'crush',label:'Crush',color:'#f0937d',description:'Coral rectangles mark crush lanes'}),
]);
export const practiceMapLegendText=()=>PRACTICE_MAP_LEGEND.map(item=>item.description).join('. ')+'.';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function routePhase(distance,length,closed=true){return closed?((distance%length)+length)%length:clamp(distance,0,length);}
export function projectRoutePoint(geometry,point,out={}){
  out.x=geometry.offsetX+(point.x-geometry.minX)*geometry.scale;
  out.y=geometry.height-geometry.offsetY-(point.z-geometry.minZ)*geometry.scale;
  return out;
}
function sampleRange(course,start,end,offset){
  const count=Math.max(1,Math.ceil((end-start)/8)),points=[];
  for(let i=0;i<=count;i++){const s=start+(end-start)*i/count;points.push(course.worldAt(s,offset?offset(s):0));}
  return points;
}
function practiceFeatures(course){
  if(!course.def.practice)return [];
  const features=freestyleLayout(course).mounds.map(mound=>({id:mound.id,kind:mound.id==='summit-climb'?'climb':'jump',world:course.worldAt(mound.s,mound.off),sourceIds:[mound.id]}));
  const cluster=(id,kind,sources)=>{
    if(!sources.length)return;
    const world={x:0,z:0};for(const source of sources){const p=course.worldAt(source.s,source.off);world.x+=p.x/sources.length;world.z+=p.z/sources.length;}
    features.push({id,kind,world,sourceIds:sources.map((source,i)=>source.id??`${id}-${i}`)});
  };
  cluster('rock-garden','rocks',course.features.rocks||[]);
  const lanes=new Map();for(const car of course.features.crushables||[]){const lane=car.id.replace(/-\d+$/,'');if(!lanes.has(lane))lanes.set(lane,[]);lanes.get(lane).push(car);}
  for(const [id,cars]of lanes)cluster(id,'crush',cars);
  return features;
}
export function buildRouteMapGeometry(course,width=400,height=280,padding=28){
  if(!course?.samples?.length)return null;
  const practice=practiceFeatures(course);if(course.def.practice)padding=Math.max(padding,32);
  const branches=(course.features.shortcuts||[]).map((cut,index)=>({id:cut.id,label:String.fromCharCode(65+index),color:BRANCH_COLORS[index%BRANCH_COLORS.length],start:cut.start,end:cut.end,world:sampleRange(course,cut.start,cut.end,s=>course.shortcutOffset(cut,s))}));
  const all=[...course.samples,...branches.flatMap(branch=>branch.world),...practice.map(feature=>feature.world)];let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of all){minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);}
  const scale=Math.min((width-padding*2)/Math.max(1,maxX-minX),(height-padding*2)/Math.max(1,maxZ-minZ));
  const geometry={width,height,minX,minZ,scale,offsetX:(width-(maxX-minX)*scale)/2,offsetY:(height-(maxZ-minZ)*scale)/2,length:course.length,closed:course.closed};
  const project=points=>{const result=new Float32Array(points.length*2),out={};for(let i=0;i<points.length;i++){projectRoutePoint(geometry,points[i],out);result[i*2]=out.x;result[i*2+1]=out.y;}return result;};
  geometry.route=project(course.samples);
  geometry.sections=course.sections.map((section,index)=>({...section,index,points:project(sampleRange(course,section.start,section.end)),marker:projectRoutePoint(geometry,course.worldAt(section.start))}));
  geometry.branches=branches.map(({world,...branch},index)=>{
    const cut=course.features.shortcuts[index];let markerIndex=0,largestOffset=-1;
    for(let i=0;i<world.length;i++){const offset=Math.abs(course.shortcutOffset(cut,cut.start+(cut.end-cut.start)*i/(world.length-1)));if(offset>largestOffset){largestOffset=offset;markerIndex=i;}}
    return {...branch,points:project(world),marker:projectRoutePoint(geometry,world[markerIndex])};
  });
  geometry.finish=projectRoutePoint(geometry,course.worldAt(course.closed?0:course.length));
  geometry.finishHeading=course.at(course.closed?0:course.length).heading;
  geometry.gates=(course.features.rushGates||[]).map((gate,index)=>({id:gate.id,index,s:gate.s,marker:projectRoutePoint(geometry,course.worldAt(gate.s,gate.off||0))}));
  if(course.def.practice){geometry.finish=null;geometry.finishHeading=null;geometry.practiceMarkers=practice.map(({world,...feature})=>({...feature,marker:projectRoutePoint(geometry,world)}));}
  return geometry;
}
function practiceSymbol(ctx,kind,x,y,color,size=5){
  ctx.save();ctx.translate(x,y);ctx.fillStyle=color;ctx.strokeStyle='#102326';ctx.lineWidth=1.4;ctx.beginPath();
  if(kind==='crush'){ctx.rect(-size,-size*.6,size*2,size*1.2);}
  else if(kind==='rocks'){ctx.moveTo(0,-size);ctx.lineTo(size,0);ctx.lineTo(0,size);ctx.lineTo(-size,0);ctx.closePath();}
  else{ctx.moveTo(0,-size);ctx.lineTo(size,size*.8);ctx.lineTo(-size,size*.8);ctx.closePath();}
  ctx.fill();ctx.stroke();
  if(kind==='climb'){ctx.beginPath();ctx.moveTo(-size*.35,size*.3);ctx.lineTo(0,-size*.35);ctx.lineTo(size*.35,size*.3);ctx.stroke();}
  ctx.restore();
}
export function drawPracticeMarkers(ctx,map){
  if(!map.practiceMarkers)return;
  ctx.save();ctx.font='bold 11px Segoe UI, sans-serif';ctx.textAlign='right';ctx.fillStyle='#ffce75';ctx.fillText('DRAG STRIP 4 KM →',map.width-10,18);ctx.restore();
  for(const feature of map.practiceMarkers){const style=PRACTICE_MAP_LEGEND.find(item=>item.kind===feature.kind);practiceSymbol(ctx,feature.kind,feature.marker.x,feature.marker.y,style.color);}
  ctx.save();ctx.font='10px Segoe UI, sans-serif';ctx.textAlign='left';
  for(const [i,item]of PRACTICE_MAP_LEGEND.entries()){const x=9+i*(map.width-12)/4,y=map.height-11;practiceSymbol(ctx,item.kind,x+4,y,item.color,3.5);ctx.fillStyle=item.color;ctx.fillText(item.label,x+12,y+3);}
  ctx.restore();
}
export function routeActorPose(course,geometry,actor,out={}){
  const point=course.worldAt(actor.s,actor.lateral||0);projectRoutePoint(geometry,point,out);out.heading=point.heading+(actor.headingError||0);return out;
}
function makePath(points){const path=new Path2D();for(let i=0;i<points.length;i+=2)i?path.lineTo(points[i],points[i+1]):path.moveTo(points[i],points[i+1]);return path;}
function stroke(ctx,path,color,width,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.stroke(path);ctx.setLineDash([]);}

export class RouteMap {
  constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('2d');this.cache=new WeakMap();this.course=null;this.current=null;this.lastDraw=-Infinity;this.pose={};this.lastLabel='';}
  _prepare(course){
    let cached=this.cache.get(course);if(cached&&cached.width===this.canvas.width&&cached.height===this.canvas.height)return cached;
    const geometry=buildRouteMapGeometry(course,this.canvas.width,this.canvas.height);if(!geometry)return null;
    const route=makePath(geometry.route),sections=geometry.sections.map(section=>makePath(section.points)),branches=geometry.branches.map(branch=>makePath(branch.points));
    const base=this.canvas.ownerDocument.createElement('canvas');base.width=geometry.width;base.height=geometry.height;const ctx=base.getContext('2d');ctx.lineJoin=ctx.lineCap='round';
    stroke(ctx,route,'#0b181ee8',13);stroke(ctx,route,'#c8d5c259',4);
    for(let i=0;i<branches.length;i++)stroke(ctx,branches[i],geometry.branches[i].color,3.6,[7,5]);
    for(let i=1;i<geometry.sections.length;i++){const marker=geometry.sections[i].marker;ctx.beginPath();ctx.arc(marker.x,marker.y,5,0,Math.PI*2);ctx.fillStyle='#142326';ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#d8e3cf';ctx.stroke();}
    // A checkered finish bar is separate from the player arrow, including lap two.
    if(geometry.finish){ctx.save();ctx.translate(geometry.finish.x,geometry.finish.y);ctx.rotate(geometry.finishHeading);ctx.fillStyle='#112026';ctx.fillRect(-12,-7,24,14);
    for(let x=0;x<4;x++)for(let y=0;y<2;y++){ctx.fillStyle=(x+y)%2?'#152224':'#f1edcf';ctx.fillRect(-10+x*5,-5+y*5,5,5);}ctx.restore();
    }
    drawPracticeMarkers(ctx,geometry);
    cached={...geometry,routePath:route,sectionPaths:sections,branchPaths:branches,base};this.cache.set(course,cached);return cached;
  }
  update(course,state,now=performance.now()){
    if(!this.context||!course?.samples?.length)return;
    const changed=course!==this.course||this.current?.width!==this.canvas.width||this.current?.height!==this.canvas.height;
    if(!changed&&now-this.lastDraw<60)return;
    this.lastDraw=now;if(changed){this.course=course;this.current=this._prepare(course);}
    const map=this.current;if(!map)return;const ctx=this.context,phase=routePhase(state.s,map.length,map.closed);
    let sectionIndex=map.sections.findIndex(section=>phase>=section.start&&phase<section.end);if(sectionIndex<0)sectionIndex=map.sections.length-1;
    ctx.clearRect(0,0,map.width,map.height);ctx.lineCap=ctx.lineJoin='round';
    // Broad low-opacity emphasis separates the active section from completed ones.
    if(course.def.practice)ctx.drawImage(map.base,0,0);
    else{stroke(ctx,map.sectionPaths[sectionIndex],'#eeb87638',11);ctx.drawImage(map.base,0,0);stroke(ctx,map.sectionPaths[sectionIndex],'#e8bb82',3.7);}
    const branchIndex=map.branches.findIndex(branch=>branch.id===state.shortcutId);
    if(branchIndex>=0)stroke(ctx,map.branchPaths[branchIndex],map.branches[branchIndex].color,6);
    for(let i=0;i<map.branches.length;i++){const branch=map.branches[i];ctx.font='bold 13px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillStyle=branch.color;ctx.fillText(branch.label,branch.marker.x,branch.marker.y-9);}
    if(state.checkpointRush&&map.gates.length){
      const next=state.checkpointRush.nextGate,total=state.checkpointRush.total,current=next<total?next%map.gates.length:-1;
      for(const gate of map.gates){const {x,y}=gate.marker;ctx.beginPath();ctx.arc(x,y,gate.index===current?8:5,0,Math.PI*2);ctx.fillStyle=gate.index===current?'#ffce75':'#8dcbb9';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#102426';ctx.stroke();}
    }
    if(state.rival)this._actor(course,map,state.rival,'#f6d768',8,false);
    const police=state.police?.pursuit;
    if(police?.active&&Number.isFinite(police.s))this._actor(course,map,police,Math.floor(now/380)%2?'#7cbff2':'#ee8588',8,false);
    this._actor(course,map,state,'#fff1d0',11,true);
    if(course.def.practice){const world=course.worldAt(state.s,state.lateral);if(world.x>=FREESTYLE_DRAG.startX){ctx.save();ctx.font='bold 13px Segoe UI, sans-serif';ctx.textAlign='center';ctx.fillStyle='#ffce75';ctx.fillText(world.x>=FREESTYLE_DRAG.endX?'BRAKING AREA':`${Math.max(0,Math.round(world.x-FREESTYLE_DRAG.startX))} / 4000 M`,map.width/2,38);ctx.restore();}}
    const lap=course.def.practice?0:Math.min(course.def.laps||2,state.currentLap||state.lap||1),section=map.sections[sectionIndex].name;
    const label=course.def.practice?`${course.def.name} quarry practice map. Untimed exploration, with no laps or finish line. Your arrow shows your heading. ${practiceMapLegendText()}`:`${course.def.name} circuit map. Lap ${lap} of ${course.def.laps||2}. ${section}. Your arrow shows your heading.${state.rival?' Yellow is your rival.':''}${police?.active?' Blue and red is the police patrol.':''}${map.branches.length?` Dashed shortcuts ${map.branches.map(branch=>branch.label).join(' and ')}.${branchIndex>=0?` You are on shortcut ${map.branches[branchIndex].label}.`:''}`:''}${state.checkpointRush?` ${state.checkpointRush.passed} of ${state.checkpointRush.total} gates passed. ${state.checkpointRush.nextGate<state.checkpointRush.total?'Gold marks the next gate.':'Finish both laps.'}`:''} Checkered line marks the finish.`;
    if(label!==this.lastLabel){this.canvas.setAttribute('aria-label',label);this.lastLabel=label;}
    this.canvas.dataset.section=section;this.canvas.dataset.lap=String(lap);this.canvas.dataset.shortcuts=String(map.branches.length);
  }
  _actor(course,map,actor,color,size,player){
    const pose=routeActorPose(course,map,actor,this.pose),ctx=this.context;
    ctx.save();ctx.translate(clamp(pose.x,13,map.width-13),clamp(pose.y,13,map.height-13));ctx.rotate(pose.heading);
    if(player){ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fillStyle='#ff542929';ctx.fill();}
    ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.7,size*.8);ctx.lineTo(0,size*.45);ctx.lineTo(-size*.7,size*.8);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.lineWidth=player?2.5:2;ctx.strokeStyle=player?'#ff683a':'#102026';ctx.stroke();ctx.restore();
  }
  dispose(){this.cache=new WeakMap();this.current=null;this.course=null;this.context?.clearRect(0,0,this.canvas.width,this.canvas.height);this.context=null;this.canvas=null;}
}
