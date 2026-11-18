// At this hollow the uncut horizon is 1.388 m above the car's support.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pageSource as jobPage} from './everburn-job3.mjs';

function inspectHollow() {
  const app = window.__qaApp, duel = app.duel, state = duel.state;
  const {scene, camera, renderer, renderFrame} = window.__render;
  const x = 5098.29, z = 1666.11, pose = duel.course.nearest(x, z);
  const ground = duel.course.groundAt(pose.s, pose.lateral).y;
  app.stop();
  Object.assign(state, {s:pose.s, prevS:pose.s, lateral:pose.lateral, prevLateral:pose.lateral,
    onFoot:false, fighter:null, speedMph:0, pushVelocity:0, yawVelocity:0,
    groundHeight:ground, prevGroundHeight:ground, airHeight:0, airborne:false});
  app.inspectionCamera = {position:[x + 6, ground + 3.4, z + 8], target:[x, ground + .72, z]};
  app.advance(1 / 60);
  app.onFrame?.(state, 0);
  // The usual view streams one road piece at a time. Build the local surface before the pictures.
  const land = scene.getObjectByName('The Scablands');
  while (land.userData.roads.update(x, z)) {}
  camera.position.fromArray(app.inspectionCamera.position);
  renderFrame();
  camera.position.fromArray(app.inspectionCamera.position);
  camera.lookAt(...app.inspectionCamera.target);
  camera.updateMatrixWorld(true);
  const near = land.getObjectByName('Scablands near ground');
  const far = land.getObjectByName('Scablands far ground');
  const player = scene.children.find(node => node.visible && node.userData.vehicleKey === state.car &&
    Math.hypot(node.position.x - x, node.position.z - z) < 1);
  if (!player) throw Error('The camera did not find the player car at the measured hollow.');
  const gl = renderer.getContext();
  const width = Math.max(1, Math.floor(gl.drawingBufferWidth * .16));
  const height = Math.max(1, Math.floor(gl.drawingBufferHeight * .16));
  const left = Math.floor((gl.drawingBufferWidth - width) / 2);
  const bottom = Math.floor((gl.drawingBufferHeight - height) / 2);
  function pixels() {
    renderer.render(scene, camera);
    const data = new Uint8Array(width * height * 4);
    gl.readPixels(left, bottom, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return data;
  }
  function difference(a, b) {
    let count = 0;
    for (let i = 0; i < a.length; i += 4) {
      if (Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])) > 4) count++;
    }
    return count;
  }
  const original = pixels();
  const nearProgram = renderer.properties.get(near.material).currentProgram?.id;
  const farProgram = renderer.properties.get(far.material).currentProgram?.id;
  try {
    far.visible = false;
    const hiddenHorizon = pixels();
    player.visible = false;
    const hiddenCar = pixels();
    return {x, z, ground, pixels:width * height, nearProgram, farProgram,
      horizonPixels:difference(original, hiddenHorizon), carPixels:difference(hiddenHorizon, hiddenCar)};
  } finally {
    far.visible = true;
    player.visible = true;
    renderer.render(scene, camera);
  }
}

export const hollowSource = `(${inspectHollow.toString()})()`;
export async function run(context) {
  await context.navigate('/tools/menu-check.html?flags=hidden-road,story-everburn,scablands-realism,warlord-cards&harness=scablands-land');
  await context.waitFor(jobPage('ready'), 'the memory-only menu', 60000);
  await context.evaluate(jobPage('prepare'));
  await context.waitFor(jobPage('yard'), 'the yard', 60000);
  await context.evaluate(jobPage('start'));
  await context.waitFor(jobPage('loaded'), 'Run Him Down and its art', 120000);
  const result = await context.evaluate(hollowSource);
  await context.screenshot('tin-road-hollow');
  await writeFile(join(context.outputDir, 'scablands-land.json'), JSON.stringify(result, null, 2) + '\n');
  assert.ok(Number.isInteger(result.nearProgram) && Number.isInteger(result.farProgram), 'Both materials must draw.');
  assert.notEqual(result.nearProgram, result.farProgram, 'The clipped horizon needs its own WebGL program.');
  assert.ok(result.carPixels > result.pixels * .05, 'The car must contribute visible pixels at the measured spot.');
  assert.equal(result.horizonPixels, 0, 'Hiding the distant horizon must not change the car or the local ground.');
}
