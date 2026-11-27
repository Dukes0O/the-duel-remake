// TOWN-JOBS-2: the town's jobs that are not fights, as data (docs/WASTELAND_TOWN.md sections 7, 10 and 11; the story is
// docs/story/the-long-dry.md, Act 2). One row a job: who asks, what the mission card says, what is driven, the numbers the
// steps run on, and what the town gets. src/world/jobs/town-jobs.js turns a row into a job for the World Job engine, and
// src/town/town-missions.js applies its result. A new job of a kind that is already here is one more row.
//
// Real numbers, and where they come from:
// - Flour travels in 50 kg sacks. A pie weighs 0.35 kg (src/town/content/goods.js), so a wooden tray of a dozen is about 6 kg.
// - A carton of thirty school books weighs about 20 kg, and a box of chalk and slates about 12 kg.
// - A grown dairy goat weighs about 60 kg. Salt for the goats goes up in 25 kg sacks.
// - The water tanker holds 5,600 litres and pumps 600 litres a minute (src/town/content/work-vehicles.js).
// - A small fuel bowser carries 2,000 litres. Fuel weighs 0.836 kg a litre (src/town/content/goods.js).
// - The fence is 24 kg a metre (src/world/jobs/steps/fence.js): 600 kg for each of four sides.
const row = value => Object.freeze(value);
const list = values => Object.freeze(values.map(value => typeof value === 'object' && value !== null ? Object.freeze(value) : value));
const LATER = 'If you leave it for now, nothing is lost and the job stays open.';

