// A course after a forest fire (docs/HELI_FIRE.md sections 8.4, 8.5 and 14):
// black trunks with no needles, snags and fallen logs among them, grey ash
// ground, then green shoots, then pink fireweed, and thin smoke on the first
// three play days. The same set draws the scars a fire put out leaves.
// Drawing only, in races and from the air: it changes the drawn pines and
// adds its own meshes, and never touches the course, race state, replays or
// world signatures. Outside src/heli/ and imports nothing from it.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {renderedGroundHeight} from './rendered-ground.js';

export const BURNT_ASSET_DIR = '/assets/burnt/';
export const BURNT_LOOK = Object.freeze({
  cell: 20,
  // Charred bark (FIRE-VIEW card): linear 0.012, 0.011, 0.010.
  charcoal: Object.freeze([0.012, 0.011, 0.010]),
  snagEvery: 6, logEvery: 11,
  ground: Object.freeze({closed: 'ground-black.jpg', black: 'ground-black.jpg', shoots: 'ground-shoots.jpg', fireweed: 'ground-fireweed.jpg'}),
  clumps: Object.freeze({closed: [0, 0], black: [0, 0], shoots: [5, 0], fireweed: [4, 3]}),
  smokeWisps: 10,
});
const SNAGS = Object.freeze(['snag_tall', 'snag_broken', 'snag_leaning']);
const cellOf = (x, z) => (Math.floor(x / BURNT_LOOK.cell) + 512) * 1024 + (Math.floor(z / BURNT_LOOK.cell) + 512);
const cellMiddle = cell => [(Math.floor(cell / 1024) - 512 + .5) * BURNT_LOOK.cell, (cell % 1024 - 512 + .5) * BURNT_LOOK.cell];
const hash = (a, b) => {
  let h = Math.imul((a + 1) ^ 0x85ebca6b, 2654435761) ^ Math.imul(b + 3, 40503);
  h = Math.imul(h ^ (h >>> 15), 2246822519); h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};

// look: {stage: 'closed'|'black'|'shoots'|'fireweed'|null, smoke, scars:
// [{cells, stage}], live: [cell]} or null for the normal course. A cell's
// stage: the whole course's stage, else a scar's, else the live fire's
// burnt cells (black).
export function cellStages(look) {
  const stages = new Map();
  for (const scar of look?.scars ?? []) for (const cell of scar.cells) stages.set(cell, scar.stage);
  for (const cell of look?.live ?? []) stages.set(cell, 'black');
  return stages;
}

export const lookSignature = look => look ? JSON.stringify([look.stage ?? null, !!look.smoke,
  (look.scars ?? []).map(s => [s.stage, s.cells.length, s.cells[0] ?? 0]), (look.live ?? []).length, (look.live ?? []).at(-1) ?? 0]) : '';

const defaultLoad = {
  model: url => new GLTFLoader().loadAsync(url).then(gltf => gltf.scene),
  texture: (THREE, url) => new THREE.TextureLoader().loadAsync(url),
};

