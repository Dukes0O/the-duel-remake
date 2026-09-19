import assert from 'node:assert/strict';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {buildCityParking,addCityParking,PARKED_CAR_SIZE} from '../src/city-parking.js';
import {sweepObstacle} from '../src/collision.js';
import {disposeTree} from '../src/world.js';

let checks=0,carsChecked=0,vertices=0,routeSweeps=0,minWheel=Infinity,maxWheel=-Infinity;
const check=(value,label)=>{assert.ok(value,label);checks++;};
const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);
const wheelGround=(course,p)=>{const n=course.nearest(p.x,p.z);return course.groundAt(n.s,n.lateral).y;};
for(const id of['harbor-highlands','midnight-chase','neon-drift-trial'])for(const seed of[1989,42,17]){
  const course=new Course(COURSE.find(def=>def.id===id),seed),cars=course.features.parkedCars;
  check(cars.length%2===0&&(id==='harbor-highlands'?cars.length>=4&&cars.length<=14:cars.length>=16&&cars.length<=28),'city population is bounded and scaled for the mixed harbor section');
  check(new Set(cars.map(car=>car.id)).size===cars.length&&new Set(cars.map(car=>car.color)).size>=3,'parked vehicles have unique collision IDs and varied muted paint');
  const before=JSON.stringify(course.features),rng=course.rng;course.rng=new Proxy({},{get(){throw new Error('Parking must not consume the course RNG');}});
  assert.deepEqual(buildCityParking(course),cars,'separate placement runs reproduce the same saved cars');checks++;course.rng=rng;
  check(JSON.stringify(course.features)===before,'parking placement is pure and does not mutate any existing feature');
  const world=new THREE.Group(),group=addCityParking(world,course);check(group?.userData.parkedCars===cars.length&&group.userData.parkingBays===cars.length/2,'rendered passenger count matches exactly the shared collision list');
  group.updateMatrixWorld(true);const bays=group.children.filter(mesh=>mesh.name==='Roadside parking bay'),bodies=group.children.filter(mesh=>mesh.name==='Parked sedan paint');
  check(group.children.every(child=>!child.isLight),'parked cars introduce no extra light sources');
  check(new Set(bodies.map(mesh=>mesh.geometry)).size===1&&new Set(bodies.map(mesh=>mesh.material)).size===1,'all spatial cells share one original sedan shell and paint material');
  check(bodies.reduce((sum,mesh)=>sum+mesh.count,0)===cars.length,'each parked body is rendered exactly once');
  if(carsChecked===0){
    const glass=group.children.find(mesh=>mesh.name==='Parked sedan glass').geometry,paint=bodies[0].geometry;
    const surface=new THREE.Mesh(paint,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),p=glass.attributes.position,n=glass.attributes.normal;
    surface.updateMatrixWorld(true);const probe=new THREE.Raycaster(),outward=new THREE.Vector3(),origin=new THREE.Vector3();
    check(p.count===40&&glass.index.count===60,'ten fitted glass panes replace six protruding glass boxes with fewer vertices');
    for(let i=0;i<p.count;i++){
      point.fromBufferAttribute(p,i);outward.fromBufferAttribute(n,i).normalize();origin.copy(point).addScaledVector(outward,.05);probe.set(origin,outward.clone().negate());
      const hit=probe.intersectObject(surface,false)[0];
      check(!!hit&&hit.distance>.055&&hit.distance<.059,'each glass corner is seven millimetres outside the actual painted cabin, neither buried nor floating');
      check(hit.face.normal.dot(outward)>.99,'glass faces follow the real cabin slope instead of a backwards windshield angle');
    }
    check(p.getZ(0)<p.getZ(3)&&p.getY(0)>p.getY(3),'front windshield top leans back toward the roof');
    check(p.getZ(4)>p.getZ(7)&&p.getY(4)>p.getY(7),'rear windshield top leans forward toward the roof');
    check(bays[0].material.color.getHex()===0x454a49&&bays[0].material.roughness>.95,'parking bays use subdued rough asphalt');
    surface.material.dispose();
  }
  for(const car of cars){
    check(car.kind==='prop'&&car.parkedCar&&car.shape==='box'&&course.features.obstacles.includes(car),'parked hull is a normal solid obstacle shared by every actor');
    check(car.halfX===PARKED_CAR_SIZE.halfX&&car.halfZ===PARKED_CAR_SIZE.halfZ&&car.height===PARKED_CAR_SIZE.height,'the visual and physical dimensions have one declared contract');
    check(course.obstaclesNear(car.s,10).includes(car),'parked car is present in the actual collision bucket query');
    const c=Math.cos(car.heading),sn=Math.sin(car.heading),start={x:car.x-sn*9,y:car.y+.05,z:car.z-c*9},end={x:car.x+sn*2,y:car.y+.05,z:car.z+c*2};
    check(!!sweepObstacle(start,end,car,car.heading,{halfWidth:1.02,halfLength:2.35,height:1.5}),'a moving car cannot pass through a parked car');
    for(const obstacle of course.features.obstacles){if(obstacle===car)continue;check(!sweepObstacle(car,car,obstacle,car.heading,{halfWidth:car.halfX+.20,halfLength:car.halfZ+.20,height:car.height}),'parked hull has a collision clearance from buildings, rocks, posts and other vehicles');}
    for(const x of[-car.halfX,0,car.halfX])for(const z of[-car.halfZ,0,car.halfZ]){
      const n=course.nearest(car.x+c*x+sn*z,car.z-sn*x+c*z);
      check(Math.abs(n.lateral)>course.roadHalfWidthAt(n.s)+5.55&&Math.abs(n.lateral)<78,'the entire car stays beyond the sidewalk and inside the recovery boundary');
      check(!course.tunnelAt(n.s)&&!course.surfaceAt(n.s,n.lateral).road,'parked car never occupies a main road, shortcut or tunnel');
    }
    carsChecked++;
  }
  for(const mesh of group.children){
    const geometry=mesh.geometry;check(geometry.attributes.position.array.every(Number.isFinite),'parked car and bay geometry remain finite');
    if(!mesh.isInstancedMesh)continue;
    check(mesh.frustumCulled&&mesh.boundingSphere.radius<155,'parked vehicle batches have finite200m-cell bounds');
    const p=geometry.attributes.position;
    for(let instance=0;instance<mesh.count;instance++){
      const car=cars.find(car=>car.id===mesh.userData.parkedCarIds[instance]),c=Math.cos(car.heading),sn=Math.sin(car.heading);mesh.getMatrixAt(instance,matrix);
      const wheelMinimums=Array(4).fill(Infinity),wheelPoints=Array.from({length:4},()=>new THREE.Vector3());
      for(let i=0;i<p.count;i++){
        point.fromBufferAttribute(p,i).applyMatrix4(matrix);const dx=point.x-car.x,dz=point.z-car.z;
        check(Math.abs(dx*c-dz*sn)<=car.halfX+.0003&&Math.abs(dx*sn+dz*c)<=car.halfZ+.0003&&point.y>=car.y-.0003&&point.y<=car.y+car.height+.0003,'every rendered body, wheel, lamp and trim vertex fits its exact collision hull');vertices++;
        if(mesh.name==='Parked sedan rubber'){
          const wheel=Math.floor(i/(p.count/4)),clearance=point.y-wheelGround(course,point);if(clearance<wheelMinimums[wheel]){wheelMinimums[wheel]=clearance;wheelPoints[wheel].copy(point);}
        }
      }
      if(mesh.name==='Parked sedan rubber')for(let i=0;i<4;i++){
        const clearance=wheelMinimums[i];minWheel=Math.min(minWheel,clearance);maxWheel=Math.max(maxWheel,clearance);
        check(clearance>=.012&&clearance<=.038,'each of the four tire bottoms rests within38mm of its actual terrain');
        const p=wheelPoints[i];ray.set(new THREE.Vector3(p.x,p.y+.3,p.z),down);const hit=ray.intersectObjects(bays,false)[0];
        check(!!hit&&p.y-hit.point.y>=-.003&&p.y-hit.point.y<=.025,'each tire touches its actual rendered parking bay within25mm');
      }
    }
  }
  function routeClear(points){for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],heading=Math.atan2(b.x-a.x,b.z-a.z);for(const car of cars){check(!sweepObstacle(a,b,car,heading,{halfWidth:1.32,halfLength:3.0,height:2.9}),'full-size route sweep stays clear of every parked car');routeSweeps++;}}}
  const main=[];for(let s=0;s<=course.length;s+=6)main.push(course.groundAt(s));routeClear(main);
  for(const cut of course.features.shortcuts){const points=[];for(let s=cut.start;s<cut.end;s+=4)points.push(course.groundAt(s,course.shortcutOffset(cut,s)));points.push(course.groundAt(cut.end,course.shortcutOffset(cut,cut.end)));routeClear(points);}
  const resources=new Set();group.traverse(mesh=>{if(mesh.geometry)resources.add(mesh.geometry);for(const material of [mesh.material].flat())if(material)resources.add(material);});const disposed=new Map([...resources].map(resource=>[resource,0]));for(const resource of resources)resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1));disposeTree(group);check([...disposed.values()].every(n=>n===1),'all shared parking geometry and materials dispose exactly once');
  console.log(`${id}/${seed}: ${cars.length} parked cars in ${cars.length/2} clear bays, ${group.children.length} spatial draws.`);
}
{
  const course=new Course(COURSE.find(def=>def.id==='midnight-chase'),1989),blocked=Object.create(course);blocked.features={...course.features,obstacles:[{x:0,z:0,halfX:100000,halfZ:100000,heading:0}]};
  check(buildCityParking(blocked).length===0,'fully obstructed bays are omitted instead of forcing car placement');
  const noCity=Object.create(course);noCity.sections=[{theme:'alpine',start:0,end:course.length}];check(buildCityParking(noCity).length===0,'non-city scenes receive no parked city cars');
}
console.log(`City parking: ${checks} deterministic placement, collider, ground, route and resource checks; ${carsChecked} cars, ${vertices} transformed vertices, ${routeSweeps} clear route sweeps. Tire terrain gap ${(minWheel*1000).toFixed(1)}–${(maxWheel*1000).toFixed(1)}mm.`);
