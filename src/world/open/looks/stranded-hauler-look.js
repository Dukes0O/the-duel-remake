// Patience is assembled from the land's truck, wheel and handcart pieces until her own look round.
import * as THREE from 'three';
import {createHandcartView} from '../../handcart-view.js';
import {haulerStop, haulerGate, haulerAtGate, haulerMarked, haulerVisitor, haulerIsTrap} from '../content/stranded-hauler-places.js';
import {scablandsSurfaceHeightAt} from '../../scablands-ground.js';

export function createHaulerLook() {
  const root = new THREE.Group(), truck = new THREE.Group();
  root.name = 'The stranded hauler';
  truck.name = 'Patience';
  const red = new THREE.MeshStandardMaterial({color: 0x713b30, roughness: .92, metalness: .22});
  const blue = new THREE.MeshStandardMaterial({color: 0x426879, roughness: .9, metalness: .2});
  const iron = new THREE.MeshStandardMaterial({color: 0x36322c, roughness: .85, metalness: .5});
  const rubber = new THREE.MeshStandardMaterial({color: 0x242321, roughness: 1});
  const glass = new THREE.MeshStandardMaterial({color: 0x697e7e, roughness: .45, metalness: .4});
  const cloth = new THREE.MeshStandardMaterial({color: 0x766a50, roughness: 1});
  const box = (parent, material, x, y, z, w, h, d) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh); return mesh;
  };
  box(truck, iron, 0, .8, 0, 2.7, .35, 8);
  box(truck, red, 0, 1.9, 2.1, 2.9, 2.3, 2.4);
  box(truck, glass, -.69, 2.48, 3.32, 1.22, .7, .04);
  box(truck, glass, .69, 2.48, 3.32, 1.22, .7, .04);
  const door = box(truck, blue, -1.47, 1.8, 2.05, .045, 1.45, 1.55);
  box(truck, red, 1.47, 1.8, 2.05, .045, 1.45, 1.55);
  const bonnet = box(truck, red, 0, 1.75, 3.55, 2.75, .15, 1.6);
  const fresh = box(truck, red, -1.5, 1.85, 2.1, .03, .6, .7);
  fresh.material = new THREE.MeshStandardMaterial({color: 0x8e4132, roughness: .35});
  for (const side of [-1, 1]) {
    box(truck, iron, side * 1.15, 1.18, -1.7, .12, .2, 3.8);
    box(truck, red, side * 1.36, 1.55, -1.7, .12, .65, 4);
    for (const z of [-3, -1.4, 2.3]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.65, .65, .38, 12), rubber);
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1.48, .65, z); truck.add(wheel);
    }
  }
  box(truck, cloth, 0, 1.55, -1.7, 2.6, .12, 3.9);
  const cart = createHandcartView();
  cart.root.scale.set(3.6, 2.5, 3.5);
  cart.root.position.set(0, 0, -8);
  const tyres = [];
  for (let i = 0; i < 40; i++) {
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(.46, .17, 6, 10), rubber);
    tyre.rotation.x = Math.PI / 2;
    tyre.position.set((i % 4 - 1.5) * .68, 1.35 + Math.floor(i / 8) * .32, -8 + (Math.floor(i / 4) % 2 - .5) * 1.15);
    truck.add(tyre); tyres.push(tyre);
  }
  truck.add(cart.root);
  const tools = new THREE.Group();
  const oil = new THREE.Mesh(new THREE.CircleGeometry(1.1, 12), iron);
  oil.rotation.x = -Math.PI / 2; oil.position.set(0, .025, 2); tools.add(oil);
  const rag = box(tools, cloth, -2.1, .03, 0, 1.1, .02, 1.6);
  for (let i = 0; i < 4; i++) box(tools, iron, rag.position.x, .06, -.5 + i * .3, .65, .045, .06);
  const shaft = box(truck, iron, 0, .45, -.9, .14, .14, 3.2);
  truck.add(tools); root.add(truck);
  const traces = new THREE.Group(); root.add(traces);
  const footprint = new THREE.BoxGeometry(.16, .02, .34);
  const track = new THREE.BoxGeometry(.23, .025, 1.6);
  let traceKey = '';
  root.visible = false;
  return {root, update(open, here, seconds, shift) {
    const record = open?.world.open.threads['stranded-hauler'];
    if (!record || open.parts.threads?.places?.checkpointsEnabled === false) { root.visible = false; return; }
    const world = open.world, stop = haulerStop(world), active = open.parts.missions?.active;
    const escort = active?.mission.kind === 'escort' ? active.state : null;
    const gate = haulerAtGate(world);
    const passing = record.end && !haulerMarked(world, 'gate-open');
    const roadside = !record.end && !['between', 'gate', 'parted', 'alone'].includes(record.beat);
    root.visible = !!(gate || passing || roadside);
    if (!root.visible) return;
    const at = escort?.truck ?? (gate ? {...haulerGate, heading: stop.truck.heading} : passing ? haulerVisitor(world, seconds) : stop.truck);
    root.visible = Math.hypot(here.x - at.x, here.z - at.z) < 1400;
    const trap = haulerIsTrap(world);
    door.material = trap ? red : blue; fresh.visible = trap;
    bonnet.rotation.x = escort || gate || passing || haulerMarked(world, 'helped') ? 0 : -.9;
    tools.visible = !trap && !escort && !gate && !passing && !haulerMarked(world, 'helped');
    cart.root.visible = !trap;
    tyres.forEach((tyre, i) => { tyre.visible = !trap && i < (escort?.tyres ?? 40); });
    shaft.position.y = haulerMarked(world, 'helped') ? .65 : .4 + .25 * Math.min(1, (open.parts.threads?.progress?.['stranded-hauler']?.mending ?? 0) / 12);
    truck.position.set(at.x, scablandsSurfaceHeightAt(at.x, at.z) + (shift?.(at.x, at.z) ?? 0), at.z);
    truck.rotation.y = at.heading;
    const key = stop.checkpoint + '/' + trap;
    if (key !== traceKey) {
      traceKey = key; traces.clear();
      for (let i = 0; i < 45; i++) for (const side of [-1, 1]) {
        const share = i / 44, from = stop.truck, to = stop.spots.behind;
        const x = from.x + (to.x - from.x) * share + side * (trap ? 1.2 : .2), z = from.z + (to.z - from.z) * share;
        const mesh = new THREE.Mesh(trap ? track : footprint, iron);
        mesh.position.set(x, scablandsSurfaceHeightAt(x, z) + .035, z);
        mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        traces.add(mesh);
      }
    }
    traces.visible = roadside && !escort && !gate;
  }, dispose() {
    cart.dispose();
    const geometries = new Set(), materials = new Set();
    root.traverse(node => { if (node.isMesh) { geometries.add(node.geometry); materials.add(node.material); } });
    geometries.add(footprint); geometries.add(track);
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    root.removeFromParent();
  }};
}
