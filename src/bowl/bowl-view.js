import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {flipbookFrameUVInto} from '../combat-vfx-atlas.js';
import {addArenaCrushables} from '../arena-props.js';
import {bowlCentre} from './bowl-course.js';

const STADIUM = '/assets/models/wasteland/bowl/stadium.glb';
const CRUSH = '/assets/models/wasteland/bowl/crush.glb';
const FIRE = '/assets/textures/fire-flipbook.png';
const PALETTE = [0x53645b, 0x935143, 0x557185, 0x806449, 0x596b70];
const loader = new GLTFLoader();

function disposeTree(root) {
  root?.traverse?.(node => {
    node.geometry?.dispose?.();
    for (const material of [node.material].flat().filter(Boolean)) material.dispose?.();
  });
}

function makeFire(texture, name) {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({map: texture, transparent: true,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false});
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    mesh.quaternion.copy(camera.quaternion);
    mesh.updateMatrixWorld();
  };
  return mesh;
}

function setFrame(mesh, frame) {
  const values = flipbookFrameUVInto(frame, {columns: 8, rows: 8}, {});
  const uv = mesh.geometry.getAttribute('uv');
  const corners = [[0, 1], [1, 1], [0, 0], [1, 0]];
  corners.forEach(([x, y], index) => uv.setXY(index,
    values.offsetX + x * values.repeatX, values.offsetY + y * values.repeatY));
  uv.needsUpdate = true;
}

// The stadium model was drawn round its own middle with four ramps on its floor.
// The ring's ramps are the course's, so the authored ramps go, and any low prop
// (a wreck, a fallen panel) that would stand on the ring is cut out. The podium
// on the island and the wrecks in the corners stay.
const AUTHORED_FLOOR_PROPS = /^bowl-ramp-\d/;
function clearRing(stadium, ring) {
  const remove = [];
  stadium.traverse(node => { if (node !== stadium && AUTHORED_FLOOR_PROPS.test(node.name)) remove.push(node); });
  remove.forEach(node => { node.removeFromParent(); disposeTree(node); });
  const inside = (x, z, a, b) => (x / a) ** 2 + (z / b) ** 2 < 1;
  const onRing = (x, z) => inside(x, z, ring.a + ring.outer, ring.b + ring.outer) &&
    !inside(x, z, Math.max(.1, ring.a - ring.inner), Math.max(.1, ring.b - ring.inner));
  // The model's meshes merge many separate boxes. Triangles that share a corner
  // position belong to one box; a low box with any corner on the ring goes whole,
  // so nothing is left half cut where it crosses a wall.
  let cut = 0;
  stadium.updateMatrixWorld(true);
  stadium.traverse(node => {
    if (!node.isMesh || node.name === 'bowl-dirt-floor' || !node.geometry?.index) return;
    const position = node.geometry.getAttribute('position'), index = node.geometry.index.array;
    const local = new THREE.Matrix4().copy(stadium.matrixWorld).invert().multiply(node.matrixWorld), p = new THREE.Vector3();
    const points = [], corner = new Map(), parent = [];
    const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    for (let v = 0; v < position.count; v++) {
      points.push(p.fromBufferAttribute(position, v).applyMatrix4(local).clone());
      const key = `${points[v].x.toFixed(3)},${points[v].y.toFixed(3)},${points[v].z.toFixed(3)}`;
      parent[v] = v;
      if (corner.has(key)) parent[find(v)] = find(corner.get(key)); else corner.set(key, v);
    }
    for (let i = 0; i < index.length; i += 3) {
      parent[find(index[i + 1])] = find(index[i]);
      parent[find(index[i + 2])] = find(index[i]);
    }
    const low = new Map(), touches = new Map();
    for (let v = 0; v < points.length; v++) {
      const box = find(v);
      low.set(box, (low.get(box) ?? true) && points[v].y < 2.5);
      if (onRing(points[v].x, points[v].z)) touches.set(box, true);
    }
    const kept = [];
    for (let i = 0; i < index.length; i += 3) {
      const box = find(index[i]);
      if (low.get(box) && touches.get(box)) { cut++; continue; }
      kept.push(index[i], index[i + 1], index[i + 2]);
    }
    if (kept.length < index.length) node.geometry.setIndex(kept);
  });
  return {removed: remove.length, cutTriangles: cut};
}

