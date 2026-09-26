import * as THREE from 'three';
import { terrainStyleAt } from './terrain-style.js';
import { createPolylineIndex } from './polyline-index.js';
import { freestyleTerrainGeometry, freestyleFarGeometry } from './freestyle-scene.js';

// Pure sampled surfaces and shared source textures. Course owns all route and
// ground placement decisions; these builders never add collision features.
const TERRAIN_THEMES=['desert','alpine','coast','city','arena'];

// Scoring clamps to the course; cameras need a tangent beyond the endpoints.
export function worldAtExtended(course, s, lateral = 0) {
  if(course.closed)return course.worldAt(s,lateral);
  const p = course.worldAt(s, lateral), extra = s < 0 ? s : s > course.length ? s - course.length : 0;
  p.x += Math.sin(p.heading) * extra; p.z += Math.cos(p.heading) * extra; return p;
}

export function strip(course, left, right, y, start=0, end=course.length, ground=false) {
  const verts = [], uvs = [], indices = [];
  const followsGround=ground||course.def.arena||course.def.offroad;
  const steps=Math.ceil((end-start)/(followsGround||course.def.expansion?2:8));
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

export function terrainGeometry(course) {
  if(course.def.practice)return freestyleTerrainGeometry(course);
  const v = [], colors = [], uv = [], weights = [], groups = TERRAIN_THEMES.map(()=>[]);
  // Keep the road extrusion narrower than the tightest bend radius. Wider
  // strips fold back across the road; the outer landscape uses a world grid.
  const baseOffsets = course.def.arena?[-42,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,42]:(course.def.terrainHalfWidth===64||course.def.kind==='chase'||course.def.layout==='city')?[-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64]:[-140,-120,-100,-80,-72,-64,-56,-48,-40,-32,-24,-18,-14,-10,-7,0,7,10,14,18,24,32,40,48,56,64,72,80,100,120,140];
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
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));g.setAttribute('biomeWeights',new THREE.Float32BufferAttribute(weights,3)); setMaterialGroups(g,groups); cutHiddenRoadGround(g,course); fitMuddyHollowGround(g,course,0); g.computeVertexNormals(); return g;
}

export function farTerrainGeometry(course) {
  if(course.def.practice)return freestyleFarGeometry(course);
  const grid=(course.def.kind==='chase'||course.def.layout==='city')?8:course.def.arena||course.def.expansion?16:32;
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
      if(quad.every(k=>distances[k]>(course.def.arena?18:course.def.expansion?40:(course.def.kind==='chase'||course.def.layout==='city')?50:80)))groups[TERRAIN_THEMES.indexOf(course.themeAt(roadS))].push(quad[0],quad[1],quad[2],quad[2],quad[1],quad[3]);
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('biomeWeights',new THREE.Float32BufferAttribute(weights,3));setMaterialGroups(g,groups);cutHiddenRoadGround(g,course);fitMuddyHollowGround(g,course,-.15);g.computeVertexNormals();return g;
}

// Coarse radial/grid triangles bridge across a narrow wash. Replace only
// intersecting ground with a fitted patch, keeping flag-off geometry identical.
function cutHiddenRoadGround(geometry, course) {
  const road = course.hiddenRoad;
  if (!road) return;
  const position = geometry.attributes.position, source = geometry.index.array;
  const indices = [], groups = [];
  for (const group of geometry.groups) {
    const start = indices.length;
    for (let i = group.start; i < group.start + group.count; i += 3) {
      const a = source[i], b = source[i + 1], c = source[i + 2];
      const x = (position.getX(a) + position.getX(b) + position.getX(c)) / 3;
      const z = (position.getZ(a) + position.getZ(b) + position.getZ(c)) / 3;
      const near = road.nearest(x, z);
      if (near.progress > 40 && near.distance < road.widthAt(near.progress) + 32
        && !touchesRaceRoad(position.array, [a, b, c], course)) continue;
      indices.push(a, b, c);
    }
    groups.push({ start, count: indices.length - start, materialIndex: group.materialIndex });
  }
  geometry.setIndex(indices); geometry.clearGroups();
  for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex);
}

