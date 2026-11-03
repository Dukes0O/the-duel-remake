"""Summit Run yellow-bellied marmot: an original recipe with its own rig.

A chunky ground squirrel about 0.5 m nose to rump: a broad rump tapering to
the shoulders, a distinct short neck, a broad flat head with small round
ears, short visible forelegs with pale claws, and a short bushy tail of fur
(not a paddle). Grizzled dark brown back with buff hair tips, yellow-orange
belly and flanks, a pale band across the nose, pale muzzle, buff cheeks.
The outline is left unsmoothed and uneven so it reads as fur.
Idle and Walk use the shared quadruped animation in common.py.
Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'yellow-bellied-marmot'
BACK = (.070, .054, .039)
BUFF = (.30, .25, .16)
YELLOW = (.36, .20, .060)
HEAD = (.040, .029, .020)
PALE = (.34, .32, .28)
TAIL = (.090, .052, .030)
FOOT = (.034, .026, .019)
CLAW = (.22, .19, .15)

BODY = [((-.255, 0, .140), .030, .030), ((-.240, 0, .142), .090, .066), ((-.205, 0, .146), .130, .090),
        ((-.160, 0, .148), .148, .098), ((-.110, 0, .146), .150, .097), ((-.060, 0, .142), .140, .090),
        ((-.010, 0, .138), .126, .084), ((.040, 0, .136), .110, .076), ((.085, 0, .138), .094, .066),
        ((.125, 0, .144), .078, .064), ((.155, 0, .150), .066, .056)]


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('spine', (-.18, 0, .145), (.10, 0, .14), 'root')
    a.bone('neck', (.10, 0, .14), (.17, 0, .155), 'spine')
    a.bone('head', (.17, 0, .155), (.30, 0, .135), 'neck')
    a.bone('tail', (-.23, 0, .152), (-.40, 0, .172), 'spine')

    def grizzle(p):
        colour = o.mix(BACK, (.095, .072, .050), .5 * o.mottle(p, 2.0))
        return o.mix(colour, BUFF, .7 * o.speckle(p) ** 2)

    def coat(p):
        # Yellow-orange underneath and up the flanks, with a ragged edge.
        edge = .118 + .012 * (o.mottle(p, 3.0) - .5)
        return o.mix(o.mix(YELLOW, (.30, .17, .05), o.mottle(p, 2.5)), grizzle(p), o.smooth((p.z - edge) / .03))

    body = o.near(a, ['spine', 'neck', 'tail'])
    a.fur(BODY, coat, body, 28, .10)

    def head_coat(p):
        if p.x > .292:
            return (.012, .010, .009)                   # nose
        if p.x > .268:
            return PALE                                 # muzzle
        if .244 < p.x < .258 and p.z > .150:
            return o.mix(PALE, (.5, .48, .44), .4)      # pale band across the nose
        if p.z < .128 or abs(p.y) > .060:
            return o.mix(YELLOW, BUFF, .5)              # cheeks and chin
        return o.mix(HEAD, BUFF, .35 * o.speckle(p) ** 2)
    # Short distinct neck, then a broad flat head.
    a.fur([((.140, 0, .148), .070, .058), ((.165, 0, .152), .064, .054), ((.190, 0, .156), .076, .056),
           ((.215, 0, .157), .080, .054), ((.245, 0, .152), .066, .044), ((.270, 0, .144), .046, .034),
           ((.290, 0, .138), .030, .024), ((.300, 0, .135), .010, .009)], head_coat, 'head', 24, .05)
    for s in (1, -1):
        a.oval((.236, s * .050, .166), (.006, .004, .005), (.008, .007, .006), 'head', 3, 6)
        a.oval((.188, s * .060, .190), (.010, .009, .012), HEAD, 'head', 3, 8)
    for side, s in (('L', 1), ('R', -1)):
        y = s * .072
        o.small_leg(a, 'front.' + side, (.075, y, .105), (.100, y * 1.12, .060), (.108, y * 1.12, .020),
                    (.138, y * 1.12, .017), (.032, .025, .018), lambda p: o.mix(YELLOW, FOOT, .45), FOOT, False)
        o.small_leg(a, 'rear.' + side, (-.150, y * 1.15, .110), (-.105, y * 1.25, .060), (-.150, y * 1.25, .020),
                    (-.105, y * 1.25, .009), (.050, .034, .021), lambda p: o.mix(BACK, FOOT, .5), FOOT, True)
        # Pale claws, longer than the shared legs give.
        for k in (-1, 0, 1):
            start = Vector((.142, y * 1.12 + k * .009, .016))
            a.tube3([start, start + Vector((.020, k * .003, -.007))], [.0035, .0006], CLAW, 'front.' + side + '.foot', 3)
    # Short bushy tail of ragged fur, carried out and a little up.
    tail = o.near(a, ['tail', 'spine'])
    a.fur([((-.225, 0, .150), .016, .016), ((-.255, 0, .162), .022, .022), ((-.285, 0, .171), .026, .026),
           ((-.315, 0, .177), .028, .028), ((-.345, 0, .179), .028, .027), ((-.370, 0, .177), .025, .024),
           ((-.392, 0, .172), .018, .017), ((-.405, 0, .169), .006, .006)],
          lambda p: o.mix(o.mix(TAIL, BUFF, .55 * o.speckle(p) ** 2), (.03, .022, .016), o.smooth((-p.x - .37) / .03)),
          tail, 14, .28)

    def animate(rig):
        c.animate(a, rig, stride=.075, lift=.025)
    o.finish(a, c, output, animate)


if __name__ == '__main__':
    cli(ID, build)
