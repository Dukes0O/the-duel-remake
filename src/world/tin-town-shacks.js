// Tin Town's shacks (SCABLANDS-LAND follow-up), drawn in code around the town's own model: tin shacks stacked one, two or
// three high on scaffold legs with plank walkways, rails and ladders, in six clusters on a rough ring; a water tower; a
// radio pole with a lamp; washing lines; warm lamps by some doors; and a tin fence along the outside of the ring.
// The layout is a fixed list (a fixed seeded sequence picks each shack's little differences), so it is the same on every
// run and the solids can be listed before anything is drawn. Nothing here changes race state.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {scablandsSurfaceHeightAt} from './scablands-ground.js';
import {createScrapWear} from './scrap-look.js';

export const TIN_TOWN_CENTRE=Object.freeze({x:600,z:0});
// The places where jobs arrive and the roads they use keep clear of everything drawn here: a circle of 24 m round the
// town's centre and 10 m either side of these lines (the furnace's path, both gas-run roads, job 4's safe road, the line
// from the yard, and the line from the gate to the town's centre). Copied from src/world/jobs/everburn.js and
// gas-run.js; tools/test-scablands-scene.mjs reads the real paths and checks the drawing against them.
export const TIN_TOWN_CLEAR_RADIUS=24,TIN_TOWN_CLEAR_ROAD=10;
export const TIN_TOWN_ROADS=Object.freeze([
  [[0,0],[600,0]],[[575,62],[600,0]],
  [[545,252],[610,170]],[[610,170],[575,62]],[[575,62],[430,70]],
  [[350,-200],[480,-90]],[[480,-90],[600,0]],
  [[250,415],[447,308]],[[447,308],[575,62]],
  [[230,150],[600,0]],
].map(line=>Object.freeze(line.map(point=>Object.freeze(point)))));
// The existing Tin Town model's footprint, its solid box (SCABLANDS_SOLIDS 'tin-town-shell') and the gate with its fence
// (src/world/tin-town-gate.js: 6.6 to 20.6 m each side of (575, 62) along x): kept off, with a margin.
const OFF_LIMITS=Object.freeze([
  {x0:570,x1:634,z0:-30,z1:30},{x0:538.5,x1:569.5,z0:-11.5,z1:11.5},{x0:553,x1:597,z0:58,z1:66},
]);

// Shack sizes, in metres: width, depth, wall height.
const SIZES=Object.freeze({S:[3,3,2.6],M:[4,3,2.6],L:[5,4,3]});
const CELL=Object.freeze({x:7.5,z:6.5});     // five by four metre bays with alleys 2.5 m wide between them
const LEVEL=3.3,DECK_LIFT=.3,MARGIN=1.2;
// Six clusters. Each has six slots (three along, two across): the number of shacks stacked in each (0 is open ground,
// T the water tower, P the radio pole) and their sizes. 45 shacks in all.
const CLUSTERS=Object.freeze([
  {angle:-108,stack:[3,2,1,1,'T',1],size:'LMSMSL'},
  {angle:-72,stack:[2,1,2,1,1,0],size:'MSLSML'},
  {angle:-36,stack:[3,1,1,2,1,'P'],size:'SLMLSM'},
  {angle:-2,stack:[2,2,1,1,1,0],size:'LSMMLS'},
  {angle:34,stack:[3,1,2,1,1,0],size:'MLSLMS'},
  {angle:68,stack:[2,1,1,2,1,0],size:'SMLMLS'},
]);
const FENCE_RADIUS=88,FENCE_FROM=114,FENCE_TO=-110;

