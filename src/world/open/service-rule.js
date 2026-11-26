import {isTrue} from './facts.js';

const rates = {Sworn: .5, Friendly: .75, Strangers: 1, Wary: 1.25};
export function servicePrice(service, word, car) {
  if (word === 'Cold') return null;
  const base = service === 'wash' ? 6 : Math.max(4, 2 * Math.ceil((car.maxArmor - car.armor) / 10));
  return Math.ceil(base * rates[word]);
}

// Recheck the quote against the current world before issuing any effects.
// OPEN-SHARED debits partially on overdraft; the shed only sells whole services.
export function doService(offer, world) {
  if (!isTrue({fact: 'scrap', atLeast: offer.price}, world))
    return {short: offer.price - world.scrap};
  return {choice: {id: offer.id, effects: [{type: 'scrap', by: -offer.price}]}};
}

export function wrenchLimit(worldJob, maximum) {
  return worldJob?.open && worldJob.definition?.steps?.length === 1 &&
    worldJob.definition.steps[0].kind === 'roam' ? maximum * .6 : maximum;
}
