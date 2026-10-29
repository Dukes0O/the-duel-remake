"""North woods white-tailed-deer recipe. See common.py for construction and CLI."""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import cli

if __name__ == '__main__':
    cli('white-tailed-deer')
