// Drawing and input for Lab 2. The screen supplies lesson rows and opens panels.
import * as THREE from 'three';
import {WALK, CORNERS, createWalker, stepWalker, machinePrompts, machineApproaches, brianPosition, stationPrompt, walkTarget,
  walkRoute, stepTravel, faceWalker, nearbyWalkGoals} from './lab-walk.js';

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
  const destinations = [], raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let selected = null, travel = null, keyboardIndex = -1, mapKey = '';
  const highlight = new THREE.BoxHelper(undefined, 0xedc557); highlight.visible = false; scene.add(highlight);
  const overlay = doc.createElement('div'); overlay.className = 'lab-walk-overlay';
  overlay.innerHTML = '<p class="lab-walk-help">Click: go and open · Tab / Shift+Tab: choose · Enter: go · WASD / ↑↓: walk · ←→ / drag: look · Esc: leave</p><div class="lab-walk-prompt" aria-live="polite"></div><div class="lab-walk-hover" role="status"></div><nav class="lab-map" aria-label="Lab map"></nav>';
  host.append(overlay);
  const prompt = overlay.querySelector('.lab-walk-prompt');
  const hover = overlay.querySelector('.lab-walk-hover'), map = overlay.querySelector('.lab-map');
  function select(destination) {
    selected = destination;
    hover.textContent = destination ? `${destination.name()} · Click or Enter to go` : '';
    hover.hidden = !destination;
    highlight.visible = !!destination?.root;
    if (highlight.visible) highlight.setFromObject(destination.root);
    canvas.style.cursor = destination ? 'pointer' : '';
    for (const button of map.querySelectorAll('[data-go]')) button.classList.toggle('selected', button.dataset.go === destination?.key);
    canvas.dataset.labWalkSelected = destination?.key ?? '';
  }
  function solidBounds() {
    return brian ? [...bounds, {id: 'brian', minX: brian.position.x - .32, maxX: brian.position.x + .32,
      minZ: brian.position.z - .32, maxZ: brian.position.z + .32}] : bounds;
  }
  function go(destination) {
    if (!destination || paused || !loaded) return;
    const obstacles = solidBounds(), route = walkRoute(state, destination.goals(obstacles), obstacles, manifest.hall);
    select(destination); keys.clear(); state.vx = state.vz = 0;
    if (!route) { hover.textContent = `${destination.name()} · Choose another side to approach`; travel = null; return; }
    travel = {destination, route};
    hover.textContent = `Walking to ${destination.name()}…`;
    canvas.dataset.labWalkArrived = '';
  }
  function renderMap() {
    const key = rows.map(r => `${r.id}:${r.done}`).join('|') + loaded;
    if (mapKey === key) return;
    mapKey = key;
    const corners = start => `<div class="lab-map-corners">${CORNERS.slice(start, start + 2).map((c, i) =>
      `<button data-go="corner-${start + i}">${escape(c.name)}</button>`).join('')}</div>`;
    map.innerHTML = `<strong>Lab map</strong>${corners(0)}<div class="lab-map-floor">${stations.map(s => {
      const done = s.ids.every(id => rows.find(r => r.id === id)?.done);
      return `<button class="lab-map-dot" data-go="${s.id}" aria-label="${escape(s.destination.name())}${done ? ', passed' : ''}" title="${escape(s.destination.name())}" style="left:${(s.bound.minX + s.bound.maxX + 30) / 60 * 100}%;top:${(s.bound.minZ + s.bound.maxZ + 18) / 36 * 100}%">${done ? '✓' : '●'}</button>`;
    }).join('')}</div>${corners(2)}<div class="lab-map-people"><button data-go="brian">Brian</button><button data-go="board">Lesson board</button></div>`;
  }
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
  for (const [i, c] of CORNERS.entries()) {
    const sign = label(c.name, 4.4, 1.1); sign.position.set(c.x, 3.6, c.z);
    // Visible from either side of the hanging steel plate.
    const back = label(c.name, 4.4, 1.1); back.position.copy(sign.position); back.rotation.y = Math.PI;
    destinations.push({key: `corner-${i}`, root: sign, picks: [sign, back], name: () => c.name,
      point: () => [c.x, c.z], goals: obstacles => nearbyWalkGoals(c.x, c.z, obstacles, manifest.hall)
        .filter(([x, z]) => Math.hypot(x - c.x, z - c.z) > 1.5)});
    for (const x of [-1.8, 1.8]) {
      const hanger = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 2, 6), new THREE.MeshStandardMaterial({color: 0x39413f}));
      hanger.position.set(c.x + x, 5.15, c.z); group.add(hanger);
    }
  }
  const board = label('Lesson board · E', 2.5, .65); board.position.set(1.8, 1.75, 8.4); board.rotation.y = Math.PI;
  destinations.push({key: 'board', root: board, name: () => 'Lesson board', point: () => [1.8, 8.4],
    goals: () => [[1.8, 7.7]], target: () => ({kind: 'board'})});
  const brianName = label('Brian', 1.8, .45);
  brianName.visible = false;
  function moveBrian() {
    const station = stations.find(s => s.ids.includes(last));
    if (!station || !brian) return;
    // A late model load must never make Brian solid around the player.
    const walker = {minX: state.x - .32, maxX: state.x + .32, minZ: state.z - .32, maxZ: state.z + .32};
    const at = brianPosition(station, [...bounds, walker], manifest.hall);
    if (!at) return;
    brian.position.set(at[0], .03, at[1]);
    canvas.dataset.labBrianPosition = JSON.stringify([at[0], at[1]]);
    brianName.position.set(at[0], 2.25, at[1]); brianName.visible = true;
    if (travel) go(travel.destination);
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
    destinations.push({key: 'brian', root, picks: [root, brianName], name: () => 'Brian',
      point: () => [root.position.x, root.position.z],
      goals: obstacles => machineApproaches(obstacles.at(-1), obstacles, manifest.hall), target: () => ({kind: 'brian', id: last})});
  }).catch(() => { canvas.dataset.labBrian = 'failed'; });

  ready.then(() => {
    if (disposed) return;
    for (const [id, root] of models) {
      if (id === 'hangar') continue;
      const box = new THREE.Box3().setFromObject(root);
      if (box.isEmpty()) continue;
      const bound = {id, minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z, maxY: box.max.y};
      bounds.push(bound);
      const ids = Object.keys(modelOf).filter(key => modelOf[key] === id);
      if (!ids.length) continue;
      const destination = {key: id, root, name: () => ids.length > 1 ? 'Wind tunnel' : rows.find(r => r.id === ids[0])?.name ?? id,
        point: () => [(bound.minX + bound.maxX) / 2, (bound.minZ + bound.maxZ) / 2],
        goals: obstacles => machineApproaches(bound, obstacles, manifest.hall), target: () => ({kind: 'machine', ids})};
      stations.push({id, ids, bound, destination}); destinations.push(destination);
    }
    // GLBs finish in parallel. Keyboard order must not depend on load timing.
    const order = [...new Set(Object.values(modelOf))];
    stations.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
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
    loaded = true; moveBrian(); renderMap(); canvas.dataset.labWalkReady = 'true';
  });
  const interactive = event => /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target?.tagName);
  const clear = () => { keys.clear(); drag = null; travel = null; state.vx = state.vz = 0; };
  function keydown(event) {
    if (interactive(event) && event.code !== 'KeyE') return;
    if (paused || !loaded) return;
    if (event.code === 'Tab' || event.code === 'Enter') {
      event.preventDefault(); event.stopPropagation();
      if (event.repeat) return;
      if (event.code === 'Tab') {
        keyboardIndex = keyboardIndex < 0 ? (event.shiftKey ? stations.length - 1 : 0) :
          (keyboardIndex + (event.shiftKey ? -1 : 1) + stations.length) % stations.length;
        select(stations[keyboardIndex].destination);
      } else go(selected);
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyE'].includes(event.code)) {
      event.preventDefault(); event.stopPropagation();
      if (event.code === 'KeyE') { if (!event.repeat && nearest) { clear(); onUse(nearest); } }
      else { travel = null; keys.add(event.code); }
    }
  }
  const keyup = event => keys.delete(event.code);
  const pointerdown = event => {
    if (paused || event.button !== 0) return;
    drag = {x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, moved: false}; canvas.setPointerCapture?.(event.pointerId);
    canvas.focus({preventScroll: true}); event.preventDefault();
  };
  const pointermove = event => {
    if (paused) return;
    if (!drag) { select(pick(event)); return; }
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 5) return;
    drag.moved = true; travel = null; select(null);
    state.yaw -= (event.clientX - drag.x) * .003;
    state.pitch = THREE.MathUtils.clamp(state.pitch - (event.clientY - drag.y) * .002, -.65, .65);
    drag.x = event.clientX; drag.y = event.clientY;
  };
  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld(); scene.updateMatrixWorld(); raycaster.setFromCamera(pointer, camera);
    const objects = destinations.flatMap(d => d.picks ?? [d.root]).filter(Boolean);
    const hit = raycaster.intersectObjects(objects, true)[0];
    if (!hit) return null;
    return destinations.find(d => (d.picks ?? [d.root]).some(root => {
      for (let node = hit.object; node; node = node.parent) if (node === root) return true;
      return false;
    })) ?? null;
  }
  const pointerup = event => { const click = drag && !drag.moved; drag = null; if (click) go(pick(event)); };
  const lostcapture = () => { drag = null; };
  const pointerleave = () => { if (!drag) select(null); };
  const mapClick = event => {
    const button = event.target.closest('[data-go]');
    if (!button) return;
    go(destinations.find(d => d.key === button.dataset.go)); canvas.focus({preventScroll: true});
  };
  const mapHover = event => {
    const button = event.target.closest('[data-go]');
    if (button) select(destinations.find(d => d.key === button.dataset.go));
  };
  const visibility = () => { if (doc.hidden) clear(); };
  const listeners = [[doc, 'keydown', keydown], [doc, 'keyup', keyup], [win, 'blur', clear], [doc, 'visibilitychange', visibility],
    [canvas, 'pointerdown', pointerdown], [canvas, 'pointermove', pointermove], [canvas, 'pointerup', pointerup], [canvas, 'lostpointercapture', lostcapture],
    [canvas, 'pointerleave', pointerleave], [map, 'click', mapClick], [map, 'pointerover', mapHover]];
  for (const [target, event, handler] of listeners) target?.addEventListener(event, handler);
  canvas.tabIndex = 0; canvas.setAttribute('aria-label', 'Walk around Brian’s Lab');
  return {
    update(view) {
      rows = machinePrompts(view.rows);
      if (paused !== view.paused) clear();
      paused = view.paused;
      overlay.hidden = paused;
      highlight.visible = !paused && !!selected?.root;
      renderMap();
      if (view.last && view.last !== last) { last = view.last; moveBrian(); }
    },
    frame(dt) {
      mixer?.update(dt);
      if (!paused && loaded && travel) {
        const {destination, route} = travel;
        const arrived = stepTravel(state, route, dt, solidBounds(), manifest.hall);
        const [x, z] = destination.point();
        if (arrived && faceWalker(state, x, z, dt)) {
          travel = null;
          state.pitch = destination.key.startsWith('corner-') ? .65 : 0;
          hover.textContent = destination.name(); canvas.dataset.labWalkArrived = destination.key;
          if (destination.target) onUse(destination.target());
        }
      } else if (!paused && loaded) stepWalker(state, {
        forward: Number(keys.has('ArrowUp') || keys.has('KeyW')) - Number(keys.has('ArrowDown') || keys.has('KeyS')),
        side: Number(keys.has('KeyD')) - Number(keys.has('KeyA')),
        turn: Number(keys.has('ArrowLeft')) - Number(keys.has('ArrowRight')),
      }, dt, solidBounds(), manifest.hall);
      camera.position.set(state.x, WALK.eye, state.z);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      canvas.dataset.labWalkPosition = JSON.stringify([state.x, WALK.eye, state.z]);
      nearest = walkTarget(state, stations, brian ? [brian.position.x, brian.position.z] : null, last);
      if (brian) {
        brian.rotation.y = Math.atan2(state.x - brian.position.x, state.z - brian.position.z);
        brianName.rotation.y = brian.rotation.y;
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
      if (highlight.visible && selected?.root) highlight.setFromObject(selected.root);
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
