# EARN-CAR-2

Status: building behind earned-cars (dev). Claude approved the gameplay proposal on the card.

## Design before code

McLaren F1, key mclaren_f1, earned at15medals, factoryMaxed. Base topSpeed217.2, accel9.1, grip1.02, braking1.16, gears[58,98,134,169,197,217.2], dirt grip.63/speed60/scrub.54, mass1140kg, collision halfWidth1/halfLength2.14, height1.14, manual hypercar. Default boost values. Nominal body2.00x4.28x1.14m, central driver and two staggered passenger seats, roof intake, rounded low nose and short road-car tail. Silver paint and charcoal trim. Maker photos on https://www.mclaren.com/cars/us_en/ultimate-models/mclaren-f1 were viewed only; no maker asset is bundled.

Root owns shared board, photography and integration. Model builder owns only src/mclaren-f1-vehicle.js and tools/test-mclaren-f1-vehicle.mjs. Registration builder owns the card's named config/router/socket/voice/kit/coverage hooks. Builders share this isolated lane and preserve each other's edits. Director's additional hooks are recorded on the integration card before source. Runtime shared helper behavior, old-car hashes and existing replay fixtures stay exact. No save schema or existing save-fixture rewrite.

## Verification

Pending model contract, all-car coverage, genuine private images and Claude's look verdict, kit fit, native helicopter lift coverage, Panorama full-field frame check, lane/jobs4, build and independent review. At most three art rounds. An unfinished model is never a finished card.

## Changed assertions

Only roster additions and explicit new-car pins are intended. Each actual changed assertion and the preserved historical controls will be recorded before handoff.

## Removed

Nothing replaced yet. No existing car, asset, replay pin, dependency or save data is removed.
