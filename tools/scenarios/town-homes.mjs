const entry='/tools/menu-check.html?flags=wasteland-town';

async function picture(context,name){
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  await context.screenshot(name);
}
async function drag(context,from,to){
  await context.command('Input.dispatchMouseEvent',{type:'mouseMoved',x:from.x,y:from.y});
  await context.command('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',buttons:1,clickCount:1,x:from.x,y:from.y});
  await context.command('Input.dispatchMouseEvent',{type:'mouseMoved',button:'left',buttons:1,x:to.x,y:to.y});
  await context.command('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,x:to.x,y:to.y});
}

export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Home Plot QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'Hollis note',30_000);
  await context.evaluate(`document.querySelector('#town-name').value='Home Plot QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the new town',30_000);
  await context.evaluate(`document.querySelector('[data-town-tab="homes"]').click()`);
  await context.waitFor(`!!document.querySelector('[data-town-home-tool="paint"]')`,'the plot paint tool in Homes and Shops',10_000);
  await context.evaluate(`document.querySelector('[data-town-home-tool="paint"]').click()`);
  const points=await context.evaluate(`(() => {const host=document.querySelector('.town-entry'),canvas=host.querySelector(':scope>canvas'),r=canvas.getBoundingClientRect();return {from:{x:r.left+r.width*.43,y:r.top+r.height*.52},to:{x:r.left+r.width*.47,y:r.top+r.height*.52}};})()`);
  if(!points.from||!points.to)throw new Error('The town map is not ready for a plot drag.');
  await drag(context,points.from,points.to);
  await context.waitFor(`document.querySelector('.town-entry')?.__town?.homePlots?.length>0`,'painted home plots',15_000);
  const painted=await context.evaluate(`(() => {const town=document.querySelector('.town-entry').__town;return {plots:town.homePlots.map(({id,x,z,tier})=>({id,x,z,tier})),message:document.querySelector('.town-command-message')?.textContent};})()`);
  if(!painted.plots.length)throw new Error('The drag did not paint a home plot.');
  await picture(context,'town-home-pegs');
  await context.evaluate(`(() => {const host=document.querySelector('.town-entry');host.__townCommand({type:'deliverTownGoods',cell:{x:0,z:0},goods:{canvas:100,food:100000}});document.querySelector('[data-town-speed="4"]').click();})()`);
  await context.waitFor(`document.querySelector('.town-entry')?.__town?.homePlots?.some(plot=>plot.tier>=1)`,'a completed tent',90_000);
  await picture(context,'town-home-finished');
  const homes=await context.evaluate(`(() => {const town=document.querySelector('.town-entry').__town;return town.homePlots.filter(plot=>plot.tier>=1).length;})()`);
  if(!homes)throw new Error('The painted plot did not build a home from stored canvas.');
}
