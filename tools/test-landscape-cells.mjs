import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {SUN_OFFSET} from '../src/atmosphere.js';
import {addLandscapeDetail,addLandscapeInstanceCells} from '../src/landscape-detail.js';

let checks=0,instances=0,oldTotal=0,newTotal=0,oldShadows=0,newShadows=0;
const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const equal=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const hash=arrays=>{const result=createHash('sha256');for(const array of arrays)result.update(Buffer.from(array.buffer,array.byteOffset,array.byteLength));return result.digest('hex');};
const matrix=new THREE.Matrix4(),object=new THREE.Object3D(),point=new THREE.Vector3();
const kinds=['foliage','grit','boulders','posts','reflectors','outcrops'];
// Captured from the pre-batching factory: geometry vertices, then complete
// source-order matrix and colour buffers for each original mesh. These catch
// accidental RNG/order changes that a count-only test would miss.
const baseline={
  'pacific-canyon/desert':[[1820,780,96,138,138],'c5a230d5e3c38a80026ec8774b2a2429b7bad84367365dc8dc9b66cfbc6abc84'],
  'pacific-canyon/coast':[[6720,720,85,128,128],'c7ab9ab5088f313d8d7f6716fb3e2e62a9cbffdeeafe674415b16cea8e1448cb'],
  'high-country/desert':[[910,390,49,84,84],'2dbbed89aca864579c061c4ec80c34de24f501595f1a477b1e1f48d1cecd314c'],
  'high-country/alpine':[[6720,720,87,144,144],'e134e9abeac6f5a8a694dbdb3d41ff3d782b3365bdc49f6eb9f98306f4428192'],
  'high-country/coast':[[3640,390,37,84,84],'3f4e0760529ac2cc30d37ac0bf26a8d4983e176c9d4e5323ebb7275e6afb6769'],
  'harbor-highlands/city':[[408,510,48,100,100],'acb5b061f0def2151031ad0ddb4a7bb7a46767b8f8fa722006943f06cc187eea'],
  'harbor-highlands/alpine':[[5040,540,66,96,96],'e2cc8799bc5bd2993f6635056bc296267ced0688943a769e71389758ee70094c'],
  'harbor-highlands/coast':[[4200,450,61,88,88],'94166ffe000f249de12995a301113716519741a9a4c275de253fa554d58893d4'],
  'ridge-rally/desert':[[1470,630,67,98,98],'3f0476ef7ddac6937cd9e42566a021b28670b69983606b341a57bff931abbf6a'],
  'ridge-rally/alpine':[[8120,870,104,126,126],'a51e38d25b3c55de0e4b5c5de49e87d30c6bc507971aeb45da55b72e585724e4'],
};

function auditAndReconstruct(meshes){
  const originals=[];
  for(const kind of kinds){
    const cells=meshes.filter(mesh=>mesh.userData.landscapeCell.kind===kind);if(!cells.length)continue;
    const first=cells[0],count=cells.reduce((total,mesh)=>total+mesh.count,0),seen=new Set();
    const original=new THREE.InstancedMesh(first.geometry,first.material,count);
    original.castShadow=first.castShadow;original.receiveShadow=first.receiveShadow;
    if(first.instanceColor)original.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3),3);
    for(const mesh of cells){
      const data=mesh.userData.landscapeCell;
      check(mesh.geometry===first.geometry&&mesh.material===first.material,'Cells share the exact original geometry and material');
      check(mesh.castShadow===first.castShadow&&mesh.receiveShadow===first.receiveShadow,'Shadow policy does not change between cells');
      check(mesh.frustumCulled&&Number.isFinite(mesh.boundingSphere.radius)&&mesh.boundingSphere.radius<190,'Each batch has finite local culling bounds');
      for(let i=0;i<mesh.count;i++){
        const index=data.indices[i];check(!seen.has(index)&&index>=0&&index<count,'Every original instance appears exactly once');seen.add(index);
        original.instanceMatrix.array.set(mesh.instanceMatrix.array.subarray(i*16,i*16+16),index*16);
        if(mesh.instanceColor)original.instanceColor.array.set(mesh.instanceColor.array.subarray(i*3,i*3+3),index*3);
        mesh.getMatrixAt(i,matrix);
        equal(data.key,`${Math.floor(matrix.elements[12]/200)}:${Math.floor(matrix.elements[14]/200)}`,'Cell membership follows actual source position');
        const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);sphere.radius+=data.sway;
        check(mesh.boundingSphere.center.distanceTo(sphere.center)+sphere.radius<=mesh.boundingSphere.radius+1e-4,'Bounds enclose geometry plus maximum grass sway');
        const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(matrix).expandByScalar(data.sway);
        check(mesh.boundingBox.containsBox(bounds),'Cell boxes include objects extending across cell boundaries');
        if(data.sway&&i%31===0){
          const vertices=mesh.geometry.attributes.position;
          for(let n=0;n<vertices.count;n++)for(const direction of[-1,1]){
            point.fromBufferAttribute(vertices,n);point.x+=direction*Math.max(0,point.y)**2*.14;point.applyMatrix4(matrix);
            check(mesh.boundingBox.containsPoint(point)&&mesh.boundingSphere.containsPoint(point),'Both wind extremes remain visible');
          }
        }
        instances++;
      }
    }
    original.computeBoundingBox();original.computeBoundingSphere();original.updateMatrixWorld(true);originals.push(original);
  }
  return originals;
}

