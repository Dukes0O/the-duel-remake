import * as THREE from 'three';
import { makeRng } from './rng.js';
import { addLandscapeDetail } from './landscape-detail.js';
import { vegetationGeometry } from './vegetation.js';

export function buildEnvironment(course) {
  const group = new THREE.Group(), alpine = course.def.theme === 'alpine';
  const roadMat = new THREE.MeshStandardMaterial({ map: surfaceTexture('asphalt'), roughness: .93, color: 0x8b8e90 });
  const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture('color'), normalMap: groundTexture('normal'), roughnessMap: groundTexture('roughness'), normalScale: new THREE.Vector2(.65,.65), roughness: 1, vertexColors: true });
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
  addSign(group, course, 105, -11, alpine ? 'ALPINE PASS' : 'MOJAVE', 'NORTH  /  89', '#25433d');
  addSign(group, course, course.length - 220, -11, 'CHECKPOINT', '200 M', '#ce4c2d');
  addStation(group, course, 195, 25, false);
  addStation(group, course, course.length - 42, -24, true);
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
  const offsets = [-140, -100, -70, -50, -30, -18, -9, 0, 9, 18, 30, 50, 70, 100, 140];
  const base = new THREE.Color(alpine ? '#899584' : '#d7c6ac'), col = new THREE.Color(); let row = 0;
  for (let s = -160; s <= course.length + 160; s += 16, row++) {
    offsets.forEach((off, j) => {
      const p = worldAtExtended(course, s, off), edge = Math.max(0, Math.abs(off) - 13);
      const wave = Math.sin(s * .009 + off * .007) * Math.cos(off * .021 + s * .004);
      const h = edge < 1 ? -.06 : Math.max(-2, wave * Math.min(32, edge * .13) + edge * .014 - .2);
      v.push(p.x, p.y + h, p.z); uv.push(off / 22, s / 22);
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
  const v=[],uv=[],colors=[],distances=[],indices=[],base=new THREE.Color(alpine?'#899584':'#d7c6ac'),col=new THREE.Color();
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const x=minX+i*32,z=minZ+j*32;let best=Infinity,roadY=0,roadS=0,off=0;
    for(let n=1;n<route.length;n++){
      const a=route[n-1],b=route[n],dx=b.x-a.x,dz=b.z-a.z;
      const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz)));
      const px=x-a.x-t*dx,pz=z-a.z-t*dz,d=px*px+pz*pz;
      if(d<best){best=d;roadY=a.y+(b.y-a.y)*t;roadS=a.s+(b.s-a.s)*t;off=Math.sqrt(d)*Math.sign(px*dz-pz*dx);}
    }
    const edge=Math.max(0,Math.abs(off)-13),wave=Math.sin(roadS*.009+off*.007)*Math.cos(off*.021+roadS*.004);
    const h=Math.max(-2,wave*Math.min(32,edge*.13)+edge*.014-.2);
    v.push(x,roadY+h-.12,z);uv.push(x/22,z/22);distances.push(Math.sqrt(best));
    col.copy(base).multiplyScalar(.86+.13*wave+.07*Math.sin(roadS*.025));colors.push(col.r,col.g,col.b);
    if(i&&j){const a=j*columns+i,quad=[a-columns-1,a-1,a-columns,a];
      // Leave a gap safely covered by the narrow, precisely fitted road strip.
      if(quad.every(k=>distances[k]>80))indices.push(quad[0],quad[1],quad[2],quad[2],quad[1],quad[3]);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

const groundMaps = new Map();
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

function addLandscape(group, course, alpine) {
  const rng = makeRng(487 + course.def.stage), cliffGeo = new THREE.CylinderGeometry(alpine ? .035 : .55, 1, 1, 32, 18, false);
  const pos = cliffGeo.attributes.position, colors = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), w = 1 + .11 * Math.sin(x * 17 + z * 23 + y * 9) + .06 * Math.sin(y * 38);
    pos.setXYZ(i, x * w, y, z * w);
    const c = new THREE.Color(alpine ? (y > .15 ? '#ffffff' : '#8b9896') : '#dfcbbb'); c.multiplyScalar(.9 + .085 * Math.sin(y * 45) + .10 * (y + .5)); colors.push(c.r, c.g, c.b);
  }
  cliffGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); cliffGeo.computeVertexNormals();
  const rockTexture = new THREE.TextureLoader().load('/assets/textures/red-sandstone.png');
  rockTexture.colorSpace = THREE.SRGBColorSpace;
  rockTexture.wrapS = rockTexture.wrapT = THREE.RepeatWrapping;
  rockTexture.repeat.set(6, 2); rockTexture.anisotropy = 8;
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: rockTexture, bumpMap: rockTexture, bumpScale: 1.5, roughness: 1 });
  if (alpine) rockMat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.91, 0.98, 1.0);');
  };
  const o = new THREE.Object3D(), cliffCount = Math.floor(course.length / 28), cliffs = new THREE.InstancedMesh(cliffGeo, rockMat, cliffCount);
  for (let i = 0; i < cliffCount; i++) {
    const p = worldAtExtended(course, rng.range(-200, course.length + 200), (i % 2 ? 1 : -1) * rng.range(95, 550));
    const h = rng.range(35, alpine ? 190 : 110);
    o.position.set(p.x, p.y + h * .38 - 4, p.z); o.scale.set(rng.range(35, 90), h, rng.range(35, 90)); o.rotation.y = rng.range(0, 6.28); o.updateMatrix(); cliffs.setMatrixAt(i, o.matrix);
  }
  group.add(cliffs);
  const stones = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: alpine ? 0x78847c : 0xad7954, roughness: 1 }), 420);
  for (let i = 0; i < 420; i++) {
    const p = course.worldAt(rng.range(0, course.length), (i % 2 ? 1 : -1) * rng.range(11, 72));
    o.position.set(p.x, p.y, p.z); o.scale.set(rng.range(.15, .55), rng.range(.1, .25), rng.range(.2, .55)); o.rotation.set(rng.range(0, 3), rng.range(0, 3), 0); o.updateMatrix(); stones.setMatrixAt(i, o.matrix);
  }
  group.add(stones);
  const count = alpine ? 440 : 220;
  const foliage = new THREE.InstancedMesh(vegetationGeometry(alpine), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92 }), count);
  for (let i = 0; i < count; i++) {
    const s=rng.range(12,course.length),off=(i%2?1:-1)*rng.range(13,82),p=course.worldAt(s,off),scale=rng.range(.6,1.8);
    const edge=Math.max(0,Math.abs(off)-13),wave=Math.sin(s*.009+off*.007)*Math.cos(off*.021+s*.004);
    p.y+=edge<1?-.06:Math.max(-2,wave*Math.min(32,edge*.13)+edge*.014-.2);
    o.rotation.set(0,rng.range(0,Math.PI*2),0);o.position.set(p.x,p.y-.1,p.z);o.scale.setScalar(scale);o.updateMatrix();foliage.setMatrixAt(i,o.matrix);
  }
  foliage.castShadow=true;foliage.receiveShadow=true;
  const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: alpine ? 0x5e7054 : 0x7c8053, roughness: 1 }), 500);
  for (let i = 0; i < 500; i++) {
    const p = course.worldAt(rng.range(0, course.length), (i % 2 ? 1 : -1) * rng.range(10, 68));
    o.position.set(p.x, p.y + .3, p.z); o.rotation.set(0, rng.range(0, 3), 0); o.scale.set(rng.range(.5, 1.4), rng.range(.2, .6), rng.range(.5, 1.3)); o.updateMatrix(); bushes.setMatrixAt(i, o.matrix);
  }
  group.add(foliage, bushes);
}

