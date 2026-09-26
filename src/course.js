// Closed, arc-length sampled circuits. The same surface and obstacle data drive
// the renderer, player, CPU and checkpoint validation.
import { makeRng } from './rng.js';
import { installHiddenRoad } from './hidden-road.js';
import { THEMES } from './config.js';
import { buildRoadFurniture, tunnelCoverShape } from './road-furniture.js';
import { createPolylineIndex } from './polyline-index.js';
import { cloneShortcuts, findShortcutPreset, shortcutPresetFingerprint } from './shortcut-preset-cache.js';
import { buildCityParking } from './city-parking-layout.js';
import { expansionPoint, expansionHeight } from './expansion-courses.js';
import { buildCourseSetPieces } from './course-set-pieces.js';
import { buildFreestyleFeatures, freestyleSurfaceHeightAt, onFreestyleDrag } from './freestyle-course.js';
const STEP=8, TAU=Math.PI*2, clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

// Broad, authored landforms use lap fractions so the road, terrain and scenery
// share the same crests. Compact cosine shoulders meet the original ground
// with zero slope; no random height noise or seam crosses the starting grid.
// Entries are [centre, half-span, metres]. Negative summit features form a
// shallow saddle between two visible ridges rather than one rounded dome.
const ROAD_LANDFORMS={
  canyon:[[.12,.12,14],[.38,.13,22],[.70,.13,8],[.86,.09,-4]],
  highland:[[.11,.10,14],[.37,.05,6],[.50,.06,-14],[.64,.05,5],[.86,.10,4]],
  harbor:[[.52,.048,-12],[.80,.08,9]],
  ridge:[[.15,.12,12],[.34,.08,-4],[.71,.06,-12],[.91,.065,8]],
};
const ROUTE_SHAPES={
  // x/z aspect, broad two/three/five-lobe bends, paired four/six-lobe bends.
  canyon:[1.24,.87,.09,.05,.012,.030,.003],
  highland:[1.08,.93,.15,.075,.012,.040,.008],
  harbor:[1.2,.82,.12,.08,.025,0,0],
  ridge:[1.12,.93,.11,.065,.018,.034,.004],
  // The timed checkpoint challenge keeps its already calibrated centreline.
  timberline:[1.24,.86,.145,.072,.014,0,0],
};

