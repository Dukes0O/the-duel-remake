"""Alps alpine marmot: the passed yellow-bellied marmot recipe, recoloured.

Same chunky body, distinct head and neck, forelegs with claws and short
bushy tail (yellow-bellied-marmot.py, loaded unchanged). The alpine marmot
is greyer on the back with paler buff tips, has a buff-orange rather than
yellow belly, a grey-brown crown and a paler cream face and muzzle, and a
darker tail tip.
"""
import importlib.util
import sys
from pathlib import Path
sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from common import cli

ID = 'alpine-marmot'
COLOURS = {'BACK': (.072, .064, .054), 'BUFF': (.31, .29, .24), 'YELLOW': (.27, .18, .085),
           'HEAD': (.060, .052, .044), 'PALE': (.44, .42, .37), 'TAIL': (.060, .046, .034)}


def build(output, c, cache):
    spec = importlib.util.spec_from_file_location('yellow_bellied_marmot', HERE / 'yellow-bellied-marmot.py')
    recipe = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(recipe)
    recipe.ID = ID
    for name, value in COLOURS.items():
        setattr(recipe, name, value)
    recipe.build(output, c, cache)


if __name__ == '__main__':
    cli(ID, build)
