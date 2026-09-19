import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Course } from '../src/course.js';
import { COURSE } from '../src/config.js';
import { buildMountainGeometry, mountainTransform, createMountainMaterial } from '../src/mountain-landscape.js';

let checks=0,rimClearance=Infinity,roadSamples=0;
const check=(ok,message)=>{assert.ok(ok,message);checks++;};
const geometries=Array.from({length:4},(_,i)=>buildMountainGeometry(i));
for(const [variant,g] of geometries.entries()){
  const p=g.attributes.position,n=g.attributes.normal,vector=new THREE.Vector3();
  check(Math.abs(g.boundingBox.max.y-1)<1e-6,`${variant}: summit preserves the source mountain height`);
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i),radius=Math.hypot(x,z);vector.fromBufferAttribute(n,i);
    check(Number.isFinite(x+y+z)&&Number.isFinite(vector.length()),`${variant}: finite geometry`);
    check(radius<=1.0000001&&y>=0&&y<=1.000001,`${variant}: geometry exceeds collision ellipse/height`);
    check(Math.abs(vector.length()-1)<1e-5&&vector.y>0,`${variant}: upward finite unit normal`);
    if(i>=g.userData.rimStart)check(y<1e-7,`${variant}: boundary must remain buried`);
  }
  for(let i=0;i<g.index.count;i+=3){
    const a=g.index.getX(i),b=g.index.getX(i+1),c=g.index.getX(i+2);
    const upward=(p.getZ(b)-p.getZ(a))*(p.getX(c)-p.getX(a))-(p.getX(b)-p.getX(a))*(p.getZ(c)-p.getZ(a));
    check(upward>0,`${variant}: no zero-area or reversed top triangle`);
  }
}
for(let a=0;a<4;a++)for(let b=a+1;b<4;b++){
  const x=geometries[a].attributes.position,y=geometries[b].attributes.position;let difference=0;
  for(let i=0;i<x.count;i++)difference+=(x.getY(i)-y.getY(i))**2;
  check(Math.sqrt(difference/x.count)>.10,`${a}/${b}: silhouettes must differ substantially`);
}
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),ray=new THREE.Raycaster(),point=new THREE.Vector3();
for(const seed of [1989,42])for(const def of COURSE.filter(def=>!def.arena)){
  const course=new Course(def,seed),meshes=[];
  const counts=new Map();
  for(const feature of course.features.mountains){
    const index=counts.get(feature.theme)||0;counts.set(feature.theme,index+1);
    const g=geometries[index%4],matrix=mountainTransform(course,feature),mesh=new THREE.Mesh(g,material);mesh.matrixAutoUpdate=false;mesh.matrix.copy(matrix);mesh.updateMatrixWorld(true);meshes.push(mesh);
    const p=g.attributes.position;
    for(let i=g.userData.rimStart;i<p.count;i++){
      point.fromBufferAttribute(p,i).applyMatrix4(matrix);const n=course.nearest(point.x,point.z),clearance=course.groundAt(n.s,n.lateral).y-point.y;
      rimClearance=Math.min(rimClearance,clearance);check(clearance>2.5,`${def.name}/${seed}: exposed mountain rim`);
    }
    point.set(0,1,0).applyMatrix4(matrix);check(Math.abs(point.y-feature.y-feature.height)<1e-7,`${def.name}: original top height preserved`);
  }
  const sample=(s,off)=>{
    const p=course.groundAt(s,off);ray.set(new THREE.Vector3(p.x,p.y+400,p.z),new THREE.Vector3(0,-1,0));
    check(ray.intersectObjects(meshes,false).length===0,`${def.name}/${seed}: mountain blocks legal route at ${s}/${off}`);roadSamples++;
  };
  for(let s=0;s<course.length;s+=16)for(const side of [-1,0,1])sample(s,side*(course.roadHalfWidthAt(s)+.5));
  for(const cut of course.features.shortcuts)for(let s=cut.start;s<=cut.end;s+=8)for(const side of [-1,0,1])sample(s,course.shortcutOffset(cut,s)+side*(cut.halfWidth+.5));
}
for(const theme of ['alpine','desert','coast']){
  const mat=createMountainMaterial(theme,new THREE.Texture()),shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader,uniforms:{}};mat.onBeforeCompile(shader);
  check(shader.vertexShader.includes('instanceMatrix*mountainPosition'),`${theme}: world projection handles scaled instances`);
  check(shader.fragmentShader.includes('mountainNormal.y')&&shader.uniforms.mountainSnow.value===(theme==='alpine'?1:0),`${theme}: snow follows real slope and biome`);
  check(!shader.fragmentShader.includes('#include <map_fragment>')&&!shader.fragmentShader.includes('#include <normal_fragment_maps>'),`${theme}: no stretched top-down map path remains`);
}
console.log(`Mountain landscape: ${checks} checks passed; ${roadSamples} rendered route rays clear, minimum rim burial ${rimClearance.toFixed(2)}m; ${geometries[0].index.count/3} triangles per instance.`);
