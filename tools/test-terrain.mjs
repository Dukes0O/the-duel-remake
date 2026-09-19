import assert from 'node:assert/strict';
import {terrainGeometry as buildNear,farTerrainGeometry as buildFar} from '../src/world.js';
import * as THREE from 'three';
import {buildMountainGeometry,mountainTransform,mountainVisualHeight} from '../src/mountain-landscape.js';
import { Course } from '../src/course.js';
import { Duel } from '../src/game.js';
import { COURSE, DRIVE, LIVES } from '../src/config.js';

// Targeted terrain contracts: actual station footprints, accessible coastal
// headlands, water recovery, and mountain rims versus the far terrain surface.
let checks = 0, worstStationError = 0, highestMountainRim = -Infinity;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const transform = (origin, x, z) => ({
  x: origin.x + Math.cos(origin.heading) * x + Math.sin(origin.heading) * z,
  z: origin.z - Math.sin(origin.heading) * x + Math.cos(origin.heading) * z,
});

function groundAtWorld(course, point) {
  const nearest = course.nearest(point.x, point.z);
  return course.groundAt(nearest.s, nearest.lateral).y;
}

// Exercise the production mesh builders. The lookup reads their float32
// vertices and actual index buffer, so omitted near-road quads are not terrain.
const mountainGeometries=Array.from({length:4},(_,i)=>buildMountainGeometry(i));
let farRimSamples=0,nearRimSamples=0,omittedQueries=0;const exposed=[];
function farGroundSampler(course) {
  const geometry=buildFar(course,false),p=geometry.attributes.position,index=geometry.index;
  geometry.computeBoundingBox();const box=geometry.boundingBox,grid=p.getX(1)-p.getX(0),columns=Math.round((box.max.x-box.min.x)/grid)+1,rows=p.count/columns,renderedQuads=new Set();
  check(grid===((course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena?16:32),'far-grid resolution matches the scene');
  for(let i=0;i<index.count;i+=6){const a=index.getX(i);renderedQuads.add(a);check(index.getX(i+1)===a+columns&&index.getX(i+2)===a+1&&index.getX(i+3)===a+1&&index.getX(i+4)===a+columns&&index.getX(i+5)===a+columns+1,'actual far-grid triangle diagonal');}
  const height=point=>{
    const i=Math.floor((point.x-box.min.x)/grid),j=Math.floor((point.z-box.min.z)/grid),a=j*columns+i;
    if(i<0||j<0||i>=columns-1||j>=rows-1||!renderedQuads.has(a))return null;
    const u=(point.x-p.getX(a))/grid,v=(point.z-p.getZ(a))/grid;
    // Actual triangles: [top-left,bottom-left,top-right], then
    // [top-right,bottom-left,bottom-right]. Bilinear interpolation is different.
    const tl=p.getY(a),tr=p.getY(a+1),bl=p.getY(a+columns),br=p.getY(a+columns+1);
    return u+v<=1?tl*(1-u-v)+tr*u+bl*v:tr*(1-v)+bl*(1-u)+br*(u+v-1);
  };
  const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0);let near;
  const sample=point=>{const far=height(point);if(far!==null){farRimSamples++;return far;}omittedQueries++;near??=new THREE.Mesh(buildNear(course,false),material);ray.set(new THREE.Vector3(point.x,2000,point.z),down);const hit=ray.intersectObject(near,false)[0];if(hit)nearRimSamples++;return hit?.point.y??null;};
  const nearest=course.at(0);check(height(nearest)===null,'omitted road-center quad is not a rendered far surface');
  sample.dispose=()=>{geometry.dispose();near?.geometry.dispose();material.dispose();};return sample;
}

