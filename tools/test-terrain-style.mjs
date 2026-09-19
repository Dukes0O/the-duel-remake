import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {terrainStyleAt,createTerrainMaterial} from '../src/terrain-style.js';
import {terrainGeometry} from '../src/world.js';

let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
for(const def of COURSE){
  const course=new Course(def,1989);
  for(const section of course.sections){
    for(const s of [section.start,section.start+50,section.start+100,section.end]){
      const style=terrainStyleAt(course,s);
      check(Math.abs(style.weights.reduce((a,b)=>a+b,0)-1)<1e-9,'Terrain textures keep a normalized brightness');
      check(style.weights.every(w=>w>=0&&w<=1),'Texture blend has valid proportions');
    }
    const a=terrainStyleAt(course,section.start-.001),b=terrainStyleAt(course,section.start+.001);
    check(a.weights.every((value,index)=>Math.abs(value-b.weights[index])<1e-6),'No texture jump across an environment boundary or lap seam');
    check(['r','g','b'].every(axis=>Math.abs(a.color[axis]-b.color[axis])<1e-6),'No colour jump across an environment boundary or lap seam');
  }
  const geometry=terrainGeometry(course,false),weights=geometry.attributes.biomeWeights;
  check(weights.count===geometry.attributes.position.count,'Every rendered terrain vertex has blend weights');
  for(let i=0;i<weights.count;i+=29){
    check(Math.abs(weights.getX(i)+weights.getY(i)+weights.getZ(i)-1)<1e-6,'Rendered interpolation remains normalized');
  }
  geometry.dispose();
}
const textures=Object.fromEntries(['earth','grass','city','rock','normal','roughness'].map(name=>[name,new THREE.Texture()]));
const material=createTerrainMaterial(textures),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};
material.onBeforeCompile(shader);
check(shader.uniforms.terrainRock.value===textures.rock&&shader.uniforms.terrainGrass.value===textures.grass,'Existing source textures are reused without clones');
check(material.map===textures.earth&&material.normalMap===textures.normal&&material.roughnessMap===textures.roughness,'Existing material maps stay available to render readiness and disposal');
check(shader.vertexShader.includes('modelMatrix*vec4(transformed,1.0)')&&shader.vertexShader.includes('inverseTransformDirection(transformedNormal,viewMatrix)'),'Slope detail is evaluated in shared world space');
check(shader.fragmentShader.includes('terrainRockSample(vTerrainPosition')&&!shader.fragmentShader.includes('#include <map_fragment>'),'Slope textures replace the repeated terrain map path');
check(shader.fragmentShader.includes('cityTexel*weights.z'),'City surfaces retain their existing layer without meadow overlays');
material.dispose();Object.values(textures).forEach(texture=>texture.dispose());
console.log(`Terrain style: ${checks} continuous biome, rendered vertex and material checks passed.`);
