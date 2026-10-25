// The Lab's room (docs/LAB.md sections 2 and 8): the hangar and its benches from public/assets/models/lab/, drawn on a
// canvas of its own, with the camera gliding to the bench in use. Drawing only: it takes a lesson and the last result and
// moves parts; it knows nothing of the game, the save or the race. Everything it makes is released by dispose().
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

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
export const OVERVIEW = Object.freeze({position: [0, 5.2, 13.5], target: [0, 1.6, -1]});

export function createLabScene({host, manifest, createRenderer = defaultRenderer, load = defaultLoad, quality = 'high'}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const canvas = doc.createElement('canvas');
  canvas.className = 'lab-canvas';
  host.append(canvas);
  const renderer = createRenderer(canvas);
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

  const part = (model, name) => parts.get(model)?.get(name) ?? null;

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
    // For tests: the camera's goal and where it is.
    camera: () => ({position: camera.position.toArray(), goal: goal.position.toArray()}),
    renderOnce(now = 0) { clock = clock || now; animate(now / 1000); renderer.render(scene, camera); },
    dispose() {
      if (disposed) return;
      disposed = true;
      stats.disposed++; stats.listeners--;
      if (raf && win) win.cancelAnimationFrame(raf);
      win?.removeEventListener('resize', resize);
      release(scene);
      scene.clear();
      renderer.dispose?.();
      renderer.forceContextLoss?.();
      canvas.remove();
      parts.clear(); models.clear();
    },
  };
}
