import * as THREE from 'three';
import meshes from './generated/course-landmarks.json' with { type:'json' };

function landmarkMaterial(name,spec){
  // Blender's neutral studio light is softer than the game's combined sun,
  // hemisphere and HDR sky. Calibrate the exported albedo, not the whole scene.
  const color=new THREE.Color().setRGB(...spec.color);
  const material=new THREE.MeshStandardMaterial({name:`Blender ${name}`,
    color:spec.emission?color:color.clone().multiplyScalar(.55),roughness:spec.roughness,metalness:spec.metalness,
    emissive:spec.emission?color:0,emissiveIntensity:spec.emission,envMapIntensity:.65});
  if(spec.emission||name.includes('glazing')||name.includes('window'))return material;
  const wood=/cedar|timber/.test(name);
  material.customProgramCacheKey=()=>`course-landmark-weathering-v1-${wood?'wood':'stone'}`;
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vLandmark;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nvLandmark=position;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vLandmark;')
      .replace('#include <color_fragment>',`#include <color_fragment>
        float weather=.5+.5*sin(vLandmark.x*3.7+sin(vLandmark.z*2.3)+vLandmark.y*.53);
        float grain=.5+.5*sin(${wood?'vLandmark.x*57.0+sin(vLandmark.y*1.4)*1.7':'vLandmark.x*29.0+vLandmark.y*31.0+sin(vLandmark.z*23.0)'});
        float foot=1.0-smoothstep(.1,1.7,vLandmark.y);
        diffuseColor.rgb*=.83+.10*weather+.07*grain-foot*.12;
      `);
  };
  return material;
}

// These are Blender's evaluated triangles, not a parallel approximation of the
// reference model. Material batching keeps each landmark to a few draws.
export function addCourseLandmarks(group,course){
  for(const placement of course.features.setPieces||[]){
    const model=new THREE.Group();model.name=`Blender landmark: ${placement.setPiece}`;
    model.userData.courseLandmark=placement.setPiece;
    for(const [name,data] of Object.entries(meshes.assets[placement.setPiece])){
      const spec=meshes.materials[name],geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
      geometry.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const material=landmarkMaterial(name,spec);
      const part=new THREE.Mesh(geometry,material);part.castShadow=part.receiveShadow=true;model.add(part);
    }
    model.position.set(placement.x,placement.baseY,placement.z);model.rotation.y=placement.heading;group.add(model);
    const foundation=new THREE.Mesh(new THREE.BoxGeometry(placement.halfX*2,placement.foundationDepth,placement.halfZ*2),
      new THREE.MeshStandardMaterial({name:'landmark terrain foundation',color:0x6b6a60,roughness:.95}));
    foundation.position.set(placement.x,placement.baseY-placement.foundationDepth*.5,placement.z);
    foundation.rotation.y=placement.heading;foundation.receiveShadow=foundation.castShadow=true;group.add(foundation);
  }
}
