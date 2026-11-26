// The first playable staging reuses the game's cars and cart. Its dedicated art round is still owed.
import * as THREE from 'three';
import {createVehicle} from '../../../vehicles.js';
import {createHandcartView} from '../../handcart-view.js';
import {LAND} from '../../scablands-names.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';
import {FLAG_ID, FLAG_WHERE, FLAG_SPOTS, flagCompanyPresent} from '../content/somebody-elses-flag-places.js';

export function createFlagSiteView() {
  const group = new THREE.Group();
  group.name = 'The Sweet Seep';
  group.visible = false;
  const company = new THREE.Group(), reeds = new THREE.Group(), pump = new THREE.Group();
  const tower = new THREE.Group(), fence = new THREE.Group(), pickups = new THREE.Group();
  company.add(tower, fence, pickups);
  group.add(company, reeds, pump);
  const white = new THREE.MeshStandardMaterial({color: 0xe4e1d5, roughness: .85});
  const steel = new THREE.MeshStandardMaterial({color: 0x635f56, roughness: .9, metalness: .4});
  const green = new THREE.MeshStandardMaterial({color: 0x697556, roughness: 1});
  const origin = LAND.at(...FLAG_WHERE);
  const ground = (x, z) => scablandsSurfaceHeightAt(origin.x + x, origin.z + z);
  const box = (parent, name, x, y, z, w, h, d, material = white) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.name = name;
    mesh.position.set(x, ground(x, z) + y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  for (const x of [-1.8, 1.8]) for (const z of [-1.8, 1.8]) {
    box(tower, 'White drill tower leg', x, 12, z, .22, 24, .22, steel);
    for (let y = 3; y <= 24; y += 3) box(tower, 'Drill tower crossbar', 0, y, z, 3.8, .18, .18, steel);
  }
  const flag = box(tower, 'The white flag', 2.5, 25, 0, 3, 1.5, .05);
  const lamps = [-1, 1].map(x => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.4, 8, 6), new THREE.MeshBasicMaterial({color: 0xffe6ad}));
    lamp.name = 'Sweet Seep work lamp';
    lamp.position.set(x * 2, ground(0, 0) + 15, 0);
    tower.add(lamp);
    return lamp;
  });
  for (const side of [-1, 1]) {
    for (let n = -24; n <= 24; n += 8) {
      box(fence, 'White rope stake', n, .6, side * 18, .1, 1.2, .1);
      box(fence, 'White rope stake', side * 24, .6, n * .75, .1, 1.2, .1);
    }
    box(fence, 'The rope', 0, .8, side * 18, 48, .05, .05);
    box(fence, 'The rope', side * 24, .8, 0, .05, .05, 36);
  }
  const wire = new THREE.Group();
  wire.name = 'The wire fence';
  fence.add(wire);
  for (const y of [.4, 1.2]) for (const side of [-1, 1]) {
    box(wire, 'Fence wire', 0, y, side * 18, 48, .025, .025, steel);
    box(wire, 'Fence wire', side * 24, y, 0, .025, .025, 36, steel);
  }
  box(company, 'Miss Pell folding table', 0, .95, 22, 3, .12, 1.4, steel);
  box(company, 'Forms under a stone', -.4, 1.05, 22, .7, .05, .5);
  box(company, 'The stone on the forms', -.4, 1.13, 22, .2, .12, .17, steel);
  for (const [spot, label] of [['peg', 'Survey peg'], ['board', 'Water price board'], ['stakes', 'Stacked white stakes']]) {
    const at = FLAG_SPOTS[spot];
    box(company, label, at.x, .7, at.z, spot === 'board' ? 2.8 : .3, 1.4, .2);
  }
  const board = company.getObjectByName('Water price board');
  let paintedPrice = 0, paintPrice = () => {};
  const canvas = globalThis.document?.createElement?.('canvas'), ink = canvas?.getContext('2d');
  if (ink) {
    canvas.width = 512; canvas.height = 256;
    const map = new THREE.CanvasTexture(canvas);
    board.material = new THREE.MeshStandardMaterial({map, roughness: .9});
    paintPrice = price => {
      if (paintedPrice === price) return;
      paintedPrice = price;
      ink.fillStyle = '#ece9dc'; ink.fillRect(0, 0, 512, 256);
      ink.fillStyle = '#252724'; ink.font = 'bold 34px sans-serif'; ink.textAlign = 'center';
      for (const [n, text] of [`WATER. ${price} SCRAP A CAN.`, 'PURE. SAFE. YOURS.'].entries()) ink.fillText(text, 256, 100 + n * 62);
      map.needsUpdate = true;
    };
  }
  for (const spot of ['pickup-left', 'pickup-right']) {
    const car = createVehicle({color: 0xf1eee4, accent: 0xd4d6cd});
    const at = FLAG_SPOTS[spot];
    car.position.set(at.x, ground(at.x, at.z), at.z);
    car.name = 'White company pickup';
    pickups.add(car);
  }
  const cart = createHandcartView();
  cart.root.name = 'The camp water cart';
  cart.root.position.set(-12, ground(-12, 28), 28);
  group.add(cart.root);
  for (let n = 0; n < 40; n++) {
    const can = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, .08), steel);
    can.name = 'Empty water can';
    can.position.set((n % 8 - 3.5) * .07, .65 + Math.floor(n / 8) * .09, .1);
    cart.root.add(can);
  }
  for (let n = 0; n < 22; n++) {
    const x = -12 + n % 6 * .5, z = -9 + Math.floor(n / 6) * .5;
    box(reeds, 'Sweet Seep reeds', x, .8, z, .06, 1.6, .06, green);
  }
  box(pump, 'The hand pump', 0, .7, 0, .4, 1.4, .4, steel);
  box(pump, 'Hand pump handle', .5, 1.4, 0, 1.2, .12, .12, steel);
  const cap = box(group, 'The capped bore', 0, .05, 0, 1.2, .1, 1.2, steel);
  return {
    group,
    update(open, here, seconds, shift) {
      const world = open?.world, record = world?.open.threads[FLAG_ID];
      const distance = here ? Math.hypot(here.x - origin.x, here.z - origin.z) : Infinity;
      group.visible = !!world && (record || world.open.found.includes('sweet-seep')) && distance <= 2600;
      if (!group.visible) return;
      group.position.set(origin.x, shift?.(origin.x, origin.z) ?? 0, origin.z);
      company.visible = flagCompanyPresent(world);
      const bought = world.ledger.marks.includes(FLAG_ID + '/bought-out');
      const drivenOff = world.ledger.marks.includes(FLAG_ID + '/driven-off');
      pump.visible = bought;
      cap.visible = drivenOff;
      for (const reed of reeds.children) {
        reed.scale.y = record ? .12 : 1;
        reed.position.y = ground(reed.position.x, reed.position.z) + .8 * reed.scale.y;
      }
      wire.visible = record?.end === 'stays';
      pickups.visible = !open.parts.missions?.active?.state.sent;
      paintPrice(record?.end === 'beaten' ? 8 : record?.end === 'stays' ? 6 : 4);
      cart.root.visible = !!record?.cast.camp && !record.end && distance < 120;
      for (const lamp of lamps) lamp.visible = open.parts.threads?.places.partOfDay === 'dark';
      flag.rotation.y = Math.sin(seconds * 1.2) * .2;
    },
    dispose() {
      const geometries = new Set(), materials = new Set();
      group.traverse(node => { if (node.geometry) geometries.add(node.geometry);
        for (const material of [node.material].flat().filter(Boolean)) materials.add(material); });
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) { material.map?.dispose(); material.dispose(); }
      group.removeFromParent();
    },
  };
}
