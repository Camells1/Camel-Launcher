// ==UserScript==
// @name         Spindel 4 Robot
// @namespace    spindel4-robot
// @version      3.1
// @description  Self-learning robot that plays Spindel 4 against the computer (1, 2 or 3 computers, every level). Hides ads.
// @match        https://play.spindel4.com/*
// @run-at       document-start
// @noframes
// @inject-into page
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Camells1/Camel-Launcher/claude/serene-cray-y4fb3b/spindel4-bot/spindel4-robot.user.js
// @updateURL    https://raw.githubusercontent.com/Camells1/Camel-Launcher/claude/serene-cray-y4fb3b/spindel4-bot/spindel4-robot.user.js
// ==/UserScript==

(function () {
  "use strict";
  // only in the game page itself, never in its hidden sign-in frames
  try { if (window.top !== window) return; } catch (e) { return; }
  if (window.__S4R_LOADED) return;
  window.__S4R_LOADED = true;

  // ===================================================================
  // 1. Make the game's canvas readable (must run before the game loads)
  // ===================================================================
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, attrs) {
    if (type && String(type).indexOf("webgl") === 0) {
      attrs = Object.assign({}, attrs || {}, { preserveDrawingBuffer: true });
    }
    return origGetContext.call(this, type, attrs);
  };

  // ===================================================================
  // 2. Ad blocker: stop ad/tracker scripts and hide ad boxes
  // ===================================================================
  const AD = /googlesyndication|doubleclick|googleadservices|adservice\.google|googletagmanager|google-analytics|googletagservices|pagead|adnxs|amazon-adsystem|taboola|outbrain|criteo|pubmatic|rubiconproject|fundingchoicesmessages|2mdn/;
  let adsBlocked = 0;
  try { window.adsbygoogle = window.adsbygoogle || []; } catch (e) {}
  const killAd = (n) => {
    if (!n || n.nodeType !== 1) return;
    const src = n.src || (n.getAttribute && n.getAttribute("src")) || "";
    if ((n.tagName === "SCRIPT" || n.tagName === "IFRAME" || n.tagName === "IMG") && AD.test(src)) {
      if (n.tagName === "SCRIPT") n.type = "javascript/blocked";
      n.remove();
      adsBlocked++;
    }
  };
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      killAd(n);
      if (n.querySelectorAll) n.querySelectorAll("script,iframe,img").forEach(killAd);
    }
  }).observe(document, { childList: true, subtree: true });
  const adCss = "ins.adsbygoogle,.google-auto-placed,.adsbygoogle,iframe[id^='aswift'],iframe[src*='googlesyndication'],iframe[src*='doubleclick'],div[id^='google_ads']{display:none!important;height:0!important}";

  // ===================================================================
  // 3. Game rules + engine (2, 3 or 4 players)
  //    (copied into analyse.html by build_analyser.py: keep the ENGINE markers)
  //    16 slices around the hub, 7 rings each. A piece drops to the
  //    innermost free ring of a slice. Four in a row wins: straight
  //    (same slice), round (same ring) or diagonal.
  // ===================================================================
  // ENGINE-START
  const S = 16, R = 7, N = S * R, WIN = 1000000;
  const idx = (s, r) => (((s % S) + S) % S) * R + r;
  const LINES = [];
  (function () {
    const seen = new Set();
    const add = (cells) => {
      const k = cells.slice().sort((a, b) => a - b).join(",");
      if (!seen.has(k)) { seen.add(k); LINES.push(cells); }
    };
    for (let s = 0; s < S; s++) for (let r = 0; r < R; r++) {
      add([0, 1, 2, 3].map((k) => idx(s + k, r)));
      if (r + 3 < R) {
        add([0, 1, 2, 3].map((k) => idx(s, r + k)));
        add([0, 1, 2, 3].map((k) => idx(s + k, r + k)));
        add([0, 1, 2, 3].map((k) => idx(s - k, r + k)));
      }
    }
  })();
  const LINES_AT = Array.from({ length: N }, () => []);
  LINES.forEach((L, li) => L.forEach((c) => LINES_AT[c].push(li)));
  const LA = LINES.map((L) => L[0]), LB = LINES.map((L) => L[1]),
        LC = LINES.map((L) => L[2]), LD = LINES.map((L) => L[3]);

  // zobrist hashing for the transposition table
  const ZOB = [];
  let seed = 12345;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
  for (let p = 0; p < 4; p++) { ZOB.push([]); for (let i = 0; i < N; i++) ZOB[p].push([rnd(), rnd()]); }

  class Board {
    constructor(np) {
      this.np = np; this.cells = new Int8Array(N).fill(-1); this.h = new Int8Array(S);
      this.lc = new Int8Array(LINES.length * 4); // pieces per player on every line
      this.turn = 0; this.count = 0; this.z1 = 0; this.z2 = 0;
    }
    static fromCells(cells, np, turn) {
      const b = new Board(np);
      for (let i = 0; i < N; i++) if (cells[i] >= 0) {
        b.cells[i] = cells[i]; b.count++;
        for (const li of LINES_AT[i]) b.lc[li * 4 + cells[i]]++;
        const s = (i / R) | 0, r = i % R; if (r + 1 > b.h[s]) b.h[s] = r + 1;
        b.z1 ^= ZOB[cells[i]][i][0]; b.z2 ^= ZOB[cells[i]][i][1];
      }
      b.turn = turn; return b;
    }
    clone() { const b = Board.fromCells(this.cells, this.np, this.turn); return b; }
    legal() { const m = []; for (let s = 0; s < S; s++) if (this.h[s] < R) m.push(s); return m; }
    play(s) {
      const i = s * R + this.h[s], p = this.turn;
      this.cells[i] = p; this.h[s]++; this.count++;
      const lc = this.lc; for (const li of LINES_AT[i]) lc[li * 4 + p]++;
      this.z1 ^= ZOB[p][i][0]; this.z2 ^= ZOB[p][i][1];
      this.turn = (p + 1) % this.np; return i;
    }
    undo(s) {
      this.h[s]--; const i = s * R + this.h[s];
      this.turn = (this.turn - 1 + this.np) % this.np; const p = this.turn;
      this.cells[i] = -1; this.count--;
      const lc = this.lc; for (const li of LINES_AT[i]) lc[li * 4 + p]--;
      this.z1 ^= ZOB[p][i][0]; this.z2 ^= ZOB[p][i][1];
    }
    winsWith(p, i) { // would player p have four if he owned cell i?
      if (this.cells[i] < 0) {
        // i is empty, so a line through i with 3 of p's pieces is exactly a win
        const lc = this.lc;
        for (const li of LINES_AT[i]) if (lc[li * 4 + p] === 3) return true;
        return false;
      }
      const c = this.cells;
      for (const li of LINES_AT[i]) {
        const a = LA[li], b = LB[li], d = LC[li], e = LD[li];
        if ((a === i || c[a] === p) && (b === i || c[b] === p) && (d === i || c[d] === p) && (e === i || c[e] === p)) return true;
      }
      return false;
    }
    isWinMove(p, s) { return this.h[s] < R && this.winsWith(p, s * R + this.h[s]); }
    winner() {
      const c = this.cells;
      for (let li = 0; li < LINES.length; li++) {
        const p = c[LA[li]];
        if (p >= 0 && c[LB[li]] === p && c[LC[li]] === p && c[LD[li]] === p) return p;
      }
      return -1;
    }
  }

  const FEATURES = ["three_open", "two_open", "one_open", "threat_good", "threat_bad", "threat_stack", "inner"];
  const DEFAULT_W = [0.55, 0.12, 0.02, 0.9, 0.35, 1.2, 0.03];

  // feature vector from player `me`'s point of view (me minus all opponents)
  function features(b, me) {
    const c = b.cells, np = b.np, f = [0, 0, 0, 0, 0, 0, 0];
    const thr = new Uint8Array(N); // bit p set: cell completes four for p
    const lc = b.lc, NL = LINES.length;
    for (let li = 0; li < NL; li++) {
      const q = li * 4, a0 = lc[q], a1 = lc[q + 1], a2 = lc[q + 2], a3 = lc[q + 3];
      let o, n;
      if (a0) { if (a1 | a2 | a3) continue; o = 0; n = a0; }
      else if (a1) { if (a2 | a3) continue; o = 1; n = a1; }
      else if (a2) { if (a3) continue; o = 2; n = a2; }
      else if (a3) { o = 3; n = a3; }
      else continue;
      const sg = o === me ? 1 : -1;
      if (n === 3) {
        f[0] += sg;
        const empty = c[LA[li]] < 0 ? LA[li] : c[LB[li]] < 0 ? LB[li] : c[LC[li]] < 0 ? LC[li] : LD[li];
        thr[empty] |= 1 << o;
      } else if (n === 2) f[1] += sg;
      else if (n === 1) f[2] += sg;
    }
    for (let i = 0; i < N; i++) {
      const t = thr[i]; if (!t) continue;
      const r = i % R;
      for (let p = 0; p < np; p++) if (t >> p & 1) {
        const sg = p === me ? 1 : -1;
        // with 2 players, a threat on the right ring parity is worth more
        const good = np !== 2 || (r % 2) === (p === 0 ? 0 : 1);
        if (good) f[3] += sg; else f[4] += sg;
        if (r + 1 < R && (thr[i + 1] >> p & 1)) f[5] += sg;
      }
    }
    for (let s = 0; s < S; s++) for (let r = 0; r < 3; r++) {
      const v = c[s * R + r]; if (v >= 0) f[6] += v === me ? 1 : -1;
    }
    return f;
  }

  class Engine {
    constructor(weights) { this.w = weights.slice(); this.tt = new Map(); this.hist = new Int32Array(4 * S); }
    evaluate(b) {
      const f = features(b, this.me); let v = 0;
      for (let k = 0; k < f.length; k++) v += this.w[k] * f[k];
      return Math.round(1000 * v);
    }
    // "paranoid" search: every opponent plays against us
    search(b, depth, alpha, beta, ply) {
      if ((++this.nodes & 1023) === 0 && performance.now() > this.deadline) this.stop = true;
      if (this.stop) return 0;
      const me = this.me, p = b.turn, np = b.np, mine = p === me;
      let moves = b.legal();
      if (!moves.length) return 0;
      for (const s of moves) if (b.isWinMove(p, s)) return mine ? WIN - ply : -(WIN - ply);
      const nx = (p + 1) % np, nxMine = nx === me;
      const nxWins = moves.filter((s) => b.isWinMove(nx, s));
      if (nxWins.length) {
        if (!mine && !nxMine) return -(WIN - ply - 1);       // opponents help each other
        if (nxWins.length > 1) return nxMine ? WIN - ply - 1 : -(WIN - ply - 1);
        moves = nxWins;                                     // forced block
      } else if (mine !== nxMine) {
        // don't play right under the next player's winning cell
        const safe = moves.filter((s) => !(b.h[s] + 1 < R && b.winsWith(nx, s * R + b.h[s] + 1)));
        if (safe.length) moves = safe;
      }
      if (depth <= 0) return this.evaluate(b);

      const key = ((b.z1 & 0x7ffffff) * 4 + p) * 16777216 + (b.z2 & 0xffffff); // 53-bit number key
      const ent = this.tt.get(key);
      let ttMove = -1;
      if (ent) {
        ttMove = ent.m;
        if (ent.d >= depth) {
          if (ent.f === 0) return ent.v;
          if (ent.f === 1 && ent.v >= beta) return ent.v;
          if (ent.f === 2 && ent.v <= alpha) return ent.v;
        }
      }
      const H = this.hist, base = p * S;
      moves.sort((x, y) => (y === ttMove) - (x === ttMove) || H[base + y] - H[base + x]);
      const a0 = alpha, b0 = beta;
      let best = mine ? -Infinity : Infinity, bestM = moves[0];
      for (const s of moves) {
        b.play(s);
        const v = this.search(b, depth - 1, alpha, beta, ply + 1);
        b.undo(s);
        if (this.stop) return 0;
        if (mine) { if (v > best) { best = v; bestM = s; } if (v > alpha) alpha = v; }
        else { if (v < best) { best = v; bestM = s; } if (v < beta) beta = v; }
        if (alpha >= beta) { H[base + s] += depth * depth; break; }
      }
      const flag = best <= a0 ? 2 : best >= b0 ? 1 : 0;
      this.tt.set(key, { d: depth, f: flag, v: best, m: bestM });
      return best;
    }
    // scores for each of `me`'s moves; moves much worse than the best get only a bound
    analyse(b, me, ms, margin = 60, onDepth = null, maxDepth = 40) {
      this.me = me; this.deadline = performance.now() + ms; this.stop = false; this.nodes = 0;
      if (this.tt.size > 1500000) this.tt.clear();
      const moves = b.legal(); let result = {}; let reached = 0;
      for (const s of moves) result[s] = 0;
      for (const s of moves) if (b.isWinMove(me, s)) { const r = {}; for (const t of moves) r[t] = t === s ? WIN : -WIN; return { scores: r, depth: 1 }; }
      for (let depth = 1; depth <= maxDepth; depth++) {
        const sc = {}; let best = -Infinity;
        const order = moves.slice().sort((x, y) => result[y] - result[x]);
        for (const s of order) {
          const alpha = best === -Infinity ? -Infinity : best - margin - 1;
          b.play(s);
          const v = this.search(b, depth - 1, alpha, Infinity, 1);
          b.undo(s);
          if (this.stop) break;
          sc[s] = v; if (v > best) best = v;
        }
        if (this.stop) break;
        const vals = Object.values(sc);
        if (vals.every((v) => v <= -WIN + 200) && reached > 0) {
          // every move loses if all opponents team up perfectly: keep the
          // shallower scores so we still pick the most stubborn move
          break;
        }
        result = sc; reached = depth;
        if (onDepth) onDepth(reached, result, this.nodes);
        if (Math.max(...vals) >= WIN - 200 || vals.every((v) => v <= -WIN + 200)) break;
        if (b.count + depth >= N) break;
      }
      return { scores: result, depth: reached };
    }
  }
  // ENGINE-END

  // ===================================================================
  // 4. Memory + learning (saved in this browser)
  // ===================================================================
  const BRAIN_KEY = "S4R_brain", SET_KEY = "S4R_settings";
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const brain = Object.assign({ games: 0, weights: {}, book: {}, fixes: {}, stats: {} }, store.get(BRAIN_KEY, {}));
  const weightsFor = (np) => (brain.weights[np] && brain.weights[np].length === DEFAULT_W.length) ? brain.weights[np] : (brain.weights[np] = DEFAULT_W.slice());
  function saveBrain() {
    if (!store.set(BRAIN_KEY, brain)) {
      // storage full: forget positions only seen once
      for (const k of Object.keys(brain.book)) {
        const e = brain.book[k]; let n = 0; for (const m in e) n += e[m][0] + e[m][1] + e[m][2];
        if (n <= 1) delete brain.book[k];
      }
      store.set(BRAIN_KEY, brain);
    }
  }

  // position key that is the same for rotated / mirrored webs
  function canonical(b, me) {
    let best = null, bk = 0, bm = false;
    const rel = new Array(N);
    for (let i = 0; i < N; i++) { const v = b.cells[i]; rel[i] = v < 0 ? "0" : String(((v - me + b.np) % b.np) + 1); }
    for (let m = 0; m < 2; m++) for (let k = 0; k < S; k++) {
      let str = "";
      for (let sn = 0; sn < S; sn++) {
        const so = m ? (((k - sn) % S) + S) % S : (((sn - k) % S) + S) % S;
        for (let r = 0; r < R; r++) str += rel[so * R + r];
      }
      if (best === null || str < best) { best = str; bk = k; bm = !!m; }
    }
    return { key: b.np + ":" + best.replace(/0+$/, ""), k: bk, m: bm };
  }
  const toCanon = (s, k, m) => m ? (((k - s) % S) + S) % S : (s + k) % S;
  const fromCanon = (c, k, m) => m ? (((k - c) % S) + S) % S : (((c - k) % S) + S) % S;

  function choose(b, me, scores) {
    const vals = Object.values(scores), best = Math.max(...vals);
    const top = +Object.keys(scores).find((s) => scores[s] === best);
    if (best >= WIN - 200) return { s: top, why: "winning line" };
    const cz = canonical(b, me);
    const fix = brain.fixes[cz.key];
    if (fix !== undefined) {
      const s = fromCanon(fix, cz.k, cz.m);
      if (s in scores && scores[s] > -WIN + 200 && scores[s] >= best - 400) return { s, why: "remembered fix", cz };
    }
    const entry = brain.book[cz.key] || {};
    let cands = Object.keys(scores).map(Number).filter((s) => scores[s] >= best - 60);
    if (best <= -WIN + 200) {
      // every move loses against perfect play: resist as long as possible and
      // always block a win that is available right now
      cands = Object.keys(scores).map(Number).filter((s) => scores[s] === best);
      const nx = (me + 1) % b.np;
      const blocks = cands.filter((s) => b.isWinMove(nx, s));
      const anyBlock = Object.keys(scores).map(Number).filter((s) => b.isWinMove(nx, s));
      if (blocks.length) cands = blocks; else if (anyBlock.length) cands = anyBlock;
      return { s: cands[Math.floor(Math.random() * cands.length)], why: "search", cz };
    }
    let pick = cands[0], pv = -Infinity;
    for (const s of cands) {
      let adj = 0; const st = entry[toCanon(s, cz.k, cz.m)];
      if (st) { const n = st[0] + st[1] + st[2]; adj = 150 * ((st[0] + 0.5 * st[1]) / n - 0.5) * Math.min(n, 4) / 4; }
      const v = scores[s] + adj + Math.random();
      if (v > pv) { pv = v; pick = s; }
    }
    return { s: pick, why: cands.length > 1 && Object.keys(entry).length ? "memory" : "search", cz };
  }

  // several tabs may share one memory: always start from what is saved now
  function updateBrain(fn) {
    const fresh = Object.assign({ games: 0, weights: {}, book: {}, fixes: {}, stats: {} }, store.get(BRAIN_KEY, {}));
    for (const k of ["games", "weights", "book", "fixes", "stats"]) brain[k] = fresh[k];
    fn();
    saveBrain();
  }
  function learn(game, result) { updateBrain(() => learnInto(game, result)); }
  function learnInto(game, result) {
    brain.games++;
    const st = brain.stats[game.mode] || (brain.stats[game.mode] = [0, 0, 0]);
    const slot = result === "win" ? 0 : result === "draw" ? 1 : 2;
    st[slot]++;
    for (const pos of game.positions) {
      const e = brain.book[pos.key] || (brain.book[pos.key] = {});
      const r = e[pos.cmove] || (e[pos.cmove] = [0, 0, 0]);
      r[slot]++;
    }
    // nudge the evaluation weights toward what predicted the result
    if (game.np) {
      const w = weightsFor(game.np), y = slot === 0 ? 1 : slot === 1 ? 0.5 : 0, n = game.positions.length;
      game.positions.forEach((pos, i) => {
        if (!pos.f) return;
        let z = 0; for (let k = 0; k < w.length; k++) z += w[k] * pos.f[k];
        z = Math.max(-30, Math.min(30, z));
        const g = (y - 1 / (1 + Math.exp(-z))) * (0.3 + 0.7 * (i + 1) / n);
        for (let k = 0; k < w.length; k++) w[k] = Math.max(0, Math.min(3, w[k] + 0.003 * g * Math.max(-5, Math.min(5, pos.f[k])) / 5));
      });
    }
  }

  // after a loss: look at our last moves again with a much deeper search
  async function review(game) {
    let found = 0;
    const list = game.positions.slice(-6).reverse();
    for (const pos of list) {
      if (!running) break;
      await sleep(50);
      const b = Board.fromCells(pos.cells, pos.np, pos.me);
      const eng = new Engine(weightsFor(pos.np));
      const { scores, depth } = eng.analyse(b, pos.me, settings.think * 3000);
      if (!(pos.move in scores)) continue;
      const bestS = +Object.keys(scores).reduce((a, c) => scores[c] > scores[a] ? c : a);
      if (bestS !== pos.move && scores[bestS] > scores[pos.move] + 40) {
        const cz = canonical(b, pos.me);
        const fx = toCanon(bestS, cz.k, cz.m);
        updateBrain(() => { brain.fixes[cz.key] = fx; });
        found++;
        log(t(`review: slice ${pos.move} was a mistake, ${bestS} is better (depth ${depth})`, `terugblik: poot ${pos.move} was een fout, ${bestS} is beter (diepte ${depth})`));
      }
    }
    return found;
  }

  // ===================================================================
  // 5. Talking to the game (Flutter accessibility tree + screen pixels)
  // ===================================================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // Flutter only builds its accessibility tree (which we read) after a tap on
  // the centre of its hidden placeholder. On iPhones a tap elsewhere counts as
  // a failed attempt, and after a few failures the placeholder is removed.
  let lastEnable = 0;
  function enableSemantics() {
    const ph = document.querySelector("flt-semantics-placeholder");
    if (!ph || Date.now() - lastEnable < 2500) return;
    lastEnable = Date.now();
    const r = ph.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 7, pointerType: "touch", isPrimary: true };
    ph.dispatchEvent(new PointerEvent("pointerdown", o));
    ph.dispatchEvent(new PointerEvent("pointerup", o));
    ph.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y }));
  }
  function nodes() {
    enableSemantics();
    return Array.from(document.querySelectorAll("flt-semantics")).map((e) => {
      const r = e.getBoundingClientRect();
      const label = (e.getAttribute("aria-label") || "").trim();
      // only the node's own text, never the text of nodes inside it
      const leaf = !e.querySelector("flt-semantics");
      const text = leaf ? (e.innerText || e.textContent || "").trim() : "";
      return { el: e, role: e.getAttribute("role") || "", label: label || (text.includes("\n") ? "" : text), x: r.x, y: r.y, w: r.width, h: r.height };
    });
  }
  const texts = (ns) => ns.map((n) => n.label).filter(Boolean);
  // the site is shown in English or Dutch depending on the phone's language
  const WORDS = {
    "Continue anonymously": ["Continue anonymously", "Anoniem verder", "Anoniem doorgaan"],
    "Got it": ["Got it", "Begrepen", "Snap ik", "Oké", "Ok, verder", "Doorgaan"],
    "Play again": ["Play again", "Nog een keer", "Opnieuw spelen", "Nog een potje", "Opnieuw"],
    "Back": ["Back", "Terug"],
    "Against the computer": ["Against the computer", "Tegen de computer"],
    "1 computer": ["1 computer"],
    "2 computers": ["2 computers"],
    "3 computers": ["3 computers"],
    "Easy": ["Easy", "Makkelijk"],
    "Medium": ["Medium", "Gemiddeld"],
    "Hard": ["Hard", "Moeilijk"],
    "Expert": ["Expert"],
  };
  const RX = {
    yourMove: /^(your move|your turn:|jouw zet|jij bent aan zet|je bent aan zet|aan (de beurt|zet):)(?!\s*computer\s*\d)/i,
    order: /^(order|volgorde)/i,
    tutorial: /how to make a move|zo doe je een zet/i,
    yourTurn: /^(your turn|nu jij|jouw beurt)/i,
    step1: /marked spoke with|marked spoke, see|finger on the marked|gemarkeerde poot aan, kijk|vinger op de gemarkeerde poot|(point|tap) at the marked|net niet de gemarkeerde|not quite the marked/i,
    win: /\b(wins|won|wint|gewonnen|heeft gewonnen)\b/i,
    you: /\((you|jij)\)/i,
    draw: /\b(draw|tie|gelijkspel|gelijk spel|onbeslist)\b/i,
  };
  const findBtn = (ns, ...labels) => {
    const alts = [];
    for (const l of labels) for (const a of (WORDS[l] || [l])) alts.push(a.toLowerCase());
    return ns.find((n) => n.role === "button" && alts.some((l) => n.label.toLowerCase() === l || n.label.toLowerCase().startsWith(l)));
  };
  const clickNode = (n) => { n.el.click(); lastAction = Date.now(); };

  function boardBox(ns) {
    let best = null;
    for (const n of ns) if (n.w >= 150 && Math.abs(n.w - n.h) < 3 && !(n.x === 0 && n.y === 0) && n.w < innerWidth + 1)
      if (!best || n.w > best.w) best = n;
    return best;
  }

  function flutterCanvases() {
    const out = [];
    const walk = (root) => { for (const e of root.querySelectorAll("*")) { if (e.tagName === "CANVAS") out.push(e); if (e.shadowRoot) walk(e.shadowRoot); } };
    walk(document);
    return out;
  }
  let capCanvas = null;
  function capture() {
    const W = Math.ceil(innerWidth), H = Math.ceil(innerHeight);
    if (!capCanvas) capCanvas = document.createElement("canvas");
    if (capCanvas.width !== W || capCanvas.height !== H) { capCanvas.width = W; capCanvas.height = H; }
    const g = capCanvas.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, W, H);
    for (const c of flutterCanvases()) {
      const r = c.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      try { g.drawImage(c, r.x, r.y, r.width, r.height); } catch (e) {}
    }
    const data = g.getImageData(0, 0, W, H).data;
    return {
      px(x, y) { x = Math.max(0, Math.min(W - 1, Math.round(x))); y = Math.max(0, Math.min(H - 1, Math.round(y))); const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2]]; },
    };
  }
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  const RING_POS = [0.137, 0.222, 0.333, 0.443, 0.554, 0.666, 0.777];
  function cellXY(box, s, r, radius) {
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, half = Math.min(box.w, box.h) / 2;
    const a = s * 2 * Math.PI / S, rad = (radius !== undefined ? radius : RING_POS[r]) * half;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  }
  function sampleCell(img, box, s, r) {
    const [x, y] = cellXY(box, s, r), half = box.w / 2, d = Math.max(1, half * (r === 0 ? 0.012 : 0.025));
    const acc = [0, 0, 0];
    for (const [dx, dy] of [[0, 0], [d, 0], [-d, 0], [0, d], [0, -d]]) { const p = img.px(x + dx, y + dy); acc[0] += p[0]; acc[1] += p[1]; acc[2] += p[2]; }
    return acc.map((v) => v / 5);
  }
  const looksEmpty = ([r, g, b]) => r > 185 && g > 150 && r >= b && !(r > 200 && g < 130);

  // the "Order:" dots under the status line give the players' colours in turn order
  function readOrder(ns, img) {
    const lab = ns.find((n) => RX.order.test(n.label));
    if (!lab) return null;
    const cy = lab.y + lab.h / 2;
    const dots = ns.filter((n) => n !== lab && n.w > 6 && n.w <= 30 && Math.abs(n.w - n.h) < 2 && Math.abs(n.y + n.h / 2 - cy) < 14 && n.x > lab.x)
      .sort((a, b) => a.x - b.x);
    if (dots.length < 2) return null;
    const maxW = Math.max(...dots.map((d) => d.w));
    return dots.map((d) => ({ color: img.px(d.x + d.w / 2, d.y + d.h / 2), current: d.w === maxW }));
  }

  function readBoard(box, img, colors) {
    const cells = new Int8Array(N).fill(-1);
    for (let s = 0; s < S; s++) for (let r = 0; r < R; r++) {
      const c = sampleCell(img, box, s, r);
      let bi = -1, bd = 1e9;
      colors.forEach((col, i) => { const d = dist(c, col); if (d < bd) { bd = d; bi = i; } });
      if (bd < 85 && !(looksEmpty(c) && bd > 45)) cells[s * R + r] = bi;
    }
    // sanity: no floating pieces
    for (let s = 0; s < S; s++) { let gap = false; for (let r = 0; r < R; r++) { if (cells[s * R + r] < 0) gap = true; else if (gap) return null; } }
    return cells;
  }

  const TOUCH = (navigator.maxTouchPoints || 0) > 0 && matchMedia("(pointer: coarse)").matches;
  function pointer(type, x, y, buttons) {
    const t = document.querySelector("flutter-view") || document.querySelector("flt-glass-pane") || document.body;
    t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
      pointerId: 1, pointerType: TOUCH ? "touch" : "mouse", isPrimary: true, button: 0, buttons, view: window }));
  }
  async function tap(x, y) {
    lastAction = Date.now();
    if (TOUCH) {          // finger: press, hold a moment, release
      pointer("pointerdown", x, y, 1); await sleep(80);
      pointer("pointermove", x + 0.5, y, 1); await sleep(250);
      pointer("pointerup", x, y, 0); await sleep(60);
      return;
    }
    pointer("pointermove", x, y, 0); await sleep(120);
    pointer("pointerdown", x, y, 1); await sleep(60);
    pointer("pointerup", x, y, 0); await sleep(60);
    pointer("pointermove", 2, innerHeight - 2, 0);
  }

  // ===================================================================
  // 6. The robot's main loop
  // ===================================================================
  const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
  // Dutch when the phone/browser is set to Dutch (or the launcher asks for it)
  const NL = (window.__S4R_CONFIG && window.__S4R_CONFIG.lang) ? window.__S4R_CONFIG.lang === "nl" : /^nl/i.test(navigator.language || "");
  const t = (en, nl) => (NL ? nl : en);
  const LEVEL_NL = { Easy: "Makkelijk", Medium: "Gemiddeld", Hard: "Moeilijk", Expert: "Expert" };
  const lvName = (l) => t(l, LEVEL_NL[l] || l);
  const RES_NL = { win: "GEWONNEN", draw: "GELIJKSPEL", loss: "VERLOREN" };
  // stats are stored as "2 computers - Hard"; show them in the right language
  const showMode = (k) => NL ? k.replace(/ - (\w+)$/, (m, l) => " - " + lvName(l)) : k;
  const auto = window.__S4R_CONFIG || {};
  const settings = Object.assign({ computers: "1", level: "climb", think: 3, games: 0, running: false }, store.get(SET_KEY, {}), auto);
  let running = !!settings.running;
  let game = null, current = null, rotateIdx = store.get("S4R_rot", 0), climb = store.get("S4R_climb", {}), streak = {}, lastAction = Date.now(), lastSig = "";
  let gamesThisRun = store.get(SET_KEY, {}).played || 0; // survives a page reload
  const saveSettings = () => store.set(SET_KEY, { computers: settings.computers, level: settings.level, think: settings.think, games: settings.games, played: gamesThisRun, running });

  let lastSay = "";
  function say(msg) { if (msg !== lastSay) { lastSay = msg; log(msg); } }
  function log(msg) {
    console.log("[S4R] " + msg);
    if (ui) { ui.status.textContent = msg; }
  }

  // which (computers, level) to play next
  function nextMode() {
    const comps = settings.computers === "rotate" ? ["1", "2", "3"] : [settings.computers];
    const lv = settings.level;
    if (lv === "rotate" || settings.computers === "rotate") {
      const levels = lv === "rotate" ? LEVELS : lv === "climb" ? null : [lv];
      const combos = [];
      for (const c of comps) {
        if (levels) for (const l of levels) combos.push([c, l]);
        else combos.push([c, LEVELS[climb[c] || 0]]);
      }
      const m = combos[rotateIdx % combos.length];
      return { computers: m[0], level: m[1] };
    }
    if (lv === "climb") return { computers: comps[0], level: LEVELS[climb[comps[0]] || 0] };
    return { computers: comps[0], level: lv };
  }
  const modeKey = (m) => `${m.computers} computer${m.computers === "1" ? "" : "s"} - ${m.level}`;

  const trace = [];
  const tr = (m) => { trace.push(Date.now() % 100000 + " " + m); if (trace.length > 40) trace.shift(); };
  async function step() {
    const ns = nodes(), tx = texts(ns);
    tr("step " + tx.slice(0, 4).join("|").slice(0, 120));
    // anything changing on screen counts as progress for the watchdog
    const sig = tx.join("|");
    if (sig && sig !== lastSig) { lastSig = sig; lastAction = Date.now(); }
    const btn = (...l) => findBtn(ns, ...l);
    let b;
    if ((b = btn("Continue anonymously")) || (b = btn("Got it"))) { clickNode(b); await sleep(1200); return; }
    if (tx.some((t) => RX.tutorial.test(t))) { await tutorial(ns, tx); return; }

    // game over?
    const res = parseResult(tx);
    if (res && game && !game.done) { await finishGame(res); return; }
    if ((b = btn("Play again"))) {
      const want = nextMode();
      if (current && want.computers === current.computers && want.level === current.level) {
        clickNode(b); startGame(want); await sleep(1500);
      } else {
        const back = btn("Back"); if (back) { clickNode(back); await sleep(1500); }
      }
      return;
    }
    // menus
    if ((b = btn("Against the computer"))) { clickNode(b); await sleep(1200); return; }
    if (btn("1 computer")) {
      const want = nextMode();
      const lab = want.computers === "1" ? "1 computer" : want.computers + " computers";
      const c = btn(lab); if (c) { clickNode(c); await sleep(1200); } return;
    }
    if (btn("Easy") && btn("Expert")) {
      const want = nextMode(); const c = btn(want.level);
      if (c) { clickNode(c); startGame(want); await sleep(1500); } return;
    }
    // our turn?
    if (tx.some((t) => RX.yourMove.test(t))) { await myMove(ns); return; }
    // otherwise: waiting
    if (!tx.length) say(t("I can't read the game's buttons yet - waiting...", "ik kan de knoppen van het spel nog niet lezen - even wachten..."));
    else if (tx.some((x) => RX.order.test(x))) say(t("waiting for the computer...", "wachten op de computer..."));
    else say(t("waiting...", "wachten..."));
  }

  function parseResult(tx) {
    for (const t of tx) {
      const low = t.toLowerCase();
      if (RX.win.test(low)) return RX.you.test(low) || !/computer\s*\d/i.test(low) ? "win" : "loss";
      if (RX.draw.test(low)) return "draw";
    }
    return null;
  }

  function startGame(mode) {
    // pick up what other tabs learned meanwhile
    const fresh = store.get(BRAIN_KEY, null);
    if (fresh) for (const k of ["games", "weights", "book", "fixes", "stats"]) if (fresh[k] !== undefined) brain[k] = fresh[k];
    current = mode;
    game = { mode: modeKey(mode), modeObj: mode, positions: [], np: 0, done: false };
    log(t(`new game: ${game.mode}`, `nieuw potje: ${showMode(game.mode)}`));
    lastAction = Date.now();
  }

  async function finishGame(result) {
    game.done = true;
    lastAction = Date.now();
    learn(game, result);
    gamesThisRun++;
    const st = brain.stats[game.mode];
    log(t(`RESULT: ${result.toUpperCase()} (${game.mode}: ${st[0]} won, ${st[1]} draw, ${st[2]} lost)`, `UITSLAG: ${RES_NL[result]} (${showMode(game.mode)}: ${st[0]} gewonnen, ${st[1]} gelijk, ${st[2]} verloren)`));
    // climbing: 3 wins in a row moves up a level
    const c = game.modeObj.computers;
    streak[c] = result === "win" ? (streak[c] || 0) + 1 : 0;
    if (settings.level === "climb" && streak[c] >= 3) {
      const lv = climb[c] || 0;
      if (lv < LEVELS.length - 1) { climb[c] = lv + 1; store.set("S4R_climb", climb); log(t(`3 wins in a row: moving up to ${LEVELS[lv + 1]}`, `3 keer op rij gewonnen: door naar ${lvName(LEVELS[lv + 1])}`)); }
      streak[c] = 0;
    }
    if (settings.computers === "rotate" || settings.level === "rotate") { rotateIdx++; store.set("S4R_rot", rotateIdx); }
    if (result === "loss") {
      log(t("lost - reviewing my moves to learn from mistakes...", "verloren - ik kijk mijn zetten na om van mijn fouten te leren..."));
      const n = await review(game);
      log(t(`learned ${n} fix${n === 1 ? "" : "es"} from that loss`, `${n} ${n === 1 ? "verbetering" : "verbeteringen"} geleerd van dit verlies`));
    }
    renderStats();
    saveSettings();
    const limit = +settings.games || 0;
    if (limit && gamesThisRun >= limit) {
      running = false; saveSettings();
      log(t(`finished: played ${gamesThisRun} game${gamesThisRun === 1 ? "" : "s"}`, `klaar: ${gamesThisRun} ${gamesThisRun === 1 ? "potje" : "potjes"} gespeeld`));
      console.log("[S4R] DONE");
    }
    renderStats();
  }

  async function myMove(ns) {
    const box = boardBox(ns);
    if (!box) { tr("myMove: no board box"); say(t("my turn, but I can't find the board", "mijn beurt, maar ik vind het bord niet")); pointer("pointermove", innerWidth / 2, innerHeight * 0.55, 0); return; }
    // two identical reads in a row = the board is not animating
    let cells = null, order = null, prev = null;
    for (let i = 0; i < 6; i++) {
      const img = capture();
      order = readOrder(ns, img);
      if (!order) { tr("myMove: no order dots"); await sleep(300); continue; }
      if (order.every((o) => o.color[0] + o.color[1] + o.color[2] < 20)) {
        say(t("I can't see the board (screen is black for me). Reinstall the script, version 2.4 or newer.", "ik kan het bord niet zien (scherm is zwart voor mij). Installeer het script opnieuw, versie 2.4 of nieuwer."));
        return;
      }
      const c = readBoard(box, img, order.map((o) => o.color));
      if (!c) tr("myMove: floating piece, colors " + JSON.stringify(order.map((o) => o.color)));
      if (c && prev && c.join() === prev.join()) { cells = c; break; }
      prev = c; await sleep(250);
    }
    if (!cells) { tr("myMove: unstable board"); say(t("reading the board...", "bord aan het lezen...")); return; }
    const np = order.length, me = order.findIndex((o) => o.current);
    if (me < 0) { tr("myMove: no current dot"); return; }
    if (!game || game.done) startGame(current || nextMode());
    game.np = np;
    const b = Board.fromCells(cells, np, me);
    const eng = new Engine(weightsFor(np));
    await sleep(20);
    const { scores, depth } = eng.analyse(b, me, settings.think * 1000);
    if (!Object.keys(scores).length) return;
    const pick = choose(b, me, scores);
    const s = pick.s, r = b.h[s];
    log(t(`move ${b.count + 1}: slice ${s} (depth ${depth}, ${pick.why})`, `zet ${b.count + 1}: poot ${s} (${depth} zetten vooruit, ${{ "winning line": "winnende zet", "remembered fix": "uit geheugen: fout verbeterd", memory: "geheugen", search: "rekenen" }[pick.why] || pick.why})`));
    if (auto.debug) {
      const rows = [];
      for (let r = R - 1; r >= 0; r--) { let row = ""; for (let q = 0; q < S; q++) { const v = cells[q * R + r]; row += v < 0 ? "." : "ABCD"[v]; } rows.push(row); }
      console.log("[S4R] board me=" + "ABCD"[me] + " colors=" + JSON.stringify(order.map((o) => o.color.map(Math.round))) + "\n" + rows.join("\n"));
    }
    const cz = pick.cz || canonical(b, me);
    const after = b.clone(); after.play(s);
    game.positions.push({ key: cz.key, cmove: toCanon(s, cz.k, cz.m), cells: Array.from(cells), np, me, move: s, f: features(after, me) });
    // Did our piece land? Look at the target cell itself: a fast computer can
    // answer so quickly that "your move" is already showing again, and tapping
    // twice would drop an extra piece.
    const myColor = order[me].color;
    const landed = () => {
      const c = sampleCell(capture(), box, s, r);
      return dist(c, myColor) < 85;
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const [x, y] = cellXY(box, s, r);
      await tap(x, y);
      for (let k = 0; k < 16; k++) {
        await sleep(250);
        const t2 = texts(nodes());
        if (parseResult(t2) || !t2.some((t) => RX.yourMove.test(t)) || landed()) { lastAction = Date.now(); return; }
      }
      // still our turn and the cell is still empty: the tap really was missed
      if (landed()) return;
      say(t("the game didn't react to my tap, trying again", "het spel reageerde niet op mijn tik, ik probeer het opnieuw"));
    }
  }

  // first-time "how to make a move" tutorial
  async function tutorial(ns, tx) {
    const box = boardBox(ns);
    tr("tutorial box " + (box && [box.x, box.y, box.w, box.h].map(Math.round).join(",")));
    if (!box) { pointer("pointermove", innerWidth / 2, innerHeight * 0.55, 0); await sleep(300); return; }
    const your = tx.find((t) => RX.yourTurn.test(t));
    if (!your) return; // still showing the example
    const at = (slice) => cellXY(box, slice, 0, 0.8);
    if (RX.step1.test(your)) {
      log(t("tutorial step 1", "uitleg stap 1"));
      const [x, y] = at(13); await tap(x, y); await sleep(1500);
    } else {
      log(t("tutorial step 2", "uitleg stap 2"));
      const [x0, y0] = at(12); pointer("pointermove", x0, y0, 0); await sleep(300);
      pointer("pointerdown", x0, y0, 1); await sleep(100);
      for (const s of [12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16]) { const [x, y] = at(s); pointer("pointermove", x, y, 1); await sleep(80); }
      const [x1, y1] = at(0); await sleep(300); pointer("pointerup", x1, y1, 0); await sleep(200);
      if (!TOUCH) await tap(x1, y1);
      await sleep(2000);
    }
  }

  async function loop() {
    while (true) {
      if (running) {
        try { await step(); } catch (e) { console.error("[S4R]", e); }
        // watchdog: nothing happened for 150 s -> reload the page and carry on
        if (document.hidden) lastAction = Date.now(); // phone locked / other app: just wait
        if (Date.now() - lastAction > 150000) {
          log(t("stuck - reloading the page", "vastgelopen - pagina wordt herladen"));
          console.log("[S4R] trace " + trace.slice(-6).join(" || "));
          saveSettings();
          location.reload();
          await sleep(10000);
        }
      } else lastAction = Date.now();
      await sleep(running ? 400 : 1000);
    }
  }

  // ===================================================================
  // 7. Small control panel
  // ===================================================================
  let ui = null;
  function renderStats() {
    if (!ui) return;
    const rows = Object.entries(brain.stats).sort();
    ui.stats.innerHTML = rows.length
      ? "<table><tr><td></td><td class=w>" + t("W", "W") + "</td><td>" + t("D", "G") + "</td><td class=l>" + t("L", "V") + "</td></tr>" + rows.map(([k, v]) => `<tr><td>${showMode(k)}</td><td class=w>${v[0]}</td><td>${v[1]}</td><td class=l>${v[2]}</td></tr>`).join("") + "</table>"
      : "<i>" + t("No games yet", "Nog geen potjes gespeeld") + "</i>";
    ui.go.textContent = running ? t("Stop robot", "Stop robot") : t("Start robot", "Start robot");
    ui.go.className = running ? "main stop" : "main";
    ui.pill.textContent = running ? "🕷 Robot ●" : "🕷 Robot";
    const lim = +settings.games || 0;
    if (running) ui.go.textContent = t("Stop robot", "Stop robot") + (lim ? ` (${gamesThisRun}/${lim})` : ` (${gamesThisRun} ${t("played", "gespeeld")})`);
  }
  function buildUI() {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom, 0px));z-index:2147483647;";
    if (matchMedia("(pointer: coarse)").matches) host.style.bottom = "calc(96px + env(safe-area-inset-bottom, 0px))";
    const sh = host.attachShadow({ mode: "open" });
    sh.innerHTML = `<style>
      :host{all:initial} *{box-sizing:border-box;font:13px/1.35 -apple-system,system-ui,Segoe UI,Roboto,sans-serif}
      .pill{background:#2b211b;color:#f1be3c;border:0;border-radius:18px;padding:8px 12px;font-weight:600;box-shadow:0 2px 8px #0005;cursor:pointer}
      .panel{display:none;width:min(300px,calc(100vw - 16px));background:#2b211bee;color:#f7ead6;border-radius:12px;padding:12px;margin-bottom:6px;box-shadow:0 4px 16px #0007}
      .panel.open{display:block} h3{margin:0 0 8px;font-size:15px;color:#f1be3c}
      label{display:flex;justify-content:space-between;align-items:center;margin:6px 0;gap:8px}
      input{width:5.5em;background:#41332a;color:#f7ead6;-webkit-text-fill-color:#f7ead6;border:1px solid #6b5643;border-radius:6px;padding:6px 10px;font-size:16px;text-align:right}
      select{-webkit-appearance:none;appearance:none;background:#41332a;color:#f7ead6;-webkit-text-fill-color:#f7ead6;border:1px solid #6b5643;border-radius:6px;padding:6px 10px;font-size:15px;max-width:62%}
      button.main{width:100%;margin:8px 0 6px;padding:10px;border:0;border-radius:8px;background:#e9443f;color:#fff;font-weight:700;font-size:15px}
      button.main.stop{background:#6b5643}
      .row{display:flex;gap:6px} .row button{flex:1;padding:6px;border:1px solid #6b5643;border-radius:6px;background:#41332a;color:#f7ead6;font-size:12px}
      .status{min-height:2.6em;color:#e8d9bf;font-size:12px;margin:4px 0;word-break:break-word}
      table{width:100%;border-collapse:collapse;font-size:12px} td{padding:2px 4px;border-top:1px solid #4a3a2f} td.w{color:#7ddc7d} td.l{color:#ff8a80}
      .stats{max-height:150px;overflow:auto;margin:6px 0}
    </style>
    <div class=panel>
      <h3>Spindel 4 Robot</h3>
      <label>${t("Computers", "Computers")} <select id=c><option value=1>1 computer</option><option value=2>2 computers</option><option value=3>3 computers</option><option value=rotate>${t("All (take turns)", "Allemaal (om de beurt)")}</option></select></label>
      <label>${t("Level", "Niveau")} <select id=l><option value=climb>${t("Climb (up after 3 wins)", "Klimmen (omhoog na 3 winst)")}</option><option value=Easy>${lvName("Easy")}</option><option value=Medium>${lvName("Medium")}</option><option value=Hard>${lvName("Hard")}</option><option value=Expert>Expert</option><option value=rotate>${t("All (take turns)", "Allemaal (om de beurt)")}</option></select></label>
      <label>${t("Think time", "Denktijd")} <select id=t><option value=0.5>0,5 s</option><option value=1>1 s</option><option value=1.5>${t("1.5 s", "1,5 s")}</option><option value=3>3 s</option><option value=5>5 s</option></select></label>
      <label>${t("Games (0 = nonstop)", "Aantal potjes (0 = nonstop)")} <input id=g type=number min=0 max=9999 inputmode=numeric></label>
      <button class=main id=go>Start robot</button>
      <div class=status id=st>${t("Ready.", "Klaar.")}</div>
      <div class=stats id=stats></div>
      <div class=row><button id=ex>${t("Export brain", "Geheugen opslaan")}</button><button id=im>${t("Import", "Laden")}</button><button id=rs>${t("Forget all", "Alles vergeten")}</button></div>
    </div>
    <button class=pill id=pill>🕷 Robot</button>`;
    const $ = (id) => sh.getElementById(id);
    ui = { pill: $("pill"), go: $("go"), status: $("st"), stats: $("stats"), panel: sh.querySelector(".panel") };
    $("c").value = settings.computers; $("l").value = settings.level; $("t").value = String(settings.think);
    $("c").onchange = (e) => { settings.computers = e.target.value; saveSettings(); };
    $("l").onchange = (e) => { settings.level = e.target.value; saveSettings(); };
    $("t").onchange = (e) => { settings.think = parseFloat(e.target.value); saveSettings(); };
    $("g").value = String(settings.games || 0);
    $("g").onchange = (e) => { settings.games = Math.max(0, parseInt(e.target.value, 10) || 0); e.target.value = String(settings.games); saveSettings(); renderStats(); };
    ui.pill.onclick = () => ui.panel.classList.toggle("open");
    ui.go.onclick = () => { running = !running; if (running) gamesThisRun = 0; saveSettings(); log(running ? t("robot started", "robot gestart") : t("robot stopped", "robot gestopt")); renderStats(); };
    $("ex").onclick = () => {
      const blob = new Blob([JSON.stringify(brain)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spindel4-brain.json"; a.click();
    };
    $("im").onclick = () => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = async () => {
        try { const d = JSON.parse(await inp.files[0].text()); Object.assign(brain, d); saveBrain(); renderStats(); log(t("brain imported", "geheugen geladen")); }
        catch (e) { log(t("could not read that file", "dat bestand kon niet gelezen worden")); }
      };
      inp.click();
    };
    $("rs").onclick = () => {
      if (!confirm(t("Make the robot forget everything it learned?", "Moet de robot alles vergeten wat hij geleerd heeft?"))) return;
      Object.assign(brain, { games: 0, weights: {}, book: {}, fixes: {}, stats: {} }); saveBrain(); renderStats(); log(t("memory cleared", "geheugen gewist"));
    };
    const st = document.createElement("style"); st.textContent = adCss;
    (document.head || document.documentElement).appendChild(st);
    document.documentElement.appendChild(host);
    renderStats();
  }

  const boot = () => {
    buildUI();
    if (auto.autostart) { running = true; gamesThisRun = 0; renderStats(); }
    log(running ? t("robot running", "robot speelt") : t("tap Start robot to begin", "tik op Start robot om te beginnen"));
    loop();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.S4R = { trace, brain, settings, Board, Engine, features, LINES, get adsBlocked() { return adsBlocked; } };
})();
