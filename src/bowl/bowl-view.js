import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {flipbookFrameUVInto} from '../combat-vfx-atlas.js';
import {addArenaCrushables} from '../arena-props.js';
import {createBowlStadium} from './bowl-stadium.js';
import {createRexView} from './bowl-rex-view.js';
import {bowlJumpGround} from './bowl-crush-field.js';

const CRUSH = '/assets/models/wasteland/bowl/crush.glb';
const FIRE = '/assets/textures/fire-flipbook.png';
const PALETTE = [0x53645b, 0x935143, 0x557185, 0x806449, 0x596b70];
const loader = new GLTFLoader();

function disposeTree(root) {
  root?.traverse?.(node => {
    // three.js shares one geometry between every sprite.
    if (!node.isSprite) node.geometry?.dispose?.();
    for (const material of [node.material].flat().filter(Boolean)) {
      // Pictures drawn for this view go with it; shared photographs stay loaded.
      for (const texture of [material.map, material.bumpMap, material.alphaMap, material.emissiveMap])
        if (texture && !texture.userData?.sharedAsset) texture.dispose?.();
      material.dispose?.();
    }
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

function jumpBar(line) {
  const group = new THREE.Group(), {posts, halfWidth} = line.bar;
  group.name = 'High Jump flame bar';
  const steel = new THREE.MeshStandardMaterial({color: 0x494442, roughness: .73, metalness: .5});
  for (const point of posts) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(.27, 15, .34), steel);
    post.position.set(point.x, point.y + 7.5, point.z);
    group.add(post);
  }
  const flame = new THREE.Group();
  const ember = new THREE.MeshBasicMaterial({color: 0xf35a12, toneMapped: false});
  const core = new THREE.MeshBasicMaterial({color: 0xffb33b, toneMapped: false});
  const rail = new THREE.Mesh(new THREE.BoxGeometry(halfWidth * 2, .18, .18), ember);
  flame.add(rail);
  for (let i = 0; i < 18; i++) {
    const tongue = new THREE.Mesh(new THREE.ConeGeometry(.23, .62, 4), i % 3 ? core : ember);
    tongue.position.set(-halfWidth + (i + .5) * halfWidth / 9, -.35, 0);
    flame.add(tongue);
  }
  flame.position.set((posts[0].x + posts[1].x) / 2, 0, (posts[0].z + posts[1].z) / 2);
  flame.rotation.y = line.crest.heading;
  group.add(flame);
  return {group, flame, tongues: flame.children.slice(1)};
}

function homeRings(course, target) {
  const group = new THREE.Group();
  group.name = 'Home Run target rings';
  const colours = [0xffaf37, 0xffe1a0, 0xf58648];
  for (const [index, radius] of target.radii.entries()) {
    const vertices = [], triangles = [], segments = 96;
    for (let i = 0; i <= segments; i++) {
      const angle = i * Math.PI * 2 / segments;
      for (const edge of [radius - .42, radius]) {
        const p = bowlJumpGround(course, {
          x: target.x + Math.sin(angle) * edge,
          z: target.z + Math.cos(angle) * edge,
        });
        vertices.push(p.x, p.y + .10, p.z);
      }
      const n = i * 2;
      if (i < segments) triangles.push(n, n + 1, n + 3, n, n + 3, n + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(triangles);
    const material = new THREE.MeshBasicMaterial({color: colours[index], side: THREE.DoubleSide});
    group.add(new THREE.Mesh(geometry, material));
  }
  return group;
}

export function createBowlView({loadModel = url => loader.loadAsync(url),
  loadFireTexture = () => new THREE.TextureLoader().loadAsync(FIRE)} = {}) {
  const group = new THREE.Group();
  group.name = 'Bowl show night';
  group.visible = false;
  let course = null, enabled = false, disposed = false, token = 0;
  let fireTexture = null, firePromise = null, modelPromise = null, crushSource = null;
  let crushShells = null, stadium = null, highBar = null;
  const fires = [];
  // The model's bus, RV and stacks, by crush target: each settles lower once crushed.
  const authored = new Map();
  // BOWL-REX-FIGHT: the Scrapasaurus keeps its own parts, so clearing the stadium leaves it alone.
  const rexView = createRexView({loadModel});
  group.add(rexView.group);

  // `keepStadium` keeps the drawn stadium (about a quarter of a second to build) when
  // only the crush props and fires are rebuilt for the same course.
  function clear(keepStadium = false) {
    token++;
    for (const child of [...group.children]) {
      if (child === rexView.group) continue;
      if (keepStadium && child === stadium) continue;
      child.removeFromParent();
      disposeTree(child);
    }
    disposeTree(crushSource);
    crushSource = null;
    fires.length = 0;
    authored.clear();
    course = null; crushShells = null; highBar = null;
    if (!keepStadium) stadium = null;
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
    const keep = !!stadium && stadium.userData.course === next;
    clear(keep);
    course = next;
    const current = token;
    group.visible = true;
    // The stadium is drawn in code round the course's floor (src/bowl/bowl-stadium.js), once per course.
    if (!keep) {
      stadium = createBowlStadium(next);
      stadium.userData.course = next;
      group.add(stadium);
    }
    const jump = next.features.bowlJump;
    if (jump?.bar) {
      highBar = jumpBar(jump);
      group.add(highBar.group);
    }
    if (jump?.target) group.add(homeRings(next, jump.target));
    group.userData.stadiumReady = true;
    modelPromise = loadModel(CRUSH).then(crushAsset => {
      if (disposed || !enabled || current !== token) { disposeTree(crushAsset.scene); return; }
      crushSource = crushAsset.scene;
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
        if (prop) {
          group.add(prop);
          authored.set(feature.id, {mesh: prop, raisedY: feature.y, floorY: feature.bowlStackBase});
        }
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
    rexView.update(next, state, now, enabled);
    if (!enabled) {
      if (course) clear();
      return;
    }
    if (next !== course) build(next, now);
    stadium?.userData.update?.(now, undefined, state);
    if (highBar) {
      highBar.flame.position.y = state?.bowlNight?.event?.barHeight ?? 6;
      for (const [index, tongue] of highBar.tongues.entries()) {
        tongue.scale.y = .7 + .3 * Math.sin(now * .016 + index * 1.29);
      }
    }
    if (crushShells) crushShells.userData.updateSimulation(state || {}, 0);
    const crushed = state?.crushedProps || [];
    for (const [id, {mesh, raisedY, floorY}] of authored) {
      const flat = crushed.includes(id);
      const scale = flat ? .5 : 1;
      mesh.scale.y += (scale - mesh.scale.y) * .2;
      if (Math.abs(scale - mesh.scale.y) < .002) mesh.scale.y = scale;
      if (floorY != null) {
        const y = flat ? floorY + .25 : raisedY;
        mesh.position.y += (y - mesh.position.y) * .2;
        if (Math.abs(y - mesh.position.y) < .002) mesh.position.y = y;
      }
    }
    if (!fireTexture) {
      firePromise ??= loadFireTexture().then(texture => {
        if (disposed) { texture.dispose?.(); return; }
        texture.userData.sharedAsset = true; // kept through rebuilds; disposed with the view
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
    disposed = true; clear(); fireTexture?.dispose?.(); rexView.dispose();
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
