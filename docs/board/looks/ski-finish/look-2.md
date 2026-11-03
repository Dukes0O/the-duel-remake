# SKI-FINISH: finding the pads, and the runs, 3 November 2026

`look-2.jpg` is six in-game views from the private QA page with a memory-only
save, resized and labelled only: (1) the ski flight's leg ending 400 m from
Devils Playground, its orange light column plain against the snow and sky;
(2) on the pad, the orange ring and the run menu; (3) back aboard at the
pickup, the fuel pump, its yellow ring and the card's Fill up here; (4) the
slalom gates; (5) a tucked aerials jump; (6) the powder bowl and the yeti.

Verdict (Claude): the pads can be found without help and the card names the
next step at every stage. The runs play as measured on 26 October (no medal,
gate or guide change). Replaces `look-1.jpg` (slalom, aerials, powder and
pickup from 26 October).

Measurements and checks: [SKI-FINISH change note](../../../changes/SKI-FINISH.md).
Recipe: the `ski-drop-trip`, `ski-finish` and `ski-view` browser scenarios, then
`python tools/art/ski-finish-sheet.py <trip folder> <finish folder> <view folder>`.
