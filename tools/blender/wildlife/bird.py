"""Shared original recipe for perching birds: body, wings, tail, legs and rig.

A bird is authored in a body frame (x along the body, z up from the back)
and tipped nose-up by its perching angle about the hip; legs then stand it
on its feet at the origin. Head and bill are built level in the world so
the bird looks ahead. The rest pose has the wings spread; the Idle clip
folds them against the body and shortens them with bone scale, the Fly
clip levels the body, tucks the legs and flaps. Metres, +X forward.

Species give a dict P of sizes (see the bird recipes) and colour functions.
"""
import math

import original as o
from mathutils import Matrix, Quaternion, Vector


class Frame:
    def __init__(self, P):
        self.P = P
        self.tilt = Matrix.Rotation(-math.radians(P['tilt']), 3, 'Y')
        self.hip_b = Vector((-.10 * P['body'], 0, -.72 * P['height']))
        self.hip_w = Vector((0, 0, P['leg']))

    def w(self, p):
        """Body frame point to world."""
        return self.tilt @ (Vector(p) - self.hip_b) + self.hip_w

    def b(self, p):
        """World point to body frame."""
        return self.tilt.inverted() @ (Vector(p) - self.hip_w) + self.hip_b


def build(ID, P, paint, output, c):
    """paint: dict of part name -> function(frame, world point) -> colour."""
    f = Frame(P)
    a = o.Body(ID)
    bl, bw, bh = P['body'], P['width'], P['height']
    chest = f.w((.42 * bl, 0, .10 * bh))
    head_c = chest + Vector((P['neck'][0], 0, P['neck'][1]))
    hr = P['head']
    bill_base = head_c + Vector((hr * .78, 0, -hr * .12))
    bill_tip = bill_base + Vector((P['bill'][0], 0, -P['bill'][0] * P['bill'][3]))
    tail_base = f.w((-.46 * bl, 0, .05 * bh))
    tail_end = f.w((-.46 * bl - P['tail'][0], 0, -.02 * bh))
    a.bone('root', (0, 0, 0), (0, 0, .03))
    a.bone('body', tuple(f.hip_w), tuple(chest), 'root')
    a.bone('neck', tuple(chest), tuple(head_c), 'body')
    a.bone('head', tuple(head_c), tuple(bill_tip), 'neck')
    a.bone('tail', tuple(tail_base), tuple(tail_end), 'body')
    span = P['span']
    shoulder_y = bw * .70
    shoulder = (.20 * bl, shoulder_y, .45 * bh)
    wrist_y = shoulder_y + (span - shoulder_y) * .42
    for side, s in (('L', 1), ('R', -1)):
        sh = f.w((shoulder[0], s * shoulder[1], shoulder[2]))
        wr = f.w((shoulder[0] - .01, s * wrist_y, shoulder[2]))
        tip = f.w((shoulder[0] - .05, s * span, shoulder[2]))
        a.bone('wing1.' + side, tuple(sh), tuple(wr), 'body')
        a.bone('wing2.' + side, tuple(wr), tuple(tip), 'wing1.' + side)
        fold_tip = f.w((-.5 * bl - P.get('fold', .55 * P['tail'][0]), s * bw * .15, .18 * bh))
        a.bone('fold.' + side, tuple(sh), tuple(fold_tip), 'body')
        hip = f.hip_w + Vector((0, s * P['stance'], 0))
        foot = Vector((.008, s * P['stance'], .008))
        a.bone('leg.' + side, tuple(hip + Vector((0, 0, .02))), tuple(foot), 'body')
        a.bone('foot.' + side, tuple(foot), tuple(foot + Vector((.03, 0, 0))), 'leg.' + side)

    body = o.near(a, ['body', 'neck', 'tail'])
    prof = [(-.50, .35, .35), (-.38, .74, .72), (-.20, .98, .96), (.02, 1, 1), (.22, .92, .95),
            (.38, .76, .80), (.50, .52, .62)]
    sections = [(tuple(f.w((x * bl, 0, -.04 * bh * (x > .1)))), w * bw, h * bh) for x, w, h in prof]
    a.fur(sections, lambda p: paint['body'](f, p), body, P.get('body_sides', 14), P.get('shag', .015))
    if P.get('merged'):
        # One big round head sunk into the shoulders: a head ball, a broad
        # nape-and-throat ball bridging it to the body, and the face tapering
        # into the bill. Smooth balls meet in soft hollows, never a fold.
        reach = P.get('head_reach', 1.2) * hr
        colour = lambda p: paint['head'](f, p) if (Vector(p) - head_c).length < reach else paint['body'](f, p)
        weight = o.near(a, ['head', 'neck', 'body'])
        rings, sides = P.get('head_detail', (7, 14))
        a.oval(tuple(head_c), (hr * 1.04, hr * .96, hr * .96), colour, weight, rings, sides)
        at, nr = P.get('nape', (.45, 1.0))
        a.oval(tuple(chest.lerp(head_c, at) + Vector((-hr * .10, 0, 0))), (hr * .95 * nr, bw * .96, hr * .92 * nr),
               colour, weight, 5, 12)
        a.oval(tuple(head_c + Vector((hr * .62, 0, -hr * .10))), (hr * .45, hr * .62, hr * .58), colour, 'head', 4, 10)
    else:
        # Neck joins chest and head; the head is level in the world.
        a.fur([(tuple(f.w((.30 * bl, 0, .12 * bh))), bw * .80, bh * .82),
               (tuple(chest.lerp(head_c, .5)), hr * P.get('neck_r', .80), hr * P.get('neck_r', .80) * 1.02),
               (tuple(head_c + Vector((-hr * .55, 0, 0))), hr * .85, hr * .88),
               (tuple(head_c), hr, hr * .96),
               (tuple(head_c + Vector((hr * .50, 0, -hr * .04))), hr * .84, hr * .82),
               (tuple(head_c + Vector((hr * .78, 0, -hr * .09))), hr * .60, hr * .60),
               (tuple(head_c + Vector((hr * .94, 0, -hr * .12))), hr * .26, hr * .28)],
              lambda p: paint['head'](f, p), o.near(a, ['head', 'neck', 'body']), 14, .01)
    # Bill: deep at the base, tapering and curving down to the tip.
    depth, width, hook = P['bill'][1], P['bill'][2], P['bill'][3]
    bill = []
    for k in range(6):
        u = k / 5
        centre = bill_base.lerp(bill_tip, u) + Vector((0, 0, -hook * P['bill'][0] * .6 * u * u))
        bill.append((tuple(centre), max(.0015, width * (1 - u ** 1.4)), max(.0015, depth * (1 - u ** 1.25))))
    a.loft(bill, lambda p: paint['bill'](f, p), 'head', 8)
    for s in (1, -1):
        eye = head_c + Vector((hr * .42, s * hr * .80, hr * .22))
        if 'eyering' in paint:
            a.oval(tuple(eye + Vector((0, s * -.002, 0))), (hr * .20, hr * .07, hr * .20), paint['eyering'](f, eye), 'head', 3, 6)
        a.oval(tuple(eye), (hr * .13, hr * .09, hr * .13), (.006, .005, .004), 'head', 3, 6)
    # Tail fan from the rump.
    tl, tw, tshape = P['tail']
    stations = []
    for k in range(6):
        u = k / 5
        x = -.40 * bl - tl * u
        half = tw * (.32 + .68 * u ** .7)
        if tshape == 'round':
            half *= 1 - .35 * u ** 6
        elif tshape == 'wedge':
            half *= 1 - .55 * u ** 3
        lead = f.w((x, half, .02 * bh))
        trail = f.w((x, -half, .02 * bh))
        stations.append((tuple(lead), tuple(trail), .006, tuple(f.tilt @ Vector((0, 0, 1)))))
    a.blade(stations, lambda p: paint['tail'](f, p), o.near(a, ['tail', 'body']))
    # Wings, spread in the rest pose: an arm-and-hand blade with a curved
    # leading edge and its thickest point at the wrist, then separate
    # primary feathers fanned from the hand (P['primaries']).
    up = tuple(f.tilt @ Vector((0, 0, 1)))
    reach = span - shoulder_y
    c0 = P['chord'][0]

    def lead_x(u):
        # Forward bulge to the wrist, then swept back along the hand.
        return shoulder[0] + c0 * (.16 * math.sin(math.pi * min(u / .42, 1) / 2)
                                   - .45 * max(0, (u - .42) / .58) ** 1.4)

    def chord(u):
        return c0 * (1 - .08 * min(u / .42, 1) - .55 * max(0, (u - .42) / .28) ** 1.2)

    for side, s in (('L', 1), ('R', -1)):
        wing = o.near(a, ['wing1.' + side, 'wing2.' + side])
        stations = []
        for k in range(8):
            u = .70 * k / 7
            y = shoulder_y + reach * u
            thick = .003 + .009 * math.exp(-((u - .42) / .16) ** 2) + .004 * (1 - u)
            # Soft scallops of the secondaries along the trailing edge.
            trail_x = lead_x(u) - chord(u) * (1 - .05 * (k % 2) * (u > .1))
            stations.append((tuple(f.w((lead_x(u), s * y, shoulder[2]))),
                             tuple(f.w((trail_x, s * y, shoulder[2] - .006))), thick, up))
        a.blade(stations, lambda p: paint['wing'](f, p), wing)
        count, length, width, spread, slots = P['primaries']
        for i in range(count):
            # Outermost feather first, a little forward; the fan opens backwards.
            u = .70 - .20 * i / max(1, count - 1)
            ang = math.radians(8 - spread * i / max(1, count - 1))
            d = Vector((math.sin(ang), s * math.cos(ang), 0))
            side_v = d.cross(Vector((0, 0, 1))).normalized()
            root = Vector((lead_x(u) - chord(u) * .40, s * (shoulder_y + reach * u), shoulder[2] - .002 * i))
            feather = length * (.78 + .22 * math.sin(math.pi * (i + 1) / (count + 1)) + .06 * (i == 0))
            widths = (width * .75, width, width * (.55 if slots else .85), width * (.12 if slots else .35))
            fs = []
            for t, w in zip((0, .45, .82, 1), widths):
                centre = root + d * feather * t
                fs.append((tuple(f.w(centre + side_v * w / 2)), tuple(f.w(centre - side_v * w / 2)), .0025, up))
            a.blade(fs, lambda p: paint['wing'](f, p), 'wing2.' + side)
        # The folded wing, sculpted against the flank with the primaries
        # crossing over the rump. Idle shows it; Fly hides it in the body.
        fold = P.get('fold', .55 * P['tail'][0])
        folded = [((.28 * bl, bw * .80, .32 * bh), .004, .03 * bh),
                  ((.16 * bl, bw * .97, .18 * bh), .012, .50 * bh),
                  ((-.12 * bl, bw * .96, .14 * bh), .014, .60 * bh),
                  ((-.42 * bl, bw * .70, .16 * bh), .012, .44 * bh),
                  ((-.5 * bl - fold * .55, bw * .36, .18 * bh), .008, .24 * bh),
                  ((-.5 * bl - fold, bw * .15, .18 * bh), .002, .03 * bh)]
        a.loft([(tuple(f.w((x, s * y, z))), wdt, hgt) for (x, y, z), wdt, hgt in folded],
               lambda p: paint['wing'](f, p), 'fold.' + side, P.get('fold_sides', 8))
        # Leg and toes: tarsus from the belly feathers to a gripping foot.
        hip = f.hip_w + Vector((0, s * P['stance'], .01))
        foot = Vector((.008, s * P['stance'], .008))
        legw = o.near(a, ['leg.' + side, 'foot.' + side])
        a.tube3([hip, hip.lerp(foot, .5), foot], [P['toe'] * 1.4, P['toe'], P['toe'] * .9],
                lambda p: paint['leg'](f, p), legw, 5)
        for angle, length in P['toes']:
            d = Vector((math.cos(math.radians(angle)), s * math.sin(math.radians(angle)) * .35, 0))
            end = foot + d * length + Vector((0, 0, -.004))
            a.tube3([foot, foot.lerp(end, .6) + Vector((0, 0, .003)), end], [P['toe'], P['toe'] * .8, P['toe'] * .3],
                    lambda p: paint['leg'](f, p), 'foot.' + side, 4)
    if 'extra' in P:
        P['extra'](a, f, head_c, hr)

    def idle(obj, t):
        w = 2 * math.pi * t
        for side in 'LR':
            # Spread wings shrink into the shoulder; the folded wings show.
            o.stretch(obj, 'wing1.' + side, (.001, .001, .001))
        o.turn(obj, 'head', .50 * math.sin(w) ** 3, (0, 0, 1))
        o.turn(obj, 'head', .10 * math.sin(3 * w))
        o.turn(obj, 'tail', .08 * max(0, math.sin(5 * w)) ** 4)
        o.stretch(obj, 'body', (1 + .02 * math.sin(4 * w), 1, 1 + .02 * math.sin(4 * w)))

    def fly(obj, t):
        w = 2 * math.pi * t
        tilt = math.radians(P['tilt'])
        o.shift(obj, 'root', (0, 0, .12 + .015 * math.sin(w + 1)))
        o.turn(obj, 'body', tilt * .92)
        o.turn(obj, 'neck', -tilt * .25)
        axis = tuple(f.tilt @ Vector((1, 0, 0)))
        amp = P.get('flap', .62)
        for side, s in (('L', 1), ('R', -1)):
            o.turn(obj, 'wing1.' + side, s * (amp * math.sin(w) + .10), axis)
            # The hand lags the arm, bending gently through the downstroke,
            # and sweeps back a little on the upstroke.
            o.turn(obj, 'wing2.' + side, s * (amp * .45 * math.sin(w - .8) - .10), axis)
            o.turn(obj, 'wing2.' + side, s * .28 * max(0, math.cos(w)), up)
            o.turn(obj, 'leg.' + side, 1.35)
            o.stretch(obj, 'fold.' + side, (.001, .001, .001))
        o.turn(obj, 'tail', .06 * math.sin(w - 1.2))
        o.turn(obj, 'head', -.05 * math.sin(w))

    o.finish(a, c, output, [('Idle', 120, idle), ('Fly', P.get('beat', 16), fly)], budget=2000,
             roughness=P.get('roughness'), specular=P.get('specular'))
