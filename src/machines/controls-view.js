const LABELS = Object.freeze({ swing: 'Swing', boom: 'Boom', arm: 'Arm', bucket: 'Bucket',
  forward: 'Drive forward', steer: 'Steer' });

export function machineControlsView({ mode = 'drive', active = null } = {}) {
  const work = mode === 'work';
  const items = work ? ['swing', 'boom', 'arm', 'bucket'] : ['forward', 'steer'];
  const tiles = items.map((key, index) => {
    const x = 24 + (index % 2) * 152, y = 42 + Math.floor(index / 2) * 86;
    const lit = active === key ? ' machine-control-lit' : '';
    return `<g class="machine-control${lit}" data-control="${key}"><rect x="${x}" y="${y}" width="136" height="64" rx="8"/><text x="${x + 68}" y="${y + 38}" text-anchor="middle">${LABELS[key]}</text></g>`;
  }).join('');
  return `<section class="machine-controls" aria-label="Machine controls"><h2>${work ? 'WORK MODE' : 'DRIVE MODE'}</h2><svg viewBox="0 0 320 220" role="img" aria-label="${work ? 'Excavator controls' : 'Driving controls'}"><title>${work ? 'Excavator controls' : 'Driving controls'}</title>${tiles}</svg><p>Press Tab to change mode.</p></section>`;
}

export function mountMachineControlsView(root, state = {}) {
  if (!root) throw new TypeError('A screen element is required.');
  root.innerHTML = machineControlsView(state);
}
