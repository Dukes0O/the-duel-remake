# LAB-CLASSROOM-LANGUAGE

Claude (Director and Release Manager), 4 November 2026. Kyle took the Launch and Projectile lessons and
rejected the wording, the mixed units and the missing formulas: "the next cut requires a full review and
fix of the language in all lessons." Rules and order: `docs/board/cards/LAB-CLASSROOM-LANGUAGE.md`. This
note covers the first batch; each later batch adds a section.

## What changed: the shared classroom

- **The running page.** Brian's side of the screen is one page that grows like a textbook. Each step adds its
  heading, its explanation and its latest result below the last, and nothing is replaced. The newest words sit
  last on the light paper and scroll into view; the player can scroll back at any time. Hints and "watch this"
  lines stay under the newest words only. The panel is wider (410 px), and Brian's picture is smaller and
  sits in a row with his name.
- **The physics panel.** A lesson may send `formulas` with its view. The panel sits between the board and the
  page, opens by default when the window is at least 1,500 px wide, and hides and shows with F or its button.
  `worked` carries the numbers now on the board, so a press of a control changes the sum at once. A lesson with
  no formulas shows no panel. The board loses no size on Kyle's screen, because the panel takes the empty margin
  he marked.
- **The bucket.** A water challenge started from the Lab (Projectile, Fire) now fits the bucket itself
  (`heli-session.js` `startChallenge`), which is the option Kyle preferred. A rescue line or a hooked car still
  refuses with its own reason.

## What changed: Projectile motion

- Every sentence is rewritten as a teacher would say it. Objects are named, and "she" and "her" are gone from the
  code and the screen. "Let go" becomes "release", so the post is the release post.
- New step "Metres per second": speed, m/s and km/h with the reason for 3.6, with a speed dial and a mark along the
  top of the picture for each second. "Gravity and acceleration" now explains 9.8 m/s² and how m/s and m/s² differ.
- The picture shows the two motions at once, as Kyle sketched: a scale along the top with a tick for each second
  and the metres between ticks, a line down from each tick to where the stone was at that second with how far it had
  fallen, and two arrows on the stone with their speeds. The forward arrow stays the same length; the downward arrow
  grows. With water and a stone together the water's forward arrow visibly shrinks.
- New step "Test your own settings": the player changes speed and height, the sums change, the arcs stay to compare,
  and three tests open Continue.
- Why water lands short is now explained (small droplets, the friction of the air, more than half the forward speed
  lost in the first second, a top falling speed of 9 m/s), and the panel shows how the sum changes: 0.12 × speed², a
  top speed of √(g ÷ 0.12), and distance < forward speed × time. The 0.12 is the game's own (`GRAVITY / 9²`).
- Question 3 was "What hits the buoy?", whose literal answer is water. It now asks when to start pouring, and its
  three answers all answer that.

## What changed: Launch angles

- Metric only, with km/h on the dial (the game's own screens show km/h): 72 km/h for the old 45 mph, 65 and 79 for 40
  and 49. "Speed" defines km/h and m/s and how to convert between them.
- The formulas follow the ramp and the dial on every press: the split into forward and upward speed, the time in the
  air, the distance leaving out the air, and the air's slowing. Arrows at the end of the ramp show the split.
- The two word steps stay open after their answer, so the player can go on tilting and turning.
- New step "Test your own settings": any angle and speed, three launches to open Continue, the table keeps the results,
  and Brian says how much the air shortened each jump.
- Why 45 degrees goes furthest is explained: the distance is forward speed multiplied by time in the air.

## Brian's voice

Five lines are rewritten and re-recorded with the same voice and settings, and their levels fitted:
`lab.brian.projectile.explain`, `.pass`, `lab.brian.launch.intro`, `.explain`, `.pass`. About 1,750 credits in all
(two takes of each, the first with the wrong stability setting and thrown away). The table in `docs/LAB.md` section
8.1 follows them.

## Removed

- The bubble that replaced itself, the tall Brian portrait layout, and the "asking" layout's shrink of the portrait.
- All of the old wording in these two lessons, the "right under her" label, the `mph` helper and the `MPH` constant.
- The "Fly very high" answer and its picture in Projectile question 3.
- The first takes of the five voice lines (one version of every binary).

## Changed assertions (Claude's review, rule 18)

- `tools/test-lab-classroom-projectile.mjs` and `tools/test-lab-classroom-launch.mjs`: every assertion on wording moves
  to the new sentence and keeps its numbers, except that 45, 40 and 49 mph become 72, 65 and 79 km/h, 5 m and 15 m become
  4.9 m and 14.7 m (the stone's fall to one decimal), and the Launch dial's reading moves with its unit. No check is
  removed and no number is loosened. The landing distances are unchanged. Added: the dial and free-test checks, and the
  arrows and second marks.
- `tools/test-lab-classroom-launch.mjs`: the two word steps no longer lock after the answer, by design; the old
  checks did not depend on the lock.
- `tools/scenarios/lab-classroom-projectile.mjs` and `lab-classroom-launch.mjs`: wording moves as above, and they now run at
  1920 by 1000 so the panel is on. Both add checks that the sums follow the controls; Projectile adds that earlier words stay on the
  page, that F hides and shows the panel, and that the bucket is fitted.
- `tools/test-lab-radio.mjs` reads the script table in `docs/LAB.md`, which moves with the five lines. Its own checks are
  unchanged.
- `tools/test-lab-challenges.mjs`: added a test that the water challenges start with the bucket on the hook and others do
  not. The flown tests keep their `fitBucket()` calls, which now answer "already fitted".

## Checks

Filled in below by the batch that runs them: `tools/test-lab-classroom-page.mjs`; each lesson's suite; every
`tools/test-lab-*.mjs`; lane tier and build; all Lab browser scenarios; one independent review.
