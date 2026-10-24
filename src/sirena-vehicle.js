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
  m.paint.metalness=.18;m.paint.roughness=.38;m.paint.clearcoat=.5;
  m.accent.name='White livery';
  m.accent.metalness=.05;m.accent.roughness=.42;
  m.lamp=new THREE.MeshStandardMaterial({name:'Headlamp lenses',color:0xe9d9b0,emissive:0xb8924a,emissiveIntensity:.35,roughness:.2,metalness:.3});
  m.chrome=new THREE.MeshStandardMaterial({name:'Dull chrome',color:0xc9ccc9,metalness:.88,roughness:.32});
  m.numeral=new THREE.MeshStandardMaterial({name:'Door numeral',color:0x14110f,roughness:.55,metalness:.05});
  m.perspex=new THREE.MeshPhysicalMaterial({name:'Glass lamp covers',color:0xe9f1ee,metalness:0,roughness:.05,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});
  m.glass.opacity=.34;
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
  [1.85,.77,.16,.61,.60,.56],
  [2.05,.64,.16,.51,.51,.48],
  [2.16,.52,.18,.42,.43,.38],
];

// The painted shell before the cabin tub is opened: the wreck and the loose
// bonnet and door are cut from this same surface (tools/art/sirena-props.mjs).
export function sirenaBodyGeometry() { return body(SIRENA_SECTIONS,AXLES,RADIUS); }

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

// A low closed coupe cabin: raked screen, shallow roof, tall rear glass.
function greenhouse(b,m) {
  const glass=(points)=>{
    const positions=points.flat(),indices=[];for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();b.add(g,m.glass);g.dispose();
    b.tube(m.chrome,[...points,points[0]],.012,Math.max(12,points.length*4));
  };
  // Windscreen: base at the end of the bonnet, top at the roof's leading edge.
  glass([[-.72,.69,.60],[.72,.69,.60],[.56,1.00,-.06],[-.56,1.00,-.06]]);
  // Rear window, raked down to the tail deck.
  glass([[.62,1.00,-.86],[-.62,1.00,-.86],[-.76,.78,-1.36],[.76,.78,-1.36]]);
  for(const side of[-1,1]) {
    glass([[side*.80,.70,.52],[side*.55,1.00,-.04],[side*.55,1.00,-.84],[side*.82,.74,-1.28]]);
    // A-pillar and C-pillar in body colour.
    b.tube(m.paint,[[side*.75,.70,.60],[side*.57,1.00,-.05]],.021,10);
    b.tube(m.paint,[[side*.56,1.00,-.86],[side*.80,.78,-1.38]],.030,10);
    const quarter=[[side*.82,.74,-1.28],[side*.56,1.0,-.86],[side*.60,.98,-.95],[side*.86,.74,-1.40]];
    panel(b,m.paint,side>0?quarter.reverse():quarter);
  }
  b.box(m.paint,[1.16,.034,.84],[0,1.006,-.46],[0,0,0],.016);
  b.box(m.paint,[1.00,.020,.72],[0,1.026,-.46],[0,0,0],.010);
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
    b.box(m.paint,[.09,.06,.05],[side*.91,.79,.44],[0,side*.4,0],.015);
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
    // Headlamps under flush perspex covers, faired into the front of each wing.
    const lens=(rx,rz,cx,cz)=>{const p=[];for(let i=0;i<32;i++){const a=i/32*Math.PI*2;p.push([cx+Math.cos(a)*rx,cz+Math.sin(a)*rz]);}return p;};
    fitSurfacePatch(surfaces,b,m.chrome,lens(.150,.235,side*.525,1.86),'top',1,.5,.004);
    fitSurfacePatch(surfaces,b,m.darkAlloy,lens(.133,.215,side*.525,1.86),'top',1,.5,.007);
    fitSurfacePatch(surfaces,b,m.lamp,lens(.085,.13,side*.525,1.88),'top',1,.5,.010);
    fitSurfacePatch(surfaces,b,m.perspex,lens(.138,.222,side*.525,1.86),'top',1,.5,.020);
    const disc=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;disc.push([ROUNDEL.y+Math.sin(a)*ROUNDEL.radius,ROUNDEL.z+Math.cos(a)*ROUNDEL.radius]);}
    fitSurfacePatch(surfaces,b,m.accent,disc,'side',side,.5,.005);
    fitSurfacePatch(surfaces,b,m.numeral,sevenOutline(),'side',side,.5,.008);
    // Door shut lines.
    fitSurfacePatch(surfaces,b,m.carbon,[[.17,-.80],[.66,-.80],[.66,-.795],[.17,-.795]],'side',side,.5,.004);
    fitSurfacePatch(surfaces,b,m.carbon,[[.17,.24],[.66,.24],[.66,.245],[.17,.245]],'side',side,.5,.004);
  }
  b.finish(vehicle.userData);
}

// The numeral 7 as one polygon in (y,z): a top bar and a diagonal stroke.
// +z is forward, so the 7 is mirrored when viewed from the car's right side by
// the same fit; the left-hand door (x>0) is the reference reading direction.
export function sevenOutline(scale=1,y=ROUNDEL.y,z=ROUNDEL.z) {
  const h=.135*scale,w=.085*scale,t=.026*scale;
  // Local coordinates u (forward) and v (up), reading from the car's left.
  const pts=[[-w,h],[w,h],[w,h-t],[-t*.4+.01*scale,-h],[-t*1.6,-h],[w-t*1.45,h-t],[-w,h-t]];
  return pts.map(([u,v])=>[y+v,z-u]);
}
