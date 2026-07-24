# CONTEXTO DO PROJETO - GSTec Cashflow

Ultima atualizacao deste contexto: 2026-07-24

## Objetivo

O GSTec Cashflow e um app de controle financeiro pessoal, inicialmente para uso proprio e depois publico. Ele deve funcionar em computador e celular, com cadastro/login de usuario e possibilidade futura de autenticar pelo Google/Firebase.

O foco atual e validar o fluxo completo no navegador usando banco local por usuario.

## Repositorio

Repositorio GitHub:

https://github.com/Mailtonsantos/GSTech-Cashflow.git

Pasta principal usada durante o desenvolvimento:

`X:\GSTech\GSTech_Inforcred`

Em outra maquina, clonar com:

```bat
cd C:\App\GSTech
git clone https://github.com/Mailtonsantos/GSTech-Cashflow.git
cd GSTech-Cashflow
```

## Como rodar

Na pasta do projeto:

```bat
Iniciar-GSTec-Cashflow.bat
```

Enderecos:

- Computador local: `http://127.0.0.1:5173/index.html`
- Celular na mesma rede: usar o IP da maquina, por exemplo `http://10.6.0.12:5173/index.html`

Se o celular nao acessar, executar como administrador:

```bat
Liberar-Firewall-GSTec-Cashflow.bat
```

Observacao: `127.0.0.1` no celular aponta para o proprio celular, nao para o computador.

## Stack atual

- Frontend atual principal: HTML, CSS e JavaScript puro em `index.html`, `src/app.js` e `src/styles.css`.
- Servidor local: `server.js`, Node HTTP simples, sem cache.
- Banco local: IndexedDB por usuario.
- Backup local: outro banco IndexedDB separado.
- Existem arquivos React/TypeScript em `src/frontend`, mas a tela ativa servida em `index.html` hoje usa `src/app.js`.

## Estrutura importante

- `index.html`: entrada atual da aplicacao.
- `server.js`: servidor local, escutando em `0.0.0.0` para permitir acesso pela rede local.
- `src/app.js`: UI, eventos, fluxo de telas, filtros e acoes.
- `src/styles.css`: layout responsivo e visual.
- `src/services/localDatabase.js`: IndexedDB, stores e versao do banco.
- `src/repositories/financeRepository.js`: camada de dados/regras de negocio.
- `src/services/backupService.js`: criacao, listagem, exportacao, importacao e restauracao de backups.
- `diagnostico.html`: pagina auxiliar para diagnostico local.
- `Iniciar-GSTec-Cashflow.bat`: inicia o servidor local.
- `Liberar-Firewall-GSTec-Cashflow.bat`: libera a porta 5173 no Firewall do Windows.

## Banco local

O banco IndexedDB e criado por usuario:

`gstec_cashflow_<usuario>`

Stores principais:

- `usuarios`
- `usuarios_dados_complementares`
- `bandeiras_cartao`
- `categorias_movimentacao`
- `formas_pagamento`
- `contas_bancarias`
- `cartoes_credito`
- `pagamentos_cartao`
- `rendas`
- `movimentacoes`

Banco separado para backups:

`gstec_cashflow_backups`

## Como transportar dados reais para outra maquina

O codigo vai pelo GitHub, mas os dados financeiros ficam no IndexedDB do navegador. Para levar os dados:

1. Na maquina antiga, abrir o sistema.
2. Ir em `Configuracoes > Backup`.
3. Clicar em `Criar backup agora`.
4. Clicar em `Exportar ultimo backup`.
5. Levar o JSON para a outra maquina.
6. Na maquina nova, abrir o sistema.
7. Ir em `Configuracoes > Backup`.
8. Usar `Importar backup JSON`.

## Regras de negocio ja implementadas

### Usuarios

- Login/cadastro local demonstrativo.
- Login Google ainda e demo/local, nao Firebase real.
- Ao criar usuario, o sistema cria estrutura inicial com dados padrao.

### Contas

- Cadastro, edicao e exclusao logica.
- Campos:
  - nome
  - banco
  - agencia
  - conta
  - digito
  - tipo
  - saldo
  - limite/cheque especial
  - observacoes

### Cartoes

- Cadastro, edicao e exclusao logica.
- Campos:
  - nome
  - bandeira
  - tipo: credito/debito/credito-debito
  - status: ativo/bloqueado
  - numero mascarado
  - validade
  - limite total
  - dia de fechamento
  - dia de vencimento
  - observacoes

### Rendas

- Cadastro, edicao e exclusao logica.
- Campos:
  - origem/descricao
  - tipo: CLT/PF/Informal/Outros
  - empresa de origem
  - valor mensal
  - data de recebimento
  - recorrente
  - observacoes

### Categorias, bandeiras e formas de pagamento

- Tela `Configuracoes` organizada em abas:
  - Categorias
  - Bandeiras
  - Forma de pagamento
  - Backup
- Formas de pagamento possuem comportamento:
  - `conta`
  - `cartao`

### Movimentacoes

- Cadastro, edicao e exclusao logica.
- Campos:
  - descricao
  - tipo: entrada/saida
  - categoria
  - forma de pagamento
  - cartao, quando a forma for cartao
  - condicao: a vista ou parcelado
  - numero de parcelas, somente quando for cartao parcelado
  - valor
  - data
  - observacoes

### Parcelamento

- A vista equivale a 1x.
- Parcelado aceita apenas a partir de 2x.
- O campo de parcelas aparece somente quando:
  - forma de pagamento e cartao
  - condicao e parcelado
