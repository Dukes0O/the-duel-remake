# QA-BUNDLE-NO-COPY

Kyle, 5 November 2026: "why are the browser tests constantly copying the game? ... This is clearly a serious architectural defect in how we test." Every browser run copies all of `public/` (373 MB) into a fresh bundle, which filled the disk on 28 October and 5 November. NO-RECYCLE-BUILDS stopped the copies reaching the Recycle Bin; this stops the copies.

Done when a QA build holds only built code and pages, the preview server serves `public/` from the project, every browser scenario still passes, and the shipped game's build is unchanged. Claude's design and the checks are in `docs/changes/QA-BUNDLE-NO-COPY.md`.
