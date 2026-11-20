"""Brown pelican (Pacific coast): an original recipe (shared bird rig in bird.py).

About 1.2 m from bill tip to tail with a 2.1 m span: a heavy body on short
dark legs with big webbed feet, a long neck carried upright with the head
on top of it, and a very long, straight, deep bill held down along the
front of the neck, its dark pouch slung beneath. Adult: white head with a
straw-yellow crown, chestnut-brown hindneck, silver-grey back and wings
streaked darker, blackish-brown belly, dark flight feathers (the reference
photographs in desert-references.json).
Idle: stands with the bill on its breast, looks round. Fly: slow deep
wingbeats with the neck drawn back, the head on the shoulders and the bill
out in front.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'pelican'
SILVER = (.30, .29, .27)
STREAK = (.060, .054, .048)
BELLY = (.040, .033, .028)
CHESTNUT = (.080, .030, .014)
WHITE = (.66, .64, .58)
STRAW = (.58, .46, .22)
BILL = (.150, .145, .135)
POUCH = (.070, .062, .055)
DARK = (.030, .028, .027)

P = {'body': .46, 'width': .125, 'height': .14, 'neck': (-.012, .235), 'head': .052,
     'neck_path': [(.12, .012, 1.25), (.28, .026, .92), (.44, .030, .76), (.60, .024, .68), (.76, .010, .66), (.90, -.004, .70)], 'neck_sides': 12,
     'bill': (.190, .031, .019, 1.35), 'bill_curve': .03, 'bill_taper': (5, 2.4), 'tail': (.13, .095, 'round'), 'span': 1.06,
     'primaries': (6, .30, .075, 44, True), 'body_sides': 14, 'fold_sides': 10, 'chord': (.40, .28), 'leg': .105, 'stance': .075,
     'toe': .015, 'toes': [(0, .095), (30, .090), (-30, .090)], 'tilt': 22, 'beat': 42, 'flap': .40,
     'dihedral': .04, 'shag': .02, 'roughness': 1, 'specular': .2, 'refine': 1950}


def head_centre(f):
    from mathutils import Vector
    return f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))


def body(f, p):
    import original as o
    q = f.b(p)
    # Silver-grey above, broken with darker feathers; blackish-brown below.
    upper = o.mix(SILVER, STREAK, .35 * o.smooth((o.mottle(p, 3.2) - .35) / .3))
    return o.mix(BELLY, upper, o.smooth((q.z + .01 * P['height']) / (.35 * P['height'])))


def head(f, p):
    import original as o
    hc, hr = head_centre(f), P['head']
    d = p - hc
    # White head with straw on the crown; the neck below it chestnut, darker towards the body.
    white = o.smooth((d.z + hr * .75) / (hr * .3))
    neck = o.mix(CHESTNUT, (.040, .020, .012), o.smooth((-d.z - hr * 2.4) / (hr * 1.6)))
    colour = o.mix(neck, WHITE, white)
    colour = o.mix(colour, STRAW, .75 * o.smooth((d.z - hr * .40) / (hr * .4)) * o.smooth((hr * .6 - d.x) / hr))
    # Where the neck meets the body the body's own colours take over.
    return o.mix(body(f, p), colour, o.smooth((d.z + hr * 4.3) / (hr * .6)))


def wing(f, p):
    import original as o
    q = f.b(p)
    bw = P['width']
    shoulder_y = bw * .70
    u = (abs(q.y) - shoulder_y) / (P['span'] - shoulder_y)
    if abs(q.y) < bw * 1.05:
        # Folded wing: long silver feathers with dark shafts, dark primaries at the tip.
        colour = o.mix(SILVER, STREAK, .35 * o.smooth((o.mottle(p, 3.2) - .40) / .3))
        return o.mix(colour, DARK, o.smooth((-q.x - .45 * P['body']) / .06))
    c0 = P['chord'][0]
    lead = .20 * P['body'] + c0 * (.16 * math.sin(math.pi * min(max(u, 0) / .42, 1) / 2) - .45 * max(0, (u - .42) / .58) ** 1.4)
    chord = c0 * (1 - .08 * min(max(u, 0) / .42, 1) - .55 * max(0, (u - .42) / .28) ** 1.2)
    back = (lead - q.x) / max(chord, .02)
    flight = u > .62 or back > .5
    coverts = o.mix(SILVER, STREAK, .5 * o.mottle(p, 3))
    return o.mix(coverts, DARK, .85 * flight)


def bill(f, p):
    import original as o
    hc, hr = head_centre(f), P['head']
    base = hc.z - hr * .12
    along = (p.x - hc.x - hr * .78) / P['bill'][0]
    # Depth below the bill's upper edge: grey mandible above, the dark pouch below, a pale hooked tip.
    ridge = base - along * P['bill'][0] * P['bill'][3]
    colour = o.mix(BILL, POUCH, o.smooth((ridge - p.z) / .012))
    return o.mix(colour, (.50, .40, .22), o.smooth((along - .93) / .05))


def leg(f, p):
    return DARK if p.z < .09 else BELLY


def webbed(a, f, head_c, hr):
    """Webs between the three front toes, and bare dark skin round the eye."""
    from mathutils import Vector
    for s in (1, -1):
        foot = Vector((.008, s * P['stance'], .006))
        a.oval(tuple(foot + Vector((.050, 0, -.001))), (.050, .034, .0045), DARK, 'foot.' + ('L' if s > 0 else 'R'), 3, 8)
        a.oval(tuple(head_c + Vector((hr * .50, s * hr * .74, hr * .16))), (hr * .34, hr * .10, hr * .26), POUCH, 'head', 3, 6)


def fly_posture(obj, t):
    import original as o
    # The neck folds back so the head rides on the shoulders, and the bill lifts to point ahead.
    o.shift(obj, 'head', (-.075, 0, -.150))
    o.turn(obj, 'head', -.62)


def streaks(f, p):
    import original as o
    # Dark shaft streaks over the silver back and folded wings; none on the dark belly.
    return STREAK + (.85 * o.smooth((f.b(p).z + .01 * P['height']) / (.3 * P['height'])),)


P['marks'] = {'body': streaks, 'fold': streaks}
P['extra'] = webbed
P['fly_extra'] = fly_posture
PAINT = {'body': body, 'head': head, 'wing': wing, 'tail': lambda f, p: DARK, 'bill': bill, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