const mulberry=seed=>()=>{seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const height=(x,z)=>scablandsSurfaceHeightAt(x,z);
const rectDistance=(rect,x,z)=>Math.hypot(Math.max(rect.x0-x,0,x-rect.x1),Math.max(rect.z0-z,0,z-rect.z1));
const segmentDistance=(x,z,[[ax,az],[bx,bz]])=>{
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-ax-dx*t,z-az-dz*t);
};
export const nearestTinTownRoad=(x,z)=>Math.min(...TIN_TOWN_ROADS.map(line=>segmentDistance(x,z,line)));
// The smallest distance from a rectangle to a line, found along the line.
function rectRoadDistance(rect,line){
  const [[ax,az],[bx,bz]]=line,length=Math.hypot(bx-ax,bz-az);let closest=Infinity;
  for(let metres=0;metres<=length;metres+=.5)closest=Math.min(closest,rectDistance(rect,ax+(bx-ax)*metres/length,az+(bz-az)*metres/length));
  return closest;
}
const overlap=(a,b,gap)=>a.x0-gap<b.x1&&a.x1+gap>b.x0&&a.z0-gap<b.z1&&a.z1+gap>b.z0;
const groundSpread=rect=>{
  let low=Infinity,high=-Infinity;
  for(let x=rect.x0;x<=rect.x1+.01;x+=Math.max(1,(rect.x1-rect.x0)/6))for(let z=rect.z0;z<=rect.z1+.01;z+=Math.max(1,(rect.z1-rect.z0)/4)){const h=height(x,z);low=Math.min(low,h);high=Math.max(high,h);}
  return high-low;
};

let layout=null;
// The clusters' places, found once: the first spot near each cluster's angle that keeps every rule (35 to 80 m from the
// centre, clear of the circle, the roads and the existing model, 10 m of clear ground between clusters, flat ground).
export function tinTownLayout(){
  if(layout)return layout;
  const clusters=[];
  for(const [index,spec] of CLUSTERS.entries()){
    let placed=null;
    search:for(const radius of [50,56,44,62,40,68,36]){
      for(const turnAngle of [0,5,-5,10,-10,15,-15,20,-20,25,-25,30,-30,35,-35,40,-40]){
        const angle=(spec.angle+turnAngle)*Math.PI/180,cx=Math.round(TIN_TOWN_CENTRE.x+Math.cos(angle)*radius),cz=Math.round(TIN_TOWN_CENTRE.z+Math.sin(angle)*radius);
        // Clusters that stand east or west of the town are turned, so that their long side runs round the ring.
        const turned=Math.abs(Math.cos(angle))>.72,long=CELL.x+2.5+MARGIN,short=CELL.z/2+2+MARGIN,halfX=turned?short:long,halfZ=turned?long:short;
        const rect={x0:cx-halfX,x1:cx+halfX,z0:cz-halfZ,z1:cz+halfZ};
        const ring=Math.hypot(cx-TIN_TOWN_CENTRE.x,cz-TIN_TOWN_CENTRE.z);
        if(ring<35||ring>80)continue;
        if(rectDistance(rect,TIN_TOWN_CENTRE.x,TIN_TOWN_CENTRE.z)<TIN_TOWN_CLEAR_RADIUS+3)continue;
        if(TIN_TOWN_ROADS.some(line=>rectRoadDistance(rect,line)<TIN_TOWN_CLEAR_ROAD+1))continue;
        if(OFF_LIMITS.some(box=>overlap(rect,box,3)))continue;
        if(clusters.some(other=>overlap(rect,other.rect,10)))continue;
        if(groundSpread(rect)>1.5)continue;
        placed={index,centre:{x:cx,z:cz},turned,rect};break search;
      }
    }
    if(!placed)throw Error(`Tin Town's cluster ${index+1} has no place that keeps the rules.`);
    clusters.push(placed);
  }
  // Each slot's centre in the world, its stack, its size, and whether the ground under it lets a shack stand.
  for(const cluster of clusters){
    const spec=CLUSTERS[cluster.index];cluster.slots=spec.stack.map((stack,slot)=>{
      const column=slot%3,row=Math.floor(slot/3),along=(column-1)*CELL.x,across=(row-.5)*CELL.z;
      const x=cluster.centre.x+(cluster.turned?across:along),z=cluster.centre.z+(cluster.turned?along:across);
      const kind=typeof stack==='string'?stack:stack>0?'shack':'open',size=SIZES[spec.size[slot]];
      const cell=cluster.turned?{w:size[1],d:size[0]}:{w:size[0],d:size[1]};
      const footprint={x0:x-cell.w/2-.4,x1:x+cell.w/2+.4,z0:z-cell.d/2-.4,z1:z+cell.d/2+.4};
      const flat=kind==='open'||kind==='T'||kind==='P'||groundSpread(footprint)<=1.5;
      return {slot,x,z,kind,levels:flat&&kind==='shack'?stack:0,sizeName:spec.size[slot],size,cell,flat,facing:row===0?1:-1};
    });
    cluster.shacks=cluster.slots.reduce((sum,slot)=>sum+slot.levels,0);
  }
  layout=Object.freeze({clusters:Object.freeze(clusters),shacks:clusters.reduce((sum,cluster)=>sum+cluster.shacks,0)});
  return layout;
}

