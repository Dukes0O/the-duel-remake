import assert from 'node:assert/strict';
import {normalizeWeapons,purchaseWeaponUpgrade,WEAPON_IDS} from '../src/weapon-upgrades.js';
import {createProfile,normalizeProfile,bestKey} from '../src/progression.js';
import {Duel} from '../src/game.js';
import {createLeaderboard,recordFinish} from '../src/leaderboard.js';
let p={...createProfile(),credits:20000};
for(const id of WEAPON_IDS){for(let level=1;level<=3;level++){const r=purchaseWeaponUpgrade(p,id);assert.ok(r.ok);p=r.profile;assert.equal(p.weapons.levels[id],level);}assert.equal(purchaseWeaponUpgrade(p,id).ok,false);}
assert.equal(p.credits,11000);assert.equal(purchaseWeaponUpgrade(createProfile(),'ufo').ok,false);
assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(p))).weapons,p.weapons);
assert.deepEqual(normalizeWeapons({levels:{ufo:99,bomb:-4,crossbow:NaN,star:1.9}}).levels,{ufo:3,bomb:0,crossbow:0,star:1});
const d=new Duel();d.startCampaign({mode:'wasteland',weaponLevels:p.weapons.levels});d.state.status='racing';
assert.ok(d.fireWeapon('bomb'));assert.equal(d.state.combat.projectiles.length,14);assert.equal(d.state.combat.cooldowns.bomb,9*.55);
assert.ok(d.fireWeapon('star'));assert.equal(d.state.combat.shield,5);assert.equal(d.state.combat.cooldowns.star,16*.55);
const result={stageIndex:0,seed:1989,laps:2,car:'falcone_f42',mode:'wasteland',completed:true,won:true,timeSec:150,cpuDifficulty:'easy',difficulty:'casual'};
assert.notEqual(bestKey(result),bestKey({...result,weaponLevels:p.weapons.levels}));
let board=recordFinish(createLeaderboard(),result,{id:'test',name:'Test'}).board;
board=recordFinish(board,{...result,weaponLevels:p.weapons.levels,timeSec:100},{id:'test',name:'Test'}).board;
assert.equal(board.entries.length,2);assert.deepEqual(board.entries[1].weaponLevels,p.weapons.levels);
console.log('Weapon upgrades: purchases, caps, migration, max-level combat and record isolation pass.');
