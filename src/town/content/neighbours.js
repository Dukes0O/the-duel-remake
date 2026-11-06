// Town outposts and their recurring work stay data so new communities can be
// added without changing the simulation rules.
export const TOWN_NEIGHBOURS = Object.freeze([
  Object.freeze({id:'dot', name:'Dot', place:'Boneyard road', opensYear:3, standing:0, tradeGood:'food', tradeAmount:10, rewardGood:'pie', rewardAmount:10, routeKm:8, monthlyProtection:12}),
  Object.freeze({id:'quill', name:'Miss Quill', place:'School airliner', opensYear:5, standing:0, tradeGood:'tin', tradeAmount:1, rewardGood:'food', rewardAmount:5, routeKm:18, monthlyProtection:0}),
  Object.freeze({id:'tam', name:'Old Tam', place:'The Ridge', placeId:'ridge', opensYear:6, standing:0, tradeGood:'food', tradeAmount:20, rewardGood:'food', rewardAmount:10, routeKm:35, monthlyProtection:0}),
  Object.freeze({id:'imre', name:'Captain Imre', place:'Deck Town', opensYear:7, standing:0, tradeGood:'fuel', tradeAmount:20, rewardGood:'food', rewardAmount:20, routeKm:55, monthlyProtection:0}),
  Object.freeze({id:'pim', name:'Pim', place:'Rail Halt', opensYear:7, standing:0, tradeGood:'pipe', tradeAmount:1, rewardGood:'salvage', rewardAmount:10, routeKm:22, monthlyProtection:0}),
]);

export const OUTPOST_CHAPTERS = Object.freeze([
  Object.freeze({id:'town.act2.dot-flour', title:'Dot’s Diner', year:3, when:Object.freeze({path:'id',truthy:true}), lineIds:['dot.flour.dot'], next:'Bring ten sacks of flour to Dot’s diner.', mapTarget:'dot'}),
  Object.freeze({id:'town.act2.dot-fire', title:'A Light in the Window', year:4, when:Object.freeze({path:'id',truthy:true}), lineIds:['dot.fire.fire','dot.fire.offer'], next:'Help Dot keep the road open.', mapTarget:'dot'}),
  Object.freeze({id:'town.act2.quill', title:'Miss Quill’s School', year:5, when:Object.freeze({path:'id',truthy:true}), lineIds:['quill.quill','quill.bo'], next:'Bring chalk and supplies to the school.', mapTarget:'quill'}),
  Object.freeze({id:'town.act2.tam', title:'Old Tam on the Ridge', year:6, when:Object.freeze({path:'id',truthy:true}), lineIds:['tam.tam'], next:'Drive up the Ridge and meet Old Tam.', mapTarget:'tam'}),
  Object.freeze({id:'town.act2.imre', title:'Deck Town', year:7, when:Object.freeze({path:'id',truthy:true}), lineIds:['imre.imre'], next:'Bring water to Captain Imre’s crew.', mapTarget:'imre'}),
  Object.freeze({id:'town.act2.pim', title:'Rail Halt', year:7, when:Object.freeze({path:'id',truthy:true}), lineIds:['pim.pim'], next:'Visit Pim at Rail Halt.', mapTarget:'pim'}),
]);

export default TOWN_NEIGHBOURS;
