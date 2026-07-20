import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "./IFinanceRepository";
import type {
  BandeiraCartao,
  BandeiraCartaoInput,
  ContaBancaria,
  ContaBancariaInput,
  CartaoCredito,
  CartaoCreditoInput,
  CategoriaMovimentacao,
  CategoriaMovimentacaoInput,
  CreditCardImportPayload,
  CreditCardImportResult,
  FaturaAtual,
  ImportedCreditCard,
  ImportedCreditCardMovement,
  Movimentacao,
  MovimentacaoInput,
  Renda,
  RendaInput,
  ResumoMensal,
  StatusCartao,
  TipoCartao,
  TipoCategoriaMovimentacao,
  TipoContaBancaria,
  TipoRenda,
  UsuarioDadosComplementares,
  UsuarioDadosComplementaresInput,
} from "../types/finance";
import type { DatabaseConnection } from "../services/DatabaseService";
import type { UserProfile } from "../types/finance";

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

type StoreName =
  | "usuarios"
  | "usuarios_dados_complementares"
  | "bandeiras_cartao"
  | "categorias_movimentacao"
  | "contas_bancarias"
  | "cartoes_credito"
  | "rendas"
  | "faturas_cartao"
  | "movimentacoes";

type UsuarioRecord = {
  id: string;
  nome: string;
  email: string;
  foto_url?: string;
  provedor_auth: string;
  ultimo_login_em?: string;
  criado_em: string;
  atualizado_em: string;
};

