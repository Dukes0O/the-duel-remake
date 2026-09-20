import * as THREE from 'three';
import { vegetationCells } from './vegetation.js';
import { hasDetailedCityFacade } from './city-chase-detail.js';
import { addCoastalWater } from './coastal-water.js';
import { addPacificCoast, isPacificCoast } from './pacific-coast.js';
import { createCoastLighthouse } from './coast-lighthouse.js';
import { addHarborCranes } from './harbor-detail.js';

// Visual shells follow Course's existing feature footprints. Keep direct world
// children: the later scenery-detail pass refines these base structures.
export function addFurniture(group,course,metal){
  const night=course.def.theme==='city',data=course.features.poles,o=new THREE.Object3D(),wires=[];
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,11,9),new THREE.MeshStandardMaterial({color:night?0x596775:0x544336,roughness:.78,metalness:night?.65:0}),data.length);
  data.forEach((p,i)=>{o.position.set(p.x,p.y+5.5,p.z);o.rotation.set(0,p.heading,0);o.scale.setScalar(1);o.updateMatrix();poles.setMatrixAt(i,o.matrix);
    if(p.theme==='city'){
      const arm=new THREE.Group();box(arm,[6,.16,.18],[3,10.5,0],metal);
      box(arm,[1.9,.13,.8],[5.4,10.35,0],new THREE.MeshStandardMaterial({color:0xffdf9b,emissive:0xffbc60,emissiveIntensity:4}));
      arm.position.set(p.x,p.y,p.z);arm.rotation.y=p.heading;group.add(arm);
    }else if(i&&p.s-data[i-1].s<130){const previous=data[i-1];for(let j=0;j<12;j++)for(const t of[j/12,(j+1)/12])wires.push(THREE.MathUtils.lerp(previous.x,p.x,t),THREE.MathUtils.lerp(previous.y,p.y,t)+10.7-Math.sin(t*Math.PI)*1.3,THREE.MathUtils.lerp(previous.z,p.z,t));}
  });poles.castShadow=true;group.add(poles);
  if(wires.length){const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));group.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x353d3c,transparent:true,opacity:.55})));}
  const barriers=course.features.barriers,rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.38,8),metal,barriers.length),posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,1.1,.17),metal,barriers.length*2);
  barriers.forEach((p,i)=>{o.position.set(p.x,p.y+.82,p.z);o.rotation.set(0,p.heading,0);o.updateMatrix();rails.setMatrixAt(i,o.matrix);
    for(let side=0;side<2;side++){const dz=side?3.6:-3.6;o.position.set(p.x+Math.sin(p.heading)*dz,p.y+.5,p.z+Math.cos(p.heading)*dz);o.updateMatrix();posts.setMatrixAt(i*2+side,o.matrix);}
  });rails.castShadow=rails.receiveShadow=true;posts.castShadow=true;group.add(rails,posts);
}

// Shared within one environment, never across independently disposed worlds.
const turnSignResources=new WeakMap();
export function addTurnSigns(group,signs,direction){
  if(!signs.length)return;
  let assets=turnSignResources.get(group);
  if(!assets){assets={board:new THREE.BoxGeometry(1.2,1.35,.08),post:new THREE.BoxGeometry(.1,1.8,.1),metal:new THREE.MeshStandardMaterial({color:0x8e9393,metalness:.5,roughness:.6}),directions:new Map()};turnSignResources.set(group,assets);}
  let mat=assets.directions.get(direction);
  if(!mat){
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#f1bf35';x.fillRect(0,0,128,128);x.fillStyle='#1d252a';
  x.beginPath();const dir=direction;for(const [a,b]of[[20,0],[63,0],[110,64],[63,128],[20,128],[66,64]])x.lineTo(dir>0?128-a:a,b);x.closePath();x.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  mat=new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:0xb79028,emissiveMap:t,emissiveIntensity:.15});assets.directions.set(direction,mat);
  }
  const object=new THREE.Object3D(),local=new THREE.Matrix4(),worldMatrix=new THREE.Matrix4();
  for(const {key,entries}of vegetationCells(signs))for(const [kind,geometry,material,height]of[['boards',assets.board,mat,2.05],['posts',assets.post,assets.metal,.9]]){
    const mesh=new THREE.InstancedMesh(geometry,material,entries.length);mesh.name=`Turn ${kind} ${direction} ${key}`;
    local.makeTranslation(0,height,0);
    entries.forEach(({feature:p},i)=>{object.position.set(p.x,p.y,p.z);object.rotation.set(0,p.heading,0);object.updateMatrix();worldMatrix.multiplyMatrices(object.matrix,local);mesh.setMatrixAt(i,worldMatrix);});
    mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.02);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.02;
    mesh.userData.turnSignCell={key,kind,direction,entries};group.add(mesh);
  }
}

