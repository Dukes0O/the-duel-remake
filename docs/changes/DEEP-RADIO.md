---
task: DEEP-RADIO
status: done
flag: the-deep
player_facing: no
---

# DEEP-RADIO: Ana's sixteen lines on the through-water phone

Claude (Sonnet 5.5 side session), 24 October 2026. Card
`docs/board/cards/DEEP-RADIO.md`; design `docs/THE_DEEP.md` 6.7. Behind
`the-deep` (dev): nothing changes for players. Nothing plays Ana yet: the
Journey, Log and Sirena cards trigger the lines by id.

## Voice

- **Bella** (`hpp4J3VqNfWAUOO0d1Us`, "Professional, Bright, Warm"), model
  `eleven_multilingual_v2`, stability .4, similarity .8, style .35, speaker
  boost: the helicopter lines' settings.
- **Matilda is taken**: she is Odessa on the crew (AUD-17). The other voices
  in the catalogue are Brian (helicopter radio and instructor), Sarah and
  Roger (the helicopter crew) and the crew set (Jessica, Alice, George, Lily,
  Bill, Liam, Harry). Bella is a warm woman's voice nobody uses. The test
  checks that no other row in the catalogue uses her voice id.
- Credits: 1,423 (one per character, 16 takes, no retakes). The account
  counter moved from 13,104 to 13,645 used, **18,968 left** of 32,613; it
  lags and counts other sessions' use, so both are estimates. One rate limit
  (HTTP 429) was waited out; no take was lost or paid for twice. About
  18,900 are left for LAB-RADIO and SKI-AUDIO.

## Changed

- `audio-src/voices/deep-ana-*.mp3` (16 kept takes), 16 rows in
  `tools/audio/catalog.json` (text, file, hash, voice, settings, credits),
  and the same files in `public/assets/audio/voices/`, copied unchanged by
  `node tools/audio/build-deep-phone.mjs` (new; 1.45 MB, 90 s of speech).
- `src/deep/deep-phone-lines.js` (new): the 16 `deep.ana.*` ids with the
  design's exact words (also the captions), the file and the fitted volume of
  each; `DEEP_PHONE_CUES`, the sound-bank records: voice bus, priority 90,
  limit 1, ducking like the helicopter radio lines, flagged `the-deep`.
- `src/deep/deep-phone.js` (new): `createDeepPhoneChain(context, destination)`:
  the shared radio chain (`createRadioChain`) with a warble in front and a
  bubble bed beside the voice. Filter: the radio's, low-pass 2,600 Hz instead
  of 3,000 and hiss .02 instead of .03.
  - **Warble:** a 6 ms delay swung by a 2 Hz sine by 0.24 ms
    (swing = depth / (2 pi f)), which wobbles the pitch by 0.3% at its
    steepest, at about 2 Hz.
  - **Bubble bed:** `bubbleBedSamples`, seeded little rising "bloops"
    (7 a second, 350 to 1,400 Hz, 12 to 32 ms), four seconds wrapped so the
    loop has no seam, peak exactly 1, played at level .07 beside the voice,
    so it is filtered and clipped with it. It fades in over .12 s on key on
    and out over .2 s on key off, with the radio's clicks and hiss. Repeatable
    from its seed, like the radio's hiss.
- `src/sound-bank.js`: one import and one spread, `...DEEP_PHONE_CUES`.
  Start-up loading already skips `the-deep` cues, so nobody downloads the
  lines at start-up; the Deep loads them when needed.
- `tools/audio/render-deep-phone.mjs` (new): a Node render of a take through
  the phone chain (warble delay, high-pass, low-pass, soft clip, gain 1.3,
  the bed), following the Web Audio graph node for node; prints length and
  loudness before and after.
- `tools/test-deep-phone.mjs` (new, 235 checks): the lines match the design;
  Bella is not used by anyone else; one catalogue record, hash and unchanged
  runtime copy per line with the helicopter's settings; credits and size;
  sixteen cues behind the switch on the voice bus; start-up loading leaves
  them out with the switch off or on; the warble numbers; the bed is
  repeatable, peaks at one and has no jump at the seam; a recording context
  shows the graph (oscillator drives the delay time, bed joins, key on and
  off start and fade it, dispose releases everything); and the render check
  below.
- `docs/THE_DEEP.md` 6.7: one sentence naming the pick and why not Matilda.

## Loudness (measured, not by ear)

FFmpeg loudnorm analysis (`tools/audio/measurements.mjs`). **Take** is the kept
file; **Volume** is the cue level in the sound bank; **Phone** is the take at
that volume through the Node render of the phone chain (before the game's
master compressor and ceiling, which are not modelled).

- Every kept take peaks at **-5.0 to -1.1 dBTP**, under the -1 limit.
- Bella's raw takes are louder than Brian's: -21.3 to -16.3 LUFS (mean -19.5),
  against -22 to -25 for the helicopter and instructor takes, and they vary
  by 5 LU from line to line. A single gain would leave some lines shouting,
  so each cue has its own `volume` (0.37 to 0.79), fitted so **every line leaves
  the phone chain at -14.7 LUFS (within 0.1)**. The helicopter's radio takes
  average -13.8 and the instructor's -15.1 through the same chain, so Ana
  sits between them. The test fails if a line drifts more than 0.5 LU from
  -14.7 or the average more than 1.5 LU from either.
