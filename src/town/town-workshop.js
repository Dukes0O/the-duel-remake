import {featureFlags} from '../feature-flags.js';
import {WORKSHOP_CARS, isWorkshopCar} from './content/workshop-cars.js';
import {recipeById} from './content/recipes.js';
import {registerTownCommand} from './town-commands.js';
import {registerTownSystem} from './town-sim.js';
import {storeGood} from './town-goods.js';

const enabledByDefault = () => featureFlags.enabled('wasteland-cars');
const record = value => value != null && typeof value === 'object' && !Array.isArray(value);
export const readableWorkshop = town => town?.workshop?.version === 1
  && (town.workshop.orders == null || record(town.workshop.orders))
  && (town.workshop.completed == null || record(town.workshop.completed));
export const readableWorkshopOrder = order => record(order) && typeof order.workshopId === 'string'
  && ['parts', 'assembly'].includes(order.phase) && record(order.ingredients)
  && Object.keys(order.ingredients).length === 2
  && ['parts', 'steel'].every(good => Number.isFinite(order.ingredients[good]) && order.ingredients[good] > 0)
  && Number.isSafeInteger(order.assemblyTicks) && order.assemblyTicks > 0
  && Number.isSafeInteger(order.remainingTicks) && order.remainingTicks > 0 && order.remainingTicks <= order.assemblyTicks;
export const finishedWorkshops = town => (town?.buildings ?? [])
  .filter(building => building.buildingId === 'workshop' && building.state === 'finished');
const stocks = town => Object.entries(town?.goods?.stockpiles ?? {})
  .sort(([a], [b]) => a.localeCompare(b)).map(([, stock]) => stock.goods ?? {});
export const workshopStock = (town, good) => stocks(town)
  .reduce((sum, stock) => sum + (Number.isFinite(stock[good]) ? Math.max(0, stock[good]) : 0), 0);

function take(town, good, amount) {
  for (const stock of stocks(town)) {
    const used = Math.min(amount, Math.max(0, Number(stock[good]) || 0));
    if (used) stock[good] -= used;
    amount -= used;
    if (amount <= 0) break;
  }
}

export function beginWorkshopCar(town, carId, {enabled = enabledByDefault()} = {}) {
  if (!enabled) return {ok: false, message: 'The Workshop car plans are not open yet.'};
  if (!isWorkshopCar(carId)) return {ok: false, message: 'Choose a car from the Workshop plans.'};
  if (town.workshop && !readableWorkshop(town)) return {ok: false, message: 'These Workshop plans cannot be read by this game build.'};
  if (Object.hasOwn(town.workshop?.completed ?? {}, carId) || Object.hasOwn(town.workshop?.orders ?? {}, carId))
    return {ok: false, message: 'That car is already built or being built.'};
  const occupied = new Set(Object.values(town.workshop?.orders ?? {}).map(order => order?.workshopId));
  const workshop = finishedWorkshops(town).find(building => !occupied.has(building.id));
  if (!workshop) return {ok: false, message: 'Finish a Workshop with a free assembly bay first.'};
  const definition = WORKSHOP_CARS[carId];
  town.workshop ??= {version: 1, orders: {}, completed: {}};
  town.workshop.orders ??= {};
  town.workshop.completed ??= {};
  // Save the recipe with the order. Later tuning never changes a build already started.
  town.workshop.orders[carId] = {workshopId: workshop.id, phase: 'parts',
    ingredients: {...definition.ingredients}, remainingTicks: definition.assemblyTicks,
    assemblyTicks: definition.assemblyTicks};
  return {ok: true, message: `The Workshop is preparing the ${definition.name}.`, cue: 'interface.go'};
}

export function stepWorkshop(town, {enabled = enabledByDefault()} = {}) {
  if (!enabled || !readableWorkshop(town)) return [];
  const workshops = new Map(finishedWorkshops(town).map(building => [building.id, building]));
  const completed = [];
  for (const [carId, order] of Object.entries(town.workshop.orders ?? {})) {
    // Unknown content survives unchanged until a build that understands it returns.
    if (!isWorkshopCar(carId) || !readableWorkshopOrder(order) || !workshops.has(order.workshopId)) continue;
    const workshop = workshops.get(order.workshopId);
    if (order.phase === 'parts') {
      const needed = Object.entries(order.ingredients);
      if (needed.some(([good, amount]) => workshopStock(town, good) < amount)) {
        // The existing salvage recipe recovers useful parts and metal, without
        // inventing stock. One eight-worker-hour batch takes two town hours
        // with the Workshop's four workers.
        const recipe = recipeById.get('sort-salvage');
        if (workshopStock(town, 'salvage') < recipe.inputs.salvage) continue;
        order.sortTicks = (order.sortTicks ?? 0) + 1;
        if (order.sortTicks < recipe.workerHours / 4) continue;
        order.sortTicks = 0;
        take(town, 'salvage', recipe.inputs.salvage);
        for (const [good, amount] of Object.entries(recipe.outputs)) storeGood(town, workshop, good, amount);
        continue;
      }
      for (const [good, amount] of needed) take(town, good, amount);
      order.phase = 'assembly';
    }
    if (order.phase !== 'assembly' || !Number.isFinite(order.remainingTicks) || order.remainingTicks <= 0) continue;
    order.remainingTicks--;
    if (order.remainingTicks > 0) continue;
    town.workshop.completed ??= {};
    town.workshop.completed[carId] = {tick: String(town.tick)};
    delete town.workshop.orders[carId];
    completed.push(carId);
  }
  return completed;
}

// The App calls this after saving the town, then saves the resulting profile.
// If that second save fails, the completed town remains a durable receipt.
export function collectWorkshopCar(profile, town, carId, {playerId, enabled = enabledByDefault()} = {}) {
  if (!enabled || !playerId || !town?.mayors?.includes(playerId) || !readableWorkshop(town)
    || !isWorkshopCar(carId) || !town.workshop.completed?.[carId])
    return {ok: false, profile, message: 'This car is not ready in your own Workshop.'};
  if (profile.unlockedCars?.includes(carId)) return {ok: true, profile, changed: false, message: 'You already own this car.'};
  return {ok: true, changed: true, profile: {...profile, unlockedCars: [...(profile.unlockedCars ?? []), carId]},
    message: `The ${WORKSHOP_CARS[carId].name} is in your garage. Its medal sheet is ready.`, cue: 'interface.bonus'};
}

registerTownCommand('buildWorkshopCar', (town, command, context) =>
  beginWorkshopCar(town, command.carId, {enabled: context.flags?.enabled('wasteland-cars') ?? enabledByDefault()}));
registerTownSystem('town-workshop', 75, 1, ({town}) => stepWorkshop(town));
