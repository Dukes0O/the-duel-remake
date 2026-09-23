import * as THREE from 'three';
import {COMBAT_TUNING} from './wasteland-tuning.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { vegetationCells, finishVegetationCell } from './vegetation.js';
import { renderedGroundHeight as cactusGroundHeight } from './rendered-ground.js';

const TAU = Math.PI * 2;
export const CACTUS_FALL_SECONDS = .85;
const geometryCache = new Map();
const variation = value => { const n = Math.sin(value * 12.9898 + 78.233) * 43758.5453; return n - Math.floor(n); };

function ribbedStem(points, radius, ribs, rings, radial, capStart = false) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const frames = curve.computeFrenetFrames(rings, false), positions = [], colors = [], uv = [], indices = [];
  const olive = new THREE.Color(0x667554), cork = new THREE.Color(0x82745a), shade = new THREE.Color();
  const length = curve.getLength();
  for (let row = 0; row <= rings; row++) {
    const t = row / rings, center = curve.getPointAt(t);
    // Rounded tips, a fuller lower stem and a narrow arm tip. The radius at
    // each rib crest stays at/below the authored collision-safe radius.
    const cap = t > .88 ? Math.sqrt(Math.max(.0001, 1 - ((t - .88) / .12) ** 2)) : 1;
    const taper = (1 - .25 * t) * cap;
    for (let col = 0; col <= radial; col++) {
      const a = col / radial * TAU, rib = .88 + .12 * Math.cos(a * ribs);
      const point = center.clone().addScaledVector(frames.normals[row], Math.cos(a) * radius * taper * rib).addScaledVector(frames.binormals[row], Math.sin(a) * radius * taper * rib);
      positions.push(point.x, point.y, point.z); uv.push(col / radial * ribs, t * length);
      const aged = capStart ? 1 - THREE.MathUtils.smoothstep(point.y, .12, .72) : 0;
      shade.copy(olive).lerp(cork, aged * .67).multiplyScalar(.9 + .10 * rib + .025 * Math.sin(point.y * 5 + a));
      colors.push(shade.r, shade.g, shade.b);
      if (row && col) { const i = row * (radial + 1) + col; indices.push(i - radial - 2, i - 1, i - radial - 1, i - radial - 1, i - 1, i); }
    }
  }
  // These caps are mostly hidden in the trunk junction or the planted base.
  const first = positions.length / 3, start = curve.getPointAt(0), end = curve.getPointAt(1);
  for (const p of [start, end]) { positions.push(p.x, p.y, p.z); colors.push(olive.r, olive.g, olive.b); uv.push(0, p === start ? 0 : length); }
  for (let col = 0; col < radial; col++) {
    indices.push(first, col, col + 1);
    const last = rings * (radial + 1) + col; indices.push(first + 1, last + 1, last);
  }
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  return geometry;
}

export function buildCactusGeometry(variant = 0) {
  variant = ((variant % 3) + 3) % 3;
  const height = [2.75, 3.05, 2.30][variant], radius = [.215, .218, .205][variant];
  const pieces = [ribbedStem([[0, 0, 0], [.008, height * .35, -.004], [-.006, height * .72, .006], [0, height, 0]], radius, 10, 19, 40, true)];
  const arms = variant === 0 ? [[-1, 1.30, .69, 2.12], [1, 1.61, .59, 2.49]] : variant === 1 ? [[1, 1.60, .76, 2.77]] : [[-1, 1.21, .58, 1.99]];
  for (const [side, y, reach, top] of arms) {
    pieces.push(ribbedStem([[side * .11, y, 0], [side * reach * .60, y + .015, .008], [side * reach, y + .29, .015], [side * (reach + .025), top, .015]], .134, 8, 14, 32));
  }
  const geometry = mergeGeometries(pieces); pieces.forEach(piece => piece.dispose());
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  geometry.name = `Ribbed desert cactus ${variant + 1}`;
  geometry.userData.cactusVariant = variant;
  return geometry;
}

