// Five fixed views for Claude's review, not a scripted walk or a completion test.
// All profile changes stay inside the harness's memory-only tab.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  prepare: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is missing.');
    const app = window.__qaApp;
    const quality = document.querySelector('#graphics-quality');
    if (!quality) throw Error('The graphics setting is missing.');
    quality.value = 'performance';
    quality.dispatchEvent(new Event('change', {bubbles: true}));
    app.profile = {...app.profile,
      wasteland: {...app.profile.wasteland, version: 1, discoveredGate: true},
      story: {version: 1, ...app.profile.story, ember: {read: true, jobs: ['hot-delivery']}}};
    app._saveProfile();
    // A story job starts only from the yard, so the player goes there first.
    document.querySelector('#wasteland-visit').click();
  },
  yard: () => window.__qaApp?.isYardHomeActive?.() === true,
  start: () => { if (!window.__qaApp.everburnStep('get-out-and-walk')) throw Error('Light the Town did not start.'); },
  loaded: () => {
    let land;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    return window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'everburn-get-out-and-walk' &&
      land?.userData.assetStatus === 'ready' &&
      // The job's actors exist only once its own countdown has run out.
      window.__qaApp.duel.state.status === 'racing';
  },
  leaveCar: () => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    state.countdown = 0;
    state.arena.worldJob.job.stepState = {brandBriefed: true};
    duel.setInput({interact: true, throttle: 0, brake: 1});
    for (let tick = 0; tick < 240 && !state.onFoot; tick++) app.advance(1 / 60);
    duel.setInput({interact: false});
    if (!state.onFoot || !state.fighter) throw Error('The existing exit action did not create a fighter.');
  },
  scene: which => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const world = state.arena.worldJob, job = world.job, step = job.steps[0];
    if (which !== 'start') {
      // Fixed rule snapshots let the review inspect each drawing without adding a driver.
      Object.assign(state.fighter, step.hearth.position);
      Object.assign(job.stepState, {brandBriefed: true, brandsUsed: 1, brandSeconds: 70,
        brandElapsed: 20, dusk: 20 / 240});
    }
    if (which === 'opponent') {
      job.stepState.lamps = {[step.places[0].id]: true};
      app.advance(1 / 60);
    }
    if (which === 'lighting') {
      const lamp = step.places.find(place => place.id === 'mast');
      Object.assign(state.fighter, lamp.position, {x: lamp.position.x + 3.4});
      Object.assign(job.stepState, {lamps: {}, lightingLamp: lamp.id, lightingSeconds: 1});
    }
    if (which === 'ending') {
      job.stepState.lamps = Object.fromEntries(step.places.map(lamp => [lamp.id, true]));
      app.advance(1 / 60);
      if (!job.stepState.townEnding && !world.job.stepState.townEnding)
        throw Error('The third lamp did not start the ending.');
      app.advance(5.5);
    }
    app.onFrame?.(state, 0);
    const render = window.__render;
    render.renderFrame();
    const target = which === 'start' ? 'Auntie Solder at the forge'
      : which === 'brand' ? 'Carried town brand'
        : which === 'lighting' ? 'Town lamp: mast'
        : which === 'opponent' ? 'Town Ash Men' : 'The bellows thief';
    let node;
    render.scene.traverse(item => { if (item.name === target) node = item; });
    if (!node) throw Error(`The scene has no ${target}.`);
    node.updateWorldMatrix(true, false);
    const point = node.getWorldPosition(render.camera.position.clone());
    // The thief figure uses world-space instances; its parent stays at zero.
    if (which === 'ending') node.children[1].getWorldPosition(point);
    const actor = which === 'opponent' && world.actors.find(item => item.brandAsh);
    if (which === 'opponent') {
      if (!actor) throw Error('The first lamp did not bring an Ash Man.');
      point.set(actor.x, actor.y, actor.z);
    }
    const camera = render.camera;
    camera.position.set(point.x + 4, point.y + 3, point.z + 7);
    camera.lookAt(point.x, point.y + 1, point.z);
    camera.updateMatrixWorld(true);
    render.renderer.render(render.scene, camera);
    const projected = point.clone().add({x: 0, y: 1, z: 0}).project(camera);
    let visible = true;
    for (let parent = node; parent; parent = parent.parent) visible &&= parent.visible;
    const parts = [];
    node.traverse(part => {
      if (part.isMesh && part.visible && (!part.isInstancedMesh || part.count > 0)) parts.push(part.type);
    });
    const run = world.job.stepState;
    const gauge = document.querySelector('.world-hud-ember');
    const progress = document.querySelector('.combat-lamp-progress');
    const row = document.querySelector('.combat-foot-town');
    const ring = render.scene.getObjectByName('Lighting circle: mast');
    return {target, visible, parts: parts.length,
      inView: Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1 && Math.abs(projected.z) < 1,
      brandSeconds: run.brandSeconds ?? 0, brandsUsed: run.brandsUsed ?? 0,
      gauge: gauge && !gauge.hidden ? gauge.textContent : null,
      lighting: progress && !progress.hidden ? progress.textContent : null,
      lightingFill: progress?.querySelector('i')?.style.transform ?? null,
      lampRow: row && !row.hidden ? row.textContent : null,
      ring: ring?.visible === true,
      lamps: run.lamps ?? {}, opponents: world.actors.filter(item => item.brandAsh).length,
      endingElapsed: run.endingElapsed ?? null, theftStarted: run.theftStarted ?? false};
  },
};

