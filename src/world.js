import * as THREE from 'three';
import { makeRng } from './rng.js';
import { addLandscapeDetail } from './landscape-detail.js';
import { addPineTrees, vegetationCells } from './vegetation.js';
import { addDesertCacti } from './desert-detail.js';
import { hasDetailedCityFacade } from './city-chase-detail.js';
import { addSceneryDetail } from './scenery-detail.js';
import { addRaceStructures } from './race-structures.js';
import { addArenaCrushables } from './arena-props.js';
import { addRallyDetail } from './rally-detail.js';
import { addMountainLandscape, rockTexture } from './mountain-landscape.js';
import { addCoastalWater } from './coastal-water.js';
import { addCheckpointGates } from './checkpoint-gates.js';
import { createTerrainMaterial, terrainStyleAt } from './terrain-style.js';
import { createPavedRoadMaterial, createPavedShoulderMaterial } from './road-surface.js';
import { createPolylineIndex } from './polyline-index.js';
import { addCitySkyline } from './city-skyline.js';
import { addCityParking } from './city-parking.js';

const TERRAIN_THEMES=['desert','alpine','coast','city','arena'];

export function buildEnvironment(course) {
  const group = new THREE.Group(), alpine = course.def.theme === 'alpine', night=course.def.theme==='city';
  const roadMat = createPavedRoadMaterial({asphalt:surfaceTexture('asphalt'),night});
  const groundMat=createTerrainMaterial({earth:groundTexture('color'),grass:meadowTexture(),city:surfaceTexture('asphalt'),rock:rockTexture('alpine'),normal:groundTexture('normal'),roughness:groundTexture('roughness')});
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8d2a5, roughness: .8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd8a943, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa6aaa5, metalness: .55, roughness: .57 });
  const terrain = new THREE.Mesh(terrainGeometry(course, alpine), groundMat); terrain.receiveShadow = true; group.add(terrain);
  const farTerrain = new THREE.Mesh(farTerrainGeometry(course, alpine), groundMat); farTerrain.receiveShadow = true; group.add(farTerrain);
  const trailMat=new THREE.MeshStandardMaterial({map:surfaceTexture('gravel'),bumpMap:surfaceTexture('gravel'),bumpScale:.035,color:course.def.arena?0xb39372:0xbeb4a3,roughness:1});
  const road = new THREE.Mesh(strip(course, s=>-course.roadHalfWidthAt(s), s=>course.roadHalfWidthAt(s), .035), course.def.arena||course.def.offroad?trailMat:roadMat); road.receiveShadow = true; group.add(road);
  const shoulder = createPavedShoulderMaterial({gravel:surfaceTexture('gravel'),alpine,course});
  for (const side of [-1, 1]) {
    if(course.def.offroad||course.def.arena)addTrailShoulder(group,course,side,trailMat);
    else group.add(new THREE.Mesh(strip(course, s=>side*course.roadHalfWidthAt(s), s=>side*(course.roadHalfWidthAt(s)+1.25), .018), shoulder));
    if(!course.def.arena&&!course.def.offroad){group.add(new THREE.Mesh(strip(course, s=>side*(course.roadHalfWidthAt(s)-.45), s=>side*(course.roadHalfWidthAt(s)-.28), .057), cream));
    group.add(new THREE.Mesh(strip(course, side * .12, side * .22, .058), yellow));}
  }
  for(const theme of new Set(course.sections.map(s=>s.theme))){
    if(theme==='arena')continue;
    const view=Object.create(course);view.def={...course.def,theme};view.features={...course.features};
    for(const field of ['mountains','trees','rocks'])view.features[field]=course.features[field].filter(p=>p.theme===theme);
    view.detailSections=course.sections.filter(s=>s.theme===theme);
    addLandscape(group,view,theme==='alpine');addLandscapeDetail(group,view,theme==='alpine');
  }
  addFurniture(group, course, metal);
  const crushables=addArenaCrushables(group,course);if(crushables)group.userData.updateSimulation=crushables.userData.updateSimulation;
  for(const cut of course.features.shortcuts){
    const paved=cut.surface==='paved',gravel=paved?roadMat:trailMat;
    const path=new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)-cut.halfWidth,s=>course.shortcutOffset(cut,s)+cut.halfWidth,.065,cut.start,cut.end,true),gravel);path.receiveShadow=true;group.add(path);
    if(paved)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.35),s=>course.shortcutOffset(cut,s)+side*(cut.halfWidth-.2),.078,cut.start,cut.end,true),cream));
    for(let s=cut.start+25;s<cut.end-20;s+=40)for(const side of[-1,1]){const p=course.groundAt(s,course.shortcutOffset(cut,s)+side*(cut.halfWidth+.7));box(group,[.13,1.25,.13],[p.x,p.y+.625,p.z],yellow);}
  }
  for(const lane of course.features.passingLanes){
    for(let s=lane.start+55;s<lane.end-50;s+=18)for(const side of[-1,1])group.add(new THREE.Mesh(strip(course,side*6.45,side*6.6,.07,s,s+7),cream));
  }
  for(const sign of course.features.signs)addSign(group,sign);
  for(const station of course.features.stations)addStation(group, course, station);
  for(const direction of[-1,1])addTurnSigns(group,course.features.chevrons.filter(sign=>sign.direction===direction),direction);
  if(course.sections.some(s=>s.theme==='coast'))addCoast(group,course);
  if(course.sections.some(s=>s.theme==='city'))addHarbor(group,course);
  addCitySkyline(group,course);
  addCityParking(group,course);
  addSceneryDetail(group,course);
  addRaceStructures(group,course);
  addRallyDetail(group,course);
  addFinish(group, course);
  addCheckpointGates(group,course);
  return group;
}

