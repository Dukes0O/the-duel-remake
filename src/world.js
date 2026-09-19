import * as THREE from 'three';
import { makeRng } from './rng.js';
import { addLandscapeDetail } from './landscape-detail.js';
import { vegetationGeometry, pineTreeAssets } from './vegetation.js';
import { addSceneryDetail } from './scenery-detail.js';

export function buildEnvironment(course) {
  const group = new THREE.Group(), alpine = course.def.theme === 'alpine', night=course.def.theme==='city';
  const roadMat = new THREE.MeshStandardMaterial({ map: surfaceTexture('asphalt'), roughness: night?.58:.93, color: night?0x737d87:0x8b8e90, metalness:night?.025:0 });
  const groundMat = new THREE.MeshStandardMaterial({ map: night?surfaceTexture('asphalt'):(alpine||course.def.theme==='coast')?meadowTexture():groundTexture('color'), normalMap: groundTexture('normal'), roughnessMap: groundTexture('roughness'), normalScale: new THREE.Vector2(.65,.65), roughness: 1, vertexColors: true });
  roadMat.bumpMap=roadMat.map;roadMat.bumpScale=.028;
  const cream = new THREE.MeshStandardMaterial({ color: 0xe8d2a5, roughness: .8 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xd8a943, roughness: .85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa6aaa5, metalness: .55, roughness: .57 });
  const terrain = new THREE.Mesh(terrainGeometry(course, alpine), groundMat); terrain.receiveShadow = true; group.add(terrain);
  const farTerrain = new THREE.Mesh(farTerrainGeometry(course, alpine), groundMat); farTerrain.receiveShadow = true; group.add(farTerrain);
  const road = new THREE.Mesh(strip(course, -7, 7, .035), roadMat); road.receiveShadow = true; group.add(road);
  const shoulder = new THREE.MeshStandardMaterial({ color: alpine ? 0xa09d85 : 0xb7a089, roughness: 1 });
  for (const side of [-1, 1]) {
    group.add(new THREE.Mesh(strip(course, side * 7, side * 8.25, .018), shoulder));
    group.add(new THREE.Mesh(strip(course, side * 6.55, side * 6.72, .057), cream));
    group.add(new THREE.Mesh(strip(course, side * .12, side * .22, .058), yellow));
  }
  addLandscape(group, course, alpine);
  addFurniture(group, course, metal);
  addLandscapeDetail(group,course,alpine);
  for (const trap of course.features.radarTraps) addSign(group, course, trap.s - 160, 10.8, 'SPEED LIMIT', `${trap.limitMph}`, '#ede2c6');
  addSign(group, course, 105, -11, {alpine:'ALPINE PASS',desert:'MOJAVE',coast:'PACIFIC COAST',city:'HARBOR DISTRICT'}[course.def.theme], 'NORTH  /  89', '#25433d');
  addSign(group, course, course.length - 220, -11, 'CHECKPOINT', '200 M', '#ce4c2d');
  for(const station of course.features.stations)addStation(group, course, station);
  for(const turn of course.features.turns)addTurnSigns(group,course,turn);
  if(course.def.theme==='coast')addCoast(group,course);
  if(night)addHarbor(group,course);
  addSceneryDetail(group,course);
  addFinish(group, course);
  return group;
}

// Scoring clamps to the course; cameras need a tangent beyond the endpoints.
export function worldAtExtended(course, s, lateral = 0) {
  const p = course.worldAt(s, lateral), extra = s < 0 ? s : s > course.length ? s - course.length : 0;
  p.x += Math.sin(p.heading) * extra; p.z += Math.cos(p.heading) * extra; return p;
}