for (const seed of [1989, 42, 17, 9999]) {
  for (const definition of COURSE) {
    const course = new Course(definition, seed);
    for (const station of course.features.stations) {
      const structures = course.features.obstacles.filter(obstacle => obstacle.id.startsWith(`${station.id}-`));
      for (const structure of structures) {
        for (const [x, z] of [[0, 0], [-structure.halfX, -structure.halfZ], [structure.halfX, -structure.halfZ], [-structure.halfX, structure.halfZ], [structure.halfX, structure.halfZ]]) {
          const error = Math.abs(groundAtWorld(course, transform(structure, x, z)) - station.y);
          worstStationError = Math.max(worstStationError, error);
          check(error < .02, `${definition.name}/${seed}/${structure.id}: structure foundation is not level with its service yard (${error.toFixed(3)}m)`);
        }
      }
    }

    if (course.sections.some(section=>section.theme==='coast')) {
      check(course.features.landmarks.length === course.sections.filter(section=>section.theme==='coast').length, `Coast/${seed}: each coast section has a lighthouse headland`);
      for (const tower of course.features.landmarks) {
        check(tower.y > -14, `Coast/${seed}/${tower.id}: lighthouse base is above the sea boundary`);
        check(Math.abs(groundAtWorld(course, tower) - tower.y) < .02, `Coast/${seed}/${tower.id}: lighthouse base matches the headland`);
        check(tower.y + tower.height > course.at(tower.s).y + 10, `Coast/${seed}/${tower.id}: lighthouse extends visibly above road height`);
      }
      check(course.features.trees.every(tree => tree.y >= -13), `Coast/${seed}: no tree roots are under water`);

      const duel = new Duel({ seed }); duel.startCampaign({ startStage: COURSE.indexOf(definition) });
      const state = duel.state; state.status = 'racing'; state.traffic = []; state.rival = null;
      const coast=course.sections.find(section=>section.theme==='coast');
      state.s=coast.start+(coast.end-coast.start)*.3;state.speedMph = 65; state.lateral = 20;
      duel._boundary(state); check(state.lateral === 20, `Coast/${seed}: open dry dirt stays drivable`);
      const waterThresholds=s=>{
        // Isolate the water boundary from a shortcut's narrower recovery
        // shoulder; that branch contract has separate driving coverage.
        if(duel.course.features.shortcuts.some(cut=>s>=cut.start&&s<=cut.end))return{};
        let warning,water;
        for(let lateral=29;lateral<78;lateral+=.25){
          const height=duel.course.groundAt(s,lateral).y;
          if(warning==null&&height<-10&&height>=-14)warning=lateral;
          if(water==null&&height<-14)water=lateral;
        }
        return{warning,water};
      };
      let {warning,water}=waterThresholds(state.s);
      // A high coastal road can stay above the sea all the way to the lateral boundary.
      // Both thresholds must come from the same shore transect. Retaining a
      // warning offset from the first hill after moving to a lower coast point
      // could put the warning fixture straight into the water.
      if(water==null||warning==null)for(let sample=coast.start+100;sample<coast.end-100;sample+=40){
        const thresholds=waterThresholds(sample);
        if(thresholds.warning!=null&&thresholds.water!=null){state.s=sample;({warning,water}=thresholds);break;}
      }
      check(warning != null && water != null, `${definition.id}/${seed}: sea approach has both warning and recovery thresholds`);
      // This fixture starts mid-lap: preceding gates have already been driven.
      // Keep the original coast position when testing both actors, because a
      // valid recovery may move back to clear another car or a pending gate.
      const waterApproachS = state.s;
      state.nextLapGate = duel._lapGates.filter(gate => gate < waterApproachS).length;
      state.lateral = warning; duel._boundary(state);
      check(state.boundaryWarning && state.boundaryResets === 0, `${definition.id}/${seed}: water warning precedes recovery`);
      state.lateral = water; duel._boundary(state);
      check(Math.abs(state.lateral) < DRIVE.roadHalfWidth && state.boundaryResets === 1, `Coast/${seed}: player recovers before entering the sea`);
      check(state.s <= waterApproachS && duel.course.groundAt(state.s,state.lateral).y > -14, `Coast/${seed}: player recovery is dry and cannot advance progress`);
      check(state.lives === LIVES.start && state.majorCrashes === 0 && state.penaltySec === 0, `Coast/${seed}: sea recovery does not damage or penalize the player`);
      const rival = state.rival = { s: waterApproachS, lateral: water, speedMph: 70, headingError: 0, pushVelocity: 0,
        completedLaps: 0, nextLapGate: duel._lapGates.filter(gate => gate < waterApproachS).length };
      duel._boundary(rival);
      check(Math.abs(rival.lateral) < DRIVE.roadHalfWidth && rival.speedMph <= 28, `Coast/${seed}: rival also recovers before entering the sea`);
      check(rival.s <= waterApproachS && duel.course.groundAt(rival.s,rival.lateral).y > -14, `Coast/${seed}: rival recovery is dry and cannot advance progress`);
    }

    const ground=farGroundSampler(course),themeCounts=new Map();
    for(const mountain of course.features.mountains){
      const variant=themeCounts.get(mountain.theme)||0;themeCounts.set(mountain.theme,variant+1);
      const mesh=mountainGeometries[variant%4],positions=mesh.attributes.position,matrix=mountainTransform(course,mountain),point=new THREE.Vector3(),next=new THREE.Vector3();
      let highestRim=-Infinity;
      for(let i=mesh.userData.rimStart;i<positions.count;i++){
        point.fromBufferAttribute(positions,i).applyMatrix4(matrix);next.fromBufferAttribute(positions,i===positions.count-1?mesh.userData.rimStart:i+1).applyMatrix4(matrix);
        for(const fraction of [0,.25,.5,.75]){
          const rim=point.clone().lerp(next,fraction),surface=ground(rim);
          check(surface!==null,`${definition.name}/${seed}/${mountain.id}: rim has no rendered near or far terrain below it`);
          highestRim=Math.max(highestRim,rim.y-surface);
        }
      }
      highestMountainRim=Math.max(highestMountainRim,highestRim);
      if(highestRim>=-.5)exposed.push({course:definition.name,seed,id:mountain.id,height:highestRim});
      point.set(0,1,0).applyMatrix4(matrix);check(Math.abs(point.y-(mountain.y+mountainVisualHeight(mountain)))<1e-6,'burial preserves the intended capped summit elevation');
    }
    ground.dispose();
  }
}

if(exposed.length)console.error('Exposed rims:',exposed);
check(!exposed.length,'all actual mountain rims must sit below rendered triangles');
check(farRimSamples>0&&nearRimSamples>0&&nearRimSamples===omittedQueries,'exercise actual far triangles and near-strip coverage of omitted quads');
console.log(`Terrain checks: ${checks} passed across ${COURSE.length} circuits and four seeds.`);
console.log(`Station foundation error: ${worstStationError.toFixed(4)}m maximum.`);
console.log(`Mountain rim clearance: ${(-highestMountainRim).toFixed(2)}m minimum burial.`);
console.log(`Rendered rim queries: ${farRimSamples} far triangles, ${nearRimSamples} near-strip hits from ${omittedQueries} omitted far quads.`);
