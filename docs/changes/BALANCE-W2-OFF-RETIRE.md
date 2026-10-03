# BALANCE-W2-OFF-RETIRE

Status: building. Kyle released the idle AUD-17 sound-bank hook for this card
on 3 October. The Wasteland cue flags and audio off paths are removed in this
lane; the final catalog cleanup and gate are still pending.

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
- After Kyle's audio hook release, combat audio passed 10/10; Arsenal core
  audio passed 14/14; Arsenal wave-one audio passed 36/36. Feature checks
  passed 32/32; Wasteland beta evidence passed 8/8. The build passed in
  474 ms. These are focused checks, not a final lane gate.
- The first full diagnostic after audio cleanup passed 340/344 suites in
  556.23 s. Its four failures were retired Scrapdome/Muddy Hollow audio-off
  assertions and a historical Arsenal vector comparison that still needed
  its original Wasteland flag. Focused reruns now pass: arena feel 5/5, Sal
  art 9/9, Muddy Hollow audio 30/30 and Arsenal runtime 209/209. The exact
  lane gate still needs a fresh run after the remaining cue decision.
- The exact lane run stopped at 115/344 when the native browser peak
  capture skipped an AudioWorklet timeline block in all three buses. Its
  sample and true peaks stayed below -1 dB. The unchanged audio suite
  passed 22/23 once alone and 23/23 on the next standalone run. No peak
  assertion changed. A fresh full lane pass is still required.
- Private browser checks passed with memory-only saves and zero console
  errors or warnings: audio-moving (two motion cases), wasteland-beta
  (six ordered events and six captures), and combat-audio (nine cue
  families, three variants each, spatial motion and recorder levels).
  The moving and combat probes first exposed missing discovered-gate state
  in synthetic audio contexts; setting it made the unchanged checks pass.
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
- Audio tests now check the real discovery field for flight ownership and
  retain positive recording, variant, spatial and peak checks. The two
  Arsenal audio recipe pins remain exact by restoring only the removed cue
  flag in test memory before hashing. No sound body or recipe is exempt.
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
- Removed only the retired off-state assertions in arena feel, Sal art
  and Muddy Hollow audio. Their positive event, spatial, cue identity,
  recipe, credit and sound checks remain. The retained Arsenal source
  comparison receives its original always-on Wasteland flag only while
  calling those exact historical modules; current source receives no flag.
- Removed 12 `flag: 'wasteland2'` sound-bank fields, the audio legacy
  fallback path, and the switch-off-only combat audio test. Original recorded
  cue files, layers and recipes remain unchanged. Audio now uses saved gate
  discovery for mixer and projectile ownership.
- Removed retired switch settings from tests and 48 browser scenario URLs.
  Removed 52 obsolete Board flag fields. The Salt control trace was not
  regenerated.

## Pending

The released sound-bank hook covers only the Wasteland cue flags. Seven
Muddy Hollow and Scrapdome cue fields still name retired switches; Kyle was
asked whether to remove those fields as part of this card. Until then, keep
those catalog switches and the seven fields so their sounds still play.
The root AGENTS.md release-evidence wording belongs to integration, not this
lane. The exact lane tier, build, review, merge, status and full tier remain.
