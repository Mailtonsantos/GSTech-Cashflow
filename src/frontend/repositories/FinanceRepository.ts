import type {
  BuscarFaturaAtualParams,
  BuscarResumoMensalParams,
  IFinanceRepository,
} from "./IFinanceRepository";
import type {
  ContaBancaria,
  CartaoCredito,
  CartaoCreditoInput,
  FaturaAtual,
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
    limiteTotal: record.limite_total,
    diaFechamento: record.dia_fechamento,
    diaVencimento: record.dia_vencimento,
    contaPagamentoId: record.conta_pagamento_id,
    ativo: Boolean(record.ativo),
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
    const [accounts, transactions] = await Promise.all([
      this.getAllByUser<ContaBancariaRecord>("contas_bancarias", params.userId),
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

    const movementBalance = transactions.reduce((saldo, item) => {
      return item.tipo === "entrada" ? saldo + item.valor : saldo - item.valor;
    }, 0);

    const initialAccountsBalance = accounts.reduce((saldo, account) => saldo + account.saldo_inicial, 0);

    return {
      userId: params.userId,
      mes: params.mes,
      ano: params.ano,
      saldoContas: initialAccountsBalance + movementBalance,
      totalEntradas: totals.totalEntradas,
      totalSaidas: totals.totalSaidas,
      balancoMes: totals.totalEntradas - totals.totalSaidas,
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

  async ensureInitialUserData(user: UserProfile): Promise<void> {
    this.getWebDatabase();
    const existingUser = await this.getById<UsuarioRecord>("usuarios", user.id);
    if (existingUser) return;

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

    const defaultAccounts: ContaBancariaRecord[] = [
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
    ];

    const transaction = this.getWebDatabase().transaction(["usuarios", "contas_bancarias"], "readwrite");
    transaction.objectStore("usuarios").put(userRecord);
    defaultAccounts.forEach((account) => transaction.objectStore("contas_bancarias").put(account));
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
