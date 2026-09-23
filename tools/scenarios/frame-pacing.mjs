// Compare delivered frame intervals on the real HUD, mirror, and QA autopilot.
// The QA page installs disposable in-memory saves before the App loads.
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const entry = '/tools/menu-check.html';

async function measure(context, quality) {
  await context.navigate(`${entry}?frame-pacing=${quality}`);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, `${quality} isolated menu`, 60_000);
  await context.evaluate(`(() => {
    const select=document.querySelector('#graphics-quality');
    select.value=${JSON.stringify(quality)};
    select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await context.waitFor(`document.querySelector('#graphics-quality')?.value===${JSON.stringify(quality)} &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !document.querySelector('#start-engine')?.disabled`, `${quality} renderer ready`, 60_000);
  await context.evaluate(`(() => {
    const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='Start driving performance sample');
    if(!button)throw Error('Missing performance drive control');
    button.click();
  })()`);
  await context.waitFor(`window.__qaApp?.running && window.__qaApp?.duel?.state?.status==='racing' &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, `${quality} driving`, 30_000);
  await new Promise(done=>setTimeout(done,1200));
  await context.evaluate(`(() => {
    const button=[...document.querySelectorAll('button')].find(node=>node.textContent==='Measure frame pacing');
    if(!button)throw Error('Missing frame measurement control');
    button.click();
  })()`);
  await context.waitFor(`document.querySelector('#performance-results')?.textContent?.includes('"frames": 120')`,
    `${quality} 120 measured frames`, 35_000);
  const report = await context.evaluate(`JSON.parse(document.querySelector('#performance-results').textContent).at(-1)`);
  if(report.quality!== (quality==='high'?'High':'Performance') || report.frames!==120 ||
     !Number.isFinite(report.p95) || report.p95<=0 || report.over33ms<0)
    throw Error(`${quality}: invalid frame measurement: ${JSON.stringify(report)}`);
  await context.screenshot(`frame-${quality}`);
  console.log(`${quality}: p50 ${report.p50} ms, p95 ${report.p95} ms, >33ms ${report.over33ms}`);
  return report;
}

export async function run(context) {
  const reports=[];
  for(const quality of ['high','performance'])reports.push(await measure(context,quality));
  await writeFile(join(context.outputDir,'frame-pacing.json'),JSON.stringify({reports},null,2)+'\n');
}