type UsuarioDadosComplementaresRecord = {
  id: string;
  user_id: string;
  telefone?: string;
  documento?: string;
  data_nascimento?: string;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type BandeiraCartaoRecord = {
  id: string;
  user_id?: string | null;
  nome: string;
  ativa: 0 | 1;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type CategoriaMovimentacaoRecord = {
  id: string;
  user_id?: string | null;
  nome: string;
  tipo: TipoCategoriaMovimentacao;
  ativa: 0 | 1;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type ContaBancariaRecord = {
  id: string;
  user_id: string;
  nome: string;
  banco?: string;
  agencia?: string;
  numero_conta?: string;
  digito_conta?: string;
  tipo: TipoContaBancaria;
  saldo_inicial: number;
  saldo_atual: number;
  limite: number;
  ativa: 0 | 1;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type CartaoCreditoRecord = {
  id: string;
  user_id: string;
  nome: string;
  bandeira_id?: string | null;
  bandeira?: string;
  tipo_cartao?: TipoCartao;
  status?: StatusCartao;
  numero_mascarado?: string | null;
  validade?: string | null;
  limite_total: number;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagamento_id?: string | null;
  ativo: 0 | 1;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type RendaRecord = {
  id: string;
  user_id: string;
  descricao: string;
  tipo_renda: TipoRenda;
  empresa_origem?: string;
  valor: number;
  data_recebimento?: string;
  recorrente: 0 | 1;
  ativa: 0 | 1;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type FaturaRecord = {
  id: string;
  user_id: string;
  cartao_id: string;
  mes: number;
  ano: number;
  status_pago: 0 | 1;
  valor_total: number;
  observacao?: string;
  criado_em: string;
  atualizado_em: string;
};

type MovimentacaoRecord = {
  id: string;
  user_id: string;
  conta_id?: string | null;
  cartao_id?: string | null;
  fatura_id?: string | null;
  categoria_id?: string | null;
  tipo: "entrada" | "saida";
  descricao: string;
  categoria?: string;
  valor: number;
  data_movimento: string;
  forma_pagamento?: string;
  parcela_atual: number;
  total_parcelas: number;
  id_agrupador_parcela?: string | null;
  observacao?: string;
  excluida?: 0 | 1;
  criado_em: string;
  atualizado_em: string;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function toMovimentacao(record: MovimentacaoRecord): Movimentacao {
  return {
    id: record.id,
    userId: record.user_id,
    contaId: record.conta_id,
    cartaoId: record.cartao_id,
    faturaId: record.fatura_id,
    categoriaId: record.categoria_id,
    tipo: record.tipo,
    descricao: record.descricao,
    categoria: record.categoria,
    valor: record.valor,
    dataMovimento: record.data_movimento,
    formaPagamento: record.forma_pagamento,
    parcelaAtual: record.parcela_atual,
    totalParcelas: record.total_parcelas,
    idAgrupadorParcela: record.id_agrupador_parcela,
    observacao: record.observacao,
    criadoEm: record.criado_em,
    atualizadoEm: record.atualizado_em,
  };
}

function toCartao(record: CartaoCreditoRecord): CartaoCredito {
  return {
    id: record.id,
    userId: record.user_id,
    nome: record.nome,
    bandeiraId: record.bandeira_id,
    bandeira: record.bandeira,
    tipoCartao: record.tipo_cartao ?? "credito",
    status: record.status ?? "ativo",
    numeroMascarado: record.numero_mascarado,
    validade: record.validade,
    limiteTotal: record.limite_total,
    diaFechamento: record.dia_fechamento,
    diaVencimento: record.dia_vencimento,
    contaPagamentoId: record.conta_pagamento_id,
    ativo: Boolean(record.ativo),
    observacao: record.observacao,
  };
}

function toConta(record: ContaBancariaRecord): ContaBancaria {
  return {
    id: record.id,
    userId: record.user_id,
    nome: record.nome,
    banco: record.banco,
    agencia: record.agencia,
    numeroConta: record.numero_conta,
    digitoConta: record.digito_conta,
    tipo: record.tipo,
    saldoInicial: record.saldo_inicial,
    saldoAtual: record.saldo_atual,
    limite: record.limite,
    ativa: Boolean(record.ativa),
    observacao: record.observacao,
  };
}

function toDadosComplementares(record: UsuarioDadosComplementaresRecord): UsuarioDadosComplementares {
  return {
    id: record.id,
    userId: record.user_id,
    telefone: record.telefone,
    documento: record.documento,
    dataNascimento: record.data_nascimento,
    observacao: record.observacao,
  };
}

function toBandeira(record: BandeiraCartaoRecord): BandeiraCartao {
  return {
    id: record.id,
    userId: record.user_id,
    nome: record.nome,
    ativa: Boolean(record.ativa),
    observacao: record.observacao,
  };
}

function toCategoria(record: CategoriaMovimentacaoRecord): CategoriaMovimentacao {
  return {
    id: record.id,
    userId: record.user_id,
    nome: record.nome,
    tipo: record.tipo,
    ativa: Boolean(record.ativa),
    observacao: record.observacao,
  };
}

function toRenda(record: RendaRecord): Renda {
  return {
    id: record.id,
    userId: record.user_id,
    descricao: record.descricao,
    tipoRenda: record.tipo_renda,
    empresaOrigem: record.empresa_origem,
    valor: record.valor,
    dataRecebimento: record.data_recebimento,
    recorrente: Boolean(record.recorrente),
    ativa: Boolean(record.ativa),
    observacao: record.observacao,
  };
}

function toFatura(record: FaturaRecord, card?: CartaoCreditoRecord): FaturaAtual {
  const dueDate = card
    ? `${record.ano}-${String(record.mes).padStart(2, "0")}-${String(card.dia_vencimento).padStart(2, "0")}`
    : undefined;

  return {
    id: record.id,
    userId: record.user_id,
    cartaoId: record.cartao_id,
    mes: record.mes,
    ano: record.ano,
    statusPago: Boolean(record.status_pago),
    valorTotal: record.valor_total,
    dataVencimento: dueDate,
    observacao: record.observacao,
  };
}

function monthRange(mes: number, ano: number) {
  const start = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const endDate = new Date(ano, mes, 0);
  const end = `${ano}-${String(mes).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;

  return { start, end };
}

function invoicePeriodFor(dateValue: string, card?: CartaoCreditoRecord) {
  const date = new Date(`${dateValue}T00:00:00`);
  let mes = date.getMonth() + 1;
  let ano = date.getFullYear();

  if (card && date.getDate() >= card.dia_fechamento) {
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }

  return { mes, ano };
}

function currentDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function dueDayFromImport(card: ImportedCreditCard) {
  return card.diaVencimento && card.diaVencimento >= 1 && card.diaVencimento <= 31 ? card.diaVencimento : 10;
}

function closingDayFromDueDay(dueDay: number) {
  return Math.max(1, dueDay - 7);
}

function nextDueDate(cards: CartaoCreditoRecord[], invoices: FaturaRecord[]) {
  const openInvoices = invoices.filter((invoice) => !invoice.status_pago);
  const dates = openInvoices
    .map((invoice) => {
      const card = cards.find((item) => item.id === invoice.cartao_id);
      if (!card) return null;
      return `${invoice.ano}-${String(invoice.mes).padStart(2, "0")}-${String(card.dia_vencimento).padStart(2, "0")}`;
    })
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => a.localeCompare(b));

  return dates[0];
}

export class FinanceRepository implements IFinanceRepository {
  constructor(private readonly connection: DatabaseConnection) {}

  async salvarMovimentacao(movimentacao: MovimentacaoInput): Promise<Movimentacao> {
    const db = this.getWebDatabase();
    const timestamp = now();
    const card = movimentacao.cartaoId
      ? await this.getById<CartaoCreditoRecord>("cartoes_credito", movimentacao.cartaoId)
      : null;
    const faturaId =
      movimentacao.faturaId ??
      (movimentacao.cartaoId
        ? (await this.findOrCreateInvoice(movimentacao.userId, movimentacao.cartaoId, movimentacao.dataMovimento, card ?? undefined)).id
        : null);

    const record: MovimentacaoRecord = {
      id: createId(),
      user_id: movimentacao.userId,
      conta_id: movimentacao.contaId,
      cartao_id: movimentacao.cartaoId,
      fatura_id: faturaId,
      categoria_id: movimentacao.categoriaId,
      tipo: movimentacao.tipo,
      descricao: movimentacao.descricao,
      categoria: movimentacao.categoria,
      valor: movimentacao.valor,
      data_movimento: movimentacao.dataMovimento,
      forma_pagamento: movimentacao.formaPagamento,
      parcela_atual: movimentacao.parcelaAtual ?? 1,
      total_parcelas: movimentacao.totalParcelas ?? 1,
      id_agrupador_parcela: movimentacao.idAgrupadorParcela,
      observacao: movimentacao.observacao,
      excluida: 0,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    const transaction = db.transaction("movimentacoes", "readwrite");
    transaction.objectStore("movimentacoes").put(record);
    await transactionDone(transaction);

    if (faturaId && record.tipo === "saida") {
      await this.recalculateInvoiceTotal(faturaId);
    }

    return toMovimentacao(record);
  }

  async atualizarMovimentacao(id: string, movimentacao: Partial<MovimentacaoInput>): Promise<Movimentacao> {
    const existing = await this.getById<MovimentacaoRecord>("movimentacoes", id);
    if (!existing || existing.excluida) {
      throw new Error("Movimentacao nao encontrada.");
    }

    const previousInvoiceId = existing.fatura_id;
    const nextCardId = movimentacao.cartaoId !== undefined ? movimentacao.cartaoId : existing.cartao_id;
    const nextDate = movimentacao.dataMovimento ?? existing.data_movimento;
    const card = nextCardId ? await this.getById<CartaoCreditoRecord>("cartoes_credito", nextCardId) : null;
    const nextInvoiceId =
      movimentacao.faturaId !== undefined
        ? movimentacao.faturaId
        : nextCardId
          ? (await this.findOrCreateInvoice(existing.user_id, nextCardId, nextDate, card ?? undefined)).id
          : null;

    const updated: MovimentacaoRecord = {
      ...existing,
      conta_id: movimentacao.contaId !== undefined ? movimentacao.contaId : existing.conta_id,
      cartao_id: nextCardId,
      fatura_id: nextInvoiceId,
      categoria_id: movimentacao.categoriaId !== undefined ? movimentacao.categoriaId : existing.categoria_id,
      tipo: movimentacao.tipo ?? existing.tipo,
      descricao: movimentacao.descricao ?? existing.descricao,
      categoria: movimentacao.categoria !== undefined ? movimentacao.categoria : existing.categoria,
      valor: movimentacao.valor ?? existing.valor,
      data_movimento: nextDate,
      forma_pagamento: movimentacao.formaPagamento !== undefined ? movimentacao.formaPagamento : existing.forma_pagamento,
      parcela_atual: movimentacao.parcelaAtual ?? existing.parcela_atual,
      total_parcelas: movimentacao.totalParcelas ?? existing.total_parcelas,
      id_agrupador_parcela:
        movimentacao.idAgrupadorParcela !== undefined ? movimentacao.idAgrupadorParcela : existing.id_agrupador_parcela,
      observacao: movimentacao.observacao !== undefined ? movimentacao.observacao : existing.observacao,
      atualizado_em: now(),
    };

    await this.put("movimentacoes", updated);
    if (previousInvoiceId) await this.recalculateInvoiceTotal(previousInvoiceId);
    if (nextInvoiceId && nextInvoiceId !== previousInvoiceId) await this.recalculateInvoiceTotal(nextInvoiceId);

    return toMovimentacao(updated);
  }

  async excluirMovimentacao(id: string): Promise<void> {
    const existing = await this.getById<MovimentacaoRecord>("movimentacoes", id);
    if (!existing) return;

    await this.put("movimentacoes", {
      ...existing,
      excluida: 1,
      atualizado_em: now(),
    });

    if (existing.fatura_id) {
      await this.recalculateInvoiceTotal(existing.fatura_id);
    }
  }

  async buscarResumoMensal(params: BuscarResumoMensalParams): Promise<ResumoMensal> {
    this.getWebDatabase();
    const [accounts, cards, invoices, transactions] = await Promise.all([
      this.getAllByUser<ContaBancariaRecord>("contas_bancarias", params.userId),
      this.getAllByUser<CartaoCreditoRecord>("cartoes_credito", params.userId),
      this.getAllByUser<FaturaRecord>("faturas_cartao", params.userId),
      this.getAllByUser<MovimentacaoRecord>("movimentacoes", params.userId),
    ]);

    const { start, end } = monthRange(params.mes, params.ano);
    const activeTransactions = transactions.filter((item) => !item.excluida);
    const monthlyTransactions = activeTransactions.filter(
      (item) => item.data_movimento >= start && item.data_movimento <= end,
    );

    const totals = monthlyTransactions.reduce(
      (accumulator, item) => {
        if (item.tipo === "entrada") {
          accumulator.totalEntradas += item.valor;
        } else {
          accumulator.totalSaidas += item.valor;
        }

        return accumulator;
      },
      { totalEntradas: 0, totalSaidas: 0 },
    );

    const accountTransactions = activeTransactions.filter((item) => !item.cartao_id);
    const movementBalance = accountTransactions.reduce(
      (saldo, item) => (item.tipo === "entrada" ? saldo + item.valor : saldo - item.valor),
      0,
    );

    const initialAccountsBalance = accounts.reduce((saldo, account) => saldo + account.saldo_inicial, 0);
    const currentOpenInvoices = await Promise.all(
      cards
        .filter((card) => card.ativo && (card.status ?? "ativo") === "ativo")
        .map(async (card) => {
          const period = invoicePeriodFor(currentDateValue(), card);
          const invoice =
            invoices.find(
              (item) => item.cartao_id === card.id && item.mes === period.mes && item.ano === period.ano,
            ) ?? null;

          return { card, invoice };
        }),
    );

    const currentInvoiceTotal = currentOpenInvoices.reduce((total, item) => {
      return total + (item.invoice?.status_pago ? 0 : (item.invoice?.valor_total ?? 0));
    }, 0);
    const creditLimitTotal = cards
      .filter((card) => card.ativo && (card.status ?? "ativo") === "ativo")
      .reduce((total, card) => total + card.limite_total, 0);
    const creditLimitAvailable = Math.max(creditLimitTotal - currentInvoiceTotal, 0);
    const openInvoiceTotal = invoices
      .filter((invoice) => !invoice.status_pago)
      .reduce((total, invoice) => total + invoice.valor_total, 0);

    return {
      userId: params.userId,
      mes: params.mes,
      ano: params.ano,
      saldoContas: initialAccountsBalance + movementBalance,
      totalEntradas: totals.totalEntradas,
      totalSaidas: totals.totalSaidas,
      balancoMes: totals.totalEntradas - totals.totalSaidas,
      totalFaturasAbertas: openInvoiceTotal,
      limiteCreditoTotal: creditLimitTotal,
      limiteCreditoDisponivel: creditLimitAvailable,
      proximoVencimentoFatura: nextDueDate(cards, invoices),
    };
  }

  async buscarFaturaAtual(params: BuscarFaturaAtualParams): Promise<FaturaAtual | null> {
    this.getWebDatabase();
    const card = await this.getById<CartaoCreditoRecord>("cartoes_credito", params.cartaoId);
    if (!card || card.user_id !== params.userId) return null;

    const { mes, ano } = invoicePeriodFor(params.dataReferencia ?? new Date().toISOString().slice(0, 10), card);
    const invoices = await this.getAllByUser<FaturaRecord>("faturas_cartao", params.userId);
    const invoice = invoices.find(
      (item) => item.cartao_id === params.cartaoId && item.mes === mes && item.ano === ano,
    );

    return invoice ? toFatura(invoice, card) : null;
  }

  async salvarDadosComplementaresUsuario(
    dados: UsuarioDadosComplementaresInput,
  ): Promise<UsuarioDadosComplementares> {
    const existing = (await this.getAllByUser<UsuarioDadosComplementaresRecord>(
      "usuarios_dados_complementares",
      dados.userId,
    ))[0];
    const timestamp = now();
    const record: UsuarioDadosComplementaresRecord = {
      id: existing?.id ?? createId(),
      user_id: dados.userId,
      telefone: dados.telefone,
      documento: dados.documento,
      data_nascimento: dados.dataNascimento,
      observacao: dados.observacao,
      criado_em: existing?.criado_em ?? timestamp,
      atualizado_em: timestamp,
    };

    await this.put("usuarios_dados_complementares", record);
    return toDadosComplementares(record);
  }

  async buscarDadosComplementaresUsuario(userId: string): Promise<UsuarioDadosComplementares | null> {
    const records = await this.getAllByUser<UsuarioDadosComplementaresRecord>("usuarios_dados_complementares", userId);
    return records[0] ? toDadosComplementares(records[0]) : null;
  }

  async cadastrarConta(conta: ContaBancariaInput): Promise<ContaBancaria> {
    const timestamp = now();
    const record: ContaBancariaRecord = {
      id: createId(),
      user_id: conta.userId,
      nome: conta.nome,
      banco: conta.banco,
      agencia: conta.agencia,
      numero_conta: conta.numeroConta,
      digito_conta: conta.digitoConta,
      tipo: conta.tipo,
      saldo_inicial: conta.saldoInicial,
      saldo_atual: conta.saldoAtual,
      limite: conta.limite,
      ativa: conta.ativa === false ? 0 : 1,
      observacao: conta.observacao,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("contas_bancarias", record);
    return toConta(record);
  }

  async atualizarConta(id: string, conta: Partial<ContaBancariaInput>): Promise<ContaBancaria> {
    const existing = await this.getById<ContaBancariaRecord>("contas_bancarias", id);
    if (!existing) {
      throw new Error("Conta nao encontrada.");
    }

    const updated: ContaBancariaRecord = {
      ...existing,
      nome: conta.nome ?? existing.nome,
      banco: conta.banco !== undefined ? conta.banco : existing.banco,
      agencia: conta.agencia !== undefined ? conta.agencia : existing.agencia,
      numero_conta: conta.numeroConta !== undefined ? conta.numeroConta : existing.numero_conta,
      digito_conta: conta.digitoConta !== undefined ? conta.digitoConta : existing.digito_conta,
      tipo: conta.tipo ?? existing.tipo,
      saldo_inicial: conta.saldoInicial ?? existing.saldo_inicial,
      saldo_atual: conta.saldoAtual ?? existing.saldo_atual,
      limite: conta.limite ?? existing.limite,
      ativa: conta.ativa === undefined ? existing.ativa : conta.ativa ? 1 : 0,
      observacao: conta.observacao !== undefined ? conta.observacao : existing.observacao,
      atualizado_em: now(),
    };

    await this.put("contas_bancarias", updated);
    return toConta(updated);
  }

  async excluirConta(id: string): Promise<void> {
    const existing = await this.getById<ContaBancariaRecord>("contas_bancarias", id);
    if (!existing) return;

    await this.put("contas_bancarias", {
      ...existing,
      ativa: 0,
      atualizado_em: now(),
    });
  }

  async cadastrarCartao(cartao: CartaoCreditoInput): Promise<CartaoCredito> {
    this.getWebDatabase();
    const timestamp = now();
    const record: CartaoCreditoRecord = {
      id: createId(),
      user_id: cartao.userId,
      nome: cartao.nome,
      bandeira_id: cartao.bandeiraId,
      bandeira: cartao.bandeira,
      tipo_cartao: cartao.tipoCartao ?? "credito",
      status: cartao.status ?? "ativo",
      numero_mascarado: cartao.numeroMascarado,
      validade: cartao.validade,
      limite_total: cartao.limiteTotal,
      dia_fechamento: cartao.diaFechamento,
      dia_vencimento: cartao.diaVencimento,
      conta_pagamento_id: cartao.contaPagamentoId,
      ativo: 1,
      observacao: cartao.observacao,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("cartoes_credito", record);
    return toCartao(record);
  }

  async atualizarCartao(id: string, cartao: Partial<CartaoCreditoInput>): Promise<CartaoCredito> {
    const existing = await this.getById<CartaoCreditoRecord>("cartoes_credito", id);
    if (!existing) {
      throw new Error("Cartao nao encontrado.");
    }

    const updated: CartaoCreditoRecord = {
      ...existing,
      nome: cartao.nome ?? existing.nome,
      bandeira_id: cartao.bandeiraId !== undefined ? cartao.bandeiraId : existing.bandeira_id,
      bandeira: cartao.bandeira !== undefined ? cartao.bandeira : existing.bandeira,
      tipo_cartao: cartao.tipoCartao ?? existing.tipo_cartao ?? "credito",
      status: cartao.status ?? existing.status ?? "ativo",
      numero_mascarado: cartao.numeroMascarado !== undefined ? cartao.numeroMascarado : existing.numero_mascarado,
      validade: cartao.validade !== undefined ? cartao.validade : existing.validade,
      limite_total: cartao.limiteTotal ?? existing.limite_total,
      dia_fechamento: cartao.diaFechamento ?? existing.dia_fechamento,
      dia_vencimento: cartao.diaVencimento ?? existing.dia_vencimento,
      conta_pagamento_id:
        cartao.contaPagamentoId !== undefined ? cartao.contaPagamentoId : existing.conta_pagamento_id,
      observacao: cartao.observacao !== undefined ? cartao.observacao : existing.observacao,
      atualizado_em: now(),
    };

    await this.put("cartoes_credito", updated);
    return toCartao(updated);
  }

  async excluirCartao(id: string): Promise<void> {
    const existing = await this.getById<CartaoCreditoRecord>("cartoes_credito", id);
    if (!existing) return;

    await this.put("cartoes_credito", {
      ...existing,
      ativo: 0,
      atualizado_em: now(),
    });
  }

  async cadastrarRenda(renda: RendaInput): Promise<Renda> {
    const timestamp = now();
    const record: RendaRecord = {
      id: createId(),
      user_id: renda.userId,
      descricao: renda.descricao,
      tipo_renda: renda.tipoRenda,
      empresa_origem: renda.empresaOrigem,
      valor: renda.valor,
      data_recebimento: renda.dataRecebimento,
      recorrente: renda.recorrente === false ? 0 : 1,
      ativa: renda.ativa === false ? 0 : 1,
      observacao: renda.observacao,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("rendas", record);
    return toRenda(record);
  }

  async atualizarRenda(id: string, renda: Partial<RendaInput>): Promise<Renda> {
    const existing = await this.getById<RendaRecord>("rendas", id);
    if (!existing) {
      throw new Error("Renda nao encontrada.");
    }

    const updated: RendaRecord = {
      ...existing,
      descricao: renda.descricao ?? existing.descricao,
      tipo_renda: renda.tipoRenda ?? existing.tipo_renda,
      empresa_origem: renda.empresaOrigem !== undefined ? renda.empresaOrigem : existing.empresa_origem,
      valor: renda.valor ?? existing.valor,
      data_recebimento: renda.dataRecebimento !== undefined ? renda.dataRecebimento : existing.data_recebimento,
      recorrente: renda.recorrente === undefined ? existing.recorrente : renda.recorrente ? 1 : 0,
      ativa: renda.ativa === undefined ? existing.ativa : renda.ativa ? 1 : 0,
      observacao: renda.observacao !== undefined ? renda.observacao : existing.observacao,
      atualizado_em: now(),
    };

    await this.put("rendas", updated);
    return toRenda(updated);
  }

  async excluirRenda(id: string): Promise<void> {
    const existing = await this.getById<RendaRecord>("rendas", id);
    if (!existing) return;

    await this.put("rendas", {
      ...existing,
      ativa: 0,
      atualizado_em: now(),
    });
  }

  async listarRendas(userId: string): Promise<Renda[]> {
    const records = await this.getAllByUser<RendaRecord>("rendas", userId);
    return records.filter((renda) => renda.ativa).map(toRenda);
  }

  async listarBandeirasCartao(userId: string): Promise<BandeiraCartao[]> {
    const records = await this.getAll<BandeiraCartaoRecord>("bandeiras_cartao");
    return records
      .filter((bandeira) => bandeira.ativa && (!bandeira.user_id || bandeira.user_id === userId))
      .map(toBandeira);
  }

  async cadastrarBandeiraCartao(bandeira: BandeiraCartaoInput): Promise<BandeiraCartao> {
    const timestamp = now();
    const record: BandeiraCartaoRecord = {
      id: createId(),
      user_id: bandeira.userId,
      nome: bandeira.nome,
      ativa: bandeira.ativa === false ? 0 : 1,
      observacao: bandeira.observacao,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("bandeiras_cartao", record);
    return toBandeira(record);
  }

  async listarCategoriasMovimentacao(userId: string): Promise<CategoriaMovimentacao[]> {
    const records = await this.getAll<CategoriaMovimentacaoRecord>("categorias_movimentacao");
    return records
      .filter((categoria) => categoria.ativa && (!categoria.user_id || categoria.user_id === userId))
      .map(toCategoria);
  }

  async cadastrarCategoriaMovimentacao(categoria: CategoriaMovimentacaoInput): Promise<CategoriaMovimentacao> {
    const timestamp = now();
    const record: CategoriaMovimentacaoRecord = {
      id: createId(),
      user_id: categoria.userId,
      nome: categoria.nome,
      tipo: categoria.tipo,
      ativa: categoria.ativa === false ? 0 : 1,
      observacao: categoria.observacao,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("categorias_movimentacao", record);
    return toCategoria(record);
  }

  async listarContas(userId: string): Promise<ContaBancaria[]> {
    const accounts = await this.getAllByUser<ContaBancariaRecord>("contas_bancarias", userId);
    return accounts.filter((account) => account.ativa).map(toConta);
  }

  async listarCartoes(userId: string): Promise<CartaoCredito[]> {
    const cards = await this.getAllByUser<CartaoCreditoRecord>("cartoes_credito", userId);
    return cards.filter((card) => card.ativo).map(toCartao);
  }

  async importarDadosCartaoCredito(
    userId: string,
    payload: CreditCardImportPayload,
  ): Promise<CreditCardImportResult> {
    const existingCards = await this.getAllByUser<CartaoCreditoRecord>("cartoes_credito", userId);
    const existingMovements = await this.getAllByUser<MovimentacaoRecord>("movimentacoes", userId);
    const existingCardIds = new Set(existingCards.map((card) => card.id));
    const existingMovementIds = new Set(existingMovements.map((movement) => movement.id));
    const cardRecords = payload.cards.map((card) => this.importedCardToRecord(userId, card));
    let cardsImported = 0;
    let movementsImported = 0;
    let movementsSkipped = 0;
    const invoiceIdsToRecalculate = new Set<string>();

    for (const card of cardRecords) {
      if (!existingCardIds.has(card.id)) {
        cardsImported += 1;
      }

      await this.put("cartoes_credito", card);
    }

    for (const movement of payload.movements) {
      if (existingMovementIds.has(movement.id)) {
        movementsSkipped += 1;
        continue;
      }

      const card = cardRecords.find((item) => item.id === movement.cardId);
      if (!card) {
        movementsSkipped += 1;
        continue;
      }

      const invoice = await this.findOrCreateInvoice(userId, card.id, movement.dataMovimento, card);
      await this.put("movimentacoes", this.importedMovementToRecord(userId, movement, invoice.id));
      invoiceIdsToRecalculate.add(invoice.id);
      movementsImported += 1;
    }

    for (const invoiceId of invoiceIdsToRecalculate) {
      await this.recalculateInvoiceTotal(invoiceId);
    }

    return {
      cardsImported,
      movementsImported,
      movementsSkipped,
    };
  }

  async ensureInitialUserData(user: UserProfile): Promise<void> {
    this.getWebDatabase();
    const existingUser = await this.getById<UsuarioRecord>("usuarios", user.id);

    const timestamp = now();

    const userRecord: UsuarioRecord = {
      id: user.id,
      nome: user.name,
      email: user.email,
      foto_url: user.photoUrl,
      provedor_auth: user.authProvider,
      ultimo_login_em: timestamp,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    const existingAccounts = await this.getAllByUser<ContaBancariaRecord>("contas_bancarias", user.id);
    const existingBrands = await this.getAll<BandeiraCartaoRecord>("bandeiras_cartao");
    const existingCategories = await this.getAll<CategoriaMovimentacaoRecord>("categorias_movimentacao");
    const accountsToCreate: ContaBancariaRecord[] = [];
    const defaultBrands = ["Visa", "Mastercard", "Elo", "Hipercard", "American Express", "Nubank", "Mercado Pago"];
    const defaultCategories: Array<{ nome: string; tipo: TipoCategoriaMovimentacao }> = [
      { nome: "Alimentacao", tipo: "saida" },
      { nome: "Transporte", tipo: "saida" },
      { nome: "Moradia", tipo: "saida" },
      { nome: "Saude", tipo: "saida" },
      { nome: "Educacao", tipo: "saida" },
      { nome: "Lazer", tipo: "saida" },
      { nome: "Cartao de credito", tipo: "saida" },
      { nome: "Salario", tipo: "entrada" },
      { nome: "Renda extra", tipo: "entrada" },
      { nome: "Investimentos", tipo: "ambos" },
      { nome: "Outros", tipo: "ambos" },
    ];
    const brandsToCreate = defaultBrands
      .filter((brand) => !existingBrands.some((item) => !item.user_id && item.nome.toLowerCase() === brand.toLowerCase()))
      .map<BandeiraCartaoRecord>((brand) => ({
        id: `default-brand-${brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        user_id: null,
        nome: brand,
        ativa: 1,
        criado_em: timestamp,
        atualizado_em: timestamp,
      }));
    const categoriesToCreate = defaultCategories
      .filter(
        (category) =>
          !existingCategories.some(
            (item) => !item.user_id && item.nome.toLowerCase() === category.nome.toLowerCase() && item.tipo === category.tipo,
          ),
      )
      .map<CategoriaMovimentacaoRecord>((category) => ({
        id: `default-category-${category.tipo}-${category.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        user_id: null,
        nome: category.nome,
        tipo: category.tipo,
        ativa: 1,
        criado_em: timestamp,
        atualizado_em: timestamp,
      }));

    if (!existingAccounts.some((account) => account.nome === "Carteira")) {
      accountsToCreate.push(
      {
        id: createId(),
        user_id: user.id,
        nome: "Carteira",
        banco: "Dinheiro",
        agencia: undefined,
        numero_conta: undefined,
        digito_conta: undefined,
        tipo: "carteira",
        saldo_inicial: 0,
        saldo_atual: 0,
        limite: 0,
        ativa: 1,
        criado_em: timestamp,
        atualizado_em: timestamp,
      },
      );
    }

    if (!existingAccounts.some((account) => account.nome === "Conta Corrente")) {
      accountsToCreate.push(
      {
        id: createId(),
        user_id: user.id,
        nome: "Conta Corrente",
        banco: "Banco principal",
        agencia: undefined,
        numero_conta: undefined,
        digito_conta: undefined,
        tipo: "corrente",
        saldo_inicial: 0,
        saldo_atual: 0,
        limite: 0,
        ativa: 1,
        criado_em: timestamp,
        atualizado_em: timestamp,
      },
      );
    }

    const existingCards = await this.getAllByUser<CartaoCreditoRecord>("cartoes_credito", user.id);
    const mainAccount = existingAccounts.find((account) => account.nome === "Conta Corrente") ?? accountsToCreate.find((account) => account.nome === "Conta Corrente");
    const defaultCard: CartaoCreditoRecord | null = existingCards.some((card) => card.nome === "Cartao Principal")
      ? null
      : {
          id: createId(),
          user_id: user.id,
          nome: "Cartao Principal",
          bandeira: "Visa",
          tipo_cartao: "credito",
          status: "ativo",
          limite_total: 1500,
          dia_fechamento: 8,
          dia_vencimento: 15,
          conta_pagamento_id: mainAccount?.id ?? null,
          ativo: 1,
          criado_em: timestamp,
          atualizado_em: timestamp,
        };

    if (existingUser && accountsToCreate.length === 0 && !defaultCard && brandsToCreate.length === 0 && categoriesToCreate.length === 0) return;
    const transaction = this.getWebDatabase().transaction(
      ["usuarios", "contas_bancarias", "cartoes_credito", "bandeiras_cartao", "categorias_movimentacao"],
      "readwrite",
    );
    transaction.objectStore("usuarios").put(existingUser ? { ...existingUser, ultimo_login_em: timestamp, atualizado_em: timestamp } : userRecord);
    accountsToCreate.forEach((account) => transaction.objectStore("contas_bancarias").put(account));
    if (defaultCard) {
      transaction.objectStore("cartoes_credito").put(defaultCard);
    }
    brandsToCreate.forEach((brand) => transaction.objectStore("bandeiras_cartao").put(brand));
    categoriesToCreate.forEach((category) => transaction.objectStore("categorias_movimentacao").put(category));
    await transactionDone(transaction);
  }

  private async findOrCreateInvoice(
    userId: string,
    cardId: string,
    movementDate: string,
    card?: CartaoCreditoRecord,
  ): Promise<FaturaRecord> {
    const { mes, ano } = invoicePeriodFor(movementDate, card);
    const invoices = await this.getAllByUser<FaturaRecord>("faturas_cartao", userId);
    const existingInvoice = invoices.find(
      (invoice) => invoice.cartao_id === cardId && invoice.mes === mes && invoice.ano === ano,
    );

    if (existingInvoice) return existingInvoice;

    const timestamp = now();
    const invoice: FaturaRecord = {
      id: createId(),
      user_id: userId,
      cartao_id: cardId,
      mes,
      ano,
      status_pago: 0,
      valor_total: 0,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("faturas_cartao", invoice);
    return invoice;
  }

  private importedCardToRecord(userId: string, card: ImportedCreditCard): CartaoCreditoRecord {
    const timestamp = now();
    const dueDay = dueDayFromImport(card);

    return {
      id: card.id,
      user_id: userId,
      nome: card.nome,
      bandeira: card.tipo,
      tipo_cartao: card.tipo.toLowerCase().includes("deb") ? "credito_debito" : "credito",
      status: "ativo",
      numero_mascarado: card.numero,
      validade: card.validade,
      limite_total: card.limiteTotal,
      dia_fechamento: closingDayFromDueDay(dueDay),
      dia_vencimento: dueDay,
      conta_pagamento_id: null,
      ativo: 1,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };
  }

  private importedMovementToRecord(
    userId: string,
    movement: ImportedCreditCardMovement,
    invoiceId: string,
  ): MovimentacaoRecord {
    const timestamp = now();

    return {
      id: movement.id,
      user_id: userId,
      conta_id: null,
      cartao_id: movement.cardId,
      fatura_id: invoiceId,
      tipo: movement.tipo,
      descricao: movement.descricao,
      categoria: movement.categoria,
      valor: movement.valor,
      data_movimento: movement.dataMovimento,
      forma_pagamento: movement.formaPagamento,
      parcela_atual: movement.parcelaAtual ?? 1,
      total_parcelas: movement.totalParcelas ?? 1,
      id_agrupador_parcela: movement.idAgrupadorParcela,
      observacao: movement.observacao ?? undefined,
      excluida: 0,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };
  }

  private async recalculateInvoiceTotal(faturaId: string): Promise<void> {
    const [invoice, records] = await Promise.all([
      this.getById<FaturaRecord>("faturas_cartao", faturaId),
      this.getAll<MovimentacaoRecord>("movimentacoes"),
    ]);

    if (!invoice) return;

    invoice.valor_total = records
      .filter((item) => item.fatura_id === faturaId && item.tipo === "saida" && !item.excluida)
      .reduce((total, item) => total + item.valor, 0);
    invoice.atualizado_em = now();

    await this.put("faturas_cartao", invoice);
  }

  private getWebDatabase(): IDBDatabase {
    if (this.connection.platform !== "web" || !(this.connection.instance instanceof IDBDatabase)) {
      throw new Error("FinanceRepository Web requer uma conexao IndexedDB.");
    }

    return this.connection.instance;
  }

  private async getById<T>(storeName: StoreName, id: string): Promise<T | undefined> {
    const transaction = this.getWebDatabase().transaction(storeName, "readonly");
    const value = await requestToPromise<T | undefined>(transaction.objectStore(storeName).get(id));
    await transactionDone(transaction);
    return value;
  }

  private async put<T>(storeName: StoreName, value: T): Promise<T> {
    const transaction = this.getWebDatabase().transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    await transactionDone(transaction);
    return value;
  }

  private async getAll<T>(storeName: StoreName): Promise<T[]> {
    const transaction = this.getWebDatabase().transaction(storeName, "readonly");
    const values = await requestToPromise<T[]>(transaction.objectStore(storeName).getAll());
    await transactionDone(transaction);
    return values;
  }

  private async getAllByUser<T extends { user_id: string }>(storeName: StoreName, userId: string): Promise<T[]> {
    const values = await this.getAll<T>(storeName);
    return values.filter((item) => item.user_id === userId);
  }
}
