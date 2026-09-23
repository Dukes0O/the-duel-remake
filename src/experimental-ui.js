const label = name => name.replaceAll('-', ' ').toUpperCase();

export function experimentalPanel(flags, storageMessage = '') {
  const previews = flags.betaFeatures();
  return `<section class="career-panel experimental-panel" role="dialog" aria-modal="true" aria-labelledby="experimental-title">
    <header class="shop-heading"><div><p class="eyebrow">EARLY FEATURES · THIS COMPUTER</p><h2 id="experimental-title">EXPERIMENTAL</h2></div><button class="shop-close" data-action="experimental-close" aria-label="Close Experimental">×</button></header>
    <p>Try features that are ready for play testing. Your choice is saved on this computer.</p>
    <label class="experimental-choice"><input id="experimental-toggle" type="checkbox" ${flags.experimental() ? 'checked' : ''}><span>Enable early features</span></label>
    ${storageMessage ? `<p class="experimental-storage" role="status">${storageMessage}</p>` : ''}
    <div class="experimental-list"><h3>Available to try</h3>${previews.length ? `<ul>${previews.map(name => `<li>${label(name)}</li>`).join('')}</ul>` : '<p>No early features are available yet.</p>'}</div>
  </section>`;
}
