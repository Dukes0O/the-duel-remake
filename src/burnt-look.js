// A course after a forest fire (docs/HELI_FIRE.md sections 8.4, 8.5 and 14):
// black trunks with no needles, snags and fallen logs among them, grey ash
// ground, then green shoots, then pink fireweed, and thin smoke on the first
// three play days. The same set draws the scars a fire put out leaves, and
// the cells the fire being fought has burnt. Drawing only, in races and from
// the air: it changes the drawn pines and adds its own meshes, and never
// touches the course, race state, replays or world signatures. Outside
// src/heli/ and imports nothing from it.
//
// Everything is placed from the pines' own positions, so nothing samples the
// ground (fast to redraw) and nothing lands on the road (no pine stands there).
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const BURNT_ASSET_DIR = '/assets/burnt/';
export const BURNT_LOOK = Object.freeze({
  cell: 20,
  // Charred bark (FIRE-VIEW card): linear 0.012, 0.011, 0.010.
  charcoal: Object.freeze([0.012, 0.011, 0.010]),
  snagEvery: 6, logEvery: 11,
  // Ash under each burnt tree: a square this wide, just above its root, wide
  // enough that neighbours join into one dark floor seen from 150 m.
  ashSize: 13,
  ground: Object.freeze({closed: 'ground-black.jpg', black: 'ground-black.jpg', shoots: 'ground-shoots.jpg', fireweed: 'ground-fireweed.jpg'}),
  // Clumps beside each burnt tree, by stage: [shoots, fireweed] per tree.
  clumps: Object.freeze({closed: [0, 0], black: [0, 0], shoots: [1, 0], fireweed: [1, 1]}),
  smokeWisps: 10,
});
const SNAGS = Object.freeze(['snag_tall', 'snag_broken', 'snag_leaning']);
const cellOf = (x, z) => (Math.floor(x / BURNT_LOOK.cell) + 512) * 1024 + (Math.floor(z / BURNT_LOOK.cell) + 512);
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
  (look.scars ?? []).map(s => [s.stage, s.cells.length, s.cells[0] ?? 0, s.cells.at(-1) ?? 0]),
  (look.live ?? []).length, (look.live ?? [])[0] ?? 0, (look.live ?? []).at(-1) ?? 0]) : '';

const defaultLoad = {
  model: url => new GLTFLoader().loadAsync(url).then(gltf => gltf.scene),
  texture: (THREE, url) => new THREE.TextureLoader().loadAsync(url),
};