function signTexture(top, bottom, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#eee4ca'; x.lineWidth = 6; x.strokeRect(12, 12, 488, 232);
  x.fillStyle = bg === '#ede2c6' ? '#28312e' : '#f4eddc'; x.textAlign = 'center';
  for(const [text,y,size]of[[top,88,40],[bottom,177,64]]){let font=size;x.font=`bold ${font}px Arial`;while(font>22&&x.measureText(text).width>454){font--;x.font=`bold ${font}px Arial`;}x.fillText(text,256,y,454);}
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function addSign(group, sign) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, .12), new THREE.MeshStandardMaterial({ map: signTexture(sign.top,sign.bottom,sign.bg), roughness: .7 })); board.position.y = 4; g.add(board);
  for(const post of sign.posts)box(g,[post.halfX*2,post.height,post.halfZ*2],[post.localX,post.y-sign.y+post.height/2,0],new THREE.MeshStandardMaterial({color:0x646b64,metalness:.4,roughness:.6}));
  g.position.set(sign.x,sign.y,sign.z);g.rotation.y=sign.heading;group.add(g);
}

export function box(group, size, position, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...position); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}

export function addStation(world, station) {
  const p=station,checkpoint=station.checkpoint,g=new THREE.Group(),night=station.theme==='city',coast=station.theme==='coast';
  const plaster = new THREE.MeshStandardMaterial({ color: coast?0xddd4be:night?0xa5adb0:0xd7b58a, roughness: .93 });
  const red = new THREE.MeshStandardMaterial({ color: coast?0x286b82:night?0x245569:0xa83e2b, roughness: .63 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x223b40, metalness: .55, roughness: .2,emissive:0xffbf72,emissiveIntensity:night?1.6:0 });
  box(g, [21, .13, 18], [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0x8b8574, roughness: 1 }));
  box(g, [12, 4.1, 5.5], [0, 2, 5], plaster); box(g, [12.6, .35, 6], [0, 4.2, 5], red);
  for (const x of [-3.7, 3.7]) box(g, [3.6, 1.9, .04], [x, 2.15, 2.22], dark);
  box(g, [1.2, 2.7, .08], [0, 1.45, 2.2], dark); box(g, [14, .44, 6.5], [0, 4.1, -2.4], red);
  for (const x of [-5.5, 5.5]) box(g, [.24, 4, .24], [x, 2, -3], plaster);
  for (const x of [-3, 3]) {
    box(g, [.95, 1.7, .75], [x, .9, -2.5], red); box(g, [1.05, .7, .85], [x, 2, -2.5], plaster); box(g, [.6, .27, .02], [x, 2.1, -2.94], dark);
  }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.6), new THREE.MeshBasicMaterial({ map: signTexture(checkpoint ? 'THE DUEL' : 'LAST CHANCE', checkpoint ? 'CHECKPOINT' : 'FUEL  /  89', '#a83e2b') }));
  board.position.set(0, 3.45, 2.19); board.rotation.y = Math.PI; g.add(board);
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; world.add(g);
}

export function addCoast(group,course){
  addCoastalWater(group,course);
  const showcase=isPacificCoast(course);
  if(showcase){
    addPacificCoast(group,course);
    for(const p of course.features.landmarks)group.add(createCoastLighthouse(p,course));
    return;
  }
  const white=new THREE.MeshStandardMaterial({color:0xe9e4d4,roughness:.88}),dark=new THREE.MeshStandardMaterial({color:0x233e4a,metalness:.6,roughness:.45});
  for(const p of course.features.landmarks){
    const g=new THREE.Group(),tower=new THREE.Mesh(new THREE.CylinderGeometry(1.9,3.2,20,24),white);tower.position.y=10;tower.castShadow=true;g.add(tower);
    const lantern=new THREE.Mesh(new THREE.CylinderGeometry(2.05,2.05,2.5,16),new THREE.MeshStandardMaterial({color:0xffdf9f,emissive:0xffc36a,emissiveIntensity:.7,metalness:.25,roughness:.16}));lantern.position.y=21;g.add(lantern);
    const cap=new THREE.Mesh(new THREE.ConeGeometry(2.7,1.8,24),dark);cap.position.y=23.15;g.add(cap);
    for(const y of[18.8,19.4,22.3]){const ring=new THREE.Mesh(new THREE.TorusGeometry(y===18.8?2.7:2.15,.09,6,32),dark);ring.rotation.x=Math.PI/2;ring.position.y=y;g.add(ring);}
    for(let a=0;a<8;a++){const angle=a*Math.PI/4;box(g,[.1,2.7,.1],[Math.cos(angle)*2,21,Math.sin(angle)*2],dark);}
    box(g,[1.1,2.5,.13],[0,1.25,-3.12],dark);g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;group.add(g);
  }
}

