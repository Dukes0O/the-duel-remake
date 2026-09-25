import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {Course} from '../src/course.js';
import {COURSE} from '../src/config.js';
import {ROUTE_VARIANTS} from '../src/route-variants.js';
import {createRustwallScene} from '../src/rustwall-scene.js';
import {disposeTree} from '../src/world.js';

const wallPath = new URL('../public/assets/models/wasteland/rustwall/wall.glb', import.meta.url);
const testLoader = new GLTFLoader();
testLoader.register(() => ({name: 'TEST_LOCAL_TEXTURE',
  loadTexture: () => Promise.resolve(new THREE.Texture())}));
async function actualWall() {
  const bytes = readFileSync(wallPath);
  return (await testLoader.parseAsync(bytes.buffer.slice(bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength), '')).scene;
}
const courseFor = seed => new Course(COURSE.find(row => row.id === 'pacific-canyon'), seed,
  {hiddenRoad: true});
function fakeAssets() {
  const wall = new THREE.Group(), gate = new THREE.Mesh(new THREE.BoxGeometry(9, 7, .5));
  gate.name = 'gate-panel'; wall.add(gate);
  const wash = new THREE.Group();
  wash.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0),
    new THREE.MeshStandardMaterial()));
  return {wall: {scene: wall}, wash: {scene: wash}};
}
function banks(scene) {
  const wash = scene.group.getObjectByName('Rustwall wash');
  assert.ok(wash, 'joined wash is present');
  return wash.children.filter(child => child.isMesh);
}
function point(attribute, index) {
  return new THREE.Vector3().fromBufferAttribute(attribute, index);
}

test('P2 exported central portal has a raised armored crown and grounded clear gate', async () => {
  const wall=await actualWall();wall.updateMatrixWorld(true);
  const zones={upperLeft:0,upperRight:0,lintel:0,leftFoot:0,rightFoot:0,
    leftUpper:0,rightUpper:0,gateIntrusion:0};
  const longBraces=new Set();
  const frontArea=(a,b,c)=>Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))*.5;
  wall.traverse(node=>{
    if(!node.isMesh||node.name==='gate-panel'||/^guard-/.test(node.name))return;
    const geometry=node.geometry,pos=geometry.attributes.position;
    const at=corner=>geometry.index?geometry.index.getX(corner):corner;
    for(let corner=0;corner<(geometry.index?.count??pos.count);corner+=3){
      const p=[0,1,2].map(k=>point(pos,at(corner+k)).applyMatrix4(node.matrixWorld));
      const x=(p[0].x+p[1].x+p[2].x)/3,y=(p[0].y+p[1].y+p[2].y)/3;
      const area=frontArea(...p);
      if(node.name==='scaffold-steel')for(const [a,b] of [[p[0],p[1]],[p[1],p[2]],[p[2],p[0]]]){
        if(Math.abs(a.x)>30||Math.abs(b.x)>30||a.y<2||b.y<2||a.y>35||b.y>35||
          Math.abs(a.x-b.x)<3||Math.abs(a.y-b.y)<3)continue;
        const endpoint=v=>`${Math.round(v.x)}:${Math.round(v.y)}`;
        longBraces.add([endpoint(a),endpoint(b)].sort().join('/'));
      }
      if(area<.0001)continue;
      if(x>-15&&x<-5&&y>35&&y<46)zones.upperLeft+=area;
      if(x>5&&x<15&&y>35&&y<46)zones.upperRight+=area;
      if(Math.abs(x)<5&&y>35&&y<46)zones.lintel+=area;
      if(x>-15&&x<-5&&y<2)zones.leftFoot+=area;
      if(x>5&&x<15&&y<2)zones.rightFoot+=area;
      if(x>-15&&x<-5&&y>28&&y<35)zones.leftUpper+=area;
      if(x>5&&x<15&&y>28&&y<35)zones.rightUpper+=area;
      if(Math.abs(x)<4.4&&y>.2&&y<6.8)zones.gateIntrusion+=area;
    }
  });
  assert.ok(zones.upperLeft>60&&zones.upperRight>60&&zones.lintel>60,
    `central portal needs visible armored upper mass on both sides and above gate: ${JSON.stringify(zones)}`);
  assert.ok(zones.leftFoot>3&&zones.rightFoot>3&&zones.leftUpper>3&&zones.rightUpper>3,
    `portal tower mass needs grounded flanks: ${JSON.stringify(zones)}`);
  assert.ok(zones.gateIntrusion<8,
    `fixed 9×7m gate opening remains clear outside gate-panel: ${JSON.stringify(zones)}`);
  assert.ok(longBraces.size<=2,
    `central x±30m frame should not repeat long X braces; measured ${longBraces.size} distinct spans`);
});

