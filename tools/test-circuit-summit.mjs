import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { SUMMIT_RUN, SUMMIT_GALLERY_BOUNDS, manifest } from '../src/circuits/summit-run.js';
import { TREMBLANT_SNOW } from '../src/circuits/tremblant-snow.js';
import {HARBOUR_LIGHTS} from '../src/circuits/harbour-lights.js';
import { buildTrackScript } from '../src/track-script.js';
import * as THREE from 'three';
import {roadBranchMaterial} from '../src/world.js';
import {constrainTunnelCamera} from '../src/camera-clearance.js';
import {applySnowTerrain,winterWeight,snowPineIds,winterLightingSettings,createSnowWorld,softBankGeometry} from '../src/snow-world.js';
import {sampleCourseLightPath} from '../src/light-path.js';
import {circuitLighting,resolveLightingSettings} from '../src/lighting-moods.js';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steerForYaw} from '../src/config.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PIT,pitSpeedLimitAt} from '../src/pit-lane.js';
import {useRacingLine} from './track-script-drive.mjs';
import { Course } from '../src/course.js';
import {renderedGroundHeight} from '../src/rendered-ground.js';
import {birchSpots} from '../src/circuit-effects.js';
import {addNightGlows} from '../src/night-glows.js';
import {surfaceRuns} from '../src/track-script-scene.js';
import {referenceTargets,runReferenceWorker} from './build-reference-laps.mjs';
import {CIRCUIT_ENTRIES,BASE_COURSE_COUNT} from '../src/circuit-manifests.js';

assert.deepEqual(manifest,{id:'summit-run',flag:'summit-run',state:'on',price:2600,grandPrix:true,releaseOrder:4,
  driver:{car:'falcone_f42',driverId:'club',controller:'racing-line',skill:.95}},'course-owned price/state/driver contract');
