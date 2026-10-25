import * as THREE from 'three';
import {prepareVehicleDamage} from './vehicles.js';
import {originalVehicleParts as craft} from './unlock-vehicles.js';

// The Falcone Sirena (SIRENA-ART, docs/THE_DEEP.md section 6.1): the 1966
// sports-racing coupe Falcone built for the Coast Cup. Low, long-nosed, with
// faired and covered headlights, a short cut-off tail, wire wheels and the
// number 7 in a white roundel on each door. An original homage in the spirit of
// the mid-1960s endurance cars, built with the classic cars' own helpers; no
// maker badge, no downloaded model. +Z is forward.
export const SIRENA_VEHICLE_DIMENSIONS=Object.freeze({
  falcone_sirena:{width:1.96,length:4.45,height:1.06,wheelRadius:.345},
});
const {materials,batch,body,panel,cylinder,cockpit,exhaust,rearPlate,fitSurfacePatch}=craft;
export const SIRENA_AXLES=[1.30,-1.18],SIRENA_WHEEL_RADIUS=.345,SIRENA_TRACK=.80;
const AXLES=SIRENA_AXLES,RADIUS=SIRENA_WHEEL_RADIUS,TRACK=SIRENA_TRACK;
// Door roundel: centre (y,z) on the body side; the 7 is a polygon in the same
// plane (y up, z forward) so it can be fitted to the curved door.
export const SIRENA_ROUNDEL=Object.freeze({y:.40,z:-.34,radius:.175});
const ROUNDEL=SIRENA_ROUNDEL;

export function createSirenaVehicle({key='falcone_sirena',color=0x9c1217,accent=0xf1ede2}={}) {
  if(!Object.hasOwn(SIRENA_VEHICLE_DIMENSIONS,key))return null;
  const vehicle=new THREE.Group();vehicle.name=key;
  const m=sirenaMaterials(color,accent);
  const d=vehicle.userData;
  Object.assign(d,{paint:m.paint,originalColor:m.paint.color.clone(),wheels:[],wheelPivots:[],brakeLights:[],boostFlames:[],damageMeshes:[],size:{...SIRENA_VEHICLE_DIMENSIONS[key]},sirenaKey:key,
    designFeatures:['long-nose','covered-headlights','door-roundel-7','wire-wheels','kamm-tail','nose-stripe'],
    damageSpace:{scale:[1,.72,1],offset:[0,0,0],frontGlassZ:.30,rearGlassZ:-.98}});
  const b=batch(vehicle);
  sirenaBody(vehicle,b,m);
  b.finish(d);
  fittedMarkings(vehicle,m);
  prepareVehicleDamage(vehicle);vehicle.updateMatrixWorld(true);
  return vehicle;
}