test('P2 central gate has two broad deep grounded pylons instead of thin display uprights', async () => {
  const wall=await actualWall();wall.updateMatrixWorld(true);
  const areas=[Array(4).fill(0),Array(4).fill(0)];
  const depths=[{min:Infinity,max:-Infinity},{min:Infinity,max:-Infinity}];
  const shelves=new Set();
  wall.traverse(node=>{
    if(!node.isMesh||!['wall-body','scaffold-steel'].includes(node.name))return;
    const geo=node.geometry,pos=geo.attributes.position;
    const at=corner=>geo.index?geo.index.getX(corner):corner;
    for(let corner=0;corner<(geo.index?.count??pos.count);corner+=3){
      const p=[0,1,2].map(k=>point(pos,at(corner+k)).applyMatrix4(node.matrixWorld));
      const x=(p[0].x+p[1].x+p[2].x)/3,y=(p[0].y+p[1].y+p[2].y)/3;
      const z=(p[0].z+p[1].z+p[2].z)/3;
      const side=x<0?0:1,flank=Math.abs(x)>5&&Math.abs(x)<15;
      if(flank&&y>=1&&y<35&&z>=-5&&z<=1){
        depths[side].min=Math.min(depths[side].min,...p.map(v=>v.z));
        depths[side].max=Math.max(depths[side].max,...p.map(v=>v.z));
        if(z<-1.8){
          const band=y<8?0:y<16?1:y<25?2:3;
          areas[side][band]+=Math.abs((p[1].x-p[0].x)*(p[2].y-p[0].y)-
            (p[1].y-p[0].y)*(p[2].x-p[0].x))*.5;
        }
      }
      if(node.name==='scaffold-steel')for(const [a,b] of [[p[0],p[1]],[p[1],p[2]],[p[2],p[0]]]){
        if(Math.abs(a.x)>30||Math.abs(b.x)>30||a.y<7||b.y<7||a.y>35||b.y>35||
          Math.abs(a.x-b.x)<5||Math.abs(a.y-b.y)>.4||Math.abs(a.z)>2||Math.abs(b.z)>2)continue;
        shelves.add(Math.round((a.y+b.y)/2));
      }
    }
  });
  for(let side=0;side<2;side++){
    assert.ok(areas[side].every(area=>area>65),
      `${side?'right':'left'} pylon has broad visible front metal in every grounded height band: ${JSON.stringify(areas)}`);
    assert.ok(depths[side].max-depths[side].min>=2,
      `${side?'right':'left'} pylon has 2–4m structural depth: ${JSON.stringify(depths)}`);
  }
  assert.ok(shelves.size<=4,
    `central wall should not read as repeated horizontal shelves: ${shelves.size} distinct long levels`);
});

