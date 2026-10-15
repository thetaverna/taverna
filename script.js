'use strict';
/* Taverna dos Sinos Mudos — Hub UI (layout da referência) */

const $ = (s, e = document) => e.querySelector(s);
const $$ = (s, e = document) => [...e.querySelectorAll(s)];
const KEY = 'taverna_hub_v1';

// ---------- State ----------
const defaultState = () => ({
  name: 'zarturzin_rpg',
  level: 1,
  class: 'Guerreiro',
  guild: 'Nenhuma',
  gold: 0,
  hp: 100, hpMax: 100,
  energy: 100, energyMax: 100,
  stats: { atk: 12, def: 8, spd: 6 },
  attrs: { str: 10, agi: 8, vit: 10, int: 5, luk: 5 },
  face: 1,
  skin: '#f5d0b0',
  inventory: [],   // { id, qty }
  equipped: {},    // slot -> item id
  invCat: 'all'
});

let state;
try {
  state = { ...defaultState(), ...JSON.parse(localStorage.getItem(KEY) || '{}') };
} catch {
  state = defaultState();
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}

// ---------- Catalog ----------
let CATALOG = [];
let CATALOG_MAP = {};

async function loadCatalog() {
  try {
    const res = await fetch('catalog/items.json');
    CATALOG = await res.json();
    CATALOG_MAP = Object.fromEntries(CATALOG.map(i => [i.id, i]));
  } catch (e) {
    console.warn('Catálogo não carregou, usando fallback', e);
    CATALOG = [];
  }
  // Seed starter inventory if empty
  if (!state.inventory.length) {
    const starters = CATALOG.filter(i => i.starter).slice(0, 8);
    state.inventory = starters.map(i => ({ id: i.id, qty: 1 }));
    // also some potions
    const pots = CATALOG.filter(i => i.slot === 'consumable' || (i.icon && i.icon.includes('pocao'))).slice(0, 4);
    pots.forEach(p => state.inventory.push({ id: p.id, qty: 3 }));
    save();
  }
}

// ---------- UI helpers ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._tm);
  toast._tm = setTimeout(() => t.classList.remove('show'), 2200);
}

function iconPath(item) {
  if (!item) return '';
  const name = item.icon || item.id;
  return `assets/items/${name}.png`;
}

// ---------- Render character panel ----------
function renderCharacter() {
  $('#charName').textContent = state.name;
  $('#userName').textContent = state.name;
  $('#charLevel').textContent = state.level;
  $('#charClass').textContent = state.class;
  $('#charGuild').textContent = state.guild;
  $('#hpVal').textContent = `${state.hp}/${state.hpMax}`;
  $('#energyVal').textContent = `${state.energy}/${state.energyMax}`;
  $('#hpBar').style.width = `${(state.hp / state.hpMax) * 100}%`;
  $('#energyBar').style.width = `${(state.energy / state.energyMax) * 100}%`;
  $('#statAtk').textContent = state.stats.atk;
  $('#statDef').textContent = state.stats.def;
  $('#statSpd').textContent = state.stats.spd;
  $('#attrStr').textContent = state.attrs.str;
  $('#attrAgi').textContent = state.attrs.agi;
  $('#attrVit').textContent = state.attrs.vit;
  $('#attrInt').textContent = state.attrs.int;
  $('#attrLuk').textContent = state.attrs.luk;
  $('#goldAmount').textContent = state.gold;

  const faceSrc = `assets/sprites/avatar${state.face}.png`;
  $('#userAvatar').src = faceSrc;
  $('#charPortrait').src = faceSrc;

  // Full body class sprite for scene + paperdoll
  const classMap = {
    Guerreiro: 'guerreiro',
    Mago: 'mago',
    Ladino: 'ladino',
    Arqueiro: 'arqueiro',
    Clérigo: 'clerigo'
  };
  const spr = `assets/sprites/${classMap[state.class] || 'guerreiro'}.png`;
  $('#playerSprite').src = spr;
  $('#dollSprite').src = spr;
}

// ---------- Inventory ----------
function renderInventory() {
  const grid = $('#invGrid');
  grid.innerHTML = '';

  let items = state.inventory.map(inv => ({
    ...inv,
    data: CATALOG_MAP[inv.id]
  })).filter(x => x.data);

  if (state.invCat !== 'all') {
    items = items.filter(x => {
      const slot = x.data.slot || '';
      if (state.invCat === 'weapon') return slot === 'weapon';
      if (state.invCat === 'armor') return ['armor', 'helmet', 'boots', 'gloves', 'cape', 'offhand'].includes(slot);
      if (state.invCat === 'accessory') return ['ring', 'necklace', 'accessory'].includes(slot) || slot.includes('anel') || slot.includes('colar');
      if (state.invCat === 'consumable') return slot === 'consumable' || (x.data.icon && x.data.icon.includes('pocao'));
      return true;
    });
  }

  // Fill up to 20 slots
  const totalSlots = Math.max(20, Math.ceil(items.length / 5) * 5);
  for (let i = 0; i < totalSlots; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    if (i < items.length) {
      const it = items[i];
      const rarity = (it.data.rarity || 'comum').toLowerCase();
      if (rarity !== 'comum') slot.classList.add('r-' + rarity);
      const img = document.createElement('img');
      img.src = iconPath(it.data);
      img.alt = it.data.name;
      img.onerror = () => { img.style.display = 'none'; };
      slot.appendChild(img);
      if (it.qty > 1) {
        const q = document.createElement('span');
        q.className = 'qty';
        q.textContent = it.qty;
        slot.appendChild(q);
      }
      slot.dataset.id = it.id;
      slot.title = it.data.name;
      slot.addEventListener('click', () => onItemClick(it));
      slot.addEventListener('mouseenter', e => showTooltip(e, it.data));
      slot.addEventListener('mouseleave', hideTooltip);
    } else {
      slot.classList.add('empty');
    }
    grid.appendChild(slot);
  }
}

