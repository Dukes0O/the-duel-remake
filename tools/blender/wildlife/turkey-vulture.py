"""Wasteland turkey vulture: an original recipe (shared bird rig in bird.py).

About 0.7 m long with a 1.7 m span: blackish-brown plumage with brown
feather edges, a small bare red head on hunched shoulders, a short ivory
hooked bill, pale pinkish legs, a longish rounded tail, and long broad wings
ending in six separated "fingers". From below the flight feathers are
silver-grey against the dark wing lining, the mark that names the bird in
the air. Idle: stands hunched, wings folded, looks round. Fly: soars on
wings held in a shallow V, rocking from side to side, with barely a flap.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'turkey-vulture'
BLACKISH = (.026, .020, .016)
BROWN = (.085, .055, .034)
SILVER = (.62, .58, .52)
RED = (.36, .050, .042)
IVORY = (.56, .50, .40)
LEG = (.44, .34, .30)

P = {'body': .34, 'width': .100, 'height': .112, 'neck': (.046, .060), 'head': .029, 'neck_r': .95,
     'bill': (.027, .021, .014, .70), 'tail': (.21, .105, 'round'), 'span': .85,
     'primaries': (6, .30, .070, 58, True), 'body_sides': 14, 'fold_sides': 10, 'chord': (.43, .28), 'leg': .140, 'stance': .055,
     'toe': .009, 'toes': [(0, .060), (30, .052), (-30, .052), (180, .030)], 'tilt': 38, 'beat': 72, 'flap': .07,
     'dihedral': .28, 'teeter': .10, 'shag': .03, 'roughness': 1, 'specular': .25, 'refine': 1950}


def head_centre(f):
    from mathutils import Vector
    return f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))


def plumage(f, p):
    import original as o
    return o.mix(BLACKISH, BROWN, .55 * o.mottle(p, 2.2) * (.4 + .6 * o.speckle(p)))


def head(f, p):
    import original as o
    # Bare, wrinkled red skin on the head and upper neck; a dark feather ruff below.
    d = (p - head_centre(f)).length / P['head']
    red = o.mix(RED, (.20, .028, .026), .5 * o.mottle(p, 9))
    return o.mix(red, plumage(f, p), o.smooth((d - 1.15) / .35))


def wing(f, p):
    import original as o
    q = f.b(p)
    bl, bw = P['body'], P['width']
    shoulder_x, shoulder_y, shoulder_z = .20 * bl, bw * .70, .45 * P['height']
    reach = P['span'] - shoulder_y
    u = (abs(q.y) - shoulder_y) / reach
    c0 = P['chord'][0]
    lead = shoulder_x + c0 * (.16 * math.sin(math.pi * min(max(u, 0) / .42, 1) / 2) - .45 * max(0, (u - .42) / .58) ** 1.4)
    chord = c0 * (1 - .08 * min(max(u, 0) / .42, 1) - .55 * max(0, (u - .42) / .28) ** 1.2)
    back = (lead - q.x) / max(chord, .02)
    upper = o.mix(BLACKISH, BROWN, .30 + .45 * o.mottle(p, 2.5))
    if abs(q.y) < bw * 1.05:
        return upper                                        # the folded wing on the flank
    below = q.z < shoulder_z - .0012
    flight = u > .66 or back > .42                          # primaries and secondaries
    if below and flight:
        return o.mix(SILVER, (.36, .33, .30), .5 * (math.sin(q.y * 95) > .55))
    if below:
        return BLACKISH                                     # dark wing lining
    return o.mix(upper, (.11, .09, .075), .5 * flight)


def tail(f, p):
    import original as o
    q = f.b(p)
    return o.mix(plumage(f, p), (.12, .11, .10), .5 * (q.z < .02 * P['height'] - .002))


def bill(f, p):
    return IVORY if p.x > head_centre(f).x + P['head'] * .95 else RED


def leg(f, p):
    import original as o
    return plumage(f, p) if p.z > .085 else o.mix(LEG, (.60, .56, .50), .5 * o.mottle(p, 8))


PAINT = {'body': plumage, 'head': head, 'wing': wing, 'tail': tail, 'bill': bill, 'leg': leg}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