assert.ok(Object.isFrozen(manifest)&&Object.isFrozen(manifest.driver));
const registered=CIRCUIT_ENTRIES.find(entry=>entry.manifest.id==='summit-run');
assert.equal(registered.definition,SUMMIT_RUN,'registry keeps the exact authored definition');
assert.equal(registered.generationStage,20);assert.equal(SUMMIT_RUN.stage,20);
const actualCatalog=await runReferenceWorker({catalogOnly:true});
assert.equal(actualCatalog.events.indexOf('summit-run'),BASE_COURSE_COUNT+manifest.releaseOrder,'actual QA COURSE appends Summit after the four authored events');
assert.equal(actualCatalog.events.filter(id=>id==='summit-run').length,1,'stable id appears once');
assert.equal(actualCatalog.storageLength,0,'catalogue fixture has only empty memory storage');
assert.equal(actualCatalog.flags.find(flag=>flag.name==='summit-run')?.state,'on');
assert.equal(actualCatalog.flags.find(flag=>flag.name==='summit-run')?.enabled,true);
assert.equal(SUMMIT_RUN.id, 'summit-run');
assert.equal(SUMMIT_RUN.flag, 'summit-run');
assert.equal(SUMMIT_RUN.noCombat, true);
assert.equal(SUMMIT_RUN.closed, false);
assert.equal(SUMMIT_RUN.laps, 1);
assert.equal(SUMMIT_RUN.fieldSize, 6);
const geometry = buildTrackScript(SUMMIT_RUN);
assert.ok(geometry.length >= 13000 && geometry.length <= 15000);
assert.equal(geometry.pieces.length, 52);
assert.ok(Math.hypot(geometry.samples.at(-1).x-geometry.samples[0].x,geometry.samples.at(-1).z-geometry.samples[0].z)>1000,'Summit ends at a separate mountain summit, rather than closing a loop');
assert.deepEqual(geometry.pieces.filter(p=>p.name.includes('Hairpin') || ['Devil\'s Elbow','Last Breath'].includes(p.name)).map(p=>p.radius), [16,16,18,16,15,15]);
assert.deepEqual(geometry.pieces.filter(p=>p.crest>0).map(p=>p.crest), [2.5,2.5,1.5]);
assert.ok(Math.abs(geometry.heightAt(geometry.length)-geometry.heightAt(0)-720)<1e-5);
assert.deepEqual(geometry.samples, buildTrackScript(SUMMIT_RUN).samples);
const course = new Course(SUMMIT_RUN, 1989);
assert.equal(course.raceLength, course.length);
assert.equal(course.pitLane.straight, 'Tree Line Pit Straight');
assert.equal(course.pitLane.limiterEnd-course.pitLane.limiterStart,180);
assert.equal(course.pitLane.limitMph,80/1.609344);
for(const piece of geometry.pieces.slice(0,26))assert.equal(piece.surface,piece.name==='Graded Gravel'?'gravel':'warm-tarmac');
assert.equal(geometry.pieces[26].surface,'asphalt','whole pit straight stays asphalt');
assert.deepEqual(referenceTargets([SUMMIT_RUN]),[],'an open road has no cyclic reference');
assert.ok(!surfaceRuns(course).some(run=>run.kind==='warm-tarmac'),'warm tarmac has no overlay');
const forestRange=SUMMIT_RUN.scenery.forest.ranges[0];
const groves=course.features.trees.filter(tree=>tree.id.startsWith('forest-'));
assert.ok(groves.length>100,'reused grove forest makes the Pine Switchbacks dense');
assert.ok(groves.every(tree=>tree.s>=forestRange.from&&tree.s<=forestRange.to));
assert.ok(groves.some(tree=>tree.off<0)&&groves.some(tree=>tree.off>0),'forest stands on both sides');
const birches=birchSpots(course,SUMMIT_RUN.effects.birches);
assert.ok(birches.length>0,'reused birch cells exist among the pines');
assert.ok(birches.every(tree=>{const near=course.nearest(tree.x,tree.z);return near.s>=forestRange.from-8&&near.s<=forestRange.to+8;}));
assert.equal(SUMMIT_RUN.snowWorld.softBanks,true);
assert.equal(SUMMIT_RUN.snowWorld.drifts,true);
assert.ok(course.gripKindAt(8200,0)==='snow');
assert.ok(course.features.shortcuts.some(branch=>branch.id==='summit-open-road'));
assert.ok(course.features.tunnels.some(tunnel=>tunnel.id==='summit-gallery'));
const galleryBytes=readFileSync(new URL('../public/assets/models/circuits/kits/gallery.glb',import.meta.url));
const galleryModel=JSON.parse(galleryBytes.subarray(20,20+galleryBytes.readUInt32LE(12)).toString('utf8'));
for(const bounds of SUMMIT_GALLERY_BOUNDS){
  const node=galleryModel.nodes.find(node=>node.name===bounds.name);
  assert.ok(node,`${bounds.name} is a real approved mesh`);
  assert.ok(!node.matrix&&!node.translation&&!node.rotation&&!node.scale,'runtime gallery mesh coordinates have applied transforms');
  const accessor=galleryModel.accessors[galleryModel.meshes[node.mesh].primitives[0].attributes.POSITION];
  assert.deepEqual(bounds.min,accessor.min,`${bounds.name} physical minimum matches the actual GLB`);
  assert.deepEqual(bounds.max,accessor.max,`${bounds.name} physical maximum matches the actual GLB`);
  const row=SUMMIT_RUN.kitPlacements.find(row=>row.id==='gallery'),frame=course.groundAt(row.s,row.lateral);
  const actor=course.features.obstacles.find(actor=>actor.sourceBounds===bounds.name&&actor.kitS===row.s);
  assert.ok(actor,`${bounds.name} has a real physical collider`);
  const move=row.nodeTranslations?.[bounds.name]??[0,0,0];
  const xLocal=((accessor.min[0]+accessor.max[0])*.5+move[0])*row.scale[0],zLocal=((accessor.min[2]+accessor.max[2])*.5+move[2])*row.scale[2];
  const x=frame.x+Math.cos(frame.heading)*xLocal+Math.sin(frame.heading)*zLocal;
  const z=frame.z-Math.sin(frame.heading)*xLocal+Math.cos(frame.heading)*zLocal;
  assert.ok(Math.hypot(actor.x-x,actor.z-z)<1e-8,'actual post/roof position follows the displayed tile transform');
  assert.equal(actor.minY,frame.y+(accessor.min[1]+move[1])*row.scale[1]);
  assert.equal(actor.height,(accessor.max[1]-accessor.min[1])*row.scale[1]);
  if(bounds.name.includes('pillar'))assert.ok(Math.abs(zLocal)>7,'visible pillars are at the tile ends, not the old centre collider');
}
// The authored slit mask selects real aperture-side vertices in both delivered LODs.
const slit=SUMMIT_RUN.kitLook.observatory.slit;
for(const suffix of ['', '-lod']){
  const bytes=readFileSync(new URL('../public/assets/models/circuits/kits/observatory'+suffix+'.glb',import.meta.url));
  const jsonLength=bytes.readUInt32LE(12),model=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8')),bin=20+jsonLength+8;
  let selected=0,all=0;
  const component=(index,vertex,axis)=>{
    const accessor=model.accessors[index],view=model.bufferViews[accessor.bufferView];
    assert.equal(accessor.componentType,5126,'actual aperture attributes are full-precision floats');
    return bytes.readFloatLE(bin+(view.byteOffset??0)+(accessor.byteOffset??0)+vertex*(view.byteStride??12)+axis*4);
  };
  for(const node of model.nodes)for(const primitive of model.meshes[node.mesh].primitives){
    const positions=primitive.attributes.POSITION,normals=primitive.attributes.NORMAL,count=model.accessors[positions].count;
    all+=count;if(!slit.nodes.includes(node.name))continue;
    for(let vertex=0;vertex<count;vertex++){
      const x=component(positions,vertex,0),y=component(positions,vertex,1),z=component(positions,vertex,2);
      const nx=component(normals,vertex,0),ny=component(normals,vertex,1),nz=component(normals,vertex,2);
      if(Math.abs(x)<=slit.halfWidth&&y>=slit.minY&&z>=slit.minZ&&Math.abs(nx/Math.hypot(nx,ny,nz))>=slit.normalX)selected++;
    }
  }
  assert.ok(selected>0,'the actual dome has aperture-side faces to light');
  assert.ok(selected<all*.1,'the real slit mask cannot light the whole dome/base');
}
const galleryAnchors=SUMMIT_RUN.kitPlacements.filter(row=>row.id==='gallery').map(row=>{
  const ground=course.groundAt(row.s,row.lateral);
  const rendered=renderedGroundHeight(course,{...ground,s:row.s,off:row.lateral},{requireSurface:true});
  assert.ok(Number.isFinite(rendered),'every actual Gallery placement has rendered ground');
  return {s:row.s,ground:ground.y,rendered,delta:rendered-ground.y};
});
console.log('Gallery actual anchor witness: '+JSON.stringify({count:galleryAnchors.length,maxDelta:Math.max(...galleryAnchors.map(row=>Math.abs(row.delta))),anchors:galleryAnchors}));
const actualRoof=SUMMIT_GALLERY_BOUNDS.find(bounds=>bounds.name==='gallery-heavy-concrete-roof');
assert.equal(course.features.tunnels[0].height,actualRoof.min[1]*1.1,'camera underside agrees with the actual thick fascia');
assert.ok(actualRoof.min[1]*1.1>=4.5,'approved road headroom stays at least 4.5 m');
assert.deepEqual(course.features.tunnels[0].clearance,{width:10,height:actualRoof.min[1]*1.1},'authored Gallery states its actual full road width and roof clearance');
assert.ok(!course.features.walls.some(wall=>wall.id.startsWith('gallery-')),'actual kit colliders do not draw substitute wall boxes');

