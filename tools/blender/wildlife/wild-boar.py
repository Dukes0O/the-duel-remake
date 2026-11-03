"""Europe wild boar: an original recipe with its own rig.

A sow-sized boar, about 0.85 m at the shoulder and 1.4 m long: a deep body
shaped like a wedge, heavy and high at the shoulders, narrow and lower at
the rump; a long head tapering to a snout with a flat disc; small upright
ears; small curved tusks; short legs on small cloven hooves; a thin tail
with a tuft. Coarse dark grizzled bristles with pale tips, a raised ridge of
longer bristles along the spine. No donor shape fitted (the bear donor is
round-backed and short-snouted), so it is built from sections.
Idle and Walk use the shared quadruped animation in common.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'wild-boar'
BRISTLE = (.036, .026, .018)
DARKER = (.014, .011, .009)
TIPS = (.16, .13, .10)
SNOUT = (.13, .10, .088)
TUSK = (.55, .52, .45)
HOOF = (.015, .013, .011)


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .1))
    a.bone('spine', (-.48, 0, .56), (.30, 0, .66), 'root')
    a.bone('neck', (.30, 0, .66), (.50, 0, .62), 'spine')
    a.bone('head', (.50, 0, .62), (1.00, 0, .40), 'neck')
    a.bone('tail', (-.64, 0, .62), (-.74, 0, .40), 'spine')

    def coat(p):
        # Coarse and uneven: patchy zones at two sizes, scattered pale tips,
        # darker along the spine, on the face and down the legs.
        colour = o.mix(BRISTLE, DARKER, .8 * o.mottle(p, .8) * o.mottle(p, 2.3))
        colour = o.mix(colour, TIPS, .80 * o.speckle(p) ** 2)
        colour = o.mix(colour, DARKER, o.smooth((p.z - .78) / .08) * .6)          # spine ridge
        colour = o.mix(colour, DARKER, o.smooth((p.x - .55) / .1) * o.smooth((.88 - p.x) / .05) * .5)   # face
        return o.mix(colour, DARKER, o.smooth((.40 - p.z) / .15) * .6)          # belly and legs

    # Wedge body: deep and high at the shoulders, narrower and lower at the rump.
    body = o.near(a, ['spine', 'neck', 'tail'])
    a.fur([((-.70, 0, .58), .05, .05), ((-.64, 0, .58), .15, .17), ((-.52, 0, .57), .22, .22),
           ((-.34, 0, .56), .25, .25), ((-.12, 0, .57), .27, .28), ((.08, 0, .60), .28, .32),
           ((.26, 0, .63), .27, .34), ((.40, 0, .62), .23, .30), ((.52, 0, .60), .18, .24)],
          coat, body, 24, .12)
    # Long head tapering to the snout disc.
    head = o.near(a, ['head', 'neck'])
    # A longer wedge snout, paler towards the disc.
    a.fur([((.48, 0, .62), .17, .22), ((.59, 0, .60), .15, .19), ((.70, 0, .55), .12, .15),
           ((.81, 0, .495), .085, .10), ((.92, 0, .445), .060, .070), ((1.00, 0, .415), .052, .058),
           ((1.015, 0, .412), .046, .050)], lambda p: o.mix(coat(p), SNOUT, o.smooth((p.x - .90) / .07)), head, 18, .04)
    a.oval((1.018, 0, .412), (.006, .048, .052), SNOUT, 'head', 3, 12)                  # the disc
    for s in (1, -1):
        a.oval((1.018, s * .018, .419), (.003, .008, .010), (.02, .015, .013), 'head', 2, 6)   # nostrils
        a.oval((.66, s * .105, .62), (.010, .006, .009), (.006, .005, .004), 'head', 3, 6)   # small eyes
        # Small upright ears, a little forward.
        a.blade([((.50, s * .09, .82), (.45, s * .13, .80), .012, (1, 0, 0)),
                 ((.50, s * .11, .90), (.46, s * .15, .88), .008, (1, 0, 0)),
                 ((.49, s * .13, .97), (.48, s * .14, .96), .003, (1, 0, 0))], DARKER, 'head')
        # Small tusks curving up and out from the lower jaw.
        a.tube3([(.86, s * .05, .41), (.89, s * .075, .43), (.895, s * .085, .47)], [.010, .008, .002], TUSK, 'head', 5)
    # Ridge of longer bristles along the spine, highest over the shoulders.
    for k in range(48):
        u = k / 47
        x = -.60 + 1.12 * u
        height = .08 + .10 * math.exp(-((x - .15) / .30) ** 2)
        top = .58 + .26 * math.exp(-((x - .20) / .40) ** 2) + .02 * (x > -.4)
        top = max(top, .58 + .20 * (1 - abs(x + .1) / .7))
        for side in (-1, 0, 1):
            base = Vector((x + side * .01, side * .025, top - .02))
            tip = base + Vector((-.03, side * .012, height * (1 - .3 * abs(side))))
            a.tube3([base, tip], [.012, .002], lambda p: o.mix(DARKER, TIPS, .4 * o.speckle(p)), body, 3)
    for side, s in (('L', 1), ('R', -1)):
        y = s * .14
        # Front legs set under the heavy shoulders; hams under the rump.
        boar_leg(a, o, 'front.' + side, Vector((.20, y * .75, .50)), Vector((.23, y * .95, .19)), Vector((.22, y * .95, .08)),
                 (.12, .048, .022), coat, False)
        boar_leg(a, o, 'rear.' + side, Vector((-.42, y * .72, .48)), Vector((-.34, y * .95, .21)), Vector((-.44, y * .95, .08)),
                 (.14, .052, .023), coat, True)
    a.tube3([(-.66, 0, .62), (-.71, 0, .52), (-.73, 0, .42)], [.016, .010, .008], DARKER, 'tail', 5)
    a.tube3([(-.73, 0, .43), (-.74, 0, .37)], [.022, .004], DARKER, 'tail', 6)              # tuft

    def animate(rig):
        c.animate(a, rig, stride=.22, lift=.08)
    o.finish(a, c, output, animate)


def boar_leg(a, o, name, hip, knee, ankle, radii, coat, hind):
    """A slim short leg tapering to two small hoof halves with dewclaws behind.

    Registers the bones and leg entry the shared walk in common.animate uses.
    """
    from mathutils import Vector
    toe = ankle + Vector((.035, 0, -.06))
    a.bone(name + '.upper', tuple(hip), tuple(knee), 'spine')
    a.bone(name + '.lower', tuple(knee), tuple(ankle), name + '.upper')
    a.bone(name + '.foot', tuple(ankle), tuple(toe), name + '.lower')
    a.legs.append((name, tuple(hip), tuple(knee), tuple(ankle), tuple(toe), hind))
    limb = o.near(a, [name + '.upper', name + '.lower', 'spine'])
    leg = lambda p: o.mix(coat(p), DARKER, o.smooth((.36 - p.z) / .12))      # dark lower leg
    # Thick muscular forearm or ham, rising out of the body: it starts wide
    # and deep inside the flank, so it blends in with no seam, and tapers
    # to the joint.
    # The top closes in a dome deep inside the body, so no flat end shows.
    top = hip + Vector((0, 0, .10))
    a.fur([(tuple(top + Vector((0, 0, .09))), .010, .010), (tuple(top + Vector((0, 0, .05))), radii[0] * .70, radii[0] * .90),
           (tuple(top), radii[0] * .95, radii[0] * 1.25), (tuple(hip), radii[0], radii[0] * 1.15),
           (tuple(hip.lerp(knee, .45)), radii[0] * .72, radii[0] * .85), (tuple(hip.lerp(knee, .8)), radii[1] * 1.6, radii[1] * 1.7),
           (tuple(knee), radii[1] * 1.15, radii[1] * 1.2), (tuple(knee + Vector((0, 0, -.02))), radii[1] * .75, radii[1] * .8),
           (tuple(knee + Vector((0, 0, -.032))), .004, .004)], leg, limb, 12, .05)
    shank = o.near(a, [name + '.lower', name + '.foot'])
    a.tube3([knee, knee.lerp(ankle, .6), ankle, toe + Vector((-.010, 0, .028))],
            [radii[1], radii[1] * .80, radii[2], radii[2] * .95], leg, shank, 8)
    for side in (-1, 1):
        # Two pointed hoof halves with a cleft between them, joined to the pastern.
        a.tube3([toe + Vector((-.016, side * .010, .030)), toe + Vector((.004, side * .011, .014)),
                 toe + Vector((.026, side * .008, .004))], [.017, .015, .004], HOOF, name + '.foot', 7, .8)
        # Dewclaw, small and set high at the back.
        claw = ankle + Vector((-.012, side * .010, -.032))
        a.tube3([claw, claw + Vector((-.010, side * .003, -.016))], [.008, .002], HOOF, name + '.foot', 4)

if __name__ == '__main__':
    cli(ID, build)