test('P2 gate crown resolves as two upper towers and a deep plated bridge', async () => {
  const wall=await actualWall();wall.updateMatrixWorld(true);
  const clipped=(triangle,[left,right,bottom,top])=>{
    let polygon=triangle;
    for(const [axis,bound,greater] of [['x',left,true],['x',right,false],
      ['y',bottom,true],['y',top,false]]){
      const inside=point=>greater?point[axis]>=bound:point[axis]<=bound;
      const next=[];
      for(let i=0;i<polygon.length;i++){
        const a=polygon[i],b=polygon[(i+1)%polygon.length];
        if(inside(a))next.push(a);
        if(inside(a)!==inside(b))next.push(a.clone().lerp(b,
          (bound-a[axis])/(b[axis]-a[axis])));
      }
      polygon=next;
      if(polygon.length<3)return {area:0,minZ:Infinity,maxZ:-Infinity};
    }
    let twiceArea=0;
    for(let i=0;i<polygon.length;i++){
      const a=polygon[i],b=polygon[(i+1)%polygon.length];
      twiceArea+=a.x*b.y-b.x*a.y;
    }
    return {area:Math.abs(twiceArea)/2,minZ:Math.min(...polygon.map(p=>p.z)),
      maxZ:Math.max(...polygon.map(p=>p.z))};
  };
  const rectangle=[new THREE.Vector3(-15,35,-2),new THREE.Vector3(15,35,-2),
    new THREE.Vector3(15,42,-2),new THREE.Vector3(-15,42,-2)];
  const region=[-5,5,36,41];
  const splitA=clipped([rectangle[0],rectangle[1],rectangle[2]],region).area+
    clipped([rectangle[0],rectangle[2],rectangle[3]],region).area;
  const splitB=clipped([rectangle[0],rectangle[1],rectangle[3]],region).area+
    clipped([rectangle[1],rectangle[2],rectangle[3]],region).area;
  assert.ok(Math.abs(splitA-50)<1e-6&&Math.abs(splitB-50)<1e-6,
    'same bridge coverage is measured for both triangulations');
  const tops=[{front:0,minZ:Infinity,maxZ:-Infinity},
    {front:0,minZ:Infinity,maxZ:-Infinity}];
  const bridge={front:0,minZ:Infinity,maxZ:-Infinity};
  let centerTopFront=0;
  wall.traverse(node=>{
    if(!node.isMesh||node.name==='gate-panel'||/^guard-/.test(node.name))return;
    const geo=node.geometry,pos=geo.attributes.position;
    const at=corner=>geo.index?geo.index.getX(corner):corner;
    for(let corner=0;corner<(geo.index?.count??pos.count);corner+=3){
      const p=[0,1,2].map(k=>point(pos,at(corner+k)).applyMatrix4(node.matrixWorld));
      for(const [target,region] of [[tops[0],[-15,-5,43,46]],
        [tops[1],[5,15,43,46]],[bridge,[-15,15,35,42]]]){
        const part=clipped(p,region);
        if(part.area<.001)continue;
        target.front+=part.area;
        target.minZ=Math.min(target.minZ,part.minZ);
        target.maxZ=Math.max(target.maxZ,part.maxZ);
      }
      centerTopFront+=clipped(p,[-5,5,43,46]).area;
    }
  });
  assert.ok(tops.every(top=>top.front>20&&top.maxZ-top.minZ>1.5),
    `two separate upper tower tops rise above 43m with real depth: ${JSON.stringify(tops)}`);
  assert.ok(bridge.front>100&&bridge.maxZ-bridge.minZ>2,
    `central y35..42 plated bridge has broad frontage and visible depth: ${JSON.stringify(bridge)}`);
  assert.ok(centerTopFront<Math.min(tops[0].front,tops[1].front)*.5,
    `two tower tops dominate the central silhouette instead of one peaked roof: center ${centerTopFront.toFixed(1)} m², flanks ${tops[0].front.toFixed(1)}/${tops[1].front.toFixed(1)} m²`);
});

test('P2 wash uses varied physical contour levels', async () => {
  const course = courseFor(ROUTE_VARIANTS[0].seed), models = fakeAssets();
  const scene = createRustwallScene(course, {loadAsset: async kind => models[kind]});
  try {
    assert.equal(await scene.ready, true);
    const contours = [[], []];
    for (const bank of banks(scene)) {
      const positions = bank.geometry.attributes.position;
      assert.equal(positions.count % 36, 0, 'two segments and three strips per bank box');
      const side = bank.name.includes('left') ? -1 : 1;
      const ordered = course.hiddenRoad.walls.filter(wall => {
        const center = course.hiddenRoad.poseAt(wall.progress);
        return Math.sign((wall.x - center.x) * Math.cos(wall.heading) -
          (wall.z - center.z) * Math.sin(wall.heading)) === side;
      });
      assert.equal(positions.count / 36, ordered.length, 'one pair of sections per physical box');
      for (let box = 0; box < ordered.length; box++) {
        const wall = ordered[box];
        for (const [level, vertex] of [[0, 2], [1, 8]]) {
          const p = point(positions, box * 36 + vertex);
          const dx = p.x - wall.x, dz = p.z - wall.z;
          const across = Math.cos(wall.heading) * dx - Math.sin(wall.heading) * dz;
          const ratio = Math.abs(across) / (2 * (wall.halfX - .04));
          if (Number.isFinite(ratio)) contours[level].push(ratio);
        }
      }
    }
    for (const [level, values] of contours.entries()) {
      const distinct = new Set(values.map(value => value.toFixed(3)));
      assert.ok(distinct.size >= 12, `contour ${level + 1} must vary across the actual route, got ${distinct.size} levels`);
      assert.ok(Math.max(...values) - Math.min(...values) >= .025,
        `contour ${level + 1} variation must be visible rather than float noise`);
    }
  } finally {disposeTree(scene.group);}
});

