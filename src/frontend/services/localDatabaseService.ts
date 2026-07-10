import type { UserProfile } from "../types/finance";

export async function ensureLocalDatabaseForUser(user: UserProfile): Promise<void> {
  const databaseName = `gstec_cashflow_${user.id.replace(/[^a-z0-9_-]/gi, "_")}`;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);

    request.onupgradeneeded = () => {
      const db = request.result;
      [
        "usuarios",
        "usuarios_dados_complementares",
        "bandeiras_cartao",
        "categorias_movimentacao",
        "contas_bancarias",
        "cartoes_credito",
        "rendas",
        "faturas_cartao",
        "movimentacoes",
      ].forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      });
    };

    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}
