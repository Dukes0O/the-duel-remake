// The Everburn's Story card, Story Wall and yard prompts. Markup only:
// button handlers are owned by the app's story and Scablands hooks.
import {registerStoryCard} from './story-ui.js';
import {EMBER_NOTE} from './ember-lines.js';
import {EMBER_JOB_NAMES, emberStoryProps} from './ember-road.js';
import {EMBER_JOBS} from './ember-save.js';

export const EMBER_SWITCH = 'story-everburn';
const escape = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);

registerStoryCard({
  key: 'ember', switch: EMBER_SWITCH, eyebrow: 'THE EVERBURN', heading: 'A FIRE FOR THE FORGE.',
  letter: EMBER_NOTE.text, letterLabel: 'A note from Hollis', stepsLabel: 'The jobs',
  steps: Object.fromEntries(EMBER_JOBS.map((id, index) => [id, {
    name: EMBER_JOB_NAMES[index], primary: true,
    // From the menu every job starts in the yard: the card takes the player there, and the yard's Next up starts it.
    button: 'Go to the back gate',
  }])),
  footer: view => view.ended ? '<p class="story-prize">The Everburn burns again. Cinder is part of your crew.</p>' : '',
});

function row(step, index) {
  const state = {done: 'DONE', open: 'NEXT', locked: 'LOCKED'}[step.state] ?? 'LOCKED';
  const button = step.state === 'open' && step.button
    ? `<button type="button" class="start-button story-step-button" data-ember-step="${escape(step.action ?? step.id)}"><span>${escape(step.button)}</span></button>` : '';
  return `<li class="story-step is-${step.state}" data-ember-job="${escape(step.id)}"><i class="story-tick" aria-hidden="true"></i>`
    + `<div class="story-step-words"><b>${index + 1} · ${escape(EMBER_JOB_NAMES[index])}</b><small class="story-state">${state}</small><p>${escape(step.note)}</p></div>${button}</li>`;
}

// RUN-GAS: the gas run's entry under the six jobs. Drawn like them, but open for good: it never shows a tick.
function gasRunRow(run) {
  const buttons = run.roads.map(road => `<button type="button" class="start-button story-step-button" data-ember-run="${escape(road.id)}"><span>${escape(road.name)}</span>`
    + (Number.isFinite(road.pay) ? `<small>${escape(road.pay)} scrap</small>` : '') + '</button>').join('');
  return `<li class="story-step is-open is-run" data-ember-job="gas-run"><i class="story-tick" aria-hidden="true"></i>`
    + `<div class="story-step-words"><b>GAS RUN</b><small class="story-state">OPEN</small><p data-ember-feud="${escape(run.word)}">${escape(run.sentence)}</p></div>`
    + `<div class="ember-run-buttons">${buttons}</div></li>`;
}

export function emberWallMarkup(props) {
  if (!props?.available) return '';
  return `<section class="ember-wall" aria-label="The Everburn"><h3>THE EVERBURN</h3>`
    + `<article class="story-letter" aria-label="A note from Hollis"><span class="story-seal" aria-hidden="true"></span><p>${escape(EMBER_NOTE.text)}</p></article>`
    + `<ol class="story-steps" aria-label="The jobs">${props.steps.map((step,index)=>row({...step,action:props.step==='read'&&index===0?'read':step.id},index)).join('')}${props.run ? gasRunRow(props.run) : ''}</ol>`
    + (props.sideJobs.length ? `<section class="ember-notice-board" aria-label="Tin Town notice board"><h4>TIN TOWN NOTICE BOARD</h4><ul>${props.sideJobs.map(job =>
      `<li><b>${escape(job.name)}</b> · ${escape(job.kind)}<p>${escape(job.note)}</p><button type="button" class="secondary-button" data-ember-side-job="${escape(job.id)}"><span>Take job</span></button></li>`).join('')}</ul></section>` : '')
    + '</section>';
}

export function emberNextUp(props) {
  if (!props?.available) return null;
  if (props.step === 'read') return {text: 'Next up: read Hollis’s note on the Story Wall.', button: ''};
  if (props.step === 'done') return {text: 'Next up: the Everburn is lit. Drive the Scablands or replay a job.', button: ''};
  const index = EMBER_JOBS.indexOf(props.step), job = props.steps[index];
  if (!job) return null;
  return {text: `Next up: ${EMBER_JOB_NAMES[index]}. ${job.note}`,
    button: `<button type="button" class="start-button yard-next-button" data-ember-step="${escape(job.id)}"><span>${escape(job.button)}</span></button>`};
}

export function emberResultLine(result) {
  const id = result?.emberJob;
  const index = EMBER_JOBS.indexOf(id);
  if (index < 0 || result?.won !== true) return '';
  return `Everburn: job ${index + 1}, ${EMBER_JOB_NAMES[index]}, complete.`;
}

export function scablandsGateMarkup({available = false} = {}) {
  if (!available) return '';
  return '<nav class="scablands-gate" aria-label="Scablands"><button type="button" class="secondary-button" data-scablands-enter><span>BACK GATE</span></button>'
    + '<button type="button" class="secondary-button" data-scablands-drive><span>DRIVE THE SCABLANDS</span></button></nav>';
}

export {emberStoryProps};
