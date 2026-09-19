// course.js — one spline-extrusion generator for every stage/theme. Produces a
// sampled centerline (position, elevation, heading, curvature) plus features
// (radar trap, rival start, scenery, the end-of-stage gas station). No laps:
// strictly point-to-point from s=0 to s=lengthU.

import { makeRng } from './rng.js';
import { THEMES } from './config.js';

const STEP = 8; // sample spacing along the centerline (units)

export class Course {
  constructor(stageDef, seed) {
    this.def = stageDef;
    this.seed = seed >>> 0;
    this.theme = THEMES[stageDef.theme];
    this.length = stageDef.lengthU;
    this.rng = makeRng((seed >>> 0) ^ (stageDef.stage * 0x9e37) ^ hashTheme(stageDef.theme));
    this._build();
  }

  _build() {
    const rng = this.rng;
    // deterministic curvature + elevation as summed sines (seed-varied phases)
    const ph = [rng.range(0, 6.28), rng.range(0, 6.28), rng.range(0, 6.28)];
    const eph = [rng.range(0, 6.28), rng.range(0, 6.28)];
    const curveAmp = this.def.theme === 'city' ? .55 : .82;
    const samples = [];
    let x = 0, z = 0, heading = 0;
    for (let s = 0; s <= this.length + STEP; s += STEP) {
      // Bounded headings keep Z strictly increasing. The road cannot loop
      // back across itself, and even the shoulder stays inside the bend radius.
      heading = curveAmp * Math.sin(s * .0022 + ph[0]) + .24 * Math.sin(s * .006 + ph[1]);
      const k = curveAmp * .0022 * Math.cos(s * .0022 + ph[0]) + .00144 * Math.cos(s * .006 + ph[1]);
      x += Math.sin(heading) * STEP;
      z += Math.cos(heading) * STEP;
      const y = 6 * Math.sin(s * 0.0011 + eph[0]) + 3 * Math.sin(s * 0.0031 + eph[1]);
      // tunnels (alpine): mark sections where the road would cut through a peak
      const tunnel = this.theme.tunnels && Math.sin(s * 0.0022 + eph[0]) > 0.72;
      samples.push({ s, x, z, y, heading, curvature: k, tunnel });
    }
    this.samples = samples;

    // --- features ---
    this.features = { checkpoints: [], radarTraps: [], scenery: [], rocks: [], obstacles: [], mountains: [], stations: [], trees: [], buildings: [], barriers: [], turns: [], flocks: [] };
    // gas-station checkpoint at the very end (CANON: stages end at a station)
    this.features.checkpoints.push({ s: this.length, kind: 'gas_station' });
    // radar trap at a fixed fraction so it's deterministic per stage
    if (this.def.hasRadar) {
      this.features.radarTraps.push({ s: Math.round(this.length * 0.45), limitMph: this.def.speedLimitMph });
    }
    // rival starts just behind the player on rival stages
    this.rivalStartS = this.def.hasRival ? -40 : null;
    // scenery scattered along both shoulders
    const n = Math.floor(this.length / 70);
    for (let i = 0; i < n; i++) {
      const s = this.rng.range(60, this.length - 60);
      const side = this.rng.chance(0.5) ? 1 : -1;
      const off = side * this.rng.range(11, 30);
      this.features.scenery.push({ s, off, scale: this.rng.range(0.7, 1.6), kind: this.theme.scenery });
    }
    // One source of truth for rendered rocks and their road-coordinate colliders.
    const rockRng=makeRng(9817+this.def.stage), rocks=this.features.rocks;
    for(let i=0;i<180;i++){
      const sx=rockRng.range(1.3,4),sy=rockRng.range(.9,3),sz=rockRng.range(1.2,4),angle=rockRng.range(0,6.28);
      rocks.push({s:rockRng.range(80,this.length-60),off:(i%2?1:-1)*rockRng.range(16,62),scale:[sx,sy,sz],angle,
        radiusX:(Math.abs(Math.cos(angle))*sx+Math.abs(Math.sin(angle))*sz)*.73,
        radiusZ:(Math.abs(Math.cos(angle))*sz+Math.abs(Math.sin(angle))*sx)*.73});
    }
    if(this.def.theme==='desert')for(let i=0;i<32;i++){
      const layer=i%4,s=145+Math.floor(i/4)*480,off=(i%2?1:-1)*(37+Math.floor(i%4/2)*8);
      if(s<this.length)rocks.push({s,off,scale:[8-layer*.9,5+layer*3.3,10-layer],angle:i*.8,outcrop:true,radiusX:7.5-layer*.8,radiusZ:8.7-layer*.8});
    }
    this.rockBuckets=new Map();
    for(const rock of rocks){const key=Math.floor(rock.s/64);if(!this.rockBuckets.has(key))this.rockBuckets.set(key,[]);this.rockBuckets.get(key).push(rock);}
    this._solidScenery();
  }

