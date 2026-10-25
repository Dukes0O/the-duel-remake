// The Lab screen's page parts as plain markup (docs/LAB.md sections 2 to 4). Pure strings in, strings out: lab-view.js puts
// them on the page and handles the buttons (`data-lab` actions, `data-lab-lesson`, `data-lab-control`, `data-lab-buy`).
import {CARS} from '../config.js';
import {lessonBoardMarkup} from '../lessons/lesson-board.js';
import {LAB_GROUPS} from './lab-lessons.js';
import {RUST_PARTS, PROTECTIONS} from './lab-workshop.js';

const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const credits = value => Math.floor(Number.isFinite(value) ? value : 0).toLocaleString('en-US');

// A choice's words: a car by its name, a place with its hyphens turned to spaces.
export const optionLabel = option => CARS[option]?.name ?? String(option).replace(/-/g, ' ');

export function headerMarkup({credits: wallet, tab}) {
  const tabs = [['lessons', 'Lessons'], ['shop', 'Shop']].map(([id, name]) =>
    `<button type="button" role="tab" data-lab-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}">${name}</button>`).join('');
  return `<header class="lab-head"><div><p class="eyebrow"><i></i> THE LAB</p><h2 id="lab-title">BRIAN'S WORKSHOP.</h2></div>` +
    `<nav class="lab-tabs" role="tablist" aria-label="Lab sections">${tabs}</nav>` +
    `<div class="lab-wallet"><span>YOUR CREDITS</span><b>${credits(wallet)}<small> CR</small></b></div>` +
    `<button type="button" class="lab-close" data-lab="close" aria-label="Leave the Lab">×</button></header>`;
}

export function boardMarkup({rows, message = ''}) {
  const groups = LAB_GROUPS.filter(group => rows.some(row => row.group === group));
  const body = rows.length ? lessonBoardMarkup(rows.filter(row => groups.includes(row.group)).map(row => ({...row})), {action: 'data-lab-lesson'})
    : '<p class="lab-empty">The Lab is not open yet.</p>';
  return `<section class="lab-board" aria-label="Lessons"><p class="lab-hint">Pick a lesson to see its bench. Any open lesson can be taken in any order, and retaken.</p>${body}` +
    `${message ? `<p class="lab-message" role="status">${escape(message)}</p>` : ''}</section>`;
}

const rangeText = (row, value) => `${value}${row.unit ? ` ${escape(row.unit)}` : ''}`;
function controlMarkup(row, value) {
  if (row.options) {
    return `<label class="lab-control"><span>${escape(row.label)}</span><select data-lab-control="${escape(row.id)}">${
      row.options.map(option => `<option value="${escape(option)}"${option === value ? ' selected' : ''}>${escape(optionLabel(option))}</option>`).join('')}</select></label>`;
  }
  return `<label class="lab-control"><span>${escape(row.label)}</span><input type="range" data-lab-control="${escape(row.id)}" min="${row.min}" max="${row.max}" step="${row.step}" value="${value}">` +
    `<output>${rangeText(row, value)}</output></label>`;
}

// The checks under the rust bench's challenge: one choice for each part, and what the last check found.
function protectMarkup(protect) {
  if (!protect) return '';
  const rows = RUST_PARTS.map(part => {
    const last = protect.result?.rows.find(row => row.part === part.id);
    return `<li data-part="${part.id}"><div><b>${escape(part.name)}</b><small>${escape(part.lives)}</small></div>` +
      `<select data-lab-protect="${part.id}" aria-label="${escape(part.name)} protection">${
        PROTECTIONS.map(item => `<option value="${item.id}"${protect.picks[part.id] === item.id ? ' selected' : ''}>${escape(item.name)}</option>`).join('')}</select>` +
      `${last ? `<em class="${last.ok ? 'good' : 'bad'}">${last.ok ? 'Right' : 'Not that'}: ${Math.round(last.rust * 100)}% rusted after a week (bare: ${Math.round(last.bareRust * 100)}%)</em>` : ''}</li>`;
  }).join('');
  return `<div class="lab-protect"><p>Choose the least protection that keeps each part clean for the week.</p><ul>${rows}</ul>` +
    `<button type="button" data-lab="protect-check">Check my choices</button></div>`;
}

