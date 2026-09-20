import * as THREE from 'three';
import { buildMountainSurface, mountainPlacement } from './mountain-surface.js';

export function buildMountainGeometry(variant=0) {
  const {positions,uv,indices,rimStart}=buildMountainSurface(variant);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));geometry.setIndex(new THREE.BufferAttribute(indices,1));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  geometry.name=`Connected ridge massif ${variant+1}`;geometry.userData.mountainVariant=variant;geometry.userData.rimStart=rimStart;
  return geometry;
}
export {mountainVisualHeight} from './mountain-surface.js';
export function mountainTransform(course,mountain) {
  const p=mountainPlacement(course,mountain);
  return new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.heading),new THREE.Vector3(p.sx,p.sy,p.sz));
}

const textureCache=new Map();
export function rockTexture(theme) {
  const name=theme==='desert'?'red-sandstone':'granite-cliff';
  if(!textureCache.has(name)){
    const texture=new THREE.TextureLoader().load(`/assets/textures/${name}.png`);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.anisotropy=8;texture.userData.sharedAsset=true;textureCache.set(name,texture);
  }
  return textureCache.get(name);
}

export function createMountainMaterial(theme,texture) {
  const material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:.24,roughness:.96,color:theme==='desert'?0xe0cabb:theme==='coast'?0xb9bdad:0xbac2c5});
  material.name=`World mapped ${theme} rock`;
  material.customProgramCacheKey=()=>`connected-mountain-v2-${theme}`;
  material.onBeforeCompile=shader=>{
    shader.uniforms.mountainSnow={value:theme==='alpine'?1:0};
    shader.uniforms.mountainMoss={value:theme==='coast'?1:0};
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vMountainPosition;\nvarying vec3 vMountainNormal;\nvarying float vMountainHeight;');
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec4 mountainPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        mountainPosition=instanceMatrix*mountainPosition;
      #endif
      vMountainPosition=(modelMatrix*mountainPosition).xyz;
      vMountainNormal=inverseTransformDirection(transformedNormal,viewMatrix);
      vMountainHeight=position.y;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>',`#include <common>
      uniform float mountainSnow;
      uniform float mountainMoss;
      varying vec3 vMountainPosition;
      varying vec3 vMountainNormal;
      varying float vMountainHeight;
      vec4 mountainSample(sampler2D tex,vec3 p,vec3 weights){
        return texture2D(tex,p.zy)*weights.x+texture2D(tex,p.xz)*weights.y+texture2D(tex,p.xy)*weights.z;
      }`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 mountainNormal=normalize(vMountainNormal);
      vec3 mountainWeights=pow(abs(mountainNormal),vec3(4.0));
      mountainWeights/=max(dot(mountainWeights,vec3(1.0)),0.0001);
      vec4 mountainRock=mountainSample(map,vMountainPosition*.095,mountainWeights);
      vec4 mountainLarge=mountainSample(map,vMountainPosition*.013+vec3(.27,.51,.13),mountainWeights);
      float mountainVariation=.69+.83*mountainLarge.r;
      diffuseColor*=vec4(mountainRock.rgb*mountainVariation,1.0);
      float moss=mountainMoss*(1.0-smoothstep(.12,.43,vMountainHeight))*smoothstep(.42,.85,mountainNormal.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.67,.79,.46),moss*.7);
      float mountainSnowLine=vMountainHeight+.042*sin(vMountainPosition.x*.071+vMountainPosition.z*.054)+.035*(mountainRock.r-.5);
      float snow=mountainSnow*smoothstep(.54,.81,mountainSnowLine)*smoothstep(.24,.73,mountainNormal.y);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.83,.88,.91),snow*.95);
      float mountainBump=bumpScale*dot(mountainRock.rgb,vec3(.3333))*(1.0-snow*.86);`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(mountainBump),dFdy(mountainBump)),faceDirection);`);
  };
  return material;
}

export function addMountainLandscape(group,course) {
  if(!course.features.mountains.length)return;
  const theme=course.def.theme,material=createMountainMaterial(theme,rockTexture(theme));
  for(let variant=0;variant<4;variant++){
    const features=course.features.mountains.filter((_,index)=>index%4===variant);if(!features.length)continue;
    const mesh=new THREE.InstancedMesh(buildMountainGeometry(variant),material,features.length);mesh.name=`${theme} ridge range ${variant+1}`;
    features.forEach((mountain,index)=>mesh.setMatrixAt(index,mountainTransform(course,mountain)));
    mesh.receiveShadow=true;mesh.userData.mountainFeatures=features;mesh.computeBoundingSphere();group.add(mesh);
  }
}
