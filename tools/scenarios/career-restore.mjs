// The one-time restore of Spikey Ferns and Dukes00 on a memory-only career (CAREER-REBUILD).
// Chrome uses a disposable profile, so no real save is touched.
const NAMES = "[...document.querySelectorAll('#player-select option')].map(option=>option.textContent)";
export async function run(context) {
  await context.navigate('/tools/menu-check.html?memory-backups=1&restore-career=1');
  await context.waitFor("document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated career menu');
  await context.waitFor("document.querySelector('#career-restored')?.textContent==='Spikey Ferns and Dukes00 are back.'", 'restore notice');
  const names = await context.evaluate(NAMES);
  if (JSON.stringify(names) !== JSON.stringify(['Dukes00', 'Spikey Ferns'])) throw Error('Player list was ' + JSON.stringify(names));
  const active = await context.evaluate("document.querySelector('#player-select').selectedOptions[0].textContent");
  if (active !== 'Spikey Ferns') throw Error('Active player was ' + active);
  await context.evaluate("document.querySelector('#career-restored').remove()");
  // For the picture only: hide the QA panels and open the player list so the names show.
  await context.evaluate("for(const panel of document.querySelectorAll('details'))panel.style.display='none'");
  await context.evaluate("document.querySelector('#player-select').size=2");
  await context.screenshot('career-restore-players');
  await context.evaluate("document.querySelector('#player-select').size=1");
  await context.evaluate("document.querySelector('[data-action=garage]').click()");
  await context.waitFor("document.querySelector('.garage-panel')", "Spikey Ferns' garage");
  await context.screenshot('career-restore-garage');
  // A real reload: the marker keeps the restore from running again.
  await context.reloadAfterAction('location.reload()');
  await context.waitFor("document.querySelector('#stage.in-menu') && document.querySelector('#player-select')", 'menu after reload');
  const again = await context.evaluate(NAMES);
  if (JSON.stringify(again) !== JSON.stringify(names)) throw Error('Reload changed the players: ' + JSON.stringify(again));
  if (await context.evaluate("!!document.querySelector('#career-restored')")) throw Error('The restore ran a second time.');
}