test('P2 wash atlas V follows its varied physical slope rather than fixed bands', async () => {
  const course = courseFor(ROUTE_VARIANTS[0].seed), models = fakeAssets();
  const scene = createRustwallScene(course, {loadAsset: async kind => models[kind]});
  try {
    assert.equal(await scene.ready, true);
    const slopeUvs = [];
    for (const bank of banks(scene)) {
      const positions = bank.geometry.attributes.position, uv = bank.geometry.attributes.uv;
      const side = bank.name.includes('left') ? -1 : 1;
      const ordered = course.hiddenRoad.walls.filter(wall => {
        const center = course.hiddenRoad.poseAt(wall.progress);
        return Math.sign((wall.x - center.x) * Math.cos(wall.heading) -
          (wall.z - center.z) * Math.sin(wall.heading)) === side;
      });
      for (let box = 0; box < ordered.length; box++) for (const index of [2, 8, 14]) {
        const at = box * 36 + index, p = point(positions, at), wall = ordered[box];
        slopeUvs.push({height: (p.y - wall.y) / wall.height, v: uv.getY(at)});
      }
    }
    assert.ok(slopeUvs.filter(({height, v}) => Math.abs(height - v) < .2).length > slopeUvs.length * .8,
      'most atlas V coordinates should follow normalized slope height');
  } finally {disposeTree(scene.group);}
});

test('P2 wash shared join positions and UVs agree exactly on all three routes', async () => {
  for (const route of ROUTE_VARIANTS) {
    const models = fakeAssets();
    const scene = createRustwallScene(courseFor(route.seed), {loadAsset: async kind => models[kind]});
    try {
      assert.equal(await scene.ready, true);
      for (const bank of banks(scene)) {
        const positions = bank.geometry.attributes.position, uv = bank.geometry.attributes.uv;
        let matching = 0;
        for (let box = 0; box + 1 < positions.count / 36; box++) {
          const before = box * 36 + 18, after = (box + 1) * 36;
          for (let strip = 0; strip < 3; strip++) {
            const a = before + strip * 6 + (bank.name.includes('right') ? 1 : 2);
            const b = after + strip * 6 + (bank.name.includes('right') ? 2 : 1);
            if (point(positions, a).distanceTo(point(positions, b)) > .00001) continue;
            assert.ok(Math.abs(uv.getX(a) - uv.getX(b)) < 1e-6 &&
              Math.abs(uv.getY(a) - uv.getY(b)) < 1e-6,
            `${route.id}: connected seam must share atlas coordinates`);
            matching++;
          }
        }
        assert.ok(matching >= 100, `${route.id}: enough real joined seams were measured`);
      }
    } finally {disposeTree(scene.group);}
  }
});

