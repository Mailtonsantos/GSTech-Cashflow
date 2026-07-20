const databaseVersion = 4;

const stores = {
  users: "usuarios",
  userDetails: "usuarios_dados_complementares",
  cardBrands: "bandeiras_cartao",
  categories: "categorias_movimentacao",
  paymentMethods: "formas_pagamento",
  bankAccounts: "contas_bancarias",
  creditCards: "cartoes_credito",
  cardPayments: "pagamentos_cartao",
  incomes: "rendas",
  transactions: "movimentacoes",
};

const userScopedStores = [
  stores.userDetails,
  stores.cardBrands,
  stores.categories,
  stores.paymentMethods,
  stores.bankAccounts,
  stores.creditCards,
  stores.cardPayments,
  stores.incomes,
  stores.transactions,
];

const backupDatabaseName = "gstec_cashflow_backups";
const backupDatabaseVersion = 1;
const backupStore = "backups";

function databaseName(userId) {
  return `gstec_cashflow_${String(userId).replace(/[^a-z0-9_-]/gi, "_")}`;
}

function createStore(db, name, options = { keyPath: "id" }) {
  if (!db.objectStoreNames.contains(name)) {
    const store = db.createObjectStore(name, options);
    if (name !== stores.users) {
      store.createIndex("user_id", "user_id", { unique: false });
    }
  }
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function run(db, storeName, mode, callback) {
  const transaction = db.transaction(storeName, mode);
  const store = transaction.objectStore(storeName);
  const result = callback(store);
  await transactionDone(transaction);
  return result;
}

function openBackupDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(backupDatabaseName, backupDatabaseVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(backupStore)) {
        const store = db.createObjectStore(backupStore, { keyPath: "id" });
        store.createIndex("user_id", "user_id", { unique: false });
        store.createIndex("criado_em", "criado_em", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const LocalDatabaseService = {
  stores,
  backupStore,

  openForUser(userId) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName(userId), databaseVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        createStore(db, stores.users);
        userScopedStores.forEach((storeName) => createStore(db, storeName));
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async get(db, storeName, key) {
    return run(db, storeName, "readonly", (store) => requestToPromise(store.get(key)));
  },

  async put(db, storeName, value) {
    await run(db, storeName, "readwrite", (store) => store.put(value));
    return value;
  },

  async getAllByUser(db, storeName, userId) {
    return run(db, storeName, "readonly", (store) =>
      requestToPromise(store.index("user_id").getAll(userId))
    );
  },

  async getAll(db, storeName) {
    return run(db, storeName, "readonly", (store) => requestToPromise(store.getAll()));
  },

  async delete(db, storeName, key) {
    await run(db, storeName, "readwrite", (store) => store.delete(key));
  },

  async clear(db, storeName) {
    await run(db, storeName, "readwrite", (store) => store.clear());
  },

  openBackupDatabase,
};