// Craft materials plus the Sirena's own: a warm period red, cream livery and
// the dull chrome of 1960s trim.
export function sirenaMaterials(color,accent) {
  const m=materials(color,accent);
  m.paint.metalness=.22;m.paint.roughness=.27;m.paint.clearcoat=.85;m.paint.clearcoatRoughness=.14;
  m.accent.name='White livery';
  m.accent.metalness=.05;m.accent.roughness=.42;
  m.lamp=new THREE.MeshStandardMaterial({name:'Headlamp lenses',color:0xe9d9b0,emissive:0xb8924a,emissiveIntensity:.35,roughness:.2,metalness:.3});
  m.chrome=new THREE.MeshStandardMaterial({name:'Dull chrome',color:0xc9ccc9,metalness:.88,roughness:.32});
  m.numeral=new THREE.MeshStandardMaterial({name:'Door numeral',color:0x14110f,roughness:.55,metalness:.05});
  m.perspex=new THREE.MeshPhysicalMaterial({name:'Glass lamp covers',color:0xe9f1ee,metalness:0,roughness:.05,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  m.glass.opacity=.34;
  m.gap=new THREE.MeshStandardMaterial({name:'Panel gaps',color:0x0c0a09,roughness:.9});
  m.chip=new THREE.MeshStandardMaterial({name:'Stone chips',color:0x4b4640,roughness:.8,metalness:.3});
  m.sheen=new THREE.MeshBasicMaterial({name:'Glass sheen',color:0xffffff,transparent:true,opacity:.5,depthWrite:false});
  return m;
}

// Section rows: [z, half width, floor, shoulder, crown height, crown half width].
export const SIRENA_SECTIONS=[
  [-2.15,.70,.21,.60,.66,.52],
  [-1.95,.84,.19,.68,.73,.62],
  [-1.45,.94,.17,.76,.80,.66],
  [-1.00,.94,.17,.76,.79,.62],
  [-.30,.90,.16,.64,.66,.58],
  [.45,.90,.16,.66,.68,.60],
  [1.00,.93,.17,.76,.77,.64],
  [1.55,.86,.17,.70,.68,.62],
  [1.78,.80,.16,.64,.62,.58],
  [1.97,.71,.16,.56,.55,.52],
  [2.10,.60,.17,.47,.48,.43],
  [2.18,.48,.19,.40,.41,.34],
];

// The painted shell before the cabin tub is opened: the wreck and the loose
// bonnet and door are cut from this same surface (tools/art/sirena-props.mjs).
export function sirenaBodyGeometry() { return body(SIRENA_SECTIONS,AXLES,.30,.27); }

function sirenaBody(vehicle,b,m) {
  const geometry=sirenaBodyGeometry(),positions=geometry.attributes.position,index=geometry.index,kept=[];
  // Open the tub under the greenhouse so the seated driver is not buried.
  for(let i=0;i<index.count;i+=3) {
    const ids=[index.getX(i),index.getX(i+1),index.getX(i+2)],x=ids.reduce((s,k)=>s+positions.getX(k),0)/3,y=ids.reduce((s,k)=>s+positions.getY(k),0)/3,z=ids.reduce((s,k)=>s+positions.getZ(k),0)/3;
    if(Math.abs(x)<.60&&y>.45&&z>-.98&&z<.50)continue;
    kept.push(...ids);
  }
  geometry.setIndex(kept);b.add(geometry,m.paint);geometry.dispose();
  greenhouse(b,m);
  frontEnd(b,m);
  tail(b,m);
  sides(b,m);
  cockpit(vehicle,b,m,[.33,-.11,-.30],.80);
  wireWheels(vehicle,m);
  exhaust(vehicle,b,m,[[-.30,.27,-2.10],[.30,.27,-2.10]],.052);
  rearPlate(b,m,.40,-2.16,.30,.10);
}

// The closed coupe cabin, as pieces in car-local metres (material names are the
// builder's own; the wreck reuses the same shapes without the glass): a bowed,
// wrapped-round windscreen with a slim chrome frame, a gently crowned roof, a
// raked rear window and slim body-colour pillars.
function grid(rows,up=false) {
  const positions=[],indices=[],width=rows[0].length;
  for(const row of rows)for(const p of row)positions.push(...p);
  for(let r=0;r<rows.length-1;r++)for(let c=0;c<width-1;c++){const a=r*width+c,b=a+1,d=a+width,e=d+1;if(up)indices.push(a,b,d,b,e,d);else indices.push(a,d,b,b,d,e);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
const lerp=(a,b,t)=>a+(b-a)*t;
function frame(points,radius=.008) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal'),Math.max(10,points.length*4),radius,6);
}
export function sirenaGreenhousePieces() {
  const pieces=[],add=(geometry,material)=>pieces.push({geometry,material});
  const COLS=13;
  const screen=(v,u)=>{const hw=lerp(.78,.56,v),x=u*hw;return [x,lerp(.69,1.0,v)+.012*Math.sin(v*Math.PI),lerp(.60,-.06,v)-.12*u*u*(1-.35*v)+.03*Math.sin(v*Math.PI)];};
  const us=Array.from({length:COLS},(_,i)=>i/(COLS-1)*2-1);
  const screenRows=[0,.33,.66,1].map(v=>us.map(u=>screen(v,u)));
  add(grid(screenRows),'glass');
  add(frame(us.map(u=>screen(0,u))),'chrome');add(frame(us.map(u=>screen(1,u))),'chrome');
  // Roof: a crowned panel from the screen header to the rear window.
  const roofRows=[];
  for(let k=0;k<=8;k++){const t=k/8,z=lerp(-.06,-.86,t),hw=lerp(.56,.62,t);roofRows.push(Array.from({length:11},(_,i)=>{const x=(i/10*2-1)*hw;return [x,1.0+.042*(1-(x/hw)**2)-.0012*Math.sin(t*Math.PI),z];}));}
  add(grid(roofRows,true),'paint');
  // Rear window, raked down to the tail deck and bowed a little.
  const rear=(v,u)=>[u*lerp(.62,.76,v),lerp(1.0,.78,v),lerp(-.86,-1.36,v)-.05*(1-u*u)*Math.sin(v*Math.PI)];
  add(grid([0,.5,1].map(v=>us.map(u=>rear(v,u)))),'glass');
  add(frame(us.map(u=>rear(1,u))),'chrome');add(frame(us.map(u=>rear(0,u))),'chrome');
  for(const side of[-1,1]) {
    // Side glass: front edge follows the screen's wrapped edge, top follows the roof rail.
    const front0=screen(0,side),front1=screen(1,side);
    const side0=[front0[0],front0[1],front0[2]],side1=[front1[0],front1[1],front1[2]],rear1=[side*.58,1.0,-.86],rear0=[side*.82,.74,-1.28];
    const sideGrid=grid([0,1].map(v=>[0,.25,.5,.75,1].map(t=>{const top=[lerp(side1[0],rear1[0],t),lerp(side1[1],rear1[1],t),lerp(side1[2],rear1[2],t)],bottom=[lerp(side0[0],rear0[0],t),lerp(side0[1],rear0[1],t),lerp(side0[2],rear0[2],t)];return [lerp(bottom[0],top[0],v),lerp(bottom[1],top[1],v),lerp(bottom[2],top[2],v)];})));
    add(sideGrid,'glass');
    add(frame([side0,side1,rear1,rear0,side0]),'chrome');
    // Slim body-colour pillars and the roof rail.
    add(frame([side0,[ (side0[0]+side1[0])/2+side*.01,(side0[1]+side1[1])/2,(side0[2]+side1[2])/2],side1],.016),'paint');
    add(frame([side1,[side*.60,1.003,-.46],rear1],.016),'paint');
    add(frame([rear1,[side*.70,.90,-1.10],[side*.84,.76,-1.32]],.030),'paint');
    const quarter=[[side*.82,.74,-1.28],[side*.58,1.0,-.86],[side*.62,.98,-.95],[side*.86,.74,-1.40]];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute((side>0?quarter.slice().reverse():quarter).flat(),3));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();add(g,'paint');
  }
  return pieces;
}
function greenhouse(b,m) {
  for(const{geometry,material}of sirenaGreenhousePieces()){b.add(geometry,m[material]);geometry.dispose();}
}

// Long nose, nose intake and covered headlights set into the front wings.
function frontEnd(b,m) {
  // Oval radiator mouth.
  const mouth=new THREE.TorusGeometry(1,.075,8,32);b.add(mouth,m.chrome,[0,.28,2.17],[0,0,0],[.20,.075,1]);mouth.dispose();
  const grille=new THREE.CircleGeometry(1,32);b.add(grille,m.exhaust,[0,.28,2.165],[0,0,0],[.205,.07,1]);grille.dispose();
  for(const side of[-1,1]) {
    // Two bonnet pins and a long engine bulge give the nose its working look.
    for(const dz of[1.62,1.80])cylinder(b,m.chrome,.012,.02,[side*.17,.652-(dz-1.62)*.25,dz],[0,0,0],10);
  }
  // Bonnet louvre vents and a low bumper blade.
  const bulge=new THREE.SphereGeometry(1,24,10,0,Math.PI*2,0,Math.PI/2);b.add(bulge,m.paint,[0,.68,1.02],[0,0,0],[.21,.06,.62]);bulge.dispose();
  for(let i=0;i<5;i++)b.box(m.carbon,[.20,.006,.024],[0,.738-i*.004,.90+i*.07],[-.03,0,0],.003);
  b.box(m.chrome,[.46,.018,.03],[-.0,.205,2.15],[0,0,0],.008);
}

// Short Kamm tail: sheared-off rear with a flat panel, lamps and twin pipes.
function tail(b,m) {
  for(const side of[-1,1]) {
    b.box(m.brake,[.15,.07,.02],[side*.52,.58,-2.165],[0,0,0],.012);
    b.box(m.chrome,[.19,.095,.012],[side*.52,.58,-2.155],[0,0,0],.008);
  }
  b.box(m.chrome,[.90,.022,.03],[0,.205,-2.16],[0,0,0],.008);
  // Fuel filler cap on the left shoulder.
  cylinder(b,m.chrome,.04,.015,[.0,.78,-1.60],[0,0,0],20);
}

// Side details: rocker, door shut lines, door handles, mirrors, side pipes.
function sides(b,m) {
  for(const side of[-1,1]) {
    b.box(m.chrome,[.04,.025,.11],[side*.915,.54,-.80],[0,0,0],.008);
    // Racing mirrors on short stalks.
    b.tube(m.chrome,[[side*.75,.74,.48],[side*.88,.78,.44]],.008,3);
    b.box(m.chrome,[.09,.055,.045],[side*.91,.79,.44],[0,side*.4,0],.015);
    // Side-exit exhaust ahead of the rear wheel.
    cylinder(b,m.chrome,.034,.62,[side*.948,.235,-.48],[Math.PI/2,0,0],16);
    cylinder(b,m.exhaust,.022,.02,[side*.948,.235,-.17],[Math.PI/2,0,0],12);
  }
}

// Wire wheel pieces in wheel-local metres (x is the axle, outward is +x for
// side 1): each piece names the material it takes. The same list builds the
// car's wheels and the crusted loose wheel.
export function wireWheelPieces(side=1,{low=false}={}) {
  const width=.25,tube=RADIUS*.27,rimRadius=RADIUS-tube*2+.012,pieces=[];
  const piece=(geometry,material,position=[0,0,0],rotation=[0,0,0])=>pieces.push({geometry,material,position,rotation});
  piece(new THREE.TorusGeometry(RADIUS-tube,tube,low?8:14,low?28:48).rotateY(Math.PI/2).scale(width/(tube*2),1,1),'rubber');
  piece(new THREE.CylinderGeometry(rimRadius,rimRadius*.97,width*.62,low?20:36,1,true).rotateZ(Math.PI/2),'chrome');
  piece(new THREE.TorusGeometry(rimRadius,.011,low?5:8,low?20:36).rotateY(Math.PI/2),'chrome',[side*width*.30,0,0]);
  piece(new THREE.TorusGeometry(rimRadius,.011,low?5:8,low?20:36).rotateY(Math.PI/2),'chrome',[-side*width*.30,0,0]);
  const hubX=side*.05;
  piece(new THREE.CylinderGeometry(.052,.052,.07,20),'chrome',[hubX,0,0],[0,0,Math.PI/2]);
  // Dark drum behind the spokes, and the spinner's three ears.
  piece(new THREE.CylinderGeometry(rimRadius*.96,rimRadius*.96,.012,32),'darkAlloy',[0,0,0],[0,0,Math.PI/2]);
  for(let i=0;i<3;i++)piece(new THREE.BoxGeometry(.022,.115,.024),'chrome',[side*.092,0,0],[i*Math.PI*2/3,0,0]);
  // Crossed spokes: each leaves the hub flange at one angle and meets the rim
  // further round, alternating flange sides.
  const count=low?24:48;
  for(let i=0;i<count;i++) {
    const a=i*Math.PI*2/count,lean=(i%2?1:-1),ra=a+lean*.42,flange=((i%4<2)?1:-1)*.035;
    const hub=new THREE.Vector3(hubX+flange,Math.cos(a)*.062,Math.sin(a)*.062);
    const rim=new THREE.Vector3(((i%2)?.05:-.05)*.5,Math.cos(ra)*(rimRadius-.012),Math.sin(ra)*(rimRadius-.012));
    const direction=rim.clone().sub(hub),length=direction.length();
    const euler=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,0,1),direction.normalize()));
    piece(new THREE.BoxGeometry(.0075,.0075,length),'chrome',hub.clone().add(rim).multiplyScalar(.5).toArray(),[euler.x,euler.y,euler.z]);
  }
  return pieces;
}