// Scoring clamps to the course; cameras need a tangent beyond the endpoints.
export function worldAtExtended(course, s, lateral = 0) {
  if(course.closed)return course.worldAt(s,lateral);
  const p = course.worldAt(s, lateral), extra = s < 0 ? s : s > course.length ? s - course.length : 0;
  p.x += Math.sin(p.heading) * extra; p.z += Math.cos(p.heading) * extra; return p;
}

export function strip(course, left, right, y, start=0, end=course.length, ground=false) {
  const verts = [], uvs = [], indices = [];
  const followsGround=ground||course.def.arena||course.def.offroad;
  const steps=Math.ceil((end-start)/(followsGround?2:8));
  let maxWidth=0;
  for(let n=0;n<=steps;n++){const s=start+(end-start)*n/steps;maxWidth=Math.max(maxWidth,Math.abs((typeof right==='function'?right(s):right)-(typeof left==='function'?left(s):left)));}
  // Thin painted lines and feathered shoulders retain their two edge columns.
  // Broad ground-following surfaces need interior samples at branch merges.
  const columns=followsGround&&maxWidth>2.5?Math.ceil(maxWidth)+1:2;
  for (let n=0;n<=steps;n++) {const s=start+(end-start)*n/steps;
    const edges=[typeof left==='function'?left(s):left,typeof right==='function'?right(s):right].sort((a,b)=>a-b);
    for(let j=0;j<columns;j++){const off=THREE.MathUtils.lerp(edges[0],edges[1],j/(columns-1)),p=followsGround?course.groundAt(s,off):worldAtExtended(course,s,off);verts.push(p.x,p.y+y,p.z);uvs.push(off/5,s/10);
      if(n&&j){const a=n*columns+j;indices.push(a-columns-1,a-1,a-columns,a-columns,a-1,a);}}
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

export function terrainGeometry(course, alpine) {
  const v = [], colors = [], uv = [], weights = [], groups = TERRAIN_THEMES.map(()=>[]);
  // Keep the road extrusion narrower than the tightest bend radius. Wider
  // strips fold back across the road; the outer landscape uses a world grid.
  const baseOffsets = course.def.arena?[-42,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,42]:(course.def.kind==='chase'||course.def.layout==='city')?[-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]:[-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
  const base = new THREE.Color(groundTint(course)), col = new THREE.Color(); let row = 0;
  const terrainStep=course.def.offroad||course.def.arena?2:4;
  for (let s = 0; s <= course.length; s += terrainStep, row++) {
    // Match the branch's flattened bed exactly. A fixed coarse cross-section
    // can interpolate the hillside through an otherwise clear shortcut.
    const offsets=[...baseOffsets];
    if(course.def.offroad||course.def.arena){const width=course.roadHalfWidthAt(s),segments=Math.ceil(width*2);for(let i=0;i<=segments;i++)offsets.push(-width+width*2*i/segments);}
    for(const cut of course.features.shortcuts){const center=course.shortcutOffset(cut,s);for(const offset of[-cut.halfWidth-9,-cut.halfWidth-3,0,cut.halfWidth+3,cut.halfWidth+9])offsets.push(center+offset);
      if(course.def.offroad){const segments=Math.ceil(cut.halfWidth*2);for(let i=0;i<=segments;i++)offsets.push(center-cut.halfWidth+cut.halfWidth*2*i/segments);}}
    offsets.sort((a,b)=>a-b);
    const style=terrainStyleAt(course,s);base.copy(style.color);const indices=groups[TERRAIN_THEMES.indexOf(course.themeAt(Math.max(0,s-terrainStep)))];
    offsets.forEach((off, j) => {
      const p = course.groundAt(s,off),wave=Math.sin(s*.012+off*.017)*Math.cos(s*.004-off*.031);
      v.push(p.x,p.y,p.z); uv.push(p.x/22,p.z/22);weights.push(...style.weights);
      col.copy(base).multiplyScalar(.86 + .13 * wave + .07 * Math.sin(s * .025)); colors.push(col.r, col.g, col.b);
      if (row && j) { const a = row * offsets.length + j; indices.push(a - offsets.length - 1, a - 1, a - offsets.length, a - offsets.length, a - 1, a); }
    });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));g.setAttribute('biomeWeights',new THREE.Float32BufferAttribute(weights,3)); setMaterialGroups(g,groups); g.computeVertexNormals(); return g;
}

export function farTerrainGeometry(course, alpine) {
  const grid=(course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena?16:32;
  const route=course.samples.filter((_,i)=>i%4===0),last=course.samples.at(-1);
  if(route.at(-1)!==last)route.push(last);
  const routeIndex=createPolylineIndex(route);
  const extent=course.def.arena?260:(course.def.kind==='chase'||course.def.layout==='city')?400:1100;
  const minX=Math.floor((Math.min(...route.map(p=>p.x))-extent)/grid)*grid,maxX=Math.max(...route.map(p=>p.x))+extent;
  const minZ=Math.floor((Math.min(...route.map(p=>p.z))-extent)/grid)*grid,maxZ=Math.max(...route.map(p=>p.z))+extent;
  const columns=Math.ceil((maxX-minX)/grid)+1,rows=Math.ceil((maxZ-minZ)/grid)+1;
  const v=[],uv=[],colors=[],weights=[],distances=[],groups=TERRAIN_THEMES.map(()=>[]),base=new THREE.Color(groundTint(course)),col=new THREE.Color();
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const x=minX+i*grid,z=minZ+j*grid,{index,t,distanceSq:best}=routeIndex.query(x,z);
    const a=route[index-1],b=route[index],dx=b.x-a.x,dz=b.z-a.z,px=x-a.x-t*dx,pz=z-a.z-t*dz;
    const roadS=a.s+(b.s-a.s)*t,off=Math.sqrt(best)*Math.sign(px*dz-pz*dx);
    const wave=Math.sin(roadS*.012+off*.017)*Math.cos(roadS*.004-off*.031);
    v.push(x,course.groundAt(roadS,off).y-.15,z);uv.push(x/22,z/22);distances.push(Math.sqrt(best));
    const style=terrainStyleAt(course,roadS);weights.push(...style.weights);base.copy(style.color);col.copy(base).multiplyScalar(.86+.13*wave+.07*Math.sin(roadS*.025));colors.push(col.r,col.g,col.b);
    if(i&&j){const a=j*columns+i,quad=[a-columns-1,a-1,a-columns,a];
      // Leave a gap safely covered by the narrow, precisely fitted road strip.
      if(quad.every(k=>distances[k]>(course.def.arena?18:(course.def.kind==='chase'||course.def.layout==='city')?50:80)))groups[TERRAIN_THEMES.indexOf(course.themeAt(roadS))].push(quad[0],quad[1],quad[2],quad[2],quad[1],quad[3]);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('biomeWeights',new THREE.Float32BufferAttribute(weights,3));setMaterialGroups(g,groups);g.computeVertexNormals();return g;
}

function setMaterialGroups(geometry,groups){const indices=[];groups.forEach((group,material)=>{geometry.addGroup(indices.length,group.length,material);for(const index of group)indices.push(index);});geometry.setIndex(indices);}

const groundMaps = new Map();
let meadowMap;
function meadowTexture(){if(!meadowMap){meadowMap=new THREE.TextureLoader().load('/assets/textures/mountain-meadow.png');meadowMap.wrapS=meadowMap.wrapT=THREE.RepeatWrapping;meadowMap.repeat.set(4,4);meadowMap.colorSpace=THREE.SRGBColorSpace;meadowMap.anisotropy=8;meadowMap.userData.sharedAsset=true;}return meadowMap;}
function groundTexture(kind) {
  if (!groundMaps.has(kind)) {
    const texture = new THREE.TextureLoader().load(`/assets/textures/ground-${kind}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8.8, 8.8); texture.anisotropy = 8; texture.userData.sharedAsset = true;
    if (kind === 'color') texture.colorSpace = THREE.SRGBColorSpace;
    groundMaps.set(kind, texture);
  }
  return groundMaps.get(kind);
}

function surfaceTexture(kind) {
  if(kind==='asphalt'||kind==='gravel'){
    if(!groundMaps.has(kind)){const texture=new THREE.TextureLoader().load(`/assets/textures/${kind==='asphalt'?'race-asphalt':'rally-gravel'}.png`);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.25,2.5);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.userData.sharedAsset=true;groundMaps.set(kind,texture);}
    return groundMaps.get(kind);
  }
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'), img = ctx.createImageData(256, 256), rng = makeRng(kind === 'sand' ? 24 : 29);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = kind === 'sand' ? 205 + rng.range(-20, 20) : 68 + rng.range(-16, 16);
    img.data[i] = n; img.data[i + 1] = n; img.data[i + 2] = n; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (kind === 'asphalt') {
    ctx.strokeStyle = 'rgba(12,12,12,.24)'; ctx.lineWidth = 1;
    for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(rng.range(0, 256), 0); for (let y = 0; y < 256; y += 30) ctx.lineTo(100 + Math.sin(y * .025 + j) * 95, y); ctx.stroke(); }
  }
  const t = new THREE.CanvasTexture(canvas); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function groundTint(course,theme=course.def.theme){return {alpine:'#b7cbb3',desert:'#d7c6ac',coast:'#c0c7a2',city:'#929899',arena:'#ba9873'}[theme];}

function addTrailShoulder(group,course,side,trailMaterial){
  const geo=strip(course,s=>side*(course.roadHalfWidthAt(s)-.1),s=>side*(course.roadHalfWidthAt(s)+1.4+.25*Math.sin(s*.18)),.039,0,course.length,true);
  const uv=[];for(let i=0;i<geo.attributes.position.count;i++)uv.push(side>0?i%2:1-i%2,.5);geo.setAttribute('uv1',new THREE.Float32BufferAttribute(uv,2));
  const pixels=new Uint8Array(64*4);for(let i=0;i<64;i++){const fade=Math.round(255*(1-i/63)**1.5);pixels.set([fade,fade,fade,255],i*4);}
  const alpha=new THREE.DataTexture(pixels,64,1);alpha.channel=1;alpha.needsUpdate=true;alpha.magFilter=alpha.minFilter=THREE.LinearFilter;
  const mat=trailMaterial.clone();mat.transparent=true;mat.depthWrite=false;mat.alphaMap=alpha;
  const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;group.add(mesh);
}

function addLandscape(group,course,alpine){
  addMountainLandscape(group,course);
  const trees=course.features.trees;
  const pine=course.def.theme!=='desert';
  if(pine)addPineTrees(group,trees);
  else addDesertCacti(group,course);
}

function addFurniture(group,course,metal){
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

function addSign(group, sign) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, .12), new THREE.MeshStandardMaterial({ map: signTexture(sign.top,sign.bottom,sign.bg), roughness: .7 })); board.position.y = 4; g.add(board);
  for(const post of sign.posts)box(g,[post.halfX*2,post.height,post.halfZ*2],[post.localX,post.y-sign.y+post.height/2,0],new THREE.MeshStandardMaterial({color:0x646b64,metalness:.4,roughness:.6}));
  g.position.set(sign.x,sign.y,sign.z);g.rotation.y=sign.heading;group.add(g);
}

function box(group, size, position, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...position); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}

function addStation(world, course, station) {
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

function addCoast(group,course){
  addCoastalWater(group,course);
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
  const steel=new THREE.MeshStandardMaterial({color:0x3e5966,metalness:.7,roughness:.55}),amber=new THREE.MeshStandardMaterial({color:0xffb93d,emissive:0xf77722,emissiveIntensity:1.8});
  for(let s=420;s<course.length;s+=680){
    if(course.themeAt(s)!=='city')continue;
    const p=course.groundAt(s,130),g=new THREE.Group();
    for(const x of[-12,12])box(g,[1.4,45,1.4],[x,22.5,0],steel);
    box(g,[27,2,2],[0,44,0],steel);box(g,[2,2,70],[0,47,-10],steel);box(g,[.15,31,.15],[0,31,-36],steel);box(g,[2,.5,2],[0,15.5,-36],amber);
    g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;group.add(g);
  }
}

function addFinish(group, course) {
  const p = course.worldAt(0), width=course.roadHalfWidthAt(0)+1.5,g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x354545, metalness: .55, roughness: .55 });
  box(g, [.5, 9, .5], [-width, 4.5, 0], mat); box(g, [.5, 9, .5], [width, 4.5, 0], mat);
  const b = box(g, [width*2+.5, 1.8, .3], [0, 8.5, 0], new THREE.MeshStandardMaterial({ map: signTexture('THE DUEL', 'START / FINISH', '#b94429') }));
  b.rotation.y = Math.PI; g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; group.add(g);
}

export function disposeTree(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(o => { if(o.isInstancedMesh)o.dispose(); if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); } });
  geometries.forEach(g => { if (!g.userData.sharedAsset) g.dispose(); });
  materials.forEach(m => { if (!m.userData.sharedAsset) m.dispose(); });
  textures.forEach(t => { if (!t.userData.sharedAsset) t.dispose(); });
}
