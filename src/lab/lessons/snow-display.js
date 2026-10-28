import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Room-owned benches are cloned; lesson models and labels are released together.
export function mountSnow(options, modelId, animate) {
  const {group, models, THREE, doc, canvas, camera} = options;
  const source = models.get(modelId), machine = source.clone(true), wasVisible = source.visible;
  machine.position.set(0, 0, 0); machine.rotation.set(0, 0, 0); machine.scale.setScalar(1);
  group.add(machine);
  const signs = group.parent.getObjectByName('Lab 2 signs and Brian'), signsVisible = signs?.visible;
  if (signs) signs.visible = false;
  const own = [], resources = new Set(), props = new Map(), trails = new Map();
  const track = root => { root.traverse(n => { if (n.geometry) resources.add(n.geometry); for (const m of [].concat(n.material ?? [])) { resources.add(m); for (const v of Object.values(m)) if (v?.isTexture) resources.add(v); } }); };
  // Bench resources belong to the room. Only cloned transforms change.
  const overlay = doc.createElement('div'); overlay.dataset.snowLesson = modelId;
  overlay.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;color:#f5f0dc;font:600 18px/1.3 sans-serif';
  const labels = Array.from({length: 3}, () => {
    const el = doc.createElement('div'); el.style.cssText = 'position:absolute;background:#252c29eb;border-bottom:3px solid #edc557;padding:5px 8px;white-space:pre-line;max-width:220px'; overlay.append(el); return el;
  });
  canvas.parentElement.append(overlay);
  let library, disposed = false;
  new GLTFLoader().loadAsync('/assets/models/lab/snow-lesson-props.glb').then(gltf => {
    track(gltf.scene);
    if (disposed) { resources.forEach(r => r.dispose()); return; }
    library = gltf.scene; canvas.dataset.snowProps = 'ready';
  }).catch(() => { if (!disposed) canvas.dataset.snowProps = 'failed'; });
  function prop(row) {
    const key = `${row.id}:${row.model}`;
    let root = props.get(key);
    if (!root && library) {
      const template = library.getObjectByName(row.model);
      if (!template) throw Error(`Missing snow lesson model: ${row.model}`);
      root = template.clone(true); group.add(root); props.set(key, root); own.push(root);
      if (row.ghost) root.traverse(n => { if (n.material) { n.material = n.material.clone(); n.material.transparent = true; n.material.opacity = .28; n.material.depthWrite = false; resources.add(n.material); } });
    }
    if (root) { root.visible = true; root.position.set(...row.position); root.rotation.set(...(row.rotation ?? [0, 0, 0])); root.scale.setScalar(row.scale ?? 1); }
    return root;
  }
  return {
    draw(d, clock) {
      source.visible = false;
      overlay.hidden = !d?.input;
      if (!d?.input) return;
      for (const p of props.values()) p.visible = false;
      animate(machine, d, clock, prop);
      for (const t of trails.values()) t.visible = false;
      for (const row of d.trails ?? []) {
        if (row.points.length < 2) continue;
        let mesh = trails.get(row.id);
        // Paths are small and change only when the revealed sample count changes.
        const key = JSON.stringify(row.points);
        if (!mesh) { mesh = new THREE.Mesh(undefined, new THREE.MeshBasicMaterial({color: row.colour, transparent: true, opacity: row.opacity ?? 1})); group.add(mesh); trails.set(row.id, mesh); own.push(mesh); resources.add(mesh.material); }
        if (mesh.userData.key !== key) {
          mesh.geometry.dispose();
          mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(row.points.map(p => new THREE.Vector3(...p))), Math.max(12, row.points.length), .025, 5, false);
          mesh.userData.key = key;
        }
        mesh.visible = true;
      }
      const texts = clock.stage === 3 && clock.time === 0 ? [] : d.captions ?? [];
      group.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      labels.forEach((el, i) => {
        el.hidden = !texts[i]; if (el.hidden) return;
        if (el.textContent !== texts[i]) el.textContent = texts[i];
        const p = group.localToWorld(new THREE.Vector3(...d.captionAnchors[i])).project(camera);
        const [dx, dy] = d.captionOffsets?.[i] ?? [-80, -40];
        el.style.left = `${Math.round((p.x + 1) * canvas.clientWidth / 2 + dx)}px`;
        el.style.top = `${Math.round((1 - p.y) * canvas.clientHeight / 2 + dy)}px`;
      });
      // Captions never sit on top of each other: a label that would touch an earlier one steps clear, up or down.
      const GAP = 6, placed = [];
      for (const el of labels) {
        if (el.hidden) continue;
        const box = {left: parseFloat(el.style.left), top: parseFloat(el.style.top), width: el.offsetWidth || 0, height: el.offsetHeight || 0};
        for (let pass = 0; pass < 3; pass++) {
          const hit = placed.find(o => box.left < o.left + o.width + GAP && box.left + box.width + GAP > o.left && box.top < o.top + o.height + GAP && box.top + box.height + GAP > o.top);
          if (!hit) break;
          box.top = box.top + box.height / 2 < hit.top + hit.height / 2 ? hit.top - box.height - GAP : hit.top + hit.height + GAP;
        }
        el.style.top = `${Math.round(box.top)}px`; placed.push(box);
      }
      canvas.dataset.snowDrawing = JSON.stringify({model: modelId, input: d.input, actual: d.actual, reading: d.reading, trails: d.trails?.length ?? 0});
    },
    dispose() {
      disposed = true; source.visible = wasVisible; machine.removeFromParent(); overlay.remove();
      if (signs) signs.visible = signsVisible;
      for (const root of own) root.removeFromParent();
      for (const mesh of trails.values()) mesh.geometry.dispose();
      resources.forEach(r => r.dispose());
      delete canvas.dataset.snowProps; delete canvas.dataset.snowDrawing;
    },
  };
}

// The existing green wall box is a first-aid cabinet, rather than an empty sign.
export function nameFirstAid(root, doc, THREE) {
  const image = doc.createElement('canvas'); image.width = 256; image.height = 180;
  const ctx = image.getContext?.('2d'); if (!ctx) return;
  ctx.fillStyle = '#237a45'; ctx.fillRect(0, 0, 256, 180);
  ctx.fillStyle = '#fff'; ctx.fillRect(111, 18, 34, 86); ctx.fillRect(85, 44, 86, 34);
  ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('FIRST AID', 128, 149);
  const texture = new THREE.CanvasTexture(image); texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.4, .28), new THREE.MeshBasicMaterial({map: texture, toneMapped: false}));
  face.name = 'First aid cabinet face'; face.position.set(8.8, 1.9, -8.85); root.add(face);
}