  _solidScenery() {
    const f=this.features,rng=makeRng(this.seed^hashTheme(this.def.theme)^((this.def.stage+1)*487));
    const add=(id,kind,s,off,halfX,halfZ,angle=0,extra={})=>{
      const p=this.groundAt(s,off),o={id,kind,s,off,x:p.x,y:p.y,z:p.z,heading:p.heading+angle,halfX,halfZ,shape:'box',...extra};
      f.obstacles.push(o);return o;
    };
    const roadClear=(x,z,radius,margin=13)=>this.nearest(x,z).distance>radius+margin;
    const vacant=(s,off,radius)=>{const p=this.groundAt(s,off);return f.obstacles.every(o=>Math.hypot(o.x-p.x,o.z-p.z)>Math.hypot(o.halfX,o.halfZ)+radius);};
    // Station walls, pumps and canopy posts share the renderer's local layout.
    for(const [i,s,off,angle] of [[0,195,25,.5],[1,900,27,0],[2,this.length-42,-24,-.5]]){
      const p=this.groundAt(s,off),heading=p.heading+angle,station={id:`station-${i}`,s,off,x:p.x,y:p.y,z:p.z,heading,checkpoint:i===2};
      f.stations.push(station);
      const part=(name,lx,lz,hx,hz,kind)=>{const x=p.x+Math.cos(heading)*lx+Math.sin(heading)*lz,z=p.z-Math.sin(heading)*lx+Math.cos(heading)*lz,n=this.nearest(x,z);
        f.obstacles.push({id:`${station.id}-${name}`,kind,shape:'box',s:n.s,off:n.lateral,x,y:p.y,z,heading,halfX:hx,halfZ:hz});};
      part('building',0,5,6,2.75,'building');
      for(const side of [-1,1]){part(`post-${side}`,side*5.5,-3,.16,.16,'prop');part(`pump-${side}`,side*3,-2.5,.55,.45,'prop');}
    }
    // Rocks remain road-coordinate data for older tools; colliders use world footprints.
    f.rocks=f.rocks.filter(r=>{const p=this.groundAt(r.s,r.off);return roadClear(p.x,p.z,Math.hypot(r.scale[0],r.scale[2]),11)&&vacant(r.s,r.off,Math.max(r.scale[0],r.scale[2]));});
    for(const [i,r] of f.rocks.entries())add(`rock-${i}`,'rock',r.s,r.off,r.scale[0],r.scale[2],r.angle,{shape:'ellipse',source:r});
    const mountainCount=this.def.theme==='city'?0:Math.floor(this.length/90);
    for(let i=0;i<mountainCount;i++){
      const sx=rng.range(70,150),sz=rng.range(65,140),height=rng.range(65,this.def.theme==='alpine'?205:120),s=rng.range(20,this.length-20),side=this.def.theme==='coast'?-1:i%2?1:-1;
      let off=side*rng.range(110,350),p=this.groundAt(s,off);const radius=Math.hypot(sx,sz)*1.1;
      for(let attempt=0;attempt<8&&!roadClear(p.x,p.z,radius,22);attempt++){off+=side*45;p=this.groundAt(s,off);}
      if(!roadClear(p.x,p.z,radius,22))continue;
      const mountain=add(`mountain-${i}`,'mountain',s,off,sx,sz,rng.range(0,Math.PI*2),{height,scale:[sx,height,sz],shape:'ellipse'});f.mountains.push(mountain);
    }
    if(this.def.theme==='city')for(let i=0;i<96;i++){
      const s=80+i*(this.length-160)/96,off=(i%2?1:-1)*rng.range(32,78),hx=rng.range(5,11),hz=rng.range(7,13),p=this.groundAt(s,off);
      if(!roadClear(p.x,p.z,Math.hypot(hx,hz),13)||!vacant(s,off,Math.hypot(hx,hz)))continue;
      const building=add(`warehouse-${i}`,'building',s,off,hx,hz,0,{height:rng.range(9,28)});f.buildings.push(building);
    }
    const treeCount=this.def.theme==='city'?55:this.def.theme==='alpine'?820:this.def.theme==='coast'?380:240;
    for(let i=0;i<treeCount;i++){
      const s=rng.range(12,this.length-12),off=(i%2?1:-1)*rng.range(13,73),scale=rng.range(.65,1.7);
      if(!vacant(s,off,2.1*scale)||(this.def.theme==='coast'&&this.groundAt(s,off).y<-13))continue;
      const tree=add(`tree-${i}`,'tree',s,off,.23*scale,.23*scale,rng.range(0,Math.PI*2),{scale});f.trees.push(tree);
    }
    // Warning signs precede the peak of each sustained hard bend.
    let lastTurn=-250;
    for(let s=150;s<this.length-170;s+=24){const k=this.at(s).curvature;
      if(Math.abs(k)>.00205&&s-lastTurn>270){f.turns.push({s,signS:s-125,direction:Math.sign(k),advisory:65});lastTurn=s;}
    }
    for(const turn of f.turns)for(let delta=-24;delta<=56;delta+=8){const s=turn.s+delta,off=-turn.direction*9.1;
      const barrier=add(`barrier-${s}`,'prop',s,off,.16,4,0,{barrier:true});f.barriers.push(barrier);
    }
    f.poles=[];
    for(let s=12;s<this.length;s+=this.def.theme==='city'?70:110){
      if(vacant(s,-18,1))f.poles.push(add(`pole-${s}`,'prop',s,-18,.2,.2));
    }
    f.landmarks=[];
    if(this.def.theme==='coast')for(const s of [640,2450]){
      if(vacant(s,73,5))f.landmarks.push(add(`lighthouse-${s}`,'building',s,73,3.2,3.2,0,{height:22,landmark:'lighthouse',shape:'ellipse'}));
    }
    // Multiple accessible flocks; some graze along the lane edge for a racing-line bonus.
    for(let i=0;i<28;i++){
      let s=130+i*(this.length-260)/28,off=(i%2?1:-1)*(i%3===0?5.5:11+rng.range(0,7));
      if(!vacant(s,off,4)){s+=35;off=(i%2?1:-1)*5;}
      if(!vacant(s,off,3.5))continue;
      f.flocks.push({id:`flock-${i}`,s,off,radius:3.5,count:8,seed:rng.int(1,100000)});
    }
    this.rockBuckets=new Map();for(const rock of f.rocks){const key=Math.floor(rock.s/64);if(!this.rockBuckets.has(key))this.rockBuckets.set(key,[]);this.rockBuckets.get(key).push(rock);}
    this.obstacleBuckets=new Map();
    for(const o of f.obstacles){const reach=Math.hypot(o.halfX,o.halfZ)*1.5+18;
      for(let b=Math.floor((o.s-reach)/64);b<=Math.floor((o.s+reach)/64);b++){if(!this.obstacleBuckets.has(b))this.obstacleBuckets.set(b,[]);this.obstacleBuckets.get(b).push(o);}}
  }

