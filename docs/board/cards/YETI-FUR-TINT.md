# YETI-FUR-TINT

The short board entry controls current state, ownership, dependencies and locks.

Claude, 14 October night. The yeti reads dark grey-green at night. Add an
optional `furTint` colour in `src/yeti-view.js`, applied to cloned materials
(never the donor), and set it to a pale grey-white so the yeti reads as a
pale shape in the dark. Accepted model and animation unchanged. One picture
pair (roar view, night) for Claude.


## Caller lock before source

The optional view parameter needs its normal createYetiView caller in render3d.js to set the pale colour while omission preserves existing output. The board now names busy-game-files; Attack still owns it, so no Yeti tint source or lane starts. Clone only the intended fur materials and dispose owned clones; never tint/dispose the shared donor, eyes or teeth. Exact tint and source tests are settled before code, then the real night roar pair goes to Claude. Current accepted rig/clips/geometry stay exact; no picture verdict or player-save change is inferred.