export class Course {
  constructor(def,seed,{solveShortcuts=false,hiddenRoad=false}={}){
    this.def=def;this.seed=seed>>>0;this.theme=THEMES[def.theme];this.length=def.lengthU;
    this._solveShortcuts=solveShortcuts===true;
    this.closed=def.closed!==false;this.raceLength=this.length*(def.laps||2);
    this.rng=makeRng(this.seed^((def.stage+1)*0x9e37));
    let start=0;const sections=def.sections||[{theme:def.theme,name:this.theme.name,share:1}];
    this.sections=sections.map((section,i)=>{const end=i===sections.length-1?this.length:start+section.share*this.length;
      const result={...section,start,end};start=end;return result;});
    this.features={checkpoints:[],lapGates:[],rushGates:[],radarTraps:[],scenery:[],rocks:[],obstacles:[],mountains:[],stations:[],trees:[],buildings:[],barriers:[],turns:[],flocks:[],poles:[],landmarks:[],shortcuts:[],passingLanes:[],tunnels:[],ramps:[],crushables:[],signs:[],chevrons:[]};
    this._build();
    if(hiddenRoad && def.id === 'pacific-canyon') installHiddenRoad(this);
  }
  phase(s){return this.closed?((s%this.length)+this.length)%this.length:clamp(s,0,this.length);}
  sectionAt(s){const p=this.phase(s);return this.sections.find(v=>p>=v.start&&p<v.end)||this.sections.at(-1);}
  themeAt(s){return this.sectionAt(s).theme;}
  _height(s){
    if(this.def.expansion)return expansionHeight(this.def,s);
    if(this.def.arena)return 0;
    const p=this.phase(s),a=p/this.length*TAU;
    let h=14+3.5*Math.sin(a)+1.8*Math.sin(a*3);
    for(const sec of this.sections)if(sec.theme==='alpine'&&p>=sec.start&&p<=sec.end){const t=(p-sec.start)/(sec.end-sec.start);h+=75*Math.sin(t*Math.PI)**2;}
    for(const [centre,halfSpan,height]of ROAD_LANDFORMS[this.def.layout]||[]){
      const distance=(p/this.length-centre)/halfSpan;
      if(Math.abs(distance)<1)h+=height*(1+Math.cos(Math.PI*distance))*.5;
    }
    return h;
  }
  _build(){
    const rng=this.rng,arena=this.def.arena,randomPhase=rng.range(0,TAU),phase=Number.isFinite(this.def.layoutSeed)?makeRng((this.def.layoutSeed>>>0)^((this.def.stage+1)*0x9e37)).range(0,TAU):randomPhase,raw=[],count=2048;
    const cityLoop=this.def.kind==='chase'||this.def.layout==='city'?roundedCityLoop():null;
    // Distinct flowing layouts include gentle reverse bends and longer
    // straights. Their tightest radius stays beyond the near-terrain ribbon.
    const shape=ROUTE_SHAPES[this.def.layout]||[1.08,.93,0,.055,.018,0,0];
    for(let i=0;i<=count;i++){const a=i/count*TAU,r=arena?1:1+shape[2]*Math.cos(a*2+phase*.2)+shape[3]*Math.cos(a*3+phase)+shape[4]*Math.sin(a*5+phase)+shape[5]*Math.sin(a*4+phase*.5)+shape[6]*Math.cos(a*6-phase*.3);
      const city=this.def.expansion?expansionPoint(this.def,i/count):cityLoop?.(i/count);raw.push({x:city?city.x:Math.cos(a)*r*(arena?1.3:shape[0]),z:city?city.z:Math.sin(a)*r*(arena?.8:shape[1]),s:0});
      if(i)raw[i].s=raw[i-1].s+Math.hypot(raw[i].x-raw[i-1].x,raw[i].z-raw[i-1].z);}
    const scale=this.length/raw.at(-1).s;raw.forEach(p=>{p.x*=scale;p.z*=scale;p.s*=scale;});
    const origin=raw[0];let cursor=1;this.samples=[];
    for(let s=0;s<=this.length;s+=STEP){while(cursor<raw.length-1&&raw[cursor].s<s)cursor++;
      const a=raw[cursor-1],b=raw[cursor],t=(s-a.s)/(b.s-a.s);
      this.samples.push({s,x:lerp(a.x,b.x,t)-origin.x,z:lerp(a.z,b.z,t),y:this._height(s),heading:0,curvature:0});}
    const n=this.samples.length-1;
    for(let i=0;i<n;i++){const prev=this.samples[(i-1+n)%n],next=this.samples[(i+1)%n],p=this.samples[i];p.heading=Math.atan2(next.x-prev.x,next.z-prev.z);
      if(i)p.heading=this.samples[i-1].heading+angleDiff(p.heading,this.samples[i-1].heading);}
    for(let i=0;i<n;i++)this.samples[i].curvature=angleDiff(this.samples[(i+1)%n].heading,this.samples[(i-1+n)%n].heading)/(2*STEP);
    this.samples[n]={...this.samples[0],s:this.length,heading:this.samples[n-1].heading+angleDiff(this.samples[0].heading,this.samples[n-1].heading)};
    this._nearestIndex=createPolylineIndex(this.samples);
    this.rivalStartS=this.def.hasRival?-20:null;
    const f=this.features;
    if(!this.def.practice)f.checkpoints.push({s:this.raceLength,kind:'finish'});
    if(this.def.hasRadar)f.radarTraps.push({s:Math.round(this.length*.43),limitMph:this.def.speedLimitMph});
    if(this.def.practice){buildFreestyleFeatures(this);}
    else if(this.def.scrapdome){
      // The Scrapdome venue (src/arena/venues.js); Titan Monster Arena below is unchanged.
      const layout=this.def.scrapdome;
      for(const frac of layout.rampFractions)f.ramps.push({start:this.length*frac,end:this.length*frac+layout.rampLength,height:layout.rampHeight});
      for(const [i,[frac,off]]of layout.junk.entries()){
        const distance=this.length*frac,p=this.groundAt(distance,off);
        f.crushables.push({id:`scrapdome-junk-${i}`,kind:'junkCar',s:distance,off,...p,halfX:1.06,halfZ:2.25,height:1.30,shape:'box',color:[0x53645b,0x935143,0x557185][i%3]});
      }
    }
    else if(arena){
      for(const frac of [.17,.55,.78])f.ramps.push({start:this.length*frac,end:this.length*frac+38,height:2.6});
      for(const [row,s]of[330,680,960].entries())for(let i=0;i<2;i++){
        const distance=s+i*5.5,off=(row%2?-1:1)*5.2,p=this.groundAt(distance,off);
        f.crushables.push({id:`junk-${row}-${i}`,kind:'junkCar',s:distance,off,...p,halfX:1.06,halfZ:2.25,height:1.30,shape:'box',color:[0x53645b,0x935143,0x557185][row]});
      }
    }else{
      for(const [sectionIndex,sec] of this.sections.entries()){
        const span=sec.end-sec.start;
        if(sec.theme==='alpine'&&(!this.def.expansion||this.def.expansion.tunnelSections.includes(sectionIndex)))f.tunnels.push({id:`tunnel-${f.tunnels.length}`,start:sec.start+span*.4,end:sec.start+span*.4+152,width:8.3,height:8.5});
        const start=sec.start+span*.12,end=Math.min(sec.end-70,start+290);
        if(end-start>140&&!this.def.offroad)f.passingLanes.push({start,end,side:1});
      }
      if(!this.def.expansion)f.shortcuts.push(...buildShortcuts(this));
      for(const cut of f.shortcuts)Object.assign(cut,measureShortcut(this,cut,2,true));
    }
    if(!this.def.practice)for(let i=1;i<4;i++){let s=this.length*i/4;for(const cut of f.shortcuts)if(s>cut.start-16&&s<cut.end+16)s=cut.end+24;f.lapGates.push({s});}
    this._solidScenery();
  }
  shortcutOffset(cut,s){
    const t=clamp((this.phase(s)-cut.start)/(cut.end-cut.start));
    if(cut.offsets)return sampledOffset(cut.offsets,t);
    const u=Math.min(1,Math.min(t,1-t)/(cut.transition||.5));return cut.offset*Math.sin(Math.PI*.5*u)**2;
  }
  roadHalfWidthAt(s){if(this.def.practice)return 24;if(this.def.scrapdome)return this.def.scrapdome.floorHalfWidth;if(this.def.arena)return 13;if(this.def.offroad)return 5.5;const p=this.phase(s);let width=7;
    for(const lane of this.features.passingLanes)if(p>=lane.start&&p<=lane.end)width+=3.5*smooth((p-lane.start)/45)*smooth((lane.end-p)/45);return width;}
  surfaceAt(s,lateral=0){const p=this.phase(s),roadHalfWidth=this.roadHalfWidthAt(p);
    if(this.def.practice){const world=this.worldAt(s,lateral);if(onFreestyleDrag(world.x,world.z))return {road:true,mainRoad:true,shortcutId:null,roadHalfWidth:16};}
    const cut=this.features.shortcuts.find(c=>p>=c.start&&p<=c.end&&Math.abs(lateral-this.shortcutOffset(c,p))<=c.halfWidth);
    return {road:Math.abs(lateral)<=roadHalfWidth||!!cut,mainRoad:!this.def.offroad&&(Math.abs(lateral)<=roadHalfWidth||cut?.surface==='paved'),shortcutId:cut?.id||null,roadHalfWidth};}
  tunnelAt(s){const p=this.phase(s);return this.features.tunnels.find(t=>p>=t.start&&p<=t.end)||null;}
  jumpAt(s){const p=this.phase(s),r=this.features.ramps.find(r=>p>=r.start&&p<=r.end);if(!r)return 0;
    const t=(p-r.start)/(r.end-r.start);return r.height*Math.sin(Math.PI*t)**2;}
  _relief(s,off){
    if(this.def.practice){const p=this.worldAt(s,off);return freestyleSurfaceHeightAt(this,p.x,p.z);}
    if(this.def.arena)return Math.abs(off)<=15?this.jumpAt(s):0;
    const p=this.phase(s),theme=this.themeAt(p),edge=Math.max(0,Math.abs(off)-this.roadHalfWidthAt(p)-2.5);
    const wave=frequency=>p/this.length*TAU*Math.max(1,Math.round(this.length*frequency/TAU));
    const hills=Math.max(0,22+18*Math.sin(wave(.003)+Math.abs(off)*.009)+12*Math.cos(wave(.007)-off*.006))*smooth((Math.abs(off)-82)/145);
    const baseFor=type=>type==='city'?-.06+Math.min(.8,edge*.015):-.06+Math.sin(wave(.012)+off*.017)*Math.cos(wave(.004)-off*.031)*Math.min(type==='alpine'?14:7,edge*.075)+edge*.012+hills*(type==='alpine'?1.4:type==='coast'?(off<0?.8:0):.65);
    const sec=this.sectionAt(p),previous=this.sections[(this.sections.indexOf(sec)-1+this.sections.length)%this.sections.length];
    let h=lerp(baseFor(previous.theme),baseFor(theme),smooth((p-sec.start)/100));
    if(this.def.offroad)h+=Math.sin(wave(.13))*.12+Math.sin(wave(.038)+off*.07)*.2;
    if(theme==='coast'&&off>28){const sec=this.sectionAt(s),coastFade=smooth((p-sec.start)/120)*smooth((sec.end-p)/120);
      const headland=Math.exp(-(((p-(sec.start+(sec.end-sec.start)*.58))/50)**2+((off-73)/24)**2));
      h-=Math.min(48,(off-28)*.55)*coastFade*(1-headland*.96);}
    for(const cut of this.features.shortcuts)if(p>=cut.start&&p<=cut.end){const distance=Math.abs(off-this.shortcutOffset(cut,p)),blend=smooth((p-cut.start)/36)*smooth((cut.end-p)/36);h*=1-blend*(1-smooth((distance-cut.halfWidth-3)/6));}
    return h;
  }
  groundAt(s,off=0){const p=this.worldAt(s,off);p.y+=this._relief(s,off);
    if(Math.abs(off)>this.roadHalfWidthAt(s)+1)for(const station of this.features.stations){
      const ds=angleDiff((this.phase(s)-station.s)/this.length*TAU,0)*this.length/TAU,dl=off-station.off,c=Math.cos(station.angle),sn=Math.sin(station.angle),x=c*dl-sn*ds,z=sn*dl+c*ds;
      const weight=(1-smooth((Math.abs(x)-11)/4))*(1-smooth((Math.abs(z)-9.5)/4.5));
      if(weight>0)p.y+=(station.y-p.y)*weight;}
    if(this.hiddenRoad && Math.abs(off)>this.roadHalfWidthAt(s)+1 && !this.surfaceAt(s,off).road){
      const hidden=this.hiddenRoad.nearest(p.x,p.z),width=this.hiddenRoad.widthAt(hidden.progress);
      const blend=1-smooth((hidden.distance-width)/8);
      p.y=lerp(p.y,hidden.y,blend);
    }
    return p;}
  _solidScenery(){
    const f=this.features,rng=this.rng;
    const add=(id,kind,s,off,halfX,halfZ,angle=0,extra={})=>{const p=this.groundAt(s,off),o={id,kind,s:this.phase(s),off,x:p.x,y:p.y,z:p.z,heading:p.heading+angle,halfX,halfZ,shape:'box',theme:this.themeAt(s),...extra};f.obstacles.push(o);return o;};
    const roadClear=(s,off,radius=0,margin=2)=>{const p=this.worldAt(s,off),n=this.nearest(p.x,p.z),width=this.roadHalfWidthAt(n.s);
      if(n.distance<width+radius+margin)return false;
      for(const cut of f.shortcuts)if(n.s>=cut.start-12&&n.s<=cut.end+12&&Math.abs(n.lateral-this.shortcutOffset(cut,n.s))<radius+cut.halfWidth+margin)return false;
      return !this.tunnelAt(n.s)||Math.abs(n.lateral)>35+radius;};
    const vacant=(s,off,radius)=>{const p=this.groundAt(s,off);return f.obstacles.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>Math.hypot(o.halfX,o.halfZ)+radius+(o.setPiece==='gantry'?18:0));};
    if(!this.def.practice)for(const side of[-1,1])add(`finish-post-${side}`,'prop',0,side*(this.roadHalfWidthAt(0)+1.5),.25,.25);
    if(this.def.expansion){f.setPieces=buildCourseSetPieces(this);f.obstacles.push(...f.setPieces);}
    if(!this.def.arena){
      for(const [i,sec]of this.sections.entries()){
        const s=sec.start+195,off=-26,angle=0,p=this.groundAt(s,off),station={id:`station-${i}`,s,off,...p,angle,theme:sec.theme,checkpoint:i===0};f.stations.push(station);
        const part=(name,lx,lz,hx,hz,kind)=>{const x=p.x+Math.cos(p.heading)*lx+Math.sin(p.heading)*lz,z=p.z-Math.sin(p.heading)*lx+Math.cos(p.heading)*lz,n=this.nearest(x,z);
          f.obstacles.push({id:`${station.id}-${name}`,kind,shape:'box',s:n.s,off:n.lateral,x,y:p.y,z,heading:p.heading,halfX:hx,halfZ:hz,theme:sec.theme});};
        part('building',0,5,6,2.75,'building');for(const side of[-1,1]){part(`post-${side}`,side*5.5,-3,.16,.16,'prop');part(`pump-${side}`,side*3,-2.5,.55,.45,'prop');}
      }
      // Reserve authored expansion headlands before random rocks/trees. Their
      // reference landmark must not disappear when the scenery seed changes.
      if(this.def.expansion)for(const sec of this.sections)if(sec.theme==='coast'){const s=sec.start+(sec.end-sec.start)*.58;f.landmarks.push(add(`lighthouse-${s}`,'building',s,73,3.2,3.2,0,{height:22,landmark:'lighthouse',shape:'ellipse'}));}
      for(let i=0;i<190;i++){const s=rng.range(50,this.length-50),off=(i%2?1:-1)*rng.range(18,72),sx=rng.range(1.3,4),sz=rng.range(1.2,4),sy=rng.range(.9,3),angle=rng.range(0,TAU);
        if(!roadClear(s,off,Math.hypot(sx,sz),4)||!vacant(s,off,5))continue;
        const rock={s,off,theme:this.themeAt(s),scale:[sx,sy,sz],angle,radiusX:sx,radiusZ:sz};f.rocks.push(rock);add(`rock-${i}`,'rock',s,off,sx,sz,angle,{shape:'ellipse',source:rock});}
      for(let i=0;i<Math.floor(this.length/95);i++){
        const s=rng.range(0,this.length),theme=this.themeAt(s);if(theme==='city')continue;
        const sx=rng.range(55,115),sz=rng.range(55,110),height=rng.range(65,theme==='alpine'?200:120),side=theme==='coast'?-1:i%2?1:-1;let off=side*rng.range(180,330),radius=Math.hypot(sx,sz)*1.1;
        for(let j=0;j<9&&!roadClear(s,off,radius,25);j++)off+=side*40;
        if(!roadClear(s,off,radius,25))continue;
        f.mountains.push(add(`mountain-${i}`,'mountain',s,off,sx,sz,rng.range(0,TAU),{height,scale:[sx,height,sz],shape:'ellipse'}));}
      for(const section of this.sections)if(section.theme==='city'){
        let index=0;
        // Continuous street blocks give the road a city-scale enclosure.
        // Farther towers fill the skyline without entering the race corridor.
        for(const row of[0,1])for(let s=section.start+35;s<section.end-30;s+=row?62:29)for(const side of[-1,1]){
          const hx=row?rng.range(10,18):rng.range(6.5,9.5),hz=row?rng.range(15,22):rng.range(10.5,13),off=side*(row?rng.range(85,120):rng.range(28,34));
          if(roadClear(s,off,Math.hypot(hx,hz),3)&&vacant(s,off,Math.hypot(hx,hz)*.78)){
            const building=add(`warehouse-${section.start}-${index++}`,'building',s,off,hx,hz,0,{height:row?rng.range(28,66):rng.range(11,29)});
            let lowest=building.y;
            // Sample the complete footprint, including corners and edge centres.
            // The foundation extends down; the roof and all facade details keep
            // their original elevations and collision footprint.
            for(const u of[-1,-.5,0,.5,1])for(const v of[-1,-.5,0,.5,1]){
              const x=u*hx,z=v*hz,c=Math.cos(building.heading),sn=Math.sin(building.heading);
              const n=this.nearest(building.x+c*x+sn*z,building.z-sn*x+c*z);
              lowest=Math.min(lowest,this.groundAt(n.s,n.lateral).y);
            }
            building.foundationDepth=building.y-lowest+.65;f.buildings.push(building);
          }
        }
      }
      if(!this.def.expansion)for(const sec of this.sections)if(sec.theme==='coast'){const s=sec.start+(sec.end-sec.start)*.58;if(vacant(s,73,5))f.landmarks.push(add(`lighthouse-${s}`,'building',s,73,3.2,3.2,0,{height:22,landmark:'lighthouse',shape:'ellipse'}));}
      for(let i=0;i<(this.def.expansion?.treeAttempts||800);i++){const s=rng.range(5,this.length-5),theme=this.themeAt(s);if(theme==='city'&&i%5||theme==='desert'&&i%3)continue;
        const off=(i%2?1:-1)*rng.range(13,80),scale=rng.range(.65,1.7);
        if(roadClear(s,off,2.1*scale,3)&&vacant(s,off,2.1*scale)&&this.groundAt(s,off).y>-12)f.trees.push(add(`tree-${i}`,'tree',s,off,.23*scale,.23*scale,rng.range(0,TAU),{scale}));}
      let last=-350;
      for(let s=140;s<this.length-120;s+=24){const k=this.at(s).curvature;
        if(Math.abs(k)>.00175&&s-last>390&&!this.tunnelAt(s)){f.turns.push({s,signS:s-110,direction:Math.sign(k),advisory:Math.abs(k)>.003?55:75});last=s;}}
      for(const turn of f.turns)for(let d=-24;d<=56;d+=8){const s=turn.s+d,off=-turn.direction*(this.roadHalfWidthAt(s)+2.1);
        if(roadClear(s,off,.3,1))f.barriers.push(add(`barrier-${s}`,'prop',s,off,.16,4,0,{barrier:true}));}
      for(let s=12;s<this.length;s+=95)if(roadClear(s,-18,1,2)&&vacant(s,-18,1))f.poles.push(add(`pole-${s}`,'prop',s,-18,.2,.2));
      for(const tunnel of f.tunnels)for(let s=tunnel.start;s<tunnel.end;s+=8)for(const side of[-1,1])add(`wall-${tunnel.id}-${s}-${side}`,'building',s+4,side*(tunnel.width+.45),.45,4.2,0,{tunnelWall:true});
      // Solid flanks occupy only the rock-covered area outside the lining.
      // Four-metre cells follow the same rows as the rendered mountain cover.
      for(const tunnel of f.tunnels)for(let start=tunnel.start;start<tunnel.end;start+=4){
        const end=Math.min(tunnel.end,start+4),s=(start+end)/2,p=this.worldAt(s),cs=Math.cos(p.heading),sn=Math.sin(p.heading);
        for(const side of[-1,1]){
          let outer=Infinity,inner=tunnel.width+.9,base=Infinity,top=-Infinity,nearZ=-Infinity,farZ=Infinity;
          for(const ss of[start,s,end]){
            const shape=tunnelCoverShape(tunnel,ss),edge=this.worldAt(ss,side*shape.width),x=(edge.x-p.x)*cs-(edge.z-p.z)*sn;
            outer=Math.min(outer,side*x-.2);
            const ground=this.groundAt(ss,side*inner);base=Math.min(base,ground.y);
            top=Math.max(top,ground.y+shape.height*Math.sqrt(1-(inner/shape.width)**2)+1.2);
            if(ss===start||ss===end)for(const off of[side*inner,side*shape.width]){
              const q=this.worldAt(ss,off),z=(q.x-p.x)*sn+(q.z-p.z)*cs;
              if(ss===start)nearZ=Math.max(nearZ,z);else farZ=Math.min(farZ,z);
            }
          }
          const center=(inner+outer)/2,along=(nearZ+farZ)/2,obstacle=add(`cover-${tunnel.id}-${start}-${side}`,'mountain',s,side*center,(outer-inner)/2,(farZ-nearZ)/2-.025,0,{tunnelCover:true,coverSide:side,tunnelId:tunnel.id});
          obstacle.x+=sn*along;obstacle.z+=cs*along;obstacle.y=base;obstacle.height=top-base;
        }
      }
      for(let i=0;i<28;i++){let s=130+i*(this.length-220)/28,off=(i%2?1:-1)*(i%3===0?5.5:12+rng.range(0,6));
        if(this.tunnelAt(s))continue;if(!vacant(s,off,4))off=(i%2?1:-1)*5;
        if(vacant(s,off,3.5))f.flocks.push({id:`flock-${i}`,s,off,radius:3.5,count:8,seed:rng.int(1,100000)});}
    }else if(!this.def.practice){
      for(let s=0;s<this.length;s+=8)for(const side of[-1,1])f.barriers.push(add(`arena-wall-${s}-${side}`,'prop',s,side*(this.def.scrapdome?.wallOffset??22),.5,4.2,0,{barrier:true,arenaWall:true}));
    }
    if(!this.def.practice)Object.assign(f,buildRoadFurniture(this));
    for(const sign of f.signs)for(const post of sign.posts)f.obstacles.push({...post,kind:'prop',shape:'box',theme:this.themeAt(post.s),signSupport:true});
    for(const post of f.chevrons)f.obstacles.push({...post,kind:'prop',shape:'box',theme:this.themeAt(post.s),signSupport:true});
    if(this.def.checkpointRush){
      f.rushGates=buildRushGates(this);
      for(const gate of f.rushGates)for(const post of gate.posts)f.obstacles.push({...post,kind:'prop',shape:'box',theme:this.themeAt(post.s),rushGateSupport:true});
    }
    f.parkedCars=buildCityParking(this);f.obstacles.push(...f.parkedCars);
    this.obstacleBuckets=new Map();this.rockBuckets=new Map();
    const buckets=Math.ceil(this.length/64);this.bucketCount=buckets;
    for(const o of f.obstacles){const reach=Math.hypot(o.halfX,o.halfZ)*1.5+20;
      for(let b=Math.floor((o.s-reach)/64);b<=Math.floor((o.s+reach)/64);b++){const key=((b%buckets)+buckets)%buckets;if(!this.obstacleBuckets.has(key))this.obstacleBuckets.set(key,[]);this.obstacleBuckets.get(key).push(o);}}
    for(const r of f.rocks){const key=Math.floor(r.s/64);if(!this.rockBuckets.has(key))this.rockBuckets.set(key,[]);this.rockBuckets.get(key).push(r);}
  }
  obstaclesNear(from,to=from){const found=new Set(),span=Math.min(this.length,Math.abs(to-from)+40),start=this.phase(Math.min(from,to)-20);
    for(let d=0;d<=span+64;d+=32){const b=Math.floor(this.phase(start+d)/64);for(const o of this.obstacleBuckets.get(b)||[])found.add(o);}return [...found];}
  rocksNear(from,to=from){return this.obstaclesNear(from,to).filter(o=>o.kind==='rock').map(o=>o.source);}
  at(s){const p=this.phase(s),idx=Math.min(this.samples.length-2,Math.floor(p/STEP)),a=this.samples[idx],b=this.samples[idx+1],t=(p-a.s)/STEP;
    return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),y:this.def.expansion?this._height(s):lerp(a.y,b.y,t),heading:lerp(a.heading,b.heading,t),curvature:lerp(a.curvature,b.curvature,t),tunnel:!!this.tunnelAt(s)};}
  worldAt(s,lat=0){const f=this.at(s);return{x:f.x+Math.cos(f.heading)*lat,y:f.y,z:f.z-Math.sin(f.heading)*lat,heading:f.heading};}
  nearest(x,z,referenceS){const nearest=this._nearestIndex.query(x,z);let bestS=nearest.index<0?0:this.samples[nearest.index-1].s+nearest.t*STEP;
    for(let i=0;i<3;i++){const f=this.at(bestS),lat=(x-f.x)*Math.cos(f.heading)-(z-f.z)*Math.sin(f.heading),along=(x-f.x)*Math.sin(f.heading)+(z-f.z)*Math.cos(f.heading);bestS=this.phase(bestS+along/Math.max(.3,1-f.curvature*lat));}
    const frame=this.at(bestS),lateral=(x-frame.x)*Math.cos(frame.heading)-(z-frame.z)*Math.sin(frame.heading);
    if(Number.isFinite(referenceS))bestS+=Math.round((referenceS-bestS)/this.length)*this.length;
    return{...frame,s:bestS,lateral,distance:Math.hypot(x-frame.x,z-frame.z)};}
  nearestRadar(s){let best=null;for(const trap of this.features.radarTraps){let absolute=trap.s+Math.floor(s/this.length)*this.length;if(absolute<s-50)absolute+=this.length;if(!best||absolute<best.s)best={...trap,s:absolute};}return best;}
}

