// SHIPS-DECKS: fixed views of the night storm and the climbing plates for Claude's look review, not a completion test.
// Memory-only storage. The ships, the lighthouse and Deck Town are not drawn yet (SHIPS-SCENE); these pictures judge the
// storm itself (the dust, the short sight, the night light and the lighthouse beam) and where the fighter stands on a plate.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export const pageFunctions = {
  ready: () => window.__qaApp?.duel.state.status === 'menu' && !!window.__render,
  // `stormy` false runs the same views in clear air, for side-by-side pictures.
  start: (quality, stormy) => {
    if (!window.name.startsWith('__duel_qa_tab_v2:')) throw Error('Memory-only storage is missing.');
    const select = document.querySelector('#graphics-quality');
    select.value = quality;
    select.dispatchEvent(new Event('change', {bubbles: true}));
    const app = window.__qaApp, duel = app.duel;
    app.audio.setMuted?.(true);
    duel.state.wastelandGateDiscovered = true;
    const weather = stormy ? {weather: 'dust-night'} : {};
    const lighthouse = {id: 'lighthouse-door', position: {x: 170, y: -.5, z: -395}, radius: 18};
    const steps = [
      {kind: 'rescue', what: 'Steer by the beam. Pick up two lookouts, then reach the lighthouse.', seats: 2, boardSeconds: 1.5, radius: 10,
        stopSpeed: .5, people: [{id: 'lost-lookout-1', position: {x: 70, y: -2, z: -385}, radius: 10}], home: lighthouse, homeRadius: 18, ...weather},
      {kind: 'onfoot', what: 'Climb the lighthouse stairs behind Vesper.', radius: 3, climbs: true, ...weather,
        // A second place nobody reaches, so standing in the lamp room does not finish the step (and its weather) mid-picture.
        places: [{id: 'lamp-room', position: {x: 170, y: 24, z: -397}, radius: 3, action: 'use'},
          {id: 'not-reached', position: {x: 170, y: -.5, z: -300}, radius: 1, action: 'use'}]},
    ];
    if (!duel.startArenaEvent({venueId: 'scablands', mode: 'world-job', car: 'falcone_f42', seed: 1989, cpuDifficulty: 'easy',
      opponents: [], weaponLoadout: ['bomb'], arsenalRank: 9, job: {id: 'ships-decks-look', seed: 1989, steps}}))
      throw Error('The storm job did not start.');
  },
  loaded: () => {
    const land = window.__render.scene.getObjectByName('The Scablands');
    return land?.userData.assetStatus === 'ready' && window.__qaApp.duel.state.status === 'racing';
  },
  // Put the car (or the fighter, on a plate) at a point, facing the lighthouse, and let the light and the dust settle.
  view: (where, at, seconds) => {
    const app = window.__qaApp, duel = app.duel, state = duel.state;
    const lamp = {x: 170, z: -394.5};
    if (where === 'car') {
      const near = duel.course.nearest(at.x, at.z);
      Object.assign(state, {s: near.s, prevS: near.s, lateral: near.lateral, prevLateral: near.lateral, speedMph: 0});
      const road = duel.course.groundAt(near.s, near.lateral);
      state.headingError = Math.atan2(lamp.x - at.x, lamp.z - at.z) - road.heading;
    } else {
      const job = state.arena.worldJob.job;
      state.arena.worldJob.job = {...job, stepIndex: 1, stepState: {index: 0, plate: at.plate, fHeld: false}};
      if (!state.onFoot) {
        duel.setInput({interact: true, throttle: 0, brake: 1});
        for (let tick = 0; tick < 240 && !state.onFoot; tick++) app.advance(1 / 60);
        duel.setInput({interact: false, brake: 0});
      }
      if (!state.onFoot) throw Error('The fighter did not leave the car.');
      const near = duel.course.nearest(at.x, at.z);
      Object.assign(state.fighter, {x: at.x, y: at.y, z: at.z, groundY: at.y, s: near.s, lateral: near.lateral,
        yaw: Math.atan2(lamp.x - at.x, lamp.z - at.z), pitch: at.pitch ?? 0, deckPlate: at.plate});
      state.arena.worldJob.job = {...state.arena.worldJob.job, stepState: {index: 0, plate: at.plate, fHeld: false}};
    }
    for (let i = 0; i < seconds * 60; i++) app.advance(1 / 60);
    window.__render.renderFrame?.();
    return true;
  },
  facts: () => {
    const {scene} = window.__render, host = document.querySelector('#view3d'), state = window.__qaApp.duel.state;
    const storm = scene.getObjectByName('Night storm'), beam = scene.getObjectByName('Lighthouse beam');
    return {storm: storm?.visible === true, beam: !!beam && storm?.visible === true, dust: scene.getObjectByName('Blowing dust')?.visible === true,
      fogNear: scene.fog?.near, fogFar: scene.fog?.far, mood: host?.dataset.lightingMood,
      fighterY: state.fighter?.y ?? null, plate: state.fighter?.deckPlate ?? null};
  },
};