const open=course.features.shortcuts.find(branch=>branch.id==='summit-open-road');
assert.equal(course.surfaceAt(10500,course.shortcutOffset(open,10500)).road,true,'the Open Road is real driveable road');
assert.equal(course.gripKindAt(10500,course.shortcutOffset(open,10500)),'asphalt','clear Open Road uses Claude\'s settled ploughed asphalt surface');
assert.equal(course.gripKindAt(10500,0),'snow','same-station main road retains its unchanged snow surface');
assert.equal(sampleCourseLightPath(course,{distance:0}).settings.nightAmount,0);
assert.equal(sampleCourseLightPath(course,{distance:11000}).settings.nightAmount,1);
const baseLight=sampleCourseLightPath(course,{distance:0}).settings;
assert.equal(winterLightingSettings(baseLight,{course,distance:1000}),baseLight,'dry desert lighting retains the original object and values');
assert.deepEqual(winterLightingSettings(baseLight,{course,distance:12000}),winterLightingSettings(baseLight),'full snowy range retains the full winter transform');
const snowCourse=new Course(TREMBLANT_SNOW,1989);
assert.equal(sampleCourseLightPath(snowCourse,{distance:0}),null,'accepted Snow uses the native static-light branch');
const authoredSnowLight=circuitLighting(resolveLightingSettings(snowCourse.def.theme,{mood:'clear'}),snowCourse.def.light);
assert.ok(authoredSnowLight.winter,'accepted Snow carries an authored winter look');
const transformedSnowLight=winterLightingSettings(authoredSnowLight,{course:snowCourse,distance:1000});
assert.deepEqual(transformedSnowLight,winterLightingSettings(authoredSnowLight),'legacy full-winter context retains exact values');
for(const [key,value] of Object.entries(authoredSnowLight.winter))assert.deepEqual(transformedSnowLight[key],value,'accepted Snow winter overrides stay exact');
const harbourNight=sampleCourseLightPath(new Course(HARBOUR_LIGHTS,1989),{distance:1000,theme:'city',menu:false,tunnel:false}).settings;
assert.equal(SUMMIT_RUN.snowWorld.nightExposure,harbourNight.exposure,'authored night exposure comes from the real Harbour palette');
const nightLight=sampleCourseLightPath(course,{distance:12000,raceLength:course.raceLength,theme:'alpine',tunnel:false,menu:false}).settings;
assert.equal(winterLightingSettings(nightLight,{course,distance:12000}).exposure,nightLight.exposure,'Summit night snow uses the same exposure as the native Harbour night palette');
const beforeLight=structuredClone(baseLight);
const edgeLight=winterLightingSettings(baseLight,{course,distance:SUMMIT_RUN.snowWorld.ranges[0].from+6});
assert.ok(edgeLight.exposure<baseLight.exposure&&edgeLight.exposure>winterLightingSettings(baseLight).exposure);
assert.deepEqual(baseLight,beforeLight,'winter blending does not change the source palette');
const asphalt=new THREE.MeshStandardMaterial({color:0x222222,roughness:.6});
assert.equal(roadBranchMaterial(course,open,asphalt,false),asphalt,'dry branch retains original material');
assert.equal(roadBranchMaterial(course,open,asphalt,true),asphalt,'actual clear Open retains asphalt with winter presentation enabled');
// Preserve the historical snow helper case without changing the actual course.
const historicalSnowBranch=Object.freeze({...open,surface:'snow',gripKind:'snow'});
const snowMaterial=roadBranchMaterial(course,historicalSnowBranch,asphalt,true);
assert.notEqual(snowMaterial,asphalt);
assert.deepEqual(snowMaterial.color.toArray(),new THREE.Color(SUMMIT_RUN.snowWorld.branchTone).toArray(),'Summit branch draws its reviewed darker packed-snow tone');
assert.equal(snowMaterial.roughness,.94);
assert.equal(asphalt.roughness,.6,'branch winter material never changes shared asphalt');
snowMaterial.dispose();asphalt.dispose();
assert.equal(course.tunnelAt(10500,0)?.id,'summit-gallery');
assert.equal(course.tunnelAt(10500,7.7)?.id,'summit-gallery','roof covers the roadside camera too');
assert.equal(course.tunnelAt(10500,course.shortcutOffset(open,10500)),null,'Open Road is outside the Gallery');
const roofCamera=course.worldAt(10500,7.7);roofCamera.y+=10;
assert.equal(constrainTunnelCamera(course,roofCamera,10500),true);
const roofFrame=course.nearest(roofCamera.x,roofCamera.z,10500);
const roofTunnel=course.tunnelAt(roofFrame.s,roofFrame.lateral);
const roofRatio=Math.min(.995,Math.abs(roofFrame.lateral)/roofTunnel.width);
const flatRoofY=course.groundAt(roofFrame.s,0).y+actualRoof.min[1]*1.1;
const visibleArchY=course.at(roofFrame.s).y+3.6+(actualRoof.min[1]*1.1-3.6)*Math.sqrt(1-roofRatio*roofRatio);
assert.ok(Math.abs(roofCamera.y-(Math.min(flatRoofY,visibleArchY)-.45))<1e-6,'camera stays beneath both actual kit roof and visible Gallery arch');
const openCamera=course.worldAt(10500,course.shortcutOffset(open,10500));openCamera.y+=10;
const openHeight=openCamera.y;
assert.equal(constrainTunnelCamera(course,openCamera,10500),false);
assert.equal(openCamera.y,openHeight);
const tunnels=course.features.tunnels;
course.features.tunnels=[{id:'legacy',start:10000,end:11000,width:8,height:8}];
assert.equal(course.tunnelAt(10500,-18)?.id,'legacy','legacy tunnel range query remains exact');
course.features.tunnels=tunnels;
const samples=[course.groundAt(1000,15),course.groundAt(12000,15)];
const terrain=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(samples.flatMap(p=>[p.x,p.y,p.z]),3));
applySnowTerrain(terrain,course);
assert.equal(terrain.attributes.winterWeight.getX(0),0,'desert terrain stays dry');
assert.equal(terrain.attributes.winterWeight.getX(1),1,'upper terrain is snowy');
assert.equal(winterWeight(course,1000),0);
assert.equal(winterWeight(course,12000),1);
for(const tree of course.features.trees)assert.equal(snowPineIds(course).has(tree.id),winterWeight(course,tree.s)>0,'only upper trees become snow kit pines');
const allWinterCourse={...course,def:{...course.def,snowWorld:{...SUMMIT_RUN.snowWorld,mixed:false}}};
applySnowTerrain(terrain,allWinterCourse);
assert.deepEqual(Array.from(terrain.attributes.winterWeight.array),[1,1],'legacy all-winter terrain remains exact');
terrain.dispose();
// Real open course metadata goes through the existing campaign loader.
const original=COURSE[0];
try {
  COURSE[0]=SUMMIT_RUN;
  const duel=new Duel({seed:1989,featureFlags:{'grand-prix':true,'summit-run':true}});
  duel.startCampaign({startStage:0,mode:'grandprix',car:'falcone_f42',cpuDifficulty:'medium'});
  assert.equal(duel.state.field.size,6);
  assert.equal(duel.state.opponents.length,5);
  assert.equal(duel.state.lapsTotal,1);
  assert.equal(duel.course.closed,false);
  assert.ok([duel.state,...duel.state.opponents].every(actor=>actor.s>0&&actor.s<45),'six real staggered grid poses fit the first straight');
  assert.equal(duel.state.combat,null);
  assert.equal(duel.state.traffic.length,0);
  const state=duel.state,roof=duel.course.features.obstacles.find(actor=>actor.sourceBounds==='gallery-heavy-concrete-roof'&&actor.kitS===10176);
  assert.equal(roof.verticalClearance,true,'only the authored overhead roof opts into missing ground height');
  const contactPose={status:'racing',prevS:10160,s:10180,prevLateral:0,lateral:0,headingError:0,
    speedMph:100,airborne:false,airHeight:0,prevAirHeight:0,groundHeight:null,prevGroundHeight:null,
    invulnerableSec:0,impactTimer:0,damageCooldown:0,pushVelocity:0};
  Object.assign(state,contactPose);
  duel._staticContacts(state,true);
  assert.equal(state.s,10180,'real grounded static contacts pass through the Gallery entrance');
  assert.equal(state.impactTimer,0,'the raised roof does not crash a grounded car');
  Object.assign(state,contactPose,{airborne:true,airHeight:5,prevAirHeight:5});
  duel._staticContacts(state,true);
  assert.ok(state.s<10170,'an airborne car still strikes the actual roof face');
  assert.ok(state.impactTimer>0,'airborne roof contact reaches the native crash path');
  const pillar=duel.course.features.obstacles.find(actor=>actor.sourceBounds==='gallery-concrete-pillar'&&actor.kitS===10176);
  Object.assign(state,contactPose,{prevLateral:pillar.off,lateral:pillar.off});
  duel._staticContacts(state,true);
  assert.ok(state.s<10170,'the real Gallery entrance pillar remains solid');
  roof.verticalClearance=false;
  try {
    Object.assign(state,contactPose);
    duel._staticContacts(state,true);
    assert.ok(state.s<10170,'unflagged grounded obstacles retain their historical horizontal contact');
  } finally {roof.verticalClearance=true;}
} finally { COURSE[0]=original; }
// Separate stretches must not share terrain; hairpin neighbours are exempt.
const points=geometry.samples;
let closestSquared=Infinity;
for(let a=0;a<points.length;a++)for(let b=a+1;b<points.length;b++){
  if(points[b].s-points[a].s<=750)continue;
  const dx=points[b].x-points[a].x,dz=points[b].z-points[a].z;
  if(dx*dx>=closestSquared||dz*dz>=closestSquared)continue;
  closestSquared=Math.min(closestSquared,dx*dx+dz*dz);
}
const closest=Math.sqrt(closestSquared);
assert.ok(closest>=165, `separate mountain legs leave ${closest.toFixed(1)} m`);
console.log('Summit authored layout, climb, native finish road and separation passed.');