function addFurniture(group, course, metal) {
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .18, 11, 6), new THREE.MeshStandardMaterial({ color: 0x544336, roughness: .92 }), Math.ceil(course.length / 110));
  const o = new THREE.Object3D(), wires = []; let previous;
  for (let i = 0, s = 12; s < course.length; s += 110, i++) {
    const p = course.worldAt(s, -18); o.position.set(p.x, p.y + 5.5, p.z); o.updateMatrix(); poles.setMatrixAt(i, o.matrix);
    if (previous) for (let j = 0; j < 12; j++) for (const t of [j / 12, (j + 1) / 12]) wires.push(THREE.MathUtils.lerp(previous.x, p.x, t), THREE.MathUtils.lerp(previous.y, p.y, t) + 10.7 - Math.sin(t * Math.PI) * 1.3, THREE.MathUtils.lerp(previous.z, p.z, t));
    previous = p;
  }
  group.add(poles);
  const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3)); group.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x353d3c, transparent: true, opacity: .55 })));
  const posts = new THREE.InstancedMesh(new THREE.BoxGeometry(.13, 1.1, .16), metal, Math.ceil(course.length / 18) * 2); let i = 0;
  for (let s = 0; s < course.length; s += 18) for (const side of [-1, 1]) {
    const p = course.worldAt(s, side * 9.1); o.position.set(p.x, p.y + .5, p.z); o.rotation.y = p.heading; o.updateMatrix(); posts.setMatrixAt(i++, o.matrix);
  }
  group.add(posts);
  for (const side of [-1, 1]) {
    const v=[],indices=[];
    for(let s=0,n=0;s<=course.length;s+=8,n++){
      const p=course.worldAt(s,side*9.1);
      for(const y of [.64,.76,.84,.96])v.push(p.x+side*(y===.76||y===.84?.08:0),p.y+y,p.z);
      if(n)for(let j=0;j<3;j++){const a=n*4+j;indices.push(a-4,a,a-3,a-3,a,a+1);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(indices);g.computeVertexNormals();
    const rail=new THREE.Mesh(g,metal);rail.material.side=THREE.DoubleSide;rail.receiveShadow=true;group.add(rail);
  }
}

function signTexture(top, bottom, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 256); x.strokeStyle = '#eee4ca'; x.lineWidth = 6; x.strokeRect(12, 12, 488, 232);
  x.fillStyle = bg === '#ede2c6' ? '#28312e' : '#f4eddc'; x.textAlign = 'center'; x.font = 'bold 40px Arial'; x.fillText(top, 256, 88); x.font = 'bold 64px Arial'; x.fillText(bottom, 256, 177);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function addSign(group, course, s, off, top, bottom, bg) {
  const p = course.worldAt(s, off), g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.6, .12), new THREE.MeshStandardMaterial({ map: signTexture(top, bottom, bg), roughness: .7 })); board.position.y = 4; g.add(board);
  for (const x of [-1.8, 1.8]) box(g, [.13, 4.3, .16], [x, 2.1, 0], new THREE.MeshStandardMaterial({ color: 0x646b64, metalness: .4, roughness: .6 }));
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading + Math.PI; group.add(g);
}

