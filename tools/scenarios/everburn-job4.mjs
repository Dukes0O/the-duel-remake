// Four fixed, memory-only pictures for Claude. This does not drive the job.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  prepare: () => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is missing.');
    const app = window.__qaApp, quality = document.querySelector('#graphics-quality');
    quality.value = 'performance';
    quality.dispatchEvent(new Event('change', {bubbles:true}));
    app.profile = {...app.profile, wasteland:{...app.profile.wasteland,version:1,discoveredGate:true},
      story:{...app.profile.story,version:1,ember:{read:true,
        jobs:['hot-delivery','get-out-and-walk','run-him-down']}}};
    app._saveProfile();
    document.querySelector('#wasteland-visit').click();
  },
  yard: () => window.__qaApp?.isYardHomeActive?.() === true,
  start: () => { if (!window.__qaApp.everburnStep('slow-ride')) throw Error('Slow Ride did not start.'); },
  loaded: () => {
    let land;
    window.__render.scene.traverse(node => { if (node.name === 'The Scablands') land = node; });
    return window.__qaApp.duel.state.status === 'racing' &&
      window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'everburn-slow-ride' &&
      land?.userData.assetStatus === 'ready';
  },
  scene: which => {
    const app = window.__qaApp, duel = app.duel, state = duel.state, world = state.arena.worldJob;
    const step = world.job.steps[0], bess = world.actors.find(actor => actor.id === step.actorId);
    if (!bess) throw Error('Big Bess is missing.');
    const placeCar = (x,z) => {
      const pose = duel.course.nearest(x,z);
      state.s = pose.s; state.lateral = pose.lateral; state.speedMph = 0;
    };
    let subject = step.meeting.position, distance = 22;
    if (which === 'leak') {
      world.job.stepState = {...world.job.stepState,gasLoaded:true,gas:79,holes:1};
      subject = bess.position;
      distance = 12;
    }
    if (which === 'block') {
      world.job.stepState = {...world.job.stepState,gasLoaded:true,holes:0};
      subject = step.blocks[0].position;
      distance = 150;
      placeCar(subject.x-Math.sin(step.blocks[0].heading)*distance,
        subject.z-Math.cos(step.blocks[0].heading)*distance);
    }
    if (which === 'arrival') {
      world.job.stepState = {...world.job.stepState,gasLoaded:true,gas:85,holes:0,
        clearedBlocks:step.blocks.map(block => block.id)};
      Object.assign(bess.position, step.destination.position);
      bess.pathIndex = step.path.length - 1;
      bess.pathProgress = 1;
      bess.atDestination = true;
      world.follow.speed = 0;
      placeCar(bess.position.x,bess.position.z+6);
      duel.setInput({throttle:0,brake:1,steer:0,interact:false});
      app.advance(1 / 60);
      if (!world.arrivalHold) throw Error('The arrival hold did not start.');
      // Take the still during the nine-second hold, with the fire fully caught.
      for (let tick = 0; tick < 360; tick++) app.advance(1 / 60);
      subject = step.gasTank.position;
      distance = 24;
    }
    app.onFrame?.(state,0);
    const render = window.__render;
    render.renderFrame();
    const camera = render.camera, point = camera.position.clone();
    point.set(subject.x, subject.y ?? bess.position.y ?? 0, subject.z);
    if (which === 'block') {
      const heading = step.blocks[0].heading;
      camera.position.set(point.x - Math.sin(heading) * distance, point.y + 5,
        point.z - Math.cos(heading) * distance);
    } else camera.position.set(point.x + distance, point.y + 8, point.z + distance / 2);
    camera.lookAt(point.x, point.y + 1, point.z);
    camera.updateMatrixWorld(true);
    render.renderer.render(render.scene,camera);
    let forgeVisible = false;
    render.scene.traverse(node => {
      if (node.name !== "Tin Town's forge and crane") return;
      forgeVisible = true;
      for (let parent=node;parent;parent=parent.parent) forgeVisible &&= parent.visible;
    });
    // Hold the aimed picture over the game's next frames until the screenshot.
    document.getElementById('slow-ride-still')?.remove();
    const still = document.createElement('img');
    still.id = 'slow-ride-still';
    still.src = render.renderer.domElement.toDataURL('image/png');
    const rect = render.renderer.domElement.getBoundingClientRect();
    Object.assign(still.style,{position:'fixed',left:`${rect.left}px`,top:`${rect.top}px`,
      width:`${rect.width}px`,height:`${rect.height}px`,zIndex:'1',pointerEvents:'none'});
    document.body.append(still);
    const gauge = document.querySelector('.world-hud-ember');
    return {gas:world.job.stepState.gas,holes:world.job.stepState.holes,
      gasLoaded:!!world.job.stepState.gasLoaded,hold:!!world.arrivalHold,
      forgeGasShare:world.forgeGasShare ?? null,forgeVisible,
      gauge:gauge && !gauge.hidden ? gauge.textContent : null, distance};
  },
};

export function pageSource(name, ...args) {
  const source = `(${pageFunctions[name].toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}

export async function run(context) {
  const report = {quality:'performance',fixedSnapshots:true,pictures:[],failures:[]};
  const page = (name,...args) => context.evaluate(pageSource(name,...args));
  try {
    await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,warlord-cards&harness=everburn-job4');
    await context.waitFor(pageSource('ready'),'the memory-only menu',60000);
    await page('prepare');
    await context.waitFor(pageSource('yard'),'the yard',60000);
    await page('start');
    await context.waitFor(pageSource('loaded'),'Slow Ride and its art',120000);
    for (const which of ['meeting','leak','block','arrival']) {
      const measured = await page('scene',which);
      report.pictures.push({name:which,...measured});
      if (which === 'meeting' && measured.gasLoaded) report.failures.push('The meeting must show the hose and Moss.');
      if (which === 'leak' && (measured.holes !== 1 || !measured.gauge?.includes('GAS')))
        report.failures.push('The leaking tank and gas gauge must be shown together.');
      if (which === 'arrival' && (!measured.hold || measured.forgeGasShare <= 0 || !measured.forgeVisible))
        report.failures.push('The arrival must show the hold and the rising forge fire.');
      await context.screenshot(`everburn-job4-${which}`);
    }
  } catch (error) { report.failures.push(error.message); }
  if (report.pictures.length !== 4) report.failures.push('The review needs all four pictures.');
  await writeFile(join(context.outputDir,'everburn-job4.json'),JSON.stringify(report,null,2)+'\n');
  if (report.failures.length) throw Error(report.failures.join('\n'));
}
