import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {referenceTargets} from '../build-reference-laps.mjs';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';
import {CIRCUIT_MANIFESTS} from '../../src/circuit-manifests.js';
import {SNAPSHOT_CHASE} from '../../src/track-analysis.js';

// A development course that stands in for a released road (it has a `slot`) is left off: with its switch on the game builds the
// new road, whose published track reference is not made until it goes live, and the released road's reference would read as stale
// (EIFEL-CROWN). The Team Room is checked on the road the player has.
const standsInForReleased = circuit => CIRCUIT_MANIFESTS.some(row => row.id === circuit.id && row.slot !== undefined && row.state !== 'on');
const entry = '/tools/menu-check.html?flags=' + ['grand-prix', ...ALL_CIRCUITS.filter(circuit => !standsInForReleased(circuit)).map(circuit => circuit.flag)].join(',');
const ready = `document.readyState==='complete' && window.__qaApp && window.__render &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`;

async function setup(context, quality) {
  await context.navigate(entry);
  await context.waitFor(ready, 'native menu and renderer', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Memory-only QA storage is required.');
    if(app._switches().state('grand-prix')==null || !app._switches().enabled('grand-prix'))
      throw Error('Native grand-prix switch is absent or disabled. Land FIELD before claiming Team Room entry acceptance.');
    app.audio.setMuted(true);app.setGraphicsQuality(${JSON.stringify(quality)});
    document.querySelectorAll('details').forEach(node => { if (!node.closest('.team-room-layer')) node.open = false; });
    document.querySelector('[data-action="courses"]').click();
    const owned=document.querySelector('[data-team-room="pacific-canyon"]');
    const locked=[...document.querySelectorAll('[data-team-room]')].find(button=>button.disabled);
    if(!owned || owned.disabled || !locked)throw Error('Owned and locked Team Room entry states are missing.');
    locked.click();
    if(!document.querySelector('.team-room-layer').hidden)throw Error('Locked track opened Team Room.');
    owned.click();
    const intelPanel=document.querySelector('.team-room-layer');
    if(!intelPanel.textContent.includes('Drive 3 laps') ||
       !intelPanel.querySelector('[data-team-buy="3"]')?.textContent.includes('400 credits') ||
       !intelPanel.querySelector('[data-team-buy="4"]')?.textContent.includes('800 credits'))
      throw Error('Locked intel does not show its requirement and exact price.');
    const creditsBefore=app.profile.credits;
    if(creditsBefore<400) {
      intelPanel.querySelector('[data-team-buy="3"]').click();
      if(!document.querySelector('[data-team-intel-message]')?.textContent.includes('Not enough credits.') ||
         app.profile.credits!==creditsBefore || app.getIntelLevel('pacific-canyon')!==1)
        throw Error('Failed intel purchase changed the profile or hid its reason.');
    }
    document.querySelector('[data-team-close]').click();
    document.querySelector('[data-action="courses-close"]').click();
    const events=[...document.querySelector('#scene-select').options].map(option=>Number(option.value));
    for(const index of events){const course=app.getMenuCourse(index);if(course)app.profile.courses={version:1,unlocked:[...new Set([...(app.profile.courses?.unlocked||[]),course.def.id])]};}
    app._saveProfile();
    // Disposable, memory-only purchase fixture; every picture uses earned access.
    // Variant ownership also needs its actual manifest's parent GP podium.
    app.profile={...app.profile,credits:50000,grandPrixPodiums:[...new Set([...(app.profile.grandPrixPodiums??[]),
      ...${JSON.stringify(CIRCUIT_MANIFESTS.filter(row=>row.unlock?.kind==='default-gp-podium').map(row=>row.unlock.defaultEventId))}])],
      heli:{...(app.profile.heli??{version:1}),map:{version:1,seen:[],found:${JSON.stringify(CIRCUIT_MANIFESTS.filter(row=>row.unlock?.kind==='spotted-from-air').map(row=>row.id))},table:false}}};app._saveProfile();
    for(const index of [...document.querySelector('#scene-select').options].map(option=>Number(option.value))){
      const course=app.getMenuCourse(index);
      if(course && !course.def.practice && !course.def.arena && course.closed!==false) {
        const result=app.buyIntel(course.def.id,4);
        if(!result.ok)throw Error('Fixture intel purchase refused: '+course.def.id);
      }
    }


    const previousMode=app.duel.state.mode;
    const trial=document.querySelector('[data-mode="timetrial"]');
    if(!trial)throw Error('Time Trial setup control is missing.');
    trial.click();
    const options={startStage:app.menuStage,mode:'timetrial'},choices=app.getGhostChoices(options);
    let source=app.getGhostChoice(options);
    const expectedLabel=value=>value==='off'?'OFF':value==='team'?'TEAM':'MY BEST';
    if(!document.querySelector('#ghost-record-label').textContent.includes(expectedLabel(source)))
      throw Error('Ghost source label is absent before changing it.');
    for(let count=0;count<choices.length;count++){
      const expected=choices[(choices.indexOf(source)+1)%choices.length];
      document.querySelector('#ghost-toggle').click();
      source=app.getGhostChoice(options);
      if(source!==expected || document.querySelector('#ghost-toggle').checked!==(source!=='off') ||
         !document.querySelector('#ghost-record-label').textContent.includes(expectedLabel(source)))
        throw Error('Bound ghost change left a stale checkbox or source label.');
    }
    document.querySelector('[data-mode="'+previousMode+'"]')?.click();

    window.__teamRoomReadOnly=()=>JSON.stringify({state:app.duel.state,profile:app.profile,
      stage:app.menuStage,route:app.menuRouteId,settings:app.getRaceChoices(),storage:Array.from({length:localStorage.length},(_,index)=>localStorage.key(index)).sort().map(key=>[key,localStorage.getItem(key)])});
  })()`);
}

async function openTrack(context, target) {
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(${JSON.stringify(target.route)}!=='fixed')app.setRouteVariant(${JSON.stringify(target.route)});
    document.querySelector('[data-action="courses"]').click();
    const button=document.querySelector('[data-team-room="${target.eventId}"]');
    if(!button || button.disabled)throw Error('Native Team Room button is unavailable.');
    window.__teamRoomBefore=window.__teamRoomReadOnly();button.focus();button.click();
  })()`);
  await context.waitFor(`!document.querySelector('.team-room-layer')?.hidden && !!document.querySelector('.team-map svg')`,
    `${target.key} dossier`, 20000);
}

