'use strict';
/* ETAPA 2 — multiplayer: jogadores no mesmo cenário, chat em tempo real, denúncia e bloqueio.
   Usa o Supabase Realtime (Broadcast para posições, Presence para quem está online e
   Postgres Changes para o chat). Só conecta quando você está na Taverna e logado. */
const RT = (() => {
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js', MW = 28 * 16, MH = 18 * 16;
  let sbc = null, ch = null, on = false, lastSent = '', lastT = 0, loop = 0, authT = 0, pollT = 0, cd = 0; const PL = {}, blocked = new Set(), msgs = [], $g = id => document.getElementById(id);
  const lib = () => window.supabase ? Promise.resolve() : new Promise((ok, no) => { const s = document.createElement('script'); s.src = LIB; s.onload = ok; s.onerror = () => no(new Error('Não foi possível carregar o tempo real')); document.head.appendChild(s); });
  const status = s => { const e = $g('grt'); if (e) e.textContent = s === 'SUBSCRIBED' ? '● ao vivo' : s === 'OFFLINE' ? '' : '⚠ reconectando…'; };
  async function info(ids) {
    ids = ids.filter(i => i && !PL[i]); if (!ids.length) return; ids.forEach(i => PL[i] = { n: 'Viajante', c: 'Mago', lv: 1, a: 0 });
    try { (await sb('GET', 'profiles?id=in.(' + ids.join(',') + ')&select=id,name,cls,avatar,level')).forEach(x => PL[x.id] = { n: x.name, c: x.cls, lv: x.level, a: x.avatar }); } catch (e) { ids.forEach(i => delete PL[i]); }
    try { (await sb('GET', 'characters?user_id=in.(' + ids.join(',') + ')&select=user_id,skin,hair,hair_color,equip')).forEach(x => { if (PL[x.user_id]) PL[x.user_id].look = Char.toLook(x); }); } catch (e) { } renderOnline();
  }
  function onPos(p) {
    if (!p || typeof p.u !== 'string' || p.u === SES.uid || blocked.has(p.u)) return; const x = +p.x, y = +p.y; if (!(x >= 0 && x <= MW && y >= 0 && y <= MH)) return;
    if (!PL[p.u]) info([p.u]); const i = PL[p.u] || {};
    Game.upsertRemote(p.u, { x, y, d: ['up', 'down', 'left', 'right'].includes(p.d) ? p.d : 'down', m: p.m ? 1 : 0, n: i.n || 'Viajante', c: i.c, lv: i.lv || 1, look: i.look });
  }
  function sync() { const ids = Object.keys(ch.presenceState()); S.rtOnline = ids; info(ids); Game.keepOnly(ids); renderOnline(); }
  function send(force) {
    if (!ch) return; const p = Game.pos(), k = Math.round(p.x) + ',' + Math.round(p.y) + p.d + p.mv, now = Date.now(); if (!force && k === lastSent && now - lastT < 1500) return; lastSent = k; lastT = now;
    ch.send({ type: 'broadcast', event: 'p', payload: { u: SES.uid, x: Math.round(p.x), y: Math.round(p.y), d: p.d, m: p.mv ? 1 : 0 } });
  }
  /* chat */
  const lookChanged = () => { if (ch) ch.send({ type: 'broadcast', event: 'look', payload: { u: SES.uid } }); };
  async function loadChat() { try { const r = await sb('GET', 'chat?channel=eq.taverna&order=created_at.desc&limit=40'); msgs.length = 0; r.reverse().forEach(m => msgs.push(m)); drawChat(); } catch (e) { } }
  function addMsg(m) { if (msgs.some(x => x.id === m.id)) return; msgs.push(m); if (msgs.length > 60) msgs.shift(); drawChat(); }
  function drawChat() {
    const el = $g('gchat'); if (!el) return;
    el.innerHTML = msgs.filter(m => !blocked.has(m.author)).map(m => { const me = m.author === SES.uid; return '<div class="gm' + (me ? ' me' : '') + '"><b>' + esc(m.name) + '</b> <small>' + new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</small> ' + esc(m.text) + (me ? '' : ' <span class="gx"><button data-rep="' + m.id + '" title="Denunciar">🚩</button><button data-blk="' + m.author + '" title="Bloquear">⛔</button></span>') + '</div>'; }).join('') || '<small>Nenhuma mensagem ainda.</small>';
    el.scrollTop = 1e6;
  }
  async function sendChat() {
    const i = $g('gci'), t = i.value.trim(); if (!t) return; if (!S.online) return toast('Entre na sua conta para conversar'); if (bad(t)) return toast('Linguagem imprópria não é permitida'); if (Date.now() - cd < 1200) return toast('Calma, viajante! Espere um instante.');
    cd = Date.now(); try { await sb('POST', 'chat', { channel: 'taverna', name: S.me.n.slice(0, 24), text: t.slice(0, 140) }); i.value = ''; if (!on) await loadChat(); } catch (e) { fail(e); }
  }
  /* bloqueio e denúncia */
  async function loadBlocks() { try { (await sb('GET', 'blocks?blocker=eq.' + SES.uid + '&select=blocked')).forEach(x => blocked.add(x.blocked)); } catch (e) { } }
  async function block(u, yes) {
    try { if (yes) { await sb('POST', 'blocks', { blocked: u }); blocked.add(u); Game.removeRemote(u); toast('Jogador bloqueado'); } else { await sb('DELETE', 'blocks?blocker=eq.' + SES.uid + '&blocked=eq.' + u); blocked.delete(u); toast('Jogador desbloqueado'); } drawChat(); renderOnline(); } catch (e) { fail(e); }
  }
  async function report(u, ctx, excerpt) { try { await rpc('report_user', { target: u, ctx, excerpt: (excerpt || '').slice(0, 200), reason: ctx }); toast('Denúncia enviada. Obrigado!'); } catch (e) { fail(e); } }
  function renderOnline() {
    const n = $g('gcount'), o = $g('gonline'); if (!n || !o) return; const ids = S.rtOnline || []; n.textContent = on ? ids.length : 0;
    o.innerHTML = !S.online ? '<small>Entre na conta para ver os outros viajantes.</small>' : ids.map(u => { const me = u === SES.uid, i = PL[u] || { n: '…', lv: 0 };
      return '<div class="gp"><span class="eye mini"></span><b>' + esc(me ? S.me.n + ' (você)' : i.n) + '</b> <small>Nv. ' + (me ? S.me.lv : i.lv) + '</small>' + (me ? '' : ' <span class="gx"><button data-rep2="' + u + '" title="Denunciar">🚩</button>' + (blocked.has(u) ? '<button data-unb="' + u + '" title="Desbloquear">✓</button>' : '<button data-blk2="' + u + '" title="Bloquear">⛔</button>') + '</span>') + '</div>'; }).join('') || '<small>Conectando…</small>';
  }
  /* conexão */
  async function connect() {
    if (on || !S.online) return; on = true;
    try {
      await lib(); const t = await tok(); sbc = supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { params: { eventsPerSecond: 10 } } }); sbc.realtime.setAuth(t);
      await Promise.all([loadBlocks(), loadChat()]);
      ch = sbc.channel('taverna-room', { config: { broadcast: { self: false }, presence: { key: SES.uid } } });
      ch.on('broadcast', { event: 'p' }, m => onPos(m.payload)).on('broadcast', { event: 'look' }, m => { const u = m.payload && m.payload.u; if (typeof u === 'string' && u !== SES.uid) { delete PL[u]; info([u]); } }).on('presence', { event: 'sync' }, sync).on('presence', { event: 'join' }, e => { send(true); (e.newPresences || []).forEach(p => { if (p.uid && p.uid !== SES.uid) { delete PL[p.uid]; info([p.uid]); } }); })
        .on('presence', { event: 'leave' }, e => (e.leftPresences || []).forEach(l => Game.removeRemote(l.uid)))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat', filter: 'channel=eq.taverna' }, m => addMsg(m.new))
        .subscribe(s => { status(s); if (s === 'SUBSCRIBED') { ch.track({ uid: SES.uid }); send(true); } });
      loop = setInterval(() => send(false), 120); authT = setInterval(() => tok().then(x => sbc.realtime.setAuth(x)).catch(() => { }), 600000); pollT = setInterval(loadChat, 20000);
    } catch (e) { on = false; toast(e.message || 'Falha ao conectar'); }
  }
  function disconnect() {
    if (!on) return; on = false; clearInterval(loop); clearInterval(authT); clearInterval(pollT);
    try { if (ch) ch.untrack(); if (sbc) sbc.removeAllChannels(); } catch (e) { } ch = sbc = null; Game.clearRemotes(); S.rtOnline = []; renderOnline(); status('OFFLINE');
  }
  function bindUI() {
    $g('gside').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.rep) { const m = msgs.find(x => x.id === d.rep); if (m) report(m.author, 'chat', m.text); } else if (d.blk) block(d.blk, true); else if (d.rep2) report(d.rep2, 'player', ''); else if (d.blk2) block(d.blk2, true); else if (d.unb) block(d.unb, false); });
    $g('gcs').addEventListener('click', sendChat); $g('gci').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
  }
  const show0 = Game.show; Game.show = v => { show0(v); if (v) connect(); else disconnect(); };
  bindUI(); renderOnline();
  return { connect, disconnect, lookChanged, _t: { onPos, addMsg, blocked, msgs, report, block, sendChat } };
})();
