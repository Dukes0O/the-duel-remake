# EARN-CAR-2

Status: building behind earned-cars (dev). Claude approved the gameplay proposal on the card.

## Design before code

McLaren F1, key mclaren_f1, earned at15medals, factoryMaxed. Base topSpeed217.2, accel9.1, grip1.02, braking1.16, gears[58,98,134,169,197,217.2], dirt grip.63/speed60/scrub.54, mass1140kg, collision halfWidth1/halfLength2.14, height1.14, manual hypercar. Default boost values. Nominal body2.00x4.28x1.14m, central driver and two staggered passenger seats, roof intake, rounded low nose and short road-car tail. Silver paint and charcoal trim. Maker photos on https://www.mclaren.com/cars/us_en/ultimate-models/mclaren-f1 were viewed only; no maker asset is bundled.

Root owns shared board, photography and integration. Model builder owns only src/mclaren-f1-vehicle.js and tools/test-mclaren-f1-vehicle.mjs. Registration builder owns the card's named config/router/socket/voice/kit/coverage hooks. Builders share this isolated lane and preserve each other's edits. Director's additional hooks are recorded on the integration card before source. Runtime shared helper behavior, old-car hashes and existing replay fixtures stay exact. No save schema or existing save-fixture rewrite.

## Verification

Pending model contract, all-car coverage, genuine private images and Claude's look verdict, kit fit, native helicopter lift coverage, Panorama full-field frame check, lane/jobs4, build and independent review. At most three art rounds. An unfinished model is never a finished card.

## Changed assertions

Roster counts grow from10 to11 and medal cars from1 to2. Starter, priced, Jesko-prerequisite and upgrade counts stay2/6/8/7. Enzo's order test freezes its exact original ten-car prefix instead of requiring it to remain last.

Eligibility seeds a valid15-medal profile and adds F1 to the explicit air-only refusal set. UI covers both real medal cars hidden while off, including owned cars; eligible on-count8 becomes9 and the scratch-car case11 becomes12. Medals keeps both reward cars outside the eight bought-car Jesko prerequisites and adds a real14-to15 grant/maxed/free/retention case. No save schema or historical fixture changes.

Armour adds the unchanged formula's F1 result88.66830868758714 for1140kg. Helicopter coverage adds the1140kg lift/hold with the old0.10m/0.05m-per-second tolerances. Kit/grounding/paint/assets include the new roster row. Blender's expected kit list adds F1.

Solver tests preserve the pre-Enzo nine-car and Enzo ten-car subsets and exact old pins, then add the genuine eleven-car mass-pair pin b5b32ff149de5cdebda9dba356f07f218a5d65bfa7d9486b7b860e1b658d7bff. Titan adds only F1's actual seeded road pin fbebcadee80f7f0ffe83c6cef5aa0ec0632ffc1d0fdfcb11ba5a951db197fbe6. Existing sound-bank/export hashes exclude only the newly appended F1 voice as Enzo already did; F1's voice has its own pinned test. No old tolerance, signal assertion or hash value changes.

## Removed

Nothing replaced yet. No existing car, asset, replay pin, dependency or save data is removed.

## Current source evidence

Model e52b752c passes328 focused checks: measured1.999x4.285x1.140m, tires at0,51610triangles/55draws. Registration97a73fce is independently code-review CLEAR. Focused source checks include progression27, paint2599, assets131, combat18, Enzo435, audio14+36, UI5, helicopter96, grounding6063 across11models, thirteen historical save shapes/437checks, Koenigsegg41, Blender placement71, medals11 and native-memory eligibility3018 across11cars/20courses. The first14/16 focused batch caught two invalid NEW disposable medal rows missing grandprix defaults; only those fixtures changed. Follow-on solver/Titan missing-new-pin failures are preserved, not passed; final source pins are added and await confirmation in the canonical gate.

Only the new492772-byte armour GLB was added (SHA256a6cb9b0e5199ad21c642219720734a29e4e52df4d94962fc85cd54b7cae47dfa); all11 pre-existing kit/turret asset hashes stayed exact. Generated F1 blend and temporary kit texture were recycled. Native pictures, Claude art verdict, frame check and final lane/build are still pending. The card is not complete.


Personal save review is CLEAR on417dfbc1: thirteen historical fixtures and437 first-load/round-trip checks passed in memory. The first six native pictures were captured, but that harness run is FAILED because the showroom requested an absent favicon. Its report and images remain in native-r1; no clean native pass or formal art verdict is claimed. The card-owned photography recipe now supplies an actual empty icon before page load, retaining every browser error check. Model, lighting, cameras and renderer are unchanged. A fresh native packet will verify this correction.


The corrected native packet on8930a480 passed: private58916, memory-only saves, all six real views, zero errors and warnings. Root inspected every original. Formal round1 sheet is128555bytes with its review note under docs/board/looks/earned-cars; Claude verdict is pending. The first uncommitted sheet had overlapping footer labels and was recycled, then rebuilt with clear spacing; model and pictures did not change. This is one formal round. Actual field timing, final canonical lane and build are still unrun.
