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
  creditLimitAvailable: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthBalance: number;
  nextInvoiceDueDate: string;
};

export type TipoMovimentacao = "entrada" | "saida";
export type TipoCategoriaMovimentacao = TipoMovimentacao | "ambos";
export type TipoContaBancaria = "carteira" | "corrente" | "poupanca" | "investimento" | "outros";
export type TipoCartao = "credito" | "debito" | "credito_debito";
export type StatusCartao = "ativo" | "bloqueado";
export type TipoRenda = "clt" | "pf" | "informal" | "outros";

export type MovimentacaoInput = {
  userId: string;
  contaId?: string | null;
  cartaoId?: string | null;
  faturaId?: string | null;
  categoriaId?: string | null;
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
  bandeiraId?: string | null;
  bandeira?: string;
  tipoCartao?: TipoCartao;
  status?: StatusCartao;
  numeroMascarado?: string | null;
  validade?: string | null;
  limiteTotal: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPagamentoId?: string | null;
  observacao?: string;
};

export type ResumoMensal = {
  userId: string;
  mes: number;
  ano: number;
  saldoContas: number;
  totalEntradas: number;
  totalSaidas: number;
  balancoMes: number;
  totalFaturasAbertas: number;
  limiteCreditoTotal: number;
  limiteCreditoDisponivel: number;
  proximoVencimentoFatura?: string;
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
  observacao?: string;
};

export type CartaoCredito = {
  id: string;
  userId: string;
  nome: string;
  bandeiraId?: string | null;
  bandeira?: string;
  tipoCartao: TipoCartao;
  status: StatusCartao;
  numeroMascarado?: string | null;
  validade?: string | null;
  limiteTotal: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPagamentoId?: string | null;
  ativo: boolean;
  observacao?: string;
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
  agencia?: string;
  numeroConta?: string;
  digitoConta?: string;
  tipo: TipoContaBancaria;
  saldoInicial: number;
  saldoAtual: number;
  limite: number;
  ativa: boolean;
  observacao?: string;
};

export type ContaBancariaInput = Omit<ContaBancaria, "id" | "ativa"> & {
  ativa?: boolean;
};

export type UsuarioDadosComplementares = {
  id: string;
  userId: string;
  telefone?: string;
  documento?: string;
  dataNascimento?: string;
  observacao?: string;
};

export type UsuarioDadosComplementaresInput = Omit<UsuarioDadosComplementares, "id">;

export type BandeiraCartao = {
  id: string;
  userId?: string | null;
  nome: string;
  ativa: boolean;
  observacao?: string;
};

export type BandeiraCartaoInput = Omit<BandeiraCartao, "id" | "ativa"> & {
  ativa?: boolean;
};

export type CategoriaMovimentacao = {
  id: string;
  userId?: string | null;
  nome: string;
  tipo: TipoCategoriaMovimentacao;
  ativa: boolean;
  observacao?: string;
};

export type CategoriaMovimentacaoInput = Omit<CategoriaMovimentacao, "id" | "ativa"> & {
  ativa?: boolean;
};

export type Renda = {
  id: string;
  userId: string;
  descricao: string;
  tipoRenda: TipoRenda;
  empresaOrigem?: string;
  valor: number;
  dataRecebimento?: string;
  recorrente: boolean;
  ativa: boolean;
  observacao?: string;
};

export type RendaInput = Omit<Renda, "id" | "ativa" | "recorrente"> & {
  recorrente?: boolean;
  ativa?: boolean;
};

export type ImportedCreditCard = {
  id: string;
  nome: string;
  tipo: string;
  numero?: string | null;
  diaVencimento?: number | null;
  validade?: string | null;
  limiteTotal: number;
};

export type ImportedCreditCardMovement = {
  id: string;
  cardId: string;
  dataMovimento: string;
  descricao: string;
  categoria?: string;
  valor: number;
  tipo: TipoMovimentacao;
  formaPagamento?: string;
  parcelaAtual?: number;
  totalParcelas?: number;
  idAgrupadorParcela?: string | null;
  observacao?: string | null;
};

export type CreditCardImportPayload = {
  source: {
    name: string;
    importedAt: string;
  };
  cards: ImportedCreditCard[];
  movements: ImportedCreditCardMovement[];
  skippedRows?: Array<Record<string, unknown>>;
};

export type CreditCardImportResult = {
  cardsImported: number;
  movementsImported: number;
  movementsSkipped: number;
};
