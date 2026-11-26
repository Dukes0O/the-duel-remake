import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Course} from '../src/course.js';
import {COURSE, DRIVE} from '../src/config.js';
import {Duel} from '../src/game.js';
import {BOWL_COURSE, bowlCentre} from '../src/bowl/bowl-course.js';
import {CAR_CRUSH_DRESSING} from '../src/bowl/bowl-crush-field.js';
import {createBowlView} from '../src/bowl/bowl-view.js';
import {addArenaCrushables} from '../src/arena-props.js';
import {BOWL_STAND} from '../src/bowl/bowl-stadium.js';
import {terraceHeight} from '../src/bowl/bowl-outside.js';
import {ribbonGroundAt} from '../src/ribbon-ground.js';
import {farTerrainCornerHeight} from '../src/far-terrain-surface.js';

const check=(condition,message)=>assert.ok(condition,message);
const DT=1/120;
const bowl=new Course(BOWL_COURSE,1989),centre=bowlCentre(bowl),floor=BOWL_COURSE.scrapdome,data=bowl.features.bowl;
check(BOWL_COURSE.bowl&&BOWL_COURSE.timeOfDay==='night','The Bowl is a distinct night course.');

// BOWL-EXPAND: a stadium floor in proportion to the trucks, at least a football field's size
// (110 m by 49 m) with room round it, where the old Bowl was a 140 m ring 16.5 m wide.
check(data.gates.length === 2 && data.gates.every(g=>g.width===8) && data.gates[1].s-data.gates[0].s===data.halfLap,
  'two eight-metre gates mirror each other across the stadium');
check(data.outside.parking.length>=16 && data.outside.parking.every(p=>p.off>data.outside.back),
  'the car park has crushable cars behind the back row');
const walls=bowl.features.barriers.filter(wall=>wall.arenaWall),outer=walls.filter(wall=>wall.off>0),spine=walls.filter(wall=>wall.off<0);
const span=(list,axis)=>Math.max(...list.map(wall=>wall[axis]))-Math.min(...list.map(wall=>wall[axis]));
const long=Math.max(span(outer,'x'),span(outer,'z')),wide=Math.min(span(outer,'x'),span(outer,'z'));
check(long>150&&wide>85,`The floor is at least 150 m by 85 m between its walls (${long.toFixed(1)} by ${wide.toFixed(1)}).`);
check(2*floor.floorHalfWidth>=40,'Each straight is 40 m of floor across: 14 Titans side by side.');
// The Spine: the two straights' inner walls meet in a narrow divider on the stadium's long axis.
check(spine.every(wall=>Math.abs(wall.x-centre.x)<1.5),
  'The inner walls form the Spine, a divider under 3 m wide down the middle of the floor.');
const end=bowl.worldAt(bowl.length-.05,0);
check(Math.hypot(end.x,end.z)<.1&&bowl.samples.every((p,i)=>!i||Math.abs(p.heading-bowl.samples[i-1].heading)<.25),
  'The ring closes at the start line and bends smoothly round its ends.');
check(Math.abs(bowl.length/bowl.step-Math.round(bowl.length/bowl.step))<1e-9,'The lap is a whole number of the course\'s samples.');
const line=[];for(let s=0;s<bowl.length;s+=.25)line.push(bowl.worldAt(s,0));
const closest=Math.min(...walls.flatMap(wall=>{
  const sn=Math.sin(wall.heading),cs=Math.cos(wall.heading);
  return [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0]].map(([u,v])=>{
    const x=wall.x+cs*u*wall.halfX+sn*v*wall.halfZ,z=wall.z-sn*u*wall.halfX+cs*v*wall.halfZ;
    return Math.min(...line.map(p=>Math.hypot(p.x-x,p.z-z)));
  });
}));
check(closest>=floor.floorHalfWidth+1.4+.4,'Every wall piece keeps at least 0.4 m from a Titan at the floor edge.');
check(bowl.roadHalfWidthAt(0)===floor.floorHalfWidth&&floor.floorHalfWidth+1.4+.5<=Math.min(floor.wallOffset,floor.outerWallOffset)-.5,
  'A Titan at the floor edge is clear of both walls.');
for(const prop of bowl.features.crushables)
  check(Math.abs(prop.off)+prop.halfX<=floor.floorHalfWidth,`${prop.id} stands on the floor.`);