export function benchMarkup({lessonId, name, controls, settings, readout, challenge, protect = null, hasRun, explained, message = ''}) {
  const dials = controls.map(row => controlMarkup(row, settings[row.id])).join('');
  const readoutHtml = readout.length
    ? `<dl class="lab-readout" aria-label="Result">${readout.map(item => `<div class="${item.tone ?? ''}"><dt>${escape(item.label)}</dt><dd>${escape(item.value)}</dd></div>`).join('')}</dl>`
    : '<p class="lab-hint">Set the dials and press Run.</p>';
  const ready = challenge.state === 'ready';
  const button = challenge.state === 'locked' ? '' :
    `<button type="button" class="lab-challenge-button" data-lab="challenge"${ready ? '' : ' disabled'}>${escape(challenge.label)}</button>`;
  const brian = hasRun ? `<button type="button" data-lab="again">${explained ? 'Brian again' : 'Hear Brian'}</button>` : '';
  const passed = challenge.passed ? '<span class="lab-passed">✓ Passed</span>' : '';
  return `<section class="lab-bench" data-lesson="${escape(lessonId)}" aria-label="${escape(name)} bench"><button type="button" class="lab-back" data-lab="back">← All lessons</button>` +
    `<h3>${escape(name.toUpperCase())} ${passed}</h3><div class="lab-controls">${dials}</div>` +
    `<div class="lab-actions"><button type="button" class="lab-run" data-lab="run">Run</button>${brian}</div>${readoutHtml}` +
    `<div class="lab-challenge lab-challenge-${challenge.state}">${challenge.note ? `<p>${escape(challenge.note)}</p>` : ''}${button}${ready ? protectMarkup(protect) : ''}</div>` +
    `${message ? `<p class="lab-message" role="status">${escape(message)}</p>` : ''}</section>`;
}

export function shopMarkup({rows, choices, wallet, message = ''}) {
  const items = rows.map(item => {
    const state = item.owned ? 'owned' : item.canBuy ? 'open' : 'shut';
    const price = item.free ? 'Free' : `${credits(item.price)} CR`;
    const button = item.owned ? '<span class="lab-owned">✓ Owned</span>'
      : item.free ? `<small>${escape(item.note || 'Passed')}</small>`
        : `<button type="button" data-lab-buy="${escape(item.id)}"${item.canBuy ? '' : ' disabled'}>Buy</button>`;
    return `<li class="lab-shop-${state}" data-upgrade="${escape(item.id)}"><div><b>${escape(item.name)}</b><small>${escape(item.lessonName)}</small></div>` +
      `<span class="lab-price">${price}</span>${button}${!item.owned && item.note && !item.free ? `<em>${escape(item.note)}</em>` : ''}</li>`;
  }).join('');
  const group = (title, key, list) => list.length > 1 ? `<div class="lab-choice"><span>${title}</span>${list.map(item =>
    `<button type="button" data-lab-${key}="${key === 'ring' ? item.index : item.metres}" aria-pressed="${item.chosen}" class="${item.chosen ? 'on' : ''}">${escape(item.name)}</button>`).join('')}</div>` : '';
  const picks = (choices.showRing ? group('Drop ring', 'ring', choices.ring) : '') + (choices.showCable ? group('Cable', 'cable', choices.cable) : '');
  return `<section class="lab-shop" aria-label="Shop"><p class="lab-hint">Each upgrade opens when its lesson is passed.</p><ul class="lab-shop-list">${items}</ul>${picks}` +
    `${message ? `<p class="lab-message" role="status">${escape(message)}</p>` : ''}</section>`;
}

export function captionMarkup(text) {
  return text ? `<p class="lab-caption-text"><b>BRIAN</b> ${escape(text)}</p>` : '';
}

// The strip shown in a race while the G-force lap is armed.
export function gforceStripMarkup(view) {
  if (!view) return '';
  const words = {building: 'Take a corner hard', counting: 'Hold the road to the end of the corner', 'off the road': 'Off the road: that corner does not count',
    between: 'Next corner', passed: view.saveNote ? `Passed, but not saved: ${view.saveNote}` : 'G-force lap passed'}[view.state] ?? '';
  return `<div class="lab-gforce" role="status"><b>${view.g.toFixed(1)} g</b><span>CORNERS ${view.count}/${view.need}</span><em>${escape(words)}</em></div>`;
}
