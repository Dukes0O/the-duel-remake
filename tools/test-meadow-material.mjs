import {animateScene} from '../src/scene-systems.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {COURSE} from '../src/config.js';
import {Course} from '../src/course.js';
import {addLandscapeDetail} from '../src/landscape-detail.js';
import {disposeTree} from '../src/world.js';
import {resolveLightingSettings} from '../src/lighting-moods.js';

let checks=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const hash=meshes=>{const sum=createHash('sha256');for(const mesh of meshes)for(const array of[mesh.geometry.attributes.position.array,mesh.geometry.attributes.uv.array,mesh.geometry.attributes.normal.array,mesh.instanceMatrix.array,mesh.instanceColor.array])sum.update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength));return sum.digest('hex');};
const originalLoad=THREE.TextureLoader.prototype.load,loads=[];
THREE.TextureLoader.prototype.load=function(url){const texture=new THREE.Texture();texture.userData.url=url;loads.push(texture);return texture;};
const originalVertex=THREE.ShaderLib.standard.vertexShader,originalFragment=THREE.ShaderLib.standard.fragmentShader;
const groups=[];
try{
  for(const theme of ['alpine','coast']){
    const def=COURSE.find(stage=>stage.sections.some(section=>section.theme===theme)),course=new Course(def,1989),view=Object.create(course);
    view.def={...def,theme};view.detailSections=course.sections.filter(section=>section.theme===theme);view.features={...course.features,rocks:course.features.rocks.filter(rock=>rock.theme===theme)};
    const group=new THREE.Group(),physicalBefore=JSON.stringify(course.features);groups.push(group);addLandscapeDetail(group,view,theme==='alpine');
    const cells=group.children.filter(mesh=>mesh.material.map?.userData.url==='/assets/textures/meadow-grass.png');
    check(cells.length>1&&new Set(cells.map(mesh=>mesh.geometry)).size===1&&new Set(cells.map(mesh=>mesh.material)).size===1,`${theme}: all finite cells retain one shared meadow geometry and material`);
    const material=cells[0].material,geometry=cells[0].geometry,{position,uv,normal}=geometry.attributes;
    check(material.isMeshStandardMaterial&&material.roughness===1&&material.emissive.getHex()===0,`${theme}: grass remains physically lit rather than emissive or unlit`);
    check(material.side===THREE.DoubleSide&&material.alphaTest===.5&&!material.transparent&&material.depthWrite,`${theme}: alpha cutout and depth behavior remain unchanged`);
    check(material.map.colorSpace===THREE.SRGBColorSpace&&material.map.minFilter===THREE.LinearMipmapLinearFilter&&material.map.generateMipmaps&&material.map.anisotropy===4,`${theme}: image uses normal sRGB and mip filtering`);
    check(material.color.g>material.color.r&&material.color.g>material.color.b,`${theme}: material tint is a restrained green, not a yellow multiplier`);
    check(position.count===12&&uv.count===12&&normal.count===12&&geometry.index.count===18,`${theme}: each tuft still uses only three indexed cards`);
    for(let card=0;card<3;card++){
      const corners=new Set();
      for(let i=card*4;i<card*4+4;i++){
        corners.add(`${uv.getX(i)},${uv.getY(i)}`);
        check(Math.abs(uv.getY(i)-(position.getY(i)+.1)/.78)<1e-6,'image height maps to blade height without UV stretching or a missing half-card');
        check(Math.abs(new THREE.Vector3().fromBufferAttribute(normal,i).length()-1)<1e-6,'actual card normal is finite and unit length');
      }
      check(corners.size===4&&['0,0','1,0','0,1','1,1'].every(corner=>corners.has(corner)),'each merged card retains all four distinct texture corners');
      const used=[];for(let j=card*6;j<card*6+6;j++)used.push(geometry.index.getX(j));
      check(used.every(i=>i>=card*4&&i<card*4+4)&&new Set(used).size===4,'both triangles use only their own complete UV card');
    }
    const before=hash(cells),shader={uniforms:{},vertexShader:originalVertex,fragmentShader:originalFragment};material.onBeforeCompile(shader);
    check(shader.vertexShader.includes('transformed.x+=max(0.,position.y)*max(0.,position.y)*sin(meadowTime*1.5+instanceMatrix[3].x*.17+instanceMatrix[3].z*.11)*.14;'),'existing world-phased wind displacement remains exact');
    check(shader.vertexShader.includes('vMeadowHeight=uv.y;')&&shader.fragmentShader.includes('smoothstep(.12,.45,vMeadowHeight)'),'root shade follows image blade height');
    check(shader.uniforms.meadowRootShade.value>=.8&&shader.uniforms.meadowRootShade.value<=.95,'root shading stays subtle');
    check(shader.fragmentShader.includes('meadowCardNormal*=faceDirection;')&&shader.fragmentShader.includes('normal=normalize(mix(meadowCardNormal,meadowWorldUp,meadowUpBias));')&&shader.fragmentShader.includes('viewMatrix*vec4(0.0,1.0,0.0,0.0)'),'shader restores a face-independent normal and transforms world-up into view space');
    check(shader.fragmentShader.indexOf('normal=normalize(mix')>shader.fragmentShader.indexOf('#include <normal_fragment_maps>')&&shader.fragmentShader.indexOf('normal=normalize(mix')<shader.fragmentShader.indexOf('#include <lights_fragment_begin>'),'normal correction runs after normal setup and before physical lighting');
    check(shader.fragmentShader.includes('#include <alphatest_fragment>')&&shader.fragmentShader.includes('#include <lights_physical_fragment>')&&shader.fragmentShader.includes('#include <lights_fragment_end>'),'map alpha and all standard direct/indirect physical light calculations remain active');
    check(material.customProgramCacheKey()!==new THREE.MeshStandardMaterial().customProgramCacheKey(),'grass shader program is distinct from ordinary surfaces');
    const bias=shader.uniforms.meadowUpBias.value,up=new THREE.Vector3(0,1,0),clear=resolveLightingSettings(theme),sun=new THREE.Vector3().copy(clear.sunOffset).normalize();
    let oldMinimum=1,oldMaximum=-1,newMinimum=1,newMaximum=-1,maxSideDifference=0,maxCameraDifference=0;
    const matrix=new THREE.Matrix4(),direction=new THREE.Vector3();
    // Use real instance rotations/scales and card normals. The CPU calculation
    // matches the checked shader equation; camera poses and both visible sides
    // expose a missing face correction or a mistaken view-space up direction.
    for(const cell of cells.slice(0,3))for(let i=0;i<Math.min(12,cell.count);i++){
      cell.getMatrixAt(i,matrix);
      for(let card=0;card<3;card++){
        direction.fromBufferAttribute(normal,card*4).transformDirection(matrix);
        const expected=direction.clone().lerp(up,bias).normalize();
        check(expected.y>.96&&Math.hypot(expected.x,expected.z)>.05,'grass keeps slight directional detail while favoring sky light');
        oldMinimum=Math.min(oldMinimum,Math.abs(direction.dot(sun)));oldMaximum=Math.max(oldMaximum,Math.abs(direction.dot(sun)));
        newMinimum=Math.min(newMinimum,expected.dot(sun));newMaximum=Math.max(newMaximum,expected.dot(sun));
        for(const eye of[[8,3,-12],[-6,2,9],[2,12,3]]){
          const camera=new THREE.PerspectiveCamera(60,16/9,.1,100);camera.position.set(...eye);camera.lookAt(0,.4,0);camera.updateMatrixWorld();
          const inverse=camera.matrixWorld,viewUp=up.clone().transformDirection(camera.matrixWorldInverse),faces=[];
          for(const face of[-1,1]){
            const standard=direction.clone().transformDirection(camera.matrixWorldInverse).multiplyScalar(face);
            const corrected=standard.multiplyScalar(face).lerp(viewUp,bias).normalize().transformDirection(inverse);
            faces.push(corrected);maxCameraDifference=Math.max(maxCameraDifference,corrected.distanceTo(expected));
          }
          maxSideDifference=Math.max(maxSideDifference,faces[0].distanceTo(faces[1]));
        }
      }
    }
    check(maxSideDifference<1e-12&&maxCameraDifference<1e-12,`${theme}: front/back diffuse bases match and remain stable as the camera moves`);
    check(newMaximum-newMinimum<(oldMaximum-oldMinimum)*.4,`${theme}: crossed-card sunlight contrast is materially reduced`);
    for(const time of[0,1.25,100]){animateScene(group,time);check(shader.uniforms.meadowTime.value===time,'shared wind time still updates');}
    check(hash(cells)===before&&JSON.stringify(course.features)===physicalBefore,'shader compilation and animation cannot move source geometry, colors, instance transforms or physical scenery');
    check(group.children.filter(mesh=>!cells.includes(mesh)).every(mesh=>!mesh.material.onBeforeCompile.toString().includes('meadowUpBias')),'rocks, posts and other materials do not inherit the grass lighting change');
    console.log(`${theme}: flat-card sunlight spread ${(oldMaximum-oldMinimum).toFixed(3)} -> ${(newMaximum-newMinimum).toFixed(3)}; front/back difference ${maxSideDifference}; camera error ${maxCameraDifference.toExponential(2)}.`);
  }
  check(THREE.ShaderLib.standard.vertexShader===originalVertex&&THREE.ShaderLib.standard.fragmentShader===originalFragment,'standard shaders remain globally unchanged for cars, night streets and all other objects');
  const maps=loads.filter(texture=>texture.userData.url==='/assets/textures/meadow-grass.png');
  check(maps.length===2&&maps[0]!==maps[1],'each world view owns exactly one meadow texture rather than sharing a disposed asset');
  const disposed=[0,0];maps.forEach((texture,i)=>texture.addEventListener('dispose',()=>disposed[i]++));
  disposeTree(groups[0]);check(disposed[0]===1&&disposed[1]===0,'disposing one world releases its shared-cell texture exactly once without touching the next world');
  disposeTree(groups[1]);check(disposed[1]===1,'the next world releases its own texture exactly once');
}finally{THREE.TextureLoader.prototype.load=originalLoad;}