// Ordered gates stay on the main trail, beyond branch joins and tunnel mouths.
// A small dynamic program preserves their requested rhythm without clustering
// several gates at the same shortcut exit.
function buildRushGates(course){
  const targets=[.12,.26,.43,.58,.75,.91],candidates=[];
  for(let s=120;s<course.length-120;s+=8){
    if(course.features.shortcuts.some(c=>s>c.start-36&&s<c.end+36)||course.features.tunnels.some(t=>s>t.start-40&&s<t.end+40))continue;
    const halfWidth=course.roadHalfWidthAt(s),posts=[-1,1].map(side=>({s,off:side*(halfWidth+2.1),...course.groundAt(s,side*(halfWidth+2.1)),halfX:.18,halfZ:.18}));
    if(posts.some(post=>course.features.obstacles.some(o=>Math.hypot(o.x-post.x,o.z-post.z)<Math.hypot(o.halfX,o.halfZ)+1.5)))continue;
    candidates.push({s,halfWidth:halfWidth+1,center:course.worldAt(s),posts});
  }
  const layers=[];
  for(let i=0;i<targets.length;i++){
    const row=[];let previousBest=null,cursor=0;
    for(let j=0;j<candidates.length;j++){
      if(i)while(cursor<j&&candidates[cursor].s<=candidates[j].s-160){const prev=layers[i-1][cursor];if(prev&&(!previousBest||prev.cost<previousBest.cost))previousBest={...prev,index:cursor};cursor++;}
      if(i&&!previousBest){row.push(null);continue;}
      row.push({cost:(previousBest?.cost||0)+(candidates[j].s-course.length*targets[i])**2,previous:previousBest?.index??-1});
    }
    layers.push(row);
  }
  let index=-1,best=Infinity;for(let j=0;j<candidates.length;j++)if(layers.at(-1)[j]?.cost<best){index=j;best=layers.at(-1)[j].cost;}
  if(index<0)throw new Error('Checkpoint course has no safe ordered gate layout');
  const selected=[];for(let i=targets.length-1;i>=0;i--){selected.unshift(candidates[index]);index=layers[i][index].previous;}
  return selected.map((gate,index)=>{const id=`rush-gate-${index}`,roadHeights=[];for(const ds of[-.2,0,.2])for(let off=-gate.halfWidth;off<=gate.halfWidth;off+=.5)roadHeights.push(course.groundAt(gate.s+ds,off).y+.06);
    const bannerBottomY=Math.max(gate.center.y,...roadHeights,...gate.posts.map(p=>p.y))+5.3,bannerHeight=.85;
    return{...gate,id,index,bannerBottomY,bannerHeight,posts:gate.posts.map((post,side)=>({...post,id:`${id}-post-${side}`,height:bannerBottomY+bannerHeight+.2-post.y}))};});
}

