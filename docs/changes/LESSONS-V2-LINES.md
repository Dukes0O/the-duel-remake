# LESSONS-V2-LINES

Brian's v2 driving lesson lines. Steps and advice use shared ids across all
four lessons; intros and pass lines are lesson-specific. The late Watch me
clip has its own line. All subtitles use the same runtime text as the takes.
The numeric corner table and detailed explanation stay on screen.

## Lines

| Id | Words |
| --- | --- |
| `drive.radio.v2.corner.intro` | Welcome to the track. Brake while the car is straight, then release the brake as you turn. |
| `drive.radio.v2.line.intro` | Today we use the whole road. Start wide, touch the inside of each bend, then let the car run wide as you leave. |
| `drive.radio.v2.gears.intro` | Today you change gear yourself. Change up at the lights and change down while you brake. |
| `drive.radio.v2.snow.intro` | Snow gives your tyres less grip. Brake early and steer gently, and do your slowing before the ice. |
| `drive.radio.v2.shared.watch` | Watch my line and where I brake. This run is just to show you how. |
| `drive.radio.v2.corner.watch-late` | Watch what happens when I brake late. The tyres slide and the car runs wide. |
| `drive.radio.v2.shared.follow` | Follow my car and use the guides. This is practice, so nothing is scored. |
| `drive.radio.v2.shared.your-turn` | Your turn, with the guides on. Keep it clean, and hit every brake zone or beat my time. |
| `drive.radio.v2.shared.beat` | Now beat me with a clean run. The painted line is gone, but the brake zones and targets stay. |
| `drive.radio.v2.shared.late` | You braked late and left too little room to slow. Brake in the zone while the car is straight. |
| `drive.radio.v2.shared.early` | You braked early. Wait for the brake zone so you keep your speed along the straight. |
| `drive.radio.v2.shared.fast` | You carried too much speed into the corner. Slow while straight so the tyres have grip left to turn. |
| `drive.radio.v2.shared.slid` | I heard the tyres slide. Sliding tyres grip less, so slow before turning and keep it smooth. |
| `drive.radio.v2.shared.off` | You ran out of road. Slow before turning and keep the car on the road. |
| `drive.radio.v2.shared.slow` | You slowed too much in the corner. Use the target on screen to keep the car moving smoothly. |
| `drive.radio.v2.shared.lift` | This bend needs a lift of the accelerator. Leave the brakes alone and let the car settle. |
| `drive.radio.v2.shared.pace` | That run still needs to be quicker. Keep it clean and use the whole road. |
| `drive.radio.v2.shared.clean` | Clean on every corner. Same again, a little quicker. |
| `drive.radio.v2.corner.pass` | Well driven. You kept it clean and beat me, and you have earned your braking reward. |
| `drive.radio.v2.line.pass` | Well driven. You used the road and beat me, and you have earned your handling reward. |
| `drive.radio.v2.gears.pass` | Well driven. You kept the engine pulling and beat me, and you have earned your engine reward. |
| `drive.radio.v2.snow.pass` | Smooth and clean on snow, and quicker than me. Well driven, you have earned your tyre reward. |

## Credits

Preflight: 22 lines, 1883 characters (spaces and punctuation
included). ElevenLabs reported 16,414 credits left, 16,199 used of 32,613.
All lines fit; no purchase or account change is needed. Same Brian voice,
multilingual v2 model, stability 0.4, similarity 0.8, style 0.35, speaker
boost on, and the existing shared radio filter.

Final script usage: **1,883 characters**, 22 generated takes, no duplicates.
Final subscription lookup: **16,952 used of 32,613; 15,661 left**. The
subscription counter lagged generation (its observed delta is 753, so it
is not an exact bill). Per-take catalog accounting totals 1,900 credits,
mostly marked estimated; use the character count as the planned usage.
Runtime takes total **1,769,321 bytes**, down from **3,298,029 bytes**
for the 47 v1 recordings (1,528,708 fewer runtime bytes).

## Checks

- Targeted lesson rules: 6/6 passed; view: 3/3 passed; native App/run:
  20/20 passed, including intro, steps, late-demo skip, pass and retake text.
