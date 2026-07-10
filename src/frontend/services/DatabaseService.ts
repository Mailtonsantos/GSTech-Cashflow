export type DatabasePlatform = "web" | "native";

export type DatabaseConnection = {
  platform: DatabasePlatform;
  name: string;
  instance: IDBDatabase | unknown;
};

type DatabaseServiceOptions = {
  userId: string;
};

const databaseVersion = 1;

const storeNames = [
  "usuarios",
  "contas_bancarias",
  "cartoes_credito",
  "faturas_cartao",
  "movimentacoes",
];

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private connection: DatabaseConnection | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }

    return DatabaseService.instance;
  }

  async initialize({ userId }: DatabaseServiceOptions): Promise<DatabaseConnection> {
    if (this.connection) {
      return this.connection;
    }

    const platform = this.detectPlatform();
    const name = this.createDatabaseName(userId);

    this.connection =
      platform === "native"
        ? await this.initializeNativeDatabase(name)
        : await this.initializeWebDatabase(name);

    return this.connection;
  }

  getConnection(): DatabaseConnection {
    if (!this.connection) {
      throw new Error("DatabaseService ainda nao foi inicializado.");
    }

    return this.connection;
  }

  resetConnection(): void {
    if (this.connection?.platform === "web" && this.connection.instance instanceof IDBDatabase) {
      this.connection.instance.close();
    }

    this.connection = null;
  }

  private detectPlatform(): DatabasePlatform {
    const capacitor = globalThis as typeof globalThis & {
      Capacitor?: {
        isNativePlatform?: () => boolean;
      };
    };

    return capacitor.Capacitor?.isNativePlatform?.() ? "native" : "web";
  }

  private createDatabaseName(userId: string): string {
    return `gstec_cashflow_${userId.replace(/[^a-z0-9_-]/gi, "_")}`;
  }

  private initializeWebDatabase(name: string): Promise<DatabaseConnection> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, databaseVersion);

      request.onupgradeneeded = () => {
        const db = request.result;

        storeNames.forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        });
      };

      request.onsuccess = () => {
        resolve({
          platform: "web",
          name,
          instance: request.result,
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async initializeNativeDatabase(name: string): Promise<DatabaseConnection> {
    return {
      platform: "native",
      name,
      instance: {
        pendingAdapter: "Capacitor SQLite",
      },
    };
  }
}

export const databaseService = DatabaseService.getInstance();
