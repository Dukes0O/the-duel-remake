import {buildingById} from '../content/registry.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const entries = value => value && typeof value === 'object' ? Object.entries(value) : [];
function ageAt(person, town) {
  if (Number.isSafeInteger(person?.age) && person.age >= 0) return person.age;
  try {
    const born = BigInt(person?.born);
    const now = BigInt(town?.tick ?? 0);
    return born >= 0n && born <= now ? Number((now - born) / 8640n) : null;
  } catch { return null; }
}
function number(value) { return typeof value === 'bigint' ? value.toLocaleString('en') : typeof value === 'number' && Number.isFinite(value) ? new Intl.NumberFormat('en').format(value) : 'Not recorded'; }

export function townCardModel(town, {kind = 'person', id, more = false, why = null} = {}) {
  if (kind === 'person') {
    const person = town?.people?.find(item => item.id === id);
    if (!person) return null;
    return {kind, id:String(person.id), name:String(person.name || 'Town resident'), age:ageAt(person, town), family:String(person.family || 'No family is recorded.'),
      job:String(person.job || 'No job is recorded.'), skills:entries(person.skills).map(([name,value]) => ({name, value:number(value)})),
      history:Array.isArray(person.history) ? person.history.map(String) : person.history ? [String(person.history)] : [], more, why:typeof why === 'string' ? why : null,
      x:Number.isSafeInteger(person.x) ? person.x : null, z:Number.isSafeInteger(person.z) ? person.z : null};
  }
  if (kind === 'building' || kind === 'site') {
    const building = town?.buildings?.find(item => item.id === id);
    if (!building) return null;
    const definition = buildingById.get(building.buildingId);
    return {kind, id:String(building.id), name:String(definition?.id || building.buildingId || 'Building site').replaceAll('-', ' '),
      state:String(building.state || 'planned'), x:Number.isSafeInteger(building.x) ? building.x : null, z:Number.isSafeInteger(building.z) ? building.z : null,
      width:Number.isFinite(building.width) ? building.width : definition?.width ?? null, depth:Number.isFinite(building.depth) ? building.depth : definition?.depth ?? null,
      materials:entries(definition?.materials).map(([good,amount]) => ({good, amount:number(amount)})), upkeep:definition?.upkeepMonthly ?? null,
      staff:definition?.staff ?? null, gives:String(definition?.gives || ''), more, why:typeof why === 'string' ? why : null};
  }
  return null;
}

export function townCardMarkup(card) {
  if (!card) return '<aside class="town-card" aria-label="Town details"><p>Choose a person, building, or site to see its details.</p></aside>';
  const route = card.x === null || card.z === null ? '' : `<button type="button" data-town-card-focus="${escapeHtml(card.id)}" data-town-focus-x="${card.x}" data-town-focus-z="${card.z}">Show this place on the map.</button>`;
  const why = card.why ? `<section class="town-card-why"><h3>Why?</h3><p>${escapeHtml(card.why)}</p>${route}</section>` : '';
  if (card.kind === 'person') {
    const skills = card.skills.length ? `<ul>${card.skills.map(skill => `<li>${escapeHtml(skill.name)}: ${escapeHtml(skill.value)}.</li>`).join('')}</ul>` : '<p>No skills have been recorded yet.</p>';
    const history = card.history.length ? `<ol>${card.history.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ol>` : '<p>No history has been recorded yet.</p>';
    return `<aside class="town-card" aria-label="Person details"><h2>${escapeHtml(card.name)}</h2><p>Age: ${card.age === null ? 'Not recorded' : `${card.age} years`}.</p><p>Family: ${escapeHtml(card.family)}.</p><p>Job: ${escapeHtml(card.job)}.</p><section><h3>Skills</h3>${skills}</section><section><h3>History</h3>${history}</section>${why}</aside>`;
  }
  const details = card.more ? `<section class="town-card-more"><h3>More numbers</h3><p>Size: ${card.width ?? 'Not recorded'} by ${card.depth ?? 'Not recorded'} map cells. Each cell is 8 metres wide.</p><p>Monthly upkeep: ${card.upkeep === null ? 'Not recorded' : `${number(card.upkeep)} scrap`}.</p><p>Staff: ${card.staff ?? 'Not recorded'} people.</p><p>Plan: ${escapeHtml(card.gives || 'No output is listed.')}</p>${card.materials.length ? `<h4>Materials in the plan</h4><ul>${card.materials.map(item => `<li>${escapeHtml(item.amount)} kilograms (kg) of ${escapeHtml(item.good)}.</li>`).join('')}</ul>` : '<p>No materials are listed in the plan.</p>'}<p>Metres (m) measure length. Kilograms (kg) measure mass. Litres (L) measure water. Kilowatts (kW) measure power. Scrap is the town's money.</p></section>` : '';
  return `<aside class="town-card" aria-label="${card.kind === 'site' ? 'Site' : 'Building'} details"><h2>${escapeHtml(card.name)}</h2><p>This ${escapeHtml(card.kind)} is ${escapeHtml(card.state)}.</p>${route}<button type="button" data-town-card-more="${escapeHtml(card.id)}" aria-expanded="${card.more}">${card.more ? 'Hide real numbers' : 'MORE real numbers'}</button>${details}${why}</aside>`;
}

export function bindTownCard(root, {onFocus = () => {}, onMore = () => {}} = {}) {
  const click = event => {
    const focus = event.target?.closest?.('[data-town-card-focus]');
    if (focus) onFocus({id:focus.dataset.townCardFocus, x:Number(focus.dataset.townFocusX), z:Number(focus.dataset.townFocusZ)});
    const more = event.target?.closest?.('[data-town-card-more]');
    if (more) onMore({id:more.dataset.townCardMore, open:more.getAttribute?.('aria-expanded') !== 'true'});
  };
  root.addEventListener('click', click);
  return () => root.removeEventListener('click', click);
}
