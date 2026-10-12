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
