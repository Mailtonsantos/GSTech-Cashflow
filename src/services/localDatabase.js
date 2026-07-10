const databaseVersion = 1;

const stores = {
  users: "usuarios",
  bankAccounts: "contas_bancarias",
  creditCards: "cartoes_credito",
  incomes: "rendas",
  transactions: "movimentacoes",
};

const userScopedStores = [
  stores.bankAccounts,
  stores.creditCards,
  stores.incomes,
  stores.transactions,
];

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

export const LocalDatabaseService = {
  stores,

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
};
