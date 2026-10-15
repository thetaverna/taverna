'use strict';
/* ETAPAS 3 e 4a — personagem persistente, equipamentos com ícones, atributos e raridade.
   O catálogo (ITEMS) vem de items.js. Online, o servidor valida tudo e calcula os atributos;
   no modo demonstração os mesmos cálculos rodam no navegador. */
const SLOTS = [['head', 'Cabeça', '🪖'], ['body', 'Roupa / armadura', '👕'], ['legs', 'Calça', '👖'], ['feet', 'Botas', '🥾'], ['cape', 'Capa', '🧣'], ['weapon', 'Arma', '⚔️'], ['offhand', 'Escudo', '🛡️'], ['neck', 'Colar', '📿'], ['ring', 'Anel', '💍'], ['consumable', 'Poções', '🧪']];
const SKINS = ['#f0c8a0', '#e0b48a', '#c98f63', '#8d5a3b', '#5a3a28'], HAIRC = ['#1c1824', '#4a3020', '#8a5a2a', '#c9a24a', '#d8d8e0', '#a8421e'], HAIRN = ['Curto', 'Médio', 'Longo', 'Careca', 'Espetado', 'Trança'];
const RAR = { comum: '#cfd6e6', raro: '#6fb1ff', 'épico': '#c58cff', 'lendário': '#f3d178' };
const ATT = [['atk', 'Ataque', '⚔️'], ['def', 'Defesa', '🛡️'], ['vit', 'Vitalidade', '❤️'], ['mana', 'Mana', '🔷']];
const BASEC = { Guerreiro: [8, 6, 120, 10], Mago: [3, 3, 80, 60], Ladino: [6, 3, 90, 20], Arqueiro: [7, 3, 90, 20], 'Clérigo': [3, 5, 100, 50] }, BASED = [4, 4, 100, 20];
/* mesma fórmula da função char_stats do banco: atributos = base(classe, nível) + soma dos itens equipados que o jogador possui */
function calcStats(equip, inv, lv, cls) {
  const b = BASEC[cls] || BASED, L = Math.max(1, +lv || 1), base = { atk: b[0] + (L - 1), def: b[1] + Math.floor((L - 1) / 2), vit: b[2] + (L - 1) * 10, mana: b[3] + (L - 1) * 2 }, bonus = { atk: 0, def: 0, vit: 0, mana: 0 };
  Object.values(equip || {}).forEach(id => { const it = ITEMS[id]; if (it && it.slot !== 'consumable' && (inv || []).includes(id)) ATT.forEach(a => { bonus[a[0]] += it.stats[a[0]] || 0; }); });
  const total = {}; ATT.forEach(a => { total[a[0]] = base[a[0]] + bonus[a[0]]; }); return { base, bonus, total };
}
const Char = (() => {
  let CH = null, who = '', view = null, dir = 'down', flt = 'all', mode = 'inv', loading = false; const KEY = 'taverna_char';
  const empty = () => ({ skin: SKINS[1], hair: 0, hair_color: HAIRC[1], equip: {}, inv: [], starter: false });
  const norm = r => Object.assign(empty(), r || {}, { equip: (r && r.equip) || {}, inv: (r && r.inv) || [] });
  function toLook(c) {
    const E = c.equip || {}, it = s => ITEMS[E[s]] ? ITEMS[E[s]].look : null;
    return { skin: c.skin || SKINS[1], hair: { s: +c.hair || 0, c: c.hair_color || HAIRC[1] }, body: it('body'), legs: it('legs'), feet: it('feet'), cape: it('cape'), head: it('head'), weapon: it('weapon'), offhand: it('offhand'), neck: it('neck'), ring: it('ring') };
  }
  const look = () => CH ? toLook(CH) : null;
  const stats = () => S.online && CH && CH.stats && CH.stats.total ? CH.stats : calcStats(CH.equip, CH.inv, S.me.lv, S.me.c);
  async function load(force) {
    const key = S.online ? 'on:' + S.uid : 'off'; if (loading || (CH && who === key && !force)) return; loading = true;
    try { if (S.online) CH = norm(await rpc('my_character')); else { try { CH = norm(JSON.parse(localStorage.getItem(KEY))); } catch (e) { CH = empty(); } } who = key; } catch (e) { fail(e); }
    loading = false; if (['character', 'profile'].includes(route())) render();
  }
  async function mut(online, local) {
    try { if (S.online) CH = norm(await online()); else { local(); localStorage.setItem(KEY, JSON.stringify(CH)); } if (typeof RT !== 'undefined') RT.lookChanged(); } catch (e) { fail(e); } render();
  }
  const equip = id => { const it = ITEMS[id]; if (!it || it.slot === 'consumable') return toast('Este item não é equipável'); view = null; mut(() => rpc('equip_item', { iid: id }), () => { if (!CH.inv.includes(id)) throw new Error('Você não possui este item'); CH.equip[it.slot] = id; }); };
  const unequip = slot => mut(() => rpc('unequip_slot', { slot }), () => { delete CH.equip[slot]; });
  function appear(k, v) {
    const n = { skin: CH.skin, hair: CH.hair, hair_color: CH.hair_color }; if (k === 'skin' && SKINS.includes(v)) n.skin = v; else if (k === 'hair' && +v >= 0 && +v <= 5) n.hair = +v; else if (k === 'hc' && HAIRC.includes(v)) n.hair_color = v; else return;
    mut(() => rpc('set_appearance', n), () => Object.assign(CH, n));
  }
  const starter = () => mut(() => rpc('claim_starter'), () => { if (CH.starter) throw new Error('Kit já recebido'); Object.keys(ITEMS).filter(k => ITEMS[k].starter).forEach(k => { if (!CH.inv.includes(k)) CH.inv.push(k); }); CH.starter = true; });
  const sl = s => SLOTS.find(x => x[0] === s) || SLOTS[0];
  const icon = (i, cls) => i.icon ? `<img class="${cls || 'ico'}" loading="lazy" decoding="async" alt="" src="${IMG('items/' + i.icon + '.png')}">` : `<div class="sw" style="background:linear-gradient(135deg,${(i.look && i.look.c1) || '#444'} 50%,${(i.look && i.look.c2) || (i.look && i.look.c1) || '#444'} 50%)">${sl(i.slot)[2]}</div>`;
  const chips = i => ATT.filter(a => i.stats[a[0]]).map(a => `<span class="chip">${a[2]}+${i.stats[a[0]]}</span>`).join('') || '<span class="chip">sem bônus</span>';
  function statsRows(cur, prev) {
    return `<div class="stt">${ATT.map(a => { const k = a[0], dl = prev ? prev.total[k] - cur.total[k] : 0; return `<span>${a[2]} ${a[1]}</span><small>base ${cur.base[k]} + equipamento ${cur.bonus[k]}</small><b>${prev ? prev.total[k] : cur.total[k]}${dl ? ` <span class="${dl > 0 ? 'd' : 'n'}">(${dl > 0 ? '+' : ''}${dl})</span>` : ''}</b>`; }).join('')}</div>`;
  }
  function card(id) {
    const i = ITEMS[id], own = CH.inv.includes(id), eq = CH.equip[i.slot] === id, s = sl(i.slot), cons = i.slot === 'consumable';
    return `<div class="it ci" style="border-color:${RAR[i.rarity]}">${icon(i)}<b style="color:${RAR[i.rarity]}">${esc(i.n)}</b><br><small>${i.rarity} · ${s[1]}</small><div>${chips(i)}</div><small>${esc(i.desc)}</small><div class="lockp">🪙 ${i.price}${own ? '' : ' · 🔒 compra indisponível'}</div>
<div class="tools" style="justify-content:center;margin-top:6px">${cons ? '<small class="dim">Consumível (uso em breve)</small>' : btn('VER', 'cview', id, 'ghost') + (own ? (eq ? btn('REMOVER', 'cunequip', i.slot, 'blue') : btn('EQUIPAR', 'cequip', id, 'green')) : '')}</div></div>`;
  }
  function page() {
    if (!CH) { load(); return panel('PERSONAGEM', '<p class="dim">Carregando seu personagem…</p>'); }
    const cur = stats(), v = view && ITEMS[view], prevEq = v ? Object.assign({}, CH.equip, { [v.slot]: view }) : null, prev = v ? calcStats(prevEq, CH.inv.concat([view]), S.me.lv, S.me.c) : null;
    const ids = Object.keys(ITEMS).filter(id => (mode === 'cat' ? !CH.inv.includes(id) : CH.inv.includes(id)) && (flt === 'all' || ITEMS[id].slot === flt));
    const sw = (a, arr, c0, f) => arr.map(c => `<button class="swt ${c === c0 ? 'on' : ''}" data-a="${a}" data-v="${c}" style="background:${c}" aria-label="${f}"></button>`).join('');
    const eqList = SLOTS.filter(s => s[0] !== 'consumable').map(s => { const id = CH.equip[s[0]], i = ITEMS[id]; return `<div class="row">${i ? icon(i, 'ico sm') : `<span>${s[2]}</span>`}<div class="g"><small>${s[1]}</small><br>${i ? `<b style="color:${RAR[i.rarity]}">${esc(i.n)}</b> ${chips(i)}` : '<span class="dim">vazio</span>'}</div>${i ? btn('REMOVER', 'cunequip', s[0], 'ghost') : ''}</div>`; }).join('');
    return `<div class="grid2"><section class="px panel"><h3>✦ SEU PERSONAGEM</h3><canvas id="cprev" width="160" height="180"></canvas>
<div class="tools" style="justify-content:center">${['up', 'left', 'down', 'right'].map(d => btn({ up: '▲', left: '◀', down: '▼', right: '▶' }[d], 'cdir', d, dir === d ? '' : 'ghost')).join('')}</div>
${v ? `<p>Pré-visualizando: <b style="color:${RAR[v.rarity]}">${esc(v.n)}</b>${CH.inv.includes(view) ? '' : ' <small class="dim">(você ainda não possui)</small>'}</p><div class="tools"><div>${CH.inv.includes(view) ? btn('EQUIPAR', 'cequip', view, 'green') : ''}${btn('CANCELAR', 'ccancel', '', 'ghost')}</div></div>` : ''}
<p><small>Pele</small><br>${sw('cskin', SKINS, CH.skin, 'Pele')}</p><p><small>Cabelo</small><br>${HAIRN.map((n, i) => btn(n, 'chair', i, CH.hair === i ? '' : 'ghost')).join('')}</p><p><small>Cor do cabelo</small><br>${sw('chc', HAIRC, CH.hair_color, 'Cor')}</p></section>
<div class="col">${panel('ATRIBUTOS' + (prev ? ' (com o item)' : ''), statsRows(cur, prev) + `<small class="dim">Base: ${esc(S.me.c)}, nível ${S.me.lv}.</small>`)}${panel('EQUIPADO', eqList)}</div></div>
${panel('ITENS', `<div class="tabs2">${btn('Meu inventário (' + CH.inv.length + ')', 'cmode', 'inv', mode === 'inv' ? '' : 'ghost')}${btn('Catálogo (' + Object.keys(ITEMS).length + ')', 'cmode', 'cat', mode === 'cat' ? '' : 'ghost')}</div>
<div class="tabs2">${[['all', 'Todos']].concat(SLOTS.map(s => [s[0], s[1]])).map(f => btn(f[1], 'cflt', f[0], flt === f[0] ? '' : 'ghost')).join('')}</div>
${mode === 'cat' ? '<p class="lockp">Compra de itens ainda indisponível: você pode ver o catálogo e pré-visualizar no seu personagem.</p>' : ''}
${mode === 'inv' && !CH.inv.length ? `<p>Seu inventário está vazio.</p>${btn(ic('i_chest') + ' RECEBER KIT DE BOAS-VINDAS', 'cstarter', '', 'green')}` : ''}
<div class="items" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${ids.map(card).join('') || '<p class="dim">Nenhum item nesta categoria.</p>'}</div>`)}`;
  }
  function paint() {
    const cv = document.getElementById('cprev'); if (!cv || !CH) return; const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#13101c'; c.fillRect(0, 0, cv.width, cv.height); c.setTransform(6, 0, 0, 6, 0, 0); c.imageSmoothingEnabled = false;
    const it = view && ITEMS[view]; Game.drawChar(c, cv.width / 12, 28, dir, 0, it && it.slot !== 'consumable' ? toLook(Object.assign({}, CH, { equip: Object.assign({}, CH.equip, { [it.slot]: view }) })) : toLook(CH));
  }
  Object.assign(A, { cequip: v => equip(v), cunequip: v => unequip(v), cview: v => { view = v; render(); }, ccancel: () => { view = null; render(); }, cflt: v => { flt = v; render(); }, cmode: v => { mode = v; flt = 'all'; render(); }, cdir: v => { dir = v; paint(); }, cskin: v => appear('skin', v), chair: v => appear('hair', v), chc: v => appear('hc', v), cstarter: () => starter() });
  PAGES.character = page; if (!NAV.some(n => n[0] === 'character')) NAV.splice(2, 0, ['character', 'PERSONAGEM', 'guild']);
  /* Perfil: mostra os atributos reais e o equipamento do mesmo personagem */
  const pf0 = PAGES.profile; PAGES.profile = () => pf0() + (CH ? panel('ATRIBUTOS DO PERSONAGEM', statsRows(stats()) + `<div style="margin-top:10px">${Object.values(CH.equip).filter(id => ITEMS[id]).map(id => `<span title="${esc(ITEMS[id].n)}">${icon(ITEMS[id], 'ico sm')}</span>`).join('')}</div><div style="margin-top:10px">${btn('EDITAR PERSONAGEM', 'go', 'character')}</div>`) : '');
  const r0 = render; render = () => { r0(); if (route() === 'character') paint(); else if (route() === 'profile' && !CH) load(); };
  const s1 = Game.show; Game.show = v => { s1(v); if (v) load(); };
  return { load, look, toLook, paint, stats: () => CH ? stats() : null };
})();
