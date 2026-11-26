import * as THREE from 'three';
import {isHeld} from './holds.js';
import {openThreadSigns} from './parts/threads.js';
import {placeForThread} from '../../story/scenes/burned-camp.js';
import {distanceBetween} from '../../story/threads/cast.js';
import {SMOKE_HEIGHT} from '../../story/threads/signs.js';
import {scablandsSurfaceHeightAt} from '../scablands-ground.js';
import {createSmokeColumn} from '../smoke-column.js';
import {SERVICE_LANDMARKS} from './building-rule.js';

function paintedSign({label}) {
  const canvas = globalThis.document?.createElement?.('canvas');
  const ink = canvas?.getContext('2d');
  if (!ink) return null;
  canvas.width = 512;
  canvas.height = 144;
  ink.fillStyle = '#392b20';
  ink.fillRect(0, 0, 512, 144);
  ink.fillStyle = '#564331';
  ink.fillRect(7, 6, 498, 132);
  ink.strokeStyle = '#be9a61';
  ink.lineWidth = 3;
  ink.strokeRect(13, 12, 486, 120);
  ink.fillStyle = '#f3dab0';
  ink.font = '900 110px Impact, "Arial Black", sans-serif';
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  ink.fillText(label, 256, 76, 460);
  ink.fillStyle = '#201a14';
  for (const x of [24, 488]) for (const y of [24, 120]) {
    ink.beginPath();
    ink.arc(x, y, 4, 0, Math.PI * 2);
    ink.fill();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.25, .92),
    new THREE.MeshStandardMaterial({map, emissive: 0x584633, emissiveMap: map, roughness: .9}));
  mesh.name = label + ' painted shed sign';
  mesh.visible = false;
  return mesh;
}

function falseTrailAsh() {
  const group = new THREE.Group();
  group.name = 'Ash heaped on the cook fire';
  const geometry = new THREE.SphereGeometry(1, 9, 5);
  const material = new THREE.MeshStandardMaterial({color: 0x746d65, roughness: 1});
  for (const [x, z, width, height] of [[0, 0, .66, .19], [.45, .12, .38, .13], [-.37, -.21, .44, .15]]) {
    const heap = new THREE.Mesh(geometry, material);
    heap.position.set(x, .02, z);
    heap.scale.set(width, height, width * .74);
    group.add(heap);
  }
  group.userData.dispose = () => { geometry.dispose(); material.dispose(); };
  return group;
}

export function createSignView() {
  const group = new THREE.Group();
  group.name = 'Open land signs';
  const smoke = new Map();
  const ash = falseTrailAsh();
  ash.visible = false;
  group.add(ash);
  const sheds = SERVICE_LANDMARKS.flatMap(landmark => {
    const sign = paintedSign(landmark);
    if (!sign) return [];
    group.add(sign);
    return [{sign, landmark}];
  });
  const disposeSmoke = (id, mesh) => {
    group.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    smoke.delete(id);
  };
  const positionAt = (mesh, {x, z}, drawnShift) => {
    mesh.position.set(x, scablandsSurfaceHeightAt(x, z) + (drawnShift?.(x, z) ?? 0), z);
  };
  return {
    group,
    update(worldJob, here, seconds, drawnShift) {
      for (const {sign, landmark} of sheds) {
        sign.visible = !!worldJob?.serviceSheds && distanceBetween(here, landmark) < 550;
        if (sign.visible) {
          positionAt(sign, landmark, drawnShift);
          sign.position.y += landmark.height;
        }
      }
      const open = worldJob?.open;
      const view = open?.parts.threads?.places ?? {};
      const signs = open ? openThreadSigns({...open, view}) : [];
      const columns = signs.filter(({sign, at}) => sign.kind === 'smoke' && at);
      const kept = new Set(columns.map(({id}) => id));
      for (const [id, mesh] of smoke) if (!kept.has(id)) disposeSmoke(id, mesh);
      for (const {id, sign, at} of columns) {
        let mesh = smoke.get(id);
        if (!mesh) {
          mesh = createSmokeColumn({height: SMOKE_HEIGHT, foot: 4, top: 33, strength: 1.2});
          mesh.name = `${id} smoke`;
          group.add(mesh);
          smoke.set(id, mesh);
        }
        mesh.visible = distanceBetween(here, at) <= (sign.seenWithin ?? Infinity);
        if (mesh.visible) {
          positionAt(mesh, at, drawnShift);
          mesh.userData.update(seconds);
        }
      }
      const burned = open?.world.open.threads['burned-camp'];
      const trail = burned?.cast.blamed && placeForThread(['@camp', 'stove'], burned.cast, view);
      ash.visible = !!trail && distanceBetween(here, trail) <= 100 && !isHeld(open.holds, 'signs');
      if (ash.visible) positionAt(ash, trail, drawnShift);
    },
    dispose() {
      for (const [id, mesh] of smoke) disposeSmoke(id, mesh);
      for (const {sign} of sheds) {
        sign.geometry.dispose();
        sign.material.map.dispose();
        sign.material.dispose();
      }
      ash.userData.dispose();
      group.clear();
    },
  };
}
