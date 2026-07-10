import { LocalDatabaseService } from "../services/localDatabase.js";

const { stores } = LocalDatabaseService;

const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function baseRecord(userId) {
  const timestamp = now();
  return {
    id: id(),
    user_id: userId,
    criado_em: timestamp,
    atualizado_em: timestamp,
  };
}

function seedData(user) {
  return {
    bankAccounts: [
      {
        ...baseRecord(user.id),
        nome: "Conta principal",
        banco: "Banco pessoal",
        tipo: "corrente",
        saldo_inicial: 1850,
        saldo_atual: 1850,
        limite: 500,
        ativa: 1,
      },
    ],
    creditCards: [
      {
        ...baseRecord(user.id),
        nome: "Cartao do dia a dia",
        bandeira: "Visa",
        limite_total: 2500,
        limite_usado: 620,
        dia_fechamento: 8,
        dia_vencimento: 15,
        conta_pagamento_id: null,
        ativo: 1,
      },
    ],
    incomes: [
      {
        ...baseRecord(user.id),
        origem: `Salario de ${(user.name || "usuario").split(" ")[0]}`,
        valor: 3200,
        dia_recebimento: 5,
        ativa: 1,
      },
    ],
    transactions: [
      {
        ...baseRecord(user.id),
        conta_id: null,
        cartao_id: null,
        tipo: "saida",
        descricao: "Mercado",
        categoria: "Alimentacao",
        valor: 286.5,
        data_movimento: today(),
        forma_pagamento: "debito",
        observacao: "",
      },
      {
        ...baseRecord(user.id),
        conta_id: null,
        cartao_id: null,
        tipo: "entrada",
        descricao: "Recebimento mensal",
        categoria: "Renda",
        valor: 3200,
        data_movimento: today(),
        forma_pagamento: "transferencia",
        observacao: "",
      },
    ],
  };
}

function toUserRecord(user) {
  const timestamp = now();
  return {
    id: user.id,
    nome: user.name,
    email: user.email,
    foto_url: user.photoUrl || "",
    provedor_auth: user.authProvider,
    criado_em: timestamp,
    atualizado_em: timestamp,
  };
}

export class FinanceRepository {
  constructor(db, user) {
    this.db = db;
    this.user = user;
  }

  async ensureUserStructure() {
    const existingUser = await LocalDatabaseService.get(this.db, stores.users, this.user.id);
    if (existingUser) return;

    await LocalDatabaseService.put(this.db, stores.users, toUserRecord(this.user));
    const initialData = seedData(this.user);

    await Promise.all([
      ...initialData.bankAccounts.map((item) => LocalDatabaseService.put(this.db, stores.bankAccounts, item)),
      ...initialData.creditCards.map((item) => LocalDatabaseService.put(this.db, stores.creditCards, item)),
      ...initialData.incomes.map((item) => LocalDatabaseService.put(this.db, stores.incomes, item)),
      ...initialData.transactions.map((item) => LocalDatabaseService.put(this.db, stores.transactions, item)),
    ]);
  }

  async getSnapshot() {
    const [accounts, cards, incomes, transactions] = await Promise.all([
      LocalDatabaseService.getAllByUser(this.db, stores.bankAccounts, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.creditCards, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.incomes, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.transactions, this.user.id),
    ]);

    return {
      accounts: accounts.map((item) => ({
        id: item.id,
        name: item.nome,
        bank: item.banco,
        balance: item.saldo_atual,
        limit: item.limite,
      })),
      cards: cards.map((item) => ({
        id: item.id,
        name: item.nome,
        brand: item.bandeira,
        closingDay: item.dia_fechamento,
        dueDay: item.dia_vencimento,
        limit: item.limite_total,
        used: item.limite_usado,
      })),
      incomes: incomes.map((item) => ({
        id: item.id,
        source: item.origem,
        amount: item.valor,
        day: item.dia_recebimento,
      })),
      transactions: transactions
        .map((item) => ({
          id: item.id,
          description: item.descricao,
          type: item.tipo,
          amount: item.valor,
          category: item.categoria,
          date: item.data_movimento,
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  addBankAccount(form) {
    return LocalDatabaseService.put(this.db, stores.bankAccounts, {
      ...baseRecord(this.user.id),
      nome: form.name,
      banco: form.bank,
      tipo: "corrente",
      saldo_inicial: Number(form.balance),
      saldo_atual: Number(form.balance),
      limite: Number(form.limit),
      ativa: 1,
    });
  }

  addCreditCard(form) {
    return LocalDatabaseService.put(this.db, stores.creditCards, {
      ...baseRecord(this.user.id),
      nome: form.name,
      bandeira: form.brand,
      limite_total: Number(form.limit),
      limite_usado: Number(form.used),
      dia_fechamento: Number(form.closingDay),
      dia_vencimento: Number(form.dueDay),
      conta_pagamento_id: null,
      ativo: 1,
    });
  }

  addIncome(form) {
    return LocalDatabaseService.put(this.db, stores.incomes, {
      ...baseRecord(this.user.id),
      origem: form.source,
      valor: Number(form.amount),
      dia_recebimento: Number(form.day),
      ativa: 1,
    });
  }

  addTransaction(form) {
    return LocalDatabaseService.put(this.db, stores.transactions, {
      ...baseRecord(this.user.id),
      conta_id: null,
      cartao_id: null,
      tipo: form.type,
      descricao: form.description,
      categoria: form.category,
      valor: Number(form.amount),
      data_movimento: form.date,
      forma_pagamento: form.type === "entrada" ? "transferencia" : "debito",
      observacao: "",
    });
  }
}
