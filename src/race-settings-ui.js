import {coachAllowed,coachEnabled,setCoachEnabled} from './coach-markers.js';

// The same values restore visible choices and supply the actual start options.
// Keep all segmented controls in sync after switching player or event.
export function syncRaceChoiceButtons(root, choices) {
  for (const button of root.querySelectorAll('[data-mode],[data-difficulty],[data-cpu-difficulty],[data-tyre]')) {
    const key = ['mode', 'difficulty', 'cpuDifficulty', 'tyre'].find(name => button.dataset[name]);
    const selected = button.dataset[key] === (choices[key] ?? (key === 'tyre' ? 'summer' : undefined));
    button.classList.toggle('on', selected);
    button.setAttribute('aria-pressed', String(selected));
  }
}

export function qualifyingChoiceMarkup() {
  return '<div id="qualifying-choice" class="setup-line" hidden><span class="field-label">QUALIFYING</span><div class="segmented" role="group" aria-label="Qualifying"><button type="button" class="choice on" data-qualifying="skip" aria-pressed="true">SKIP</button><button type="button" class="choice" data-qualifying="drive" aria-pressed="false">TWO FLYING LAPS</button></div></div>';
}

const boundQualifyingChoices = new WeakMap();
export function syncQualifyingChoice(root, choices, course = {}) {
  const group = root.querySelector('#qualifying-choice');
  if (!group) return;
  const grandPrixButton = root.querySelector('[data-mode="grandprix"]');
  const available = choices.mode === 'grandprix' && course.closed !== false && !!grandPrixButton && !grandPrixButton.hidden;
  group.hidden = !available;
  if (!available) choices.qualifying = false;
  for (const button of group.querySelectorAll('[data-qualifying]')) {
    button.disabled = !available;
    const selected = (button.dataset.qualifying === 'drive') === (choices.qualifying === true);
    button.classList.toggle('on', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (!boundQualifyingChoices.has(button)) {
      button.addEventListener('click', () => {
        if (button.disabled) return;
        const {choices:currentChoices, course:currentCourse} = boundQualifyingChoices.get(button);
        currentChoices.qualifying = button.dataset.qualifying === 'drive';
        syncQualifyingChoice(root, currentChoices, currentCourse);
      });
    }
    boundQualifyingChoices.set(button, {choices, course});
  }
}

// The menu supplies the current owner and event. This control changes only a
// transient presentation preference; it never calls a save or start method.
const boundCoachChoices = new WeakMap();
export function syncCoachChoice(root, app, choices, stage) {
  const anchor = root.querySelector('#qualifying-choice');
  if (!anchor) return;
  let group = root.querySelector('#coach-choice');
  if (!group) {
    group = root.ownerDocument.createElement('div');
    group.id = 'coach-choice';group.className = 'setup-line';
    group.innerHTML = '<span class="field-label">COACH</span><div class="segmented" role="group" aria-label="Coach markers"><button type="button" class="choice" data-coach="off">OFF</button><button type="button" class="choice" data-coach="on">BRAKE AND APEX</button></div>';
    anchor.insertAdjacentElement('afterend', group);
  }
  const available = stage.closed !== false && coachAllowed({enabled:true,
    playerId:app.player?.id,runPlayerId:app.player?.id,racePlayerId:app.player?.id,
    flag:app._switches?.().enabled('grand-prix') === true,intelLevel:app.getIntelLevel?.(stage.id) ?? 0,
    status:'racing',mode:choices.mode,difficulty:choices.difficulty,cpuDifficulty:choices.cpuDifficulty,
    cup:!!app.profile?.cups?.active});
  group.hidden = !available;
  for (const button of group.querySelectorAll('[data-coach]')) {
    button.disabled = !available;
    const selected = (button.dataset.coach === 'on') === coachEnabled(app);
    button.classList.toggle('on', selected);button.setAttribute('aria-pressed', String(selected));
    if (!boundCoachChoices.has(button)) button.addEventListener('click', () => {
      if (button.disabled) return;
      const current = boundCoachChoices.get(button);
      setCoachEnabled(current.app, button.dataset.coach === 'on');
      syncCoachChoice(root, current.app, current.choices, current.stage);
    });
    boundCoachChoices.set(button, {app,choices,stage});
  }
}
