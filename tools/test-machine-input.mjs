import assert from 'node:assert/strict';
import { INPUT_CONTEXTS, keyboardAction, machineControlInput } from '../src/input-contexts.js';
import { findMovedAxis, loadMachineInput, saveMachineInput, MACHINE_INPUT_STORAGE_KEY } from '../src/input-setup.js';
import { machineControlsView } from '../src/machines/controls-view.js';

assert.ok(INPUT_CONTEXTS.machine);
assert.equal(keyboardAction('machine', 'Tab'), 'machine-mode-toggle');
assert.equal(keyboardAction('car', 'Tab'), null, 'machine mode key is isolated from cars');
assert.deepEqual(machineControlInput({ KeyA: true, KeyW: true, KeyI: true, KeyJ: true }, null, 'work'),
  { swing: -1, boom: 1, arm: -1, bucket: -1 });
assert.deepEqual(machineControlInput({ KeyW: true, KeyD: true }, null, 'drive'), { forward: 1, steer: 1 });

// Four-axis stick: X, Y, twist and slider are deliberately not assumed to be
// adjacent conventional gamepad axes.
const stick = { axes: [.1, -.2, .8, -.75] };
const stickMap = { axes: { swing: 2, boom: 1, arm: 0, bucket: 3 } };
assert.deepEqual(machineControlInput({}, stick, 'work', stickMap), { swing: .8, boom: -.2, arm: 0, bucket: -.75 });
assert.equal(findMovedAxis([0, 0, 0, 0], [0, .02, -.1, .72]), 3, 'slider movement can be learned');
assert.equal(findMovedAxis([0, 0], [.1, -.2]), -1, 'noise does not count as deliberate movement');

// A wheel and separate pedals can occupy unrelated axes too.
const wheel = { axes: [.04, .9, -.8] };
assert.deepEqual(machineControlInput({}, wheel, 'drive', { drive: { steer: 0, forward: 2 } }),
  { forward: .8, steer: 0 });

const values = new Map();
const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
assert.equal(saveMachineInput({ deviceId: '4-axis stick', axes: stickMap.axes }, storage), true);
assert.deepEqual(loadMachineInput(storage), { deviceId: '4-axis stick', axes: stickMap.axes });
assert.equal(values.has(MACHINE_INPUT_STORAGE_KEY), true);
assert.equal(saveMachineInput({ deviceId: 'bad', axes: { swing: -1 } }, storage), false);

const workView = machineControlsView({ mode: 'work', active: 'bucket' });
assert.match(workView, /WORK MODE/);
assert.match(workView, /data-control="bucket"/);
assert.match(workView, /machine-control-lit/);
assert.match(machineControlsView({ mode: 'drive' }), /DRIVE MODE/);

console.log('Machine input: isolated keyboard context, learned arbitrary axes, browser mapping storage, wheel pedals and control view passed.');
