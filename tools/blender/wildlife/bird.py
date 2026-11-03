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
    a.fur(sections, lambda p: paint['body'](f, p), body, 18, P.get('shag', .015))
    # Neck joins chest and head; the head is level in the world.
    a.fur([(tuple(f.w((.30 * bl, 0, .12 * bh))), bw * .80, bh * .82),
           (tuple(chest.lerp(head_c, .5)), hr * .80, hr * .82),
           (tuple(head_c + Vector((-hr * .55, 0, 0))), hr * .85, hr * .88),
           (tuple(head_c), hr, hr * .96),
           (tuple(head_c + Vector((hr * .55, 0, -hr * .04))), hr * .80, hr * .78),
           (tuple(head_c + Vector((hr * .88, 0, -hr * .12))), hr * .30, hr * .32)],
          lambda p: paint['head'](f, p), o.near(a, ['head', 'neck', 'body']), 16, .01)
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
            a.oval(tuple(eye + Vector((0, s * -.002, 0))), (hr * .20, hr * .07, hr * .20), paint['eyering'](f, eye), 'head', 4, 8)
        a.oval(tuple(eye), (hr * .13, hr * .09, hr * .13), (.006, .005, .004), 'head', 4, 8)
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
    # Wings, spread in the rest pose. Primaries separate into fingers at the tip.
    for side, s in (('L', 1), ('R', -1)):
        wing = o.near(a, ['wing1.' + side, 'wing2.' + side])
        stations = []
        n = 16
        for k in range(n + 1):
            u = k / n
            y = shoulder_y + (span - shoulder_y) * u
            chord = P['chord'][0] + (P['chord'][1] - P['chord'][0]) * u ** 1.3
            if u > .92:
                chord *= (1 - u) / .08 * .7 + .3
            lead_x = shoulder[0] + .03 * math.sin(u * math.pi) - .05 * u
            # Separate primaries at the tip; small feather steps elsewhere.
            notch = chord * (P.get('fingers', 0) * .28 * (u > .66) + .025 * (u > .3)) * (k % 2)
            trail_x = lead_x - chord + notch
            lead = f.w((lead_x, s * y, shoulder[2]))
            trail = f.w((trail_x, s * y, shoulder[2] - .01))
            stations.append((tuple(lead), tuple(trail), .006 * (1 - .6 * u) + .0015,
                             tuple(f.tilt @ Vector((0, 0, 1)))))
        a.blade(stations, lambda p: paint['wing'](f, p), wing)
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
               lambda p: paint['wing'](f, p), 'fold.' + side, 10)
        # Leg and toes: tarsus from the belly feathers to a gripping foot.
        hip = f.hip_w + Vector((0, s * P['stance'], .01))
        foot = Vector((.008, s * P['stance'], .008))
        legw = o.near(a, ['leg.' + side, 'foot.' + side])
        a.tube3([hip, hip.lerp(foot, .5), foot], [P['toe'] * 1.4, P['toe'], P['toe'] * .9],
                lambda p: paint['leg'](f, p), legw, 6)
        for angle, length in P['toes']:
            d = Vector((math.cos(math.radians(angle)), s * math.sin(math.radians(angle)) * .35, 0))
            end = foot + d * length + Vector((0, 0, -.004))
            a.tube3([foot, foot.lerp(end, .6) + Vector((0, 0, .003)), end], [P['toe'], P['toe'] * .8, P['toe'] * .3],
                    lambda p: paint['leg'](f, p), 'foot.' + side, 5)
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
            o.turn(obj, 'wing2.' + side, s * (amp * .55 * math.sin(w - .8)), axis)
            o.turn(obj, 'leg.' + side, 1.35)
            o.stretch(obj, 'fold.' + side, (.001, .001, .001))
        o.turn(obj, 'tail', .06 * math.sin(w - 1.2))
        o.turn(obj, 'head', -.05 * math.sin(w))

    o.finish(a, c, output, [('Idle', 120, idle), ('Fly', P.get('beat', 16), fly)], budget=2000,
             roughness=P.get('roughness'), specular=P.get('specular'))
