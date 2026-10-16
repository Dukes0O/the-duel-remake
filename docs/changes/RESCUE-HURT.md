# RESCUE-HURT: people can get hurt

Card: RESCUE-HURT (Claude, SIM, no lock). Design: `docs/HELI_RESCUE.md`
section 4.1 (Kyle, 15 October 2026) and section 8. Switch: `rescue`.

## What changed

- **`src/heli/heli-rescue.js`** (pure, no credits):
  - `CONDITIONS` unhurt, hurt, badly hurt; never killed. `worsen(condition,
    steps)` never goes past badly hurt. The casualty's condition rides on the
    line (`line.condition`, starting unhurt) and replaces the bump count.
  - **Bumps** (`rescueHit`): a hit over 4 m/s with the casualty on the line is
    one step worse, over 8 m/s two. The rescuer alone is a professional and
    is never hurt, so a bump before the casualty is clipped on changes
    nothing. After the handover nothing changes.
  - **Rough set-down** (`stepRescue`, event `roughSetDown`): the pair touching
    down after being lifted at more than 1 m/s and up to 4 m/s is one step
    worse; above 4 m/s the cable's own hit is the bump, so it is not counted
    twice. The handover still needs a set-down at 1 m/s or less, as in
    RESCUE-LINE, so a rough set-down hurts them and the player sets them down
    again gently.
  - **The clock** (`waitHurt`): still unhurt when two thirds of the time are
    gone, they get cold and hurt, once (Roger's `rescue.cold`).
  - **The hiker in the cabin** (`cabinHurt`): an H1 hard landing is one step;
    a crash makes them badly hurt.
  - **Pay** (`rescuePay(basePay, condition)`): unhurt 100%, hurt 60%, badly
    hurt 25%, rounded to a whole credit, never below 0; an unknown condition
    pays as badly hurt. This replaces the flat 300 credits a bump.
  - **Handover** (`handoverOutcome`): walk and `rescue.done`, limp and
    `rescue.hurt`, stretcher and `rescue.badly` (the stretcher threshold for
    H3's medevac skin is badly hurt). `FAILED_CONDITION` is badly hurt for
    RESCUE-ENGINE's failure rule (section 4.2).
- **Radio** (`src/heli/heli-radio-lines.js`): new words for `rescue.bump` and
  `rescue.late`; new `rescue.hurt`, `rescue.badly`, `rescue.cold` and
  `supply.late`, all Roger. Recorded once each through
  `tools/audio/elevenlabs.mjs` with the rescue lines' settings (stability 0.4,
  similarity 0.8, style 0.35), kept in `audio-src/voices/` (the two old takes
  replaced in place: one version of every binary), copied to
  `public/assets/audio/voices/`, catalogued. **Credits:** the account counter
  went from 6,328 to 6,508 used (180); the catalog's per-character estimates
  add to 353. 3,492 of the month's 10,000 left.
- **Loudness** (integrated LUFS, measured): the six takes sit at -24.4 to
  -26.5, inside the existing rescue lines' -24.3 to -26.4.
- **Catalog:** the voice tool sorts the whole catalog when it saves, which
  moved older rows that `tools/test-p4-audio.mjs` pins in place. The catalog
  was rebuilt from the committed one: the two re-recorded rows replaced where
  they stood, the four new rows beside the other rescue lines.
- **Packet:** section 4.1's list of lines moved into section 8's table (28
  lines), and the credits page counts 74 radio lines.

## Tests

- `tools/test-heli-rescue.mjs`: 242 checks pass. New: the steps, never past
  badly hurt; the clock at two thirds, once; the cabin hard landing and crash;
  the handover look and line; pay at 100, 60 and 25% with rounding, unknown
  condition and never below 0; bumps by speed (4 is none, 4.5 and 8 one step,
  12 two), the rescuer alone never hurt, nothing after the handover, a real
  cable hit; rough set-downs at 0.9, 2, 3.5 and 4.5 m/s, and the rescuer alone
  set down hard.
- `tools/test-heli-audio.mjs`, `test-p4-audio.mjs`, `test-audio-sourcing.mjs`,
  `test-heli-hooks.mjs`: pass.
- Lane tier and build: see below.
- Review: see below.

## Changed assertions

- `tools/test-heli-rescue.mjs`: the flat 300-credit bump cut, the bump count
  and pay by bumps are replaced by the condition steps and pay by condition
  (the packet's new rule); every other check is unchanged.
- `tools/test-heli-audio.mjs`: 70 lines to 74, 24 rescue lines to 28.

## Removed

`RESCUE.bumpCut`, `line.bumps` and pay by bumps, replaced by the condition in
the same change. The old takes of `rescue.bump` and `rescue.late` are
overwritten.
