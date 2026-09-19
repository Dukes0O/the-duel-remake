import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {pineTreeAssets,addPineTrees} from '../src/vegetation.js';
import {disposeTree} from '../src/world.js';

let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const geometryHash=geometry=>{const hash=createHash('sha256');for(const attribute of[geometry.attributes.position,geometry.attributes.normal,geometry.attributes.uv,geometry.index])hash.update(new Uint8Array(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength));return hash.digest('hex');};
const before={crown:'ce6684b0d6f81b4588e263f9f7c0d1524c34e79e9584dbc15465459525e9f711',trunk:'1b083a623cf587b1a4714e5342e017c99c37197d4fcc5d490b06ca73a19fc353'};
const loader=THREE.TextureLoader.prototype.load,loads=[];
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.userData.url=url;loads.push(texture);return texture;};
const originalVertex=THREE.ShaderLib.standard.vertexShader,originalFragment=THREE.ShaderLib.standard.fragmentShader;
try{
  const assets=pineTreeAssets(),shader={uniforms:{},vertexShader:originalVertex,fragmentShader:originalFragment};
  for(const key of['crown','trunk'])check(geometryHash(assets[key])===before[key],`${key}: every original position, normal, UV and triangle index remains bit-for-bit unchanged`);
  const material=assets.needles;
  check(material.isMeshStandardMaterial&&material.roughness>=.9&&material.emissive.getHex()===0,'evergreen needles retain rough physical lighting without emission');
  check(material.alphaTest===.48&&material.side===THREE.DoubleSide&&!material.transparent&&material.depthWrite,'original needle cutout and depth behavior are preserved');
  check(material.map.userData.url==='/assets/textures/pine-bough.png'&&material.map.colorSpace===THREE.SRGBColorSpace&&material.map.anisotropy===8,'original runtime bough uses sRGB and anisotropic filtering');
  check(material.color.g>material.color.r&&material.color.b>material.color.r&&material.color.g<.55,'material uses restrained evergreen tint rather than pale yellow');
  const bark=assets.bark,barkMap=bark.map;
  check(barkMap?.userData.url==='/assets/textures/pine-bark.png'&&bark.bumpMap===barkMap,'trunk color and relief share one actual generated bark texture');
  check(barkMap.colorSpace===THREE.SRGBColorSpace&&barkMap.wrapS===THREE.RepeatWrapping&&barkMap.wrapT===THREE.RepeatWrapping&&barkMap.anisotropy===8,'bark has sRGB color, seamless wrapping and angled-view filtering');
  check(barkMap.repeat.x===1&&barkMap.repeat.y===3&&bark.roughness===1&&bark.bumpScale===.025&&!bark.displacementMap,'one circumference and three height repeats add subtle relief without displacing the collision geometry');
  check(bark.color.getHex()===0xc8c5be&&bark.emissive.getHex()===0,'neutral bark tint preserves the generated gray-brown color without emission');
  const trunkPosition=assets.trunk.attributes.position,trunkUV=assets.trunk.attributes.uv,trunkNormal=assets.trunk.attributes.normal;let minimumV=Infinity,maximumV=-Infinity;
  for(let i=0;i<trunkPosition.count;i++)if(Math.abs(trunkNormal.getY(i))<.5){
    const v=trunkUV.getY(i)*barkMap.repeat.y;minimumV=Math.min(minimumV,v);maximumV=Math.max(maximumV,v);
    check(Math.abs(v-trunkPosition.getY(i)/5.9*3)<1e-6,'actual trunk UVs run vertically with bark fissures and retain the two-metre source height scale');
  }
  check(Math.abs((maximumV-minimumV)-3)<1e-6,'the complete trunk uses three uninterrupted vertical texture repeats');
  material.onBeforeCompile(shader);
  check(shader.vertexShader.includes('vec3 pineCrownNormal=normalize(vec3(position.x*.55,.75+vPineHeight*.35,position.z*.55));')&&shader.vertexShader.includes('objectNormal=normalize(mix(objectNormal,pineCrownNormal,pineCrownBias));'),'shader uses a radial and upward field blended with the original card normal');
  check(shader.vertexShader.indexOf('objectNormal=normalize(mix')<shader.vertexShader.indexOf('#include <defaultnormal_vertex>'),'standard instanced normal transformation runs after the crown field');
  check(shader.fragmentShader.includes('normal*=faceDirection;')&&shader.fragmentShader.indexOf('normal*=faceDirection;')>shader.fragmentShader.indexOf('#include <normal_fragment_maps>'),'fragment normal cancels the back-face flip after normal setup');
  check(shader.fragmentShader.includes('#include <alphatest_fragment>')&&shader.fragmentShader.includes('#include <lights_physical_fragment>')&&shader.fragmentShader.includes('#include <lights_fragment_end>'),'standard cutouts, direct sunlight and indirect PBR lighting are preserved');
  check(shader.uniforms.pineLowerShade.value>=.78&&shader.uniforms.pineLowerShade.value<1&&shader.fragmentShader.includes('smoothstep(.1,.8,vPineHeight)'),'lower crown darkening is restrained and fades with tree height');
  check(material.customProgramCacheKey()!==assets.bark.customProgramCacheKey()&&!assets.bark.onBeforeCompile.toString().includes('pineCrownNormal'),'bark and ordinary scene objects keep their own unmodified shader programs');
  const position=assets.crown.attributes.position,normal=assets.crown.attributes.normal,bias=shader.uniforms.pineCrownBias.value;
  const p=new THREE.Vector3(),n=new THREE.Vector3();let minimumUp=1,maximumRadial=0,maxSideError=0,maxCameraError=0;
  const camera=new THREE.PerspectiveCamera(60,16/9,.1,200),instance=new THREE.Matrix4();
  for(let i=0;i<position.count;i++){
    p.fromBufferAttribute(position,i);n.fromBufferAttribute(normal,i);
    const height=THREE.MathUtils.clamp(p.y/5.9,0,1),field=new THREE.Vector3(p.x*.55,.75+height*.35,p.z*.55).normalize(),mixed=n.clone().lerp(field,bias).normalize();
    check(mixed.toArray().every(Number.isFinite)&&mixed.y>.28,'every crown normal remains finite and modestly upward');
    minimumUp=Math.min(minimumUp,mixed.y);maximumRadial=Math.max(maximumRadial,Math.hypot(mixed.x,mixed.z));
    if(Math.hypot(p.x,p.z)>1.3)check(mixed.x*p.x+mixed.z*p.z>0,'outer crown normals retain outward volume rather than all pointing straight up');
    if(i%12===0)for(const heading of[0,.91,2.8]){
      instance.makeRotationY(heading);const expected=mixed.clone().transformDirection(instance);
      for(const eye of[[8,4,-12],[-6,2,9]]){
        camera.position.set(...eye);camera.lookAt(0,3,0);camera.updateMatrixWorld();
        const view=expected.clone().transformDirection(camera.matrixWorldInverse),faces=[];
        for(const side of[-1,1])faces.push(view.clone().multiplyScalar(side).multiplyScalar(side).transformDirection(camera.matrixWorld));
        maxSideError=Math.max(maxSideError,faces[0].distanceTo(faces[1]));maxCameraError=Math.max(maxCameraError,faces[0].distanceTo(expected));
      }
    }
  }
  check(maximumRadial>.8&&minimumUp<.6,'the field preserves a rounded radial crown instead of flattening all leaf normals upward');
  check(maxSideError<1e-12&&maxCameraError<1e-12,'front/back lighting matches and the crown basis is stable across camera and instance rotations');
  for(const key of['crown','trunk'])check(geometryHash(assets[key])===before[key],`${key}: compiling the shader does not modify any geometry buffer`);
  check(THREE.ShaderLib.standard.vertexShader===originalVertex&&THREE.ShaderLib.standard.fragmentShader===originalFragment,'cars, terrain and night materials keep untouched standard shaders');
  const trees=[{x:0,y:1,z:0,scale:1,heading:.4},{x:230,y:2,z:-50,scale:1.3,heading:2}],source=JSON.stringify(trees),groups=[new THREE.Group(),new THREE.Group()];
  for(const group of groups)addPineTrees(group,trees);
  check(JSON.stringify(trees)===source,'tree placement and collision source records remain unchanged');
  const materials=groups.map(group=>group.children.find(mesh=>mesh.name.startsWith('Pine crowns')).material),maps=materials.map(value=>value.map),disposals=[0,0];
  const barkMaps=groups.map(group=>group.children.find(mesh=>mesh.name.startsWith('Pine trunks')).material.map),barkDisposals=[0,0];
  check(maps[0]!==maps[1]&&loads.filter(map=>map.userData.url==='/assets/textures/pine-bough.png').length===3,'each world owns one needle texture, shared only by its own spatial cells');
  check(barkMaps[0]!==barkMaps[1]&&loads.filter(map=>map.userData.url==='/assets/textures/pine-bark.png').length===3,'each world owns one bark texture, independent of other worlds');
  for(const group of groups){
    const crowns=group.children.filter(mesh=>mesh.name.startsWith('Pine crowns'));
    const trunks=group.children.filter(mesh=>mesh.name.startsWith('Pine trunks'));
    check(new Set(trunks.map(mesh=>mesh.material)).size===1&&trunks.every(mesh=>mesh.material.map===mesh.material.bumpMap),'every trunk cell shares one color/bump resource');
    check(crowns.every(mesh=>mesh.castShadow&&mesh.receiveShadow&&mesh.frustumCulled)&&new Set(crowns.map(mesh=>mesh.material)).size===1,'all finite crown cells keep shared lighting and original shadow flags');
    for(const mesh of group.children)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,instance);const tree=mesh.userData.vegetationCell.entries[i].feature,object=new THREE.Object3D();object.position.set(tree.x,tree.y-.24,tree.z);object.rotation.y=tree.heading;object.scale.setScalar(tree.scale);object.updateMatrix();
      check(instance.elements.every((value,index)=>value===Math.fround(object.matrix.elements[index])),'trunk and crown matrices remain exactly the original placement');
    }
  }
  maps.forEach((map,i)=>map.addEventListener('dispose',()=>disposals[i]++));barkMaps.forEach((map,i)=>map.addEventListener('dispose',()=>barkDisposals[i]++));
  disposeTree(groups[0]);check(disposals[0]===1&&disposals[1]===0,'disposing a world releases its needle texture once without damaging another world');
  check(barkDisposals[0]===1&&barkDisposals[1]===0,'shared color/bump bark texture disposes once, not twice, without touching the next world');
  disposeTree(groups[1]);check(disposals[1]===1&&barkDisposals[1]===1,'the other world releases its own needle and bark textures once');
  assets.crown.dispose();assets.trunk.dispose();assets.bark.dispose();assets.bark.map.dispose();assets.needles.dispose();assets.needles.map.dispose();
  console.log(`Pine lighting: minimum upward component ${minimumUp.toFixed(3)}, maximum radial component ${maximumRadial.toFixed(3)}, front/back error ${maxSideError}, camera error ${maxCameraError.toExponential(2)}.`);
}finally{THREE.TextureLoader.prototype.load=loader;}

const png=readFileSync(new URL('../public/assets/textures/pine-bough.png',import.meta.url));
check(png[24]===8&&png[25]===6&&png[28]===0,'actual pine image supplies a full eight-bit alpha channel');
const width=png.readUInt32BE(16),height=png.readUInt32BE(20),stride=width*4,chunks=[];
for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(stride*height),paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<height;y++)for(let x=0;x<stride;x++){const filter=raw[y*(stride+1)],value=raw[y*(stride+1)+1+x],a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]:0;assert(filter<=4);pixels[y*stride+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;}
let clear=0,passing=0,border=0;for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=pixels[(y*width+x)*4+3];if(!alpha)clear++;if(alpha/255>=.48)passing++;if(x===0||y===0||x===width-1||y===height-1)border=Math.max(border,alpha);}
check(clear>width*height*.4&&passing>width*height*.15&&passing<width*height*.5,'real alpha retains detailed needle sprays while cutting away most of every card');
check(border<8,'bough image has no visible card-edge rectangle');
console.log(`Pine material: ${checks} original geometry, radial lighting, alpha, transform, resource and shader-isolation checks passed.`);
