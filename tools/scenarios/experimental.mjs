// The QA menu entry installs memory-only storage before the game loads.
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=photo');
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
    empty: document.querySelector('.experimental-list').textContent.includes('No early features are available yet'),
    storageIsMemory: !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value
  }))()`);
  if (before.checked || !before.empty || !before.storageIsMemory) throw Error('Experimental panel did not start safely off.');
  await context.evaluate(`document.querySelector('#experimental-toggle').click()`);
  await context.waitFor(`document.querySelector('#experimental-toggle')?.checked &&
    document.querySelector('#experimental-open')?.textContent.includes('ON')`, 'Experimental choice');
  await context.screenshot('experimental-on');
  await context.evaluate(`document.querySelector('#experimental-toggle').click()`);
  await context.waitFor(`!document.querySelector('#experimental-toggle')?.checked &&
    !document.querySelector('#experimental-open')?.textContent.includes('ON')`, 'Experimental choice off');
  await context.evaluate(`document.querySelector('[data-action="experimental-close"]').click()`);
  await context.waitFor(`document.querySelector('#modal-layer').hidden`, 'Experimental panel close');
}
