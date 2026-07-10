import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "./IFinanceRepository";
import type {
  ContaBancaria,
  CartaoCredito,
  CartaoCreditoInput,
  CreditCardImportPayload,
  CreditCardImportResult,
  FaturaAtual,
  ImportedCreditCard,
  ImportedCreditCardMovement,
  Movimentacao,
  MovimentacaoInput,
  ResumoMensal,
} from "../types/finance";
import type { DatabaseConnection } from "../services/DatabaseService";
import type { UserProfile } from "../types/finance";

const createId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

type StoreName = "usuarios" | "contas_bancarias" | "cartoes_credito" | "faturas_cartao" | "movimentacoes";

type UsuarioRecord = {
  id: string;
  nome: string;
  email: string;
  foto_url?: string;
  provedor_auth: string;
  criado_em: string;
  atualizado_em: string;
};

type ContaBancariaRecord = {
  id: string;
  user_id: string;
  nome: string;
  banco?: string;
  tipo: ContaBancaria["tipo"];
  saldo_inicial: number;
  saldo_atual: number;
  limite: number;
  ativa: 0 | 1;
  criado_em: string;
  atualizado_em: string;
};

type CartaoCreditoRecord = {
  id: string;
  user_id: string;
  nome: string;
  bandeira?: string;
  numero_mascarado?: string | null;
  validade?: string | null;
  limite_total: number;
  dia_fechamento: number;
  dia_vencimento: number;
  conta_pagamento_id?: string | null;
  ativo: 0 | 1;
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
  criado_em: string;
  atualizado_em: string;
};

type MovimentacaoRecord = {
  id: string;
  user_id: string;
  conta_id?: string | null;
  cartao_id?: string | null;
  fatura_id?: string | null;
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
    bandeira: record.bandeira,
    numeroMascarado: record.numero_mascarado,
    validade: record.validade,
    limiteTotal: record.limite_total,
    diaFechamento: record.dia_fechamento,
    diaVencimento: record.dia_vencimento,
    contaPagamentoId: record.conta_pagamento_id,
    ativo: Boolean(record.ativo),
  };
}

function toConta(record: ContaBancariaRecord): ContaBancaria {
  return {
    id: record.id,
    userId: record.user_id,
    nome: record.nome,
    banco: record.banco,
    tipo: record.tipo,
    saldoInicial: record.saldo_inicial,
    saldoAtual: record.saldo_atual,
    limite: record.limite,
    ativa: Boolean(record.ativa),
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

  if (card && date.getDate() > card.dia_fechamento) {
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

  async buscarResumoMensal(params: BuscarResumoMensalParams): Promise<ResumoMensal> {
    this.getWebDatabase();
    const [accounts, cards, invoices, transactions] = await Promise.all([
      this.getAllByUser<ContaBancariaRecord>("contas_bancarias", params.userId),
      this.getAllByUser<CartaoCreditoRecord>("cartoes_credito", params.userId),
      this.getAllByUser<FaturaRecord>("faturas_cartao", params.userId),
      this.getAllByUser<MovimentacaoRecord>("movimentacoes", params.userId),
    ]);

    const { start, end } = monthRange(params.mes, params.ano);
    const monthlyTransactions = transactions.filter(
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

    const accountTransactions = transactions.filter((item) => !item.cartao_id);
    const movementBalance = accountTransactions.reduce(
      (saldo, item) => (item.tipo === "entrada" ? saldo + item.valor : saldo - item.valor),
      0,
    );

    const initialAccountsBalance = accounts.reduce((saldo, account) => saldo + account.saldo_inicial, 0);
    const currentOpenInvoices = await Promise.all(
      cards
        .filter((card) => card.ativo)
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
      .filter((card) => card.ativo)
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

  async cadastrarCartao(cartao: CartaoCreditoInput): Promise<CartaoCredito> {
    this.getWebDatabase();
    const timestamp = now();
    const record: CartaoCreditoRecord = {
      id: createId(),
      user_id: cartao.userId,
      nome: cartao.nome,
      bandeira: cartao.bandeira,
      numero_mascarado: cartao.numeroMascarado,
      validade: cartao.validade,
      limite_total: cartao.limiteTotal,
      dia_fechamento: cartao.diaFechamento,
      dia_vencimento: cartao.diaVencimento,
      conta_pagamento_id: cartao.contaPagamentoId,
      ativo: 1,
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await this.put("cartoes_credito", record);
    return toCartao(record);
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
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    const existingAccounts = await this.getAllByUser<ContaBancariaRecord>("contas_bancarias", user.id);
    const accountsToCreate: ContaBancariaRecord[] = [];

    if (!existingAccounts.some((account) => account.nome === "Carteira")) {
      accountsToCreate.push(
      {
        id: createId(),
        user_id: user.id,
        nome: "Carteira",
        banco: "Dinheiro",
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
          limite_total: 1500,
          dia_fechamento: 8,
          dia_vencimento: 15,
          conta_pagamento_id: mainAccount?.id ?? null,
          ativo: 1,
          criado_em: timestamp,
          atualizado_em: timestamp,
        };

    if (existingUser && accountsToCreate.length === 0 && !defaultCard) return;
    const transaction = this.getWebDatabase().transaction(["usuarios", "contas_bancarias", "cartoes_credito"], "readwrite");
    if (!existingUser) {
      transaction.objectStore("usuarios").put(userRecord);
    }
    accountsToCreate.forEach((account) => transaction.objectStore("contas_bancarias").put(account));
    if (defaultCard) {
      transaction.objectStore("cartoes_credito").put(defaultCard);
    }
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
      .filter((item) => item.fatura_id === faturaId && item.tipo === "saida")
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