- Independent code review found two faults, now fixed: a faster Your turn
  with missed checks must still give accurate advice; a stopped recording's
  delayed callback must not release the next recording's radio chain.
  Reviewer confirmed both fixes, including a mocked audio preemption check.
- Targeted tests caught the late-demo flag surviving into Follow me; radio
  selection now also checks the current step. The native regression passes.
- `test-drive-lesson-lines`: **314 checks passed**, including the 22-line
  script, every radio choice, catalog/file set equality, voice/settings and
  source/runtime hashes. All 22 runtime MP3s also decode to PCM successfully.
  Unrelated catalog entries are unchanged.
- `npm run build`: **PASS**, Vite 2.20 s. Existing large-chunk and mixed
  static/dynamic import warnings only. Temporary-write access was needed for
  Vite's config in the linked dependency folder; output stayed in this lane.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: initially four
  suites passed, then `test-audio` failed because FFmpeg was absent from PATH;
  92 suites were not run. Set `FFMPEG_PATH` to the laptop's installed
  `imageio_ffmpeg` executable and put System32 first on PATH. Resume only the
  failed/unrun 93 suites using the lane runner's existing exact-path filters;
  prior passed suites are excluded from the continuation. The audio suite
  also passed alone with the configured decoder. That continuation passed
  17 suites, then compression stopped because the new kept MP3s were not yet
  in Git's index; 75 suites were unrun. Stage the reviewed files, rerun only
  compression plus those 75 suites (76 total), with JSON output retained
  temporarily so no failure detail is lost. **PASS: 76/76** in 337.50 s,
  jobs 4, zero failed or unrun suites. Combined lane coverage: **97/97**
  (4 + 17 + 76). No game code or assertion change was needed for either
  setup failure.
- Required `test-lesson-instructor-any-car.mjs`: **196/196 passed** in the
  lane gate, every car/setting/lesson row, each run clean and repeatable.
- Replay guard: **225 checks**, 25 cases, 23 events, nine categories, three
  FPS values and three repeats; fingerprints unchanged. World composition:
  **47 exact-scene checks** across twenty events, unchanged.
- `node tools/build-status.mjs`: lane status refreshed. Live folder and port
  5174 were not used. No full-tier or listening claim is made.

## Changed assertions

- `test-drive-lesson-lines`: replace historical v1 section 6/12.7 word and
  count expectations (15 initial lines, 47 total lines, 51 cues) with the card's v2 script (22 lines,
  26 cues), as required by section 14.11. Exact script/map equality remains;
  new checks prove selectable ids, exact intro text, every required miss,
  and exact catalog/kept/runtime file sets with no leftovers. Brian, model,
  settings, hashes, cone licensing/peak, switch, voice bus, ducking, startup
  loading, 6,000-credit ceiling and 4 MB ceiling remain unchanged.
- `test-drive-lesson-run`: the save-retry fixture and its exact expected
  pass id change from `drive.radio.corner.pass` to
  `drive.radio.v2.corner.pass`. Save ownership and once-only reward checks
  stay intact. Add native subtitle assertions through briefing, four steps,
  pass and retake; the initial Watch me assertion names the late clip.

## Recording recovery

ElevenLabs returned HTTP 429 on the accounting lookup after the seventh take.
That take was already saved. Recording stopped, then resumed only missing
lines with ten seconds between takes; no line was generated twice. Counters
can lag; per-take estimates are marked in the catalog.

## Review and handoff

Independent review: code and final asset cleanup pass. The reviewer confirmed
both fixes and the unchanged non-driving catalog. Claude's written review of
the listed assertion replacements remains for integration; no assertion or
limit is loosened. This lane does not merge, push, release, or update Cockpit
outside its folder.

## Removed

Removed all 47 v1 driving voice catalog records and recycled their 94
kept/runtime MP3 files from this lane. Removed the retake-only, short-try,
three-in-a-row and snow winter-run voice paths. Every remaining driving
recording is reachable and loaded by its runtime map. Cone and shift-light
sounds stay. Build output is recycled after verification; no scratch output
is committed.
