import assert from 'node:assert/strict';
import { Duel } from '../src/game.js';

const duel = new Duel({ seed: 1989 }); duel.startCampaign();
const cut = duel.course.features.shortcuts[0];
let distance = cut.start, offset = 0;
for (let s = cut.start; s < cut.end; s += 4) {
  const candidate = duel.course.shortcutOffset(cut, s);
  if (Math.abs(candidate) > Math.abs(offset)) { distance = s; offset = candidate; }
}
const police = duel.state.police.pursuit = { kind: 'police', active: true, routeId: cut.id,
  s: distance, prevS: distance, lateral: offset + Math.sign(offset) * 50, speedMph: 100, headingError: 0 };
duel._boundary(police);
assert.ok(Math.abs(police.lateral) < 7 && police.speedMph <= 28, 'a police boundary recovery returns to a safe main-road lane');
assert.equal(police.routeId, null, 'a recovered police car must forget its stale branch route');
for (let frame = 0; frame < 240; frame++) duel._movePolice(police, 1 / 120);
assert.ok(Math.abs(police.lateral) < 7 && !police.routeId, 'the cruiser stays on the main road instead of aiming across a hundred-metre branch gap');
console.log('Police route reset: 3 checks passed.');
