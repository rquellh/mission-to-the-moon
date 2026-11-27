"""What check.py and sheets.py both read a recording with: its tables, its numbers, the mission
clock as text, and the timeline's ships column. Only the standard library, since check.py runs
without PIL.
"""

import os


def number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def read_tsv(path):
    """The rows of a table as dicts by its head; [] when there is no file. A row with more or fewer
    cells than the head is left out."""
    if not os.path.exists(path):
        return []
    with open(path, encoding='utf-8') as handle:
        lines = handle.read().rstrip('\n').split('\n')
    head = lines[0].split('\t')
    rows = []
    for line in lines[1:]:
        cells = line.split('\t')
        if len(cells) == len(head):
            rows.append(dict(zip(head, cells)))
    return rows


def clock_text(seconds):
    if seconds is None:
        return '---:--:--'
    sign = '-' if seconds < 0 else ''
    s = int(round(abs(seconds)))
    return f'{sign}{s // 3600:03d}:{s % 3600 // 60:02d}:{s % 60:02d}'


def parse_ships(text):
    """'csm:943,438,40x18@1.00 lm:gone' -> {'csm': {...}, 'lm': {'gone': True}}"""
    ships = {}
    if not text or text == '-':
        return ships
    for item in text.split(' '):
        if ':' not in item:
            continue
        name, rest = item.split(':', 1)
        if rest == 'gone':
            ships[name] = {'gone': True, 'box': None, 'fade': 0.0, 'dot': False}
            continue
        dot = rest.endswith('+dot')
        rest = rest[:-4] if dot else rest
        where, _, fade = rest.partition('@')
        box = None
        if where != '-':
            x, y, size = where.split(',')
            w, h = size.split('x')
            box = (float(x), float(y), float(w), float(h))
        ships[name] = {'gone': False, 'box': box, 'fade': number(fade) or 0.0, 'dot': dot}
    return ships
