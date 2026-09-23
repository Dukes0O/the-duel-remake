// Smoke uses the real menu and race UI on the QA-only menu entry. That entry
// replaces localStorage in memory before importing the game.
const entry = '/tools/menu-check.html';
const ready = `document.readyState === 'complete' &&
  !!document.querySelector('#stage.in-menu') &&
  !!document.querySelector('#view3d canvas') &&
  document.querySelector('#view3d').dataset.vehicleAsset === 'ready' &&
  !document.querySelector('#start-engine').disabled &&
  !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`;

async function runQuality(context, quality) {
  await context.navigate(`${entry}?harness=${quality}`);
  await context.waitFor(`location.search===\"?harness=${quality}\" && (${ready})`, `${quality} menu, renderer and memory storage`, 60_000);
  const menu = await context.evaluate(`(() => ({status:document.querySelector('#overlay').dataset.status,
    player:document.querySelector('#overlay').dataset.playerName,
    storageIsMemory:!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value,
    address:location.origin}))()`);
  if (menu.status !== 'menu' || !menu.storageIsMemory || menu.address !== context.baseURL) throw Error(`${quality}: QA menu isolation failed.`);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
    const qaPanel=[...document.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent.includes('TEMPORARY SAVES')); if(qaPanel)qaPanel.hidden=true;
    const performancePanel=[...document.querySelectorAll('details')].find(node=>node.querySelector('summary')?.textContent.startsWith('Performance samples')); if(performancePanel)performancePanel.hidden=true;
  })()`);
  await new Promise(done => setTimeout(done, 1200));
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} && !document.querySelector('#start-engine').disabled && document.querySelector('#view3d').dataset.vehicleAsset==='ready'`, `${quality} quality and vehicle ready`, 60_000);
  await context.screenshot(`menu-${quality}`);
  const clicked = await context.evaluate(`(() => {const button=document.querySelector('#start-engine');if(button.disabled)return false;button.click();return true;})()`);
  if (!clicked) throw Error(`${quality}: Start Engine was disabled.`);
  await context.waitFor(`document.querySelector('#stage.in-race') && !document.querySelector('#race-hud').hidden &&
    ['countdown','racing'].includes(document.querySelector('#overlay').dataset.status)`, `${quality} race start`, 20_000);
  await context.waitFor(`document.querySelector('#overlay').dataset.status==='racing' &&
    document.querySelector('#countdown').hidden && document.querySelector('#view3d canvas') &&
    document.querySelector('#renderer-error').hidden`, `${quality} active race`, 20_000);
  await context.command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  await new Promise(done => setTimeout(done, 1200));
  await context.command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
  const race = await context.evaluate(`(() => ({status:document.querySelector('#overlay').dataset.status,
    quality:document.querySelector('#graphics-quality').value,
    hudVisible:!document.querySelector('#race-hud').hidden,
    speed:document.querySelector('#speed-value').textContent,
    rendererError:!document.querySelector('#renderer-error').hidden}))()`);
  if (race.status !== 'racing' || race.quality !== quality || !race.hudVisible || race.rendererError) throw Error(`${quality}: race state or renderer failed: ${JSON.stringify(race)}`);
  await context.screenshot(`race-${quality}`);
  console.log(`${quality}: menu ready, race active, speed ${race.speed} km/h`);
}

export async function run(context) {
  for (const quality of ['high', 'performance']) await runQuality(context, quality);
}