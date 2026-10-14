// Drawing Kestrel One (docs/HELICOPTER.md section 8). Drawing only: it
// reads the session's view each frame and never changes it.
//
// Development stand-in: a plain helicopter built from boxes and cylinders,
// allowed in dev builds until Codex's HELI-ART-SRC model passes (HELI-VIEW
// swaps it for the picked model). Never at release.
import {heliCameraPose} from './heli-camera.js';
import {createVehicleAssets} from '../vehicle-assets.js';

const CABLE_LENGTH = 15;

function buildStandIn(THREE) {
  const root = new THREE.Group();
  root.name = 'Kestrel One (stand-in)';
  const paint = new THREE.MeshStandardMaterial({color: 0x3f4a3b, roughness: .72, metalness: .25});
  const dark = new THREE.MeshStandardMaterial({color: 0x1d2124, roughness: .8, metalness: .3});
  const glass = new THREE.MeshStandardMaterial({color: 0x24323a, roughness: .15, metalness: .6, transparent: true, opacity: .75});
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.8, 3.4), paint);
  body.position.set(0, 1.45, 0.2);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.1), glass);
  nose.position.set(0, 1.55, 2.25);
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, 4.8, 10), paint);
  boom.rotation.x = Math.PI / 2;
  boom.position.set(0, 1.7, -3.9);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(.12, 1.3, .8), paint);
  fin.position.set(0, 2.3, -6.1);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .5, 8), dark);
  mast.position.set(0, 2.6, 0.2);
  const rotor = new THREE.Group();
  rotor.position.set(0, 2.85, 0.2);
  for (let k = 0; k < 2; k++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(10, .05, .32), dark);
    blade.rotation.y = k * Math.PI / 2;
    rotor.add(blade);
  }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({color: 0x15191b, transparent: true, opacity: .16, side: THREE.DoubleSide, depthWrite: false}));
  disc.rotation.x = -Math.PI / 2;
  rotor.add(disc);
  const tail = new THREE.Group();
  tail.position.set(.18, 2.3, -6.2);
  const tailBlade = new THREE.Mesh(new THREE.BoxGeometry(.04, 1.6, .16), dark);
  tail.add(tailBlade);
  root.add(body, nose, boom, fin, mast, rotor, tail);
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 3.6, 8), dark);
    skid.rotation.x = Math.PI / 2;
    skid.position.set(side * .95, .05, .3);
    root.add(skid);
    for (const z of [-.6, 1.2]) {
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .7, 6), dark);
      strut.position.set(side * .85, .4, z);
      strut.rotation.z = side * .25;
      root.add(strut);
    }
  }
  root.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = false; } });
  return {root, rotor, tail};
}

function ring(THREE, radius, color) {
  const mesh = new THREE.Mesh(new THREE.RingGeometry(radius - .35, radius, 64),
    new THREE.MeshBasicMaterial({color, transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false}));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function buildCrate(THREE) {
  const wood = new THREE.MeshStandardMaterial({color: 0x7a5a36, roughness: .85});
  const band = new THREE.MeshStandardMaterial({color: 0x2a2c2e, roughness: .6, metalness: .5});
  const crate = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 1.4), wood);
  box.position.y = .6;
  crate.add(box);
  for (const y of [.25, .95]) {
    const strap = new THREE.Mesh(new THREE.BoxGeometry(1.44, .08, 1.44), band);
    strap.position.y = y;
    crate.add(strap);
  }
  crate.traverse(object => { if (object.isMesh) object.castShadow = true; });
  return crate;
}