check(bowl.features.crushables.map(prop=>prop.sourceKind).join(',')===
  'junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,junkCar,bowlBus,bowlBus,bowlRv,bowlBurningHeap,bowlBurningHeap,bowlBurningHeap',
  'The crush line grows from junk cars to buses and the RV, then the burning heap.');
check(bowl.features.signs.length===0,'No road sign stands in the stands.');

// The jumps: several heights, all on the straights, none sharing a stretch of the lap (the
// jump scoring names a jump by where it is along the lap).
const ramps=[...bowl.features.ramps].sort((a,b)=>a.start-b.start),onStraight=(s,[a,b])=>s>=a&&s<=b;
check(new Set(ramps.map(ramp=>ramp.height)).size>=3,'The jumps come in at least three heights.');
check(ramps.every(ramp=>[data.zones.jumpStraight,data.zones.crushStraight].some(zone=>onStraight(ramp.start,zone)&&onStraight(ramp.end,zone))),
  'Every jump stands on a straight.');
check(ramps.every((ramp,i)=>!i||ramp.start>ramps[i-1].end+8),'No two jumps share a stretch of the lap.');
check(ramps.every(ramp=>bowl.groundAt((ramp.start+ramp.end)/2,ramp.off).y>ramp.height*.95&&
  bowl.groundAt((ramp.start+ramp.end)/2,ramp.off+ramp.halfWidth+ramp.flank+.5).y===0),'Each jump is its own height and ends at its sides.');
// The banked ends rise towards the wall; the straights stay flat beside their jumps.
for(const [a,b] of [data.zones.end1,data.zones.end2]){
  const middle=(a+b)/2;
  check(bowl.groundAt(middle,floor.floorHalfWidth).y>1.5&&bowl.groundAt(middle,5).y===0,'Each end is a bowl, rising towards its wall.');
}
check(bowl.groundAt(10,floor.floorHalfWidth).y===0&&bowl.groundAt(data.halfLap+10,floor.floorHalfWidth).y===0,'The straights are flat at the wall.');
check(bowl.features.flameJets.length===2*ramps.length&&ramps.every(ramp=>
  bowl.features.flameJets.filter(jet=>jet.s>ramp.start&&jet.s<ramp.end).length===2),
  'A flame jet stands either side of each jump.');

// The show's places, for the cards that run events on this floor.
check(data.lanes.length===2&&data.lanes[0].lateral===data.lanes[1].lateral&&Math.abs(data.lanes[1].s-data.lanes[0].s-bowl.length/2)<1e-9,
  'Side by Side has two lanes on the same line, half a lap apart.');
const meets=lane=>ramps.filter(ramp=>Math.abs(lane.lateral-ramp.off)<ramp.halfWidth).map(ramp=>[ramp.height,
  ((ramp.start-lane.s)%bowl.length+bowl.length)%bowl.length].join('@')).sort().join(',');
check(meets(data.lanes[0])===meets(data.lanes[1])&&meets(data.lanes[0]).length,'The two lanes meet the same jumps at the same distances: mirrors.');
check(data.crush.startS<data.crush.firstRowS&&Math.min(...bowl.features.crushables.map(prop=>prop.s))===data.crush.firstRowS,
  'Car Crush starts before the first row of the line.');
check(onStraight(data.crush.startS,data.zones.crushStraight)&&bowl.features.crushables.every(prop=>onStraight(prop.s,data.zones.crushStraight)),
  'Car Crush starts on the straight that holds the whole line, so a truck driven straight ahead meets it.');
check(data.rails.lateral>12&&data.rails.lateral<floor.floorHalfWidth,'The Scrapasaurus\'s rails run round the edge of the floor.');
check(data.launchCars.every(car=>Math.abs(car.lateral)<floor.floorHalfWidth&&bowl.groundAt(car.s,car.lateral).y===0),
  'The launch cars stand on flat floor.');