function strip(course, left, right, y) {
  if (left > right) [left, right] = [right, left];
  const verts = [], uvs = [], indices = [];
  for (let s = -40, n = 0; s <= course.length + 48; s += 8, n++) {
    for (const off of [left, right]) { const p = worldAtExtended(course, s, off); verts.push(p.x, p.y + y, p.z); uvs.push(off / 5, s / 10); }
    if (n) { const a = n * 2; indices.push(a - 2, a, a - 1, a - 1, a, a + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

function terrainGeometry(course, alpine) {
  const v = [], colors = [], uv = [], indices = [];
  // Keep the road extrusion narrower than the tightest bend radius. Wider
  // strips fold back across the road; the outer landscape uses a world grid.
  const offsets = [-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
  const base = new THREE.Color(groundTint(course)), col = new THREE.Color(); let row = 0;
  for (let s = -160; s <= course.length + 160; s += 8, row++) {
    offsets.forEach((off, j) => {
      const p = course.groundAt(s,off),wave=Math.sin(s*.012+off*.017)*Math.cos(s*.004-off*.031);
      v.push(p.x,p.y,p.z); uv.push(p.x/22,p.z/22);
      col.copy(base).multiplyScalar(.86 + .13 * wave + .07 * Math.sin(s * .025)); colors.push(col.r, col.g, col.b);
      if (row && j) { const a = row * offsets.length + j; indices.push(a - offsets.length - 1, a - 1, a - offsets.length, a - offsets.length, a - 1, a); }
    });
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(indices); g.computeVertexNormals(); return g;
}

function farTerrainGeometry(course, alpine) {
  const route=course.samples.filter((_,i)=>i%4===0),last=course.samples.at(-1);
  if(route.at(-1)!==last)route.push(last);
  const minX=Math.floor((Math.min(...route.map(p=>p.x))-1100)/32)*32,maxX=Math.max(...route.map(p=>p.x))+1100;
  const minZ=Math.floor((Math.min(...route.map(p=>p.z))-1100)/32)*32,maxZ=Math.max(...route.map(p=>p.z))+1100;
  const columns=Math.ceil((maxX-minX)/32)+1,rows=Math.ceil((maxZ-minZ)/32)+1;
  const v=[],uv=[],colors=[],distances=[],indices=[],base=new THREE.Color(groundTint(course)),col=new THREE.Color();
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const x=minX+i*32,z=minZ+j*32;let best=Infinity,roadY=0,roadS=0,off=0;
    for(let n=1;n<route.length;n++){
      const a=route[n-1],b=route[n],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
      const px=x-a.x-t*dx,pz=z-a.z-t*dz,d=px*px+pz*pz;
      if(d<best){best=d;roadY=a.y+(b.y-a.y)*t;roadS=a.s+(b.s-a.s)*t;off=Math.sqrt(d)*Math.sign(px*dz-pz*dx);}
    }
    const wave=Math.sin(roadS*.012+off*.017)*Math.cos(roadS*.004-off*.031);
    v.push(x,course.groundAt(roadS,off).y-.15,z);uv.push(x/22,z/22);distances.push(Math.sqrt(best));
    col.copy(base).multiplyScalar(.86+.13*wave+.07*Math.sin(roadS*.025));colors.push(col.r,col.g,col.b);
    if(i&&j){const a=j*columns+i,quad=[a-columns-1,a-1,a-columns,a];
      // Leave a gap safely covered by the narrow, precisely fitted road strip.
      if(quad.every(k=>distances[k]>80))indices.push(quad[0],quad[1],quad[2],quad[2],quad[1],quad[3]);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

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

function groundTint(course){return {alpine:'#b7cbb3',desert:'#d7c6ac',coast:'#c0c7a2',city:'#929899'}[course.def.theme];}

function addLandscape(group,course,alpine){
  // Eroded height-field massifs: offset peaks and uneven ridges avoid cone silhouettes.
  const vertices=[],uvs=[],colors=[],indices=[],heights=[],segments=48;
  let highest=0;
  for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
    let x=i/segments*2-1,z=j/segments*2-1,r=Math.hypot(x,z);if(r>1){x/=r;z/=r;r=1;}
    const peak=Math.max(Math.exp(-((x+.25)**2/.28+(z-.08)**2/.3)),.88*Math.exp(-((x-.36)**2/.16+(z+.19)**2/.27)),.65*Math.exp(-((x+.12)**2/.35+(z+.46)**2/.1)));
    const ridge=1+.1*Math.sin(x*21+z*13)+.045*Math.sin(x*44-z*27);
    const h=peak*Math.pow(Math.max(0,1-r*r*r*r),.7)*ridge;heights.push(h);highest=Math.max(highest,h);vertices.push(x,h,z);uvs.push(x*2,z*2);
    if(i&&j){const n=j*(segments+1)+i;indices.push(n-segments-2,n-1,n-segments-1,n-segments-1,n-1,n);}
  }
  for(let i=0;i<heights.length;i++){
    const h=heights[i]/highest;vertices[i*3+1]=h;
    const snow=alpine?THREE.MathUtils.smoothstep(h+.05*Math.sin(vertices[i*3]*19),.67,.83):0;
    const c=new THREE.Color(alpine?'#b0bcc0':course.def.theme==='coast'?'#b7b9a5':'#dfcbbb');c.lerp(new THREE.Color('#ffffff'),snow);colors.push(c.r,c.g,c.b);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const upward=[];for(let n=0;n<indices.length;n+=3){const a=indices[n]*3,b=indices[n+1]*3,c=indices[n+2]*3;if((vertices[b+2]-vertices[a+2])*(vertices[c]-vertices[a])-(vertices[b]-vertices[a])*(vertices[c+2]-vertices[a+2])>1e-10)upward.push(indices[n],indices[n+1],indices[n+2]);}geo.setIndex(upward);geo.computeVertexNormals();
  const texture=new THREE.TextureLoader().load(`/assets/textures/${course.def.theme==='desert'?'red-sandstone':'alpine-granite'}.png`);
  texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,4);texture.anisotropy=8;
  const material=new THREE.MeshStandardMaterial({map:texture,bumpMap:texture,bumpScale:1.1,roughness:1,vertexColors:true});
  // Snow covers the generated granite only on upper ridges.
  if(alpine)material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nif(vColor.r > .88 && vColor.g > .88) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.86,.91,.94),.88);');};
  const mountains=course.features.mountains,o=new THREE.Object3D(),cliffs=new THREE.InstancedMesh(geo,material,mountains.length);
  mountains.forEach((m,i)=>{let minY=m.y;for(let a=0;a<64;a++){const theta=a*Math.PI/32,x=Math.cos(theta)*m.halfX,z=Math.sin(theta)*m.halfZ,c=Math.cos(m.heading),sn=Math.sin(m.heading),n=course.nearest(m.x+c*x+sn*z,m.z-sn*x+c*z);minY=Math.min(minY,course.groundAt(n.s,n.lateral).y);}const burial=m.y-minY+4;o.position.set(m.x,m.y-burial,m.z);o.rotation.set(0,m.heading,0);o.scale.set(m.halfX,m.height+burial,m.halfZ);o.updateMatrix();cliffs.setMatrixAt(i,o.matrix);});
  cliffs.receiveShadow=true;group.add(cliffs);
  const trees=course.features.trees;
  const pine=course.def.theme!=='desert';
  if(pine){
    const a=pineTreeAssets(),trunks=new THREE.InstancedMesh(a.trunk,a.bark,trees.length),leaves=new THREE.InstancedMesh(a.crown,a.needles,trees.length);
    trees.forEach((t,i)=>{o.position.set(t.x,t.y-.24,t.z);o.rotation.set(0,t.heading,0);o.scale.setScalar(t.scale);o.updateMatrix();trunks.setMatrixAt(i,o.matrix);leaves.setMatrixAt(i,o.matrix);});
    trunks.castShadow=leaves.castShadow=true;trunks.receiveShadow=leaves.receiveShadow=true;group.add(trunks,leaves);
  }else{
    const foliage=new THREE.InstancedMesh(vegetationGeometry(false),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92}),trees.length);
    trees.forEach((t,i)=>{o.position.set(t.x,t.y-.24,t.z);o.rotation.set(0,t.heading,0);o.scale.setScalar(t.scale);o.updateMatrix();foliage.setMatrixAt(i,o.matrix);});foliage.castShadow=foliage.receiveShadow=true;group.add(foliage);
  }
}

function addFurniture(group,course,metal){
  const night=course.def.theme==='city',data=course.features.poles,o=new THREE.Object3D(),wires=[];
  const poles=new THREE.InstancedMesh(new THREE.CylinderGeometry(.12,.2,11,9),new THREE.MeshStandardMaterial({color:night?0x596775:0x544336,roughness:.78,metalness:night?.65:0}),data.length);
  data.forEach((p,i)=>{o.position.set(p.x,p.y+5.5,p.z);o.rotation.set(0,p.heading,0);o.scale.setScalar(1);o.updateMatrix();poles.setMatrixAt(i,o.matrix);
    if(night){
      const arm=new THREE.Group();box(arm,[6,.16,.18],[3,10.5,0],metal);
      box(arm,[1.9,.13,.8],[5.4,10.35,0],new THREE.MeshStandardMaterial({color:0xffdf9b,emissive:0xffbc60,emissiveIntensity:4}));
      arm.position.set(p.x,p.y,p.z);arm.rotation.y=p.heading;group.add(arm);
    }else if(i){const previous=data[i-1];for(let j=0;j<12;j++)for(const t of[j/12,(j+1)/12])wires.push(THREE.MathUtils.lerp(previous.x,p.x,t),THREE.MathUtils.lerp(previous.y,p.y,t)+10.7-Math.sin(t*Math.PI)*1.3,THREE.MathUtils.lerp(previous.z,p.z,t));}
  });poles.castShadow=true;group.add(poles);
  if(wires.length){const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(wires,3));group.add(new THREE.LineSegments(wg,new THREE.LineBasicMaterial({color:0x353d3c,transparent:true,opacity:.55})));}
  const barriers=course.features.barriers,rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.28,.38,8),metal,barriers.length),posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.16,1.1,.17),metal,barriers.length*2);
  barriers.forEach((p,i)=>{o.position.set(p.x,p.y+.82,p.z);o.rotation.set(0,p.heading,0);o.updateMatrix();rails.setMatrixAt(i,o.matrix);
    for(let side=0;side<2;side++){const dz=side?3.6:-3.6;o.position.set(p.x+Math.sin(p.heading)*dz,p.y+.5,p.z+Math.cos(p.heading)*dz);o.updateMatrix();posts.setMatrixAt(i*2+side,o.matrix);}
  });rails.castShadow=rails.receiveShadow=true;posts.castShadow=true;group.add(rails,posts);
}