const shortcutLayoutCache=new Map();
function buildShortcuts(course) {
  const cacheKey=shortcutPresetFingerprint(course),copy=cloneShortcuts;
  if(!course._solveShortcuts){
    if(shortcutLayoutCache.has(cacheKey)){course._shortcutSource='cache';return copy(shortcutLayoutCache.get(cacheKey));}
    const preset=findShortcutPreset(cacheKey);if(preset){course._shortcutSource='preset';return preset;}
  }
  course._shortcutSource='solver';
  const candidates=[],pavedCandidates=[],halfWidth=4.6,minimumSaving=.03,stations=course.sections.map(section=>({s:section.start+195,off:-26}));
  // Longer, tangent-matched chords remove a bend instead of running parallel
  // to it. Curvature and speed estimates matter as much as metres saved.
  for(const balance of[1,.7,1.4]){
  if(balance!==1&&(candidates.length||pavedCandidates.length))break;
  for(const span of balance===1?[620,740,860,980,1100]:[620,740,860,980,1100,1220,1340])for(let start=48;start+span<=course.length-48;start+=32){
    const end=start+span;if(course.features.tunnels.some(t=>start<t.end+42&&end>t.start-42))continue;
    if([1,2,3].filter(i=>course.length*i/4>start-16&&course.length*i/4<end+16).length>1)continue;
    const frames=[],count=Math.ceil(span/4);for(let i=0;i<=count;i++){const s=start+span*i/count;frames.push({...course.at(s),s});}
    const main=estimateRoutePace(course,null,start,end),a=frames[0],b=frames.at(-1);
    for(const handle of[.055,.08,.105,.13,.155,.18,.205,.23]){
      const offsets=chordOffsets(frames,a,b,span*handle,span*handle*balance);if(!offsets)continue;
      const peak=offsets.reduce((best,value)=>Math.abs(value)>Math.abs(best)?value:best,0);
      if(Math.abs(peak)<24||Math.abs(peak)>112)continue;
      if(frames.some((p,i)=>1-p.curvature*offsets[i]-Math.abs(p.curvature)*(halfWidth+1.4)<.3||Math.abs(offsets[i])>112))continue;
      const candidate={start,end,offset:peak,offsets,halfWidth};
      if(stations.some(station=>[-21,-10,0,10,21].some(ds=>{const s=station.s+ds;return s>=start&&s<=end&&Math.abs(station.off-course.shortcutOffset(candidate,s))<11+halfWidth+2;})))continue;
      const measured=measureShortcut(course,candidate,4),saving=1-measured.cutMeters/measured.mainMeters;if(saving<minimumSaving)continue;
      let pace=estimateRoutePace(course,candidate,start,end),timeSaving=1-pace.seconds/main.seconds,surface='gravel';
      if(timeSaving<.023){
        if(course.def.offroad)continue;
        pace=estimateRoutePace(course,candidate,start,end,true);timeSaving=1-pace.seconds/main.seconds;surface='paved';if(timeSaving<.023)continue;
      }
      (surface==='gravel'?candidates:pavedCandidates).push({...candidate,...measured,saving,surface,predictedTimeSaving:timeSaving,predictedMainSeconds:main.seconds,predictedCutSeconds:pace.seconds,maxCurvature:pace.maxCurvature});
    }
  }
  }
  const score=cut=>(Math.min(.085,cut.predictedTimeSaving)-Math.max(0,cut.predictedTimeSaving-.105)*.75)*cut.predictedMainSeconds;
  candidates.sort((a,b)=>score(b)-score(a)||a.maxCurvature-b.maxCurvature);
  pavedCandidates.sort((a,b)=>score(b)-score(a)||a.maxCurvature-b.maxCurvature);
  const selected=[];
  for(const candidate of [...candidates,...pavedCandidates]){
    if(selected.some(c=>candidate.start<c.end+90&&candidate.end>c.start-90))continue;
    const measured=measureShortcut(course,candidate,2);if(1-measured.cutMeters/measured.mainMeters<minimumSaving)continue;
    selected.push({...candidate,...measured});if(selected.length===2)break;
  }
  if(!course.def.offroad&&selected.length===2&&selected.every(c=>c.surface==='gravel'))selected.sort((a,b)=>a.start-b.start)[1].surface='paved';
  const result=selected.sort((a,b)=>a.start-b.start).map((cut,index)=>{
    const surface=cut.surface;
    return{id:'shortcut-'+index,start:cut.start,end:cut.end,offset:cut.offset,offsets:cut.offsets,halfWidth,surface,name:surface==='paved'?'Service cut':course.def.offroad?'Ridge cut':course.themeAt((cut.start+cut.end)*.5)==='city'?'Harbor cut':'Canyon cut',mainMeters:cut.mainMeters,cutMeters:cut.cutMeters,predictedTimeSaving:cut.predictedTimeSaving,predictedMainSeconds:cut.predictedMainSeconds,predictedCutSeconds:cut.predictedCutSeconds};
  });
  if(!course._solveShortcuts){shortcutLayoutCache.set(cacheKey,copy(result));if(shortcutLayoutCache.size>40)shortcutLayoutCache.delete(shortcutLayoutCache.keys().next().value);}return result;
}

