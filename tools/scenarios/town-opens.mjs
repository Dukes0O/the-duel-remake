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
function line(start,end){
  const cells=[],dx=Math.abs(end.x-start.x),sx=start.x<end.x?1:-1,dz=-Math.abs(end.z-start.z),sz=start.z<end.z?1:-1;let error=dx+dz,x=start.x,z=start.z;
  for(;;){cells.push({x,z});if(x===end.x&&z===end.z)break;const twice=2*error;if(twice>=dz){error+=dz;x+=sx;}if(twice<=dx){error+=dx;z+=sz;}}
  return cells;
}

export async function run(context){
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete'&&!!window.__qaApp`,'the QA game',90_000);
  await context.waitFor(`window.__qaApp.visualReady===true`,'the yard renderer',60_000);
  await context.evaluate(`(() => {const app=window.__qaApp;app.audio.setMuted?.(true);app.addPlayer('Town QA');app.profile={...app.profile,wasteland:{...app.profile.wasteland,discoveredGate:true}};app._saveProfile();if(!app.visitWasteland())throw Error('Could not enter the Wasteland.');app.advance(8);})()`);
  await context.waitFor(`!!document.querySelector('[data-action="yard-the-town"]')`,'the yard',30_000);
  await picture(context,'town-yard');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-onboard form')`,'Hollis note',30_000);
  await picture(context,'town-note');
  await context.evaluate(`document.querySelector('#town-name').value='Town QA';document.querySelector('.town-onboard form button').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'the town view',30_000);
  await picture(context,'town-first-visit');
  await context.evaluate(`document.querySelector('[data-town-build="road-dirt"]')?.click()`);
  const points=await context.evaluate(`(() => {const canvas=document.querySelector('.town-entry>canvas'),r=canvas.getBoundingClientRect();return {from:{x:r.left+r.width*.43,y:r.top+r.height*.53},to:{x:r.left+r.width*.57,y:r.top+r.height*.53}};})()`);
  const cells=await context.evaluate(`(() => {const h=document.querySelector('.town-entry'),r=h.querySelector(':scope>canvas').getBoundingClientRect();return {from:h.__townPickGround(r.left+r.width*.43,r.top+r.height*.53),to:h.__townPickGround(r.left+r.width*.57,r.top+r.height*.53)};})()`);
  if(!cells.from||!cells.to)throw new Error('The map points did not hit the town ground.');
  const expected=line(cells.from,cells.to);
  await drag(context,points.from,points.to);
  await context.evaluate('new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done(true))))');
  const placed=await context.evaluate(`(() => {const town=document.querySelector('.town-entry').__town;return {cells:town.buildings.filter(row=>row.buildingId==='road-dirt').map(({x,z})=>({x,z})),next:document.querySelector('.town-next span').textContent};})()`);
  for(const cell of expected)if(!placed.cells.some(row=>row.x===cell.x&&row.z===cell.z))throw new Error(`The road is missing expected cell ${cell.x}, ${cell.z}.`);
  if(placed.next!=='Road laid.')throw new Error(`The road message was not plain and clear: ${placed.next}`);
  await picture(context,'town-road');
  await context.evaluate(`(() => {const t=document.querySelector('.town-entry').__town;window.__townRoadExpected={id:t.id,cells:${JSON.stringify(expected)}};document.querySelector('[data-town-action="yard"]').click();})()`);
  await context.waitFor(`!document.querySelector('.town-entry')`,'return to yard',30_000);
  await picture(context,'town-left');
  await context.evaluate(`document.querySelector('[data-action="yard-the-town"]').click()`);
  await context.waitFor(`!!document.querySelector('.town-screen')`,'return to town',30_000);
  const returned=await context.evaluate(`(() => {const town=document.querySelector('.town-entry').__town,expected=window.__townRoadExpected;return {sameTown:town.id===expected.id,cells:town.buildings.filter(row=>row.buildingId==='road-dirt').map(({x,z})=>({x,z})),expected:expected.cells};})()`);
  if(!returned.sameTown)throw new Error('Returning opened a different town.');
  for(const cell of returned.expected)if(!returned.cells.some(row=>row.x===cell.x&&row.z===cell.z))throw new Error(`The saved town lost road cell ${cell.x}, ${cell.z}.`);
  await picture(context,'town-return');
}