// ---- Drawing ----------------------------------------------------------------------------------------------------------
// Colours from tintown.glb's own materials (linear values, as the file stores them), so that the new shacks match the old.
const color=(r,g,b,k=.84)=>new THREE.Color().setRGB(r*k,g*k,b*k);
const PALETTE={
  sheet:[color(.24,.22,.18),color(.31,.105,.045),color(.2,.085,.04),color(.3,.28,.22),color(.17,.15,.12),color(.28,.17,.08)],
  patch:[color(.24,.19,.13),color(.36,.31,.22),color(.46,.36,.22),color(.15,.19,.21),color(.31,.105,.045),color(.4,.34,.2)],
  iron:color(.075,.078,.07,1),girder:color(.17,.15,.13),plank:color(.24,.19,.13),dark:color(.018,.016,.014,1),
  tank:color(.26,.1,.05),cloth:[color(.46,.36,.22),color(.5,.14,.07),color(.16,.2,.22),color(.36,.31,.22),color(.34,.4,.28)],
};

function stripOfSheet(width,high){
  // A zig-zag strip standing up: a rib every 0.2 m, 3.5 cm out and in. Faces +Z.
  const ribs=Math.max(2,Math.round(width/.2)),positions=[],indices=[];
  for(let rib=0;rib<=ribs;rib++){const x=-width/2+width*rib/ribs,z=rib%2?.035:-.035;positions.push(x,0,z,x,high,z);}
  for(let rib=0;rib<ribs;rib++){const a=rib*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);
  geometry.computeVertexNormals();return geometry;
}

// Collects pieces by material, each with its own colour in its vertices, and merges them: one mesh a material.
function assembly(){
  const lists={sheet:[],frame:[],cloth:[],lamp:[]},matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),euler=new THREE.Euler(),one=new THREE.Vector3(1,1,1);
  let triangles=0;
  const keep=(kind,geometry,colour)=>{
    if(geometry.hasAttribute('uv'))geometry.deleteAttribute('uv');
    const count=geometry.attributes.position.count,colours=new Float32Array(count*3);
    for(let index=0;index<count;index++){colours[index*3]=colour.r;colours[index*3+1]=colour.g;colours[index*3+2]=colour.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(colours,3));triangles+=geometry.index.count/3;lists[kind].push(geometry);
  };
  const put=(kind,geometry,colour,x,y,z,turn=[0,0,0])=>{
    matrix.compose(new THREE.Vector3(x,y,z),quaternion.setFromEuler(euler.set(turn[0],turn[1],turn[2],'YXZ')),one);geometry.applyMatrix4(matrix);keep(kind,geometry,colour);
  };
  const box=(kind,w,h,d,colour,x,y,z,turn)=>put(kind,new THREE.BoxGeometry(w,h,d),colour,x,y,z,turn);
  // A bar from one point to another.
  const direction=new THREE.Vector3(),forward=new THREE.Vector3(0,0,1);
  const strut=(kind,a,b,thick,colour)=>{
    direction.set(b[0]-a[0],b[1]-a[1],b[2]-a[2]);const length=direction.length();direction.normalize();
    const geometry=new THREE.BoxGeometry(thick,thick,length);
    matrix.compose(new THREE.Vector3((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2),quaternion.setFromUnitVectors(forward,direction),one);geometry.applyMatrix4(matrix);keep(kind,geometry,colour);
  };
  return {put,box,strut,lists,get triangles(){return triangles;}};
}

