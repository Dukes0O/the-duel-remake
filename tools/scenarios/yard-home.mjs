// Click the production yard UI in a private browser tab with memory-only saves.
import {CARS} from '../../src/config.js';

const CAR_KEYS=Object.keys(CARS);

async function framedCar(context,car,viewport){
  const size=viewport==='portrait'?{width:390,height:844}:{width:1280,height:800};
  await context.waitFor(`(() => {const canvas=document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]'),rect=canvas?.getBoundingClientRect();return window.__qaApp.visualReady===true && canvas?.parentElement?.dataset?.vehicleAsset==='ready' && Math.abs(rect?.width-${size.width})<1 && Math.abs(rect?.height-${size.height})<1 && Math.abs(window.__render.camera.aspect-rect.width/rect.height)<.001;})()`,`${car} ${viewport} asset and camera`,60000);
  const result=await context.evaluate(`(() => {
    const app=window.__qaApp, view=window.__render, camera=view.camera;
    view.renderFrame();camera.updateWorldMatrix(true,false);camera.updateProjectionMatrix();
    const players=view.scene.children.filter(node=>node.userData?.vehicleKey===${JSON.stringify(car)});
    const expected=app.duel.course.worldAt(app.duel.state.s,app.duel.state.lateral);
    const distance=node=>Math.hypot(node.position.x-expected.x,node.position.z-expected.z);
    players.sort((a,b)=>distance(a)-distance(b));
    const vehicle=players[0],panel=document.querySelector('.yard-home-panel');
    if(!vehicle||!vehicle.visible||!panel) return {error:'Player vehicle or yard panel missing',players:players.length,
      playerVisible:vehicle?.visible,phase:app.duel.state.hiddenRoadJourney?.phase,
      status:app.duel.state.status,active:app.isYardHomeActive(),modal:document.querySelector('#modal-layer')?.textContent?.slice(0,150)};
    const canvas=document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    const rect=canvas.getBoundingClientRect();vehicle.updateWorldMatrix(true,true);
    const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
    let vertexCount=0,front=true,clip=true;
    vehicle.traverseVisible(node=>{
      if(!node.isMesh||!node.geometry)return;
      const positions=node.geometry.attributes.position;
      for(let index=0;index<positions.count;index++){
        const world=camera.position.clone().set(positions.getX(index),positions.getY(index),positions.getZ(index)).applyMatrix4(node.matrixWorld);
        const eye=world.clone().applyMatrix4(camera.matrixWorldInverse);
        const ndc=world.project(camera);
        const x=rect.left+(ndc.x+1)*rect.width/2,y=rect.top+(1-ndc.y)*rect.height/2;
        bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);
        bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);
        front=front&&eye.z<0;clip=clip&&ndc.z>=-1&&ndc.z<=1;vertexCount++;
      }
    });
    const cover=panel.getBoundingClientRect();
    const overlapWidth=Math.max(0,Math.min(bounds.right,cover.right)-Math.max(bounds.left,cover.left));
    const overlapHeight=Math.max(0,Math.min(bounds.bottom,cover.bottom)-Math.max(bounds.top,cover.top));
    const uncovered=(bounds.right-bounds.left)*(bounds.bottom-bounds.top)-overlapWidth*overlapHeight;
    return {car:app.duel.state.car,status:app.duel.state.status,phase:app.duel.state.hiddenRoadJourney?.phase,
      active:app.isYardHomeActive(),asset:document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]')?.parentElement?.dataset?.vehicleAsset,
      bounds,viewport:{left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,
        width:innerWidth,height:innerHeight},playerDistance:distance(vehicle),
      peerDistance:players[1]?distance(players[1]):null,front:vertexCount>0&&front,
      clip,vertexCount,uncovered,panelOverlap:overlapWidth*overlapHeight,
      panel:{right:cover.right,bottom:cover.bottom}};
  })()`);
  const b=result.bounds,v=result.viewport;
  await context.screenshot(`yard-${car.replaceAll('_','-')}-${viewport}`);
  if(result.error||result.car!==car||result.status!=='exploring'||result.phase!=='arrived'||!result.active||
    result.asset!=='ready'||!result.front||!result.clip||!b||
    result.playerDistance>.5||result.peerDistance!==null&&result.peerDistance<result.playerDistance+.5||
    Math.abs(v.left)>1||Math.abs(v.top)>1||Math.abs(v.right-v.width)>1||Math.abs(v.bottom-v.height)>1||
    b.left<v.left||b.right>v.right||b.top<v.top||b.bottom>v.bottom||
    result.uncovered<1000||result.panelOverlap>1)
    throw Error(`${car} ${viewport} not framed in yard: ${JSON.stringify(result)}`);
  return result;
}

