// NIGHT-2-AND-TRUCK-POLISH: the fixes the Director asked for after the overnight QA of 19 November 2026.
// Each section names the fix. A section fails on the code before its fix and passes after it.
import assert from 'node:assert/strict';
import {applyChoice, createLedger} from '../src/story/ledger.js';
import {NIGHT_2_CHOICES} from '../src/story/scenes/night-2.js';
import {night2Page} from '../src/world/jobs/night-2.js';
import {ledgerPageMarkup} from '../src/story/ledger-ui.js';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const escapeHTML = text => String(text).replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

// 1. The journal opened from the pause card, in the middle of the night, marks what changed tonight.
{
  const start = createLedger({seed: 1, night: 2, embers: 4});
  const {ledger} = applyChoice(start, NIGHT_2_CHOICES.find(choice => choice.id === 'watch'));
  const live = night2Page(ledger, {inNight: true});
  check(live.tonight?.obligations === true, 'the live page says a debt was made tonight');
  const html = ledgerPageMarkup(live, escapeHTML);
  check(html.includes('class="ledger-tonight"'), 'the pause-card journal carries the tonight highlight');
  check(night2Page(ledger).tonight === null, 'the Story Wall page, asked without the live flag, is unchanged until the night is over');
}

console.log(`PASS test-night-2-polish: ${checks} checks.`);
