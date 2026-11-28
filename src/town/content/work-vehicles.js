// TOWN-VEHICLES: the town's work vehicles are data (docs/WASTELAND_TOWN.md sections 10 and 11, docs/MACHINES.md section 9).
// Each row has the fields a machine has (drive kind, mass, speed, load, joints, tools and control sets), so
// `defineMachine` accepts it, plus what driving it in the arena needs. Sizes are measured from the models:
// wheelbase from the front steering axle to the middle of the rear axles, body from the model's bounds.
//
// Real numbers and where they come from:
// - Kerb masses and engines are those of 1950s work trucks, which the models are drawn from: a pumper of about
//   9 tonnes empty with a petrol engine of about 200 horsepower (150 kW); a tandem-axle stake truck of about
//   6.5 tonnes that carries about 9 tonnes; a heavy wrecker of about 9.5 tonnes.
// - The fire truck's tank holds 3,000 litres and its pump gives 1,000 litres a minute (docs/WASTELAND_TOWN.md
//   sections 3 and 14).
// - The tanker's drum, measured on the model, is 1.22 m across and 4.84 m long: about 5,660 litres. That is the
//   common 1,500 US gallon tank (5,678 litres), so the tank holds 5,600 litres. A small engine-driven pump gives
//   about 150 US gallons a minute, which is about 570 litres; the row says 600.
// - Water weighs 1 kg a litre.
// - A truck's front wheels turn about 35 degrees at full lock.
// - Top speeds are governed, as work trucks of the time were: 80 to 90 km/h.

import {machineDefinition} from '../../machines/content/machines.js';

const row = values => Object.freeze({driveKind:'wheels', joints:Object.freeze([]), maxSteerDeg:35,
  controls:Object.freeze({drive:Object.freeze(['forward', 'steer']), work:Object.freeze(values.work ?? [])}), ...values,
  tools:Object.freeze(values.tools ?? {}), model:Object.freeze(values.model)});

export const WORK_VEHICLES = Object.freeze([
  row({...machineDefinition('excavator'), model:{file:'machines-1.glb', node:'excavator'},
    emptyMassKg:machineDefinition('excavator').massKg, engineKw:95, topSpeedKmh:machineDefinition('excavator').maxSpeedMps * 3.6,
    wheelbaseM:3.5, halfWidthM:1.53, halfLengthM:2.63, heightM:3.2, work:['swing', 'boom', 'arm', 'bucket']}),
  // HOME-GROUND-5: this is the Dig's rig and track solver, borrowed for an open outing.
  row({...machineDefinition('drill'), model:{file:'machines-2.glb', node:'drill-rig'},
    emptyMassKg:machineDefinition('drill').massKg, engineKw:60, topSpeedKmh:machineDefinition('drill').maxSpeedMps * 3.6,
    wheelbaseM:3.8, halfWidthM:2.08, halfLengthM:3.41, heightM:3.2, work:['mast', 'feed']}),
  row({id:'fire-truck', name:'Fire truck', model:{file:'trucks-1.glb', node:'fire-truck'},
    emptyMassKg:9_000, engineKw:150, topSpeedKmh:88, wheelbaseM:4.61, halfWidthM:1.26, halfLengthM:3.7, heightM:2.89,
    maxLoadKg:0, tank:Object.freeze({capacityL:3_000, startL:3_000, pumpLpm:1_000}), bell:true,
    tools:{cannon:Object.freeze({kind:'cannon', modelNode:'fire-truck:cannon'})}, work:['spray']}),
  row({id:'flatbed', name:'Flatbed', model:{file:'trucks-1.glb', node:'supply-truck', hide:Object.freeze(['supply-truck:load'])},
    emptyMassKg:6_500, engineKw:130, topSpeedKmh:80, wheelbaseM:4.1, halfWidthM:1.35, halfLengthM:3.25, heightM:2.28,
    maxLoadKg:9_000, tools:{bed:Object.freeze({kind:'bed', lengthM:3.6, widthM:2.3})}, work:['load', 'unload']}),
  row({id:'supply-truck', name:'Supply truck', model:{file:'trucks-1.glb', node:'supply-truck'},
    emptyMassKg:6_500, engineKw:130, topSpeedKmh:80, wheelbaseM:4.1, halfWidthM:1.35, halfLengthM:3.25, heightM:2.28,
    // About eighty 50 kg sacks, which is what the load on the model shows.
    maxLoadKg:9_000, startLoadKg:4_000, tools:{bed:Object.freeze({kind:'bed', lengthM:3.6, widthM:2.3, modelNode:'supply-truck:load'})},
    work:['load', 'unload']}),
  row({id:'water-tanker', name:'Water tanker', model:{file:'trucks-1.glb', node:'water-tanker'},
    emptyMassKg:7_500, engineKw:130, topSpeedKmh:80, wheelbaseM:5.13, halfWidthM:1.3, halfLengthM:3.92, heightM:2.74,
    maxLoadKg:0, tank:Object.freeze({capacityL:5_600, startL:5_600, pumpLpm:600}),
    tools:{tank:Object.freeze({kind:'tank', modelNode:'water-tanker:tank-drum'})}, work:['fill', 'pump']}),
  row({id:'tow-rig', name:'Tow rig', model:{file:'trucks-1.glb', node:'tow-rig'},
    emptyMassKg:9_500, engineKw:150, topSpeedKmh:80, wheelbaseM:4.39, halfWidthM:1.34, halfLengthM:3.55, heightM:3.38,
    // A wrecker's lift carries about half of what it tows; this is the most it may tow.
    maxLoadKg:5_000, tools:{hook:Object.freeze({kind:'hook', modelNode:'tow-rig:hook'})}, work:['hook', 'unhook']}),
]);
