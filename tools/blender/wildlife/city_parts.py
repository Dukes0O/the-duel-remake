"""Parts shared by the WILD-ART-CITY birds: feather fans, wing zones, markings.

bird.py builds the body, wings, legs and rig from a species' table. These
add what one sheet cannot show: a tail fanned from separate feathers (forked
for the kite), and the zones of a wing that a coat function paints by.
Positions are in the bird's body frame (bird.Frame) unless stated.
"""
import math

from mathutils import Vector


def head_centre(P, f):
    """World centre of the head, as bird.build places it."""
    return f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))


def bill_tip(P, f):
    hc, hr = head_centre(P, f), P['head']
    return hc + Vector((hr * .78 + P['bill'][0], 0, -hr * .12 - P['bill'][0] * P['bill'][3]))


def fan(a, f, root, count, length, width, spread, colour, weight='tail', fork=0, root_half=0, droop=0, thick=.0025):
    """Feathers fanned backwards from `root`, each a thin blade.

    spread is the whole fan's angle in degrees. fork above 0 shortens the
    middle feathers (a kite's notch); below 0 it shortens the outer ones (a
    rounded tail). root_half spreads the roots across the rump, and droop
    tips the fan down behind (radians). Outer feathers lie under inner ones.
    """
    up = tuple(f.tilt @ Vector((0, 0, 1)))
    half = max(1, (count - 1) / 2)
    for i in range(count):
        t = (i - (count - 1) / 2) / half
        ang = math.radians(spread / 2 * t)
        d = Vector((-math.cos(ang) * math.cos(droop), math.sin(ang), -math.sin(droop)))
        side = Vector((math.sin(ang), math.cos(ang), 0))
        reach = length * ((1 - fork * (1 - abs(t))) if fork >= 0 else (1 + fork * t * t))
        base = Vector(root) + Vector((0, root_half * t, -.0012 * abs(t) * half))
        stations = []
        for s, w in ((0, .60), (.55, 1), (.88, .85), (1, .30)):
            centre = base + d * reach * s
            stations.append((tuple(f.w(centre + side * width * w / 2)), tuple(f.w(centre - side * width * w / 2)), thick, up))
        a.blade(stations, colour, weight)


def wing_zones(P, f, p):
    """Where a wing point lies: (u, back, below, folded).

    u runs 0 at the shoulder to 1 at the tip of the spread wing, back runs 0
    at the leading edge to 1 at the trailing edge, below is true on the
    underside, and folded is true on the wing sculpted against the flank.
    """
    q = f.b(p)
    bl, bw = P['body'], P['width']
    shoulder_x, shoulder_y, shoulder_z = .20 * bl, bw * .70, .45 * P['height']
    u = (abs(q.y) - shoulder_y) / (P['span'] - shoulder_y)
    c0 = P['chord'][0]
    v = max(u, 0)
    lead = shoulder_x + c0 * (.16 * math.sin(math.pi * min(v / .42, 1) / 2) - .45 * max(0, (v - .42) / .58) ** 1.4)
    chord = c0 * (1 - .08 * min(v / .42, 1) - .55 * max(0, (v - .42) / .28) ** 1.2)
    back = (lead - q.x) / max(chord, .02)
    return u, back, q.z < shoulder_z - .0012, abs(q.y) < bw * 1.05


def fold_bar(a, f, P, side, x0, x1, colour, lean=.25, rise=(.62, -.30), proud=.0022):
    """A dark bar across the folded wing (a pigeon's), as its own strip.

    The folded wing has too few rings to carry a painted bar, so the bar is a
    narrow blade lying just proud of it, weighted to the fold bone so that it
    hides with the folded wing in flight. x0 to x1 is the bar's place along
    the body, as fractions of the body length; lean slopes it back as it
    goes down; rise is its top and bottom, as fractions of the wing's depth.
    """
    bl, bw, bh = P['body'], P['width'], P['height']
    s = 1 if side == 'L' else -1
    # bird.build's folded wing: x, centre y, centre z, lateral radius, vertical
    # radius, in body lengths, widths, heights, metres and heights.
    rings = [(.16, .97, .18, .012, .50), (-.12, .96, .14, .014, .60), (-.42, .70, .16, .012, .44)]

    def wing_at(x):
        x = max(rings[-1][0], min(rings[0][0], x))
        for ring_a, ring_b in zip(rings, rings[1:]):
            if ring_b[0] <= x <= ring_a[0]:
                k = (ring_a[0] - x) / (ring_a[0] - ring_b[0])
                return [m + (n - m) * k for m, n in zip(ring_a[1:], ring_b[1:])]

    stations = []
    for k in range(4):
        v = rise[0] + (rise[1] - rise[0]) * k / 3
        shift = -lean * (rise[0] - v)
        ends = []
        for x in (x0 + shift, x1 + shift):
            cy, cz, ry, rz = wing_at(x)
            bulge = math.sqrt(max(0, 1 - v * v))
            ends.append(tuple(f.w((x * bl, s * (cy * bw + ry * bulge + proud), cz * bh + v * rz * bh))))
        stations.append((ends[0], ends[1], .0012, tuple(f.tilt @ Vector((0, s, 0)))))
    a.blade(stations, colour, 'fold.' + side)


def stocking(a, f, P, side, colour, lower, radii, sides=6):
    """A sleeve over the upper leg: a raptor's feathered thigh, or a wader's dark shank.

    bird.py's leg has three rings, so a colour change part of the way down
    smears along half the leg; a sleeve ends where the colour ends. lower is
    how far down the leg it reaches (0 to 1); radii are its top, middle and end.
    """
    s = 1 if side == 'L' else -1
    hip = f.hip_w + Vector((0, s * P['stance'], .012))
    foot = Vector((.008, s * P['stance'], .008))
    a.tube3([hip, hip.lerp(foot, lower * .5), hip.lerp(foot, lower)], list(radii), colour, 'leg.' + side, sides)
