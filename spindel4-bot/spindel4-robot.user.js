// ==UserScript==
// @name         Spindel 4 Robot
// @namespace    spindel4-robot
// @version      6.3
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
  // Only Safari (iPhone/Mac) needs this; elsewhere it would just slow the game down.
  const NEEDS_READABLE_CANVAS = /Apple/i.test(navigator.vendor || "");
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  if (NEEDS_READABLE_CANVAS) HTMLCanvasElement.prototype.getContext = function (type, attrs) {
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
  // The whole engine lives in this one function so it can also run in
  // background threads (Web Workers): their code is spindelEngine.toString().
  function spindelEngine() {
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
  const NLINES = LINES.length;
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

  const TT_BITS = 19, TT_SIZE = 1 << TT_BITS, TT_MASK = TT_SIZE - 1, INF = 2000000000;
  class Engine {
    constructor(weights, opt) {
      this.w = weights.slice(); this.opt = opt || {};
      this.pvs = this.opt.pvs !== false;
      this.lmr = this.opt.lmr === true;             // (tested: weaker in this game, so off)
      this.killers = this.opt.killers !== false;    // moves that refuted other lines go early
      this.killer = new Int8Array((N + 4) * 2).fill(-1);
      // transposition table in flat typed arrays (no objects, no garbage)
      this.ttK1 = new Int32Array(TT_SIZE); this.ttK2 = new Int32Array(TT_SIZE);
      this.ttV = new Int32Array(TT_SIZE); this.ttD = new Int8Array(TT_SIZE).fill(-1);
      this.ttF = new Int8Array(TT_SIZE); this.ttM = new Int8Array(TT_SIZE);
      this.hist = new Int32Array(4 * S);
      this.mv = []; this.mo = [];
      for (let i = 0; i < N + 4; i++) { this.mv.push(new Int8Array(S)); this.mo.push(new Int32Array(S)); }
      this.thr = new Uint8Array(N); this.touched = new Int16Array(N);
    }
    // same value as features() + weights, without allocating anything
    evaluate(b) {
      const me = this.me, c = b.cells, lc = b.lc, np = b.np, thr = this.thr, touched = this.touched;
      let f0 = 0, f1 = 0, f2 = 0, f3 = 0, f4 = 0, f5 = 0, f6 = 0, nt = 0;
      for (let li = 0, q = 0; li < NLINES; li++, q += 4) {
        const a0 = lc[q], a1 = lc[q + 1], a2 = lc[q + 2], a3 = lc[q + 3];
        let o, n;
        if (a0) { if (a1 | a2 | a3) continue; o = 0; n = a0; }
        else if (a1) { if (a2 | a3) continue; o = 1; n = a1; }
        else if (a2) { if (a3) continue; o = 2; n = a2; }
        else if (a3) { o = 3; n = a3; }
        else continue;
        const sg = o === me ? 1 : -1;
        if (n === 3) {
          f0 += sg;
          const e = c[LA[li]] < 0 ? LA[li] : c[LB[li]] < 0 ? LB[li] : c[LC[li]] < 0 ? LC[li] : LD[li];
          if (!thr[e]) touched[nt++] = e;
          thr[e] |= 1 << o;
        } else if (n === 2) f1 += sg;
        else if (n === 1) f2 += sg;
      }
      for (let k = 0; k < nt; k++) {
        const i = touched[k], t = thr[i], r = i % R;
        for (let p = 0; p < np; p++) if (t >> p & 1) {
          const sg = p === me ? 1 : -1;
          if (np !== 2 || (r % 2) === (p === 0 ? 0 : 1)) f3 += sg; else f4 += sg;
          if (r + 1 < R && (thr[i + 1] >> p & 1)) f5 += sg;
        }
      }
      for (let k = 0; k < nt; k++) thr[touched[k]] = 0;
      for (let s = 0, base = 0; s < S; s++, base += R) for (let r = 0; r < 3; r++) {
        const v = c[base + r]; if (v >= 0) f6 += v === me ? 1 : -1;
      }
      const w = this.w;
      let v = 0;
      v += w[0] * f0; v += w[1] * f1; v += w[2] * f2; v += w[3] * f3; v += w[4] * f4; v += w[5] * f5; v += w[6] * f6;
      return Math.round(1000 * v);
    }
    // "paranoid" search: every opponent plays against us
    search(b, depth, alpha, beta, ply) {
      if ((++this.nodes & 2047) === 0 && performance.now() > this.deadline) this.stop = true;
      if (this.stop) return 0;
      const me = this.me, p = b.turn, np = b.np, mine = p === me, h = b.h;
      const list = this.mv[ply];
      let n = 0;
      for (let s = 0; s < S; s++) if (h[s] < R) {
        if (b.winsWith(p, s * R + h[s])) return mine ? WIN - ply : -(WIN - ply);
        list[n++] = s;
      }
      if (!n) return 0;
      const nx = (p + 1) % np, nxMine = nx === me;
      let nw = 0, nwMove = -1;
      for (let i = 0; i < n; i++) { const s = list[i]; if (b.winsWith(nx, s * R + h[s])) { nw++; nwMove = s; } }
      if (nw) {
        if (!mine && !nxMine) return -(WIN - ply - 1);        // opponents help each other
        if (nw > 1) return nxMine ? WIN - ply - 1 : -(WIN - ply - 1);
        list[0] = nwMove; n = 1;                              // forced block
      } else if (mine !== nxMine) {
        // don't play right under the next player's winning cell
        let m = 0;
        for (let i = 0; i < n; i++) { const s = list[i]; if (!(h[s] + 1 < R && b.winsWith(nx, s * R + h[s] + 1))) list[m++] = s; }
        if (m) n = m;
      }
      if (depth <= 0) return this.evaluate(b);

      // transposition table
      const z1 = b.z1, k2 = (b.z2 * 4 + p) | 0, ti = (z1 ^ Math.imul(k2, 0x9E3779B1 | 0)) & TT_MASK;
      let ttMove = -1;
      if (this.ttD[ti] >= 0 && this.ttK1[ti] === z1 && this.ttK2[ti] === k2) {
        ttMove = this.ttM[ti];
        if (this.ttD[ti] >= depth) {
          const f = this.ttF[ti], v = this.ttV[ti];
          if (f === 0) return v;
          if (f === 1 && v >= beta) return v;
          if (f === 2 && v <= alpha) return v;
        }
      }
      // move ordering: table move first, then history
      const H = this.hist, base = p * S, ord = this.mo[ply];
      const km1 = this.killers ? this.killer[ply * 2] : -1, km2 = this.killers ? this.killer[ply * 2 + 1] : -1;
      for (let i = 0; i < n; i++) {
        const s = list[i];
        ord[i] = s === ttMove ? INF : s === km1 ? INF - 1 : s === km2 ? INF - 2 : H[base + s];
      }
      for (let i = 1; i < n; i++) {
        const sv = list[i], ov = ord[i]; let j = i - 1;
        while (j >= 0 && ord[j] < ov) { list[j + 1] = list[j]; ord[j + 1] = ord[j]; j--; }
        list[j + 1] = sv; ord[j + 1] = ov;
      }
      const a0 = alpha, b0 = beta;
      let best = mine ? -INF : INF, bestM = list[0];
      for (let i = 0; i < n; i++) {
        const s = list[i];
        b.play(s);
        let v;
        // late moves (not the first few, not forced): try them 1 move shallower;
        // only if they look interesting, search them fully
        const reduce = this.lmr && i >= 3 && depth >= 3 && n > 3;
        if (i === 0 || !this.pvs) v = this.search(b, depth - 1, alpha, beta, ply + 1);
        else if (reduce && mine && (v = this.search(b, depth - 2, alpha, alpha + 1, ply + 1)) <= alpha) { /* still not better: done */ }
        else if (reduce && !mine && (v = this.search(b, depth - 2, beta - 1, beta, ply + 1)) >= beta) { /* still not better for them: done */ }
        else if (mine) {
          // can this move beat the best so far? check cheaply first
          v = this.search(b, depth - 1, alpha, alpha + 1, ply + 1);
          if (v > alpha && v < beta && !this.stop) v = this.search(b, depth - 1, alpha, beta, ply + 1);
        } else {
          v = this.search(b, depth - 1, beta - 1, beta, ply + 1);
          if (v < beta && v > alpha && !this.stop) v = this.search(b, depth - 1, alpha, beta, ply + 1);
        }
        b.undo(s);
        if (this.stop) return 0;
        if (mine) { if (v > best) { best = v; bestM = s; } if (v > alpha) alpha = v; }
        else { if (v < best) { best = v; bestM = s; } if (v < beta) beta = v; }
        if (alpha >= beta) {
          H[base + s] += depth * depth;
          if (this.killers && this.killer[ply * 2] !== s) { this.killer[ply * 2 + 1] = this.killer[ply * 2]; this.killer[ply * 2] = s; }
          break;
        }
      }
      const prev = this.ttD[ti];
      if (prev < 0 || prev <= depth || this.ttK1[ti] !== z1) {
        this.ttK1[ti] = z1; this.ttK2[ti] = k2; this.ttV[ti] = best; this.ttD[ti] = depth;
        this.ttF[ti] = best <= a0 ? 2 : best >= b0 ? 1 : 0; this.ttM[ti] = bestM;
      }
      return best;
    }
    // scores for each of `me`'s moves; moves much worse than the best get only a bound
    analyse(b, me, ms, margin = 60, onDepth = null, maxDepth = 40) {
      this.me = me; this.deadline = performance.now() + ms; this.stop = false; this.nodes = 0;
      const moves = b.legal(); let result = {}; let reached = 0;
      for (const s of moves) result[s] = 0;
      for (const s of moves) if (b.isWinMove(me, s)) { const r = {}; for (const t of moves) r[t] = t === s ? WIN : -WIN; return { scores: r, depth: 1 }; }
      for (let depth = 1; depth <= maxDepth; depth++) {
        const sc = {}; let best = -Infinity;
        const order = moves.slice().sort((x, y) => result[y] - result[x]);
        for (const s of order) {
          const alpha = best === -Infinity ? -INF : best - margin - 1;
          b.play(s);
          const v = this.search(b, depth - 1, alpha, INF, 1);
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
  // Fast 2-player engine compiled from engine-wasm/spindel.c (same results as
  // Engine.search, ~4x faster). Filled in by engine-wasm/embed.py.
  const WASM_B64 = /*WASM-B64*/"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"/*WASM-END*/;
  async function loadWasm(weights) {
    if (!WASM_B64 || typeof WebAssembly === "undefined") return null;
    const bytes = Uint8Array.from(atob(WASM_B64), (c) => c.charCodeAt(0));
    const { instance } = await WebAssembly.instantiate(bytes, { env: { now_ms: () => performance.now() } });
    const X = instance.exports; X.setup();
    return X;
  }

  // Splits the moves at the top of the search over several threads.
  // Gives the same kind of answer as Engine.analyse(), just faster.
  const WORKER_MAIN = `
    const E = spindelEngine(); let b = null, eng = null, X = null, useWasm = false;
    const wasmReady = E.loadWasm().then((x) => { X = x; }).catch(() => { X = null; });
    let chain = wasmReady;
    function handle(d) {
      if (d.type === "init") {
        b = E.Board.fromCells(Int8Array.from(d.cells), d.np, d.turn);
        useWasm = !!X && d.np === 2 && d.wasm !== false;
        if (useWasm) {
          X.clear();
          for (let i = 0; i < d.cells.length; i++) if (d.cells[i] >= 0) X.set_cell(i, d.cells[i]);
          X.set_turn(d.turn, d.me);
          d.weights.forEach((w, k) => X.set_weight(k, w));
        } else { eng = new E.Engine(d.weights); eng.me = d.me; }
      } else if (d.type === "search") {
        if (useWasm) {
          const v = X.root_search(d.s, d.depth, d.alpha, d.remaining);
          postMessage({ s: d.s, v, nodes: X.get_nodes(), stopped: !!X.get_stopped(), wasm: true });
        } else {
          eng.deadline = performance.now() + d.remaining; eng.stop = false; eng.nodes = 0;
          b.play(d.s);
          const v = eng.search(b, d.depth - 1, d.alpha, E.INF, 1);
          b.undo(d.s);
          postMessage({ s: d.s, v, nodes: eng.nodes, stopped: eng.stop });
        }
      }
    }
    onmessage = (e) => { chain = chain.then(() => handle(e.data)); };`;
  class ParallelSearch {
    constructor(factorySrc, threads) {
      const url = URL.createObjectURL(new Blob([factorySrc + "\n" + WORKER_MAIN], { type: "text/javascript" }));
      this.workers = [];
      for (let i = 0; i < Math.max(1, threads); i++) this.workers.push(new Worker(url));
      this.nodes = 0; this.cancelled = false;
    }
    terminate() { this.cancelled = true; for (const w of this.workers) w.terminate(); this.workers = []; }
    _run(w, msg) { return new Promise((res) => { w.onmessage = (e) => res(e.data); w.postMessage(msg); }); }
    // ms = normal think time; opts.minDepth = keep going until this many moves
    // ahead (up to opts.hardMs at most)
    async analyse(b, me, ms, weights, margin = 60, onDepth = null, maxDepth = 40, opts = {}) {
      const moves = b.legal(); this.nodes = 0; this.cancelled = false;
      for (const s of moves) if (b.isWinMove(me, s)) { const r = {}; for (const t of moves) r[t] = t === s ? WIN : -WIN; return { scores: r, depth: 1 }; }
      const init = { type: "init", cells: Array.from(b.cells), np: b.np, turn: b.turn, me, weights, wasm: this.useWasm !== false };
      for (const w of this.workers) w.postMessage(init);
      const t0 = Date.now(), minDepth = opts.minDepth || 0;
      const deadline = t0 + Math.max(ms, opts.hardMs || 0);
      let result = {}, reached = 0;
      for (const s of moves) result[s] = 0;
      for (let depth = 1; depth <= maxDepth; depth++) {
        const order = moves.slice().sort((x, y) => result[y] - result[x]);
        const prevBest = reached ? result[order[0]] : null;
        // start every thread at once with a bound guessed from the previous round
        let asp = (this.aspiration === true && prevBest !== null && Math.abs(prevBest) < WIN - 200) ? prevBest - 400 : null;
        let sc = {}, best = -Infinity, stopped = false;
        const one = async (w, s, floor) => {
          let alpha = best === -Infinity ? -INF : best - margin - 1;
          if (floor !== null && floor !== undefined && floor > alpha) alpha = floor;
          const r = await this._run(w, { type: "search", s, depth, alpha, remaining: Math.max(1, deadline - Date.now()) });
          this.nodes += r.nodes;
          if (r.stopped) stopped = true; else { sc[s] = r.v; if (r.v > best) best = r.v; }
        };
        const runAll = async (list, floor) => {
          const queue = list.slice();
          await Promise.all(this.workers.map(async (w) => {
            while (queue.length && !stopped && !this.cancelled) await one(w, queue.shift(), floor);
          }));
        };
        if (asp !== null) {
          await runAll(order, asp);
          if (!stopped && best <= asp) { sc = {}; best = -Infinity; asp = null; }  // guess was too high: redo
        }
        if (asp === null && !stopped && !this.cancelled) {
          // best move from the previous round first, alone, so the others get a bound to beat
          await one(this.workers[0], order[0], null);
          await runAll(order.slice(1), null);
        }
        if (stopped || this.cancelled || Object.keys(sc).length < moves.length) break;
        const vals = Object.values(sc);
        if (vals.every((v) => v <= -WIN + 200) && reached > 0) break;
        result = sc; reached = depth;
        if (onDepth) onDepth(reached, result, this.nodes);
        if (Math.max(...vals) >= WIN - 200 || vals.every((v) => v <= -WIN + 200)) break;
        if (b.count + depth >= N) break;
        if (Date.now() >= deadline) break;
        if (Date.now() - t0 >= ms && reached >= minDepth) break;   // thought long and deep enough
      }
      return { scores: result, depth: reached };
    }
  }
  return { S, R, N, WIN, INF, LINES, NLINES, LINES_AT, Board, Engine, features, FEATURES, DEFAULT_W, ParallelSearch, loadWasm };
  }
  // ENGINE-END
  const { S, R, N, WIN, INF, LINES, Board, Engine, features, FEATURES, DEFAULT_W, ParallelSearch } = spindelEngine();
  const ENGINE_SRC = spindelEngine.toString();

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
    "Play online": ["Play online", "Online spelen"],
    "Join": ["Join", "Meedoen"],
    "Rematch": ["Ja, nog een potje", "Yes, another game", "Yes, play again", "Rematch"],
    "1 computer": ["1 computer"],
    "2 computers": ["2 computers"],
    "3 computers": ["3 computers"],
    "Easy": ["Easy", "Makkelijk"],
    "Medium": ["Medium", "Gemiddeld"],
    "Hard": ["Hard", "Moeilijk"],
    "Expert": ["Expert"],
    "Impossible": ["Impossible", "Onmogelijk"],
  };
  const RX = {
    yourMove: /^(your move|your turn:|jouw zet|jij bent aan zet|je bent aan zet|jij bent aan de beurt|je bent aan de beurt|it'?s your turn|aan (de beurt|zet):)(?!\s*computer\s*\d)/i,
    youTurn: /^(jij bent aan de beurt|je bent aan de beurt|jij bent aan zet|je bent aan zet|it'?s your turn|your move)/i,
    youWin: /^(jij|je|you)\b.*\b(wint|wins|won|gewonnen)\b/i,
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
  // Press a game button. Some phones ignore the accessibility click, so if the
  // same button has to be pressed again, alternate with a real tap on its spot.
  let lastClickKey = "", clickRepeat = 0, lastClickTime = 0;
  function clickNode(n) {
    lastAction = Date.now();
    const key = n.label;
    // same button still there: give the game 2.5 s to react before pressing again
    if (key === lastClickKey && Date.now() - lastClickTime < 2500) return;
    if (key === lastClickKey) clickRepeat++; else { lastClickKey = key; clickRepeat = 0; }
    lastClickTime = Date.now();
    if (clickRepeat >= 1) say(t(`pressing: ${key} (try ${clickRepeat + 1})`, `ik druk op: ${key} (poging ${clickRepeat + 1})`));
    if (clickRepeat % 2 === 1) {
      const x = n.x + n.w / 2, y = n.y + n.h / 2;
      const type = TOUCH ? "touch" : "mouse";
      const target = document.querySelector("flutter-view") || document.querySelector("flt-glass-pane") || document.body;
      const o = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, pointerId: 3, pointerType: type, isPrimary: true, button: 0, view: window };
      target.dispatchEvent(new PointerEvent("pointerdown", Object.assign({ buttons: 1 }, o)));
      setTimeout(() => target.dispatchEvent(new PointerEvent("pointerup", Object.assign({ buttons: 0 }, o))), 70);
    } else {
      n.el.click();
    }
  }

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
  // copy the screen at a reduced size: plenty to read colours, much less work
  function capture() {
    const k = Math.min(1, 700 / Math.max(innerWidth, innerHeight));
    const W = Math.ceil(innerWidth * k), H = Math.ceil(innerHeight * k);
    if (!capCanvas) capCanvas = document.createElement("canvas");
    if (capCanvas.width !== W || capCanvas.height !== H) { capCanvas.width = W; capCanvas.height = H; }
    const g = capCanvas.getContext("2d", { willReadFrequently: true });
    g.clearRect(0, 0, W, H);
    for (const c of flutterCanvases()) {
      const r = c.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      try { g.drawImage(c, r.x * k, r.y * k, r.width * k, r.height * k); } catch (e) {}
    }
    const data = g.getImageData(0, 0, W, H).data;
    return {
      px(x, y) { x = Math.max(0, Math.min(W - 1, Math.round(x * k))); y = Math.max(0, Math.min(H - 1, Math.round(y * k))); const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2]]; },
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
    const maxW = Math.max(...dots.map((d) => d.w)), minW = Math.min(...dots.map((d) => d.w));
    // against the computer the player to move has a bigger dot; online all dots
    // can be the same size, then "current" stays unknown
    if (maxW - minW >= 2) return dots.map((d) => ({ color: img.px(d.x + d.w / 2, d.y + d.h / 2), current: d.w === maxW }));
    // same size: the player to move has a dark ring around the dot
    const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
    const info = dots.map((d) => {
      const cx = d.x + d.w / 2, cy = d.y + d.h / 2, c = img.px(cx, cy);
      const e = [img.px(d.x + 1.5, cy), img.px(d.x + d.w - 1.5, cy), img.px(cx, d.y + 1.5), img.px(cx, d.y + d.h - 1.5)];
      const edge = Math.min(...e.map(lum));
      return { color: c, ring: lum(c) - edge };
    });
    const ringed = info.filter((i) => i.ring > 45);
    return info.map((i) => ({ color: i.color, current: ringed.length === 1 ? i === ringed[0] : null }));
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
  const LEVELS = ["Easy", "Medium", "Hard", "Expert", "Impossible"];
  // Dutch when the phone/browser is set to Dutch (or the launcher asks for it)
  const NL = (window.__S4R_CONFIG && window.__S4R_CONFIG.lang) ? window.__S4R_CONFIG.lang === "nl" : /^nl/i.test(navigator.language || "");
  const t = (en, nl) => (NL ? nl : en);
  const LEVEL_NL = { Easy: "Makkelijk", Medium: "Gemiddeld", Hard: "Moeilijk", Expert: "Expert", Impossible: "Onmogelijk" };
  const lvName = (l) => t(l, LEVEL_NL[l] || l);
  const RES_NL = { win: "GEWONNEN", draw: "GELIJKSPEL", loss: "VERLOREN" };
  // stats are stored as "2 computers - Hard"; show them in the right language
  const showMode = (k) => NL ? k.replace(/ - (\w+)$/, (m, l) => " - " + lvName(l)) : k;
  const auto = window.__S4R_CONFIG || {};
  const settings = Object.assign({ computers: "1", level: "climb", think: 3, games: 0, assistWin: false, assistBlock: false, onlineCode: "", minDepth: 0, running: false }, store.get(SET_KEY, {}), auto);
  let running = !!settings.running;
  let game = null, current = null, rotateIdx = store.get("S4R_rot", 0), climb = store.get("S4R_climb", {}), streak = {}, lastAction = Date.now(), lastSig = "";
  let gamesThisRun = store.get(SET_KEY, {}).played || 0; // survives a page reload
  const saveSettings = () => store.set(SET_KEY, { computers: settings.computers, level: settings.level, think: settings.think, games: settings.games, assistWin: settings.assistWin, assistBlock: settings.assistBlock, onlineCode: settings.onlineCode, minDepth: settings.minDepth, played: gamesThisRun, running });

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
  const modeKey = (m) => m.computers === "online" ? "online test" : `${m.computers} computer${m.computers === "1" ? "" : "s"} - ${m.level}`;

  const trace = [];
  const tr = (m) => { trace.push(Date.now() % 100000 + " " + m); if (trace.length > 40) trace.shift(); };
  const online = { joined: false, done: false };
  const onlineMode = () => !!(settings.onlineCode && String(settings.onlineCode).trim());
  function deepQuery(sel) {
    const walk = (root) => { const f = root.querySelector(sel); if (f) return f; for (const e of root.querySelectorAll("*")) if (e.shadowRoot) { const r = walk(e.shadowRoot); if (r) return r; } return null; };
    return walk(document);
  }
  // who has four in a row on the board? (used when the result text is ambiguous)
  function winnerFromBoard(ns) {
    // the game ended right after our move that makes four in a row: we won
    if (game && game.lastMoveWins !== undefined) return game.lastMoveWins ? "win" : "loss";
    try {
      const box = boardBox(ns), img = capture(), order = box && readOrder(ns, img);
      if (!box || !order) return "loss";
      const cells = readBoard(box, img, order.map((o) => o.color));
      if (!cells) return "loss";
      const w = Board.fromCells(cells, order.length, 0).winner();
      if (w < 0) return "draw";
      let me = -1;
      if (myColor) { let bd = 1e9; order.forEach((o, i) => { const d = dist(o.color, myColor); if (d < bd) { bd = d; me = i; } }); }
      if (me < 0) return "loss";
      tr("winner from board: " + w + " me " + me);
      return w === me ? "win" : "loss";
    } catch (e) { return "loss"; }
  }
  async function step() {
    const ns = nodes(), tx = texts(ns);
    tr("step " + tx.slice(0, 4).join("|").slice(0, 120));
    // anything changing on screen counts as progress for the watchdog
    const sig = tx.join("|");
    if (sig && sig !== lastSig) { lastSig = sig; lastAction = Date.now(); }
    const btn = (...l) => findBtn(ns, ...l);
    if (!boardBox(ns)) hideThinking();
    let b;
    if ((b = btn("Continue anonymously")) || (b = btn("Got it"))) { clickNode(b); await sleep(1200); return; }
    if (tx.some((t) => RX.tutorial.test(t))) { await tutorial(ns, tx); return; }

    // game over?
    // only count a result once this game has really started (a rematch keeps
    // showing the old "wint" text for a moment)
    if (game && tx.some((x) => RX.yourMove.test(x) || RX.youTurn.test(x) || /is aan de beurt|denkt na|is thinking|'s turn/i.test(x))) game.seenTurn = true;
    let res = parseResult(tx);
    if (res && game && !game.done && !game.seenTurn) res = null;
    if (res === "board") res = (game && !game.done) ? winnerFromBoard(ns) : null;
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
    // ---- temporary online test: join one private game by room code ----
    if (onlineMode()) {
      tr("online done=" + online.done + " joined=" + online.joined + " youTurn=" + tx.some((x) => RX.youTurn.test(x)));
      if (online.done) { say(t("online test game finished", "online testpotje klaar")); return; }
      if (online.joined && (b = btn("Rematch"))) {
        clickNode(b); startGame({ computers: "online", level: "test" });
        say(t("rematch accepted, next game...", "nog een potje: ja! volgende potje..."));
        await sleep(2000); return;
      }
      if (btn("Against the computer") && (b = btn("Play online"))) { clickNode(b); await sleep(1500); return; }
      const codeLabel = ns.find((n) => /kamercode|room code/i.test(n.label) && n.role !== "button" && !/^(privé|private)/i.test(n.label));
      const join = ns.filter((n) => n.role === "button" && /^(meedoen|join)$/i.test(n.label)).pop();
      if (codeLabel && join && !online.joined) {
        const inp = deepQuery('input[aria-label="Kamercode"], input[aria-label="Room code"], input[aria-label*="code" i]');
        if (!inp) {
          // tap the code field so the game creates its text input
          const field = ns.filter((n) => n.w > 150 && n.h >= 30 && n.h <= 70 && n.y > codeLabel.y && n.y < join.y).sort((a, c) => a.y - c.y)[0];
          if (field) { const x = field.x + field.w / 2, y = field.y + field.h / 2; pointer("pointerdown", x, y, 1); await sleep(60); pointer("pointerup", x, y, 0); }
          await sleep(800); return;
        }
        if (inp.value !== settings.onlineCode) {
          inp.focus(); inp.value = settings.onlineCode;
          inp.dispatchEvent(new InputEvent("input", { bubbles: true, data: settings.onlineCode, inputType: "insertText" }));
          say(t(`room code ${settings.onlineCode} typed`, `kamercode ${settings.onlineCode} ingevuld`));
          await sleep(800); return;
        }
        clickNode(join); online.joined = true;
        startGame({ computers: "online", level: "test" });
        say(t("joined the private game, waiting for the other player...", "meegedaan met het privé spel, wachten op de andere speler..."));
        await sleep(2000); return;
      }
      // in the game: only move when the game says it's "(jij)/(you)"
      if (tx.some((x) => RX.youTurn.test(x) || (RX.yourMove.test(x) && RX.you.test(x)))) { await myMove(ns); return; }
      if (tx.some((x) => RX.yourMove.test(x))) say(t("online: waiting for the other player (sign out so I can see '(you)')", "online: wachten op de andere speler (log uit, dan zie ik '(jij)')"));
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
      const want = nextMode(); let c = btn(want.level);
      if (!c && want.level === "Impossible" && (c = btn("Expert"))) {
        // the game doesn't have this level (yet): play the hardest one there is
        say(t("this game has no 'Impossible' level yet - playing Expert", "dit spel heeft (nog) geen niveau 'Onmogelijk' - ik speel Expert"));
        want.level = "Expert";
      }
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
      if (RX.win.test(low)) {
        if (RX.you.test(low) || RX.youWin.test(low)) return "win";
        if (onlineMode()) return "board";            // online: "Speler wint" doesn't say who - look at the board
        return !/computer\s*\d/i.test(low) ? "win" : "loss";
      }
      if (RX.draw.test(low)) return "draw";
    }
    return null;
  }

  function startGame(mode) {
    myColor = null;
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
    // online: keep playing rematches in the same room (stops only at the games limit)
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

  // thinking happens in background threads (several CPU cores at once);
  // if the browser doesn't allow that, fall back to one thread
  let pool = null, poolFailed = false;
  function threadCount() {
    const cores = navigator.hardwareConcurrency || 4;
    // leave cores free so the game and the screen stay smooth
    const want = +settings.threads || (TOUCH ? Math.max(1, Math.min(3, cores - 2)) : Math.max(1, Math.min(6, cores - 2)));
    return Math.max(1, Math.min(16, want));
  }
  // ---- "thinking" overlay: big circle round the board + green dot on the best move so far
  let thinkEl = null, tk = null;
  function showThinking(box, b, info) {
    const NSV = "http://www.w3.org/2000/svg";
    if (!thinkEl) {
      // built once; afterwards only attributes change (smooth, no flicker, little work)
      thinkEl = document.createElement("div");
      thinkEl.style.cssText = "position:fixed;pointer-events:none;z-index:2147483645;display:none";
      thinkEl.innerHTML =
        '<svg width="100%" height="100%" style="overflow:visible">' +
        '<defs><filter id="s4rglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
        '<linearGradient id="s4rgrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4ade80"/><stop offset="1" stop-color="#16a34a"/></linearGradient></defs>' +
        '<circle class="track" fill="none" stroke="#22c55e2e"/>' +
        '<circle class="prog" fill="none" stroke="url(#s4rgrad)" stroke-linecap="round" filter="url(#s4rglow)" style="transition:stroke-dasharray .45s ease"/>' +
        '<g class="best" style="transition:transform .35s ease"><circle class="halo" fill="#22c55e33"><animate attributeName="r" dur="1.4s" repeatCount="indefinite"/></circle>' +
        '<circle class="dot" fill="#22c55e" stroke="#fff" stroke-width="2.5" filter="url(#s4rglow)"/></g></svg>' +
        '<div class="lbl" style="position:absolute;left:50%;top:-10px;transform:translate(-50%,-100%);display:flex;gap:8px;align-items:center;' +
        'background:rgba(20,40,28,.92);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#ecfdf5;border:1px solid #22c55e66;' +
        'font:700 13px/1.2 -apple-system,system-ui,sans-serif;padding:7px 12px;border-radius:999px;white-space:nowrap;box-shadow:0 6px 18px #0006"></div>';
      document.documentElement.appendChild(thinkEl);
      const q = (c) => thinkEl.querySelector("." + c);
      tk = { track: q("track"), prog: q("prog"), best: q("best"), halo: q("halo"), anim: thinkEl.querySelector("animate"), dot: q("dot"), lbl: q("lbl") };
    }
    Object.assign(thinkEl.style, { left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px", display: "block" });
    const half = box.w / 2, cx = half, cy = box.h / 2, R0 = half * 0.86, C = 2 * Math.PI * R0, sw = Math.max(6, half * 0.035);
    for (const c of [tk.track, tk.prog]) { c.setAttribute("cx", cx); c.setAttribute("cy", cy); c.setAttribute("r", R0); c.setAttribute("stroke-width", sw); }
    tk.prog.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
    const prog = info.minDepth ? Math.min(1, info.depth / info.minDepth) : Math.min(1, info.secs / Math.max(0.5, info.think));
    tk.prog.setAttribute("stroke-dasharray", `${C * prog} ${C}`);
    if (info.best >= 0 && b.h[info.best] < R) {
      const [x, y] = cellXY({ x: 0, y: 0, w: box.w, h: box.h }, info.best, b.h[info.best]);
      const rad = Math.max(9, half * 0.055);
      tk.best.style.display = ""; tk.best.style.transform = `translate(${x}px,${y}px)`;
      tk.dot.setAttribute("r", rad); tk.halo.setAttribute("r", rad * 1.8);
      tk.anim.setAttribute("values", `${rad * 1.4};${rad * 2.2};${rad * 1.4}`);
    } else tk.best.style.display = "none";
    tk.lbl.textContent = t(
      `🧠 ${info.depth} moves ahead${info.minDepth ? " / " + info.minDepth : ""} · ${(info.nps / 1e6).toFixed(2)} M/s · ${info.secs.toFixed(0)} s`,
      `🧠 ${info.depth} zetten vooruit${info.minDepth ? " / " + info.minDepth : ""} · ${(info.nps / 1e6).toFixed(2)} mln/s · ${info.secs.toFixed(0)} s`);
  }
  function hideThinking() { if (thinkEl) thinkEl.style.display = "none"; }

  // online games have a turn timer: never think longer than the time that is left
  function turnTimeLeft(tx) {
    for (const x of tx) { const m = /^(\d{1,3})\s*s$/.exec(x.trim()); if (m) return +m[1]; }
    return null;
  }

  async function think(b, me, np, box, tx) {
    const thinkMs = settings.think * 1000, minDepth = +settings.minDepth || 0;
    let hardMs = minDepth ? Math.max(thinkMs, 300000) : thinkMs;      // max 5 min to reach the minimum depth
    const left = tx ? turnTimeLeft(tx) : null;
    if (left !== null) hardMs = Math.min(hardMs, Math.max(1500, (left - 4) * 1000));
    const softMs = Math.min(thinkMs, hardMs);
    const t0 = performance.now();
    let best = -1, lastDepth = 0;
    if (box) showThinking(box, b, { best, depth: 0, minDepth, nps: 0, secs: 0, think: settings.think });
    const onDepth = (depth, scores, nodes) => {
      lastDepth = depth;
      let bs = -1; for (const k in scores) if (bs < 0 || scores[k] > scores[bs]) bs = +k;
      best = bs;
      const secs = (performance.now() - t0) / 1000;
      if (box) showThinking(box, b, { best, depth, minDepth, nps: nodes / Math.max(secs, 0.001), secs, think: settings.think });
    };
    // keep the circle filling while a deep step is running
    const ticker = box ? setInterval(() => {
      // left the game (main menu, other screen)? hide the circle and stop thinking
      const ns2 = nodes(), tx2 = texts(ns2);
      if (!boardBox(ns2) || !tx2.some((x) => RX.yourMove.test(x) || RX.youTurn.test(x))) {
        hideThinking(); if (pool) pool.cancelled = true; return;
      }
      const secs = (performance.now() - t0) / 1000;
      showThinking(box, b, { best, depth: lastDepth, minDepth, nps: (pool ? pool.nodes : 0) / Math.max(secs, 0.001), secs, think: settings.think });
    }, 700) : null;
    try {
      if (!pool && !poolFailed) {
        try { pool = new ParallelSearch(ENGINE_SRC, threadCount()); }
        catch (e) { poolFailed = true; console.warn("[S4R] no threads, using one", e); }
      }
      if (pool) {
        try { return await pool.analyse(b, me, softMs, weightsFor(np), 60, onDepth, 40, { minDepth, hardMs }); }
        catch (e) { poolFailed = true; try { pool.terminate(); } catch (e2) {} pool = null; }
      }
      await sleep(20);
      return new Engine(weightsFor(np)).analyse(b, me, softMs, 60, onDepth);
    } finally {
      if (ticker) clearInterval(ticker);
      hideThinking();
    }
  }

  // Which colour is ours? Online the dots don't say, so use the board itself.
  let myColor = null;   // colour of a piece we placed ourselves this game
  function whoAmI(order, cells) {
    const np = order.length;
    if (onlineMode()) {
      if (myColor) {
        let bi = 0, bd = 1e9;
        order.forEach((o, i) => { const d = dist(o.color, myColor); if (d < bd) { bd = d; bi = i; } });
        if (bd < 90) return bi;
      }
      const cnt = new Array(np).fill(0); let n = 0;
      for (let k = 0; k < cells.length; k++) if (cells[k] >= 0) { cnt[cells[k]]++; n++; }
      // 2 players, odd number of pieces on our turn: the opponent has one more piece
      if (np === 2 && n % 2 === 1) return cnt[0] < cnt[1] ? 0 : 1;
      if (n === 0) return order.findIndex((o) => o.current === true) >= 0 ? order.findIndex((o) => o.current === true) : 0;
    }
    const i = order.findIndex((o) => o.current === true);
    if (i >= 0) return i;
    let n = 0; for (let k = 0; k < cells.length; k++) if (cells[k] >= 0) n++;
    return n % np;
  }
  async function myMove(ns) {
    tr("myMove start");
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
    const np = order.length, me = whoAmI(order, cells);
    if (me < 0) { tr("myMove: no current dot"); return; }
    if (!game || game.done) startGame(current || nextMode());
    game.np = np;
    const b = Board.fromCells(cells, np, me);
    tr("myMove np=" + np + " me=" + me + " pieces=" + b.count);
    const { scores, depth } = await think(b, me, np, box, texts(nodes()));
    if (!Object.keys(scores).length) { tr("myMove: no scores"); return; }
    {
      const ns3 = nodes(), tx3 = texts(ns3);
      if (!boardBox(ns3) || !tx3.some((x) => RX.yourMove.test(x) || RX.youTurn.test(x))) {
        hideThinking(); tr("myMove: left the game while thinking"); return;   // never tap on another screen
      }
    }
    const pick = choose(b, me, scores);
    const s = pick.s, r = b.h[s];
    game.lastMoveWins = b.isWinMove(me, s);
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
    const ourColor = order[me].color;
    const landed = () => {
      const c = sampleCell(capture(), box, s, r);
      const filled = order.some((o) => dist(c, o.color) < 85);
      if (filled && onlineMode() && !myColor) myColor = c;   // learn our colour from our own piece
      return filled;
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      // tap halfway out along the slice: the game picks the slice by angle and
      // drops the piece itself; the tiny inner cells next to the hub are easy to miss
      const [x, y] = cellXY(box, s, r, Math.max(RING_POS[r], 0.5));
      await tap(x, y);
      for (let k = 0; k < 12; k++) {
        await sleep(350);
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
      await sleep(!running ? 1000 : lastSay.startsWith(t("waiting", "wachten")) ? 700 : 400);   // check less often while waiting
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
    ui.pill.classList.toggle("on", running);
    const chip = ui.panel.querySelector("#chip");
    if (chip) { chip.textContent = running ? t("playing", "speelt") : t("idle", "stil"); chip.classList.toggle("on", running); }
    const lim = +settings.games || 0;
    if (running) ui.go.textContent = t("Stop robot", "Stop robot") + (lim ? ` (${gamesThisRun}/${lim})` : ` (${gamesThisRun} ${t("played", "gespeeld")})`);
  }
  function buildUI() {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:8px;bottom:calc(8px + env(safe-area-inset-bottom, 0px));z-index:2147483647;";
    if (matchMedia("(pointer: coarse)").matches) host.style.bottom = "calc(96px + env(safe-area-inset-bottom, 0px))";
    const sh = host.attachShadow({ mode: "open" });
    sh.innerHTML = `<style>
      :host{all:initial}
      *{box-sizing:border-box;font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
      .pill{display:flex;align-items:center;gap:8px;background:linear-gradient(180deg,#3a2c22,#241b15);color:#f6c445;border:1px solid #5a4636;border-radius:22px;padding:9px 14px;font-weight:700;letter-spacing:.2px;box-shadow:0 6px 18px #0006,inset 0 1px 0 #ffffff14;cursor:pointer}
      .pill .dot{width:9px;height:9px;border-radius:50%;background:#7a6a5c}
      .pill.on .dot{background:#22c55e;box-shadow:0 0 0 0 #22c55e88;animation:pulse 1.6s infinite}
      @keyframes pulse{0%{box-shadow:0 0 0 0 #22c55e88}70%{box-shadow:0 0 0 8px #22c55e00}100%{box-shadow:0 0 0 0 #22c55e00}}
      .panel{display:none;width:min(320px,calc(100vw - 16px));max-height:min(72vh,640px);overflow:auto;-webkit-overflow-scrolling:touch;
        background:rgba(30,23,18,.94);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#f5ead9;border:1px solid #4d3c30;border-radius:16px;padding:14px;margin-bottom:8px;box-shadow:0 14px 40px #000a}
      .panel.open{display:block;animation:pop .16s ease-out}
      @keyframes pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
      .head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
      h3{margin:0;font-size:16px;font-weight:800;color:#f6c445;letter-spacing:.2px}
      .chip{font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;background:#3a2d24;color:#c9b8a2}
      .chip.on{background:#14532d;color:#bbf7d0}
      .sec{background:#2a2019;border:1px solid #3e3027;border-radius:12px;padding:6px 10px;margin:8px 0}
      .sec .t{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#a8927c;margin:4px 0 2px}
      label{display:flex;justify-content:space-between;align-items:center;margin:7px 0;gap:10px;color:#eadcc7}
      input,select{background:#3a2d24;color:#f7ead6;-webkit-text-fill-color:#f7ead6;border:1px solid #5a4636;border-radius:9px;padding:7px 10px;font-size:15px;outline:none}
      input:focus,select:focus{border-color:#f6c445;box-shadow:0 0 0 3px #f6c44533}
      input{width:6em;text-align:right}
      select{-webkit-appearance:none;appearance:none;max-width:62%;padding-right:28px;background-image:linear-gradient(45deg,transparent 50%,#c9b8a2 50%),linear-gradient(135deg,#c9b8a2 50%,transparent 50%);background-position:calc(100% - 15px) 52%,calc(100% - 10px) 52%;background-size:5px 5px;background-repeat:no-repeat}
      button.main{width:100%;margin:2px 0 6px;padding:12px;border:0;border-radius:12px;background:linear-gradient(180deg,#f0544f,#d93a35);color:#fff;font-weight:800;font-size:16px;box-shadow:0 6px 16px #d93a3555,inset 0 1px 0 #ffffff33;cursor:pointer}
      button.main.stop{background:linear-gradient(180deg,#5c4a3c,#4a3a2e);box-shadow:inset 0 1px 0 #ffffff1a}
      .assistbtn{width:100%;padding:10px;border:1px solid #5a4636;border-radius:12px;background:#33271f;color:#f5ead9;font-weight:700;font-size:14px;margin:2px 0 6px;cursor:pointer}
      .assistbtn.on{background:linear-gradient(180deg,#2f8a57,#246b44);border-color:#2f8a57}
      .assist{display:none;background:#2a2019;border:1px solid #3e3027;border-radius:12px;padding:8px 10px;margin-bottom:6px}
      .assist.open{display:block}
      label.chk{justify-content:flex-start;gap:10px;margin:8px 0;cursor:pointer}
      label.chk input{position:absolute;opacity:0;width:0;height:0}
      .sw{flex:none;width:40px;height:24px;border-radius:12px;background:#4a3a2e;position:relative;transition:background .2s}
      .sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#f5ead9;box-shadow:0 1px 3px #0006;transition:transform .2s}
      label.chk input:checked + .sw{background:#22c55e} label.chk input:checked + .sw::after{transform:translateX(16px)}
      .ring{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:6px;vertical-align:-1px;border:3px solid}
      .ring.win{border-color:#22c55e} .ring.block{border-color:#f97316}
      .note{font-size:11px;color:#a8927c;margin-top:4px}
      .status{min-height:2.4em;color:#eadcc7;font-size:12.5px;margin:6px 2px;word-break:break-word}
      .stats{max-height:160px;overflow:auto;margin:4px 0 8px}
      table{width:100%;border-collapse:collapse;font-size:12.5px} td{padding:4px 6px;border-top:1px solid #3e3027} tr:first-child td{border-top:0;color:#a8927c;font-weight:700}
      td.w{color:#86efac;text-align:right} td.l{color:#fca5a5;text-align:right} td:nth-child(3){text-align:right}
      .row{display:flex;gap:6px} .row button{flex:1;padding:8px 4px;border:1px solid #5a4636;border-radius:10px;background:#33271f;color:#eadcc7;font-size:12px;cursor:pointer}
      i{font-style:normal}
    </style>
    <div class=panel>
      <div class=head><h3>🕷 Spindel 4 Robot</h3><span class=chip id=chip>${t("idle", "stil")}</span></div>
      <button class=main id=go>Start robot</button>
      <div class=sec><div class=t>${t("Game", "Spel")}</div>
        <label>${t("Computers", "Computers")} <select id=c><option value=1>1 computer</option><option value=2>2 computers</option><option value=3>3 computers</option><option value=rotate>${t("All (take turns)", "Allemaal (om de beurt)")}</option></select></label>
        <label>${t("Level", "Niveau")} <select id=l><option value=climb>${t("Climb (up after 3 wins)", "Klimmen (omhoog na 3 winst)")}</option><option value=Easy>${lvName("Easy")}</option><option value=Medium>${lvName("Medium")}</option><option value=Hard>${lvName("Hard")}</option><option value=Expert>Expert</option><option value=Impossible>${lvName("Impossible")}</option><option value=rotate>${t("All (take turns)", "Allemaal (om de beurt)")}</option></select></label>
      </div>
      <div class=sec><div class=t>${t("Thinking", "Denken")}</div>
        <label>${t("Think time", "Denktijd")} <select id=t><option value=0.5>0,5 s</option><option value=1>1 s</option><option value=1.5>${t("1.5 s", "1,5 s")}</option><option value=3>3 s</option><option value=5>5 s</option><option value=10>10 s</option><option value=30>30 s</option><option value=60>60 s</option></select></label>
        <label>${t("Min. moves ahead", "Min. zetten vooruit")} <select id=md><option value=0>${t("off", "uit")}</option><option value=8>8</option><option value=10>10</option><option value=12>12</option><option value=14>14</option><option value=15>15</option></select></label>
      </div>
      <div class=sec><div class=t>${t("Games", "Potjes")}</div>
        <label>${t("Games (0 = nonstop)", "Aantal (0 = nonstop)")} <input id=g type=number min=0 max=9999 inputmode=numeric></label>
        <label>${t("Online test: room code", "Online test: kamercode")} <input id=oc type=text autocomplete=off autocapitalize=characters placeholder="${t("empty", "leeg")}" style="width:7em;text-align:left"></label>
      </div>
      <button class=assistbtn id=as>🛟 ${t("Assist", "Hulp")}</button>
      <div class=assist id=asbox>
        <label class=chk><input type=checkbox id=aw><span class=sw></span><span><i class="ring win"></i>${t("Show where I can win right now", "Toon waar ik direct kan winnen")}</span></label>
        <label class=chk><input type=checkbox id=ab><span class=sw></span><span><i class="ring block"></i>${t("Show where I must block", "Toon waar ik moet blokkeren")}</span></label>
        <div class=note>${t("Only in games against the computer, when it's your turn and the robot is stopped.", "Alleen in potjes tegen de computer, als jij aan de beurt bent en de robot stilstaat.")}</div>
      </div>
      <div class=status id=st>${t("Ready.", "Klaar.")}</div>
      <div class=stats id=stats></div>
      <div class=row><button id=ex>${t("Export brain", "Geheugen opslaan")}</button><button id=im>${t("Import", "Laden")}</button><button id=rs>${t("Forget all", "Alles vergeten")}</button></div>
    </div>
    <button class=pill id=pill><span class=dot></span><span>Robot</span></button>`;
    const $ = (id) => sh.getElementById(id);
    ui = { pill: $("pill"), go: $("go"), status: $("st"), stats: $("stats"), panel: sh.querySelector(".panel") };
    $("c").value = settings.computers; $("l").value = settings.level; $("t").value = String(settings.think);
    $("c").onchange = (e) => { settings.computers = e.target.value; saveSettings(); };
    $("l").onchange = (e) => { settings.level = e.target.value; saveSettings(); };
    $("t").onchange = (e) => { settings.think = parseFloat(e.target.value); saveSettings(); };
    $("md").value = String(settings.minDepth || 0);
    $("md").onchange = (e) => { settings.minDepth = +e.target.value; saveSettings(); };
    $("oc").value = settings.onlineCode || "";
    $("oc").onchange = (e) => { settings.onlineCode = e.target.value.trim().toUpperCase(); e.target.value = settings.onlineCode; saveSettings(); };
    $("g").value = String(settings.games || 0);
    $("g").onchange = (e) => { settings.games = Math.max(0, parseInt(e.target.value, 10) || 0); e.target.value = String(settings.games); saveSettings(); renderStats(); };
    ui.pill.onclick = () => ui.panel.classList.toggle("open");
    const asBtn = $("as"), asBox = $("asbox");
    const asRefresh = () => asBtn.classList.toggle("on", !!(settings.assistWin || settings.assistBlock));
    asBtn.onclick = () => asBox.classList.toggle("open");
    $("aw").checked = !!settings.assistWin; $("ab").checked = !!settings.assistBlock; asRefresh();
    $("aw").onchange = (e) => { settings.assistWin = e.target.checked; saveSettings(); asRefresh(); };
    $("ab").onchange = (e) => { settings.assistBlock = e.target.checked; saveSettings(); asRefresh(); };
    ui.go.onclick = () => { running = !running; if (running) { gamesThisRun = 0; online.joined = false; online.done = false; } saveSettings(); log(running ? t("robot started", "robot gestart") : t("robot stopped", "robot gestopt")); renderStats(); };
    $("ex").onclick = () => {
      const blob = new Blob([JSON.stringify(brain)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spindel4-brain.json"; a.click();
    };
    $("im").onclick = () => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = async () => {
        try {
          const d = JSON.parse(await inp.files[0].text());
          // merge instead of replace, so what this device learned is kept
          let added = 0;
          updateBrain(() => {
            for (const [key, moves] of Object.entries(d.book || {})) {
              const e = brain.book[key] || (brain.book[key] = {});
              for (const [mv, r] of Object.entries(moves)) {
                const cur = e[mv] || (e[mv] = [0, 0, 0]);
                for (let k = 0; k < 3; k++) cur[k] += +r[k] || 0;
                added++;
              }
            }
            for (const [key, mv] of Object.entries(d.fixes || {})) if (!(key in brain.fixes)) brain.fixes[key] = mv;
            for (const [mode, st] of Object.entries(d.stats || {})) {
              const cur = brain.stats[mode] || (brain.stats[mode] = [0, 0, 0]);
              for (let k = 0; k < 3; k++) cur[k] += +st[k] || 0;
            }
            if (d.weights && !Object.keys(brain.weights).length) brain.weights = d.weights;
            brain.games += +d.games || 0;
          });
          renderStats();
          log(t(`memory loaded: ${added} moves added`, `geheugen geladen: ${added} zetten toegevoegd`));
        }
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

  // ===================================================================
  // 8. Assist: rings on the board for your own games against the computer
  // ===================================================================
  let overlay = null, assistBusy = false;
  function overlayEl() {
    if (overlay) return overlay;
    overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;pointer-events:none;z-index:2147483646;display:none";
    overlay.innerHTML = '<svg width="100%" height="100%" style="overflow:visible"></svg>' +
      '<div style="position:absolute;left:50%;bottom:-6px;transform:translate(-50%,100%);background:#2e7d4f;color:#fff;' +
      'font:600 13px/1 -apple-system,system-ui,sans-serif;padding:6px 10px;border-radius:12px;white-space:nowrap;box-shadow:0 2px 6px #0004"></div>';
    document.documentElement.appendChild(overlay);
    return overlay;
  }
  function clearAssist() { if (overlay) overlay.style.display = "none"; }
  // against the computer every other player is called "Computer 1/2/3"
  function onlyComputers(tx, np) {
    const comps = new Set(tx.map((x) => x.trim()).filter((x) => /^computer\s*\d$/i.test(x)));
    return comps.size >= np - 1;
  }
  let assistSig = "";
  async function assistStep() {
    if (!(settings.assistWin || settings.assistBlock) || running) { assistSig = ""; return clearAssist(); }
    const ns = nodes(), tx = texts(ns);
    const sig = tx.join("|") + (settings.assistWin ? "w" : "") + (settings.assistBlock ? "b" : "");
    if (sig === assistSig && overlay && overlay.style.display === "block") return;   // nothing changed
    if (!tx.some((x) => RX.yourMove.test(x))) return clearAssist();
    const box = boardBox(ns); if (!box) return clearAssist();
    const img = capture(), order = readOrder(ns, img);
    if (!order) return clearAssist();
    const np = order.length;
    if (!onlyComputers(tx, np)) { say(t("Assist only works against the computer.", "Hulp werkt alleen tegen de computer.")); return clearAssist(); }
    const cells = readBoard(box, img, order.map((o) => o.color));
    if (!cells) return;
    const me = whoAmI(order, cells);
    const b = Board.fromCells(cells, np, me);
    const marks = [];
    for (let s = 0; s < S; s++) {
      const r = b.h[s]; if (r >= R) continue;
      if (settings.assistWin && b.isWinMove(me, s)) { marks.push({ s, r, kind: "win" }); continue; }
      if (settings.assistBlock) for (let o = 0; o < np; o++) if (o !== me && b.isWinMove(o, s)) { marks.push({ s, r, kind: "block" }); break; }
    }
    const el = overlayEl();
    el.style.left = box.x + "px"; el.style.top = box.y + "px"; el.style.width = box.w + "px"; el.style.height = box.h + "px";
    const half = box.w / 2, svgEl = el.firstChild;
    svgEl.innerHTML = marks.map((m) => {
      const [x, y] = cellXY({ x: 0, y: 0, w: box.w, h: box.h }, m.s, m.r);
      const rad = Math.max(8, half * (m.r === 0 ? 0.045 : 0.06));
      const col = m.kind === "win" ? "#22c55e" : "#f97316";
      return `<circle cx="${x}" cy="${y}" r="${rad * 1.5}" fill="none" stroke="${col}55" stroke-width="2"><animate attributeName="r" values="${rad * 1.2};${rad * 1.8};${rad * 1.2}" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0.2;1" dur="1.4s" repeatCount="indefinite"/></circle>` +
        `<circle cx="${x}" cy="${y}" r="${rad}" fill="${col}38" stroke="${col}" stroke-width="${Math.max(3, rad * 0.3)}" style="filter:drop-shadow(0 0 5px ${col})"/>`;
    }).join("");
    // always show that assist is on, so it's clear it is working even without rings
    const wins = marks.filter((m) => m.kind === "win").length, blocks = marks.length - wins;
    el.lastChild.textContent = "🛟 " + (wins ? t(`Hulp: you can win (${wins})`, `Hulp: je kunt winnen (${wins})`)
      : blocks ? t(`Hulp: block! (${blocks})`, `Hulp: blokkeren! (${blocks})`)
      : t("Assist on - no win or danger right now", "Hulp aan - nu geen winkans of gevaar"));
    el.lastChild.style.background = wins ? "#2e7d4f" : blocks ? "#c2410c" : "#41332a";
    el.style.display = "block";
    assistSig = sig;
    if (marks.length) say(marks.some((m) => m.kind === "win")
      ? t("Green ring: you can win right there!", "Groene ring: daar kun je direct winnen!")
      : t("Orange ring: block there or you lose!", "Oranje ring: blokkeer daar, anders verlies je!"));
  }
  setInterval(async () => {
    if (assistBusy) return; assistBusy = true;
    try { await assistStep(); } catch (e) { clearAssist(); } finally { assistBusy = false; }
  }, 1000);

  const boot = () => {
    buildUI();
    if (auto.autostart) { running = true; gamesThisRun = 0; renderStats(); }
    log(running ? t("robot running", "robot speelt") : t("tap Start robot to begin", "tik op Start robot om te beginnen"));
    loop();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.S4R = { trace, brain, settings, Board, Engine, features, LINES, ParallelSearch, ENGINE_SRC, get adsBlocked() { return adsBlocked; } };
})();
