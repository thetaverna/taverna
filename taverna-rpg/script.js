'use strict';
/* A Taverna dos Sinos Mudos — demonstração com dados salvos no navegador (localStorage) */
const KEY = 'taverna_demo_v1';
const $ = (s, e = document) => e.querySelector(s);
const IMG = p => (window.ASSETS && ASSETS[p]) || 'assets/' + p;
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EMOTES = ['like', 'heart', 'chat', 'laugh', 'angry', 'shock', 'skull', 'swords', 'crown'];
const fmt = t => esc(t).replace(/:(\w+):/g, (m, n) => EMOTES.includes(n) ? `<img class="em" src="${IMG('icons/e_' + n + '.png')}" alt="${n}">` : m);
const CLS = {
  Guerreiro: { img: 'guerreiro', d: 'Defende a taverna na linha de frente.', s: [9, 2, 8] },
  Mago: { img: 'mago', d: 'Domina runas e magias arcanas.', s: [2, 10, 3] },
  Ladino: { img: 'ladino', d: 'Rápido e furtivo, vive nas sombras.', s: [6, 3, 4] },
  Arqueiro: { img: 'arqueiro', d: 'Precisão mortal à distância.', s: [7, 3, 4] },
  Clérigo: { img: 'clerigo', d: 'Cura aliados e abençoa viajantes.', s: [3, 7, 7] }
};
const NPC = [
  { id: 'darksage', n: 'DarkSage', lv: 45, c: 'Mago', a: 2, st: 'No castelo' }, { id: 'morgana', n: 'Morgana', lv: 42, c: 'Ladino', a: 1, st: 'Conversando' },
  { id: 'ragnar', n: 'Ragnar', lv: 38, c: 'Guerreiro', a: 0, st: 'No castelo' }, { id: 'lunara', n: 'Lunara', lv: 36, c: 'Clérigo', a: 3, st: 'Na taverna' },
  { id: 'thalor', n: 'Thalor', lv: 32, c: 'Arqueiro', a: 4, st: 'Explorando' }
];
const SHOP = [
  { id: 'potion', n: 'Poção de Vida', ic: 'i_potion', p: 40, d: 'Use: +20 XP' }, { id: 'chest', n: 'Baú do Aventureiro', ic: 'i_chest', p: 120, d: 'Use: ouro e XP surpresa' },
  { id: 'star', n: 'Estrela da Sorte', ic: 'i_star', p: 150, d: 'Use: +50 XP' }, { id: 'heart', n: 'Coração Vivo', ic: 'i_heart', p: 60, d: 'Item de coleção' },
  { id: 'diamond', n: 'Diamante Azul', ic: 'i_diamond', p: 200, d: 'Item raro de coleção' }, { id: 'ring', n: 'Anel Sombrio', ic: 'i_ring', p: 300, d: 'Item de coleção' },
  { id: 'sword', n: 'Espada Rúnica', ic: 'i_sword', p: 500, d: 'Item de coleção' }
];
const ITEM = Object.fromEntries(SHOP.map(i => [i.id, i]));
const ACH = [
  ['badge1', 'Primeiro Pergaminho', s => s.me.posts >= 1], ['badge2', 'Voz da Taverna (5 posts)', s => s.me.posts >= 5], ['badge3', 'Mão Amiga (10 curtidas)', s => s.me.likesGiven >= 10],
  ['rank1', 'Mercador (1 compra)', s => s.me.buys >= 1], ['rank2', 'Sociável (3 amigos)', s => s.friends.length >= 3], ['rank3', 'Veterano (nível 5)', s => s.me.lv >= 5],
  ['rank4', 'Colecionador (5 itens)', s => s.me.inv.length >= 5], ['rank5', 'Participante de evento', s => s.me.ev.length >= 1]
];
const DAY = 864e5, now = () => Date.now();
const seed = () => ({
  me: { n: 'Zarturzin', c: 'Mago', a: 0, lv: 1, xp: 0, gold: 120, bio: 'Viajante recém-chegado à taverna.', inv: [], ev: [], buys: 0, likesGiven: 0, posts: 0, daily: '' },
  posts: [
    { id: 1, u: 'lunara', t: 'Depois de semanas de batalha, finalmente cheguei ao nível 10! Essa taverna é incrível! :crown:', at: now() - 32 * 6e4, likes: 37, liked: false, cm: [{ u: 'thalor', t: 'Parabéns, viajante!' }] },
    { id: 2, u: 'thalor', t: 'Alguém mais está explorando a Floresta Sombria hoje?', at: now() - 12 * 6e4, likes: 24, liked: false, cm: [] },
    { id: 3, u: 'morgana', t: 'A taverna está sempre mais viva com vocês por aqui! :heart:', at: now() - 5 * 6e4, likes: 18, liked: false, cm: [] }],
  friends: ['lunara', 'thalor'], dm: {}, notif: [{ t: 'Bem-vindo à Taverna dos Sinos Mudos!', at: now(), r: 0 }],
  ui: { f: '', chat: 'lunara', emo: 0, notif: 0 }, evEnd: {}, snd: true, day: { d: '', n: 0 }
});
let S; try { S = JSON.parse(localStorage.getItem(KEY)) || seed(); } catch (e) { S = seed(); }
let save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { } };
const U = id => id === 'me' ? { id: 'me', n: S.me.n, c: S.me.c, a: S.me.a, lv: S.me.lv } : (S.users && S.users[id]) || NPC.find(x => x.id === id) || { id, n: 'Viajante', c: 'Mago', a: 0, lv: 1, st: '' };
const stOf = u => u.st || (S.onlineSet ? (S.onlineSet.has(u.id) ? 'online' : 'offline') : '');
const need = lv => lv * 100, today = () => { const d = new Date(); return (typeof S !== 'undefined' && S && S.online) ? d.toISOString().slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };  /* online: dia UTC, igual ao servidor; demonstração: dia local */
const ago = t => { const m = Math.floor((now() - t) / 6e4); return m < 1 ? 'agora' : m < 60 ? `há ${m} min` : m < 1440 ? `há ${Math.floor(m / 60)} h` : `há ${Math.floor(m / 1440)} d`; };
const EVENTS = [
  { id: 'noite', n: 'A Noite dos Sinos', d: 'Fique online hoje e ganhe recompensas especiais!', r: '+100 ouro e +80 XP', days: 1, g: 100, x: 80 },
  { id: 'caca', n: 'Caça ao Tesouro', d: 'Explore a Floresta Sombria atrás de relíquias.', r: 'Baú do Aventureiro + 60 XP', days: 3, g: 0, x: 60, item: 'chest' },
  { id: 'torneio', n: 'Torneio da Arena', d: 'Mostre sua classe aos outros viajantes.', r: '+250 ouro e +120 XP', days: 7, g: 250, x: 120 }
];
EVENTS.forEach(e => { if (!S.evEnd[e.id]) S.evEnd[e.id] = now() + e.days * DAY; });
/* componentes reutilizáveis */
const av = (i, s = 48) => `<img class="av" style="width:${s}px;height:${s}px" src="${IMG('sprites/avatar' + (i + 1) + '.png')}" alt="avatar">`;
const ic = (n, s = 20) => `<img class="ic" style="width:${s}px;height:${s}px" src="${IMG('icons/' + n + '.png')}" alt="">`;
const btn = (l, a, v = '', c = '', x = '') => `<button class="btn ${c}" data-a="${a}" data-v="${esc(v)}" ${x}>${l}</button>`;
const panel = (t, h, c = '') => `<section class="px panel ${c}"><h3>✦ ${t}</h3>${h}</section>`;
const bar = (v, m) => `<div class="xpbar"><i style="width:${Math.min(100, v / m * 100)}%"></i></div>`;
const left = ms => { const m = Math.max(0, Math.floor(ms / 6e4)); return `${Math.floor(m / 60)}h ${m % 60}min`; };
/* utilidades */
function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('show'), 2200); }
function beep(f = 520) { if (!S.snd) return; try { const c = beep.c = beep.c || new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.value = f; g.gain.setValueAtTime(.04, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .12); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .13); } catch (e) { } }
function note(t) { S.notif.unshift({ t, at: now(), r: 0 }); S.notif = S.notif.slice(0, 20); }
function gain(x, g, msg) {
  const m = S.me; m.xp += x; m.gold += g;
  while (m.xp >= need(m.lv)) { m.xp -= need(m.lv); m.lv++; m.inv.push('chest'); note(`Você subiu para o nível ${m.lv} e ganhou um Baú do Aventureiro!`); toast(`Nível ${m.lv}!`); }
  checkAch(); save(); toast(msg || `+${x} XP · +${g} ouro`);
}
function checkAch() { ACH.forEach(a => { S.me.ach = S.me.ach || []; if (!S.me.ach.includes(a[0]) && a[2](S)) { S.me.ach.push(a[0]); note('Conquista desbloqueada: ' + a[1]); } }); }
/* páginas */
const friendsPanel = () => panel('AMIGOS ONLINE', (S.friends.map(U).map(u => `<div class="row">${av(u.a, 40)}<div class="g"><b>${u.n}</b><br><small>● ${stOf(u)}</small></div></div>`).join('') || '<p class="dim">Adicione amigos no Ranking.</p>') + `<div style="margin-top:10px">${btn('VER TODOS', 'go', 'messages', 'ghost')}</div>`);
const ranked = () => S.rankList || NPC.concat([{ id: 'me', n: S.me.n, lv: S.me.lv, c: S.me.c, a: S.me.a }]).sort((a, b) => b.lv - a.lv);
const rankPanel = () => panel('RANKING DE NÍVEL', ranked().slice(0, 5).map((u, i) => `<div class="row"><b>${i + 1}</b>${av(u.a, 34)}<div class="g">${esc(u.n)}</div><small>Lv. ${u.lv}</small></div>`).join(''));
const eventPanel = () => { const e = EVENTS[0]; return panel('EVENTOS', `<b style="color:var(--gl)">Evento: ${e.n}</b><p>${e.d}</p><div>⏳ Termina em: <b data-end="${S.evEnd[e.id]}">${left(S.evEnd[e.id] - now())}</b></div><div style="margin-top:8px">${btn('VER DETALHES', 'go', 'events')}</div>`); };
const progress = () => panel('SEU PROGRESSO', `<div class="row">${ic('star', 32)}<div class="g">Nível <b>${S.me.lv}</b>${bar(S.me.xp, need(S.me.lv))}<small>${S.me.xp} / ${need(S.me.lv)} XP</small></div></div><small>Próxima recompensa:</small><div class="row">${ic('i_chest', 32)}<div class="g">Baú do Aventureiro<br><small>ao chegar ao nível ${S.me.lv + 1}</small></div></div>`);
const postHTML = p => { const u = U(p.u); return `<article class="px post"><div class="ph">${av(u.a, 52)}<div style="flex:1"><b>${esc(u.n)}</b><span class="cb">${u.c}</span><br><small>${ago(p.at)}</small></div></div><div class="pt">${fmt(p.t)}</div>
<div class="pa">${btn(`${ic('e_heart', 18)} ${p.likes} Curtir`, 'like', p.id, p.liked ? 'on' : 'ghost')}${S.admin ? btn('🗑 APAGAR', 'adel', p.id, 'red') : ''}</div>
<div class="cm">${p.cm.map(c => `<p><b>${esc(c.n || U(c.u).n)}:</b> ${fmt(c.t)}</p>`).join('')}<div class="in"><input id="c${p.id}" maxlength="140" placeholder="Escreva um comentário...">${btn(`${ic('e_chat', 18)} Comentar`, 'comment', p.id)}</div></div></article>`; };
const PAGES = {
  home() {
    const m = S.me, c = CLS[m.c] || CLS.Guerreiro, f = S.ui.f, list = S.posts.filter(p => !f || U(p.u).c === f);
    const stat = (label, val, max, color) => `<div class="hero-stat"><span>${label}</span><div class="hero-bar"><i style="width:${Math.max(0,Math.min(100,val/max*100))}%;background:${color}"></i></div><b>${val}/${max}</b></div>`;
    return `<div class="tavern-dashboard">
      <aside class="hero-profile px"><div class="hero-identity"><img src="${IMG('sprites/' + c.img + '.png')}" alt="Personagem ${esc(m.c)}"><div><b>${esc(m.n)}</b><span>Nível ${m.lv}</span><small>⚔ ${esc(m.c)}</small><small>♜ Guilda: ${S.friends.length ? 'Viajantes' : 'Nenhuma'}</small></div></div>
      ${stat('❤️ Vida', Math.max(1,100 + m.lv*5), 100 + m.lv*5, '#b72a35')}${stat('⚡ Energia', 100, 100, '#347db5')}
      <div class="hero-row"><span>⚔ Ataque</span><b>${8 + m.lv}</b></div><div class="hero-row"><span>🛡 Defesa</span><b>${4 + Math.floor(m.lv/2)}</b></div><div class="hero-row"><span>✦ Velocidade</span><b>6</b></div><h3>Atributos</h3>
      ${[['Força',8+m.lv,'✊'],['Agilidade',6,'🪶'],['Vitalidade',10+m.lv,'❤️'],['Inteligência',5,'📖'],['Sorte',5,'☘']].map(a=>`<div class="hero-row"><span>${a[2]} ${a[0]}</span><b>${a[1]}</b></div>`).join('')}
      <button class="btn" data-a="go" data-v="profile">VER PERFIL</button></aside>
      <section class="hero-stage"><div class="stage-title"><span>✦ A TAVERNA DOS SINOS MUDOS ✦</span><small>Um refúgio entre aventuras</small></div><div class="stage-figure"><img src="${IMG('sprites/' + c.img + '.png')}" alt="${esc(m.c)}" class="stage-character"></div><div class="stage-npc stage-npc-left"><span>🍺</span><b>Taverneiro</b><small>Bem-vindo, aventureiro!<br>Pronto para novas jornadas?</small></div><div class="stage-npc stage-npc-right"><span>🕯</span><b>Mensageiro</b><small>Há rumores chegando...</small></div><div class="stage-actions"><button class="btn red" data-a="go" data-v="tavern">ENTRAR NA TAVERNA</button><button class="btn" data-a="go" data-v="character">PERSONAGEM</button><button class="btn" data-a="go" data-v="shop">LOJA</button></div></section>
      <aside class="hero-side"><section class="px panel"><h3>INVENTÁRIO</h3><div class="hero-inventory">${(m.inv || []).slice(0,12).map(id=>`<div class="hero-item" title="${esc((ITEM[id]||{}).n || id)}"><img src="${IMG('icons/' + ((ITEM[id]||{}).ic || 'i_chest') + '.png')}" alt=""></div>`).join('')}${!m.inv.length?'<small class="dim">Seu inventário está vazio.</small>':''}</div><div class="hero-bottom"><span>🪙 ${m.gold} ouro</span><button class="btn ghost" data-a="go" data-v="shop">ABRIR</button></div></section>
      <section class="px panel"><h3>EQUIPAMENTO</h3><div class="hero-equip"><div class="equip-slots"><span>🪖 Cabeça</span><span>🧥 Armadura</span><span>🧣 Capa</span><span>⚔ Arma</span><span>🛡 Escudo</span><span>🥾 Botas</span></div><img src="${IMG('sprites/' + c.img + '.png')}" alt="Equipamento do personagem"></div><button class="btn" data-a="go" data-v="character">GERENCIAR EQUIPAMENTO</button></section>
      <section class="px panel"><h3>PERSONALIZAÇÃO</h3><div class="hero-avatars">${[1,2,3,4,5].map(i=>`<img src="${IMG('sprites/avatar'+i+'.png')}" alt="Aparência ${i}">`).join('')}</div><button class="btn ghost" data-a="go" data-v="character">PERSONALIZAR</button></section>
      </aside>
      <section class="hero-chat px"><div class="chat-tabs"><b>GERAL</b><span>GUILDA</span><span>GRUPO</span><span>SISTEMA</span></div><div class="chat-preview"><p><b>[Sistema]</b> Bem-vindo à Taverna dos Sinos Mudos!</p>${list.slice(0,2).map(p=>`<p><b>[${esc(U(p.u).n)}]</b> ${fmt(p.t)}</p>`).join('')}</div><div class="hero-chat-actions"><button class="btn" data-a="go" data-v="messages">ABRIR CHAT</button><button class="btn ghost" data-a="go" data-v="tavern">CHAT MULTIPLAYER</button></div></section>
      <section class="hero-mission px"><h3>⚜ MISSÃO ATUAL</h3><b>O Chamado da Taverna</b><p>Fale com o Taverneiro e descubra mais sobre seu passado.</p><button class="btn" data-a="go" data-v="events">VER MISSÕES</button></section>
    </div>`;
  },
  profile() {
    const m = S.me, c = CLS[m.c];
    return `<div class="grid2"><section class="px panel"><div class="row" style="border:0"><img class="av" style="width:96px;height:96px" src="${IMG('sprites/' + c.img + '.png')}" alt="${m.c}"><div class="g"><h2>${esc(m.n)}</h2><div>${m.c} · Nível ${m.lv}</div>${bar(m.xp, need(m.lv))}<small>${m.xp} / ${need(m.lv)} XP</small></div></div>
<div class="row">${ic('i_coin', 28)}<div class="g">Ouro: <b style="color:var(--gl)">${m.gold}</b></div></div><p>${esc(m.bio)}</p>${btn('EDITAR PERFIL', 'go', 'settings')}</section>
${panel('CONQUISTAS', `<div class="ach">${ACH.map(a => `<div class="${(m.ach || []).includes(a[0]) ? '' : 'lock'}"><img src="${IMG('icons/' + a[0] + '.png')}" alt=""><br>${a[1]}</div>`).join('')}</div>`)}
${panel('INVENTÁRIO', m.inv.length ? `<div class="items">${m.inv.map((id, i) => `<div class="it"><img src="${IMG('icons/' + ITEM[id].ic + '.png')}" alt="">${ITEM[id].n}<br>${['potion', 'chest', 'star'].includes(id) ? btn('USAR', 'use', i, 'green') : '<small>Coleção</small>'}</div>`).join('')}</div>` : '<p class="dim">Vazio. Visite a Loja!</p>', 'wide')}</div>`;
  },
  classes() {
    return `<div class="grid2">${Object.entries(CLS).map(([n, c]) => `<section class="px panel cls"><img class="cp" src="${IMG('sprites/' + c.img + '.png')}" alt="${n}"><h2>${n}</h2><p>${c.d}</p>${['Força', 'Magia', 'Defesa'].map((s, i) => `<div class="stat"><span style="width:60px">${s}</span><i style="width:${c.s[i] * 10}px"></i> ${c.s[i]}</div>`).join('')}<div style="margin-top:10px">${S.me.c === n ? btn('CLASSE ATUAL', '', '', 'ghost', 'disabled') : btn('ESCOLHER', 'class', n, 'green')}</div></section>`).join('')}</div>`;
  },
  messages() {
    const t = S.ui.chat, u = U(t), msgs = S.dm[t] || [], others = (S.rankList || NPC).filter(x => x.id !== 'me' && !S.friends.includes(x.id));
    return `<div class="grid3" style="grid-template-columns:260px minmax(0,1fr)"><aside>${panel('AMIGOS', S.friends.map(U).map(f => `<div class="row">${av(f.a, 36)}<div class="g"><b>${f.n}</b><br><small>● ${stOf(f)}</small></div>${btn(ic('mail', 16), 'chat', f.id, t === f.id ? '' : 'ghost')}</div>`).join('') || '<p class="dim">Sem amigos ainda.</p>')}
${others.length ? panel('OUTROS VIAJANTES', others.map(o => `<div class="row">${av(o.a, 34)}<div class="g">${o.n}</div>${btn('+', 'addf', o.id, 'blue')}</div>`).join('')) : ''}</aside>
${u && S.friends.includes(t) ? panel('MENSAGENS COM ' + u.n.toUpperCase(), `<div class="thread" id="th">${msgs.map(m => `<div class="bub ${m.f === 'me' ? 'me' : ''}">${fmt(m.t)}<br><small>${ago(m.at)}</small></div>`).join('') || '<p class="dim">Nenhuma mensagem. Diga olá!</p>'}</div><div class="tools"><input id="dm" maxlength="300" placeholder="Escreva uma mensagem..." style="flex:1">${btn('ENVIAR', 'send', '', 'red')}</div><div style="margin-top:10px">${btn('REMOVER AMIGO', 'rmf', t, 'ghost')}</div>`) : panel('MENSAGENS', '<p class="dim">Escolha um amigo para conversar.</p>')}</div>`;
  },
  ranking() {
    return panel('RANKING DE JOGADORES', `<table><tr><th>#</th><th></th><th>Nome</th><th>Classe</th><th>Nível</th><th></th></tr>${ranked().map((u, i) => `<tr><td>${i + 1}</td><td>${av(u.a, 32)}</td><td>${esc(u.n)}</td><td>${u.c}</td><td>${u.lv}</td><td>${u.id === 'me' ? '<small>você</small>' : S.friends.includes(u.id) ? btn('MENSAGEM', 'chat', u.id, 'ghost') : btn('ADICIONAR', 'addf', u.id, 'blue')}</td></tr>`).join('')}</table>`);
  },
  shop() {
    const d = S.me.daily === today();
    return `<div class="col">${panel('LOJA DO REINO', `<div class="row" style="border:0">${ic('i_coin', 32)}<div class="g">Seu ouro: <b style="color:var(--gl)">${S.me.gold}</b></div>${btn('RECOMPENSA DIÁRIA (+40)', 'daily', '', 'green', d ? 'disabled' : '')}</div><div class="items">${SHOP.map(i => `<div class="it"><img src="${IMG('icons/' + i.ic + '.png')}" alt="">${i.n}<br><small>${i.d}</small><br><b style="color:var(--gl)">${i.p} ouro</b><br>${btn('COMPRAR', 'buy', i.id, 'blue', S.me.gold < i.p ? 'disabled' : '')}</div>`).join('')}</div>`)}
${panel('SEU INVENTÁRIO', S.me.inv.length ? `<div class="items">${S.me.inv.map((id, i) => `<div class="it"><img src="${IMG('icons/' + ITEM[id].ic + '.png')}" alt="">${ITEM[id].n}<br>${['potion', 'chest', 'star'].includes(id) ? btn('USAR', 'use', i, 'green') : '<small>Coleção</small>'}</div>`).join('')}</div>` : '<p class="dim">Vazio.</p>')}</div>`;
  },
  events() {
    return `<div class="grid2">${EVENTS.map(e => `<section class="px panel"><h2>${e.n}</h2><p>${e.d}</p><p>Recompensa: <b style="color:var(--gl)">${e.r}</b></p><p>⏳ <b data-end="${S.evEnd[e.id]}">${left(S.evEnd[e.id] - now())}</b></p>${S.me.ev.includes(e.id) ? btn('PARTICIPANDO ✔', '', '', 'ghost', 'disabled') : btn('PARTICIPAR', 'join', e.id, 'green')}</section>`).join('')}</div>
${panel('NOTIFICAÇÕES', S.notif.map(n => `<div class="row"><div class="g">${esc(n.t)}<br><small>${ago(n.at)}</small></div></div>`).join('') || '<p class="dim">Nada novo.</p>')}`;
  },
  settings() {
    const m = S.me;
    return panel('CONFIGURAÇÕES DE PERFIL', `<label>Nome<input id="s-n" maxlength="20" value="${esc(m.n)}"></label><label>Biografia<textarea id="s-b" maxlength="160">${esc(m.bio)}</textarea></label><p>Avatar</p><div class="avs">${[0, 1, 2, 3, 4].map(i => `<label><input type="radio" name="av" value="${i}" ${m.a === i ? 'checked' : ''}>${av(i, 60)}</label>`).join('')}</div>
<p><label><input type="checkbox" id="s-s" style="width:auto" ${S.snd ? 'checked' : ''}> Efeitos sonoros</label></p><div class="tools"><div>${btn('SALVAR', 'saveset', '', 'green')}</div>${btn(S.online ? 'SAIR DA CONTA' : 'APAGAR DADOS DE DEMONSTRAÇÃO', 'reset', '', 'red')}</div>`);
  }
};
const NAV = [['home', 'INÍCIO', 'home'], ['tavern', 'TAVERNA', 'people'], ['profile', 'PERFIL', 'guild'], ['classes', 'CLASSES', 'sword'], ['messages', 'MENSAGENS', 'mail'], ['ranking', 'RANKING', 'chart'], ['shop', 'LOJA', 'star'], ['events', 'EVENTOS', 'book'], ['settings', 'CONFIG', 'gear']];
const route = () => { const r = location.hash.slice(1); return PAGES[r] ? r : 'home'; };
function render() {
  const r = route(), m = S.me, un = S.notif.filter(n => !n.r).length;
  $('#nav').innerHTML = NAV.map(n => `<button data-a="go" data-v="${n[0]}" class="${n[0] === r ? 'on' : ''}">${ic(n[2])}${n[1]}</button>`).join('');
  $('#ucard').innerHTML = `${av(m.a, 48)}<div style="min-width:130px"><b>${esc(m.n)}</b><div>Nível ${m.lv}</div>${bar(m.xp, need(m.lv))}<small>${m.xp} / ${need(m.lv)} XP</small></div>
<div class="ustat"><small>Ouro</small><b>${m.gold}</b></div><div class="ustat"><small>Amigos</small><b>${S.friends.length}</b></div><div class="ustat"><small>Online</small><b>${S.onlineN != null ? S.onlineN : NPC.length}</b></div>
<button class="btn ghost" data-a="notif">${ic('bell_ui')}${un ? `<span class="badge">${un}</span>` : ''}</button>`;
  $('#notifs').className = S.ui.notif ? 'open' : '';
  $('#notifs').innerHTML = S.ui.notif ? panel('NOTIFICAÇÕES', (S.notif.map(n => `<div class="row"><div class="g">${esc(n.t)}<br><small>${ago(n.at)}</small></div></div>`).join('') || '<p class="dim">Nada novo.</p>') + btn('MARCAR TUDO COMO LIDO', 'readall', '', 'ghost')).replace('class="px panel ', 'class="px panel ') : '';
  $('#view').innerHTML = PAGES[r](); $('#view').style.display = r === 'tavern' ? 'none' : ''; if (typeof Game !== 'undefined') Game.show(r === 'tavern');
  const th = $('#th'); if (th) th.scrollTop = 1e5;
}
/* ações */
const A = {
  go(v) { location.hash = v; S.ui.notif = 0; render(); window.scrollTo(0, 0); },
  soon(v) { toast(v); },
  filter(v) { S.ui.f = S.ui.f === v ? '' : v; render(); },
  emo() { S.ui.emo = S.ui.emo ? 0 : 1; const t = $('#txt') ? $('#txt').value : ''; render(); if ($('#txt')) $('#txt').value = t; },
  ins(v) { const t = $('#txt'); t.value += `:${v}:`; t.focus(); },
  post() {
    const t = $('#txt').value.trim(); if (!t) return toast('Escreva algo antes de publicar');
    S.posts.unshift({ id: now(), u: 'me', t, at: now(), likes: 0, liked: false, cm: [] }); S.me.posts++;
    if (S.day.d !== today()) S.day = { d: today(), n: 0 };
    S.day.n++; beep(660);
    if (S.day.n <= 5) gain(15, 10); else { checkAch(); save(); toast('Publicado (XP só nos 5 primeiros do dia)'); }
    render();
  },
  like(v) { const p = S.posts.find(x => x.id == v); p.liked = !p.liked; p.likes += p.liked ? 1 : -1; if (p.liked) { S.me.likesGiven++; checkAch(); } beep(); save(); render(); },
  comment(v) { const i = $('#c' + v), t = i.value.trim(); if (!t) return; S.posts.find(x => x.id == v).cm.push({ u: 'me', t }); beep(); save(); render(); },
  class(v) { S.me.c = v; note('Você agora é ' + v); save(); toast('Classe alterada para ' + v); render(); },
  buy(v) { const i = ITEM[v]; if (S.me.gold < i.p) return toast('Ouro insuficiente'); S.me.gold -= i.p; S.me.inv.push(v); S.me.buys++; checkAch(); save(); beep(988); toast('Você comprou: ' + i.n); render(); },
  use(v) {
    const id = S.me.inv[v]; S.me.inv.splice(v, 1);
    if (id === 'potion') gain(20, 0, 'Você usou a poção: +20 XP'); else if (id === 'star') gain(50, 0, 'A estrela brilha: +50 XP');
    else if (id === 'chest') { const g = 50 + Math.floor(Math.random() * 150); gain(30, g, `O baú tinha ${g} de ouro e 30 XP!`); }
    beep(880); render();
  },
  daily() { if (S.me.daily === today()) return; S.me.daily = today(); gain(0, 40, 'Recompensa diária: +40 ouro'); beep(988); render(); },
  join(v) { const e = EVENTS.find(x => x.id === v); S.me.ev.push(v); if (e.item) S.me.inv.push(e.item); note('Você entrou no evento: ' + e.n); gain(e.x, e.g, 'Participação confirmada: ' + e.r); render(); },
  chat(v) { S.ui.chat = v; location.hash = 'messages'; render(); },
  addf(v) { if (!S.friends.includes(v)) S.friends.push(v); checkAch(); note(U(v).n + ' agora é seu amigo'); save(); toast('Amigo adicionado'); render(); },
  rmf(v) { S.friends = S.friends.filter(x => x !== v); S.ui.chat = S.friends[0] || ''; save(); render(); },
  send() {
    const i = $('#dm'), t = i.value.trim(), c = S.ui.chat; if (!t) return;
    (S.dm[c] = S.dm[c] || []).push({ f: 'me', t, at: now() }); beep(); save(); render();
    setTimeout(() => { const R = ['Que a névoa lhe seja leve!', 'Nos vemos na taverna!', 'Boa ideia, viajante.', 'Tragam velas, a cripta é escura.']; S.dm[c].push({ f: c, t: R[Math.floor(Math.random() * R.length)], at: now() }); save(); if (route() === 'messages' && S.ui.chat === c) render(); }, 1200);
  },
  notif() { S.ui.notif = S.ui.notif ? 0 : 1; render(); },
  readall() { S.notif.forEach(n => n.r = 1); S.ui.notif = 0; save(); render(); },
  saveset() { const m = S.me, n = $('#s-n').value.trim(); if (!n) return toast('Informe um nome'); m.n = n; m.bio = $('#s-b').value; const r = document.querySelector('input[name=av]:checked'); if (r) m.a = +r.value; S.snd = $('#s-s').checked; save(); toast('Perfil salvo'); render(); },
  reset() { if (!confirm('Apagar todos os dados de demonstração?')) return; localStorage.removeItem(KEY); location.reload(); }
};
document.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b && A[b.dataset.a]) A[b.dataset.a](b.dataset.v, b); });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'dm') A.send(); if (e.key === 'Enter' && e.target.id && e.target.id[0] === 'c' && /^c\d+$/.test(e.target.id)) A.comment(e.target.id.slice(1)); });
window.addEventListener('hashchange', render);
setInterval(() => document.querySelectorAll('[data-end]').forEach(s => s.textContent = left(+s.dataset.end - now())), 30000);
checkAch(); save(); render();
