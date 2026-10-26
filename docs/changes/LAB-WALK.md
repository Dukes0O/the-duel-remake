# LAB-WALK

Status: built and checked on codex/lab-walk, ready for Director review.
Switch: `lab-2`, dev. Not merged, pushed or released.

## Settled design (before code)

Only section 12.1 is in scope. Use the existing hangar and bench models;
group the benches into four signed corners only with lab-2 enabled. Bench
models use 65% display scale to leave walking aisles inside the existing hall.
Eye height stays at 1.6 m, speed 2.2 m/s, acceleration 5 m/s², turns 90°/s.
No head bob or camera roll. Mouse look requires dragging, with limited pitch.
Wall and machine bounds stop movement. A nearby machine offers its existing
lesson panel with E; a shared wind tunnel offers its five lessons. The door
board lists all sixteen lessons, state, reason and rewards. Brian reuses Rook's
existing person model and stands beside the last machine used (Lift initially).
His two questions use text and existing explanation lines; no paid voice work.
Leaving a bench returns to the same walking position. Esc leaves the Lab.
Off retains the current room, board and glide camera.

Visual plan: existing grey steel (#39413f), concrete (#79796f), safety yellow
(#edc557), warm white (#f5f0dc), passed green (#85d49b). Use the game's sans
serif type for readable prompts, dark steel hanging signs and a door board.
The room fills the walking view; panels appear only for a machine, Brian or
the entrance board. Keep words left aligned and controls large. This follows
the hangar's working materials and makes the machines the main visual.

## Checks

- Pure walking wall/machine collision and every prompt's lesson state.
- Private memory-only browser scenario: door to weighing pad, E opens Lift;
  door/corner/prompt/Brian pictures, plus switch-off and close/reopen checks.
- Lane tier (`--jobs 4`) and production build, after heavy-job admission.
- One independent code review. No frame timing.

## Changed assertions

`tools/test-feature-flags.mjs`: exact non-course switch count 39 → 40 and
`lab-2` added to the expected dev set. No old expectation was dropped or
loosened. The private preview launcher's existing explicit flag list includes
lab-2 so its unchanged every-dev-switch assertion remains true. Claude's
written assertion review is required before integration (AGENTS 18).

## Evidence and review

- Six new pure checks pass: collision, movement comfort, all lesson prompts,
  dev-only switch, shared tunnel state, and clear approaches/Brian positions
  at every actual machine footprint. Existing Lab-view suite: 31/31 pass.
  Feature switches: 99 checks pass.
- Independent reviewer approved the final code delta. Review found and fixed
  Brian's placement at wall-side machines, shared tunnel locked wording,
  passed floor markings and the Rust board row's Sirena reward.
- Final browser walk passed on private port 45461, memory-only, zero console
  errors or warnings. It walks from the door to the weighing pad, opens Lift
  with E, returns without moving the camera, uses mouse drag to view Brian,
  asks both questions, leaves with Esc, reopens, then checks switch-off.
  Pictures: `.evidence/2026-10-26/LAB-WALK/`. Sheet:
  `docs/board/looks/lab-2/look-1.jpg` (362,975 bytes).
  The first attempt's temporary-player setup was corrected; no real save was
  read. Picture framing was corrected after checking the first Brian capture.
- Frozen source `b40b3656`: lane tier **43/43 passed**, zero failed/not run,
  jobs 4, 348.05 s. `npm run build` passed in 1.17 s. PowerShell used
  `C:\Windows\System32` first on PATH. Heavy roots counted before every job;
  the lane's one-minute check found two roots. No frame timing.
  Build retains the existing large-chunk and mixed static/dynamic-import
  warnings. Raw reports and gate/build logs are beside the pictures.
- Sounds reuse existing `lab.brian.<lesson>.intro` when a bench is opened or
  Brian explains it. No new voice or audio assets, dependencies or external requests.
- Replay fingerprints and world signatures are unchanged: their lane guards
  passed, including 12 combat replay checks and 47 exact scene checks across
  twenty events. No pinned replay, lap time or signature was re-recorded.
- Session end: STATUS refreshed; Cockpit sync ran from the current integration
  board. This run's generated `.qa-dist/` and `dist/` were recycled. Requested
  pictures, the comparison sheet, and the capture/sheet recipes remain.

## Open for the Director

Claude's look verdict and written review of the exact switch inventory
assertion remain before integration. Independent code review is clear.
LAB-LESSON-FRAME owns replacement teaching panels; this card opens the
existing lessons as requested. No notebook, lesson rewrite or save change.

## Removed

Nothing: the old glide camera and panels remain for switch-off. They are
removed when lab-2 goes live, as section 12 requires.

## Claude review (26 October 2026)

Look accepted at round 1: corner signs, floor prompts, the door board and
the controls line read clearly. The test change only counts the new switch
and lists `lab-2` as dev; nothing is loosened. At merge, integration had
switched `grand-prix-career` on (GP-CAREER-LIVE), so the resolved line keeps
both: 40 switches, `grand-prix-career` out of the dev list, `lab-2` in it.
`test-feature-flags` and `test-lab-walk` pass on the merged result.

Follow-up: Brian reuses Rook, a Wasteland fighter in camouflage and a
bandana, which is wrong for a calm workshop teacher. LAB-LIFT-2 gives Brian
his own figure (work shirt or overalls, safety glasses on his head).
