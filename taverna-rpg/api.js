'use strict';
/* Camada online (Supabase): login, dados compartilhados e economia validada no servidor.
   Funciona por cima do script.js. Sem login, o site continua em modo demonstração. */
const SB_URL = 'https://bqsbwcswlwngivlgdzaw.supabase.co', SB_KEY = 'sb_publishable_T1wIxdAF_gMr8Vy067XPLA_tF8iwzhY', SKEY = 'taverna_sb_session';
let SES = null; try { SES = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { }
const sesSave = s => { SES = s; try { s ? localStorage.setItem(SKEY, JSON.stringify(s)) : localStorage.removeItem(SKEY); } catch (e) { } };
async function auth(path, body) {
  const r = await fetch(SB_URL + '/auth/v1/' + path, { method: 'POST', headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), j = await r.json();
  if (!r.ok) throw new Error(j.msg || j.error_description || j.message || 'Erro'); return j;
}
const sess = j => { if (!j.access_token) return false; sesSave({ at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1000, uid: j.user.id }); return true; };
async function tok() { if (!SES) throw new Error('login'); if (Date.now() > SES.exp - 60000 && !sess(await auth('token?grant_type=refresh_token', { refresh_token: SES.rt }))) throw new Error('login'); return SES.at; }
async function sb(m, p, b, h) {
  const r = await fetch(SB_URL + '/rest/v1/' + p, { method: m, headers: Object.assign({ apikey: SB_KEY, Authorization: 'Bearer ' + await tok(), 'Content-Type': 'application/json' }, h || {}), body: b ? JSON.stringify(b) : undefined }), t = await r.text();
  if (!r.ok) { let j = {}; try { j = JSON.parse(t); } catch (e) { } throw new Error(j.message || 'HTTP ' + r.status); } return t ? JSON.parse(t) : null;
}
const rpc = (f, a) => sb('POST', 'rpc/' + f, a || {});
const fail = e => toast(e && e.message && e.message.length < 80 ? e.message : 'Falha ao falar com o servidor');
const BAD = /\b(puta|puto|caralho|karalho|pora|merda|bosta|foda|foder|fodido|fodase|buceta|pqp|vsf|fdp|tnc|krl|viado|arombado|cuzao|cu|punheta|xereca|piroca|retardado|fuck|shit|bitch|cunt|dick|niger|niga|fagot)\b/;
function bad(t) { const m = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' }; return BAD.test(String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[013457@$]/g, c => m[c]).replace(/(.)\1+/g, '$1')); }
const NOBAD = () => toast('Linguagem imprópria não é permitida');
const EV_LEN = { noite: 1, caca: 3, torneio: 7 }, round = id => Math.floor(Date.now() / (EV_LEN[id] * DAY));
let pingT = 0, svT;
/* carregamento */
async function loadUsers(ids) {
  ids = [...new Set(ids)].filter(i => i && i !== SES.uid && !(S.users[i] && S.users[i].lv)); if (!ids.length) return;
  (await sb('GET', 'profiles?id=in.(' + ids.join(',') + ')&select=id,name,cls,avatar,level')).forEach(x => S.users[x.id] = { id: x.id, n: x.name, c: x.cls, a: x.avatar, lv: x.level, st: '' });
}
async function loadMe() {
  const m = await rpc('me'), p = (await sb('GET', 'profiles?id=eq.' + SES.uid + '&select=cls,avatar,quests'))[0] || {}, d = m.data || {}, prev = S.me.lv;
  const inv = (m.inv || []).filter(x => ITEM[x.k]);
  Object.assign(S.me, { n: m.name, c: p.cls || 'Mago', a: p.avatar || 0, lv: m.level, xp: m.xp, gold: m.gold, bio: m.bio || '', inv: inv.map(x => x.k), daily: p.quests && p.quests.daily === '1' && p.quests.day === today() ? today() : '', buys: d.buys || 0 });
  S.invIds = inv.map(x => x.id); if (!S.booted) { S.notif = d.notif || []; S.snd = d.snd !== false; } else if (m.level > prev) { note('Você subiu para o nível ' + m.level + '!'); toast('Nível ' + m.level + '!'); }
}
async function loadMore() {
  const [po, lk, fo, ev] = await Promise.all([sb('GET', 'posts?author=eq.' + SES.uid + '&select=id'), sb('GET', 'post_likes?user_id=eq.' + SES.uid + '&select=post_id'), sb('GET', 'follows?follower=eq.' + SES.uid + '&select=followed'), sb('GET', 'event_joins?user_id=eq.' + SES.uid + '&select=ekey')]);
  S.me.posts = po.length; S.me.likesGiven = lk.length; S.friends = fo.map(x => x.followed);
  S.me.ev = Object.keys(EV_LEN).filter(id => ev.some(e => e.ekey === id + ':' + round(id))); EVENTS.forEach(e => S.evEnd[e.id] = (round(e.id) + 1) * EV_LEN[e.id] * DAY);
  await loadUsers(S.friends); checkAch();
}
async function loadPosts() {
  const r = await sb('GET', 'posts?select=*,comments(author,name,text,created_at)&order=created_at.desc&limit=50'), ls = new Set((await sb('GET', 'post_likes?user_id=eq.' + SES.uid + '&select=post_id')).map(x => x.post_id));
  r.forEach(p => { if (!S.users[p.author]) S.users[p.author] = { id: p.author, n: p.name, c: p.cls, a: 0, lv: 0, st: '' }; }); await loadUsers(r.map(p => p.author));
  S.posts = r.map(p => ({ id: p.id, u: p.author === SES.uid ? 'me' : p.author, t: p.text, at: Date.parse(p.created_at), likes: p.likes, liked: ls.has(p.id), cm: (p.comments || []).sort((a, b) => a.created_at < b.created_at ? -1 : 1).map(c => ({ u: c.author === SES.uid ? 'me' : c.author, n: c.name, t: c.text })) }));
}
async function loadRank() {
  const r = await sb('GET', 'profiles?select=id,name,cls,avatar,level&order=level.desc,xp.desc&limit=50');
  S.rankList = r.map(x => { const u = { id: x.id, n: x.name, c: x.cls, a: x.avatar, lv: x.level, st: '' }; if (x.id !== SES.uid) S.users[x.id] = u; return x.id === SES.uid ? { id: 'me', n: x.name, c: x.cls, a: x.avatar, lv: x.level } : u; });
}
async function loadOnline() { const r = await sb('GET', 'online?select=user_id&seen_at=gt.' + encodeURIComponent(new Date(Date.now() - 90000).toISOString())); S.onlineSet = new Set(r.map(x => x.user_id)); S.onlineN = r.length; }
async function loadThread() {
  const t = S.ui.chat; if (!t || t.length < 20) return;
  const r = await sb('GET', 'messages?select=*&or=(and(author.eq.' + SES.uid + ',recipient.eq.' + t + '),and(author.eq.' + t + ',recipient.eq.' + SES.uid + '))&order=created_at.asc&limit=100');
  S.dm[t] = r.map(m => ({ f: m.author === SES.uid ? 'me' : t, t: m.text, at: Date.parse(m.created_at) }));
  if (r.some(m => m.author === t && !m.read_at)) sb('PATCH', 'messages?recipient=eq.' + SES.uid + '&author=eq.' + t + '&read_at=is.null', { read_at: new Date().toISOString() }).catch(() => { });
}
async function refresh() { await loadMe(); await loadAdminBan(); await Promise.all([loadPosts(), loadRank(), loadOnline()]); await loadMore(); await loadThread(); render(); }
const sbData = () => sb('PATCH', 'profiles?id=eq.' + SES.uid, { data: { notif: S.notif.slice(0, 20), buys: S.me.buys, snd: S.snd } });
/* o servidor concede XP e ouro; o navegador só guarda preferências */
const save0 = save; save = () => { if (!S.online) return save0(); clearTimeout(svT); svT = setTimeout(() => sbData().catch(() => { }), 1500); };
const gain0 = gain; gain = (...a) => S.online ? undefined : gain0(...a);
/* ações online */
const over = (n, f) => { const o = A[n]; A[n] = (v, b) => S.online ? f(v, b).catch(fail) : o(v, b); };
over('post', async () => { const t = $('#txt').value.trim(); if (!t) return toast('Escreva algo antes de publicar'); if (bad(t)) return NOBAD(); await sb('POST', 'posts', { name: S.me.n.slice(0, 24), cls: S.me.c, text: t.slice(0, 500) }); beep(660); await refresh(); toast('Publicado!'); });
over('like', async v => { const p = S.posts.find(x => x.id == v); if (p.liked) await sb('DELETE', 'post_likes?post_id=eq.' + v + '&user_id=eq.' + SES.uid); else await sb('POST', 'post_likes', { post_id: v }); beep(); await refresh(); });
over('comment', async v => { const t = $('#c' + v).value.trim(); if (!t) return; if (bad(t)) return NOBAD(); await sb('POST', 'comments', { post_id: v, name: S.me.n.slice(0, 24), text: t.slice(0, 140) }); beep(); await refresh(); });
over('class', async v => { await sb('PATCH', 'profiles?id=eq.' + SES.uid, { cls: v }); toast('Classe alterada para ' + v); await refresh(); });
over('buy', async v => { await rpc('shop_buy', { item: v }); S.me.buys++; await sbData(); beep(988); toast('Compra realizada'); await refresh(); });
over('use', async v => { const r = await rpc('shop_use', { iid: S.invIds[v] }); beep(880); toast(r && r.msg || 'Item usado'); await refresh(); });
over('daily', async () => { await rpc('daily_claim'); beep(988); toast('Recompensa diária: +40 ouro'); await refresh(); });
over('join', async v => { await rpc('join_event', { eid: v }); toast('Participação confirmada!'); await refresh(); });
over('addf', async v => { await sb('POST', 'follows', { followed: v }); toast('Amigo adicionado'); await refresh(); });
over('rmf', async v => { await sb('DELETE', 'follows?follower=eq.' + SES.uid + '&followed=eq.' + v); S.ui.chat = ''; await refresh(); S.ui.chat = S.friends[0] || ''; render(); });
over('chat', async v => { S.ui.chat = v; location.hash = 'messages'; await loadThread(); render(); });
over('send', async () => { const t = $('#dm').value.trim(); if (!t || !S.ui.chat) return; if (bad(t)) return NOBAD(); await sb('POST', 'messages', { recipient: S.ui.chat, text: t.slice(0, 300) }); beep(); await loadThread(); render(); });
over('saveset', async () => { const n = $('#s-n').value.trim(), b = $('#s-b').value; if (!n) return toast('Informe um nome'); if (bad(n) || bad(b)) return NOBAD(); const r = document.querySelector('input[name=av]:checked'); await sb('PATCH', 'profiles?id=eq.' + SES.uid, { name: n.slice(0, 24), bio: b.slice(0, 200), avatar: r ? +r.value : S.me.a }); S.snd = $('#s-s').checked; await sbData(); toast('Perfil salvo'); await refresh(); });
over('reset', async () => { sesSave(null); location.reload(); });
const go0 = A.go; A.go = v => { go0(v); if (S.online && v === 'messages') loadThread().then(render).catch(() => { }); if (S.online && v === 'admin') A.asearch(); };
/* login */
function overlay() {
  const d = document.createElement('div'); d.id = 'lg'; d.style.display = SES ? 'none' : 'flex';
  d.innerHTML = `<div class="px panel" style="max-width:380px;width:100%"><h3>✦ ENTRAR NA TAVERNA</h3><input id="le" type="email" placeholder="E-mail"><input id="lp" type="password" placeholder="Senha (mínimo 6)"><input id="ln" maxlength="24" placeholder="Nome do personagem (conta nova)"><div class="tools"><div>${btn('ENTRAR', 'lgin', '', 'red')}${btn('CRIAR CONTA', 'lgnew', '', 'blue')}</div>${btn('MODO DEMONSTRAÇÃO', 'lgdemo', '', 'ghost')}</div><p id="lm" style="color:#d23a4c"></p><small>Seu e-mail e progresso ficam guardados só para o jogo. Palavrões e ofensas são bloqueados.</small></div>`;
  document.body.appendChild(d);
}
async function login(kind) {
  const m = $('#lm'); try {
    m.textContent = ''; const e = $('#le').value.trim(), p = $('#lp').value, n = $('#ln').value.trim();
    if (!e || p.length < 6) return m.textContent = 'Informe e-mail e senha (6 ou mais caracteres)'; if (kind === 'new' && bad(n)) return m.textContent = 'Nome com linguagem imprópria';
    const j = kind === 'new' ? await auth('signup', { email: e, password: p, data: { name: n } }) : await auth('token?grant_type=password', { email: e, password: p });
    if (!sess(j)) return m.textContent = 'Conta criada. Confirme o e-mail e depois entre.'; await boot(n);
  } catch (x) { m.textContent = x.message; }
}
A.lgin = () => login('in'); A.lgnew = () => login('new'); A.lgdemo = () => { $('#lg').style.display = 'none'; };
async function boot(nm) {
  S.online = true; S.uid = SES.uid; S.users = {}; S.posts = []; S.dm = {}; S.friends = []; S.notif = []; S.booted = false; S.adm = { q: '', list: [] }; S.ui.chat = ''; S.me = Object.assign({}, seed().me);
  await loadMe(); if (nm && S.me.n === 'Viajante') { await sb('PATCH', 'profiles?id=eq.' + SES.uid, { name: nm.slice(0, 24) }); }
  S.booted = true; $('#lg').style.display = 'none'; await refresh(); S.ui.chat = S.friends[0] || ''; render();
  if (!boot.t) boot.t = setInterval(poll, 8000);
}
function poll() { if (!S.online || /INPUT|TEXTAREA/.test((document.activeElement || {}).tagName || '')) return; if (Date.now() - pingT > 30000) { pingT = Date.now(); rpc('ping').catch(() => { }); } refresh().catch(() => { }); }
/* administração: só funciona para quem está na tabela admins; o servidor confere tudo */
async function loadAdminBan() {
  S.admin = (await sb('GET', 'admins?user_id=eq.' + SES.uid + '&select=user_id')).length > 0; if (S.admin && !NAV.some(n => n[0] === 'admin')) NAV.push(['admin', 'ADMIN', 'e_crown']);
  const b = (await sb('GET', 'bans?user_id=eq.' + SES.uid + '&select=until,reason'))[0]; S.ban = b && (!b.until || Date.parse(b.until) > Date.now()) ? b : null;
  let el = $('#banbar'); if (!el) { el = document.createElement('div'); el.id = 'banbar'; el.className = 'px panel'; el.style.cssText = 'color:#ff8a8a;border-color:#8b1e24'; $('#notifs').after(el); }
  el.style.display = S.ban ? 'block' : 'none'; if (S.ban) el.textContent = '⛔ Você está banido ' + (S.ban.until ? 'até ' + new Date(S.ban.until).toLocaleString('pt-BR') : 'permanentemente') + (S.ban.reason ? '. Motivo: ' + S.ban.reason : '') + '. Você pode ler, mas não pode publicar nem enviar mensagens.';
}
const DUR = [[10, '10 minutos'], [60, '1 hora'], [360, '6 horas'], [1440, '1 dia'], [10080, '7 dias'], [43200, '30 dias'], [0, 'Permanente']];
const admRow = u => `<div class="row" style="display:block"><div><b>${esc(u.name)}</b> · Nível ${u.level} · 🪙 ${u.gold}<br><small>${esc(u.email || '')}</small>${u.ban ? `<br><span class="badge">BANIDO ${u.ban.until ? 'até ' + new Date(u.ban.until).toLocaleString('pt-BR') : 'PERMANENTE'}</span>` : ''}</div>
<div class="tools"><div><input id="g-${u.id}" type="number" min="0" placeholder="Novo ouro" style="width:130px">${btn('DEFINIR OURO', 'agold', u.id, 'blue')}</div></div>
<div class="tools"><div><select id="d-${u.id}" style="width:150px">${DUR.map(d => `<option value="${d[0]}">${d[1]}</option>`).join('')}</select><input id="r-${u.id}" maxlength="80" placeholder="Motivo (opcional)" style="width:170px">${btn('BANIR', 'aban', u.id, 'red')}${u.ban ? btn('DESBANIR', 'aunban', u.id, 'green') : ''}</div></div>
<div class="tools"><div><select id="i-${u.id}" style="width:230px">${(typeof ITEMS !== 'undefined' ? Object.keys(ITEMS) : []).map(k => `<option value="${k}">${esc(ITEMS[k].n)} (${ITEMS[k].rarity})</option>`).join('')}</select>${btn('DAR ITEM', 'agrant', u.id, 'blue')}</div></div></div>`;
PAGES.admin = () => S.admin ? panel('PAINEL DO ADMINISTRADOR', `<div class="tools"><input id="aq" placeholder="Buscar por nome ou e-mail" style="flex:1" value="${esc(S.adm.q || '')}">${btn('BUSCAR', 'asearch', '', 'blue')}</div><p class="dim">Para apagar um post, use o botão 🗑 APAGAR no Início.</p>${(S.adm.list || []).map(admRow).join('') || '<p class="dim">Nenhum jogador encontrado.</p>'}`) : panel('ACESSO NEGADO', '<p>Esta área é só para administradores.</p>');
const adm = (n, f) => { A[n] = v => f(v).catch(fail); };
adm('asearch', async () => { const q = $('#aq') ? $('#aq').value.trim() : S.adm.q; S.adm.q = q; S.adm.list = await rpc('admin_users', { q }); S.adm.rep = await rpc('admin_reports'); render(); });
adm('agold', async id => { const v = parseInt($('#g-' + id).value, 10); if (isNaN(v) || v < 0) return toast('Informe um valor válido'); await rpc('admin_set_gold', { uid: id, amount: v }); toast('Ouro definido'); await A.asearch(); });
adm('aban', async id => { await rpc('admin_ban', { uid: id, minutes: +$('#d-' + id).value, reason: $('#r-' + id).value.trim() }); toast('Jogador banido'); await A.asearch(); });
adm('aunban', async id => { await rpc('admin_unban', { uid: id }); toast('Banimento removido'); await A.asearch(); });
adm('agrant', async id => { await rpc('admin_grant_item', { uid: id, iid: $('#i-' + id).value }); toast('Item entregue'); });
adm('adel', async id => { await rpc('admin_delete_post', { pid: id }); toast('Post apagado'); await refresh(); });
const adm0 = PAGES.admin;
PAGES.admin = () => adm0() + (S.admin && Array.isArray(S.adm.rep) ? panel('DENÚNCIAS RECEBIDAS', S.adm.rep.map(r => `<div class="row" style="display:block"><b>${esc(r.target_name || '?')}</b> <small>(${esc(r.ctx)}) denunciado por ${esc(r.reporter_name || '?')}</small><br>“${esc(r.excerpt || '')}”<div class="tools"><div>${btn('BUSCAR JOGADOR', 'arfind', r.target_name || '', 'blue')}${btn('RESOLVER', 'ares', r.id, 'ghost')}</div></div></div>`).join('') || '<p class="dim">Nenhuma denúncia.</p>') : '');
adm('arfind', async n => { if ($('#aq')) $('#aq').value = n; await A.asearch(); });
adm('ares', async id => { await rpc('admin_resolve_report', { rid: id }); toast('Denúncia resolvida'); S.adm.rep = await rpc('admin_reports'); render(); });
overlay(); if (SES) boot('').catch(() => { sesSave(null); $('#lg').style.display = 'flex'; });
