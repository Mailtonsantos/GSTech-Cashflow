import { LocalDatabaseService } from "./localDatabase.js";

const { backupStore } = LocalDatabaseService;

const now = () => new Date().toISOString();
const id = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);

function countItems(snapshot) {
  return {
    accounts: snapshot.accounts?.length || 0,
    cards: snapshot.cards?.length || 0,
    cardPayments: snapshot.cardPayments?.length || 0,
    incomes: snapshot.incomes?.length || 0,
    transactions: snapshot.transactions?.length || 0,
    categories: snapshot.categories?.length || 0,
    brands: snapshot.brands?.length || 0,
    paymentMethods: snapshot.paymentMethods?.length || 0,
  };
}

function fileName(user, createdAt = now()) {
  const userPart = String(user?.email || user?.id || "usuario").replace(/[^a-z0-9_-]+/gi, "-");
  const datePart = createdAt.replace(/[:.]/g, "-");
  return `gstec-cashflow-backup-${userPart}-${datePart}.json`;
}

async function withBackupDb(callback) {
  const db = await LocalDatabaseService.openBackupDatabase();
  try {
    return await callback(db);
  } finally {
    db.close();
  }
}

function toBackupRecord({ user, snapshot, reason = "manual" }) {
  const createdAt = now();
  return {
    id: id(),
    user_id: user.id,
    user_email: user.email || "",
    user_name: user.name || "",
    reason,
    criado_em: createdAt,
    app_version: "prototype-indexeddb-v1",
    counts: countItems(snapshot),
    snapshot,
  };
}

export const BackupService = {
  async createBackup({ user, snapshot, reason = "manual" }) {
    const record = toBackupRecord({ user, snapshot, reason });
    await withBackupDb((db) => LocalDatabaseService.put(db, backupStore, record));
    return record;
  },

  async listBackups(userId) {
    return withBackupDb(async (db) => {
      const records = await LocalDatabaseService.getAllByUser(db, backupStore, userId);
      return records.sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
    });
  },

  async getBackup(backupId) {
    return withBackupDb((db) => LocalDatabaseService.get(db, backupStore, backupId));
  },

  async deleteBackup(backupId) {
    return withBackupDb((db) => LocalDatabaseService.delete(db, backupStore, backupId));
  },

  downloadBackup(record) {
    const blob = new Blob([JSON.stringify(record, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName({ email: record.user_email, id: record.user_id }, record.criado_em);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  readBackupFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(JSON.parse(reader.result));
        } catch (error) {
          reject(new Error("Arquivo de backup invalido."));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  },
};
