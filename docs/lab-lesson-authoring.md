# Writing a Lab 2 lesson

Add `src/lab/lessons/<id>-lesson.js`. Export `definition` and `hooks`.
The screen loads these packets automatically. The lesson id must be an
existing board lesson id, so E uses the existing unlock rule and machine.
Keep drawing code in that lesson's animation module. The small working
example is `tools/fixtures/lab-lesson-example.js`; it is test content only.

## Data

- `id`, `vocabulary`: all technical words the lesson needs.
- `wonder`: `{text, animation, seconds, voice?}`. No new technical words yet.
- `words`: ordered `{id, word, meaning, animation, voice?}` rows. Stable ids
  go into the notebook. Meanings have one sentence; other prose has at most two.
- `worked`: `{name, text, animation, seconds, voice?}` steps. Each step waits
  for the player; pause, step and replay share one slow-motion clock.
- `tries`: exactly three `{support, prompt, success, seconds, animation,
  controls, prediction}` rows. Supports are `guided`, `prompted`, `alone`.
- `controls`: `{id, label, value, setting?}`. These are machine actions,
  such as loading a crate or turning a handle. A drawing object with
  `control: id` can be clicked; a labelled button provides keyboard access.
  `setting` binds that input to an existing bench control for challenge proof.
- A lever adds `min`, `max`, `initial`, `step`, `drag: true` and
  `keyboard: 'vertical'`; `rate` is the change per second while Up/Down is
  held. Dragging changes the value continuously. The labelled button moves
  it by one `step`. A load control can use the same numeric range with
  `cycle: true` to return to its minimum after its maximum.
- Each `prediction`, and each of two or three `checks`, has `{text, correct,
  answers}`. An answer is `{id, label, picture, animation}`. Use two or three
  pictures. The right check answer is replayed even after a wrong choice.
- `challenge`: `{text, try?}`. `text` is a one-sentence key idea. Inline
  challenge prompts, questions and successes also use one sentence. Help
  temporarily replaces the key card so the two-sentence limit still holds.
  Bench challenges run
  `try` (same shape as an alone try), or reuse the third try as a fresh run.
  The real bench's existing goal must pass before any progress is awarded.
  Flying, G-force, rust protection and snow use their existing game challenge.
  An optional one-sentence `title` replaces the external challenge card's
  "Key idea" heading, as Lift does; its text remains one sentence.
- `hints`: failure kind to `{what, plainer, worked}`. `what` explains the
  result and change; `plainer` appears after two failures. After three,
  Show me plays the worked steps and returns to the same unfinished try.

`validateLesson` rejects missing hooks, bad picture counts, long prose,
missing vocabulary and any defined word used before its words step. It checks
wonder, word meanings, worked steps, prompts, pictures, controls and hints.
Authors still review plain language and any jargon missing from `vocabulary`.
Only recorded existing `voice` cue ids play; new prose is shown as text.

## Animation hooks

`hooks.animations[name]({time, input, support, stage, index})` returns a
drawing. `time` is lesson time in seconds, running at half normal speed.
Do not use wall time, randomness, saved profiles or race state.

- `objects`: `{id, shape: 'box'|'sphere', position, size, rotation?, colour?,
  control?}`. Positions, sizes and rotations are local to the machine.
- `forces`: `{kind, newtons, origin, direction}` and `metresPerNewton`.
  Every arrow uses that same scale and carries its number in N (newtons).
  Push/lift are green, weight red, drag orange and grip blue.
  Optional `labelPosition` moves a number away from the model or another label.
- `streams`: `{medium: 'air'|'water', origin, direction, speed, length}`.
  Streak length follows speed.
  Optional `radius` sets the stream's width.
- `graph`: `{xLabel, yLabel, maxX, maxY, points: [[seconds, value], ...]}`.
  Label axes in words and units. Points reveal as the clock reaches them.
  Optional `position` and `size` place the graph beside the model; omit the
  graph from steps that do not use it.

For lesson-specific models, optional `hooks.mount({group, THREE, models})`
returns `{draw(drawing, clock), dispose()}`. The room owns shared teaching
objects; mount owns its extra resources and releases them in dispose.
Keep the real machine visible beside its teaching model.
The mount also receives `doc` and `canvas` for model labels. `clock.previous`
contains the preceding run's `input`, `time`, `index` and `animation`, so a
custom model can draw the right previous load as a ghost.

`hooks.pictures[name](context, width, height)` draws each answer picture.
`hooks.evaluate({tryIndex, input, prediction})` returns `{passed, actual,
failure}`. `actual` names an answer id; `failure` names a hint kind. This
teaching verdict cannot grant saved progress. Bench challenge inputs are also
run through the existing bench rules; flight and race challenges keep their
existing passing rules.
An optional returned `hint: {what, plainer}` supplies the actual kilograms
for that failure; keep both lines within the same two-sentence budget.
The definition's matching hint still supplies the worked example.

Lift is the complete pattern in `lessons/lift-lesson.js` and
`lessons/lift-animation.js`. Its pure numbers live in `benches/lift-pad.js`:
bench modules are the existing approved boundary for reading flight rules.

The frame draws a transparent ghost from the preceding completed run's
inputs, including successful runs. It saves only word ids, through
`learnLabWord` and `app.labCommit`. Old saves read as an empty notebook without
rewriting their stored shape (`labNotebookOf` supplies that read default);
future Lab versions are never overwritten.
