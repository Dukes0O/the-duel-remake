// HOME-GROUND-5B: weathered timber, dusty glass and plants. This view only reads the saved growth.
import * as THREE from 'three';
import {HOME_CROPS} from '../content/home-ground.js';
import {cropInLand} from '../home-rule.js';

export function createHomeGardenLook(group, ground) {
  const geometries = [], keep = geometry => (geometries.push(geometry), geometry);
  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .96, ...extra});
  const materials = {
    wood: material(0x625748), soil: material(0x30291f), stone: material(0x736a55), iron: material(0x595a4f, {metalness: .45}),
    rust: material(0x73513b), pot: material(0x6f4c39), stem: material(0x566141), leaf: material(0x4b5d32, {side: THREE.DoubleSide}),
    glow: material(0x657743, {side: THREE.DoubleSide, emissive: 0x667b37, emissiveIntensity: .22}),
    pepper: material(0x9b4229), bean: material(0x76814d),
    glass: material(0x9bafa1, {roughness: .5, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide}),
  };
  const box = keep(new THREE.BoxGeometry(1, 1, 1)), cylinder = keep(new THREE.CylinderGeometry(1, 1, 1, 7));
  const potShape = keep(new THREE.CylinderGeometry(.36, .25, .45, 9));
  const stone = keep(new THREE.IcosahedronGeometry(1, 0));
  const leafShape = keep(new THREE.BufferGeometry());
  // A creased, slightly torn leaf silhouette rather than a flat oval or a bright plastic ball.
  leafShape.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -.13, .035, .19, 0, .065, .24,
    -.13, .035, .19, -.085, .01, .37, 0, .065, .24,
    -.085, .01, .37, .01, 0, .52, 0, .065, .24,
    0, 0, 0, 0, .065, .24, .12, .025, .18,
    .12, .025, .18, 0, .065, .24, .08, .015, .36,
    .08, .015, .36, 0, .065, .24, .01, 0, .52,
  ], 3));
  leafShape.computeVertexNormals();
  function mesh(parent, geometry, mat, x, y, z, sx = 1, sy = 1, sz = 1) {
    const item = new THREE.Mesh(geometry, mat); item.position.set(x, y, z); item.scale.set(sx, sy, sz);
    item.castShadow = item.receiveShadow = true; parent.add(item); return item;
  }
  function beam(parent, from, to, width, mat = materials.iron) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), v = b.sub(a);
    const item = mesh(parent, box, mat, ...a.addScaledVector(v, .5).toArray(), width, v.length(), width);
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); return item;
  }
  function greenhouse(stages, w, d) {
    for (const x of [-w / 2, w / 2]) mesh(stages[0], box, materials.wood, x, .08, 0, .18, .16, d);
    for (const z of [-d / 2, d / 2]) mesh(stages[0], box, materials.wood, 0, .08, z, w, .16, .18);
    for (let z = -d / 2; z <= d / 2; z += 1.5) {
      for (const side of [-1, 1]) {
        beam(stages[1], [side * w / 2, .1, z], [side * w / 2, 2.25, z], .07);
        beam(stages[1], [side * w / 2, 2.25, z], [0, 3.1, z], .07);
        mesh(stages[1], box, materials.rust, side * w / 2, .28, z, .082, .22, .082);
      }
    }
    for (const x of [-w / 2, 0, w / 2]) beam(stages[1], [x, x ? 2.25 : 3.1, -d / 2], [x, x ? 2.25 : 3.1, d / 2], .07);
    for (const side of [-1, 1]) {
      beam(stages[1], [side * w / 2, .2, -d / 2], [side * w / 2, 2.2, -d / 2 + 1.5], .045);
      for (let z = -d / 2 + .75; z < d / 2; z += 1.5) {
        mesh(stages[2], box, materials.glass, side * w / 2, 1.2, z, .025, 2.02, 1.4);
        const roof = mesh(stages[2], box, materials.glass, side * w / 4, 2.675, z, Math.hypot(w / 2, .85) - .08, .025, 1.4);
        roof.rotation.z = -side * Math.atan2(.85, w / 2);
      }
      // Two front panes leave a clear 1.4 m doorway. Its final door stands open along the side.
      mesh(stages[2], box, materials.glass, side * (w / 4 + .35), 1.18, d / 2, w / 2 - .75, 2.05, .025);
      beam(stages[1], [side * .7, .1, d / 2], [side * .7, 2.2, d / 2], .07);
    }
    mesh(stages[2], box, materials.glass, 0, 1.18, -d / 2, w - .12, 2.05, .025);
    beam(stages[3], [-.7, 2.2, d / 2], [.7, 2.2, d / 2], .08);
    for (const z of [d / 2, d / 2 - 1.35]) beam(stages[3], [.73, .12, z], [.73, 2.17, z], .06);
    for (const y of [.12, 2.17]) beam(stages[3], [.73, y, d / 2], [.73, y, d / 2 - 1.35], .06);
    mesh(stages[3], box, materials.glass, .73, 1.14, d / 2 - .675, .025, 1.96, 1.25);
    mesh(stages[3], box, materials.rust, .79, 1, d / 2 - 1.18, .09, .12, .035);
  }
  const draws = new Map();
  function planting(key, pot) {
    if (draws.has(key)) return draws.get(key);
    const root = new THREE.Group(); root.name = 'home-' + key; group.add(root);
    if (pot) {
      mesh(root, potShape, materials.pot, 0, .225, 0);
      mesh(root, cylinder, materials.soil, 0, .435, 0, .32, .035, .32);
    } else {
      mesh(root, box, materials.soil, 0, .08, 0, 1.72, .16, 3.72);
      for (const x of [-.94, .94]) {
        mesh(root, box, materials.wood, x, .16, 0, .12, .3, 4);
        for (const z of [-1.8, 1.8]) mesh(root, box, materials.iron, x, .2, z, .14, .06, .06);
      }
      for (const z of [-1.94, 1.94]) mesh(root, box, materials.wood, 0, .15, z, 1.8, .28, .12);
      for (let n = 0; n < 13; n++) mesh(root, stone, materials.stone, (n * .37 % 1.5) - .75, .18,
        (n * .61 % 3.5) - 1.75, .045 + n % 3 * .012, .035, .06);
    }
    const plants = new THREE.Group(); plants.name = 'living-plants'; root.add(plants);
    const leaves = [], fruits = [];
    const count = pot ? 1 : 6;
    for (let n = 0; n < count; n++) {
      const plant = new THREE.Group(); plant.position.set(pot ? 0 : (n % 2 ? .43 : -.43), pot ? .45 : .19,
        pot ? 0 : Math.floor(n / 2) * 1.1 - 1.1); plants.add(plant);
      const stalk = mesh(plant, cylinder, materials.stem, .025, .29, 0, .022, .58, .022); stalk.rotation.z = .07;
      for (let j = 0; j < 7; j++) {
        const leaf = mesh(plant, leafShape, materials.leaf, .015, .09 + j * .075, 0);
        leaf.rotation.set(-.18 + j % 3 * .13, j * 2.4 + n, .12);
        leaf.scale.setScalar(.65 + j % 3 * .1); leaves.push(leaf);
      }
      for (let j = 0; j < 3; j++) {
        const fruit = mesh(plant, stone, materials.pepper, Math.sin(j * 2.1) * .14, .34 + j * .08, Math.cos(j * 2.1) * .14, .055, .17, .05);
        fruit.rotation.z = .2 + j * .17; fruits.push(fruit);
      }
    }
    const result = {root, plants, leaves, fruits}; draws.set(key, result); return result;
  }
  return {
    glassMaterial: materials.glass,
    greenhouse,
    update(record, shift) {
      for (const item of draws.values()) item.root.visible = false;
      for (const pot of [false, true]) for (const row of record?.[pot ? 'pots' : 'beds'] ?? []) {
        const at = cropInLand(record, row, pot);
        if (!at) continue;
        const key = `${pot ? 'pot' : 'bed'}/${row.i}/${row.j}/${row.slot ?? 0}`, item = planting(key, pot);
        item.root.visible = true; item.root.position.set(at.x, ground(at.x, at.z, shift), at.z);
        item.root.rotation.y = pot ? 0 : row.turn * Math.PI / 2;
        item.plants.visible = !!row.crop;
        if (!row.crop) continue;
        const crop = HOME_CROPS[row.crop], ripe = row.grown >= crop.seconds, sprout = row.grown < crop.seconds / 3;
        item.plants.children.forEach(plant => plant.scale.set(1, sprout ? .34 : 1, 1));
        item.leaves.forEach((leaf, n) => { leaf.visible = !sprout || n % 7 < 2; leaf.material = ripe && pot ? materials.glow : materials.leaf; });
        item.fruits.forEach(fruit => { fruit.visible = ripe && pot; fruit.material = row.crop === 'firePeppers' ? materials.pepper : materials.bean; });
      }
    },
    dispose() { for (const item of draws.values()) group.remove(item.root); for (const geometry of geometries) geometry.dispose();
      for (const mat of Object.values(materials)) mat.dispose(); draws.clear(); },
  };
}
