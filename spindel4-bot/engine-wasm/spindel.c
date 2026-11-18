// Spindel 4 engine for 2 players, compiled to WebAssembly.
// Same rules, evaluation and search as the JavaScript engine in
// spindel4-robot.user.js, but on bitboards:
//   one 128-bit number per player, slice s uses bits 8s..8s+6, bit 8s+7 is
//   always 0 (it stops lines from running into the next slice). 16 slices x
//   8 bits = 128, so going round the web is just a bit rotation.
// Build: see build.sh

typedef unsigned long long u64;
typedef int i32;
// 128-bit number as two 64-bit halves (WebAssembly has no 128-bit shifts)
typedef struct { u64 lo, hi; } u128;
static inline u128 U(u64 lo, u64 hi) { u128 x = { lo, hi }; return x; }
static inline u128 OR(u128 a, u128 b) { return U(a.lo | b.lo, a.hi | b.hi); }
static inline u128 AND(u128 a, u128 b) { return U(a.lo & b.lo, a.hi & b.hi); }
static inline u128 NOT(u128 a) { return U(~a.lo, ~a.hi); }
static inline u128 SHL(u128 a, int k) {
  if (k == 0) return a;
  if (k >= 64) return U(0, a.lo << (k - 64));
  return U(a.lo << k, (a.hi << k) | (a.lo >> (64 - k)));
}
static inline u128 SHR(u128 a, int k) {
  if (k == 0) return a;
  if (k >= 64) return U(a.hi >> (k - 64), 0);
  return U((a.lo >> k) | (a.hi << (64 - k)), a.hi >> k);
}
static inline int BIT(u128 a, int i) { return i < 64 ? (int)((a.lo >> i) & 1) : (int)((a.hi >> (i - 64)) & 1); }
static inline u128 ONE(int i) { return i < 64 ? U(1ULL << i, 0) : U(0, 1ULL << (i - 64)); }

#define S 16
#define R 7
#define N (S * R)
#define WIN 1000000
#define INF 2000000000
#define MAXPLY (N + 4)

extern double now_ms(void);   // imported from JavaScript (performance.now)

// ---------------------------------------------------------------- helpers
static inline u128 rotl(u128 x, int k) { k &= 127; return k ? OR(SHL(x, k), SHR(x, 128 - k)) : x; }
static inline u128 rotr(u128 x, int k) { k &= 127; return k ? OR(SHR(x, k), SHL(x, 128 - k)) : x; }
static inline int bitof(int s, int r) { return 8 * s + r; }


static u128 BOARD;   // all real cells (no sentinel bits)

// all empty-or-not cells that would complete four for a player with pieces P
static u128 winning_cells(u128 P) {
  u128 r = AND(AND(SHL(P, 1), SHL(P, 2)), SHL(P, 3));    // straight (up the slice)
  const int ds[3] = { 8, 9, 7 };                           // round, diagonal, other diagonal
  for (int k = 0; k < 3; k++) {
    int d = ds[k];
    u128 a = AND(rotl(P, d), rotl(P, 2 * d));
    r = OR(r, AND(a, rotl(P, 3 * d)));
    r = OR(r, AND(a, rotr(P, d)));
    u128 b = AND(rotr(P, d), rotr(P, 2 * d));
    r = OR(r, AND(b, rotr(P, 3 * d)));
    r = OR(r, AND(b, rotl(P, d)));
  }
  return AND(r, BOARD);
}

// ---------------------------------------------------------------- lines (same set as JS)
#define MAXLINES 400
static int NL;
static unsigned char LC[MAXLINES][4];        // the 4 cells (JS index s*7+r)
static short LAT[N][24]; static int NLAT[N];  // lines through each cell

