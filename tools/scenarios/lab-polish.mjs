// LAB-POLISH: every lesson's real view in the walking Lab. Lessons open as
// classrooms at their machines, so each one is walked to by the map, checked
// for its first step, and photographed. BENCH_SCRIPT stays the list of dial
// settings that tools/test-lab-player.mjs runs on the rules; each classroom's
// own scenario drives its controls in the browser.
// The harness supplies a private origin and memory-only saves.
import {MODEL_OF_LESSON} from '../../src/lab/lab-scene.js';
import {CLASSROOM_LESSONS} from '../../src/lab/classroom/classroom-lessons.js';

export const BENCH_SCRIPT = {
  lift: [{collective: 1}, {cargoKg: 3000}],
  projectile: [{speedMs: 0}, {speedMs: 20}],
  fire: [{putOut: 'water'}, {putOut: 'sand'}, {putOut: 'cleared strip'}],
  pendulum: [{lengthM: 5}, {lengthM: 15}, {lengthM: 25}, {lengthM: 15, weightKg: 200}],
  altitude: [{site: 'sea'}, {site: 'panorama-ridge'}, {site: 'summit-run'}],
  strength: [{loadKg: 2000}, {part: 'hook arm', material: 'carbon fibre', thicknessMm: 55}],
  rust: [{days: 0}, {days: 7}],
  gforce: [{speedMph: 40}, {speedMph: 80, radiusM: 50}],
  headings: [{}, {headingDeg: 320, rulerUnits: 9.2}],
  grip: [{slideDeg: 3}, {slideDeg: 8}],
  downforce: [{wing: 'big', speedMph: 50}, {speedMph: 100}],
  braking: [{speedMph: 50}, {speedMph: 100}],
  suspension: [{spring: 'soft', road: 'bumpy'}, {spring: 'stiff'}, {road: 'smooth'}, {spring: 'soft'}],
  fuel: [{litres: 70}, {litres: 35}],
  launch: [{angleDeg: 45, speedMs: 20}, {speedMs: 17}],
  wax: [{snow: 'powder', wax: 'soft'}, {wax: 'hard'}, {snow: 'cold', wax: 'medium'}, {snow: 'wet', wax: 'soft'}],
};

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1440, height: 900, deviceScaleFactor: 1, mobile: false});
  await context.navigate('/tools/menu-check.html?flags=helicopter,lab,lab-tuning,heli-skiing');
  await context.waitFor(`!!window.__qaApp && document.querySelector('#view3d')?.dataset.vehicleAsset==='ready'`, 'menu ready', 90_000);
  await context.evaluate(`(() => { const app=window.__qaApp; app.audio.setMuted(true);
    app.profile={...app.profile, drivingLessons:{version:1,done:{corner:true}},
      heli:{...app.profile.heli,version:1,lessons:{liftoff:true,hover:true,landing:true,carry:true}}};
    app._saveProfile(); app.openLab();
    const style=document.createElement('style'); style.textContent='body > details {display:none!important}'; document.head.append(style); })()`);
  const canvas = `document.querySelector('.lab-canvas')`;
  await context.waitFor(`${canvas}?.dataset.labWalkReady === 'true'`, 'Lab ready', 60_000);
  for (const id of Object.keys(BENCH_SCRIPT)) {
    const start = Date.now(), machine = MODEL_OF_LESSON[id];
    const classroom = CLASSROOM_LESSONS[id];
    if (!classroom) throw Error(`${id} has no classroom registration.`);
    await context.evaluate(`document.querySelector('[data-go="${machine}"]').click()`);
    await context.waitFor(`${canvas}.dataset.labWalkArrived === ${JSON.stringify(machine)}`, `${id} machine reached`, 60_000);
    // The wind tunnel holds five lessons: it asks which one. Every other machine opens its lesson at once.
    if (machine === 'wind-tunnel') {
      await context.waitFor(`!!document.querySelector('[data-lab-lesson="start:${id}"]')`, `${id} choice`);
      await context.evaluate(`document.querySelector('[data-lab-lesson="start:${id}"]').click()`);
    }
    // The lesson's own scenario plays it through; this checks its live entry view.
    await context.waitFor(`JSON.parse(document.querySelector('.lab-classroom')?.dataset.classroom ?? 'null')?.step === ${JSON.stringify(classroom.steps[0].id)} && document.querySelectorAll('.lab-classroom .lc-progress li').length === 7`, `${id} opens`, 60_000);
    if (await context.evaluate(`!!document.querySelector('.lab-bench') || document.querySelector('.lab-teaching')?.hidden === false`)) throw Error(id + ': an old panel opened beside the classroom.');
    const opened = Date.now() - start;
    // Let the machine stage and the camera settle. The screenshot includes the lesson panel and the machine.
    await new Promise(resolve => setTimeout(resolve, 2500));
    await context.screenshot(`bench-${id}`);
    console.log(JSON.stringify({lesson: id, machine, issue: null, openMs: opened, wonder: classroom.steps[0].title}));
    await context.evaluate(`document.querySelector('[data-lc="leave"]').click()`);
    await context.waitFor(`document.querySelector('.lab-teaching')?.hidden !== false && !document.querySelector('.lab-bench') && !document.querySelector('.lab-classroom')`, `${id} closes`, 20_000);
  }
  await context.evaluate(`window.__qaApp.closeLab()`);
}
