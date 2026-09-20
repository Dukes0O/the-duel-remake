import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { renderedGroundHeight } from './rendered-ground.js';

export const VEGETATION_CELL_SIZE = 200;

// Keep source indices stable: cactus shape, height and tint must not change
// when a cell boundary splits the original feature list.
export function vegetationCells(features, size = VEGETATION_CELL_SIZE) {
  const cells = new Map();
  features.forEach((feature, index) => {
    const key = `${Math.floor(feature.x / size)}:${Math.floor(feature.z / size)}`;
    if (!cells.has(key)) cells.set(key, { key, entries: [] });
    cells.get(key).entries.push({ feature, index });
  });
  return [...cells.values()];
}

export function finishVegetationCell(mesh, key, entries) {
  mesh.castShadow = mesh.receiveShadow = true;
  // Bounds include the full transformed crown/arms, not just feature centers.
  // The small padding avoids clipping foliage on a numerical frustum boundary.
  mesh.computeBoundingBox(); mesh.boundingBox.expandByScalar(.02);
  mesh.computeBoundingSphere(); mesh.boundingSphere.radius += .02;
  mesh.userData.vegetationCell = { key, size: VEGETATION_CELL_SIZE, entries };
  return mesh;
}

export function addPineTrees(group, trees, course) {
  if (!trees.length) return;
  const assets = pineTreeAssets(), object = new THREE.Object3D();
  for (const { key, entries } of vegetationCells(trees)) {
    const trunks = new THREE.InstancedMesh(assets.trunk, assets.bark, entries.length);
    const leaves = new THREE.InstancedMesh(assets.crown, assets.needles, entries.length);
    trunks.name = `Pine trunks ${key}`; leaves.name = `Pine crowns ${key}`;
    entries.forEach(({ feature: tree }, i) => {
      const groundY=course?.def.expansion?renderedGroundHeight(course,tree):tree.y;
      object.position.set(tree.x, groundY - .24, tree.z); object.rotation.set(0, tree.heading, 0); object.scale.setScalar(tree.scale); object.updateMatrix();
      trunks.setMatrixAt(i, object.matrix); leaves.setMatrixAt(i, object.matrix);
    });
    group.add(finishVegetationCell(trunks, key, entries), finishVegetationCell(leaves, key, entries));
  }
}

// Image-generated needle sprays form a full radial crown; roots are placed by
// course.groundAt so the same terrain surface supports every tree.
export function pineTreeAssets() {
  const parts=[];
  for(let tier=0;tier<12;tier++)for(let arm=0;arm<9;arm++){
    const reach=(2.65-tier*.205)*(1+.19*Math.sin(arm*4.1+tier*1.7)),angle=arm*Math.PI*2/9+tier*.81+.17*Math.sin(arm*3.1+tier);
    for(const tilt of [0,1.57,.8]){
      const g=new THREE.PlaneGeometry(reach,reach*.68);
      g.translate(reach*.46,0,0);g.rotateX(-Math.PI/2+tilt);g.rotateZ(-.12);
      g.rotateY(angle);g.translate(0,1.05+tier*.43+.09*Math.sin(arm*3+tier),0);parts.push(g);
    }
  }
  const crown=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  const map=new THREE.TextureLoader().load('/assets/textures/pine-bough.png');
  map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const barkMap=new THREE.TextureLoader().load('/assets/textures/pine-bark.png');
  barkMap.colorSpace=THREE.SRGBColorSpace;barkMap.wrapS=barkMap.wrapT=THREE.RepeatWrapping;barkMap.repeat.set(1,3);barkMap.anisotropy=8;
  const needles=new THREE.MeshStandardMaterial({map,color:0x91b69b,roughness:.95,alphaTest:.48,side:THREE.DoubleSide});
  needles.onBeforeCompile=shader=>{
    shader.uniforms.pineCrownBias={value:.82};shader.uniforms.pineLowerShade={value:.80};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nuniform float pineCrownBias;\nvarying float vPineHeight;')
      .replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
vPineHeight=clamp(position.y/5.9,0.0,1.0);
vec3 pineCrownNormal=normalize(vec3(position.x*.55,.75+vPineHeight*.35,position.z*.55));
objectNormal=normalize(mix(objectNormal,pineCrownNormal,pineCrownBias));`);
    // Smooth radial foliage lighting retains the crown's volume. Three's
    // normal transform still handles each tree, and both card faces receive
    // the same lighting rather than flashing pale on their reverse side.
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>','#include <common>\nuniform float pineLowerShade;\nvarying float vPineHeight;')
      .replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=mix(pineLowerShade,1.0,smoothstep(.1,.8,vPineHeight));')
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
#if defined(DOUBLE_SIDED) && !defined(FLAT_SHADED)
normal*=faceDirection;
nonPerturbedNormal=normal;
#endif`);
  };
  return {
    trunk:new THREE.CylinderGeometry(.06,.23,5.9,9).translate(0,2.95,0),
    crown,
    bark:new THREE.MeshStandardMaterial({map:barkMap,bumpMap:barkMap,bumpScale:.025,color:0xc8c5be,roughness:1}),
    needles,
  };
}

// One reusable mesh per species: rounded saguaro arms and irregular pine tiers.
export function vegetationGeometry(alpine) {
  const pieces = [];
  function add(g, color) {
    const a = g.attributes.position, colors = [], c = new THREE.Color(color);
    for (let i = 0; i < a.count; i++) {
      const shade = .79 + .18 * Math.sin(a.getX(i) * 29 + a.getY(i) * 17 + a.getZ(i) * 31);
      colors.push(c.r * shade, c.g * shade, c.b * shade);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); pieces.push(g);
  }
  if (alpine) {
    add(new THREE.CylinderGeometry(.065, .16, 5.3, 7).translate(0, 2.65, 0), 0x695840);
    for (let layer = 0; layer < 6; layer++) {
      const radius = 1.55 - layer * .22, h = 1.65 - layer * .10;
      const g = new THREE.ConeGeometry(radius, h, 14, 2);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
        const scallop = 1 + .2 * Math.sin(a * 7 + layer * 2.1);
        p.setXYZ(i, x * scallop, p.getY(i) + Math.sin(a * 7) * .12, z * scallop);
      }
      g.computeVertexNormals(); g.translate(Math.sin(layer * 2.4) * .12, 1.55 + layer * .66, Math.cos(layer * 2.4) * .1);
      add(g, layer % 2 ? 0x54755b : 0x456452);
    }
  } else {
    const trunk = new THREE.CapsuleGeometry(.23, 3.3, 5, 16).translate(0, 1.88, 0);
    const p = trunk.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
      const rib = 1 + .08 * Math.cos(a * 8);
      p.setXYZ(i, x * rib + Math.sin(p.getY(i) * .8) * .04, p.getY(i), z * rib);
    }
    trunk.computeVertexNormals(); add(trunk, 0x69805a);
    for (const side of [-1, 1]) {
      const height = side < 0 ? 2.8 : 2.3;
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * .12, 1.55, 0), new THREE.Vector3(side * .58, 1.55, 0),
        new THREE.Vector3(side * .85, 1.83, 0), new THREE.Vector3(side * .86, height, 0),
      ]);
      add(new THREE.TubeGeometry(path, 8, .155, 8, false), 0x718765);
      add(new THREE.SphereGeometry(.155, 8, 5).translate(side * .86, height, 0), 0x819572);
    }
  }
  const result = mergeGeometries(pieces); pieces.forEach(g => g.dispose()); return result;
}
