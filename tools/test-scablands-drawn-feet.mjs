// Slice 10 feasibility check. This reads the scene's actual ground answer without
// driving or changing race state. Claude revised both step limits on 17 November.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {createRiverField} from '../src/world/scablands-draw.js';
import {SCABLANDS_LAYOUT, SCABLANDS_VENUE} from '../src/world/scablands.js';
import {createScablandsScene} from '../src/world/scablands-scene.js';
import {scablandsFloorsAt,scablandsSurfaceHeightAt,scablandsActorHeightAt} from '../src/world/scablands-ground.js';
import {createScablandsDrawnFeet} from '../src/world/scablands-drawn-feet.js';
import {NEAR_GROUND} from '../src/world/near-ground.js';
import {createGroundTunnels} from '../src/world/ground-tunnels.js';
import {HOT_DELIVERY_WAYS, routeFor, sampleLine} from '../src/world/scablands-ways.js';
import {EVERBURN_JOBS} from '../src/world/jobs/everburn.js';
import {RIVER_LAND} from '../src/world/scablands-regions.js';
import {ROAD_NET} from '../src/world/scablands-road.js';
import {LAND} from '../src/world/scablands-names.js';
import {createBrandAshView} from '../src/world/brand-ash-view.js';
import {syncScene} from '../src/scene-systems.js';

const riverField = createRiverField(SCABLANDS_LAYOUT);
const course = new Course(SCABLANDS_VENUE, 1989);
const scene = createScablandsScene(course, {loadAsset: async path => {
  const root = new THREE.Group();
  if(path.endsWith('/folk.glb')){
    const auntie=new THREE.Mesh(new THREE.BoxGeometry(.5,1.7,.4),new THREE.MeshStandardMaterial());
    auntie.name='auntie-solder root';root.add(auntie);
  }
  for (const name of ['Big Bess gas truck', "Old Smoke's rolling furnace"]) {
    const model = new THREE.Group();
    model.name = name;
    root.add(model);
  }
  return {scene: root};
}});
assert.equal(await scene.ready, true);