  obstaclesNear(from,to=from){const found=new Set();for(let b=Math.floor((Math.min(from,to)-10)/64);b<=Math.floor((Math.max(from,to)+10)/64);b++)for(const o of this.obstacleBuckets.get(b)||[])found.add(o);return [...found];}

  nearest(x,z){
    let distance2=Infinity,bestS=0;
    for(let i=1;i<this.samples.length;i++){const a=this.samples[i-1],b=this.samples[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
      const d=(x-a.x-t*dx)**2+(z-a.z-t*dz)**2;if(d<distance2){distance2=d;bestS=a.s+t*STEP;}}
    let frame;
    for(let i=0;i<3;i++){frame=this.at(bestS);const lateral=(x-frame.x)*Math.cos(frame.heading)-(z-frame.z)*Math.sin(frame.heading),along=(x-frame.x)*Math.sin(frame.heading)+(z-frame.z)*Math.cos(frame.heading);
      bestS=Math.max(0,Math.min(this.length,bestS+along/Math.max(.35,1-frame.curvature*lateral)));}
    frame=this.at(bestS);const lateral=(x-frame.x)*Math.cos(frame.heading)-(z-frame.z)*Math.sin(frame.heading);
    return {...frame,s:bestS,lateral,distance:Math.hypot(x-frame.x,z-frame.z)};
  }

  groundAt(s,off=0){
    const p=this.worldAt(s,off),extra=s<0?s:s>this.length?s-this.length:0;
    p.x+=Math.sin(p.heading)*extra;p.z+=Math.cos(p.heading)*extra;
    p.y+=terrainRelief(this.def.theme,s,off);
    // Level service yards blend into the same terrain used by cars and props.
    if(Math.abs(off)>8.25)for(const [siteS,siteOff,angle]of[[195,25,.5],[900,27,0],[this.length-42,-24,-.5]]){
      const ds=s-siteS,dl=off-siteOff,c=Math.cos(angle),sn=Math.sin(angle),x=c*dl-sn*ds,z=sn*dl+c*ds;
      const fade=(v,inner,outer)=>{const t=Math.max(0,Math.min(1,(Math.abs(v)-inner)/(outer-inner)));return 1-t*t*(3-2*t);};
      const weight=fade(x,11,15)*fade(z,9.5,14);
      if(weight>0){const yardY=this.at(siteS).y+terrainRelief(this.def.theme,siteS,siteOff);p.y+=(yardY-p.y)*weight;}
    }
    return p;
  }

  rocksNear(from,to){const rocks=[];for(let b=Math.floor((Math.min(from,to)-14)/64);b<=Math.floor((Math.max(from,to)+14)/64);b++)rocks.push(...(this.rockBuckets.get(b)||[]));return rocks;}

  // Interpolated centerline frame at distance s.
  at(s) {
    const clamped = Math.max(0, Math.min(this.length, s));
    const idx = Math.min(this.samples.length - 2, Math.floor(clamped / STEP));
    const a = this.samples[idx], b = this.samples[idx + 1];
    const t = (clamped - a.s) / STEP;
    return {
      x: lerp(a.x, b.x, t), z: lerp(a.z, b.z, t), y: lerp(a.y, b.y, t),
      heading: lerp(a.heading, b.heading, t), curvature: lerp(a.curvature, b.curvature, t),
      tunnel: t < 0.5 ? a.tunnel : b.tunnel,
    };
  }

  // World position offset laterally from the centerline by `lat` units.
  worldAt(s, lat = 0) {
    const f = this.at(s);
    const nx = Math.cos(f.heading), nz = -Math.sin(f.heading); // right-hand normal
    return { x: f.x + nx * lat, y: f.y, z: f.z + nz * lat, heading: f.heading };
  }

  nearestRadar(s) {
    let best = null;
    for (const r of this.features.radarTraps) if (r.s >= s - 50 && (!best || r.s < best.s)) best = r;
    return best;
  }
}

function lerp(a, b, t) { return a + (b - a) * t; }
function hashTheme(name) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) | 0; return h >>> 0; }

function terrainRelief(theme,s,off){
  const edge=Math.max(0,Math.abs(off)-10),wave=Math.sin(s*.012+off*.017)*Math.cos(s*.004-off*.031);
  let h=-.06+wave*Math.min(theme==='alpine'?16:8,edge*(theme==='alpine'?.115:.07))+edge*.012;
  if(theme==='coast'&&off>28){
    const headland=Math.max(...[640,2450].map(center=>Math.exp(-(((s-center)/43)**2+((off-73)/21)**2))));
    h-=Math.min(48,(off-28)*.55)*(1-headland*.96);
  }
  if(theme==='city')h=-.06+Math.min(.8,edge*.015);
  return h;
}
