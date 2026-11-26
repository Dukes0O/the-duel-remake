// The Rats' Nest (OPEN-LOOK-RATS-NEST, round 1), drawn in code: the Road Rats' home in a cutting in the wreck fields, as the
// player first sees it from the rim (docs/story/open-scablands.md, section 21, Scene 3).
//
// The cutting is about 90 m long from north to south, 45 m wide and 9 m deep, with one road that comes down a sunken ramp through
// the west wall near its south end. In it: the pen (a ring of wrecked cars with a chained gate) at the north end, the Glasshouse's
// water cart in the middle, six bays for buggies at the south end, five lean-tos and Sump's shack with a car bonnet on trestles for
// a table, three tyre fires, and a concrete drain under the east wall that comes out in a gully beyond the rim.
//
// Positions are metres from the site's centre: x to the east, z to the south, y up from the land around the cutting. The layout is
// a fixed list (a fixed seeded sequence picks each thing's little differences), so it is the same on every run and its solids can be
// listed before anything is drawn. Nothing here changes race state, reads a save or uses the clock of the wall.
//
// A heading here is a three.js turn about the vertical: a thing's front (its own +z) points along (sin h, cos h) and its own x runs
// along (cos h, -sin h), which is also how src/world/scablands-solids.js reads a solid's `heading`.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createFlameMaterial,createScrapWear} from '../../scrap-look.js';
import {createSmokeColumn} from '../../smoke-column.js';

export const RATS_NEST_STAGES=Object.freeze(['day','night']);
export const RATS_NEST_BUDGET=Object.freeze({draws:12,triangles:60000});

const clamp=(value,low=0,high=1)=>Math.max(low,Math.min(high,value));
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const mulberry=seed=>()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
// The same answer for the same whole numbers, between 0 and 1: for lumps that must not move from run to run.
const lump=(i,j,k=0)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+Math.imul(k,974711))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;};

// ---- The ground ----------------------------------------------------------------------------------------------------------
const CUT=Object.freeze({halfX:22.5,halfZ:45,corner:9,depth:9,run:5.5});
// The road: a sunken ramp that runs east into the west wall. It leaves the land at `top` and is at the floor's depth by `foot`.
const ROAD=Object.freeze({z:29,half:3.2,top:-82,foot:-19});
// The gully beyond the east rim: it is deepest at its head, where the drain comes out, and climbs to the land over about 39 m.
const GULLY=Object.freeze({line:Object.freeze([[47.5,20],[61,21.5],[71,28],[77,36]]),bed:9.3,half:1.1});
const GULLY_LENGTH=GULLY.line.slice(1).reduce((sum,[x,z],index)=>sum+Math.hypot(x-GULLY.line[index][0],z-GULLY.line[index][1]),0);
// The hollow north-west of the rim where a car is left: nothing in the cutting, on the road or on the rim's walk can see into it.
const HOLLOW=Object.freeze({x:-58,z:-36,radius:11,depth:2.6});
const DRAIN=Object.freeze({z:20,inner:.9,shell:.15});

// How far a point lies inside the cutting's rim line, in metres (less than nothing outside it). The rim wanders by about a metre.
function insideRim(x,z){
  const qx=Math.abs(x)-(CUT.halfX-CUT.corner),qz=Math.abs(z)-(CUT.halfZ-CUT.corner);
  const outside=Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-CUT.corner;
  return -outside+Math.sin(x*.21+1.7)*.5+Math.sin(z*.17+.6)*.55+Math.sin((x-z)*.39+2.1)*.25;
}
const roadFloor=x=>{const t=clamp((x-ROAD.top)/(ROAD.foot-ROAD.top));return CUT.depth*(.5*t+.5*smooth(t));};
const roadSideRun=floor=>.5*floor+.8;
function roadDepth(x,z){
  if(x<ROAD.top||x>-12)return 0;
  const floor=roadFloor(x);
  return floor*(1-smooth((Math.abs(z-ROAD.z)-ROAD.half)/roadSideRun(floor)));
}
const gullyBed=along=>{const s=clamp(along/GULLY_LENGTH);return GULLY.bed*(1-(.35*s+.65*smooth(s)));};
const gullySideRun=bed=>.5*bed+.7;
// The nearest point of the gully's line: how far off it is and how far along.
function gullyNearest(x,z){
  let off=Infinity,along=0,run=0;
  for(let index=0;index<GULLY.line.length-1;index++){
    const [ax,az]=GULLY.line[index],[bx,bz]=GULLY.line[index+1],dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz);
    const t=clamp(((x-ax)*dx+(z-az)*dz)/(length*length)),distance=Math.hypot(x-ax-dx*t,z-az-dz*t);
    if(distance<off){off=distance;along=run+t*length;}
    run+=length;
  }
  return {off,along};
}
function gullyDepth(x,z){
  if(x<38||x>86||z<8||z>46)return 0;
  const {off,along}=gullyNearest(x,z),bed=gullyBed(along);
  return bed*(1-smooth((off-GULLY.half)/gullySideRun(bed)));
}
const hollowDepth=(x,z)=>HOLLOW.depth*smooth(1-Math.hypot(x-HOLLOW.x,z-HOLLOW.z)/HOLLOW.radius);

/** How far the ground lies below the land around it at a point of the site, in metres: the cutting, its road, the gully and the hollow. */
export function ratsNestGround(x,z){
  if(!Number.isFinite(x)||!Number.isFinite(z))throw new TypeError('The Rats\' Nest needs finite site coordinates.');
  return Math.max(CUT.depth*smooth(insideRim(x,z)/CUT.run),roadDepth(x,z),gullyDepth(x,z),hollowDepth(x,z));
}
// Where a wall of the cutting reaches `level` metres inside the rim line (the foot of the wall by default), on the west (-1) or east
// (1) side at a given z, or on the north (-1) or south (1) side at a given x.
function wallX(z,side,level=CUT.run){let out=side*34,inn=0;for(let step=0;step<26;step++){const mid=(out+inn)/2;if(insideRim(mid,z)<level)out=mid;else inn=mid;}return (out+inn)/2;}
function wallZ(x,side,level=CUT.run){let out=side*56,inn=0;for(let step=0;step<26;step++){const mid=(out+inn)/2;if(insideRim(x,mid)<level)out=mid;else inn=mid;}return (out+inn)/2;}

// ---- The layout ----------------------------------------------------------------------------------------------------------
const CAR_STYLES=Object.freeze({
  sedan:Object.freeze({length:4.3,width:1.72,belt:.92,roof:1.38,scuttle:.72,rear:-1,roofFrom:.32,roofTo:-.72,posts:Object.freeze([-.08]),bed:null}),
  wagon:Object.freeze({length:4.4,width:1.74,belt:.94,roof:1.42,scuttle:.8,rear:-1.95,roofFrom:.4,roofTo:-1.9,posts:Object.freeze([-.05,-1.05]),bed:null}),
  pickup:Object.freeze({length:4.7,width:1.8,belt:.98,roof:1.5,scuttle:.95,rear:-.15,roofFrom:.55,roofTo:-.1,posts:Object.freeze([]),bed:Object.freeze([-.3,-2.2])}),
});
const STYLE_NAMES=Object.freeze(Object.keys(CAR_STYLES));
const PEN=Object.freeze({x:2,z:-28,ring:7.3,gate:3.5});
const BAY=Object.freeze({count:6,width:3.3,depth:5.5,z:35.3,first:-5.85});

