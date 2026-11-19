"""Wasteland town chicken: an original recipe with its own rig.

A thin, long-legged village hen of the gamey kind kept on poor farms (the
reference photograph in waste-references.json), about 0.42 m to the top of
the head: a narrow body carried tipped up at the breast, a long upright
neck, a small head with a bare red face, a low red comb and small wattles,
a horn-coloured bill, a tail held as an upright folded fan, wings folded on
the flanks, feathered thighs and long bare yellow-grey shanks with three
toes forward and one back. Blackish plumage with rusty brown hackles and
wing bows, dusty on the breast and legs.
Idle: looks about, then tips forward and pecks the ground twice.
Walk: steps in place with the hen's head-bob. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'chicken'
BLACKISH = (.022, .018, .016)
RUST = (.190, .078, .028)
DUST = (.27, .21, .15)
RED = (.24, .028, .024)
SHANK = (.34, .26, .12)
BILL = (.30, .23, .12)
HIP = (-.012, .200)
LEGS = {}


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .04))
    # The body turns about the hips, so the legs can stand while it pecks.
    a.bone('body', (HIP[0], 0, HIP[1]), (.085, 0, .245), 'root')
    a.bone('neck1', (.082, 0, .250), (.104, 0, .315), 'body')
    a.bone('neck2', (.104, 0, .315), (.122, 0, .368), 'neck1')
    a.bone('head', (.122, 0, .368), (.182, 0, .366), 'neck2')
    a.bone('tail', (-.105, 0, .250), (-.190, 0, .300), 'body')
    for s, side in ((1, 'L'), (-1, 'R')):
        y = s * .036
        hip, hock, foot, toe = (HIP[0], y, HIP[1]), (-.042, y, .104), (-.004, y, .014), (.050, y, .006)
        a.bone('thigh.' + side, hip, hock, 'root')
        a.bone('shank.' + side, hock, foot, 'thigh.' + side)
        a.bone('foot.' + side, foot, toe, 'shank.' + side)
        LEGS[side] = [Vector(p) for p in (hip, hock, foot, toe)]

    def plumage(p):
        colour = o.mix(BLACKISH, RUST, .26 * o.mottle(p, 2.5) + .22 * o.speckle(p) ** 2)
        # Dust on the breast, the belly and the thighs.
        return o.mix(colour, DUST, .28 * o.smooth((.200 - p.z) / .08))

    def hackle(p):
        # Rusty-gold streaked neck feathers falling over the shoulders.
        gold = o.mix(RUST, (.30, .16, .055), o.speckle(p))
        return o.mix(plumage(p), gold, .80 * o.smooth((p.z - .235) / .04) * o.smooth((p.x - .03) / .04))

    body = o.near(a, ['body', 'tail', 'neck1'])
    a.fur([((-.128, 0, .252), .016, .020), ((-.100, 0, .244), .044, .050), ((-.052, 0, .230), .060, .066),
           ((.000, 0, .222), .064, .072), ((.045, 0, .226), .059, .069), ((.080, 0, .240), .046, .055),
           ((.100, 0, .262), .030, .036)], hackle, body, 14, .035)
    # A cape of hackles wide on the shoulders, narrowing up a gently curved neck.
    neck = o.near(a, ['neck1', 'neck2', 'body', 'head'])
    a.fur([((.058, 0, .236), .050, .050), ((.080, 0, .272), .035, .036), ((.098, 0, .306), .0245, .026),
           ((.112, 0, .336), .0195, .0205), ((.121, 0, .360), .0172, .018), ((.127, 0, .378), .0160, .017)],
          hackle, neck, 12, .06)

    head_at = Vector((.135, 0, .380))

    def face(p):
        # Bare red skin round the eye and under the bill; a feathered crown and nape.
        bare = o.smooth((p.x - head_at.x - .002) / .008) * o.smooth((head_at.z + .012 - p.z) / .008)
        return o.mix(hackle(p), RED, bare)
    a.oval(tuple(head_at), (.030, .0215, .0240), face, 'head', 6, 12)
    a.loft([((.155, 0, .379), .0095, .0105), ((.169, 0, .376), .0065, .0070), ((.181, 0, .372), .0030, .0034),
            ((.188, 0, .369), .0008, .0008)], BILL, 'head', 8)
    # Low single comb and two small wattles.
    comb = [((.124 + .009 * k, 0, .399 + (.004, .010, .009, .010, .003)[k]), (.124 + .009 * k, 0, .394), .003, (0, 1, 0))
            for k in range(5)]
    a.blade(comb, RED, 'head')
    for s in (1, -1):
        a.oval((.156, s * .006, .361), (.006, .003, .008), RED, 'head', 3, 6)
        a.oval((.147, s * .019, .385), (.0045, .0025, .0045), (.006, .005, .004), 'head', 3, 6)

    # Tail: six long feathers fanned in an upright tent from the rump.
    def tail_colour(p):
        return o.mix((.016, .015, .016), BLACKISH, o.mottle(p, 5))
    rump = Vector((-.104, 0, .247))
    for k in range(6):
        angle = math.radians(52 - 8.5 * k)
        along = Vector((-math.cos(angle), 0, math.sin(angle)))
        across = Vector((math.sin(angle), 0, math.cos(angle)))
        length = .112 - .009 * abs(k - 1.5)
        lean = (.007 if k % 2 else -.007)
        feather = []
        for t, wide in ((0, .30), (.35, .95), (.75, 1.0), (.93, .62), (1, .12)):
            mid = rump + along * length * t + Vector((0, lean * (.4 + t), 0))
            feather.append((tuple(mid + across * .021 * wide), tuple(mid - across * .021 * wide), .0035, (0, 1, 0)))
        a.blade(feather, tail_colour, o.near(a, ['tail', 'body']))

    def wing(p):
        bow = o.smooth((p.x - .0) / .05) * o.smooth((p.z - .225) / .03)
        bars = .5 + .5 * math.sin(p.x * 150 + p.z * 60)
        # The body's own plumage, barred, with a rusty bow at the shoulder: no hard-edged shield.
        return o.mix(o.mix(plumage(p), (.012, .011, .011), .45 * bars), RUST, .75 * bow)
    for s, side in ((1, 'L'), (-1, 'R')):
        # Folded wing lying on the flank, tips crossing towards the tail.
        a.loft([((.070, s * .050, .250), .004, .012), ((.040, s * .060, .240), .010, .038),
                ((-.020, s * .062, .232), .011, .044), ((-.075, s * .051, .232), .009, .032),
                ((-.118, s * .034, .238), .005, .014)], wing, 'body', 10)
        y = s * .036
        thigh = o.near(a, ['thigh.' + side, 'body', 'shank.' + side])
        # A cone of thigh feathers that starts wide inside the belly and narrows to the hock.
        a.tube3([(HIP[0] + .014, y * .9, HIP[1] + .022), (-.014, y, .176), (-.030, y, .138), (-.042, y, .104)],
                [.044, .036, .021, .0090], plumage, thigh, 8)
        shank = o.near(a, ['shank.' + side, 'foot.' + side, 'thigh.' + side])
        a.tube3([(-.042, y, .108), (-.022, y, .058), (-.004, y, .016)], [.0085, .0068, .0072],
                lambda p: o.mix(SHANK, DUST, .35 * o.mottle(p, 6)), shank, 6)
        for angle, length in ((0, .055), (32, .045), (-32, .045), (180, .020)):
            d = Vector((math.cos(math.radians(angle)), s * math.sin(math.radians(angle)), 0))
            end = Vector((-.004, y, .004)) + d * length
            a.tube3([(-.004, y, .014), Vector((-.004, y, .010)) + d * length * .5, end], [.0062, .0048, .0016],
                    SHANK, 'foot.' + side, 4)

    o.finish(a, c, output, [('Idle', 150, idle), ('Walk', 24, walk)], budget=2000, refine=1950,
             roughness=1, specular=.25)


def stand(obj, side, foot_at, toe_lift=0):
    """Plant one leg's foot at foot_at (XZ plane) by its hock, which bends backwards."""
    import original as o
    from mathutils import Vector
    hip, hock, foot, toe = LEGS[side]
    l1, l2 = (hock - hip).length, (foot - hock).length
    h = Vector((hip.x, 0, hip.z))
    new_hock = o.two_bone(h, foot_at, l1, l2, False)
    d_thigh = o.angle_down(new_hock - h) - o.angle_down(hock - hip)
    d_shank = o.angle_down(foot_at - new_hock) - o.angle_down(foot - hock)
    o.plane_rotate(obj, 'thigh.' + side, d_thigh)
    o.plane_rotate(obj, 'shank.' + side, d_shank - d_thigh)
    o.plane_rotate(obj, 'foot.' + side, -d_shank - toe_lift)


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Two pecks between .56 and .86 of the loop; alert and looking about before.
    peck = 0
    for start in (.56, .72):
        u = (t - start) / .14
        if 0 < u < 1:
            peck = math.sin(math.pi * u) ** .7
    look = 1 - peck
    o.turn(obj, 'body', .78 * peck)
    o.turn(obj, 'neck1', .55 * peck)
    o.turn(obj, 'neck2', .50 * peck)
    o.turn(obj, 'head', .42 * peck)
    o.turn(obj, 'tail', -.30 * peck)
    o.turn(obj, 'head', look * .60 * math.sin(w * 2) ** 3, (0, 0, 1))
    o.turn(obj, 'neck2', look * .10 * math.sin(w * 3 + 1))
    o.turn(obj, 'head', look * .22 * math.sin(w * 4) ** 5, (1, 0, 0))
    o.turn(obj, 'tail', .06 * math.sin(w * 5))
    o.stretch(obj, 'body', (1 + .012 * math.sin(6 * w), 1, 1 + .012 * math.sin(6 * w)))


def walk(obj, t):
    import original as o
    from mathutils import Vector
    w = 2 * math.pi * t
    stride, lift = .085, .034
    for side, offset in (('L', 0), ('R', .5)):
        hip, hock, foot, toe = LEGS[side]
        phase = (t + offset) % 1
        if phase < .58:
            dx, dz, curl = stride * (.5 - phase / .58), 0, 0
        else:
            u = (phase - .58) / .42
            dx, dz, curl = stride * (-.5 + u), lift * math.sin(math.pi * u), .7 * math.sin(math.pi * u)
        stand(obj, side, Vector((foot.x + dx, 0, foot.z + dz)), curl)
    # The head is thrust forward and then held while the body catches up.
    bob = math.sin(2 * w)
    o.turn(obj, 'neck1', .16 * bob)
    o.turn(obj, 'neck2', -.10 * bob)
    o.turn(obj, 'head', -.06 * bob)
    o.turn(obj, 'body', .05 + .025 * math.sin(2 * w + .6))
    o.turn(obj, 'body', .045 * math.sin(w), (1, 0, 0))
    o.turn(obj, 'tail', .05 * math.sin(2 * w + 1.2))


if __name__ == '__main__':
    cli(ID, build)