export function pageSource(name, ...args) {
  const source = `(${pageFunctions[name].toString()})(...${JSON.stringify(args)})`;
  new Function(`return ${source}`);
  return source;
}

const VIEWS = [
  ['drive', 'car', {x: 70, z: -385}, 8],
  ['mast-top', 'foot', {x: 12, y: 18, z: -462, plate: 'patience-mast-top', pitch: -.08}, 4],
  ['lamp-room', 'foot', {x: 170, y: 24, z: -395, plate: 'lamp-room', pitch: -.25}, 4],
];

export async function run(context) {
  const report = {pictures: [], failures: [], lookAt: [
    'The storm reads as night in thick dust: dark, brown, sight short, the car and road still readable close by.',
    'The beam shows through the dust and sweeps steadily, once in 12 seconds, so a child could steer toward it.',
    'The dust blows past the camera without hiding the HUD line or looking like snow or rain.',
    'Compare each stormy picture with its clear-air twin: same place, same car, only the weather differs.',
    'From the mast top and the lamp room the fighter stands at the plate height (18 m and 24 m); nothing is drawn under them yet (SHIPS-SCENE).',
  ]};
  const page = (name, ...args) => context.evaluate(pageSource(name, ...args));
  for (const quality of ['performance', 'high']) for (const stormy of [true, false]) {
    await context.navigate('/tools/menu-check.html?flags=wasteland-town&harness=ships-decks');
    await context.waitFor(pageSource('ready'), 'the memory-only menu', 60000);
    await page('start', quality, stormy);
    await context.waitFor(pageSource('loaded'), 'the Scablands and the storm job', 120000);
    for (const [name, where, at, seconds] of VIEWS) {
      await page('view', where, at, seconds);
      const facts = await page('facts');
      const picture = `ships-decks-${name}-${stormy ? 'storm' : 'clear'}-${quality}`;
      report.pictures.push({picture, quality, stormy, ...facts});
      if (stormy && (!facts.storm || !facts.beam || !facts.dust)) report.failures.push(`${picture}: the storm, its beam or its dust is not drawn.`);
      if (stormy && !(facts.fogFar <= 70)) report.failures.push(`${picture}: the fog does not close in (far ${facts.fogFar}).`);
      if (stormy && facts.mood !== 'night') report.failures.push(`${picture}: the light is ${facts.mood}, not night.`);
      if (!stormy && facts.storm) report.failures.push(`${picture}: the storm shows in clear air.`);
      if (where === 'foot' && facts.fighterY !== at.y) report.failures.push(`${picture}: the fighter is at ${facts.fighterY} m, not on the plate at ${at.y} m.`);
      await context.screenshot(picture);
    }
  }
  await writeFile(join(context.outputDir, 'look.json'), JSON.stringify(report, null, 2) + '\n');
  if (report.failures.length) throw Error('Ships decks look facts failed: ' + report.failures.join(' | '));
}