async function captureFlag(context, target, flagId) {
  await context.evaluate(`document.querySelector('.team-flag-list [data-team-flag="${flagId}"]').click()`);
  await context.waitFor(`document.querySelector('#view3d')?.dataset.trackSnapshot===${JSON.stringify(flagId)} &&
    !!document.querySelector('[data-team-snapshot] canvas')`, `${target.key}/${flagId} native view`, 25000);
  return context.evaluate(`(() => {
    const app=window.__qaApp,button=document.querySelector('.team-flag-list [data-team-flag="${flagId}"]');
    const index=[...document.querySelector('#scene-select').options].map(option=>Number(option.value))
      .find(index=>app.getMenuCourse(index)?.def.id===${JSON.stringify(target.eventId)});
    const course=app.getMenuCourse(index),s=Number(button.dataset.teamSnapshotS),up=Number(button.dataset.teamCameraUp),ahead=Number(button.dataset.teamCameraAhead);
    // Elevated chase view: SNAPSHOT_CHASE metres behind the viewing point, looking at the ground ahead of it.
    const L=course.length,wrap=value=>((value%L)+L)%L,eyeS=wrap(s-${SNAPSHOT_CHASE}),aimS=wrap(s+ahead),at=course.at(eyeS),ground=course.groundAt(eyeS,0),aim=course.at(aimS),aimGround=course.groundAt(aimS,0);
    const camera=window.__render.camera,expected=[at.x,ground.y+up,at.z],actual=camera.position.toArray();
    if(expected.some((value,index)=>Math.abs(value-actual[index])>1e-6))throw Error('Actual native camera is not above and behind the approach.');
    if(up<8||up>10)throw Error('The Team Room camera is not 8 to 10 m above the road.');
    camera.updateMatrixWorld();
    const forward=[-camera.matrixWorld.elements[8],-camera.matrixWorld.elements[9],-camera.matrixWorld.elements[10]];
    const delta=[aim.x-actual[0],aimGround.y-actual[1],aim.z-actual[2]],length=Math.hypot(...delta);
    if(forward.some((value,index)=>Math.abs(value-delta[index]/length)>1e-6))throw Error('Actual camera does not look down at the feature along the native road.');
    const canvas=document.querySelector('[data-team-snapshot] canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const colours=new Set();let hash=0x811c9dc5;
    for(let i=0;i<pixels.length;i+=64){colours.add((pixels[i]>>4)+','+(pixels[i+1]>>4)+','+(pixels[i+2]>>4));hash=Math.imul(hash^pixels[i],0x01000193);}
    if(colours.size<20)throw Error('Native snapshot pixels are blank or incomplete.');
    if(window.__teamRoomReadOnly()!==window.__teamRoomBefore)throw Error('Studying the track changed race state, settings or profile.');
    return {flag:${JSON.stringify(flagId)},position:actual,expected,colours:colours.size,hash:hash>>>0,width:canvas.width,height:canvas.height};
  })()`);
}

