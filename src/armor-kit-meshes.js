import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const clamp = value => Math.max(0, Math.min(1, value));
const KIT_TIERS = Object.freeze({scrapper: 1, raider: 2, warlord: 3});
const BREAK_POINTS = [0.75, 0.55, 0.35, 0.15];
const kitLoader = new GLTFLoader();
const defaultLoadKitAsset = car => kitLoader.loadAsync(`/assets/models/wasteland/kits/${car}.glb`);

// Appearance follows the equipped kit. CPU opponents retain their authored
// Scrapper baseline until their own kit loadouts are introduced.
export function armorKitTier(actor, cpu = false) {
  return KIT_TIERS[actor?.combatArmorKit] || KIT_TIERS[actor?.armorKit] || (cpu ? 1 : 0);
}

export function armorCondition(actor) {
  return Number.isFinite(actor?.armor) && actor?.maxArmor > 0
    ? clamp(actor.armor / actor.maxArmor) : 1;
}

export function createArmorKitMeshes(attachments, {loadKitAsset = defaultLoadKitAsset} = {}) {
  const group = new THREE.Group();
  group.name = 'Wasteland armor kits and loose plates';
  const box = new THREE.BoxGeometry(1, 1, 1);
  const pipe = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
  const blade = new THREE.CylinderGeometry(0.5, 0.5, 0.12, 10);
  const spike = new THREE.ConeGeometry(0.5, 1, 5);
  const puff = new THREE.IcosahedronGeometry(1, 1);
  const trim = new THREE.MeshStandardMaterial({color: 0x292722, metalness: 0.8, roughness: 0.68});
  const dark = new THREE.MeshStandardMaterial({color: 0x161819, metalness: 0.6, roughness: 0.78});
  const fallbackSmoke = new THREE.MeshBasicMaterial({color: 0x282824, transparent: true,
    opacity: 0.45, depthWrite: false});
  const fallbackFire = new THREE.MeshBasicMaterial({color: 0xe06a19, transparent: true,
    opacity: 0.76, depthWrite: false});
  const loosePosition = new THREE.Vector3();
  const looseBounds = new THREE.Box3();
  const looseMatrix = new THREE.Matrix4();
  const looseOffset = new THREE.Matrix4();
  let platingTexture = null;
  let textureRequested = false;
  let disposed = false;
  const assets = new Map();
  const releasedScenes = new WeakSet();
  function releaseAsset(asset) {
    const scene = asset?.scene;
    if (!scene?.isObject3D || scene.userData.sharedAsset === true || releasedScenes.has(scene)) return;
    releasedScenes.add(scene);
    const geometries = new Set(), materials = new Set(), textures = new Set();
    scene.traverse(node => {
      if (node.geometry) geometries.add(node.geometry);
      const entries = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of entries) if (material) materials.add(material);
    });
    for (const material of materials)
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }
  function assetFor(car) {
    if (!assets.has(car)) {
      try { assets.set(car, Promise.resolve(loadKitAsset(car))); }
      catch (error) { assets.set(car, Promise.reject(error)); }
    }
    return assets.get(car);
  }

  function piece(parent, geometry, material, name) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    // The vehicle already casts the moving shadow; these small parts would
    // otherwise draw again in its shadow pass at racing speed.
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const rigs = Array.from({length: 4}, (_, index) => {
    const plateMaterial = new THREE.MeshStandardMaterial({color: 0x69645a,
      metalness: 0.67, roughness: 0.73, side: THREE.DoubleSide});
    const roots = Object.fromEntries(['front', 'left', 'right', 'roof', 'hood']
      .map(socket => {
        const root = new THREE.Group();
        root.name = `armor-kit-${index}-${socket}`;
        group.add(root);
        return [socket, root];
      }));
    const bullBar = piece(roots.front, box, trim, `armor-kit-${index}-bull-bar`);
    const centerGuard = piece(roots.front, box, plateMaterial, `armor-kit-${index}-guard`);
    const sidePlates = [-1, 1].flatMap((side, sideIndex) => {
      const root = side > 0 ? roots.left : roots.right;
      return [-1, 1].map((fore, foreIndex) => {
        const plate = piece(root, box, plateMaterial,
          `armor-kit-${index}-plate-${sideIndex}-${foreIndex}`);
        plate.userData.breakIndex = sideIndex * 2 + foreIndex;
        return plate;
      });
    });
    const hoodPlate = piece(roots.hood, box, plateMaterial,
      `armor-kit-${index}-hood-plate`);
    const stacks = [-1, 1].map((side, stackIndex) => piece(roots.roof, pipe,
      trim, `armor-kit-${index}-stack-${stackIndex}`));
    const cage = [0, 1, 2].map(barIndex => piece(roots.roof, box, trim,
      `armor-kit-${index}-cage-${barIndex}`));
    const saws = [-1, 1].map((side, sawIndex) => piece(
      side > 0 ? roots.left : roots.right, blade, dark,
      `armor-kit-${index}-saw-${sawIndex}`));
    const crown = [-1, 0, 1].map((side, crownIndex) => piece(roots.roof,
      spike, trim, `armor-kit-${index}-crown-${crownIndex}`));
    const smoke = piece(roots.hood, puff, fallbackSmoke,
      `armor-kit-${index}-fallback-smoke`);
    const fire = piece(roots.hood, puff, fallbackFire,
      `armor-kit-${index}-fallback-fire`);
    smoke.castShadow = fire.castShadow = false;
    smoke.receiveShadow = fire.receiveShadow = false;
    const loose = sidePlates.map((source, partIndex) => {
      const mesh = new THREE.Group();
      mesh.name = `armor-kit-${index}-loose-${partIndex}`;
      group.add(mesh);
      const fallback = piece(mesh, box, plateMaterial, 'fallback-loose-plate');
      mesh.visible = false;
      return {mesh, fallback, authoredCopy: null, source,
        droppedAt: -Infinity, x: 0, y: 0, z: 0,
        groundY: 0, active: false};
    });
    return {index, roots, plateMaterial, bullBar, centerGuard, sidePlates,
      hoodPlate, stacks, cage, saws, crown, smoke, fire, loose,
      vehicle: null, lastCondition: 1, authored: null, bindVersion: 0};
  });
  function removeAuthored(rig) {
    attachments.detach(`armor-kit-authored-${rig.index}`);
    rig.authored?.removeFromParent();
    for (const material of rig.authoredMaterials || []) material.dispose();
    rig.authoredMaterials = null;
    rig.authored = null;
  }
  function requestAuthored(rig, vehicle) {
    const version = rig.bindVersion;
    const car = vehicle.userData.vehicleKey;
    if (!car) return;
    assetFor(car).then(gltf => {
      if (disposed || rig.vehicle !== vehicle || rig.bindVersion !== version ||
          !gltf?.scene?.isObject3D) return;
      const authored = gltf.scene.clone(true);
      authored.name = 'authored-kit';
      // Object3D.clone retains material references. Each actor needs its own
      // finish so armor damage cannot repaint a peer or the cached source.
      const materialClones = new Map();
      authored.traverse(node => {
        if (!node.isMesh || !node.material) return;
        const own = material => {
          if (!materialClones.has(material)) materialClones.set(material, material.clone());
          return materialClones.get(material);
        };
        node.material = Array.isArray(node.material) ? node.material.map(own) : own(node.material);
      });
      rig.authoredMaterials = [...materialClones.values()];
      for (const material of rig.authoredMaterials)
        if (material.color) material.userData.kitBaseColor = material.color.clone();
      attachments.attach({owner:`armor-kit-authored-${rig.index}`, vehicle,
        socket:'roof', object:authored, fallback:group});
      // The GLB uses vehicle-local coordinates; undo the roof socket's offset.
      authored.position.copy(authored.parent.position).multiplyScalar(-1);
      rig.authored = authored;
      for (const root of Object.values(rig.roots)) root.visible = false;
    }).catch(() => { /* Keep the explicit loading/failure fallback. */ });
  }
  function ensurePlatingTexture() {
    if (textureRequested || typeof document === 'undefined') return;
    textureRequested = true;
    platingTexture = new THREE.TextureLoader().load(
      '/assets/textures/scrap-plating.png', () => {
        if (disposed) return;
        for (const rig of rigs) {
          rig.plateMaterial.map = platingTexture;
          rig.plateMaterial.needsUpdate = true;
        }
      }, undefined, () => {
        // Geometry and metal colors remain usable if the art file is missing.
        platingTexture?.dispose();
        platingTexture = null;
      });
    platingTexture.colorSpace = THREE.SRGBColorSpace;
    platingTexture.wrapS = platingTexture.wrapT = THREE.RepeatWrapping;
    platingTexture.repeat.set(2, 2);
  }

  function bind(rig, vehicle) {
    if (rig.vehicle === vehicle) return;
    rig.bindVersion++;
    removeAuthored(rig);
    for (const socket of Object.keys(rig.roots)) {
      attachments.detach(`armor-kit-${rig.index}-${socket}`);
      rig.roots[socket].visible = false;
    }
    rig.vehicle = vehicle || null;
    rig.lastCondition = 1;
    for (const part of rig.loose) {
      part.active = false;
      part.mesh.visible = false;
      part.authoredCopy?.removeFromParent();
      part.authoredCopy = null;
    }
    if (!vehicle) return;
    for (const [socket, root] of Object.entries(rig.roots)) {
      attachments.attach({owner: `armor-kit-${rig.index}-${socket}`,
        vehicle, socket, object: root, fallback: group});
    }
    requestAuthored(rig, vehicle);
    const {width, length, height} = vehicle.userData.size;
    rig.bullBar.scale.set(width * 1.17, 0.1, 0.11);
    rig.bullBar.position.y = -0.08;
    rig.centerGuard.scale.set(width * 0.65, Math.min(0.45, height * 0.3), 0.09);
    rig.centerGuard.position.set(0, 0.05, 0.13);
    rig.sidePlates.forEach((plate, partIndex) => {
      plate.scale.set(0.09, Math.min(0.48, height * 0.31), length * 0.28);
      plate.position.set(partIndex < 2 ? 0.04 : -0.04,
        -height * 0.09, (partIndex % 2 ? 1 : -1) * length * 0.17);
      plate.rotation.z = (partIndex < 2 ? -1 : 1) * 0.04;
    });
    rig.hoodPlate.scale.set(width * 0.72, 0.07, length * 0.25);
    rig.hoodPlate.position.y = 0.05;
    rig.stacks.forEach((stack, stackIndex) => {
      stack.scale.set(0.16, Math.min(0.65, height * 0.35), 0.16);
      stack.position.set((stackIndex ? 1 : -1) * width * 0.4,
        0.22, -length * 0.27);
    });
    rig.cage.forEach((bar, barIndex) => {
      bar.scale.set(barIndex === 2 ? width * 0.7 : 0.09,
        0.09, barIndex === 2 ? 0.09 : length * 0.4);
      bar.position.set(barIndex === 2 ? 0 : (barIndex ? 1 : -1) * width * 0.34,
        0.28, 0);
    });
    rig.saws.forEach((saw, sawIndex) => {
      saw.scale.setScalar(Math.min(0.45, height * 0.25));
      saw.rotation.z = Math.PI / 2;
      saw.position.set(sawIndex ? -0.16 : 0.16, -height * 0.17, 0.15);
    });
    rig.crown.forEach((point, pointIndex) => {
      point.scale.set(0.15, 0.52, 0.15);
      point.position.set((pointIndex - 1) * width * 0.27, 0.57, -length * 0.1);
    });
    rig.smoke.position.set(0, 0.55, 0.2);
    rig.fire.position.set(0, 0.42, 0.2);
  }

  function update(duel, vehicles, useAtlas) {
    const state = duel.state;
    const enabled = state.mode === 'wasteland' && !!state.combat &&
      state.status !== 'menu' && duel.featureFlags?.enabled('wasteland2') === true;
    if (enabled) ensurePlatingTexture();
    group.visible = enabled;
    rigs.forEach((rig, index) => {
      const actor = index ? state.opponents?.[index - 1] ||
        (index === 1 ? state.rival : null) : state;
      const vehicle = index ? index === 1 ? vehicles.rival :
        vehicles.extraOpponents?.[index - 2]?.mesh : vehicles.player;
      bind(rig, enabled ? vehicle : null);
      const tier = armorKitTier(actor, index > 0);
      const visible = enabled && !!actor && !actor.crushed && !!vehicle &&
        Number.isFinite(actor.maxArmor) && tier > 0;
      for (const root of Object.values(rig.roots)) root.visible = visible && !rig.authored;
      if (rig.authored) {
        rig.authored.visible = visible;
        for (const [name, minimum] of [['kit-scrapper',1],['kit-raider',2],['kit-warlord',3]]) {
          const part = rig.authored.getObjectByName(name);
          if (part) part.visible = visible && tier >= minimum;
        }
        for (let partIndex = 0; partIndex < 4; partIndex++) {
          const plate = rig.authored.getObjectByName(`kit-plate-${partIndex}`);
          if (plate) plate.visible = visible && !actor.combatWrecking &&
            armorCondition(actor) > BREAK_POINTS[partIndex];
        }
      }
      if (!visible) {
        rig.loose.forEach(part => { part.mesh.visible = false; });
        return;
      }
      const condition = armorCondition(actor);
      const wrecked = !!actor.combatWrecking;
      if (rig.authored) {
        const scorch = wrecked ? 0.24 : condition < 0.1 ? 0.48 :
          condition < 0.3 ? 0.68 : condition < 0.6 ? 0.86 : 1;
        for (const material of rig.authoredMaterials || []) {
          const base = material.userData.kitBaseColor;
          if (base) material.color.copy(base).multiplyScalar(scorch);
        }
        for (const name of ['kit-cage', 'kit-saw-0', 'kit-saw-1',
          'kit-crown', 'kit-warlord-mount']) {
          const part = rig.authored.getObjectByName(name);
          if (part) part.visible = !wrecked && visible &&
            tier >= (name === 'kit-crown' || name === 'kit-warlord-mount' ? 3 : 2);
        }
      }
      rig.plateMaterial.color.setHex(condition < 0.3 ? 0x383733 :
        condition < 0.6 ? 0x555047 : 0x69645a);
      rig.centerGuard.visible = !wrecked && condition > 0.2;
      rig.hoodPlate.visible = !wrecked && condition > 0.35;
      rig.stacks.forEach(stack => { stack.visible = !wrecked; });
      rig.cage.forEach(bar => { bar.visible = tier >= 2 && !wrecked; });
      rig.saws.forEach(saw => { saw.visible = tier >= 2 && !wrecked; });
      rig.crown.forEach(point => { point.visible = tier >= 3 && !wrecked; });
      rig.sidePlates.forEach((plate, partIndex) => {
        plate.visible = !wrecked && condition > BREAK_POINTS[partIndex];
        plate.rotation.z = (partIndex < 2 ? -1 : 1) *
          (0.04 + (1 - condition) * 0.12);
      });
      const time = state.stageTimeSec || 0;
      rig.loose.forEach((part, partIndex) => {
        const threshold = BREAK_POINTS[partIndex];
        if (rig.lastCondition > threshold && condition <= threshold && !wrecked) {
          const authoredPlate = rig.authored?.getObjectByName(`kit-plate-${partIndex}`);
          part.authoredCopy?.removeFromParent();
          part.authoredCopy = null;
          if (authoredPlate) {
            authoredPlate.updateWorldMatrix(true, true);
            looseBounds.setFromObject(authoredPlate, true).getCenter(loosePosition);
            const copy = authoredPlate.clone(true);
            copy.visible = true;
            looseOffset.makeTranslation(-loosePosition.x, -loosePosition.y, -loosePosition.z);
            looseMatrix.multiplyMatrices(looseOffset, authoredPlate.matrixWorld);
            copy.matrixAutoUpdate = false;
            copy.matrix.copy(looseMatrix);
            part.mesh.add(copy);
            part.authoredCopy = copy;
            part.fallback.visible = false;
          } else {
            part.source.getWorldPosition(loosePosition);
            part.fallback.visible = true;
            part.fallback.scale.copy(part.source.scale);
          }
          part.x = loosePosition.x;
          part.y = loosePosition.y;
          part.z = loosePosition.z;
          part.groundY = duel.course.groundAt(actor.s, actor.lateral).y + 0.12;
          part.droppedAt = time;
          part.active = true;
          part.mesh.scale.setScalar(1);
          part.mesh.rotation.set(0, 0, 0);
        }
        const age = time - part.droppedAt;
        part.mesh.visible = part.active && age >= 0 && age < 1.5;
        if (part.mesh.visible) {
          const direction = partIndex < 2 ? 1 : -1;
          part.mesh.position.set(part.x + direction * age * 1.2,
            Math.max(part.groundY, part.y + age * 1.2 - age * age * 4.5),
            part.z + (partIndex % 2 ? 1 : -1) * age * 0.45);
          part.mesh.rotation.set(age * 4, age * 3, age * 2);
        }
      });
      rig.lastCondition = condition;
      rig.smoke.visible = !useAtlas && !wrecked && condition < 0.3;
      rig.fire.visible = !useAtlas && !wrecked && condition < 0.1;
      if (rig.smoke.visible) rig.smoke.scale.setScalar(0.5 +
        Math.abs(Math.sin(time * 4 + index)) * 0.25);
      if (rig.fire.visible) rig.fire.scale.setScalar(0.34 +
        Math.abs(Math.sin(time * 9 + index)) * 0.16);
    });
  }

  function detachVehicle(vehicle) {
    for (const rig of rigs) if (rig.vehicle === vehicle) bind(rig, null);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (const rig of rigs) {
      bind(rig, null);
      rig.plateMaterial.dispose();
    }
    for (const geometry of [box, pipe, blade, spike, puff]) geometry.dispose();
    for (const promise of assets.values()) promise.then(releaseAsset).catch(() => {});
    for (const material of [trim, dark, fallbackSmoke, fallbackFire]) material.dispose();
    platingTexture?.dispose();
    group.removeFromParent();
    group.clear();
  }

  return {group, update, detachVehicle, dispose};
}
