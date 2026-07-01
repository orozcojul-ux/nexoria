#!/usr/bin/env python3
"""Crée ou met à jour le compte système Naria (alias — préférez create_system_sentinels.py).

Usage:
  python scripts/create_naria_system_user.py --dry-run
  python scripts/create_naria_system_user.py --apply
  python scripts/create_naria_system_user.py --verify
"""
from __future__ import annotations

import runpy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

if __name__ == "__main__":
    target = Path(__file__).resolve().parent / "create_system_sentinels.py"
    sys.argv[0] = str(target)
    runpy.run_path(str(target), run_name="__main__")
