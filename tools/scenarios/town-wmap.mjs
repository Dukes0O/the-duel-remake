const entry='/tools/menu-check.html?flags=wasteland-town';
async function picture(context,name){await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');await context.screenshot(name);}
export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(()=>{const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Map QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true,territories:{...app.profile.wasteland?.territories,sal:{claimed:true}}}};app._saveProfile();app.visitWasteland();app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'the new town form',30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Map QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town view',30_000);
  await context.evaluate(`(()=>{const canvas=document.querySelector('.town-entry>canvas');for(let i=0;i<55;i++)canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:120,cancelable:true,bubbles:true}));})()`);
  await context.waitFor(`!!document.querySelector('.town-wasteland-map')`,'the Wasteland map beyond the town zoom',15_000);
  await picture(context,'town-wmap');
  await context.evaluate(`document.querySelector('[data-town-region="sal"] > summary').click()`);
  await context.waitFor(`!!document.querySelector('[data-town-map-buy="sal-road"]')`,'the Pipe Road deed card',5_000);
  await context.evaluate(`document.querySelector('[data-town-map-buy="sal-road"]').click()`);
  await context.waitFor(`document.querySelector('.town-wasteland-map')?.textContent.includes('You bought The Pipe Road')`,'deed purchase and refreshed owner state',5_000);
  await context.evaluate(`document.querySelector('[data-town-map-close]').click()`);
  await context.waitFor(`!document.querySelector('.town-wasteland-map')`,'return to the town',5_000);
}