// Only Car Crush builds the full field. Check the whole footprint of each piece
// against the wall faces, the ramps and the eight metres of run-up.
{
  const dressed = new Course({...BOWL_COURSE, bowlDressing: CAR_CRUSH_DRESSING}, 1989);
  const field = dressed.features.crushables;
  check(field.length === 31 && new Set(field.map(piece => piece.id)).size === 31, 'Car Crush has 31 separate pieces');
  check(field.filter(piece => piece.bowlCrushGroup).length === 3 &&
    field.filter(piece => piece.bowlPancakeRamp).length === 3 &&
    field.filter(piece => piece.id.startsWith('bowl-row-')).length === 5 &&
    field.filter(piece => piece.id.startsWith('bowl-end-one-')).length === 5, 'the field has all four added groups');
  for (const [index, old] of bowl.features.crushables.entries()) {
    const piece = field[index];
    check(piece.id === old.id && piece.s === old.s && piece.off === (old.off === 18.2 ? 17.25 : old.off),
      `${old.id} keeps its position except for the approved outer-line clearance`);
  }
  for (const piece of field) {
    const c = Math.cos(piece.heading), sin = Math.sin(piece.heading);
    const corners = [[1,1],[-1,1],[1,-1],[-1,-1]].map(([side, end]) =>
      dressed.nearest(piece.x + c * side * piece.halfX + sin * end * piece.halfZ,
        piece.z - sin * side * piece.halfX + c * end * piece.halfZ, piece.s));
    check(corners.every(corner => corner.lateral <= floor.outerWallOffset - .5 - 3 &&
      corner.lateral >= -(floor.wallOffset - .5 - 3)), `${piece.id} clears the wall by at least three metres`);
    const [along, across] = ['s','lateral'].map(key => corners.map(corner => corner[key]));
    check(ramps.every(ramp => {
      const width = ramp.halfWidth + ramp.flank;
      return Math.max(...along) <= ramp.start - 8 || Math.min(...along) >= ramp.end ||
        Math.max(...across) <= ramp.off - width || Math.min(...across) >= ramp.off + width;
    }), `${piece.id} stays off the jumps and their run-ups`);
  }
  for (const [night, eventIndex, type] of [[1,1,'freestyle'], [1,2,'sideBySide'], [3,2,'lastTruckRolling']]) {
    const duel = new Duel({seed:1989});
    duel.featureFlags = {enabled: flag => flag === 'titan-bowl'};
    check(duel.startBowlNight({night,eventIndex,cpuDifficulty:'easy'}) && duel.state.bowlNight.event.type === type &&
      duel.course.def.bowlDressing == null, `${type} starts without Car Crush dressing`);
    const original = bowl.features.crushables;
    check(duel.course.features.crushables.length === original.length, `${type} keeps all 15 original props`);
    for (const [index, piece] of duel.course.features.crushables.entries()) {
      const base = original[index];
      assert.deepEqual(Object.fromEntries(Object.keys(base).map(key => [key, piece[key]])), base,
        `${type} keeps the same layout and materials for ${base.id}`);
    }
  }
}

// Real drives on the floor, outside an arena event, as Car Crush, Freestyle and Side by Side run.
function bowlDuel(){
  const duel=new Duel({seed:1989});
  duel.startCampaign({startStage:COURSE.findIndex(course=>course.id==='titan-arena'),mode:'timetrial',car:'titan_monster'});
  duel.course=new Course(BOWL_COURSE,1989);
  for(let i=0;i<300;i++)duel.step(1/60); // the countdown
  Object.assign(duel.state,{status:'racing',traffic:[],rival:null,crushedProps:[]});
  return duel;
}
function place(duel,s,lateral){Object.assign(duel.state,{s,prevS:s,lateral,prevLateral:lateral,speedMph:0,headingError:0,yawVelocity:0,
  airborne:false,airHeight:0,_jumpY:null,_verticalSpeed:0,collectedJumps:[]});}
// Each jump, from the start of its straight at full throttle: the truck flies and lands upright.
const flights=new Map();
for(const ramp of ramps){
  const duel=bowlDuel(),state=duel.state,zone=onStraight(ramp.start,data.zones.jumpStraight)?data.zones.jumpStraight:data.zones.crushStraight;
  place(duel,zone[0],ramp.off);duel.setInput({throttle:1,steer:0});
  let air=0,landed=false,from=null,distance=0;
  for(let tick=0;tick<900&&!landed;tick++){
    duel.step(1/60);
    if(state.airborne){air++;from??=duel.course.worldAt(state.s,state.lateral);}
    else if(air>6){landed=true;const to=duel.course.worldAt(state.s,state.lateral);distance=Math.hypot(to.x-from.x,to.z-from.z);}
  }
  check(landed&&air/60>.9&&!state.tumble,`${ramp.name} throws a Titan for more than 0.9 s and it lands on its wheels.`);
  flights.set(ramp.id,distance);
}
check(flights.get('big-jump')>flights.get('table')&&flights.get('table')>flights.get('jump-kicker'),
  'The higher the jump, the further the Titan flies.');
