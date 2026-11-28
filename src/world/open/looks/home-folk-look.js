// Resident equipment reads the home record. It never advances a job or a clock.
import * as THREE from 'three';
import {hasHomeFolk} from '../content/home-folk.js';
import {homeFolkWork} from '../home-folk-rule.js';
import {buildInLand, wellInLand} from '../home-rule.js';

export function createHomeFolkLook(parent, heightAt) {
  const group = new THREE.Group(); group.name = 'home-folk-equipment'; parent.add(group);
  const iron = new THREE.MeshStandardMaterial({color: 0x514a40, roughness: .85, metalness: .3});
  const wood = new THREE.MeshStandardMaterial({color: 0x756247, roughness: .95});
  const shapes = [];
  const box = (root, x, y, z, w, h, d, material = iron) => {
    const geometry = new THREE.BoxGeometry(w, h, d); shapes.push(geometry);
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  const mast = new THREE.Group(); mast.name = 'home-radio-mast'; group.add(mast);
  box(mast, 0, 3.5, 0, .09, 7, .09);
  for (const y of [5.6, 6.4]) box(mast, 0, y, 0, 2.6, .045, .045);
  box(mast, 0, .6, 0, .6, .65, .38);
  const motor = new THREE.Group(); motor.name = 'home-pump-motor'; group.add(motor);
  box(motor, .5, .25, 0, .65, .5, .5);
  for (let n = 0; n < 5; n++) box(motor, .25 + n * .12, .52, 0, .04, .12, .55);
  box(motor, .2, .2, 0, .8, .04, .08);
  const bay = new THREE.Group(); bay.name = 'home-mechanic-bay'; group.add(bay);
  for (const x of [-1.7, 1.7]) for (const z of [-2.2, 2.2]) box(bay, x, 1.3, z, .1, 2.6, .1);
  box(bay, 0, 2.65, 0, 3.6, .12, 4.6);
  box(bay, -1.45, .85, 0, .5, .12, 2.6, wood);
  const bow = new THREE.Group(); bow.name = 'home-finch-crossbow'; group.add(bow);
  box(bow, 0, .15, 0, .09, .12, .85, wood);
  const limb = box(bow, 0, .15, -.2, .8, .06, .06, wood); limb.rotation.y = .16;
  box(bow, 0, .2, -.15, .025, .025, .9);
  return {
    update(home) {
      for (const [root, id] of [[mast, 'hetty'], [motor, 'mr-penny'], [bay, 'dace'], [bow, 'finch']]) {
        root.visible = hasHomeFolk(home, id);
        if (!root.visible) continue;
        let at = homeFolkWork(home, id), lift = 0;
        if (id === 'hetty') at = {...at, x: at.x + 1.4};
        if (id === 'mr-penny') { root.visible = !!home.well?.pump; at = home.well ? wellInLand(home.well) : at; }
        if (id === 'dace') {
          const shed = home.builds.find(row => row.kind === 'shed' && row.stage === 4);
          root.visible = !!shed;
          if (shed) { at = buildInLand(shed); at = {...at, x: at.x + at.width / 2 + 2.1}; }
        }
        if (id === 'finch') {
          const tower = home.builds.find(row => row.kind === 'tower' && row.stage === 4);
          root.visible = !!tower;
          if (tower) { at = buildInLand(tower); lift = 4.7; }
        }
        root.position.set(at.x, heightAt(at.x, at.z) + lift, at.z);
      }
    },
    dispose() { shapes.forEach(shape => shape.dispose()); iron.dispose(); wood.dispose(); group.removeFromParent(); },
  };
}