function makeLayout(){
  const random=mulberry(0x4a75e57),between=(low,high)=>low+(high-low)*random();
  const y=(x,z)=>-ratsNestGround(x,z)||0;
  const spots={},solids=[],wrecks=[],roofs=[],drums=[],heaps=[],tyreStacks=[],posts=[];
  const spot=(name,x,z,more={})=>{spots[name]=Object.freeze({x,z,y:y(x,z),...more});};
  const look=(x,z,up)=>Object.freeze({x,z,y:y(x,z)+up});
  const solid=(id,kind,shape,x,z,halfX,halfZ,heading,height)=>solids.push(Object.freeze({id:`rats-nest-${id}`,kind,shape,x,z,halfX,halfZ,heading,height,base:y(x,z)}));
  const round=(id,kind,x,z,radius,height)=>solid(id,kind,'ellipse',x,z,radius,radius,0,height);
  // A point given in a turned thing's own metres (its x and z), in the site's.
  const from=(base,lx,lz)=>({x:base.x+lx*Math.cos(base.heading)+lz*Math.sin(base.heading),z:base.z-lx*Math.sin(base.heading)+lz*Math.cos(base.heading)});
  const wreck=(id,x,z,heading,pose,more={})=>{
    const row={id,x,z,heading,pose,style:STYLE_NAMES[Math.floor(random()*STYLE_NAMES.length)],seed:Math.floor(random()*0x7fffffff),...more};
    wrecks.push(Object.freeze(row));return row;
  };

  // The pen: nine wrecks nose to tail on a ring, most with a second wreck on top, two on their sides and two topped with wire.
  const gateHalf=Math.asin(PEN.gate/2/PEN.ring),carAngle=2*Math.asin(2.29/PEN.ring),slack=(2*Math.PI-2*gateHalf-9*carAngle)/2;
  const poses=['stack','side','stack','wire','stack','stack','wire','side','stack'];
  for(let slot=0;slot<9;slot++){
    const angle=Math.PI/2+gateHalf+slack+(slot+.5)*carAngle,x=PEN.x+Math.cos(angle)*PEN.ring,z=PEN.z+Math.sin(angle)*PEN.ring;
    const heading=Math.atan2(-Math.sin(angle),Math.cos(angle))+between(-.07,.07),row=wreck(`pen-${slot+1}`,x,z,heading,poses[slot],{pen:true});
    const style=CAR_STYLES[row.style];
    solid(`pen-wreck-${slot+1}`,'wreck','box',x,z,style.width/2+.12,style.length/2+.05,heading,poses[slot]==='side'?1.75:2.5);
    // Whatever was to hand is jammed into the gap between one wreck and the next.
    const gap=angle+carAngle/2;
    if(slot<8){const gx=PEN.x+Math.cos(gap)*PEN.ring,gz=PEN.z+Math.sin(gap)*PEN.ring;tyreStacks.push(Object.freeze({x:gx,z:gz,count:4+slot%3,seed:slot*17+3,plug:true}));round(`pen-plug-${slot+1}`,'wreck',gx,gz,.5,1.6);}
  }
  const gate=Object.freeze({x:PEN.x,z:PEN.z+PEN.ring*Math.cos(gateHalf),width:PEN.gate,heading:0,height:2});
  solid('pen-gate','gate','box',gate.x,gate.z,PEN.gate/2+.25,.14,0,gate.height);
  spot('pen-gate',gate.x,gate.z+1.9,{heading:Math.PI,looksAt:look(-2,16,1.2)});
  // Nine people sit in the pen: backs to the wrecks of the north side, a huddle in the middle, and the small one where the west rim sees him.
  const captives=[[5,250],[5.1,276],[5,302],[4.9,330],[4.8,200],[5,168],[1.2,300],[1.7,55],[3.6,150]];
  captives.forEach(([reach,degrees],index)=>{
    const angle=degrees*Math.PI/180,x=PEN.x+Math.cos(angle)*reach,z=PEN.z+Math.sin(angle)*reach,small=index===8;
    spot(`captive-${index+1}`,x,z,{heading:small?-Math.PI/2:Math.atan2(PEN.x-x,PEN.z-z),sits:true,...(small?{small:true}:{})});
  });
  const penDrum={x:PEN.x+Math.cos(.35)*5.3,z:PEN.z+Math.sin(.35)*5.3};
  drums.push(Object.freeze({...penDrum,seed:91,open:true}));round('pen-water-drum','drum',penDrum.x,penDrum.z,.36,.9);
  const shade=[[3.3,236],[3.3,304]].map(([reach,degrees])=>({x:PEN.x+Math.cos(degrees*Math.PI/180)*reach,z:PEN.z+Math.sin(degrees*Math.PI/180)*reach}));
  shade.forEach((post,index)=>{posts.push(Object.freeze({...post,height:2.3,kind:'shade'}));round(`pen-shade-post-${index+1}`,'post',post.x,post.z,.1,2.3);});

  // Sump's shack against the west wall, its front to the yard, with a porch, and the bonnet on trestles out in front of the porch.
  const shackZ=-6,shack={x:wallX(shackZ,-1)+.8+2.1,z:shackZ,heading:Math.PI/2,wide:5.2,deep:4.2,porch:2.5};
  solid('sump-shack','building','box',shack.x,shack.z,shack.wide/2+.2,shack.deep/2+.2,shack.heading,3.4);
  const porchPosts=[-2.35,2.35].map(lx=>from(shack,lx,shack.deep/2+shack.porch-.1));
  porchPosts.forEach((post,index)=>round(`sump-porch-post-${index+1}`,'post',post.x,post.z,.1,2.5));
  const table={...from(shack,.2,shack.deep/2+shack.porch+2.1),heading:shack.heading+.12,wide:1.5,deep:1.15,height:.82};
  solid('sump-table','table','box',table.x,table.z,table.wide/2,table.deep/2,table.heading,table.height);
  const sump=from(shack,.2,shack.deep/2+shack.porch+.75);
  spot('sump',sump.x,sump.z,{heading:Math.PI/2,looksAt:look(table.x,table.z,.9)});

  // Five lean-tos with their backs to a wall. `high` is the back of the roof and `low` its front edge.
  const leanTo=(id,side,z,wide,deep,more={})=>{
    const foot=wallX(z,side),row={id,x:foot-side*(deep/2+.55),z,heading:-side*Math.PI/2,wide,deep,high:between(2.5,2.9),low:between(1.9,2.15),seed:Math.floor(random()*0x7fffffff),...more};
    roofs.push(Object.freeze(row));solid(id,'shelter','box',row.x,row.z,wide/2+.15,deep/2+.15,row.heading,row.high+.3);return row;
  };
  leanTo('lean-to-1',1,-10,4.2,3);leanTo('lean-to-2',1,3.5,3.6,2.8);leanTo('lean-to-3',-1,8.5,4.4,3);leanTo('lean-to-4',-1,-27.5,3.4,2.8);
  leanTo('lean-to-5',1,30.6,4.4,3.1,{workshop:true});

  // Three tyre fires, each kept off the line from a place on the rim to what it looks at. The guard stops at the middle one to warm his hands.
  const fires=[[-8,-16.5],[-3,9.5],[-12.6,36.2]].map(([x,z],index)=>{round(`tyre-fire-${index+1}`,'fire',x,z,.8,1.3);return Object.freeze({x,z,seed:index*31+7});});
  spot('warm-hands',fires[1].x+.3,fires[1].z+1.7,{heading:Math.PI,looksAt:look(fires[1].x,fires[1].z,.8)});

  // The Glasshouse's water cart in the middle of the yard, glass frames stacked on it.
  const cart=Object.freeze({x:4.5,z:.5,heading:.5});
  solid('water-cart','cart','box',cart.x,cart.z,.8,1.55,cart.heading,1.95);

  // Six bays in a row at the south end, noses to the north, with a stack of tyres or a drum between one and the next at the back.
  const bays=[];
  for(let index=0;index<BAY.count;index++){
    const x=BAY.first+index*BAY.width;bays.push(Object.freeze({x,z:BAY.z,heading:Math.PI,width:BAY.width,depth:BAY.depth}));
    spot(`buggy-${index+1}`,x,BAY.z,{heading:Math.PI});
  }
  for(let index=0;index<=BAY.count;index++){
    const x=BAY.first+(index-.5)*BAY.width,z=BAY.z+BAY.depth/2-.45;
    if(index%2){drums.push(Object.freeze({x,z,seed:40+index}));round(`bay-drum-${index+1}`,'drum',x,z,.34,.9);}
    else{tyreStacks.push(Object.freeze({x,z,count:3+index%2,seed:60+index}));round(`bay-tyres-${index+1}`,'wreck',x,z,.45,1);}
  }

  // The drain: a concrete pipe as tall as a man under the east wall, from the yard to the head of the gully.
  const mouthX=wallX(DRAIN.z,1)-.35,outX=GULLY.line[0][0]-GULLY.half+.25;
  const drain=Object.freeze({z:DRAIN.z,from:mouthX,to:outX,length:outX-mouthX,inner:DRAIN.inner,shell:DRAIN.shell,floor:-CUT.depth});
  for(const side of [-1,1])solid(`drain-wing-${side<0?'north':'south'}`,'wall','box',mouthX-.75,DRAIN.z+side*2.45,1,.3,side*.558,2.4);
  spot('drain-in',mouthX-1.3,DRAIN.z,{heading:Math.PI/2,looksAt:Object.freeze({x:mouthX+2,z:DRAIN.z,y:-CUT.depth+.9})});
  spot('drain-out',outX+1.6,DRAIN.z+.15,{heading:Math.PI/2});
  spot('drain-guard',mouthX-5,DRAIN.z+2.2,{heading:-Math.PI/2});

  // Lamps: one under Sump's porch, one on a pole at the pen's gate, one on a leaning pole at the west end of the bays.
  const porchLamp=from(shack,-1.2,shack.deep/2+shack.porch-.35);
  const lamps=[
    Object.freeze({id:'porch',x:porchLamp.x,z:porchLamp.z,height:1.95,pole:false}),
    Object.freeze({id:'gate',x:gate.x-PEN.gate/2-.75,z:gate.z+.35,height:2.7,pole:true,lean:[.06,-.03]}),
    Object.freeze({id:'bays',x:BAY.first-BAY.width/2-1.6,z:BAY.z-BAY.depth/2-.2,height:3.1,pole:true,lean:[-.05,.09]}),
  ];
  for(const lamp of lamps)if(lamp.pole)round(`lamp-pole-${lamp.id}`,'post',lamp.x,lamp.z,.12,lamp.height);

  // Wrecks standing about the yard, and heaps of scrap that the growers are made to sort.
  const yardWrecks=[['yard-1',11.5,-19.5,1.9,'upright'],['yard-2',13.2,25,.06,'blocks'],['yard-3',-13.6,1.2,.15,'upright'],['yard-4',12.6,12,-.3,'bonnet'],['yard-5',-10.5,-35.6,1.25,'stack']];
  for(const [id,x,z,heading,pose] of yardWrecks){
    const row=wreck(id,x,z,heading,pose),style=CAR_STYLES[row.style];
    solid(id,'wreck','box',x,z,style.width/2+.1,style.length/2+.05,heading,pose==='stack'?2.5:1.45);
  }
  for(const [index,[x,z,radius,height]] of [[7.5,-12,2.2,1.35],[-2.2,-11.8,1.6,1],[5.2,17.2,1.9,1.2]].entries()){
    heaps.push(Object.freeze({x,z,radius,height,seed:200+index*13}));round(`scrap-heap-${index+1}`,'heap',x,z,radius*.85,height);
  }
  // Fuel drums by the workshop lean-to, and two drums that mark the foot of the road.
  for(const [index,[x,z]] of [[12.1,27.2],[12.9,27.6],[12.4,26.5],[-17.2,24.6],[-16.6,33.3]].entries()){
    drums.push(Object.freeze({x,z,seed:120+index*7,lying:index===2}));round(`drum-${index+1}`,'drum',x,z,index===2?.5:.34,.9);
  }
  // Wrecks bedded in the walls: each lies part of the way down a wall with its nose out into the cutting.
  const bedded=[['east',-30,.5],['east',-2.5,.74],['east',12.5,.42],['east',37,.62],['west',-18,.56],['west',18.6,.68],['north',-8,.52],['south',3,.46]];
  for(const [index,[wall,across,share]] of bedded.entries()){
    const level=CUT.run*share,side=wall==='east'||wall==='south'?1:-1,alongX=wall==='east'||wall==='west';
    const faceX=alongX?wallX(across,side,level):across,faceZ=alongX?across:wallZ(across,side,level);
    const x=alongX?faceX+side*1.7:faceX,z=alongX?faceZ:faceZ+side*1.7;
    const inward=alongX?(side>0?-Math.PI/2:Math.PI/2):(side>0?Math.PI:0);
    wreck(`bedded-${index+1}`,x,z,inward+between(-.5,.5),'bedded',{pitch:between(.1,.5),roll:between(-.3,.3),lift:between(-.25,.15),seat:Object.freeze({x:faceX,z:faceZ})});
  }

  // The places to look from, on the west rim, each a long step back from the edge, and what each looks at.
  const rim=(name,z,target)=>spot(name,wallX(z,-1,-1.2),z,{looksAt:target});
  rim('rim-north',-30,look(PEN.x,PEN.z,.8));
  rim('rim-middle',-1,look(cart.x,cart.z,1));
  rim('rim-south',14,look(9.5,27,.6));
  spot('car-hollow',HOLLOW.x,HOLLOW.z,{heading:2.2});
  spot('road-top',ROAD.top-2,ROAD.z,{heading:Math.PI/2,looksAt:look(ROAD.foot+10,ROAD.z-3,1)});
  spot('road-foot',ROAD.foot+4,ROAD.z,{heading:Math.PI/2});

  return Object.freeze({
    radius:95,depth:CUT.depth,
    cutting:Object.freeze({halfX:CUT.halfX,halfZ:CUT.halfZ,depth:CUT.depth,wallRun:CUT.run}),
    road:Object.freeze({z:ROAD.z,halfWidth:ROAD.half,top:ROAD.top,foot:ROAD.foot}),
    gully:Object.freeze({line:GULLY.line,length:GULLY_LENGTH,halfWidth:GULLY.half}),
    hollow:HOLLOW,drain,
    pen:Object.freeze({x:PEN.x,z:PEN.z,ring:PEN.ring,gate,drum:Object.freeze(penDrum),shade:Object.freeze(shade.map(Object.freeze))}),
    shack:Object.freeze({...shack,porchPosts:Object.freeze(porchPosts.map(Object.freeze)),table:Object.freeze(table)}),
    cart,bays:Object.freeze(bays),fires:Object.freeze(fires),lamps:Object.freeze(lamps),roofs:Object.freeze(roofs),
    wrecks:Object.freeze(wrecks),drums:Object.freeze(drums),heaps:Object.freeze(heaps),tyreStacks:Object.freeze(tyreStacks),posts:Object.freeze(posts),
    spots:Object.freeze(spots),solids:Object.freeze(solids),
  });
}

/** The site's radius, every named spot ({x, z, y, and for some a heading and a looksAt point}) and where each thing stands. */
export const RATS_NEST_LAYOUT=makeLayout();

/** The boxes and circles a car or a walker cannot pass, in the site's metres; `base` is the ground under each, from the land around. */
export function ratsNestSolids(stage='day'){
  if(!RATS_NEST_STAGES.includes(stage))throw new RangeError(`The Rats' Nest has no stage called ${JSON.stringify(stage)}.`);
  return RATS_NEST_LAYOUT.solids;
}

// ---- Drawing: the kit -------------------------------------------------------------------------------------------------------
const WIND=Object.freeze({x:1,z:.35});
const tone=(hex,k=1)=>new THREE.Color(hex).multiplyScalar(k);
let PALETTE=null;
const makePalette=()=>({
  rust:[tone(0x7a5236),tone(0x84583a),tone(0x6b4632),tone(0x70574a),tone(0x625448),tone(0x7d5a40)],
  paint:[tone(0x858070),tone(0x5a6c69),tone(0x66392f),tone(0x6c747c),tone(0x7c7444)],
  burnt:tone(0x2e2622),tin:[tone(0x84583a),tone(0x77746b),tone(0x6f4a34),tone(0x666b68),tone(0x8a6240),tone(0x5c6668)],
  iron:tone(0x3a3835),tube:tone(0x6d6a63),timber:[tone(0x6f6253),tone(0x574a3c),tone(0x7c7062)],rubber:tone(0x24221f),rope:tone(0x7b6845),
  cloth:[tone(0x5b5a40),tone(0x7d735c),tone(0x4f5a60),tone(0x6a4034),tone(0x8a8474)],
  concrete:tone(0x77736a),stain:tone(0x4f4a42),glass:tone(0xa9b8ad),chrome:tone(0x8a8c88),
  clay:tone(0x8f5a3c),dark:tone(0x6f4a38),seam:tone(0x44342c),scree:tone(0x8a5c42),rock:tone(0x77675c),top:tone(0x5e3b2a),
  oil:tone(0x0d0c0b),worn:tone(0x2e1c14),track:tone(0x2d2924),soot:tone(0x0a0908),
});

