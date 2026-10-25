// Click the production yard UI in a private browser tab with memory-only saves.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {CARS} from '../../src/config.js';
import {territoryPanel} from '../../src/screen-territory.js';

// The historical road-car framing scope approved on QA-YARD-HOME-AIR-ONLY.
const CAR_KEYS=Object.freeze([
  'falcone_f42','stuttgart_959s','falcone_heritage','aurora_gt',
  'dusthawk_rally','banshee_muscle','viper_proto','titan_monster',
]);
const LADDER_HTML=territoryPanel({wasteland:{version:1,discoveredGate:true,
  territories:{
    sal:{hold:75,claimed:false},
    dustmonger:{hold:100,claimed:false},
    mirage:{hold:100,claimed:true},
    gunn:{hold:100,claimed:false},
  },
  warlords:{
    sal:{defeated:false,wins:0,losses:0},
    dustmonger:{defeated:false,wins:0,losses:0},
    mirage:{defeated:true,wins:1,losses:0},
    gunn:{defeated:false,wins:0,losses:0},
  },
}}, {builtWarlordIds:['dustmonger','mirage']});

async function framedCar(context,car){
  const size={width:1280,height:800};
  await context.waitFor(`(() => {
    const canvas = document.querySelector('canvas[aria-label="The Duel three-dimensional racing scene"]');
    const rect = canvas?.getBoundingClientRect();
    return window.__qaApp.visualReady === true &&
      canvas?.parentElement?.dataset?.vehicleAsset === 'ready' &&
      Math.abs(rect?.width - ${size.width}) < 1 &&
      Math.abs(rect?.height - ${size.height}) < 1 &&
      Math.abs(window.__render.camera.aspect - rect.width / rect.height) < .001;
  })()`, `${car} ${size.width}x${size.height} asset and camera`, 60000);
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
  await context.screenshot(`yard-${car.replaceAll('_','-')}`);
  if(result.error||result.car!==car||result.status!=='exploring'||result.phase!=='arrived'||!result.active||
    result.asset!=='ready'||!result.front||!result.clip||!b||
    result.playerDistance>.5||result.peerDistance!==null&&result.peerDistance<result.playerDistance+.5||
    Math.abs(v.left)>1||Math.abs(v.top)>1||Math.abs(v.right-v.width)>1||Math.abs(v.bottom-v.height)>1||
    b.left<v.left||b.right>v.right||b.top<v.top||b.bottom>v.bottom||
    result.uncovered<1000||result.panelOverlap>1)
    throw Error(`${car} not framed in yard: ${JSON.stringify(result)}`);
  return result;
}

async function refusedJesko(context){
  const refusal=await context.evaluate(`(() => {
    const app=window.__qaApp;
    const memoryOnly=!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&
      window.name.startsWith('__duel_qa_tab_v2:');
    if(!memoryOnly)throw Error('Jesko refusal needs the disposable memory-only tab');
    app.setRaceSettings({car:'koenigsegg_jesko'});
    const storage=()=>JSON.stringify(Array.from({length:localStorage.length},(_,index)=>{
      const key=localStorage.key(index);return [key,localStorage.getItem(key)];
    }).sort((a,b)=>a[0].localeCompare(b[0])));
    const helicopterOn=app._switches().enabled('helicopter')===true;
    const unlocked=app.profile.unlockedCars.includes('koenigsegg_jesko');
    const untransported=!Object.hasOwn(app.profile.heli?.carsAt||{},'koenigsegg_jesko')&&
      (app.profile.heli?.flights||0)===0;
    if(!helicopterOn||!unlocked||!untransported||app.menuCar!=='koenigsegg_jesko')
      throw Error('Jesko refusal requires helicopter enabled and the selected car unlocked but untransported');
    const before={owner:app.player.id,state:app.duel.state,course:app.duel.course,
      stateValue:JSON.stringify(app.duel.state),features:JSON.stringify(app.duel.course?.features),
      run:app.runId,profile:JSON.stringify(app.profile),heli:JSON.stringify(app.profile.heli),
      storage:storage()};
    const admitted=app.visitWasteland();
    return {car:app.menuCar,admitted,message:app.courseAccessMessage,memoryOnly,
      helicopterOn,unlocked,untransported,status:app.duel.state.status,
      visit:!!app.duel.state.hiddenRoadVisit,journey:!!app.duel.state.hiddenRoadJourney,
      sameOwner:app.player.id===before.owner,sameState:app.duel.state===before.state,
      sameCourse:app.duel.course===before.course,sameRun:app.runId===before.run,
      unchangedState:JSON.stringify(app.duel.state)===before.stateValue,
      unchangedFeatures:JSON.stringify(app.duel.course?.features)===before.features,
      unchangedProfile:JSON.stringify(app.profile)===before.profile,
      unchangedHeli:JSON.stringify(app.profile.heli)===before.heli,
      unchangedStorage:storage()===before.storage};
  })()`);
  if(refusal.car!=='koenigsegg_jesko'||refusal.admitted!==false||
    refusal.message!==`The ${CARS.koenigsegg_jesko.name} travels only by air. Fly it here from the helipad first.`||
    !refusal.memoryOnly||!refusal.helicopterOn||!refusal.unlocked||!refusal.untransported||
    refusal.status!=='menu'||refusal.visit||refusal.journey||!refusal.sameOwner||
    !refusal.sameState||!refusal.unchangedState||!refusal.sameCourse||!refusal.unchangedFeatures||
    !refusal.sameRun||!refusal.unchangedProfile||
    !refusal.unchangedHeli||!refusal.unchangedStorage)
    throw Error('Production Jesko yard refusal or isolation failed: '+JSON.stringify(refusal));
  return refusal;
}

