import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

// Keep the sheet recipe with the private scenario; preserve every capture's
// complete view and labels. The only committed image is the compact comparison.
export function buildComparisonSheet(python, evidence, output, round = 1) {
  if(!Number.isInteger(round)||round<1||round>3)throw Error('Pit review round must be 1–3');
  execFileSync(python, ['-c', String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys
source, output = map(Path, sys.argv[1:3])
round = int(sys.argv[3])
sheet = Image.new('RGB', (1280, 1604), '#191b18')
draw = ImageDraw.Draw(sheet)
font = ImageFont.load_default(size=18)
draw.text((15, 10), f'THE PIT / RELEASED RING - PRIVATE NATIVE COMPARISON - ROUND {round}', fill='#f0dfba', font=font)
for row, (quality, mode) in enumerate([('high', 'full'), ('high', 'racing'), ('performance', 'full'), ('performance', 'racing')]):
    top = 44 + row * 390
    for column, venue in enumerate(['scrapdome', 'pit']):
        draw.text((column * 640 + 12, top), f'{quality.upper()} / {mode.upper()} / {venue.upper()}', fill='#f0dfba', font=font)
        image = Image.open(source / f'{quality}-{venue}-{mode}.png').convert('RGB')
        image = image.resize((640, 360), Image.Resampling.LANCZOS)
        sheet.paste(image, (column * 640, top + 25))
output.parent.mkdir(parents=True, exist_ok=True)
sheet.save(output, quality=75, optimize=True, progressive=True)
if output.stat().st_size > 500_000:
    raise RuntimeError('Pit comparison exceeds 500 KB')
print(str(output), output.stat().st_size)
`, evidence, output, String(round)], {stdio: 'inherit'});
}

async function settled(context, label) {
  await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;if(!a||!r)return false;
    a.onFrame?.(a.duel.state,0);r.renderFrame();return a.visualReady&&
      document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'&&
      document.querySelector('#renderer-loading')?.hidden;})()`, label, 60_000);
}

async function start(context, quality, venue) {
  await context.evaluate(`(()=>{const a=window.__qaApp;a.stop();a.audio.setMuted(true);
    if(!window.name.startsWith('__duel_qa_tab_v2:')||!Object.getOwnPropertyDescriptor(window,'localStorage')?.value)
      throw Error('Pit requires memory-only QA storage');
    // This visual fixture enters with discovery only inside disposable QA state.
    a.duel.state.wastelandGateDiscovered=true;
    a.setGraphicsQuality(${JSON.stringify(quality)});
    for(const d of document.querySelectorAll('details'))if(d.querySelector('summary')?.textContent.startsWith('MENU QA'))d.open=false;
    if(!a.duel.startArenaEvent({venueId:${JSON.stringify(venue)},mode:'last-car-rolling',seed:1989,
      car:'falcone_f42',cpuDifficulty:'medium',opponents:[{car:'dusthawk_rally',brain:'rammer'}]}))
      throw Error('Native private arena entry failed');a.duel.state.countdown=0;
    // Let the native start callout expire before the unchanged scene fixtures.
    for(let tick=0;tick<300;tick++)a.duel.step(1/120);
    a.onFrame?.(a.duel.state,0);})()`);
  await settled(context, quality+' '+venue+' actual world');
}

async function pose(context, mode) {
  await context.evaluate(`(()=>{const a=window.__qaApp,d=a.duel,s=d.state;
    const station=d.course.length*.15;
    for(const [index,actor]of[s,...s.opponents].entries())Object.assign(actor,{s:station+index*16,
      prevS:station+index*16,lateral:index?8:0,prevLateral:index?8:0,headingError:0,
      speedMph:0,pushVelocity:0,yawVelocity:0,knock:null,airborne:false,airHeight:0});
    if(${JSON.stringify(mode)}==='full'){
      const first=d.course.worldAt(0),opposite=d.course.worldAt(d.course.length/2),
        cx=(first.x+opposite.x)/2,cz=(first.z+opposite.z)/2;
      a.inspectionCamera={position:[cx+125,145,cz+170],target:[cx,0,cz]};
    }else a.inspectionCamera=null;
    const before=JSON.stringify({state:s,features:d.course.features});
    a.onFrame?.(s,0);window.__render.renderFrame();
    if(before!==JSON.stringify({state:s,features:d.course.features}))throw Error('Pit presentation changed native rules');
    if(d.course.def.id==='pit'){
      const world=window.__render.scene.getObjectByName('The Pit');
      if(!world?.getObjectByName('Pit physical floor')||
        !world.getObjectByName('Pit hulk wall, centre pile and oval-end scrap')||
        !world.getObjectByName('Stadium spectators'))throw Error('Actual Pit composition missing');
    }
  })()`);
  await settled(context, mode+' camera assets');
  // The first stage onFrame can recreate this QA disclosure after entry.
  await context.evaluate(`(()=>{for(const details of document.querySelectorAll('details'))
    if(details.querySelector('summary')?.textContent.startsWith('MENU QA'))details.open=false;})()`);
}

async function frames(context) {
  return context.evaluate(`(async()=>{const a=window.__qaApp;a.inspectionCamera=null;a.start();
    const times=[];let last=0;for(let i=0;i<150;i++){
      const t=await new Promise(requestAnimationFrame);if(last&&i>30)times.push(t-last);last=t;
    }a.stop();const sorted=[...times].sort((x,y)=>x-y);
    return{meanMs:times.reduce((x,y)=>x+y,0)/times.length,p95Ms:sorted[Math.floor(sorted.length*.95)],
      draws:window.__render.renderer.info.render.calls,triangles:window.__render.renderer.info.render.triangles};})()`);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width:1280,height:720,deviceScaleFactor:1,mobile:false});
  const report={card:'ARENA-PIT',privateNativeEntry:true,memoryOnly:true,captures:[],frames:[],limits:
    ['Future boss cards own Pit selection. No public picker or boss acceptance is claimed.',
      'Claude comparison and Kyle feel verdicts remain human decisions.']};
  try{
    for(const quality of ['high','performance']){
      await context.navigate('/tools/menu-check.html?harness=arena-pit-'+quality);
      await context.waitFor('!!window.__qaApp&&!!window.__render','Pit QA menu',60_000);
      for(const venue of ['scrapdome','pit']){
        await start(context,quality,venue);
        for(const mode of ['full','racing']){
          await pose(context,mode);const path=await context.screenshot(quality+'-'+venue+'-'+mode);
          report.captures.push({quality,venue,mode,path});
        }
        if(process.env.PIT_MEASURE_FRAMES==='1'){
          await pose(context,'racing');report.frames.push({quality,venue,...await frames(context)});
        }
      }
      if(process.env.PIT_MEASURE_FRAMES==='1'){
        const baseline=report.frames.find(row=>row.quality===quality&&row.venue==='scrapdome');
        const pit=report.frames.find(row=>row.quality===quality&&row.venue==='pit');
        if(pit.p95Ms>baseline.p95Ms*1.1)throw Error(quality+' Pit frame P95 exceeds ring by more than 10%');
      }
    }
    report.passed=true;
  }catch(error){report.passed=false;report.failure=error.stack;throw error;}
  finally{await writeFile(join(context.outputDir,'arena-pit-browser.json'),JSON.stringify(report,null,2)+'\n');}
}
