"""
The bot's memory. Everything it learns is saved to brain.json.

It learns in three ways:
 1. Opening/position memory: for every position it has played, it remembers
    which move it chose and whether that game was won, drawn or lost.
    Moves that lost before get avoided, moves that won get repeated.
 2. Mistake review: after a loss it replays its own moves with a much
    deeper search. Where it finds a better move it stores a "fix" so the
    same mistake is not made twice.
 3. Evaluation tuning: the weights the engine uses to judge positions are
    nudged after every game toward what actually predicted the result.
"""
import json
import math
import os
import random
import tempfile

from engine import (Board, DEFAULT_WEIGHTS, FEATURES, WIN, features, map_slice,
                    unmap_slice)


def _ks(key):
    return "%x-%x" % key


class Brain:
    def __init__(self, path):
        self.path = path
        self.weights = list(DEFAULT_WEIGHTS)
        self.book = {}    # position -> {move: [wins, draws, losses]}
        self.fixes = {}   # position -> better move found during review
        self.stats = {}   # label -> [wins, draws, losses]
        self.games = 0
        self.load()

    # ----------------------------------------------------------- storage
    def load(self):
        if not os.path.exists(self.path):
            return
        try:
            with open(self.path) as f:
                d = json.load(f)
        except (OSError, ValueError):
            print("! brain.json could not be read, starting fresh")
            return
        w = d.get("weights")
        if isinstance(w, list) and len(w) == len(DEFAULT_WEIGHTS):
            self.weights = w
        self.book = d.get("book", {})
        self.fixes = {k: int(v) for k, v in d.get("fixes", {}).items()}
        self.stats = d.get("stats", {})
        self.games = d.get("games", 0)

    def save(self):
        d = {
            "games": self.games,
            "weights": [round(x, 5) for x in self.weights],
            "feature_names": FEATURES,
            "stats": self.stats,
            "fixes": self.fixes,
            "book": self.book,
        }
        folder = os.path.dirname(os.path.abspath(self.path))
        fd, tmp = tempfile.mkstemp(dir=folder, suffix=".tmp")
        with os.fdopen(fd, "w") as f:
            json.dump(d, f)
        os.replace(tmp, self.path)

    # ------------------------------------------------------ choosing moves
    def choose(self, board, scores, explore=0.0):
        """Pick a move from engine scores, using what was learned."""
        best = max(scores.values())
        if best >= WIN - 200:
            return max(scores, key=scores.get), "winning line"
        key, k, mirror = board.canonical()
        ks = _ks(key)

        fix = self.fixes.get(ks)
        if fix is not None:
            s = unmap_slice(fix, k, mirror)
            if s in scores and scores[s] > -WIN + 200 and scores[s] >= best - 400:
                return s, "remembered fix"

        entry = self.book.get(ks, {})
        margin = 60
        cands = [s for s in scores if scores[s] >= best - margin]
        if best <= -WIN + 200:
            cands = list(scores)  # all lose anyway: let memory pick the longest fight
        if explore and random.random() < explore:
            return random.choice(cands), "exploring"

        def value(s):
            st = entry.get(str(map_slice(s, k, mirror)))
            adj = 0.0
            if st:
                w, d, l = st
                n = w + d + l
                adj = 150.0 * ((w + 0.5 * d) / n - 0.5) * min(n, 4) / 4
            return scores[s] + adj + random.random()

        pick = max(cands, key=value)
        why = "memory" if entry and len(cands) > 1 else "search"
        return pick, why

    # ------------------------------------------------------------ learning
    def record(self, moves, me, result, label):
        """moves: list of slices from the start; me: 0 if bot moved first.
        result: 'win' | 'draw' | 'loss' from the bot's point of view."""
        self.games += 1
        st = self.stats.setdefault(label, [0, 0, 0])
        st[{"win": 0, "draw": 1, "loss": 2}[result]] += 1
        slot = {"win": 0, "draw": 1, "loss": 2}[result]

        b = Board()
        for s in moves:
            if b.turn == me:
                key, k, mirror = b.canonical()
                ent = self.book.setdefault(_ks(key), {})
                rec = ent.setdefault(str(map_slice(s, k, mirror)), [0, 0, 0])
                rec[slot] += 1
            b.play(s)
        self._tune(moves, me, result)

    def _tune(self, moves, me, result, lr=0.003):
        y = {"win": 1.0, "draw": 0.5, "loss": 0.0}[result]
        b = Board()
        n = len(moves)
        for i, s in enumerate(moves):
            b.play(s)
            if i < 4:
                continue
            x = features(b, me)
            z = sum(w * v for w, v in zip(self.weights, x))
            z = max(-30, min(30, z))
            p = 1 / (1 + math.exp(-z))
            g = (y - p) * (0.3 + 0.7 * (i + 1) / n)  # later positions matter more
            for j in range(len(self.weights)):
                self.weights[j] += lr * g * max(-5, min(5, x[j])) / 5
                self.weights[j] = max(0.0, min(3.0, self.weights[j]))

    def review(self, moves, me, engine, seconds=6.0, last_n=6, log=print):
        """After a loss: look back at our own moves with a deeper search."""
        b = Board()
        positions = []
        for s in moves:
            if b.turn == me:
                positions.append((b.copy(), s))
            b.play(s)
        found = 0
        for pos, played in reversed(positions[-last_n:]):
            scores, depth = engine.analyse(pos, seconds)
            if played not in scores:
                continue
            best = max(scores, key=scores.get)
            if best != played and scores[best] > scores[played] + 40:
                key, k, mirror = pos.canonical()
                self.fixes[_ks(key)] = map_slice(best, k, mirror)
                found += 1
                log("   review: move %d, slice %d was a mistake -> %d is better (depth %d)"
                    % (pos.count + 1, played, best, depth))
        return found