export async function run(context) {
  if(CAR_KEYS.length!==9)throw Error(`Expected nine production cars; found ${CAR_KEYS.length}`);
  await context.navigate('/tools/menu-check.html?flags=hidden-road,wasteland2');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated yard menu', 60000);
  await context.waitFor('window.__qaApp.visualReady === true', 'renderer ready for arrival', 60000);
  await context.waitFor("[...document.querySelectorAll('details')].some(panel => panel.querySelector('summary')?.textContent.includes('MENU QA'))", 'QA controls');
  await context.evaluate("document.querySelectorAll('details').forEach(panel => {if(panel.querySelector('summary')?.textContent.includes('MENU QA'))panel.style.display='none';})");
  const before=await context.evaluate(`(() => {
    const app=window.__qaApp;app.stop();
    app.addPlayer('Yard QA');
    app.profile={...app.profile,credits:700,unlockedCars:[...Object.keys(app.profile.upgrades),...${JSON.stringify(CAR_KEYS)}],wasteland:{...app.profile.wasteland,
      discoveredGate:true,scrap:3000,xp:2000}};
    if(!app._saveProfile())throw Error('memory-only setup save failed');
    const before={credits:app.profile.credits,scrap:app.profile.wasteland.scrap,
      history:app.profile.history.length,settled:app.profile.settledResults.length};
    return before;
  })()`);
  const framing=[],framingErrors=[];
  for(const car of CAR_KEYS){
    const start=await context.evaluate(`(() => {
      const app=window.__qaApp;
      if(app.duel.state.status!=='menu')throw Error('Expected menu before yard visit');
      app.setRaceSettings({car:${JSON.stringify(car)}});
      if(app.menuCar!==${JSON.stringify(car)}||!app.visitWasteland())throw Error('Production car visit failed');
      return {car:app.duel.state.car,credits:app.profile.credits,scrap:app.profile.wasteland.scrap};
    })()`);
    if(start.car!==car||start.credits!==before.credits||start.scrap!==before.scrap)
      throw Error('Yard visit changed wallet: '+JSON.stringify(start));
    await context.waitFor('window.__qaApp.visualReady===true',`${car} vehicle ready`,60000);
    await context.evaluate('window.__qaApp.advance(8);window.__qaApp.onFrame?.(window.__qaApp.duel.state)');
    try{framing.push(await framedCar(context,car,'landscape'));}
    catch(error){framingErrors.push(String(error.message||error));}
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:390,height:844,deviceScaleFactor:1,mobile:true});
    await context.waitFor('window.innerWidth===390 && window.innerHeight===844','portrait viewport');
    try{framing.push(await framedCar(context,car,'portrait'));}
    catch(error){framingErrors.push(String(error.message||error));}
    await context.command('Emulation.setDeviceMetricsOverride',
      {width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await context.waitFor('window.innerWidth===1280 && window.innerHeight===800','desktop viewport');
    const end=await context.evaluate(`(() => {
      const app=window.__qaApp;app.returnToMenu();
      return {status:app.duel.state.status,visit:app.duel.state.hiddenRoadVisit,
        journey:app.duel.state.hiddenRoadJourney,credits:app.profile.credits,
        scrap:app.profile.wasteland.scrap,history:app.profile.history.length,
        settled:app.profile.settledResults.length,activeRace:app.profile.activeRace};
    })()`);
    if(end.status!=='menu'||end.visit||end.journey||end.credits!==before.credits||
      end.scrap!==before.scrap||end.history!==before.history||end.settled!==before.settled||end.activeRace)
      throw Error(`${car} yard visit contaminated save or journey: ${JSON.stringify(end)}`);
  }
  if(framingErrors.length)throw Error(`Yard framing failed ${framingErrors.length}/18 views:\n${framingErrors.join('\n')}`);
  await context.evaluate("window.__qaApp.setRaceSettings({car:'falcone_f42'})");
  await context.evaluate("if(!window.__qaApp.visitWasteland())throw Error('safe visit failed')");
  await context.waitFor('window.__qaApp.visualReady === true', 'visit vehicle ready', 60000);
  const entry=await context.evaluate(`(() => {
    const app=window.__qaApp;
    app.advance(8);app.onFrame?.(app.duel.state);
    return {status:app.duel.state.status,phase:app.duel.state.hiddenRoadJourney?.phase,
      active:app.isYardHomeActive(),text:document.querySelector('#modal-layer')?.textContent,
      legacyVisible:!document.querySelector('[data-hidden-road-dialog]')?.hidden};
  })()`);
  if(entry.status!=='exploring'||entry.phase!=='arrived'||!entry.active||entry.legacyVisible||
    !entry.text.includes('SCRAPDOME YARD')||!entry.text.includes('3,000 SCRAP'))
    throw Error('Yard entry failed: '+JSON.stringify(entry));
  await context.screenshot('yard-home');
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await context.waitFor('window.innerWidth===390 && window.innerHeight===844', 'portrait viewport');
  await context.evaluate('window.__render.renderFrame()');
  await context.screenshot('yard-home-portrait');
  await context.command('Emulation.setDeviceMetricsOverride',
    {width:1280,height:800,deviceScaleFactor:1,mobile:false});
  await context.waitFor('window.innerWidth===1280 && window.innerHeight===800', 'desktop viewport');
  await context.evaluate('window.__render.renderFrame()');
  const territory=await context.evaluate(`(() => {
    document.querySelector('[data-action="yard-territory"]').click();
    const app=window.__qaApp;
    return {status:app.duel.state.status,text:document.querySelector('#modal-layer').textContent,
      active:app.isYardHomeActive()};
  })()`);
  if(!territory.active||territory.status!=='exploring'||!territory.text.includes('TERRITORY MAP'))
    throw Error('Territory panel failed: '+JSON.stringify(territory));
  await context.screenshot('yard-territory');
  const shop=await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('[data-action="yard-armory"]').click();
    const upgrade=document.querySelector('[data-weapon-upgrade="ufo"]');
    const kit=document.querySelector('[data-kit-tier="scrapper"]');
    if(!upgrade||!kit)throw Error('Armory purchase controls missing');
    upgrade.click();
    document.querySelector('[data-kit-tier="scrapper"]').click();
    return {scrap:app.profile.wasteland.scrap,credits:app.profile.credits,
      weapon:app.profile.wasteland.weapons.levels.ufo,
      kit:app.profile.wasteland.kits.falcone_f42.equipped,
      shown:document.querySelector('.yard-wallet')?.textContent,
      status:app.duel.state.status};
  })()`);
  if(shop.scrap!==2500||shop.credits!==before.credits||shop.weapon!==1||
    shop.kit!=='scrapper'||shop.status!=='exploring'||!shop.shown.includes('2,500 SCRAP'))
    throw Error('Yard purchase or wallet failed: '+JSON.stringify(shop));
  const selections=await context.evaluate(`(() => {
    const app=window.__qaApp;
    const slot=document.querySelector('[data-loadout-slot="0"]');
    if(!slot)throw Error('Yard weapon slot select missing');
    slot.value='bomb';slot.dispatchEvent(new Event('change',{bubbles:true}));
    const car=document.querySelector('[data-kit-car]');
    if(!car)throw Error('Yard kit car select missing');
    car.value='stuttgart_959s';car.dispatchEvent(new Event('change',{bubbles:true}));
    const kit=document.querySelector('[data-kit-tier="scrapper"]');
    if(!kit)throw Error('Selected-car kit purchase missing');
    kit.click();
    return {loadout:app.profile.wasteland.loadout,
      selectedCar:document.querySelector('[data-kit-car]')?.value,
      falcone:app.profile.wasteland.kits.falcone_f42?.equipped,
      stuttgart:app.profile.wasteland.kits.stuttgart_959s?.equipped,
      scrap:app.profile.wasteland.scrap,credits:app.profile.credits,
      history:app.profile.history.length,settled:app.profile.settledResults.length,
      shown:document.querySelector('.yard-wallet')?.textContent,
      status:app.duel.state.status};
  })()`);
  if(selections.loadout?.[0]!=='bomb'||selections.loadout?.[1]!=='ufo'||
    selections.selectedCar!=='stuttgart_959s'||
    selections.falcone!=='scrapper'||selections.stuttgart!=='scrapper'||
    selections.scrap!==2150||selections.credits!==before.credits||
    selections.history!==before.history||selections.settled!==before.settled||
    selections.status!=='exploring'||!selections.shown?.includes('2,150 SCRAP'))
    throw Error('Yard select changes did not persist for the selected car and weapon slot: '+JSON.stringify(selections));
  await context.screenshot('yard-armory');
  const crew=await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('[data-action="yard-crew"]').click();
    const button=document.querySelector('[data-crew-select="nell"]');
    if(!button||button.disabled)throw Error('Crew choice unavailable');
    button.click();
    return {scrap:app.profile.wasteland.scrap,selected:app.profile.wasteland.crew.selected,
      status:app.duel.state.status,shown:document.querySelector('.yard-wallet')?.textContent,
      focus:document.activeElement?.dataset?.action||document.activeElement?.dataset?.crewSelect,
      forbidden:[...document.querySelectorAll('.yard-home-panel button')].some(button=>
        /^(?:ENTER ARENA|FIGHT WARLORD|DAILY BOUNTY)$/i.test(button.textContent.trim()))};
  })()`);
  // The new selected-car purchase spends 350 before Nell's existing 300.
  if(crew.scrap!==1850||crew.selected!=='nell'||crew.status!=='exploring'||
    !crew.shown.includes('1,850 SCRAP')||crew.forbidden||crew.focus!=='yard-crew')
    throw Error('Crew or unbuilt-action check failed: '+JSON.stringify(crew));
  await context.screenshot('yard-crew');
  const exit=await context.evaluate(`(() => {
    const app=window.__qaApp;
    document.querySelector('[data-action="yard-menu"]').click();
    return {status:app.duel.state.status,credits:app.profile.credits,
      scrap:app.profile.wasteland.scrap,history:app.profile.history.length,
      settled:app.profile.settledResults.length};
  })()`);
  if(exit.status!=='menu'||exit.credits!==before.credits||exit.scrap!==1850||
    exit.history!==before.history||exit.settled!==before.settled)
    throw Error('Yard exit granted a reward or lost a purchase: '+JSON.stringify(exit));
}
