import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createAtmosphericSky} from '../src/atmosphere.js';
import {createDrivingEffects} from '../src/effects.js';
import {createExplosion} from '../src/explosion.js';
import {loadHeroVehicle} from '../src/hero-vehicle.js';
import {disposeTree} from '../src/world.js';

// Inspect actual custom material instances. Standard Three materials already
// supply these chunks; our own fragments must handle direct canvas output too.
const originalTextureLoad=THREE.TextureLoader.prototype.load,originalModelLoad=GLTFLoader.prototype.loadAsync;
const source=new THREE.Group(),sourceMaterial=new THREE.MeshStandardMaterial();sourceMaterial.name='Paint 1';
source.add(new THREE.Mesh(new THREE.BoxGeometry(2,1,4),sourceMaterial));
let atmosphere,effects,explosion,vehicle;
try{
  THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
  GLTFLoader.prototype.loadAsync=async()=>({scene:source});
  atmosphere=createAtmosphericSky();effects=createDrivingEffects();explosion=createExplosion();
  vehicle=(await loadHeroVehicle())({color:0xffffff,kind:'sport'});
  const shaders=[];
  for(const [label,root]of [['sky',atmosphere.sky],['driving effects',effects.group],['explosion',explosion.group],['licensed vehicle',vehicle]]){
    root.traverse(object=>{
      if(!object.material?.isShaderMaterial)return;
      shaders.push(object.material);
      const fragment=object.material.fragmentShader,assignment=fragment.lastIndexOf('gl_FragColor='),tone=fragment.indexOf('#include <tonemapping_fragment>'),colour=fragment.indexOf('#include <colorspace_fragment>');
      assert.ok(assignment>=0&&tone>assignment&&colour>tone,`${label}: tone mapping and sRGB conversion follow linear colour output`);
      assert.equal(fragment.match(/#include <tonemapping_fragment>/g)?.length,1,`${label}: one tone transform`);
      assert.equal(fragment.match(/#include <colorspace_fragment>/g)?.length,1,`${label}: one colour transform`);
      assert.equal(object.material.toneMapped,true,`${label}: direct renderer tone mapping is enabled`);
    });
  }
  assert.equal(shaders.length,5,'Sky, dust, tire marks, explosion and contact shadow all retain display transforms');
}finally{
  THREE.TextureLoader.prototype.load=originalTextureLoad;GLTFLoader.prototype.loadAsync=originalModelLoad;
  if(atmosphere){atmosphere.dispose();disposeTree(atmosphere.sky);}
  effects?.dispose();explosion?.dispose();if(vehicle)disposeTree(vehicle);
  sourceMaterial.dispose();
}
console.log('Direct colour output: all five custom fragment shaders apply tone mapping and sRGB conversion once.');
