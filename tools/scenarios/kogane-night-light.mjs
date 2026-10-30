// Kogane light check (KOGANE-NIGHT-LIGHT): pictures of Kogane Pass and Kogane Pass Night at set places, plus the
// helicopter at Kogane. Memory-only saves, private port, 1280x720, no frame timing. Run:
//   node tools/browser-harness.mjs scenario kogane-night-light --output-dir .evidence/<date>/kogane-night-light/<round>
import {nativeBundle} from './p4-panorama.mjs';

const views = [
  {course: 'kogane-pass-night', name: 'night-start', at: 45, chase: true},
  {course: 'kogane-pass-night', name: 'night-mid', at: 1300, chase: true},
  {course: 'kogane-pass-night', name: 'night-teahouse-hairpin', at: 2140, chase: true},
  {course: 'kogane-pass-night', name: 'night-village', at: 3400, chase: true},
  {course: 'panorama-ridge-night', name: 'ref-panorama-night-a', at: 600, chase: true},
  {course: 'panorama-ridge-night', name: 'ref-panorama-night-b', at: 1800, chase: true},
  {course: 'kogane-pass', name: 'day-teahouse', at: 100, from: [83, 3, 4], to: [113, 22, 2]},
  {course: 'kogane-pass', name: 'day-start', at: 45, chase: true},
  {course: 'kogane-pass', name: 'day-teahouse-hairpin', at: 2140, chase: true},
];

async function openMenu(context) {
  await context.navigate('/tools/menu-check.html?flags=kogane-pass,kogane-pass-night,panorama-ridge,panorama-ridge-night,grand-prix,helicopter');
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' &&
    !!Object.getOwnPropertyDescriptor(window,'localStorage')?.value`, 'isolated menu', 60000);
  await context.evaluate(await nativeBundle());
}

async function startCourse(context, id) {
  await context.evaluate(`(() => {
    const a=window.__qaApp;
    const select=document.querySelector('#graphics-quality');select.value='high';
    select.dispatchEvent(new Event('change',{bubbles:true}));
    window.__panQa.ownTestCourses(a);
    a.profile={...a.profile,heli:{...(a.profile.heli||{}),version:1,map:{version:1,found:['kogane-pass-night','panorama-ridge-night']}}};a._saveProfile();
    a.audio.setMuted?.(true);
    let index=-1;
    for(let i=0;i<100;i++)if(a.getMenuCourse(i)?.def.id===${JSON.stringify(id)}){index=i;break;}
    if(index<0)throw Error('course missing: ${id}');
    if(!a.startCampaign({startStage:index,seed:1989,mode:'timetrial',car:'stuttgart_959s',
      difficulty:'casual',cpuDifficulty:'medium'}))throw Error('Could not start ${id}');
    a.stop();
    a.autopilot=true;a._scriptedCrashDone=true;window.__panQa.useRacingLine(a,.95);
    a.setCamera('chase');
    document.head.insertAdjacentHTML('beforeend','<style>details,#overlay,.rear-view-frame{display:none!important}</style>');
  })()`);
  await context.waitFor(`(()=>{const a=window.__qaApp;a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
    return a.visualReady && document.querySelector('#renderer-loading')?.hidden;})()`, 'scenery loaded', 180000);
}

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  const only = (process.env.KOGANE_VIEWS || '').split(',').filter(Boolean);
  for (const course of ['kogane-pass-night', 'kogane-pass', 'panorama-ridge-night']) {
    const list = views.filter(view => view.course === course && (!only.length || only.includes(view.name)));
    if (!list.length) continue;
    await openMenu(context);
    await startCourse(context, course);
    for (const view of list) {
      await context.evaluate(`(() => {
        const a=window.__qaApp,s=a.duel.state;
        for(let i=0;i<60000&&s.s<${view.at}&&['countdown','racing'].includes(s.status);i++)a.advance(1/60,1/60);
        if(s.s<${view.at})throw Error('Driver did not reach ${view.name}');
        const c=a.duel.course;
        if(${!!view.chase})a.inspectionCamera=null;
        else {
          const point=([q,off,up])=>{const p=c.groundAt(q,off);
            const y=window.__panQa.renderedGroundHeight(c,{...p,s:q,off},{requireSurface:true});
            return [p.x,y+up,p.z];};
          a.inspectionCamera={position:point(${JSON.stringify(view.from ?? [])}),target:point(${JSON.stringify(view.to ?? [])})};
        }
        a.onFrame?.(a.duel.state,0);window.__render.renderFrame();
      })()`);
      await context.waitFor(`(()=>{const a=window.__qaApp,r=window.__render;a.onFrame?.(a.duel.state,0);r.renderFrame();
        const settings=window.__panQa.sampleCourseLightPath(a.duel.course,{distance:a.duel.state.s}).settings;
        return Math.abs(r.renderer.toneMappingExposure-settings.exposure)<.02;})()`, 'light settled', 20000);
      await context.screenshot(view.name);
    }
  }
  if (!only.length || only.includes('heli')) {
    await openMenu(context);
    await context.evaluate(`(() => {
      const a=window.__qaApp;
      a.profile={...a.profile,credits:5000,heli:{version:1,fuelKg:300,refuels:1,lessons:{liftoff:true,hover:true,landing:true,carry:true}}};
      if(!a._saveProfile())throw Error('fixture not saved');
      a.audio.setMuted?.(true);
      document.head.insertAdjacentHTML('beforeend','<style>details{display:none!important}</style>');
      document.querySelector('#heli-visit').click();
    })()`);
    await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad', 120000);
    await context.evaluate(`window.__qaApp.heliSession.start('kogane-pass')`);
    await context.waitFor(`window.__qaApp.heliView()?.courseId==='kogane-pass' && window.__qaApp.visualReady`, 'Kogane from the air', 180000);
    await new Promise(resolve => setTimeout(resolve, 2500));
    await context.screenshot('heli-kogane');
    await context.evaluate(`window.__qaApp.setHeliCamera?.(1)`);
  }
}