// Collects pieces by material, each with its colour in its vertices, under a stack of placements, and merges them: one mesh a material.
const WITH_UV=new Set(['earth','marks','pools']);
function assembly(){
  const lists={sheet:[],frame:[],earth:[],glass:[],glow:[],marks:[],pools:[]},stack=[new THREE.Matrix4()];
  let triangles=0;
  const here=()=>stack[stack.length-1];
  const placed=(x,y,z,yaw=0,pitch=0,roll=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch,yaw,roll,'YXZ')),new THREE.Vector3(1,1,1));
  const within=(matrix,work)=>{stack.push(here().clone().multiply(matrix));try{work();}finally{stack.pop();}};
  const keep=(kind,geometry,colour=null)=>{
    const count=geometry.attributes.position.count;
    if(!geometry.index)geometry.setIndex([...Array(count).keys()]);
    if(!WITH_UV.has(kind))geometry.deleteAttribute('uv');
    else if(!geometry.hasAttribute('uv'))geometry.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(count*2),2));
    if(colour){
      const colours=new Float32Array(count*3);
      for(let index=0;index<count;index++){colours[index*3]=colour.r;colours[index*3+1]=colour.g;colours[index*3+2]=colour.b;}
      geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));
    }
    geometry.applyMatrix4(here());geometry.computeVertexNormals();
    triangles+=geometry.index.count/3;lists[kind].push(geometry);
  };
  // Loose triangles, three corners each, with one colour a corner or one for all.
  const faces=(kind,positions,colour,uvs=null)=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    if(uvs)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    if(Array.isArray(colour)){geometry.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));keep(kind,geometry);}
    else keep(kind,geometry,colour);
  };
  const turned=(geometry,x,y,z,turn=[0,0,0])=>geometry.applyMatrix4(placed(x,y,z,turn[1],turn[0],turn[2]));
  const box=(kind,w,h,d,colour,x,y,z,turn)=>keep(kind,turned(new THREE.BoxGeometry(w,h,d),x,y,z,turn),colour);
  const direction=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1),upward=new THREE.Vector3(0,1,0),quaternion=new THREE.Quaternion(),one=new THREE.Vector3(1,1,1);
  // A bar of rectangular section from one point to another, and a round tube the same way.
  const bar=(kind,a,b,wide,colour,tall=wide)=>{
    direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();direction.normalize();
    const geometry=new THREE.BoxGeometry(wide,tall,length);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),quaternion.setFromUnitVectors(forward,direction),one));keep(kind,geometry,colour);
  };
  const tube=(kind,a,b,radius,colour,sides=6,endRadius=radius)=>{
    direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();direction.normalize();
    const geometry=new THREE.CylinderGeometry(endRadius,radius,length,sides,1,false);
    geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),quaternion.setFromUnitVectors(upward,direction),one));keep(kind,geometry,colour);
  };
  // A surface through a grid of points: point(u, v) for u and v from 0 to 1.
  const surface=(kind,across,along,point,colour,uv=null)=>{
    const positions=[],indices=[],uvs=[];
    for(let j=0;j<=along;j++)for(let i=0;i<=across;i++){positions.push(...point(i/across,j/along));if(uv)uvs.push(...uv(i/across,j/along));}
    for(let j=0;j<along;j++)for(let i=0;i<across;i++){const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;indices.push(a,c,b,b,c,d);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    if(uv)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setIndex(indices);keep(kind,geometry,colour);
  };
  // Corrugated sheet between four corners (two at the foot, two at the head), a rib every 0.2 m, with an edge that has rusted ragged
  // and a sag between its supports.
  const ribbed=(kind,p00,p10,p01,p11,colour,{ragged=.05,sag=0,random=Math.random}={})=>{
    const a=new THREE.Vector3(...p00),b=new THREE.Vector3(...p10),c=new THREE.Vector3(...p01),d=new THREE.Vector3(...p11);
    const normal=new THREE.Vector3().subVectors(b,a).cross(new THREE.Vector3().subVectors(c,a)).normalize(),ribs=Math.max(2,Math.round(a.distanceTo(b)/.2));
    const positions=[],indices=[],foot=new THREE.Vector3(),head=new THREE.Vector3(),at=new THREE.Vector3(),rows=sag?3:2;
    for(let rib=0;rib<=ribs;rib++){
      const u=rib/ribs,wave=(rib%2?.032:-.032);foot.lerpVectors(a,b,u);head.lerpVectors(c,d,u);
      const fray=random()*ragged,frayHead=random()*ragged*.5;
      for(let row=0;row<rows;row++){
        const v=row/(rows-1),t=v===0?fray/Math.max(.1,foot.distanceTo(head)):v===1?1-frayHead/Math.max(.1,foot.distanceTo(head)):v;
        at.lerpVectors(foot,head,t).addScaledVector(normal,wave-(row===1&&rows===3?sag:0));positions.push(at.x,at.y,at.z);
      }
    }
    for(let rib=0;rib<ribs;rib++)for(let row=0;row<rows-1;row++){const e=rib*rows+row,f=e+rows;indices.push(e,f,e+1,e+1,f,f+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);keep(kind,geometry,colour);
  };
  // A tyre lying flat at a point (turn tips it): rubber is drawn with the earth, which does not rust. And an oil drum with its two rolled ribs.
  const tyre=(x,y,z,turn=[0,0,0],radius=.33,section=.115,squash=1)=>{
    const geometry=new THREE.TorusGeometry(radius-section,section,5,10);geometry.rotateX(Math.PI/2);geometry.scale(1,squash,1);keep('earth',turned(geometry,x,y,z,turn),PALETTE.rubber);
  };
  const DRUM=[[0,0],[.28,0],[.29,.03],[.29,.28],[.305,.3],[.29,.32],[.29,.57],[.305,.59],[.29,.61],[.29,.86],[.27,.88],[.2,.87],[0,.87]].map(([r,h])=>new THREE.Vector2(r,h));
  const drum=(x,y,z,colour,turn=[0,0,0])=>keep('frame',turned(new THREE.LatheGeometry(DRUM,9),x,y,z,turn),colour);
  return {lists,placed,within,keep,faces,box,bar,tube,surface,ribbed,tyre,drum,get triangles(){return triangles;}};
}

// ---- Drawing: a wrecked car ----------------------------------------------------------------------------------------------
// A stripped shell built from stations along its length: a lower body with its wheel arches cut up into it, an open cabin with thin
// pillars and a dished roof, and no glass. `front` is +z. The shell stands with its sills on the ground at y = 0.
function drawWreck(kit,style,seed,{bonnet='shut',wheels=true}={}){
  const random=mulberry(seed),between=(low,high)=>low+(high-low)*random(),pick=list=>list[Math.floor(random()*list.length)];
  const half=style.width/2,nose=style.length/2,frontArch=nose-.85,rearArch=-nose+.9,arch=.4;
  const zs=new Set([nose,nose-.12,style.scuttle,style.rear,-nose+.1,-nose,...style.posts]);
  for(const centre of [frontArch,rearArch])for(const step of [-arch,-.26,0,.26,arch])zs.add(centre+step);
  if(style.bed){zs.add(style.bed[0]);zs.add(style.bed[1]);}
  const stations=[...zs].sort((a,b)=>b-a).filter((z,index,list)=>index===0||list[index-1]-z>.045);
  const inBed=z=>style.bed&&z<=style.bed[0]+.001&&z>=style.bed[1]-.001;
  const open=z=>(z<=style.scuttle+.001&&z>=style.rear-.001)||inBed(z)||(bonnet!=='shut'&&z>=style.scuttle&&z<nose-.05);
  // Two knocks that pushed the panels in, and a roof that has been stood on or rolled on.
  const dents=[0,1].map(()=>({x:(random()<.5?-1:1)*half,y:between(.45,.95),z:between(-nose+.4,nose-.4),reach:between(.5,.95),deep:between(.08,.26)}));
  const crush=random()<.45?between(.12,.4):between(0,.06),tilt=between(-.5,.5);
  const dent=point=>{
    for(const hit of dents){
      const off=Math.hypot(point[0]-hit.x,point[1]-hit.y,point[2]-hit.z);
      if(off<hit.reach){const push=hit.deep*smooth(1-off/hit.reach);point[0]-=Math.sign(hit.x)*push;point[1]-=push*.25;}
    }
    point[0]+=between(-.018,.018);point[1]+=between(-.015,.015);return point;
  };
  const rings=stations.map(z=>{
    const end=smooth((Math.abs(z)-(nose-.55))/.55),w=half*(1-.13*end);
    let low=.2;for(const centre of [frontArch,rearArch]){const off=(z-centre)/arch;if(Math.abs(off)<1)low=.2+.42*Math.sqrt(1-off*off);}
    const belt=z>style.scuttle?style.belt-.03-.12*clamp((z-style.scuttle)/(nose-style.scuttle)):z<style.rear&&!inBed(z)?style.belt-.03-.07*clamp((style.rear-z)/(nose+style.rear)):style.belt;
    const sill=Math.min(low,belt-.3)+(Math.abs(z)>nose-.06?.14:0),top=belt-(Math.abs(z)>nose-.06?.12:0);
    return [[-w*.9,sill],[-w,sill+.16],[-w,top-.12],[-w*.9,top],[w*.9,top],[w,top-.12],[w,sill+.16],[w*.9,sill]].map(([x,y])=>dent([x,y,z]));
  });
  const body=pick(PALETTE.rust),other=random()<.45?pick(PALETTE.paint):pick(PALETTE.rust),positions=[],colours=[];
  const paint=(colour,shade)=>{for(let corner=0;corner<3;corner++)colours.push(colour.r*shade,colour.g*shade,colour.b*shade);};
  const tri=(a,b,c,colour,shade)=>{positions.push(...a,...b,...c);paint(colour,shade);};
  for(let index=0;index<rings.length-1;index++){
    const a=rings[index],b=rings[index+1],z=(stations[index]+stations[index+1])/2,skipTop=open(stations[index])&&open(stations[index+1]);
    const panel=z>style.scuttle||z<style.rear?body:other,shade=.86+.28*random();
    for(let side=0;side<8;side++){
      if(side===3&&skipTop)continue;
      const next=(side+1)%8,colour=side===7?PALETTE.burnt:panel;
      tri(a[side],b[side],a[next],colour,shade);tri(a[next],b[side],b[next],colour,shade);
    }
  }
  for(const ring of [rings[0],rings[rings.length-1]])for(let side=1;side<7;side++)tri(ring[0],ring[side],ring[side+1],body,.8);
  kit.faces('sheet',positions,colours);
  // Underneath: two rails, the shaft, the back axle and the exhaust, so that a wreck on its side is still a car from below.
  for(const side of [-1,1])kit.bar('frame',[side*half*.52,.17,nose-.5],[side*half*.5,.17,-nose+.4],.07,PALETTE.iron,.09);
  kit.tube('frame',[0,.15,frontArch-.5],[0,.2,rearArch],.035,PALETTE.iron,5);kit.tube('frame',[-half+.2,.24,rearArch],[half-.2,.24,rearArch],.05,PALETTE.iron,6);
  kit.tube('frame',[half*.3,.13,frontArch-.3],[half*.36,.14,-nose+.15],.03,PALETTE.rust[2],5);kit.box('frame',.3,.16,.5,PALETTE.iron,0,.14,frontArch+.1,[0,0,.05]);
  // The roof and its pillars. A crushed roof takes its pillars down with it.
  const shoulder=(z,side)=>[side*half*.9,style.belt,z],roofHalf=half*.78;
  const roofAt=(x,z)=>{const share=(z-style.roofTo)/(style.roofFrom-style.roofTo);return style.roof-crush*(1+tilt*x/roofHalf)*(.6+.8*share*(1-share))-.025*(x/roofHalf)**2;};
  kit.surface('sheet',3,2,(u,v)=>{const x=(u*2-1)*roofHalf,z=style.roofFrom+(style.roofTo-style.roofFrom)*v;return [x+between(-.01,.01),roofAt(x,z)+(u>0&&u<1?.035:0),z];},other);
  for(const side of [-1,1]){
    const corner=z=>[side*roofHalf,roofAt(side*roofHalf,z),z];
    kit.bar('sheet',shoulder(style.scuttle,side),corner(style.roofFrom),.05,body,.07);
    kit.bar('sheet',shoulder(style.rear,side),corner(style.roofTo),.07,body,.11);
    for(const z of style.posts)kit.bar('sheet',shoulder(z,side),corner(z),.045,body,.08);
  }
  // What is left inside: a seat back burnt to its frame, and now and then the wheel.
  kit.box('frame',half*1.5,.5,.09,PALETTE.burnt,between(-.04,.04),style.belt-.22,style.scuttle-.95,[-.3,0,between(-.06,.06)]);
  if(random()<.4){const wheel=new THREE.TorusGeometry(.17,.014,3,8);wheel.rotateX(-.45);wheel.translate(-half*.45,style.belt+.02,style.scuttle-.32);kit.keep('frame',wheel,PALETTE.iron);}
  // The bonnet stands open on some, with the engine gone or burnt to a lump.
  if(bonnet!=='shut'){
    kit.box('frame',.55,.38,.62,PALETTE.burnt,between(-.1,.1),.5,frontArch+.05,[between(-.1,.1),between(-.3,.3),between(-.1,.1)]);
    if(bonnet==='up'){
      const reach=nose-style.scuttle-.12,lift=between(.8,1.05),hinge=style.belt-.02;
      kit.surface('sheet',2,1,(u,v)=>[(u*2-1)*half*(.88-.06*v),hinge+Math.sin(lift)*reach*v+.03*Math.sin(u*Math.PI),style.scuttle+.04+Math.cos(lift)*reach*v],body);
      kit.bar('frame',[half*.6,style.belt-.1,style.scuttle+.5],[half*.62,hinge+Math.sin(lift)*reach*.6,style.scuttle+.04+Math.cos(lift)*reach*.6],.02,PALETTE.iron);
    }
  }
  // Most wheels are long gone. Some hubs still carry a drum, and a few a flat tyre.
  if(wheels)for(const centre of [frontArch,rearArch])for(const side of [-1,1]){
    const roll=random();
    if(roll<.5)continue;
    if(roll<.78)kit.tube('frame',[side*(half-.22),.3,centre],[side*(half-.08),.3,centre],.15,PALETTE.iron,7);
    else kit.tyre(side*(half-.13),.27,centre,[0,0,Math.PI/2+between(-.08,.08)],.31,.1,.82);
  }
}

// ---- Drawing: the textures made in code -------------------------------------------------------------------------------------
// Earth and concrete grain: soft patches, fine grit and a scatter of small stones, in greys that multiply the colour under them.
// Smooth noise that repeats every `cells` cells across a picture `size` wide.
const softNoise=(x,y,size,cells,k)=>{
  const fx=x/size*cells,fy=y/size*cells,x0=Math.floor(fx),y0=Math.floor(fy),tx=smooth(fx-x0),ty=smooth(fy-y0),at=(i,j)=>lump((x0+i)%cells,(y0+j)%cells,k);
  return (at(0,0)*(1-tx)+at(1,0)*tx)*(1-ty)+(at(0,1)*(1-tx)+at(1,1)*tx)*ty;
};
function earthGrain(){
  const size=128,data=new Uint8Array(size*size*4),value=(x,y,cells,k)=>softNoise(x,y,size,cells,k);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const stone=lump(x>>1,y>>1,9)>.93?.72+.5*lump(x,y,11):1,grit=.82+.3*lump(x,y,5);
    const bed=lump(3,(y+Math.round(3*value(x,y,3,7)))>>1,21)>.82?.74:1,shade=clamp((.74+.3*value(x,y,5,1)+.2*(value(x,y,17,2)-.5))*grit*stone*bed,.3,1),index=(y*size+x)*4;
    data[index]=data[index+1]=data[index+2]=Math.round(shade*255);data[index+3]=255;
  }
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.magFilter=THREE.LinearFilter;
  map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;
}
// Four pictures in one for what lies on the ground, white with their shape in the alpha: a spill with a ragged edge, a length of tyre
// track, a ring of soot round a fire, and a soft round patch for lamplight.
const MARK=Object.freeze({spill:[0,0],track:[1,0],scorch:[0,1],soft:[1,1]});
function groundMarks(){
  const cell=64,size=cell*2,data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const cx=x<cell?0:1,cy=y<cell?0:1,u=(x-cx*cell+.5)/cell,v=(y-cy*cell+.5)/cell,far=Math.hypot(u-.5,v-.5)*2,angle=Math.atan2(v-.5,u-.5);
    const ragged=.66+.1*Math.sin(angle*3+1)+.06*Math.sin(angle*5+2.2)+.05*Math.sin(angle*9+.4)+.12*(softNoise(x,y,size,10,3)-.5),blotch=softNoise(x,y,size,14,4)*.65+softNoise(x,y,size,34,8)*.35;
    let alpha=0;
    if(cx===0&&cy===0)alpha=smooth((ragged-far)/.34)*(.45+.75*blotch);
    else if(cx===1&&cy===0){
      // Two rows of lugs with a gap down the middle, worn away in places and fading at both ends.
      const across=Math.abs(u-.5),lug=Math.sin((v*9+(u<.5?0:.5))*Math.PI*2)>-.2?1:.35;
      alpha=(across>.1&&across<.42?lug:0)*(.3+.9*blotch)*smooth(Math.min(v,1-v)/.05)*(1-smooth((across-.34)/.08));
    }else if(cx===0&&cy===1)alpha=smooth((ragged+.25-far)/.5)*(.3+.7*smooth(far/.45))*(.5+.7*blotch);
    else alpha=Math.pow(Math.max(0,1-far),1.8);
    const index=(y*size+x)*4;data[index]=data[index+1]=data[index+2]=255;data[index+3]=Math.round(clamp(alpha)*255);
  }
  const map=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);map.magFilter=map.minFilter=THREE.LinearFilter;map.needsUpdate=true;return map;
}

