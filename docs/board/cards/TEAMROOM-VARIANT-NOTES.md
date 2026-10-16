# TEAMROOM-VARIANT-NOTES

From Claude's Team Room finishing pass (P4-FINISH-TEAMROOM, 16 October 2026).

The reverse variants of Harbour Lights, Panorama Ridge and Tremblant Woods
(switch `dev` today) show only the generated engineer text. Before each
variant is switched on, write its notes in the same voice as its parent
circuit's: a `line` and a `note` for each slow corner, plus the passing zone
and signature view, keyed to the variant's real corner ids (corners are
driven the other way, so the parent's notes do not carry over). The dusk and
night variants drive the parent's road the same way and reuse its notes;
confirm that in the Team Room for each.

Acceptance: no note key without a real corner; tests in
`tools/test-track-analysis.mjs`; one dossier picture per variant judged by
Claude. Notes only: no `sectors`, so reference laps stay valid.
