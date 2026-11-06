import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {flipbookFrameUVInto} from '../combat-vfx-atlas.js';
import {addArenaCrushables} from '../arena-props.js';

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

function authoredVehicle(scene, names, feature) {
  const source = names.map(name => scene.getObjectByName(name)).find(Boolean);
  if (!source) return null;
  const clone = source.clone(true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const center = bounds.getCenter(new THREE.Vector3());
  clone.position.sub(center);
  clone.position.y += center.y - bounds.min.y;
  const prop = new THREE.Group();
  prop.name = `Bowl authored crush ${feature.id}`;
  prop.position.set(feature.x, feature.y, feature.z);
  prop.rotation.y = feature.heading;
  prop.add(clone);
  return prop;
}

function authoredHeap(scene, feature) {
  const contents = new THREE.Group();
  scene.traverse(node => {
    if (node.isMesh && node.name.startsWith('fire-stack-')) contents.add(node.clone(true));
  });
  if (!contents.children.length) return null;
  const bounds = new THREE.Box3().setFromObject(contents);
  const center = bounds.getCenter(new THREE.Vector3());
  contents.position.set(-center.x, -bounds.min.y, -center.z);
  const prop = new THREE.Group();
  prop.name = 'Bowl burning bus stack';
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

  function clear() {
    token++;
    for (const child of [...group.children]) {
      child.removeFromParent();
      disposeTree(child);
    }
    disposeTree(crushSource);
    crushSource = null;
    fires.length = 0;
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
      group.add(stadium);
      const targets = next.features.crushables;
      const shells = targets.filter(feature => feature.sourceKind === 'junkCar');
      if (shells.length) {
        const cars = addArenaCrushables(group, {features: {crushables: shells}});
        cars.name = 'Bowl faded junk car crush line';
        crushShells = cars;
      }
      for (const feature of targets) {
        if (feature.sourceKind === 'bowlBus') {
          const prop = authoredVehicle(crushAsset.scene, ['bus-crushed-assembly'], feature);
          if (prop) { tintVehicle(prop, feature.color); group.add(prop); }
        } else if (feature.sourceKind === 'bowlRv') {
          const prop = authoredVehicle(crushAsset.scene, ['rv-crushed-assembly'], feature);
          if (prop) { tintVehicle(prop, feature.color); group.add(prop); }
        } else if (feature.sourceKind === 'bowlBurningHeap' && feature.off === 0) {
          const prop = authoredHeap(crushAsset.scene, feature);
          if (prop) group.add(prop);
        }
        if (feature.bowlFire) {
          const p = new THREE.Vector3(feature.x, feature.y + 1.8, feature.z);
          installFire(fireTexture, p, `Bowl heap fire ${feature.id}`, feature.s * .001);
        }
      }
      const jets = next.features.flameJets || [];
      jets.forEach((jet, index) => {
        const p = next.groundAt(jet.s, jet.off);
        installFire(fireTexture, new THREE.Vector3(p.x, p.y + 1.1, p.z),
          `Bowl flame jet ${jet.id}`, index * .41);
      });
      // The authored lamp banks sit over these four low-power pools of show light.
      for (const [x, z, color] of [[-35, -20, 0xffbd73], [35, -20, 0x78aaff],
        [-35, 20, 0xff7744], [35, 20, 0xffd28a]]) {
        const light = new THREE.PointLight(color, 850, 105, 2);
        light.position.set(x, 24, z);
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
    if (!fireTexture) {
      firePromise ??= loadFireTexture().then(texture => {
        if (disposed) { texture.dispose?.(); return; }
        fireTexture = texture;
        if (course) build(course, now);
      }).catch(error => { group.userData.fireError = error?.message || 'Bowl fire texture could not load'; });
    }
    for (const [index, fire] of fires.entries()) {
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

function tintVehicle(root, tint) {
  const color = new THREE.Color(tint);
  root.traverse(node => {
    if (!node.isMesh) return;
    node.material = [node.material].flat().filter(Boolean).map(material => {
      const clone = material.clone();
      clone.color?.lerp(color, .58);
      return clone;
    });
    if (node.material.length === 1) node.material = node.material[0];
  });
}
