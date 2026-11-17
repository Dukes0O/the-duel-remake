import assert from 'node:assert/strict';
import {yardThingsToTry} from '../src/yard-things-to-try.js';
import {createDigSandbox, switchDigMachine} from '../src/machines/dig-sandbox.js';
import {yardHomeScreen} from '../src/screen-yard-home.js';
import {DIG_MACHINE_HELP, digMachineNames} from '../src/machines/controls-view.js';

const home = (dig, town) => yardHomeScreen({
  profile: {wasteland: {}}, playerName: 'Test', escapeHTML: String,
  featureFlags: {enabled: name => name === 'the-dig' ? dig : name === 'wasteland-town' ? town : false},
});
for (const [dig, town] of [[false, false], [true, false], [false, true], [true, true]]) {
  const html = home(dig, town);
  assert.equal(html.includes('data-action="yard-the-dig"'), dig);
  assert.equal(html.includes('data-action="yard-the-town"'), town);
  assert.equal(html.includes(DIG_MACHINE_HELP), dig);
  assert.equal(html.includes(digMachineNames(town)), dig);
  assert.equal(html.includes('FLAMETHROWER'), false);
  if (dig) assert.equal(html.includes('road roller'), town);
}
for (const town of [false, true]) {
  let sim = createDigSandbox({town});
  const seen = [sim.activeMachine];
  do { sim = switchDigMachine(sim); seen.push(sim.activeMachine); } while (sim.activeMachine !== 'excavator');
  assert.equal(seen.includes('roller'), town);
  assert.equal(seen.includes('paver'), town);
  assert.ok(seen.includes('dozer'));
}
const rows = yardThingsToTry({wasteland:{xp:0}}, String, {dig:true, gear:true});
assert.ok(rows.indexOf('THE DIG') < rows.indexOf('GETTING OUT'));
assert.ok(rows.indexOf('GETTING OUT') < rows.indexOf('FLAMETHROWER'));
console.log('Dig and town yard switches passed.');
