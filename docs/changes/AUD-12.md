---
task: AUD-12
status: in-progress
kind: tooling
flag: none
player_facing: no
---

# On-demand sound sourcing (Kyle and Claude, 24 September 2026)

## What changed

- `tools/audio/freesound.mjs` searches Freesound (CC0 by default) and fetches
  only chosen sounds as high-quality previews into
  `C:\Users\kyleb\dev\audio-library\freesound\`, outside the repository.
- `tools/audio/elevenlabs.mjs` lists stock voices, reports credits and makes
  voice lines on the free plan. Takes go to `.evidence/audio/voices/` for
  listening; `--keep` moves a chosen take to `audio-src/voices/` and catalogs it.
- `tools/audio/catalog.json` records each fetched sound's recipe: id, author,
  licence, page, checksum and intended cue. Keys are read only from Kyle's user
  environment variables and never written or printed.
- First batch fetched for listening: two blasts, two crossbow shots, a car
  crash, two rocket launches (all CC0), and three gatekeeper voice takes
  (Callum, Harry, Bill) with the line "Outsiders don't find this road by
  accident. Come in, driver."

## Kyle's first listening round (24 September 2026)

- Gatekeeper voice: **Callum** chosen. The exact take was kept with
  `elevenlabs.mjs keep-take` as `audio-src/voices/gatekeeper-welcome.mp3`
  (no credits spent again); the Harry and Bill takes were deleted.
- Crossbow: both originals rejected as far too quiet (one measured -33 LUFS)
  and lacking flight. Kyle wants a "pew" with a whoosh or whistle through the
  air. Three layered candidates were mixed at about -14 LUFS for round 2:
  A snap + arrow flyby, B bow release + flyby + synthesized pew,
  C snap + airy whistle + pew. Their recipes: sources 384905, 394180,
  536068, 789389 and 855733 in the catalog, a 1400 to 350 Hz pitch-drop
  "pew" of 0.18 s, FFmpeg loudnorm to -14 LUFS and -1 dBTP. The winning
  recipe moves into the audio build tool with AUD-10.
- Blasts, crash and rocket launches: not yet rated.

## Evidence

- `node tools/test-audio-sourcing.mjs`: 27 checks with fake network responses.
- Lane tier: 252 passed, 0 failed. Production build passed.
- Real calls: both keys work; free plan with 10,000 credits. The account's
  credit counter lagged after three voice takes, so the tool logs a labelled
  estimate (one credit per character) when it has not updated.

## Removed

Nothing yet. AUD-10 replaces the synthesized weapon and blast tones once these
sounds win their listening rounds.

## Behavior and test changes

No game code changed. No existing assertion changed. The placement check now
accepts audio files in `audio-src/` (the SPEC 0.9 home for takes that cannot
be regenerated); a new rules case covers it. Audio elsewhere outside
`public/` still fails.
