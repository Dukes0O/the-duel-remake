// The Everburn's fire and smoke, drawn in code (SCABLANDS-LAND round 3). The well burns all the time, as the model's own
// flame did: three tongues of fire on the top of the derrick, firelight on the ground round its foot, a few sparks, and a
// column of smoke puffs that rises to about 90 m and leans one way with a fixed wind, so that the well is still the
// landmark seen from the other places. It is made the way the furnace's fire is (src/world/scrap-look.js materials, puffs
// placed from the clock in `animate`); nothing here reads or changes race or job state.
import * as THREE from 'three';
import {createFlameMaterial,createSmokeMaterial,createGroundGlowMaterial,createSparks} from './scrap-look.js';

// The derrick's top above the ground at the well, read from everburn.glb (`everburn-flare-stack` ends 8.25 m up).
export const EVERBURN_DERRICK_TOP=8.25;
// Flames: where each stands across the derrick (x), its width and its height in metres (5 to 7 m tall).
const TONGUES=Object.freeze([{x:-.35,z:0,w:3.4,h:7},{x:.4,z:.25,w:2.8,h:6},{x:0,z:-.3,w:2.4,h:5}]);
const PUFFS=16,COLUMN_METRES=82,WIND=Object.freeze({x:22,z:9}),CYCLE_SECONDS=15;

export function createEverburnFire(){
  const group=new THREE.Group();group.name='Everburn fire and smoke';
  const flame=createFlameMaterial(),soot=createSmokeMaterial(0x3a342e),card=new THREE.PlaneGeometry(1,1);
  const standing=new THREE.PlaneGeometry(1,1);standing.translate(0,.5,0);
  // Firelight on the sand round the derrick's foot.
  const glowMaterial=createGroundGlowMaterial(),glow=new THREE.Mesh(card,glowMaterial);
  glow.name='Firelight on the ground at the Everburn';glow.rotation.x=-Math.PI/2;glow.position.set(0,.14,0);glow.scale.setScalar(30);glow.renderOrder=1;
  group.add(glow);
  const tongues=TONGUES.map((spot,index)=>{
    const tongue=new THREE.Mesh(standing,flame);tongue.name='Fire on the Everburn derrick';
    tongue.position.set(spot.x,EVERBURN_DERRICK_TOP,spot.z);tongue.scale.set(spot.w,spot.h,1);tongue.renderOrder=3;tongue.frustumCulled=false;
    tongue.onBeforeRender=()=>{flame.uniforms.uSeed.value=index*.43;flame.uniformsNeedUpdate=true;};
    group.add(tongue);return tongue;
  });
  const sparks=createSparks(26);sparks.name='Sparks from the Everburn';group.add(sparks);
  const smoke=[];
  for(let index=0;index<PUFFS;index++){
    const cloud=new THREE.Mesh(card,soot);cloud.name='Everburn smoke';cloud.userData.fade=0;cloud.renderOrder=2;cloud.frustumCulled=false;
    cloud.onBeforeRender=()=>{soot.uniforms.uFade.value=cloud.userData.fade;soot.uniforms.uSeed.value=index*.19;soot.uniformsNeedUpdate=true;};
    group.add(cloud);smoke.push(cloud);
  }
  return {group,tongues,smoke,sparks,glow,
    // `seconds` is the scene clock. The column is placed from it, so nothing is kept between frames.
    animate(seconds){
      flame.uniforms.uTime.value=seconds;glowMaterial.uniforms.uTime.value=seconds;
      tongues.forEach((tongue,index)=>{tongue.scale.y=TONGUES[index].h*(.86+.2*Math.abs(Math.sin(seconds*4.7+index*2.1)));});
      sparks.userData.place(seconds,{x:0,y:EVERBURN_DERRICK_TOP+.4,z:0},{x:.7,z:.3},WIND.x*.1);
      smoke.forEach((puff,index)=>{
        const age=(seconds/CYCLE_SECONDS+index/PUFFS)%1;
        // The column leans downwind more the higher it climbs and wobbles a little.
        puff.position.set(WIND.x*age*age+Math.sin(seconds*.3+index*2.1)*1.2*age,EVERBURN_DERRICK_TOP+3+age*COLUMN_METRES,
          WIND.z*age*age+Math.cos(seconds*.26+index*1.7)*1.2*age);
        puff.scale.setScalar(5+age*21);
        puff.userData.fade=Math.min(1,age/.04)*Math.pow(1-age,.9)*.95;
      });
    }};
}
