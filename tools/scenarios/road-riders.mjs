import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// The same three buttons on the memory-only menu stay available for the laptop's fights by hand.
export const reviewPath='/tools/menu-check.html?flags=hidden-road,story-everburn,road-riders,arsenal,arsenal-wave3,scablands-realism&road-riders-review=1';
export const readySource=`window.__qaApp?.duel.state.status === 'menu' && !!document.querySelector('[data-wash-fight]')`;
export const prepareSource = `document.querySelector('[data-wash-player]').click()`;
export const visitReadySource = `!!document.querySelector('#wasteland-visit') && !document.querySelector('#wasteland-visit').disabled`;
export const visitSource = `document.querySelector('#wasteland-visit').click()`;
export const yardSource = `window.__qaApp.isYardHomeActive()`;
export const fightSource = difficulty => `document.querySelector('[data-wash-fight="${difficulty}"]').click()`;
export const loadedSource = `window.__qaApp.duel.state.status === 'racing' && window.__qaApp.duel.state.arena?.worldJob?.definition.id === 'wash-road-riders' && window.__render.scene.getObjectByName('The Scablands')?.userData.assetStatus === 'ready'`;
export const stateSource=`({difficulty:window.__qaApp.duel.state.cpuDifficulty,riders:window.__qaApp.duel.state.arena.worldJob.riderFight.riders.length})`;

export async function run(context) {
  const results = [];
  for (const difficulty of ['easy','medium','hard']) {
    await context.navigate(reviewPath);
    await context.waitFor(readySource, 'the three memory-only review controls', 60000);
    await context.evaluate(prepareSource);
    await context.waitFor(visitReadySource, 'the temporary player can enter the Wasteland', 30000);
    await context.evaluate(visitSource);
    await context.waitFor(yardSource, 'the player reached the yard', 60000);
    await context.evaluate(fightSource(difficulty));
    await context.waitFor(loadedSource, 'the fight at the Wash', 120000);
    const state = await context.evaluate(stateSource);
    assert.deepEqual(state,{difficulty,riders:3});
    await context.screenshot('wash-'+difficulty);
    results.push(state);
  }
  await writeFile(join(context.outputDir,'road-riders.json'),JSON.stringify(results,null,2)+'\n');
}
