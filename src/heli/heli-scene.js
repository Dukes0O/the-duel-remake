// Drawing Kestrel One (docs/HELICOPTER.md section 8). Drawing only: it
// reads the session's view each frame and never changes it.
//
// The model loads when the renderer starts; until it arrives (a moment,
// it is small and local) the helicopter is simply not drawn.
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {LESSON_RULES} from './heli-lessons.js';
import {heliCameraPose} from './heli-camera.js';
import {createVehicleAssets} from '../vehicle-assets.js';
import {createFireView} from './heli-fire-view.js';
import {createRescueView} from './heli-rescue-view.js';
import {createRankPaint} from './heli-rank-paint.js';

const CABLE_LENGTH = 15;
const GUIDE_WAIT = 0xf4f1e8, GUIDE_READY = 0x3ddc5a;

// Kestrel One: Claude's original model (tools/blender/kestrel-one.py, review
// in docs/board/looks/kestrel-one/). Metres, +Y up, nose toward +Z, origin
// on the ground under the mast; main_rotor spins about +Y, tail_rotor about
// its X; cable_hook is where the cable hangs from.
export const KESTREL_MODEL_URL = '/assets/heli/kestrel-one.glb';
const loadModel = url => new GLTFLoader().loadAsync(url).then(gltf => gltf.scene);

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

