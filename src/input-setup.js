const STORAGE_KEY = 'duel_machine_input_v1';
const AXES = Object.freeze(['swing', 'boom', 'arm', 'bucket']);

export function loadMachineInput(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (!value || typeof value !== 'object') return null;
    const axes = Object.fromEntries(AXES.filter(name => Number.isInteger(value.axes?.[name]) && value.axes[name] >= 0)
      .map(name => [name, value.axes[name]]));
    return Object.keys(axes).length ? { deviceId: String(value.deviceId || ''), axes } : null;
  } catch { return null; }
}

export function saveMachineInput(mapping, storage = globalThis.localStorage) {
  if (!mapping || typeof mapping.deviceId !== 'string' || !mapping.axes) return false;
  const axes = Object.fromEntries(AXES.filter(name => Number.isInteger(mapping.axes[name]) && mapping.axes[name] >= 0)
    .map(name => [name, mapping.axes[name]]));
  if (!Object.keys(axes).length) return false;
  try { storage?.setItem(STORAGE_KEY, JSON.stringify({ deviceId: mapping.deviceId, axes })); return true; }
  catch { return false; }
}

// A lesson is complete when one axis moves clearly farther than the others.
export function findMovedAxis(before, after, threshold = .35) {
  let best = -1, amount = threshold;
  for (let i = 0; i < Math.min(before?.length || 0, after?.length || 0); i++) {
    const delta = Math.abs((after[i] || 0) - (before[i] || 0));
    if (delta > amount) { best = i; amount = delta; }
  }
  return best;
}

export function createMachineInputSetup({ root, navigator = globalThis.navigator, storage = globalThis.localStorage } = {}) {
  if (!root?.ownerDocument) throw new TypeError('A screen element is required.');
  const doc = root.ownerDocument;
  root.innerHTML = `<section class="machine-input-setup"><h2>Set up your controls</h2><p>Choose a control, then move it left and right.</p><div class="machine-input-lessons">${AXES.map(axis => `<button type="button" data-axis="${axis}">Learn ${axis}</button>`).join('')}</div><p class="machine-input-status" aria-live="polite">Keyboard controls always work.</p></section>`;
  const status = root.querySelector('.machine-input-status');
  const mapping = loadMachineInput(storage) || { deviceId: '', axes: {} };
  let timer = null;
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-axis]');
    if (!button) return;
    const axisName = button.dataset.axis;
    const pads = navigator?.getGamepads?.() || [];
    const pad = Array.from(pads).find(Boolean);
    if (!pad) { status.textContent = 'Connect a joystick, wheel or pedal device first.'; return; }
    const before = Array.from(pad.axes || []);
    status.textContent = 'Move the control left and right now.';
    clearInterval(timer);
    timer = setInterval(() => {
      const current = Array.from(navigator?.getGamepads?.() || []).find(p => p?.id === pad.id);
      if (!current) return;
      const index = findMovedAxis(before, current.axes);
      if (index < 0) return;
      clearInterval(timer); timer = null;
      mapping.deviceId = current.id;
      mapping.axes[axisName] = index;
      status.textContent = `${axisName} learned from ${current.id}, axis ${index + 1}.`;
      saveMachineInput(mapping, storage);
    }, 100);
  });
  return { dispose() { clearInterval(timer); root.replaceChildren(); } };
}

export const MACHINE_INPUT_STORAGE_KEY = STORAGE_KEY;