static int jsidx(int s, int r) { return (((s % S) + S) % S) * R + r; }
static int seen_line(int a, int b, int c, int d) {
  int v[4] = { a, b, c, d };
  for (int i = 0; i < 4; i++) for (int j = i + 1; j < 4; j++) if (v[j] < v[i]) { int t = v[i]; v[i] = v[j]; v[j] = t; }
  for (int l = 0; l < NL; l++) {
    int w[4] = { LC[l][0], LC[l][1], LC[l][2], LC[l][3] };
    for (int i = 0; i < 4; i++) for (int j = i + 1; j < 4; j++) if (w[j] < w[i]) { int t = w[i]; w[i] = w[j]; w[j] = t; }
    if (w[0] == v[0] && w[1] == v[1] && w[2] == v[2] && w[3] == v[3]) return 1;
  }
  return 0;
}
static void add_line(int a, int b, int c, int d) {
  if (seen_line(a, b, c, d)) return;
  LC[NL][0] = a; LC[NL][1] = b; LC[NL][2] = c; LC[NL][3] = d; NL++;
}
static void build_lines(void) {
  NL = 0;
  for (int s = 0; s < S; s++) for (int r = 0; r < R; r++) {
    add_line(jsidx(s, r), jsidx(s + 1, r), jsidx(s + 2, r), jsidx(s + 3, r));
    if (r + 3 < R) {
      add_line(jsidx(s, r), jsidx(s, r + 1), jsidx(s, r + 2), jsidx(s, r + 3));
      add_line(jsidx(s, r), jsidx(s + 1, r + 1), jsidx(s + 2, r + 2), jsidx(s + 3, r + 3));
      add_line(jsidx(s, r), jsidx(s - 1, r + 1), jsidx(s - 2, r + 2), jsidx(s - 3, r + 3));
    }
  }
  for (int i = 0; i < N; i++) NLAT[i] = 0;
  for (int l = 0; l < NL; l++) for (int k = 0; k < 4; k++) { int c = LC[l][k]; LAT[c][NLAT[c]++] = l; }
}

// ---------------------------------------------------------------- position
static u128 P[2];
static signed char cells[N];
static int h[S];
static int turn, count;
static u64 zob[2][N], z;
static signed char lc[MAXLINES][2];          // pieces per player on each line

static u64 rng_state = 0x9E3779B97F4A7C15ULL;
static u64 rnd64(void) { u64 x = rng_state; x ^= x >> 12; x ^= x << 25; x ^= x >> 27; rng_state = x; return x * 0x2545F4914F6CDD1DULL; }

static inline void play(int s) {
  int r = h[s], i = s * R + r, p = turn;
  cells[i] = p; P[p] = OR(P[p], ONE(bitof(s, r))); h[s]++; count++; z ^= zob[p][i];
  for (int k = 0; k < NLAT[i]; k++) lc[LAT[i][k]][p]++;
  turn = p ^ 1;
}
static inline void undo(int s) {
  h[s]--; int r = h[s], i = s * R + r; turn ^= 1; int p = turn;
  cells[i] = -1; P[p] = AND(P[p], NOT(ONE(bitof(s, r)))); count--; z ^= zob[p][i];
  for (int k = 0; k < NLAT[i]; k++) lc[LAT[i][k]][p]--;
}

// ---------------------------------------------------------------- evaluation (identical to JS Engine.evaluate)
static double W[7];
static int me;
static unsigned char thr[N]; static short touched[N];

static i32 evaluate(void) {
  int f0 = 0, f1 = 0, f2 = 0, f3 = 0, f4 = 0, f5 = 0, f6 = 0, nt = 0;
  for (int l = 0; l < NL; l++) {
    int a0 = lc[l][0], a1 = lc[l][1], o, n;
    if (a0) { if (a1) continue; o = 0; n = a0; }
    else if (a1) { o = 1; n = a1; }
    else continue;
    int sg = o == me ? 1 : -1;
    if (n == 3) {
      f0 += sg;
      int e = cells[LC[l][0]] < 0 ? LC[l][0] : cells[LC[l][1]] < 0 ? LC[l][1] : cells[LC[l][2]] < 0 ? LC[l][2] : LC[l][3];
      if (!thr[e]) touched[nt++] = e;
      thr[e] |= 1 << o;
    } else if (n == 2) f1 += sg;
    else if (n == 1) f2 += sg;
  }
  for (int k = 0; k < nt; k++) {
    int i = touched[k], t = thr[i], r = i % R;
    for (int p = 0; p < 2; p++) if (t >> p & 1) {
      int sg = p == me ? 1 : -1;
      if ((r % 2) == (p == 0 ? 0 : 1)) f3 += sg; else f4 += sg;
      if (r + 1 < R && (thr[i + 1] >> p & 1)) f5 += sg;
    }
  }
  for (int k = 0; k < nt; k++) thr[touched[k]] = 0;
  for (int s = 0; s < S; s++) for (int r = 0; r < 3; r++) { int v = cells[s * R + r]; if (v >= 0) f6 += v == me ? 1 : -1; }
  double v = 0;
  v += W[0] * f0; v += W[1] * f1; v += W[2] * f2; v += W[3] * f3; v += W[4] * f4; v += W[5] * f5; v += W[6] * f6;
  double x = 1000.0 * v;
  // Math.round: round half up
  double fl = (double)(long long)x; if (fl > x) fl -= 1.0;   // floor
  return (i32)((x - fl) >= 0.5 ? fl + 1.0 : fl);
}

