# POLISH-FLAME round 1

Claude art verdict: pending. First of at most three rounds.

Director independently viewed the 454,634-byte sheet and reviewed the source:
textured car and Cinder plumes improve readability; no source finding. Claude
retains final art approval. No second round starts before that feedback.

Matched native App/Duel frames at 1280 x 800, seed 202602, both qualities.
Rows: start, full burst, post-burst burning car, Cinder. The first two rows
place the rival outside the 9 m range and assert zero damage. The burning
row follows native burst completion and verifies 1.4583 s remains on the
victim's burn. Cinder uses native exit, gear selection and firing; its first
firing tick is rendered before advancing to the full plume. Origins, sector
endpoints, decoded textures and unchanged race state are checked in browser.

Source: verified Kenney Particle Pack CC0 flame/smoke/scorch silhouettes,
55,170 runtime bytes. Exact originals/license and recipe are in the art
catalog. One shared texture set, bounded pools and two persistent lights.

Quiet paired frame comparison uses a fixed native two-flamethrower pose/time,
240 real rAF intervals per quality/version. P95 High 18.2 -> 18.8 ms (+3.3%),
Performance 18.2 -> 18.2 ms; these meet the +10% P95 limit. High mean
17.77 -> 19.93 ms (+12.2%) remains unresolved; Performance 17.65 -> 17.72 ms.
Repeat the quiet baseline/candidate comparison before merge. Do not infer
an overall frame-cost pass from P95 alone. Draw calls: High 1134 -> 1153,
Performance 638 -> 657. Raw evidence is retained in integration
`.evidence/2026-10-09/POLISH-FLAME/`.

Focused Flame, native Arsenal Wave 2 (39), shared Smoke checks and build pass.
Broad lane gate is deferred by Director until the art-approved candidate is
ready to merge. POLISH-SMOKE must be approved and merged first. No release.