function sampledOffset(values,t){
  const u=clamp(t)*(values.length-1),i=Math.min(values.length-2,Math.floor(u)),f=u-i,a=values[i],b=values[i+1];
  const ma=i===0?0:(b-values[i-1])*.5,mb=i+1===values.length-1?0:(values[i+2]-a)*.5;
  return(2*f*f*f-3*f*f+1)*a+(f*f*f-2*f*f+f)*ma+(-2*f*f*f+3*f*f)*b+(f*f*f-f*f)*mb;
}

function chordOffsets(frames,a,b,handle,endHandle=handle){
  const tangent=p=>({x:Math.sin(p.heading),z:Math.cos(p.heading)}),normal=p=>({x:Math.cos(p.heading),z:-Math.sin(p.heading)}),ta=tangent(a),tb=tangent(b),na=normal(a),nb=normal(b);
  const controls=[a,{x:a.x+ta.x*handle,z:a.z+ta.z*handle},{x:a.x+ta.x*handle*2+na.x*1.25*handle*handle*a.curvature,z:a.z+ta.z*handle*2+na.z*1.25*handle*handle*a.curvature},{x:b.x-tb.x*endHandle*2+nb.x*1.25*endHandle*endHandle*b.curvature,z:b.z-tb.z*endHandle*2+nb.z*1.25*endHandle*endHandle*b.curvature},{x:b.x-tb.x*endHandle,z:b.z-tb.z*endHandle},b];
  const evaluate=t=>{const q=1-t,weights=[q**5,5*q**4*t,10*q**3*t*t,10*q*q*t**3,5*q*t**4,t**5],derivative=[q**4,4*q**3*t,6*q*q*t*t,4*q*t**3,t**4];let x=0,z=0,dx=0,dz=0;for(let i=0;i<6;i++){x+=controls[i].x*weights[i];z+=controls[i].z*weights[i];if(i<5){dx+=(controls[i+1].x-controls[i].x)*derivative[i]*5;dz+=(controls[i+1].z-controls[i].z)*derivative[i]*5;}}return{x,z,dx,dz};};
  const offsets=[];let previous=-1;
  for(let i=0;i<frames.length;i++){
    const p=frames[i],tx=Math.sin(p.heading),tz=Math.cos(p.heading);let u=i/(frames.length-1),v;
    for(let iteration=0;iteration<9;iteration++){v=evaluate(u);const residual=(v.x-p.x)*tx+(v.z-p.z)*tz,gradient=v.dx*tx+v.dz*tz;if(gradient<=.01)return null;if(Math.abs(residual)<.00001)break;u=clamp(u-residual/gradient);}
    v=evaluate(u);if(u<previous-1e-6||Math.abs((v.x-p.x)*tx+(v.z-p.z)*tz)>.04)return null;previous=u;
    offsets.push((v.x-p.x)*tz-(v.z-p.z)*tx);
  }
  offsets[0]=offsets[offsets.length-1]=0;return offsets;
}

