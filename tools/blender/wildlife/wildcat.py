"""Europe wildcat: an original recipe built as a cat, with its own rig.

About 0.35 m at the shoulder and 0.58 m nose to rump: compact and muscular,
a little heavier than a house cat, a level back on shorter legs, a broad
round head with a short muzzle and small rounded ears, and a short thick
tail with three to four clear black rings and a blunt black tip. Clear
grey-brown tabby coat: dark stripes across the flanks and legs, a dark line
down the spine, a paler belly, a pale muzzle and chin. The cougar's lessons
kept: a round head, small rounded ears, broad paws and a rope of a tail.
Idle and Walk use the shared quadruped animation in common.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'wildcat'
TABBY = (.135, .110, .078)
WARM = (.165, .125, .080)
DARK = (.016, .013, .010)
PALE = (.36, .32, .26)
NOSE = (.16, .08, .07)


def dense(sections, n):
    """Resample loft sections to n evenly spaced rings.

    Markings are painted per vertex, so stripes about 10 cm apart need rings
    closer than that to show at all.
    """
    from mathutils import Vector
    out = []
    for k in range(n):
        t = k / (n - 1) * (len(sections) - 1)
        i = min(int(t), len(sections) - 2)
        f = t - i
        (c0, w0, h0), (c1, w1, h1) = sections[i], sections[i + 1]
        out.append((tuple(Vector(c0).lerp(Vector(c1), f)), w0 + (w1 - w0) * f, h0 + (h1 - h0) * f))
    return out


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('spine', (-.22, 0, .275), (.16, 0, .285), 'root')
    a.bone('neck', (.16, 0, .285), (.24, 0, .33), 'spine')
    a.bone('head', (.24, 0, .33), (.35, 0, .31), 'neck')
    a.bone('tail', (-.26, 0, .285), (-.52, 0, .205), 'spine')

    def tabby(p):
        colour = o.mix(TABBY, WARM, .5 * o.mottle(p, 3.0))
        return o.mix(colour, PALE, .35 * o.speckle(p) ** 2)

    def coat(p):
        colour = tabby(p)
        side = abs(p.y)
        # Dark stripes across the flanks, slightly wavy, fading on the belly.
        stripe = math.sin(p.x * 62 + math.sin(p.z * 30) * 1.4) > .35 and side > .035 and p.z > .215
        colour = o.mix(colour, DARK, .85 if stripe else 0)
        # Dark line down the spine.
        colour = o.mix(colour, DARK, o.smooth((.016 - side) / .008) * o.smooth((p.z - .352) / .01))
        return o.mix(colour, PALE, o.smooth((.215 - p.z) / .02))

    body = o.near(a, ['spine', 'neck', 'tail'])
    # Smooth, with a deeper chest; many sides so no flat planes show.
    a.fur(dense([((-.27, 0, .285), .030, .030), ((-.25, 0, .285), .072, .074), ((-.19, 0, .281), .092, .092),
                 ((-.10, 0, .277), .094, .092), ((-.01, 0, .275), .092, .096), ((.07, 0, .276), .094, .104),
                 ((.14, 0, .286), .086, .096), ((.19, 0, .302), .068, .074), ((.22, 0, .315), .058, .062)], 34),
          coat, body, 26, .018)

    def head_coat(p):
        d = Vector((p.x - .29, p.y, p.z - .335))
        if d.x > .055:
            return NOSE if abs(d.y) < .010 and d.z > -.012 else PALE      # pink-brown nose, pale muzzle
        if d.z < -.028:
            return PALE                                                    # chin and throat
        # Dark lines over the crown and from the eyes back across the cheeks.
        crown = math.sin(p.y * 160) > .45 and d.z > .025
        cheek = abs(d.z + .005 - .25 * abs(d.y)) < .006 and abs(d.y) > .035
        return o.mix(tabby(p), DARK, .8 if crown or cheek else 0)
    # Broad round head with a short muzzle.
    a.fur(dense([((.215, 0, .335), .052, .050), ((.245, 0, .338), .074, .068), ((.282, 0, .338), .080, .072),
                 ((.315, 0, .331), .066, .058), ((.338, 0, .322), .045, .040), ((.352, 0, .316), .026, .023),
                 ((.358, 0, .314), .008, .008)], 14), head_coat, 'head', 20, .015)
    for s in (1, -1):
        a.oval((.320, s * .030, .346), (.008, .005, .007), (.10, .09, .02), 'head', 3, 8)      # amber eye
        a.oval((.322, s * .031, .346), (.004, .006, .006), (.006, .005, .004), 'head', 2, 6)   # pupil
        # Small rounded ears, set wide.
        ear = lambda p: o.mix(TABBY, DARK, .4)
        a.blade([((.272, s * .040, .382), (.252, s * .070, .376), .010, (1, 0, 0)),
                 ((.268, s * .050, .402), (.255, s * .072, .396), .007, (1, 0, 0)),
                 ((.263, s * .061, .413), (.258, s * .067, .411), .003, (1, 0, 0))], ear, 'head')
    for side, s in (('L', 1), ('R', -1)):
        y = s * .050

        def legs(p):
            bars = math.sin(p.z * 75) > .45 and p.z > .07
            return o.mix(tabby(p), DARK, .75 if bars else 0)
        cat_leg(a, o, 'front.' + side, Vector((.13, y * .85, .25)), Vector((.115, y * 1.05, .15)),
                Vector((.135, y * 1.05, .040)), Vector((.160, y * 1.05, .012)), (.046, .026, .018), legs, False)
        cat_leg(a, o, 'rear.' + side, Vector((-.17, y * .85, .26)), Vector((-.11, y * 1.1, .165)),
                Vector((-.21, y * 1.1, .065)), Vector((-.175, y * 1.1, .012)), (.060, .028, .019), legs, True)
    # Short thick tail of even width, ringed, ending in a blunt black tip.
    tail = o.near(a, ['tail', 'spine'])

    def tail_coat(p):
        u = (-.25 - p.x) / .27
        if u > .80:
            return DARK
        ring = u > .25 and math.sin((u - .25) * 2 * math.pi / .16) > .1
        return o.mix(tabby(p), DARK, .9 if ring else 0)
    # The root sits wide inside the rump so the tail grows out of it smoothly.
    a.fur(dense([((-.21, 0, .285), .050, .052), ((-.26, 0, .284), .040, .040), ((-.31, 0, .278), .037, .037), ((-.36, 0, .267), .038, .038),
                 ((-.42, 0, .247), .038, .038), ((-.48, 0, .223), .036, .036), ((-.515, 0, .207), .030, .030),
                 ((-.525, 0, .203), .012, .012)], 18), tail_coat, tail, 14, .08)

    def animate(rig):
        c.animate(a, rig, stride=.10, lift=.04)
    o.finish(a, c, output, animate)


def cat_leg(a, o, name, hip, joint, ankle, toe, radii, colour, hind):
    """A cat's leg: a thick upper leg rising out of the body with no seam, a
    defined elbow or hock, a slimmer lower leg and a round paw.

    Registers the bones and leg entry the shared walk in common.animate uses.
    """
    from mathutils import Vector
    a.bone(name + '.upper', tuple(hip), tuple(joint), 'spine')
    a.bone(name + '.lower', tuple(joint), tuple(ankle), name + '.upper')
    a.bone(name + '.foot', tuple(ankle), tuple(toe), name + '.lower')
    a.legs.append((name, tuple(hip), tuple(joint), tuple(ankle), tuple(toe), hind))
    upper = o.near(a, [name + '.upper', name + '.lower', 'spine'])
    # The top closes in a dome inside the body, so no flat end shows.
    top = hip + Vector((0, 0, .055))
    a.fur([(tuple(top + Vector((0, 0, .05))), .006, .006), (tuple(top + Vector((0, 0, .028))), radii[0] * .70, radii[0] * .85),
           (tuple(top), radii[0] * .95, radii[0] * 1.2), (tuple(hip), radii[0], radii[0] * 1.15),
           (tuple(hip.lerp(joint, .5)), radii[0] * .78, radii[0] * .88),
           (tuple(joint), radii[1] * 1.25, radii[1] * 1.35), (tuple(joint + Vector((0, 0, -.012))), radii[1] * .85, radii[1] * .9),
           (tuple(joint + Vector((0, 0, -.020))), .003, .003)], colour, upper, 14, .02)
    lower = o.near(a, [name + '.lower', name + '.foot', name + '.upper'])
    a.tube3([joint, joint.lerp(ankle, .5), ankle], [radii[1] * 1.15, radii[1] * .85, radii[2]], colour, lower, 10)
    paw = o.near(a, [name + '.foot', name + '.lower'])
    centre = Vector((toe.x - .006, toe.y, .016))
    a.tube3([ankle, centre + Vector((-.008, 0, .010))], [radii[2], radii[2] * 1.05], colour, paw, 10)
    a.oval(tuple(centre), (.024, .020, .016), o.mix(TABBY, PALE, .3), paw, 5, 12)


if __name__ == '__main__':
    cli(ID, build)
