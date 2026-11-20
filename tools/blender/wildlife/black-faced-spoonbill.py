"""City black-faced spoonbill: an original recipe (shared bird rig in bird.py).

The rare spoonbill of East Asian harbours and mudflats, about 0.75 m long
and 0.7 m tall standing, with a 1.1 m span: all white, bare black skin over
the face from the bill to behind the eye, a long black bill that is flat and
widens to a spoon at its tip, long black legs, and a short loose crest on
the back of the head. The spoon is its own flat piece on the head bone.
Idle: stands with the bill held down, as the bird carries it, and looks
round. Fly: steady beats with the neck and bill stretched out ahead and the
legs trailing.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'black-faced-spoonbill'
WHITE = (.97, .97, .93)
SHADE = (.72, .74, .77)
CREAM = (.66, .58, .36)
BLACK = (.014, .014, .015)
BILL = (.030, .029, .030)

P = {'body': .34, 'width': .082, 'height': .096, 'neck': (.090, .190), 'head': .033, 'neck_r': .78,
     'bill': (.185, .007, .010, 0), 'tail': (.09, .065, 'round'), 'span': .56,
     'primaries': (5, .19, .062, 30, False), 'body_sides': 14, 'fold_sides': 8, 'chord': (.27, .17), 'fold': .06,
     'leg': .30, 'stance': .042, 'toe': .0065, 'toes': [(0, .080), (30, .070), (-30, .070), (180, .036)],
     'tilt': 14, 'beat': 22, 'flap': .50, 'shag': .02, 'roughness': .9, 'specular': .3, 'refine': 1950}
BILL_DROP = .50      # radians the bill is carried below level when standing


def white(f, p):
    import original as o
    return o.mix(WHITE, SHADE, .16 * o.mottle(p, 3.0))


def head(f, p):
    import original as o
    import city_parts as cp
    d = (p - cp.head_centre(P, f)) / P['head']
    # Bare black skin from the bill back past the eye; the crown stays white.
    face = o.smooth((d.x - .18) / .22) * o.smooth((.62 - d.z) / .25)
    return o.mix(white(f, p), BLACK, face)


def spoon(a, f, head_c, hr):
    """The flat bill with its spoon, and the loose crest on the nape."""
    import city_parts as cp
    from mathutils import Vector
    base = head_c + Vector((hr * .70, 0, -hr * .12))
    tip = cp.bill_tip(P, f)
    # A flat strap over bird.py's tapering bill, widening to the spoon.
    a.loft([(tuple(base.lerp(tip, u)), w, h) for u, w, h in
            ((0, .013, .0110), (.25, .0105, .0080), (.62, .0095, .0058), (.80, .0150, .0048),
             (.90, .0220, .0044), (.97, .0190, .0038), (1.0, .0070, .0024))], BILL, 'head', 10)
    up = (0, 0, 1)
    for k, s in enumerate((0, 1, -1)):
        root = head_c + Vector((-hr * .75, s * hr * .22, hr * .30))
        end = root + Vector((-.060 - .008 * (k == 0), s * .010, -.030))
        a.blade([(tuple(root + Vector((0, .006, 0))), tuple(root - Vector((0, .006, 0))), .003, up),
                 (tuple(end + Vector((0, .002, 0))), tuple(end - Vector((0, .002, 0))), .001, up)], CREAM, 'head')


def idle_pose(obj, t):
    import original as o
    o.turn(obj, 'head', BILL_DROP)


def fly_pose(obj, t):
    import original as o
    for side in 'LR':
        o.turn(obj, 'leg.' + side, .20)     # legs trail straight out behind


P['extra'] = spoon
P['idle_pose'] = idle_pose
P['fly_pose'] = fly_pose
PAINT = {'body': white, 'head': head, 'wing': white, 'tail': white, 'bill': lambda f, p: BILL, 'leg': lambda f, p: BLACK}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
