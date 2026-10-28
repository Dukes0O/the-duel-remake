// DEEP-EXPLORER: native chart, saved fixture and Surface, private memory only.
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await context.navigate('/tools/menu-check.html?flags=the-deep');
  await context.waitFor(`!!window.__qaApp?.visualReady&&!!Object.getOwnPropertyDescriptor(window,'localStorage')?.value&&window.name.startsWith('__duel_qa_tab_v2:')`,'private memory-only page',90000);
  await context.waitFor(`[...document.querySelectorAll('details button')].some(n=>n.textContent==='Create funded temporary player')`,'temporary player',90000);
  await context.evaluate(`(()=>{
    [...document.querySelectorAll('details button')].find(n=>n.textContent==='Create funded temporary player').click();
    const a=window.__qaApp;a.audio.setMuted(true);a.profile={...a.profile,deep:{kit:true}};a._saveProfile();
    for(const panel of document.querySelectorAll('details'))panel.hidden=true;
    a.startCampaign({mode:'duel',seed:1989,opponentCount:1,startStage:0});
    window.__surveyPark=(p,heading=0)=>{const d=a.duel,s=d.state,n=d.course.nearest(p.x,p.z,s.s);
      Object.assign(s,{s:n.s,prevS:n.s,lateral:n.lateral,prevLateral:n.lateral,speedMph:0,
        headingError:heading-d.course.at(n.s).heading,airborne:false,airHeight:0,prevAirHeight:0,
        yawVelocity:0,pushVelocity:0,impactTimer:0,_jumpY:null});d.setInput({throttle:0,brake:0,steer:0,interact:false});};
    const d=a.duel,r=d.course.deepRamp,p=r.shoreline.center.progress-.04;
    let point;for(let i=1;i<r.points.length;i++){const x=r.points[i-1],y=r.points[i];
      if(p>y.progress&&i<r.points.length-1)continue;const t=(p-x.progress)/(y.progress-x.progress);
      point={x:x.x+(y.x-x.x)*t,z:x.z+(y.z-x.z)*t,y:x.y+(y.y-x.y)*t};break;}
    window.__surveyPark(point,r.heading);Object.assign(d.state,{status:'racing',countdown:0,speedMph:35,groundHeight:point.y});d.step(1/120);
    if(!a.chooseDeep('dive'))throw Error('Dive unavailable');
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.deepJourney?.phase==='underwater'&&!!window.__qaApp.duel.deepStory`,'native dive',60000);
  await context.waitFor(`document.querySelector('.deep-objectives ol')?.children.length===7`,'Ana checklist',10000);
  // DEEP-EXPLORER round 2: a real half-second rule hold photographed while the dive runs.
  await context.waitFor(`document.querySelector('.sirena-title').hidden`,'title clear for logging',15000);
  await context.evaluate(`(()=>{const d=window.__qaApp.duel;
    const turtle=d.deepStory.life.positions.find(p=>p.creature==='turtle');
    if(!turtle||d.deepStory.log.logged.has('turtle'))throw Error('Unlogged moving turtle required');
    window.__surveyPark(turtle);
    for(let i=0;i<60;i++)d.step(1/120);
  })()`);
  await context.waitFor(`!document.querySelector('.deep-logging').hidden&&document.querySelector('.deep-logging span').textContent==='Logging: Green turtle'`,'real logging ring',10000);
  const ring=await context.screenshot('logging-green-turtle');
  // Earn the partial chart and pins through the real log/raise rules.
  await context.evaluate(`(()=>{const d=window.__qaApp.duel,q=d.deepStory;
    for(const p of [q.sirena.finds.find(f=>f.id==='sirena-badge'),q.log.spots.find(s=>s.creature==='turtle'),q.log.pearls[0]]){
      window.__surveyPark(p);for(let i=0;i<145;i++)d.step(1/120);
    }
    // Continue into the forest so the partial sheet shows a useful stretch
    // of surveyed ground, rather than only the tiny patch around the ramp.
    const trail=d.deepRuntime.zone.trail;
    for(let i=0;i<Math.floor(trail.length*.4);i++){
      window.__surveyPark(trail[i],d.deepRuntime.ramp.heading);d.step(1/120);
    }
  })()`);
  await context.waitFor(`window.__qaApp.profile.deep.logged?.includes('turtle')&&window.__qaApp.profile.deep.pearls?.includes('kelp-1')&&window.__qaApp.profile.deep.raised?.includes('sirena-badge')`,'real logged pins',10000);
  await context.waitFor(`document.querySelector('.sirena-title').hidden&&document.querySelector('.sirena-log').hidden`,'unobstructed chart',15000);
  await context.waitFor(`document.querySelector('.deep-objectives').textContent.includes('1 of 7')`,'live checklist progress',10000);
  const partial=await context.screenshot('chart-part-explored');
  const partialPercent=await context.evaluate(`document.querySelector('.deep-chart-percent').textContent`);
  // The second picture is an explicit completed, synthetic save fixture. No pay
  // events, live saves or renderer-driven exploration are used to prepare it.
  await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,z=d.deepRuntime.zone;
    a.profile={...a.profile,deep:{...a.profile.deep,charted:{'kelp-coast':'f'.repeat(2304)},
      raised:z.finds.map(p=>p.id),logged:z.spots.map(p=>p.creature),pearls:z.pearls.map(p=>p.id),places:z.places.map(p=>p.id)}};
    a._saveProfile();d.deepStory.charted=a.profile.deep.charted['kelp-coast'];
  })()`);
  await context.waitFor(`document.querySelector('.deep-chart-percent').textContent==='100% charted'`,'complete saved chart',10000);
  const full=await context.screenshot('chart-fully-explored');
  const images=[partial,full,ring].map(path=>'data:image/png;base64,'+readFileSync(path).toString('base64'));
  const sheet=await context.evaluate(`(async()=>{const canvas=document.createElement('canvas');canvas.width=3840;canvas.height=764;
    const g=canvas.getContext('2d');g.fillStyle='#081d24';g.fillRect(0,0,3840,764);
    for(let i=0;i<3;i++){const image=new Image();image.src=${JSON.stringify(images)}[i];await image.decode();
      g.drawImage(image,i*1280,38,1280,720);g.fillStyle='#e7d4a0';g.font='18px Georgia';
      g.fillText(['Explored path: badge, turtle and pearl','Saved chart: fully explored, all find pins','Moving turtle: real one-second logging ring'][i],i*1280+16,26);}
    return canvas.toDataURL('image/jpeg',.84);})()`);
  const sheetPath=join(context.outputDir,'chart-sheet.jpg');
  writeFileSync(sheetPath,Buffer.from(sheet.split(',')[1],'base64'));context.screenshots.push(sheetPath);
  // Surface is reachable with the chart folded, through its button and U key.
  await context.evaluate(`document.querySelector('.deep-map-toggle').click()`);
  await context.waitFor(`document.querySelector('.deep-objectives').hidden&&!document.querySelector('.deep-surface').hidden`,'Surface remains visible with map folded',10000);
  await context.command('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyU',key:'u',windowsVirtualKeyCode:85});
  await context.command('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyU',key:'u',windowsVirtualKeyCode:85});
  await context.waitFor(`window.__qaApp.duel.state.status==='menu'&&!window.__qaApp.duel.state.deepJourney`,'U returns to surface',10000);
  writeFileSync(join(context.outputDir,'explorer.json'),JSON.stringify({partialPercent,fullPercent:100,surface:'U passed',sheetPath},null,2)+'\n');
}
