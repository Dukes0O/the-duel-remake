import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {referenceTargets} from '../build-reference-laps.mjs';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';

const entry = '/tools/menu-check.html?flags=' + ['grand-prix', ...ALL_CIRCUITS.map(circuit => circuit.flag)].join(',');
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
    document.querySelector('[data-action="courses"]').click();
    const owned=document.querySelector('[data-team-room="pacific-canyon"]');
    const locked=[...document.querySelectorAll('[data-team-room]')].find(button=>button.disabled);
    if(!owned || owned.disabled || !locked)throw Error('Owned and locked Team Room entry states are missing.');
    locked.click();
    if(!document.querySelector('.team-room-layer').hidden)throw Error('Locked track opened Team Room.');
    document.querySelector('[data-action="courses-close"]').click();
    const events=[...document.querySelector('#scene-select').options].map(option=>Number(option.value));
    for(const index of events){const course=app.getMenuCourse(index);if(course)app.profile.courses={version:1,unlocked:[...new Set([...(app.profile.courses?.unlocked||[]),course.def.id])]};}
    app._saveProfile();
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
    const at=course.at(s),ground=course.groundAt(s,0),aim=course.at(s+ahead),aimGround=course.groundAt(s+ahead,0);
    const camera=window.__render.camera,expected=[at.x,ground.y+up,at.z],actual=camera.position.toArray();
    if(expected.some((value,index)=>Math.abs(value-actual[index])>1e-6))throw Error('Actual native camera is not at the driver-seat approach.');
    camera.updateMatrixWorld();
    const forward=[-camera.matrixWorld.elements[8],-camera.matrixWorld.elements[9],-camera.matrixWorld.elements[10]];
    const delta=[aim.x-at.x,aimGround.y-ground.y,aim.z-at.z],length=Math.hypot(...delta);
    if(forward.some((value,index)=>Math.abs(value-delta[index]/length)>1e-6))throw Error('Actual camera does not look along the native road.');
    const canvas=document.querySelector('[data-team-snapshot] canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    const colours=new Set();let hash=0x811c9dc5;
    for(let i=0;i<pixels.length;i+=64){colours.add((pixels[i]>>4)+','+(pixels[i+1]>>4)+','+(pixels[i+2]>>4));hash=Math.imul(hash^pixels[i],0x01000193);}
    if(colours.size<20)throw Error('Native snapshot pixels are blank or incomplete.');
    if(window.__teamRoomReadOnly()!==window.__teamRoomBefore)throw Error('Studying the track changed race state, settings or profile.');
    return {flag:${JSON.stringify(flagId)},position:actual,expected,colours:colours.size,hash:hash>>>0,width:canvas.width,height:canvas.height};
  })()`);
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
        localStorage.clear();
      })()`);
    }
    report.passed=true;
  } finally {await writeFile(join(context.outputDir,'team-room.json'),JSON.stringify(report,null,2)+'\n');}
  console.log(`Team Room: ${report.views.length} native driver-seat views; all ${referenceTargets().length} routes, both presets, unchanged state and profile.`);
}