function onItemClick(it) {
  const d = it.data;
  if (!d) return;
  // Equip if has slot
  const equipSlots = ['weapon', 'armor', 'helmet', 'boots', 'gloves', 'cape', 'offhand', 'ring', 'necklace'];
  if (equipSlots.includes(d.slot) || d.slot === 'ring1' || d.slot === 'ring2') {
    let target = d.slot;
    if (d.slot === 'ring') target = state.equipped.ring1 ? 'ring2' : 'ring1';
    state.equipped[target] = d.id;
    save();
    renderEquipment();
    toast(`Equipou: ${d.name}`);
  } else {
    toast(d.name);
  }
}

function renderEquipment() {
  $$('.eq-slot').forEach(el => {
    const slot = el.dataset.slot;
    el.innerHTML = '';
    const id = state.equipped[slot];
    if (id && CATALOG_MAP[id]) {
      const img = document.createElement('img');
      img.src = iconPath(CATALOG_MAP[id]);
      img.alt = CATALOG_MAP[id].name;
      img.onerror = () => { img.remove(); };
      el.appendChild(img);
      el.title = CATALOG_MAP[id].name;
    } else {
      el.title = el.getAttribute('title') || slot;
    }
  });
}

// ---------- Tooltip ----------
function showTooltip(e, item) {
  const tip = $('#tooltip');
  const rarity = (item.rarity || 'comum').toLowerCase();
  const colors = { comum: '#9e9e9e', raro: '#4a9eff', epico: '#b44aff', lendario: '#ffb400' };
  tip.innerHTML = `
    <div class="tt-name">${item.name}</div>
    <div class="tt-rarity" style="color:${colors[rarity] || '#9e9e9e'}">${rarity.toUpperCase()}</div>
    <div class="tt-desc">${item.desc || ''}</div>
  `;
  tip.hidden = false;
  const x = e.clientX + 12;
  const y = e.clientY + 12;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}
function hideTooltip() {
  $('#tooltip').hidden = true;
}

// ---------- Chat ----------
function addChatLine(text, type = 'global', who = null) {
  const log = $('#chatLog');
  const div = document.createElement('div');
  div.className = `chat-line ${type}`;
  if (type === 'system') {
    div.textContent = text;
  } else {
    div.innerHTML = `<span class="ch-tag">[Global]</span> <b>${who || state.name}</b>: ${escapeHtml(text)}`;
  }
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function escapeHtml(t) {
  return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function sendChat() {
  const input = $('#chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  addChatLine(msg, 'global', state.name);
  input.value = '';
  // Hook for realtime if available
  if (window.Realtime && typeof Realtime.sendChat === 'function') {
    try { Realtime.sendChat(msg); } catch {}
  }
}

// ---------- Customization ----------
function bindCustomization() {
  $$('.face-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.face-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.face = +btn.dataset.face;
      save();
      renderCharacter();
      toast('Rosto alterado');
    });
  });
  $$('.skin-swatch').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.skin-swatch').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.skin = btn.dataset.skin;
      save();
      toast('Tom de pele alterado');
    });
  });
  // restore active
  const faceBtn = $(`.face-opt[data-face="${state.face}"]`);
  if (faceBtn) {
    $$('.face-opt').forEach(b => b.classList.remove('active'));
    faceBtn.classList.add('active');
  }
  const skinBtn = $(`.skin-swatch[data-skin="${state.skin}"]`);
  if (skinBtn) {
    $$('.skin-swatch').forEach(b => b.classList.remove('active'));
    skinBtn.classList.add('active');
  }
}

// ---------- Nav & tabs ----------
function bindNav() {
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      if (view === 'inicio') {
        toast('Você está na Taverna');
      } else {
        toast(`Área "${btn.textContent.trim()}" em breve`);
      }
    });
  });

  $$('.ltab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.ltab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  $$('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.invCat = btn.dataset.cat;
      renderInventory();
    });
  });

  $('#chatSend').addEventListener('click', sendChat);
  $('#chatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
  });

  $('#btnOrganize').addEventListener('click', () => {
    state.inventory.sort((a, b) => (a.id > b.id ? 1 : -1));
    save();
    renderInventory();
    toast('Inventário organizado');
  });

  // NPCs
  $('#npcTaverneiro')?.addEventListener('click', () => {
    toast('Taverneiro: "Há muito a descobrir, aventureiro..."');
    addChatLine('[Taverneiro] Fale comigo quando estiver pronto para a próxima missão.', 'system');
  });
  $('#npcMensageiro')?.addEventListener('click', () => {
    toast('Mensageiro: "Tenho cartas para entregar!"');
  });

  // Skills
  $$('.skill-slot').forEach(btn => {
    btn.addEventListener('click', () => {
      toast(`Habilidade ${btn.dataset.skill} (em breve)`);
    });
  });
}

// ---------- Init ----------
async function init() {
  await loadCatalog();
  renderCharacter();
  renderInventory();
  renderEquipment();
  bindCustomization();
  bindNav();

  // Try to sync name from old demo if present
  try {
    const old = JSON.parse(localStorage.getItem('taverna_demo_v1') || 'null');
    if (old?.me?.n && state.name === 'zarturzin_rpg') {
      state.name = old.me.n;
      state.class = old.me.c || state.class;
      state.level = old.me.lv || 1;
      state.gold = old.me.gold || 0;
      save();
      renderCharacter();
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', init);
