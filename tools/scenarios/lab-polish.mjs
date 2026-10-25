// LAB-POLISH: rounded dial inputs, readouts and every lesson's real bench view.
// The harness supplies a private origin and memory-only saves.
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
  await context.waitFor(`!!document.querySelector('.lab-canvas')`, 'Lab ready');
  for (const [id, runs] of Object.entries(BENCH_SCRIPT)) {
    const start = Date.now();
    await context.evaluate(`document.querySelector('[data-lab-lesson="start:${id}"]').click()`);
    await context.waitFor(`!!document.querySelector('.lab-bench[data-lesson="${id}"]')`, `${id} opens`);
    let firstReadout = null;
    for (const settings of runs) {
      await context.evaluate(`(() => { for (const [id,value] of Object.entries(${JSON.stringify(settings)})) {
        const el=document.querySelector('[data-lab-control="'+id+'"]');
        if(!el) throw Error('Missing control '+id);
        el.value=value;
        if(String(el.value)!==String(value)) throw Error('Unavailable dial value '+id+': '+value);
        el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true}));
      } document.querySelector('[data-lab="run"]').click(); })()`);
      await context.waitFor(`document.querySelector('.lab-readout')?.textContent.trim().length>0`, `${id} effect`);
      firstReadout ??= Date.now() - start;
    }
    // Let the normal camera glide finish. The screenshot includes the player's controls and readout.
    await new Promise(resolve => setTimeout(resolve, 2500));
    await context.screenshot(`bench-${id}`);
    const text = await context.evaluate(`document.querySelector('.lab-challenge').textContent.trim()`);
    if (text.includes('Finish the experiment')) throw Error(id+': experiment did not finish');
    console.log(JSON.stringify({lesson:id, experimentComplete:!text.includes('Finish the experiment'), issue:null, firstReadoutMs:firstReadout, experimentMs:Date.now()-start, challenge:text}));
    await context.evaluate(`document.querySelector('[data-lab="back"]').click()`);
  }
  await context.evaluate(`document.querySelector('[data-lab="close"]').click()`);
}