- Ao criar uma compra parcelada, o sistema gera as parcelas com:
  - `parcela_atual`
  - `total_parcelas`
  - `id_agrupador_parcela`
- Ao editar uma parcela, o numero da parcela deve ser preservado.

### Regra de fechamento do cartao

Regra definida:

- Compra antes do dia de fechamento: entra na fatura/vencimento do mes atual.
- Compra no dia de fechamento ou depois: entra na fatura/vencimento do mes seguinte.
- Parcelado: a primeira parcela segue essa regra; as demais avancam mes a mes.

Exemplo com fechamento dia 8 e vencimento dia 15:

- Compra em `07/07/2026` -> fatura em `15/07/2026`
- Compra em `08/07/2026` -> fatura em `15/08/2026`
- Compra em `20/07/2026` -> fatura em `15/08/2026`

Existe acao em `Configuracoes > Backup`:

`Corrigir datas de faturas antigas`

Ela cria backup antes e corrige lancamentos antigos de cartao.

### Baixa de fatura/cartao

- O pop-up de `Saidas do mes` mostra os cartoes com lancamentos no mes.
- Para cada cartao mostra:
  - total
  - pago
  - pendente
  - quantidade de lancamentos
- Permite:
  - baixa parcial
  - baixa total
- Pagamentos sao gravados na store `pagamentos_cartao`.
- O resumo subtrai valores pagos do total de `Saidas do mes`.
- Movimentacoes pagas aparecem com status `Pago`.
- Movimentacoes parcialmente pagas aparecem como `Parcial`.
- Movimentacao paga fica com editar/excluir desativados.

## Layout atual

### Resumo

- Estilo dashboard.
- Cards:
  - Saldo em contas
  - Limite disponivel
  - Renda mensal
  - Saidas do mes
- Card `Limite disponivel` possui barra de progresso do limite utilizado.
- As movimentacoes do resumo ficam ocultas quando o filtro de cartao esta em `Todos`.
- Movimentacoes do resumo aparecem somente quando um cartao e selecionado.

### Cadastros e movimentos

- Formulario nao fica aberto por padrao.
- Cada tela tem botao para abrir a janela:
  - Nova conta
  - Novo cartao
  - Nova renda
  - Nova categoria
  - Nova movimentacao
- Ao salvar ou cancelar, o formulario fecha.
- Ao editar, o formulario abre automaticamente.

### Responsivo

- Em desktop, sidebar lateral.
- Em telas menores, navegacao vira barra superior compacta.
- Formulario/lista empilham em telas menores.
- Ainda ha trabalho pendente para refinar a experiencia mobile em modo mais natural, especialmente proporcao de textos, cards e formularios.

## Filtros implementados

### Resumo

- Mes/Ano
- Cartao

### Historico de movimentos

- Mes/Ano
- Cartao
- Localizar por descricao, valor, categoria etc.
- Ordenar:
  - ordem das parcelas
  - data mais recente
  - data mais antiga

## Backups

Tela: `Configuracoes > Backup`

Funcionalidades:

- Criar backup agora
- Exportar ultimo backup
- Importar backup JSON
- Restaurar backup existente
- Excluir backup
- Corrigir datas de faturas antigas

Backups incluem:

- usuarios
- dados complementares
- contas
- cartoes
- pagamentos de cartao
- rendas
- movimentacoes
- categorias
- bandeiras
- formas de pagamento

## Commits importantes recentes

- `d3e0dc7` - Add dashboard style and on-demand forms
- `a9ce492` - Improve responsive layout proportions
- `71d99f0` - Enable LAN access for local server
- `013fb40` - Add filters to movement history
- `0661386` - Apply paid status to card invoices
- `4ce3ed4` - Add invoice date repair action
- `31b8e3d` - Apply credit card closing date rule
- `abca400` - Add invoice popup and card payments
- `58954f5` - Add Windows launcher for local server
- `f3a0a20` - Add local backup and restore structure

## Pontos de atencao

- A aplicacao ativa hoje e a versao JS em `src/app.js`, nao a versao React de `src/frontend`.
- O IndexedDB e local do navegador. Clonar o projeto nao leva dados financeiros.
- Sempre atualizar o cache-buster em `index.html` quando alterar `src/app.js` ou `src/styles.css`.
- Sempre validar em `http://127.0.0.1:5173/index.html`.
- Para celular, validar tambem no IP da maquina na rede local.
- Evitar apagar dados sem backup.

## Proximos passos sugeridos

1. Refinar layout mobile estilo app/dashboard:
   - cards maiores e mais legiveis no celular;
   - navegacao mais natural;
   - formularios em modal/bottom sheet;
   - listas mais escaneaveis.
2. Melhorar `Resumo`:
   - dashboard por cartao;
   - cards com indicadores de limite, fatura, pago e pendente;
   - grafico simples de gastos por categoria.
3. Criar fluxo real de Firebase Auth/Google Login.
4. Decidir se a versao final sera:
   - JavaScript puro atual;
   - ou migracao definitiva para React/TypeScript.
5. Pensar em sincronizacao/backup remoto quando o app for publico.

## Prompt para continuar em outra conversa do Codex

Use este texto em uma nova conversa:

```text
Estou continuando o projeto GSTec Cashflow. Leia o arquivo CONTEXTO_DO_PROJETO.md na raiz do repositorio e siga a partir dele. A aplicacao ativa atualmente e index.html + src/app.js + src/styles.css, servida pelo server.js. Sempre valide em http://127.0.0.1:5173/index.html e atualize o cache-buster do index.html quando alterar JS/CSS.
```

