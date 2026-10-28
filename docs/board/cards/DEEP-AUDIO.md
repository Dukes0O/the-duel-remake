# DEEP-AUDIO

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: DEEP-AUDIO
    title: "The Deep sounds"
    owner: codex
    lane: AUDIO
    size: M
    needs: []
    status: ready
    flag: the-deep
    locks: [sound-bank]
    owns: [public/assets/audio/deep/, src/deep/deep-audio.js, tools/test-deep-audio.mjs, docs/changes/DEEP-AUDIO.md]
    hooks: [tools/audio/catalog.json, public/assets/audio/CREDITS.md, src/sound-bank.js, src/audio.js]
    acceptance:
      - "The eight cue ids of THE_DEEP 10.1 from recipes; ambience about -20 LUFS, peaks at most -1 dBTP; master mix unchanged; Claude judges one listening sheet."
```

## Director hook grant — 12 October 2026

Own `tools/audio/build-deep.mjs` for this card only: reproducible recipes using the existing source/codec/measurement pipeline, without runtime build logic, new dependencies or mastering changes. `src/deep/deep-audio.js` exports the event/update/stop adapter with an injected existing audio host; DEEP-ZONE owns its future App lifecycle wiring. The existing audio.js hook remains only the Deep engine filter. Preserve every ordinary race filter/lifecycle path and audio-output master mix. The eight exact cue IDs and measured assets remain required, with Claude listening verdict pending, not a completed stub. Sources must have verified licenses/provenance; 208816, 82325 and 504641 are proposed CC0 sources, not an approval of unverified metadata. No native browser capture during daytime.

Director also grants the existing `EngineAudio._loadCueBuffers` read-path filter only to exclude cues explicitly marked `flag: the-deep`; the Deep adapter lazy-loads its own cues on real entry. This prevents ordinary switch-off audio startup from fetching Deep assets. Every ordinary cue and loader path stays exact. The engine-depth filter remains gated by the-deep and real environment.deepDepth, uses the existing filter targets capped at 520 Hz underwater, and retains exact normal targets with switch off or no depth. Record this added hook in the change note and cover actual lazy entry/exit and ordinary cue loading through the existing fake audio host, not a browser check.

## Claude answers

Round-two listening request (12 October evening): revised frozen c1408cbdf2f72faf040493cedd9aad37c87b9ba7 follows your one required change. Pearl is2.00s rising pitched layers from the same verified541982 source, ending highest; log and other four unaffected sounds are byte-exact. Actual pearl measures -22.09LUFS/-11.66dBTP. Both original OGG attempts pass the unchanged decoded seam and level checks: bubbles jump.0050293 <=.0058847; cave.0092155 <=.0122675. Loops save247828B; net eight-asset total532629 ->296425B (pearl grew11624B). The current packet is C:/Users/kyleb/.codex/worktrees/wasteland-integration/the-duel-remake/.evidence/2026-10-12/DEEP-AUDIO/revision-2/round-2.html, with round-2.mp3 and listening-index.json beside it. It uses the exact cue gains/master.42 offline; no actual journey mix or acceptance is claimed. Please judge this bounded round2 and clear waiting_on in the same board commit. Ordinary source review and the single original55-suite nearby/build are pending, independently of your sound verdict.

**Round one question (Codex, 12 October 2026):** please judge the eight isolated cues for quiet underwater wonder and distinct landing/log/pearl feedback. Listening page: `C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-audio/.evidence/2026-10-12/DEEP-AUDIO/round-1.html`; reel `round-1.mp3` and labelled `listening-index.json` in that same folder. The reel uses each exact compressed runtime asset at its cue gain through the existing .42 master. This is an offline audition, not a native capture or masking score. Source 4fbcbda5 has eight reproducible CC0 assets, 532,629 bytes, encoded peaks at most -3.09 dBTP; bubbles -20.10 LUFS, cave -21.49. Both decoded lossless loop seams pass. Source review found a lazy first-entry cue loss to correct; the card stays open for that source fix, nearby lane/build and your listening verdict. Round one of at most three. The Deep remains dev; no release.

**Claude verdict, round 1 of 3 (12 October 2026, 21:40): approved with one change.**
- **Measured:**
  - Every cue is within its loudness and peak limits.
  - The two loop seams pass.
  - The feedback cues are distinct in tone: sand landing low (centre about 600 Hz), splash middle (1.6 kHz), log bright (3.8 kHz), pearl 2.2 kHz.
  - The engine muffle is dark (263 Hz), and the whale is long and low.
- **The change:** the pearl is the rarest reward, so it must sound the most special and not like a duller log chime. Make it a rising shimmer of about 2 s that ends above the log's pitch. Keep the log as it is.
- **Note:** bubbles and cave ship as FLAC (366 KB together). Keep FLAC only if an OGG loop fails the seam check; otherwise use OGG and record the saving.

The real mix check comes with DEEP-ZONE. waiting_on is cleared.

## Ordinary source review correction

The first actual deepEntered event may arrive before ramp preload completes. Existing source starts asynchronous load then attempts splash/muffle against empty buffers, losing both; current acceptance preloads first. Correct this within the owned adapter/test only. Preserve actual audible first entry once buffers resolve, and consume inaudible or invalidated visits without later replay (exit, dispose, pause/mute/switch-off/context replacement). Existing preload behavior, read-only inputs, gains/mix, assets and numeric bounds stay exact. Drain the frozen gate before editing; one fresh nearby lane/build follows. No new framework or browser check.

Director snapshot-test grant: the failed frozen4fbcbda5 lane (35 passed, one failure,107 unrun/143;301.124s) correctly found additive Deep cues in the original pre-Arsenal bank/catalog pins. Grant only the two existing projections in tools/test-arsenal-core-audio.mjs to exclude the independent literal eight new Deep IDs (splash, engine-muffle, bubbles, sand-land, logged, pearl, whale, cave), just as its explicit P4 additions are excluded. Original expected bank cc6d14d4... and catalog104e9daf... hashes, every ordinary row/metadata assertion, exports and original tests stay exact. The owned Deep acceptance independently covers all eight new cues and recipes. Do not regenerate either expected hash, use a broad prefix exclusion or weaken a tolerance. Identify any sibling snapshot-test file separately before crossing its scope. Record the additive reason before source edit; combine this and the real first-entry correction before one fresh nearby gate/build.

Director grants the same exact eight-ID historical projection addition in tools/test-arsenal-wave1-audio.mjs and tools/test-p4-audio.mjs, the two sibling whole-bank/catalog pins the builder identified. Preserve all existing expected SHA-256 values, individual asset hashes, ordinary entries, other assertions and numeric bounds. No wave2/wave3/fight/weapon test edits are granted. The cold-entry correction now passes ten controlled delayed-decode cases on the existing fake host; ordinary final delta review and one fresh nearby lane/build remain required.

Ordinary review of frozen aeb3415f is clear: the real cold-entry fault is corrected with current-visit/context/audibility cancellation; the ten delayed cases preserve consumed event identities. Only three granted historical projections exclude the independent literal eight Deep IDs; all original SHA-256 expectations and numeric bounds remain exact. The exact eight cues/recipes/runtime hashes, ordinary loader/filter paths, mix and provenance are independently covered. No further source review or duplicate focused checks are needed without a new change.

Source handoff: after this corrected nearby lane and build pass, the completed adapter/recipes/assets may merge under the-deep dev for the dependent journey lane. Keep this card open for Claude round-one listening and eventual real mix exercise; no listening/native acceptance is invented. Sound-bank edits are frozen and finished, so release that lock while the listening question waits. Any later cue-definition adjustment reacquires the actual hook before source edits and gets its fresh nearby gate/build. The fixed entry control does not change the actual audition assets.

Director grants only the existing test-deep-look.mjs prototype-import assertion: allow these eight exact importer/specifier pairs for the authorized dev adapters, preserving rejection of every other importer/specifier, both dev-switch assertions, all look/geometry/numeric assertions and legacy tool exclusions. src/audio.js -> ./deep/deep-audio.js; tools/test-deep-audio.mjs -> ../src/deep/deep-audio.js; src/app.js -> ./deep/deep-discovery.js and ./deep/deep-hints.js; src/progression.js -> ./deep/deep-discovery.js; src/screen-garage.js -> ./deep/deep-hints.js; tools/test-deep-save.mjs -> ../src/deep/deep-discovery.js and ../src/deep/deep-hints.js. Audio owns this single shared test edit; Save may copy its exact frozen reviewed blob, never edit it concurrently. The older assertion expected zero external imports for a standalone prototype and is superseded by these explicit feature contracts, not by a blanket file or directory exemption. Record frozen aeb3415f failed82/1/60 of143 in539.882s honestly. All runtime/assets stay as reviewed. Combine this correction before one fresh nearby lane/build; no new machinery or native look render.

Final guard delta review is clear on d6a76d3a3c1ac44aa7c06b0b139fcef1bfd25b9b, blob d30bc9080776d2ddc811dcadedcda0c1531a8b3a. The independent set matches exactly the eight granted importer/specifier pairs and strips only those matching import statements before the original forbidden-reference scan. Every other path/specifier, both dev-switch checks and all5287 look/geometry/numeric checks remain. No runtime or audition asset changed from the reviewed aeb source. Save may copy this exact blob now; current final lane/build evidence remains pending.

Dev source d6a76d3a integrated conflict-free: exact canonical143/143,zero failures/unrun,1225.485s,jobs4;build1658.002ms wall;ordinary source/guard review clear. The eight current assets total532629B; original SHA-256 expectations remain exact. Card stays open for Claude listening and eventual real mix; the existing round-one packet and new lane are retained until consumed. DEEP-ZONE owns actual journey wiring. No clean-merge rerun, native/frame/balance/full/release/push claim.

## Consumed round-one verdict and lane cleanup — 12 October evening

Claude approves round one with one required revision: pearl becomes a rising shimmer of about2s ending above the unchanged log pitch. Bubbles/cave use OGG if the unchanged seam analyzer passes; retain FLAC only on actual OGG failure and record the byte saving. Real mix belongs to DEEP-ZONE. The merged d6a76d3a lane and consumed review evidence are recycled before another lane opens. Card remains unfinished and ready for that bounded revision; reacquire sound-bank before cue edits. Keep current runtime audio and licensed recipe inputs. Earlier143/143/build/review evidence remains the source handoff, not a pass for the future revision.

## Director bounded listening revision before code

Reacquire sound-bank only for Claude's pearl shimmer and two ambience codec decisions. Own existing tools/audio/build-deep.mjs, the three affected runtime files/recipes, their exact Deep catalogue/credit entries, the existing sound-bank filename rows, and tools/test-deep-audio.mjs exact affected asset/recipe pins. Pearl lasts about2s, rises and ends above the unchanged log pitch. Try the existing Vorbis encoding for bubbles/cave and keep it only if the unchanged loop seam and loudness/peak checks pass; FLAC remains only on actual OGG seam failure, with honest evidence. Remove each replaced FLAC in the same change. Preserve the other five audio assets byte-exact, every legacy bank/catalog hash projection, all numeric limits, cold-entry adapter/filter/loading/lifecycle and master mix. No new input, downloads, framework, App/game or save edits. One revised listening packet goes to Claude on this card; source gate/build/ordinary code review are distinct from listening acceptance and real DEEP-ZONE mix. Root's old merged audio lane is already cleared. The other controller retains cleanup of its own merged Ambush lane; do not touch it.

Frozen revision lock handoff: only the two bank filenames change; all source is frozen at c1408cbd while the gate/review/listening run. Release sound-bank for the next answered card. Any real correction to bank rows reacquires it; this handoff does not grant a merge without green lane/build/review.

Revised dev source c1408cbd integrated:55/55 original nearby, zero failures/unrun,165.1771s/jobs4; build996.1124ms/exit0; ordinary review clear. Conflict-free, no repeated check. Round-two packet and waiting_on remain for your verdict; real DEEP-ZONE mix is still deferred. The fresh source lane is cleared after the verdict facts are committed. Sound-bank remains released.

## Claude answers (13 October)

**Claude verdict, Deep sound round 2 (13 October 2026, 08:40): accepted.**
- The pearl is now 2.0 s and rises from about 1.7 kHz to 5.1 kHz, ending above the log chime as asked.
- Bubbles and cave pass as OGG, saving about 248 KB. The FLAC files are removed.

Listening is complete. What remains is the real in-game mix, now that DEEP-ZONE has merged: one in-game listen on the Kelp Coast in the full check or the Kelp Coast finishing pass. waiting_on is cleared.

## Native mix dependency — 13 October evening

The eight cues and round-two listening are accepted. The remaining real Kelp Coast mix is blocked on DEEP-TRAIL, which waits for Kyle's storyboard. Production main creates App without Deep providers; App defaults to an empty list, and installDeepCourse returns before installing a journey when no provider is supplied. The test-only kelp provider is not authored playable content. Real place, log and pearl events therefore cannot be exercised in a Kelp Coast journey yet. Keep the native mix check open; do not add placeholder content or claim the isolated listening reel proves it. Existing source, assets, gains and mastering remain unchanged.

## Claude, 24 October 2026: four more cues for the story

DEEP-TRAIL now brings the real Kelp Coast, so the in-game mix can happen. Add
the four cues of THE_DEEP 10.1 in this card (take `sound-bank` again for
them): `deep.sonar` (a clean, short ping, about 1.5 kHz, 0.3 s, a slight
ring), `deep.echo` (a quieter, duller tick of the same pitch, played after the
real echo time in the `deepSonar` payload), `deep.liftbag` (air rushing into
a bag for 3 s, then bubbles rising away) and `deep.raised` (a low, slow swell
of about 4 s as the car breaks free of the sand). Built from recipes like the
first eight; one listening packet to Claude, at most three rounds.

## Done (Claude, 25 October 2026)

Kyle waived listening passes ("voice isn't something we're really working
much on, so we'll just release"). The eight cues merged in b635b88b with
measured loudness and peaks inside the card's limits; the card is done.
