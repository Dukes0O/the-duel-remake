// Drawing tools for this corner only. Clones borrow the room's geometry;
// owned labels and materials are released without touching the room assets.
export const camera = (height = 2) => ({position: [4.5, height + 1.2, 8], target: [0, height - (height >= 3 ? 1.5 : 2.8), 0]});
export const object = (id, position, size, colour, control) => ({id, position, size, colour, control});
export const ball = (id, position, size, colour, control) => ({...object(id, position, [size, size, size], colour, control), shape: 'sphere'});
export const target = (id, position, size, control) => ({...object(id, position, size, '#edc557', control), opacity: 0});
export const range = (id, label, min, max, initial, step, extra = {}) => ({id, label, value: step, min, max, initial, step, cycle: true, ...extra});
export const answers = rows => rows.map(([id, label]) => ({id, label, picture: id, animation: id}));
export const question = (text, correct, rows) => ({text, correct, answers: answers(rows)});
export const word = (lesson, word, meaning, animation = word.toLowerCase().replaceAll(' ', '-')) => ({id: `${lesson}-${animation}`, word, meaning, animation});
export const hint = (what, plainer, worked) => ({what, plainer, worked});

export function mountMachine(modelId, update) {
  return ({group, models, THREE, doc, canvas}) => {
    const source = models.get(modelId), machine = source.clone(true);
    machine.position.set(0, 0, 0); machine.rotation.set(0, 0, 0); machine.visible = true;
    const wasVisible = source.visible; source.visible = false; group.add(machine);
    const signs = group.parent.getObjectByName('Lab 2 signs and Brian'), signsVisible = signs?.visible;
    if (signs) signs.visible = false;
    const materials = [];
    machine.traverse(n => { if (n.material) { const rows = [].concat(n.material).map(m => { const copy = m.clone(); materials.push(copy); return copy; }); n.material = Array.isArray(n.material) ? rows : rows[0]; } });
    const overlay = doc.createElement('div'); overlay.className = 'lab-lift-overlay';
    const gauge = doc.createElement('div'); gauge.className = 'lab-lift-gauge'; gauge.style.width = '260px'; overlay.append(gauge);
    canvas.parentElement.append(overlay);
    const labels = Array.from({length: 3}, (_, i) => {
      const el = doc.createElement('div'); el.className = 'lab-lift-force';
      el.style.cssText = `top:${85 + i * 62}px;left:24px;width:260px;color:${['#edc557', '#56d683', '#f06464'][i]}`;
      overlay.append(el); return el;
    });
    let palette = '';
    return {
      draw(d, clock) {
        // At the final key-idea card the frame has no animation. Keep the
        // machine's last pose without asking a lesson to read missing input.
        if (!d.input) { if (!overlay.hidden) overlay.hidden = true; return; }
        update(machine, d, clock);
        const hidden = clock.stage === 0 || clock.stage === 3 && clock.time === 0;
        if (overlay.hidden !== hidden) overlay.hidden = hidden;
        const rows = d.labels ?? [];
        const colours = d.labelColours ?? ['#edc557', '#56d683', '#f06464'];
        if (palette !== colours.join('/')) { labels.forEach((el, i) => { el.style.color = colours[i]; }); palette = colours.join('/'); }
        if (gauge.hidden !== !d.gauge) gauge.hidden = !d.gauge;
        const gaugeText = d.gauge ?? '';
        if (gauge.textContent !== gaugeText) gauge.textContent = gaugeText;
        labels.forEach((el, i) => { if (el.hidden !== !rows[i]) el.hidden = !rows[i]; const text = rows[i] ?? ''; if (el.textContent !== text) el.textContent = text; });
        const state = JSON.stringify({id: modelId, input: d.input, reading: d.reading, controls: d.objects?.filter(o => o.control).map(o => o.control)});
        if (canvas.dataset.labFlyingDrawing !== state) canvas.dataset.labFlyingDrawing = state;
      },
      dispose() { machine.removeFromParent(); materials.forEach(m => m.dispose()); overlay.remove(); source.visible = wasVisible; if (signs) signs.visible = signsVisible; },
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
