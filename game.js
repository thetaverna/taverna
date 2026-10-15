'use strict';
/* ETAPA 1 — Cenário jogável da taverna (vista de cima, 2D). Canvas puro, sem frameworks.
   Toda a arte é desenhada em código (pixel art), então não depende de arquivos extras. */
const Game = (() => {
  const T = 16, W = 28, H = 18, VW = 20, VH = 13, Z = 2;            // tile, mapa, janela de visão (em tiles) e zoom
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = c; };
  rect(0, 0, W, 2, '#'); rect(0, H - 1, W, 1, '#'); rect(0, 0, 1, H, '#'); rect(W - 1, 0, 1, H, '#');
  rect(3, 1, 4, 2, 'F'); rect(10, 1, 2, 1, 'N'); rect(15, 1, 11, 1, 'S'); rect(15, 3, 11, 1, 'B'); rect(13, H - 1, 2, 1, 'D'); rect(W - 1, 8, 1, 2, 'd'); rect(8, 8, 12, 5, 'R');
  const TABLES = [[5, 6], [5, 12], [10, 10], [16, 7], [16, 13], [21, 10]];
  TABLES.forEach(([x, y]) => { g[y][x] = 'T'; [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { if (g[y + b][x + a] === '.' || g[y + b][x + a] === 'R') g[y + b][x + a] = 'c'; }); });
  rect(1, 15, 2, 2, 'b'); g[14][1] = 'b'; rect(25, 15, 2, 1, 'K'); g[14][26] = 'K';
  const SOLID = new Set('#FNSBTbKDd'.split(''));
  const LIGHTS = [[5 * T, 3 * T, 96, 'f'], [20 * T, 2.4 * T, 60, 'w'], [13.5 * T, 17 * T, 46, 'm'], [27.4 * T, 9 * T, 46, 'm']].concat(TABLES.map(([x, y]) => [x * T + 8, y * T + 5, 34, 'c']));
  const LOOK = {
    Guerreiro: { skin: '#e0b48a', hair: '#4a3020', top: '#6e7488', pants: '#3a3d4a', boots: '#2b2b33', cape: '#7a1f2a', helm: '#9aa0b5', weapon: '#cfd6e6' },
    Mago: { skin: '#e0b48a', hair: '#d8d8e0', top: '#4b3a8c', pants: '#2c2350', boots: '#1d1633', cape: '#6a3ec2', hood: '#3a2a78', weapon: '#b78cff' },
    Ladino: { skin: '#d9a77c', hair: '#1c1824', top: '#2a2636', pants: '#1f1c2a', boots: '#15131c', cape: '#1a1722', hood: '#1f1b2b', weapon: '#9aa0b5' },
    Arqueiro: { skin: '#e0b48a', hair: '#5a3a1e', top: '#2d5a3a', pants: '#4a3a24', boots: '#2b1d10', cape: '#1f6b43', hood: '#24503a', weapon: '#8a5a32' },
    Clérigo: { skin: '#f0c8a0', hair: '#6a4a2a', top: '#e8e0d0', pants: '#8a7a5a', boots: '#4a3a24', cape: '#c89b3c', hood: '#d8d0c0', weapon: '#f3d178' }
  };
  const NPCS = [
    { n: 'Mercador Elric', x: 18.5 * T, y: 2.95 * T, d: 'down', look: { skin: '#d9a77c', hair: '#8a8a94', top: '#7a4a1e', pants: '#3a2a1a', boots: '#2b1d10' } },
    { n: 'Taverneira Brunhilda', x: 23.5 * T, y: 2.95 * T, d: 'down', look: { skin: '#f0c8a0', hair: '#a8421e', top: '#8b1e2a', pants: '#3a2a1a', boots: '#2b1d10' } },
    { n: 'Bardo Lucan', x: 8.5 * T, y: 8.7 * T, d: 'down', look: { skin: '#e0b48a', hair: '#2a1a10', top: '#235284', pants: '#3a2a1a', boots: '#2b1d10', hood: '#6a1e8c' } }
  ];
  const up = o => ({ skin: o.skin, hair: { s: 1, c: o.hair }, body: { t: o.bt || 'tunic', c1: o.top, c2: o.t2 || 'rgba(0,0,0,.25)' }, legs: { c1: o.pants }, feet: { c1: o.boots }, cape: o.cape ? { c1: o.cape } : null, head: o.hood ? { t: 'hood', c1: o.hood } : o.helm ? { t: 'helm', c1: o.helm, c2: '#c89b3c' } : null, weapon: o.weapon ? { t: o.wt || 'sword', c1: o.weapon, c2: '#c89b3c' } : null });
  Object.assign(LOOK.Guerreiro, { bt: 'plate', t2: '#9aa0b5' }); Object.assign(LOOK.Mago, { bt: 'robe', t2: '#c89b3c', wt: 'staff', weapon: '#8a5a32' }); Object.assign(LOOK.Ladino, { bt: 'leather', t2: '#8b1e2a' }); Object.assign(LOOK.Arqueiro, { bt: 'leather', t2: '#3b2416' }); Object.assign(LOOK['Clérigo'], { bt: 'robe', t2: '#c89b3c', wt: 'staff' });
  Object.keys(LOOK).forEach(k => LOOK[k] = up(LOOK[k])); NPCS.forEach(n => n.look = up(n.look));
  const RUMORS = ['Dizem que a cripta sob a catedral voltou a sussurrar...', 'Vi um corvo de olhos brancos pousar no sino. Mau presságio.', 'O Conde Vael paga bem por relíquias antigas, mas pergunte onde ele as guarda.', 'Esta noite a lua está vermelha. Cuidado nas estradas.'];
  const ZONES = [
    { x: 16, y: 3, w: 3, h: 2, label: '💬 Falar com o Mercador Elric', id: 'merchant' }, { x: 21, y: 3, w: 3, h: 2, label: '💬 Falar com a Taverneira', id: 'inn' },
    { x: 6, y: 7, w: 5, h: 4, label: '🎵 Ouvir o Bardo Lucan', id: 'bard' }, { x: 9, y: 2, w: 4, h: 2, label: '📜 Ler o quadro de avisos', id: 'board' },
    { x: 2, y: 3, w: 6, h: 2, label: '🔥 Aquecer-se na lareira', id: 'fire' }, { x: 12, y: 16, w: 4, h: 1, label: '🚪 Sair para a Praça', id: 'south' }, { x: 26, y: 7, w: 1, h: 4, label: '🚪 Subir aos Quartos', id: 'east' }
  ];
  let cv, ctx, bg, lc, lctx, raf = 0, last = 0, t = 0, vis = false, ready = false, dlgOpen = false, nearId = '';
  const R = {};
  const P = { x: 13.8 * T, y: 15.2 * T, d: 'up', f: 0, mv: false }, cam = { x: 0, y: 0 }, keys = new Set(), pad = new Set(); let target = null;
  /* ---- arte (desenhada em código) ---- */
  const solid = (i, j) => i < 0 || j < 0 || i >= W || j >= H || SOLID.has(g[j][i]);
  function tile(c, ch, i, j) {
    const x = i * T, y = j * T, r = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(x + a, y + b, w, h); };
    const floor = () => { r(0, 0, T, T, ['#4a3426', '#4f382a', '#45301f'][(i * 7 + j * 13) % 3]); r(0, 5, T, 1, 'rgba(0,0,0,.22)'); r(0, 11, T, 1, 'rgba(0,0,0,.22)'); r((i + j) % 2 ? 3 : 9, 0, 1, T, 'rgba(255,220,160,.06)'); };
    const wall = () => { r(0, 0, T, T, '#2a2438'); r(0, 7, T, 1, '#1b1626'); r(0, 15, T, 1, '#1b1626'); const o = (j % 2) * 8; r((o + 4) % T, 0, 1, 7, '#1b1626'); r((o + 12) % T, 8, 1, 7, '#1b1626'); r(0, 0, T, 1, '#3a3350'); };
    if (ch === '#') return wall();
    if (ch === 'F' || ch === 'N' || ch === 'S') wall(); else floor();
    if (ch === 'R') { r(0, 0, T, T, '#5a1522'); r(3, 3, 10, 10, '#6e1a2b'); r(7, 7, 2, 2, '#c89b3c'); [[-1, 0, 0, 0, 1, T], [1, 0, 15, 0, 1, T], [0, -1, 0, 0, T, 1], [0, 1, 0, 15, T, 1]].forEach(([a, b, x1, y1, w, h]) => { const n = g[j + b] && g[j + b][i + a]; if (n !== 'R') r(x1, y1, w, h, '#c89b3c'); }); }
    if (ch === 'c') { r(3, 4, 10, 9, '#5b3a1e'); r(3, 4, 10, 2, '#7a5233'); r(4, 7, 8, 5, '#6b4426'); }
    if (ch === 'T') { r(1, 1, 14, 14, '#2b1b0e'); r(2, 2, 12, 12, '#6b4426'); r(4, 4, 8, 8, '#8a5a32'); r(7, 7, 2, 2, '#e8e0d0'); }
    if (ch === 'B') { r(0, 0, T, 11, '#7a5233'); r(0, 0, T, 2, '#c89b3c'); r(0, 11, T, 5, '#3b2416'); r(2, 13, 4, 1, '#c89b3c'); r(10, 13, 4, 1, '#c89b3c'); if (i % 3 === 0) { r(5, 4, 3, 5, '#cfe8ff'); r(6, 3, 1, 1, '#cfe8ff'); } }
    if (ch === 'S') { r(0, 9, T, 2, '#6b4426'); r(0, 4, T, 2, '#6b4426'); [3, 7, 11].forEach((a, k) => { r(a, 1, 2, 3, ['#8b1e2a', '#235284', '#1f6b43'][(i + k) % 3]); r(a, 6, 2, 3, ['#c89b3c', '#6a3ec2', '#8b1e2a'][(i + k) % 3]); }); }
    if (ch === 'N') { r(0, 2, T, 12, '#6b4426'); r(1, 3, 14, 10, '#8a6a42'); r(2, 4, 5, 6, '#e8dcc0'); r(9, 5, 5, 5, '#d8c8a0'); r(4, 11, 3, 1, '#8b1e2a'); }
    if (ch === 'F') { /* a lareira é desenhada inteira abaixo */ }
    if (ch === 'b') { r(2, 1, 12, 14, '#5b3a1e'); r(2, 4, 12, 2, '#2b1b0e'); r(2, 10, 12, 2, '#2b1b0e'); r(4, 1, 2, 14, 'rgba(255,220,160,.12)'); r(2, 7, 12, 1, '#c89b3c'); }
    if (ch === 'K') { r(1, 1, 14, 14, '#6b4426'); r(1, 1, 14, 2, '#8a5a32'); r(2, 2, 1, 12, '#3b2416'); r(13, 2, 1, 12, '#3b2416'); r(3, 3, 10, 10, '#5b3a1e'); r(3, 3, 10, 1, '#3b2416'); }
    if (ch === 'D' || ch === 'd') { r(0, 0, T, T, '#1b1626'); r(1, 0, 14, 16, '#3b2416'); r(2, 1, 12, 15, '#4a2f1c'); r(7, 1, 2, 15, '#2b1b0e'); r(10, 8, 2, 2, '#c89b3c'); r(0, 0, T, 1, '#c89b3c'); }
  }
  function buildBG() {
    bg = document.createElement('canvas'); bg.width = W * T; bg.height = H * T; const c = bg.getContext('2d');
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) tile(c, g[j][i], i, j);
    const fx = 3 * T, fy = 1 * T; c.fillStyle = '#3a3345'; c.fillRect(fx, fy, 4 * T, 2 * T); c.fillStyle = '#4a4258'; c.fillRect(fx, fy, 4 * T, 3); c.fillStyle = '#c89b3c'; c.fillRect(fx, fy + 3, 4 * T, 1); c.fillStyle = '#120807'; c.fillRect(fx + 8, fy + 10, 4 * T - 16, 2 * T - 12);
    c.fillStyle = '#4a2f1c'; c.fillRect(fx + 14, fy + 26, 36, 4); c.fillStyle = '#6b4426'; c.fillRect(fx + 16, fy + 24, 32, 3);
  }
  /* ---- personagem em camadas (corpo, pernas, botas, roupa, capa, cabelo, capuz/capacete, arma) ---- */
  function drawChar(c, x, y, d, f, L) {
    const px = (a, b, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x + a), Math.round(y + b), w, h); };
    const s = f % 2, side = d === 'left' || d === 'right', dir = d === 'left' ? -1 : 1, up = d === 'up';
    const B = L.body || { t: 'cloth', c1: '#7a6a58', c2: '#5a4a3a' }, G = L.legs || { c1: '#4a3a2a' }, F = L.feet || { c1: '#2b1d10' }, Hd = L.head, W = L.weapon, O = L.offhand, K = L.cape, hr = L.hair || { s: 0, c: '#4a3020' };
    px(-5, -2, 10, 3, 'rgba(0,0,0,.35)');
    if (K && !up) px(-4 + (d === 'left' ? 2 : d === 'right' ? -2 : 0), -12, 8, 11, K.c1);
    px(-3, -5, 2, 5 - (s ? 1 : 0), G.c1); px(1, -5, 2, 5 - (s ? 0 : 1), G.c1);
    px(-3, -1 - (s ? 1 : 0), 2, 1 + (s ? 1 : 0), F.c1); px(1, -1 - (s ? 0 : 1), 2, 1 + (s ? 0 : 1), F.c1); if (F.c2) { px(-3, -3, 2, 1, F.c2); px(1, -3, 2, 1, F.c2); }
    px(-4, -11, 8, 7, B.c1); px(-4, -6, 8, 1, 'rgba(0,0,0,.25)');
    if (B.t === 'robe') { px(-4, -5, 8, 5, B.c1); px(-1, -11, 2, 11, B.c2 || B.c1); }
    if (B.t === 'plate') { px(-5, -12, 3, 3, B.c2); px(2, -12, 3, 3, B.c2); px(-1, -10, 2, 4, B.c2); px(-4, -7, 8, 1, B.c2); }
    if (B.t === 'leather') { px(-4, -11, 8, 1, B.c2); px(-4, -7, 8, 1, B.c2); px(-1, -10, 2, 3, B.c2); }
    if (B.t === 'tunic') px(-4, -7, 8, 1, B.c2 || 'rgba(0,0,0,.2)');
    const arm = B.t === 'plate' ? B.c2 : B.c1;
    if (side) px(-1 * dir - 1, -10, 2, 5, 'rgba(255,255,255,.12)'); else { px(-6, -10, 2, 5, arm); px(4, -10, 2, 5, arm); px(-6, -5, 2, 1, L.skin); px(4, -5, 2, 1, L.skin); }
    if (L.neck && !up) px(-1, -11, 2, 2, L.neck.c1);
    if (L.ring && !side && !up) px(4, -5, 2, 1, L.ring.c1); else if (L.ring && side) px(-1 * dir * 2, -6, 1, 1, L.ring.c1);
    px(-3, -18, 6, 6, L.skin);
    if (d === 'down') { px(-2, -15, 1, 1, '#1b1626'); px(1, -15, 1, 1, '#1b1626'); } else if (!up) px(d === 'left' ? -2 : 1, -15, 1, 1, '#1b1626');
    if (!Hd || Hd.t === 'crown' || Hd.t === 'hat') {
      if (hr.s !== 3) { px(-3, -19, 6, up ? 7 : 2, hr.c); if (hr.s === 1) { px(-4, -19, 1, 5, hr.c); px(3, -19, 1, 5, hr.c); } if (hr.s === 2) { px(-4, -19, 1, 8, hr.c); px(3, -19, 1, 8, hr.c); if (up) px(-4, -12, 8, 3, hr.c); } if (hr.s === 4) { px(-3, -21, 1, 2, hr.c); px(-1, -22, 1, 3, hr.c); px(1, -21, 1, 2, hr.c); } if (hr.s === 5) px(side ? 2 * -dir : 3, -17, 1, 6, hr.c); }
    }
    if (Hd) {
      if (Hd.t === 'hood') { px(-4, -19, 8, 3, Hd.c1); px(-4, -19, 1, 8, Hd.c1); px(3, -19, 1, 8, Hd.c1); if (up) px(-4, -19, 8, 8, Hd.c1); }
      if (Hd.t === 'helm') { px(-4, -20, 8, 4, Hd.c1); px(-4, -17, 1, 5, Hd.c1); px(3, -17, 1, 5, Hd.c1); px(-1, -21, 2, 2, Hd.c2 || Hd.c1); if (d === 'down') px(-2, -16, 4, 1, 'rgba(0,0,0,.45)'); if (up) px(-4, -20, 8, 8, Hd.c1); }
      if (Hd.t === 'hat') { px(-5, -20, 10, 1, Hd.c1); px(-3, -23, 6, 3, Hd.c1); px(-1, -26, 2, 3, Hd.c1); px(-3, -21, 6, 1, Hd.c2 || '#c89b3c'); }
      if (Hd.t === 'crown') { px(-3, -20, 6, 2, Hd.c1); px(-3, -22, 1, 2, Hd.c1); px(-1, -23, 2, 3, Hd.c1); px(2, -22, 1, 2, Hd.c1); px(-1, -21, 2, 1, Hd.c2 || '#c89b3c'); }
    }
    if (K && up) px(-4, -12, 8, 11, K.c1);
    if (O && !up) { const ox = d === 'left' ? 4 : d === 'right' ? -7 : -8; px(ox, -11, 4, 7, O.c1); px(ox + 1, -10, 2, 5, O.c2 || O.c1); px(ox + 1, -8, 2, 1, O.c1); }
    if (W && !up) {
      const wx = d === 'left' ? -7 : 5, bx = d === 'left' ? -8 : 4;
      if (W.t === 'sword') { px(wx, -15, 1, 9, W.c1); px(bx, -9, 3, 1, W.c2 || '#c89b3c'); px(wx, -8, 1, 2, '#3b2416'); }
      else if (W.t === 'axe') { px(wx, -15, 1, 12, W.c2 || '#6b4426'); px(wx - (d === 'left' ? 2 : 0), -15, 3, 4, W.c1); }
      else if (W.t === 'spear') { px(wx, -22, 1, 19, W.c2 || '#8a5a32'); px(wx - 1, -25, 3, 4, W.c1); }
      else if (W.t === 'bow') { const ex = d === 'left' ? -1 : 1; px(wx, -19, 1, 13, W.c2 || '#6b4426'); px(wx + ex, -20, 1, 2, W.c1); px(wx + ex, -7, 1, 2, W.c1); px(wx - ex, -18, 1, 11, 'rgba(255,255,255,.55)'); }
      else if (W.t === 'staff') { px(wx, -20, 1, 17, W.c1); px(wx - 1, -22, 3, 3, W.c2 || '#9fe0ff'); }
    }
  }

  /* ---- laço do jogo ---- */
  const dirOf = () => { let dx = 0, dy = 0; if (keys.has('ArrowLeft') || keys.has('a') || pad.has('left')) dx--; if (keys.has('ArrowRight') || keys.has('d') || pad.has('right')) dx++; if (keys.has('ArrowUp') || keys.has('w') || pad.has('up')) dy--; if (keys.has('ArrowDown') || keys.has('s') || pad.has('down')) dy++; return [dx, dy]; };
  const blocked = (x, y) => { for (const [a, b] of [[-4, -5], [3, -5], [-4, -1], [3, -1]]) if (solid(Math.floor((x + a) / T), Math.floor((y + b) / T))) return true; return false; };
  function update(dt) {
    let [dx, dy] = dirOf(); if (dlgOpen) { dx = dy = 0; target = null; }
    if (!dx && !dy && target) { const ax = target.x - P.x, ay = target.y - P.y, l = Math.hypot(ax, ay); if (l < 2) target = null; else { dx = ax / l; dy = ay / l; } } else if (dx || dy) target = null;
    P.mv = !!(dx || dy);
    if (P.mv) {
      const l = Math.hypot(dx, dy) || 1, sp = 62 * dt; dx = dx / l * sp; dy = dy / l * sp;
      if (Math.abs(dx) > Math.abs(dy)) P.d = dx < 0 ? 'left' : 'right'; else P.d = dy < 0 ? 'up' : 'down';
      let moved = false; if (!blocked(P.x + dx, P.y)) { P.x += dx; moved = true; } if (!blocked(P.x, P.y + dy)) { P.y += dy; moved = true; } if (!moved) target = null;
      P.f += dt * 7;
    }
    const nowT = performance.now();
    for (const u in R) { const r = R[u]; if (nowT - r.seen > 9000) { delete R[u]; continue; } const ax = r.tx - r.x, ay = r.ty - r.y, ds = Math.hypot(ax, ay); if (ds > 48) { r.x = r.tx; r.y = r.ty; } else if (ds > 0.4) { const k = Math.min(1, dt * 10); r.x += ax * k; r.y += ay * k; r.f += dt * 7; } }
    cam.x = Math.max(0, Math.min(W * T - VW * T, P.x - VW * T / 2)); cam.y = Math.max(0, Math.min(H * T - VH * T, P.y - VH * T / 2 - 6));
    const px = P.x / T, py = (P.y - 4) / T; let best = null, bd = 1e9;
    ZONES.forEach(z => { const cx = Math.max(z.x, Math.min(px, z.x + z.w)), cy = Math.max(z.y, Math.min(py, z.y + z.h)), d = Math.hypot(px - cx, py - cy); if (d < 0.9 && d < bd) { bd = d; best = z; } });
    const id = best ? best.id : ''; if (id !== nearId) { nearId = id; const el = document.getElementById('gprompt'); if (el) { el.hidden = !best || dlgOpen; el.textContent = best ? best.label + '  (E)' : ''; } }
  }
  function label(c, txt, x, y, col) { c.font = '16px VT323, monospace'; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#0d0b11'; c.strokeText(txt, x, y); c.fillStyle = col || '#f3d178'; c.fillText(txt, x, y); }
  function render() {
    const c = ctx; c.setTransform(Z, 0, 0, Z, 0, 0); c.imageSmoothingEnabled = false; c.clearRect(0, 0, VW * T, VH * T);
    c.drawImage(bg, cam.x, cam.y, VW * T, VH * T, 0, 0, VW * T, VH * T);
    const ox = -cam.x, oy = -cam.y, fl = (k) => Math.sin(t * 9 + k) * 2;
    for (let k = 0; k < 8; k++) { const h = 7 + fl(k) + (k % 3), fx = 3 * T + 12 + k * 5; c.fillStyle = k % 2 ? '#ffb02e' : '#ff6a1a'; c.fillRect(fx + ox, 1 * T + 29 - h + oy, 4, h); c.fillStyle = '#ffe27a'; c.fillRect(fx + 1 + ox, 1 * T + 29 - h / 2 + oy, 2, h / 2); }
    TABLES.forEach(([x, y], k) => { c.fillStyle = '#ffd36a'; c.fillRect(x * T + 7 + ox, y * T + 3 + oy + (Math.sin(t * 7 + k) > .5 ? 0 : 1), 2, 3); });
    const act = NPCS.map(n => ({ y: n.y, f: () => drawChar(c, n.x + ox, n.y + oy + (Math.sin(t * 2 + n.x) > .9 ? -1 : 0), n.d, 0, n.look), n })).concat(Object.values(R).map(r => ({ y: r.y, f: () => drawChar(c, r.x + ox, r.y + oy, r.d, r.mv ? Math.floor(r.f) : 0, r.look || LOOK[r.c] || LOOK.Mago) }))).concat([{ y: P.y, f: () => drawChar(c, P.x + ox, P.y + oy, P.d, P.mv ? Math.floor(P.f) : 0, lookOf()) }]).sort((a, b) => a.y - b.y); act.forEach(a => a.f());
    lctx.setTransform(1, 0, 0, 1, 0, 0); lctx.globalCompositeOperation = 'source-over'; lctx.fillStyle = 'rgba(8,5,20,.62)'; lctx.fillRect(0, 0, VW * T, VH * T); lctx.globalCompositeOperation = 'destination-out';
    LIGHTS.forEach(([lx, ly, r, k], n) => { const rr = r * (1 + Math.sin(t * 6 + n) * (k === 'f' || k === 'c' ? 0.05 : 0)), gr = lctx.createRadialGradient(lx + ox, ly + oy, 2, lx + ox, ly + oy, rr); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); lctx.fillStyle = gr; lctx.fillRect(0, 0, VW * T, VH * T); });
    c.drawImage(lc, 0, 0);
    c.globalCompositeOperation = 'lighter'; LIGHTS.forEach(([lx, ly, r, k]) => { const col = k === 'm' ? '60,90,180' : '255,140,40', gr = c.createRadialGradient(lx + ox, ly + oy, 1, lx + ox, ly + oy, r); gr.addColorStop(0, 'rgba(' + col + ',' + (k === 'm' ? .1 : .16) + ')'); gr.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = gr; c.fillRect(lx + ox - r, ly + oy - r, r * 2, r * 2); }); c.globalCompositeOperation = 'source-over';
    c.setTransform(1, 0, 0, 1, 0, 0);
    NPCS.forEach(n => label(c, n.n, (n.x + ox) * Z, (n.y + oy - 24) * Z, '#c9b8ff'));
    Object.values(R).forEach(r => label(c, (r.n || 'Viajante') + ' · Nv. ' + (r.lv || 1), (r.x + ox) * Z, (r.y + oy - 24) * Z, '#e8e0d0'));
    label(c, (S.me.n || 'Viajante') + ' · Nv. ' + S.me.lv, (P.x + ox) * Z, (P.y + oy - 24) * Z, '#f3d178');
  }
  const upsertRemote = (u, o) => { let r = R[u]; if (!r) { if (Object.keys(R).length >= 60) return; r = R[u] = { x: o.x, y: o.y, tx: o.x, ty: o.y, f: 0 }; } Object.assign(r, { tx: o.x, ty: o.y, d: o.d, mv: o.m, n: o.n, c: o.c, lv: o.lv, look: o.look, seen: performance.now() }); };
  const removeRemote = u => { delete R[u]; }, clearRemotes = () => { for (const u in R) delete R[u]; }, keepOnly = ids => { for (const u in R) if (!ids.includes(u)) delete R[u]; };
  function lookOf() { return (typeof Char !== 'undefined' && Char.look()) || LOOK[S.me.c] || LOOK.Mago; }
  function loop(ts) { if (!vis) return; const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts; t += dt; update(dt); render(); raf = requestAnimationFrame(loop); }
  /* ---- diálogos e interações ---- */
  function dialog(title, text, btns) {
    dlgOpen = true; const d = document.getElementById('gdlg'); d.hidden = false; document.getElementById('gprompt').hidden = true;
    d.innerHTML = '<h3>✦ ' + title + '</h3><p>' + text + '</p><div class="tools"><div>' + btns.map((b, i) => '<button class="btn ' + (b[2] || '') + '" data-g="' + i + '">' + b[0] + '</button>').join('') + '</div></div>';
    d._b = btns;
  }
  function close() { dlgOpen = false; const d = document.getElementById('gdlg'); d.hidden = true; nearId = ''; }
  function interact() {
    if (dlgOpen || !nearId) return; const z = ZONES.find(x => x.id === nearId); if (!z) return;
    const go = r => () => { close(); A.go(r); }, ok = ['Fechar', close, 'ghost'];
    if (z.id === 'merchant') dialog('Mercador Elric', 'Bem-vindo, viajante! Tenho poções, baús e relíquias raras. Em breve venderei armaduras e armas que você poderá vestir.', [['ABRIR LOJA', go('shop'), 'green'], ok]);
    else if (z.id === 'inn') dialog('Taverneira Brunhilda', 'Uma caneca de hidromel, viajante? Fique à vontade. Os eventos da semana estão no quadro de avisos.', [['VER EVENTOS', go('events'), 'blue'], ok]);
    else if (z.id === 'bard') dialog('Bardo Lucan', '“' + RUMORS[Math.floor(Math.random() * RUMORS.length)] + '”', [['OUTRO RUMOR', () => { close(); interact(); }, 'blue'], ok]);
    else if (z.id === 'board') dialog('Quadro de avisos', 'Missões, eventos e recompensas da taverna estão anunciados aqui.', [['EVENTOS', go('events'), 'blue'], ['MISSÕES DO DIA', go('home'), ''], ok]);
    else if (z.id === 'fire') dialog('Lareira', 'O fogo estala e aquece suas mãos. Você se sente descansado.', [ok]);
    else if (z.id === 'south') dialog('Porta para a Praça', 'A Praça do Sino ainda está sendo construída. Volte em breve!', [ok]);
    else dialog('Escada dos Quartos', 'Os quartos dos viajantes chegam numa próxima etapa.', [ok]);
  }
  function bind() {
    cv = document.getElementById('game'); ctx = cv.getContext('2d'); lc = document.createElement('canvas'); lc.width = VW * T; lc.height = VH * T; lctx = lc.getContext('2d'); buildBG();
    addEventListener('keydown', e => { if (!vis || /INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName || '')) return; const k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault(); if (k === 'e' || k === 'Enter') interact(); else if (k === 'Escape') close(); else keys.add(k); });
    addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
    addEventListener('blur', () => { keys.clear(); pad.clear(); });
    cv.addEventListener('pointerdown', e => { if (dlgOpen) return; const r = cv.getBoundingClientRect(); target = { x: (e.clientX - r.left) / r.width * VW * T + cam.x, y: (e.clientY - r.top) / r.height * VH * T + cam.y }; });
    document.getElementById('dpad').addEventListener('pointerdown', e => { const b = e.target.closest('[data-d]'); if (!b) return; e.preventDefault(); if (b.dataset.d === 'act') interact(); else { pad.add(b.dataset.d); target = null; } });
    const up = e => { const b = e.target.closest && e.target.closest('[data-d]'); if (b) pad.delete(b.dataset.d); else pad.clear(); };
    document.getElementById('dpad').addEventListener('pointerup', up); document.getElementById('dpad').addEventListener('pointerleave', () => pad.clear()); document.getElementById('dpad').addEventListener('pointercancel', () => pad.clear()); document.getElementById('dpad').addEventListener('contextmenu', e => e.preventDefault());
    document.getElementById('gprompt').addEventListener('click', interact);
    document.getElementById('gdlg').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) { const f = document.getElementById('gdlg')._b[+b.dataset.g][1]; f(); } });
    ready = true;
  }
  function show(on) {
    const s = document.getElementById('game-section'); if (!s) return; s.hidden = !on; if (on && !ready) bind();
    if (on && !vis) { vis = true; last = performance.now(); raf = requestAnimationFrame(loop); } else if (!on) { vis = false; cancelAnimationFrame(raf); keys.clear(); pad.clear(); close(); }
  }
  return { drawChar, show, pos: () => ({ x: P.x, y: P.y, d: P.d, mv: P.mv }), upsertRemote, removeRemote, clearRemotes, keepOnly, count: () => Object.keys(R).length };
})();
PAGES.tavern = () => '';
Game.show(route() === 'tavern');
