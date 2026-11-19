const LABELS = Object.freeze({ swing: 'Swing', boom: 'Boom', arm: 'Arm', bucket: 'Bucket',
  forward: 'Drive forward', steer: 'Steer' });

export const DIG_MACHINE_HELP = 'Press Q to choose another machine. Press Tab to change between driving and working.';

export const DIG_MACHINE_CONTROLS = Object.freeze({
  excavator: {name: 'EXCAVATOR', words: 'A and D swing. W and S raise and lower the boom. I and K move the arm. J and L curl the bucket. Space digs. E empties the bucket.'},
  dumpTruck: {name: 'DUMP TRUCK', words: 'Drive with W, A, S and D. Press Tab, then hold Space to tip the load.'},
  trencher: {name: 'TRENCHER', words: 'Drive with W, A, S and D. Press Tab, then hold Space to lower the chain and cut a ditch while you drive.'},
  drill: {name: 'DRILL RIG', words: 'Drive with W, A, S and D. Press Tab to stand the mast up or lay it down. Hold Space to feed the drill. Add W for a harder feed. Hold S to reverse the bit.'},
  dozer: {name: 'DOZER', words: 'Drive with W, A, S and D. Hold Space while driving to work the ground. Press Q to choose another machine. Press C to change the view.'},
  roller: {name: 'ROAD ROLLER', words: 'Drive with W, A, S and D. Hold Space while driving to work the ground. Press Q to choose another machine. Press C to change the view.'},
  paver: {name: 'PAVER', words: 'Drive with W, A, S and D. Hold Space while driving to work the ground. Hold Shift to pave slowly and smoothly. Press Q to choose another machine. Press C to change the view.'},
  loader: {name: 'LOADER', words: 'Drive with W, A, S and D. Hold Space and drive into the gravel or sand pile to fill the bucket. Hold E at the batch plant bins to lift and tip it. Press Q to choose another machine. Press C to change the view.'},
  mixer: {name: 'MIXER TRUCK', words: 'Drive with W, A, S and D. Back under the batch plant, press Tab and hold Space to fill the drum. At a form, press Tab, swing the chute with A and D and hold Space to pour. Press Q to choose another machine. Press C to change the view.'},
  borer: {name: 'MABEL', words: 'Hold W to push the thrust lever forward and S to pull it back; keep the head turning, and hold S at zero to reverse. Use A and D to turn, the up and down arrows to change slope, Tab to change mode and C to change view.'},
});

export function digMachineControls(machine) {
  const {name, words} = DIG_MACHINE_CONTROLS[machine];
  return `<h2>${name} CONTROLS</h2><p>${words}</p>`;
}
// MACHINE-ROADS removes this restriction when its models are ready.
export function digMachineIds(town = false) {
  // The plant's machines come after Mabel, so the earlier machines keep their places in the list.
  return ['excavator', 'dumpTruck', 'trencher', 'drill', 'dozer', ...(town ? ['roller', 'paver'] : []), 'borer', ...(town ? ['loader', 'mixer'] : [])];
}

export function digMachineNames(town = false) {
  const names = {excavator:'excavator', dumpTruck:'dump truck', trencher:'trencher', drill:'drill rig',
    dozer:'dozer', roller:'road roller', paver:'paver', borer:'Mabel the boring machine', loader:'loader', mixer:'mixer truck'};
  const list = digMachineIds(town).map(id => names[id]);
  return `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
}

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