const frustum=new THREE.Frustum(),projection=new THREE.Matrix4();
function submissions(meshes,camera,pass='color'){
  camera.updateMatrixWorld(true);camera.updateProjectionMatrix();frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  let triangles=0,draws=0;
  for(const mesh of meshes){
    if(pass==='shadow'&&!mesh.castShadow||pass==='ao'&&mesh.material.alphaTest>0)continue;
    const included=frustum.intersectsObject(mesh);
    if(mesh.userData.landscapeCell)for(let i=0;i<mesh.count;i++){
      mesh.getMatrixAt(i,matrix);const sphere=mesh.geometry.boundingSphere.clone().applyMatrix4(matrix);sphere.radius+=mesh.userData.landscapeCell.sway;
      if(frustum.intersectsSphere(sphere))check(included,'No visible instance disappears when its cell crosses a frustum edge');
    }
    if(included){draws++;triangles+=mesh.count*(mesh.geometry.index?.count||mesh.geometry.attributes.position.count)/3;}
  }
  return{draws,triangles};
}

// Deliberately straddle positive/negative boundaries with tall rotating props.
const source=new THREE.InstancedMesh(new THREE.BoxGeometry(5,2,3),new THREE.MeshStandardMaterial(),7);
for(const[i,x]of[-200.01,-200,-.001,0,199.999,200,200.01].entries()){
  object.position.set(x,i*.7,i%2?-200:200);object.rotation.set(.3,i*.61,.1);object.scale.set(1+i*.1,1.7,1.2);object.updateMatrix();source.setMatrixAt(i,object.matrix);source.setColorAt(i,new THREE.Color(i/7,.5,.7));
}
const matrixBefore=source.instanceMatrix.array.slice(),colorsBefore=source.instanceColor.array.slice(),synthetic=new THREE.Group();
addLandscapeInstanceCells(synthetic,source,{kind:'outcrops',wind:.14});
const restored=auditAndReconstruct(synthetic.children)[0];equal(restored.instanceMatrix.array,matrixBefore);equal(restored.instanceColor.array,colorsBefore);
const empty=new THREE.Group();addLandscapeInstanceCells(empty,new THREE.InstancedMesh(source.geometry,source.material,0));equal(empty.children.length,0,'Empty groups cannot create infinite bounds');