// Inspect real image pixels: valid geometry alone cannot establish that the
// texture supplies transparent corners and visible blades at the alpha cutoff.
const png=readFileSync(new URL('../public/assets/textures/meadow-grass.png',import.meta.url));
check(png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&png[24]===8&&png[25]===6&&png[28]===0,'runtime grass image has real eight-bit RGBA data');
const width=png.readUInt32BE(16),height=png.readUInt32BE(20),stride=width*4,chunks=[];
for(let offset=8;offset<png.length;){const length=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+length));offset+=length+12;}
const raw=inflateSync(Buffer.concat(chunks)),pixels=new Uint8Array(stride*height);
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<height;y++)for(let x=0;x<stride;x++){
  const filter=raw[y*(stride+1)],value=raw[y*(stride+1)+1+x],a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=4?pixels[(y-1)*stride+x-4]:0;
  assert(filter<=4);pixels[y*stride+x]=(value+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c)))&255;
}
let zero=0,passing=0,border=0;
for(let y=0;y<height;y++)for(let x=0;x<width;x++){const alpha=pixels[(y*width+x)*4+3];if(alpha===0)zero++;if(alpha>=128)passing++;if(x===0||y===0||x===width-1||y===height-1)border=Math.max(border,alpha);}
check(zero>width*height*.35&&passing>width*height*.1&&passing<width*height*.5,'actual alpha cuts away most of each card while retaining grass blades');
check(border<8,'all texture edges stay below alpha cutoff so a rectangular card border cannot render');
console.log(`Meadow material: ${checks} actual geometry, UV, lighting, alpha, unchanged placement and lifecycle checks passed.`);
