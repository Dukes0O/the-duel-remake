# DEEP-ART-SRC

## Design settled before source changes

Source existing licensed assets for all fourteen exact creature IDs and the
four set-piece roles in THE_DEEP 10.1. Keep donor files in the external art
library and record source URL, author, license, download URL and SHA-256 in
the existing art catalog. Show one honest source-preview sheet per round,
under 500 KB, for Claude to judge (maximum three rounds). The sheet shows
published donor previews, not adapted models or the running game.

Choose natural silhouettes and restrained materials. Reject cute eyes,
fantasy species, wrong anatomy and a wooden wreck passed off as a freighter.
A possible donor must name every required fitting change; it is not finished
runtime art. No new render machinery, dependencies or runtime integration.
The Deep remains dev. Public receives only approved finished runtime assets.

## Current state and meaningful source acceptance

Round-one source packet is ready; **whole-card acceptance is incomplete**.
The sheet is 353,078 bytes; its SHA-256 is `ac0cd047a3c423ae824bd047d6ee0450acd6c828051373e0daae0ca2cd75a198`.
Fifteen verified donor GLBs (4,220,680 bytes) remain outside the repository;
no runtime file was added. All fourteen exact creature IDs and four set
roles have an explicit catalog row. Moray, grouper and giant clam are
licensed CC0 leads whose mesh downloads each return 401; `downloaded:false`
and null mesh hashes stay explicit. The available river otter is a donor,
not sea-otter art. No wrong species or toy donor is declared finished.

Actual GLB inspection passed for all fifteen downloads: glTF 2 headers and
file lengths, nonempty meshes/nodes, SHA-256 checks and external images
(Kenney colormap). Actual triangle/clip counts and every source/author/
license URL are in the existing catalog and round-one note. Existing
catalog data hash remains `bb28af43422d33bfc606c072a8f7112829b7bd4b1972da517641ca298183ebce`.
No existing assertion, bound, fingerprint or signature was changed.

## Claude decision and source handoff

Root posts the request in the card's own `Claude answers` section under
current integration AGENTS 16 (93b42642); the lane edits no shared metadata.
See `docs/board/looks/deep-art/round-1-review.md` for the exact source table,
weak-role questions, rejected leads and truthful incomplete acceptance.
This is round one of three. Claude has not judged it yet.

Base: `874bc0e301975f0f1b4dadf8c0fadb8c8de92688`.
Existing `node tools/test-art-sourcing.mjs` passed (the governed catalog's
legacy picks and global unique IDs); the independent source inspection above
covers the new Deep rows. `git diff --check` passed. No new tests or assertions.
The canonical `node tools/run-tests.mjs --tier lane --changed --jobs 4 --list
--json` selects 26 suites, including `tools/test-rustwall-p2-relief.mjs`.
That suite runs native Blender exports/renders at lines 107–120, 174 and 404.
The canonical execution is deferred intact to night under the daytime pure-
check instruction; **no filtered lane pass or merge clearance is claimed**.
Frozen source hash and the nearby build result will be supplied to Root with
pinned ignored evidence. No full-card merge pass is claimed.
Root performs the one source review; Claude performs the art verdict.

## Removed

No existing assets, client files or other lane work were removed. Scratch and
rejected new downloads are recycled after selected-cache and packet checks.
Only the selected external original sources and necessary review evidence
remain. The existing Kenney source pack remains unchanged.

## Deferred checks

No browser scenario, frame timing, balance or full tier runs in this daytime
source card. Reachable-world placement and timing belong to DEEP-LIFE and
FINISH-DEEP/night shift. Claude must judge the source sheet before the card
can claim its art acceptance.
