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
