# P4-YETI

Yeti is dev and requires enabled Summit. Three ridge sites lie 25–40 m off Devil's Staircase/Summit, derived from actual named-piece boundaries; no course, geometry or fixture changes. Sighting uses the simulation eye +1.2 m, chest +1.8 m, 60 m, 75 degrees, terrain samples every 2 m and actual solid boxes. No collider or camera input. One callout and existing roar, then accepted clips walk away.

Claude's 13 October 08:40 answer settles optional yetiSeed = hash32(baseSeed, runId), derived from the existing run identity at App start and retained as a recorded input. Only the private Yeti generator reads it; old packets without it retain the original base-seed draw. No new clock, counter, course RNG draw or geometry seed is introduced.

Only valid completed named-player Summit Duel, Time Trial, Time Attack and GP finishes count, including GP career off. Optional fields are normalized only when present. Invalid, incomplete, timeout, quit, qualifying, marked practice and recent duplicate results do not count. Existing pay, records, lap rules and old absent/off bytes remain exact.

The optional journal retains the 96 most-recent unique valid keys, each at most 180 characters, in normalization and live append. This is bounded recent duplicate protection, not unlimited history. At the existing 1,000,000 sighting cap, the identical profile returns without appending. Actual App current-result/run/named-owner guards remain. The final capacity follows the Director's measured serializer/backup proof: ordinary and GP-career-off appends leave 71,164 and 170,944 bytes below the unchanged 400,000-byte ordinary reserve. Those engineering probes do not replace final frozen-source save confirmation.

