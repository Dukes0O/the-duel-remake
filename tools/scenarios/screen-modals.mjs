// Narrow viewport regression for the screen split. The QA entry uses
// temporary page memory, so no player career is opened or changed.
export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {
    width: 640, height: 900, deviceScaleFactor: 1, mobile: true,
  });
  await context.navigate('/tools/menu-check.html');
  await context.waitFor(`document.querySelector('#stage.in-menu') &&
    document.querySelector('#view3d')?.dataset.vehicleAsset === 'ready' &&
    !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value`, 'isolated narrow menu', 60_000);
  await context.waitFor(`[...document.querySelectorAll('details summary')].some(node =>
    node.textContent.includes('TEMPORARY SAVES'))`, 'QA controls mounted');
  await context.evaluate(`for (const panel of document.querySelectorAll('details')) {
    const title = panel.querySelector('summary')?.textContent || '';
    if (title.includes('TEMPORARY SAVES') || title.startsWith('Performance samples')) panel.remove();
  }`);
  for (const [name, opener] of [
    ['garage', '#garage-open'],
    ['armory', '#armory-open'],
    ['courses', '[data-action="courses"]'],
    ['players', '[data-action="new-player"]'],
    ['leaderboard', '[data-action="leaderboard"]'],
  ]) {
    const opened = await context.evaluate(`(() => {
      const button = document.querySelector(${JSON.stringify(opener)});
      if (!button || button.disabled) return false;
      button.click();
      return true;
    })()`);
    if (!opened) throw Error(`${name}: opener missing or disabled`);
    await context.waitFor(`!document.querySelector('#modal-layer')?.hidden &&
      !!document.querySelector('#modal-layer [role="dialog"]')`, `${name} dialog`);
    const layout = await context.evaluate(`(() => {
      const layer = document.querySelector('#modal-layer');
      const close = layer.querySelector('.shop-close');
      const rect = close?.getBoundingClientRect();
      return { width: innerWidth, height: innerHeight,
        focusInside: layer.contains(document.activeElement),
        closeVisible: !!rect && rect.left >= -2 && rect.right <= innerWidth + 2 &&
          rect.top >= -2 && rect.bottom <= innerHeight + 2 };
    })()`);
    if (layout.width !== 640 || layout.height !== 900 || !layout.focusInside || !layout.closeVisible)
      throw Error(`${name}: narrow dialog layout or keyboard focus failed: ${JSON.stringify(layout)}`);
    if (name === 'garage') await context.screenshot(`narrow-${name}`);
    await context.command('Input.dispatchKeyEvent', {
      type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
    await context.command('Input.dispatchKeyEvent', {
      type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27,
    });
    await context.waitFor(`document.querySelector('#modal-layer')?.hidden`, `${name} Escape close`);
  }
  console.log('Six narrow dialogs kept their close controls and keyboard focus visible.');
}
