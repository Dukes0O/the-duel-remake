import * as THREE from 'three';

const TINTS={desert:'#d7c6ac',alpine:'#b7cbb3',coast:'#c0c7a2',city:'#929899',arena:'#ba9873'};
const LAYERS={desert:0,arena:0,alpine:1,coast:1,city:2};
const smooth=value=>{const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};

// The same 100 m transition used by the terrain relief carries across the
// finish line, so both colour and texture remain continuous between laps.
export function terrainStyleAt(course,s){
  const phase=course.phase(s),section=course.sectionAt(phase),index=course.sections.indexOf(section);
  const previous=course.sections[(index-1+course.sections.length)%course.sections.length];
  const blend=smooth((phase-section.start)/100),weights=[0,0,0];
  weights[LAYERS[previous.theme]??0]+=1-blend;
  weights[LAYERS[section.theme]??0]+=blend;
  return{weights,color:new THREE.Color(TINTS[previous.theme]||TINTS.desert).lerp(new THREE.Color(TINTS[section.theme]||TINTS.desert),blend)};
}

export function createTerrainMaterial({earth,grass,city,normal,roughness}){
  const material=new THREE.MeshStandardMaterial({map:earth,normalMap:normal,roughnessMap:roughness,normalScale:new THREE.Vector2(.65,.65),roughness:1,vertexColors:true});
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainGrass={value:grass};shader.uniforms.terrainCity={value:city};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nattribute vec3 biomeWeights;\nvarying vec3 vBiomeWeights;').replace('#include <begin_vertex>','#include <begin_vertex>\nvBiomeWeights=biomeWeights;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D terrainGrass;\nuniform sampler2D terrainCity;\nvarying vec3 vBiomeWeights;').replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec3 weights=max(vBiomeWeights,vec3(0.0));
        weights/=max(dot(weights,vec3(1.0)),0.0001);
        vec4 earthTexel=texture2D(map,vMapUv);
        vec4 grassTexel=texture2D(terrainGrass,vMapUv*(4.0/8.8));
        vec4 cityTexel=texture2D(terrainCity,vMapUv*vec2(1.25/8.8,2.5/8.8));
        diffuseColor*=earthTexel*weights.x+grassTexel*weights.y+cityTexel*weights.z;
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'terrain-biome-blend-v1';
  return material;
}
