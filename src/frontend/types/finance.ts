export type UserProfile = {
  id: string;
  name: string;
  email: string;
  photoUrl?: string;
  authProvider: "email" | "google";
};

export type FinanceSummary = {
  accountBalance: number;
  cardInvoiceTotal: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthBalance: number;
  nextInvoiceDueDate: string;
};

export type TipoMovimentacao = "entrada" | "saida";

export type MovimentacaoInput = {
  userId: string;
  contaId?: string | null;
  cartaoId?: string | null;
  faturaId?: string | null;
  tipo: TipoMovimentacao;
  descricao: string;
  categoria?: string;
  valor: number;
  dataMovimento: string;
  formaPagamento?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  idAgrupadorParcela?: string | null;
  observacao?: string;
};

export type CartaoCreditoInput = {
  userId: string;
  nome: string;
  bandeira?: string;
  limiteTotal: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPagamentoId?: string | null;
};

export type ResumoMensal = {
  userId: string;
  mes: number;
  ano: number;
  saldoContas: number;
  totalEntradas: number;
  totalSaidas: number;
  balancoMes: number;
};

export type FaturaAtual = {
  id: string;
  userId: string;
  cartaoId: string;
  mes: number;
  ano: number;
  statusPago: boolean;
  valorTotal: number;
  dataVencimento?: string;
};

export type CartaoCredito = {
  id: string;
  userId: string;
  nome: string;
  bandeira?: string;
  limiteTotal: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPagamentoId?: string | null;
  ativo: boolean;
};

export type Movimentacao = MovimentacaoInput & {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
};

export type ContaBancaria = {
  id: string;
  userId: string;
  nome: string;
  banco?: string;
  tipo: "carteira" | "corrente" | "poupanca" | "outros";
  saldoInicial: number;
  saldoAtual: number;
  limite: number;
  ativa: boolean;
};
