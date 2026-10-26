// Drawing helpers for this corner. Models and their materials remain room-owned.
export const box = (id, position, size, colour, control, rotation) => ({id, position, size, colour, control, rotation});
export const camera = (position, target) => ({position, target});
export const arrow = (kind, kilograms, origin, direction) => ({kind, newtons: kilograms, displayValue: kilograms,
  displayUnit: 'kg', origin, direction, headWidth: .25, headLength: .3, inFront: true});
export function thickArrows(drawing) {
  for (const a of drawing.forces ?? []) {
    const length = a.newtons * drawing.metresPerNewton;
    const vertical = a.direction[1] !== 0;
    drawing.objects.push(box(`shaft-${a.kind}`, a.origin.map((v, i) => v + a.direction[i] * length / 2),
      vertical ? [.11, Math.max(.001, length - .15), .11] : [Math.max(.001, length - .15), .11, .11],
      a.kind === 'weight' ? '#f06464' : '#56d683'));
    drawing.objects.at(-1).inFront = true;
    if (!vertical) drawing.objects.at(-1).rotation = [0, -Math.atan2(a.direction[2], a.direction[0]), 0];
  }
  return drawing;
}

export function mountMachine(options, modelId, animate) {
  const {group, models, doc, canvas} = options;
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
  overlay.style.cssText = 'position:absolute;left:24px;top:24px;z-index:4;pointer-events:none;display:flex;gap:12px;color:#f5f0dc;font:600 21px/1.3 sans-serif';
  const labels = Array.from({length: 3}, () => {
    const el = doc.createElement('div'); el.style.cssText = 'background:#252c29ed;border-left:4px solid #edc557;padding:10px 14px;white-space:pre-line'; overlay.append(el); return el;
  });
  canvas.parentElement.append(overlay);
  const own = [];
  return {
    draw(d, clock) {
      original.visible = false;
      // The final key-idea card has no animation. Keep the last machine pose
      // without asking a lesson-specific animator to read an empty drawing.
      overlay.hidden = !d?.input;
      if (!d?.input) return;
      const texts = clock.stage === 0 || clock.stage === 3 && clock.time === 0 ? [] : d.captions ?? [];
      labels.forEach((el, i) => { el.hidden = !texts[i]; if (el.textContent !== (texts[i] ?? '')) el.textContent = texts[i] ?? ''; });
      animate(machine, d, clock, own, options);
      canvas.dataset.workshopDrawing = JSON.stringify({model: modelId, input: d.input, actual: d.actual, reading: d.reading});
    },
    dispose() {
      original.visible = wasVisible;
      if (signs) signs.visible = signsVisible;
      overlay.remove(); delete canvas.dataset.workshopDrawing;
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