// The floor holds a Titan to the same top speed in every event: it settles near 50 mph.
{
  const duel=bowlDuel(),state=duel.state;place(duel,data.zones.crushStraight[0],floor.floorHalfWidth-3);
  duel.setInput({throttle:1});let top=0;
  for(let i=0;i<240;i++){duel.step(1/60);top=Math.max(top,state.speedMph);}
  check(top>40&&top<60,`The floor holds a Titan near 50 mph outside an arena event too (${top.toFixed(1)} mph).`);
}
// A truck turns any way it likes on the floor: more than a full half turn, in the open end.
{
  const duel=bowlDuel(),state=duel.state;place(duel,(data.zones.end1[0]+data.zones.end1[1])/2,2);
  duel.setInput({throttle:.45,steer:-1});
  let last=duel.course.at(state.s).heading+state.headingError,turned=0;
  for(let i=0;i<480;i++){duel.step(1/60);const heading=duel.course.at(state.s).heading+state.headingError;
    turned+=Math.atan2(Math.sin(heading-last),Math.cos(heading-last));last=heading;}
  check(Math.abs(turned)>Math.PI,`A Titan turns round on the Bowl's floor (${(Math.abs(turned)/Math.PI*180).toFixed(0)} degrees in 8 s).`);
}

// A real crush of each kind of item in the line.
for(const kind of ['junkCar','bowlBus','bowlRv','bowlBurningHeap']){
  const duel=bowlDuel(),state=duel.state,prop=duel.course.features.crushables.find(item=>item.sourceKind===kind);
  Object.assign(state,{s:prop.s-12,prevS:prop.s-12,lateral:prop.off,prevLateral:prop.off,headingError:0,speedMph:25,airborne:false,airHeight:0});
  for(let tick=0;tick<400&&!state.crushedProps.includes(prop.id);tick++){
    state.prevS=state.s;state.s+=state.speedMph*DT*DRIVE.mphToWorld;duel._crushProps(state);
  }
  check(state.crushedProps.includes(prop.id),`The Titan crushes a ${kind} in the line.`);
}

const world=new THREE.Group(),shells=addArenaCrushables(world,bowl);
check(shells.children.length===bowl.features.crushables.length,'Every crush target has a visible salvage shell.');
const crushed=bowl.features.crushables[0].id;
for(let i=0;i<120;i++)shells.userData.updateSimulation({crushedProps:[crushed]},1/60);
const bounds=new THREE.Box3().setFromObject(shells.children[0]);
check(bounds.max.y<1.3,'A crushed course item collapses below its intact height.');
check(shells.children[1].scale.y===1,'Crushing one item leaves the others intact.');

// Existing courses are as they were: order, and the Titan Monster Arena's own floor.
check(COURSE.slice(0,7).map(course=>course.id).join(',')===
  'pacific-canyon,high-country,harbor-highlands,titan-arena,midnight-chase,ridge-rally,titan-stunt-trial',
  'The existing course positions and identities are unchanged.');
const titan=new Course(COURSE.find(course=>course.id==='titan-arena'),1989);
check(titan.roadHalfWidthAt(0)===13&&titan.features.ramps.map(ramp=>[ramp.end-ramp.start,ramp.height].join()).join('|')==='38,2.6|38,2.6|38,2.6'&&
  titan.features.barriers.filter(wall=>wall.arenaWall).every(wall=>Math.abs(wall.off)===22),
  'The Titan Monster Arena keeps its floor, ramps and walls.');

