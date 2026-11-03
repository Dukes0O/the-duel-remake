"""Panorama Ridge eastern grey kangaroo: an original recipe with its own rig.

Adult male standing alert, head about 1.35 m up (about 1.7 m fully upright),
resting on its long hind feet with the heavy tail on the ground. Soft
grey-brown coat, pale chest and belly, darker muzzle, dark paws, feet and
tail tip, tall ears. Idle: looks round, ears turn, breathes. Walk: an
in-place bound: both feet push off together, the body tips forward over
them and the tail lifts as a counterweight. Helpers: original.py.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'eastern-grey-kangaroo'
COAT = (.115, .090, .070)
BACK = (.075, .060, .048)
BELLY = (.46, .42, .34)
CREAM = (.50, .45, .36)
MUZZLE = (.085, .074, .064)
DARK = (.020, .017, .015)
HIP = (-.12, .58)
LEGS = {}


def build(output, c, cache):
    import original as o
    from mathutils import Vector
    a = o.Body(ID)
    a.bone('root', (0, 0, 0), (0, 0, .1))
    a.bone('pelvis', (HIP[0], 0, HIP[1]), (.10, 0, .82), 'root')
    a.bone('chest', (.10, 0, .82), (.21, 0, 1.07), 'pelvis')
    a.bone('neck', (.21, 0, 1.07), (.27, 0, 1.27), 'chest')
    a.bone('head', (.27, 0, 1.27), (.56, 0, 1.265), 'neck')
    a.bone('tail1', (-.24, 0, .48), (-.55, 0, .22), 'pelvis')
    a.bone('tail2', (-.55, 0, .22), (-.92, 0, .075), 'tail1')
    a.bone('tail3', (-.92, 0, .075), (-1.24, 0, .045), 'tail2')
    for s, side in ((1, 'L'), (-1, 'R')):
        y = s * .13
        hip, knee, hock, toe = (HIP[0], y, HIP[1]), (.12, y, .35), (-.16, y, .075), (.22, y, .025)
        a.bone('thigh.' + side, hip, knee, 'pelvis')
        a.bone('shin.' + side, knee, hock, 'thigh.' + side)
        a.bone('foot.' + side, hock, toe, 'shin.' + side)
        a.bone('arm.' + side, (.23, s * .095, 1.03), (.31, s * .13, .87), 'chest')
        a.bone('hand.' + side, (.31, s * .13, .87), (.36, s * .11, .76), 'arm.' + side)
        a.bone('ear.' + side, (.30, s * .055, 1.37), (.275, s * .11, 1.585), 'head')
        LEGS[side] = [Vector(p) for p in (hip, knee, hock, toe)]

    spine_x = lambda z: -.20 + .72 * (z - .50)

    def fur(p):
        # Grey-brown with soft mottling and grizzled guard-hair tips.
        colour = o.mix(COAT, BACK, .6 * o.mottle(p))
        return o.mix(colour, (.20, .175, .15), .45 * o.speckle(p) ** 3)

    def coat(p):
        front = p.x - spine_x(p.z)
        colour = o.mix(fur(p), o.mix(BACK, DARK, .25), o.smooth((-front - .06) / .10))
        # Clearly creamy front from chin to belly.
        return o.mix(colour, o.mix(BELLY, CREAM, o.mottle(p, 1.7)), o.smooth((front - .01) / .06))

    def thigh(p, y):
        # Cream on the inside of the leg, coat outside.
        return o.mix(coat(p), BELLY, .85 * o.smooth((abs(y) - abs(p.y) - .07) / .04))

    body = o.near(a, ['pelvis', 'chest', 'neck', 'tail1'])
    a.fur([((-.30, 0, .44), .10, .10), ((-.20, 0, .50), .17, .19), ((-.08, 0, .60), .20, .25),
            ((.04, 0, .73), .18, .22), ((.12, 0, .86), .15, .17), ((.18, 0, .98), .12, .13),
            ((.22, 0, 1.08), .095, .10), ((.25, 0, 1.17), .072, .078), ((.27, 0, 1.25), .066, .07)],
           coat, body, 18, .05)

    def head_coat(p):
        if p.x > .535:
            return DARK                                           # nose
        if p.z < 1.278 and p.x > .30:
            return o.mix(CREAM, BELLY, .4)                        # chin and throat
        return o.mix(fur(p), MUZZLE, o.smooth((p.x - .42) / .08))  # soft grey muzzle
    # A longer, deeper head with a soft muzzle.
    a.loft([((.240, 0, 1.300), .055, .060), ((.290, 0, 1.326), .080, .090), ((.360, 0, 1.322), .074, .083),
            ((.440, 0, 1.298), .058, .066), ((.510, 0, 1.277), .042, .050), ((.550, 0, 1.267), .022, .028),
            ((.566, 0, 1.264), .006, .008)], head_coat, 'head', 14)
    for s, side in ((1, 'L'), (-1, 'R')):
        a.oval((.400, s * .060, 1.346), (.017, .006, .015), (.30, .27, .22), 'head', 3, 8)     # pale eye ring
        a.oval((.402, s * .064, 1.347), (.012, .006, .011), DARK, 'head', 4, 8)
        cupped_ear(a, o, Vector((.300, s * .055, 1.370)), Vector((.275, s * .110, 1.585)), s, 'ear.' + side)
        y = s * .13
        leg = o.near(a, ['thigh.' + side, 'shin.' + side, 'pelvis'])
        # Massive hind thighs, the kangaroo's engine.
        # Massive, muscular hind thighs.
        a.fur([((HIP[0] - .05, y * .9, .66), .14, .19), ((-.07, y, .54), .16, .19), ((.0, y * 1.02, .46), .14, .15),
               ((.07, y, .39), .095, .10), ((.12, y, .35), .058, .06)], lambda p, y=y: thigh(p, y), leg, 16, .04)
        shin = o.near(a, ['shin.' + side, 'thigh.' + side, 'foot.' + side])
        a.tube3([(.13, y, .36), (-.02, y, .21), (-.16, y * .95, .08)], [.056, .042, .033], lambda p, y=y: thigh(p, y), shin, 10)
        foot = o.near(a, ['foot.' + side, 'shin.' + side])
        feet = lambda p: o.mix(o.mix(COAT, DARK, .5), DARK, o.smooth((p.x - .05) / .1))
        a.loft([((-.20, y * .95, .062), .034, .036), ((-.06, y * .95, .043), .040, .030),
                ((.10, y * .95, .030), .036, .024), ((.23, y * .95, .022), .016, .012)], feet, foot, 10)
        arm = o.near(a, ['arm.' + side, 'hand.' + side, 'chest'])
        a.tube3([(.22, s * .085, 1.05), (.31, s * .13, .87), (.36, s * .11, .77)], [.046, .030, .022],
                lambda p: o.mix(COAT, DARK, o.smooth((.84 - p.z) / .06)), arm, 8)
        a.oval((.365, s * .11, .755), (.022, .016, .015), DARK, 'hand.' + side, 4, 8)

    tail = o.near(a, ['tail1', 'tail2', 'tail3', 'pelvis'])
    a.fur([((-.22, 0, .50), .115, .115), ((-.40, 0, .33), .092, .090), ((-.62, 0, .185), .066, .064),
           ((-.85, 0, .095), .048, .046), ((-1.05, 0, .062), .034, .032), ((-1.25, 0, .050), .012, .012)],
          lambda p: o.mix(fur(p), DARK, o.smooth((-p.x - .95) / .15)), tail, 14, .04)

    o.finish(a, c, output, [('Idle', 120, idle), ('Walk', 22, hop)], refine=4600)


def cupped_ear(a, o, base, tip, s, bone):
    """A broad upright ear: a thin cupped shell opening forward, as long as the head.

    Outer fur grey-brown, inner fur pale cream, the rim and tip dark.
    """
    from mathutils import Vector
    axis = (tip - base).normalized()
    length = (tip - base).length
    fwd = Vector((1, s * .30, 0))
    fwd = (fwd - axis * fwd.dot(axis)).normalized()
    side = axis.cross(fwd).normalized()
    stations = (0, .14, .32, .52, .70, .86, .96, 1)
    arc = [math.radians(-115 + 230 * k / 8) for k in range(9)]
    outer, inner = [], []
    for t in stations:
        centre = base + axis * length * t
        w = .047 * math.sin(math.pi * min(.999, .18 + t * .82)) ** .7 + .003
        for phi in arc:
            outer.append(centre + side * (math.sin(phi) * w) - fwd * (math.cos(phi) * w * .55))
            wi = max(.002, w - .006)
            inner.append(centre + side * (math.sin(phi) * wi) - fwd * (math.cos(phi) * wi * .55 - .004))
    n, m = len(stations), len(arc)
    verts = outer + inner
    faces = []
    for i in range(n - 1):
        for k in range(m - 1):
            a0, b0 = i * m + k, (i + 1) * m + k
            faces.append((a0, a0 + 1, b0 + 1, b0))
            off = n * m
            faces.append((off + b0, off + b0 + 1, off + a0 + 1, off + a0))
        for k in (0, m - 1):
            a0, b0 = i * m + k, (i + 1) * m + k
            faces.append((a0, b0, n * m + b0, n * m + a0) if k == 0 else (a0, n * m + a0, n * m + b0, b0))
    for k in range(m - 1):
        top = (n - 1) * m + k
        faces.append((top, top + 1, n * m + top + 1, n * m + top))
    colours = []
    for idx, p in enumerate(verts):
        i, k = divmod(idx % (n * m), m)
        rim = k in (0, m - 1) or i >= n - 2
        if rim:
            colours.append(DARK)
        elif idx >= n * m:
            colours.append(o.mix(CREAM, (.30, .26, .22), .25))      # pale inner fur
        else:
            colours.append(o.mix(COAT, BACK, .5))
    offset = len(a.verts)
    for p, col in zip(verts, colours):
        a.verts.append(tuple(p))
        a.weights.append({bone: 1})
        a.colours.append(a.paint(p, col, 'detail'))
    a.faces.extend(tuple(q + offset for q in f) for f in faces)


def idle(obj, t):
    import original as o
    w = 2 * math.pi * t
    # Upright resting stance: the body tips back about the hips; legs, feet
    # and tail keep their ground contact; short forearms held in front.
    upright = -.24
    o.turn(obj, 'pelvis', upright)
    for side in 'LR':
        o.plane_rotate(obj, 'thigh.' + side, upright)
        o.plane_rotate(obj, 'arm.' + side, .40)
        o.plane_rotate(obj, 'hand.' + side, .35)
    o.plane_rotate(obj, 'tail1', upright)
    o.plane_rotate(obj, 'neck', -.16)
    o.turn(obj, 'head', .30 * math.sin(w), (0, 0, 1))
    o.turn(obj, 'neck', .06 * math.sin(2 * w))
    o.turn(obj, 'chest', .02 * math.sin(3 * w))
    o.stretch(obj, 'chest', (1 + .015 * math.sin(4 * w), 1, 1 + .015 * math.sin(4 * w)))
    o.turn(obj, 'ear.L', .35 * math.sin(3 * w), (0, 0, 1))
    o.turn(obj, 'ear.R', -.30 * math.sin(3 * w + 1.3), (0, 0, 1))
    for side in 'LR':
        o.turn(obj, 'arm.' + side, .08 * math.sin(2 * w))
    o.turn(obj, 'tail3', .05 * math.sin(w), (0, 0, 1))


def hop(obj, t):
    import original as o
    from mathutils import Vector
    contact = .36
    if t < contact:
        u = t / contact
        h = -.05 * math.sin(math.pi * u)
    else:
        u = (t - contact) / (1 - contact)
        h = .30 * math.sin(math.pi * u)
    pitch = .55 + .10 * math.sin(2 * math.pi * t + .5)
    o.shift(obj, 'root', (0, 0, h))
    o.turn(obj, 'pelvis', pitch)
    o.turn(obj, 'neck', -pitch * .55)
    o.turn(obj, 'head', -pitch * .40)
    o.turn(obj, 'tail1', -.12 + .16 * math.sin(2 * math.pi * t - 1.2))
    o.turn(obj, 'tail2', .06 * math.sin(2 * math.pi * t - 2))
    for side in 'LR':
        o.turn(obj, 'arm.' + side, -.35)
        o.turn(obj, 'hand.' + side, -.4)
    rest = LEGS['L']
    rest_foot = o.angle_down(rest[3] - rest[2])
    lf = (rest[3] - rest[2]).length
    l1, l2 = (rest[1] - rest[0]).length, (rest[2] - rest[1]).length
    if t < contact:
        u = t / contact
        toe_x = .30 - .42 * u
        phi = rest_foot - (rest_foot - math.radians(28)) * o.smooth((u - .55) / .45)
        toe = Vector((toe_x, 0, .025))
        hock = toe - lf * Vector((math.sin(phi), 0, -math.cos(phi)))
    else:
        u = (t - contact) / (1 - contact)
        start_phi = math.radians(28)
        start = Vector((-.12, 0, .025)) - lf * Vector((math.sin(start_phi), 0, -math.cos(start_phi)))
        land = Vector((.30, 0, .025)) - lf * Vector((math.sin(rest_foot), 0, -math.cos(rest_foot)))
        s = o.smooth(u)
        hock = start.lerp(land, s)
        hock.z += h * .85 + .05 * math.sin(math.pi * u)
        phi = start_phi + (rest_foot - start_phi) * o.smooth(u / .8)
    hip = Vector((rest[0].x, 0, rest[0].z + h))
    knee = o.two_bone(hip, hock, l1, l2, True)
    r_thigh = o.angle_down(rest[1] - rest[0])
    r_shin = o.angle_down(rest[2] - rest[1])
    d_thigh = o.angle_down(knee - hip) - r_thigh
    d_shin = o.angle_down(hock - knee) - r_shin
    d_foot = phi - rest_foot
    for side in 'LR':
        o.plane_rotate(obj, 'thigh.' + side, d_thigh + pitch)
        o.plane_rotate(obj, 'shin.' + side, d_shin - d_thigh)
        o.plane_rotate(obj, 'foot.' + side, d_foot - d_shin)


if __name__ == '__main__':
    cli(ID, build)