function addTurnSigns(group,course,turn){
  addSign(group,course,turn.signS,10.8,turn.direction>0?'LEFT BEND':'RIGHT BEND',`${turn.advisory} MPH`,'#b78720');
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#f1bf35';x.fillRect(0,0,128,128);x.fillStyle='#1d252a';
  x.beginPath();const dir=turn.direction;for(const [a,b]of[[20,0],[63,0],[110,64],[63,128],[20,128],[66,64]])x.lineTo(dir>0?128-a:a,b);x.closePath();x.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshStandardMaterial({map:t,roughness:.5,emissive:0xb79028,emissiveMap:t,emissiveIntensity:.15});
  for(let d=0;d<=64;d+=16){const p=course.groundAt(turn.s+d,-turn.direction*10.5),g=new THREE.Group();box(g,[1.2,1.35,.08],[0,2.05,0],mat);box(g,[.1,1.8,.1],[0,.9,0],new THREE.MeshStandardMaterial({color:0x8e9393,metalness:.5,roughness:.6}));g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading+Math.PI;group.add(g);}
}

function signTexture(top, bottom, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#eee4ca'; x.lineWidth = 6; x.strokeRect(12, 12, 488, 232);
  x.fillStyle = bg === '#ede2c6' ? '#28312e' : '#f4eddc'; x.textAlign = 'center'; x.font = 'bold 40px Arial'; x.fillText(top, 256, 88); x.font = 'bold 64px Arial'; x.fillText(bottom, 256, 177);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function addSign(group, course, s, off, top, bottom, bg) {
  const p = course.groundAt(s, off), g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, .12), new THREE.MeshStandardMaterial({ map: signTexture(top, bottom, bg), roughness: .7 })); board.position.y = 4; g.add(board);
  for (const x of [-1.8, 1.8]) box(g, [.13, 4.3, .16], [x, 2.1, 0], new THREE.MeshStandardMaterial({ color: 0x646b64, metalness: .4, roughness: .6 }));
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading + Math.PI; group.add(g);
}

