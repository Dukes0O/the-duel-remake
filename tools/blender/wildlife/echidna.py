"""Panorama Ridge short-beaked echidna: an original recipe with its own rig.

About 0.4 m long with a 7 cm beak: a low domed body covered in cream
spines with dark tips, coarse dark brown fur between them, a thin dark
beak, tiny eyes and short splayed legs with heavy claws. Idle and Walk use
the shared quadruped animation in common.py. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'echidna'
FUR = (.032, .023, .016)
SPINE = (.40, .34, .21)
TIP = (.020, .016, .012)
BEAK = (.036, .031, .027)

BODY = [((-.195, 0, .090), .030, .028), ((-.170, 0, .094), .092, .062), ((-.12, 0, .098), .126, .074),
        ((-.06, 0, .100), .140, .078), ((.00, 0, .100), .138, .076), ((.06, 0, .096), .122, .068),
        ((.10, 0, .091), .096, .058), ((.135, 0, .086), .062, .046), ((.155, 0, .082), .030, .028)]


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .04))
    a.bone('spine', (-.14, 0, .095), (.10, 0, .092), 'root')
    a.bone('neck', (.10, 0, .092), (.14, 0, .086), 'spine')
    a.bone('head', (.14, 0, .086), (.27, 0, .036), 'neck')
    a.bone('tail', (-.16, 0, .09), (-.20, 0, .085), 'spine')
    body = o.near(a, ['spine', 'neck', 'tail'])
    a.fur(BODY, lambda p: o.mix(FUR, (.06, .045, .032), .5 * o.speckle(p)), body, 22, .05)
    a.tube3([(.13, 0, .086), (.20, 0, .064), (.272, 0, .036)], [.030, .014, .006], BEAK, 'head', 10)
    for s in (1, -1):
        a.oval((.128, s * .036, .098), (.004, .003, .004), (.006, .005, .004), 'head', 3, 6)
    # Spines over the upper body, raked back, lengths varying spine to spine.
    count = 0
    rows, around = 15, 19
    for i in range(rows):
        for k in range(around):
            u = (.9 + (i + (k % 2) * .5) * (len(BODY) - 3.0) / rows) / (len(BODY) - 1)
            seg = min(len(BODY) - 2, int(u * (len(BODY) - 1)))
            f = u * (len(BODY) - 1) - seg
            (c0, w0, h0), (c1, w1, h1) = BODY[seg], BODY[seg + 1]
            centre = Vector(c0).lerp(Vector(c1), f)
            width, height = w0 + (w1 - w0) * f, h0 + (h1 - h0) * f
            ang = math.radians(-34 + (248 * k / (around - 1)))
            normal = Vector((0, math.cos(ang) / max(width, .01), math.sin(ang) / max(height, .01))).normalized()
            base = centre + Vector((0, math.cos(ang) * width, math.sin(ang) * height)) * .93
            direction = (normal + Vector((-.75, 0, 0))).normalized()
            length = .040 + .022 * o.speckle(base, 1.7)
            tip = base + direction * length
            a.tube3([base - direction * .006, base.lerp(tip, .55), tip], [.0085, .0060, .0008],
                    lambda p, b=base, L=length: TIP if (Vector(p) - b).length > .62 * L else SPINE,
                    body, 3)
            count += 1
    for side, s in (('L', 1), ('R', -1)):
        o.small_leg(a, 'front.' + side, (.07, s * .07, .07), (.085, s * .115, .045), (.085, s * .125, .016),
                    (.115, s * .135, .010), (.024, .019, .015), FUR, FUR, False, claws=3)
        o.small_leg(a, 'rear.' + side, (-.10, s * .07, .07), (-.12, s * .115, .045), (-.12, s * .125, .016),
                    (-.15, s * .13, .010), (.026, .020, .016), FUR, FUR, True, claws=3)

    def animate(rig):
        c.animate(a, rig, stride=.05, lift=.02)
    o.finish(a, c, output, animate)


if __name__ == '__main__':
    cli(ID, build)
