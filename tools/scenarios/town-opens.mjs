const entry='/tools/menu-check.html?flags=wasteland-town';
export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Town QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await context.screenshot('town-yard');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'Hollis note',30_000);
  await context.screenshot('town-note');
  await context.evaluate(`document.querySelector('#town-name').value='Town QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town view',30_000);
  await new Promise(resolve=>setTimeout(resolve,1200));await context.screenshot('town-first-visit');
  await context.evaluate(`document.querySelector('[data-town-build="road-dirt"]')?.click()`);
  await context.evaluate(`(() => {const c=document.querySelector('.town-entry>canvas'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,clientX:r.left+r.width*.55,clientY:r.top+r.height*.55}));})()`);
  await new Promise(resolve=>setTimeout(resolve,300));await context.screenshot('town-road');
  await context.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,code:'Escape'}))`);
  await context.waitFor(`!document.querySelector('.town-entry')`,'return to yard',30_000);
  await context.screenshot('town-left');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'return to town',30_000);
  await new Promise(resolve=>setTimeout(resolve,500));await context.screenshot('town-return');
}
