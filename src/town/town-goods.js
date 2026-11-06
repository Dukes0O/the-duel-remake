import {GOODS} from './content/goods.js';
import {RECIPES} from './content/recipes.js';
import {hasTownDeedPerk} from './town-deeds.js';

const definitions = new Map(GOODS.map(good=>[good.id,good]));
const placeKey = ({regionId='scablands',x,z}) => {
  if (typeof regionId!=='string'||!Number.isFinite(x)||!Number.isFinite(z)) throw new TypeError('Choose a real stockpile cell.');
  return `${regionId}:${x}:${z}`;
};
const stockAt = (town,key,create=false) => {
  town.goods ||= {stockpiles:{},prices:{}};
  const slots=town.goods.stockpiles;
  if (!slots[key]&&create) slots[key]={goods:{},warehouseId:null};
  return slots[key];
};

export function stockpileAt(town,cell) { return stockAt(town,placeKey(cell))?.goods || {}; }

export function storeGood(town,cell,goodId,amount) {
  if (!definitions.has(goodId)||!Number.isFinite(amount)||amount<=0) return {ok:false,message:'Choose a known good and an amount above zero.'};
  const key=placeKey(cell), stock=stockAt(town,key,true);
  stock.goods[goodId]=(stock.goods[goodId]||0)+amount;
  return {ok:true,amount:stock.goods[goodId]};
}

export function takeGood(town,cell,goodId,amount) {
  if (!definitions.has(goodId)||!Number.isFinite(amount)||amount<=0) return {ok:false,message:'Choose a known good and an amount above zero.'};
  const stock=stockAt(town,placeKey(cell));
  if (!stock||(stock.goods[goodId]||0)<amount) return {ok:false,message:`There is not enough ${goodId} here.`};
  stock.goods[goodId]-=amount;
  if (stock.goods[goodId]===0) delete stock.goods[goodId];
  return {ok:true,amount};
}

export function stockMassKg(town,cell) {
  const goods=stockpileAt(town,cell);
  return Object.entries(goods).reduce((sum,[id,amount])=>sum+amount*definitions.get(id).kgPerUnit,0);
}

export function priceForGood(town,goodId,{direction='buy'}={}) {
  if(!['buy','sell'].includes(direction)) throw new TypeError('Choose whether the town buys or sells the good.');
  const good=definitions.get(goodId);
  if (!good) throw new TypeError('That good is not in the town list.');
  let amount=0;
  for(const stock of Object.values(town.goods?.stockpiles||{})) amount+=stock.goods[goodId]||0;
  // Base prices follow the documented scrap economy; stock moves the market
  // smoothly from half to twice the listed price around a 1,000-unit supply.
  let price=good.price*Math.max(0.5,Math.min(2,1000/(1000+amount)));
  if(direction==='buy'&&goodId==='timber'&&hasTownDeedPerk(town,'timber-cost')) price*=0.8;
  if(direction==='buy'&&goodId==='fuel'&&hasTownDeedPerk(town,'fuel-cost')) price*=0.8;
  if(direction==='sell'&&hasTownDeedPerk(town,'trade-income')) price*=1.1;
  return price;
}

export function runTownRecipe(town,building,recipeId,{staffPresent=building?.staff||0}={}) {
  const recipe=RECIPES.find(item=>item.id===recipeId);
  if (!recipe||!building||building.buildingId!==recipe.buildingId||staffPresent<1)
    return {ok:false,message:'This building does not have workers for that recipe.'};
  const cell={regionId:building.regionId||'scablands',x:building.x,z:building.z};
  const stock=stockpileAt(town,cell);
  const fuel=recipe.fuel||0;
  for(const [id,amount] of Object.entries(recipe.inputs)) if ((stock[id]||0)<amount) return {ok:false,message:`The recipe needs more ${id}.`};
  if(fuel&&(stock.fuel||0)<fuel) return {ok:false,message:'The recipe needs more fuel.'};
  for(const [id,amount] of Object.entries(recipe.inputs)) takeGood(town,cell,id,amount);
  if(fuel&&!recipe.inputs.fuel) takeGood(town,cell,'fuel',fuel);
  for(const [id,amount] of Object.entries(recipe.outputs)) storeGood(town,cell,id,amount);
  return {ok:true,workerHours:recipe.workerHours,outputs:{...recipe.outputs}};
}

export function goodDefinition(goodId) { return definitions.get(goodId)||null; }
