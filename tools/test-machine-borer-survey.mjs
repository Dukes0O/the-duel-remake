import assert from 'node:assert/strict';
import {createBorerSurveyCache} from '../src/machines/borer.js';
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
