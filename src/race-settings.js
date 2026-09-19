import {CARS,COURSE,DEFAULT_CAR,DEFAULT_CPU_DIFFICULTY,DEFAULT_DIFFICULTY,CPU_DIFFICULTY,DIFFICULTY} from './config.js';
import {DEFAULT_ROUTE_VARIANT,isRouteVariant} from './route-variants.js';
import {normalizeLightingMood} from './lighting-moods.js';

export const DEFAULT_RACE_SETTINGS=Object.freeze({version:1,eventId:COURSE[0].id,mode:'duel',cpuDifficulty:DEFAULT_CPU_DIFFICULTY,difficulty:DEFAULT_DIFFICULTY,car:DEFAULT_CAR,routeVariant:DEFAULT_ROUTE_VARIANT,lightingMood:'clear',ghostEnabled:true});
const owned=(profile,key)=>Object.hasOwn(CARS,key)&&(!(CARS[key].price>0)||profile?.unlockedCars?.includes(key));
export const raceSettingsStage=settings=>Math.max(0,COURSE.findIndex(stage=>stage.id===settings?.eventId));

// Only preference fields are retained. Stable event IDs survive menu reordering;
// ownership and challenge constraints are checked again whenever settings load.
export function normalizeRaceSettings(value,profile) {
  const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  let stage=COURSE.find(item=>item.id===v.eventId)||COURSE[0];
  if((stage.requiredCar||stage.arena)&&!owned(profile,stage.requiredCar||'titan_monster'))stage=COURSE[0];
  const required=stage.requiredCar||(stage.arena?'titan_monster':null),car=required||(owned(profile,v.car)?v.car:DEFAULT_CAR);
  return {version:1,eventId:stage.id,mode:['chase','drift','checkpoint'].includes(stage.kind)||stage.stuntTrial?'duel':v.mode==='timetrial'?'timetrial':'duel',
    cpuDifficulty:Object.hasOwn(CPU_DIFFICULTY,v.cpuDifficulty)?v.cpuDifficulty:DEFAULT_CPU_DIFFICULTY,difficulty:Object.hasOwn(DIFFICULTY,v.difficulty)?v.difficulty:DEFAULT_DIFFICULTY,
    car,routeVariant:isRouteVariant(v.routeVariant)?v.routeVariant:DEFAULT_ROUTE_VARIANT,lightingMood:normalizeLightingMood(v.lightingMood),ghostEnabled:typeof v.ghostEnabled==='boolean'?v.ghostEnabled:true};
}

export function raceSettingsChoices(settings) {
  return {car:settings.car,difficulty:settings.difficulty,cpuDifficulty:settings.cpuDifficulty,mode:settings.mode,startStage:raceSettingsStage(settings)};
}
