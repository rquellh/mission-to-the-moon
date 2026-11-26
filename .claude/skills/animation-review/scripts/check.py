"""Check a recording made by record.mjs against the standards that numbers can judge.

Usage: python3 .claude/skills/animation-review/scripts/check.py <recording-dir> [--summary]
       python3 .claude/skills/animation-review/scripts/check.py <sweep-dir>     (record.mjs ... all)

Reads meta.json, events.json, timeline.tsv, camera.tsv and cast/ in the folder, prints the
report (all of it, or with --summary only the build line and the signals), and writes the
files below. Given a folder of recordings, it checks each one again and prints one line a
recording with each signal's state. It writes, in each recording:
  check.txt         the whole report
  camera-table.tsv  the camera log turned into motion, one row a frame (see references/recording-files.md)
  marks.tsv         the moments worth a closer look, which sheets.py --auto draws at 0.1 s

The thresholds below are rules of thumb for finding moments to look at, not the standards
themselves: a mark is a place to look, and its absence is not a pass. Only the pictures decide.
"""

import bisect
import json
import math
import os
import sys

# Rules of thumb for the marks (see the module docstring).
JUMP_PX = 40  # the followed craft moves this far on screen between two frames (or 4% of the diagonal)
TURN_DEG_S = 60  # the camera's view direction turns faster than this
ROLL_DEG_S = 20  # the camera rolls about its view direction faster than this
TILT_DEG = 25  # in the ship view, the craft's local up is this far off the screen's up
COVER_HIGH = 0.7  # a body covers this share of the screen
COVER_RISE = 0.3  # or its share rises this much within a second
REST_TURN_DEG_S = 0.5  # with the clock stopped, a camera turning faster than this is moving
REST_SHIFT_PX_S = 4  # or a body's centre sliding faster than this on screen
STALL_S = 0.25  # a frame gap this long
LAP_LIMIT = 1 / 20  # standard 7: a drawn craft no faster than about one lap in 20 seconds (a working figure, not the owner's; see SKILL.md)
DRAWN = 0.5  # a model at least this opaque counts as drawn
STORY_TOLERANCE = 0.15  # story seconds the card may lead the clock (sampling)
# Standard 22, the stand-in: in fast forward a craft's model glides round its ring, not at its true place.
GLIDE_EASE_S = 1.0  # its first second eases from the pace it set off at to its own (FAST_FORWARD_GLIDE_EASE_SECONDS): not judged for steadiness
GLIDE_WINDOW_S = 1.0  # its pace is taken over this much real time (the frames' own steps are uneven)
GLIDE_STEADY = 0.2  # once eased in, its pace stays within this share of its usual pace
GLIDE_FRAME_S = 0.12  # but not judged over a frame longer than this (the scene steps it at most 0.1 s a frame)
GLIDE_STOP_S = 0.25  # it stands still this long while the clock runs
NO_DIP_DEG = 3  # between two frames, drawn, the model moves this many degrees round the body, plus what one lap in 20 s covers in that time
NO_DIP_PX = 30  # or this many pixels for each 0.1 s between the two frames
OFF_RING_PX = 6  # after its first second, the stand-in is this far from its ring on screen
HANDBACK_LOOK_S = 0.75  # how far either side of a hand-back's move to look for its dip
# The 3D view faded below this (the page fading it in as it loads, or a change of view dissolving through
# it) counts as hidden: a cut made under it is no move, so marks measured across it are left out.
HIDDEN = 0.25


