"""Greater roadrunner: an original recipe with its own rig.

A ground cuckoo of the desert, about 0.56 m from bill tip to tail tip and
0.28 m to the top of the head: a slim body on long pale legs, a long neck
carried forward and up, a heavy straight bill with a small hook, a shaggy
dark crest that rises and falls, and a tail as long as the body, narrow,
held cocked up when it stands. Dark brown above and on the neck, boldly
streaked with buff and white; the belly plain pale buff; a bare patch
behind the eye, pale blue then orange; the tail dark with white edges and
white tips; two toes forward and two back (the reference photographs in
desert-references.json).
Idle: stands, looks about, raises and drops the crest, pumps the tail.
Run: head, body and tail in one level line, long strides.
It runs; it has no flight loop. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'roadrunner'
DARK = (.030, .024, .018)
BRONZE = (.075, .058, .036)
BUFF = (.40, .32, .20)
PALE = (.50, .45, .34)
WHITE = (.62, .60, .54)
BILL = (.085, .078, .070)
SHANK = (.34, .36, .37)
BLUE = (.42, .50, .58)
ORANGE = (.55, .20, .05)
HIP = (-.015, .150)
SIDES = 16
LEGS = {}

# (x, z, half width, half height) of the body from the rump to the breast.
BODY = [(-.112, .168, .010, .012), (-.100, .167, .022, .025), (-.082, .165, .031, .035), (-.062, .164, .036, .041),
        (-.040, .164, .039, .044), (-.018, .166, .040, .046), (.004, .169, .040, .046), (.026, .174, .038, .044),
        (.046, .180, .034, .040), (.062, .187, .029, .034), (.076, .195, .023, .027), (.086, .203, .017, .020)]
NECK = [(.066, .192, .026, .028), (.078, .206, .0215, .0225), (.090, .221, .0180, .0185), (.102, .236, .0160, .0165),
        (.113, .250, .0150, .0155), (.123, .262, .0150, .0160)]


def frames(rows):
    """Each ring of a loft as original.Body.fur lays it: centre, tangent, the ring's own up, half width, half height."""
    from mathutils import Vector
    points = [Vector((x, 0, z)) for x, z, *_ in rows]
    out = []
    for i, centre in enumerate(points):
        tangent = (points[min(i + 1, len(points) - 1)] - points[max(0, i - 1)]).normalized()
        out.append((centre, tangent, tangent.cross(Vector((0, 1, 0))).normalized(), rows[i][2], rows[i][3]))
    return out