// A squat welded housing and nozzle under each flame jet, drawn here so it stands
// where the course puts the jet.
function jetHousing(name) {
  const housing = new THREE.Group();
  housing.name = name;
  const soot = new THREE.MeshStandardMaterial({color: 0x24201d, roughness: .9, metalness: .2});
  const steel = new THREE.MeshStandardMaterial({color: 0x5d6266, roughness: .55, metalness: .7});
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, .8, 1.25), soot);
  body.position.y = .4;
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(.26, .3, .46, 10), steel);
  nozzle.position.y = 1.03;
  housing.add(body, nozzle);
  return housing;
}

// The crush model's parts are siblings under one root, and the root's turn is what
// stands them upright (Blender is Z up). Each part keeps its whole placement in the
// model; the set is then stood on the ground, centred on its course point and
// turned to the course.
function authoredParts(scene, prefixes, feature, name) {
  scene.updateMatrixWorld(true);
  const contents = new THREE.Group();
  scene.traverse(node => {
    if (!node.isMesh || !prefixes.some(prefix => node.name.startsWith(prefix))) return;
    const part = node.clone(false);
    node.matrixWorld.decompose(part.position, part.quaternion, part.scale);
    contents.add(part);
  });
  if (!contents.children.length) return null;
  const bounds = new THREE.Box3().setFromObject(contents);
  const center = bounds.getCenter(new THREE.Vector3());
  contents.position.set(-center.x, -bounds.min.y, -center.z);
  const prop = new THREE.Group();
  prop.name = name;
  prop.position.set(feature.x, feature.y, feature.z);
  prop.rotation.y = feature.heading;
  prop.add(contents);
  return prop;
}

