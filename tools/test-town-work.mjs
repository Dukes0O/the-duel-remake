import assert from 'node:assert/strict';
import {advanceWork, createBuildingWorkOrder, createRouteWorkOrder, createWorkOrder, prioritizeWorkOrders, workOrderScaffold, workStageMinutes} from '../src/town/index.js';

let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function same(actual,expected,message){assert.deepEqual(actual,expected,message);checks++;}

const buildingOrder=createBuildingWorkOrder({id:'building-12',buildingId:'hand-well'},
  {id:'hand-well',workerHours:40,materials:{timber:40}});
same(buildingOrder.stages.map(stage=>stage.kind),['level','build'],'building work has site preparation and construction stages');
same(buildingOrder.stages[1].ingredients,{timber:40},'building work carries its real materials');
check(buildingOrder.stages[0].workers==='player-or-apprentice','machine work needs the player or an apprentice');
check(workOrderScaffold(buildingOrder)===0,'the site begins at scaffold zero');

const stock={timber:0};
check(advanceWork(buildingOrder,0,1,stock).ok,'site preparation can finish before materials arrive');
const short=advanceWork(buildingOrder,1,40,stock);
check(!short.ok&&buildingOrder.stages[1].completed===0,'short materials stop work without advancing it');
check(short.report.job.orderId===buildingOrder.id&&short.report.job.good==='timber','a shortage report includes a job for the missing good');
same(stock,{timber:0},'a shortage does not take any materials');

const light=createWorkOrder({id:'tent-1',stages:[{kind:'tent',amount:2,ingredients:{timber:4}}]});
check(light.stages[0].workers==='anyone','light work is open to anyone');
const tentStock={timber:4};
const half=advanceWork(light,0,1,tentStock);
check(half.ok&&light.status==='working','light work advances through the same work function');
same(tentStock,{timber:2},'materials are consumed in proportion to completed work');
const done=advanceWork(light,0,8,tentStock);
check(done.ok&&done.status==='finished'&&done.advanced===1,'work clamps to the remaining stage amount');
same(tentStock,{timber:0},'the last units use the remaining ingredients');
check(workOrderScaffold(light)===1,'finished sites show the final scaffold level');

const order=createWorkOrder({id:'route-water',targetId:'route-7',targetKind:'route',priority:2,stages:[{kind:'trench',amount:20,workHours:200,ingredients:{gravel:5}},{kind:'lay-pipe',amount:20,ingredients:{pipe:30}}]});
const route=createRouteWorkOrder({id:'route-8',stages:[{kind:'survey',amount:50,ingredients:{}}]});
check(route.targetKind==='route'&&route.stages[0].amount===50,'agreed routes make staged work orders');
const firstStage=advanceWork(order,0,10,{gravel:5});
check(firstStage.ok&&order.stageIndex===0&&order.stages[0].completed===10,'a stage can be done in parts');
check(!advanceWork(order,1,1,{pipe:30}).ok,'later stages wait for the current stage');
const rest=advanceWork(order,0,20,{gravel:2.5});
check(rest.ok&&order.stageIndex===1&&order.scaffold===1,'completed stages move the scaffold forward');
check(!advanceWork(order,1,20,{pipe:0}).ok&&order.status==='waiting-materials','a later shortage stops the next stage');
same(prioritizeWorkOrders([{id:'low',priority:0},{id:'high',priority:5},{id:'equal',priority:5}]).map(item=>item.id),['high','equal','low'],'work follows priority with stable order for ties');
check(workStageMinutes(30)>=1&&workStageMinutes(30)<=2,'small work takes about a minute');
check(workStageMinutes(30000)<30,'large work remains under half an hour');
check(workStageMinutes(30000)>workStageMinutes(30),'larger jobs take longer');
assert.throws(()=>createWorkOrder({id:'bad',stages:[]}),/at least one stage/); checks++;
assert.throws(()=>createWorkOrder({id:'bad',stages:[{kind:'build',amount:0}]}),/greater than zero/); checks++;

console.log(`TOWN-WORK: ${checks} checks passed.`);
