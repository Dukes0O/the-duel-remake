"""Panorama Ridge sulphur-crested cockatoo: an original recipe (bird.py rig).

About 0.48 m long: white plumage with a pale yellow wash under the wings
and tail, a long curved sulphur-yellow crest, a short deep hooked grey-black
bill, a bare pale blue-white eye ring and grey feet. Idle: perched, wings
folded, looks round. Fly: quick, shallow wingbeats.
"""
import math
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'sulphur-crested-cockatoo'
WHITE = (.66, .66, .62)
WASH = (.66, .58, .30)
YELLOW = (.62, .42, .05)


def crest(a, f, head_c, hr):
    from mathutils import Vector
    base = head_c + Vector((-hr * .05, 0, hr * .86))
    for k in range(5):
        theta = math.radians(22 + 14 * k)
        length = hr * (2.3 - .18 * abs(k - 2))
        y = (k - 2) * hr * .08
        path = [base + Vector((-hr * .2, y, 0)),
                base + Vector((-math.cos(theta) * length * .55, y * 1.6, math.sin(theta) * length * .55)),
                base + Vector((-math.cos(theta) * length + length * .22, y * 2, math.sin(theta) * length + length * .10))]
        widths = [hr * .16, hr * .13, hr * .02]
        stations = [(tuple(p + Vector((0, w, 0))), tuple(p - Vector((0, w, 0))), .003, (1, 0, 0))
                    for p, w in zip(path, widths)]
        a.blade(stations, YELLOW, 'head')


def under(f, p, shoulder_z):
    import original as o
    return o.mix(WHITE, WASH, o.smooth((shoulder_z - f.b(p).z - .002) / .004))


P = {'body': .20, 'width': .058, 'height': .062, 'neck': (.028, .062), 'head': .046,
     'bill': (.034, .034, .026, .95), 'tail': (.17, .065, 'round'), 'span': .48,
     'primaries': (6, .15, .044, 36, False), 'chord': (.17, .10), 'leg': .055, 'stance': .024, 'toe': .0062,
     'toes': [(18, .036), (-18, .036), (160, .030), (-160, .030)], 'tilt': 45, 'beat': 12,
     'extra': crest, 'flap': .55}

PAINT = {'body': lambda f, p: WHITE, 'head': lambda f, p: WHITE,
         'wing': lambda f, p: under(f, p, .45 * P['height']),
         'tail': lambda f, p: under(f, p, .02 * P['height']),
         'bill': lambda f, p: (.022, .021, .022), 'leg': lambda f, p: (.085, .085, .085),
         'eyering': lambda f, p: (.52, .60, .68)}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
