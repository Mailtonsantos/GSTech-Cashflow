# Exemplos de Calculos Locais

## Saldo geral

```ts
const saldoMovimentacoes = movimentacoes.reduce((saldo, item) => {
  return item.tipo === "entrada" ? saldo + item.valor : saldo - item.valor;
}, 0);

const saldoInicialContas = contas.reduce((saldo, conta) => {
  return saldo + conta.saldo_inicial;
}, 0);

const saldoAtual = saldoInicialContas + saldoMovimentacoes;
```

## Resumo mensal

```ts
const movimentacoesDoMes = movimentacoes.filter((item) => {
  return item.data_movimento >= inicioDoMes && item.data_movimento <= fimDoMes;
});

const resumo = movimentacoesDoMes.reduce(
  (acc, item) => {
    if (item.tipo === "entrada") {
      acc.totalEntradas += item.valor;
    } else {
      acc.totalSaidas += item.valor;
    }

    acc.balancoMes = acc.totalEntradas - acc.totalSaidas;
    return acc;
  },
  { totalEntradas: 0, totalSaidas: 0, balancoMes: 0 },
);
```

## Total da fatura

```ts
const totalFatura = movimentacoes
  .filter((item) => item.fatura_id === faturaId && item.tipo === "saida")
  .reduce((total, item) => total + item.valor, 0);
```

Esses calculos evitam duplicar `limite_usado` no cartao. O valor usado deve ser derivado das movimentacoes vinculadas as faturas abertas.
