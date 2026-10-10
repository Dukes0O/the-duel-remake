# POLISH-FLAME round 1

Claude/Kyle art verdict: approved on 10 October 2026. One round used.

Director independently viewed the 454,634-byte sheet and reviewed the source:
textured car and Cinder plumes improve readability; no source finding.
Claude/Kyle approved this round; no second art round is needed.

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
17.77 -> 19.93 ms (+12.2%); Performance 17.65 -> 17.72 ms. Claude/Kyle
accepted the passing P95 result on 10 October and explicitly made the High
mean informational, not a blocker. No additional frame rerun is required. Draw calls: High 1134 -> 1153,
Performance 638 -> 657. Raw evidence is retained in integration
`.evidence/2026-10-09/POLISH-FLAME/`.

Focused Flame, native Arsenal Wave 2 (39), shared Smoke checks and build pass.
Broad lane gate awaits integration sync after POLISH-SMOKE is approved and
merged. Shared rendering stays with Smoke meanwhile. No release.

Source sync on 10 October retains this approved Flame art with Smoke b4494e99
and Height integration 1f5da9c8. Director cleared the single renderer conflict
resolution. Focused Flame/Smoke tests, build and eight native Flame poses in
both qualities pass. This is a source compatibility check, not another art or
frame round. Smoke approval/merge and Flame's fresh lane gate remain pending.