// ---------------------------------------------------------------- transposition table
#define TT_BITS 20
#define TT_SIZE (1 << TT_BITS)
static u64 ttK[TT_SIZE]; static i32 ttV[TT_SIZE]; static signed char ttD[TT_SIZE], ttF[TT_SIZE], ttM[TT_SIZE];
static i32 hist[2 * S];
static signed char killer[MAXPLY * 2];

static double deadline; static int stopflag; static double nodes;
static int OPT_EXT = 0;   // 1 = a forced move (only one sensible reply) doesn't use up depth

// ---------------------------------------------------------------- search (same as JS Engine.search, 2 players)
static i32 search(int depth, i32 alpha, i32 beta, int ply) {
  nodes += 1;
  if (((u64)nodes & 4095) == 0 && now_ms() > deadline) stopflag = 1;
  if (stopflag) return 0;
  int p = turn, mine = p == me, nx = p ^ 1, nxMine = nx == me;
  u128 occ = OR(P[0], P[1]);
  u128 wp = AND(winning_cells(P[p]), NOT(occ)), wn = AND(winning_cells(P[nx]), NOT(occ));
  int list[S], n = 0;
  for (int s = 0; s < S; s++) if (h[s] < R) {
    if (BIT(wp, bitof(s, h[s]))) return mine ? WIN - ply : -(WIN - ply);
    list[n++] = s;
  }
  if (!n) return 0;
  int nw = 0, nwMove = -1;
  for (int i = 0; i < n; i++) { int s = list[i]; if (BIT(wn, bitof(s, h[s]))) { nw++; nwMove = s; } }
  if (nw) {
    if (nw > 1) return nxMine ? WIN - ply - 1 : -(WIN - ply - 1);
    list[0] = nwMove; n = 1;
  } else {
    int m = 0;
    for (int i = 0; i < n; i++) { int s = list[i]; if (!(h[s] + 1 < R && BIT(wn, bitof(s, h[s] + 1)))) list[m++] = s; }
    if (m) n = m;
  }
  if (depth <= 0) return evaluate();
  // forced move: follow it without spending depth (threat sequences are seen much deeper)
  const int nd = (OPT_EXT && n == 1 && ply < MAXPLY - 8) ? depth : depth - 1;

  u64 key = z ^ (u64)(p + 1) * 0x9E3779B97F4A7C15ULL;
  int ti = (int)(key & (TT_SIZE - 1));
  int ttMove = -1;
  if (ttD[ti] >= 0 && ttK[ti] == key) {
    ttMove = ttM[ti];
    if (ttD[ti] >= depth) {
      int f = ttF[ti]; i32 v = ttV[ti];
      if (f == 0) return v;
      if (f == 1 && v >= beta) return v;
      if (f == 2 && v <= alpha) return v;
    }
  }
  int km1 = killer[ply * 2], km2 = killer[ply * 2 + 1];
  i32 ord[S];
  for (int i = 0; i < n; i++) { int s = list[i]; ord[i] = s == ttMove ? INF : s == km1 ? INF - 1 : s == km2 ? INF - 2 : hist[p * S + s]; }
  for (int i = 1; i < n; i++) {
    int sv = list[i]; i32 ov = ord[i]; int j = i - 1;
    while (j >= 0 && ord[j] < ov) { list[j + 1] = list[j]; ord[j + 1] = ord[j]; j--; }
    list[j + 1] = sv; ord[j + 1] = ov;
  }
  i32 a0 = alpha, b0 = beta, best = mine ? -INF : INF; int bestM = list[0];
  for (int i = 0; i < n; i++) {
    int s = list[i];
    play(s);
    i32 v;
    if (i == 0) v = search(nd, alpha, beta, ply + 1);
    else if (mine) {
      v = search(nd, alpha, alpha + 1, ply + 1);
      if (v > alpha && v < beta && !stopflag) v = search(nd, alpha, beta, ply + 1);
    } else {
      v = search(nd, beta - 1, beta, ply + 1);
      if (v < beta && v > alpha && !stopflag) v = search(nd, alpha, beta, ply + 1);
    }
    undo(s);
    if (stopflag) return 0;
    if (mine) { if (v > best) { best = v; bestM = s; } if (v > alpha) alpha = v; }
    else { if (v < best) { best = v; bestM = s; } if (v < beta) beta = v; }
    if (alpha >= beta) {
      hist[p * S + s] += depth * depth;
      if (killer[ply * 2] != s) { killer[ply * 2 + 1] = killer[ply * 2]; killer[ply * 2] = s; }
      break;
    }
  }
  int prev = ttD[ti];
  if (prev < 0 || prev <= depth || ttK[ti] != key) {
    ttK[ti] = key; ttV[ti] = best; ttD[ti] = depth;
    ttF[ti] = best <= a0 ? 2 : best >= b0 ? 1 : 0; ttM[ti] = bestM;
  }
  return best;
}