export function createBurntLook({THREE, scene, load = defaultLoad}) {
  const group = new THREE.Group();
  group.name = 'Burnt look';
  scene.add(group);
  // Each course's art set (its own folder), loaded once when first needed.
  const sets = new Map();
  let applied = {course: null, signature: '', meshes: 0}, calls = 0, time = 0;
  let touched = [], wisps = [], smokeMaterial = null;
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);

  function setFor(courseId) {
    if (!sets.has(courseId)) {
      const set = {status: 'loading', props: null, textures: new Map(), parts: new Map(), materials: new Map()};
      sets.set(courseId, set);
      const dir = `${BURNT_ASSET_DIR}${courseId}/`;
      Promise.all([load.model(`${dir}burnt-props.glb`),
        ...[...new Set(Object.values(BURNT_LOOK.ground))].map(name => load.texture(THREE, dir + name).then(texture => [name, texture]))])
        .then(([props, ...textures]) => {
          set.props = props;
          props.updateMatrixWorld(true);
          for (const [name, texture] of textures) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.colorSpace = THREE.SRGBColorSpace;
            set.textures.set(name, texture);
          }
          set.status = 'ready';
          applied.signature = ''; // draw again now the art is in
        }).catch(error => { set.status = 'error'; console.warn(`The burnt look did not load: ${error?.message || error}`); });
    }
    return sets.get(courseId);
  }

  // Every mesh under a prop node, with its place relative to the node, so a
  // prop of several meshes (fireweed: stem, petals, leaves) is drawn whole.
  function partsOf(set, name) {
    if (!set.parts.has(name)) {
      const node = set.props?.getObjectByName(name), parts = [];
      if (node) {
        const inverse = new THREE.Matrix4().copy(node.matrixWorld).invert();
        node.traverse(object => { if (object.isMesh) parts.push({geometry: object.geometry, material: object.material,
          offset: new THREE.Matrix4().multiplyMatrices(inverse, object.matrixWorld)}); });
      }
      set.parts.set(name, parts);
    }
    return set.parts.get(name);
  }
  function instanced(parts, matrices, name) {
    const out = [], m = new THREE.Matrix4();
    if (!matrices.length) return out;
    for (const part of parts) {
      const mesh = new THREE.InstancedMesh(part.geometry, part.material, matrices.length);
      matrices.forEach((matrix, k) => mesh.setMatrixAt(k, m.multiplyMatrices(matrix, part.offset)));
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = `Burnt ${name}`;
      mesh.userData.burntShared = true;
      out.push(mesh);
    }
    return out;
  }

  // Put every drawn pine back as it was and remove what this look added.
  // Shared art (the glb's geometry and materials, textures) is kept.
  function restore() {
    for (const item of touched) item.undo();
    touched = [];
    for (const child of [...group.children]) {
      group.remove(child);
      if (child.isInstancedMesh) child.dispose();
      else if (!child.isSprite) { child.geometry?.dispose?.(); if (!child.userData.burntShared) child.material?.dispose?.(); }
    }
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

  // Hide some instances of a pine mesh. vegetation.js moves pines when they
  // are knocked down and puts them back after; while burnt, its writes are
  // remembered and the hidden instances stay hidden.
  function hide(mesh, indices) {
    const own = mesh.setMatrixAt, latest = new Map(), hidden = new Set(indices), m = new THREE.Matrix4();
    for (const i of hidden) { mesh.getMatrixAt(i, m); latest.set(i, m.clone()); own.call(mesh, i, zero); }
    mesh.setMatrixAt = (i, matrix) => {
      if (hidden.has(i)) { latest.set(i, matrix.clone()); return own.call(mesh, i, zero); }
      return own.call(mesh, i, matrix);
    };
    mesh.instanceMatrix.needsUpdate = true;
    touched.push({undo() {
      delete mesh.setMatrixAt;
      for (const [i, matrix] of latest) own.call(mesh, i, matrix);
      mesh.instanceMatrix.needsUpdate = true;
    }});
    return latest;
  }

  // Charcoal on burnt trunks. The colour attribute, once added, stays (all
  // white is no tint), so the bark's shader is compiled once, not again on
  // every burn or heal.
  function char(trunks, indices) {
    if (!trunks.instanceColor) {
      trunks.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(trunks.count * 3).fill(1), 3);
      trunks.material.needsUpdate = true;
    }
    for (const i of indices) trunks.instanceColor.setXYZ(i, ...BURNT_LOOK.charcoal);
    trunks.instanceColor.needsUpdate = true;
    touched.push({undo() { for (const i of indices) trunks.instanceColor.setXYZ(i, 1, 1, 1); trunks.instanceColor.needsUpdate = true; }});
  }

  function draw(course, look, set) {
    restore();
    if (!look) return;
    const whole = look.stage ?? null, stages = cellStages(look), matrix = new THREE.Matrix4(), root = new THREE.Vector3();
    const ready = set.status === 'ready';
    const ash = new Map(), clumps = {shoots: [], fireweed: []}, props = new Map(), smokeAt = [];
    const object = new THREE.Object3D();
    let tree = 0;
    for (const {trunks, crowns} of pineMeshes()) {
      // The trunks' colour is ready as soon as a course has a look (a fire
      // burning), so its shader is compiled then, not at the first cell out.
      char(trunks, []);
      const burnt = [], gone = [];
      for (let i = 0; i < trunks.count; i++) {
        trunks.getMatrixAt(i, matrix); root.setFromMatrixPosition(matrix);
        const stage = whole ?? stages.get(cellOf(root.x, root.z));
        tree++;
        if (!stage) continue;
        burnt.push(i);
        // Ash under the tree, then shoots and fireweed beside it, by stage.
        object.position.set(root.x, root.y + .3, root.z); object.rotation.set(-Math.PI / 2, 0, hash(tree, 1) * Math.PI * 2);
        object.scale.setScalar(BURNT_LOOK.ashSize); object.updateMatrix();
        if (!ash.has(stage)) ash.set(stage, []);
        ash.get(stage).push(object.matrix.clone());
        const [shoots, fireweed] = BURNT_LOOK.clumps[stage] ?? [0, 0];
        for (const [kind, count] of [['shoots', shoots], ['fireweed', fireweed]]) for (let n = 0; n < count; n++) {
          const angle = hash(tree, n + (kind === 'shoots' ? 10 : 20)) * Math.PI * 2, reach = 1.5 + hash(tree, n + 30) * 1.8;
          object.position.set(root.x + Math.cos(angle) * reach, root.y + .24, root.z + Math.sin(angle) * reach);
          object.rotation.set(0, angle, 0); object.scale.setScalar(.8 + hash(tree, n + 40) * .6); object.updateMatrix();
          clumps[kind].push(object.matrix.clone());
        }
        // Snags and fallen logs stand in for some trees, once their art is in.
        if (ready && (tree % BURNT_LOOK.snagEvery === 0 || tree % BURNT_LOOK.logEvery === 0)) {
          const name = tree % BURNT_LOOK.snagEvery === 0 ? SNAGS[tree % SNAGS.length] : 'log_fallen';
          if (partsOf(set, name).length) {
            gone.push(i);
            if (!props.has(name)) props.set(name, []);
            props.get(name).push(matrix.clone());
          }
        }
        if (look.smoke && smokeAt.length < BURNT_LOOK.smokeWisps && hash(tree, 77) < .02) smokeAt.push(root.clone());
      }
      if (!burnt.length) continue;
      hide(crowns, burnt);
      char(trunks, burnt);
      if (gone.length) hide(trunks, gone);
    }
    if (!ready) return;
    const addAll = meshes => { if (meshes.length) group.add(...meshes); };
    for (const [name, matrices] of props) addAll(instanced(partsOf(set, name), matrices, name));
    for (const kind of ['shoots', 'fireweed']) addAll(instanced(partsOf(set, kind), clumps[kind], kind));
    for (const [stage, matrices] of ash) {
      const texture = set.textures.get(BURNT_LOOK.ground[stage]);
      if (!texture) continue;
      if (!set.materials.has(stage)) set.materials.set(stage, new THREE.MeshStandardMaterial({map: texture, roughness: .95, transparent: true,
        alphaMap: ashFade(THREE), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2}));
      const mesh = new THREE.InstancedMesh(ashGeometry(THREE), set.materials.get(stage), matrices.length);
      matrices.forEach((m, k) => mesh.setMatrixAt(k, m));
      mesh.receiveShadow = true; mesh.name = `Burnt ground ${stage}`; mesh.userData.burntShared = true;
      group.add(mesh);
    }
    if (smokeAt.length) {
      smokeMaterial ??= new THREE.SpriteMaterial({color: 0x8f8a84, transparent: true, opacity: .25, depthWrite: false});
      for (const [k, at] of smokeAt.entries()) {
        const sprite = new THREE.Sprite(smokeMaterial);
        sprite.userData.base = {x: at.x, y: at.y, z: at.z, phase: hash(k, 17) * 10};
        sprite.name = 'Burnt smoke';
        group.add(sprite); wisps.push(sprite);
      }
    }
  }

  // One shared square for the ash, and a soft round edge so squares blend.
  let square = null, fade = null;
  const ashGeometry = () => square ??= new THREE.PlaneGeometry(1, 1);
  function ashFade() {
    if (fade) return fade;
    const size = 64, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - size / 2 + .5, y - size / 2 + .5) / (size / 2), v = Math.round(255 * Math.max(0, Math.min(1, (1 - d) * 1.6)));
      data.set([v, v, v, 255], (y * size + x) * 4);
    }
    fade = new THREE.DataTexture(data, size, size);
    fade.needsUpdate = true;
    return fade;
  }

  return {
    group,
    // Call each frame with the course being drawn and its look (or null).
    apply({course, look = null, courseId = course?.def?.id}) {
      const set = look ? setFor(courseId) : null;
      const signature = look ? `${lookSignature(look)}|${set.status}` : '';
      // The scene is searched for pines only when the course or look changes,
      // or every 120 calls (a world rebuild makes new pine meshes).
      const same = applied.course === course && applied.signature === signature;
      if (same && (!look || calls++ % 120 !== 0)) return false;
      const meshes = look ? pineMeshes().length : 0;
      if (same && applied.meshes === meshes) return false;
      draw(course, look, set);
      applied = {course, signature, meshes};
      return true;
    },
    update(dt = 1 / 60) {
      time += dt;
      for (const sprite of wisps) {
        const b = sprite.userData.base, age = (time + b.phase) % 10;
        sprite.position.set(b.x + age * .6, b.y + 4 + age * 3, b.z + age * .3);
        sprite.scale.setScalar(4 + age * 1.5);
      }
    },
    clear() { restore(); applied = {course: null, signature: '', meshes: 0}; },
    statusFor(courseId) { return sets.get(courseId)?.status ?? 'idle'; },
    dispose() {
      restore(); scene.remove(group);
      for (const set of sets.values()) { for (const texture of set.textures.values()) texture.dispose(); for (const m of set.materials.values()) m.dispose(); }
      square?.dispose(); fade?.dispose(); smokeMaterial?.dispose();
    },
  };
}