function box(group, size, position, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat); m.position.set(...position); m.castShadow = true; m.receiveShadow = true; group.add(m); return m;
}

function addStation(world, course, s, off, checkpoint) {
  const p = course.worldAt(s, off), g = new THREE.Group();
  const plaster = new THREE.MeshStandardMaterial({ color: 0xd7b58a, roughness: .93 });
  const red = new THREE.MeshStandardMaterial({ color: 0xa83e2b, roughness: .63 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x223b40, metalness: .55, roughness: .2 });
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
  g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading + (off < 0 ? -.5 : .5); world.add(g);
}

function addFinish(group, course) {
  const p = course.worldAt(course.length - 5), g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: 0x354545, metalness: .55, roughness: .55 });
  box(g, [.5, 7, .5], [-8, 3.5, 0], mat); box(g, [.5, 7, .5], [8, 3.5, 0], mat);
  const b = box(g, [16.5, 1.8, .3], [0, 6.5, 0], new THREE.MeshStandardMaterial({ map: signTexture('THE DUEL', 'CHECKPOINT', '#b94429') }));
  b.rotation.y = Math.PI; g.position.set(p.x, p.y, p.z); g.rotation.y = p.heading; group.add(g);
}

export function disposeTree(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  object.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) { materials.add(m); for (const value of Object.values(m)) if (value?.isTexture) textures.add(value); } });
  geometries.forEach(g => { if (!g.userData.sharedAsset) g.dispose(); });
  materials.forEach(m => { if (!m.userData.sharedAsset) m.dispose(); });
  textures.forEach(t => { if (!t.userData.sharedAsset) t.dispose(); });
}