export function createCactusMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 });
  material.name = 'Matte sage cactus skin';
  material.customProgramCacheKey = () => 'ribbed-cactus-skin-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vCactusUv;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvCactusUv=uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vCactusUv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      vec2 cactusCell=abs(fract(vCactusUv*vec2(1.0,12.0)+vec2(.5,0.0))-.5);
      float cactusPore=1.0-smoothstep(.075,.16,length(cactusCell*vec2(1.8,1.0)));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.31,.29,.20),cactusPore*.36);
      float cactusGrain=fract(sin(dot(floor(vCactusUv*vec2(90.0,130.0)),vec2(12.9898,78.233)))*43758.5453);
      diffuseColor.rgb*=.97+.06*cactusGrain;`);
  };
  return material;
}

export function cactusTransform(course, tree, index = 0) {
  const seed = tree.s * .37 + tree.off * .71 + index * .11;
  const heightScale = .78 + variation(seed) * .13;
  // Preserve the original feature center/heading and ground-level footprint.
  // A short root collar enters the ground rather than leaving a floating cap.
  const base = cactusGroundHeight(course,tree) - .27 - .04 * tree.scale;
  return new THREE.Matrix4().compose(new THREE.Vector3(tree.x, base, tree.z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), tree.heading), new THREE.Vector3(tree.scale, tree.scale * heightScale, tree.scale));
}

// Fit the final, rigid cactus to the same terrain triangles as its standing
// root. The trunk follows the struck direction and the arms settle sideways,
// rather than propping the whole trunk in the air on one downward-facing arm.
// This one-time fit runs only when a cactus is first struck, not every frame.
function cactusFallPose(course, tree, geometry, upright, event) {
  const length=Math.hypot(event.directionX,event.directionZ),dx=event.directionX/length,dz=event.directionZ/length;
  const frame=course.at(tree.s),sn=Math.sin(frame.heading),cs=Math.cos(frame.heading),progressScale=Math.max(.25,1-frame.curvature*tree.off);
  const groundAt=(x,z)=>cactusGroundHeight(course,{x,z,s:tree.s+((x-tree.x)*sn+(z-tree.z)*cs)/progressScale,off:tree.off+(x-tree.x)*cs-(z-tree.z)*sn});
  const rootGround=groundAt(tree.x,tree.z),pivot=new THREE.Vector3(tree.x,rootGround-.03,tree.z);
  const position=new THREE.Vector3(),startRotation=new THREE.Quaternion(),scale=new THREE.Vector3();upright.decompose(position,startRotation,scale);
  const reach=Math.max(.5,geometry.boundingBox.max.y*scale.y-(rootGround-position.y));
  const fallDirection=new THREE.Vector3(dx,(groundAt(tree.x+dx*reach,tree.z+dz*reach)-rootGround)/reach,dz).normalize();
  const across=new THREE.Vector3(dz,0,-dx),oldAcross=new THREE.Vector3(1,0,0).applyQuaternion(startRotation);
  if(across.dot(oldAcross)<0)across.negate();
  const normal=new THREE.Vector3().crossVectors(across,fallDirection).normalize();
  across.crossVectors(fallDirection,normal).normalize();
  const endRotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(across,fallDirection,normal));
  const delta=endRotation.clone().multiply(startRotation.clone().invert()),matrix=new THREE.Matrix4();
  const offset=position.clone().sub(pivot).applyQuaternion(delta).add(pivot);
  matrix.compose(offset,endRotation,scale);
  const point=new THREE.Vector3(),vertices=geometry.attributes.position;let lift=0;
  for(let i=0;i<vertices.count;i++){
    point.fromBufferAttribute(vertices,i).applyMatrix4(matrix);
    lift=Math.max(lift,groundAt(point.x,point.z)-point.y-.015);
  }
  return {pivot,position,startRotation,endRotation,scale,lift};
}

export function addDesertCacti(group, course) {
  const trees = course.features.trees, material = createCactusMaterial(), tint = new THREE.Color();
  const instances=new Map(),active=new Set(),changed=new Set(),seen=new Set(),matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),delta=new THREE.Quaternion(),position=new THREE.Vector3();
  for (const { key, entries } of vegetationCells(trees)) for (let variant = 0; variant < 3; variant++) {
    const features = entries.filter(({ index }) => index % 3 === variant).map(({ feature: tree, index }) => ({ tree, index }));
    if (!features.length) continue;
    if (!geometryCache.has(variant)) { const geometry = buildCactusGeometry(variant); geometry.userData.sharedAsset = true; geometryCache.set(variant, geometry); }
    const mesh = new THREE.InstancedMesh(geometryCache.get(variant), material, features.length);
    mesh.name = `Desert cactus stand ${variant + 1} ${key}`;
    features.forEach(({ tree, index }, i) => {
      const upright=cactusTransform(course, tree, index);mesh.setMatrixAt(i,upright);
      instances.set(tree.id,{mesh,index:i,tree,upright,pose:null,progress:null,eventKey:null});
      const tone = variation(tree.s + tree.off);
      tint.setRGB(.86 + tone * .14, .88 + tone * .12, .82 + tone * .15); mesh.setColorAt(i, tint);
    });
    finishVegetationCell(mesh, key, features.map(({ tree: feature, index }) => ({ feature, index })));
    mesh.userData.cactusFeatures = features; group.add(mesh);
  }
  if (!trees.length) material.dispose();
  const updateSimulation=state=>{
    seen.clear();changed.clear();
    const now=Number.isFinite(state?.stageTimeSec)?state.stageTimeSec:0;
    const events=state?.status==='menu'?[]:Array.isArray(state?.fallenCacti)?state.fallenCacti:[];
    for(const event of events){
      const item=instances.get(event?.id),directionLength=Math.hypot(event?.directionX,event?.directionZ);
      if(!item||seen.has(event.id)||!Number.isFinite(event.atTime)||!Number.isFinite(directionLength)||directionLength<1e-6)continue;
      seen.add(event.id);active.add(item);
      const eventKey=`${event.atTime}:${event.directionX}:${event.directionZ}:${event.outcome||''}`;
      if(item.eventKey!==eventKey){item.pose=cactusFallPose(course,item.tree,item.mesh.geometry,item.upright,event);item.eventKey=eventKey;item.progress=null;}
      const progress=THREE.MathUtils.clamp((now-event.atTime)/CACTUS_FALL_SECONDS,0,1);
      const hidden=event.outcome==='obliterate'&&
        now-event.atTime>=COMBAT_TUNING.roadside.sceneryVisibleSeconds;
      const progressKey=`${progress}:${hidden}`;
      if(item.progress===progressKey)continue;
      item.progress=progressKey;
      if(hidden)matrix.makeScale(0,0,0);
      else if(progress===0)matrix.copy(item.upright);
      else{
        const t=progress*progress*(3-2*progress),pose=item.pose;
        rotation.slerpQuaternions(pose.startRotation,pose.endRotation,t);
        delta.copy(pose.startRotation).invert().premultiply(rotation);
        position.copy(pose.position).sub(pose.pivot).applyQuaternion(delta).add(pose.pivot);position.y+=pose.lift*t;
        if(event.outcome==='knock'){
          const distance=COMBAT_TUNING.roadside.sceneryKnockDistance*t;
          position.x+=event.directionX*distance;
          position.z+=event.directionZ*distance;
        }
        matrix.compose(position,rotation,pose.scale);
      }
      item.mesh.setMatrixAt(item.index,matrix);changed.add(item.mesh);
    }
    for(const item of active)if(!seen.has(item.tree.id)){
      item.mesh.setMatrixAt(item.index,item.upright);changed.add(item.mesh);active.delete(item);item.pose=null;item.progress=null;item.eventKey=null;
    }
    for(const mesh of changed){
      mesh.instanceMatrix.needsUpdate=true;
      // Refit only touched cells. Falling arms can extend beyond their former
      // standing bounds; native camera and shadow culling must include them.
      mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.02);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.02;
    }
  };
  return updateSimulation;
}

// World-space projection keeps the existing sandstone image's layers coherent
// across faceted boulders. Geometry and collision extents stay unchanged.
export function createDesertStoneMaterial(texture) {
  const material = new THREE.MeshStandardMaterial({ color: 0xcbb6a0, map: texture, bumpMap: texture, bumpScale: .055, roughness: .98 });
  material.name = 'Weathered layered sandstone';
  material.customProgramCacheKey = () => 'desert-roadside-stone-v1';
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vDesertStonePosition;\nvarying vec3 vDesertStoneNormal;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      vec4 desertStonePosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        desertStonePosition=instanceMatrix*desertStonePosition;
      #endif
      vDesertStonePosition=(modelMatrix*desertStonePosition).xyz;
      vDesertStoneNormal=inverseTransformDirection(transformedNormal,viewMatrix);`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vDesertStonePosition;
      varying vec3 vDesertStoneNormal;`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      vec3 desertWeights=pow(abs(normalize(vDesertStoneNormal)),vec3(5.0));
      desertWeights/=max(dot(desertWeights,vec3(1.0)),.0001);
      vec3 desertP=vDesertStonePosition/2.8;
      vec3 desertAlbedo=texture2D(map,desertP.zy).rgb*desertWeights.x+texture2D(map,desertP.xz).rgb*desertWeights.y+texture2D(map,desertP.xy).rgb*desertWeights.z;
      desertAlbedo=clamp((desertAlbedo-vec3(.24))*1.16+vec3(.24),vec3(.035),vec3(.90));
      float desertLayer=.93+.07*sin(vDesertStonePosition.y*8.0+.21*sin(vDesertStonePosition.x*.7+vDesertStonePosition.z*.53));
      diffuseColor.rgb*=desertAlbedo*desertLayer;
      float desertStoneBump=bumpScale*dot(desertAlbedo,vec3(.3333));`);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', 'normal=perturbNormalArb(-vViewPosition,normal,vec2(dFdx(desertStoneBump),dFdy(desertStoneBump)),faceDirection);');
  };
  return material;
}