// ---- Drawing: the site --------------------------------------------------------------------------------------------------------
/** The Rats' Nest as a `THREE.Group` in the site's metres. `heightAt(x, z)` gives the ground under each thing (the land less `ratsNestGround`). */
export function buildRatsNest({stage='day',heightAt=null,wind=WIND}={}){
  if(!RATS_NEST_STAGES.includes(stage))throw new RangeError(`The Rats' Nest has no stage called ${JSON.stringify(stage)}.`);
  PALETTE??=makePalette();
  const L=RATS_NEST_LAYOUT,night=stage==='night',ground=heightAt??((x,z)=>-ratsNestGround(x,z));
  const group=new THREE.Group();group.name='The Rats\' Nest';
  const kit=assembly(),{within,placed,box,bar,tube,surface,ribbed,tyre,drum,faces,keep}=kit;
  const P=PALETTE,floorY=ground(L.cart.x,L.cart.z);
  const on=(x,z,yaw,work,lift=0)=>within(placed(x,ground(x,z)+lift,z,yaw),work);
  // A broken stone: a twenty-sided lump with every corner pulled in or out by its own amount, the same on every run.
  const stone=(size,matrix,colour,squash=.65)=>{
    const rock=new THREE.IcosahedronGeometry(1,0),points=rock.attributes.position;
    for(let index=0;index<points.count;index++){
      const x=points.getX(index),y=points.getY(index),z=points.getZ(index),pull=size*(.62+.6*lump(Math.round(x*50),Math.round(y*50),Math.round(z*50)+Math.round(size*977)));
      points.setXYZ(index,x*pull,y*pull*squash,z*pull);
    }
    rock.applyMatrix4(matrix);keep('earth',rock,colour);
  };

  // The cutting's walls: the wreck fields' red earth cut through its beds, lumpy, with a dark seam of old scrap part of the way down
  // and scree at the foot. The mesh begins at the rim's edge and stands a hand or two proud of the ground it follows, so that the
  // land's own drawing of the cut lies behind it and nothing of it lies on the land.
  const strata=(drop,grain)=>{
    const colour=drop<.5?P.top:drop<2.6?P.clay:drop<3.5?P.seam:drop<7.4?P.dark:P.scree;
    return colour.clone().multiplyScalar(.82+.36*grain);
  };
  const wallStrip=(columns,closed)=>{
    // `columns` is a list of rows of points {x, z, nx, nz, push, lift}, or null for a gap; rows run from the rim to the foot.
    const positions=[],colours=[],uvs=[],indices=[],first=[];
    columns.forEach((rows,column)=>{
      first.push(positions.length/3);if(!rows)return;
      const top=ground(rows[0].x,rows[0].z),bulge=.75+.5*lump(Math.floor(column/4),17,1)+.25*lump(Math.floor(column/9),5,9);
      rows.forEach((point,row)=>{
        const depth=top-ground(point.x,point.z),out=point.push*bulge*(.6+.8*lump(column,row,2)),colour=strata(depth+(lump(Math.floor(column/3),0,6)-.5)*.7,lump(column*7+3,row*13+1,5));
        positions.push(point.x+point.nx*out,ground(point.x,point.z)+point.lift*(.4+1.2*lump(column,row,8)),point.z+point.nz*out);
        colours.push(colour.r,colour.g,colour.b);uvs.push(column*.42,depth/2.6+row*.04);
      });
    });
    const count=closed?columns.length:columns.length-1;
    for(let column=0;column<count;column++){
      const next=(column+1)%columns.length;
      if(!columns[column]||!columns[next])continue;
      for(let row=0;row<columns[column].length-1;row++){const a=first[column]+row,b=first[next]+row;indices.push(a,a+1,b,b,a+1,b+1);}
    }
    if(!indices.length)return;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);keep('earth',geometry);
  };
  // Round the rim: the straight sides and the four corners, a column about every 1.4 m.
  const rimPoints=[];
  {
    const sx=CUT.halfX-CUT.corner,sz=CUT.halfZ-CUT.corner,add=(x,z,nx,nz)=>{
      let out=insideRim(x,z);out=insideRim(x+nx*out,z+nz*out)+out;rimPoints.push({x:x+nx*out,z:z+nz*out,nx,nz});
    };
    const side=(ax,az,bx,bz,nx,nz)=>{const steps=Math.round(Math.hypot(bx-ax,bz-az)/1.1);for(let step=0;step<steps;step++)add(ax+(bx-ax)*step/steps,az+(bz-az)*step/steps,nx,nz);};
    const turn=(cx,cz,start)=>{for(let step=0;step<13;step++){const angle=start+step/13*Math.PI/2,nx=Math.cos(angle),nz=Math.sin(angle);add(cx+nx*CUT.corner,cz+nz*CUT.corner,nx,nz);}};
    side(-sx,-CUT.halfZ,sx,-CUT.halfZ,0,-1);turn(sx,-sz,-Math.PI/2);side(CUT.halfX,-sz,CUT.halfX,sz,1,0);turn(sx,sz,0);
    side(sx,CUT.halfZ,-sx,CUT.halfZ,0,1);turn(-sx,sz,Math.PI/2);side(-CUT.halfX,sz,-CUT.halfX,-sz,-1,0);turn(-sx,-sz,Math.PI);
  }
  const WALL_ROWS=[[.04,.02,.04],[.35,.22,0],[.9,.34,0],[1.5,.6,0],[2.1,.36,0],[2.7,.24,0],[3.3,.52,0],[3.9,.46,0],[4.5,.4,0],[5.1,.46,.12],[5.9,.36,.4],[7.2,0,.04]];
  wallStrip(rimPoints.map(rim=>ratsNestGround(rim.x-rim.nx*.3,rim.z-rim.nz*.3)>CUT.depth*.45?null:
    WALL_ROWS.map(([inward,push,lift])=>({x:rim.x-rim.nx*inward,z:rim.z-rim.nz*inward,nx:-rim.nx,nz:-rim.nz,push,lift}))),true);
  // The two sides of the road's ramp, and the two sides of the gully.
  for(const side of [-1,1]){
    const columns=[];
    for(let x=ROAD.top+5;x<=ROAD.foot-1.5;x+=1.25){
      const floor=roadFloor(x),run=roadSideRun(floor);
      columns.push(floor<.7?null:[.99,.86,.72,.58,.44,.26,.1,-.08].map((share,row)=>({x,z:ROAD.z+side*(ROAD.half+run*share),nx:0,nz:-side,push:row&&row<7?.24:.02,lift:row===6?.12:.03})));
    }
    wallStrip(side>0?columns:columns.reverse(),false);
    const banks=[];
    for(let along=0;along<=GULLY_LENGTH-3;along+=1.2){
      let left=along,index=0;
      while(index<GULLY.line.length-2&&left>Math.hypot(GULLY.line[index+1][0]-GULLY.line[index][0],GULLY.line[index+1][1]-GULLY.line[index][1])){left-=Math.hypot(GULLY.line[index+1][0]-GULLY.line[index][0],GULLY.line[index+1][1]-GULLY.line[index][1]);index++;}
      const [ax,az]=GULLY.line[index],[bx,bz]=GULLY.line[index+1],length=Math.hypot(bx-ax,bz-az),tx=(bx-ax)/length,tz=(bz-az)/length;
      const cx=ax+tx*left,cz=az+tz*left,bed=gullyBed(along),run=gullySideRun(bed),nx=-tz*side,nz=tx*side;
      banks.push(bed<.8?null:[.99,.86,.7,.52,.32,.12,-.05].map((share,row)=>({x:cx+nx*(GULLY.half+run*share),z:cz+nz*(GULLY.half+run*share),nx:-nx,nz:-nz,push:row&&row<6?.22:.02,lift:row===5?.15:.03})));
    }
    wallStrip(side>0?banks:banks.reverse(),false);
  }
  // Rubble at the foot of every wall: broken rock, and lumps of old concrete with their bars showing.
  {
    const random=mulberry(0x5c4ee),between=(low,high)=>low+(high-low)*random();
    rimPoints.forEach((rim,index)=>{
      if(random()<.34)return;
      const inward=between(4.9,7.4),x=rim.x-rim.nx*inward,z=rim.z-rim.nz*inward;
      if(ratsNestGround(x,z)<CUT.depth*.8||Math.abs(z-ROAD.z)<ROAD.half+1.2&&x<-10||Math.hypot(x-L.drain.from,z-L.drain.z)<2.6)return;
      const size=between(.22,.62)*(random()<.12?1.7:1),y=ground(x,z)+size*.3;
      if(random()<.2){
        box('earth',size*1.8,size*.8,size*1.2,P.concrete.clone().multiplyScalar(between(.75,1)),x,y,z,[between(-.5,.5),between(0,3),between(-.5,.5)]);
        bar('frame',[x,y,z],[x+between(-.5,.5),y+between(.3,.7),z+between(-.5,.5)],.016,P.iron);
      }else{
        stone(size*1.25,placed(x,y,z,between(0,6),between(-.4,.4),between(-.4,.4)),(index%3?P.rock:P.scree).clone().multiplyScalar(between(.62,.9)));
      }
    });
  }

  // Every wreck of the layout: the pen's ring, the ones about the yard and the ones bedded in the walls.
  const wreckAt=(row,pose,options,extra=placed(0,0,0))=>within(placed(row.x,ground(row.seat?.x??row.x,row.seat?.z??row.z),row.z,row.heading).multiply(extra),()=>drawWreck(kit,CAR_STYLES[row.style],row.seed+pose,options));
  for(const row of L.wrecks){
    const style=CAR_STYLES[row.style],random=mulberry(row.seed^0x51ed),between=(low,high)=>low+(high-low)*random();
    // On its side, a wreck of the pen turns its roof to the yard outside, and one against a wall turns its roof to the middle.
    const out=row.pen?[row.x-L.pen.x,row.z-L.pen.z]:[-row.x,-row.z],way=-Math.sign(Math.cos(row.heading)*out[0]-Math.sin(row.heading)*out[1])||1;
    const onSide=()=>wreckAt(row,1,{wheels:false},placed(0,style.width/2-.06,0,0,0,way*(Math.PI/2+between(-.08,.08))));
    const upright=(options={})=>wreckAt(row,0,options,placed(0,-.17,0,0,between(-.03,.03),between(-.04,.04)));
    const second=()=>wreckAt({...row,style:STYLE_NAMES[(STYLE_NAMES.indexOf(row.style)+1)%STYLE_NAMES.length]},7,{wheels:false},placed(between(-.15,.15),style.roof-.52,between(-.3,.3),between(-.25,.25),between(-.1,.1),between(-.12,.12)));
    if(row.pose==='side')onSide();
    else if(row.pose==='stack'){upright({wheels:false});second();}
    else if(row.pose==='wire'){
      upright();
      // Bars driven down through the roof, with three strands of wire along them.
      on(row.x,row.z,row.heading,()=>{
        const tops=[-1.9,-.65,.6,1.85].map(z=>[between(-.12,.12),2.35+between(-.12,.1),z]);
        tops.forEach(top=>bar('frame',[top[0]*.4,.7,top[2]],top,.022,P.iron));
        for(let index=0;index<tops.length-1;index++)for(const drop of [.08,.42,.78]){
          const a=tops[index],b=tops[index+1],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2-drop-.07,(a[2]+b[2])/2];
          bar('frame',[a[0],a[1]-drop,a[2]],mid,.018,P.iron);bar('frame',mid,[b[0],b[1]-drop,b[2]],.018,P.iron);
        }
      });
    }else if(row.pose==='bonnet')upright({bonnet:'up'});
    else if(row.pose==='blocks'){
      // Up on drums and timber with its wheels off, half stripped.
      wreckAt(row,0,{bonnet:'off',wheels:false},placed(0,.28,0,0,.02,-.03));
      on(row.x,row.z,row.heading,()=>{for(const [x,z] of [[-.7,1.4],[.7,1.4],[-.7,-1.4],[.7,-1.4]])for(let layer=0;layer<3;layer++)for(const off of [-.17,.17])box('frame',layer%2?.56:.13,.14,layer%2?.13:.56,P.timber[(layer+(x>0))%3],x+(layer%2?0:off),.07+layer*.145,z+(layer%2?off:0),[0,between(-.12,.12),between(-.02,.02)]);tyre(1.5,.12,.6,[0,0,0]);tyre(1.55,.34,.7,[.1,0,.08]);});
    }else if(row.pose==='bedded')wreckAt(row,0,{wheels:false,bonnet:random()<.3?'off':'shut'},placed(0,row.lift,0,0,row.pitch,row.roll));
    else upright({bonnet:random()<.4?'off':'shut'});
  }

  // What lies about the yard: tyres, lengths of pipe, sheets of tin, planks and stones, kept off the things that stand and off the named spots.
  {
    const random=mulberry(0xc1a77e),between=(low,high)=>low+(high-low)*random();
    const free=(x,z,gap)=>ratsNestGround(x,z)>CUT.depth-.05&&ratsNestGround(x+gap,z)>CUT.depth-.05&&ratsNestGround(x-gap,z)>CUT.depth-.05&&
      !L.solids.some(solid=>Math.hypot(x-solid.x,z-solid.z)<Math.hypot(solid.halfX,solid.halfZ)+gap)&&!Object.values(L.spots).some(spot=>Math.hypot(x-spot.x,z-spot.z)<gap+.9)&&
      !(z>L.bays[0].z-6&&x>L.bays[0].x-2.2&&x<L.bays[5].x+2.2)&&!(Math.abs(z-ROAD.z)<4&&x<-4);
    for(let piece=0,tries=0;piece<86&&tries<900;tries++){
      const x=between(-17,17),z=between(-40,40),kind=piece%6;
      if(!free(x,z,kind===1||kind===2?1.4:.6))continue;
      const y=ground(x,z),turn=between(0,6.28);piece++;
      if(kind===0)tyre(x,y+.1,z,[between(-.08,.08),turn,between(-.08,.08)],between(.3,.36),.11,.9);
      else if(kind===1)within(placed(x,y+.045,z,turn,between(-.03,.03),0),()=>ribbed('sheet',[-.45,0,-between(.6,1.1)],[.45,0,-between(.6,1.1)],[-.45,between(0,.08),between(.5,1)],[.45,0,between(.5,1)],P.tin[piece%P.tin.length],{ragged:.2,random}));
      else if(kind===2)tube('frame',[x,y+.04,z],[x+Math.sin(turn)*between(1,2.4),y+between(.04,.16),z+Math.cos(turn)*between(1,2.4)],between(.025,.05),piece%4?P.iron:P.rust[2],5);
      else if(kind===3)box('frame',between(.12,.2),.035,between(.9,2),P.timber[piece%3],x,y+.03,z,[between(-.02,.02),turn,0]);
      else if(kind===4)stone(between(.1,.28),placed(x,y+.05,z,turn,between(-.4,.4),0),P.rock.clone().multiplyScalar(between(.6,.85)));
      else box('frame',.16,between(.2,.3),.12,(piece%4?P.rust[piece%6]:P.paint[piece%5]).clone().multiplyScalar(.8),x,y+.12,z,[between(-.2,1.5),turn,between(-.1,.1)]);
    }
  }

  // Stacks of tyres, and drums.
  for(const stack of L.tyreStacks)on(stack.x,stack.z,0,()=>{
    const random=mulberry(stack.seed),between=(low,high)=>low+(high-low)*random();
    for(let index=0;index<stack.count;index++)tyre(between(-.07,.07),.115+index*.225,between(-.07,.07),[between(-.06,.06),between(0,3),between(-.06,.06)],between(.31,.36));
    if(stack.plug)bar('frame',[.1,0,.1],[between(-.2,.2),stack.count*.23+.9,between(-.2,.2)],.03,P.iron);
  });
  for(const row of L.drums)on(row.x,row.z,0,()=>{
    const random=mulberry(row.seed),colour=(random()<.5?P.rust[Math.floor(random()*P.rust.length)]:P.paint[Math.floor(random()*P.paint.length)]).clone().multiplyScalar(.8);
    if(row.lying)drum(0,.3,-.44,colour,[Math.PI/2,random()*3,0]);else drum(0,0,0,colour,[(random()-.5)*.08,random()*6,(random()-.5)*.08]);
  });
  // Heaps of scrap: a low mound of rust with pipe, sheet and a tyre or two standing out of it.
  for(const heap of L.heaps)on(heap.x,heap.z,0,()=>{
    const random=mulberry(heap.seed),between=(low,high)=>low+(high-low)*random();
    // Several rounded mounds run together, as a heap is (docs/ART_LINE.md), not one cone.
    const mounds=[0,1,2,3].map(index=>({x:index?between(-.5,.5)*heap.radius:0,z:index?between(-.5,.5)*heap.radius:0,reach:heap.radius*between(.42,.62),high:heap.height*(index?between(.5,.85):1)}));
    surface('earth',11,11,(u,v)=>{
      const x=(u*2-1)*heap.radius*1.15,z=(v*2-1)*heap.radius*1.15,edge=smooth((1.12-Math.hypot(x,z)/heap.radius)/.5);
      let high=0;for(const mound of mounds)high=Math.max(high,mound.high*Math.exp(-((x-mound.x)**2+(z-mound.z)**2)/mound.reach**2));
      return [x,high*edge*(.85+.3*lump(Math.round(u*11),Math.round(v*11),heap.seed))-.06,z];
    },tone(0x4a3830),(u,v)=>[u*3,v*3]);
    for(let piece=0;piece<16;piece++){
      const angle=between(0,6.28),reach=between(.2,heap.radius*.8),x=Math.cos(angle)*reach,z=Math.sin(angle)*reach,y=heap.height*(1-reach/heap.radius)*.8;
      if(piece%3===0)tube('frame',[x,y,z],[x+between(-.9,.9),y+between(.3,1),z+between(-.9,.9)],between(.02,.045),P.iron,5);
      else if(piece%3===1)ribbed('sheet',[x-.5,y,z],[x+.5,y+between(-.1,.2),z+between(-.3,.3)],[x-.5+between(-.2,.2),y+between(.3,.6),z+.6],[x+.5,y+between(.3,.6),z+.7],P.tin[piece%P.tin.length],{random});
      else tyre(x,y+.15,z,[between(-.9,.9),between(0,3),between(-.9,.9)]);
    }
  });

  // The pen's gate: two leaves of angle iron and bed mesh with a car door wired to each, hung on leaning posts, and the chain.
  on(L.pen.gate.x,L.pen.gate.z,0,()=>{
    const random=mulberry(0x6a7e),between=(low,high)=>low+(high-low)*random(),halfWide=L.pen.gate.width/2;
    for(const side of [-1,1]){
      const post=side*(halfWide+.12),lean=side*.05;
      tube('frame',[post,-.3,0],[post+lean,2.45,.04*side],.075,P.tube,7);
      bar('frame',[post+lean*.6,1.5,0],[post+side*1.1,.05,-.5],.05,P.iron);
      const leaf=placed(post-side*.1,.12-side*.02,0,side>0?Math.PI+.1:-.07,0,side*.035);
      within(leaf,()=>{
        // The leaf's own metres: its hinge at 0 and its latch at 1.62 along x.
        for(const [a,b] of [[[0,0,0],[0,1.9,0]],[[1.62,0,0],[1.62,1.86,0]],[[0,0,0],[1.62,0,0]],[[0,1.9,0],[1.62,1.86,0]],[[0,0,0],[1.62,1.86,0]]])bar('frame',a,b,.045,P.iron);
        for(let wire=1;wire<8;wire++)bar('frame',[wire*.2,.95,.01],[wire*.2,1.86,.01],.012,P.tube);
        for(let wire=0;wire<5;wire++)bar('frame',[0,1+wire*.2,.01],[1.62,1+wire*.2,.01],.012,P.tube);
        surface('sheet',3,2,(u,v)=>[.1+u*1.42,.06+v*.86,.04+.06*Math.sin(u*Math.PI)*(1-v*.4)],(side>0?P.paint[1]:P.rust[3]).clone().multiplyScalar(.9));
        ribbed('sheet',[.2,.3,-.035],[1.1,.24,-.035],[.25,.9,-.035],[1.1,1,-.035],P.tin[side>0?3:0],{random});
      });
    }
    // The chain: wound twice round both latch bars, with its tail hanging and a padlock on it.
    const path=[[-.2,1.22,.07],[-.07,1.13,.09],[.07,1.12,.09],[.2,1.2,.07],[.22,1.16,-.07],[0,1.06,-.08],[-.22,1.12,-.07],[-.2,1.06,.08],[0,.98,.1],[.2,1.04,.08],[.12,.94,.1],[.08,.78,.1],[.07,.62,.09]];
    let link=0;
    for(let index=0;index<path.length-1;index++){
      const a=path[index],b=path[index+1],steps=Math.max(1,Math.round(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2])/.055));
      for(let step=0;step<steps;step++,link++){
        const p=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t];
        bar('frame',p(step/steps),p((step+1.25)/steps),link%2?.034:.011,P.iron,link%2?.011:.034);
      }
    }
    box('frame',.075,.09,.03,P.tube,.07,.56,.09,[0,0,.15]);
  });
  // In the pen: the water drum's dipper, a shade of tarpaulin slung from two posts to the wrecks, and rags to sit on.
  {
    const pen=L.pen,random=mulberry(0x9e4),between=(low,high)=>low+(high-low)*random(),y=ground(pen.x,pen.z);
    const [a,b]=pen.shade,far=[[pen.x+Math.cos(4.25)*6.1,pen.z+Math.sin(4.25)*6.1],[pen.x+Math.cos(5.25)*6.1,pen.z+Math.sin(5.25)*6.1]];
    for(const post of pen.shade)tube('frame',[post.x,y-.2,post.z],[post.x+between(-.1,.1),y+2.3,post.z+between(-.1,.1)],.04,P.timber[0],5);
    surface('sheet',5,4,(u,v)=>{
      const x0=a.x+(b.x-a.x)*u,z0=a.z+(b.z-a.z)*u,x1=far[0][0]+(far[1][0]-far[0][0])*u,z1=far[0][1]+(far[1][1]-far[0][1])*u;
      return [x0+(x1-x0)*v,y+2.25-.45*v-.5*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)-.08*lump(Math.round(u*5),Math.round(v*4),3),z0+(z1-z0)*v];
    },P.cloth[0]);
    for(let rag=0;rag<4;rag++){
      const angle=between(3.4,5.8),reach=between(3.6,5),x=pen.x+Math.cos(angle)*reach,z=pen.z+Math.sin(angle)*reach,turn=between(0,3);
      surface('sheet',2,2,(u,v)=>[x+(u-.5)*1.5*Math.cos(turn)-(v-.5)*.8*Math.sin(turn),y+.03+.04*lump(Math.round(u*2)+rag,Math.round(v*2),4),z+(u-.5)*1.5*Math.sin(turn)+(v-.5)*.8*Math.cos(turn)],P.cloth[1+rag%4].clone().multiplyScalar(.7));
    }
    tube('frame',[pen.drum.x+.2,y+.9,pen.drum.z],[pen.drum.x+.26,y+1.25,pen.drum.z+.05],.01,P.tube,4);
  }

  // A lean-to: a sloping roof of odd sheets on crooked poles, its back to the wall, a tarpaulin down one side and a bed or a bench under it.
  for(const row of L.roofs)on(row.x,row.z,row.heading,()=>{
    const random=mulberry(row.seed),between=(low,high)=>low+(high-low)*random(),w=row.wide/2,d=row.deep/2;
    const corners=[[-w,-d,row.high],[w,-d,row.high+between(-.15,.15)],[-w,d,row.low],[w,d,row.low+between(-.12,.12)]];
    corners.forEach(([x,z,top],index)=>tube('frame',[x+between(-.05,.05),-.25,z],[x+between(-.08,.08),top+.1+(index<2?between(.1,.5):.05),z+between(-.06,.06)],index%2?.04:.05,index%2?P.tube:P.timber[index%3],5));
    bar('frame',[-w-.2,row.low+.02,d],[w+.2,corners[3][2]+.02,d],.07,P.timber[1]);bar('frame',[-w-.2,row.high+.02,-d],[w+.2,corners[1][2]+.02,-d],.07,P.timber[0]);
    // Three or four sheets side by side, each its own length and colour, one of them slipped.
    const sheets=Math.round(row.wide/1.25);
    for(let sheet=0;sheet<sheets;sheet++){
      const x0=-w-.25+sheet*(row.wide+.5)/sheets,x1=x0+(row.wide+.5)/sheets+.08,slip=sheet===1?.28:0,over=between(.25,.6);
      const yAt=(x,z)=>{const u=(x+w)/row.wide,back=row.high+(corners[1][2]-row.high)*u,front=row.low+(corners[3][2]-row.low)*u;return back+(front-back)*(z+d)/row.deep+.07;};
      ribbed('sheet',[x1,yAt(x1,d+over)-slip*.2,d+over+slip],[x0,yAt(x0,d+over)-slip*.2,d+over+slip],[x1,yAt(x1,-d-.2),-d-.2+slip],[x0,yAt(x0,-d-.2),-d-.2+slip],P.tin[(sheet+row.seed)%P.tin.length],{ragged:.12,sag:between(.02,.07),random});
    }
    // Stones and a tyre hold the roof down.
    tyre(between(-w*.5,w*.5),(row.high+row.low)/2+.2,between(-.4,.4),[(row.low-row.high)/row.deep*-.9,0,0]);
    stone(.2,placed(between(-w,w)*.7,(row.high+row.low)/2+.16,between(-.3,.6),between(0,3),.2,.1),P.rock.clone().multiplyScalar(.75));
    // The side the wind comes from is closed with a tarpaulin that sags between its ties.
    surface('sheet',1,4,(u,v)=>[w+.04+.1*Math.sin(v*Math.PI*3),row.low*(1-u)*.98+(u?.12:0)+(row.high-row.low)*(1-v)*(1-u)*.9,-d+v*row.deep],P.cloth[row.seed%P.cloth.length].clone().multiplyScalar(.85));
    if(row.workshop){
      // A bench of planks on drums, a vice, a rack of spare tyres and cans of fuel.
      box('frame',2.6,.06,.7,P.timber[0],-.3,.92,-d+.5,[0,0,.015]);drum(-1.3,0,-d+.5,P.rust[2]);drum(.7,0,-d+.5,P.paint[3].clone().multiplyScalar(.7));
      box('frame',.16,.2,.24,P.iron,.4,1.05,-d+.6);bar('frame',[.4,1.14,-d+.5],[.4,1.14,-d+.95],.02,P.tube);
      for(let spare=0;spare<4;spare++)tyre(w-.5,.34+spare*.02,d-.4-spare*.26,[Math.PI/2-.14,0,0]);
      for(let can=0;can<3;can++)box('frame',.17,.46,.34,(can%2?P.paint[2]:P.rust[4]).clone().multiplyScalar(.8),-w+.4+can*.28,.23,d-.5,[0,between(-.4,.4),0]);
    }else{
      // A bed roll on a pallet of slats, and a crate.
      for(let slat=0;slat<5;slat++)box('frame',.09,.03,1.9,P.timber[slat%3],-w+.5+slat*.2,.14,-d+1.1,[0,between(-.03,.03),0]);
      for(const z of [-d+.35,-d+1.85])box('frame',.95,.1,.09,P.timber[1],-w+.9,.06,z);
      surface('sheet',2,5,(u,v)=>[-w+.5+u*.8,.18+.11*Math.sin(u*Math.PI)*(v>.8?1.6:1)+.02*lump(Math.round(v*5),row.seed%9,1),-d+.25+v*1.75],P.cloth[(row.seed+2)%P.cloth.length].clone().multiplyScalar(.75));
      for(const [a,b] of [[[.5,0,-d+.3],[.5,.42,-d+.3]],[[1.05,0,-d+.3],[1.05,.42,-d+.3]],[[.5,0,-d+.75],[.5,.42,-d+.75]],[[1.05,0,-d+.75],[1.05,.42,-d+.75]]])bar('frame',a,b,.035,P.timber[2]);
      for(const height of [.1,.3])for(const z of [-d+.3,-d+.75])box('frame',.6,.09,.02,P.timber[0],.775,height,z);
    }
  });

  // Sump's shack. In its own metres its front is +z: walls of odd sheets on a frame of poles that stand above the roof line, a roof
  // that falls to the back, held down with tyres, a stovepipe, a plank door that hangs open, a porch, and a ladder to the roof.
  on(L.shack.x,L.shack.z,L.shack.heading,()=>{
    const random=mulberry(0x50b9),between=(low,high)=>low+(high-low)*random(),w=L.shack.wide/2,d=L.shack.deep/2,front=2.95,back=2.35,porch=L.shack.porch;
    const top=z=>back+(front-back)*(z+d)/(2*d);
    for(const [x,z] of [[-w,-d],[w,-d],[-w,d],[w,d],[0,d],[0,-d]])tube('frame',[x+between(-.04,.04),-.3,z],[x+between(-.1,.1),top(z)+between(.15,.7),z+between(-.06,.06)],.05,z>0?P.tube:P.timber[1],5);
    // Each wall is two or three sheets of different heights, the door wall with a gap for the door.
    const wall=(a,b,gap=null)=>{
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]),parts=Math.max(2,Math.round(length/1.9));
      for(let part=0;part<parts;part++){
        const t0=part/parts,t1=(part+1)/parts+.02,p=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        const [x0,z0]=p(t0),[x1,z1]=p(t1),high=between(-.12,.1);
        if(gap&&part===gap){ribbed('sheet',[x0,2.05,z0],[x1,2.05,z1],[x0,top(z0)+high,z0],[x1,top(z1)+high,z1],P.tin[part%P.tin.length],{random});continue;}
        ribbed('sheet',[x0,between(0,.06),z0],[x1,between(0,.06),z1],[x0,top(z0)+high,z0],[x1,top(z1)+high,z1],P.tin[(part*2+Math.round(a[0]+a[1]+9))%P.tin.length],{ragged:.1,random});
      }
    };
    wall([-w,-d],[w,-d]);wall([w,-d],[w,d]);wall([-w,d],[-w,-d]);wall([w,d],[-w,d],1);
    // A flat car panel and a strip of other sheet patch the walls.
    box('sheet',.04,.9,1.3,P.paint[0].clone().multiplyScalar(.8),w+.05,1.3,-.5,[0,0,.03]);
    ribbed('sheet',[-w-.05,.9,.2],[-w-.05,.85,1.3],[-w-.05,1.9,.2],[-w-.05,1.95,1.3],P.tin[5],{random});
    // The roof: four sheets with their ribs running down the fall, the front edge over the porch beam.
    for(let sheet=0;sheet<4;sheet++){
      const x0=-w-.3+sheet*(L.shack.wide+.6)/4,x1=x0+(L.shack.wide+.6)/4+.08,lift=sheet%2*.035;
      ribbed('sheet',[x0,front+.14+lift,d+.55],[x1,front+.14+lift,d+.55],[x0,back+.04+lift,-d-.35],[x1,back+.04+lift,-d-.35],P.tin[(sheet*3+1)%P.tin.length],{ragged:.14,sag:between(.03,.08),random});
    }
    for(const [x,z] of [[-1.6,.4],[1.2,-.9],[.3,1.2]])tyre(x,top(z)+.3,z,[-.14,0,0]);
    stone(.24,placed(-.6,top(-1)+.24,-1,.6,.1,-.1),P.rock.clone().multiplyScalar(.75));
    bar('frame',[-w-.3,front+.08,d+.05],[w+.3,front+.06,d+.05],.09,P.timber[0]);bar('frame',[-w-.3,back+.02,-d-.05],[w+.3,back,-d-.05],.09,P.timber[1]);
    // The stovepipe, up through the back of the roof with a bend and a cowl.
    tube('frame',[1.5,1.2,-d+.6],[1.5,top(-d+.6)+.9,-d+.6],.085,P.iron,7);tube('frame',[1.5,top(-d+.6)+.9,-d+.6],[1.62,top(-d+.6)+1.35,-d+.5],.085,P.iron,7);
    tube('frame',[1.62,top(-d+.6)+1.4,-d+.5],[1.62,top(-d+.6)+1.52,-d+.5],.02,P.iron,6,.16);
    // The door: three planks and a brace, hanging open on one hinge.
    within(placed(w*.02,.04,d+.03,-.95,0,.04),()=>{
      for(let plank=0;plank<3;plank++)box('frame',.27,1.95-plank*.04,.03,P.timber[plank],.15+plank*.29,1+plank*.01,0);
      bar('frame',[.05,.3,.03],[.8,1.7,.03],.07,P.timber[1],.02);
    });
    // A window in the front wall with a flap of sheet propped open on a stick, and hubcaps nailed up beside the door.
    box('frame',.9,.7,.05,P.burnt,-1.5,1.55,d+.01);
    ribbed('sheet',[-1.98,1.95,d+.06],[-1.02,1.95,d+.06],[-1.98,1.6,d+.75],[-1.02,1.62,d+.75],P.tin[4],{random});bar('frame',[-1.1,1.25,d+.08],[-1.08,1.62,d+.7],.02,P.timber[2]);
    for(const [x,y,radius] of [[1.35,1.9,.19],[1.85,1.55,.17],[1.5,1.25,.2],[2.15,2.05,.16]]){const cap=new THREE.CylinderGeometry(radius,radius*.82,.035,9);cap.rotateX(Math.PI/2);cap.translate(x,y,d+.07);keep('frame',cap,P.chrome.clone().multiplyScalar(between(.6,1)));}
    // The porch: two leaning poles, a beam, and a sheet and a tarpaulin over it.
    const beam=front-.45,posts=[-2.35,2.35].map(x=>[x,d+porch-.1]);
    posts.forEach(([x,z],index)=>tube('frame',[x,-.25,z],[x+(index?.07:-.05),beam+.25,z+.05],.045,P.timber[index],5));
    bar('frame',[-2.6,beam+.05,d+porch-.1],[2.6,beam,d+porch-.1],.07,P.timber[2]);
    ribbed('sheet',[-.2,beam+.1,d+porch+.25],[2.6,beam+.08,d+porch+.25],[-.2,front+.02,d+.3],[2.6,front+.02,d+.3],P.tin[2],{ragged:.15,sag:.06,random});
    surface('sheet',4,3,(u,v)=>[-2.6+u*2.5,front-.02-(front-beam-.1)*v-.22*Math.sin(u*Math.PI)*Math.sin(v*Math.PI)-.05*lump(Math.round(u*4),Math.round(v*3),6),d+.3+v*(porch-.05)],P.cloth[3].clone().multiplyScalar(.8));
    // A car's bench seat to sit on, and the ladder to the roof where Sump shouts from.
    box('frame',1.5,.2,.5,P.cloth[2].clone().multiplyScalar(.6),1.4,.36,d+.6,[0,0,.02]);box('frame',1.5,.5,.14,P.cloth[2].clone().multiplyScalar(.55),1.4,.72,d+.36,[-.2,0,.02]);
    for(const x of [.75,2.05])bar('frame',[x,0,d+.4],[x,.28,d+.8],.03,P.iron);
    for(const side of [-.24,.24])bar('frame',[-w-.9,0,-.4+side],[-w-.12,back+.9,-.4+side],.045,P.timber[2]);
    for(let rung=0;rung<8;rung++){const t=(rung+.6)/8.6;bar('frame',[-w-.9+.78*t,(back+.9)*t,-.66],[-w-.9+.78*t,(back+.9)*t,-.14],.03,P.timber[0]);}
  });
  // The table: a car's bonnet laid on two trestles, with the book in which Sump writes down what he is owed, a mug and a scale pan.
  on(L.shack.table.x,L.shack.table.z,L.shack.table.heading,()=>{
    const random=mulberry(0x7ab1e),between=(low,high)=>low+(high-low)*random(),high=L.shack.table.height;
    for(const z of [-.34,.34]){
      bar('frame',[-.62,high-.07,z],[.62,high-.07,z],.07,P.timber[0]);
      for(const x of [-.55,.55])for(const splay of [-.2,.2])bar('frame',[x,high-.08,z],[x+Math.sign(x)*.1,0,z+splay],.045,P.timber[1+(x>0)]);
      bar('frame',[-.6,.3,z-.12],[.6,.34,z+.12],.03,P.timber[2],.015);
    }
    surface('sheet',4,3,(u,v)=>[(u-.5)*1.5*(1-.1*v),high+.05*Math.sin(u*Math.PI)+.02*Math.sin(v*Math.PI)+between(-.004,.004),(v-.5)*1.15],P.paint[4].clone().multiplyScalar(.8));
    box('frame',.26,.035,.19,P.cloth[3].clone().multiplyScalar(.6),-.35,high+.07,.12,[0,.3,0]);
    tube('frame',[.3,high+.04,-.2],[.3,high+.15,-.2],.04,P.tube,6);tube('frame',[.05,high+.045,.22],[.05,high+.06,.22],.13,P.chrome.clone().multiplyScalar(.7),8,.15);
  });

  // The Glasshouse's water cart. No Glasshouse look has merged, so this is a plain three-wheeled motor cart of the size the Glasshouse's
  // card gives (a drum of about 400 litres): a frame of tube, one wheel on forks in front and two behind, a seat over a small engine,
  // the drum in a cradle, and old windscreens in their stake frames stacked against a rack over it and roped down.
  on(L.cart.x,L.cart.z,L.cart.heading,()=>{
    const random=mulberry(0xca27),between=(low,high)=>low+(high-low)*random(),wheel=.29;
    const cartWheel=(x,z)=>{tyre(x,wheel,z,[0,0,Math.PI/2],wheel,.075);const hub=new THREE.CylinderGeometry(.15,.15,.045,8);hub.rotateZ(Math.PI/2);hub.translate(x,wheel,z);keep('frame',hub,P.iron);};
    for(const side of [-1,1]){
      cartWheel(side*.64,-.95);
      tube('frame',[side*.5,.46,-1.3],[side*.42,.46,.35],.024,P.tube,5);tube('frame',[side*.42,.46,.35],[side*.07,.78,1.02],.024,P.tube,5);
      tube('frame',[side*.07,.98,1],[side*.09,wheel,1.3],.02,P.iron,5);
      bar('frame',[side*.5,.46,-.95],[side*.5,wheel,-.95],.04,P.iron);
    }
    cartWheel(0,1.3);tube('frame',[-.64,wheel,-.95],[.64,wheel,-.95],.022,P.iron,5);
    for(const z of [-1.3,-.5,.3])tube('frame',[-.5,.46,z],[.5,.46,z],.022,P.tube,5);
    tube('frame',[-.34,1.02,.93],[.34,1.02,.93],.016,P.iron,5);tube('frame',[0,.78,1.02],[0,1.02,.95],.03,P.iron,6);
    box('frame',.13,.13,.1,P.burnt,0,.9,1.12);
    // The engine under the seat: a finned barrel, a small tank and a pipe.
    for(let fin=0;fin<4;fin++)box('frame',.24,.014,.22,P.iron,0,.5+fin*.045,.42);
    box('frame',.2,.2,.3,P.burnt,0,.38,.42,[0,0,.04]);tube('frame',[-.14,.72,.6],[.14,.72,.6],.085,P.paint[2].clone().multiplyScalar(.7),7);
    tube('frame',[.12,.4,.4],[.5,.3,-.6],.02,P.rust[2],5);
    surface('frame',3,2,(u,v)=>[(u-.5)*.42,.82+.05*(Math.abs(u-.5)*2)**2+.1*v*v,.1+v*.36],P.rust[4]);bar('frame',[0,.48,.25],[0,.8,.25],.03,P.iron);
    // The deck of planks and the drum lying in its cradle, banded, with its tap at the back.
    for(let plank=0;plank<4;plank++)box('frame',.29,.03,1.55,P.timber[plank%3],-.45+plank*.3,.5,-.53,[0,between(-.02,.02),0]);
    const tank=new THREE.CylinderGeometry(.37,.37,1.02,11);tank.rotateX(Math.PI/2);tank.translate(0,.95,-.55);keep('frame',tank,P.paint[3].clone().multiplyScalar(.8));
    for(const z of [-.9,-.2]){const band=new THREE.TorusGeometry(.375,.012,3,11);band.translate(0,.95,z);keep('frame',band,P.iron);for(const side of [-1,1])bar('frame',[side*.42,.52,z],[side*.2,.66,z],.05,P.timber[1]);}
    tube('frame',[0,.66,-1.06],[0,.6,-1.2],.02,P.chrome,5);tube('frame',[0,1.32,-.4],[0,1.36,-.4],.05,P.iron,6);
    // The rack and the frames: each frame is four laths round a windscreen.
    for(const z of [-1.25,.15]){for(const side of [-1,1])bar('frame',[side*.5,.5,z],[side*.08,1.92,z],.035,P.timber[2]);bar('frame',[-.12,1.9,z],[.12,1.9,z],.035,P.timber[0]);}
    bar('frame',[0,1.9,-1.3],[0,1.9,.2],.035,P.timber[1]);
    const screen=(matrix,crack)=>within(matrix,()=>{
      const wide=between(1.24,1.38),tall=between(.6,.7);
      for(const [a,b] of [[[-wide/2,0,0],[wide/2,0,0]],[[-wide/2,tall,0],[wide/2,tall,0]],[[-wide/2,0,0],[-wide/2,tall,0]],[[wide/2,0,0],[wide/2,tall,0]]])bar('frame',a,b,.03,P.timber[crack%3],.022);
      surface('glass',4,1,(u,v)=>[(u-.5)*(wide-.08)*(1-.12*v),.04+v*(tall-.08),.012+.07*Math.sin(u*Math.PI)],P.glass);
      if(crack%2)bar('frame',[-.2,.15,.075],[.25,.52,.075],.012,P.cloth[4]);
    });
    for(const side of [-1,1])for(let leaf=0;leaf<3;leaf++)screen(placed(side*(.5+leaf*.06),.53+leaf*.02,-.55+between(-.05,.05),side*Math.PI/2+between(-.03,.03),-.31,0),leaf+(side>0?3:0));
    screen(placed(0,1.96,-.55,Math.PI/2,-Math.PI/2+.04,0),1);
    // Rope over the lot, down to the frame on both sides.
    for(const z of [-1.05,-.1]){const over=[[-.62,.47,z],[-.66,1.2,z],[-.2,1.98,z],[.2,2,z],[.66,1.2,z],[.62,.47,z]];for(let index=0;index<over.length-1;index++)tube('frame',over[index],over[index+1],.011,P.rope,4);}
  });

  // The drain: the pipe from the yard to the gully, a broken concrete face round its mouth with two wing walls, and a rusted grating
  // that has been bent back and left hanging.
  {
    const drain=L.drain,y=floorY,outer=drain.inner+drain.shell,length=drain.length+.9,middle=(drain.from+drain.to)/2;
    const shell=new THREE.CylinderGeometry(outer,outer,length,14,1,true),bore=new THREE.CylinderGeometry(drain.inner,drain.inner,length,14,1,true);
    bore.scale(-1,1,1);bore.index.array.reverse();
    for(const geometry of [shell,bore]){geometry.rotateZ(Math.PI/2);geometry.translate(middle,y+drain.inner-.04,drain.z);keep('earth',geometry,geometry===bore?P.stain:P.concrete);}
    for(const end of [drain.from-.45,drain.to+.45]){const lip=new THREE.RingGeometry(drain.inner,outer,14);lip.rotateY(end<middle?-Math.PI/2:Math.PI/2);lip.translate(end,y+drain.inner-.04,drain.z);keep('earth',lip,P.concrete);}
    // The face: one cast slab with the pipe's round hole through it, a corner broken off, leaning back a little, and two low wings
    // that flare out into the yard.
    const centre=y+drain.inner-.04,wide=2.35,low=centre-y+.15,high=3.05-(centre-y);
    surface('earth',28,1,(u,v)=>{
      const angle=u*Math.PI*2,dy=Math.sin(angle),dz=Math.cos(angle);
      if(!v)return [drain.from-.02,centre+dy*outer,drain.z+dz*outer];
      let reach=Math.min(Math.abs(dz)>1e-6?wide/Math.abs(dz):Infinity,Math.abs(dy)>1e-6?(dy>0?high:low)/Math.abs(dy):Infinity);
      if(dy>.45&&dz>.5)reach*=.8;
      return [drain.from+.06+.05*dy*reach,centre+dy*reach,drain.z+dz*reach];
    },P.concrete,(u,v)=>[u*6,v*1.2]);
    surface('earth',6,1,(u,v)=>[drain.from+.06+.14+v*.5,y+3.05-(u>.82?.5:0)+.02*lump(Math.round(u*6),3,1),drain.z-wide+u*wide*2],P.concrete.clone().multiplyScalar(.85),(u,v)=>[u*2,v*.3]);
    for(const side of [-1,1]){
      const a=[drain.from+.05,drain.z+side*(wide-.25)],b=[drain.from-1.75,drain.z+side*(wide+.82)];
      surface('earth',3,2,(u,v)=>[a[0]+(b[0]-a[0])*u+.06*v,y-.1+v*(2.5-1.45*u+.1*lump(Math.round(u*3),side+2,4)),a[1]+(b[1]-a[1])*u+side*.05*v],P.concrete.clone().multiplyScalar(.92),(u,v)=>[u*1.2,v]);
      surface('earth',3,1,(u,v)=>[a[0]+(b[0]-a[0])*u+.06+v*.28*.53,y-.1+2.5-1.45*u,a[1]+(b[1]-a[1])*u+side*(.05+v*.28*.85)],P.concrete.clone().multiplyScalar(.8),(u,v)=>[u*1.2,v*.2]);
      bar('frame',[drain.from+.2,y+3,drain.z+side*1.4],[drain.from-.05,y+3.4,drain.z+side*1.5],.016,P.iron);
    }
    within(placed(drain.from-.5,y+.05,drain.z-outer+.1,.9,0,-.1),()=>{
      for(let rod=0;rod<6;rod++)bar('frame',[0,0,.15+rod*.3],[0,1.75,.15+rod*.3],.025,P.rust[2]);
      for(const height of [.05,.9,1.72])bar('frame',[0,height,.1],[0,height,1.7],.03,P.rust[3]);
    });
  }

  // Three tyre fires: a leaning stack of tyres, the lower ones burnt down to their wire, on scorched ground.
  const flames=[],embers=[];
  for(const [index,fire] of L.fires.entries())on(fire.x,fire.z,0,()=>{
    const random=mulberry(fire.seed),between=(low,high)=>low+(high-low)*random();
    for(let layer=0;layer<5;layer++)tyre(between(-.12,.12)+layer*.03,.1+layer*.2,between(-.12,.12),[between(-.12,.12),between(0,3),between(-.1,.1)],.34,layer<2?.07:.115,layer<2?.6:1);
    for(let lying=0;lying<3;lying++){const angle=between(0,6.28);tyre(Math.cos(angle)*.75,.14,Math.sin(angle)*.75,[between(.9,1.3),angle,0],.33,.11);}
    for(let wire=0;wire<4;wire++){const angle=between(0,6.28);const ring=new THREE.TorusGeometry(.3,.008,3,9);ring.rotateX(Math.PI/2+between(-.5,.5));ring.translate(Math.cos(angle)*between(.4,1.1),.04,Math.sin(angle)*between(.4,1.1));keep('frame',ring,P.iron);}
    const glow=new THREE.CylinderGeometry(.42,.6,.16,9);glow.translate(0,.2,0);keep('glow',glow,new THREE.Color(1.5,.42,.07));
    embers.push({x:fire.x,z:fire.z});
    for(const [dx,dz,wide,tall] of [[0,0,1.5,2.7],[-.32,.12,.95,1.6],[.3,-.1,1,1.8]])flames.push({x:fire.x+dx,y:ground(fire.x,fire.z)+.35,z:fire.z+dz,wide,tall,seed:index*.31+dx});
  });

  // The lamps: a storm lamp under the porch, and one each on a pole at the gate and at the bays.
  const lampAt=[];
  for(const lamp of L.lamps){
    const base=ground(lamp.x,lamp.z);let x=lamp.x,z=lamp.z;
    if(lamp.pole){
      const tx=lamp.x+lamp.lean[0]*lamp.height,tz=lamp.z+lamp.lean[1]*lamp.height,ax=tx+.5,az=tz+.12;
      tube('frame',[lamp.x,base-.3,lamp.z],[tx,base+lamp.height+.25,tz],.05,P.timber[1],6);bar('frame',[tx,base+lamp.height+.15,tz],[ax,base+lamp.height+.02,az],.035,P.iron);
      bar('frame',[tx,base+lamp.height-.45,tz],[ax-.1,base+lamp.height+.05,az],.02,P.iron);x=ax;z=az;
    }
    const y=base+lamp.height-.22;
    bar('frame',[x,y+.34,z],[x,y+.16,z],.012,P.iron);
    tube('frame',[x,y+.13,z],[x,y+.17,z],.075,P.iron,7,.03);tube('frame',[x,y-.15,z],[x,y-.09,z],.07,P.iron,7,.085);
    for(const side of [-1,1])bar('frame',[x+side*.075,y-.1,z],[x+side*.075,y+.15,z],.008,P.iron);
    const flame=new THREE.CylinderGeometry(.045,.055,.2,6);flame.translate(x,y+.02,z);keep('glow',flame,night?new THREE.Color(2.4,1.25,.42):new THREE.Color(.16,.14,.1));
    lampAt.push({x,y,z,base});
  }

  // What lies on the ground: oil under each bay, tyre tracks in and out of the bays and down the road, scorch round each fire, the
  // drain's silt, and the fan of tracks on the land at the top of the road, which is the Nest's other tell.
  {
    const random=mulberry(0x7a4c5),between=(low,high)=>low+(high-low)*random();
    // A mark lying on the ground about a point: its long side along a heading.
    const mark=(kind,list,x,z,heading,long,wide,colour,strength=1)=>{
      const [cu,cv]=MARK[kind],sin=Math.sin(heading),cos=Math.cos(heading),positions=[],uvs=[];
      const rows=Math.max(1,Math.round(long/2.2));
      const corner=(u,v)=>{const lx=(u-.5)*wide,lz=(v-.5)*long,px=x+lx*cos+lz*sin,pz=z-lx*sin+lz*cos;return [px,ground(px,pz)+(list==='pools'?.13:.09),pz];};
      for(let row=0;row<rows;row++)for(const [u,v] of [[0,row],[0,row+1],[1,row],[1,row],[0,row+1],[1,row+1]]){
        positions.push(...corner(u,v/rows));uvs.push((cu+.02+u*.96)/2,(cv+.02+(v/rows)*.96)/2);
      }
      faces(list,positions,colour.clone().multiplyScalar(strength),uvs);
    };
    for(const bay of L.bays){
      mark('spill','marks',bay.x+between(-.3,.3),bay.z+between(-.2,.9),between(0,3),between(1.5,2.4),between(1.2,1.9),P.oil);
      if(random()<.6)mark('spill','marks',bay.x+between(-.7,.7),bay.z-between(.6,1.6),between(0,3),between(.6,1.1),between(.5,.9),P.oil,.8);
      for(const side of [-.62,.62])for(let piece=0;piece<4;piece++)mark('track','marks',bay.x+side+between(-.05,.05),bay.z-bay.depth/2-1.2-piece*2.3+2.6,between(-.03,.03),2.7,.34,P.track,between(.45,.9));
    }
    for(let x=ROAD.top-10;x<ROAD.foot+7;x+=2.3)for(const side of [-1.9,-.75,.7,1.85])if(random()<.85)mark('track','marks',x,ROAD.z+side+between(-.15,.15),Math.PI/2+between(-.03,.03),2.75,.36,P.track,between(.5,1));
    // The fan of tracks west of the road's top: many cars have come in from many ways.
    for(const spread of [-.5,-.28,-.1,.08,.3,.52])for(let piece=1;piece<5;piece++){
      const reach=piece*2.7,x=ROAD.top-10-Math.cos(spread)*reach,z=ROAD.z+Math.sin(spread)*reach;
      if(Math.hypot(x,z)<L.radius-2)for(const side of [-.62,.62])mark('track','marks',x+Math.sin(spread)*side,z+Math.cos(spread)*side,Math.PI/2-spread,2.75,.36,P.track,between(.35,.8));
    }
    for(const fire of L.fires)mark('scorch','marks',fire.x,fire.z,between(0,3),4.6,4.6,P.soot,.95);
    mark('spill','marks',L.drain.from-3.4,L.drain.z,Math.PI/2,6.4,3,P.stain,.7);
    mark('spill','marks',L.shack.table.x+.4,L.shack.table.z+.5,1,2.2,1.6,P.oil,.5);
    // The yard's floor is trodden and oil-soaked where people and cars go: dark soft patches along the ways between things.
    for(const [x,z,size,strength] of [[2,-17,9,.3],[-4,-6,8,.34],[1,6,10,.3],[-6,18,9,.36],[3,27,12,.42],[-14,29,8,.4],[9,22,7,.3],[5,-1,6,.4],[2,-28,9,.34]])
      mark('spill','marks',x,z,between(0,3),size*between(1.1,1.6),size*1.1,P.worn,strength*.42);
    if(night){
      for(const fire of L.fires)mark('soft','pools',fire.x,fire.z,0,15,15,new THREE.Color(.55,.2,.045));
      for(const lamp of lampAt)mark('soft','pools',lamp.x,lamp.z,0,8,8,new THREE.Color(.42,.24,.08));
    }
  }

  // Merge each material's pieces, put the wear over the scrap, and add the fires, the smoke and (at night) the lights.
  const grain=earthGrain(),marks=groundMarks();
  const materials={
    sheet:new THREE.MeshStandardMaterial({name:'sheet, shells and cloth',vertexColors:true,roughness:.88,metalness:.08,side:THREE.DoubleSide,flatShading:true}),
    frame:new THREE.MeshStandardMaterial({name:'poles, iron, timber and rubber',vertexColors:true,roughness:.9,metalness:.08}),
    earth:new THREE.MeshStandardMaterial({name:'cut earth, rubble, concrete and rubber',vertexColors:true,roughness:1,metalness:0,map:grain}),
    glass:new THREE.MeshStandardMaterial({name:'old windscreens',vertexColors:true,roughness:.22,metalness:0,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false}),
    glow:new THREE.MeshBasicMaterial({name:'embers and lamp flames',vertexColors:true}),
    marks:new THREE.MeshStandardMaterial({name:'oil, tracks and scorch',vertexColors:true,map:marks,roughness:.85,metalness:0,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
    pools:new THREE.MeshBasicMaterial({name:'firelight on the ground',vertexColors:true,map:marks,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),
  };
  // The wear reads heights from the yard's floor, so that dust and shade gather low on things that stand in the cutting.
  const floor=new THREE.Object3D();floor.name='The yard floor';floor.position.set(0,floorY,0);group.add(floor);
  const wear=createScrapWear({soot:L.fires.map(fire=>[fire.x,1,fire.z,2.4]),dustTop:1.1,paint:.7});
  for(const [kind,list] of Object.entries(kit.lists)){
    if(!list.length)continue;
    if(kind==='sheet'||kind==='frame')wear.apply(materials[kind]);
    const merged=mergeGeometries(list);for(const geometry of list)geometry.dispose();
    const mesh=new THREE.Mesh(merged,materials[kind]);mesh.name=`The Rats' Nest, ${materials[kind].name}`;
    mesh.castShadow=kind==='sheet'||kind==='frame'||kind==='earth';mesh.receiveShadow=mesh.castShadow;
    if(kind==='marks')mesh.renderOrder=1;if(kind==='pools'||kind==='glass')mesh.renderOrder=2;
    group.add(mesh);
  }
  // The flames are one draw: scrap-look's flame, with each tongue standing at its own place and flickering to its own time.
  const flameMaterial=createFlameMaterial();
  flameMaterial.fragmentShader=flameMaterial.fragmentShader.replaceAll('uniform float uSeed','varying float vSeed').replaceAll('uSeed','vSeed');
  flameMaterial.vertexShader=`
    attribute vec3 aFoot;attribute float aSeed;varying vec2 vUv;varying float vSeed;
    void main(){
      vUv=uv;vSeed=aSeed;
      vec3 foot=(modelMatrix*vec4(aFoot,1.0)).xyz;
      vec3 right=normalize(vec3(viewMatrix[0][0],0.0,viewMatrix[2][0]));
      gl_Position=projectionMatrix*viewMatrix*vec4(foot+right*position.x+vec3(0.0,position.y,0.0),1.0);
    }`;
  delete flameMaterial.uniforms.uSeed;
  {
    const positions=[],uvs=[],feet=[],seeds=[],indices=[];
    flames.forEach((flame,index)=>{
      for(const [u,v] of [[0,0],[1,0],[0,1],[1,1]]){positions.push((u-.5)*flame.wide,v*flame.tall,0);uvs.push(u,v);feet.push(flame.x,flame.y,flame.z);seeds.push(flame.seed);}
      indices.push(index*4,index*4+1,index*4+2,index*4+1,index*4+3,index*4+2);
    });
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geometry.setAttribute('aFoot',new THREE.Float32BufferAttribute(feet,3));geometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));geometry.setIndex(indices);
    const mesh=new THREE.Mesh(geometry,flameMaterial);mesh.name='The Rats\' Nest, tyre fires';mesh.frustumCulled=false;mesh.renderOrder=3;group.add(mesh);
  }
  // Black tyre smoke from each fire, tall enough to stand over the rim from far off, leaning with the wind.
  const columns=L.fires.map((fire,index)=>{
    const column=createSmokeColumn({height:92+index*6,foot:.7,top:17+index,wind,lean:.36+index*.04,colour:0x0b0a09,pale:0x3b3733,strength:.9});
    column.name=`The Rats' Nest, smoke of tyre fire ${index+1}`;column.position.set(fire.x,ground(fire.x,fire.z)+1.5,fire.z);group.add(column);return column;
  });
  const lights=[];
  if(night){
    for(const fire of L.fires){const light=new THREE.PointLight(0xff8436,105,30,2);light.position.set(fire.x,ground(fire.x,fire.z)+1.7,fire.z);light.userData={strength:105,flicker:fire.seed};group.add(light);lights.push(light);}
    for(const lamp of lampAt){const light=new THREE.PointLight(0xffb060,34,15,2);light.position.set(lamp.x,lamp.y-.05,lamp.z);light.userData={strength:34,flicker:null};group.add(light);lights.push(light);}
  }
  const count={draws:0};group.traverse(node=>{if(node.isMesh||node.isPoints||node.isLine)count.draws++;});
  group.userData={stage,triangles:kit.triangles+flames.length*2+columns.length*56,draws:count.draws,flames:flameMaterial,columns,lights,wear,floor,pools:materials.pools,
    dispose(){grain.dispose();marks.dispose();group.traverse(node=>{node.geometry?.dispose();node.material?.dispose?.();});}};
  return group;
}

/** The parts that move: the flames, the smoke, and at night the flicker of the firelight. `seconds` is the game's own clock. */
export function updateRatsNest(group,seconds){
  const data=group?.userData;
  if(!data?.flames||!Number.isFinite(seconds))return;
  data.flames.uniforms.uTime.value=seconds;
  for(const column of data.columns)column.userData.update(seconds);
  data.wear.follow(data.floor);
  let brightest=1;
  for(const light of data.lights){
    if(light.userData.flicker===null)continue;
    const k=light.userData.flicker,flick=.86+.09*Math.sin(seconds*9.1+k)+.07*Math.sin(seconds*14.7+k*1.7)+.05*Math.sin(seconds*23.3+k*.6);
    light.intensity=light.userData.strength*flick;brightest=flick;
  }
  data.pools.color.setScalar(.9+.1*brightest);
}