const originalLoad=THREE.TextureLoader.prototype.load;THREE.TextureLoader.prototype.load=()=>new THREE.Texture();
try{
  for(const def of COURSE.filter(def=>Object.keys(baseline).some(key=>key.startsWith(def.id+'/')))){
    const course=new Course(def,1989),scene=new THREE.Group(),old=[],obstacles=JSON.stringify(course.features.obstacles);
    for(const theme of new Set(course.sections.map(section=>section.theme))){
      const view=Object.create(course);view.def={...course.def,theme};view.features={...course.features,rocks:course.features.rocks.filter(rock=>rock.theme===theme)};view.detailSections=course.sections.filter(section=>section.theme===theme);
      const group=new THREE.Group();addLandscapeDetail(group,view,theme==='alpine');const originals=auditAndReconstruct(group.children),expected=baseline[`${def.id}/${theme}`];
      equal(originals.map(mesh=>mesh.count),expected[0],'Density is unchanged in every biome');
      if(theme!=='city')equal(hash(originals.flatMap(mesh=>[mesh.geometry.attributes.position.array,mesh.instanceMatrix.array,...(mesh.instanceColor?[mesh.instanceColor.array]:[])])),expected[1],'Every non-city geometry vertex, transform and colour bit matches the old placement');
      else{
        const unchanged=['d56577b40fc9cc7b3bc182b2c9f45e4ae63f9b092bda0cb080dab65b8eba27b8','5b15b186ab8ad3add60189005f236739bd6bc02546455c8ee8bcd2470b8f3746','a555d41acd44fc4afcf18942adc4f4c7c6d980fc6a57736f69ae6c5ff366c098'];
        originals.slice(2).forEach((mesh,index)=>equal(hash([mesh.instanceMatrix.array,...(mesh.instanceColor?[mesh.instanceColor.array]:[])]),unchanged[index],'City decoration relocation leaves every physical rock/delineator transform and colour unchanged'));
      }
      originals.forEach((mesh,index)=>{check(mesh.castShadow===(index===2),'Only boulders cast shadows');check(mesh.receiveShadow===(index<3),'Original receiver flags remain unchanged');});
      const meadow=group.children.find(mesh=>mesh.userData.landscapeCell.sway>0);
      if(meadow){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};meadow.material.onBeforeCompile(shader);group.userData.updates.forEach(update=>update(4.2));check(shader.uniforms.meadowTime.value===4.2&&shader.vertexShader.includes('instanceMatrix[3].x*.17'),'The original shared world-phased wind keeps updating');}
      old.push(...originals);while(group.children.length)scene.add(group.children[0]);
    }
    equal(JSON.stringify(course.features.obstacles),obstacles,'Physical rocks and all course placements remain unchanged');scene.updateMatrixWorld(true);
    const camera=new THREE.PerspectiveCamera(60,16/9,.15,2400),shadow=new THREE.OrthographicCamera(-45,45,45,-45,1,240),report=[];
    for(const fraction of[.08,.35,.58,.72,.9]){
      const s=course.length*fraction,p=course.groundAt(s),eye=course.worldAt(s-8.7),aim=course.worldAt(s+26),lift=p.y-course.at(s).y;
      camera.position.set(eye.x,eye.y+3.65+lift,eye.z);camera.lookAt(aim.x,aim.y+1.05+lift,aim.z);
      shadow.position.set(p.x+SUN_OFFSET.x,p.y+SUN_OFFSET.y,p.z+SUN_OFFSET.z);shadow.lookAt(p.x,p.y,p.z);
      const a=submissions(old,camera),b=submissions(scene.children,camera),ad=submissions(old,camera,'ao'),bd=submissions(scene.children,camera,'ao'),as=submissions(old,shadow,'shadow'),bs=submissions(scene.children,shadow,'shadow');
      oldTotal+=a.triangles+ad.triangles+as.triangles;newTotal+=b.triangles+bd.triangles+bs.triangles;oldShadows+=as.triangles;newShadows+=bs.triangles;
      report.push({phase:fraction,color:`${a.triangles}→${b.triangles}`,shadow:`${as.triangles}→${bs.triangles}`,draws:`${a.draws}→${b.draws}`});
    }
    console.log(JSON.stringify({event:def.id,originalBatches:old.length,cellBatches:scene.children.length,samples:report}));
  }
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
check(newTotal<oldTotal*.7,'Camera, AO and shadow submissions fall materially without reducing density');check(newShadows<oldShadows*.4,'Distant rocks are removed from local shadow submissions');
console.log(`Landscape cells: ${checks} checks, ${instances} retained source instances; modelled camera/AO/shadow triangles -${((1-newTotal/oldTotal)*100).toFixed(1)}%, shadow -${((1-newShadows/oldShadows)*100).toFixed(1)}%. Browser timing determines the draw-call tradeoff.`);
