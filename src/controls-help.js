import {COMBAT_TUNING} from './wasteland-tuning.js';
import {canLeaveCar} from './onfoot-transition.js';

const T = COMBAT_TUNING.foot;

// The controls a player can look up on demand (the H key). Presentation only:
// it reads the same tuning and availability rules the game itself uses, so the
// numbers cannot drift from what the keys really do. Returns {title, rows}.
export function controlsHelp(duel) {
  const state = duel?.state;
  if (state?.onFoot) {
    return {title: 'ON FOOT', rows: [
      ['W / UP', 'Walk forward'], ['S / DOWN', 'Walk back'],
      ['A D / LEFT RIGHT', 'Turn'], ['Q / E', 'Step left / right'],
      ['MOUSE', 'Look'], ['L / R CLICK', 'Fire / aim'],
      ['SHIFT', 'Sprint'], ['SPACE', 'Jump'], ['1  2  3', 'Choose your gear'],
      ['F', 'Climb aboard the stopped tanker'],
      ['HOLD F', 'Get back in your car'],
      ['C', 'Change camera'], ['ESC / P', 'Pause'], ['H', 'Hide this help']]};
  }
  // MAP-VIEW: Kestrel One's keys, with the pilot's map when it is on (the helicopter view carries `secrets` only then).
  if (state?.status === 'heli') {
    const heliRows = [['W / S', 'Collective, up and down'], ['ARROWS', 'Cyclic, tilt and bank'], ['A / D', 'Pedals, turn'],
      ['H', 'Hook (hold to pour the bucket)'], ['P', 'Autopilot'], ['ENTER', 'Cruise to the destination'], ['R', 'Answer the radio'], ['C', 'Change camera']];
    if (duel?.featureFlags?.enabled?.('pilot-map') === true) heliRows.push(['N', "The pilot's map: click a place to fly there"]);
    heliRows.push(['ESC', 'Pause'], ['M', 'Mute']);
    return {title: 'KESTREL ONE', rows: heliRows};
  }
  const rows = [['W / UP', 'Throttle'], ['S / DOWN', 'Brake, hold to reverse'],
    ['LEFT / RIGHT', 'Steer'], ['SPACE', 'Boost'], ['Q / E', 'Shift (manual gearbox)']];
  if (state?.mode === 'wasteland' && state.combat) rows.push(['1  2  3  4', 'Weapons']);
  rows.push(['C', 'Change camera']);
  if (duel && canLeaveCar(duel)) rows.push(['HOLD F',
    'Step out or bail out']);
  rows.push(['ESC / P', 'Pause'], ['M', 'Mute'], ['H', 'Hide this help']);
  return {title: 'CONTROLS', rows};
}

export function controlsHelpMarkup(duel) {
  const {title, rows} = controlsHelp(duel);
  return `<h3>${title}</h3><dl>${rows.map(([keys, what]) =>
    `<div><dt>${keys}</dt><dd>${what}</dd></div>`).join('')}</dl>`;
}