if(process.argv.includes('--drive')){
  const strategies=[];
  for(const strategy of ['summer','pit','winter']){
    const previousStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
    const previousCancel=Object.getOwnPropertyDescriptor(globalThis,'cancelAnimationFrame');
    const memory=new Map(),stage=COURSE.length;
    let app;
    COURSE.push(SUMMIT_RUN);
    try {
      globalThis.localStorage={getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,String(value)),removeItem:key=>memory.delete(key)};
      globalThis.cancelAnimationFrame??=()=>{};
      app=new App();
      app.duel.featureFlags=createFeatureFlags({storage:null,overrides:{'grand-prix':true,'summit-run':true}});
      app.profile={...app.profile,credits:1e6};app._saveProfile();
      assert.equal(app.purchaseCourse('summit-run').ok,true);
      assert.equal(app.startCampaign({startStage:stage,seed:1989,fieldSeed:4242,fieldSize:5,mode:'grandprix',car:'falcone_f42',difficulty:'casual',cpuDifficulty:'medium',tyre:strategy==='winter'?'winter':'summer'}),true);
      app.autopilot=true;app._scriptedCrashDone=true;
      useRacingLine(app,.95);
      const duel=app.duel,state=duel.state,lane=duel.course.pitLane,events=[];
      assert.equal(state.field.size,6);assert.equal(state.opponents.length,5);
      let serviceStarted=null,serviceEnded=null,changedAt=null,crashes=0,finite=true;
      duel.onChange((s,event)=>{if(event.pitCue)events.push({cue:event.pitCue,t:s.stageTimeSec,s:s.s});if(event.crash)crashes++;});
      if(strategy==='pit'){
        const driveLine=app._driveAutopilot;
        app._driveAutopilot=function(){
          driveLine.call(this);
          if(state.status!=='racing'||state.s<lane.entry-100||state.s>lane.exit)return;
          const v=Math.max(0,state.speedMph)*DRIVE.mphToWorld;
          const look=state.s+Math.max(6,v*.3),offset=lane.offsetAt(look);
          const wanted=Math.atan((offset-state.lateral)*2.4/Math.max(15,v));
          const yaw=(wanted-state.headingError)*6;
          const surface=duel._drivingSurface(state.s,state.lateral);
          const remaining=lane.box-state.s;
          const stop=Math.sqrt(2*DRIVE.brakeAccel*duel.car.braking*DRIVE.mphToWorld*Math.max(0,remaining-2))/DRIVE.mphToWorld;
          const normal=duel.course.racingLine.speedAt(state.s)*.95*Math.sqrt(duel.car.grip/.82*(surface.traction||1))/DRIVE.mphToWorld;
          const laneTarget=pitSpeedLimitAt(duel.course,state.s,state.lateral)??Math.min(surface.speedLimit,duel.car.topSpeed*.97,normal);
          const target=state.tyre==='winter'?laneTarget:Math.min(laneTarget,stop);
          const brake=state.speedMph>target?Math.min(1,(state.speedMph-target)/6):0;
          duel.setInput({throttle:state.speedMph<target?1:0,brake,steer:steerForYaw(yaw,{speedMph:state.speedMph,grip:duel.car.grip,traction:surface.traction,car:duel.car,brake:brake,tyreSlip:state.tyreSlipRules===true&&!state.airborne&&state.speedMph>=0}),boost:false});
        };
      }
      for(let step=0;step<60*900&&['countdown','racing'].includes(state.status);step++){
        app.advance(1/60,1/60);
        finite&&=[state.s,state.lateral,state.speedMph,state.headingError].every(Number.isFinite);
        if(state.pit?.phase==='servicing'&&serviceStarted===null)serviceStarted=state.stageTimeSec;
        if(state.tyre==='winter'&&strategy!=='winter'&&changedAt===null){changedAt=state.s;serviceEnded=state.stageTimeSec;}
        if(state.completedLaps>=1)break;
      }
      const result={strategy,status:state.status,completed:state.completedLaps,seconds:state.field.stats.playerFinish??state.stageTimeSec,tyre:state.tyre,changedAt,serviceStarted,serviceEnded,events,crashes,finite,endS:state.s};
      strategies.push(result);console.log(JSON.stringify(result));
      assert.equal(state.completedLaps,1,`${strategy} reaches the native endpoint`);
      assert.equal(finite,true,`${strategy} remains finite`);
      if(strategy==='pit'){
        assert.equal(events.filter(event=>event.cue==='pit.go').length,1,'pit strategy receives one real service');
        assert.equal(state.tyre,'winter');
        assert.ok(changedAt>=lane.box-4&&changedAt<=lane.box+4,'tyres change only at the actual box');
        assert.ok(Math.abs(serviceEnded-serviceStarted-4)<=1/60+1e-6,'actual service lasts four seconds');
      }else assert.equal(events.filter(event=>event.cue==='pit.go').length,0,'non-pit strategies receive no service');
    } finally {
      try {app?.dispose();} finally {
        COURSE.splice(stage,1);
        if(previousStorage)Object.defineProperty(globalThis,'localStorage',previousStorage);else delete globalThis.localStorage;
        if(previousCancel)Object.defineProperty(globalThis,'cancelAnimationFrame',previousCancel);else delete globalThis.cancelAnimationFrame;
      }
    }
  }
  const [summer,pit,winter]=strategies;
  assert.ok(pit.seconds>=270&&pit.seconds<=330,`Medium mid-car run is ${pit.seconds.toFixed(3)} s`);
  assert.ok(summer.seconds-pit.seconds>=4&&summer.seconds-pit.seconds<=8,`pit saves ${(summer.seconds-pit.seconds).toFixed(3)} s versus summer`);
  assert.ok(winter.seconds-pit.seconds>=2&&winter.seconds-pit.seconds<=5,`starting winter costs ${(winter.seconds-pit.seconds).toFixed(3)} s versus pit`);
}


