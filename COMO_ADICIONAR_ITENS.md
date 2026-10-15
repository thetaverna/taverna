# Como adicionar um item novo

Os itens ficam em **três lugares que andam juntos**. Você só edita o primeiro; o resto é gerado.

| O quê | Onde | Quem mexe |
|---|---|---|
| Imagem do item | `assets/items/<icone>.png` (quadrada, de 48 a 64 px, fundo transparente) | você |
| Dados do item | `catalog/items.json` | você |
| Lista do site | `items.js` | gerada por `tools/build_catalog.py` |
| Lista do servidor | `catalog/catalogo.sql` | gerada por `tools/build_catalog.py` |

## Passo a passo
1. Coloque o PNG em `assets/items/`. Exemplo: `assets/items/espada_sombria.png`.
2. Abra `catalog/items.json` e copie um bloco existente. Preencha:
   - `id`: código único, só letras minúsculas e `_` (ex.: `espada_sombria`). **Nunca mude o id depois que alguém tiver o item.**
   - `name`, `desc`: nome e descrição que aparecem no jogo.
   - `slot`: `head`, `body`, `legs`, `feet`, `cape`, `weapon`, `offhand`, `neck`, `ring` ou `consumable`.
   - `rarity`: `comum`, `raro`, `épico` ou `lendário`.
   - `price`: preço em ouro (a compra ainda não está liberada; o preço só aparece).
   - `stats`: `atk` (ataque), `def` (defesa), `vit` (vitalidade), `mana`. Números inteiros de 0 a 999.
   - `icon`: nome do PNG sem `.png` (use `""` se não tiver imagem).
   - `look`: como o item aparece no boneco: `t` (tipo: `sword`, `axe`, `spear`, `bow`, `staff`, `shield`, `helm`, `hood`, `hat`, `crown`, `plate`, `leather`, `robe`, `tunic`, `cape`, `boots`, `pants`, `amulet`, `ring`) e as cores `c1`, `c2`.
   - `starter`: `true` só para os itens do kit de boas-vindas.
3. No computador (ou em um Termux no celular), rode na pasta do projeto: `python3 tools/build_catalog.py`. O script confere erros (id repetido, imagem faltando, atributo inválido) e gera `items.js` e `catalog/catalogo.sql`.
4. Cole **todo** o `catalog/catalogo.sql` no SQL Editor do Supabase e toque em Run. Pode rodar de novo quantas vezes quiser: ele só cria o que falta e atualiza o resto.
5. Envie ao GitHub o `items.js` e a nova imagem em `assets/items/`.

## Regras importantes
- O servidor só deixa equipar itens que a pessoa possui, e calcula os atributos sozinho: o navegador não decide nada.
- Mudar `stats` ou `price` de um item vale para todo mundo na hora em que você roda o SQL.
- Item sem rodar o SQL no Supabase aparece no site, mas o servidor recusa equipar.
