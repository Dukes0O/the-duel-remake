"""Black-tailed jackrabbit (Lepus californicus): an original recipe with its own rig.

A desert hare, not a rabbit: about 0.52 m long and lean, standing high on
thin straight forelegs and long folded hind legs, the back arched over the
hips, the head carried up with ears as long as the head and neck together,
cupped, thin enough to glow pink inside, edged white and tipped black. The
coat is grizzled grey-buff, buffer on the sides and neck, white under the
belly; the short tail is black on top (the reference photographs in
desert-references.json).
Idle: stands alert, the ears swivel one after the other, the nose works.
Walk: the hare's bound in place: the hind legs drive, the body stretches
and gathers, the ears lie back. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'jackrabbit'
GREY = (.165, .135, .098)
BUFF = (.310, .215, .115)
WHITE = (.52, .49, .42)
DARK = (.018, .015, .013)
PINK = (.36, .19, .13)
BROWN = (.060, .045, .032)
TOES = []

# (x, z, half width, half height) from the rump to the base of the neck.
TRUNK = [(-.255, .180, .012, .014), (-.238, .193, .040, .046), (-.205, .214, .062, .070), (-.160, .231, .073, .083),
         (-.110, .239, .075, .083), (-.060, .239, .071, .077), (-.010, .234, .065, .071), (.040, .227, .059, .066),
         (.082, .224, .052, .060), (.112, .230, .043, .052), (.134, .246, .034, .042)]
NECK = [(.104, .230, .052, .058), (.124, .254, .046, .050), (.141, .279, .041, .044), (.154, .300, .038, .041)]
HEAD = [(.136, .320, .026, .030), (.160, .335, .037, .041), (.193, .336, .037, .041), (.224, .324, .031, .033),
        (.249, .310, .023, .024), (.263, .300, .014, .015), (.270, .295, .005, .006)]


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .05))
    a.bone('body', (-.060, 0, .225), (.100, 0, .225), 'root')
    a.bone('hips', (-.060, 0, .232), (-.220, 0, .205), 'body')
    a.bone('neck', (.116, 0, .240), (.157, 0, .305), 'body')
    a.bone('head', (.157, 0, .305), (.270, 0, .296), 'neck')
    a.bone('tail', (-.245, 0, .190), (-.292, 0, .128), 'hips')
    for s, side in ((1, 'L'), (-1, 'R')):
        hy, fy = s * .055, s * .034
        a.bone('thigh.' + side, (-.150, hy, .205), (-.062, hy, .118), 'hips')
        a.bone('shin.' + side, (-.062, hy, .118), (-.168, hy, .052), 'thigh.' + side)
        a.bone('foot.' + side, (-.168, hy, .052), (-.038, hy, .007), 'shin.' + side)
        a.bone('upper.' + side, (.098, fy, .190), (.084, fy, .108), 'body')
        a.bone('lower.' + side, (.084, fy, .108), (.096, fy, .026), 'upper.' + side)
        a.bone('paw.' + side, (.096, fy, .026), (.128, fy, .008), 'lower.' + side)
        a.bone('ear.' + side, (.158, s * .021, .368), (.138, s * .046, .508), 'head')
        TOES.extend(['foot.' + side, 'paw.' + side])

    def coat(p, spine_z=.235, half=.08):
        # Grizzled grey along the back, buffer down the sides, white underneath.
        up = (p.z - spine_z) / half
        colour = o.mix(BUFF, GREY, o.smooth((up + .1) / .7))
        colour = o.mix(colour, o.mix(GREY, BROWN, .5), .35 * o.mottle(p, 2.5))
        return o.mix(o.mix(WHITE, BUFF, .15), colour, o.smooth((up + .92) / .45))

    def flecks(p, spine_z=.235, half=.08):
        # Black-tipped guard hairs: the fine dark flecks of an agouti coat, fading out on the belly.
        up = (p.z - spine_z) / half
        return DARK + (.62 * o.smooth((up + .7) / .8),)

    a.mark = flecks
    a.fur([((x, 0, z), w, h) for x, z, w, h in TRUNK], coat, o.near(a, ['body', 'hips', 'neck']), 18, .035)
    a.mark = lambda p: DARK + (.45,)
    a.fur([((x, 0, z), w, h) for x, z, w, h in NECK], lambda p: o.mix(BUFF, GREY, .35 + .3 * o.mottle(p, 3)),
          o.near(a, ['neck', 'head', 'body']), 14, .03)

    def face(p):
        # Grey-buff face, whitish round the eye, on the chin and under the jaw; dark nose.
        colour = o.mix(BUFF, GREY, .55 + .3 * o.mottle(p, 4))
        colour = o.mix(colour, WHITE, .75 * o.smooth((.312 - p.z + .30 * (p.x - .20)) / .012))
        return o.mix(colour, BROWN, o.smooth((p.x - .260) / .006))
    a.fur([((x, 0, z), w, h) for x, z, w, h in HEAD], face, 'head', 14, .02)
    for s, side in ((1, 'L'), (-1, 'R')):
        a.mark = None
        a.oval((.197, s * .0335, .346), (.0150, .0050, .0140), o.mix(WHITE, BUFF, .3), 'head', 3, 8)      # pale ring
        a.oval((.198, s * .0360, .346), (.0110, .0050, .0104), (.050, .028, .012), 'head', 4, 8)          # big amber-brown eye
        a.oval((.199, s * .0385, .346), (.0058, .0030, .0062), (.006, .005, .004), 'head', 3, 6)          # pupil
        cupped_ear(a, o, Vector((.158, s * .021, .368)), Vector((.138, s * .046, .508)), s, 'ear.' + side)
        hy, fy = s * .055, s * .034
        # The haunch: a big rounded thigh lying against the flank.
        a.mark = flecks
        # (Sunk well into the flank and coloured as the flank is, so no edge shows where they meet.)
        haunch = lambda p: o.mix(coat(p), o.mix(BUFF, GREY, .25), o.smooth((.185 - p.z) / .05))
        a.fur([((-.185, hy * .62, .224), .050, .062), ((-.150, hy * .80, .198), .058, .068), ((-.112, hy * .92, .160), .047, .052),
               ((-.082, hy * .98, .134), .033, .036), ((-.062, hy, .118), .024, .026)],
              haunch, o.near(a, ['thigh.' + side, 'hips', 'shin.' + side]), 12, .015)
        a.mark = None
        leg = lambda p: o.mix(BUFF, WHITE, .45 * o.smooth((.10 - p.z) / .08))
        a.tube3([(-.064, hy, .120), (-.112, hy, .090), (-.168, hy, .053)], [.024, .019, .0135], leg,
                o.near(a, ['shin.' + side, 'thigh.' + side, 'foot.' + side]), 8)
        # The long hind foot, heel off the ground when it stands tall.
        a.loft([((-.172, hy, .054), .0125, .0135), ((-.130, hy, .038), .0125, .0115), ((-.088, hy, .022), .0130, .0100),
                ((-.056, hy, .012), .0125, .0090), ((-.040, hy, .008), .0060, .0050)],
               lambda p: o.mix(BUFF, WHITE, .35), o.near(a, ['foot.' + side, 'shin.' + side]), 8)
        # The foreleg: a shoulder inside the chest, a lean forearm, a fine straight shank.
        fore = lambda p: o.mix(leg(p), coat(p), o.smooth((p.z - .150) / .04))
        a.mark = lambda p: DARK + (.5 * o.smooth((p.z - .150) / .04),)
        a.tube3([(.098, fy * .75, .215), (.096, fy * .95, .180), (.089, fy, .145), (.084, fy, .108), (.090, fy, .066), (.096, fy, .028)],
                [.036, .031, .0200, .0135, .0105, .0095], fore, o.near(a, ['upper.' + side, 'lower.' + side, 'body']), 8)
        a.mark = None
        a.loft([((.090, fy, .020), .0095, .0100), ((.108, fy, .012), .0105, .0085), ((.126, fy, .008), .0060, .0050)],
               lambda p: o.mix(BUFF, WHITE, .35), o.near(a, ['paw.' + side, 'lower.' + side]), 8)

    # The tail: black along the top and down the rump, white beneath.
    a.fur([((-.240, 0, .196), .020, .022), ((-.262, 0, .172), .023, .024), ((-.280, 0, .146), .019, .020), ((-.294, 0, .124), .008, .009)],
          lambda p: o.mix(WHITE, DARK, o.smooth((p.z - (.196 + 1.35 * (p.x + .240)) + .002) / .008)),
          o.near(a, ['tail', 'hips']), 10, .04)

    o.finish(a, c, output, [('Idle', 150, idle), ('Walk', 16, bound)], budget=5000, roughness=1, specular=.3)


def cupped_ear(a, o, base, tip, s, bone):
    """A tall cupped ear opening forwards and outwards: grey-buff behind, pink inside, white rim, black tip."""
    from mathutils import Vector
    axis = (tip - base).normalized()
    length = (tip - base).length
    fwd = Vector((.75, s * .66, 0))
    fwd = (fwd - axis * fwd.dot(axis)).normalized()
    side = axis.cross(fwd).normalized()
    stations = (0, .10, .26, .44, .62, .78, .90, .97, 1)
    arc = [math.radians(-105 + 210 * k / 6) for k in range(7)]
    outer, inner = [], []
    for t in stations:
        centre = base + axis * length * t
        w = .0275 * math.sin(math.pi * min(.999, .16 + t * .84)) ** .6 + .002
        for phi in arc:
            outer.append(centre + side * (math.sin(phi) * w) - fwd * (math.cos(phi) * w * .50))
            wi = max(.0015, w - .0035)
            inner.append(centre + side * (math.sin(phi) * wi) - fwd * (math.cos(phi) * wi * .50 - .0025))
    n, m = len(stations), len(arc)
    faces = []
    for i in range(n - 1):
        for k in range(m - 1):
            a0, b0 = i * m + k, (i + 1) * m + k
            faces.append((a0, a0 + 1, b0 + 1, b0))
            faces.append((n * m + b0, n * m + b0 + 1, n * m + a0 + 1, n * m + a0))
        for k in (0, m - 1):
            a0, b0 = i * m + k, (i + 1) * m + k
            faces.append((a0, b0, n * m + b0, n * m + a0) if k == 0 else (a0, n * m + a0, n * m + b0, b0))
    for k in range(m - 1):
        top = (n - 1) * m + k
        faces.append((top, top + 1, n * m + top + 1, n * m + top))
    colours = []
    for idx in range(2 * n * m):
        i, k = divmod(idx % (n * m), m)
        t = stations[i]
        if t > .86:
            colours.append(DARK)                                        # the black tip
        elif k in (0, m - 1):
            colours.append(WHITE)                                       # the white rim
        elif idx >= n * m:
            colours.append(o.mix(PINK, BUFF, .25 + .5 * abs(k - 3) / 3))   # thin skin inside
        else:
            colours.append(o.mix(GREY, BUFF, .55))
    offset = len(a.verts)
    for p, colour in zip(outer + inner, colours):
        a.verts.append(tuple(p))
        a.weights.append({bone: 1})
        a.colours.append(a.paint(p, colour, 'detail'))
    a.faces.extend(tuple(q + offset for q in f) for f in faces)


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    o.turn(obj, 'head', .40 * math.sin(w) ** 3, (0, 0, 1))
    o.turn(obj, 'neck', .05 * math.sin(2 * w))
    o.turn(obj, 'head', .035 * math.sin(14 * w) * (math.sin(w * 2) > 0))        # the nose works
    # One ear turns to listen, then the other.
    o.turn(obj, 'ear.L', .55 * max(0, math.sin(2 * w)) ** 2, (0, 0, 1))
    o.turn(obj, 'ear.R', -.55 * max(0, math.sin(2 * w + 2.2)) ** 2, (0, 0, 1))
    o.turn(obj, 'ear.L', -.10 * math.sin(3 * w))
    o.turn(obj, 'ear.R', -.10 * math.sin(3 * w + 1))
    o.turn(obj, 'tail', .08 * math.sin(4 * w))


def bound(obj, t):
    import original as o
    import bpy
    # Hind feet strike at t = 0 and drive until 0.28; the hare is in the air until the
    # forefeet land at 0.5; the hind legs swing forward past them and strike again.
    drive = math.sin(math.pi * t / .5) ** 2 if t < .5 else 0
    tuck = math.sin(math.pi * (t - .5) / .5) if t > .5 else 0
    u = t / .30 * .5 if t < .30 else .5 + (t - .30) / .70 * .5
    swing = .45 - 1.50 * math.sin(math.pi * u) ** 2
    reach = .62 * math.cos(2 * math.pi * (t - .5))
    fold = max(0, math.sin(2 * math.pi * (t - .75)))
    pitch = .20 * math.sin(2 * math.pi * (t - .35))
    o.turn(obj, 'body', pitch)
    o.turn(obj, 'hips', -.30 * tuck + .18 * drive)                # the loin flexes under, then straightens
    o.turn(obj, 'neck', .30 - pitch * .6)
    o.turn(obj, 'head', -.18 - pitch * .3)
    o.turn(obj, 'tail', -.5)
    for side in 'LR':
        o.plane_rotate(obj, 'thigh.' + side, swing)
        o.plane_rotate(obj, 'shin.' + side, 1.45 * drive - .50 * tuck)
        o.plane_rotate(obj, 'foot.' + side, -1.55 * drive - .30 * tuck)
        o.plane_rotate(obj, 'upper.' + side, reach)
        o.plane_rotate(obj, 'lower.' + side, -1.15 * fold)
        o.plane_rotate(obj, 'paw.' + side, .5 * fold)
        o.turn(obj, 'ear.' + side, -1.15 + .12 * math.sin(2 * math.pi * t))   # laid back along the neck
    # Set the hare on the ground: its lowest foot touches, except in the air between the two strikes.
    bpy.context.view_layer.update()
    # (Each foot bone runs from the heel or wrist to the toe tips; the foot is 14 mm thick at the heel, 5 at the toes.)
    low = min(min(obj.pose.bones[name].tail.z - .005, obj.pose.bones[name].head.z - .014) for name in TOES)
    air = .075 * math.sin(math.pi * (t - .26) / .26) if .26 < t < .52 else 0
    o.shift(obj, 'root', (0, 0, air - low))


if __name__ == '__main__':
    cli(ID, build)
