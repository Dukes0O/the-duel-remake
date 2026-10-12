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

**Round one question (Codex, 12 October 2026):** please judge the eight isolated cues for quiet underwater wonder and distinct landing/log/pearl feedback. Listening page: `C:/Users/kyleb/.codex/worktrees/wasteland-integration/deep-audio/.evidence/2026-10-12/DEEP-AUDIO/round-1.html`; reel `round-1.mp3` and labelled `listening-index.json` in that same folder. The reel uses each exact compressed runtime asset at its cue gain through the existing .42 master. This is an offline audition, not a native capture or masking score. Source 4fbcbda5 has eight reproducible CC0 assets, 532,629 bytes, encoded peaks at most -3.09 dBTP; bubbles -20.10 LUFS, cave -21.49. Both decoded lossless loop seams pass. Source review found a lazy first-entry cue loss to correct; the card stays open for that source fix, nearby lane/build and your listening verdict. Round one of at most three. The Deep remains dev; no release.

## Ordinary source review correction

The first actual deepEntered event may arrive before ramp preload completes. Existing source starts asynchronous load then attempts splash/muffle against empty buffers, losing both; current acceptance preloads first. Correct this within the owned adapter/test only. Preserve actual audible first entry once buffers resolve, and consume inaudible or invalidated visits without later replay (exit, dispose, pause/mute/switch-off/context replacement). Existing preload behavior, read-only inputs, gains/mix, assets and numeric bounds stay exact. Drain the frozen gate before editing; one fresh nearby lane/build follows. No new framework or browser check.

Director snapshot-test grant: the failed frozen4fbcbda5 lane (35 passed, one failure,107 unrun/143;301.124s) correctly found additive Deep cues in the original pre-Arsenal bank/catalog pins. Grant only the two existing projections in tools/test-arsenal-core-audio.mjs to exclude the independent literal eight new Deep IDs (splash, engine-muffle, bubbles, sand-land, logged, pearl, whale, cave), just as its explicit P4 additions are excluded. Original expected bank cc6d14d4... and catalog104e9daf... hashes, every ordinary row/metadata assertion, exports and original tests stay exact. The owned Deep acceptance independently covers all eight new cues and recipes. Do not regenerate either expected hash, use a broad prefix exclusion or weaken a tolerance. Identify any sibling snapshot-test file separately before crossing its scope. Record the additive reason before source edit; combine this and the real first-entry correction before one fresh nearby gate/build.

Director grants the same exact eight-ID historical projection addition in tools/test-arsenal-wave1-audio.mjs and tools/test-p4-audio.mjs, the two sibling whole-bank/catalog pins the builder identified. Preserve all existing expected SHA-256 values, individual asset hashes, ordinary entries, other assertions and numeric bounds. No wave2/wave3/fight/weapon test edits are granted. The cold-entry correction now passes ten controlled delayed-decode cases on the existing fake host; ordinary final delta review and one fresh nearby lane/build remain required.

Ordinary review of frozen aeb3415f is clear: the real cold-entry fault is corrected with current-visit/context/audibility cancellation; the ten delayed cases preserve consumed event identities. Only three granted historical projections exclude the independent literal eight Deep IDs; all original SHA-256 expectations and numeric bounds remain exact. The exact eight cues/recipes/runtime hashes, ordinary loader/filter paths, mix and provenance are independently covered. No further source review or duplicate focused checks are needed without a new change.

Source handoff: after this corrected nearby lane and build pass, the completed adapter/recipes/assets may merge under the-deep dev for the dependent journey lane. Keep this card open for Claude round-one listening and eventual real mix exercise; no listening/native acceptance is invented. Sound-bank edits are frozen and finished, so release that lock while the listening question waits. Any later cue-definition adjustment reacquires the actual hook before source edits and gets its fresh nearby gate/build. The fixed entry control does not change the actual audition assets.

Director grants only the existing test-deep-look.mjs prototype-import assertion: allow these eight exact importer/specifier pairs for the authorized dev adapters, preserving rejection of every other importer/specifier, both dev-switch assertions, all look/geometry/numeric assertions and legacy tool exclusions. src/audio.js -> ./deep/deep-audio.js; tools/test-deep-audio.mjs -> ../src/deep/deep-audio.js; src/app.js -> ./deep/deep-discovery.js and ./deep/deep-hints.js; src/progression.js -> ./deep/deep-discovery.js; src/screen-garage.js -> ./deep/deep-hints.js; tools/test-deep-save.mjs -> ../src/deep/deep-discovery.js and ../src/deep/deep-hints.js. Audio owns this single shared test edit; Save may copy its exact frozen reviewed blob, never edit it concurrently. The older assertion expected zero external imports for a standalone prototype and is superseded by these explicit feature contracts, not by a blanket file or directory exemption. Record frozen aeb3415f failed82/1/60 of143 in539.882s honestly. All runtime/assets stay as reviewed. Combine this correction before one fresh nearby lane/build; no new machinery or native look render.

Final guard delta review is clear on d6a76d3a3c1ac44aa7c06b0b139fcef1bfd25b9b, blob d30bc9080776d2ddc811dcadedcda0c1531a8b3a. The independent set matches exactly the eight granted importer/specifier pairs and strips only those matching import statements before the original forbidden-reference scan. Every other path/specifier, both dev-switch checks and all5287 look/geometry/numeric checks remain. No runtime or audition asset changed from the reviewed aeb source. Save may copy this exact blob now; current final lane/build evidence remains pending.

Dev source d6a76d3a integrated conflict-free: exact canonical143/143,zero failures/unrun,1225.485s,jobs4;build1658.002ms wall;ordinary source/guard review clear. The eight current assets total532629B; original SHA-256 expectations remain exact. Card stays open for Claude listening and eventual real mix; the existing round-one packet and new lane are retained until consumed. DEEP-ZONE owns actual journey wiring. No clean-merge rerun, native/frame/balance/full/release/push claim.