// Kyle, 11 October 2026: map flags and numbered corners did nothing when clicked. Press the real
// mouse (down, then up, as a person does) or the real Enter key on a map marker and check that it
// behaves exactly like the same flag in the list: selected, listed in view, picture and note shown.
async function chooseFromMap(context, target, how, selector) {
  const spot = await context.evaluate(`(() => {
    const marker=document.querySelector(${JSON.stringify(selector)});
    if(!marker)throw Error('Map marker ${selector} is missing.');
    marker.scrollIntoView({block:'center'});
    const box=marker.getBoundingClientRect(),x=box.x+box.width/2,y=box.y+box.height/2;
    if(!marker.contains(document.elementFromPoint(x,y)))throw Error('Something else covers map marker ${selector} at its centre.');
    return {x,y,id:marker.dataset.teamFlag,title:marker.getAttribute('aria-label')};
  })()`);
  if (how === 'mouse') {
    await context.command('Input.dispatchMouseEvent', {type: 'mouseMoved', x: spot.x, y: spot.y});
    await context.command('Input.dispatchMouseEvent', {type: 'mousePressed', x: spot.x, y: spot.y, button: 'left', clickCount: 1});
    await context.command('Input.dispatchMouseEvent', {type: 'mouseReleased', x: spot.x, y: spot.y, button: 'left', clickCount: 1});
  } else {
    await context.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
    await context.command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'});
    await context.command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13});
  }
  await context.waitFor(`document.querySelector('#view3d')?.dataset.trackSnapshot===${JSON.stringify(spot.id)} &&
    !!document.querySelector('[data-team-snapshot] canvas')`, `${target.key}/${spot.id} from the map (${how})`, 25000);
  await context.evaluate(`(() => {
    const id=${JSON.stringify(spot.id)},list=document.querySelector('.team-flag-list'),item=list.querySelector('[data-team-flag="'+id+'"]');
    if(item.getAttribute('aria-pressed')!=='true')throw Error('The list did not mark the flag chosen on the map.');
    const l=list.getBoundingClientRect(),i=item.getBoundingClientRect();
    if(i.top<l.top-1||i.bottom>l.bottom+1)throw Error('The list did not scroll to the flag chosen on the map.');
    if(document.querySelector('[data-team-feature-title]').textContent!==item.querySelector('b').textContent)throw Error('The title did not follow the map click.');
    if(!document.querySelector('[data-team-note]').textContent.trim())throw Error('No engineer note after the map click.');
    if(document.querySelectorAll('[data-team-flag][aria-pressed="true"]').length<2)throw Error('The map marker was not marked chosen.');
    if(!document.querySelector('[data-team-status]').textContent.startsWith('Live track view · from above'))throw Error('The picture caption is not the elevated view.');
  })()`);
  return spot.id;
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const report={card:'P4-INTEL-DOSSIER',nativeEntry:false,views:[],passed:false};
  try {
    for(const quality of ['high','performance']) {
      await setup(context,quality);report.nativeEntry=true;
      for(const target of referenceTargets()) {
        await openTrack(context,target);
        const flags=await context.evaluate(`Array.from(document.querySelectorAll('.team-flag-list [data-team-flag]'),button=>({id:button.dataset.teamFlag,kind:button.dataset.teamKind}))`);
        const signature=flags.find(flag=>flag.kind==='signature');
        if(!signature)throw Error(`${target.key}: missing signature flag`);
        report.views.push({quality,key:target.key,...await captureFlag(context,target,signature.id)});
        if(target.key==='pacific-canyon|route_a') {
          for(const kind of ['corner','crest','overtaking']) {
            const flag=flags.find(row=>row.kind===kind);
            if(flag)report.views.push({quality,key:target.key,...await captureFlag(context,target,flag.id)});
          }
          await context.screenshot(`team-room-${quality}`);
        }
        if(target.key==='tremblant-woods|fixed') {
          // The map must answer to the mouse and keyboard exactly as the list does.
          const pins = await context.evaluate(`Array.from(document.querySelectorAll('.team-map-flag'),pin=>pin.dataset.teamFlag)`);
          const corner = await context.evaluate(`document.querySelector('.team-map-corner')?.dataset.teamFlag||''`);
          if (pins.length < 4 || !corner) throw Error(`${target.key}: the map has no clickable markers`);
          const chosen = new Set();
          for (const id of [pins[0], pins.at(-1), pins[Math.floor(pins.length / 2)]])
            chosen.add(await chooseFromMap(context, target, 'mouse', `.team-map-flag[data-team-flag="${id}"]`));
          chosen.add(await chooseFromMap(context, target, 'mouse', `.team-map-corner[data-team-flag="${corner}"]`));
          chosen.add(await chooseFromMap(context, target, 'key', `.team-map-flag[data-team-flag="${pins[1]}"]`));
          chosen.add(await chooseFromMap(context, target, 'key', `.team-map-corner[data-team-flag="${corner}"]`));
          report.mapChoices = (report.mapChoices ?? 0) + 6;
          if (chosen.size < 4) throw Error('Map clicks kept choosing the same flag.');
          if (await context.evaluate(`window.__teamRoomReadOnly()!==window.__teamRoomBefore`)) throw Error('Choosing from the map changed race state, settings or profile.');
          await context.screenshot(`team-room-map-${quality}`);
        }
        await context.command('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await context.command('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await context.waitFor(`document.querySelector('.team-room-layer')?.hidden && !document.querySelector('#view3d')?.dataset.trackSnapshot`, 'dossier closed', 10000);
        await context.evaluate(`(() => {
          if(document.activeElement?.dataset.teamRoom!==${JSON.stringify(target.eventId)})throw Error('Focus did not return to the event card.');
          if(document.querySelector('.team-room-layer canvas'))throw Error('Closed dossier retained snapshot pixels.');
          if(window.__teamRoomReadOnly()!==window.__teamRoomBefore)throw Error('Closing the dossier changed race/profile/settings.');
          document.querySelector('[data-action="courses-close"]').click();
        })()`);
      }
      // Each quality begins from the same fresh, isolated QA career.
      await context.evaluate(`(() => {
        if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
          throw Error('Refusing to reset storage outside the memory-only QA tab.');
        window.name="";
      })()`);
    }
    report.passed=true;
  } finally {await writeFile(join(context.outputDir,'team-room.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(`Team Room: ${report.views.length} native elevated views; all ${referenceTargets().length} routes, both presets, unchanged state and profile.`);
}
