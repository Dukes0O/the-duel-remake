// Amounts are stock units per work batch. Food output is measured as servings
// in kg; labour and fuels are explicit so buildings cannot produce for free.
const recipe = (id, buildingId, inputs, outputs, workerHours, fuel=0) =>
  Object.freeze({id,buildingId,inputs:Object.freeze(inputs),outputs:Object.freeze(outputs),workerHours,fuel});

export const RECIPES = Object.freeze([
  recipe('sort-salvage','salvage-yard',{salvage:100},{steel:12,tin:18,wire:8,parts:2},8),
  recipe('forge-steel','forge',{salvage:100,fuel:4},{steel:35},12,4),
  recipe('forge-tin','forge',{salvage:100,fuel:3},{tin:45},10,3),
  recipe('forge-pipe','forge',{steel:12,fuel:1},{pipe:12},8,1),
  recipe('kiln-brick','kiln',{clay:100,fuel:3},{brick:70},8,3),
  recipe('sawmill-timber','sawmill',{salvage:30,fuel:1},{timber:24},8,1),
  recipe('kitchen-meal','soup-kitchen',{food:10},{meal:10},8),
]);

export const recipeById = new Map(RECIPES.map(item=>[item.id,item]));
