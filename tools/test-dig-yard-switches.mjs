import assert from 'node:assert/strict';
import {yardHomeScreen} from '../src/screen-yard-home.js';

const home = (dig, town) => yardHomeScreen({
  profile: {wasteland: {}}, playerName: 'Test', escapeHTML: String,
  featureFlags: {enabled: name => name === 'the-dig' ? dig : name === 'wasteland-town' ? town : false},
});
for (const [dig, town] of [[false, false], [true, false], [false, true], [true, true]]) {
  const html = home(dig, town);
  assert.equal(html.includes('data-action="yard-the-dig"'), dig);
  assert.equal(html.includes('data-action="yard-the-town"'), town);
}
console.log('Dig and town yard switches passed.');