def number(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def read_tsv(path):
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


def span_text(seconds):
    s = abs(seconds)
    if s >= 86400:
        return f'{int(s // 86400)} d {int(s % 86400 // 3600)} h {int(s % 3600 // 60)} m'
    if s >= 3600:
        return f'{int(s // 3600)} h {int(s % 3600 // 60)} m'
    if s >= 60:
        return f'{int(s // 60)} m {int(s % 60)} s'
    return f'{s:.0f} s'


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


def union_box(boxes):
    """The box round some boxes, each (center x, center y, width, height)."""
    left = min(x - w / 2 for x, y, w, h in boxes)
    right = max(x + w / 2 for x, y, w, h in boxes)
    top = min(y - h / 2 for x, y, w, h in boxes)
    bottom = max(y + h / 2 for x, y, w, h in boxes)
    return ((left + right) / 2, (top + bottom) / 2, right - left, bottom - top)


def boxes_meet(a, b):
    """True when two boxes (center x, center y, width, height) overlap."""
    return abs(a[0] - b[0]) * 2 < a[2] + b[2] and abs(a[1] - b[1]) * 2 < a[3] + b[3]


def parse_values(text):
    """'csm:0.12345 lm:- agena:gone' -> {'csm': 0.12345, 'lm': None, 'agena': None}; {} for a recording without the column."""
    values = {}
    for item in (text or '').split(' '):
        if ':' in item:
            name, value = item.split(':', 1)
            values[name] = number(value)
    return values


def parse_rect(text):
    if not text or text == '-':
        return None
    x, y, size = text.split(',')
    w, h = size.split('x')
    return (float(x), float(y), float(w), float(h))


def angle_between(a, b):
    cross = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    return math.degrees(math.atan2(math.sqrt(sum(c * c for c in cross)), sum(x * y for x, y in zip(a, b))))


def roll_between(f0, u0, f1, u1):
    """Signed turn of the camera's up about its view direction, from one frame to the next (degrees)."""
    d = sum(x * y for x, y in zip(u0, f1))
    p = [u0[i] - d * f1[i] for i in range(3)]
    n = math.sqrt(sum(x * x for x in p))
    if n < 1e-9:
        return 0.0
    p = [x / n for x in p]
    cross = (p[1] * u1[2] - p[2] * u1[1], p[2] * u1[0] - p[0] * u1[2], p[0] * u1[1] - p[1] * u1[0])
    sin = sum(c * f for c, f in zip(cross, f1))
    cos = sum(x * y for x, y in zip(p, u1))
    return math.degrees(math.atan2(sin, cos))


def shown_of(raw):
    """How much of the 3D view showed in a camera or timeline row: 1 in a recording made before it was logged."""
    value = number(raw.get('shown', '-'))
    return 1.0 if value is None else value


def hidden_between(rows, t0, t1):
    """True when the picture was hidden (see HIDDEN) in any camera row from t0 to t1."""
    return any(t0 <= r['t'] <= t1 and r['shown'] < HIDDEN for r in rows)


def disc_cover(cx, cy, r, w, h):
    """Share of a w x h screen covered by a disc (cx, cy, r); 0 when the body is behind the camera."""
    if r is None or cx is None or cy is None or math.isnan(r):
        return 0.0
    columns = 200
    covered = 0.0
    for k in range(columns):
        x = (k + 0.5) * w / columns
        dx = x - cx
        if abs(dx) >= r:
            continue
        half = math.sqrt(r * r - dx * dx)
        covered += max(0.0, min(h, cy + half) - max(0.0, cy - half))
    return covered / (columns * h)


class Recording:
    def __init__(self, folder):
        self.dir = folder
        self.meta = self.load_json('meta.json')
        self.flight = self.load_json('events.json')
        self.timeline = read_tsv(os.path.join(folder, 'timeline.tsv'))
        self.camera = read_tsv(os.path.join(folder, 'camera.tsv'))
        cast = os.path.join(folder, 'cast')
        names = sorted(os.listdir(cast)) if os.path.isdir(cast) else []
        self.frames = sorted(
            (int(name[1:-4]) * (-1 if name[0] == 'm' else 1)) / 1000 for name in names if name.endswith('.jpg')
        )
        self.events = self.flight.get('events', [])
        self.keys = self.flight.get('keys', [])
        size = self.meta.get('size', {})
        self.width = size.get('width', 1440)
        self.height = size.get('height', 900)
        for row in self.timeline:
            row['_t'] = number(row['t'])
            row['_clock'] = number(row['clock'])
            row['_story'] = number(row['story'])
            row['_ships'] = parse_ships(row['ships'])
            row['_left'] = parse_ships(row.get('left'))
            row['_clear'] = parse_rect(row['clear'])
            # Each craft's glide while its model is a stand-in (None while it is at its true place), and its true laps.
            # A recording from before the stand-in has neither column: no stand-in anywhere.
            row['_glides'] = parse_values(row.get('glide'))
            row['_laps'] = parse_values(row.get('laps'))
            row['_fflaps'] = number(row.get('fflaps'))
            row['_speed'] = number(row.get('speed'))
        # Until the page is revealed (body.is-ready), the loading screen covers the scene: no marks there.
        self.ready_from = -math.inf
        ready = [row['_t'] for row in self.timeline if 'is-ready' in row['classes'].split(' ')]
        if ready and self.timeline and ready[0] > self.timeline[0]['_t']:
            self.ready_from = ready[0]
        # Recorded by a probe that reads the stand-in (cast.mjs's standin and glide columns).
        self.knows_stand_ins = bool(self.timeline) and 'glide' in self.timeline[0]

    def load_json(self, name):
        path = os.path.join(self.dir, name)
        if not os.path.exists(path):
            return {}
        with open(path, encoding='utf-8') as handle:
            return json.load(handle)

    def story_of(self, mission):
        keys = self.keys
        if mission is None or not keys:
            return None
        if mission <= keys[0][0]:
            return keys[0][1]
        for (a, sa), (b, sb) in zip(keys, keys[1:]):
            if a <= mission <= b:
                return sa + (mission - a) / (b - a) * (sb - sa) if b > a else sa
        return keys[-1][1]

    def reached(self, mission):
        """The event the clock has reached: the last at or before it (as MissionIndex.eventAt)."""
        found = None
        for event in self.events:
            if event['seconds'] <= mission + 0.01:
                found = event
        return found

    def card_event(self, title, mission):
        """The event a card title names; of several with that title, the one nearest the clock."""
        matches = [event for event in self.events if event['title'] == title]
        if not matches:
            return None
        return min(matches, key=lambda event: abs(event['seconds'] - mission))

    def tour_at(self, t):
        """'way' while the tour is on its way to a stop or plays the stop's own action (the button reads Skip), 'stop' at rest at one, None off the tour."""
        row = self.timeline_at(t)
        if not row or 'Stop' not in row['counter']:
            return None
        return 'way' if 'On the way' in row['counter'] or 'Skip' in (row.get('button') or '') else 'stop'

    def timeline_at(self, t):
        best = None
        for row in self.timeline:
            if row['_t'] is None:
                continue
            if best is None or abs(row['_t'] - t) < abs(best['_t'] - t):
                best = row
            elif row['_t'] > t:
                break
        return best


def out(lines, text=''):
    lines.append(text)


def build_lines(rec):
    meta = rec.meta
    stamp = meta.get('stamp') or {}
    lines = []
    changed = stamp.get('changed') or []
    app = [c for c in changed if c[3:].startswith(('src/', 'index.html', 'public/'))]
    dirty = f"{stamp.get('dirty')} changed files, {len(app)} of them in the app" if stamp.get('dirty') else 'clean'
    served = 'the dev server serves this tree' if stamp.get('servedMatches') else (
        'WARNING: the dev server serves a different copy of ' + ', '.join(stamp.get('servedDiffers') or ['?'])
    )
    out(lines, f"build   {stamp.get('commit', '?')} on {stamp.get('branch', '?')}, {dirty}, {stamp.get('recordedAt', '?')}; {served}")
    if stamp.get('load') is not None and stamp.get('cores'):
        busy = stamp['load'] > stamp['cores']
        out(lines, f"machine load {stamp['load']:.0f} on {stamp['cores']} cores" +
            ('; WARNING: busy, so frames come slowly and slow frames change what the scene does' if busy else ''))
    mode = meta.get('mode', '?')
    what = f"{mode} {meta.get('mission', '')} {meta.get('where', '')}"
    leaving = meta.get('leaving')
    if leaving:
        what += f" (leaving stop {leaving['stop']} of {leaving['stops']}, {leaving['card']}; next: {leaving.get('next') or 'the end'})"
    if mode == 'explore':
        what += f" in the {meta.get('view')} view"
    screen = f"{rec.width}x{rec.height}" + (f" dpr {meta.get('dpr')}" if meta.get('dpr', 1) != 1 else '')
    screen += ' phone' if meta.get('mobile') else ''
    screen += ' reduced motion' if meta.get('reducedMotion') else ''
    steps = ' '.join(meta.get('before', []))
    out(lines, f"record  {what}; {screen}; press {meta.get('press')}{'; before ' + steps if steps else ''}"
        f"{'; after ' + ' '.join(meta.get('after', [])) if meta.get('after') else ''}; ended: {meta.get('ended')}")
    if meta.get('consoleErrors'):
        out(lines, f"console {len(meta['consoleErrors'])} errors: {meta['consoleErrors'][0][:160]}")
    return lines


def clock_ran(rec, a, b):
    """Whether the story clock moved between real times a and b (from the camera log, else the timeline)."""
    rows = rec.camera if rec.camera else rec.timeline
    before = None
    after = None
    for row in rows:
        t = number(row['t'])
        if t is None:
            continue
        if t <= a:
            before = row
        if t >= b:
            after = row
            break
    if before is None or after is None:
        return None
    s0, s1 = number(before['story']), number(after['story'])
    if s0 is None or s1 is None:
        return None
    return abs(s1 - s0) > 1e-3


def frame_lines(rec, signals):
    lines = []
    frames = [t for t in rec.frames if t >= 0]
    if len(frames) < 2:
        out(lines, f'frames  {len(frames)} after the mark')
        signals.append(('frames', 'ok', f'{len(frames)} frames: the page hardly drew'))
        return lines
    gaps = [(b - a, a, b) for a, b in zip(frames, frames[1:])]
    span = frames[-1] - frames[0]
    median = sorted(g for g, _, _ in gaps)[len(gaps) // 2]
    out(lines, f'frames  {len(frames)} after the mark over {span:.1f} s: {len(frames) / span:.1f} a second, median gap {median * 1000:.0f} ms')
    stalls, rests, running = [], [], []
    for gap, a, b in gaps:
        ran = clock_ran(rec, a, b)
        if ran:
            running.append(gap)
        if gap < STALL_S:
            continue
        (stalls if ran else rests).append((gap, a, ran))
    slow = sorted(running)[len(running) // 2] if running else 0
    if slow > 0.2:
        # Too few frames to judge motion by, and slow frames change what the scene does, not only how it looks.
        signals.append(('frames', 'REDO', f'only {1 / slow:.1f} frames a second while the clock ran: record again on a quiet machine'))
        out(lines, f'        WARNING: {1 / slow:.1f} frames a second while the clock ran; record again before judging')
    elif stalls:
        out(lines, '        stalls (no frame while the clock ran): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a, _ in stalls[:12]))
        signals.append(('frames', 'LOOK', f'{len(stalls)} gaps while the clock ran, longest {max(g for g, _, _ in stalls):.2f} s'))
    else:
        signals.append(('frames', 'ok', f'no frame gap of {STALL_S} s or more while the clock ran'))
    if rests:
        out(lines, '        rests (no frame, clock stopped: nothing to draw): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a, _ in rests[:8]))
    # The page's own frames (requestAnimationFrame), which run whether or not anything is drawn.
    ticks = [number(row['t']) for row in rec.camera]
    ticks = [t for t in ticks if t is not None]
    long_ticks = [(b - a, a) for a, b in zip(ticks, ticks[1:]) if b - a >= STALL_S]
    if long_ticks:
        out(lines, '        slow page frames (main thread busy): ' + ', '.join(f'{g:.2f} s at {a:.2f} s' for g, a in long_ticks[:10]))
    return lines


def change_lines(rec):
    lines = [' ', 'changes (timeline, every 100 ms)', '     t       clock     story  what changed']
    last = {}
    for row in rec.timeline:
        notes = []
        drawn = ' '.join(
            f'{name}' + ('' if ship['fade'] >= 0.99 else f'@{ship["fade"]:.2f}')
            for name, ship in row['_ships'].items()
            if ship['box'] and ship['fade'] > 0.05
        ) or 'none'
        values = {
            'counter': row['counter'],
            'button': row['button'],
            'play': row['play'],
            'card': row['card'],
            'view': row['view'],
            'scale': row['scale'],
            'ff': row['ff'],
            'fastview': 'on' if (number(row['fastview']) or 0) > 0.001 else 'off',
            'followed': row['followed'],
            'playing': row['playing'],
            'tween': row['tween'],
            'usermoved': row['usermoved'],
            'ending': row['ending'],
            'clear': row['clear'],
            'drawn': drawn,
            'dock': row['dock'],
            'left': ' '.join(item.split(':')[0] for item in row['left'].split(' ')
                             if item.split(':', 1)[-1] not in ('-', '')) or 'none',
            # The 3D view fading out and in (loading, or a change of view dissolving through it).
            'picture': 'shown' if shown_of(row) >= 0.99 else 'hidden' if shown_of(row) < HIDDEN else 'fading',
        }
        for key, value in values.items():
            if last.get(key) != value:
                if key == 'drawn' and key in last:
                    # Report fades in steps of a tenth, not every hundredth.
                    if coarse(last[key]) == coarse(value):
                        continue
                notes.append(f'{key} {value}' if key not in ('card', 'counter') else f'{key} "{value}"')
                last[key] = value
        if notes:
            out(lines, f"{row['_t']:6.2f}  {clock_text(row['_clock'])}  {row['_story'] if row['_story'] is not None else '-':>7}  " + ' | '.join(notes))
    return lines


def coarse(drawn):
    parts = []
    for item in drawn.split(' '):
        name, _, fade = item.partition('@')
        parts.append(name + (f'@{round(float(fade), 1)}' if fade else ''))
    return ' '.join(parts)


def card_lines(rec, signals):
    lines = [' ', 'the card against the clock (standard 1: never a moment the clock has not reached)']
    stretches = []
    for row in rec.timeline:
        card, mission = row['card'], row['_clock']
        if card in ('-', '') or mission is None:
            continue
        event = rec.card_event(card, mission)
        reached = rec.reached(mission)
        if event is None:
            state, lead = 'unknown', 0.0
        else:
            lead_story = (rec.story_of(event['seconds']) or 0) - (row['_story'] if row['_story'] is not None else rec.story_of(mission) or 0)
            lead = event['seconds'] - mission
            if lead_story > STORY_TOLERANCE and lead > 0:
                state = 'ahead'
            elif reached is not None and reached['seconds'] > event['seconds'] + 0.01:
                state = 'behind'
            else:
                state = 'ok'
        key = (card, state)
        if stretches and stretches[-1]['key'] == key and row['_t'] - stretches[-1]['to'] < 0.35:
            stretch = stretches[-1]
            stretch['to'] = row['_t']
            stretch['clock_to'] = mission
            stretch['lead'] = max(stretch['lead'], lead)
            stretch['reached_to'] = reached['title'] if reached else '-'
        else:
            stretches.append({
                'key': key, 'from': row['_t'], 'to': row['_t'], 'clock_from': mission, 'clock_to': mission,
                'lead': lead, 'event': event, 'reached_from': reached['title'] if reached else '-',
                'reached_to': reached['title'] if reached else '-',
            })
    if not stretches:
        out(lines, '  no card shown')
        return lines
    ahead_total, worst = 0.0, 0.0
    for stretch in stretches:
        card, state = stretch['key']
        event = stretch['event']
        when = f"{stretch['from']:5.2f}-{stretch['to']:5.2f} s"
        clocks = f"clock {clock_text(stretch['clock_from'])} to {clock_text(stretch['clock_to'])}"
        if state == 'ahead':
            ahead_total += stretch['to'] - stretch['from'] + 0.1
            worst = max(worst, stretch['lead'])
            out(lines, f"  FAIL   {when}  \"{card}\" ({clock_text(event['seconds'])}) while the {clocks}, "
                f"which has reached \"{stretch['reached_from']}\": up to {span_text(stretch['lead'])} early")
        elif state == 'behind':
            # Not a breach by itself: between stops the tour's card keeps to the last stop reached.
            out(lines, f"  behind {when}  \"{card}\" while the {clocks} has passed \"{stretch['reached_from']}\""
                f" (as intended on the tour, whose card keeps to its stops; in Explore, look)")
        elif state == 'unknown':
            out(lines, f"  ?      {when}  \"{card}\" is not an event title of this flight")
        else:
            out(lines, f"  ok     {when}  \"{card}\", {clocks}")
    if ahead_total:
        signals.append(('1 card', 'FAIL', f'names a moment not reached for {ahead_total:.1f} s, by up to {span_text(worst)}'))
    else:
        signals.append(('1 card', 'ok', 'never ahead of the clock'))
    return lines


def clock_leapt(a, b):
    """Whether the story clock jumped between two samples (a Skip, a seek) rather than ran: more than
    half again its fastest pace covers in that time, and a little."""
    if a['story'] is None or b['story'] is None:
        return False
    span = max(0.0, b['t'] - a['t'])
    fastest = max(1.0, a['speed'] or 0.0, b['speed'] or 0.0)
    return abs(b['story'] - a['story']) > 1.5 * fastest * span + 0.3


def place_where(followed, x, y, x_text, occluded_text, w, h, clear):
    """Where a point the followed craft is drawn at (or would be) lies: in, under, off, behind, hidden, none."""
    if followed == '-' or x is None:
        return 'none' if x_text == '-' and occluded_text == '-' else 'behind'
    if occluded_text == '1':
        return 'hidden'
    if not (0 <= x <= w and 0 <= y <= h):
        return 'off'
    if not (clear[0] + 4 <= x <= clear[0] + clear[2] - 4 and clear[1] + 4 <= y <= clear[1] + clear[3] - 4):
        return 'under'
    return 'in'


def camera_table(rec):
    """The camera log turned into motion, one row a frame.

    Everything about where the followed craft is on screen (sx, sy, jump, where, arc) is where its
    model is drawn: in fast forward that is its stand-in gliding round the ring, not its true place,
    which races round the body (tx, ty, twhere keep that). lapsps is the pace of the model as drawn
    (the stand-in's glide while it is one), truelapsps the pace of its true place.
    """
    rows = []
    previous = []
    diag = math.hypot(rec.width, rec.height)
    clear_rows = [(row['_t'], row['_clear']) for row in rec.timeline if row['_clear']]
    ci = 0
    episodes = 0
    episode_first = {}
    for raw in rec.camera:
        t = number(raw['t'])
        if t is None:
            continue
        f = (number(raw['fx']), number(raw['fy']), number(raw['fz']))
        u = (number(raw['ux']), number(raw['uy']), number(raw['uz']))
        if None in f or None in u:
            continue
        w = number(raw['w']) or rec.width
        h = number(raw['h']) or rec.height
        # Rates over at least 50 ms, so two callbacks a few ms apart do not inflate them.
        base = None
        for old in reversed(previous):
            if t - old['t'] >= 0.05:
                base = old
                break
        last = previous[-1] if previous else None
        view = raw['view']
        body = 'E' if view == 'earth' else 'M' if view == 'moon' else raw['near']
        prefix = 'e' if body == 'E' else 'm'
        dist = number(raw[f'{prefix}d'])
        covers = {}
        for key in ('e', 'm'):
            distance = number(raw[f'{key}d'])
            if distance is not None and distance <= 1:
                covers[key] = 1.0  # the camera is inside the body
            else:
                covers[key] = disc_cover(number(raw[f'{key}x']), number(raw[f'{key}y']), number(raw[f'{key}r']), w, h)
        big = 'e' if covers['e'] >= covers['m'] else 'm'
        # The true place, and where the model is drawn (the same in a recording without the dx column).
        tx, ty = number(raw['sx']), number(raw['sy'])
        drawn_known = 'dx' in raw
        sx, sy = (number(raw['dx']), number(raw['dy'])) if drawn_known else (tx, ty)
        sx_text = raw['dx'] if drawn_known else raw['sx']
        occluded_text = raw.get('doccluded', raw['occluded'])
        fade = number(raw['fade'])
        while ci + 1 < len(clear_rows) and clear_rows[ci + 1][0] <= t:
            ci += 1
        clear = clear_rows[ci][1] if clear_rows else (0, 0, w, h)
        where = place_where(raw['followed'], sx, sy, sx_text, occluded_text, w, h, clear)
        twhere = place_where(raw['followed'], tx, ty, raw['sx'], raw['occluded'], w, h, clear)
        standin = raw.get('standin') == '1'
        direction = tuple(number(raw.get(k)) for k in ('dux', 'duy', 'duz'))
        row = {
            't': t, 'clock': number(raw['clock']), 'story': number(raw['story']), 'playing': raw['playing'] == '1',
            'speed': number(raw['speed']), 'view': view, 'followed': raw['followed'], 'tween': raw['tween'] == '1',
            'usermoved': raw['usermoved'] == '1', 'fastview': number(raw['fastview']) or 0.0, 'fade': fade,
            'laps': number(raw['laps']), 'body': body, 'dist': dist, 'cover': covers[big], 'cover_body': big.upper(),
            'sx': sx, 'sy': sy, 'where': where, 'tx': tx, 'ty': ty, 'twhere': twhere,
            'tilt': number(raw['tilt']), 'tiltw': number(raw['tiltw']) or 0.0,
            'f': f, 'u': u, 'bx': number(raw[f'{prefix}x']), 'by': number(raw[f'{prefix}y']),
            'gap': (t - last['t']) if last else 0.0, 'turn': 0.0, 'roll': 0.0, 'jump': 0.0, 'lapsps': None,
            'truelapsps': None, 'shift': 0.0, 'w': w, 'h': h, 'near': raw['near'],
            'standin': standin, 'glide': number(raw.get('glide')) if standin else None,
            'dir': direction if None not in direction else None, 'arc': None,
            'ring': number(raw.get('ring')) if standin else None, 'episode': None, 'craft': raw['followed'],
            'shown': shown_of(raw), 'dissolve': raw.get('dissolve', '-'),
        }
        # The least the picture showed from the frame each rate is taken from to this one (see HIDDEN).
        row['veil'] = min([row['shown']] + [old['shown'] for old in previous if base and old['t'] >= base['t']])
        if base:
            dt = max(1e-3, t - base['t'])
            row['turn'] = angle_between(base['f'], f) / dt
            row['roll'] = roll_between(base['f'], base['u'], f, u) / dt
            if row['bx'] is not None and base['bx'] is not None:
                row['shift'] = math.hypot(row['bx'] - base['bx'], row['by'] - base['by']) / dt
        # Each stretch the followed craft stands in is an episode; a leap of the clock begins it afresh.
        if standin and row['glide'] is not None:
            same = (last is not None and last['episode'] is not None and last['followed'] == row['followed']
                    and not (row['glide'] < last['glide'] - 1e-6 and clock_leapt(last, row)))
            if same:
                row['episode'] = last['episode']
            else:
                episodes += 1
                row['episode'] = episodes
                episode_first[episodes] = row
        # Laps over half a second: the clock's frame-to-frame steps are too uneven for a shorter window.
        lap_base = None
        for old in reversed(previous):
            if t - old['t'] >= 0.5:
                lap_base = old
                break
        if lap_base and row['laps'] is not None and lap_base['laps'] is not None and lap_base['followed'] == row['followed']:
            # Not across a jump of the clock (a Skip, a seek): the craft did not fly those laps on screen.
            if not clock_leapt(lap_base, row):
                row['truelapsps'] = (row['laps'] - lap_base['laps']) / (t - lap_base['t'])
        # The pace of the model as drawn: its glide while it is a stand-in (over the episode so far when
        # that is under half a second, and at least a quarter), its true place's otherwise, never over a
        # stretch that was partly a stand-in, whose laps the model did not fly.
        if row['episode'] is not None:
            glide_base = None
            for old in reversed(previous):
                if old['episode'] != row['episode']:
                    break
                if t - old['t'] >= 0.5:
                    glide_base = old
                    break
            first = episode_first[row['episode']]
            if glide_base is None and t - first['t'] >= 0.25:
                glide_base = first
            if glide_base is not None:
                row['lapsps'] = (row['glide'] - glide_base['glide']) / (t - glide_base['t'])
        elif row['truelapsps'] is not None:
            since = [old for old in previous if old['t'] > lap_base['t']]
            if not any(old['standin'] for old in since + [lap_base]):
                row['lapsps'] = row['truelapsps']
        if last and sx is not None and last['sx'] is not None:
            row['jump'] = math.hypot(sx - last['sx'], sy - last['sy'])
        # Degrees round the body it is drawn about since the frame before.
        if (last and row['dir'] and last['dir'] and last['near'] == row['near']
                and last['followed'] == row['followed']):
            row['arc'] = angle_between(last['dir'], row['dir'])
        row['jump_limit'] = max(JUMP_PX, 0.04 * diag)
        rows.append(row)
        previous.append(row)
        if len(previous) > 120:  # over half a second even at 60 frames a second
            previous.pop(0)
    return rows


def write_camera_table(rec, rows):
    head = ['t', 'gap', 'clock', 'story', 'playing', 'view', 'followed', 'tween', 'usermoved', 'fastview', 'fade',
            'turn', 'roll', 'tilt', 'body', 'dist', 'cover', 'sx', 'sy', 'jump', 'where', 'lapsps',
            'standin', 'glide', 'arc', 'ring', 'truelapsps', 'tx', 'ty', 'twhere']

    def value(x, digits):
        return f'{x:.{digits}f}' if x is not None else '-'

    with open(os.path.join(rec.dir, 'camera-table.tsv'), 'w', encoding='utf-8') as handle:
        handle.write('\t'.join(head) + '\n')
        for r in rows:
            handle.write('\t'.join([
                f"{r['t']:.3f}", f"{r['gap'] * 1000:.0f}", f"{r['clock']:.0f}" if r['clock'] is not None else '-',
                f"{r['story']:.3f}" if r['story'] is not None else '-', '1' if r['playing'] else '0', r['view'],
                r['followed'], '1' if r['tween'] else '0', '1' if r['usermoved'] else '0', f"{r['fastview']:.2f}",
                f"{r['fade']:.2f}" if r['fade'] is not None else '-', f"{r['turn']:.1f}", f"{r['roll']:.1f}",
                f"{r['tilt']:.1f}" if r['tilt'] is not None else '-', r['body'],
                f"{r['dist']:.3f}" if r['dist'] is not None else '-', f"{r['cover']:.3f}",
                f"{r['sx']:.0f}" if r['sx'] is not None else '-', f"{r['sy']:.0f}" if r['sy'] is not None else '-',
                f"{r['jump']:.0f}", r['where'], f"{r['lapsps']:.3f}" if r['lapsps'] is not None else '-',
                '1' if r['standin'] else '0', value(r['glide'], 5), value(r['arc'], 2), value(r['ring'], 1),
                value(r['truelapsps'], 3), value(r['tx'], 0), value(r['ty'], 0), r['twhere'],
            ]) + '\n')


def find_marks(rec, rows):
    """Moments worth a closer look, each (kind, t, value, note)."""
    marks = []
    for i, r in enumerate(rows):
        if r['t'] < rec.ready_from:
            continue
        # Measured across a hidden picture (see HIDDEN): a cut under a fade, nothing anyone saw move.
        if r['veil'] < HIDDEN:
            continue
        drawn = r['fade'] is not None and r['fade'] >= DRAWN
        prev = rows[i - 1] if i else None
        if prev and r['jump'] > r['jump_limit'] and drawn and (prev['fade'] or 0) >= DRAWN:
            jumped = prev['story'] is not None and r['story'] is not None and abs(r['story'] - prev['story']) > 0.5
            slow = ' after a slow frame' if r['gap'] >= 0.2 else ''
            handing = ' as its stand-in hands back' if prev['standin'] and not r['standin'] else (
                ' as it becomes a stand-in' if r['standin'] and not prev['standin'] else '')
            marks.append(('jump', r['t'], r['jump'], 'the clock jumped' if jumped else
                          f"{r['view']} view, {'camera moving' if r['tween'] else 'no camera move under way'}{slow}{handing}"))
        if r['turn'] > TURN_DEG_S:
            marks.append(('turn', r['t'], r['turn'], 'during a camera move' if r['tween'] else 'with no camera move under way' + (' (visitor)' if r['usermoved'] else '')))
        if abs(r['roll']) > ROLL_DEG_S:
            marks.append(('roll', r['t'], r['roll'], f"{r['view']} view"))
        # Not while a change of view dissolves: the picture fading out is still the last view's.
        if (r['view'] == 'spacecraft' and drawn and not r['tween'] and r['fastview'] < 0.05 and r['tilt'] is not None
                and r['shown'] >= 0.99 and r['dissolve'] == '-'
                and r['tiltw'] > 0.5 and abs(r['tilt']) > TILT_DEG):
            marks.append(('tilt', r['t'], r['tilt'], 'horizon off level in the ship view'))
        if drawn and r['where'] in ('off', 'behind', 'hidden', 'under'):
            marks.append((r['where'], r['t'], r['jump'], f"{r['followed']}{' (its stand-in)' if r['standin'] else ''} {'behind a body' if r['where'] == 'hidden' else 'behind the interface' if r['where'] == 'under' else 'off the screen'}"))
        if r['cover'] > COVER_HIGH:
            marks.append(('swell', r['t'], r['cover'], f"{'Earth' if r['cover_body'] == 'E' else 'the Moon'} covers {r['cover'] * 100:.0f}% of the screen"))
        else:
            for old in rows[max(0, i - 30):i]:
                if r['t'] - old['t'] <= 1.0 and r['cover'] - old['cover'] > COVER_RISE and not hidden_between(rows, old['t'], r['t']):
                    marks.append(('swell', r['t'], r['cover'], f"a body grows from {old['cover'] * 100:.0f}% to {r['cover'] * 100:.0f}% of the screen within a second"))
                    break
        if prev and not r['playing'] and not prev['playing'] and not r['usermoved']:
            if r['turn'] > REST_TURN_DEG_S or r['shift'] > REST_SHIFT_PX_S:
                tour = rec.tour_at(r['t'])
                why = ' (the tour holds on its way)' if tour == 'way' else ' (the tour has arrived)' if tour == 'stop' else ''
                marks.append(('moving-at-rest', r['t'], r['turn'],
                              f"{'a camera move' if r['tween'] else 'the camera settling'} with the clock stopped{why}, "
                              f"{r['view']} view, the body sliding {r['shift']:.0f} px/s"))
        if prev and r['tween'] and not prev['tween'] and r['view'] in ('earth', 'moon'):
            changed = any(old['view'] != r['view'] for old in rows[max(0, i - 8):i])
            if not changed:
                marks.append(('re-aim', r['t'], 0, f"a camera move starts in the {r['view']} view with no change of view"
                              + (' (clock stopped)' if not r['playing'] else '')))
        if prev and r['gap'] >= STALL_S and (r['playing'] or prev['playing']):
            marks.append(('stall', r['t'], r['gap'], 'a slow frame while the clock ran'))
        # The pace of the model as drawn (its stand-in's glide while it is one), in every view.
        if drawn and r['lapsps'] is not None and abs(r['lapsps']) > LAP_LIMIT:
            what = f"{r['followed']}'s stand-in gliding" if r['standin'] else f"{r['followed']} drawn and lapping"
            marks.append(('laps', r['t'], abs(r['lapsps']), f"{what} once in {1 / abs(r['lapsps']):.1f} s"))
    # From the timeline: a craft that vanishes without fading, or jumps in size.
    for prev, row in zip(rec.timeline, rec.timeline[1:]):
        if row['_t'] is None or row['_t'] < rec.ready_from:
            continue
        if prev['_t'] is not None and hidden_between(rows, prev['_t'], row['_t']):
            continue
        for name, ship in row['_ships'].items():
            before = prev['_ships'].get(name)
            if not before or before['box'] is None or before['fade'] < DRAWN:
                continue
            if ship['box'] is None and not ship['gone'] and ship['fade'] >= DRAWN and not ship['dot']:
                x, y, w, h = before['box']
                inside = w < x < rec.width - w and h < y < rec.height - h
                if inside:
                    marks.append(('vanish', row['_t'], 0, f'{name} drawn, then not, without fading'))
            elif ship['box'] is not None and ship['fade'] >= DRAWN:
                size0 = max(before['box'][2], before['box'][3])
                # A craft that leaves part of itself behind (a lander lifting off) is measured with the
                # parts that appear where it was as it does, so splitting in two at one scale is not a
                # jump in size.
                box1 = union_box([ship['box']] + [
                    part['box'] for key, part in row.get('_left', {}).items()
                    if part['box'] is not None and (prev.get('_left', {}).get(key) or {}).get('box') is None
                    and boxes_meet(part['box'], before['box'])])
                size1 = max(box1[2], box1[3])
                if size0 > 6 and size1 > 6 and max(size0, size1) / min(size0, size1) > 1.5:
                    marks.append(('pop', row['_t'], size1 / size0, f'{name} from {size0:.0f} to {size1:.0f} px in 100 ms'))
    # Standard 22: the followed craft's stand-in every frame, every other craft's from the timeline.
    frames = [r['t'] for r in rows]
    for run in runs_of(rows, lambda r: r['followed']):
        name = run[0]['followed']
        if name != '-':
            marks += glide_marks([r for r in run if r['t'] >= rec.ready_from], name, frames)
    for name, run in timeline_runs(rec, followed=False):
        marks += glide_marks([s for s in run if s['t'] >= rec.ready_from], name, frames, slack=0.1)
    return marks


def runs_of(items, key):
    """Consecutive items with the same key, as lists."""
    runs = []
    for item in items:
        if runs and key(runs[-1][-1]) == key(item):
            runs[-1].append(item)
        else:
            runs.append([item])
    return runs


def timeline_samples(rec, name):
    """One craft through the timeline, every 100 ms, in the fields glide_marks reads (where its box is drawn)."""
    samples = []
    for row in rec.timeline:
        if row['_t'] is None:
            continue
        ship = row['_ships'].get(name)
        glide = row['_glides'].get(name)
        box = ship['box'] if ship else None
        samples.append({
            't': row['_t'], 'story': row['_story'], 'speed': row['_speed'], 'playing': row['playing'] == '1',
            # Without a box it is not drawn, whatever fade it was last drawn with (`id:-@fade`).
            'standin': glide is not None, 'glide': glide, 'fade': ship['fade'] if box else 0.0,
            'sx': box[0] if box else None, 'sy': box[1] if box else None, 'dir': None, 'near': None, 'ring': None,
            'laps': row['_laps'].get(name), 'followed': row['followed'], 'gone': bool(ship and ship['gone']),
            'craft': name, 'tween': row['tween'] == '1', 'dot': bool(ship and ship['dot']),
        })
    return samples


def timeline_runs(rec, followed):
    """Each craft's timeline samples, in runs while it is (followed=True) or is not the followed craft."""
    if not rec.knows_stand_ins or not rec.timeline:
        return []
    names = list(rec.timeline[0]['_glides'])
    found = []
    for name in names:
        for run in runs_of(timeline_samples(rec, name), lambda s: s['followed'] == name):
            if (run[0]['followed'] == name) == followed:
                found.append((name, run))
    return found


def stand_in_episodes(samples):
    """(first, last) index of each run of samples in which the craft's model is a stand-in. A leap of
    the clock that begins its glide afresh begins a new one."""
    episodes = []
    start = None
    for i, s in enumerate(samples):
        if not s['standin'] or s['glide'] is None:
            if start is not None:
                episodes.append((start, i - 1))
                start = None
            continue
        if start is not None and s['glide'] < samples[i - 1]['glide'] - 1e-6 and clock_leapt(samples[i - 1], s):
            episodes.append((start, i - 1))
            start = None
        if start is None:
            start = i
    if start is not None:
        episodes.append((start, len(samples) - 1))
    return episodes


def glide_rates(samples, first, last, shortest=0.25):
    """(index, laps a second, base index) through an episode: the glide over GLIDE_WINDOW_S, or over
    the episode so far while it is younger than that (but at least `shortest` seconds)."""
    rates = []
    b = first
    for i in range(first + 1, last + 1):
        t = samples[i]['t']
        while b + 1 < i and t - samples[b + 1]['t'] >= GLIDE_WINDOW_S:
            b += 1
        span = t - samples[b]['t']
        if span >= shortest:
            rates.append((i, (samples[i]['glide'] - samples[b]['glide']) / span, b))
    return rates


def longest_frame(frames, t0, t1):
    """The longest gap between the page's frames (the camera log's times, sorted) from t0 to t1."""
    if not frames:
        return 0.0
    i = max(0, bisect.bisect_right(frames, t0) - 1)
    j = min(len(frames) - 1, bisect.bisect_left(frames, t1))
    return max((frames[k + 1] - frames[k] for k in range(i, j)), default=0.0)


def frames_between(frames, t0, t1):
    """How many frames the page ran after t0 and up to t1."""
    return bisect.bisect_right(frames, t1) - bisect.bisect_right(frames, t0)


def eased_rates(samples, first, rates, frames=None):
    """The rates taken wholly after the glide's first second, leaving out any over a frame longer than
    GLIDE_FRAME_S (the scene moves the stand-in at most 0.1 s a frame, so it falls behind on a slow
    one, as everything the scene steps by frames does); their median (None when too few); and how
    many were left out for a slow frame."""
    start = samples[first]['t']
    eased = [(i, rate, b) for i, rate, b in rates if samples[b]['t'] >= start + GLIDE_EASE_S]
    kept = [(i, rate, b) for i, rate, b in eased
            if longest_frame(frames, samples[b]['t'], samples[i]['t']) <= GLIDE_FRAME_S]
    if len(kept) < 3:
        return kept, None, len(eased) - len(kept)
    ordered = sorted(rate for _, rate, _ in kept)
    return kept, ordered[len(ordered) // 2], len(eased) - len(kept)


def arc_between(a, b):
    """Degrees round the body between where two samples are drawn, or None when unknown."""
    if not a.get('dir') or not b.get('dir') or a.get('near') != b.get('near'):
        return None
    return angle_between(a['dir'], b['dir'])


def glide_marks(samples, name, frames, slack=0.0):
    """Standard 22 for one craft through consecutive samples: camera rows every frame, or timeline
    samples every 100 ms with `slack` 0.1 (a sample is taken between frames and shows the last one
    drawn, so its pace is taken over whole windows only and judged more loosely, and a step is given
    the time of the slowest frame near it). `frames` are the page's frame times. Each mark is
    (kind, t, value, note)."""
    marks = []
    loose = 1 + 2 * slack

    def shown(s):
        """Drawn, as a model or as the dot that stands for one far off in the ship view."""
        return (s['fade'] or 0) >= DRAWN or s.get('dot')

    for first, last in stand_in_episodes(samples):
        rates = glide_rates(samples, first, last, GLIDE_WINDOW_S if slack else 0.25)
        for i, rate, _ in rates:
            if rate > LAP_LIMIT * loose and shown(samples[i]):
                marks.append(('glide-pace', samples[i]['t'], rate,
                              f"{name}'s stand-in glides once in {1 / rate:.1f} s, faster than once in {1 / LAP_LIMIT:.0f} s"))
        eased, usual, _ = eased_rates(samples, first, rates, frames)
        if usual and usual > 0:
            for i, rate, b in eased:
                if abs(rate / usual - 1) > GLIDE_STEADY + 2 * slack and shown(samples[i]):
                    pace = f'once in {1 / rate:.1f} s' if rate > 0 else 'standing still'
                    marks.append(('glide-pace', samples[i]['t'], rate,
                                  f"{name}'s stand-in's pace changes: {pace} over {samples[i]['t'] - samples[b]['t']:.1f} s "
                                  f"against its usual once in {1 / usual:.1f} s"))
        moved_at = samples[first]['t']
        for i in range(first + 1, last + 1):
            a, s = samples[i - 1], samples[i]
            step = s['glide'] - a['glide']
            if step > 1e-7 or not (a['playing'] and s['playing']):
                moved_at = s['t']
                continue
            if not shown(s):
                continue
            if step < -1e-6:
                marks.append(('glide-stop', s['t'], step, f"{name}'s stand-in goes back {-step * 360:.1f} degrees while the clock runs"))
            elif s['t'] - moved_at >= GLIDE_STOP_S + slack and frames_between(frames, moved_at, s['t']) >= 2:
                marks.append(('glide-stop', s['t'], s['t'] - moved_at,
                              f"{name}'s stand-in stands still for {s['t'] - moved_at:.2f} s while the clock runs"))
        for s in samples[first:last + 1]:
            if (s['ring'] is not None and s['ring'] > OFF_RING_PX and s['t'] - samples[first]['t'] >= GLIDE_EASE_S
                    and (s['fade'] or 0) >= DRAWN):
                marks.append(('off-ring', s['t'], s['ring'], f"{name}'s stand-in {s['ring']:.0f} px off its ring"))
    # A move between two frames that only a dip may hide: at a hand-back, or while it stands in.
    # Degrees round the body are where it is drawn in space, whatever the camera does; pixels only
    # while no camera move is under way, since a move slides everything across the screen.
    for a, s in zip(samples, samples[1:]):
        if not (a['standin'] or s['standin']) or clock_leapt(a, s):
            continue
        if min(a['fade'] or 0, s['fade'] or 0) < DRAWN or a['sx'] is None or s['sx'] is None:
            continue
        # A timeline sample shows the last frame drawn before it, which after a slow frame is that much older.
        gap = s['t'] - a['t'] + (max(slack, longest_frame(frames, a['t'] - 0.35, s['t'])) if slack else 0.0)
        arc = arc_between(a, s)
        px = math.hypot(s['sx'] - a['sx'], s['sy'] - a['sy'])
        still = not (a['tween'] or s['tween'])
        if ((arc is not None and arc > NO_DIP_DEG + 360 * LAP_LIMIT * gap)
                or (still and px > NO_DIP_PX * max(1.0, gap / 0.1))):
            how = ('hands back without a dip' if a['standin'] and not s['standin'] else
                   'jumps as it becomes a stand-in' if s['standin'] and not a['standin'] else 'jumps while a stand-in')
            moved = (f'{arc:.0f} degrees round the body, ' if arc is not None else '') + f'{px:.0f} px'
            marks.append(('no-dip', s['t'], px, f"{name} {how}: {moved} between two frames, "
                          f"drawn at {min(a['fade'], s['fade']):.2f}"))
    return marks


def group_marks(marks, reduced_motion=False):
    if reduced_motion:
        # Under reduced motion everything jumps: a cut shows up as a turn, a roll or a jump in one frame.
        marks = [(kind, t, value, note + ' (reduced motion: a cut is expected)') for kind, t, value, note in marks]
    groups = []
    for kind, t, value, note in sorted(marks, key=lambda m: (m[0], m[1])):
        last = groups[-1] if groups else None
        if last and last['kind'] == kind and t - last['to'] <= 0.35:
            last['to'] = t
            if abs(value) > abs(last['peak']):
                last['peak'], last['peak_t'], last['note'] = value, t, note
        else:
            groups.append({'kind': kind, 'from': t, 'to': t, 'peak': value, 'peak_t': t, 'note': note})
    return sorted(groups, key=lambda g: g['from'])


UNITS = {'jump': 'px', 'turn': 'deg/s', 'roll': 'deg/s', 'tilt': 'deg', 'swell': 'of screen', 'moving-at-rest': 'deg/s',
         'stall': 's', 'laps': 'laps/s', 'pop': 'x', 'off': 'px', 'under': 'px', 'hidden': 'px', 'behind': 'px', 're-aim': '', 'vanish': '',
         'glide-pace': 'laps/s', 'glide-stop': '', 'no-dip': 'px', 'off-ring': 'px'}


def mark_lines(groups, signals, rows, stand_ins=True):
    lines = [' ', 'marks: moments worth a closer look (rules of thumb; sheets.py --auto draws each at 0.1 s)']
    if not groups:
        out(lines, '  none')
    for g in groups:
        peak = (f"{g['peak']:.3f}" if g['kind'] in ('laps', 'glide-pace') else
                f"{g['peak']:.2f}" if g['kind'] in ('swell', 'stall', 'pop') else f"{g['peak']:.0f}")
        value = f'{peak} {UNITS[g["kind"]]}' if UNITS[g['kind']] and g['kind'] not in ('off', 'under', 'hidden', 'behind') else ''
        out(lines, f"  {g['kind']:<15} {g['from']:6.2f}-{g['to']:6.2f} s  {value:<18} {g['note']}")
    kinds = {}
    for g in groups:
        kinds.setdefault(g['kind'], []).append(g)
    end = rows[-1]['t'] if rows else 0

    def report(name, wanted, what):
        found = [g for k in wanted for g in kinds.get(k, [])]
        if found:
            first = min(found, key=lambda g: g['from'])
            signals.append((name, 'LOOK', f"{what}: {len(found)} times, first at {first['from']:.2f} s ({first['note']})"))
        else:
            signals.append((name, 'ok', 'no marks'))

    # Each signal carries the numbers of the standards in SKILL.md it bears on.
    report('7 laps', ['laps'], f'a drawn craft laps faster than once in {1 / LAP_LIMIT:.0f} s')
    report('9-10 still', ['moving-at-rest', 're-aim'], 'the camera moves with the clock stopped, or re-aims itself')
    report('11 around', ['swell', 'turn'], 'a body swells or the camera turns fast')
    report('14 level', ['tilt', 'roll'], 'the horizon tilts or the camera rolls')
    report('16-17 in frame', ['off', 'under', 'hidden', 'behind'], 'the followed craft off screen, behind the interface or a body')
    arrival = [r for r in rows if r['t'] >= end - 2.0]
    bad = [r for r in arrival if r['fade'] is not None and r['fade'] >= DRAWN and r['where'] != 'in']
    if arrival and bad:
        signals.append(('17 arrival', 'LOOK', f"in the last 2 s the craft is {bad[-1]['where']} ({len(bad)} of {len(arrival)} frames)"))
    elif arrival:
        signals.append(('17 arrival', 'ok', 'the followed craft is in the clear area through the last 2 s (or not drawn)'))
    report('18-19 pops', ['jump', 'pop', 'vanish'], 'a craft jumps, pops or vanishes')
    if stand_ins:
        report('22 glide', ['glide-pace', 'glide-stop', 'no-dip', 'off-ring'],
               "a stand-in's pace races or changes, it stops, leaves its ring, or hands back without a dip")
    else:
        signals.append(('22 glide', '-', 'not recorded: the probe that made this recording did not read the stand-in'))
    return lines


def pace_lines(rows):
    lines = [' ', 'pace (from the camera log)']
    moving = [r for r in rows if r['playing'] and r['speed'] is not None]
    if not moving:
        out(lines, '  the clock did not run')
        return lines
    top = max(moving, key=lambda r: r['speed'])
    out(lines, f"  fastest story pace {top['speed']:.2f} story s per real s at {top['t']:.2f} s (Explore at 1x is 1.00)")
    drawn = [r for r in moving if r['lapsps'] is not None and r['fade'] is not None and r['fade'] >= DRAWN]
    if drawn:
        lap = max(drawn, key=lambda r: abs(r['lapsps']))
        how = 'its stand-in gliding' if lap['standin'] else 'at its true place'
        out(lines, f"  fastest lapping of a drawn craft, as drawn: {abs(lap['lapsps']):.3f} laps/s (once in {1 / max(1e-9, abs(lap['lapsps'])):.1f} s) at {lap['t']:.2f} s, {lap['followed']} {how}")
    true = [r for r in moving if r['truelapsps'] is not None]
    if true and any(r['standin'] for r in rows):
        lap = max(true, key=lambda r: abs(r['truelapsps']))
        out(lines, f"  fastest lapping of a true place (drawn or not): {abs(lap['truelapsps']):.3f} laps/s (once in {1 / max(1e-9, abs(lap['truelapsps'])):.1f} s) at {lap['t']:.2f} s, {lap['followed']}")
    return lines


def crossing(a, b):
    """When the fade crosses DRAWN between two samples, by straight-line interpolation."""
    fa, fb = a['fade'] or 0.0, b['fade'] or 0.0
    if fa == fb:
        return b['t']
    u = min(1.0, max(0.0, (DRAWN - fa) / (fb - fa)))
    return a['t'] + u * (b['t'] - a['t'])


def hand_back_text(samples, last, frames):
    """How a stand-in handed back to its true place, from the sample before the move (`last`) and the
    one after: dipped (how long below DRAWN, how low, how far it moved unseen), eased, or neither."""
    z, after = samples[last], samples[last + 1]
    source = 'frames' if frames else 'timeline, every 100 ms'

    def same(k):
        return 0 <= k < len(samples) and samples[k]['craft'] == z['craft']

    # Where it was last drawn as a stand-in and first drawn after (the timeline has no box for a model
    # faded out), within HANDBACK_LOOK_S of the move.
    k0, k1 = last, last + 1
    while same(k0 - 1) and samples[k0]['sx'] is None and z['t'] - samples[k0 - 1]['t'] <= HANDBACK_LOOK_S:
        k0 -= 1
    while same(k1 + 1) and samples[k1]['sx'] is None and samples[k1 + 1]['t'] - after['t'] <= HANDBACK_LOOK_S:
        k1 += 1
    p0, p1 = samples[k0], samples[k1]
    arc = arc_between(p0, p1)
    px = math.hypot(p1['sx'] - p0['sx'], p1['sy'] - p0['sy']) if p0['sx'] is not None and p1['sx'] is not None else None
    moved = ', '.join(part for part in [f'{arc:.0f} degrees round the body' if arc is not None else '',
                                         f'{px:.0f} px' if px is not None else ''] if part) or 'an unknown distance'
    if (k0, k1) != (last, last + 1) and px is not None:
        moved += f' (from where it was drawn at {p0["t"]:.2f} s to {p1["t"]:.2f} s)'

    around = [k for k in range(len(samples)) if same(k)
              and z['t'] - HANDBACK_LOOK_S <= samples[k]['t'] <= after['t'] + HANDBACK_LOOK_S]
    lowest = min((samples[k]['fade'] or 0.0) for k in around)
    if min(z['fade'] or 0.0, after['fade'] or 0.0) < DRAWN:
        # The run below DRAWN that holds the move, from where the fade crosses it on either side.
        a = last if (z['fade'] or 0.0) < DRAWN else last + 1
        while same(a - 1) and (samples[a - 1]['fade'] or 0.0) < DRAWN:
            a -= 1
        b = last + 1 if (after['fade'] or 0.0) < DRAWN else last
        while same(b + 1) and (samples[b + 1]['fade'] or 0.0) < DRAWN:
            b += 1
        start = crossing(samples[a - 1], samples[a]) if same(a - 1) else None
        end = crossing(samples[b], samples[b + 1]) if same(b + 1) else None
        if (start is None or end is None or z['t'] - start > HANDBACK_LOOK_S
                or end - after['t'] > HANDBACK_LOOK_S):
            # Not a dip: its model was not drawn for a while either side (a dot, faded, behind a body).
            since = f'from {start:.2f} s' if start is not None else 'from the start'
            until = f'to {end:.2f} s' if end is not None else 'to the end'
            dot = ' (drawn as a dot)' if any(samples[k].get('dot') for k in around) else ''
            return f'its model was not drawn around then{dot}: below {DRAWN} {since} {until}  [{source}]'
        hidden = ' (where it was drawn was behind a body)' if z.get('where') == 'hidden' else ''
        return f'dipped: below {DRAWN} for {end - start:.2f} s, lowest {lowest:.2f}; moved {moved} unseen{hidden}  [{source}]'
    gap = p1['t'] - p0['t']
    still = not (p0.get('tween') or p1.get('tween'))
    if not ((arc is not None and arc > NO_DIP_DEG + 360 * LAP_LIMIT * gap)
            or (still and px is not None and px > NO_DIP_PX * max(1.0, gap / 0.1))):
        return f'eased across, drawn throughout (lowest {lowest:.2f}); its last step {moved}  [{source}]'
    return f'NO DIP: moved {moved} between two frames drawn at {min(z["fade"], after["fade"]):.2f} (a no-dip mark)  [{source}]'


def camera_run(rows, name, t0, t1):
    """(first, last) index of the longest unbroken run of camera rows in which `name` is followed and
    stands in, between t0 and t1; None when it was not followed then."""
    best, run = None, None
    for k, r in enumerate(rows):
        if r['craft'] == name and r['standin'] and t0 <= r['t'] <= t1:
            run = (run[0], k) if run and run[1] == k - 1 else (k, k)
            if best is None or run[1] - run[0] > best[1] - best[0]:
                best = run
    return best


def fast_forward_lines(rec, rows):
    """Each stretch a craft's model stood in on its ring: when, the true laps and the glide, its pace,
    and its hand-back. From the timeline every 100 ms, and from every frame while the craft is followed."""
    lines = [' ', 'fast forward: each stretch a craft is drawn as a stand-in gliding round its ring (standard 22)']
    if not rec.knows_stand_ins:
        out(lines, '  not recorded: the probe that made this recording did not read the stand-in')
        return lines
    found = False
    frame_times = [r['t'] for r in rows]
    names = list(rec.timeline[0]['_glides']) if rec.timeline else []
    for name in names:
        samples = timeline_samples(rec, name)
        for first, last in stand_in_episodes(samples):
            found = True
            a, z = samples[first], samples[last]
            after = samples[last + 1] if last + 1 < len(samples) else None
            leapt = after is not None and clock_leapt(z, after)
            # Every frame of it while the craft was followed: for its pace when that is most of it, and
            # for its hand-back when it was followed then.
            run = camera_run(rows, name, a['t'] - 0.2, (after['t'] if after else z['t']) + 0.05)
            length = max(1e-6, z['t'] - a['t'])
            paced = run is not None and rows[run[1]]['t'] - rows[run[0]]['t'] >= 0.8 * length
            source, sf, sl = (rows, run[0], run[1]) if paced else (samples, first, last)
            handed = (run is not None and run[1] + 1 < len(rows) and rows[run[1] + 1]['craft'] == name
                      and abs(rows[run[1]]['t'] - z['t']) <= 0.15)
            back, bl = (rows, run[1]) if handed else (samples, last)
            begin = rows[run[0]]['t'] if run is not None and abs(rows[run[0]]['t'] - a['t']) <= 0.15 else a['t']
            finish = back[bl + 1]['t'] if after is not None and bl + 1 < len(back) else None
            laps_end = (after if after is not None and not leapt else z)['laps']
            true_laps = laps_end - a['laps'] if laps_end is not None and a['laps'] is not None else None
            followed = ' (followed)' if all(s['followed'] == name for s in samples[first:last + 1]) else (
                ' (followed for part of it)' if any(s['followed'] == name for s in samples[first:last + 1]) else '')
            span = f"{begin:.2f}-{finish:.2f} s, {finish - begin:.1f} s" if finish is not None else f'{begin:.2f} s to the end'
            laps_text = f'{true_laps:.2f} true laps went by' if true_laps is not None else 'true laps not known'
            shown = [row for row in rec.timeline if row['ff'] == '1' and row['followed'] == name
                     and begin - 0.5 <= row['_t'] <= (finish if finish is not None else math.inf) + 0.5]
            said = ''
            if shown:
                count = max((row['_fflaps'] or 0.0) for row in shown)
                said = f'; "Fast forward" shown {shown[0]["_t"]:.2f}-{shown[-1]["_t"]:.2f} s, counting to {math.floor(count)} orbits'
            out(lines, f'  {name}{followed}  {span}: {laps_text}{said}')
            rates = glide_rates(source, sf, sl, 0.25 if paced else GLIDE_WINDOW_S)
            eased, usual, skipped = eased_rates(source, sf, rates, frame_times)
            pace = []
            if usual and usual > 0:
                if paced:
                    spread = max(abs(rate / usual - 1) for _, rate, _ in eased)
                    left = f', {skipped} more over a frame longer than {GLIDE_FRAME_S} s not judged' if skipped else ''
                    pace.append(f'once in {1 / usual:.1f} s once eased (within {spread * 100:.1f}% of that over '
                                f'{len(eased)} windows of {GLIDE_WINDOW_S:.0f} s{left})')
                else:
                    pace.append(f'once in {1 / usual:.1f} s once eased (from the timeline, roughly)')
            elif rates:
                pace.append('too short to settle')
            if rates:
                top = max(rate for _, rate, _ in rates)
                if top > 0:
                    pace.append(f'once in {1 / top:.1f} s at its fastest')
            out(lines, f"        glided {z['glide']:.3f} laps" + (': ' + ', '.join(pace) if pace else ''))
            if after is None:
                out(lines, '        still a stand-in when the recording ends')
            elif leapt:
                out(lines, f'        ended at {after["t"]:.2f} s by a jump of the clock: drawn at its true place for the new time at once')
            elif after.get('gone'):
                out(lines, f'        ended at {after["t"]:.2f} s: the craft is gone')
            else:
                out(lines, f'        hand-back at {finish:.2f} s: {hand_back_text(back, bl, handed)}')
    if not found:
        reduced = ' (reduced motion: the ring stands alone)' if rec.meta.get('reducedMotion') else ''
        out(lines, f'  no stand-in{reduced}')
    return lines


def table_lines(rows, groups):
    lines = [' ', 'camera (every 0.25 s and every marked frame; all of it in camera-table.tsv; the craft where its model is drawn,'
             ' "s" where that is a stand-in, then its true place\'s laps/s)',
             '     t   gap    clock     view        tw  fv   fade   turn   roll   tilt  body dist  cover  craft x,y   jump  where  laps/s  true/s']
    marked = set()
    for g in groups:
        marked.add(round(g['peak_t'], 3))
        marked.add(round(g['from'], 3))
    next_t = -1e9
    for r in rows:
        flag = round(r['t'], 3) in marked
        if r['t'] < next_t and not flag:
            continue
        if r['t'] >= next_t:
            next_t = r['t'] + 0.25
        craft = f"{r['sx']:5.0f},{r['sy']:4.0f}" if r['sx'] is not None else '     -    '
        tilt = f"{r['tilt']:6.1f}" if r['view'] == 'spacecraft' and r['tilt'] is not None and r['tiltw'] > 0.3 else '     -'
        laps = f"{r['lapsps']:.3f}" if r['lapsps'] is not None else '-'
        true = f"{r['truelapsps']:.3f}" if r['truelapsps'] is not None else '-'
        fade = f"{r['fade']:.2f}" if r['fade'] is not None else '  - '
        dist = f"{r['dist']:6.2f}" if r['dist'] is not None else '     -'
        stand = 's' if r['standin'] else ' '
        out(lines, f"{r['t']:6.2f} {r['gap'] * 1000:4.0f}  {clock_text(r['clock'])}  {r['view']:<10} {'1' if r['tween'] else '0'}  {r['fastview']:.1f}  {fade}  {r['turn']:5.1f}  {r['roll']:5.1f} {tilt}   {r['body']} {dist}  {r['cover'] * 100:4.0f}%  {craft}{stand} {r['jump']:4.0f}  {r['where']:<6} {laps:<6}  {true}{'  <' if flag else ''}")
    return lines


def write_marks(rec, groups):
    with open(os.path.join(rec.dir, 'marks.tsv'), 'w', encoding='utf-8') as handle:
        handle.write('kind\tfrom\tto\tpeak_t\tpeak\tnote\n')
        for g in groups:
            handle.write(f"{g['kind']}\t{g['from']:.3f}\t{g['to']:.3f}\t{g['peak_t']:.3f}\t{g['peak']:.3f}\t{g['note']}\n")


def check(folder):
    """Analyse one recording, write its files, and return (head lines, signal lines, the rest, signals)."""
    rec = Recording(folder)
    signals = []
    lines = [f'== {rec.dir}']
    lines += build_lines(rec)
    lines += frame_lines(rec, signals)
    rows = camera_table(rec)
    write_camera_table(rec, rows)
    groups = group_marks(find_marks(rec, rows), rec.meta.get('reducedMotion', False))
    write_marks(rec, groups)
    body = []
    body += card_lines(rec, signals)
    body += change_lines(rec)
    body += pace_lines(rows)
    body += fast_forward_lines(rec, rows)
    body += mark_lines(groups, signals, rows, rec.knows_stand_ins)
    body += table_lines(rows, groups)
    signal_lines = [' ', 'signals (FAIL: a standard is broken; LOOK: read the sheets for these times; '
                    'REDO: too few frames to judge)']
    for name, state, text in signals:
        signal_lines.append(f'  {state:<5} {name:<20} {text}')
    full = lines + signal_lines + body
    with open(os.path.join(rec.dir, 'check.txt'), 'w', encoding='utf-8') as handle:
        handle.write('\n'.join(full) + '\n')
    with open(os.path.join(rec.dir, 'signals.json'), 'w', encoding='utf-8') as handle:
        json.dump([{'name': name, 'state': state, 'text': text} for name, state, text in signals], handle, indent=1)
    return lines, signal_lines, body, signals


def grid_lines(root, results):
    """One line a recording, each signal's state: a whole tour or flight at a glance."""
    names = []
    for _, signals in results:
        for name, _, _ in signals:
            if name not in names:
                names.append(name)
    labels = [os.path.relpath(folder, root) for folder, _ in results]
    width = max(len(label) for label in labels)
    out = [' ', "summary: each signal per recording (details in each folder's check.txt)",
           ' ' * width + '  ' + '  '.join(f'{name:<{max(5, len(name))}}' for name in names)]
    for label, (_, signals) in zip(labels, results):
        states = {name: state for name, state, _ in signals}
        out.append(f'{label:<{width}}  ' + '  '.join(f"{states.get(name, '-'):<{max(5, len(name))}}" for name in names))
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    summary_only = '--summary' in sys.argv
    folders = []
    for arg in args:
        if os.path.exists(os.path.join(arg, 'timeline.tsv')):
            folders.append(arg)
        elif os.path.isdir(arg):
            # A sweep: every recording folder inside it (record.mjs ... all).
            folders += sorted(os.path.join(arg, d) for d in os.listdir(arg) if os.path.exists(os.path.join(arg, d, 'timeline.tsv')))
    if not folders:
        sys.exit(f'check.py: no recording (timeline.tsv) in {", ".join(args)}')
    if len(folders) == 1:
        lines, signal_lines, body, _ = check(folders[0])
        print('\n'.join(lines + signal_lines if summary_only else lines + signal_lines + body))
        return
    results = []
    for folder in folders:
        _, _, _, signals = check(folder)
        results.append((folder, signals))
    print('\n'.join(grid_lines(os.path.commonpath(folders), results)))


if __name__ == '__main__':
    main()
