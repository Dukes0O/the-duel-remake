import assert from 'node:assert/strict';
import {createBorerState, createBorerSurveyCache} from '../src/machines/borer.js';
import {displayedBorerSurvey, updateBorerSurvey} from '../src/machines/dig-game.js';
import {createDigSandbox, sendBorer, stepDigSandbox, teachBorerForCheck} from '../src/machines/dig-sandbox.js';
import {createGroundEdit} from '../src/world/ground-edit.js';

// Ground changes invalidate a stationary survey without sampling heights every frame.
{
  let reads = 0;
  const ground = createGroundEdit({region:{editable:true}, naturalHeight:(x,z)=>{
    reads++;
    return z >= 1 && z < 100 ? 10 : 0;
  }});
  const survey = createBorerSurveyCache(), position = {x:0,y:0,z:0,heading:0};
  const first = survey(ground, position, 'face');
  assert.equal(first.distanceM, 100);
  const beforeIdle = reads;
  assert.equal(survey(ground, position, 'face'), first);
  assert.equal(reads, beforeIdle, 'An idle survey does not read the ground again.');
  ground.fill({x:12,z:50,radius:0.5}, 'rock', 1);
  const beforeRemote = reads;
  assert.equal(survey(ground, position, 'face'), first);
  assert.equal(reads, beforeRemote, 'An edit beside the line does not resurvey it, even in the same ground section.');
  ground.fill({x:0,z:100,radius:0.5}, 'rock', 12.5);
  const updated = survey(ground, position, 'face');
  assert.equal(updated.distanceM, 101, 'An edit on the line updates the crossing.');
  ground.cut({x:0,z:50,radius:0.5}, 0);
  assert.equal(survey(ground, position, 'face').distanceM, 50, 'A cut updates the crossing too.');
}

console.log('Borer survey updates after ground edits and skips unrelated edits.');

// Exercise the Dig's displayed text and strip after both ways of starting a cut.
for (const delegated of [false, true]) {
  let dig = createDigSandbox({playerId:delegated ? 'survey-pupil' : 'survey-hand'});
  const parked = dig.borer;
  const x = parked.x + 30 * Math.sin(parked.heading), z = parked.z + 30 * Math.cos(parked.heading);
  const mouth = {x, z, y:dig.ground.heightAt(x,z), heading:parked.heading};
  dig = {...dig, activeMachine:'borer', mode:'work', borer:createBorerState(mouth)};
  const line = createBorerSurveyCache()(dig.ground, mouth, 'mesa');
  assert.ok(line);
  if (delegated) dig = sendBorer(teachBorerForCheck(dig), line);
  for (let i=0; i<120; i++)
    dig = stepDigSandbox(dig, {borerSurvey:line, controls:{forward:1/3, directLever:true}}, 1/60);
  assert.ok(dig.borer.started && dig.borer.distanceM > 0);
  const displayed = displayedBorerSurvey(dig, null);
  assert.equal(displayed, line, 'The cut retains the survey when the face survey is cleared.');
  const text = {};
  let strokes = 0;
  const ctx = {clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, fill(){}, stroke(){strokes++;}, fillRect(){}};
  const canvas = {hidden:false, getContext:()=>ctx};
  const panel = {querySelector:selector=>selector === 'p' ? text : canvas};
  const cache = {};
  updateBorerSurvey(panel, cache, displayed, {...dig.borer, daylightMessage:''});
  assert.match(text.textContent, /^Floor: .* Grade: .* m to go/);
  assert.equal(canvas.hidden, false);
  assert.ok(strokes > 0, 'The hill strip includes the cut.');
  const firstText = text.textContent;
  for (let i=0; i<180; i++)
    dig = stepDigSandbox(dig, {borerSurvey:line, controls:{forward:1/3, directLever:true}}, 1/60);
  updateBorerSurvey(panel, cache, displayedBorerSurvey(dig, null), dig.borer);
  assert.notEqual(text.textContent, firstText, 'The running survey changes as the cut advances.');
  updateBorerSurvey(panel, cache, displayed, {...dig.borer, daylightMessage:'Daylight. She is through.'});
  assert.equal(text.textContent, 'Daylight. She is through.');
  assert.equal(canvas.hidden, true);
}
console.log('The Dig shows the running survey and hill strip for hand and apprentice cuts.');
