"""
Spindel 4 game engine + search.

The web is 16 slices ("columns") around a hub, each 7 rings deep.
A piece always lands on the innermost free cell of a slice (like gravity
in four-in-a-row, but pointing outward). Four in a row wins:
  - straight : 4 consecutive rings in the same slice
  - round    : 4 neighbouring slices on the same ring (wraps around)
  - diagonal : slice+1 / ring+1 (both directions, wraps around)
"""
import random
import time

S = 16  # slices
R = 7   # rings
N = S * R
FULL = (1 << N) - 1


def idx(s, r):
    return (s % S) * R + r


def _build_lines():
    lines = set()
    for s in range(S):
        for r in range(R):
            # straight (radial)
            if r + 3 < R:
                lines.add(sum(1 << idx(s, r + k) for k in range(4)))
            # round (along the ring, wraps)
            lines.add(sum(1 << idx(s + k, r) for k in range(4)))
            # diagonals (spiral outward, both ways)
            if r + 3 < R:
                lines.add(sum(1 << idx(s + k, r + k) for k in range(4)))
                lines.add(sum(1 << idx(s - k, r + k) for k in range(4)))
    return sorted(lines)


LINES = _build_lines()
LINES_AT = [[m for m in LINES if m >> i & 1] for i in range(N)]
# for each line, its cells
LINE_CELLS = [[i for i in range(N) if m >> i & 1] for m in LINES]

# Symmetries (rotate by k slices, optional mirror) for the memory book.
def _perm(k, mirror):
    p = [0] * N
    for s in range(S):
        for r in range(R):
            ns = (-s + k) % S if mirror else (s + k) % S
            p[idx(s, r)] = idx(ns, r)
    return p


SYMS = [(_perm(k, m), k, m) for m in (False, True) for k in range(S)]


def apply_perm(bb, p):
    out = 0
    while bb:
        low = bb & -bb
        i = low.bit_length() - 1
        out |= 1 << p[i]
        bb ^= low
    return out


def map_slice(s, k, mirror):
    return (-s + k) % S if mirror else (s + k) % S


def unmap_slice(s, k, mirror):
    return (k - s) % S if mirror else (s - k) % S


class Board:
    __slots__ = ("bb", "h", "turn", "count")

    def __init__(self):
        self.bb = [0, 0]      # bb[p] = cells of player p (0 = first mover)
        self.h = [0] * S      # pieces in each slice
        self.turn = 0
        self.count = 0

    def copy(self):
        b = Board()
        b.bb = self.bb[:]
        b.h = self.h[:]
        b.turn = self.turn
        b.count = self.count
        return b

    @staticmethod
    def from_cells(cells):
        """cells[s][r] in {None, 0, 1}; 0 = player who moved first."""
        b = Board()
        for s in range(S):
            for r in range(R):
                v = cells[s][r]
                if v is not None:
                    b.bb[v] |= 1 << idx(s, r)
                    b.h[s] = max(b.h[s], r + 1)
                    b.count += 1
        b.turn = b.count & 1
        return b

    def legal(self):
        return [s for s in range(S) if self.h[s] < R]

    def play(self, s):
        i = idx(s, self.h[s])
        self.bb[self.turn] |= 1 << i
        self.h[s] += 1
        self.turn ^= 1
        self.count += 1
        return i

    def undo(self, s):
        self.h[s] -= 1
        self.turn ^= 1
        self.count -= 1
        self.bb[self.turn] &= ~(1 << idx(s, self.h[s]))

    def wins_at(self, p, i):
        b = self.bb[p]
        for m in LINES_AT[i]:
            if b & m == m:
                return True
        return False

    def is_win_move(self, p, s):
        if self.h[s] >= R:
            return False
        i = idx(s, self.h[s])
        b = self.bb[p] | (1 << i)
        for m in LINES_AT[i]:
            if b & m == m:
                return True
        return False

    def winner(self):
        for p in (0, 1):
            b = self.bb[p]
            for m in LINES:
                if b & m == m:
                    return p
        return None

    def full(self):
        return self.count >= N

    def key(self):
        return (self.bb[0], self.bb[1])

    def canonical(self):
        """Smallest symmetric version: returns (key, k, mirror)."""
        best = None
        for p, k, m in SYMS:
            kk = (apply_perm(self.bb[0], p), apply_perm(self.bb[1], p))
            if best is None or kk < best[0]:
                best = (kk, k, m)
        return best


# ---------------------------------------------------------------- features
FEATURES = [
    "three_open",      # 3 own + 1 empty in a line
    "two_open",        # 2 own + 2 empty
    "one_open",        # 1 own + 3 empty
    "threat_good",     # empty cell that completes 4, on a ring that suits our parity
    "threat_bad",      # same, on the other parity
    "threat_stack",    # two own threats directly on top of each other
    "inner_cells",     # pieces on the inner rings (more lines pass there)
]
DEFAULT_WEIGHTS = [0.55, 0.12, 0.02, 0.9, 0.35, 1.2, 0.03]