try {
  const feet=scene.group.userData.drawnFeet;
  for(const [x,z] of [[2690,-2445],[2926,-2529],[3255,-2639]]) {
    const own=scablandsSurfaceHeightAt(x,z),shift=feet.shift(x,z,own);
    assert.ok(shift>=.4&&shift<=.9,`Measured place (${x},${z}): ${shift}`);
    assert.ok(Math.abs(shift-(feet.groundAt(x,z)-own-NEAR_GROUND.lift))<1e-9);
  }
  for(let i=112;i<=118;i++)for(let j=-150;j<=-145;j++) {
    const x=i*NEAR_GROUND.cellX,z=j*NEAR_GROUND.cellZ;
    assert.ok(Math.abs(feet.shift(x,z))<1e-5,'The existing .025 m ground lift is not added twice at corners.');
  }
  const deck=LAND.at('girder-bridge');
  assert.equal(feet.shift(deck.x,deck.z,scablandsSurfaceHeightAt(deck.x,deck.z)),0);
  const own=scablandsSurfaceHeightAt(2690,-2445);
  const tunnel=createGroundTunnels([{start:{x:2680,y:own+1.65,z:-2445},end:{x:2700,y:own+1.65,z:-2445},radius:3}]);
  const underground=createScablandsDrawnFeet({near:{heightAtDrawn:()=>own+1},gorge:{heightAtDrawn:()=>null},riverField:{distanceAt:()=>128},course:{groundTunnels:tunnel}});
  assert.equal(underground.shift(2690,-2445,own),0,'A tunnel support receives no shift.');
  assert.equal(underground.shift(2690,-2445,own,own+1),0,'Jumping within a tunnel receives no shift.');
  // Drawing-only state is kept on the mesh. Rule positions advance at 100 km/h.
  const mouthFeet=createScablandsDrawnFeet({near:{heightAtDrawn:(x,z)=>scablandsSurfaceHeightAt(x,z)+.825},
    gorge:{heightAtDrawn:()=>null},riverField:{distanceAt:()=>128},course:{groundTunnels:tunnel}});
  const bridgeHit=ROAD_NET.nearest(deck.x,deck.z),a=bridgeHit.road.points[bridgeHit.index],b=bridgeHit.road.points[bridgeHit.index+1];
  const heading=Math.atan2(b.x-a.x,b.z-a.z);
  for(const kind of ['tunnel','bridge']) {
    const view=new THREE.Group(), delta=100/3.6/60,field=kind==='tunnel'?mouthFeet:feet;
    let previous=null,previousRaw=null,previousSupport,switched=false;
    for(let frame=0;frame<500;frame++) {
      const along=-120+frame*delta;
      const x=kind==='tunnel'?2670+frame*delta:deck.x+Math.sin(heading)*along;
      const z=kind==='tunnel'?-2445:deck.z+Math.cos(heading)*along;
      const support=scablandsActorHeightAt(x,z,previousSupport);
      previousSupport=support;
      const raw=field.shift(x,z,support),eased=field.shiftFor(view,frame/60,x,z,support);
      const blocked=view.userData.scablandsFeet.blocked;
      if(previous) {
        const groundChange=blocked===previous.blocked?Math.abs(raw-previousRaw):0;
        assert.ok(Math.abs(eased-previous.value)<=groundChange+.05+1e-9,`${kind} switch is eased at 60 Hz`);
        switched ||= blocked!==previous.blocked;
      }
      previous={value:eased,blocked};previousRaw=raw;
    }
    assert.ok(switched,`${kind} route crosses a support boundary`);
  }
  const ashView=createBrandAshView(),heightCalls=[];
  const ashActor={id:'ash-test',brandAsh:true,x:10,y:2,z:20,yaw:0};
  ashView.update({actors:[ashActor],job:{stepIndex:0,steps:[{brand:true}],stepState:{brandAsh:{men:{
    'ash-test':{ash:{remaining:.5,position:{x:30,y:3,z:40}}}
  }}}}},(x,z)=>{heightCalls.push([x,z]);return .8;});
  assert.deepEqual(heightCalls,[[10,20],[30,40]],'Thrown ash asks each source and target height once.');
  ashView.dispose();
  const tunnelPoints=[];
  const scratchFeet=createScablandsDrawnFeet({near:{heightAtDrawn:()=>own+.8},gorge:{heightAtDrawn:()=>null},
    riverField:{distanceAt:()=>128},course:{groundTunnels:{tubeAt:point=>{tunnelPoints.push(point);return null;}}}});
  scratchFeet.shift(2690,-2445,own);scratchFeet.shift(2690,-2445,own);
  assert.ok(tunnelPoints.every(point=>point===tunnelPoints[0]),'Tunnel queries reuse one drawing scratch point.');
  const deepTunnel=createGroundTunnels([{start:{x:2680,y:own-10+1.65,z:-2445},end:{x:2700,y:own-10+1.65,z:-2445},radius:3}]);
  const deepFeet=createScablandsDrawnFeet({near:{heightAtDrawn:()=>own+.8},gorge:{heightAtDrawn:()=>null},riverField:{distanceAt:()=>128},course:{groundTunnels:deepTunnel}});
  assert.equal(deepFeet.shift(2690,-2445,own-10,own-9),0,'A jump in a buried tunnel keeps its underground support.');
  const takeoff=scablandsSurfaceHeightAt(2690,-2450);
  assert.ok(Math.abs(feet.shift(2690,-2445,takeoff,own+2)-feet.shift(2690,-2445,own))<1e-9,
    'An airborne car keeps the shift of the ground below, rather than its old takeoff height.');
  for(const height of [-100,100]) {
    const limited=createScablandsDrawnFeet({near:{heightAtDrawn:()=>height},gorge:{heightAtDrawn:()=>null},riverField:{distanceAt:()=>128}});
    assert.equal(limited.shift(2690,-2445),Math.sign(height)*1.2);
  }
  let sink=0;
  const actors=Array.from({length:12},(_,i)=>({x:2690+i*.2,z:-2445+i*.2}));
  const near=course.nearest(2690,-2445);
  syncScene(scene.group,{s:near.s,lateral:near.lateral});
  const furnaceActor={id:'old-smoke-furnace',position:{x:2690,y:own,z:-2445},heading:0};
  syncScene(scene.group,{s:near.s,lateral:near.lateral,arena:{mode:'world-job',worldJob:{definition:{storyId:'everburn'},job:{stepIndex:0,steps:[{kind:'chase',path:[]}]},actors:[furnaceActor]}}});
  assert.ok(Math.abs(scene.group.getObjectByName("Old Smoke's moving furnace rig").position.y-own-feet.shift(2690,-2445,own))<1e-8,
    'The furnace keeps its absolute base height and receives the ground correction.');
  for(let frame=0;frame<100;frame++)for(const actor of actors)sink+=feet.shift(actor.x,actor.z);
  const start=performance.now();
  for(let frame=0;frame<2000;frame++)for(const actor of actors)sink+=feet.shift(actor.x,actor.z);
  const milliseconds=(performance.now()-start)/2000;
  console.log(`Twelve actors: ${milliseconds.toFixed(6)} ms per frame (${sink}).`);
  assert.ok(milliseconds<=.15,'Twelve shifts take at most .15 ms.');
  const riverActors=Array.from({length:12},(_,i)=>({x:2650.79+i*.1,z:2221.98+i*.1}));
  const riverNear=course.nearest(riverActors[0].x,riverActors[0].z);
  for(let i=0;i<20;i++)syncScene(scene.group,{s:riverNear.s,lateral:riverNear.lateral});
  const riverRigs=Array.from({length:12},()=>new THREE.Group());
  const riverStart=performance.now();
  for(let frame=0;frame<200;frame++)for(const [index,actor] of riverActors.entries())sink+=feet.shiftFor(riverRigs[index],frame/60,actor.x,actor.z);
  const riverMilliseconds=(performance.now()-riverStart)/200;
  console.log('Twelve river actors:',riverMilliseconds,'ms');
  assert.ok(riverMilliseconds<=.15,'Twelve river shifts take at most .15 ms.');
  const step = EVERBURN_JOBS[0].steps[0], floors = [], failures = [];
  for (const spacing of [.5, .05]) for (const way of HOT_DELIVERY_WAYS) {
    const route = routeFor(way.legs, {start: step.origin.position, destination: step.destination.position});
    let previous = null, worst = null;
    for (const point of sampleLine(route, spacing)) {
      const count = scablandsFloorsAt(point.x, point.z, floors);
      // A single floor is unambiguous here: no deck, Pipe or tunnel is selected.
      // Fresh course and ground: there are no player edits or tunnel segments.
      if (count !== 1) { previous = null; continue; }
      const own = floors[0], drawn = scene.group.userData.drawnFeet.groundAt(point.x, point.z);
      const current = {x: point.x, z: point.z, along: point.along, own, drawn, correction: scene.group.userData.drawnFeet.shift(point.x,point.z,own)};
      if (previous) {
        const change = Math.abs(current.correction - previous.correction);
        if (!worst || change > worst.change) worst = {change, before: previous, after: current};
      }
      previous = current;
    }
    console.log(`${way.id} step ${spacing}: ${JSON.stringify(worst)}`);
    const limit = spacing === .5 ? .3 : .05;
    if (worst.change > limit) {
      console.log('River distances at failing endpoints:',
        riverField.distanceAt(worst.before.x, worst.before.z), riverField.distanceAt(worst.after.x, worst.after.z));
      failures.push(`${way.id} step ${spacing}: ${worst.change.toFixed(9)} m exceeds ${limit} m`);
    }
  }
  assert.deepEqual(failures, [], 'The correction must meet the revised continuity limits.');
  // Ten perpendicular lines, one on each bank at five named river places.
  for (const name of ['the-pipe','the-steps','girder-bridge','the-wash','south-ford']) {
    const place=LAND.at(name), hit=RIVER_LAND.nearest(place.x,place.z);
    const points=RIVER_LAND.line.points, along=RIVER_LAND.line.along;
    let i=0; while(i+1<along.length-1 && along[i+1]<hit.along)i++;
    const a=points[i], b=points[i+1], length=Math.hypot(b.x-a.x,b.z-a.z);
    const nx=(b.z-a.z)/length, nz=-(b.x-a.x)/length;
    for(const bank of [-1,1]) for(const spacing of [.5,.05]) {
      let previous=null, worst={change:0}, seam=null;
      for(let n=0;n<=Math.round(36/spacing);n++) {
        const across=bank*(64+n*spacing), x=place.x+nx*across,z=place.z+nz*across;
        const drawn=scene.group.userData.drawnFeet.groundAt(x,z);
        const correction=scene.group.userData.drawnFeet.shift(x,z,scablandsFloorsAtHeight(x,z));
        const current={x,z,correction,distance:riverField.distanceAt(x,z)};
        if(previous) {
          const change=Math.abs(correction-previous.correction);
          if(change>worst.change)worst={change,before:previous,after:current};
          if(previous.distance<80&&current.distance>=80)seam=current;
        }
        previous=current;
      }
      console.log(`${name} bank ${bank} step ${spacing}: ${JSON.stringify({worst,seam})}`);
      assert.ok(seam, 'Each line crosses the cut edge.');
      assert.ok(worst.change<=(spacing===.5?.3:.05),'The river join must never jump.');
    }
  }
} finally {
  scene.dispose();
  riverField.texture.dispose();
}

function scablandsFloorsAtHeight(x,z) {
  const floors=[]; const count=scablandsFloorsAt(x,z,floors);return floors[count-1];
}
