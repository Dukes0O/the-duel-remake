// Every Team Room picture on the circuits that have authored Team Room data, taken
// by the game's own renderer from above the braking point, laid out as contact
// sheets (one JPG under 500 KB each) for a look-and-feel review. Memory-only saves.
//   node tools/browser-harness.mjs scenario team-room-photos
// Sheets land beside the report in the evidence folder. Set DUEL_TEAMROOM_SHEET to
// a file path to also copy the first sheet (Pacific Canyon and Tremblant Woods) there.
// Set DUEL_TEAMROOM_ONLY to part of a sheet name (harbour) to make only that sheet.
// Set DUEL_TEAMROOM_FULL to a comma list such as tremblant-woods/beaver-hairpin to also keep
// those pictures at full size (960 by 540) next to the sheets.
import {copyFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {referenceTargets} from '../build-reference-laps.mjs';
import {ALL_CIRCUITS} from '../../src/circuits/index.js';
import {CIRCUIT_MANIFESTS} from '../../src/circuit-manifests.js';

const entry = '/tools/menu-check.html?flags=' + ['grand-prix', ...ALL_CIRCUITS.map(circuit => circuit.flag)].join(',');
const ready = `document.readyState==='complete' && window.__qaApp && window.__render &&
  document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`;
// Sheet 1 is the pair Kyle asked to see; the dev circuits follow on their own sheets.
const SHEETS = [
  {name: 'teamroom-photos', keys: ['pacific-canyon|route_a', 'pacific-canyon|route_b', 'pacific-canyon|route_c', 'tremblant-woods|fixed']},
  {name: 'teamroom-photos-harbour', keys: ['harbour-lights|fixed']},
  {name: 'teamroom-photos-panorama', keys: ['panorama-ridge|fixed']},
];

const wantedFull = new Set((process.env.DUEL_TEAMROOM_FULL ?? '').split(',').filter(Boolean));

async function setup(context) {
  await context.navigate(entry);
  await context.waitFor(ready, 'native menu and renderer', 60000);
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(!Object.getOwnPropertyDescriptor(window,'localStorage')?.value || !window.name.startsWith('__duel_qa_tab_v2:'))
      throw Error('Memory-only QA storage is required.');
    app.audio.setMuted(true);app.setGraphicsQuality('high');
    for(const index of [...document.querySelector('#scene-select').options].map(option=>Number(option.value))){
      const course=app.getMenuCourse(index);
      if(course)app.profile.courses={version:1,unlocked:[...new Set([...(app.profile.courses?.unlocked||[]),course.def.id])]};}
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

  })()`);
}

async function photographTrack(context, target) {
  await context.evaluate(`(() => {
    const app=window.__qaApp;
    if(${JSON.stringify(target.route)}!=='fixed')app.setRouteVariant(${JSON.stringify(target.route)});
    document.querySelector('[data-action="courses"]').click();
    const button=document.querySelector('[data-team-room="${target.eventId}"]');
    if(!button || button.disabled)throw Error('Native Team Room button is unavailable.');
    button.click();
  })()`);
  await context.waitFor(`!document.querySelector('.team-room-layer')?.hidden && !!document.querySelector('.team-map svg')`, `${target.key} dossier`, 20000);
  const flags = await context.evaluate(`Array.from(document.querySelectorAll('.team-flag-list [data-team-flag]'),button=>({id:button.dataset.teamFlag,kind:button.dataset.teamKind,title:button.querySelector('b').textContent}))`);
  const photos = [];
  for (const flag of flags) {
    await context.evaluate(`document.querySelector('.team-flag-list [data-team-flag="${flag.id}"]').click()`);
    await context.waitFor(`document.querySelector('#view3d')?.dataset.trackSnapshot===${JSON.stringify(flag.id)} &&
      !!document.querySelector('[data-team-snapshot] canvas')`, `${target.key}/${flag.id} view`, 30000);
    const picture = await context.evaluate(`(() => {
      const canvas=document.querySelector('[data-team-snapshot] canvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      const colours=new Set();for(let i=0;i<pixels.length;i+=64)colours.add((pixels[i]>>4)+','+(pixels[i+1]>>4)+','+(pixels[i+2]>>4));
      const small=document.createElement('canvas');small.width=400;small.height=225;small.getContext('2d').drawImage(canvas,0,0,400,225);
      return {colours:colours.size,url:small.toDataURL('image/jpeg',.82),caption:document.querySelector('[data-team-status]').textContent,
        full:${JSON.stringify(wantedFull.has(`${target.eventId}/${flag.id}`))}?canvas.toDataURL('image/jpeg',.9):null};
    })()`);
    if (picture.colours < 20) throw Error(`${target.key}/${flag.id}: the picture is blank or incomplete.`);
    if (!picture.caption.startsWith('Live track view · from above')) throw Error(`${target.key}/${flag.id}: wrong caption "${picture.caption}".`);
    if (picture.full) await writeFile(join(context.outputDir, `full-${target.key.replace('|', '-')}-${flag.id}.jpg`), Buffer.from(picture.full.split(',')[1], 'base64'));
    photos.push({...flag, key: target.key, url: picture.url});
  }
  await context.command('Input.dispatchKeyEvent', {type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await context.command('Input.dispatchKeyEvent', {type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27});
  await context.waitFor(`document.querySelector('.team-room-layer')?.hidden`, 'dossier closed', 10000);
  await context.evaluate(`document.querySelector('[data-action="courses-close"]').click()`);
  return photos;
}

// Lay the pictures out in a grid and squeeze the JPEG until it fits.
async function contactSheet(context, photos) {
  return context.evaluate(`(async () => {
    const photos=${JSON.stringify(photos)},columns=6,tile=300,height=Math.round(tile*9/16),label=16,pad=4;
    const rows=Math.ceil(photos.length/columns),sheet=document.createElement('canvas');
    sheet.width=columns*(tile+pad)+pad;sheet.height=rows*(height+label+pad)+pad;
    const g=sheet.getContext('2d');g.fillStyle='#0b1a21';g.fillRect(0,0,sheet.width,sheet.height);
    g.font='11px sans-serif';g.textBaseline='middle';
    for(const [index,photo] of photos.entries()){
      const image=new Image();image.src=photo.url;await image.decode();
      const x=pad+(index%columns)*(tile+pad),y=pad+Math.floor(index/columns)*(height+label+pad);
      g.drawImage(image,x,y,tile,height);g.fillStyle='#e9ecdf';
      g.fillText((photo.key.split('|')[0].replace('-canyon','').replace('-woods','').replace('-lights','').replace('-ridge','')+' · '+photo.title).slice(0,52),x+2,y+height+label/2+1);
    }
    for(const quality of [.8,.7,.6,.5,.4,.3]){
      const url=sheet.toDataURL('image/jpeg',quality);
      if(url.length*3/4<480000||quality===.3)return {quality,url,width:sheet.width,height:sheet.height};
    }
  })()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false});
  await setup(context);
  const byKey = new Map(referenceTargets().map(target => [target.key, target]));
  const report = {card: 'TEAMROOM-FIX', sheets: [], passed: false};
  try {
    for (const sheet of SHEETS.filter(item => !process.env.DUEL_TEAMROOM_ONLY || item.name.includes(process.env.DUEL_TEAMROOM_ONLY))) {
      const photos = [];
      for (const key of sheet.keys) {
        const target = byKey.get(key);
        if (!target) throw Error(`No reference target ${key}.`);
        photos.push(...await photographTrack(context, target));
      }
      const picture = await contactSheet(context, photos);
      const path = join(context.outputDir, `${sheet.name}.jpg`);
      await writeFile(path, Buffer.from(picture.url.split(',')[1], 'base64'));
      report.sheets.push({path, pictures: photos.length, quality: picture.quality, width: picture.width, height: picture.height});
      if (sheet.name === 'teamroom-photos' && process.env.DUEL_TEAMROOM_SHEET) await copyFile(path, process.env.DUEL_TEAMROOM_SHEET);
    }
    report.passed = true;
  } finally {await writeFile(join(context.outputDir, 'team-room-photos.json'), JSON.stringify(report, null, 2) + '\n');}
  console.log(`Team Room pictures: ${report.sheets.map(sheet => sheet.pictures).join(' + ')} views on ${report.sheets.length} contact sheets.`);
}