// Final art controls are visual only and leave the course/seed untouched.
{
  const before=JSON.stringify(course.features),seedControl=new Course(SUMMIT_RUN,1989);
  const snow=createSnowWorld(course),poles=snow.group.getObjectByName('Grounded 50 m snow poles');
  assert.ok(poles?.isInstancedMesh&&poles.count>0,'orange-tip poles are actually constructed');
  const poses=poles.userData.groundPoses;
  assert.ok(poses.every(row=>row.s%50===0&&Math.abs(row.off)===course.roadHalfWidthAt(row.s)+1),'actual poles line both road edges at 50 m stations');
  for(const p of poses){
    const ground=course.groundAt(p.s,p.off);
    assert.equal(p.y,renderedGroundHeight(course,{...ground,s:p.s,off:p.off},{requireSurface:true}),'every pole anchors to actual rendered ground');
  }
  assert.ok(poses.every((p,i)=>i%2===0?poses[i+1].s===p.s&&poses[i+1].off===-p.off:true),'both sides have matching road guidance');
  assert.equal(JSON.stringify(course.features),before,'visual snow never writes physical features');
  assert.equal(course.rng.float(),seedControl.rng.float(),'snow visual controls never consume simulation RNG');
  const branchBase=new THREE.MeshStandardMaterial({color:0xffffff});
  assert.equal(roadBranchMaterial(course,open,branchBase,true),branchBase,'actual clear Open retains the original material with winter on');
  const branch=roadBranchMaterial(course,historicalSnowBranch,branchBase,true);
  assert.equal(branch.color.getHex(),SUMMIT_RUN.snowWorld.branchTone,'historical snow branch retains the authored darker packed-snow tone');
  assert.equal(branchBase.color.getHex(),0xffffff,'branch look leaves shared road material unchanged');
  const ordinary=roadBranchMaterial({def:{snowWorld:{} }},historicalSnowBranch,branchBase,true);
  assert.deepEqual(ordinary.color.toArray(),[.34,.38,.42],'absent branch tone keeps legacy snow values');
  const lightGroup=new THREE.Group(),glows=addNightGlows(lightGroup,course);
  assert.equal(glows.groundLightRows.length,48,'town view owns its forty-eight actual grounded lights');
  for(const row of glows.groundLightRows){
    const point=course.groundAt(row.s,row.lateral),groundY=renderedGroundHeight(course,{...point,s:row.s,off:row.lateral},{requireSurface:true});
    assert.equal(row.groundY,groundY,'town light uses the actual rendered triangle height');
    assert.equal(row.position[1],groundY+.15,'ground lights are anchored rather than floating');
  }
  assert.ok(glows.groundLightRows.every(row=>row.groundY<course.groundAt(course.script.pieces.find(p=>p.name==='The Ledge').s0,0).y),'town actually lies below the Ledge');
  lightGroup.traverse(node=>{node.geometry?.dispose();node.material?.dispose();});
  branch.dispose();ordinary.dispose();branchBase.dispose();snow.dispose();
}

assert.equal(SUMMIT_RUN.snowWorld.always,true,'reviewed Summit winter presentation is always active');
assert.equal(TREMBLANT_SNOW.snowWorld.always,true,'released Snow retains its historical always-on presentation unchanged');
