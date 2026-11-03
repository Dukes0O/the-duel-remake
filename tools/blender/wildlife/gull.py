"""Azure Riviera yellow-legged gull: an original recipe (bird.py rig).

About 0.6 m long with a 1.4 m span: white head, neck, breast and tail, a
pale grey back and wings, black wing tips with white spots, a yellow bill
with a red spot near the tip, yellow legs. Long pointed wings. Idle:
standing level, wings folded, looks round. Fly: steady, easy wingbeats.
"""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

ID = 'gull'
WHITE = (.68, .68, .66)
GREY = (.26, .28, .31)
BLACK = (.012, .012, .013)
YELLOW = (.55, .38, .04)
RED = (.45, .04, .02)

P = {'body': .26, 'width': .075, 'height': .08, 'neck': (.04, .06), 'head': .045,
     'bill': (.060, .022, .016, .25), 'tail': (.14, .09, 'round'), 'span': .70,
     'primaries': (6, .24, .045, 26, False), 'chord': (.20, .10), 'leg': .07, 'stance': .04, 'toe': .006,
     'toes': [(0, .05), (30, .045), (-30, .045)], 'tilt': 12, 'beat': 18, 'flap': .55, 'fold': .16}


def body(f, p):
    import original as o
    q = f.b(p)
    return o.mix(WHITE, GREY, o.smooth((q.z - .45 * P['height']) / .015))   # grey mantle


def wing(f, p):
    import original as o
    q = f.b(p)
    span = abs(q.y)
    # Spread wing: black tips from 78 % of the span, white spots at the very end.
    tip = o.smooth((span - .78 * P['span']) / .03)
    # Folded wing: the primaries crossing past the tail are black.
    folded = o.smooth((-q.x - .5 * P['body'] - .05) / .03) * (span < .9 * P['width'])
    colour = o.mix(GREY, BLACK, max(tip, folded))
    spot = (span > .95 * P['span']) or (folded > .5 and -q.x > .5 * P['body'] + P['fold'] * .85)
    return WHITE if spot else colour


def bill(f, p):
    from mathutils import Vector
    head_c = f.w((.42 * P['body'], 0, .10 * P['height'])) + Vector((P['neck'][0], 0, P['neck'][1]))
    tip_x = head_c.x + P['head'] * .78 + P['bill'][0]
    return RED if p.x > tip_x - .018 and p.z < head_c.z - P['head'] * .12 - .006 else YELLOW


PAINT = {'body': body, 'head': lambda f, p: WHITE, 'wing': wing, 'tail': lambda f, p: WHITE,
         'bill': bill, 'leg': lambda f, p: YELLOW}


def build(output, c, cache):
    import bird
    bird.build(ID, P, PAINT, output, c)


if __name__ == '__main__':
    cli(ID, build, motion='Fly')