export function addHarbor(group,course){
  const walls=[],roofs=[],windows=[],doors=[];
  const cellKeys=new Map();
  for(const {key,entries}of vegetationCells(course.features.buildings))for(const {feature}of entries)cellKeys.set(feature,key);
  let legacyWindowCount=0,replacedBuildings=0;
  for(const b of course.features.buildings){
    const replaced=hasDetailedCityFacade(course,b);if(replaced)replacedBuildings++;
    const window=entry=>{const tintIndex=legacyWindowCount++;if(!replaced)windows.push({...entry,tintIndex});};
    const foundation=b.foundationDepth||0;
    walls.push({b,x:0,y:(b.height-foundation)/2,z:0,sx:b.halfX*2,sy:b.height+foundation,sz:b.halfZ*2});
    roofs.push({b,x:0,y:b.height+.15,z:0,sx:b.halfX*2+.5,sy:.3,sz:b.halfZ*2+.5});
    for(const face of[-1,1]){
      doors.push({b,x:0,y:2.4,z:face*(b.halfZ+.025),sx:4.8,sy:4.8,sz:.07});
      for(let y=6;y<b.height-1;y+=3.1)for(let x=-b.halfX+1.6;x<b.halfX-1;x+=2.6)window({b,x,y,z:face*(b.halfZ+.04),sx:1.4,sy:1.1,sz:.08});
    }
    for(const face of[-1,1])for(let z=-b.halfZ+2;z<b.halfZ-1;z+=3.1)for(let y=5;y<b.height-1;y+=3.5)window({b,x:face*(b.halfX+.035),y,z,sx:.08,sy:1.15,sz:1.6});
  }
  const corrugated=new THREE.MeshStandardMaterial({color:0x687d86,roughness:.65,metalness:.25});
  corrugated.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.9+.1*sin(vViewPosition.y*19.);');};
  const o=new THREE.Object3D(),cube=new THREE.BoxGeometry(1,1,1),tint=new THREE.Color();let draws=0;
  for(const [kind,data,mat]of[['walls',walls,corrugated],['roofs',roofs,new THREE.MeshStandardMaterial({color:0x263b45,metalness:.6,roughness:.5})],['doors',doors,new THREE.MeshStandardMaterial({color:0x26363b,roughness:.82})],['windows',windows,new THREE.MeshStandardMaterial({color:0xffc783,emissive:0xffa650,emissiveIntensity:1.5,roughness:.28})]]){
    if(!data.length){mat.dispose();continue;}
    const cells=new Map();for(const d of data){const key=cellKeys.get(d.b);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(d);}
    for(const [key,entries]of cells){
      const mesh=new THREE.InstancedMesh(cube,mat,entries.length);mesh.name=`Harbor ${kind} ${key}`;
      entries.forEach((d,i)=>{const c=Math.cos(d.b.heading),s=Math.sin(d.b.heading);o.position.set(d.b.x+c*d.x+s*d.z,d.b.y+d.y,d.b.z-s*d.x+c*d.z);o.rotation.set(0,d.b.heading,0);o.scale.set(d.sx,d.sy,d.sz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);if(kind==='windows')mesh.setColorAt(i,tint.set(d.tintIndex%5===0?0x34251a:d.tintIndex%3===0?0xc4d3db:0xffebc2));});
      mesh.castShadow=kind==='walls';mesh.receiveShadow=true;mesh.computeBoundingBox();mesh.boundingBox.expandByScalar(.02);mesh.computeBoundingSphere();mesh.boundingSphere.radius+=.02;
      mesh.userData.harborCell={key,kind,buildings:[...new Set(entries.map(entry=>entry.b.id))]};group.add(mesh);draws++;
    }
  }
  if(!draws)cube.dispose();
  group.userData.harborBuildings={buildings:course.features.buildings.length,replacedBuildings,legacyWindowCount,fallbackWindows:windows.length,removedWindowBoxes:legacyWindowCount-windows.length,draws};
  addHarborCranes(group,course);
}

export function addFinish(group, course) {
  const p = course.worldAt(0), width=course.roadHalfWidthAt(0)+1.5,g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x354545, metalness: .55, roughness: .55 });
  box(g, [.5, 9, .5], [-width, 4.5, 0], mat); box(g, [.5, 9, .5], [width, 4.5, 0], mat);
  const b = box(g, [width*2+.5, 1.8, .3], [0, 8.5, 0], new THREE.MeshStandardMaterial({ map: signTexture('THE DUEL', 'START / FINISH', '#b94429') }));
  b.rotation.y = Math.PI; g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; group.add(g);
}