// Replace only coarse triangles that overlap the Hollow. Subdivision keeps a
// large source triangle from bridging over the dense authored surface. A
// narrow outer blend returns to the exact source plane, so the patch still
// meets ordinary terrain without a crack. Flag-off geometry and the race-side
// tunnel remain byte-for-byte unchanged.
function fitMuddyHollowGround(geometry, course, yOffset) {
  const zone=course.muddyHollow;
  if(!zone)return;
  const position=geometry.attributes.position,source=geometry.index.array;
  const attributes=Object.entries(geometry.attributes).map(([name,attribute])=>({
    name,itemSize:attribute.itemSize,normalized:attribute.normalized,
    ArrayType:attribute.array.constructor,values:Array.from(attribute.array),
  }));
  const fit=Array(position.count).fill(0),sourceY=[];
  for(let vertex=0;vertex<position.count;vertex++)sourceY.push(position.getY(vertex));
  const indices=[],groups=[];
  const midpoint=(left,right)=>left.map((value,index)=>(value+right[index])*.5);
  const samplePoint=(vertices,weights)=>{
    let originalY=0,x=0,z=0;
    for(let item=0;item<3;item++){
      const vertex=vertices[item],weight=weights[item];
      x+=position.getX(vertex)*weight;
      originalY+=position.getY(vertex)*weight;
      z+=position.getZ(vertex)*weight;
    }
    const dx=x-zone.frame.origin.x,dz=z-zone.frame.origin.z;
    const sin=Math.sin(zone.frame.heading),cos=Math.cos(zone.frame.heading);
    const radius=Math.hypot((dx*sin+dz*cos)/zone.bounds.alongRadius,
      (dx*cos-dz*sin-zone.bounds.lateralCenter)/zone.bounds.lateralRadius);
    const target=zone.heightAt(x,z)+yOffset-.7;
    const blend=THREE.MathUtils.smoothstep(radius,1,1.08);
    return {x,z,originalY,radius,y:THREE.MathUtils.lerp(target,originalY,blend)};
  };
  const subdivide=triangle=>{
    let leaves=[triangle];
    const depth=yOffset<0?3:2;
    for(let level=0;level<depth;level++){
      const next=[];
      for(const [a,b,c] of leaves){
        const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
        next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);
      }
      leaves=next;
    }
    return leaves;
  };
  const appendVertex=(vertices,weights)=>{
    const next=fit.length;
    const point=samplePoint(vertices,weights);
    for(const attribute of attributes){
      for(let item=0;item<attribute.itemSize;item++){
        let value=0;
        for(let corner=0;corner<3;corner++)value+=
          attribute.values[vertices[corner]*attribute.itemSize+item]*weights[corner];
        attribute.values.push(value);
      }
      if(attribute.name==='position'){
        attribute.values[next*3]=point.x;
        attribute.values[next*3+1]=point.y;
        attribute.values[next*3+2]=point.z;
      }
    }
    fit.push(1);sourceY.push(point.originalY);
    return next;
  };
  for(const group of geometry.groups){
    const start=indices.length;
    for(let i=group.start;i<group.start+group.count;i+=3){
      const a=source[i],b=source[i+1],c=source[i+2];
      if(!muddyHollowTriangleOverlap(position,[a,b,c],zone,1.08)){indices.push(a,b,c);continue;}
      const vertices=[a,b,c],vertexCache=new Map();
      for(const triangle of subdivide([[1,0,0],[0,1,0],[0,0,1]])){
        for(const weights of triangle){
          const key=weights.join(',');
          if(!vertexCache.has(key))vertexCache.set(key,appendVertex(vertices,weights));
          indices.push(vertexCache.get(key));
        }
      }
    }
    groups.push({start,count:indices.length-start,materialIndex:group.materialIndex});
  }
  for(const attribute of attributes)geometry.setAttribute(attribute.name,
    new THREE.BufferAttribute(new attribute.ArrayType(attribute.values),
      attribute.itemSize,attribute.normalized));
  geometry.setAttribute('muddyHollowFit',new THREE.Float32BufferAttribute(fit,1));
  geometry.setAttribute('muddyHollowSourceY',new THREE.Float32BufferAttribute(sourceY,1));
  geometry.setIndex(indices);geometry.clearGroups();
  for(const group of groups)geometry.addGroup(group.start,group.count,group.materialIndex);
}

function muddyHollowTriangleOverlap(position,vertices,zone,radius=1){
  const sin=Math.sin(zone.frame.heading),cos=Math.cos(zone.frame.heading);
  const points=vertices.map(index=>{
    const dx=position.getX(index)-zone.frame.origin.x;
    const dz=position.getZ(index)-zone.frame.origin.z;
    return {
      x:(dx*sin+dz*cos)/zone.bounds.alongRadius,
      y:(dx*cos-dz*sin-zone.bounds.lateralCenter)/zone.bounds.lateralRadius,
    };
  });
  return muddyHollowNormalizedTriangleOverlap(points,radius);
}

function muddyHollowNormalizedTriangleOverlap(points,radius=1){
  if(points.some(p=>p.x*p.x+p.y*p.y<=radius*radius))return true;
  const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
  const signs=points.map((point,index)=>cross(point,points[(index+1)%3],{x:0,y:0}));
  if(signs.every(value=>value>=0)||signs.every(value=>value<=0))return true;
  for(let index=0;index<3;index++){
    const a=points[index],b=points[(index+1)%3],dx=b.x-a.x,dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/(dx*dx+dy*dy||1)));
    const x=a.x+dx*t,y=a.y+dy*t;
    if(x*x+y*y<=radius*radius)return true;
  }
  return false;
}

