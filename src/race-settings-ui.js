// The same values restore visible choices and supply the actual start options.
// Keep all segmented controls in sync after switching player or event.
export function syncRaceChoiceButtons(root,choices) {
  for(const button of root.querySelectorAll('[data-mode],[data-difficulty],[data-cpu-difficulty],[data-tyre]')) {
    const key=['mode','difficulty','cpuDifficulty','tyre'].find(name=>button.dataset[name]);
    const selected=button.dataset[key]===(choices[key]??(key==='tyre'?'summer':undefined));button.classList.toggle('on',selected);button.setAttribute('aria-pressed',String(selected));
  }
}