def column(p, rings, sides):
    """The ring and the column of the loft a vertex is in, and how far up it is (-1 belly .. 1 back)."""
    i = min(range(len(rings)), key=lambda k: abs((p - rings[k][0]).dot(rings[k][1])))
    centre, tangent, up, w, h = rings[i]
    ang = math.atan2((p - centre).dot(up) / h, p.y / w)
    return i, round(ang / (2 * math.pi / sides)) % sides, math.sin(ang)


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .04))
    a.bone('body', (HIP[0], 0, HIP[1]), (.070, 0, .192), 'root')
    a.bone('neck1', (.066, 0, .192), (.096, 0, .229), 'body')
    a.bone('neck2', (.096, 0, .229), (.126, 0, .266), 'neck1')
    a.bone('head', (.126, 0, .266), (.200, 0, .268), 'neck2')
    a.bone('crest', (.132, 0, .286), (.100, 0, .312), 'head')
    a.bone('tail1', (-.100, 0, .168), (-.205, 0, .246), 'body')
    a.bone('tail2', (-.205, 0, .246), (-.320, 0, .330), 'tail1')
    for s, side in ((1, 'L'), (-1, 'R')):
        y = s * .027
        hip, hock, foot, toe = (HIP[0], y, HIP[1]), (-.050, y, .083), (-.006, y, .012), (.040, y, .005)
        a.bone('thigh.' + side, hip, hock, 'root')
        a.bone('shank.' + side, hock, foot, 'thigh.' + side)
        a.bone('foot.' + side, foot, toe, 'shank.' + side)
        LEGS[side] = [Vector(p) for p in (hip, hock, foot, toe)]

    body_rings, neck_rings = frames(BODY), frames(NECK)

    def body(p):
        # Buff under the streaks on the back, paler on the breast, plain pale on the belly and vent.
        i, j, up = column(p, body_rings, SIDES)
        return o.mix(PALE, o.mix(BUFF, BRONZE, .25), o.smooth((up + .15) / .5))

    def body_marks(p):
        # Dark streaks: heavy on the back, finer on the breast, none on the belly behind it.
        i, j, up = column(p, body_rings, SIDES)
        plain = o.smooth((-up - .30) / .3) * o.smooth((.052 - p.x) / .03)
        return o.mix(BRONZE, DARK, o.smooth((up + .2) / .5)) + ((.80 + .20 * o.smooth(up / .4)) * (1 - plain),)

    def neck(p):
        return o.mix(PALE, BUFF, .5 * o.smooth((column(p, neck_rings, 12)[2] + .2) / .6))

    trunk = o.near(a, ['body', 'tail1', 'neck1'])
    a.mark = body_marks
    a.fur([((x, 0, z), w, h) for x, z, w, h in BODY], body, trunk, SIDES, .03)
    a.mark = lambda p: o.mix(BRONZE, DARK, .6) + (.85,)
    a.fur([((x, 0, z), w, h) for x, z, w, h in NECK], neck, o.near(a, ['neck1', 'neck2', 'body', 'head']), 12, .04)

    head_at = Vector((.140, 0, .272))

    def face(p):
        # Dark streaked crown, a pale brow and cheek, a pale throat.
        d = p - head_at
        crown = o.smooth((d.z - .006) / .006)
        throat = o.smooth((-d.z - .004) / .008)
        colour = o.mix(o.mix(BUFF, PALE, .5), DARK, crown)
        return o.mix(colour, WHITE, .8 * throat)
    a.mark = lambda p: BRONZE + (.75 * o.smooth((p.z - head_at.z - .006) / .006),)        # bronze flecks in the dark crown
    a.oval(tuple(head_at), (.030, .0185, .0195), face, 'head', 6, 12)
    a.mark = None
    # Heavy bill, straight along the top, the tip hooked down.
    a.loft([((.160, 0, .2715), .0090, .0100), ((.176, 0, .2710), .0072, .0082), ((.192, 0, .2700), .0052, .0060),
            ((.205, 0, .2680), .0030, .0036), ((.212, 0, .2645), .0008, .0010)], BILL, 'head', 8)
    for s in (1, -1):
        a.oval((.150, s * .0165, .2765), (.0042, .0022, .0042), (.006, .005, .004), 'head', 3, 6)       # eye
        a.oval((.141, s * .0172, .2770), (.0055, .0016, .0034), BLUE, 'head', 3, 6)                     # bare skin, pale blue
        a.oval((.132, s * .0168, .2772), (.0045, .0016, .0030), ORANGE, 'head', 3, 6)                   # then orange
    # The crest: loose dark feathers from the forehead to the nape, flecked with bronze.
    a.mark = lambda p: BRONZE + (.7,)
    for k in range(9):
        t = k / 8
        base = Vector((.160 - .040 * t, (.005 if k % 2 else -.005), .287 - .004 * t * t))
        lean = math.radians(118 + 34 * t)
        length = .024 + .020 * math.sin(math.pi * (.25 + .6 * t))
        tip = base + Vector((math.cos(lean), 0, math.sin(lean))) * length
        across = Vector((0, 1, 0))
        a.blade([(tuple(base + across * .0085), tuple(base - across * .0085), .0050, (1, 0, 0)),
                 (tuple(tip + across * .0030), tuple(tip - across * .0030), .0014, (1, 0, 0))],
                DARK, o.near(a, ['crest', 'head']))
    a.mark = None

    # Tail: long narrow feathers, a little spread, dark bronze with white edges and white tips.
    rump, tip_at = Vector((-.098, 0, .170)), Vector((-.320, 0, .330))
    along = (tip_at - rump).normalized()
    reach = (tip_at - rump).length

    def tail_colour(p):
        t = (Vector(p) - rump).dot(along) / reach
        # Dark bronze, glossed a little; all but the middle feather are tipped white.
        colour = o.mix(o.mix(DARK, BRONZE, .6), DARK, o.mottle(p, 6))
        return o.mix(colour, WHITE, o.smooth((t - .92) / .04) * (abs(p.y) > .008))
    for k in range(5):
        spread = (k - 2) * .0085
        length = reach * (1 - .10 * abs(k - 2))
        feather = []
        # The feathers lie as a tent, the outer ones sloping down, so the tail has depth from the side.
        roll = math.radians(34 * (k - 2))
        across = Vector((0, math.cos(roll), -math.sin(roll)))
        normal = Vector((0, math.sin(roll), math.cos(roll)))
        for t, wide in ((0, .5), (.30, .9), (.70, 1.0), (1, .55)):
            mid = rump + along * length * t + Vector((0, spread * (1 + 1.6 * t), -.0045 * abs(k - 2) * (.5 + t)))
            feather.append((tuple(mid + across * .0125 * wide), tuple(mid - across * .0125 * wide), .0022, tuple(normal)))
        a.blade(feather, tail_colour, o.near(a, ['tail1', 'tail2', 'body']))

    def wing(p):
        # Dark bronze feathers; their white edges are the fine marks.
        return o.mix(DARK, BRONZE, .55 * o.mottle(p, 6))
    FOLD = [(.050, .034, .190, .003, .010), (.034, .0405, .184, .007, .024), (.012, .0425, .180, .008, .030),
            (-.012, .0425, .177, .008, .032), (-.036, .0410, .175, .008, .030), (-.060, .0370, .174, .007, .026),
            (-.086, .0290, .174, .005, .018), (-.112, .0180, .177, .003, .008)]
    for s, side in ((1, 'L'), (-1, 'R')):
        # The folded wing on the flank, its tip lying over the root of the tail.
        a.mark = lambda p: o.mix(WHITE, BUFF, .35) + (.9,)
        a.loft([((x, s * y, z), w, h) for (x, y, z, w, h) in FOLD], wing, 'body', 8)
        a.mark = None
        y = s * .027
        thigh = o.near(a, ['thigh.' + side, 'body', 'shank.' + side])
        a.tube3([(HIP[0] + .008, y * .9, HIP[1] + .010), (-.024, y, .128), (-.038, y, .104), (-.050, y, .083)],
                [.028, .021, .0115, .0060], lambda p: o.mix(PALE, BUFF, .5 * o.mottle(p, 6)), thigh, 8)
        shank = o.near(a, ['shank.' + side, 'foot.' + side, 'thigh.' + side])
        a.tube3([(-.050, y, .086), (-.028, y, .048), (-.006, y, .013)], [.0058, .0046, .0050],
                lambda p: o.mix(SHANK, PALE, .3 * o.mottle(p, 9)), shank, 6)
        # Two toes forward and two back: the roadrunner's X-shaped track.
        for angle, length in ((14, .046), (-20, .040), (160, .030), (-164, .034)):
            d = Vector((math.cos(math.radians(angle)), s * math.sin(math.radians(angle)), 0))
            end = Vector((-.006, y, .0035)) + d * length
            a.tube3([(-.006, y, .012), Vector((-.006, y, .008)) + d * length * .5, end], [.0044, .0034, .0012],
                    SHANK, 'foot.' + side, 3)

    o.finish(a, c, output, [('Idle', 150, idle), ('Run', 12, run)], budget=2000, roughness=1, specular=.3)


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
    # The crest goes up twice in the loop; the tail drops slowly and flicks back up after each.
    alert = max(0, math.sin(w * 2)) ** 2
    o.turn(obj, 'crest', .25 * alert - .50 * (1 - alert))     # flat on the nape between times
    pump = (t * 2) % 1
    o.turn(obj, 'tail1', -.42 * pump ** 2)
    o.turn(obj, 'tail2', -.16 * pump ** 2)
    o.turn(obj, 'head', .55 * math.sin(w) ** 3, (0, 0, 1))
    o.turn(obj, 'neck2', .10 * math.sin(w * 3 + 1))
    o.turn(obj, 'head', .12 * math.sin(w * 4) ** 5, (1, 0, 0))
    o.turn(obj, 'neck1', .06 * math.sin(w * 2))
    o.stretch(obj, 'body', (1 + .012 * math.sin(6 * w), 1, 1 + .012 * math.sin(6 * w)))


