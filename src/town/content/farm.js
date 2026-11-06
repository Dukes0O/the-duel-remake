// Farm rates come from WASTELAND_TOWN.md section 14 unless marked as an
// initial game setting below. Water figures for hens and goats use Penn State
// Extension, "Agricultural Water Needs and Sources: Water Supply" and
// "Livestock Water Quality" (1 to 2 US gallons per 100 lb per day).
export const FARM_CONTENT = Object.freeze({
  buildings:Object.freeze({
    'chicken-run':Object.freeze({good:'egg',unitsPerDay:12,waterLitresPerDay:4.1,staff:0}),
    'goat-pen':Object.freeze({good:'milk',unitsPerDay:24,waterLitresPerDay:40,staff:1}),
    greenhouse:Object.freeze({good:'vegetable',waterLitresPerDay:500,staff:3,
      seasonalKgPerDay:Object.freeze({Spring:10,Summer:20,Autumn:10,Winter:0})}),
  }),
  calories:Object.freeze({meal:2100,egg:86,milk:630,vegetable:250,food:3600}),
  shelfLifeDays:Object.freeze({egg:21,milk:7,vegetable:14,meal:1}),
  consumptionOrder:Object.freeze(['meal','egg','milk','vegetable','food']),
});
