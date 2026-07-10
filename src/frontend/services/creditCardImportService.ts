import type { CreditCardImportPayload } from "../types/finance";

export async function loadCreditCardImportData(): Promise<CreditCardImportPayload | null> {
  try {
    const response = await fetch("./data/credit-card-import.json", { cache: "no-store" });
    if (!response.ok) return null;

    return (await response.json()) as CreditCardImportPayload;
  } catch {
    return null;
  }
}