export function createHeliView({THREE, scene, vehicleAssets = createVehicleAssets(), load = loadModel, fireLoad = undefined, rescueLoad = undefined, quality = 'high'}) {
  const group = new THREE.Group();
  group.name = 'Helicopter';
  group.visible = false;
  // The helicopter's place in the world; the model joins it when loaded.
  const body = new THREE.Group();
  body.name = 'Kestrel One';
  group.add(body);
  const parts = {model: null, rotor: null, tail: null, hook: null, status: 'idle', error: ''};
  let disposed = false;
  const rankPaint = createRankPaint({THREE});
  // The model loads on the first helicopter frame, so a player who never
  // flies (or has the switch off) never downloads it.
  const ensureModel = () => {
    if (parts.status !== 'idle') return;
    parts.status = 'loading';
    load(KESTREL_MODEL_URL).then(model => {
    if (disposed) return;
    model.traverse(object => { if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; } });
    parts.model = model;
    parts.rotor = model.getObjectByName('main_rotor');
    parts.tail = model.getObjectByName('tail_rotor');
    parts.hook = model.getObjectByName('cable_hook');
    parts.status = parts.rotor && parts.tail && parts.hook ? 'ready' : 'error';
    if (parts.status === 'error') parts.error = 'Kestrel One is missing a named node';
    body.add(model);
    rankPaint.attach(model);
    }).catch(error => {
      parts.status = 'error'; parts.error = String(error?.message || error);
      console.warn(`Kestrel One did not load: ${parts.error}`);
    });
  };
  const hookWorld = new THREE.Vector3();
  const cableGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, -CABLE_LENGTH, 0)]);
  const cable = new THREE.Line(cableGeometry, new THREE.LineBasicMaterial({color: 0x111111}));
  // About half a metre across, in high-visibility orange, so it can be seen
  // from the cockpit views against grass, snow and rock (FIX-HELI-HOOK).
  const hookMesh = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8), new THREE.MeshStandardMaterial({color: 0xff7a1a, emissive: 0x401800, metalness: .3, roughness: .5}));
  const zoneRing = ring(THREE, 12, 0xf2c14e);
  const padMark = new THREE.Group();
  for (const [w, d, x] of [[.5, 4, -1.2], [.5, 4, 1.2], [2, .5, 0]]) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({color: 0xf4f1e8, transparent: true, opacity: .85, depthWrite: false}));
    bar.rotation.x = -Math.PI / 2;
    bar.position.x = x;
    padMark.add(bar);
  }
  const hoverRing = ring(THREE, 4, 0x9fd4ff), targetRing = ring(THREE, LESSON_RULES.carry.radius, 0xffcf3f);
  targetRing.name = 'Carry target';
  const targetCentre = new THREE.Mesh(new THREE.CircleGeometry(.45, 16), targetRing.material);
  targetCentre.rotation.x = -Math.PI / 2;
  group.add(targetCentre);
  let targetSurface = null;
  // The hook guide: a ring on the ground under the load the hook is near,
  // white while H would not take it and green when it would (the session's
  // hookGuide decides; this only draws it).
  const guideRing = ring(THREE, 2.2, GUIDE_WAIT);
  guideRing.visible = false;
  group.add(cable, hookMesh, zoneRing, padMark, hoverRing, targetRing, guideRing);
  // LAB-VIEW: the Lab challenge's props (view.challenge.props): the buoys, the smoke marker and the practice fire's cells.
  // Pooled meshes made on demand; drawing only.
  const labProps = new THREE.Group();
  labProps.name = 'Lab challenge';
  group.add(labProps);
  const labPool = [];
  const labMake = kind => kind === 'buoy' ? new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshStandardMaterial({color: 0xffcf3f, roughness: .5}))
    : kind === 'splash' ? ring(THREE, 3, 0xefffff)
    : kind === 'smoke' ? new THREE.Mesh(new THREE.CylinderGeometry(1.5, 4, 40, 10), new THREE.MeshBasicMaterial({color: 0xcfcac0, transparent: true, opacity: .5, depthWrite: false}))
    : new THREE.Mesh(new THREE.BoxGeometry(18, .6, 18), new THREE.MeshBasicMaterial({color: 0x2f6b32, transparent: true, opacity: .55, depthWrite: false}));
  function labDraw(props) {
    const list = props ?? [];
    list.forEach((prop, index) => {
      let mesh = labPool[index];
      if (!mesh || mesh.userData.kind !== prop.kind) {
        if (mesh) { labProps.remove(mesh); mesh.traverse(child => { child.geometry?.dispose(); child.material?.dispose(); }); }
        mesh = labMake(prop.kind);
        if (prop.kind === 'buoy') mesh.add(ring(THREE, prop.radius, 0xffcf3f));
        mesh.userData.kind = prop.kind;
        labPool[index] = mesh;
        labProps.add(mesh);
      }
      mesh.visible = true;
      const lift = prop.kind === 'smoke' ? 20 : prop.kind === 'fire' ? .4 : .2;
      mesh.position.set(prop.x, (prop.y ?? 0) + lift, prop.z);
      if (prop.kind === 'buoy') mesh.material.color.setHex(prop.hit ? 0x4fd16a : 0xffcf3f);
      else if (prop.kind === 'fire') mesh.material.color.setHex(prop.burnt ? 0x1b1b1b : prop.percent > 0 ? 0xff6a1a : prop.road ? 0xb59d70 : 0x2f6b32);
    });
    for (let index = list.length; index < labPool.length; index++) labPool[index].visible = false;
  }
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
  // H2 Fire: flames, smoke, water, the bucket and the aim ring (drawing only).
  const fire = createFireView({THREE, scene, quality, ...(fireLoad ? {load: fireLoad} : {})});
  // H4 Rescue: made the first time the session gives a rescue view, so with
  // the switch off nothing of it exists (drawing only).
  let rescue = null;
  // The game sets the fire's quality each frame; the rescue drawing follows it (render3d is not touched).
  const setFireQuality = fire.setQuality;
  fire.setQuality = next => { setFireQuality(next); quality = next; rescue?.setQuality(next); };
  let spin = 0;
  const points = cableGeometry.attributes.position;

  return {
    group,
    // Returns the camera pose and the hanging load's pose for this frame.
    update(view, {cameraIndex = 0, dt = 1 / 60} = {}) {
      if (!view?.heli) { group.visible = false; fire.hide(); rescue?.hide(); return null; }
      ensureModel();
      rankPaint.update(view.logbook?.paint ?? view.skins?.worn);
      // Nothing of the helicopter (cable and rings included) shows until
      // the model is in.
      group.visible = parts.status === 'ready';
      const h = view.heli;
      body.position.set(h.x, h.y, h.z);
      body.rotation.set(h.pitch, h.heading, h.roll, 'YXZ');
      spin += (h.rotor || 0) * 42 * dt;
      if (parts.rotor) parts.rotor.rotation.y = spin;
      if (parts.tail) parts.tail.rotation.x = spin * 5.5;
      // The cable hangs from the model's hook point.
      let top = {x: h.x, y: h.y - .2, z: h.z};
      if (parts.hook) { body.updateMatrixWorld(true); parts.hook.getWorldPosition(hookWorld); top = hookWorld; }
      const loads = view.loads ?? (view.load ? [view.load] : []);
      const load = loads.find(item => item.hooked) ?? null;
      const end = load ? {x: load.x, y: load.y + .7, z: load.z} : fire.cableEnd(view) ?? rescue?.cableEnd(view) ?? {x: h.x, y: h.y - CABLE_LENGTH, z: h.z};
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
      targetCentre.visible = targetRing.visible;
      if (targetRing.visible) {
        const target = view.lesson.target;
        targetRing.position.set(target.x, target.y + .15, target.z);
        targetCentre.position.copy(targetRing.position);
        targetRing.material.color.setHex(view.lesson.guidance?.ready ? GUIDE_READY : 0xffcf3f);
        if (targetSurface !== target.surface) {
          targetSurface = target.surface;
          const vertices = targetRing.geometry.attributes.position;
          // Before the X rotation, local Z becomes positive world Y.
          for (let i = 0; i < vertices.count; i++) vertices.setZ(i, targetSurface?.[i] ?? 0);
          vertices.needsUpdate = true;
          targetRing.geometry.computeBoundingSphere();
        }
      }
      const guide = view.hookGuide;
      guideRing.visible = !!guide;
      if (guide) {
        guideRing.position.set(guide.x, guide.y + .14, guide.z);
        guideRing.material.color.setHex(guide.ready ? GUIDE_READY : GUIDE_WAIT);
        guideRing.material.opacity = guide.ready ? .8 : .55;
      }
      points.setXYZ(0, top.x, top.y, top.z);
      points.setXYZ(1, end.x, end.y, end.z);
      points.needsUpdate = true;
      cableGeometry.computeBoundingSphere();
      hookMesh.position.set(end.x, end.y, end.z);
      if (view.zone) {
        zoneRing.position.set(view.zone.x, view.zone.y + .08, view.zone.z);
        padMark.position.set(view.zone.x, view.zone.y + .1, view.zone.z);
        padMark.visible = view.courseId === 'tremblant-woods';
      }
      labDraw(view.challenge?.props); // LAB-VIEW
      fire.update(view, {dt});
      if (view.rescue) rescue ??= createRescueView({THREE, scene, quality, vehicleAssets, ...(rescueLoad ? {load: rescueLoad} : {})});
      rescue?.update(view, {dt});
      // The player's own car, wherever it is, for the race renderer to draw.
      // The cameras frame a car on the hook; a rescuer on the line or a hooked crate is framed the same way.
      const hung = view.load?.hooked ? null : view.rescue?.line ?? (view.rescue?.crates ?? []).find(item => item.hooked) ?? null;
      // Framed 8 m lower than it hangs, so the instrument panel along the bottom does not cover the people on it.
      const framed = hung ? {...view, load: {x: hung.x, y: hung.y - 8, z: hung.z, hooked: true}} : view;
      return {camera: heliCameraPose(framed, cameraIndex), load: loads.find(item => item.own) ?? null};
    },
    hide() { group.visible = false; fire.hide(); rescue?.hide(); },
    fire,
    get rescue() { return rescue; },
    get modelStatus() { return parts.status; },
    get modelError() { return parts.error; },
    dispose() {
      disposed = true;
      rankPaint.dispose();
      // Car models share their geometry and materials with the race's own
      // cars, so only the helicopter's own parts are freed.
      for (const mesh of others.values()) if (mesh.userData?.vehicleKey) group.remove(mesh);
      scene.remove(group);
      group.traverse(object => { object.geometry?.dispose?.(); object.material?.dispose?.(); });
      fire.dispose();
      rescue?.dispose();
    },
  };
}