test('P2 wall records real source-car provenance for its welded visible hulks', async () => {
  const wall = await actualWall(), hulks = wall.getObjectByName('welded-car-hulks');
  assert.ok(hulks?.isMesh, 'batched visible hulk geometry is retained');
  const sources = hulks.userData.sources;
  assert.ok(Array.isArray(sources) && sources.length === 2,
    'exported hulk batch identifies both actual production source cars');
  for (const id of ['falcone_f42', 'banshee_muscle']) {
    const source = sources.find(item => item.path?.includes(`${id}.glb`));
    assert.ok(source, `${id} source is recorded`);
    assert.match(source.sha256 || '', /^[a-f0-9]{64}$/);
    const sourcePath = new URL(`../${source.path}`, import.meta.url);
    assert.equal(source.sha256, createHash('sha256').update(readFileSync(sourcePath)).digest('hex'),
      `${id} provenance matches the exact production source bytes`);
    assert.equal(source.weldThresholdMetres, .0001);
    assert.ok(source.weldedComponents < source.originalComponents,
      `${id} source seams were welded before decimation`);
    assert.ok(source.bodyTriangles > 100 && source.glassTriangles > 0 &&
      source.wheelTriangles > 0, `${id} retains readable body, glass and wheels`);
  }
  assert.ok(hulks.userData.placedHulks >= 6, 'multiple source-car silhouettes are visible');
  const positions = hulks.geometry.attributes.position;
  assert.ok(positions.count >= 3000, 'source-car body, windows and wheels have substantial visible geometry');
  const triangles = (hulks.geometry.index?.count ?? positions.count) / 3;
  assert.ok(triangles > hulks.userData.placedHulks * 150,
    'actual exported triangles corroborate more than a sparse placeholder per hulk');
  const bounds = new THREE.Box3().setFromObject(hulks);
  assert.ok(bounds.max.x - bounds.min.x > 180 && bounds.max.z - bounds.min.z > 2.5,
    'actual welded-car geometry spans many wall sections with real foreground depth');
  const bins = new Map();
  for (let index = 0; index < positions.count; index++) {
    const p = point(positions, index), bin = Math.floor((p.x + 210) / 35);
    if (!bins.has(bin)) bins.set(bin, {minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity});
    const row = bins.get(bin);
    row.minY = Math.min(row.minY, p.y); row.maxY = Math.max(row.maxY, p.y);
    row.minZ = Math.min(row.minZ, p.z); row.maxZ = Math.max(row.maxZ, p.z);
  }
  assert.ok(bins.size >= 7, 'source-car silhouettes occupy at least seven separated wall sections');
  assert.ok([...bins.values()].filter(row => row.minY <= 1).length >= 3,
    'several actual hulk stacks contact the ground instead of floating in the facade');
  assert.ok([...bins.values()].filter(row => row.maxZ - row.minZ >= 1.5).length >= 5,
    'foreground car bodies have depth at several locations');
});

