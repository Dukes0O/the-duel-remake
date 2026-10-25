// The instructor's list (docs/DRIVING_LESSONS.md section 2), shared by the
// helipad and the driving Instructor screen. Plain rows in, the list out:
// each row is {group, id, name, open, done, note}; a shut row says its note (LAB-VIEW) or "Opens later". When the rows hold more than
// one group, each group gets a heading. Drawing only; the caller owns the
// panel around it and what its buttons do (`action` names their data
// attribute, its value is `start:<id>`).
const escape = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));

const row = (item, action) => {
  const state = item.done ? 'done' : item.open ? 'open' : 'locked';
  const button = item.open || item.done
    ? `<button type="button" ${action}="start:${escape(item.id)}">${item.done ? 'Retake' : 'Start'}</button>`
    : `<small>${escape(item.note || 'Opens later')}</small>`;
  return `<li class="lesson-board-${state}"><span>${item.done ? '✓ ' : ''}${escape(item.name)}</span>${button}</li>`;
};

export function lessonBoardMarkup(rows, {action = 'data-lesson'} = {}) {
  if (!rows?.length) return '';
  const groups = [...new Set(rows.map(item => item.group))];
  const items = groups.length > 1
    ? groups.map(group => `<li class="lesson-board-group">${escape(group)}</li>${
      rows.filter(item => item.group === group).map(item => row(item, action)).join('')}`).join('')
    : rows.map(item => row(item, action)).join('');
  return `<ul class="lesson-board">${items}</ul>`;
}