// Each expression has its own function scope and is parsed before transmission.
export function pageSource(name, ...args) {
  const source = `(${pageFunctions[name].toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}

export async function run(context) {
  const report = {quality: 'performance', fixedSnapshots: true, pictures: [], failures: []};
  const page = (name, ...args) => context.evaluate(pageSource(name, ...args));
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-job2');
    await context.waitFor(pageSource('ready'), 'the memory-only menu', 60000);
    await page('prepare');
    await context.waitFor(pageSource('yard'), 'the yard', 60000);
    await page('start');
    await context.waitFor(pageSource('loaded'), 'Light the Town and its art', 120000);
    for (const which of ['start', 'brand', 'lighting', 'opponent', 'ending']) {
      if (which === 'brand') await page('leaveCar');
      const measured = await page('scene', which);
      report.pictures.push({name: which, ...measured});
      if (!measured.visible || !measured.inView || !measured.parts)
        report.failures.push(`${which}: the subject is not drawn inside the picture.`);
      if (which === 'brand' && (!measured.gauge?.includes('BRAND') || measured.brandSeconds <= 0))
        report.failures.push('brand: the burning brand and its gauge must be shown together.');
      if (which === 'opponent' && measured.opponents < 1)
        report.failures.push('opponent: no Ash Man has entered.');
      if (which === 'lighting' && (!measured.lighting?.includes('LIGHTING THE MAST LAMP') ||
          Number(/^scaleX\(([\d.]+)\)$/.exec(measured.lightingFill ?? '')?.[1]) !== .5 || !measured.lampRow?.includes('AT THE LAMP') || !measured.ring))
        report.failures.push('lighting: the half-filled bar, lamp row and ground ring must be shown together.');
      if (which === 'ending' && (!measured.theftStarted || Object.values(measured.lamps).filter(Boolean).length !== 3))
        report.failures.push('ending: the thief and three lit lamps must be present.');
      if (which === 'ending' && (measured.lighting || measured.ring))
        report.failures.push('ending: the lamp bar and dark-lamp ring must be hidden.');
      await context.screenshot(`everburn-job2-${which}`);
    }
  } catch (error) { report.failures.push(error.message); }
  if (report.pictures.length !== 5) report.failures.push('The review needs all five pictures.');
  await writeFile(join(context.outputDir, 'everburn-job2.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.failures.length) throw Error(report.failures.join('\n'));
}
