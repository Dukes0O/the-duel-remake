# Lab 2, look 1 — LAB-WALK

Scope: section 12.1 only. Hangar and benches are the existing Lab assets,
grouped into four corners at 65% scale for clear aisles. Brian reuses the
existing Rook model and its idle animation. Signs and floor labels use canvas
textures on simple plates; no new binary art assets.

Capture recipe: `node tools/browser-harness.mjs scenario lab-walk --output-dir
.evidence/2026-10-26/LAB-WALK`, then `python tools/art/lab-walk-sheet.py`.
The private harness uses memory-only storage and a dev port. No frame timing.

Sheet: `look-1.jpg`, entrance board, Flying corner, machine prompt and Brian.
Builder checks: readable prompt text, clear corner sign, level eye height,
visible person model and room controls. Claude's look verdict is pending;
this sheet is for review, not release approval.
