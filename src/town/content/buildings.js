// Building figures and unlock notes come from docs/WASTELAND_TOWN.md section 14.
// Sizes are cells on the 8 m town grid. Empty materials mean the design names
// no material or a utility route is built cell by cell.
const row = (id, width, depth, materials, workerHours, upkeep, staff, gives, opensWith = 'start') => ({
  id, width, depth, materials, workerHours, upkeepMonthly: upkeep, staff, gives, opensWith,
});

export const BUILDINGS = Object.freeze([
  row('road-dirt',1,1,{},10,0,0,'Cars drive faster on it.'), row('road-plank',1,1,{timber:100},20,0,0,'Cars drive faster on it.','Sal'), row('road-paved',1,1,{brick:600},60,0,0,'Cars drive faster on it.','kiln'),
  row('pipe-50mm',1,1,{pipe:15},6,0,0,'Water'), row('pipe-100mm',1,1,{pipe:40},10,0,0,'Water','forge'), row('pipe-200mm',1,1,{pipe:120},18,0,0,'Water','forge'),
  row('hand-well',1,1,{timber:40},40,0,0,'About 1,000 L a day, brown'), row('standpipe',1,1,{pipe:30},16,2,0,'7.5 L a minute; 250 people'),
  row('water-tower',2,2,{steel:800,timber:400},600,5,0,'20,000 L, 12 m of head','Sal'), row('pump-house',2,2,{steel:600,brick:2000},800,20,2,'40,000 L a day; 3 kW','Dustmonger'),
  row('treatment-plant',4,3,{steel:12000,brick:20000,pipe:3000},20000,200,12,'200,000 L a day clean; 15 kW','Kettle and forge lit'),
  row('reservoir',4,4,{clay:5000,sand:2000},4000,5,0,'2,000,000 L; helicopter scoop','Treatment Plant'),
  row('latrine',1,1,{timber:60,tin:30},30,2,0,'20 people; fills in 2 years'), row('bathhouse',2,2,{tin:400,timber:300},300,15,1,'100 people; mood','25 people'),
  row('reed-bed',3,3,{gravel:20000,pipe:300},1500,10,1,'Cleans waste of 200','Sal'), row('trash-sorter',3,2,{steel:800,tin:400},800,15,3,'Salvage from rubbish','50 people'),
  row('soup-kitchen',2,1,{tin:200,timber:120},120,10,2,'Cooks for 40; uses 400 L','Year 1'), row('chicken-run',1,1,{timber:50,wire:10},24,2,0,'12 hens: about 12 eggs a day','Year 1'),
  row('goat-pen',2,2,{timber:200},100,6,1,'8 goats: about 24 L milk a day','Old Tam'), row('greenhouse',3,2,{glass:400,timber:300},500,12,3,'Vegetables by season; 500 L a day','Town Hall'),
  row('salvage-yard',3,3,{timber:200,tin:200},200,10,4,'Stores and sorts salvage'), row('forge',2,2,{brick:3000,steel:400},1200,30,3,'Salvage to steel, tin, pipe; burns gas','Everburn job 4'),
  row('sawmill',3,2,{steel:400,timber:300},600,15,3,'Timber','Sal at peace'), row('kiln',2,2,{brick:1000},500,15,3,'Clay to brick','Town Hall'),
  row('warehouse',3,3,{steel:1000,tin:600},800,10,2,'Holds 200 tonnes','100 people'), row('windmill',1,1,{steel:200,parts:40},120,1,0,'About 5 kW with wind','Year 2'),
  row('generator',2,1,{steel:300,parts:100},200,10,1,'40 kW; about 13 L fuel an hour','Dustmonger'), row('solar-rack',2,2,{glass:200,steel:200},200,2,0,'About 8 kW by day','Town Hall'),
  row('fuel-depot',3,2,{steel:2000,brick:2000},1000,10,2,'50,000 L of fuel','Dustmonger'), row('fence-wood',1,1,{timber:30},6,0,0,'Strength 1'),
  row('fence-chain',1,1,{wire:30},8,0,0,'Strength 2','Sal'), row('wall-scrap',1,1,{salvage:800},30,0,0,'Strength 4','Gunn'), row('wall-steel',1,1,{steel:1200},60,0,0,'Strength 8','forge'),
  row('watchtower',1,1,{timber:400},200,5,2,'Safety within 12; warning','Year 2'), row('guard-post',2,1,{sandbags:2000,tin:100},150,15,4,'Safety within 8','Gunn'),
  row('fire-station',3,2,{steel:1500,brick:3000},3000,40,6,'Sends itself within 20','after the first fire'), row('clinic',2,2,{tin:500,timber:500},800,30,3,'Treats 40; needs clean water','100 people'),
  row('school',3,2,{tin:500,timber:600},1000,25,3,'60 children; skills','Miss Quill'), row('town-hall',3,3,{brick:8000,steel:1000},5000,30,4,'Mood; second tier of building','100 people'),
  row('old-ground',3,3,{stone:500},100,1,0,"Where the town's people rest; their names",'50 people'), row('workshop',3,2,{steel:1500},1500,25,4,'Builds Wasteland cars','Town Hall'),
  row('motor-pool',4,2,{steel:1500,tin:500},1000,15,3,'Four work vehicles','Vultures, or Food run'), row('trading-post',3,2,{timber:500,tin:300},500,12,3,'Trade roads run','Mirage, or Food run'),
  row('toll-bank',2,2,{steel:2000,brick:1000},1500,20,3,'Deeds, loans','Tollkeeper'), row('radio-mast',1,1,{steel:600},400,5,1,'Scout further; warning','Food run'),
  row('helipad',4,4,{steel:3000,brick:4000},2500,15,2,'Kestrel One','Ridge fire'), row('tavern',2,2,{timber:800,tin:200},500,12,2,'Fun within 14','40 people'),
  row('wreck-ring',3,3,{salvage:4000},1000,15,3,'Fun within 16','200 people'), row('drive-in',4,3,{steel:800,glass:100},1500,20,3,'Fun within 18','300 people'),
  row('mud-pit',4,4,{timber:1000},1500,15,0,'Fun; can be driven in','Bowl played'), row('big-wheel',3,3,{steel:8000,parts:400},6000,40,4,'Fun within 20','800 people'),
  row('scrap-coaster',6,4,{steel:30000},30000,100,8,'Fun within 26','2,000 people'),
  // Additional reviewed art contracts already name this building.
  row('compost-heap',1,1,{timber:20},24,0,0,'Compost'),
]);
