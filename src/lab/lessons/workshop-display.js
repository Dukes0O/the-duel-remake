import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
// Drawing helpers for this corner. Models and their materials remain room-owned.
export const box = (id, position, size, colour, control, rotation) => ({id, position, size, colour, control, rotation});
export const camera = (position, target) => ({position, target});
export const arrow = (kind, kilograms, origin, direction) => ({kind, newtons: kilograms, displayValue: kilograms,
  displayUnit: 'kg', origin, direction, headWidth: .38, headLength: .38, inFront: true});
export function thickArrows(drawing) {
  for (const [i, a] of (drawing.forces ?? []).entries()) {
    const length = a.newtons * drawing.metresPerNewton;
    const vertical = a.direction[1] !== 0;
    const width = Math.min(.16, length * .14);
    drawing.objects.push(box(`shaft-${a.kind}-${i}`, a.origin.map((v, i) => v + a.direction[i] * length / 2),
      vertical ? [width, Math.max(.001, length * .75), width] : [Math.max(.001, length * .75), width, width],
      a.kind === 'weight' ? '#f06464' : '#56d683'));
    drawing.objects.at(-1).inFront = true;
    if (!vertical) drawing.objects.at(-1).rotation = [0, -Math.atan2(a.direction[2], a.direction[0]), 0];
  }
  return drawing;
}

export function mountMachine(options, modelId, animate) {
  const {group, models, doc, canvas, THREE, camera: viewCamera} = options;
  const original = models.get(modelId), machine = original.clone(true);
  const wasVisible = original.visible;
  machine.position.set(0, 0, 0); machine.rotation.set(0, 0, 0); machine.scale.setScalar(1);
  // Clone mutable geometry and materials; textures are shared, never disposed here.
  machine.traverse(n => {
    if (n.geometry) n.geometry = n.geometry.clone();
    if (n.material) n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone();
  });
  group.add(machine);
  const signs = group.parent.getObjectByName('Lab 2 signs and Brian'), signsVisible = signs?.visible;
  if (signs) signs.visible = false;
  const overlay = doc.createElement('div');
  overlay.dataset.workshop = modelId;
  overlay.style.cssText = 'position:absolute;inset:0;z-index:4;pointer-events:none;color:#f5f0dc;font:600 19px/1.25 sans-serif';
  const labels = Array.from({length: 3}, () => {
    const el = doc.createElement('div'); el.style.cssText = 'position:absolute;max-width:210px;background:#252c29ed;border-bottom:3px solid #edc557;padding:7px 10px;white-space:pre-line'; overlay.append(el); return el;
  });
  canvas.parentElement.append(overlay);
  const own = [];
  let library, disposed = false;
  const props = new Map();
  new GLTFLoader().loadAsync('/assets/models/lab/workshop-lesson-props.glb').then(gltf => {
    if (disposed) { gltf.scene.traverse(n => { n.geometry?.dispose(); for (const m of [].concat(n.material ?? [])) m.dispose(); }); return; }
    library = gltf.scene; own.push(library); canvas.dataset.workshopProps = 'ready';
  }).catch(() => { if (!disposed) canvas.dataset.workshopProps = 'failed'; });
  return {
    draw(d, clock) {
      original.visible = false;
      // The final key-idea card has no animation. Keep the last machine pose
      // without asking a lesson-specific animator to read an empty drawing.
      overlay.hidden = !d?.input;
      if (!d?.input) return;
      const texts = clock.stage === 0 || clock.stage === 3 && clock.time === 0 ? [] : d.captions ?? [];
      animate(machine, d, clock, own, options);
      for (const p of props.values()) p.visible = false;
      for (const row of d.props ?? []) {
        const key = `${row.id}:${row.model}`;
        let p = props.get(key);
        if (!p && library) {
          const source = library.getObjectByName(row.model);
          if (!source) throw Error(`Missing workshop prop ${row.model}`);
          p = source.clone(true); group.add(p); own.push(p); props.set(key, p);
        }
        if (p) { p.visible = true; p.position.set(...row.position); p.rotation.set(...(row.rotation ?? [0, 0, 0])); p.scale.setScalar(row.scale ?? 1); }
      }
      canvas.dataset.workshopPropModels = JSON.stringify([...props.values()].filter(p => p.visible).map(p => p.name));
      group.updateMatrixWorld(true); viewCamera?.updateMatrixWorld(true);
      labels.forEach((el, i) => {
        el.hidden = !texts[i]; if (el.hidden) return;
        if (el.textContent !== texts[i]) el.textContent = texts[i];
        el.style.maxWidth = `${d.captionWidth ?? 210}px`;
        const anchor = d.captionAnchors[i];
        if (!viewCamera) return;
        const p = group.localToWorld(new THREE.Vector3(...anchor)).project(viewCamera);
        const offset = d.captionOffsets?.[i] ?? [-70, 12];
        const panel = canvas.parentElement.querySelector('.lab-teaching');
        const bottom = panel && !panel.hidden ? panel.getBoundingClientRect().top - canvas.getBoundingClientRect().top - 85 : canvas.clientHeight - 90;
        el.style.left = `${Math.round(Math.max(12, Math.min(canvas.clientWidth - (d.captionWidth ?? 210) - 12, (p.x + 1) * canvas.clientWidth / 2 + offset[0])))}px`;
        el.style.top = `${Math.round(Math.max(70, Math.min(bottom, (1 - p.y) * canvas.clientHeight / 2 + offset[1])))}px`;
      });
      canvas.dataset.workshopDrawing = JSON.stringify({model: modelId, input: d.input, actual: d.actual, reading: d.reading});
    },
    dispose() {
      disposed = true;
      original.visible = wasVisible;
      if (signs) signs.visible = signsVisible;
      overlay.remove(); delete canvas.dataset.workshopDrawing; delete canvas.dataset.workshopProps; delete canvas.dataset.workshopPropModels;
      const resources = new Set();
      for (const root of [machine, ...own]) {
        root.traverse(n => { if (n.geometry) resources.add(n.geometry); for (const m of [].concat(n.material ?? [])) resources.add(m); });
        root.removeFromParent();
      }
      resources.forEach(r => r.dispose());
    },
  };
}

export function pictureBase(ctx, w, h) {
  ctx.fillStyle = '#263330'; ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.font = 'bold 19px sans-serif'; ctx.textAlign = 'center';
}
export function pictureArrow(ctx, x, y, dx, dy, colour = '#56d683') {
  ctx.strokeStyle = colour; ctx.fillStyle = colour; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx, y + dy); ctx.stroke();
  const a = Math.atan2(dy, dx);
  ctx.beginPath(); ctx.moveTo(x + dx, y + dy);
  ctx.lineTo(x + dx - 15 * Math.cos(a - .5), y + dy - 15 * Math.sin(a - .5));
  ctx.lineTo(x + dx - 15 * Math.cos(a + .5), y + dy - 15 * Math.sin(a + .5)); ctx.fill();
}
export const answers = rows => rows.map(([id, label]) => ({id, label, picture: id, animation: id}));
export const question = (text, correct, rows) => ({text, correct, answers: answers(rows)});
export const word = (lesson, name, meaning, animation = name.toLowerCase().replaceAll(' ', '-')) =>
  ({id: `${lesson}-${animation}`, word: name, meaning, animation});
export const moment = (name, text, animation, seconds = 3) => ({name, text, animation, seconds});
