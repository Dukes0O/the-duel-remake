import * as THREE from 'three';
import {prepareVehicleDamage} from './vehicles.js';
import {originalVehicleParts} from './unlock-vehicles.js';

const {materials} = originalVehicleParts;
export const VASCA_VEHICLE_DIMENSIONS = Object.freeze({falcone_vasca:{width:1.8,length:3.6,height:.95,wheelRadius:.18}});
const cylinderBetween = (a,b,r,material,segments=12) => {
  const delta = new THREE.Vector3().subVectors(b,a), mesh = new THREE.Mesh(new THREE.CylinderGeometry(r,r,delta.length(),segments),material);
  mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
  mesh.castShadow = mesh.receiveShadow = true; return mesh;
};
function duck() {
  const group=new THREE.Group(); group.name='duck';
  const yellow=new THREE.MeshStandardMaterial({color:0xffd51f,roughness:.32}), orange=new THREE.MeshStandardMaterial({color:0xe77715,roughness:.38}), black=new THREE.MeshStandardMaterial({color:0x171613,roughness:.3});
  const add=(geometry,material,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;group.add(m);return m;};
  add(new THREE.SphereGeometry(.25,16,12),yellow,0,0,0,1,.72,1.25);
  add(new THREE.SphereGeometry(.16,14,10),yellow,0,.18,.19,1,.92,1);
  add(new THREE.ConeGeometry(.095,.2,10),orange,0,.13,.39,1,1,1); group.children.at(-1).rotation.x=Math.PI/2;
  add(new THREE.SphereGeometry(.027,8,6),black,-.105,.22,.28); add(new THREE.SphereGeometry(.027,8,6),black,.105,.22,.28);
  return group;
}
export function createVascaVehicle({tethered=false,color=0xf1ede2,accent=0x9c1217}={}) {
  const vehicle=new THREE.Group(); vehicle.name='falcone_vasca';
  const m=materials(color,accent); m.paint.color.setHex(color); m.paint.metalness=.58; m.paint.roughness=.31; m.paint.clearcoat=.75;
  const enamel=new THREE.MeshPhysicalMaterial({color,metalness:.58,roughness:.31,clearcoat:.75}), iron=new THREE.MeshStandardMaterial({color:0x302d29,metalness:.72,roughness:.58}), chrome=new THREE.MeshStandardMaterial({color:0xc2b59a,metalness:.8,roughness:.28}), red=new THREE.MeshStandardMaterial({color:accent,metalness:.12,roughness:.38}), foam=new THREE.MeshStandardMaterial({color:0xf7f4eb,roughness:.92}), rust=new THREE.MeshStandardMaterial({color:0x70412c,metalness:.35,roughness:.82});
  const mesh=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=o.receiveShadow=true;vehicle.add(o);return o;};
  // Open roll-top bath: heavy floor and four flared enamel walls.
  mesh(new THREE.BoxGeometry(1.55,.17,3.08),enamel,0,.32,-.05);
  mesh(new THREE.BoxGeometry(1.62,.72,.18),enamel,0,.62,1.48);
  mesh(new THREE.BoxGeometry(1.62,.72,.18),enamel,0,.62,-1.58);
  mesh(new THREE.BoxGeometry(.18,.72,2.9),enamel,.78,.62,-.05);
  mesh(new THREE.BoxGeometry(.18,.72,2.9),enamel,-.78,.62,-.05);
  mesh(new THREE.BoxGeometry(1.78,.1,3.55),chrome,0,.98,-.04);
  mesh(new THREE.BoxGeometry(.16,.035,2.9),red,0,1.037,-.05);
  for (const x of [-.91,.91]) {
    const roundel=mesh(new THREE.CylinderGeometry(.27,.27,.018,32),new THREE.MeshStandardMaterial({color:0xfaf8f0,roughness:.5}),x,.69,-.35);
    roundel.rotation.z=Math.PI/2;
    const textCanvas=typeof document!=='undefined'?document.createElement('canvas'):null;
    if(textCanvas){textCanvas.width=256;textCanvas.height=128;const ctx=textCanvas.getContext('2d');ctx.fillStyle='#292521';ctx.font='bold 68px Georgia';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('7½',128,64);const decal=new THREE.Mesh(new THREE.PlaneGeometry(.39,.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(textCanvas),transparent:true,side:THREE.DoubleSide}));decal.position.set(x*1.012,.69,-.35);decal.rotation.y=x>0?Math.PI/2:-Math.PI/2;vehicle.add(decal);}
  }
  const foamGeo=new THREE.SphereGeometry(.24,12,8);
  for(let i=0;i<20;i++){const a=i*2.399,b=.38+((i*7)%11)*.034;mesh(foamGeo,foam,Math.cos(a)*b,.91+((i*3)%5)*.035,Math.sin(a)*b*1.3,.9,.42,1.1);}
  // Claw feet, exposed wire wheels, axles and small leaf brackets.
  const wheelPivots=[],wheels=[];
  for(const z of [1.12,-1.12])for(const x of [-.78,.78]){
    const pivot=new THREE.Group();pivot.position.set(x,.25,z);vehicle.add(pivot);wheelPivots.push(pivot);
    const tire=new THREE.Mesh(new THREE.TorusGeometry(.18,.045,8,16),iron);tire.rotation.y=Math.PI/2;pivot.add(tire);wheels.push(tire);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.11,12),chrome);hub.rotation.z=Math.PI/2;pivot.add(hub);
    for(let spoke=0;spoke<8;spoke++){const angle=spoke*Math.PI/4;const wire=new THREE.Mesh(new THREE.BoxGeometry(.008,.3,.008),chrome);wire.rotation.x=angle;wire.position.y=.25;pivot.add(wire);}
    const foot=new THREE.Mesh(new THREE.BoxGeometry(.16,.18,.4),enamel);foot.position.set(x*1.12,.34,z*.9);foot.rotation.z=x>0?-.2:.2;vehicle.add(foot);
  }
  // Rear-facing brass plumbing, shower pipe, overflow exhausts and wheel.
  for(const x of [-.45,.45]){
    vehicle.add(cylinderBetween(new THREE.Vector3(x,.94,-1.28),new THREE.Vector3(x,.99,-1.47),.038,chrome));
    vehicle.add(cylinderBetween(new THREE.Vector3(x,.99,-1.47),new THREE.Vector3(x,.9,-1.55),.025,chrome));
  }
  vehicle.add(cylinderBetween(new THREE.Vector3(-.33,.93,-1.5),new THREE.Vector3(-.33,2.2,-1.5),.025,chrome));
  vehicle.add(cylinderBetween(new THREE.Vector3(-.33,2.2,-1.5),new THREE.Vector3(-.33,2.2,-1.25),.025,chrome));
  vehicle.add(cylinderBetween(new THREE.Vector3(.5,.4,-1.6),new THREE.Vector3(.5,.4,-1.9),.055,iron));
  vehicle.add(cylinderBetween(new THREE.Vector3(-.5,.4,-1.6),new THREE.Vector3(-.5,.4,-1.9),.055,iron));
  mesh(new THREE.TorusGeometry(.12,.014,6,20),rust,.48,.39,-1.52);
  // Bare steering wheel; bath-mounted duck or suspended plug duck for the dive.
  const steering=new THREE.Mesh(new THREE.TorusGeometry(.18,.018,8,20),iron);steering.position.set(0,1.12,.5);steering.rotation.x=Math.PI/2;vehicle.add(steering);
  const bird=duck();
  if(tethered){bird.position.set(0,3,0);vehicle.add(cylinderBetween(new THREE.Vector3(0,.4,1.35),new THREE.Vector3(0,2.95,0),.009,chrome,6));}
  else bird.position.set(0,1.08,1.3);
  vehicle.add(bird);
  Object.assign(vehicle.userData,{paint:m.paint,originalColor:m.paint.color.clone(),wheels,wheelPivots,brakeLights:[],boostFlames:[],damageMeshes:[],size:{...VASCA_VEHICLE_DIMENSIONS.falcone_vasca},designFeatures:['roll-top-bath','wire-wheels','number-7-half','shower','rubber-duck'],damageSpace:{scale:[.8,.65,.8],offset:[0,0,0]}});
  prepareVehicleDamage(vehicle);vehicle.updateMatrixWorld(true);return vehicle;
}
