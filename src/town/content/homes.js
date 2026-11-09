export const TOWN_HOME_TYPES = Object.freeze([
  Object.freeze({id:'canvas', label:'Canvas', places:0, goods:{}, days:0}),
  Object.freeze({id:'tent', label:'Tent', places:4, goods:{canvas:20}, days:2}),
  Object.freeze({id:'shack', label:'Shack', places:4, goods:{tin:40,timber:30}, days:10}),
  Object.freeze({id:'tin-stack', label:'Tin stack', places:8, goods:{tin:120,steel:60}, days:30}),
  Object.freeze({id:'container-home', label:'Container home', places:16, goods:{steel:400}, days:60}),
  Object.freeze({id:'brick-home', label:'Brick home', places:8, goods:{brick:2000,timber:200}, days:120}),
]);
