import {raiseTownReport} from './town-reports.js';

const LIGHT_KINDS = new Set(['tent', 'barrow']);

function wholeNumber(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`The ${label} must be a whole number of zero or more.`);
  return value;
}

function positiveNumber(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`The ${label} must be greater than zero.`);
  return value;
}

function ingredientsCopy(ingredients = {}) {
  if (!ingredients || typeof ingredients !== 'object' || Array.isArray(ingredients)) throw new TypeError('Work ingredients must be listed by good.');
  const copy = {};
  for (const [good, amount] of Object.entries(ingredients)) {
    if (!good || !Number.isFinite(amount) || amount < 0) throw new TypeError('Ingredient amounts must be zero or greater.');
    if (amount) copy[good] = amount;
  }
  return copy;
}

function stageCopy(stage, index) {
  if (!stage || typeof stage !== 'object' || typeof stage.kind !== 'string' || !stage.kind.trim()) throw new TypeError(`Work stage ${index + 1} needs a kind.`);
  const amount = positiveNumber(stage.amount, `work amount in stage ${index + 1}`);
  const ingredients = ingredientsCopy(stage.ingredients);
  const workHours = stage.workHours === undefined ? amount : positiveNumber(stage.workHours, `worker hours in stage ${index + 1}`);
  return {kind:stage.kind, amount, completed:0, workHours, ingredients, workers:stage.workers || (LIGHT_KINDS.has(stage.kind) ? 'anyone' : 'player-or-apprentice')};
}

export function createWorkOrder({id, targetId = null, targetKind = 'site', priority = 0, stages, availableTo = 'player-or-apprentice'}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Give the work order a name.');
  if (!Array.isArray(stages) || !stages.length) throw new TypeError('A work order needs at least one stage.');
  if (!Number.isFinite(priority)) throw new TypeError('Work priority must be a number.');
  return {id:id.trim(), targetId, targetKind, priority, availableTo, status:'ready', stageIndex:0,
    scaffold:0, stages:stages.map(stageCopy), reports:[]};
}

export function createBuildingWorkOrder(building, definition, options = {}) {
  if (!building || typeof building.id !== 'string' || !definition || typeof definition.id !== 'string') throw new TypeError('A building plan needs its placed site and building data.');
  const materials = ingredientsCopy(definition.materials);
  const hours = positiveNumber(definition.workerHours, 'building work hours');
  const sitePrep = options.sitePrep || 'level';
  const stages = [];
  if (options.lightStage) stages.push({kind:options.lightStage, amount:options.lightAmount || 1, workHours:Math.min(1, hours), ingredients:{}});
  stages.push({kind:sitePrep, amount:1, workHours:hours * 0.2, ingredients:{}});
  stages.push({kind:'build', amount:hours, workHours:hours * 0.8, ingredients:materials});
  return createWorkOrder({id:options.id || `work-${building.id}`, targetId:building.id, targetKind:'building', priority:options.priority || 0, stages, availableTo:options.availableTo});
}

export function createRouteWorkOrder(route, options = {}) {
  if (!route || typeof route.id !== 'string' || !Array.isArray(route.stages)) throw new TypeError('An agreed route needs named work stages.');
  return createWorkOrder({id:options.id || `route-${route.id}`, targetId:route.id, targetKind:'route', priority:options.priority || 0, stages:route.stages, availableTo:options.availableTo});
}

export function workOrderScaffold(order) {
  if (!order || !Array.isArray(order.stages) || !order.stages.length) return 0;
  if (order.status === 'finished') return order.stages.length;
  const done = order.stages.slice(0, order.stageIndex).length;
  const current = order.stages[order.stageIndex];
  return Math.min(order.stages.length - 1, done + (current ? Math.floor(current.completed / current.amount) : 0));
}

function shortageReport(order, stageIndex, good, amount, town) {
  const report = {type:'work-shortage', message:`Work stopped. It needs ${amount} more ${good}.`, job:{type:'get-ingredient', orderId:order.id, stageIndex, good, amount}};
  order.reports.push(report);
  if (town) {
    const townReport = raiseTownReport(town, 'site-stopped', {siteStopped:true, where:order.targetId || 'Building site', detail:report.message});
    if (townReport.ok) {
      townReport.report.job = {...report.job};
      townReport.report.shortage = {...report.job};
      report.townReport = townReport.report;
    }
  }
  order.status = 'waiting-materials';
  return {ok:false, advanced:0, message:report.message, report};
}

export function advanceWork(order, stageIndex, units, materials = {}, town = null) {
  if (!order || !Array.isArray(order.stages)) throw new TypeError('Choose a work order.');
  wholeNumber(stageIndex, 'stage number');
  positiveNumber(units, 'work amount');
  if (!materials || typeof materials !== 'object' || Array.isArray(materials)) throw new TypeError('Town materials must be listed by good.');
  if (order.status === 'finished') return {ok:false, advanced:0, message:'That work is already finished.'};
  if (stageIndex !== order.stageIndex) return {ok:false, advanced:0, message:'Finish the earlier stage first.'};
  const stage = order.stages[stageIndex];
  if (!stage) return {ok:false, advanced:0, message:'That work stage does not exist.'};
  if (stage.workers !== 'anyone' && order.availableTo === 'anyone') order.availableTo = 'player-or-apprentice';
  const advanced = Math.min(units, stage.amount - stage.completed);
  const ratio = advanced / stage.amount;
  for (const [good, total] of Object.entries(stage.ingredients)) {
    const needed = total * ratio;
    const have = Number.isFinite(materials[good]) && materials[good] >= 0 ? materials[good] : 0;
    if (have + 1e-9 < needed) return shortageReport(order, stageIndex, good, Number((needed - have).toFixed(6)), town);
  }
  for (const [good, total] of Object.entries(stage.ingredients)) materials[good] = Math.max(0, materials[good] - total * ratio);
  stage.completed += advanced;
  order.status = 'working';
  if (stage.completed + 1e-9 >= stage.amount) {
    stage.completed = stage.amount;
    order.stageIndex++;
    if (order.stageIndex === order.stages.length) order.status = 'finished';
    else order.status = 'ready';
  }
  order.scaffold = workOrderScaffold(order);
  return {ok:true, advanced, message:order.status === 'finished' ? 'The work is finished.' : 'The work has moved ahead.', scaffold:order.scaffold, status:order.status};
}

export function prioritizeWorkOrders(orders) {
  if (!Array.isArray(orders)) throw new TypeError('Work orders must be a list.');
  return orders.map((order,index)=>({order,index})).sort((a,b)=>b.order.priority-a.order.priority || a.index-b.index).map(item=>item.order);
}

export function workStageMinutes(workHours) {
  positiveNumber(workHours, 'worker hours');
  return Math.min(29, Math.max(1, 1 + 28 * (1 - Math.exp(-workHours / 3500))));
}
