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

function normalizeMoney(value) {
  return Number(value || 0);
}

function seedData(user) {
  return {
    bankAccounts: [
      {
        ...baseRecord(user.id),
        nome: "Conta principal",
        banco: "Banco pessoal",
        agencia: "",
        numero_conta: "",
        digito_conta: "",
        tipo: "corrente",
        saldo_inicial: 1850,
        saldo_atual: 1850,
        limite: 500,
        ativa: 1,
        observacao: "",
      },
    ],
    creditCards: [
      {
        ...baseRecord(user.id),
        nome: "Cartao do dia a dia",
        bandeira: "Visa",
        tipo_cartao: "credito",
        status: "ativo",
        numero_mascarado: "",
        validade: "",
        limite_total: 2500,
        dia_fechamento: 8,
        dia_vencimento: 15,
        conta_pagamento_id: null,
        ativo: 1,
        observacao: "",
      },
    ],
    incomes: [
      {
        ...baseRecord(user.id),
        descricao: `Salario de ${(user.name || "usuario").split(" ")[0]}`,
        tipo_renda: "clt",
        empresa_origem: "",
        valor: 3200,
        data_recebimento: today(),
        recorrente: 1,
        ativa: 1,
        observacao: "",
      },
    ],
    transactions: [
      {
        ...baseRecord(user.id),
        conta_id: null,
        cartao_id: null,
        categoria_id: null,
        tipo: "saida",
        descricao: "Mercado",
        categoria: "Alimentacao",
        valor: 286.5,
        data_movimento: today(),
        forma_pagamento: "debito",
        observacao: "",
        excluida: 0,
      },
      {
        ...baseRecord(user.id),
        conta_id: null,
        cartao_id: null,
        categoria_id: null,
        tipo: "entrada",
        descricao: "Recebimento mensal",
        categoria: "Salario",
        valor: 3200,
        data_movimento: today(),
        forma_pagamento: "transferencia",
        observacao: "",
        excluida: 0,
      },
    ],
  };
}

const defaultBrands = ["Visa", "Mastercard", "Elo", "Hipercard", "American Express", "Nubank", "Mercado Pago"];
const defaultCategories = [
  ["Alimentacao", "saida"],
  ["Transporte", "saida"],
  ["Moradia", "saida"],
  ["Saude", "saida"],
  ["Educacao", "saida"],
  ["Lazer", "saida"],
  ["Cartao de credito", "saida"],
  ["Salario", "entrada"],
  ["Renda extra", "entrada"],
  ["Investimentos", "ambos"],
  ["Outros", "ambos"],
];

