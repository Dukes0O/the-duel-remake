import assert from 'node:assert/strict';
import test from 'node:test';

const modules = ['combat-weapons', 'combat-projectiles', 'combat-pickups', 'combat-ai', 'wasteland-tuning'];

for (const name of modules) {
  test(`${name} is an importable combat module`, async () => {
    const module = await import(`../src/${name}.js`);
    assert.ok(Object.keys(module).length > 0, `${name} must expose its combat behavior or tuning`);
  });
}
