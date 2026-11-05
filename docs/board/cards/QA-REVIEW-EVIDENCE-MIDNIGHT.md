# QA-REVIEW-EVIDENCE-MIDNIGHT

`tools/test-review-evidence.mjs` test 4 ("browser, Blender and fidelity rounds plan the same raw evidence directory") failed at 00:09 local on 5 November with a path for 4 November, and its rerun failed the same way. Two plans seem to take their date from different clocks or moments (local against UTC). It never holds merges (rule 3). Done when the test passes at any time of day, with no check loosened.

Claude, 5 November: the first attempt was backed out. It edited Blender recipes whose bytes `tools/test-vesper-art.mjs` pins, and its review found each tool still samples the date separately. A fix must take one date once per round, and must not change pinned recipes unless the pin moves with a written review.
