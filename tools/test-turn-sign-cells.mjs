import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {addTurnSigns,disposeTree} from '../src/world.js';
import {SUN_OFFSET} from '../src/atmosphere.js';

let checks=0,signCount=0,oldDraws=0,newDraws=0,maxVertexError=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const priorDocument=globalThis.document;
globalThis.document={createElement(tag){
  equal(tag,'canvas','Chevron texture uses only its original canvas');
  const canvas={width:0,height:0,commands:[]};
  const context={fillStyle:'',fillRect(...args){canvas.commands.push(['rect',this.fillStyle,...args]);},beginPath(){canvas.commands.push(['begin']);},lineTo(...args){canvas.commands.push(['line',...args]);},closePath(){canvas.commands.push(['close']);},fill(){canvas.commands.push(['fill',this.fillStyle]);}};
  canvas.getContext=()=>context;return canvas;
}};
const matrix=new THREE.Matrix4(),parent=new THREE.Object3D(),child=new THREE.Object3D(),expected=new THREE.Matrix4(),actualPoint=new THREE.Vector3(),expectedPoint=new THREE.Vector3();
const reference={boards:new THREE.BoxGeometry(1.2,1.35,.08),posts:new THREE.BoxGeometry(.1,1.8,.1)};
const frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
function visibleDraws(meshes,camera){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  let draws=0;
  for(const mesh of meshes){
    const visible=frustum.intersectsObject(mesh);if(visible)draws++;
    if(mesh.isInstancedMesh)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);
      if(frustum.intersectsSphere(sphere))check(visible,'A visible board or post cannot disappear at a cell boundary');
    }
  }
  return draws;
}
function audit(group,signs,course){
  const seen=new Set(),legacy=[];
  const geometries=new Set(),materials=new Set(),textures=new Set();
  for(const mesh of group.children){
    const {kind,direction,key,entries}=mesh.userData.turnSignCell;
    geometries.add(mesh.geometry);materials.add(mesh.material);if(mesh.material.map)textures.add(mesh.material.map);
    check(mesh.isInstancedMesh&&mesh.castShadow&&mesh.receiveShadow,'Batch preserves both original shadow flags');
    check(mesh.frustumCulled&&mesh.boundingSphere.radius>0&&Number.isFinite(mesh.boundingSphere.radius)&&mesh.boundingSphere.radius<180,'Batch bounds are finite and local');
    equal(mesh.geometry.attributes.position.array,reference[kind].attributes.position.array,'Board/post geometry has exactly the same vertices');
    equal(mesh.geometry.attributes.uv.array,reference[kind].attributes.uv.array,'Existing arrow UV layout is unchanged');
    if(kind==='boards'){
      check(mesh.material.roughness===.5&&mesh.material.emissive.getHex()===0xb79028&&mesh.material.emissiveIntensity===.15,'Reflective yellow board appearance unchanged');
      check(mesh.material.map===mesh.material.emissiveMap&&mesh.material.map.colorSpace===THREE.SRGBColorSpace,'Arrow color and emissive map keep one correctly encoded texture');
      const canvas=mesh.material.map.image;
      equal([canvas.width,canvas.height],[128,128]);
      equal(canvas.commands,[['rect','#f1bf35',0,0,128,128],['begin'],...[[20,0],[63,0],[110,64],[63,128],[20,128],[66,64]].map(([x,y])=>['line',direction>0?128-x:x,y]),['close'],['fill','#1d252a']],'Arrow paint commands and direction are unchanged');
    }else check(mesh.material.color.getHex()===0x8e9393&&mesh.material.metalness===.5&&mesh.material.roughness===.6,'Galvanized post appearance unchanged');
    for(let i=0;i<entries.length;i++){
      const {feature:sign}=entries[i],id=`${kind}:${sign.id}`;check(!seen.has(id),'No duplicate sign components');seen.add(id);
      equal(key,`${Math.floor(sign.x/200)}:${Math.floor(sign.z/200)}`,'Batch uses the sign source position');
      equal(direction,sign.direction,'Both turn directions retain their own boards');
      parent.position.set(sign.x,sign.y,sign.z);parent.rotation.set(0,sign.heading,0);parent.updateMatrix();
      child.position.set(0,kind==='boards'?2.05:.9,0);child.updateMatrix();expected.multiplyMatrices(parent.matrix,child.matrix);
      mesh.getMatrixAt(i,matrix);equal(matrix.elements,Array.from(new Float32Array(expected.elements)),'Packed instance matrix exactly matches the old parent/child world matrix');
      const vertices=mesh.geometry.attributes.position;
      for(let n=0;n<vertices.count;n++){
        actualPoint.fromBufferAttribute(vertices,n).applyMatrix4(matrix);expectedPoint.fromBufferAttribute(vertices,n).applyMatrix4(expected);
        const error=actualPoint.distanceTo(expectedPoint);maxVertexError=Math.max(maxVertexError,error);check(error<.0003,'Every world vertex matches within floating-point instance precision');
        check(mesh.boundingBox.containsPoint(actualPoint)&&mesh.boundingSphere.containsPoint(actualPoint),'Whole board/post is enclosed even across cell edges');
        if(course&&kind==='posts'){
          const hull=course.features.obstacles.find(o=>o.id===sign.id),dx=actualPoint.x-hull.x,dz=actualPoint.z-hull.z,c=Math.cos(hull.heading),s=Math.sin(hull.heading);
          check(Math.abs(dx*c-dz*s)<=hull.halfX+.0003&&Math.abs(dx*s+dz*c)<=hull.halfZ+.0003,'Visible post remains inside its existing collision footprint');
          check(actualPoint.y>=hull.y-.0003&&actualPoint.y<=hull.y+hull.height+.0003,'Visible post remains within the original collider height');
        }
      }
      const old=new THREE.Mesh(mesh.geometry,mesh.material);old.matrix.copy(expected);old.matrixAutoUpdate=false;old.updateMatrixWorld(true);legacy.push(old);
    }
  }
  equal(seen.size,signs.length*2,'Every chevron still has one board and one post');
  const directions=new Set(signs.map(sign=>sign.direction)).size;
  equal(geometries.size,signs.length?2:0,'All directions share two geometries');equal(materials.size,signs.length?directions+1:0,'All posts share one metal material');equal(textures.size,directions,'Exactly one original arrow texture per direction');
  return{legacy,geometries,materials,textures};
}
try{
  const boundaries=[-200.01,-200,-.001,0,199.999,200,200.01].map((x,i)=>({id:`boundary-${i}`,x,y:i*.35,z:i%2?-200:200,heading:i*.43,direction:i%2?1:-1}));
  const synthetic=new THREE.Group();for(const direction of[-1,1])addTurnSigns(synthetic,boundaries.filter(s=>s.direction===direction),direction);audit(synthetic,boundaries);
  const empty=new THREE.Group();addTurnSigns(empty,[],1);equal(empty.children.length,0,'No empty batches or unused materials');
  for(const seed of[1989,42])for(const def of COURSE){
    const course=new Course(def,seed),signs=course.features.chevrons,before=JSON.stringify(course.features.obstacles),group=new THREE.Group();
    for(const direction of[-1,1])addTurnSigns(group,signs.filter(s=>s.direction===direction),direction);group.updateMatrixWorld(true);
    const {legacy,geometries,materials,textures}=audit(group,signs,course);signCount+=signs.length;
    equal(JSON.stringify(course.features.obstacles),before,'Batching never changes sign support hulls or other physical features');
    check(group.children.length<=signs.length*2,'Cell batching never increases chevron draw count');
    const camera=new THREE.PerspectiveCamera(60,16/9,.15,2400),shadow=new THREE.OrthographicCamera(-45,45,45,-45,1,240),report=[];
    for(const phase of[.08,.35,.72]){
      const s=phase*course.length,p=course.groundAt(s),eye=course.worldAt(s-8.7),aim=course.worldAt(s+26),lift=p.y-course.at(s).y;
      camera.position.set(eye.x,eye.y+3.65+lift,eye.z);camera.lookAt(aim.x,aim.y+1.05+lift,aim.z);
      shadow.position.set(p.x+SUN_OFFSET.x,p.y+SUN_OFFSET.y,p.z+SUN_OFFSET.z);shadow.lookAt(p.x,p.y,p.z);
      const old=visibleDraws(legacy,camera),next=visibleDraws(group.children,camera),oldShadow=visibleDraws(legacy,shadow),nextShadow=visibleDraws(group.children,shadow);
      oldDraws+=old+oldShadow;newDraws+=next+nextShadow;report.push({phase,draws:`${old}→${next}`,shadow:`${oldShadow}→${nextShadow}`});
    }
    if(seed===1989&&signs.length)console.log(JSON.stringify({event:def.id,chevrons:signs.length,wholeSceneDraws:`${signs.length*2}→${group.children.length}`,resources:{geometries:geometries.size,materials:materials.size,textures:textures.size},views:report}));
    const resources=[...geometries,...materials,...textures],disposed=new Map(resources.map(resource=>[resource,0]));
    resources.forEach(resource=>resource.addEventListener('dispose',()=>disposed.set(resource,disposed.get(resource)+1)));
    const other=new THREE.Group();for(const direction of[-1,1])addTurnSigns(other,signs.filter(s=>s.direction===direction),direction);
    other.traverse(mesh=>{if(mesh.geometry)check(!geometries.has(mesh.geometry)&&!materials.has(mesh.material),'Other scenes own independent disposable resources');});
    disposeTree(group);for(const count of disposed.values())equal(count,1,'Shared geometry/material/texture is disposed exactly once');
    disposeTree(other);for(const count of disposed.values())equal(count,1,'Disposing another scene cannot touch this scene resources');
  }
}finally{globalThis.document=priorDocument;}
check(newDraws<oldDraws*.65,'Combined camera and local shadow draws fall substantially');
console.log(`Turn signs: ${checks} checks, ${signCount} unchanged chevrons; maximum transformed vertex error ${(maxVertexError*1000).toFixed(3)}mm; sampled camera/shadow draws ${oldDraws}→${newDraws} (-${((1-newDraws/oldDraws)*100).toFixed(1)}%).`);