function box(group, size, position, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...position); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}

function addStation(world, course, station) {
  const p=station,checkpoint=station.checkpoint,g=new THREE.Group(),night=course.def.theme==='city',coast=course.def.theme==='coast';
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
  const waterMat=new THREE.MeshStandardMaterial({color:0x285d69,metalness:.55,roughness:.24,transparent:true,opacity:.94});
  const water=new THREE.Mesh(new THREE.PlaneGeometry(12000,12000,1,1),waterMat);
  water.rotation.x=-Math.PI/2;water.position.set(0,-15,course.length*.45);water.receiveShadow=true;group.add(water);
  waterMat.onBeforeCompile=shader=>{
    shader.uniforms.waterTime={value:0};group.userData.update=t=>{shader.uniforms.waterTime.value=t;};
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float waterTime;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>','#include <normal_fragment_maps>\nnormal=normalize(normal+vec3(sin(vViewPosition.x*.08+waterTime*.65)*.035,cos(vViewPosition.z*.12+waterTime*.4)*.04,0.));');
  };
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

function addHarbor(group,course){
  const walls=[],roofs=[],windows=[],doors=[];
  for(const b of course.features.buildings){
    walls.push({b,x:0,y:b.height/2,z:0,sx:b.halfX*2,sy:b.height,sz:b.halfZ*2});
    roofs.push({b,x:0,y:b.height+.15,z:0,sx:b.halfX*2+.5,sy:.3,sz:b.halfZ*2+.5});
    for(const face of[-1,1]){
      doors.push({b,x:0,y:2.4,z:face*(b.halfZ+.025),sx:4.8,sy:4.8,sz:.07});
      for(let y=6;y<b.height-1;y+=3.1)for(let x=-b.halfX+1.6;x<b.halfX-1;x+=2.6)windows.push({b,x,y,z:face*(b.halfZ+.04),sx:1.4,sy:1.1,sz:.08});
    }
    for(const face of[-1,1])for(let z=-b.halfZ+2;z<b.halfZ-1;z+=3.1)for(let y=5;y<b.height-1;y+=3.5)windows.push({b,x:face*(b.halfX+.035),y,z,sx:.08,sy:1.15,sz:1.6});
  }
  const corrugated=new THREE.MeshStandardMaterial({color:0x687d86,roughness:.65,metalness:.25});
  corrugated.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.rgb*=.9+.1*sin(vViewPosition.y*19.);');};
  const o=new THREE.Object3D();
  for(const [data,mat]of[[walls,corrugated],[roofs,new THREE.MeshStandardMaterial({color:0x263b45,metalness:.6,roughness:.5})],[doors,new THREE.MeshStandardMaterial({color:0x26363b,roughness:.82})],[windows,new THREE.MeshStandardMaterial({color:0xffc783,emissive:0xffa650,emissiveIntensity:1.5,roughness:.28})]]){
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),mat,data.length);
    data.forEach((d,i)=>{const c=Math.cos(d.b.heading),s=Math.sin(d.b.heading);o.position.set(d.b.x+c*d.x+s*d.z,d.b.y+d.y,d.b.z-s*d.x+c*d.z);o.rotation.set(0,d.b.heading,0);o.scale.set(d.sx,d.sy,d.sz);o.updateMatrix();mesh.setMatrixAt(i,o.matrix);if(data===windows)mesh.setColorAt(i,new THREE.Color(i%5===0?0x34251a:i%3===0?0xc4d3db:0xffebc2));});
    mesh.castShadow=data===walls;mesh.receiveShadow=true;group.add(mesh);
  }
  const steel=new THREE.MeshStandardMaterial({color:0x3e5966,metalness:.7,roughness:.55}),amber=new THREE.MeshStandardMaterial({color:0xffb93d,emissive:0xf77722,emissiveIntensity:1.8});
  for(let s=420;s<course.length;s+=680){
    const p=course.groundAt(s,130),g=new THREE.Group();
    for(const x of[-12,12])box(g,[1.4,45,1.4],[x,22.5,0],steel);
    box(g,[27,2,2],[0,44,0],steel);box(g,[2,2,70],[0,47,-10],steel);box(g,[.15,31,.15],[0,31,-36],steel);box(g,[2,.5,2],[0,15.5,-36],amber);
    g.position.set(p.x,p.y,p.z);g.rotation.y=p.heading;group.add(g);
  }
}

function addFinish(group, course) {
  const p = course.worldAt(course.length - 5), g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x354545, metalness: .55, roughness: .55 });
  box(g, [.5, 7, .5], [-8, 3.5, 0], mat); box(g, [.5, 7, .5], [8, 3.5, 0], mat);
  const b = box(g, [16.5, 1.8, .3], [0, 6.5, 0], new THREE.MeshStandardMaterial({ map: signTexture('THE DUEL', 'CHECKPOINT', '#b94429') }));
  b.rotation.y = Math.PI; g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; group.add(g);
}

export function disposeTree(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(o => { if(o.isInstancedMesh)o.dispose(); if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); } });
  geometries.forEach(g => { if (!g.userData.sharedAsset) g.dispose(); });
  materials.forEach(m => { if (!m.userData.sharedAsset) m.dispose(); });
  textures.forEach(t => { if (!t.userData.sharedAsset) t.dispose(); });
}
