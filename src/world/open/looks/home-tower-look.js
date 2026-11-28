// Reuse the old town's tower, in four hand-built stages. Its old tall legs become
// poles under a 4.4 m platform; the rail and roof retain room for a standing lookout.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {HOME_TOWER} from '../content/home-ground.js';

const URL = '/assets/models/wasteland/town/safety.glb';
const nameOf = node => node.userData?.name ?? node.name;
const stageOf = name => /ladder/.test(name) ? 2 : /deck-board/.test(name) ? 1 :
  /rail|roof|apron|chair|lamp/.test(name) ? 3 : 0;

export function createHomeTowerLook(loadAsset) {
  let pending = null, source = null, disposed = false;
  const waiting = [], geometries = [];
  function fill(stages) {
    if (!source) return;
    for (const [index, parts] of source.entries()) for (const {geometry, material} of parts) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = 'home-tower-' + ['legs', 'platform', 'ladder', 'rail-roof'][index];
      mesh.castShadow = mesh.receiveShadow = true;
      stages[index].add(mesh);
    }
  }
  async function prepare() {
    const asset = await loadAsset(URL);
    if (disposed) return;
    const root = asset.scene ?? asset;
    let tower;
    root.traverse(node => { if (nameOf(node) === 'watchtower') tower = node; });
    if (!tower) throw new Error('The town safety model has no watchtower.');
    tower.updateWorldMatrix(true, true);
    const inverse = tower.matrixWorld.clone().invert(), groups = Array.from({length: 4}, () => new Map());
    tower.traverse(node => {
      if (!node.isMesh) return;
      const geometry = node.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, node.matrixWorld));
      const p = geometry.attributes.position;
      geometry.computeBoundingBox();
      const centre = geometry.boundingBox.getCenter(new THREE.Vector3());
      const pole = /splayed-leg|watchtower-foot/.test(nameOf(node));
      for (let n = 0; n < p.count; n++) {
        const y = p.getY(n), deck = 7.64;
        const x = pole ? centre.x + (p.getX(n) - centre.x) * .45 : p.getX(n);
        const z = pole ? centre.z + (p.getZ(n) - centre.z) * .45 : p.getZ(n);
        p.setXYZ(n, -x * 1.8, y <= deck ? y * HOME_TOWER.platform / deck :
          HOME_TOWER.platform + (y - deck) * 1.5, -z * 1.8);
      }
      geometry.computeVertexNormals();
      const material = Array.isArray(node.material) ? node.material[0] : node.material;
      const group = groups[stageOf(nameOf(node))];
      if (!group.has(material)) group.set(material, []);
      group.get(material).push(geometry);
    });
    source = groups.map(group => [...group].map(([material, parts]) => {
      const geometry = mergeGeometries(parts, false);
      parts.forEach(part => part.dispose()); geometries.push(geometry);
      return {geometry, material};
    }));
    waiting.splice(0).forEach(fill);
  }
  return {
    add(stages) {
      if (source) fill(stages);
      else {
        waiting.push(stages);
        if (!pending && loadAsset) pending = prepare();
      }
      return pending;
    },
    ready: () => pending,
    dispose() { disposed = true; waiting.length = 0; geometries.forEach(geometry => geometry.dispose()); },
  };
}
