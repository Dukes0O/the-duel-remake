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

export function createTerrainMaterial({earth,grass,city,rock=earth,normal,roughness}){
  const material=new THREE.MeshStandardMaterial({map:earth,normalMap:normal,roughnessMap:roughness,normalScale:new THREE.Vector2(.65,.65),roughness:1,vertexColors:true});
  material.name='Slope-aware meadow, scree and soil';
  material.onBeforeCompile=shader=>{
    shader.uniforms.terrainGrass={value:grass};shader.uniforms.terrainCity={value:city};shader.uniforms.terrainRock={value:rock};
    shader.vertexShader=shader.vertexShader.replace('#include <common>',`#include <common>
      attribute vec3 biomeWeights;
      varying vec3 vBiomeWeights;
      varying vec3 vTerrainPosition;
      varying vec3 vTerrainNormal;`).replace('#include <begin_vertex>',`#include <begin_vertex>
      vBiomeWeights=biomeWeights;
      vTerrainPosition=(modelMatrix*vec4(transformed,1.0)).xyz;
      vTerrainNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform sampler2D terrainGrass;
      uniform sampler2D terrainCity;
      uniform sampler2D terrainRock;
      varying vec3 vBiomeWeights;
      varying vec3 vTerrainPosition;
      varying vec3 vTerrainNormal;
      vec4 terrainRockSample(vec3 p,vec3 weights){
        return texture2D(terrainRock,p.zy)*weights.x+texture2D(terrainRock,p.xz)*weights.y+texture2D(terrainRock,p.xy)*weights.z;
      }`).replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec3 weights=max(vBiomeWeights,vec3(0.0));
        weights/=max(dot(weights,vec3(1.0)),0.0001);
        vec4 earthTexel=texture2D(map,vMapUv);
        vec4 grassTexel=texture2D(terrainGrass,vMapUv*(4.0/8.8));
        vec4 cityTexel=texture2D(terrainCity,vMapUv*vec2(1.25/8.8,2.5/8.8));
        // World-sized variations break repeated turf into meadow and dry soil.
        // Both near and far terrain use the same coordinates, including seams.
        vec3 terrainNormal=normalize(vTerrainNormal);
        vec3 rockWeights=pow(abs(terrainNormal),vec3(4.0));
        rockWeights/=max(dot(rockWeights,vec3(1.0)),0.0001);
        vec4 rockTexel=terrainRockSample(vTerrainPosition*.095,rockWeights);
        float meadowPatch=texture2D(terrainGrass,vTerrainPosition.xz*.0073+vec2(.37,.71)).r;
        float longPatch=.5+.5*sin(vTerrainPosition.x*.019+sin(vTerrainPosition.z*.026)*1.4);
        float dryPatch=smoothstep(.10,.33,meadowPatch*.76+longPatch*.24);
        grassTexel.rgb=mix(grassTexel.rgb,earthTexel.rgb*vec3(.70,.72,.57),dryPatch*.34);
        grassTexel.rgb*=.86+meadowPatch*.32;
        // Exposed granite follows actual slope: flat ground stays vegetated.
        float scree=smoothstep(.008,.075,1.0-abs(terrainNormal.y));
        scree*=.58+.42*smoothstep(.08,.28,meadowPatch);
        grassTexel.rgb=mix(grassTexel.rgb,rockTexel.rgb*vec3(.79,.82,.77),scree);
        earthTexel.rgb*=.89+meadowPatch*.25;
        diffuseColor*=earthTexel*weights.x+grassTexel*weights.y+cityTexel*weights.z;
      #endif
    `);
  };
  material.customProgramCacheKey=()=> 'terrain-slope-mosaic-v2';
  return material;
}
