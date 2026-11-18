// For Claude to run. Use the normal Story Wall with a temporary QA player.
import {beginLedger, recordLedgerChoice} from '../../src/story/ledger-save.js';

const initial = beginLedger({}, {seed: 1234, night: 2, embers: 4, gas: 20}).profile;
const example = recordLedgerChoice(initial, 2, {
  id: 'night-2/watch', effects: [
    {type: 'stock', stock: 'embers', by: -1},
    {type: 'word', person: 'walkers', by: 1},
    {type: 'roadWord', by: 1},
    {type: 'debt', id: 'gate-watch', person: 'walkers', text: "The Walkers owe you two nights’ watch."},
    {type: 'met', person: 'rell', text: 'Dace! You’re on the fence tonight.'},
  ],
}).profile.story.ledger;

export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=hidden-road,warlord-cards,story-choices');
  const menu = 'window.__qaApp?.duel.state.status === "menu"';
  await context.waitFor(menu, 'the menu with memory-only storage', 90000);
  await context.evaluate(`(() => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is required.');
    const app = window.__qaApp;
    app.addPlayer('Story Ledger QA');
    app.profile = {...app.profile, wasteland: {...app.profile.wasteland, discoveredGate: true},
      story: {...app.profile.story, version: 1, ledger: ${JSON.stringify(example)}}};
    app._saveProfile();
  })()`);
  await context.reload();
  await context.waitFor(menu, 'the restored test player', 90000);
  const click = async action => {
    const selector = JSON.stringify('[data-action="' + action + '"]');
    await context.waitFor('document.querySelector(' + selector + ')', action, 30000);
    await context.evaluate('document.querySelector(' + selector + ').click()');
  };
  await click('wasteland-visit');
  await click('yard-cards');
  await click('yard-ledger');
  await context.waitFor('document.querySelector(".story-ledger")', 'What people remember', 30000);
  await context.evaluate(`(() => {
    const words = document.querySelector('.story-ledger').innerText;
    for (const text of ['Enough for 3 nights', 'two nights’ watch', 'Rell', 'on the fence tonight'])
      if (!words.includes(text)) throw Error('Missing: ' + text);
    if (/Friendly|Watching|Word on the road|night-2\\/watch/.test(words)) throw Error('A hidden fact reached the wall.');
  })()`);
  await context.screenshot('story-ledger');
}