// ---- Act 2: the neighbours (chapters 11 to 16) -----------------------------------------------------------------------------
export const TOWN_CHAPTER_JOBS = list([
  row({id:'town-flour-run', kind:'trade', name:'Ten Sacks of Flour', neighbourId:'dot', outpostId:'dot-diner', chapter:'town.act2.dot-flour',
    vehicle:row({id:'supply-truck', loadKg:0}),
    card:row({lineId:'dot.flour.dot', later:LATER, facts:list([
      'Drive the supply truck to the pile by the truck bay and hold still while ten sacks of flour go on.',
      "Take them to Dot's diner on the Boneyard Road, about four and a half kilometres out, and hold still while they come off.",
      'Dot sends ten crates of pies back. Bring them home and stop at the pile to unload.',
      'A hard knock throws things off the truck. Sacks that fall off are lost, and there are spare sacks at home.',
    ])}),
    out:row({good:'food', goodName:'flour', piece:row({id:'sack', name:'sack of flour', kg:50}), count:10, spare:10,
      lines:row({start:'dot.flour.dot', setOff:'dot.flour.load', firstShed:'dot.flour.bump'}), closing:list(['dot.flour.won']),
      words:row({first:'Hold still while the first sack goes on.', loading:'Hold still while the sacks go on.', full:"That is ten sacks. Drive to Dot's diner.",
        carry:"Take the flour to Dot's diner and stop in the ring. Hard knocks throw sacks off.", unloading:'Hold still while the sacks come off.', delivered:'You delivered'})}),
    back:row({good:'pie', goodName:'pies', piece:row({id:'crate', name:'crate of pies', kg:6}), count:10, piesEach:12,
      lines:row({setOff:'dot.flour.back', firstShed:'dot.flour.bump'}), closing:list(['dot.flour.pies']),
      words:row({first:'Hold still while the first crate of pies goes on.', loading:'Hold still while the pies go on.', full:'That is every crate. Drive home.',
        carry:'Take the pies home and stop at the pile. Hard knocks throw crates off.', unloading:'Hold still while the pies come off.'})}),
    resultLineId:'dot.flour.pies', standing:10, fact:'piesHome'}),

  row({id:'town-dot-fire', kind:'outpost-fire', name:"Dot's Is on Fire", neighbourId:'dot', outpostId:'dot-diner', chapter:'town.act2.dot-fire',
    needsFact:null, setsFact:'dotFireOut', completes:false, vehicle:'fire-truck',
    card:row({lineId:'dot.fire.fire', later:'If you leave it for now, the fire waits until you go.', facts:list([
      "Drive the fire truck to Dot's diner on the Boneyard Road, face the flames and hold H to spray.",
      "The tank holds 3,000 litres, which is three minutes of spraying. Dot's well is in the blue ring beside the diner, and it fills the tank while you hold still there.",
      'When the fire is out, park by her door and stay there. The Road Rats who started it are still about.',
      'Drive at a Rat to knock him down, or wait and they give up.',
    ])}),
    // Dot's diner burns as the town's soup kitchen does: both are timber and tin kitchens.
    burnsLike:'soup-kitchen', heat:.45, headStartSeconds:30, well:row({storeL:2200, flowLpm:1000}),
    lines:row({start:'dot.fire.fire', cinder:'dot.fire.cinder', won:'dot.fire.saved', burnt:'dot.fire.saved'}),
    watch:row({seconds:20, radius:14, rats:row({id:'dot-rats', count:3, lineId:'dot.fire.rats', goneLineId:'dot.fire.gone'}),
      label:'seconds on watch'}),
    resultLineId:'dot.fire.saved', standing:10}),

  row({id:'town-dot-fence', kind:'fence', name:'A Fence for Dot', neighbourId:'dot', outpostId:'dot-diner', chapter:'town.act2.dot-fire',
    needsFact:'dotFireOut', completes:true, vehicle:row({id:'supply-truck', loadKg:2400}),
    card:row({lineId:'dot.fire.offer', later:LATER, facts:list([
      "Drive the supply truck to Dot's diner. It is carrying a fence for all four sides of her yard.",
      'There are four stops round the diner. Stop in each ring and hold still while that side of the fence comes off.',
      'Road Rats wait at two of the stops. Nothing comes off the truck while one of them is close.',
      'Drive at a Rat to knock him down, or wait and they give up.',
      'With the fence up the town looks after Dot, and she pays the town a little every month.',
    ])}),
    stopMetres:26, stopRadius:10, ratsAt:list([1, 3]), rats:row({count:2, lineId:'dot.fence.rats'}),
    lines:row({start:'dot.fire.fence'}), closing:list(['dot.fire.won']), resultLineId:'dot.fire.won', protects:true}),

  row({id:'town-chalk-run', kind:'delivery', name:'One Piece of Chalk', neighbourId:'quill', outpostId:'plane-school', chapter:'town.act2.quill',
    vehicle:row({id:'supply-truck', loadKg:0}),
    card:row({lineId:'quill.quill', later:LATER, facts:list([
      'Drive the supply truck to the pile by the truck bay and hold still while the boxes of chalk and books go on.',
      "Take them to Miss Quill's school at the far side of the Boneyard and hold still while they come off.",
      'A hard knock throws boxes off the truck, and a box that falls off is lost. There are spare boxes at home.',
    ])}),
    out:row({good:'books', goodName:'chalk and books', pieces:list([{id:'books', name:'box of books', kg:20}, {id:'chalk', name:'box of chalk and slates', kg:12}]),
      kg:320, spareKg:160, lines:row({start:'quill.quill', setOff:'quill.load'}), closing:list(['quill.won']), nearLineId:'quill.bo',
      words:row({first:'Hold still while the first box goes on.', loading:'Hold still while the boxes go on.', full:"That is all of it. Drive to Miss Quill's school.",
        carry:"Take the chalk and books to Miss Quill's school and stop in the ring. Hard knocks throw boxes off.", unloading:'Hold still while the boxes come off.',
        delivered:'You delivered'})}),
    resultLineId:'quill.won', standing:10, fact:'schoolSupplied'}),

  row({id:'town-goats', kind:'goats', name:'Mind the Goats', neighbourId:'tam', outpostId:'hermit-camp', chapter:'town.act2.tam',
    // Only the Titan or the rally car gets up the Ridge. A driver who owns neither is lent Big Mo's show truck (Claude, on the card).
    vehicle:row({oneOf:list(['titan_monster', 'dusthawk_rally']), lendIfNone:'titan_monster', lendLineId:'tam.tam.lent', lendInsteadOf:'tam.tam'}),
    card:row({lineId:'tam.tam', later:LATER, facts:list([
      'Hold still at the pile by the truck bay while eight sacks of salt for his goats go on.',
      "Drive up the Ridge to Old Tam's hut, stop in the ring and hold still while the salt comes off and the goats get in.",
      'Bring the goats down to the town and stop at the pile to let them out.',
      'A hard knock tips a goat out. A goat that falls out walks back up to Tam, so go down slowly.',
      'Only the Titan or the rally car gets up the Ridge. If you own neither, Big Mo lends you his show truck for this job.',
    ])}),
    salt:row({piece:row({id:'salt', name:'sack of salt', kg:25}), count:8}),
    goats:row({piece:row({id:'goat', name:'goat', kg:60}), count:8, lines:row({atPile:'tam.up', setOff:'tam.down'}), loadingLineId:'tam.sea', closing:list(['tam.won']),
      words:row({first:'Hold still while the first goat gets in.', loading:'Hold still while the goats get in.', full:'That is all eight goats. Drive down slowly.',
        carry:'Take the goats home and stop at the pile. Hard knocks tip goats out.', unloading:'Hold still while the goats get out.'})}),
    lines:row({start:'tam.tam'}), resultLineId:'tam.won', standing:10, fact:'goatsHome'}),

  row({id:'town-water-run', kind:'water', name:"Sea's Late", neighbourId:'imre', outpostId:'deck-town', chapter:'town.act2.imre',
    vehicle:'water-tanker',
    card:row({lineId:'imre.imre', later:LATER, facts:list([
      'Drive the water tanker down the Salt Road to Deck Town, about four and a half kilometres across the dead sea.',
      'The tank is full: 5,600 litres, which is more than five tonnes of water. The tanker is slow to stop and wide in the turns until it is empty.',
      "Back up to Deck Town's tank, stop in the ring and hold still while the pump empties the tanker.",
      'If you roll out of the ring the pump stops and nothing is lost. Get back in and stop.',
    ])}),
    tank:row({litres:5600, pumpLpm:600}), seconds:45, easySeconds:35, ringMetres:30, radius:12,
    lines:row({start:'imre.imre', arrive:'imre.fill'}), closing:list(['imre.won', 'imre.salt']), resultLineId:'imre.won', standing:10, fact:'saltTraded'}),

  row({id:'town-water-crane', kind:'crane', name:'The 2:15', neighbourId:'pim', outpostId:'rail-halt', chapter:'town.act2.pim', vehicle:null,
    card:row({lineId:'pim.pim', later:LATER, facts:list([
      "Drive out along the West Road to Pim's Rail Halt, about six kilometres, and stop in the ring.",
      'Get out and walk to the water crane. There are three seized bolts on its swing arm.',
      'Stand at each bolt and hold F until it turns. What you have done to a bolt is kept if you let go.',
      'Nobody is in a hurry here. Pim has not been in a hurry for thirty years.',
    ])}),
    bolts:3, seconds:2, parkMetres:26, craneMetres:15,
    lines:row({start:'pim.fix', started:'pim.crane'}), closing:list(['pim.done', 'pim.night', 'pim.hook']), resultLineId:'pim.hook', standing:10, fact:'trainSeen'}),
]);

