// render3d.js — three.js chase-cam view of The Duel. A road ribbon extruded
// along the course centerline, low-poly cars (player / rival / traffic /
// police), themed scenery, sky + fog. View only: reads app.duel state.

import * as THREE from 'three';
import { DRIVE } from './config.js';

export function attachRenderer(host, app) {
  const W = () => host.clientWidth || 800;
  const H = () => host.clientHeight || 380;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(W(), H());
  host.innerHTML = '';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, W() / H(), 0.1, 1200);
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(40, 80, -30);
  scene.add(sun, new THREE.AmbientLight(0xffffff, 0.6));

  // reusable car factory
  function buildCar(bodyColor, accentColor) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.4),
      new THREE.MeshLambertMaterial({ color: bodyColor, flatShading: true }));
    body.position.y = 0.6; g.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 2.0),
      new THREE.MeshLambertMaterial({ color: accentColor, flatShading: true }));
    cabin.position.set(0, 1.1, -0.2); g.add(cabin);
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 10);
    wheelGeo.rotateZ(Math.PI / 2);
    for (const [x, z] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
      const w = new THREE.Mesh(wheelGeo, wheelMat); w.position.set(x, 0.45, z); g.add(w);
    }
    return g;
  }

  let stageObjs = null;
  let playerCar = buildCar(0xc81d11, 0xf2c200);
  scene.add(playerCar);
  let rivalCar = buildCar(0x2b3a8c, 0xcccccc); rivalCar.visible = false; scene.add(rivalCar);
  let policeCar = buildCar(0x14233f, 0xffffff); policeCar.visible = false; scene.add(policeCar);
  // cop lamps
  const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
  const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), new THREE.MeshBasicMaterial({ color: 0x2244ff }));
  lampL.position.set(-0.5, 1.5, 0); lampR.position.set(0.5, 1.5, 0);
  policeCar.add(lampL, lampR);
  const trafficPool = [];

  function buildStage() {
    if (stageObjs) { scene.remove(stageObjs); disposeTree(stageObjs); }
    const course = app.duel.course;
    const theme = course.theme;
    stageObjs = new THREE.Group();
    scene.background = new THREE.Color(theme.sky);
    scene.fog = new THREE.FogExp2(theme.fog, theme.fogDensity * 0.6);

    // road ribbon + shoulders from the centerline samples
    const half = DRIVE.roadHalfWidth, shoulder = half + 5;
    const roadGeo = ribbon(course, half * 2 + 1);
    const road = new THREE.Mesh(roadGeo, new THREE.MeshLambertMaterial({ color: theme.road }));
    stageObjs.add(road);
    const groundGeo = ribbon(course, shoulder * 2 + 60, -0.05);
    const groundM = new THREE.Mesh(groundGeo, new THREE.MeshLambertMaterial({ color: theme.ground, flatShading: true }));
    stageObjs.add(groundM);
    // dashed center line
    const lineMat = new THREE.MeshBasicMaterial({ color: theme.line });
    for (let s = 0; s < course.length; s += 28) {
      const p = course.worldAt(s, 0);
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 8), lineMat);
      dash.position.set(p.x, p.y + 0.06, p.z); dash.rotation.y = p.heading;
      stageObjs.add(dash);
    }
    // radar trap markers (roadside camera posts)
    for (const r of course.features.radarTraps) {
      const p = course.worldAt(r.s, half + 1.5);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 0.4), new THREE.MeshLambertMaterial({ color: 0x222222 }));
      post.position.set(p.x, p.y + 2, p.z); stageObjs.add(post);
      const cam = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.8), new THREE.MeshLambertMaterial({ color: 0x999999 }));
      cam.position.set(p.x, p.y + 4, p.z); stageObjs.add(cam);
    }
    // gas-station checkpoint at the end
    const end = course.worldAt(course.length, 0);
    const gas = new THREE.Group();
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(20, 0.6, 8), new THREE.MeshLambertMaterial({ color: 0xcf3b2a }));
    canopy.position.set(end.x, end.y + 5, end.z); gas.add(canopy);
    for (const dx of [-8, 8]) {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
      col.position.set(end.x + dx, end.y + 2.5, end.z); gas.add(col);
    }
    stageObjs.add(gas);

    // scenery via instanced meshes
    const sc = course.features.scenery;
    const geo = sceneryGeo(theme.scenery);
    const mat = new THREE.MeshLambertMaterial({ color: theme.sceneryColor, flatShading: true });
    const inst = new THREE.InstancedMesh(geo, mat, sc.length);
    const m = new THREE.Matrix4();
    sc.forEach((o, i) => {
      const p = course.worldAt(o.s, o.off);
      m.makeScale(o.scale, o.scale, o.scale);
      m.setPosition(p.x, p.y + 1.5 * o.scale, p.z);
      inst.setMatrixAt(i, m);
    });
    stageObjs.add(inst);

    scene.add(stageObjs);
    // size the traffic pool, then start every pool mesh hidden — a stage with
    // fewer cars must not inherit visible ghosts from the previous one
    while (trafficPool.length < app.duel.state.traffic.length) {
      const t = buildCar(0x888888, 0x444444); t.visible = false; scene.add(t); trafficPool.push(t);
    }
    for (const t of trafficPool) t.visible = false;
  }

  // keyed on Course object identity: _loadStage always builds a fresh Course,
  // so this covers stage advance, campaign restart on the same stage index,
  // and car/difficulty changes in one check
  let loadedCourse = null;
  function frame() {
    const st = app.duel.state;
    if (!app.duel.course) { renderer.render(scene, camera); return; }
    if (loadedCourse !== app.duel.course) { buildStage(); loadedCourse = app.duel.course; playerCar.children[0].material.color.set(app.duel.car.color); playerCar.children[1].material.color.set(app.duel.car.accent); }

    const course = app.duel.course;
    // player
    const pp = course.worldAt(st.s, st.lateral);
    playerCar.position.set(pp.x, pp.y + 0.1, pp.z);
    playerCar.rotation.y = pp.heading + st.input.steer * 0.05;
    if (st.crashFlash > 0) playerCar.position.y += Math.sin(st.crashFlash * 40) * 0.15;

    // chase camera
    const back = course.worldAt(Math.max(0, st.s - 11), st.lateral * 0.6);
    camera.position.set(back.x, back.y + 5.2, back.z);
    const look = course.worldAt(st.s + 18, st.lateral * 0.3);
    camera.lookAt(look.x, look.y + 1.5, look.z);

    // rival
    if (st.rival) {
      rivalCar.visible = true;
      const rp = course.worldAt(st.rival.s, st.rival.lateral);
      rivalCar.position.set(rp.x, rp.y + 0.1, rp.z); rivalCar.rotation.y = rp.heading;
    } else rivalCar.visible = false;

    // traffic; pool meshes beyond this stage's car count stay hidden
    st.traffic.forEach((c, i) => {
      const obj = trafficPool[i]; if (!obj) return;
      const near = Math.abs(c.s - st.s) < 320 && c.alive;
      obj.visible = near;
      if (near) { const cp = course.worldAt(c.s, c.lateral); obj.position.set(cp.x, cp.y + 0.1, cp.z); obj.rotation.y = cp.heading + (c.dir < 0 ? Math.PI : 0); }
    });
    for (let i = st.traffic.length; i < trafficPool.length; i++) trafficPool[i].visible = false;

    // police pursuer + flashing lamps
    const pur = st.police.pursuit;
    if (pur && pur.active) {
      policeCar.visible = true;
      const gp = course.worldAt(st.s - Math.max(4, pur.gapU), st.lateral);
      policeCar.position.set(gp.x, gp.y + 0.1, gp.z); policeCar.rotation.y = gp.heading;
      const t = (performance.now() % 400) < 200;
      lampL.visible = t; lampR.visible = !t;
    } else policeCar.visible = false;

    renderer.render(scene, camera);
  }

  let raf = 0, disposed = false;
  const tick = () => { if (disposed) return; frame(); raf = requestAnimationFrame(tick); };
  raf = requestAnimationFrame(tick);

  function onResize() { renderer.setSize(W(), H()); camera.aspect = W() / H(); camera.updateProjectionMatrix(); }
  window.addEventListener('resize', onResize);

  if (typeof window !== 'undefined') {
    window.__render = {
      renderer, scene, camera,
      // run one full frame synchronously (builds stage geometry, positions all
      // actors, renders). Lets verification prove the scene renders without
      // relying on rAF, which throttles in unfocused/headless tabs.
      renderFrame() { frame(); return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles }; },
      sample() {
        const rt = new THREE.WebGLRenderTarget(64, 48);
        renderer.setRenderTarget(rt); renderer.render(scene, camera);
        const buf = new Uint8Array(64 * 48 * 4);
        renderer.readRenderTargetPixels(rt, 0, 0, 64, 48, buf);
        renderer.setRenderTarget(null); rt.dispose();
        const colors = new Set();
        for (let i = 0; i < buf.length; i += 4) colors.add(`${buf[i] >> 4},${buf[i + 1] >> 4},${buf[i + 2] >> 4}`);
        return { distinctColors: colors.size, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
      },
    };
  }

  return { dispose() { disposed = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); renderer.dispose(); host.innerHTML = ''; } };
}

// ---- geometry helpers --------------------------------------------------
function ribbon(course, width, yOff = 0) {
  const half = width / 2;
  const verts = [], idx = [];
  const N = course.samples.length;
  for (let i = 0; i < N; i++) {
    const sm = course.samples[i];
    const nx = Math.cos(sm.heading), nz = -Math.sin(sm.heading);
    verts.push(sm.x + nx * half, sm.y + yOff, sm.z + nz * half);
    verts.push(sm.x - nx * half, sm.y + yOff, sm.z - nz * half);
  }
  for (let i = 0; i < N - 1; i++) {
    const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

function sceneryGeo(kind) {
  switch (kind) {
    case 'pine': return new THREE.ConeGeometry(1.4, 5, 6);
    case 'palm': return new THREE.ConeGeometry(1.0, 6, 5);
    case 'building': return new THREE.BoxGeometry(4, 10, 4);
    case 'cactus':
    default: return new THREE.CylinderGeometry(0.6, 0.7, 4, 6);
  }
}

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((mm) => mm.dispose?.()); }
  });
}
