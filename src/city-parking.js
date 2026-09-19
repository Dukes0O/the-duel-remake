import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export {buildCityParking,PARKED_CAR_SIZE} from './city-parking-layout.js';

function sedanGeometry(){
  const parts={paint:[],glass:[],trim:[],rubber:[],alloy:[],lamps:[]},box=new THREE.BoxGeometry(1,1,1);
  function add(kind,geometry,position=[0,0,0],rotation=[0,0,0],scale=[1,1,1],tint=0xffffff){
    const g=geometry.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale))),color=new THREE.Color(tint),colors=[];
    for(let i=0;i<g.attributes.position.count;i++)colors.push(color.r,color.g,color.b);g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));parts[kind].push(g);
  }
  function loft(sections){
    const vertices=[],indices=[];
    for(const [z,width,bottom,top]of sections)for(const [x,y]of[[-width*.88,bottom],[-width,bottom+.1],[-width,top-.07],[-width*.88,top],[width*.88,top],[width,top-.07],[width,bottom+.1],[width*.88,bottom]])vertices.push(x,y,z);
    for(let i=1;i<sections.length;i++)for(let j=0;j<8;j++){const a=(i-1)*8+j,b=(i-1)*8+(j+1)%8;indices.push(a,b+8,b,a,a+8,b+8);}
    for(let j=1;j<7;j++){indices.push(0,j,j+1);const last=(sections.length-1)*8;indices.push(last,last+j+1,last+j);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(vertices.length/3*2),2));g.setIndex(indices);g.computeVertexNormals();return g;
  }
  function glassQuad(points,outward){
    const g=new THREE.BufferGeometry(),vertices=points.flatMap(point=>point.clone().addScaledVector(outward,.007).toArray());
    const face=new THREE.Vector3().subVectors(points[1],points[0]).cross(new THREE.Vector3().subVectors(points[2],points[0]));
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
    g.setIndex(face.dot(outward)>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);g.computeVertexNormals();add('glass',g);g.dispose();
  }
  const cabinSections=[[-1.22,.8,.66,.78],[-.72,.75,.69,1.45],[.5,.74,.67,1.45],[1.10,.80,.65,.80]];
  const cabinAt=z=>{const i=cabinSections.findIndex((section,index)=>index<cabinSections.length-1&&z<=cabinSections[index+1][0]),a=cabinSections[Math.max(0,i)],b=cabinSections[Math.max(0,i)+1],t=(z-a[0])/(b[0]-a[0]);return{width:THREE.MathUtils.lerp(a[1],b[1],t),top:THREE.MathUtils.lerp(a[3],b[3],t)};};
  const body=loft([[-2.18,.79,.32,.55],[-1.7,.94,.32,.68],[-.8,.96,.32,.73],[.85,.95,.32,.69],[1.75,.88,.32,.61],[2.18,.78,.32,.54]]),cabin=loft(cabinSections);
  add('paint',body);add('paint',cabin);body.dispose();cabin.dispose();
  // The front and rear glass follow the actual tapered roof surfaces. Inset
  // quads avoid the reversed box rotations that previously formed a visor.
  for(const [a,b]of[[cabinSections[2],cabinSections[3]],[cabinSections[1],cabinSections[0]]]){
    const upper=.035,lower=.96,outward=new THREE.Vector3(0,Math.abs(b[0]-a[0]),Math.sign(b[0]-a[0])*(a[3]-b[3])).normalize();
    const edge=t=>{const z=THREE.MathUtils.lerp(a[0],b[0],t),y=THREE.MathUtils.lerp(a[3],b[3],t),width=THREE.MathUtils.lerp(a[1],b[1],t)*.88-.045;return[new THREE.Vector3(-width,y,z),new THREE.Vector3(width,y,z)];};
    const top=edge(upper),bottom=edge(lower);glassQuad([top[0],top[1],bottom[1],bottom[0]],outward);
  }
  for(const side of[-1,1]){
    // Split at the loft's corners so each pane lies on one true cabin plane.
    for(const [z0,z1]of[[-1.08,-.72],[-.72,-.085],[.005,.5],[.5,.94]]){
      const a=cabinAt(z0),b=cabinAt(z1),outward=new THREE.Vector3(side,0,-(b.width-a.width)/(z1-z0)).normalize();
      glassQuad([new THREE.Vector3(side*a.width,.82,z0),new THREE.Vector3(side*b.width,.82,z1),new THREE.Vector3(side*b.width,b.top-.12,z1),new THREE.Vector3(side*a.width,a.top-.12,z0)],outward);
    }
    add('trim',box,[side*(cabinAt(-.05).width+.021),1.075,-.05],[0,0,0],[.029,.51,.058]);
    add('trim',box,[side*.975,.97,.59],[0,0,0],[.10,.11,.23]);
    add('alloy',box,[side*.966,.52,0],[0,0,0],[.025,.032,3.30]);
    for(const z of[-.4,.4])add('trim',box,[side*.973,.79,z],[0,0,0],[.018,.026,.16]);
    add('trim',box,[side*.968,.53,-.10],[0,0,0],[.012,.26,.014]);
  }
  for(const z of[-2.22,2.22])add('trim',box,[0,.41,z],[0,0,0],[1.69,.13,.11]);
  add('trim',box,[0,.56,2.205],[0,0,0],[.72,.14,.026]);
  for(const side of[-1,1]){add('lamps',box,[side*.56,.57,2.18],[0,0,0],[.39,.17,.035],0xe2d8bc);add('lamps',box,[side*.56,.55,-2.183],[0,0,0],[.38,.17,.035],0x9e3d35);add('lamps',box,[side*.78,.56,2.145],[0,0,0],[.09,.14,.04],0xb57539);}
  add('lamps',box,[0,.47,-2.279],[0,0,0],[.43,.12,.012],0xc0baa6);
  const tire=new THREE.CylinderGeometry(.335,.335,.20,12),rim=new THREE.CylinderGeometry(.185,.185,.224,10);
  for(const x of[-.89,.89])for(const z of[-1.43,1.43]){add('rubber',tire,[x,.335,z],[0,0,Math.PI/2]);add('alloy',rim,[x,.335,z],[0,0,Math.PI/2]);add('trim',box,[x*1.135,.335,z],[0,0,0],[.012,.055,.055]);}
  tire.dispose();rim.dispose();box.dispose();
  return Object.fromEntries(Object.entries(parts).map(([key,list])=>{const geometry=mergeGeometries(list,false);list.forEach(g=>g.dispose());return[key,geometry];}));
}
function bayGeometry(course,car){
  const points=[],indices=[];for(let row=0;row<=8;row++)for(const dx of[-1.45,1.45]){const p=course.groundAt(car.bayS-6.5+row*13/8,car.bayOff+dx);points.push(p.x,p.y+.018,p.z);if(row&&dx>0){const i=row*2;indices.push(i-2,i,i-1,i-1,i,i+1);}}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

export function addCityParking(world,course){
  const cars=course.features.parkedCars||[];if(!cars.length)return null;
  const group=new THREE.Group();group.name='Parked city passenger cars';
  const geometries=sedanGeometry(),materials={
    paint:new THREE.MeshPhysicalMaterial({color:0xffffff,vertexColors:true,metalness:.52,roughness:.43,clearcoat:.55,clearcoatRoughness:.35}),
    glass:new THREE.MeshStandardMaterial({color:0x526570,metalness:.25,roughness:.26,vertexColors:true}),
    trim:new THREE.MeshStandardMaterial({color:0x22292b,roughness:.77,vertexColors:true}),
    rubber:new THREE.MeshStandardMaterial({color:0x202322,roughness:.97,vertexColors:true}),
    alloy:new THREE.MeshStandardMaterial({color:0x89908c,metalness:.75,roughness:.39,vertexColors:true}),
    lamps:new THREE.MeshStandardMaterial({color:0xffffff,metalness:.12,roughness:.32,vertexColors:true}),
  },cells=new Map(),bayCells=new Map(),seenBays=new Set(),pose=new THREE.Matrix4(),tint=new THREE.Color();
  for(const car of cars){const cell=`${Math.floor(car.x/200)}:${Math.floor(car.z/200)}`;if(!cells.has(cell))cells.set(cell,[]);cells.get(cell).push(car);
    if(!seenBays.has(car.bayId)){seenBays.add(car.bayId);if(!bayCells.has(cell))bayCells.set(cell,[]);bayCells.get(cell).push(bayGeometry(course,car));}}
  for(const [cell,entries]of cells)for(const [kind,geometry]of Object.entries(geometries)){
    const mesh=new THREE.InstancedMesh(geometry,materials[kind],entries.length);mesh.name=`Parked sedan ${kind}`;mesh.userData.parkingCell=cell;mesh.userData.parkedCarIds=entries.map(car=>car.id);
    for(let i=0;i<entries.length;i++){const car=entries[i];pose.compose(new THREE.Vector3(car.x,car.bodyY,car.z),new THREE.Quaternion().fromArray(car.quaternion),new THREE.Vector3(1,1,1));mesh.setMatrixAt(i,pose);if(kind==='paint')mesh.setColorAt(i,tint.set(car.color));}
    mesh.castShadow=kind!=='glass'&&kind!=='lamps';mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
  }
  const asphalt=new THREE.MeshStandardMaterial({color:0x454a49,roughness:.98,side:THREE.DoubleSide});
  for(const [cell,parts]of bayCells){const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());const mesh=new THREE.Mesh(geometry,asphalt);mesh.name='Roadside parking bay';mesh.userData.parkingCell=cell;mesh.receiveShadow=true;geometry.computeBoundingSphere();group.add(mesh);}
  group.userData.parkedCars=cars.length;group.userData.parkingBays=seenBays.size;world.add(group);return group;
}