function estimateRoutePace(course,cut,start,end,paved=false){
  const points=[],spacing=8,count=Math.ceil((end-start+440)/spacing),from=start-220,to=end+220;
  for(let i=0;i<=count;i++){const s=from+(to-from)*i/count,off=cut&&s>=start&&s<=end?sampledOffset(cut.offsets,(s-start)/(end-start)):0,p=course.worldAt(s,off);points.push({...p,s});}
  const gravel=!!cut&&!paved||course.def.offroad,grip=course.def.offroad?1.05*.984:.82*(gravel?.896:1),top=(course.def.offroad?184:201)*.94,limits=[],distances=[];let maxCurvature=0;
  for(let i=0;i<points.length;i++){
    if(i)distances[i]=Math.hypot(points[i].x-points[i-1].x,points[i].z-points[i-1].z,points[i].y-points[i-1].y);
    const a=points[Math.max(0,i-1)],p=points[i],b=points[Math.min(points.length-1,i+1)],ax=p.x-a.x,az=p.z-a.z,bx=b.x-p.x,bz=b.z-p.z;
    const k=Math.abs(2*(ax*bz-az*bx)/Math.max(.001,Math.hypot(ax,az)*Math.hypot(bx,bz)*Math.hypot(b.x-a.x,b.z-a.z)));maxCurvature=Math.max(maxCurvature,k);
    limits[i]=Math.min(top*.44704,.85*Math.sqrt(30*grip/Math.max(.0001,k)));
  }
  // Conservative sighted braking, followed by physical acceleration/braking
  // envelopes. This rejects short-looking paths with costly tight joins.
  const speeds=limits.map((v,i)=>Math.min(v,limits[Math.min(limits.length-1,i+Math.round(100/spacing))],limits[Math.min(limits.length-1,i+Math.round(220/spacing))]));
  for(let i=1;i<speeds.length;i++)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i-1]**2+2*7*distances[i]));
  for(let i=speeds.length-2;i>=0;i--)speeds[i]=Math.min(speeds[i],Math.sqrt(speeds[i+1]**2+2*13*distances[i+1]));
  let seconds=0;for(let i=1;i<points.length;i++)if(points[i].s>start&&points[i].s<=end+100)seconds+=distances[i]/Math.max(1,(speeds[i]+speeds[i-1])*.5);
  return{seconds,maxCurvature};
}