export function createHeliView({THREE, scene, vehicleAssets = createVehicleAssets()}) {
  const group = new THREE.Group();
  group.name = 'Helicopter';
  group.visible = false;
  const standIn = buildStandIn(THREE);
  group.add(standIn.root);
  const cableGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -CABLE_LENGTH, 0)]);
  const cable = new THREE.Line(cableGeometry, new THREE.LineBasicMaterial({color: 0x111111}));
  const hookMesh = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 6), new THREE.MeshStandardMaterial({color: 0x8a6d1f, metalness: .6, roughness: .4}));
  const zoneRing = ring(THREE, 12, 0xf2c14e);
  const padMark = new THREE.Group();
  for (const [w, d, x] of [[.5, 4, -1.2], [.5, 4, 1.2], [2, .5, 0]]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({color: 0xf4f1e8, transparent: true, opacity: .85, depthWrite: false}));
    bar.rotation.x = -Math.PI / 2;
    bar.position.x = x;
    padMark.add(bar);
  }
  const hoverRing = ring(THREE, 4, 0x9fd4ff), targetRing = ring(THREE, 10, 0xffcf3f);
  group.add(cable, hookMesh, zoneRing, padMark, hoverRing, targetRing);
  // Cars and crates other than the player's own car (the race renderer
  // draws that one): the game's own car models, made on demand.
  const others = new Map();
  function otherMesh(load) {
    // One model per car type, reused from job to job.
    const key = load.id;
    let mesh = others.get(key);
    if (mesh) return mesh;
    if (load.id === 'crate') mesh = buildCrate(THREE);
    else {
      const status = vehicleAssets.status(load.id);
      if (status === 'error') return null;
      if (status !== 'ready') { if (status === 'idle') void vehicleAssets.load(load.id); return null; }
      mesh = vehicleAssets.create(load.id);
      if (!mesh) return null;
    }
    others.set(key, mesh);
    group.add(mesh);
    return mesh;
  }
  scene.add(group);
  let spin = 0;
  const points = cableGeometry.attributes.position;

  return {
    group,
    // Returns the camera pose and the hanging load's pose for this frame.
    update(view, {cameraIndex = 0, dt = 1 / 60} = {}) {
      if (!view?.heli) { group.visible = false; return null; }
      group.visible = true;
      const h = view.heli;
      standIn.root.position.set(h.x, h.y, h.z);
      standIn.root.rotation.set(h.pitch, h.heading, h.roll, 'YXZ');
      spin += (h.rotor || 0) * 42 * dt;
      standIn.rotor.rotation.y = spin;
      standIn.tail.rotation.x = spin * 5.5;
      const loads = view.loads ?? (view.load ? [view.load] : []);
      const load = loads.find(item => item.hooked) ?? null;
      const end = load ? {x: load.x, y: load.y + .7, z: load.z} : {x: h.x, y: h.y - CABLE_LENGTH, z: h.z};
      const seen = new Set();
      for (const item of loads) {
        if (item.own) continue;
        const mesh = otherMesh(item);
        if (!mesh) continue;
        seen.add(item.id);
        mesh.visible = true;
        mesh.position.set(item.x, item.y - .7, item.z);
        mesh.rotation.set(0, item.heading || 0, 0);
      }
      for (const [key, mesh] of others) if (!seen.has(key)) mesh.visible = false;
      hoverRing.visible = view.lesson?.id === 'hover' || view.lesson?.id === 'landing';
      targetRing.visible = view.lesson?.id === 'carry' && !!view.lesson.target;
      if (view.zone) hoverRing.position.set(view.zone.x, view.zone.y + .12, view.zone.z);
      if (targetRing.visible) targetRing.position.set(view.lesson.target.x, view.lesson.target.y + .1, view.lesson.target.z);
      points.setXYZ(0, h.x, h.y - .2, h.z);
      points.setXYZ(1, end.x, end.y, end.z);
      points.needsUpdate = true;
      cableGeometry.computeBoundingSphere();
      hookMesh.position.set(end.x, end.y, end.z);
      if (view.zone) {
        zoneRing.position.set(view.zone.x, view.zone.y + .08, view.zone.z);
        padMark.position.set(view.zone.x, view.zone.y + .1, view.zone.z);
        padMark.visible = view.courseId === 'tremblant-woods';
      }
      // The player's own car, wherever it is, for the race renderer to draw.
      return {camera: heliCameraPose(view, cameraIndex), load: loads.find(item => item.own) ?? null};
    },
    hide() { group.visible = false; },
    dispose() {
      // Car models share their geometry and materials with the race's own
      // cars, so only the helicopter's own parts are freed.
      for (const mesh of others.values()) if (mesh.userData?.vehicleKey) group.remove(mesh);
      scene.remove(group);
      group.traverse(object => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
    },
  };
}
