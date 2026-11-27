// What a ransom takes (docs/story/open-scablands.md, section 21, "What a ransom takes", ruled by Kyle on 21 November
// 2026). A plain rule: it reads the world and returns the effects that pay the price, and changes nothing itself.
//
// The scrap is paid from what the player is carrying first, then from the town's till, and an ember stands in for each
// whole hundred scrap that both are short; a shortfall under a hundred is let go. Embers are asked for as well once the
// enemy has heard of them, by the Word on the road. Nothing is taken below nothing.
//
// The till is what the town lets the land read (`world.town.till`). While the town does not join the land, the land can
// read no till, and the till pays nothing.
//
// A ransom is written in a beat as
//   {price: [{when, scrap, embers}, ...], asked: [{roadWord, embers}, ...]}
// where the first `price` row whose `when` is true is the price (its `embers` are asked on top of the Word's), and the
// first `asked` row whose `roadWord` the Word on the road has reached gives the embers asked for.
const SCRAP_PER_EMBER = 100;
const whole = value => Number.isSafeInteger(value) && value > 0 ? value : 0;

export function tillOf(world) {
  return whole(world.town?.till);
}

export function embersAsked(asked = [], roadWord = 0) {
  return asked.find(row => roadWord >= row.roadWord)?.embers ?? 0;
}

// The price chosen, and what each of the car, the till and the store gives towards it.
export function ransomTerms(ransom, world, ask = () => true) {
  const price = ransom.price.find(row => ask(row.when)) ?? {scrap: 0};
  const scrap = whole(price.scrap);
  const carried = whole(world.scrap);
  const fromCar = Math.min(carried, scrap);
  const fromTill = Math.min(tillOf(world), scrap - fromCar);
  const short = scrap - fromCar - fromTill;
  const forShort = Math.floor(short / SCRAP_PER_EMBER);
  const asked = embersAsked(ransom.asked, world.ledger.roadWord ?? 0) + whole(price.embers);
  const store = whole(world.ledger.stocks.embers);
  const embers = Math.min(store, forShort + asked);
  return {scrap, fromCar, fromTill, short, forShort, asked, embers, embersLeft: store - embers};
}

export function ransomEffects(terms) {
  return [
    ...(terms.fromCar ? [{type: 'scrap', by: -terms.fromCar}] : []),
    ...(terms.fromTill ? [{type: 'town', post: 'ransom', scrap: terms.fromTill}] : []),
    ...(terms.embers ? [{type: 'stock', stock: 'embers', by: -terms.embers}] : []),
  ];
}
