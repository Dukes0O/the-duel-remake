// The Lab's room (docs/LAB.md sections 2 and 8): the hangar and its benches from public/assets/models/lab/, drawn on a
// canvas of its own, with the camera gliding to the bench in use. Drawing only: it takes a lesson and the last result and
// moves parts; it knows nothing of the game, the save or the race. Everything it makes is released by dispose().
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createSirenaVehicle} from '../sirena-vehicle.js';
// LAB-FAN-VIEW: drawing-only extension, with the room owning its resources.
import {createFanRoom} from './fan-view.js';

// Which bench model a lesson uses (the five wind-tunnel lessons share the tunnel).
export const MODEL_OF_LESSON = Object.freeze({
  lift: 'weighing-pad', projectile: 'drop-tower', fire: 'fire-pit', pendulum: 'pendulum-frame', altitude: 'rotor-stand',
  strength: 'bending-rig', rust: 'nail-jars', gforce: 'turning-arm', headings: 'map-table', launch: 'launcher-ramp', wax: 'snow-trays',
  grip: 'wind-tunnel', downforce: 'wind-tunnel', braking: 'wind-tunnel', suspension: 'wind-tunnel', fuel: 'wind-tunnel',
});
const BENCH_MODELS = Object.freeze([...new Set(Object.values(MODEL_OF_LESSON)), 'weights-and-cans']);

// Counts, for the test that opens and closes the Lab twice: every scene made is released.
const stats = {created: 0, disposed: 0, listeners: 0};
export const labSceneStats = () => ({...stats, live: stats.created - stats.disposed});

const defaultRenderer = canvas => new THREE.WebGLRenderer({canvas, antialias: true, alpha: false, powerPreference: 'default'});
const defaultLoad = path => new GLTFLoader().loadAsync(path).then(gltf => gltf.scene);

function release(root) {
  const resources = new Set();
  root?.traverse(node => {
    if (node.geometry) resources.add(node.geometry);
    for (const material of [].concat(node.material || [])) {
      resources.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
    }
  });
  for (const resource of resources) resource.dispose?.();
}

// The camera poses to try for a bench, best first: from the middle of the hall side, a little round to one side and above,
// looking at its middle, then further round and further back. The scene takes the first with a clear view.
export function benchPoses(layout, size) {
  const {x, z} = layout, length = Math.hypot(x, z) || 1;
  const ux = -x / length, uz = -z / length, base = 4.5 + Math.max(size[0], size[2]) * 0.7;
  const target = [x, Math.min(1.5, size[1] * 0.45), z], poses = [];
  for (const scale of [1, 1.35]) for (const turn of [0.35, -0.35, 0.8, -0.8, 1.3, -1.3, 0]) {
    const dx = ux * Math.cos(turn) - uz * Math.sin(turn), dz = ux * Math.sin(turn) + uz * Math.cos(turn);
    poses.push({position: [x + dx * base * scale, 3.4, z + dz * base * scale], target});
  }
  return poses;
}
export const benchPose = (layout, size) => benchPoses(layout, size)[0];
// LAB-RESTORE: the freshwater tank for the Sirena stands on the open floor by the hangar door; the camera comes to it.
export const RESTORE_STAGE = Object.freeze({x: 0, z: 9.4, yaw: Math.PI / 2, tank: Object.freeze([6.2, 1.7, 2.9]),
  camera: Object.freeze({position: [3.2, 3.1, 4.6], target: [0, 0.7, 9.4]})});
const PRIMER = 0x8d9296, RED = 0x9c1217, FLOOR = .2;
export const OVERVIEW = Object.freeze({position: [0, 5.2, 13.5], target: [0, 1.6, -1]});

