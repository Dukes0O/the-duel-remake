# LAB-LESSONS-TUNNEL

## Design settled before code

Five packets own their teaching and animations. The existing frame owns steps,
notebook words and challenges; the existing tunnel benches alone supply numbers
and decide whether a challenge passes. The Lab 2 switch selects the new lessons.
Each view stays close and low, with a real car or recognisable part filling the
centre. Steel, rubber and olive fuel cans match the room; blue grip, green push,
orange drag and red weight arrows carry the meaning. Sans-serif object signs
use the existing Lab type. No data strip or corner list is added.

Truth takes priority over section 12.6: Grip has no pressure setting; its
plateau ends at the angle returned by bestSlideDegrees, with casual/pro choices.
Suspension's soft spring reduces body shake and increases lean, but does not
improve contact in this rig. Fuel measures mass and launch time, with no lap
consumption or electric-car model. Do not invent a fuel-per-lap challenge.
Downforce's loss is a speed share, not a fixed six mph. Braking's distance is
independent of balance; balance separately predicts rear sliding.

Grip's available grip curve is flat through its limit, then falls; the game
does not model an initial rise. The graph shows that plateau honestly.
The lesson fan runs from 50 to 100 mph, covering the doubling comparison with
one constant arrow scale; the underlying bench retains its 50–150 mph range.
The original rolling road and fan are reused in a cutaway view; the shell is
hidden temporarily so the enlarged parts are visible.

Controls act on a tyre dial, wing/fan, brake lever, spring/road choice and can.
Existing lab.clunk and lab.tick cover actions and navigation; lab.fan covers
the tunnel. No new paid voice or sound is requested.

## Checks planned

- Pure prediction/check pictures against every offered setting of the existing
  benches, teaching progression and the real challenge history goals.
- Memory-only browser flow through all five lessons, wrong-answer help,
  machine controls, loaded challenges and Watch captures; no frame timing.
- Lane tier with jobs 4, then build, with System32 first on PATH.
- Independent code review and round-one sheet for Claude's look verdict.

## Changed assertions

The Blender generator registry adds the tunnel parts recipe, with the same
existing recipe-only placement checks and no exemptions. One new draft test
incorrectly assumed suspension contact differed by less than one percent; it
failed on the actual 87.87% soft / 93.115% stiff result. Replaced that invented
tolerance with the two physical comparisons the lesson teaches: soft has less
contact than stiff here, and less body shake. No pre-existing assertion or
tolerance changed. Claude's written assertion review is still needed at handoff.

## Code review

Independent review found and confirmed fixes for reversing a machine choice,
sparse-input challenge defaults, selected-speed stopping pictures, complete
two-second stops, wing/chord orientation, forward car poses, previous wing
rotation order, and the 150 mph close-view boundary. Regression checks cover
each rule or pose. The Grip sample uses finite audio-clock scheduling, respects
mute and pause and is released with its mounted model. Review approved the code;
browser look, generated assets and gates remain separate checks.

Shared hooks are one line each: choice exclusivity in the frame, fresh bench
defaults per challenge attempt, the optional lesson sound callback, graph reveal
by its own horizontal quantity, and the Blender generator registry. No save,
race rule, dependency or reward amount changed.

## Removed

The new packets replace each old bench panel in Lab 2 through the frame's
existing automatic packet discovery. The original benches remain the challenge
rules and the Lab 1 path; there is no second Lab 2 panel.
