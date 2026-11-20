"""City raccoon: an original recipe with its own rig.

About 0.56 m nose to rump with a 0.27 m tail, 0.33 m at the top of its
arched back: a heavy body in thick fur, highest over the hips, on short
legs with dark hand-like feet; a broad head with a pointed muzzle; the
black mask across the eyes and down over the cheeks, edged with white
brows above and a white muzzle below; a dark stripe from the black nose up
the forehead; round ears with pale rims; a bushy tail of five dark rings
and a dark tip. Grizzled grey coat: dark hair tipped pale, browner on the
flanks, pale underneath. No licensed donor has this outline (the wolf
reshaped still reads as a wolf), so it is built as itself.
Idle and Walk use the shared quadruped animation in common.py.
Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'raccoon'
DARK = (.036, .031, .027)
GREY = (.105, .098, .090)
TIP = (.40, .38, .34)
BROWN = (.170, .112, .062)
PALE = (.34, .32, .28)
WHITE = (.60, .59, .55)
MASK = (.012, .011, .010)
FOOT = (.030, .026, .023)
RING = (.020, .017, .015)
BAND = (.30, .26, .20)

BODY = [((-.245, 0, .185), .028, .028), ((-.228, 0, .190), .078, .078), ((-.190, 0, .203), .104, .106),
        ((-.140, 0, .212), .116, .116), ((-.085, 0, .212), .118, .114), ((-.030, 0, .203), .112, .104),
        ((.020, 0, .192), .102, .092), ((.065, 0, .184), .092, .082), ((.105, 0, .180), .080, .074),
        ((.140, 0, .180), .066, .064), ((.168, 0, .184), .054, .054)]
HEAD = [((.145, 0, .190), .054, .052), ((.172, 0, .196), .066, .060), ((.200, 0, .200), .078, .064),
        ((.228, 0, .197), .074, .058), ((.254, 0, .190), .056, .046), ((.276, 0, .182), .038, .033),
        ((.296, 0, .176), .027, .023), ((.310, 0, .173), .019, .016), ((.318, 0, .172), .007, .007)]
TAIL = [((-.205, 0, .200), .028, .028), ((-.245, 0, .188), .035, .035), ((-.300, 0, .165), .038, .037),
        ((-.350, 0, .142), .037, .036), ((-.395, 0, .124), .034, .033), ((-.435, 0, .110), .026, .025),
        ((-.452, 0, .105), .008, .008)]


def dense(sections, n):
    """Resample loft sections to n evenly spaced rings, so painted marks have vertices to sit on."""
    from mathutils import Vector
    out = []
    for k in range(n):
        t = k / (n - 1) * (len(sections) - 1)
        i = min(int(t), len(sections) - 2)
        u = t - i
        (c0, w0, h0), (c1, w1, h1) = sections[i], sections[i + 1]
        out.append((tuple(Vector(c0).lerp(Vector(c1), u)), w0 + (w1 - w0) * u, h0 + (h1 - h0) * u))
    return out


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('spine', (-.18, 0, .205), (.10, 0, .185), 'root')
    a.bone('neck', (.10, 0, .185), (.175, 0, .195), 'spine')
    a.bone('head', (.175, 0, .195), (.305, 0, .174), 'neck')
    a.bone('tail', (-.210, 0, .200), (-.445, 0, .108), 'spine')

    def grizzle(p):
        colour = o.mix(GREY, DARK, .30 * o.mottle(p, 1.2))
        return o.mix(colour, TIP, .75 * o.speckle(p) ** 2.2)

    def coat(p):
        colour = grizzle(p)
        # Darker along the spine, browner on the flanks, pale underneath.
        colour = o.mix(colour, DARK, .45 * o.smooth((p.z - .290) / .03) * o.smooth((.05 - abs(p.y)) / .04))
        colour = o.mix(colour, BROWN, .30 + .35 * o.smooth((.235 - p.z) / .07) * o.mottle(p, 3))
        return o.mix(colour, PALE, .75 * o.smooth((.130 - p.z) / .03))

    a.fur(dense(BODY, 24), coat, o.near(a, ['spine', 'neck', 'tail']), 22, .07)

    def head_coat(p):
        side = abs(p.y)
        if p.x > .309:
            return MASK                                                     # the nose
        # Distance to the mask's line, which runs from before the eye back and down over the cheek.
        ax, az, bx, bz = .274, .207, .206, .184
        t = max(0, min(1, ((p.x - ax) * (bx - ax) + (p.z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2)))
        off = math.hypot(p.x - (ax + (bx - ax) * t), p.z - (az + (bz - az) * t))
        above = p.z > az + (bz - az) * t
        half = .018 - .004 * t
        stripe = side < .009 and p.z > .190 and p.x > .236                  # dark line from the nose up the forehead
        if off < half and side > .012:
            return MASK
        if stripe:
            return o.mix(MASK, DARK, .5)
        if p.x > .268:
            return WHITE                                                    # muzzle
        if off < half + .015 and above and side > .010 and p.x > .208:
            return WHITE                                                    # brows
        if p.z < .184:
            return o.mix(WHITE, PALE, .5)                                   # chin, throat and lower cheeks
        return o.mix(grizzle(p), PALE, .30 * o.smooth((side - .045) / .02))  # crown, paler cheek ruff

    a.fur(dense(HEAD, 18), head_coat, 'head', 26, .035)
    for s in (1, -1):
        a.oval((.259, s * .0425, .2170), (.0055, .0035, .0050), (.004, .004, .004), 'head', 3, 6)      # eye
        # Round ears facing forward: pale rims, dark inside.
        rim = lambda p: o.mix(WHITE, PALE, .4)
        a.blade([((.204, s * .030, .244), (.188, s * .076, .234), .011, (1, 0, 0)),
                 ((.203, s * .033, .266), (.189, s * .080, .258), .009, (1, 0, 0)),
                 ((.201, s * .042, .279), (.191, s * .074, .275), .006, (1, 0, 0)),
                 ((.199, s * .052, .285), (.194, s * .066, .284), .003, (1, 0, 0))], rim, 'head')
        a.oval((.201, s * .056, .262), (.004, .014, .015), DARK, 'head', 3, 8)

    def leg_coat(p):
        return o.mix(o.mix(GREY, DARK, .45), FOOT, o.smooth((.075 - p.z) / .05))
    for side, s in (('L', 1), ('R', -1)):
        y = s * .064
        o.small_leg(a, 'front.' + side, (.085, y, .135), (.098, y * 1.06, .078), (.092, y * 1.06, .028),
                    (.128, y * 1.06, .016), (.036, .033, .027), leg_coat, FOOT, False, claws=0)
        o.small_leg(a, 'rear.' + side, (-.135, y * 1.08, .150), (-.085, y * 1.16, .086), (-.140, y * 1.16, .036),
                    (-.085, y * 1.16, .012), (.052, .040, .029), leg_coat, FOOT, True, claws=0)

    def tail_coat(p):
        u = (-.205 - p.x) / .247
        if u > .88:
            return RING
        ring = math.sin((u - .06) * 2 * math.pi * 5.2) > .05
        band = o.mix(BAND, GREY, .35 * o.speckle(p))
        return RING if ring and u > .04 else band

    a.fur(dense(TAIL, 30), tail_coat, o.near(a, ['tail', 'spine']), 14, .16)

    def animate(rig):
        c.animate(a, rig, stride=.085, lift=.028)
    o.finish(a, c, output, animate)


if __name__ == '__main__':
    cli(ID, build)