def features(board, p):
    """Feature vector for player p (own minus opponent)."""
    me, op = board.bb[p], board.bb[p ^ 1]
    empty = FULL & ~(me | op)
    f_me = [0] * 7
    f_op = [0] * 7
    thr_me = 0
    thr_op = 0
    for m in LINES:
        a = m & me
        b = m & op
        if a and b:
            continue
        if a:
            c = a.bit_count()
            if c == 3:
                f_me[0] += 1
                thr_me |= m & empty
            elif c == 2:
                f_me[1] += 1
            else:
                f_me[2] += 1
        elif b:
            c = b.bit_count()
            if c == 3:
                f_op[0] += 1
                thr_op |= m & empty
            elif c == 2:
                f_op[1] += 1
            else:
                f_op[2] += 1
    # parity: the first mover likes threats on rings 0,2,4,6 ; second on 1,3,5
    for who, thr, f in ((p, thr_me, f_me), (p ^ 1, thr_op, f_op)):
        good_mod = 0 if who == 0 else 1
        t = thr
        while t:
            low = t & -t
            i = low.bit_length() - 1
            t ^= low
            r = i % R
            if r % 2 == good_mod:
                f[3] += 1
            else:
                f[4] += 1
            if r + 1 < R and (thr >> (i + 1)) & 1:
                f[5] += 1
    inner = 0
    for s in range(S):
        base = s * R
        inner_mask = 0b111 << base
        f_me[6] += (me & inner_mask).bit_count()
        f_op[6] += (op & inner_mask).bit_count()
    return [a - b for a, b in zip(f_me, f_op)]


def threat_masks(me, op):
    """Empty cells that would complete four for `me` and for `op`."""
    tm = 0
    to = 0
    for m in LINES:
        a = m & me
        if a:
            if not m & op and a.bit_count() == 3:
                tm |= m & ~a
        else:
            b = m & op
            if b and b.bit_count() == 3:
                to |= m & ~b
    return tm, to


WIN = 100000


class Engine:
    def __init__(self, weights=None):
        self.w = list(weights or DEFAULT_WEIGHTS)
        self.tt = {}
        self.nodes = 0
        self.deadline = 0.0
        self.stop = False

    def evaluate(self, board):
        f = features(board, board.turn)
        return int(1000 * sum(w * x for w, x in zip(self.w, f)))

    def _order(self, board, moves, tt_move):
        # inner/neighbour-heavy moves first, TT move first of all
        def score(s):
            h = board.h[s]
            return (s == tt_move) * 1000 - h * 3 + (board.h[(s - 1) % S] + board.h[(s + 1) % S])
        return sorted(moves, key=score, reverse=True)

    def negamax(self, board, depth, alpha, beta, ply):
        self.nodes += 1
        if self.nodes & 1023 == 0 and time.time() > self.deadline:
            self.stop = True
        if self.stop:
            return 0
        me = board.turn
        moves = board.legal()
        if not moves:
            return 0
        h = board.h
        tm, to = threat_masks(board.bb[me], board.bb[me ^ 1])
        play = 0
        for s in moves:
            play |= 1 << (s * R + h[s])
        if tm & play:
            return WIN - ply
        forced = to & play
        if forced:
            if forced & (forced - 1):
                return -(WIN - ply - 1)
            fi = forced.bit_length() - 1
            moves = [fi // R]
        else:
            # never play directly under an opponent's winning cell
            safe = [s for s in moves if not (h[s] + 1 < R and to >> (s * R + h[s] + 1) & 1)]
            if safe:
                moves = safe
        if depth <= 0:
            return self.evaluate(board)

        key = (board.bb[0], board.bb[1], me)
        a0 = alpha
        ent = self.tt.get(key)
        tt_move = None
        if ent:
            d, flag, val, tt_move = ent
            if d >= depth:
                if flag == 0:
                    return val
                if flag == 1 and val > alpha:
                    alpha = val
                elif flag == 2 and val < beta:
                    beta = val
                if alpha >= beta:
                    return val
        best = -10 * WIN
        best_move = moves[0]
        for s in self._order(board, moves, tt_move):
            board.play(s)
            v = -self.negamax(board, depth - 1, -beta, -alpha, ply + 1)
            board.undo(s)
            if self.stop:
                return 0
            if v > best:
                best, best_move = v, s
            if v > alpha:
                alpha = v
            if alpha >= beta:
                break
        flag = 0 if a0 < best < beta else (1 if best >= beta else 2)
        self.tt[key] = (depth, flag, best, best_move)
        return best

    def analyse(self, board, seconds=1.0, max_depth=30, margin=60):
        """Returns {slice: score} for every legal move (best found depth)."""
        self.deadline = time.time() + seconds
        self.stop = False
        self.nodes = 0
        if len(self.tt) > 2_000_000:
            self.tt.clear()
        moves = board.legal()
        me = board.turn
        result = {s: 0 for s in moves}
        # trivial cases
        for s in moves:
            if board.is_win_move(me, s):
                return {s2: (WIN if s2 == s else -WIN) for s2 in moves}, 1
        reached = 0
        for depth in range(1, max_depth + 1):
            scores = {}
            best = -10 * WIN
            order = sorted(moves, key=lambda s: result.get(s, 0), reverse=True)
            for s in order:
                # moves within `margin` of the best get a real score (needed for
                # the memory book), worse moves only get an upper bound
                alpha = max(-10 * WIN, best - margin - 1)
                board.play(s)
                v = -self.negamax(board, depth - 1, -10 * WIN, -alpha, 1)
                board.undo(s)
                if self.stop:
                    break
                scores[s] = v
                best = max(best, v)
            if self.stop:
                break
            result = scores
            reached = depth
            if max(result.values()) >= WIN - 100 or all(v <= -WIN + 100 for v in result.values()):
                break
            if board.count + depth >= N:
                break
        return result, reached
