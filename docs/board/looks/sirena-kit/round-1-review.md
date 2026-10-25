# SIRENA-KIT round 1: the Falcone Sirena's three armor tiers

[Sheet](round-1.jpg): the Sirena stock, then Scrapper, Raider and Warlord, each from the front three-quarter, the side and the rear three-quarter, in the actual game (High quality, a private memory-only save). The dark spiked wedge at the nose and the crossbow on the roof are the combat weapons, which appear on every row; they are not the kit.

## What each tier does

- **Scrapper:** door sheets between the wheels, a thin quarter plate over each fender (the front one stops where the hood drops away), two exhaust stacks behind the rear wheels, a bull bar at the nose (not separable from the weapon wedge in these views).
- **Raider:** adds overlapping lower door sheets and two toothed saws at the doors, roof rails and a cross bar, and the turret ring on the roof.
- **Warlord:** a full rusted shell cut from the Sirena's own body faces, 2 cm out, with the crown teeth and the roof bar; the white stripe and the 7 are covered, as on every car at this tier.

## Fit (measured, then looked at)

Vertex tests in car-local metres, against the Sirena's real wheel discs and glass:

- Scrapper and Raider: no vertex inside a wheel's disc and no vertex within 12 mm of the glass, except the Raider's turret ring, which touches the windscreen frame at 3 mm.
- Warlord: the shell follows the body, so it shares the body's own wheel-arch relation (435 vertices inside a wheel disc, deepest 212 mm, against 624 and 224 mm for the bare body, all inside the arch). The wheels, lamps and glass all read clear on the sheet.
- The Sirena's wheels stand proud of its flanks (the tyre's outer face is level with the body), which is why a plate beside a wheel lay in the tyre on the first build. The quarter plates ride the fender crowns instead, the exhaust stacks moved behind the rear wheels and the Raider's door sheets stop short of them (`CAR_RULES` in `tools/blender/armor-kits.py`; the audit samples the fender side as `fenderGrid`).

## Judgement

Matches the other cars: three readable steps, wheels and glass clear, geometry distinct from every other kit (3,574 triangles against the Falcone's 3,749, 433 KB). The weakest parts, which I would take to round 2 only if asked: the front fender plate is a thin strip (the body leaves only 8 cm of fender above the tyre), and the Scrapper tier reads mostly as door sheets, as it does on the low cars. Likeness 3, readability 3, grounding 3, scene consistency 3 (the scale the earlier rounds used).

One round used of two.
