// Deeds are town content. New territories need only add a territory row and
// its three deed rows here.
export const TOWN_DEED_TERRITORIES = Object.freeze([
  Object.freeze({id:'sal',name:'Sawtooth Sal',place:'The Pipe Road, west of the Scablands',x:17,y:54,color:'#a24f32',perk:{id:'timber-cost',amount:20,unit:'percent',label:'Timber costs 20% less.'}}),
  Object.freeze({id:'dustmonger',name:'The Dustmonger',place:'The Blind Mile, out beyond Tin Town',x:78,y:35,color:'#b08b44',perk:{id:'fuel-cost',amount:20,unit:'percent',label:'Fuel costs 20% less.'}}),
  Object.freeze({id:'mirage',name:'Mother Mirage',place:'The Long Way Round, south of the old airfield',x:30,y:81,color:'#527681',perk:{id:'trade-income',amount:10,unit:'percent',label:'Trade pays 10% more.'}}),
  Object.freeze({id:'gunn',name:'Gearhead Gunn',place:'The Proving Road, east of the Iron Line',x:84,y:67,color:'#8c684d'}),
  Object.freeze({id:'kettle',name:'Kettle Kingpin',place:'Dome Road, on the Scablands approach',x:55,y:21,color:'#78648a'}),
  Object.freeze({id:'vultures',name:'The Twin Vultures',place:'Two Way Street, between the Boneyard and Tin Town',x:38,y:30,color:'#477261',perk:{id:'upkeep-cost',amount:5,unit:'percent',label:'Upkeep costs 5% less.'}}),
  Object.freeze({id:'tollkeeper',name:'The Tollkeeper',place:'The Weigh Station, on the Ridge road',x:67,y:83,color:'#657b4c',perk:{id:'truck-tolls',amount:100,unit:'percent',label:'Your trucks pay no tolls.'}}),
  Object.freeze({id:'blackiron',name:'Baron Blackiron',place:'The Baron’s Mile, north of the Dry Dam',x:18,y:23,color:'#a65b53'}),
]);

const territoryNames = new Map(TOWN_DEED_TERRITORIES.map(row=>[row.id,row.name]));
const rows = [
  ['sal','road','The Pipe Road'],['sal','works',"Sal’s Sawmill"],['sal','outpost','Stump Camp'],
  ['dustmonger','road','The Blind Mile'],['dustmonger','works','The Dust Pumps'],['dustmonger','outpost','Goggle Row'],
  ['mirage','road','The Long Way Round'],['mirage','works','The Bazaar'],['mirage','outpost','Almost an Oasis'],
  ['gunn','road','The Proving Road'],['gunn','works',"Gunn’s Works"],['gunn','outpost','Sandbag Corner'],
  ['kettle','road','Dome Road'],['kettle','works','The Boiler House'],['kettle','outpost','Steam Alley'],
  ['vultures','road','Two Way Street'],['vultures','works','The Counting House'],['vultures','outpost','The Perch'],
  ['tollkeeper','road','Exact Change'],['tollkeeper','works','The Weigh Station'],['tollkeeper','outpost','Receipt'],
  ['blackiron','road','The Baron’s Mile'],['blackiron','works','The Cistern Works'],['blackiron','outpost','Cistern Town'],
];

export const TOWN_DEEDS = Object.freeze(rows.map(([territoryId,kind,name],index)=>Object.freeze({
  id:`${territoryId}-${kind}`, territoryId, territoryName:territoryNames.get(territoryId), kind, name,
  purchasePrice:100, tollPerTrip:1, order:index,
})));

export const TOWN_DEED_BY_ID = new Map(TOWN_DEEDS.map(row=>[row.id,row]));
export const TOWN_DEED_TERRITORY_BY_ID = new Map(TOWN_DEED_TERRITORIES.map(row=>[row.id,row]));
