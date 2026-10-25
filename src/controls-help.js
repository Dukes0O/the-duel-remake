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
  const rows = [['W / UP', 'Throttle'], ['S / DOWN', 'Brake, hold to reverse'],
    ['LEFT / RIGHT', 'Steer'], ['SPACE', 'Boost'], ['Q / E', 'Shift (manual gearbox)']];
  if (state?.mode === 'wasteland' && state.combat) rows.push(['1  2  3  4', 'Weapons']);
  // DEEP-SIRENA-VIEW: the sonar and the lift bags, listed only under water.
  if (state?.deepJourney?.phase === 'underwater') rows.push(['R', 'Sonar ping'], ['F', 'Lift bag (stop beside a part)']);
  rows.push(['C', 'Change camera']);
  if (duel && canLeaveCar(duel)) rows.push(['HOLD F',
    'Step out or bail out']);
  rows.push(['ESC / P', 'Pause'], ['M', 'Mute'], ['H', 'Hide this help']);
  return {title: 'CONTROLS', rows};
}

// SKI-VIEW: the ski keys (docs/HELI_SKIING.md section 4), shown by the ski HUD while skiing (H, since the hook means
// nothing on skis). The third column is the short word on the HUD's key strip (null: help only).
export function skiControlsHelp() {
  return [['A D / LEFT RIGHT', 'Turn (in the air: spin)', 'turn'], ['S / DOWN', 'Skid to slow down (in the air: flip back)', 'skid'],
    ['SHIFT', 'Tuck (no hard turns)', 'tuck'], ['W / UP', 'Skate on the flat (in the air: flip forward)', 'skate'],
    ['SPACE', 'Pop', 'pop'], ['C', 'Change camera', 'camera'], ['ESC', 'Pause', null], ['M', 'Mute', null], ['H', 'Show or hide this help', 'help']];
}

export function controlsHelpMarkup(duel) {
  const {title, rows} = controlsHelp(duel);
  return `<h3>${title}</h3><dl>${rows.map(([keys, what]) =>
    `<div><dt>${keys}</dt><dd>${what}</dd></div>`).join('')}</dl>`;
}