export function createBowlView({loadModel = url => loader.loadAsync(url),
  loadFireTexture = () => new THREE.TextureLoader().loadAsync(FIRE)} = {}) {
  const group = new THREE.Group();
  group.name = 'Bowl show night';
  group.visible = false;
  let course = null, enabled = false, disposed = false, token = 0;
  let fireTexture = null, firePromise = null, modelPromise = null, crushSource = null;
  let crushShells = null, stadium = null;
  const fires = [];
  const lights = [];
  // The model's bus, RV and stacks, by crush target: each settles lower once crushed.
  const authored = new Map();

  function clear() {
    token++;
    for (const child of [...group.children]) {
      child.removeFromParent();
      disposeTree(child);
    }
    disposeTree(crushSource);
    crushSource = null;
    fires.length = 0;
    authored.clear();
    lights.splice(0).forEach(light => light.dispose?.());
    course = null; crushShells = null; stadium = null;
    firePromise = null; modelPromise = null;
  }

  function installFire(texture, position, name, phase = 0) {
    const mesh = makeFire(texture, name);
    mesh.position.copy(position);
    mesh.scale.set(3.8, 5.7, 1);
    group.add(mesh);
    fires.push({mesh, position: position.clone(), phase});
    return fires.at(-1);
  }

  function build(next, now) {
    clear();
    course = next;
    const current = token;
    group.visible = true;
    modelPromise = Promise.all([loadModel(STADIUM), loadModel(CRUSH)]).then(([stadiumAsset, crushAsset]) => {
      if (disposed || !enabled || current !== token) {
        disposeTree(stadiumAsset.scene); disposeTree(crushAsset.scene); return;
      }
      stadium = stadiumAsset.scene;
      crushSource = crushAsset.scene;
      stadium.name = 'Bowl stadium, floodlights and crowd';
      const centre = bowlCentre(next), floor = next.def.scrapdome;
      stadium.position.set(centre.x, centre.y, centre.z);
      const ring = {a: Math.abs(next.worldAt(0, 0).x - centre.x), b: Math.abs(next.worldAt(next.length / 4, 0).z - centre.z),
        outer: floor.outerWallOffset + .5, inner: floor.wallOffset + .5};
      group.userData.stadiumCleared = clearRing(stadium, ring);
      group.add(stadium);
      const targets = next.features.crushables;
      const shells = targets.filter(feature => feature.sourceKind === 'junkCar');
      if (shells.length) {
        const cars = addArenaCrushables(group, {features: {crushables: shells}});
        cars.name = 'Bowl faded junk car crush line';
        crushShells = cars;
      }
      for (const feature of targets) {
        let prop = null;
        if (feature.sourceKind === 'bowlBus' || feature.sourceKind === 'bowlRv') {
          prop = authoredParts(crushAsset.scene, [feature.sourceKind === 'bowlBus' ? 'bus-crushed-' : 'rv-crushed-'],
            feature, `Bowl authored crush ${feature.id}`);
          if (prop) paintCrushProp(prop, {tint: feature.color});
        } else if (feature.sourceKind === 'bowlBurningHeap') {
          // A burning stack on each of the heap's three places, the outer two turned round.
          prop = authoredParts(crushAsset.scene, ['fire-stack-', 'fire-heap-'], feature,
            feature.off === 0 ? 'Bowl burning bus stack' : `Bowl burning bus stack ${feature.id}`);
          if (prop) { paintCrushProp(prop, {burnt: .65}); if (feature.off) prop.rotation.y += Math.PI; }
        }
        if (prop) { group.add(prop); authored.set(feature.id, prop); }
        if (feature.bowlFire) {
          // The fire burns out of the top of its stack, its foot a little below the top.
          const top = prop ? new THREE.Box3().setFromObject(prop).max.y - feature.y : 0;
          const p = new THREE.Vector3(feature.x, feature.y + Math.max(1.8, top + .8), feature.z);
          const fire = installFire(fireTexture, p, `Bowl heap fire ${feature.id}`, feature.s * .001);
          // It sinks with its stack when the stack is crushed.
          if (prop) Object.assign(fire, {stack: prop, base: feature.y, top});
        }
      }
      const jets = next.features.flameJets || [];
      jets.forEach((jet, index) => {
        const p = next.groundAt(jet.s, jet.off), top = p.y + (jet.wallTop || 0);
        const housing = jetHousing(`Bowl flame jet housing ${jet.id}`);
        housing.position.set(p.x, top, p.z);
        housing.rotation.y = p.heading;
        group.add(housing);
        // Paired jets fire together, each pair a beat after the last.
        installFire(fireTexture, new THREE.Vector3(p.x, top + 3.6, p.z),
          `Bowl flame jet ${jet.id}`, Math.floor(index / 2) * .41);
      });
      // A pool of show light under each of the stadium's four floodlight banks.
      for (const [x, z, color] of [[-42, -25, 0xffbd73], [42, -25, 0x78aaff],
        [-42, 24, 0xff7744], [42, 24, 0xffd28a]]) {
        const light = new THREE.PointLight(color, 850, 105, 2);
        light.position.set(centre.x + x, 24, centre.z + z);
        group.add(light); lights.push(light);
      }
      group.userData.stadiumReady = true;
      group.userData.crushModelsReady = true;
      group.userData.flameJetCount = jets.length;
      group.userData.heapFireCount = targets.filter(feature => feature.bowlFire).length;
      group.userData.bowlViewBuiltAt = now;
    }).catch(error => {
      if (!disposed && current === token) group.userData.assetError = error?.message || 'Bowl art could not load';
    });
  }

  return {group, update(next, state, now, show) {
    enabled = show === true && next?.def?.bowl === true && !disposed;
    group.visible = enabled;
    if (!enabled) {
      if (course) clear();
      return;
    }
    if (next !== course) build(next, now);
    if (crushShells) crushShells.userData.updateSimulation(state || {}, 0);
    const crushed = state?.crushedProps || [];
    for (const [id, prop] of authored) {
      const target = crushed.includes(id) ? .5 : 1;
      prop.scale.y += (target - prop.scale.y) * .2;
      if (Math.abs(target - prop.scale.y) < .002) prop.scale.y = target;
    }
    if (!fireTexture) {
      firePromise ??= loadFireTexture().then(texture => {
        if (disposed) { texture.dispose?.(); return; }
        fireTexture = texture;
        if (course) build(course, now);
      }).catch(error => { group.userData.fireError = error?.message || 'Bowl fire texture could not load'; });
    }
    for (const [index, fire] of fires.entries()) {
      if (fire.stack) fire.mesh.position.y = fire.base + Math.max(1.8, fire.top * fire.stack.scale.y + .8);
      const cycle = ((now * .001 + fire.phase) % 3.2 + 3.2) % 3.2;
      const active = fire.mesh.name.startsWith('Bowl heap fire') || cycle < 1.55;
      fire.mesh.visible = !!fireTexture && active;
      if (!fire.mesh.visible) continue;
      const frame = 8 + Math.floor(((now * .0015 + fire.phase) % 1) * 16);
      setFrame(fire.mesh, Math.min(63, frame));
      const pulse = .91 + .09 * Math.sin(now * .009 + index);
      fire.mesh.scale.set(3.8 * pulse, 5.7 * pulse, 1);
    }
  }, dispose() {
    if (disposed) return;
    disposed = true; clear(); fireTexture?.dispose?.();
    group.removeFromParent();
  }};
}

