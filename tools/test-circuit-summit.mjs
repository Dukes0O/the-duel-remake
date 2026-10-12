import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { SUMMIT_RUN, SUMMIT_GALLERY_BOUNDS } from '../src/circuits/summit-run.js';
import { TREMBLANT_SNOW } from '../src/circuits/tremblant-snow.js';
import { buildTrackScript } from '../src/track-script.js';
import * as THREE from 'three';
import {roadBranchMaterial} from '../src/world.js';
import {constrainTunnelCamera} from '../src/camera-clearance.js';
import {applySnowTerrain,winterWeight,snowPineIds,winterLightingSettings} from '../src/snow-world.js';
import {sampleCourseLightPath} from '../src/light-path.js';
import {circuitLighting,resolveLightingSettings} from '../src/lighting-moods.js';
import {Duel} from '../src/game.js';
import {COURSE,DRIVE,steeringYawAuthority} from '../src/config.js';
import {App} from '../src/app.js';
import {createFeatureFlags} from '../src/feature-flags.js';
import {PIT} from '../src/pit-lane.js';
import {useRacingLine} from './track-script-drive.mjs';
import { Course } from '../src/course.js';

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
  const xLocal=(accessor.min[0]+accessor.max[0])*.5*row.scale[0],zLocal=(accessor.min[2]+accessor.max[2])*.5*row.scale[2];
  const x=frame.x+Math.cos(frame.heading)*xLocal+Math.sin(frame.heading)*zLocal;
  const z=frame.z-Math.sin(frame.heading)*xLocal+Math.cos(frame.heading)*zLocal;
  assert.ok(Math.hypot(actor.x-x,actor.z-z)<1e-8,'actual post/roof position follows the displayed tile transform');
  assert.equal(actor.minY,frame.y+accessor.min[1]*row.scale[1]);
  assert.equal(actor.height,(accessor.max[1]-accessor.min[1])*row.scale[1]);
  if(bounds.name.includes('pillar'))assert.ok(Math.abs(zLocal)>7,'visible pillars are at the tile ends, not the old centre collider');
}
const actualRoof=SUMMIT_GALLERY_BOUNDS.find(bounds=>bounds.name==='gallery-heavy-concrete-roof');
assert.equal(course.features.tunnels[0].height,actualRoof.min[1]*1.1,'camera underside agrees with the actual thick fascia');
assert.ok(actualRoof.min[1]*1.1>=4.5,'approved road headroom stays at least 4.5 m');
assert.ok(!course.features.walls.some(wall=>wall.id.startsWith('gallery-')),'actual kit colliders do not draw substitute wall boxes');

const open=course.features.shortcuts.find(branch=>branch.id==='summit-open-road');
assert.equal(course.surfaceAt(10500,course.shortcutOffset(open,10500)).road,true,'the Open Road is real driveable road');
assert.equal(course.gripKindAt(10500,course.shortcutOffset(open,10500)),'snow','branch road uses the native snow surface');
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
const beforeLight=structuredClone(baseLight);
const edgeLight=winterLightingSettings(baseLight,{course,distance:SUMMIT_RUN.snowWorld.ranges[0].from+6});
assert.ok(edgeLight.exposure<baseLight.exposure&&edgeLight.exposure>winterLightingSettings(baseLight).exposure);
assert.deepEqual(baseLight,beforeLight,'winter blending does not change the source palette');
const asphalt=new THREE.MeshStandardMaterial({color:0x222222,roughness:.6});
assert.equal(roadBranchMaterial(course,open,asphalt,false),asphalt,'dry branch retains original material');
const snowMaterial=roadBranchMaterial(course,open,asphalt,true);
assert.notEqual(snowMaterial,asphalt);
assert.deepEqual(snowMaterial.color.toArray(),[.34,.38,.42]);
assert.equal(snowMaterial.roughness,.94);
assert.equal(asphalt.roughness,.6,'branch winter material never changes shared asphalt');
snowMaterial.dispose();asphalt.dispose();
assert.equal(course.tunnelAt(10500,0)?.id,'summit-gallery');
assert.equal(course.tunnelAt(10500,7.7)?.id,'summit-gallery','roof covers the roadside camera too');
assert.equal(course.tunnelAt(10500,course.shortcutOffset(open,10500)),null,'Open Road is outside the Gallery');
const roofCamera=course.worldAt(10500,7.7);roofCamera.y+=10;
assert.equal(constrainTunnelCamera(course,roofCamera,10500),true);
assert.ok(Math.abs(roofCamera.y-(course.groundAt(10500,0).y+actualRoof.min[1]*1.1-.45))<1e-6);
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
          const authority=Math.max(.05,steeringYawAuthority(state.speedMph,duel.car.grip,surface.traction,duel.car));
          const remaining=lane.box-state.s;
          const stop=Math.sqrt(2*DRIVE.brakeAccel*duel.car.braking*DRIVE.mphToWorld*Math.max(0,remaining-2))/DRIVE.mphToWorld;
          const target=state.tyre==='winter'?PIT.limitMph:Math.min(PIT.limitMph,stop);
          duel.setInput({throttle:state.speedMph<target?1:0,brake:state.speedMph>target?Math.min(1,(state.speedMph-target)/6):0,steer:Math.max(-1,Math.min(1,-yaw/authority)),boost:false});
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
  assert.ok(pit.seconds>=360&&pit.seconds<=480,`Medium mid-car run is ${pit.seconds.toFixed(3)} s`);
  assert.ok(summer.seconds-pit.seconds>=4&&summer.seconds-pit.seconds<=8,`pit saves ${(summer.seconds-pit.seconds).toFixed(3)} s versus summer`);
  assert.ok(winter.seconds-pit.seconds>=2&&winter.seconds-pit.seconds<=5,`starting winter costs ${(winter.seconds-pit.seconds).toFixed(3)} s versus pit`);
}
