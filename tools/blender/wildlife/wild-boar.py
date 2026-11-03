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
SNOUT = (.075, .058, .052)
TUSK = (.55, .52, .45)
HOOF = (.015, .013, .011)


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .1))
    a.bone('spine', (-.48, 0, .56), (.30, 0, .66), 'root')
    a.bone('neck', (.30, 0, .66), (.50, 0, .62), 'spine')
    a.bone('head', (.50, 0, .62), (.95, 0, .40), 'neck')
    a.bone('tail', (-.64, 0, .62), (-.74, 0, .40), 'spine')

    def coat(p):
        colour = o.mix(BRISTLE, DARKER, .7 * o.mottle(p, .8))
        colour = o.mix(colour, TIPS, .70 * o.speckle(p) ** 2.5)     # grizzled pale tips
        return o.mix(colour, DARKER, o.smooth((.40 - p.z) / .15) * .5)   # darker belly and legs

    # Wedge body: deep and high at the shoulders, narrower and lower at the rump.
    body = o.near(a, ['spine', 'neck', 'tail'])
    a.fur([((-.70, 0, .58), .05, .05), ((-.64, 0, .58), .15, .17), ((-.52, 0, .57), .22, .22),
           ((-.34, 0, .56), .25, .25), ((-.12, 0, .57), .27, .28), ((.08, 0, .60), .28, .32),
           ((.26, 0, .63), .27, .34), ((.40, 0, .62), .23, .30), ((.52, 0, .60), .18, .24)],
          coat, body, 24, .12)
    # Long head tapering to the snout disc.
    head = o.near(a, ['head', 'neck'])
    a.fur([((.48, 0, .62), .17, .22), ((.58, 0, .60), .15, .19), ((.68, 0, .55), .12, .15),
           ((.78, 0, .50), .085, .10), ((.88, 0, .45), .060, .070), ((.95, 0, .42), .052, .058),
           ((.965, 0, .418), .046, .050)], lambda p: o.mix(coat(p), SNOUT, o.smooth((p.x - .86) / .06)), head, 18, .04)
    a.oval((.968, 0, .418), (.006, .048, .052), SNOUT, 'head', 3, 12)                  # the disc
    for s in (1, -1):
        a.oval((.968, s * .018, .425), (.003, .008, .010), (.02, .015, .013), 'head', 2, 6)   # nostrils
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
        a.leg('front.' + side, (.24, y, .52), (.27, y, .30), (.25, y * .95, .10), (.28, y * .95, .02),
              (.085, .040, .022), coat, HOOF, hind=False, cloven=True)
        a.leg('rear.' + side, (-.44, y * .95, .50), (-.36, y, .30), (-.46, y * .95, .10), (-.42, y * .95, .02),
              (.10, .045, .024), coat, HOOF, hind=True, cloven=True)
    a.tube3([(-.66, 0, .62), (-.71, 0, .52), (-.73, 0, .42)], [.016, .010, .008], DARKER, 'tail', 5)
    a.tube3([(-.73, 0, .43), (-.74, 0, .37)], [.022, .004], DARKER, 'tail', 6)              # tuft

    def animate(rig):
        c.animate(a, rig, stride=.22, lift=.08)
    o.finish(a, c, output, animate)


if __name__ == '__main__':
    cli(ID, build)