export function createLabScene({host, manifest, createRenderer = defaultRenderer, load = defaultLoad, createCar = createSirenaVehicle, quality = 'high'}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.className = 'lab-canvas';
  // The renderer is made before the canvas joins the page, so a machine with no 3D leaves nothing behind.
  const renderer = createRenderer(canvas);
  host.append(canvas);
  renderer.setPixelRatio?.(Math.min(2, quality === 'high' ? (win?.devicePixelRatio || 1) : 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151a1d);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xdfe8ee, 0x4a4338, 2.1));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.4);
  sun.position.set(-6, 10, 8);
  scene.add(sun);
  // Warm lights over the benches so the room is not flat.
  const lamp = new THREE.PointLight(0xffd9a0, 40, 18, 2);
  lamp.position.set(0, 5.5, 0);
  scene.add(lamp);

  const parts = new Map();           // part name -> node, per bench model id
  const models = new Map();          // model id -> root
  let disposed = false, focus = null, lesson = null, result = null, clock = 0, raf = 0;
  const pose = {position: new THREE.Vector3(...OVERVIEW.position), target: new THREE.Vector3(...OVERVIEW.target)};
  const goal = {position: new THREE.Vector3(...OVERVIEW.position), target: new THREE.Vector3(...OVERVIEW.target)};
  camera.position.copy(pose.position);
  camera.lookAt(pose.target);

  stats.created++;
  const resize = () => {
    const width = Math.max(2, host.clientWidth || 640), height = Math.max(2, host.clientHeight || 360);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  win?.addEventListener('resize', resize);
  stats.listeners++;
  resize();

  const sizeOf = id => manifest.models.find(model => model.id === id)?.dimensionsMetres ?? [3, 2, 3];
  const ready = (async () => {
    const ids = ['hangar', ...BENCH_MODELS];
    await Promise.all(ids.map(async id => {
      try {
        const root = await load(`/assets/models/lab/${id}.glb`);
        if (disposed) { release(root); return; }
        const at = manifest.layout[id];
        if (at) { root.position.set(at.x, 0, at.z); root.rotation.y = at.yaw || 0; }
        scene.add(root);
        models.set(id, root);
        const named = new Map();
        root.traverse(node => { if (node.name) named.set(node.name, node); });
        parts.set(id, named);
        // The fan's REVERSE switch is found, not shown (docs/LAB.md section 6): LAB-FAN-VIEW reveals it.
        const reverse = named.get('reverse-switch');
        if (reverse) reverse.visible = false;
      } catch { /* a model that will not load leaves its bench bare; the screen still works */ }
    }));
  })();

  // ---- the Sirena's restoration (LAB-RESTORE): tank, wreck, car and bubbles, all driven by one stage object ----
  const restore = {group: new THREE.Group(), built: false, wreck: null, hull: null, car: null, livery: [], paint: null, bubbles: [], water: null, state: null, shown: -1, wreckKind: null, loadTicket: 0};
  restore.group.visible = false;
  scene.add(restore.group);
  function buildRestore() {
    if (restore.built) return;
    restore.built = true;
    const [length, height, width] = RESTORE_STAGE.tank;
    restore.group.position.set(RESTORE_STAGE.x, 0, RESTORE_STAGE.z);
    restore.group.rotation.y = RESTORE_STAGE.yaw;
    const steel = new THREE.MeshStandardMaterial({color: 0x39413f, roughness: .6, metalness: .5});
    const glass = new THREE.MeshPhysicalMaterial({color: 0xcfe6ee, transparent: true, opacity: .1, roughness: .05, depthWrite: false, side: THREE.DoubleSide});
    const base = new THREE.Mesh(new THREE.BoxGeometry(width + .3, .2, length + .3), steel);
    base.position.y = .1;
    restore.group.add(base);
    // The tank's long side is along the car (z in the group); four posts, rails and glass panes.
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(.12, height + .2, .12), steel);
      post.position.set(px * (width / 2 + .06), (height + .2) / 2 + .2, pz * (length / 2 + .06));
      restore.group.add(post);
    }
    for (const [sx, sz, w, d] of [[1, 0, .02, length], [-1, 0, .02, length], [0, 1, width, .02], [0, -1, width, .02]]) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), glass);
      pane.position.set(sx * width / 2, height / 2 + .2, sz * length / 2);
      restore.group.add(pane);
    }
    restore.water = new THREE.Mesh(new THREE.BoxGeometry(width - .05, height - .2, length - .05),
      new THREE.MeshPhysicalMaterial({color: 0x7fc1d4, transparent: true, opacity: .22, roughness: .1, depthWrite: false}));
    restore.water.position.y = (height - .2) / 2 + .2;
    restore.group.add(restore.water);
    const bubble = new THREE.SphereGeometry(.035, 8, 6), bubbleMaterial = new THREE.MeshBasicMaterial({color: 0xe8f6fb, transparent: true, opacity: .75});
    for (let i = 0; i < 70; i++) {
      const mesh = new THREE.Mesh(bubble, bubbleMaterial);
      mesh.visible = false;
      restore.bubbles.push(mesh);
      restore.group.add(mesh);
    }
    // The car, in primer to start with; the paint and the white livery are animated on it.
    const car = createCar({color: PRIMER});
    if (car) {
      car.position.y = FLOOR;   // the car's wheels rest on the tank floor
      car.visible = false;
      restore.car = car;
      restore.paint = car.userData.paint;
      car.traverse(node => { if (node.isMesh && node.material?.name === 'White livery') restore.livery.push(node); });
      for (const node of restore.livery) { node.material = node.material.clone(); node.material.transparent = true; }
      restore.group.add(car);
    }
    loadRestoreWreck(restore.state?.kind);
  }
  function loadRestoreWreck(kind) {
    if (restore.wreckKind === kind && restore.loadTicket > 0) return;
    restore.wreckKind = kind;
    const ticket = ++restore.loadTicket;
    if (restore.wreck) { restore.wreck.removeFromParent(); release(restore.wreck); }
    restore.wreck = restore.hull = null; restore.shown = -1;
    load(kind === 'running' ? '/assets/models/sirena/sea-wreck.glb' : '/assets/models/sirena/wreck-hull.glb').then(model => {
      if (disposed || ticket !== restore.loadTicket) { release(model); return; }
      model.traverse(node => {
        if (!node.isMesh) return;
        node.material = node.material.clone();
        node.material.transparent = true;
        const colour = node.geometry.attributes.color;
        if (colour && kind !== 'running') restore.hull = {colour, original: Float32Array.from(colour.array), size: colour.itemSize};
      });
      model.position.y = FLOOR - new THREE.Box3().setFromObject(model).min.y;
      restore.wreck = model;
      restore.group.add(model);
    }).catch(() => { /* the wreck model missing leaves the tank with the car only */ });
  }
  function drawRestore(seconds) {
    const st = restore.state;
    restore.group.visible = st !== null;
    if (!st) return;
    if (restore.wreck) {
      restore.wreck.visible = st.wreck > .01;
      restore.wreck.traverse(node => { if (node.isMesh) node.material.opacity = st.wreck; });
      // The crust and the rust colour fade to bare grey metal as the metal is stripped (the vertex colours are lerped, 0 = bare).
      // (Shown with a square root: the colour is gone from the eye by the half-way point if it fades in a straight line.)
      const crust = Math.sqrt(st.rust);
      if (restore.hull && Math.abs(crust - restore.shown) > .004) {
        restore.shown = crust;
        const {colour, original, size} = restore.hull, array = colour.array;
        for (let i = 0; i < colour.count; i++) {
          const r = original[i * size], g = original[i * size + 1], b = original[i * size + 2];
          const light = .75 + .5 * (.3 * r + .59 * g + .11 * b);
          array[i * size] = .60 * light + (r - .60 * light) * crust;
          array[i * size + 1] = .63 * light + (g - .63 * light) * crust;
          array[i * size + 2] = .65 * light + (b - .65 * light) * crust;
        }
        colour.needsUpdate = true;
      }
    }
    // The water drains once the metal is bare, so the rebuilt car stands on a dry floor.
    if (restore.water) {
      const [, height] = RESTORE_STAGE.tank, depth = height - .2, level = Math.max(.001, st.water);
      restore.water.visible = st.water > .01;
      restore.water.scale.y = level;
      restore.water.position.y = FLOOR + depth * level / 2;
    }
    if (restore.car) {
      restore.car.visible = st.car > .01;
      const grey = new THREE.Color(PRIMER), red = new THREE.Color(RED);
      restore.paint?.color.copy(grey).lerp(red, st.red);
      for (const node of restore.livery) node.material.opacity = st.stripe;
    }
    restore.bubbles.forEach((mesh, i) => {
      mesh.visible = st.bubbles > 0 && st.water > .3 && i / restore.bubbles.length < st.bubbles;
      if (!mesh.visible) return;
      const [length, height, width] = RESTORE_STAGE.tank;
      const rise = ((seconds * .45 + i * .137) % 1) * (height - .3);
      mesh.position.set(Math.sin(i * 7.1) * width * .38, .35 + rise, Math.cos(i * 3.3) * length * .4);
    });
  }
  const part = (model, name) => parts.get(model)?.get(name) ?? null;
  // LAB-FAN-VIEW
  const fanRoom = createFanRoom({scene, part, load, release, alive: () => !disposed, manifest, host, camera});

  // The first pose whose line to the bench is not blocked by a pillar, a wall or another bench.
  const caster = new THREE.Raycaster(), from = new THREE.Vector3(), to = new THREE.Vector3();
  function clearPose(id, poses) {
    const others = [...models].filter(([key]) => key !== id).map(([, root]) => root);
    for (const pose of poses) {
      from.set(...pose.position); to.set(...pose.target);
      const distance = from.distanceTo(to);
      caster.set(from, to.clone().sub(from).normalize());
      caster.far = distance;
      const hit = caster.intersectObjects(others, true)[0];
      if (!hit || hit.distance > distance - 1.5) return pose;
    }
    return poses[0];
  }
  function aim(next) {
    if (restore.state) { goal.position.set(...RESTORE_STAGE.camera.position); goal.target.set(...RESTORE_STAGE.camera.target); return; }
    const fanPose = fanRoom.pose(); // LAB-FAN-VIEW
    if (fanPose) { goal.position.set(...fanPose.position); goal.target.set(...fanPose.target); return; }
    const id = next ? MODEL_OF_LESSON[next] : null;
    const at = id ? manifest.layout[id] : null;
    if (!at) { goal.position.set(...OVERVIEW.position); goal.target.set(...OVERVIEW.target); return; }
    const view = clearPose(id, benchPoses(at, sizeOf(id)));
    goal.position.set(...view.position); goal.target.set(...view.target);
  }

  // The parts that follow the experiment. Each one reads only the result it was given.
  function animate(seconds) {
    const settings = result?.settings ?? {};
    const rotor = part('rotor-stand', 'rotor');
    if (rotor) rotor.rotation.y = seconds * (lesson === 'altitude' && result ? 14 * (result.liftShare ?? 1) : 2);
    const fan = part('wind-tunnel', 'fan');
    if (fan) fan.rotation.x = seconds * (lesson && MODEL_OF_LESSON[lesson] === 'wind-tunnel' ? 2 + (settings.speedMph ?? 50) / 6 : 1);
    const belt = part('wind-tunnel', 'belt');
    if (belt) belt.position.x = ((seconds * 0.2) % 0.2) - 0.5;
    // The pendulum: the cord that matches the string swings with the period the bench measured.
    const cords = {5: 'cord-short', 15: 'cord-medium', 25: 'cord-long'};
    for (const name of ['cord-short', 'cord-medium', 'cord-long', 'cord-medium-heavy']) {
      const cord = part('pendulum-frame', name);
      if (!cord) continue;
      const mine = lesson === 'pendulum' && result && (settings.weightKg > 100 ? name === 'cord-medium-heavy' : cords[settings.lengthM] === name);
      cord.visible = !(lesson === 'pendulum' && result) || mine || (name !== 'cord-medium-heavy' && !(settings.weightKg > 100));
      cord.rotation.z = mine && result.periodS > 0 ? 0.35 * Math.sin(seconds * 2 * Math.PI / result.periodS) : 0;
    }
    const arm = part('turning-arm', 'arm'), plumb = part('turning-arm', 'plumb');
    if (arm) arm.rotation.y = lesson === 'gforce' && result ? seconds * Math.min(3, (settings.speedMph ?? 40) * 0.44704 / (settings.radiusM ?? 50) * 3) : seconds * 0.3;
    if (plumb) plumb.rotation.z = lesson === 'gforce' && result ? -(result.leanDegrees ?? 0) * Math.PI / 180 : 0;
    const ramp = part('launcher-ramp', 'ramp-arm');
    if (ramp && lesson === 'launch' && result) ramp.rotation.x = -(settings.angleDeg ?? 45) * Math.PI / 180;
    const logs = part('fire-pit', 'logs'), lid = part('fire-pit', 'lid');
    if (logs && lesson === 'fire' && result) logs.visible = settings.fuel !== 'off';
    if (lid && lesson === 'fire' && result) lid.visible = settings.putOut === 'sand';
    const needle = part('rotor-stand', 'thrust-needle');
    if (needle && lesson === 'altitude' && result) needle.rotation.z = -Math.PI / 2 * Math.min(1, result.liftShare ?? 1);
  }

  function frame(now) {
    if (disposed) return;
    const dt = Math.min(0.1, clock ? (now - clock) / 1000 : 0.016);
    clock = now;
    const blend = 1 - Math.exp(-3.2 * dt);
    pose.position.lerp(goal.position, blend);
    pose.target.lerp(goal.target, blend);
    camera.position.copy(pose.position);
    camera.lookAt(pose.target);
    animate(now / 1000);
    const fanAssets = fanRoom.frame(now / 1000); // LAB-FAN-VIEW
    if (canvas.dataset.fanCar !== fanAssets.car) canvas.dataset.fanCar = fanAssets.car;
    if (canvas.dataset.fanBlueprint !== fanAssets.blueprint) canvas.dataset.fanBlueprint = fanAssets.blueprint;
    drawRestore(now / 1000);
    renderer.render(scene, camera);
    raf = win ? win.requestAnimationFrame(frame) : 0;
  }
  if (win) raf = win.requestAnimationFrame(frame);

  return {
    ready,
    canvas,
    // lessonId: the bench to move to (null: the overview); last: that bench's last result (or null).
    show(lessonId, last = null) { lesson = lessonId; result = last; if (focus !== lessonId) { focus = lessonId; aim(lessonId); } },
    setResult(last) { result = last; },
    // LAB-FAN-VIEW: no profile or game state enters the renderer.
    fan(view) { const before = fanRoom.pose(); fanRoom.update(view); if (JSON.stringify(before) !== JSON.stringify(fanRoom.pose())) aim(focus); },
    // LAB-RESTORE: the sequence's stage object (from restore.js stageAt), or null to take the tank away.
    restore(state) {
      const was = restore.state !== null;
      restore.state = state ?? null;
      if (state) { buildRestore(); loadRestoreWreck(state.kind); }
      if ((state !== null) !== was) aim(focus);
    },
    // For tests: the camera's goal and where it is.
    camera: () => ({position: camera.position.toArray(), goal: goal.position.toArray()}),
    renderOnce(now = 0) { clock = clock || now; animate(now / 1000); drawRestore(now / 1000); renderer.render(scene, camera); },
    dispose() {
      if (disposed) return;
      disposed = true;
      stats.disposed++; stats.listeners--;
      if (raf && win) win.cancelAnimationFrame(raf);
      win?.removeEventListener('resize', resize);
      fanRoom.dispose(); // LAB-FAN-VIEW
      release(scene);
      scene.clear();
      renderer.dispose?.();
      renderer.forceContextLoss?.();
      canvas.remove();
      parts.clear(); models.clear();
      restore.bubbles.length = 0; restore.hull = null;
    },
  };
}

// The room's life inside the screen: start it when the Lab opens, stop it when the Lab closes. A start that finishes after a stop
// (or after a newer start) is dropped, and a room that cannot be made leaves the screen plain. Everything started is stopped.
export function createSceneKeeper({stage, loadManifest, sceneFactory = createLabScene, onPlain = () => {}, onRoom = () => {}}) {
  let ticket = 0, scene = null;
  return {
    get scene() { return scene; },
    async start(wanted) {
      const mine = ++ticket;
      try {
        const manifest = await loadManifest();
        if (mine !== ticket) return;
        const made = sceneFactory({host: stage, manifest, quality: 'high'});
        if (mine !== ticket) { made.dispose(); return; }
        scene = made;
        onRoom(made, wanted);
      } catch {
        if (mine === ticket) { scene = null; onPlain(); }
      }
    },
    stop() {
      ticket++;
      scene?.dispose();
      scene = null;
    },
  };
}
