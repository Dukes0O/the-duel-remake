// MAP-FINISH: memory-only directed player-input survey. No frame timing.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PLACES, legFuelKgMap} from '../../src/heli/pilot-map-data.js';
import {SECRET_SIGNS, TABLE} from '../../src/heli/map-secrets.js';
import {CIRCUIT_MANIFESTS} from '../../src/circuit-manifests.js';
import {KESTREL} from '../../src/heli/heli-flight.js';

const pause = ms => new Promise(r => setTimeout(r, ms));
const flags = ['helicopter', 'pilot-map', ...CIRCUIT_MANIFESTS.map(m => m.flag)].join(',');
async function until(c, condition, seconds, label) {
  const result = await c.evaluate(`(() => {const app=window.__qaApp; for(let i=0;i<${seconds * 60};i++) {
    if (${condition}) return true; app.advance(1/60,1/60); } return ${condition};})()`);
  if (!result) throw Error(`Flight did not complete: ${label}`);
}
async function cruise(c, id) {
  await c.evaluate(`(() => {const a=window.__qaApp; a.keys={}; a.heliSetDestination(${JSON.stringify(id)}); if(!a.heliSession.autopilotOn) a._inputAction('heli-autopilot');})()`);
  await until(c, 'app.heliSession.cruiseOffered', 900, 'cruise offered');
  await c.evaluate("window.__qaApp._inputAction('heli-cruise')");
  await until(c, `app.heliView().courseId===${JSON.stringify(id)}`, 60, id);
  await c.waitFor('window.__qaApp.visualReady', id+' drawn', 120000);
}
// Analogue stick inputs, not pose writes. World-space velocity feedback turns
// into pitch/roll in the helicopter's current heading; lift holds height.
async function fly(c, target, {height=100, seconds=450, land=false, radius=8}={}) {
  const result = await c.evaluate(`(() => {
    const app=window.__qaApp, target=${JSON.stringify(target)}, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
    app.keys={}; if(app.heliSession.autopilotOn) app._inputAction('heli-autopilot');
    for(let i=0;i<${seconds * 120};i++) {
      const v=app.heliView(), h=v.heli;
      if(h.crashed || v.phase==='crashed') return {ok:false,reason:'crashed',h};
      const dx=target.x-h.x,dz=target.z-h.z,d=Math.hypot(dx,dz), speed=Math.hypot(h.vx,h.vz);
      if(${land} ? h.onGround && d<${radius} : d<${radius} && speed<2 && Math.abs(h.y-(target.y ?? app.heliGroundHeight(target.x,target.z))-${height})<4) return {ok:true,h};
      const vx=clamp(dx*.18,-22,22), vz=clamp(dz*.18,-22,22);
      const ax=clamp((vx-h.vx)*.9,-3,3), az=clamp((vz-h.vz)*.9,-3,3);
      const sin=Math.sin(h.heading),cos=Math.cos(h.heading);
      const goalY=(target.y ?? app.heliGroundHeight(target.x,target.z))+${height};
      const safeY=d>35?Math.max(goalY,h.groundY+80):goalY;
      const lift=${land} && d<6 && speed<1 ? -.22 : clamp((safeY-h.y)*.35,-3,4)/5;
      app._heliEvents(app.heliSession.step({pitch:clamp((ax*sin+az*cos)/3.4,-1,1),roll:clamp((-ax*cos+az*sin)/3.4,-1,1),lift,yaw:0},1/120));
    }
    return {ok:false,reason:'timeout',view:app.heliView()};
  })()`);
  if(!result.ok) throw Error('Directed flight '+JSON.stringify(result));
  await pause(700);
  return result.h;
}
async function visit(c, course='tremblant-woods') {
  await c.evaluate(`(() => {const a=window.__qaApp;if(a.heliSession)a.returnToMenu();a.profile={...a.profile,credits:100000,
    courses:{version:1,unlocked:${JSON.stringify(PLACES.flatMap(p=>p.courses))}},
    heli:{version:1,fuelKg:400,lessons:{liftoff:true,hover:true,landing:true,carry:true},map:{version:1,seen:[],found:[],table:false}}};
    a._saveProfile();a.audio.setMuted(true);a.visitHeli(); ${course!=='tremblant-woods'?`a._heliEvents(a.heliSession.start(${JSON.stringify(course)}));`:''}})()`);
  await c.waitFor('window.__qaApp.visualReady && window.__qaApp.heliView()?.heli',course+' ready',120000);
}
async function checkLabels(c, tableName=null) {
  await pause(800);
  const bounds=await c.evaluate(`(() => {const canvas=document.querySelector('.pilot-map-canvas'),r=canvas.getBoundingClientRect(),labels=[...new Map(window.__mapLabels.map(b=>[b.text,b])).values()];return {scale:r.width/canvas.width,labels};})()`);
  const expected=PLACES.filter(p=>!p.air).map(p=>p.name).concat(tableName?[tableName]:[]).sort();
  const actual=bounds.labels.map(b=>b.text).sort();
  if(JSON.stringify(actual)!==JSON.stringify(expected)) throw Error('Map label set differs: '+JSON.stringify({actual,expected}));
  for(let i=0;i<bounds.labels.length;i++) for(const b of bounds.labels.slice(i+1)) {
    const a=bounds.labels[i]; if(a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y) throw Error(`Label overlap: ${a.text} / ${b.text}`);
  }
  return bounds;
}
export async function run(c) {
  await c.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await c.navigate('/tools/menu-check.html?flags='+flags);
  await c.waitFor("!!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'",'menu',90000);
  if(process.env.DUEL_MAP_FINISH_LOOK_ONLY==='1') {
    for(const sign of SECRET_SIGNS) {
      await visit(c,sign.course);
      await c.evaluate('window.__qaApp.keys={KeyW:true}');
      await until(c,'app.heliView().heli.y-app.heliView().zone.y>120',120,'inspection climb');
      await fly(c,sign,{height:85});
      await c.evaluate('window.__qaApp.heliCamera=2');
      await pause(1500);
      await c.screenshot('look-'+sign.id);
    }
    await visit(c,'the-table');
    const zone=await c.evaluate('window.__qaApp.heliView().zone');
    await fly(c,zone,{height:125});
    await c.evaluate('window.__qaApp.heliCamera=2');
    await pause(1500);
    await c.screenshot('look-table-top');
    await fly(c,{x:TABLE.tower.x,z:TABLE.tower.z,y:TABLE.topY},{height:45});
    await pause(1500);
    await c.screenshot('look-table-tower');
    await c.evaluate('window.__qaApp.returnToMenu()');
    return;
  }
  await visit(c);
  // Record actual browser font bounds at the displayed chart scale.
  const names=[...PLACES.map(p=>p.name),'?'];
  await c.evaluate(`(() => {const a=window.__qaApp,canvas=document.querySelector('.pilot-map-canvas'),ctx=canvas.getContext('2d'),draw=ctx.fillText.bind(ctx);
    window.__mapLabels=[];ctx.fillText=function(text,x,y,...rest){if(${JSON.stringify(names)}.includes(text)) {
      const m=this.measureText(text);window.__mapLabels.push({text,x:x-m.width/2,y:y-m.actualBoundingBoxAscent,w:m.width,h:m.actualBoundingBoxAscent+m.actualBoundingBoxDescent});}
      return draw(text,x,y,...rest);};a.setHeliMap(true);})()`);
  const bounds=await checkLabels(c);
  await c.screenshot('map-whole-after');
  await c.evaluate('window.__qaApp.setHeliMap(false)');
  // Real cruise discovers the Table; no seen flag is injected for this route.
  await c.evaluate('window.__qaApp.keys={KeyW:true}');
  await until(c,'app.heliView().heli.y-app.heliView().zone.y>120',120,'climb');
  await cruise(c,'pacific-canyon');
  const discovery=await c.evaluate("window.__qaApp.heliLog.filter(e=>e.type==='tableSpotted')");
  if(!discovery.length) throw Error('Pacific Canyon cruise did not reveal the Table');
  await c.screenshot('table-radio-on-pacific-arrival');
  await c.evaluate('window.__mapLabels=[];window.__qaApp.setHeliMap(true)');
  const seenBounds=await checkLabels(c,'?');
  await c.screenshot('map-table-seen');
  await c.evaluate('window.__qaApp.setHeliMap(false)');
  const zone=await c.evaluate('window.__qaApp.heliView().zone');
  await fly(c,zone,{height:20,seconds:600});
  await fly(c,zone,{height:0,land:true});
  await c.evaluate('window.__qaApp.heliBuyFuel()');
  await c.evaluate('window.__qaApp.keys={KeyW:true}');
  await until(c,'app.heliView().heli.y-app.heliView().zone.y>120',120,'leave Pacific pad');
  await cruise(c,'the-table');
  await c.screenshot('table-from-the-air');
  const tableZone=await c.evaluate('window.__qaApp.heliView().zone');
  await fly(c,{x:0,z:0,y:TABLE.topY},{height:240});
  await c.evaluate('window.__qaApp.heliCamera=2');
  await pause(1500);
  await c.screenshot('look-table-top');
  await fly(c,tableZone,{height:60});
  await c.screenshot('table-approach');
  await fly(c,tableZone,{height:20});
  const creditsBefore=await c.evaluate('window.__qaApp.profile.credits');
  await fly(c,tableZone,{height:0,land:true});
  const landing=await c.evaluate('({view:window.__qaApp.heliView(),credits:window.__qaApp.profile.credits})');
  if(!landing.view.secrets.table || landing.credits-creditsBefore!==1750) throw Error('Table landing reward/logbook missing');
  await c.waitFor("!!document.querySelector('.pilot-map-logbook') && !document.querySelector('.pilot-map-logbook').hidden",'logbook visible',10000);
  await c.screenshot('table-landed-logbook');
  await c.evaluate('window.__mapLabels=[];window.__qaApp.setHeliMap(true)');
  const foundBounds=await checkLabels(c,'The Table');
  await c.screenshot('map-table-found');
  await c.evaluate('window.__qaApp.setHeliMap(false)');
  // Directed inspection starts at each parent pad, then flies with stick
  // inputs to the signs. This is a sight/readability test, not a blind search.
  const signs=[];
  for(const sign of SECRET_SIGNS) {
    await visit(c,sign.course);
    await c.evaluate('window.__qaApp.keys={KeyW:true}');
    await until(c,'app.heliView().heli.y-app.heliView().zone.y>120',120,'inspection climb');
    const h=await fly(c,sign,{height:85});
    await c.evaluate('window.__qaApp.heliCamera=2');
    await pause(1500);
    await c.screenshot('look-'+sign.id);
    await fly(c,sign,{height:45});
    await until(c,`app.heliView().secrets.found.includes(${JSON.stringify(sign.id)})`,12,'hover discovers '+sign.id);
    signs.push({id:sign.id,inspectionHeight:h.y-h.groundY,found:true});
  }
  const fuel=PLACES.filter(p=>!p.air).map(from=>({from:from.id,legs:PLACES.filter(p=>p.id!==from.id).map(to=>({to:to.id,kg:legFuelKgMap(from.id,to.id),tank:KESTREL.tankKg}))}));
  await writeFile(join(c.outputDir,'survey.json'),JSON.stringify({bounds,seenBounds,foundBounds,discovery,landing:{table:landing.view.secrets.table,reward:landing.credits-creditsBefore},signs,fuel},null,2)+'\n');
  await c.evaluate('window.__qaApp.returnToMenu()');
}
