import assert from 'node:assert/strict';
import test from 'node:test';
import {availableCarWeapons,equipCarWeapon,getCarLoadout} from '../src/car-loadout.js';
import {normalizeWasteland} from '../src/wasteland-progress.js';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {keyboardAction,gamepadEdgeActions} from '../src/input-contexts.js';

const base=['ufo','bomb','crossbow','star'];
const profile=()=>({credits:1000,wasteland:normalizeWasteland()});

test('four saved slots stay unique and swapping preserves the other player',()=>{
  const first=profile(),second=profile();
  assert.deepEqual(getCarLoadout(first),base);
  const moved=equipCarWeapon(first,0,'star');
  assert.equal(moved.ok,true);
  assert.deepEqual(moved.loadout,['star','bomb','crossbow','ufo']);
  assert.deepEqual(moved.profile.wasteland.loadout,moved.loadout);
  assert.deepEqual(getCarLoadout(second),base);
  assert.deepEqual(getCarLoadout(moved.profile),moved.loadout);
  assert.deepEqual(getCarLoadout({wasteland:{loadout:['star','star','invalid']}}),
    ['star','ufo','bomb','crossbow']);
});

test('unimplemented, locked and future-save weapons cannot enter the loadout',()=>{
  const saved=profile();
  assert.deepEqual(availableCarWeapons(saved),base);
  for(const id of ['oil','not-a-weapon']){
    const result=equipCarWeapon(saved,1,id);
    assert.equal(result.ok,false);
    assert.equal(result.profile,saved);
  }
  assert.equal(equipCarWeapon(saved,4,'ufo').ok,false);
  assert.equal(equipCarWeapon({...saved,wasteland:{...saved.wasteland,version:2}},
    0,'star').ok,false);
});

test('car keys and D-pad use the selected slots only in Wasteland2',()=>{
  const selected=['star','crossbow','bomb','ufo'];
  const duel=new Duel({seed:1989,featureFlags:{wasteland2:true}});
  duel.startCampaign({mode:'wasteland',startStage:0,seed:1989,
    weaponLoadout:selected});
  assert.deepEqual(duel.state.weaponLoadout,selected);
  const fired=[];
  const app={duel:{state:duel.state,fireWeapon:id=>fired.push(id)}};
  for(const code of ['Digit1','Digit2','Digit3','Digit4'])
    App.prototype._inputAction.call(app,keyboardAction('car',code));
  assert.deepEqual(fired,selected);
  const pad=Array(16).fill(false),previous=Array(16).fill(false);
  pad[12]=true;
  const [action]=gamepadEdgeActions('car',pad,previous);
  App.prototype._inputAction.call(app,action);
  assert.equal(fired.at(-1),'star');

  const ordinary=new Duel({seed:1989,featureFlags:{wasteland2:false}});
  ordinary.startCampaign({mode:'wasteland',startStage:0,seed:1989,
    weaponLoadout:selected});
  assert.equal(ordinary.state.weaponLoadout,null);
  app.duel.state=ordinary.state;
  App.prototype._inputAction.call(app,keyboardAction('car','Digit1'));
  assert.equal(fired.at(-1),'ufo');
});