function toUserRecord(user) {
  const timestamp = now();
  return {
    id: user.id,
    nome: user.name,
    email: user.email,
    foto_url: user.photoUrl || "",
    provedor_auth: user.authProvider,
    ultimo_login_em: timestamp,
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
    if (!existingUser) {
      await LocalDatabaseService.put(this.db, stores.users, toUserRecord(this.user));
      const initialData = seedData(this.user);

      await Promise.all([
        ...initialData.bankAccounts.map((item) => LocalDatabaseService.put(this.db, stores.bankAccounts, item)),
        ...initialData.creditCards.map((item) => LocalDatabaseService.put(this.db, stores.creditCards, item)),
        ...initialData.incomes.map((item) => LocalDatabaseService.put(this.db, stores.incomes, item)),
        ...initialData.transactions.map((item) => LocalDatabaseService.put(this.db, stores.transactions, item)),
      ]);
    } else {
      await LocalDatabaseService.put(this.db, stores.users, {
        ...existingUser,
        ultimo_login_em: now(),
        atualizado_em: now(),
      });
    }

    await this.ensureCatalogs();
  }

  async ensureCatalogs() {
    const [brands, categories] = await Promise.all([
      LocalDatabaseService.getAll(this.db, stores.cardBrands),
      LocalDatabaseService.getAll(this.db, stores.categories),
    ]);

    const brandCreates = defaultBrands
      .filter((brand) => !brands.some((item) => !item.user_id && item.nome.toLowerCase() === brand.toLowerCase()))
      .map((brand) =>
        LocalDatabaseService.put(this.db, stores.cardBrands, {
          ...baseRecord(this.user.id),
          id: `default-brand-${brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          user_id: null,
          nome: brand,
          ativa: 1,
          observacao: "",
        }),
      );

    const categoryCreates = defaultCategories
      .filter(
        ([name, type]) =>
          !categories.some((item) => !item.user_id && item.nome.toLowerCase() === name.toLowerCase() && item.tipo === type),
      )
      .map(([name, type]) =>
        LocalDatabaseService.put(this.db, stores.categories, {
          ...baseRecord(this.user.id),
          id: `default-category-${type}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          user_id: null,
          nome: name,
          tipo: type,
          ativa: 1,
          observacao: "",
        }),
      );

    await Promise.all([...brandCreates, ...categoryCreates]);
  }

  async getSnapshot() {
    const [accounts, cards, incomes, transactions, brands, categories, userDetails] = await Promise.all([
      LocalDatabaseService.getAllByUser(this.db, stores.bankAccounts, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.creditCards, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.incomes, this.user.id),
      LocalDatabaseService.getAllByUser(this.db, stores.transactions, this.user.id),
      LocalDatabaseService.getAll(this.db, stores.cardBrands),
      LocalDatabaseService.getAll(this.db, stores.categories),
      LocalDatabaseService.getAllByUser(this.db, stores.userDetails, this.user.id),
    ]);

    const activeTransactions = transactions.filter((item) => !item.excluida);

    return {
      userDetails: userDetails[0] || null,
      brands: brands.filter((item) => item.ativa && (!item.user_id || item.user_id === this.user.id)),
      categories: categories.filter((item) => item.ativa && (!item.user_id || item.user_id === this.user.id)),
      accounts: accounts
        .filter((item) => item.ativa)
        .map((item) => ({
          id: item.id,
          name: item.nome,
          bank: item.banco || "",
          agency: item.agencia || "",
          accountNumber: item.numero_conta || "",
          accountDigit: item.digito_conta || "",
          type: item.tipo || "corrente",
          balance: normalizeMoney(item.saldo_atual),
          limit: normalizeMoney(item.limite),
          note: item.observacao || "",
        })),
      cards: cards
        .filter((item) => item.ativo)
        .map((item) => {
          const used = activeTransactions
            .filter((transaction) => transaction.cartao_id === item.id && transaction.tipo === "saida")
            .reduce((sum, transaction) => sum + normalizeMoney(transaction.valor), 0);

          return {
            id: item.id,
            name: item.nome,
            brand: item.bandeira || "",
            cardType: item.tipo_cartao || "credito",
            status: item.status || "ativo",
            number: item.numero_mascarado || "",
            validity: item.validade || "",
            closingDay: item.dia_fechamento,
            dueDay: item.dia_vencimento,
            limit: normalizeMoney(item.limite_total),
            used,
            note: item.observacao || "",
          };
        }),
      incomes: incomes
        .filter((item) => item.ativa)
        .map((item) => ({
          id: item.id,
          source: item.descricao || item.origem || "",
          incomeType: item.tipo_renda || "outros",
          company: item.empresa_origem || "",
          amount: normalizeMoney(item.valor),
          date: item.data_recebimento || "",
          recurrent: item.recorrente !== 0,
          note: item.observacao || "",
        })),
      transactions: activeTransactions
        .map((item) => ({
          id: item.id,
          description: item.descricao,
          type: item.tipo,
          amount: normalizeMoney(item.valor),
          category: item.categoria || "",
          categoryId: item.categoria_id || "",
          date: item.data_movimento,
          note: item.observacao || "",
        }))
        .sort((a, b) => b.date.localeCompare(a.date)),
    };
  }

  async saveUserDetails(form) {
    const existing = (await LocalDatabaseService.getAllByUser(this.db, stores.userDetails, this.user.id))[0];
    return LocalDatabaseService.put(this.db, stores.userDetails, {
      ...(existing || baseRecord(this.user.id)),
      user_id: this.user.id,
      telefone: form.phone || "",
      documento: form.document || "",
      data_nascimento: form.birthDate || "",
      observacao: form.note || "",
      atualizado_em: now(),
    });
  }

  async addBankAccount(form) {
    return LocalDatabaseService.put(this.db, stores.bankAccounts, this.bankAccountRecord(form));
  }

  async updateBankAccount(itemId, form) {
    const existing = await LocalDatabaseService.get(this.db, stores.bankAccounts, itemId);
    if (!existing) return null;
    return LocalDatabaseService.put(this.db, stores.bankAccounts, {
      ...existing,
      ...this.bankAccountRecord(form, existing),
      id: itemId,
      criado_em: existing.criado_em,
      atualizado_em: now(),
    });
  }

  async deleteBankAccount(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.bankAccounts, itemId);
    if (!existing) return;
    return LocalDatabaseService.put(this.db, stores.bankAccounts, { ...existing, ativa: 0, atualizado_em: now() });
  }

  bankAccountRecord(form, existing = null) {
    return {
      ...(existing || baseRecord(this.user.id)),
      user_id: this.user.id,
      nome: form.name,
      banco: form.bank || "",
      agencia: form.agency || "",
      numero_conta: form.accountNumber || "",
      digito_conta: form.accountDigit || "",
      tipo: form.type || "corrente",
      saldo_inicial: normalizeMoney(form.balance),
      saldo_atual: normalizeMoney(form.balance),
      limite: normalizeMoney(form.limit),
      ativa: 1,
      observacao: form.note || "",
    };
  }

  async addCreditCard(form) {
    return LocalDatabaseService.put(this.db, stores.creditCards, this.creditCardRecord(form));
  }

  async updateCreditCard(itemId, form) {
    const existing = await LocalDatabaseService.get(this.db, stores.creditCards, itemId);
    if (!existing) return null;
    return LocalDatabaseService.put(this.db, stores.creditCards, {
      ...existing,
      ...this.creditCardRecord(form, existing),
      id: itemId,
      criado_em: existing.criado_em,
      atualizado_em: now(),
    });
  }

  async deleteCreditCard(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.creditCards, itemId);
    if (!existing) return;
    return LocalDatabaseService.put(this.db, stores.creditCards, { ...existing, ativo: 0, atualizado_em: now() });
  }

  creditCardRecord(form, existing = null) {
    return {
      ...(existing || baseRecord(this.user.id)),
      user_id: this.user.id,
      nome: form.name,
      bandeira: form.brand,
      tipo_cartao: form.cardType || "credito",
      status: form.status || "ativo",
      numero_mascarado: form.number || "",
      validade: form.validity || "",
      limite_total: normalizeMoney(form.limit),
      dia_fechamento: Number(form.closingDay || 8),
      dia_vencimento: Number(form.dueDay || 15),
      conta_pagamento_id: null,
      ativo: 1,
      observacao: form.note || "",
    };
  }

  async addIncome(form) {
    return LocalDatabaseService.put(this.db, stores.incomes, this.incomeRecord(form));
  }

  async updateIncome(itemId, form) {
    const existing = await LocalDatabaseService.get(this.db, stores.incomes, itemId);
    if (!existing) return null;
    return LocalDatabaseService.put(this.db, stores.incomes, {
      ...existing,
      ...this.incomeRecord(form, existing),
      id: itemId,
      criado_em: existing.criado_em,
      atualizado_em: now(),
    });
  }

  async deleteIncome(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.incomes, itemId);
    if (!existing) return;
    return LocalDatabaseService.put(this.db, stores.incomes, { ...existing, ativa: 0, atualizado_em: now() });
  }

  incomeRecord(form, existing = null) {
    return {
      ...(existing || baseRecord(this.user.id)),
      user_id: this.user.id,
      descricao: form.source,
      tipo_renda: form.incomeType || "outros",
      empresa_origem: form.company || "",
      valor: normalizeMoney(form.amount),
      data_recebimento: form.date || today(),
      recorrente: form.recurrent ? 1 : 0,
      ativa: 1,
      observacao: form.note || "",
    };
  }

  async addCategory(form) {
    return LocalDatabaseService.put(this.db, stores.categories, {
      ...baseRecord(this.user.id),
      user_id: this.user.id,
      nome: form.name,
      tipo: form.type || "ambos",
      ativa: 1,
      observacao: form.note || "",
    });
  }

  async addBrand(form) {
    return LocalDatabaseService.put(this.db, stores.cardBrands, {
      ...baseRecord(this.user.id),
      user_id: this.user.id,
      nome: form.name,
      ativa: 1,
      observacao: form.note || "",
    });
  }

  async deleteCategory(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.categories, itemId);
    if (!existing || !existing.user_id) return;
    return LocalDatabaseService.put(this.db, stores.categories, { ...existing, ativa: 0, atualizado_em: now() });
  }

  async deleteBrand(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.cardBrands, itemId);
    if (!existing || !existing.user_id) return;
    return LocalDatabaseService.put(this.db, stores.cardBrands, { ...existing, ativa: 0, atualizado_em: now() });
  }

  async addTransaction(form) {
    return LocalDatabaseService.put(this.db, stores.transactions, this.transactionRecord(form));
  }

  async updateTransaction(itemId, form) {
    const existing = await LocalDatabaseService.get(this.db, stores.transactions, itemId);
    if (!existing) return null;
    return LocalDatabaseService.put(this.db, stores.transactions, {
      ...existing,
      ...this.transactionRecord(form, existing),
      id: itemId,
      criado_em: existing.criado_em,
      atualizado_em: now(),
    });
  }

  async deleteTransaction(itemId) {
    const existing = await LocalDatabaseService.get(this.db, stores.transactions, itemId);
    if (!existing) return;
    return LocalDatabaseService.put(this.db, stores.transactions, { ...existing, excluida: 1, atualizado_em: now() });
  }

  transactionRecord(form, existing = null) {
    const category = this.lastSnapshot?.categories?.find((item) => item.id === form.categoryId);
    return {
      ...(existing || baseRecord(this.user.id)),
      user_id: this.user.id,
      conta_id: null,
      cartao_id: form.paymentTarget === "cartao" ? form.cardId || null : null,
      categoria_id: form.categoryId || null,
      tipo: form.type,
      descricao: form.description,
      categoria: category?.nome || form.category || "",
      valor: normalizeMoney(form.amount),
      data_movimento: form.date,
      forma_pagamento: form.paymentTarget || (form.type === "entrada" ? "transferencia" : "debito"),
      observacao: form.note || "",
      excluida: 0,
    };
  }

  setSnapshot(snapshot) {
    this.lastSnapshot = snapshot;
  }
}