// The view: the stadium is drawn in code round the floor; the crush line uses its models.
// Like crush.glb: sibling parts under one root, whose turn about X stands them upright
// (each part is long along its own Y, as Blender's Z-up export leaves it).
const fakeCrush=()=>{
  const scene=new THREE.Group(),root=new THREE.Group();root.name='bowl-crush';
  root.quaternion.setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);scene.add(root);
  for(const [name,size] of [['bus-crushed-assembly'],['bus-crushed-body-shell',[2.8,8.6,1.4]],['bus-crushed-wheels',[3.2,6,1]],
    ['rv-crushed-body-shell',[2.6,6.2,1.6]],['fire-stack-lower-car-wreck-body',[2.2,4.6,1.2]],['fire-stack-top-car-wreck-body',[2.2,4.6,1.2]],
    ['curling-flame-tongue',[.6,.6,1.6]]]){
    const part=size?new THREE.Mesh(new THREE.BoxGeometry(...size),new THREE.MeshStandardMaterial({color:0xb45d53})):new THREE.Object3D();
    part.name=name;if(name.startsWith('fire-stack-top'))part.position.z=-1.2;root.add(part);
  }
  return {scene};
};
const fireTexture=new THREE.DataTexture(new Uint8Array([255,160,32,255]),1,1);
const loaded=[];
const view=createBowlView({loadModel:async path=>{loaded.push(path);return fakeCrush();},loadFireTexture:async()=>fireTexture});
view.update(bowl,{},1000,true);
const firstStadium=view.group.getObjectByName('Bowl stadium, floodlights and crowd');
await new Promise(resolve=>setTimeout(resolve,0));
await new Promise(resolve=>setTimeout(resolve,0));
check(view.group.userData.flameJetCount&&view.group.getObjectByName('Bowl stadium, floodlights and crowd')===firstStadium,
  'The stadium is drawn once: rebuilding the fires keeps it.');
check(view.group.visible,'The Bowl presentation is visible when its switch and course definition are active.');
check(loaded.length&&loaded.every(path=>path.endsWith('crush.glb')),'Only the crush models are loaded: the stadium model is gone.');
const stadium=view.group.getObjectByName('Bowl stadium, floodlights and crowd');
check(view.group.userData.stadiumReady&&stadium,'The night stadium is drawn.');
const terraces=new THREE.Box3().setFromObject(stadium.getObjectByName('Bowl terraces'));
const floorBox=new THREE.Box3();for(const wall of outer)floorBox.expandByPoint(new THREE.Vector3(wall.x,0,wall.z));
check(terraces.min.x<floorBox.min.x-30&&terraces.max.x>floorBox.max.x+30&&terraces.min.z<floorBox.min.z-30&&terraces.max.z>floorBox.max.z+30&&terraces.max.y>20,
  'The terraces stand all round the floor, behind its wall, rising above 20 m.');
check(stadium.userData.crowdCards>10000,`The stands hold a crowd of more than ten thousand (${stadium.userData.crowdCards}).`);
// BOWL-OUT-LOOK: the drawn stands are the rules' stands, both gates are drawn where the rules open them, the car park
// holds the rules' parked cars, the ground mesh lies under the drawn stands, and the marker follows the truck outside.
const outsideRules=data.outside;
for(let row=0;row<BOWL_STAND.rows;row+=3){
  const off=BOWL_STAND.face+BOWL_STAND.first+(row+.5)*BOWL_STAND.depth;
  check(Math.abs(BOWL_STAND.rowY(row)-terraceHeight(outsideRules,off))<.05,`Row ${row} is drawn at the rules' height.`);
}
check(Math.abs(BOWL_STAND.face+BOWL_STAND.first+BOWL_STAND.rows*BOWL_STAND.depth-outsideRules.back)<1e-6,'The drawn top row ends at the stand back the rules use.');
const outsideView=stadium.getObjectByName('Bowl outside: gates and car park');
check(outsideView?.userData.gateCount===2,'Both gates are drawn.');
for(const gate of data.gates){
  const parts=outsideView.getObjectByName(`Bowl ${gate.name}`),floorBox=new THREE.Box3().setFromObject(parts.getObjectByName(`Bowl ${gate.name} tunnel floor`));
  const middle=bowl.worldAt(gate.s,(outsideRules.wall+outsideRules.back)/2);
  check(floorBox.containsPoint(new THREE.Vector3(middle.x,(floorBox.min.y+floorBox.max.y)/2,middle.z)),`The ${gate.name} tunnel floor lies where the rules open the gate.`);
  check(parts.getObjectByName(`Bowl ${gate.name} light column`),`The ${gate.name} has its light column.`);
}
const parkedCars=outsideView.getObjectByName('Bowl car park cars');
check(outsideView.userData.parkedCars===outsideRules.parking.length&&outsideRules.parking.length===16&&outsideRules.parking.every(car=>{
  const shell=parkedCars.getObjectByName(`Crushable ${car.id}`);return shell&&Math.hypot(shell.position.x-car.x,shell.position.z-car.z)<.01;}),
  'The 16 parked cars are drawn where the rules park them.');
