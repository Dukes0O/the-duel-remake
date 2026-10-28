// Private browser check for the helicopter (HELI-HOOKS, docs/HELICOPTER.md):
// from the main menu's HELIPAD button to Tremblant Woods, the free first
// tank, a lift-off and the four camera views. Saves are memory-only. Run:
//   node tools/browser-harness.mjs scenario heli-first-flight
const entry = '/tools/menu-check.html?flags=helicopter';

export async function run(context) {
  await context.command('Emulation.setDeviceMetricsOverride', {width: 1280, height: 720, deviceScaleFactor: 1, mobile: false});
  await context.navigate(entry);
  await context.waitFor(`document.readyState==='complete' && !!window.__qaApp &&
    document.querySelector('#view3d')?.dataset.vehicleAsset==='ready' && !document.querySelector('#start-engine')?.disabled`,
  'menu ready', 90_000);
  // An Enzo owner on a course the Enzo has not been flown to: START is
  // closed and the note says why (special cars travel only by air).
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'ferrari_enzo'])]};
    app._saveProfile(); app.menuCar = 'ferrari_enzo'; })()`);
  await context.waitFor(`document.querySelector('.start-note')?.textContent.includes('travels only by air') && document.querySelector('#start-engine').disabled`,
    'the air-only note on the menu', 30_000);
  await context.screenshot('menu-air-only-note');
  await context.evaluate(`(() => { const app = window.__qaApp;
    app.profile = {...app.profile, unlockedCars: [...new Set([...app.profile.unlockedCars, 'koenigsegg_jesko'])]};
    app._saveProfile(); app.menuCar = 'koenigsegg_jesko'; })()`);
  await context.waitFor(`!document.querySelector('.start-note')?.textContent.includes('travels only by air') && !document.querySelector('#start-engine').disabled`,
    'the note goes with another car', 60_000);
  const button = await context.evaluate(`(() => { const b = document.querySelector('#heli-visit'); return b && !b.hidden; })()`);
  if (!button) throw Error('The HELIPAD button is not shown with the helicopter switch on.');
  await context.evaluate(`(() => { window.__qaApp.audio.setMuted?.(true); document.querySelector('#heli-visit').click(); })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'helipad scene', 120_000);
  const fuel = await context.evaluate(`window.__qaApp.heliBuyFuel().cost`);
  if (fuel !== 0) throw Error(`The first tank should be free, it cost ${fuel}`);
  await context.screenshot('heli-pad');
  // A new pilot: the instructor's board, then lesson 1 from its button. The landed
  // panel (HELI-LANDED) carries the same class, so the board is found by its label.
  const instructor = await context.evaluate(`(() => { const panel = document.querySelector('.heli-lessons[aria-label="Instructor"]');
    return !!panel && panel.textContent.includes('INSTRUCTOR') && !!document.querySelector('[data-heli-lesson="skip"]'); })()`);
  if (!instructor) throw Error('The instructor board with the skip button should show for a new pilot on the pad.');
  await context.evaluate(`document.querySelector('[data-heli-lesson="start:liftoff"]').click()`);
  await context.waitFor(`window.__qaApp.heliView().lesson?.id === 'liftoff'`, 'lesson 1 running', 10_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {KeyW: true}; })()`);
  await context.waitFor(`(() => { const v = window.__qaApp.heliView(); return v.heli.y - v.heli.groundY > 12; })()`, 'lift-off to 12 m', 30_000);
  await context.evaluate(`(() => { window.__qaApp.keys = {}; })()`);
  await new Promise(resolve => setTimeout(resolve, 600));
  await context.screenshot('heli-lesson');
  const views = ['behind', 'cockpit', 'cable', 'side'];
  for (let index = 0; index < 4; index++) {
    await context.evaluate(`(() => { window.__qaApp.heliCamera = ${index}; })()`);
    await new Promise(resolve => setTimeout(resolve, 600));
    await context.screenshot(`heli-view-${views[index]}`);
  }
  const state = await context.evaluate(`(() => { const v = window.__qaApp.heliView(); return {phase: v.phase, height: v.heli.y - v.heli.groundY, fuel: v.heli.fuelKg, course: v.courseId}; })()`);
  if (state.phase !== 'flying' || state.course !== 'tremblant-woods' || !(state.height > 10)) throw Error(`Unexpected flight ${JSON.stringify(state)}`);
  // The pause screen: back to flying or the menu, no restart.
  await context.evaluate(`window.__qaApp._inputAction('pause')`);
  await new Promise(resolve => setTimeout(resolve, 400));
  const pause = await context.evaluate(`document.body.innerText.includes('BACK TO FLYING') && !document.body.innerText.includes('RESTART RUN')`);
  await context.screenshot('heli-pause');
  if (!pause) throw Error('The helicopter pause screen should offer BACK TO FLYING and no RESTART RUN.');
  await context.evaluate(`window.__qaApp._inputAction('pause')`);
  // Carry lesson: fly native session inputs to a grounded, hooked crate.
  // Prepare only this throwaway memory profile with lessons 1-3 complete.
  await context.evaluate(`(() => {
    const app = window.__qaApp; app.returnToMenu();
    app.profile = {...app.profile, heli: {...app.profile.heli, fuelKg: 300,
      lessons: {liftoff: true, hover: true, landing: true, carry: false}}};
    app._saveProfile(); app.visitHeli();
  })()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='heli' && window.__qaApp.visualReady`, 'carry practice at the home pad', 120_000);
  await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession;
    const pilot = (v, t, speed = 4) => {
      const h = v.heli, fx = Math.sin(h.heading), fz = Math.cos(h.heading);
      const dx = t.x - h.x, dz = t.z - h.z, d = Math.hypot(dx, dz), want = Math.min(speed, d * .4);
      const ex = (d > .01 ? dx / d * want : 0) - h.vx, ez = (d > .01 ? dz / d * want : 0) - h.vz;
      const clamp = n => Math.max(-1, Math.min(1, n));
      return {pitch: clamp((ex * fx + ez * fz) * .25), roll: clamp((-ex * fz + ez * fx) * .25),
        lift: t.y === undefined ? -1 : clamp((t.y - h.y) * .3 - h.vy * .3), yaw: 0};
    };
    const fly = (seconds, target, speed, until) => {
      for (let i = 0; i < seconds * 120; i++) {
        const v = session.view();
        app._heliEvents(session.step(pilot(v, target(v), speed)));
        if (until?.(session.view())) return;
      }
    };
    const started = session.startLesson('carry');
    if (!started.ok) throw Error('Could not start the carrying lesson: ' + started.reason);
    const crate = session.view().loads.find(l => l.id === 'crate'), target = session.view().lesson.target;
    fly(60, () => ({...crate, y: crate.y + 15.2}), 3, v => Math.hypot(v.heli.x - crate.x, v.heli.z - crate.z) < 1 && Math.abs(v.heli.y - crate.y - 15.2) < .6 && Math.hypot(v.heli.vx, v.heli.vz) < .5);
    if (session.pressHook()?.type !== 'hooked') throw Error('Could not hook the practice crate');
    fly(10, v => ({x: v.heli.x, z: v.heli.z, y: v.heli.groundY + 40}), 4);
    fly(120, () => ({...target, y: target.y + 40}), 8, v => Math.hypot(v.heli.x - target.x, v.heli.z - target.z) < 2 && Math.hypot(v.heli.vx, v.heli.vz) < .6);
    fly(60, () => ({...target, y: target.y + .7 + 14.6}), 1, v => v.lesson?.guidance?.ready);
    if (!session.view().lesson?.guidance?.ready) throw Error('The carried crate did not reach the green state');
    app.heliCamera = 0;
    document.querySelector('details')?.removeAttribute('open');
  })()`);
  await context.waitFor(`document.querySelector('.heli-carry-guidance')?.textContent === 'On the mark. Press H to let go.'`, 'green carry guidance', 10_000);
  await context.screenshot('heli-carry-green');
  await context.evaluate(`(() => {
    const app = window.__qaApp, session = app.heliSession;
    session.pressHook(); app._heliEvents(session.step({}));
    if (session.view().lesson) throw Error('Green crate release should pass');
  })()`);
  if (process.env.HELI_FROM_ABOVE !== '0') {
    // Each destination from 150 m: climb at home, then cruise to the others.
    await context.evaluate(`(() => { window.__qaApp.heliCamera = 0; window.__qaApp.keys = {KeyW: true}; })()`);
    await context.waitFor(`(() => { const v = window.__qaApp.heliView(); return v.heli.y - v.zone.y > 150; })()`, 'climb to 150 m', 90_000);
    await context.evaluate(`(() => { window.__qaApp.keys = {}; })()`);
    await new Promise(resolve => setTimeout(resolve, 800));
    await context.screenshot('heli-above-tremblant-woods');
    for (const place of ['tremblant-snow', 'panorama-ridge']) {
      await context.evaluate(`(() => { const app = window.__qaApp; app.heliSetDestination(${JSON.stringify(place)});
        if (!app.heliSession.autopilotOn) app._inputAction('heli-autopilot'); })()`);
      await context.waitFor(`window.__qaApp.heliSession.cruiseOffered`, `out of the area toward ${place}`, 240_000);
      await context.evaluate(`window.__qaApp._inputAction('heli-cruise')`);
      await context.waitFor(`window.__qaApp.heliView().courseId === ${JSON.stringify(place)} && window.__qaApp.visualReady`, `arrive at ${place}`, 120_000);
      await new Promise(resolve => setTimeout(resolve, 1200));
      await context.screenshot(`heli-above-${place}`);
    }
  }
  await context.evaluate(`window.__qaApp.returnToMenu()`);
  await context.waitFor(`window.__qaApp.duel.state.status==='menu' && window.__qaApp.heliSession===null`, 'back to the menu', 30_000);
  console.log(`Helicopter first flight: ${JSON.stringify(state)}`);
}