function wireWheels(vehicle,m) {
  for(const[axleIndex,z]of AXLES.entries())for(const side of[1,-1]) {
    const pivot=new THREE.Group(),spin=new THREE.Group(),b=batch(spin);
    pivot.name=`${axleIndex?'Rear':'Front'} wheel ${side>0?'left':'right'}`;
    pivot.position.set(side*TRACK,RADIUS,z);pivot.userData={front:axleIndex===0,restPosition:pivot.position.clone(),radius:RADIUS};
    for(const{geometry,material,position,rotation}of wireWheelPieces(side)){b.add(geometry,m[material],position,rotation);geometry.dispose();}
    b.finish();
    pivot.add(spin);vehicle.add(pivot);vehicle.userData.wheels.push(spin);vehicle.userData.wheelPivots.push(pivot);
  }
}

// Painted markings fitted to the real body triangles: the white nose stripe and
// the numbered roundel on each door.
function fittedMarkings(vehicle,m) {
  vehicle.updateMatrixWorld(true);
  const surfaces=vehicle.userData.damageMeshes.filter(v=>v.mesh.material===m.paint).map(v=>v.mesh),b=batch(vehicle);
  fitSurfacePatch(surfaces,b,m.accent,[[-.13,.62],[.13,.62],[.13,2.2],[-.13,2.2]],'top',1,.5,.004);
  for(const side of[-1,1]) {
    // Headlamps: a chrome ring and a dark bowl fitted to the wing, a warm lamp
    // inside and a domed glass cover on top, with a glint across it.
    const lens=(rx,rz,cx,cz)=>{const p=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;p.push([cx+Math.cos(a)*rx,cz+Math.sin(a)*rz]);}return p;};
    fitSurfacePatch(surfaces,b,m.chrome,lens(.150,.235,side*.525,1.86),'top',1,.5,.004);
    fitSurfacePatch(surfaces,b,m.darkAlloy,lens(.133,.215,side*.525,1.86),'top',1,.5,.007);
    fitSurfacePatch(surfaces,b,m.lamp,lens(.085,.13,side*.525,1.88),'top',1,.5,.010);
    const hit=new THREE.Raycaster(new THREE.Vector3(side*.525,3,1.86),new THREE.Vector3(0,-1,0)).intersectObjects(surfaces,false)[0];
    if(hit) {
      const normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld),tilt=new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),normal));
      const dome=new THREE.SphereGeometry(1,28,10,0,Math.PI*2,0,Math.PI/2),at=hit.point.clone().addScaledVector(normal,.006);
      b.add(dome,m.perspex,at.toArray(),[tilt.x,tilt.y,tilt.z],[.138,.034,.218]);
      b.add(dome,m.sheen,at.clone().addScaledVector(normal,.026).add(new THREE.Vector3(side*-.045,0,.07)).toArray(),[tilt.x,tilt.y,tilt.z],[.034,.006,.075]);
      dome.dispose();
    }
    const disc=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;disc.push([ROUNDEL.y+Math.sin(a)*ROUNDEL.radius,ROUNDEL.z+Math.cos(a)*ROUNDEL.radius]);}
    fitSurfacePatch(surfaces,b,m.accent,disc,'side',side,.5,.005);
    fitSurfacePatch(surfaces,b,m.numeral,sevenOutline(),'side',side,.5,.008);
    // Door shut lines.
    fitSurfacePatch(surfaces,b,m.gap,[[.17,-.80],[.66,-.80],[.66,-.793],[.17,-.793]],'side',side,.5,.004);
    fitSurfacePatch(surfaces,b,m.gap,[[.17,.24],[.66,.24],[.66,.247],[.17,.247]],'side',side,.5,.004);
  }
  // Wear: darker panel gaps round the bonnet and tail lid, and stone chips on the nose.
  const gap=(x0,z0,x1,z1,t=.005)=>fitSurfacePatch(surfaces,b,m.gap,[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z],i)=>[x+(i===1||i===2?t:0),z+(i>1?t:0)]),'top',1,.5,.003);
  gap(-.50,.64,.50,.64);gap(-.50,2.02,.50,2.02);gap(-.50,.64,-.50,2.02);gap(.50,.64,.50,2.02);
  gap(-.50,-2.00,.50,-2.00);gap(-.50,-1.46,.50,-1.46);gap(-.50,-2.00,-.50,-1.46);gap(.50,-2.00,.50,-1.46);
  const chipRandom=seeded(1966),chipPoly=(cx,cy,r)=>Array.from({length:6},(_,i)=>{const a=i/6*Math.PI*2+chipRandom(),k=r*(.6+chipRandom()*.6);return [cx+Math.cos(a)*k,cy+Math.sin(a)*k];});
  for(let i=0;i<70;i++) {
    const r=.003+chipRandom()*.008;
    if(i%2)fitSurfacePatch(surfaces,b,m.chip,chipPoly((chipRandom()*2-1)*.55,1.62+chipRandom()*.52,r),'top',1,.5,.005);
    else fitSurfacePatch(surfaces,b,m.chip,chipPoly((chipRandom()*2-1)*.50,.22+chipRandom()*.30,r),'front',1,.5,.005);
  }
  b.finish(vehicle.userData);
}
function seeded(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

// The numeral 7 as one polygon in (y,z): a top bar and a diagonal stroke.
// +z is forward, so the 7 is mirrored when viewed from the car's right side by
// the same fit; the left-hand door (x>0) is the reference reading direction.
export function sevenOutline(scale=1,y=ROUNDEL.y,z=ROUNDEL.z) {
  const h=.135*scale,w=.085*scale,t=.026*scale;
  // Local coordinates u (forward) and v (up), reading from the car's left.
  const pts=[[-w,h],[w,h],[w,h-t],[-t*.4+.01*scale,-h],[-t*1.6,-h],[w-t*1.45,h-t],[-w,h-t]];
  return pts.map(([u,v])=>[y+v,z-u]);
}