test('P2 full wall has source-rendered car relief across eight substantial bays with retained 3D silhouettes', async () => {
  const wall = await actualWall(), relief = wall.getObjectByName('source-car-relief');
  const hulks = wall.getObjectByName('welded-car-hulks');
  assert.ok(relief?.isMesh && hulks?.isMesh, 'relief complements actual source-derived car geometry');
  const provenance = relief.userData;
  assert.equal(provenance.sourceRenderPath, 'art-build/rustwall-p2/wall-relief-source.png');
  assert.match(provenance.sourceRenderSha256 || '', /^[a-f0-9]{64}$/);
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../${provenance.sourceRenderPath}`, import.meta.url))).digest('hex'),
    provenance.sourceRenderSha256, 'full-wall relief maps the recorded local source-car render');
  assert.deepEqual(provenance.uvRegion, [260, 132, 507, 379]);
  assert.deepEqual(provenance.sectionIndices, [0, 1, 3, 5, 6, 8, 10, 11]);
  assert.equal(relief.material.name, hulks.material.name, 'relief uses the existing hulks material draw');
  const positions = relief.geometry.attributes.position, uv = relief.geometry.attributes.uv;
  assert.ok(positions?.count > 100 && uv?.count === positions.count, 'actual raised relief surface has authored UVs');
  const indices = relief.geometry.index;
  const vertex = corner => indices ? indices.getX(corner) : corner;
  const bins = new Map(), bounds = new THREE.Box3();
  relief.updateMatrixWorld(true);
  for (let i = 0; i < positions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(positions, i).applyMatrix4(relief.matrixWorld);
    bounds.expandByPoint(point);
    const u = uv.getX(i) * 512, v = (1 - uv.getY(i)) * 512;
    const primary = u >= 260 && u <= 507 && v >= 132 && v <= 379;
    const patch = [1, 12, 14, 15].some(tile => {
      const left = tile % 4 * 128 + 4, top = Math.floor(tile / 4) * 128 + 4;
      return u >= left && u <= left + 119 && v >= top && v <= top + 119;
    });
    assert.ok(primary || patch,
      `full-wall relief UV ${i} stays in a reserved padded source-car image`);
  }
  assert.ok(bounds.max.x - bounds.min.x >= 230 && bounds.min.y <= 2 && bounds.max.y >= 30 &&
    bounds.max.z - bounds.min.z >= .04,
  'actual relief reaches broad, tall and visibly raised wall bays');
  let projectedArea = 0;
  const faceCount = (indices?.count ?? positions.count) / 3;
  for (let face = 0; face < faceCount; face++) {
    const points = [0, 1, 2].map(corner => new THREE.Vector3().fromBufferAttribute(positions,
      vertex(face * 3 + corner)).applyMatrix4(relief.matrixWorld));
    const area = Math.abs((points[1].x - points[0].x) * (points[2].y - points[0].y) -
      (points[1].y - points[0].y) * (points[2].x - points[0].x)) / 2;
    const x = points.reduce((sum, point) => sum + point.x, 0) / 3;
    const bin = Math.floor((x + 210) / 35);
    if (bin >= 0 && bin < 12 && area > .001) bins.set(bin, (bins.get(bin) || 0) + area);
    projectedArea += area;
  }
  assert.ok(projectedArea >= 4500, `relief visibly covers substantial facade area: ${projectedArea.toFixed(1)}m2`);
  assert.ok([...bins.values()].filter(area => area >= 200).length >= 8,
    `eight actual wall zones have source-car area, measured ${JSON.stringify([...bins.entries()])}`);
  const carPositions = hulks.geometry.attributes.position, carWorld = hulks.matrixWorld;
  hulks.updateMatrixWorld(true);
  let foot = 0, upper = 0;
  for (let i = 0; i < carPositions.count; i++) {
    const point = new THREE.Vector3().fromBufferAttribute(carPositions, i).applyMatrix4(carWorld);
    if (point.y <= 3) foot++;
    if (point.y >= 26) upper++;
  }
  assert.ok(foot >= 100 && upper >= 100,
    `retained source-derived 3D cars visibly anchor foot and upper silhouette: ${foot}/${upper} vertices`);
});

test('P2 exported salvage relief faces the actual wall inspection camera in every occupied zone', async () => {
  const wall = await actualWall(), relief = wall.getObjectByName('source-car-relief');
  assert.ok(relief?.isMesh, 'measure actual exported relief triangles');
  relief.updateMatrixWorld(true);
  const geometry = relief.geometry, positions = geometry.attributes.position, index = geometry.index;
  const at = corner => index ? index.getX(corner) : corner;
  const zones = new Map();
  for (let face = 0; face < (index?.count ?? positions.count) / 3; face++) {
    const points = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(positions,
      at(face * 3 + k)).applyMatrix4(relief.matrixWorld));
    const normal = points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
    const projectedArea = Math.abs(normal.z) / 2;
    if (projectedArea < .001) continue;
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / 3;
    const zone = Math.floor((centerX + 210) / 35);
    if (zone < 0 || zone >= 12) continue;
    const row = zones.get(zone) ?? {front: 0, total: 0};
    row.total += projectedArea;
    if (normal.z < 0) row.front += projectedArea;
    zones.set(zone, row);
  }
  const occupied = [...zones.entries()].filter(([, row]) => row.total >= 200);
  assert.ok(occupied.length >= 8, 'measure eight substantial salvage zones');
  for (const [zone, row] of occupied)
    assert.ok(row.front / row.total >= .95,
      `zone ${zone}: ${(100 * row.front / row.total).toFixed(1)}% of actual relief faces glTF -Z inspection camera`);
});

test('P2 wall skyline varies by section and upper braces have real ground paths', async () => {
  const wall = await actualWall(), skyline = new Map(), facadeDepth = new Map();
  wall.traverse(node => {
    if (!node.isMesh || node.name === 'gate-panel' || /^guard-/.test(node.name)) return;
    node.updateMatrixWorld(true);
    const positions = node.geometry.attributes.position;
    const p = new THREE.Vector3();
    for (let index = 0; index < positions.count; index++) {
      p.fromBufferAttribute(positions, index).applyMatrix4(node.matrixWorld);
      const bin = Math.floor((p.x + 210) / 35);
      if (bin < 0 || bin >= 12 || Math.abs(p.x) < 6) continue;
      if (p.y >= 34.5 && p.y <= 54)
        skyline.set(bin, Math.max(skyline.get(bin) ?? 0, p.y));
      if (p.y >= 5 && p.y <= 32)
        facadeDepth.set(bin, Math.min(facadeDepth.get(bin) ?? Infinity, p.z));
    }
  });
  assert.ok(skyline.size >= 9, 'most non-gate sections have an actual roof crown');
  assert.ok(new Set([...skyline.values()].map(value => (Math.round(value * 4) / 4).toFixed(2))).size >= 6,
    'actual roofline has six distinct section heights instead of a short repeat');
  assert.ok(new Set([...facadeDepth.values()].map(value => (Math.round(value * 4) / 4).toFixed(2))).size >= 6,
    'frontmost visible salvage depth varies between large sections');

  const scaffold = wall.getObjectByName('scaffold-steel');
  assert.ok(scaffold?.isMesh, 'structural support geometry is exported');
  const geometry = scaffold.geometry, positions = geometry.attributes.position;
  const count = positions.count, parent = Int32Array.from({length: count}, (_, index) => index);
  const find = index => {while (parent[index] !== index) {
    parent[index] = parent[parent[index]]; index = parent[index];
  } return index;};
  const join = (a, b) => {a = find(a); b = find(b); if (a !== b) parent[b] = a;};
  const indices = geometry.index;
  if (indices) for (let index = 0; index < indices.count; index += 3) {
    const a = indices.getX(index), b = indices.getX(index + 1), c = indices.getX(index + 2);
    join(a, b); join(b, c);
  } else {
    // GLB exporters may omit indices; identical corners still form one strut.
    const coordinates = new Map();
    for (let index = 0; index < count; index++) {
      const key = [positions.getX(index), positions.getY(index), positions.getZ(index)]
        .map(value => value.toFixed(4)).join(',');
      if (coordinates.has(key)) join(index, coordinates.get(key));
      else coordinates.set(key, index);
    }
  }
  const components = new Map(), p = new THREE.Vector3();
  scaffold.updateMatrixWorld(true);
  for (let index = 0; index < count; index++) {
    const key = find(index), row = components.get(key) ?? {minY: Infinity, maxY: -Infinity, x: 0, count: 0};
    p.fromBufferAttribute(positions, index).applyMatrix4(scaffold.matrixWorld);
    row.minY = Math.min(row.minY, p.y); row.maxY = Math.max(row.maxY, p.y);
    row.x += p.x; row.count++; components.set(key, row);
  }
  const groundedZones = new Set([...components.values()].filter(row =>
    row.minY <= 2 && row.maxY >= 20 && Math.abs(row.x / row.count) >= 6)
    .map(row => Math.floor((row.x / row.count + 210) / 35)));
  assert.ok(groundedZones.size >= 6,
    `upper braces connect to actual ground in six sections; measured ${groundedZones.size}`);
});

test('P2 cheap stamped car keeps a round visible tire face in the isolated production-path export', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const blender = process.env.BLENDER_BIN ||
    'C:/Users/kyleb/AppData/Local/Programs/Blender/current/blender.exe';
  execFileSync(blender, ['-b', '--python-exit-code', '1', '--python',
    'tools/blender/rustwall.py', '--', '--root', root, '--round', '1', '--p2-wheel-probe'],
  {cwd: root, timeout: 120000, maxBuffer: 20 * 1024 * 1024});
  const probe = new URL('../art-build/rustwall-p2/wheel-probe.glb', import.meta.url);
  const manifest = JSON.parse(readFileSync(new URL('../art-build/rustwall-p2/wheel-probe.json', import.meta.url), 'utf8'));
  const placement = manifest.stamp;
  assert.equal(manifest.placedHulks, 1, 'probe isolates one production-path cheap source car');
  const bytes = readFileSync(probe);
  const model = (await testLoader.parseAsync(bytes.buffer.slice(bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength), '')).scene;
  const hulk = model.getObjectByName('welded-car-hulks');
  assert.ok(hulk?.isMesh, 'actual exported hulk batch');
  const geometry = hulk.geometry, positions = geometry.attributes.position, uv = geometry.attributes.uv;
  const index = geometry.index;
  const triangles = [];
  const at = face => [0, 1, 2].map(corner => index ? index.getX(face * 3 + corner) : face * 3 + corner);
  const faceCount = (index?.count ?? positions.count) / 3;
  for (let face = 0; face < faceCount; face++) {
    const ids = at(face);
    // The tire rubber uses the third column of the first Blender atlas row;
    // glTF V is flipped, so its exported UVs lie in the upper-right tile.
    if (!ids.every(id => uv.getX(id) > .75 && uv.getY(id) > .75)) continue;
    const vertices = ids.map(id => point(positions, id));
    const center = vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3);
    if (center.x < placement.x - placement.length * .5 ||
        center.x > placement.x - placement.length * .1) continue;
    const normal = vertices[1].clone().sub(vertices[0])
      .cross(vertices[2].clone().sub(vertices[0])).normalize();
    triangles.push({vertices, center, normal});
  }
  assert.ok(triangles.length >= 8, 'measured tire comes from the actual cheap stamped template');
  const corners = triangles.flatMap(face => face.vertices);
  const tireBox = Object.fromEntries(['x', 'y'].map(axis => [axis, [
    Math.min(...corners.map(p => p[axis])), Math.max(...corners.map(p => p[axis]))]]));
  const extent = axis => Math.max(...corners.map(p => p[axis])) - Math.min(...corners.map(p => p[axis]));
  const aspect = extent('y') / extent('x');
  const front = new THREE.Vector3(Math.sin(placement.yaw), 0, -Math.cos(placement.yaw));
  const bodyDepths = [];
  for (let face = 0; face < faceCount; face++) {
    const ids = at(face);
    if (!ids.every(id => uv.getX(id) < .25 && uv.getY(id) > .75)) continue;
    const center = ids.map(id => point(positions, id)).reduce((a, b) => a.add(b), new THREE.Vector3()).divideScalar(3);
    if (center.x > tireBox.x[0] - .15 && center.x < tireBox.x[1] + .15 &&
        center.y > tireBox.y[0] - .15 && center.y < tireBox.y[1] + .15)
      bodyDepths.push(center.dot(front));
  }
  const bodyOuterDepth = Math.max(...bodyDepths);
  assert.ok(bodyDepths.length > 0, 'body side is measurable beside the exported tire');
  const caps = triangles.filter(face => Math.abs(face.normal.dot(front)) > .75 &&
    face.center.dot(front) > bodyOuterDepth - .05);
  const outwardCaps = caps.filter(face => face.normal.dot(front) > .75);
  const inwardCaps = caps.filter(face => face.normal.dot(front) < -.75);
  const rimPoints = [...new Map(outwardCaps.flatMap(face => face.vertices)
    .map(point => [`${point.x.toFixed(4)},${point.y.toFixed(4)}`, point])).values()];
  const centerX = rimPoints.reduce((sum, point) => sum + point.x, 0) / rimPoints.length;
  const centerY = rimPoints.reduce((sum, point) => sum + point.y, 0) / rimPoints.length;
  const radius = point => Math.hypot(point.x - centerX, point.y - centerY);
  const outerRadius = Math.max(...rimPoints.map(radius));
  const rimAngles = rimPoints.filter(point => radius(point) >= outerRadius * .8)
    .map(point => Math.atan2(point.y - centerY, point.x - centerX));
  const radialDirections = [];
  for (const angle of rimAngles) if (!radialDirections.some(prior =>
    Math.abs(Math.atan2(Math.sin(angle - prior), Math.cos(angle - prior))) < .12))
    radialDirections.push(angle);
  // The inner cap may be concealed by the body. Check only the cap planes that
  // actually reach the camera-facing exterior side of this one-car export.
  const capClearance = Math.min(...outwardCaps.map(face => face.center.dot(front) - bodyOuterDepth));
  assert.ok(aspect >= .65 && aspect <= 1.45 && radialDirections.length >= 6 &&
    outwardCaps.length >= 4 &&
    inwardCaps.length === 0 && capClearance >= .01,
    `exported near tire requires a round visible face: height/width=${aspect.toFixed(2)}, ` +
    `outer rim directions=${radialDirections.length}, ` +
    `visible outward/inward caps=${outwardCaps.length}/${inwardCaps.length}, ` +
    `minimum body clearance=${capClearance.toFixed(3)}m`);
});