const endS=data.zones.end1[0]+data.ring.radius*Math.PI/2;
check([[100,30],[100,40],[endS,30],[endS,40]].every(([s,off])=>ribbonGroundAt(bowl,s,off).y<Math.min(BOWL_STAND.low,terraceHeight(outsideRules,off))-.1)&&
  [[100,70],[100,95],[endS,70],[endS,120]].every(([s,off])=>farTerrainCornerHeight(bowl,0,0,s,off,16)<0),
  'The ground mesh lies below the drawn stands and the car park asphalt, not on the terraces.');
const gateLights = data.gates.map(gate => outsideView.getObjectByName(`Bowl ${gate.name} light column`));
check(!outsideView.getObjectByName('Bowl gate marker'),'The old truck-mounted gate marker is gone.');
stadium.userData.update(2000,.35,{s:100,lateral:outsideRules.back+20,groundHeight:0,airHeight:0,
  bowlOutside:{where:'carpark',gate:data.gates[1]}});
check(gateLights[1].visible && !gateLights[0].visible,'Only the selected gate lights up outside.');
stadium.userData.update(2100,.35,{s:100,lateral:0,groundHeight:0,airHeight:0});
check(gateLights.every(light=>!light.visible),'The gate lights go once the truck is back in.');
const shutters = data.gates.map(gate => outsideView.getObjectByName(`Bowl ${gate.name} steel shutter`));
const rexNight = {phase: 'event', event: {type: 'scrapasaurus', rex: {}}};
check(shutters.every(shutter => shutter && !shutter.visible), 'Ordinary Bowl events keep both shutters up.');
stadium.userData.update(2200,.35,{s:100,lateral:0,groundHeight:0,airHeight:0,bowlNight: rexNight});
check(shutters.every(shutter => shutter.visible), 'Both steel shutters come down during the fight.');
rexNight.event.rexReturnGate = data.gates[1].name;
stadium.userData.update(2300,.35,{s:100,lateral:outsideRules.back+20,groundHeight:0,airHeight:0,bowlNight: rexNight});
check(shutters[0].visible && !shutters[1].visible, 'Only the shutter for the returning truck goes up.');
rexNight.event.rex.done = {won: true};
stadium.userData.update(2400,.35,{s:100,lateral:0,groundHeight:0,airHeight:0,bowlNight: rexNight});
check(shutters.every(shutter => !shutter.visible), 'Both shutters go up when the fight ends.');
check(stadium.getObjectByName('Bowl crowd').geometry.getAttribute('crowdSeat')?.itemSize===4,'Each crowd card knows its seat, to clear from round a truck.');
check(stadium.getObjectByName('Bowl tyre walls')?.userData.count>200,'Tyre walls stand along the stand wall and the Spine.');
const lights=stadium.userData.lights;
check(lights.length===4&&lights.every(light=>floorBox.containsPoint(new THREE.Vector3(light.target.position.x,0,light.target.position.z))),
  'Four floodlights are aimed at the floor.');
const containers=stadium.getObjectByName('Bowl Spine').children.filter(child=>child.name.startsWith('Bowl Spine container'));
check(containers.length===6&&containers.every(box=>{const b=new THREE.Box3().setFromObject(box);
  return spine.some(wall=>Math.hypot(wall.x-box.position.x,wall.z-box.position.z)<8);}),'The Spine\'s containers stand on the Spine.');
check(view.group.getObjectByName('Bowl faded junk car crush line')?.userData.crushableCount===9,
  'The opening crush rows reuse the game junk-car props.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl authored crush')).length===3,
  'The authored crushed bus and RV meshes are placed in the line.');
// Lying along the course: longest along the course, lower than it is long.
const flat=name=>{
  const prop=view.group.getObjectByName(name),heading=prop.rotation.y,position=prop.position.clone();
  prop.rotation.y=0;prop.position.set(0,0,0);prop.updateMatrixWorld(true);
  const size=new THREE.Box3().setFromObject(prop).getSize(new THREE.Vector3());
  prop.rotation.y=heading;prop.position.copy(position);prop.updateMatrixWorld(true);
  return size.z>size.x&&size.z>size.y;
};
const bus=bowl.features.crushables.find(prop=>prop.sourceKind==='bowlBus');
check(flat(`Bowl authored crush ${bus.id}`),'The crushed bus lies flat along the course, not on end.');
const middleHeap=bowl.features.crushables.find(prop=>prop.sourceKind==='bowlBurningHeap'&&prop.off===13.8);
check(view.group.getObjectByName(`Bowl burning bus stack ${middleHeap.id}`)&&flat(`Bowl burning bus stack ${middleHeap.id}`),
  'The authored burning stack lies along the course between its ground fire sprites.');