// ---- Section 7's jobs that come round again --------------------------------------------------------------------------------
// `opens`: `fact` is a fact of the town's story that must be true, `chapter` a chapter that must be done, `report` an unanswered
// report of that event, and `everyDays` how
// long after the job was last done it comes round again (game days; none means it is open whenever its need is).
export const TOWN_REPEAT_JOBS = list([
  row({id:'town-storm-rescue', kind:'rescue', name:'Out in the Dust', vehicle:null,
    opens:row({fact:'wellBuilt', report:'dust-storm'}), answers:'shelter',
    card:row({lineId:'town.rescue.card', later:'If you leave it, they wait out the storm where they are.', facts:list([
      'Three people are out on the flats south of the East Road, within a kilometre of the gate. The dust is thick, so follow the marker.',
      'Stop right beside each one and hold still for two seconds while they climb in.',
      'When all three are aboard, bring them back to the gate.',
    ])}),
    people:3, boardSeconds:2, nearMetres:350, farMetres:900,
    lines:row({start:'town.rescue.card', first:'town.rescue.one'}), closing:list(['town.rescue.won']), resultLineId:'town.rescue.won'}),

  row({id:'town-pipe-patch', kind:'pipe-patch', name:'Pipe Patch', vehicle:null,
    opens:row({fact:'towerRunning', everyDays:90}),
    card:row({lineId:'town.patch.card', later:'If you leave it, the main keeps leaking a little.', facts:list([
      "Drive to the ring by the Water Road's tap at the gate and get out. The leak is on the main beside it.",
      'There are three joints to tighten. Stand at each one and hold F until it is done. What you have done to a joint is kept if you let go.',
      'Road Rats come when you start. No wrench turns while one of them is close.',
      'If they knock you down you get up at the same joint, and the joints you have finished stay finished.',
    ])}),
    joints:3, seconds:2, spacingMetres:9, rats:row({id:'pipe-rats', count:2, lineId:'town.patch.rats'}),
    lines:row({start:'town.patch.card'}), closing:list(['town.patch.won']), resultLineId:'town.patch.won'}),

  row({id:'town-road-clear', kind:'road-clear', name:'Road Clear',
    // The Titan if the driver has it, and if not the town's own tow rig, which pushes as well as it pulls.
    vehicle:row({oneOf:list(['titan_monster']), lendIfNone:'tow-rig'}),
    opens:row({chapter:'town.act2.dot-flour', everyDays:120}),
    card:row({lineId:'town.clear.card', later:'If you leave it, the trade road stays blocked.', facts:list([
      'The wrecks are on the East Road, about 600 metres from the gate.',
      'Put your nose against a wreck and drive it sideways off the road. It is clear when all of it is past the edge.',
      'A wreck hit fast enough is flattened where it lies, and a flat wreck is in nobody\'s way.',
      'You drive the Titan if you own it. If you do not, you drive the town\'s tow rig.',
    ])}),
    road:'east-road', fromMetres:560, toMetres:640, wrecks:6, easyWrecks:4,
    lines:row({start:'town.clear.card', half:'town.clear.half'}), closing:list(['town.clear.won']), resultLineId:'town.clear.won'}),

  row({id:'town-fuel-escort', kind:'road-fight', side:'defend', name:'Fuel Escort', vehicle:null,
    opens:row({chapter:'town.act2.dot-flour', everyDays:60}),
    card:row({lineId:'town.fuel.card', later:'If you leave it, the fuel waits in Tin Town.', facts:list([
      'The fuel truck starts on the East Road, two and a half kilometres out, and drives slowly home. Go out and meet her, then stay near her.',
      'Road Rats wait at the roadside in three places. A Rat standing near the truck hurts her.',
      'Drive at a Rat to knock him down. Your weapons work on them too.',
      'If they hurt her badly enough they take her, and you chase her down and touch her to get her back.',
      'The town gets the fuel she still has when she is home.',
    ])}),
    road:'east-road', fromMetres:2500, toMetres:60, speed:8, health:100, stolenBelow:30, litres:2000, ambushMetres:list([1900, 1300, 500]), raiders:2,
    chaseSpeed:9, catchMetres:10,
    lines:row({start:'town.fuel.card', raid:'town.fuel.raid', stolen:'town.fuel.stolen', back:'town.fuel.back'}), closing:list(['town.fuel.won']),
    resultLineId:'town.fuel.won'}),

  row({id:'town-truck-raid', kind:'road-fight', side:'attack', name:'Truck Raid', vehicle:null,
    opens:row({chapter:'town.act2.dot-fire', everyDays:60}),
    card:row({lineId:'town.raid.card', later:'If you leave it, the Rats keep what they took.', facts:list([
      "The Rats' truck starts on the East Road, 600 metres out, and drives away from the town.",
      'Catch it and touch it, or stop it with your weapons.',
      'Then pull up beside it and hold still while the load comes across. Rats on foot try to stop that.',
      'The town gets the salvage they were carrying.',
    ])}),
    road:'east-road', fromMetres:600, toMetres:2400, speed:9, health:60, lootKg:3000, takeSeconds:20, rats:row({id:'raid-rats', count:2}),
    lines:row({start:'town.raid.card', stopped:'town.raid.stopped'}), closing:list(['town.raid.won']), resultLineId:'town.raid.won'}),
]);

export const TOWN_JOB_ROWS = Object.freeze([...TOWN_CHAPTER_JOBS, ...TOWN_REPEAT_JOBS]);
export const townJobRow = id => TOWN_JOB_ROWS.find(job => job.id === id) ?? null;