export function createTinTownShacks(){
  const plan=tinTownLayout(),group=new THREE.Group();group.name='Tin Town shacks';
  const out=assembly(),{put,box,strut}=out,random=mulberry(0x7157a9);
  const pick=list=>list[Math.floor(random()*list.length)];
  const shacks=[],feet=[],specials={};
  const landAt=(x,z)=>height(x,z);
  const foot=(x,z)=>{const y=landAt(x,z)-.05;feet.push({x,y,z});return y;};

  // One shack on its deck: four walls of corrugated sheet, a sloping roof that overhangs, a doorway, one or two shuttered
  // windows, a patch or two of other sheet, and sometimes a lamp by the door. `n` is the way the front faces (a unit
  // step along x or z); `sx` and `sz` are its size along x and z; (x, y, z) is the middle of its floor.
  const shack=(x,y,z,sx,sz,h,n,variant)=>{
    const sheet=PALETTE.sheet[variant%PALETTE.sheet.length],wall=(width,wx,wz,turn)=>put('sheet',stripOfSheet(width,h),sheet,wx,y,wz,[0,turn,0]);
    wall(sz,x+sx/2,z,Math.PI/2);wall(sz,x-sx/2,z,-Math.PI/2);wall(sx,x,z+sz/2,0);wall(sx,x,z-sz/2,Math.PI);
    // The roof lies flat as a strip with its ribs running down the slope, then leans 9 to 14 degrees one way or the other.
    const lean=(9+random()*5)*Math.PI/180*(random()<.5?1:-1),roof=stripOfSheet(sx+.8,sz+.8);
    roof.rotateX(-Math.PI/2);roof.translate(0,0,(sz+.8)/2);roof.rotateX(lean);
    put('sheet',roof,PALETTE.sheet[(variant+2)%PALETTE.sheet.length],x,y+h+.2,z);
    box('frame',sx+.5,.12,sz+.5,PALETTE.girder,x,y+h+.04,z);
    // The front: a doorway and windows laid out along the front wall (t runs along it).
    const front=n.x?sz:sx,turn=[0,Math.atan2(n.x,n.z),0],t={x:Math.abs(n.z),z:Math.abs(n.x)};
    const at=(offset,lift,push)=>[x+n.x*(sx/2+push)+t.x*offset,y+lift,z+n.z*(sz/2+push)+t.z*offset];
    const doorAt=(variant%3-1)*Math.max(0,Math.min(.9,front/2-1));
    let [dx,dy,dz]=at(doorAt,1.05,.03);box('frame',.95,2.1,.1,PALETTE.dark,dx,dy,dz,turn);
    [dx,dy,dz]=at(doorAt,2.16,.06);box('frame',1.2,.12,.14,PALETTE.girder,dx,dy,dz,turn);
    for(const side of [-.55,.55]){[dx,dy,dz]=at(doorAt+side,1.05,.06);box('frame',.1,2.1,.14,PALETTE.girder,dx,dy,dz,turn);}
    const windows=1+((variant>>1)%2);
    for(let window=0;window<windows;window++){
      const offset=doorAt>=0?-front/2+.75+window*front*.4:front/2-.75-window*front*.4;
      if(Math.abs(offset-doorAt)<1.2)continue;
      let [wx,wy,wz]=at(offset,1.55,.03);box('frame',.7,.55,.1,PALETTE.dark,wx,wy,wz,turn);
      [wx,wy,wz]=at(offset,1.95,.09);box('frame',.78,.26,.05,PALETTE.plank,wx,wy,wz,[0,turn[1],(variant+window)%2?.6:0]);
    }
    for(let patch=0;patch<1+variant%2;patch++){
      const offset=(patch?-1:1)*(front/2-.7)*(doorAt>0?-1:1),[px,py,pz]=at(offset,.7+patch*1.1+random()*.3,.045);
      box('sheet',.9+random()*.4,.7+random()*.4,.05,pick(PALETTE.patch),px,py,pz,turn);
    }
    // A patch on a side wall.
    box('sheet',.05,.8,.9+random()*.5,pick(PALETTE.patch),x+(variant%2?1:-1)*(sx/2+.045),y+1.3,z+(random()-.5)*sz*.5);
    if((variant+3)%5<2){
      const [lx,ly,lz]=at(doorAt+(doorAt>0?-1:1)*.95,1.95,.2);
      box('frame',.08,.08,.3,PALETTE.iron,lx,ly+.2,lz,turn);box('lamp',.2,.28,.2,PALETTE.iron,lx,ly,lz);
    }
  };

  // One slot: a stack of shacks on four scaffold legs, each leg standing on the ground at its own point.
  const buildSlot=(cluster,slot)=>{
    const {x,z,levels,size,cell,facing}=slot,h=size[2],n=cluster.turned?{x:facing,z:0}:{x:0,z:facing};
    const halfW=cell.w/2+.3,halfD=cell.d/2+.3,corners=[[-halfW,-halfD],[halfW,-halfD],[-halfW,halfD],[halfW,halfD]];
    const heights=corners.map(([cx,cz])=>landAt(x+cx,z+cz)),base=Math.max(...heights)+DECK_LIFT,top=base+(levels-1)*LEVEL+h+.4;
    corners.forEach(([cx,cz])=>{const low=foot(x+cx,z+cz);box('frame',.24,top-low,.24,PALETTE.girder,x+cx,(low+top)/2,z+cz);});
    const t={x:Math.abs(n.z),z:Math.abs(n.x)},along=cluster.turned?cell.d:cell.w;
    for(let level=0;level<levels;level++){
      const y=base+level*LEVEL;
      box('frame',cell.w+.8,.22,cell.d+.8,PALETTE.plank,x,y-.11,z);
      if(level>0){
        // A walkway on the front with a rail along its outer edge.
        box('frame',n.x?.9:cell.w+.8,.12,n.z?.9:cell.d+.8,PALETTE.plank,x+n.x*(cell.w/2+.85),y-.05,z+n.z*(cell.d/2+.85));
        const rx=x+n.x*(cell.w/2+1.25),rz=z+n.z*(cell.d/2+1.25),span=along+.8,posts=Math.max(1,Math.round(span/1.6));
        box('frame',n.x?.06:span,.07,n.z?.06:span,PALETTE.iron,rx,y+.95,rz);
        for(let post=0;post<=posts;post++){const offset=-span/2+post*span/posts;box('frame',.07,.95,.07,PALETTE.iron,rx+t.x*offset,y+.48,rz+t.z*offset);}
      }
      if(level<levels-1){
        // A ladder at one end of the front, two rails and rungs, up to the next deck; a brace across the back.
        const lx=x+t.x*(along/2+.55),lz=z+t.z*(along/2+.55);
        for(const side of [-.22,.22])box('frame',.06,LEVEL+.2,.06,PALETTE.iron,lx+n.x*side,y+LEVEL/2,lz+n.z*side);
        for(let rung=0;rung<6;rung++)box('frame',n.x?.5:.06,.05,n.z?.5:.06,PALETTE.iron,lx,y+.4+rung*.5,lz);
        const bx=x-n.x*halfW,bz=z-n.z*halfD;
        strut('frame',[bx-t.x*along/2,y,bz-t.z*along/2],[bx+t.x*along/2,y+LEVEL,bz+t.z*along/2],.1,PALETTE.girder);
      }
      const variant=cluster.index*7+slot.slot*3+level*5,sizeX=cluster.turned?size[1]:size[0],sizeZ=cluster.turned?size[0]:size[1];
      const sx=x+(random()-.5)*(cell.w-sizeX)*.5,sz=z+(random()-.5)*(cell.d-sizeZ)*.5;
      shack(sx,y,sz,sizeX,sizeZ,h,n,variant);
      shacks.push({cluster:cluster.index,slot:slot.slot,level,size:slot.sizeName,x:sx,z:sz,y});
    }
  };

  // The water tower: a tank on four girder legs, about 11 m tall, with braces, a ladder, bands and a lid.
  const tower=slot=>{
    const {x,z}=slot,legsAt=[[-1.6,-1.6],[1.6,-1.6],[-1.6,1.6],[1.6,1.6]],heights=legsAt.map(([lx,lz])=>landAt(x+lx,z+lz)),base=Math.max(...heights),tankBottom=base+7.6;
    legsAt.forEach(([lx,lz])=>{const low=foot(x+lx,z+lz);box('frame',.34,tankBottom+.2-low,.34,PALETTE.girder,x+lx,(low+tankBottom+.2)/2,z+lz);});
    for(const [level,next] of [[.4,3],[3.4,6.2]]){
      for(const [ax,az,bx,bz] of [[-1.6,-1.6,1.6,-1.6],[1.6,-1.6,1.6,1.6],[1.6,1.6,-1.6,1.6],[-1.6,1.6,-1.6,-1.6]]){
        strut('frame',[x+ax,base+level,z+az],[x+bx,base+next,z+bz],.1,PALETTE.iron);
        strut('frame',[x+ax,base+next,z+az],[x+bx,base+level,z+bz],.1,PALETTE.iron);
      }
    }
    put('frame',new THREE.CylinderGeometry(2.2,2.2,3.2,18),PALETTE.tank,x,tankBottom+1.8,z);
    put('frame',new THREE.CylinderGeometry(.1,2.35,.7,18),PALETTE.iron,x,tankBottom+3.75,z);
    for(const band of [.8,2.4])put('frame',new THREE.CylinderGeometry(2.26,2.26,.12,18),PALETTE.iron,x,tankBottom+.2+band,z);
    for(let rung=0;rung<14;rung++)box('frame',.5,.05,.06,PALETTE.iron,x,base+.6+rung*.55,z+2.0);
    for(const side of [-.25,.25])box('frame',.06,tankBottom-base+.6,.06,PALETTE.iron,x+side,base+(tankBottom-base+.6)/2,z+2.0);
    put('frame',new THREE.CylinderGeometry(.12,.12,tankBottom-base,8),PALETTE.iron,x-1.0,(base+tankBottom)/2,z+2.4);
    specials.tower={x,z,height:tankBottom+4.1-base,base};
  };

  // The radio pole: a thin mast with cross bars, four guy wires and a glowing lamp on top.
  const pole=slot=>{
    const {x,z}=slot,low=foot(x,z),tallest=13,base=low+.05;
    put('frame',new THREE.CylinderGeometry(.12,.2,tallest,8),PALETTE.girder,x,low+tallest/2,z);
    for(const [y,span] of [[6,2.2],[9,1.6],[11.8,1.0]]){box('frame',span,.1,.1,PALETTE.iron,x,base+y,z);box('frame',.1,.1,span,PALETTE.iron,x,base+y+.5,z);}
    for(const [gx,gz] of [[1,0],[-1,0],[0,1],[0,-1]])strut('frame',[x+gx*5,landAt(x+gx*5,z+gz*5),z+gz*5],[x,base+tallest-1.5,z],.04,PALETTE.iron);
    box('frame',.3,.36,.3,PALETTE.iron,x,base+tallest+.1,z);box('lamp',.26,.3,.26,PALETTE.iron,x,base+tallest+.45,z);
    specials.pole={x,z,height:tallest+.6,base};
  };

  // Washing lines between facing stacks, with small coloured cloths hung from them.
  const washing=cluster=>{
    for(const [a,b] of [[0,1],[1,2],[3,4],[4,5]]){
      if((a+cluster.index)%2)continue;
      const first=cluster.slots[a],second=cluster.slots[b];
      if(first.levels<1||second.levels<1)continue;
      const y=Math.max(landAt(first.x,first.z),landAt(second.x,second.z))+DECK_LIFT+2.4,r=first.cell,s=second.cell,turned=cluster.turned;
      const p0=[first.x+(turned?0:r.w/2+.55),first.z+(turned?r.d/2+.55:0)],p1=[second.x-(turned?0:s.w/2+.55),second.z-(turned?s.d/2+.55:0)];
      const dx=p1[0]-p0[0],dz=p1[1]-p0[1],length=Math.hypot(dx,dz);if(length<1)continue;
      const yaw=Math.atan2(dx,dz);
      box('cloth',.012,.012,length,PALETTE.iron,(p0[0]+p1[0])/2,y,(p0[1]+p1[1])/2,[0,yaw,0]);
      const cloths=Math.max(1,Math.floor(length/.9));
      for(let cloth=0;cloth<cloths;cloth++){
        const u=(cloth+.7)/(cloths+.4);
        box('cloth',.42,.6,.012,PALETTE.cloth[(cloth+cluster.index)%PALETTE.cloth.length],p0[0]+dx*u,y-.3,p0[1]+dz*u,[0,yaw+Math.PI/2,cloth%2?.12:-.1]);
      }
    }
  };

  for(const cluster of plan.clusters){
    for(const slot of cluster.slots){
      if(slot.kind==='shack'&&slot.levels>0)buildSlot(cluster,slot);
      else if(slot.kind==='T')tower(slot);
      else if(slot.kind==='P')pole(slot);
    }
    washing(cluster);
  }

  // The fence: 2 m sheets on posts along the outside of the ring, beginning where the gate's own fence ends and running
  // round, with a gap wherever a road comes in or the ground is not flat.
  const fence=[];
  {
    const step=2/FENCE_RADIUS*180/Math.PI;
    for(let angle=FENCE_FROM;angle>=FENCE_TO;angle-=step){
      const radians=angle*Math.PI/180,x=TIN_TOWN_CENTRE.x+Math.cos(radians)*FENCE_RADIUS,z=TIN_TOWN_CENTRE.z+Math.sin(radians)*FENCE_RADIUS;
      if(nearestTinTownRoad(x,z)<TIN_TOWN_CLEAR_ROAD+2.5)continue;
      if(Math.abs(landAt(x,z))>1.6||Math.abs(landAt(x,z)-landAt(x+2,z))>.8||Math.abs(landAt(x,z)-landAt(x,z+2))>.8)continue;
      if(plan.clusters.some(cluster=>rectDistance(cluster.rect,x,z)<4))continue;
      // The sheet runs along the ring and faces the town.
      const yaw=Math.atan2(-Math.cos(radians),-Math.sin(radians)),low=foot(x,z),high=2.4+(fence.length%4)*.18;
      put('sheet',stripOfSheet(2,high),PALETTE.sheet[fence.length%PALETTE.sheet.length],x,low,z,[0,yaw,0]);
      box('frame',.12,high+.3,.12,PALETTE.girder,x-Math.sin(radians),low+(high+.3)/2,z+Math.cos(radians));
      fence.push({x,z});
    }
  }

  // Merge each material's pieces, put the wear over everything that does not glow, and report.
  const materials={
    sheet:new THREE.MeshStandardMaterial({name:'shack sheet',vertexColors:true,roughness:.88,metalness:.1,side:THREE.DoubleSide,flatShading:true}),
    frame:new THREE.MeshStandardMaterial({name:'scaffold and planks',vertexColors:true,roughness:.9,metalness:.1}),
    cloth:new THREE.MeshStandardMaterial({name:'washing',vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}),
    lamp:new THREE.MeshStandardMaterial({name:'warm lamps',color:0x2a1a0a,roughness:.5,emissive:0xff9a38,emissiveIntensity:.8}),
  };
  const wear=createScrapWear({paint:1});
  wear.uniforms.uScrapInverse.value.makeTranslation(TIN_TOWN_CENTRE.x,landAt(TIN_TOWN_CENTRE.x,TIN_TOWN_CENTRE.z),TIN_TOWN_CENTRE.z).invert();
  for(const [kind,list] of Object.entries(out.lists)){
    if(!list.length)continue;
    if(kind!=='lamp')wear.apply(materials[kind]);
    const merged=mergeGeometries(list);for(const geometry of list)geometry.dispose();
    if(kind==='lamp')merged.deleteAttribute('color');
    const mesh=new THREE.Mesh(merged,materials[kind]);mesh.name=`Tin Town shacks, ${materials[kind].name}`;mesh.castShadow=kind!=='cloth';mesh.receiveShadow=true;group.add(mesh);
  }
  group.userData={shacks,feet,fence,clusters:plan.clusters.map(cluster=>({index:cluster.index,rect:cluster.rect,shacks:cluster.shacks})),tower:specials.tower,pole:specials.pole,triangles:out.triangles};
  return group;
}
