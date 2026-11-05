# LAB-CLASSROOM-SUSPENSION

## What changed

Reworded Suspension for a young player and parent. Brian describes body shake
as one reading for the test; the lesson defines m/s² as how quickly the body’s
speed changes. The shake formula panel is gone. The roll
panel compares the test’s 6.5° soft-spring and 2.2° stiff-spring readings:
6.5 ÷ 2.2 is about 3, so the stiff spring leans about a third as much.

Brian now explains why a turning car leans outward, what tyre contact measures,
and which spring suits rough or smooth roads. He also explains that a stiff
spring can pass bumps into the body, shake the driver and briefly lift a tyre.
The board labels use “this bend” and “body roll.” The lesson and board code
split long lines into readable statements.

The suspension bench readings, four-pair challenge, reward, save, and lesson
flow are unchanged.

## Checks

- `node --test tools/test-lab-classroom.mjs`: **41 passed, 0 failed**.
- `node --test tools/test-lab-classroom-page.mjs`: **6 passed, 0 failed**.
- `npm.cmd run build`: **passed**. Vite reported existing large-chunk and
  dynamic-import warnings.
- `node tools/run-tests.mjs --tier lane --changed --jobs 4`: **42 passed, 1
  failed, 2 not run**. `tools/test-review-evidence.mjs` failed because the job
  could not start `ffmpeg` (`spawnSync ffmpeg EPERM`); fail-fast left two suites
  unrun. This is outside the Suspension files.
- Browser scenario: not run here; Claude will play it in Chrome.
- Race fingerprints: none recorded or changed. Suspension race rules were
  untouched.

## Assertion changes

The scenario now checks Brian’s body-shake explanation and confirms there is
no shake formula panel. Its roll check looks for the new 6.5° ÷ 2.2° ≈ 3 sum
on the roll step. The lesson tests make the same wording change and retain the
assertions that the four challenge settings pass the unchanged bench goal,
the readings match the bench, questions hide results until answered, and three
distinct free runs are required. These changes check the revised lesson copy;
they do not weaken a behavior check.

## Removed

- Removed the shake formula and the old roll calculation full of constants
  from the player-facing lesson.
- No source files removed; legacy lesson removal remains LAB-CLASSROOM-LIVE.