Three sightings unlock the accepted seated static LOD roof, about .45 m; five unlock Frost (#DCE8F0, metalness .1, roughness .55). Every owned car is eligible; earning never equips. Garage changes are menu-only. Yeti, Chrome and Turret share one roof slot. Choosing Yeti clears only the zero-stat Turret selection or old Chrome roof; paid plating and owned IDs remain. Choosing Turret clears only that car's Yeti choice. Yeti normalizes after actual Wasteland selection and rejects malformed conflicts. No stats, mass, armor or prices change. Existing paint has no flake setting, so none is added.

The dev catalogue adds only yeti and increases its count by one. Preview appends yeti with old flag order, port 5195 and memory-only behavior intact. Accepted high/LOD assets, 43 joints and five clips are untouched. The pure Crown helper shares the existing fit/stretch calculation; road loading uses the same per-car kit sources, independently owned cache/clones and actual sockets. Combat loading, updates and stats stay unchanged. Native grounding, look and listening remain deferred.

Tests first: the actual GP-career-off award failed before implementation. The new malformed fixture uses size 9 and position 2 for a completed loss, preserving the unchanged helper's valid sizes 2–8 and win/position agreement. GLTFLoader's actual sanitized bone names are used; the async fixture drains the real promise chain before asserting one disposal. Existing assertions are untouched.

Review found marked-practice counting, unbounded keys and Yeti/Turret overlap. Each has a real failing regression before repair. The final existing affected acceptance passes 147 controlled checks in 2.839 s, including the 96-key normalization/live append, cap identity, both roof directions, loaded conflict and actual normalized Scrapper plating retained during a Chrome-to-Yeti choice. The new plating fixture was corrected from an invalid invented ID to the existing Scrapper kit; no production assertion was relaxed. Original model, terrain/solid ray, finish/App, source isolation, stale disposal, combat and audio checks remain.

The original 8801676b nearby gate was canceled only in its verified owned tree and drained with exit -1 after 424.135 s; no aggregate pass or build. That superseded gate has no pass. Claude has now answered the input contract; its real input revision requires fresh source/save reviews and one original nearby/build. No native, browser, frame or balance acceptance is claimed.

## Removed

Unbounded optional Yeti settlement retention and conflicting Yeti/Turret selection behavior were replaced in this fix. Existing earned cosmetics and models remain; no new binary asset.


## Recorded input: contract before code

The clean automatic integration union is 824eb7b2. Preserve all reviewed 96-key, practice, cap and roof repairs. Hash only the existing base seed and immutable run identity; fixed-width integer hashing stays in the owned Yeti module. App starts all four modes with the optional input only on enabled real Summit. Game validates uint32 and records it without touching its base seed or any shared generator. The existing replay test adapter passes only a present recorded field, with absent fixtures and all fingerprint bytes unchanged; no fixture regeneration.

ActiveRace retains the optional input. The existing GP path normally has no pending record, so the Director's 4ea39dc0 grant permits only an enabled real Summit record with valid input and explicit Grand Prix mode/identity. Normalization preserves that mode; narrowly tagged recovery/early-return completion clears its own pending record without new charge or award authority. Ordinary interruption and police behavior remain exact. Actual App/save acceptance covers both GP career states, malformed/off/other-course rejection, distinct run identities and replay roundtrip. Fresh save review remains required.

The meaningful actual-App regression failed before input implementation: actual Duel start records no private Yeti input. No broad gate/build, frame/browser/balance/full or real-save action is part of this correction.

The new active-input fixture initially advanced a fixed 3.1 seconds, which can end before the actual GP light sequence reaches GO. It now waits through the actual bounded countdown and asserts racing before recording; no clock/state forcing or saved-input assertion was removed.

The final affected acceptance passes 271 controlled checks. It covers actual cold memory reload and abandonment for starts with both GP career states. A narrow tag guard retains the original GP no-marker early return without even refreshing its profile; an existing-style call regression pins that legacy seam.

The recorded-run sample has 89 appearances in 300 distinct identities with base seed 1989 unchanged. Actual start, packet replay and saved-input tests pass for all four modes. Additional stable-ID checks reject missing/mismatched/unavailable Summit and keep Grand Prix mode when only a saved numeric course position moved; the disposable catalogue change is restored in finally.

## Existing paint-test correction

The original unfiltered lane on cc5d5d19 completed 288/289 passed, one failed and zero unrun; exit 1 after 1,167,822.5282 ms wall time (suite aggregate 1,163,140.6408 ms). No build ran. Its only failure was the old four-preset catalogue count. Director grant 1b759bf1 permits five presets: the same three ordinary finishes and two reward finishes. The same finite 0..1 material bounds still check every original field on the original four presets; Frost uses only its two authored finish fields and its exact settled descriptor. The existing renderer retains factory values for omitted finish fields. No production material, value, tolerance, purchase, ownership, save or performance assertion changes.

## Final integrated source verdict

Final ace5cb5f source passed original nearby289/289, failures empty/notRun0/jobs4,1558086.503ms wall; build571ms/wall1128.7403ms, source and actual same Save Guardian confirmations CLEAR. Conflict-free integrationcb6aef9e needs no repeat. Native grounding/look/audio remain open, dev stays dev, core/save locks released, older retained lane preserved.
## Native encounter recipe, source preparation only

Director grant b858a349 permits only tools/scenarios/yeti.mjs and this note.
The existing browser harness runs a private memory-only App and an actual
purchased Summit Time Trial: F42, winter tyres, casual, Medium, base 1989,
standard line driving at .95. The single fixed identity is yeti-run-0;
its private hash is 3395618052, selecting the first authored ridge site.
This identity comes from the already used controlled run-ID sample, not a
natural race-frequency claim. The scenario restores crypto.randomUUID
immediately after the actual App start and verifies its recorded input.

Normal App RAF drives from the starting grid. No player pose, course seed,
race time, phase, seenAt, collider, racing line, reward or save schema is
assigned. Existing line-driver convention disables only the demo shoulder
visit. Actual event delivery supplies the once-only YETI! callout and roar.
The renderer loads the accepted high/LOD asset; the scenario reads its real
skinned feet, both foot joints and rendered terrain during idle, roar,
chest-beat, lope and walk-off. Pictures change only the inspection camera,
restoring it immediately and checking state identity. Observed foot gaps
and pictures need grounding/appearance review; no new tolerance is invented.

The existing output PCM recipe records the actual encounter at its runtime
mix, after decoding the existing roar before start. It records the actual
once-only event, native phase ages, source hashes, foot positions, bone
poses, unchanged obstacle bytes and recorded race input. The fixed fixture
is separate from the accepted 89/300 controlled appearance sample. Native
execution, pictures, actual grounding and human listening are UNRUN; no
source preparation pass can grant those. No fourth art round is created.

### Removed

Nothing is replaced. No production source, model, sound, fingerprint or
saved reward changes. This one card-specific scenario reuses the existing
harness, line driver and PCM helpers; it adds no generic framework. The
retained lane stays in place. Checks/build/browser execution wait for the
release hold to clear and Root's ordered dispatch.

The ordinary review found two real observer faults before execution. The
130 m camera admission now applies only to unseen idle: after a real
sighting, all active phases remain observable as the unchanged driver
continues. The packet records actual PCM sample/frame counts and requires
nonempty audio; empty recordings never enter the loudness analyzer. Cleanup
and audio-processing errors mark the packet incomplete while preserving
the original failure reason and recorded facts before final persistence.
These are observer corrections only; native execution remains UNRUN.

Read-only GLB review found another real observer fault: several accepted
skinned primitives have the foot bones but no foot-weighted vertices. The
observer now follows production makeActor and skips only empty >.25 foot
influence sets, recording each actual weighted-vertex count. Both FootL
and FootR still need actual witnesses, rendered terrain and finite gaps.
No model, grounding rule or production view changes; no native run or
check is claimed for this source correction.

## Verified native observer and actual pending verdict — 14 October

Frozen a94993a1 passed original nearby18/18, failures/unrun0, jobs4,142307.4749ms; buildexit0/Vite2.42s/wall5493.6273ms. Independent review applies to byte-identical b55/868 observer; no production/save change. Existing native scenario passed on private6860, memory-only,251128.3357ms, errors0 and one explicit duplicate-Three warning. Fixed appearing run yeti-run-0/base1989/yetiSeed3395618052/site0 reached all five actual phases;12945 observed rows, unchanged obstacle bytes, exactly one YETI!/yeti.roar at213.8416667s. Actual recording1318912PCM samples, -15.72LUFS/-6.98dBTP. Appearance fixture does not measure natural frequency. No frame or listening pass claimed.

Root reviewed all five actual pictures: one foot stays in terrain contact, but the stationary opposite foot is visibly raised on the slope, measured+0.2817628m in idle/roar/chest; lope+0.1422544m and walk-off+0.0513399m. Therefore mechanical observer acceptance is green, full grounding/look acceptance is PENDING. No tolerance invented, picture retouched, actor moved or fourth art round. Claude's actual grounding verdict and roar listening follow on the card. Retain native photos/WAV/JSON until those verdicts. Source-only observer merge is conflict-free with no repeated lane run; older lane/folder and original branches remain under Kyle's ownership rule. Yeti remains dev.
## Accepted lower-contact placement correction — 14 October

Claude accepted the actual roar and specified one rigidroot placement change: choose the lower foot contact so the opposite foot sinks into snow rather than floating. Testsfirst in existing actual-model block, unchanged accepted43joint High/LOD assets and authoredslope: tenactualstationary/phase/quality samples observe real foot-weighted vertices and drawnterrain, require bothfeet finite, nofootabove snow and onecontact at existing1e-6. Originalmodel/rig/disposal/readonly/sighting/save/pay assertions retained. Actual RED on originalb6a5872a with workingtestSHAf21915ab: exit1/9723.3433ms, exact 'neither actual foot floats above the rendered snow'. No assertion relaxed.

Production changes only Infinity initialization and minimum requiredrootlift in src/yeti-view.js; no bone/clip/tint/texture/site/course/simulation/save/reward/audio/asset changes. Accepted roar packet remains the listening verdict; this is not an art round. Independent review and correctedunit/originalnearby/build/native remain pending until actual receipts. Removed: maximum-contact root seating that left the opposite stationary foot raised on the authoredslope; no donor or clip removed.