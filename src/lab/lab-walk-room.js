// Drawing and input for Lab 2. The screen supplies lesson rows and opens panels.
import * as THREE from 'three';
import {WALK, CORNERS, createWalker, stepWalker, machinePrompts, machineApproaches, brianPosition, stationPrompt} from './lab-walk.js';

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function doorBoardMarkup(rows) {
  return `<section class="lab-door-board"><h3>Plan your next discovery</h3><p>Walk to a machine and press E to try it.</p>${CORNERS.map(c =>
    `<h4>${c.name}</h4><ul>${machinePrompts(rows).filter(r => r.group === c.name).map(r =>
      `<li><b>${r.state === 'passed' ? '✓ ' : ''}${escape(r.name)}</b><span>${r.state === 'locked' ? escape(r.note) : r.state === 'passed' ? 'Passed' : 'Open'}</span><small>Opens: ${escape(r.reward)}</small></li>`).join('')}</ul>`).join('')}</section>`;
}

export function createWalkRoom({scene, camera, host, canvas, manifest, models, modelOf, ready, load, release, onUse}) {
  const doc = host.ownerDocument, win = doc.defaultView;
  const group = new THREE.Group(); group.name = 'Lab 2 signs and Brian'; scene.add(group);
  const state = createWalker(), keys = new Set(), bounds = [], stations = [];
  let rows = [], paused = false, disposed = false, loaded = false, drag = null, nearest = null, last = 'lift', brian = null, mixer = null;
  const overlay = doc.createElement('div'); overlay.className = 'lab-walk-overlay';
  overlay.innerHTML = '<p class="lab-walk-help">↑ ↓ or W S: walk · ← →: turn · A D: step sideways · Drag: look · Esc: leave</p><div class="lab-walk-prompt" aria-live="polite"></div>';
  host.append(overlay);
  const prompt = overlay.querySelector('.lab-walk-prompt');
  const labels = [];
  function writeLabel(mesh, text, color = '#edc557') {
    if (mesh.userData.label === text && mesh.userData.color === color) return;
    mesh.userData.label = text; mesh.userData.color = color;
    const image = mesh.material.map.image, ctx = image.getContext('2d');
    ctx.fillStyle = '#29312f'; ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = color; ctx.lineWidth = 14; ctx.strokeRect(8, 8, 1008, 240);
    ctx.fillStyle = color; ctx.font = 'bold 64px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 128, 950); mesh.material.map.needsUpdate = true;
  }
  function label(text, width, height, {floor = false, color = '#edc557'} = {}) {
    const image = doc.createElement('canvas'); image.width = 1024; image.height = 256;
    const texture = new THREE.CanvasTexture(image);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({map: texture, side: floor ? THREE.DoubleSide : THREE.FrontSide, transparent: floor, opacity: floor ? .9 : 1, toneMapped: false}));
    writeLabel(mesh, text, color);
    if (floor) mesh.rotation.x = -Math.PI / 2;
    group.add(mesh); return mesh;
  }
  for (const c of CORNERS) {
    const sign = label(c.name, 4.4, 1.1); sign.position.set(c.x, 3.6, c.z);
    // Visible from either side of the hanging steel plate.
    const back = label(c.name, 4.4, 1.1); back.position.copy(sign.position); back.rotation.y = Math.PI;
    for (const x of [-1.8, 1.8]) {
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 2, 6), new THREE.MeshStandardMaterial({color: 0x39413f}));
      hanger.position.set(c.x + x, 5.15, c.z); group.add(hanger);
    }
  }
  const board = label('Lesson board · E', 2.5, .65); board.position.set(1.8, 1.75, 8.4); board.rotation.y = Math.PI;
  const brianName = label('Brian · E to ask', 1.8, .45);
  brianName.visible = false;
  function moveBrian() {
    const station = stations.find(s => s.ids.includes(last));
    if (!station || !brian) return;
    const at = brianPosition(station, bounds, manifest.hall);
    if (!at) return;
    brian.position.set(at[0], .03, at[1]);
    canvas.dataset.labBrianPosition = JSON.stringify([at[0], at[1]]);
    brianName.position.set(at[0], 2.25, at[1]); brianName.visible = true;
  }
  // Brian's workshop figure is rebuilt by tools/blender/lab-brian.py.
  load('/assets/models/lab/brian.glb').then(root => {
    if (disposed) { release(root); return; }
    brian = root;
    const idle = root.animations?.find(clip => clip.name === 'idle');
    if (idle) { mixer = new THREE.AnimationMixer(root); mixer.clipAction(idle).play(); }
    const box = new THREE.Box3().setFromObject(root), height = box.max.y - box.min.y;
    if (height > 0) root.scale.setScalar(1.8 / height);
    group.add(root); moveBrian(); canvas.dataset.labBrian = 'ready';
  }).catch(() => { canvas.dataset.labBrian = 'failed'; });

  ready.then(() => {
    if (disposed) return;
    for (const [id, root] of models) {
      if (id === 'hangar') continue;
      const box = new THREE.Box3().setFromObject(root);
      if (box.isEmpty()) continue;
      const bound = {minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z};
      bounds.push(bound);
      const ids = Object.keys(modelOf).filter(key => modelOf[key] === id);
      if (!ids.length) continue;
      stations.push({id, ids, bound});
    }
    // All bounds must be present before choosing a clear approach to each machine.
    for (const station of stations) {
      const at = machineApproaches(station.bound, bounds, manifest.hall)[0];
      if (!at) continue;
      const [x, z] = at;
      Object.assign(station, {x, z});
      const {id, ids} = station;
      const plate = label(ids.length > 1 ? 'Wind tunnel' : rows.find(r => r.id === ids[0])?.name ?? id, 3, .75, {floor: true});
      plate.position.set(x, .025, z); plate.visible = false;
      labels.push({station, plate});
    }
    loaded = true; moveBrian(); canvas.dataset.labWalkReady = 'true';
  });
  const interactive = event => /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target?.tagName);
  const clear = () => { keys.clear(); drag = null; state.vx = state.vz = 0; };
  function keydown(event) {
    if (interactive(event) && event.code !== 'KeyE') return;
    if (paused || !loaded) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE'].includes(event.code)) {
      event.preventDefault(); event.stopPropagation();
      if (event.code === 'KeyE') { if (!event.repeat && nearest) { clear(); onUse(nearest); } }
      else keys.add(event.code);
    }
  }
  const keyup = event => keys.delete(event.code);
  const pointerdown = event => {
    if (paused || event.button !== 0) return;
    drag = {x: event.clientX, y: event.clientY}; canvas.setPointerCapture?.(event.pointerId);
    canvas.focus({preventScroll: true}); event.preventDefault();
  };
  const pointermove = event => {
    if (!drag || paused) return;
    state.yaw -= (event.clientX - drag.x) * .003;
    state.pitch = THREE.MathUtils.clamp(state.pitch - (event.clientY - drag.y) * .002, -.65, .65);
    drag = {x: event.clientX, y: event.clientY};
  };
  const pointerup = () => { drag = null; };
  const visibility = () => { if (doc.hidden) clear(); };
  const listeners = [[doc, 'keydown', keydown], [doc, 'keyup', keyup], [win, 'blur', clear], [doc, 'visibilitychange', visibility],
    [canvas, 'pointerdown', pointerdown], [canvas, 'pointermove', pointermove], [canvas, 'pointerup', pointerup], [canvas, 'lostpointercapture', pointerup]];
  for (const [target, event, handler] of listeners) target?.addEventListener(event, handler);
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walk around Brian’s Lab');
  return {
    update(view) {
      rows = machinePrompts(view.rows);
      if (paused !== view.paused) clear();
      paused = view.paused;
      overlay.hidden = paused;
      if (view.last && view.last !== last) { last = view.last; moveBrian(); }
    },
    frame(dt) {
      mixer?.update(dt);
      if (!paused && loaded) stepWalker(state, {
        forward: Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS')),
        side: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        turn: Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight')),
      }, dt, bounds, manifest.hall);
      camera.position.set(state.x, WALK.eye, state.z);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      canvas.dataset.labWalkPosition = JSON.stringify([state.x, WALK.eye, state.z]);
      nearest = null;
      let distance = Infinity;
      const consider = (x, z, target, range) => {
        const d = Math.hypot(state.x - x, state.z - z);
        if (d < range && d < distance) { distance = d; nearest = target; }
      };
      consider(1.8, 7.7, {kind: 'board'}, 2.4);
      for (const s of stations) consider(s.x, s.z, {kind: 'machine', ids: s.ids}, 1.8);
      if (brian) {
        brian.rotation.y = Math.atan2(state.x - brian.position.x, state.z - brian.position.z);
        brianName.rotation.y = brian.rotation.y;
        consider(brian.position.x, brian.position.z, {kind: 'brian', id: last}, 1.3);
      }
      for (const {station, plate} of labels) {
        plate.visible = nearest?.kind === 'machine' && nearest.ids === station.ids;
        if (!plate.visible) continue;
        const display = stationPrompt(station.ids, rows);
        writeLabel(plate, display.floor, display.done ? '#85d49b' : '#edc557');
      }
      const text = nearest?.kind === 'board' ? 'E: read the lesson board' : nearest?.kind === 'brian' ? 'E: ask Brian' :
        nearest?.ids ? stationPrompt(nearest.ids, rows).text : '';
      if (prompt.textContent !== text) prompt.textContent = text;
      prompt.hidden = !text;
      canvas.dataset.labWalkTarget = nearest?.kind ?? '';
    },
    dispose() {
      disposed = true; clear();
      if (mixer) { mixer.stopAllAction(); mixer.uncacheRoot(brian); }
      brian?.traverse(node => node.skeleton?.dispose());
      for (const [target, event, handler] of listeners) target?.removeEventListener(event, handler);
      overlay.remove(); // Scene owner releases all meshes and textures.
    },
  };
}