function measureShortcut(course, cut, step, finalSurface = false) {
  let mainMeters = 0, cutMeters = 0, previousMain, previousCut;
  const count = Math.ceil((cut.end - cut.start) / step);
  for (let i = 0; i <= count; i++) {
    const s = cut.start + (cut.end - cut.start) * i / count;
    const main = finalSurface && course.def.offroad ? course.groundAt(s) : course.worldAt(s);
    const branch = finalSurface ? course.groundAt(s, course.shortcutOffset(cut,s)) : course.worldAt(s, course.shortcutOffset(cut, s));
    if (i) { mainMeters += Math.hypot(main.x - previousMain.x, main.y - previousMain.y, main.z - previousMain.z); cutMeters += Math.hypot(branch.x - previousCut.x, branch.y - previousCut.y, branch.z - previousCut.z); }
    previousMain = main; previousCut = branch;
  }
  return { mainMeters, cutMeters };
}

// Long city straights connected by real rounded junctions. All positions are
// sampled by arc length, so braking and lap distance stay consistent.
function roundedCityLoop(){
  const w=1.2,h=.85,r=.25,parts=[],line=(x,z,dx,dz)=>parts.push({length:Math.hypot(dx,dz),at:t=>({x:x+dx*t,z:z+dz*t})}),arc=(cx,cz,a)=>parts.push({length:r*Math.PI/2,at:t=>({x:cx+r*Math.cos(a+t*Math.PI/2),z:cz+r*Math.sin(a+t*Math.PI/2)})});
  line(w,-h+r,0,2*(h-r));arc(w-r,h-r,0);line(w-r,h,-2*(w-r),0);arc(-w+r,h-r,Math.PI/2);
  line(-w,h-r,0,-2*(h-r));arc(-w+r,-h+r,Math.PI);line(-w+r,-h,2*(w-r),0);arc(w-r,-h+r,Math.PI*1.5);
  const length=parts.reduce((n,p)=>n+p.length,0);return t=>{let d=t*length;for(const part of parts){if(d<=part.length)return part.at(d/part.length);d-=part.length;}return parts[0].at(0);};
}