function touchesRaceRoad(positions, vertices, course) {
  const lateral = vertices.map(index => {
    const pose = course.nearest(positions[index * 3], positions[index * 3 + 2]);
    const edge = course.roadHalfWidthAt(pose.s) + 4;
    return Math.abs(pose.lateral) <= edge ? 0 : Math.sign(pose.lateral);
  });
  // Include edges crossing the road even when all vertices lie outside it.
  return lateral.includes(0) || lateral.includes(-1) && lateral.includes(1);
}

export function hiddenRoadGroundGeometry(course) {
  const road = course.hiddenRoad, positions = [], uv = [], indices = [];
  const columns = 9;
  const patchEnd = road.length + road.widthAt(road.length) + 80;
  const tip = road.length + road.widthAt(road.length);
  const rows = [];
  for (let progress = 0; progress <= patchEnd; progress += 2) rows.push(progress);
  if (!rows.includes(tip)) rows.push(tip);
  rows.sort((a, b) => a - b);
  rows.forEach((progress, row) => {
    const center = road.poseAt(progress), endExtra = Math.max(0, progress - road.length);
    const width = road.widthAt(Math.min(progress, road.length));
    // Past the gate the physical flat support has a circular edge. Place an
    // actual vertex on that edge so outside slopes cannot span the flat yard.
    const flatEdge = endExtra > 0 ?
      Math.max(.01, Math.sqrt(Math.max(0, width * width - endExtra * endExtra))) : width;
    const offsets = [-flatEdge - 80, -flatEdge - 32, -flatEdge - 8, -flatEdge,
      0, flatEdge, flatEdge + 8, flatEdge + 32, flatEdge + 80];
    offsets.forEach((offset, j) => {
      const x = center.x + Math.sin(center.heading) * endExtra + Math.cos(center.heading) * offset;
      const z = center.z + Math.cos(center.heading) * endExtra - Math.sin(center.heading) * offset;
      const nearest = course.nearest(x, z), ground = course.groundAt(nearest.s, nearest.lateral);
      positions.push(x, ground.y + .035, z); uv.push(x / 8, z / 8);
      if (row && j) {
        const a = row * columns + j;
        for (const triangle of [[a - columns - 1, a - 1, a - columns], [a - columns, a - 1, a]]) {
          if (!touchesRaceRoad(positions, triangle, course)) indices.push(...triangle);
        }
      }
    });
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

function setMaterialGroups(geometry,groups){const indices=[];groups.forEach((group,material)=>{geometry.addGroup(indices.length,group.length,material);for(const index of group)indices.push(index);});geometry.setIndex(indices);}

const groundMaps = new Map();
let meadowMap;
export function meadowTexture(){if(!meadowMap){meadowMap=new THREE.TextureLoader().load('/assets/textures/mountain-meadow.png');meadowMap.wrapS=meadowMap.wrapT=THREE.RepeatWrapping;meadowMap.repeat.set(4,4);meadowMap.colorSpace=THREE.SRGBColorSpace;meadowMap.anisotropy=8;meadowMap.userData.sharedAsset=true;}return meadowMap;}
export function groundTexture(kind) {
  if (!groundMaps.has(kind)) {
    const texture = new THREE.TextureLoader().load(`/assets/textures/ground-${kind}.jpg`);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8.8, 8.8); texture.anisotropy = 8; texture.userData.sharedAsset = true;
    if (kind === 'color') texture.colorSpace = THREE.SRGBColorSpace;
    groundMaps.set(kind, texture);
  }
  return groundMaps.get(kind);
}

export function surfaceTexture(kind) {
  if(!groundMaps.has(kind)){const texture=new THREE.TextureLoader().load(`/assets/textures/${kind==='asphalt'?'race-asphalt':'rally-gravel'}.png`);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(1.25,2.5);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;texture.userData.sharedAsset=true;groundMaps.set(kind,texture);}
  return groundMaps.get(kind);
}

function groundTint(course,theme=course.def.theme){return {alpine:'#b7cbb3',desert:'#d7c6ac',coast:'#c0c7a2',city:'#929899',arena:'#ba9873'}[theme];}

export function addTrailShoulder(group,course,side,trailMaterial){
  const geo=strip(course,s=>side*(course.roadHalfWidthAt(s)-.1),s=>side*(course.roadHalfWidthAt(s)+1.4+.25*Math.sin(s*.18)),.039,0,course.length,true);
  const uv=[];for(let i=0;i<geo.attributes.position.count;i++)uv.push(side>0?i%2:1-i%2,.5);geo.setAttribute('uv1',new THREE.Float32BufferAttribute(uv,2));
  const pixels=new Uint8Array(64*4);for(let i=0;i<64;i++){const fade=Math.round(255*(1-i/63)**1.5);pixels.set([fade,fade,fade,255],i*4);}
  const alpha=new THREE.DataTexture(pixels,64,1);alpha.channel=1;alpha.needsUpdate=true;alpha.magFilter=alpha.minFilter=THREE.LinearFilter;
  const mat=trailMaterial.clone();mat.transparent=true;mat.depthWrite=false;mat.alphaMap=alpha;
  const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;group.add(mesh);
}
