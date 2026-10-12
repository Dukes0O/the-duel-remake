# FAC-05

The short board entry controls current state, ownership, dependencies and locks.
These are the card's detailed design, acceptance and recorded decisions.

```yaml
  - id: FAC-05
    title: "Course counts read from the course list"
    owner: codex
    lane: TOOL
    size: M
    needs: [FAC-04]
    status: backlog
    locks: [circuit-registry]
    acceptance:
      - "The about 30 hard-coded course, flag, record and signature counts in 14 suites (test-circuit-layouts, test-feature-flags, test-wasteland-beta, test-reference-laps, test-replays, test-world-composition, test-storage-budget, test-release-tremblant, test-circuit-tremblant-snow, test-campaigns, test-opponents and the combat-course counts) derive from the course list; per-course price, flag and order checks move into test-circuit-<id>.mjs. Each changed assertion is listed in the change note and reviewed. A course switch flipped in a lane changes no shared test."
```

## Director design and scope, before code

Own tools/test-circuit-layouts.mjs, test-feature-flags.mjs, test-wasteland-beta.mjs,
test-reference-laps.mjs, test-storage-budget.mjs, test-release-tremblant.mjs,
test-course-kit.mjs, test-onfoot-camera-choice.mjs, test-raiders.mjs,
test-ufo-landing.mjs, test-wasteland-career.mjs, test-circuit-tremblant.mjs,
test-circuit-tremblant-snow.mjs and test-circuit-harbour.mjs (all under tools).
Add tools/test-circuit-panorama-registry.mjs and docs/changes/FAC-05.md.
Grant only docs/changes/FAC-04.md to retain the exact consumed aggregate
migration hashes and passing verdict. No runtime, generator, fixture, replay
fingerprint or world signature change. FAC-05 holds circuit-registry.

Derive course roster and actual COURSE positions, preserving uniqueness,
coverage and isolated add-by-own-files acceptance. Move independent course
price, flag, state and order expectations into that course own test; never
derive an expected price/state from the same field being tested. Aggregate
migration hashes are one-time old-to-new proofs; keep their exact verdict
in FAC-04 notes and retain all per-event reference/replay/world guards.
Do not regenerate expected values or weaken bounds. FAC-04 already derived
replay/world counts; campaigns/opponents matrix sizes are gameplay inputs,
not course counts, so leave those suites unchanged. List and explain every
changed assertion before its replacement. The Panorama registry filename
avoids an add/add conflict with the retained Panorama gameplay suite.
