# BALANCE-W2-OFF-RETIRE

Status: building. Source, balance-tool, test-fixture and scenario cleanup is
prepared in this lane. AUD-17 still owns the sound-bank hook, so the audio
catalog and final switch removal wait for that owner to release it.

## Decision

Kyle approved retiring wasteland2, scrapdome, titan-climb, muddy-hollow and
warlords on 30 September 2026. Saved gate discovery still decides when a
player gets Wasteland rules. The released behavior and race fingerprints must
stay the same. This lane does not edit src/warlords/ after Kyle's 2 October
instruction or the protected Twin Vultures file.

## Checks

- Before code: combat-balance acceptance 40/40, feature-switch checks 32/32,
  Wasteland beta catalog suite 10/10.
- Direct source and balance changes: arena/UI/discovery/Warlord/Side Saws/
  launcher bundle 102/102; Muddy Hollow 49/49; combat-balance CLI 33/33.
- The 3 October diagnostic lane tier ran all 344 suites: 343 passed. The sole
  failure was one missing AudioWorklet block in the browser audio peak suite
  under eight parallel jobs. That unchanged suite then passed 23/23 alone,
  with measured final sample and true peaks below -1 dB. No assertion was
  changed for it. The required lane gate then passed all 344 suites in 564.12 s;
  npm run build passed in 422 ms. This is a partial slice, not merge evidence.
- Focused fixture bundles after the diagnostic passed: arena, settlement and
  career 302/302; combat and on-foot 80/80; Arsenal, crew, renderer and
  Hidden Road 129/129; projectile body and replay 35/35; combat armor 18/18;
  crash switch 17/17; steering and on-foot replay suites 3/3.
- Ten steering and four on-foot full-state hashes match current integration
  exactly for identical discovered inputs. Original historical pins remain;
  separate discovered-input pins were added. Combat replay pins still pass.
  The approved projectile-height trace and its SHA-256 stay unchanged.
- Browser scenario URL overrides were removed in 48 owned scenarios. Their
  browser journeys remain to be checked after the audio hook lands. Board
  parsing and diff whitespace checks pass.

## Changed assertions

- The real App reward fixture now starts a discovered career. Its four-hit,
  one-wreck win pays exactly 320 scrap and zero credits on both integration
  and this lane. The once-only save and result-screen checks remain; pure
  credit-formula tests remain.
- Renderer and on-foot negative fixtures use an undiscovered saved gate.
  The camera preference is checked after a discovered career reload.
  Pre-gate raider salvage stays absent; a discovered full-resource run
  collects a real crate. No simulation assertion was relaxed.
- The Salt Flats launcher no longer tests rejection through the retired
  Wasteland and Scrapdome switches (two entries in each of two loops).
  Rank, saved discovery, Salt and Fuel development switches, malformed
  fields and physical/replay checks remain.
- The Fuel Run blocked-launch loop lost only its retired Scrapdome entry.
  The rank, mode switch, discovery, ownership and menu refusals remain.
- One duplicate combat-armor test also asserted that the retired catalog
  switch was on. It was deleted; its ordinary and undiscovered armor checks
  remain in the next test. The enemy-aim control keeps its historical
  metadata key and exact hash.

## Removed

- Removed retired Wasteland, Scrapdome, Titan climb, Muddy Hollow and Warlord
  off guards from their owned source paths. Gate discovery, unfinished
  feature switches, malformed input and player ownership still gate entry.
- Removed the Wasteland on/off option and duplicate off samples from combat
  balance. Arena and on-foot balance use discovered released rules; Arsenal
  remains an optional measurement. Operations now calls for one run.
- Removed off-only Warlord launch, intro, yard, format and Side Saws tests in
  test-warlord-format, test-warlord-hooks, test-warlord-settlement,
  test-side-saws and test-arena-ui. Positive fights, ownership, discovery,
  reward, ordinary-race and unknown-ID cases remain.
- Removed off-only Muddy Hollow construction, surface, departure, content
  and reward cases in test-muddy-hollow. Pre-discovery, ordinary-road and
  on-path behavior remain.
- Removed the two Titan switch-off climb/slope tests in test-titan-climb and
  the switch-off traffic-shield test. Positive Titan, Rally, ordinary-car,
  impact, shield and replay cases remain.
- Removed retired switch settings from tests and 48 browser scenario URLs.
  Removed 52 obsolete Board flag fields. The Salt control trace was not
  regenerated.

## Pending

AUD-17 must release src/sound-bank.js before this lane can remove its cue
flags, the remaining src/audio.js gates, the feature catalog entries and the
audio/catalog tests. The root AGENTS.md release-evidence wording belongs to
integration, not this lane. Then run the exact required lane tier and build,
review, merge, update status, run the full tier, and clean the lane.
