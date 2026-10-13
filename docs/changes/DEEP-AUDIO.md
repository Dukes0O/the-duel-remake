# DEEP-AUDIO

The three-cue listening revision is built. The Deep stays dev. Claude's revised
listening verdict and DEEP-ZONE's real mix check remain open; no release or push.

## Behavior and design before code

Claude approved round one with one pearl change: a rising shimmer of about two
seconds, ending above the unchanged log. Reuse verified CC0 source 541982;
ascending delayed pitch layers use the same chime, with the highest layer last.
The authored and encoded duration is 2.00 s. Cue gain, .42 master and original
loudnorm/limiter are unchanged. Listening acceptance belongs to Claude.

Try existing Vorbis q5 once for bubbles and cave. Keep OGG only when the original
decoded seam, loudness and true-peak checks pass; retain FLAC only on an actual
OGG seam failure. Both OGG attempts passed, so both replaced FLAC copies went
to Recycle Bin. No new source input, download, dependency or mastering change.

The existing generator accepts selected existing recipes, defaulting to all
eight. Its catalogue update preserves every unselected row and its order.
The five other runtime assets, cold-entry adapter, ordinary loader/filter,
audio-output mix and all game/save source remain exact.

## Changed assertions

The old loop container assertion pinned FLAC. The two exact pins now require
OGG following their real passing codec trials; the same independent decoded
seam, loudness and peak checks remain unchanged. Pearl is pinned to the approved
two-second recipe and encoded duration. Five independent original SHA-256 pins
protect the unaffected assets. No legacy audio hash projection or tolerance
changes. No new test framework, browser or native capture.

## Actual checks and packet

Tests first: old pearl fails the new duration pin (1.4 versus 2). Existing
Deep Audio acceptance passes on the revision in 1027.2545 ms: eight assets,
provenance/levels/seams, delayed entry, readonly lifecycle and engine filters.

| Cue | Codec | LUFS | Peak dBTP | Bytes |
| --- | --- | ---: | ---: | ---: |
| Pearl | Vorbis q5 | -22.09 | -11.66 | 25,895 |
| Bubbles | Vorbis q5 | -20.07 | -3.01 | 72,875 |
| Cave | Vorbis q5 | -21.56 | -4.19 | 45,671 |

Decoded loop jumps/unchanged limits: bubbles .0050293/.0058847;
cave .0092155/.0122675. Both pass. Loop saving: 247,828 B.
All eight now total 296,425 B, down from 532,629 B (net saving 236,204 B).
Byte proof preserves all 85 unselected catalogue rows and five runtime assets.

One revised packet uses the existing labelled offline PCM/MP3 method, exact
runtime files and cue gains, unchanged .42 master and no normalization. Its
loop audition excerpts fade at six seconds; runtime loop boundaries are checked
separately. This is not a native mix or a listening pass.
Integration evidence: .evidence/2026-10-12/DEEP-AUDIO/revision-2/
round-2.html, round-2.mp3, listening-index.json, original generation/check logs
and source-proof.json. Nearby lane, build and ordinary review await receipts.

The earlier source d6a76d3a passed 143/143 and build with its ordinary review.
Its two earlier guard failures (35/1/107 and 82/1/60) were resolved with literal
Deep projections/import pairs; original expected hashes stayed exact. Those
accepted adapter/guard paths are unchanged by this revision.

## Removed

Replaced bubbles.flac and cave.flac in this change; recycled only those two
owned lane copies. Pearl replaces its runtime file in place. Keep licensed
source inputs and all five unaffected assets. Earlier consumed listening
verdict/history is folded here and on the card. Root owns lane/evidence cleanup.

## Revised source integration

Exact c1408cbdf2f72faf040493cedd9aad37c87b9ba7 passes original nearby55/55, zero failures/unrun,165.1771s/jobs4; build exits0,996.1124ms wall (Vite525ms). Ordinary review is clear on that exact source. Integrated without conflicts and without another gate. Three affected cues meet Claude's specified revision; five assets and all85 other catalogue rows/order stay exact. Net saving236204B (loops save247828B; pearl grows11624B), eight-asset total296425B. Card remains open for Claude's revised listening verdict and actual DEEP-ZONE mix; no native/listening pass is invented. Packet remains in integration .evidence/2026-10-12/DEEP-AUDIO/revision-2 while the consumed source lane is cleared. The Deep stays dev; no release/push.
