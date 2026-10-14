"""Check that the committed golden fixtures still match the Python toolkit.

Regenerates the fixtures into a temporary folder and compares them with the
committed ones: strings, integers and booleans exactly, floats within 1e-9
(compilers on different platforms may differ in the last digits).
Run from the repository root:  python web/scripts/compare_fixtures.py
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from __future__ import annotations

import json
import math
from datetime import datetime
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen_fixtures  # noqa: E402

TOLERANCE = 1e-9
# Swiss Ephemeris computes speeds numerically; builds differ by ~1e-8 deg/day.
SPEED_TOLERANCE = 1e-7
TIME_TOLERANCE_S = 0.001


def _instant(text):
    try:
        return datetime.fromisoformat(text) if 'T' in text and len(text) >= 19 else None
    except ValueError:
        return None


def diff(a, b, path='$'):
    if isinstance(a, float) or isinstance(b, float):
        if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool) and not isinstance(b, bool):
            tol = SPEED_TOLERANCE if path.endswith('.speed') else TOLERANCE
            if math.isclose(a, b, rel_tol=tol, abs_tol=tol):
                return
        yield f'{path}: {a!r} != {b!r}'
    elif isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b:
                yield f'{path}.{k}: present on one side only'
            else:
                yield from diff(a[k], b[k], f'{path}.{k}')
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            yield f'{path}: length {len(a)} != {len(b)}'
        for i, (x, y) in enumerate(zip(a, b)):
            yield from diff(x, y, f'{path}[{i}]')
    elif isinstance(a, str) and isinstance(b, str) and a != b and _instant(a) and _instant(b):
        # Timestamps from numerical searches (solar returns, dasha splits) differ by microseconds across platforms.
        if abs((_instant(a) - _instant(b)).total_seconds()) > TIME_TOLERANCE_S:
            yield f'{path}: {a!r} != {b!r}'
    elif a != b:
        yield f'{path}: {a!r} != {b!r}'


def main() -> int:
    committed = gen_fixtures.OUT
    with tempfile.TemporaryDirectory() as tmp:
        gen_fixtures.OUT = Path(tmp)
        gen_fixtures.main()
        problems = []
        for fresh in sorted(Path(tmp).glob('*.json')):
            old = committed / fresh.name
            if not old.exists():
                problems.append(f'{fresh.name}: not committed')
                continue
            problems += [f'{fresh.name} {p}' for p in diff(json.loads(old.read_text(encoding='utf-8')), json.loads(fresh.read_text(encoding='utf-8')))]
    for p in problems[:200]:
        print(p)
    print('fixtures match' if not problems else f'{len(problems)} differences')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
