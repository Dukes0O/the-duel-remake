const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const percent = value => Number.isFinite(value) ? `${Math.round(value * 100)} out of 100` : 'not recorded';

export function townTeachModel(town, {jobs = []} = {}) {
  const people = (Array.isArray(town?.people) ? town.people : []).map(person => ({id:String(person.id), name:String(person.name || 'Town resident')}));
  const choices = jobs.filter(job => job && typeof job.kind === 'string' && typeof job.machineId === 'string').map(job => ({
    kind:job.kind, label:String(job.label || job.kind.replaceAll('-', ' ')), machineId:job.machineId,
  }));
  const sessions = (Array.isArray(town?.teachingSessions) ? town.teachingSessions : []).map(session => {
    const person = people.find(item => item.id === session.personId);
    const job = choices.find(item => item.kind === session.kind);
    const done = Number.isFinite(session.elapsedSeconds) ? Math.max(0, session.elapsedSeconds) : 0;
    const needed = Number.isFinite(session.requiredSeconds) ? Math.max(0, session.requiredSeconds) : 0;
    return {id:String(session.id || ''), person:person?.name || 'A town resident', job:job?.label || String(session.kind || 'job').replaceAll('-', ' '),
      done, needed, completed:session.completed === true};
  });
  const learned = (Array.isArray(town?.apprenticeships) ? town.apprenticeships : []).map(record => ({
    person:people.find(item => item.id === record.personId)?.name || 'A town resident',
    job:choices.find(item => item.kind === record.kind)?.label || String(record.kind || 'job').replaceAll('-', ' '),
    skill:percent(record.skill),
  }));
  return {people, jobs:choices, sessions, learned};
}

export function townTeachMarkup(model) {
  const explain = '<p>A job is a kind of work. An apprentice is a person learning a job. A skill is what a person has learned, and it helps them do a job without you.</p><p>Teach by showing the matching machine work. The game records how fast and how carefully you work. The apprentice learns from what you did.</p><p>The game measures demonstration time in seconds. A second is a unit of time.</p>';
  const choices = model.people.length && model.jobs.length ? model.people.flatMap(person => model.jobs.map(job =>
    `<li><span>${escapeHtml(person.name)} can learn ${escapeHtml(job.label)}.</span> <button type="button" data-town-teach-start="true" data-person-id="${escapeHtml(person.id)}" data-job-kind="${escapeHtml(job.kind)}" data-machine-id="${escapeHtml(job.machineId)}">Start the machine demonstration</button></li>`)).join('') : '<li>No person and machine pair is ready for a demonstration.</li>';
  const sessions = model.sessions.length ? `<section><h3>Demonstrations in progress</h3><ul>${model.sessions.map(session => `<li>${escapeHtml(session.person)} has shown ${escapeHtml(session.job)} for ${session.done} of ${session.needed} seconds.${session.completed ? ' This demonstration is complete.' : ' Show the rest of the demonstration before handing over the job.'}</li>`).join('')}</ul></section>` : '<p>No demonstrations are in progress.</p>';
  const learned = model.learned.length ? `<section><h3>Jobs already learned</h3><ul>${model.learned.map(record => `<li>${escapeHtml(record.person)} can do ${escapeHtml(record.job)}. The person's skill is ${escapeHtml(record.skill)}.</li>`).join('')}</ul><p>The skill amount is shown out of 100. A higher amount means the person has learned more.</p></section>` : '<p>No one has learned a job yet.</p>';
  return `<section class="town-teach" aria-labelledby="town-teach-title"><h2 id="town-teach-title">Teach a Job</h2>${explain}<h3>Choose a person and a job</h3><ul>${choices}</ul>${sessions}${learned}</section>`;
}

export function bindTownTeach(root, {onStartDemonstration = () => {}} = {}) {
  const click = event => {
    const button = event.target?.closest?.('[data-town-teach-start]');
    if (!button) return;
    onStartDemonstration({type:'startTeachingSession', personId:button.dataset.personId, kind:button.dataset.jobKind,
      machineId:button.dataset.machineId, teacherId:'player'});
  };
  root.addEventListener('click', click);
  return () => root.removeEventListener('click', click);
}