def run(obj, t):
    import original as o
    from mathutils import Vector
    w = 2 * math.pi * t
    stride, lift = .150, .050
    bounce = .010 * math.sin(2 * w)
    o.shift(obj, 'root', (0, 0, bounce))
    for side, offset in (('L', 0), ('R', .5)):
        hip, hock, foot, toe = LEGS[side]
        phase = (t + offset) % 1
        if phase < .40:
            dx, dz, curl = stride * (.5 - phase / .40), 0, 0
        else:
            u = (phase - .40) / .60
            dx, dz, curl = stride * (-.5 + u), lift * math.sin(math.pi * u), 1.0 * math.sin(math.pi * u)
        stand(obj, side, Vector((foot.x - .012 + dx, 0, foot.z + dz - bounce)), curl)
    # Head, body and tail in one level line.
    o.turn(obj, 'body', .30 + .03 * math.sin(2 * w + .5))
    o.turn(obj, 'neck1', .44)
    o.turn(obj, 'neck2', .10)
    o.turn(obj, 'head', -.78)
    o.turn(obj, 'crest', -.55)
    o.turn(obj, 'tail1', -.74 + .05 * math.sin(2 * w))
    o.turn(obj, 'tail2', .06 * math.sin(2 * w - 1))
    o.turn(obj, 'body', .04 * math.sin(w), (1, 0, 0))


if __name__ == '__main__':
    cli(ID, build, motion='Run')