// crush.glb keeps its materials' names but not their colours (its Blender shaders do
// not export), so they arrive white. Each is coloured here by name: [colour,
// roughness, metalness]. Only a vehicle's own paint takes its faded tint, and the
// burning stack is blackened by its fire (BOWL-ART-CRUSH round 3).
const CRUSH_MATERIALS = {
  'old ivory bus enamel': [0xb3a682, .9, .05],
  'deep red rust and flaking scale': [0x6b3521, .95, .1],
  'welded dark steel, scraped bare at edges': [0x3d4043, .6, .65],
  'cracked salvaged rubber': [0x1c1b1a, .95, 0],
  'oxide paint under rust streaks': [0x7b5539, .9, .1],
  'black heat soot': [0x171412, 1, 0],
  'yard junk car faded oxide': [0x8a5a3c, .85, .1],
  'yard junk car faded green': [0x55654a, .85, .1],
  'yard junk car faded blue': [0x4f6474, .85, .1],
  'faded sage RV enamel': [0x8d9a83, .85, .05],
  'faded blue grey van enamel': [0x7d8a93, .85, .05],
};
const SOOT = new THREE.Color(0x1d1814);

function paintCrushProp(root, {tint = null, burnt = 0} = {}) {
  const color = tint == null ? null : new THREE.Color(tint);
  root.traverse(node => {
    if (!node.isMesh) return;
    node.material = [node.material].flat().filter(Boolean).map(material => {
      const clone = material.clone(), known = CRUSH_MATERIALS[material.name];
      if (known && clone.color) {
        clone.color.setHex(known[0]);
        clone.roughness = known[1];
        clone.metalness = known[2];
      }
      if (color && /enamel|paint/.test(material.name)) clone.color?.lerp(color, .58);
      // The fire blackens the stack, but not its glowing coals.
      if (burnt && !/ember|flame/.test(material.name) && !clone.emissive?.getHex()) clone.color?.lerp(SOOT, burnt);
      return clone;
    });
    if (node.material.length === 1) node.material = node.material[0];
  });
}
