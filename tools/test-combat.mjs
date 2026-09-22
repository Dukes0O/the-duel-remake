import assert from 'node:assert/strict';
import {Duel} from '../src/game.js';
import {App} from '../src/app.js';
import {createProfile,bestKey} from '../src/progression.js';
import {normalizeRaceSettings} from '../src/race-settings.js';
import {createLeaderboard,recordFinish} from '../src/leaderboard.js';
import {stepCombat,fireWeapon} from '../src/combat.js';
import {createCombatScene} from '../src/combat-scene.js';
globalThis.cancelAnimationFrame=()=>{};
const make=()=>{const d=new Duel({seed:1989});d.startCampaign({mode:'wasteland',startStage:0});d.state.status='racing';d.state.invulnerableSec=0;d.state.s=100;d.state.rival.s=150;return d;};
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
let d=make(),s=d.state;
check(s.mode==='wasteland'&&s.rival&&s.combat,'combat mode spawns a rival and weapons');
check(d.fireWeapon('ufo'),'UFO fires');check(s.s===150&&s.rival.s===100&&s.prevS===150,'UFO swaps and resets sweep origin');
check(!d.fireWeapon('ufo'),'UFO cannot spam');s.paused=true;const cd=s.combat.cooldowns.ufo;d.step(1);check(cd===s.combat.cooldowns.ufo&&!d.fireWeapon('star'),'pause freezes weapons');s.paused=false;
d=make();s=d.state;s.rival.s=90;d.fireWeapon('ufo');check(s.s>100&&s.s<d._lapGates[0],'forward warp stops before next checkpoint');
d=make();s=d.state;const r=s.rival;r.s=d.course.length+500;r.completedLaps=1;r.nextLapGate=1;d.fireWeapon('ufo');check(s.completedLaps===1&&s.nextLapGate===1&&r.completedLaps===0,'swap transfers valid route progress');
d=make();s=d.state;check(d.fireWeapon('star'),'star activates');const speed=s.speedMph=100;d._crash('rock',1,100);check(s.speedMph===speed&&s.stageCrashes===0,'star blocks crash damage');for(let i=0;i<99;i++)stepCombat(d,.05);check(s.combat.shield>0,'star lasts until five seconds');stepCombat(d,.05);check(s.combat.shield<1e-8,'star expires after five seconds');
d=make();s=d.state;check(d.fireWeapon('bomb')&&s.combat.projectiles.length===8,'bomb storm throws eight bombs');check(new Set(s.combat.projectiles.map(p=>Math.atan2(p.vx,p.vz).toFixed(2))).size===8,'bombs travel in eight directions');for(let i=0;i<40;i++)stepCombat(d,.05);check(s.combat.projectiles.length===0&&s.combat.bursts.length>0,'bombs expire into explosions');
d=make();s=d.state;s.rival.s=120;s.rival.lateral=s.lateral;s.rival.speedMph=100;check(d.fireWeapon('crossbow'),'crossbow fires');for(let i=0;i<10;i++)stepCombat(d,.02);check(s.combat.hits===1&&s.rival.speedMph<100&&Math.abs(s.rival.pushVelocity)>0,'swept arrow hits and shoves the opponent');
d=make();s=d.state;s.rival.s=120;s.rival.lateral=s.lateral;s.speedMph=100;fireWeapon(d,'star');fireWeapon(d,'crossbow',true);for(let i=0;i<10;i++)stepCombat(d,.02);check(s.speedMph===100,'shield blocks incoming arrows');
d=make();s=d.state;s.combat.aiTimer=0;stepCombat(d,.05);check(s.combat.projectiles.some(p=>p.enemy),'CPU shoots back');
d=make();s=d.state;for(let i=0;i<200;i++){fireWeapon(d,'bomb',true);stepCombat(d,.05);}check(s.combat.projectiles.length<=40&&s.combat.bursts.length<=32,'pools remain bounded');
const scene=createCombatScene();scene.update(d);check(scene.group.visible,'combat visuals are visible');d.startCampaign({mode:'duel'});scene.update(d);check(!scene.group.visible&&!d.state.combat&&!d.fireWeapon('bomb'),'ordinary mode disables combat and visuals');scene.dispose();
check(normalizeRaceSettings({mode:'wasteland'},createProfile()).mode==='wasteland','combat selection persists');
const app=new App();app.startCampaign({mode:'wasteland'});app.restart();check(app.duel.state.mode==='wasteland'&&app.duel.state.combat.projectiles.length===0,'restart keeps mode and resets weapons');app.dispose();
const base={stageIndex:0,seed:1989,laps:2,car:'falcone_f42',mode:'duel',completed:true,won:true,timeSec:150,cpuDifficulty:'easy',difficulty:'casual'};
check(bestKey(base)!==bestKey({...base,mode:'wasteland'}),'personal bests stay separate');
let board=recordFinish(createLeaderboard(),base,{id:'test',name:'Test'}).board;board=recordFinish(board,{...base,mode:'wasteland',timeSec:100},{id:'test',name:'Test'}).board;check(board.entries.length===2,'combat cannot replace ordinary leaderboard records');
const race=new App();race.autopilot=true;race.startCampaign({mode:'wasteland',car:'falcone_f42',cpuDifficulty:'easy'});race._scriptedCrashDone=true;
let lastFire=-1;
for(let i=0;i<5000&&['countdown','racing'].includes(race.duel.state.status);i++){
 const time=Math.floor(race.duel.state.stageTimeSec/12);
 if(time!==lastFire&&race.duel.state.status==='racing'){race.duel.fireWeapon('star');race.duel.fireWeapon('bomb');race.duel.fireWeapon('crossbow');race.duel.fireWeapon('ufo');lastFire=time;}
 race.advance(.1);
}
check(race.duel.state.results?.completed===true,'input-driven armed race completes with valid lap gates');
check(race.leaderboard.entries.some(row=>row.mode==='wasteland'),'actual race saves combat leaderboard mode');race.dispose();
console.log(`Combat: ${checks} lifecycle, shield, UFO, projectile, CPU, record and rendering checks passed.`);
