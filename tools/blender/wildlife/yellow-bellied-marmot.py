"""Summit Run yellow-bellied marmot: an original recipe with its own rig.

About 0.5 m nose to rump plus a 0.17 m bushy tail, heavy low body on short
legs, broad flat head with small round ears. Grizzled grey-brown back,
yellow-orange belly, flanks and neck sides, dark brown head with a pale
band across the nose and a pale muzzle, rufous-brown tail, dark feet.
Idle and Walk use the shared quadruped animation in common.py.
Helpers: original.py.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'yellow-bellied-marmot'
BACK = (.080, .064, .047)
YELLOW = (.30, .19, .070)
HEAD = (.035, .026, .019)
PALE = (.30, .29, .26)
TAIL = (.105, .060, .033)
FOOT = (.030, .023, .017)


def build(output, c, cache):
    import original as o
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('spine', (-.17, 0, .14), (.12, 0, .14), 'root')
    a.bone('neck', (.12, 0, .14), (.19, 0, .162), 'spine')
    a.bone('head', (.19, 0, .162), (.31, 0, .14), 'neck')
    a.bone('tail', (-.22, 0, .15), (-.40, 0, .10), 'spine')

    def coat(p):
        # Yellow underneath and up the flanks; grizzled grey-brown on top.
        top = o.smooth((p.z - .13) / .05)
        colour = o.mix(YELLOW, BACK, top)
        # Grizzled: pale buff guard-hair tips scattered over the dark back.
        return o.mix(colour, (.30, .26, .19), top * .55 * o.speckle(p) ** 2)

    body = o.near(a, ['spine', 'neck', 'tail'])
    # Low and heavy: the belly fur nearly brushes the ground and hides the
    # upper legs; the back arches over the hips.
    a.fur([((-.25, 0, .13), .030, .030), ((-.23, 0, .134), .096, .086), ((-.17, 0, .140), .138, .112),
           ((-.10, 0, .140), .142, .112), ((-.02, 0, .134), .128, .104), ((.05, 0, .128), .110, .096),
           ((.11, 0, .132), .092, .084), ((.16, 0, .142), .078, .070), ((.20, 0, .150), .062, .056)],
          coat, body, 20, .12)

    def head_coat(p):
        if p.x > .300:
            return (.012, .010, .009)
        if p.x > .272:
            return PALE                      # muzzle
        if .250 < p.x < .262 and p.z > .158:
            return o.mix(PALE, HEAD, .35)    # pale band between the eyes
        if p.z < .128:
            return o.mix(YELLOW, PALE, .4)   # cheeks and throat
        # Dark crown fading into the grizzled nape.
        return o.mix(o.mix(BACK, (.30, .26, .19), .3 * o.speckle(p) ** 2), HEAD, o.smooth((p.x - .17) / .06))
    a.fur([((.15, 0, .160), .060, .052), ((.19, 0, .165), .074, .048), ((.235, 0, .160), .066, .040),
           ((.27, 0, .150), .050, .033), ((.295, 0, .142), .036, .026), ((.308, 0, .138), .012, .010)],
          head_coat, 'head', 14, .04)
    for s in (1, -1):
        a.oval((.243, s * .050, .170), (.006, .004, .005), (.008, .007, .006), 'head', 4, 8)
        a.oval((.188, s * .058, .192), (.010, .012, .013), HEAD, 'head', 4, 8)
    for side, s in (('L', 1), ('R', -1)):
        y = s * .085
        o.small_leg(a, 'front.' + side, (.09, y, .13), (.11, y * 1.05, .07), (.10, y * 1.05, .022),
                    (.135, y * 1.05, .010), (.040, .030, .021), lambda p: o.mix(YELLOW, FOOT, .6), FOOT, False)
        o.small_leg(a, 'rear.' + side, (-.13, y, .12), (-.09, y * 1.1, .065), (-.14, y * 1.1, .022),
                    (-.095, y * 1.1, .010), (.050, .034, .022), lambda p: o.mix(BACK, FOOT, .5), FOOT, True)
    tail = o.near(a, ['tail', 'spine'])
    a.fur([((-.215, 0, .150), .022, .022), ((-.26, 0, .148), .034, .032), ((-.31, 0, .136), .040, .036),
           ((-.36, 0, .118), .036, .032), ((-.40, 0, .100), .010, .010)],
           lambda p: o.mix(TAIL, (.03, .02, .015), o.smooth((-p.x - .33) / .04)), tail, 10, .18)

    def animate(rig):
        c.animate(a, rig, stride=.09, lift=.03)
    o.finish(a, c, output, animate, refine=4200)


if __name__ == '__main__':
    cli(ID, build)
