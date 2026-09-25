// The QA menu entry installs memory-only storage before the game loads.
export async function run(context) {
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`document.querySelector('#stage.in-menu') &&
    document.querySelector('#experimental-open') &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`, 'isolated Experimental menu');
  await context.waitFor(`[...document.querySelectorAll('details summary')].some(node =>
    node.textContent.includes('TEMPORARY SAVES'))`, 'QA controls mounted');
  await context.evaluate(`for(const panel of document.querySelectorAll('details')){
    const title=panel.querySelector('summary')?.textContent||'';
    if(title.includes('TEMPORARY SAVES')||title.startsWith('Performance samples'))panel.style.display='none';
  }`);
  await context.evaluate(`document.querySelector('#experimental-open').click()`);
  await context.waitFor(`document.querySelector('#experimental-title') &&
    document.querySelector('#experimental-toggle')`, 'Experimental panel');
  const before = await context.evaluate(`(() => ({
    checked: document.querySelector('#experimental-toggle').checked,
    roadsideListed: document.querySelector('.experimental-list').textContent.includes('ROADSIDE DESTRUCTION'),
    wastelandListed: document.querySelector('.experimental-list').textContent.includes('WASTELAND2'),
    roadListed: document.querySelector('.experimental-list').textContent.includes('HIDDEN ROAD'),
    wastelandOff: !window.__qaApp.duel.featureFlags.enabled('wasteland2'),
    roadOff: !window.__qaApp.duel.featureFlags.enabled('hidden-road'),
    roadsideEnabled: window.__qaApp.duel.destructionEnabled(),
    roadsideSwitchAbsent: !window.__qaApp.duel.featureFlags.enabled('roadside-destruction'),
    careerHidden: !document.querySelector('.experimental-list').textContent.includes('CAREER BACKUP'),
    storageIsMemory: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value &&
      window.name.startsWith('__duel_qa_tab_v2:')
  }))()`);
  if (before.checked || before.roadsideListed || !before.wastelandListed || !before.roadListed ||
      !before.wastelandOff || !before.roadOff || !before.roadsideEnabled ||
      !before.roadsideSwitchAbsent || !before.careerHidden || !before.storageIsMemory)
    throw Error('Experimental default or beta catalog did not match the private production menu.');
  await context.evaluate(`document.querySelector('#experimental-toggle').click()`);
  await context.waitFor(`document.querySelector('#experimental-toggle')?.checked &&
    document.querySelector('#experimental-open')?.textContent.includes('ON') &&
    window.__qaApp.duel.featureFlags.enabled('wasteland2') &&
    window.__qaApp.duel.featureFlags.enabled('hidden-road') &&
    !window.__qaApp.duel.featureFlags.enabled('career-backup')`, 'Experimental beta opt-in');
  await context.screenshot('experimental-on');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`window.__qaApp?.duel.featureFlags.experimental() &&
    window.__qaApp.duel.featureFlags.enabled('wasteland2') &&
    window.__qaApp.duel.featureFlags.enabled('hidden-road') &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value &&
    window.name.startsWith('__duel_qa_tab_v2:')`, 'Experimental opt-in survives private reload');
  await context.evaluate(`document.querySelector('#experimental-open').click()`);
  await context.waitFor(`document.querySelector('#experimental-toggle')?.checked`, 'reopened Experimental choice');
  await context.evaluate(`document.querySelector('#experimental-toggle').click()`);
  await context.waitFor(`!document.querySelector('#experimental-toggle')?.checked &&
    !document.querySelector('#experimental-open')?.textContent.includes('ON') &&
    !window.__qaApp.duel.featureFlags.enabled('wasteland2') &&
    !window.__qaApp.duel.featureFlags.enabled('hidden-road')`, 'Experimental beta opt-out');
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`!window.__qaApp?.duel.featureFlags.experimental() &&
    !window.__qaApp.duel.featureFlags.enabled('wasteland2') &&
    !window.__qaApp.duel.featureFlags.enabled('hidden-road') &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'Experimental opt-out survives private reload');
  const releasedAfterToggle = await context.evaluate(`window.__qaApp.duel.destructionEnabled()`);
  if (!releasedAfterToggle) throw Error('Turning off Experimental disabled released roadside destruction.');
  await context.waitFor(`document.querySelector('#modal-layer').hidden`, 'Experimental panel close');
}
