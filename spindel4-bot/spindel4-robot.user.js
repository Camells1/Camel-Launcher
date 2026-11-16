// ==UserScript==
// @name         Spindel 4 Robot
// @namespace    spindel4-robot
// @version      2.0
// @description  Self-learning robot that plays Spindel 4 against the computer (1, 2 or 3 computers, every level). Hides ads.
// @match        https://play.spindel4.com/*
// @run-at       document-start
// @grant        none
// @downloadURL  https://raw.githubusercontent.com/Camells1/Camel-Launcher/claude/serene-cray-y4fb3b/spindel4-bot/spindel4-robot.user.js
// @updateURL    https://raw.githubusercontent.com/Camells1/Camel-Launcher/claude/serene-cray-y4fb3b/spindel4-bot/spindel4-robot.user.js
// ==/UserScript==

(function () {
  "use strict";
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
  //    16 slices around the hub, 7 rings each. A piece drops to the
  //    innermost free ring of a slice. Four in a row wins: straight
  //    (same slice), round (same ring) or diagonal.
  // ===================================================================
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
      this.turn = 0; this.count = 0; this.z1 = 0; this.z2 = 0;
    }
    static fromCells(cells, np, turn) {
      const b = new Board(np);
      for (let i = 0; i < N; i++) if (cells[i] >= 0) {
        b.cells[i] = cells[i]; b.count++;
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
      this.z1 ^= ZOB[p][i][0]; this.z2 ^= ZOB[p][i][1];
      this.turn = (p + 1) % this.np; return i;
    }
    undo(s) {
      this.h[s]--; const i = s * R + this.h[s];
      this.turn = (this.turn - 1 + this.np) % this.np; const p = this.turn;
      this.cells[i] = -1; this.count--;
      this.z1 ^= ZOB[p][i][0]; this.z2 ^= ZOB[p][i][1];
    }
    winsWith(p, i) { // would player p have four if he owned cell i?
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
    for (let li = 0; li < LINES.length; li++) {
      let o = -1, n = 0, empty = -1, dead = false;
      for (let k = 0; k < 4; k++) {
        const cell = k === 0 ? LA[li] : k === 1 ? LB[li] : k === 2 ? LC[li] : LD[li];
        const v = c[cell];
        if (v < 0) { empty = cell; continue; }
        if (o < 0) o = v; else if (v !== o) { dead = true; break; }
        n++;
      }
      if (dead || n === 0) continue;
      const sg = o === me ? 1 : -1;
      if (n === 3) { f[0] += sg; thr[empty] |= 1 << o; }
      else if (n === 2) f[1] += sg;
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

      const key = (b.z1 * 4 + p) + "," + b.z2;
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
    analyse(b, me, ms, margin = 60) {
      this.me = me; this.deadline = performance.now() + ms; this.stop = false; this.nodes = 0;
      if (this.tt.size > 1500000) this.tt.clear();
      const moves = b.legal(); let result = {}; let reached = 0;
      for (const s of moves) result[s] = 0;
      for (const s of moves) if (b.isWinMove(me, s)) { const r = {}; for (const t of moves) r[t] = t === s ? WIN : -WIN; return { scores: r, depth: 1 }; }
      for (let depth = 1; depth <= 40; depth++) {
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
        if (Math.max(...vals) >= WIN - 200 || vals.every((v) => v <= -WIN + 200)) break;
        if (b.count + depth >= N) break;
      }
      return { scores: result, depth: reached };
    }
  }

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
    if (best <= -WIN + 200) cands = Object.keys(scores).map(Number);
    let pick = cands[0], pv = -Infinity;
    for (const s of cands) {
      let adj = 0; const st = entry[toCanon(s, cz.k, cz.m)];
      if (st) { const n = st[0] + st[1] + st[2]; adj = 150 * ((st[0] + 0.5 * st[1]) / n - 0.5) * Math.min(n, 4) / 4; }
      const v = scores[s] + adj + Math.random();
      if (v > pv) { pv = v; pick = s; }
    }
    return { s: pick, why: cands.length > 1 && Object.keys(entry).length ? "memory" : "search", cz };
  }

  function learn(game, result) {
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
    saveBrain();
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
        brain.fixes[cz.key] = toCanon(bestS, cz.k, cz.m);
        found++;
        log(`review: slice ${pos.move} was a mistake, ${bestS} is better (depth ${depth})`);
      }
    }
    saveBrain();
    return found;
  }

  // ===================================================================
  // 5. Talking to the game (Flutter accessibility tree + screen pixels)
  // ===================================================================
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function nodes() {
    const ph = document.querySelector("flt-semantics-placeholder");
    if (ph) ph.click(); // turns on Flutter's accessibility tree
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
  const findBtn = (ns, ...labels) => ns.find((n) => n.role === "button" && labels.some((l) => n.label.toLowerCase() === l.toLowerCase() || n.label.toLowerCase().startsWith(l.toLowerCase())));
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
    const lab = ns.find((n) => /^order/i.test(n.label));
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

  function pointer(type, x, y, buttons) {
    const t = document.querySelector("flutter-view") || document.querySelector("flt-glass-pane") || document.body;
    t.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
      pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, buttons, view: window }));
  }
  async function tap(x, y) {
    lastAction = Date.now();
    pointer("pointermove", x, y, 0); await sleep(120);
    pointer("pointerdown", x, y, 1); await sleep(60);
    pointer("pointerup", x, y, 0); await sleep(60);
    pointer("pointermove", 2, innerHeight - 2, 0);
  }

  // ===================================================================
  // 6. The robot's main loop
  // ===================================================================
  const LEVELS = ["Easy", "Medium", "Hard", "Expert"];
  const auto = window.__S4R_CONFIG || {};
  const settings = Object.assign({ computers: "1", level: "climb", think: 1.5, running: false }, store.get(SET_KEY, {}), auto);
  let running = !!settings.running;
  let game = null, current = null, rotateIdx = store.get("S4R_rot", 0), climb = store.get("S4R_climb", {}), streak = {}, lastAction = Date.now();
  let gamesThisRun = 0;
  const saveSettings = () => store.set(SET_KEY, { computers: settings.computers, level: settings.level, think: settings.think, running });

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
    const btn = (...l) => findBtn(ns, ...l);
    let b;
    if ((b = btn("Continue anonymously")) || (b = btn("Got it"))) { clickNode(b); await sleep(1200); return; }
    if (tx.some((t) => /how to make a move/i.test(t))) { await tutorial(ns, tx); return; }

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
    if (tx.some((t) => /^your move/i.test(t))) { await myMove(ns); return; }
    // otherwise: waiting for the computer
  }

  function parseResult(tx) {
    for (const t of tx) {
      const low = t.toLowerCase();
      if (/\b(wins|won)\b/.test(low)) return low.includes("(you)") ? "win" : "loss";
      if (/\b(draw|tie)\b/.test(low)) return "draw";
    }
    return null;
  }

  function startGame(mode) {
    current = mode;
    game = { mode: modeKey(mode), modeObj: mode, positions: [], np: 0, done: false };
    log(`new game: ${game.mode}`);
    lastAction = Date.now();
  }

  async function finishGame(result) {
    game.done = true;
    lastAction = Date.now();
    learn(game, result);
    gamesThisRun++;
    const st = brain.stats[game.mode];
    log(`RESULT: ${result.toUpperCase()} (${game.mode}: ${st[0]} won, ${st[1]} draw, ${st[2]} lost)`);
    // climbing: 3 wins in a row moves up a level
    const c = game.modeObj.computers;
    streak[c] = result === "win" ? (streak[c] || 0) + 1 : 0;
    if (settings.level === "climb" && streak[c] >= 3) {
      const lv = climb[c] || 0;
      if (lv < LEVELS.length - 1) { climb[c] = lv + 1; store.set("S4R_climb", climb); log(`3 wins in a row: moving up to ${LEVELS[lv + 1]}`); }
      streak[c] = 0;
    }
    if (settings.computers === "rotate" || settings.level === "rotate") { rotateIdx++; store.set("S4R_rot", rotateIdx); }
    if (result === "loss") {
      log("lost - reviewing my moves to learn from mistakes...");
      const n = await review(game);
      log(`learned ${n} fix${n === 1 ? "" : "es"} from that loss`);
    }
    renderStats();
    if (auto.games && gamesThisRun >= auto.games) { running = false; log("DONE"); }
  }

  async function myMove(ns) {
    const box = boardBox(ns);
    if (!box) return;
    // two identical reads in a row = the board is not animating
    let cells = null, order = null, prev = null;
    for (let i = 0; i < 6; i++) {
      const img = capture();
      order = readOrder(ns, img);
      if (!order) { await sleep(300); continue; }
      const c = readBoard(box, img, order.map((o) => o.color));
      if (c && prev && c.join() === prev.join()) { cells = c; break; }
      prev = c; await sleep(250);
    }
    if (!cells) return;
    const np = order.length, me = order.findIndex((o) => o.current);
    if (me < 0) return;
    if (!game || game.done) startGame(current || nextMode());
    game.np = np;
    const b = Board.fromCells(cells, np, me);
    const eng = new Engine(weightsFor(np));
    await sleep(20);
    const { scores, depth } = eng.analyse(b, me, settings.think * 1000);
    if (!Object.keys(scores).length) return;
    const pick = choose(b, me, scores);
    const s = pick.s, r = b.h[s];
    log(`move ${b.count + 1}: slice ${s} (depth ${depth}, ${pick.why})`);
    if (auto.debug) {
      const rows = [];
      for (let r = R - 1; r >= 0; r--) { let row = ""; for (let q = 0; q < S; q++) { const v = cells[q * R + r]; row += v < 0 ? "." : "ABCD"[v]; } rows.push(row); }
      console.log("[S4R] board me=" + "ABCD"[me] + " colors=" + JSON.stringify(order.map((o) => o.color.map(Math.round))) + "\n" + rows.join("\n"));
    }
    const cz = pick.cz || canonical(b, me);
    const after = b.clone(); after.play(s);
    game.positions.push({ key: cz.key, cmove: toCanon(s, cz.k, cz.m), cells: Array.from(cells), np, me, move: s, f: features(after, me) });
    for (let attempt = 0; attempt < 3; attempt++) {
      const [x, y] = cellXY(box, s, r);
      await tap(x, y);
      for (let k = 0; k < 16; k++) {
        await sleep(250);
        const t2 = texts(nodes());
        if (!t2.some((t) => /^your move/i.test(t)) || parseResult(t2)) { lastAction = Date.now(); return; }
      }
    }
  }

  // first-time "how to make a move" tutorial
  async function tutorial(ns, tx) {
    const box = boardBox(ns);
    tr("tutorial box " + (box && [box.x, box.y, box.w, box.h].map(Math.round).join(",")));
    if (!box) { pointer("pointermove", innerWidth / 2, innerHeight * 0.55, 0); await sleep(300); return; }
    const your = tx.find((t) => /^your turn/i.test(t));
    if (!your) return; // still showing the example
    const at = (slice) => cellXY(box, slice, 0, 0.8);
    if (/marked spoke with/i.test(your) || /^your turn: (point|tap) at the marked/i.test(your)) {
      log("tutorial step 1");
      const [x, y] = at(13); await tap(x, y); await sleep(1500);
    } else {
      log("tutorial step 2");
      const [x0, y0] = at(12); pointer("pointermove", x0, y0, 0); await sleep(300);
      pointer("pointerdown", x0, y0, 1); await sleep(100);
      for (const s of [12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16]) { const [x, y] = at(s); pointer("pointermove", x, y, 1); await sleep(80); }
      const [x1, y1] = at(0); pointer("pointerup", x1, y1, 0); await sleep(200);
      await tap(x1, y1); await sleep(2000);
    }
  }

  async function loop() {
    while (true) {
      if (running) {
        try { await step(); } catch (e) { console.error("[S4R]", e); }
        // watchdog: nothing happened for 150 s -> reload the page and carry on
        if (Date.now() - lastAction > 150000) {
          log("stuck - reloading the page");
          saveSettings(); saveBrain();
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
      ? "<table>" + rows.map(([k, v]) => `<tr><td>${k}</td><td class=w>${v[0]}</td><td>${v[1]}</td><td class=l>${v[2]}</td></tr>`).join("") + "</table>"
      : "<i>No games yet</i>";
    ui.go.textContent = running ? "Stop robot" : "Start robot";
    ui.go.className = running ? "stop" : "";
    ui.pill.textContent = running ? "🕷 Robot ●" : "🕷 Robot";
  }
  function buildUI() {
    const host = document.createElement("div");
    host.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483647;";
    const sh = host.attachShadow({ mode: "open" });
    sh.innerHTML = `<style>
      :host{all:initial} *{box-sizing:border-box;font:13px/1.35 -apple-system,system-ui,Segoe UI,Roboto,sans-serif}
      .pill{background:#2b211b;color:#f1be3c;border:0;border-radius:18px;padding:8px 12px;font-weight:600;box-shadow:0 2px 8px #0005;cursor:pointer}
      .panel{display:none;width:min(300px,calc(100vw - 16px));background:#2b211bee;color:#f7ead6;border-radius:12px;padding:12px;margin-bottom:6px;box-shadow:0 4px 16px #0007}
      .panel.open{display:block} h3{margin:0 0 8px;font-size:15px;color:#f1be3c}
      label{display:flex;justify-content:space-between;align-items:center;margin:6px 0;gap:8px}
      select{background:#41332a;color:#f7ead6;border:1px solid #6b5643;border-radius:6px;padding:4px;font-size:14px}
      button.main{width:100%;margin:8px 0 6px;padding:10px;border:0;border-radius:8px;background:#e9443f;color:#fff;font-weight:700;font-size:15px}
      button.main.stop{background:#6b5643}
      .row{display:flex;gap:6px} .row button{flex:1;padding:6px;border:1px solid #6b5643;border-radius:6px;background:#41332a;color:#f7ead6;font-size:12px}
      .status{min-height:2.6em;color:#e8d9bf;font-size:12px;margin:4px 0;word-break:break-word}
      table{width:100%;border-collapse:collapse;font-size:12px} td{padding:2px 4px;border-top:1px solid #4a3a2f} td.w{color:#7ddc7d} td.l{color:#ff8a80}
      .stats{max-height:150px;overflow:auto;margin:6px 0}
    </style>
    <div class=panel>
      <h3>Spindel 4 Robot</h3>
      <label>Computers <select id=c><option value=1>1 computer</option><option value=2>2 computers</option><option value=3>3 computers</option><option value=rotate>All (take turns)</option></select></label>
      <label>Level <select id=l><option value=climb>Climb (up after 3 wins)</option><option>Easy</option><option>Medium</option><option>Hard</option><option>Expert</option><option value=rotate>All (take turns)</option></select></label>
      <label>Think time <select id=t><option value=0.5>0.5 s</option><option value=1>1 s</option><option value=1.5>1.5 s</option><option value=3>3 s</option><option value=5>5 s</option></select></label>
      <button class=main id=go>Start robot</button>
      <div class=status id=st>Ready.</div>
      <div class=stats id=stats></div>
      <div class=row><button id=ex>Export brain</button><button id=im>Import</button><button id=rs>Forget all</button></div>
    </div>
    <button class=pill id=pill>🕷 Robot</button>`;
    const $ = (id) => sh.getElementById(id);
    ui = { pill: $("pill"), go: $("go"), status: $("st"), stats: $("stats"), panel: sh.querySelector(".panel") };
    $("c").value = settings.computers; $("l").value = settings.level; $("t").value = String(settings.think);
    $("c").onchange = (e) => { settings.computers = e.target.value; saveSettings(); };
    $("l").onchange = (e) => { settings.level = e.target.value; saveSettings(); };
    $("t").onchange = (e) => { settings.think = parseFloat(e.target.value); saveSettings(); };
    ui.pill.onclick = () => ui.panel.classList.toggle("open");
    ui.go.onclick = () => { running = !running; saveSettings(); log(running ? "robot started" : "robot stopped"); renderStats(); };
    $("ex").onclick = () => {
      const blob = new Blob([JSON.stringify(brain)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "spindel4-brain.json"; a.click();
    };
    $("im").onclick = () => {
      const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json,application/json";
      inp.onchange = async () => {
        try { const d = JSON.parse(await inp.files[0].text()); Object.assign(brain, d); saveBrain(); renderStats(); log("brain imported"); }
        catch (e) { log("could not read that file"); }
      };
      inp.click();
    };
    $("rs").onclick = () => {
      if (!confirm("Make the robot forget everything it learned?")) return;
      Object.assign(brain, { games: 0, weights: {}, book: {}, fixes: {}, stats: {} }); saveBrain(); renderStats(); log("memory cleared");
    };
    const st = document.createElement("style"); st.textContent = adCss;
    (document.head || document.documentElement).appendChild(st);
    document.documentElement.appendChild(host);
    renderStats();
  }

  const boot = () => {
    buildUI();
    if (auto.autostart) { running = true; renderStats(); }
    log(running ? "robot running" : "tap Start robot to begin");
    loop();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  window.S4R = { trace, brain, settings, Board, Engine, features, LINES, get adsBlocked() { return adsBlocked; } };
})();
