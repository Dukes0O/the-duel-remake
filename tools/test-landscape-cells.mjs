import {ALL_CIRCUITS} from '../src/circuits/index.js';
import * as pitQueries from '../src/pit-lane.js';
import {animateScene} from '../src/scene-systems.js';
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
// Source-order geometry, transform and colour snapshots, refreshed for the
// deliberately revised version-4 natural routes. Legal scenery placement can
// change rock counts with a new curve; batching must still retain every source
// instance and all of its buffer values exactly. Hashes refreshed for FIX-GRASS-GROUND:
// grass, tufts and grit now stand on the drawn ground and off every road, so heights and a few positions moved.
const baseline={
  'pacific-canyon/desert':[[1820,780,94,138,138],'770c437039a939e21343325e7faecc2c495dda38f52a874a64dbcb4fc16cffa2'],
  'pacific-canyon/coast':[[6720,720,81,128,128],'c29595e0249bee30e8c1b9bc4f2b2de2861e7935bf41afe214c192ea7140ac1c'],
  'high-country/desert':[[910,390,49,84,84],'e0cde697d56ed7372add72a2185fd1fbd9f14aacc45cc81a840413cba18d5d0f'],
  'high-country/alpine':[[6720,720,80,144,144],'abc10f7772a8dd895fa94bc807fe20c2a9730d636e20d182f91fe11fc3fbd239'],
  'high-country/coast':[[3640,390,37,84,84],'5af288278a1980f937c45970908975d8f4f883356ee9a506d4bd90898a457c24'],
  'harbor-highlands/city':[[408,510,48,100,100],'f03a4c3f26e9ebcae8b5940ab340be2eb6c7f7d37a3e1cceb13f099528df00a4'],
  'harbor-highlands/alpine':[[5040,540,66,96,96],'ea4100675c8adf4a2ef3f99c70857397b46edc171aa06432c88fe284dd5df379'],
  'harbor-highlands/coast':[[4200,450,61,88,88],'0b32cfc7c42861811b3ac39300488e6810f1ab7cb54c7f1ff85c44c62e006e4f'],
  'ridge-rally/desert':[[1470,630,68,98,98],'2a9fcf5974d36190461dbd7369a5c6f5feb658e506999c6fb2726aa40d8712db'],
  'ridge-rally/alpine':[[8120,870,103,126,126],'2f502f58aeda0536e59da03bc5e98984a84d42c5b26994d6e8acd4d9a8fe00c3'],
};

function auditAndReconstruct(meshes){
  const originals=[];
  for(const kind of kinds){
    const cells=meshes.filter(mesh=>mesh.userData.landscapeCell.kind===kind);if(!cells.length)continue;
    const first=cells[0],count=cells.reduce((total,mesh)=>total+mesh.count,0),seen=new Set();
    equal(count,first.userData.landscapeCell.sourceCount,'Batching preserves the entire source population');
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
      equal(originals.map(mesh=>mesh.count),expected[0],'Density matches the audited version-4 route in every biome');
      if(theme!=='city')equal(hash(originals.flatMap(mesh=>[mesh.geometry.attributes.position.array,mesh.instanceMatrix.array,...(mesh.instanceColor?[mesh.instanceColor.array]:[])])),expected[1],'Every non-city geometry vertex, transform and colour bit matches the audited placement');
      else{
        const unchanged=['d56577b40fc9cc7b3bc182b2c9f45e4ae63f9b092bda0cb080dab65b8eba27b8','5b15b186ab8ad3add60189005f236739bd6bc02546455c8ee8bcd2470b8f3746','a555d41acd44fc4afcf18942adc4f4c7c6d980fc6a57736f69ae6c5ff366c098'];
        originals.slice(2).forEach((mesh,index)=>equal(hash([mesh.instanceMatrix.array,...(mesh.instanceColor?[mesh.instanceColor.array]:[])]),unchanged[index],'City decoration relocation leaves every physical rock/delineator transform and colour unchanged'));
      }
      originals.forEach((mesh,index)=>{check(mesh.castShadow===(index===2),'Only boulders cast shadows');check(mesh.receiveShadow===(index<3),'Original receiver flags remain unchanged');});
      const meadow=group.children.find(mesh=>mesh.userData.landscapeCell.sway>0);
      if(meadow){const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};meadow.material.onBeforeCompile(shader);animateScene(group,4.2);check(shader.uniforms.meadowTime.value===4.2&&shader.vertexShader.includes('instanceMatrix[3].x*.17'),'The original shared world-phased wind keeps updating');}
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

  // Use actual course queries and original source indices, not a reseeded or relocated control.
  for(const id of ['ardennes-forest','panorama-ridge','tremblant-snow','summit-run']){
    const course=new Course(ALL_CIRCUITS.find(row=>row.id===id),1989);
    const control=Object.create(course);control.pitLane=null;
    const original=new THREE.Group(),filtered=new THREE.Group();
    addLandscapeDetail(original,control,true);addLandscapeDetail(filtered,course,true);
    const snapshot=group=>{
      const values=new Map();for(const mesh of group.children){const data=mesh.userData.landscapeCell;if(!data)continue;
        for(let i=0;i<mesh.count;i++)values.set(data.kind+'/'+data.indices[i],{
          kind:data.kind,matrix:Array.from(mesh.instanceMatrix.array.subarray(i*16,i*16+16)),
          color:mesh.instanceColor?Array.from(mesh.instanceColor.array.subarray(i*3,i*3+3)):null});}
      return values;
    };
    const before=snapshot(original),after=snapshot(filtered);let expectedRemoved=0;
    assert.equal(typeof pitQueries.pitRoadAt,'function');
    for(const [key,row] of before){const n=course.nearest(row.matrix[12],row.matrix[14]);
      const inPit=row.kind==='foliage'&&!!pitQueries.pitRoadAt(course,n.s,n.lateral);
      if(inPit){expectedRemoved++;assert.ok(!after.has(key),'no original plant root remains on pit pavement: '+id+'/'+key);}
      else assert.deepEqual(after.get(key),row,'every non-pit transform and color retains its original source index');
    }
    assert.equal(after.size,before.size-expectedRemoved);
    // FIX-GRASS-GROUND: the five roots that stood on the main-road apron are now moved off the road by the
    // road-avoidance rule before this pit filter looks, so none is left to remove. The filter still holds:
    // no plant root of the real scene stands on pit pavement.
    if(id==='ardennes-forest')assert.equal(expectedRemoved,0,'road avoidance already moved the five apron roots off the pit pavement');
    for(const [key,row] of after){const n=course.nearest(row.matrix[12],row.matrix[14]);
      assert.ok(!(row.kind==='foliage'&&pitQueries.pitRoadAt(course,n.s,n.lateral)),'no plant root of the real scene stands on pit pavement: '+id+'/'+key);}
    console.log(JSON.stringify({pitPlants:id,removed:expectedRemoved,retained:after.size}));
  }
}finally{THREE.TextureLoader.prototype.load=originalLoad;}
check(newTotal<oldTotal*.7,'Camera, AO and shadow submissions fall materially without reducing density');check(newShadows<oldShadows*.4,'Distant rocks are removed from local shadow submissions');
console.log(`Landscape cells: ${checks} checks, ${instances} retained source instances; modelled camera/AO/shadow triangles -${((1-newTotal/oldTotal)*100).toFixed(1)}%, shadow -${((1-newShadows/oldShadows)*100).toFixed(1)}%. Browser timing determines the draw-call tradeoff.`);
