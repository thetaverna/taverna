# A Taverna dos Sinos Mudos

RPG social medieval gótico em HTML, CSS e JavaScript, com modo demonstração local e integração opcional com Supabase.

## Executar

- Abra `index.html` num servidor estático (recomendado) ou publique a pasta na raiz do GitHub Pages.
- Para usar contas, persistência online e chat em tempo real, configure o projeto Supabase correspondente e confira `api.js` e `realtime.js`.
- O modo demonstração salva os dados no `localStorage` do navegador; esses dados não são sincronizados com outros dispositivos.

## Estrutura

- `index.html`, `style.css`: estrutura e aparência.
- `script.js`: navegação, feed social e modo demonstração.
- `game.js`, `realtime.js`: cenário 2D, controles e presença/chat em tempo real.
- `character.js`, `items.js`: aparência, inventário e catálogo de equipamentos.
- `api.js`: autenticação e chamadas ao Supabase.
- `catalog/`: dados-fonte e SQL do catálogo de itens.
- `assets/`: arte, ícones, sprites e itens.

## Estado conhecido nesta versão

- O cenário jogável e a interação com NPCs existem; a Praça e os quartos ainda são áreas futuras.
- O catálogo de equipamento e a pré-visualização de aparência existem. A compra dos itens do catálogo de equipamentos ainda não está habilitada e os consumíveis desse catálogo ainda não têm ação de uso.
- Os atributos são exibidos, mas ainda não há um sistema de combate que os use.
- O feed social tem controles de foto/link que indicam que a função está por vir.

## Segurança e publicação

- Nunca coloque uma `service_role` key do Supabase no navegador. O front-end deve usar somente uma chave publicável/anon e as políticas RLS devem restringir os dados por usuário.
- Não execute SQL de atualização no projeto de produção sem revisar as alterações e ter backup.
- Teste login, criação de conta, chat, denúncias, bloqueios e funções administrativas com contas de teste antes de publicar.

## Verificação local

Os arquivos JavaScript podem ser verificados com `node --check script.js` e o mesmo comando para cada arquivo `.js`.

## Banco de dados (Supabase)

Rode os arquivos da pasta `sql/` no SQL Editor, **nesta ordem** (todos podem ser repetidos sem problema; o v3 é opcional e só serve ao Vestiário antigo):
`supabase_compacto.sql` (tabelas básicas), `v2`, `v4`, `v5`, `v6`, `v7`, `v8`, `v9` e `v10`. O `v10` já inclui o catálogo de itens (`catalog/catalogo.sql`).
Cada comando fica em uma linha, para colar no editor do celular. Faça um backup antes de rodar em produção.
