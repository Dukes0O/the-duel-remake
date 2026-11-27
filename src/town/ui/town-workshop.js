import {WORKSHOP_CARS} from '../content/workshop-cars.js';
import {finishedWorkshops, workshopStock, readableWorkshop, readableWorkshopOrder} from '../town-workshop.js';

const escape = value => String(value).replace(/[&<>"']/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

export function workshopMarkup(town, profile, {enabled = false, readOnly = false} = {}) {
  if (!enabled) return '';
  const bays = finishedWorkshops(town), state = town.workshop;
  const current = !state || readableWorkshop(town);
  const orders = current ? state?.orders ?? {} : {};
  const free = bays.some(bay => !Object.values(orders).some(order => order?.workshopId === bay.id));
  const disabled = readOnly || !current;
  const plans = Object.entries(WORKSHOP_CARS).map(([id, car]) => {
    const owned = profile?.unlockedCars?.includes(id), order = orders[id], readable = readableWorkshopOrder(order);
    const complete = current && state?.completed?.[id];
    const ingredients = readable ? order.ingredients : car.ingredients;
    const stock = Object.entries(ingredients).map(([good, amount]) =>
      `${Math.floor(workshopStock(town, good)).toLocaleString('en')} of ${amount.toLocaleString('en')} kg of ${good}`).join('; ');
    let action = '', status;
    if (owned) status = 'You own this car. Choose it in your garage to drive it or see its medal sheet.';
    else if (complete) {
      status = 'The car is finished and ready to drive.';
      action = `<button type="button" data-workshop-collect="${id}"${disabled ? ' disabled' : ''}>Take the ${car.name} to your garage.</button>`;
    } else if (Object.hasOwn(orders, id) && !readable) {
      status = 'This saved order cannot be read by this game build. Its parts and progress have been kept.';
    } else if (order) {
      const bayReady = bays.some(bay => bay.id === order.workshopId);
      status = !bayReady ? 'Work has stopped. Repair this Workshop to carry on.'
        : order.phase === 'parts' ? `The crew is preparing the parts. Stock: ${stock}.`
        : `The crew is assembling the car. About ${Math.ceil(order.remainingTicks / 32)} minutes remain at normal speed.`;
      if (bayReady && order.phase === 'parts' && workshopStock(town, 'salvage') < 100)
        status += ' Bring another salvage load to supply any missing parts.';
      if (order.phase === 'assembly') action = `<progress value="${order.assemblyTicks - order.remainingTicks}" max="${order.assemblyTicks}" aria-label="${car.name} assembly"></progress>`;
    } else {
      status = `Stock: ${stock}. Assembly takes about ${car.assemblyTicks / 32} minutes at normal speed once the parts are ready.`;
      action = `<button type="button" data-workshop-build="${id}"${disabled || !free ? ' disabled' : ''}>Start building the ${car.name}.</button>`;
    }
    return `<article><h3>${car.name}</h3><p>${car.description}</p><p>${escape(status)}</p>${action}</article>`;
  }).join('');
  return `<section class="town-workshop" role="dialog" aria-label="Workshop car plans"><header><h2>Build a Wasteland car</h2><button type="button" data-workshop-close>Close the plans.</button></header>` +
    `<p>${!current ? 'These plans need a newer game build.' : readOnly ? 'You are visiting. These plans are read-only.' : !bays.length ? 'Finish a Workshop to open an assembly bay.' : 'Each Workshop builds one car at a time. The crew strips hauled salvage for missing parts and steel, then assembles the car while you carry on with the town.'}</p>` +
    `<p>The cars are built here from parts. They have no garage price.</p>${plans}</section>`;
}