check(view.group.children.filter(child=>child.name.startsWith('Bowl burning bus stack')).length===3,
  'A burning stack stands on each of the heap\'s three places.');
const busProp=view.group.getObjectByName(`Bowl authored crush ${bus.id}`);
for(let i=0;i<60;i++)view.update(bowl,{crushedProps:[bus.id]},1000,true);
check(busProp.scale.y===.5&&view.group.getObjectByName(`Bowl burning bus stack ${middleHeap.id}`).scale.y===1,
  'A crushed bus settles lower and the props not crushed stay as they are.');
const heapFire=view.group.getObjectByName(`Bowl heap fire ${middleHeap.id}`),fireBefore=heapFire.position.y;
for(let i=0;i<60;i++)view.update(bowl,{crushedProps:[middleHeap.id]},1000,true);
check(heapFire.position.y<fireBefore-.3,'The fire of a crushed stack sinks with it.');
let tongues=0;view.group.traverse(node=>{if(node.name==='curling-flame-tongue')tongues++;});
check(tongues===0,'The model\'s cone flames are not used.');
const jets=()=>view.group.children.filter(child=>child.name.startsWith('Bowl flame jet bowl-'));
check(view.group.userData.flameJetCount===8&&jets().length===8&&
  view.group.children.filter(child=>child.name.startsWith('Bowl flame jet housing')).length===8,
  'Eight timed fire-flipbook jets render on their housings at the course positions.');
check(view.group.userData.heapFireCount===3&&view.group.children.filter(child=>
  child.name.startsWith('Bowl heap fire')).length===3,
  'The three heap props use the game fire-flipbook effect with no cone flame.');
// The four pairs fire a beat apart, so all eight burn together only early in the cycle.
view.update(bowl,{},100,true);
check(jets().every(child=>child.visible),'Flame jets are active during their firing part of the cycle.');
view.update(bowl,{},8000,true);
check(jets().every(child=>!child.visible),'Flame jets extinguish during the rest of their cycle.');
view.update(bowl,{},4000,false);
check(!view.group.visible,'The Bowl presentation stays hidden with its feature switch off.');
view.dispose();
// QA-SUMMIT-WARMUP-EXCEPTION: Three's compileAsync polls each collected material's program, so leaving the Bowl takes the art
// out of the scene at once but disposes its materials only when the renderer's warmup is idle (render3d's `retire`).
{
  const later=[],held=createBowlView({loadModel:async()=>fakeCrush(),loadFireTexture:async()=>fireTexture,retire:release=>later.push(release)});
  held.update(bowl,{},1000,true);await new Promise(resolve=>setTimeout(resolve,0));await new Promise(resolve=>setTimeout(resolve,0));
  const materials=new Set();held.group.traverse(node=>{for(const material of [node.material].flat().filter(Boolean))materials.add(material);});
  const disposed=new Set();for(const material of materials)material.addEventListener('dispose',()=>disposed.add(material));
  check(materials.size>5&&held.group.userData.crushModelsReady,'The held view drew its stadium and crush props.');
  held.update(bowl,{},2000,false);
  check(held.group.children.every(child=>child.name.startsWith('Scrapasaurus')||child.name.startsWith('Bowl weapons')||child.type==='Group'&&!child.name.startsWith('Bowl stadium')),'Leaving the Bowl takes the stadium out of the scene at once.');
  check(disposed.size===0&&later.length>=1,'No material is disposed while the warmup may still poll it; the releases wait.');
  later.splice(0).forEach(release=>release());
  check(disposed.size>5,'The held release disposes the stadium and crush materials once the warmup is idle.');
  held.dispose();later.splice(0).forEach(release=>release());
}
console.log('Bowl course: a stadium floor in proportion, jumps that fly, mirrored lanes, free turning, crush line, stadium view and existing courses passed.');