export function createBurntLook({THREE, scene, load = defaultLoad}) {
  const group = new THREE.Group();
  group.name = 'Burnt look';
  scene.add(group);
  const assets = {status: 'idle', props: null, textures: new Map(), smoke: null};
  let applied = {course: null, signature: '', meshes: 0}, changes = [], wisps = [], time = 0, calls = 0;

  const ensureAssets = courseId => {
    if (assets.status !== 'idle') return;
    assets.status = 'loading';
    const dir = `${BURNT_ASSET_DIR}${courseId}/`;
    Promise.all([load.model(`${dir}burnt-props.glb`),
      ...[...new Set(Object.values(BURNT_LOOK.ground))].map(name => load.texture(THREE, dir + name).then(texture => [name, texture]))])
      .then(([props, ...textures]) => {
        assets.props = props;
        for (const [name, texture] of textures) {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace;
          assets.textures.set(name, texture);
        }
        assets.status = 'ready';
        applied.signature = ''; // draw again now the art is in
      }).catch(error => { assets.status = 'error'; console.warn(`The burnt look did not load: ${error?.message || error}`); });
  };

  // Put every drawn pine back as it was and remove what this look added.
  function restore() {
    for (const undo of changes.reverse()) undo();
    changes = [];
    for (const child of [...group.children]) { group.remove(child); child.geometry?.dispose?.(); if (child.material && !child.material.userData?.shared) child.material.dispose?.(); }
    wisps = [];
  }

  function pineMeshes() {
    const found = new Map();
    scene.traverse(object => {
      if (!object.isInstancedMesh || typeof object.name !== 'string') return;
      const match = /^Pine (trunks|crowns) (.+)$/.exec(object.name);
      if (!match) return;
      if (!found.has(match[2])) found.set(match[2], {});
      found.get(match[2])[match[1]] = object;
    });
    return [...found.values()].filter(pair => pair.trunks && pair.crowns);
  }

  function draw(course, look) {
    restore();
    if (!look) return;
    const whole = look.stage ?? null, stages = cellStages(look), matrix = new THREE.Matrix4(), position = new THREE.Vector3();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const burnt = new Map();  // cell -> stage, for the ground and clumps
    const snags = [];
    let treeIndex = 0;
    for (const {trunks, crowns} of pineMeshes()) {
      if (!trunks.instanceColor) {
        trunks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(trunks.count * 3).fill(1), 3);
        changes.push(() => { trunks.instanceColor = null; trunks.material.needsUpdate = true; });
        trunks.material.needsUpdate = true;
      }
      const colours = trunks.instanceColor.array.slice();
      for (let i = 0; i < trunks.count; i++) {
        trunks.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix);
        const cell = cellOf(position.x, position.z), stage = whole ?? stages.get(cell);
        treeIndex++;
        if (!stage) continue;
        burnt.set(cell, stage);
        const crown = new THREE.Matrix4(); crowns.getMatrixAt(i, crown);
        crowns.setMatrixAt(i, zero);
        const snag = treeIndex % BURNT_LOOK.snagEvery === 0, log = !snag && treeIndex % BURNT_LOOK.logEvery === 0;
        if (snag || log) {
          const trunk = matrix.clone();
          trunks.setMatrixAt(i, zero);
          snags.push({name: log ? 'log_fallen' : SNAGS[treeIndex % SNAGS.length], matrix: trunk});
          changes.push(() => trunks.setMatrixAt(i, trunk));
        }
        trunks.instanceColor.setXYZ(i, ...BURNT_LOOK.charcoal);
        changes.push(() => crowns.setMatrixAt(i, crown));
      }
      changes.push(() => { trunks.instanceColor?.array.set(colours); if (trunks.instanceColor) trunks.instanceColor.needsUpdate = true;
        trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true; });
      trunks.instanceColor.needsUpdate = trunks.instanceMatrix.needsUpdate = crowns.instanceMatrix.needsUpdate = true;
    }
    if (assets.status !== 'ready') return;
    // Snags and fallen logs where some of the trees stood.
    const byName = new Map();
    for (const snag of snags) { if (!byName.has(snag.name)) byName.set(snag.name, []); byName.get(snag.name).push(snag.matrix); }
    for (const [name, list] of byName) {
      const node = assets.props.getObjectByName(name);
      const mesh = node && firstMesh(node);
      if (!mesh) continue;
      const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, list.length);
      list.forEach((m, k) => instanced.setMatrixAt(k, m));
      instanced.castShadow = instanced.receiveShadow = true;
      instanced.name = `Burnt ${name}`;
      shareMaterial(instanced);
      group.add(instanced);
    }
    // The forest floor by stage, laid over the course's own ground.
    const byStage = new Map();
    for (const [cell, stage] of burnt) { if (!byStage.has(stage)) byStage.set(stage, []); byStage.get(stage).push(cell); }
    for (const [stage, cells] of byStage) {
      const texture = assets.textures.get(BURNT_LOOK.ground[stage]);
      if (texture) group.add(groundPatches(course, cells, texture, stage));
      const [shoots, fireweed] = BURNT_LOOK.clumps[stage] ?? [0, 0];
      if (shoots) group.add(clumps(course, cells, 'shoots', shoots, 1));
      if (fireweed) group.add(clumps(course, cells, 'fireweed', fireweed, 2));
    }
    if (look.smoke && burnt.size) addWisps(course, [...burnt.keys()]);
  }

  const firstMesh = node => { let found = null; node.traverse(o => { if (!found && o.isMesh) found = o; }); return found; };
  const shareMaterial = mesh => { if (mesh.material) mesh.material.userData = {...mesh.material.userData, shared: true}; };

  function groundPatches(course, cells, texture, stage) {
    const size = BURNT_LOOK.cell, steps = 4, positions = [], uvs = [], index = [];
    for (const cell of cells) {
      const [cx, cz] = cellMiddle(cell), base = positions.length / 3;
      for (let a = 0; a <= steps; a++) for (let b = 0; b <= steps; b++) {
        const x = cx - size / 2 + size * a / steps, z = cz - size / 2 + size * b / steps;
        const y = renderedGroundHeight(course, {x, z}, {requireSurface: true});
        positions.push(x, (Number.isFinite(y) ? y : 0) + .06, z); uvs.push(x / 8, z / 8);
      }
      for (let a = 0; a < steps; a++) for (let b = 0; b < steps; b++) {
        const i = base + a * (steps + 1) + b;
        index.push(i, i + 1, i + steps + 1, i + 1, i + steps + 2, i + steps + 1);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index); geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({map: texture, roughness: .95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `Burnt ground ${stage}`; mesh.receiveShadow = true;
    return mesh;
  }

  function clumps(course, cells, name, per, salt) {
    const node = assets.props.getObjectByName(name), mesh = node && firstMesh(node);
    if (!mesh) return new THREE.Group();
    const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, cells.length * per);
    const object = new THREE.Object3D();
    let k = 0;
    for (const cell of cells) for (let n = 0; n < per; n++) {
      const [cx, cz] = cellMiddle(cell), x = cx + (hash(cell, n * 7 + salt) - .5) * 18, z = cz + (hash(cell, n * 7 + salt + 3) - .5) * 18;
      const y = renderedGroundHeight(course, {x, z}, {requireSurface: true});
      object.position.set(x, Number.isFinite(y) ? y : 0, z); object.rotation.set(0, hash(cell, n + salt) * Math.PI * 2, 0);
      object.scale.setScalar(.8 + hash(cell, n + 40) * .6); object.updateMatrix();
      instanced.setMatrixAt(k++, object.matrix);
    }
    instanced.name = `Burnt ${name}`; instanced.castShadow = true;
    shareMaterial(instanced);
    return instanced;
  }

  // Thin grey smoke rising from the burn on its first three play days.
  function addWisps(course, cells) {
    const material = new THREE.SpriteMaterial({color: 0x8f8a84, transparent: true, opacity: .25, depthWrite: false});
    for (let k = 0; k < Math.min(BURNT_LOOK.smokeWisps, cells.length); k++) {
      const cell = cells[Math.floor(hash(k, 91) * cells.length)], [x, z] = cellMiddle(cell);
      const y = renderedGroundHeight(course, {x, z}, {requireSurface: true});
      const sprite = new THREE.Sprite(material);
      sprite.userData.base = {x, y: Number.isFinite(y) ? y : 0, z, phase: hash(k, 17) * 10};
      sprite.name = 'Burnt smoke';
      group.add(sprite); wisps.push(sprite);
    }
  }

  return {
    group,
    // Call each frame with the course being drawn and its look (or null).
    apply({course, look = null, courseId = course?.def?.id}) {
      if (look) ensureAssets(courseId);
      const signature = lookSignature(look);
      // The scene is searched for pines only when the course or look changes,
      // or every 120 calls (a world rebuild makes new pine meshes).
      const same = applied.course === course && applied.signature === signature;
      if (same && (!look || calls++ % 120 !== 0)) return false;
      const meshes = look ? pineMeshes().length : 0;
      if (same && applied.meshes === meshes) return false;
      draw(course, look);
      applied = {course, signature, meshes};
      return true;
    },
    update(dt = 1 / 60) {
      time += dt;
      for (const sprite of wisps) {
        const b = sprite.userData.base, age = (time + b.phase) % 10;
        sprite.position.set(b.x + age * .6, b.y + 4 + age * 3, b.z + age * .3);
        sprite.scale.setScalar(4 + age * 1.5);
        sprite.material.opacity = .25 * (1 - age / 10);
      }
    },
    clear() { restore(); applied = {course: null, signature: '', meshes: 0}; },
    get assetStatus() { return assets.status; },
    dispose() { restore(); scene.remove(group); for (const texture of assets.textures.values()) texture.dispose(); },
  };
}