- **The card asked for speech about -18 LUFS.** That figure does not describe
  the helicopter radio as it plays: its takes are at -22 to -25 before the
  chain and about -14 after it. I matched what the helicopter radio and the
  instructor actually leave the chain at (-14 to -15 LUFS), as for
  DRIVE-LESSONS-LINES-2, which the design lead accepted.
- The chain's output goes above full scale (+0.4 to +1.8 dBFS) before the
  master stage, as the helicopter radio does (+0.8); the master ceiling
  handles it. Kyle should listen to the lines through the game's mix.

| Id | Text | File | Length (s) | Take LUFS | Take peak (dBTP) | Volume | Phone LUFS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `deep.ana.hello` | Hello? You found the old ramp! I'm Ana, at the field station. If you're staying down, could you help me count what lives here? Drive up slow and close, and the log does the rest. | `deep-ana-hello.mp3` | 10.7 | -19.8 | -2.4 | 0.62 | -14.7 |
| `deep.ana.legend` | And keep your eyes open. In 1966 my grandmother's race car went over the side out here in a storm. Nobody has ever found it. | `deep-ana-legend.mp3` | 7.7 | -19.6 | -2.5 | 0.65 | -14.7 |
| `deep.ana.badge` | Is that a Falcone badge? It is! Hold on, I'm sending you a sonar. | `deep-ana-badge.mp3` | 4.3 | -16.7 | -1.1 | 0.37 | -14.8 |
| `deep.ana.sonar` | Press R to ping. Sound runs through water at fifteen hundred metres a second, and the sonar times the echo. The blip shows where something solid is. | `deep-ana-sonar.mp3` | 10.2 | -20.7 | -4.2 | 0.74 | -14.7 |
| `deep.ana.bag` | Stop right beside it and press F. One litre of air lifts about one kilo down there, so one bag will carry that. | `deep-ana-bag.mp3` | 6.9 | -19.7 | -1.9 | 0.57 | -14.8 |
| `deep.ana.part` | Got it. My boat's got it. That's a real piece of the Sirena. | `deep-ana-part.mp3` | 3.6 | -20.3 | -4.7 | 0.77 | -14.7 |
| `deep.ana.norseman` | You know, this isn't the only car on the sea floor. A Chrysler show car went down with a big liner in 1956, and it's still there today. | `deep-ana-norseman.mp3` | 8.5 | -21.1 | -3.4 | 0.79 | -14.7 |
| `deep.ana.deep` | Five pieces, all light ones. The heavy part must have gone straight down. Try the edge of the drop-off. | `deep-ana-deep.mp3` | 6.1 | -19.0 | -1.5 | 0.53 | -14.6 |
| `deep.ana.car` | That's her. That's the Sirena. She's heavy, so it'll take four bags. | `deep-ana-car.mp3` | 4.4 | -21.3 | -4.3 | 0.76 | -14.8 |
| `deep.ana.raised` | She's coming up! Look at that. Sixty years in the dark. | `deep-ana-raised.mp3` | 3.4 | -19.9 | -2.2 | 0.56 | -14.7 |
| `deep.ana.lab` | She'll need a lot of work. Salt gets into the metal. Take her to the Lab. | `deep-ana-lab.mp3` | 4.2 | -21.1 | -5.0 | 0.75 | -14.7 |
| `deep.ana.cup` | Grandma Rosa watched you race. She says thank you. The Sirena finally ran the Coast Cup. | `deep-ana-cup.mp3` | 5.9 | -19.0 | -2.8 | 0.6 | -14.7 |
| `deep.ana.log` | That's one for the survey. Thank you. | `deep-ana-log.mp3` | 2.3 | -18.6 | -3.4 | 0.61 | -14.7 |
| `deep.ana.page` | That's every animal on the Kelp Coast. That page is done. | `deep-ana-page.mp3` | 3.3 | -19.0 | -4.3 | 0.58 | -14.7 |
| `deep.ana.pearl` | A pearl! Abalone hardly ever make them. Keep it safe. | `deep-ana-pearl.mp3` | 3.6 | -16.3 | -1.3 | 0.37 | -14.7 |
| `deep.ana.otter` | See the otters? They eat the sea urchins. No otters, no kelp forest. | `deep-ana-otter.mp3` | 4.7 | -20.1 | -2.3 | 0.55 | -14.7 |

## Changed assertions (reviewed)

- `tools/test-deep-audio.mjs`: it counted every catalogue row starting
  `deep.` (expected 8 recipes). Ana's voice takes are `deep.ana.*` rows, so
  the filter now leaves them out. The eight-recipe checks are unchanged.

## Removed

Nothing.

## Not done

- Nothing triggers the lines yet (DEEP-LOG, DEEP-SIRENA-VIEW and SIRENA-CAR
  do). Nothing calls `createDeepPhoneChain` yet; the caller does what
  `src/app.js` `_sayDriveLesson` does: keyOn, play the cue into
  `chain.input`, keyOff on end.
- No audio was listened to. Kyle should listen to all 16 lines, and to the
  warble and bubble bed, before release. If the bed or warble is too much,
  change `DEEP_PHONE_BED.level` or `DEEP_PHONE_WARBLE.depth` in one place.

## Tests

(Filled in at the end of the card.)