export async function run(context) {
  for(const car of [...CAR_KEYS,'koenigsegg_jesko'])
    if(!Object.hasOwn(CARS,car))throw Error(`Historical yard car missing: ${car}`);
  await context.navigate('/tools/menu-check.html?flags=hidden-road');
  await context.waitFor("!!window.__qaApp && !!window.__render && document.querySelector('#stage.in-menu') && !!Object.getOwnPropertyDescriptor(window, 'localStorage')?.value", 'isolated yard menu', 60000);
  await context.waitFor('window.__qaApp.visualReady === true', 'renderer ready for arrival', 60000);
  await context.waitFor("[...document.querySelectorAll('details')].some(panel => panel.querySelector('summary')?.textContent.includes('MENU QA'))", 'QA controls');
  await context.evaluate("document.querySelectorAll('details').forEach(panel => {if(panel.querySelector('summary')?.textContent.includes('MENU QA'))panel.style.display='none';})");
  const before=await context.evaluate(`(() => {
    const app=window.__qaApp;app.stop();
    app.addPlayer('Yard QA');
    app.profile={...app.profile,credits:700,unlockedCars:${JSON.stringify([...CAR_KEYS,'koenigsegg_jesko'])},wasteland:{...app.profile.wasteland,
      discoveredGate:true,scrap:3000,xp:2000}};
    if(!app._saveProfile())throw Error('memory-only setup save failed');
    const before={credits:app.profile.credits,scrap:app.profile.wasteland.scrap,
      history:app.profile.history.length,settled:app.profile.settledResults.length};
    return before;
  })()`);
  const airOnlyRefusal=await refusedJesko(context);
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
    try{framing.push(await framedCar(context,car));}
    catch(error){framingErrors.push(String(error.message||error));}
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
  if(framingErrors.length)throw Error(`Yard framing failed ${framingErrors.length}/8 views:\n${framingErrors.join('\n')}`);
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
  const ladderBefore=await context.evaluate(`(() => {const p=window.__qaApp.profile;return {
    credits:p.credits,scrap:p.wasteland.scrap,history:JSON.stringify(p.history),
    results:JSON.stringify(p.settledResults),activeRace:JSON.stringify(p.activeRace)};})()`);
  for(const quality of ['high','performance']){
    const ladder=await context.evaluate(`(() => {
      const app=window.__qaApp;
      app.setGraphicsQuality(${JSON.stringify(quality)});
      const content=document.querySelector('.yard-home-content');
      content.innerHTML=${JSON.stringify(LADDER_HTML)};
      const cards=[...content.querySelectorAll('.territory-card')];
      const byName=Object.fromEntries(cards.map(card=>[card.querySelector('h4')?.textContent.trim(),{
        text:card.textContent.replace(/\\s+/g,' ').trim(),
        buttons:[...card.querySelectorAll('button')].map(button=>({
          label:button.textContent.trim(),warlord:button.dataset.warlord}))
      }]));
      const p=app.profile;
      return {quality:app.ambientOcclusionEnabled?'high':'performance',cards:cards.length,
        buttons:cards.flatMap(card=>[...card.querySelectorAll('button')]).length,byName,
        state:{credits:p.credits,scrap:p.wasteland.scrap,history:JSON.stringify(p.history),
          results:JSON.stringify(p.settledResults),activeRace:JSON.stringify(p.activeRace)}};
    })()`);
    const sal=ladder.byName['Sawtooth Sal'],dustmonger=ladder.byName['The Dustmonger'];
    const mirage=ladder.byName['Mother Mirage'],gunn=ladder.byName['Gearhead Gunn'];
    if(ladder.quality!==quality||ladder.cards!==8||ladder.buttons!==2||
      !sal?.text.includes('75 / 100 HOLD')||sal.buttons.length!==0||
      !dustmonger?.text.includes('THE DUSTMONGER IS WAITING')||
      dustmonger.buttons.length!==1||dustmonger.buttons[0].label!=='FIGHT'||
      dustmonger.buttons[0].warlord!=='dustmonger'||
      !mirage?.text.includes('DEFEATED · DECOY DRONE EARNED · CLAIMED')||
      mirage.buttons.length!==1||mirage.buttons[0].label!=='REMATCH'||
      mirage.buttons[0].warlord!=='mirage'||
      !gunn?.text.includes('WARLORD FIGHT COMING LATER')||gunn.buttons.length!==0||
      JSON.stringify(ladder.state)!==JSON.stringify(ladderBefore))
      throw Error(`${quality} ladder fixture failed: ${JSON.stringify(ladder)}`);
    await context.command('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await context.screenshot(`yard-territory-ladder-${quality}`);
  }
  const ladderAfter=await context.evaluate(`(() => {const p=window.__qaApp.profile;return {
    credits:p.credits,scrap:p.wasteland.scrap,history:JSON.stringify(p.history),
    results:JSON.stringify(p.settledResults),activeRace:JSON.stringify(p.activeRace)};})()`);
  if(JSON.stringify(ladderAfter)!==JSON.stringify(ladderBefore))
    throw Error('Territory rendering changed career state: '+JSON.stringify({ladderBefore,ladderAfter}));
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
  await writeFile(join(context.outputDir,'yard-home-browser.json'),
    JSON.stringify({roadCars:CAR_KEYS,framing,airOnlyRefusal},null,2)+'\n');
}