// ---------------------------------------------------------------- exports for JavaScript
__attribute__((export_name("setup"))) void setup(void) {
  BOARD = U(0, 0);
  for (int s = 0; s < S; s++) for (int r = 0; r < R; r++) BOARD = OR(BOARD, ONE(bitof(s, r)));
  build_lines();
  for (int p = 0; p < 2; p++) for (int i = 0; i < N; i++) zob[p][i] = rnd64();
}
// new position: cells come in one by one, then start()
__attribute__((export_name("clear"))) void clear(void) {
  P[0] = P[1] = U(0, 0); z = 0; count = 0; turn = 0;
  for (int i = 0; i < N; i++) cells[i] = -1;
  for (int s = 0; s < S; s++) h[s] = 0;
  for (int l = 0; l < NL; l++) lc[l][0] = lc[l][1] = 0;
  for (int i = 0; i < TT_SIZE; i++) ttD[i] = -1;
  for (int i = 0; i < 2 * S; i++) hist[i] = 0;
  for (int i = 0; i < MAXPLY * 2; i++) killer[i] = -1;
}
__attribute__((export_name("set_cell"))) void set_cell(int i, int p) {
  int s = i / R, r = i % R;
  cells[i] = p; P[p] = OR(P[p], ONE(bitof(s, r))); count++; z ^= zob[p][i];
  if (r + 1 > h[s]) h[s] = r + 1;
  for (int k = 0; k < NLAT[i]; k++) lc[LAT[i][k]][p]++;
}
__attribute__((export_name("set_turn"))) void set_turn(int t, int m) { turn = t; me = m; }
__attribute__((export_name("set_weight"))) void set_weight(int k, double v) { W[k] = v; }
// value of playing slice s at the root, searched depth-1 deeper (like the JS worker)
__attribute__((export_name("root_search"))) i32 root_search(int s, int depth, i32 alpha, double ms) {
  deadline = now_ms() + ms; stopflag = 0; nodes = 0;
  play(s);
  i32 v = search(depth - 1, alpha, INF, 1);
  undo(s);
  return v;
}
__attribute__((export_name("get_nodes"))) double get_nodes(void) { return nodes; }
__attribute__((export_name("get_stopped"))) int get_stopped(void) { return stopflag; }
__attribute__((export_name("set_option"))) void set_option(int k, int v) { if (k == 0) OPT_EXT = v; }
__attribute__((export_name("line_count"))) int line_count(void) { return NL; }
