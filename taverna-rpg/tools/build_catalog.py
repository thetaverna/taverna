#!/usr/bin/env python3
"""Gera items.js (site) e catalog/catalogo.sql (Supabase) a partir de catalog/items.json.
Uso:  python3 tools/build_catalog.py   (rode na pasta do projeto)
Para adicionar um item: coloque o PNG em assets/items/<icone>.png, acrescente um bloco em catalog/items.json
e rode este script. Depois cole catalog/catalogo.sql no SQL Editor do Supabase e envie items.js ao site."""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
items = json.load(open(os.path.join(root, "catalog", "items.json"), encoding="utf-8"))
SLOTS = {"head", "body", "legs", "feet", "cape", "weapon", "offhand", "neck", "ring", "consumable"}; RAR = {"comum", "raro", "épico", "lendário"}; ids = set()
for it in items:
    assert it["id"] not in ids, "id repetido: " + it["id"]; ids.add(it["id"])
    assert it["slot"] in SLOTS, it["id"] + ": categoria inválida"; assert it["rarity"] in RAR, it["id"] + ": raridade inválida"
    assert set(it["stats"]) <= {"atk", "def", "vit", "mana"} and all(isinstance(v, int) and 0 <= v <= 999 for v in it["stats"].values()), it["id"] + ": atributos inválidos"
    assert it["price"] >= 0, it["id"] + ": preço inválido"
    if it["icon"]: assert os.path.exists(os.path.join(root, "assets", "items", it["icon"] + ".png")), it["id"] + ": falta assets/items/" + it["icon"] + ".png"
js = {it["id"]: {"n": it["name"], "slot": it["slot"], "rarity": it["rarity"], "price": it["price"], "desc": it["desc"], "stats": {k: it["stats"].get(k, 0) for k in ("atk", "def", "vit", "mana")}, "icon": it["icon"], "look": it["look"], "starter": it["starter"]} for it in items}
open(os.path.join(root, "items.js"), "w", encoding="utf-8").write("'use strict';\n/* GERADO por tools/build_catalog.py a partir de catalog/items.json. Não edite à mão. */\nconst ITEMS = " + json.dumps(js, ensure_ascii=False, separators=(",", ":")) + ";\n")
q = lambda s: "'" + s.replace("'", "''") + "'"
sql = ["insert into public.items (id, name, slot, rarity, price, descr, look, starter, stats, icon) values (%s, %s, %s, %s, %d, %s, %s::jsonb, %s, %s::jsonb, %s) on conflict (id) do update set name = excluded.name, slot = excluded.slot, rarity = excluded.rarity, price = excluded.price, descr = excluded.descr, look = excluded.look, starter = excluded.starter, stats = excluded.stats, icon = excluded.icon;" % (q(it["id"]), q(it["name"]), q(it["slot"]), q(it["rarity"]), it["price"], q(it["desc"]), q(json.dumps(it["look"], separators=(",", ":"))), "true" if it["starter"] else "false", q(json.dumps({k: it["stats"].get(k, 0) for k in ("atk", "def", "vit", "mana")}, separators=(",", ":"))), q(it["icon"])) for it in items]
open(os.path.join(root, "catalog", "catalogo.sql"), "w", encoding="utf-8").write("\n".join(sql) + "\n")
print(len(items), "itens gerados: items.js e catalog/catalogo.sql")
