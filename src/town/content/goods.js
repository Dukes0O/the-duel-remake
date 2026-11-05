// Masses use kg per stock unit. Automotive diesel is 0.8359 kg/L at 15 C,
// from Canada's Measurement Canada volume correction factors (V-18).
const row = (id, unit, kgPerUnit, price) => ({id, unit, kgPerUnit, price});

export const GOODS = Object.freeze([
  row('brick','kg',1,2), row('canvas','kg',1,5), row('clay','kg',1,0.2),
  row('egg','each',0.06,0.4), row('food','kg',1,3), row('fuel','litre',0.8359,1.5),
  row('glass','kg',1,8), row('gravel','kg',1,0.15), row('milk','litre',1.03,0.8),
  row('pipe','kg',1,5), row('parts','kg',1,12), row('pie','each',0.35,2),
  row('salvage','kg',1,0.5), row('sand','kg',1,0.12), row('sandbags','kg',1,0.3),
  row('meal','kg',1,3.5), row('steel','kg',1,4), row('stone','kg',1,0.1), row('tin','kg',1,1.5),
  row('timber','kg',1,1), row('vegetable','kg',1,1.2), row('wire','kg',1,6),
]);
