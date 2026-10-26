// Drawing tools for this corner only. Clones borrow the room's geometry;
// owned labels and materials are released without touching the room assets.
let scaleExplained = false;
export const object = (id, position, size, colour, control) => ({id, position, size, colour, control});
export const ball = (id, position, size, colour, control) => ({...object(id, position, [size, size, size], colour, control), shape: 'sphere'});
export const target = (id, position, size, control) => ({...object(id, position, size, '#edc557', control), opacity: 0});
export const range = (id, label, min, max, initial, step, extra = {}) => ({id, label, value: step, min, max, initial, step, cycle: true, ...extra});
export const answers = rows => rows.map(([id, label]) => ({id, label, picture: id, animation: id}));
export const question = (text, correct, rows) => ({text, correct, answers: answers(rows)});
export const word = (lesson, word, meaning, animation = word.toLowerCase().replaceAll(' ', '-')) => ({id: `${lesson}-${animation}`, word, meaning, animation});
export const hint = (what, plainer, worked) => ({what, plainer, worked});

export function mountMachine(modelId, update) {
  return ({group, models, THREE, doc, canvas, camera}) => {
    const source = models.get(modelId), machine = source.clone(true);
    machine.position.set(0, 0, 0); machine.rotation.set(0, 0, 0); machine.visible = true;
    const wasVisible = source.visible; source.visible = false; group.add(machine);
    const signs = group.parent.getObjectByName('Lab 2 signs and Brian'), signsVisible = signs?.visible;
    if (signs) signs.visible = false;
    const materials = [];
    machine.traverse(n => { if (n.material) { const rows = [].concat(n.material).map(m => { const copy = m.clone(); materials.push(copy); return copy; }); n.material = Array.isArray(n.material) ? rows : rows[0]; } });
    const overlay = doc.createElement('div'); overlay.className = 'lab-lift-overlay';
    const plate = doc.createElement('div');
    plate.textContent = 'Scale model: 1 to 10';
    plate.style.cssText = 'position:absolute;padding:4px 8px;background:#252c29;color:#edc557;border:2px solid #8f9791;font:bold 14px sans-serif;transform:translate(-50%,-50%);white-space:nowrap';
    overlay.append(plate);
    canvas.parentElement.append(overlay);
    const labels = Array.from({length: 3}, (_, i) => {
      const el = doc.createElement('div'); el.className = 'lab-lift-force';
      el.style.cssText = `width:auto;max-width:230px;white-space:nowrap;font-size:20px;padding:6px 9px;transform:translate(-50%,-50%);color:${['#edc557', '#56d683', '#f06464'][i]}`;
      overlay.append(el); return el;
    });
    let palette = '', lastDrawing = null, introduction = null;
    const alignments = [];
    const setHidden = (element, value) => { if (element.hidden !== value) element.hidden = value; };
    function restoreIntroduction() {
      if (!introduction) return;
      introduction.prose.innerHTML = introduction.html;
      introduction.next.disabled = introduction.disabled;
      introduction = null;
    }
    const anchor = (element, position) => {
      const point = group.localToWorld(new THREE.Vector3(...position)).project(camera);
      const left = `${Math.round((point.x + 1) * canvas.clientWidth / 2)}px`;
      const top = `${Math.round((1 - point.y) * canvas.clientHeight / 2)}px`;
      if (element.style.left !== left) element.style.left = left;
      if (element.style.top !== top) element.style.top = top;
    };
    return {
      draw(d, clock) {
        // At the final key-idea card the frame has no animation. Keep the
        // machine's last pose without asking a lesson to read missing input.
        if (!d.input) {
          if (lastDrawing && camera) {
            const view = lastDrawing.camera;
            camera.position.set(group.position.x + view.position[0], view.position[1], group.position.z + view.position[2]);
            camera.lookAt(group.position.x + view.target[0], view.target[1], group.position.z + view.target[2]);
          }
          labels.forEach(el => setHidden(el, true)); restoreIntroduction();
          return;
        }
        lastDrawing = d;
        update(machine, d, clock);
        const hidden = clock.stage === 0 || clock.stage === 3 && clock.time === 0;
        if (!scaleExplained && clock.stage === 0) {
          const panel = canvas.parentElement.querySelector('.lab-teaching');
          const prose = panel?.querySelector('p'), next = panel?.querySelector('[data-teach="next"]');
          if (prose && next) {
            introduction = {prose, next, html: prose.innerHTML, disabled: next.disabled, start: clock.time};
            prose.textContent = 'Brian: This is a model, one tenth the size. The times and distances are the real ones.';
            next.disabled = true; scaleExplained = true;
          }
        }
        if (introduction && (clock.stage !== 0 || clock.time - introduction.start >= 2.8)) restoreIntroduction();
        group.updateMatrixWorld(true); camera.updateMatrixWorld(true);
        anchor(plate, d.platePosition ?? [0, .65, .65]);
        const rows = d.labels ?? [];
        const colours = d.labelColours ?? ['#edc557', '#56d683', '#f06464'];
        if (palette !== colours.join('/')) { labels.forEach((el, i) => { el.style.color = colours[i]; }); palette = colours.join('/'); }
        labels.forEach((el, i) => {
          setHidden(el, hidden || clock.stage === 4 || !rows[i]);
          const text = rows[i] ?? ''; if (el.textContent !== text) el.textContent = text;
          const alignment = d.labelAligns?.[i] ?? 'center';
          if (alignments[i] !== alignment) {
            el.style.transform = `translate(${alignment === 'end' ? '-100%' : alignment === 'start' ? '0' : '-50%'},-50%)`;
            alignments[i] = alignment;
          }
          if (d.labelPositions?.[i]) anchor(el, d.labelPositions[i]);
        });
        const state = JSON.stringify({id: modelId, input: d.input, reading: d.reading, controls: d.objects?.filter(o => o.control).map(o => o.control)});
        if (canvas.dataset.labFlyingDrawing !== state) canvas.dataset.labFlyingDrawing = state;
      },
      dispose() { restoreIntroduction(); machine.removeFromParent(); materials.forEach(m => m.dispose()); overlay.remove(); source.visible = wasVisible; if (signs) signs.visible = signsVisible; },
    };
  };
}

// Small diagrams draw the machine and the outcome, with no prose competing
// with the answer label. Each lesson supplies its actual measured values.
export function picture(draw) {
  return (ctx, w, h) => {
    ctx.fillStyle = '#233934'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c6cabc'; ctx.fillStyle = '#edc557'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(12, h - 20); ctx.lineTo(w - 12, h - 20); ctx.stroke();
    draw(ctx, w, h);
  };
}
export function line(ctx, x, y, a, b, colour = '#c6cabc', width = 4) {
  ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(a, b); ctx.stroke();
}
export function dot(ctx, x, y, radius, colour = '#edc557') {
  ctx.fillStyle = colour; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
}
export function caption(ctx, text, x, y) { ctx.fillStyle = '#f5f0dc'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, x, y); }
