# The Duel documentation

Start with [AGENTS.md](../AGENTS.md), then [SPEC.md](../SPEC.md) section 0.
The spec settles game rules. [Next run](board/next-run.md) gives the current
phase 2 plan. [Board](board/board.yaml) assigns files and records card state.
[STATUS](board/STATUS.md) reports the last observed build, tests, lanes and
sizes. A status snapshot applies only to its stated commit.

## Work and release

| Read this | For |
| --- | --- |
| [CODEX_PLAYBOOK.md](CODEX_PLAYBOOK.md) | Lane, review, merge and full-tier workflow. |
| [OPERATIONS.md](OPERATIONS.md) | Current folders, private QA, live-game safety, release and rollback. |
| [decisions.md](board/decisions.md) | Director choices that the spec did not settle. |
| [parked.md](board/parked.md) | Work waiting for an explicit reason or decision. |
| [run-log.md](board/run-log.md) | Recent run events and handoffs; keep seven days. |
| [playtest-inbox.md](playtest-inbox.md) | Player feedback and release trial notes. |

The live game is the separate `master` checkout. Development merges into
`integration/wasteland`; only a written release approval permits work in the
live checkout. The cleanup phase is finished; `next-run.md` sets the current order.
The active plan and board take priority over older prompts in the playbook.

## Technical reference

These explain implemented systems and design evidence. Use the task card to
choose which one to read; they do not override the spec or current board.

| Area | Pages |
| --- | --- |
| Architecture and assets | [Architecture](ARCHITECTURE.md), [asset pipeline](ASSET_PIPELINE.md), [graphics](GRAPHICS_ITERATION.md), [performance](PERFORMANCE_PASS.md) |
| Courses and driving | [Course expansion](COURSE_EXPANSION.md), [course access](COURSE_ACCESS.md), [route landforms](ROUTE_LANDFORMS.md), [shortcut pace](SHORTCUT_PACE_AUDIT.md), [physics](PHYSICS_EXPANSION.md), [freestyle](FREESTYLE_EXPANSION.md), [stunt trial](STUNT_TRIAL.md) |
| Arena and warlords | [Scrapdome](SCRAPDOME.md): play design, architecture and the handoff cards |
| Career and vehicles | [Progression](PROGRESSION_V2.md), [unlocks](UNLOCK_VEHICLES.md), [classic vehicles](CLASSIC_VEHICLES.md), [drivers](DRIVERS.md), [ghosts](GHOSTS.md) |
| Art and sound | [Wasteland art](WASTELAND_ART.md), [image prompts](IMAGE_PROMPTS.md), [coast showcase](COAST_SHOWCASE.md), [audio expansion](AUDIO_EXPANSION.md), [audio iteration](AUDIO_ITERATION.md) |

## Evidence and history

- [VERIFICATION.md](VERIFICATION.md) is a record of tested snapshots. Its old
  counts are not a green result for a later commit. Use STATUS and the exact
  full-tier ledger for current gate state.
- `docs/board/looks/` keeps compact review sheets and verdicts. Raw captures
  are deleted after review. Frozen browser QA data lives in
  `tools/fixtures/art-review/`, where the tests read it.
- `docs/changes/` holds new task notes until their still-needed facts are
  folded into current docs or release notes. Superseded task notes and
  handoffs are deleted; Git text history retains old detail if needed.
- `docs/board/checks/` and `docs/board/waves/` hold specific test and wave
  decisions. Read them only when the current card points there.
